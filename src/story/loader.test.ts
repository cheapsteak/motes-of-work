import { describe, expect, it } from 'vitest';
import { parseSection } from './loader';

/** A section file with the given body under minimal front matter. */
const file = (body: string, meta = 'id: x\nlength: 1') => `---\n${meta}\n---\n${body}`;
/** The body of a one-beat section. */
const one = (md: string) => `<!-- beat id=a at=0 -->\n${md}\n`;

const fixture = `---
id: vibe-build
length: 6
alt: A cloud of blue dots
draft: true
---

<!-- beat id=vb-1 at=0 -->
You want a *bike*.

<!-- beat id=vb-2 at=0.05 -->
So you write it down.

<!-- page -->
<!-- beat id=vb-brief at=0.23 document -->
<div class="brief">
<p class="brief-ask">Build me a bike.</p>
<ul class="brief">
<li data-parts="saddle" data-at="0.3">A seat.</li>
<li data-parts="frame" data-at="0.5">A frame, light.</li>
</ul>
</div>

<!-- page -->
<!-- beat id=vb-4 at=0.87 -->
Done.
`;

describe('parseSection', () => {
  it('parses front matter fields with their types', () => {
    const s = parseSection(fixture, '01-vibe-build.md');
    expect(s.id).toBe('vibe-build');
    expect(s.length).toBe(6);
    expect(s.alt).toBe('A cloud of blue dots');
    expect(s.draft).toBe(true);
    expect(s.file).toBe('01-vibe-build.md');
  });

  it('splits the body into pages of beats, each with its id, at, document flag, html, text and words', () => {
    const s = parseSection(fixture, '01-vibe-build.md');
    expect(s.pages.map((p) => p.beats.map((b) => b.id))).toEqual([['vb-1', 'vb-2'], ['vb-brief'], ['vb-4']]);
    const beats = s.pages.flatMap((p) => p.beats);
    expect(beats.map((b) => b.at)).toEqual([0, 0.05, 0.23, 0.87]);
    expect(beats.map((b) => b.document)).toEqual([false, false, true, false]);
    expect(beats[0].html).toContain('<em>bike</em>');
    expect(beats.map((b) => b.text)).toEqual(['You want a bike.', 'So you write it down.', 'Build me a bike. A seat. A frame, light.', 'Done.']);
    expect(beats.map((b) => b.words)).toEqual([4, 5, 9, 1]);
    // The brief's markup is kept whole, so its lines keep their part mapping and their timing.
    expect(beats[2].html).toContain('<li data-parts="saddle" data-at="0.3">A seat.</li>');
    // The section totals, for the section-level lints.
    expect(s.words).toBe(19);
    expect(s.text).toBe('You want a bike. So you write it down. Build me a bike. A seat. A frame, light. Done.');
  });

  it("reads a document's lines: each one's data-at and words, in order; other beats have none", () => {
    const beats = parseSection(fixture, 'f.md').pages.flatMap((p) => p.beats);
    expect(beats[2].lines).toEqual([
      { at: 0.3, words: 2 },
      { at: 0.5, words: 3 },
    ]);
    for (const i of [0, 1, 3]) expect(beats[i].lines).toEqual([]);
  });

  it('renders each beat on its own: a beat never swallows the marker of the next', () => {
    const s = parseSection(fixture, 'f.md');
    for (const b of s.pages.flatMap((p) => p.beats)) expect(b.html).not.toContain('<!--');
  });

  it('defaults draft to false, and alt to empty', () => {
    const s = parseSection(file(one('Hello world')), 'x.md');
    expect(s.draft).toBe(false);
    expect(s.alt).toBe('');
  });

  it('counts beat words with markdown stripped', () => {
    const words = (md: string) => parseSection(file(one(md)), 'f.md').pages[0].beats[0].words;
    expect(words('Some *emphasised* text with a [link](https://example.com) and `code`.')).toBe(8);
    expect(words('**bold** [a b](http://x.y/z) `c`')).toBe(4);
    expect(words('- one\n- two')).toBe(2);
  });

  it('counts contractions, ampersands and entities as one word each', () => {
    const count = (md: string) => parseSection(file(one(md)), 'f.md').words;
    expect(count("Don't")).toBe(1);
    expect(count("Don't stop, it's fine")).toBe(4);
    expect(count('Q&A')).toBe(1);
    expect(count('AT&T and "quoted" words')).toBe(4);
    expect(count('well-known idea')).toBe(2);
    expect(count('a &mdash; b')).toBe(2);
  });

  it('exposes the raw markdown body and entity-decoded plain text', () => {
    const s = parseSection(file(one("AT&T said *don't* now")), 'f.md');
    expect(s.body).toContain("AT&T said *don't* now");
    const beat = s.pages[0].beats[0];
    expect(beat.html).toContain('AT&amp;T');
    expect(beat.text).toBe("AT&T said don't now");
    expect(s.text).not.toContain('&amp;');
    expect(s.text).not.toContain('<em>');
  });

  it('tolerates CRLF line endings', () => {
    const s = parseSection('---\r\nid: x\r\nlength: 2\r\n---\r\n<!-- beat id=a at=0 -->\r\nHi there\r\n', 'f.md');
    expect(s.id).toBe('x');
    expect(s.length).toBe(2);
    expect(s.words).toBe(2);
  });

  it('throws naming the file when front matter is absent', () => {
    expect(() => parseSection('just text', 'nofront.md')).toThrow(/nofront\.md/);
    expect(() => parseSection('---\nid: x\nlength: 1\nno closing fence', 'unclosed.md')).toThrow(/unclosed\.md/);
  });

  it('throws naming the file when id is missing', () => {
    expect(() => parseSection(file(one('body'), 'length: 1'), 'noid.md')).toThrow(/noid\.md.*id/);
  });

  it.each([['0'], ['-2'], ['abc'], ['']])('throws naming the file when length is %j', (len) => {
    expect(() => parseSection(file(one('body'), `id: x\nlength: ${len}`), 'badlen.md')).toThrow(/badlen\.md.*length/);
  });

  it('throws naming the file when length is missing', () => {
    expect(() => parseSection(file(one('body'), 'id: x'), 'nolen.md')).toThrow(/nolen\.md.*length/);
  });

  it('throws on a malformed front matter line', () => {
    expect(() => parseSection(file(one('body'), 'id x\nlength: 1'), 'malformed.md')).toThrow(/malformed\.md/);
  });

  describe('beat markers', () => {
    const bad = (body: string) => () => parseSection(file(body), 'bad.md');

    it.each([
      ['no beat at all', 'Just words.'],
      ['text before the first beat', 'Stray.\n<!-- beat id=a at=0 -->\nA.'],
      ['a beat with no id', '<!-- beat at=0 -->\nA.'],
      ['a beat with no at', '<!-- beat id=a -->\nA.'],
      ['an at that is not a number', '<!-- beat id=a at=soon -->\nA.'],
      ['an at of 1', '<!-- beat id=a at=0 -->\nA.\n<!-- beat id=b at=1 -->\nB.'],
      ['a negative at', '<!-- beat id=a at=-0.1 -->\nA.'],
      ['a first beat not at 0', '<!-- beat id=a at=0.1 -->\nA.'],
      ['a duplicate id', '<!-- beat id=a at=0 -->\nA.\n<!-- beat id=a at=0.5 -->\nB.'],
      ['an at that does not increase', '<!-- beat id=a at=0 -->\nA.\n<!-- beat id=b at=0.5 -->\nB.\n<!-- beat id=c at=0.5 -->\nC.'],
      ['an at that goes back', '<!-- beat id=a at=0 -->\nA.\n<!-- beat id=b at=0.5 -->\nB.\n<!-- beat id=c at=0.4 -->\nC.'],
      ['an unknown attribute', '<!-- beat id=a at=0 loud -->\nA.'],
      ['an empty beat', '<!-- beat id=a at=0 -->\n\n<!-- beat id=b at=0.5 -->\nB.'],
      ['a page with no beat', '<!-- beat id=a at=0 -->\nA.\n<!-- page -->\n'],
      ['a page marker before the first beat', '<!-- page -->\n<!-- beat id=a at=0 -->\nA.'],
      ['a page marker with text after it', '<!-- beat id=a at=0 -->\nA.\n<!-- page -->\nB.\n<!-- beat id=b at=0.5 -->\nC.'],
    ])('throws naming the file on %s', (_why, body) => {
      expect(bad(body)).toThrow(/bad\.md/);
    });

    // `out=` on a page's last beat takes the page away there, instead of where the next page comes up.
    // Length 1, so a fade is 0.1.
    describe('an explicit page out', () => {
      const next = '\n<!-- page -->\n<!-- beat id=b at=0.8 -->\nB.';

      it('sets the page out, and leaves a page without one to the next page', () => {
        const s = parseSection(file(`<!-- beat id=a at=0 out=0.5 -->\nA.${next}`), 'ok.md');
        expect(s.pages.map((p) => p.out)).toEqual([0.5, undefined]);
        expect(s.pages[0].beats[0].at).toBe(0);
      });

      it('takes the out of the last of several beats on a page', () => {
        const s = parseSection(file(`<!-- beat id=a at=0 -->\nA.\n<!-- beat id=c at=0.2 out=0.6 -->\nC.${next}`), 'ok.md');
        expect(s.pages[0].out).toBe(0.6);
      });

      it('allows an out up to the next page, and up to the end of the section on its last page', () => {
        expect(parseSection(file(`<!-- beat id=a at=0 out=0.8 -->\nA.${next}`), 'ok.md').pages[0].out).toBeUndefined();
        expect(parseSection(file('<!-- beat id=a at=0 out=1 -->\nA.'), 'ok.md').pages[0].out).toBeUndefined();
        expect(parseSection(file('<!-- beat id=a at=0 out=0.6 -->\nA.'), 'ok.md').pages[0].out).toBe(0.6);
      });

      it.each([
        ['an out on a beat that is not last on its page', `<!-- beat id=a at=0 out=0.5 -->\nA.\n<!-- beat id=c at=0.6 -->\nC.${next}`],
        ['an out that is not a number', '<!-- beat id=a at=0 out=soon -->\nA.'],
        ['an out of the same at', '<!-- beat id=a at=0.2 out=0.2 -->\nA.'],
        ['an out before its at', '<!-- beat id=a at=0.5 out=0.3 -->\nA.'],
        ['a negative out', '<!-- beat id=a at=0 out=-0.2 -->\nA.'],
        ['an out past the end of the section', '<!-- beat id=a at=0 out=1.5 -->\nA.'],
        ['an out with no room for the beat to come up and the page to fade', '<!-- beat id=a at=0 out=0.1 -->\nA.'],
        ['an out past the next page', `<!-- beat id=a at=0 out=0.9 -->\nA.${next}`],
        ['an out that leaves a document line no time to come up', '<!-- beat id=a at=0 out=0.5 document -->\n<ul class="brief">\n<li data-at="0.45">One.</li>\n</ul>'],
      ])('throws naming the file on %s', (_why, body) => {
        expect(bad(body)).toThrow(/bad\.md/);
      });

      it('names the out in the message', () => {
        expect(bad('<!-- beat id=a at=0 out=0.1 -->\nA.')).toThrow(/out/);
        expect(bad(`<!-- beat id=a at=0 out=0.5 -->\nA.\n<!-- beat id=c at=0.6 -->\nC.${next}`)).toThrow(/out.*last beat/);
      });
    });

    // A document's lines come up one at a time (docs/specs/2026-10-05-act-1-build-and-orbit.md §2.5):
    // the first after the ask has come up alone, each after the one before, the last with time to
    // come up before the page goes. Length 1, so a fade is 0.1.
    const brief = (lines: string, next = '\n<!-- page -->\n<!-- beat id=c at=0.8 -->\nC.') =>
      `<!-- beat id=a at=0 -->\nA.\n<!-- page -->\n<!-- beat id=b at=0.2 document -->\n<ul class="brief">\n${lines}\n</ul>${next}`;

    it('accepts brief lines that come up in order, inside the page', () => {
      const s = parseSection(file(brief('<li data-at="0.3">One.</li>\n<li data-at="0.5">Two.</li>')), 'ok.md');
      expect(s.pages[1].beats[0].lines.map((l) => l.at)).toEqual([0.3, 0.5]);
    });

    it.each([
      ['a document line with no data-at', '<li data-at="0.3">One.</li>\n<li>Two.</li>'],
      ['a data-at that is not a number', '<li data-at="soon">One.</li>'],
      ['lines out of order', '<li data-at="0.5">One.</li>\n<li data-at="0.4">Two.</li>'],
      ['two lines at once', '<li data-at="0.4">One.</li>\n<li data-at="0.4">Two.</li>'],
      ['a first line before the ask has come up alone', '<li data-at="0.25">One.</li>'],
      ['a last line with no time to come up before the page goes', '<li data-at="0.7">One.</li>'],
    ])('throws naming the file and the beat on %s', (_why, lines) => {
      expect(bad(brief(lines))).toThrow(/bad\.md.*\bb\b/);
    });

    it('measures the last line against the section end when its page is the last', () => {
      expect(bad(brief('<li data-at="0.95">One.</li>', ''))).toThrow(/bad\.md/);
      expect(parseSection(file(brief('<li data-at="0.85">One.</li>', '')), 'ok.md').pages[1].beats[0].lines).toHaveLength(1);
    });

    it('throws on a data-at outside a document', () => {
      expect(bad('<!-- beat id=a at=0 -->\n<ul><li data-at="0.3">One.</li></ul>')).toThrow(/bad\.md.*\ba\b/);
    });

    it('names the beat in the message', () => {
      expect(bad('<!-- beat id=a at=0 -->\nA.\n<!-- beat id=b at=0 -->\nB.')).toThrow(/bad\.md.*\bb\b/);
    });
  });
});
