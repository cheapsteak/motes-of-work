p = "/home/user/mow-compare/e2e/compare.spec.ts"
s = open(p).read()


def rep(old, new):
    global s
    assert old in s, old[:80]
    s = s.replace(old, new)


rep(
    """import { PRESETS, SLIDERS } from '../src/compare/controls';""",
    """import { CAMERAS, PRESETS, SLIDERS } from '../src/compare/controls';
import { LIGHTING } from '../src/scene/lighting';""",
)
rep(
    """// The mechanism comparison page (src/compare/). Every test runs at the 30k budget in a small
// viewport so SwiftShader stays quick;""",
    """// The mechanism comparison page (src/compare/). Every test but the default-budget one runs at the
// 30k budget in a small viewport so SwiftShader stays quick;""",
)
rep(
    """interface Compare {
  state(): SceneState;""",
    """interface Compare {
  state(): SceneState;
  paneStates(): SceneState[];""",
)
rep(
    """const nan = (page: Page): Promise<boolean> =>
  page.evaluate(() => (window as unknown as { __compare: Compare }).__compare.nan());""",
    """const nan = (page: Page): Promise<boolean> =>
  page.evaluate(() => (window as unknown as { __compare: Compare }).__compare.nan());
const paneStates = (page: Page): Promise<SceneState[]> =>
  page.evaluate(() => (window as unknown as { __compare: Compare }).__compare.paneStates());
const systems = (page: Page): Promise<string[]> =>
  page.evaluate(() => (window as unknown as { __compare: Compare }).__compare.systems());""",
)
rep(
    """async function open(page: Page, query = ''): Promise<void> {
  await page.goto(`${PAGE}?test=1&budget=30000${query}`);
  await page.waitForFunction(() => ((window as unknown as { __compare?: Compare }).__compare?.frames() ?? 0) >= 1);
}""",
    """async function open(page: Page, query = '', budget: string | null = '30000'): Promise<void> {
  await page.goto(`${PAGE}?test=1${budget === null ? '' : `&budget=${budget}`}${query}`);
  await page.waitForFunction(() => ((window as unknown as { __compare?: Compare }).__compare?.frames() ?? 0) >= 1);
}""",
)
rep(
    """  return page.locator('#stage').screenshot();
}
""",
    """  return page.locator('#stage').screenshot();
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
""",
)
rep(
    """  await redraw(page, () => page.getByLabel('Side by side').check());
  await expect(page.locator('button[data-mech]').first()).toBeDisabled();
""",
    """  await redraw(page, () => page.getByLabel('Side by side').check());
  await expect(page.locator('button[data-mech]').first()).toBeDisabled();
  // Every mechanism is on screen: none reads as picked, and the picker says all are shown.
  await expect(page.locator('button[data-mech][aria-pressed="true"]')).toHaveCount(0);
  await expect(page.locator('.picker')).toHaveClass(/\\ball\\b/);
""",
)
rep(
    """test('the controls fit a 1280x720 window without scrolling', async ({ page }) => {
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
});""",
    """test('the controls fit a 1280x720 window without scrolling, for every preset, view and mechanism', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await open(page);
  // Layout only, so the clicks need not wait for frames. The mechanism blurb and the preset blurb are
  // the parts whose height varies; every combination of them is checked.
  const views = ['Single', 'Twin pair', 'Side by side'];
  for (const id of MECHANISM_IDS) {
    for (const view of views) {
      await page.getByLabel('Single').check();
      await page.locator(`button[data-mech="${id}"]`).click();
      await page.getByLabel(view).check();
      for (const preset of PRESETS) {
        const where = `${id} / ${view} / ${preset.name}`;
        await page.getByRole('button', { name: preset.name, exact: true }).click();
        const { scroll, client, doc } = await page.evaluate(() => {
          const panel = document.getElementById('panel') as HTMLElement;
          return {
            scroll: panel.scrollHeight,
            client: panel.clientHeight,
            doc: document.documentElement.scrollHeight - window.innerHeight,
          };
        });
        expect(scroll, where).toBeLessThanOrEqual(client);
        await expect(page.locator('.group-hint')).toHaveCount(3);
        for (const hint of await page.locator('.group-hint').all()) await expect(hint, where).toBeVisible();
        await expect(page.locator('.preset-blurb'), where).toBeVisible();
        expect(doc, where).toBeLessThanOrEqual(0);
        // Every label, button and value is shown whole, not cut off with an ellipsis.
        const clipped = await page.evaluate(() =>
          [...document.querySelectorAll<HTMLElement>('#panel label:not(.sr-only), #panel button, #panel output')]
            .filter((e) => e.scrollWidth > e.clientWidth || e.scrollHeight > e.clientHeight + 1)
            .map((e) => e.textContent),
        );
        expect(clipped, where).toEqual([]);
      }
    }
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
  for (const view of ['Single', 'Twin pair', 'Side by side']) {
    await redraw(page, () => page.getByLabel(view).check());
    const hint = await page.locator('#orbit-hint').boundingBox();
    if (!hint) throw new Error('no orbit hint');
    const hintBox = { left: hint.x, top: hint.y, right: hint.x + hint.width, bottom: hint.y + hint.height };
    // The label's text, not its block (a label div spans its pane's width).
    const labels = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('.pane .label, .pane.empty')].map((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        const r = range.getBoundingClientRect();
        return { text: el.textContent, left: r.left, top: r.top, right: r.right, bottom: r.bottom };
      }),
    );
    expect(labels.length, view).toBeGreaterThan(0);
    for (const label of labels) expect(overlaps(hintBox, label), `${view}: ${label.text}`).toBe(false);
  }
});""",
)
rep(
    """test('switching budget shows a building notice and frees the old budget', async ({ page }) => {
  await open(page);
  const systems = () => page.evaluate(() => (window as unknown as { __compare: Compare }).__compare.systems());
  const id = MECHANISM_IDS[0];
  expect(await systems()).toEqual([`${id}@30000`]);""",
    """test('switching budget shows a building notice and frees the old budget', async ({ page }) => {
  await open(page);
  const id = MECHANISM_IDS[0];
  expect(await systems(page)).toEqual([`${id}@30000`]);""",
)
rep(
    """  await redraw(page, () => page.locator('#budget').selectOption('100000'));
  expect(await systems()).toEqual([`${id}@100000`]);""",
    """  await redraw(page, () => page.locator('#budget').selectOption('100000'));
  expect(await systems(page)).toEqual([`${id}@100000`]);""",
)
rep(
    """  // Side by side has its own budget (30k here): the 100k systems go.
  await redraw(page, () => page.getByLabel('Side by side').check());
  expect((await systems()).every((k) => k.endsWith('@30000'))).toBe(true);
});""",
    """  // One budget for every view: side by side keeps 100k, so the switch frees nothing and builds
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
  const id = MECHANISM_IDS[0];
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

test('twin pair: one mechanism, correct and specced | vibed wrong twin with no ghost, in two drawn panes', async ({
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

  const [a, b] = halves(PNG.sync.read(await canvas(page)));
  const lit = [a, b].map((h) => countNonBackground(PNG.sync.write(h)));
  expect(lit[0], 'left pane').toBeGreaterThan(NON_BLANK);
  expect(lit[1], 'right pane').toBeGreaterThan(NON_BLANK);
  // Two different machines, not one drawn twice.
  expect(differing(a, b)).toBeGreaterThan(NON_BLANK);
  expect(await nan(page)).toBe(false);
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
});""",
)
rep(
    """  await redraw(page, () => page.getByRole('button', { name: 'Specced', exact: true }).click());
  await redraw(page, () => page.getByLabel('Side by side').check());
  await page.screenshot({ path: 'shots/compare-grid-specced.png' });
});""",
    """  await redraw(page, () => page.getByRole('button', { name: 'Specced', exact: true }).click());
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
});""",
)
open(p, "w").write(s)
