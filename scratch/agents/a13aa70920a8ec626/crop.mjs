import { PNG } from '/home/user/motes-of-work/node_modules/pngjs/lib/png.js';
import { readFileSync, writeFileSync } from 'node:fs';
const [,, src, dst, x0, y0, w, h, scale] = process.argv;
const img = PNG.sync.read(readFileSync(src)); const s = +scale;
const out = new PNG({ width: w*s, height: h*s });
for (let y=0;y<h*s;y++) for (let x=0;x<w*s;x++) { const si=((+y0+Math.floor(y/s))*img.width + (+x0+Math.floor(x/s)))*4, di=(y*w*s+x)*4; for (let k=0;k<4;k++) out.data[di+k]=img.data[si+k]; }
writeFileSync(dst, PNG.sync.write(out));
