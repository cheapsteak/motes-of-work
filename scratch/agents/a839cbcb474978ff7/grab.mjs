// usage: node grab.mjs <outdir> name=query ...   (query appended to /index.html?test=1)
import { createRequire } from 'node:module';
const require = createRequire('/home/user/motes-of-work/package.json');
const { chromium } = require('@playwright/test');
const [outdir, ...pairs] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.error('pageerror', e.message));
for (const pair of pairs) {
  const i = pair.indexOf('=');
  const name = pair.slice(0, i), q = pair.slice(i + 1);
  await page.goto(`http://localhost:4196/index.html?test=1${q}`);
  await page.waitForFunction(() => window.__motes && window.__motes.frames() >= 1, null, { timeout: 120000 });
  await page.evaluate(async () => { await window.__motes.settle(); await new Promise((r) => requestAnimationFrame(() => r())); });
  await page.screenshot({ path: `${outdir}/${name}.png` });
  console.log('wrote', name);
}
await browser.close();
