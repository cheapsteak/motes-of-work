import re


def patch(p, pairs):
    s = open(p).read()
    for old, new in pairs:
        assert s.count(old) == 1, (p, old[:80])
        s = s.replace(old, new)
    open(p, 'w').write(s)


# ---- app.spec.ts
app = '/home/user/motes-of-work/e2e/app.spec.ts'
s = open(app).read()
start = s.index("// Panels and progress agree: just inside each end of a section's progress span")
end = s.index("test('the scroll range equals the summed section heights'")
s = s[:start] + s[end:]
open(app, 'w').write(s)

patch(app, [
    ("""// Section ids and progress spans are read from the story DOM (readSpans), never hard-coded.
const panel = (page: Page, id: string) => page.locator(`section[data-section="${id}"] .panel`);
""", """// Section ids and progress spans are read from the story DOM (readSpans), never hard-coded.
const panel = (page: Page, id: string) => page.locator(`section[data-section="${id}"] .panel`);

/** Opacity of every page, per section id: what of the story is showing. */
const pageOpacities = (page: Page): Promise<Record<string, number[]>> =>
  page.evaluate(() =>
    Object.fromEntries(
      [...document.querySelectorAll<HTMLElement>('section[data-section]')].map((s) => [
        s.dataset.section as string,
        [...s.querySelectorAll<HTMLElement>('.page')].map((p) => Number(getComputedStyle(p).opacity)),
      ]),
    ),
  );

/** Ids of the sections with a page showing. */
const showing = async (page: Page): Promise<string[]> =>
  Object.entries(await pageOpacities(page))
    .filter(([, ps]) => ps.some((o) => o > 0))
    .map(([id]) => id);
"""),
    ("""test('?p=0.6 lands at progress 0.6 with only its section in view', async ({ page }) => {
  const errors = await open(page, '&p=0.6');
  expect(Math.abs((await progress(page)) - 0.6)).toBeLessThan(0.002);
  const spans = await readSpans(page);
  const here = spanAt(spans, 0.6);
  await expect(panel(page, here.id)).toBeInViewport();
  for (const { id } of spans.filter((s) => s !== here)) await expect(panel(page, id), id).not.toBeInViewport();
  expect(errors).toEqual([]);
});""", """test('?p=0.6 lands at progress 0.6 with only its section showing', async ({ page }) => {
  const errors = await open(page, '&p=0.6');
  expect(Math.abs((await progress(page)) - 0.6)).toBeLessThan(0.002);
  const here = spanAt(await readSpans(page), 0.6);
  await expect(panel(page, here.id)).toBeInViewport();
  // A neighbour's panel may be in the viewport on its way to or from the anchor, but at opacity 0.
  expect(await showing(page)).toEqual([here.id]);
  expect(errors).toEqual([]);
});"""),
    ("""  await expect(panel(page, 'vibe-build')).toBeVisible();
  await expect(panel(page, 'vibe-build')).toBeInViewport();

  // The loop has stopped: scrolling no longer renders.
  const stopped = await frames(page);
  await page.mouse.wheel(0, 600);
  await settle(page);
  await page.waitForTimeout(300);
  expect(await frames(page)).toBe(stopped);
  expect(errors).toEqual([]);
});""", """  await expect(panel(page, 'vibe-build')).toBeVisible();
  await expect(panel(page, 'vibe-build')).toBeInViewport();

  // The loop has stopped: scrolling no longer renders.
  const stopped = await frames(page);
  await page.mouse.wheel(0, 600);
  await settle(page);
  await page.waitForTimeout(300);
  expect(await frames(page)).toBe(stopped);

  // The pages still turn: they fade from the scroll driver, not the frame loop.
  const reveal = (await readSpans(page)).find((s) => s.id === 'reveal');
  if (!reveal) throw new Error('no reveal section');
  await page.evaluate((y) => window.scrollTo(0, y), await targetScrollY(page, reveal.start + 0.07 * (reveal.end - reveal.start)));
  await settle(page);
  await page.waitForTimeout(300);
  const pages = await pageOpacities(page);
  expect(pages.reveal[0], 'the reveal page has come up').toBe(1);
  expect(Math.max(...pages['vibe-build']), 'the cold open has gone').toBe(0);
  expect(await frames(page)).toBe(stopped);
  expect(errors).toEqual([]);
});"""),
])

# ---- brief.spec.ts
brief = '/home/user/motes-of-work/e2e/brief.spec.ts'
patch(brief, [
    ("""  // One progress with nothing met, one mid-build, one with everything met.
  const targets = [
    vibeBuild.start + 0.02 * len,
    vibeBuild.start + 0.3 * len,
    vibeBuild.start + 0.9 * len,
  ];""", """  // One progress with nothing met, one mid-build, one with everything met.
  const targets = [
    vibeBuild.start + 0.02 * len,
    vibeBuild.start + 0.6 * len,
    vibeBuild.start + 0.9 * len,
  ];"""),
    ("""  // The seat-and-handlebars line would be met by now on the bike; with unknown parts it waits.
  await scrollToProgress(
    page,
    vibeBuild.start + 0.3 * (vibeBuild.end - vibeBuild.start),
  );""", """  // The seat-and-handlebars line would be met by now on the bike; with unknown parts it waits.
  await scrollToProgress(
    page,
    vibeBuild.start + 0.6 * (vibeBuild.end - vibeBuild.start),
  );"""),
])

# ---- portrait.spec.ts
portrait = '/home/user/motes-of-work/e2e/portrait.spec.ts'
s = open(portrait).read()
start = s.index("// The spec section frames the core close")
s = s[:start].rstrip() + '\n'
open(portrait, 'w').write(s)
patch(portrait, [
    ("""import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { PNG } from 'pngjs';
import { mechanisms } from '../src/mechanisms';
import { KeyframeSampler, type KeyframeFile } from '../src/timeline/keyframeSampler';
import { canvasShot, openStage, readSpans, settle, targetScrollY } from './helpers';
import { machineOnScreen } from './machine';

// Portrait (a phone held upright): the camera lifts the machine into the upper part of the screen
// and the text sits under it, low and fixed for its whole section, over a scrim.
""", """import { expect, test, type Page } from '@playwright/test';
import { PNG } from 'pngjs';
import { canvasShot, openStage, settle } from './helpers';

// Portrait (a phone held upright): the text takes the top of the screen over a scrim (its place and
// its pages are pinned for both sizes in e2e/pages.spec.ts), and the camera reframes the machine.
"""),
])
s = open(portrait).read()
start = s.index("async function scrollToProgress(page: Page, p: number)")
end = s.index("test('portrait lays a fixed scrim under the text")
s = s[:start] + s[end:]
open(portrait, 'w').write(s)
patch(portrait, [
    ("""test('portrait lays a fixed scrim under the text, draws nothing behind a panel, and lifts the vignette', async ({ page }) => {""",
     """test('portrait lays a fixed scrim under the text band, draws nothing behind a panel, and lowers the vignette', async ({ page }) => {"""),
    ("""  expect(look.scrim.image).toMatch(/^linear-gradient\\(0deg, rgba\\(11, 13, 18, 0\\.95\\) 0px, rgba\\(11, 13, 18, 0\\.88\\) 38svh, rgba\\(11, 13, 18, 0\\) 62svh\\)$/);
  expect(look.vignette).toMatch(/at 50% 38%/);""",
     """  expect(look.scrim.image).toBe('linear-gradient(rgba(11, 13, 18, 0.72) 0px, rgba(11, 13, 18, 0.45) 22svh, rgba(0, 0, 0, 0) 42svh)');
  expect(look.vignette).toMatch(/at 50% 64%/);"""),
    ("""test('the machine is drawn in the upper part of the screen, clear of the text', async ({ page }) => {
  // Mid-reveal, the bike. Canvas only: panels, scrim and vignette are hidden.""",
     """// The portrait rig still lifts the machine into the upper frame, as it did when the text sat below
// it; the storyboard's framing (the machine below the text band) replaces this with the camera work.
test('the portrait rig draws the machine in the upper part of the screen', async ({ page }) => {
  // The reveal, the bike. Canvas only: panels, scrim and vignette are hidden."""),
])
open(portrait, 'a').close()

# ---- shots.spec.ts
shots = '/home/user/motes-of-work/e2e/shots.spec.ts'
patch(shots, [
    ("""// Human-review screenshots of the stage canvas: `npm run shots` writes shots/<id>-<local>.png for
// every story section at local progress 0.1, 0.5 and 0.9, and shots/mech-<mech>-<look>.png for every""",
     """// Human-review screenshots of the stage canvas: `npm run shots` writes shots/<beat>.png for every
// beat of the story, at the middle of its hold (full ink, nothing on its page changing; the
// storyboard's beat midpoints), and shots/mech-<mech>-<look>.png for every"""),
    ("""// the ghost (fault-<key>). Skipped unless SHOTS=1. Section ids, spans and mechanisms are read from
// the DOM and the registry, so a new section or mechanism is picked up without editing this file.""",
     """// the ghost (fault-<key>). Skipped unless SHOTS=1. Beats, their timings, spans and mechanisms are
// read from the DOM and the registry, so a new beat or mechanism is picked up without editing this file."""),
    ("""const LOCALS = [0.1, 0.5, 0.9];

test('screenshot every section at local 0.1, 0.5 and 0.9', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await openStage(page);
  mkdirSync('shots', { recursive: true });

  for (const span of await readSpans(page)) {
    for (const local of LOCALS) {
      const p = span.start + local * (span.end - span.start);
      await page.evaluate((y) => window.scrollTo(0, y), await targetScrollY(page, p));
      await settle(page);
      await canvasShot(page, `shots/${span.id}-${local}.png`);
    }
  }
  if (errors.length > 0) throw new Error(`page errors: ${errors.join('; ')}`);
});""", """/** Every beat's id and the section-local middle of its hold, per section. */
const beatMiddles = (page: Page) =>
  page.evaluate((fadeScreens) =>
    [...document.querySelectorAll<HTMLElement>('section[data-section]')].map((s) => {
      const fade = fadeScreens / Number(s.style.getPropertyValue('--length'));
      const pages = [...s.querySelectorAll<HTMLElement>('.page')].map((p) =>
        [...p.querySelectorAll<HTMLElement>('.beat')].map((b) => ({ id: b.dataset.beat as string, at: Number(b.dataset.at) })),
      );
      return pages.flatMap((beats, k) => {
        const out = pages[k + 1]?.[0].at ?? 1;
        return beats.map((b, i) => ({ id: b.id, local: (b.at + fade + (beats[i + 1]?.at ?? out - fade)) / 2 }));
      });
    }),
  FADE_SCREENS);

test('screenshot every beat at the middle of its hold', async ({ page }) => {
  test.setTimeout(600_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await openStage(page);
  mkdirSync('shots', { recursive: true });

  const spans = await readSpans(page);
  for (const [i, beats] of (await beatMiddles(page)).entries()) {
    for (const { id, local } of beats) {
      const p = spans[i].start + local * (spans[i].end - spans[i].start);
      await page.evaluate((y) => window.scrollTo(0, y), await targetScrollY(page, p));
      await settle(page);
      await canvasShot(page, `shots/${id}.png`);
    }
  }
  if (errors.length > 0) throw new Error(`page errors: ${errors.join('; ')}`);
});"""),
    ("""import { test } from '@playwright/test';
import { MECHANISM_IDS } from '../src/mechanisms';
""", """import { test, type Page } from '@playwright/test';
import { MECHANISM_IDS } from '../src/mechanisms';
import { FADE_SCREENS } from '../src/story/reveal';
"""),
])
print('ok')
