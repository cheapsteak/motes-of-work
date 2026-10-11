import { describe, expect, it } from 'vitest';
import {
  BRANCH,
  footPath,
  groundFlatness,
  intersectCircles,
  JANSEN,
  lerpLengths,
  solveLeg,
  solveMirrored,
  TWIN,
  type LegJoints,
  type Lengths,
  type P2,
} from './kinematics';

const TAU = Math.PI * 2;
const dist = (p: P2, q: P2): number => Math.hypot(p[0] - q[0], p[1] - q[1]);
/** z of (q − p) × (r − p): positive when r is left of p → q. */
const cross = (p: P2, q: P2, r: P2): number => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
const cycle = (n: number): number[] => Array.from({ length: n }, (_, i) => (i / n) * TAU);

/** Every link of the leg, as the pair of joints it spans and its length. */
function links(j: LegJoints, L: Lengths): [P2, P2, number, string][] {
  return [
    [j.O, j.C, L.m, 'm'],
    [j.C, j.top, L.j, 'j'],
    [j.A, j.top, L.b, 'b'],
    [j.C, j.low, L.k, 'k'],
    [j.A, j.low, L.c, 'c'],
    [j.A, j.outer, L.d, 'd'],
    [j.top, j.outer, L.e, 'e'],
    [j.outer, j.knee, L.f, 'f'],
    [j.low, j.knee, L.g, 'g'],
    [j.knee, j.foot, L.h, 'h'],
    [j.low, j.foot, L.i, 'i'],
  ];
}

describe('intersectCircles', () => {
  it('meets both circles on the requested side', () => {
    for (const side of [1, -1] as const) {
      const { p, clamped } = intersectCircles([1, 2], 5, [7, 3], 4, side);
      expect(clamped).toBe(false);
      expect(dist(p, [1, 2])).toBeCloseTo(5, 12);
      expect(dist(p, [7, 3])).toBeCloseTo(4, 12);
      expect(Math.sign(cross([1, 2], [7, 3], p))).toBe(side);
    }
  });

  it.each([
    ['too far apart', [0, 0], 3, [10, 0], 4, [3, 0]],
    ['circle 1 inside circle 0', [0, 0], 10, [2, 0], 3, [10, 0]],
    ['circle 0 inside circle 1', [0, 0], 2, [1, 0], 9, [-2, 0]],
  ] as [string, P2, number, P2, number, P2][])(
    'clamps to the point of circle 0 nearest circle 1 when they do not meet (%s)',
    (_name, c0, r0, c1, r1, want) => {
      for (const side of [1, -1] as const) {
        const { p, clamped } = intersectCircles(c0, r0, c1, r1, side);
        expect(clamped).toBe(true);
        expect(p[0]).toBeCloseTo(want[0], 12);
        expect(p[1]).toBeCloseTo(want[1], 12);
      }
    },
  );

  it('stays finite for coincident centres and zero radii', () => {
    for (const [c0, r0, c1, r1] of [
      [[3, 3], 2, [3, 3], 5],
      [[0, 0], 0, [0, 0], 0],
      [[0, 0], 0, [4, 0], 1],
    ] as [P2, number, P2, number][]) {
      const { p } = intersectCircles(c0, r0, c1, r1, 1);
      expect(p.every(Number.isFinite)).toBe(true);
    }
  });
});

describe("Jansen's leg", () => {
  it('keeps every published link length through a whole crank turn, without clamping', () => {
    for (const theta of cycle(720)) {
      const j = solveLeg(theta, JANSEN);
      expect(j.clamped).toBe(0);
      for (const [p, q, len, name] of links(j, JANSEN)) expect(dist(p, q), `${name} at ${theta}`).toBeCloseTo(len, 9);
    }
  });

  it('holds each joint on one branch for the whole cycle (no flips), moving continuously', () => {
    let prev: LegJoints | null = null;
    for (const theta of cycle(720)) {
      const j = solveLeg(theta, JANSEN);
      expect(Math.sign(cross(j.C, j.A, j.top))).toBe(BRANCH.top);
      expect(Math.sign(cross(j.C, j.A, j.low))).toBe(BRANCH.low);
      expect(Math.sign(cross(j.A, j.top, j.outer))).toBe(BRANCH.outer);
      expect(Math.sign(cross(j.low, j.outer, j.knee))).toBe(BRANCH.knee);
      expect(Math.sign(cross(j.low, j.knee, j.foot))).toBe(BRANCH.foot);
      if (prev) {
        // A half-degree step moves the 15-long crank pin 0.13; a flip would jump tens of units.
        for (const k of ['top', 'low', 'outer', 'knee', 'foot'] as const) expect(dist(j[k], prev[k])).toBeLessThan(1.5);
      }
      prev = j;
    }
  });

  it('has the characteristic flat-bottomed foot path; the wrong twin does not', () => {
    // Vertical spread over the lowest third of the cycle, per unit of stride.
    // Measured at 720 samples: Jansen 0.0046 (0.31 units over a 68-unit stride), twin 0.145.
    const jansen = groundFlatness(footPath(JANSEN, 720));
    const twin = groundFlatness(footPath(TWIN, 720));
    expect(jansen).toBeLessThan(0.01);
    expect(twin).toBeGreaterThan(0.1);
    expect(twin).toBeGreaterThan(20 * jansen);
  });

  it('the foot is on the ground for a large share of the turn and lifts well clear for the return', () => {
    const ys = footPath(JANSEN, 720).map((p) => p[1]);
    const ground = Math.min(...ys);
    const share = ys.filter((y) => y < ground + 1).length / ys.length;
    expect(share).toBeGreaterThan(0.35);
    expect(Math.max(...ys) - ground).toBeGreaterThan(15);
  });

  it('the wrong twin is the same thirteen numbers with four of them changed, and solves at every stage of the morph', () => {
    const changed = (Object.keys(JANSEN) as (keyof Lengths)[]).filter((k) => TWIN[k] !== JANSEN[k]);
    expect(changed).toEqual(['b', 'e', 'g', 'j']);
    for (let v = 0; v <= 1 + 1e-9; v += 0.05) {
      const L = lerpLengths(JANSEN, TWIN, v);
      for (const theta of cycle(360)) {
        const j = solveLeg(theta, L);
        expect(j.clamped, `variant ${v} at ${theta}`).toBe(0);
        for (const [p, q, len, name] of links(j, L)) expect(dist(p, q), `${name}`).toBeCloseTo(len, 9);
      }
    }
  });

  it('the mirror leg on the same pin pushes the same way along the ground', () => {
    // Ground-stroke foot velocity along x, sampled where each foot is lowest.
    const strokeDx = (solve: (t: number) => LegJoints): number => {
      const thetas = cycle(720);
      const ys = thetas.map((t) => solve(t).foot[1]);
      const t = thetas[ys.indexOf(Math.min(...ys))];
      return solve(t + 0.01).foot[0] - solve(t - 0.01).foot[0];
    };
    const plain = strokeDx((t) => solveLeg(t, JANSEN));
    const mirror = strokeDx((t) => solveMirrored(t, JANSEN));
    expect(Math.abs(plain)).toBeGreaterThan(0.1);
    expect(Math.sign(mirror)).toBe(Math.sign(plain));
    // And it is the reflection of the plain leg at the reflected crank angle.
    const a = solveMirrored(1.1, JANSEN);
    const b = solveLeg(Math.PI - 1.1, JANSEN);
    expect(a.foot[0]).toBeCloseTo(-b.foot[0], 12);
    expect(a.foot[1]).toBeCloseTo(b.foot[1], 12);
  });

  it('a crank throw pushed past what the linkage can reach clamps instead of producing NaN', () => {
    // 24 instead of 15: C comes within 15 of A, closer than k − c = 22.6, so the lower rocker
    // cannot close for part of the turn.
    const L = { ...JANSEN, m: 24 };
    let clamped = 0;
    for (const theta of cycle(720)) {
      const j = solveLeg(theta, L);
      clamped += j.clamped;
      for (const p of [j.C, j.top, j.low, j.outer, j.knee, j.foot]) expect(p.every(Number.isFinite)).toBe(true);
      // Clamped joints still keep the link from their first centre: k from the pin, g from low.
      expect(dist(j.C, j.low)).toBeCloseTo(L.k, 9);
      expect(dist(j.low, j.knee)).toBeCloseTo(L.g, 9);
    }
    expect(clamped).toBeGreaterThan(0);
  });
});
