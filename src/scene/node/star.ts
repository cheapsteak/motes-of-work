// Reference implementation of a star's look (docs/specs/2026-10-09-act-2-reskin.md §4.3): its dots
// (its shell motes: a gaussian core and an exponential halo, each dot dimmer the further out), its
// spikes (rows of 1 px dots in screen space from its centre, an × of four or a star of six, longer
// when brighter, coming in with its glow), its breath and its tint. The GLSL in star.glsl mirrors
// every function step for step from the same constants (classLook.ts, spliced in), and the parity
// page (`?lib=star`) compares them. Only operations GLSL has are used. Nothing is integrated: a dot
// is a pure function of its index and seed, the breath of the ambient clock.
import type { StarLook } from '../../galaxy/body';
import { hash01 } from '../../math/hash';
import { SALT } from '../../math/salts';
import type { Vec3 } from '../../math/vec';
import { hexToRgb } from './birth';
import { STAR_DOTS, STAR_HALO_CUT, STAR_LOOK } from './classLook';
import { orbitTurns } from './orbit';

const TAU = 2 * Math.PI;

function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1);
  return t * t * (3 - 2 * t);
}

/**
 * A star's dot `index` (its shell mote's lattice index, in [0, 160)) of mote seed `seed`, as a
 * direction (lat, lon: y up, the lattice's frame) and a distance `rho` from the centre in units of R.
 * The direction is uniform: its height `2 hash − 1` (SALT.starDotZ), its azimuth (SALT.starDotAzimuth).
 * The distance (SALT.starDotRadius, u): a core dot (index < STAR_DOTS.core) is in a gaussian ball of
 * σ = coreSigma, its radius `σ √(−3 ln(1 − u))`, whose mean square is the ball's 3σ²; a halo dot at
 * `haloFrom + haloScale × an exponential draw`, the law cut at haloMax by drawing it inside the cut.
 */
export function starDotPolar(index: number, seed: number): { ll: { lat: number; lon: number }; rho: number } {
  const z = 2 * hash01(seed, SALT.starDotZ) - 1;
  const lon = TAU * hash01(seed, SALT.starDotAzimuth);
  const u = hash01(seed, SALT.starDotRadius);
  const rho =
    index < STAR_DOTS.core
      ? STAR_LOOK.coreSigma * Math.sqrt(-3 * Math.log(1 - u))
      : STAR_LOOK.haloFrom - STAR_LOOK.haloScale * Math.log(1 - u * STAR_HALO_CUT);
  return { ll: { lat: Math.asin(z), lon }, rho };
}

/** A star's dot: its offset from the centre in units of R (starDotPolar's), and its gain e^(−ρ/fall). */
export function starDot(index: number, seed: number): { offset: Vec3; gain: number } {
  const { ll, rho } = starDotPolar(index, seed);
  const c = Math.cos(ll.lat);
  return { offset: [rho * c * Math.cos(ll.lon), rho * Math.sin(ll.lat), rho * c * Math.sin(ll.lon)], gain: Math.exp(-rho / STAR_LOOK.fall) };
}

/**
 * How much of its spikes a star shows: all of them if it is among the brightest (brightness from
 * STAR_LOOK.spikeFrom), else as the camera comes close, by `nearPx`, its glow's unclamped size
 * (5 R focal / d, CSS px), over STAR_LOOK.spikeNear.
 */
export function starSpikeShare(look: Pick<StarLook, 'brightness'>, nearPx: number): number {
  return look.brightness >= STAR_LOOK.spikeFrom ? 1 : smoothstep(STAR_LOOK.spikeNear[0], STAR_LOOK.spikeNear[1], nearPx);
}

/**
 * Dot `dot` of spike `row` of a star whose glow sprite is `glowPx` CSS px across (`nearPx` unclamped,
 * starSpikeShare's): its offset from the star's centre on screen (CSS px, x right and y up) and its
 * gain. Spike `row` points at STAR_LOOK.spikeAngles[spikes][row] degrees and is spikeLen × glowPx ×
 * brightness long; its dot sits u = (dot + 0.5) / spikeDots of the way out, spikeGain × (1 − u)^spikeFall
 * as bright, times the star's share of its spikes, and the spikes come in by smoothstep(spikeLod,
 * glowPx), so a far star is a point. A row past the star's spikes has gain 0, and so has every row
 * of a star that shows none.
 */
export function starSpike(look: StarLook, row: number, dot: number, glowPx: number, nearPx: number): { offPx: [number, number]; gain: number } {
  if (row >= look.spikes) return { offPx: [0, 0], gain: 0 };
  const angles: readonly number[] = STAR_LOOK.spikeAngles[look.spikes];
  const a = (angles[row] * Math.PI) / 180;
  const u = (dot + 0.5) / STAR_DOTS.spikeDots;
  const out = STAR_LOOK.spikeLen * glowPx * look.brightness * u;
  const fade = smoothstep(STAR_LOOK.spikeLod[0], STAR_LOOK.spikeLod[1], glowPx) * starSpikeShare(look, nearPx);
  const gain = STAR_LOOK.spikeGain * fade * Math.pow(1 - u, STAR_LOOK.spikeFall);
  return { offPx: [out * Math.cos(a), out * Math.sin(a)], gain };
}

/** A star's breath at ambient `t`: 1 + breath · sin(2π t / period + 2π phase). */
export function starBreath(look: Pick<StarLook, 'period' | 'phase'>, t: number): number {
  return 1 + STAR_LOOK.breath * Math.sin(TAU * (orbitTurns(t, look.period) + look.phase));
}

const WHITE = hexToRgb(STAR_LOOK.white);
const AMBER = hexToRgb(STAR_LOOK.amber);

/** A star's tint at `temperature`: mix(white, amber, temperature). */
export function starTint(temperature: number): Vec3 {
  return [0, 1, 2].map((k) => WHITE[k] * (1 - temperature) + AMBER[k] * temperature) as Vec3;
}

/**
 * How far above its centre a star draws (CSS px) when its glow sprite is `glowPx` across (`nearPx`
 * unclamped): the glow's half, or the highest tip of its spikes if they are drawn (glowPx over
 * spikeLod's start, and the star shows any: starSpikeShare) and stand higher. Both clearance twins take
 * a star's top from here (netShots.ts cylinderTop, galaxyOnScreen.ts).
 */
export function starTopPx(look: StarLook, glowPx: number, nearPx: number): number {
  let top = glowPx / 2;
  if (!(glowPx > STAR_LOOK.spikeLod[0]) || !(starSpikeShare(look, nearPx) > 0)) return top;
  for (let row = 0; row < look.spikes; row++) top = Math.max(top, Math.abs(starSpike(look, row, STAR_DOTS.spikeDots - 1, glowPx, nearPx).offPx[1]));
  return top;
}
