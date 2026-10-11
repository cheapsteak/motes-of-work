import { mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { PNG } from 'pngjs';
import { MECHANISM_IDS } from '../src/mechanisms';
import { mechanismMeta } from '../src/mechanisms/meta';
import { PRESETS, SLIDERS } from '../src/compare/controls';
import type { SceneState } from '../src/timeline/sceneState';
import { countNonBackground } from './helpers';

// The mechanism comparison page (src/compare/). Every test runs at the 30k budget in a small
// viewport so SwiftShader stays quick; the page renders only on change in test mode, so each step
// waits for the frame counter to move before it looks.

const PAGE = '/src/compare/compare.html';
const SMALL = { width: 900, height: 560 };
/** A pane counts as drawn above this many non-background pixels. */
const NON_BLANK = 400;

interface Compare {
  state(): SceneState;
  nan(): boolean;
  frames(): number;
  systems(): string[];
}

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
}

const frames = (page: Page): Promise<number> =>
  page.evaluate(() => (window as unknown as { __compare: Compare }).__compare.frames());
const state = (page: Page): Promise<SceneState> =>
  page.evaluate(() => (window as unknown as { __compare: Compare }).__compare.state());
const nan = (page: Page): Promise<boolean> =>
  page.evaluate(() => (window as unknown as { __compare: Compare }).__compare.nan());

async function open(page: Page, query = ''): Promise<void> {
  await page.goto(`${PAGE}?test=1&budget=30000${query}`);
  await page.waitForFunction(() => ((window as unknown as { __compare?: Compare }).__compare?.frames() ?? 0) >= 1);
}

/** Run `action`, then wait until a frame has rendered after it (and one more animation frame). */
async function redraw(page: Page, action: () => Promise<unknown>): Promise<void> {
  const before = await frames(page);
  await action();
  await page.waitForFunction((n) => (window as unknown as { __compare: Compare }).__compare.frames() > n, before);
  await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => r())));
}

/** Set every slider (by its data-path) to a value picked from its definition. */
async function setSliders(page: Page, pick: 'min' | 'max' | 'alternate'): Promise<void> {
  const values = Object.fromEntries(
    SLIDERS.map((s, i) => [s.path, pick === 'min' || (pick === 'alternate' && i % 2 === 0) ? s.min : s.max]),
  );
  await page.evaluate((v) => {
    for (const input of document.querySelectorAll<HTMLInputElement>('input[type=range][data-path]')) {
      input.value = String(v[input.dataset.path as string]);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, values);
}

/**
 * The GL canvas alone. Element screenshots are composited, so the HTML overlays that sit on the
 * canvas (pane labels and borders, "Not yet built", notices) are hidden first: a pane is only
 * non-blank if the renderer drew it.
 */
async function canvas(page: Page): Promise<Buffer> {
  await page.addStyleTag({
    content: '#panes, .pane, #building, #notice, #orbit-hint { visibility: hidden !important; }',
  });
  return page.locator('#stage').screenshot();
}

test.use({ viewport: SMALL });
test.setTimeout(120_000);

test('the picker lists exactly the registered mechanisms, and each one renders without errors', async ({ page }) => {
  const errors = collectErrors(page);
  await open(page);
  const listed = await page
    .locator('button[data-mech]')
    .evaluateAll((bs) => bs.map((b) => b.getAttribute('data-mech')));
  expect(new Set(listed)).toEqual(new Set(MECHANISM_IDS));

  for (const id of MECHANISM_IDS) {
    await redraw(page, () => page.locator(`button[data-mech="${id}"]`).click());
    await expect(page.locator(`button[data-mech="${id}"]`)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.blurb')).toHaveText(mechanismMeta[id].blurb);
    expect(countNonBackground(await canvas(page)), id).toBeGreaterThan(NON_BLANK);
    expect(await nan(page), id).toBe(false);
  }
  expect(errors).toEqual([]);
});

test('?mech= opens on that mechanism', async ({ page }) => {
  const id = MECHANISM_IDS[MECHANISM_IDS.length - 1];
  await open(page, `&mech=${id}`);
  await expect(page.locator(`button[data-mech="${id}"]`)).toHaveAttribute('aria-pressed', 'true');
});

test('each preset renders a non-blank canvas and sets every slider', async ({ page }) => {
  const errors = collectErrors(page);
  await open(page);
  for (const preset of PRESETS) {
    const button = page.getByRole('button', { name: preset.name, exact: true });
    await redraw(page, () => button.click());
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.presets [aria-pressed="true"]')).toHaveCount(1);
    await expect(page.locator('.preset-blurb')).toContainText(preset.name);
    expect(countNonBackground(await canvas(page)), preset.name).toBeGreaterThan(NON_BLANK);
    const s = await state(page);
    expect(s.mech.assembly, preset.name).toBe(preset.values['mech.assembly']);
    expect(s.mech.variant, preset.name).toBe(preset.values['mech.variant']);
    expect(s.mech.ghost, preset.name).toBe(preset.values['mech.ghost']);
    expect(s.provenance, preset.name).toEqual({
      vibed: preset.values['provenance.vibed'],
      misallocated: preset.values['provenance.misallocated'],
    });
    expect(s.mech.faults.ratio, preset.name).toBe(preset.values['mech.faults.ratio']);
    // The panel shows what the state holds.
    for (const def of SLIDERS) {
      const shown = Number(await page.locator(`input[data-path="${def.path}"]`).inputValue());
      expect(shown, `${preset.name} ${def.path}`).toBeCloseTo(preset.values[def.path], 6);
    }
    expect(await nan(page), preset.name).toBe(false);
  }
  expect(errors).toEqual([]);
});

test('slider extremes on every mechanism: no page error, no NaN, still drawing', async ({ page }) => {
  const errors = collectErrors(page);
  await open(page);
  for (const id of MECHANISM_IDS) {
    await redraw(page, () => page.locator(`button[data-mech="${id}"]`).click());
    for (const pick of ['min', 'max', 'alternate'] as const) {
      await redraw(page, () => setSliders(page, pick));
      expect(await nan(page), `${id} ${pick}`).toBe(false);
      if (pick !== 'alternate') {
        expect((await state(page)).mech.faults.stall, `${id} ${pick}`).toBe(pick === 'max' ? 1 : 0);
      }
    }
    // At max the machine is assembled (assembly 1), so something must be on screen.
    await redraw(page, () => setSliders(page, 'max'));
    expect(countNonBackground(await canvas(page)), id).toBeGreaterThan(NON_BLANK);
  }
  expect(errors).toEqual([]);
});

test('side by side: a pane per mechanism, every built one drawn, the rest say not yet built', async ({ page }) => {
  const errors = collectErrors(page);
  await open(page);
  await redraw(page, () => page.getByLabel('Side by side').check());
  await expect(page.locator('button[data-mech]').first()).toBeDisabled();

  const panes = page.locator('.pane');
  await expect(panes).toHaveCount(4);
  for (let i = 0; i < 4; i++) {
    const id = MECHANISM_IDS[i];
    await expect(panes.nth(i)).toContainText(id === undefined ? 'Not yet built' : mechanismMeta[id].label);
  }

  // Overlays hidden: each quadrant (row-major: 0 1 / 2 3) is what the renderer drew there.
  const png = PNG.sync.read(await canvas(page));
  const half = { w: Math.floor(png.width / 2), h: Math.floor(png.height / 2) };
  for (let i = 0; i < 4; i++) {
    const id = MECHANISM_IDS[i];
    const quad = new PNG({ width: half.w, height: half.h });
    PNG.bitblt(png, quad, (i % 2) * half.w, Math.floor(i / 2) * half.h, half.w, half.h, 0, 0);
    const lit = countNonBackground(PNG.sync.write(quad));
    // A pane with no mechanism must score below the threshold, so the check separates drawn from blank.
    if (id === undefined) expect(lit, `empty pane ${i}`).toBeLessThan(NON_BLANK);
    else expect(lit, `pane ${i} (${id})`).toBeGreaterThan(NON_BLANK);
  }
  expect(await nan(page)).toBe(false);
  expect(errors).toEqual([]);
});

test('drag orbits the camera, reset view returns to the three-quarter view', async ({ page }) => {
  await open(page);
  const before = (await state(page)).camera;
  expect(before.pos[0]).toBeCloseTo(1.6, 3);
  const box = await page.locator('#stage').boundingBox();
  if (!box) throw new Error('no canvas');
  await redraw(page, async () => {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2 + 20, { steps: 5 });
    await page.mouse.up();
  });
  const after = (await state(page)).camera;
  expect(after.pos).not.toEqual(before.pos);
  // Orbiting keeps the distance to the target.
  expect(Math.hypot(...after.pos)).toBeCloseTo(Math.hypot(...before.pos), 3);
  await redraw(page, () => page.getByRole('button', { name: 'Reset view' }).click());
  expect((await state(page)).camera.pos).toEqual(before.pos);
});

test('play advances drive from the clock and pause freezes it', async ({ page }) => {
  await open(page);
  const d0 = (await state(page)).mech.drive;
  await page.getByRole('button', { name: 'Play' }).click();
  await page.waitForTimeout(600);
  const d1 = (await state(page)).mech.drive;
  expect(d1).toBeGreaterThan(d0);
  await page.getByRole('button', { name: 'Pause' }).click();
  await page.waitForTimeout(100);
  const d2 = (await state(page)).mech.drive;
  await page.waitForTimeout(400);
  expect((await state(page)).mech.drive).toBe(d2);
  expect(Number(await page.locator('input[data-path="mech.drive"]').inputValue())).toBeCloseTo(d2, 2);
});

test('the controls fit a 1280x720 window without scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await open(page);
  const { scroll, client, doc } = await page.evaluate(() => {
    const panel = document.getElementById('panel') as HTMLElement;
    return {
      scroll: panel.scrollHeight,
      client: panel.clientHeight,
      doc: document.documentElement.scrollHeight - window.innerHeight,
    };
  });
  expect(scroll).toBeLessThanOrEqual(client);
  await expect(page.locator('.group-hint')).toHaveCount(3);
  for (const hint of await page.locator('.group-hint').all()) await expect(hint).toBeVisible();
  await expect(page.locator('.preset-blurb')).toBeVisible();
  expect(doc).toBeLessThanOrEqual(0);
  // Every label, button and value is shown whole, not cut off with an ellipsis.
  const clipped = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('#panel label:not(.sr-only), #panel button, #panel output')]
      .filter((e) => e.scrollWidth > e.clientWidth || e.scrollHeight > e.clientHeight + 1)
      .map((e) => e.textContent),
  );
  expect(clipped).toEqual([]);
});

test('moving a slider by hand unmarks the preset', async ({ page }) => {
  await open(page);
  await expect(page.getByRole('button', { name: 'Specced', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await redraw(page, () =>
    page.evaluate(() => {
      const input = document.querySelector<HTMLInputElement>('input[data-path="mech.ghost"]') as HTMLInputElement;
      input.value = '0.5';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }),
  );
  await expect(page.locator('.presets [aria-pressed="true"]')).toHaveCount(0);
  await expect(page.locator('.preset-blurb')).toHaveText(/^Custom state/);
});

test('switching budget shows a building notice and frees the old budget', async ({ page }) => {
  await open(page);
  const systems = () => page.evaluate(() => (window as unknown as { __compare: Compare }).__compare.systems());
  const id = MECHANISM_IDS[0];
  expect(await systems()).toEqual([`${id}@30000`]);
  // Record whether the building notice ever shows: it is up for two animation frames only.
  await page.evaluate(() => {
    const el = document.getElementById('building') as HTMLElement;
    const w = window as unknown as { buildingSeen: string[] };
    w.buildingSeen = [];
    new MutationObserver(() => {
      if (!el.hidden) w.buildingSeen.push(el.textContent ?? '');
    }).observe(el, { attributes: true, childList: true });
  });
  await redraw(page, () => page.locator('#budget').selectOption('100000'));
  expect(await systems()).toEqual([`${id}@100000`]);
  const seen = await page.evaluate(() => (window as unknown as { buildingSeen: string[] }).buildingSeen);
  expect(seen.some((t) => t.startsWith('Building') && t.includes('100k'))).toBe(true);
  await expect(page.locator('#building')).toBeHidden();
  // Side by side has its own budget (30k here): the 100k systems go.
  await redraw(page, () => page.getByLabel('Side by side').check());
  expect((await systems()).every((k) => k.endsWith('@30000'))).toBe(true);
});

test('the credits dialog ships the licence notices', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'Credits and licences' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('BSD 2-Clause License');
  await expect(dialog).toContainText('Copyright (c) 2017-2019, Revar Desmera');
  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(dialog).toBeHidden();
});

// Human-review screenshots of the whole page (panel included) at a desktop size.
test('screenshots for review', async ({ page }) => {
  test.skip(process.env.SHOTS !== '1', 'set SHOTS=1 to capture comparison page screenshots');
  test.setTimeout(240_000);
  mkdirSync('shots', { recursive: true });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${PAGE}?test=1`);
  await page.waitForFunction(() => ((window as unknown as { __compare?: Compare }).__compare?.frames() ?? 0) >= 1);
  await redraw(page, () => page.getByRole('button', { name: 'Specced', exact: true }).click());
  await page.screenshot({ path: 'shots/compare-single-specced.png' });
  for (const preset of PRESETS.slice(1)) {
    await redraw(page, () => page.getByRole('button', { name: preset.name, exact: true }).click());
    const slug = preset.name
      .toLowerCase()
      .replace(/[^a-z0-9.]+/g, '-')
      .replace(/-$/, '');
    await page.screenshot({ path: `shots/compare-single-${slug}.png` });
  }
  await redraw(page, () => page.getByRole('button', { name: 'Specced', exact: true }).click());
  await redraw(page, () => page.getByLabel('Side by side').check());
  await page.screenshot({ path: 'shots/compare-grid-specced.png' });
});
