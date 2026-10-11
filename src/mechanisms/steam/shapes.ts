// Part geometry for the mill engine, in part space. Moving parts are built about their own pivot
// (the point `pose` places); static parts are built in engine coordinates with their origin at
// the engine origin. Every part is a closed solid (or a union of them) faced so the machine reads
// from +z, except the floor: a single-sided sheet facing up.
import { Shape, ShapeGeometry, Vector2, type BufferGeometry } from 'three';
import type { Vec2, Vec3 } from '../../math/vec';
import { extrudeProfile } from '../../shapes/extrude';
import { involuteGear } from '../../shapes/involute';
import { axle, ball, bar, circle, plate } from '../../shapes/primitives';
import { merge } from '../partGeometry';
import { BELT, BONNET_TOP, ENGINE, GOVERNOR, LEVER, STEM_LENGTH, STEM_X, TWIN_BELT_SAG, VALVE_Y } from './kinematics';

export type Axis = 'x' | 'y' | 'z';

/** Capped cylinder of `radius` and `length` along `axis`, centred on `at`. */
export function rod(axis: Axis, radius: number, length: number, at: Vec3, segments?: number): BufferGeometry {
  const g = axle(radius, length, segments); // along z
  if (axis === 'x') g.rotateY(Math.PI / 2);
  if (axis === 'y') g.rotateX(Math.PI / 2);
  return g.translate(...at);
}

/** Axis-aligned box from `min` to `max`. */
export function box(min: Vec3, max: Vec3): BufferGeometry {
  return plate(max[0] - min[0], max[1] - min[1], max[2] - min[2], 0).translate(
    (min[0] + max[0]) / 2,
    (min[1] + max[1]) / 2,
    (min[2] + max[2]) / 2,
  );
}

/** Small spur gear (stands in for a bevel) of `radius`, `depth` thick along z, centred on the origin. */
function pinion(radius: number, teeth: number, depth: number): BufferGeometry {
  return extrudeProfile(involuteGear({ teeth, module: (2 * radius) / teeth }), [], depth);
}

const { crank: R, conrod: L, lineZ: Z, pistonRod } = ENGINE;
const SX = ENGINE.shaftX;
const SY = ENGINE.shaftY;
const GX = GOVERNOR.x;
const GZ = GOVERNOR.z;
/** Bed top surface. */
const BED_TOP = -0.4;
const BED_BOTTOM = -0.62;
/** Top face of the upper crosshead guide bar. */
const GUIDE_TOP = 0.14;
/** The steam main enters the throttle valve (VALVE_Y) from the left, then rises to the boiler. */
const MAIN_X = -1.95;
const MAIN_TOP = 1.3;
const FLYWHEEL_RADIUS = 1.0;
const SPOKES = 6;

/** Large spoked flywheel about its centre, in the xy plane: rim, six spokes, hub. */
export function flywheel(): BufferGeometry {
  const rim = extrudeProfile(circle(0, 0, FLYWHEEL_RADIUS, 96), [circle(0, 0, 0.83, 96)], 0.14);
  const spokes = Array.from({ length: SPOKES }, (_, k) =>
    bar(0.72, 0.045, 0.07)
      .translate(0.14, 0, 0)
      .rotateZ((k * 2 * Math.PI) / SPOKES),
  );
  return merge(rim, ...spokes, rod('z', 0.15, 0.26, [0, 0, 0]));
}

/**
 * Crank about the crankshaft axis (origin on it, z absolute): web pointing +x to the pin at
 * (r, 0, lineZ), the crankshaft back through the bearings, and the governor-belt pulley.
 */
export function crank(): BufferGeometry {
  const web = bar(R, 0.1, 0.08, [circle(0, 0, 0.065)]).translate(0, 0, 0.12);
  const pin = rod('z', 0.05, 0.2, [R, 0, 0.22]);
  const shaft = rod('z', 0.065, 0.96, [0, 0, 0.16 - 0.48]);
  const pulley = rod('z', BELT.crankPulley, 0.08, [0, 0, BELT.z], 32);
  return merge(web, pin, shaft, pulley);
}

/** Con-rod from the crosshead pin (origin) along +x to the crank pin, bored at both ends. */
export function conrod(): BufferGeometry {
  return bar(L, 0.07, 0.07, [circle(0, 0, 0.035, 12), circle(L, 0, 0.035, 12)]);
}

/** Crosshead block about its pin (origin), with the piston rod and piston out along -x. */
export function crosshead(): BufferGeometry {
  return merge(
    plate(0.22, 0.18, 0.16, 0.02),
    rod('z', 0.035, 0.24, [0, 0, 0], 12),
    rod('x', 0.03, pistonRod, [-pistonRod / 2, 0, 0], 12),
    rod('x', 0.27, 0.1, [-pistonRod, 0, 0], 32),
  );
}

/** Cylinder barrel and covers, steam chest, throttle valve and steam pipe (engine coordinates). */
export function cylinder(): BufferGeometry {
  const x0 = -1.75;
  const x1 = -0.85;
  return merge(
    rod('x', 0.3, x1 - x0, [(x0 + x1) / 2, 0, Z], 32),
    rod('x', 0.34, 0.05, [x0 - 0.025, 0, Z], 32),
    rod('x', 0.34, 0.05, [x1 + 0.025, 0, Z], 32),
    rod('x', 0.07, 0.08, [x1 + 0.09, 0, Z], 16), // gland where the rod leaves
    box([-1.63, 0.26, 0.1], [-1.13, 0.46, 0.46]), // steam chest
    box([-1.6, BED_TOP, 0.12], [-1.0, -0.24, 0.38]), // saddle on the bed
    ball(0.08).translate(STEM_X, VALVE_Y, LEVER.z), // throttle valve body, on the chest
    rod('y', 0.04, 0.06, [STEM_X, BONNET_TOP - 0.03, LEVER.z], 16), // bonnet
    // Steam main: in from the left over the chest, then up to the boiler overhead.
    rod('x', 0.05, STEM_X - MAIN_X, [(STEM_X + MAIN_X) / 2, VALVE_Y, LEVER.z], 16),
    ball(0.05).translate(MAIN_X, VALVE_Y, LEVER.z),
    rod('y', 0.05, MAIN_TOP - VALVE_Y, [MAIN_X, (MAIN_TOP + VALVE_Y) / 2, LEVER.z], 16),
    rod('y', 0.08, 0.04, [MAIN_X, MAIN_TOP, LEVER.z], 16),
  );
}

/** Bed plate, crosshead guides on their brackets, and the two crankshaft bearings (engine coordinates). */
export function bed(): BufferGeometry {
  const pedestal = (z: number, bottom: number) =>
    plate(0.32, 0.12 - bottom, 0.14, 0.04, [circle(0, SY - (0.12 + bottom) / 2, 0.065)]).translate(
      SX,
      (0.12 + bottom) / 2,
      z,
    );
  return merge(
    box([-1.9, BED_BOTTOM, -0.12], [1.15, BED_TOP, 0.4]),
    box([-0.75, 0.09, Z - 0.1], [0.15, 0.14, Z + 0.1]), // top guide bar
    box([-0.75, -0.14, Z - 0.1], [0.15, -0.09, Z + 0.1]), // bottom guide bar
    box([-0.81, BED_TOP, Z - 0.1], [-0.75, 0.14, Z + 0.1]), // guide brackets
    box([0.15, BED_TOP, Z - 0.1], [0.21, 0.14, Z + 0.1]),
    pedestal(-0.03, BED_TOP), // main bearing
    pedestal(-0.72, BED_BOTTOM), // outboard bearing, on its own footing
  );
}

/** External tangent hull of two circles: the path a belt takes round two pulleys (counter-clockwise). */
export function beltOutline(c1: Vec2, r1: number, c2: Vec2, r2: number, segments = 48): Vec2[] {
  const dx = c2[0] - c1[0];
  const dy = c2[1] - c1[1];
  const alpha = Math.atan2(dy, dx);
  const gamma = Math.acos((r1 - r2) / Math.hypot(dx, dy));
  const arcOf = (c: Vec2, r: number, a0: number, a1: number, n: number): Vec2[] =>
    Array.from({ length: n + 1 }, (_, i) => {
      const a = a0 + ((a1 - a0) * i) / n;
      return [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)];
    });
  return [
    ...arcOf(c2, r2, alpha - gamma, alpha + gamma, Math.round(segments / 3)),
    ...arcOf(c1, r1, alpha + gamma, alpha - gamma + 2 * Math.PI, segments),
  ];
}

/** The belt's free span: from crank shaft toward governor shaft, clear of both pulleys. */
const SPAN: Vec2 = [GX - SX, GOVERNOR.shaftY - SY];
const SPAN_LENGTH = Math.hypot(SPAN[0], SPAN[1]);
const SPAN_START = BELT.crankPulley + BELT.thickness;
const SPAN_END = SPAN_LENGTH - BELT.governorPulley - BELT.thickness;

/**
 * Drop (<= 0) of a belt point at (x, y) when the twin's belt hangs slack: both straight runs sag in
 * a parabola, TWIN_BELT_SAG deep at mid-span, between the points where they clear the pulleys'
 * circles; the wraps round the pulleys stay put.
 */
export function beltSag(x: number, y: number): number {
  const s = spanFraction(x, y);
  return s <= 0 || s >= 1 ? 0 : -TWIN_BELT_SAG * 4 * s * (1 - s);
}

/** Where (x, y) lies along the free span: 0 where it clears the crank pulley, 1 the governor pulley. */
function spanFraction(x: number, y: number): number {
  const along = ((x - SX) * SPAN[0] + (y - SY) * SPAN[1]) / SPAN_LENGTH;
  return (along - SPAN_START) / (SPAN_END - SPAN_START);
}

/**
 * The flat belt's unit normal `n` at (x, y), carried onto the sagged belt. The sag maps
 * (x, y, z) to (x, y + sag, z); normals go through the inverse transpose of its Jacobian, which
 * (scaled by 1 + ∂sag/∂y) is n ↦ (nx (1 + sy) − sx ny, ny, nz (1 + sy)).
 */
export function beltSagNormal(x: number, y: number, n: Vec3): Vec3 {
  const s = spanFraction(x, y);
  if (s <= 0 || s >= 1) return [n[0], n[1], n[2]];
  const dSag = (-TWIN_BELT_SAG * 4 * (1 - 2 * s)) / (SPAN_END - SPAN_START); // per unit along the span
  const sx = (dSag * SPAN[0]) / SPAN_LENGTH;
  const sy = (dSag * SPAN[1]) / SPAN_LENGTH;
  const m: Vec3 = [n[0] * (1 + sy) - sx * n[1], n[1], n[2] * (1 + sy)];
  const len = Math.hypot(m[0], m[1], m[2]);
  return [m[0] / len, m[1] / len, m[2] / len];
}

/** Governor belt round the crank pulley and the governor pulley (engine coordinates). */
export function belt(): BufferGeometry {
  const c1: Vec2 = [SX, SY];
  const c2: Vec2 = [GX, GOVERNOR.shaftY];
  const { crankPulley: r1, governorPulley: r2, thickness: t } = BELT;
  return extrudeProfile(beltOutline(c1, r1 + t, c2, r2 + t), [beltOutline(c1, r1, c2, r2)], BELT.width).translate(
    0,
    0,
    BELT.z,
  );
}

/** Governor driving shaft about its axis (origin at (x, shaftY) on the spindle's axis plane): pulley, shaft, bevel. */
export function governorDrive(): BufferGeometry {
  return merge(
    rod('z', BELT.governorPulley, 0.07, [0, 0, BELT.z - GZ], 32),
    rod('z', 0.025, GZ - 0.05 - BELT.z, [0, 0, (BELT.z - GZ - 0.05) / 2], 12),
    pinion(0.07, 12, 0.03).translate(0, 0, -0.085),
  );
}

/**
 * Governor stand (engine coordinates), bolted to the top crosshead guide: column, open bevel cage,
 * spindle steady, and the lever's fulcrum post.
 */
export function governorStand(): BufferGeometry {
  const top = GOVERNOR.shaftY;
  return merge(
    box([GX - 0.06, GUIDE_TOP, GZ - 0.06], [GX + 0.06, top - 0.06, GZ + 0.06]),
    box([GX - 0.13, top - 0.06, GZ - 0.06], [GX - 0.1, top + 0.17, GZ + 0.06]),
    box([GX + 0.1, top - 0.06, GZ - 0.06], [GX + 0.13, top + 0.17, GZ + 0.06]),
    plate(0.26, 0.12, 0.04, 0.02, [circle(0, 0, 0.03, 12)])
      .rotateX(Math.PI / 2)
      .translate(GX, top + 0.19, GZ),
    box([LEVER.fulcrumX - 0.035, GUIDE_TOP, GZ + 0.01], [LEVER.fulcrumX + 0.035, LEVER.fulcrumY + 0.04, GZ + 0.09]),
    rod('z', 0.022, 0.12, [LEVER.fulcrumX, LEVER.fulcrumY, LEVER.z - 0.01], 12),
  );
}

/** Spindle about the arm pivots' height (origin on its axis): shaft, head with pivot lugs, cap, bevel. */
export function governorSpindle(): BufferGeometry {
  const bottom = GOVERNOR.shaftY + 0.03 - GOVERNOR.pivotY;
  const topY = 0.15;
  return merge(
    rod('y', 0.03, topY - bottom, [0, (topY + bottom) / 2, 0], 12),
    box([-0.09, -0.03, -0.025], [0.09, 0.03, 0.025]),
    ball(0.045).translate(0, topY, 0),
    pinion(0.07, 12, 0.03)
      .rotateX(Math.PI / 2)
      .translate(0, GOVERNOR.shaftY + 0.08 - GOVERNOR.pivotY, 0),
  );
}

/** One governor arm about its pivot (origin), hanging along -y: the arm, its boss and the ball. */
export function governorArm(): BufferGeometry {
  return merge(
    bar(GOVERNOR.arm, 0.04, 0.03).rotateZ(-Math.PI / 2),
    rod('z', 0.03, 0.06, [0, 0, 0], 12),
    ball(GOVERNOR.ballRadius).translate(0, -GOVERNOR.arm, 0),
  );
}

/** One lower link about its top (origin), hanging along -y to the sleeve. */
export function governorLink(): BufferGeometry {
  return bar(GOVERNOR.link, 0.03, 0.025).rotateZ(-Math.PI / 2);
}

/** Sliding sleeve about its centre (origin on the spindle axis): collar between two groove flanges. */
export function governorSleeve(): BufferGeometry {
  return merge(
    rod('y', 0.06, 0.1, [0, 0, 0], 16),
    rod('y', 0.09, 0.02, [0, 0.04, 0], 24),
    rod('y', 0.09, 0.02, [0, -0.04, 0], 24),
  );
}

/** Throttle lever about its fulcrum (origin): +x to the sleeve, -x to the valve stem, with a boss. */
export function governorLever(): BufferGeometry {
  const { toSleeve, toStem } = LEVER;
  return merge(
    bar(toSleeve + toStem, 0.05, 0.04, [circle(toStem, 0, 0.022, 12)]).translate(-toStem, 0, 0),
    rod('z', 0.05, 0.07, [0, 0, 0], 16),
  );
}

/** Throttle valve stem about its top pin (origin), running down into the valve bonnet. */
export function valveStem(): BufferGeometry {
  return merge(rod('y', 0.02, STEM_LENGTH, [0, -STEM_LENGTH / 2, 0], 12), ball(0.035));
}

/**
 * The mill floor (engine coordinates): an oval level with the bed's underside, spreading well past
 * the engine's footprint but inside its framing sphere (so the camera does not pull back for it),
 * with a pit where the flywheel's rim runs down through it.
 */
export const FLOOR = {
  y: BED_BOTTOM,
  centre: [-0.2, -0.3] as Vec2, // x, z
  radii: [2.1, 1.05] as Vec2, // x, z
  pit: { x0: 0.0, x1: 1.78, z0: ENGINE.flywheelZ - 0.14, z1: ENGINE.flywheelZ + 0.14 },
} as const;

/** The floor as a single-sided sheet facing up (+y): its underside would only add dim, downward motes. */
export function floor(): BufferGeometry {
  // Drawn in the xy plane with y = -z, then turned face up: (x, y, 0) -> (x, 0, -y).
  const flat = (x: number, z: number) => new Vector2(x, -z);
  const { centre, radii, pit } = FLOOR;
  const oval = Array.from({ length: 96 }, (_, i) => {
    const a = (i / 96) * 2 * Math.PI;
    return flat(centre[0] + radii[0] * Math.cos(a), centre[1] + radii[1] * Math.sin(a));
  });
  const outline = new Shape(oval);
  outline.holes.push(
    new Shape([flat(pit.x0, pit.z0), flat(pit.x0, pit.z1), flat(pit.x1, pit.z1), flat(pit.x1, pit.z0)]),
  );
  return new ShapeGeometry(outline).rotateX(-Math.PI / 2).translate(0, FLOOR.y, 0);
}

/** Oil cups and a lubricator: small static fittings (engine coordinates). */
export function fittings(): BufferGeometry {
  const cup = (x: number, y: number, z: number) =>
    merge(rod('y', 0.035, 0.08, [x, y + 0.04, z], 12), ball(0.035).translate(x, y + 0.09, z));
  return merge(
    cup(SX, 0.12, -0.03), // main bearing
    cup(SX, 0.12, -0.72), // outboard bearing
    cup(0, GUIDE_TOP, Z), // top guide
    rod('y', 0.04, 0.12, [-1.5, 0.52, 0.3], 12), // lubricator on the steam chest
    ball(0.04).translate(-1.5, 0.6, 0.3),
  );
}
