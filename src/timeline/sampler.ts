import type { SceneState } from './sceneState';

export interface Sampler {
  /** Pure and deterministic: the same progress always yields an equal, freshly allocated state. */
  sample(progress: number): SceneState;
}
