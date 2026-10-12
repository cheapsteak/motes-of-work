// The plan's two meshes (re-skin §4.7, Task 7b), part of the galaxy's body set (bodySystem.ts):
//   net-plan          the world marks: every system's H pool, the two slots' R and H, a pair's marks (plan.vert.glsl)
//   net-plan-screen   the screen marks: the slots' silhouettes and numerals (planScreen.vert.glsl)
// Both draw with galaxyMote.frag.glsl over the body set's uniforms, and read the plan's own, all from
// plan.ts planFrameOf, a pure function of the frame: the layout table (uPlanTex: its bodies fixed, each
// system's focused planet and its runs in the two pools the frame's), each system's s_px, full-detail
// gain, cull and real share (uPlanSys) and its ranges in the pools (uPlanRange), and the camera
// (uPlanView, uPlanProj).
import {
  BufferAttribute,
  DataTexture,
  FloatType,
  GLSL3,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Matrix4,
  Mesh,
  NearestFilter,
  RawShaderMaterial,
  RGBAFormat,
  type IUniform,
  type PerspectiveCamera,
} from 'three';
import { SYS_MAX, systemOuter, type Galaxy } from '../../galaxy/generate';
import type { BodyData } from './bodyData';
import type { BodyClocks } from './bodyMote';
import { LOD_VISIBLE } from './lod';
import { planDot, planFrameOf, planResolve, planSkips, type PlanFrame } from './plan';
import { buildPlanAttrs, PLAN_MARK, PLAN_STRIDE, PLAN_TABLE_TEXELS, planTable } from './planAttrs';
import { withPlanLibrary } from './shaderSource';
import galaxyMoteFrag from './shaders/galaxyMote.frag.glsl?raw';
import planVert from './shaders/plan.vert.glsl?raw';
import planScreenVert from './shaders/planScreen.vert.glsl?raw';

/** The last frame's lit plan dots (alpha at least LOD_VISIBLE): how many, Σ alpha × size², the systems in R (their full-detail gain over 0, in g.systems; −1 none), how many of each mark, and how many are ember (redder than green: past about 0.4 of the way). */
export interface PlanStats {
  dots: number;
  brightness: number;
  slots: [number, number];
  byMark: Record<string, number>;
  ember: number;
}

export interface PlanMeshes {
  meshes: [Mesh, Mesh];
  /** Instances per mesh. */
  counts: { plan: number; planScreen: number };
  /** One frame: the camera, the screen (CSS px), the bodies' clocks, each system's real share and the level-of-detail overrides. */
  update(camera: PerspectiveCamera, size: { width: number; height: number }, clocks: BodyClocks, real: ArrayLike<number>, force: Float32Array): void;
  /** What the last frame's dots read (null before the first). */
  frame(): PlanFrame | null;
  /** The last frame's lit dots, by the TS twin (plan.ts). */
  stats(): PlanStats;
  /** How many of each mesh's instances the last frame's early-out skipped (planSkips), by mesh name. */
  skipped(): Record<string, number>;
  /** The static pools, as the meshes hold them. */
  pools(): { world: Float32Array; screen: Float32Array };
  dispose(): void;
}

const QUAD = [-1, -1, 1, -1, 1, 1, -1, 1];
const QUAD_INDEX = [0, 1, 2, 0, 2, 3];

const MARK_NAMES = Object.fromEntries(Object.entries(PLAN_MARK).map(([k, v]) => [v, k])) as Record<number, string>;

/** The plan's meshes for `g`, over the body set's uniforms `shared` (the textures, the clocks, uLodForce, uViewport, ...), blended as `blend`. */
export function createPlanMeshes(g: Galaxy, data: BodyData, shared: Record<string, IUniform>, blend: Partial<Pick<RawShaderMaterial, 'blending' | 'blendEquation' | 'blendSrc' | 'blendDst'>>): PlanMeshes {
  const outer = g.systems.map((row) => systemOuter(g, row));
  const table = planTable(g, outer);
  const tableTex = new DataTexture(Float32Array.from(table), PLAN_TABLE_TEXELS, g.systems.length, RGBAFormat, FloatType);
  tableTex.minFilter = NearestFilter;
  tableTex.magFilter = NearestFilter;
  tableTex.needsUpdate = true;
  const attrs = buildPlanAttrs(g);
  const sys = new Float32Array(SYS_MAX * 4);
  const range = new Float32Array(SYS_MAX * 4);
  const tableData = tableTex.image.data as Float32Array;
  const own: Record<string, IUniform> = {
    uPlanTex: { value: tableTex },
    uPlanSys: { value: sys },
    uPlanRange: { value: range },
    uPlanView: { value: new Matrix4() },
    uPlanProj: { value: new Matrix4() },
  };
  const uniforms = { ...shared, ...own };
  const material = (vertex: string): RawShaderMaterial =>
    new RawShaderMaterial({ glslVersion: GLSL3, vertexShader: withPlanLibrary(vertex), fragmentShader: galaxyMoteFrag, uniforms, ...blend, depthWrite: false, transparent: true });
  const geometry = (a: Float32Array, count: number): InstancedBufferGeometry => {
    const geo = new InstancedBufferGeometry();
    geo.setAttribute('aCorner', new BufferAttribute(new Float32Array(QUAD), 2));
    geo.setIndex(QUAD_INDEX);
    const p0 = new Float32Array(count * 4);
    const p1 = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      p0.set(a.subarray(i * PLAN_STRIDE, i * PLAN_STRIDE + 4), i * 4);
      p1.set(a.subarray(i * PLAN_STRIDE + 4, i * PLAN_STRIDE + 8), i * 4);
    }
    geo.setAttribute('aPlan0', new InstancedBufferAttribute(p0, 4));
    geo.setAttribute('aPlan1', new InstancedBufferAttribute(p1, 4));
    geo.instanceCount = count;
    return geo;
  };
  const worldMat = material(planVert);
  const screenMat = material(planScreenVert);
  const worldGeo = geometry(attrs.world, attrs.worldCount);
  const screenGeo = geometry(attrs.screen, attrs.screenCount);
  const mesh = (geo: InstancedBufferGeometry, mat: RawShaderMaterial, name: string): Mesh => {
    const m = new Mesh(geo, mat);
    m.name = name;
    m.frustumCulled = false; // positions are computed in the vertex shader
    return m;
  };
  const meshes: [Mesh, Mesh] = [mesh(worldGeo, worldMat, 'net-plan'), mesh(screenGeo, screenMat, 'net-plan-screen')];
  let last: PlanFrame | null = null;

  return {
    meshes,
    counts: { plan: attrs.worldCount, planScreen: attrs.screenCount },

    update(camera, size, clocks, real, force) {
      camera.updateMatrixWorld();
      const view = { view: camera.matrixWorldInverse.elements, projection: camera.projectionMatrix.elements, width: size.width, height: size.height };
      const f = planFrameOf(g, data, table, { view, clocks, real, force });
      // Every entry set each frame (0 past the systems), so a frame never carries an earlier one's.
      sys.fill(0);
      sys.set(f.sys.subarray(0, Math.min(f.sys.length, sys.length)));
      range.fill(0);
      range.set(f.range.subarray(0, Math.min(f.range.length, range.length)));
      // The table's frame part: uploaded only when the layout moved.
      if (!f.table.every((v, i) => Object.is(v, tableData[i]))) {
        tableData.set(f.table);
        tableTex.needsUpdate = true;
      }
      (own.uPlanView.value as Matrix4).copy(camera.matrixWorldInverse);
      (own.uPlanProj.value as Matrix4).copy(camera.projectionMatrix);
      // The twin keeps its own copies: the camera's matrices change under it.
      last = { ...f, view: { ...view, view: [...view.view], projection: [...view.projection] }, force: Float32Array.from(force) };
    },

    frame: () => last,

    stats() {
      const out: PlanStats = { dots: 0, brightness: 0, slots: [-1, -1], byMark: {}, ember: 0 };
      if (last === null) return out;
      const inR = Array.from({ length: last.sys.length / 4 }, (_, i) => i).filter((i) => last!.sys[i * 4 + 1] > 0);
      out.slots = [inR[0] ?? -1, inR[1] ?? -1];
      for (const a of [attrs.world, attrs.screen]) {
        const n = a.length / PLAN_STRIDE;
        for (let i = 0; i < n; i++) {
          const p = planDot(a, i, last, data);
          if (!(p.alpha >= LOD_VISIBLE)) continue;
          out.dots++;
          out.brightness += p.alpha * p.sizeCss * p.sizeCss;
          const name = MARK_NAMES[planResolve(a, i, last).mark];
          out.byMark[name] = (out.byMark[name] ?? 0) + 1;
          if (p.rgb[0] > p.rgb[1]) out.ember++;
        }
      }
      return out;
    },

    skipped() {
      const f = last;
      if (f === null) return {} as Record<string, number>;
      const count = (a: Float32Array): number => {
        let k = 0;
        for (let i = 0; i < a.length / PLAN_STRIDE; i++) if (planSkips(a, i, f, data)) k++;
        return k;
      };
      return { 'net-plan': count(attrs.world), 'net-plan-screen': count(attrs.screen) };
    },

    pools: () => ({ world: attrs.world, screen: attrs.screen }),

    dispose() {
      worldGeo.dispose();
      screenGeo.dispose();
      worldMat.dispose();
      screenMat.dispose();
      tableTex.dispose();
    },
  };
}
