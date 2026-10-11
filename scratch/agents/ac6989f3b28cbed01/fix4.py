import os

os.chdir('/home/user/motes-of-work')
p = 'e2e/compare.spec.ts'
s = open(p).read()


def rep(a, b):
    global s
    assert a in s, a
    s = s.replace(a, b)


rep("""const canvas = (page: Page): Promise<Buffer> => page.locator('#stage').screenshot();""",
    """/**
 * The GL canvas alone. Element screenshots are composited, so the HTML overlays that sit on the
 * canvas (pane labels and borders, "Not yet built", notices) are hidden first: a pane is only
 * non-blank if the renderer drew it.
 */
async function canvas(page: Page): Promise<Buffer> {
  await page.addStyleTag({ content: '#panes, .pane, #building, #notice { visibility: hidden !important; }' });
  return page.locator('#stage').screenshot();
}""")
rep("""  frames(): number;
}""", """  frames(): number;
  systems(): string[];
}""")
rep("""  const panes = page.locator('.pane');
  await expect(panes).toHaveCount(4);
  const png = PNG.sync.read(await canvas(page));
  const half = { w: Math.floor(png.width / 2), h: Math.floor(png.height / 2) };
  for (let i = 0; i < 4; i++) {
    const id = MECHANISM_IDS[i];
    const pane = panes.nth(i);
    if (id === undefined) {
      await expect(pane).toContainText('Not yet built');
      continue;
    }
    await expect(pane).toContainText(mechanismMeta[id].label);
    // Crop the quadrant (row-major: 0 1 / 2 3) and count its lit pixels.
    const quad = new PNG({ width: half.w, height: half.h });
    PNG.bitblt(png, quad, (i % 2) * half.w, Math.floor(i / 2) * half.h, half.w, half.h, 0, 0);
    expect(countNonBackground(PNG.sync.write(quad)), `pane ${i} (${id})`).toBeGreaterThan(NON_BLANK);
  }""", """  const panes = page.locator('.pane');
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
  }""")
rep("""  for (const preset of PRESETS) {
    await redraw(page, () => page.getByRole('button', { name: preset.name, exact: true }).click());
    expect(countNonBackground""", """  for (const preset of PRESETS) {
    const button = page.getByRole('button', { name: preset.name, exact: true });
    await redraw(page, () => button.click());
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.presets [aria-pressed="true"]')).toHaveCount(1);
    await expect(page.locator('.preset-blurb')).toContainText(preset.name);
    expect(countNonBackground""")
rep("""test('the credits dialog ships the licence notices'""", """test('moving a slider by hand unmarks the preset', async ({ page }) => {
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

test('the credits dialog ships the licence notices'""")
rep("""  expect(scroll).toBeLessThanOrEqual(client);""", """  expect(scroll).toBeLessThanOrEqual(client);
  await expect(page.locator('.group-hint')).toHaveCount(3);
  for (const hint of await page.locator('.group-hint').all()) await expect(hint).toBeVisible();
  await expect(page.locator('.preset-blurb')).toBeVisible();""")
open(p, 'w').write(s)
print('ok')
