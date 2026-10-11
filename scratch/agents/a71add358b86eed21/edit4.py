p = '/home/user/motes-of-work/src/story/loader.ts'
s = open(p).read()
s = s.replace("""import { marked } from 'marked';
""", """import { marked } from 'marked';
import { fadeWidth } from './reveal';

/** One line of a document (the brief): it comes up on its own, at `at`. */
export interface BeatLine {
  /** Section-local progress at which it starts to come up, from its `data-at`. */
  at: number;
  words: number;
}
""", 1)
s = s.replace("""  html: string;
  /** Rendered markdown as plain text: tags stripped, entities decoded, whitespace collapsed. */
  text: string;
  words: number;
}""", """  html: string;
  /** Rendered markdown as plain text: tags stripped, entities decoded, whitespace collapsed. */
  text: string;
  words: number;
  /**
   * A document's lines (`<li data-at>`), each absent until its own `at`, in order; empty for any
   * other beat. The document's own text (the ask) comes up at the beat's `at`.
   */
  lines: BeatLine[];
}""", 1)
s = s.replace("""    const beat: Beat = { id: open.id, at: open.at, document: open.document, html, text, words: countWords(text) };""",
"""    const lines = documentLines(html, open.id, open.document, file);
    const beat: Beat = { id: open.id, at: open.at, document: open.document, html, text, words: countWords(text), lines };""")
s = s.replace("""/**
 * The pages of a body, split on the marker lines BEFORE markdown,""", """const LIST_ITEM = /<li\\b([^>]*)>([\\s\\S]*?)<\\/li>/gi;
const DATA_AT = /\\bdata-at\\s*=\\s*"([^"]*)"/i;

/**
 * A document beat's lines: every `<li>` in it, each with its `data-at` (required on a document's
 * lines, and allowed nowhere else) and its words.
 */
function documentLines(html: string, id: string, document: boolean, file: string): BeatLine[] {
  const lines: BeatLine[] = [];
  for (const m of html.matchAll(LIST_ITEM)) {
    const raw = DATA_AT.exec(m[1])?.[1];
    if (!document) {
      if (raw !== undefined) fail(file, `beat ${id}: data-at is only for a document's lines`);
      continue;
    }
    const at = raw === undefined || raw.trim() === '' ? NaN : Number(raw);
    if (!Number.isFinite(at) || at < 0 || at >= 1) {
      fail(file, `beat ${id}: every line of a document needs a data-at in [0, 1) (got ${JSON.stringify(raw ?? null)})`);
    }
    lines.push({ at, words: countWords(htmlToText(m[2])) });
  }
  return lines;
}

/**
 * A document's lines come up one at a time inside their page: the first only once the document's
 * own text (the ask) has come up alone, each after the one before, and the last in time to be up
 * before the page goes (docs/specs/2026-10-05-act-1-build-and-orbit.md §2.5).
 */
function checkLines(pages: Page[], length: number, file: string): void {
  const fade = fadeWidth(length);
  pages.forEach((page, pi) => {
    const out = pages[pi + 1]?.beats[0].at ?? 1;
    for (const beat of page.beats) {
      beat.lines.forEach((line, i) => {
        const after = i === 0 ? beat.at + fade : beat.lines[i - 1].at;
        const ok = i === 0 ? line.at >= after - 1e-12 : line.at > after;
        if (!ok) {
          fail(file, `beat ${beat.id}: line ${i + 1} at ${line.at} must come ${i === 0 ? 'once the beat has come up, at or after' : 'after'} ${after}`);
        }
      });
      const last = beat.lines[beat.lines.length - 1];
      if (last && !(last.at + fade < out)) {
        fail(file, `beat ${beat.id}: its last line at ${last.at} must be up before its page goes at ${out}`);
      }
    }
  });
}

/**
 * The pages of a body, split on the marker lines BEFORE markdown,""", 1)
s = s.replace("""  const pages = parsePages(body, file);""", """  const pages = parsePages(body, file);
  checkLines(pages, length, file);""", 1)
open(p, 'w').write(s)
