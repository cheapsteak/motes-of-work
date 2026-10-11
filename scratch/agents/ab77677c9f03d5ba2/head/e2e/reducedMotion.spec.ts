import { expect, test, type Page } from '@playwright/test';
import { countNonBackground } from './helpers';

// Spec 6.1: the idle shimmer is the only thing that moves a frame without a scroll, and it is off
// under prefers-reduced-motion. These pages run WITHOUT ?test=1, so shimmer is governed by the
// media query alone. The two moments are 3 s apart.

test.setTimeout(120_000);

const GAP_MS = 3000;
// `?n=` lowers the mote budget so frames are cheap under SwiftShader.
const SMALL_BUDGET = 3000;

async function open(page: Page, reducedMotion: 'reduce' | 'no-preference'): Promise<void> {
  await page.emulateMedia({ reducedMotion });
  await page.goto(`/?p=0.88&n=${SMALL_BUDGET}`);
  await page.waitForFunction(() => document.getElementById('stage') !== null);
  await page.addStyleTag({ content: '#story { visibility: hidden; }' });
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
