import { Vector3, type BufferGeometry, type Mesh } from 'three';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import type { Vec3 } from '../math/vec';

// three r186 has `setRandomGenerator`; @types/three 0.186 does not declare it yet. samplePartPair
// also draws each face exactly as `sample` does, through the sampler's own (undeclared) first step.
declare module 'three/examples/jsm/math/MeshSurfaceSampler.js' {
  interface MeshSurfaceSampler {
    setRandomGenerator(randomFunction: () => number): this;
    _sampleFaceIndex(): number;
  }
}

/**
 * The area sampler for `geom`, drawing from `rng`. A geometry may carry a per-vertex `weight`
 * attribute (see `weighted` in src/mechanisms/partGeometry.ts): a face then draws points in
 * proportion to its area times its weight, so one solid of a part can be sampled sparser than the
 * rest. Without one every face weighs its area alone.
 */
function surfaceSampler(geom: BufferGeometry, rng: () => number): MeshSurfaceSampler {
  const sampler = new MeshSurfaceSampler({ geometry: geom } as Mesh).setRandomGenerator(rng);
  if (geom.getAttribute('weight')) sampler.setWeightAttribute('weight');
  return sampler.build();
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
  const sampler = surfaceSampler(geom, rng);
  const p = new Vector3();
  const n = new Vector3();
  for (let i = 0; i < count; i++) {
    sampler.sample(p, n);
    positions.push([p.x, p.y, p.z]);
    normals.push([n.x, n.y, n.z]);
  }
  return { positions, normals };
}

export interface PartSamplePairs extends PartSamples {
  /** The same points on the second shape: the same face, at the same barycentric coordinates. */
  positionsTwin: Vec3[];
  /** Unit normals of the second shape there, interpolated from its own vertex normals. */
  normalsTwin: Vec3[];
}

const vertexIndex = (g: BufferGeometry, k: number): number => (g.index ? g.index.getX(k) : k);
const faceCount = (g: BufferGeometry): number => (g.index ? g.index.count : g.getAttribute('position').count) / 3;

/**
 * `count` points spread by area over `geom`, exactly as `samplePart` spreads them for the same rng,
 * and point for point the same places on `twin`: a second shape of the same topology (the same faces
 * in the same order, as a mesh built by the same calls with other dimensions is), so a point on a
 * tube keeps its place along and round the tube when the tube is moved or resized. Faces are chosen
 * by the areas of `geom`. Both must carry a `normal` attribute.
 */
export function samplePartPair(
  geom: BufferGeometry,
  twin: BufferGeometry,
  count: number,
  rng: () => number,
): PartSamplePairs {
  if (!geom.getAttribute('normal') || !twin.getAttribute('normal')) {
    throw new Error('samplePartPair needs two geometries with normals');
  }
  if (faceCount(geom) !== faceCount(twin) || (geom.index === null) !== (twin.index === null)) {
    throw new Error('samplePartPair needs two geometries of one topology');
  }
  const out: PartSamplePairs = { positions: [], normals: [], positionsTwin: [], normalsTwin: [] };
  if (count <= 0) return out;
  const sampler = surfaceSampler(geom, rng);
  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  const p = new Vector3();
  // The face sampler's own arithmetic, so the points on `geom` are bit for bit the ones samplePart gives.
  const at = (g: BufferGeometry, name: 'position' | 'normal', face: number, u: number, v: number): Vector3 => {
    const attr = g.getAttribute(name);
    a.fromBufferAttribute(attr, vertexIndex(g, face * 3));
    b.fromBufferAttribute(attr, vertexIndex(g, face * 3 + 1));
    c.fromBufferAttribute(attr, vertexIndex(g, face * 3 + 2));
    return p
      .set(0, 0, 0)
      .addScaledVector(a, u)
      .addScaledVector(b, v)
      .addScaledVector(c, 1 - (u + v));
  };
  const v3 = (x: Vector3): Vec3 => [x.x, x.y, x.z];
  for (let i = 0; i < count; i++) {
    const face = sampler._sampleFaceIndex();
    let u = rng();
    let v = rng();
    if (u + v > 1) {
      u = 1 - u;
      v = 1 - v;
    }
    out.positions.push(v3(at(geom, 'position', face, u, v)));
    out.normals.push(v3(at(geom, 'normal', face, u, v).normalize()));
    out.positionsTwin.push(v3(at(twin, 'position', face, u, v)));
    out.normalsTwin.push(v3(at(twin, 'normal', face, u, v).normalize()));
  }
  return out;
}
