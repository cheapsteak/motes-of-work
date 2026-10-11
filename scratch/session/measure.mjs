import { chromium } from '@playwright/test';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.goto('http://localhost:4181/src/compare/compare.html?test=1&budget=30000');
await p.waitForFunction(() => (window.__compare?.frames() ?? 0) >= 1);
console.log(JSON.stringify(await p.evaluate(() =>
  [...document.querySelectorAll('#panel label, #panel button, #panel output')]
    .filter((e) => e.scrollWidth > e.clientWidth || e.scrollHeight > e.clientHeight + 1)
    .map((e) => [e.textContent, e.scrollWidth, e.clientWidth, e.scrollHeight, e.clientHeight, e.className]))));
await b.close();
