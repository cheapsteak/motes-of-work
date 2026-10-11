import { expect, test, type Page } from '@playwright/test';
import { REST_WINDOW_SCREENS, STOP_MARGIN_SCREENS } from '../src/autoAdvance/plan';
import { NET_MOVES } from '../src/timeline/netShots';
import { readSpans, scrollY } from './helpers';

// Auto-advance (src/autoAdvance/): it holds at each stop, scrolls to the next, pauses on any manual
// scroll intent and resumes from its ring. A small floor, a fast reading pace and a fast transit pace
// keep each run short; `n=` keeps frames cheap under SwiftShader.

// Measured: the end stop (the slowest) 4.9 s on CI (run 38153043664), 10.5-17.5 s in loaded local
// runs; it ran out of this once, at load 17-20, the run in which every test ran at half speed or worse.
// 90 s is 18 times the CI time and 5 times the loaded one.
test.setTimeout(90_000);

const FAST = '&auto=1&dwell=0.4&wps=100&pace=4&mech=bike&n=3000';

interface Hook {
  frames(): number;
  autoAdvance(): { state: string; stops: number[] } | null;
}

async function open(page: Page, query = FAST): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // Every hold, recorded as the page enters it (see nextHoldPast).
  await page.addInitScript(() => {
    const holds: number[] = [];
    (window as unknown as { __holds: number[] }).__holds = holds;
    let holding = false;
    new MutationObserver(() => {
      const state = document.getElementById('auto-advance')?.dataset.state;
      if (state === 'dwell' && !holding) holds.push(window.scrollY);
      holding = state === 'dwell';
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-state'] });
  });
  await page.goto(`/?test=1${query}`);
  await page.waitForFunction(() => {
    const m = (window as unknown as { __motes?: Hook }).__motes;
    return m !== undefined && m.frames() >= 1;
  });
  return errors;
}

const auto = (page: Page) =>
  page.evaluate(() => (window as unknown as { __motes: Hook }).__motes.autoAdvance());

/**
 * Where auto-advance first held below `y`, waiting for it if it has not yet. The page records each
 * hold as it enters it (the ring's data-state, which it sets on every frame it runs); the test does
 * not poll for it. A hold here lasts 0.4 s, and under a loaded SwiftShader the page's first frames
 * and each round trip to it can take longer: a poll from the test started after the first hold had
 * ended (it read the second's 497 for the first's 209), or read the scroll after it had (481).
 */
async function nextHoldPast(page: Page, y: number): Promise<number> {
  const hold = await page.waitForFunction((from) => (window as unknown as { __holds: number[] }).__holds.find((h) => h > from), y);
  return (await hold.jsonValue()) as number;
}

const ring = (page: Page) => page.getByRole('button', { name: /auto-advance/ });

test('from the top it goes straight on to the end of the first scene, holds, then on to the next and the one after', async ({ page }) => {
  const errors = await open(page);
  const first = await auto(page);
  const stops = first?.stops ?? [];
  // One stop per scene, at its end: the first is just before the second line comes up, not the top.
  expect(stops.length).toBeGreaterThan(10);
  expect(stops[0]).toBeGreaterThan(0);
  // Each hold is exactly at a stop, in order: the scroll lands on it, not near it.
  expect(await nextHoldPast(page, 0)).toBe(stops[0]);
  expect(await nextHoldPast(page, stops[0])).toBe(stops[1]);
  expect(await nextHoldPast(page, stops[1])).toBe(stops[2]);
  // The scroll position drives the essay, as a reader's scroll would.
  expect(await page.evaluate(() => (window as unknown as { __motes: { progress(): number } }).__motes.progress())).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('the defect’s first page stops where freeze-frame §1.1 has it: df-1 at 0.238, df-2 at 0.358, df-2b as the pull-out leaves', async ({ page }) => {
  // The page's own stops (scroll px), read back as defect-local progress: three on page 7, df-1's and
  // df-2's within 0.002 of §1.1's, df-2b's at the instant the pull-out leaves (0.4392, where the page
  // starts to fade: plan.ts stops a page-turn move's scene at its last point at rest, never before the
  // text's end and within a rest window of it).
  const errors = await open(page);
  const { stops } = (await auto(page)) ?? { stops: [] };
  const spans = await readSpans(page);
  const range = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  const defect = spans.find((x) => x.id === 'defect');
  if (!defect) throw new Error('no defect section');
  const local = (y: number) => (y / range - defect.start) / (defect.end - defect.start);
  const page7 = stops.map(local).filter((l) => l > 0 && l < 0.46);
  expect(page7, `defect stops ${page7.map((l) => l.toFixed(4)).join(' ')}`).toHaveLength(3);
  // One px of scroll is about 4e-4 of the section here: the stops are rounded to it.
  const px = 1 / (range * (defect.end - defect.start));
  expect(Math.abs(page7[0] - 0.238)).toBeLessThanOrEqual(0.002 + px);
  expect(Math.abs(page7[1] - 0.358)).toBeLessThanOrEqual(0.002 + px);
  const leaves = NET_MOVES.pullOut.from[1];
  expect(page7[2]).toBeGreaterThanOrEqual(leaves - STOP_MARGIN_SCREENS / 4.8 - px);
  expect(page7[2]).toBeLessThanOrEqual(leaves + REST_WINDOW_SCREENS / 4.8 + px);
  // The freeze frame (Task 12, freeze-frame §1.3): no stop on the cut and the dressing's snap, the fix
  // landing on the held piece, or the release.
  for (const [a, b] of [
    [0.26, 0.292],
    [0.37, 0.405],
    [0.405, 0.421],
  ])
    for (const l of page7) expect(l >= a - px && l <= b + px, `a stop at ${l.toFixed(4)} inside [${a}, ${b}]`).toBe(false);
  expect(errors).toEqual([]);
});

test('a wheel pauses it where it is; pressing the ring resumes it from there', async ({ page }) => {
  const errors = await open(page);
  const { stops } = (await auto(page)) ?? { stops: [] };
  await nextHoldPast(page, 0);
  await page.mouse.move(400, 300);
  await page.mouse.wheel(0, 120);
  // The wheel reaches the page asynchronously.
  await expect.poll(async () => (await auto(page))?.state).toBe('paused');
  await expect(ring(page)).toHaveAttribute('aria-label', 'Resume auto-advance');
  // Let the wheel's own scroll finish, then nothing moves the page.
  await page.waitForTimeout(500);
  const paused = await scrollY(page);
  await page.waitForTimeout(1500);
  expect(await scrollY(page)).toBe(paused);
  expect((await auto(page))?.state).toBe('paused');

  await ring(page).click();
  await expect(ring(page)).toHaveAttribute('aria-label', 'Pause auto-advance');
  // On to the next stop after where the reader left it.
  const next = stops.find((s) => s > paused + 0.5);
  expect(await nextHoldPast(page, paused)).toBe(next);
  expect(errors).toEqual([]);
});

test('Space on the page pauses it; on the ring, Space toggles it', async ({ page }) => {
  const errors = await open(page);
  await nextHoldPast(page, 0);
  await page.keyboard.press('Space');
  await expect.poll(async () => (await auto(page))?.state).toBe('paused');

  await ring(page).focus();
  await page.keyboard.press('Space');
  await expect.poll(async () => (await auto(page))?.state).not.toBe('paused');
  await expect(ring(page)).toHaveAttribute('aria-label', 'Pause auto-advance');
  await page.keyboard.press('Space');
  await expect.poll(async () => (await auto(page))?.state).toBe('paused');
  await expect(ring(page)).toHaveAttribute('aria-label', 'Resume auto-advance');
  expect(errors).toEqual([]);
});

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  test(`the ring is a labelled button in the bottom-right corner, over a soft pool, with no box (${viewport.width}x${viewport.height})`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const errors = await open(page);
    await expect(ring(page)).toHaveCount(1);
    await expect(ring(page)).toHaveAttribute('aria-label', 'Pause auto-advance');
    const look = await ring(page).evaluate((el) => {
      const s = getComputedStyle(el);
      const box = el.getBoundingClientRect();
      const svg = el.querySelector('svg')?.getBoundingClientRect();
      const stroke = (sel: string) => Number(getComputedStyle(el.querySelector(sel) as Element).strokeOpacity);
      return {
        tag: el.tagName,
        borders: ['top', 'right', 'bottom', 'left'].map((side) => parseFloat(s.getPropertyValue(`border-${side}-width`))),
        background: s.backgroundColor,
        backgroundImage: s.backgroundImage,
        boxShadow: s.boxShadow,
        pseudo: ['::before', '::after'].map((p) => getComputedStyle(el, p).content),
        opacity: Number(s.opacity),
        track: stroke('.auto-advance-track'),
        dial: stroke('.auto-advance-arc'),
        box: { width: box.width, height: box.height, right: box.right, bottom: box.bottom },
        ring: svg && { width: svg.width, right: svg.right, bottom: svg.bottom },
        width: document.documentElement.clientWidth,
        height: window.innerHeight,
      };
    });
    expect(look.tag).toBe('BUTTON');
    expect(look.borders).toEqual([0, 0, 0, 0]);
    expect(look.background).toBe('rgba(0, 0, 0, 0)');
    // The one thing behind it is a soft pool: a radial gradient of the stage colour, fading to nothing.
    expect(look.backgroundImage).toMatch(/^radial-gradient\(.*rgba\(11, 13, 18, 0\) 100%\)$/);
    expect(look.boxShadow).toBe('none');
    expect(look.pseudo).toEqual(['none', 'none']);
    // Findable: the whole button at full opacity; the ring's ink at about 55 %, the dial brighter.
    expect(look.opacity).toBe(1);
    expect(look.track).toBeGreaterThan(0.45);
    expect(look.track).toBeLessThan(0.65);
    expect(look.dial).toBeGreaterThan(look.track);
    // A 44px hit area round a 28px ring whose edge is 16px in from the corner.
    expect(look.box).toMatchObject({ width: 44, height: 44 });
    expect(look.ring?.width).toBe(28);
    expect(look.width - (look.ring?.right ?? 0)).toBeCloseTo(16, 0);
    expect(look.height - (look.ring?.bottom ?? 0)).toBeCloseTo(16, 0);
    expect(errors).toEqual([]);
  });
}

test('the credits link at the end of the essay is clear of the ring, on a phone and on a wide screen', async ({ page }) => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    // At the very end, where the link is. The ring has faded there, but it has its place, and it
    // comes back there as soon as the reader scrolls back up, with the link still on screen.
    await open(page, `${FAST}&p=1`);
    const boxes = await page.evaluate(() => {
      const r = (sel: string) => {
        const b = (document.querySelector(sel) as Element).getBoundingClientRect();
        return { left: b.left, right: b.right, top: b.top, bottom: b.bottom };
      };
      return { link: r('#credits-open'), ring: r('#auto-advance'), height: window.innerHeight };
    });
    expect(boxes.link.bottom, `${viewport.width}: the link is on screen`).toBeLessThanOrEqual(boxes.height);
    const apart =
      boxes.link.right <= boxes.ring.left ||
      boxes.ring.right <= boxes.link.left ||
      boxes.link.bottom <= boxes.ring.top ||
      boxes.ring.bottom <= boxes.link.top;
    expect(apart, `${viewport.width}: ${JSON.stringify(boxes)}`).toBe(true);
  }
});

test('at the end it stops and the ring fades away; scrolled back up, it is there again, paused', async ({ page }) => {
  const errors = await open(page, `${FAST}&p=0.97`);
  await page.waitForFunction(() => (window as unknown as { __motes: Hook }).__motes.autoAdvance()?.state === 'ended');
  const { stops } = (await auto(page)) ?? { stops: [] };
  expect(await scrollY(page)).toBe(stops[stops.length - 1]);
  // It fades: a 0.8 s fade of its opacity, then hidden. The fade is run to its end here rather than
  // waited out. A CSS transition moves only as the page's frames are drawn, and under a loaded
  // SwiftShader, at the galaxy the essay ends on, those come seconds apart: this 0.8 s fade took up to
  // 5.0 s there, past the 5 s an expect waits.
  const fade = await ring(page).evaluate((el) => {
    const s = getComputedStyle(el);
    return { property: s.transitionProperty, duration: s.transitionDuration, delay: s.transitionDelay };
  });
  expect(fade).toEqual({ property: 'opacity, visibility', duration: '0.8s, 0s', delay: '0s, 0.8s' });
  await ring(page).evaluate((el) => el.getAnimations().forEach((a) => a.finish()));
  await expect(ring(page)).toBeHidden();
  await page.mouse.move(400, 300);
  await page.mouse.wheel(0, -400);
  await expect(ring(page)).toBeVisible();
  expect((await auto(page))?.state).toBe('paused');
  await expect(ring(page)).toHaveAttribute('aria-label', 'Resume auto-advance');
  expect(errors).toEqual([]);
});

test('under reduced motion it starts paused, showing play', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors = await open(page);
  await expect(ring(page)).toHaveAttribute('aria-label', 'Resume auto-advance');
  await expect(page.locator('#auto-advance .auto-advance-play')).toBeVisible();
  await expect(page.locator('#auto-advance .auto-advance-arc')).toBeHidden();
  await page.waitForTimeout(1500);
  expect((await auto(page))?.state).toBe('paused');
  expect(await scrollY(page)).toBe(0);
  expect(errors).toEqual([]);
});

test('?auto=0 shows no ring; neither does ?test=1 alone; the essay shows it by default', async ({ page }) => {
  await page.goto('/?auto=0&n=3000');
  await expect(page.locator('#stage')).toHaveCount(1);
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
  await expect(page.locator('#auto-advance')).toHaveCount(0);

  await open(page, '&n=3000');
  await expect(page.locator('#auto-advance')).toHaveCount(0);
  expect(await auto(page)).toBeNull();

  await page.goto('/?n=3000');
  await expect(ring(page)).toHaveCount(1);
});
