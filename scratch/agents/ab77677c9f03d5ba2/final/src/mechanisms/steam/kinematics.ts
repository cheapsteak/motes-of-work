// Kinematics of the horizontal mill engine: an exact slider-crank, and a Watt flyball governor in
// conical-pendulum equilibrium. Every function is pure: angles come straight from `drive` and the
// faults, never from integrating a speed over time.
import { lerp } from '../../math/vec';
import type { Faults } from '../../timeline/sceneState';

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

/** Engine dimensions, in machine units. The crankshaft runs along z; the line of stroke along x. */
export const ENGINE = {
  /** Crank throw r: crankshaft axis to crank pin. */
  crank: 0.3,
  /** Connecting rod l: crosshead pin to crank pin. */
  conrod: 1.2,
  /** Crankshaft axis in the xy plane. The cylinder lies toward -x. */
  shaftX: 0.9,
  shaftY: 0,
  /** Crosshead pin to the piston's centre, along the piston rod. */
  pistonRod: 0.95,
  /** z of the plane the cylinder axis, piston rod, crosshead and con-rod move in. */
  lineZ: 0.25,
  /** z of the flywheel's mid-plane, behind the crank. */
  flywheelZ: -0.42,
} as const;

/** The flyball governor: a vertical spindle at (x, z), arms hung from pivots on its head. */
export const GOVERNOR = {
  x: -0.35,
  /** On the crosshead guides, in the plane of the engine line. */
  z: 0.25,
  /** Height of the arm pivots. */
  pivotY: 1.55,
  /** Each arm pivot sits this far out from the spindle axis. */
  pivotOffset: 0.05,
  /** Arm length L, pivot to ball centre (read as metres in the equilibrium). */
  arm: 0.48,
  ballRadius: 0.14,
  /** The lower links hang from the arms this far below the pivots ... */
  linkAt: 0.25,
  /** ... and run this long down to the sleeve. */
  link: 0.45,
  /** Arm angle from the vertical: the stops, and the setting at nominal speed. */
  minAngle: 15 * DEG,
  maxAngle: 70 * DEG,
  nominalAngle: 35 * DEG,
  /** Height of the horizontal driving shaft (belt pulley and bevel) under the spindle. */
  shaftY: 0.42,
} as const;

/** Standard gravity, m/s^2. */
export const G = 9.81;

/** Spindle speed (rad/s) at which the balls ride at the nominal angle: cos(theta0) = g / (omega0^2 L). */
export const NOMINAL_OMEGA = Math.sqrt(G / (GOVERNOR.arm * Math.cos(GOVERNOR.nominalAngle)));

/** The governor belt, from a pulley on the crankshaft to one on the governor's driving shaft. */
export const BELT = { z: -0.15, crankPulley: 0.2, governorPulley: 0.13, width: 0.06, thickness: 0.015 } as const;

/**
 * Sleeve height (absolute y) for arm angle `theta`. Each link joins the arm at `linkAt` below the
 * pivot to the sleeve directly under the pivot, so the sleeve sits a slider-crank's reach below.
 */
export function sleeveY(theta: number): number {
  const { pivotY, linkAt: a, link: b } = GOVERNOR;
  const s = a * Math.sin(theta);
  return pivotY - a * Math.cos(theta) - Math.sqrt(b * b - s * s);
}

/** The throttle lever: a first-class lever from the sleeve (right) to the valve stem (left). */
const FULCRUM_X = -0.7;
export const LEVER = {
  fulcrumX: FULCRUM_X,
  /** Level at nominal speed. */
  fulcrumY: sleeveY(GOVERNOR.nominalAngle),
  /** Fulcrum to the sleeve end (the spindle axis). */
  toSleeve: GOVERNOR.x - FULCRUM_X,
  /** Fulcrum to the valve stem. */
  toStem: 0.53,
  /** In front of the spindle, clear of the sleeve. */
  z: 0.38,
} as const;

/** Valve stem x: under the lever's far end. */
export const STEM_X = LEVER.fulcrumX - LEVER.toStem;
/** Valve stem length, from its top pin down into the bonnet. */
export const STEM_LENGTH = 0.3;
/** Throttle valve centre height, on the steam chest; the bonnet above it tops out at BONNET_TOP. */
export const VALVE_Y = 0.55;
export const BONNET_TOP = VALVE_Y + 0.11;

// The wrong twin's governor is ornamental (Task 9 visual review: the wrongness must read in a still,
// not only in motion). Besides the runaway, its linkage has come apart:
/** The lever hangs off its fulcrum, sleeve end down, whatever the balls do. */
export const TWIN_LEVER_DROOP = -35 * DEG;
/** The valve stem has dropped into the bonnet and leans over this far (toward -x) against the valve. */
export const TWIN_STEM_LEAN = 40 * DEG;
/** The spindle (and everything it carries) leans this far off vertical, toward the flywheel (+x) ... */
export const TWIN_LEAN = 12 * DEG;
/** ... about its foot, on the axis just above the driving bevel. */
export const LEAN_FOOT_Y = GOVERNOR.shaftY + 0.03;
/** The belt hangs this slack at mid-span. */
export const TWIN_BELT_SAG = 0.12;

/** The wrong twin runs away at this multiple of the nominal speed. */
export const TWIN_OVERSPEED = 2.5;
/** `ratio` = 1 runs the engine this much fast. */
const RATIO_OVERSPEED = 0.8;
/** `slip` = 1 loses this fraction of the governor's drive. */
const SLIP_LAG = 0.45;
/** `bind` = 1: amplitude of the sin(2 theta) warp; slope 1 - 2 * 0.46 = 0.08 at mid-stroke. */
const BIND_DWELL = 0.46;

/** Crosshead pin distance from the crank centre along the line of stroke: r cos(t) + sqrt(l^2 - r^2 sin^2(t)). */
export function pistonDistance(theta: number, r: number = ENGINE.crank, l: number = ENGINE.conrod): number {
  const s = r * Math.sin(theta);
  return r * Math.cos(theta) + Math.sqrt(l * l - s * s);
}

/** Con-rod angle off the line of stroke, crosshead pin toward crank pin (sin beta = r sin(t) / l). */
export function conrodAngle(theta: number, r: number = ENGINE.crank, l: number = ENGINE.conrod): number {
  const s = r * Math.sin(theta);
  return Math.atan2(s, Math.sqrt(l * l - s * s));
}

/**
 * Equilibrium arm angle from the vertical at spindle speed `omega` (rad/s): the conical pendulum
 * cos(theta) = g / (omega^2 L), held between the stops. Monotonic in omega; omega = 0 hangs at the
 * lower stop (g / 0 is +Infinity, which the clamp absorbs).
 */
export function governorAngle(omega: number): number {
  const { arm, minAngle, maxAngle } = GOVERNOR;
  const c = G / (omega * omega * arm);
  if (c >= Math.cos(minAngle)) return minAngle;
  if (c <= Math.cos(maxAngle)) return maxAngle;
  return Math.acos(c);
}

/** Mean engine speed as a multiple of nominal: the twin's runaway and the ratio fault. */
export function speedFactor(f: Faults, variant: number): number {
  return lerp(1, TWIN_OVERSPEED, variant) * (1 + RATIO_OVERSPEED * f.ratio);
}

/** Governor spindle speed (rad/s): the engine's mean speed through the belt, less what slips. */
export function governorOmega(f: Faults, variant: number): number {
  return NOMINAL_OMEGA * speedFactor(f, variant) * (1 - SLIP_LAG * f.slip);
}

function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

const fract = (x: number): number => x - Math.floor(x);

/**
 * Crank angle (rad). 0 is inner dead centre (crank pin toward the cylinder), pi outer dead centre.
 * One unit of drive is one turn at nominal speed. `bind` warps the angle so the crank crawls through
 * mid-stroke (the piston sticks); `stall` holds it at each dead centre, then catches up. Both keep
 * the angle monotonic in drive.
 */
export function crankAngle(drive: number, f: Faults, variant: number): number {
  let theta = TAU * drive * speedFactor(f, variant);
  theta += f.bind * BIND_DWELL * Math.sin(2 * theta);
  const u = theta / Math.PI;
  const stalled = Math.PI * (Math.floor(u) + smoothstep(0.4, 1, fract(u)));
  return lerp(theta, stalled, f.stall);
}

/** Governor pulley (and, through 1:1 bevels, spindle) angle: the belt ratio, less slip, in jerks. */
export function governorSpin(theta: number, f: Faults): number {
  const belt = (BELT.crankPulley / BELT.governorPulley) * theta;
  return belt * (1 - SLIP_LAG * f.slip) - f.slip * 0.6 * (fract(theta / Math.PI) - 0.5);
}

/**
 * Lever angle about z (positive raises the sleeve end) for sleeve height `sleeve`. The correct
 * linkage follows the sleeve; the twin's is disconnected and hangs at TWIN_LEVER_DROOP.
 */
export function leverAngle(sleeve: number, variant: number): number {
  const s = Math.min(1, Math.max(-1, (sleeve - LEVER.fulcrumY) / LEVER.toSleeve));
  return lerp(Math.asin(s), TWIN_LEVER_DROOP, variant);
}

/** Valve stem top (absolute y) for lever angle `phi`: higher is wider open. */
export function stemY(phi: number): number {
  return LEVER.fulcrumY - LEVER.toStem * Math.sin(phi);
}
