import type { SectionSpan } from '../scroll/progress';
import { fadeWidth } from '../story/reveal';
import type { SceneState } from '../timeline/sceneState';

/**
 * Auto-advance, the pure half: where the essay stops, how long it holds there, how it moves between
 * stops, and the settings from config and the URL. DOM-free; src/autoAdvance/indicator.ts drives it.
 *
 * The essay stops once per scene, at its end. A scene is a beat (a line, or one line of a document
 * such as the brief) and the motion that goes with it, so its stop is the last scroll position at
 * which the beat is fully up and its motion has run: just before the next change of text, which is
 * the next beat coming up or this beat's page fading out, whichever is first. Where a scene's motion
 * outlasts its text (the orbit), the stop waits for it instead: the latest point it is at rest
 * before the next text comes up. The stops follow the story's beat data and the keyframes, so they
 * move with any copy or timing change. The essay's last scene runs to the end, its last stop.
 */

/** How far before the next change of text a stop is, in screens (viewport heights of scroll). */
export const STOP_MARGIN_SCREENS = 0.01;
/** A scene is at rest at a point when no motion value changed by REST_EPSILON over this much scroll before it, in screens. */
export const REST_WINDOW_SCREENS = 0.02;
/** See REST_WINDOW_SCREENS; in the units of `sceneMotion`. */
export const REST_EPSILON = 0.025;
/**
 * A scene's motion outlasts its text when, from where its text starts to fade to where the next text
 * comes up, some motion value still has more than this to go (`sceneMotion` units: a quarter of a
 * machine radius of camera travel, a quarter of the build or of the drawing).
 */
export const OUTLASTS_TEXT = 0.25;
/** The step the stops sample the motion at, in screens. */
const SAMPLE_SCREENS = 0.001;

export interface AutoAdvanceSettings {
  /** Off entirely: no indicator, no motion. */
  enabled: boolean;
  /** The shortest hold at a stop, in seconds. */
  floorSeconds: number;
  /** Reading pace: a stop holds for its words over this, if that is longer than the floor. */
  wordsPerSecond: number;
  /** Cruising speed between stops, in screens (viewport heights) per second. */
  transitScreensPerSecond: number;
  /** How long a transit takes to reach its pace, and to slow from it, in seconds. */
  easeSeconds: number;
  /** Extra hold before the very first stop's dwell, in seconds. */
  startDelaySeconds: number;
}

export interface Stop {
  /** The beat's id; a document line's is `<beat id>[<line number>]`. */
  id: string;
  /** Global scroll progress in [0, 1]. */
  progress: number;
  /** Where the scene's text starts to come up, in global progress (0 for the essay's first line). */
  from: number;
  /** Words the reader reads at this stop: the beat's own (for a document, the line's or the ask's). */
  words: number;
  /** Why the stop is where it is: before the next text, or later than its own text, after its motion. */
  ends: 'text' | 'motion';
}

/** The parts of a story section the stops read (a `StorySection` has them all). */
export interface StopShape {
  length: number;
  pages: readonly {
    beats: readonly {
      id: string;
      at: number;
      document: boolean;
      words: number;
      lines: readonly { at: number; words: number }[];
    }[];
  }[];
}

/** The scene's motion at a progress: numbers a stop waits for to come to rest. */
export type Motion = (progress: number) => readonly number[];

/**
 * The motion a stop waits for, from a scene state: the build (assembly), the steering, the camera
 * (position and target in machine radii, the field of view as a fraction of 40 degrees, its framing
 * and focus) and the ink drawing with its sheet. Not the drive: it is the machine's own running
 * clock, and a riding bike rides on through its lines by design.
 */
export function sceneMotion(s: SceneState): number[] {
  const { camera: c, ink } = s;
  return [
    s.mech.assembly,
    s.mech.steer,
    ...c.pos,
    ...c.target,
    c.fov / 40,
    c.frame,
    c.coreFocus,
    c.focus,
    ink.opacity,
    ink.drawn,
    ink.redraw,
    ink.flat,
    ink.ring,
    ink.tick,
    s.sheet.opacity,
  ];
}

/** The largest change of any motion value between `a` and `b`. */
function moved(a: readonly number[], b: readonly number[]): number {
  return a.reduce((m, v, i) => Math.max(m, Math.abs(v - b[i])), 0);
}

/** The largest change of any motion value over the `window` of progress before `p`. */
function changeBefore(motion: Motion, p: number, window: number, step: number): number {
  const here = motion(p);
  let most = 0;
  for (let q = p - window; q < p; q += step) most = Math.max(most, moved(here, motion(Math.max(0, q))));
  return most;
}

interface Scene {
  id: string;
  /** Where its text starts to come up. */
  from: number;
  /** Where its text is fully up. */
  up: number;
  /** Where its page starts to fade out; 1 for a page that never does (the essay's last). */
  fadeOut: number;
  words: number;
}

/** Every scene in reading order: a beat, or a document's ask and then each of its lines. */
function scenes(story: readonly StopShape[], spans: readonly SectionSpan[]): Scene[] {
  const out: Scene[] = [];
  const lastSection = story.length - 1;
  story.forEach((section, si) => {
    const { start, end } = spans[si];
    const fade = fadeWidth(section.length);
    const global = (l: number) => start + Math.min(1, l) * (end - start);
    const lastPage = section.pages.length - 1;
    section.pages.forEach((page, pi) => {
      const pout = pi < lastPage ? section.pages[pi + 1].beats[0].at : 1;
      const fadeOut = si === lastSection && pi === lastPage ? 1 : global(pout - fade);
      page.beats.forEach((beat, bi) => {
        const opensEssay = si === 0 && pi === 0 && bi === 0;
        const lineWords = beat.lines.reduce((n, line) => n + line.words, 0);
        out.push({
          id: beat.id,
          from: global(beat.at),
          up: global(opensEssay ? beat.at : beat.at + fade),
          fadeOut,
          words: Math.max(0, beat.words - lineWords),
        });
        beat.lines.forEach((line, li) =>
          out.push({
            id: `${beat.id}[${li + 1}]`,
            from: global(line.at),
            up: global(line.at + fade),
            fadeOut,
            words: line.words,
          }),
        );
      });
    });
  });
  return out;
}

/**
 * Every stop, in order: one per scene, at its end (see the top of this file). The last scene's stop
 * is the end of the essay. `motion` is the scene's motion at a progress (`sceneMotion` of the
 * keyframes' state).
 */
export function autoStops(story: readonly StopShape[], spans: readonly SectionSpan[], motion: Motion): Stop[] {
  const screens = story.reduce((n, s) => n + s.length, 0);
  const margin = STOP_MARGIN_SCREENS / screens;
  const window = REST_WINDOW_SCREENS / screens;
  const step = SAMPLE_SCREENS / screens;
  const atRest = (p: number) => changeBefore(motion, p, window, step) < REST_EPSILON;
  const all = scenes(story, spans);
  return all.map((scene, i): Stop => {
    const { id, from, words } = scene;
    if (i === all.length - 1) return { id, from, words, progress: 1, ends: 'text' };
    const next = all[i + 1].from;
    const textEnd = Math.max(scene.up, Math.min(next, scene.fadeOut) - margin);
    const latest = next - margin;
    if (latest > textEnd) {
      // Does the motion still have far to go once the text has started to leave?
      const start = motion(textEnd);
      let left = 0;
      for (let q = textEnd + step; q < next; q += step) left = Math.max(left, moved(start, motion(q)));
      if (left > OUTLASTS_TEXT) {
        // Then the stop waits for it: the latest point at rest before the next text comes up.
        for (let q = latest; q > textEnd; q -= step) if (atRest(q)) return { id, from, words, progress: q, ends: 'motion' };
      }
    }
    return { id, from, words, progress: textEnd, ends: 'text' };
  });
}

