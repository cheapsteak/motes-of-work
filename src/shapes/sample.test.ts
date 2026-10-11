import { Vector3 } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mulberry32 } from '../math/hash';
import { extrudeProfile } from './extrude';
import { involuteGear } from './involute';
import { axle, circle, plate } from './primitives';
import { samplePart, samplePartPair } from './sample';
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

describe('samplePartPair', () => {
  // A capped cylinder and the same mesh stretched, turned and moved: one topology, two shapes.
  const rod = axle(0.1, 1, 12);
  const moved = axle(0.1, 1, 12).scale(1, 1, 2.5).rotateX(0.7).translate(0.3, -0.2, 1);

  it('gives the first shape exactly what samplePart gives it, for the same rng', () => {
    const one = samplePart(gear, 400, mulberry32(9));
    const pair = samplePartPair(gear, gear, 400, mulberry32(9));
    expect(pair.positions).toEqual(one.positions);
    expect(pair.normals).toEqual(one.normals);
    expect(pair.positionsTwin).toEqual(one.positions);
    expect(pair.normalsTwin).toEqual(one.normals);
  });

  it('puts point i at the same place on the matching face of the second shape, with that face normal', () => {
    const { positions, positionsTwin, normalsTwin } = samplePartPair(rod, moved, 500, mulberry32(4));
    expect(positionsTwin).toHaveLength(500);
    for (const p of positionsTwin) expect(distanceToMesh(moved, p)).toBeLessThan(1e-4);
    for (const n of normalsTwin) expect(Math.hypot(...n)).toBeCloseTo(1, 6);
    // The same (u, v) on the rod: as far along it, at the same angle round it.
    const v = new Vector3();
    positions.forEach((p, i) => {
      v.set(...p).setZ(p[2] * 2.5).applyAxisAngle(new Vector3(1, 0, 0), 0.7).add(new Vector3(0.3, -0.2, 1));
      expect(v.distanceTo(new Vector3(...positionsTwin[i]))).toBeLessThan(1e-5);
    });
    // Side points: the twin normal is square to the turned axis.
    const axis = new Vector3(0, 0, 1).applyAxisAngle(new Vector3(1, 0, 0), 0.7);
    positions.forEach((p, i) => {
      if (Math.abs(p[2]) < 0.49) expect(Math.abs(new Vector3(...normalsTwin[i]).dot(axis))).toBeLessThan(1e-5);
    });
  });

  it('refuses two shapes that are not one topology', () => {
    expect(() => samplePartPair(rod, axle(0.1, 1, 10), 10, mulberry32(1))).toThrow(/topology/);
  });
});
