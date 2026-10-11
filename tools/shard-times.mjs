#!/usr/bin/env node
// Rewrites tools/shard-times.json, the durations tools/shard-list.mjs deals the e2e tests by, from the log
// of a CI run.
//
//   node tools/shard-times.mjs <run id>      # reads `gh run view <id> --log` (gh signed in, in this repo)
//   node tools/shard-times.mjs <log file>    # a saved `gh run view <id> --log` of a whole run
//
// A test's time is the one Playwright's list reporter printed for it, `✓ 8 [chromium] › e2e/x.spec.ts:1:1
// › title (3.4m)`, in seconds. The table is rewritten whole, so the log must be of a whole, green run: it
// must hold every shard job (the log of one shard would turn the other tests' entries into the median) and
// no failed test (its time is a timeout's). A skipped test has no entry and is dealt at the table's median,
// so it does not pile onto one shard if it is ever run; a test no longer in the suite drops out.
// Refresh when a run's slowest shard is more than about 2 min over the mean (the e2e step's times).
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { testKey } from './shard-list.mjs';

const TIMES = new URL('./shard-times.json', import.meta.url);
const UNIT = { ms: 0.001, s: 1, m: 60 };

/** Test name to seconds, from the passing lines of a run's log (a CI log prefixes each line with its job and time). */
export function parseDurations(log) {
  const times = {};
  for (const line of log.split('\n')) {
    const m = /✓\s+\d+ (\[[^\]]*\] › .*) \((\d+(?:\.\d+)?)(ms|s|m)\)\s*$/.exec(line);
    if (m) times[testKey(m[1])] = Math.round(Number(m[2]) * UNIT[m[3]] * 10) / 10;
  }
  return times;
}

/** Throws unless `log` is of a whole run (every `e2e shard k/n` job of it) with no failed test. */
export function checkWholeRun(log) {
  const shards = new Set();
  let total = 0;
  for (const m of log.matchAll(/^e2e shard (\d+)\/(\d+)\t/gm)) {
    shards.add(Number(m[1]));
    total = Number(m[2]);
  }
  if (total === 0) throw new Error('no `e2e shard k/n` job in the log: pass the log of a whole run (gh run view <id> --log)');
  const missing = Array.from({ length: total }, (_, k) => k + 1).filter((k) => !shards.has(k));
  if (missing.length) throw new Error(`the log holds ${shards.size} of ${total} shards (missing ${missing.join(', ')}): the table would lose the other tests`);
  if (/^.*\t.*\t.*\s✘\s+\d+ \[/m.test(log)) throw new Error('the run has a failed test: refresh from a green run');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [source] = process.argv.slice(2);
  if (!source) throw new Error('usage: node tools/shard-times.mjs <run id | log file>');
  const log = existsSync(source) ? readFileSync(source, 'utf8') : execFileSync('gh', ['run', 'view', source, '--log'], { encoding: 'utf8', maxBuffer: 512 << 20 });
  checkWholeRun(log);
  const fresh = parseDurations(log);
  const sorted = Object.fromEntries(Object.entries(fresh).sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0)));
  writeFileSync(TIMES, JSON.stringify(sorted, null, 1) + '\n');
  console.log(`${Object.keys(sorted).length} tests timed from ${source} into tools/shard-times.json`);
}
