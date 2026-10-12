// The flash guard's chunk plan (CI balance; test-only, beside flashGuard.ts). The drawn flash guard
// (e2e/defect.spec.ts) draws 300 frames, 10 s at 30 fps, a size: about 8 min on CI, which held one shard
// 4 min past the rest. The run is cut into chunks, each its own test, so the shards can spread them.
//
// WINDOWS. flashGuard() counts flashes in windows of `perSecond` swings, a swing being the change between
// two neighbouring frames: the window starting at frame f reads frames f .. f + perSecond (one more frame
// than a second holds). A chunk can only judge a window it holds whole, so neighbouring chunks overlap
// by `perSecond` frames: the first window the next chunk can judge starts where the last one the
// previous chunk could judge ends, plus one. flashChunks.test.ts proves it for every window.
//
// THE LINE. flashGuard() takes a swing as 10 % of the median of the series it is given, so a chunk judged
// at its own median would judge at another line than the whole run: a swing within a few percent of the
// line can change sides. Every chunk is judged against one reference instead, FLASH_REFERENCE, the median
// of the whole 300 frames of the size (measured when this was written, below), as follows.
//   - Flashes: at the line 10 % of reference x (1 - FLASH_TOLERANCE). The whole run is judged at 10 % of its
//     own median M. Each chunk asserts that the median of the frames it owns is within FLASH_TOLERANCE of the
//     reference. The owned frames of the chunks partition the run, and the median of a union lies between the
//     smallest and the largest median of its parts (flashChunks.test.ts checks it on random series), so M
//     >= reference x (1 - FLASH_TOLERANCE) when every chunk passes: the chunks' line is at or under the
//     whole run's. A lower line makes every swing of a higher one a swing too, and adding swings to a
//     sequence never lowers its count of reversals (a swing inserted between a rise and a fall, or at
//     either end, adds at least what it removes: nothing), so flashes counted at the chunks' line are at
//     least those the whole run counts. Every window is judged (WINDOWS), so chunks that all pass
//     (<= 3 flashes) imply the whole run passes: no weaker. A render that moves the median by more
//     than FLASH_TOLERANCE fails the median assertion, loudly, instead of shifting the line unseen.
//   - Swings (non-vacuity): at the line 10 % of reference x (1 + FLASH_TOLERANCE), the same argument the
//     other way: M <= reference x (1 + FLASH_TOLERANCE), so the whole run's line is at or under this one,
//     and a swing counted here is counted there. Floors that sum to more than 4 (the whole run's bar) over
//     the chunks' owned changes, which tile the run, imply more than 4 swings in the whole run.
import { LEAK } from './birth';
import { flashGuard, medianOf } from './flashGuard';

/** The frames of the whole run: 10 s at 30 fps. */
export const FLASH_FRAMES = 10 * LEAK.fps;
/**
 * The chunks the run is cut into. A frame costs 1.4 to 2.1 s on a CI runner (the whole run, 300 frames,
 * took 8 min before) and a chunk of 98 frames 2.3 to 3.7 min, 3.2 on average, with its page set up: about
 * the 3 min a chunk is sized to.
 */
export const FLASH_CHUNKS = 4;

/**
 * A chunk: `count` frames from frame `from` (frame f is drawn at ambient t0 + f / fps). The frames
 * `from` .. `partTo` - 1 are its part: the parts of the chunks partition the run. The frame-to-frame changes
 * from frame `from` to frame `ownedTo` are its own: they tile the run's changes, so a swing is counted
 * once however the chunks overlap.
 */
export interface FlashChunk {
  from: number;
  count: number;
  partTo: number;
  ownedTo: number;
}

/** `total` frames cut into `chunks` chunks of equal stride, neighbours sharing `overlap` frames. */
export function flashChunks(total: number, chunks: number, overlap: number): FlashChunk[] {
  const stride = Math.ceil((total - overlap) / chunks);
  return Array.from({ length: chunks }, (_, k) => {
    const from = k * stride;
    const last = k === chunks - 1;
    return { from, count: Math.min(total, from + stride + overlap) - from, partTo: last ? total : from + stride, ownedTo: last ? total - 1 : from + stride };
  });
}

/** The plan e2e/defect.spec.ts draws: `FLASH_CHUNKS` chunks sharing `LEAK.fps` frames, the window flashGuard() judges. */
export const FLASH_PLAN: FlashChunk[] = flashChunks(FLASH_FRAMES, FLASH_CHUNKS, LEAK.fps);

/**
 * How far from the reference the median of a chunk's part may lie, and how far the line is moved the strict
 * way for it. The measured parts lay within 1.1 % of the reference; on the render with the planets'
 * terminator and far side (re-skin Task 7) they lie within 2.8 % (phone 1.0084, 1.0221, 0.9869, 0.9725;
 * desktop 1.0088, 1.0217, 0.9889, 0.9720). 3 % leaves room for a render that differs a little, and moves the
 * line less than the swings sit from it (swings at 0.100 to 0.139 of the median were measured, 0.097 is the
 * lowest line judged).
 */
export const FLASH_TOLERANCE = 0.03;

/**
 * The median of the summed luminance of C1's box over all 300 frames of the size (the series of
 * e2e/defect.spec.ts), measured by drawing the whole run in one test. First measured before it was cut into
 * chunks (911861 phone, 1051373 desktop: swings 8 and 10, flashes 0 and 1, range 0.922-1.274 and
 * 0.918-1.282 of the median; CI's run 38174324079). Re-measured for the planets' terminator and far side
 * (re-skin Task 7), which shade C1 by design and lower its box's light by about a third: every frame of the
 * run drawn in one throwaway test at 1x on SwiftShader, as the chunks draw them. The whole run, at its own
 * line: phone 11 swings, 1 flash, range 0.920-1.294; desktop 10 swings, 1 flash, range 0.912-1.303. Each
 * chunk prints its part's median on the test, to read the reference off a CI run again.
 */
export const FLASH_REFERENCE: Record<'phone' | 'desktop', number> = { phone: 603061, desktop: 695806 };

/**
 * The swings (changes over 10 % of the reference x (1 + FLASH_TOLERANCE)) each chunk must own, per size.
 * Measured at that line over the four chunks, on the render with the planets' terminator and far side
 * (re-skin Task 7; before it, phone 3, 3, 2, 0 and desktop 2, 3, 2, 1): phone 4, 3, 3, 0; desktop 3, 3, 3, 0
 * (the whole run, at its own line: 11 and 10). Each floor is the measured count less one, kept at 1 where
 * the count is 1, so that a size's floors sum to 7 (phone) and 6 (desktop), over the whole run's bar of 4.
 * The last stretch has no swing at either size (the scatter rises there more slowly than a swing a frame):
 * its floor is 0, and the rise check guards it.
 */
export const FLASH_SWINGS: Record<'phone' | 'desktop', number[]> = { phone: [3, 2, 2, 0], desktop: [2, 2, 2, 0] };

/** What a chunk's frames read as, judged against `reference`. */
export interface ChunkReading {
  /** The most flashes in any 1 s window the chunk holds, at the strict line. */
  flashes: number;
  /** The swings of the changes the chunk owns, at the lax line. */
  swings: number;
  /** The median of the chunk's part (its part of the partition, FlashChunk.partTo). */
  partMedian: number;
  /** The median of the chunk's part over the reference: within 1 +- FLASH_TOLERANCE, or the render has moved. */
  medianRatio: number;
  /** The brightest frame over the reference: the scatter must lift the piece by more than a swing's share. */
  rise: number;
}

/** A chunk's `sums` (its `count` frames) judged against `reference`: see the file's comment. */
export function readChunk(sums: readonly number[], chunk: FlashChunk, reference: number): ChunkReading {
  const partMedian = medianOf(sums.slice(0, chunk.partTo - chunk.from));
  return {
    partMedian,
    flashes: flashGuard(sums, LEAK.fps, reference * (1 - FLASH_TOLERANCE)).flashes,
    swings: flashGuard(sums.slice(0, chunk.ownedTo - chunk.from + 1), LEAK.fps, reference * (1 + FLASH_TOLERANCE)).swings,
    medianRatio: partMedian / reference,
    rise: Math.max(...sums) / reference,
  };
}
