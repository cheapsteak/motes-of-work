import { describe, expect, it } from 'vitest';
import { extrudeProfile } from './extrude';
import { involuteGear } from './involute';
import { circle } from './primitives';
import { bounds, openEdges } from './testing';

describe('extrudeProfile', () => {
  const gear = involuteGear({ teeth: 18, module: 2.4 / 18 });
  const holes = [circle(0, 0, 0.08), circle(0.6, 0, 0.2), circle(-0.6, 0, 0.2)];

  it('is closed: every edge is shared by exactly two triangles', () => {
    expect(openEdges(extrudeProfile(gear, [], 0.25))).toBe(0);
    expect(openEdges(extrudeProfile(gear, holes, 0.25))).toBe(0);
  });

  it('accepts clockwise outlines and counter-clockwise holes', () => {
    const cw = [...gear].reverse();
    const ccwHoles = holes.map((h) => [...h].reverse());
    expect(openEdges(extrudeProfile(cw, ccwHoles, 0.1))).toBe(0);
  });

  it('is centred on z = 0 with the requested depth', () => {
    const { min, max } = bounds(extrudeProfile(gear, holes, 0.25));
    expect(min[2]).toBeCloseTo(-0.125, 9);
    expect(max[2]).toBeCloseTo(0.125, 9);
    expect(max[0]).toBeCloseTo(1.2 + 2.4 / 18, 6);
  });

  it('carries unit normals', () => {
    const n = extrudeProfile(gear, holes, 0.25).getAttribute('normal');
    for (let i = 0; i < n.count; i++) expect(Math.hypot(n.getX(i), n.getY(i), n.getZ(i))).toBeCloseTo(1, 5);
  });
});
