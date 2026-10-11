p = "/home/user/mow-compare/e2e/compare.spec.ts"
s = open(p).read()
start = s.index("test('the controls fit a 1280x720 window without scrolling, for every preset, view and mechanism'")
end = s.index("test('the preset blurb is set off from the mechanism blurb")
new = """test('the controls fit a 1280x720 window without scrolling, for every preset, view and mechanism', async ({
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

"""
s = s[:start] + new + s[end:]
open(p, "w").write(s)
