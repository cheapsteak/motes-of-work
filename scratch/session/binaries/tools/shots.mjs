// Stills at 390x844 for each option in both framings, plus a labelled contact sheet and one frame with the ui.
// Usage: node shots.mjs <base url> <out dir> [t]
import { chromium } from '../../../../node_modules/playwright/index.mjs';
const [base, out, tArg] = process.argv.slice(2);
const t = tArg ?? '120';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errs = [];
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
p.on('pageerror', (e) => errs.push('pageerror ' + e.message));
p.on('console', (m) => { if (m.type() === 'error') errs.push('console ' + m.text()); });
const shots = [];
const stats = {};
for (const f of ['hood', 'close']) for (const o of ['a', 'b', 'c', 'd']) {
  await p.goto(`${base}?o=${o}&f=${f}&t=${t}&ui=0&dpr=1`);
  await p.waitForFunction(() => window.__mock, null, { timeout: 20000 });
  await p.evaluate(() => window.__mock.draw());
  stats[`${o}-${f}`] = await p.evaluate(() => window.__mock.counts());
  const path = `${out}/${o}-${f}.png`;
  await p.screenshot({ path });
  shots.push({ path: `${o}-${f}.png`, label: `${o} · ${f}` });
}
// one frame with the ui (info collapsed), and one with the info line open
await p.goto(`${base}?o=c&f=close&t=${t}&dpr=1`);
await p.waitForFunction(() => window.__mock, null, { timeout: 20000 });
await p.evaluate(() => window.__mock.draw());
await p.screenshot({ path: `${out}/ui-c-close.png` });
await p.goto(`${base}?o=d&f=close&t=${t}&dpr=1`);
await p.waitForFunction(() => window.__mock, null, { timeout: 20000 });
await p.evaluate(() => { document.getElementById('info').open = true; window.__mock.draw(); });
await p.screenshot({ path: `${out}/ui-d-close-info.png` });
// a swipe check: the camera must not move between options
const cams = [];
for (const o of ['a', 'b', 'c', 'd']) { await p.evaluate((o) => { window.__mock.P.option = o; window.__mock.sync(); window.__mock.draw(); }, o); cams.push(await p.evaluate(() => document.getElementById('sum').textContent)); }
await p.keyboard.press('ArrowRight');
const afterKey = await p.evaluate(() => window.__mock.P.option);
// the contact sheet
const q = await b.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
await q.goto(`${base.replace(/mock\.html.*$/, '')}stills/sheet.html`);
await q.screenshot({ path: `${out}/sheet.png`, fullPage: true });
console.log(JSON.stringify({ stats, afterKey, cams, errs: errs.slice(0, 5) }, null, 1));
await b.close();
