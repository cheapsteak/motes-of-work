import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { MOTE_BUDGET_DESKTOP, MOTE_SEED } from '../config';
import { AMBIENT_GRID } from '../galaxy/ambient';
import { galaxyTier } from '../galaxy/background';
import { galaxyBudget, generateGalaxy, systemOuter, type Galaxy } from '../galaxy/generate';
import { BG_STAR_SIZE, bgStarPx, LEGIBLE_STAR_PX } from '../scene/galaxy/galaxySystem';
import { packBodyData } from '../scene/node/bodyData';
import { bodyPresence, lampGain } from '../scene/node/bodyMote';
import { detailPx, LOD_VISIBLE, LodElement, lodGain, MOON_POINT_PX, onScreen, systemPx } from '../scene/node/lod';
import { bodyWorld, galacticToWorld } from '../scene/node/orbit';
import { sectionSpans } from '../scroll/progress';
import { loadStory } from '../story/loader';
import { KeyframeSampler, type KeyframeFile } from './keyframeSampler';
import keyframes from './keyframes.json';
import { essayCamera, ZOOM_OUT } from './netShots';
import { Lamp, lampFocusRow } from './netTrack';
import type { SceneState } from './sceneState';

// The middle of the pull is never empty (Task 8 fix round 1, ruling C; script draft 4, zo-2: "More
// pieces come up near and far along the same curve; the curve shows itself as one arm of a spiral,
// then the other arms, then the whole"). From where the galaxy comes up (`net.show` above 0) to the
// galaxy wide, at both sizes and every AMBIENT_GRID pose, the frame holds at least as many things the
// reader can make out as the galaxy wide does, where the pull ends. A thing is:
//  - a piece the galaxy draws (a star, a core body or a planet: built, shown, lit by the lamp, at a
//    level of detail that draws it, its centre in the frame);
//  - a moon drawn as a sphere, not a point (its disc at least MOON_POINT_PX[0] across, lod.ts): a
//    moon's point beside its planet reads as the planet's, not as another thing;
//  - the bike's planet and moons while its own motes draw them (stage.motes above 0, the reflow under
//    way), by the same rules;
//  - a background star whose sprite reads as a star there, not a speck (LEGIBLE_STAR_PX).
// Before the galaxy comes up the frame is the bike (clearance.spec.ts, reflow.test.ts).

const SIZES = [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
] as const;

const spans = sectionSpans(loadStory());
const sampler = new KeyframeSampler(keyframes as unknown as KeyframeFile, spans);
const zoomOut = spans.find((x) => x.id === 'zoom-out')!;
const at = (l: number): SceneState => sampler.sample(zoomOut.start + l * (zoomOut.end - zoomOut.start));

const galaxies = new Map<string, Galaxy>();
/** The essay's galaxy for a screen's tier: the same bodies, the tier's background. */
function galaxyFor(size: { width: number; height: number }): Galaxy {
  const tier = galaxyTier(size.width, size.height);
  if (!galaxies.has(tier)) galaxies.set(tier, generateGalaxy(MOTE_SEED, tier, galaxyBudget(MOTE_BUDGET_DESKTOP)));
  return galaxies.get(tier)!;
}
const desktop = galaxyFor(SIZES[1]);
const data = packBodyData(desktop);
const n0 = desktop.bodies[data.n0Row];

interface Frame {
  /** Stars, core bodies and planets drawn in the frame. */
  pieces: number;
  /** Moons drawn as spheres in the frame. */
  spheres: number;
  /** Background stars legible in the frame. */
  stars: number;
}
const things = (f: Frame): number => f.pieces + f.spheres + f.stars;

/** What the frame at state `s` holds on a screen of `size` at ambient `t`. */
function inFrame(s: SceneState, size: { width: number; height: number }, t: number): Frame {
  if (s.net.show <= 0) return { pieces: 0, spheres: 0, stars: 0 };
  const g = galaxyFor(size);
  const camera = essayCamera(s.camera, desktop, data, size, t);
  camera.updateMatrixWorld();
  const eye = camera.getWorldPosition(new Vector3());
  const focal = 0.5 * size.height * camera.projectionMatrix.elements[5];
  const project = (p: readonly number[]) => {
    const v = new Vector3(p[0], p[1], p[2]);
    const d = v.distanceTo(eye);
    v.project(camera);
    return { x: ((v.x + 1) / 2) * size.width, y: ((1 - v.y) / 2) * size.height, d, front: v.z > -1 && v.z < 1 };
  };
  const inside = (c: { x: number; y: number; front: boolean }) =>
    c.front && c.x >= 0 && c.x <= size.width && c.y >= 0 && c.y <= size.height;
  // Each system's size on screen as the body system holds it (bodySystem.ts: detailPx over systemPx).
  const raw = desktop.systems.map((row) => {
    const c = project(bodyWorld(data, row, t));
    if (!c.front) return 0;
    const px = systemPx(systemOuter(desktop, row), c.d, focal);
    return px * onScreen(c.x, c.y, px, size.width, size.height);
  });
  const sysPx = detailPx(raw);
  const clocks = { lamp: Math.round(s.net.lamp), lampRow: lampFocusRow(s.net.lampAt, desktop), focus: s.net.focus };
  // The bike's own motes draw its planet and its moons while they show and the reflow carries them there.
  const bike = s.stage.motes > 0 && s.mech.reflow > 0;
  const frame: Frame = { pieces: 0, spheres: 0, stars: 0 };
  for (const b of desktop.bodies) {
    const ofBike = bike && (b === n0 || (b.kind === 'moon' && b.host === n0.index));
    if (!ofBike) {
      if (bodyPresence(b.index, s.net.growth, data) * lampGain(b.index, clocks, data) * s.net.show < LOD_VISIBLE) continue;
      const sys = b.star >= 0 ? desktop.systems.indexOf(b.star) : -1;
      const level = b.kind === 'planet' ? LodElement.PlanetPoint : b.kind === 'moon' ? LodElement.Moon : null;
      if (level !== null && lodGain(level, sysPx[sys]) < LOD_VISIBLE) continue;
    }
    const c = project(bodyWorld(data, b.index, t));
    if (!inside(c)) continue;
    if (b.kind !== 'moon') frame.pieces++;
    else if ((2 * b.R * focal) / c.d >= MOON_POINT_PX[0]) frame.spheres++;
  }
  for (const [set, points] of [
    ['star', g.background.stars],
    ['bright', g.background.bright],
  ] as const) {
    for (let k = 0; k < points.length; k += 4) {
      const c = project(galacticToWorld(data, [points[k], points[k + 1], points[k + 2]], t));
      if (inside(c) && bgStarPx(set, focal / c.d) >= LEGIBLE_STAR_PX) frame.stars++;
    }
  }
  return frame;
}

/** The least of `value` over both screens and every pose. */
const least = (l: number, value: (f: Frame) => number): number => {
  const s = at(l);
  return Math.min(...SIZES.flatMap((size) => AMBIENT_GRID.map((t) => value(inFrame(s, size, t)))));
};

const SAMPLES = Array.from({ length: 141 }, (_, i) => 0.3 + (0.7 * i) / 140).filter((l) => at(l).net.show > 0);

describe('the middle of the zoom-out is never empty (fix round 1, ruling C)', () => {
  /**
   * The floor: what the galaxy wide holds, where the pull ends (its built stars and core bodies; its
   * planets are under their point's band there, and its background is the crisp far points §4 keeps
   * apart, which the count leaves out). No frame on the way is emptier than the frame it ends on.
   */
  const FLOOR = least(1, things);

  it('the floor is the galaxy wide’s, and is not nothing: its built stars and core bodies', () => {
    expect(FLOOR).toBeGreaterThanOrEqual(7);
    expect(least(1, (f) => f.stars)).toBe(0);
  }, 60_000);

  it('holds at least the floor of things in the frame from where the galaxy comes up to the galaxy wide, at both sizes and every pose', () => {
    let worst = { n: Infinity, where: '' };
    for (const l of SAMPLES) {
      const s = at(l);
      for (const size of SIZES) {
        for (const t of AMBIENT_GRID) {
          const f = inFrame(s, size, t);
          if (things(f) < worst.n) worst = { n: things(f), where: `zoom-out@${l.toFixed(3)} ${size.width} at ${t}: ${JSON.stringify(f)}` };
        }
      }
    }
    expect(worst.n, worst.where).toBeGreaterThanOrEqual(FLOOR);
  }, 300_000);

  it('is the arms coming up, not only the sky: two or more lit pieces in every frame from the arms’ light to the hub’s, more of them as it goes', () => {
    const [arms, hood] = [ZOOM_OUT.lamp.find((x) => x.lamp === Lamp.Arms)!.at, ZOOM_OUT.lamp.find((x) => x.lamp === Lamp.Hood)!.at];
    // The arms light as the bike's star starts to come up; it is drawn a fortieth of the pull later.
    for (const l of SAMPLES.filter((x) => x >= arms + 0.025 && x <= hood))
      expect(
        least(l, (f) => f.pieces),
        `zoom-out@${l.toFixed(3)}`,
      ).toBeGreaterThanOrEqual(2);
    expect(least(0.8, (f) => f.pieces)).toBeGreaterThan(least(0.6, (f) => f.pieces));
  }, 300_000);

  it('the background reads as stars at the middle distances and as crisp points from afar', () => {
    // Far: the galaxy wide's 640 on a desktop, about 1.5 px a unit, keeps every star at HALO_PX (§4).
    expect([bgStarPx('star', 1.6), bgStarPx('bright', 1.6)]).toEqual([BG_STAR_SIZE.star.px[0], BG_STAR_SIZE.bright.px[0]]);
    // The middle: the pull at about 100 units, about 6 px a unit on a phone, is past legibility.
    expect(bgStarPx('star', 6)).toBeGreaterThanOrEqual(LEGIBLE_STAR_PX);
    expect(BG_STAR_SIZE.star.px[0]).toBeLessThan(LEGIBLE_STAR_PX);
    expect(BG_STAR_SIZE.bright.px[0]).toBeLessThan(LEGIBLE_STAR_PX);
  });
});
