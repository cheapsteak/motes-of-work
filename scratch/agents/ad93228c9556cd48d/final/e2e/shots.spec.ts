import { mkdirSync } from 'node:fs';
import { test, type Page } from '@playwright/test';
import { MECHANISM_IDS } from '../src/mechanisms';
import { FADE_SCREENS } from '../src/story/reveal';
import { LAP, lapLocal } from '../src/timeline/shots';
import { defaultSceneState, FAULT_KEYS, mergeState } from '../src/timeline/sceneState';
import { canvasShot, openStage, readSpans, settle, targetScrollY } from './helpers';

// Human-review screenshots of the stage canvas: `npm run shots` writes shots/<beat>.png for every
// beat of the story, at the middle of its hold (full ink, nothing on its page changing; the
// storyboard's beat midpoints), shots/vb-*.png and shots/sp-*.png at the cold open's and the spec
// section's named frames, and shots/mech-<mech>-<look>.png for every registered mechanism at a
// three-quarter view: specced and assembled, three-quarters assembled, the wrong twin, every fault
// at 0.6 over the ghost of intent, and each fault alone at full strength over the ghost (fault-<key>).
// Skipped unless SHOTS=1. Beats, their timings, spans and mechanisms are read from the DOM and the
// registry, so a new beat or mechanism is picked up without editing this file.

test.skip(process.env.SHOTS !== '1', 'set SHOTS=1 (npm run shots) to capture section screenshots');
test.setTimeout(180_000);

/** Every beat's id and the section-local middle of its hold, per section. */
const beatMiddles = (page: Page) =>
  page.evaluate((fadeScreens) =>
    [...document.querySelectorAll<HTMLElement>('section[data-section]')].map((s) => {
      const fade = fadeScreens / Number(s.style.getPropertyValue('--length'));
      const pages = [...s.querySelectorAll<HTMLElement>('.page')].map((p) =>
        [...p.querySelectorAll<HTMLElement>('.beat')].map((b) => ({ id: b.dataset.beat as string, at: Number(b.dataset.at) })),
      );
      return pages.flatMap((beats, k) => {
        const out = pages[k + 1]?.[0].at ?? 1;
        return beats.map((b, i) => ({ id: b.id, local: (b.at + fade + (beats[i + 1]?.at ?? out - fade)) / 2 }));
      });
    }),
  FADE_SCREENS);

test('screenshot every beat at the middle of its hold', async ({ page }) => {
  test.setTimeout(600_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await openStage(page);
  mkdirSync('shots', { recursive: true });

  const spans = await readSpans(page);
  for (const [i, beats] of (await beatMiddles(page)).entries()) {
    for (const { id, local } of beats) {
      const p = spans[i].start + local * (spans[i].end - spans[i].start);
      await page.evaluate((y) => window.scrollTo(0, y), await targetScrollY(page, p));
      await settle(page);
      await canvasShot(page, `shots/${id}.png`);
    }
  }
  if (errors.length > 0) throw new Error(`page errors: ${errors.join('; ')}`);
});

/**
 * The cold open's named frames (docs/specs/2026-10-05-act-1-build-and-orbit.md §6, test 16, and
 * §2.1a), section-local in vibe-build: the ask alone; each brief line just as it has come up, its
 * parts already in flight (they set out with it), and again just after it lights (keyframes.test.ts
 * pins the lighting at 0.2483, 0.3628, 0.5189 and 0.8); the front wheel at one lock; the frame as it
 * is laid; and the lap at its low pass, crane, diagram and dive.
 */
const COLD_OPEN: [name: string, local: number][] = [
  ['vb-brief-ask', 0.1484375],
  ['vb-brief-line1', 0.190625],
  ['vb-brief-line1-lit', 0.251],
  ['vb-brief-line2', 0.315625],
  ['vb-brief-line2-lit', 0.366],
  ['vb-brief-line3', 0.4875],
  ['vb-brief-line3-lit', 0.522],
  ['vb-brief-line4', 0.70625],
  ['vb-brief-line4-lit', 0.803],
  ['vb-turn-lock', 0.5625],
  ['vb-frame-knot', 0.7171875],
  ['vb-frame-mid', 0.7546875],
  ['vb-frame-stays', 0.7859375],
  ['vb-lap-low', lapLocal(LAP[1].t)],
  ['vb-lap-crane', lapLocal(LAP[2].t)],
  ['vb-lap-diagram', lapLocal(LAP[3].t)],
  ['vb-lap-dive', lapLocal(LAP[4].t)],
];

test('screenshot the cold open at its named frames', async ({ page }) => {
  test.setTimeout(600_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await openStage(page);
  mkdirSync('shots', { recursive: true });
  const [vibeBuild] = await readSpans(page);
  for (const [name, local] of COLD_OPEN) {
    const p = vibeBuild.start + local * (vibeBuild.end - vibeBuild.start);
    await page.evaluate((y) => window.scrollTo(0, y), await targetScrollY(page, p));
    await settle(page);
    await canvasShot(page, `shots/${name}.png`);
  }
  if (errors.length > 0) throw new Error(`page errors: ${errors.join('; ')}`);
});

/**
 * The spec section's named frames (docs/specs/2026-10-05-blueprint-and-build.md), section-local: the
 * pen drawing the bike in, the drawing done, the seat close on the page, the ring, the redraw, the
 * tick, the page turning, the lines lifting off it, the gold landing on them, the build and the end.
 */
const SPEC: [name: string, local: number][] = [
  ['sp-draw-1', 0.07],
  ['sp-draw-2', 0.09],
  ['sp-draw-3', 0.11],
  ['sp-draw-4', 0.14],
  ['sp-drawn', 0.165],
  ['sp-seat', 0.24],
  ['sp-ring', 0.31],
  ['sp-redraw-1', 0.34],
  ['sp-redraw-2', 0.37],
  ['sp-redraw-3', 0.4],
  ['sp-tick', 0.5],
  ['sp-turn', 0.57],
  ['sp-lift-1', 0.62],
  ['sp-lift-2', 0.645],
  ['sp-lift-3', 0.665],
  ['sp-lift-4', 0.69],
  ['sp-gold', 0.8],
  ['sp-build', 0.9],
  ['sp-end', 1],
];

test('screenshot the spec section at its named frames', async ({ page }) => {
  test.setTimeout(600_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await openStage(page);
  mkdirSync('shots', { recursive: true });
  const spec = (await readSpans(page)).find((s) => s.id === 'spec');
  if (!spec) throw new Error('no spec section');
  for (const [name, local] of SPEC) {
    const p = spec.start + local * (spec.end - spec.start);
    await page.evaluate((y) => window.scrollTo(0, y), await targetScrollY(page, p));
    await settle(page);
    await canvasShot(page, `shots/${name}.png`);
  }
  if (errors.length > 0) throw new Error(`page errors: ${errors.join('; ')}`);
});

/** Machine-relative three-quarter view: above, right and in front of the whole machine. */
const THREE_QUARTER = { pos: [1.6, 1.1, 2.4], target: [0, 0, 0], fov: 40, coreFocus: 0 };
const allFaults = (x: number) => Object.fromEntries(FAULT_KEYS.map((k) => [k, x]));
const MECH_LOOKS: Record<string, unknown> = {
  assembled: { mech: { assembly: 1, drive: 0.3 } },
  'exploded-0.75': { mech: { assembly: 0.75, drive: 0.3 } },
  twin: { mech: { assembly: 1, variant: 1, drive: 0.3 } },
  'faults-0.6': { mech: { assembly: 1, drive: 0.3, faults: allFaults(0.6), ghost: 1 } },
  // One fault at a time, full strength, over the ghost: each should read as its own malfunction.
  ...Object.fromEntries(
    FAULT_KEYS.filter((k) => k !== 'drift').map((k) => [
      `fault-${k}`,
      { mech: { assembly: 1, drive: 0.3, faults: { [k]: 1 }, ghost: 1 } },
    ]),
  ),
};

for (const mech of MECHANISM_IDS) {
  test(`screenshot the ${mech} mechanism at a three-quarter view`, async ({ page }) => {
    test.setTimeout(300_000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    mkdirSync('shots', { recursive: true });
    for (const [look, state] of Object.entries(MECH_LOOKS)) {
      // Expanded over the defaults so nothing from the story timeline leaks into the look.
      const full = mergeState(mergeState(defaultSceneState(), { camera: THREE_QUARTER }), state);
      await openStage(page, `&mech=${mech}&state=${encodeURIComponent(JSON.stringify(full))}`);
      await canvasShot(page, `shots/mech-${mech}-${look}.png`);
    }
    if (errors.length > 0) throw new Error(`page errors: ${errors.join('; ')}`);
  });
}
