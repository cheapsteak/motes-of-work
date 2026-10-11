// Render mock.html at the two test sizes. Usage: node mockshots.mjs
import { chromium } from '/home/user/motes-of-work/node_modules/@playwright/test/index.mjs';

const here = '<scratchpad>/storyboard';
const browser = await chromium.launch();
const sizes = { desktop: { width: 1440, height: 900 }, portrait: { width: 390, height: 844 } };
for (const [view, viewport] of Object.entries(sizes)) {
  for (const page of ['brief', 'reveal', 'spec']) {
    const p = await browser.newPage({ viewport });
    await p.goto(`file://${here}/mock.html?view=${view}&page=${page}`);
    await p.evaluate(() => document.fonts.ready);
    const bottom = await p.evaluate(() => document.getElementById('panel').getBoundingClientRect().bottom / innerHeight);
    const file = `${here}/mock-${view}-${page}.png`;
    await p.screenshot({ path: file });
    console.log(file, 'panel bottom at', bottom.toFixed(3), 'of the height');
    await p.close();
  }
}
await browser.close();
