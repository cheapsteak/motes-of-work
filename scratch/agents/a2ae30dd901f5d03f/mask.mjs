import { PNG } from '/home/user/mow-steam/node_modules/pngjs/lib/png.js';
import { readFileSync, writeFileSync } from 'node:fs';
const [src, dst] = process.argv.slice(2);
const img = PNG.sync.read(readFileSync(src));
for (let i = 0; i < img.width * img.height; i++) {
  const m = Math.max(img.data[i*4], img.data[i*4+1], img.data[i*4+2]);
  const v = m >= 250 ? 255 : m > 40 ? 70 : 0;
  img.data[i*4] = v; img.data[i*4+1] = m >= 250 ? 60 : v; img.data[i*4+2] = m >= 250 ? 60 : v;
}
writeFileSync(dst, PNG.sync.write(img));
