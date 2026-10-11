// Strandbeest: Theo Jansen's walking linkage. Four crank throws on one crankshaft, each driving a
// mirrored pair of legs (eight legs), phase-offset a quarter turn so two to four feet are on the
// ground at any moment. The core is the reference crank and ONE leg's linkage, whose link lengths
// are the whole specification; the body is the other seven legs, the crankshaft and the frame; the
// feet are drift. The wrong twin is the same bars at wrong lengths: the legs still turn over, but
// the feet lose their flat ground stroke and the body bobs.
import { hash01, mulberry32, pcg } from '../../math/hash';
import { compose, fromAxisAngle, type PartTransform, type Quat } from '../../math/transform';
import { lerp, type Vec3 } from '../../math/vec';
import type { Faults } from '../../timeline/sceneState';
import type { BoundPoint, Mechanism, MechanismPart, Role } from '../types';
import {
  heading,
  JANSEN,
  lerpLengths,
  solveLeg,
  solveMirrored,
  triangleShapes,
  TWIN,
  type LegJoints,
  type Lengths,
  type P2,
  type TriangleShapes,
} from './kinematics';
import { partArea, samplePartElements, type Element } from './shapes';

export const label = 'Strandbeest';
export const blurb =
  'A Theo Jansen walking machine whose gait comes entirely from thirteen link lengths, and whose wrong twin gets four of them wrong, so its feet lose their flat stride.';

const TAU = Math.PI * 2;

/** World units per Jansen unit: the eight-legged machine spans about 3.9 wide, 2.3 tall, 2.1 deep. */
export const SCALE = 0.018;
/** The crank axle's height above the machine's centre, Jansen units (feet reach 92 below it). */
export const AXLE_HEIGHT = 29;
/** Crank throws front (+z, toward the camera) to back, and their phase as a fraction of a turn. */
export const STATION_PHASES = [0, 0.5, 0.25, 0.75] as const;
const STATION_GAP = 32;
/** +1: the leg reaching toward +x (the mirrored solve); −1: toward −x. */
export const SIDES = [1, -1] as const;
type Sign = (typeof SIDES)[number];

// Bar and pivot sizes, Jansen units.
const TUBE_R = 1.3;
const PIVOT_R = 2.3;
/**
 * The reference leg and crank are built heavier: the same point share spread over more surface, so
 * the specified linkage reads as the master piece instead of a white-hot line.
 */
const CORE_GIRTH = 1.6;
const PIVOT_DEPTH = 2;
const HUB_R = 3.2;
const SHAFT_R = 1.7;
const FOOT_R = 3.4;
/** Bars of one leg sit in three planes stepping away from the crank: j and k, the triangles, c and f. */
const LAYER = 2.8;
/** The crank arm runs a little past its pin, as a crank lobe does. */
const CRANK_ARM = 1.15;
/**
 * `ratio` lengthens the crank throw the legs are driven by, up to this fraction: the pin rides off
 * the end of its arm and the stride overshoots (about 6% at full fault). The linkage tolerates very
 * little: past a gain of about 0.07 the lower rocker runs through its dead point, and the solve,
 * steep there, teleports the knee and foot within a single step. At 0.06 every joint solves without
 * a clamp over the whole dial, at every variant; the clamp (kinematics.ts) only guards beyond it.
 */
export const RATIO_GAIN = 0.06;

/**
 * The whole machine turned about y so its +x end swings toward the viewer: the legs still face +z
 * (the key light) at a slant, and a three-quarter view looks along the spine instead of through it.
 */
export const YAW: PartTransform = { position: [0, 0, 0], quaternion: fromAxisAngle([0, 1, 0], -0.25) };

const stationZ = (s: number): number => (1.5 - s) * STATION_GAP;
const FRONT_Z = stationZ(0) + STATION_GAP / 2;
const BACK_Z = stationZ(STATION_PHASES.length - 1) - STATION_GAP / 2;

type Joint = 'O' | 'A' | 'C' | 'top' | 'low' | 'outer' | 'knee' | 'foot';

interface LinkSpec {
  id: string;
  /** Part origin, and the joint its local +x points at. */
  from: Joint;
  to: Joint;
  layer: number;
  /** Rigid triangles: which corner shape is the third vertex. */
  corner?: keyof TriangleShapes;
  /** The base side's length key (bars: their only length). */
  length: keyof Lengths;
}

/** One leg's parts, in part order. The foot pad (drift) follows them. */
export const LINKS: readonly LinkSpec[] = [
  { id: 'j', from: 'C', to: 'top', layer: 1, length: 'j' },
  { id: 'k', from: 'C', to: 'low', layer: 1, length: 'k' },
  { id: 'upper', from: 'A', to: 'top', layer: 2, length: 'b', corner: 'outer' },
  { id: 'c', from: 'A', to: 'low', layer: 3, length: 'c' },
  { id: 'f', from: 'outer', to: 'knee', layer: 3, length: 'f' },
  {
    id: 'shin',
    from: 'low',
    to: 'knee',
    layer: 2,
    length: 'g',
    corner: 'foot',
  },
];

/** The reference leg: front crank throw, the leg toward +x (nearest a three-quarter camera). */
export const CORE_STATION = 0;
export const CORE_SIDE: Sign = 1;

type PartKind =
  | { kind: 'crank'; station: number }
  | { kind: 'link'; station: number; side: Sign; link: number }
  | { kind: 'foot'; station: number; side: Sign }
  | { kind: 'shaft' }
  | { kind: 'frame' };

interface PartDef {
  part: MechanismPart;
  kind: PartKind;
  elements: Element[];
}

const at = (x: number, y: number, z: number, turn = 0): PartTransform => ({
  position: [x, y, z],
  quaternion: fromAxisAngle([0, 0, 1], turn),
});

const SHAPES_0 = triangleShapes(JANSEN);
const SHAPES_1 = triangleShapes(TWIN);

const v3 = (x: number, y: number, z: number): Vec3 => [x * SCALE, y * SCALE, z * SCALE];

function tube(from: P2, to: P2, fromTwin: P2, toTwin: P2, z: number, radius = TUBE_R): Element {
  return {
    kind: 'tube',
    from: v3(from[0], from[1], z),
    to: v3(to[0], to[1], z),
    fromTwin: v3(fromTwin[0], fromTwin[1], z),
    toTwin: v3(toTwin[0], toTwin[1], z),
    radius: radius * SCALE,
  };
}

function pivot(p: P2, pTwin: P2, z: number, radius = PIVOT_R, depth = PIVOT_DEPTH): Element {
  return {
    kind: 'pivot',
    at: v3(p[0], p[1], z),
    atTwin: v3(pTwin[0], pTwin[1], z),
    radius: radius * SCALE,
    depth: depth * SCALE,
  };
}

/** A link's elements in its own frame: `from` at the origin, `to` on +x, in its layer's plane. */
function linkElements(spec: LinkSpec, side: Sign, girth: number): Element[] {
  const z = side * spec.layer * LAYER;
  const base0: P2 = [JANSEN[spec.length], 0];
  const base1: P2 = [TWIN[spec.length], 0];
  const o: P2 = [0, 0];
  const r = TUBE_R * girth;
  const pr = PIVOT_R * girth;
  const els: Element[] = [tube(o, base0, o, base1, z, r), pivot(o, o, z, pr), pivot(base0, base1, z, pr)];
  if (spec.corner) {
    // The +x leg is the mirror image, so its triangles' third corners fall on the other side.
    const flip = (p: P2): P2 => [p[0], side === 1 ? -p[1] : p[1]];
    const c0 = flip(SHAPES_0[spec.corner]);
    const c1 = flip(SHAPES_1[spec.corner]);
    els.push(tube(o, c0, o, c1, z, r), tube(base0, c0, base1, c1, z, r));
    // The foot corner carries the foot pad (its own part), not a pivot.
    if (spec.corner === 'outer') els.push(pivot(c0, c1, z, pr));
  }
  return els;
}

function crankElements(girth: number): Element[] {
  const o: P2 = [0, 0];
  const arm0: P2 = [CRANK_ARM * JANSEN.m, 0];
  const arm1: P2 = [CRANK_ARM * TWIN.m, 0];
  // The pin spans both legs' j/k planes.
  const pinDepth = 2 * LAYER + PIVOT_DEPTH;
  return [
    pivot(o, o, 0, HUB_R * girth),
    tube(o, arm0, o, arm1, 0, TUBE_R * girth),
    pivot([JANSEN.m, 0], [TWIN.m, 0], 0, TUBE_R * 1.1 * girth, pinDepth),
  ];
}

function shaftElements(): Element[] {
  return [
    {
      kind: 'tube',
      from: v3(0, 0, FRONT_Z),
      to: v3(0, 0, BACK_Z),
      fromTwin: v3(0, 0, FRONT_Z),
      toTwin: v3(0, 0, BACK_Z),
      radius: SHAFT_R * SCALE,
    },
  ];
}

/** Two rails through the fixed pivots, tied to the crank bearing by V-shaped cross members between throws. */
function frameElements(): Element[] {
  const els: Element[] = [];
  const A: P2 = [-JANSEN.a, -JANSEN.l];
  const B: P2 = [JANSEN.a, -JANSEN.l];
  for (const p of [A, B]) {
    els.push({
      kind: 'tube',
      from: v3(p[0], p[1], FRONT_Z),
      to: v3(p[0], p[1], BACK_Z),
      fromTwin: v3(p[0], p[1], FRONT_Z),
      toTwin: v3(p[0], p[1], BACK_Z),
      radius: SHAFT_R * SCALE,
    });
  }
  for (let s = 0; s <= STATION_PHASES.length; s++) {
    const z = FRONT_Z - s * STATION_GAP;
    const o: P2 = [0, 0];
    els.push(tube(A, o, A, o, z), tube(o, B, o, B, z), pivot(o, o, z, HUB_R));
  }
  return els;
}

function legOffset(station: number, side: Sign, li: number, core: boolean): PartTransform {
  const z = 1.5 - station;
  if (core) return at(side * (0.25 + 0.08 * li), 0.2 * ((li % 3) - 1), 0.35 + 0.08 * li);
  return at(
    side * (0.9 + 0.22 * li),
    0.4 * ((li % 3) - 1),
    z * 0.7 + side * 0.15 * li,
    side * 0.5 * (((li + station) % 3) - 1),
  );
}

function buildParts(): PartDef[] {
  const defs: PartDef[] = [];
  STATION_PHASES.forEach((_, s) => {
    const core = s === CORE_STATION;
    defs.push({
      part: {
        id: `crank-${s}`,
        role: core ? 'core' : 'body',
        explodedOffset: core ? at(0.1, 0.3, 0.4) : at(0, 0.5 + 0.15 * s, (1.5 - s) * 0.6),
      },
      kind: { kind: 'crank', station: s },
      elements: crankElements(core ? CORE_GIRTH : 1),
    });
  });
  STATION_PHASES.forEach((_, s) => {
    for (const side of SIDES) {
      const core = s === CORE_STATION && side === CORE_SIDE;
      const tag = `${s}${side === 1 ? 'r' : 'l'}`;
      LINKS.forEach((spec, li) => {
        defs.push({
          part: {
            id: `${spec.id}-${tag}`,
            role: core ? 'core' : 'body',
            explodedOffset: legOffset(s, side, li, core),
          },
          kind: { kind: 'link', station: s, side, link: li },
          elements: linkElements(spec, side, core ? CORE_GIRTH : 1),
        });
      });
      defs.push({
        part: {
          id: `foot-${tag}`,
          role: 'drift',
          explodedOffset: at(side * 1.3, -0.8, (1.5 - s) * 0.6),
        },
        kind: { kind: 'foot', station: s, side },
        elements: [
          {
            kind: 'ball',
            at: [0, 0, 0],
            atTwin: [0, 0, 0],
            radius: FOOT_R * SCALE,
            depth: 0,
          },
        ],
      });
    }
  });
  defs.push({
    part: { id: 'crankshaft', role: 'body', explodedOffset: at(0, 1.1, 0) },
    kind: { kind: 'shaft' },
    elements: shaftElements(),
  });
  defs.push({
    part: { id: 'frame', role: 'body', explodedOffset: at(0, 1.5, -0.8) },
    kind: { kind: 'frame' },
    elements: frameElements(),
  });
  return defs;
}

const DEFS = buildParts();
const parts: MechanismPart[] = DEFS.map((d) => d.part);

// ---------------------------------------------------------------------------------------------
// Kinematics of the whole machine.

const smoothstep = (e0: number, e1: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};
const fract = (x: number): number => x - Math.floor(x);

/** The crankshaft angle after the faults that act on the whole drive (bind drags, stall halts). */
function shaftAngle(drive: number, f: Faults): number {
  let theta = TAU * drive;
  theta -= f.bind * 0.45 * Math.sin(2 * theta);
  const u = theta / Math.PI;
  const stalled = Math.PI * (Math.floor(u) + smoothstep(0.45, 1, fract(u)));
  return lerp(theta, stalled, f.stall);
}

export interface MachineSolve {
  /** Crankshaft angle. */
  theta: number;
  /** Each throw's crank angle (its phase, less any slip). */
  stations: number[];
  /** legs[station][0] is the +x leg, legs[station][1] the −x leg; joints in Jansen units about the crank axle. */
  legs: LegJoints[][];
  /**
   * How far the body rides above its mean height (Jansen units) so that its lowest foot stays on a
   * level ground: next to nothing for Jansen's lengths, a visible bob for the twin's.
   */
  lift: number;
}

/** The lengths and rigid triangle shapes the parts have at `variant` (their samples morph linearly). */
function variantGeometry(variant: number): {
  L: Lengths;
  shapes: TriangleShapes;
} {
  const lp = (p: P2, q: P2): P2 => [lerp(p[0], q[0], variant), lerp(p[1], q[1], variant)];
  return {
    L: lerpLengths(JANSEN, TWIN, variant),
    shapes: {
      outer: lp(SHAPES_0.outer, SHAPES_1.outer),
      foot: lp(SHAPES_0.foot, SHAPES_1.foot),
    },
  };
}

function lowestFoot(legs: LegJoints[][]): number {
  let y = Infinity;
  for (const pair of legs) for (const leg of pair) y = Math.min(y, leg.foot[1]);
  return y;
}

function solveLegs(stations: number[], L: Lengths, shapes: TriangleShapes): LegJoints[][] {
  return stations.map((t) => [solveMirrored(t, L, shapes), solveLeg(t, L, shapes)]);
}

/** Midpoint of the lowest foot's height over a crank turn: the body's mean ride height. */
function rideHeight(variant: number): number {
  const { L, shapes } = variantGeometry(variant);
  let lo = Infinity;
  let hi = -Infinity;
  const n = 360;
  for (let i = 0; i < n; i++) {
    const theta = (i / n) * TAU;
    const y = lowestFoot(
      solveLegs(
        STATION_PHASES.map((p) => theta + p * TAU),
        L,
        shapes,
      ),
    );
    lo = Math.min(lo, y);
    hi = Math.max(hi, y);
  }
  return (lo + hi) / 2;
}

const RIDE = [rideHeight(0), rideHeight(1)] as const;

/** Joints of every leg, in Jansen units about the crank axle, for a drive, faults and variant. */
export function solveMachine(drive: number, f: Faults, variant: number): MachineSolve {
  const theta = shaftAngle(drive, f);
  // Slip: the throws behind the reference one lose phase on the shaft in jerks, twice a turn.
  const stations = STATION_PHASES.map((p, s) => theta + p * TAU - f.slip * 0.5 * s * fract((2 * theta) / TAU));
  const { L, shapes } = variantGeometry(variant);
  const solveL = { ...L, m: L.m * (1 + RATIO_GAIN * f.ratio) };
  const legs = solveLegs(stations, solveL, shapes);
  return {
    theta,
    stations,
    legs,
    lift: lerp(RIDE[0], RIDE[1], variant) - lowestFoot(legs),
  };
}

function planar(origin: P2, angle: number, z: number, lift: number): PartTransform {
  return {
    position: [origin[0] * SCALE, (origin[1] + AXLE_HEIGHT + lift) * SCALE, z * SCALE],
    quaternion: fromAxisAngle([0, 0, 1], angle),
  };
}

/** Turn `t` about the x-parallel axis through `pivotPoint` (world) by `angle`. */
function splay(t: PartTransform, pivotPoint: Vec3, angle: number): PartTransform {
  const q: Quat = fromAxisAngle([1, 0, 0], angle);
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  // pivot − R·pivot, with R the turn about x.
  const [, py, pz] = pivotPoint;
  const shift: Vec3 = [0, py - (py * c - pz * s), pz - (py * s + pz * c)];
  return compose({ position: shift, quaternion: q }, t);
}

function pose(drive: number, f: Faults, variant: number): PartTransform[] {
  const m = solveMachine(drive, f, variant);
  const placed = DEFS.map(({ kind }): PartTransform => {
    switch (kind.kind) {
      case 'shaft':
        return planar([0, 0], m.theta, 0, m.lift);
      case 'frame':
        return planar([0, 0], 0, 0, m.lift);
      case 'crank':
        // Both legs of a throw share its pin, at the throw's angle (the −x leg's plain solve).
        return planar([0, 0], m.stations[kind.station], stationZ(kind.station), m.lift);
      default: {
        const leg = m.legs[kind.station][kind.side === 1 ? 0 : 1];
        const z = stationZ(kind.station);
        let t: PartTransform;
        if (kind.kind === 'foot') {
          t = planar(leg.foot, heading(leg.low, leg.knee), z, m.lift);
        } else {
          const spec = LINKS[kind.link];
          t = planar(leg[spec.from], heading(leg[spec.from], leg[spec.to]), z, m.lift);
        }
        if (f.misalign > 0) {
          // Legs splay out of their plane, turning about a cross axis through the frame pivot, the
          // +x and −x legs and neighbouring throws leaning opposite ways.
          const sign = kind.side * (kind.station % 2 === 0 ? 1 : -1);
          const angle = f.misalign * 0.32 * sign * (0.75 + 0.25 * Math.sin(m.stations[kind.station]));
          t = splay(t, [0, (leg.A[1] + AXLE_HEIGHT + m.lift) * SCALE, z * SCALE], angle);
        }
        return t;
      }
    }
  });
  const out = placed.map((t) => compose(YAW, t));

  if (f.jitter > 0) {
    const tick = Math.floor(drive * 40);
    out.forEach((t, i) => {
      for (let axis = 0; axis < 3; axis++) t.position[axis] += f.jitter * 0.03 * (hash01(tick, i * 3 + axis) * 2 - 1);
    });
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Sampling.

/** Share of the point budget per role; within a role, parts share by surface area. */
// The core leg is warm, not dense (at 30% it clipped to white); the feet keep about the body's density.
const ROLE_SHARE: Record<Role, number> = { core: 0.12, body: 0.855, drift: 0.025 };

/** Each part's surface area (world units²), in part order. */
export const PART_AREAS: readonly number[] = DEFS.map((d) => partArea(d.elements));
const WEIGHTS: number[] = (() => {
  const roleArea: Record<Role, number> = { core: 0, body: 0, drift: 0 };
  DEFS.forEach((d, i) => (roleArea[d.part.role] += PART_AREAS[i]));
  return DEFS.map((d, i) => (ROLE_SHARE[d.part.role] * PART_AREAS[i]) / roleArea[d.part.role]);
})();

function samplePoints(budget: number, seed: number): BoundPoint[] {
  // Cumulative rounding: the last part absorbs the remainder so the total is exactly `budget`.
  const total = Math.max(0, Math.floor(budget));
  const points: BoundPoint[] = [];
  let cum = 0;
  let edge = 0;
  for (let part = 0; part < DEFS.length; part++) {
    cum += WEIGHTS[part];
    const nextEdge = part === DEFS.length - 1 ? total : Math.min(total, Math.round(total * cum));
    const rng = mulberry32(pcg((seed + Math.imul(part + 1, 0x9e3779b9)) >>> 0));
    samplePartElements(DEFS[part].elements, nextEdge - edge, rng).forEach((sample, i) => {
      const n = edge + i;
      points.push({
        part,
        ...sample,
        seed: pcg((seed + Math.imul(n, 0x9e3779b9)) >>> 0) & 0xffffff,
      });
    });
    edge = nextEdge;
  }
  return points;
}

export const strandbeest: Mechanism = {
  id: 'strandbeest',
  parts,
  pose,
  samplePoints,
};
