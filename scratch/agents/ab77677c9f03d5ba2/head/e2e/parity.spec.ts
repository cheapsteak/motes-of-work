import { expect, test } from '@playwright/test';
import { MECHANISM_IDS } from '../src/mechanisms';

interface ParityCase {
  name: string;
  maxError: number;
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
];

test('GLSL mote() matches the TS reference', async ({ page }) => {
  const errors: Error[] = [];
  page.on('pageerror', (e) => errors.push(e));
  await page.goto('/src/parity/parity.html?test=1');
  await page.waitForFunction(() => (window as unknown as { __parity?: unknown }).__parity !== undefined);
  const parity = await page.evaluate(
    () => (window as unknown as { __parity: { cases: ParityCase[]; error?: string } }).__parity,
  );

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
