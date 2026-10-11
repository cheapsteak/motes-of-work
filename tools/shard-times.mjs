#!/usr/bin/env node
// Rewrites tools/shard-times.json, the durations tools/shard-list.mjs deals the e2e tests by, from a CI
// run's log.
//
//   node tools/shard-times.mjs <run id>      # reads `gh run view <id> --log` (gh signed in, in this repo)
//   node tools/shard-times.mjs <log file>    # a saved log of a run, or of any shard
//
// A test's time is the one Playwright's list reporter printed for it, `✓ 8 [chromium] › e2e/x.spec.ts:1:1
// › title (3.4m)`, in seconds. A skipped test is 0 s. The table is rewritten whole from the run, so a
// test no longer in the suite drops out, and a test the run did not list is dealt at the table's median.
// Refresh when a run's slowest shard is more than about 2 min over the mean (the e2e step's times).
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { testKey } from './shard-list.mjs';

const TIMES = new URL('./shard-times.json', import.meta.url);
const UNIT = { ms: 0.001, s: 1, m: 60 };

/** Test name to seconds, from the passing and skipped (0 s) lines of a run's log (a CI log prefixes each line with its job and time). */
export function parseDurations(log) {
  const times = {};
  for (const line of log.split('\n')) {
    const m = /✓\s+\d+ (\[[^\]]*\] › .*) \((\d+(?:\.\d+)?)(ms|s|m)\)\s*$/.exec(line);
    if (m) times[testKey(m[1])] = Math.round(Number(m[2]) * UNIT[m[3]] * 10) / 10;
    else {
      const skipped = /\s-\s+\d+ (\[[^\]]*\] › .*)$/.exec(line);
      if (skipped) times[testKey(skipped[1])] = 0;
    }
  }
  return times;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [source] = process.argv.slice(2);
  if (!source) throw new Error('usage: node tools/shard-times.mjs <run id | log file>');
  const log = existsSync(source) ? readFileSync(source, 'utf8') : execFileSync('gh', ['run', 'view', source, '--log'], { encoding: 'utf8', maxBuffer: 512 << 20 });
  const fresh = parseDurations(log);
  if (Object.keys(fresh).length < 10) throw new Error(`only ${Object.keys(fresh).length} passing tests in ${source}: not a run's log`);
  const sorted = Object.fromEntries(Object.entries(fresh).sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0)));
  writeFileSync(TIMES, JSON.stringify(sorted, null, 1) + '\n');
  console.log(`${Object.keys(sorted).length} tests timed from ${source} into tools/shard-times.json`);
}
