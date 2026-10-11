import type { BufferGeometry } from 'three';
import type { Vec2, Vec3 } from '../../math/vec';
import { extrudeProfile } from '../../shapes/extrude';
import { involuteGear } from '../../shapes/involute';
import { axle, bar, circle, plate } from '../../shapes/primitives';
import { samplePart } from '../../shapes/sample';
import { merge } from '../partGeometry';

/** One sampled point: correct-variant and wrong-twin positions and unit normals, all in part space. */
export interface ShapeSample {
  local: Vec3;
  localTwin: Vec3;
  normal: Vec3;
  normalTwin: Vec3;
}

export type Rng = () => number;
/** `count` points of one part, spread over its surface by area; deterministic for the rng's state. */
export type PartSampler = (count: number, rng: Rng) => ShapeSample[];

export const GEAR_THICKNESS = 0.25;
export const AXLE = { radius: 0.08, length: 0.6 };
const CRANK = { length: 1.0, radius: 0.1, depth: 0.12 };
/** The crank rides just in front of the driven gear's face, on its axle. */
const CRANK_Z = GEAR_THICKNESS / 2 + 0.075;
const FAN_BLADES = 3;

function same(p: Vec3, n: Vec3): ShapeSample {
  return { local: p, localTwin: [p[0], p[1], p[2]], normal: n, normalTwin: [n[0], n[1], n[2]] };
}

/** `v` turned by `angle` about z. */
function turnZ(v: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]];
}

/** Build a part's geometry once, on first use (it is constant). */
function lazy(make: () => BufferGeometry): () => BufferGeometry {
  let geom: BufferGeometry | undefined;
  return () => (geom ??= make());
}

/** A part whose wrong twin has the same shape. */
function solid(make: () => BufferGeometry): PartSampler {
  const geom = lazy(make);
  return (count, rng) => {
    const { positions, normals } = samplePart(geom(), count, rng);
    return positions.map((p, i) => same(p, normals[i]));
  };
}

/** Closed outline of the involute spur gear of `pitchRadius` with `teeth` (module 2r / teeth). */
export function gearOutline(pitchRadius: number, teeth: number): Vec2[] {
  return involuteGear({ teeth, module: (2 * pitchRadius) / teeth });
}

/**
 * Involute spur gear of `pitchRadius` and `teeth`, `GEAR_THICKNESS` thick and centred on the part
 * origin, bored for and carrying its axle (along z, centred on the gear), minus `holes`.
 */
export function gearSampler(pitchRadius: number, teeth: number, holes: Vec2[][] = []): PartSampler {
  return solid(() => {
    const gear = extrudeProfile(gearOutline(pitchRadius, teeth), [circle(0, 0, AXLE.radius), ...holes], GEAR_THICKNESS);
    return merge(gear, axle(AXLE.radius, AXLE.length));
  });
}

/** `count` round lightening holes of radius `r`, centred on a circle of radius `at`. */
export function lighteningHoles(count: number, at: number, r: number): Vec2[][] {
  return Array.from({ length: count }, (_, i) => {
    const a = ((i + 0.5) / count) * Math.PI * 2;
    return circle(at * Math.cos(a), at * Math.sin(a), r);
  });
}

/**
 * Crank arm from the part origin along +x: a rounded bar with depth, bored for the axle, in front
 * of the gear it rides on. The wrong twin is a 3-blade fan: the same samples, each turned about z
 * by its blade's angle (normal included), so the two variants morph point for point.
 */
export function crankSampler(): PartSampler {
  const geom = lazy(() =>
    bar(CRANK.length, CRANK.radius, CRANK.depth, [circle(0, 0, AXLE.radius)]).translate(0, 0, CRANK_Z),
  );
  return (count, rng) => {
    const { positions, normals } = samplePart(geom(), count, rng);
    return positions.map((p, i) => {
      const ang = ((i % FAN_BLADES) * Math.PI * 2) / FAN_BLADES;
      return { local: p, localTwin: turnZ(p, ang), normal: normals[i], normalTwin: turnZ(normals[i], ang) };
    });
  };
}

/**
 * Frame plate `w`×`h`×`depth` with corner radius `cr`, its front face on the part origin's z = 0
 * plane (the plate lies behind it), drilled where the axles enter at `axleCentres`.
 */
export function plateSampler(w: number, h: number, depth: number, cr: number, axleCentres: Vec2[]): PartSampler {
  return solid(() =>
    plate(w, h, depth, cr, axleCentres.map(([x, y]) => circle(x, y, AXLE.radius))).translate(0, 0, -depth / 2),
  );
}

/** L-bracket: a tall bar and a foot, 0.12 deep, centred near the part origin. */
export function bracketSampler(): PartSampler {
  const outline: Vec2[] = [
    [-0.25, -0.35],
    [0.25, -0.35],
    [0.25, -0.23],
    [-0.13, -0.23],
    [-0.13, 0.35],
    [-0.25, 0.35],
  ];
  return solid(() => extrudeProfile(outline, [], 0.12));
}
