import { ExtrudeGeometry, Path, Shape, Vector2, type BufferGeometry } from 'three';
import type { Vec2 } from '../math/vec';

const toVectors = (poly: Vec2[]): Vector2[] => poly.map(([x, y]) => new Vector2(x, y));

/**
 * A closed solid: `outline` (minus `holes`) in the xy plane, extruded along z to `depth` and
 * centred on z = 0. Either winding is accepted for the outline and the holes. Flat-shaded, no
 * bevel; carries `position` and `normal` only.
 */
export function extrudeProfile(outline: Vec2[], holes: Vec2[][], depth: number): BufferGeometry {
  const shape = new Shape(toVectors(outline));
  for (const hole of holes) shape.holes.push(new Path(toVectors(hole)));
  const geom = new ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1 });
  geom.deleteAttribute('uv');
  geom.translate(0, 0, -depth / 2);
  return geom;
}
