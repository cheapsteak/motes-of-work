import { PNG } from '<mow-steam checkout>/node_modules/pngjs/lib/png.js';
import { readFileSync } from 'node:fs';
for (const f of process.argv.slice(2)) {
  const img = PNG.sync.read(readFileSync(f));
  let sat = 0, lit = 0, sum = 0;
  for (let i = 0; i < img.width * img.height; i++) {
    const r = img.data[i*4], g = img.data[i*4+1], b = img.data[i*4+2];
    if (Math.max(r,g,b) >= 250) sat++;
    if (Math.max(r,g,b) > 40) lit++;
    sum += Math.max(0,r-11)+Math.max(0,g-13)+Math.max(0,b-18);
  }
  console.log(f.split('/').pop(), 'saturated', sat, 'lit', lit, 'sum', sum);
}
