// Test-only helpers for checking generated meshes and outlines. Not imported by the app.
import { Triangle, Vector3, type BufferGeometry } from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Vec2, Vec3 } from '../math/vec';

/**
 * Edges that are not shared by exactly two triangles, after welding coincident vertices. A closed
 * (watertight) surface has none.
 */
export function openEdges(geom: BufferGeometry): number {
  const bare = geom.clone();
  for (const name of Object.keys(bare.attributes)) if (name !== 'position') bare.deleteAttribute(name);
  const welded = mergeVertices(bare, 1e-6);
  const index = welded.getIndex();
  if (!index) throw new Error('mergeVertices returned a non-indexed geometry');
  const uses = new Map<string, number>();
  for (let i = 0; i < index.count; i += 3) {
    const tri = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
    for (let e = 0; e < 3; e++) {
      const a = tri[e];
      const b = tri[(e + 1) % 3];
      const key = a < b ? `${a},${b}` : `${b},${a}`;
      uses.set(key, (uses.get(key) ?? 0) + 1);
    }
  }
  let open = 0;
  for (const n of uses.values()) if (n !== 2) open++;
  return open;
}

/** Distance from `p` to the nearest triangle of `geom`. */
export function distanceToMesh(geom: BufferGeometry, p: Vec3): number {
  const pos = geom.getAttribute('position');
  const index = geom.getIndex();
  const tri = new Triangle();
  const q = new Vector3(...p);
  const closest = new Vector3();
  const faces = (index ? index.count : pos.count) / 3;
  let best = Infinity;
  for (let f = 0; f < faces; f++) {
    const [a, b, c] = [0, 1, 2].map((k) => (index ? index.getX(3 * f + k) : 3 * f + k));
    tri.a.fromBufferAttribute(pos, a);
    tri.b.fromBufferAttribute(pos, b);
    tri.c.fromBufferAttribute(pos, c);
    best = Math.min(best, tri.closestPointToPoint(q, closest).distanceTo(q));
  }
  return best;
}

/** Even-odd point-in-polygon test. */
export function insidePolygon(poly: Vec2[], [x, y]: Vec2): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Signed area of a closed polygon: positive when counter-clockwise. */
export function signedArea(poly: Vec2[]): number {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) a += poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1];
  return a / 2;
}

/** Number of local extrema of the radius walked around a closed outline (plateaus count once). */
export function radialExtrema(poly: Vec2[], eps = 1e-9): number {
  const r = poly.map(([x, y]) => Math.hypot(x, y));
  const signs: number[] = [];
  for (let i = 0; i < r.length; i++) {
    const d = r[(i + 1) % r.length] - r[i];
    if (Math.abs(d) > eps) signs.push(Math.sign(d));
  }
  let changes = 0;
  for (let i = 0; i < signs.length; i++) if (signs[i] !== signs[(i + 1) % signs.length]) changes++;
  return changes;
}

/** Share of a circle of radius `r` (sampled at `n` angles) that lies inside the outline. */
export function insideShare(poly: Vec2[], r: number, n = 20000): number {
  let inside = 0;
  for (let i = 0; i < n; i++) {
    const a = ((i + 0.5) / n) * Math.PI * 2;
    if (insidePolygon(poly, [r * Math.cos(a), r * Math.sin(a)])) inside++;
  }
  return inside / n;
}

/** Axis-aligned bounds of a geometry's positions. */
export function bounds(geom: BufferGeometry): { min: Vec3; max: Vec3 } {
  geom.computeBoundingBox();
  const box = geom.boundingBox!;
  return { min: box.min.toArray() as Vec3, max: box.max.toArray() as Vec3 };
}
