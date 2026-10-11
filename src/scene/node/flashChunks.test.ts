import { describe, expect, it } from 'vitest';
import { LEAK } from './birth';
import { FLASH_FRAMES, FLASH_PLAN, FLASH_SWINGS } from './flashChunks';
import { flashGuard } from './flashGuard';

const FPS = LEAK.fps;

describe('the flash guard chunk plan (flashChunks.ts, drawn by e2e/defect.spec.ts)', () => {
  const plan = FLASH_PLAN;

  it('draws exactly the frames of the whole run: the first to the last, no frame outside, none left out', () => {
    expect(FLASH_FRAMES).toBe(10 * FPS);
    const drawn = new Set(plan.flatMap((c) => Array.from({ length: c.count }, (_, f) => c.from + f)));
    expect([...drawn].sort((a, b) => a - b)).toEqual(Array.from({ length: FLASH_FRAMES }, (_, f) => f));
  });

  it('owns each frame-to-frame change of the run once, inside its chunk', () => {
    const owned = plan.flatMap((c) => Array.from({ length: c.ownedTo - c.from }, (_, i) => c.from + i));
    expect(owned).toEqual(Array.from({ length: FLASH_FRAMES - 1 }, (_, i) => i));
    for (const c of plan) expect(c.ownedTo).toBeLessThanOrEqual(c.from + c.count - 1);
  });

  it('holds every window the whole run is judged by, whole, in some chunk', () => {
    // flashGuard() judges the window starting at frame f (0 <= f, f + FPS < frames) over frames f .. f + FPS.
    const lost: number[] = [];
    for (let f = 0; f + FPS < FLASH_FRAMES; f++) if (!plan.some((c) => c.from <= f && f + FPS < c.from + c.count)) lost.push(f);
    expect(lost, 'windows (by first frame) no chunk holds whole').toEqual([]);
  });

  it('is no weaker than the whole run on a burst that crosses a border: the same flashes in the worst second', () => {
    // A run of calm frames with 8 swings (a step up, a step down, ...) 4 frames apart: 4 flashes in 29
    // frames, over the 3 the guard allows. Slid over every start, the chunks together must read what the
    // whole run reads, however the burst sits against a border.
    const burst = (start: number): number[] => {
      const series = Array.from({ length: FLASH_FRAMES }, () => 1);
      for (let s = 0; s < 8; s++) for (let f = start + 4 * s + 1; f <= start + 4 * s + 4 && f < FLASH_FRAMES; f++) series[f] = s % 2 === 0 ? 1.5 : 1;
      return series;
    };
    for (let start = 0; start + 4 * 8 < FLASH_FRAMES; start++) {
      const series = burst(start);
      const whole = flashGuard(series, FPS).flashes;
      const chunked = Math.max(...plan.map((c) => flashGuard(series.slice(c.from, c.from + c.count), FPS).flashes));
      expect(whole, `the burst at frame ${start} is a breach in the whole run`).toBeGreaterThan(3);
      expect(chunked, `the burst at frame ${start}, read by the chunks`).toBe(whole);
    }
  });

  it('is cut for CI: no chunk over 100 frames (about 3 min on CI at 1.4 to 2.1 s a frame), and the 300 frames take more than one', () => {
    expect(Math.max(...plan.map((c) => c.count))).toBeLessThanOrEqual(100);
    expect(plan.length).toBeGreaterThan(1);
  });

  it('keeps the whole run\'s non-vacuity check: a floor a chunk, summing to more than the 4 swings the 10 s had to show', () => {
    for (const size of ['phone', 'desktop'] as const) {
      expect(FLASH_SWINGS[size], size).toHaveLength(plan.length);
      expect(
        FLASH_SWINGS[size].reduce((a, b) => a + b, 0),
        size,
      ).toBeGreaterThan(4);
    }
  });
});
