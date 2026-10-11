#!/usr/bin/env node
// A shard's tests, dealt round-robin (CI balance). Playwright's own `--shard=k/n` cuts the ordered test
// list into n CONTIGUOUS runs of equal test count, so a run of heavy tests that sit together in one file
// (the flash guard's chunks in e2e/defect.spec.ts) all land on one shard, however finely they are split.
// This deals the same list out one test at a time instead: test i goes to shard (i mod n) + 1, so
// neighbours go to different shards and a heavy file spreads over all of them.
//
//   node tools/shard-list.mjs <shard> <total> [playwright test args...] > shard.txt
//   npx playwright test --test-list=shard.txt [the same args]
//
// Prints the shard's lines of `playwright test --list` (the format `--test-list` reads back). The args
// (spec files, --grep) select the tests dealt, so they must be the ones the run gets.
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

/** The tests `playwright test --list` printed, one per line, in its order. */
export function listedTests(output) {
  return output.split('\n').filter((line) => line.startsWith('  ['));
}

/** The lines shard `shard` (1-based) of `total` gets: every `total`-th, from its own. */
export function strideShard(lines, shard, total) {
  if (!Number.isInteger(total) || total < 1 || !Number.isInteger(shard) || shard < 1 || shard > total) throw new Error(`shard ${shard} of ${total}`);
  return lines.filter((_, i) => i % total === shard - 1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [shard, total, ...args] = process.argv.slice(2);
  const out = execFileSync('npx', ['playwright', 'test', '--list', ...args], { encoding: 'utf8', maxBuffer: 64 << 20 });
  const mine = strideShard(listedTests(out), Number(shard), Number(total));
  if (mine.length === 0) throw new Error(`shard ${shard} of ${total} holds no test`);
  process.stdout.write(mine.map((line) => line.trim()).join('\n') + '\n');
}
