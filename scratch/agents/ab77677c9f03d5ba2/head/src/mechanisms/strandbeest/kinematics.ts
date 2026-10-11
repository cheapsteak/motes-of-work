// Planar kinematics of one Jansen leg, in Jansen's own units (the crank throw is 15).
//
// The link lengths are the published "holy numbers" (Wikipedia, "Jansen's linkage"; numbers only).
// Frame: the crank axle O at the origin, y up; the leg hangs off a fixed frame pivot A that sits
// `a` to the side of O and `l` below it. A leg reaches toward −x (A = (−a, −l)); its mirror twin on
// the other side of the crank is the same solve reflected in x (see `solveMirrored`).
//
// Joints (names used throughout the module):
//   C      crank pin, m from O
//   top    upper rocker joint: j from C, b from A
//   low    lower rocker joint (the "hip" of the foot triangle): k from C, c from A
//   outer  far corner of the rigid upper triangle A–top–outer: d from A, e from top
//   knee   f from outer, g from low; low–knee is a side of the rigid foot triangle
//   foot   the foot triangle's third corner: i from low, h from knee
// The two rigid triangles are placed by rotating their reference shape, so only three joints (top,
// low, knee) need a circle–circle intersection. Each takes one fixed branch (a side of the line
// between its two centres) for the whole cycle, so the solve never flips between assembly modes.

export type P2 = [number, number];

export interface Lengths {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
  g: number;
  h: number;
  i: number;
  j: number;
  k: number;
  l: number;
  m: number;
}

/** Jansen's published link lengths (Wikipedia, "Jansen's linkage"). */
export const JANSEN: Readonly<Lengths> = Object.freeze({
  a: 38,
  b: 41.5,
  c: 39.3,
  d: 40.1,
  e: 55.8,
  f: 39.4,
  g: 36.7,
  h: 65.7,
  i: 49,
  j: 50,
  k: 61.9,
  l: 7.8,
  m: 15.0,
});

/**
 * The wrong twin: the same bars at confident but wrong lengths (upper rocker b, upper triangle e,
 * the foot triangle's top g and the upper crank link j each off by 6–16%). Every joint still
 * solves through the whole cycle, and at every stage of the morph from JANSEN, but the foot path
 * loses its flat bottom (kinematics.test.ts measures both).
 */
export const TWIN: Readonly<Lengths> = Object.freeze({
  ...JANSEN,
  b: 46.6,
  e: 47,
  g: 42.3,
  j: 43.8,
});

export const LENGTH_KEYS = Object.keys(JANSEN) as (keyof Lengths)[];

export function lerpLengths(p: Lengths, q: Lengths, t: number): Lengths {
  const out = {} as Lengths;
  for (const key of LENGTH_KEYS) out[key] = p[key] + (q[key] - p[key]) * t;
  return out;
}

/** Which side of the directed line centre0 → centre1 a joint lies on: +1 left, −1 right. */
export type Side = 1 | -1;

export interface Intersection {
  p: P2;
  /** True when the circles do not meet and `p` is the clamped, nearest reachable point. */
  clamped: boolean;
}

/**
 * The point at distance r0 from c0 and r1 from c1 on `side` of the line c0 → c1. When the circles
 * do not meet (too far apart, or one inside the other) it returns the point of circle 0 nearest to
 * circle 1, so the link from c0 keeps its length and the one from c1 misses by the least it can:
 * never NaN. Coincident centres pick an arbitrary (finite) point of circle 0.
 */
export function intersectCircles(c0: P2, r0: number, c1: P2, r1: number, side: Side): Intersection {
  const dx = c1[0] - c0[0];
  const dy = c1[1] - c0[1];
  const d = Math.hypot(dx, dy);
  if (!(d > 1e-12)) return { p: [c0[0] + r0, c0[1]], clamped: true };
  const ux = dx / d;
  const uy = dy / d;
  let along = (d * d + r0 * r0 - r1 * r1) / (2 * d);
  let clamped = false;
  if (along > r0) {
    along = r0;
    clamped = true;
  } else if (along < -r0) {
    along = -r0;
    clamped = true;
  }
  const h = side * Math.sqrt(Math.max(0, r0 * r0 - along * along));
  return {
    p: [c0[0] + along * ux - h * uy, c0[1] + along * uy + h * ux],
    clamped,
  };
}

/** Angle of the vector p → q. */
export const heading = (p: P2, q: P2): number => Math.atan2(q[1] - p[1], q[0] - p[0]);

/** `v` (given in a frame whose x axis has heading `angle`) placed at `origin`. */
export function place(origin: P2, angle: number, v: P2): P2 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [origin[0] + v[0] * c - v[1] * s, origin[1] + v[0] * s + v[1] * c];
}

/**
 * Third corner of a triangle with corner 0 at the origin and corner 1 at (r01, 0): r02 from corner
 * 0 and r12 from corner 1, on `side` of the x axis. Clamped like `intersectCircles`.
 */
export function triangleCorner(r01: number, r02: number, r12: number, side: Side): P2 {
  return intersectCircles([0, 0], r02, [r01, 0], r12, side).p;
}

/** The leg's fixed branch choices (sides of the line between each joint's two centres). */
export const BRANCH = {
  /** top: right of C → A, above the crank–pivot line. */
  top: -1 as Side,
  /** low: left of C → A, below it. */
  low: 1 as Side,
  /** outer: left of A → top, away from the crank. */
  outer: 1 as Side,
  /** knee: left of low → outer, out and down. */
  knee: 1 as Side,
  /** foot: left of low → knee, below the hip. */
  foot: 1 as Side,
} as const;

/** The two rigid triangles' third corners in their own frames (corner 0 at origin, corner 1 on +x). */
export interface TriangleShapes {
  /** Upper triangle: A at origin, top at (b, 0); `outer` here (d from A, e from top). */
  outer: P2;
  /** Foot triangle: low at origin, knee at (g, 0); `foot` here (i from low, h from knee). */
  foot: P2;
}

export function triangleShapes(L: Lengths): TriangleShapes {
  return {
    outer: triangleCorner(L.b, L.d, L.e, BRANCH.outer),
    foot: triangleCorner(L.g, L.i, L.h, BRANCH.foot),
  };
}

export interface LegJoints {
  O: P2;
  A: P2;
  C: P2;
  top: P2;
  low: P2;
  outer: P2;
  knee: P2;
  foot: P2;
  /** How many of the three intersections had to clamp (0 for a healthy linkage). */
  clamped: number;
}

/**
 * Solve one leg (reaching toward −x) at crank angle `theta` (radians, counter-clockwise from +x).
 * `shapes` defaults to the rigid triangles of `L`; pass the shapes of the drawn parts when the
 * lengths the solve uses differ from the parts' (a fault), so the triangles stay the parts' shapes.
 */
export function solveLeg(theta: number, L: Lengths, shapes: TriangleShapes = triangleShapes(L)): LegJoints {
  const O: P2 = [0, 0];
  const A: P2 = [-L.a, -L.l];
  const C: P2 = [L.m * Math.cos(theta), L.m * Math.sin(theta)];
  const top = intersectCircles(C, L.j, A, L.b, BRANCH.top);
  const low = intersectCircles(C, L.k, A, L.c, BRANCH.low);
  const outer = place(A, heading(A, top.p), shapes.outer);
  // The knee: g from low (the foot triangle's own side, so it keeps its length) and f from outer.
  const knee = intersectCircles(low.p, L.g, outer, L.f, BRANCH.knee);
  const foot = place(low.p, heading(low.p, knee.p), shapes.foot);
  return {
    O,
    A,
    C,
    top: top.p,
    low: low.p,
    outer,
    knee: knee.p,
    foot,
    clamped: Number(top.clamped) + Number(low.clamped) + Number(knee.clamped),
  };
}

/** Reflect a point in the y axis. */
export const mirrorX = (p: P2): P2 => [-p[0], p[1]];

/**
 * The mirror leg on the same crank pin, reaching toward +x. Reflecting the crank pin at `theta`
 * gives the pin at π − theta, so the mirror leg is the reflection of the plain solve there. A crank
 * turning one way drives both legs' feet backward along the ground together (they push the same way).
 */
export function solveMirrored(theta: number, L: Lengths, shapes?: TriangleShapes): LegJoints {
  const j = solveLeg(Math.PI - theta, L, shapes);
  return {
    O: mirrorX(j.O),
    A: mirrorX(j.A),
    C: mirrorX(j.C),
    top: mirrorX(j.top),
    low: mirrorX(j.low),
    outer: mirrorX(j.outer),
    knee: mirrorX(j.knee),
    foot: mirrorX(j.foot),
    clamped: j.clamped,
  };
}

/** Foot positions over one crank turn, `n` evenly spaced samples. */
export function footPath(L: Lengths, n = 360): P2[] {
  return Array.from({ length: n }, (_, s) => solveLeg((s / n) * Math.PI * 2, L).foot);
}

/**
 * Flatness of the ground stroke: over the third of the cycle with the lowest foot, the foot's
 * vertical spread (max − min y), relative to the path's horizontal stride (max − min x).
 * A Jansen foot is almost flat there; a flailing one is not.
 */
export function groundFlatness(path: P2[]): number {
  const n = path.length;
  const w = Math.max(1, Math.round(n / 3));
  // The window of w consecutive samples (cyclic) whose highest point is lowest: the ground stroke.
  let best = Infinity;
  for (let s = 0; s < n; s++) {
    let hi = -Infinity;
    let lo = Infinity;
    for (let t = 0; t < w; t++) {
      const y = path[(s + t) % n][1];
      hi = Math.max(hi, y);
      lo = Math.min(lo, y);
    }
    best = Math.min(best, hi - lo);
  }
  const xs = path.map((p) => p[0]);
  return best / (Math.max(...xs) - Math.min(...xs));
}
