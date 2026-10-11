import type { BufferGeometry } from 'three';
import { compose, fromAxisAngle, rotate, type PartTransform, type Quat } from '../../math/transform';
import { hash01, mulberry32, pcg } from '../../math/hash';
import type { Vec3 } from '../../math/vec';
import { samplePart } from '../../shapes/sample';
import type { Faults } from '../../timeline/sceneState';
import type { BoundPoint, Mechanism, MechanismPart, Role } from '../types';
import {
  conrodAngle,
  crankAngle,
  ENGINE,
  GOVERNOR,
  governorAngle,
  governorOmega,
  governorSpin,
  LEVER,
  leverAngle,
  pistonDistance,
  sleeveY,
  STEM_X,
  stemY,
} from './kinematics';
import {
  bed,
  belt,
  conrod,
  crank,
  crosshead,
  cylinder,
  fittings,
  flywheel,
  governorArm,
  governorDrive,
  governorLever,
  governorLink,
  governorSleeve,
  governorSpindle,
  governorStand,
  surfaceArea,
  valveStem,
} from './shapes';

export const label = 'Steam engine';
export const blurb =
  'A horizontal mill engine whose flyball governor is the small part that keeps the whole machine honest.';

/** Engine coordinates to machine space: centres the machine on the origin. */
export const OFFSET: Vec3 = [0.25, -0.12, 0];

const at = (x: number, y: number, z: number, axis?: Vec3, angle = 0): PartTransform => ({
  position: [x, y, z],
  quaternion: axis ? fromAxisAngle(axis, angle) : [0, 0, 0, 1],
});

const X: Vec3 = [1, 0, 0];
const Y: Vec3 = [0, 1, 0];
const Z: Vec3 = [0, 0, 1];

interface PartSpec extends MechanismPart {
  geometry: () => BufferGeometry;
  /** Point density relative to the rest of its group (core, or body + drift); default 1. */
  density?: number;
}

// Body: the engine proper. Core: the governor assembly, the feedback loop. Drift: small fittings.
const SPECS: PartSpec[] = [
  { id: 'flywheel', role: 'body', explodedOffset: at(1.3, 0.3, -1.4, Y, 0.7), geometry: flywheel },
  { id: 'crank', role: 'body', explodedOffset: at(0.7, -0.4, 1.0, X, 0.5), geometry: crank },
  { id: 'conrod', role: 'body', explodedOffset: at(0.2, 0.9, 0.9, Z, 0.5), geometry: conrod },
  { id: 'crosshead', role: 'body', explodedOffset: at(-0.4, -0.7, 1.1), geometry: crosshead },
  { id: 'cylinder', role: 'body', explodedOffset: at(-1.3, 0.2, 0.5), geometry: cylinder },
  { id: 'bed', role: 'body', explodedOffset: at(0, -1.3, 0), geometry: bed },
  { id: 'belt', role: 'body', explodedOffset: at(0.4, 0.7, -1.0, Z, 0.4), geometry: belt },
  { id: 'gov-drive', role: 'core', explodedOffset: at(0.3, -0.2, -0.5), geometry: governorDrive },
  { id: 'gov-stand', role: 'body', explodedOffset: at(0, -0.45, -0.3), geometry: governorStand },
  { id: 'gov-spindle', role: 'core', explodedOffset: at(0, 0.5, 0), geometry: governorSpindle },
  { id: 'gov-arm-a', role: 'core', explodedOffset: at(0.45, 0.25, 0.2), geometry: governorArm },
  { id: 'gov-arm-b', role: 'core', explodedOffset: at(-0.45, 0.25, 0.2), geometry: governorArm },
  { id: 'gov-link-a', role: 'core', explodedOffset: at(0.3, -0.1, 0.35), geometry: governorLink },
  { id: 'gov-link-b', role: 'core', explodedOffset: at(-0.3, -0.1, 0.35), geometry: governorLink },
  { id: 'gov-sleeve', role: 'core', explodedOffset: at(0, -0.3, 0.3), geometry: governorSleeve },
  { id: 'gov-lever', role: 'core', explodedOffset: at(-0.3, 0.35, 0.35, Z, 0.3), geometry: governorLever },
  { id: 'valve-stem', role: 'core', explodedOffset: at(-0.2, 0.5, 0.3), geometry: valveStem },
  { id: 'fittings', role: 'drift', explodedOffset: at(0.3, 1.0, 0.8), geometry: fittings, density: 1.3 },
];

const parts: MechanismPart[] = SPECS.map(({ id, role, explodedOffset }) => ({ id, role, explodedOffset }));

export function partIndex(id: string): number {
  const i = SPECS.findIndex((s) => s.id === id);
  if (i < 0) throw new Error(`steam: no part ${id}`);
  return i;
}

// Point allocation: the core takes CORE_SHARE of the points, the body and drift the rest. Within
// each group a part's share is its surface area times its `density`, so parts are evenly dense and a
// small part never outshines its neighbours; the drift fittings sit a little denser than the body so
// they show. The core is small, so it is about 3x as dense as the body (warm and bright, not blown
// out: the lit-faces look test still sees the key light through it).
const CORE_SHARE = 0.25;

/** Build every part's geometry once, on first use (it is constant). */
let built: { geoms: BufferGeometry[]; weights: number[]; density: number[] } | undefined;
function geometry() {
  if (built) return built;
  const geoms = SPECS.map((s) => s.geometry());
  const area = geoms.map(surfaceArea);
  const mass = area.map((a, i) => a * (SPECS[i].density ?? 1));
  const isCore = (i: number) => SPECS[i].role === 'core';
  const groupMass = (core: boolean) => mass.reduce((sum, m, i) => sum + (isCore(i) === core ? m : 0), 0);
  const coreMass = groupMass(true);
  const restMass = groupMass(false);
  const weights = mass.map((m, i) => (isCore(i) ? (CORE_SHARE * m) / coreMass : ((1 - CORE_SHARE) * m) / restMass));
  built = { geoms, weights, density: weights.map((w, i) => w / area[i]) };
  return built;
}

/** Points per unit area of each part, relative to the body's (for tests and tuning). */
export function partDensities(): { id: string; role: Role; density: number }[] {
  const { density } = geometry();
  const body = density[partIndex('flywheel')];
  return SPECS.map((s, i) => ({ id: s.id, role: s.role, density: density[i] / body }));
}

const quat = (axis: Vec3, angle: number): Quat => fromAxisAngle(axis, angle);
const turn = (a: Quat, b: Quat): Quat =>
  compose({ position: [0, 0, 0], quaternion: a }, { position: [0, 0, 0], quaternion: b }).quaternion;
const place = (p: Vec3, q: Quat = [0, 0, 0, 1]): PartTransform => ({
  position: [p[0] + OFFSET[0], p[1] + OFFSET[1], p[2] + OFFSET[2]],
  quaternion: q,
});

/** `misalign` = 1 tilts the flywheel this far off its shaft; the tilt turns with it, so it wobbles. */
const WOBBLE = 0.3;
const JITTER_SHAKE = 0.025;
const JITTER_RATTLE = 0.012;

function pose(drive: number, f: Faults, variant: number): PartTransform[] {
  const { shaftX: sx, shaftY: sy, lineZ } = ENGINE;
  const theta = crankAngle(drive, f, variant);
  const crossX = sx - pistonDistance(theta);

  // Crank pin at C + r(-cos, sin): the crank's local +x turned by pi - theta. The flywheel turns with it.
  const crankQ = quat(Z, Math.PI - theta);
  const flyQ = turn(quat(Z, -theta), quat(X, WOBBLE * f.misalign));

  // Governor: spun through the belt and 1:1 bevels; arms at the conical-pendulum angle.
  const psi = governorSpin(theta, f);
  const spinQ = quat(Y, psi);
  const g = governorAngle(governorOmega(f, variant));
  const { x: gx, z: gz, pivotY, pivotOffset: e, linkAt: a, link: b } = GOVERNOR;
  const lean = Math.asin((a * Math.sin(g)) / b);
  const onSpindle = (p: Vec3): Vec3 => {
    const v = rotate(spinQ, p);
    return [gx + v[0], pivotY + v[1], gz + v[2]];
  };
  const sleeve = sleeveY(g);
  const phi = leverAngle(sleeve, variant);

  // Moving parts by id; every other part is static, built in engine coordinates.
  const moving: Record<string, PartTransform> = {
    flywheel: place([sx, sy, ENGINE.flywheelZ], flyQ),
    crank: place([sx, sy, 0], crankQ),
    conrod: place([crossX, sy, lineZ], quat(Z, conrodAngle(theta))),
    crosshead: place([crossX, sy, lineZ]),
    'gov-drive': place([gx, GOVERNOR.shaftY, gz], quat(Z, -psi)),
    'gov-spindle': place([gx, pivotY, gz], spinQ),
    'gov-arm-a': place(onSpindle([e, 0, 0]), turn(spinQ, quat(Z, g))),
    'gov-arm-b': place(onSpindle([-e, 0, 0]), turn(spinQ, quat(Z, -g))),
    'gov-link-a': place(onSpindle([e + a * Math.sin(g), -a * Math.cos(g), 0]), turn(spinQ, quat(Z, -lean))),
    'gov-link-b': place(onSpindle([-e - a * Math.sin(g), -a * Math.cos(g), 0]), turn(spinQ, quat(Z, lean))),
    'gov-sleeve': place([gx, sleeve, gz], spinQ),
    'gov-lever': place([LEVER.fulcrumX, LEVER.fulcrumY, LEVER.z], quat(Z, phi)),
    'valve-stem': place([STEM_X, stemY(phi), LEVER.z]),
  };
  const out = SPECS.map((s) => moving[s.id] ?? place([0, 0, 0]));

  if (f.jitter > 0) {
    // The whole engine shakes on its bed, and every part rattles a little on top of that.
    const tick = Math.floor(drive * 60);
    const shake = [0, 1, 2].map((k) => JITTER_SHAKE * (hash01(tick, 997 + k) * 2 - 1));
    out.forEach((t, i) => {
      for (let k = 0; k < 3; k++) {
        t.position[k] += f.jitter * (shake[k] + JITTER_RATTLE * (hash01(tick, i * 3 + k) * 2 - 1));
      }
    });
  }
  return out;
}

function samplePoints(budget: number, seed: number): BoundPoint[] {
  // Cumulative rounding: the last part absorbs the remainder so the total is exactly `budget`.
  const { geoms, weights } = geometry();
  const total = Math.max(0, Math.floor(budget));
  const points: BoundPoint[] = [];
  let cum = 0;
  let edge = 0;
  for (let part = 0; part < SPECS.length; part++) {
    cum += weights[part];
    const nextEdge = part === SPECS.length - 1 ? total : Math.min(total, Math.round(total * cum));
    const rng = mulberry32(pcg((seed + Math.imul(part + 1, 0x9e3779b9)) >>> 0));
    const { positions, normals } = samplePart(geoms[part], nextEdge - edge, rng);
    positions.forEach((p, i) => {
      const n = edge + i;
      const nm = normals[i];
      points.push({
        part,
        local: p,
        localTwin: [p[0], p[1], p[2]],
        normal: nm,
        normalTwin: [nm[0], nm[1], nm[2]],
        seed: pcg((seed + Math.imul(n, 0x9e3779b9)) >>> 0) & 0xffffff,
      });
    });
    edge = nextEdge;
  }
  return points;
}

export const steam: Mechanism = { id: 'steam', parts, pose, samplePoints };
