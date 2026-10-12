import { chromium } from '../../../node_modules/@playwright/test/index.mjs';

const OUT = '<scratchpad>/agents/aab52c85e544c464f';
const query = process.argv[2] ?? '';
const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
page.on('console', (m) => m.type() === 'error' && console.log('CONSOLE', m.text()));
await page.goto(`http://localhost:4177/src/compare/compare.html?test=1&budget=30000${query}`);
await page.waitForFunction(() => (window.__compare?.frames() ?? 0) >= 1, null, { timeout: 60000 });
const m = await page.evaluate(() => {
  const panel = document.getElementById('panel');
  return { scroll: panel.scrollHeight, client: panel.clientHeight };
});
console.log('panel', m);
for (const name of ['Specced', 'Vibed (wrong twin)', 'Quiet failure', 'Exploded', 'Faults 0.6']) {
  await page.getByRole('button', { name, exact: true }).click();
  const h = await page.evaluate(() => {
    const panel = document.getElementById('panel');
    const b = document.querySelector('.preset-blurb');
    return { scroll: panel.scrollHeight, client: panel.clientHeight, blurb: b.getBoundingClientRect().height, text: b.textContent };
  });
  console.log(name, h);
}
await page.screenshot({ path: `${OUT}/probe-single.png` });
await page.getByLabel('Twin pair').check();
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/probe-twin.png` });
await page.getByLabel('Side by side').check();
await page.waitForTimeout(3000);
await page.screenshot({ path: `${OUT}/probe-grid.png` });
const overlap = await page.evaluate(() => {
  const hint = document.getElementById('orbit-hint').getBoundingClientRect();
  return [...document.querySelectorAll('.pane .label')].map((l) => {
    const r = l.getBoundingClientRect();
    return { label: l.textContent, r: [r.left, r.top, r.right, r.bottom] };
  }).concat([{ label: 'hint', r: [hint.left, hint.top, hint.right, hint.bottom] }]);
});
console.log(JSON.stringify(overlap));
await browser.close();
