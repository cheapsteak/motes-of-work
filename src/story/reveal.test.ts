import { describe, expect, it } from 'vitest';
import { sectionSpans } from '../scroll/progress';
import { loadStory, type StorySection } from './loader';
import { beatDim, beatReveal, fadeWidth, lineReveal, pageOpacity, pageOut, smoothstep, storyLooks, type StoryShape } from './reveal';

describe('smoothstep', () => {
  it('is 0 at and below the low edge, 1 at and above the high edge, and eased between', () => {
    expect(smoothstep(0.2, 0.4, 0.1)).toBe(0);
    expect(smoothstep(0.2, 0.4, 0.2)).toBe(0);
    expect(smoothstep(0.2, 0.4, 0.3)).toBeCloseTo(0.5, 12);
    expect(smoothstep(0.2, 0.4, 0.25)).toBeCloseTo(0.15625, 12);
    expect(smoothstep(0.2, 0.4, 0.4)).toBe(1);
    expect(smoothstep(0.2, 0.4, 2)).toBe(1);
  });
});

describe('fadeWidth', () => {
  it('is a tenth of a screen, in section-local progress', () => {
    expect(fadeWidth(1)).toBeCloseTo(0.1, 15);
    expect(fadeWidth(4)).toBeCloseTo(0.025, 15);
    expect(fadeWidth(6)).toBeCloseTo(0.1 / 6, 15);
  });
});

const F = 0.025;
/** Strictly increasing across `xs`, sampled densely between each pair. */
function monotone(f: (x: number) => number, a: number, b: number, sign: 1 | -1): void {
  let prev = f(a);
  for (let i = 1; i <= 200; i++) {
    const v = f(a + ((b - a) * i) / 200);
    expect(sign * (v - prev), `at ${a + ((b - a) * i) / 200}`).toBeGreaterThan(0);
    prev = v;
  }
}

describe('pageOpacity', () => {
  it('is 0 at in, 1 at in + fade, 1 at out - fade and 0 at out', () => {
    const page = (l: number) => pageOpacity(l, 0.3, 0.6, F);
    expect(page(0.2)).toBe(0);
    expect(page(0.3)).toBe(0);
    expect(page(0.3 + F)).toBe(1);
    expect(page(0.45)).toBe(1);
    expect(page(0.6 - F)).toBe(1);
    expect(page(0.6)).toBe(0);
    expect(page(0.7)).toBe(0);
  });

  it('is monotone across each fade', () => {
    monotone((l) => pageOpacity(l, 0.3, 0.6, F), 0.3, 0.3 + F, 1);
    monotone((l) => pageOpacity(l, 0.3, 0.6, F), 0.6 - F, 0.6, -1);
  });

  it('skips the fade-in on the first page of the essay and the fade-out on the last', () => {
    expect(pageOpacity(0, 0, 0.4, F, { fadeIn: false })).toBe(1);
    expect(pageOpacity(0.4, 0, 0.4, F, { fadeIn: false })).toBe(0);
    expect(pageOpacity(1, 0.7, 1, F, { fadeOut: false })).toBe(1);
    expect(pageOpacity(0.7, 0.7, 1, F, { fadeOut: false })).toBe(0);
  });
});

describe('beatReveal and beatDim', () => {
  it('reveal is 0 at at, 1 at at + fade, monotone between', () => {
    expect(beatReveal(0.29, 0.3, F)).toBe(0);
    expect(beatReveal(0.3, 0.3, F)).toBe(0);
    expect(beatReveal(0.3 + F, 0.3, F)).toBe(1);
    expect(beatReveal(0.9, 0.3, F)).toBe(1);
    monotone((l) => beatReveal(l, 0.3, F), 0.3, 0.3 + F, 1);
  });

  it('reveal is 1 from the start for the first line of the essay', () => {
    expect(beatReveal(0, 0, F, false)).toBe(1);
  });

  it('dim rises as the next line on the page comes up, and never for the last line or a document', () => {
    expect(beatDim(0.5, 0.5, F)).toBe(0);
    expect(beatDim(0.5 + F, 0.5, F)).toBe(1);
    monotone((l) => beatDim(l, 0.5, F), 0.5, 0.5 + F, 1);
    expect(beatDim(0.9, undefined, F)).toBe(0);
    expect(beatDim(0.9, 0.5, F, true)).toBe(0);
  });
});

describe('lineReveal', () => {
  it('is exactly 0 at its at, 1 at at + fade, and monotone between: a line comes up from nothing', () => {
    expect(lineReveal(0.3, 0.3, 0.05)).toBe(0);
    expect(lineReveal(0.2999, 0.3, 0.05)).toBe(0);
    expect(lineReveal(0.35, 0.3, 0.05)).toBe(1);
    expect(lineReveal(0.325, 0.3, 0.05)).toBeCloseTo(0.5, 12);
    let prev = 0;
    for (let i = 0; i <= 100; i++) {
      const r = lineReveal(0.3 + (0.05 * i) / 100, 0.3, 0.05);
      expect(r).toBeGreaterThanOrEqual(prev);
      prev = r;
    }
  });
});

describe('storyLooks', () => {
  const beat = (at: number, document = false, lines: number[] = []) => ({ at, document, lines: lines.map((l) => ({ at: l })) });
  const shape: StoryShape[] = [
    { length: 2, pages: [{ beats: [beat(0), beat(0.3)] }, { beats: [beat(0.6, true, [0.7, 0.8])] }] },
    { length: 1, pages: [{ beats: [beat(0), beat(0.5)] }] },
  ];
  const spans = sectionSpans([
    { id: 'a', length: 2 },
    { id: 'b', length: 1 },
  ]); // a [0, 2/3], b [2/3, 1]

  it('opens on the first line at full ink and ends on the last page whole', () => {
    const start = storyLooks(0, spans, shape);
    expect(start[0][0]).toEqual({ opacity: 1, beats: [{ reveal: 1, dim: 0, lines: [] }, { reveal: 0, dim: 0, lines: [] }] });
    const end = storyLooks(1, spans, shape);
    expect(end[1][0].opacity).toBe(1);
    expect(end[0].map((p) => p.opacity)).toEqual([0, 0]);
  });

  it('dims the earlier line once the next is up, but never the document', () => {
    const mid = storyLooks((2 / 3) * 0.5, spans, shape);
    expect(mid[0][0]).toEqual({ opacity: 1, beats: [{ reveal: 1, dim: 1, lines: [] }, { reveal: 1, dim: 0, lines: [] }] });
    const doc = storyLooks((2 / 3) * 0.9, spans, shape);
    expect(doc[0][1]).toEqual({ opacity: 1, beats: [{ reveal: 1, dim: 0, lines: [1, 1] }] });
  });

  it("brings a document's lines up one at a time, each absent until its own at", () => {
    const at = (local: number) => storyLooks((2 / 3) * local, spans, shape)[0][1].beats[0];
    // Fade 0.05 (a section of 2 screens).
    expect(at(0.66).lines).toEqual([0, 0]);
    expect(at(0.7).lines).toEqual([0, 0]);
    expect(at(0.725).lines[0]).toBeCloseTo(0.5, 12);
    expect(at(0.75).lines).toEqual([1, 0]);
    expect(at(0.8).lines).toEqual([1, 0]);
    expect(at(0.85).lines).toEqual([1, 1]);
    // The document's own text (the ask) is up before either line.
    expect(at(0.66).reveal).toBe(1);
  });

  it('hands one section over to the next at 0 on both sides', () => {
    const at = storyLooks(2 / 3, spans, shape);
    expect(at.flat().map((p) => p.opacity)).toEqual([0, 0, 0]);
  });

  it('is a pure function of progress', () => {
    const a = storyLooks(0.41, spans, shape);
    storyLooks(0.9, spans, shape);
    expect(storyLooks(0.41, spans, shape)).toEqual(a);
  });
});

// The shipped story (spec §4 of docs/specs/2026-10-04-act-1-storyboard-and-text-engine.md).
describe('the shipped story', () => {
  const story: StorySection[] = loadStory();
  const spans = sectionSpans(story);
  const N = 10_000;
  const samples = Array.from({ length: N + 1 }, (_, i) => i / N);

  it('never shows two pages: the opacities sum to at most 1 and no two are above 0.02', () => {
    for (const p of samples) {
      const pages = storyLooks(p, spans, story).flat().map((page) => page.opacity);
      const sum = pages.reduce((a, b) => a + b, 0);
      expect(sum, `p=${p}`).toBeLessThanOrEqual(1 + 1e-9);
      expect(pages.filter((o) => o > 0.02).length, `p=${p}`).toBeLessThanOrEqual(1);
    }
  });

  it('brings the lines of a page up in reading order, and dims none while it is the newest', () => {
    for (const p of samples) {
      for (const page of storyLooks(p, spans, story).flat()) {
        page.beats.forEach((b, i) => {
          const next = page.beats[i + 1];
          if (next) expect(b.reveal, `p=${p} line ${i}`).toBeGreaterThanOrEqual(next.reveal);
          if (!next || next.reveal === 0) expect(b.dim, `p=${p} line ${i}`).toBe(0);
          // A document's own lines come up in order too, never before the document itself.
          b.lines.forEach((r, k) => {
            expect(r, `p=${p} document line ${k + 1}`).toBeLessThanOrEqual(b.reveal);
            if (k > 0) expect(r, `p=${p} document line ${k + 1}`).toBeLessThanOrEqual(b.lines[k - 1]);
          });
        });
      }
    }
  });

  it("keeps each brief line absent until its own at, and up from at + fade (docs/specs/2026-10-05-act-1-build-and-orbit.md §2.5)", () => {
    const si = story.findIndex((s) => s.pages.some((p) => p.beats.some((b) => b.lines.length > 0)));
    expect(si).toBeGreaterThanOrEqual(0);
    const section = story[si];
    const fade = fadeWidth(section.length);
    const pi = section.pages.findIndex((p) => p.beats.some((b) => b.lines.length > 0));
    const lines = section.pages[pi].beats[0].lines;
    expect(lines).toHaveLength(6);
    const look = (local: number) => storyLooks(spans[si].start + local * (spans[si].end - spans[si].start), spans, story)[si][pi].beats[0].lines;
    lines.forEach((line, k) => {
      expect(look(line.at - 0.001)[k], `line ${k + 1} just before its at`).toBe(0);
      expect(look(line.at + fade + 0.001)[k], `line ${k + 1} once up`).toBe(1);
    });
  });

  it('always has a page up away from the handovers', () => {
    // Mid-page of every page, exactly that page is up and whole.
    story.forEach((s, si) => {
      s.pages.forEach((page, pi) => {
        const pin = page.beats[0].at;
        const pout = pageOut(s.pages, pi);
        const local = (pin + pout) / 2;
        const p = spans[si].start + local * (spans[si].end - spans[si].start);
        const looks = storyLooks(p, spans, story);
        expect(looks[si][pi].opacity, `${s.id} page ${pi + 1}`).toBe(1);
        expect(looks.flat().filter((l) => l.opacity > 0).length, `${s.id} page ${pi + 1}`).toBe(1);
      });
    });
  });

  // Retired: "leaves no page up from its explicit out to the next page coming up (spread: the second
  // fix has no text)". The author deleted the second fix and up-1's out with it; the rule is held on a
  // made-up story below ("a page with an explicit out").
});

describe('a page with an explicit out', () => {
  const fade = fadeWidth(4);
  const shape: StoryShape[] = [
    { length: 4, pages: [{ out: 0.5, beats: [{ at: 0, document: false }] }, { beats: [{ at: 0.75, document: false }] }] },
  ];
  const spans = sectionSpans([{ id: 'x', length: 4 }]);
  const opacities = (l: number) => storyLooks(l, spans, shape)[0].map((p) => p.opacity);

  it('is gone at its out, rather than at the next page', () => {
    expect(pageOut(shape[0].pages, 0)).toBe(0.5);
    expect(pageOut(shape[0].pages, 1)).toBe(1);
    expect(opacities(0.5 - fade - 0.001)[0]).toBe(1);
    expect(opacities(0.5)[0]).toBe(0);
    expect(opacities(0.6)).toEqual([0, 0]);
    expect(opacities(0.75)).toEqual([0, 0]);
  });

  it('lets the essay\'s last page fade out when it was given an out, and not otherwise', () => {
    const last = (out?: number): StoryShape[] => [{ length: 4, pages: [{ out, beats: [{ at: 0, document: false }] }] }];
    expect(storyLooks(0.9, spans, last())[0][0].opacity).toBe(1);
    expect(storyLooks(0.9, spans, last(0.8))[0][0].opacity).toBe(0);
    expect(storyLooks(1, spans, last())[0][0].opacity).toBe(1);
  });
});
