import type { SectionSpan } from '../scroll/progress.ts';

/**
 * The text engine's opacities, every one a pure function of scroll progress (design spec §6.1;
 * the curves are docs/specs/2026-10-04-act-1-storyboard-and-text-engine.md §3.2). Applied from the
 * scroll driver with no CSS transition, so a jump and a scroll show the same page.
 *
 * A section is pages of beats. A page is up from its first beat's `at` to the next page's (or the
 * section's end), fading in and out over FADE; a beat fades in from its `at`, and dims once the next
 * beat on its page comes up, so the newest line is full ink. A page leaves whole, at 0 before the
 * next comes in, so no two pages are ever on screen together.
 */

/** How long every fade lasts, in screens (viewport heights of scroll). */
export const FADE_SCREENS = 0.1;

/** A fade's width in section-local progress, for a section `length` screens long. */
export function fadeWidth(length: number): number {
  return FADE_SCREENS / length;
}

/** Hermite smoothstep: 0 at or below `a`, 1 at or above `b`. */
export function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/**
 * A page up over [`pin`, `pout`] at section-local `l`. The essay's first page does not fade in and
 * its last does not fade out: the essay opens on its first words and ends on its last.
 */
export function pageOpacity(l: number, pin: number, pout: number, fade: number, { fadeIn = true, fadeOut = true } = {}): number {
  const enter = fadeIn ? smoothstep(pin, pin + fade, l) : 1;
  const leave = fadeOut ? 1 - smoothstep(pout - fade, pout, l) : 1;
  return enter * leave;
}

/** How far a beat starting at `at` has come up at `l`. The essay's first line is up from the start. */
export function beatReveal(l: number, at: number, fade: number, fadeIn = true): number {
  return fadeIn ? smoothstep(at, at + fade, l) : 1;
}

/**
 * How far one line of a document (the brief) has come up at `l`: absent, not dim, until its own
 * `at`, then up over one fade (docs/specs/2026-10-05-act-1-build-and-orbit.md §2.5). A document's
 * lines never dim.
 */
export function lineReveal(l: number, at: number, fade: number): number {
  return smoothstep(at, at + fade, l);
}

/**
 * How far a beat has dimmed at `l`: it dims as the next beat on its page (starting at `nextAt`)
 * comes up. The last beat on a page, and a document beat, never dim.
 */
export function beatDim(l: number, nextAt: number | undefined, fade: number, document = false): number {
  return nextAt === undefined || document ? 0 : smoothstep(nextAt, nextAt + fade, l);
}

/** The parts of a story section the curves read. */
export interface StoryShape {
  length: number;
  pages: { beats: { at: number; document: boolean; lines?: readonly { at: number }[] }[]; out?: number }[];
}

/**
 * Section-local progress at which page `pi` is gone, its fade-out ending there: its own `out` when
 * its last beat's marker gave one (`<!-- beat id=x at=0 out=0.4 -->`), otherwise where the next
 * page's first beat comes up, otherwise the section's end.
 */
export function pageOut(pages: readonly { beats: readonly { at: number }[]; out?: number }[], pi: number): number {
  return pages[pi].out ?? pages[pi + 1]?.beats[0].at ?? 1;
}

export interface BeatLook {
  reveal: number;
  dim: number;
  /** A document's lines, each its `lineReveal`; empty for any other beat. */
  lines: number[];
}

export interface PageLook {
  opacity: number;
  beats: BeatLook[];
}

/**
 * Every page's opacity, and every beat's reveal and dim (and a document's lines' reveals), at
 * progress `p`, per section, per page.
 */
export function storyLooks(p: number, spans: readonly SectionSpan[], story: readonly StoryShape[]): PageLook[][] {
  const lastSection = story.length - 1;
  return story.map((section, si) => {
    const { start, end } = spans[si];
    const width = end - start;
    const l = width > 0 ? Math.min(1, Math.max(0, (p - start) / width)) : 0;
    const fade = fadeWidth(section.length);
    const lastPage = section.pages.length - 1;
    return section.pages.map((page, pi) => {
      const pin = page.beats[0].at;
      const pout = pageOut(section.pages, pi);
      const opensEssay = si === 0 && pi === 0;
      const opacity = pageOpacity(l, pin, pout, fade, {
        fadeIn: !opensEssay,
        // The essay's last page does not fade out, unless it was given an explicit out.
        fadeOut: !(si === lastSection && pi === lastPage && page.out === undefined),
      });
      const beats = page.beats.map((b, bi) => ({
        reveal: beatReveal(l, b.at, fade, !(opensEssay && bi === 0)),
        dim: beatDim(l, page.beats[bi + 1]?.at, fade, b.document),
        lines: (b.lines ?? []).map((line) => lineReveal(l, line.at, fade)),
      }));
      return { opacity, beats };
    });
  });
}
