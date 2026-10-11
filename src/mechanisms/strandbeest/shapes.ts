// Strandbeest part geometry: every part is a set of elements (round tubes between pivots, pivot
// discs, foot balls), each sampled by area with the shared shape library and mapped onto its
// wrong-twin placement point for point. A tube's twin runs between the twin's endpoints (the same
// samples, stretched along the tube and turned with it), so a bar of the correct linkage morphs into
// the same bar at the twin's length.
import { CylinderGeometry, type BufferGeometry } from 'three';
import { fromAxisAngle, rotate, type Quat } from '../../math/transform';
import type { Vec3 } from '../../math/vec';
import { axle, ball } from '../../shapes/primitives';
import { samplePart } from '../../shapes/sample';

/** One sampled point: correct-variant and wrong-twin positions and unit normals, all in part space. */
export interface ShapeSample {
  local: Vec3;
  localTwin: Vec3;
  normal: Vec3;
  normalTwin: Vec3;
}

export type Rng = () => number;

/** A round tube from `from` to `to` (correct) and from `fromTwin` to `toTwin` (wrong twin). */
export interface TubeElement {
  kind: 'tube';
  from: Vec3;
  to: Vec3;
  fromTwin: Vec3;
  toTwin: Vec3;
  radius: number;
}

/** A pivot disc (a short cylinder along z) or a ball, centred on `at` (correct) / `atTwin`. */
export interface KnobElement {
  kind: 'pivot' | 'ball';
  at: Vec3;
  atTwin: Vec3;
  radius: number;
  /** Pivot thickness along z (ignored for a ball). */
  depth: number;
}

export type Element = TubeElement | KnobElement;

const RADIAL_SEGMENTS = 12;

/** Open round tube of `radius` along +x from x = 0 to x = 1 (sides only: pivots cap the ends). */
function unitTube(radius: number): BufferGeometry {
  const g = new CylinderGeometry(radius, radius, 1, RADIAL_SEGMENTS, 1, true);
  g.deleteAttribute('uv');
  // Cylinder axis is y, centred: turn it onto +x and slide it to start at the origin.
  return g.rotateZ(-Math.PI / 2).translate(0.5, 0, 0);
}

const geometryCache = new Map<string, BufferGeometry>();

/** Build an element's base geometry once, on first use (it is constant). */
function cached(key: string, make: () => BufferGeometry): BufferGeometry {
  let g = geometryCache.get(key);
  if (!g) {
    g = make();
    geometryCache.set(key, g);
  }
  return g;
}

const len = (v: Vec3): number => Math.hypot(v[0], v[1], v[2]);
const minus = (p: Vec3, q: Vec3): Vec3 => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
const plus = (p: Vec3, q: Vec3): Vec3 => [p[0] + q[0], p[1] + q[1], p[2] + q[2]];

function normalised(v: Vec3): Vec3 {
  const n = len(v);
  return [v[0] / n, v[1] / n, v[2] / n];
}

/**
 * The rotation taking +x onto the unit vector `u` by the shortest arc. Opposite to +x it turns half
 * a turn about z, so a tube in the xy plane always turns about z (its twin, too, stays in the plane).
 */
export function alongX(u: Vec3): Quat {
  const dot = u[0];
  if (dot < -1 + 1e-9) return fromAxisAngle([0, 0, 1], Math.PI);
  // Half-angle form: q = (x × u, 1 + x·u), normalised. x × u = (0, −u_z, u_y).
  const q: Quat = [0, -u[2], u[1], 1 + dot];
  const n = Math.hypot(q[0], q[1], q[2], q[3]);
  return [q[0] / n, q[1] / n, q[2] / n, q[3] / n];
}

/** Surface area of an element (the true round surface; the faceted mesh is within a percent). */
export function elementArea(e: Element): number {
  if (e.kind === 'tube') return 2 * Math.PI * e.radius * len(minus(e.to, e.from));
  if (e.kind === 'ball') return 4 * Math.PI * e.radius * e.radius;
  return 2 * Math.PI * e.radius * (e.radius + e.depth);
}

/** `count` area-uniform samples of one element, with their twin placements. */
export function sampleElement(e: Element, count: number, rng: Rng): ShapeSample[] {
  if (count <= 0) return [];
  if (e.kind === 'tube') {
    const length = len(minus(e.to, e.from));
    const lengthTwin = len(minus(e.toTwin, e.fromTwin));
    const q = alongX(normalised(minus(e.to, e.from)));
    const qTwin = alongX(normalised(minus(e.toTwin, e.fromTwin)));
    const { positions, normals } = samplePart(
      cached(`tube:${e.radius}`, () => unitTube(e.radius)),
      count,
      rng,
    );
    return positions.map(([x, y, z], i) => {
      // The side wall's normal is radial (no x part), so stretching along the tube leaves it be.
      const n: Vec3 = normalised([0, normals[i][1], normals[i][2]]);
      return {
        local: plus(e.from, rotate(q, [x * length, y, z])),
        localTwin: plus(e.fromTwin, rotate(qTwin, [x * lengthTwin, y, z])),
        normal: normalised(rotate(q, n)),
        normalTwin: normalised(rotate(qTwin, n)),
      };
    });
  }
  const geom =
    e.kind === 'ball'
      ? cached(`ball:${e.radius}`, () => ball(e.radius))
      : cached(`pivot:${e.radius}:${e.depth}`, () => axle(e.radius, e.depth));
  const { positions, normals } = samplePart(geom, count, rng);
  return positions.map((p, i) => {
    const n = normalised(normals[i]);
    return {
      local: plus(e.at, p),
      localTwin: plus(e.atTwin, p),
      normal: n,
      normalTwin: [n[0], n[1], n[2]],
    };
  });
}

/** Total surface area of a part's elements. */
export function partArea(elements: Element[]): number {
  return elements.reduce((sum, e) => sum + elementArea(e), 0);
}

/**
 * `count` samples of a part spread over its elements by area (cumulative rounding, so the total is
 * exact and the split is deterministic), each element drawing from the same `rng` in turn.
 */
export function samplePartElements(elements: Element[], count: number, rng: Rng): ShapeSample[] {
  const total = partArea(elements);
  const out: ShapeSample[] = [];
  let cum = 0;
  let edge = 0;
  elements.forEach((e, idx) => {
    cum += elementArea(e);
    const next = idx === elements.length - 1 ? count : Math.min(count, Math.round((count * cum) / total));
    out.push(...sampleElement(e, next - edge, rng));
    edge = next;
  });
  return out;
}
