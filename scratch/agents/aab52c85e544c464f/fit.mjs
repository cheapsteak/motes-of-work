import { chromium } from '/home/user/motes-of-work/node_modules/@playwright/test/index.mjs';

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(`http://localhost:4177/src/compare/compare.html?test=1&budget=30000${process.argv[2] ?? ''}`);
await page.waitForFunction(() => (window.__compare?.frames() ?? 0) >= 1, null, { timeout: 60000 });
// Measure layout only: click through without waiting for renders.
const res = await page.evaluate(() => {
  const out = [];
  const panel = document.getElementById('panel');
  for (const mech of document.querySelectorAll('button[data-mech]')) {
    mech.click();
    for (const view of document.querySelectorAll('input[name=view]')) {
      view.checked = true;
      view.dispatchEvent(new Event('change'));
      for (const p of document.querySelectorAll('button.preset')) {
        p.click();
        const pb = document.querySelector('.preset-blurb').getBoundingClientRect().height;
        const mb = document.querySelector('.blurb').getBoundingClientRect().height;
        const last = document.getElementById('controls').lastElementChild.getBoundingClientRect().bottom; const foot = document.querySelector('#panel footer').getBoundingClientRect().top; out.push([mech.dataset.mech, view.value, p.textContent, Math.round(last - foot), Math.round(pb), Math.round(mb)]);
      }
    }
    document.querySelector('input[name=view]').checked = true;
    document.querySelector('input[name=view]').dispatchEvent(new Event('change'));
  }
  return out;
});
const worst = res.reduce((a, b) => (b[3] > a[3] ? b : a));
console.log('worst overflow', worst);
console.log('preset blurb heights', [...new Set(res.map((r) => `${r[2]}:${r[4]}`))].join(' '));
console.log('mech blurb heights', [...new Set(res.map((r) => `${r[0]}/${r[1]}:${r[5]}`))].join(' '));
await browser.close();
