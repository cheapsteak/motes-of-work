// usage: node sheet.mjs out.png cols in1.png in2.png ...  (each input halved, box filter)
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
const require = createRequire(new URL('../../../package.json', import.meta.url));
const { PNG } = require('pngjs');
const [out, colsS, ...ins] = process.argv.slice(2);
const cols = Number(colsS);
const imgs = ins.map((f) => PNG.sync.read(readFileSync(f)));
const w = Math.floor(imgs[0].width / 2), h = Math.floor(imgs[0].height / 2);
const rows = Math.ceil(imgs.length / cols);
const o = new PNG({ width: w * cols, height: h * rows });
imgs.forEach((im, k) => {
  const ox = (k % cols) * w, oy = Math.floor(k / cols) * h;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 4; c++) {
    let s = 0;
    for (const [dx, dy] of [[0,0],[1,0],[0,1],[1,1]]) s += im.data[((2*y+dy) * im.width + 2*x+dx) * 4 + c];
    o.data[((oy + y) * o.width + ox + x) * 4 + c] = c === 3 ? 255 : s / 4;
  }
});
writeFileSync(out, PNG.sync.write(o));
