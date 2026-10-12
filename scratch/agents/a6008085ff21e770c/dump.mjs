import { chromium } from '../../../node_modules/@playwright/test/index.mjs';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage();
p.on('console', (m) => console.log('console:', m.text()));
await p.goto('http://localhost:4173/src/parity/parity.html?test=1');
await p.waitForFunction(() => window.__parity !== undefined);
console.log(JSON.stringify(await p.evaluate(() => window.__parity)));
if (process.argv[2]) console.log(JSON.stringify(await p.evaluate(process.argv[2])));
await b.close();
