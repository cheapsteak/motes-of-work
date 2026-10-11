import { mkdirSync } from 'node:fs';
import { test } from '@playwright/test';
import { MECHANISM_IDS } from '../src/mechanisms';
import { defaultSceneState, FAULT_KEYS, mergeState } from '../src/timeline/sceneState';
import { canvasShot, openStage, readSpans, settle, targetScrollY } from './helpers';

// Human-review screenshots of the stage canvas: `npm run shots` writes shots/<id>-<local>.png for
// every story section at local progress 0.1, 0.5 and 0.9, and shots/mech-<mech>-lit-<look>.png for
// every registered mechanism at a three-quarter view. Skipped unless SHOTS=1. Section ids and spans
// are read from the DOM, so a new section is picked up without editing this file.

test.skip(process.env.SHOTS !== '1', 'set SHOTS=1 (npm run shots) to capture section screenshots');
test.setTimeout(180_000);

const LOCALS = [0.1, 0.5, 0.9];

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
});

/** Machine-relative three-quarter view: above, right and in front of the whole machine. */
const THREE_QUARTER = { pos: [1.6, 1.1, 2.4], target: [0, 0, 0], fov: 40, coreFocus: 0 };
const allFaults = (x: number) => Object.fromEntries(FAULT_KEYS.map((k) => [k, x]));
const MECH_LOOKS: Record<string, unknown> = {
  assembled: { mech: { assembly: 1 } },
  'exploded-0.75': { mech: { assembly: 0.75 } },
  twin: { mech: { assembly: 1, variant: 1 } },
  'faults-0.6': { mech: { assembly: 1, drive: 0.3, faults: allFaults(0.6) } },
};

test('screenshot every mechanism at a three-quarter view', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  mkdirSync('shots', { recursive: true });
  for (const mech of MECHANISM_IDS) {
    for (const [look, state] of Object.entries(MECH_LOOKS)) {
      // Expanded over the defaults so nothing from the story timeline leaks into the look.
      const full = mergeState(mergeState(defaultSceneState(), { camera: THREE_QUARTER }), state);
      await openStage(page, `&mech=${mech}&state=${encodeURIComponent(JSON.stringify(full))}`);
      await canvasShot(page, `shots/mech-${mech}-lit-${look}.png`);
    }
  }
  if (errors.length > 0) throw new Error(`page errors: ${errors.join('; ')}`);
});
