import {
  dwellSeconds,
  nextStopAfter,
  stopScrollY,
  transitFraction,
  type AutoAdvanceSettings,
  type Stop,
} from './plan';

/**
 * Auto-advance, the DOM half: it holds at each stop (src/autoAdvance/plan.ts), then scrolls to the
 * next one with window.scrollTo every animation frame, so the scroll position still drives every
 * frame of the scene and the text. A small ring in the bottom-right corner dials down through the
 * hold and fills back up through the transit; it is a button that pauses and resumes.
 *
 * Any manual scroll intent pauses it at once, read from input events (never from `scroll` events,
 * which its own scrolling fires too): the wheel, a touch, a pointer press on the page or its
 * scrollbar, and the keys that scroll. It stays paused until the ring is pressed; it then holds for
 * the floor where the reader left it and goes on to the next stop after that. At the end it stops
 * and the ring fades away; should the reader scroll back up, it comes back, paused.
 *
 * The ring's countdown is time-based (it is chrome, not scene). Time only runs while frames do, in
 * steps of at most MAX_STEP, so a hidden tab does not lose its place.
 */

export type AutoAdvanceState = 'dwell' | 'transit' | 'paused' | 'ended';

export interface AutoAdvance {
  state(): AutoAdvanceState;
  /** Every stop's scrollY at the current layout. */
  stopYs(): number[];
}

type Phase =
  | { kind: 'dwell'; elapsed: number; duration: number }
  | { kind: 'transit'; from: number; to: number; screens: number; elapsed: number }
  | { kind: 'paused' }
  | { kind: 'ended' };

/** The keys that scroll the page. */
const SCROLL_KEYS = new Set([' ', 'PageUp', 'PageDown', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End']);
/** Space on one of these presses it rather than scrolling. */
const PRESSABLE = 'button, a[href], input, select, textarea, summary, [contenteditable]';
/**
 * The longest step of time one frame may take, in seconds: long enough for a slow device's frames,
 * short enough that a tab coming back from the background resumes where it left off.
 */
const MAX_STEP = 0.25;

const LABEL = { running: 'Pause auto-advance', paused: 'Resume auto-advance' };
const SVG = 'http://www.w3.org/2000/svg';

function svgEl(name: string, attrs: Record<string, string>): SVGElement {
  const el = document.createElementNS(SVG, name);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

/** The ring: a faint track, the arc that dials down (pathLength 1, so its offset is a fraction), a play glyph. */
function createButton(): { button: HTMLButtonElement; arc: SVGElement } {
  const button = document.createElement('button');
  button.type = 'button';
  button.id = 'auto-advance';
  const svg = svgEl('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' });
  const ring = { cx: '12', cy: '12', r: '11' };
  const arc = svgEl('circle', {
    ...ring,
    class: 'auto-advance-arc',
    pathLength: '1',
    'stroke-dasharray': '1',
    'stroke-dashoffset': '0',
    transform: 'rotate(-90 12 12)',
  });
  svg.append(
    svgEl('circle', { ...ring, class: 'auto-advance-track' }),
    arc,
    svgEl('path', { class: 'auto-advance-play', d: 'M9.75 7.75 16.25 12 9.75 16.25Z' }),
  );
  button.append(svg);
  return { button, arc };
}

export function mountAutoAdvance(
  stops: readonly Stop[],
  settings: AutoAdvanceSettings,
  { startPaused }: { startPaused: boolean },
): AutoAdvance {
  const { button, arc } = createButton();
  document.body.append(button);

  const range = () => document.documentElement.scrollHeight - window.innerHeight;
  const stopYs = () => {
    const r = range();
    return stops.map((s) => stopScrollY(s.progress, r));
  };
  const lastStopY = () => stopYs()[stops.length - 1];

  // Until the page has loaded the ring waits, full; under reduced motion it waits paused.
  let phase: Phase = startPaused ? { kind: 'paused' } : { kind: 'dwell', elapsed: 0, duration: Infinity };
  let raf = 0;
  let lastTime: number | null = null;

  const running = () => phase.kind === 'dwell' || phase.kind === 'transit';

  function show(): void {
    button.dataset.state = phase.kind;
    const label = phase.kind === 'paused' ? LABEL.paused : LABEL.running;
    if (button.getAttribute('aria-label') !== label) {
      button.setAttribute('aria-label', label);
      button.title = label;
    }
    // The arc's gap: none while waiting for the page to load, the share of the hold gone by (all of
    // a zero hold), or the share of the transit still to go.
    let offset = 1;
    if (phase.kind === 'dwell' && !Number.isFinite(phase.duration)) offset = 0;
    else if (phase.kind === 'dwell' && phase.duration > 0) offset = Math.min(1, phase.elapsed / phase.duration);
    else if (phase.kind === 'transit') offset = 1 - transitFraction(phase.elapsed, phase.screens, settings);
    arc.setAttribute('stroke-dashoffset', offset.toFixed(4));
  }

  function dwell(duration: number): void {
    phase = { kind: 'dwell', elapsed: 0, duration };
  }

  function end(): void {
    phase = { kind: 'ended' };
  }

  function beginTransit(): void {
    const y = window.scrollY;
    const to = nextStopAfter(stopYs(), y);
    if (to < 0) return end();
    const r = range();
    phase = {
      kind: 'transit',
      from: r > 0 ? y / r : 0,
      to,
      screens: (stopYs()[to] - y) / window.innerHeight,
      elapsed: 0,
    };
  }

  function arrive(index: number): void {
    window.scrollTo(0, stopYs()[index]);
    if (index === stops.length - 1) end();
    else dwell(dwellSeconds(stops[index].words, settings));
  }

  function step(dt: number): void {
    if (phase.kind === 'dwell') {
      phase.elapsed += dt;
      if (phase.elapsed >= phase.duration) beginTransit();
    } else if (phase.kind === 'transit') {
      phase.elapsed += dt;
      const f = transitFraction(phase.elapsed, phase.screens, settings);
      if (f >= 1) return arrive(phase.to);
      // Interpolated in progress, so a resize mid-transit keeps it on course.
      const p = phase.from + (stops[phase.to].progress - phase.from) * f;
      window.scrollTo(0, Math.round(p * range()));
    }
  }

  function frame(now: number): void {
    raf = 0;
    const dt = lastTime === null ? 0 : Math.min(MAX_STEP, Math.max(0, (now - lastTime) / 1000));
    lastTime = now;
    step(dt);
    show();
    if (running()) raf = requestAnimationFrame(frame);
  }

  function run(): void {
    if (raf === 0 && running()) {
      lastTime = null;
      raf = requestAnimationFrame(frame);
    }
  }

  function halt(): void {
    if (raf !== 0) cancelAnimationFrame(raf);
    raf = 0;
  }

  function pause(): void {
    if (!running()) return;
    halt();
    phase = { kind: 'paused' };
    show();
  }

  /** From where the reader is: hold for the floor, then on to the next stop. */
  function resume(): void {
    dwell(settings.floorSeconds);
    show();
    run();
  }

  /**
   * Once the page has loaded: at a stop, hold there for its full dwell, then go. Inside a scene (its
   * text coming or up, its stop still ahead; the top of the essay is inside the first), go straight
   * on to its stop and hold there. Anywhere else, hold for the floor first.
   */
  function start(): void {
    if (phase.kind !== 'dwell' || Number.isFinite(phase.duration)) return;
    const y = window.scrollY;
    const r = range();
    const p = r > 0 ? y / r : 0;
    const ys = stopYs();
    const at = ys.findIndex((s) => Math.abs(s - y) <= 0.5);
    let hold = settings.floorSeconds;
    if (at >= 0) hold = at < stops.length - 1 ? dwellSeconds(stops[at].words, settings) : settings.floorSeconds;
    else if (stops.some((s, i) => s.from <= p && y < ys[i])) hold = 0;
    dwell(hold + settings.startDelaySeconds);
    run();
  }

  const onButton = (e: Event) => e.target instanceof Node && button.contains(e.target);
  const intent = (e: Event) => {
    if (!onButton(e)) pause();
  };
  const listen = { capture: true, passive: true };
  window.addEventListener('wheel', pause, listen);
  window.addEventListener('touchstart', intent, listen);
  window.addEventListener('touchmove', intent, listen);
  window.addEventListener('pointerdown', intent, listen);
  window.addEventListener(
    'keydown',
    (e) => {
      if (!SCROLL_KEYS.has(e.key)) return;
      if (e.key === ' ' && e.target instanceof Element && e.target.closest(PRESSABLE)) return;
      pause();
    },
    { capture: true },
  );
  // Ended, the ring comes back (paused) once the reader has scrolled back up from the end.
  window.addEventListener(
    'scroll',
    () => {
      if (phase.kind === 'ended' && window.scrollY < lastStopY() - 1) {
        phase = { kind: 'paused' };
        show();
      }
    },
    { passive: true },
  );

  button.addEventListener('click', () => {
    if (running()) pause();
    else if (phase.kind === 'paused') resume();
  });

  show();
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });

  return { state: () => phase.kind, stopYs };
}
