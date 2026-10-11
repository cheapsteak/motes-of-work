// The galaxy's body set (docs/specs/2026-10-07-galaxy-orbits.md §3, §4, §12.2, §14, §15; the
// re-skin's §4.3): nine meshes over three textures (the bodies' and the streams', bodyData.ts, and
// the shells' at the frame's ambient, bodyAttrs.ts), updated each frame from the camera, the ambient
// clock and the story's leaves. Every dot set draws with galaxyMote.frag.glsl, over its body's base
// colour (a star's tint, the agents' blue for the rest):
//   net-tracks   the dotted orbits and moon tracks (track.vert.glsl)
//   net-bodies   one icosphere per planet and moon, rim over fill, and a ghost per cracked planet or moon (body.vert.glsl, body.frag.glsl)
//   net-shells   every body's shell motes, built by flying in: a lattice's, a planet's point among them, or a star's dots (shell.vert.glsl)
//   net-persons  the person's warm motes of every body that carries the defect (shell.vert.glsl)
//   net-glow     one glow sprite per star (shell.vert.glsl, the Glow role)
//   net-spikes   each star's spikes, 1 px dots off its centre on screen (spike.vert.glsl)
//   net-streams  the lineage streams' dots, only while `net.streams` > 0 (stream.vert.glsl)
//   net-feed     the reviewer's feed, the same dots, only while `net.feed` and its alpha are up
//   net-ring     the reviewer's ring, one quad flat in the galaxy's plane (flatRing.vert.glsl; not instanced)
//   net-copy-*   the freeze frame's two copies of the held piece, cold (1) and warm (2): its shell motes,
//                bodies and tracks again, only while the dressing is up (freeze-frame §3.1)
//   net-ticks    the freeze frame's two bursts of dotted dashes, round the moon and the planet (tick.vert.glsl)
// The core rows draw nothing (re-skin Task 5): the black hole is drawn in their place (src/scene/hole/
// holeSystem.ts), and every fragment shader here discards inside its shadow (uShadow, shared with it).
// Everything moves in the vertex shaders (bodyMote.glsl at uAmbient): growth, light, the lamp and the
// defect, and the freeze frame's dressing (bodyMote.glsl freezeLook, freeze.glsl). The CPU computes per
// frame only what a whole system, sprite or ring shares: each system's
// projected size (uSysPx), each glow sprite's cap (uGlowCap), the shells' shapes and scatter sweeps
// at the ambient (uShellTex), the lamp's body (uLampRow), and the ring's pose.
//
// Two rules the shots alone do not keep, which the CPU enforces (galaxy §3.3, §4; the plan's
// constraints): at most FULL_DETAIL_MAX systems at full detail, and no two glow sprites' halos
// touching. The neighbourhood as generated is packed (30 systems a little over two outer radii
// apart), so a system shot sees several neighbours at full size, and the core's six bodies lie
// 5-12 units apart, which a far camera draws closer than two glow sprites. lod.ts `detailPx` and
// `glowCaps` say how.
import {
  AdditiveBlending,
  AddEquation,
  BufferAttribute,
  BufferGeometry,
  CustomBlending,
  DataTexture,
  DoubleSide,
  FloatType,
  GLSL3,
  Group,
  IcosahedronGeometry,
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
  type Blending,
  type IUniform,
  type PerspectiveCamera,
} from 'three';
import { GLOW_CAP } from '../../galaxy/body';
import { bodyIndex, pieceOuter, SYS_MAX, systemOuter, type Galaxy } from '../../galaxy/generate';
import { feedAlpha, ringAt, type RingVisit } from '../../galaxy/review';
import { lampFocusRow } from '../../timeline/netTrack';
import type { SceneState } from '../../timeline/sceneState';
import { lightingUniforms } from '../lighting';
import {
  buildBodyAttrs,
  buildGlowAttrs,
  buildPersonAttrs,
  buildShellAttrs,
  buildSpikeAttrs,
  buildStreamAttrs,
  buildTickAttrs,
  buildTrackAttrs,
  GLOW_MAX,
  packShellData,
  SHELL_TEXELS,
  systemIndexOf,
  unitIndexOf,
  type QuadSet,
} from './bodyAttrs';
import { bodyCentre, bodyDerp, bodyLight, bodyPresence, lampGain, type BodyClocks } from './bodyMote';
import { STAR_LOOK } from './classLook';
import { starSpikeShare } from './star';
import { FREEZE_MIN_SYS_PX } from './birth';
import { freezeTwos } from './freeze';
import { BODY_TEXELS, packBodyData } from './bodyData';
import { shellSkips, spikeSkips, streamSkips, trackSkips, type EarlyOutFrame } from './earlyOut';
import { detailPx, glowCaps, glowPx, hoodGlowPx, hoodHold, hoodReal, LOD_COUNT, LOD_VISIBLE, LodElement, lodLevel, onScreen, systemPx, type Viewport } from './lod';
import { bodyWorld } from './orbit';
import { withGalaxyLibrary } from './shaderSource';
import galaxyMoteFrag from './shaders/galaxyMote.frag.glsl?raw';
import bodyFrag from './shaders/body.frag.glsl?raw';
import bodyVert from './shaders/body.vert.glsl?raw';
import flatRingVert from './shaders/flatRing.vert.glsl?raw';
import ringFrag from './shaders/ring.frag.glsl?raw';
import shellVert from './shaders/shell.vert.glsl?raw';
import spikeVert from './shaders/spike.vert.glsl?raw';
import streamVert from './shaders/stream.vert.glsl?raw';
import tickVert from './shaders/tick.vert.glsl?raw';
import trackVert from './shaders/track.vert.glsl?raw';

/** The instance sets, as counted: shell motes, person motes, icospheres (with the ghosts), glow sprites, spike dots, track dots, stream dots, the feed's dots. */
export type BodyCounts = Record<'shells' | 'persons' | 'bodies' | 'glow' | 'spikes' | 'tracks' | 'streams' | 'feed', number>;

/** A star's spikes as the last frame drew them: its centre on screen (CSS px from the top left), each spike's length (CSS px) and how many. */
export interface SpikesOnScreen {
  x: number;
  y: number;
  lenPx: number;
  spikes: 4 | 6;
}

/**
 * A neighbourhood star's dissolve on screen (BodySystem.hood): its plain glow, its real form's share
 * and its centre (CSS px); its unit's index in `g.units` and that unit's spot on screen (`sx`, `sy`:
 * a single star's own place, a binary's barycentre, where its one far form stands).
 */
export interface HoodOnScreen {
  glowPx: number;
  real: number;
  x: number;
  y: number;
  unit: number;
  sx: number;
  sy: number;
}

/**
 * What the freeze frame needs beyond the story's leaves (main.ts): the held piece (its planet's row,
 * the moon its pin caught mid-burst, and whether the hold forces the planet's scatter: freeze-frame
 * §1.2), null until the pin is known; the live ambient the twos tick on, null where it is not live
 * (test mode, reduced motion, `?ambient=`: no twos); and whether the one-frame flash shows (not in
 * test mode, nor under reduced motion).
 */
export interface FreezeFrame {
  hero: { planet: number; moon: number; forceScatter: boolean } | null;
  live: number | null;
  flashOn: boolean;
}

/** No freeze frame: no held piece, no twos, no flash. */
export const NO_FREEZE: FreezeFrame = Object.freeze({ hero: null, live: null, flashOn: false });

export interface BodySystem {
  object: Group;
  /** Instances per mesh; `bodies` includes the ghosts (`ghosts` of them). */
  counts: BodyCounts & { ghosts: number; ticks: number };
  /** One frame: the story's leaves, the camera, the screen, the ambient shown (the freeze pin while held) and the freeze frame's extras. */
  update(state: SceneState, camera: PerspectiveCamera, viewport: Viewport, ambient: number, freeze?: FreezeFrame): void;
  /** The last frame's projected system sizes (CSS px, as the shaders took them) and how many systems are at each level. */
  lod(): { sysPx: number[]; levels: [starOnly: number, starPlanets: number, full: number] };
  /** The last frame's glow sprites on screen, drawn (up and lit by the lamp), CSS px from the top left: centre and radius. */
  glows(): { x: number; y: number; r: number }[];
  /** The last frame's drawn spikes (their star up and lit by the lamp, its glow big enough that they come in), CSS px. */
  spikes(): SpikesOnScreen[];
  /**
   * The neighbourhood's dissolve at the last frame (re-skin §4.1), per star in `g.systems` order: its
   * plain glow (lod.ts hoodGlowPx, CSS px) at its unit's spot (a binary's star's at the barycentre, so
   * the pair dissolves as one), its real form's share (hoodReal, held by the beats' hold; the far form,
   * galaxySystem's, one per unit, takes the rest), its centre on screen (CSS px, a binary's star where
   * it is on its orbit), its unit and the unit's spot on screen.
   */
  hood(): HoodOnScreen[];
  /** Test mode: hold an element's gain at `gain` whatever the systems' sizes, or (null) let go. */
  forceLod(el: LodElement, gain: number | null): void;
  /**
   * How many instances of each of its meshes the last frame's early-out skipped (earlyOut.ts, the
   * shaders' twin; re-skin §7), by mesh name: every instanced mesh, 0 for those with no early-out (the
   * icospheres, the bursts). Empty before the first frame that drew the galaxy.
   */
  skipped(): Record<string, number>;
  /** What the last frame's early-out read (the uniforms and the camera, earlyOut.ts), null before the first frame that drew the galaxy. */
  earlyOut(): EarlyOutFrame | null;
  dispose(): void;
}

type Blend = { blending: Blending; blendEquation?: typeof AddEquation; blendSrc?: typeof OneFactor; blendDst?: typeof OneMinusSrcColorFactor };
/** Screen, as the motes blend: the fragment shaders output premultiplied colour. */
const SCREEN: Blend = { blending: CustomBlending, blendEquation: AddEquation, blendSrc: OneFactor, blendDst: OneMinusSrcColorFactor };
/** The ring adds its band, as on the stacks network. */
const ADDITIVE: Blend = { blending: AdditiveBlending };

/** The ring's alpha at full presence (the stacks network's). */
export const RING_ALPHA = 0.7;

const QUAD = [-1, -1, 1, -1, 1, 1, -1, 1];
const QUAD_INDEX = [0, 1, 2, 0, 2, 3];

function floatTexture(data: Float32Array, width: number, rows: number): DataTexture {
  const tex = new DataTexture(data, width, rows, RGBAFormat, FloatType);
  tex.minFilter = NearestFilter;
  tex.magFilter = NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

function quads(count: number, instanced: Record<string, InstancedBufferAttribute>): InstancedBufferGeometry {
  const g = new InstancedBufferGeometry();
  g.setAttribute('aCorner', new BufferAttribute(new Float32Array(QUAD), 2));
  g.setIndex(QUAD_INDEX);
  for (const [name, attr] of Object.entries(instanced)) g.setAttribute(name, attr);
  g.instanceCount = count;
  return g;
}

function quadSet(set: QuadSet): InstancedBufferGeometry {
  return quads(set.count, {
    aLL: new InstancedBufferAttribute(set.ll, 2),
    aMote: new InstancedBufferAttribute(set.mote, 4),
    aFlight: new InstancedBufferAttribute(set.flight, 4),
  });
}

/**
 * The icospheres' subdivision: three.js's IcosahedronGeometry(1, detail) has 20 (detail + 1)^2
 * triangles, so 3 gives a core body's, a star's and a planet's 320 and 1 a moon's 80 (galaxy §3.4).
 */
export const ICOSPHERE_DETAIL = { body: 3, moon: 1 } as const;

/** Both icospheres in one geometry: 320 triangles (aPart 0), then 80 (aPart 1), non-indexed. */
export function icospheres(): BufferGeometry {
  const parts = [new IcosahedronGeometry(1, ICOSPHERE_DETAIL.body), new IcosahedronGeometry(1, ICOSPHERE_DETAIL.moon)];
  const positions = parts.map((p) => p.getAttribute('position').array as Float32Array);
  const pos = new Float32Array(positions.reduce((n, a) => n + a.length, 0));
  const part = new Float32Array(pos.length / 3);
  let at = 0;
  positions.forEach((a, k) => {
    pos.set(a, at * 3);
    part.fill(k, at, at + a.length / 3);
    at += a.length / 3;
  });
  for (const p of parts) p.dispose();
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setAttribute('aPart', new BufferAttribute(part, 1));
  return g;
}

/** How far a star's spikes have come in at a glow of `px` CSS px: smoothstep over STAR_LOOK.spikeLod (star.ts starSpike's). */
function spikeFade(px: number): number {
  const [lo, hi] = STAR_LOOK.spikeLod;
  const t = Math.min(1, Math.max(0, (px - lo) / (hi - lo)));
  return t * t * (3 - 2 * t);
}

function mesh(g: BufferGeometry, mat: RawShaderMaterial, name: string): Mesh {
  const m = new Mesh(g, mat);
  m.name = name;
  m.frustumCulled = false; // positions are computed in the vertex shader
  return m;
}

/** The galaxy's body set for `g`, every material reading the hole's shadow from `shadow` (the one uniform the hole writes: shadow.ts). */
export function createBodySystem(g: Galaxy, shadow: IUniform<Vector3>): BodySystem {
  const data = packBodyData(g);
  const bodiesTex = floatTexture(data.bodies, BODY_TEXELS, data.bodyCount);
  const streamsTex = floatTexture(data.streams, BODY_TEXELS, data.streamCount);
  let shellAmbient = 0;
  const shellTex = floatTexture(packShellData(g, shellAmbient), SHELL_TEXELS, g.bodies.length);
  const shells = buildShellAttrs(g);
  const persons = buildPersonAttrs(g);
  const glow = buildGlowAttrs(g);
  const tracks = buildTrackAttrs(g);
  const bodies = buildBodyAttrs(g);
  const dots = buildStreamAttrs(g);
  const outer = g.systems.map((row) => systemOuter(g, row));
  const glowBodies = glow.rows.map((row) => g.bodies[row]);
  const sysOf = systemIndexOf(g);
  const unitOf = unitIndexOf(g);
  const visits: RingVisit[] = g.visits.map((id) => {
    const row = bodyIndex(g, id);
    return { row, radius: pieceOuter(g, row) };
  });

  const sysPx = new Float32Array(SYS_MAX);
  const glowCap = new Float32Array(GLOW_MAX);
  const force = new Float32Array(LOD_COUNT).fill(-1);
  const viewportPx: IUniform<Vector2> = { value: new Vector2(1, 1) };
  const uniforms: Record<string, IUniform> = {
    uBodyTex: { value: bodiesTex },
    uStreamTex: { value: streamsTex },
    uN0Row: { value: data.n0Row },
    uShellTex: { value: shellTex },
    uAmbient: { value: 0 },
    uShow: { value: 0 },
    uGrowth: { value: 0 },
    uFix: { value: 0 },
    uHighlight: { value: 0 },
    uFocus: { value: 0 },
    uLamp: { value: 0 },
    uLampRow: { value: -1 },
    uForcedScatter: { value: -1 },
    uStreams: { value: 0 },
    uRing: { value: new Vector3() },
    uRingRadius: { value: 1 },
    uRingRow: { value: visits[0]?.row ?? 0 },
    uRingAlpha: { value: 0 },
    uFeed: { value: 0 },
    uFeedOn: { value: 0 },
    // The freeze frame (freeze.glsl, bodyMote.glsl freezeLook): the dressing, the flash and whether it
    // shows, which copy a draw is (0 here; each copy's own material says 1 or 2), the held moon's and
    // planet's rows, the roll (radians) and the copies' offset direction (the rolled screen x), the twos.
    uDress: { value: 0 },
    uFlash: { value: 0 },
    uFlashOn: { value: 0 },
    uCopy: { value: 0 },
    uHeld: { value: new Vector2(-1, -1) },
    uRoll: { value: 0 },
    uOffPx: { value: new Vector2(1, 0) },
    uTwos: { value: 0 },
    // The bursts (tick.vert.glsl): the held planet's system, how far its shell is out, and its v.
    uHeldSys: { value: -1 },
    uScatterOut: { value: 0 },
    uFixV: { value: 1 },
    uSysPx: { value: sysPx },
    uGlowCap: { value: glowCap },
    uLodForce: { value: force },
    uHoodHold: { value: 0 },
    uViewport: viewportPx,
    uPixelRatio: { value: 1 },
    uShadow: shadow,
    ...lightingUniforms(),
  };
  // No depth cue across a galaxy: the near and far planes of the machine's dimming are set so wide
  // that every mote is at its near side.
  uniforms.uDepthNear.value = 0;
  uniforms.uDepthFar.value = 1e9;

  const material = (vertex: string, fragment: string, blend: Blend = SCREEN): RawShaderMaterial =>
    new RawShaderMaterial({ glslVersion: GLSL3, vertexShader: withGalaxyLibrary(vertex), fragmentShader: fragment, uniforms, ...blend, depthWrite: false, transparent: true });
  const shellMaterial = material(shellVert, galaxyMoteFrag);
  const spikeMaterial = material(spikeVert, galaxyMoteFrag);
  const trackMaterial = material(trackVert, galaxyMoteFrag);
  const streamMaterial = material(streamVert, galaxyMoteFrag);
  const ringMaterial = material(flatRingVert, ringFrag, ADDITIVE);
  // Both sides: the quad lies in the galaxy's plane, and its face (−y) points away from every camera
  // that looks down on it. Drawn front-only, it was culled from every Act II shot.
  ringMaterial.side = DoubleSide;
  // Front faces only (the material's default side): a body is the faces the camera sees.
  const bodyMaterial = material(bodyVert, bodyFrag);

  const shellGeometry = quadSet(shells);
  const personGeometry = quadSet(persons);
  const glowGeometry = quadSet(glow);
  const spikeAttrs = buildSpikeAttrs(g);
  const spikeGeometry = quads(spikeAttrs.count, { aSpike: new InstancedBufferAttribute(spikeAttrs.spike, 4) });
  const trackGeometry = quads(tracks.count, { aTrack: new InstancedBufferAttribute(tracks.track, 4) });
  const streamGeometry = quads(dots.streams.count, { aDot: new InstancedBufferAttribute(dots.streams.dot, 2) });
  const feedGeometry = quads(dots.feed.count, { aDot: new InstancedBufferAttribute(dots.feed.dot, 2) });
  const ringGeometry = new BufferGeometry();
  ringGeometry.setAttribute('aCorner', new BufferAttribute(new Float32Array(QUAD), 2));
  ringGeometry.setIndex(QUAD_INDEX);
  const spheres = icospheres();
  const bodyGeometry = new InstancedBufferGeometry();
  bodyGeometry.setAttribute('position', spheres.getAttribute('position'));
  bodyGeometry.setAttribute('aPart', spheres.getAttribute('aPart'));
  bodyGeometry.setAttribute('aBody', new InstancedBufferAttribute(bodies.body, 3));
  bodyGeometry.instanceCount = bodies.count;

  const group = new Group();
  group.name = 'galaxy-bodies';
  const trackMesh = mesh(trackGeometry, trackMaterial, 'net-tracks');
  const bodyMesh = mesh(bodyGeometry, bodyMaterial, 'net-bodies');
  const streamMesh = mesh(streamGeometry, streamMaterial, 'net-streams');
  const feedMesh = mesh(feedGeometry, streamMaterial, 'net-feed');
  const shellMesh = mesh(shellGeometry, shellMaterial, 'net-shells');
  const personMesh = mesh(personGeometry, shellMaterial, 'net-persons');
  const glowMesh = mesh(glowGeometry, shellMaterial, 'net-glow');
  const spikeMesh = mesh(spikeGeometry, spikeMaterial, 'net-spikes');
  const ringMesh = mesh(ringGeometry, ringMaterial, 'net-ring');
  group.add(trackMesh, bodyMesh, streamMesh, feedMesh, shellMesh, personMesh, glowMesh, spikeMesh, ringMesh);

  // The freeze frame's two copies of the held piece (freeze-frame §3.1): its shell motes, its bodies
  // (the ghost among them) and its tracks drawn twice more, cold and warm, each copy's material saying
  // which (uCopy). Their geometry is the piece's own instances, cut from the full sets once the piece
  // is known, so a copy costs nothing outside the hold and a few thousand instances in it.
  const copyMaterial = (vertex: string, fragment: string, copy: 1 | 2): RawShaderMaterial =>
    new RawShaderMaterial({
      glslVersion: GLSL3,
      vertexShader: withGalaxyLibrary(vertex),
      fragmentShader: fragment,
      uniforms: { ...uniforms, uCopy: { value: copy } },
      ...SCREEN,
      depthWrite: false,
      transparent: true,
    });
  const copyMaterials = ([1, 2] as const).flatMap((k) => [copyMaterial(shellVert, galaxyMoteFrag, k), copyMaterial(bodyVert, bodyFrag, k), copyMaterial(trackVert, galaxyMoteFrag, k)]);
  const copyMeshes = copyMaterials.map((m, i) => {
    const kind = ['shells', 'bodies', 'tracks'][i % 3];
    const c = mesh(new InstancedBufferGeometry(), m, `net-copy-${kind}-${Math.floor(i / 3) + 1}`);
    c.visible = false;
    return c;
  });
  group.add(...copyMeshes);
  // The freeze frame's two bursts, drawn last (freeze-frame §2.1 items 2 and 2b).
  const ticks = buildTickAttrs();
  const tickGeometry = quads(ticks.count, { aTick: new InstancedBufferAttribute(ticks.tick, 4) });
  const tickMaterial = material(tickVert, galaxyMoteFrag);
  const tickMesh = mesh(tickGeometry, tickMaterial, 'net-ticks');
  tickMesh.visible = false;
  group.add(tickMesh);
  let copiedPiece = -1;
  const copyGeometries: BufferGeometry[] = [];
  /** Cut the held piece's instances (its planet and moons) from the full sets, once per piece, for the copies. */
  const cutPiece = (planet: number): void => {
    if (planet === copiedPiece) return;
    for (const geo of copyGeometries.splice(0)) geo.dispose();
    const inPiece = (row: number) => row === planet || (g.bodies[row].kind === 'moon' && g.bodies[row].host === planet);
    const pick = (data: Float32Array, stride: number, count: number): number[] => Array.from({ length: count }, (_, k) => k).filter((k) => inPiece(data[k * stride]));
    const ks = pick(shells.mote, 4, shells.count);
    const take = (data: Float32Array, stride: number, keep: number[]) => Float32Array.from(keep.flatMap((k) => Array.from(data.subarray(k * stride, k * stride + stride))));
    const shellCopy = quadSet({ count: ks.length, ll: take(shells.ll, 2, ks), mote: take(shells.mote, 4, ks), flight: take(shells.flight, 4, ks) });
    const bs = pick(bodies.body, 3, bodies.count);
    const bodyCopy = new InstancedBufferGeometry();
    bodyCopy.setAttribute('position', spheres.getAttribute('position'));
    bodyCopy.setAttribute('aPart', spheres.getAttribute('aPart'));
    bodyCopy.setAttribute('aBody', new InstancedBufferAttribute(take(bodies.body, 3, bs), 3));
    bodyCopy.instanceCount = bs.length;
    const ts = pick(tracks.track, 4, tracks.count);
    const trackCopy = quads(ts.length, { aTrack: new InstancedBufferAttribute(take(tracks.track, 4, ts), 4) });
    copyGeometries.push(shellCopy, bodyCopy, trackCopy);
    copyMeshes.forEach((m, i) => (m.geometry = copyGeometries[i % 3]));
    copiedPiece = planet;
  };
  group.visible = false;

  let lastSys: number[] = Array.from({ length: g.systems.length }, () => 0);
  let lastGlows: { x: number; y: number; r: number }[] = [];
  let lastSpikes: SpikesOnScreen[] = [];
  let lastHood: HoodOnScreen[] = [];
  let lastFrame: EarlyOutFrame | null = null;
  const eye = new Vector3();
  const at = new Vector3();

  return {
    object: group,
    counts: {
      shells: shells.count,
      persons: persons.count,
      bodies: bodies.count,
      ghosts: bodies.ghosts,
      glow: glow.count,
      spikes: spikeAttrs.count,
      tracks: tracks.count,
      streams: dots.streams.count,
      feed: dots.feed.count,
      ticks: ticks.count,
    },

    update(state, camera, viewport, ambient, freeze = NO_FREEZE) {
      const { show, growth, fix, highlight, review, focus, lamp, lampAt, streams, feed } = state.net;
      group.visible = show > 0;
      if (!group.visible) return;
      // The hold forces the held planet's scatter (the pin's search found none in frame), in a focused
      // frame only, as every other freeze term is times net.focus.
      const held = state.freeze.hold >= 0.5 && focus > 0 && freeze.hero !== null;
      const forcedScatter = held && freeze.hero!.forceScatter ? freeze.hero!.planet : -1;
      uniforms.uForcedScatter.value = forcedScatter;
      // The dressing: every term is times net.focus in the shaders, so it cannot show off a focused frame.
      const { dress, flash } = state.freeze;
      uniforms.uDress.value = dress;
      uniforms.uFlash.value = flash;
      uniforms.uFlashOn.value = freeze.flashOn ? 1 : 0;
      (uniforms.uHeld.value as Vector2).set(freeze.hero?.moon ?? -1, freeze.hero?.planet ?? -1);
      const roll = (Number.isFinite(state.camera.roll) ? state.camera.roll : 0) * (Math.PI / 180);
      uniforms.uRoll.value = roll;
      (uniforms.uOffPx.value as Vector2).set(Math.cos(roll), Math.sin(roll));
      uniforms.uTwos.value = freezeTwos(freeze.live);
      const copies = freeze.hero !== null && dress * focus > 0;
      if (copies) cutPiece(freeze.hero!.planet);
      for (const m of copyMeshes) m.visible = copies;
      tickMesh.visible = copies;
      const ratio = Number.isFinite(viewport.pixelRatio) && viewport.pixelRatio > 0 ? viewport.pixelRatio : 1;
      viewportPx.value.set(Math.max(1, viewport.width), Math.max(1, viewport.height));
      uniforms.uPixelRatio.value = ratio;
      uniforms.uShow.value = show;
      uniforms.uGrowth.value = growth;
      uniforms.uFix.value = fix;
      uniforms.uHighlight.value = highlight;
      uniforms.uFocus.value = focus;
      uniforms.uLamp.value = Math.round(lamp);
      uniforms.uLampRow.value = lampFocusRow(lampAt, g);
      uniforms.uStreams.value = streams;
      uniforms.uFeedOn.value = feed;
      uniforms.uHoodHold.value = hoodHold(state.net.hoodHold);
      uniforms.uAmbient.value = ambient;
      if (ambient !== shellAmbient) {
        shellAmbient = ambient;
        shellTex.image.data!.set(packShellData(g, ambient));
        shellTex.needsUpdate = true;
      }

      // The ring and the feed: the ring rides its visit at the ambient; the feed shows only by its own leaf.
      const pose = ringAt(review, visits, ambient, data);
      (uniforms.uRing.value as Vector3).set(...pose.position);
      uniforms.uRingRadius.value = pose.radius;
      uniforms.uRingRow.value = visits[Math.min(visits.length - 1, Math.round(pose.along))].row;
      uniforms.uRingAlpha.value = RING_ALPHA * pose.presence * show;
      ringMesh.visible = pose.presence > 0;
      const fa = feedAlpha(review);
      uniforms.uFeed.value = fa;
      streamMesh.visible = streams > 0;
      feedMesh.visible = feed > 0 && fa > 0;

      // The projection the shaders use: CSS px, the composed camera (its view offset included).
      camera.updateMatrixWorld();
      camera.getWorldPosition(eye);
      const w = viewport.width / ratio;
      const h = viewport.height / ratio;
      const focal = 0.5 * h * camera.projectionMatrix.elements[5];
      const project = (p: readonly number[]): { x: number; y: number; d: number; front: boolean } => {
        at.set(p[0], p[1], p[2]);
        const d = at.distanceTo(eye);
        at.project(camera);
        return { x: ((at.x + 1) / 2) * w, y: ((1 - at.y) / 2) * h, d, front: at.z < 1 && at.z > -1 };
      };

      // Each star's real form's share (the dissolve, re-skin §4.1) by its plain glow at its unit's spot
      // (bodyScreen.glsl bodyHoodReal): a single's own place, a binary's barycentre, where the unit's far
      // star stands. Its glow, dots and spikes are drawn times it.
      const hold = uniforms.uHoodHold.value as number;
      // Each star at its own place (a binary's on its orbit), and each unit's spot (a binary's barycentre).
      const homes = g.systems.map((row) => project(bodyWorld(data, row, ambient)));
      const spots = g.units.map((row) => project(bodyWorld(data, row, ambient)));
      lastHood = homes.map((c, i) => {
        const u = unitOf[i];
        const glowPx = hoodGlowPx(spots[u].d, focal);
        return { glowPx, real: hoodReal(glowPx, hold), x: c.x, y: c.y, unit: u, sx: spots[u].x, sy: spots[u].y };
      });
      const realOf = new Map(g.systems.map((row, i) => [row, lastHood[i].real]));
      // Each system's size on screen, about its own star (a binary's star by its own planets: from afar
      // each reads as an arm star); a binary's two count as one for the at-most-two rule.
      const raw = homes.map((c, i) => {
        if (!c.front) return 0;
        const s = systemPx(outer[i], c.d, focal);
        return s * onScreen(c.x, c.y, s, w, h);
      });
      lastSys = detailPx(raw, unitOf);
      // The focused system never drops under FREEZE_MIN_SYS_PX while the lamp's focus is up (galaxy
      // §7.4): a held frame never catches a hand-over of its detail.
      const focusSys = sysOf[uniforms.uLampRow.value as number] ?? -1;
      if (focus > 0 && focusSys >= 0) lastSys[focusSys] = Math.max(lastSys[focusSys], FREEZE_MIN_SYS_PX);
      sysPx.fill(0);
      sysPx.set(lastSys);

      // A glow sits where its star is drawn: a shivering star's, its derp on (bodyMote.ts);
      // and it is drawn only once its body is up and while the lamp lights it, so only those keep their
      // halos apart and are reported.
      const clocks: BodyClocks = { growth, fix, highlight, show, ambient, focus, lamp: Math.round(lamp), lampRow: uniforms.uLampRow.value as number, sysPx, forcedScatter };
      const sprites = glowBodies.map((b) => {
        const sys = sysOf[b.index];
        const forced = force[LodElement.Derp];
        const d = sys >= 0 && forced >= 0 ? bodyDerp(b.index, sys, clocks, data, forced) : bodyDerp(b.index, sys, clocks, data);
        const c = project(bodyCentre(b.index, d, ambient, data));
        const gain = bodyPresence(b.index, growth, data) * lampGain(b.index, clocks, data) * show * (realOf.get(b.index) ?? 1);
        const drawn = gain >= LOD_VISIBLE;
        const cap = GLOW_CAP.star;
        return { x: c.x, y: c.y, front: c.front && drawn, cap, diam: glowPx(b.R, c.d, focal, cap), near: glowPx(b.R, c.d, focal, Infinity), gain, look: b.look };
      });
      // The bursts: the held planet's v, and its shell out (a scatter running or forced) by as much.
      if (freeze.hero !== null) {
        const planet = freeze.hero.planet;
        const v = 1 - bodyLight(planet, clocks, data).fix;
        uniforms.uHeldSys.value = sysOf[planet];
        uniforms.uFixV.value = v;
        uniforms.uScatterOut.value = bodyDerp(planet, sysOf[planet], clocks, data).scatterS >= 0 ? v : 0;
      }
      const caps = glowCaps(sprites);
      glowCap.fill(0);
      glowCap.set(caps);
      lastGlows = sprites.flatMap((s, i) => (s.front && caps[i] > 0 ? [{ x: s.x, y: s.y, r: Math.min(caps[i], s.diam) / 2 }] : []));
      // What the early-out reads of this frame (earlyOut.ts), for skipped(): the uniforms themselves.
      lastFrame = {
        clocks,
        force,
        glowCap,
        hoodHold: hold,
        shells: shellTex.image.data as Float32Array,
        streams,
        feedOn: feed,
        feed: fa,
        ringRow: uniforms.uRingRow.value as number,
        view: camera.matrixWorldInverse,
        projection: camera.projectionMatrix,
        viewport: { width: viewport.width, height: viewport.height, pixelRatio: ratio },
      };
      // A star's spikes as spike.vert.glsl draws them: at its glow's size under its cap, while its glow
      // is drawn, its spikes have come in (STAR_LOOK.spikeLod) and it shows them (starSpikeShare: among
      // the brightest, or the camera close), spikeLen × that size × its brightness long.
      lastSpikes = sprites.flatMap((s, i) => {
        if (!s.look || !s.front || !(caps[i] > 0)) return [];
        const px = Math.min(caps[i], s.diam);
        if (s.gain * spikeFade(px) * starSpikeShare(s.look, s.near) < LOD_VISIBLE) return [];
        return [{ x: s.x, y: s.y, lenPx: STAR_LOOK.spikeLen * px * s.look.brightness, spikes: s.look.spikes }];
      });
    },

    lod() {
      const levels: [number, number, number] = [0, 0, 0];
      for (const s of lastSys) levels[lodLevel(s)]++;
      return { sysPx: [...lastSys], levels };
    },

    glows: () => lastGlows.map((s) => ({ ...s })),

    spikes: () => lastSpikes.map((s) => ({ ...s })),

    hood: () => lastHood.map((s) => ({ ...s })),

    earlyOut: () => lastFrame,

    skipped() {
      const f = lastFrame;
      if (f === null) return {};
      const out: Record<string, number> = {};
      const count = (n: number, skips: (k: number) => boolean): number => {
        let k = 0;
        for (let i = 0; i < n; i++) if (skips(i)) k++;
        return k;
      };
      for (const o of group.children) {
        const m = o as Mesh;
        const geo = m.geometry;
        if (!(geo instanceof InstancedBufferGeometry)) continue;
        const n = geo.instanceCount;
        const attr = (name: string) => geo.getAttribute(name)?.array as Float32Array | undefined;
        const mote = attr('aMote');
        const track = attr('aTrack');
        const spike = attr('aSpike');
        const dot = attr('aDot');
        const copy = Math.round(((m.material as RawShaderMaterial).uniforms.uCopy?.value as number | undefined) ?? 0);
        if (mote) out[m.name] = count(n, (k) => shellSkips(f, data, mote[4 * k], mote[4 * k + 1], mote[4 * k + 2], mote[4 * k + 3], copy));
        else if (track) out[m.name] = count(n, (k) => trackSkips(f, data, track[4 * k], track[4 * k + 2]));
        else if (spike) out[m.name] = count(n, (k) => spikeSkips(f, data, spike[4 * k], spike[4 * k + 2], spike[4 * k + 3]));
        else if (dot) out[m.name] = count(n, (k) => streamSkips(f, data, dot[2 * k]));
        else out[m.name] = 0;
      }
      return out;
    },

    forceLod(el, gain) {
      force[el] = gain === null ? -1 : gain;
    },

    dispose() {
      for (const geo of [shellGeometry, personGeometry, glowGeometry, spikeGeometry, trackGeometry, streamGeometry, feedGeometry, ringGeometry, bodyGeometry, spheres]) geo.dispose();
      for (const m of [shellMaterial, spikeMaterial, trackMaterial, streamMaterial, ringMaterial, bodyMaterial, tickMaterial, ...copyMaterials]) m.dispose();
      tickGeometry.dispose();
      for (const geo of copyGeometries) geo.dispose();
      bodiesTex.dispose();
      streamsTex.dispose();
      shellTex.dispose();
    },
  };
}
