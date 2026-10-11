// The TypeScript twin of the galaxy shaders' early-out (re-skin §7, the plan's Task 3): which dots of a
// frame skip the heavy vertex path, as shell.vert.glsl, track.vert.glsl, spike.vert.glsl and
// stream.vert.glsl decide it before bodyMote(), the orbit chain or streamDot(). It composes the mirrored
// pieces (lod.ts lodSkip, offScreenReachPx, offScreenSkip; bodyMote.ts lampGain, trackLampGain) step
// for step in the shaders' order, from the same textures and uniforms. It draws nothing: the test hook's
// vertexStats (main.ts) and the unit tests count with it.
import { Matrix4, Vector4 } from 'three';
import { NODE_BIRTH_WINDOW, NODE_FIX_WINDOW, NodeRole } from './birth';
import { BODY_LOOK } from './bodyAttrs';
import { BODY_KIND, bodyTexel, type BodyData } from './bodyData';
import { bodyStarLook, lampGain, shellTexel, trackLampGain, type BodyClocks } from './bodyMote';
import { STAR_DOTS, STAR_LOOK } from './classLook';
import { hoodGlowPx, hoodReal, hoodSkip, HOSTLESS_REACH, LOD_VISIBLE, lodSkip, lodSkipElement, moonSphereGain, offScreenReachPx, offScreenSkip, type Viewport } from './lod';
import { nodeArrival } from './light';
import { bodyWorld } from './orbit';

/** What the early-out reads of a frame: the clocks and uniforms the shaders get, and the camera. */
export interface EarlyOutFrame {
  clocks: BodyClocks;
  /** The test mode's override of each LodElement's gain (−1: none; uLodForce). */
  force: Float32Array;
  /** Each glow slot's cap (uGlowCap). */
  glowCap: Float32Array;
  /** The shells at the frame's ambient (bodyAttrs.ts packShellData: uShellTex). */
  shells: Float32Array;
  /** net.streams, net.feed and the feed's alpha (uStreams, uFeedOn, uFeed), and the ring's row (uRingRow). */
  streams: number;
  feedOn: number;
  feed: number;
  ringRow: number;
  /** The beats' hold on the neighbourhood's real form (uHoodHold: lod.ts hoodHold of net.hoodHold). */
  hoodHold: number;
  /** The camera: its view (world to view space) and projection matrices, and the drawing buffer. */
  view: Matrix4;
  projection: Matrix4;
  viewport: Viewport;
}

const GLSL_SMOOTH = (e0: number, e1: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/** A row's undisturbed place at the frame's ambient in view space (toView(bodyWorld(row, uAmbient))). */
function homeView(f: EarlyOutFrame, data: BodyData, row: number): Vector4 {
  const [x, y, z] = bodyWorld(data, row, f.clocks.ambient);
  return new Vector4(x, y, z, 1).applyMatrix4(f.view);
}

/**
 * A body's real form's share at the frame (bodyScreen.glsl bodyHoodReal): a neighbourhood star's by its
 * plain glow at its undisturbed place, `home` in view space (by default computed), held up to the
 * beats' hold; 1 for every other body. A binary's star's at its host, the pair's barycentre (Task 1e).
 */
export function bodyHoodReal(f: EarlyOutFrame, data: BodyData, row: number, home = homeView(f, data, row)): number {
  if (Math.round(bodyTexel(data.bodies, 0, row)[3]) !== BODY_KIND.star) return 1;
  const host = Math.round(bodyTexel(data.bodies, 3, row)[0]);
  const at = host >= 0 ? homeView(f, data, host) : home;
  const focal = (0.5 * f.viewport.height * f.projection.elements[5]) / f.viewport.pixelRatio;
  return hoodReal(hoodGlowPx(Math.hypot(at.x, at.y, at.z), focal), f.hoodHold);
}

/**
 * Whether a shell.vert.glsl instance (net-shells, net-persons, net-glow, a copy's shells: `copy` 1 or 2)
 * of `row` in `role` at lattice index `index`, of system `sys`, skips the heavy path: lodSkip, a dark
 * lamp, or a neighbourhood star's real form at 0 (hoodSkip) for every role; then for a shell, star or
 * person mote, its star's or core body's shell faded
 * into its glow, a moon's not yet come in, or (bodyScreen.glsl bodyOffScreen) a landed dot of a body
 * with no host certainly off screen, never in a copy.
 */
export function shellSkips(f: EarlyOutFrame, data: BodyData, row: number, role: number, sys: number, index: number, copy = 0): boolean {
  const kind = Math.round(bodyTexel(data.bodies, 0, row)[3]);
  const el = lodSkipElement(kind, role, index);
  if (sys >= 0 && el >= 0 && lodSkip(kind, role, index, f.clocks.sysPx[sys], f.force[el])) return true;
  if (!(lampGain(row, f.clocks, data) > 0)) return true;
  const home = homeView(f, data, row);
  if (hoodSkip(kind, bodyHoodReal(f, data, row, home))) return true;
  const point = (kind === BODY_KIND.planet || kind === BODY_KIND.moon) && role !== NodeRole.Person && index === 0;
  if (role === NodeRole.Glow || point) return false;
  const ratio = f.viewport.pixelRatio;
  const fy = (0.5 * f.viewport.height * f.projection.elements[5]) / ratio;
  const R = bodyTexel(data.bodies, 3, row)[1];
  const across = (2 * R * fy) / Math.max(-home.z, 1e-4);
  if ((kind === BODY_KIND.star || kind === BODY_KIND.core) && GLSL_SMOOTH(BODY_LOOK.shellFadeFrom, BODY_LOOK.shellFadeTo, 0.5 * across) < LOD_VISIBLE) return true;
  if (kind === BODY_KIND.moon && role !== NodeRole.Person && moonSphereGain(across) < LOD_VISIBLE) return true;
  return offScreenSkips(f, data, row, role, copy, home);
}

/**
 * The off-screen half of shell.vert.glsl's early-out (bodyScreen.glsl bodyOffScreen): whether a `role`
 * mote of `row` (its undisturbed place in view space `home`, by default computed) is a landed dot of a
 * body with no host, not in a copy, and its body certainly off screen (lod.ts offScreenSkip).
 */
export function offScreenSkips(f: EarlyOutFrame, data: BodyData, row: number, role: number, copy = 0, home = homeView(f, data, row)): boolean {
  const [host, R, born, dur] = bodyTexel(data.bodies, 3, row);
  if (Math.round(host) >= 0 || copy > 0) return false;
  const landed = role === NodeRole.Person ? f.clocks.fix >= bodyTexel(data.bodies, 4, row)[0] + NODE_FIX_WINDOW : f.clocks.growth >= born + dur + NODE_BIRTH_WINDOW;
  if (!landed) return false;
  const ratio = f.viewport.pixelRatio;
  const fx = (0.5 * f.viewport.width * f.projection.elements[0]) / ratio;
  const fy = (0.5 * f.viewport.height * f.projection.elements[5]) / ratio;
  const clip = home.clone().applyMatrix4(f.projection);
  const w = f.viewport.width / ratio;
  const h = f.viewport.height / ratio;
  const css: [number, number] = [((clip.x / clip.w + 1) / 2) * w, ((1 - clip.y / clip.w) / 2) * h];
  const reach = offScreenReachPx([home.x, home.y, home.z], HOSTLESS_REACH * R, fx, fy, shellTexel(f.shells, 3, row)[0]);
  return offScreenSkip(css, reach, w, h);
}

/** Whether a track.vert.glsl dot of `row`'s orbit or track, of system `sys`, skips: lodSkip, or a dark lamp. */
export function trackSkips(f: EarlyOutFrame, data: BodyData, row: number, sys: number): boolean {
  const kind = Math.round(bodyTexel(data.bodies, 0, row)[3]);
  if (sys >= 0 && lodSkip(kind, NodeRole.Track, 0, f.clocks.sysPx[sys], f.force[lodSkipElement(kind, NodeRole.Track, 0)])) return true;
  return !(trackLampGain(row, f.clocks, data) > 0);
}

/**
 * Whether a spike.vert.glsl dot `k` of star `row` (glow slot `slot`) skips: past its spikes, its glow
 * capped under the spikes' coming in, or a dark lamp. (A star whose real form is 0 has no glow drawn, so
 * its cap is 0: the second test skips its spikes.)
 */
export function spikeSkips(f: EarlyOutFrame, data: BodyData, row: number, slot: number, k: number): boolean {
  if (Math.floor(k / STAR_DOTS.spikeDots) >= bodyStarLook(data, row).spikes) return true;
  if (f.glowCap[slot] <= STAR_LOOK.spikeLod[0]) return true;
  return !(lampGain(row, f.clocks, data) > 0);
}

/** Whether a stream.vert.glsl dot of the streams texture's `row` skips: its stream not up, its lamp dark, its leaf down, or the galaxy not shown. */
export function streamSkips(f: EarlyOutFrame, data: BodyData, row: number): boolean {
  const [from, to, , born] = bodyTexel(data.streams, 0, row);
  const feed = Math.round(to) < 0;
  const present = feed ? f.feed : nodeArrival(born, f.clocks.growth, NODE_BIRTH_WINDOW);
  const lamp = Math.max(lampGain(Math.round(from), f.clocks, data), lampGain(feed ? f.ringRow : Math.round(to), f.clocks, data));
  return !(present > 0) || !(lamp > 0) || !((feed ? f.feedOn : f.streams) > 0) || !(f.clocks.show > 0);
}
