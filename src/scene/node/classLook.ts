// The look of the galaxy's classes of body (docs/specs/2026-10-09-act-2-reskin.md §4.3, §4.6): one
// place for the stars' values (the planets' join them in the re-skin's Task 7). A re-tune is a
// one-line change here: star.ts reads these, and glslClassLookConstants() splices them into
// star.glsl (shaderSource.ts), so the TS and the GLSL cannot drift.
import { STAR_TINT } from '../galaxy/spriteLook';
import { hexToRgb } from './birth';

/**
 * A star's dots (§4.3): `core` in a gaussian ball and `halo` round it, its shell motes (160); and its
 * spikes, `spikeRows` rows of `spikeDots` dots (96), drawn in screen space (net-spikes).
 */
export const STAR_DOTS = { core: 40, halo: 120, spikeRows: 6, spikeDots: 16 } as const;

/**
 * How a star looks (§4.3):
 *  - its tint runs from `white` to `amber` by its temperature; the amber end is the background's warm
 *    tint (one home: STAR_TINT.warm, src/scene/galaxy/galaxySystem.ts), short of the person's amber
 *    and the ember;
 *  - each dot is `dotDiameter` world units across: today's star shell mote, BODY_LOOK.dotShare 0.5 ×
 *    π × STAR_R 0.9 / 20 rows, drawn by motePx (its 1 px floor);
 *  - the core's dots lie in a gaussian ball of `coreSigma` R; the halo's at `haloFrom` R plus an
 *    exponential draw of scale `haloScale` R, cut at `haloMax` R; a dot ρ R out has gain e^(−ρ/`fall`);
 *  - its `brightness` is drawn in this range: it scales its light and its spikes' length, and from
 *    `sixFrom` up a star has six spikes, below it four, at `spikeAngles` degrees (none vertical, so
 *    they stand lower above the star than across it);
 *  - only the brightest stars carry spikes: brightness from `spikeFrom` (7 of the essay's 30, about
 *    the top quarter), or any star the camera is close to, by its glow's unclamped size
 *    (5 R focal / d, CSS px) over `spikeNear`, so a close-up star keeps its spikes;
 *  - a spike is `spikeLen` × the glow sprite's px × brightness long, its dot u of the way out
 *    `spikeGain` × (1 − u)^`spikeFall` as bright (they hint, not shout), and the spikes come in by the
 *    glow's px over `spikeLod`;
 *  - it breathes ×(1 + `breath` sin(2π t / period + 2π phase)), its period drawn in `breathPeriod` s.
 */
export const STAR_LOOK = {
  white: '#F4F7FF',
  amber: STAR_TINT.warm,
  dotDiameter: 0.0707,
  coreSigma: 0.25,
  haloFrom: 0.6,
  haloScale: 0.55,
  haloMax: 2.2,
  fall: 0.7,
  brightness: [0.55, 1],
  sixFrom: 0.8,
  spikeAngles: { 4: [45, 135, 225, 315], 6: [0, 60, 120, 180, 240, 300] },
  spikeFrom: 0.85,
  spikeNear: [60, 80],
  spikeLen: 1.6,
  spikeGain: 0.5,
  spikeFall: 1.5,
  spikeLod: [6, 12],
  breath: 0.12,
  breathPeriod: [4, 9],
} as const;

/** The share of the halo's exponential law that lies inside its cut at haloMax (star.ts draws inside it). */
export const STAR_HALO_CUT = 1 - Math.exp(-(STAR_LOOK.haloMax - STAR_LOOK.haloFrom) / STAR_LOOK.haloScale);

/** A number as a GLSL float literal that parses back to it. */
function lit(v: number): string {
  const s = String(v);
  return /[.e]/.test(s) ? s : `${s}.0`;
}

const vec3Of = (hex: string): string => `vec3(${hexToRgb(hex).map(lit).join(', ')})`;
const name = (k: string): string => `STAR_${k.replace(/[A-Z]/g, (c) => `_${c}`).toUpperCase()}`;

/** The constants star.glsl reads, generated from STAR_DOTS and STAR_LOOK (spliced by shaderSource.ts). */
export function glslClassLookConstants(): string {
  const out = ['// The look of the stars, generated from src/scene/node/classLook.ts.'];
  for (const [k, v] of Object.entries(STAR_DOTS)) out.push(`const int ${name(`dots${k[0].toUpperCase()}${k.slice(1)}`)} = ${v};`);
  for (const [k, v] of Object.entries(STAR_LOOK)) {
    if (typeof v === 'string') out.push(`const vec3 ${name(k)} = ${vec3Of(v)}; // ${v}`);
    else if (typeof v === 'number') out.push(`const float ${name(k)} = ${lit(v)};`);
    else if (Array.isArray(v)) out.push(`const vec2 ${name(k)} = vec2(${v.map(lit).join(', ')});`);
  }
  out.push(`const float STAR_HALO_CUT = ${lit(STAR_HALO_CUT)}; // derived: 1 - exp(-(haloMax - haloFrom) / haloScale)`);
  for (const n of [4, 6] as const) {
    const a = STAR_LOOK.spikeAngles[n];
    out.push(`const float STAR_SPIKE_ANGLES_${n}[${a.length}] = float[${a.length}](${a.map(lit).join(', ')});`);
  }
  return out.join('\n');
}
