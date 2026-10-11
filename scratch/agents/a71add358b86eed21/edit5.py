p = '/home/user/motes-of-work/src/story/reveal.test.ts'
s = open(p).read()
s = s.replace("import { beatDim, beatReveal, fadeWidth, pageOpacity, smoothstep, storyLooks, type StoryShape } from './reveal';",
              "import { beatDim, beatReveal, fadeWidth, lineReveal, pageOpacity, smoothstep, storyLooks, type StoryShape } from './reveal';")
s = s.replace("""describe('storyLooks', () => {
  const beat = (at: number, document = false) => ({ at, document });
  const shape: StoryShape[] = [
    { length: 2, pages: [{ beats: [beat(0), beat(0.3)] }, { beats: [beat(0.6, true)] }] },
    { length: 1, pages: [{ beats: [beat(0), beat(0.5)] }] },
  ];""", """describe('lineReveal', () => {
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
  ];""")
s = s.replace("""    expect(start[0][0]).toEqual({ opacity: 1, beats: [{ reveal: 1, dim: 0 }, { reveal: 0, dim: 0 }] });""",
              """    expect(start[0][0]).toEqual({ opacity: 1, beats: [{ reveal: 1, dim: 0, lines: [] }, { reveal: 0, dim: 0, lines: [] }] });""")
s = s.replace("""    expect(mid[0][0]).toEqual({ opacity: 1, beats: [{ reveal: 1, dim: 1 }, { reveal: 1, dim: 0 }] });
    const doc = storyLooks((2 / 3) * 0.8, spans, shape);
    expect(doc[0][1]).toEqual({ opacity: 1, beats: [{ reveal: 1, dim: 0 }] });
  });""", """    expect(mid[0][0]).toEqual({ opacity: 1, beats: [{ reveal: 1, dim: 1, lines: [] }, { reveal: 1, dim: 0, lines: [] }] });
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
  });""")
s = s.replace("""  it('brings the lines of a page up in reading order, and dims none while it is the newest', () => {
    for (const p of samples) {
      for (const page of storyLooks(p, spans, story).flat()) {
        page.beats.forEach((b, i) => {
          const next = page.beats[i + 1];
          if (next) expect(b.reveal, `p=${p} line ${i}`).toBeGreaterThanOrEqual(next.reveal);
          if (!next || next.reveal === 0) expect(b.dim, `p=${p} line ${i}`).toBe(0);
        });
      }
    }
  });""", """  it('brings the lines of a page up in reading order, and dims none while it is the newest', () => {
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
    expect(lines).toHaveLength(4);
    const look = (local: number) => storyLooks(spans[si].start + local * (spans[si].end - spans[si].start), spans, story)[si][pi].beats[0].lines;
    lines.forEach((line, k) => {
      expect(look(line.at - 0.001)[k], `line ${k + 1} just before its at`).toBe(0);
      expect(look(line.at + fade + 0.001)[k], `line ${k + 1} once up`).toBe(1);
    });
  });""")
open(p, 'w').write(s)
