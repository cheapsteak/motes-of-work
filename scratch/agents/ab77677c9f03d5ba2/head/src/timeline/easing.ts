export type EaseName = 'linear' | 'step' | 'inQuad' | 'outQuad' | 'inOutQuad' | 'inOutCubic' | 'outCubic';

/** Each easing maps t in [0,1] to [0,1] with ease(0) = 0 and ease(1) = 1. */
export const EASINGS: Record<EaseName, (t: number) => number> = {
  linear: (t) => t,
  // Holds the previous key's value until the next key is reached.
  step: (t) => (t < 1 ? 0 : 1),
  inQuad: (t) => t * t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  outCubic: (t) => 1 - (1 - t) ** 3,
};
