import { expect, test, type Page } from '@playwright/test';

// The hardware spike pages (spec §10). Under SwiftShader the numbers mean nothing; these tests only
// prove each page runs, reports, and produces a JSON summary a person can paste back. Small `n`
// keeps the software renderer quick.

const BASE = '/src/spikes';

function collectErrors(page: Page): Error[] {
  const errors: Error[] = [];
  page.on('pageerror', (e) => errors.push(e));
  return errors;
}

async function readJson(page: Page): Promise<Record<string, unknown>> {
  const text = await page.locator('#results-json').inputValue();
  return JSON.parse(text) as Record<string, unknown>;
}

test('index lists every spike in sentence case', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto(`${BASE}/index.html`);
  for (const name of ['fill', 'vertex', 'floattex', 'caps']) {
    await expect(page.locator(`a[href$="${name}.html"]`), name).toHaveCount(1);
  }
  await expect(page.locator('li', { has: page.locator('a[href$="fill.html"]') })).toContainText('DPR');
  expect(errors).toEqual([]);
});

test('floattex shows PASS', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto(`${BASE}/floattex.html`);
  await expect(page.locator('#verdict')).toHaveText('PASS');
  expect(errors).toEqual([]);
  const json = await readJson(page);
  expect(json.spike).toBe('floattex');
  expect(json.pass).toBe(true);
});

test('caps lists numeric limits', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto(`${BASE}/caps.html`);
  const uniforms = page.locator('[data-cap="MAX_VERTEX_UNIFORM_VECTORS"]');
  await expect(uniforms).toHaveText(/^\d+$/);
  for (const name of ['MAX_VERTEX_ATTRIBS', 'MAX_TEXTURE_SIZE']) {
    await expect(page.locator(`[data-cap="${name}"]`), name).toHaveText(/^\d+$/);
  }
  await expect(page.locator('[data-cap="ALIASED_POINT_SIZE_RANGE"]')).toHaveText(/^\d+(\.\d+)? to \d+(\.\d+)?$/);
  for (const name of ['EXT_color_buffer_float', 'EXT_disjoint_timer_query_webgl2']) {
    await expect(page.locator(`[data-cap="${name}"]`), name).toHaveText(/^(yes|no)$/);
  }
  expect(errors).toEqual([]);
  const json = await readJson(page);
  expect(json.spike).toBe('caps');
  expect(Number((json.caps as Record<string, unknown>).MAX_VERTEX_UNIFORM_VECTORS)).toBeGreaterThan(0);
});

for (const spike of ['fill', 'vertex'] as const) {
  test(`${spike} HUD shows a numeric average after 1s`, async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto(`${BASE}/${spike}.html?n=2000`);
    await page.waitForTimeout(1000);
    await expect(page.locator('[data-hud="cpu-avg"]')).toHaveText(/^\d+(\.\d+)?$/);
    await expect(page.locator('[data-hud="cpu-p95"]')).toHaveText(/^\d+(\.\d+)?$/);
    await expect(page.locator('[data-hud="interval-avg"]')).toHaveText(/^\d+(\.\d+)?$/);
    await expect(page.locator('[data-hud="interval-p95"]')).toHaveText(/^\d+(\.\d+)?$/);
    // A GPU number, the explicit "unavailable" note, or (results lag frames on a slow renderer) measuring: never blank.
    await expect(page.locator('[data-hud="gpu"]')).toHaveText(/\d|GPU timer unavailable|GPU timer: measuring/);
    expect(errors).toEqual([]);

    const json = await readJson(page);
    expect(json.spike).toBe(spike);
    expect(typeof json.ua).toBe('string');
    expect(typeof json.renderer).toBe('string');
    expect((json.params as { n: number }).n).toBe(2000);
    expect(Number((json.cpu as { avgMs: number }).avgMs)).toBeGreaterThan(0);
    expect(Number((json.interval as { avgMs: number }).avgMs)).toBeGreaterThan(0);
    // CPU is JS work per frame, so it is shorter than the frame interval (which includes the GPU wait).
    expect((json.cpu as { avgMs: number }).avgMs).toBeLessThan((json.interval as { avgMs: number }).avgMs);
    // The page reports what was actually built and what is visible, beside the requested n.
    expect(json.instances).toBe(2000);
    const visible = json.visibleInstances as Record<string, number>;
    expect(Object.keys(visible).sort()).toEqual(['misallocated', 'specced', 'vibed']);
    for (const count of Object.values(visible)) expect(count).toBeLessThanOrEqual(2000);
  });
}

test('fill and vertex apply ?dpr= and ?n=', async ({ page }) => {
  // A small viewport keeps the software renderer quick at dpr 3. The defaults are unit-tested in params.test.ts.
  await page.setViewportSize({ width: 320, height: 240 });
  for (const spike of ['fill', 'vertex']) {
    await page.goto(`${BASE}/${spike}.html?n=500&dpr=3`);
    const params = (await readJson(page)).params as { n: number; dpr: number };
    expect([spike, params.n, params.dpr]).toEqual([spike, 500, 3]);
  }
});

test('copy results writes the JSON to the clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(`${BASE}/caps.html`);
  await page.getByRole('button', { name: 'Copy results' }).click();
  await expect(page.locator('#copy-status')).toHaveText('Copied');
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  expect(JSON.parse(clip)).toEqual(await readJson(page));
});

test('copy results survives a missing clipboard API', async ({ page }) => {
  const errors = collectErrors(page);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
  });
  await page.goto(`${BASE}/caps.html`);
  await page.getByRole('button', { name: 'Copy results' }).click();
  // Whether or not execCommand works here, the page says so and leaves the JSON selectable.
  await expect(page.locator('#copy-status')).toHaveText(/Copied|Select the text below and copy it/);
  expect(errors).toEqual([]);
  expect(JSON.parse(await page.locator('#results-json').inputValue())).toHaveProperty('spike', 'caps');
});

test('a manual selection survives the live refresh on a render spike', async ({ page }) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 320, height: 240 });
  await page.addInitScript(() => {
    // Neither copy method works (iOS over http): the page must fall back to a manual copy.
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    document.execCommand = () => false;
  });
  await page.goto(`${BASE}/fill.html?n=500&dpr=1`);
  await page.getByRole('button', { name: 'Copy results' }).click();
  await expect(page.locator('#copy-status')).toHaveText('Select the text below and copy it');

  const area = page.locator('#results-json');
  const selection = () =>
    area.evaluate((el: HTMLTextAreaElement) => [el.selectionStart, el.selectionEnd, el.value.length]);
  const before = await selection();
  expect(before[1]).toBeGreaterThan(before[0]);

  // Several 250 ms refresh ticks later the selection and the text are untouched.
  await page.waitForTimeout(1200);
  expect(await selection()).toEqual(before);
  expect(errors).toEqual([]);
});
