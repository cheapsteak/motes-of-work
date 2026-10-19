import type { SectionSpan } from '../scroll/progress';
import { progressOfSectionAt, type KeyframeFile } from '../timeline/keyframeSampler';
import { transitFraction, transitSeconds, type AutoAdvanceSettings, type TransitSettings } from './plan';

/**
 * Auto-advance's pace over a stretch of the essay: the planner cruises at `transitScreensPerSecond`
 * (src/autoAdvance/plan.ts), and over the fix on the held piece it goes slower, so the gold lands, the
 * piece glows and then it mends each last long enough to see. The author asked for the glow "for a
 * little bit"; the keys give it 0.014 of the defect section, which the plain pace crossed in 0.13 s,
 * inside the transit's acceleration from df-2. Only the pace changes: the keys, the frames and the
 * pace by hand do not, and no stop moves.
 */

/** A stretch of the essay, in global progress, over which a transit goes no faster than `screensPerSecond`. */
export interface PaceSpan {
  from: number;
  to: number;
  screensPerSecond: number;
}

/**
 * The fix's span, read off the story's own keys so it moves with them: from the first key of `net.fix`
 * (the gold starts to fall) to the last of `freeze.hold` (the held frame lets go, after the mend).
 */
export function fixPace(file: KeyframeFile, spans: readonly SectionSpan[], settings: Pick<AutoAdvanceSettings, 'fixScreensPerSecond'>): PaceSpan[] {
  const position = (track: string, pick: 'first' | 'last'): number => {
    const keys = file.tracks[track];
    if (!keys || keys.length === 0) throw new Error(`the fix's pace span reads the "${track}" track, which the keyframes lack`);
    const { at } = pick === 'first' ? keys[0] : keys[keys.length - 1];
    return typeof at === 'number' ? at : progressOfSectionAt(at, spans);
  };
  const from = position('net.fix', 'first');
  const to = position('freeze.hold', 'last');
  if (!(to > from)) throw new Error(`the fix's pace span is empty: net.fix starts at ${from}, the hold lets go at ${to}`);
  return [{ from, to, screensPerSecond: settings.fixScreensPerSecond }];
}

/** One transit: how long it takes, and how far through it is (in [0, 1] of its distance) `t` seconds in. */
export interface Transit {
  seconds: number;
  fraction(t: number): number;
}

/** The step the slowed profile is sampled at, in screens: well under a pixel of scroll on any screen. */
const PROFILE_STEP_SCREENS = 0.001;

/**
 * The transit from progress `from` to `to`, `screens` long (viewport heights), through the pace `slow`.
 * A transit no span touches is the plain one of plan.ts, exactly. One a span touches keeps the same
 * ease (it speeds up and slows at the rate that reaches the pace in `easeSeconds`) but never goes
 * faster than the slowest span it is in, braking before it and speeding up again after: the speed
 * squared is the lowest of the pace limits and the two ramps, from rest at the start and to rest at
 * the end, and the time is the distance over the speed.
 */
export function planTransit(from: number, to: number, screens: number, slow: readonly PaceSpan[], s: TransitSettings): Transit {
  const touching = slow.filter((span) => span.to > from && span.from < to);
  if (touching.length === 0 || !(screens > 0) || !(to > from)) {
    return { seconds: transitSeconds(screens, s), fraction: (t) => transitFraction(t, screens, s) };
  }
  const steps = Math.max(2, Math.ceil(screens / PROFILE_STEP_SCREENS));
  const dx = screens / steps;
  const cruise = s.transitScreensPerSecond;
  const accel = s.easeSeconds > 0 ? cruise / s.easeSeconds : Infinity;
  // The limit on the speed squared at each sample: the cruise, or a span's pace where the transit is in it.
  const limit = Array.from({ length: steps + 1 }, (_, k) => {
    const p = from + (to - from) * ((k * dx) / screens);
    return touching.reduce((v, span) => (p >= span.from && p <= span.to ? Math.min(v, span.screensPerSecond) : v), cruise) ** 2;
  });
  const v2 = limit.slice();
  v2[0] = 0;
  v2[steps] = 0;
  for (let k = 1; k <= steps; k++) v2[k] = Math.min(v2[k], v2[k - 1] + 2 * accel * dx);
  for (let k = steps - 1; k >= 0; k--) v2[k] = Math.min(v2[k], v2[k + 1] + 2 * accel * dx);
  // Constant acceleration between samples, so the mean speed over a step gives its time.
  const clock = new Float64Array(steps + 1);
  for (let k = 0; k < steps; k++) clock[k + 1] = clock[k] + (2 * dx) / (Math.sqrt(v2[k]) + Math.sqrt(v2[k + 1]));
  const seconds = clock[steps];
  return {
    seconds,
    fraction(t) {
      if (t >= seconds) return 1;
      if (t <= 0) return 0;
      let lo = 0;
      let hi = steps;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (clock[mid] <= t) lo = mid;
        else hi = mid;
      }
      return Math.min(1, (lo + (t - clock[lo]) / (clock[lo + 1] - clock[lo])) / steps);
    },
  };
}
