// Probes the page's camera and the projected spread of the spots.
import { chromium } from '../../../../node_modules/playwright/index.mjs';
const [url] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
await p.goto(url);
await p.waitForFunction(() => window.__mock, null, { timeout: 20000 });
console.log(await p.evaluate(() => {
  const m = window.__mock; const out = {};
  for (const k of ['a', 'b', 'c', 'd']) {
    const us = m.MODEL.options[k];
    const xs = us.map((u) => u.x), zs = us.map((u) => u.z);
    out[k] = { n: us.length, x: [Math.min(...xs).toFixed(0), Math.max(...xs).toFixed(0)], z: [Math.min(...zs).toFixed(0), Math.max(...zs).toFixed(0)] };
  }
  return JSON.stringify(out);
}));
await b.close();
