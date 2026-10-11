import { describe, expect, it } from 'vitest';
import { axle, ball, plate } from '../shapes/primitives';
import { openEdges } from '../shapes/testing';
import { merge, pointWeights, surfaceArea } from './partGeometry';

describe('merge', () => {
  it('joins indexed and non-indexed solids into one closed, non-indexed geometry', () => {
    const a = ball(0.5); // indexed
    const b = plate(1, 1, 1, 0).translate(3, 0, 0); // extruded: non-indexed
    const g = merge(a, b);
    expect(g.index).toBeNull();
    expect(g.getAttribute('position').count).toBe(
      a.toNonIndexed().getAttribute('position').count + b.getAttribute('position').count,
    );
    expect(openEdges(g)).toBe(0);
  });

  it('refuses solids whose attributes differ', () => {
    const bare = plate(1, 1, 1, 0);
    bare.deleteAttribute('normal');
    expect(() => merge(plate(1, 1, 1, 0), bare)).toThrow(/do not share attributes/);
  });
});

describe('surfaceArea', () => {
  it('measures a box and a cylinder', () => {
    expect(surfaceArea(plate(2, 3, 4, 0))).toBeCloseTo(2 * (2 * 3 + 3 * 4 + 2 * 4), 9);
    // A 64-gon prism: close to the round cylinder 2 pi r (r + h).
    expect(surfaceArea(axle(1, 2, 64))).toBeCloseTo(2 * Math.PI * (1 + 2), 1);
  });
});

describe('pointWeights', () => {
  it('gives the core its share, splits each group by area times density, and honours fixed shares', () => {
    const w = pointWeights(
      [
        { core: true, area: 1 },
        { core: true, area: 3 },
        { core: false, area: 2 },
        { core: false, area: 2, density: 2 },
        { core: false, area: 50, share: 0.1 },
      ],
      0.2,
    );
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    expect(w[0]).toBeCloseTo(0.05, 12);
    expect(w[1]).toBeCloseTo(0.15, 12);
    expect(w[4]).toBeCloseTo(0.08, 12); // 10% of the 80% body
    expect(w[2]).toBeCloseTo((0.8 * 0.9) / 3, 12);
    expect(w[3]).toBeCloseTo((0.8 * 0.9 * 2) / 3, 12);
  });
});
