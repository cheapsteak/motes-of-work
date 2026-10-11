import { mkdirSync, writeFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { PNG } from 'pngjs';
import { MOTE_BUDGET_DESKTOP, MOTE_SEED } from '../src/config';
import { galaxyTier } from '../src/galaxy/background';
import { galaxyBudget, generateGalaxy } from '../src/galaxy/generate';
import { HOLE_DISK, HOLE_LENS, HOLE_VIEW } from '../src/scene/hole/holeLook';
import { beatMiddles, canvasShot, countNonBackground, openStage, readSpans, settle, targetScrollY } from './helpers';
import { isHoleEmber, rgChroma } from './pixels';

// The black hole drawn at the centre (re-skin §4.2, §8; the plan's Task 5), phone first: at the middle
// of each of its beats' holds (ly-2, up-1, tr-2, fx-1 and fx-2, all HOLE_CLOSE), its shadow black at
// both sizes and at a pixel ratio of 2, its disk lopsided, its arch over the shadow, its jets rising,
// R0's strand in the disk and clean, no core body drawn; and at the galaxy wide (fr-1), not a white blot.
// And the story on it (re-skin §2.1, §9; the plan's Task 6): no ember at ly-2; the in-fall and R1's strand
// at up-1; the ember knots from up-1 on; R0's strand heated and singled out at tr-2; the ember reading
// against the disk's warm side on a phone; fx-1, fx-2 and fx-3 cooling the strands and stopping the knots;
// and a deep link into R1's strand forming, the scrolled frame.

// Measured: the slowest, the shadow at DPR 2, 37-38 s on CI beside a shard's other tests (runs 38166992199
// and 38180292823; the story's tests 11-33 s); locally, run to completion at load 10.5-14 beside full unit
// suites, the shadow at 1440x900 60 s and the rest 11-54 s (the story's, re-skin Task 6, 15-52 s at load
// 12-15). 5 min is 5 times that loaded time and 7.8 times the CI one.
test.setTimeout(300_000);

const BG = [0x0b, 0x0d, 0x12];
/** A pixel lit: some channel more than 24 off the stage background (helpers.ts countNonBackground's rule). */
const lit = (d: Uint8Array | Buffer, i: number) => Math.abs(d[i] - BG[0]) > 24 || Math.abs(d[i + 1] - BG[1]) > 24 || Math.abs(d[i + 2] - BG[2]) > 24;
/** Ember-dominant (pixels.ts emberComponents' rule). */
const ember = (d: Uint8Array | Buffer, i: number) => d[i] > 200 && d[i] > d[i + 2] + 90 && d[i] > d[i + 1] + 70;

/**
 * Measured floors (the plan's "A measured floor": 0.6 × this task's own render at ly-2, by screen): the
 * arch's lit px between r and 2.4 r above the shadow's centre (measured 506 on the phone, 181 on the
 * desktop), the jets' over the arch in a 12 px column (243, 75), R0's strand's lit px (1,307, 563). The
 * desktop's are smaller: it stands further off (105 against 75), so its dots are 75 / 105 of their size.
 */
const FLOORS: Record<number, { arch: number; jets: number; strand: number }> = {
  390: { arch: 303, jets: 145, strand: 784 },
  1440: { arch: 108, jets: 45, strand: 337 },
};

const HOLE_BEATS = ['ly-2', 'up-1', 'tr-2', 'fx-1', 'fx-2'] as const;
/** The middle of tr-2's hold on the hole, trace-local. */
const TR2_CLOSE = 0.53;

interface Hole {
  x: number;
  y: number;
  r: number;
  approach: -1 | 1;
}

/**
 * Every beat's id at the middle of its hold, as global progress; tr-2 at the middle of its hold on the
 * hole (trace 0.48 to 0.58, the stills' tr-2-close: its line runs on through the pull-back to the surge).
 */
async function beatPlaces(page: Page): Promise<Map<string, number>> {
  await openStage(page, '&mech=bike&n=500');
  const spans = await readSpans(page);
  const out = new Map<string, number>();
  (await beatMiddles(page)).forEach((section, i) => {
    for (const b of section) out.set(b.id, spans[i].start + b.local * (spans[i].end - spans[i].start));
  });
  const trace = spans.find((x) => x.id === 'trace')!;
  out.set('tr-2', trace.start + TR2_CLOSE * (trace.end - trace.start));
  return out;
}

async function openAt(page: Page, p: number, errors: string[]): Promise<Hole> {
  await openStage(page, `&mech=bike&n=500&p=${p}`);
  const hole = await page.evaluate(() => (window as unknown as { __motes: { hole(): Hole | null } }).__motes.hole());
  expect(hole, 'the hole has a shadow').not.toBeNull();
  expect(errors).toEqual([]);
  return hole!;
}

async function isolate(page: Page, names: string[] | null): Promise<void> {
  await page.evaluate((n) => (window as unknown as { __motes: { isolate(n: string[] | null): void } }).__motes.isolate(n), names);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

/** The canvas as a PNG, and its pixels per CSS px. */
async function shot(page: Page): Promise<{ png: PNG; k: number }> {
  const png = PNG.sync.read(await canvasShot(page));
  return { png, k: png.width / page.viewportSize()!.width };
}

/** Pixels within the shadow's disc less one CSS px that differ from the background by more than 2 on a channel. */
function inShadow(png: PNG, k: number, h: Hole): { n: number; checked: number; worst: number } {
  const [cx, cy, r] = [h.x * k, h.y * k, (h.r - 1) * k];
  let n = 0;
  let checked = 0;
  let worst = 0;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      if (x < 0 || y < 0 || x >= png.width || y >= png.height || Math.hypot(x + 0.5 - cx, y + 0.5 - cy) >= r) continue;
      const i = (y * png.width + x) * 4;
      const off = Math.max(...[0, 1, 2].map((c) => Math.abs(png.data[i + c] - BG[c])));
      checked++;
      worst = Math.max(worst, off);
      if (off > 2) n++;
    }
  return { n, checked, worst };
}

/** Lit pixels in a box (CSS px, clipped to the canvas). */
function litIn(png: PNG, k: number, x0: number, x1: number, y0: number, y1: number, test = lit): number {
  let n = 0;
  for (let y = Math.max(0, Math.floor(y0 * k)); y < Math.min(png.height, Math.ceil(y1 * k)); y++)
    for (let x = Math.max(0, Math.floor(x0 * k)); x < Math.min(png.width, Math.ceil(x1 * k)); x++) if (test(png.data, (y * png.width + x) * 4)) n++;
  return n;
}

/** The disk's light (the summed channels over the background) on each side of the shadow's centre, out to the disk's edge. */
function sides(png: PNG, k: number, h: Hole): { left: number; right: number } {
  const out = { left: 0, right: 0 };
  const reach = (h.r * HOLE_DISK.fade[1]) / HOLE_LENS.bCrit;
  for (let y = Math.max(0, Math.floor((h.y - reach) * k)); y < Math.min(png.height, (h.y + reach) * k); y++)
    for (let x = Math.max(0, Math.floor((h.x - reach) * k)); x < Math.min(png.width, (h.x + reach) * k); x++) {
      const i = (y * png.width + x) * 4;
      const light = [0, 1, 2].reduce((s, c) => s + Math.max(0, png.data[i + c] - BG[c]), 0);
      if (x / k < h.x) out.left += light;
      else out.right += light;
    }
  return out;
}

// ---- The story on the hole (re-skin §2.1, §4.2, §9; the plan's Task 6) ----

/**
 * The story's places, section-local: up-1 under the in-fall (0.45 screens into spread) and at its stop;
 * tr-2 as the camera lands on the hole (before the single dims the knots with everything but R0's strand)
 * and at the end of its hold on it (heated and singled out: its auto-advance stop is after the surge,
 * trace 0.972); fx-1, fx-2 and fx-3 (fix 0.13, 0.31, 0.47); and a deep link into R1's strand forming.
 */
const STORY = {
  inFall: ['spread', 0.45 / 2.808],
  up1Stop: ['spread', 0.4779],
  tr2Lands: ['trace', 0.49],
  tr2Stop: ['trace', 0.57],
  fx1: ['fix', 0.13],
  fx2: ['fix', 0.31],
  fx3: ['fix', 0.47],
  deep: ['spread', 0.5 / 2.808],
} as const satisfies Record<string, readonly [string, number]>;

/** Global progress of a section-local place, from the page's own spans. */
async function storyPlace(page: Page, [section, local]: readonly [string, number]): Promise<number> {
  await openStage(page, '&mech=bike&n=500');
  const span = (await readSpans(page)).find((s) => s.id === section)!;
  return span.start + local * (span.end - span.start);
}

/** Every named mesh the frame draws but `names`: isolate(allBut(...)) hides just those. */
async function allBut(page: Page, names: readonly string[]): Promise<string[]> {
  await isolate(page, null);
  const { visible } = await page.evaluate(() => (window as unknown as { __motes: { drawStats(): { visible: string[] } } }).__motes.drawStats());
  return visible.filter((n) => !names.includes(n));
}

/** Pixels of the whole canvas passing `test`, and their summed light over the background. */
function count(png: PNG, test: (d: Uint8Array | Buffer, i: number) => boolean, where: (x: number, y: number) => boolean = () => true): { n: number; light: number } {
  let n = 0;
  let light = 0;
  for (let y = 0; y < png.height; y++)
    for (let x = 0; x < png.width; x++) {
      const i = (y * png.width + x) * 4;
      if (!where(x, y) || !test(png.data, i)) continue;
      n++;
      light += [0, 1, 2].reduce((s, c) => s + Math.max(0, png.data[i + c] - BG[c]), 0);
    }
  return { n, light };
}

const holeEmber = (d: Uint8Array | Buffer, i: number) => isHoleEmber(d, i);
/** The disk's reach on screen about the hole's centre (CSS px): its fade's end at the shadow's scale. */
const diskReach = (h: Hole) => (h.r * HOLE_DISK.fade[1]) / HOLE_LENS.bCrit;
/** The disk's elliptical radius about the hole's centre (CSS px across it): the disk seen from HOLE_VIEW.elevation. */
const diskRho = (h: Hole, k: number, x: number, y: number) => Math.hypot(x + 0.5 - h.x * k, (y + 0.5 - h.y * k) / Math.sin((HOLE_VIEW.elevation * Math.PI) / 180)) / k;
/** Outside the disk's ellipse, its reach across and its reach × sin(elevation) up and down (device px of a canvas at `k` per CSS px). */
const offDisk = (h: Hole, k: number) => (x: number, y: number) => diskRho(h, k, x, y) > diskReach(h);
/** The jets' columns off the disk: within 8 CSS px of the hole's axis, outside the disk's ellipse (offDisk). */
const inJets = (h: Hole, k: number) => (x: number, y: number) => Math.abs(x + 0.5 - h.x * k) <= 8 * k && offDisk(h, k)(x, y);
/** The disk's annulus, from the shadow's edge to its reach. */
const inAnnulus = (h: Hole, k: number) => (x: number, y: number) => {
  const d = Math.hypot(x + 0.5 - h.x * k, y + 0.5 - h.y * k);
  return d >= h.r * k && d <= diskReach(h) * k;
};

/**
 * The story tests' floors (the plan's "A measured floor": 0.6 × this task's own render, by screen; the
 * least where two places are held to one): the in-fall's hole-ember px off the disk at up-1 (measured 5
 * on the phone, 33 on the desktop: 1 CSS px stream dots, most of its chord off the frame on a phone);
 * R1's strand's at up-1's stop and fx-1 (697 and 692; 259 and 259); R0's at tr-2's stop (1,333; 544);
 * the knots' ember in the jets' columns as tr-2 lands and at fx-2 (36 and 35; 24 and 24).
 */
const STORY_FLOORS: Record<number, { inFall: number; r1: number; r0: number; knots: number }> = {
  390: { inFall: 3, r1: 415, r0: 799, knots: 21 },
  1440: { inFall: 19, r1: 155, r0: 326, knots: 14 },
};

for (const size of [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
]) {
  test.describe(`${size.width}x${size.height}`, () => {
    test.use({ viewport: size });

    test('the shadow stays black', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const places = await beatPlaces(page);
      for (const beat of HOLE_BEATS) {
        const h = await openAt(page, places.get(beat)!, errors);
        const { png, k } = await shot(page);
        const s = inShadow(png, k, h);
        console.info(`hole ${size.width}: ${beat} shadow r ${h.r.toFixed(1)} px, ${s.checked} px checked, worst ${s.worst}`);
        expect(s.checked, beat).toBeGreaterThan(1000);
        expect(s.n, `${beat}: px lit in the shadow (worst ${s.worst})`).toBe(0);
      }
    });

    test('the disk is lopsided', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const h = await openAt(page, (await beatPlaces(page)).get('ly-2')!, errors);
      await isolate(page, ['hole-disk']);
      const { png, k } = await shot(page);
      const { left, right } = sides(png, k, h);
      const [near, far] = h.approach < 0 ? [left, right] : [right, left];
      console.info(`hole ${size.width}: lopsided, approaching ${near.toFixed(0)}, receding ${far.toFixed(0)}, ratio ${(near / far).toFixed(2)}`);
      expect(near).toBeGreaterThanOrEqual(1.5 * far);
    });

    test('the arch rises over the shadow', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const h = await openAt(page, (await beatPlaces(page)).get('ly-2')!, errors);
      await isolate(page, ['hole-disk', 'hole-arch']);
      const { png, k } = await shot(page);
      const n = litIn(png, k, h.x - h.r, h.x + h.r, h.y - 2.4 * h.r, h.y - h.r);
      console.info(`hole ${size.width}: arch lit px ${n}`);
      expect(n).toBeGreaterThanOrEqual(FLOORS[size.width].arch);
      expect(n).toBeGreaterThan(0);
    });

    test('the jets rise', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const h = await openAt(page, (await beatPlaces(page)).get('ly-2')!, errors);
      await isolate(page, ['hole-jets', 'hole-knots']);
      const { png, k } = await shot(page);
      const n = litIn(png, k, h.x - 6, h.x + 6, 0, h.y - 2.4 * h.r);
      console.info(`hole ${size.width}: jets lit px ${n}`);
      expect(n).toBeGreaterThanOrEqual(FLOORS[size.width].jets);
      expect(n).toBeGreaterThan(0);
    });

    test('no core body is drawn', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await openAt(page, (await beatPlaces(page)).get('ly-2')!, errors);
      // The counts: every net-* set is its generator's count, which holds no core row's instance.
      const g = generateGalaxy(MOTE_SEED, galaxyTier(size.width, size.height), galaxyBudget(MOTE_BUDGET_DESKTOP));
      for (const b of g.bodies.filter((x) => x.kind === 'core')) expect([b.motes, b.personMotes, b.lattice], b.id).toEqual([0, 0, null]);
      const stats = await page.evaluate(() =>
        (window as unknown as { __motes: { drawStats(): { instances: Record<string, number> } } }).__motes.drawStats(),
      );
      expect(stats.instances['net-glow']).toBe(g.instances.glow);
      expect(stats.instances['net-bodies']).toBe(g.instances.bodies);
      // At ly-2 the core lamp lights the core alone: the body set draws nothing at all, the hole everything.
      const names = Object.keys(stats.instances).filter((n) => n.startsWith('net-'));
      await isolate(page, names);
      const { png } = await shot(page);
      let n = 0;
      for (let i = 0; i < png.width * png.height; i++) if (lit(png.data, i * 4)) n++;
      expect(n, 'px lit by the body set under the core lamp').toBe(0);
      await isolate(page, null);
      const all = await shot(page);
      let m = 0;
      for (let i = 0; i < all.png.width * all.png.height; i++) if (lit(all.png.data, i * 4)) m++;
      expect(m, 'the hole is drawn').toBeGreaterThan(1000);
    });

    test('no ember in the hole at ly-2', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const h = await openAt(page, (await beatPlaces(page)).get('ly-2')!, errors);
      const all = await shot(page);
      const annulus = count(all.png, holeEmber, inAnnulus(h, all.k)).n;
      await isolate(page, ['hole-strand-r0']);
      const { png, k } = await shot(page);
      const n = litIn(png, k, 0, size.width, 0, size.height);
      const hot = count(png, holeEmber).n;
      console.info(`hole ${size.width}: ly-2 hole-ember px in the disk's annulus ${annulus}; R0's strand lit px ${n}, hole-ember ${hot}`);
      expect(annulus).toBeLessThanOrEqual(5);
      expect(n).toBeGreaterThanOrEqual(FLOORS[size.width].strand);
      expect(n).toBeGreaterThan(0);
      expect(hot).toBeLessThanOrEqual(5);
    });

    test("R1's strand forms under up-1", async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      // Under up-1's line, with net.inEmber 1 and the streams up: the in-fall's ember outside the disk.
      let h = await openAt(page, await storyPlace(page, STORY.inFall), errors);
      await isolate(page, ['net-streams']);
      const s = await shot(page);
      const inFall = count(s.png, holeEmber, offDisk(h, s.k)).n;
      // At up-1's stop: R1's strand whole and ember, R0's still clean.
      h = await openAt(page, await storyPlace(page, STORY.up1Stop), errors);
      await isolate(page, ['hole-strand-r1']);
      const r1 = count((await shot(page)).png, holeEmber).n;
      await isolate(page, ['hole-strand-r0']);
      const r0 = count((await shot(page)).png, holeEmber).n;
      console.info(`hole ${size.width}: up-1 the in-fall's hole-ember px off the disk ${inFall}; at its stop R1's strand ${r1}, R0's ${r0}`);
      expect(h.r).toBeGreaterThan(0);
      expect(inFall).toBeGreaterThanOrEqual(STORY_FLOORS[size.width].inFall);
      expect(inFall).toBeGreaterThan(0);
      expect(r1).toBeGreaterThanOrEqual(STORY_FLOORS[size.width].r1);
      expect(r1).toBeGreaterThan(0);
      expect(r0).toBeLessThanOrEqual(5);
    });

    test('ember knots rise from up-1 on', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      // The knots alone (inside the jets' blue sheath an ember knot's pixel is no longer ember-dominant), in
      // the jets' columns, off the disk, by the network's ember rule (the knots' ember is not the hole's).
      let h = await openAt(page, await storyPlace(page, STORY.tr2Lands), errors);
      await isolate(page, ['hole-knots']);
      let s = await shot(page);
      const tr2 = count(s.png, ember, inJets(h, s.k)).n;
      h = await openAt(page, (await beatPlaces(page)).get('ly-2')!, errors);
      await isolate(page, ['hole-knots']);
      s = await shot(page);
      const ly2 = count(s.png, ember, inJets(h, s.k)).n;
      console.info(`hole ${size.width}: ember px in the jets' columns at tr-2 ${tr2}, at ly-2 ${ly2}`);
      expect(tr2).toBeGreaterThanOrEqual(STORY_FLOORS[size.width].knots);
      expect(tr2).toBeGreaterThan(0);
      expect(ly2).toBe(0);
    });

    test("the trace heats R0's strand and singles it out", async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const blue = (png: PNG) => {
        let sum = 0;
        for (let i = 0; i < png.width * png.height; i++) if (lit(png.data, 4 * i)) sum += Math.max(0, png.data[4 * i + 2] - BG[2]);
        return sum;
      };
      // up-1's stop: R1's strand, ember, at full light.
      await openAt(page, await storyPlace(page, STORY.up1Stop), errors);
      await isolate(page, ['hole-strand-r1']);
      const up1 = (await shot(page)).png;
      const [r1Ember, r1Light] = [count(up1, holeEmber), count(up1, lit)];
      // ly-2: the disk's blue light under the hole's lamp.
      await openAt(page, (await beatPlaces(page)).get('ly-2')!, errors);
      await isolate(page, ['hole-disk']);
      const diskLy2 = blue((await shot(page)).png);
      // tr-2's stop: R0's strand ember and brighter, everything else in the hole at 0.28.
      await openAt(page, await storyPlace(page, STORY.tr2Stop), errors);
      await isolate(page, ['hole-strand-r0']);
      const r0 = count((await shot(page)).png, holeEmber);
      await isolate(page, ['hole-disk']);
      const diskTr2 = blue((await shot(page)).png);
      await isolate(page, ['hole-strand-r1']);
      const r1Tr2 = count((await shot(page)).png, lit).light;
      console.info(
        `hole ${size.width}: tr-2 R0's strand hole-ember px ${r0.n}, light ${r0.light} (R1's at up-1 ${r1Ember.light}); ` +
          `the disk's blue ${diskTr2} against ly-2's ${diskLy2} (${(diskTr2 / diskLy2).toFixed(3)}); R1's strand ${r1Tr2} against up-1's ${r1Light.light} (${(r1Tr2 / r1Light.light).toFixed(3)})`,
      );
      expect(r0.n).toBeGreaterThanOrEqual(STORY_FLOORS[size.width].r0);
      expect(r0.n).toBeGreaterThan(0);
      expect(r0.light).toBeGreaterThanOrEqual(r1Ember.light);
      expect(diskTr2).toBeLessThanOrEqual(0.4 * diskLy2);
      expect(r1Tr2).toBeLessThanOrEqual(0.4 * r1Light.light);
    });

    test('fx-1 cools R0, fx-2 cools R1, fx-3 stops the knots', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const strands = async () => {
        await isolate(page, ['hole-strand-r0']);
        const r0 = count((await shot(page)).png, holeEmber).n;
        await isolate(page, ['hole-strand-r1']);
        const r1 = count((await shot(page)).png, holeEmber).n;
        await isolate(page, null);
        return { r0, r1 };
      };
      await openAt(page, await storyPlace(page, STORY.fx1), errors);
      const fx1 = await strands();
      let h = await openAt(page, await storyPlace(page, STORY.fx2), errors);
      const fx2 = await strands();
      await isolate(page, ['hole-knots']);
      let s = await shot(page);
      const knots2 = count(s.png, ember, inJets(h, s.k)).n;
      h = await openAt(page, await storyPlace(page, STORY.fx3), errors);
      await isolate(page, ['hole-knots']);
      s = await shot(page);
      const knots3 = count(s.png, ember, inJets(h, s.k)).n;
      console.info(`hole ${size.width}: fix 0.13 R0's ${fx1.r0}, R1's ${fx1.r1}; fix 0.31 R0's ${fx2.r0}, R1's ${fx2.r1}, the jets' ${knots2}; fix 0.47 the jets' ${knots3}`);
      expect(fx1.r0).toBeLessThanOrEqual(5);
      expect(fx1.r1).toBeGreaterThanOrEqual(STORY_FLOORS[size.width].r1);
      expect(fx2.r0).toBeLessThanOrEqual(5);
      expect(fx2.r1).toBeLessThanOrEqual(5);
      expect(knots2).toBeGreaterThanOrEqual(STORY_FLOORS[size.width].knots);
      expect(knots3).toBeLessThanOrEqual(5);
    });

    test('a deep link into the strand renders the scrolled frame', async ({ page }) => {
      const p = await storyPlace(page, STORY.deep);
      await openStage(page, `&mech=bike&p=${p}`);
      const jumped = await canvasShot(page);
      await openStage(page, '&mech=bike');
      await page.evaluate((to) => window.scrollTo(0, to), await targetScrollY(page, p));
      await settle(page);
      expect(countNonBackground(jumped)).toBeGreaterThan(2000);
      expect((await canvasShot(page)).equals(jumped)).toBe(true);
    });

    test('the hole does not saturate at the galaxy wide', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const h = await openAt(page, (await beatPlaces(page)).get('fr-1')!, errors);
      const { png, k } = await shot(page);
      const reach = ((h.r * HOLE_DISK.fade[1]) / HOLE_LENS.bCrit) * k;
      let inDisc = 0;
      let white = 0;
      for (let y = Math.floor(h.y * k - reach); y <= h.y * k + reach; y++)
        for (let x = Math.floor(h.x * k - reach); x <= h.x * k + reach; x++) {
          if (Math.hypot(x + 0.5 - h.x * k, y + 0.5 - h.y * k) > reach) continue;
          const i = (y * png.width + x) * 4;
          inDisc++;
          if (png.data[i] >= 250 && png.data[i + 1] >= 250 && png.data[i + 2] >= 250) white++;
        }
      console.info(`hole ${size.width}: fr-1 disc ${inDisc} px, white ${white}`);
      expect(inDisc).toBeGreaterThan(4);
      expect(white / inDisc).toBeLessThan(0.3);
    });
  });
}

test.describe('390x844: the ember reads against the warm disk (re-skin §4.2, §9)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  /**
   * At `place`, with `strands` (the isolates that draw the ember: a strand, and the streams for the
   * in-fall): the mask is their lit px in an isolate render of the same frame; the warm side is the
   * receding half of the disk, in the mask's radial band (its elliptical radius about the hole's centre,
   * the disk seen from HOLE_VIEW.elevation), lit in the composite and off the mask. The distance between
   * the composite's mean rg-chromaticity over the mask and over the warm side, and the hole-ember px in a
   * crop of that receding band, with everything drawn and with both strands and the in-fall hidden.
   */
  async function emberAgainstWarm(page: Page, place: number, strands: string[], name: string) {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const h = await openAt(page, place, errors);
    const all = await shot(page);
    await isolate(page, strands);
    const iso = await shot(page);
    // Hidden: both strands and the in-fall (the streams), whichever is the subject.
    await isolate(page, await allBut(page, ['hole-strand-r0', 'hole-strand-r1', 'net-streams']));
    const hidden = await shot(page);
    const { png, k } = all;
    const [cx, cy] = [h.x * k, h.y * k];
    const q = Math.sin((HOLE_VIEW.elevation * Math.PI) / 180);
    const receding = -h.approach;
    const rho = (x: number, y: number) => Math.hypot(x + 0.5 - cx, (y + 0.5 - cy) / q);
    const onReceding = (x: number, y: number) => Math.sign(x + 0.5 - cx) === receding && Math.hypot(x + 0.5 - cx, y + 0.5 - cy) > h.r * k;
    // The mask: the isolates' lit px on the receding half, and their radial band (5th to 95th percentile).
    const mask = new Uint8Array(png.width * png.height);
    const rhos: number[] = [];
    for (let y = 0; y < png.height; y++)
      for (let x = 0; x < png.width; x++)
        if (onReceding(x, y) && lit(iso.png.data, (y * png.width + x) * 4)) {
          mask[y * png.width + x] = 1;
          rhos.push(rho(x, y));
        }
    rhos.sort((a, b) => a - b);
    const [lo, hi] = [rhos[Math.floor(0.05 * rhos.length)], rhos[Math.floor(0.95 * rhos.length)]];
    const nearMask = (x: number, y: number) => {
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (mask[(y + dy) * png.width + x + dx]) return true;
      return false;
    };
    const mean = (pxs: [number, number][]) => pxs.reduce((m, p) => [m[0] + p[0] / pxs.length, m[1] + p[1] / pxs.length], [0, 0]);
    const chroma = (i: number) => rgChroma(png.data[i], png.data[i + 1], png.data[i + 2]);
    const maskPx: [number, number][] = [];
    const warmPx: [number, number][] = [];
    let [x0, x1, y0, y1] = [Infinity, -Infinity, Infinity, -Infinity];
    for (let y = 1; y < png.height - 1; y++)
      for (let x = 1; x < png.width - 1; x++) {
        if (!onReceding(x, y)) continue;
        const i = (y * png.width + x) * 4;
        if (mask[y * png.width + x]) {
          if (rho(x, y) >= lo && rho(x, y) <= hi) maskPx.push(chroma(i));
          continue;
        }
        if (rho(x, y) < lo || rho(x, y) > hi) continue;
        [x0, x1, y0, y1] = [Math.min(x0, x), Math.max(x1, x), Math.min(y0, y), Math.max(y1, y)];
        if (!nearMask(x, y) && lit(png.data, i)) warmPx.push(chroma(i));
      }
    const [m, w] = [mean(maskPx), mean(warmPx)];
    const distance = Math.hypot(m[0] - w[0], m[1] - w[1]);
    // The crop: the receding band's box. Its hole-ember px drawn whole, and with the strands and the in-fall hidden.
    const inCrop = (x: number, y: number) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
    const shown = count(png, holeEmber, inCrop).n;
    const without = count(hidden.png, holeEmber, inCrop).n;
    console.info(
      `hole 390: ${name}: mask ${maskPx.length} px at chroma (${m[0].toFixed(3)}, ${m[1].toFixed(3)}), warm side ${warmPx.length} px at (${w[0].toFixed(3)}, ${w[1].toFixed(3)}), ` +
        `distance ${distance.toFixed(3)}; the crop ${x1 - x0 + 1}x${y1 - y0 + 1} px: hole-ember ${shown}, hidden ${without}, ratio ${(shown / Math.max(without, 1)).toFixed(1)}`,
    );
    if (process.env.SHOTS === '1') {
      // The crop the test measures, 3× nearest-neighbour, for the review (the plan's close-out).
      const [cw, ch] = [x1 - x0 + 1, y1 - y0 + 1];
      const out = new PNG({ width: 3 * cw, height: 3 * ch });
      for (let y = 0; y < 3 * ch; y++)
        for (let x = 0; x < 3 * cw; x++) {
          const [i, o] = [((y0 + Math.floor(y / 3)) * png.width + x0 + Math.floor(x / 3)) * 4, (y * 3 * cw + x) * 4];
          for (let c = 0; c < 4; c++) out.data[o + c] = png.data[i + c];
        }
      mkdirSync('shots/galaxy', { recursive: true });
      writeFileSync(`shots/galaxy/R6-${name}-crop-390x844.png`, PNG.sync.write(out));
    }
    expect(errors).toEqual([]);
    expect(maskPx.length, `${name}: the ember's px`).toBeGreaterThan(20);
    expect(warmPx.length, `${name}: the warm side's px`).toBeGreaterThan(100);
    return { distance, shown, without };
  }

  test("up-1's stop: R1's strand and the in-fall read against the warm side", async ({ page }) => {
    const r = await emberAgainstWarm(page, await storyPlace(page, STORY.up1Stop), ['hole-strand-r1', 'net-streams'], 'up-1-stop');
    expect(r.distance).toBeGreaterThanOrEqual(0.15);
    expect(r.without).toBeLessThanOrEqual(5);
    expect(r.shown).toBeGreaterThanOrEqual(4 * r.without);
    expect(r.shown).toBeGreaterThan(0);
  });

  test("tr-2's stop: R0's strand reads against the warm side", async ({ page }) => {
    const r = await emberAgainstWarm(page, await storyPlace(page, STORY.tr2Stop), ['hole-strand-r0'], 'tr-2-stop');
    expect(r.distance).toBeGreaterThanOrEqual(0.15);
    expect(r.without).toBeLessThanOrEqual(5);
    expect(r.shown).toBeGreaterThanOrEqual(4 * r.without);
    expect(r.shown).toBeGreaterThan(0);
  });
});

test.describe('390x844 at a pixel ratio of 2 (Review Focus 2)', () => {
  test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });

  test('the shadow stays black at DPR 2', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const places = await beatPlaces(page);
    for (const beat of HOLE_BEATS) {
      const h = await openAt(page, places.get(beat)!, errors);
      const { png, k } = await shot(page);
      expect(k).toBe(2);
      const s = inShadow(png, k, h);
      expect(s.checked, beat).toBeGreaterThan(4000);
      expect(s.n, `${beat}: px lit in the shadow (worst ${s.worst})`).toBe(0);
    }
  });
});
