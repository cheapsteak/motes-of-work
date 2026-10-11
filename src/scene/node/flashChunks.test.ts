import { describe, expect, it } from 'vitest';
import { LEAK } from './birth';
import { FLASH_FRAMES, FLASH_PLAN, FLASH_SWINGS, FLASH_TOLERANCE, readChunk, type FlashChunk } from './flashChunks';
import { flashGuard, medianOf } from './flashGuard';

const FPS = LEAK.fps;
/** A reference median for the synthetic series (the real ones are in flashChunks.ts). */
const REF = 1000;

/** What the chunks of the plan read of a whole-run `series`: the worst flashes, the swings summed, each part's median over REF. */
function readAll(series: readonly number[], reference = REF): { flashes: number; swings: number; ratios: number[] } {
  const readings = FLASH_PLAN.map((c) => readChunk(series.slice(c.from, c.from + c.count), c, reference));
  return { flashes: Math.max(...readings.map((r) => r.flashes)), swings: readings.reduce((n, r) => n + r.swings, 0), ratios: readings.map((r) => r.medianRatio) };
}

describe('the flash guard chunk plan (flashChunks.ts, drawn by e2e/defect.spec.ts)', () => {
  const plan = FLASH_PLAN;

  it('draws exactly the frames of the whole run: the first to the last, no frame outside, none left out', () => {
    expect(FLASH_FRAMES).toBe(10 * FPS);
    const drawn = new Set(plan.flatMap((c) => Array.from({ length: c.count }, (_, f) => c.from + f)));
    expect([...drawn].sort((a, b) => a - b)).toEqual(Array.from({ length: FLASH_FRAMES }, (_, f) => f));
  });

  it('owns each frame-to-frame change of the run once, inside its chunk, and parts the frames once', () => {
    const owned = plan.flatMap((c) => Array.from({ length: c.ownedTo - c.from }, (_, i) => c.from + i));
    expect(owned).toEqual(Array.from({ length: FLASH_FRAMES - 1 }, (_, i) => i));
    for (const c of plan) expect(c.ownedTo).toBeLessThanOrEqual(c.from + c.count - 1);
    const parts = plan.flatMap((c) => Array.from({ length: c.partTo - c.from }, (_, i) => c.from + i));
    expect(parts).toEqual(Array.from({ length: FLASH_FRAMES }, (_, i) => i));
    for (const c of plan) expect(c.partTo).toBeLessThanOrEqual(c.from + c.count);
  });

  it('holds every window the whole run is judged by, whole, in some chunk', () => {
    // flashGuard() judges the window starting at frame f (0 <= f, f + FPS < frames) over frames f .. f + FPS.
    const lost: number[] = [];
    for (let f = 0; f + FPS < FLASH_FRAMES; f++) if (!plan.some((c) => c.from <= f && f + FPS < c.from + c.count)) lost.push(f);
    expect(lost, 'windows (by first frame) no chunk holds whole').toEqual([]);
  });

  it('reads a burst that crosses a border as the whole run does: the same flashes in the worst second', () => {
    // A run of calm frames with 8 swings (a step up, a step down, ...) 4 frames apart: 4 flashes in 29
    // frames, over the 3 the guard allows. Slid over every start, the chunks together must read what the
    // whole run reads, however the burst sits against a border.
    const burst = (start: number): number[] => {
      const series = Array.from({ length: FLASH_FRAMES }, () => REF);
      for (let s = 0; s < 8; s++) for (let f = start + 4 * s + 1; f <= start + 4 * s + 4 && f < FLASH_FRAMES; f++) series[f] = s % 2 === 0 ? 1.5 * REF : REF;
      return series;
    };
    for (let start = 0; start + 4 * 8 < FLASH_FRAMES; start++) {
      const series = burst(start);
      const whole = flashGuard(series, FPS).flashes;
      expect(whole, `the burst at frame ${start} is a breach in the whole run`).toBeGreaterThan(3);
      expect(readAll(series).flashes, `the burst at frame ${start}, read by the chunks`).toBe(whole);
    }
  });

  it('is cut for CI: no chunk over 100 frames (about 3 min on CI at 1.4 to 2.1 s a frame), and the 300 frames take more than one', () => {
    expect(Math.max(...plan.map((c) => c.count))).toBeLessThanOrEqual(100);
    expect(plan.length).toBeGreaterThan(1);
  });
});

describe('the chunks are judged against one reference, never their own median', () => {
  /** `plateau` (frames of a calm level) with 4 flashes laid in the second chunk: 8 steps of `step`, 4 frames apart. */
  const marginal = (calm: number, step: number): number[] => {
    const series = Array.from({ length: FLASH_FRAMES }, () => calm);
    for (let s = 0; s < 8; s++) for (let f = 90 + 4 * s + 1; f <= 90 + 4 * s + 4; f++) series[f] = s % 2 === 0 ? calm + step : calm;
    return series;
  };

  it('counts marginal swings that sit over the reference line but under the line of a chunk whose calm level is up by 2 %', () => {
    // The calm level is 1020 for a reference of 1000, so the chunk's own median is 1020 (2 % over, within
    // the tolerance) and a swing of 99.5 is 0.0975 of it: not a swing at the chunk's median (102), a swing at
    // the strict line (97). Four flashes of them breach the bound, which a chunk's own median lets through.
    const series = marginal(1.02 * REF, 0.0995 * REF);
    const chunk = FLASH_PLAN[1];
    expect(flashGuard(series.slice(chunk.from, chunk.from + chunk.count), FPS).flashes, 'at its own median').toBe(0);
    expect(readChunk(series.slice(chunk.from, chunk.from + chunk.count), chunk, REF).flashes, 'against the reference').toBeGreaterThan(3);
    expect(readAll(series).flashes).toBeGreaterThan(3);
    // Nothing else read differently: the run is calm but for the burst, and its median is the calm level.
    expect(medianOf(series)).toBeCloseTo(1.02 * REF);
    expect(Math.abs(readAll(series).ratios[1] - 1)).toBeLessThanOrEqual(FLASH_TOLERANCE);
  });

  it('counts swings for the floors at the lax line: 0.101 of the reference is not a swing there, 0.105 is', () => {
    // A swing of 0.101 of the reference is over the whole run's line at a calm level of the reference, and
    // under the lax line (0.103): not counted for the floors. 0.105 is counted.
    const count = (step: number) => FLASH_PLAN.reduce((n, c) => n + readChunk(marginal(REF, step * REF).slice(c.from, c.from + c.count), c, REF).swings, 0);
    expect(count(0.101)).toBe(0);
    expect(count(0.105)).toBeGreaterThan(0);
  });

  it('reports a part whose median has moved past the tolerance, for the test to fail on', () => {
    const moved = readAll(marginal(1.05 * REF, 0.5 * REF));
    expect(moved.ratios.some((r) => Math.abs(r - 1) > FLASH_TOLERANCE)).toBe(true);
    expect(readAll(marginal(REF, 0.5 * REF)).ratios.every((r) => Math.abs(r - 1) <= FLASH_TOLERANCE)).toBe(true);
  });

  it('puts the whole run’s median between the medians of the parts, which is why the strict line is under the whole run’s', () => {
    // The parts partition the frames; a seeded generator with ties and spikes stands for the luminance.
    let seed = 12345;
    const next = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    for (let trial = 0; trial < 300; trial++) {
      const series = Array.from({ length: FLASH_FRAMES }, () => Math.floor(next() * (trial % 3 === 0 ? 4 : 1000)) + (next() < 0.1 ? 5000 : 0));
      const medians = FLASH_PLAN.map((c: FlashChunk) => medianOf(series.slice(c.from, c.partTo)));
      expect(medianOf(series)).toBeGreaterThanOrEqual(Math.min(...medians));
      expect(medianOf(series)).toBeLessThanOrEqual(Math.max(...medians));
    }
  });

  it('keeps the whole run’s non-vacuity check: a floor a chunk, summing to more than the 4 swings the 10 s had to show', () => {
    for (const size of ['phone', 'desktop'] as const) {
      expect(FLASH_SWINGS[size], size).toHaveLength(FLASH_PLAN.length);
      expect(FLASH_SWINGS[size].reduce((a, b) => a + b, 0), size).toBeGreaterThan(4);
    }
  });
});
