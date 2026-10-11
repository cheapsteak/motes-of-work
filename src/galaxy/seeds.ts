// The galaxy's seeded streams: one registry of their salts for the generator and the background, so
// no two concerns ever draw from the same stream. Each concern draws from its own stream per body,
// slot or point (the key), so a change to one does not reshuffle another.
import { seededStream } from '../math/hash';

/** Every concern's salt. The values are frozen: changing one changes the galaxy. */
export const STREAM_SALT = {
  births: 1,
  parents: 2,
  spots: 3,
  slots: 4,
  planets: 5,
  bows: 6,
  derps: 7,
  bgStars: 8,
  bgDust: 9,
  // 10 and 11 drew the old background's core rings: registered, unused and frozen.
  bgRingTurn: 10,
  bgRingSlots: 11,
  // The background's knots and populations, at the galaxy tuner's own numbers.
  bgKnots: 12,
  bgPop: 13,
  starLook: 14,
  // 15 and 16 are the tuner's bgSpurs and bgTemp: reserved, never drawn here.
  // The background's wisps, at the galaxy tuner's own numbers: the lattice's values (registered with
  // the tuner's number; the gradient noise does not draw them), its gradients, and the beads' walk.
  bgWisps: 17,
  bgWispGrad: 18,
  bgBeads: 19,
  // 20 and 21 are the tuner's bgHoodLook and bgHoodJitter: reserved, never drawn here.
  // The along-arm modulation: the tuner's 14, which is starLook here, so it moved past it (and in the
  // tuner's gen.js with it).
  bgArmMod: 22,
  // The black hole's parts (re-skin Task 4), one stream per dot of each (holeAttrs.ts): the disk (its
  // streaks' own at 100,000 + k), the jets, the knots, the photon ring, the in-fall (its falls are
  // shader hashes: registered, nothing drawn on the CPU yet) and the strands (R0's at 10,000 + i).
  holeDisk: 23,
  holeJet: 24,
  holeKnot: 25,
  holeRing: 26,
  holeInfall: 27,
  holeStrand: 28,
  // 29 is planetHue (Task 7), appended by that task.
  // The neighbourhood's binaries (re-skin Task 1e), keyed by pair (4096 × lower star key + higher):
  // the keep draw, then the eccentricity, the periapsis and the phase.
  binaries: 30,
} as const;

export type StreamConcern = keyof typeof STREAM_SALT;

/** The stream for one concern and key of a seed (`seededStream`, its first output dropped). */
export function streamFor(seed: number, concern: StreamConcern, key: number): () => number {
  return seededStream(seed, STREAM_SALT[concern], key);
}
