import { expect, test, type Page } from '@playwright/test';
import { MOTE_BUDGET_DESKTOP, MOTE_SEED } from '../src/config';
import { AMBIENT_POSE } from '../src/galaxy/ambient';
import { galaxyTier } from '../src/galaxy/background';
import { galaxyBudget, generateGalaxy } from '../src/galaxy/generate';
import { GALAXY_SHOTS, galaxyShotKeys } from '../src/timeline/netShots';
import { beatMiddles, CANVAS_ONLY_CSS, countNonBackground, readSpans } from './helpers';

// Spec 6.1: the idle shimmer is the only thing that moves a frame without a scroll, and it is off
// under prefers-reduced-motion. These pages run WITHOUT ?test=1, so shimmer is governed by the
// media query alone. The two moments are 3 s apart, at the built bike near the end of the spec
// section (the shimmer moves settled motes only, so the page must show a built machine, before Act
// II reflows the bike). `auto=0`: auto-advance would scroll the page and change the frame for a
// reason other than the shimmer.

/** Where in the spec section the bike stands built. */
const BUILT = { id: 'spec', local: 0.927 };

// These tests read live pages (no ?test=1), and that is what makes them slow here. Profiled: on a live
// page Chrome lets the essay's frames run ahead of SwiftShader, which draws the galaxy at about 2 s a
// frame on a phone, so the first read of the canvas (toDataURL, a screenshot) waits for 15-20 s of
// queued drawing, whether it comes 3 s or 25 s after the load; the next read waits one frame. A test
// mode page has no backlog to wait for (its first read: 0.1-0.5 s). So each live page a test reads
// costs it about 20 s alone, and more beside another worker: the live-galaxy test (three pages, one a
// running galaxy) took 45-60 s alone and 1.7-2.5 min in a loaded run, hence 3 min. It is the price
// of checking the live clock, so it is bounded, not avoided.
test.setTimeout(180_000);

const GAP_MS = 3000;
// `?n=` lowers the mote budget so frames are cheap under SwiftShader.
const SMALL_BUDGET = 3000;

async function open(page: Page, reducedMotion: 'reduce' | 'no-preference'): Promise<void> {
  await page.emulateMedia({ reducedMotion });
  // The progress comes from the page's spans, so it follows the essay's length. Rounded to 1e-3,
  // as the point was when it was written as a literal.
  await page.goto(`/?n=${SMALL_BUDGET}&auto=0`);
  const span = (await readSpans(page)).find((s) => s.id === BUILT.id);
  if (!span) throw new Error(`no ${BUILT.id} section`);
  const p = Math.round((span.start + BUILT.local * (span.end - span.start)) * 1e3) / 1e3;
  await page.goto(`/?p=${p}&n=${SMALL_BUDGET}&auto=0`);
  await page.waitForFunction(() => document.getElementById('stage') !== null);
  await page.addStyleTag({ content: CANVAS_ONLY_CSS });
  await page.waitForTimeout(GAP_MS); // let the first frames land
}

test('reduced motion: frames at two moments in time are identical (no shimmer)', async ({ page }) => {
  await open(page, 'reduce');
  const first = await page.locator('#stage').screenshot();
  await page.waitForTimeout(GAP_MS);
  const second = await page.locator('#stage').screenshot();
  expect(countNonBackground(first), 'render is blank').toBeGreaterThan(200);
  expect(second.equals(first), 'frame changed with time under reduced motion').toBe(true);
});

test('the check is not vacuous: without reduced motion the frame changes with time (shimmer)', async ({ page }) => {
  await open(page, 'no-preference');
  // The loop renders continuously here, so read the canvas inside an animation frame: a callback
  // registered after the loop's own runs after it in that frame, before the frame is presented.
  const grab = (): Promise<string> =>
    page.evaluate(
      () =>
        new Promise<string>((resolve) =>
          requestAnimationFrame(() => resolve((document.getElementById('stage') as HTMLCanvasElement).toDataURL())),
        ),
    );
  const first = await grab();
  await page.waitForTimeout(GAP_MS);
  const second = await grab();
  expect(first.length, 'render is blank').toBeGreaterThan(1000);
  expect(second === first, 'shimmer did not move the frame').toBe(false);
});

// Task 7 (galaxy §8): the galaxy's ambient clock runs on wall time on a live page, and stands at
// AMBIENT_POSE under reduced motion, as `?ambient=<pose>` holds it. These pages are live (no ?test=1):
// the camera is the neighbourhood probe's keys, tracked, through `?state=`, the galaxy grown, and the
// bike's motes dimmed to nothing, so the galaxy is all that can move.

const HOOD_KEYS = (width: number, height: number) => {
  const g = generateGalaxy(MOTE_SEED, galaxyTier(width, height), galaxyBudget(MOTE_BUDGET_DESKTOP));
  return galaxyShotKeys(GALAXY_SHOTS.hood, g);
};

/** A live galaxy page: the hood probe's keys, the galaxy grown (`show` 0 hides it), the bike dimmed out. */
function galaxyPage(show: number, extra = ''): string {
  const state = { camera: HOOD_KEYS(390, 844), net: { show, growth: 1 }, stage: { motes: 0 } };
  return `/?mech=bike&auto=0&n=${SMALL_BUDGET}&state=${encodeURIComponent(JSON.stringify(state))}${extra}`;
}

/** The canvas inside an animation frame: after the loop's own draw in that frame. */
const grab = (page: Page): Promise<string> =>
  page.evaluate(
    () =>
      new Promise<string>((resolve) =>
        requestAnimationFrame(() => resolve((document.getElementById('stage') as HTMLCanvasElement).toDataURL())),
      ),
  );

async function openGalaxy(page: Page, reducedMotion: 'reduce' | 'no-preference', show = 1, extra = ''): Promise<string[]> {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.emulateMedia({ reducedMotion });
  await page.goto(galaxyPage(show, extra));
  await page.waitForFunction(() => document.getElementById('stage') !== null);
  await page.addStyleTag({ content: CANVAS_ONLY_CSS });
  await page.waitForTimeout(GAP_MS); // the clock's module, the galaxy's build and the first frames
  return errors;
}

test.describe('the galaxy on a live page, on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the galaxy stops at the pose: under reduced motion two frames 2 s apart are equal; without it they differ', async ({ page }) => {
    const errors = await openGalaxy(page, 'reduce');
    const first = await page.locator('#stage').screenshot();
    await page.waitForTimeout(2000);
    const second = await page.locator('#stage').screenshot();
    expect(countNonBackground(first), 'the galaxy draws').toBeGreaterThan(200);
    expect(second.equals(first), 'the galaxy moved under reduced motion').toBe(true);

    const live = await openGalaxy(page, 'no-preference');
    const a = await grab(page);
    await page.waitForTimeout(2000);
    const b = await grab(page);
    expect(b === a, 'the galaxy stood still on a live page').toBe(false);

    // The control: the same live page without the galaxy holds still, so what moved was the galaxy.
    const none = await openGalaxy(page, 'no-preference', 0);
    const c = await grab(page);
    await page.waitForTimeout(2000);
    expect((await grab(page)) === c, 'the page moved without the galaxy').toBe(true);
    expect([...errors, ...live, ...none]).toEqual([]);
  });

  test('reduced motion toggled mid-read: the galaxy stops at the pose, then runs again, with no console error', async ({ page, browser }) => {
    const errors = await openGalaxy(page, 'no-preference');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(1000);
    const held = await page.locator('#stage').screenshot();

    // The same page opened at ?ambient=<the pose>: the frame reduced motion stopped at.
    const other = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const posed = await openGalaxy(other, 'reduce', 1, `&ambient=${AMBIENT_POSE}`);
    const pose = await other.locator('#stage').screenshot();
    await other.close();
    expect(countNonBackground(pose), 'the galaxy draws').toBeGreaterThan(200);
    expect(held.equals(pose), 'under reduced motion the frame is not the pose').toBe(true);

    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.waitForTimeout(500);
    const a = await grab(page);
    await page.waitForTimeout(1000);
    expect((await grab(page)) === a, 'the galaxy did not run again').toBe(false);
    expect([...errors, ...posed]).toEqual([]);
  });
});

// The re-skin's Task 5 (Review Focus 5): the black hole runs on the ambient clock too (the disk's shear,
// the jets, the knots, the in-fall), so reduced motion switched on at its beat stops it at the pose on
// the next frame, and switched off lets it run again. A live page (no ?test=1) at ly-2's midpoint.

test.describe('the black hole on a live page, on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  /** ly-2's midpoint, as global progress, read from the live page's own story. */
  async function ly2(page: Page): Promise<number> {
    await page.goto(`/?mech=bike&auto=0&n=${SMALL_BUDGET}`);
    const spans = await readSpans(page);
    const middles = await beatMiddles(page);
    const i = middles.findIndex((section) => section.some((b) => b.id === 'ly-2'));
    const local = middles[i].find((b) => b.id === 'ly-2')!.local;
    return spans[i].start + local * (spans[i].end - spans[i].start);
  }

  async function openHole(page: Page, reducedMotion: 'reduce' | 'no-preference', p: number, extra = ''): Promise<string[]> {
    const errors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    page.on('pageerror', (e) => errors.push(e.message));
    await page.emulateMedia({ reducedMotion });
    await page.goto(`/?mech=bike&auto=0&n=${SMALL_BUDGET}&p=${p}${extra}`);
    await page.waitForFunction(() => document.getElementById('stage') !== null);
    await page.addStyleTag({ content: CANVAS_ONLY_CSS });
    await page.waitForTimeout(GAP_MS);
    return errors;
  }

  test('reduced motion toggled at ly-2: the hole stops at the pose on the next frame, then runs again', async ({ page, browser }) => {
    const p = await ly2(page);
    const errors = await openHole(page, 'no-preference', p);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(1000);
    const held = await page.locator('#stage').screenshot();

    // The same place opened at ?ambient=<the pose>: the frame reduced motion stops at.
    const other = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const posed = await openHole(other, 'reduce', p, `&ambient=${AMBIENT_POSE}`);
    const pose = await other.locator('#stage').screenshot();
    await other.close();
    expect(countNonBackground(pose), 'the hole draws').toBeGreaterThan(2000);
    expect(held.equals(pose), 'under reduced motion the hole is not at the pose').toBe(true);

    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.waitForTimeout(500);
    const a = await grab(page);
    await page.waitForTimeout(1000);
    expect((await grab(page)) === a, 'the hole did not run again').toBe(false);
    expect([...errors, ...posed]).toEqual([]);
  });
});

// Task 12 (freeze-frame §2.1 item 7, §3.5): the freeze frame's one-frame flash is off under reduced
// motion. Live pages (no ?test=1), the held frame on the cut: at defect 0.261 the flash is keyed
// 0.75, and it must draw the frame 0.2605 draws with the flash forced 0 (both held, both undressed:
// the dressing starts at 0.262). Without reduced motion it shows, so the check is not vacuous.

test.describe('the freeze frame’s flash, on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  async function cut(page: Page, reducedMotion: 'reduce' | 'no-preference', local: number, extra = ''): Promise<string> {
    await page.emulateMedia({ reducedMotion });
    await page.goto(`/?mech=bike&auto=0&n=${SMALL_BUDGET}`);
    const span = (await readSpans(page)).find((s) => s.id === 'defect');
    if (!span) throw new Error('no defect section');
    await page.goto(`/?mech=bike&auto=0&n=${SMALL_BUDGET}&p=${span.start + local * (span.end - span.start)}${extra}`);
    await page.waitForFunction(() => document.getElementById('stage') !== null);
    await page.addStyleTag({ content: CANVAS_ONLY_CSS });
    await page.waitForTimeout(GAP_MS);
    return grab(page);
  }
  const noFlash = `&state=${encodeURIComponent(JSON.stringify({ freeze: { flash: 0 } }))}`;

  test('no flash under reduced motion: the cut at 0.261 is the 0.2605 frame with the flash forced 0', async ({ page }) => {
    const flashed = await cut(page, 'reduce', 0.261);
    const plain = await cut(page, 'reduce', 0.2605, noFlash);
    expect(flashed.length, 'render is blank').toBeGreaterThan(1000);
    expect(flashed === plain, 'the flash showed under reduced motion').toBe(true);
    // Not vacuous: with motion allowed, the flash shows on the cut.
    const live = await cut(page, 'no-preference', 0.261);
    const liveOff = await cut(page, 'no-preference', 0.261, noFlash);
    expect(live === liveOff, 'the flash did not show without reduced motion').toBe(false);
  });

  test('no twos under reduced motion: the held frame (0.33) is the same 3 s later; without it, it breathes', async ({ page }) => {
    // Task 12 review: the twos (the 12 Hz breath of the held piece and its bursts, the one wall-time term
    // in the hold) are off under reduced motion as in test mode; only test mode had a browser check.
    const held = await cut(page, 'reduce', 0.33);
    await page.waitForTimeout(GAP_MS);
    expect(held.length, 'render is blank').toBeGreaterThan(1000);
    expect((await grab(page)) === held, 'the held frame moved under reduced motion').toBe(true);
    // Not vacuous: with motion allowed, the same frame breathes on the twos.
    const live = await cut(page, 'no-preference', 0.33);
    await page.waitForTimeout(GAP_MS);
    expect((await grab(page)) === live, 'the held frame did not breathe without reduced motion').toBe(false);
  });
});
