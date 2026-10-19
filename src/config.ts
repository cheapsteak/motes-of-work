import type { AutoAdvanceSettings } from './autoAdvance/plan';
import type { MechanismId } from './mechanisms';

/** The one config line that selects the mechanism (spec §6.3). `?mech=<id>` overrides it in test mode. */
export const ACTIVE_MECHANISM: MechanismId = 'bike';

/** Mote budget on desktop (spec §8). */
export const MOTE_BUDGET_DESKTOP = 100_000;

/** Seed for the mote sample; integer in [0, 2^24). */
export const MOTE_SEED = 1;

/**
 * Auto-advance (src/autoAdvance/): the essay moves itself from scene to scene, holding at the end of
 * each, for a reader who has not found the scroll. Any manual scroll pauses it; the ring in the
 * bottom-right corner resumes it. For tuning without a rebuild the page takes URL overrides: `?auto=0` (off), `?dwell=<seconds>`
 * (floorSeconds), `?wps=<n>` (wordsPerSecond), `?pace=<screens per second>`
 * (transitScreensPerSecond), `?fixpace=<screens per second>` (fixScreensPerSecond). Under `?test=1` it is off unless `?auto=1`.
 */
export const AUTO_ADVANCE: AutoAdvanceSettings = {
  /** False turns it off: no ring, no motion (`?auto=1` turns it back on). */
  enabled: true,
  /** The shortest hold at a line, in seconds. */
  floorSeconds: 2,
  /** Reading pace: a line holds for its words over this (3 is about 180 a minute), if longer than the floor. */
  wordsPerSecond: 3,
  /** How fast it scrolls from one line to the next, in screens (viewport heights) per second. */
  transitScreensPerSecond: 0.6,
  /**
   * How fast it scrolls over the fix on the held piece (defect 0.36 to the release), where the author asked for the gold to
   * land, glow "for a little bit" and then mend. At 0.6 the glow was 0.13 s; at 0.2 the landing, the glow and the mend are each
   * about a third of a second, and the scroll still drives every frame (src/autoAdvance/pace.ts).
   */
  fixScreensPerSecond: 0.2,
  /** How long each scroll takes to reach that pace, and to slow from it at the next line, in seconds. */
  easeSeconds: 0.5,
  /** Extra hold before the first line's own, in seconds. */
  startDelaySeconds: 0,
};
