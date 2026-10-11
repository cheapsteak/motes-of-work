import { mkdirSync } from 'node:fs';
import { test } from '@playwright/test';
import { AMBIENT_POSE } from '../src/galaxy/ambient';
import { Lamp, trackIndex } from '../src/timeline/netTrack';
import { defaultSceneState, mergeState } from '../src/timeline/sceneState';
import { beatMiddles, canvasShot, openStage, readSpans, settle, targetScrollY } from './helpers';

// Named stills of the galaxy for human review (the plan's Close-out B): `npm run stills` writes
// shots/galaxy/<tag>-<name>-<w>x<h>.png for every row of STILLS, at the phone size first and then
// the desktop. Each row is a query on the stage page (`?test=1` is added). Skipped unless SHOTS=1.
// `-g beats` writes every Act II beat at the middle of its hold, beats-<id>-<w>x<h>.png. STILLS_DIR
// writes them all to another folder (the vertex task's baselines: e2e/vertexCost.spec.ts).

test.skip(process.env.SHOTS !== '1', 'set SHOTS=1 (npm run stills) to capture the galaxy stills');
test.setTimeout(600_000);

/** Where the stills go: shots/galaxy/, or STILLS_DIR. */
const DIR = process.env.STILLS_DIR ?? 'shots/galaxy';

interface Still {
  tag: string;
  name: string;
  query: string;
  /** An essay frame instead of a probe: the section-local point the query scrolls to (`&p=`). */
  at?: { section: string; local: number };
  /** Drawn under prefers-reduced-motion. */
  reduced?: boolean;
}

const grown = (extra: Record<string, unknown> = {}) => encodeURIComponent(JSON.stringify({ net: { show: 1, growth: 1, ...extra } }));
const shot = (name: string, state = grown(), ambient?: number) =>
  `&mech=bike&shot=${name}&state=${state}${ambient === undefined ? '' : `&ambient=${ambient}`}`;
/** Act I's bike, assembled, at shots.spec.ts's three-quarter view (its mech-bike-assembled). */
const BIKE = mergeState(mergeState(defaultSceneState(), { camera: { pos: [1.6, 1.1, 2.4], target: [0, 0, 0], fov: 40, coreFocus: 0 } }), { mech: { assembly: 1, drive: 0.3 } });

/** Every named still, by task. */
const STILLS: Still[] = [
  { tag: 'T5', name: 'galaxy-wide', query: shot('galaxyWide') },
  { tag: 'T5', name: 'hood', query: shot('hood') },
  { tag: 'T5', name: 'core', query: shot('core') },
  { tag: 'T5', name: 'system', query: shot('system') },
  { tag: 'T5', name: 'twelve', query: shot('twelve') },
  { tag: 'T5', name: 'close', query: shot('close') },
  // The twelve under lamp 5 on R0, at the ambient the twelve test uses (galaxy.spec.ts TWELVE_AMBIENT).
  { tag: 'T6', name: 'twelve', query: shot('twelve', grown({ growth: 0.35, highlight: 0.25, fix: 0.1, lamp: Lamp.Lineage, lampAt: trackIndex({ body: 'R0' }) }), 135) },
  // C1 at the pose (its burst; the scatter the freeze forces there is Task 12's), and healed.
  { tag: 'T6', name: 'close-pose', query: shot('close', grown(), AMBIENT_POSE) },
  { tag: 'T6', name: 'close-fixed', query: shot('close', grown({ fix: 0.1 }), AMBIENT_POSE) },
  { tag: 'T6', name: 'hood-lit', query: shot('hood', grown({ highlight: 0.3 })) },
  { tag: 'T6', name: 'system-streams', query: shot('system', grown({ streams: 1 })) },
  { tag: 'T6', name: 'system-nostreams', query: shot('system', grown({ streams: 0 })) },
  // The tracking camera: C1 in the same place at ambient 0 and 7 (its derps move it, the frame does
  // not), and the neighbourhood at the pose test mode stops the ambient at.
  { tag: 'T7', name: 'close-a0', query: shot('close', grown(), 0) },
  { tag: 'T7', name: 'close-a7', query: shot('close', grown(), 7) },
  { tag: 'T7', name: 'hood-pose', query: shot('hood') },
  // The cut-over: the zoom-out as the essay draws it, at the pose: the bike contracting into its
  // planet and seven moons, then the pull out through its star's system and the neighbourhood to the
  // galaxy with its core.
  ...[0, 0.12, 0.25, 0.4, 0.55, 0.75, 1].map((local) => ({ tag: 'T8', name: `zo-${local.toFixed(2)}`, query: '&mech=bike', at: { section: 'zoom-out', local } })),
  // Layers and far keyed (Task 9): each beat at the middle of its hold, from where it is full ink to
  // where the next line or page starts to come (layers' fade 0.1 screens, far's 0.0625). Layers is
  // 4.3 screens since the author deleted ly-6, so its places are screens over 4.3: 0.45, 1.35, 2.35,
  // 3.25, 2.925, 3.45 and 3.95.
  ...(
    [
      ['ly-1', 'layers', 0.45 / 4.3],
      ['ly-2', 'layers', 1.35 / 4.3],
      ['ly-3', 'layers', 2.35 / 4.3],
      ['ly-4', 'layers', 3.25 / 4.3],
      // ly-4 rides out along the arm (fix round 1): as it sets off and once it is there.
      ['ly-4-start', 'layers', 2.925 / 4.3],
      ['ly-4-end', 'layers', 3.45 / 4.3],
      // The section's last line (ly-6 is deleted): the middle of its hold, 3.7 to 4.2.
      ['ly-5', 'layers', 3.95 / 4.3],
      ['fr-1', 'far', 0.53125],
    ] as const
  ).map(([name, section, local]) => ({ tag: 'T9', name, query: '&mech=bike', at: { section, local } })),
  // Defect and spread keyed (Task 10), each beat at the middle of its hold as the shot pass sampled it:
  // df-1 half way through the push-in, df-2 and df-2b on the held close, df-5 the twelve, up-1 on R1,
  // up-2 the neighbourhood (spread is 2.808 screens since the author deleted the wordless second fix:
  // up-1 at 0.756 screens, up-2 at 2.124, the middle of its hold; the second fix's still is retired).
  ...(
    [
      ['df-1', 'defect', 0.13],
      ['df-2', 'defect', 0.31],
      ['df-2b', 'defect', 0.42],
      ['df-5', 'defect', 0.9],
      ['up-1', 'spread', 0.756 / 2.808],
      // The move from up-1 to up-2 over the page turn (1.34-1.54 screens), at its middle.
      ['up-1-to-up-2', 'spread', 1.44 / 2.808],
      ['up-2', 'spread', 2.124 / 2.808],
    ] as const
  ).map(([name, section, local]) => ({ tag: 'T10', name, query: '&mech=bike', at: { section, local } })),
  // Reviewer to lesson keyed (Task 11), each beat at the middle of its hold (tr-2 at its close and at its
  // surge; re-3 also at 101 s, so the feed's dots can be seen to flow between the two).
  ...(
    [
      ['re-1', 'reviewer', 0.22],
      ['re-2', 'reviewer', 0.51],
      ['re-3', 'reviewer', 0.88],
      ['tr-1', 'trace', 0.21],
      ['tr-2-close', 'trace', 0.53],
      ['tr-2-surge', 'trace', 0.84],
      ['fx-1', 'fix', 0.08],
      ['fx-2', 'fix', 0.33],
      ['fx-3', 'fix', 0.55],
      ['fx-4', 'fix', 0.81],
      ['ls-1', 'lesson', 0.5],
    ] as const
  ).map(([name, section, local]) => ({ tag: 'T11', name, query: '&mech=bike', at: { section, local } })),
  { tag: 'T11', name: 're-3-a101', query: '&mech=bike&ambient=101', at: { section: 'reviewer', local: 0.88 } },
  // The freeze frame (Task 12), through the defect's close-up as the mock's strip has it: live before the
  // cut, the cut (its flash is off in test mode), the dressing coming in, dressed, held, the bursts
  // part-way retracted (v 0.26), the fix landing, the release and the mended rest; and the held frame under reduced motion (the stage emulates it).
  ...(
    [
      ['0.250-live', 0.25],
      ['0.261-cut', 0.261],
      ['0.272', 0.272],
      ['0.292-dressed', 0.292],
      ['0.330-held', 0.33],
      ['0.390-retracting', 0.39],
      ['0.395-fix', 0.395],
      ['0.413-release', 0.413],
      ['0.437-mended', 0.437],
    ] as const
  ).map(([name, local]) => ({ tag: 'T12', name, query: '&mech=bike', at: { section: 'defect', local } })),
  { tag: 'T12', name: '0.330-reduced', query: '&mech=bike', at: { section: 'defect', local: 0.33 }, reduced: true },
  // The re-skin's Task 1a (re-skin §4.1, §5): today's spiral with the warm sprite tint, and the haze up
  // only at the galaxy wides (the probe's galaxy wide and fr-1), not at zo-0.75 (it comes up from
  // zoom-out 0.93), ly-3, ls-1 or up-2. Each essay frame at its earlier still's place.
  { tag: 'R1a', name: 'galaxy-wide', query: shot('galaxyWide') },
  ...(
    [
      ['zo-0.75', 'zoom-out', 0.75],
      ['fr-1', 'far', 0.53125],
      ['ly-3', 'layers', 2.35 / 4.3],
      ['ls-1', 'lesson', 0.5],
      ['up-2', 'spread', 2.124 / 2.808],
    ] as const
  ).map(([name, section, local]) => ({ tag: 'R1a', name, query: '&mech=bike', at: { section, local } })),
  // The re-skin's Task 2 (re-skin §4.3): the stars as self-lit dot clouds with spikes, white to amber,
  // on today's spiral. The hood probe, and each essay frame at its earlier still's place (df-3 on the
  // pulled-back three, before the twelve light).
  { tag: 'R2', name: 'hood', query: shot('hood') },
  ...(
    [
      ['ly-1', 'layers', 0.45 / 4.3],
      ['ly-5', 'layers', 3.95 / 4.3],
      ['df-3', 'defect', 0.52],
      ['df-5', 'defect', 0.9],
      ['up-2', 'spread', 2.124 / 2.808],
    ] as const
  ).map(([name, section, local]) => ({ tag: 'R2', name, query: '&mech=bike', at: { section, local } })),
  // The re-skin's Task 1b (re-skin §4.1): the background as the tuner's RECOMMENDED spiral, at the
  // frames R1a took on today's spiral, to compare with the tuner's Recommended view.
  { tag: 'R1b', name: 'galaxy-wide', query: shot('galaxyWide') },
  ...(
    [
      ['zo-0.75', 'zoom-out', 0.75],
      ['fr-1', 'far', 0.53125],
      ['ly-3', 'layers', 2.35 / 4.3],
      ['ls-1', 'lesson', 0.5],
      ['up-2', 'spread', 2.124 / 2.808],
    ] as const
  ).map(([name, section, local]) => ({ tag: 'R1b', name, query: '&mech=bike', at: { section, local } })),
  // The re-skin's Task 3 (one triangle per dot, re-skin §7): the frames its before-and-after pair is
  // looked at in, the galaxy's and the bike's (Act I's motes are triangles too).
  { tag: 'R3', name: 'hood', query: shot('hood') },
  ...(
    [
      ['ly-1', 'layers', 0.45 / 4.3],
      ['fr-1', 'far', 0.53125],
      ['df-2', 'defect', 0.31],
      ['zo-0.12', 'zoom-out', 0.12],
    ] as const
  ).map(([name, section, local]) => ({ tag: 'R3', name, query: '&mech=bike', at: { section, local } })),
  { tag: 'R3', name: 'bike', query: `&mech=bike&state=${encodeURIComponent(JSON.stringify(BIKE))}` },
  // The re-skin's Task 1c (re-skin §4.1): the tuner's Wisps (reviewed) background, and the neighbourhood
  // dissolving into it from afar (Dissolve, late): the galaxy wide (to compare with the tuner at "Wisps
  // (reviewed) · Dissolve (late)"), fr-1 and zo-0.75 (its far form), the hood probe (its real form), and
  // ly-3 and ls-1, the beats lamped on it (ly-3's stars stand mid-band on a phone; both held whole by
  // net.hoodHold under the provisional ruling).
  { tag: 'R1c', name: 'galaxy-wide', query: shot('galaxyWide') },
  { tag: 'R1c', name: 'hood', query: shot('hood') },
  ...(
    [
      ['fr-1', 'far', 0.53125],
      ['zo-0.75', 'zoom-out', 0.75],
      ['ly-3', 'layers', 2.35 / 4.3],
      ['ls-1', 'lesson', 0.5],
    ] as const
  ).map(([name, section, local]) => ({ tag: 'R1c', name, query: '&mech=bike', at: { section, local } })),
  // The re-skin's Task 1d: the wider neighbourhood (two systems' stars at least 1.5 × their outer radii
  // apart), at the hood probe and the two beats that look down on the core with the stars round it; and
  // the framings it re-fitted: the galaxy wide (953 on a desktop), the twelve, ly-4's ride re-aimed (as it
  // sets off and once it is there) and tr-1, held whole.
  { tag: 'R1d', name: 'hood', query: shot('hood') },
  { tag: 'R1d', name: 'galaxy-wide', query: shot('galaxyWide') },
  { tag: 'R1d', name: 'twelve', query: shot('twelve') },
  ...(
    [
      ['ly-3', 'layers', 2.35 / 4.3],
      ['ls-1', 'lesson', 0.5],
      ['ly-4-start', 'layers', 2.925 / 4.3],
      ['ly-4-end', 'layers', 3.45 / 4.3],
      ['tr-1', 'trace', 0.2],
    ] as const
  ).map(([name, section, local]) => ({ tag: 'R1d', name, query: '&mech=bike', at: { section, local } })),
  // Task 1d's fix round 1: ly-4 as a strip (the ride's start and middle, the push-in on star-4, the hold
  // with planet-10 landed beside it) and ly-5 as it sets off, its lamp back on P_a.
  ...(
    [
      ['ly-4-ride-start', 'layers', 2.925 / 4.3],
      ['ly-4-ride-mid', 'layers', 3.1 / 4.3],
      ['ly-4-push', 'layers', 3.35 / 4.3],
      ['ly-4-hold', 'layers', 3.45 / 4.3],
      ['ly-5-start', 'layers', 3.55 / 4.3],
    ] as const
  ).map(([name, section, local]) => ({ tag: 'R1dfix', name, query: '&mech=bike', at: { section, local } })),
];

/** Phone first (the essay's first reader), then the desktop. */
const SIZES = [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
] as const;

for (const tag of [...new Set(STILLS.map((s) => s.tag))]) {
  test(`${tag} stills, phone first`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    mkdirSync(DIR, { recursive: true });
    for (const size of SIZES) {
      await page.setViewportSize(size);
      for (const still of STILLS.filter((s) => s.tag === tag)) {
        let query = still.query;
        if (still.at) {
          await openStage(page, '&mech=bike&n=500');
          const span = (await readSpans(page)).find((x) => x.id === still.at!.section)!;
          query += `&p=${span.start + still.at.local * (span.end - span.start)}`;
        }
        await page.emulateMedia({ reducedMotion: still.reduced ? 'reduce' : 'no-preference' });
        await openStage(page, query);
        await canvasShot(page, `${DIR}/${still.tag}-${still.name}-${size.width}x${size.height}.png`);
      }
    }
    if (errors.length > 0) throw new Error(`page errors: ${errors.join('; ')}`);
  });
}

/** The first of Act II's sections: from here on, every beat is the galaxy's. */
const ACT_TWO_FROM = 'zoom-out';
/** Act II's beats, zo-1 to ls-1. */
const ACT_TWO_BEATS = 26;

test('Act II beats, phone first', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  mkdirSync(DIR, { recursive: true });
  for (const size of SIZES) {
    await page.setViewportSize(size);
    await openStage(page, '&mech=bike');
    const spans = await readSpans(page);
    const from = spans.findIndex((s) => s.id === ACT_TWO_FROM);
    const beats = (await beatMiddles(page)).flatMap((section, i) => (i < from ? [] : section.map((b) => ({ ...b, span: spans[i] }))));
    if (beats.length !== ACT_TWO_BEATS) throw new Error(`Act II has ${beats.length} beats, not ${ACT_TWO_BEATS}`);
    for (const { id, local, span } of beats) {
      const p = span.start + local * (span.end - span.start);
      await page.evaluate((y) => window.scrollTo(0, y), await targetScrollY(page, p));
      await settle(page);
      await canvasShot(page, `${DIR}/beats-${id}-${size.width}x${size.height}.png`);
    }
  }
  if (errors.length > 0) throw new Error(`page errors: ${errors.join('; ')}`);
});
