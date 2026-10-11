// The reveal's mannequin: a schematic, faceless artist's mannequin, capsules round one tapered
// torso, seated on the wrong twin's saddle in an ordinary upright town-bike riding pose. It is the
// correct bike's rider moved with the saddle: its hands close on air where the correct bike's grips
// sit relative to the saddle, and its feet hang where the correct bike's pedals would be, so nothing
// it reaches for is there.
//
// Built in the saddle's part space (metres, about the seat clamp; x forward, y up, z toward the drive
// side), so it turns with the saddle, which on the twin steers. It never pedals: one fixed pose.
// Proportions are fractions of stature from Winter, Biomechanics and Motor Control of Human Movement,
// fig. 4.1 (after Drillis and Contini, 1966).
import { CapsuleGeometry, Matrix4, Quaternion, Vector3, type BufferGeometry } from 'three';
import type { Vec3 } from '../../math/vec';
import { ellipticFrustum } from '../../shapes/primitives';
import { merge } from '../partGeometry';
import { pedalCentre, PEDAL, SADDLE_TOP, SEAT_CLAMP, STEER_MOUNT } from './kinematics';
import { GRIPS, SADDLE } from './shapes';

/** Stature (m). */
export const RIDER_HEIGHT = 1.75;

/** Segment lengths, widths and joint heights as fractions of stature (Winter, fig. 4.1). */
export const PROPORTIONS = {
  /** Chin to the crown of the head. */
  head: 0.13,
  /** Shoulder joint, standing. */
  shoulderHeight: 0.818,
  /** Shoulder joint to shoulder joint. */
  shoulderWidth: 0.259,
  chestWidth: 0.174,
  upperArm: 0.186,
  forearm: 0.146,
  /** Wrist to fingertip. */
  hand: 0.108,
  /** Hip joint, standing. */
  hipHeight: 0.53,
  /** Hip joint to hip joint. */
  hipWidth: 0.191,
  thigh: 0.245,
  shank: 0.246,
  /** Ankle joint above the sole. */
  ankleHeight: 0.039,
  /** Heel to toe. */
  foot: 0.152,
} as const;

const DEG = Math.PI / 180;
const len = (k: keyof typeof PROPORTIONS): number => PROPORTIONS[k] * RIDER_HEIGHT;

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (a: Vec3): Vec3 => scale(a, 1 / Math.hypot(...a));
/** A unit direction in the side plane (xy), `deg` above forward. */
const pitched = (deg: number): Vec3 => [Math.cos(deg * DEG), Math.sin(deg * DEG), 0];
const side = (s: number, z: number): Vec3 => [0, 0, s * z];

// ---- The pose (judged by eye; the angles in the literature are loose) ----

/** The sit bones rest this far behind the saddle-top point, on the broad back of the saddle... */
const SEAT_BACK = 0.07;
/** ...and the hip joints sit this little above its top surface (a schematic pelvis sinks in). */
const HIP_LIFT = 0.02;
/** Torso pitch from horizontal: an upright town-bike rider, leaning a little forward. */
const TORSO_PITCH = 78;
/** The neck and head stand a little straighter than the torso. */
const NECK_PITCH = 84;
/** The chest line (its breadth from the table), as a fraction of the way from the hips to the shoulders. */
export const CHEST_AT = 0.72;
/** The hands point forward and down, closed round the grips, which sit this far along the hand. */
const HAND_PITCH = -60;
const GRIP_AT = 0.25;
/** Elbows bend down and a little out, the upper arms close to the torso; knees bend forward and a little out. */
const ELBOW_POLE: Vec3 = [-0.3, -1, 0.2];
const KNEE_POLE: Vec3 = [1, 0.1, 0.12];
/**
 * Where on its pedal circle each foot is placed, in degrees above forward seen from the drive side
 * (drive side first). It does not pedal: both feet hang a little below level and forward, as a
 * coasting rider's do, which keeps them clear of the twin's pedals however far the saddle steers.
 */
const FEET_AT: [number, number] = [-20, -30];
/** The ball of the foot, over the pedal spindle, is this far from the heel; the toes dip a little. */
const BALL_AT = 0.7;
const FOOT_PITCH = -12;
/** The ankle stands over the sole this far from the heel. */
const ANKLE_AT = 0.25;

/** The two-bone joint (elbow or knee) between `root` and `end`, bending toward `pole`. */
function joint(root: Vec3, end: Vec3, a: number, b: number, pole: Vec3): Vec3 {
  const d = Math.hypot(...sub(end, root));
  if (d >= a + b || d <= Math.abs(a - b)) throw new Error('rider: a limb cannot reach its target');
  const u = unit(sub(end, root));
  const along = (a * a - b * b + d * d) / (2 * d);
  const p = unit(sub(pole, scale(u, dot(pole, u))));
  return add(add(root, scale(u, along)), scale(p, Math.sqrt(a * a - along * along)));
}

/** Every joint of the posed mannequin, in the saddle's part space (metres). Index 0 is the drive side. */
export interface Skeleton {
  /** Between the hip joints. */
  hip: Vec3;
  /** Between the shoulder joints. */
  shoulder: Vec3;
  chin: Vec3;
  crown: Vec3;
  /** The ends of the chest line: the chest breadth of the table, at CHEST_AT (a measure, not a solid). */
  chest: [Vec3, Vec3];
  hips: [Vec3, Vec3];
  shoulders: [Vec3, Vec3];
  elbows: [Vec3, Vec3];
  wrists: [Vec3, Vec3];
  fingertips: [Vec3, Vec3];
  /** Where each closed hand holds: the centre of its grip on (empty) air. */
  grips: [Vec3, Vec3];
  knees: [Vec3, Vec3];
  ankles: [Vec3, Vec3];
  /** The sole under each ankle. */
  soles: [Vec3, Vec3];
  heels: [Vec3, Vec3];
  toes: [Vec3, Vec3];
}

const pair = <T>(f: (s: 1 | -1, i: 0 | 1) => T): [T, T] => [f(1, 0), f(-1, 1)];

export function riderSkeleton(): Skeleton {
  const top = sub(SADDLE_TOP, SEAT_CLAMP);
  const tilt = SADDLE.noseDown;
  const saddleForward: Vec3 = [Math.cos(tilt), -Math.sin(tilt), 0];
  const saddleUp: Vec3 = [Math.sin(tilt), Math.cos(tilt), 0];
  const hip = add(add(top, scale(saddleForward, -SEAT_BACK)), scale(saddleUp, HIP_LIFT));
  const shoulder = add(hip, scale(pitched(TORSO_PITCH), len('shoulderHeight') - len('hipHeight')));
  const neck = pitched(NECK_PITCH);
  const chin = add(shoulder, scale(neck, RIDER_HEIGHT - len('head') - len('shoulderHeight')));
  const crown = add(chin, scale(neck, len('head')));
  const chestCentre = add(hip, scale(sub(shoulder, hip), CHEST_AT));

  const handDir = pitched(HAND_PITCH);
  // Where the correct bike's grips and pedals sit relative to its saddle: in the saddle's part space,
  // relative to the seat clamp.
  const grips = pair((_, i) => sub(add(STEER_MOUNT, GRIPS[i]), SEAT_CLAMP));
  const wrists = pair((_, i) => sub(grips[i], scale(handDir, GRIP_AT * len('hand'))));
  const shoulders = pair((s) => add(shoulder, side(s, len('shoulderWidth') / 2)));
  const elbows = pair((s, i) =>
    joint(shoulders[i], wrists[i], len('upperArm'), len('forearm'), [ELBOW_POLE[0], ELBOW_POLE[1], s * ELBOW_POLE[2]]),
  );

  const footDir = pitched(FOOT_PITCH);
  const footUp = pitched(FOOT_PITCH + 90);
  const heels = pair((s, i) => {
    // pedalCentre(theta, side) puts the drive-side pedal at -theta above forward, the other at pi - theta.
    const a = FEET_AT[i] * DEG;
    const pedal = sub(pedalCentre(s === 1 ? -a : Math.PI - a, s), SEAT_CLAMP);
    const ball = add(pedal, [0, PEDAL.thickness / 2, 0]);
    return sub(ball, scale(footDir, BALL_AT * len('foot')));
  });
  const soles = pair((_, i) => add(heels[i], scale(footDir, ANKLE_AT * len('foot'))));
  const ankles = pair((_, i) => add(soles[i], scale(footUp, len('ankleHeight'))));
  const hips = pair((s) => add(hip, side(s, len('hipWidth') / 2)));
  const knees = pair((s, i) =>
    joint(hips[i], ankles[i], len('thigh'), len('shank'), [KNEE_POLE[0], KNEE_POLE[1], s * KNEE_POLE[2]]),
  );

  return {
    hip,
    shoulder,
    chin,
    crown,
    chest: pair((s) => add(chestCentre, side(s, len('chestWidth') / 2))),
    hips,
    shoulders,
    elbows,
    wrists,
    fingertips: pair((_, i) => add(wrists[i], scale(handDir, len('hand')))),
    grips,
    knees,
    ankles,
    soles,
    heels,
    toes: pair((_, i) => add(heels[i], scale(footDir, len('foot')))),
  };
}

// ---- The solids ----

/** A capsule of `radius` round the segment from `a` to `b` (its caps reach `radius` past each end). */
function capsule(a: Vec3, b: Vec3, radius: number): BufferGeometry {
  const d = sub(b, a);
  const g = new CapsuleGeometry(radius, Math.hypot(...d), 4, 10); // along y, centred
  g.deleteAttribute('uv');
  const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), new Vector3(...d).normalize());
  return g.applyQuaternion(q).translate(...scale(add(a, b), 0.5));
}

/** A capsule whose whole length, caps included, runs from `a` to `b`. */
function capsuleWithin(a: Vec3, b: Vec3, radius: number): BufferGeometry {
  const u = unit(sub(b, a));
  return capsule(add(a, scale(u, radius)), sub(b, scale(u, radius)), radius);
}

/** Torso depth, front to back, as a fraction of its width at every height. */
const TORSO_DEPTH = 0.6;

/**
 * The torso: one tapered solid (an elliptical frustum) from the hip joints, as wide as they are
 * apart, to the shoulder joints, likewise, its depth a fixed fraction of its width. Its front is
 * one smooth, gently convex surface: no paired lobes over a narrower waist.
 */
function torso(k: Skeleton): BufferGeometry {
  const axis = sub(k.shoulder, k.hip);
  const up = unit(axis);
  const lateral: Vec3 = [0, 0, 1];
  // Square to the axis and the lateral, pointing back (so that lateral x up = back, a rotation).
  const back: Vec3 = [-up[1], up[0], 0];
  const end = (width: number): [number, number] => [width / 2, (TORSO_DEPTH * width) / 2];
  return ellipticFrustum(end(len('hipWidth')), end(len('shoulderWidth')), Math.hypot(...axis)).applyMatrix4(
    new Matrix4().makeBasis(new Vector3(...lateral), new Vector3(...up), new Vector3(...back)).setPosition(...k.hip),
  );
}

/**
 * Shoulder line: a slim bar whose rounded ends stop SHOULDER_INSET inside the shoulder joints, so the
 * upper arms, not a knob of the bar, round off the shoulders.
 */
const SHOULDER_RADIUS = 0.035;
const SHOULDER_INSET = 0.03;

function shoulderLine(k: Skeleton): BufferGeometry {
  const across = unit(sub(k.shoulders[1], k.shoulders[0]));
  return capsuleWithin(
    add(k.shoulders[0], scale(across, SHOULDER_INSET)),
    sub(k.shoulders[1], scale(across, SHOULDER_INSET)),
    SHOULDER_RADIUS,
  );
}

/** The mannequin as one closed surface (head, neck, torso, pelvis, limbs), in part space. */
export function riderGeometry(): BufferGeometry {
  const k = riderSkeleton();
  const limbs = [0, 1].flatMap((i) => [
    capsule(k.shoulders[i], k.elbows[i], 0.042),
    capsule(k.elbows[i], k.wrists[i], 0.034),
    capsuleWithin(k.wrists[i], k.fingertips[i], 0.03),
    capsule(k.hips[i], k.knees[i], 0.062),
    capsule(k.knees[i], k.ankles[i], 0.045),
    capsuleWithin(k.heels[i], k.toes[i], 0.032),
  ]);
  return merge(
    capsuleWithin(k.chin, k.crown, 0.085), // head
    capsule(k.shoulder, k.chin, 0.045), // neck
    torso(k),
    shoulderLine(k),
    capsule(k.hips[0], k.hips[1], 0.08), // pelvis
    ...limbs,
  );
}
