import { mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { PNG } from 'pngjs';
import { ACTIVE_MECHANISM } from '../src/config';
import { MECHANISM_IDS } from '../src/mechanisms';
import { mechanismMeta } from '../src/mechanisms/meta';
import { CAMERAS, gridShape, PRESETS, SLIDERS } from '../src/compare/controls';
import { LIGHTING } from '../src/scene/lighting';
import type { SceneState } from '../src/timeline/sceneState';
import { countNonBackground } from './helpers';

// The mechanism comparison page (src/compare/). Every test but the default-budget one runs at the
// 30k budget in a small viewport so SwiftShader stays quick; the page renders only on change in test mode, so each step
// waits for the frame counter to move before it looks.

const PAGE = '/src/compare/compare.html';
const SMALL = { width: 900, height: 560 };
/** A pane counts as drawn above this many non-background pixels. */
const NON_BLANK = 400;

interface Compare {
  state(): SceneState;
  paneStates(): SceneState[];
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
const paneStates = (page: Page): Promise<SceneState[]> =>
  page.evaluate(() => (window as unknown as { __compare: Compare }).__compare.paneStates());
const systems = (page: Page): Promise<string[]> =>
  page.evaluate(() => (window as unknown as { __compare: Compare }).__compare.systems());

async function open(page: Page, query = '', budget: string | null = '30000'): Promise<void> {
  await page.goto(`${PAGE}?test=1${budget === null ? '' : `&budget=${budget}`}${query}`);
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
 * canvas (pane labels and borders, notices) are hidden first: a pane is only
 * non-blank if the renderer drew it.
 */
async function canvas(page: Page): Promise<Buffer> {
  await page.addStyleTag({
    content: '#panes, .pane, #building, #notice, #orbit-hint { visibility: hidden !important; }',
  });
  return page.locator('#stage').screenshot();
}

/** Pixels whose colour differs by more than 24 on some channel between two equal-size PNGs. */
function differing(a: PNG, b: PNG): number {
  let n = 0;
  for (let i = 0; i < a.width * a.height; i++) {
    for (let c = 0; c < 3; c++) {
      if (Math.abs(a.data[i * 4 + c] - b.data[i * 4 + c]) > 24) {
        n++;
        break;
      }
    }
  }
  return n;
}

/** The left and right halves of a PNG. */
function halves(png: PNG): [PNG, PNG] {
  const w = Math.floor(png.width / 2);
  return [0, 1].map((i) => {
    const half = new PNG({ width: w, height: png.height });
    PNG.bitblt(png, half, i * w, 0, w, png.height, 0, 0);
    return half;
  }) as [PNG, PNG];
}

/** Rectangles overlap (DOMRect-like, viewport px). */
const overlaps = (
  a: { left: number; top: number; right: number; bottom: number },
  b: { left: number; top: number; right: number; bottom: number },
): boolean => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

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

test('side by side: a pane per registered mechanism, each drawn, spare grid cells blank', async ({ page }) => {
  const errors = collectErrors(page);
  await open(page);
  await redraw(page, () => page.getByLabel('Side by side').check());
  await expect(page.locator('button[data-mech]').first()).toBeDisabled();
  // Every mechanism is on screen: none reads as picked, and the picker says all are shown.
  await expect(page.locator('button[data-mech][aria-pressed="true"]')).toHaveCount(0);
  await expect(page.locator('.picker')).toHaveClass(/\ball\b/);

  // The grid grows with the registry (four mechanisms: 2×2); cells past the last mechanism are blank.
  const { cols, rows } = gridShape(MECHANISM_IDS.length);
  const panes = page.locator('.pane');
  await expect(panes).toHaveCount(cols * rows);
  for (let i = 0; i < cols * rows; i++) {
    const id = MECHANISM_IDS[i];
    if (id === undefined) await expect(panes.nth(i)).toHaveText('');
    else await expect(panes.nth(i)).toContainText(mechanismMeta[id].label);
  }

  // Overlays hidden: each cell (row-major) is what the renderer drew there.
  const png = PNG.sync.read(await canvas(page));
  const cell = { w: Math.floor(png.width / cols), h: Math.floor(png.height / rows) };
  for (let i = 0; i < cols * rows; i++) {
    const id = MECHANISM_IDS[i];
    const crop = new PNG({ width: cell.w, height: cell.h });
    PNG.bitblt(png, crop, (i % cols) * cell.w, Math.floor(i / cols) * cell.h, cell.w, cell.h, 0, 0);
    const lit = countNonBackground(PNG.sync.write(crop));
    // A spare cell must score below the threshold, so the check separates drawn from blank.
    if (id === undefined) expect(lit, `spare cell ${i}`).toBeLessThan(NON_BLANK);
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

test('the controls fit a 1280x720 window without scrolling, for every preset, view and mechanism', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await open(page);
  // Layout only: every combination of mechanism, view and preset is set and measured inside one
  // page task, so no frame renders in between (rendering 60 states would take minutes on
  // SwiftShader). The mechanism blurb and the preset blurb are the parts whose height varies.
  const results = await page.evaluate(() => {
    const panel = document.getElementById('panel') as HTMLElement;
    const views = [...document.querySelectorAll<HTMLInputElement>('input[name=view]')];
    const shown = (e: Element): boolean => {
      const r = e.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom <= window.innerHeight;
    };
    const setView = (v: HTMLInputElement): void => {
      v.checked = true;
      v.dispatchEvent(new Event('change', { bubbles: true }));
    };
    const out = [];
    for (const mech of document.querySelectorAll<HTMLButtonElement>('button[data-mech]')) {
      setView(views[0]);
      mech.click();
      for (const view of views) {
        setView(view);
        for (const preset of document.querySelectorAll<HTMLButtonElement>('button.preset')) {
          preset.click();
          out.push({
            where: `${mech.dataset.mech} / ${view.value} / ${preset.textContent}`,
            scroll: panel.scrollHeight,
            client: panel.clientHeight,
            doc: document.documentElement.scrollHeight - window.innerHeight,
            hints: [...document.querySelectorAll('.group-hint')].map(shown),
            presetBlurb: shown(document.querySelector('.preset-blurb') as Element),
            // Every label, button and value is shown whole, not cut off with an ellipsis.
            clipped: [
              ...document.querySelectorAll<HTMLElement>('#panel label:not(.sr-only), #panel button, #panel output'),
            ]
              .filter((e) => e.scrollWidth > e.clientWidth || e.scrollHeight > e.clientHeight + 1)
              .map((e) => e.textContent),
          });
        }
      }
    }
    return out;
  });
  expect(results).toHaveLength(MECHANISM_IDS.length * 3 * PRESETS.length);
  for (const r of results) {
    expect(r.scroll, r.where).toBeLessThanOrEqual(r.client);
    expect(r.hints, r.where).toEqual([true, true, true]);
    expect(r.presetBlurb, r.where).toBe(true);
    expect(r.doc, r.where).toBeLessThanOrEqual(0);
    expect(r.clipped, r.where).toEqual([]);
  }
});

test('the preset blurb is set off from the mechanism blurb and names the ghost', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await open(page);
  for (const preset of PRESETS) {
    await page.getByRole('button', { name: preset.name, exact: true }).click();
    const text = (await page.locator('.preset-blurb').textContent()) ?? '';
    expect(text.startsWith(`${preset.name} — `), preset.name).toBe(true);
    const ghost = preset.values['mech.ghost'];
    expect(text, preset.name).toContain(ghost === 0 ? 'No ghost.' : `Ghost ${ghost}.`);
  }
  const look = await page.evaluate(() => {
    const style = (sel: string) => getComputedStyle(document.querySelector(sel) as HTMLElement);
    return {
      blurbColor: style('.blurb').color,
      presetColor: style('.preset-blurb').color,
      presetRule: style('.preset-blurb').borderLeftWidth,
    };
  });
  expect(look.presetColor).not.toBe(look.blurbColor);
  expect(parseFloat(look.presetRule)).toBeGreaterThan(0);
});

test('the orbit hint overlaps no pane label, in every view at 1280x720', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await open(page);
  // Labels are laid out on change, without waiting for a frame.
  for (const view of ['Twin pair', 'Side by side', 'Single']) {
    await page.getByLabel(view).check();
    const hint = await page.locator('#orbit-hint').boundingBox();
    if (!hint) throw new Error('no orbit hint');
    const hintBox = { left: hint.x, top: hint.y, right: hint.x + hint.width, bottom: hint.y + hint.height };
    // The label's text, not its block (a label div spans its pane's width).
    const labels = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('.pane .label')].map((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        const r = range.getBoundingClientRect();
        return { text: el.textContent, left: r.left, top: r.top, right: r.right, bottom: r.bottom };
      }),
    );
    expect(labels.length, view).toBeGreaterThan(0);
    for (const label of labels) expect(overlaps(hintBox, label), `${view}: ${label.text}`).toBe(false);
  }
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
  const id = ACTIVE_MECHANISM; // the page opens on the active mechanism
  expect(await systems(page)).toEqual([`${id}@30000`]);
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
  expect(await systems(page)).toEqual([`${id}@100000`]);
  const seen = await page.evaluate(() => (window as unknown as { buildingSeen: string[] }).buildingSeen);
  expect(seen.some((t) => t.startsWith('Building') && t.includes('100k'))).toBe(true);
  await expect(page.locator('#building')).toBeHidden();
  // One budget for every view: side by side keeps 100k, so the switch frees nothing and builds
  // the other mechanisms at 100k.
  await redraw(page, () => page.getByLabel('Side by side').check());
  await expect(page.locator('#budget')).toHaveValue('100000');
  expect((await systems(page)).every((k) => k.endsWith('@100000'))).toBe(true);
  // Back to 30k: every 100k system is freed.
  await redraw(page, () => page.locator('#budget').selectOption('30000'));
  expect((await systems(page)).every((k) => k.endsWith('@30000'))).toBe(true);
});

test('one budget selector for every view, 100k by default', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = collectErrors(page);
  await open(page, '', null);
  await expect(page.locator('#panel select')).toHaveCount(1);
  await expect(page.locator('#budget')).toHaveValue('100000');
  const id = ACTIVE_MECHANISM; // the page opens on the active mechanism
  expect(await systems(page)).toEqual([`${id}@100000`]);
  for (const view of ['Twin pair', 'Side by side', 'Single']) {
    await redraw(page, () => page.getByLabel(view).check());
    await expect(page.locator('#budget'), view).toHaveValue('100000');
    expect((await systems(page)).every((k) => k.endsWith('@100000')), view).toBe(true);
  }
  // Side by side built every mechanism once, at the one budget.
  expect(new Set(await systems(page))).toEqual(new Set(MECHANISM_IDS.map((m) => `${m}@100000`)));
  expect(errors).toEqual([]);
});

test('twin pair: one mechanism, correct | vibed wrong twin with no ghost, in two drawn panes', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await open(page);
  await redraw(page, () => page.getByRole('button', { name: 'Quiet failure', exact: true }).click());
  await redraw(page, () => page.getByLabel('Twin pair').check());
  const id = (await page.locator('button[data-mech][aria-pressed="true"]').getAttribute('data-mech')) as string;
  const label = mechanismMeta[id as keyof typeof mechanismMeta].label;
  const panes = page.locator('.pane');
  await expect(panes).toHaveCount(2);
  await expect(panes.nth(0)).toContainText(`${label} · correct`);
  await expect(panes.nth(1)).toContainText(`${label} · wrong twin`);
  await expect(page.getByRole('radiogroup', { name: 'View' })).toHaveCount(1);
  // The picker still picks in twin pair.
  await expect(page.locator('button[data-mech]').first()).toBeEnabled();

  const [left, right] = await paneStates(page);
  const quiet = PRESETS.find((p) => p.name === 'Quiet failure');
  if (!quiet) throw new Error('no Quiet failure preset');
  expect([left.mech.variant, left.provenance.vibed, left.mech.ghost]).toEqual([0, 0, quiet.values['mech.ghost']]);
  expect([right.mech.variant, right.provenance.vibed, right.mech.ghost]).toEqual([1, 1, 0]);
  // Everything else is the sliders as set, in both panes, through the one rig.
  for (const s of [left, right]) {
    expect(s.provenance.misallocated).toBe(1);
    expect(s.mech.drive).toBe(quiet.values['mech.drive']);
  }
  expect(right.camera).toEqual(left.camera);
  // The two sliders the twin pair sets per pane are disabled there, and come back outside it.
  for (const path of ['mech.variant', 'provenance.vibed']) {
    await expect(page.locator(`input[data-path="${path}"]`), path).toBeDisabled();
  }

  const [a, b] = halves(PNG.sync.read(await canvas(page)));
  const lit = [a, b].map((h) => countNonBackground(PNG.sync.write(h)));
  expect(lit[0], 'left pane').toBeGreaterThan(NON_BLANK);
  expect(lit[1], 'right pane').toBeGreaterThan(NON_BLANK);
  // Two different machines, not one drawn twice.
  expect(differing(a, b)).toBeGreaterThan(NON_BLANK);
  expect(await nan(page)).toBe(false);
  await redraw(page, () => page.getByLabel('Single').check());
  for (const path of ['mech.variant', 'provenance.vibed']) {
    await expect(page.locator(`input[data-path="${path}"]`), path).toBeEnabled();
  }
  expect(errors).toEqual([]);
});

test('each camera button changes the view, orbit circles its framing, reset view returns to it', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await open(page);
  let previous = PNG.sync.read(await canvas(page));
  // Start from the default, then each other framing in turn, ending back on the first.
  for (const cam of [...CAMERAS.slice(1), CAMERAS[0]]) {
    await redraw(page, () => page.getByRole('button', { name: cam.name, exact: true }).click());
    await expect(page.getByRole('button', { name: cam.name, exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.cameras [aria-pressed="true"]')).toHaveCount(1);
    const s = await state(page);
    expect(s.camera.pos.map((v) => Number(v.toFixed(6))), cam.name).toEqual(cam.pos);
    expect(s.camera.target.map((v) => Number(v.toFixed(6))), cam.name).toEqual(cam.target);
    expect(s.camera.fov, cam.name).toBe(cam.fov);
    expect(s.camera.coreFocus, cam.name).toBe(cam.coreFocus);
    const png = PNG.sync.read(await canvas(page));
    expect(countNonBackground(PNG.sync.write(png)), cam.name).toBeGreaterThan(NON_BLANK);
    expect(differing(previous, png), cam.name).toBeGreaterThan(NON_BLANK);
    previous = png;
    expect(await nan(page), cam.name).toBe(false);
  }

  // Orbit about the spec framing's target (the core), then reset back to that framing.
  const spec = CAMERAS.find((c) => c.coreFocus === 1);
  if (!spec) throw new Error('no core framing');
  await redraw(page, () => page.getByRole('button', { name: spec.name, exact: true }).click());
  const box = await page.locator('#stage').boundingBox();
  if (!box) throw new Error('no canvas');
  await redraw(page, async () => {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2 + 20, { steps: 5 });
    await page.mouse.up();
  });
  const orbited = (await state(page)).camera;
  expect(orbited.pos).not.toEqual(spec.pos);
  expect(orbited.coreFocus).toBe(1);
  const dist = (p: number[], t: number[]) => Math.hypot(p[0] - t[0], p[1] - t[1], p[2] - t[2]);
  expect(dist(orbited.pos, orbited.target)).toBeCloseTo(dist(spec.pos, spec.target), 3);
  await redraw(page, () => page.getByRole('button', { name: 'Reset view' }).click());
  const back = (await state(page)).camera;
  expect(back.pos.map((v) => Number(v.toFixed(6)))).toEqual(spec.pos);
  expect(errors).toEqual([]);
});

test('drive nudges move drive by exactly 0.02, and arrow keys on the drive slider by 0.01', async ({ page }) => {
  await open(page);
  const d0 = (await state(page)).mech.drive;
  expect(d0).toBe(PRESETS[0].values['mech.drive']);
  await redraw(page, () => page.getByRole('button', { name: '+0.02' }).click());
  expect((await state(page)).mech.drive).toBe(0.17);
  expect(Number(await page.locator('input[data-path="mech.drive"]').inputValue())).toBe(0.17);
  await redraw(page, () => page.getByRole('button', { name: '+0.02' }).click());
  expect((await state(page)).mech.drive).toBe(0.19);
  await redraw(page, () => page.getByRole('button', { name: '−0.02' }).click());
  expect((await state(page)).mech.drive).toBe(0.17);
  // Nudging is scrubbing the clock, like Play: the preset stays marked.
  await expect(page.getByRole('button', { name: 'Specced', exact: true })).toHaveAttribute('aria-pressed', 'true');

  await page.locator('input[data-path="mech.drive"]').focus();
  await redraw(page, () => page.keyboard.press('ArrowRight'));
  expect((await state(page)).mech.drive).toBe(0.18);
  await redraw(page, () => page.keyboard.press('ArrowLeft'));
  await redraw(page, () => page.keyboard.press('ArrowLeft'));
  expect((await state(page)).mech.drive).toBe(0.16);
});

test('the lighting group is absent without ?dev=1', async ({ page }) => {
  await open(page);
  await expect(page.locator('#lighting-dev')).toHaveCount(0);
  await expect(page.getByText('Lighting (dev)')).toHaveCount(0);
});

test('?dev=1: a collapsed lighting group, bound live to the uniforms, copied as JSON', async ({ page, context }) => {
  const errors = collectErrors(page);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await open(page, '&dev=1');
  const group = page.locator('#lighting-dev');
  await expect(group).toHaveCount(1);
  expect(await group.evaluate((d) => (d as HTMLDetailsElement).open)).toBe(false);
  await page.getByText('Lighting (dev)').click();
  // Starts at the module's values.
  const fill = page.locator('input[data-light="fillStrength"]');
  await expect(fill).toBeVisible();
  const clipped = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('#lighting-dev label, #lighting-dev button, #lighting-dev output')]
      .filter((e) => e.scrollWidth > e.clientWidth || e.scrollHeight > e.clientHeight + 1)
      .map((e) => e.textContent),
  );
  expect(clipped).toEqual([]);
  expect(Number(await fill.inputValue())).toBeCloseTo(LIGHTING.fillStrength, 6);

  const before = PNG.sync.read(await canvas(page));
  await redraw(page, () =>
    fill.evaluate((input: HTMLInputElement) => {
      input.value = String(Number(input.max));
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }),
  );
  const after = PNG.sync.read(await canvas(page));
  expect(differing(before, after)).toBeGreaterThan(NON_BLANK);
  const max = Number(await fill.getAttribute('max'));

  await page.getByRole('button', { name: 'Copy as JSON' }).click();
  await expect(page.locator('.dev-status')).toHaveText('Copied');
  const copied = JSON.parse(await page.evaluate(() => navigator.clipboard.readText()));
  expect(copied).toEqual({ ...LIGHTING, keyDir: [...LIGHTING.keyDir], fillStrength: max });
  expect(errors).toEqual([]);
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

  // Twin pair, specced and with every fault, for each mechanism.
  await redraw(page, () => page.getByLabel('Twin pair').check());
  for (const id of MECHANISM_IDS) {
    await redraw(page, () => page.locator(`button[data-mech="${id}"]`).click());
    await redraw(page, () => page.getByRole('button', { name: 'Specced', exact: true }).click());
    await page.screenshot({ path: `shots/compare-twin-${id}.png` });
  }
  await redraw(page, () => page.getByRole('button', { name: 'Faults 0.6', exact: true }).click());
  await page.screenshot({ path: `shots/compare-twin-${MECHANISM_IDS[MECHANISM_IDS.length - 1]}-faults.png` });

  // Every camera framing, single view, Specced.
  await redraw(page, () => page.getByLabel('Single').check());
  await redraw(page, () => page.getByRole('button', { name: 'Specced', exact: true }).click());
  for (const cam of CAMERAS) {
    await redraw(page, () => page.getByRole('button', { name: cam.name, exact: true }).click());
    const slug = cam.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '');
    await page.screenshot({ path: `shots/compare-camera-${slug}.png` });
  }

  // The lighting group, open.
  await redraw(page, () => page.getByRole('button', { name: CAMERAS[0].name, exact: true }).click());
  await page.goto(`${PAGE}?test=1&dev=1`);
  await page.waitForFunction(() => ((window as unknown as { __compare?: Compare }).__compare?.frames() ?? 0) >= 1);
  await page.getByText('Lighting (dev)').click();
  await page.locator('#lighting-dev').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'shots/compare-dev-lighting.png' });
});
