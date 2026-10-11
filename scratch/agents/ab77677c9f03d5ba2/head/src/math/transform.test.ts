import { describe, expect, it } from 'vitest';
import {
  IDENTITY,
  applyToPoint,
  compose,
  fromAxisAngle,
  lerpTransform,
  transformDistance,
  type PartTransform,
  type Quat,
} from './transform';
import { mulberry32 } from './hash';
import type { Vec3 } from './vec';

function randomTransform(rand: () => number): PartTransform {
  const axis: Vec3 = [rand() - 0.5, rand() - 0.5, rand() - 0.5];
  const len = Math.hypot(...axis) || 1;
  const q = fromAxisAngle([axis[0] / len, axis[1] / len, axis[2] / len], rand() * Math.PI * 2);
  return { position: [rand() * 10 - 5, rand() * 10 - 5, rand() * 10 - 5], quaternion: q };
}

function expectVecClose(a: readonly number[], b: readonly number[], eps = 1e-9): void {
  expect(a.length).toBe(b.length);
  for (let i = 0; i < a.length; i++) expect(Math.abs(a[i] - b[i])).toBeLessThan(eps);
}

function expectTransformClose(a: PartTransform, b: PartTransform, eps = 1e-9): void {
  expectVecClose(a.position, b.position, eps);
  expectVecClose(a.quaternion, b.quaternion, eps);
}

describe('transform', () => {
  const rand = mulberry32(2024);

  it('IDENTITY is the identity element of compose', () => {
    const t = randomTransform(rand);
    expectTransformClose(compose(IDENTITY, t), t);
    expectTransformClose(compose(t, IDENTITY), t);
  });

  it('compose(a, b) applies b first, then a', () => {
    for (let i = 0; i < 50; i++) {
      const a = randomTransform(rand);
      const b = randomTransform(rand);
      const p: Vec3 = [rand() * 4 - 2, rand() * 4 - 2, rand() * 4 - 2];
      expectVecClose(applyToPoint(compose(a, b), p), applyToPoint(a, applyToPoint(b, p)));
    }
  });

  it('fromAxisAngle([0,0,1], pi/2) rotates x to y', () => {
    const t: PartTransform = { position: [0, 0, 0], quaternion: fromAxisAngle([0, 0, 1], Math.PI / 2) };
    expectVecClose(applyToPoint(t, [1, 0, 0]), [0, 1, 0]);
  });

  it('applyToPoint rotates then translates', () => {
    const t: PartTransform = { position: [1, 2, 3], quaternion: fromAxisAngle([0, 0, 1], Math.PI / 2) };
    expectVecClose(applyToPoint(t, [1, 0, 0]), [1, 3, 3]);
  });

  it('lerpTransform hits both endpoints', () => {
    const a = randomTransform(rand);
    const b = randomTransform(rand);
    expectTransformClose(lerpTransform(a, b, 0), a, 1e-9);
    // quaternion may be sign-flipped (shortest path); compare as rotations
    const end = lerpTransform(a, b, 1);
    expectVecClose(end.position, b.position);
    expect(transformDistance(end, b)).toBeLessThan(1e-6);
    const start = lerpTransform(a, b, 0);
    expect(transformDistance(start, a)).toBeLessThan(1e-6);
  });

  it('lerpTransform midpoint interpolates position and gives a unit quaternion', () => {
    const a: PartTransform = { position: [0, 0, 0], quaternion: fromAxisAngle([0, 0, 1], 0) };
    const b: PartTransform = { position: [2, 4, 6], quaternion: fromAxisAngle([0, 0, 1], Math.PI / 2) };
    const m = lerpTransform(a, b, 0.5);
    expectVecClose(m.position, [1, 2, 3]);
    expectVecClose(m.quaternion, fromAxisAngle([0, 0, 1], Math.PI / 4));
    expect(Math.hypot(...m.quaternion)).toBeCloseTo(1, 12);
  });

  it('slerp takes the shortest path when the dot product is negative', () => {
    const a: PartTransform = { position: [0, 0, 0], quaternion: fromAxisAngle([0, 0, 1], 0.2) };
    const qb = fromAxisAngle([0, 0, 1], 0.4);
    const negated: Quat = [-qb[0], -qb[1], -qb[2], -qb[3]]; // same rotation, opposite hemisphere
    const b: PartTransform = { position: [0, 0, 0], quaternion: negated };
    const m = lerpTransform(a, b, 0.5);
    // Shortest path from 0.2 to 0.4 rad about z is the midpoint 0.3 rad, not the long way round.
    expect(transformDistance(m, { position: [0, 0, 0], quaternion: fromAxisAngle([0, 0, 1], 0.3) })).toBeLessThan(1e-9);
  });

  it('transformDistance is 0 for identical transforms and sums position and angle', () => {
    const t = randomTransform(rand);
    expect(transformDistance(t, t)).toBeLessThan(1e-12);
    const a = IDENTITY;
    const b: PartTransform = { position: [3, 4, 0], quaternion: fromAxisAngle([0, 1, 0], 0.5) };
    expect(transformDistance(a, b)).toBeCloseTo(5 + 0.5, 9);
  });

  it('transformDistance treats q and -q as the same rotation', () => {
    const q = fromAxisAngle([1, 0, 0], 1);
    const a: PartTransform = { position: [0, 0, 0], quaternion: q };
    const b: PartTransform = { position: [0, 0, 0], quaternion: [-q[0], -q[1], -q[2], -q[3]] };
    expect(transformDistance(a, b)).toBeLessThan(1e-9);
  });
});
