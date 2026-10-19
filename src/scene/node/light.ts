// The light every Act II mote shares (docs/specs/2026-10-06-act-2-storyboard-and-network.md §3.4
// steps 2 and 7, §3.7; galaxy-orbits §14.4): when something built lands on its clock (nodeSettle,
// nodeArrival), where a flight sets out about its spot (nodeSpread), and how it lights, surges and
// goes out at its fix (nodeLight), in the palette the galaxy draws in. The GLSL in light.glsl mirrors
// it step for step, and both mirrors read the constants of birth.ts (shaderSource.ts splices
// glslLightConstants() into light.glsl). bodyMote.ts builds on it, and does not copy it.
import { hash01 } from '../../math/hash';
import { SALT } from '../../math/salts';
import type { Vec3 } from '../../math/vec';
import { NODE_FIX_WINDOW, NODE_HI_WINDOW, NODE_PULSE_WINDOW, NODE_SURGE_FROM, NODE_SURGE_MAX_HOP, NODE_SURGE_PER_HOP, NODE_SURGE_WINDOW } from './birth';

/** GLSL's smoothstep (stream.ts reads it too). */
export function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1);
  return t * t * (3 - 2 * t);
}

export interface NodeLight {
  /** The fix's progress, 0..1 over [fixAt - NODE_FIX_WINDOW, fixAt]. */
  fix: number;
  /** The highlight: up over [hiAt - NODE_HI_WINDOW, hiAt] of `net.highlight`, out as the fix lands. */
  hi: number;
  /** The fan-out surge by hop from the source (0 off its lineage), out as the fix lands. */
  surge: number;
}

/**
 * Step 7 for a body (or a stream, by its child's fix): from its fixAt, hiAt and hop (T4 of the
 * bodies texture, or the stream's own hiAt and hop with its child's fixAt). The surge's hop is
 * clamped at NODE_SURGE_MAX_HOP, and both lights go out as the fix lands: a rebuilt body is dark.
 */
export function nodeLight(fixAt: number, hiAt: number, hop: number, c: { fix: number; highlight: number }): NodeLight {
  const fix = smoothstep(fixAt - NODE_FIX_WINDOW, fixAt, c.fix);
  const hi = smoothstep(hiAt - NODE_HI_WINDOW, hiAt, c.highlight) * (1 - fix);
  const at = NODE_SURGE_FROM + NODE_SURGE_PER_HOP * Math.min(hop, NODE_SURGE_MAX_HOP);
  const surge = hop >= 0 ? smoothstep(at - NODE_SURGE_WINDOW, at, c.highlight) * (1 - fix) : 0;
  return { fix, hi, surge };
}

/**
 * Where on `net.fix` the person's motes of a body fixed at `fixAt` are home (they fall over
 * NODE_LAND_WINDOW before it): NODE_PULSE_WINDOW + NODE_FIX_WINDOW before `fixAt`, so the gold lands,
 * then the pulse runs, then the mend (nodeLight's `fix`) begins.
 */
export function nodeLanded(fixAt: number): number {
  return fixAt - NODE_FIX_WINDOW - NODE_PULSE_WINDOW;
}

/**
 * The fix's pulse at `fix` for a body fixed at `fixAt`: 0 until its motes are home (nodeLanded), up to
 * 1 half way through NODE_PULSE_WINDOW and back to 0 as the mend begins, `16 u² (1 − u)²` of the way
 * `u` through it (no sine: bodyMote.glsl calls none).
 */
export function nodePulse(fixAt: number, fix: number): number {
  const u = Math.min(Math.max((fix - nodeLanded(fixAt)) / NODE_PULSE_WINDOW, 0), 1);
  const w = u * (1 - u);
  return 16 * w * w;
}

/** Step 2's landing time for something built at `birth` (0..1) of its body's duration, on growth. */
export function nodeSettle(born: number, dur: number, birth: number): number {
  return born + dur * birth;
}

/**
 * Step 2's landing, shared by the galaxy's motes (bodyMote.ts): 0 until `window` before `settle` on `clock`, 1 from `settle`, smoothstepped between.
 */
export function nodeArrival(settle: number, clock: number, window: number): number {
  return smoothstep(settle - window, settle, clock);
}

/** A unit-cube spread from the seed: each axis in [-1, 1). */
export function nodeSpread(seed: number): Vec3 {
  return [2 * hash01(seed, SALT.nodeSpreadX) - 1, 2 * hash01(seed, SALT.nodeSpreadY) - 1, 2 * hash01(seed, SALT.nodeSpreadZ) - 1];
}
