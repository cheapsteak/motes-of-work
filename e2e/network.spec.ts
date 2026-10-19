import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { PNG } from 'pngjs';
import { Vector3 } from 'three';
import { MOTE_BUDGET_DESKTOP, MOTE_SEED } from '../src/config';
import { AMBIENT_POSE, FREEZE_PINS } from '../src/galaxy/ambient';
import { galaxyBudget, generateGalaxy } from '../src/galaxy/generate';
import { galaxyTier } from '../src/galaxy/background';
import type { SectionSpan } from '../src/scroll/progress';
import { FREEZE_SCATTER_FILL, FREEZE_TICK_MOON, FREEZE_TICK_PLANET, FREEZE_TICK_PX } from '../src/scene/node/birth';
import { bodyCentre, bodyDerp, bodyGhost, bodyLeak, focusScatterRow, type BodyClocks } from '../src/scene/node/bodyMote';
import { dropoutEvent } from '../src/scene/node/dropout';
import { leakOffset } from '../src/scene/node/leak';
import { llUnit } from '../src/scene/node/shell';
import { buildShellAttrs, packShellData } from '../src/scene/node/bodyAttrs';
import { bodyWorld } from '../src/scene/node/orbit';
import { KeyframeSampler, type KeyframeFile } from '../src/timeline/keyframeSampler';
import { mergeState, type SceneState } from '../src/timeline/sceneState';
import { canvasShot, countNonBackground, openStage, readSpans, settle, targetScrollY } from './helpers';
import { freezeTicks, galaxyOf, held as heldOf, visibleTracks, type TickSourceOnScreen } from '../src/scene/node/galaxyOnScreen';
import { essayCameraAt } from './machine';

// Act II's galaxy in the essay (docs/specs/2026-10-06-act-2-storyboard-and-network.md §6 test 16;
// galaxy-orbits §3.4), at the essay's full budget, at both test sizes, phone first: the galaxy keeps
// within galaxyBudget and the bike's motes are unchanged; and it is built lazily. (The stacks' crack
// near and far, test 11, and their brick-stack test went with the stacks; the twelve, test 12, is
// galaxy.spec.ts's probe until its section is keyed.)

test.setTimeout(300_000);

const SIZES = [
  { width: 390, height: 844, label: 'phone' },
  { width: 1440, height: 900, label: 'desktop' },
] as const;

const progressAt = (spans: SectionSpan[], section: string, local: number): number => {
  const span = spans.find((s) => s.id === section);
  if (!span) throw new Error(`no section ${section}`);
  return span.start + local * (span.end - span.start);
};

/** The galaxy's instanced meshes (bodySystem.ts), every set it draws, and the black hole's (holeSystem.ts, re-skin Task 5). */
const GALAXY_MESHES = [
  'net-shells',
  'net-persons',
  'net-bodies',
  'net-glow',
  'net-spikes',
  'net-tracks',
  'net-streams',
  'net-feed',
  'net-plan',
  'net-plan-screen',
  'hole-disk',
  'hole-arch',
  'hole-ring',
  'hole-jets',
  'hole-knots',
  'hole-infall',
  'hole-strand-r0',
  'hole-strand-r1',
];

for (const size of SIZES) {
  test.describe(`${size.width}x${size.height}`, () => {
    test.use({ viewport: { width: size.width, height: size.height } });

    test(`the galaxy keeps within its budget and the bike's motes are unchanged (test 16, ${size.label})`, async ({ page }) => {
      await openStage(page, '&mech=bike&n=500');
      const spans = await readSpans(page);
      // Everything built and shown: the lesson, with the streams and the feed forced up so every set draws.
      const state = encodeURIComponent(JSON.stringify({ net: { streams: 1, feed: 1, review: 1.2 } }));
      await openStage(page, `&mech=bike&p=${progressAt(spans, 'lesson', 0.9)}&state=${state}`);
      const stats = await page.evaluate(() => (window as unknown as { __motes: { drawStats(): { instances: Record<string, number> } } }).__motes.drawStats());
      for (const name of GALAXY_MESHES) expect(stats.instances[name], name).toBeGreaterThan(0);
      const drawn = GALAXY_MESHES.reduce((n, name) => n + stats.instances[name], 0);
      // Every set drawn, the hole's among them, is the galaxy's count.
      const g = generateGalaxy(MOTE_SEED, galaxyTier(size.width, size.height), galaxyBudget(MOTE_BUDGET_DESKTOP));
      expect(drawn).toBe(g.instances.total);
      expect(g.instances.total).toBeLessThanOrEqual(galaxyBudget(MOTE_BUDGET_DESKTOP));
      expect(stats.instances.motes).toBe(MOTE_BUDGET_DESKTOP);
    });
  });
}

// The galaxy is not built before the first frame: in Act I it is built after it (the browser's first
// idle), and a page opened in Act II has it built by its first frame, which draws it. The purity
// check's jumps and scrolls hold that the frames do not depend on which.
test.describe('the galaxy is built lazily', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  const builtAt = (page: Page) => page.evaluate(() => (window as unknown as { __motes: { networkBuiltAt(): number | null } }).__motes.networkBuiltAt());

  test('after the first frame in Act I, and by the first frame in Act II', async ({ page }) => {
    await openStage(page, '&mech=bike&n=500');
    await page.waitForFunction(() => (window as unknown as { __motes: { networkBuiltAt(): number | null } }).__motes.networkBuiltAt() !== null);
    expect(await builtAt(page)).toBeGreaterThanOrEqual(1);
    const spans = await readSpans(page);
    await openStage(page, `&mech=bike&n=500&p=${progressAt(spans, 'layers', 0.5)}`);
    expect(await builtAt(page)).toBe(0);
    const stats = await page.evaluate(() => (window as unknown as { __motes: { drawStats(): { visible: string[] } } }).__motes.drawStats());
    expect(stats.visible).toContain('net-shells');
  });
});

// ---- The freeze frame (docs/specs/2026-10-07-freeze-frame.md §1.2, §4), phone first ----

/** The canvas of the close probe (C1, the camera riding it) with `extra` over the grown galaxy, at ambient `ambient`. */
async function closeShot(page: Page, extra: Record<string, unknown>, ambient: number): Promise<Buffer> {
  const state = encodeURIComponent(JSON.stringify({ net: { show: 1, growth: 1 }, ...extra }));
  await openStage(page, `&mech=bike&shot=close&state=${state}&ambient=${ambient}`);
  return page.locator('#stage').screenshot();
}

test.describe('the freeze frame’s two clocks, 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the hold shows the pin whatever the clock: the bodies and the tracked camera alike', async ({ page }) => {
    const hold = { freeze: { hold: 1 } };
    const [a, b] = [await closeShot(page, hold, 0), await closeShot(page, hold, 311)];
    expect(countNonBackground(a), 'the frame draws').toBeGreaterThan(2000);
    expect(b.equals(a), 'two clocks under the hold render the same frame').toBe(true);
    // Not vacuous: without the hold the two clocks are two frames.
    const [c, d] = [await closeShot(page, {}, 0), await closeShot(page, {}, 311)];
    expect(d.equals(c)).toBe(false);
    // The hold is a step at 0.5: just under it, the clock is the frame's own.
    expect((await closeShot(page, { freeze: { hold: 0.49 } }, 0)).equals(c)).toBe(true);
  });
});

// ---- The freeze frame as keyed (freeze-frame §4; Task 12), phone first ----
// Every frame is the essay's own at a defect-local point (`?p=`, test mode: the ambient at the pose,
// the hold's pin past the cut), measured where the TS twins put the bodies and the bursts on screen
// (e2e/machine.ts freezeTicks, through the essay's camera, essayCameraAt). A test that counts one
// draw's pixels isolates its meshes (`__motes.isolate`): the bursts are net-ticks alone.

const keyframes = JSON.parse(readFileSync(new URL('../src/timeline/keyframes.json', import.meta.url), 'utf8')) as KeyframeFile;

interface Frame {
  png: PNG;
  state: SceneState;
  twin: ReturnType<typeof freezeTicks>;
}

/** The essay's frame at defect-local `local` on this page's screen, `extra` merged over its keyed state (`?state=`), its meshes `only` (all if absent). */
async function defectFrame(page: Page, local: number, opts: { extra?: Record<string, unknown>; only?: string[]; query?: string; ambient?: number } = {}): Promise<Frame> {
  const size = page.viewportSize()!;
  await openStage(page, '&mech=bike&n=500');
  const spans = await readSpans(page);
  const p = progressAt(spans, 'defect', local);
  const keyed = new KeyframeSampler(keyframes, spans).sample(p);
  const state = opts.extra ? mergeState(keyed, opts.extra) : keyed;
  const extra = opts.extra ? `&state=${encodeURIComponent(JSON.stringify(opts.extra))}` : '';
  const ambient = opts.ambient ?? AMBIENT_POSE;
  await openStage(page, `&mech=bike&p=${p}${extra}${opts.ambient === undefined ? '' : `&ambient=${ambient}`}${opts.query ?? ''}`);
  if (opts.only) {
    await page.evaluate((names) => (window as unknown as { __motes: { isolate(n: string[] | null): void } }).__motes.isolate(names), opts.only);
    await settle(page);
  }
  const png = PNG.sync.read(await canvasShot(page));
  const { camera, ambient: shownAt } = essayCameraAt(state, size.width, size.height, ambient);
  return { png, state, twin: freezeTicks(state, shownAt, camera, size.width, size.height) };
}

const BG = [0x0b, 0x0d, 0x12];
/** A measurement, kept on the test and printed (the thresholds below were set against these). */
function note(type: string, description: string): void {
  test.info().annotations.push({ type, description });
  console.log(`${test.info().title}: ${type}: ${description}`);
}
const litAt = (png: PNG, x: number, y: number) => {
  const i = (y * png.width + x) * 4;
  return [0, 1, 2].some((c) => Math.abs(png.data[i + c] - BG[c]) > 24);
};
/** Lit pixels (more than 24 off the ground on a channel) whose centres `keep` selects. */
function litWhere(png: PNG, keep: (x: number, y: number) => boolean): number {
  let n = 0;
  for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) if (keep(x + 0.5, y + 0.5) && litAt(png, x, y)) n++;
  return n;
}
/** Pixels of a colour class whose centres `keep` selects. */
function colourWhere(png: PNG, is: (r: number, g: number, b: number) => boolean, keep: (x: number, y: number) => boolean): number {
  let n = 0;
  for (let y = 0; y < png.height; y++)
    for (let x = 0; x < png.width; x++) {
      const i = (y * png.width + x) * 4;
      if (keep(x + 0.5, y + 0.5) && is(png.data[i], png.data[i + 1], png.data[i + 2])) n++;
    }
  return n;
}
const EMBER = (r: number, g: number, b: number) => r > 200 && r > b + 90 && r > g + 70;
const AMBER = (r: number, g: number, b: number) => r > 200 && g > 140 && b < 120;
const BLUE = (r: number, g: number, b: number) => b > 200 && b > r + 90;
/** Lit and warm-hued, or cold-hued: the copies' colours at their 0.26 of the base. */
const WARM = (r: number, g: number, b: number) => r > 0x0b + 24 && r > b + 40;
const COLD = (r: number, g: number, b: number) => b > 0x12 + 24 && b > r + 40;
/** Amber-hued (the person's colour at any brightness): red well up, green half of it, blue low. */
const AMBERISH = (r: number, g: number, b: number) => r > 120 && g > 0.55 * r && b < 0.6 * r;
/**
 * The split's thresholds, measured on SwiftShader at 1x (phone / desktop): ember-dominant 194 / 219, blue-dominant
 * 1,177 / 1,357, the warm copy alone 3,118 / 3,631 warm-hued px and the cold one 4,524 / 5,242 cold;
 * amber-hued 127 / 149 held and 344 / 401 as the fix lands (the focused piece at FOCUS_GAIN).
 * freeze-frame §4's 300 / 300 / 150 were set on the mocks at 2x.
 * The amber's rise is re-pinned for the terminator (re-skin Task 7): it was the whole frame's (floor 120),
 * most of it the warm copy turning amber, which now already reads amber in the held frame over C1's
 * darkened half (258 / 294 held, 269 / 328 as the fix lands). It is the piece's own now (its shells,
 * persons, bodies and tracks, the copies left out): 0 held and 51 / 55 as the fix lands (36 / 41 on
 * 8831f96, before it), so 0.6 × 51. With the terminator the blue-dominant count is 2,189 / 2,553.
 * With the far side (fix round 1), phone / desktop: ember 165 / 194, blue-dominant 1,943 / 2,256, the warm
 * copy 1,968 / 2,287 and the cold 2,742 / 3,285 (the copies' far hemisphere dimmed with the base's), the
 * piece's amber 0 held and 58 / 62 as the fix lands. And the whole frame's amber as the fix lands (review
 * m3, the copies' with the piece's): 209 / 248, so 0.6 × 209.
 */
const SPLIT = { ember: 120, blue: 300, copy: 1_800, amberRise: 30, frameAmber: 125 };
/**
 * The limb test's calm ambient: C1 focused at 1 with the hold let go scatters in every slot (Task 8b); at
 * 19.6 s it is between two scatters, no wound holds a dot and no dropout line is up (19.5-19.8 s are all
 * calm, by the twin; the test asserts it). The pose itself is never calm at focus 1.
 */
const LIMB_CALM = 19.6;
/**
 * The mended piece's warm-hued pixels, measured at 1x on the phone: the planet 33, the moons 8, 12, 8,
 * 10, 22 (the one caught mid-burst, which took 20 of the person's motes), 6. The person's dust is six
 * motes a moon, a few px each: freeze-frame §4's ≥ 120 / ≥ 12 amber are not reached at 1x (Task 13).
 */
const HEAL = { planet: 20, moon: 4 };
/**
 * At most this many pixels change between two twos ticks of the live held frame: measured 1,700 to
 * 8,437 at 1x (as the two moments fall on the same length set or not), all inside the piece.
 * The copies' breath moves every one of the piece's ~6,200 copied motes by a fraction of a pixel, which
 * resamples their edges; freeze-frame §4's 400 counted the ticks' re-roll alone.
 */
const TWOS_PX = 12_000;
const dist = (x: number, y: number, c: { x: number; y: number }) => Math.hypot(x - c.x, y - c.y);
const angleApart = (a: number, b: number) => Math.abs(((((a - b + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI);

/** Mean light over the ground (each channel less BG's) of the pixels whose centres `keep` selects. */
function meanLight(png: PNG, keep: (x: number, y: number) => boolean): [number, number, number] {
  const sum = [0, 0, 0];
  let n = 0;
  for (let y = 0; y < png.height; y++)
    for (let x = 0; x < png.width; x++) {
      if (!keep(x + 0.5, y + 0.5)) continue;
      const i = (y * png.width + x) * 4;
      for (let c = 0; c < 3; c++) sum[c] += png.data[i + c] - BG[c];
      n++;
    }
  return sum.map((v) => v / Math.max(1, n)) as [number, number, number];
}
/** The mean HSV saturation, (max − min) / max, of the lit pixels whose centres `keep` selects. */
function meanSaturation(png: PNG, keep: (x: number, y: number) => boolean): { mean: number; n: number } {
  let sum = 0;
  let n = 0;
  for (let y = 0; y < png.height; y++)
    for (let x = 0; x < png.width; x++) {
      if (!keep(x + 0.5, y + 0.5) || !litAt(png, x, y)) continue;
      const i = (y * png.width + x) * 4;
      const ch = [png.data[i], png.data[i + 1], png.data[i + 2]];
      const hi = Math.max(...ch);
      sum += hi === 0 ? 0 : (hi - Math.min(...ch)) / hi;
      n++;
    }
  return { mean: sum / Math.max(1, n), n };
}
/** Ember-dominant and blue-dominant: one channel 40 over both others (a copy's own hue; C1's cyan is neither). */
const EMBER_DOMINANT = (r: number, g: number, b: number) => r > g + 40 && r > b + 40;
const BLUE_DOMINANT = (r: number, g: number, b: number) => b > g + 40 && b > r + 40;
const DOUBLE_LAG = 12;
const DOUBLE_BAND = 12;
/**
 * How the ember-dominant image lies on the blue-dominant one through `planet`'s disc: for each row, the
 * count of blue-dominant px whose px `lag` to the right (−12..12) is ember-dominant. The lag that counts
 * most, pooled over every row (`lag`), and its contrast (its count over the mean count more than 2 px from
 * it, less 1); and, in 12-row bands that hold both colours, how many bands' own best lag is 5-7 px.
 */
function doubleImage(png: PNG, planet: { x: number; y: number; r: number }): { lag: number; contrast: number; bands: number; bandsOk: number } {
  // Off the canvas reads as the ground (neither colour), never as the next or previous row.
  const at = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= png.width || y >= png.height) return [BG[0], BG[1], BG[2]] as const;
    const i = (y * png.width + x) * 4;
    return [png.data[i], png.data[i + 1], png.data[i + 2]] as const;
  };
  const rows: { corr: number[]; ember: number; blue: number }[] = [];
  for (let y = Math.ceil(planet.y - planet.r); y <= Math.floor(planet.y + planet.r); y++) {
    const half = Math.sqrt(Math.max(0, planet.r * planet.r - (y + 0.5 - planet.y) ** 2));
    const corr = new Array(2 * DOUBLE_LAG + 1).fill(0);
    let ember = 0;
    let blue = 0;
    for (let x = Math.floor(planet.x - half); x <= Math.ceil(planet.x + half); x++) {
      if (EMBER_DOMINANT(...at(x, y))) ember++;
      if (!BLUE_DOMINANT(...at(x, y))) continue;
      blue++;
      for (let lag = -DOUBLE_LAG; lag <= DOUBLE_LAG; lag++) if (EMBER_DOMINANT(...at(x + lag, y))) corr[lag + DOUBLE_LAG]++;
    }
    rows.push({ corr, ember, blue });
  }
  const best = (c: number[]) => c.indexOf(Math.max(...c)) - DOUBLE_LAG;
  const pooled = rows.reduce((acc, r) => acc.map((v, k) => v + r.corr[k]), new Array(2 * DOUBLE_LAG + 1).fill(0) as number[]);
  const lag = best(pooled);
  const off = pooled.filter((_, k) => Math.abs(k - DOUBLE_LAG - lag) > 2);
  const contrast = pooled[lag + DOUBLE_LAG] / (off.reduce((a, b) => a + b, 0) / off.length) - 1;
  let bands = 0;
  let bandsOk = 0;
  for (let i = 0; i + DOUBLE_BAND <= rows.length; i += DOUBLE_BAND) {
    const band = rows.slice(i, i + DOUBLE_BAND);
    if (band.every((r) => r.ember === 0) || band.every((r) => r.blue === 0)) continue;
    const c = band.reduce((acc, r) => acc.map((v, k) => v + r.corr[k]), new Array(2 * DOUBLE_LAG + 1).fill(0) as number[]);
    bands++;
    const l = best(c);
    if (Math.max(...c) > 0 && l >= 5 && l <= 7) bandsOk++;
  }
  return { lag, contrast, bands, bandsOk };
}

/** The piece's own draws at the held frame (its bursts among them), and its two copies'. */
const PIECE_MESHES = ['net-shells', 'net-persons', 'net-bodies', 'net-tracks', 'net-ticks'];
const COPY_MESHES = ['net-copy-shells-1', 'net-copy-bodies-1', 'net-copy-tracks-1', 'net-copy-shells-2', 'net-copy-bodies-2', 'net-copy-tracks-2'];
/**
 * How the copies lift the piece, over the px `keep` selects where the piece (`base`) and the copies drawn
 * alone (`copies`) are both lit: per channel under 255 in the full frame, the full frame's light above the
 * piece's, over the copies' own light above the ground. `lift` pools it, `share` is the share of those px
 * whose own lift is at least 0.9 of their copies' light, and `raw` pools every channel, clipped ones too.
 */
function copiesLift(base: PNG, copies: PNG, full: PNG, keep: (x: number, y: number) => boolean): { lift: number; share: number; raw: number; px: number; channels: number } {
  let added = 0;
  let own = 0;
  let rawAdded = 0;
  let rawOwn = 0;
  let px = 0;
  let lifted = 0;
  let channels = 0;
  for (let y = 0; y < full.height; y++)
    for (let x = 0; x < full.width; x++) {
      if (!keep(x + 0.5, y + 0.5) || !litAt(base, x, y) || !litAt(copies, x, y)) continue;
      const i = (y * full.width + x) * 4;
      let a = 0;
      let o = 0;
      for (let c = 0; c < 3; c++) {
        const lift = full.data[i + c] - base.data[i + c];
        const mine = copies.data[i + c] - BG[c];
        rawAdded += lift;
        rawOwn += mine;
        if (full.data[i + c] >= 255 || mine <= 0) continue;
        a += lift;
        o += mine;
        channels++;
      }
      if (o <= 0) continue;
      px++;
      added += a;
      own += o;
      if (a >= 0.9 * o) lifted++;
    }
  return { lift: added / Math.max(1, own), share: lifted / Math.max(1, px), raw: rawAdded / Math.max(1, rawOwn), px, channels };
}

/** The moon's burst's annulus (1.8-3.4 moon radii) and the planet's (from its dashes' start, 50 px out), as pixel tests. */
function annuli(twin: Frame['twin']) {
  const inner = (FREEZE_TICK_PLANET.r0 + FREEZE_TICK_PLANET.out * twin.scatterOut) * twin.planet.r;
  return {
    moon: (x: number, y: number) => dist(x, y, twin.moon) >= 1.8 * twin.moon.r && dist(x, y, twin.moon) <= 3.4 * twin.moon.r,
    planet: (x: number, y: number) => dist(x, y, twin.planet) >= inner && dist(x, y, twin.planet) <= inner + 50,
    inner,
  };
}

/**
 * The freeze frame's thresholds per screen. The bursts' were set on the mocks (freeze-frame §4). The double
 * image's (re-skin Task 8) are 0.6 × measured on SwiftShader at 1x (phone / desktop), under Task 7's far side
 * (the planets' far hemisphere dimmed, 9b74fa4):
 * - its contrast, DOUBLE_CONTRAST_MEASURED: 2.07 / 2.13 (0.87 / 1.10 before the far side);
 * - the ember-dominant px over C1's disc where the copies add, ADDED_EMBER_MEASURED: 54 / 66. Re-pinned for the
 *   far side, which leaves less of C1's far half under the warm copy to sum past 200 in red: 106 / 112 before it
 *   (floors 63 / 67). The same frame with the copies screen-blended reads 27 / 37 (33 / 47 before the far side).
 */
const DOUBLE_CONTRAST_MEASURED = { phone: 2.07, desktop: 2.13 };
const ADDED_EMBER_MEASURED = { phone: 54, desktop: 66 };
/**
 * The copies add (re-skin Task 8 fix round 1): the share of C1's px, where the piece and its copies are both
 * lit, that the copies lift by at least 0.9 of their own light. Measured 95.1 % / 96.7 % (phone / desktop);
 * floors 0.6 × measured. With the copies screen-blended (the blend they replace) the same frame reads
 * 13.5 % / 13.4 %, its pooled lift 0.734 / 0.729 against additive's 0.975 / 0.981.
 */
const ADDED_SHARE_MEASURED = { phone: 0.951, desktop: 0.967 };
const FREEZE_SIZES = [
  { width: 390, height: 844, label: 'phone', moonLit: 60, planetLit: 160, doubleContrast: 0.6 * DOUBLE_CONTRAST_MEASURED.phone, addedEmber: Math.floor(0.6 * ADDED_EMBER_MEASURED.phone), addedShare: 0.6 * ADDED_SHARE_MEASURED.phone },
  { width: 1440, height: 900, label: 'desktop', moonLit: 120, planetLit: 300, doubleContrast: 0.6 * DOUBLE_CONTRAST_MEASURED.desktop, addedEmber: Math.floor(0.6 * ADDED_EMBER_MEASURED.desktop), addedShare: 0.6 * ADDED_SHARE_MEASURED.desktop },
] as const;

for (const size of FREEZE_SIZES) {
  test.describe(`the freeze frame, ${size.width}x${size.height}`, () => {
    test.use({ viewport: { width: size.width, height: size.height } });
    // Measured: the bursts 1.3-1.4 min and the split 0.9-1.0 min on CI beside a shard's other tests (run
    // 38166992199); at 1440x900, run to completion at load 9-15.7 beside a full unit suite, the bursts 2.6
    // min and the split 1.4 min. 8 min is 3 times the loaded time and over 5 times CI's (the file's 5 min
    // before: under 5 times CI's).
    test.setTimeout(480_000);

    test(`the bursts read, as two (${size.label})`, async ({ page }) => {
      const ticksOnly = { only: ['net-ticks'] };
      const held = await defectFrame(page, 0.33, ticksOnly);
      const a = annuli(held.twin);
      const moonLit = litWhere(held.png, a.moon);
      const planetLit = litWhere(held.png, a.planet);
      note('bursts at 0.33', `moon ${moonLit}, planet ${planetLit}`);
      expect(moonLit, 'the moon’s burst').toBeGreaterThanOrEqual(size.moonLit);
      expect(planetLit, 'the planet’s burst').toBeGreaterThanOrEqual(size.planetLit);
      // The planet's ring leaves its gap toward the moon: nothing lit there but the moon's own dashes.
      const toMoon = Math.atan2(held.twin.moon.y - held.twin.planet.y, held.twin.moon.x - held.twin.planet.x);
      const moonDashes = held.twin.ticks.filter((t) => t.source === 'moon');
      const gap = litWhere(
        held.png,
        (x, y) => a.planet(x, y) && angleApart(Math.atan2(y - held.twin.planet.y, x - held.twin.planet.x), toMoon) < FREEZE_TICK_PLANET.gapHalf && moonDashes.every((t) => Math.hypot(x - t.x, y - t.y) > 3),
      );
      expect(gap, 'the gap toward the moon').toBeLessThanOrEqual(10);
      // None of the moon's dashes inside the planet's ring, as drawn (tick.vert.glsl clips them): no tick
      // pixel lit inside the ring's start, short of a dot's own reach (the planet's dashes start there).
      const clipped = litWhere(held.png, (x, y) => dist(x, y, held.twin.planet) < a.inner - FREEZE_TICK_PX);
      expect(clipped, 'a moon dash inside the planet’s ring').toBe(0);
      // Not vacuous: unclipped, some of the moon's dashes would stand inside it.
      const { camera, ambient } = essayCameraAt(held.state, size.width, size.height);
      const unclipped = freezeTicks(held.state, ambient, camera, size.width, size.height, 0, false).ticks;
      expect(unclipped.filter((t) => t.source === 'moon' && dist(t.x, t.y, held.twin.planet) < a.inner - FREEZE_TICK_PX).length).toBeGreaterThan(0);
      expect(moonDashes.length).toBeGreaterThan(40);
      // Live before the cut, none; fewer as the fix lands; none once it has, nor with the fix forced on the held frame.
      const counts = async (local: number, extra?: Record<string, unknown>) => {
        const f = await defectFrame(page, local, { ...ticksOnly, extra });
        const b = annuli(f.twin);
        return { moon: litWhere(f.png, b.moon), planet: litWhere(f.png, b.planet), all: litWhere(f.png, () => true), twin: f.twin.ticks.length };
      };
      const live = await counts(0.25);
      expect([live.moon, live.planet]).toEqual([expect.any(Number), expect.any(Number)]);
      expect(live.moon).toBeLessThanOrEqual(8);
      expect(live.planet).toBeLessThanOrEqual(8);
      // Mid-retraction (v 0.26 at 0.3987: C1 mends over 0.388-0.404, after its gold lands and glows, the
      // author on v25; v was 0.26 at 0.39 when the mend ran 0.37-0.40): some dashes still stand, fewer
      // than held, and the planet's ring has come in with its shell.
      const fixing = await counts(0.3987);
      const fixingFrame = await defectFrame(page, 0.3987, ticksOnly);
      note('bursts at 0.3987', `moon ${fixing.moon}, planet ${fixing.planet}, twin ${fixing.twin} of ${held.twin.ticks.length}`);
      expect(fixing.twin, 'some dashes still stand').toBeGreaterThan(0);
      expect(fixing.twin, 'fewer than held').toBeLessThan(held.twin.ticks.length);
      expect(fixing.moon + fixing.planet, 'and draw').toBeGreaterThan(0);
      expect(fixing.moon).toBeLessThan(moonLit);
      expect(fixing.planet).toBeLessThan(planetLit);
      expect(annuli(fixingFrame.twin).inner / fixingFrame.twin.planet.r, 'the ring in toward the shell').toBeLessThan(a.inner / held.twin.planet.r);
      for (const l of [0.404, 0.437]) {
        const done = await counts(l);
        expect(done.moon, `moon at ${l}`).toBeLessThanOrEqual(8);
        expect(done.planet, `planet at ${l}`).toBeLessThanOrEqual(8);
      }
      const fixed = await counts(0.33, { net: { fix: 1 } });
      expect(fixed.twin, 'the twin: every dash gone at v = 0').toBe(0);
      expect(fixed.all, 'no tick mote drawn').toBe(0);
    });

    test(`the split reads, mode A (${size.label})`, async ({ page }) => {
      const held = await defectFrame(page, 0.33);
      const { planet } = held.twin;
      // The piece's rectangle: the planet's burst's reach every way.
      const reach = annuli(held.twin).inner + 60;
      const inRect = (x: number, y: number) => Math.abs(x - planet.x) <= reach && Math.abs(y - planet.y) <= reach;
      const ember = colourWhere(held.png, EMBER, inRect);
      const blue = colourWhere(held.png, BLUE, (x, y) => inRect(x, y) && dist(x, y, planet) > planet.r + 2);
      // Each copy alone: the warm one's lit pixels warm-hued, the cold one's cold.
      const warmCopy = await defectFrame(page, 0.33, { only: ['net-copy-shells-2', 'net-copy-bodies-2', 'net-copy-tracks-2'] });
      const coldCopy = await defectFrame(page, 0.33, { only: ['net-copy-shells-1', 'net-copy-bodies-1', 'net-copy-tracks-1'] });
      const warmLit = colourWhere(warmCopy.png, WARM, inRect);
      const warmCold = colourWhere(warmCopy.png, COLD, inRect);
      const coldLit = colourWhere(coldCopy.png, COLD, inRect);
      const coldWarm = colourWhere(coldCopy.png, WARM, inRect);
      const live = await defectFrame(page, 0.25);
      const liveEmber = colourWhere(live.png, EMBER, inRect);
      const fixing = await defectFrame(page, 0.4013);
      const fixingEmber = colourWhere(fixing.png, EMBER, inRect);
      const fixingWarm = colourWhere(fixing.png, WARM, inRect);
      // The fix's amber on the piece itself (its shells, persons, bodies and tracks; the copies left out):
      // under the terminator (re-skin Task 7) the warm copy reads amber over C1's darkened half, so the
      // whole frame's amber no longer rises with the fix alone.
      const own = { only: ['net-shells', 'net-persons', 'net-bodies', 'net-tracks'] };
      const heldWarm = colourWhere((await defectFrame(page, 0.33, own)).png, AMBERISH, inRect);
      const fixingAmber = colourWhere((await defectFrame(page, 0.4013, own)).png, AMBERISH, inRect);
      note(
        'split',
        `0.33: ember ${ember}, blue ${blue}, warm copy ${warmLit} warm / ${warmCold} cold, cold copy ${coldLit} cold / ${coldWarm} warm, amberish ${heldWarm}; 0.25: ember ${liveEmber}; 0.4013: ember ${fixingEmber}, warm ${fixingWarm}, amberish ${fixingAmber}`,
      );
      expect(ember, 'ember-dominant').toBeGreaterThanOrEqual(SPLIT.ember);
      expect(blue, 'blue-dominant outside the limb').toBeGreaterThanOrEqual(SPLIT.blue);
      expect(warmLit, 'the warm copy').toBeGreaterThanOrEqual(SPLIT.copy);
      expect(warmCold, 'the warm copy is warm').toBeLessThan(warmLit / 10);
      expect(coldLit, 'the cold copy').toBeGreaterThanOrEqual(SPLIT.copy);
      expect(coldWarm, 'the cold copy is cold').toBeLessThan(coldLit / 10);
      expect(liveEmber, 'no ember before the cut').toBeLessThanOrEqual(20);
      expect(fixingEmber, 'the ember gone as the fix lands').toBeLessThanOrEqual(40);
      expect(fixingAmber, 'the amber up as it lands').toBeGreaterThanOrEqual(heldWarm + SPLIT.amberRise);
      // And the whole frame's amber as it lands, the copies' with the piece's (review m3).
      const fixingFrameAmber = colourWhere(fixing.png, AMBERISH, inRect);
      note('split amber', `the whole frame at 0.4013: ${fixingFrameAmber} amber-hued px`);
      expect(fixingFrameAmber, 'the whole frame amber as it lands').toBeGreaterThanOrEqual(SPLIT.frameAmber);
      expect(fixingWarm, 'the warm half turned amber, not ember').toBeGreaterThan(fixingEmber);
    });

    // ---- The freeze frame to its mock (re-skin Task 8, §4.5): the copies add, C1 cyan, the scatter in its hue ----

    test(`the copies read as a double image (${size.label})`, async ({ page }) => {
      // The held frame as drawn. The warm copy stands FREEZE_COPY_PX right of the base and the cold one as
      // far left (along the rolled screen x, 4°), so the ember-dominant image is the blue-dominant one moved
      // 6 px right. Measured as the displacement that best lays one image on the other in each row through
      // C1's disc: a row holds two or three motes' worth of each colour, so its own best lag is noise (the
      // brief's per-row centroid read 0-4 % on this frame, on 8b's screen blend and on the mock alike), and
      // the rows are pooled in 12-row bands (twice the copies' spread) and over the whole disc.
      const held = await defectFrame(page, 0.33);
      const { planet } = held.twin;
      const lags = doubleImage(held.png, planet);
      note('double image', `${size.label}: pooled lag ${lags.lag} px, contrast ${lags.contrast.toFixed(2)}, bands ${lags.bandsOk}/${lags.bands}`);
      expect(lags.lag, 'the warm image 5-7 px right of the cold').toBeGreaterThanOrEqual(5);
      expect(lags.lag).toBeLessThanOrEqual(7);
      expect(lags.contrast, 'a distinct double, not a smear').toBeGreaterThanOrEqual(size.doubleContrast);
      expect(lags.bandsOk / lags.bands, 'in 60 % of the bands that hold both').toBeGreaterThanOrEqual(0.6);
      // The copies add (One + One, as the mock): over the planet the warm copy sums with what is drawn
      // under it to an ember-dominant px brighter than 200 in red, which the screen blend never reached.
      const embers = colourWhere(held.png, EMBER, (x, y) => dist(x, y, planet) <= planet.r);
      note('double image', `${size.label}: ${embers} ember-dominant px (r > 200) in C1's disc`);
      expect(embers, 'the copies add up over the planet').toBeGreaterThanOrEqual(size.addedEmber);
    });

    test(`the copies add, wherever C1 is lit (${size.label})`, async ({ page }) => {
      // The held frame drawn three ways over C1's disc: the piece alone (its shells, persons, bodies,
      // tracks and bursts), its two copies alone, and both. Where the copies add (One + One, as the mock),
      // what they lift the piece's px by is their own light; the screen blend they replace lifts it by only
      // (1 − the piece's) of it, so least where C1 is brightest. Px clipped at 255 lift by nothing either
      // way, so a channel counts only where the full frame is under 255.
      const base = await defectFrame(page, 0.33, { only: PIECE_MESHES });
      const copies = await defectFrame(page, 0.33, { only: COPY_MESHES });
      const full = await defectFrame(page, 0.33, { only: [...PIECE_MESHES, ...COPY_MESHES] });
      const { planet } = full.twin;
      const lift = copiesLift(base.png, copies.png, full.png, (x, y) => dist(x, y, planet) <= planet.r);
      note('copies add', `${size.label}: lift ${lift.lift.toFixed(3)} of the copies' own light over ${lift.channels} channels in ${lift.px} px; px lifted by ≥ 0.9 of it: ${(100 * lift.share).toFixed(1)} %; raw lift ${lift.raw.toFixed(3)}`);
      expect(lift.px, 'px where the piece and its copies are both lit').toBeGreaterThan(500);
      expect(lift.share, 'px the copies lift by ≥ 0.9 of their own light').toBeGreaterThanOrEqual(size.addedShare);
    });

    test(`the held planet is cyan (${size.label})`, async ({ page }) => {
      // Task 7's rule (galaxy.spec.ts "C1 is cyan", at df-1) on the held frame: C1's own shells and body
      // (the copies are the double image, judged above), its disc's mean light within 0.9 R has
      // B ≥ 0.95 G and G ≥ 2 R. Neither the dressing nor the flash may turn it pale.
      const held = await defectFrame(page, 0.33, { only: ['net-shells', 'net-bodies'] });
      const { planet } = held.twin;
      const [R, G, B] = meanLight(held.png, (x, y) => dist(x, y, planet) <= 0.9 * planet.r);
      note('cyan', `${size.label}: C1's disc mean light R ${R.toFixed(1)}, G ${G.toFixed(1)}, B ${B.toFixed(1)}`);
      expect(B).toBeGreaterThanOrEqual(0.95 * G);
      expect(G).toBeGreaterThanOrEqual(2 * R);
    });

    test(`the scatter keeps its hue (${size.label})`, async ({ page }) => {
      // The scatter haze round C1, as drawn: the lit px 1.05-1.5 R about it have a mean saturation of at
      // least 0.35 (C1's hue, not a pile of white).
      const held = await defectFrame(page, 0.33);
      const { planet } = held.twin;
      const sat = meanSaturation(held.png, (x, y) => dist(x, y, planet) >= 1.05 * planet.r && dist(x, y, planet) <= 1.5 * planet.r);
      note('scatter hue', `${size.label}: mean saturation ${sat.mean.toFixed(3)} over ${sat.n} lit px`);
      expect(sat.n, 'a haze to judge').toBeGreaterThan(1000);
      expect(sat.mean).toBeGreaterThanOrEqual(0.35);
      // And its means: while the hold has the scatter out, C1's icosphere fill is half its own. Its body
      // alone, in its disc clear of the moons, against the same moment live before the cut (test mode
      // stands both at the pin's ambient; at 0.25 the focus forces C1's scatter, unheld, at its full fill).
      const bodies = { only: ['net-bodies'] };
      const fill = async (local: number) => {
        const f = await defectFrame(page, local, bodies);
        const moons = pieceMoons(f);
        return meanLight(f.png, (x, y) => dist(x, y, f.twin.planet) <= 0.9 * f.twin.planet.r && moons.every((m) => dist(x, y, m) > m.r + 2));
      };
      const [heldFill, liveFill] = [await fill(0.33), await fill(0.25)];
      const ratio = (heldFill[1] + heldFill[2]) / (liveFill[1] + liveFill[2]);
      note('scatter hue', `${size.label}: C1's body G+B ${(heldFill[1] + heldFill[2]).toFixed(1)} held, ${(liveFill[1] + liveFill[2]).toFixed(1)} live: ${ratio.toFixed(3)}`);
      expect(liveFill[1] + liveFill[2], 'the body draws').toBeGreaterThan(4);
      expect(ratio, 'the held fill is FREEZE_SCATTER_FILL of the live one').toBeGreaterThanOrEqual(FREEZE_SCATTER_FILL - 0.1);
      expect(ratio).toBeLessThanOrEqual(FREEZE_SCATTER_FILL + 0.1);
    });
  });
}

test.describe('the freeze frame, 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the ghost reads beside the moon, on its track, and is gone once the fix lands', async ({ page }) => {
    const { g, data } = galaxyOf();
    const moonRow = g.ids[FREEZE_PINS.C1.moon];
    const sys = g.systems.indexOf(g.bodies[g.ids.C1].star);
    const ghostAt = (f: Frame, ambient: number) => {
      const c: BodyClocks = { growth: f.state.net.growth, fix: f.state.net.fix, highlight: f.state.net.highlight, show: 1, ambient, focus: 1, lamp: 1, lampRow: g.ids.C1, sysPx: new Float32Array(32).fill(1e4), holding: holdingOf(f) };
      const d = bodyDerp(moonRow, sys, c, data);
      const { camera } = essayCameraAt(f.state, 390, 844, ambient);
      const project = (p: readonly number[]) => {
        const q = new Vector3(p[0], p[1], p[2]).project(camera);
        return { x: ((q.x + 1) / 2) * 390, y: ((1 - q.y) / 2) * 844 };
      };
      const ghost = bodyGhost(moonRow, d, ambient, data);
      return { ...project(ghost.pos), gain: ghost.gain, nu: d.ghostNu };
    };
    const bodies = { only: ['net-bodies'] };
    const held = await defectFrame(page, 0.33, bodies);
    const ghost = ghostAt(held, AMBIENT_POSE);
    expect(ghost.gain, 'the twin draws a ghost').toBeGreaterThan(0);
    // On its track, within 0.6 rad of the moon's home.
    expect(Math.abs(ghost.nu)).toBeLessThan(0.6);
    const r = held.twin.moon.r;
    const others = [held.twin.moon, held.twin.planet];
    const ghostPx = litWhere(held.png, (x, y) => dist(x, y, ghost) <= r + 1 && others.every((o, i) => dist(x, y, o) > (i === 0 ? r : o.r) + 1));
    note('ghost at 0.33', `${ghostPx} px, the moon ${r.toFixed(1)} px`);
    expect(ghostPx, 'a second moon-sized component beside the moon').toBeGreaterThanOrEqual(8);
    expect(ghostPx).toBeLessThanOrEqual(Math.PI * (r + 1) * (r + 1));
    // Once the fix lands the ghost is gone (its gain is v's).
    const mended = await defectFrame(page, 0.437, bodies);
    const after = ghostAt(mended, AMBIENT_POSE);
    expect(after.gain).toBe(0);
    // Its place is clear of anything but the piece's own bodies where the mended frame has them (the
    // moon has slid home along its track, by the ghost).
    const bodiesNow = [...pieceMoons(mended), mended.twin.planet];
    const left = litWhere(mended.png, (x, y) => dist(x, y, ghost) <= r + 1 && bodiesNow.every((o) => dist(x, y, o) > o.r + 1));
    note('ghost at 0.437', `${left} px where the ghost was`);
    expect(left).toBeLessThanOrEqual(2);
    // Live before the cut there is none (Task 12 review). Test mode stands at the pose, the pin, whose
    // burst draws one, so the check runs at an ambient where the moon has no burst: at 0.25 the hold
    // is down and the frame shows its own clock. Where a ghost could stand (the moon's track within
    // 0.6 rad of its home, a moon wide) nothing is lit but the piece's own bodies; on the held frame
    // the same region holds the ghost.
    const along = (f: Frame, ambient: number) => {
      const c: BodyClocks = { growth: f.state.net.growth, fix: f.state.net.fix, highlight: f.state.net.highlight, show: 1, ambient, focus: 1, lamp: 1, lampRow: g.ids.C1, sysPx: new Float32Array(32).fill(1e4), holding: holdingOf(f) };
      const d = bodyDerp(moonRow, sys, c, data);
      const { camera } = essayCameraAt(f.state, 390, 844, ambient);
      return Array.from({ length: 61 }, (_, k) => {
        const q = new Vector3(...bodyGhost(moonRow, { ...d, ghost: 1, ghostNu: -0.6 + 0.02 * k }, ambient, data).pos).project(camera);
        return { x: ((q.x + 1) / 2) * 390, y: ((1 - q.y) / 2) * 844 };
      });
    };
    const region = (f: Frame, ambient: number) => {
      const track = along(f, ambient);
      const own = [...pieceMoons(f, ambient), f.twin.planet];
      return litWhere(f.png, (x, y) => track.some((t) => dist(x, y, t) <= r + 1) && own.every((o) => dist(x, y, o) > o.r + 1));
    };
    const heldRegion = region(held, AMBIENT_POSE);
    expect(heldRegion, 'the region holds the ghost on the held frame').toBeGreaterThanOrEqual(8);
    let quiet = AMBIENT_POSE;
    while (ghostAt(held, quiet).gain > 0 && quiet < AMBIENT_POSE + 1200) quiet += 0.5;
    const live = await defectFrame(page, 0.25, { ...bodies, ambient: quiet });
    expect(live.state.freeze.hold).toBe(0);
    expect(ghostAt(live, quiet).gain, `no burst on the moon at ${quiet}`).toBe(0);
    // Not off the screen: the moon's track is in the frame there.
    expect(along(live, quiet).some((t) => t.x > 0 && t.x < 390 && t.y > 0 && t.y < 844)).toBe(true);
    const liveRegion = region(live, quiet);
    note('ghost at 0.25', `${liveRegion} px where a ghost could stand at ambient ${quiet}, ${heldRegion} held`);
    expect(liveRegion).toBeLessThanOrEqual(2);
  });

  test('the scatter is in the frame, and the shell is home once the fix lands', async ({ page }) => {
    const shells = { only: ['net-shells'] };
    const outside = (f: Frame) => {
      const { planet } = f.twin;
      const moons = pieceMoons(f);
      return litWhere(f.png, (x, y) => dist(x, y, planet) > 1.05 * planet.r && dist(x, y, planet) < 2 * planet.r && moons.every((m) => dist(x, y, m) > m.r * 1.6 + 2));
    };
    const held = await defectFrame(page, 0.33, shells);
    const out = outside(held);
    const mended = await defectFrame(page, 0.437, shells);
    const home = outside(mended);
    note('scatter', `0.33: ${out} px out of the disc, 0.437: ${home}`);
    expect(out).toBeGreaterThanOrEqual(400);
    expect(home).toBeLessThanOrEqual(60);
  });

  test('the limb reads: the inked rim against the face, held (the shell unscattered) and live', async ({ page }) => {
    const shells = { only: ['net-shells'] };
    const ratio = (f: Frame) => {
      const { planet } = f.twin;
      const moons = pieceMoons(f);
      const free = (x: number, y: number) => moons.every((m) => dist(x, y, m) > m.r * 1.6 + 2);
      const mean = (keep: (x: number, y: number) => boolean) => {
        let sum = 0;
        let n = 0;
        for (let y = 0; y < f.png.height; y++)
          for (let x = 0; x < f.png.width; x++) {
            if (!keep(x + 0.5, y + 0.5) || !free(x + 0.5, y + 0.5)) continue;
            const i = (y * f.png.width + x) * 4;
            sum += f.png.data[i] + f.png.data[i + 1] + f.png.data[i + 2] - (BG[0] + BG[1] + BG[2]);
            n++;
          }
        return sum / Math.max(1, n);
      };
      const d = (x: number, y: number) => dist(x, y, planet) / planet.r;
      return mean((x, y) => d(x, y) >= 0.8 && d(x, y) <= 1) / mean((x, y) => d(x, y) < 0.8);
    };
    // The held frame with its hold let go, so the shell is not scattered (every mote is on its rest
    // place: the limb is the rest normal's), dressed; and the live frame before the cut. Let go, the
    // focused planet's own motion runs (re-skin Task 8b: a scatter in every slot at focus over
    // FOCUS_SCATTER, its leak and the dropout), so the frame is drawn at LIMB_CALM, an ambient between two
    // of its scatters where no wound moves a dot and no line is dark: at the keyed focus (1, the held
    // frame's FOCUS_GAIN 2.5) and dressing (1), as the held frame is.
    const dressedFrame = await defectFrame(page, 0.33, { ...shells, extra: { freeze: { hold: 0 } }, ambient: LIMB_CALM });
    // Truly unscattered at LIMB_CALM, by the twin: C1 is the focus's scatter row, but between scatters;
    // no wound holds any of its dots; no dropout line is up.
    const { g, data } = galaxyOf();
    const c1 = g.ids.C1;
    const t = LIMB_CALM;
    expect(dressedFrame.state.net.focus).toBe(1);
    const clocks: BodyClocks = { ...dressedFrame.state.net, ambient: t, lamp: Math.round(dressedFrame.state.net.lamp), lampRow: c1, sysPx: new Float32Array(32).fill(200), holding: false };
    expect(focusScatterRow(clocks, data), 'C1 scatters in every slot here').toBe(c1);
    expect(bodyDerp(c1, 0, clocks, data, 1).scatterS, 'C1 between scatters').toBe(-1);
    const wounds = bodyLeak(c1, t, { ...data, shells: packShellData(g, t, c1, true) });
    const shellSet = buildShellAttrs(g);
    let leaking = 0;
    for (let k = 0; k < shellSet.count; k++) {
      if (shellSet.mote[k * 4] !== c1) continue;
      const o = leakOffset(llUnit({ lat: shellSet.ll[k * 2], lon: shellSet.ll[k * 2 + 1] }), shellSet.mote[k * 4 + 3], t, wounds);
      if (o.gain !== 1 || o.off.some((x) => x !== 0)) leaking++;
    }
    expect(leaking, 'no dot of C1 leaking').toBe(0);
    expect(dropoutEvent(t), 'no dropout line').toBeNull();
    const dressed = ratio(dressedFrame);
    const live = ratio(await defectFrame(page, 0.25, shells));
    note('limb', `dressed ${dressed.toFixed(2)}, live ${live.toFixed(2)}`);
    // Measured under the terminator and its far side (re-skin Task 7, fix round 1), the dressed frame
    // truly unscattered at the held frame's gain (2.5): dressed 2.92, live 2.31 (2.63 and 2.02 at gain
    // 1.75 before the far side). The floors are unchanged.
    expect(dressed).toBeGreaterThanOrEqual(2.4);
    expect(live).toBeGreaterThanOrEqual(1.8);
  });

  test('the fix heals the whole piece: amber on the planet and every moon, the limb a circle, every derp term 0', async ({ page }) => {
    const mended = await defectFrame(page, 0.437);
    const { planet } = mended.twin;
    const moons = pieceMoons(mended);
    // Warm-hued pixels (the person's dust and the fixed shells' tint; at 1x the dust is under the spec's
    // r > 200 amber classifier, which counts none here: see HEAL).
    const onPlanet = colourWhere(mended.png, WARM, (x, y) => dist(x, y, planet) <= planet.r);
    const onMoons = moons.map((m) => colourWhere(mended.png, WARM, (x, y) => dist(x, y, m) <= m.r + 1));
    const amber = colourWhere(mended.png, AMBER, (x, y) => dist(x, y, planet) <= planet.r);
    note('warm', `planet ${onPlanet}, moons ${onMoons.join(' ')}; amber (r > 200) on the planet ${amber}`);
    expect(onPlanet).toBeGreaterThanOrEqual(HEAL.planet);
    expect(moons).toHaveLength(6);
    for (const [i, n] of onMoons.entries()) expect(n, `moon ${i}`).toBeGreaterThanOrEqual(HEAL.moon);
    // Not vacuous: before the fix (and the dressing), the piece has none of it.
    const before = await defectFrame(page, 0.25);
    const beforeMoons = pieceMoons(before);
    expect(colourWhere(before.png, WARM, (x, y) => dist(x, y, before.twin.planet) <= before.twin.planet.r)).toBeLessThanOrEqual(2);
    for (const m of beforeMoons) expect(colourWhere(before.png, WARM, (x, y) => dist(x, y, m) <= m.r + 1)).toBe(0);
    // The limb is a circle: the shell's outermost lit pixel in each of 72 directions, clear of the moons, within 2 px of one radius.
    const shells = await defectFrame(page, 0.437, { only: ['net-shells'] });
    const edges: [number, number][] = [];
    for (let k = 0; k < 72; k++) {
      const a = (k / 72) * 2 * Math.PI;
      let edge: [number, number] | null = null;
      for (let rr = 0.5 * planet.r; rr < 1.3 * planet.r; rr += 0.25) {
        const x = planet.x + rr * Math.cos(a);
        const y = planet.y + rr * Math.sin(a);
        if (moons.some((m) => dist(x, y, m) < m.r * 1.6 + 3)) {
          edge = null;
          break;
        }
        if (x >= 0 && y >= 0 && x < shells.png.width && y < shells.png.height && litAt(shells.png, Math.floor(x), Math.floor(y))) edge = [x, y];
      }
      if (edge) edges.push(edge);
    }
    expect(edges.length).toBeGreaterThan(36);
    // A least-squares circle through them (the Kasa fit): x² + y² = 2ax + 2by + c.
    const fit = circleFit(edges);
    const off = edges.map(([x, y]) => Math.abs(Math.hypot(x - fit.x, y - fit.y) - fit.r));
    note('limb circle', `radius ${fit.r.toFixed(1)} (the twin ${planet.r.toFixed(1)}), worst ${Math.max(...off).toFixed(2)} px off`);
    expect(Math.abs(fit.r - planet.r)).toBeLessThan(0.15 * planet.r);
    // Every direction within 2 px of the fit (measured worst 1.86 at 1x, the outermost lit pixel being a
    // lattice mote's dot or its antialiased edge; the scattered shell at 0.33 stands 10-20 px out of it).
    for (const o of off) expect(o).toBeLessThanOrEqual(2);
    // The twins: every moon on its ellipse, every derp term 0.
    const { g, data } = galaxyOf();
    const sys = g.systems.indexOf(g.bodies[g.ids.C1].star);
    const c: BodyClocks = { growth: 1, fix: mended.state.net.fix, highlight: 0, show: 1, ambient: AMBIENT_POSE, focus: 1, lamp: 1, lampRow: g.ids.C1, sysPx: new Float32Array(32).fill(1e4) };
    for (const b of g.bodies.filter((x) => x.index === g.ids.C1 || (x.kind === 'moon' && x.host === g.ids.C1))) {
      const d = bodyDerp(b.index, sys, c, data);
      expect([d.dNu, d.dR, d.lift, ...d.wobble, d.orbitT, d.ghost, d.ghostNu], b.id).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0]);
      expect(d.scatterS, b.id).toBe(-1);
      if (b.kind === 'moon') {
        const at = bodyCentre(b.index, d, AMBIENT_POSE, data);
        const home = bodyWorld(data, b.index, AMBIENT_POSE);
        expect(Math.hypot(at[0] - home[0], at[1] - home[1], at[2] - home[2]), b.id).toBeLessThan(1e-3);
      }
    }
  });

  test('freeze only in focus: the dressing forced on the galaxy wide (fr-1) at focus 0 changes no more than 20 px', async ({ page }) => {
    await openStage(page, '&mech=bike&n=500');
    const spans = await readSpans(page);
    const p = progressAt(spans, 'far', 0.53125);
    await openStage(page, `&mech=bike&p=${p}`);
    const plain = PNG.sync.read(await canvasShot(page));
    const forced = encodeURIComponent(JSON.stringify({ freeze: { hold: 1, dress: 1, flash: 1 }, camera: {}, net: { focus: 0 } }));
    await openStage(page, `&mech=bike&p=${p}&state=${forced}`);
    const dressed = PNG.sync.read(await canvasShot(page));
    let diff = 0;
    for (let i = 0; i < plain.data.length; i += 4) if ([0, 1, 2].some((c) => plain.data[i + c] !== dressed.data[i + c])) diff++;
    expect(countNonBackground(PNG.sync.write(plain))).toBeGreaterThan(1000);
    expect(diff).toBeLessThanOrEqual(20);
  });

  test('twos: in test mode the held frame is still; live, it breathes only in the piece and its bursts', async ({ page }) => {
    // Measured: 56-102 s on CI beside a shard's other tests (runs 38166992199 and 38170079659); run to
    // completion at load 14-17 beside two unit suites, 2.3 min. 9 min is nearly 4 times the loaded time and
    // over 5 times the slower CI run's (the file's 5 min before: under 5 times CI's).
    test.setTimeout(540_000);
    await openStage(page, '&mech=bike&n=500');
    const spans = await readSpans(page);
    const p = progressAt(spans, 'defect', 0.33);
    await openStage(page, `&mech=bike&p=${p}`);
    const a = await canvasShot(page);
    await page.waitForTimeout(3000);
    expect((await canvasShot(page)).equals(a), 'test mode: byte-equal 3 s apart').toBe(true);
    // Live: the ambient runs (but is held at the pin), the twos tick.
    await page.goto(`/?mech=bike&auto=0&n=3000&p=${p}`);
    await page.waitForFunction(() => document.getElementById('stage') !== null);
    // The clock module, the galaxy build and the first frames.
    await page.waitForTimeout(6000);
    const grab = (): Promise<string> =>
      page.evaluate(() => new Promise<string>((resolve) => requestAnimationFrame(() => resolve((document.getElementById('stage') as HTMLCanvasElement).toDataURL()))));
    const first = PNG.sync.read(Buffer.from((await grab()).split(',')[1], 'base64'));
    let second = first;
    let changed: [number, number][] = [];
    // Two moments a little apart until the twos' length set differs between them (half the time it does).
    for (let tries = 0; tries < 6 && changed.length === 0; tries++) {
      await page.waitForTimeout(3000 + 41 * tries);
      second = PNG.sync.read(Buffer.from((await grab()).split(',')[1], 'base64'));
      changed = [];
      for (let y = 0; y < first.height; y++)
        for (let x = 0; x < first.width; x++) {
          const i = (y * first.width + x) * 4;
          if ([0, 1, 2].some((c) => first.data[i + c] !== second.data[i + c])) changed.push([x + 0.5, y + 0.5]);
        }
    }
    const held = await defectFrame(page, 0.33);
    const { planet, moon } = held.twin;
    const reach = annuli(held.twin).inner + 60;
    // The piece: its bursts' reach, the moon's burst, and its moon tracks' dots (copied too), a few px out.
    const { camera } = essayCameraAt(held.state, 390, 844);
    const dots = visibleTracks(held.state, AMBIENT_POSE, camera, 390, 844).map((d) => {
      const q = new Vector3(...d.pos).project(camera);
      return { x: ((q.x + 1) / 2) * 390, y: ((1 - q.y) / 2) * 844 };
    });
    const moonReach = FREEZE_TICK_MOON.r0 * moon.r + FREEZE_TICK_MOON.len[1] + 3;
    const inside = ([x, y]: [number, number]) =>
      (Math.abs(x - planet.x) <= reach && Math.abs(y - planet.y) <= reach) || dist(x, y, moon) <= moonReach || dots.some((d) => dist(x, y, d) <= 8);
    note('twos', `${changed.length} px changed`);
    const outside = changed.filter((c) => !inside(c));
    note('twos', `${changed.length} px changed, ${outside.length} outside the piece and its bursts: ${outside.slice(0, 12).map(([x, y]) => `${x},${y}`).join(' ')}; planet ${planet.x.toFixed(0)},${planet.y.toFixed(0)} reach ${reach.toFixed(0)}`);
    expect(changed.length, 'the twos move something').toBeGreaterThan(0);
    expect(outside).toEqual([]);
    expect(changed.length).toBeLessThanOrEqual(TWOS_PX);
  });

  test('a deep link into the hold renders the scrolled frame', async ({ page }) => {
    await openStage(page, '&mech=bike&n=500');
    const spans = await readSpans(page);
    const p = progressAt(spans, 'defect', 0.33);
    await openStage(page, `&mech=bike&p=${p}`);
    const jumped = await canvasShot(page);
    await openStage(page, '&mech=bike');
    const y = await targetScrollY(page, p);
    await page.evaluate((to) => window.scrollTo(0, to), y);
    await settle(page);
    expect(countNonBackground(jumped)).toBeGreaterThan(2000);
    expect((await canvasShot(page)).equals(jumped)).toBe(true);
  });
});

/** The least-squares circle through `points` (the Kasa fit). */
function circleFit(points: [number, number][]): { x: number; y: number; r: number } {
  // Normal equations of x² + y² = 2ax + 2by + c in (a, b, c).
  const m = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const v = [0, 0, 0];
  for (const [x, y] of points) {
    const row = [2 * x, 2 * y, 1];
    const z = x * x + y * y;
    for (let i = 0; i < 3; i++) {
      v[i] += row[i] * z;
      for (let j = 0; j < 3; j++) m[i][j] += row[i] * row[j];
    }
  }
  const det = (q: number[][]) =>
    q[0][0] * (q[1][1] * q[2][2] - q[1][2] * q[2][1]) - q[0][1] * (q[1][0] * q[2][2] - q[1][2] * q[2][0]) + q[0][2] * (q[1][0] * q[2][1] - q[1][1] * q[2][0]);
  const d = det(m);
  const solve = (k: number) => det(m.map((row, i) => row.map((e, j) => (j === k ? v[i] : e)))) / d;
  const [a, b, c] = [solve(0), solve(1), solve(2)];
  return { x: a, y: b, r: Math.sqrt(c + a * a + b * b) };
}

/** C1's six moons on screen at a frame (twin centres, radii), the ghost not among them. */
/**
 * Whether the freeze holds in frame `f`, as the page has it (bodySystem.ts: `freeze.hold` up in a focused
 * frame): under the planet lamp the piece's moons keep their derp only then (the author on v25; bodyMote.ts
 * focusDerp), so a twin of a held frame must say so, or it puts the pinned moon back on its path.
 */
function holdingOf(f: Frame): boolean {
  return f.state.freeze.hold >= 0.5 && f.state.net.focus > 0;
}

function pieceMoons(f: Frame, at = AMBIENT_POSE): TickSourceOnScreen[] {
  const { g, data } = galaxyOf();
  const size = { width: f.png.width, height: f.png.height };
  const { camera, ambient } = essayCameraAt(f.state, size.width, size.height, at);
  const { forcedScatter } = heldOf(f.state, at, g);
  const c: BodyClocks = { growth: 1, fix: f.state.net.fix, highlight: 0, show: 1, ambient, focus: 1, lamp: 1, lampRow: g.ids.C1, sysPx: new Float32Array(32).fill(1e4), forcedScatter, holding: holdingOf(f) };
  const sys = g.systems.indexOf(g.bodies[g.ids.C1].star);
  const eye = camera.getWorldPosition(new Vector3());
  const focal = 0.5 * size.height * camera.projectionMatrix.elements[5];
  return g.bodies
    .filter((b) => b.kind === 'moon' && b.host === g.ids.C1)
    .map((b) => {
      const w = new Vector3(...bodyCentre(b.index, bodyDerp(b.index, sys, c, data), ambient, data));
      const r = (b.R * focal) / w.distanceTo(eye);
      const q = w.project(camera);
      return { x: ((q.x + 1) / 2) * size.width, y: ((1 - q.y) / 2) * size.height, r };
    });
}
