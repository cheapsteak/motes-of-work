import { describe, expect, it } from 'vitest';
import { mechanisms } from '../mechanisms';
import { sectionSpans } from '../scroll/progress';
import { briefThresholds, parsePartList } from '../story/brief';
import { loadStory } from '../story/loader';
import { fadeWidth, storyLooks } from '../story/reveal';
import { KeyframeSampler, type KeyframeFile } from '../timeline/keyframeSampler';
import keyframes from '../timeline/keyframes.json';
import type { SceneState } from '../timeline/sceneState';
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

/**
 * The stops where a track is still moving, by design, each with why. Everything else is at rest.
 * - drive: the bike rides on under its lines (it is the machine's own clock), and in the rewind it
 *   runs backwards to the very end of the section.
 * - camera, at vb-2, rv-2 and rw-1: the move into the next shot eases home just as the page turns
 *   (within a few hundredths of a machine radius of where it lands).
 * - camera and ink at sp-1: the sheet slides in and the pen starts under the next line, which is
 *   about the drawing.
 * - ink at sp-4: the gold ring is fading out as the page turns.
 */
const STILL_MOVING: Record<string, string[]> = {
  'vb-2': ['camera'],
  'vb-4': ['drive'],
  'rv-1': ['drive'],
  'rv-2': ['drive', 'camera'],
  'rv-3': ['drive'],
  'rv-4': ['drive'],
  'rw-1': ['drive', 'camera'],
  'sp-1': ['camera', 'ink'],
  'sp-4': ['ink'],
  'sp-8': ['drive'],
};

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
    expect(stops.filter((s) => s.ends === 'motion').map((s) => s.id)).toEqual(['vb-4']);
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

  it('holds each brief line until its parts have landed and it is ticked', () => {
    const brief = story.flatMap((s) => s.pages.flatMap((p) => p.beats)).find((b) => b.document);
    if (!brief) throw new Error('no document beat');
    const parts = [...brief.html.matchAll(/data-parts="([^"]*)"/g)].map((m) => ({ parts: parsePartList(m[1]) }));
    expect(parts).toHaveLength(brief.lines.length);
    const thresholds = briefThresholds(parts, mechanisms.bike);
    thresholds.forEach((t, li) => {
      const stop = stops.find((s) => s.id === `${brief.id}[${li + 1}]`);
      expect(sampler.sample(stop?.progress ?? 0).mech.assembly, `line ${li + 1}`).toBeGreaterThanOrEqual(t);
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
  const still = () => [0];
  const stopsOf = (s: StopShape[], motion = still) => autoStops(s, sectionSpans(s.map((x, i) => ({ id: `${i}`, ...x }))), motion);
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

  it('keeps to its text when the motion never comes to rest before the next line', () => {
    const forever = (p: number) => [10 * p];
    const s = stopsOf(shape(0.5), forever);
    expect(s[0]).toMatchObject({ ends: 'text' });
    expect(s[0].progress).toBeCloseTo(0.5 - fadeWidth(2) - margin, 12);
  });
});

