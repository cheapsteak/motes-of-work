import { describe, expect, it } from 'vitest';
import { applyToPoint } from '../math/transform';
import type { Vec3 } from '../math/vec';
import { partTransforms } from '../scene/mote/partTransforms';
import { defaultSceneState } from '../timeline/sceneState';
import { mechanismAnchors } from './anchors';
import { mechanisms } from './index';
import type { Mechanism } from './types';

/** Axis-aligned bounds of a dense assembled sample (drive 0, no faults, correct variant). */
function bounds(mech: Mechanism): { min: Vec3; max: Vec3 } {
  const xf = partTransforms(mech, defaultSceneState());
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const b of mech.samplePoints(20_000, 5)) {
    const p = applyToPoint(xf[b.part], b.local);
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], p[k]);
      max[k] = Math.max(max[k], p[k]);
    }
  }
  return { min, max };
}

describe.each(Object.entries(mechanisms))('mechanismAnchors: %s', (id, mech) => {
  const anchors = mechanismAnchors(mech);

  it('is registered under its own id', () => {
    expect(mech.id).toBe(id);
  });

  it('is memoised per mechanism object, deterministic, and frozen', () => {
    expect(mechanismAnchors(mech)).toBe(anchors);
    // A fresh object with the same contents recomputes to the same values, independently.
    const recomputed = mechanismAnchors({ ...mech });
    expect(recomputed).not.toBe(anchors);
    expect(recomputed).toEqual(anchors);
    expect(Object.isFrozen(anchors)).toBe(true);
    expect(Object.isFrozen(anchors.core)).toBe(true);
    expect(Object.isFrozen(anchors.core.center)).toBe(true);
  });

  it('keeps two distinct mechanisms that share an id apart', () => {
    // An impostor with every part shifted +10 in x: a memo keyed by id would hand back the original.
    const impostor: Mechanism = {
      ...mech,
      pose: (drive, faults, variant) =>
        mech.pose(drive, faults, variant).map((t) => ({
          ...t,
          position: [t.position[0] + 10, t.position[1], t.position[2]] as Vec3,
        })),
    };
    expect(impostor.id).toBe(mech.id);
    const shifted = mechanismAnchors(impostor);
    expect(shifted.whole.center[0]).toBeCloseTo(anchors.whole.center[0] + 10, 9);
    expect(shifted.whole.radius).toBeCloseTo(anchors.whole.radius, 9);
    expect(mechanismAnchors(mech)).toBe(anchors);
  });

  it('puts every anchor inside the machine, with a positive radius no larger than its bounds', () => {
    const { min, max } = bounds(mech);
    const diagonal = Math.hypot(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
    for (const role of ['whole', 'core', 'body'] as const) {
      const a = anchors[role];
      a.center.forEach((v, k) => {
        expect(v, `${role} centre[${k}]`).toBeGreaterThanOrEqual(min[k]);
        expect(v, `${role} centre[${k}]`).toBeLessThanOrEqual(max[k]);
      });
      expect(a.radius, role).toBeGreaterThan(0);
      expect(a.radius, role).toBeLessThanOrEqual(diagonal);
    }
  });
});

describe('mechanismAnchors on the gears', () => {
  it('centres the core between the drive gear and the crank it carries', () => {
    const { core } = mechanismAnchors(mechanisms.gears);
    // The drive gear sits at x = -0.9 and the crank rides on the driven gear at x = +0.9, along +x.
    expect(core.center[0]).toBeGreaterThan(-0.9);
    expect(core.center[0]).toBeLessThan(0.9);
    expect(Math.abs(core.center[1])).toBeLessThan(0.2);
  });
});
