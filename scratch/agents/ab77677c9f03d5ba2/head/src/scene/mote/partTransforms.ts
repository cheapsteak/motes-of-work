import { compose, IDENTITY, lerpTransform, type PartTransform } from '../../math/transform';
import type { Mechanism } from '../../mechanisms/types';
import type { SceneState } from '../../timeline/sceneState';

/**
 * Pose first, then the exploded offset, applied about the part's own posed position: the part
 * origin lands at `pose.position + offset.position * (1 - assembly)` and the offset rotation turns
 * the part in place. (Composing the offset onto the pose instead would swing the posed position
 * around the world origin.)
 */
export function partTransforms(mech: Mechanism, s: SceneState): PartTransform[] {
  const pose = mech.pose(s.mech.drive, s.mech.faults, s.mech.variant);
  return mech.parts.map((part, i) => {
    const offset = lerpTransform(IDENTITY, part.explodedOffset, 1 - s.mech.assembly);
    const turned = compose({ position: [0, 0, 0], quaternion: offset.quaternion }, pose[i]);
    return {
      position: [
        pose[i].position[0] + offset.position[0],
        pose[i].position[1] + offset.position[1],
        pose[i].position[2] + offset.position[2],
      ],
      quaternion: turned.quaternion,
    };
  });
}

/** Two RGBA texels per part: [qx,qy,qz,qw], [px,py,pz,0]. */
export function packPartTexture(xf: PartTransform[]): Float32Array {
  const out = new Float32Array(xf.length * 8);
  xf.forEach((t, i) => {
    out.set(t.quaternion, i * 8);
    out.set(t.position, i * 8 + 4);
    out[i * 8 + 7] = 0;
  });
  return out;
}
