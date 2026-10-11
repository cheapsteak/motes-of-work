// The flash guard's chunk plan (CI balance; test-only, beside flashGuard.ts). The drawn flash guard
// (e2e/defect.spec.ts) draws 300 frames, 10 s at 30 fps, a size: about 8 min on CI, which held one shard
// 4 min past the rest. The run is cut into chunks, each its own test, so the shards can spread them.
//
// flashGuard() counts flashes in windows of `perSecond` swings, a swing being the change between two
// neighbouring frames: the window starting at frame f reads frames f .. f + perSecond (one more frame
// than a second holds). A chunk can only judge a window it holds whole, so neighbouring chunks overlap
// by `perSecond` frames: the first window the next chunk can judge starts where the last one the
// previous chunk could judge ends, plus one. flashChunks.test.ts proves it for every window.
import { LEAK } from './birth';

/** The frames of the whole run: 10 s at 30 fps. */
export const FLASH_FRAMES = 10 * LEAK.fps;
/**
 * The chunks the run is cut into. A frame costs 1.4 to 2.1 s on a CI runner (the whole run, 300 frames,
 * took 8 min before) and a chunk of 98 frames 2.3 to 3.7 min, 3.2 on average, with its page set up: about
 * the 3 min a chunk is sized to. Four chunks also fall one to a shard of the 8 (e2e/defect.spec.ts).
 */
export const FLASH_CHUNKS = 4;

/**
 * A chunk: `count` frames from frame `from` (frame f is drawn at ambient t0 + f / fps). It owns the
 * frame-to-frame changes from frame `from` to frame `ownedTo` (the next chunk's first frame; the run's last
 * frame for the last chunk): the owned spans tile the run's changes, so a swing is counted once
 * however the chunks overlap.
 */
export interface FlashChunk {
  from: number;
  count: number;
  ownedTo: number;
}

/** `total` frames cut into `chunks` chunks of equal stride, neighbours sharing `overlap` frames. */
export function flashChunks(total: number, chunks: number, overlap: number): FlashChunk[] {
  const stride = Math.ceil((total - overlap) / chunks);
  return Array.from({ length: chunks }, (_, k) => {
    const from = k * stride;
    return { from, count: Math.min(total, from + stride + overlap) - from, ownedTo: k === chunks - 1 ? total - 1 : from + stride };
  });
}

/** The plan e2e/defect.spec.ts draws: `FLASH_CHUNKS` chunks sharing `LEAK.fps` frames, the window flashGuard() judges. */
export const FLASH_PLAN: FlashChunk[] = flashChunks(FLASH_FRAMES, FLASH_CHUNKS, LEAK.fps);

/**
 * The swings (changes over 10 % of the median, flashGuard.ts) each chunk must own, per size: the drawn
 * run's measured count less one, at each chunk's own median. Measured here (the whole run's 8 and 10 swings are CI's too: phone 3, 3, 2,
 * 0 over the four chunks: 8 in all; desktop 2, 3, 3, 1: 9 owned, 10 in the whole run, the median of a
 * stretch moving a marginal swing across the 10 % line). The whole run's check was more than 4 in 10 s:
 * a size's floors sum to 5, so the chunks that meet theirs together meet it.
 */
export const FLASH_SWINGS: Record<'phone' | 'desktop', number[]> = { phone: [2, 2, 1, 0], desktop: [1, 2, 2, 0] };
