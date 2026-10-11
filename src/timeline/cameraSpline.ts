import type { Vec3 } from '../math/vec';

// The camera spline the generated moves share: Act I's lap (shots.ts) and Act II's moves
// (netShots.ts). A camera waypoint is a channel vector, [bearing, elevation, ln distance, fov,
// target x, y, z]; the spline is a centripetal Catmull-Rom through them, its knots spaced by the
// square root of the distance the camera itself travels between waypoints, so it neither
// overshoots nor loops. The two callers differ only in units and in how a bearing points (bike
// axes or the network's), which `lookFrom` carries. The splines are test and tooling support, like
// their callers; `lookFromBearing` is also read at runtime, by the freeze pin's search
// (src/galaxy/ambient.ts) at module load.

/** The unit vector from the target toward the camera, for a bearing and an elevation in degrees. */
export type LookFrom = (bearing: number, elevation: number) => Vec3;

const DEG = Math.PI / 180;

/**
 * Act II's LookFrom (the network's shots, the galaxy's, and the freeze pin's close shot): bearing 0
 * looks from +z and 90 from +x, elevation up from the plane, as the galaxy wide's camera sits.
 */
export function lookFromBearing(bearing: number, elevation: number): Vec3 {
  const b = bearing * DEG;
  const e = elevation * DEG;
  return [Math.cos(e) * Math.sin(b), Math.sin(e), Math.cos(e) * Math.cos(b)];
}

/** A camera waypoint as the channels the spline runs in. */
export function cameraChannels(w: { bearing: number; elevation: number; distance: number; fov: number }, target: readonly number[]): number[] {
  return [w.bearing, w.elevation, Math.log(w.distance), w.fov, target[0], target[1], target[2]];
}

/** A channel vector back as a shot: its target, bearing, elevation, distance and fov. */
export function channelShot(c: readonly number[]): { target: Vec3; bearing: number; elevation: number; distance: number; fov: number } {
  return { target: [c[4], c[5], c[6]], bearing: c[0], elevation: c[1], distance: Math.exp(c[2]), fov: c[3] };
}

/** The camera position of a channel vector: what the centripetal knots are spaced by. */
function cameraAt(c: readonly number[], lookFrom: LookFrom): Vec3 {
  const dir = lookFrom(c[0], c[1]);
  const d = Math.exp(c[2]);
  return [c[4] + dir[0] * d, c[5] + dir[1] * d, c[6] + dir[2] * d];
}

/**
 * The spline through `points` (channel vectors) at parameter `u`, waypoint i sitting at `us[i]`
 * (both already eased by the caller, so its ease sets where each waypoint is reached and how the
 * camera leaves and arrives). At a waypoint it returns that waypoint exactly.
 */
export function cameraSpline(points: readonly (readonly number[])[], us: readonly number[], u: number, lookFrom: LookFrom): number[] {
  const pts = points.map((p) => [...p]);
  const n = pts.length;
  const ext = [pts[0].map((v, k) => 2 * v - pts[1][k]), ...pts, pts[n - 1].map((v, k) => 2 * v - pts[n - 2][k])];
  const knots = [0];
  for (let i = 1; i < ext.length; i++) {
    const a = cameraAt(ext[i - 1], lookFrom);
    const b = cameraAt(ext[i], lookFrom);
    knots.push(knots[i - 1] + Math.max(1e-6, Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]))));
  }
  let i = 0;
  while (i < n - 2 && u > us[i + 1]) i++;
  const s = (u - us[i]) / (us[i + 1] - us[i]);
  // The Barry-Goldman pyramid over control points ext[i..i+3] (waypoints i-1..i+2).
  const [t0, t1, t2, t3] = knots.slice(i, i + 4);
  const [p0, p1, p2, p3] = ext.slice(i, i + 4);
  const tau = t1 + (t2 - t1) * s;
  const mixAt = (a: number[], b: number[], ta: number, tb: number) => a.map((v, k) => ((tb - tau) * v + (tau - ta) * b[k]) / (tb - ta));
  const a1 = mixAt(p0, p1, t0, t1);
  const a2 = mixAt(p1, p2, t1, t2);
  const a3 = mixAt(p2, p3, t2, t3);
  const b1 = mixAt(a1, a2, t0, t2);
  const b2 = mixAt(a2, a3, t1, t3);
  return s === 0 ? p1 : s === 1 ? p2 : mixAt(b1, b2, t1, t2);
}
