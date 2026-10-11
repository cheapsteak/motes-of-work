p = '/home/user/motes-of-work/src/story/reveal.ts'
s = open(p).read()
s = s.replace("""/**
 * How far a beat has dimmed at `l`:""", """/**
 * How far one line of a document (the brief) has come up at `l`: absent, not dim, until its own
 * `at`, then up over one fade (docs/specs/2026-10-05-act-1-build-and-orbit.md §2.5). A document's
 * lines never dim.
 */
export function lineReveal(l: number, at: number, fade: number): number {
  return smoothstep(at, at + fade, l);
}

/**
 * How far a beat has dimmed at `l`:""", 1)
s = s.replace("""export interface StoryShape {
  length: number;
  pages: { beats: { at: number; document: boolean }[] }[];
}

export interface BeatLook {
  reveal: number;
  dim: number;
}""", """export interface StoryShape {
  length: number;
  pages: { beats: { at: number; document: boolean; lines?: readonly { at: number }[] }[] }[];
}

export interface BeatLook {
  reveal: number;
  dim: number;
  /** A document's lines, each its `lineReveal`; empty for any other beat. */
  lines: number[];
}""", 1)
s = s.replace("""      const beats = page.beats.map((b, bi) => ({
        reveal: beatReveal(l, b.at, fade, !(opensEssay && bi === 0)),
        dim: beatDim(l, page.beats[bi + 1]?.at, fade, b.document),
      }));""", """      const beats = page.beats.map((b, bi) => ({
        reveal: beatReveal(l, b.at, fade, !(opensEssay && bi === 0)),
        dim: beatDim(l, page.beats[bi + 1]?.at, fade, b.document),
        lines: (b.lines ?? []).map((line) => lineReveal(l, line.at, fade)),
      }));""", 1)
s = s.replace("""/** Every page's opacity and every beat's reveal and dim at progress `p`, per section, per page. */""",
              """/**
 * Every page's opacity, and every beat's reveal and dim (and a document's lines' reveals), at
 * progress `p`, per section, per page.
 */""", 1)
open(p, 'w').write(s)
