import { compose, fromAxisAngle, type PartTransform, type Quat } from '../../math/transform';
import { hash01, mulberry32, pcg } from '../../math/hash';
import { lerp, type Vec3 } from '../../math/vec';
import type { Faults } from '../../timeline/sceneState';
import type { BoundPoint, Mechanism, MechanismPart } from '../types';
import { bracketSampler, crankSampler, gearSampler, lighteningHoles, plateSampler, type PartSampler } from './shapes';

const TAU = Math.PI * 2;

const at = (x: number, y: number, z: number): PartTransform => ({ position: [x, y, z], quaternion: [0, 0, 0, 1] });

const parts: MechanismPart[] = [
  { id: 'drive-gear', role: 'core', explodedOffset: at(-1.5, 0, 1.2) },
  { id: 'driven-gear', role: 'body', explodedOffset: at(1.5, 0.5, 1.5) },
  { id: 'crank', role: 'core', explodedOffset: at(2, 1.5, 2.5) },
  { id: 'frame', role: 'body', explodedOffset: at(0, 0, -2) },
  { id: 'loose-bracket', role: 'drift', explodedOffset: at(0, -2, 1.5) },
];

// The crank is a ~2% area bar: 5% of the points keeps it warm without blowing it out to white.
const WEIGHTS = [0.26, 0.2, 0.05, 0.4, 0.09];

// Pitch radii 1.2 and 0.6 with 18 and 9 teeth share a module (2r / teeth), and the centres sit
// 1.8 apart, so the involute teeth mesh (index.test.ts sweeps them through a tooth period).
export const GEAR_TRAIN = {
  drive: { pitchRadius: 1.2, teeth: 18 },
  driven: { pitchRadius: 0.6, teeth: 9 },
} as const;

// The frame is drilled where the two axles enter it.
const samplers: PartSampler[] = [
  gearSampler(GEAR_TRAIN.drive.pitchRadius, GEAR_TRAIN.drive.teeth, lighteningHoles(5, 0.6, 0.2)),
  gearSampler(GEAR_TRAIN.driven.pitchRadius, GEAR_TRAIN.driven.teeth),
  crankSampler(),
  plateSampler(4.2, 2.8, 0.15, 0.3, [
    [-0.9, 0],
    [0.9, 0],
  ]),
  bracketSampler(),
];

function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

const fract = (x: number): number => x - Math.floor(x);

/** Quaternion that applies `a` (about z) first, then `x` (about x). */
function spinTilt(zAngle: number, xAngle: number): Quat {
  const rz: PartTransform = { position: [0, 0, 0], quaternion: fromAxisAngle([0, 0, 1], zAngle) };
  const rx: PartTransform = { position: [0, 0, 0], quaternion: fromAxisAngle([1, 0, 0], xAngle) };
  return compose(rx, rz).quaternion;
}

/** The drive angle after the faults that act on the whole train (bind, stall). */
function driveAngle(drive: number, f: Faults): number {
  let theta = TAU * drive;
  theta -= f.bind * 0.35 * Math.sin(2 * theta);
  const u = theta / Math.PI;
  const stalled = Math.PI * (Math.floor(u) + smoothstep(0.4, 1, fract(u)));
  return lerp(theta, stalled, f.stall);
}

function pose(drive: number, f: Faults, variant: number): PartTransform[] {
  const theta = driveAngle(drive, f);

  // Correct: driven turns against the drive at twice its rate. Twin: it turns with it, at 1x.
  const gearing = lerp(-2, 1, variant);
  const phi = gearing * theta * (1 + 0.6 * f.ratio) - f.slip * 0.8 * (fract((3 * theta) / TAU) - 0.5);

  // The driven gear (and the crank that rides on it) sits coaxial with the drive gear in the twin.
  const drivenCentre: Vec3 = [lerp(0.9, -0.9, variant), 0, lerp(0, 0.3, variant)];
  const tilt = f.misalign * 0.25 * Math.sin(theta);
  const sag = f.misalign * 0.08;
  const drivenPlace = (): PartTransform => ({
    position: [drivenCentre[0], drivenCentre[1] + sag, drivenCentre[2]],
    quaternion: spinTilt(phi, tilt),
  });

  const out: PartTransform[] = [
    { position: [-0.9, 0, 0], quaternion: spinTilt(theta, 0) },
    drivenPlace(),
    drivenPlace(), // the crank turns with the driven gear about the driven gear's centre
    at(0, 0, -0.2),
    at(1.6, -1.1, 0),
  ];

  if (f.jitter > 0) {
    const tick = Math.floor(drive * 40);
    out.forEach((t, i) => {
      for (let axis = 0; axis < 3; axis++) {
        t.position[axis] += f.jitter * 0.03 * (hash01(tick, i * 3 + axis) * 2 - 1);
      }
    });
  }
  return out;
}

function samplePoints(budget: number, seed: number): BoundPoint[] {
  // Cumulative rounding: the last part absorbs the remainder so the total is exactly `budget`.
  const total = Math.max(0, Math.floor(budget));
  const points: BoundPoint[] = [];
  let cum = 0;
  let edge = 0;
  for (let part = 0; part < parts.length; part++) {
    cum += WEIGHTS[part];
    const nextEdge = part === parts.length - 1 ? total : Math.min(total, Math.round(total * cum));
    const rng = mulberry32(pcg((seed + Math.imul(part + 1, 0x9e3779b9)) >>> 0));
    samplers[part](nextEdge - edge, rng).forEach((sample, i) => {
      const n = edge + i;
      points.push({ part, ...sample, seed: pcg((seed + Math.imul(n, 0x9e3779b9)) >>> 0) & 0xffffff });
    });
    edge = nextEdge;
  }
  return points;
}

/** Display name and one-line description for the comparison page (src/mechanisms/meta.ts). */
export const label = 'Gears';
export const blurb =
  'The placeholder gear train: an 18-tooth gear drives a 9-tooth pinion and crank at twice its speed, and the wrong twin mounts the pinion on the drive axle so it turns along with it.';

export const gears: Mechanism = { id: 'gears', parts, pose, samplePoints };
