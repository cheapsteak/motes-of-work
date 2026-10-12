import { chromium } from '../../../node_modules/playwright/index.mjs';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; page.on('console', m => { if (m.type()==='error' || m.type()==='warning') errs.push(m.type()+': '+m.text()); }); page.on('pageerror', e => errs.push('pageerror '+e.message));
for (const [name, q] of JSON.parse(process.argv[2])) {
  const t0 = Date.now();
  await page.goto('http://localhost:4199/' + q);
  await page.waitForFunction(() => (window.__moteFrames ?? 0) >= 1, null, { timeout: 60000 });
  const frames0 = await page.evaluate(() => window.__moteFrames);
  await page.waitForTimeout(2000);
  const frames1 = await page.evaluate(() => window.__moteFrames);
  console.log(name, 'frames in 2s', frames1 - frames0);
  if (process.env.NOSHOT) continue;
  await page.screenshot({ path: process.argv[3] + '/' + name + '.png' });
  console.log(name, 'load ms', Date.now() - t0, 'fps-ish', (frames1 - frames0) / 2);
}
console.log('console:', errs);
await browser.close();
