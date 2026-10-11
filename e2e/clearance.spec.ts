import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { PNG } from 'pngjs';
import { mechanisms } from '../src/mechanisms';
import { KeyframeSampler, type KeyframeFile } from '../src/timeline/keyframeSampler';
import { AMBIENT_GRID, AMBIENT_POSE } from '../src/galaxy/ambient';
import { canvasShot, openStage, readSpans, settle, targetScrollY } from './helpers';
import { galaxyOf } from '../src/scene/node/galaxyOnScreen';
import { machineOnScreen } from './machine';
import { NODE_FIX_WINDOW } from '../src/scene/node/birth';
import { pageOut } from '../src/story/reveal';

// The machine keeps out of the text (docs/specs/2026-10-04-act-1-storyboard-and-text-engine.md §4
// test 12): the text sits at the top of every screen, and the camera frames the machine below it.
// At both test sizes, at progress values all through every page's full-ink stretch, the visible
// machine (settled motes and the drawing, e2e/machine.ts, through the composed camera) starts at
// least MARGIN px below the bottom of the section's panel, measured on the page. A brief line is
// absent until its own `data-at` (opacity 0, holding its place in the layout), so until then the
// text ends above it: the machine is held below the lowest line that is up, and the panel's full
// height still has to sit inside the text band. And Act I's last frame is the finished bike, whole,
// under the text. Act II's galaxy (visibleGalaxy: the lit, built bodies, each point half its sprite higher, a lit body above the screen
// counting as above the text) is held the same way, through the essay's tracked camera, every Act II
// section at every AMBIENT_GRID pose (the galaxy turns under it, and every shot rides it). One more
// for Act II (design test 14): every fix's warm motes, at the instant they are all half landed (the
// grid steps over it), at every AMBIENT_GRID pose (their hosts move with the turn).

test.setTimeout(240_000);

const MARGIN = 8;
// Read, not imported: Playwright's loader wants an import attribute on JSON that the app build does not.
const keyframes = JSON.parse(readFileSync(new URL('../src/timeline/keyframes.json', import.meta.url), 'utf8')) as KeyframeFile;
/** Section-local spacing of the samples inside each page. */
const STEP = 0.01;
const FADE_SCREENS = 0.1;

interface Section {
  id: string;
  start: number;
  end: number;
  pages: { in: number; out: number }[];
}

async function open(page: Page, query = ''): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`/?test=1&mech=bike&n=500${query}`);
  await page.waitForFunction(() => {
    const m = (window as unknown as { __motes?: { frames(): number } }).__motes;
    return m !== undefined && m.frames() >= 1;
  });
  await page.evaluate(() => document.fonts.ready);
  await settle(page);
  return errors;
}

/** Sections, their spans and their pages' in and out, read from the page. */
async function sections(page: Page): Promise<Section[]> {
  const spans = await readSpans(page);
  const pages = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('section[data-section]')].map((s) =>
      [...s.querySelectorAll<HTMLElement>('.page')].map((p) => ({
        // A page's first beat is where it comes up.
        beats: [{ at: Number((p.querySelector('.beat') as HTMLElement).dataset.at) }],
        // An explicit out (data-out) takes the page away before the next one comes up.
        out: p.dataset.out === undefined ? undefined : Number(p.dataset.out),
      })),
    ),
  );
  return spans.map((span, i) => ({
    ...span,
    pages: pages[i].map((p, k) => ({ in: p.beats[0].at, out: pageOut(pages[i], k) })),
  }));
}

/** The bottom of a section's panel, in px, with the section in the middle of its run. */
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
}

/** Act II's sections, every one keyed on the galaxy (Task 11): the galaxy turns under each, so each is held at every AMBIENT_GRID pose. */
const ACT_II = ['zoom-out', 'layers', 'far', 'defect', 'spread', 'reviewer', 'trace', 'fix', 'lesson'];
/** The ambients a section is held at: every Act II section at every AMBIENT_GRID pose, Act I at the pose tests stop at. */
const ambientsOf = (id: string): readonly number[] => (ACT_II.includes(id) ? AMBIENT_GRID : [AMBIENT_POSE]);

/** A page's full-ink stretch, section-local: after its fade-in, before its fade-out (none at the essay's two ends). */
function fullInk(story: Section[], lengths: number[], si: number, pi: number): [number, number] {
  const s = story[si];
  const pg = s.pages[pi];
  const fade = FADE_SCREENS / lengths[si];
  const first = si === 0 && pi === 0;
  const last = si === story.length - 1 && pi === s.pages.length - 1;
  return [pg.in + (first ? 0 : fade), pg.out - (last ? 0 : fade)];
}

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  const size = `${viewport.width}x${viewport.height}`;

  test.describe(size, () => {
    test.use({ viewport });

    test(`the visible machine stays below the text in every page (${size})`, async ({ page }) => {
      // Measured since the hole (re-skin Task 5): 2.8-3.1 min on CI beside a shard's other tests (run
      // 38166992199; 2.2-2.5 min on 1 shard before it, run 38158922552), and 10.8 min locally at 390x844 at
      // load 10.5-14, run to completion beside two full unit suites (5.8 min at load about 19 before it). 33
      // min is over 3 times the loaded time and 10 times CI's (15 min before).
      test.setTimeout(1_980_000);
      const errors = await open(page);
      const story = await sections(page);
      const spans = await readSpans(page);
      const sampler = new KeyframeSampler(keyframes, spans);
      const lengths = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('section[data-section]')].map((s) => Number(s.style.getPropertyValue('--length'))),
      );
      let checked = 0;
      let galaxyChecked = 0;
      for (const [si, s] of story.entries()) {
        const text = await panelText(page, s);
        expect(text.bottom / viewport.height, `${s.id}: the panel inside the text band`).toBeLessThanOrEqual(0.42);
        for (const [pi, pg] of s.pages.entries()) {
          const [from, to] = fullInk(story, lengths, si, pi);
          const n = Math.max(2, Math.ceil((to - from) / STEP));
          for (let i = 0; i <= n; i++) {
            const local = from + ((to - from) * i) / n;
            const state = sampler.sample(s.start + local * (s.end - s.start));
            for (const ambient of ambientsOf(s.id)) {
              const m = machineOnScreen(mechanisms.bike, state, viewport.width, viewport.height, ambient);
              if (m.count === 0) continue; // the loose cloud only: no machine yet
              checked++;
              if (state.net.show > 0) galaxyChecked++;
              // The brief's lines are on one page; on every other page the panel's full height
              // counts, as it always has.
              const first = Math.min(...text.lines.map((l) => l.at), Infinity);
              const onBrief = pg.in <= first && first < pg.out;
              const bottom = onBrief ? textBottom(text, local) : text.bottom;
              expect(
                m.top,
                `${s.id} page ${pi + 1} at local ${local.toFixed(3)}, ambient ${ambient}: machine top vs text bottom ${bottom}`,
              ).toBeGreaterThanOrEqual(bottom + MARGIN);
            }
          }
        }
      }
      expect(checked, 'not vacuous').toBeGreaterThan(100);
      expect(galaxyChecked, 'the galaxy checked').toBeGreaterThan(100);
      expect(errors).toEqual([]);
    });

    test(`the freeze frame's dressed frames clear the text, its bursts counted (${size})`, async ({ page }) => {
      // freeze-frame §4: at defect 0.33 (held, dressed, rolled) and 0.395 (the fix landing on it), at
      // every AMBIENT_GRID pose (the hold shows the pin at each), the topmost lit thing (the planet's
      // burst's top dash, rolled) is MARGIN under the panel. machineOnScreen counts the bursts' motes.
      const errors = await open(page);
      const story = await sections(page);
      const spans = await readSpans(page);
      const sampler = new KeyframeSampler(keyframes, spans);
      const defect = story.find((s) => s.id === 'defect')!;
      const bottom = await panelBottom(page, defect);
      const tops: number[] = [];
      for (const local of [0.33, 0.395]) {
        const state = sampler.sample(defect.start + local * (defect.end - defect.start));
        expect(state.freeze.hold, `held at ${local}`).toBe(1);
        for (const ambient of AMBIENT_GRID) {
          const m = machineOnScreen(mechanisms.bike, state, viewport.width, viewport.height, ambient);
          tops.push(m.top);
          expect(m.top, `defect ${local}, ambient ${ambient}: top vs text bottom ${bottom}`).toBeGreaterThanOrEqual(bottom + MARGIN);
        }
      }
      // The hold makes every pose the same frame; and the bursts are what stands highest at 0.33.
      expect(new Set(tops.slice(0, AMBIENT_GRID.length)).size).toBe(1);
      const held = sampler.sample(defect.start + 0.33 * (defect.end - defect.start));
      const bare = machineOnScreen(mechanisms.bike, { ...held, freeze: { ...held.freeze, dress: 0 } }, viewport.width, viewport.height);
      expect(tops[0], 'the bursts reach above the bodies').toBeLessThan(bare.top);
      expect(errors).toEqual([]);
    });

    test(`every fix's warm motes land clear of the text (${size})`, async ({ page }) => {
      // Measured: 45-50 s on CI beside a shard's other tests (run 38166992199); at 390x844, run to
      // completion at load 9-15.7 beside a full unit suite, 2.3 min. 8 min is over 3 times the loaded time
      // and 9 times CI's (the file's 4 min before: under 5 times CI's).
      test.setTimeout(480_000);
      // A fix's warm motes fall onto its piece from above and all count as landed at the same
      // instant, half way through their window (net.fix = fixAt - NODE_FIX_WINDOW / 2), when they
      // still stand above it: the highest they are counted. The page grid steps over it.
      const errors = await open(page);
      const story = await sections(page);
      const spans = await readSpans(page);
      const sampler = new KeyframeSampler(keyframes, spans);
      const lengths = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('section[data-section]')].map((s) => Number(s.style.getPropertyValue('--length'))),
      );
      const fixes = galaxyOf()
        .g.bodies.filter((b) => b.kind !== 'moon')
        .flatMap((n) => (n.fixAt === null ? [] : [{ id: n.id, onset: n.fixAt - NODE_FIX_WINDOW / 2 }]));
      let checked = 0;
      const ids = new Set<string>();
      for (const [si, s] of story.entries()) {
        const bottom = (await panelText(page, s)).bottom;
        const fixAt = (local: number) => sampler.sample(s.start + local * (s.end - s.start)).net.fix;
        for (const pi of s.pages.keys()) {
          const [from, to] = fullInk(story, lengths, si, pi);
          for (const f of fixes) {
            if (!(fixAt(from) < f.onset && fixAt(to) >= f.onset)) continue;
            // The first local at which the fix clock reaches the onset (it never decreases), to 1e-7.
            let [lo, hi] = [from, to];
            while (hi - lo > 1e-7) {
              const mid = (lo + hi) / 2;
              if (fixAt(mid) >= f.onset) hi = mid;
              else lo = mid;
            }
            // Re-pinned to the moving hosts (Task 11): R0 and R1 are fixed close, riding the galaxy's turn,
            // so their warm motes are held at every AMBIENT_GRID pose, as every Act II frame is.
            for (const local of [hi, hi + 0.001]) {
              const state = sampler.sample(s.start + local * (s.end - s.start));
              for (const ambient of ambientsOf(s.id)) {
                const m = machineOnScreen(mechanisms.bike, state, viewport.width, viewport.height, ambient);
                checked++;
                ids.add(f.id);
                expect(m.top, `${f.id}: its fix in ${s.id} page ${pi + 1} at local ${local.toFixed(5)}, ambient ${ambient}`).toBeGreaterThanOrEqual(bottom + MARGIN);
              }
            }
          }
        }
      }
      // C1, R0, R1 and the sweep: every fix that lands under a line (C5's is wordless). R0's and R1's
      // rows draw nothing since the re-skin's Task 5 (no warm motes): their frames, the hole's, are held all the same.
      expect(checked, 'not vacuous').toBeGreaterThan(40);
      for (const id of ['C1', 'R0', 'R1']) expect(ids.has(id), `${id}'s fix checked`).toBe(true);
      expect(errors).toEqual([]);
    });

    test(`Act I ends on the finished bike, whole and under the text (${size})`, async ({ page }) => {
      // Act II then reflows it into its planet and moons (zoom-out); its own frames are the galaxy's.
      const errors = await open(page);
      const spans = await readSpans(page);
      const sampler = new KeyframeSampler(keyframes, spans);
      const spec = spans.find((s) => s.id === 'spec');
      if (!spec) throw new Error('no spec section');
      const end = sampler.sample(spec.end);
      expect([end.mech.assembly, end.mech.variant, end.provenance.vibed, end.mech.reflow]).toEqual([1, 0, 0, 0]);
      expect(end.mech.drive, 'riding').toBeGreaterThan(0);
      const m = machineOnScreen(mechanisms.bike, end, viewport.width, viewport.height);
      expect(m.count, 'every visible mote is settled and on screen').toBe(m.total);
      const bottom = await panelBottom(page, { ...spec, pages: [] });
      expect(m.top).toBeGreaterThanOrEqual(bottom + MARGIN);
      expect(m.bottom).toBeLessThanOrEqual(viewport.height);
      expect(m.left).toBeGreaterThanOrEqual(0);
      expect(m.right).toBeLessThanOrEqual(viewport.width);

      // And the rendered frame agrees: the bike is drawn under the panel, and above it the canvas
      // is all but empty.
      await openStage(page, `&mech=bike&n=3000&p=${spec.end}`);
      const { width, height, data } = PNG.sync.read(await canvasShot(page));
      const split = Math.round((bottom / viewport.height) * height);
      let above = 0;
      let below = 0;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          const lit = Math.abs(data[i] - 0x0b) > 24 || Math.abs(data[i + 1] - 0x0d) > 24 || Math.abs(data[i + 2] - 0x12) > 24;
          if (lit && y < split) above++;
          else if (lit) below++;
        }
      }
      expect(below, 'the bike is drawn').toBeGreaterThan(1000);
      expect(above, 'nothing drawn behind the text').toBeLessThan(below * 0.01);
      expect(errors).toEqual([]);
    });
  });
}
