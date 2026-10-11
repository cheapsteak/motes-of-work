import { Vector3, type BufferGeometry, type Mesh } from 'three';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import type { Vec3 } from '../math/vec';

// three r186 has `setRandomGenerator`; @types/three 0.186 does not declare it yet.
declare module 'three/examples/jsm/math/MeshSurfaceSampler.js' {
  interface MeshSurfaceSampler {
    setRandomGenerator(randomFunction: () => number): this;
  }
}

export interface PartSamples {
  positions: Vec3[];
  /** Unit surface normals, one per position. */
  normals: Vec3[];
}

/**
 * `count` points spread over the surface of `geom` by area, with their unit normals. Every random
 * draw comes from `rng` (three's sampler is handed it via `setRandomGenerator` and uses nothing
 * else), so the result is a pure function of the geometry, the count and the rng's state.
 * `geom` must carry a `normal` attribute.
 */
export function samplePart(geom: BufferGeometry, count: number, rng: () => number): PartSamples {
  if (!geom.getAttribute('normal')) throw new Error('samplePart needs a geometry with normals');
  const positions: Vec3[] = [];
  const normals: Vec3[] = [];
  if (count <= 0) return { positions, normals };
  // The sampler only reads `mesh.geometry`. A real Mesh would draw uuids (its own and its default
  // material's) from Math.random: harmless to the output, but kept out so `rng` is the only source.
  const sampler = new MeshSurfaceSampler({ geometry: geom } as Mesh).setRandomGenerator(rng).build();
  const p = new Vector3();
  const n = new Vector3();
  for (let i = 0; i < count; i++) {
    sampler.sample(p, n);
    positions.push([p.x, p.y, p.z]);
    normals.push([n.x, n.y, n.z]);
  }
  return { positions, normals };
}
