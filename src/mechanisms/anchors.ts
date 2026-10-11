import { applyToPoint } from '../math/transform';
import type { Vec3 } from '../math/vec';
import { partTransforms } from '../scene/mote/partTransforms';
import { defaultSceneState, mergeState, ZERO_FAULTS } from '../timeline/sceneState';
import type { Mechanism, Role } from './types';

/** A sphere that frames part of a machine: the centroid of its points and their furthest distance from it. */
export interface RoleAnchor {
  center: Vec3;
  radius: number;
}

export interface MechanismAnchors {
  /** Every sampled point, drift parts included. */
  whole: RoleAnchor;
  core: RoleAnchor;
  body: RoleAnchor;
}

const BUDGET = 4000;
const SEED = 1;

const cache = new WeakMap<Mechanism, MechanismAnchors>();

function deepFreeze(a: MechanismAnchors): MechanismAnchors {
  for (const role of [a.whole, a.core, a.body]) {
    Object.freeze(role.center);
    Object.freeze(role);
  }
  return Object.freeze(a);
}

function anchorOf(points: Vec3[]): RoleAnchor {
  const center: Vec3 = [0, 0, 0];
  for (const p of points) for (let k = 0; k < 3; k++) center[k] += p[k] / points.length;
  let radius = 0;
  for (const p of points) radius = Math.max(radius, Math.hypot(p[0] - center[0], p[1] - center[1], p[2] - center[2]));
  return { center, radius };
}

/**
 * Where the camera frames a machine: anchors of the assembled ghost pose (drive 0, no faults,
 * correct variant), from a fixed sample so they never move with the story. Memoised per mechanism
 * object; the result is frozen, so callers cannot corrupt the shared copy.
 * A role with no sampled points falls back to the whole machine.
 */
export function mechanismAnchors(mech: Mechanism): MechanismAnchors {
  const hit = cache.get(mech);
  if (hit) return hit;
  const assembled = mergeState(defaultSceneState(), {
    mech: { drive: 0, faults: ZERO_FAULTS, variant: 0, assembly: 1 },
  });
  const xf = partTransforms(mech, assembled);
  const byRole: Record<Role, Vec3[]> = { core: [], body: [], drift: [] };
  const all: Vec3[] = [];
  for (const b of mech.samplePoints(BUDGET, SEED)) {
    const p = applyToPoint(xf[b.part], b.local);
    all.push(p);
    byRole[mech.parts[b.part].role].push(p);
  }
  const whole = anchorOf(all);
  const anchors: MechanismAnchors = deepFreeze({
    whole,
    core: byRole.core.length > 0 ? anchorOf(byRole.core) : whole,
    body: byRole.body.length > 0 ? anchorOf(byRole.body) : whole,
  });
  cache.set(mech, anchors);
  return anchors;
}
