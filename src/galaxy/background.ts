// The galaxy behind the story (design: docs/specs/2026-10-07-galaxy-orbits.md §2.1, with §14.2's
// neighbourhood; re-skin docs/specs/2026-10-09-act-2-reskin.md §4.1): thousands of background stars and
// dust motes, two arms round a bulge. They never get detail: other teams' plans, seen from far. It is a
// port of the galaxy tuner's "Wisps (reviewed)" preset (scratch/session/galaxytuner/gen.js,
// `generateBackground` on its wisps path, `WISPS_REVIEWED`), bit for bit: the same seed, tier and
// neighbourhood give the tuner's arrays. There is no centre line: stars are drawn by rejection from a
// density field (the disc law × a spiral bias × flow-aligned noise), and the arms are where its wisps crowd.
//
// pullToHood is the neighbourhood's far form ("Dissolve (late)", re-skin §4.1): at the galaxy wide the
// 30 star systems are not drawn as themselves; the nearest background star is drawn at each spot instead.
import { GLOW_CAP, STAR_R, glowPx } from './body';
import { streamFor } from './seeds';

/** The background's size class: a phone draws fewer stars and less dust. */
export type Tier = 'phone' | 'desktop';

/** A phone when the shorter side of the viewport is under 600 CSS px (either orientation). */
export function galaxyTier(widthCss: number, heightCss: number): Tier {
  return Math.min(widthCss, heightCss) < 600 ? 'phone' : 'desktop';
}

/**
 * Every value the background reads, each key spelled as the galaxy tuner's (gen.js `WISPS_REVIEWED`,
 * shape-notes §11), so a line of the tuner's "Copy values" (`"wispBias": 2.5,`) pastes over its line
 * here. The modes are typed as the literals this port has: a pasted other mode fails the typecheck (a
 * switch of mode is a port, re-skin §4.1), and `satisfies` names a pasted key that the port does not read.
 */
export interface BgRecipe {
  /** The shape: arms that emerge from a flow-aligned density field (the tuner's other shapes are not ported). */
  shape: 'wisps';
  /** Placement: a star takes the density's first draw (only the core's exclusion and the neighbourhood's halos are kept clear). */
  place: 'none';
  /** The noise: gradient (Perlin) noise, a seeded unit gradient per lattice point. */
  wispNoise: 'gradient';
  /** The knots: beads walked along each arm, each on the densest young wisp near the crest. */
  wispKnotMode: 'beads';
  /** The bulge: an exponential sphere of scale `bulgeScale × radius`, flattened `bulgeFlat` in y. */
  bulgeMode: 'exp';
  /** The radial law: an exponential disc (the wisps path reads `discScale` through `discR`). */
  radialLaw: 'exp';
  /** The galaxy's radius, its arms and their pitch (`θ = arm·2π/arms + ln(r / 2) / pitch + phase`). */
  radius: number;
  arms: 2;
  pitch: number;
  /** No star or dust within this of the centre. */
  coreExclusion: number;
  /** The populations by index range: the bulge `coreShare`, then old, young `youngShare` and knots `clumpShare` of all the stars. */
  coreShare: number;
  youngShare: number;
  clumpShare: number;
  /** The bulge's scale (× radius) and its flattening in y. */
  bulgeScale: number;
  bulgeFlat: number;
  /** The disc: scale `discScale × radius` (the young stars × `armScale`), fading out from `discFade` to `discFadeEnd` of the radius. */
  discScale: number;
  armScale: number;
  discFade: number;
  discFadeEnd: number;
  /** The arms fade in from `armStartIn` (0: half of `armStart`) to `armStart`, and out from `armEnd` to `armEndOut` (shares of the radius). */
  armStart: number;
  armStartIn: number;
  armEnd: number;
  armEndOut: number;
  /** Brightness: `brightFloor + (1 − brightFloor) u^brightPow`; the brightest `brightShare` are the bright set; young × (1 + `youngBright`), knots × (1 + `clumpBright`), old × (1 − `oldDim`). */
  brightShare: number;
  brightFloor: number;
  brightPow: number;
  youngBright: number;
  clumpBright: number;
  oldDim: number;
  /** The old disc's spiral bias (contrast, sharpness) and its warm share: `warmCore` at the centre to `oldWarm` at the rim, by √(r / radius). */
  oldContrast: number;
  oldSharp: number;
  oldWarm: number;
  warmCore: number;
  /** The knots: how many beads, their offset downstream (bias σ), their members' spread (× r) and the walk's gap jitter. */
  clumpCount: number;
  clumpOut: number;
  knotSigma: number;
  wispKnotJitter: number;
  /** The dust lane: depth, offset (bias σ; negative is the inner edge) and width (bias σ). */
  laneDepth: number;
  laneOffset: number;
  laneWidth: number;
  /** The dust: its arm share (the rest a smooth disc), the share of that tracing the wisps, its bias contrast and its gain in the lane; brightness `dustFloor + dustRange · u`. */
  dustArmShare: number;
  dustWispShare: number;
  dustContrast: number;
  dustLaneGain: number;
  dustFloor: number;
  dustRange: number;
  /** The heights: stars (an old one ±`starY`, a young one ±half, a knot member 0.3 × `starY` × a normal) and dust (±`dustY`). */
  starY: number;
  dustY: number;
  /** The spiral bias: contrast and sharpness; it rises from (1 − `wispBiasRise`) to whole by `wispBiasRiseTo` R; the along-arm modulation `modDepth` over `modPeriod` in ln r. */
  wispBias: number;
  wispSharp: number;
  wispBiasRise: number;
  wispBiasRiseTo: number;
  modDepth: number;
  modPeriod: number;
  /** The fork: a second bias of `wispBranch` × the first, leaving each arm at `wispBranchFrom` R at pitch `wispBranchPitch`. */
  wispBranch: number;
  wispBranchPitch: number;
  wispBranchFrom: number;
  /** The wisps: length and width (× r), anisotropy, octaves, ridged blend and feed, contrast power, shear (degrees), the young and old powers, the meander. */
  wispAlong: number;
  wispAcross: number;
  wispAniso: number;
  wispOctaves: number;
  wispRidge: number;
  wispRidgeFeed: number;
  wispPower: number;
  wispShear: number;
  wispYoung: number;
  wispOld: number;
  wispWarp: number;
  wispWarpAlong: number;
  /** The feathers: weight, shear (degrees), length and width (× r), the window's centre and σ (bias σ), octaves. */
  wispFeather: number;
  wispFeatherShear: number;
  wispFeatherAlong: number;
  wispFeatherAcross: number;
  wispFeatherAt: number;
  wispFeatherWidth: number;
  wispFeatherOctaves: number;
  /** The lane's filament: its length and width (× r). */
  wispLaneAlong: number;
  wispLaneAcross: number;
}

/**
 * The background's recipe: the tuner's `WISPS_REVIEWED` (re-skin §4.1), every key its wisps path
 * reads, at the preset's value (those it takes from the shape defaults or `WISPS` too). The sprite keys
 * live elsewhere, under their tuner names where they could keep them: `warm` and `warmMix` in
 * STAR_TINT, `hazePx`, `hazeGain` and `hazeWarm` in HAZE (src/scene/galaxy/spriteLook.ts); `haloStar`
 * and `haloBright` are HALO_PX, `maxStar`, `maxBright`, `worldStar` and `worldBright` BG_STAR_SIZE,
 * `dustPx` PX.mote. The tuner's `tier`, `seed`, `hood`, `stars` and `dust` are not recipe values (BG
 * holds the tier counts), nor its neighbourhood keys (`hoodLateLod0`, `hoodLateLod1` are HOOD_LOD).
 */
export const BG_RECIPE = {
  shape: 'wisps',
  place: 'none',
  wispNoise: 'gradient',
  wispKnotMode: 'beads',
  bulgeMode: 'exp',
  radialLaw: 'exp',
  radius: 220,
  arms: 2,
  pitch: 0.28,
  coreExclusion: 16,
  coreShare: 0.1,
  youngShare: 0.4,
  clumpShare: 0.12,
  bulgeScale: 0.06,
  bulgeFlat: 0.55,
  discScale: 0.32,
  armScale: 1.3,
  discFade: 0.85,
  discFadeEnd: 1,
  armStart: 0.2,
  armStartIn: 0,
  armEnd: 0.85,
  armEndOut: 1.1,
  brightShare: 0.15,
  brightFloor: 0.3,
  brightPow: 2.2,
  youngBright: 0.4,
  clumpBright: 0.7,
  oldDim: 0,
  oldContrast: 1.2,
  oldSharp: 2,
  oldWarm: 0.5,
  warmCore: 0.97,
  clumpCount: 24,
  clumpOut: 0.4,
  knotSigma: 0.03,
  wispKnotJitter: 0.3,
  laneDepth: 0.6,
  laneOffset: -0.5,
  laneWidth: 0.2,
  dustArmShare: 0.8,
  dustWispShare: 0.5,
  dustContrast: 1.5,
  dustLaneGain: 5,
  dustFloor: 0.12,
  dustRange: 0.2,
  starY: 1.5,
  dustY: 1.1,
  wispBias: 2.5,
  wispSharp: 2.5,
  wispBiasRise: 0.7,
  wispBiasRiseTo: 0.5,
  modDepth: 0.5,
  modPeriod: 0.4,
  wispBranch: 0.5,
  wispBranchPitch: 0.42,
  wispBranchFrom: 0.55,
  wispAlong: 0.45,
  wispAcross: 0.05,
  wispAniso: 1,
  wispOctaves: 4,
  wispRidge: 0.2,
  wispRidgeFeed: 0.5,
  wispPower: 8,
  wispShear: 8,
  wispYoung: 3,
  wispOld: 0.3,
  wispWarp: 0.08,
  wispWarpAlong: 2.5,
  wispFeather: 0.4,
  wispFeatherShear: 45,
  wispFeatherAlong: 0.22,
  wispFeatherAcross: 0.06,
  wispFeatherAt: 0.9,
  wispFeatherWidth: 0.6,
  wispFeatherOctaves: 1,
  wispLaneAlong: 0.8,
  wispLaneAcross: 0.04,
} as const satisfies BgRecipe;

/** The recipe with the stars and dust per tier (the tuner's `stars` and `dust` are one tier's numbers). */
export const BG = {
  ...BG_RECIPE,
  stars: { phone: 2400, desktop: 4000 },
  dust: { phone: 4000, desktop: 8000 },
} as const;

/**
 * The tuner's literals that are not keys, named here (a re-tune does not paste them): the bulge is cut
 * at `BULGE_CUT` of the radius; a knot member strays `KNOT_MEMBER_Y` × starY (× a normal) in height; a
 * bead sits at a radius of at least `BEAD_INNER` × coreExclusion, takes the best of `BEAD_TRIES` draws
 * (each `BEAD_SPREAD` bias σ about its offset, and `BEAD_ALONG` of the walk's gap along the arm) and
 * its members' spread is knotSigma × r × (0.7 + 0.6 u); a rejection sampler gives up after
 * `STAR_TRIES` draws (a star) or `DUST_TRIES` (a dust mote); the warp's lattice is `WARP_ACROSS` times
 * the wisps' width; the noise squash is 0.5 + 0.5 tanh(`SQUASH` p).
 */
const BULGE_CUT = 0.5;
const KNOT_MEMBER_Y = 0.3;
const BEAD_INNER = 1.5;
const BEAD_TRIES = 24;
const BEAD_SPREAD = 0.5;
const BEAD_ALONG = 0.15;
const STAR_TRIES = 2000;
const DUST_TRIES = 4000;
const WARP_ACROSS = 6;
const SQUASH = 2.2;
/**
 * A rejection sampler's cheap bounds on a weight are widened by this share before they answer for it
 * (`takes`): a bound and the weight it bounds differ by a few ulps of rounding (about 1e-15), so the
 * draws they answer for are the tuner's own. Not a look value: any slack over the rounding gives the
 * same arrays, only more or fewer full weights taken.
 */
const BOUND_SLACK = 1e-9;

/** Each star's population (the tuner's wisps codes), by index range: the bulge first, then old, young and knots. */
export const POP = { bulge: 0, knot: 2, young: 3, old: 4 } as const;

/**
 * The background, each array `xyz` + brightness per point (4 floats) in the galaxy's frame (y up,
 * the disc in x–z, bearing `atan2(z, x)`). `stars` holds the dim 85 %, `bright` the brightest 15 %.
 * A star's brightness is negative when it is warm: its magnitude is the brightness. `armPhase` is the
 * arms' phase (`ARM_PHASE`); `knots` the beads' centres and their members' spread (σ); `pop` each
 * star's population (POP), aligned with its array (the arrays' fingerprints do not hash it).
 */
export interface Background {
  stars: Float32Array;
  bright: Float32Array;
  dust: Float32Array;
  armPhase: number;
  knots: readonly (readonly [x: number, z: number, sigma: number])[];
  pop: { stars: Uint8Array; bright: Uint8Array };
}

/** Wraps an angle to (−π, π]. */
function wrap(a: number): number {
  const w = a - 2 * Math.PI * Math.floor((a + Math.PI) / (2 * Math.PI));
  return w <= -Math.PI ? w + 2 * Math.PI : w;
}

/** The bearing of arm `arm` at galactic radius `r`: `arm·2π/arms + ln(r / 2) / pitch + armPhase`, wrapped. */
export function armAngleAt(r: number, armPhase: number, arm: number = 0): number {
  return wrap((arm * 2 * Math.PI) / BG.arms + Math.log(r / 2) / BG.pitch + armPhase);
}

/** The arm phase that puts arm 0 at `(r, bearing)`. */
export function armPhaseFor(r: number, bearing: number): number {
  return wrap(bearing - Math.log(r / 2) / BG.pitch);
}

/** The arms' phase: arm 0 passes the neighbourhood's middle (radius 65, bearing 0.9; ruling 7). */
export const ARM_PHASE = armPhaseFor(65, 0.9);

/**
 * The galaxy wide (galaxy §14.5's fr-1: distance 640, fov 40, elevation 86), whose neighbourhood halos
 * must stay clear, and the screen each tier is held to it at (the probe sizes, phone first). On a
 * landscape screen (the desktop tier's probe) it stands at `landscapeDistance` (re-skin Task 1d): the
 * wider neighbourhood (1.5 × spacing) reaches radius 150, and 953 is the least whole distance at which
 * its lit set keeps under the text band at 1440 × 900 (netShots' GALAXY_SHOTS.galaxyWide reads both).
 */
export const GALAXY_WIDE = { distance: 640, landscapeDistance: 953, fov: 40, elevation: 86 } as const;
export const TIER_SCREEN: Readonly<Record<Tier, readonly [number, number]>> = { phone: [390, 844], desktop: [1440, 900] };
/**
 * Background sprite caps in CSS px (the tuner's `haloStar` and `haloBright`): a background star is a
 * crisp 2 px point (a 1 px halo at most), a bright one 3 px. The glow belongs to the core's haze, the
 * neighbourhood's stars (their sprite is `glowPx`, sized by distance: `hoodGlowPx` at the galaxy
 * wide) and nearer stars, not to the thousands behind them.
 */
export const HALO_PX = { star: 2, bright: 3 } as const;
/** Two sprites keep this much more than their caps apart, for the perspective's spread of scale across the disc. */
export const HALO_MARGIN = 1.05;
/** Draws per star: the tuner's placement loop counts this many before 'roomiest' would settle (under 'none' the first counts). */
export const PLACE_ATTEMPTS = 64;

/**
 * The galaxy wide on a `width` × `height` screen (bearing 0, aimed at the core; GALAXY_WIDE's distance
 * on a portrait screen, its landscapeDistance on a landscape one), reframed in portrait as `portraitRig`
 * does (backed off and opened by `k = sqrt(m)`): the camera's position, its focal length in CSS px
 * (vertical fov), and CSS px per unit at the galactic centre.
 */
export function galaxyWideView(width: number, height: number): { pos: [number, number, number]; focal: number; pxPerUnit: number } {
  const aspect = width / height;
  const k = Math.sqrt(aspect < 1 ? Math.min(2.4, Math.max(1, 0.89 / aspect)) : 1);
  const el = (GALAXY_WIDE.elevation * Math.PI) / 180;
  const d = (aspect < 1 ? GALAXY_WIDE.distance : GALAXY_WIDE.landscapeDistance) * k;
  const focal = height / (2 * Math.tan((GALAXY_WIDE.fov * Math.PI) / 360) * k);
  return { pos: [0, d * Math.sin(el), d * Math.cos(el)], focal, pxPerUnit: focal / d };
}

/** CSS px per unit at the galactic centre at the galaxy wide (`galaxyWideView`). */
export function galaxyWidePxPerUnit(width: number, height: number): number {
  return galaxyWideView(width, height).pxPerUnit;
}

/** A neighbourhood star's glow sprite at the galaxy wide on a tier's probe screen, in CSS px (`glowPx`, capped as a star's). */
export function hoodGlowPx(tier: Tier, spot: readonly number[]): number {
  const { pos, focal } = galaxyWideView(...TIER_SCREEN[tier]);
  return glowPx(STAR_R, Math.hypot(spot[0] - pos[0], spot[1] - pos[1], spot[2] - pos[2]), focal, GLOW_CAP.star);
}

/** GLSL's smoothstep (the tuner's `smooth`). */
function smooth(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/** An unbounded standard normal, Box–Muller, two draws (the tuner's `gaussN`). */
function gaussN(rng: () => number): number {
  return Math.sqrt(-2 * Math.log(Math.max(1e-12, rng()))) * Math.cos(2 * Math.PI * rng());
}

/** Perlin's quintic fade. */
function fade(t: number): number {
  return t * t * t * (t * (6 * t - 15) + 10);
}

/**
 * A gradient-noise channel: its lattice (cells `nu` round u at octave 0, `cv` of v a cell) and every
 * octave's seeded unit gradients (stream bgWispGrad, one draw per lattice point, keyed by channel,
 * octave, iu and iv as the tuner keys them), as cosines and sines in Float64Arrays filled up front over
 * v in [0, `vMax`]: a Float32Array would round the draws and the arrays would no longer be the tuner's.
 * A lookup past `vMax` draws its point from the stream there (the same draw, uncached).
 */
interface GradChannel {
  nu: number;
  cv: number;
  octaves: { nu: number; rows: number; cos: Float64Array; sin: Float64Array }[];
}

function gradChannel(seed: number, ch: number, nu0: number, cv: number, octaves: number, vMax: number): GradChannel {
  const out: GradChannel = { nu: nu0, cv, octaves: [] };
  for (let o = 0; o < octaves; o++) {
    const nu = nu0 << o;
    const rows = Math.floor((vMax / cv) * (1 << o)) + 2;
    const cos = new Float64Array(nu * rows);
    const sin = new Float64Array(nu * rows);
    for (let iv = 0; iv < rows; iv++) {
      for (let iu = 0; iu < nu; iu++) {
        const a = gradAngle(seed, ch, o, iu, iv);
        cos[iv * nu + iu] = Math.cos(a);
        sin[iv * nu + iu] = Math.sin(a);
      }
    }
    out.octaves.push({ nu, rows, cos, sin });
  }
  return out;
}

/** A lattice point's gradient angle (the tuner's `gradVal`): 2π × the first draw of its own bgWispGrad stream. */
function gradAngle(seed: number, ch: number, o: number, iu: number, iv: number): number {
  const key = (((ch * 16 + o) * 4096 + iu) * 8192 + (iv & 8191)) >>> 0;
  return 2 * Math.PI * streamFor(seed, 'bgWispGrad', key)();
}

/**
 * The background (the tuner's `generateBackground` on its wisps path at `WISPS_REVIEWED`, statement
 * for statement: the same draws on each stream, in the same order, rounded to float32 where it
 * rounds). `hood` is the neighbourhood's systems' spots (a binary's barycentre for its pair): no
 * background star is drawn where its halo would touch one of theirs at the galaxy wide (`nearHood`),
 * which is all the room they need.
 */
export function generateBackground(seed: number, tier: Tier, hood: readonly (readonly [number, number, number])[]): Background {
  const P = BG;
  const R = P.radius;
  const nStars = BG.stars[tier];
  const nDust = BG.dust[tier];
  const nCore = Math.round(P.coreShare * nStars);
  const ppu = galaxyWidePxPerUnit(...TIER_SCREEN[tier]);
  const gap = (pxA: number, pxB: number): number => (Math.max(pxA, pxB) / ppu) * HALO_MARGIN;
  const armPhase = ARM_PHASE;

  // Populations by index range (exact counts): the bulge (the core), old, young, knots.
  const nYoung = Math.round(P.youngShare * nStars);
  const nKnot = Math.round(P.clumpShare * nStars);
  const nOld = Math.max(0, nStars - nCore - nYoung - nKnot);
  const pop = new Uint8Array(nStars);
  for (let i = nCore; i < nStars; i++) pop[i] = i < nCore + nOld ? POP.old : i < nCore + nOld + nYoung ? POP.young : POP.knot;

  // Brightness first: the brightest `brightShare` are the bright set, with the larger sprite. A knot
  // member is brightened by clumpBright, a young star by youngBright, an old one dimmed by oldDim. Each
  // star's warm draw is taken now and read once it is placed.
  const rngs = Array.from({ length: nStars }, (_, i) => streamFor(seed, 'bgStars', i));
  const level = rngs.map((rng, i) => {
    const u = rng();
    let brightness = P.brightFloor + (1 - P.brightFloor) * u ** P.brightPow;
    if (pop[i] === POP.knot) brightness = Math.min(1, brightness * (1 + P.clumpBright));
    if (pop[i] === POP.young) brightness = Math.min(1, brightness * (1 + P.youngBright));
    if (pop[i] !== POP.knot && pop[i] !== POP.young) brightness *= 1 - P.oldDim;
    return { brightness, warmU: rng() };
  });
  const nBright = Math.round(P.brightShare * nStars);
  const rank = level.map((_, i) => i).sort((a, b) => level[b].brightness - level[a].brightness || a - b);
  const isBright = new Uint8Array(nStars);
  for (let k = 0; k < nBright; k++) isBright[rank[k]] = 1;

  // A neighbourhood star's halo is never touched: a draw too near one is always drawn again.
  const glows = hood.map((s) => hoodGlowPx(tier, s));
  const nearHood = (p: readonly number[], px: number): boolean => hood.some((s, k) => Math.hypot(p[0] - s[0], p[2] - s[2]) < gap(px, glows[k]));

  /** The arms fade in past the bulge and out toward the rim. */
  const armRamp = (r: number): number =>
    smooth((P.armStartIn || 0.5 * P.armStart) * R, P.armStart * R, r) * (P.armEnd < 1 ? 1 - smooth(P.armEnd * R, P.armEndOut * R, r) : 1);
  /** A disc radius: an exponential disc (scale `scale`·R) that fades smoothly to nothing at the rim. */
  const discR = (rng: () => number, scale: number = P.discScale): number => {
    for (let t = 0; t < 64; t++) {
      const r = -scale * R * Math.log(Math.max(1e-12, rng() * rng()));
      if (r <= P.discFadeEnd * R && rng() < 1 - smooth(P.discFade * R, P.discFadeEnd * R, r)) return r;
    }
    return R * rng();
  };
  /** The arm profile across the arm, in phase Δ: smooth and periodic. */
  const armProfile = (delta: number, sharp: number): number => ((1 + Math.cos(delta)) / 2) ** sharp;
  // Along-arm modulation: seeded value noise in u = ln r / modPeriod, one 64-entry table per arm (stream
  // bgArmMod, key = arm), smoothstep-interpolated; 1 ± modDepth.
  const modTable = Array.from({ length: P.arms }, (_, arm) => {
    const rng = streamFor(seed, 'bgArmMod', arm);
    return Array.from({ length: 64 }, () => rng());
  });
  const armDipAt = (r: number, arm: number): number => {
    const u = Math.log(Math.max(r, 1)) / P.modPeriod + 8;
    const k = Math.floor(u);
    const t = u - k;
    const tab = modTable[arm];
    const v = tab[((k % 64) + 64) % 64] + (tab[(((k + 1) % 64) + 64) % 64] - tab[((k % 64) + 64) % 64]) * (t * t * (3 - 2 * t));
    return 1 - P.modDepth + P.modDepth * 2 * v;
  };

  // ---- the density field: no centre line; the arms are where the flow-aligned wisps crowd ----
  // Log-polar flow coordinates: u = ln r / pitch − θ is constant along a log spiral of the arms' pitch,
  // v = ln r runs along it. A step of 1 in u is r·sin i across the flow and 1 in v is r / sin i along it,
  // so the features grow with r. The noise is periodic in u.
  const sinI = Math.sin(Math.atan(P.pitch));
  const wSize = Math.sqrt(Math.max(1e-4, P.wispAlong) * Math.max(1e-4, P.wispAcross));
  const wRatio = (Math.max(1e-4, P.wispAlong) / Math.max(1e-4, P.wispAcross)) ** P.wispAniso;
  const wCellsU = Math.max(1, Math.min(511, Math.round((2 * Math.PI * sinI) / (wSize / Math.sqrt(wRatio)))));
  const wCellV = Math.max(0.01, wSize * Math.sqrt(wRatio) * sinI);
  const wShear = Math.tan((P.wispShear * Math.PI) / 180) / (sinI * sinI);
  const wOct = Math.max(1, Math.min(6, Math.round(P.wispOctaves)));
  /** A channel's lattice for features `along`·r long and `across`·r wide, `shearDeg` off the arm (the tuner's `chanGeom`). */
  const chanGeom = (along: number, across: number, shearDeg: number) => {
    const cs = Math.max(0.2, Math.cos((shearDeg * Math.PI) / 180));
    return {
      nu: Math.max(1, Math.min(511, Math.round((2 * Math.PI * sinI * cs) / Math.max(1e-4, across)))),
      cv: Math.max(0.01, Math.max(1e-4, along) * sinI * cs),
      sh: Math.tan((shearDeg * Math.PI) / 180) / (sinI * sinI),
    };
  };
  const wFeed = Math.max(0, Math.min(1, P.wispRidgeFeed));
  const warpGeom = chanGeom(P.wispWarpAlong, WARP_ACROSS * Math.max(1e-4, P.wispAcross), 0);
  const laneGeom = chanGeom(P.wispLaneAlong, P.wispLaneAcross, 0);
  const featherGeom = chanGeom(P.wispFeatherAlong, P.wispFeatherAcross, P.wispFeatherShear);
  const featherOct = Math.max(1, Math.min(6, Math.round(P.wispFeatherOctaves)));
  // The lattices, filled up front over the disc's ln r (a bead's radius strays a little past it; a
  // lookup further out draws its point uncached).
  const vMax = Math.log(R * 1.5);
  const channels: GradChannel[] = [
    gradChannel(seed, 0, wCellsU, wCellV, wOct, vMax),
    gradChannel(seed, 1, laneGeom.nu, laneGeom.cv, wOct, vMax),
    gradChannel(seed, 2, warpGeom.nu, warpGeom.cv, 1, vMax),
    gradChannel(seed, 3, featherGeom.nu, featherGeom.cv, featherOct, vMax),
  ];
  /**
   * Flow-aligned fbm in [0, 1] on channel ch at flow coordinates (U, v), `oct` octaves of gradient
   * noise squashed smoothly to [0, 1], blended `wispRidge` toward ridged noise, each octave half the
   * size and half the weight, further × (1 − feed + feed · the coarser octave's value).
   */
  const fbm = (ch: number, U: number, v: number, oct: number): number => {
    const chan = channels[ch];
    const uu = (((U / (2 * Math.PI)) % 1) + 1) % 1;
    let sum = 0;
    let norm = 0;
    let amp = 1;
    let prev = 1;
    for (let o = 0; o < oct; o++) {
      const lat = chan.octaves[o];
      const nu = lat.nu;
      const x = uu * nu;
      const y = (v / chan.cv) * (1 << o);
      const ix = Math.floor(x);
      const iy = Math.floor(y);
      const fx = fade(x - ix);
      const fy = fade(y - iy);
      const x0 = ix % nu;
      const x1 = (ix + 1) % nu;
      const dx = x - ix;
      const dy = y - iy;
      let a: number;
      let b: number;
      let c: number;
      let d: number;
      if (iy >= 0 && iy + 1 < lat.rows) {
        const r0 = iy * nu;
        const r1 = r0 + nu;
        a = lat.cos[r0 + x0] * dx + lat.sin[r0 + x0] * dy;
        b = lat.cos[r0 + x1] * (dx - 1) + lat.sin[r0 + x1] * dy;
        c = lat.cos[r1 + x0] * dx + lat.sin[r1 + x0] * (dy - 1);
        d = lat.cos[r1 + x1] * (dx - 1) + lat.sin[r1 + x1] * (dy - 1);
      } else {
        const g = (iu: number, iv: number, px: number, py: number): number => {
          const ang = gradAngle(seed, ch, o, iu, iv);
          return Math.cos(ang) * px + Math.sin(ang) * py;
        };
        a = g(x0, iy, dx, dy);
        b = g(x1, iy, dx - 1, dy);
        c = g(x0, iy + 1, dx, dy - 1);
        d = g(x1, iy + 1, dx - 1, dy - 1);
      }
      const p = a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
      let n = 0.5 + 0.5 * Math.tanh(SQUASH * p);
      n = (1 - P.wispRidge) * n + P.wispRidge * (1 - Math.abs(2 * n - 1));
      const w = amp * (1 - wFeed + wFeed * prev);
      sum += w * n;
      norm += w;
      prev = n;
      amp *= 0.5;
    }
    return sum / norm;
  };
  /**
   * The terms every weight at (r, θ) shares, each computed once where the tuner computes it at every
   * use (so the same values): ln r; the phase from the arms' crest, Δ = −m(θ − θ_arm(r)) wrapped (Δ < 0
   * is the inner edge; the tuner's `fieldDelta`); the nearest crest's arm (`fieldArm`); the arms' ramp;
   * and the domain warp (channel 2: one smooth octave bends u, so the wisps meander off the lattice),
   * taken only once a weight needs the noise.
   */
  interface FieldPoint {
    r: number;
    th: number;
    v: number;
    delta: number;
    arm: number;
    ramp: number;
    warp: number;
  }
  const fieldPoint = (r: number, th: number): FieldPoint => {
    const crest = armAngleAt(Math.max(r, 1e-9), armPhase, 0);
    const k = Math.round((wrap(th - crest) * P.arms) / (2 * Math.PI));
    return { r, th, v: Math.log(Math.max(r, 1)), delta: -wrap(P.arms * (th - crest)), arm: ((k % P.arms) + P.arms) % P.arms, ramp: armRamp(r), warp: NaN };
  };
  const warpAt = (p: FieldPoint): number => {
    if (Number.isNaN(p.warp)) p.warp = P.wispWarp * (2 * fbm(2, p.v / P.pitch - p.th, p.v, 1) - 1);
    return p.warp;
  };
  /** The stars' wisps (channel 0) in [0, 1]. */
  const wispNoise0 = (p: FieldPoint): number => fbm(0, p.v / P.pitch - p.th - wShear * p.v + warpAt(p), p.v, wOct);
  /** The dust lane's filament (channel 1): its own long, thin, unsheared lattice. */
  const wispNoise1 = (p: FieldPoint): number => fbm(1, p.v / P.pitch - p.th + warpAt(p), p.v, wOct);
  /** The threshold-free contrast curve: smooth, 0.5 at 0.5, steeper with p; dense wisps and near-empty gaps, no edge. */
  const wispCurve = (n: number): number => {
    const a = n ** P.wispPower;
    const b = (1 - n) ** P.wispPower;
    return a / Math.max(1e-12, a + b);
  };
  /** The spiral bias σ in phase: the unit of the lane's, the knots' and the feathers' offsets. */
  const wispPhaseSigma = Math.sqrt(2 / Math.max(0.25, P.wispSharp));
  // Feathers (channel 3): short, thin wisps sheared steeply off the arm, windowed onto its outer flank.
  const featherAt = (p: FieldPoint): number => {
    const win = Math.exp(-0.5 * (wrap(p.delta - P.wispFeatherAt * wispPhaseSigma) / Math.max(1e-3, P.wispFeatherWidth * wispPhaseSigma)) ** 2);
    return win * wispCurve(fbm(3, p.v / P.pitch - p.th - featherGeom.sh * p.v + warpAt(p), p.v, featherOct));
  };
  /** The wisp field, in [0, 1]: the wisps' contrast curve, plus the feathers at their weight. */
  const wispField = (p: FieldPoint): number => (wispCurve(wispNoise0(p)) + P.wispFeather * featherAt(p)) / (1 + P.wispFeather);
  // The spiral bias: its contrast rising outward, the along-arm modulation (bgArmMod) and the branch.
  const branchR0 = P.wispBranchFrom * R;
  const branchDelta = (r: number, th: number): number => {
    // The branch's crest: the arm's angle at branchR0, then a log spiral of the branch's pitch.
    const thB = armAngleAt(branchR0, armPhase, 0) + Math.log(Math.max(r, 1e-9) / branchR0) / Math.max(0.05, P.wispBranchPitch);
    return -wrap(P.arms * (th - thB));
  };
  const branchWin = (r: number): number => smooth(branchR0, R, r) * (P.armEnd < 1 ? 1 - smooth(P.armEnd * R, P.armEndOut * R, r) : 1);
  const wispBiasAt = (p: FieldPoint, A: number, s: number): number => {
    const Ar = A * (1 - P.wispBiasRise * (1 - smooth(0, P.wispBiasRiseTo * R, p.r)));
    const main = Ar * p.ramp * armDipAt(p.r, p.arm) * armProfile(p.delta, s);
    const branch = P.wispBranch > 0 ? P.wispBranch * A * branchWin(p.r) * armProfile(branchDelta(p.r, p.th), s) : 0;
    return (1 + main + branch) / (1 + A * (1 + P.wispBranch));
  };
  /** The dark streaks, in [0, 1]: the lane channel's filament, weighted toward the arms' inner (concave) edge. */
  const wispStreak = (p: FieldPoint): number => {
    if (!(P.laneDepth > 0)) return 0;
    const g = Math.exp(-0.5 * (wrap(p.delta - P.laneOffset * wispPhaseSigma) / Math.max(1e-3, P.laneWidth * wispPhaseSigma)) ** 2);
    return g * p.ramp * wispCurve(wispNoise1(p));
  };
  const wispYoungW = (p: FieldPoint): number => (wispBiasAt(p, P.wispBias, P.wispSharp) * wispField(p)) ** P.wispYoung * p.ramp;

  /**
   * Whether a rejection draw `u` takes a point of costly weight `w()`, given `lo` ≤ w ≤ `hi` from cheap
   * terms (the costly factors at their bounds): a draw outside the two needs no `w`. Each bound is
   * widened by BOUND_SLACK, far more than the few ulps between a bound and its weight's rounding, so the
   * answer is exactly the tuner's `u < w`.
   */
  const takes = (u: number, lo: number, hi: number, w: () => number): boolean =>
    u < lo * (1 - BOUND_SLACK) ? true : u >= hi * (1 + BOUND_SLACK) ? false : u < w();
  // The bounds: the wisp field, the feathers and the streaks each lie in [0, 1] (a contrast curve, a
  // window, the arms' ramp), so the old disc's texture factor lies in [1 − wispOld, 1] and the lane's
  // in [1 − laneDepth, 1].
  const OLD_TEXTURE_MIN = 1 - P.wispOld;
  const LANE_MIN = 1 - P.laneDepth;

  // Knots, as beads: a seeded walk along each arm (stream bgBeads) with gaps of the mean × U(1 ± jitter),
  // the mean set so the arm's knots fill it from armStart to armEnd. Each bead sits on the densest young
  // wisp near the crest, clumpOut bias-σ downstream (the best of BEAD_TRIES draws from its own bgKnots
  // stream), so the beads follow the wisps, not a hidden line.
  const knots: [number, number, number][] = [];
  {
    const nK = Math.max(1, Math.round(P.clumpCount));
    const perArm = Math.ceil(nK / P.arms);
    const r0 = Math.max(P.coreExclusion * BEAD_INNER, P.armStart * R);
    const r1 = Math.min(1, P.armEnd) * R;
    const gapMean = Math.max(1e-6, r1 - r0) / sinI / (perArm + 0.5);
    const jit = Math.max(0, Math.min(1, P.wispKnotJitter));
    const walked = new Array<number>(P.arms).fill(0);
    for (let k = 0; k < nK; k++) {
      const arm = k % P.arms;
      walked[arm] += gapMean * (1 - jit + 2 * jit * streamFor(seed, 'bgBeads', k)());
      const r = r0 + walked[arm] * sinI;
      if (r > r1) continue;
      const rng = streamFor(seed, 'bgKnots', k);
      let best: [number, number, number] = [0, 0, 0];
      let bw = -1;
      for (let t = 0; t < BEAD_TRIES; t++) {
        const dPhase = (P.clumpOut + BEAD_SPREAD * gaussN(rng)) * wispPhaseSigma;
        const rr = r * Math.exp(((BEAD_ALONG * gapMean * sinI) / r) * gaussN(rng));
        const th = armAngleAt(rr, armPhase, arm) - dPhase / P.arms;
        const w = wispYoungW(fieldPoint(rr, th));
        if (w > bw) {
          bw = w;
          best = [rr * Math.cos(th), rr * Math.sin(th), rr];
        }
      }
      knots.push([best[0], best[1], P.knotSigma * best[2] * (0.7 + 0.6 * rng())]);
    }
  }

  /** One draw of star i's place, or null: drawn again. */
  const candidate = (i: number, rng: () => number): [number, number, number] | null => {
    if (i < nCore) {
      // An exponential sphere of scale bulgeScale·R (radial law r² e^(−r/h)), flattened in y, cut at BULGE_CUT·R.
      const h = P.bulgeScale * R;
      const r = -h * Math.log(Math.max(1e-12, rng() * rng() * rng()));
      const th = 2 * Math.PI * rng();
      const cy = 2 * rng() - 1;
      const sy = Math.sqrt(1 - cy * cy);
      const c: [number, number, number] = [
        Math.fround(r * sy * Math.cos(th)),
        Math.fround(r * cy * P.bulgeFlat),
        Math.fround(r * sy * Math.sin(th)),
      ];
      return r > BULGE_CUT * R ? null : c;
    }
    if (pop[i] === POP.knot) {
      const K = knots[Math.floor(rng() * knots.length) % knots.length];
      return [Math.fround(K[0] + K[2] * gaussN(rng)), Math.fround(KNOT_MEMBER_Y * P.starY * gaussN(rng)), Math.fround(K[1] + K[2] * gaussN(rng))];
    }
    // Old (smooth, low contrast) and young (the wisp field, sharpened): rejection from the disc law, never a cut.
    const young = pop[i] === POP.young;
    let xz: [number, number] | null = null;
    for (let t = 0; t < STAR_TRIES && !xz; t++) {
      const r = discR(rng, young ? P.discScale * P.armScale : P.discScale);
      const th = 2 * Math.PI * rng() - Math.PI;
      // The tuner's `rng() < w`, w the population's weight × (1 − laneDepth · streak). The draw takes no
      // part in w, so it is drawn first, and w is taken only where its bounds cannot answer.
      const u = rng();
      const p = fieldPoint(r, th);
      let hit: boolean;
      if (young) {
        // (bias · field)^wispYoung · ramp: at most bias^wispYoung · ramp; with the field in, the lane's factor is left.
        const bias = wispBiasAt(p, P.wispBias, P.wispSharp);
        if (u >= bias ** P.wispYoung * p.ramp * (1 + BOUND_SLACK)) hit = false;
        else {
          const yw = (bias * wispField(p)) ** P.wispYoung * p.ramp;
          hit = takes(u, yw * LANE_MIN, yw, () => yw * (1 - P.laneDepth * wispStreak(p)));
        }
      } else {
        // bias · (1 − wispOld + wispOld · field), then the lane's factor.
        const bias = wispBiasAt(p, P.oldContrast, P.oldSharp);
        hit = takes(u, bias * OLD_TEXTURE_MIN * LANE_MIN, bias, () => bias * (1 - P.wispOld + P.wispOld * wispField(p)) * (1 - P.laneDepth * wispStreak(p)));
      }
      if (hit) xz = [r * Math.cos(th), r * Math.sin(th)];
    }
    if (!xz) return null;
    const yMax = young ? 0.5 * P.starY : P.starY;
    return [Math.fround(xz[0]), Math.fround(yMax * (rng() + rng() - 1)), Math.fround(xz[1])];
  };

  // Placement 'none': each star takes the density's first draw outside the core's exclusion whose halo
  // keeps clear of the neighbourhood's.
  const stars: [number, number, number][] = [];
  for (let i = 0; i < nStars; i++) {
    const rng = rngs[i];
    const px = isBright[i] ? HALO_PX.bright : HALO_PX.star;
    let p: [number, number, number] | null = null;
    for (let draws = 0; p === null; draws++) {
      if (draws > 100 * PLACE_ATTEMPTS) throw new Error(`no room for background star ${i}`);
      const c = candidate(i, rng);
      if (c === null || Math.hypot(c[0], c[1], c[2]) < P.coreExclusion || nearHood(c, px)) continue;
      p = c;
    }
    stars.push(p);
  }

  // Warmth, by where each star landed: the young and the knots are blue; the old disc and the bulge are
  // warm with a share falling from warmCore at the centre to oldWarm at the rim.
  const dimArr = new Float32Array(4 * (nStars - nBright));
  const brightArr = new Float32Array(4 * nBright);
  const dimPop = new Uint8Array(nStars - nBright);
  const brightPop = new Uint8Array(nBright);
  let d = 0;
  let b = 0;
  stars.forEach(([x, y, z], i) => {
    const t = Math.min(1, Math.hypot(x, z) / R);
    const warm = pop[i] !== POP.knot && pop[i] !== POP.young && level[i].warmU < P.warmCore + (P.oldWarm - P.warmCore) * Math.sqrt(t);
    const v = warm ? -level[i].brightness : level[i].brightness;
    if (isBright[i]) {
      brightPop[b] = pop[i];
      brightArr.set([x, y, z, v], 4 * b++);
    } else {
      dimPop[d] = pop[i];
      dimArr.set([x, y, z, v], 4 * d++);
    }
  });

  // Dust (1 px hard motes, no halo): dustArmShare follows the old field and peaks in the dark streaks
  // (gain dustLaneGain), dustWispShare of that traces the wisps themselves; the rest is a smooth disc.
  const dust = new Float32Array(4 * nDust);
  for (let i = 0; i < nDust; i++) {
    const rng = streamFor(seed, 'bgDust', i);
    const brightness = P.dustFloor + P.dustRange * rng();
    const onArm = rng() < P.dustArmShare;
    const onWisp = onArm && P.dustWispShare > 0 && rng() < P.dustWispShare;
    let p: [number, number, number] | null = null;
    for (let t = 0; t < DUST_TRIES && !p; t++) {
      const r = discR(rng);
      const th = 2 * Math.PI * rng() - Math.PI;
      // The tuner's `if (rng() > w) continue`, the draw first and w only where its bounds cannot answer:
      // on a wisp w = bias · field, in [0, bias]; on an arm (bias · (1 + gain · streak)) / (1 + gain), in
      // [bias / (1 + gain), bias]; elsewhere 1.
      const u = rng();
      if (onWisp || onArm) {
        const p = fieldPoint(r, th);
        const bias = wispBiasAt(p, P.dustContrast, P.oldSharp);
        const lo = onWisp ? 0 : bias / (1 + P.dustLaneGain);
        const w = onWisp ? () => bias * wispField(p) : () => (bias * (1 + P.dustLaneGain * wispStreak(p))) / (1 + P.dustLaneGain);
        if (!(u <= lo * (1 - BOUND_SLACK)) && (u > bias * (1 + BOUND_SLACK) || u > w())) continue;
      }
      const c: [number, number, number] = [Math.fround(r * Math.cos(th)), Math.fround(P.dustY * (rng() + rng() - 1)), Math.fround(r * Math.sin(th))];
      if (Math.hypot(c[0], c[1], c[2]) >= P.coreExclusion) p = c;
    }
    p ??= [R, 0, 0];
    dust.set([p[0], p[1], p[2], brightness], 4 * i);
  }

  return {
    stars: dimArr,
    bright: brightArr,
    dust,
    armPhase,
    knots,
    pop: { stars: dimPop, bright: brightPop },
  };
}

/** One pulled star: the spot it stands on, the set and row it came from (in the generated background), and how far it moved in x–z. */
export interface HoodPulled {
  spot: number;
  set: 'stars' | 'bright';
  row: number;
  distance: number;
}

/**
 * The neighbourhood's far form ("Dissolve (late)", re-skin §4.1): the background less the pulled rows,
 * and the pulled rows at their spots. `stars` and `bright` are the generated sets with those rows
 * taken out, every other row in its order; `farStars` and `farBright` the pulled rows of each class at
 * (spot x, 0, spot z) with their own signed brightness, in spot order. The instance count is the
 * generator's: a row moves, none is added.
 */
export interface HoodPull {
  stars: Float32Array;
  bright: Float32Array;
  farStars: Float32Array;
  farBright: Float32Array;
  pulled: readonly HoodPulled[];
}

/**
 * Pulls the nearest background star onto each neighbourhood spot (the tuner's Dissolve, `applyHood`
 * with `nearestStars`): spots in index order, each taking the nearest star (dim or bright) in x–z not
 * yet taken, the dim set searched before the bright, a tie going to the earlier row. A pure function of
 * the generated background and the spots: the generator stays bit for bit. (The tuner zeroes the pulled
 * row in place and draws 30 far rows more; here the row moves, so the picture is the same and the
 * instance count is unchanged.)
 */
export function pullToHood(bg: Background, spots: readonly (readonly [number, number, number])[]): HoodPull {
  const taken = { stars: new Set<number>(), bright: new Set<number>() };
  const pulled: HoodPulled[] = [];
  const far = { stars: [] as number[], bright: [] as number[] };
  spots.forEach(([x, , z], spot) => {
    let best: { set: 'stars' | 'bright'; row: number; distance: number } | null = null;
    for (const set of ['stars', 'bright'] as const) {
      const arr = bg[set];
      for (let row = 0; row < arr.length / 4; row++) {
        if (taken[set].has(row)) continue;
        const distance = Math.hypot(arr[4 * row] - x, arr[4 * row + 2] - z);
        if (best === null || distance < best.distance) best = { set, row, distance };
      }
    }
    if (best === null) throw new Error(`no background star left for spot ${spot}`);
    taken[best.set].add(best.row);
    pulled.push({ spot, ...best });
    far[best.set].push(x, 0, z, bg[best.set][4 * best.row + 3]);
  });
  const less = (set: 'stars' | 'bright'): Float32Array => {
    const arr = bg[set];
    const out = new Float32Array(arr.length - 4 * taken[set].size);
    let k = 0;
    for (let row = 0; row < arr.length / 4; row++) {
      if (taken[set].has(row)) continue;
      out.set(arr.subarray(4 * row, 4 * row + 4), 4 * k++);
    }
    return out;
  };
  return { stars: less('stars'), bright: less('bright'), farStars: new Float32Array(far.stars), farBright: new Float32Array(far.bright), pulled };
}
