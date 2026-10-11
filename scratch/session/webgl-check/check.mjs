import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 480, height: 480 } });
await p.goto('file://' + process.cwd() + '/page.html');
console.log(JSON.stringify(await p.evaluate(() => window.__out)));
await p.screenshot({ path: 'webgl-check.png' });
await b.close();
