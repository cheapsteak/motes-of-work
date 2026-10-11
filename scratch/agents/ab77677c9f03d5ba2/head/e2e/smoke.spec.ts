import { expect, test } from '@playwright/test';

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
});
