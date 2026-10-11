// file:// load, purity (a frame is a function of t alone), motion between t values, and the swipe gesture.
import { chromium } from '/home/user/motes-of-work/node_modules/playwright/index.mjs';
const [fileUrl, httpUrl] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const out = {};
{
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(fileUrl + '?o=d&f=close&t=10');
  await p.waitForFunction(() => window.__mock, null, { timeout: 20000 }).catch(() => {});
  out.file = { ready: await p.evaluate(() => !!window.__mock), errs: errs.slice(0, 2) };
  await p.close();
}
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
await p.goto(httpUrl + '?o=c&f=close&t=200&ui=0&dpr=1');
await p.waitForFunction(() => window.__mock, null, { timeout: 20000 });
const shot = async (t) => { await p.evaluate((t) => { window.__mock.P.t = t; window.__mock.draw(); }, t); return (await p.screenshot()).toString('base64'); };
const a1 = await shot(200); await shot(37.5); await shot(611); const a2 = await shot(200);
out.pure = a1 === a2;
// the hero stars' positions at two times (they go round the barycentre), and the barycentre fixed
out.motion = await p.evaluate(() => {
  const m = window.__mock.MODEL; const u = m.options.c.find((x) => x.type === 'S' && x.stars.some((s) => s.key === m.hero.a));
  const at = (t) => [0, 1].map((i) => { const [rx, rz] = binRel(u.bin, t); const f = i === 0 ? -u.bin.fa : u.bin.fb; return [+(f * rx).toFixed(2), +(f * rz).toFixed(2)]; });
  const mA = u.stars[0].mass, mB = u.stars[1].mass; const p0 = at(100);
  return { t0: at(0), t100: p0, baryAt100: [+((p0[0][0] * mA + p0[1][0] * mB) / (mA + mB)).toFixed(6), +((p0[0][1] * mA + p0[1][1] * mB) / (mA + mB)).toFixed(6)], period: u.bin.period.toFixed(1) };
});
// a swipe left moves to the next option; the camera matrix is unchanged
const cam0 = await p.evaluate(() => window.__mock.P.option);
await p.mouse.move(300, 600); await p.mouse.down(); await p.mouse.move(150, 605, { steps: 5 }); await p.mouse.up();
out.swipe = [cam0, await p.evaluate(() => window.__mock.P.option)];
out.mathRandom = await p.evaluate(() => [...document.scripts].some((s) => /Math\.random/.test(s.textContent)));
console.log(JSON.stringify(out, null, 1));
await b.close();
