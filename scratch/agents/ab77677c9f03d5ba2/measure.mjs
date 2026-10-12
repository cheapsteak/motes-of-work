// Exposure measurements on the shots: machine coverage, mean luminance of machine pixels, and the
// share of machine pixels that clip (>= 250 on all three channels, i.e. blown to white) or are
// desaturated-bright (>= 230 on all channels). Plus a 1.5x gain preview of two shots.
import { readFileSync, writeFileSync } from 'node:fs';
import { PNG } from '../../../node_modules/pngjs/lib/png.js';

const BG = [0x0b, 0x0d, 0x12];

function measure(file) {
  const { width, height, data } = PNG.sync.read(readFileSync(file));
  let machine = 0, lum = 0, white = 0, bright = 0, warm = 0, cool = 0;
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    const isBg = Math.abs(r - BG[0]) <= 24 && Math.abs(g - BG[1]) <= 24 && Math.abs(b - BG[2]) <= 24;
    if (isBg) continue;
    machine++;
    lum += 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (r >= 250 && g >= 250 && b >= 250) white++;
    if (r >= 230 && g >= 230 && b >= 230) bright++;
    if (r > b + 30) warm++;
    else if (b > r + 30) cool++;
  }
  return {
    coverage: (100 * machine / (width * height)).toFixed(1) + '%',
    meanLum: (lum / Math.max(1, machine)).toFixed(0),
    white: (100 * white / Math.max(1, machine)).toFixed(1) + '%',
    bright: (100 * bright / Math.max(1, machine)).toFixed(1) + '%',
    warm: (100 * warm / Math.max(1, machine)).toFixed(1) + '%',
    cool: (100 * cool / Math.max(1, machine)).toFixed(1) + '%',
  };
}

const files = process.argv.slice(2);
for (const f of files) console.log(f.replace(/.*\//, ''), JSON.stringify(measure(f)));
