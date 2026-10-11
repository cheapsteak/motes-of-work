#!/usr/bin/env node
// A pixel diff of two folders of stills (the vertex task's, re-skin §7: one triangle per dot moves
// pixels only by rounding). For every PNG under the first folder, at the same relative path under the
// second: how many pixels differ, how many are lit (either image off the stage background by more than
// LIT_DELTA on a channel, as e2e/helpers.ts countNonBackground counts them), and the largest
// difference of any channel (0-255). It is kept so a later dial-down can re-check the bound.
//
//   node tools/still-diff.mjs <before> <after> [--json]
//
// Prints a table (or JSON) and the worst share and delta; exits 1 if a still is missing or a size differs.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PNG } from 'pngjs';

/** The stage's background, #0B0D12. */
const BACKGROUND = [0x0b, 0x0d, 0x12];
/** A pixel is lit when a channel is further than this from the background. */
const LIT_DELTA = 24;

/** Every PNG under `dir`, as paths relative to it, sorted. */
function pngsUnder(dir) {
  const out = [];
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name.endsWith('.png')) out.push(relative(dir, p));
    }
  };
  walk(dir);
  return out.sort();
}

const lit = (data, i) => BACKGROUND.some((b, c) => Math.abs(data[i + c] - b) > LIT_DELTA);

/** Two PNG buffers compared: differing px, lit px (in either), the largest channel delta. */
export function diffPngs(a, b) {
  const pa = PNG.sync.read(a);
  const pb = PNG.sync.read(b);
  if (pa.width !== pb.width || pa.height !== pb.height) return { sizeMismatch: true, differing: NaN, lit: NaN, maxDelta: NaN };
  let differing = 0;
  let litPx = 0;
  let maxDelta = 0;
  for (let i = 0; i < pa.data.length; i += 4) {
    let d = 0;
    for (let c = 0; c < 4; c++) d = Math.max(d, Math.abs(pa.data[i + c] - pb.data[i + c]));
    if (d > 0) differing++;
    maxDelta = Math.max(maxDelta, d);
    if (lit(pa.data, i) || lit(pb.data, i)) litPx++;
  }
  return { sizeMismatch: false, differing, lit: litPx, maxDelta };
}

/** Every still of `before` against its namesake in `after`. */
export function diffFolders(before, after) {
  return pngsUnder(before).map((file) => {
    let b;
    try {
      b = readFileSync(join(after, file));
    } catch {
      return { file, missing: true, sizeMismatch: false, differing: NaN, lit: NaN, maxDelta: NaN, share: NaN };
    }
    const d = diffPngs(readFileSync(join(before, file)), b);
    return { file, missing: false, ...d, share: d.lit > 0 ? d.differing / d.lit : d.differing > 0 ? Infinity : 0 };
  });
}

function main(argv) {
  const [before, after] = argv.filter((a) => !a.startsWith('--'));
  if (!before || !after) {
    console.error('usage: node tools/still-diff.mjs <before> <after> [--json]');
    return 2;
  }
  const rows = diffFolders(before, after);
  if (argv.includes('--json')) console.log(JSON.stringify(rows, null, 1));
  else {
    console.log('| still | differing px | lit px | share of lit | max channel delta |');
    console.log('|---|---|---|---|---|');
    for (const r of rows)
      console.log(r.missing ? `| ${r.file} | missing | | | |` : `| ${r.file} | ${r.differing} | ${r.lit} | ${(100 * r.share).toFixed(3)} % | ${r.maxDelta} |`);
  }
  const ok = rows.filter((r) => !r.missing && !r.sizeMismatch);
  const worstShare = Math.max(0, ...ok.map((r) => r.share));
  const worstDelta = Math.max(0, ...ok.map((r) => r.maxDelta));
  const changed = ok.filter((r) => r.differing > 0).length;
  console.error(`${rows.length} stills, ${changed} with any differing px; worst share ${(100 * worstShare).toFixed(3)} % of lit px, worst channel delta ${worstDelta}`);
  return rows.some((r) => r.missing || r.sizeMismatch) ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) process.exitCode = main(process.argv.slice(2));
