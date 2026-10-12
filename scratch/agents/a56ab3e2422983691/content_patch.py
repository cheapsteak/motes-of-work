p = 'src/story/content.test.ts'
s = open(p).read()

s = s.replace(
    """import { mechanisms } from '../mechanisms';
import { briefThresholds, matchesPart, parsePartList } from './brief';
import { loadStory, parseSection, type StorySection } from './loader';
""",
    """import { mechanisms } from '../mechanisms';
import { sectionSpans } from '../scroll/progress';
import { KeyframeSampler, type KeyframeFile } from '../timeline/keyframeSampler';
import keyframes from '../timeline/keyframes.json';
import { briefThresholds, matchesPart, parsePartList } from './brief';
import { loadStory, parseSection, type Beat, type StorySection } from './loader';
""",
)

start = s.index("describe('story content lint', () => {")
end = s.index("describe('the brief', () => {")
new_block = r"""// The text model's limits (docs/specs/2026-10-04-act-1-storyboard-and-text-engine.md §3.3): a
// picture book of short pages, each line given enough scroll to be read.

/** Words in a line; a document (the brief) may run longer. */
const BEAT_WORDS = 26;
const DOCUMENT_WORDS = 60;
/** Words per screen of a section's length. */
const SECTION_WORDS_PER_SCREEN = 35;
const BEATS_PER_PAGE = 3;
/** Reading pace the scroll must allow: words per screen of scroll, and the least any line gets. */
const DWELL_WORDS_PER_SCREEN = 40;
const DWELL_MIN_SCREENS = 0.3;

const spans = sectionSpans(story);
const sampler = new KeyframeSampler(keyframes as unknown as KeyframeFile, spans); // validated at load

/** Section-local progress at which the brief's first line lights (its parts settle on the bike). */
function firstBriefLighting(section: StorySection): number {
  const lines = [...section.body.matchAll(/data-parts="([^"]*)"/g)].map((m) => ({ parts: parsePartList(m[1]) }));
  const [first] = briefThresholds(lines, mechanisms.bike);
  const span = spans[story.indexOf(section)];
  for (let i = 0; i <= 100_000; i++) {
    const l = i / 100_000;
    if (sampler.sample(span.start + l * (span.end - span.start)).mech.assembly >= first) return l;
  }
  throw new Error(`${section.file}: the brief's first line never lights`);
}

/**
 * The scroll, in screens, from a line's fade-in to the next change on its page: the next line
 * starting, or the page's end (the next page's `at`, or the section's end). A document is measured
 * to the first of its own lines lighting.
 */
function dwell(section: StorySection, pageIndex: number, beatIndex: number): number {
  const page = section.pages[pageIndex];
  const beat = page.beats[beatIndex];
  const next = beat.document
    ? firstBriefLighting(section)
    : (page.beats[beatIndex + 1]?.at ?? section.pages[pageIndex + 1]?.beats[0].at ?? 1);
  return (next - beat.at) * section.length;
}

const dwellBudget = (b: Beat) => Math.max(DWELL_MIN_SCREENS, b.words / DWELL_WORDS_PER_SCREEN);

describe('story content lint', () => {
  it('has at least one section', () => {
    expect(story.length).toBeGreaterThan(0);
  });

  it('has unique section ids', () => {
    const ids = story.map((s) => s.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });

  it('has unique beat ids across the essay', () => {
    const ids = story.flatMap((s) => s.pages.flatMap((p) => p.beats.map((b) => b.id)));
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });

  describe.each(story.map((s) => [s.file, s] as const))('%s', (_file, section) => {
    const beats = section.pages.flatMap((p) => p.beats);

    it(`has at most ${BEAT_WORDS} words a line, ${DOCUMENT_WORDS} in a document`, () => {
      for (const b of beats) expect(b.words, b.id).toBeLessThanOrEqual(b.document ? DOCUMENT_WORDS : BEAT_WORDS);
    });

    it(`has at most ${SECTION_WORDS_PER_SCREEN} words per screen of its length`, () => {
      expect(section.words / section.length).toBeLessThanOrEqual(SECTION_WORDS_PER_SCREEN);
    });

    it(`has at most ${BEATS_PER_PAGE} lines a page, and a document alone on its page`, () => {
      for (const [i, page] of section.pages.entries()) {
        expect(page.beats.length, `page ${i + 1}`).toBeLessThanOrEqual(BEATS_PER_PAGE);
        if (page.beats.some((b) => b.document)) expect(page.beats.length, `page ${i + 1}`).toBe(1);
      }
    });

    it('starts at 0 and brings its lines in in strictly increasing order, inside the section', () => {
      expect(beats[0].at).toBe(0);
      for (const [i, b] of beats.entries()) {
        expect(b.at, b.id).toBeGreaterThanOrEqual(0);
        expect(b.at, b.id).toBeLessThan(1);
        if (i > 0) expect(b.at, b.id).toBeGreaterThan(beats[i - 1].at);
      }
    });

    it(`gives every line max(${DWELL_MIN_SCREENS}, words / ${DWELL_WORDS_PER_SCREEN}) screens of scroll`, () => {
      section.pages.forEach((page, pi) =>
        page.beats.forEach((b, bi) => {
          expect(dwell(section, pi, bi) + 1e-9, `${b.id} (${b.words} words)`).toBeGreaterThanOrEqual(dwellBudget(b));
        }),
      );
    });

    it.each(PATTERNS)('has no %s in body or alt', (_name, re) => {
      for (const [where, text] of lintTexts(section)) expect(text, where).not.toMatch(re);
    });

    it('contains no term from the local denylist', () => {
      // Report only the location, never the term, so the list is not echoed into CI logs.
      expect(denylistHit(section, localDenylist), 'location of a denylist match').toBeUndefined();
    });
  });

  it('measures the brief to its first lighting: a long read, but not forever', () => {
    // The storyboard gives the brief 1.5 screens from its fade-in before line 1 lights.
    const [vibeBuild] = story;
    const page = vibeBuild.pages.findIndex((p) => p.beats[0].document);
    expect(page).toBeGreaterThanOrEqual(0);
    expect(dwell(vibeBuild, page, 0)).toBeCloseTo(1.5, 2);
  });
});

"""
s = s[:start] + new_block + s[end:]
open(p, 'w').write(s)
