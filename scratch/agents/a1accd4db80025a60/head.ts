import { expect, test, type Page } from '@playwright/test';
import { ACTIVE_MECHANISM } from '../src/config';
import type { SectionSpan } from '../src/scroll/progress';
import { readSpans, targetScrollY } from './helpers';

// App wiring: scroll → progress → sampled state → render, and the review-focus failure modes
// (out-of-range progress, resize mid-story, WebGL context loss, hidden tab).
// Every page uses ?test=1: shimmer off, renders only when the frame would change, exposes __motes.

interface Motes {
  progress(): number;
  frames(): number;
  settle(): Promise<void>;
  mechanism(): string;
}

// Section ids and progress spans are read from the story DOM (readSpans), never hard-coded.
const panel = (page: Page, id: string) => page.locator(`section[data-section="${id}"] .panel`);

async function open(page: Page, query = ''): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`/?test=1${query}`);
  await page.waitForFunction(() => {
    const m = (window as unknown as { __motes?: Motes }).__motes;
    return m !== undefined && m.frames() >= 1;
  });
  await settle(page);
  return errors;
}

const settle = (page: Page) => page.evaluate(() => (window as unknown as { __motes: Motes }).__motes.settle());
const progress = (page: Page) => page.evaluate(() => (window as unknown as { __motes: Motes }).__motes.progress());
const frames = (page: Page) => page.evaluate(() => (window as unknown as { __motes: Motes }).__motes.frames());

/** The section whose progress span contains `p`. */
function spanAt(spans: SectionSpan[], p: number): SectionSpan {
  const span = spans.find((s) => p >= s.start && p < s.end);
  if (!span) throw new Error(`no section contains progress ${p}`);
  return span;
}

function setHidden(page: Page, hidden: boolean): Promise<void> {
  return page.evaluate((h) => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => h });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
}

test.setTimeout(60_000);

test('renders every story section with alt text beside an aria-hidden canvas', async ({ page }) => {
  const errors = await open(page);
  await expect(page.locator('#stage')).toHaveAttribute('aria-hidden', 'true');
  const spans = await readSpans(page);
  expect(spans.length).toBeGreaterThan(0);
  for (const { id } of spans) {
    const alt = await page.locator(`section[data-section="${id}"] .sr-only`).textContent();
    expect(alt?.trim().length, id).toBeGreaterThan(10);
  }
  expect(errors).toEqual([]);
});

test('?p=0.5 lands at progress 0.5 with only its section in view', async ({ page }) => {
  const errors = await open(page, '&p=0.5');
  expect(Math.abs((await progress(page)) - 0.5)).toBeLessThan(0.002);
  const spans = await readSpans(page);
  const here = spanAt(spans, 0.5);
  await expect(panel(page, here.id)).toBeInViewport();
  for (const { id } of spans.filter((s) => s !== here)) await expect(panel(page, id), id).not.toBeInViewport();
  expect(errors).toEqual([]);
});

test('resizing mid-story keeps the reader at the same progress', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const errors = await open(page, '&p=0.42');
  const before = await progress(page);
  expect(Math.abs(before - 0.42)).toBeLessThan(0.002);
  await page.setViewportSize({ width: 900, height: 700 });
  await settle(page);
  expect(Math.abs((await progress(page)) - before)).toBeLessThan(0.002);
  await expect(panel(page, spanAt(await readSpans(page), 0.42).id)).toBeInViewport();
  expect(errors).toEqual([]);
});

test('a vignette sits over the stage, under the story, and never takes the pointer', async ({ page }) => {
  const errors = await open(page);
  const vignette = () =>
    page.evaluate(() => {
      const s = getComputedStyle(document.body, '::after');
      return { display: s.display, position: s.position, pointerEvents: s.pointerEvents, image: s.backgroundImage };
    });
  expect(await vignette()).toMatchObject({ display: 'block', position: 'fixed', pointerEvents: 'none' });
  expect((await vignette()).image).toMatch(/^radial-gradient/);
  // The story panels stay on top of it: the element under a panel's centre is the panel's.
  const box = await panel(page, 'vibe-build').boundingBox();
  if (!box) throw new Error('vibe-build panel has no box');
  const hit = await page.evaluate(
    ([x, y]) => document.elementFromPoint(x, y)?.closest('.panel') !== null,
    [box.x + box.width / 2, box.y + box.height / 2],
  );
  expect(hit).toBe(true);
  // Without WebGL it goes with the canvas.
  await page.evaluate(() => document.body.classList.add('no-webgl'));
  expect((await vignette()).display).toBe('none');
  expect(errors).toEqual([]);
});

test('WebGL context loss leaves the story readable', async ({ page }) => {
  const errors = await open(page);
  await page.evaluate(() => {
    const gl = (document.getElementById('stage') as HTMLCanvasElement).getContext('webgl2');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  });
  await expect(page.locator('body')).toHaveClass(/(^|\s)no-webgl(\s|$)/);
  await expect(panel(page, 'vibe-build')).toBeVisible();
  await expect(panel(page, 'vibe-build')).toBeInViewport();

  // The loop has stopped: scrolling no longer renders.
  const stopped = await frames(page);
  await page.mouse.wheel(0, 600);
  await settle(page);
  await page.waitForTimeout(300);
  expect(await frames(page)).toBe(stopped);
  expect(errors).toEqual([]);
});

test('the render loop stops while the tab is hidden and resumes after', async ({ page }) => {
  const errors = await open(page);
  await setHidden(page, true);
  await settle(page);
  const hidden = await frames(page);
  // A scroll would normally render a new frame; while hidden it must not.
  await page.evaluate(() => window.scrollBy(0, 600));
  await settle(page);
  await page.waitForTimeout(300);
  expect(await frames(page)).toBe(hidden);

  await setHidden(page, false);
  await page.waitForFunction(
    (n) => (window as unknown as { __motes: Motes }).__motes.frames() > n,
    hidden,
    { timeout: 5_000 },
  );
  expect(errors).toEqual([]);
});

// Panels and progress agree: just inside each end of a section's progress span, that section's panel
// (and only that one) crosses the viewport's horizontal centre line.
test('at each end of every section only its panel crosses the centre line', async ({ page }) => {
  const errors = await open(page);
  for (const span of await readSpans(page)) {
    for (const [edge, p] of [
      ['start', span.start + 0.01],
      ['end', span.end - 0.01],
    ] as const) {
      await test.step(`${edge} of ${span.id}`, async () => {
        await page.evaluate((top) => window.scrollTo(0, top), await targetScrollY(page, p));
        await settle(page);
        const atCentre = await page.evaluate(() =>
          [...document.querySelectorAll<HTMLElement>('section[data-section]')]
            .filter((s) => {
              const r = (s.querySelector('.panel') as HTMLElement).getBoundingClientRect();
              return r.top <= window.innerHeight / 2 && r.bottom >= window.innerHeight / 2;
            })
            .map((s) => s.dataset.section),
        );
        // Soft: one bad edge still reports the rest.
        expect.soft(atCentre, `${edge} of ${span.id}`).toEqual([span.id]);
      });
    }
  }
  expect(errors).toEqual([]);
});

test('the scroll range equals the summed section heights', async ({ page }) => {
  await open(page);
  const { range, total } = await page.evaluate(() => ({
    range: document.documentElement.scrollHeight - window.innerHeight,
    total: [...document.querySelectorAll('section[data-section]')].reduce(
      (h, s) => h + s.getBoundingClientRect().height,
      0,
    ),
  }));
  expect(Math.abs(range - total)).toBeLessThanOrEqual(1);
});

for (const [raw, expected] of [
  ['1.7', 1],
  ['-3', 0],
  ['abc', 0],
] as const) {
  test(`out-of-range ?p=${raw} clamps to progress ${expected}`, async ({ page }) => {
    const errors = await open(page, `&p=${raw}`);
    expect(await progress(page)).toBeCloseTo(expected, 6);
    expect(errors).toEqual([]);
  });
}

test('?mech=<id> selects a registered mechanism in test mode', async ({ page }) => {
  const errors = await open(page, `&mech=${ACTIVE_MECHANISM}`);
  expect(await page.evaluate(() => (window as unknown as { __motes: Motes }).__motes.mechanism())).toBe(
    ACTIVE_MECHANISM,
  );
  expect(errors).toEqual([]);
});

test('an unknown ?mech= falls back to the active mechanism with one warning', async ({ page }) => {
  const warnings: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'warning' && m.text().includes('?mech=')) warnings.push(m.text());
  });
  const errors = await open(page, '&mech=no-such-machine');
  expect(await page.evaluate(() => (window as unknown as { __motes: Motes }).__motes.mechanism())).toBe(
    ACTIVE_MECHANISM,
  );
  expect(warnings).toHaveLength(1);
  expect(errors).toEqual([]);
});

test('?mech= is ignored outside test mode', async ({ page }) => {
  const warnings: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'warning' && m.text().includes('?mech=')) warnings.push(m.text());
  });
  await page.goto('/?mech=no-such-machine');
  await expect(page.locator('#stage')).toHaveCount(1);
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
  expect(warnings).toEqual([]);
});
