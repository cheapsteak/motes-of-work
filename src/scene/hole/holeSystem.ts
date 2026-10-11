// The black hole drawn (docs/specs/2026-10-09-act-2-reskin.md §4.2; the re-skin's Task 5), at the
// galactic centre in place of the six core bodies, one mesh per part, every dot a quad:
//   hole-disk       the accretion disk's dots, sheared by streak lifetimes, lopsided by Doppler beaming
//   hole-arch       the disk's first HOLE_DOTS.arch dots again, through the lens's underside image
//   hole-ring       the photon ring, a circle in the view plane at the shadow's edge
//   hole-jets       the two jets' sheaths of dots, drifting out and twisting
//   hole-knots      the clumps riding the jets, clean until the story's fronts say ember (Task 6)
//   hole-infall     the specks falling in (the prompts, never named)
//   hole-strand-r0  R0's strand in the outer disk: whole and clean until Task 6 keys its heat
//   hole-strand-r1  R1's strand in the inner disk: its window closed until Task 6 keys it
// Every dot's place, colour and light come from hole.glsl in the vertex shader (hole.vert.glsl); the CPU
// computes once a frame only what the hole shares (holeFrame.ts): its view, its gain, the small hole,
// the shadow's disc (shadow.ts), which it writes into the one uniform every galaxy material reads. The
// parts skip whole (the group hidden) when the hole is unlit, not up, not shown, behind the camera or off
// the screen by more than its reach, and then it writes no shadow: the shadow is only where the hole is
// drawn. Blending is additive (One, One), as the inspector draws.
import {
  BufferAttribute,
  CustomBlending,
  AddEquation,
  GLSL3,
  Group,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Matrix3,
  Mesh,
  OneFactor,
  RawShaderMaterial,
  Vector2,
  type IUniform,
  type PerspectiveCamera,
  type Vector3,
} from 'three';
import { HOLE_DOTS } from '../../galaxy/hole';
import type { Galaxy } from '../../galaxy/generate';
import type { SceneState } from '../../timeline/sceneState';
import { splice } from '../mote/shaderSource';
import type { BodyData } from '../node/bodyData';
import type { Viewport } from '../node/lod';
import { withHoleLibrary } from '../node/shaderSource';
import { strandWindow } from './hole';
import { buildHoleAttrs, DISK_STRIDE, PART_STRIDE } from './holeAttrs';
import { HOLE_PARTS, holeFrame, holePartCount } from './holeFrame';
import { HOLE_DOT, holeComp } from './holeLook';
import { NO_SHADOW, shadowDisc } from './shadow';
import holeFragSource from './shaders/hole.frag.glsl?raw';
import holeVert from './shaders/hole.vert.glsl?raw';

const HOLE_DOT_MARKER = '// #include HOLE dot (generated from src/scene/hole/holeLook.ts by holeSystem.ts)';

/** hole.frag.glsl with its dot's edge spliced in from HOLE_DOT. */
export const HOLE_FRAGMENT = splice(
  holeFragSource,
  HOLE_DOT_MARKER,
  `const vec2 HOLE_DOT_EDGE = vec2(${HOLE_DOT.edge.map((v) => v.toFixed(2)).join(', ')});`,
  'hole fragment shader',
);

/** hole.vert.glsl with the mote library, orbit.glsl and hole.glsl spliced in. */
export const HOLE_VERTEX = withHoleLibrary(holeVert);

export interface HoleSystem {
  object: Group;
  /** Instances per part: HOLE_DOTS's (27,610 in all). */
  counts: Record<'disk' | 'arch' | 'ring' | 'jets' | 'knots' | 'infall' | 'strand0' | 'strand1', number>;
  /** One frame: the story's leaves, the camera, the screen (device px), the ambient shown. Writes the shared uShadow. */
  update(state: SceneState, camera: PerspectiveCamera, viewport: Viewport, ambient: number): void;
  /** Which side of the screen the disk approaches on (−1 left, 1 right), at the last frame. */
  approach(): -1 | 1;
  dispose(): void;
}

const QUAD = [-1, -1, 1, -1, 1, 1, -1, 1];
const QUAD_INDEX = [0, 1, 2, 0, 2, 3];

const COUNT_KEYS = {
  disk: 'disk',
  arch: 'arch',
  ring: 'ring',
  jets: 'jets',
  knot: 'knots',
  infall: 'infall',
  strand0: 'strand0',
  strand1: 'strand1',
} as const;

/**
 * The hole of galaxy `g` (its seed's dots, holeAttrs.ts), its places from `data`, writing its shadow's
 * disc into `shadow` each frame (x, y, r: device px from the bottom left; r 0 none), which every galaxy
 * material shares.
 */
export function createHoleSystem(g: Galaxy, data: BodyData, shadow: IUniform<Vector3>): HoleSystem {
  const attrs = buildHoleAttrs(g.seed);
  const viewportPx: IUniform<Vector2> = { value: new Vector2(1, 1) };
  const common: Record<string, IUniform> = {
    uAmbient: { value: 0 },
    uHoleCam: { value: [0, 0, 0] },
    uHoleViewRot: { value: new Matrix3() },
    uHoleHv: { value: [0, 0, 0] },
    uGain: { value: 0 },
    uFronts: { value: new Vector2(0, 0) },
    uViewport: viewportPx,
    uPixelRatio: { value: 1 },
    uShadow: shadow,
  };
  const corner = new BufferAttribute(new Float32Array(QUAD), 2);
  const disk = attrs.disk;
  const diskA = new InstancedBufferAttribute(new Float32Array(disk.length / 3), 4);
  const diskB = new InstancedBufferAttribute(new Float32Array(disk.length / 3), 4);
  const diskC = new InstancedBufferAttribute(new Float32Array(disk.length / 3), 4);
  for (let i = 0; i < HOLE_DOTS.disk; i++) {
    diskA.array.set(disk.subarray(i * DISK_STRIDE, i * DISK_STRIDE + 4), i * 4);
    diskB.array.set(disk.subarray(i * DISK_STRIDE + 4, i * DISK_STRIDE + 8), i * 4);
    diskC.array.set(disk.subarray(i * DISK_STRIDE + 8, i * DISK_STRIDE + 12), i * 4);
  }
  /** A part's two vec4 a dot from its PART_STRIDE layout. */
  const pair = (a: Float32Array): [InstancedBufferAttribute, InstancedBufferAttribute] => {
    const n = a.length / PART_STRIDE;
    const A = new Float32Array(n * 4);
    const B = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      A.set(a.subarray(i * PART_STRIDE, i * PART_STRIDE + 4), i * 4);
      B.set(a.subarray(i * PART_STRIDE + 4, i * PART_STRIDE + 8), i * 4);
    }
    return [new InstancedBufferAttribute(A, 4), new InstancedBufferAttribute(B, 4)];
  };
  const sources: Record<(typeof HOLE_PARTS)[number]['name'], InstancedBufferAttribute[]> = {
    'hole-disk': [diskA, diskB, diskC],
    'hole-arch': [diskA, diskB, diskC],
    'hole-ring': pair(attrs.ring),
    'hole-jets': pair(attrs.jets),
    'hole-knots': pair(attrs.knots),
    'hole-infall': pair(attrs.infall),
    'hole-strand-r0': pair(attrs.strand0),
    'hole-strand-r1': pair(attrs.strand1),
  };
  const group = new Group();
  group.name = 'hole';
  const parts = HOLE_PARTS.map((p) => {
    const geometry = new InstancedBufferGeometry();
    geometry.setAttribute('aCorner', corner);
    geometry.setIndex(QUAD_INDEX);
    const [a, b, c] = sources[p.name];
    geometry.setAttribute('aHoleA', a);
    geometry.setAttribute('aHoleB', b);
    if (c) geometry.setAttribute('aHoleC', c);
    geometry.instanceCount = holePartCount(p.key);
    const comp = holeComp(p.key);
    const strand = p.name === 'hole-strand-r0' ? strandWindow(0, 0) : strandWindow(1, 0);
    const material = new RawShaderMaterial({
      glslVersion: GLSL3,
      vertexShader: HOLE_VERTEX,
      fragmentShader: HOLE_FRAGMENT,
      uniforms: {
        ...common,
        uPart: { value: p.part },
        uComp: { value: new Vector2(comp.gain, comp.size) },
        // Until the re-skin's Task 6 keys them: R0's strand whole and clean, R1's window closed.
        uStrand: { value: new Vector2(strand.head, 0) },
      },
      blending: CustomBlending,
      blendEquation: AddEquation,
      blendSrc: OneFactor,
      blendDst: OneFactor,
      depthWrite: false,
      transparent: true,
    });
    const mesh = new Mesh(geometry, material);
    mesh.name = p.name;
    mesh.frustumCulled = false; // positions are computed in the vertex shader
    group.add(mesh);
    return { mesh, geometry, material };
  });
  group.visible = false;
  const counts = Object.fromEntries(HOLE_PARTS.map((p) => [COUNT_KEYS[p.key], holePartCount(p.key)])) as HoleSystem['counts'];
  let lastApproach: -1 | 1 = 1;

  return {
    object: group,
    counts,

    update(state, camera, viewport, ambient) {
      const ratio = Number.isFinite(viewport.pixelRatio) && viewport.pixelRatio > 0 ? viewport.pixelRatio : 1;
      const size = { width: viewport.width / ratio, height: viewport.height / ratio };
      const f = holeFrame(state, g, data, camera, size, ambient);
      lastApproach = f.approach;
      group.visible = f.gain > 0 && f.front && !f.skip;
      // The shadow is there only while the hole is drawn: a frame that hides it (unlit under lamps Arms,
      // Planet and Star, not up, not shown, behind the camera or off the screen) discards nothing.
      const s = group.visible ? shadowDisc(camera, viewport, f.world) : NO_SHADOW;
      shadow.value.set(s.x, s.y, s.r);
      if (!group.visible) return;
      viewportPx.value.set(Math.max(1, viewport.width), Math.max(1, viewport.height));
      common.uPixelRatio.value = ratio;
      common.uAmbient.value = ambient;
      common.uHoleCam.value = f.view.cam;
      (common.uHoleViewRot.value as Matrix3).fromArray(f.view.viewRot);
      common.uHoleHv.value = f.view.hv;
      common.uGain.value = f.gain;
    },

    approach: () => lastApproach,

    dispose() {
      for (const p of parts) {
        p.geometry.dispose();
        p.material.dispose();
      }
    },
  };
}
