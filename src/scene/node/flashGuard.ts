// The flash guard (re-skin Task 8b; the defect inspector's measure(), its photosensitivity check), on a
// series of a frame's summed brightness at 30 fps. Test-only: the twin's (dropout.test.ts) and the drawn
// frames' (e2e/defect.spec.ts) read it alike, so the two count flashes the same way.
//
// A swing is a frame-to-frame change of more than SWING of the series' median; a flash is a pair of
// opposite-signed swings (a rise and a fall, as a flash is in the photosensitivity guidance): the
// inspector's ceil(flips / 2) in each window of `perSecond` frames. A scatter's own rise over three
// frames and its fall over four is one flash, however many frames each takes.

/** A swing is a change of more than this share of the median between two frames. */
export const SWING = 0.1;

/** The guard's reading of `series` (one value a frame, `perSecond` frames a second): its most flashes in any second, its swings and its range over the median. */
export function flashGuard(series: readonly number[], perSecond: number): { flashes: number; swings: number; range: [number, number] } {
  const median = [...series].sort((a, b) => a - b)[Math.floor(series.length / 2)];
  const signs: number[] = [];
  for (let f = 1; f < series.length; f++) {
    const d = series[f] - series[f - 1];
    signs.push(Math.abs(d) > SWING * median ? Math.sign(d) : 0);
  }
  let flashes = 0;
  for (let f = 0; f + perSecond <= signs.length; f++) {
    let flips = 0;
    let last = 0;
    for (let j = f; j < f + perSecond; j++) {
      if (signs[j] === 0) continue;
      if (last !== 0 && signs[j] !== last) flips++;
      last = signs[j];
    }
    flashes = Math.max(flashes, Math.ceil(flips / 2));
  }
  return { flashes, swings: signs.filter((s) => s !== 0).length, range: [Math.min(...series) / median, Math.max(...series) / median] };
}
