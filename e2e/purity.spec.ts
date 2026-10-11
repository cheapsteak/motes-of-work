import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { AMBIENT_POSE } from '../src/galaxy/ambient';
import type { SectionSpan } from '../src/scroll/progress';
import { canvasShot, countNonBackground, openStage, readSpans, scrollY, settle, targetScrollY } from './helpers';

// A render with fewer lit pixels than this is blank or broken; byte-equal blanks would prove nothing.
const MIN_LIT_PIXELS = 5000; // measured: 38980 (p=0.12), 54636 (p=0.41), 163339 (p=0.88), when the essay was 21.6 screens
// Act II's keyed frames light a smaller set on this landscape screen (1280x720). Each such sample is
// held to half what it was measured to light, at the pose and at 101 s (the lesser): still a thousand or
// more pixels compared byte for byte, and a frame that lost half its lit set fails. Measured on Act II's
// look before its re-skin, which re-measures them.
const halfOf = (measured: number): number => Math.floor(measured / 2);
/**
 * The hole close’s lit px on this screen (re-skin Task 5): half the least measured at the pose and at
 * 101 s over ly-2, trace 0.52 and fix 0.08 (9,477, ly-2 at the pose; the rest 9,509 to 10,288).
 */
const HOLE_MIN_LIT = halfOf(9477);

// The essay's three points were chosen as fractions of the essay when it ended on the zoom-out.
// Each is that fraction of the way to the zoom-out's end, read from the page's spans, so it lands
// on the frame it was chosen for however long Act II grows or shrinks. Rounded to 1e-4, as the
// points were when they were scaled by hand.
const ESSAY_FRACTIONS = [0.12, 0.41, 0.88];
function essayPoints(spans: SectionSpan[]): number[] {
  const end = spans.find((s) => s.id === 'zoom-out')?.end;
  if (end === undefined) throw new Error('no zoom-out section');
  return ESSAY_FRACTIONS.map((f) => Math.round(f * end * 1e4) / 1e4);
}

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

/** Global progress of a section-local value, read from the page. */
async function sectionProgress(context: BrowserContext, id: string, local: number): Promise<number> {
  const span = (await pageSpans(context)).find((s) => s.id === id);
  if (!span) throw new Error(`no ${id} section`);
  return span.start + local * (span.end - span.start);
}

const at = (id: string, local: number, ambient?: number, minLit = MIN_LIT_PIXELS) => ({
  name: ambient === undefined ? `${id}@${local}` : `${id}@${local} at ambient ${ambient}`,
  p: (context: BrowserContext) => sectionProgress(context, id, local),
  query: ambient === undefined ? '' : `&ambient=${ambient}`,
  minLit,
});

// Three points of the essay; four of the spec section's drawing (docs/specs/2026-10-05-
// blueprint-and-build.md §5 test 7): mid-draw, mid-redraw, mid-lift and the gold landing; and of Act
// II (docs/specs/2026-10-06-act-2-storyboard-and-network.md §6 test 13): mid-reflow, held at two
// ambients (`?ambient=`: the bike's moons and the galaxy stand where that ambient has them, and the
// camera rides the turn), mid-highlight, the ring moving, the surge and the sweep.
const SAMPLES: { name: string; p: (context: BrowserContext) => Promise<number>; query?: string; minLit?: number }[] = [
  ...ESSAY_FRACTIONS.map((f, i) => ({
    name: `essay ${f} of the way to the zoom-out's end`,
    p: async (context: BrowserContext) => essayPoints(await pageSpans(context))[i],
  })),
  ...[0.1, 0.36, 0.63, 0.78].map((l) => at('spec', l)),
  at('zoom-out', 0.22, AMBIENT_POSE),
  at('zoom-out', 0.22, 311),
  // Layers and far keyed (Task 9), each at the pose and at 101 s: the pull back before ly-3's pan (1.8
  // screens), the way back from star-4 under the via lamp (star-4's system alone, 3.525 screens), and
  // the pull out to the galaxy wide across the boundary into far.
  ...(
    [
      ['layers', 0.4186, halfOf(2776)],
      ['layers', 0.8198, halfOf(2764)],
      ['far', 0.02, halfOf(2965)],
    ] as const
  ).flatMap(([id, l, minLit]) => [AMBIENT_POSE, 101].map((ambient) => at(id, l, ambient, minLit))),
  // Defect keyed (Task 10), each at the pose and at 101 s: C1 held close (the pin's camera) and the
  // twelve mid-highlight under df-4 (lamp 5 on R0's lineage, from 120). (Retired: spread 0.51, the
  // wordless second fix on C5, which the author deleted.)
  ...(
    [
      ['defect', 0.33, MIN_LIT_PIXELS],
      ['defect', 0.68, halfOf(2001)],
    ] as const
  ).flatMap(([id, l, minLit]) => [AMBIENT_POSE, 101].map((ambient) => at(id, l, ambient, minLit))),
  // The freeze frame (Task 12; freeze-frame §4), each at the pose and at 101 s: the dressing mid-snap,
  // the fix landing on the held piece, and the release mid-peel (0.33, held, is above). The hold shows
  // the pin whatever the clock; the release runs on it again.
  ...[0.265, 0.395, 0.413].flatMap((l) => [AMBIENT_POSE, 101].map((ambient) => at('defect', l, ambient, MIN_LIT_PIXELS))),
  // Reviewer, trace and fix keyed (Task 11), each at the pose and at 101 s: the ring moving over P5's
  // planets under re-2, the surge running out along R0's lineage, and the sweep from the neighbourhood.
  ...(
    [
      ['reviewer', 0.5, halfOf(1929)],
      ['trace', 0.8, halfOf(4547)],
      ['fix', 0.82, halfOf(4944)],
    ] as const
  ).flatMap(([id, l, minLit]) => [AMBIENT_POSE, 101].map((ambient) => at(id, l, ambient, minLit))),
  // The black hole (re-skin Task 5), each at the pose and at 101 s: ly-2's midpoint on the hole close,
  // tr-2's hold on it (trace 0.52) and fx-1's (fix 0.08). Its disk, jets, knots and in-fall all run on
  // the ambient, so a jump, a scroll and a detour must land on the same dots.
  ...(
    [
      ['layers', 1.35 / 4.3, HOLE_MIN_LIT],
      ['trace', 0.52, HOLE_MIN_LIT],
      ['fix', 0.08, HOLE_MIN_LIT],
    ] as const
  ).flatMap(([id, l, minLit]) => [AMBIENT_POSE, 101].map((ambient) => at(id, l, ambient, minLit))),
];

for (const sample of SAMPLES) {
  test(`${sample.name}: jumping, scrolling and scrolling past and back render identical pixels`, async ({ context }, testInfo) => {
    const p = await sample.p(context);
    const q = sample.query ?? '';
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
    expect(lit, 'jumped render is blank').toBeGreaterThan(sample.minLit ?? MIN_LIT_PIXELS);
    expect(scroll.shot.equals(jump.shot), 'scrolled render differs from jumped render').toBe(true);
    expect(detour.shot.equals(jump.shot), 'past-and-back render differs from jumped render').toBe(true);
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
