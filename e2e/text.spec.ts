import { expect, test, type Page } from '@playwright/test';
import { readSpans, settle, targetScrollY } from './helpers';

// The story as type on the stage: no boxes, self-hosted fonts, a brief whose look never animates,
// nothing that transitions, and a plain readable document without JavaScript. The page engine's
// fades are pinned in e2e/pages.spec.ts.
// `n=` keeps frames cheap under SwiftShader; the text does not depend on the motes.

test.setTimeout(90_000);

const QUERY = '&mech=bike&n=3000';

async function open(page: Page, query = QUERY): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`/?test=1${query}`);
  await page.waitForFunction(() => {
    const m = (window as unknown as { __motes?: { frames(): number } }).__motes;
    return m !== undefined && m.frames() >= 1;
  });
  await settle(page);
  return errors;
}

async function scrollToProgress(page: Page, p: number): Promise<void> {
  await page.evaluate((y) => window.scrollTo(0, y), await targetScrollY(page, p));
  await settle(page);
}

test('no element of the story text has a visible border, a filled background or a pool behind it', async ({ page }) => {
  const errors = await open(page);
  // Not vacuous: the check below walks every page and beat.
  expect(await page.locator('.panel .page').count()).toBeGreaterThan(4);
  expect(await page.locator('.panel .page .beat').count()).toBeGreaterThan(4);
  const boxed = await page.evaluate(() => {
    const found: string[] = [];
    for (const panel of document.querySelectorAll<HTMLElement>('.panel')) {
      for (const el of [panel, ...panel.querySelectorAll<HTMLElement>('*')]) {
        const s = getComputedStyle(el);
        const name = `${el.tagName.toLowerCase()}.${el.className}`;
        for (const side of ['Top', 'Right', 'Bottom', 'Left'] as const) {
          const width = parseFloat(s.getPropertyValue(`border-${side.toLowerCase()}-width`));
          const style = s.getPropertyValue(`border-${side.toLowerCase()}-style`);
          if (width > 0 && style !== 'none' && style !== 'hidden') found.push(`${name}: border-${side}`);
        }
        if (s.backgroundColor !== 'rgba(0, 0, 0, 0)') found.push(`${name}: background-color ${s.backgroundColor}`);
        if (s.backgroundImage !== 'none') found.push(`${name}: background-image`);
        if (s.boxShadow !== 'none') found.push(`${name}: box-shadow`);
        // Nothing drawn behind or before any of it either: legibility is the text shadow's job.
        for (const pseudo of ['::before', '::after']) {
          if (getComputedStyle(el, pseudo).content !== 'none') found.push(`${name}${pseudo}`);
        }
      }
    }
    return found;
  });
  expect(boxed).toEqual([]);
  expect(errors).toEqual([]);
});

test('the brief never animates: no transition or animation on a line', async ({ page }) => {
  const errors = await open(page);
  const lines = () =>
    page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('ul.brief > li')].map((li) => {
        const s = getComputedStyle(li);
        return { duration: s.transitionDuration, animation: s.animationName };
      }),
    );
  const check = (looks: { duration: string; animation: string }[]) => {
    expect(looks.length).toBe(6);
    for (const l of looks) expect(l).toEqual({ duration: '0s', animation: 'none' });
  };
  check(await lines());
  // Met lines too: the look is set, never faded in.
  const [vibeBuild] = await readSpans(page);
  await scrollToProgress(page, vibeBuild.end - 0.001);
  check(await lines());
  expect(errors).toEqual([]);
});

test('nothing in a panel animates: pages and lines are set from progress with no transition', async ({ page }) => {
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
});

test('a met line brightens from full ink, takes a halo and says so to a screen reader; the same by a jump as by a scroll', async ({
  page,
}) => {
  const errors = await open(page);
  // What a reader sees of each line, and what a screen reader hears.
  const look = () =>
    page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('ul.brief > li')].map((li) => {
        const s = getComputedStyle(li);
        return {
          met: li.hasAttribute('data-met'),
          said: li.querySelector('.sr-only')?.textContent ?? null,
          color: s.color,
          shadow: s.textShadow,
        };
      }),
    );
  const unmet = await look();
  expect(unmet.length).toBe(6);
  for (const line of unmet) expect([line.met, line.said]).toEqual([false, '']);
  const [vibeBuild] = await readSpans(page);
  const p = vibeBuild.end - 0.001;
  await scrollToProgress(page, p);
  const met = await look();
  for (const [i, line] of met.entries()) {
    expect([line.met, line.said], `line ${i}`).toEqual([true, ' (done)']);
    expect(line.color, `line ${i} brightens`).not.toBe(unmet[i].color);
    expect(line.shadow, `line ${i} takes a blue halo`).toContain('rgba(77, 163, 255');
    expect(unmet[i].shadow, `line ${i} has no halo while unmet`).not.toContain('rgba(77, 163, 255');
  }
  // The same state reached by a jump (?p=) is the same look.
  await open(page, `${QUERY}&p=${p}`);
  expect(await look()).toEqual(met);
  expect(errors).toEqual([]);
});

test('a superseded line steps back gently: at least 70% of the ink over the stage, never greyed out', async ({ page }) => {
  const errors = await open(page);
  // vb-1 once vb-2 is fully up on the same page: the earlier line at its full dim.
  const [vibeBuild] = await readSpans(page);
  await scrollToProgress(page, vibeBuild.start + 0.07 * (vibeBuild.end - vibeBuild.start));
  const { dim, color, rgb } = await page.evaluate(() => {
    const beat = document.querySelector<HTMLElement>('[data-beat="vb-1"]') as HTMLElement;
    const c = getComputedStyle(beat).color; // a color-mix may serialise as oklab(): paint it to read sRGB
    const ctx = document.createElement('canvas').getContext('2d') as CanvasRenderingContext2D;
    ctx.fillStyle = c;
    ctx.fillRect(0, 0, 1, 1);
    return { dim: Number(beat.style.getPropertyValue('--dim')), color: c, rgb: [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)] };
  });
  expect(dim).toBe(1);
  const [ink, stage] = [
    [232, 230, 238],
    [11, 13, 18],
  ];
  for (let c = 0; c < 3; c++) expect((rgb[c] - stage[c]) / (ink[c] - stage[c]), `${color}, channel ${c}`).toBeGreaterThanOrEqual(0.7);
  expect(errors).toEqual([]);
});

test('the type is self-hosted: Literata and Instrument Serif load with no request off the site', async ({
  page,
  baseURL,
}) => {
  const offsite: string[] = [];
  const fontFiles: string[] = [];
  page.on('request', (r) => {
    if (!r.url().startsWith(baseURL as string) && !r.url().startsWith('data:')) offsite.push(r.url());
    if (/\.woff2?$/.test(new URL(r.url()).pathname)) fontFiles.push(new URL(r.url()).pathname);
  });
  const errors = await open(page);
  const loaded = await page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family.replace(/"/g, '')} ${f.style} ${f.weight}`);
  });
  expect(loaded).toEqual(expect.arrayContaining(['Literata normal 400', 'Instrument Serif italic 400']));
  const families = await page.evaluate(() => {
    const family = (sel: string) => getComputedStyle(document.querySelector(sel) as HTMLElement).fontFamily;
    return { body: family('.panel p:not([class])'), brief: family('ul.brief > li'), ask: family('.brief-ask') };
  });
  expect(families).toEqual({ body: 'Literata, Georgia, serif', brief: 'Literata, Georgia, serif', ask: '"Instrument Serif", serif' });
  // Readers download only the faces the text is set in: no italic Literata, since nothing uses it.
  expect(fontFiles.length).toBeGreaterThan(0);
  for (const file of fontFiles) {
    expect(file).toMatch(/\/(literata-400|instrument-serif-400-italic)-[\w-]+\.woff$/);
    expect(file).not.toMatch(/literata-400-italic/);
  }
  expect(offsite).toEqual([]);
  expect(errors).toEqual([]);
});

test('no panel carries a label: each page is only its lines', async ({ page }) => {
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
  for (const text of firsts) expect(text).not.toMatch(/^\d{2} \u2014 /);
  expect(await page.locator('.run-label, .brief-label').count()).toBe(0);
  expect(errors).toEqual([]);
});

test('without JavaScript the story is a plain document: every line visible, in order, nothing sticky', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  try {
    await page.goto('/');
    await expect(page.locator('html')).toHaveClass(/(^|\s)no-js(\s|$)/);
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
    await expect(page.locator('ul.brief > li')).toHaveCount(6);
    // Every line of the brief is up too: without the scroll driver, nothing is absent.
    for (const li of await page.locator('ul.brief > li').all()) await expect(li).toHaveCSS('opacity', '1');
    await expect(page.locator('#stage')).toBeHidden();
  } finally {
    await context.close();
  }
});
