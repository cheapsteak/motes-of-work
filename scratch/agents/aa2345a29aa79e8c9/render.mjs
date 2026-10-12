// Usage: node render.mjs <outdir> <query> [<query> ...]; each query like p=0.3 or state=...; full page with panels.
import { chromium } from '../../../node_modules/@playwright/test/index.mjs';
const [out, ...queries] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
for (const q of queries) {
  const [name, query] = q.split('|');
  await page.goto(`http://localhost:4193/index.html?test=1&${query}`);
  await page.waitForFunction(() => window.__motes && window.__motes.frames() >= 1, null, { timeout: 120000 });
  await page.evaluate(async () => { await window.__motes.settle(); await new Promise((r) => requestAnimationFrame(r)); });
  await page.screenshot({ path: `${out}/${name}.png` });
  console.log('shot', name, await page.evaluate(() => window.__motes.progress()));
}
await browser.close();
