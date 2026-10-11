// Galaxy background generator: a port of src/galaxy/background.ts (today's look, bit for bit with the
// default parameters) extended with the recommended populations (perpendicular arm profile, inter-arm
// disc, exponential bulge, knots, dust lanes, colour gradient). Pure and deterministic.

// ---- seeded streams (src/math/hash.ts, src/galaxy/seeds.ts) ----
function pcg(v) {
  const state = (Math.imul(v, 747796405) + 2891336453) >>> 0;
  const word = Math.imul((state >>> ((state >>> 28) + 4)) ^ state, 277803737);
  return ((word >>> 22) ^ word) >>> 0;
}
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seededStream(seed, salt, key) {
  const mix = pcg((Math.imul(salt, 0x9e3779b9) ^ Math.imul(key + 1, 0x85ebca6b)) >>> 0);
  const rng = mulberry32(pcg((seed ^ mix) >>> 0));
  rng();
  return rng;
}
const SALT = { bgStars: 8, bgDust: 9, bgRingTurn: 10, bgRingSlots: 11, bgKnots: 12, bgPop: 13, bgArmMod: 22, bgSpurs: 15, bgTemp: 16, bgWisps: 17, bgWispGrad: 18, bgBeads: 19, bgHoodLook: 20, bgHoodJitter: 21 };
const streamFor = (seed, concern, key) => seededStream(seed, SALT[concern], key);

// ---- the essay's constants ----
// landscapeDistance: the wide on a landscape screen (the desktop tier's probe), stood off so the wider
// neighbourhood (1.5 x spacing) keeps under the text band; a portrait screen keeps 640.
export const GALAXY_WIDE = { distance: 640, landscapeDistance: 953, fov: 40, elevation: 86 };
export const TIER_SCREEN = { phone: [390, 844], desktop: [1440, 900] };
const HALO_MARGIN = 1.05;
const CORE_RING = 72;
const CORE_JITTER = 0.25;
const PLACE_ATTEMPTS = 64;
const STAR_R = 0.9, GLOW_SCALE = 5, GLOW_MIN_PX = 5, GLOW_CAP_STAR = 18;
// The neighbourhood's 30 star spots (x, z), as generateGalaxy(seed 1) places them (the same on both tiers).
/*HOOD*/

export function galaxyWideView(width, height) {
  const aspect = width / height;
  const k = Math.sqrt(aspect < 1 ? Math.min(2.4, Math.max(1, 0.89 / aspect)) : 1);
  const el = (GALAXY_WIDE.elevation * Math.PI) / 180;
  const d = (aspect < 1 ? GALAXY_WIDE.distance : GALAXY_WIDE.landscapeDistance) * k;
  const focal = height / (2 * Math.tan((GALAXY_WIDE.fov * Math.PI) / 360) * k);
  return { pos: [0, d * Math.sin(el), d * Math.cos(el)], focal, pxPerUnit: focal / d, k };
}
export function glowPx(R, d, focalPx, cap) {
  return Math.min(cap, Math.max(GLOW_MIN_PX, (GLOW_SCALE * R * focalPx) / d));
}
function hoodGlowPx(tier, spot) {
  const { pos, focal } = galaxyWideView(...TIER_SCREEN[tier]);
  return glowPx(STAR_R, Math.hypot(spot[0] - pos[0], 0 - pos[1], spot[1] - pos[2]), focal, GLOW_CAP_STAR);
}

function wrap(a) {
  const w = a - 2 * Math.PI * Math.floor((a + Math.PI) / (2 * Math.PI));
  return w <= -Math.PI ? w + 2 * Math.PI : w;
}
/** Arm `arm` of `arms` at radius r: arm·2π/arms + ln(r/2)/pitch + phase (today: arms 2, so arm·π). */
export function armAngleAt(r, pitch, phase, arm, arms) {
  return wrap((arm * 2 * Math.PI) / arms + Math.log(r / 2) / pitch + phase);
}
export function armPhaseFor(r, bearing, pitch) {
  return wrap(bearing - Math.log(r / 2) / pitch);
}

/** Today's parameters: src/galaxy/background.ts BG plus the renderer's sprite sizes. */
export const TODAY = {
  tier: 'phone',
  seed: 1,
  stars: 2400,
  dust: 4000,
  radius: 220,
  arms: 2,
  pitch: 0.28,
  armMode: 'bearing', // bearing (today) | perp
  scatter: 0.42,
  scatterRim: 0.5, // today: scatter·(1 − 0.5 r/R)
  armSoft: 0, // 0 uniform (today), 1 gaussian
  sigmaCore: 4, // perp mode: σ across the arm at the centre (units)
  sigmaRim: 22, // perp mode: σ at the rim
  armEnd: 1, // arms fade into the disc past this share of the radius
  discShare: 0, // share of the non-core stars spread between the arms
  radialLaw: 'power', // power (today: r = R u^exp) | exp (exponential disc of scale discScale·R)
  starExp: 0.75,
  discScale: 0.3,
  coreShare: 0.22,
  bulgeMode: 'rings', // rings (today) | exp (exponential sphere)
  coreAt: 0.35,
  bulgeScale: 0.09,
  bulgeFlat: 0.55,
  coreExclusion: 16,
  brightShare: 0.15,
  brightFloor: 0.35,
  brightPow: 2,
  warmShare: 0.12,
  warmGradient: 0, // 0: warmShare everywhere (today); 1: warmCore at the centre to warmRim at the rim
  warmCore: 0.9,
  warmRim: 0.04,
  clumpShare: 0,
  clumpCount: 36,
  clumpRadius: 4.5,
  clumpOut: 0.6, // knots sit this many σ outward of the arm's centre line
  clumpBright: 0.5,
  laneDepth: 0,
  laneOffset: -0.55, // in σ; negative is the inner (concave) edge
  laneWidth: 0.4, // in σ
  starY: 0.6,
  dustY: 1.1,
  dustMode: 'arms', // arms (today) | disc | lanes
  dustScatter: 0.9,
  dustExp: 0.6,
  dustFloor: 0.08,
  dustRange: 0.1,
  // sprites (src/scene/galaxy/galaxySystem.ts, star.frag.glsl, lod.ts)
  haloStar: 2,
  haloBright: 3,
  maxStar: 4,
  maxBright: 6,
  worldStar: 0.7,
  worldBright: 1,
  dustPx: 1,
  hazePx: 56,
  hazeGain: 0.35,
  hazeWarm: 0,
  agent: '#4DA3FF',
  warm: '#FFF2E0',
  warmMix: 0.55,
  gain: 1,
  hood: 1,
};

/** The recommendation: the same budget, the populations of a real spiral. */
export const RECOMMENDED = {
  ...TODAY,
  pitch: 0.34,
  armMode: 'perp',
  armSoft: 1,
  sigmaCore: 3,
  sigmaRim: 9,
  armEnd: 0.9,
  discShare: 0.1,
  radialLaw: 'exp',
  discScale: 0.4,
  coreShare: 0.25,
  bulgeMode: 'exp',
  bulgeScale: 0.08,
  bulgeFlat: 0.55,
  brightFloor: 0.3,
  brightPow: 2.2,
  warmGradient: 1,
  warmCore: 0.9,
  warmRim: 0.04,
  clumpShare: 0.18,
  clumpCount: 30,
  clumpRadius: 5,
  clumpOut: 0.6,
  clumpBright: 0.5,
  laneDepth: 0.6,
  laneOffset: -0.6,
  laneWidth: 0.4,
  starY: 1.5,
  dustMode: 'disc',
  dustFloor: 0.1,
  dustRange: 0.16,
  hazePx: 64,
  hazeWarm: 1,
  warm: '#FFD9A0',
  warmMix: 0.85,
};

/**
 * The shape modes' own parameters. TODAY and RECOMMENDED do not name them: the page fills them in from here,
 * and at these defaults (shape 'arms', place 'roomiest') nothing they hold is read, so both presets generate
 * bit for bit what they did before the modes were added.
 */
export const SHAPE_DEFAULTS = {
  shape: 'arms', // arms (today's and the recommended generators) | wave (arms from orbits) | field (smooth density field)
  place: 'roomiest', // roomiest (today: first clear of 64, else the roomiest) | reject (first clear of 64, else a fresh draw) | none
  youngShare: 0.3, // share of the non-core stars that are young (blue, bright, in the arms); knots (clumpShare) are young too
  youngContrast: 12, // young arm contrast A: density peak / trough = 1 + A
  youngSharp: 8, // young arm profile sharpness s: f(Δ) = ((1 + cos Δ) / 2)^s
  youngBright: 0.5, // young brightness boost
  oldDim: 0, // old disc and bulge stars dimmed by this share (the arms carry the light, as young stars do)
  oldContrast: 1, // old (warm, smooth) arm contrast A (field mode; extra bunching on top of the orbits' in wave mode)
  oldSharp: 2, // old arm profile sharpness
  oldWarm: 0.6, // warm share of the old disc stars at the rim (warmCore at the centre)
  discFade: 0.7, // the disc fades smoothly to nothing from this share of the radius to the rim
  armStart: 0.16, // the arms fade in from half this share of the radius to it
  waveEIn: 0.02, // wave mode: orbit ellipticity (1 − b/a) at the centre
  waveEOut: 0.12, // wave mode: orbit ellipticity at the rim (orbits cross, and edges turn hard, past ~0.24 at pitch 0.28)
  dustContrast: 1, // dust motes follow the old stars' field, at this contrast
  dustSharp: 1.5, // and this sharpness
  dustLane: 0, // 0: the dust crest is the arm crest; 1: it sits in the dust lane (the lane is where the dust is)
  armScale: 1, // the young stars' (and knots') disc scale length, × discScale (arm light is ~1.3× the disc's)
  modDepth: 0, // along-arm amplitude modulation: seeded value noise in ln r (stream bgArmMod, salt 14), 1 ± depth; 0 off
  modPeriod: 0.35, // its period in ln r (0.35 ≈ a 5 kpc arm segment)
  armStartIn: 0, // the arms fade in from this share of R (0: half of armStart)
  armEndOut: 1, // and, when armEnd < 1, fade out from armEnd to this share of R
  discFadeEnd: 1, // the disc taper ends (density 0) at this share of R; > 1 lets the soft rim run past R (recipe)
  // ---- recipe mode only (armresearch/findings.md §7: an Sc like M74) ----
  spurShare: 0.04, // share of the stars in spurs (feathers off the arms' outer edge)
  spurCount: 20,
  spurAngle: 50, // degrees from the arm tangent, turned outward (trailing)
  spurLength: 0.16, // × r
  spurWidth: 0.012, // × r
  widthOld: 0.3, // old arm FWHM × r (perpendicular)
  widthYoung: 0.13, // young arm FWHM × r
  sersicN: 0.6, // cross-arm profile exp(−ln2·(|d|/w)^(1/n)): 0.5 gaussian, 1 exponential
  youngOffset: 0.12, // young crest this many old half-widths downstream (outside) of the old crest
  knotSigma: 0.045, // knot member spread × r (recipe: replaces clumpRadius; clumpOut is in old half-widths)
  dustLaneGain: 2.5, // dust motes' weight × (1 + gain·lane gaussian): the dust peaks in the lane
  dustArmShare: 0.7, // share of the dust drawn with the arm weight (the rest is a smooth disc)
  zOld: 0.12, // vertical σ × disc scale length, old stars
  zYoung: 0.04, // young, knots and spurs
  zDust: 0.06, // dust
  // ---- star colour (opt-in; 0 keeps today's two tints) ----
  starColour: 0, // colour variety: scales each star's blackbody deviation from white (0 off, 1 the blackbody's own, 2 double)
  youngTempSpread: 1, // spread of the young population's temperatures about its median (in log T), × the class mixture's own
  oldTempSpread: 1, // the same for the old disc and the bulge
  colourLum: 1.8, // coloured stars' luminance, × the agents' blue (#4DA3FF reads brighter than a grey of equal luminance)
  // ---- the arms generator's cross-arm profile and lane (perp mode; the defaults are RECOMMENDED's, bit for bit) ----
  armCross: 'gauss3', // gauss3 (a sum of three uniforms: exactly 0 past ±3σ) | normal (an unbounded gaussian, same σ) | sersic (unbounded, n = sersicN, the gaussian's half width)
  // ---- wisps mode only: arms that emerge from a flow-aligned noise field (no centre line, no profile) ----
  wispBias: 1.2, // the large-scale spiral bias's contrast A (peak / trough = 1 + A): gentle, just enough for two arms to read
  wispSharp: 2, // its sharpness s, ((1 + cos Δ)/2)^s
  wispAlong: 0.5, // a wisp's length along the flow, × r
  wispAcross: 0.05, // its width across the flow, × r
  wispAniso: 1, // anisotropy strength: length/width = (along/across)^this at the same mean size (0 round blobs, 1 as set, >1 thinner)
  wispOctaves: 4, // noise octaves (each one half the size and half the weight)
  wispRidge: 0.4, // blend toward ridged noise (1 − |2n − 1|): thin filaments rather than soft streaks
  wispPower: 4, // contrast power p of the threshold-free curve N^p / (N^p + (1 − N)^p): high-density wisps and near-empty gaps
  wispShear: 8, // degrees: the wisps run this far off the arm, turning outward like spurs and feathers
  wispYoung: 2, // the young stars' field is the wisp field to this power (a sharper version of the same field)
  wispOld: 0.25, // the old disc's share of the wisp texture (0: a smooth disc with the bias only)
  wispKnotGap: 0.1, // knots (complexes) keep at least this far apart, × R (findings: every 0.1–0.3 R along an arm)
  laneShape: 'band', // band (a hard band: inside it, laneDepth of the stars are removed) | dip (a smooth gaussian dip, 1 − laneDepth·e^(−x²/2), σ = laneWidth / 2)
  // ---- wisps mode, reviewed (§11): every default below is the original Wisps' behaviour, bit for bit ----
  wispNoise: 'value', // value (a draw per lattice point, blobs at the lattice scale) | gradient (Perlin: a seeded gradient per point, stream bgWispGrad, salt 18; ridges, no blobs)
  wispRidgeFeed: 0, // ridged multifractal: each finer octave's weight × (1 − feed + feed · the coarser octave's value), so detail lives on the ridges (0: plain fbm)
  wispWarp: 0, // domain warp: the flow coordinate u is bent by this much (in u; 1 u = r·sin i across the flow) by a long, smooth noise, so wisps meander instead of following the lattice
  wispWarpAlong: 1.5, // the warp noise's scale along the flow, × r
  wispBiasRise: 0, // the spiral bias's contrast A is (1 − rise) of itself at the centre, rising to A by wispBiasRiseTo·R (S4G: arm contrast rises outward; the inner disc is smooth)
  wispBiasRiseTo: 0.6, // share of R
  wispBranch: 0, // a second spiral bias of amplitude branch·A (each arm forks), coinciding with the arm at wispBranchFrom·R and opening at wispBranchPitch
  wispBranchPitch: 0.4, // the branch's pitch (more open than the arm's, so it runs outside it)
  wispBranchFrom: 0.55, // share of R where the branch leaves the arm
  wispFeather: 0, // feathers: a second wisp field (channel 3) of this weight, added to the wisps on the arm's outer flank, sheared steeply like spurs (La Vigne 2006: ~50°, trailing)
  wispFeatherShear: 45, // degrees from the arm, outward
  wispFeatherAlong: 0.15, // a feather's length, × r
  wispFeatherAcross: 0.015, // its width, × r
  wispFeatherAt: 0.8, // the feathers' window centre across the arm, in bias phase σ (+ the outer, convex side)
  wispFeatherWidth: 0.8, // the window's σ, in bias phase σ
  wispFeatherOctaves: 2, // the feathers' noise octaves (fewer than the wisps': a feather is a simple streak)
  wispLaneAlong: 0, // the dust lane's own noise channel: a filament this long along the flow, × r (0: the lane shares the wisps' noise geometry)
  wispLaneAcross: 0.02, // and this wide, × r
  wispKnotMode: 'densest', // densest (knots on the densest wisps, kept wispKnotGap·R apart) | beads (a seeded walk along each arm: evenly spaced complexes, each put on the densest young wisp near the crest; stream bgBeads, salt 19)
  wispKnotJitter: 0.3, // beads: each gap is the mean gap × U(1 − jitter, 1 + jitter)
  dustWispShare: 0, // share of the arm dust (dustArmShare) that traces the wisps themselves rather than the lane: faint grain along the young filaments
  // ---- the neighbourhood control (shape-notes §12): page-level keys the generator never reads; the 30 HOOD spots stay fixed ----
  hoodLod0: 6, // the far form is whole below this glow size (CSS px, glowPx of a neighbourhood star)
  hoodLod1: 12, // and the real form whole above this; a smooth cross-fade between
  hoodLateLod0: 11, // Dissolve (late): the far form is whole below this glow size (CSS px)
  hoodLateLod1: 16, // and the real form whole above it
  hoodJitter: 8, // Jitter mode: the seeded offset's σ (units), 16 candidates per spot (stream bgHoodJitter, salt 21)
  hoodGap: 14, // Jitter mode: no two spots nearer than this (units; the generated 30 are never nearer than 14.07)
  hoodSnap: 1, // Jitter mode: 0 takes the first candidate (pure jitter), 1 the candidate on the densest background (snaps to a wisp)
};

/**
 * RECOMMENDED with soft arm edges (the author: "a harsh cliff on the outer edges of the elbow"). Every value is
 * RECOMMENDED's except: the cross-arm offset is an unbounded gaussian (gauss3 is exactly 0 past ±3σ); no clearance,
 * so the density keeps its shape instead of being pushed out to a plateau (the neighbourhood's halos still kept), with σ at
 * the rim 9 → 12 so the arm stays as wide as RECOMMENDED's;
 * the dust lane is a smooth dip, not a band.
 */
export const RECOMMENDED_SOFT = {
  ...RECOMMENDED,
  place: 'none',
  armCross: 'normal',
  laneShape: 'dip',
  sigmaRim: 12, // 9 → 12: without the roomiest placement pushing stars to the flanks, the outer bend reads thinner than RECOMMENDED's
};

/**
 * Wisps (the author: "the arm shouldn't be thought of as a shape"): no centre line and no profile. Stars are drawn by
 * rejection from the disc law × a gentle spiral bias (through the neighbourhood, pitch 0.28) × flow-aligned noise: long
 * thin wisps nearly parallel to the arms, a few degrees off them, under a threshold-free contrast curve. Young stars take
 * a sharper power of the same field; knots bead the densest wisps; dust darkens soft streaks on the inner edges.
 */
export const WISPS = {
  ...RECOMMENDED,
  ...SHAPE_DEFAULTS,
  shape: 'wisps',
  place: 'none',
  pitch: 0.28,
  wispBias: 2,
  wispSharp: 2.5,
  wispAlong: 0.45,
  wispAcross: 0.055,
  wispOctaves: 3,
  wispRidge: 0.25,
  wispPower: 8,
  wispShear: 10,
  wispYoung: 3,
  coreShare: 0.15,
  bulgeMode: 'exp',
  bulgeScale: 0.06,
  discScale: 0.32,
  armScale: 1.3,
  discFade: 0.8,
  armStart: 0.16,
  armEnd: 1,
  youngShare: 0.45,
  clumpShare: 0.1,
  clumpCount: 30,
  knotSigma: 0.025,
  clumpBright: 0.5,
  youngBright: 0.8,
  oldDim: 0.5,
  oldContrast: 0.8,
  oldSharp: 2,
  warmCore: 0.97,
  laneDepth: 0.7,
  laneOffset: -1,
  laneWidth: 0.6,
  dustContrast: 1.5,
  dustLaneGain: 2.5,
  dustArmShare: 0.7,
};

/**
 * Wisps (reviewed) (shape-notes §11): the Wisps field with gradient noise on ridges, a meander, two scales (long arm
 * segments from the along-arm modulation, feathers leaving the outer flank at 45°), a bias that rises outward and forks
 * past 0.55 R, beads of knots walked along the arms, a coherent lane filament, a brighter old disc, and arms that fade
 * into a flocculent outer disc.
 */
export const WISPS_REVIEWED = {
  ...WISPS,
  // the noise: gradient (Perlin) on a lightly ridged, feed-weighted fbm, bent by a slow meander
  wispNoise: 'gradient',
  wispOctaves: 4,
  wispRidge: 0.2,
  wispRidgeFeed: 0.5,
  wispAlong: 0.45,
  wispAcross: 0.05,
  wispPower: 8,
  wispShear: 8,
  wispWarp: 0.08,
  wispWarpAlong: 2.5,
  wispYoung: 3,
  wispOld: 0.3,
  // the spiral bias: gentle, rising outward, with long segments and a fork past 0.55 R; the arms dissolve past 0.85 R
  wispBias: 2.5,
  wispSharp: 2.5,
  wispBiasRise: 0.7,
  wispBiasRiseTo: 0.5,
  modDepth: 0.5,
  modPeriod: 0.4,
  wispBranch: 0.5,
  wispBranchPitch: 0.42,
  wispBranchFrom: 0.55,
  armStart: 0.2,
  armEnd: 0.85,
  armEndOut: 1.1,
  discFade: 0.85,
  oldContrast: 1.2,
  // feathers off the outer flank, trailing at 45°
  wispFeather: 0.4,
  wispFeatherShear: 45,
  wispFeatherAlong: 0.22,
  wispFeatherAcross: 0.06,
  wispFeatherAt: 0.9,
  wispFeatherWidth: 0.6,
  wispFeatherOctaves: 1,
  // the dust lane: one coherent filament just inside the crest; the dust peaks there and traces the wisps
  wispLaneAlong: 0.8,
  wispLaneAcross: 0.04,
  laneDepth: 0.6,
  laneOffset: -0.5,
  laneWidth: 0.2,
  dustLaneGain: 5,
  dustArmShare: 0.8,
  dustWispShare: 0.5,
  dustContrast: 1.5,
  dustFloor: 0.12,
  dustRange: 0.2,
  // beads of complexes along the arms, on the young wisps, downstream of the crest
  wispKnotMode: 'beads',
  wispKnotJitter: 0.3,
  clumpOut: 0.4,
  clumpCount: 24,
  clumpShare: 0.12,
  knotSigma: 0.03,
  clumpBright: 0.7,
  // populations: a smaller bulge, an undimmed old disc (half of it between the arms), young stars less boosted
  coreShare: 0.1,
  youngShare: 0.4,
  youngBright: 0.4,
  oldDim: 0,
  oldWarm: 0.5,
};

/**
 * Shape mode A, density wave: arms where elliptical orbits crowd (old stars and dust, uniform orbital phase), young
 * stars bunched toward the crowding phase t*. Disc and arm scale lengths, the bulge, the lane and the along-arm
 * modulation follow armresearch/findings.md (h 0.32 R, arm light 1.3 h, lane dip 0.5, modulation 0.45/0.35).
 */
export const DENSITY_WAVE = {
  ...RECOMMENDED,
  ...SHAPE_DEFAULTS,
  shape: 'wave',
  place: 'none',
  pitch: 0.28,
  armEnd: 1,
  coreShare: 0.15,
  bulgeScale: 0.06,
  discScale: 0.32,
  armScale: 1.3,
  discFade: 0.8,
  waveEIn: 0.03,
  waveEOut: 0.15,
  oldContrast: 0,
  oldDim: 0.25,
  warmCore: 0.97,
  youngShare: 0.5,
  youngContrast: 25,
  youngSharp: 6,
  youngBright: 0.8,
  clumpShare: 0.12,
  clumpCount: 30,
  clumpRadius: 5,
  clumpOut: 0.5,
  laneDepth: 0.5,
  laneOffset: -1.6,
  laneWidth: 1,
  modDepth: 0.45,
  modPeriod: 0.35,
  dustContrast: 3,
  dustSharp: 4,
  dustLane: 1,
};

/** Shape mode B, smooth density field: disc(r) × (1 + A·f(m(θ − θ_arm))), old (A 2, broad) and young (A 25). */
export const SMOOTH_FIELD = {
  ...DENSITY_WAVE,
  shape: 'field',
  oldContrast: 2,
  oldSharp: 2,
};

/**
 * Shape mode C, the research recipe (armresearch/findings.md §7): an Sc like M74 at 2,400 stars, every number as the
 * prototype runs it. Sérsic n 0.6 cross-arm profile with width ∝ r, old/young/knots/spurs, along-arm modulation, a
 * gaussian lane on the concave edge (the dust peaks there), no clearance grid (the neighbourhood's halos still kept).
 */
export const RECIPE_M74 = {
  ...RECOMMENDED,
  ...SHAPE_DEFAULTS,
  shape: 'recipe',
  place: 'none',
  pitch: 0.28,
  arms: 2,
  coreShare: 0.08,
  bulgeMode: 'exp',
  bulgeScale: 0.06,
  bulgeFlat: 0.6,
  coreExclusion: 16,
  discScale: 0.32,
  armScale: 0.42 / 0.32,
  discFade: 0.9,
  discFadeEnd: 1.2,
  armStartIn: 0.07,
  armStart: 0.18,
  armEnd: 0.85,
  armEndOut: 1.05,
  youngShare: 0.26,
  clumpShare: 0.12,
  spurShare: 0.04,
  oldContrast: 1.8,
  youngContrast: 9,
  widthOld: 0.3,
  widthYoung: 0.13,
  sersicN: 0.6,
  youngOffset: 0.12,
  modDepth: 0.45,
  modPeriod: 0.35,
  laneDepth: 0.6,
  laneOffset: -0.45,
  laneWidth: 0.14,
  dustLaneGain: 2.5,
  clumpCount: 26,
  knotSigma: 0.045,
  clumpOut: 0.15,
  clumpBright: 0.45,
  spurCount: 20,
  spurAngle: 50,
  spurLength: 0.16,
  spurWidth: 0.012,
  zOld: 0.12,
  zYoung: 0.04,
  zDust: 0.06,
  warmCore: 0.75,
  oldWarm: 0.2,
  oldDim: 0.25,
  youngBright: 0,
  brightFloor: 0.3,
  brightPow: 2.5,
  brightShare: 0.15,
  dustArmShare: 0.7,
  dustContrast: 1.2,
  dustFloor: 0.08,
  dustRange: 0.14,
};

/** The recipe tuned to read at a glance on a phone (provisional; tuned below). */
export const RECIPE_READABLE = {
  ...RECIPE_M74,
  youngShare: 0.36,
  youngContrast: 30,
  widthYoung: 0.1,
  youngBright: 0.4,
  oldDim: 0.45,
};

/** RECIPE_READABLE with the star colour model: blackbody tints by population, restrained (see STAR_COLOUR_VARIETY). */
export const STAR_COLOUR_VARIETY = 0.8;
export const RECIPE_READABLE_COLOUR = { ...RECIPE_READABLE, starColour: STAR_COLOUR_VARIETY };
/** The density wave with the same colour model. */
export const DENSITY_WAVE_COLOUR = { ...DENSITY_WAVE, starColour: STAR_COLOUR_VARIETY };

// ---- star colour: temperature per population → blackbody sRGB → the essay's palette guards ----
/**
 * Effective-temperature mixtures (spectral class shares, Teff ranges after Pecaut & Mamajek 2013's dwarf scale) of the
 * stars a mote stands for. Young arm stars and knots: mostly B/A, with a red-supergiant sprinkle (blue/red supergiant
 * ratio ≈ 3 at solar metallicity, Eggenberger, Meynet & Maeder 2002, diluted by the equally bright main-sequence B/A
 * stars). Old disc: G/K giants and dwarfs with an F/A/B sprinkle (blue stragglers, young field stars); the bulge redder.
 */
export const TEMP_CLASSES = { B: [10000, 30000], A: [7300, 10000], F: [6000, 7300], G: [5300, 6000], K: [3900, 5300], M: [3000, 3900] };
export const TEMP_MIX = {
  young: { B: 0.48, A: 0.26, F: 0.08, G: 0.05, K: 0.09, M: 0.04 },
  old: { B: 0.02, A: 0.04, F: 0.1, G: 0.3, K: 0.46, M: 0.08 },
  bulge: { B: 0.005, A: 0.015, F: 0.06, G: 0.25, K: 0.58, M: 0.09 },
};
const TEMP_MEDIAN = { young: 11000, old: 5200, bulge: 4800 };
/** A temperature for a population from its own stream (class, then log-uniform within the class), spread about the median. */
export function drawTemperature(rng, popName, spread) {
  const mix = TEMP_MIX[popName];
  let u = rng(), cls = 'K';
  for (const [k, w] of Object.entries(mix)) { if (u < w) { cls = k; break; } u -= w; }
  const [lo, hi] = TEMP_CLASSES[cls];
  const logT = Math.log(lo) + (Math.log(hi) - Math.log(lo)) * rng();
  const med = Math.log(TEMP_MEDIAN[popName]);
  return Math.exp(med + spread * (logT - med));
}
/** Blackbody colour in sRGB 0..1: Tanner Helland's fit to Mitchell Charity's CIE blackbody table (white near 6,600 K). */
export function blackbodySRGB(T) {
  const t = Math.min(40000, Math.max(1000, T)) / 100;
  const c = (v) => Math.min(255, Math.max(0, v)) / 255;
  const r = t <= 66 ? 255 : 329.698727446 * (t - 60) ** -0.1332047592;
  const g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * (t - 60) ** -0.0755148492;
  const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  return [c(r), c(g), c(b)];
}
/** The warm cap (the stars' existing amber end, #FFD9A0): no star is redder or more saturated. */
export const WARM_CAP = [1, 217 / 255, 160 / 255];
/** The cool cap: a pale blue-white, saturation at most this (the agents' #4DA3FF is 0.70; the frozen planet's cyan 0.88). */
export const COOL_SAT_CAP = 0.3;
/**
 * The palette guards. Scale the deviation from white by `variety`, then: a warm colour is put on the white → #FFD9A0 ray
 * (its hue becomes the cap's amber, never the blackbody's orange or red; its saturation at most the cap's); a cool colour
 * keeps its blackbody hue but its saturation is capped at COOL_SAT_CAP. No other hue can occur (no H-alpha pink).
 */
export function guardTint([r, g, b], variety) {
  const v = [1 + variety * (r - 1), 1 + variety * (g - 1), 1 + variety * (b - 1)].map((x) => Math.min(1, Math.max(0, x)));
  if (v[0] >= v[2]) {
    const s = v[0] > 0 ? 1 - v[2] / v[0] : 0; // HSV saturation with R the largest channel
    const t = Math.min(1, s / (1 - WARM_CAP[2]));
    return WARM_CAP.map((c) => 1 + t * (c - 1));
  }
  const s = 1 - v[0] / v[2];
  const k = s > COOL_SAT_CAP ? COOL_SAT_CAP / s : 1;
  return v.map((c) => 1 + k * (c - 1));
}

/** Wave mode: the sign that makes the orbital phase from the crest read like the field's Δ (negative inner). */
const WAVE_SIGN = -1;
const gauss3 = (rng) => (rng() + rng() + rng() - 1.5) * 2;

/**
 * Generate the background for parameters `P`. Returns float32 arrays of xyz + brightness (negative
 * when warm) for the dim stars, the bright stars and the dust; and the knots for inspection.
 */
export function generateBackground(P) {
  const seed = P.seed | 0;
  const tier = P.tier;
  const R = P.radius;
  const nStars = Math.max(0, Math.round(P.stars));
  const nDust = Math.max(0, Math.round(P.dust));
  const nCore = Math.round(P.coreShare * nStars);
  const ppu = galaxyWideView(...TIER_SCREEN[tier]).pxPerUnit;
  const gap = (pxA, pxB) => (Math.max(pxA, pxB) / ppu) * HALO_MARGIN;
  const hood = P.hood ? HOOD : [];
  const armPhase = armPhaseFor(65, 0.9, P.pitch);
  const extended = P.discShare > 0 || P.clumpShare > 0 || P.armEnd < 1;
  const perp = P.armMode === 'perp';
  const shape = P.shape ?? 'arms';
  const fieldy = shape === 'wave' || shape === 'field';
  const recipe = shape === 'recipe';
  const wisps = shape === 'wisps';
  const placeMode = P.place ?? 'roomiest';

  // Populations (recommended modes only; today never draws from this stream): 0 arm, 1 disc, 2 knot.
  const pop = new Uint8Array(nStars);
  if (fieldy) {
    // Shape modes: 2 knot, 3 young, 4 old (the core stays the bulge).
    for (let i = nCore; i < nStars; i++) {
      const u = streamFor(seed, 'bgPop', i)();
      pop[i] = u < P.clumpShare ? 2 : u < P.clumpShare + P.youngShare ? 3 : 4;
    }
  } else if (recipe) {
    // Recipe: populations by index range (exact counts): bulge (the core), old 4, young 3, knot 2, spur 5.
    const nYoung = Math.round(P.youngShare * nStars), nKnot = Math.round(P.clumpShare * nStars), nSpur = Math.round(P.spurShare * nStars);
    const nOld = Math.max(0, nStars - nCore - nYoung - nKnot - nSpur);
    for (let i = nCore; i < nStars; i++) pop[i] = i < nCore + nOld ? 4 : i < nCore + nOld + nYoung ? 3 : i < nCore + nOld + nYoung + nKnot ? 2 : 5;
  } else if (wisps) {
    // Wisps: populations by index range (exact counts): bulge (the core), old 4, young 3, knot 2.
    const nYoung = Math.round(P.youngShare * nStars), nKnot = Math.round(P.clumpShare * nStars);
    const nOld = Math.max(0, nStars - nCore - nYoung - nKnot);
    for (let i = nCore; i < nStars; i++) pop[i] = i < nCore + nOld ? 4 : i < nCore + nOld + nYoung ? 3 : 2;
  } else if (extended) {
    for (let i = nCore; i < nStars; i++) {
      const u = streamFor(seed, 'bgPop', i)();
      pop[i] = u < P.clumpShare ? 2 : u < P.clumpShare + P.discShare ? 1 : 0;
    }
  }

  // Brightness first: the brightest `brightShare` are the bright set, with the larger sprite.
  const rngs = Array.from({ length: nStars }, (_, i) => streamFor(seed, 'bgStars', i));
  const level = rngs.map((rng, i) => {
    const u = rng();
    let brightness = P.brightFloor + (1 - P.brightFloor) * u ** P.brightPow;
    if (recipe) {
      // Recipe brightness by population (findings §7); youngBright brightens young and knots further (0 in the recipe).
      if (i < nCore) brightness *= 0.9;
      else if (pop[i] === 4) brightness *= 1 - P.oldDim;
      else if (pop[i] === 3) brightness = Math.min(1, (0.45 + 0.55 * u * u) * (1 + P.youngBright));
      else if (pop[i] === 2) brightness = Math.min(1, (0.45 + 0.55 * u * u) * (1 + P.clumpBright) * (1 + P.youngBright));
      else brightness = 0.4 + 0.5 * u * u;
    } else {
      if (pop[i] === 2) brightness = Math.min(1, brightness * (1 + P.clumpBright));
      if (pop[i] === 3) brightness = Math.min(1, brightness * (1 + P.youngBright));
      if ((fieldy || wisps) && pop[i] !== 2 && pop[i] !== 3) brightness *= 1 - P.oldDim;
    }
    const warmU = rng();
    return { brightness, warmU, warm: warmU < P.warmShare };
  });
  const nBright = Math.round(P.brightShare * nStars);
  const rank = level.map((_, i) => i).sort((a, b) => level[b].brightness - level[a].brightness || a - b);
  const isBright = new Uint8Array(nStars);
  for (let k = 0; k < nBright; k++) isBright[rank[k]] = 1;

  // Halo clearance grid (today's placement rule, kept for every mode).
  const glows = hood.map((s) => hoodGlowPx(tier, s));
  const cell = gap(P.haloBright, Math.max(P.haloBright, ...glows));
  const grid = new Map();
  const cellKey = (x, z) => (Math.floor(x / cell) + 4096) * 8192 + (Math.floor(z / cell) + 4096);
  const settle = (p, px, i = -1) => {
    const key = cellKey(p[0], p[2]);
    const list = grid.get(key);
    if (list) list.push([p[0], p[2], px, i]);
    else grid.set(key, [[p[0], p[2], px, i]]);
  };
  const room = (p, px) => {
    const ci = Math.floor(p[0] / cell);
    const ck = Math.floor(p[2] / cell);
    let least = Infinity;
    for (let di = -1; di <= 1; di++) {
      for (let dk = -1; dk <= 1; dk++) {
        for (const [x, z, opx] of grid.get((ci + di + 4096) * 8192 + (ck + dk + 4096)) ?? []) {
          least = Math.min(least, Math.hypot(p[0] - x, p[2] - z) / gap(px, opx));
        }
      }
    }
    return least;
  };
  /**
   * The halo-touch measure, after placement: the share of stars (bright ones, and all) whose nearest neighbour,
   * a background star or a neighbourhood star, is nearer than their halos' clearance (room < 1, the rule above).
   */
  const haloTouch = (stars, isBright) => {
    let bright = 0, all = 0;
    stars.forEach((p, i) => {
      const px = isBright[i] ? P.haloBright : P.haloStar;
      const ci = Math.floor(p[0] / cell), ck = Math.floor(p[2] / cell);
      let touches = hood.some((s, k) => Math.hypot(p[0] - s[0], p[2] - s[1]) < gap(px, glows[k]));
      for (let di = -1; di <= 1 && !touches; di++)
        for (let dk = -1; dk <= 1 && !touches; dk++)
          for (const [x, z, opx, j] of grid.get((ci + di + 4096) * 8192 + (ck + dk + 4096)) ?? [])
            if (j !== i && Math.hypot(p[0] - x, p[2] - z) < gap(px, opx)) { touches = true; break; }
      if (touches) { all++; if (isBright[i]) bright++; }
    });
    const nB = isBright.reduce((s, v) => s + v, 0);
    return { bright: nB ? bright / nB : 0, all: stars.length ? all / stars.length : 0 };
  };
  const nearHood = (p, px) => hood.some((s, k) => Math.hypot(p[0] - s[0], p[2] - s[1]) < gap(px, glows[k]));

  // Today's core rings.
  const coreU0 = (P.coreExclusion / (P.coreAt * R)) ** (1 / P.starExp) * (1 + 1e-9);
  const rings = Math.ceil(nCore / CORE_RING);
  const ringTurn = Array.from({ length: rings }, (_, q) => 2 * Math.PI * streamFor(seed, 'bgRingTurn', q)());
  const slot = new Int32Array(nCore);
  for (let q = 0; q < rings; q++) {
    const lo = q * CORE_RING;
    const n = Math.min(CORE_RING, nCore - lo);
    const order = Array.from({ length: n }, (_, j) => j);
    const prng = streamFor(seed, 'bgRingSlots', q);
    for (let j = n - 1; j > 0; j--) {
      const k = Math.floor(prng() * (j + 1));
      [order[j], order[k]] = [order[k], order[j]];
    }
    order.forEach((o, j) => (slot[lo + j] = o));
  }

  const at = (r, th, yMax, rng) => [Math.fround(r * Math.cos(th)), Math.fround(yMax * (rng() + rng() - 1)), Math.fround(r * Math.sin(th))];
  const scatterAt = (scatter, r) => scatter * (1 - ((1 - P.scatterRim) * r) / R);
  const sigmaAt = (r) => P.sigmaCore + ((P.sigmaRim - P.sigmaCore) * r) / R;
  /** A radius by the stars' radial law (today's power law, or an exponential disc of scale discScale·R, clamped to R). */
  const drawR = (rng) => {
    if (P.radialLaw !== 'exp') return R * rng() ** P.starExp;
    for (let t = 0; t < 32; t++) {
      const r = -P.discScale * R * Math.log(Math.max(1e-12, rng() * rng()));
      if (r <= R) return r;
    }
    return R * rng();
  };
  /** The point on arm `arm` at radius r, moved `d` units along the arm's outward normal (perp mode). */
  const onArm = (r, arm, d) => {
    const th = armAngleAt(Math.max(r, 1e-9), P.pitch, armPhase, arm, P.arms);
    const c = Math.cos(th), s = Math.sin(th);
    // tangent of the log spiral r(θ): d/dr [r cos θ, r sin θ] with dθ/dr = 1/(pitch r)
    let tx = c - s / P.pitch, tz = s + c / P.pitch;
    const tl = Math.hypot(tx, tz);
    tx /= tl; tz /= tl;
    let nx = -tz, nz = tx;
    if (nx * c + nz * s < 0) { nx = -nx; nz = -nz; } // outward
    return [r * c + nx * d, r * s + nz * d];
  };
  /** Whether a cross-arm offset `d` (in σ) falls in the dust lane and is swallowed by it. */
  const inLane = (dSigma, rng) => P.laneDepth > 0 && Math.abs(dSigma - P.laneOffset) < P.laneWidth / 2 && rng() < P.laneDepth;
  /** laneShape 'dip': the lane as a smooth multiplicative dip (the shape modes' gaussian), not a band. */
  const inLaneDip = (dSigma, rng) => P.laneDepth > 0 && rng() < P.laneDepth * Math.exp(-0.5 * ((dSigma - P.laneOffset) / Math.max(1e-3, 0.5 * P.laneWidth)) ** 2);
  const swallowed = P.laneShape === 'dip' ? inLaneDip : inLane;

  // ---- shape modes: a continuous density, sampled by rejection, with no hard bound anywhere ----
  /** An unbounded standard normal (Box–Muller). */
  const gaussN = (rng) => Math.sqrt(-2 * Math.log(Math.max(1e-12, rng()))) * Math.cos(2 * Math.PI * rng());
  /** A Gamma(a, 1) draw (Marsaglia & Tsang; a < 1 boosted by U^(1/a)), from the star's own stream. */
  const gammaDraw = (rng, a) => {
    const b = a < 1 ? a + 1 : a, dd = b - 1 / 3, cc = 1 / Math.sqrt(9 * dd);
    let g = dd;
    for (let k = 0; k < 64; k++) {
      const x = gaussN(rng), v = (1 + cc * x) ** 3;
      if (v <= 0) continue;
      if (Math.log(Math.max(1e-300, rng())) < 0.5 * x * x + dd - dd * v + dd * Math.log(v)) { g = dd * v; break; }
    }
    return a < 1 ? g * Math.max(1e-300, rng()) ** (1 / a) : g;
  };
  /**
   * armCross 'sersic': a signed offset (in σ) with density exp(−ln2·(|x|/w)^(1/n)), w the gaussian's half width at half
   * maximum (√(2 ln 2) σ), so the crest is as wide as the gaussian's and only the flanks differ: |x|/w = (G/ln2)^n, G ~ Gamma(n).
   */
  const sersicUnit = (rng) => {
    const n = Math.max(0.2, P.sersicN);
    const x = Math.sqrt(2 * Math.LN2) * (gammaDraw(rng, n) / Math.LN2) ** n;
    return rng() < 0.5 ? -x : x;
  };
  /** The perp mode's cross-arm draw (in σ). */
  const crossDraw = P.armCross === 'normal' ? gaussN : P.armCross === 'sersic' ? sersicUnit : gauss3;
  const smooth = (e0, e1, x) => {
    const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
    return t * t * (3 - 2 * t);
  };
  /** The arm profile across the arm, in phase Δ (0 on the crest, ±π midway between arms): smooth and periodic. */
  const armProfile = (delta, sharp) => ((1 + Math.cos(delta)) / 2) ** sharp;
  /** The arms fade in past the bulge and, when armEnd < 1, out toward the rim. */
  const armRamp = (r) =>
    smooth((P.armStartIn || 0.5 * P.armStart) * R, P.armStart * R, r) * (P.armEnd < 1 ? 1 - smooth(P.armEnd * R, P.armEndOut * R, r) : 1);
  /** The young profile's σ in phase (((1 + cos Δ)/2)^s ≈ e^(−sΔ²/4)): the unit of the lane's and the knots' offsets. */
  const phaseSigma = Math.sqrt(2 / Math.max(0.25, P.youngSharp));
  /** The dust lane: a smooth multiplicative dip on the arm's inner edge (laneOffset < 0), not a cut. */
  const laneDip = (delta) =>
    P.laneDepth > 0 ? 1 - P.laneDepth * Math.exp(-0.5 * (wrap(delta - P.laneOffset * phaseSigma) / Math.max(1e-3, 0.5 * P.laneWidth * phaseSigma)) ** 2) : 1;
  /** A disc radius: an exponential disc (scale discScale·R) that fades smoothly to nothing at the rim. */
  const discR = (rng, scale = P.discScale) => {
    for (let t = 0; t < 64; t++) {
      const r = -scale * R * Math.log(Math.max(1e-12, rng() * rng()));
      if (r <= P.discFadeEnd * R && rng() < 1 - smooth(P.discFade * R, P.discFadeEnd * R, r)) return r;
    }
    return R * rng();
  };
  // Field mode: ρ(r, θ) = disc(r) · (1 + A·ramp(r)·f(Δ)), Δ = −m(θ − θ_arm(r)) wrapped (Δ < 0 is the inner edge).
  const fieldDelta = (r, th) => -wrap(P.arms * (th - armAngleAt(Math.max(r, 1e-9), P.pitch, armPhase, 0, P.arms)));
  // Wave mode: every star on an ellipse of semi-major a, axis ratio q(a) = 1 − e(a), its major axis turned by
  // φ(a) = ln(a/2)/pitch + ψ; at phase t it sits at Rot(φ)·(a cos t, q a sin t). Where neighbouring orbits crowd,
  // the arms are: the area element is a·[q cos²t + (q + a q′) sin²t] + (1 − q²)(a/pitch) sin t cos t, least at t*.
  const waveE = (a) => P.waveEIn + (P.waveEOut - P.waveEIn) * Math.min(1, a / R);
  const waveCrest = (a) => {
    const q = 1 - waveE(a);
    const dq = a < R ? -(P.waveEOut - P.waveEIn) / R : 0;
    return 0.5 * Math.atan2(-(1 - q * q) / P.pitch, -(q - (q + a * dq)));
  };
  const wavePos = (a, t, psi) => {
    const q = 1 - waveE(a);
    const ex = a * Math.cos(t), ez = q * a * Math.sin(t);
    const ph = Math.log(Math.max(a, 1e-9) / 2) / P.pitch + psi;
    const c = Math.cos(ph), s = Math.sin(ph);
    return [ex * c - ez * s, ex * s + ez * c];
  };
  // ψ puts the crest through the neighbourhood's middle (radius 65, bearing 0.9), as armPhase does for the arms.
  let wavePsi = 0;
  if (shape === 'wave') {
    let a = 65;
    for (let k = 0; k < 30; k++) a *= 65 / Math.hypot(...wavePos(a, waveCrest(a), 0));
    const c0 = wavePos(a, waveCrest(a), 0);
    wavePsi = wrap(0.9 - Math.atan2(c0[1], c0[0]));
  }
  /** Phase from the crest of orbit a at t, signed like the field's (Δ < 0 the inner edge): two crests per orbit. */
  const waveDelta = (a, t) => WAVE_SIGN * wrap(2 * (t - waveCrest(a)));
  /**
   * Along-arm amplitude modulation (findings §7): seeded value noise in u = ln r / modPeriod, one 64-entry table per
   * arm (stream bgArmMod, key = arm), smoothstep-interpolated; 1 ± modDepth. Real arms have segments and dips.
   */
  const mArms = shape === 'wave' ? 2 : P.arms;
  const modTable = P.modDepth > 0 ? Array.from({ length: mArms }, (_, arm) => { const rng = streamFor(seed, 'bgArmMod', arm); return Array.from({ length: 64 }, () => rng()); }) : [];
  const armDipAt = (r, arm) => {
    if (!(P.modDepth > 0)) return 1;
    const u = Math.log(Math.max(r, 1)) / P.modPeriod + 8;
    const k = Math.floor(u), t = u - k, tab = modTable[arm];
    const v = tab[((k % 64) + 64) % 64] + (tab[(((k + 1) % 64) + 64) % 64] - tab[((k % 64) + 64) % 64]) * (t * t * (3 - 2 * t));
    return 1 - P.modDepth + P.modDepth * 2 * v;
  };
  /** Which arm a point belongs to: the nearest crest. */
  const fieldArm = (r, th) => (((Math.round((wrap(th - armAngleAt(Math.max(r, 1e-9), P.pitch, armPhase, 0, P.arms)) * P.arms) / (2 * Math.PI)) % P.arms) + P.arms) % P.arms);
  const waveArm = (a, t) => (Math.abs(wrap(t - waveCrest(a))) < Math.PI / 2 ? 0 : 1);
  /**
   * A point (x, z) of a population — 'old', 'young' or 'dust' — with contrast A and sharpness `sharp`. Young ones
   * keep off the bulge and take the longer arm scale length; dust peaks `dustLane` of the way into the lane.
   */
  const shapePoint = (rng, A, sharp, kind) => {
    const young = kind === 'young';
    const shift = kind === 'dust' ? P.dustLane * P.laneOffset * phaseSigma : 0;
    for (let k = 0; k < 400; k++) {
      const r = discR(rng, young ? P.discScale * P.armScale : P.discScale);
      const t = 2 * Math.PI * rng() - Math.PI;
      const delta = shape === 'wave' ? waveDelta(r, t) : fieldDelta(r, t);
      const ramp = armRamp(r) * armDipAt(r, shape === 'wave' ? waveArm(r, t) : fieldArm(r, t));
      let w = (1 + A * ramp * armProfile(wrap(delta - shift), sharp)) / (1 + A);
      if (young) w *= armRamp(r);
      if (kind !== 'dust') w *= laneDip(delta);
      if (rng() < w) return shape === 'wave' ? wavePos(r, t, wavePsi) : [r * Math.cos(t), r * Math.sin(t)];
    }
    return null;
  };

  // ---- recipe mode (armresearch/findings.md §7, ported from proto.html) ----
  const sinI = Math.sin(Math.atan(P.pitch)), cosI = Math.cos(Math.atan(P.pitch));
  /** Signed perpendicular distance from the nearest arm's old crest (negative: the inner, concave side). */
  const rcPerp = (r, th) => -(wrap(P.arms * (th - armAngleAt(Math.max(r, 1e-9), P.pitch, armPhase, 0, P.arms))) / P.arms) * r * sinI;
  const rcWOld = (r) => 0.5 * P.widthOld * r * cosI; // half width at half max
  const rcWYoung = (r) => 0.5 * P.widthYoung * r * cosI;
  const sersic = (d, w) => Math.exp(-Math.LN2 * Math.pow(Math.abs(d) / Math.max(w, 1e-9), 1 / P.sersicN));
  const rcLaneG = (d, w) => Math.exp(-0.5 * ((d - P.laneOffset * w) / Math.max(1e-9, P.laneWidth * w)) ** 2);
  const rcTaper = (r) => (1 - smooth(P.discFade * R, P.discFadeEnd * R, r)) * smooth(0.75 * P.coreExclusion, 1.25 * P.coreExclusion, r);
  const rcR = (rng, scale) => -scale * R * Math.log(Math.max(1e-12, rng() * rng())); // 2-D exponential disc, unclamped
  const rcArmR = (rng) => {
    let r = P.armStart * R;
    for (let t = 0; t < 1000; t++) {
      r = rcR(rng, P.discScale * P.armScale);
      if (r >= P.armStart * R && r <= Math.min(P.armEnd, 1) * R) break;
    }
    return r;
  };
  // ---- wisps mode: a density field with no centre line; the arms are where the flow-aligned wisps crowd ----
  // Log-polar flow coordinates: u = ln r / pitch − θ is constant along a log spiral of the arms' pitch, v = ln r runs
  // along it. A step of 1 in u is r·sin i across the flow and 1 in v is r / sin i along it, so features grow with r.
  // The noise is seeded value noise on a lattice (stream bgWisps, salt 17, one draw per lattice point), periodic in u.
  const wLat = new Map();
  const wSize = Math.sqrt(Math.max(1e-4, P.wispAlong) * Math.max(1e-4, P.wispAcross));
  const wRatio = (Math.max(1e-4, P.wispAlong) / Math.max(1e-4, P.wispAcross)) ** P.wispAniso;
  const wCellsU = Math.max(1, Math.min(511, Math.round((2 * Math.PI * sinI) / (wSize / Math.sqrt(wRatio)))));
  const wCellV = Math.max(0.01, wSize * Math.sqrt(wRatio) * sinI);
  const wShear = Math.tan(((P.wispShear ?? 0) * Math.PI) / 180) / (sinI * sinI);
  const wOct = Math.max(1, Math.min(6, Math.round(P.wispOctaves ?? 1)));
  /**
   * A noise channel's lattice geometry for features `along`·r long and `across`·r wide, lying `shearDeg` off the arm:
   * cells in u around 2π (periodic), the cell height in v, and the shear in u per unit v. (The main channel above keeps
   * its own, older formula, which ignores cos(shear) at 10°.)
   */
  const chanGeom = (along, across, shearDeg) => {
    const cs = Math.max(0.2, Math.cos((shearDeg * Math.PI) / 180));
    return {
      nu: Math.max(1, Math.min(511, Math.round((2 * Math.PI * sinI * cs) / Math.max(1e-4, across)))),
      cv: Math.max(0.01, Math.max(1e-4, along) * sinI * cs),
      sh: Math.tan((shearDeg * Math.PI) / 180) / (sinI * sinI),
    };
  };
  const latVal = (ch, o, iu, iv) => {
    const key = (((ch * 16 + o) * 4096 + iu) * 8192 + (iv & 8191)) >>> 0;
    let v = wLat.get(key);
    if (v === undefined) {
      v = streamFor(seed, 'bgWisps', key)();
      wLat.set(key, v);
    }
    return v;
  };
  // Gradient noise: a seeded unit gradient per lattice point (stream bgWispGrad, salt 18), cached as its angle.
  const wGrad = new Map();
  const gradVal = (ch, o, iu, iv) => {
    const key = (((ch * 16 + o) * 4096 + iu) * 8192 + (iv & 8191)) >>> 0;
    let a = wGrad.get(key);
    if (a === undefined) {
      a = 2 * Math.PI * streamFor(seed, 'bgWispGrad', key)();
      wGrad.set(key, a);
    }
    return a;
  };
  const fade = (t) => t * t * t * (t * (6 * t - 15) + 10);
  const wGradient = P.wispNoise === 'gradient';
  const wFeed = Math.max(0, Math.min(1, P.wispRidgeFeed ?? 0));
  /**
   * Flow-aligned fbm in [0, 1] on channel ch at flow coordinates (U, v), lattice `nu` cells around in u and `cv` in v
   * per octave 0. Value noise (one draw per point) or gradient noise (Perlin, squashed smoothly to [0, 1]); each octave
   * half the size and half the weight, further × (1 − feed + feed · the coarser octave's value) (ridged multifractal).
   */
  const fbm = (ch, U, v, nu0, cv, oct) => {
    const uu = (((U / (2 * Math.PI)) % 1) + 1) % 1;
    let sum = 0, norm = 0, amp = 1, prev = 1;
    for (let o = 0; o < oct; o++) {
      const nu = nu0 << o;
      const x = uu * nu, y = (v / cv) * (1 << o);
      const ix = Math.floor(x), iy = Math.floor(y), fx = fade(x - ix), fy = fade(y - iy);
      const x0 = ix % nu, x1 = (ix + 1) % nu;
      let n;
      if (wGradient) {
        const dx = x - ix, dy = y - iy;
        const g = (iu, iv, px, py) => { const a = gradVal(ch, o, iu, iv); return Math.cos(a) * px + Math.sin(a) * py; };
        const a = g(x0, iy, dx, dy), b = g(x1, iy, dx - 1, dy), c = g(x0, iy + 1, dx, dy - 1), d = g(x1, iy + 1, dx - 1, dy - 1);
        const p = a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy; // in about ±0.7
        n = 0.5 + 0.5 * Math.tanh(2.2 * p); // smooth squash to [0, 1], no clip
      } else {
        const a = latVal(ch, o, x0, iy), b = latVal(ch, o, x1, iy), c = latVal(ch, o, x0, iy + 1), d = latVal(ch, o, x1, iy + 1);
        n = a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
      }
      n = (1 - P.wispRidge) * n + P.wispRidge * (1 - Math.abs(2 * n - 1));
      const w = amp * (1 - wFeed + wFeed * prev);
      sum += w * n;
      norm += w;
      prev = n;
      amp *= 0.5;
    }
    return sum / norm;
  };
  // Domain warp (channel 2): one smooth octave of long value noise bends u, so the wisps meander off the lattice.
  const wWarp = P.wispWarp ?? 0;
  const warpGeom = chanGeom(P.wispWarpAlong ?? 1.5, 6 * Math.max(1e-4, P.wispAcross), 0);
  const warpAt = (v, th) => (wWarp ? wWarp * (2 * fbm(2, v / P.pitch - th, v, warpGeom.nu, warpGeom.cv, 1) - 1) : 0);
  /** The stars' wisps (channel 0) in [0, 1] at (r, θ). */
  const wispNoise0 = (r, th) => {
    const v = Math.log(Math.max(r, 1));
    return fbm(0, v / P.pitch - th - wShear * v + warpAt(v, th), v, wCellsU, wCellV, wOct);
  };
  /** The dust lane's filament (channel 1): its own long, thin, unsheared lattice when wispLaneAlong > 0, else the wisps' geometry. */
  const laneGeom = P.wispLaneAlong > 0 ? chanGeom(P.wispLaneAlong, P.wispLaneAcross, 0) : null;
  const wispNoise1 = (r, th) => {
    const v = Math.log(Math.max(r, 1));
    return laneGeom
      ? fbm(1, v / P.pitch - th + warpAt(v, th), v, laneGeom.nu, laneGeom.cv, wOct)
      : fbm(1, v / P.pitch - th - wShear * v + warpAt(v, th), v, wCellsU, wCellV, wOct);
  };
  /** The threshold-free contrast curve: smooth, 0.5 at 0.5, steeper with p; dense wisps and near-empty gaps, no edge. */
  const wispCurve = (n) => {
    const a = n ** P.wispPower, b = (1 - n) ** P.wispPower;
    return a / Math.max(1e-12, a + b);
  };
  /** The spiral bias σ in phase (((1 + cos Δ)/2)^s ≈ e^(−sΔ²/4)): the unit of the lane's, the knots' and the feathers' offsets. */
  const wispPhaseSigma = Math.sqrt(2 / Math.max(0.25, P.wispSharp ?? 2));
  // Feathers (channel 3): short, thin wisps sheared steeply off the arm, windowed onto its outer flank.
  const wFeather = P.wispFeather ?? 0;
  const featherGeom = chanGeom(P.wispFeatherAlong ?? 0.15, P.wispFeatherAcross ?? 0.015, P.wispFeatherShear ?? 45);
  const featherAt = (r, th) => {
    if (!wFeather) return 0;
    const v = Math.log(Math.max(r, 1));
    const win = Math.exp(-0.5 * (wrap(fieldDelta(r, th) - P.wispFeatherAt * wispPhaseSigma) / Math.max(1e-3, P.wispFeatherWidth * wispPhaseSigma)) ** 2);
    return win * wispCurve(fbm(3, v / P.pitch - th - featherGeom.sh * v + warpAt(v, th), v, featherGeom.nu, featherGeom.cv, Math.max(1, Math.min(6, Math.round(P.wispFeatherOctaves ?? 2)))));
  };
  /** The wisp field: the wisps' contrast curve, plus the feathers at their weight (0: the wisps alone). */
  const wispField = (r, th) => (wFeather ? (wispCurve(wispNoise0(r, th)) + wFeather * featherAt(r, th)) / (1 + wFeather) : wispCurve(wispNoise0(r, th)));
  // The spiral bias, with (when set) the contrast rising outward, the along-arm modulation (bgArmMod) and the branch.
  const wRise = P.wispBiasRise ?? 0, wBranch = P.wispBranch ?? 0;
  const biasPlain = !(wRise > 0 || wBranch > 0 || P.modDepth > 0);
  const branchR0 = (P.wispBranchFrom ?? 0.55) * R;
  const branchDelta = (r, th) => {
    // The branch's crest: the arm's angle at branchR0, then a log spiral of the branch's pitch.
    const thB = armAngleAt(branchR0, P.pitch, armPhase, 0, P.arms) + Math.log(Math.max(r, 1e-9) / branchR0) / Math.max(0.05, P.wispBranchPitch);
    return -wrap(P.arms * (th - thB));
  };
  const branchWin = (r) => smooth(branchR0, R, r) * (P.armEnd < 1 ? 1 - smooth(P.armEnd * R, P.armEndOut * R, r) : 1);
  const wispBiasAt = (r, th, A, s) => {
    if (biasPlain) return (1 + A * armRamp(r) * armProfile(fieldDelta(r, th), s)) / (1 + A);
    const Ar = A * (1 - wRise * (1 - smooth(0, (P.wispBiasRiseTo ?? 0.6) * R, r)));
    const main = Ar * armRamp(r) * armDipAt(r, fieldArm(r, th)) * armProfile(fieldDelta(r, th), s);
    const branch = wBranch > 0 ? wBranch * A * branchWin(r) * armProfile(branchDelta(r, th), s) : 0;
    return (1 + main + branch) / (1 + A * (1 + wBranch));
  };
  /** The dark streaks: the dust channel's wisps, weighted toward the arms' inner (concave) edge. */
  const wispStreak = (r, th) => {
    if (!(P.laneDepth > 0)) return 0;
    const g = Math.exp(-0.5 * (wrap(fieldDelta(r, th) - P.laneOffset * wispPhaseSigma) / Math.max(1e-3, P.laneWidth * wispPhaseSigma)) ** 2);
    return g * armRamp(r) * wispCurve(wispNoise1(r, th));
  };
  const wispYoungW = (r, th) => (wispBiasAt(r, th, P.wispBias, P.wispSharp) * wispField(r, th)) ** P.wispYoung * armRamp(r);
  const wispOldW = (r, th) => wispBiasAt(r, th, P.oldContrast, P.oldSharp) * (1 - P.wispOld + P.wispOld * wispField(r, th));
  // A probe for the offline field plots (no preset sets it): the wisps fields, before any star is drawn.
  if (wisps && typeof P.__probe === 'function') P.__probe({ wispYoungW, wispOldW, wispStreak, featherAt, wispBiasAt, wispField, wispNoise0, wispNoise1, armRamp, fieldDelta });

  const spurs = [];
  if (recipe) {
    for (let k = 0; k < Math.round(P.spurCount); k++) {
      const rng = streamFor(seed, 'bgSpurs', k);
      const r = rcArmR(rng);
      const arm = k % P.arms;
      const w = rcWOld(r);
      const th0 = armAngleAt(r, P.pitch, armPhase, arm, P.arms) - ((P.youngOffset + 0.6) * w) / (r * sinI); // the young arm's outer flank
      const c = Math.cos(th0), s = Math.sin(th0);
      let tx = c - s / P.pitch, tz = s + c / P.pitch;
      const tl = Math.hypot(tx, tz);
      tx /= tl; tz /= tl;
      let nx = -tz, nz = tx;
      if (nx * c + nz * s < 0) { nx = -nx; nz = -nz; }
      const a = (P.spurAngle * Math.PI) / 180;
      spurs.push({ x: r * c, z: r * s, dx: tx * Math.cos(a) + nx * Math.sin(a), dz: tz * Math.cos(a) + nz * Math.sin(a), len: P.spurLength * r * (0.6 + 0.8 * rng()), width: P.spurWidth * r });
    }
  }

  // Knots: their centres along the arms (recommended mode only).
  const knots = [];
  if (P.clumpShare > 0 && recipe) {
    // Recipe: on the young crest, clumpOut old half-widths further out; members spread knotSigma·r.
    for (let k = 0; k < Math.max(1, Math.round(P.clumpCount)); k++) {
      const rng = streamFor(seed, 'bgKnots', k);
      const r = rcArmR(rng);
      const arm = k % P.arms;
      const w = rcWOld(r);
      const d = (P.youngOffset + P.clumpOut) * w + 0.25 * w * gaussN(rng);
      const th = armAngleAt(r, P.pitch, armPhase, arm, P.arms) - d / (r * sinI);
      knots.push([r * Math.cos(th), r * Math.sin(th), P.knotSigma * r * (0.7 + 0.6 * rng())]);
    }
  } else if (P.clumpShare > 0 && wisps && P.wispKnotMode === 'beads') {
    // Wisps, beads: a seeded walk along each arm (stream bgBeads, salt 19) with gaps of the mean × U(1 ± jitter), the
    // mean set so the arm's knots fill it from armStart to armEnd (Elmegreen: complexes every 0.1–0.3 R, evenly spaced).
    // Each bead sits on the densest young wisp near the crest, clumpOut bias-σ downstream (the best of 24 draws from
    // its own bgKnots stream), so the beads follow the wisps, not a hidden line.
    const nK = Math.max(1, Math.round(P.clumpCount)), perArm = Math.ceil(nK / P.arms);
    const r0 = Math.max(P.coreExclusion * 1.5, P.armStart * R), r1 = Math.min(1, P.armEnd) * R;
    const gapMean = Math.max(1e-6, r1 - r0) / sinI / (perArm + 0.5);
    const jit = Math.max(0, Math.min(1, P.wispKnotJitter ?? 0));
    const walked = new Array(P.arms).fill(0);
    for (let k = 0; k < nK; k++) {
      const arm = k % P.arms;
      walked[arm] += gapMean * (1 - jit + 2 * jit * streamFor(seed, 'bgBeads', k)());
      const r = r0 + walked[arm] * sinI;
      if (r > r1) continue;
      const rng = streamFor(seed, 'bgKnots', k);
      let best = null, bw = -1;
      for (let t = 0; t < 24; t++) {
        const dPhase = (P.clumpOut + 0.5 * gaussN(rng)) * wispPhaseSigma;
        const rr = r * Math.exp(0.15 * gapMean * sinI / r * gaussN(rng));
        const th = armAngleAt(rr, P.pitch, armPhase, arm, P.arms) - dPhase / P.arms;
        const w = wispYoungW(rr, th);
        if (w > bw) { bw = w; best = [rr * Math.cos(th), rr * Math.sin(th), rr]; }
      }
      knots.push([best[0], best[1], P.knotSigma * best[2] * (0.7 + 0.6 * rng())]);
    }
  } else if (P.clumpShare > 0 && wisps) {
    // Wisps: complexes on the densest wisps (accepted with the young weight squared), at least wispKnotGap·R apart.
    for (let k = 0; k < Math.max(1, Math.round(P.clumpCount)); k++) {
      const rng = streamFor(seed, 'bgKnots', k);
      let best = null;
      for (let t = 0; t < 4000; t++) {
        const r = discR(rng, P.discScale * P.armScale), th = 2 * Math.PI * rng() - Math.PI;
        if (r < Math.max(P.coreExclusion * 1.5, P.armStart * R) || r > Math.min(1, P.armEnd) * R) continue;
        const x = r * Math.cos(th), z = r * Math.sin(th);
        const gap = P.wispKnotGap * R * (t < 2000 ? 1 : 0.5);
        if (knots.some((K) => Math.hypot(K[0] - x, K[1] - z) < gap)) continue;
        best = [x, z, r];
        if (rng() < wispYoungW(r, th) ** 2) break;
      }
      if (best) knots.push([best[0], best[1], P.knotSigma * best[2] * (0.7 + 0.6 * rng())]);
    }
  } else if (P.clumpShare > 0 && fieldy) {
    // Shape modes: on the young crest, clumpOut σ (of the young profile) downstream, at radii from the disc law.
    const nK = Math.max(1, Math.round(P.clumpCount));
    const m = shape === 'wave' ? 2 : P.arms;
    for (let k = 0; k < nK; k++) {
      const rng = streamFor(seed, 'bgKnots', k);
      let a = R;
      for (let t = 0; t < 200; t++) {
        a = discR(rng, P.discScale * P.armScale);
        if (a >= Math.max(P.coreExclusion * 1.5, P.armStart * R) && a <= Math.min(1, P.armEnd) * R) break;
      }
      const arm = k % m;
      const delta = P.clumpOut * phaseSigma + 0.35 * phaseSigma * gaussN(rng);
      const [x, z] =
        shape === 'wave'
          ? wavePos(a, waveCrest(a) + arm * Math.PI + delta / (2 * WAVE_SIGN), wavePsi)
          : (() => { const th = armAngleAt(a, P.pitch, armPhase, arm, P.arms) - delta / P.arms; return [a * Math.cos(th), a * Math.sin(th)]; })();
      knots.push([x, z, P.clumpRadius * (0.6 + 0.8 * rng())]);
    }
  } else if (P.clumpShare > 0) {
    const nK = Math.max(1, Math.round(P.clumpCount));
    for (let k = 0; k < nK; k++) {
      const rng = streamFor(seed, 'bgKnots', k);
      let r;
      do r = drawR(rng); while (r < Math.max(P.coreExclusion * 1.5, 0.12 * R) || r > P.armEnd * R);
      const arm = k % P.arms;
      const sg = sigmaAt(r);
      const d = perp ? P.clumpOut * sg + 0.35 * sg * gauss3(rng) : 0;
      const [x, z] = perp ? onArm(r, arm, d) : (() => { const th = armAngleAt(r, P.pitch, armPhase, arm, P.arms); return [r * Math.cos(th), r * Math.sin(th)]; })();
      knots.push([x, z, P.clumpRadius * (0.6 + 0.8 * rng())]);
    }
  }

  /** One draw of star i's position (null: drawn again without counting an attempt). `draws` widens the core ring. */
  const candidate = (i, rng, core, draws) => {
    let c;
    if (recipe) {
      const hDisc = P.discScale * R;
      if (core) {
        // An exponential sphere (scale bulgeScale·R), flattened; a soft core hole (and the hard exclusion below).
        const h = P.bulgeScale * R;
        const r = -h * Math.log(Math.max(1e-12, rng() * rng() * rng()));
        const th = 2 * Math.PI * rng(), cy = 2 * rng() - 1, sy = Math.sqrt(1 - cy * cy);
        c = [Math.fround(r * sy * Math.cos(th)), Math.fround(r * cy * P.bulgeFlat), Math.fround(r * sy * Math.sin(th))];
        if (rng() > smooth(0.75 * P.coreExclusion, 1.25 * P.coreExclusion, Math.hypot(c[0], c[1], c[2]))) return null;
      } else if (pop[i] === 4 || pop[i] === 3) {
        const young = pop[i] === 3;
        const r = rcR(rng, young ? P.discScale * P.armScale : P.discScale);
        const th = 2 * Math.PI * rng();
        const w = rcWOld(r);
        const d = rcPerp(r, th);
        const A0 = young ? P.youngContrast : P.oldContrast;
        const A = A0 * armRamp(r) * armDipAt(r, fieldArm(r, th));
        const prof = young ? sersic(d - P.youngOffset * w, rcWYoung(r)) : sersic(d, w);
        let wgt = ((1 + A * prof) / (1 + A0)) * rcTaper(r) * (1 - P.laneDepth * rcLaneG(d, w));
        if (young) wgt *= armRamp(r); // young stars live where the arms are
        if (rng() > wgt) return null;
        c = [Math.fround(r * Math.cos(th)), Math.fround((young ? P.zYoung : P.zOld) * hDisc * gaussN(rng)), Math.fround(r * Math.sin(th))];
      } else if (pop[i] === 2) {
        const K = knots[Math.floor(rng() * knots.length) % knots.length];
        c = [Math.fround(K[0] + K[2] * gaussN(rng)), Math.fround(P.zYoung * hDisc * gaussN(rng)), Math.fround(K[1] + K[2] * gaussN(rng))];
      } else {
        const S = spurs[Math.floor(rng() * spurs.length) % spurs.length];
        const t = -S.len * Math.log(Math.max(1e-12, rng())) * 0.5; // exponential along the spur: dense at the root
        c = [Math.fround(S.x + S.dx * t + S.width * gaussN(rng)), Math.fround(P.zYoung * hDisc * gaussN(rng)), Math.fround(S.z + S.dz * t + S.width * gaussN(rng))];
      }
    } else if (core && P.bulgeMode !== 'exp') {
      const ring = Math.floor(i / CORE_RING);
      const inRing = Math.min(CORE_RING, nCore - ring * CORE_RING);
      const u = coreU0 + ((1 - coreU0) * (ring * CORE_RING + inRing * rng())) / nCore;
      const r = P.coreAt * R * u ** P.starExp;
      const anywhere = draws > 10 * PLACE_ATTEMPTS;
      const th = ringTurn[ring] + (2 * Math.PI * (anywhere ? inRing * rng() : slot[i] + 0.5 + CORE_JITTER * (2 * rng() - 1))) / inRing;
      c = at(r, th, P.starY, rng);
    } else if (core) {
      // An exponential sphere of scale bulgeScale·R (radial law r² e^(−r/h)), flattened in y.
      const h = P.bulgeScale * R;
      const r = -h * Math.log(Math.max(1e-12, rng() * rng() * rng()));
      const th = 2 * Math.PI * rng();
      const cy = 2 * rng() - 1;
      const sy = Math.sqrt(1 - cy * cy);
      c = [Math.fround(r * sy * Math.cos(th)), Math.fround(r * cy * P.bulgeFlat), Math.fround(r * sy * Math.sin(th))];
      if (r > 0.5 * R) return null;
    } else if (wisps && pop[i] === 2) {
      const K = knots[Math.floor(rng() * knots.length) % knots.length];
      c = [Math.fround(K[0] + K[2] * gaussN(rng)), Math.fround(0.3 * P.starY * gaussN(rng)), Math.fround(K[1] + K[2] * gaussN(rng))];
    } else if (wisps) {
      // Old (smooth, low contrast) and young (the wisp field, sharpened): rejection from the disc law, never a cut.
      const young = pop[i] === 3;
      let xz = null;
      for (let t = 0; t < 2000 && !xz; t++) {
        const r = discR(rng, young ? P.discScale * P.armScale : P.discScale), th = 2 * Math.PI * rng() - Math.PI;
        const w = (young ? wispYoungW(r, th) : wispOldW(r, th)) * (1 - P.laneDepth * wispStreak(r, th));
        if (rng() < w) xz = [r * Math.cos(th), r * Math.sin(th)];
      }
      if (!xz) return null;
      const yMax = young ? 0.5 * P.starY : P.starY;
      c = [Math.fround(xz[0]), Math.fround(yMax * (rng() + rng() - 1)), Math.fround(xz[1])];
    } else if (fieldy && pop[i] === 2) {
      const K = knots[Math.floor(rng() * knots.length) % knots.length];
      c = [Math.fround(K[0] + 0.5 * K[2] * gaussN(rng)), Math.fround(0.3 * P.starY * gaussN(rng)), Math.fround(K[1] + 0.5 * K[2] * gaussN(rng))];
    } else if (fieldy) {
      const young = pop[i] === 3;
      const xz = shapePoint(rng, young ? P.youngContrast : P.oldContrast, young ? P.youngSharp : P.oldSharp, young ? 'young' : 'old');
      if (!xz) return null;
      const yMax = young ? 0.5 * P.starY : P.starY;
      c = [Math.fround(xz[0]), Math.fround(yMax * (rng() + rng() - 1)), Math.fround(xz[1])];
    } else if (pop[i] === 2) {
      const K = knots[Math.floor(rng() * knots.length) % knots.length];
      c = [Math.fround(K[0] + K[2] * gauss3(rng) * 0.5), Math.fround(0.3 * P.starY * gauss3(rng)), Math.fround(K[1] + K[2] * gauss3(rng) * 0.5)];
    } else {
      let r = drawR(rng);
      let disc = pop[i] === 1;
      if (!disc && P.armEnd < 1 && r > P.armEnd * R && rng() < (r / R - P.armEnd) / (1 - P.armEnd)) disc = true;
      if (disc) {
        const th = 2 * Math.PI * rng();
        c = at(r, th, P.starY, rng);
      } else if (!perp) {
        const arm = rng() < 0.5 ? 0 : 1;
        const unit = P.armSoft > 0 ? (1 - P.armSoft) * (2 * rng() - 1) + P.armSoft * gauss3(rng) * 0.577 : 2 * rng() - 1;
        const th = armAngleAt(Math.max(r, 1e-9), P.pitch, armPhase, P.arms === 2 ? arm : Math.floor(rng() * P.arms), P.arms) + scatterAt(P.scatter, r) * unit;
        c = at(r, th, P.starY, rng);
      } else {
        const arm = Math.floor(rng() * P.arms) % P.arms;
        const sg = sigmaAt(r);
        const unit = (1 - P.armSoft) * (2 * rng() - 1) * 1.732 + P.armSoft * crossDraw(rng);
        if (swallowed(unit, rng)) return null;
        const [x, z] = onArm(r, arm, unit * sg);
        c = [Math.fround(x), Math.fround(P.starY * (rng() + rng() - 1)), Math.fround(z)];
      }
    }
    return c;
  };
  const stars = [];
  let redrawn = 0, uncleared = 0, totalAttempts = 0;
  for (let i = 0; i < nStars; i++) {
    const rng = rngs[i];
    const core = i < nCore;
    const px = isBright[i] ? P.haloBright : P.haloStar;
    let p = null;
    let best = -1;
    let draws = 0;
    const attempts0 = totalAttempts;
    for (let attempt = 0; attempt < PLACE_ATTEMPTS && best < 1; draws++) {
      if (draws > 100 * PLACE_ATTEMPTS) throw new Error(`no room for background star ${i}`);
      const c = candidate(i, rng, core, draws);
      if (c === null || Math.hypot(c[0], c[1], c[2]) < P.coreExclusion || nearHood(c, px)) continue;
      attempt++;
      totalAttempts++;
      if (placeMode === 'none') {
        // No clearance: the density's first draw (a neighbourhood star's halo is still never touched).
        [p, best] = [c, Infinity];
        break;
      }
      const q = room(c, px);
      if (placeMode === 'reject') {
        // Reject only: the first clear draw; there is no "roomiest", so nothing is pushed out to the flanks.
        if (q >= 1) [p, best] = [c, q];
      } else if (q > best) [p, best] = [c, q];
    }
    if (totalAttempts - attempts0 > 1) redrawn++;
    if (best < 1) uncleared++;
    if (p === null) {
      // Reject only, and no clear draw in PLACE_ATTEMPTS: a fresh draw from the density, room or not.
      for (; ; draws++) {
        if (draws > 100 * PLACE_ATTEMPTS) throw new Error(`no room for background star ${i}`);
        const c = candidate(i, rng, core, draws);
        if (c === null || Math.hypot(c[0], c[1], c[2]) < P.coreExclusion || nearHood(c, px)) continue;
        p = c;
        break;
      }
    }
    settle(p, px, i);
    stars.push(p);
  }
  const placement = { meanAttempts: totalAttempts / Math.max(1, nStars), redrawn: redrawn / Math.max(1, nStars), uncleared: uncleared / Math.max(1, nStars) };
  const touch = haloTouch(stars, isBright);
  const dimArr = new Float32Array(4 * (nStars - nBright));
  const brightArr = new Float32Array(4 * nBright);
  // Star colour (opt-in): each star's temperature from its own stream (bgTemp, salt 16), by population.
  const colour = P.starColour > 0;
  const dimTint = colour ? new Float32Array(3 * (nStars - nBright)) : null;
  const brightTint = colour ? new Float32Array(3 * nBright) : null;
  const temps = colour ? new Float32Array(nStars) : null;
  let d = 0, b = 0;
  stars.forEach(([x, y, z], i) => {
    let warm = level[i].warm;
    if (recipe) {
      const t = Math.min(1, Math.hypot(x, z) / R);
      warm = i < nCore ? level[i].warmU < 0.95 : pop[i] === 4 && level[i].warmU < P.warmCore + (P.oldWarm - P.warmCore) * Math.sqrt(t);
    } else if (fieldy || wisps) {
      // Two populations: the young (and the knots) are blue; the old disc and the bulge warm, warmest at the centre.
      const t = Math.min(1, Math.hypot(x, z) / R);
      warm = pop[i] !== 2 && pop[i] !== 3 && level[i].warmU < P.warmCore + (P.oldWarm - P.warmCore) * Math.sqrt(t);
    } else if (P.warmGradient > 0) {
      const t = Math.min(1, Math.hypot(x, z) / R);
      const share = P.warmCore + (P.warmRim - P.warmCore) * Math.sqrt(t);
      warm = level[i].warmU < P.warmShare + P.warmGradient * (share - P.warmShare);
    }
    const v = warm ? -level[i].brightness : level[i].brightness;
    if (colour) {
      const young = fieldy || recipe || wisps ? pop[i] === 2 || pop[i] === 3 || pop[i] === 5 : i >= nCore && (pop[i] === 2 || !warm);
      const popName = young ? 'young' : i < nCore ? 'bulge' : 'old';
      const T = drawTemperature(streamFor(seed, 'bgTemp', i), popName, young ? P.youngTempSpread : P.oldTempSpread);
      temps[i] = T;
      (isBright[i] ? brightTint : dimTint).set(guardTint(blackbodySRGB(T), P.starColour), 3 * (isBright[i] ? b : d));
    }
    if (isBright[i]) brightArr.set([x, y, z, v], 4 * b++);
    else dimArr.set([x, y, z, v], 4 * d++);
  });

  // Dust: today on the arms (bearing scatter, wider toward the core); or over the disc; or in the lanes.
  const dust = new Float32Array(4 * nDust);
  for (let i = 0; i < nDust; i++) {
    const rng = streamFor(seed, 'bgDust', i);
    const brightness = P.dustFloor + P.dustRange * rng();
    let p;
    let guard = 0;
    if (wisps) {
      // Wisps dust: dustArmShare follows the old field and peaks in the dark streaks (gain dustLaneGain); the rest a smooth disc.
      const onArm = rng() < P.dustArmShare;
      // Reviewed: dustWispShare of the arm dust traces the wisps themselves (faint grain along the young filaments).
      const onWisp = onArm && P.dustWispShare > 0 && rng() < P.dustWispShare;
      for (let t = 0; t < 4000 && !p; t++) {
        const r = discR(rng), th = 2 * Math.PI * rng() - Math.PI;
        const w = onWisp
          ? wispBiasAt(r, th, P.dustContrast, P.oldSharp) * wispField(r, th)
          : onArm ? (wispBiasAt(r, th, P.dustContrast, P.oldSharp) * (1 + P.dustLaneGain * wispStreak(r, th))) / (1 + P.dustLaneGain) : 1;
        if (rng() > w) continue;
        const c = [Math.fround(r * Math.cos(th)), Math.fround(P.dustY * (rng() + rng() - 1)), Math.fround(r * Math.sin(th))];
        if (Math.hypot(c[0], c[1], c[2]) >= P.coreExclusion) p = c;
      }
      p ??= [R, 0, 0];
      dust.set([p[0], p[1], p[2], brightness], 4 * i);
      continue;
    }
    if (recipe) {
      // Recipe dust: dustArmShare drawn with the old-arm weight at dustContrast, peaking in the lane; the rest a smooth disc.
      const onArm = rng() < P.dustArmShare;
      for (let t = 0; t < 4000 && !p; t++) {
        const r = rcR(rng, P.discScale);
        const th = 2 * Math.PI * rng();
        let wgt = rcTaper(r);
        if (onArm) {
          const d = rcPerp(r, th), w = rcWOld(r);
          const A = P.dustContrast * armRamp(r) * armDipAt(r, fieldArm(r, th));
          wgt *= (((1 + A * sersic(d, w)) / (1 + P.dustContrast)) * (1 + P.dustLaneGain * rcLaneG(d, w))) / (1 + P.dustLaneGain);
        }
        if (rng() > wgt) continue;
        const c = [Math.fround(r * Math.cos(th)), Math.fround(P.zDust * P.discScale * R * gaussN(rng)), Math.fround(r * Math.sin(th))];
        if (Math.hypot(c[0], c[1], c[2]) >= P.coreExclusion) p = c;
      }
      p ??= [R, 0, 0];
      dust.set([p[0], p[1], p[2], brightness], 4 * i);
      continue;
    }
    do {
      if (++guard > 200) { p = [R, 0, 0]; break; }
      if (fieldy) {
        // Shape modes: the dust follows the old stars' field, softer (its own contrast and sharpness), no lane.
        const xz = shapePoint(rng, P.dustContrast, P.dustSharp, 'dust') ?? [R, 0];
        p = [Math.fround(xz[0]), Math.fround(P.dustY * (rng() + rng() - 1)), Math.fround(xz[1])];
      } else if (P.dustMode === 'arms') {
        const r = R * rng() ** P.dustExp;
        const arm = rng() < 0.5 ? 0 : 1;
        const th = armAngleAt(Math.max(r, 1e-9), P.pitch, armPhase, P.arms === 2 ? arm : Math.floor(rng() * P.arms), P.arms) + scatterAt(P.dustScatter, r) * (2 * rng() - 1);
        p = at(r, th, P.dustY, rng);
      } else if (P.dustMode === 'disc') {
        const r = P.radialLaw === 'exp' ? drawR(rng) : R * rng() ** P.dustExp;
        p = at(r, 2 * Math.PI * rng(), P.dustY, rng);
      } else {
        const r = P.radialLaw === 'exp' ? drawR(rng) : R * rng() ** P.dustExp;
        const arm = Math.floor(rng() * P.arms) % P.arms;
        const sg = sigmaAt(r);
        const [x, z] = onArm(r, arm, (P.laneOffset + 0.5 * P.laneWidth * gauss3(rng)) * sg);
        p = [Math.fround(x), Math.fround(P.dustY * (rng() + rng() - 1)), Math.fround(z)];
      }
    } while (Math.hypot(p[0], p[1], p[2]) < P.coreExclusion);
    dust.set([p[0], p[1], p[2], brightness], 4 * i);
  }

  return { stars: dimArr, bright: brightArr, dust, armPhase, wavePsi, knots, hood, touch, placement, ...(colour ? { starsTint: dimTint, brightTint, temps } : {}) };
}
