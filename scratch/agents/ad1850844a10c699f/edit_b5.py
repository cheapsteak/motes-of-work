import os

os.chdir('.')


def rep(p, old, new, count=1):
    s = open(p).read()
    assert s.count(old) == count, (p, s.count(old), old[:70])
    open(p, 'w').write(s.replace(old, new))


B = 'src/story/brief.test.ts'
rep(B, """  // The shipped order (src/story/01-vibe-build.md): seat and bars, wheels and chain, steering, and
  // the frame with its fittings.""", """  // The shipped order (src/story/01-vibe-build.md): seat and bars, wheels and chain, steering, the
  // basket, the frame, and the mudguards.""")
rep(B, """    { parts: parsePartList("fork front-wheel") },
    {
      parts: parsePartList(
        "frame brake-front brake-rear mudguard-front mudguard-rear",
      ),
    },
  ];""", """    { parts: parsePartList("fork front-wheel") },
    { parts: parsePartList("basket") },
    { parts: parsePartList("frame") },
    { parts: parsePartList("mudguard-front mudguard-rear") },
  ];""")
rep(B, """      0.44, 0.6, 0.72, 0.97,""", """      0.32, 0.48, 0.6, 0.72, 0.95, 0.97,""", 2)
rep(B, """    expect(briefThresholds(lines, mechanisms.steam)).toEqual([1, 1, 1, 1]);""",
    """    expect(briefThresholds(lines, mechanisms.steam)).toEqual([1, 1, 1, 1, 1, 1]);""")

R = 'src/story/reveal.test.ts'
rep(R, """    expect(lines).toHaveLength(4);""", """    expect(lines).toHaveLength(6);""")

M = 'src/story/markup.test.ts'
rep(M, """data-beat="vb-brief" data-at="0.125" data-document>""", """data-beat="vb-brief" data-at="0.11111111" data-document>""")
rep(M, """    expect([...html.matchAll(/<li data-parts="[^"]*" data-at="0\\.\\d+">/g)].length).toBe(4);""",
    """    expect([...html.matchAll(/<li data-parts="[^"]*" data-at="0\\.\\d+">/g)].length).toBe(6);""")

C = 'src/story/content.test.ts'
rep(C, """/** Words in a line; a document (the brief) may run longer. */
const BEAT_WORDS = 26;
const DOCUMENT_WORDS = 60;""", """/**
 * Words in a line; a document (the brief) may run longer. 64, not the first 60: the author added
 * two short lines to the brief (the basket and the mudguards, 2026-10-05), and its 62 words come
 * up a line at a time, each with its own reading time (the fence below), never as one block.
 */
const BEAT_WORDS = 26;
const DOCUMENT_WORDS = 64;""")
rep(C, """    // The storyboard gives the ask 0.3 screens (8 words) before line 1 comes up.
    const [vibeBuild] = story;
    const page = vibeBuild.pages.findIndex((p) => p.beats[0].document);
    expect(page).toBeGreaterThanOrEqual(0);
    expect(ownWords(vibeBuild.pages[page].beats[0])).toBe(8);
    expect(dwell(vibeBuild, page, 0)).toBeCloseTo(0.3, 9);""", """    // The storyboard gives the ask 0.3 screens (8 words) before line 1 comes up. At 7.2 screens a
    // local is screens / 7.2 written to 8 places, so the screens read back to 1e-7, not exactly.
    const [vibeBuild] = story;
    const page = vibeBuild.pages.findIndex((p) => p.beats[0].document);
    expect(page).toBeGreaterThanOrEqual(0);
    expect(ownWords(vibeBuild.pages[page].beats[0])).toBe(8);
    expect(dwell(vibeBuild, page, 0) + 1e-9).toBeGreaterThanOrEqual(0.3);
    expect(dwell(vibeBuild, page, 0)).toBeCloseTo(0.3, 6);""")
rep(C, """  /** The first local at which assembly passes `a` (`strict`) or reaches it. */
  const first = (a: number, strict: boolean) => {
    for (let i = 0; i <= N; i++) {
      const v = assembly(i / N);
      if (strict ? v > a : v >= a) return i / N;
    }
    return Infinity;
  };""", """  /**
   * The first local at which assembly passes `a` (`strict`) or reaches it. Passing means by more
   * than the sampler's rounding: a hold keyed at a set-out value reads a hair above it.
   */
  const first = (a: number, strict: boolean) => {
    for (let i = 0; i <= N; i++) {
      const v = assembly(i / N);
      if (strict ? v > a + 1e-12 : v >= a - 1e-12) return i / N;
    }
    return Infinity;
  };""")
rep(C, """    expect(parts.length).toBe(4);""", """    expect(parts.length).toBe(6);""")
rep(C, """  it.each([1, 2, 3, 4])('line %i: its new parts set out as it appears, never before it', (n) => {""",
    """  it.each([1, 2, 3, 4, 5, 6])('line %i: its new parts set out as it appears, never before it', (n) => {""")
rep(C, """  it.each([1, 2, 3, 4])('line %i: is up before it is met', (n) => {""",
    """  it.each([1, 2, 3, 4, 5, 6])('line %i: is up before it is met', (n) => {""")
rep(C, """  it.each([1, 2, 3, 4])('line %i: stays the newest line for its reading time', (n) => {""",
    """  it.each([1, 2, 3, 4, 5, 6])('line %i: stays the newest line for its reading time', (n) => {""")
print('ok')
