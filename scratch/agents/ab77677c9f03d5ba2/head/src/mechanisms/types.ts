import type { Vec3 } from '../math/vec';
import type { PartTransform } from '../math/transform';
import type { Faults } from '../timeline/sceneState';

export type Role = 'core' | 'body' | 'drift';

export interface MechanismPart {
  id: string;
  role: Role;
  /**
   * Displacement from the assembled pose, blended in as assembly → 0. It acts about the part's own
   * posed position: the part origin moves by `offset.position` (world space) and the part turns in
   * place by `offset.quaternion` (applied on top of the pose rotation). It never swings the part
   * around the world origin.
   */
  explodedOffset: PartTransform;
}

export interface BoundPoint {
  part: number; // index into parts
  local: Vec3; // position in part space, correct variant
  localTwin: Vec3; // position in part space, wrong-twin variant
  normal: Vec3; // unit surface normal in part space, correct variant
  normalTwin: Vec3; // unit surface normal in part space, wrong-twin variant
  seed: number; // integer in [0, 2^24)
}

export interface Mechanism {
  id: string;
  parts: MechanismPart[];
  // Pure. Ghost pose is pose(drive, ZERO_FAULTS, 0).
  pose(drive: number, faults: Faults, variant: number): PartTransform[];
  // Deterministic for a given (budget, seed).
  samplePoints(budget: number, seed: number): BoundPoint[];
}
