// The single registry of hash01 salts for a mote seed. Every `hash01(seed, salt)` in the TS and the
// GLSL names its salt here; the GLSL constants are generated from this object (glslSaltConstants)
// and spliced into mote.glsl, so the two cannot drift. The values are frozen: changing one changes
// how every mote looks.
export const SALT = {
  settle: 1, // buildMoteAttrs: settle threshold
  type: 2, // buildMoteAttrs: specced / misallocated type
  extra: 3, // buildMoteAttrs: body mote that exists only when misallocated
  misVisible: 4, // buildMoteAttrs: core mote hidden when misallocated
  driftX: 5, // mote(): drift phase per axis
  driftY: 6,
  driftZ: 7,
  spawnZ: 8, // spawnPoint(): height on the shell
  spawnAzimuth: 9, // spawnPoint(): azimuth
  spawnRadius: 10, // spawnPoint(): shell radius
  scenario: 11, // mote(): which provenance scenario the mote follows
  bezierSide: 12, // mote(): sideways reach of the flight path
  twinPhase: 13, // instance.glsl: dialogue twin orbit phase
  shimmer: 14, // instance.glsl: idle shimmer phase
  hero: 15, // instance.glsl: hero form selection
  bodyZ: 16, // moteBodyRest(): a reflowed mote's height on its body's sphere (Act II's reflow)
  bodyAzimuth: 17, // moteBodyRest(): and its azimuth (18 and 19, the first stack's, are retired: never reuse them)
  nodeSpreadX: 20, // light.ts nodeSpread(): where a galaxy mote sets out, about its stream's foot (or above its piece), per axis
  nodeSpreadY: 21,
  nodeSpreadZ: 22,
  bodyBirth: 23, // bodyAttrs.ts: a galaxy builder's own place in its shell's landing order
  personLat: 24, // bodyAttrs.ts: a person mote's rest point on its host's sphere, its height
  personLon: 25, // and its longitude
  bodyKeep: 26, // mote(): whether a reflowed mote stays lit on a small body (reflowKeep's share)
  starDotZ: 27, // star.ts starDot(): a star's dot's height on the unit sphere (its direction)
  starDotAzimuth: 28, // and its azimuth
  starDotRadius: 29, // and its distance from the centre, in units of R (the core's gaussian or the halo's exponential)
  // The black hole (hole.ts / hole.glsl), each hash of a holeSeed (holeLook.ts): a knot's launch jitter and ember draw,
  knotLaunch: 30,
  knotEmber: 31,
  jetSpeed: 32, // a jet dot's drift speed
  infallPeriod: 33, // an in-fall slot's period and its phase,
  infallOffset: 34,
  infallTilt: 35, // and each fall's tilt out of the plane, its side, its azimuth, its start and end radii and its winding
  infallSide: 36,
  infallAzimuth: 37,
  infallFrom: 38,
  infallTo: 39,
  infallWind: 40,
  strandBright: 41, // a strand dot's brightness
  diskPhase: 42, // a disk streak's phase in its lives,
  diskLifeR: 43, // and each life's centre radius, angle, length, brightness, pitch and hot flag
  diskLifeAngle: 44,
  diskLifeLen: 45,
  diskLifeBright: 46,
  diskLifePitch: 47,
  diskHot: 48,
  hazePhase: 49, // a haze dot's phase in its lives, and each life's angle
  hazeAngle: 50,
  // The plan's schematic (plan.ts / plan.glsl, re-skin Task 7b), each hash of a plan dot's or a body's
  // seed (planAttrs.ts): a node cross's own arrival rank, an outline's start angle,
  // 51 was planDash, an orbit's dash phase, gone in Task 7b fix round 2 (a dash starts at its body).
  planNode: 52,
  planOutline: 53,
  planRank: 54, // and every other plan dot's arrival rank in its window's dissolve
  // The defect's leak (leak.ts / leak.glsl), each hash of a wound's or
  // a leaking dot's seed (re-skin Task 8b): a wound's opening delay, its centre (z and azimuth) and its width,
  leakOpen: 55,
  leakDir: 56,
  leakWidth: 57,
  leakDot: 58, // whether a dot leaks, its start jitter, its time out and its linger
  leakAim: 59, // its bent direction (z and azimuth)
  leakReach: 60, // its distance
  leakShiver: 61, // the linger's held shiver
  dropCell: 62, // the dropout (dropout.ts, on the CPU): whether a cell fires, its length and its start frame
  dropLine: 63, // each line's count, place and height
} as const;

export type SaltName = keyof typeof SALT;

/** `misVisible` → `SALT_MIS_VISIBLE`. */
export function glslSaltName(name: SaltName): string {
  return `SALT_${name.replace(/[A-Z]/g, (c) => `_${c}`).toUpperCase()}`;
}

/** `const uint SALT_X = Nu;` for every salt, in registry order. */
export function glslSaltConstants(): string {
  const lines = (Object.entries(SALT) as [SaltName, number][]).map(
    ([name, value]) => `const uint ${glslSaltName(name)} = ${value}u;`,
  );
  return ['// hash01 salts, generated from SALT in src/math/salts.ts.', ...lines].join('\n');
}
