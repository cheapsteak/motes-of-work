import { describe, expect, it } from 'vitest';
import { loadStory, parseSection, type StorySection } from './loader';

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

describe('story content lint', () => {
  it('has at least one section', () => {
    expect(story.length).toBeGreaterThan(0);
  });

  it('has unique section ids', () => {
    const ids = story.map((s) => s.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });

  describe.each(story.map((s) => [s.file, s] as const))('%s', (_file, section) => {
    it('has at most 80 words', () => {
      expect(section.words).toBeLessThanOrEqual(80);
    });

    it.each(PATTERNS)('has no %s in body or alt', (_name, re) => {
      for (const [where, text] of lintTexts(section)) expect(text, where).not.toMatch(re);
    });

    it('contains no term from the local denylist', () => {
      // Report only the location, never the term, so the list is not echoed into CI logs.
      expect(denylistHit(section, localDenylist), 'location of a denylist match').toBeUndefined();
    });
  });
});

describe('denylist matching', () => {
  const section = (body: string, alt = '') =>
    parseSection(`---\nid: x\nlength: 1\nalt: ${alt}\n---\n${body}`, 'f.md');

  it('matches terms containing an ampersand, which markdown renders as an entity', () => {
    const s = section('We shipped it to AT&T last week.');
    expect(s.html).toContain('AT&amp;T');
    expect(denylistHit(s, ['at&t'])).toBeDefined();
  });

  it('matches terms containing an apostrophe or a double quote', () => {
    const s = section('Visit Joe\'s Diner, or "The Hub" downtown.');
    expect(s.html).not.toContain("Joe's");
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
