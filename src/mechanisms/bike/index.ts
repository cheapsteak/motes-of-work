import type { BufferGeometry } from 'three';
import { compose, fromAxisAngle, type PartTransform, type Quat } from '../../math/transform';
import { hash01, mulberry32, pcg } from '../../math/hash';
import { lerpVec3, type Vec3 } from '../../math/vec';
import { samplePartPair } from '../../shapes/sample';
import type { Faults } from '../../timeline/sceneState';
import type { BoundPoint, InkStroke, Mechanism, MechanismPart, Role } from '../types';
import { inkDrawing, SHEET } from './ink';
import {
  aboutHead,
  BB,
  CHAIN_SEGMENTS,
  chainAdvance,
  chainSegment,
  crankAngle,
  FRONT_AXLE,
  HEAD_TOP,
  MAST_MOUNT,
  pedalCentre,
  REAR_AXLE,
  SEAT_CLAMP,
  steer,
  steerQuat,
  STEER_MOUNT,
  STUB_TOP,
  wheelAngle,
} from './kinematics';
import {
  basket,
  BASKET_DENSITY,
  brakeFront,
  brakeRear,
  chainLink,
  cranks,
  fork,
  frame,
  FRAME_LAY,
  frameLaySettle,
  frontWheel,
  ground,
  handlebars,
  looseBolts,
  mudguardFront,
  mudguardRear,
  pedal,
  rearWheel,
  saddle,
} from './shapes';
import { pointWeights, surfaceArea } from '../partGeometry';

export { CHAIN_SEGMENTS, GEARING } from './kinematics';

export const label = 'Bicycle';
export const blurb =
  'A town bicycle whose core is where the rider touches it, and whose wrong twin runs just as well with its saddle and handlebars swapped and its frame built around them.';

/** World units per metre: a bounding radius of about 2.4. */
export const SCALE = 2.25;
/** The point of the bike (metres, bike coordinates) that sits at the world origin. */
export const CENTRE: Vec3 = [0.52, 0.45, 0];

const X: Vec3 = [1, 0, 0];
const Y: Vec3 = [0, 1, 0];
const Z: Vec3 = [0, 0, 1];
const IDENTITY: Quat = [0, 0, 0, 1];

const at = (x: number, y: number, z: number, axis?: Vec3, angle = 0): PartTransform => ({
  position: [x, y, z],
  quaternion: axis ? fromAxisAngle(axis, angle) : IDENTITY,
});

interface PartSpec extends MechanismPart {
  /** Geometry in metres, about the point `pose` places the part at. */
  geometry: () => BufferGeometry;
  /** The wrong twin's shape, if it has its own: the same solids built to other dimensions (shapes.ts). */
  twin?: () => BufferGeometry;
  /** Point density relative to the rest of its group (core, or body + drift); default 1. */
  density?: number;
  /** A fixed share of its group's points instead of one by area (the sparse, dim ground). */
  share?: number;
}

/** The ground's share of the body + drift points: a dim strip, not a surface that competes. */
export const GROUND_SHARE = 0.02;

// Settle windows: the stages the cold open builds the bike in, one line of the brief each, end to
// end so no part sets out before the line before it has lit (docs/specs/2026-10-05-act-1-build-and-
// orbit.md §2.2, as amended for the basket). The core (saddle, bars, pedals) lands first, in its role
// default [0.08, 0.32]; then the drive (both wheels, the cranks, the chain); then the fork; then the
// basket, dropped onto it; then the frame, laid tube by tube; and last the fittings hung on it (the
// mudguards with the rack, which have their own line, then the brakes and the ground with them).
// Every stage sets out SETTLE_WINDOW before its `from`. The cold open holds assembly one flare
// width past each stage's end (0.33, 0.49, 0.61, 0.73, then 1), and the spec section at 0.34 with
// the core built: no body mote has set out there, since the drive's motes start at 0.42 - 0.08.
const DRIVE_SETTLE = [0.42, 0.48] as const;
const FORK_SETTLE = [0.57, 0.6] as const;
/** The basket has the fork's old window: it sets out once the front wheel has turned. */
const BASKET_SETTLE = [0.69, 0.72] as const;
/** The frame is laid in place, tube by tube, over its lay order's span (shapes.ts FRAME_LAY). */
const FRAME_SETTLE = [FRAME_LAY[0].slot[0], FRAME_LAY[FRAME_LAY.length - 1].slot[1]] as const;
/**
 * The mudguards (with the rack) set out while the top tube is laid, under their own line of the
 * brief, and land just after the frame is done: they are fresh parts of that line, after the frame's.
 */
const MUDGUARD_SETTLE = [0.95, 0.97] as const;
/** The brakes and the ground set out while the seat tube is laid, and land with the mudguards. */
const FITTINGS_SETTLE = [0.94, 0.97] as const;
/**
 * The loose bolts land with the fork, not spread over the whole build (they would flare through its
 * holds), and not with the drive, whose window is now below the drift role's.
 */
const BOLTS_SETTLE = [0.57, 0.59] as const;

/**
 * The basket's entrance: it gathers in the air above the fork while its motes fly in, then drops
 * onto the fork, gathering speed as a dropped thing does, and hops once as it settles. Over its
 * window, `x` 0 to 1: held up until `hover`, falling to `impact`, then one hop of `hop` of the drop.
 */
const BASKET_DROP = { hover: 0.8, impact: 0.9, hop: 0.12 } as const;
export function basketArrival(x: number): number {
  const { hover, impact, hop } = BASKET_DROP;
  if (x <= hover) return 0;
  if (x <= impact) return ((x - hover) / (impact - hover)) ** 2;
  if (x >= 1) return 1;
  return 1 - hop * Math.sin((Math.PI * (x - impact)) / (1 - impact));
}

const chainSpecs: PartSpec[] = Array.from({ length: CHAIN_SEGMENTS }, (_, k) => {
  const a = (k * 2 * Math.PI) / CHAIN_SEGMENTS;
  return {
    id: `chain-${String(k).padStart(2, '0')}`,
    role: 'body',
    settle: DRIVE_SETTLE,
    explodedOffset: at(0.9 * Math.cos(a), -0.5 + 0.6 * Math.sin(a), 1.2, Z, 0.8 * Math.sin(a)),
    geometry: chainLink,
    density: 1.6, // tiny links: a little denser than the body, so each reads as a link
  };
});

const SPECS: PartSpec[] = [
  {
    id: 'frame',
    role: 'body',
    settle: FRAME_SETTLE,
    // Laid where it stands: nothing already laid may slide, so no offset; the order of its motes'
    // landing is the build (part space is bike metres times SCALE).
    settleField: (local, h) => frameLaySettle([local[0] / SCALE, local[1] / SCALE, local[2] / SCALE], h),
    explodedOffset: at(0, 0, 0),
    geometry: () => frame('correct'),
    twin: () => frame('twin'),
  },
  { id: 'fork', role: 'body', settle: FORK_SETTLE, explodedOffset: at(0.9, -0.6, -0.8, Z, 0.5), geometry: fork },
  {
    id: 'front-wheel',
    role: 'body',
    settle: DRIVE_SETTLE,
    explodedOffset: at(1.4, 0.2, 1.2, Y, 0.8),
    geometry: frontWheel,
  },
  {
    id: 'rear-wheel',
    role: 'body',
    settle: DRIVE_SETTLE,
    explodedOffset: at(-1.4, 0.2, 1.2, Y, -0.8),
    geometry: rearWheel,
  },
  { id: 'cranks', role: 'body', settle: DRIVE_SETTLE, explodedOffset: at(0.2, -0.8, 1.3, X, 0.6), geometry: cranks },
  ...chainSpecs,
  {
    id: 'brake-front',
    role: 'body',
    settle: FITTINGS_SETTLE,
    explodedOffset: at(1.2, -0.4, 0.8),
    geometry: brakeFront,
    density: 1.3,
  },
  {
    id: 'brake-rear',
    role: 'body',
    settle: FITTINGS_SETTLE,
    explodedOffset: at(-1.2, -0.4, 0.8),
    geometry: brakeRear,
    density: 1.3,
  },
  {
    id: 'mudguard-front',
    role: 'body',
    settle: MUDGUARD_SETTLE,
    explodedOffset: at(1.2, -0.5, -0.6, X, 0.6),
    geometry: mudguardFront,
  },
  {
    id: 'mudguard-rear',
    role: 'body',
    settle: MUDGUARD_SETTLE,
    explodedOffset: at(-1.2, -0.5, -0.6, X, -0.6),
    geometry: mudguardRear,
  },
  {
    id: 'saddle',
    role: 'core',
    explodedOffset: at(-0.3, 0.45, 0.3, Z, 0.3),
    geometry: () => saddle('correct'),
    twin: () => saddle('twin'),
    density: 0.5, // a broad top lit square-on by the key: thinner, so it stays amber, not white
  },
  {
    id: 'handlebars',
    role: 'core',
    explodedOffset: at(0.3, 0.45, 0.3, Y, 0.4),
    geometry: () => handlebars('correct'),
    twin: () => handlebars('twin'),
  },
  // The pedals are small and low: a little denser, so they read as warm core.
  { id: 'pedal-left', role: 'core', explodedOffset: at(-0.2, -0.35, -0.35), geometry: () => pedal(-1), density: 1.4 },
  { id: 'pedal-right', role: 'core', explodedOffset: at(0.2, -0.35, 0.35), geometry: () => pedal(1), density: 1.4 },
  {
    id: 'loose-bolts',
    role: 'drift',
    settle: BOLTS_SETTLE,
    explodedOffset: at(-0.8, 1.2, 1.0),
    geometry: looseBolts,
    density: 1.3,
  },
  {
    id: 'ground',
    role: 'body',
    settle: FITTINGS_SETTLE,
    explodedOffset: at(0, -0.8, 0),
    geometry: ground,
    share: GROUND_SHARE,
  },
  // The basket (once part of the fork) is last, so no other part's index moved: each part's sample is
  // seeded by its index, so every other part keeps the points it had.
  {
    id: 'basket',
    role: 'body',
    settle: BASKET_SETTLE,
    // Above its seat on the fork, tipped a little nose down: it drops straight down onto it
    // (basketArrival), the one part that comes from above, and from not far.
    explodedOffset: at(0, 0.5, 0, Z, -0.15),
    arrival: basketArrival,
    geometry: basket,
    density: BASKET_DENSITY,
  },
];

const parts: MechanismPart[] = SPECS.map(({ id, role, explodedOffset, settle, settleField, arrival }) => ({
  id,
  role,
  explodedOffset,
  ...(settle ? { settle } : {}),
  ...(settleField ? { settleField } : {}),
  ...(arrival ? { arrival } : {}),
}));

export function partIndex(id: string): number {
  const i = SPECS.findIndex((s) => s.id === id);
  if (i < 0) throw new Error(`bike: no part ${id}`);
  return i;
}

// Point allocation, as the steam engine's: the core takes CORE_SHARE of the points and the body and
// drift the rest. Within each group a part with a fixed `share` (the ground) takes that, and the
// others split the remainder by surface area times `density`, so parts are evenly dense.
const CORE_SHARE = 0.155;

/** Build every part's geometry once, on first use (it is constant), scaled to world units. */
let built: { geoms: BufferGeometry[]; twins: BufferGeometry[]; weights: number[]; density: number[] } | undefined;
function geometry() {
  if (built) return built;
  const geoms = SPECS.map((s) => s.geometry().scale(SCALE, SCALE, SCALE));
  const twins = SPECS.map((s, i) => (s.twin ? s.twin().scale(SCALE, SCALE, SCALE) : geoms[i]));
  const area = geoms.map(surfaceArea);
  const weights = pointWeights(
    SPECS.map((s, i) => ({ core: s.role === 'core', area: area[i], density: s.density, share: s.share })),
    CORE_SHARE,
  );
  built = { geoms, twins, weights, density: weights.map((w, i) => w / area[i]) };
  return built;
}

/**
 * Each part's share of the bike's points, in part order, summing to 1: samplePoints gives part i its
 * share of any budget (to the rounding of a cumulative split). The galaxy sizes the bike's planet's
 * moons by them (src/galaxy/generate.ts n0PartShares).
 */
export function partShares(): number[] {
  return [...geometry().weights];
}

/** Points per unit area of each part, relative to the frame's (for tests and tuning). */
export function partDensities(): { id: string; role: Role; density: number }[] {
  const { density } = geometry();
  const body = density[partIndex('frame')];
  return SPECS.map((s, i) => ({ id: s.id, role: s.role, density: density[i] / body }));
}

const turn = (a: Quat, b: Quat): Quat =>
  compose({ position: [0, 0, 0], quaternion: a }, { position: [0, 0, 0], quaternion: b }).quaternion;
/** A pose from a position in bike coordinates (metres). */
const place = (p: Vec3, q: Quat = IDENTITY): PartTransform => ({
  position: [(p[0] - CENTRE[0]) * SCALE, (p[1] - CENTRE[1]) * SCALE, (p[2] - CENTRE[2]) * SCALE],
  quaternion: q,
});

/** `misalign` = 1 tilts the front wheel this far off its axle; the tilt turns with it, so it wobbles. */
const WOBBLE = 0.18;
/** `jitter` = 1: how far (world units) and how much (rad) each loose part rattles. */
const RATTLE: Record<string, [number, number]> = {
  'mudguard-front': [0.035, 0.05],
  'mudguard-rear': [0.035, 0.05],
  'brake-front': [0.03, 0.08],
  'brake-rear': [0.03, 0.08],
  handlebars: [0.012, 0.02], // the bell
};
/** The parts built in bike coordinates that never move (but for drift): posed at the bike origin. */
const STATIC_PARTS: ReadonlySet<string> = new Set(['frame', 'ground', 'loose-bolts']);
// A mistyped id would otherwise silently pose nothing, or pose a part at the origin.
for (const id of [...STATIC_PARTS, ...Object.keys(RATTLE)]) partIndex(id);

function pose(drive: number, f: Faults, variant: number, steering = 0): PartTransform[] {
  const theta = crankAngle(drive, f);
  const psi = wheelAngle(drive, f);
  const a = steer(drive, variant, steering);
  const steered = steerQuat(a);
  const spin = fromAxisAngle(Z, -psi);
  const advance = chainAdvance(drive, f);

  // The twin: the saddle and the handlebars trade mounts, and with them who steers (and the twin
  // steers further: steer() blends its amplitude by variant). The saddle goes to the top of the
  // steering column (its mount is on the steering axis, so it turns about it), the handlebars into
  // the seat-tube stub; the frame reshapes round them point for point (samplePoints). Blend the
  // mount and the share of the steering, then build each rotation.
  const moving: Record<string, PartTransform> = {
    fork: place(HEAD_TOP, steered),
    basket: place(HEAD_TOP, steered),
    'brake-front': place(HEAD_TOP, steered),
    'mudguard-front': place(HEAD_TOP, steered),
    'front-wheel': place(aboutHead(FRONT_AXLE, a), turn(steered, turn(spin, fromAxisAngle(X, WOBBLE * f.misalign)))),
    'rear-wheel': place(REAR_AXLE, spin),
    'brake-rear': place(REAR_AXLE),
    'mudguard-rear': place(REAR_AXLE),
    cranks: place(BB, fromAxisAngle(Z, -theta)),
    'pedal-right': place(pedalCentre(theta, 1)),
    'pedal-left': place(pedalCentre(theta, -1)),
    saddle: place(lerpVec3(SEAT_CLAMP, MAST_MOUNT, variant), steerQuat(a * variant)),
    handlebars: place(lerpVec3(STEER_MOUNT, STUB_TOP, variant), steerQuat(a * (1 - variant))),
  };
  for (let k = 0; k < CHAIN_SEGMENTS; k++) {
    const { centre, angle } = chainSegment(k, advance, f.stall);
    moving[chainSpecs[k].id] = place(centre, fromAxisAngle(Z, angle));
  }
  const out = SPECS.map((s) => {
    const t = moving[s.id] ?? (STATIC_PARTS.has(s.id) ? place([0, 0, 0]) : undefined);
    if (!t) throw new Error(`bike: no pose for part ${s.id}`);
    return t;
  });

  if (f.jitter > 0) {
    // The mudguards, brakes and bell rattle on their mounts; the drive and the frame do not.
    const tick = Math.floor(drive * 60);
    out.forEach((t, i) => {
      const r = RATTLE[SPECS[i].id];
      if (!r) return;
      const h = (k: number) => hash01(tick, i * 4 + k) * 2 - 1;
      for (let k = 0; k < 3; k++) t.position[k] += f.jitter * r[0] * h(k);
      t.quaternion = turn(t.quaternion, fromAxisAngle(Z, f.jitter * r[1] * h(3)));
    });
  }
  return out;
}

function samplePoints(budget: number, seed: number): BoundPoint[] {
  // Cumulative rounding: the last part absorbs the remainder so the total is exactly `budget`.
  const { geoms, twins, weights } = geometry();
  const total = Math.max(0, Math.floor(budget));
  const points: BoundPoint[] = [];
  let cum = 0;
  let edge = 0;
  for (let part = 0; part < SPECS.length; part++) {
    cum += weights[part];
    const nextEdge = part === SPECS.length - 1 ? total : Math.min(total, Math.round(total * cum));
    const rng = mulberry32(pcg((seed + Math.imul(part + 1, 0x9e3779b9)) >>> 0));
    // Points are spread by the correct shape's area; a part with a twin shape (the frame, saddle and
    // handlebars) carries each one to the same place on the matching solid of its twin.
    const { positions, normals, positionsTwin, normalsTwin } = samplePartPair(geoms[part], twins[part], nextEdge - edge, rng);
    positions.forEach((p, i) => {
      const n = edge + i;
      points.push({
        part,
        local: p,
        localTwin: positionsTwin[i],
        normal: normals[i],
        normalTwin: normalsTwin[i],
        seed: pcg((seed + Math.imul(n, 0x9e3779b9)) >>> 0) & 0xffffff,
      });
    });
    edge = nextEdge;
  }
  return points;
}

/** The ink drawing (ink.ts), in world units and numbered parts; built once, on first use. */
let inked: InkStroke[] | undefined;
function ink(): InkStroke[] {
  if (inked) return inked;
  const world = (p: Vec3): Vec3 => [p[0] * SCALE, p[1] * SCALE, p[2] * SCALE];
  inked = inkDrawing().map((s) => ({ ...s, part: partIndex(s.part), points: s.points.map(world), pointsTwin: s.pointsTwin.map(world) }));
  return inked;
}

const sheet = {
  centre: SHEET.centre.map((v, k) => (v - CENTRE[k]) * SCALE) as Vec3,
  width: SHEET.width * SCALE,
  height: SHEET.height * SCALE,
};

export const bike: Mechanism = { id: 'bike', parts, pose, samplePoints, ink, sheet };
