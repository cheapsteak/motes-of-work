// 2D outlines and sampling helpers for the watch's parts: convex hulls of circles (bridges),
// crossings (spoked wheel windows), the club-toothed escape wheel and the pallet fork, and a tube
// sampler that pairs two curves point for point (hairspring ↔ worm).

import type { BufferGeometry } from 'three';
import type { Vec2, Vec3 } from '../../math/vec';
import { samplePart } from '../../shapes/sample';

/** One sampled point: correct-variant and wrong-twin positions and unit normals, all in part space. */
export interface ShapeSample {
  local: Vec3;
  localTwin: Vec3;
  normal: Vec3;
  normalTwin: Vec3;
}
export type Rng = () => number;
/** `count` points of one part, spread over its surface by area; deterministic for the rng's state. */
export type PartSampler = (count: number, rng: Rng) => ShapeSample[];

const polar = (r: number, a: number): Vec2 => [r * Math.cos(a), r * Math.sin(a)];

function unit(v: Vec3): Vec3 {
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

/** Build a part's geometry once, on first use (it is constant). */
export function lazy(make: () => BufferGeometry): () => BufferGeometry {
  let geom: BufferGeometry | undefined;
  return () => (geom ??= make());
}

/**
 * A part whose two variants are different solids with the same number of points. Both are sampled
 * by area; the points are then paired in order of a key (an angle about the arbor, say), so the
 * morph sweeps coherently instead of scattering.
 */
export function morph(
  correct: () => BufferGeometry,
  twin: () => BufferGeometry,
  key: (p: Vec3) => number,
  twinKey: (p: Vec3) => number = key,
): PartSampler {
  return (count, rng) => {
    const a = samplePart(correct(), count, rng);
    const b = samplePart(twin(), count, rng);
    const order = (ps: Vec3[], k: (p: Vec3) => number): number[] =>
      ps
        .map((p, i) => [k(p), i] as const)
        .sort((x, y) => x[0] - y[0] || x[1] - y[1])
        .map(([, i]) => i);
    const ia = order(a.positions, key);
    const ib = order(b.positions, twinKey);
    return ia.map((i, n) => ({
      local: a.positions[i],
      localTwin: b.positions[ib[n]],
      normal: unit(a.normals[i]),
      normalTwin: unit(b.normals[ib[n]]),
    }));
  };
}

export const angleKey = (p: Vec3): number => Math.atan2(p[1], p[0]);

/** Convex hull (Andrew's monotone chain), counter-clockwise. */
export function convexHull(points: Vec2[]): Vec2[] {
  const ps = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const turn = (o: Vec2, a: Vec2, b: Vec2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list: Vec2[]): Vec2[] => {
    const out: Vec2[] = [];
    for (const p of list) {
      while (out.length >= 2 && turn(out[out.length - 2], out[out.length - 1], p) <= 0) out.pop();
      out.push(p);
    }
    out.pop();
    return out;
  };
  return [...half(ps), ...half([...ps].reverse())];
}

/** The convex hull of circles [x, y, r]: a rounded, tapering bridge outline. */
export function hullOfCircles(circles: [number, number, number][], segments = 48): Vec2[] {
  const pts: Vec2[] = [];
  for (const [x, y, r] of circles) {
    for (let i = 0; i < segments; i++) {
      const [px, py] = polar(r, (i / segments) * Math.PI * 2);
      pts.push([x + px, y + py]);
    }
  }
  return convexHull(pts);
}

/**
 * The windows between `n` straight crossings (spokes) of half-width `hw`, from the hub at `rIn`
 * to the rim at `rOut`; the first crossing points along `phase`.
 */
export function crossingWindows(n: number, rIn: number, rOut: number, hw: number, phase = 0): Vec2[][] {
  const arcSteps = 12;
  const offset = (r: number) => Math.asin(Math.min(1, hw / r));
  return Array.from({ length: n }, (_, i) => {
    const a0 = phase + (i / n) * Math.PI * 2;
    const a1 = phase + ((i + 1) / n) * Math.PI * 2;
    const out: Vec2[] = [];
    for (let j = 0; j <= arcSteps; j++) {
      const from = a0 + offset(rOut);
      out.push(polar(rOut, from + ((a1 - offset(rOut) - from) * j) / arcSteps));
    }
    for (let j = 0; j <= arcSteps; j++) {
      const from = a1 - offset(rIn);
      out.push(polar(rIn, from + ((a0 + offset(rIn) - from) * j) / arcSteps));
    }
    return out;
  });
}

/**
 * Closed counter-clockwise outline of a Swiss club-toothed escape wheel that turns clockwise.
 * Tooth k's locking corner (the leading tip) sits at angle k * pitch on `lockRadius`; behind it
 * the club's impulse face slopes down to the heel, and the stem leans forward from the root.
 */
export function clubToothOutline(teeth: number, lockRadius: number, rootRadius: number): Vec2[] {
  const pitch = (Math.PI * 2) / teeth;
  const deg = pitch / 24; // tooth proportions drawn for a 15-tooth wheel (24 degree pitch)
  const R = lockRadius;
  const span = R - rootRadius;
  const out: Vec2[] = [];
  for (let k = 0; k < teeth; k++) {
    const c = k * pitch;
    out.push(polar(rootRadius, c + 5 * deg)); // foot of the locking face
    out.push(polar(rootRadius + 0.55 * span, c + 2.6 * deg));
    out.push(polar(R, c)); // locking corner
    out.push(polar(R - 0.03, c + 7 * deg)); // heel of the impulse face
    out.push(polar(R - 0.065, c + 8.5 * deg));
    out.push(polar(rootRadius + 0.35 * span, c + 11 * deg)); // the curved back of the stem
    out.push(polar(rootRadius, c + 14.5 * deg));
    for (const a of [17.5, 20.5, 23.5, 26.5]) out.push(polar(rootRadius, c + a * deg));
  }
  return out;
}

export interface ForkSpec {
  /** Pallet-arbor-local centres of the two pallet stones (exit at -y, entry at +y). */
  stones: [Vec2, Vec2];
  /** Distance of the impulse pin's centre (at rest) along +x. */
  pin: number;
  /** Arm half-width on the escape-wheel side (the inner side, toward the escape arbor). */
  armHalfWidth: number;
  /** Arm half-width on the outer side; defaults to armHalfWidth. Widening here never reaches the wheel. */
  armOuterHalfWidth?: number;
  leverHalfWidth: number;
}

/**
 * Outline of the pallet fork, its arbor on the origin and its lever along +x: the anchor's two
 * arms run from the arbor back to the stones, the lever forward to the notch and horns that take
 * the impulse pin.
 */
export function forkOutline({ stones, pin, armHalfWidth: w, armOuterHalfWidth, leverHalfWidth: lw }: ForkSpec): Vec2[] {
  const wo = armOuterHalfWidth ?? w;
  const notchIn = pin - 0.03;
  const hornEnd = pin + 0.06;
  const lever: Vec2[] = [
    [0.04, -lw],
    [notchIn - 0.06, -lw],
    [notchIn - 0.02, -0.065],
    [hornEnd, -0.065],
    [hornEnd, -0.03],
    [notchIn, -0.03],
    [notchIn, 0.03],
    [hornEnd, 0.03],
    [hornEnd, 0.065],
    [notchIn - 0.02, 0.065],
    [notchIn - 0.06, lw],
    [0.04, lw],
  ];
  // Upper (entry) arm; the lower arm mirrors it about the x axis.
  const s = stones[1];
  const len = Math.hypot(s[0], s[1]);
  const d: Vec2 = [s[0] / len, s[1] / len];
  const n: Vec2 = [d[1], -d[0]]; // the arm's outer side faces +x
  const along = (t: number, side: number): Vec2 => {
    const off = side > 0 ? wo : w;
    return [t * d[0] + side * off * n[0], t * d[1] + side * off * n[1]];
  };
  const t0 = (lw - wo * n[1]) / d[1];
  const tAxis = (w * n[1]) / d[1];
  const upper: Vec2[] = [along(t0, 1), along(len, 1), along(len, -1), along(tAxis, -1)];
  const mirror = (p: Vec2): Vec2 => [p[0], -p[1]];
  return [...lever, ...upper, mirror(upper[2]), mirror(upper[1]), mirror(upper[0])];
}

export interface Curve {
  point(t: number): Vec3;
  radius: number;
}

const ARC_TABLE = 2048;

/**
 * Round wire swept along two curves (t in [0, 1]), sampled by arc length on the first and paired
 * at the same (t, angle round the wire) on the second: the correct and twin wire morph along
 * their length. Normals point out of the wire.
 */
export function pairedTubes(a: Curve, b: Curve): PartSampler {
  const lengths = [0];
  for (let i = 1; i <= ARC_TABLE; i++) {
    const p = a.point((i - 1) / ARC_TABLE);
    const q = a.point(i / ARC_TABLE);
    lengths.push(lengths[i - 1] + Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]));
  }
  const total = lengths[ARC_TABLE];
  const tAt = (s: number): number => {
    let lo = 0;
    let hi = ARC_TABLE;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (lengths[mid] <= s) lo = mid;
      else hi = mid;
    }
    const span = lengths[hi] - lengths[lo];
    return (lo + (span > 0 ? (s - lengths[lo]) / span : 0)) / ARC_TABLE;
  };
  const onWire = (c: Curve, t: number, phi: number): [Vec3, Vec3] => {
    const h = 1e-4;
    const p = c.point(t);
    const ahead = c.point(Math.min(1, t + h));
    const behind = c.point(Math.max(0, t - h));
    const tangent = unit([ahead[0] - behind[0], ahead[1] - behind[1], ahead[2] - behind[2]]);
    const ref: Vec3 = Math.abs(tangent[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
    const dot = ref[0] * tangent[0] + ref[1] * tangent[1] + ref[2] * tangent[2];
    const n1 = unit([ref[0] - dot * tangent[0], ref[1] - dot * tangent[1], ref[2] - dot * tangent[2]]);
    const n2 = cross(tangent, n1);
    const normal = unit([
      Math.cos(phi) * n1[0] + Math.sin(phi) * n2[0],
      Math.cos(phi) * n1[1] + Math.sin(phi) * n2[1],
      Math.cos(phi) * n1[2] + Math.sin(phi) * n2[2],
    ]);
    return [[p[0] + c.radius * normal[0], p[1] + c.radius * normal[1], p[2] + c.radius * normal[2]], normal];
  };
  return (count, rng) =>
    Array.from({ length: Math.max(0, count) }, () => {
      const t = tAt(rng() * total);
      const phi = rng() * Math.PI * 2;
      const [local, normal] = onWire(a, t, phi);
      const [localTwin, normalTwin] = onWire(b, t, phi);
      return { local, localTwin, normal, normalTwin };
    });
}

/** A flat Archimedean spiral in the z = 0 plane, from `inner` to `outer` over `turns`. */
export function spiral(inner: number, outer: number, turns: number, wire: number): Curve {
  return {
    radius: wire,
    point: (t) => polar3(inner + (outer - inner) * t, turns * Math.PI * 2 * t, 0),
  };
}

/** A helix about z, centred on z = 0. */
export function helixCurve(radius: number, pitch: number, turns: number, wire: number): Curve {
  return {
    radius: wire,
    point: (t) => polar3(radius, turns * Math.PI * 2 * t, pitch * turns * (t - 0.5)),
  };
}

function polar3(r: number, a: number, z: number): Vec3 {
  return [r * Math.cos(a), r * Math.sin(a), z];
}
