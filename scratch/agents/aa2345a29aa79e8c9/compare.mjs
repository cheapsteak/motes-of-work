import { chromium } from '../../../node_modules/@playwright/test/index.mjs';
const out = process.argv[2];
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto('http://localhost:4193/src/compare/compare.html?test=1&mech=bike&budget=30000');
await page.waitForFunction(() => (window.__compare?.frames() ?? 0) >= 1, null, { timeout: 120000 });
for (const name of ['Cold open', 'Spec (core)']) {
  const before = await page.evaluate(() => window.__compare.frames());
  await page.getByRole('button', { name, exact: true }).click();
  await page.waitForFunction((b) => window.__compare.frames() > b, before, { timeout: 120000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/cmp-${name.replace(/[^a-z]+/gi, '-')}.png` });
  console.log('shot', name);
}
await browser.close();
