p = 'e2e/text.spec.ts'
s = open(p).read()


def rep(old, new):
    global s
    assert s.count(old) == 1, old[:80]
    s = s.replace(old, new)


rep("""// The story as type on the stage: no boxes, self-hosted fonts, a brief whose look never animates,
// and panels that fade as a pure function of scroll progress.
// `n=` keeps frames cheap under SwiftShader; the text does not depend on the motes.
""", """// The story as type on the stage: no boxes, self-hosted fonts, a brief whose look never animates,
// nothing that transitions, and a plain readable document without JavaScript. The page engine's
// fades are pinned in e2e/pages.spec.ts.
// `n=` keeps frames cheap under SwiftShader; the text does not depend on the motes.
""")

rep("""/** Opacity of every panel, in story order. */
const opacities = (page: Page): Promise<number[]> =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('section[data-section] .panel')].map((p) => Number(getComputedStyle(p).opacity)),
  );

""", "")

rep("""test('no element of the story text has a visible border, a filled background or a pool behind it', async ({ page }) => {
  const errors = await open(page);
  const boxed = await page.evaluate(() => {
    const found: string[] = [];
    for (const panel of document.querySelectorAll<HTMLElement>('.panel')) {""", """test('no element of the story text has a visible border, a filled background or a pool behind it', async ({ page }) => {
  const errors = await open(page);
  // Not vacuous: the check below walks every page and beat.
  expect(await page.locator('.panel .page').count()).toBeGreaterThan(4);
  expect(await page.locator('.panel .page .beat').count()).toBeGreaterThan(4);
  const boxed = await page.evaluate(() => {
    const found: string[] = [];
    for (const panel of document.querySelectorAll<HTMLElement>('.panel')) {""")

rep("""test('the panels never animate, their fade is set from progress with no transition', async ({ page }) => {
  const errors = await open(page);
  const panels = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('section[data-section] .panel')].map((p) => {
      const s = getComputedStyle(p);
      return { duration: s.transitionDuration, animation: s.animationName };
    }),
  );
  expect(panels.length).toBe(4);
  for (const p of panels) expect(p).toEqual({ duration: '0s', animation: 'none' });
  expect(errors).toEqual([]);
});""", """test('nothing in a panel animates: pages and lines are set from progress with no transition', async ({ page }) => {
  const errors = await open(page);
  const moving = await page.evaluate(() => {
    const found: string[] = [];
    let seen = 0;
    for (const el of document.querySelectorAll<HTMLElement>('section[data-section] .panel, section[data-section] .panel *')) {
      seen++;
      const s = getComputedStyle(el);
      if (s.transitionDuration !== '0s' || s.animationName !== 'none') {
        found.push(`${el.tagName.toLowerCase()}.${el.className}: ${s.transitionDuration} ${s.animationName}`);
      }
    }
    return { found, seen, pages: document.querySelectorAll('.panel .page').length, beats: document.querySelectorAll('.panel .beat').length };
  });
  expect(moving.found).toEqual([]);
  expect(moving.pages).toBeGreaterThan(4);
  expect(moving.beats).toBeGreaterThan(moving.pages);
  expect(moving.seen).toBeGreaterThan(moving.beats);
  expect(errors).toEqual([]);
});""")

rep("""test('no panel carries a running label: each opens on its own text', async ({ page }) => {
  const errors = await open(page);
  const firsts = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('section[data-section] .panel')].map((p) => p.firstElementChild?.textContent ?? ''),
  );
  expect(firsts.length).toBe(4);
  for (const text of firsts) expect(text).not.toMatch(/^\\d{2} \\u2014 /);
  expect(await page.locator('.run-label, .brief-label').count()).toBe(0);
  expect(errors).toEqual([]);
});""", """test('no panel carries a label: each page is only its lines', async ({ page }) => {
  const errors = await open(page);
  const strays = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('section[data-section] .panel')].flatMap((panel) => [
      ...[...panel.children].filter((c) => !c.matches('.page')).map((c) => `panel > ${c.tagName.toLowerCase()}`),
      ...[...panel.querySelectorAll(':scope > .page > *')].filter((c) => !c.matches('.beat')).map((c) => `page > ${c.tagName.toLowerCase()}`),
    ]),
  );
  expect(strays).toEqual([]);
  const firsts = await page.locator('.page > .beat:first-child').allTextContents();
  expect(firsts.length).toBeGreaterThan(4);
  for (const text of firsts) expect(text).not.toMatch(/^\\d{2} \\u2014 /);
  expect(await page.locator('.run-label, .brief-label').count()).toBe(0);
  expect(errors).toEqual([]);
});""")

start = s.index("test('panels fade with progress: one shows mid-section, none at a boundary'")
s = s[:start] + """test('without JavaScript the story is a plain document: every line visible, in order, nothing sticky', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  try {
    await page.goto('/');
    await expect(page.locator('html')).toHaveClass(/(^|\\s)no-js(\\s|$)/);
    const beats = page.locator('section[data-section] .beat');
    const n = await beats.count();
    expect(n, 'the story is in the page without JavaScript').toBeGreaterThan(10);
    let last = -Infinity;
    for (let i = 0; i < n; i++) {
      const beat = beats.nth(i);
      await expect(beat, `beat ${i}`).toBeVisible();
      // Full opacity on the line and everything around it.
      for (const el of [beat, beat.locator('xpath=ancestor::div[contains(@class, "page")]'), beat.locator('xpath=ancestor::article')]) {
        await expect(el, `beat ${i}`).toHaveCSS('opacity', '1');
      }
      const box = await beat.boundingBox();
      if (!box) throw new Error(`beat ${i} has no box`);
      expect(box.y, `beat ${i} follows the one before it`).toBeGreaterThan(last);
      last = box.y + box.height - 1;
    }
    for (const panel of await page.locator('.panel').all()) await expect(panel).toHaveCSS('position', 'static');
    await expect(page.locator('ul.brief > li')).toHaveCount(5);
    await expect(page.locator('#stage')).toBeHidden();
  } finally {
    await context.close();
  }
});
"""
open(p, 'w').write(s)
print('ok')
