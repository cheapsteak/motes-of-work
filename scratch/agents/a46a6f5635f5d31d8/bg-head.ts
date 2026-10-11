// The galaxy behind the story (design: docs/specs/2026-10-07-galaxy-orbits.md §2.1, with §14.2's
// neighbourhood): thousands of background stars and dust motes on two logarithmic arms round a bright
// core. They never get detail: other teams' plans, seen from far. Pure and deterministic: the same
// seed, tier and neighbourhood give the same arrays, bit for bit.
import { mulberry32, pcg } from '../math/hash';

/** The background's size class: a phone draws fewer stars and less dust. */
export type Tier = 'phone' | 'desktop';

/** A phone when the shorter side of the viewport is under 600 CSS px (either orientation). */
export function galaxyTier(widthCss: number, heightCss: number): Tier {
  return Math.min(widthCss, heightCss) < 600 ? 'phone' : 'desktop';
}

/**
 * The galaxy's numbers (§2.1, §14.2): its radius; the stars and dust per tier; the core stars' share
 * and how far out they reach (a share of the radius); the arms' pitch (`θ = ln(r / 2) / pitch`) and the
 * bearing scatter of their stars and dust; the radial exponents (`r = radius · u^exp`); the share of
 * stars that are bright and that are warm; the neighbourhood's exclusion radius and the share of
 * draws let through it; the core's exclusion radius; and the height scatter of dust and stars.
 */
export const BG = {
  radius: 220,
  stars: { phone: 2400, desktop: 4000 },
  dust: { phone: 4000, desktop: 8000 },
  coreShare: 0.22,
  coreAt: 0.35,
  pitch: 0.28,
  scatter: 0.42,
  dustScatter: 0.9,
  starExp: 0.75,
  dustExp: 0.6,
  brightShare: 0.15,
  warmShare: 0.12,
  hoodExclusion: 50,
  hoodLeak: 0.15,
  coreExclusion: 16,
  dustY: 1.1,
  starY: 0.6,
} as const;

/**
 * The background, each array `xyz` + brightness per point (4 floats) in the galaxy's frame (y up,
 * the disc in x–z, bearing `atan2(z, x)`). `stars` holds the dim 85 %, `bright` the brightest 15 %.
 * A star's brightness is negative when it is warmed toward white: its magnitude is the brightness.
 * `armPhase` is the arms' phase (`ARM_PHASE`).
 */
export interface Background {
  stars: Float32Array;
  bright: Float32Array;
  dust: Float32Array;
  armPhase: number;
}

/** Wraps an angle to (−π, π]. */
function wrap(a: number): number {
  const w = a - 2 * Math.PI * Math.floor((a + Math.PI) / (2 * Math.PI));
  return w <= -Math.PI ? w + 2 * Math.PI : w;
}

/** The bearing of arm `arm` at galactic radius `r`: `arm·π + ln(r / 2) / pitch + armPhase`, wrapped. */
export function armAngleAt(r: number, armPhase: number, arm: 0 | 1 = 0): number {
  return wrap(arm * Math.PI + Math.log(r / 2) / BG.pitch + armPhase);
}

/** The arm phase that puts arm 0 at `(r, bearing)`. */
export function armPhaseFor(r: number, bearing: number): number {
  return wrap(bearing - Math.log(r / 2) / BG.pitch);
}

/** The arms' phase: arm 0 passes the neighbourhood's middle (radius 65, bearing 0.9; ruling 7). */
export const ARM_PHASE = armPhaseFor(65, 0.9);

