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
  // 23-29 are the black hole's (Task 4) and planetHue (Task 7), appended by those tasks.
  // The neighbourhood's binaries (re-skin Task 1e), keyed by pair (4096 × lower star key + higher):
  // the keep draw, then the eccentricity, the periapsis and the phase.
  binaries: 30,
} as const;

export type StreamConcern = keyof typeof STREAM_SALT;

/** The stream for one concern and key of a seed (`seededStream`, its first output dropped). */
export function streamFor(seed: number, concern: StreamConcern, key: number): () => number {
  return seededStream(seed, STREAM_SALT[concern], key);
}
