import { PNG } from '/home/user/motes-of-work/node_modules/pngjs/lib/png.js';
import { readFileSync } from 'node:fs';
const img = PNG.sync.read(readFileSync(process.argv[2]));
const ppu = img.height / (2 * 8 * Math.tan(20 * Math.PI / 180));
const proj = (x, y) => [(x / (8*Math.tan(20*Math.PI/180)*img.width/img.height) + 1) / 2 * img.width, (1 - y / (8*Math.tan(20*Math.PI/180))) / 2 * img.height];
function region(name, cx, cy, r0, r1) {
  const [px, py] = proj(cx, cy); let n=0, s=[0,0,0], amber=0, sat=0; const hist=[];
  for (let y=0;y<img.height;y++) for (let x=0;x<img.width;x++) {
    const d = Math.hypot(x-px, y-py)/ppu; if (d<r0||d>r1) continue;
    const o=(y*img.width+x)*4; const c=[img.data[o],img.data[o+1],img.data[o+2]];
    n++; s=s.map((v,i)=>v+c[i]); if (c[0]>200&&c[1]>=140&&c[1]<=200&&c[2]<120) amber++; if (Math.min(...c)>=250) sat++;
  }
  console.log(name, 'n', n, 'mean', s.map(v=>Math.round(v/n)), 'amber', amber, 'white', sat);
}
region('gear-annulus', -0.9, 0, 0.4, 0.9);
region('gear-hole', -0.9, 0, 0, 0.3);
region('frame-corner', -1.9, 1.2, 0, 0.15);
region('crank', 1.4, 0, 0, 0.08);
