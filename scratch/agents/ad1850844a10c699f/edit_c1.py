import os

os.chdir('/home/user/motes-of-work')


def rep(p, old, new, count=1):
    s = open(p).read()
    assert s.count(old) == count, (p, s.count(old), old[:70])
    open(p, 'w').write(s.replace(old, new))


E = 'e2e/clearance.spec.ts'
rep(E, """// least MARGIN px below the bottom of the section's panel, measured on the page. And the essay's
// last frame is the finished bike, whole, under the text.""", """// least MARGIN px below the bottom of the section's panel, measured on the page. A brief line is
// absent until its own `data-at` (opacity 0, holding its place in the layout), so until then the
// text ends above it: the machine is held below the lowest line that is up, and the panel's full
// height still has to sit inside the text band. And the essay's last frame is the finished bike,
// whole, under the text.""")
rep(E, """/** The bottom of a section's panel, in px, with the section in the middle of its run. */
async function panelBottom(page: Page, s: Section): Promise<number> {
  await page.evaluate((y) => window.scrollTo(0, y), await targetScrollY(page, (s.start + s.end) / 2));
  await settle(page);
  return page.evaluate(
    (id) => (document.querySelector(`section[data-section="${id}"] .panel`) as HTMLElement).getBoundingClientRect().bottom,
    s.id,
  );
}""", """/** The bottom of a section's panel, in px, with the section in the middle of its run. */
async function panelBottom(page: Page, s: Section): Promise<number> {
  return (await panelText(page, s)).bottom;
}

/**
 * A section's panel, with the section in the middle of its run: its bottom, and for a brief the
 * bottom of its ask and of each of its lines with the line's `data-at` (px).
 */
async function panelText(page: Page, s: Section): Promise<{ bottom: number; ask: number; lines: { at: number; bottom: number }[] }> {
  await page.evaluate((y) => window.scrollTo(0, y), await targetScrollY(page, (s.start + s.end) / 2));
  await settle(page);
  return page.evaluate((id) => {
    const panel = document.querySelector(`section[data-section="${id}"] .panel`) as HTMLElement;
    const ask = panel.querySelector('.brief-ask');
    return {
      bottom: panel.getBoundingClientRect().bottom,
      ask: ask ? ask.getBoundingClientRect().bottom : 0,
      lines: [...panel.querySelectorAll<HTMLElement>('ul.brief > li')].map((li) => ({
        at: Number(li.dataset.at),
        bottom: li.getBoundingClientRect().bottom,
      })),
    };
  }, s.id);
}

/** The lowest text up at `local`: the panel's bottom, or, while a brief line is still absent, the lowest line (or the ask) already up. */
function textBottom(text: Awaited<ReturnType<typeof panelText>>, local: number): number {
  if (text.lines.length === 0 || text.lines.every((l) => l.at <= local)) return text.bottom;
  return Math.max(text.ask, ...text.lines.filter((l) => l.at <= local).map((l) => l.bottom));
}""")
rep(E, """      for (const [si, s] of story.entries()) {
        const bottom = await panelBottom(page, s);
        expect(bottom / viewport.height, `${s.id}: the panel inside the text band`).toBeLessThanOrEqual(0.42);""",
    """      for (const [si, s] of story.entries()) {
        const text = await panelText(page, s);
        expect(text.bottom / viewport.height, `${s.id}: the panel inside the text band`).toBeLessThanOrEqual(0.42);""")
rep(E, """            checked++;
            expect(m.top, `${s.id} page ${pi + 1} at local ${local.toFixed(3)}: machine top vs panel bottom ${bottom}`).toBeGreaterThanOrEqual(
              bottom + MARGIN,
            );""", """            checked++;
            // The brief's lines are on one page; on any other page every line of the brief is long
            // gone, and the panel's bottom is that page's.
            const first = Math.min(...text.lines.map((l) => l.at), Infinity);
            const onBrief = pg.in <= first && first < pg.out;
            const bottom = onBrief ? textBottom(text, local) : text.bottom;
            expect(m.top, `${s.id} page ${pi + 1} at local ${local.toFixed(3)}: machine top vs text bottom ${bottom}`).toBeGreaterThanOrEqual(
              bottom + MARGIN,
            );""")
print('ok')
