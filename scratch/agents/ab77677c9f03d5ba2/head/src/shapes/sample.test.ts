import { afterEach, describe, expect, it, vi } from 'vitest';
import { mulberry32 } from '../math/hash';
import { extrudeProfile } from './extrude';
import { involuteGear } from './involute';
import { circle, plate } from './primitives';
import { samplePart } from './sample';
import { distanceToMesh } from './testing';

const gear = extrudeProfile(involuteGear({ teeth: 18, module: 2.4 / 18 }), [circle(0, 0, 0.08), circle(0.6, 0, 0.2)], 0.25);

describe('samplePart', () => {
  afterEach(() => vi.restoreAllMocks());

  it('is deterministic for a seed and sensitive to it', () => {
    const a = samplePart(gear, 300, mulberry32(5));
    expect(samplePart(gear, 300, mulberry32(5))).toEqual(a);
    expect(samplePart(gear, 300, mulberry32(6))).not.toEqual(a);
  });

  it('never reaches for Math.random', () => {
    const random = vi.spyOn(Math, 'random');
    samplePart(gear, 300, mulberry32(5));
    expect(random).not.toHaveBeenCalled();
  });

  it('returns the requested count of positions with unit normals', () => {
    const { positions, normals } = samplePart(gear, 500, mulberry32(1));
    expect(positions).toHaveLength(500);
    expect(normals).toHaveLength(500);
    for (const n of normals) expect(Math.hypot(...n)).toBeCloseTo(1, 6);
    expect(samplePart(gear, 0, mulberry32(1))).toEqual({ positions: [], normals: [] });
  });

  it('puts every sample on the surface', () => {
    const { positions } = samplePart(gear, 150, mulberry32(2));
    for (const p of positions) expect(distanceToMesh(gear, p)).toBeLessThan(1e-4);
  });

  it('spreads samples by area, so thin edges are not over-weighted', () => {
    // A 2 x 1 x 0.1 slab: the two faces are 4 of its 4.6 area units, the rim the other 0.6.
    const slab = plate(2, 1, 0.1, 0);
    const { positions, normals } = samplePart(slab, 6000, mulberry32(3));
    const onFaces = positions.filter((p, i) => Math.abs(p[2]) > 0.05 - 1e-6 && Math.abs(normals[i][2]) > 0.99);
    expect(onFaces.length / positions.length).toBeCloseTo(4 / 4.6, 1);
  });
});
