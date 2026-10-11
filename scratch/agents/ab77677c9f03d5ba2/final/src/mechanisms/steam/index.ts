import type { BufferGeometry } from 'three';
import { compose, fromAxisAngle, rotate, type PartTransform, type Quat } from '../../math/transform';
import { hash01, mulberry32, pcg } from '../../math/hash';
import { lerpVec3, type Vec3 } from '../../math/vec';
import { samplePart } from '../../shapes/sample';
import type { Faults } from '../../timeline/sceneState';
import type { BoundPoint, Mechanism, MechanismPart, Role } from '../types';
import {
  BONNET_TOP,
  conrodAngle,
  crankAngle,
  ENGINE,
  GOVERNOR,
  governorAngle,
  governorOmega,
  governorSpin,
  LEAN_FOOT_Y,
  LEVER,
  leverAngle,
  pistonDistance,
  sleeveY,
  STEM_LENGTH,
  STEM_X,
  stemY,
  TWIN_LEAN,
  TWIN_STEM_LEAN,
} from './kinematics';
import {
  bed,
  belt,
  beltSag,
  conrod,
  crank,
  crosshead,
  cylinder,
  fittings,
  floor,
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

export { FLOOR } from './shapes';

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
  /** A fixed share of its group's points instead of one by area (the sparse, dim floor). */
  share?: number;
}

/** The floor's share of the body + drift points: a dim ground, not a surface that competes. */
export const FLOOR_SHARE = 0.02;

// Body: the engine proper and the floor it stands on. Core: the governor assembly, the feedback
// loop. Drift: small fittings.
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
  { id: 'floor', role: 'body', explodedOffset: at(0, -0.8, 0), geometry: floor, share: FLOOR_SHARE },
];

const parts: MechanismPart[] = SPECS.map(({ id, role, explodedOffset }) => ({ id, role, explodedOffset }));

export function partIndex(id: string): number {
  const i = SPECS.findIndex((s) => s.id === id);
  if (i < 0) throw new Error(`steam: no part ${id}`);
  return i;
}

// Point allocation: the core takes CORE_SHARE of the points, the body and drift the rest. Within
// each group a part with a fixed `share` (the floor) takes that, and the others split the remainder
// by surface area times `density`, so parts are evenly dense and a small part never outshines its
// neighbours; the drift fittings sit a little denser than the body so they show. The governor is
// about 5% of the surface, so 15% still draws it denser than the body; it is bright because it is
// warm, not because it is dense (at 25% its balls blew out to white).
const CORE_SHARE = 0.15;

/** Build every part's geometry once, on first use (it is constant). */
let built: { geoms: BufferGeometry[]; weights: number[]; density: number[] } | undefined;
function geometry() {
  if (built) return built;
  const geoms = SPECS.map((s) => s.geometry());
  const area = geoms.map(surfaceArea);
  const mass = area.map((a, i) => a * (SPECS[i].density ?? 1));
  const isCore = (i: number) => SPECS[i].role === 'core';
  const fixed = (i: number) => SPECS[i].share;
  const inGroup = (core: boolean) => SPECS.map((_, i) => i).filter((i) => isCore(i) === core);
  const weights = mass.map(() => 0);
  for (const core of [true, false]) {
    const group = inGroup(core);
    const total = core ? CORE_SHARE : 1 - CORE_SHARE;
    const fixedShare = group.reduce((sum, i) => sum + (fixed(i) ?? 0), 0);
    const byArea = group.filter((i) => fixed(i) === undefined);
    const areaMass = byArea.reduce((sum, i) => sum + mass[i], 0);
    for (const i of group) {
      const f = fixed(i);
      weights[i] = f !== undefined ? total * f : (total * (1 - fixedShare) * mass[i]) / areaMass;
    }
  }
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

/** The twin's governor parts lean about the spindle foot; `p` and `q` are its pose in engine coordinates. */
function leaning(lean: Quat, p: Vec3, q: Quat): PartTransform {
  const foot: Vec3 = [GOVERNOR.x, LEAN_FOOT_Y, GOVERNOR.z];
  const leaned = compose(
    { position: foot, quaternion: lean },
    { position: [p[0] - foot[0], p[1] - foot[1], p[2] - foot[2]], quaternion: q },
  );
  return place(leaned.position, leaned.quaternion);
}

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
  const tilt = Math.asin((a * Math.sin(g)) / b); // each lower link off the vertical
  const onSpindle = (p: Vec3): Vec3 => {
    const v = rotate(spinQ, p);
    return [gx + v[0], pivotY + v[1], gz + v[2]];
  };
  const sleeve = sleeveY(g);
  const phi = leverAngle(sleeve, variant);
  // The twin: the spindle leans toward the flywheel, and the valve stem has dropped onto the valve
  // and leans over, so the governor is visibly cut off from the engine it should be governing.
  const lean = quat(Z, -TWIN_LEAN * variant);
  const stemFoot: Vec3 = [STEM_X, BONNET_TOP - 0.02, LEVER.z];
  const stemQ = quat(Z, TWIN_STEM_LEAN * variant);
  const fallen = rotate(quat(Z, TWIN_STEM_LEAN), [0, STEM_LENGTH, 0]);
  const stemTop = lerpVec3(
    [STEM_X, stemY(phi), LEVER.z],
    [stemFoot[0] + fallen[0], stemFoot[1] + fallen[1], stemFoot[2] + fallen[2]],
    variant,
  );

  // Moving parts by id; every other part is static, built in engine coordinates.
  const moving: Record<string, PartTransform> = {
    flywheel: place([sx, sy, ENGINE.flywheelZ], flyQ),
    crank: place([sx, sy, 0], crankQ),
    conrod: place([crossX, sy, lineZ], quat(Z, conrodAngle(theta))),
    crosshead: place([crossX, sy, lineZ]),
    'gov-drive': place([gx, GOVERNOR.shaftY, gz], quat(Z, -psi)),
    'gov-spindle': leaning(lean, [gx, pivotY, gz], spinQ),
    'gov-arm-a': leaning(lean, onSpindle([e, 0, 0]), turn(spinQ, quat(Z, g))),
    'gov-arm-b': leaning(lean, onSpindle([-e, 0, 0]), turn(spinQ, quat(Z, -g))),
    'gov-link-a': leaning(lean, onSpindle([e + a * Math.sin(g), -a * Math.cos(g), 0]), turn(spinQ, quat(Z, -tilt))),
    'gov-link-b': leaning(lean, onSpindle([-e - a * Math.sin(g), -a * Math.cos(g), 0]), turn(spinQ, quat(Z, tilt))),
    'gov-sleeve': leaning(lean, [gx, sleeve, gz], spinQ),
    'gov-lever': place([LEVER.fulcrumX, LEVER.fulcrumY, LEVER.z], quat(Z, phi)),
    'valve-stem': place(stemTop, stemQ),
  };
  const out = SPECS.map((s) => moving[s.id] ?? place([0, 0, 0]));

  if (f.jitter > 0) {
    // The whole engine shakes on its bed, and every part rattles a little on top of that. The
    // floor is the ground: it stays put.
    const tick = Math.floor(drive * 60);
    const shake = [0, 1, 2].map((k) => JITTER_SHAKE * (hash01(tick, 997 + k) * 2 - 1));
    out.forEach((t, i) => {
      if (SPECS[i].id === 'floor') return;
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
    // A pose-only twin, but for the belt: in the twin it hangs slack.
    const slack = SPECS[part].id === 'belt';
    positions.forEach((p, i) => {
      const n = edge + i;
      const nm = normals[i];
      points.push({
        part,
        local: p,
        localTwin: slack ? [p[0], p[1] + beltSag(p[0], p[1]), p[2]] : [p[0], p[1], p[2]],
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
