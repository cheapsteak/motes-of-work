import { Vector3, type PerspectiveCamera } from 'three';
import { describe, expect, it } from 'vitest';
import { MOTE_BUDGET_DESKTOP, MOTE_SEED } from '../../config';
import { AMBIENT_GRID, AMBIENT_POSE } from '../../galaxy/ambient';
import { GLOW_CAP } from '../../galaxy/body';
import { galaxyBudget, generateGalaxy } from '../../galaxy/generate';
import { allBodyMoteAttrs } from '../../parity/bodyCases';
import { sectionSpans } from '../../scroll/progress';
import { loadStory } from '../../story/loader';
import { KeyframeSampler, type KeyframeFile } from '../../timeline/keyframeSampler';
import keyframes from '../../timeline/keyframes.json';
import { essayCamera, GALAXY_SHOTS, galaxyShotKeys, galaxyShotLampAt } from '../../timeline/netShots';
import { Lamp } from '../../timeline/netTrack';
import { defaultSceneState, mergeState, type SceneState } from '../../timeline/sceneState';
import { FOCUS_GAIN, FREEZE_FLASH, NodeRole } from './birth';
import { buildShellAttrs, buildTrackAttrs, packShellData, SHELL_TEXELS } from './bodyAttrs';
import { BODY_KIND, BODY_TEXELS, packBodyData } from './bodyData';
import { bodyMote, type BodyClocks, type BodyMoteAttrs } from './bodyMote';
import { createBodySystem } from './bodySystem';
import { offScreenSkips, shellSkips, trackSkips, type EarlyOutFrame } from './earlyOut';
import {
  glowPx,
  glslLodConstants,
  HOOD_LOD,
  hoodFar,
  hoodGlowPx,
  hoodHold,
  hoodReal,
  hoodSkip,
  HOSTLESS_REACH,
  LOD_BANDS,
  LOD_VISIBLE,
  LodElement,
  lodGain,
  lodLevel,
  lodSkip,
  lodSkipElement,
  motePx,
  PLAN_CULL,
  PLAN_FULL_SOFT,
  PLAN_R_ELEMENTS,
  PLAN_RAMP,
  planCull,
  planFull,
  planGain,
  planRank,
  planSkip,
  planWindow,
  PX,
  systemPx,
} from './lod';
import { bodyWorld } from './orbit';
import { lodLibraryGlsl } from './shaderSource';

/** Floats per row of the bodies texture. */
const BODY_ROW = BODY_TEXELS * 4;

const ELEMENTS = [LodElement.PlanetPoint, LodElement.PlanetShell, LodElement.Moon, LodElement.Track, LodElement.Derp];

describe('lodGain', () => {
  it('is 0 below each band, 1 above it, and smoothstep between', () => {
    for (const el of ELEMENTS) {
      const [lo, hi] = LOD_BANDS[el];
      for (const s of [0, lo / 2, lo - 1e-9, lo]) expect(lodGain(el, s), `${el} at ${s}`).toBe(0);
      for (const s of [hi, hi + 1e-9, 2 * hi, 1e6]) expect(lodGain(el, s), `${el} at ${s}`).toBe(1);
      for (const u of [0.1, 0.25, 0.5, 0.75, 0.9]) expect(lodGain(el, lo + u * (hi - lo))).toBeCloseTo(u * u * (3 - 2 * u), 12);
      let last = -1;
      for (let s = lo; s <= hi; s += (hi - lo) / 64) {
        const g = lodGain(el, s);
        expect(g).toBeGreaterThanOrEqual(last);
        last = g;
      }
    }
  });

  it('holds the bands of galaxy §3.1 and §12.2', () => {
    expect(Object.fromEntries(Object.entries(LOD_BANDS).slice(0, 5))).toEqual({ 0: [10, 20], 1: [25, 50], 2: [60, 120], 3: [60, 120], 4: [60, 120] });
  });
});

describe('the three levels', () => {
  it('split at 10 and 60', () => {
    expect([0, 5, 9.999].map(lodLevel)).toEqual([0, 0, 0]);
    expect([10, 30, 59.999].map(lodLevel)).toEqual([1, 1, 1]);
    expect([60, 120, 5000].map(lodLevel)).toEqual([2, 2, 2]);
  });

  it('are where the planet points and the moons come in', () => {
    expect(lodGain(LodElement.PlanetPoint, 9.999)).toBe(0);
    expect(lodGain(LodElement.PlanetPoint, 10.5)).toBeGreaterThan(0);
    expect(lodGain(LodElement.Moon, 59.999)).toBe(0);
    expect(lodGain(LodElement.Track, 59.999)).toBe(0);
    expect(lodGain(LodElement.Moon, 60.5)).toBeGreaterThan(0);
  });
});

describe('glowPx', () => {
  it('clamps a star to [5, 18]; a core body has no glow since the re-skin’s Task 5 (its cap was 24)', () => {
    for (const [cap, want] of [[GLOW_CAP.star, 18]] as const) {
      expect(cap).toBe(want);
      expect(glowPx(0.9, 1e6, 800, cap)).toBe(5);
      expect(glowPx(1.4, 0.01, 800, cap)).toBe(want);
      for (let d = 1; d < 5000; d *= 1.3) {
        const px = glowPx(1.4, d, 800, cap);
        expect(px).toBeGreaterThanOrEqual(5);
        expect(px).toBeLessThanOrEqual(want);
      }
    }
    // Between the clamps it is 5 R focal / d.
    expect(glowPx(0.9, 300, 800, GLOW_CAP.star)).toBeCloseTo((5 * 0.9 * 800) / 300, 12);
  });

  it('caps match PX', () => {
    expect(PX.starGlow).toBe(GLOW_CAP.star);
    expect('coreGlow' in PX).toBe(false);
  });
});

describe('the neighbourhood from afar (Dissolve, late)', () => {
  it('the real form comes in over 11 → 16 px of glow', () => {
    // The tuner's hoodLateLod0 and hoodLateLod1 (re-skin §4.1): the far form whole below 11 px of the
    // plain glow, the real form whole above 16.
    expect(HOOD_LOD.glowPx).toEqual([11, 16]);
    expect(hoodReal(5)).toBe(0); // the galaxy wide: the glow at its 5 px floor
    expect(hoodReal(9.9)).toBe(0); // the tuner's distance 277
    expect(hoodReal(11)).toBe(0);
    expect(hoodReal(13.5)).toBeCloseTo(0.5, 12);
    expect(hoodReal(16)).toBe(1);
    expect(hoodReal(18)).toBe(1); // the hood shot: the glow at its 18 px cap
    // The plain glow: a star's radius and cap, through glowPx (never glowCaps, never a star's look).
    for (const focal of [400, 835.3, 1236.7])
      for (let d = 1; d < 5000; d *= 1.17) expect(Math.abs(hoodGlowPx(d, focal) - glowPx(0.9, d, focal, 18))).toBeLessThanOrEqual(1e-12);
    // The far form takes the rest: the two shares sum to 1 at every distance.
    for (let d = 50; d < 1000; d *= 1.05) expect(hoodFar(d, 835.3) + hoodReal(hoodGlowPx(d, 835.3))).toBeCloseTo(1, 12);
  });

  it('holds the real form whole under a beat’s hold, while the switch says so', () => {
    // max(the band's share, the hold): the beat wins; HOOD_LOD.beatsHold is the one switch.
    expect(HOOD_LOD.beatsHold).toBe(true);
    expect(hoodReal(5, 1)).toBe(1);
    expect(hoodReal(5, 0.3)).toBeCloseTo(0.3, 12);
    expect(hoodReal(13.5, 0.2)).toBeCloseTo(0.5, 12);
    expect(hoodReal(13.5, 0.8)).toBeCloseTo(0.8, 12);
    expect([hoodHold(0), hoodHold(0.4), hoodHold(1), hoodHold(-1), hoodHold(2)]).toEqual([0, 0.4, 1, 0, 1]);
    expect(hoodFar(640, 835.3, 1)).toBe(0);
  });

  it('skips a neighbourhood star’s dots only where its real form is 0, and no other body’s', () => {
    for (const real of [0, -0, 1e-9, 0.5, 1]) {
      expect(hoodSkip(BODY_KIND.star, real), String(real)).toBe(!(real > 0));
      for (const kind of [BODY_KIND.core, BODY_KIND.planet, BODY_KIND.moon]) expect(hoodSkip(kind, real)).toBe(false);
    }
  });
});

describe('systemPx', () => {
  it('is the outer radius through the focal length at the distance', () => {
    expect(systemPx(9.6, 640, 835)).toBeCloseTo((9.6 * 835) / 640, 12);
    expect(systemPx(5, 50, 100)).toBe(10);
  });
});

describe('lod.glsl', () => {
  it('reads its constants from lod.ts and body.ts, spliced in', () => {
    const lib = lodLibraryGlsl();
    expect(lib).toContain(glslLodConstants());
    expect(lib).toContain('const int LOD_COUNT = 19;');
    expect(lib).toContain(
      'const vec2 LOD_BANDS[LOD_COUNT] = vec2[19](vec2(10.0, 20.0), vec2(25.0, 50.0), vec2(60.0, 120.0), vec2(60.0, 120.0), vec2(60.0, 120.0), ' +
        'vec2(30.0, 50.0), vec2(30.0, 55.0), vec2(30.0, 55.0), vec2(55.0, 85.0), vec2(75.0, 105.0), vec2(75.0, 115.0), vec2(100.0, 150.0), ' +
        'vec2(110.0, 150.0), vec2(120.0, 160.0), vec2(140.0, 180.0), vec2(140.0, 180.0), vec2(150.0, 180.0), vec2(160.0, 190.0), vec2(180.0, 210.0));',
    );
    for (const el of ELEMENTS) expect(lib).toMatch(new RegExp(`const int LOD_[A-Z_]+ = ${el};`));
    expect(lib).toContain('const float GLOW_SCALE = 5.0;');
    expect(lib).toContain('const float GLOW_MIN_PX = 5.0;');
    expect(lib).toContain('const vec2 HOOD_LOD = vec2(11.0, 16.0);');
    expect(lib).toContain('const float HOOD_STAR_R = 0.9;');
    expect(lib).toContain('const float HOOD_GLOW_CAP = 18.0;');
    expect(lib).not.toContain('#include');
  });
});

// ---- The early-out (re-skin §7, the plan's Task 3) ----

const eg = generateGalaxy(MOTE_SEED, 'phone', galaxyBudget(MOTE_BUDGET_DESKTOP));
const edata = packBodyData(eg);
const eshells = packShellData(eg, AMBIENT_POSE);
const motesOf = allBodyMoteAttrs(eg);
const ROLES = [NodeRole.Builder, NodeRole.Person, NodeRole.Moon, NodeRole.Track, NodeRole.Glow];
const FORCES = [-1, 0, 0.5, 1];
const SYS_PX = Array.from({ length: 401 }, (_, i) => i / 2);
/** Every factor over 1 a point's or a track dot's late gain can carry, at its most: FOCUS_GAIN and the freeze frame's flash. */
const OVER_ONE = FOCUS_GAIN * (1 + FREEZE_FLASH.gain);
/** A row's T3 (host, R, born, dur) in the bodies texture. */
const t3 = (row: number) => edata.bodies.subarray(row * BODY_ROW + 12, row * BODY_ROW + 16);

describe('lodSkip', () => {
  it('never hides a dot the late path draws', () => {
    // A mote of each row stands for the row in each role: the late path reads the row, the role and the
    // index; a builder's index 0 is a planet's or moon's point, 1 its shell.
    const sample = new Map<number, BodyMoteAttrs>();
    for (const a of motesOf) if (!sample.has(a.row) && a.role !== NodeRole.Person) sample.set(a.row, a);
    let skipped = 0;
    let checked = 0;
    for (const [row, base] of sample) {
      const kind = Math.round(edata.bodies[row * BODY_ROW + 3]);
      if (base.sys < 0) continue; // the core: never asked
      for (const role of ROLES)
        for (const index of [0, 1])
          for (const force of FORCES)
            for (const s of SYS_PX) {
              if (!lodSkip(kind, role, index, s, force)) continue;
              skipped++;
              const el = lodSkipElement(kind, role, index) as LodElement;
              const gain = force >= 0 ? force : lodGain(el, s);
              const point = role === NodeRole.Track || (role !== NodeRole.Person && index === 0);
              if (point) {
                // shell.vert.glsl's point and track.vert.glsl: the element's gain times the rest, at most OVER_ONE.
                expect(gain * OVER_ONE, `${row} ${role} ${index} ${force} ${s}`).toBeLessThan(LOD_VISIBLE);
                continue;
              }
              // bodyMote's own computation, at the system's size (or the override, as the size that gives it).
              const sysPx = new Float32Array(32);
              const [lo, hi] = LOD_BANDS[el];
              sysPx[base.sys] = force < 0 ? s : force === 0 ? 0 : force === 1 ? 1e6 : (lo + hi) / 2;
              const clocks: BodyClocks = { growth: 1, fix: 1, highlight: 0, show: 1, ambient: AMBIENT_POSE, focus: 0, lamp: Lamp.Off, lampRow: -1, sysPx };
              const o = bodyMote({ ...base, role, index, host: role === NodeRole.Person ? row : base.host }, clocks, { ...edata, shells: eshells });
              expect(o.visible, `${row} ${role} ${index} ${force} ${s}`).toBe(false);
              checked++;
            }
    }
    expect(skipped).toBeGreaterThan(100_000);
    expect(checked).toBeGreaterThan(10_000);
  }, 300_000);

  it('never skips a glow, a star or a core body (a neighbourhood star where hoodReal is 0 is hoodSkip’s), and a point or a track dot only at a gain of 0', () => {
    for (const s of SYS_PX)
      for (const force of FORCES) {
        expect(lodSkip(BODY_KIND.planet, NodeRole.Glow, 0, s, force)).toBe(false);
        for (const role of [NodeRole.Builder, NodeRole.Person]) {
          expect(lodSkip(BODY_KIND.star, role, 1, s, force)).toBe(false);
          expect(lodSkip(BODY_KIND.core, role, 1, s, force)).toBe(false);
        }
        expect(lodSkip(BODY_KIND.planet, NodeRole.Builder, 0, s, force)).toBe((force >= 0 ? force : lodGain(LodElement.PlanetPoint, s)) === 0);
        expect(lodSkip(BODY_KIND.moon, NodeRole.Track, 3, s, force)).toBe((force >= 0 ? force : lodGain(LodElement.Track, s)) === 0);
        expect(lodSkip(BODY_KIND.moon, NodeRole.Moon, 1, s, force)).toBe((force >= 0 ? force : lodGain(LodElement.Moon, s)) < LOD_VISIBLE);
      }
  });
});

// The frames the early-out is measured at (the plan's Task 3): the hood probe, fr-1, and tr-2, the hole
// close shot's stand-in until Task 5.
const espans = sectionSpans(loadStory());
const esampler = new KeyframeSampler(keyframes as unknown as KeyframeFile, espans);
const essayAt = (section: string, l: number): SceneState => {
  const span = espans.find((x) => x.id === section)!;
  return esampler.sample(span.start + l * (span.end - span.start));
};
const hoodState = (): SceneState => {
  const shot = GALAXY_SHOTS.hood;
  return mergeState(defaultSceneState(), { camera: galaxyShotKeys(shot, eg), net: { show: 1, growth: 1, lamp: shot.lamp, lampAt: galaxyShotLampAt(shot) } });
};
const FRAMES: [string, () => SceneState][] = [
  ['hood', hoodState],
  ['fr-1', () => essayAt('far', 0.53125)],
  ['tr-2', () => essayAt('trace', 0.53)],
];
const SCREENS = [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
];
const esystem = createBodySystem(eg, { value: new Vector3() });
/** The body set drawn at `state` on `size` at ambient t, as the page draws it: its early-out frame and its camera. */
function drawAt(state: SceneState, size: { width: number; height: number }, t: number): { f: EarlyOutFrame; camera: PerspectiveCamera } {
  const camera = essayCamera(state.camera, eg, edata, size, t);
  esystem.update(state, camera, { ...size, pixelRatio: 1 }, t);
  return { f: esystem.earlyOut()!, camera };
}
/** The motes of the bodies with no host: the stars' dots, the core's shells, and their person motes. */
const hostless = motesOf.filter((a) => t3(a.row)[0] < 0);

describe('offScreenSkip', () => {
  it('never hides a dot in the viewport', () => {
    // Every landed mote of a body with no host: where it skips, bodyMote's own place and size put its
    // disc off the screen.
    let skipped = 0;
    const p = new Vector3();
    for (const [name, at] of FRAMES)
      for (const size of SCREENS)
        for (const t of AMBIENT_GRID) {
          const { f, camera } = drawAt(at(), size, t);
          for (const a of hostless) {
            if (!offScreenSkips(f, edata, a.row, a.role)) continue;
            skipped++;
            const o = bodyMote(a, f.clocks, { ...edata, shells: f.shells });
            const Z = -p.set(...o.pos).applyMatrix4(camera.matrixWorldInverse).z;
            if (!(Z > 0)) continue; // behind the camera: not drawn
            const r = 0.5 * motePx(f.shells[a.row * SHELL_TEXELS * 4 + 12], (0.5 * size.height * camera.projectionMatrix.elements[5]) / Z);
            p.set(...o.pos).project(camera);
            const x = ((p.x + 1) / 2) * size.width;
            const y = ((1 - p.y) / 2) * size.height;
            const off = x + r < 0 || x - r > size.width || y + r < 0 || y - r > size.height;
            expect(off, `${name} ${size.width} ${t} row ${a.row} at ${x.toFixed(1)}, ${y.toFixed(1)}`).toBe(true);
          }
        }
    // Some stars are off screen at the hood and at tr-2: the test is not vacuous.
    expect(skipped).toBeGreaterThan(1000);
  }, 300_000);

  it('bounds the landed dots of a body with no host by HOSTLESS_REACH of its R', () => {
    let most = 0;
    const sysPx = new Float32Array(32).fill(1e6);
    for (const t of AMBIENT_GRID) {
      const clocks: BodyClocks = { growth: 1, fix: 1, highlight: 0, show: 1, ambient: t, focus: 0, lamp: Lamp.Off, lampRow: -1, sysPx };
      const shells = packShellData(eg, t);
      for (const a of hostless) {
        const o = bodyMote(a, clocks, { ...edata, shells });
        const c = bodyWorld(edata, a.row, t);
        most = Math.max(most, Math.hypot(o.pos[0] - c[0], o.pos[1] - c[1], o.pos[2] - c[2]) / t3(a.row)[1]);
      }
    }
    expect(most).toBeGreaterThan(1.5);
    expect(most).toBeLessThan(HOSTLESS_REACH);
  }, 120_000);
});

describe('the early-out at the galaxy wide', () => {
  it('skips most of the wide: the planets and moons, the stars on a phone, and every track dot', () => {
    // fr-1 at the pose: every system is under 10 px, and on a phone a star is under a px, its dots faded
    // into its glow. The core's shells (5,400 until Task 5 draws the hole in their place) are lit and
    // on screen, so they run the heavy path: they are counted apart.
    const { f } = drawAt(essayAt('far', 0.53125), SCREENS[0], AMBIENT_POSE);
    const shells = buildShellAttrs(eg);
    let systems = 0;
    let systemsSkipped = 0;
    let stars = 0;
    let starsSkipped = 0;
    for (let k = 0; k < shells.count; k++) {
      const [row, role, sys, index] = shells.mote.subarray(4 * k, 4 * k + 4);
      const kind = eg.bodies[row].kind;
      if (kind === 'core') continue;
      const skip = shellSkips(f, edata, row, role, sys, index);
      if (kind === 'star') {
        stars++;
        if (skip) starsSkipped++;
      } else {
        systems++;
        if (skip) systemsSkipped++;
      }
    }
    expect(systemsSkipped / systems).toBeGreaterThanOrEqual(0.95);
    expect(starsSkipped).toBe(stars);
    const tracks = buildTrackAttrs(eg);
    for (let k = 0; k < tracks.count; k++) expect(trackSkips(f, edata, tracks.track[4 * k], tracks.track[4 * k + 2])).toBe(true);
    expect(esystem.skipped()['net-tracks']).toBe(tracks.count);
  });
});

// ---- The plan's schematic (re-skin §4.7, Task 7b, round 4) ----

describe("the plan's level of detail", () => {
  const PLAN = [
    LodElement.PlanRingOuter,
    LodElement.PlanArc,
    LodElement.PlanChevron,
    LodElement.PlanRingInner,
    LodElement.PlanLeave,
    LodElement.PlanClose,
    LodElement.PlanBand,
    LodElement.PlanStalk,
    LodElement.PlanOutline,
    LodElement.PlanWire,
    LodElement.PlanGrad,
    LodElement.PlanCentre,
    LodElement.PlanDim,
    LodElement.PlanNum,
  ];
  const RANKS = [0, 0.001, 0.13, 0.5, 0.77, 0.999];

  it('holds the round-4 windows, value for value (the outer ring raised to 30 → 50; the chevrons in with the arcs, 30 → 55, Task 7b fix round 1)', () => {
    expect(PLAN.map((el) => [el, LOD_BANDS[el]])).toEqual([
      [5, [30, 50]],
      [6, [30, 55]],
      [7, [30, 55]],
      [8, [55, 85]],
      [9, [75, 105]],
      [10, [75, 115]],
      [11, [100, 150]],
      [12, [110, 150]],
      [13, [120, 160]],
      [14, [140, 180]],
      [15, [140, 180]],
      [16, [150, 180]],
      [17, [160, 190]],
      [18, [180, 210]],
    ]);
    expect(PLAN_RAMP).toBe(0.08);
    expect(PLAN_FULL_SOFT).toBe(12);
    // R's windows are the contiguous tail, as the GLSL tests them (el >= PLAN_R_FROM).
    expect(PLAN_R_ELEMENTS).toEqual([11, 12, 13, 14, 15, 16, 17, 18]);
    expect(lodLibraryGlsl()).toContain('const int PLAN_R_FROM = 11;');
    // Nothing of a plan below s_px 30: the far level.
    for (const el of PLAN) expect(LOD_BANDS[el][0]).toBeGreaterThanOrEqual(30);
  });

  it('brings each element in monotonically for every rank, PlanLeave out', () => {
    for (const el of PLAN) {
      for (const rank of RANKS) {
        let last = el === LodElement.PlanLeave ? Infinity : -Infinity;
        for (let s = 0; s <= 260; s += 0.5) {
          const gain = planGain(el, s, rank, 1, 1, 1);
          if (el === LodElement.PlanLeave) expect(gain, `${el} ${rank} ${s}`).toBeLessThanOrEqual(last);
          else expect(gain, `${el} ${rank} ${s}`).toBeGreaterThanOrEqual(last);
          last = gain;
        }
      }
    }
  });

  it('opens the outer ring ahead of the arcs and nodes at every s_px in [30, 55]', () => {
    for (let s = 30; s <= 55; s += 0.5) expect(planWindow(LodElement.PlanRingOuter, s, 1), `${s}`).toBeGreaterThanOrEqual(planWindow(LodElement.PlanArc, s, 1));
    for (let s = 30; s <= 55; s += 0.5) for (const rank of RANKS) expect(planGain(LodElement.PlanRingOuter, s, rank, 1, 1, 1)).toBeGreaterThanOrEqual(planGain(LodElement.PlanArc, s, rank, 1, 1, 1));
  });

  it('dissolves a dot in by its rank over the ramp: 0 at w ≤ rank / 1.08, 1 at w ≥ (rank + 0.08) / 1.08', () => {
    for (const h of RANKS) {
      expect(planRank(h / 1.08, h)).toBe(0);
      expect(planRank(Math.max(0, h / 1.08 - 0.01), h)).toBe(0);
      expect(planRank((h + 0.08) / 1.08, h)).toBeCloseTo(1, 12);
      expect(planRank((h + 0.08) / 1.08 + 0.01, h)).toBe(1);
    }
    // Every dot of a whole window shows (the ramp is inside it).
    for (const h of RANKS) expect(planRank(1, h)).toBe(1);
  });

  it('gives R by the lead over the third: exactly 0 at no lead or less, 1 at +24 s_px; 1 with no third', () => {
    // The third itself (lead 0) and every smaller system are exactly 0: at most two systems in R.
    expect(planFull(100, 100)).toBe(0);
    expect(planFull(100 - 30, 100)).toBe(0);
    expect(planFull(100 + 24, 100)).toBe(1);
    expect(planFull(100 + 12, 100)).toBeCloseTo(0.5, 12);
    expect(planFull(5, -1e30)).toBe(1);
    // A wider soft (plan.ts: PLAN_FULL_SHARE of the third's size) widens it the same way.
    expect(planFull(100, 100, 40)).toBe(0);
    expect(planFull(180, 100, 40)).toBe(1);
  });

  it('culls a system softly: 0 a margin outside the frame or at the near depth, 1 inside beyond the far one', () => {
    expect(planCull(-PLAN_CULL.marginPx, 20)).toBe(0);
    expect(planCull(0, 20)).toBe(1);
    expect(planCull(50, PLAN_CULL.depth[0])).toBe(0);
    expect(planCull(50, PLAN_CULL.depth[1])).toBe(1);
    // A system larger than the margin fades over its own outer radius on screen.
    expect(planCull(-100, 20, 200)).toBeGreaterThan(0);
    expect(planCull(-200, 20, 200)).toBe(0);
    for (let x = -300; x <= 0; x += 5) expect(planCull(x, 20, 200)).toBeGreaterThanOrEqual(planCull(x - 5, 20, 200));
  });

  it('skips exactly: planSkip holds iff the gain is 0 for every rank', () => {
    for (const el of PLAN) {
      for (const s of [0, 29.9, 30, 30.01, 45, 55, 75, 100, 104.9, 105, 115, 150, 200, 210, 300]) {
        for (const full of [0, 0.3, 1]) {
          for (const cull of [0, 0.4, 1]) {
            for (const real of [0, 0.5, 1]) {
              const skip = planSkip(el, s, full, cull, real);
              const gains = [0, ...RANKS].map((rank) => planGain(el, s, rank, full, cull, real));
              if (skip) expect(gains.every((x) => x === 0), `${el} ${s} ${full} ${cull} ${real}`).toBe(true);
              else expect(planGain(el, s, 0, full, cull, real), `${el} ${s} ${full} ${cull} ${real}`).toBeGreaterThan(0);
            }
          }
        }
      }
    }
  });
});
