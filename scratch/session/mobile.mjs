import { chromium } from '/home/user/motes-of-work/node_modules/playwright/index.mjs';
const out = process.argv[2];
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const shots = [['portrait', 390, 844], ['desktop', 1280, 800]];
for (const [name, w, h] of shots) {
  for (const p of [0.08, 0.2, 0.3, 0.42, 0.7, 0.92]) {
    const pg = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: name === 'portrait' ? 2 : 1 });
    await pg.goto(`http://127.0.0.1:4197/index.html?test=1&n=40000&p=${p}`);
    await pg.waitForTimeout(3500);
    await pg.screenshot({ path: `${out}/${name}-${p}.png`, timeout: 60000 });
    await pg.close();
  }
}
await b.close();
