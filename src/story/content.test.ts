import { describe, expect, it } from 'vitest';
import { mechanisms } from '../mechanisms';
import { sectionSpans } from '../scroll/progress';
import { KeyframeSampler, type KeyframeFile } from '../timeline/keyframeSampler';
import keyframes from '../timeline/keyframes.json';
import { settleWindow } from '../scene/mote/attributes';
import { SETTLE_WINDOW } from '../scene/mote/settle';
import { briefThresholds, matchesPart, parsePartList } from './brief';
import { FADE_SCREENS, pageOut } from './reveal';
import { loadStory, parseSection, type Beat, type StorySection } from './loader';

// Content lint (spec section 7): the published essay must be publication-safe.
// Generic patterns are committed. Organisation names are NOT: they live only in
// the gitignored content-denylist.local.txt at the repo root (one term per line).
const denylistFiles: Record<string, string> = import.meta.glob('/content-denylist.local.txt', {
  query: '?raw',
  import: 'default',
  eager: true,
});

function parseDenylist(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'))
    .map((line) => line.toLowerCase());
}

const localDenylist = Object.values(denylistFiles).flatMap(parseDenylist);

const PATTERNS: [string, RegExp][] = [
  ['issue number', /#\d{3,}/],
  ['file path', /\b[\w-]+\/[\w-]+\.(ts|py|md|sh|json)\b/],
];

/**
 * Every text a reader or crawler can see: the raw markdown (catches hrefs and
 * markup), the entity-decoded plain text (so `AT&T` and `Don't` match as typed,
 * not as `AT&amp;T` / `Don&#39;t`), and the canvas alt text. Never lint `html`.
 */
function lintTexts(section: StorySection): [string, string][] {
  return [
    ['body', section.body],
    ['text', section.text],
    ['alt', section.alt],
  ];
}

/** Location of the first denylist match, or undefined. Never returns the term itself. */
function denylistHit(section: StorySection, denylist: string[]): string | undefined {
  for (const [where, text] of lintTexts(section)) {
    const lower = text.toLowerCase();
    if (denylist.some((term) => lower.includes(term))) return where;
  }
  return undefined;
}

const story = loadStory();

// The text model's limits (docs/specs/2026-10-04-act-1-storyboard-and-text-engine.md §3.3): a
// picture book of short pages, each line given enough scroll to be read.

/**
 * Words in a line; a document (the brief) may run longer. 64, not the first 60: the author added
 * two short lines to the brief (the basket and the mudguards, 2026-10-05), and its 62 words come
 * up a line at a time, each with its own reading time (the fence below), never as one block.
 */
const BEAT_WORDS = 26;
const DOCUMENT_WORDS = 64;
/** Words per screen of a section's length. */
const SECTION_WORDS_PER_SCREEN = 35;
const BEATS_PER_PAGE = 3;
/** Reading pace the scroll must allow: words per screen of scroll, and the least any line gets. */
const DWELL_WORDS_PER_SCREEN = 40;
const DWELL_MIN_SCREENS = 0.3;

const spans = sectionSpans(story);
const sampler = new KeyframeSampler(keyframes as unknown as KeyframeFile, spans); // validated at load

/**
 * The scroll, in screens, from a line's fade-in to the next change on its page: the next line
 * starting, or the page's end (its explicit `out`, else the next page's `at`, else the section's end). A document is measured
 * to its own first line coming up: the ask is read alone first (docs/specs/2026-10-05-act-1-build-
 * and-orbit.md §2.5); each of its lines has the ordering fence below.
 */
function dwell(section: StorySection, pageIndex: number, beatIndex: number): number {
  const page = section.pages[pageIndex];
  const beat = page.beats[beatIndex];
  const next = beat.document && beat.lines.length > 0
    ? beat.lines[0].at
    : (page.beats[beatIndex + 1]?.at ?? pageOut(section.pages, pageIndex));
  return (next - beat.at) * section.length;
}

/** The words a document says before its lines: the ask. */
const ownWords = (b: Beat) => b.words - b.lines.reduce((n, l) => n + l.words, 0);

const dwellBudget = (b: Beat) => Math.max(DWELL_MIN_SCREENS, (b.document ? ownWords(b) : b.words) / DWELL_WORDS_PER_SCREEN);
const lineBudget = (words: number) => Math.max(DWELL_MIN_SCREENS, words / DWELL_WORDS_PER_SCREEN);

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

  it('gives the ask alone on the brief page its reading time before the first line comes up', () => {
    // The storyboard gives the ask 0.3 screens (8 words) before line 1 comes up. At 7.2 screens a
    // local is screens / 7.2 written to 8 places, so the screens read back to 1e-7, not exactly.
    const [vibeBuild] = story;
    const page = vibeBuild.pages.findIndex((p) => p.beats[0].document);
    expect(page).toBeGreaterThanOrEqual(0);
    expect(ownWords(vibeBuild.pages[page].beats[0])).toBe(8);
    expect(dwell(vibeBuild, page, 0) + 1e-9).toBeGreaterThanOrEqual(0.3);
    expect(dwell(vibeBuild, page, 0)).toBeCloseTo(0.3, 6);
  });
});

/**
 * The ordering fence (docs/specs/2026-10-05-act-1-build-and-orbit.md §2.5, as amended 2026-10-05):
 * the words and the parts arrive together. A brief line's parts are the ones it names that are not
 * already in place when the line before it lights; they set out (assembly passing their window's
 * `from - SETTLE_WINDOW`) as the line appears: never before it, and no more than SET_OUT_TOLERANCE
 * screens after it. The line is never met while it is not yet up, and it stays the newest line for
 * its reading time. Reads the markdown, the keyframes and the bike's windows, so a change to any of
 * the three that breaks the order fails here.
 */
/** How long after a brief line appears its parts may still be waiting to set out, in screens. */
const SET_OUT_TOLERANCE = 0.1;

describe('the words and the parts arrive together', () => {
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
  /**
   * The first local at which assembly passes `a` (`strict`) or reaches it. Passing means by more
   * than the sampler's rounding: a hold keyed at a set-out value reads a hair above it.
   */
  const first = (a: number, strict: boolean) => {
    for (let i = 0; i <= N; i++) {
      const v = assembly(i / N);
      if (strict ? v > a + 1e-12 : v >= a - 1e-12) return i / N;
    }
    return Infinity;
  };

  it('times every line of the brief, and names parts for each', () => {
    expect(brief.lines).toHaveLength(parts.length);
    expect(parts.length).toBe(6);
  });

  it.each([1, 2, 3, 4, 5, 6])('line %i: its new parts set out as it appears, never before it', (n) => {
    const i = n - 1;
    const line = brief.lines[i];
    const before = i === 0 ? -Infinity : thresholds[i - 1];
    const fresh = mechanisms.bike.parts.filter(
      (part) => parts[i].some((pattern) => matchesPart(pattern, part.id)) && settleWindow(part)[1] > before,
    );
    expect(fresh.length, `line ${i + 1} brings parts of its own`).toBeGreaterThan(0);
    const setOut = first(Math.min(...fresh.map((part) => settleWindow(part)[0] - SETTLE_WINDOW)), true);
    const where = `line ${i + 1} (at ${line.at}): its parts set out at local ${setOut}`;
    expect(setOut + 1e-9, where).toBeGreaterThanOrEqual(line.at);
    expect(setOut, where).toBeLessThanOrEqual(line.at + SET_OUT_TOLERANCE / section.length);
  });

  it.each([1, 2, 3, 4, 5, 6])('line %i: is up before it is met', (n) => {
    expect(first(thresholds[n - 1], false)).toBeGreaterThanOrEqual(brief.lines[n - 1].at + fade);
  });

  it.each([1, 2, 3, 4, 5, 6])('line %i: stays the newest line for its reading time', (n) => {
    const line = brief.lines[n - 1];
    const page = section.pages.findIndex((p) => p.beats.includes(brief));
    const next = brief.lines[n]?.at ?? pageOut(section.pages, page);
    expect((next - line.at) * section.length + 1e-9, `line ${n} (${line.words} words)`).toBeGreaterThanOrEqual(lineBudget(line.words));
  });
});

/**
 * Act I asks nothing of the reader's eye for colour (the author, 2026-10-05): its narration never
 * says which colour the motes are, or calls them dots. The alt text still may: it describes the
 * picture for a screen reader.
 */
const ACT_I = ['vibe-build', 'reveal', 'rewind', 'spec'];
const COLOUR_WORDS = /\b(blue|gold|orange|dots?|colou?rs?)\b/i;

describe('Act I narration', () => {
  it('covers every Act I section', () => {
    expect(story.map((s) => s.id)).toEqual(expect.arrayContaining(ACT_I));
  });

  it.each(ACT_I)('%s says nothing of colours or dots', (id) => {
    const section = story.find((s) => s.id === id) as StorySection;
    for (const b of section.pages.flatMap((p) => p.beats)) expect(b.text, b.id).not.toMatch(COLOUR_WORDS);
  });

  it('is checked by a pattern that catches every word on the list, and only whole words', () => {
    for (const w of ['blue', 'Gold', 'orange', 'dot', 'dots', 'colour', 'colours', 'color', 'colors']) {
      expect(`The ${w} here.`, w).toMatch(COLOUR_WORDS);
    }
    expect('a dotted line in golden dotage').not.toMatch(COLOUR_WORDS);
  });
});

/**
 * Act II's words fence (docs/specs/2026-10-06-act-2-storyboard-and-network.md §1; script draft 4,
 * "Words"): its narration names rules, plans, code, a defect and a reviewer, and leaves the picture
 * its own words: no colour or dot word (the Act I list), none of the stacks' (stack, cube, stream,
 * crack, ring, glow) and none of the galaxy's (galaxy, planet, moon, star, orbit, track, atom), each
 * singular or plural. The alt text may use any of them. And it never says "system": draft 4 had it
 * land once, in a line of its own after ly-5, which the author deleted (2026-10-09: the word is
 * ambiguous here), and it is not to move anywhere else.
 */
const ACT_II = ['zoom-out', 'layers', 'far', 'defect', 'spread', 'reviewer', 'trace', 'fix', 'lesson'];
const PICTURE_WORDS = /\b(stacks?|cubes?|streams?|cracks?|rings?|glows?|galax(y|ies)|planets?|moons?|stars?|orbits?|tracks?|atoms?)\b/i;
/** The word Act II's narration never says (the author's deletion of ly-6). */
const SYSTEM_NEVER = /\bsystems?\b/i;

describe('Act II narration', () => {
  it('covers every section after Act I: each section is in one act or the other', () => {
    expect(story.map((s) => s.id)).toEqual([...ACT_I, ...ACT_II]);
  });

  it.each(ACT_II)('%s says nothing of colours, dots or the picture', (id) => {
    const section = story.find((s) => s.id === id) as StorySection;
    for (const b of section.pages.flatMap((p) => p.beats)) {
      expect(b.text, b.id).not.toMatch(COLOUR_WORDS);
      expect(b.text, b.id).not.toMatch(PICTURE_WORDS);
    }
  });

  it('is checked by a pattern that catches every picture word, and only whole words', () => {
    const words = [
      ...['stack', 'Stacks', 'cube', 'cubes', 'stream', 'streams', 'crack', 'cracks', 'ring', 'rings', 'glow', 'Glows'],
      ...['galaxy', 'Galaxies', 'planet', 'planets', 'moon', 'Moons', 'star', 'stars', 'orbit', 'orbits', 'track', 'tracks', 'atom', 'atoms'],
    ];
    for (const w of words) expect(`The ${w} here.`, w).toMatch(PICTURE_WORDS);
    expect('a ringing, glowing, cracked restream of cubed stacking').not.toMatch(PICTURE_WORDS);
    // Whole words only: "starts" (ly-2) and the rest of these are not the picture's.
    expect('it starts, starring the planetary moonlight, tracked in orbital galactic atomic startups').not.toMatch(PICTURE_WORDS);
  });

  it('never says "system"', () => {
    const said = story
      .filter((s) => ACT_II.includes(s.id))
      .flatMap((s) => s.pages.flatMap((p) => p.beats))
      .filter((b) => SYSTEM_NEVER.test(b.text))
      .map((b) => b.id);
    expect(said).toEqual([]);
    // Whole words, singular or plural: the pattern is not fooled by case, and not by a longer word.
    for (const w of ['system', 'System', 'systems']) expect(`One ${w} here.`, w).toMatch(SYSTEM_NEVER);
    expect('systematic, ecosystem').not.toMatch(SYSTEM_NEVER);
  });
});

describe('the brief', () => {
  // Sync fence: the story names bike parts in `data-parts`, the mechanism owns the ids.
  const tokens = story
    .flatMap((s) => [...s.body.matchAll(/data-parts="([^"]*)"/g)].map((m) => m[1]))
    .flatMap((attr) => attr.split(/\s+/).filter((t) => t !== ''));

  it('names at least one part', () => {
    expect(tokens.length).toBeGreaterThan(0);
  });

  it('only names parts the bike has', () => {
    const unmatched = tokens.filter((t) => !mechanisms.bike.parts.some((p) => matchesPart(t, p.id)));
    expect(unmatched).toEqual([]);
  });

  it('ticks its lines in reading order on the bike: thresholds never fall down the list', () => {
    const lines = story
      .flatMap((s) => [...s.body.matchAll(/data-parts="([^"]*)"/g)])
      .map((m) => ({ parts: parsePartList(m[1]) }));
    const at = briefThresholds(lines, mechanisms.bike);
    expect(at.length).toBeGreaterThan(1);
    for (let i = 1; i < at.length; i++) expect(at[i], `line ${i + 1}`).toBeGreaterThanOrEqual(at[i - 1]);
  });

  it('opens on the ask, with no label above it', () => {
    const body = story.map((s) => s.body).join('\n');
    expect(body).toMatch(/<div class="brief">\s*<p class="brief-ask">/);
    expect(body).not.toContain('brief-label');
  });
});

describe('denylist matching', () => {
  const section = (body: string, alt = '') =>
    parseSection(`---\nid: x\nlength: 1\nalt: ${alt}\n---\n<!-- beat id=a at=0 -->\n${body}`, 'f.md');

  it('matches terms containing an ampersand, which markdown renders as an entity', () => {
    const s = section('We shipped it to AT&T last week.');
    expect(s.pages[0].beats[0].html).toContain('AT&amp;T');
    expect(denylistHit(s, ['at&t'])).toBeDefined();
  });

  it('matches terms containing an apostrophe or a double quote', () => {
    const s = section('Visit Joe\'s Diner, or "The Hub" downtown.');
    expect(s.pages[0].beats[0].html).not.toContain("Joe's");
    expect(denylistHit(s, ["joe's diner"])).toBeDefined();
    expect(denylistHit(s, ['"the hub"'])).toBeDefined();
  });

  it('matches case-insensitively, in alt, and across inline markup boundaries', () => {
    expect(denylistHit(section('plain', 'An ACME & Sons crate'), ['acme & sons'])).toBe('alt');
    expect(denylistHit(section('Say **Acme** now'), ['acme'])).toBeDefined();
  });

  it('does not match when the term is absent', () => {
    expect(denylistHit(section("Don't panic about Q&A."), ['at&t', "joe's"])).toBeUndefined();
    expect(denylistHit(section('anything'), [])).toBeUndefined();
  });

  it('parses the denylist file, skipping blanks and comments', () => {
    expect(parseDenylist('# c\n\n  AT&T  \r\nJoe\'s\n')).toEqual(['at&t', "joe's"]);
  });
});
