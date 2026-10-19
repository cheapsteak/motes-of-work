import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { test, type Page } from '@playwright/test';
import { PNG } from 'pngjs';
import { MOTE_BUDGET_DESKTOP, MOTE_SEED } from '../src/config';
import { AMBIENT_POSE } from '../src/galaxy/ambient';
import { starMass } from '../src/galaxy/body';
import { galaxyBudget, generateGalaxy, systemOuter } from '../src/galaxy/generate';
import { mechanisms } from '../src/mechanisms';
import { mechanismAnchors } from '../src/mechanisms/anchors';
import { packBodyData } from '../src/scene/node/bodyData';
import { LEAK } from '../src/scene/node/birth';
import { dropoutEvent } from '../src/scene/node/dropout';
import { bodyGalactic, galacticToWorld } from '../src/scene/node/orbit';
import { galaxyShotKeys } from '../src/timeline/netShots';
import { Lamp, trackIndex } from '../src/timeline/netTrack';
import { defaultSceneState, mergeState } from '../src/timeline/sceneState';
import type { SectionSpan } from '../src/scroll/progress';
import { beatMiddles, canvasShot, openStage, readSpans, settle, targetScrollY } from './helpers';
import { blank, grid, GUTTER, row, stack, toHeight } from './sheet';

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

/**
 * The binary nearest the neighbourhood's middle, close (re-skin Task 1e), at ambient `t`: P_a's system
 * shot's bearing, elevation and field (2.7 × the pair's reach), on the barycentre, lamped on the
 * neighbourhood, everything built. The probe shots frame no pair, so the camera keys ride the
 * neighbourhood's middle, offset onto the barycentre at `t`; drawn at ls-1's place (the galaxy alone).
 */
function pairClose(t: number): string {
  const g = generateGalaxy(MOTE_SEED, 'phone', galaxyBudget(MOTE_BUDGET_DESKTOP));
  const data = packBodyData(g);
  const c = g.hoodCentroid;
  const bary = g.bodies.filter((b) => b.kind === 'bary').sort((a, b) => Math.hypot(a.spot![0] - c[0], a.spot![2] - c[2]) - Math.hypot(b.spot![0] - c[0], b.spot![2] - c[2]))[0];
  const stars = g.bodies.filter((b) => b.kind === 'star' && b.host === bary.index);
  // The stars' mass-weighted middle at t: the barycentre (its spot).
  const m = stars.map((b) => starMass(b.look!.brightness));
  const at = stars.map((b) => bodyGalactic(data, b.index, t));
  const mid = [0, 1, 2].map((k) => (m[0] * at[0][k] + m[1] * at[1][k]) / (m[0] + m[1]));
  const [w, h] = [galacticToWorld(data, mid, t), galacticToWorld(data, c, t)];
  const { radius } = mechanismAnchors(mechanisms.bike).whole;
  const off = [0, 1, 2].map((k) => (w[k] - h[k]) / radius);
  const keys = galaxyShotKeys({ target: { hood: true }, bearing: -10, elevation: 72, distance: Math.round(2.7 * systemOuter(g, bary.index)), fov: 40, frame: 0, lamp: Lamp.Hood }, g);
  const shift = (v: readonly number[]) => v.map((x, k) => x + off[k]);
  const camera = { ...keys, pos: shift(keys.pos), target: shift(keys.target), landscape: { ...keys.landscape, pos: shift(keys.landscape.pos), mix: 0 } };
  const net = { show: 1, growth: 1, lamp: Lamp.Hood, lampAt: trackIndex({ hood: true }), streams: 0, feed: 0, haze: 0 };
  return `&mech=bike&ambient=${t}&state=${encodeURIComponent(JSON.stringify({ camera, net }))}`;
}

/** R8b's dropout frame: the first from 101 s (re-skin Task 8b). */
const DROPOUT_AT = firstDropout(101);

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
  // cut, the cut (its flash is off in test mode), the dressing coming in, dressed, held, the fix's gold
  // landing, the piece glowing, the bursts part-way retracted as it mends (v 0.26), near mended (the
  // author on v25: lands, then glows, then mends), the release and the mended rest; and the held frame
  // under reduced motion (the stage emulates it).
  ...(
    [
      ['0.250-live', 0.25],
      ['0.261-cut', 0.261],
      ['0.272', 0.272],
      ['0.292-dressed', 0.292],
      ['0.330-held', 0.33],
      ['0.367-landing', 0.367],
      ['0.381-glowing', 0.381],
      ['0.399-retracting', 0.3987],
      ['0.401-fix', 0.4013],
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
  // The re-skin's Task 1e: the close pairs as S-type binaries, at the hood probe and the two beats that
  // look down on the stars round the core; and the pair nearest the middle close, at the pose and 120 s
  // on (its stars go round their barycentre, which stays put).
  { tag: 'R1e', name: 'hood', query: shot('hood') },
  ...(
    [
      ['ly-3', 'layers', 2.35 / 4.3],
      ['ls-1', 'lesson', 0.5],
    ] as const
  ).map(([name, section, local]) => ({ tag: 'R1e', name, query: '&mech=bike', at: { section, local } })),
  // (Built only when the stills are shot: the pair's framing generates the galaxy.)
  ...(process.env.SHOTS === '1'
    ? (
        [
          ['pair-a0', AMBIENT_POSE],
          ['pair-a120', AMBIENT_POSE + 120],
        ] as const
      ).map(([name, t]) => ({ tag: 'R1e', name, query: pairClose(t), at: { section: 'lesson', local: 0.5 } }))
    : []),
  // ly-5's opening swing (Move pan): P_a sliding in at 3.52, settled on it at 3.55.
  ...(
    [
      ['ly-5-swing', 'layers', 3.52 / 4.3],
      ['ly-5-settled', 'layers', 3.55 / 4.3],
    ] as const
  ).map(([name, section, local]) => ({ tag: 'R1e', name, query: '&mech=bike', at: { section, local } })),
  // The re-skin's Task 5 (re-skin §4.2, §8): the black hole drawn at the centre in place of the core's six
  // bodies: its close shots (ly-2, up-1, tr-2, fx-2: HOLE_CLOSE), the beats that see it small among the
  // stars (ly-3, up-2, re-3, tr-1, ls-1) and the galaxy wide (fr-1), each at its earlier still's place.
  ...(
    [
      ['ly-2', 'layers', 1.35 / 4.3],
      ['ly-3', 'layers', 2.35 / 4.3],
      ['up-1', 'spread', 0.756 / 2.808],
      ['up-2', 'spread', 2.124 / 2.808],
      ['re-3', 'reviewer', 0.88],
      ['tr-1', 'trace', 0.21],
      ['tr-2', 'trace', 0.53],
      ['fx-2', 'fix', 0.33],
      ['ls-1', 'lesson', 0.5],
      ['fr-1', 'far', 0.53125],
    ] as const
  ).map(([name, section, local]) => ({ tag: 'R5', name, query: '&mech=bike', at: { section, local } })),
  // The re-skin's Task 8b (the defect inspector's variant 18): df-1's close shot before the cut, at a
  // wound's peak (C1's forced slot 45: its wounds open at 98.60 and 98.90 s) and at a dropout frame (the
  // first from 101 s); and df-2 held, which the leak and the dropout leave as the freeze has it.
  ...(
    [
      ['df-1-wound-peak', 0.22, 99.45],
      ['df-1-dropout', 0.22, DROPOUT_AT],
      ['df-2-held', 0.31, undefined],
    ] as const
  ).map(([name, local, ambient]) => ({ tag: 'R8b', name, query: `&mech=bike${ambient === undefined ? '' : `&ambient=${ambient}`}`, at: { section: 'defect', local } })),
  // The re-skin's Task 6, the story on the hole: ly-2 under the hole's lamp; up-1 as the in-fall falls in
  // (0.4 and 0.7 screens into spread) and at its stop (R1's strand whole, the knots ember); up-2, re-3 and
  // tr-1 seeing it small; tr-2 heated and singled out (the end of its hold on the hole, trace 0.57: its
  // auto-advance stop is after the surge, 0.972); fx-1 cooling R0's strand, fx-2 R1's, fx-3 stopping the
  // knots, and fx-4's sweep.
  ...(
    [
      ['ly-2', 'layers', 1.35 / 4.3],
      ['up-1-spread0.4', 'spread', 0.4 / 2.808],
      ['up-1-spread0.7', 'spread', 0.7 / 2.808],
      ['up-1-stop', 'spread', 0.4779],
      ['up-2', 'spread', 2.124 / 2.808],
      ['re-3', 'reviewer', 0.88],
      ['tr-1', 'trace', 0.21],
      ['tr-2-stop', 'trace', 0.57],
      ['fx-1-0.13', 'fix', 0.13],
      ['fx-2-0.31', 'fix', 0.31],
      ['fx-3-0.43', 'fix', 0.43],
      ['fx-4', 'fix', 0.82],
    ] as const
  ).map(([name, section, local]) => ({ tag: 'R6', name, query: '&mech=bike', at: { section, local } })),
  // The re-skin's Task 8 (re-skin §4.5): the freeze frame to its mock. Live before the cut, dressed, held
  // (the copies added, C1 cyan, its fill halved while the hold has its scatter out), the bursts part-way
  // retracted, the release (the hold let go, the dressing fading, the mended piece whole) and the mended rest.
  ...(
    [
      ['0.250-live', 0.25],
      ['0.292-dressed', 0.292],
      ['0.330-held', 0.33],
      ['0.399-retracting', 0.3987],
      ['0.413-release', 0.413],
      ['0.437-mended', 0.437],
    ] as const
  ).map(([name, local]) => ({ tag: 'R8', name, query: '&mech=bike', at: { section: 'defect', local } })),
  // The re-skin's Task 7 (re-skin §4.4): the planets and moons lit from their own star, cool and tinted
  // by it, glowing only when lit. N0 and its moons as the zoom-out pulls out (zo-0.25), P_a's system
  // (ly-1), ly-4's hold, C1 at df-1 (and leaking: Task 8b's motion under the shading), the live close
  // before the freeze's cut (df-2-live), the twelve lit (df-5) and the mended neighbourhood (fx-3).
  ...(
    [
      ['zo-0.25', 'zoom-out', 0.25, undefined],
      ['ly-1', 'layers', 0.45 / 4.3, undefined],
      ['ly-4', 'layers', 3.45 / 4.3, undefined],
      ['df-1', 'defect', 0.13, undefined],
      ['df-1-leak', 'defect', 0.22, 99.45],
      ['df-2-live', 'defect', 0.25, undefined],
      ['df-5', 'defect', 0.9, undefined],
      ['fx-3', 'fix', 0.55, undefined],
    ] as const
  ).map(([name, section, local, ambient]) => ({ tag: 'R7', name, query: `&mech=bike${ambient === undefined ? '' : `&ambient=${ambient}`}`, at: { section, local } })),
  // And the look check's other framings the planets are in: ly-3 (the hood), ly-5's swing onto the
  // first plan, the zoom-out's hand-over (zo-0.84) and the binary pair close.
  ...(
    [
      ['ly-3', 'layers', 2.35 / 4.3],
      ['ly-5-swing', 'layers', 3.52 / 4.3],
      ['zo-0.84', 'zoom-out', 0.84],
    ] as const
  ).map(([name, section, local]) => ({ tag: 'R7', name, query: '&mech=bike', at: { section, local } })),
  ...(process.env.SHOTS === '1' ? [{ tag: 'R7', name: 'pair-a0', query: pairClose(AMBIENT_POSE), at: { section: 'lesson', local: 0.5 } }] : []),
  // The re-skin's Task 7b (re-skin §4.7): the plan's schematic. The hood probe (H) and P_a's system
  // shot (R, healthy); the beats at their earlier stills' places: ly-3 and up-2 (the neighbourhood under
  // s_px 30: nothing marked), ly-4 (H along the arm), df-1 and df-2 held (R on the defect), df-5 (the
  // twelve's departures ember) and fx-4; and the zoom-out's middle of R (P_a at 154 px, zoom-out 0.62),
  // with a strip of the pull from P_a's star coming up to the last of H (zoom-out 0.54 to 0.78).
  { tag: 'R7b', name: 'hood', query: shot('hood') },
  { tag: 'R7b', name: 'system', query: shot('system') },
  ...(
    [
      ['ly-3', 'layers', 2.35 / 4.3],
      ['ly-4', 'layers', 3.25 / 4.3],
      ['df-1', 'defect', 0.13],
      ['df-2', 'defect', 0.31],
      ['df-5', 'defect', 0.9],
      ['up-2', 'spread', 2.124 / 2.808],
      ['fx-4', 'fix', 0.82],
      ['zo-0.62', 'zoom-out', 0.62],
      ...[0.54, 0.58, 0.62, 0.66, 0.7, 0.74, 0.78].map((l) => [`zoom-strip-${l.toFixed(2)}`, 'zoom-out', l] as const),
    ] as const
  ).map(([name, section, local]) => ({ tag: 'R7b', name, query: '&mech=bike', at: { section, local } })),
];

/** The first frame from 101 s with the dropout's lines up (re-skin Task 8b), on a whole frame of the ambient. */
function firstDropout(from: number): number {
  let f = Math.ceil(from * LEAK.fps);
  while (dropoutEvent(f / LEAK.fps) === null) f++;
  return f / LEAK.fps;
}

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

// The re-skin's Task 8b: 10 s of df-1 (defect 0.22) at 30 fps from 101 s, on a phone, one still per frame
// (R8b-strip/f000.png ...): the scatter in every slot, its wounds leaking and snapping home, the lines.
test('R8b df-1 strip, phone', async ({ page }) => {
  // Measured: about 6 s a frame (the whole stage drawn and shot) on a loaded machine; 300 frames.
  test.setTimeout(3 * 3_600_000);
  await page.setViewportSize(SIZES[0]);
  mkdirSync(`${DIR}/R8b-strip`, { recursive: true });
  await openStage(page, '&mech=bike&n=500');
  const span = (await readSpans(page)).find((x) => x.id === 'defect')!;
  await openStage(page, `&mech=bike&p=${span.start + 0.22 * (span.end - span.start)}`);
  for (let f = 0; f < 10 * LEAK.fps; f++) {
    await page.evaluate((t) => (window as unknown as { __motes: { holdAmbient(t: number): void } }).__motes.holdAmbient(t), 101 + f / LEAK.fps);
    await settle(page);
    await canvasShot(page, `${DIR}/R8b-strip/f${String(f).padStart(3, '0')}.png`);
  }
});

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

// ---- The re-skin's Task 9: the contact sheet and the look sheet, for the author ----

/** A frame of a sheet: a stage query, scrolled to a section-local place when `at` is given (as STILLS). */
type Frame = Pick<Still, 'query' | 'at'>;
const at = (section: string, local: number, query = '&mech=bike'): Frame => ({ query, at: { section, local } });

/** The frame `f` on the stage at the page's size, canvas only, read with pngjs. */
async function frame(page: Page, spans: SectionSpan[], f: Frame): Promise<PNG> {
  let query = f.query;
  if (f.at) {
    const span = spans.find((x) => x.id === f.at!.section)!;
    query += `&p=${span.start + f.at.local * (span.end - span.start)}`;
  }
  await openStage(page, query);
  return PNG.sync.read(await canvasShot(page));
}

/** The contact sheet's columns. */
const CONTACT_COLUMNS = 5;

test('R9 contact sheet: every Act II beat at its full-ink middle, phone first', async ({ page }) => {
  // 26 beats a size, each opened by deep link and shot: measured 11.5 min for both sizes, one worker, at a
  // load of 3 here; 40 min is over 3x that. Skipped in CI (SHOTS unset), so there is no CI time.
  test.setTimeout(2_400_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  mkdirSync(DIR, { recursive: true });
  let order: string[] = [];
  for (const size of SIZES) {
    await page.setViewportSize(size);
    await openStage(page, '&mech=bike&n=500');
    const spans = await readSpans(page);
    const from = spans.findIndex((s) => s.id === ACT_TWO_FROM);
    const beats = (await beatMiddles(page)).flatMap((section, i) => (i < from ? [] : section.map((b) => ({ ...b, section: spans[i].id }))));
    if (beats.length !== ACT_TWO_BEATS) throw new Error(`Act II has ${beats.length} beats, not ${ACT_TWO_BEATS}`);
    const cells: PNG[] = [];
    for (const b of beats) cells.push(await frame(page, spans, at(b.section, b.local)));
    writeFileSync(`${DIR}/R9-contact-${size.width}x${size.height}.png`, PNG.sync.write(grid(cells, CONTACT_COLUMNS)));
    order = beats.map((b) => b.id);
  }
  // The beat ids in grid order, a line a row (there are no labels in the images).
  const lines: string[] = [];
  for (let i = 0; i < order.length; i += CONTACT_COLUMNS) lines.push(order.slice(i, i + CONTACT_COLUMNS).join('\t'));
  writeFileSync(`${DIR}/R9-contact.txt`, `${lines.join('\n')}\n`);
  if (errors.length > 0) throw new Error(`page errors: ${errors.join('; ')}`);
});

/** Where the decided looks' stills are (the decisions page's "Look check" table). */
const LOOKS_DIR = 'docs/superpowers/plans/2026-10-09-act-2-reskin-looks';
/** The look sheet's row height: a phone frame at half its height. */
const LOOK_HEIGHT = 422;

/**
 * The look sheet's rows: the decisions page's "Look check" table, in its order, each row's essay frames
 * at the framing the table names and its decided still (none for the spikes); and the freeze frame at
 * df-2 against the approved mock's held state (freeze-frame-mock-held-phone.png: docs/mocks/freeze-frame.html
 * at local 0.33, the freeze on, the UI hidden, 390x844), a row the table does not have yet.
 */
function lookRows(): { name: string; still: string | null; frames: Frame[] }[] {
  return [
    { name: 'wisps: fr-1', still: 'galaxy-wisps-reviewed-phone.png', frames: [at('far', 0.53125)] },
    { name: 'dissolve: the galaxy wide, fr-1', still: 'galaxy-hood-dissolve-late-phone.png', frames: [{ query: shot('galaxyWide') }, at('far', 0.53125)] },
    { name: 'dissolve mid: zo 0.80, 0.84, 0.88', still: 'galaxy-hood-dissolve-late-mid-phone.png', frames: [0.8, 0.84, 0.88].map((l) => at('zoom-out', l)) },
    { name: 'spacing (b): the hood probe, ly-3', still: 'binaries-four-options-sheet.png', frames: [{ query: shot('hood') }, at('layers', 2.35 / 4.3)] },
    {
      name: 'S-type pair close, at the pose and 120 s on',
      still: 'binaries-s-type-close-phone.png',
      frames: [AMBIENT_POSE, AMBIENT_POSE + 120].map((t) => ({ query: pairClose(t), at: { section: 'lesson', local: 0.5 } })),
    },
    { name: 'inspector defaults: up-1 stop, tr-2 (trace 0.57)', still: 'black-hole-inspector-defaults-phone.png', frames: [at('spread', 0.4779), at('trace', 0.57)] },
    { name: 'disk motion: ly-2', still: 'disk-motion-recommended.png', frames: [at('layers', 1.35 / 4.3)] },
    { name: 'R close: df-1, df-2', still: 'schematic-close-defect-phone.png', frames: [at('defect', 0.13), at('defect', 0.31)] },
    { name: 'H, the twelve: df-5', still: 'schematic-neighbourhood-twelve-phone.png', frames: [at('defect', 0.9)] },
    {
      name: 'the hand-over: zo 0.58, 0.66, 0.74; df-3 0.455, 0.47',
      still: 'schematic-zoom-handover-strip.png',
      frames: [...[0.58, 0.66, 0.74].map((l) => at('zoom-out', l)), ...[0.455, 0.47].map((l) => at('defect', l))],
    },
    {
      name: 'v18: df-1 at a wound, at a dropout; df-2 held',
      still: 'defect-v18-burst-leak-dropout-strip.png',
      frames: [at('defect', 0.22, '&mech=bike&ambient=99.45'), at('defect', 0.22, `&mech=bike&ambient=${DROPOUT_AT}`), at('defect', 0.31)],
    },
    { name: 'ly-5 opening (B): 3.50, 3.52, 3.55, 3.58', still: 'ly5-opening-compare-phone.png', frames: [3.5, 3.52, 3.55, 3.58].map((l) => at('layers', l / 4.3)) },
    { name: 'fewer, fainter spikes: ly-3, fr-1 (no still)', still: null, frames: [at('layers', 2.35 / 4.3), at('far', 0.53125)] },
    { name: 'the freeze frame: df-2 held (defect 0.33) against the mock held (proposed row)', still: 'freeze-frame-mock-held-phone.png', frames: [at('defect', 0.33)] },
  ];
}

test('R9 look sheet: each look row, the essay beside its decided still, phone', async ({ page }) => {
  // 31 frames: measured 8.5 min (the mock then shot in the test, since a committed still), one worker, at
  // a load of 6-8 here; 30 min is over 3x that. Skipped in CI (SHOTS unset), so there is no CI time.
  test.setTimeout(1_800_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  mkdirSync('shots/look', { recursive: true });
  await page.setViewportSize(SIZES[0]);
  await openStage(page, '&mech=bike&n=500');
  const spans = await readSpans(page);
  const rows: PNG[] = [];
  const names: string[] = [];
  for (const look of lookRows()) {
    const cells: PNG[] = [];
    for (const f of look.frames) cells.push(toHeight(await frame(page, spans, f), LOOK_HEIGHT));
    if (look.still !== null) {
      const still = PNG.sync.read(readFileSync(`${LOOKS_DIR}/${look.still}`));
      // A wider gutter between the essay's frames and the decided still.
      cells.push(blank(4 * GUTTER, 1), toHeight(still, LOOK_HEIGHT));
    }
    rows.push(row(cells));
    names.push(`${look.name}: ${look.still ?? '(no still)'}`);
  }
  writeFileSync('shots/look/R9-look-390x844.png', PNG.sync.write(stack(rows)));
  writeFileSync('shots/look/R9-look.txt', `${names.join('\n')}\n`);
  if (errors.length > 0) throw new Error(`page errors: ${errors.join('; ')}`);
});
