import { expect, test, type Page } from '@playwright/test';
import { PNG } from 'pngjs';
import { MOTE_BUDGET_DESKTOP, MOTE_SEED } from '../src/config';
import { galaxyTier } from '../src/galaxy/background';
import { galaxyBudget, generateGalaxy } from '../src/galaxy/generate';
import { HOLE_DISK, HOLE_LENS } from '../src/scene/hole/holeLook';
import { beatMiddles, canvasShot, openStage, readSpans } from './helpers';

// The black hole drawn at the centre (re-skin §4.2, §8; the plan's Task 5), phone first: at the middle
// of each of its beats' holds (ly-2, up-1, tr-2, fx-1 and fx-2, all HOLE_CLOSE), its shadow black at
// both sizes and at a pixel ratio of 2, its disk lopsided, its arch over the shadow, its jets rising,
// R0's strand in the disk and clean, no core body drawn; and at the galaxy wide (fr-1), not a white blot.

// Measured: the slowest, the shadow at DPR 2, 38 s on CI beside a shard's other tests (run 38166992199);
// locally, run to completion at load 10.5-14 beside full unit suites, the shadow at 1440x900 60 s and the
// rest 11-54 s. 5 min is 5 times that loaded time and 7.8 times the CI one.
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

    test("R0's strand is there, and clean", async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await openAt(page, (await beatPlaces(page)).get('ly-2')!, errors);
      await isolate(page, ['hole-strand-r0']);
      const { png, k } = await shot(page);
      const n = litIn(png, k, 0, size.width, 0, size.height);
      const hot = litIn(png, k, 0, size.width, 0, size.height, ember);
      console.info(`hole ${size.width}: R0's strand lit px ${n}, ember-dominant ${hot}`);
      expect(n).toBeGreaterThanOrEqual(FLOORS[size.width].strand);
      expect(n).toBeGreaterThan(0);
      expect(hot).toBeLessThanOrEqual(5);
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
