// Renders a.html/b.html/c.html at desktop 1280x800 (1x) and portrait 390x844 (2x) for the brief
// mid-build and the reveal, then composes one contact sheet per viewport.
import pw from "/home/user/motes-of-work/node_modules/playwright/index.js";
const { chromium } = pw;
import { writeFileSync } from 'node:fs';

const DIR = '<scratchpad>/textmock';
const OPTS = ['a', 'b', 'c'];
const VIEWS = {
  desktop: { width: 1280, height: 800, deviceScaleFactor: 1 },
  portrait: { width: 390, height: 844, deviceScaleFactor: 2 },
};
const MOMENTS = ['brief', 'reveal'];
const NAMES = { a: 'Memo (Plex Sans + Plex Mono, margin tick, side scrim)', b: 'Motes (Newsreader, agent mote lands, feathered pool)', c: 'Ink (Literata + Instrument Serif, line brightens, shadow only)' };

const browser = await chromium.launch();
for (const [view, vp] of Object.entries(VIEWS)) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.deviceScaleFactor });
  const page = await ctx.newPage();
  for (const opt of OPTS) for (const moment of MOMENTS) {
    await page.goto(`file://${DIR}/${opt}.html?view=${view}&moment=${moment}`);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(150);
    await page.screenshot({ path: `${DIR}/${opt}-${view}-${moment}.png` });
  }
  // Contact sheet: columns A/B/C, rows brief/reveal.
  const colW = view === 'desktop' ? 640 : 390;
  const cells = OPTS.map((opt) => `
    <figure>
      <figcaption><b>${opt.toUpperCase()}</b>${NAMES[opt]}</figcaption>
      ${MOMENTS.map((m) => `<img src="${opt}-${view}-${m}.png" style="margin-bottom:16px">`).join('')}
    </figure>`).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="shared.css"></head>
    <body class="sheet" style="grid-template-columns: repeat(3, ${colW}px); width: ${3 * colW + 48 + 48}px; box-sizing: border-box">${cells}</body></html>`;
  writeFileSync(`${DIR}/sheet-${view}.html`, html);
  const sheetCtx = await browser.newContext({ viewport: { width: 3 * colW + 96, height: 900 }, deviceScaleFactor: 1 });
  const sheet = await sheetCtx.newPage();
  await sheet.goto(`file://${DIR}/sheet-${view}.html`);
  await sheet.evaluate(() => document.fonts.ready);
  await sheet.waitForTimeout(200);
  await sheet.screenshot({ path: `${DIR}/${view}-options.png`, fullPage: true });
  await sheetCtx.close();
  await ctx.close();
}
await browser.close();
console.log('done');
