import { existsSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { MOTE_BUDGET_DESKTOP, MOTE_SEED } from '../src/config';
import { galaxyBudget, generateGalaxy } from '../src/galaxy/generate';
import { openStage, readSpans } from './helpers';
// @ts-expect-error: a plain ESM tool, no types
import { diffFolders } from '../tools/still-diff.mjs';

// The re-skin's vertex cost (re-skin §7, the plan's Task 3): the early-out, and
// what a frame submits and runs on the heavy path (main.ts vertexStats, from the shaders' TS twin).
//
// The pixel tests compare two folders of stills, the baseline (VERTEX_BASE, e.g. shots/vertex/base) and
// the build under test (VERTEX_HEAD, shots/vertex/head by default), each written by
//   SHOTS=1 STILLS_DIR=<dir>/galaxy npx playwright test e2e/stills.spec.ts -g "R1a stills|R2 stills|R3 stills|Act II beats"
//   SHOTS=1 SHOTS_DIR=<dir>/act1 npx playwright test e2e/shots.spec.ts
// with tools/still-diff.mjs. They are skipped unless VERTEX_BASE names a folder: the stills are minutes
// of rendering, and a later task that changes the picture by design re-shoots the baseline first.

/** A still the baseline and the head both have, diffed (tools/still-diff.mjs). */
interface StillDiff {
  file: string;
  missing: boolean;
  sizeMismatch: boolean;
  differing: number;
  lit: number;
  maxDelta: number;
  share: number;
}

const BASE = process.env.VERTEX_BASE;
const HEAD = process.env.VERTEX_HEAD ?? 'shots/vertex/head';
const diffs = (): StillDiff[] => {
  const rows = diffFolders(BASE, HEAD) as StillDiff[];
  expect(rows.length, 'stills in the baseline').toBeGreaterThan(100);
  for (const r of rows) {
    expect(r.missing, `${r.file} is in ${HEAD}`).toBe(false);
    expect(r.sizeMismatch, `${r.file} is the same size`).toBe(false);
  }
  return rows;
};

test.describe('the stills against the baseline', () => {
  test.skip(BASE === undefined || !existsSync(BASE), 'set VERTEX_BASE to a folder of baseline stills');

  test('the early-out changes no pixel', () => {
    for (const r of diffs()) expect(r.differing, r.file).toBe(0);
  });
});

/** The phone and the desktop: the two tiers. */
const SIZES = [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
] as const;

type Stats = Record<string, { instances: number; verticesPerDot: number; submitted: number; heavy: number }>;

const vertexStats = (page: Page): Promise<Stats> => page.evaluate(() => (window as unknown as { __motes: { vertexStats(): Stats } }).__motes.vertexStats());

const grown = encodeURIComponent(JSON.stringify({ net: { show: 1, growth: 1 } }));
/** The hood probe, as the stills draw it. */
const HOOD = `&mech=bike&shot=hood&state=${grown}`;

/** fr-1, the galaxy wide, at the middle of its hold (stills.spec.ts's place). */
async function openFar(page: Page): Promise<void> {
  await openStage(page, '&mech=bike&n=500');
  const far = (await readSpans(page)).find((s) => s.id === 'far')!;
  await openStage(page, `&mech=bike&p=${far.start + 0.53125 * (far.end - far.start)}`);
}

/** The core's shell and person motes: lit and on screen at the wide, they run the heavy path until Task 5 draws the hole in their place. */
const g = generateGalaxy(MOTE_SEED, 'phone', galaxyBudget(MOTE_BUDGET_DESKTOP));
const CORE_MOTES = g.bodies.filter((b) => b.kind === 'core').reduce((n, b) => n + b.motes, 0);

/**
 * The hood's heavy instances on a phone (net-shells and net-tracks: the vertex runs over the vertices
 * per dot), as measured at Task 3: the fence holds it within 10 %.
 */
const HOOD_HEAVY_PHONE = 28_052;

/** The instances of `names` that run the heavy path (`heavy`), or all of them (`submitted`): vertices over vertices per dot. */
const dotsOf = (s: Stats, names: string[], k: 'submitted' | 'heavy'): number => names.reduce((n, m) => n + (s[m] ? s[m][k] / s[m].verticesPerDot : 0), 0);

test('the heavy path shrinks at the wides', async ({ page }) => {
  test.setTimeout(300_000);
  for (const size of SIZES) {
    await page.setViewportSize(size);
    await openFar(page);
    const far = await vertexStats(page);
    await openStage(page, HOOD);
    const hood = await vertexStats(page);
    console.log(`vertexStats ${size.width}x${size.height}`, JSON.stringify({ 'fr-1': far, hood }));
    if (size.width !== 390) continue;
    const dots = ['net-shells', 'net-tracks'];
    // fr-1: every system under 10 px and every star under a px on a phone, so only the core's lit
    // shells run (until Task 5): the rest is at most 5 % of the dots.
    expect(dotsOf(far, dots, 'heavy') - CORE_MOTES).toBeLessThanOrEqual(0.05 * dotsOf(far, dots, 'submitted'));
    // The hood: the moons and the planets under 25 px skip; held within 10 % of the measured.
    expect(dotsOf(hood, dots, 'heavy')).toBeLessThanOrEqual(1.1 * HOOD_HEAVY_PHONE);
  }
});
