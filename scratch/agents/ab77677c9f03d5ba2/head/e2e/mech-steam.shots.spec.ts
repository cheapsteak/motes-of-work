import { mkdirSync } from 'node:fs';
import { test } from '@playwright/test';
import { defaultSceneState, FAULT_KEYS, mergeState } from '../src/timeline/sceneState';
import { canvasShot, openStage } from './helpers';

// Human-review screenshots of the steam engine at a three-quarter view: specced and assembled, the
// wrong twin, exploded, and every fault at 0.6 against the ghost. Skipped unless SHOTS=1:
//   SHOTS=1 npx playwright test e2e/mech-steam.shots.spec.ts

test.skip(process.env.SHOTS !== '1', 'set SHOTS=1 to capture the steam engine screenshots');
test.setTimeout(120_000);

/** Machine-relative three-quarter view: above, right and in front of the whole machine. */
const THREE_QUARTER = { pos: [1.6, 1.1, 2.4], target: [0, 0, 0], fov: 40, coreFocus: 0 };
const allFaults = (x: number) => Object.fromEntries(FAULT_KEYS.map((k) => [k, x]));
const LOOKS: Record<string, unknown> = {
  assembled: { mech: { assembly: 1, drive: 0.3 } },
  twin: { mech: { assembly: 1, drive: 0.3, variant: 1 } },
  'exploded-0.75': { mech: { assembly: 0.75, drive: 0.3 } },
  'faults-0.6': { mech: { assembly: 1, drive: 0.3, faults: allFaults(0.6), ghost: 1 } },
};

test('screenshot the steam engine at a three-quarter view', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  mkdirSync('shots', { recursive: true });
  for (const [look, state] of Object.entries(LOOKS)) {
    // Expanded over the defaults so nothing from the story timeline leaks into the look.
    const full = mergeState(mergeState(defaultSceneState(), { camera: THREE_QUARTER }), state);
    await openStage(page, `&mech=steam&state=${encodeURIComponent(JSON.stringify(full))}`);
    await canvasShot(page, `shots/mech-steam-${look}.png`);
  }
  if (errors.length > 0) throw new Error(`page errors: ${errors.join('; ')}`);
});
