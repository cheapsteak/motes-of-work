import { PNG } from '/home/user/motes-of-work/node_modules/pngjs/lib/png.js';
import { readFileSync } from 'node:fs';
const img = PNG.sync.read(readFileSync(process.argv[2]));
let nw = 0, sat = 0, amber = 0;
for (let i = 0; i < img.data.length; i += 4) { const r = img.data[i], g = img.data[i+1], b = img.data[i+2];
  if (Math.min(r,g,b) >= 170 && Math.max(r,g,b) - Math.min(r,g,b) <= 40) nw++; if (Math.min(r,g,b) >= 250) sat++; if (r>200&&g>=140&&g<=200&&b<120) amber++; }
console.log(process.argv[2].split('/').pop(), 'nearWhite', nw, 'white>=250', sat, 'amber', amber);
