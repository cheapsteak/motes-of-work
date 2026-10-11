// Integer-only hashing so the GLSL mirror (WebGL2, uint arithmetic) matches bit-for-bit.

/** PCG hash: uint32 in, uint32 out. Every multiply/add wraps mod 2^32. */
export function pcg(v: number): number {
  const state = (Math.imul(v, 747796405) + 2891336453) >>> 0;
  const word = Math.imul((state >>> ((state >>> 28) + 4)) ^ state, 277803737);
  return ((word >>> 22) ^ word) >>> 0;
}

/**
 * Deterministic hash of (seed, salt) in [0, 1). Keeps the top 24 bits of the pcg word, so the
 * result is a multiple of 2^-24: exact in float32 and never rounds up to 1 (a 32-bit value near
 * 2^32 would, in the GLSL mirror). GLSL: `float(pcg(...) >> 8u) / 16777216.0`.
 */
export function hash01(seed: number, salt: number): number {
  return (pcg((seed ^ Math.imul(salt, 0x9e3779b9)) >>> 0) >>> 8) / 16777216;
}

/** Seeded PRNG for TS-side use (tests, buffer building). Not mirrored in GLSL. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
