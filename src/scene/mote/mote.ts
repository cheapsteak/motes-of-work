// Reference implementation of mote(). The GLSL in mote.glsl mirrors this algorithm step for step;
// the parity page compares them. Only operations GLSL has are used. Hash salts come from SALT
// (src/math/salts.ts), which also generates the GLSL ones. Constants must stay in sync:
// TAU = 6.283185307179586 (drift phase and spawn azimuth), NORMAL_EPS = 1e-4 (normal blend fallback),
// SETTLE_WINDOW, SETTLED_BRIGHTNESS, FLARE_WIDTH and FLARE_GAIN (settle.ts; MOTE_SETTLE_WINDOW,
// MOTE_SETTLED_BRIGHTNESS, MOTE_FLARE_WIDTH and MOTE_FLARE_GAIN in GLSL), and REFLOW_LAST and
// REFLOW_DELAY (MOTE_REFLOW_LAST and MOTE_REFLOW_DELAY in GLSL); mote.test.ts checks the GLSL
// declarations against these exports. The reflow (Act II, docs/specs/2026-10-07-galaxy-orbits.md
// §14.3) carries every mote onto the sphere of its part's group: the bike's planet N0 or one of its
// seven moons, where they are at the frame's ambient (`ReflowHome`, from reflowBodies; the GLSL's
// uBodies[8], and its part texture's fourth channel for the group).
import { hash01 } from '../../math/hash';
import { SALT } from '../../math/salts';
import { applyToPoint, rotate, type PartTransform } from '../../math/transform';
import type { Vec3 } from '../../math/vec';
import type { Galaxy } from '../../galaxy/generate';
import type { BodyData } from '../node/bodyData';
import { bodyWorld } from '../node/orbit';
import type { SceneState } from '../../timeline/sceneState';
import { MoteType, type MoteAttrs } from './attributes';
import { FLARE_GAIN, FLARE_WIDTH, SETTLE_WINDOW, SETTLED_BRIGHTNESS } from './settle';

export { FLARE_GAIN, FLARE_WIDTH, SETTLE_WINDOW, SETTLED_BRIGHTNESS };

const TAU = 6.283185307179586;
/** Below this length the blended normal has passed through zero; the correct normal is used. */
const NORMAL_EPS = 1e-4;

export interface MoteOut {
  pos: Vec3;
  type: MoteType;
  brightness: number;
  visible: boolean;
  settled: number;
  /** Unit surface normal in world space: the variant blend of the part-space normals, posed. */
  normal: Vec3;
}

// GLSL semantics.
const clamp = (x: number, lo: number, hi: number): number => Math.min(Math.max(x, lo), hi);
const mix = (a: number, b: number, t: number): number => a * (1 - t) + b * t;
function smoothstep(e0: number, e1: number, x: number): number {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}
function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

/** Where a mote sits when fully exploded: uniform direction on a flattened shell. */
export function spawnPoint(seed: number): Vec3 {
  const z = 2 * hash01(seed, SALT.spawnZ) - 1;
  const a = TAU * hash01(seed, SALT.spawnAzimuth);
  const r = Math.sqrt(1 - z * z);
  const radius = 9 + 3 * hash01(seed, SALT.spawnRadius);
  return [r * Math.cos(a) * radius, r * Math.sin(a) * radius * 0.6, z * radius];
}

/** A body as the reflow reads it: its centre (x, y, z) and its radius. */
export type Vec4 = [number, number, number, number];

/** The basket's group: the part Act I drops in from above lands last (galaxy §14.3). */
export const REFLOW_LAST = 6;
/** The basket's window starts this far into the reflow, and every other group's ends this far before its end. */
export const REFLOW_DELAY = 0.15;

/**
 * Where the reflow carries the motes: the eight bodies (`bodies[g]`, centre and radius), each part's
 * group, and each group's share of its motes that stay lit once landed (`keep[g]`, reflowKeep).
 */
export interface ReflowHome {
  bodies: readonly Vec4[];
  groups: readonly number[];
  keep: readonly number[];
}

/** How many of `motes` fall in each of the eight part groups, by their part's group (`groups`, mechanisms/bike/partGroups.ts). */
export function groupCounts(groups: readonly number[], motes: readonly { part: number }[]): number[] {
  const counts = new Array<number>(8).fill(0);
  for (const m of motes) counts[groups[m.part]]++;
  return counts;
}

/**
 * A moon lands at most this share of the planet's density of motes on its sphere: at equal density a
 * moon still reads up to 17 % brighter than the planet on screen (it stands nearer the camera, and its
 * small disc takes more of each mote's sprite; measured worst at zoom-out 0.25 on a desktop,
 * e2e/reflow.spec.ts), and this keeps it under the planet with room.
 */
export const REFLOW_MOON_DENSITY = 0.75;

/**
 * Each group's share of its motes that stay lit once landed (fix round 1, ruling B): a small moon takes
 * the motes of its whole part, many more to its area than the planet's sphere takes of the frame's, so
 * left alone it piles up into a white blot brighter than the planet. A moon whose motes would stand
 * denser on its sphere (`counts[g] / R²`) than REFLOW_MOON_DENSITY of the planet's keeps just enough of
 * them to stand at that; the planet, and any moon no denser, keeps all.
 */
export function reflowKeep(bodies: readonly Vec4[], counts: readonly number[]): number[] {
  const density = (g: number) => counts[g] / (bodies[g][3] * bodies[g][3]);
  return bodies.map((_, g) => (g === 0 || counts[g] === 0 ? 1 : Math.min(1, (REFLOW_MOON_DENSITY * density(0)) / density(g))));
}

/**
 * The reflow's bodies at ambient `t`: N0 (the world's origin) and its seven moons by part group,
 * where the galaxy draws them, each with its radius. What uBodies holds each frame.
 */
export function reflowBodies(g: Galaxy, data: BodyData, t: number): Vec4[] {
  const n0 = g.bodies[data.n0Row];
  return Array.from({ length: 8 }, (_, k): Vec4 => {
    const b = k === 0 ? n0 : g.bodies.find((m) => m.host === n0.index && m.partGroup === k);
    if (!b) throw new Error(`reflowBodies: N0 has no moon for part group ${k}`);
    const p = bodyWorld(data, b.index, t);
    return [p[0], p[1], p[2], b.R];
  });
}

/**
 * A mote's second home (Act II's reflow): a lattice-free uniform point on the unit sphere, from its
 * seed alone (a height and an azimuth). The mote lands at its body's centre plus the body's radius
 * times this, and this is its normal there.
 */
export function moteBodyRest(seed: number): Vec3 {
  const z = 2 * hash01(seed, SALT.bodyZ) - 1;
  const a = TAU * hash01(seed, SALT.bodyAzimuth);
  const r = Math.sqrt(1 - z * z);
  return [r * Math.cos(a), z, r * Math.sin(a)];
}

/** How far along its own window a mote of group `g` is at `reflow` (0..1): the basket's starts REFLOW_DELAY late. */
export function groupReflow(g: number, reflow: number): number {
  return clamp((g === REFLOW_LAST ? reflow - REFLOW_DELAY : reflow) / (1 - REFLOW_DELAY), 0, 1);
}

/**
 * A mote at state `s`, its machine posed by `xf`. `home` is where the reflow carries it: needed only
 * while `s.mech.reflow` is above 0.
 */
export function mote(a: MoteAttrs, s: SceneState, xf: PartTransform[], home?: ReflowHome): MoteOut {
  const seed = a.seed;
  const { assembly, variant, drive } = s.mech;

  // 1. Scenario: 0 specced, 1 vibed, 2 misallocated.
  const u = hash01(seed, SALT.scenario);
  const v = clamp(s.provenance.vibed, 0, 1);
  const m = clamp(s.provenance.misallocated, 0, 1 - v);
  const k = u < v ? 1 : u < v + m ? 2 : 0;

  // 2. Rest position in world space.
  const lp: Vec3 = [
    mix(a.local[0], a.localTwin[0], variant),
    mix(a.local[1], a.localTwin[1], variant),
    mix(a.local[2], a.localTwin[2], variant),
  ];
  const rest0 = applyToPoint(xf[a.part], lp);

  // 3. Drift (right-hand side uses the pre-drift rest).
  const w = s.mech.faults.drift * (a.role === 2 ? 1 : 0.25);
  const h5 = hash01(seed, SALT.driftX);
  const h6 = hash01(seed, SALT.driftY);
  const h7 = hash01(seed, SALT.driftZ);
  let rest: Vec3 = [
    rest0[0] + w * 0.6 * Math.sin(1.7 * rest0[1] + 1.3 * drive + TAU * h5),
    rest0[1] + w * 0.6 * Math.sin(1.9 * rest0[2] + 1.1 * drive + TAU * h6),
    rest0[2] + w * 0.6 * Math.sin(2.3 * rest0[0] + 0.9 * drive + TAU * h7),
  ];

  // 3b. The reflow (Act II): the mote's second home is a point on its part group's body, the planet
  // or a moon, wherever that is at the frame's ambient. A pure blend of the posed, drifted rest toward
  // it, along a bow that puffs outward first, over the group's own window; at its end it is the point
  // on the sphere exactly, whatever the machine does. At 0 nothing here runs.
  const reflow = clamp(s.mech.reflow, 0, 1);
  let er = 0;
  let homeNormal: Vec3 = [0, 0, 0];
  // A mote its group does not keep (reflowKeep) dims to nothing as it lands: what is left lit is the planet's density.
  let keepGain = 1;
  if (reflow > 0) {
    if (!home) throw new Error('mote: the reflow needs its home (reflowBodies, partGroups)');
    const g = home.groups[a.part];
    const body = home.bodies[g];
    const n = moteBodyRest(seed);
    const target: Vec3 = [body[0] + body[3] * n[0], body[1] + body[3] * n[1], body[2] + body[3] * n[2]];
    const rg = groupReflow(g, reflow);
    er = 1 - (1 - rg) * (1 - rg) * (1 - rg);
    const rl = Math.hypot(rest[0], rest[1], rest[2]);
    const outward: Vec3 = rl > 1e-6 ? [rest[0] / rl, rest[1] / rl, rest[2] / rl] : [0, 1, 0];
    // Sideways off the chord from the rest to the home, as step 6 bows the flight.
    let rside = cross([target[0] - rest[0], target[1] - rest[1], target[2] - rest[2]], [0, 1, 0]);
    if (Math.hypot(rside[0], rside[1], rside[2]) < 1e-6) rside = [1, 0, 0];
    const rsl = Math.hypot(rside[0], rside[1], rside[2]);
    const rsc = 0.4 * (hash01(seed, SALT.bezierSide) - 0.5);
    const cr: Vec3 = [0, 1, 2].map(
      (k) => 0.5 * (rest[k] + target[k]) + 0.8 * outward[k] + (rsc * rside[k]) / rsl,
    ) as Vec3;
    const omr = 1 - er;
    rest = [0, 1, 2].map((k) => omr * omr * rest[k] + 2 * omr * er * cr[k] + er * er * target[k]) as Vec3;
    homeNormal = n;
    keepGain = mix(1, hash01(seed, SALT.bodyKeep) < home.keep[g] ? 1 : 0, er);
  }

  // 4. Settle progress.
  const t = smoothstep(a.settle - SETTLE_WINDOW, a.settle, assembly);
  const e = 1 - (1 - t) * (1 - t) * (1 - t);

  // 5. Spawn point.
  const spawn = spawnPoint(seed);

  // 6. Quadratic Bezier from spawn to rest through a sideways control point.
  const d: Vec3 = [rest[0] - spawn[0], rest[1] - spawn[1], rest[2] - spawn[2]];
  let side = cross(d, [0, 1, 0]);
  if (Math.hypot(side[0], side[1], side[2]) < 1e-6) side = [1, 0, 0];
  const sl = Math.hypot(side[0], side[1], side[2]);
  const h12 = hash01(seed, SALT.bezierSide);
  const sc = 2 * (h12 - 0.5);
  const c: Vec3 = [
    (spawn[0] + rest[0]) / 2 + (sc * side[0]) / sl,
    (spawn[1] + rest[1]) / 2 + (sc * side[1]) / sl,
    (spawn[2] + rest[2]) / 2 + (sc * side[2]) / sl,
  ];
  const om = 1 - e;
  const pos: Vec3 = [
    om * om * spawn[0] + 2 * om * e * c[0] + e * e * rest[0],
    om * om * spawn[1] + 2 * om * e * c[1] + e * e * rest[1],
    om * om * spawn[2] + 2 * om * e * c[2] + e * e * rest[2],
  ];

  // 7. Surface normal: blend the variants; where the blend passes through zero (normals pointing
  // opposite ways) fall back to the correct normal, then pose it with the part rotation.
  const nm: Vec3 = [
    mix(a.normal[0], a.normalTwin[0], variant),
    mix(a.normal[1], a.normalTwin[1], variant),
    mix(a.normal[2], a.normalTwin[2], variant),
  ];
  const n0 = Math.hypot(nm[0], nm[1], nm[2]) < NORMAL_EPS ? a.normal : nm;
  const nw = rotate(xf[a.part].quaternion, n0);
  const nl = Math.hypot(nw[0], nw[1], nw[2]);
  let normal: Vec3 = [nw[0] / nl, nw[1] / nl, nw[2] / nl];
  // The reflow turns it toward its sphere's radial normal; where the blend passes through zero, the radial one.
  if (reflow > 0) {
    const nb: Vec3 = [mix(normal[0], homeNormal[0], er), mix(normal[1], homeNormal[1], er), mix(normal[2], homeNormal[2], er)];
    const bl = Math.hypot(nb[0], nb[1], nb[2]);
    const hn = bl < NORMAL_EPS ? homeNormal : nb;
    const hl = Math.hypot(hn[0], hn[1], hn[2]);
    normal = [hn[0] / hl, hn[1] / hl, hn[2] / hl];
  }

  // 8. Outputs. The landing flare: brightest the instant the mote lands, gone FLARE_WIDTH either side.
  const flare = 1 - smoothstep(0, FLARE_WIDTH, Math.abs(assembly - a.settle));
  const brightness = (mix(1, SETTLED_BRIGHTNESS, t) + FLARE_GAIN * flare) * keepGain;
  return { pos, type: a.type[k], brightness, visible: a.visible[k], settled: t, normal };
}
