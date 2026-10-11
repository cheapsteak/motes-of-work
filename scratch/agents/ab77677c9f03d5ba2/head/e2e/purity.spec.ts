import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { canvasShot, countNonBackground, openStage, scrollY, settle, targetScrollY } from './helpers';

// A render with fewer lit pixels than this is blank or broken; byte-equal blanks would prove nothing.
const MIN_LIT_PIXELS = 5000; // measured: 38980 (p=0.12), 54636 (p=0.41), 163339 (p=0.88)

// Rewind invariant (spec 6.1): a frame is a pure function of scroll progress. Reaching the same
// integer scrollY by a jump, by scrolling forward, or by scrolling past and back must render the
// same pixels, byte for byte. No tolerance: a difference means state accumulated across frames.

// A frame costs about 2.4 s under SwiftShader (100k instanced motes, vertex-bound at any viewport
// size), and every wheel event renders one. Step counts are kept small so a run stays in minutes;
// the invariant is about the frames along the way, not how many there are.
test.setTimeout(240_000);

const SCROLL_STEPS = 8;
const HOP_STEPS = 4;

/** Wheel-scroll from the current position to `y` in `steps` wheel events, then land on `y` exactly. */
async function wheelTo(page: Page, y: number, steps: number): Promise<void> {
  const from = await scrollY(page);
  await page.mouse.move(640, 360);
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, (y - from) / steps);
  }
  // Wheel scrolling is animated and keeps moving after the last event; let it come to rest next to
  // the target before landing on it, or the animation carries on past our scrollTo.
  await page.evaluate(
    (to) =>
      new Promise<void>((resolve) => {
        let last = Number.NaN;
        let still = 0;
        const tick = () => {
          still = window.scrollY === last ? still + 1 : 0;
          last = window.scrollY;
          if (still >= 6 && Math.abs(last - to) <= 2) resolve();
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    y,
  );
  await page.evaluate((to) => window.scrollTo(0, to), y);
  await settle(page);
}

interface Capture {
  y: number;
  shot: Buffer;
}

/** Open a fresh page (one at a time: a background page's animation frames can be throttled). */
async function capture(
  context: BrowserContext,
  query: string,
  p: number,
  reach?: (page: Page, target: number) => Promise<void>,
): Promise<Capture & { target: number }> {
  const page = await context.newPage();
  try {
    await openStage(page, query);
    const target = await targetScrollY(page, p);
    if (reach) await reach(page, target);
    return { target, y: await scrollY(page), shot: await canvasShot(page) };
  } finally {
    await page.close();
  }
}

for (const p of [0.12, 0.41, 0.88]) {
  test(`p=${p}: jumping, scrolling and scrolling past and back render identical pixels`, async ({ context }, testInfo) => {
    const jump = await capture(context, `&p=${p}`, p);
    const scroll = await capture(context, '', p, (page, target) => wheelTo(page, target, SCROLL_STEPS));
    // The rewind: forward past the target, then BACK onto it. 0.8 is behind p=0.88, so that one
    // overshoots to 0.95 instead.
    const past = p < 0.8 ? 0.8 : 0.95;
    const detour = await capture(context, '', p, async (page, target) => {
      await wheelTo(page, await targetScrollY(page, past), HOP_STEPS);
      await wheelTo(page, target, HOP_STEPS);
    });

    // Keep the images: on a failure CI uploads test-results/ as an artifact.
    await testInfo.attach('jump.png', { body: jump.shot, contentType: 'image/png' });
    await testInfo.attach('scroll.png', { body: scroll.shot, contentType: 'image/png' });
    await testInfo.attach('detour.png', { body: detour.shot, contentType: 'image/png' });

    // The pages must really be at the same integer scrollY before pixels mean anything.
    const target = jump.target;
    expect({ jump: jump.y, scroll: scroll.y, detour: detour.y }).toEqual({ jump: target, scroll: target, detour: target });
    expect([scroll.target, detour.target]).toEqual([target, target]);
    // ...and the render must show something, or equal blanks would pass vacuously.
    const lit = countNonBackground(jump.shot);
    testInfo.annotations.push({ type: 'non-background pixels', description: String(lit) });
    expect(lit, 'jumped render is blank').toBeGreaterThan(MIN_LIT_PIXELS);
    expect(scroll.shot.equals(jump.shot), 'scrolled render differs from jumped render').toBe(true);
    expect(detour.shot.equals(jump.shot), 'past-and-back render differs from jumped render').toBe(true);
  });
}

test('the check is not vacuous: the three progress values render pairwise different pixels', async ({ page }) => {
  const ps = [0.12, 0.41, 0.88];
  const shots: Buffer[] = [];
  for (const p of ps) {
    await openStage(page, `&p=${p}`);
    shots.push(await canvasShot(page));
  }
  for (let i = 0; i < ps.length; i++) {
    for (let j = i + 1; j < ps.length; j++) {
      expect(shots[i].equals(shots[j]), `p=${ps[i]} and p=${ps[j]} render identically`).toBe(false);
    }
  }
});
