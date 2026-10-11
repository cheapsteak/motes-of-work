// For a range of WIDE_K, how many stars' outermost planets lie past the limit their nearest neighbour would set if bound, and the hood radius.
import { readFileSync } from 'node:fs';
const html = readFileSync(new URL('../mock.html', import.meta.url), 'utf8');
const src0 = html.slice(html.indexOf('// MODEL BEGIN'), html.indexOf('// MODEL END'));
for (const k of [1.0, 1.5, 1.75, 2.0, 2.25]) {
  const src = src0.replace(/const WIDE_K = [0-9.]+;/, `const WIDE_K = ${k};`);
  const M = new Function(src + '\nreturn { buildModel, overLimit, extent };')();
  const m = M.buildModel();
  const l = M.overLimit(m.options.b);
  console.log(`K ${k}: over ${l.n}/${l.of} worst ${l.worst.toFixed(2)} hood R ${M.extent(m.options.b).toFixed(0)}`);
}
