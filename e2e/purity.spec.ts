import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { essayPoints, PURITY_SAMPLES, type PuritySample } from '../src/purity/samples';
import type { SectionSpan } from '../src/scroll/progress';
import { canvasShot, countNonBackground, openStage, readSpans, scrollY, settle, targetScrollY } from './helpers';
import { FULL_ONLY } from './tiers';

// Rewind invariant (spec 6.1): a frame is a pure function of scroll progress. Reaching the same
// integer scrollY by a jump, by scrolling forward, or by scrolling past and back must render the
// same pixels, byte for byte. No tolerance: a difference means state accumulated across frames.
//
// The twin (src/purity/twin.ts) checks it at every sample of the grid (src/purity/samples.ts):
// it drives the page's own stage in Node by each path and compares what each leaves for the GPU. This
// is its browser fence: the samples marked `fence` (one or two per scene) are rendered by all three
// paths and compared pixel for pixel, which proves the page draws what the twin computes (the shaders,
// the uploads, the renderer's own state); and every sample's jumped render must be lit, so no sample
// of the twin's grid is a blank frame.

// In the full tier only (e2e/tiers.ts): it runs before a push to main and before a publish.
test.describe('purity', { tag: FULL_ONLY }, () => {
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

  /** The essay's section spans, read from the page. */
  async function pageSpans(context: BrowserContext): Promise<SectionSpan[]> {
    const page = await context.newPage();
    try {
      await openStage(page, '&n=1000');
      return await readSpans(page);
    } finally {
      await page.close();
    }
  }

  const queryOf = (sample: PuritySample): string => (sample.ambient === undefined ? '' : `&ambient=${sample.ambient}`);

  for (const sample of PURITY_SAMPLES.filter((s) => s.fence)) {
    test(`${sample.name}: jumping, scrolling and scrolling past and back render identical pixels`, async ({ context }, testInfo) => {
      const p = sample.p(await pageSpans(context));
      const q = queryOf(sample);
      const jump = await capture(context, `&p=${p}${q}`, p);
      const scroll = await capture(context, q, p, (page, target) => wheelTo(page, target, SCROLL_STEPS));
      // The rewind: forward past the target, then BACK onto it. A target at or past 0.8 overshoots to
      // 0.95 (or 0.99) instead.
      const past = p < 0.8 ? 0.8 : p < 0.94 ? 0.95 : 0.99;
      const detour = await capture(context, q, p, async (page, target) => {
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
      expect(lit, 'jumped render is blank').toBeGreaterThan(sample.minLit);
      expect(scroll.shot.equals(jump.shot), 'scrolled render differs from jumped render').toBe(true);
      expect(detour.shot.equals(jump.shot), 'past-and-back render differs from jumped render').toBe(true);
    });
  }

  // The samples the twin alone compares: each one's jumped render still lights its share, so none of
  // the twin's samples is a frame that draws nothing.
  for (const sample of PURITY_SAMPLES.filter((s) => !s.fence)) {
    test(`${sample.name}: the jumped render is lit (its rewind is the twin's)`, async ({ context }, testInfo) => {
      const p = sample.p(await pageSpans(context));
      const jump = await capture(context, `&p=${p}${queryOf(sample)}`, p);
      await testInfo.attach('jump.png', { body: jump.shot, contentType: 'image/png' });
      expect(jump.y, 'the page lands on the sample').toBe(jump.target);
      const lit = countNonBackground(jump.shot);
      testInfo.annotations.push({ type: 'non-background pixels', description: String(lit) });
      expect(lit, 'jumped render is blank').toBeGreaterThan(sample.minLit);
    });
  }

  test('the check is not vacuous: the three progress values render pairwise different pixels', async ({ page }) => {
    await openStage(page, '&n=1000');
    const ps = essayPoints(await readSpans(page));
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
});
