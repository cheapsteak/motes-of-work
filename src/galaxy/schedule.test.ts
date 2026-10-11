import { describe, expect, it } from 'vitest';
import { atKeys, REVIEWER_KEYS, whenKeys } from './schedule';

describe('atKeys and whenKeys', () => {
  const keys = [
    [0.2, 1],
    [0.6, 3],
    [0.8, 3],
    [1, 4],
  ] as const;

  it('reads a track linearly between keys and holds it past either end', () => {
    expect(atKeys(keys, 0)).toBe(1);
    expect(atKeys(keys, 0.4)).toBeCloseTo(2, 12);
    expect(atKeys(keys, 0.7)).toBe(3);
    expect(atKeys(keys, 2)).toBe(4);
  });

  it('inverts a non-decreasing track at the first local that reaches a value', () => {
    expect(whenKeys(keys, 2)).toBeCloseTo(0.4, 12);
    expect(whenKeys(keys, 3)).toBeCloseTo(0.6, 12);
    expect(whenKeys(keys, 0.5)).toBe(0.2);
    expect(whenKeys(keys, 5)).toBeNull();
    for (const y of [0, 0.3, 0.55, 0.9, 1.1]) expect(atKeys(REVIEWER_KEYS.review, whenKeys(REVIEWER_KEYS.review, y)!)).toBeCloseTo(y, 12);
  });

  it('has the reviewer section rising on both tracks (§2.6)', () => {
    for (const track of [REVIEWER_KEYS.review, REVIEWER_KEYS.growth]) {
      for (let i = 1; i < track.length; i++) {
        expect(track[i][0]).toBeGreaterThan(track[i - 1][0]);
        expect(track[i][1]).toBeGreaterThan(track[i - 1][1]);
      }
    }
  });
});
