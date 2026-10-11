// The network's rendering (docs/specs/2026-10-06-act-2-storyboard-and-network.md §3.1, §3.3-§3.8):
// six meshes over two static textures, built once from the generated network, and updated each
// frame from the six network scalars, `clock` and the camera alone (uniforms, nothing integrated):
//   net-halos    one disc per stack: the highlight's and the surge's glow (additive)
//   net-boxes    the cubes' bodies, one box per cube, two per crack cube (screen-blended, box())
//   net-streams  the streams' drifting dots (screen-blended, mote.frag.glsl)
//   net-feed     the stream from R0 to the reviewer's ring, the same instance kind
//   net-nodes    the stacks' motes, posed by node() (screen-blended, lit, mote.frag.glsl)
//   net-ring     the reviewer's ring, one billboarded quad (additive)
// The whole group is hidden while `net.show` is 0, so no frame before the network comes up draws
// any of it. It is not a Mechanism: no pose, no part texture, no faults.
import {
  AddEquation,
  AdditiveBlending,
  BoxGeometry,
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
  OneMinusSrcColorFactor,
  RawShaderMaterial,
  RGBAFormat,
  Vector2,
  Vector3,
  type IUniform,
  type PerspectiveCamera,
  type ShaderMaterialParameters,
} from 'three';
import { mulberry32, pcg } from '../../math/hash';
import type { Vec3 } from '../../math/vec';
import type { RoleAnchor } from '../../mechanisms/anchors';
import { nodeIndex, type Network } from '../../network/generate';
import { feedAlpha, ringAt } from '../../network/review';
import type { SceneState } from '../../timeline/sceneState';
import { lightingUniforms, updateDepthUniforms } from '../lighting';
import { buildBoxAttrs } from './boxAttrs';
import { boxInstancedAttributes } from './boxLayout';
import { buildNodeAttrs } from './nodeAttrs';
import { packNodeData, TEXELS, type NodeData } from './nodeData';
import { nodeInstancedAttributes } from './nodeLayout';
import { withBoxLibrary, withCrackLibrary, withNodeLibrary } from './shaderSource';
import moteFrag from '../mote/shaders/mote.frag.glsl?raw';
import boxFrag from './shaders/box.frag.glsl?raw';
import boxVert from './shaders/box.vert.glsl?raw';
import haloFrag from './shaders/halo.frag.glsl?raw';
import haloVert from './shaders/halo.vert.glsl?raw';
import nodeVert from './shaders/node.vert.glsl?raw';
import ringFrag from './shaders/ring.frag.glsl?raw';
import ringVert from './shaders/ring.vert.glsl?raw';
import streamVert from './shaders/stream.vert.glsl?raw';

export interface NodeSystem {
  object: Group;
  /** Instances per mesh: motes, cube bodies, stream dots, feed dots, halos, and the one ring. */
  counts: { motes: number; boxes: number; streamDots: number; feedDots: number; halos: number };
  update(state: SceneState, camera: PerspectiveCamera, viewportPx: { width: number; height: number; pixelRatio: number }): void;
  dispose(): void;
}

/** A stream carries one dot per this many units of its length, between `STREAM_DOTS` of them. */
export const DOT_SPACING = 0.6;
export const STREAM_DOTS = [8, 80] as const;
/** The ring's alpha at full presence. */
export const RING_ALPHA = 0.7;

const QUAD = [-1, -1, 1, -1, 1, 1, -1, 1];
const QUAD_INDEX = [0, 1, 2, 0, 2, 3];

type Blend = Pick<ShaderMaterialParameters, 'blending' | 'blendEquation' | 'blendSrc' | 'blendDst'>;
/** Screen, as the motes blend: the fragment shader outputs premultiplied colour. */
const SCREEN: Blend = { blending: CustomBlending, blendEquation: AddEquation, blendSrc: OneFactor, blendDst: OneMinusSrcColorFactor };
const ADDITIVE: Blend = { blending: AdditiveBlending };

/** Dots on a stream of chord `length`: one per DOT_SPACING, clamped to STREAM_DOTS, halved for the up-stream. */
export function streamDots(length: number, up: boolean): number {
  const k = Math.min(STREAM_DOTS[1], Math.max(STREAM_DOTS[0], Math.round(length / DOT_SPACING)));
  return up ? Math.max(1, Math.round(k / 2)) : k;
}

/** Every stream's dots, as (edge row, hash) pairs: stratified along it, from the network's seed. */
export function streamInstances(net: Network, data: NodeData): { edges: Float32Array; ks: Float32Array; feed: { edges: Float32Array; ks: Float32Array } } {
  const rng = mulberry32(pcg((net.seed ^ 0x57e4a) >>> 0));
  const rows: number[] = [];
  const ks: number[] = [];
  const dots = (row: number, k: number, outRows: number[], outKs: number[]) => {
    for (let i = 0; i < k; i++) {
      outRows.push(row);
      outKs.push((i + rng()) / k);
    }
  };
  net.edges.forEach((e, row) => dots(row, streamDots(Math.hypot(e.b[0] - e.a[0], e.b[1] - e.a[1], e.b[2] - e.a[2]), e.kind === 'up'), rows, ks));
  // The feed runs from R0's foot to wherever the ring is: dots for its longest reach.
  const reach = Math.max(...net.visits.map((id) => {
    const c = net.nodes[nodeIndex(net, id)].centre;
    return Math.hypot(c[0] - net.feed.a[0], c[1] - net.feed.a[1], c[2] - net.feed.a[2]);
  }));
  const feedRows: number[] = [];
  const feedKs: number[] = [];
  dots(data.feedRow, streamDots(reach, false), feedRows, feedKs);
  return { edges: new Float32Array(rows), ks: new Float32Array(ks), feed: { edges: new Float32Array(feedRows), ks: new Float32Array(feedKs) } };
}

/** The sphere round every stack: the depth range the network's lighting dims across. */
export function networkAnchor(net: Network): RoleAnchor {
  const lo: Vec3 = [Infinity, Infinity, Infinity];
  const hi: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const n of net.nodes) {
    for (let k = 0; k < 3; k++) {
      lo[k] = Math.min(lo[k], n.centre[k] - n.radius);
      hi[k] = Math.max(hi[k], n.centre[k] + n.radius);
    }
  }
  const center: Vec3 = [0, 1, 2].map((k) => (lo[k] + hi[k]) / 2) as Vec3;
  let radius = 0;
  for (const n of net.nodes) radius = Math.max(radius, Math.hypot(n.centre[0] - center[0], n.centre[1] - center[1], n.centre[2] - center[2]) + n.radius);
  return { center, radius };
}

function floatTexture(data: Float32Array, rows: number): DataTexture {
  const tex = new DataTexture(data, TEXELS, rows, RGBAFormat, FloatType);
  tex.minFilter = NearestFilter;
  tex.magFilter = NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

function geometry(count: number, instanced: Record<string, InstancedBufferAttribute>): InstancedBufferGeometry {
  const g = new InstancedBufferGeometry();
  g.setAttribute('aCorner', new BufferAttribute(new Float32Array(QUAD), 2));
  g.setIndex(QUAD_INDEX);
  for (const [name, attr] of Object.entries(instanced)) g.setAttribute(name, attr);
  g.instanceCount = count;
  return g;
}

function material(vertexShader: string, fragmentShader: string, uniforms: Record<string, IUniform>, blend: Blend): RawShaderMaterial {
  return new RawShaderMaterial({ glslVersion: GLSL3, vertexShader, fragmentShader, uniforms, ...blend, depthWrite: false, transparent: true });
}

/** The cubes' bodies: a unit box (24 vertices with their faces' normals, 12 triangles) per instance. */
function boxBodies(instanced: Record<string, InstancedBufferAttribute>, count: number): InstancedBufferGeometry {
  const unit = new BoxGeometry(1, 1, 1);
  const g = new InstancedBufferGeometry();
  g.setIndex(unit.getIndex());
  g.setAttribute('position', unit.getAttribute('position'));
  g.setAttribute('normal', unit.getAttribute('normal'));
  for (const [name, attr] of Object.entries(instanced)) g.setAttribute(name, attr);
  g.instanceCount = count;
  unit.dispose();
  return g;
}

function mesh(g: InstancedBufferGeometry, mat: RawShaderMaterial, name: string, renderOrder: number): Mesh {
  const m = new Mesh(g, mat);
  m.name = name;
  m.frustumCulled = false; // positions are computed in the vertex shader
  m.renderOrder = renderOrder;
  return m;
}

export function createNodeSystem(net: Network): NodeSystem {
  const data = packNodeData(net);
  const nodesTex = floatTexture(data.nodes, data.nodeCount);
  const edgesTex = floatTexture(data.edges, data.edgeCount);
  const attrs = buildNodeAttrs(net);
  const boxes = buildBoxAttrs(net);
  const anchor = networkAnchor(net);
  const visits = net.visits.map((id) => net.nodes[nodeIndex(net, id)]);

  const viewport: IUniform<Vector2> = { value: new Vector2(1, 1) };
  /** The camera's world position, reused every frame. */
  const eyeScratch = new Vector3();
  const pixelRatio: IUniform<number> = { value: 1 };
  // One set of uniform objects for every network material: what one does not read, it ignores.
  const uniforms: Record<string, IUniform> = {
    uNodes: { value: nodesTex },
    uEdges: { value: edgesTex },
    uGrowth: { value: 0 },
    uFix: { value: 0 },
    uHighlight: { value: 0 },
    uShow: { value: 0 },
    uClock: { value: 0 },
    uRing: { value: new Vector3() },
    uFeed: { value: 0 },
    uRingRadius: { value: 1 },
    uRingAlpha: { value: 0 },
    uViewport: viewport,
    uPixelRatio: pixelRatio,
    ...lightingUniforms(),
  };

  const nodeGeometry = geometry(attrs.length, nodeInstancedAttributes(attrs));
  const boxGeometry = boxBodies(boxInstancedAttributes(boxes), boxes.length);
  const dots = streamInstances(net, data);
  const dotAttrs = (edges: Float32Array, ks: Float32Array) => ({
    aEdge: new InstancedBufferAttribute(edges, 1),
    aK: new InstancedBufferAttribute(ks, 1),
  });
  const streamGeometry = geometry(dots.edges.length, dotAttrs(dots.edges, dots.ks));
  const feedGeometry = geometry(dots.feed.edges.length, dotAttrs(dots.feed.edges, dots.feed.ks));
  const haloGeometry = geometry(net.nodes.length, {
    aNode: new InstancedBufferAttribute(new Float32Array(net.nodes.map((n) => n.index)), 1),
  });
  const ringGeometry = geometry(1, {});

  const nodeMaterial = material(withNodeLibrary(nodeVert), moteFrag, uniforms, SCREEN);
  // Front faces only (the material's default side): a body is the faces the camera sees.
  const boxMaterial = material(withBoxLibrary(boxVert), withCrackLibrary(boxFrag), uniforms, SCREEN);
  const streamMaterial = material(withNodeLibrary(streamVert, false), moteFrag, uniforms, SCREEN);
  const haloMaterial = material(withNodeLibrary(haloVert, false), haloFrag, uniforms, ADDITIVE);
  const ringMaterial = material(ringVert, ringFrag, uniforms, ADDITIVE);

  const group = new Group();
  group.name = 'network';
  const halos = mesh(haloGeometry, haloMaterial, 'net-halos', 0);
  const streams = mesh(streamGeometry, streamMaterial, 'net-streams', 0);
  const feed = mesh(feedGeometry, streamMaterial, 'net-feed', 0);
  const bodies = mesh(boxGeometry, boxMaterial, 'net-boxes', 0);
  const nodes = mesh(nodeGeometry, nodeMaterial, 'net-nodes', 0);
  const ring = mesh(ringGeometry, ringMaterial, 'net-ring', 1);
  group.add(halos, bodies, streams, feed, nodes, ring);
  group.visible = false;

  return {
    object: group,
    counts: { motes: attrs.length, boxes: boxes.length, streamDots: dots.edges.length, feedDots: dots.feed.edges.length, halos: net.nodes.length },

    update(state, camera, viewportPx) {
      const { show, growth, fix, highlight, review } = state.net;
      group.visible = show > 0;
      if (!group.visible) return;
      viewport.value.set(Math.max(1, viewportPx.width), Math.max(1, viewportPx.height));
      const ratio = viewportPx.pixelRatio;
      pixelRatio.value = Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
      const eye = camera.getWorldPosition(eyeScratch);
      updateDepthUniforms(uniforms, [eye.x, eye.y, eye.z], anchor);
      uniforms.uGrowth.value = growth;
      uniforms.uFix.value = fix;
      uniforms.uHighlight.value = highlight;
      uniforms.uShow.value = show;
      uniforms.uClock.value = state.clock;

      const pose = ringAt(review, visits);
      (uniforms.uRing.value as Vector3).set(...pose.position);
      uniforms.uRingRadius.value = pose.radius;
      uniforms.uRingAlpha.value = RING_ALPHA * pose.presence * show;
      ring.visible = pose.presence > 0;
      const fa = feedAlpha(review);
      uniforms.uFeed.value = fa;
      feed.visible = fa > 0;
    },

    dispose() {
      for (const g of [nodeGeometry, boxGeometry, streamGeometry, feedGeometry, haloGeometry, ringGeometry]) g.dispose();
      for (const m of [nodeMaterial, boxMaterial, streamMaterial, haloMaterial, ringMaterial]) m.dispose();
      nodesTex.dispose();
      edgesTex.dispose();
    },
  };
}
