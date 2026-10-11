import type { SectionSpan } from '../scroll/progress';
import { fadeWidth, pageOut } from '../story/reveal';
import { FREEZE_ROLL } from '../scene/node/birth';
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
 * before the next text comes up. A move that leaves as its page starts to fade (Act II's page-turn
 * moves) ends its scene the same way: the latest point at rest is the instant it leaves, with the
 * text still whole, so `ends: 'motion'` there means "just before a motion", not "after one". Only the
 * first stretch at rest counts, so a move that rests part way still ends its scene as it leaves. A
 * page with an explicit `out` never waits: it leaves early to make a stretch with no text for motion
 * to play in (no page of the essay has one since the author deleted spread's second fix, which made
 * the first), so its last scene stops while the page is whole and the motion
 * is crossed in transit, never paused on an empty frame. The stops follow the story's beat data and
 * the keyframes, so they move with any copy or timing change. The essay's last scene runs to the
 * end, its last stop.
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
    /** Where the page is gone, when its last beat gave an explicit `out` (see `pageOut`). */
    out?: number;
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
 * and focus, its landscape variant, and the tracking camera's move from one target to the next and
 * its ride on the galaxy's turn), the ink drawing with its
 * sheet, and Act II's reflow and network story clocks (its presence, the highlight, the fix, the
 * reviewer's ring, the lamp's focus, and the streams' and the feed's fades, galaxy §15.1), and the
 * freeze frame's cut, dressing and roll (the roll as a share of FREEZE_ROLL; freeze-frame §1.3: a stop
 * never rests on the cut, the dressing's snap or the release). Not the flash, which never outlasts the
 * cut's own step. Not the lamp's level or
 * target, nor the tracked targets themselves: they are steps. Not the drive: it is the machine's own
 * running clock, and a riding bike rides on through its lines by design; nor, for the same reason,
 * the network's growth or the stream clock (`clock`), which run under every line of Act II. Not the
 * haze (`net.haze`, re-skin §5) nor the neighbourhood's hold (`net.hoodHold`): look gates, whose fades
 * ride the camera's own moves.
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
    c.track.mix,
    c.track.turn,
    ...c.landscape.pos,
    c.landscape.frame,
    c.landscape.mix,
    ink.opacity,
    ink.drawn,
    ink.redraw,
    ink.flat,
    ink.ring,
    ink.tick,
    s.sheet.opacity,
    s.mech.reflow,
    s.net.show,
    s.net.highlight,
    s.net.fix,
    s.net.review,
    s.net.focus,
    s.net.streams,
    s.net.feed,
    s.freeze.hold,
    s.freeze.dress,
    c.roll / FREEZE_ROLL,
  ];
}

/** The largest change of any motion value between `a` and `b`. */
function moved(a: readonly number[], b: readonly number[]): number {
  return a.reduce((m, v, i) => Math.max(m, Math.abs(v - b[i])), 0);
}

/** The largest change of any motion value over the `span` of progress before `p`. */
function changeBefore(motion: Motion, p: number, span: number, step: number): number {
  const here = motion(p);
  let most = 0;
  for (let q = p - span; q < p; q += step) most = Math.max(most, moved(here, motion(Math.max(0, q))));
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
  /** Its page leaves at an explicit `out`, so the stop never waits for motion past it. */
  early: boolean;
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
      const pout = pageOut(section.pages, pi);
      const fadeOut = si === lastSection && pi === lastPage && page.out === undefined ? 1 : global(pout - fade);
      page.beats.forEach((beat, bi) => {
        const opensEssay = si === 0 && pi === 0 && bi === 0;
        const lineWords = beat.lines.reduce((n, line) => n + line.words, 0);
        out.push({
          id: beat.id,
          from: global(beat.at),
          up: global(opensEssay ? beat.at : beat.at + fade),
          fadeOut,
          early: page.out !== undefined,
          words: Math.max(0, beat.words - lineWords),
        });
        beat.lines.forEach((line, li) =>
          out.push({
            id: `${beat.id}[${li + 1}]`,
            from: global(line.at),
            up: global(line.at + fade),
            fadeOut,
            early: page.out !== undefined,
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
  const restWindow = REST_WINDOW_SCREENS / screens;
  const step = SAMPLE_SCREENS / screens;
  const atRest = (p: number) => changeBefore(motion, p, restWindow, step) < REST_EPSILON;
  const all = scenes(story, spans);
  return all.map((scene, i): Stop => {
    const { id, from, words } = scene;
    if (i === all.length - 1) return { id, from, words, progress: 1, ends: 'text' };
    const next = all[i + 1].from;
    const textEnd = Math.max(scene.up, Math.min(next, scene.fadeOut) - margin);
    const latest = next - margin;
    if (latest > textEnd && !scene.early) {
      // Does the motion still have far to go once the text has started to leave?
      const start = motion(textEnd);
      let left = 0;
      for (let q = textEnd + step; q < next; q += step) left = Math.max(left, moved(start, motion(q)));
      if (left > OUTLASTS_TEXT) {
        // Then the stop waits for it: the latest point at rest before the next text comes up, in the
        // first stretch at rest from the text's end. A move that rests part way (ly-5's swing to P_a,
        // then its close-in) so never carries the stop past the instant it first leaves.
        let leave = Infinity;
        let rested = false;
        for (let q = textEnd; q < latest; q += step) {
          const rest = atRest(q);
          if (rest) rested = true;
          else if (rested) {
            leave = q;
            break;
          }
        }
        for (let q = latest; q > textEnd; q -= step) if (q < leave && atRest(q)) return { id, from, words, progress: q, ends: 'motion' };
      }
    }
    return { id, from, words, progress: textEnd, ends: 'text' };
  });
}

/** How long to hold at a stop with `words` words: the reading time, never less than the floor. */
export function dwellSeconds(words: number, s: Pick<AutoAdvanceSettings, 'floorSeconds' | 'wordsPerSecond'>): number {
  const reading = s.wordsPerSecond > 0 ? words / s.wordsPerSecond : 0;
  return Math.max(s.floorSeconds, reading);
}

type TransitSettings = Pick<AutoAdvanceSettings, 'transitScreensPerSecond' | 'easeSeconds'>;

/** The ease of a transit `screens` long: the configured one, shortened for a transit too short to cruise. */
function easeFor(screens: number, s: TransitSettings): number {
  return Math.max(0, Math.min(s.easeSeconds, screens / s.transitScreensPerSecond));
}

/**
 * How long a transit of `screens` takes: it speeds up evenly over the ease, cruises at the pace and
 * slows evenly over the ease, so it covers the distance in (distance / pace + ease).
 */
export function transitSeconds(screens: number, s: TransitSettings): number {
  if (!(screens > 0)) return 0;
  return screens / s.transitScreensPerSecond + easeFor(screens, s);
}

/** How far through a transit of `screens` it is at `t` seconds, in [0, 1]. */
export function transitFraction(t: number, screens: number, s: TransitSettings): number {
  const total = transitSeconds(screens, s);
  if (!(total > 0) || t >= total) return 1;
  if (t <= 0) return 0;
  const v = s.transitScreensPerSecond;
  const ease = easeFor(screens, s);
  let covered: number;
  if (t < ease) covered = (v * t * t) / (2 * ease);
  else if (t <= total - ease) covered = (v * ease) / 2 + v * (t - ease);
  else covered = screens - (v * (total - t) * (total - t)) / (2 * ease);
  return Math.min(1, Math.max(0, covered / screens));
}

/**
 * Integer scrollY of a stop at `progress` for a scroll range of `range` px. Rounded up (less float
 * noise), so the reader is never a pixel short of the line being fully up.
 */
export function stopScrollY(progress: number, range: number): number {
  if (!(range > 0)) return 0;
  return Math.min(range, Math.max(0, Math.ceil(progress * range - 1e-6)));
}

/** Index of the first stop strictly after scrollY `y` (half a pixel's grace), or -1 at the end. */
export function nextStopAfter(stopYs: readonly number[], y: number): number {
  return stopYs.findIndex((s) => s > y + 0.5);
}

const SWITCH = /^[01]$/;

function positive(raw: string): number | null {
  const n = Number(raw);
  return raw.trim() !== '' && Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * The settings for this page: `defaults` (src/config.ts) under the URL's overrides. `?auto=0` turns
 * it off and `?auto=1` on; test mode (`?test=1`) turns it off unless `?auto=1`, since the tests
 * rely on a still page. `?dwell=` is the floor in seconds, `?wps=` the words per second and
 * `?pace=` the transit pace in screens per second. A value that does not parse is left out of the
 * settings and named in `ignored`.
 */
export function autoAdvanceSettings(
  params: URLSearchParams,
  defaults: AutoAdvanceSettings,
  testMode: boolean,
): { settings: AutoAdvanceSettings; ignored: string[] } {
  const settings = { ...defaults };
  const ignored: string[] = [];
  const auto = params.get('auto');
  if (auto !== null && !SWITCH.test(auto)) ignored.push(`auto=${auto}`);
  const on = auto !== null && SWITCH.test(auto) ? auto === '1' : null;
  settings.enabled = on ?? (testMode ? false : defaults.enabled);
  const numbers: [string, 'floorSeconds' | 'wordsPerSecond' | 'transitScreensPerSecond'][] = [
    ['dwell', 'floorSeconds'],
    ['wps', 'wordsPerSecond'],
    ['pace', 'transitScreensPerSecond'],
  ];
  for (const [key, field] of numbers) {
    const raw = params.get(key);
    if (raw === null) continue;
    const n = positive(raw);
    if (n === null) ignored.push(`${key}=${raw}`);
    else settings[field] = n;
  }
  return { settings, ignored };
}
