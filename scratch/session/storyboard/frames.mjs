// Canvas-only frames of the running essay at given progress values, desktop and phone, for the
// storyboard mocks. Usage: node frames.mjs <baseURL> <outDir> p,p,...
import { mkdirSync } from 'node:fs';
import { chromium } from '../../../node_modules/@playwright/test/index.mjs';

const [base, out, ps = '0.05'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const CANVAS_ONLY = '#story { visibility: hidden; } body::after { display: none !important; } #site-footer { display: none; }';

async function shot(viewport, p, file) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  await page.goto(`${base}/?test=1&p=${p}`);
  await page.waitForFunction(() => window.__motes !== undefined && window.__motes.frames() >= 1, null, { timeout: 120_000 });
  await page.addStyleTag({ content: CANVAS_ONLY });
  await page.evaluate(async () => {
    await window.__motes.settle();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
  await page.screenshot({ path: file });
  console.log(file);
  await page.close();
}

const sizes = { desktop: { width: 1440, height: 900 }, portrait: { width: 390, height: 844 } };
for (const [name, viewport] of Object.entries(sizes)) {
  for (const p of ps.split(',')) await shot(viewport, p, `${out}/${name}-p${p}.png`);
}
await browser.close();
