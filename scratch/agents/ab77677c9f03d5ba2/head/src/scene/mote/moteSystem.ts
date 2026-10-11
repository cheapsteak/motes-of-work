// Instanced mote rendering (spec §5.1, §6.4): one instance per mote, positions evaluated by the
// GLSL mote() library in the vertex shader. Three meshes share the instanced attributes:
//   motes   two quads per instance; the second is the dialogue twin, collapsed unless hero Dialogue
//   threads one 1.5px quad between the dialogue twins (hero Dialogue only)
// Only a hash-selected hero fraction of Human (1%) and Dialogue (3%) motes takes the large form
// (spec §5.1 counts); the rest render as small points in their type colour. See instance.glsl.
//   ghost   every 4th instance as a 2px white dot, posed with zero faults (spec §5.2)
// Motes and threads are lit (src/scene/lighting.ts): the depth range comes from the camera and the
// machine's anchor sphere each frame, so a frame stays a pure function of state, anchors and camera.
// The ghost is unlit.
import {
  AdditiveBlending,
  BufferAttribute,
  DataTexture,
  FloatType,
  GLSL3,
  Group,
  type InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  NearestFilter,
  RawShaderMaterial,
  RGBAFormat,
  Vector2,
  Vector3,
  type IUniform,
  type PerspectiveCamera,
} from 'three';
import { mechanismAnchors } from '../../mechanisms/anchors';
import type { Mechanism } from '../../mechanisms/types';
import { ZERO_FAULTS, type SceneState } from '../../timeline/sceneState';
import { lightingUniforms, updateDepthUniforms } from '../lighting';
import { buildMoteAttrs, type MoteAttrs, type MoteType } from './attributes';
import { instancedAttributes } from './layout';
import { packPartTexture, partTransforms } from './partTransforms';
import { withMoteLibrary } from './shaderSource';
import ghostFrag from './shaders/ghost.frag.glsl?raw';
import ghostVert from './shaders/ghost.vert.glsl?raw';
import moteFrag from './shaders/mote.frag.glsl?raw';
import moteVert from './shaders/mote.vert.glsl?raw';
import threadFrag from './shaders/thread.frag.glsl?raw';
import threadVert from './shaders/thread.vert.glsl?raw';

export interface MoteSystem {
  object: Group; // motes + threads + ghost meshes
  /** Instance count, and how many are visible in each scenario (specced, vibed, misallocated). */
  counts: { instances: number; visible: [number, number, number] };
  update(
    state: SceneState,
    camera: PerspectiveCamera,
    viewportPx: { width: number; height: number },
    shimmerTime: number | null,
  ): void;
  dispose(): void;
}

/** Measurement-only overrides (the fill spike's all-Human worst case). Omit for the real thing. */
export interface MoteSystemOptions {
  /** Every mote takes this type in every scenario, and renders in that type's hero form. */
  forceType?: MoteType;
}

const QUAD = [-1, -1, 1, -1, 1, 1, -1, 1];
const QUAD_INDEX = [0, 1, 2, 0, 2, 3];

function instancedGeometry(
  instanced: Record<string, InstancedBufferAttribute>,
  count: number,
  corners: number[],
  index: number[],
): InstancedBufferGeometry {
  const g = new InstancedBufferGeometry();
  g.setAttribute('aCorner', new BufferAttribute(new Float32Array(corners), 2));
  g.setIndex(index);
  for (const [name, attr] of Object.entries(instanced)) g.setAttribute(name, attr);
  g.instanceCount = count;
  return g;
}

function partTexture(partCount: number): DataTexture {
  const tex = new DataTexture(new Float32Array(partCount * 8), partCount * 2, 1, RGBAFormat, FloatType);
  tex.minFilter = NearestFilter;
  tex.magFilter = NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

function writePartTexture(tex: DataTexture, packed: Float32Array): void {
  (tex.image.data as Float32Array).set(packed);
  tex.needsUpdate = true;
}

/** The mote.glsl uniforms plus the instance chunk's, as fresh uniform objects. */
function moteUniforms(parts: DataTexture, viewport: IUniform<Vector2>, forceHero: boolean) {
  return {
    uParts: { value: parts },
    uAssembly: { value: 1 },
    uVariant: { value: 0 },
    uDrive: { value: 0 },
    uDrift: { value: 0 },
    uVibed: { value: 0 },
    uMisallocated: { value: 0 },
    uViewport: viewport,
    uShimmerOn: { value: 0 },
    uShimmerTime: { value: 0 },
    uForceHero: { value: forceHero ? 1 : 0 },
  } satisfies Record<string, IUniform>;
}

function material(vertex: string, fragment: string, uniforms: Record<string, IUniform>): RawShaderMaterial {
  return new RawShaderMaterial({
    glslVersion: GLSL3,
    vertexShader: withMoteLibrary(vertex),
    fragmentShader: fragment,
    uniforms,
    blending: AdditiveBlending,
    depthWrite: false,
    transparent: true,
  });
}

function mesh(geometry: InstancedBufferGeometry, mat: RawShaderMaterial, name: string): Mesh {
  const m = new Mesh(geometry, mat);
  m.name = name;
  m.frustumCulled = false; // positions are computed in the vertex shader
  return m;
}

export function createMoteSystem(mech: Mechanism, budget: number, seed: number, opts?: MoteSystemOptions): MoteSystem {
  const forceType = opts?.forceType;
  const built = buildMoteAttrs(mech, mech.samplePoints(budget, seed));
  const attrs =
    forceType === undefined ? built : built.map((a): MoteAttrs => ({ ...a, type: [forceType, forceType, forceType] }));
  const instanced = instancedAttributes(attrs);
  const n = attrs.length;

  const moteGeometry = instancedGeometry(
    instanced,
    n,
    [...QUAD, ...QUAD],
    [...QUAD_INDEX, ...QUAD_INDEX.map((i) => i + 4)],
  );
  moteGeometry.setAttribute('aQuad', new BufferAttribute(new Float32Array([0, 0, 0, 0, 1, 1, 1, 1]), 1));
  const threadGeometry = instancedGeometry(instanced, n, [0, -1, 1, -1, 1, 1, 0, 1], QUAD_INDEX);
  const ghostGeometry = instancedGeometry(instanced, n, QUAD, QUAD_INDEX);

  const viewport: IUniform<Vector2> = { value: new Vector2(1, 1) };
  const parts = partTexture(mech.parts.length);
  const ghostParts = partTexture(mech.parts.length);
  // Motes and threads share one set of uniform objects; the ghost has its own.
  const forceHero = forceType !== undefined;
  const live = { ...moteUniforms(parts, viewport, forceHero), ...lightingUniforms() };
  const anchors = mechanismAnchors(mech);
  const ghost = { ...moteUniforms(ghostParts, viewport, forceHero), uGhost: { value: 0 } };

  const moteMaterial = material(moteVert, moteFrag, live);
  const threadMaterial = material(threadVert, threadFrag, live);
  const ghostMaterial = material(ghostVert, ghostFrag, ghost);

  const group = new Group();
  const ghostMesh = mesh(ghostGeometry, ghostMaterial, 'mote-ghost');
  group.add(mesh(moteGeometry, moteMaterial, 'motes'), mesh(threadGeometry, threadMaterial, 'mote-threads'), ghostMesh);

  const visible: [number, number, number] = [0, 1, 2].map((k) => attrs.filter((a) => a.visible[k]).length) as [
    number,
    number,
    number,
  ];

  return {
    object: group,
    counts: { instances: n, visible },

    // The camera's matrices reach the shaders through the renderer; its position sets the depth range.
    update(state, camera, viewportPx, shimmerTime) {
      const { mech: m, provenance } = state;
      viewport.value.set(Math.max(1, viewportPx.width), Math.max(1, viewportPx.height));
      const eye = camera.getWorldPosition(new Vector3());
      updateDepthUniforms(live, [eye.x, eye.y, eye.z], anchors.whole);

      writePartTexture(parts, packPartTexture(partTransforms(mech, state)));
      live.uAssembly.value = m.assembly;
      live.uVariant.value = m.variant;
      live.uDrive.value = m.drive;
      live.uDrift.value = m.faults.drift;
      live.uVibed.value = provenance.vibed;
      live.uMisallocated.value = provenance.misallocated;
      const shimmerOn = shimmerTime !== null && Number.isFinite(shimmerTime);
      live.uShimmerOn.value = shimmerOn ? 1 : 0;
      live.uShimmerTime.value = shimmerOn ? ((shimmerTime % 1000) + 1000) % 1000 : 0;

      // The intended machine: assembled, correct variant, zero faults, specced.
      ghostMesh.visible = m.ghost > 0;
      if (ghostMesh.visible) {
        const intended: SceneState = {
          ...state,
          mech: { ...m, assembly: 1, variant: 0, faults: { ...ZERO_FAULTS } },
        };
        writePartTexture(ghostParts, packPartTexture(partTransforms(mech, intended)));
        ghost.uDrive.value = m.drive;
        ghost.uGhost.value = m.ghost;
      }
    },

    dispose() {
      for (const g of [moteGeometry, threadGeometry, ghostGeometry]) g.dispose();
      for (const mat of [moteMaterial, threadMaterial, ghostMaterial]) mat.dispose();
      parts.dispose();
      ghostParts.dispose();
    },
  };
}
