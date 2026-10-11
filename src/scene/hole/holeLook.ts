// The black hole's look (docs/specs/2026-10-09-act-2-reskin.md §4.2): every value of the inspector's
// defaults (the author's pick, scratch/session/bhmock/blackhole.html) and of the disk's motion
// ("Recommended", streak lifetimes: scratch/session/diskmotion/), in one place. hole.ts reads them,
// and glslHoleConstants() splices them into hole.glsl (src/scene/node/shaderSource.ts), so the TS and
// the GLSL cannot drift. A re-tune is a one-line change here. Units: one horizon radius (r_s) × scale
// for lengths, ambient seconds for times, CSS px for sizes. A range [a, b] is drawn as mix(a, b, u).
import { HOLE_DOTS } from '../../galaxy/hole';
import { hash01, pcg } from '../../math/hash';
import { SALT } from '../../math/salts';

/** The inspector's sliders, at the author's pick. */
export const HOLE_LOOK = {
  diskBrightness: 1,
  lopsidedness: 1,
  tilt: 0,
  jetLength: 14,
  jetWidth: 0.7,
  knotRate: 0.7,
  strandBrightness: 1,
  scale: 1,
} as const;

/** The inspector's camera (§8): its elevation (degrees), the distance at which a dot is its CSS size, its fov, and where its framing puts the hole (NDC y). */
export const HOLE_VIEW = {
  elevation: 16,
  refDist: 75,
  fov: 45,
  ndcY: -0.42,
} as const;

/** The hole's period: the ambient clock's wrap (src/scene/ambientClock.ts AMBIENT_WRAP; hole.test.ts holds them equal). */
export const HOLE_HOUR = 3600;

/**
 * The lens (§4.2), about the hole's view-space centre, in r_s:
 *  - the shadow's radius `bCrit`; the bend `bend` (disc = √(b² + 8 bend deff)), with `near` the depth
 *    the hole's own plane counts as (deff = max(d, 0) + near e^−|d|);
 *  - image 0 is magnified ×(1 + `magnify` smoothstep(0, `magnifyDepth`, d));
 *  - image 1 (the underside arc) only from depth `underFrom`, pulled to bCrit + (b' − bCrit) `underHug`,
 *    at `underGain` of the light;
 *  - the pile-up: b' = bCrit + `rimGap` + softplus over `softness`, its light × mix(`rimDim`, 1,
 *    smoothstep(`rim`, b' − bCrit));
 *  - z flattened toward the hole's plane by e^(d / `flatten`) in front of it;
 *  - `edge`: nothing past b' = 11.47 is drawn. The inspector's softplus, log(1 + e^(10 x)), overflows
 *    float32 at 10 x = ln(FLT_MAX) = 88.72, so its view never drew past bCrit + 8.87: its jets and the
 *    disk's sides end there at its framing, in the author's still. This keeps that edge as a look value
 *    (the softplus here is the stable form, finite everywhere);
 *  - `axis`: under this b a point is on the axis, and its image goes straight up.
 */
export const HOLE_LENS = {
  bCrit: 2.6,
  bend: 0.6,
  near: 0.45,
  magnify: 0.45,
  magnifyDepth: 3,
  underFrom: 0.4,
  underHug: 0.35,
  underGain: 0.55,
  rimGap: 0.03,
  softness: 10,
  rimDim: 0.22,
  rim: [-0.3, 0.45],
  flatten: 3,
  edge: 11.47,
  axis: 1e-4,
} as const;

/**
 * The disk (§4.2): matter turns at ω(r) = `omega0` r^−1.5 from the inner edge `inner`, moving at
 * β = √(`beta` / max(r, inner)) and beamed g^(`dopplerPow` · lopsidedness); its heat clamp((heat[0] − r)
 * / heat[1], 0, 1); its light (`radialRef` / r)^`radialPow` · smoothstep(`rise`, r) · max(1 − 1/r, 0) ·
 * (1 − smoothstep(`fade`, r)); a dot's size + `lift[0]` clamp(I − 1, 0, `lift[1]`).
 *  - `diffuse` of the dots are haze: r = inner + `haze.span` u^`haze.pow`, brightness `haze.bright`;
 *  - the rest lie on `streaks` streaks: base radius inner + `streak.span` u^`streak.pow`, length
 *    `streak.len` (1 + r / `streak.lenGrow`) radians, pitch `streak.pitch`, brightness `streak.bright`,
 *    each dot × `streak.dot`, radial jitter σ `streak.jitter`;
 *  - every dot's height σ `height` r / radialRef, its size `size` px.
 *  - `motion`, the streak lifetimes (the author's "Recommended", 2026-10-10; diskmotion/findings.md
 *    §5, §7): a streak lives 3600 / N_k s, N_k = max(1, round(3600 / L_t)), L_t = lifeMul lenMean /
 *    (|dω/dr| Δr) / max(shear, shearFloor); per life its centre radius is rb (1 ± lifeJitter) (less
 *    drift × the life's fraction), and its angle, length, brightness, pitch and hot flag are re-hashed;
 *    its dots shear at `shear` of Kepler within it, under the envelope smoothstep(0, env[0], τ/L) (1 −
 *    smoothstep(env[1], 1, τ/L)); `hotShare` of lives are ×hotBright bright, ×hotLen long and +hotSize
 *    px; the underside arc runs `arcDelay` s behind; the haze lives hazeLives times an hour under
 *    hazeEnv's gentler envelope, its angle re-hashed each life.
 */
export const HOLE_DISK = {
  omega0: 3.1,
  inner: 2.75,
  beta: 0.5,
  dopplerPow: 3,
  heat: [6.5, 4],
  radialRef: 3,
  radialPow: 1.25,
  rise: [2.7, 3.3],
  fade: [10, 12.5],
  lift: [0.7, 1.5],
  diffuse: 0.34,
  haze: { span: 9.75, pow: 1.5, bright: [0.15, 0.47] },
  streaks: 360,
  streak: {
    span: 9.25,
    pow: 1.6,
    len: [0.25, 1.55],
    lenGrow: 12,
    pitch: [0.15, 0.5],
    bright: [0.35, 1],
    dot: [0.5, 1.2],
    jitter: 0.1,
  },
  height: 0.035,
  size: [1.3, 2.2],
  motion: {
    lifeMul: 1,
    shear: 0.5,
    shearFloor: 0.15,
    lifeJitter: 0.08,
    env: [0.18, 0.72],
    hotShare: 0.02,
    hotBright: 2.6,
    hotLen: 0.3,
    hotSize: 0.6,
    arcDelay: 1.9,
    hazeLives: 12,
    hazeEnv: [0.05, 0.95],
    drift: 0,
  },
} as const;

/** The disk's temperature (§4.2): warm (receding) to cool (approaching) by smoothstep(`coolBand`, 1 + (g − 1) lop), toward `white` by `whiteMix` × heat. */
export const HOLE_COLOUR = {
  warm: [1.0, 0.64, 0.36],
  cool: [0.55, 0.76, 1.0],
  white: [0.96, 0.97, 1.0],
  coolBand: [0.72, 1.32],
  whiteMix: 0.42,
} as const;

/** The photon ring (§4.2): a circle in the view plane at `radius` × bCrit (jitter σ `jitter`), beamed at β `beta`, `gain` g^`pow`, coloured at heat `heat`, `size` px, brightness `bright`; its dots `spread` of a step off even. */
export const HOLE_RING = {
  radius: 1.02,
  jitter: 0.02,
  beta: 0.42,
  gain: 0.42,
  pow: 0.6,
  heat: 0.7,
  size: 1.3,
  bright: [0.6, 1],
  spread: 0.8,
} as const;

/**
 * The jets (§4.2) along ±y from `base`: a sheath, `sheath` of the dots at `sheathRad` of the cone
 * ρ(s) = (jetWidth / 2) s^`rhoPow` and the rest at √u; `s0Pow` the dots' start along it; drifting out at
 * `speed` × `drift` units/s (the factor quantized to 1/`driftSteps` of its range, so that it times a
 * whole number of periods is exact in float32) and twisting at `twist` rad/s; fading smoothstep(0, `fadeIn`, s) (1 −
 * smoothstep(`fadeOut` L, L, s)) at `gain` / (1 + s / `falloff`); coloured `baseRgb` to `tipRgb`;
 * `size` px; brightness `bright`.
 */
export const HOLE_JET = {
  base: 2.4,
  rhoPow: 0.65,
  sheath: 0.55,
  sheathRad: [0.75, 1.05],
  s0Pow: 1.4,
  speed: 1.6,
  drift: [0.5, 1],
  driftSteps: 4096,
  twist: 0.12,
  fadeIn: 1.2,
  fadeOut: 0.78,
  falloff: 9,
  gain: 0.85,
  baseRgb: [0.3, 0.64, 1.0],
  tipRgb: [0.64, 0.4, 1.0],
  size: 1.25,
  bright: [0.35, 1],
} as const;

/**
 * The knots (§4.2): clumps ride the jets at `speed` units/s, launched `jitter` I late at most; the
 * interval's floor keeps `overlap` × the flight over (K − `slack`) slots. A knot's core dots in a
 * gaussian of σ `coreSigma` (brightness 1), its halo's σ 1, brightness `haloBright`; its x and z spread
 * `spread` ρ(s), its y spread `lift[0]` + `lift[1]` s; fading smoothstep(0, `fade[0]`, s) (1 −
 * smoothstep(`fade[1]` L, L, s)); `clean` or `ember` (a knot may be ember when its draw is under
 * `emberShare`); `size` px.
 */
export const HOLE_KNOT = {
  speed: 6,
  jitter: 0.5,
  overlap: 1.05,
  slack: 0.5,
  coreSigma: [0.35, 0.4, 0.35],
  haloBright: [0.45, 0.8],
  spread: 0.45,
  lift: [0.4, 0.02],
  fade: [1, 0.86],
  clean: [0.78, 0.9, 1.0],
  ember: [1.0, 0.44, 0.25],
  emberShare: 0.5,
  size: 2.3,
} as const;

/**
 * The in-fall (§4.2, the prompts): each slot falls every `period` s (its period quantized to
 * 1/`periodSteps`, so float32 holds it exactly), for `fall` s, its trail `trail` behind; from radius
 * `from`, tilted `tilt` rad out of the plane, into the disk at `to`, winding `wind` rad (and turning with
 * the disk at its end radius as it arrives); easing u^`ease`, its height dropping as (1 − e)^`drop`;
 * fading smoothstep(0, `fade[0]`, u) (1 − smoothstep(`fade[1]`, 1, u)); `rgb`, `size` px, `bright`, each
 * trail dot `trailDim` dimmer.
 */
export const HOLE_INFALL = {
  period: [9, 14],
  periodSteps: 4096,
  fall: 2.8,
  trail: 0.035,
  from: [15, 21],
  tilt: [0.25, 1],
  to: [4.5, 10],
  wind: [1.6, 4],
  ease: 1.8,
  drop: 1.4,
  fade: [0.12, 0.86],
  rgb: [0.86, 0.91, 1.0],
  size: 1.6,
  bright: 0.95,
  trailDim: 0.18,
} as const;

/** The strands' and the in-fall's ember (§4.2: the essay's ember hue, saturated to read against the disk's warm side). Task 6 checks it reads. */
export const HOLE_EMBER = {
  rgb: [1.0, 0.26, 0.18],
  gain: 1.4,
  size: 2.0,
} as const;

/** The inspector's strand: its shape (in-fall length, disk length, join radius, pitch, mean radius). */
export const STRAND = {
  lin: 40,
  lstr: 103,
  rJoin: 6.5,
  pitch: 0.11,
  rMean: 5.5,
} as const;

/** The two strands (§2.1, §4.2), one per incorrect rule, in separate bands of the disk. */
export const STRANDS = [
  { rJoin: 9.4, rMean: 8.3, lstr: 155 }, // R0's: band 9.4 → 7.35, whole from the start
  { rJoin: 6.5, rMean: 5.5, lstr: 103 }, // R1's: band 6.5 → 4.44, grows from its join
] as const;

/**
 * A strand's look (§4.2): its dots jittered `jitter` (radial, vertical) σ, clamped at ±`jitterClamp`
 * σ; its ends fading over `fade` (tail, head); clean `clean` at `cleanGain` (ember: HOLE_EMBER), `size`
 * px clean; brightness `bright`; beamed `dopplerPow` at β √(beta / max(r, `betaFloor`)).
 */
export const HOLE_STRAND = {
  jitter: [0.14, 0.07],
  jitterClamp: 2.4,
  fade: [6, 3],
  clean: [0.45, 0.66, 1.0],
  cleanGain: 0.55,
  size: 1.7,
  bright: [0.55, 1],
  dopplerPow: 0.5,
  betaFloor: 3,
} as const;

/** A dot (§4.2): its size × clamp(refDist / z, `near`), never under `floor` CSS px; hidden (alpha 0) under the lens's ok `hidden`, the inspector's emit(). */
export const HOLE_DOT = { near: [0.4, 2.2], floor: 1, hidden: 0.01 } as const;

/** The lamp (§4.2, the inspector's scene 2): the hole × (1 + `hole` x); the rest × (1 − `rest` x). */
export const HOLE_LAMP = { hole: 0.3, rest: 0.7 } as const;
/** Single (scene 5): R0's strand × (1 + `strand` s); everything else in the hole, R1's strand too, × (1 − `rest` s). */
export const HOLE_SINGLE = { rest: 0.72, strand: 0.9 } as const;
/** The inspector's dots per part (§7's fewer dots): each of ours carries mock/ours of the light. */
export const HOLE_MOCK_DOTS = {
  disk: 26000,
  arch: 26000,
  ring: 380,
  jets: 7000,
  knot: 56,
  infall: 72,
  strand0: 888,
  strand1: 590,
} as const;

/** Our dots per part, HOLE_MOCK_DOTS's keys. */
const OUR_DOTS: Record<keyof typeof HOLE_MOCK_DOTS, number> = {
  disk: HOLE_DOTS.disk,
  arch: HOLE_DOTS.arch,
  ring: HOLE_DOTS.ring,
  jets: 2 * HOLE_DOTS.jetsPerSide,
  knot: HOLE_DOTS.knotDots,
  infall: HOLE_DOTS.infallSlots * HOLE_DOTS.infallTrail,
  strand0: HOLE_DOTS.strand0,
  strand1: HOLE_DOTS.strand1,
};

/** A part's compensation for its fewer dots: gain √(mock/ours) and size (mock/ours)^¼, so gain · size² = mock/ours. */
export function holeComp(part: keyof typeof HOLE_MOCK_DOTS): {
  gain: number;
  size: number;
} {
  const m = HOLE_MOCK_DOTS[part] / OUR_DOTS[part];
  return { gain: Math.sqrt(m), size: m ** 0.25 };
}

/**
 * The small hole: the hole's parts × mix(gain[0], gain[1], smoothstep(px[0], px[1], the disk's
 * projected outer diameter in CSS px)). At the galaxy wides its 27,610 additive dots fall in about
 * 25 px and would saturate; the inspector never framed it from there.
 */
export const HOLE_SMALL = { px: [24, 80], gain: [0.35, 1] } as const;

function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1);
  return t * t * (3 - 2 * t);
}

/** The small hole's gain at the disk's projected outer diameter `diskPx` (CSS px). */
export function holeSmallGain(diskPx: number): number {
  const s = smoothstep(HOLE_SMALL.px[0], HOLE_SMALL.px[1], diskPx);
  return HOLE_SMALL.gain[0] + (HOLE_SMALL.gain[1] - HOLE_SMALL.gain[0]) * s;
}

/**
 * An integer seed in [0, 2^24) for hash01, from a slot `a` (a streak, a haze dot, a knot or an in-fall
 * slot) and a launch index `b` ≥ −1 (a life, a cycle; −1 for the slot's own draws), both whole
 * numbers: pcg(a ^ pcg(b + 1)), its top 24 bits. The GLSL's holeSeed is the same.
 */
export function holeSeed(a: number, b: number): number {
  return pcg((a ^ pcg(b + 1)) >>> 0) >>> 8;
}

/**
 * Streak k's lives (§4.2): N_k = max(1, round(3600 / L_t)) lives an hour of L_k = 3600 / N_k s, at
 * offset off_k = hash × L_k. L_t = lifeMul lenMean / (|dω/dr|(rb) Δr) / max(shear, shearFloor):
 * the time for half-rate shear to stretch a streak by its own mean length, with lenMean the mean
 * length at rb and Δr the radial band its dots span (±2σ of the jitter, and the mean pitch across
 * lenMean). N_k is computed here, once, and carried in the dot's attributes (holeAttrs.ts): float32's
 * pow in a shader could round 3600 / L_t the other way.
 */
export function diskLife(k: number, rb: number): { lives: number; life: number; offset: number } {
  const D = HOLE_DISK;
  const M = D.motion;
  const mean = (r: readonly [number, number]) => (r[0] + r[1]) / 2;
  const lenMean = mean(D.streak.len) * (1 + rb / D.streak.lenGrow);
  const dr = 4 * D.streak.jitter + mean(D.streak.pitch) * lenMean;
  const dw = 1.5 * D.omega0 * rb ** -2.5;
  const lt = (M.lifeMul * lenMean) / (dw * dr) / Math.max(M.shear, M.shearFloor);
  const lives = Math.max(1, Math.round(HOLE_HOUR / lt));
  const life = HOLE_HOUR / lives;
  const seed = holeSeed(k, -1);
  return { lives, life, offset: hash01(seed, SALT.diskPhase) * life };
}

/** The knots' launch interval at `knotRate` per second: max(1/rate, (L/v) / (K − slack) × overlap), so the slots never overlap a knot's flight. */
export function knotInterval(knotRate: number): number {
  const flight = HOLE_LOOK.jetLength / HOLE_KNOT.speed;
  return Math.max(1 / knotRate, (flight / (HOLE_DOTS.knotSlots - HOLE_KNOT.slack)) * HOLE_KNOT.overlap);
}

const TAU = 2 * Math.PI;

/**
 * The clocks' periods, held at float32 in both mirrors. A clock reduced by orbitTurns is exact only if
 * both mirrors take the same period: a period a float32 rounding apart drifts by k × that rounding
 * after k periods, which an hour carries past the parity tolerance. These are spliced into hole.glsl,
 * where float32 reads them back exactly, and hole.ts reads them from here.
 *  - `knotInterval`, `knotCycle`: the knots' interval at HOLE_LOOK.knotRate, and a slot's cycle (K of them);
 *  - `jetPeriod`: the jets' length over their speed (a dot at drift 1 runs the jet once a period);
 *  - `twistPeriod`: a turn of the jets' twist;
 *  - `strandPeriod`: a turn of each strand at the Kepler rate of its rMean.
 */
export const HOLE_PERIODS = {
  knotSlots: HOLE_DOTS.knotSlots,
  knotInterval: Math.fround(knotInterval(HOLE_LOOK.knotRate)),
  knotCycle: Math.fround(HOLE_DOTS.knotSlots * Math.fround(knotInterval(HOLE_LOOK.knotRate))),
  jetPeriod: Math.fround(HOLE_LOOK.jetLength / HOLE_JET.speed),
  twistPeriod: Math.fround(TAU / HOLE_JET.twist),
  strandPeriod: STRANDS.map((s) => Math.fround(TAU / (HOLE_DISK.omega0 * s.rMean ** -1.5))) as [number, number],
};

type GlslValue = number | readonly number[];

const glslName = (prefix: string, key: string): string => `${prefix}_${key.replace(/[A-Z]/g, (c) => `_${c}`).toUpperCase()}`;

/** Every [name, value] a look object splices, nested objects flattened by key. */
function flatten(prefix: string, o: object): [string, GlslValue][] {
  return Object.entries(o).flatMap(([k, v]): [string, GlslValue][] =>
    typeof v === 'object' && !Array.isArray(v) ? flatten(glslName(prefix, k), v as object) : [[glslName(prefix, k), v as GlslValue]],
  );
}

/** STRANDS by key, each a vec2 over the two strands (R0's, R1's): HOLE_STRANDS_R_JOIN = vec2(9.4, 6.5). */
const strandsByKey = (Object.keys(STRANDS[0]) as (keyof (typeof STRANDS)[number])[]).map((k): [string, GlslValue] => [
  glslName('HOLE_STRANDS', k),
  STRANDS.map((s) => s[k]),
]);

/** Every constant hole.glsl reads, by name: the GLSL declares exactly these (hole.test.ts). */
export const HOLE_CONSTANTS: ReadonlyMap<string, GlslValue> = new Map([
  ['HOLE_HOUR', HOLE_HOUR],
  ...flatten('HOLE_LOOK', HOLE_LOOK),
  ...flatten('HOLE_VIEW', HOLE_VIEW),
  ...flatten('HOLE_LENS', HOLE_LENS),
  ...flatten('HOLE_DISK', HOLE_DISK),
  ...flatten('HOLE_COLOUR', HOLE_COLOUR),
  ...flatten('HOLE_RING', HOLE_RING),
  ...flatten('HOLE_JET', HOLE_JET),
  ...flatten('HOLE_KNOT', HOLE_KNOT),
  ...flatten('HOLE_INFALL', HOLE_INFALL),
  ...flatten('HOLE_EMBER', HOLE_EMBER),
  ...flatten('HOLE_STRAND_SHAPE', STRAND),
  ...strandsByKey,
  ...flatten('HOLE_STRAND', HOLE_STRAND),
  ...flatten('HOLE_DOT', HOLE_DOT),
  ...flatten('HOLE_PERIODS', HOLE_PERIODS),
]);

/** A float literal GLSL reads back as the same float32 (a float32 value's shortest decimal is exact). */
function lit(v: number): string {
  if (!Number.isFinite(v)) throw new Error(`hole constant ${v} is not finite`);
  const s = String(v);
  return /[.e]/.test(s) ? s : `${s}.0`;
}

/** The constants hole.glsl reads, generated from this file (spliced by shaderSource.ts). */
export function glslHoleConstants(): string {
  const out = ["// The black hole's look, generated from src/scene/hole/holeLook.ts."];
  for (const [name, v] of HOLE_CONSTANTS) {
    if (typeof v === 'number') out.push(`const float ${name} = ${lit(v)};`);
    else if (v.length === 2 || v.length === 3) out.push(`const vec${v.length} ${name} = vec${v.length}(${v.map(lit).join(', ')});`);
    else throw new Error(`hole constant ${name} has ${v.length} components`);
  }
  return out.join('\n');
}
