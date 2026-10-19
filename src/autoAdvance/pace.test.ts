import { describe, expect, it } from 'vitest';
import { AUTO_ADVANCE } from '../config';
import { sectionSpans } from '../scroll/progress';
import { loadStory } from '../story/loader';
import { progressOfSectionAt, KeyframeSampler, type KeyframeFile } from '../timeline/keyframeSampler';
import keyframes from '../timeline/keyframes.json';
import { fixPace, planTransit, type PaceSpan } from './pace';
import { autoStops, sceneMotion, transitFraction, transitSeconds } from './plan';

const file = keyframes as unknown as KeyframeFile;
const story = loadStory();
const spans = sectionSpans(story);
const sampler = new KeyframeSampler(file, spans);
const stops = autoStops(story, spans, (p) => sceneMotion(sampler.sample(p)));
const screens = story.reduce((n, s) => n + s.length, 0);
const slow = fixPace(file, spans, AUTO_ADVANCE);
const defect = spans.find((s) => s.id === 'defect')!;
const at = (local: number) => defect.start + local * (defect.end - defect.start);

/** The transit from stop `i - 1` to stop `i`, at the settings the essay ships with. */
const transit = (i: number, paces: readonly PaceSpan[] = slow) => {
  const from = stops[i - 1].progress;
  const to = stops[i].progress;
  return planTransit(from, to, (to - from) * screens, paces, AUTO_ADVANCE);
};
const intoDf2b = stops.findIndex((s) => s.id === 'df-2b');

/** Seconds into a transit at which it reaches progress `p` (the transit is monotonic; found by halving). */
function timeAt(i: number, p: number, paces: readonly PaceSpan[] = slow): number {
  const t = transit(i, paces);
  const from = stops[i - 1].progress;
  const to = stops[i].progress;
  let lo = 0;
  let hi = t.seconds;
  for (let k = 0; k < 60; k++) {
    const mid = (lo + hi) / 2;
    if (from + (to - from) * t.fraction(mid) < p) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** The fix's own keys (net.fix, defect-local): the landing from 0.36, the glow from 0.374, the mend from 0.388 to 0.404. */
const LAND = [0.36, 0.374];
const GLOW = [0.374, 0.388];
const MEND = [0.388, 0.404];
const seconds = ([a, b]: number[]) => timeAt(intoDf2b, at(b)) - timeAt(intoDf2b, at(a));

describe('the fix span, from the story’s own keys', () => {
  it('runs from the first key of net.fix to the key that releases the held frame', () => {
    expect(slow).toHaveLength(1);
    expect(slow[0].from).toBeCloseTo(at(0.36), 12);
    expect(slow[0].to).toBeCloseTo(at(0.405), 12);
    expect(slow[0].screensPerSecond).toBe(AUTO_ADVANCE.fixScreensPerSecond);
  });

  it('follows its keys: moving them moves the span', () => {
    const moved: KeyframeFile = {
      tracks: {
        'net.fix': [{ at: 'defect@0.5', value: 0 }, { at: 'defect@0.6', value: 1 }],
        'freeze.hold': [{ at: 'defect@0.4', value: 1 }, { at: 'defect@0.7', value: 0 }],
      },
    };
    const [span] = fixPace(moved, spans, AUTO_ADVANCE);
    expect(span.from).toBeCloseTo(progressOfSectionAt('defect@0.5', spans), 12);
    expect(span.to).toBeCloseTo(progressOfSectionAt('defect@0.7', spans), 12);
  });

  it('refuses a keyframe file without the keys it is read from', () => {
    expect(() => fixPace({ tracks: {} }, spans, AUTO_ADVANCE)).toThrow(/net\.fix/);
  });
});

describe('the transit into df-2b at auto pace (the author: the gold lands, glows "for a little bit", then mends)', () => {
  it('is the transit that crosses the whole fix span: it starts before it and ends after it', () => {
    expect(intoDf2b).toBeGreaterThan(0);
    expect(stops[intoDf2b - 1].progress).toBeLessThan(at(LAND[0]));
    expect(stops[intoDf2b].progress).toBeGreaterThan(at(0.405));
  });

  it('spends at least 0.3 s in the glow (it was 0.13 s)', () => {
    expect(seconds(GLOW)).toBeGreaterThanOrEqual(0.3);
  });

  it('gives the landing and the mend at least 0.3 s each (they were 0.23 s and 0.13 s)', () => {
    expect(seconds(LAND)).toBeGreaterThanOrEqual(0.3);
    expect(seconds(MEND)).toBeGreaterThanOrEqual(0.3);
  });

  it('takes longer than the plain transit, and gets to the span’s start no earlier', () => {
    const was = transitSeconds((stops[intoDf2b].progress - stops[intoDf2b - 1].progress) * screens, AUTO_ADVANCE);
    expect(transit(intoDf2b).seconds).toBeGreaterThan(was);
    expect(timeAt(intoDf2b, at(0.36))).toBeGreaterThanOrEqual(timeAt(intoDf2b, at(0.36), []));
  });

  it('never scrolls faster than the fix pace inside the span, and arrives', () => {
    const t = transit(intoDf2b);
    const from = stops[intoDf2b - 1].progress;
    const to = stops[intoDf2b].progress;
    const speed = (s: number) => (((t.fraction(s + 1e-3) - t.fraction(s)) * (to - from)) / 1e-3) * screens;
    let last = 0;
    for (let s = 0; s < t.seconds; s += 0.005) {
      const f = t.fraction(s);
      expect(f).toBeGreaterThanOrEqual(last);
      last = f;
      const p = from + (to - from) * f;
      if (p >= slow[0].from && p <= slow[0].to) expect(speed(s)).toBeLessThanOrEqual(AUTO_ADVANCE.fixScreensPerSecond * 1.02);
    }
    expect(t.fraction(0)).toBe(0);
    expect(t.fraction(t.seconds)).toBe(1);
    expect(t.fraction(t.seconds + 1)).toBe(1);
  });
});

describe('every other transit is timed exactly as before', () => {
  it('times every other transit as the plain trapezoid, sample for sample', () => {
    let others = 0;
    for (let i = 1; i < stops.length; i++) {
      if (i === intoDf2b) continue;
      const from = stops[i - 1].progress;
      const to = stops[i].progress;
      const length = (to - from) * screens;
      const t = transit(i);
      expect(t.seconds, stops[i].id).toBe(transitSeconds(length, AUTO_ADVANCE));
      for (let k = 0; k <= 20; k++) {
        const s = (t.seconds * k) / 20;
        expect(t.fraction(s), `${stops[i].id} at ${s}`).toBe(transitFraction(s, length, AUTO_ADVANCE));
      }
      others++;
    }
    expect(others).toBe(stops.length - 2);
  });
});

describe('planTransit on a made-up transit', () => {
  const settings = { transitScreensPerSecond: 0.6, easeSeconds: 0.5 };
  const none = planTransit(0, 0.5, 2, [], settings);

  it('is the plain trapezoid when no span touches it', () => {
    expect(none.seconds).toBe(transitSeconds(2, settings));
    for (const s of [0, 0.2, 1, 2, 3, 99]) expect(none.fraction(s)).toBe(transitFraction(s, 2, settings));
    const away: PaceSpan[] = [{ from: 0.5, to: 0.9, screensPerSecond: 0.1 }, { from: -1, to: 0, screensPerSecond: 0.1 }];
    expect(planTransit(0, 0.5, 2, away, settings).seconds).toBe(none.seconds);
  });

  it('brakes into a span and speeds up out of it at the ease, and crosses it at its pace', () => {
    // 4 screens with 0.8 of them at 0.2 (4 s). Each side: 0.5 s up to 0.6 (0.15 screens), cruise 1.3167 screens
    // (2.194 s), 0.333 s down to 0.2 (0.1333 screens), and the same mirrored at the far end: 2 x 3.028 s + 4 s.
    const slowMiddle = planTransit(0, 1, 4, [{ from: 0.4, to: 0.6, screensPerSecond: 0.2 }], settings);
    expect(slowMiddle.seconds).toBeCloseTo(10.0556, 1);
  });

  it('is not made faster by a fix pace above the cruise', () => {
    const fast = planTransit(0, 0.5, 2, [{ from: 0, to: 0.5, screensPerSecond: 50 }], settings);
    expect(fast.seconds).toBeCloseTo(none.seconds, 2);
  });

  it('jumps straight to the end for a zero distance', () => {
    const empty = planTransit(0.2, 0.2, 0, [{ from: 0, to: 1, screensPerSecond: 0.1 }], settings);
    expect(empty.seconds).toBe(0);
    expect(empty.fraction(0)).toBe(1);
  });

  it('is eased at both ends', () => {
    const t = planTransit(0, 1, 4, [{ from: 0, to: 1, screensPerSecond: 0.2 }], settings);
    const speed = (s: number) => ((t.fraction(s + 1e-3) - t.fraction(s)) * 4) / 1e-3;
    expect(speed(0.01)).toBeLessThan(0.05);
    expect(speed(t.seconds - 0.011)).toBeLessThan(0.05);
    expect(speed(t.seconds / 2)).toBeCloseTo(0.2, 2);
  });
});
