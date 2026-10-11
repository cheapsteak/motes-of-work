test('no element of the story text has a visible border, a filled background or a pool behind it', async ({ page }) => {
  const errors = await open(page);
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
    expect(looks.length).toBe(5);
    for (const l of looks) expect(l).toEqual({ duration: '0s', animation: 'none' });
  };
  check(await lines());
  // Met lines too: the look is set, never faded in.
  const [vibeBuild] = await readSpans(page);
  await scrollToProgress(page, vibeBuild.end - 0.001);
  check(await lines());
  expect(errors).toEqual([]);
});

test('the panels never animate, their fade is set from progress with no transition', async ({ page }) => {
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
});

test('a met line brightens, takes a halo and says so to a screen reader; the same by a jump as by a scroll', async ({
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
  expect(unmet.length).toBe(5);
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
  for (const file of fontFiles) expect(file).toMatch(/\/(literata-400|instrument-serif-400-italic)[-.][^/]*woff$/);
  expect(offsite).toEqual([]);
  expect(errors).toEqual([]);
});
