import { expect, test } from '@playwright/test';

// The essay as a reader opens it: the full mote budget, live (no ?test=1). Under SwiftShader its first
// frames leave the browser many seconds of drawing to finish after the checks are done. The test
// leaves the page and waits for that (17-20 s measured on an idle machine), so the cost falls here and
// not on what this worker sets up next: left to the next test, it held that test's browser.newContext
// for 15-28 s, past its 30 s budget under load (the spikes spec's setup flake).
test.setTimeout(90_000);

test('page loads with a stage canvas and no page errors', async ({ page }) => {
  const errors: Error[] = [];
  page.on('pageerror', (e) => errors.push(e));
  await page.goto('/');
  await expect(page.locator('#stage')).toHaveCount(1);
  // three.js has created a WebGL context on the stage (SwiftShader in CI/sandbox).
  const hasWebGl = await page.evaluate(
    () => (document.getElementById('stage') as HTMLCanvasElement).getContext('webgl2') !== null,
  );
  expect(hasWebGl).toBe(true);
  expect(errors).toEqual([]);
  await page.goto('about:blank');
});
