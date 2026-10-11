import { chromium } from '/home/user/motes-of-work/node_modules/@playwright/test/index.mjs';

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(`http://localhost:4177/src/compare/compare.html?test=1&budget=30000${process.argv[2] ?? ''}`);
await page.waitForFunction(() => (window.__compare?.frames() ?? 0) >= 1, null, { timeout: 60000 });
const rows = await page.evaluate(() => {
  const out = [];
  for (const sel of ['#panel header', '#panel footer']) {
    const r = document.querySelector(sel).getBoundingClientRect();
    out.push([sel, Math.round(r.top), Math.round(r.height)]);
  }
  for (const c of document.getElementById('controls').children) {
    const r = c.getBoundingClientRect();
    out.push([c.tagName + '.' + c.className + ' ' + (c.textContent ?? '').slice(0, 30), Math.round(r.top), Math.round(r.height)]);
  }
  const p = document.getElementById('panel');
  out.push(['panel', p.scrollHeight, p.clientHeight]);
  return out;
});
for (const r of rows) console.log(r.join(' | '));
await browser.close();
