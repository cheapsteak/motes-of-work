// Reference implementation of the galaxy's level of detail (docs/specs/2026-10-07-galaxy-orbits.md
// §3, §4, §12.2): what of a star system is drawn is decided by its projected outer radius `s_px` (CSS
// px, `systemPx`), computed on the CPU each frame for every system (`uSysPx`). Each element comes in
// as a brightness ramp of a crisp thing, `smoothstep` over its band (`lodGain`), and is not drawn below
// LOD_VISIBLE of it; and every point is held to a pixel floor and cap in CSS px (`PX`), times the
// device pixel ratio. A moon hands over from a point to its dotted sphere by its own size on screen
// (moonSphereGain). The GLSL in lod.glsl mirrors lodGain, glowPx, the moon's handover and motePx step
// for step, from the
// constants spliced in below (glslLodConstants); the parity page (`?lib=lod`) compares them.
//
// The early-out (re-skin §7, the plan's Task 3): a dot the late path would hide skips the heavy vertex
// path first. lodSkip says so from its system's size alone, offScreenSkip from where its body stands
// on screen and how far its landed dots can reach from there (offScreenReachPx, HOSTLESS_REACH). Each
// is exactly conservative: it implies the late path hides the dot, so skipping draws the same pixels.
// lod.glsl mirrors all three.
import { GLOW_CAP, GLOW_MIN_PX, GLOW_SCALE, STAR_R, glowPx } from '../../galaxy/body';
import { AFTERSHOCK_AMP, DERP_STAR_SHIVER, DERP_WOBBLE, DERP_WOBBLE_Y, EQ_A, EQ_SECOND, NodeRole, RING_AMP, SCATTER_AMP, SCATTER_JITTER } from './birth';
import { BODY_KIND } from './bodyData';
import { STAR_LOOK } from './classLook';

export { glowPx } from '../../galaxy/body';

/** The elements that come in by size: planet points, planet shells, moons, their tracks, and the derps. */
export enum LodElement {
  PlanetPoint = 0,
  PlanetShell = 1,
  Moon = 2,
  Track = 3,
  Derp = 4,
}

/** Each element's band of `s_px` (CSS px): invisible below the first, full by the second (§3.1, §12.2). */
export const LOD_BANDS: Record<LodElement, [number, number]> = { 0: [10, 20], 1: [25, 50], 2: [60, 120], 3: [60, 120], 4: [60, 120] };

/** Below this gain an element is not drawn at all, so it costs nothing (§3.2). */
export const LOD_VISIBLE = 0.02;

/**
 * Pixel floors and caps in CSS px (§3.2, §4, plan-constraints' halo amendment): a mote (a moon's as
 * a planet's: one material), a moon's point and a lit planet's point never under their floor; a
 * background star 2 px and a bright one 3 px; and the glow sprites' caps (a star's, a core body's).
 * The core's haze has its own look (src/scene/galaxy/galaxySystem.ts HAZE).
 */
export const PX = {
  mote: [1, Infinity],
  moon: [1.5, Infinity],
  litPlanet: [3, Infinity],
  bgStar: 2,
  brightStar: 3,
  starGlow: 18,
  coreGlow: 24,
} as const;

/** A planet's point (its smallest form, §3.1): a 2 px dot. */
export const PLANET_POINT_PX = 2;
/** A dotted orbit's or track's dot (§12.2): a crisp 1.4 px dot, at most 2 px close up. */
export const TRACK_DOT_PX = [1.4, 2] as const;

/**
 * A moon on screen (galaxy §1.3), by its own disc's diameter in CSS px (`across`): under
 * MOON_POINT_PX[0] it is a single point, from MOON_POINT_PX[1] a fine-dotted sphere (its shell's motes
 * over its body's faint fill and rim), and between the two hand over as a brightness ramp of each, so a
 * few-px moon is a dot, never a ring of motes round a dark middle.
 */
export const MOON_POINT_PX = [4, 8] as const;

/** A moon's sphere's share of its light at `across` CSS px: 0 under MOON_POINT_PX, 1 over it, smoothstep between. Its point takes the rest. */
export function moonSphereGain(across: number): number {
  return smoothstep(MOON_POINT_PX[0], MOON_POINT_PX[1], across);
}

/** A moon's point's diameter (CSS px): its own disc, never under PX.moon's floor, held at MOON_POINT_PX[0] as it hands over. */
export function moonPointPx(across: number): number {
  return Math.min(MOON_POINT_PX[0], Math.max(PX.moon[0], across));
}

/** A shell mote's diameter (CSS px) for a world `diameter` seen at `pxPerUnit` CSS px per unit: never under PX.mote's floor, every body's alike. */
export function motePx(diameter: number, pxPerUnit: number): number {
  return Math.max(PX.mote[0], diameter * pxPerUnit);
}

/** A drawing buffer, as the renderer's systems take it: its size in device px and the pixel ratio. */
export type Viewport = { width: number; height: number; pixelRatio: number };

/** GLSL's smoothstep. */
function smoothstep(lo: number, hi: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - lo) / (hi - lo)));
  return t * t * (3 - 2 * t);
}

/**
 * The neighbourhood from afar, "Dissolve (late)" (re-skin §4.1; the tuner's `hoodLateLod0` and
 * `hoodLateLod1`): a neighbourhood star hands over from its far form (the background star pulled onto
 * its spot, galaxySystem's far sets) to itself by its plain glow (`hoodGlowPx`): the far form whole
 * below `glowPx[0]` CSS px, the real form whole above `glowPx[1]`, a smoothstep between. One glow for
 * both forms, so their shares sum to 1 and the additive cross-fade is a plain hand-over of brightness.
 *
 * `beatsHold` is the one switch for the beats whose shots name the neighbourhood's systems (netShots.ts
 * HOOD_HOLD_SHOTS: ly-3, up-2, tr-1 and its surge, fx-3 and fx-4, and ls-1; re-skin §11 item 13 and the
 * controller's rulings: the dissolve belongs to the wides): true, a beat's
 * `net.hoodHold` holds the real form whole there whatever the band says (the beat wins); false, the
 * band rules there too.
 */
export const HOOD_LOD = { glowPx: [11, 16], beatsHold: true } as const;

/** A neighbourhood star's plain glow (CSS px) at distance `d` through a focal length of `focalCss`: glowPx(STAR_R, d, focal, GLOW_CAP.star), never the per-frame glowCaps or a star's look. */
export function hoodGlowPx(d: number, focalCss: number): number {
  return glowPx(STAR_R, d, focalCss, GLOW_CAP.star);
}

/** The hold a beat's `net.hoodHold` puts on the real form (0..1): the leaf, clamped, while HOOD_LOD.beatsHold; else 0. */
export function hoodHold(leaf: number): number {
  return HOOD_LOD.beatsHold ? Math.min(1, Math.max(0, leaf)) : 0;
}

/** A neighbourhood star's real form's share at a plain glow of `glowPx` CSS px: smoothstep over HOOD_LOD.glowPx, held up to `hold` (hoodHold). Its far form takes the rest. */
export function hoodReal(glowPx: number, hold = 0): number {
  return Math.max(smoothstep(HOOD_LOD.glowPx[0], HOOD_LOD.glowPx[1], glowPx), hold);
}

/** A neighbourhood star's far form's share at distance `d` (star.vert.glsl's fade of the far sets): 1 − hoodReal of its plain glow. */
export function hoodFar(d: number, focalCss: number, hold = 0): number {
  return 1 - hoodReal(hoodGlowPx(d, focalCss), hold);
}

/**
 * Whether a dot of a body of `kind` is certainly hidden by the neighbourhood's dissolve: a star's (its
 * glow, its dots and its spikes are each drawn × its real share) where the share `real` is 0, which no
 * other factor lifts. The early-out's (re-skin §7) third test, beside lodSkip and offScreenSkip.
 */
export function hoodSkip(kind: number, real: number): boolean {
  return kind === BODY_KIND.star && !(real > 0);
}

/** An element's brightness at a system's `s_px`: 0 below its band, 1 above it, smoothstep between. */
export function lodGain(el: LodElement, sysPx: number): number {
  const [lo, hi] = LOD_BANDS[el];
  return smoothstep(lo, hi, sysPx);
}

/** A system's projected outer radius in CSS px: its `outer` radius at distance `dist` through a focal length of `focalPx` (CSS px). */
export function systemPx(outer: number, dist: number, focalPx: number): number {
  return (outer * focalPx) / Math.max(dist, 1e-4);
}

/** The level a system is drawn at: 0 star only (`s_px` < 10), 1 star and planets (< 60), 2 full. */
export function lodLevel(sysPx: number): 0 | 1 | 2 {
  if (sysPx < LOD_BANDS[LodElement.PlanetPoint][0]) return 0;
  return sysPx < LOD_BANDS[LodElement.Moon][0] ? 1 : 2;
}

/** At most this many systems at full detail in any shot (galaxy §3.3; the plan's constraints). */
export const FULL_DETAIL_MAX = 2;
/**
 * How sharply a system above the cap hands its full detail over (CSS px of `s_px` per FULL_DETAIL_SOFT
 * of lead): see `detailPx`.
 */
export const FULL_DETAIL_SOFT = 10;
/** Two glow sprites' radii add up to at most this share of the distance between their centres. */
export const HALO_APART = 0.9;

const FULL_FROM = LOD_BANDS[LodElement.Moon][0];
/** Just under full detail: where a system above the cap is held. */
const BELOW_FULL = FULL_FROM - 0.1;

/**
 * The size each system is drawn at (CSS px), from its projected size `raw` (0 for a system off
 * screen): the FULL_DETAIL_MAX largest keep theirs, held to `BELOW_FULL + FULL_DETAIL_SOFT × lead`
 * where `lead` is their excess over the next largest; every other system is held just under full
 * detail. Continuous in the sizes, so a camera move never pops a system's moons, and never more
 * than FULL_DETAIL_MAX at or above full detail. Order statistics are continuous: when the second
 * and third sizes meet, the second's cap has come down to the third's. Systems that share a `unit`
 * (a binary's two stars, re-skin Task 1e) count as one: the unit ranks by its larger, and its lead
 * holds both.
 */
export function detailPx(raw: readonly number[], unit?: readonly number[]): number[] {
  // A binary's two stars are one unit (re-skin Task 1e): it ranks by its larger, and both share its hold.
  const units = new Map<number, number>();
  raw.forEach((s, i) => units.set(unit?.[i] ?? i, Math.max(units.get(unit?.[i] ?? i) ?? 0, s)));
  const sorted = [...units.values()].sort((a, b) => b - a);
  const next = sorted[FULL_DETAIL_MAX] ?? 0;
  return raw.map((s, i) => {
    const lead = units.get(unit?.[i] ?? i)!;
    return Math.min(s, BELOW_FULL + FULL_DETAIL_SOFT * Math.max(0, lead - Math.max(next, BELOW_FULL)));
  });
}

/**
 * How far a projected disc (centre and radius, CSS px) is onto a `w` × `h` screen, 0 to 1: 1 once
 * it is wholly on, falling to 0 as its centre moves its own radius beyond the edge, so a system leaving
 * the frame hands its detail over smoothly.
 */
export function onScreen(x: number, y: number, r: number, w: number, h: number): number {
  const out = Math.max(0, -x, x - w, -y, y - h);
  const rr = Math.max(r, 1e-6);
  const t = Math.min(1, Math.max(0, 1 - out / rr));
  return t * t * (3 - 2 * t);
}

/**
 * Each glow sprite's cap (its diameter, CSS px) so no two halos touch: its own cap (a star's or a
 * core body's), or less, so that its radius is at most HALO_APART half the distance to the nearest
 * other sprite's centre. `sprites` are the sprites' screen centres and natural diameters (`diam`, glowPx).
 */
export function glowCaps(sprites: readonly { x: number; y: number; diam: number; cap: number; front: boolean }[]): number[] {
  return sprites.map((a, i) => {
    if (!a.front) return 0;
    let nearest = Infinity;
    sprites.forEach((b, j) => {
      if (j !== i && b.front) nearest = Math.min(nearest, Math.hypot(a.x - b.x, a.y - b.y));
    });
    return Math.min(a.cap, a.diam, HALO_APART * nearest);
  });
}

/**
 * The level-of-detail element whose gain decides whether the late path draws a dot of a body of
 * `kind` (bodyData.ts BODY_KIND) in `role` (NodeRole) at lattice index `index`, or −1 for none (a glow
 * sprite, a star's or a core body's dots: their late path has no element). A planet's and a moon's
 * mote 0 is its point (shell.vert.glsl); a track dot (track.vert.glsl) takes the tracks' element.
 */
export function lodSkipElement(kind: number, role: number, index: number): LodElement | -1 {
  if (role === NodeRole.Track) return LodElement.Track;
  if (role === NodeRole.Glow) return -1;
  if (kind === BODY_KIND.moon) return LodElement.Moon;
  if (kind === BODY_KIND.planet) return role !== NodeRole.Person && index === 0 ? LodElement.PlanetPoint : LodElement.PlanetShell;
  return -1;
}

/**
 * Whether a dot of a body of `kind` in `role` at lattice index `index` (lodSkipElement), in a system
 * `sysPx` CSS px across, is certainly hidden by its level of detail, so it may skip the heavy vertex
 * path (the early-out, re-skin §7). `force` is the test mode's override of its element's gain (−1:
 * none, the shaders' uLodForce). Only for a dot of a system: the core's bodies (sys −1) are drawn at
 * every level, and their callers never ask. It is exactly conservative, the element's gain taken as the
 * late path takes it (bodyMote.ts sysGain, shellElement):
 *  - a shell, moon or person mote is drawn only at a gain of LOD_VISIBLE or more (bodyMote's
 *    `visible`), whatever else it is multiplied by, so it is skipped under that;
 *  - a planet's or moon's point and a track dot multiply their gain by factors that can exceed 1
 *    before they compare it with LOD_VISIBLE (FOCUS_GAIN 2.5, the freeze frame's flash), so they are
 *    skipped only at a gain of 0, which no factor lifts.
 */
export function lodSkip(kind: number, role: number, index: number, sysPx: number, force: number): boolean {
  const el = lodSkipElement(kind, role, index);
  if (el === -1) return false;
  const gain = force >= 0 ? force : lodGain(el, sysPx);
  const point = role === NodeRole.Track || (role !== NodeRole.Person && index === 0);
  return point ? gain <= 0 : !(gain >= LOD_VISIBLE);
}

/** How far a landed shell, star or person mote of a body with no host (a star, a core body) stands from the body's undisturbed centre at most, in its R. */
const HOME_MAX = 1 + EQ_A * (1 + EQ_SECOND) + RING_AMP; // shell.ts shellHome: the morph's A × |its wave| and the settle ring
// A star's dot: its halo's cut, or the core's ball at the largest hash (1 − 2^−24, hash.ts hash01), whichever is further.
const RHO_MAX = Math.max(STAR_LOOK.haloMax, STAR_LOOK.coreSigma * Math.sqrt(3 * 24 * Math.LN2));
// The scatter's leap at its cap, and its jitter, at the most it is out (an aftershock on top of a full leap).
const LEAP_MAX = (1 + AFTERSHOCK_AMP) * (SCATTER_AMP[0] + SCATTER_AMP[1] + SCATTER_JITTER);
// A star's and a core body's shiver (derp.ts derp: a wobble DERP_STAR_SHIVER times as large).
const SHIVER_MAX = DERP_WOBBLE * DERP_STAR_SHIVER * Math.sqrt(2 + DERP_WOBBLE_Y * DERP_WOBBLE_Y);
/**
 * The reach of a host-less body's landed dots, in its R: a star's dot at ρ R along its direction off
 * a shell at most HOME_MAX (so at most max(ρ, 2 − ρ) HOME_MAX), plus the leap, plus the shiver of its
 * centre; 2 % over, for float32 and the shaders' polynomial sines.
 */
export const HOSTLESS_REACH = 1.02 * (Math.max(RHO_MAX, 2) * HOME_MAX + LEAP_MAX + SHIVER_MAX);

/** The reach of a dot that cannot be judged (its ball not wholly in front of the camera): no centre is further out. Exact in float32. */
export const NO_REACH_PX = 2 ** 100;

/** CSS px added to a reach on screen, so a dot's edge pixel is never in question. */
export const REACH_MARGIN_PX = 1;

/**
 * How far on screen (CSS px) a dot can stand from its body's centre, which is at `view` (view space:
 * x right, y up, the camera looking down −z), when the dot is at most `rho` world units from it and at
 * most `dotWorld` world units across (its sprite never under PX.mote's floor): the largest move of the
 * projection over a ball of radius `rho`, `f ρ (1 + |c| / Z) / (Z − ρ)` on each axis (`fx`, `fy`: CSS px
 * per unit of x / Z and y / Z), plus the dot's own radius at the ball's nearest depth, plus
 * REACH_MARGIN_PX. NO_REACH_PX when the ball is not wholly in front of the camera: it cannot be judged.
 */
export function offScreenReachPx(view: readonly [number, number, number], rho: number, fx: number, fy: number, dotWorld: number): number {
  const Z = -view[2];
  const near = Z - rho;
  if (!(near > 0)) return NO_REACH_PX;
  const shift = Math.max(fx * (1 + Math.abs(view[0]) / Z), fy * (1 + Math.abs(view[1]) / Z)) * (rho / near);
  return shift + 0.5 * Math.max(PX.mote[0], (dotWorld * fy) / near) + REACH_MARGIN_PX;
}

/**
 * Whether a body's dots are certainly off a `w` × `h` CSS px screen: its centre (CSS px from the top
 * left) is further outside it than `reachPx` (offScreenReachPx) on some side. Applied only to landed
 * dots of a body with no host, and never to the freeze frame's copies (shell.vert.glsl).
 */
export function offScreenSkip(centreCss: readonly [number, number], reachPx: number, w: number, h: number): boolean {
  const [x, y] = centreCss;
  return Math.max(-x, x - w, -y, y - h) > reachPx;
}

/** A number as a GLSL float literal that parses back to it. */
function lit(v: number): string {
  const s = String(v);
  return /[.e]/.test(s) ? s : `${s}.0`;
}

/** How many LodElements there are: the length of LOD_BANDS, and of the shaders' `uLodForce` (LOD_COUNT). */
export const LOD_COUNT = Object.keys(LOD_BANDS).length;

/** The constants lod.glsl reads, generated from this file and the glow's in src/galaxy/body.ts. */
export function glslLodConstants(): string {
  const bands = Array.from({ length: LOD_COUNT }, (_, el) => `vec2(${LOD_BANDS[el as LodElement].map(lit).join(', ')})`);
  return [
    '// The level-of-detail constants, generated from src/scene/node/lod.ts.',
    ...Object.entries(LodElement)
      .filter(([, v]) => typeof v === 'number')
      .map(([name, v]) => `const int LOD_${name.replace(/[a-z](?=[A-Z])/g, (c) => `${c}_`).toUpperCase()} = ${v};`),
    `const int LOD_COUNT = ${LOD_COUNT};`,
    `const vec2 LOD_BANDS[LOD_COUNT] = vec2[${LOD_COUNT}](${bands.join(', ')});`,
    `const float LOD_VISIBLE = ${lit(LOD_VISIBLE)};`,
    `const vec2 MOON_POINT_PX = vec2(${MOON_POINT_PX.map(lit).join(', ')});`,
    `const float PX_MOON = ${lit(PX.moon[0])}; // PX: floors in CSS px`,
    `const float PX_MOTE = ${lit(PX.mote[0])};`,
    `const float GLOW_SCALE = ${lit(GLOW_SCALE)}; // src/galaxy/body.ts`,
    `const float GLOW_MIN_PX = ${lit(GLOW_MIN_PX)};`,
    '// The early-out: the kinds and roles lodSkip tells apart (bodyData.ts BODY_KIND, birth.ts NodeRole), a host-less body\'s reach (in its R) and the margin.',
    `const int LOD_KIND_PLANET = ${BODY_KIND.planet};`,
    `const int LOD_KIND_MOON = ${BODY_KIND.moon};`,
    `const int LOD_ROLE_PERSON = ${NodeRole.Person};`,
    `const int LOD_ROLE_TRACK = ${NodeRole.Track};`,
    `const int LOD_ROLE_GLOW = ${NodeRole.Glow};`,
    `const float HOSTLESS_REACH = ${lit(HOSTLESS_REACH)};`,
    `const float REACH_MARGIN_PX = ${lit(REACH_MARGIN_PX)};`,
    `const float NO_REACH_PX = ${lit(NO_REACH_PX)};`,
    '// The neighbourhood\'s dissolve (HOOD_LOD): its band (CSS px of plain glow), a star\'s radius and glow cap (src/galaxy/body.ts), and the stars\' kind.',
    `const vec2 HOOD_LOD = vec2(${HOOD_LOD.glowPx.map(lit).join(', ')});`,
    `const float HOOD_STAR_R = ${lit(STAR_R)};`,
    `const float HOOD_GLOW_CAP = ${lit(GLOW_CAP.star)};`,
    `const int LOD_KIND_STAR = ${BODY_KIND.star};`,
  ].join('\n');
}
