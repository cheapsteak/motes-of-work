import { chromium } from '../../../../node_modules/playwright/index.mjs';
const url = process.argv[2];
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(url); await p.waitForTimeout(2500);
console.log('ready', await p.evaluate(() => !!window.__mock), errs.slice(0, 3));
await b.close();
