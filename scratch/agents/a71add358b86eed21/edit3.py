p = '/home/user/motes-of-work/src/story/loader.test.ts'
s = open(p).read()
s = s.replace('''<li data-parts="saddle">A seat.</li>
</ul>''', '''<li data-parts="saddle" data-at="0.3">A seat.</li>
<li data-parts="frame" data-at="0.5">A frame, light.</li>
</ul>''')
s = s.replace('''    expect(beats.map((b) => b.text)).toEqual(['You want a bike.', 'So you write it down.', 'Build me a bike. A seat.', 'Done.']);
    expect(beats.map((b) => b.words)).toEqual([4, 5, 6, 1]);
    // The brief's markup is kept whole, so its lines keep their part mapping.
    expect(beats[2].html).toContain('<li data-parts="saddle">A seat.</li>');
    // The section totals, for the section-level lints.
    expect(s.words).toBe(16);
    expect(s.text).toBe('You want a bike. So you write it down. Build me a bike. A seat. Done.');''', '''    expect(beats.map((b) => b.text)).toEqual(['You want a bike.', 'So you write it down.', 'Build me a bike. A seat. A frame, light.', 'Done.']);
    expect(beats.map((b) => b.words)).toEqual([4, 5, 9, 1]);
    // The brief's markup is kept whole, so its lines keep their part mapping and their timing.
    expect(beats[2].html).toContain('<li data-parts="saddle" data-at="0.3">A seat.</li>');
    // The section totals, for the section-level lints.
    expect(s.words).toBe(19);
    expect(s.text).toBe('You want a bike. So you write it down. Build me a bike. A seat. A frame, light. Done.');''')
s = s.replace('''  it('renders each beat on its own: a beat never swallows the marker of the next', () => {''', '''  it("reads a document's lines: each one's data-at and words, in order; other beats have none", () => {
    const beats = parseSection(fixture, 'f.md').pages.flatMap((p) => p.beats);
    expect(beats[2].lines).toEqual([
      { at: 0.3, words: 2 },
      { at: 0.5, words: 3 },
    ]);
    for (const i of [0, 1, 3]) expect(beats[i].lines).toEqual([]);
  });

  it('renders each beat on its own: a beat never swallows the marker of the next', () => {''')
s = s.replace('''    it('names the beat in the message', () => {''', '''    // A document's lines come up one at a time (docs/specs/2026-10-05-act-1-build-and-orbit.md §2.5):
    // the first after the ask has come up alone, each after the one before, the last with time to
    // come up before the page goes. Length 1, so a fade is 0.1.
    const brief = (lines: string, next = '\\n<!-- page -->\\n<!-- beat id=c at=0.8 -->\\nC.') =>
      `<!-- beat id=a at=0 -->\\nA.\\n<!-- page -->\\n<!-- beat id=b at=0.2 document -->\\n<ul class="brief">\\n${lines}\\n</ul>${next}`;

    it('accepts brief lines that come up in order, inside the page', () => {
      const s = parseSection(file(brief('<li data-at="0.3">One.</li>\\n<li data-at="0.5">Two.</li>')), 'ok.md');
      expect(s.pages[1].beats[0].lines.map((l) => l.at)).toEqual([0.3, 0.5]);
    });

    it.each([
      ['a document line with no data-at', '<li data-at="0.3">One.</li>\\n<li>Two.</li>'],
      ['a data-at that is not a number', '<li data-at="soon">One.</li>'],
      ['lines out of order', '<li data-at="0.5">One.</li>\\n<li data-at="0.4">Two.</li>'],
      ['two lines at once', '<li data-at="0.4">One.</li>\\n<li data-at="0.4">Two.</li>'],
      ['a first line before the ask has come up alone', '<li data-at="0.25">One.</li>'],
      ['a last line with no time to come up before the page goes', '<li data-at="0.7">One.</li>'],
    ])('throws naming the file and the beat on %s', (_why, lines) => {
      expect(bad(brief(lines))).toThrow(/bad\\.md.*\\bb\\b/);
    });

    it('measures the last line against the section end when its page is the last', () => {
      expect(bad(brief('<li data-at="0.95">One.</li>', ''))).toThrow(/bad\\.md/);
      expect(parseSection(file(brief('<li data-at="0.85">One.</li>', '')), 'ok.md').pages[1].beats[0].lines).toHaveLength(1);
    });

    it('throws on a data-at outside a document', () => {
      expect(bad('<!-- beat id=a at=0 -->\\n<ul><li data-at="0.3">One.</li></ul>')).toThrow(/bad\\.md.*\\ba\\b/);
    });

    it('names the beat in the message', () => {''')
open(p, 'w').write(s)
