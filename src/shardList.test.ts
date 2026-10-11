// The duration-aware shard dealer (tools/shard-list.mjs) and the table's refresh (tools/shard-times.mjs):
// the shards together run every listed test exactly once, whatever the table holds.
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { dealShards, listedTests, medianTime, shardOf, shardTests, testKey, verifyReadBack } from '../tools/shard-list.mjs';
import { checkWholeRun, parseDurations } from '../tools/shard-times.mjs';

const LISTING = ['Listing tests:', ...Array.from({ length: 23 }, (_, i) => `  [chromium] › f${Math.floor(i / 5)}.spec.ts:1:1 › test ${i}`), 'Total: 23 tests in 5 files'].join('\n');
const key = (i: number): string => `f${Math.floor(i / 5)}.spec.ts › test ${i}`;

describe('the shards', () => {
  const tests = listedTests(LISTING);

  it('read the listing’s test lines and no others', () => {
    expect(tests).toHaveLength(23);
    expect(tests[0]).toBe('  [chromium] › f0.spec.ts:1:1 › test 0');
  });

  it('together hold every listed test exactly once: with a full table, an empty one, a partial one, and names the list no longer has', () => {
    const full = Object.fromEntries(tests.map((_, i) => [key(i), (i * 7) % 11]));
    const partial = { [key(3)]: 90, [key(4)]: 80, 'gone.spec.ts › removed test': 500 };
    for (const times of [full, {}, partial, { ...full, 'gone.spec.ts › removed test': 999 }])
      for (const total of [1, 3, 8, 30]) {
        const dealt = dealShards(tests, total, times);
        expect(dealt).toHaveLength(total);
        expect(dealt.flat().sort()).toEqual([...tests].sort());
      }
  });

  it('deals a test the table does not name at the table’s median, and an empty table evenly', () => {
    expect(medianTime({ a: 1, b: 5, c: 9 })).toBe(5);
    expect(medianTime({})).toBe(1);
    const sizes = dealShards(tests, 8, {}).map((s) => s.length);
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
    // key(0) is 100 s, the 22 unnamed tests are dealt at 100 s too (the median of the one name is 100 s).
    const one = dealShards(tests, 8, { [key(0)]: 100 }).map((s) => s.length);
    expect(Math.max(...one) - Math.min(...one)).toBeLessThanOrEqual(1);
  });

  it('puts the longest tests on different shards and keeps the loads within the longest test of each other', () => {
    const times = Object.fromEntries(tests.map((_, i) => [key(i), i < 8 ? 200 - i : (i % 5) + 1]));
    const dealt = dealShards(tests, 8, times);
    for (let i = 0; i < 8; i++) expect(dealt.filter((s) => s.includes(tests[i]))).toHaveLength(1);
    expect(dealt.map((s) => s.filter((t) => tests.indexOf(t) < 8).length)).toEqual(Array(8).fill(1));
    const loads = dealt.map((s) => s.reduce((sum, t) => sum + times[testKey(t)], 0));
    expect(Math.max(...loads) - Math.min(...loads)).toBeLessThanOrEqual(Math.max(...Object.values(times)));
  });

  it('is the same deal every time, each shard in listed order', () => {
    const times = Object.fromEntries(tests.map((_, i) => [key(i), (i * 5) % 13]));
    expect(dealShards(tests, 8, times)).toEqual(dealShards(tests, 8, times));
    for (const s of dealShards(tests, 8, times)) expect(s.map((t) => tests.indexOf(t))).toEqual([...s.map((t) => tests.indexOf(t))].sort((a, b) => a - b));
  });

  it('refuses a shard outside 1..total', () => {
    expect(() => shardOf(tests, 0, 8, {})).toThrow();
    expect(() => shardOf(tests, 9, 8, {})).toThrow();
    expect(() => dealShards(tests, 0, {})).toThrow();
  });
});

describe('the table’s names and refresh', () => {
  const LIST_LINE = '  [chromium] › defect.spec.ts:137:7 › the defect at df-1, 390x844 › the flash guard, part 1 of 4 (phone)';
  const LOG = [
    'e2e shard 7/8\te2e:full\t2026-10-11T22:06:07.6663225Z   ✓   8 [chromium] › e2e/defect.spec.ts:197:7 › the defect at df-1, 390x844 › the flash guard, part 1 of 4 (phone) (3.4m)',
    'e2e shard 7/8\te2e:full\t2026-10-11T22:11:14.1073221Z   ✓  28 [chromium] › e2e/pages.spec.ts:180:7 › the pages › one page at a time (1440x900) @full-only (47.3s)',
    'e2e shard 7/8\te2e:full\t2026-10-11T22:13:41.9928282Z   ✓  38 [chromium] › e2e/spikes.spec.ts:41:1 › caps lists numeric limits (127ms)',
    'e2e shard 7/8\te2e:full\t2026-10-11T22:13:41.9930172Z   -  39 [chromium] › e2e/stills.spec.ts:330:3 › T6 stills, phone first',
    'e2e shard 7/8\te2e:full\t2026-10-11T22:14:27.5721995Z   38 passed (12.4m)',
  ].join('\n');

  it('names a test alike in `--list` and in a run’s log: no project, folder, line, column or tag', () => {
    expect(testKey(LIST_LINE)).toBe('defect.spec.ts › the defect at df-1, 390x844 › the flash guard, part 1 of 4 (phone)');
    expect(testKey('[chromium] › e2e/pages.spec.ts:180:7 › the pages › one page (1440x900) @full-only')).toBe('pages.spec.ts › the pages › one page (1440x900)');
  });

  it('reads a run’s log into seconds a test, with no entry for a skipped test, and nothing else', () => {
    expect(parseDurations(LOG)).toEqual({
      'defect.spec.ts › the defect at df-1, 390x844 › the flash guard, part 1 of 4 (phone)': 204,
      'pages.spec.ts › the pages › one page at a time (1440x900)': 47.3,
      'spikes.spec.ts › caps lists numeric limits': 0.1,
    });
    expect(testKey(LIST_LINE) in parseDurations(LOG)).toBe(true);
  });

  it('takes only the log of a whole green run: every shard job of it, no failed test', () => {
    const job = (k: number, n: number, rest = '') => `e2e shard ${k}/${n}\te2e:full\t2026-10-11T22:06:07.6663225Z   ✓   8 [chromium] › e2e/a.spec.ts:1:1 › t (1.0s)${rest}`;
    const whole = [job(1, 2), job(2, 2)].join('\n');
    expect(() => checkWholeRun(whole)).not.toThrow();
    expect(() => checkWholeRun(job(1, 2))).toThrow(/1 of 2 shards \(missing 2\)/);
    expect(() => checkWholeRun('  ✓   8 [chromium] › e2e/a.spec.ts:1:1 › t (1.0s)')).toThrow(/whole run/);
    expect(() => checkWholeRun(whole + '\ne2e shard 2/2\te2e:full\t2026-10-11T22:06:07Z   ✘  9 [chromium] › e2e/a.spec.ts:2:1 › u (1.0s)')).toThrow(/failed test/);
  });
});

describe('the read-back fence', () => {
  const line = (n: number, title: string) => `[chromium] › a.spec.ts:${n}:1 › ${title}`;

  it('passes when Playwright selects exactly the dealt tests, whatever line numbers its listing gives', () => {
    expect(() => verifyReadBack([line(1, 'one'), line(2, 'two')], [line(7, 'two'), line(9, 'one')])).not.toThrow();
  });

  it('fails on a test dealt but not selected, and on one selected twice', () => {
    expect(() => verifyReadBack([line(1, 'one'), line(2, 'two')], [line(1, 'one')])).toThrow(/dealt but not selected[^]*two/);
    expect(() => verifyReadBack([line(1, 'one')], [line(1, 'one'), line(5, 'one')])).toThrow(/selected but not dealt/);
  });

  // Playwright's own matcher, on a small project of its own (inside node_modules, to find @playwright/test).
  /** A project of one config and one spec file, `body` its tests; `run` gets its folder. */
  function inProject(body: string, run: (dir: string) => void): void {
    const dir = mkdtempSync(join(process.cwd(), 'node_modules', '.shard-fence-'));
    try {
      writeFileSync(join(dir, 'playwright.config.js'), "module.exports = { testDir: '.', projects: [{ name: 'chromium' }] };\n");
      writeFileSync(join(dir, 'a.spec.js'), "const { test } = require('@playwright/test');\n" + body);
      run(dir);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
  const deal = (dir: string, shard: number, total: number) => shardTests({ shard, total, args: [], times: {}, cwd: dir });

  it('reads the dealt shards of an ordinary project back whole', { timeout: 120_000 }, () => {
    inProject("test('one', () => {}); test('two', () => {}); test('three', () => {}); test('four', () => {});", (dir) => {
      expect([...deal(dir, 1, 2), ...deal(dir, 2, 2)]).toHaveLength(4);
    });
  });

  it('fails on a title Playwright cannot match: one with a ›, one with edge spaces', { timeout: 120_000 }, () => {
    inProject("test('fine', () => {}); test('a › b', () => {});", (dir) => expect(() => deal(dir, 1, 1)).toThrow(/dealt but not selected[^]*a › b/));
    inProject("test('fine', () => {}); test('trailing space ', () => {});", (dir) => expect(() => deal(dir, 1, 1)).toThrow(/dealt but not selected[^]*trailing space/));
  });

  it('hears Playwright itself refuse two tests one name reaches (a describe a with a test b, and a test a › b)', { timeout: 120_000 }, () => {
    inProject("test.describe('a', () => { test('b', () => {}); }); test('a › b', () => {});", (dir) => expect(() => deal(dir, 1, 1)).toThrow(/duplicate test title/));
  });

  it('leaves a shard dealt nothing empty rather than failing', { timeout: 120_000 }, () => {
    inProject("test('only', () => {});", (dir) => expect(deal(dir, 2, 2)).toEqual([]));
  });
});
