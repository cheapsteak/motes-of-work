import { expect, test, type Page } from '@playwright/test';
import { pageOut } from '../src/story/reveal';
import { readSpans, settle, targetScrollY } from './helpers';

// The text engine on the built page (docs/specs/2026-10-04-act-1-storyboard-and-text-engine.md §3,
// tests 10, 11 and 13, and the text band of 12): pages of lines whose looks are a pure function of
// scroll progress, one page at a time, anchored at the top of the screen. Timings are read from the
// page (`data-at`, `--length`), never hard-coded. `n=` keeps frames cheap; the text does not depend
// on the motes.

// The jump-and-scroll check runs in three parts per screen. Whole, it took 3.7 min at 1440x900 alone
// on SwiftShader (2.8 at 390x844): profiled, most of it is its deep links, each a full
// page load that builds the galaxy and links its shader programs again (SwiftShader links them on the
// CPU: 0.8-2.4 s of each Act II load, the load itself 1.3-3 s more), and the scrolls through the
// galaxy's last sections (1-2.4 s a sample). That is what a deep link costs, so the check is split
// rather than thinned: each part takes every third sample (so each its share of the costly ones), and
// the parts run in parallel: 1.6-1.9 min each, three at once, 3.6 min for both screens' six.
test.setTimeout(240_000);
test.describe.configure({ mode: 'parallel' });

/** The jump-and-scroll check's parts: each takes every PARTS-th of the samples, in their order. */
const PARTS = 3;

const QUERY = '&mech=bike&n=3000';
const FADE_SCREENS = 0.1;
/** The text band: the panel's bottom never lower than this fraction of the height. */
const TEXT_BAND = 0.42;

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

interface Shape {
  id: string;
  length: number;
  start: number;
  end: number;
  pages: { in: number; out: number; beats: number[] }[];
  /** Every document line's `data-at` in the section (the brief's lines). */
  lines: number[];
}

/** The story's sections, pages and beat timings, read from the page. */
async function shape(page: Page): Promise<Shape[]> {
  const spans = await readSpans(page);
  const sections = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('section[data-section]')].map((s) => ({
      length: Number(s.style.getPropertyValue('--length')),
      pages: [...s.querySelectorAll<HTMLElement>('.page')].map((p) => ({
        // A page given an explicit out says so; otherwise it is gone where the next page comes up.
        out: p.dataset.out === undefined ? undefined : Number(p.dataset.out),
        beats: [...p.querySelectorAll<HTMLElement>('.beat')].map((b) => ({ at: Number(b.dataset.at) })),
      })),
      lines: [...s.querySelectorAll<HTMLElement>('ul.brief > li')].map((li) => Number(li.dataset.at)),
    })),
  );
  return sections.map((s, i) => ({
    ...spans[i],
    length: s.length,
    pages: s.pages.map(({ beats }, k) => ({ in: beats[0].at, out: pageOut(s.pages, k), beats: beats.map((b) => b.at) })),
    lines: s.lines,
  }));
}

const global = (s: Shape, local: number) => s.start + local * (s.end - s.start);

/**
 * Every page's opacity, every beat's `--reveal` and `--dim`, and every brief line's `--reveal` and
 * opacity, per section, as the page draws them.
 */
const looks = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('section[data-section]')].map((s) =>
      [...s.querySelectorAll<HTMLElement>('.page')].map((p) => ({
        opacity: Number(getComputedStyle(p).opacity),
        beats: [...p.querySelectorAll<HTMLElement>('.beat')].map((b) => {
          const style = getComputedStyle(b);
          return {
            reveal: style.getPropertyValue('--reveal'),
            dim: style.getPropertyValue('--dim'),
            opacity: style.opacity,
            lines: [...b.querySelectorAll<HTMLElement>('ul.brief > li')].map((li) => {
              const ls = getComputedStyle(li);
              return { reveal: ls.getPropertyValue('--reveal'), opacity: ls.opacity };
            }),
          };
        }),
      })),
    ),
  );

/** The panel of a section, in viewport pixels. */
const panelBox = (page: Page, id: string) =>
  page.evaluate((sid) => {
    const r = (document.querySelector(`section[data-section="${sid}"] .panel`) as HTMLElement).getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width };
  }, id);

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  const size = `${viewport.width}x${viewport.height}`;

  test.describe(size, () => {
    test.use({ viewport });

    for (let part = 0; part < PARTS; part++)
      test(`every page and line looks the same reached by a jump, a forward scroll or a backward one (${size}, part ${part + 1} of ${PARTS})`, async ({
        page,
      }) => {
        const errors = await open(page);
        const story = await shape(page);
        // Per section: mid fade-in (of the first line that fades in), mid hold of the first page with
        // every line up, and mid page-out of the first page; and each brief line mid fade-in.
        const sectionSamples = story.flatMap((s, si) => {
          const fade = FADE_SCREENS / s.length;
          const first = s.pages[0];
          const fadingIn = si === 0 ? first.beats[1] : first.beats[0];
          const lastUp = first.beats[first.beats.length - 1] + fade;
          return [fadingIn + fade / 2, (lastUp + first.out - fade) / 2, first.out - fade / 2].map((l) => global(s, l));
        });
        const lineSamples = story.flatMap((s) => s.lines.map((at) => global(s, at + FADE_SCREENS / s.length / 2)));
        expect(lineSamples).toHaveLength(6);
        // This part's samples: every PARTS-th of them, so each part takes its share of the costly ones.
        const mine = [...sectionSamples, ...lineSamples].map((p, i) => ({ p, i })).filter((x) => x.i % PARTS === part);
        const ps = mine.map((x) => x.p);
        const forward: Awaited<ReturnType<typeof looks>>[] = [];
        for (const p of ps) {
          await scrollToProgress(page, p);
          forward.push(await looks(page));
        }
        const backward = [];
        for (const p of [...ps].reverse()) {
          await scrollToProgress(page, p);
          backward.unshift(await looks(page));
        }
        // Not vacuous: each sample has some page part-way through a fade, or wholly up; and at each
        // brief line's sample that line is part-way up.
        for (const [k, l] of forward.entries()) {
          const opacities = l.flat().map((pg) => pg.opacity);
          expect(Math.max(...opacities), `sample ${mine[k].i}`).toBeGreaterThan(0.05);
        }
        const briefLines = (l: Awaited<ReturnType<typeof looks>>) => l.flat().flatMap((pg) => pg.beats.flatMap((b) => b.lines.map((x) => Number(x.opacity))));
        for (const [k, l] of forward.entries()) {
          const line = mine[k].i - sectionSamples.length;
          if (line < 0) continue;
          const o = briefLines(l)[line];
          expect(o, `brief line ${line + 1} mid fade-in`).toBeGreaterThan(0.05);
          expect(o, `brief line ${line + 1} mid fade-in`).toBeLessThan(0.95);
        }
        expect(backward).toEqual(forward);
        for (const [k, p] of ps.entries()) {
          errors.push(...(await open(page, `${QUERY}&p=${p}`)));
          expect(await looks(page), `jump to ${p}`).toEqual(forward[k]);
        }
        expect(errors).toEqual([]);
      });

    test(`one page at a time, its lines up in reading order (${size})`, async ({ page }) => {
      const errors = await open(page);
      const story = await shape(page);
      const all = story.flatMap((s, si) => s.pages.map((pg, pi) => ({ s, si, pg, pi })));
      for (const [k, { s, si, pg, pi }] of all.entries()) {
        const name = `${s.id} page ${pi + 1}`;
        if (k > 0) {
          // At a page's in, the page before it (in this section or the last) has gone.
          await scrollToProgress(page, global(s, pg.in));
          const prev = all[k - 1];
          expect((await looks(page))[prev.si][prev.pi].opacity, `${name}: the page before at its in`).toBeLessThan(0.002);
        }
        await scrollToProgress(page, global(s, (pg.in + pg.out) / 2));
        const now = await looks(page);
        const up = now.flatMap((sec, i) => sec.map((p, j) => ({ i, j, o: p.opacity }))).filter((x) => x.o > 0);
        expect(
          up.map((x) => [x.i, x.j]),
          `${name}: only it is up mid-page`,
        ).toEqual([[si, pi]]);
        const reveals = now[si][pi].beats.map((b) => Number(b.reveal));
        for (let i = 1; i < reveals.length; i++) expect(reveals[i], `${name} line ${i + 1}`).toBeLessThanOrEqual(reveals[i - 1]);
      }
      expect(errors).toEqual([]);
    });

    test(`the panel holds its place at the top for its whole section, inside the text band (${size})`, async ({ page }) => {
      const errors = await open(page);
      const portrait = viewport.width < viewport.height;
      for (const s of await shape(page)) {
        const boxes = [];
        for (const local of [0.05, 0.5, 0.95]) {
          await scrollToProgress(page, global(s, local));
          boxes.push(await panelBox(page, s.id));
        }
        for (const [i, box] of boxes.entries()) {
          expect(box, `${s.id}: the same box at each sample`).toEqual(boxes[0]);
          // 7vh on a wide screen; 6svh below the (here empty) safe area on a phone.
          expect(box.top, `${s.id} top ${i}`).toBeCloseTo((portrait ? 0.06 : 0.07) * viewport.height, 0);
          expect(box.bottom / viewport.height, `${s.id} bottom`).toBeLessThanOrEqual(TEXT_BAND);
          if (portrait) {
            expect(box.left, s.id).toBeCloseTo(16, 0);
            expect(box.right, s.id).toBeCloseTo(viewport.width - 16, 0);
          } else {
            // A 36rem column, centred.
            expect(box.width, s.id).toBeCloseTo(36 * 16, 0);
            expect(box.left + box.width / 2, s.id).toBeCloseTo(viewport.width / 2, 0);
          }
        }
      }
      expect(errors).toEqual([]);
    });
  });
}
