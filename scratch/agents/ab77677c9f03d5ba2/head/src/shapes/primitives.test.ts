import { describe, expect, it } from 'vitest';
import { axle, ball, bar, circle, helix, plate } from './primitives';
import { bounds, openEdges, signedArea } from './testing';

describe('circle', () => {
  it('is a counter-clockwise polygon on the requested circle', () => {
    const c = circle(1, 2, 0.5, 32);
    expect(c).toHaveLength(32);
    expect(signedArea(c)).toBeGreaterThan(0);
    for (const [x, y] of c) expect(Math.hypot(x - 1, y - 2)).toBeCloseTo(0.5, 12);
  });
});

describe('primitives', () => {
  it('axle: a closed cylinder along z, centred on the origin', () => {
    const g = axle(0.08, 0.6);
    expect(openEdges(g)).toBe(0);
    const { min, max } = bounds(g);
    expect(min).toEqual([expect.closeTo(-0.08, 6), expect.closeTo(-0.08, 6), expect.closeTo(-0.3, 6)]);
    expect(max).toEqual([expect.closeTo(0.08, 6), expect.closeTo(0.08, 6), expect.closeTo(0.3, 6)]);
  });

  it('bar: a closed rounded-end bar from the origin along +x, with optional holes', () => {
    const g = bar(1, 0.1, 0.12, [circle(0, 0, 0.06)]);
    expect(openEdges(g)).toBe(0);
    const { min, max } = bounds(g);
    expect(min[0]).toBeCloseTo(-0.1, 6);
    expect(max[0]).toBeCloseTo(1.1, 6);
    expect(max[1]).toBeCloseTo(0.1, 6);
    expect(max[2]).toBeCloseTo(0.06, 6);
  });

  it('plate: a closed rounded rectangle with depth and holes', () => {
    const g = plate(4.2, 2.8, 0.15, 0.3, [circle(-0.9, 0, 0.08), circle(0.9, 0, 0.08)]);
    expect(openEdges(g)).toBe(0);
    const { min, max } = bounds(g);
    expect(min).toEqual([expect.closeTo(-2.1, 6), expect.closeTo(-1.4, 6), expect.closeTo(-0.075, 6)]);
    expect(max).toEqual([expect.closeTo(2.1, 6), expect.closeTo(1.4, 6), expect.closeTo(0.075, 6)]);
  });

  it('ball: every vertex on the sphere', () => {
    const p = ball(0.3).getAttribute('position');
    for (let i = 0; i < p.count; i++) expect(Math.hypot(p.getX(i), p.getY(i), p.getZ(i))).toBeCloseTo(0.3, 6);
  });

  it('helix: a wire coiled about z, rising pitch per turn', () => {
    const g = helix({ radius: 0.3, pitch: 0.1, turns: 5, wireRadius: 0.02 });
    const { min, max } = bounds(g);
    expect(min[2]).toBeCloseTo(-0.02, 2);
    expect(max[2]).toBeCloseTo(0.5 + 0.02, 2);
    const p = g.getAttribute('position');
    for (let i = 0; i < p.count; i++) {
      const r = Math.hypot(p.getX(i), p.getY(i));
      expect(r).toBeGreaterThan(0.3 - 0.021);
      expect(r).toBeLessThan(0.3 + 0.021);
    }
  });
});
