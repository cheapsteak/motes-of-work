// The round-robin shard dealer (tools/shard-list.mjs): the shards together run every test exactly once.
import { describe, expect, it } from 'vitest';
import { listedTests, strideShard } from '../tools/shard-list.mjs';

const LISTING = ['Listing tests:', ...Array.from({ length: 23 }, (_, i) => `  [chromium] › f${Math.floor(i / 5)}.spec.ts:1:1 › test ${i}`), 'Total: 23 tests in 5 files'].join('\n');

describe('the round-robin shards', () => {
  const tests = listedTests(LISTING);

  it('reads the listing’s test lines and no others', () => {
    expect(tests).toHaveLength(23);
    expect(tests[0]).toBe('  [chromium] › f0.spec.ts:1:1 › test 0');
  });

  it('deals every test to exactly one shard', () => {
    for (const total of [1, 3, 8]) {
      const dealt = Array.from({ length: total }, (_, k) => strideShard(tests, k + 1, total));
      expect(dealt.flat().sort()).toEqual([...tests].sort());
    }
  });

  it('sends neighbours to different shards, so a heavy file spreads', () => {
    const shards = Array.from({ length: 8 }, (_, k) => strideShard(tests, k + 1, 8));
    for (let i = 0; i + 8 <= tests.length; i += 8) {
      const eight = tests.slice(i, i + 8);
      expect(shards.map((s) => eight.filter((t) => s.includes(t)).length)).toEqual(Array(8).fill(1));
    }
  });

  it('refuses a shard outside 1..total', () => {
    expect(() => strideShard(tests, 0, 8)).toThrow();
    expect(() => strideShard(tests, 9, 8)).toThrow();
  });
});
