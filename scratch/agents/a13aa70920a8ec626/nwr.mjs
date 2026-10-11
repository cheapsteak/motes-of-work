import { PNG } from '/home/user/motes-of-work/node_modules/pngjs/lib/png.js';
import { readFileSync } from 'node:fs';
const img = PNG.sync.read(readFileSync(process.argv[2]));
const t = Math.tan(20*Math.PI/180), ppu = img.height/(2*8*t);
const [gx, gy] = [(-0.9/(8*t*img.width/img.height)+1)/2*img.width, img.height/2];
let ann=0, rest=0;
for (let y=0;y<img.height;y++) for (let x=0;x<img.width;x++){const o=(y*img.width+x)*4;const r=img.data[o],g=img.data[o+1],b=img.data[o+2];
 if (!(Math.min(r,g,b)>=170&&Math.max(r,g,b)-Math.min(r,g,b)<=40)) continue; const d=Math.hypot(x-gx,y-gy)/ppu; if (d>0.38&&d<0.94) ann++; else rest++;}
console.log(process.argv[2].split('/').pop(), 'nearWhite drive-gear annulus fill', ann, 'elsewhere', rest);
