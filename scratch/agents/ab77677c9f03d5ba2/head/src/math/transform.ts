import type { Vec3 } from './vec';

export type Quat = [number, number, number, number]; // x, y, z, w

export interface PartTransform {
  position: Vec3;
  quaternion: Quat;
}

export const IDENTITY: PartTransform = { position: [0, 0, 0], quaternion: [0, 0, 0, 1] };

function quatMul(a: Quat, b: Quat): Quat {
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

function quatNormalize(q: Quat): Quat {
  const len = Math.hypot(q[0], q[1], q[2], q[3]);
  if (len === 0) return [0, 0, 0, 1];
  return [q[0] / len, q[1] / len, q[2] / len, q[3] / len];
}

function quatDot(a: Quat, b: Quat): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
}

/** Rotate `p` by the unit quaternion `q` (the same formula as moteRotate in mote.glsl). */
export function rotate(q: Quat, p: Vec3): Vec3 {
  const [x, y, z, w] = q;
  // t = 2 * cross(q.xyz, p); result = p + w*t + cross(q.xyz, t)
  const tx = 2 * (y * p[2] - z * p[1]);
  const ty = 2 * (z * p[0] - x * p[2]);
  const tz = 2 * (x * p[1] - y * p[0]);
  return [
    p[0] + w * tx + (y * tz - z * ty),
    p[1] + w * ty + (z * tx - x * tz),
    p[2] + w * tz + (x * ty - y * tx),
  ];
}

function slerp(a: Quat, b: Quat, t: number): Quat {
  let dot = quatDot(a, b);
  let bb = b;
  if (dot < 0) {
    // q and -q are the same rotation; take the shorter arc.
    bb = [-b[0], -b[1], -b[2], -b[3]];
    dot = -dot;
  }
  if (dot > 0.9995) {
    // Nearly parallel: sin(theta) is unstable, fall back to normalized lerp.
    return quatNormalize([
      a[0] + (bb[0] - a[0]) * t,
      a[1] + (bb[1] - a[1]) * t,
      a[2] + (bb[2] - a[2]) * t,
      a[3] + (bb[3] - a[3]) * t,
    ]);
  }
  const theta = Math.acos(dot);
  const sinTheta = Math.sin(theta);
  const wa = Math.sin((1 - t) * theta) / sinTheta;
  const wb = Math.sin(t * theta) / sinTheta;
  return quatNormalize([
    a[0] * wa + bb[0] * wb,
    a[1] * wa + bb[1] * wb,
    a[2] * wa + bb[2] * wb,
    a[3] * wa + bb[3] * wb,
  ]);
}

/** Apply `b` first, then `a`. */
export function compose(a: PartTransform, b: PartTransform): PartTransform {
  const rotated = rotate(a.quaternion, b.position);
  return {
    position: [a.position[0] + rotated[0], a.position[1] + rotated[1], a.position[2] + rotated[2]],
    quaternion: quatNormalize(quatMul(a.quaternion, b.quaternion)),
  };
}

export function applyToPoint(t: PartTransform, p: Vec3): Vec3 {
  const r = rotate(t.quaternion, p);
  return [r[0] + t.position[0], r[1] + t.position[1], r[2] + t.position[2]];
}

/** Lerp position, slerp rotation (shortest path). */
export function lerpTransform(a: PartTransform, b: PartTransform, t: number): PartTransform {
  return {
    position: [
      a.position[0] + (b.position[0] - a.position[0]) * t,
      a.position[1] + (b.position[1] - a.position[1]) * t,
      a.position[2] + (b.position[2] - a.position[2]) * t,
    ],
    quaternion: slerp(a.quaternion, b.quaternion, t),
  };
}

/** `axis` is expected to be unit length. */
export function fromAxisAngle(axis: Vec3, angle: number): Quat {
  const s = Math.sin(angle / 2);
  return [axis[0] * s, axis[1] * s, axis[2] * s, Math.cos(angle / 2)];
}

/** |Δposition| plus the angle (rad) between the two rotations. */
export function transformDistance(a: PartTransform, b: PartTransform): number {
  const d = Math.hypot(
    a.position[0] - b.position[0],
    a.position[1] - b.position[1],
    a.position[2] - b.position[2],
  );
  // Relative rotation conj(a) * b; atan2 form stays accurate for tiny angles (acos of a dot near 1 does not).
  const [x, y, z, w] = a.quaternion;
  const rel = quatMul([-x, -y, -z, w], b.quaternion);
  return d + 2 * Math.atan2(Math.hypot(rel[0], rel[1], rel[2]), Math.abs(rel[3]));
}
