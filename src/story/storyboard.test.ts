import { describe, expect, it } from 'vitest';
import { loadStory } from './loader';
import { pageOut } from './reveal';

// Sync fence: each act's storyboard is the designed snapshot of its copy and timing; src/story/*.md
// is the source of truth. The test parses each storyboard's tables and compares them, whole, with the
// loaded beats of the sections it covers, so neither can change without the other. Fix a failure by
// updating whichever side is behind.

interface Board {
  doc: string;
  /** The story sections this storyboard covers, in story order. */
  sections: string[];
  /** The heading that ends its storyboard proper (§2's tables). */
  timingsEnd: string;
}

/** Every storyboard, and the sections it covers; every section of the story is covered by one. */
const BOARDS: Board[] = [
  {
    doc: 'docs/specs/2026-10-04-act-1-storyboard-and-text-engine.md',
    sections: ['vibe-build', 'reveal', 'rewind', 'spec'],
    timingsEnd: '### 2.5',
  },
  {
    doc: 'docs/specs/2026-10-06-act-2-storyboard-and-network.md',
    sections: ['zoom-out', 'layers', 'far', 'defect', 'spread', 'reviewer', 'trace', 'fix', 'lesson'],
    timingsEnd: '### 2.10',
  },
];

const specDocs: Record<string, string> = import.meta.glob('/docs/specs/*.md', { query: '?raw', import: 'default', eager: true });
function read(doc: string): string {
  const text = specDocs[`/${doc}`] ?? '';
  if (text === '') throw new Error(`${doc} not found`);
  return text;
}

/** The text between a heading line starting with `from` and the next starting with `to`. */
function between(text: string, from: string, to: string, doc: string): string {
  const a = text.indexOf(`\n${from}`);
  const b = text.indexOf(`\n${to}`, a + 1);
  if (a < 0 || b < 0) throw new Error(`${doc}: no "${from}" ... "${to}" in the storyboard`);
  return text.slice(a, b);
}

/** Table rows whose first cell is a beat id (`vb-1`, `rv-3`, `vb-brief (document)`), as trimmed cells. */
function beatRows(text: string): string[][] {
  return text
    .split('\n')
    .filter((line) => line.startsWith('|'))
    .map((line) => line.slice(1, -1).split('|').map((c) => c.trim()))
    .filter((cells) => /^[a-z]{2}-[\w-]+( \(document\))?$/.test(cells[0]));
}

const beatId = (cell: string) => cell.replace(/ \(document\)$/, '');

/** A copy cell as plain text: emphasis dropped, the brief's ` · ` line breaks as spaces. */
function plain(cell: string, doc = 'the storyboard'): { text: string; words: number } {
  const m = /^(.*) \((\d+)\)$/.exec(cell);
  if (!m) throw new Error(`${doc}: copy cell has no word count in brackets: ${cell}`);
  return { text: m[1].replace(/\*/g, '').replace(/ · /g, ' ').replace(/\s+/g, ' ').trim(), words: Number(m[2]) };
}

/** A storyboard's §2 cut at each `### 2.N <section id>` heading: the heading line and the rows under it. */
function timingBlocks(board: string): { id: string; heading: string; rows: string[][] }[] {
  const parts = board.split(/\n(?=### 2\.\d+ )/).filter((p) => p.startsWith('### 2.'));
  return parts.map((p) => ({
    id: /^### 2\.\d+ ([a-z][a-z-]*)/.exec(p)?.[1] ?? '',
    heading: p.split('\n')[0],
    rows: beatRows(p),
  }));
}

const story = loadStory();
const beats = story.flatMap((s, si) =>
  s.pages.flatMap((p, pi) => p.beats.map((b) => ({ ...b, section: s.id, sectionIndex: si, page: pi + 1 }))),
);

describe('the storyboards cover the story', () => {
  it('covers every section exactly once, each in story order', () => {
    expect(BOARDS.flatMap((b) => b.sections).sort()).toEqual(story.map((s) => s.id).sort());
    for (const b of BOARDS) {
      const order = b.sections.map((id) => story.findIndex((s) => s.id === id));
      expect(order, b.doc).toEqual([...order].sort((x, y) => x - y));
    }
  });
});

describe.each(BOARDS.map((b) => [b.doc, b] as const))('%s', (DOC, board) => {
  const doc = read(DOC);
  const covered = beats.filter((b) => board.sections.includes(b.section));
  const timings = between(doc, '## 2.', board.timingsEnd, DOC);
  // Every block and every row of the storyboard is claimed by one of the board's sections: nothing is
  // filtered out, so a row or a heading that no section claims fails the fence rather than being skipped.
  const blocks = timingBlocks(timings);

  describe('the copy matches the storyboard (§1)', () => {
    const copy = beatRows(between(doc, '## 1.', '## 2.', DOC))
      .map((cells) => ({
        id: beatId(cells[0]),
        document: cells[0].endsWith('(document)'),
        page: cells.length === 3 ? Number(cells[1]) : undefined,
        ...plain(cells[cells.length - 1], DOC),
      }));
    const update = `update §1 of ${DOC} (or src/story/*.md) so the storyboard and the story agree`;

    it('has the same beats, in the same order, and no row of §1 goes unclaimed', () => {
      expect(copy.length).toBeGreaterThan(0);
      expect(
        covered.map((b) => b.id),
        update,
      ).toEqual(copy.map((c) => c.id));
    });

    it.each(covered.map((b) => [b.id, b] as const))('%s says what the storyboard says', (id, beat) => {
      const row = copy.find((c) => c.id === id);
      expect(row, update).toBeDefined();
      if (!row) return;
      expect(beat.text, update).toBe(row.text);
      expect(beat.words, `${update} (the word count in brackets)`).toBe(row.words);
      expect(beat.document, update).toBe(row.document);
      if (row.page !== undefined) expect(beat.page, update).toBe(row.page);
    });
  });

  describe('the beat timings match the storyboard (§2)', () => {
    const update = `update §2 of ${DOC} (or the beat markers in src/story/*.md) so they agree`;

    it.each(board.sections)('%s has the length the storyboard gives it', (id) => {
      const section = story.find((s) => s.id === id);
      expect(section, `no section ${id} in src/story`).toBeDefined();
      const m = new RegExp(`### 2\\.\\d+ ${id}\\b[^\\n]*\\(L = (\\d+(?:\\.\\d+)?)`).exec(timings);
      expect(m, `no "### 2.x ${id} (L = ...)" heading: ${update}`).not.toBeNull();
      expect(section?.length, update).toBe(Number(m?.[1]));
    });

    it('times every beat, on its page, from where its row says it appears, and no row of §2 goes unclaimed', () => {
      expect(blocks.map((b) => b.id), `a "### 2.x <section>" heading for each covered section: ${update}`).toEqual(board.sections);
      // A beat row outside every "### 2.x" block (above the first heading) would be claimed by none.
      expect(beatRows(timings).length, `a beat row outside any "### 2.x <section>" block: ${update}`).toBe(
        blocks.reduce((n, b) => n + b.rows.length, 0),
      );
      const rows = blocks.flatMap((b) =>
        b.rows.map((cells) => ({
          id: beatId(cells[0]),
          section: b.id,
          page: Number(cells[1]),
          at: Number(/\d+(?:\.\d+)?/.exec(cells[2])?.[0]),
        })),
      );
      expect(
        rows.map((r) => `${r.section}/${r.id}`),
        update,
      ).toEqual(covered.map((b) => `${b.section}/${b.id}`));
      for (const b of covered) {
        const row = rows.find((r) => r.id === b.id);
        expect({ at: b.at, page: b.page }, `${b.id}: ${update}`).toEqual({ at: row?.at, page: row?.page });
      }
    });

    it('takes each page away where its last row says "page out ends" or "fade-out ends", an explicit out included', () => {
      const claimed = blocks.flatMap((b) =>
        b.rows.flatMap((cells) => {
          const m = /(?:page out|fade-out) ends (\d+(?:\.\d+)?)/.exec(cells[2]);
          return m ? [{ id: beatId(cells[0]), section: b.id, page: Number(cells[1]), out: Number(m[1]) }] : [];
        }),
      );
      expect(claimed.length, 'the storyboard gives some page-out').toBeGreaterThan(0);
      for (const c of claimed) {
        const section = story.find((s) => s.id === c.section);
        const page = section?.pages[c.page - 1];
        expect(page, `${c.id}: ${update}`).toBeDefined();
        if (!section || !page) continue;
        expect(page.beats[page.beats.length - 1].id, `${c.id} is the last beat of its page: ${update}`).toBe(c.id);
        expect(pageOut(section.pages, c.page - 1), `${c.id}: where its page is gone: ${update}`).toBeCloseTo(c.out, 9);
      }
    });
  });
});

// The cold open's round-2 design (docs/specs/2026-10-05-act-1-build-and-orbit.md) amends the
// storyboard's vibe-build copy and gives each brief line its own timing; its §1 table and its §2.5
// markdown are fenced too, so the design and the story cannot drift apart either.
const ROUND2 = 'docs/specs/2026-10-05-act-1-build-and-orbit.md';
const round2 = read(ROUND2);

describe(`the cold open matches its round-2 design (${ROUND2} §1, §2.5)`, () => {
  const update = `update ${ROUND2} (or src/story/01-vibe-build.md) so they agree`;
  const vibeBuild = story[0];
  const beatsOf = vibeBuild.pages.flatMap((p) => p.beats);
  const rows = beatRows(between(round2, '## 1.', '## 2.', ROUND2)).map((cells) => {
    const cell = cells[cells.length - 1];
    const total = / — (\d+) in all$/.exec(cell);
    // A document row counts each of its pieces (the ask, then each line) and gives the total.
    const pieces = (total ? cell.slice(0, total.index) : cell).split(' · ').map((piece) => plain(piece));
    return {
      id: beatId(cells[0]),
      text: pieces.map((p) => p.text).join(' '),
      words: total ? Number(total[1]) : pieces[0].words,
      pieces: pieces.map((p) => p.words),
    };
  });

  it('has the cold open beats, in order, with the same words', () => {
    expect(
      rows.map((r) => r.id),
      update,
    ).toEqual(beatsOf.map((b) => b.id));
    for (const b of beatsOf) {
      const row = rows.find((r) => r.id === b.id);
      expect(row?.text, `${b.id}: ${update}`).toBe(b.text);
      expect(row?.words, `${b.id}: ${update}`).toBe(b.words);
      if (b.lines.length > 0) {
        const ask = b.words - b.lines.reduce((n, l) => n + l.words, 0);
        expect(row?.pieces, `${b.id}, each piece: ${update}`).toEqual([ask, ...b.lines.map((l) => l.words)]);
      }
    }
  });

  it('times the brief as its §2.5 markdown does', () => {
    const section = between(round2, '### 2.5', '## 3.', ROUND2);
    const block = /```markdown\n([\s\S]*?)```/.exec(section)?.[1].trim();
    expect(block, `no markdown block in ${ROUND2} §2.5`).toBeDefined();
    expect(vibeBuild.body, update).toContain(block);
  });
});
