import { chromium } from '/home/user/motes-of-work/node_modules/playwright/index.mjs';
const base = 'http://127.0.0.1:4198/';
const out = process.argv[2];
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errs = [];
async function newPage() {
  const q = await b.newPage({ viewport: { width: 1280, height: 800 } });
  q.on('pageerror', (e) => errs.push('pageerror ' + e.message));
  q.on('console', (m) => { if (m.type() === 'error') errs.push('console ' + m.text()); });
  q.on('requestfailed', (r) => errs.push('reqfail ' + r.url()));
  return q;
}
let p = await newPage();

await p.goto(base + 'index.html');
await p.waitForTimeout(500);
await p.screenshot({ path: out + '/hub.png', fullPage: true });
console.log('hub links', await p.$$eval('a.door', (as) => as.map((a) => a.getAttribute('href'))));

// Default (non-test) compare page: just prove it boots without errors.
await p.goto(base + 'src/compare/compare.html');
await p.waitForTimeout(8000);
console.log('compare canvases', await p.evaluate(() => document.querySelectorAll('canvas').length));
console.log('compare essay link', await p.evaluate(() => document.querySelector('a[href*="essay"]')?.getAttribute('href')));

await p.close().catch(() => {});
p = await newPage();
await p.goto(base + 'essay.html?test=1&p=0.3');
await p.waitForTimeout(5000);
await p.screenshot({ path: out + '/pub-essay.png', timeout: 60000 });

await p.close().catch(() => {});
p = await newPage();
await p.goto(base + 'src/compare/compare.html?test=1&mech=watch');
await p.waitForTimeout(6000);
await p.screenshot({ path: out + '/pub-compare.png', timeout: 60000 });
await p.close().catch(() => {});
p = await newPage();
await p.goto(base + 'essay.html?test=1&p=1');
await p.waitForTimeout(4000);
const cr = await p.$('#credits-open');
console.log('essay credits button', !!cr);
if (cr) { await cr.click({ timeout: 60000 }); await p.waitForTimeout(800); console.log('credits open', await p.evaluate(() => document.getElementById('credits').open), 'mentions marked', await p.evaluate(() => /marked/i.test(document.getElementById('credits-body').textContent || ''))); }

await p.close().catch(() => {});
p = await newPage();
await p.setViewportSize({ width: 390, height: 844 });
await p.goto(base + 'index.html');
await p.waitForTimeout(400);
console.log('hub scrollWidth at 390:', await p.evaluate(() => document.documentElement.scrollWidth));
await p.screenshot({ path: out + '/hub-phone.png', fullPage: true });
console.log('errors:', JSON.stringify(errs));
await b.close();
