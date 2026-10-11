import { describe, expect, it } from 'vitest';
import { mechanisms } from '../mechanisms';
import { sectionSpans } from '../scroll/progress';
import { briefThresholds, parsePartList } from '../story/brief';
import { loadStory } from '../story/loader';
import { fadeWidth, pageOut, storyLooks } from '../story/reveal';
import { KeyframeSampler, type KeyframeFile } from '../timeline/keyframeSampler';
import keyframes from '../timeline/keyframes.json';
import { defaultSceneState, setPath, type SceneState } from '../timeline/sceneState';
import {
  autoAdvanceSettings,
  autoStops,
  dwellSeconds,
  nextStopAfter,
  REST_EPSILON,
  REST_WINDOW_SCREENS,
  sceneMotion,
  STOP_MARGIN_SCREENS,
  stopScrollY,
  transitFraction,
  transitSeconds,
  type AutoAdvanceSettings,
  type Motion,
  type StopShape,
} from './plan';

const DEFAULTS: AutoAdvanceSettings = {
  enabled: true,
  floorSeconds: 2,
  wordsPerSecond: 3,
  transitScreensPerSecond: 0.6,
  easeSeconds: 0.5,
  startDelaySeconds: 0,
};

const story = loadStory();
const spans = sectionSpans(story);
const sampler = new KeyframeSampler(keyframes as unknown as KeyframeFile, spans);
const stops = autoStops(story, spans, (p) => sceneMotion(sampler.sample(p)));
const screens = story.reduce((n, s) => n + s.length, 0);

/** Every scene in reading order, as the story has it: each beat, and after a document its lines. */
const scenes = story.flatMap((section, si) =>
  section.pages.flatMap((page, pi) =>
    page.beats.flatMap((beat, bi) => [
      { id: beat.id, si, pi, bi, li: -1, at: beat.at },
      ...beat.lines.map((line, li) => ({ id: `${beat.id}[${li + 1}]`, si, pi, bi, li, at: line.at })),
    ]),
  ),
);
const globalAt = (si: number, l: number) => spans[si].start + l * (spans[si].end - spans[si].start);

/** How much of a scene's text is showing at `p`: its page's opacity times its own reveal. */
function textOpacity(scene: (typeof scenes)[number], p: number): number {
  const page = storyLooks(p, spans, story)[scene.si][scene.pi];
  const beat = page.beats[scene.bi];
  return page.opacity * (scene.li < 0 ? beat.reveal : beat.lines[scene.li]);
}

/** The motion tracks the brief names, each as the numbers that move. */
const TRACKS: Record<string, (s: SceneState) => number[]> = {
  assembly: (s) => [s.mech.assembly],
  drive: (s) => [s.mech.drive],
  steer: (s) => [s.mech.steer],
  camera: (s) => [...s.camera.pos, ...s.camera.target, s.camera.fov / 40, s.camera.frame, s.camera.coreFocus, s.camera.focus],
  ink: (s) => [s.ink.opacity, s.ink.drawn, s.ink.redraw, s.ink.flat, s.ink.ring, s.ink.tick, s.sheet.opacity],
  network: (s) => [s.mech.reflow, s.net.show, s.net.highlight, s.net.fix, s.net.review],
};

/** Each track's largest change over the last REST_WINDOW_SCREENS before `p`. */
function lastChange(p: number): Record<string, number> {
  const at = sampler.sample(p);
  const out: Record<string, number> = {};
  for (let k = 1; k <= 40; k++) {
    const before = sampler.sample(p - (REST_WINDOW_SCREENS / screens) * (k / 40));
    for (const [name, values] of Object.entries(TRACKS)) {
      const a = values(at);
      const b = values(before);
      out[name] = Math.max(out[name] ?? 0, ...a.map((v, i) => Math.abs(v - b[i])));
    }
  }
  return out;
}

/** The largest change of any motion value over REST_WINDOW_SCREENS after `p`. */
function lastChangeAfter(p: number): number[] {
  const at = sceneMotion(sampler.sample(p));
  const after = sceneMotion(sampler.sample(p + REST_WINDOW_SCREENS / screens));
  return at.map((v, i) => Math.abs(v - after[i]));
}

/**
 * The stops where a track is still moving by more than REST_EPSILON, by design, each with why.
 * Everything else is at rest. The drive is the machine's own clock: a riding bike's turns on under
 * its lines, slowly enough to be at rest by this measure, save where it runs fastest:
 * - rw-1: the rewind runs the machine backwards to the very end of its section, and the camera pulls
 *   back with it until the next section begins.
 * - sp-8: the rebuilt bike rides off to the essay's end.
 * - camera, at vb-2 and rv-2: the move into the next shot eases home just as the page turns, within
 *   a few hundredths of a machine radius of where it lands.
 * - camera and ink at sp-1: the sheet slides in and the pen starts under the next line, which is
 *   about the drawing.
 * - ink at sp-4: the gold ring is fading out as the page turns.
 * - camera at zo-1 and zo-2: the zoom-out's pull (ruling 12) is one continuous move from 0.40 to the
 *   section's end, log-linear in its distance, so it runs on through both lines and both page turns.
 */
const STILL_MOVING: Record<string, string[]> = {
  'zo-1': ['camera'],
  'zo-2': ['camera'],
  'vb-2': ['camera'],
  'rv-2': ['camera'],
  'rw-1': ['drive', 'camera'],
  'sp-1': ['camera', 'ink'],
  'sp-4': ['ink'],
  'sp-8': ['drive'],
};

/**
 * The brief line whose parts are still landing when the next line comes up: the frame's last tubes
 * land under the mudguards' line (the build overlaps them by design), so its tick comes at the next
 * line's stop.
 */
const TICKED_LATE = new Set([5]);

/**
 * Act II's scenes whose stop sits just before a move (plan.ts: a page-turn move ends its scene at the
 * instant it leaves): the last scene of every layers page, fr-1, the last scene of each defect page
 * (df-2b before the pull-out, df-5 before the follow), up-1 (before the move to up-2), up-2 (before the
 * move into reviewer), re-3 (before the climb), tr-2 (before the move into fix), fx-3 (before fx-4's
 * streams come up over the page turn) and fx-4 (before the move into lesson), whose
 * shots each move on as the page turns (galaxy §14.5).
 */
const BEFORE_A_MOVE = ['ly-1', 'ly-2', 'ly-3', 'ly-4', 'ly-5', 'fr-1', 'df-2b', 'df-5', 'up-1', 'up-2', 're-3', 'tr-2', 'fx-3', 'fx-4'];

describe('autoStops (from the story and the keyframes the essay carries)', () => {
  it('has exactly one stop per scene, a beat or a brief line, in reading order', () => {
    expect(stops.map((s) => s.id)).toEqual(scenes.map((s) => s.id));
    // Not vacuous: the brief's six lines are scenes of their own.
    expect(scenes.filter((s) => s.li >= 0)).toHaveLength(6);
  });

  it('is strictly increasing, and the last scene runs to the end of the essay', () => {
    for (let i = 1; i < stops.length; i++) expect(stops[i].progress).toBeGreaterThan(stops[i - 1].progress);
    expect(stops[stops.length - 1]).toMatchObject({ id: scenes[scenes.length - 1].id, progress: 1 });
  });

  it('puts each stop after its scene has come up and before the next scene comes up', () => {
    scenes.forEach((scene, i) => {
      const stop = stops[i];
      const fade = fadeWidth(story[scene.si].length);
      const opensEssay = i === 0;
      expect(stop.from, scene.id).toBeCloseTo(globalAt(scene.si, scene.at), 12);
      expect(stop.progress, scene.id).toBeGreaterThanOrEqual(globalAt(scene.si, scene.at + (opensEssay ? 0 : fade)));
      const next = scenes[i + 1];
      if (next) expect(stop.progress, scene.id).toBeLessThan(globalAt(next.si, next.at));
    });
  });

  // Retired: "gives the wordless second fix a stretch of its own: up-1 stops before it, up-2 after it".
  // The author deleted the second fix (2026-10-09: redundant), and with it up-1's explicit out; up-1
  // now stops before the move to up-2, as every page-turn move's scene (BEFORE_A_MOVE). The rule for a
  // page with an explicit out is still held, on a made-up story, below.
  it('gives no page of the essay an explicit out', () => {
    expect(story.flatMap((s) => s.pages.filter((p) => p.out !== undefined).map(() => s.id))).toEqual([]);
  });

  it('stops just before the next change of text: the next line coming up or the page turning', () => {
    const margin = STOP_MARGIN_SCREENS / screens;
    scenes.slice(0, -1).forEach((scene, i) => {
      const stop = stops[i];
      if (stop.ends !== 'text') return;
      // Fully up at the stop, and a margin later still (nothing has started to change)...
      expect(textOpacity(scene, stop.progress), scene.id).toBe(1);
      expect(textOpacity(scene, stop.progress + margin * 0.99), scene.id).toBe(1);
      const next = scenes[i + 1];
      const nextUp = (p: number) => textOpacity(next, p);
      expect(nextUp(stop.progress + margin * 0.99), scene.id).toBe(0);
      // ...but past the margin, its own text starts to go or the next starts to come.
      const after = stop.progress + margin * 1.5;
      expect(textOpacity(scene, after) < 1 || nextUp(after) > 0, scene.id).toBe(true);
    });
  });

  it('waits past its text only for the orbit, whose motion outlasts the line', () => {
    expect(stops.filter((s) => s.ends === 'motion').map((s) => s.id)).toEqual(['vb-4', ...BEFORE_A_MOVE]);
    // The rest end 'motion' only in plan.ts's other sense, "just before a motion": a move that leaves
    // as the page turns stops the scene at the instant it leaves, the last point at rest. A move eases
    // out of rest, so that is at most one rest window into the page's fade, never later, and the next
    // text is not yet up.
    for (const id of BEFORE_A_MOVE) {
      const k = stops.findIndex((s) => s.id === id);
      const { si, pi } = scenes[k];
      const fadeStart = globalAt(si, pageOut(story[si].pages, pi) - fadeWidth(story[si].length));
      expect(stops[k].progress, id).toBeGreaterThanOrEqual(fadeStart - STOP_MARGIN_SCREENS / screens - 1e-12);
      expect(stops[k].progress, id).toBeLessThanOrEqual(fadeStart + REST_WINDOW_SCREENS / screens);
      expect(textOpacity(scenes[k + 1], stops[k].progress), id).toBe(0);
    }
    const i = stops.findIndex((s) => s.id === 'vb-4');
    const stop = stops[i];
    // Past where its text has started to fade, and still before the next line comes up.
    expect(textOpacity(scenes[i], stop.progress)).toBeLessThan(1);
    expect(textOpacity(scenes[i + 1], stop.progress)).toBe(0);
    expect(stop.progress).toBeGreaterThan(stops[i - 1].progress);
  });

  it('is at rest at every stop: the motion tracks barely move over the scroll before it, save the documented ones', () => {
    stops.forEach((stop) => {
      const change = lastChange(stop.progress);
      const moving = Object.entries(change)
        .filter(([, v]) => v >= REST_EPSILON)
        .map(([k]) => k);
      expect(moving.sort(), `${stop.id}: ${JSON.stringify(change)}`).toEqual((STILL_MOVING[stop.id] ?? []).sort());
    });
  });

  it('holds each brief line until its parts have landed and it is ticked, save the documented one', () => {
    const brief = story.flatMap((s) => s.pages.flatMap((p) => p.beats)).find((b) => b.document);
    if (!brief) throw new Error('no document beat');
    const parts = [...brief.html.matchAll(/data-parts="([^"]*)"/g)].map((m) => ({ parts: parsePartList(m[1]) }));
    expect(parts).toHaveLength(brief.lines.length);
    const thresholds = briefThresholds(parts, mechanisms.bike);
    thresholds.forEach((t, li) => {
      const at = stops.findIndex((s) => s.id === `${brief.id}[${li + 1}]`);
      const stop = stops[TICKED_LATE.has(li + 1) ? at + 1 : at];
      expect(sampler.sample(stop.progress).mech.assembly, `line ${li + 1}`).toBeGreaterThanOrEqual(t);
      if (TICKED_LATE.has(li + 1)) expect(sampler.sample(stops[at].progress).mech.assembly).toBeLessThan(t);
    });
  });

  it('gives the brief\'s ask the ask\'s words, and each brief line its own', () => {
    const brief = story.flatMap((s) => s.pages.flatMap((p) => p.beats)).find((b) => b.document);
    if (!brief) throw new Error('no document beat');
    const lineWords = brief.lines.reduce((n, l) => n + l.words, 0);
    const ask = stops.find((s) => s.id === brief.id);
    expect(ask?.words).toBe(brief.words - lineWords);
    expect(ask?.words).toBeGreaterThan(0);
    brief.lines.forEach((line, i) => expect(stops.find((s) => s.id === `${brief.id}[${i + 1}]`)?.words).toBe(line.words));
  });
});

describe('autoStops (on a made-up story)', () => {
  const shape = (bAt = 0.5): StopShape[] => [
    {
      length: 2,
      pages: [
        { beats: [{ id: 'a', at: 0, document: false, words: 3, lines: [] }] },
        { beats: [{ id: 'b', at: bAt, document: false, words: 7, lines: [] }] },
      ],
    },
  ];
  const still: Motion = () => [0];
  const stopsOf = (s: StopShape[], motion: Motion = still) => autoStops(s, sectionSpans(s.map((x, i) => ({ id: `${i}`, ...x }))), motion);
  const margin = STOP_MARGIN_SCREENS / 2;

  it('follows the beat data, not fixed positions: a moved beat moves the stop before it', () => {
    const one = stopsOf(shape(0.5));
    const two = stopsOf(shape(0.6));
    expect(one.map((s) => s.id)).toEqual(['a', 'b']);
    // A page turn: a's page starts to fade a fade before b's page comes up.
    expect(one[0].progress).toBeCloseTo(0.5 - fadeWidth(2) - margin, 12);
    expect(two[0].progress).toBeCloseTo(0.6 - fadeWidth(2) - margin, 12);
    expect(one[1].progress).toBe(1);
  });

  it('waits for motion that outlasts the text, to the latest point at rest before the next line', () => {
    // A move of 2 from 0.35 to 0.47: most of it is left when a's page starts to fade (0.45).
    const ramp = (to: number) => (p: number) => [2 * Math.min(1, Math.max(0, (p - 0.35) / (to - 0.35)))];
    const waits = stopsOf(shape(0.5), ramp(0.47));
    expect(waits[0]).toMatchObject({ ends: 'motion' });
    expect(waits[0].progress).toBeCloseTo(0.5 - margin, 3);
    // A move done before the page starts to fade does not hold the stop back.
    const done = stopsOf(shape(0.5), ramp(0.42));
    expect(done[0]).toMatchObject({ ends: 'text' });
    expect(done[0].progress).toBeCloseTo(0.5 - fadeWidth(2) - margin, 12);
  });

  it('never waits past a page with an explicit out: it ends with its text, however long the motion after it', () => {
    // A page that leaves early (`out`) leaves a stretch with no text, made for motion to play in
    // (as spread's deleted second fix had): the stop sits while the page is whole and the motion is crossed
    // in transit, never paused on an empty frame.
    const early: StopShape[] = [
      {
        length: 2,
        pages: [
          { out: 0.3, beats: [{ id: 'a', at: 0, document: false, words: 3, lines: [] }] },
          { beats: [{ id: 'b', at: 0.5, document: false, words: 7, lines: [] }] },
        ],
      },
    ];
    // A move of 2 over 0.32-0.45: it outlasts the text by far and is at rest well before b.
    const move: Motion = (p) => [2 * Math.min(1, Math.max(0, (p - 0.32) / 0.13))];
    const s = stopsOf(early, move);
    expect(s[0]).toMatchObject({ ends: 'text' });
    expect(s[0].progress).toBeCloseTo(0.3 - fadeWidth(2) - margin, 12);
    // The control, without the out: a different motion, at rest before b, holds the stop back to its
    // rest (the waiting rule this test exempts a page with an out from).
    const late = stopsOf(shape(0.5), (p) => [2 * Math.min(1, Math.max(0, (p - 0.42) / 0.04))]);
    expect(late[0]).toMatchObject({ ends: 'motion' });
  });

  it('keeps to its text when the motion never comes to rest before the next line', () => {
    const forever = (p: number) => [10 * p];
    const s = stopsOf(shape(0.5), forever);
    expect(s[0]).toMatchObject({ ends: 'text' });
    expect(s[0].progress).toBeCloseTo(0.5 - fadeWidth(2) - margin, 12);
  });
});

describe('sceneMotion', () => {
  // Act II (docs/specs/2026-10-06-act-2-storyboard-and-network.md §2.11): a stop waits for the
  // reflow and the network's story clocks, not for its running ones (growth and the stream clock,
  // which never hold for long, like the drive).
  it.each([
    'mech.reflow',
    'net.show',
    'net.highlight',
    'net.fix',
    'net.review',
    'net.focus',
    'net.streams',
    'net.feed',
    'camera.track.mix',
    'camera.track.turn',
    // The freeze frame (freeze-frame §1.3): a stop waits for the cut, the dressing and the roll.
    'freeze.hold',
    'freeze.dress',
    'camera.roll',
  ])('moves with %s', (path) => {
    const s = defaultSceneState();
    setPath(s, path, 0.5);
    expect(sceneMotion(s)).not.toEqual(sceneMotion(defaultSceneState()));
  });

  it.each(['net.growth', 'clock', 'mech.drive', 'net.lamp', 'net.lampAt', 'camera.track.a', 'camera.track.b', 'net.haze', 'net.hoodHold'])('does not move with %s', (path) => {
    const s = defaultSceneState();
    setPath(s, path, 0.5);
    expect(sceneMotion(s)).toEqual(sceneMotion(defaultSceneState()));
  });
});

describe('dwellSeconds', () => {
  it('holds at the floor for a short line', () => {
    expect(dwellSeconds(0, DEFAULTS)).toBe(2);
    expect(dwellSeconds(4, DEFAULTS)).toBe(2);
    expect(dwellSeconds(6, DEFAULTS)).toBe(2);
  });

  it('dwells longer on a longer line, at the reading pace', () => {
    expect(dwellSeconds(15, DEFAULTS)).toBe(5);
    expect(dwellSeconds(21, DEFAULTS)).toBeGreaterThan(dwellSeconds(15, DEFAULTS));
  });

  it('follows the floor and the pace it is given', () => {
    expect(dwellSeconds(4, { ...DEFAULTS, floorSeconds: 0.25 })).toBeCloseTo(4 / 3, 12);
    expect(dwellSeconds(4, { ...DEFAULTS, floorSeconds: 0.25, wordsPerSecond: 100 })).toBe(0.25);
  });

  it('gives every stop of the essay at least the floor', () => {
    for (const stop of stops) expect(dwellSeconds(stop.words, DEFAULTS)).toBeGreaterThanOrEqual(2);
  });
});

describe('transit', () => {
  it('takes distance over pace, plus one ease', () => {
    expect(transitSeconds(1.2, DEFAULTS)).toBeCloseTo(1.2 / 0.6 + 0.5, 12);
    expect(transitSeconds(0, DEFAULTS)).toBe(0);
    // Too short to reach the pace: the ease shrinks to fit, so it is never slower than twice the plain time.
    expect(transitSeconds(0.06, DEFAULTS)).toBeCloseTo(0.2, 12);
  });

  it('moves from 0 to 1, monotonic, eased at both ends and steady between', () => {
    const screens = 1.2;
    const total = transitSeconds(screens, DEFAULTS);
    expect(transitFraction(0, screens, DEFAULTS)).toBe(0);
    expect(transitFraction(total, screens, DEFAULTS)).toBe(1);
    expect(transitFraction(total + 1, screens, DEFAULTS)).toBe(1);
    expect(transitFraction(-1, screens, DEFAULTS)).toBe(0);
    let last = 0;
    for (let t = 0; t <= total; t += total / 200) {
      const f = transitFraction(t, screens, DEFAULTS);
      expect(f).toBeGreaterThanOrEqual(last);
      last = f;
    }
    // Speed in screens per second.
    const speed = (t: number) => ((transitFraction(t + 1e-4, screens, DEFAULTS) - transitFraction(t, screens, DEFAULTS)) * screens) / 1e-4;
    expect(speed(0.01)).toBeLessThan(0.05);
    expect(speed(total - 0.011)).toBeLessThan(0.05);
    expect(speed(total / 2)).toBeCloseTo(0.6, 3);
    expect(speed(0.6)).toBeCloseTo(0.6, 3);
  });

  it('jumps straight to the end for a zero distance', () => {
    expect(transitFraction(0, 0, DEFAULTS)).toBe(1);
  });
});

describe('stop positions in pixels', () => {
  it('rounds up, so a stop is never a pixel short of the line being fully up', () => {
    expect(stopScrollY(0.5, 1001)).toBe(501);
    expect(stopScrollY(0, 1000)).toBe(0);
    expect(stopScrollY(1, 1000)).toBe(1000);
    // Float noise on an exact pixel does not push it one further.
    expect(stopScrollY(0.3, 1000)).toBe(300);
  });

  it('finds the next stop strictly after a position', () => {
    const ys = [0, 100, 250, 1000];
    expect(nextStopAfter(ys, 0)).toBe(1);
    expect(nextStopAfter(ys, 50)).toBe(1);
    expect(nextStopAfter(ys, 100)).toBe(2);
    expect(nextStopAfter(ys, 999)).toBe(3);
    expect(nextStopAfter(ys, 1000)).toBe(-1);
  });
});

describe('autoAdvanceSettings', () => {
  const parse = (query: string, testMode = false) => autoAdvanceSettings(new URLSearchParams(query), DEFAULTS, testMode);

  it('is the config as is, with no query', () => {
    expect(parse('')).toEqual({ settings: DEFAULTS, ignored: [] });
  });

  it('?auto=0 disables it, and test mode disables it unless ?auto=1', () => {
    expect(parse('auto=0').settings.enabled).toBe(false);
    expect(parse('', true).settings.enabled).toBe(false);
    expect(parse('auto=1', true).settings.enabled).toBe(true);
    expect(parse('auto=1', false).settings.enabled).toBe(true);
    expect(autoAdvanceSettings(new URLSearchParams('auto=1'), { ...DEFAULTS, enabled: false }, false).settings.enabled).toBe(true);
    expect(autoAdvanceSettings(new URLSearchParams(''), { ...DEFAULTS, enabled: false }, false).settings.enabled).toBe(false);
  });

  it('?dwell=, ?wps= and ?pace= set the floor, the reading pace and the transit pace', () => {
    expect(parse('dwell=0.4&wps=50&pace=3').settings).toEqual({
      ...DEFAULTS,
      floorSeconds: 0.4,
      wordsPerSecond: 50,
      transitScreensPerSecond: 3,
    });
  });

  it('ignores a value that is not a positive number, and says which', () => {
    const { settings, ignored } = parse('dwell=-1&wps=fast&pace=0&auto=maybe');
    expect(settings).toEqual(DEFAULTS);
    expect(ignored).toEqual(['auto=maybe', 'dwell=-1', 'wps=fast', 'pace=0']);
  });
});
