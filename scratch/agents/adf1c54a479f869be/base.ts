import { expect, test, type Page } from '@playwright/test';
import { MECHANISM_IDS } from '../src/mechanisms';

interface ParityCase {
  name: string;
  maxError: number;
  samples?: number;
  shifted?: number;
}

// Every case renders the production vertex path (the real instanced attributes, instanceAttrs(),
// mote()) and compares every MoteOut field with the TS reference, once per registered mechanism
// (case names are prefixed with the mechanism id).
const MOTE_CASES = [
  'assembly 0',
  'assembly 0.5',
  'assembly 1',
  'variant 0.5',
  'opposite normals at variant 0.5',
  'drift 1 at drive 0.37',
  'vibed 0.5 + misallocated 0.3',
  'vibed 1',
  'misallocated 1',
  'all faults 0.6 at drive 0.71',
  'copy row 1',
  'reflow 0.4 at drive 1.6',
  'reflow 0.4 mid-flight, drifting',
  'reflow 1 at drive 1.9',
];

// The network's node() (`?lib=node`), over a sample of the essay's network: builders, crack faces
// and person motes of the two close-up heroes, and motes spread over every stack.
const NODE_CASES = [
  'growth 0.09, R0 building',
  'growth 0.145, C1 building',
  'fix 0.07, C1 fixing',
  'highlight 0.25, the twelve',
  'highlight 0.96, the surge',
  'fix 0.45, R0 fixing',
  'all clocks at 1',
  'hidden',
];

async function runParity(page: Page, query: string): Promise<{ cases: ParityCase[]; error?: string; errors: Error[] }> {
  const errors: Error[] = [];
  page.on('pageerror', (e) => errors.push(e));
  await page.goto(`/src/parity/parity.html?test=1${query}`);
  await page.waitForFunction(() => (window as unknown as { __parity?: unknown }).__parity !== undefined);
  const parity = await page.evaluate(
    () => (window as unknown as { __parity: { cases: ParityCase[]; error?: string } }).__parity,
  );
  return { ...parity, errors };
}

test('GLSL mote() matches the TS reference', async ({ page }) => {
  const { errors, ...parity } = await runParity(page, '');

  expect(errors).toEqual([]);
  expect(parity.error).toBeUndefined();
  const byName = new Map(parity.cases.map((c) => [c.name, c.maxError]));
  const expected = MECHANISM_IDS.flatMap((id) => MOTE_CASES.map((c) => `${id}: ${c}`));
  expect([...byName.keys()].sort()).toEqual([...expected, 'hash01', 'pcg goldens'].sort());

  for (const c of parity.cases) {
    expect(c.maxError, c.name).toBeLessThan(1e-3);
  }
  // The hash is integer arithmetic: hash01 must agree to float32 rounding, pcg exactly.
  expect(byName.get('hash01')).toBeLessThan(1e-7);
  expect(byName.get('pcg goldens')).toBe(0);
});

test('GLSL node() matches the TS reference', async ({ page }) => {
  const { errors, ...parity } = await runParity(page, '&lib=node');
  expect(errors).toEqual([]);
  expect(parity.error).toBeUndefined();
  const byName = new Map(parity.cases.map((c) => [c.name, c.maxError]));
  expect([...byName.keys()].sort()).toEqual([...NODE_CASES.map((c) => `node: ${c}`), 'hash01', 'pcg goldens'].sort());
  for (const c of parity.cases) expect(c.maxError, c.name).toBeLessThan(1e-3);
  expect(byName.get('hash01')).toBeLessThan(1e-7);
  expect(byName.get('pcg goldens')).toBe(0);
});

// The cubes' bodies' box() (`?lib=box`): both lips of C1's and R0's crack cubes at many points of
// their surface, and bodies spread over every stack, through every branch.
const BOX_CASES = [
  'growth 0.09, R0 building',
  'growth 0.145, C1 building',
  'fix 0.06, C1 closing',
  'highlight 0.25, the twelve',
  'highlight 0.96, the surge',
  'fix 0.45, R0 closing',
  'all clocks at 1',
  'hidden',
];

test('GLSL box() matches the TS reference', async ({ page }) => {
  const { errors, ...parity } = await runParity(page, '&lib=box');
  expect(errors).toEqual([]);
  expect(parity.error).toBeUndefined();
  const byName = new Map(parity.cases.map((c) => [c.name, c.maxError]));
  expect([...byName.keys()].sort()).toEqual([...BOX_CASES.map((c) => `box: ${c}`), 'hash01', 'pcg goldens'].sort());
  for (const c of parity.cases) expect(c.maxError, c.name).toBeLessThan(1e-3);
});

// The galaxy's bodyWorld() (`?lib=orbit`): N0, C1 and its six moons, P1, R0, R1 and 32 hashed bodies,
// at each sampled ambient time, up to a day in (the moons' 6 s periods run 14,400 turns by then, and
// the galaxy's turn 72, swinging points a hundred units from N0: an unreduced angle shows there).
const ORBIT_TIMES = [0, 37.3, 101, 953, 3599.9, 86_400];

test('GLSL bodyWorld() matches the TS reference', async ({ page }) => {
  const { errors, ...parity } = await runParity(page, '&lib=orbit');
  expect(errors).toEqual([]);
  expect(parity.error).toBeUndefined();
  const byName = new Map(parity.cases.map((c) => [c.name, c.maxError]));
  expect([...byName.keys()].sort()).toEqual([...ORBIT_TIMES.map((t) => `orbit: bodyWorld at ${t} s`), 'hash01', 'pcg goldens'].sort());
  for (const c of parity.cases) expect(c.maxError, c.name).toBeLessThan(1e-3);
});

// The derps' derp() (`?lib=derp`): C1, its first moon, P1 and R0, all on R0's seed with their own
// phases, and a healthy planet (NODE_NEVER), every 0.0137 s over 0–20 s and at each kind's first two
// events at s 0.3. A sample within a few float32 units of the ambient of a hard cut may match the TS
// only across the cut: the page counts those (`shifted`), and they must stay rare.
const DERP_CASES = ['C1 (planet)', 'C1-m1 (moon)', 'P1 (star)', 'R0 (core)', 'a healthy planet'];

test('GLSL derp() matches the TS reference', async ({ page }) => {
  const { errors, ...parity } = await runParity(page, '&lib=derp');
  expect(errors).toEqual([]);
  expect(parity.error).toBeUndefined();
  const byName = new Map(parity.cases.map((c) => [c.name, c]));
  expect([...byName.keys()].sort()).toEqual([...DERP_CASES.map((c) => `derp: ${c}`), 'hash01', 'pcg goldens'].sort());
  for (const c of parity.cases) expect(c.maxError, c.name).toBeLessThan(1e-3);
  for (const name of DERP_CASES) {
    const c = byName.get(`derp: ${name}`)!;
    expect(c.samples, name).toBeGreaterThanOrEqual(1460);
    expect(c.shifted, name).toBeLessThanOrEqual(c.samples! / 100);
  }
});
