// A town bicycle in side profile, in metres: x forward (the front wheel toward +x), y up from the
// ground, z toward the drive side (the chain). The rear axle sits over x = 0.
import { fromAxisAngle, rotate, type Quat } from '../../math/transform';
import type { Vec3 } from '../../math/vec';
import type { Faults } from '../../timeline/sceneState';

const DEG = Math.PI / 180;

/** Both wheels: tyre outer radius and section, rim radius, hub radius, spoke count. */
export const WHEEL = {
  tyre: 0.34,
  section: 0.03,
  rim: 0.31,
  hub: 0.025,
  spokes: 12,
} as const;
export const WHEELBASE = 1.05;
export const REAR_AXLE: Vec3 = [0, WHEEL.tyre, 0];
export const FRONT_AXLE: Vec3 = [WHEELBASE, WHEEL.tyre, 0];

export const BB_HEIGHT = 0.27;
export const CHAINSTAY = 0.43;
/** Bottom bracket: the crank axle, a chainstay forward of the rear axle. */
export const BB: Vec3 = [Math.sqrt(CHAINSTAY ** 2 - (WHEEL.tyre - BB_HEIGHT) ** 2), BB_HEIGHT, 0];

export const SEAT_ANGLE = 73 * DEG;
export const HEAD_ANGLE = 71 * DEG;
export const RAKE = 0.045;
/** Up the seat tube, from the bottom bracket. */
export const SEAT_DIR: Vec3 = [-Math.cos(SEAT_ANGLE), Math.sin(SEAT_ANGLE), 0];
/** Up the steering axis (the head tube). */
export const STEER_AXIS: Vec3 = [-Math.cos(HEAD_ANGLE), Math.sin(HEAD_ANGLE), 0];

const along = (p: Vec3, dir: Vec3, t: number): Vec3 => [p[0] + dir[0] * t, p[1] + dir[1] * t, p[2] + dir[2] * t];

/** The steering axis passes RAKE behind the front axle, measured square to the axis. */
const STEER_FOOT: Vec3 = [FRONT_AXLE[0] - RAKE * Math.sin(HEAD_ANGLE), FRONT_AXLE[1] - RAKE * Math.cos(HEAD_ANGLE), 0];
export const HEAD_TOP_Y = 0.85;
export const HEAD_LENGTH = 0.15;
/** Top of the head tube, on the steering axis: the pivot every steered part turns about. */
export const HEAD_TOP: Vec3 = along(STEER_FOOT, STEER_AXIS, (HEAD_TOP_Y - STEER_FOOT[1]) / STEER_AXIS[1]);
export const HEAD_BOTTOM: Vec3 = along(HEAD_TOP, STEER_AXIS, -HEAD_LENGTH);
/** Where the handlebar stem clamps into the steerer, above the headset. */
export const STEER_MOUNT: Vec3 = along(HEAD_TOP, STEER_AXIS, 0.06);

/** Seat tube length, bottom bracket to the seat clamp. */
export const SEAT_TUBE = 0.55;
export const SEAT_CLAMP: Vec3 = along(BB, SEAT_DIR, SEAT_TUBE);
/** Bottom bracket to the top of the saddle, along the seat-tube line. */
export const SADDLE_HEIGHT = 0.73;
export const SADDLE_TOP: Vec3 = along(BB, SEAT_DIR, SADDLE_HEIGHT);

// ---- The wrong twin's frame, built round the swap ----

/**
 * The twin's seat tube is a stub: it stops this far up from the bottom bracket, a little above
 * where the stays and the top tube meet it, and the handlebars' short stem clamps into its top.
 */
export const STUB = 0.53;
export const STUB_TOP: Vec3 = along(BB, SEAT_DIR, STUB);
/**
 * The twin's head tube runs on past the headset as a mast sleeve this far above the head-tube top
 * (along the steering axis), and its top tube climbs to meet it MAST_JOIN up: steep enough to read
 * as climbing from the reveal's high front three-quarter camera. The steering column inside carries
 * on a little higher still, to the saddle's cradle.
 */
export const MAST_SLEEVE = 0.25;
export const MAST_JOIN = 0.22;
/** Where the twin's saddle is mounted (the point that stands in for the seat clamp), on the steering axis. */
export const MAST_MOUNT: Vec3 = along(HEAD_TOP, STEER_AXIS, 0.15);

/** Crank length, and the z of the crank arms' and the pedals' mid-planes on the drive side. */
export const CRANK = 0.17;
export const CRANK_Z = 0.065;
export const PEDAL_Z = 0.14;
export const PEDAL = { length: 0.1, width: 0.07, thickness: 0.02 } as const;

/** Chain pitch (half an inch), tooth counts, and the chain line's z. */
export const CHAIN_PITCH = 0.0127;
export const CHAINRING_TEETH = 44;
export const SPROCKET_TEETH = 16;
export const CHAIN_Z = 0.045;
/** Gear module for a chain pitch: the circular pitch is the chain pitch. */
export const CHAIN_MODULE = CHAIN_PITCH / Math.PI;
export const CHAINRING_RADIUS = (CHAIN_MODULE * CHAINRING_TEETH) / 2;
export const SPROCKET_RADIUS = (CHAIN_MODULE * SPROCKET_TEETH) / 2;

// ---- Drive ----

const TAU = Math.PI * 2;

export const GEARING = { chainring: CHAINRING_TEETH, sprocket: SPROCKET_TEETH } as const;
/** Wheel turns per crank turn. */
export const GEAR = GEARING.chainring / GEARING.sprocket;

/** `bind` = 1: amplitude of the once-a-turn drag (the drive crawls past the rubbing spot at half speed). */
const BIND = 0.5;
/** `ratio` = 1 runs the wheels this much faster than the gearing says (the wrong sprocket). */
const RATIO_GAIN = 0.55;
/**
 * `slip` = 1: the wheel falls up to this far behind (rad) as the chain skips, then lurches level
 * when it catches, SLIP_SKIPS times a crank turn. Bounded and periodic, so raising slip at any drive
 * moves the wheel by at most this much.
 */
export const SLIP_JERK = 0.9;
const SLIP_SKIPS = 3;
/** With the chain off, the wheels coast to a stop over this fraction of each crank turn, then sit still. */
const STALL_COAST = 0.5;

const fract = (x: number): number => x - Math.floor(x);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/**
 * Crank angle (rad) for `drive` crank turns: positive is pedalling forward, clockwise seen from the
 * drive side. `bind` (a rubbing brake) drags the whole drive once a turn; the angle stays monotonic.
 */
export function crankAngle(drive: number, f: Faults): number {
  const theta = TAU * drive;
  return theta - f.bind * BIND * Math.sin(theta);
}

/**
 * Where the wheels have got to (in crank radians) with the chain off. Each crank turn they catch up
 * with a lurch, coast to a stop over STALL_COAST of the turn and sit still while the cranks spin
 * on, level with the cranks again at the end of the turn. Periodic, so it never drifts from the
 * cranks, and never behind them: the wheels lead and are caught, so raising `stall` at any drive
 * never runs them backwards.
 */
function coast(theta: number): number {
  const turns = theta / TAU;
  const x = Math.min(1, fract(turns) / STALL_COAST);
  return TAU * (Math.floor(turns) + 1 - (1 - x) * (1 - x));
}

/**
 * Both wheels turn through this angle (they roll on the same ground): the gearing times the crank
 * angle. `ratio` is the wrong gear, `slip` the chain skipping on the sprocket (the wheel lags and
 * lurches), and `stall` the dropped chain (the wheels coast to a stop and catch up, each turn).
 */
export function wheelAngle(drive: number, f: Faults): number {
  const theta = crankAngle(drive, f);
  const driven = GEAR * theta * (1 + RATIO_GAIN * f.ratio) - f.slip * SLIP_JERK * fract((SLIP_SKIPS * theta) / TAU);
  return lerp(driven, GEAR * coast(theta), f.stall);
}

/**
 * How far the chain has moved along its path. It runs with the chainring, except when dropped,
 * when it hangs from the coasting sprocket.
 */
export function chainAdvance(drive: number, f: Faults): number {
  const theta = crankAngle(drive, f);
  return CHAINRING_RADIUS * lerp(theta, coast(theta), f.stall);
}

/** Pedal centre on its crank end (side +1 the drive side): the right crank points forward at angle 0. */
export function pedalCentre(theta: number, side: 1 | -1): Vec3 {
  return [BB[0] + side * CRANK * Math.cos(theta), BB[1] - side * CRANK * Math.sin(theta), side * PEDAL_Z];
}

// ---- Steering ----

/** Steering amplitude (rad): about 8 degrees either side on the correct bike... */
export const STEER = 0.14;
/**
 * ...and about 26 on the wrong twin, so its saddle (which rides the steerer) visibly cocks with the
 * front wheel while the handlebars stay square: the one still-frame cue that the twin is wrong, not
 * a normal bike facing the other way.
 */
export const STEER_TWIN = 0.45;

/**
 * Steering angle (rad, about STEER_AXIS): a swing either side as the bike rides. The amplitude is
 * blended by `variant` as a parameter, so the morph between the two bikes stays continuous.
 * `extra` (the scene's `mech.steer`) is added to the drive's own swing as a fraction of full lock
 * and the sum is clamped at full lock, so an authored swing can reach either lock whatever the
 * drive is doing; at 0 the angle is exactly the drive's.
 */
export function steer(drive: number, variant = 0, extra = 0): number {
  const swing = Math.sin((Math.PI * drive) / 2);
  const fraction = extra === 0 ? swing : Math.min(1, Math.max(-1, swing + extra));
  return STEER * (1 + (STEER_TWIN / STEER - 1) * variant) * fraction;
}

export const steerQuat = (angle: number): Quat => fromAxisAngle(STEER_AXIS, angle);

/** `p` turned by `angle` about the steering axis. */
export function aboutHead(p: Vec3, angle: number): Vec3 {
  const v = rotate(steerQuat(angle), [p[0] - HEAD_TOP[0], p[1] - HEAD_TOP[1], p[2] - HEAD_TOP[2]]);
  return [v[0] + HEAD_TOP[0], v[1] + HEAD_TOP[1], v[2] + HEAD_TOP[2]];
}

// ---- Chain ----

export const CHAIN_SEGMENTS = 24;

/**
 * The closed path of the chain round the sprocket and chainring pitch circles, in the direction it
 * runs: forward along the top run, clockwise round the chainring, back along the bottom run,
 * clockwise round the sprocket. The two runs are the outer common tangents of the two circles.
 */
const CHAIN = (() => {
  const dx = BB[0] - REAR_AXLE[0];
  const dy = BB[1] - REAR_AXLE[1];
  const d = Math.hypot(dx, dy);
  const alpha = Math.atan2(dy, dx);
  const beta = Math.asin((CHAINRING_RADIUS - SPROCKET_RADIUS) / d);
  const top = alpha + Math.PI / 2 + beta; // direction of the top run's tangent points from each centre
  const bottom = alpha - Math.PI / 2 - beta;
  const run = Math.sqrt(d * d - (CHAINRING_RADIUS - SPROCKET_RADIUS) ** 2);
  const ringArc = CHAINRING_RADIUS * (Math.PI + 2 * beta);
  const sprocketArc = SPROCKET_RADIUS * (Math.PI - 2 * beta);
  return { top, bottom, run, ringArc, length: 2 * run + ringArc + sprocketArc };
})();

export const chainLength = (): number => CHAIN.length;
/** Pin to pin along the path, for one of the CHAIN_SEGMENTS segments. */
export const SEGMENT_PITCH = CHAIN.length / CHAIN_SEGMENTS;

const onCircle = (c: Vec3, r: number, a: number): Vec3 => [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a), CHAIN_Z];
const between = (a: Vec3, b: Vec3, t: number): Vec3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), CHAIN_Z];

/** The point `s` along the chain path (any s: the path repeats every chainLength()). */
export function chainPoint(s: number): Vec3 {
  const { top, bottom, run, ringArc } = CHAIN;
  let u = s - CHAIN.length * Math.floor(s / CHAIN.length);
  if (u < run) return between(onCircle(REAR_AXLE, SPROCKET_RADIUS, top), onCircle(BB, CHAINRING_RADIUS, top), u / run);
  u -= run;
  if (u < ringArc) return onCircle(BB, CHAINRING_RADIUS, top - u / CHAINRING_RADIUS);
  u -= ringArc;
  if (u < run)
    return between(onCircle(BB, CHAINRING_RADIUS, bottom), onCircle(REAR_AXLE, SPROCKET_RADIUS, bottom), u / run);
  u -= run;
  return onCircle(REAR_AXLE, SPROCKET_RADIUS, bottom - u / SPROCKET_RADIUS);
}

/** How far the dropped chain falls at the chainring end, and how much of the height of its loop collapses there. */
const CHAIN_DROP = 0.12;
const CHAIN_COLLAPSE = 0.8;

/**
 * A chain point dropped off the chainring by `stall`: it stays on the sprocket, and the further
 * forward it is, the further it falls and the flatter its loop, so it hangs slack under the bottom
 * bracket.
 */
export function chainSag(p: Vec3, stall: number): Vec3 {
  if (stall === 0) return p;
  const t = Math.min(1, Math.max(0, (p[0] - REAR_AXLE[0]) / (BB[0] + CHAINRING_RADIUS - REAR_AXLE[0])));
  const w = stall * t * t * (3 - 2 * t);
  // The line of the bottom run (held level past its ends), which the top run falls toward.
  const s0 = onCircle(REAR_AXLE, SPROCKET_RADIUS, CHAIN.bottom);
  const s1 = onCircle(BB, CHAINRING_RADIUS, CHAIN.bottom);
  const k = Math.min(1, Math.max(0, (p[0] - s0[0]) / (s1[0] - s0[0])));
  const low = lerp(s0[1], s1[1], k);
  return [p[0], p[1] - w * (CHAIN_DROP + CHAIN_COLLAPSE * Math.max(0, p[1] - low)), p[2]];
}

/** Segment `k`: its centre and angle about z, on the chord between its two pins on the (dropped) path. */
export function chainSegment(k: number, advance: number, stall: number): { centre: Vec3; angle: number } {
  const s = k * SEGMENT_PITCH + advance;
  const a = chainSag(chainPoint(s), stall);
  const b = chainSag(chainPoint(s + SEGMENT_PITCH), stall);
  return {
    centre: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, CHAIN_Z],
    angle: Math.atan2(b[1] - a[1], b[0] - a[0]),
  };
}
