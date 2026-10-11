// Where every part of the watch (and of its music-box twin) sits, and the gear data that makes
// the going train mesh. World units; the movement lies in the xy plane facing +z, its main plate's
// front face on z = 0.

import type { Vec2, Vec3 } from '../../math/vec';
import { BANKING, LIFT } from './kinematics';

const DEG = Math.PI / 180;
const dir = (a: number): Vec2 => [Math.cos(a), Math.sin(a)];
const add = (p: Vec2, d: Vec2, s: number): Vec2 => [p[0] + d[0] * s, p[1] + d[1] * s];

export const PLATE = { radius: 2.3, depth: 0.15 };

// Heights of the layers above the plate (part-space origins sit on these).
export const Z = {
  barrel: 0.17, // drum 0.05..0.29
  layerA: 0.38, // centre and fourth wheels; third and escape pinions
  layerB: 0.48, // third and escape wheels, pallet fork; fourth pinion
  bridge: 0.6, // barrel, train and pallet bridges, 0.57..0.63
  balance: 0.7,
  hairspring: 0.82,
  cock: 0.97,
};
export const WHEEL_DEPTH = 0.05;
export const BRIDGE_DEPTH = 0.06;
export const BARREL_DEPTH = 0.24;
export const PINION_LENGTH = 0.1;

// --- Escapement: escape wheel, pallet fork and balance on one straight line of centres. ---

/** Direction of the line of centres, escape wheel → pallet arbor → balance staff. */
export const ALPHA = -15 * DEG;
export const ESCAPE = {
  teeth: 15,
  lockRadius: 0.42,
  rootRadius: 0.31,
  rimInner: 0.25,
  hub: 0.07,
  crossings: 5,
};
/** The pallet stones sit at ±30 degrees from the line of centres, as seen from the escape arbor. */
export const STONE_ANGLE = 30 * DEG;
/** Escape arbor → pallet arbor: the stones' lines to the pallet arbor are tangent to the wheel. */
export const PALLET_DISTANCE = ESCAPE.lockRadius / Math.cos(STONE_ANGLE);
/** Pallet arbor → impulse pin (in the fork's notch) when the balance is at rest. */
export const FORK_PIN = 0.66;
/**
 * Radius of the impulse pin on the balance's roller: chosen so the pin, turning through the lift
 * angle, carries the notch through the banking angle (both measured at rest).
 */
export const IMPULSE_PIN_RADIUS = (FORK_PIN * Math.sin(BANKING)) / Math.sin(LIFT);
export const BALANCE = {
  rimOuter: 0.7,
  rimInner: 0.62,
  arms: 3,
  screws: 16,
  depth: 0.07,
};
export const HAIRSPRING = { inner: 0.08, outer: 0.4, turns: 7, wire: 0.012 };

const U = dir(ALPHA);
export const BALANCE_CENTRE: Vec2 = [0.8, -0.95];
export const PALLET_CENTRE: Vec2 = add(BALANCE_CENTRE, U, -(FORK_PIN + IMPULSE_PIN_RADIUS));
export const ESCAPE_CENTRE: Vec2 = add(PALLET_CENTRE, U, -PALLET_DISTANCE);

// --- Going train: escape pinion ← fourth wheel ← fourth pinion ← third wheel ← ... ← barrel. ---

export interface TrainWheel {
  /** Wheel teeth and pitch radius. */
  teeth: number;
  pitchRadius: number;
  /** Teeth of the pinion on the same arbor, which the previous (driving) wheel meshes. */
  pinionTeeth: number;
}

const wheel = (teeth: number, pitchRadius: number, pinionTeeth: number): TrainWheel => ({
  teeth,
  pitchRadius,
  pinionTeeth,
});
export const moduleOf = (w: { teeth: number; pitchRadius: number }): number => (2 * w.pitchRadius) / w.teeth;

export const ESCAPE_PINION = 7;
export const FOURTH = wheel(40, 0.5, 7);
export const THIRD = wheel(42, 0.52, 8);
export const CENTRE = wheel(48, 0.62, 10);
export const BARREL = { teeth: 60, pitchRadius: 0.85 };

/** Pitch radius of the pinion of `pinionTeeth` that meshes `driver` (they share its module). */
export const pinionRadius = (driver: { teeth: number; pitchRadius: number }, pinionTeeth: number): number =>
  (moduleOf(driver) * pinionTeeth) / 2;

/** Directions of the lines of centres, each from the earlier (faster) arbor to the later one. */
export const PHI = {
  escapeFourth: 135 * DEG,
  fourthThird: 85 * DEG,
  thirdCentre: 60 * DEG,
  centreBarrel: -10 * DEG,
};

export const FOURTH_CENTRE = add(
  ESCAPE_CENTRE,
  dir(PHI.escapeFourth),
  FOURTH.pitchRadius + pinionRadius(FOURTH, ESCAPE_PINION),
);
export const THIRD_CENTRE = add(
  FOURTH_CENTRE,
  dir(PHI.fourthThird),
  THIRD.pitchRadius + pinionRadius(THIRD, FOURTH.pinionTeeth),
);
export const CENTRE_CENTRE = add(
  THIRD_CENTRE,
  dir(PHI.thirdCentre),
  CENTRE.pitchRadius + pinionRadius(CENTRE, THIRD.pinionTeeth),
);
export const BARREL_CENTRE = add(
  CENTRE_CENTRE,
  dir(PHI.centreBarrel),
  BARREL.pitchRadius + pinionRadius(BARREL, CENTRE.pinionTeeth),
);

/** Foot of the balance cock, out towards the rim of the plate. */
export const COCK_FOOT: Vec2 = add(BALANCE_CENTRE, dir(-20 * DEG), 0.75);
/** Foot of the barrel bridge, out towards the rim of the plate. */
export const BARREL_BRIDGE_FOOT: Vec2 = add(BARREL_CENTRE, dir(Math.atan2(BARREL_CENTRE[1], BARREL_CENTRE[0])), 0.85);

// --- The music-box twin (same parts, rearranged). ---

export const BEDPLATE = { width: 4.4, height: 2.9, corner: 0.25 };
/** The pinned cylinder lies along +x; its great wheel is on its right-hand end. */
export const CYLINDER = {
  centre: [-0.3, 0.45, 0.62] as Vec3,
  radius: 0.36,
  length: 2.3,
  pins: 150,
};
export const GREAT_WHEEL = { teeth: 48, pitchRadius: 0.48, at: 1.2 };
/** Comb: graduated tines reaching just under the cylinder's front edge, where its pins pluck them. */
export const COMB = {
  tines: 18,
  left: -1.42,
  pitch: 0.125,
  tineWidth: 0.1, // slots of 0.025 between tines: a solid comb, not a row of lines
  tipY: 0.25,
  z: 0.17,
  tineDepth: 0.05,
};

/** Governor train wheels of the twin: axes along x, in planes x = const, stepping right. */
export interface TwinWheel {
  teeth: number;
  pitchRadius: number;
  pinionTeeth: number;
  centre: Vec3;
}
/** The twin train's pinions sit this far back along the arbor, in the plane of the wheel before. */
export const TWIN_PINION_OFFSET = -0.15;

function twinTrain(): TwinWheel[] {
  const specs: [teeth: number, r: number, pinion: number, yzAngle: number][] = [
    [36, 0.36, 8, 180 * DEG],
    [30, 0.3, 7, 200 * DEG],
    [26, 0.26, 7, 160 * DEG],
    [30, 0.3, 7, 220 * DEG], // the worm wheel
  ];
  const out: TwinWheel[] = [];
  let prev = { teeth: GREAT_WHEEL.teeth, pitchRadius: GREAT_WHEEL.pitchRadius };
  let at: Vec3 = [CYLINDER.centre[0] + GREAT_WHEEL.at, CYLINDER.centre[1], CYLINDER.centre[2]];
  for (const [teeth, pitchRadius, pinionTeeth, a] of specs) {
    const d = prev.pitchRadius + pinionRadius(prev, pinionTeeth);
    at = [at[0] - TWIN_PINION_OFFSET, at[1] + d * Math.cos(a), at[2] + d * Math.sin(a)];
    out.push({ teeth, pitchRadius, pinionTeeth, centre: at });
    prev = { teeth, pitchRadius };
  }
  return out;
}
export const TWIN_TRAIN = twinTrain();
const WORM_WHEEL = TWIN_TRAIN[3];
export const WORM = { radius: 0.1, pitch: 0.04, turns: 10, wire: 0.018 };
/** The fly's arbor stands upright beside the worm wheel, in its plane; the worm on it meshes the wheel. */
export const FLY_FOOT: Vec3 = [
  WORM_WHEEL.centre[0],
  WORM_WHEEL.centre[1] + WORM_WHEEL.pitchRadius + WORM.radius + WORM.wire,
  0,
];
export const WORM_Z = WORM_WHEEL.centre[2];
/** The fly: four vanes pitched like a fan's, so they show from the front as well as edge-on. */
export const FLY = { arbor: 1.4, vanes: 4, vaneSpan: 0.5, vaneHeight: 0.34, vanePitch: Math.PI / 4, vaneZ: 1.1 };
