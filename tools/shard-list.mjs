#!/usr/bin/env node
// A shard's tests, dealt by duration (CI balance). Playwright's own `--shard=k/n` cuts the ordered test
// list into n CONTIGUOUS runs of equal test count, so heavy tests that sit together in one file (the flash
// guard's chunks in e2e/defect.spec.ts) all land on one shard, however finely they are split, and a count
// says nothing of how long a test takes. This deals the list out longest first, each test to the shard with
// the least time so far, by the durations in tools/shard-times.json (refresh: tools/shard-times.mjs). A
// test the table does not name gets the table's median, so a new test is dealt and none is ever dropped; a
// name in the table that the list no longer has costs nothing. A stale table only makes the shards less
// even. Every shard job computes the same deal from the same list and table.
//
//   node tools/shard-list.mjs <shard> <total> [playwright test args...] > shard.txt
//   npx playwright test --test-list=shard.txt [the same args]
//
// Prints the shard's lines of `playwright test --list` (the format `--test-list` reads back). The args
// (spec files, --grep) select the tests dealt, so they must be the ones the run gets.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const TIMES = new URL('./shard-times.json', import.meta.url);

/** The tests `playwright test --list` printed, one per line, in its order. */
export function listedTests(output) {
  return output.split('\n').filter((line) => line.startsWith('  ['));
}

/**
 * A test's name in the table: its file and titles, `file › describe › title`, without the project, the
 * `e2e/` folder, tags, and the line and column (which move whenever a file is edited). Reads a line of
 * `--list` and a line of a run's log alike.
 */
export function testKey(line) {
  const tokens = line.trim().replace(/^\[[^\]]*\] › /, '').split(' › ');
  tokens[0] = tokens[0].replace(/^e2e\//, '').replace(/:\d+:\d+$/, '');
  // The list reporter prints a test's tags after its title (` @full-only`) in a run's log, not in `--list`.
  return tokens.join(' › ').replace(/( @[\w-]+)+$/, '');
}

/** The table's median, which a test it does not name is dealt at (1 s for an empty table: an even deal). */
export function medianTime(times) {
  const values = Object.values(times).sort((a, b) => a - b);
  return values.length === 0 ? 1 : values[Math.floor(values.length / 2)];
}

/** The `lines` dealt to `total` shards, each in its listed order: longest first onto the least loaded. */
export function dealShards(lines, total, times) {
  if (!Number.isInteger(total) || total < 1) throw new Error(`${total} shards`);
  const median = medianTime(times);
  const items = lines.map((line, index) => ({ line, index, time: times[testKey(line)] ?? median }));
  items.sort((a, b) => b.time - a.time || a.index - b.index);
  const shards = Array.from({ length: total }, () => ({ load: 0, items: [] }));
  for (const item of items) {
    const least = shards.reduce((best, s) => (s.load < best.load ? s : best));
    least.load += item.time;
    least.items.push(item);
  }
  return shards.map((s) => s.items.sort((a, b) => a.index - b.index).map((item) => item.line));
}

/** Shard `shard` (1-based) of `total`. */
export function shardOf(lines, shard, total, times) {
  if (!Number.isInteger(shard) || shard < 1 || shard > total) throw new Error(`shard ${shard} of ${total}`);
  return dealShards(lines, total, times)[shard - 1];
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [shard, total, ...args] = process.argv.slice(2);
  const out = execFileSync('npx', ['playwright', 'test', '--list', ...args], { encoding: 'utf8', maxBuffer: 64 << 20 });
  const times = existsSync(TIMES) ? JSON.parse(readFileSync(TIMES, 'utf8')) : {};
  const mine = shardOf(listedTests(out), Number(shard), Number(total), times);
  if (mine.length === 0) throw new Error(`shard ${shard} of ${total} holds no test`);
  process.stdout.write(mine.map((line) => line.trim()).join('\n') + '\n');
}
