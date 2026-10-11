p = '/home/user/motes-of-work/src/story/content.test.ts'
s = open(p).read()
start = s.index("const spans = sectionSpans(story);")
end = s.index("const dwellBudget = (b: Beat) =>")
s = s[:start] + """const spans = sectionSpans(story);
const sampler = new KeyframeSampler(keyframes as unknown as KeyframeFile, spans); // validated at load

/**
 * The scroll, in screens, from a line's fade-in to the next change on its page: the next line
 * starting, or the page's end (the next page's `at`, or the section's end). A document is measured
 * to its own first line coming up: the ask is read alone first (docs/specs/2026-10-05-act-1-build-
 * and-orbit.md §2.5); each of its lines has the ordering fence below.
 */
function dwell(section: StorySection, pageIndex: number, beatIndex: number): number {
  const page = section.pages[pageIndex];
  const beat = page.beats[beatIndex];
  const next = beat.document && beat.lines.length > 0
    ? beat.lines[0].at
    : (page.beats[beatIndex + 1]?.at ?? section.pages[pageIndex + 1]?.beats[0].at ?? 1);
  return (next - beat.at) * section.length;
}

/** The words a document says before its lines: the ask. */
const ownWords = (b: Beat) => b.words - b.lines.reduce((n, l) => n + l.words, 0);

""" + s[end:]
s = s.replace("""const dwellBudget = (b: Beat) => Math.max(DWELL_MIN_SCREENS, b.words / DWELL_WORDS_PER_SCREEN);""",
              """const dwellBudget = (b: Beat) => Math.max(DWELL_MIN_SCREENS, (b.document ? ownWords(b) : b.words) / DWELL_WORDS_PER_SCREEN);
const lineBudget = (words: number) => Math.max(DWELL_MIN_SCREENS, words / DWELL_WORDS_PER_SCREEN);""")
old_test_start = s.index("  it('measures the brief to its first lighting: a long read, but not forever', () => {")
old_test_end = s.index("describe('the brief', () => {")
s = s[:old_test_start] + """  it('gives the ask alone on the brief page its reading time before the first line comes up', () => {
    // The storyboard gives the ask 0.3 screens (8 words) before line 1 comes up.
    const [vibeBuild] = story;
    const page = vibeBuild.pages.findIndex((p) => p.beats[0].document);
    expect(page).toBeGreaterThanOrEqual(0);
    expect(ownWords(vibeBuild.pages[page].beats[0])).toBe(8);
    expect(dwell(vibeBuild, page, 0)).toBeCloseTo(0.3, 9);
  });
});

/**
 * The ordering fence (docs/specs/2026-10-05-act-1-build-and-orbit.md §2.5): the words come before
 * the parts. A brief line's parts are the ones it names that are not already in place when the line
 * before it lights; none of them may set out (assembly passing its window's `from - SETTLE_WINDOW`)
 * until the line has been up for its reading time, and the line is never met while it is not yet
 * up. Reads the markdown, the keyframes and the bike's windows, so a change to any of the three
 * that breaks the order fails here.
 */
describe('the words come before the parts', () => {
  const si = story.findIndex((s) => s.pages.some((p) => p.beats.some((b) => b.lines.length > 0)));
  const section = story[si];
  const span = spans[si];
  const assembly = (l: number) => sampler.sample(span.start + l * (span.end - span.start)).mech.assembly;
  const fade = FADE_SCREENS / section.length;
  const brief = section.pages.flatMap((p) => p.beats).find((b) => b.lines.length > 0) as Beat;
  const parts = [...section.body.matchAll(/data-parts="([^"]*)"/g)].map((m) => parsePartList(m[1]));
  const thresholds = briefThresholds(
    parts.map((p) => ({ parts: p })),
    mechanisms.bike,
  );
  const N = 200_000;
  /** The first local at which assembly passes `a` (`strict`) or reaches it. */
  const first = (a: number, strict: boolean) => {
    for (let i = 0; i <= N; i++) {
      const v = assembly(i / N);
      if (strict ? v > a : v >= a) return i / N;
    }
    return Infinity;
  };

  it('times every line of the brief, and names parts for each', () => {
    expect(brief.lines).toHaveLength(parts.length);
    expect(parts.length).toBe(4);
  });

  it.each([0, 1, 2, 3])('line %i: its new parts set out only after it has been read', (i) => {
    const line = brief.lines[i];
    const before = i === 0 ? -Infinity : thresholds[i - 1];
    const fresh = mechanisms.bike.parts.filter(
      (part) => parts[i].some((pattern) => matchesPart(pattern, part.id)) && settleWindow(part)[1] > before,
    );
    expect(fresh.length, `line ${i + 1} brings parts of its own`).toBeGreaterThan(0);
    const setOut = Math.min(...fresh.map((part) => settleWindow(part)[0] - SETTLE_WINDOW));
    const read = line.at + lineBudget(line.words) / section.length;
    expect(first(setOut, true) + 1e-9, `line ${i + 1}: its parts set out at local ${first(setOut, true)}`).toBeGreaterThanOrEqual(read);
  });

  it.each([0, 1, 2, 3])('line %i: is up before it is met', (i) => {
    expect(first(thresholds[i], false)).toBeGreaterThanOrEqual(brief.lines[i].at + fade);
  });
});

""" + s[old_test_end:]
s = s.replace("import { briefThresholds, matchesPart, parsePartList } from './brief';",
              "import { settleWindow } from '../scene/mote/attributes';\nimport { SETTLE_WINDOW } from '../scene/mote/settle';\nimport { briefThresholds, matchesPart, parsePartList } from './brief';\nimport { FADE_SCREENS } from './reveal';")
open(p, 'w').write(s)
