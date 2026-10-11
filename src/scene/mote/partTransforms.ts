import { compose, IDENTITY, lerpTransform, type PartTransform } from '../../math/transform';
import type { Mechanism, MechanismPart } from '../../mechanisms/types';
import type { SceneState } from '../../timeline/sceneState';
import { settleWindow } from './attributes';
import { SETTLE_WINDOW } from './settle';

/**
 * How far one part has come together at `assembly`: 0 exploded, 1 in its pose. A part closes over
 * its own settle window, from the moment its first mote sets out (`from - SETTLE_WINDOW`) to the
 * moment its last lands (`to`), with the motes' smoothstep or its own `arrival` curve, so it arrives
 * with its motes: a part whose window has ended sits exactly in its pose, and a part whose window has
 * not begun stays fully exploded.
 */
export function partAssembly(part: MechanismPart, assembly: number): number {
  const [from, to] = settleWindow(part);
  const lo = from - SETTLE_WINDOW;
  const x = Math.min(1, Math.max(0, (assembly - lo) / (to - lo)));
  if (part.arrival) return x === 0 ? 0 : x === 1 ? 1 : part.arrival(x);
  return x * x * (3 - 2 * x);
}

/**
 * Pose first, then the exploded offset, applied about the part's own posed position: the part
 * origin lands at `pose.position + offset.position * (1 - partAssembly)` and the offset rotation
 * turns the part in place. (Composing the offset onto the pose instead would swing the posed
 * position around the world origin.)
 */
export function partTransforms(mech: Mechanism, s: SceneState): PartTransform[] {
  const pose = mech.pose(s.mech.drive, s.mech.faults, s.mech.variant, s.mech.steer);
  return mech.parts.map((part, i) => {
    const offset = lerpTransform(IDENTITY, part.explodedOffset, 1 - partAssembly(part, s.mech.assembly));
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

/**
 * Two RGBA texels per part: [qx,qy,qz,qw], [px,py,pz,group]; `group` is the part's reflow group
 * (mechanisms/bike/partGroups.ts), 0 for every part when none are given.
 */
export function packPartTexture(xf: PartTransform[], groups?: readonly number[]): Float32Array {
  const out = new Float32Array(xf.length * 8);
  xf.forEach((t, i) => {
    out.set(t.quaternion, i * 8);
    out.set(t.position, i * 8 + 4);
    out[i * 8 + 7] = groups?.[i] ?? 0;
  });
  return out;
}
