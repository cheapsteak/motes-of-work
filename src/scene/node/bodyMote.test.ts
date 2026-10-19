import { describe, expect, it } from 'vitest';
import { starDot } from './star';
import { MOTE_BUDGET_DESKTOP, MOTE_SEED } from '../../config';
import { AMBIENT_POSE, FREEZE_PINS, pinnedMoon } from '../../galaxy/ambient';
import { bodyIndex, galaxyBudget, generateGalaxy, type Body } from '../../galaxy/generate';
import type { Vec3 } from '../../math/vec';
import { Lamp, lampFocusRow } from '../../timeline/netTrack';
import { sectionSpans } from '../../scroll/progress';
import { loadStory } from '../../story/loader';
import { KeyframeSampler, type KeyframeFile } from '../../timeline/keyframeSampler';
import keyframes from '../../timeline/keyframes.json';
import {
  BODY_MOTE_CONSTANTS,
  BURST_JITTER,
  EQ_A,
  EQ_SECOND,
  FOCUS_GAIN,
  FIX_PULSE,
  FREEZE_COPY_GAIN,
  FREEZE_DIM,
  FREEZE_GREY,
  FREEZE_GREY_MIX,
  FREEZE_SCATTER_S,
  hexToRgb,
  LEAK,
  SCATTER_AMP,
  LAMP_FLOOR,
  LIGHT_CONSTANTS,
  NODE_BIRTH_WINDOW,
  NODE_FIX_WINDOW,
  NODE_HI_WINDOW,
  NODE_LAND_WINDOW,
  NODE_PULSE_WINDOW,
  NodeRole,
  SCATTER_MOON_CAP,
} from './birth';
import { buildPersonAttrs, buildShellAttrs, packShellData, type QuadSet } from './bodyAttrs';
import {
  bodyCentre,
  bodyDerp,
  bodyLeak,
  bodyLight,
  bodyMote,
  bodyMoteFlight,
  bodyMoteSettle,
  bodyShellEvent,
  fixPulse,
  focusDerp,
  focusGain,
  focusScatter,
  focusScatterRow,
  freezeLook,
  lampGain,
  pieceOf,
  shellTexel,
  trackDot,
  trackLampGain,
  type BodyClocks,
  type BodyMoteAttrs,
  type BodyMoteData,
} from './bodyMote';
import { packBodyData } from './bodyData';
import { GALAXY_INCLUDE_MARKER, bodyMoteLibraryGlsl, withGalaxyLibrary } from './shaderSource';
import bodyMoteGlsl from './bodyMote.glsl?raw';
import { derp, derpEvent } from './derp';
import { LOD_BANDS, LodElement } from './lod';
import { bodyWorld, elementsAt, orbitLocal, orbitTurns } from './orbit';
import { moteHashes, shellSeed, shellWarp, shellWarpLeak, spinShell } from './shell';
import { streamControl } from './stream';
import { nodeLanded, nodePulse } from './light';
import { PLANET_LOOK } from './classLook';
import { lightDir, terminator } from './terminator';

// Task 6 step 1: the galaxy's motes in motion (bodyMote.ts), in TypeScript (the parity page holds
// the GLSL to it).
const g = generateGalaxy(MOTE_SEED, 'desktop', galaxyBudget(MOTE_BUDGET_DESKTOP));
const base = packBodyData(g);
const shells = buildShellAttrs(g);
const persons = buildPersonAttrs(g);
const byId = (id: string): Body => g.bodies[bodyIndex(g, id)];
const dataAt = (t: number): BodyMoteData => ({ ...base, shells: packShellData(g, t) });
const FULL = 200;

/** Every system at `px` (full detail at 200: every derp term at full gain). */
const sysAt = (px: number): Float32Array => new Float32Array(32).fill(px);
const clocks = (c: Partial<BodyClocks>): BodyClocks => ({
  growth: 1,
  fix: 0,
  highlight: 0,
  show: 1,
  ambient: 0,
  focus: 0,
  lamp: Lamp.Off,
  lampRow: -1,
  sysPx: sysAt(FULL),
  ...c,
});

/** Instance k of a quad set as bodyMote() takes it. */
function attrsOf(set: QuadSet, k: number): BodyMoteAttrs {
  const m = set.mote.subarray(k * 4, k * 4 + 4);
  const f = set.flight.subarray(k * 4, k * 4 + 4);
  return {
    row: m[0],
    role: m[1],
    ll: { lat: set.ll[k * 2], lon: set.ll[k * 2 + 1] },
    birth: f[0],
    seed: f[1],
    host: f[2],
    index: m[3],
    sys: m[2],
  };
}

/** The instances of a body in a set. */
function motesOf(set: QuadSet, row: number): BodyMoteAttrs[] {
  const out: BodyMoteAttrs[] = [];
  for (let k = 0; k < set.count; k++) if (set.mote[k * 4] === row) out.push(attrsOf(set, k));
  return out;
}

const dist = (a: Vec3, b: Vec3): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const f32 = Math.fround;
const T50 = Array.from({ length: 50 }, (_, i) => 0.37 + 23.91 * i);

/** The shortest distance from `p` to the quadratic Bezier a, c, b (a fine parameter search). */
function offBezier(p: Vec3, a: Vec3, c: Vec3, b: Vec3): number {
  let best = Infinity;
  for (let i = 0; i <= 4000; i++) {
    const e = i / 4000;
    const om = 1 - e;
    best = Math.min(best, dist(p, [0, 1, 2].map((k) => om * om * a[k] + 2 * om * e * c[k] + e * e * b[k]) as Vec3));
  }
  return best;
}

describe('a builder', () => {
  it('is hidden before settle − W, on its stream’s Bezier during the window, and on its lattice point after it', () => {
    const t = 12.5;
    const data = dataAt(t);
    // Healthy bodies (no derp): two planets, a star and a moon.
    const moon = g.bodies.find((b) => b.kind === 'moon' && !b.cracked && g.bodies[b.host].stream !== null)!;
    for (const id of ['B1', 'B2', 'P_a', moon.id]) {
      const b = byId(id);
      expect(b.cracked, id).toBe(false);
      for (const a of motesOf(shells, b.index).filter((_, i) => i % 7 === 1)) {
        const normal = bodyMote(a, clocks({ ambient: t }), data).normal;
        const { settle } = bodyMoteSettle(a, normal, clocks({ ambient: t }), data);
        const before = bodyMote(a, clocks({ ambient: t, growth: settle - NODE_BIRTH_WINDOW - 1e-6 }), data);
        expect(before.visible, `${id} before`).toBe(false);
        const after = bodyMote(a, clocks({ ambient: t, growth: Math.min(1, settle + 1e-6) }), data);
        expect(after.visible, `${id} after`).toBe(true);
        expect(after.settled).toBe(1);
        // Landed: on its lattice point, R from the body, along its spun lattice normal (a star's dot
        // at its own distance ρ R along its own spun direction: star.ts starDot).
        const centre = bodyWorld(data, b.index, t);
        const rho = b.kind === 'star' ? Math.hypot(...starDot(a.index, a.seed).offset) : 1;
        const land = [0, 1, 2].map((k) => centre[k] + b.R * rho * after.normal[k]) as Vec3;
        expect(dist(after.pos, land), `${id} landed`).toBeLessThan(1e-6);
        // In flight: on the Bezier from its spread spawn through its stream's control point.
        const mid = bodyMote(a, clocks({ ambient: t, growth: settle - NODE_BIRTH_WINDOW / 2 }), data);
        expect(mid.visible).toBe(true);
        expect(mid.settled).toBeGreaterThan(0);
        expect(mid.settled).toBeLessThan(1);
        const { spawn, ctrl } = bodyMoteFlight(a, centre, land, t, data);
        expect(offBezier(mid.pos, spawn, ctrl, land), `${id} in flight`).toBeLessThan(2e-3);
        // A builder sets out from its stream's parent and flies its stream's own curve.
        const st = g.streams[a.host];
        const parent = bodyWorld(data, st.from, t);
        expect(dist(spawn, parent)).toBeLessThanOrEqual(0.3 * g.bodies[st.from].R * Math.sqrt(3) + 1e-9);
        expect(dist(ctrl, streamControl(parent, bodyWorld(data, st.to, t), st.bowBearing))).toBeLessThan(1e-6);
      }
    }
  });

  it('a moon’s motes land at once, at the moon’s birth in the last 30 % of its planet’s build', () => {
    const data = dataAt(0);
    const m = byId('C5-m1');
    const p = byId('C5');
    expect(m.born).toBeGreaterThanOrEqual(p.born + 0.7 * p.dur);
    expect(m.born).toBeLessThanOrEqual(p.born + p.dur);
    for (const a of motesOf(shells, m.index)) {
      const { settle } = bodyMoteSettle(a, [0, 1, 0], clocks({}), data);
      expect(settle).toBe(Math.fround(m.born));
      expect(a.host).toBe(p.stream);
    }
  });
});

describe('a healthy body is a perfect sphere', () => {
  it('its shell motes are R from bodyWorld at 50 ambients, whatever the level of detail (a star’s dots their own ρ R)', () => {
    for (const id of ['B1', 'P_a', 'R_a']) {
      const b = byId(id);
      expect(b.cracked, id).toBe(false);
      const motes = motesOf(shells, b.index).filter((_, i) => i % 11 === 0);
      for (const t of T50) {
        const data = dataAt(t);
        const centre = bodyWorld(data, b.index, t);
        for (const a of motes) {
          if (b.kind === 'planet' && a.index === 0) continue; // the point
          for (const px of [0, 40, FULL]) {
            const o = bodyMote(a, clocks({ ambient: t, sysPx: sysAt(px) }), data);
            // A star's dot sits at its own distance in its cloud (star.ts starDot), the rest on the sphere.
            const rho = b.kind === 'star' ? Math.hypot(...starDot(a.index, a.seed).offset) : 1;
            expect(Math.abs(dist(o.pos, centre) - f32(b.R) * rho), `${id} at ${t}`).toBeLessThan(1e-7 * Math.max(1, rho));
          }
        }
      }
    }
  });
});

describe('a cracked body', () => {
  const c1 = byId('C1');
  const motes = motesOf(shells, c1.index).filter((_, i) => i % 23 === 5);
  const sys = motes[0].sys;
  const derpFar = (LOD_BANDS[LodElement.Derp][0] + 0) as number;

  it('stays a sphere about bodyWorld while lodGain(Derp) is 0, at 50 ambients', () => {
    for (const t of T50) {
      const data = dataAt(t);
      const centre = bodyWorld(data, c1.index, t);
      for (const a of motes) {
        const o = bodyMote(a, clocks({ ambient: t, sysPx: sysAt(derpFar) }), data);
        expect(Math.abs(dist(o.pos, centre) - f32(c1.R))).toBeLessThan(1e-7);
      }
    }
  });

  it('leaves it only through derp (its centre) and shellWarpLeak (its shell and its leak), and only at lodGain(Derp) > 0', () => {
    let off = 0;
    let leaked = 0;
    for (const t of T50) {
      const data = dataAt(t);
      const c = clocks({ ambient: t });
      const d = bodyDerp(c1.index, sys, c, data);
      const centre = bodyCentre(c1.index, d, t, data);
      const ev = bodyShellEvent(c1.index, d.scatterS, data);
      const axis = shellTexel(data.shells, 2, c1.index).slice(0, 3) as Vec3;
      for (const a of motes) {
        const o = bodyMote(a, c, data);
        const h = moteHashes(shellSeed(c1.id), a.index);
        const wounds = bodyLeak(c1.index, t, data);
        const warp = shellWarpLeak(a.ll, h, a.index, t, ev, f32(EQ_A), 1, SCATTER_AMP[0] + SCATTER_AMP[1], wounds).p;
        const want = [0, 1, 2].map((k) => centre[k] + f32(c1.R) * spinShell(warp, axis, t)[k]) as Vec3;
        expect(dist(o.pos, want)).toBeLessThan(1e-6);
        if (dist(warp, shellWarp(a.ll, h, t, ev, f32(EQ_A), 1, SCATTER_AMP[0] + SCATTER_AMP[1])) > 0) leaked++;
        if (Math.abs(dist(o.pos, bodyWorld(data, c1.index, t)) - f32(c1.R)) > 1e-3 * c1.R) off++;
      }
    }
    expect(off, 'the defect moves C1 off its sphere somewhere in 50 ambients').toBeGreaterThan(100);
    expect(leaked, 'and its wounds leak some of its motes').toBeGreaterThan(0);
  });

  it('is a sphere again once fixed: v takes every term to 0', () => {
    for (const t of T50.slice(0, 10)) {
      const data = dataAt(t);
      const centre = bodyWorld(data, c1.index, t);
      for (const a of motes) {
        const o = bodyMote(a, clocks({ ambient: t, fix: 1 }), data);
        expect(Math.abs(dist(o.pos, centre) - f32(c1.R))).toBeLessThan(1e-7);
      }
    }
  });

  it('a cracked moon’s leap is capped at SCATTER_MOON_CAP (its leak reaches no further than a planet’s)', () => {
    const m = byId('C1-m1');
    for (const t of T50) {
      const data = dataAt(t);
      const c = clocks({ ambient: t });
      const centre = bodyCentre(m.index, bodyDerp(m.index, sys, c, data), t, data);
      // The leak's farthest: reach × (dist[0] + dist[1]) × amp R, crept LEAK.creep further, and its shiver.
      const leak = LEAK.reach * (LEAK.dist[0] + LEAK.dist[1]) * LEAK.amp * (1 + LEAK.creep) + LEAK.shiver;
      for (const a of motesOf(shells, m.index)) expect(dist(bodyMote(a, c, data).pos, centre)).toBeLessThan(m.R * (1 + EQ_A + Math.max(SCATTER_MOON_CAP + 0.1, leak)));
    }
  });
});

describe('the light', () => {
  it('hi is 0 before hiAt, 1 after, and 0 once fixed', () => {
    const data = dataAt(0);
    for (const id of ['C2', 'P1', 'C8-m1']) {
      const b = byId(id);
      const a = motesOf(shells, b.index)[1];
      const at = (highlight: number, fix: number) => bodyMote(a, clocks({ highlight, fix }), data).hi;
      expect(at(b.hiAt! - NODE_HI_WINDOW - 1e-6, 0), id).toBe(0);
      expect(at(f32(b.hiAt!), 0), id).toBe(1);
      expect(at(0.5, 0), id).toBe(1);
      expect(at(0.5, f32(b.fixAt!)), id).toBe(0);
      expect(at(0.5, b.fixAt! - NODE_FIX_WINDOW - 1e-6), id).toBe(1);
    }
  });

  it('a lit shell is NODE_HI_GAIN brighter (× 2.5) and unshaded, a fixed one tinted amber, a person mote amber', () => {
    const data = dataAt(0);
    const a = motesOf(shells, byId('C2').index)[1];
    const dark = bodyMote(a, clocks({}), data);
    const lit = bodyMote(a, clocks({ highlight: 0.5 }), data);
    // The dark mote is shaded by its terminator (re-skin §4.4); lit, it glows everywhere.
    const shade = terminator(dark.normal, lightDir(data, a.row, 0), PLANET_LOOK.night.rest);
    expect(lit.brightness / dark.brightness).toBeCloseTo(2.5 / shade, 9);
    expect(dark.warm).toBe(0);
    expect(bodyMote(a, clocks({ highlight: 0.5, fix: 1 }), data).warm).toBeCloseTo(0.3, 12);
    const p = motesOf(persons, byId('C2').index)[0];
    expect(p.role).toBe(NodeRole.Person);
    expect(bodyMote(p, clocks({ fix: 1 }), data).warm).toBe(1);
  });

  it('person motes fall on net.fix and land on their host’s sphere before the mend begins', () => {
    // The author on v25: the gold lands first, then the piece glows, then it mends. The landing ends
    // NODE_PULSE_WINDOW + NODE_FIX_WINDOW before fixAt, where the mend (nodeLight's fix) has not begun.
    // That order is the planet lamp's subject's (the close-up); any other body, seen from afar in the
    // sweep, lands its motes with its mend, over NODE_FIX_WINDOW up to its fixAt, as before.
    const c1 = byId('C1');
    const data = dataAt(0);
    const lit = { lamp: Lamp.Planet, lampRow: c1.index, focus: 1 };
    const landed = nodeLanded(f32(c1.fixAt!));
    expect(landed).toBeCloseTo(c1.fixAt! - NODE_FIX_WINDOW - NODE_PULSE_WINDOW, 6);
    expect(landed - NODE_LAND_WINDOW).toBeGreaterThan(0);
    for (const a of motesOf(persons, c1.index)) {
      expect(bodyMote(a, clocks({ fix: landed - NODE_LAND_WINDOW - 1e-6, ...lit }), data).visible).toBe(false);
      const o = bodyMote(a, clocks({ fix: landed, ...lit }), data);
      expect(o.visible).toBe(true);
      expect(o.settled).toBe(1);
      expect(Math.abs(dist(o.pos, bodyWorld(data, c1.index, 0)) - f32(c1.R))).toBeLessThan(1e-7);
      // Off the planet lamp: the window before fixAt, as before.
      expect(bodyMote(a, clocks({ fix: c1.fixAt! - NODE_FIX_WINDOW - 1e-6 }), data).visible).toBe(false);
      expect(bodyMote(a, clocks({ fix: landed }), data).settled).toBeLessThan(1);
      const home = bodyMote(a, clocks({ fix: f32(c1.fixAt!) }), data);
      expect(Math.abs(dist(home.pos, bodyWorld(data, c1.index, 0)) - f32(c1.R))).toBeLessThan(1e-7);
    }
    expect(bodyLight(c1.index, { fix: landed, highlight: 0 }, base).fix).toBe(0);
  });
});

describe('lampGain', () => {
  const data = base;
  const id = (row: number) => g.bodies[row].id;
  const lit: Record<Lamp, (b: Body, f: Body | null) => boolean> = {
    [Lamp.Off]: () => true,
    [Lamp.Planet]: (b, f) => f !== null && f.planet >= 0 && b.planet === f.planet,
    [Lamp.Star]: (b, f) => f !== null && b.star === f.star,
    [Lamp.Hood]: () => true,
    [Lamp.Core]: (b) => b.kind === 'core',
    [Lamp.Lineage]: (b, f) => b.kind === 'core' || (f !== null && b.rule === f.rule),
    [Lamp.Arms]: (b) => b.kind !== 'core',
  };
  const cases: [Lamp, string | null][] = [
    [Lamp.Planet, 'C1'],
    [Lamp.Planet, 'C1-m5'],
    [Lamp.Star, 'P1'],
    [Lamp.Star, 'C2'],
    [Lamp.Hood, null],
    [Lamp.Core, null],
    [Lamp.Lineage, 'R0'],
    [Lamp.Lineage, 'P1'],
    [Lamp.Arms, null],
    [Lamp.Planet, null],
  ];

  it.each(cases)('is 0 outside the lit set and 1 inside it, at level %s on %s', (lamp, focusId) => {
    const focus = focusId === null ? null : byId(focusId);
    let inside = 0;
    for (const b of g.bodies) {
      const gain = lampGain(b.index, { lamp, lampRow: focus?.index ?? -1, focus: 0 }, data);
      expect(gain, `${id(b.index)}`).toBe(lit[lamp](b, focus) ? 1 : 0);
      if (gain > 0) inside++;
    }
    expect(inside > 0).toBe(focusId !== null || lamp !== Lamp.Planet);
  });

  it('at focus 1, everything inside but the subject (the focus body, its whole piece) falls to LAMP_FLOOR', () => {
    const c1 = byId('C1');
    for (const b of g.bodies.filter((x) => x.star === c1.star)) {
      const gain = lampGain(b.index, { lamp: Lamp.Star, lampRow: c1.index, focus: 1 }, data);
      expect(gain, b.id).toBe(b.planet === c1.index ? 1 : LAMP_FLOOR);
    }
    expect(lampGain(byId('P1').index, { lamp: Lamp.Star, lampRow: byId('P1').index, focus: 1 }, data)).toBe(1);
    expect(lampGain(byId('C2').index, { lamp: Lamp.Off, lampRow: c1.index, focus: 1 }, data)).toBe(1);
  });

  it('darkens a mote outside it: invisible, at 0', () => {
    const a = motesOf(shells, byId('C2').index)[1];
    const o = bodyMote(a, clocks({ lamp: Lamp.Planet, lampRow: byId('C1').index }), dataAt(0));
    expect(o.visible).toBe(false);
    expect(o.brightness).toBe(0);
  });
});

describe('trackLampGain (track.vert.glsl’s lamp, Task 10)', () => {
  const data = base;
  const c1 = byId('C1');
  const moons = g.bodies.filter((b) => b.kind === 'moon' && b.host === c1.index);

  it('never draws the lit planet’s own orbit under the planet lamp, at any focus, and changes nothing else (Task 10 review I2)', () => {
    expect(moons.length).toBeGreaterThan(0);
    // The case is real: lampGain lights C1's row under its own planet lamp.
    expect(lampGain(c1.index, { lamp: Lamp.Planet, lampRow: c1.index, focus: 0 }, data)).toBe(1);
    for (const focus of [0, 0.5, 1]) {
      const c = { lamp: Lamp.Planet, lampRow: c1.index, focus };
      // The orbit round P1 belongs to the star: dark whatever the focus.
      expect(trackLampGain(c1.index, c, data), `C1 at focus ${focus}`).toBe(0);
      // The piece's own moon tracks stay, as lampGain has them.
      for (const m of moons) expect(trackLampGain(m.index, c, data), `${m.id} at focus ${focus}`).toBe(lampGain(m.index, c, data));
      // Every other track is lampGain's (dark under this lamp).
      for (const b of g.bodies.filter((x) => x.planet !== c1.index)) expect(trackLampGain(b.index, c, data), b.id).toBe(lampGain(b.index, c, data));
    }
  });

  it('leaves every other level as lampGain has it, the planets’ orbits included', () => {
    for (const [lamp, on] of [
      [Lamp.Star, 'C1'],
      [Lamp.Lineage, 'R0'],
      [Lamp.Hood, null],
      [Lamp.Off, null],
    ] as const) {
      const c = { lamp, lampRow: on === null ? -1 : byId(on).index, focus: 1 };
      for (const b of g.bodies) expect(trackLampGain(b.index, c, data), `${b.id} under ${Lamp[lamp]}`).toBe(lampGain(b.index, c, data));
    }
  });
});

describe('a dotted orbit’s dot (track.vert.glsl’s twin)', () => {
  it('at a body’s own mean anomaly is the body, at the pose and at 101 s: the ellipse turns with the galaxy', () => {
    for (const t of [0, AMBIENT_POSE, 101]) {
      for (const id of ['C1', 'C1-m5', 'P_a', 'B1', 'C9-m1', 'V3'].filter((x) => g.ids[x] !== undefined)) {
        const b = byId(id);
        if (b.orbit === null) continue;
        const o = elementsAt(base, b.index);
        const own = o.phase + orbitTurns(t, o.period);
        expect(dist(trackDot(b.index, own - Math.floor(own), t, base), bodyWorld(base, b.index, t)), `${id} at ${t}`).toBeLessThan(1e-9);
      }
    }
    // The control: at 101 s the galaxy has turned half a radian, and an unturned ellipse misses its body.
    const c4 = byId('C4');
    const o = elementsAt(base, c4.index);
    const local = orbitLocal(o, 101);
    const host = bodyWorld(base, c4.host, 101);
    expect(dist([host[0] + local[0], host[1] + local[1], host[2] + local[2]], bodyWorld(base, c4.index, 101))).toBeGreaterThan(1);
  });
});

describe('the real composition and the freeze pin’s approximation', () => {
  const m = byId(FREEZE_PINS.C1.moon);
  const t = AMBIENT_POSE;
  const data = dataAt(t);
  const c = clocks({ ambient: t });
  const pinned = pinnedMoon(g, base, m.index, t);

  it('agrees with pinnedMoon for the pinned moon at AMBIENT_POSE, to 1e-3 of a unit, from the same derp', () => {
    // pinnedMoon reads the moon's derp in float64 from the generator; the composition, given the same
    // derp, puts it where pinnedMoon does but for the galaxy's turn, which it takes at t and
    // pinnedMoon at t + orbitT (4e-4 of a unit here).
    const d = derp(m.derpSeed, m.derpPhase, t, 'moon', m.orbit!.a, m.R, (2 * Math.PI) / m.orbit!.period, 1);
    expect(dist(bodyCentre(m.index, d, t, data), pinned)).toBeLessThan(1e-3);
  });

  it('and bodyMote, reading the float32 texture, on the same tick of the burst’s jitter', () => {
    // The pose stands half a tick of the burst's jitter off a cut (ambient.ts, FREEZE_PIN_OFFSET_S):
    // the texture's float32 phase reads the tick the generator's float64 reads, so the drawn moon is
    // where pinnedMoon puts it, not a jitter step (up to 2·BURST_JITTER·r per axis) away.
    const step = 2 * Math.SQRT2 * BURST_JITTER * m.orbit!.a;
    expect(step).toBeGreaterThan(10 * 1e-3);
    const centre = bodyCentre(m.index, bodyDerp(m.index, motesOf(shells, m.index)[0].sys, c, data), t, data);
    expect(dist(centre, pinned)).toBeLessThan(1e-3);
    // On its shell: the morph reaches EQ_A (1 + EQ_SECOND) of R (morphTerm's bound), which a finer lattice samples.
    for (const a of motesOf(shells, m.index)) expect(dist(bodyMote(a, c, data).pos, centre)).toBeLessThan(m.R * (1 + EQ_A * (1 + EQ_SECOND)) + 1e-6);
  });
});

describe('bodyMote.glsl', () => {
  it('declares the constants birth.ts exports for it, spliced, and names only those', () => {
    const lib = bodyMoteLibraryGlsl();
    for (const [name, value] of BODY_MOTE_CONSTANTS) {
      const m = new RegExp(`const float ${name} = ([-0-9.e]+);`).exec(lib);
      expect(m, name).not.toBeNull();
      expect(Number(m![1]), name).toBe(value);
    }
    expect(lib).not.toMatch(/#include/);
    for (const m of bodyMoteGlsl.matchAll(/\b(BODY|LAMP|NODE)_[A-Z_]+\b/g)) {
      expect(BODY_MOTE_CONSTANTS.has(m[0]) || LIGHT_CONSTANTS.has(m[0]), m[0]).toBe(true);
    }
    expect(bodyMoteGlsl).not.toMatch(/const float (BODY|LAMP|NODE|STREAM)_/);
  });

  it('leaves no name declared twice in a galaxy shader', () => {
    const shader = withGalaxyLibrary(GALAXY_INCLUDE_MARKER);
    const names = [...shader.matchAll(/^const (?:float|int|uint|vec[234]) ([A-Z0-9_]+)\b/gm)].map((m) => m[1]);
    expect(names.length).toBeGreaterThan(100);
    expect(names.filter((n, i) => names.indexOf(n) !== i)).toEqual([]);
  });

  it('is in every galaxy shader once, after the libraries it reads', () => {
    const shader = withGalaxyLibrary(GALAXY_INCLUDE_MARKER);
    const at = (needle: string) => shader.indexOf(needle);
    expect(shader.split('BodyMoteOut bodyMote(BodyMoteAttrs a)')).toHaveLength(2);
    for (const before of ['Derp derp(', 'vec4 shellWarpK(', 'float lodGain(', 'vec3 nodeLight(', 'vec3 bodyWorld(', 'const float STREAM_CAP']) {
      expect(at(before), before).toBeGreaterThanOrEqual(0);
      expect(at(before), before).toBeLessThan(at('BodyMoteOut bodyMote(BodyMoteAttrs a)'));
    }
  });
});

// ---- The freeze frame on the galaxy's motes (freeze-frame §2.1, §3.1; Task 12) ----

describe('the freeze frame’s hold and look', () => {
  const C1 = bodyIndex(g, 'C1');
  const moon = bodyIndex(g, FREEZE_PINS.C1.moon);
  const other = g.bodies.find((b) => b.kind === 'moon' && b.host === C1 && b.index !== moon)!.index;
  const away = g.bodies.find((b) => b.kind === 'planet' && b.index !== C1 && b.cracked === false)!.index;
  const held = (copy: 0 | 1 | 2, dress = 1, flash = 0) => ({ dress, flash, copy, moon, planet: C1 });
  const t = AMBIENT_POSE;

  it('forces C1’s scatter FREEZE_SCATTER_S in, and nothing else of its derp, on the held row only', () => {
    const sys = motesOf(shells, C1)[0].sys;
    const forced = bodyDerp(C1, sys, clocks({ ambient: t, forcedScatter: C1 }), base);
    expect(forced).toEqual({ dNu: 0, dR: 0, lift: 0, wobble: [0, 0, 0], orbitT: 0, ghost: 0, ghostNu: 0, scatterS: FREEZE_SCATTER_S });
    // Its own schedule at the pin is no scatter (the pin's search found none in frame: forced-scatter).
    expect(FREEZE_PINS.C1.path).toBe('forced-scatter');
    expect(bodyDerp(C1, sys, clocks({ ambient: t }), base).scatterS).toBe(-1);
    // The moon keeps its own burst.
    expect(bodyDerp(moon, sys, clocks({ ambient: t, forcedScatter: C1 }), base)).toEqual(bodyDerp(moon, sys, clocks({ ambient: t }), base));
    // So the planet's shell is out: some of its motes leave the sphere by a tenth of R and more.
    const data = dataAt(t);
    const R = byId('C1').R;
    const centre = bodyCentre(C1, forced, t, base);
    const out = motesOf(shells, C1)
      .slice(1)
      .filter((a) => dist(bodyMote(a, clocks({ ambient: t, forcedScatter: C1 }), data).pos, centre) > 1.1 * R);
    expect(out.length).toBeGreaterThan(100);
  });

  it('copies only the held piece, the moon caught mid-burst 6 px out, every other part 3, at 0.26 of the base', () => {
    for (const copy of [1, 2] as const) {
      expect(freezeLook(away, 1, { focus: 1, freeze: held(copy) }, base).gain).toBe(0);
      const p = freezeLook(C1, 1, { focus: 1, freeze: held(copy) }, base);
      expect(p.gain).toBeCloseTo(FREEZE_COPY_GAIN, 12);
      expect(Math.abs(p.offPx)).toBe(3);
      expect(Math.abs(freezeLook(moon, 1, { focus: 1, freeze: held(copy) }, base).offPx)).toBe(6);
      expect(Math.abs(freezeLook(other, 1, { focus: 1, freeze: held(copy) }, base).offPx)).toBe(3);
      expect(p.tint[3]).toBe(1);
    }
  });

  it('dims and greys the rest by the dressing, flashes the piece toward white, every term times net.focus', () => {
    const grey = hexToRgb(FREEZE_GREY);
    const rest = freezeLook(away, 1, { focus: 1, freeze: held(0) }, base);
    expect(rest.gain).toBeCloseTo(FREEZE_DIM, 12);
    expect(rest.tint).toEqual([...grey, FREEZE_GREY_MIX]);
    const lit = freezeLook(C1, 1, { focus: 1, freeze: held(0, 0, 1) }, base);
    expect(lit.gain).toBe(2);
    expect(lit.tint).toEqual([1, 1, 1, 0.45]);
    // Off a focused frame nothing of it shows: no dim, no grey, no flash, no copy.
    for (const row of [away, C1, moon]) {
      const off = freezeLook(row, 1, { focus: 0, freeze: held(0, 1, 1) }, base);
      expect(off.gain).toBe(1);
      expect(off.tint[3]).toBe(0);
      expect(freezeLook(row, 1, { focus: 0, freeze: held(2) }, base).gain).toBe(0);
    }
    // And without a freeze frame, bodyMote is what it was.
    const a = motesOf(shells, C1)[3];
    const plain = bodyMote(a, clocks({ ambient: t }), dataAt(t));
    expect(plain.tint[3]).toBe(0);
    expect(plain.offPx).toBe(0);
    const dressed = bodyMote(a, clocks({ ambient: t, focus: 1, freeze: held(0, 1, 0) }), dataAt(t));
    expect(dressed.brightness).toBeCloseTo(plain.brightness * 1, 9);
    const dim = bodyMote(motesOf(shells, away)[3], clocks({ ambient: t, focus: 1, freeze: held(0, 1, 0) }), dataAt(t));
    const undimmed = bodyMote(motesOf(shells, away)[3], clocks({ ambient: t, focus: 1 }), dataAt(t));
    expect(dim.brightness).toBeCloseTo(undimmed.brightness * FREEZE_DIM, 9);
  });
});

// ---- The focused piece under the planet lamp (the author's Task 12 additions) ----

describe('the focused piece under the planet lamp', () => {
  const C1 = bodyIndex(g, 'C1');
  const moon = g.bodies.find((b) => b.kind === 'moon' && b.host === C1)!.index;
  const away = g.bodies.find((b) => b.kind === 'planet' && b.index !== C1)!.index;
  const lamp = (focus: number) => ({ lamp: Lamp.Planet, lampRow: C1, focus });

  it('brightens its planet and moons by mix(1, FOCUS_GAIN, focus), nothing else, and not off the planet lamp', () => {
    expect(focusGain(C1, lamp(1), base)).toBe(FOCUS_GAIN);
    expect(focusGain(moon, lamp(1), base)).toBe(FOCUS_GAIN);
    expect(focusGain(C1, lamp(0.5), base)).toBeCloseTo(1 + (FOCUS_GAIN - 1) / 2, 12);
    expect(focusGain(C1, lamp(0), base)).toBe(1);
    expect(focusGain(away, lamp(1), base)).toBe(1);
    expect(focusGain(C1, { lamp: Lamp.Star, lampRow: C1, focus: 1 }, base)).toBe(1);
    // In its motes: the same mote, focused and not.
    const a = motesOf(shells, C1)[5];
    const t = 37.3;
    const lit = bodyMote(a, clocks({ ambient: t, ...lamp(1) }), dataAt(t)).brightness;
    const plain = bodyMote(a, clocks({ ambient: t, lamp: Lamp.Planet, lampRow: C1, focus: 0 }), dataAt(t)).brightness;
    expect(lit).toBeCloseTo(plain * FOCUS_GAIN, 9);
    // Short of white: the agents' blue's red channel at the gain stays under full.
    expect(hexToRgb('#4DA3FF')[0] * FOCUS_GAIN).toBeLessThan(1);
  });

  it('holds its planet and its moons on their paths at every focus (their scatters stay), the moons’ held pose kept while the freeze holds', () => {
    // The author on v25: the piece "pulled back ... on a rubber bed ... snaps back with a wobble" (the
    // skip, on the planet as the focus comes up and on all six moons at once, R0's seed being theirs), and
    // the moons "wobble around" while the scatter, the leak and the dropout play. Under the planet lamp the
    // piece's orbit derps are gone at every focus; its defect is its shell's.
    const sys = motesOf(shells, C1)[0].sys;
    const orbitTerms = (d: ReturnType<typeof bodyDerp>) => [d.dNu, d.dR, d.lift, ...d.wobble, d.orbitT, d.ghost, d.ghostNu];
    const derping = (row: number) => Array.from({ length: 2000 }, (_, i) => i * 0.3).find((x) => Math.abs(bodyDerp(row, sys, clocks({ ambient: x }), base).dR) > 0.01)!;
    for (const row of [C1, ...g.bodies.filter((b) => b.kind === 'moon' && b.host === C1).map((b) => b.index)]) {
      const t = derping(row);
      expect(t, g.bodies[row].id).toBeDefined();
      const free = bodyDerp(row, sys, clocks({ ambient: t }), base);
      expect(Math.abs(free.dR)).toBeGreaterThan(0.01);
      for (const focus of [0, 0.25, 0.5, 0.75, 1]) {
        const held = bodyDerp(row, sys, clocks({ ambient: t, ...lamp(focus) }), base);
        expect(orbitTerms(held).every((x) => x === 0), `${g.bodies[row].id} at focus ${focus}`).toBe(true);
        expect(dist(bodyCentre(row, held, t, base), bodyCentre(row, { ...held, wobble: [0, 0, 0] }, t, base))).toBe(0);
        expect(focusDerp(row, lamp(focus), base)).toBe(0);
      }
      // Off the planet lamp, nothing changes.
      expect(bodyDerp(row, sys, clocks({ ambient: t, lamp: Lamp.Star, lampRow: C1, focus: 1 }), base)).toEqual(free);
    }
    // A scatter is its shell's: it keeps its clock, on the planet and on a moon.
    for (const row of [C1, moon]) {
      const ts = Array.from({ length: 4000 }, (_, i) => i * 0.137).find((x) => bodyDerp(row, sys, clocks({ ambient: x }), base).scatterS >= 0)!;
      expect(bodyDerp(row, sys, clocks({ ambient: ts, ...lamp(0.4) }), base).scatterS).toBe(bodyDerp(row, sys, clocks({ ambient: ts }), base).scatterS);
    }
    // While the freeze holds, the moons keep their derp: the moon its pin caught off its path beside its
    // ghost is the freeze's (at the pin, the only moon off its path); the planet keeps none.
    const m = byId(FREEZE_PINS.C1.moon).index;
    const pinned = bodyDerp(m, sys, clocks({ ambient: AMBIENT_POSE, ...lamp(1), holding: true }), base);
    expect(pinned).toEqual(bodyDerp(m, sys, clocks({ ambient: AMBIENT_POSE }), base));
    expect(Math.abs(pinned.dR) + Math.abs(pinned.dNu)).toBeGreaterThan(0);
    expect(focusDerp(m, { ...lamp(1), holding: true }, base)).toBe(1);
    expect(focusDerp(C1, { ...lamp(1), holding: true }, base)).toBe(0);
    expect(focusDerp(away, lamp(1), base)).toBe(1);
  });
});

// ---- The defect beat as keyed (the author's notes on the published v25) ----

describe('the defect beat in the keys (the author on v25)', () => {
  const spans = sectionSpans(loadStory());
  const sampler = new KeyframeSampler(keyframes as unknown as KeyframeFile, spans);
  const span = spans.find((x) => x.id === 'defect')!;
  const stateAt = (local: number) => sampler.sample(span.start + local * (span.end - span.start));
  const C1 = bodyIndex(g, 'C1');
  const pieceRows = [C1, ...g.bodies.filter((b) => b.kind === 'moon' && b.host === C1).map((b) => b.index)];
  const sys = motesOf(shells, C1)[0].sys;
  /** The clocks a frame at defect `local` hands bodyMote (galaxyOnScreen.ts visibleGalaxy's), at ambient `t`. */
  const keyed = (local: number, t: number): BodyClocks => {
    const s = stateAt(local);
    const holding = s.freeze.hold >= 0.5 && s.net.focus > 0;
    return clocks({
      growth: s.net.growth,
      fix: s.net.fix,
      highlight: s.net.highlight,
      show: s.net.show,
      ambient: holding ? AMBIENT_POSE : t,
      focus: s.net.focus,
      lamp: Math.round(s.net.lamp),
      lampRow: lampFocusRow(s.net.lampAt, g),
      holding,
      forcedScatter: holding && FREEZE_PINS.C1.path !== 'full' ? C1 : -1,
    });
  };

  it('keeps the piece on its paths from the dive to the cut: no elastic skip, no moon wobble, against the twin', () => {
    // df-1 at 30 fps over 15 s of the ambient (95-110 s: the six moons reverse, burst, wobble and skip
    // together there, R0's seed being theirs), from the dive's landing through the push-in (focus 0 to 1,
    // the planet on its own schedule until FOCUS_SCATTER) to the cut at 0.2605. Every body of the piece is
    // where its path puts it (bodyCentre with no derp), to the bit; off the lamp the same frames derp.
    const LOCALS = [0.01, 0.04, 0.08, 0.12, 0.16, 0.2, 0.22, 0.25];
    let moved = 0;
    for (const local of LOCALS)
      for (let f = 0; f < 15 * 30; f++) {
        const t = 95 + f / 30;
        const c = keyed(local, t);
        expect(c.holding).toBe(false);
        for (const row of pieceRows) {
          const d = bodyDerp(row, sys, c, base);
          const onPath = bodyCentre(row, { ...d, dNu: 0, dR: 0, lift: 0, wobble: [0, 0, 0], orbitT: 0 }, t, base);
          expect(dist(bodyCentre(row, d, t, base), onPath), `${g.bodies[row].id} at ${local}, ${t}`).toBe(0);
          if (local === 0.22) {
            const free = bodyDerp(row, sys, { ...c, lamp: Lamp.Off }, base);
            if (dist(bodyCentre(row, free, t, base), onPath) > 0.05 * g.bodies[row].R) moved++;
          }
        }
      }
    // Not vacuous: unlit, the same moons are off their paths in many of these frames.
    expect(moved).toBeGreaterThan(100);
  });

  it('lands the fix, then glows, then mends, in that order on the scroll (df-2b)', () => {
    // The landing's end ≤ the pulse's start < its peak < the mend's start, each read off the twin at every
    // 0.0005 of defect progress over df-2b: the person's motes on the piece all settled, fixPulse up, and
    // nodeLight's fix (the mend: v = 1 − fix) begun, on C1 and on each of its moons.
    const STEP = 0.0005;
    const locals = Array.from({ length: Math.round((0.43 - 0.35) / STEP) + 1 }, (_, k) => 0.35 + k * STEP);
    const data = dataAt(AMBIENT_POSE);
    const motes = persons.count > 0 ? pieceRows.flatMap((row) => motesOf(persons, row)) : [];
    expect(motes.length).toBeGreaterThan(100);
    const first = (ok: (l: number) => boolean) => locals.find(ok) ?? Infinity;
    const visibleAt = (l: number) => motes.some((a) => bodyMote(a, keyed(l, 101), data).visible);
    const landedAt = (l: number) => motes.every((a) => bodyMote(a, keyed(l, 101), data).settled === 1);
    const landFrom = first(visibleAt);
    const landEnd = first(landedAt);
    for (const row of pieceRows) {
      const pulse = (l: number) => fixPulse(row, keyed(l, 101), base);
      const mend = (l: number) => bodyLight(row, keyed(l, 101), base).fix;
      const pulseStart = first((l) => pulse(l) > 0);
      const peak = locals.reduce((best, l) => (pulse(l) > pulse(best) ? l : best), locals[0]);
      const pulseEnd = first((l) => l > peak && pulse(l) === 0);
      const mendStart = first((l) => mend(l) > 0);
      const mended = first((l) => mend(l) === 1);
      const release = first((l) => stateAt(l).freeze.hold < 0.5 && l > 0.3);
      const id = g.bodies[row].id;
      expect(landFrom, id).toBeGreaterThanOrEqual(0.36); // not before "So you fix it." comes up
      expect(landEnd, id).toBeLessThanOrEqual(pulseStart);
      expect(pulseStart, id).toBeLessThan(peak);
      expect(peak, id).toBeLessThan(mendStart);
      expect(pulseEnd, id).toBeLessThanOrEqual(mendStart); // it rises and falls before the mend
      expect(pulse(peak), id).toBeGreaterThan(0.99);
      expect(mended, id).toBeLessThan(release); // mended inside the held frame, as before
      // The pulse spans 0.014 of defect progress (0.374-0.388, peak 0.381): 18 % of df-2b from its
      // line (0.36) to its stop (0.437), about a fifth.
      expect(pulseEnd - pulseStart, id).toBeGreaterThan(0.01);
    }
  }, 60_000);

  it('glows the piece gold, and nothing else, by the pulse', () => {
    const away = g.bodies.find((b) => b.kind === 'planet' && b.index !== C1)!.index;
    const c1 = byId('C1');
    const peak = nodeLanded(c1.fixAt!) + NODE_PULSE_WINDOW / 2;
    expect(nodePulse(c1.fixAt!, peak)).toBeCloseTo(1, 9);
    expect(nodePulse(c1.fixAt!, nodeLanded(c1.fixAt!))).toBe(0);
    expect(nodePulse(c1.fixAt!, nodeLanded(c1.fixAt!) + NODE_PULSE_WINDOW)).toBeCloseTo(0, 9);
    const at = (c: Partial<BodyClocks>) => clocks({ ambient: AMBIENT_POSE, fix: peak, lamp: Lamp.Planet, lampRow: C1, focus: 1, ...c });
    for (const row of pieceRows) expect(fixPulse(row, at({}), base)).toBeCloseTo(1, 9);
    expect(fixPulse(C1, at({ focus: 0.5 }), base)).toBeCloseTo(0.5, 9);
    expect(fixPulse(away, at({}), base)).toBe(0);
    expect(fixPulse(C1, at({ lamp: Lamp.Star }), base)).toBe(0);
    // A shell mote at the peak: FIX_PULSE.gain brighter and at least FIX_PULSE.warm toward the amber;
    // just before the pulse, its own light.
    const data = dataAt(AMBIENT_POSE);
    const a = motesOf(shells, C1)[5];
    const lit = bodyMote(a, at({}), data);
    const before = bodyMote(a, at({ fix: nodeLanded(c1.fixAt!) - 1e-6 }), data);
    expect(lit.brightness).toBeCloseTo(before.brightness * (1 + FIX_PULSE.gain), 9);
    expect(lit.warm).toBeCloseTo(FIX_PULSE.warm, 9);
    expect(before.warm).toBe(0);
  });
});

describe('the forced scatter (re-skin Task 8b)', () => {
  const C1 = bodyIndex(g, 'C1');
  const sys = motesOf(shells, C1)[0].sys;
  const healthy = g.bodies.find((b) => b.kind === 'planet' && !b.cracked)!.index;
  const cracked = g.bodies.filter((b) => b.cracked && b.kind === 'planet' && b.index !== C1).map((b) => b.index);

  it('is on only for the planet lamp’s subject planet that carries the defect, at focus over 0.5, and not under the freeze', () => {
    const rows = g.bodies.map((b) => b.index);
    for (const lamp of [Lamp.Off, Lamp.Planet, Lamp.Star, Lamp.Hood, Lamp.Core, Lamp.Lineage, Lamp.Arms])
      for (const on of [C1, healthy, cracked[0], g.bodies.find((b) => b.kind === 'moon' && b.host === C1)!.index])
        for (const focus of [0, 0.4, 0.5, 0.51, 1])
          for (const freeze of [{}, { forcedScatter: C1 }, { holding: true }, { forcedScatter: cracked[1] }]) {
            const c = clocks({ lamp, lampRow: on, focus, ...freeze });
            const subject = lamp === Lamp.Planet ? pieceOf(base, on) : -1;
            const want = subject >= 0 && g.bodies[subject].cracked && focus > 0.5 && !('forcedScatter' in freeze) && !('holding' in freeze) ? subject : -1;
            expect(focusScatterRow(c, base), `${Lamp[lamp]} on ${g.bodies[on].id} at ${focus}, ${JSON.stringify(freeze)}`).toBe(want);
            for (const row of rows) expect(focusScatter(row, c, base)).toBe(row === want);
          }
  });

  it('makes every slot of its planet a scatter, and leaves its moons their own scatters and every other body its own schedule', () => {
    const moon = g.bodies.find((b) => b.kind === 'moon' && b.host === C1)!.index;
    const c = (t: number) => clocks({ ambient: t, lamp: Lamp.Planet, lampRow: C1, focus: 1 });
    let scatters = 0;
    for (let i = 0; i < 400; i++) {
      const t = 0.11 + i * 0.37;
      const ev = derpEvent(byId('C1').derpSeed, f32(byId('C1').derpPhase), t, true);
      const d = bodyDerp(C1, sys, c(t), base);
      expect(d.scatterS).toBe(ev.active ? ev.s * 1 : -1);
      if (d.scatterS >= 0) scatters++;
      // A moon keeps its own schedule's scatters (its shell's); its orbit derp is held (focusDerp).
      expect(bodyDerp(moon, sys, c(t), base).scatterS).toBe(bodyDerp(moon, sys, clocks({ ambient: t }), base).scatterS);
      for (const row of cracked.slice(0, 3)) expect(bodyDerp(row, sys, c(t), base)).toEqual(bodyDerp(row, sys, clocks({ ambient: t }), base));
    }
    // A scatter in every slot: its event runs 1 s of every 2.2.
    expect(scatters / 400).toBeGreaterThan(0.4);
  });
});

describe('the terminator on the shells (re-skin §4.4)', () => {
  const T = 101;
  const data = dataAt(T);
  const C1 = byId('C1').index;
  /** Every landed lattice mote of `row` but its point (mote 0, drawn unshaded by shell.vert.glsl). */
  const landed = (row: number) => motesOf(shells, row).filter((a) => a.index > 0);
  /** Each mote's brightness over its terminator at `night`: one value across the body if the shading is exactly the terminator. */
  const ratios = (row: number, c: BodyClocks, night: number) =>
    landed(row).map((a) => {
      const o = bodyMote(a, c, data);
      return o.brightness / terminator(o.normal, lightDir(data, row, T), night);
    });
  const spread = (xs: number[]) => (Math.max(...xs) - Math.min(...xs)) / Math.max(...xs);

  it('shades a healthy planet’s and moon’s every shell mote by its terminator toward its own star, at the rest night', () => {
    const planet = g.bodies.find((b) => b.kind === 'planet' && !b.cracked && b.index !== C1)!;
    const moon = g.bodies.find((b) => b.kind === 'moon' && !b.cracked)!;
    for (const b of [planet, moon]) {
      const r = ratios(b.index, clocks({ ambient: T }), PLANET_LOOK.night.rest);
      expect(r.length, b.id).toBeGreaterThan(20);
      expect(spread(r), b.id).toBeLessThan(1e-9);
      // Not vacuous: the shell has a day side and a night side, PLANET_LOOK.night.rest apart.
      const raw = landed(b.index).map((a) => bodyMote(a, clocks({ ambient: T }), data).brightness);
      expect(Math.min(...raw) / Math.max(...raw), b.id).toBeCloseTo(PLANET_LOOK.night.rest, 6);
    }
  });

  it('keeps the planet lamp’s subject’s night at 0.5, its moons’ too, and every other body’s at 0.15', () => {
    const moon = g.bodies.find((b) => b.kind === 'moon' && b.planet === C1)!.index;
    const lamp = clocks({ ambient: T, lamp: Lamp.Planet, lampRow: C1, focus: 1 });
    expect(spread(ratios(C1, lamp, PLANET_LOOK.night.subject))).toBeLessThan(1e-9);
    expect(spread(ratios(moon, lamp, PLANET_LOOK.night.subject))).toBeLessThan(1e-9);
    // The same planet under any other lamp is at the rest night.
    expect(spread(ratios(C1, clocks({ ambient: T, lamp: Lamp.Star, lampRow: C1, focus: 1 }), PLANET_LOOK.night.rest))).toBeLessThan(1e-9);
  });

  it('leaves a lit body unshaded, and the person’s amber dust unshaded on every side', () => {
    const c2 = byId('C2');
    const lit = landed(c2.index).map((a) => bodyMote(a, clocks({ ambient: T, highlight: 0.5 }), data).brightness);
    expect(spread(lit)).toBeLessThan(1e-9);
    // The person's motes face every way round C2, its day side and its night side alike, and all land
    // as bright: they are the person's light, not the planet's.
    const L = lightDir(data, c2.index, T);
    const outs = motesOf(persons, c2.index).map((a) => bodyMote(a, clocks({ ambient: T, fix: 1 }), data));
    const facing = outs.map((o) => o.normal[0] * L[0] + o.normal[1] * L[1] + o.normal[2] * L[2]);
    expect(Math.min(...facing)).toBeLessThan(-PLANET_LOOK.edge);
    expect(Math.max(...facing)).toBeGreaterThan(PLANET_LOOK.edge);
    expect(spread(outs.map((o) => o.brightness))).toBeLessThan(1e-9);
  });
});
