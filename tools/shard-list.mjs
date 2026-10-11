#!/usr/bin/env node
// A shard's tests, dealt by duration (CI balance). Playwright's own `--shard=k/n` cuts the ordered test
// list into n CONTIGUOUS runs of equal test count, so heavy tests that sit together in one file (the flash
// guard's chunks in e2e/defect.spec.ts) all land on one shard, however finely they are split, and a count
// says nothing of how long a test takes. This deals the list out longest first, each test to the shard with
// the least time so far, by the durations in tools/shard-times.json (refresh: tools/shard-times.mjs). A
// test the table does not name gets the table's median, so a new test is dealt and none is ever dropped; a
// name in the table that the list no longer has costs nothing. A stale table only makes the shards less
// even. Every shard job computes the same deal from the same list and table.
// Each shard then reads its dealt lines back through Playwright's own `--test-list` matching and fails unless
// they select exactly the tests dealt, so a test Playwright cannot match (a title with a `›`, edge spaces) is
// a loud failure, not a test that runs on no shard.
//
//   node tools/shard-list.mjs <shard> <total> [playwright test args...] > shard.txt
//   npx playwright test --test-list=shard.txt [the same args]
//
// Prints the shard's lines of `playwright test --list` (the format `--test-list` reads back), nothing for an
// empty shard, and one line on stderr. The args (spec files, --grep) select the tests dealt, so they must be
// the ones the run gets.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

/** What `playwright test --list <args>` reports, as the trimmed lines of its listing, in its order. */
export function playwrightList(args, cwd) {
  try {
    const out = execFileSync('npx', ['playwright', 'test', '--list', ...args], { encoding: 'utf8', maxBuffer: 64 << 20, cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    return listedTests(out).map((line) => line.trim());
  } catch (e) {
    throw new Error(`playwright test --list ${args.join(' ')} failed:\n${e.stderr ?? ''}${e.stdout ?? ''}`);
  }
}

/**
 * Throws unless `readBack` (what Playwright selects when given the `dealt` lines as a `--test-list`)
 * is exactly `dealt`, as multisets of lines. Playwright matches a line by its project, its file and its
 * title path split on `›` with every token trimmed (runner/loadUtils.js, loadTestList), not by line number: a
 * title that holds a `›`, or starts or ends in a space, matches no test and would silently run on no
 * shard, and two tests with one title are both selected by either: both are told here.
 */
export function verifyReadBack(dealt, readBack) {
  // By name, not by line: Playwright matches a line by project, file and titles, and the line numbers of a
  // listing are not the same from one run to the next (a cold transform cache reported shots.spec.ts at
  // other lines than a warm one).
  const count = (lines) => lines.reduce((m, l) => m.set(testKey(l), (m.get(testKey(l)) ?? 0) + 1), new Map());
  const want = count(dealt);
  const got = count(readBack);
  const missing = dealt.filter((l) => (got.get(testKey(l)) ?? 0) < want.get(testKey(l)));
  const extra = readBack.filter((l) => (want.get(testKey(l)) ?? 0) < got.get(testKey(l)));
  if (missing.length === 0 && extra.length === 0) return;
  const show = (lines) => lines.slice(0, 5).join('\n    ') + (lines.length > 5 ? `\n    ... and ${lines.length - 5} more` : '');
  throw new Error(
    `--test-list reads back ${readBack.length} tests of the ${dealt.length} dealt.` +
      (missing.length ? `\n  dealt but not selected (Playwright would run them on no shard):\n    ${show(missing)}` : '') +
      (extra.length ? `\n  selected but not dealt (two tests share a title):\n    ${show(extra)}` : ''),
  );
}

/**
 * The lines shard `shard` of `total` runs, for the `playwright test` args that select the tests. The dealt
 * lines are read back through Playwright's own `--test-list` matching and must select exactly themselves
 * (verifyReadBack): every shard checks its own, and the shards deal one partition of the list, so a test
 * that falls out of every shard fails the job of the shard that was dealt it.
 */
export function shardTests({ shard, total, args, times, cwd }) {
  const mine = shardOf(playwrightList(args, cwd), shard, total, times);
  if (mine.length === 0) return mine;
  const dir = mkdtempSync(join(tmpdir(), 'shard-list-'));
  const file = join(dir, 'shard.txt');
  try {
    writeFileSync(file, mine.map((line) => line.trim()).join('\n') + '\n');
    verifyReadBack(mine.map((line) => line.trim()), playwrightList([...args, `--test-list=${file}`], cwd));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  return mine;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [shard, total, ...args] = process.argv.slice(2);
  const times = existsSync(TIMES) ? JSON.parse(readFileSync(TIMES, 'utf8')) : {};
  const mine = shardTests({ shard: Number(shard), total: Number(total), args, times });
  if (mine.length === 0) {
    // A selection of few tests can leave a shard empty: nothing to run, and that is not an error.
    console.error(`shard-list: shard ${shard} of ${total} is dealt no test`);
  } else {
    console.error(`shard-list: shard ${shard} of ${total}: ${mine.length} tests dealt, ${mine.length} read back through --test-list: ok`);
    process.stdout.write(mine.map((line) => line.trim()).join('\n') + '\n');
  }
}
