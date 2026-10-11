// The ink drawing and the sheet it is made on (docs/specs/2026-10-05-blueprint-and-build.md §2.5,
// §2.11): one instanced draw of screen-space quads, one per segment of every stroke (triangles; no
// points anywhere in the ink), and one static quad of procedural paper. Both read the same
// SceneState and camera as the motes; a frame is a pure function of them.
//   sheet  renderOrder -1: first, writing depth only while fully opaque, so the dimmed cloud behind
//          the page is hidden and nothing in front of it is
//   ink    renderOrder -0.5: on the page, and under the motes, so the lines lie beneath the built
//          bike (the motes screen-blend over them)
import {
  BufferAttribute,
  CustomBlending,
  DataTexture,
  FloatType,
  GLSL3,
  Group,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  NearestFilter,
  OneFactor,
  OneMinusSrcAlphaFactor,
  PlaneGeometry,
  RawShaderMaterial,
  RGBAFormat,
  Vector2,
  type IUniform,
  type PerspectiveCamera,
} from 'three';
import { ZERO_FAULTS, type SceneState } from '../../timeline/sceneState';
import type { Mechanism } from '../../mechanisms/types';
import { packPartTexture } from '../mote/partTransforms';
import { moteLibraryGlsl, splice } from '../mote/shaderSource';
import { inkInstances, partXRanks, type InkInstances } from './inkLayout';
import { inkPoses } from './inkPose';
import inkFrag from './shaders/ink.frag.glsl?raw';
import inkVert from './shaders/ink.vert.glsl?raw';
import sheetFrag from './shaders/sheet.frag.glsl?raw';
import sheetVert from './shaders/sheet.vert.glsl?raw';

export interface InkSystem {
  object: Group; // sheet + ink meshes
  /** Segments drawn (one quad each). */
  segments: number;
  update(state: SceneState, camera: PerspectiveCamera, viewportPx: { width: number; height: number; pixelRatio: number }): void;
  dispose(): void;
}

const LIBRARY_MARKER = '// #include mote.glsl (spliced in by inkSystem.ts: moteRotate and hash01; nothing in it changes)';

/** Premultiplied alpha over what is there. */
const OVER = { blending: CustomBlending, blendSrc: OneFactor, blendDst: OneMinusSrcAlphaFactor } as const;

function partTexture(partCount: number): DataTexture {
  const tex = new DataTexture(new Float32Array(partCount * 8), partCount * 2, 1, RGBAFormat, FloatType);
  tex.minFilter = NearestFilter;
  tex.magFilter = NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

function inkGeometry(inst: InkInstances): InstancedBufferGeometry {
  const g = new InstancedBufferGeometry();
  // Corner x: 0 at the segment's start, 1 at its end; y: either side of the line.
  g.setAttribute('aCorner', new BufferAttribute(new Float32Array([0, -1, 1, -1, 1, 1, 0, 1]), 2));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  const attr = (name: string, data: Float32Array, size: number) => g.setAttribute(name, new InstancedBufferAttribute(data, size));
  attr('aA', inst.a, 3);
  attr('aB', inst.b, 3);
  attr('aATwin', inst.aTwin, 3);
  attr('aBTwin', inst.bTwin, 3);
  attr('aArcs', inst.arcs, 4);
  attr('aAlong', inst.along, 2);
  attr('aMeta', inst.meta, 4);
  attr('aStyle', inst.style, 4);
  g.instanceCount = inst.count;
  return g;
}

/** The mechanism's drawing and sheet, or null when it has none. */
export function createInkSystem(mech: Mechanism): InkSystem | null {
  if (!mech.ink || !mech.sheet) return null;
  const strokes = mech.ink();
  const inst = inkInstances(strokes, partXRanks(strokes, mech.pose(0, ZERO_FAULTS, 0)));

  const viewport: IUniform<Vector2> = { value: new Vector2(1, 1) };
  const pixelRatio: IUniform<number> = { value: 1 };
  const correct = partTexture(mech.parts.length);
  const twin = partTexture(mech.parts.length);
  const inkUniforms = {
    uViewport: viewport,
    uPixelRatio: pixelRatio,
    uPartsCorrect: { value: correct },
    uPartsTwin: { value: twin },
    uDrawn: { value: 0 },
    uRedraw: { value: 0 },
    uFlat: { value: 0 },
    uOpacity: { value: 0 },
    uSheet: { value: 0 },
    uRing: { value: 0 },
    uTick: { value: 0 },
  } satisfies Record<string, IUniform>;
  const inkMaterial = new RawShaderMaterial({
    glslVersion: GLSL3,
    vertexShader: splice(inkVert, LIBRARY_MARKER, moteLibraryGlsl(), 'ink vertex shader'),
    fragmentShader: inkFrag,
    uniforms: inkUniforms,
    ...OVER,
    transparent: true,
    depthWrite: false,
    depthTest: true,
  });
  const inkGeom = inkGeometry(inst);
  const inkMesh = new Mesh(inkGeom, inkMaterial);
  inkMesh.name = 'ink';
  inkMesh.frustumCulled = false; // positions are computed in the vertex shader
  inkMesh.renderOrder = -0.5;

  const { centre, width, height } = mech.sheet;
  const sheetGeom = new PlaneGeometry(width, height).translate(...centre);
  const sheetUniforms = { uOpacity: { value: 0 }, uAspect: { value: new Vector2(1, height / width) } };
  const sheetMaterial = new RawShaderMaterial({
    glslVersion: GLSL3,
    vertexShader: sheetVert,
    fragmentShader: sheetFrag,
    uniforms: sheetUniforms,
    ...OVER,
    transparent: true,
    depthWrite: false,
    depthTest: true,
  });
  const sheetMesh = new Mesh(sheetGeom, sheetMaterial);
  sheetMesh.name = 'sheet';
  sheetMesh.renderOrder = -1;

  const group = new Group();
  group.add(sheetMesh, inkMesh);
  inkMesh.visible = false;
  sheetMesh.visible = false;

  return {
    object: group,
    segments: inst.count,

    update(state, _camera, viewportPx) {
      viewport.value.set(Math.max(1, viewportPx.width), Math.max(1, viewportPx.height));
      const ratio = viewportPx.pixelRatio;
      pixelRatio.value = Number.isFinite(ratio) && ratio > 0 ? ratio : 1;

      const sheet = state.sheet.opacity;
      sheetMesh.visible = sheet > 0;
      sheetUniforms.uOpacity.value = sheet;
      // Fully opaque, the page hides what is behind it; fading, it lets it show and hides nothing.
      sheetMaterial.depthWrite = sheet >= 0.999;

      inkMesh.visible = state.ink.opacity > 0;
      if (!inkMesh.visible) return;
      const poses = inkPoses(mech, state);
      (correct.image.data as Float32Array).set(packPartTexture(poses.correct));
      correct.needsUpdate = true;
      (twin.image.data as Float32Array).set(packPartTexture(poses.twin));
      twin.needsUpdate = true;
      const { ink } = state;
      inkUniforms.uDrawn.value = ink.drawn;
      inkUniforms.uRedraw.value = ink.redraw;
      inkUniforms.uFlat.value = ink.flat;
      inkUniforms.uOpacity.value = ink.opacity;
      inkUniforms.uSheet.value = sheet;
      inkUniforms.uRing.value = ink.ring;
      inkUniforms.uTick.value = ink.tick;
    },

    dispose() {
      inkGeom.dispose();
      sheetGeom.dispose();
      inkMaterial.dispose();
      sheetMaterial.dispose();
      correct.dispose();
      twin.dispose();
    },
  };
}
