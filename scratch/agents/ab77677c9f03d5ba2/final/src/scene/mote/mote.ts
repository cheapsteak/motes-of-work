// Reference implementation of mote(). The GLSL in mote.glsl mirrors this algorithm step for step;
// the parity page compares them. Only operations GLSL has are used. Hash salts come from SALT
// (src/math/salts.ts), which also generates the GLSL ones. Constants must stay in sync:
// TAU = 6.283185307179586 (drift phase and spawn azimuth), NORMAL_EPS = 1e-4 (normal blend fallback),
// SETTLE_WINDOW and SETTLED_BRIGHTNESS (MOTE_SETTLE_WINDOW / MOTE_SETTLED_BRIGHTNESS; mote.test.ts
// checks the GLSL declarations against these exports).
import { hash01 } from '../../math/hash';
import { SALT } from '../../math/salts';
import { applyToPoint, rotate, type PartTransform } from '../../math/transform';
import type { Vec3 } from '../../math/vec';
import type { SceneState } from '../../timeline/sceneState';
import { MoteType, type MoteAttrs } from './attributes';

const TAU = 6.283185307179586;
/** Below this length the blended normal has passed through zero; the correct normal is used. */
const NORMAL_EPS = 1e-4;
/** A mote settles as assembly rises through [settle - SETTLE_WINDOW, settle]. */
export const SETTLE_WINDOW = 0.12;
/** Brightness of a settled mote, as a fraction of its in-flight glow (lighting multiplies on top). */
export const SETTLED_BRIGHTNESS = 0.5;

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

export function mote(a: MoteAttrs, s: SceneState, xf: PartTransform[]): MoteOut {
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
  const rest: Vec3 = [
    rest0[0] + w * 0.6 * Math.sin(1.7 * rest0[1] + 1.3 * drive + TAU * h5),
    rest0[1] + w * 0.6 * Math.sin(1.9 * rest0[2] + 1.1 * drive + TAU * h6),
    rest0[2] + w * 0.6 * Math.sin(2.3 * rest0[0] + 0.9 * drive + TAU * h7),
  ];

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
  const normal: Vec3 = [nw[0] / nl, nw[1] / nl, nw[2] / nl];

  // 8. Outputs.
  return { pos, type: a.type[k], brightness: mix(1, SETTLED_BRIGHTNESS, t), visible: a.visible[k], settled: t, normal };
}
