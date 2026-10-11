// Instanced mote rendering (spec §5.1, §6.4): one instance per mote, positions evaluated by the
// GLSL mote() library in the vertex shader. Three meshes share the instanced attributes:
//   motes   two quads per instance; the second is the dialogue twin, collapsed unless hero Dialogue
//   threads one 1.5px quad between the dialogue twins (hero Dialogue only)
// Only a hash-selected hero fraction of Human (2%) and Dialogue (4%) motes takes the large form
// (spec §5.1 counts); the rest render as small points in their type colour. See instance.glsl.
//   ghost   every 4th instance as a 2px cool-white dot, posed with zero faults (spec §5.2), in
//           mech.ghostVariant (the drawing of storyboard §2.4)
// Motes and threads are lit (src/scene/lighting.ts): the depth range comes from the camera and the
// machine's anchor sphere each frame, so a frame stays a pure function of state, anchors and camera.
// They screen-blend (premultiplied output): a stack of motes saturates toward its type colour rather
// than racing every channel to white. The ghost is unlit and additive, and drawn last (renderOrder),
// on top of the machine; its alpha is LIGHTING.ghostAlpha, a uniform like the lighting constants.
// Pixel sizes are in CSS px: the shaders scale them by uPixelRatio, the renderer's pixel ratio.
import {
  AddEquation,
  AdditiveBlending,
  BufferAttribute,
  CustomBlending,
  DataTexture,
  FloatType,
  GLSL3,
  Group,
  type InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  NearestFilter,
  OneFactor,
  OneMinusSrcColorFactor,
  RawShaderMaterial,
  RGBAFormat,
  Vector2,
  Vector3,
  Vector4,
  type IUniform,
  type PerspectiveCamera,
  type ShaderMaterialParameters,
} from 'three';
import { mechanismAnchors } from '../../mechanisms/anchors';
import type { Mechanism } from '../../mechanisms/types';
import { ZERO_FAULTS, type SceneState } from '../../timeline/sceneState';
import { lightingUniforms, updateDepthUniforms } from '../lighting';
import { buildMoteAttrs, type MoteAttrs, type MoteType } from './attributes';
import { instancedAttributes } from './layout';
import { groupCounts, reflowKeep, type Vec4 } from './mote';
import { partGroups } from '../../mechanisms/bike/partGroups';
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
  /**
   * `viewportPx` is the drawing buffer; `pixelRatio` is the renderer's (renderer.getPixelRatio()),
   * drawing-buffer px per CSS px, so point sizes keep their CSS size on high-density displays.
   * `bodies` is where the reflow carries the motes at this frame's ambient (mote.ts reflowBodies):
   * needed while `mech.reflow` is above 0, and ignored otherwise.
   */
  update(
    state: SceneState,
    camera: PerspectiveCamera,
    viewportPx: { width: number; height: number; pixelRatio: number },
    shimmerTime: number | null,
    bodies?: readonly Vec4[] | null,
  ): void;
  dispose(): void;
}

/** Measurement-only overrides (the fill spike's all-Human worst case). Omit for the real thing. */
export interface MoteSystemOptions {
  /** Every mote takes this type in every scenario, and renders in that type's hero form. */
  forceType?: MoteType;
  /**
   * The per-mote inputs, built beforehand by `moteInputs` with the same mechanism, budget, seed and
   * type: a caller that builds many systems of one essay (the purity twin, src/purity/twin.ts) builds
   * them once. They are only read, never written. Omitted, the system builds its own.
   */
  inputs?: MoteInputs;
}

/** A mote system's per-mote inputs: a pure function of its mechanism, budget, seed and forced type. */
export interface MoteInputs {
  attrs: readonly MoteAttrs[];
  instanced: Record<string, InstancedBufferAttribute>;
}

export function moteInputs(mech: Mechanism, budget: number, seed: number, forceType?: MoteType): MoteInputs {
  const built = buildMoteAttrs(mech, mech.samplePoints(budget, seed));
  const attrs =
    forceType === undefined ? built : built.map((a): MoteAttrs => ({ ...a, type: [forceType, forceType, forceType] }));
  return { attrs, instanced: instancedAttributes(attrs) };
}

const QUAD = [-1, -1, 1, -1, 1, 1, -1, 1];
const QUAD_INDEX = [0, 1, 2, 0, 2, 3];
/** Each part group's keep share outside the reflow: every mote kept (read only while it runs). */
const NO_REFLOW_KEEP: readonly number[] = Object.freeze(new Array<number>(8).fill(1));

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
function moteUniforms(
  parts: DataTexture,
  viewport: IUniform<Vector2>,
  pixelRatio: IUniform<number>,
  forceHero: boolean,
) {
  return {
    uParts: { value: parts },
    uAssembly: { value: 1 },
    uVariant: { value: 0 },
    uDrive: { value: 0 },
    uDrift: { value: 0 },
    uVibed: { value: 0 },
    uMisallocated: { value: 0 },
    uReflow: { value: 0 },
    uBodies: { value: Array.from({ length: 8 }, () => new Vector4()) },
    uReflowKeep: { value: NO_REFLOW_KEEP },
    uViewport: viewport,
    uPixelRatio: pixelRatio,
    uShimmerOn: { value: 0 },
    uShimmerTime: { value: 0 },
    uForceHero: { value: forceHero ? 1 : 0 },
  } satisfies Record<string, IUniform>;
}

type Blend = Pick<ShaderMaterialParameters, 'blending' | 'blendEquation' | 'blendSrc' | 'blendDst'>;
/** Screen, src + dst * (1 - src) per channel: the fragment shaders output premultiplied colour. */
const SCREEN: Blend = {
  blending: CustomBlending,
  blendEquation: AddEquation,
  blendSrc: OneFactor,
  blendDst: OneMinusSrcColorFactor,
};
const ADDITIVE: Blend = { blending: AdditiveBlending };

function material(vertex: string, fragment: string, uniforms: Record<string, IUniform>, blend: Blend): RawShaderMaterial {
  return new RawShaderMaterial({
    glslVersion: GLSL3,
    vertexShader: withMoteLibrary(vertex),
    fragmentShader: fragment,
    uniforms,
    ...blend,
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
  const { attrs, instanced } = opts?.inputs ?? moteInputs(mech, budget, seed, forceType);
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
  const pixelRatio: IUniform<number> = { value: 1 };
  const groups = partGroups(mech);
  // Each group's motes as the reflow lands them (the specced scenario's, Act II's), for its keep share (reflowKeep).
  const counts = groupCounts(groups, attrs.filter((a) => a.visible[0]));
  const parts = partTexture(mech.parts.length);
  const ghostParts = partTexture(mech.parts.length);
  // Motes and threads share one set of uniform objects; the ghost has its own.
  const forceHero = forceType !== undefined;
  // uStage (stage.motes) dims the mote and thread draws only: the mote() library is untouched.
  const live = { ...moteUniforms(parts, viewport, pixelRatio, forceHero), ...lightingUniforms(), uStage: { value: 1 } };
  const anchors = mechanismAnchors(mech);
  // The ghost takes the lighting uniforms only for uGhostAlpha (it is unlit), so the comparison
  // page's dev sliders reach it the same way as the rest.
  const ghost = { ...moteUniforms(ghostParts, viewport, pixelRatio, forceHero), ...lightingUniforms(), uGhost: { value: 0 } };

  const moteMaterial = material(moteVert, moteFrag, live, SCREEN);
  const threadMaterial = material(threadVert, threadFrag, live, SCREEN);
  const ghostMaterial = material(ghostVert, ghostFrag, ghost, ADDITIVE);

  const group = new Group();
  const ghostMesh = mesh(ghostGeometry, ghostMaterial, 'mote-ghost');
  // The meshes share a position, so three.js would order them by id; the ghost goes on top.
  ghostMesh.renderOrder = 1;
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
    update(state, camera, viewportPx, shimmerTime, bodies) {
      const { mech: m, provenance } = state;
      viewport.value.set(Math.max(1, viewportPx.width), Math.max(1, viewportPx.height));
      const ratio = viewportPx.pixelRatio;
      pixelRatio.value = Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
      const eye = camera.getWorldPosition(new Vector3());
      updateDepthUniforms(live, [eye.x, eye.y, eye.z], anchors.whole);

      const xf = partTransforms(mech, state);
      writePartTexture(parts, packPartTexture(xf, groups));
      live.uAssembly.value = m.assembly;
      live.uVariant.value = m.variant;
      live.uDrive.value = m.drive;
      live.uDrift.value = m.faults.drift;
      live.uVibed.value = provenance.vibed;
      live.uMisallocated.value = provenance.misallocated;
      live.uReflow.value = m.reflow;
      if (m.reflow > 0) {
        if (!bodies) throw new Error('MoteSystem.update: the reflow needs its bodies (reflowBodies)');
        bodies.forEach((b, k) => live.uBodies.value[k].set(b[0], b[1], b[2], b[3]));
        live.uReflowKeep.value = reflowKeep(bodies, counts);
      } else {
        // Unread at 0, but put back as built, so what the GPU holds is the frame's alone, not the
        // last reflow's (the purity twin compares every uniform: src/purity/twin.ts).
        for (const b of live.uBodies.value) b.set(0, 0, 0, 0);
        live.uReflowKeep.value = NO_REFLOW_KEEP;
      }
      live.uStage.value = state.stage.motes;
      const shimmerOn = shimmerTime !== null && Number.isFinite(shimmerTime);
      live.uShimmerOn.value = shimmerOn ? 1 : 0;
      live.uShimmerTime.value = shimmerOn ? ((shimmerTime % 1000) + 1000) % 1000 : 0;

      // The intended machine: assembled, zero faults, unsteered, specced, drawn in the ghost's own
      // variant (the correct machine unless the story draws the wrong one, storyboard §2.4).
      ghostMesh.visible = m.ghost > 0;
      if (ghostMesh.visible) {
        const intended: SceneState = {
          ...state,
          mech: { ...m, assembly: 1, variant: m.ghostVariant, steer: 0, faults: { ...ZERO_FAULTS } },
        };
        writePartTexture(ghostParts, packPartTexture(partTransforms(mech, intended)));
        ghost.uDrive.value = m.drive;
        ghost.uVariant.value = m.ghostVariant;
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
