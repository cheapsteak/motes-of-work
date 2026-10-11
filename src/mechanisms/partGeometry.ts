// Shared helpers for building and sharing out a mechanism's part geometry: merge solids into one
// part, measure a part's surface, and split a point budget between parts by area.
import { Float32BufferAttribute, type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** One part's geometry from several solids (indexed or not); they must carry the same attributes. */
export function merge(...geoms: BufferGeometry[]): BufferGeometry {
  const merged = mergeGeometries(geoms.map((g) => (g.index ? g.toNonIndexed() : g)));
  if (!merged) throw new Error('part geometries do not share attributes');
  return merged;
}

/**
 * A solid whose faces draw `weight` times their area's share of a part's points (1 is the part's own
 * density): a `weight` attribute the samplers read. Every solid merged into one part then needs a
 * weight, as merge needs the same attributes on all.
 */
export function weighted(geom: BufferGeometry, weight: number): BufferGeometry {
  const g = geom.index ? geom.toNonIndexed() : geom;
  g.setAttribute('weight', new Float32BufferAttribute(new Float32Array(g.getAttribute('position').count).fill(weight), 1));
  return g;
}

/**
 * Total surface area of a triangle soup; with a `weight` attribute (see `weighted`), each face's area
 * times its mean vertex weight, the area that draws points.
 */
export function surfaceArea(geom: BufferGeometry): number {
  const g = geom.index ? geom.toNonIndexed() : geom;
  const p = g.getAttribute('position');
  const w = g.getAttribute('weight');
  const weightAt = (i: number) => (w ? (w.getX(i) + w.getX(i + 1) + w.getX(i + 2)) / 3 : 1);
  let area = 0;
  for (let i = 0; i < p.count; i += 3) {
    const ax = p.getX(i + 1) - p.getX(i);
    const ay = p.getY(i + 1) - p.getY(i);
    const az = p.getZ(i + 1) - p.getZ(i);
    const bx = p.getX(i + 2) - p.getX(i);
    const by = p.getY(i + 2) - p.getY(i);
    const bz = p.getZ(i + 2) - p.getZ(i);
    area += (weightAt(i) * Math.hypot(ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx)) / 2;
  }
  return area;
}

export interface ShareInput {
  /** In the core group (else the body and drift group). */
  core: boolean;
  /** Surface area. */
  area: number;
  /** Point density relative to the rest of its group; default 1. */
  density?: number;
  /** A fixed share of its group's points instead of one by area. */
  share?: number;
}

/**
 * Each part's share of the point budget (they sum to 1). The core group takes `coreShare` and the
 * rest the remainder. Within a group a part with a fixed `share` takes that much of the group, and
 * the others split what is left by area times density, so parts are evenly dense.
 */
export function pointWeights(parts: ShareInput[], coreShare: number): number[] {
  const mass = parts.map((p) => p.area * (p.density ?? 1));
  const weights = mass.map(() => 0);
  for (const core of [true, false]) {
    const group = parts.map((_, i) => i).filter((i) => parts[i].core === core);
    const total = core ? coreShare : 1 - coreShare;
    const fixedShare = group.reduce((sum, i) => sum + (parts[i].share ?? 0), 0);
    const areaMass = group.filter((i) => parts[i].share === undefined).reduce((sum, i) => sum + mass[i], 0);
    for (const i of group) {
      const f = parts[i].share;
      weights[i] = f !== undefined ? total * f : (total * (1 - fixedShare) * mass[i]) / areaMass;
    }
  }
  return weights;
}
