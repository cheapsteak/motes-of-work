// Shoot story frames (with panel) and camera experiments on the twin. Read-only against the repo.
import { chromium } from '../../../node_modules/playwright/index.mjs';
import fs from 'node:fs';

const OUT = '<scratchpad>/agents/a87a9e4eade021787/frames';
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:4195';
const jobs = JSON.parse(process.argv[2]);

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
for (const job of jobs) {
  const url = `${BASE}/${job.path}`;
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__motes && window.__motes.frames() > 0, null, { timeout: 60000 }).catch(() => {});
  await page.evaluate(() => window.__motes?.settle()).catch(() => {});
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/${job.name}.png` });
  console.log('shot', job.name);
}
await browser.close();
