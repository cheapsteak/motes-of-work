import { describe, expect, it } from 'vitest';
import { Triangle, Vector3 } from 'three';
import { axle, ball, bar, circle, ellipticFrustum, helix, plate } from './primitives';
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

describe('ellipticFrustum', () => {
  const g = ellipticFrustum([0.2, 0.12], [0.3, 0.18], 0.5);
  const pos = g.getAttribute('position');
  const nrm = g.getAttribute('normal');

  it('is a closed solid from y = 0 to its height, its ends the two ellipses', () => {
    expect(g.index).toBeNull();
    expect(openEdges(g)).toBe(0);
    const { min, max } = bounds(g);
    expect(min).toEqual([expect.closeTo(-0.3, 6), expect.closeTo(0, 6), expect.closeTo(-0.18, 6)]);
    expect(max).toEqual([expect.closeTo(0.3, 6), expect.closeTo(0.5, 6), expect.closeTo(0.18, 6)]);
    for (let i = 0; i < pos.count; i++) {
      // Every vertex lies on or inside the ellipse of its height, linearly tapered.
      const t = pos.getY(i) / 0.5;
      const a = 0.2 + 0.1 * t;
      const b = 0.12 + 0.06 * t;
      expect((pos.getX(i) / a) ** 2 + (pos.getZ(i) / b) ** 2).toBeLessThanOrEqual(1 + 1e-6); // float32 positions
    }
  });

  it('has unit normals that face out, and triangles wound to agree with them', () => {
    const centre = new Vector3(0, 0.25, 0);
    const tri = new Triangle();
    const face = new Vector3();
    const mid = new Vector3();
    const n = new Vector3();
    for (let i = 0; i < pos.count; i += 3) {
      tri.a.fromBufferAttribute(pos, i);
      tri.b.fromBufferAttribute(pos, i + 1);
      tri.c.fromBufferAttribute(pos, i + 2);
      tri.getNormal(face);
      tri.getMidpoint(mid);
      expect(face.dot(mid.clone().sub(centre)), `face ${i / 3} faces out`).toBeGreaterThan(0);
      for (let k = 0; k < 3; k++) {
        n.fromBufferAttribute(nrm, i + k);
        expect(n.length()).toBeCloseTo(1, 6);
        expect(n.dot(face), `vertex normal ${i + k} agrees with its face`).toBeGreaterThan(0.5);
      }
    }
  });
});
