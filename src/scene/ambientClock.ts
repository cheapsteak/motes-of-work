// The ambient clock (docs/specs/2026-10-07-galaxy-orbits.md §8, the two clocks): the galaxy's own
// time, which drives the orbits, the galaxy's turn, the derps, the morph and the scatter, beside the
// scroll that drives the story. It is wall time since the first frame, wrapped at AMBIENT_WRAP so
// float32 keeps it to a fraction of a frame however long the page stays open. It stands still at
// `?ambient=<s>`, and at AMBIENT_POSE (the freeze's pin) in test mode and under reduced motion, which
// it reads on every call, so a change of the preference stops or restarts it at once. A frame is a
// pure function of (scroll, ambient). The freeze frame's hold replaces it (`shown`): while
// `freeze.hold` is up, every draw and the tracking camera read the freeze pin instead.
import { AMBIENT_POSE, FREEZE_PINS } from '../galaxy/ambient';

export { FREEZE_PINS };

/** Seconds: the shown ambient wraps here (float32's ulp at 3,600 is about 0.00024 s). */
export const AMBIENT_WRAP = 3600;

export interface AmbientClock {
  /** The ambient, seconds, at the page's clock `nowMs` (a requestAnimationFrame timestamp). */
  at(nowMs: number): number;
  /** True while the ambient runs on its own (no override, not in test mode, no reduced motion). */
  live(): boolean;
}

/**
 * The ambient clock: `override` if one is given; else AMBIENT_POSE in test mode or while `reduced()`;
 * else the seconds since `startMs`, modulo AMBIENT_WRAP.
 */
export function createAmbientClock(o: { override: number | null; test: boolean; reduced: () => boolean; startMs: number }): AmbientClock {
  const live = (): boolean => o.override === null && !o.test && !o.reduced();
  return {
    live,
    at(nowMs: number): number {
      if (o.override !== null) return o.override;
      if (!live()) return AMBIENT_POSE;
      const t = ((nowMs - o.startMs) / 1000) % AMBIENT_WRAP;
      return t < 0 ? t + AMBIENT_WRAP : t;
    },
  };
}

/**
 * The ambient a frame shows (freeze-frame §1.2, the two clocks): the freeze pin, FREEZE_PINS.C1.t,
 * while the hold is up (`freeze.hold` >= 0.5: the cut is a step, never a blend of two clocks), else
 * the clock's own. The galaxy's draws and the camera's tracked point both read it, so the camera
 * that rides the planet stops with the picture, and the held frame is pure of wall time.
 */
export function shown(live: number, hold: number): number {
  return hold >= 0.5 ? FREEZE_PINS.C1.t : live;
}
