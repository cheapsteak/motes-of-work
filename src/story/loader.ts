import { marked } from 'marked';
import { fadeWidth, pageOut } from './reveal.ts';

/** One line of a document (the brief): it comes up on its own, at `at`. */
export interface BeatLine {
  /** Section-local progress at which it starts to come up, from its `data-at`. */
  at: number;
  words: number;
}

/** One line of a page: a short paragraph, or the brief (a `document` beat). */
export interface Beat {
  id: string;
  /** Section-local progress at which its fade-in begins, in [0, 1). */
  at: number;
  /** A thing handed over (the brief): it never dims and may run past the per-beat word limit. */
  document: boolean;
  /** Rendered markdown. HTML-escaped (`&amp;`, `&#39;`), so never lint or count words on this. */
  html: string;
  /** Rendered markdown as plain text: tags stripped, entities decoded, whitespace collapsed. */
  text: string;
  words: number;
  /**
   * A document's lines (`<li data-at>`), each absent until its own `at`, in order; empty for any
   * other beat. The document's own text (the ask) comes up at the beat's `at`.
   */
  lines: BeatLine[];
}

/** Lines over one picture. A page gives way to the next at opacity 0 (src/story/reveal.ts). */
export interface Page {
  beats: Beat[];
  /**
   * Section-local progress at which the page is gone (its fade-out ends), from the `out=` on its
   * last beat's marker. Absent: the page leaves where the next page's first beat comes up (or at the
   * section's end), so nothing more is on screen after an explicit `out` until the next page's `at`.
   */
  out?: number;
}

export interface StorySection {
  id: string;
  /** Scroll length in viewport heights, > 0. */
  length: number;
  /** Description of the canvas for assistive tech. */
  alt: string;
  draft: boolean;
  pages: Page[];
  /** Raw markdown body, exactly as authored (markers included). */
  body: string;
  /** Every beat's plain text, in order, joined by spaces. */
  text: string;
  /** Words over every beat. */
  words: number;
  file: string;
}

function fail(file: string, why: string): never {
  throw new Error(`story section ${file}: ${why}`);
}

/** Split `---` fenced frontmatter (key: value lines only) from the body. */
function splitFrontmatter(raw: string, file: string): { meta: Map<string, string>; body: string } {
  const lines = raw.replace(/^﻿/, '').split(/\r?\n/);
  if (lines[0]?.trim() !== '---') fail(file, 'missing frontmatter (expected a leading --- line)');
  const close = lines.findIndex((l, i) => i > 0 && l.trim() === '---');
  if (close < 0) fail(file, 'unterminated frontmatter (no closing --- line)');
  const meta = new Map<string, string>();
  for (const line of lines.slice(1, close)) {
    if (line.trim() === '') continue;
    const m = /^([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(line);
    if (!m) fail(file, `malformed frontmatter line ${JSON.stringify(line)}`);
    meta.set(m[1], m[2].trim());
  }
  return { meta, body: lines.slice(close + 1).join('\n') };
}

function unquote(v: string): string {
  const m = /^(["'])(.*)\1$/.exec(v);
  return m ? m[2] : v;
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  mdash: '—',
  ndash: '–',
  hellip: '…',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
};

function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, ref: string) => {
    if (ref[0] === '#') {
      const code = ref[1].toLowerCase() === 'x' ? parseInt(ref.slice(2), 16) : parseInt(ref.slice(1), 10);
      return Number.isInteger(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
    }
    return NAMED_ENTITIES[ref.toLowerCase()] ?? whole;
  });
}

const BLOCK_TAG = /<\/?(?:p|h[1-6]|ul|ol|li|blockquote|pre|br|hr|div|table|thead|tbody|tr|td|th)\b[^>]*>/gi;

/**
 * Plain text of rendered html: block tags become spaces (they separate words),
 * inline tags vanish (so `a<em>b</em>c` stays one word), then entities decode.
 * Decoding comes last so an escaped `&lt;b&gt;` is not mistaken for a tag.
 */
function htmlToText(html: string): string {
  return decodeEntities(html.replace(BLOCK_TAG, ' ').replace(/<[^>]*>/g, ''));
}

/** Whitespace-separated tokens containing a letter or digit, so `Don't` and `Q&A` are one word each. */
function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

const BEAT_MARKER = /^<!--\s*beat\b(.*?)-->$/;
const PAGE_MARKER = /^<!--\s*page\s*-->$/;

/** `id=<id> at=<local> [out=<local>] [document]` of a beat marker. */
function parseMarker(attrs: string, file: string): { id: string; at: number; document: boolean; out?: number } {
  let id = '';
  let atRaw: string | undefined;
  let outRaw: string | undefined;
  let document = false;
  for (const token of attrs.trim().split(/\s+/).filter((t) => t !== '')) {
    const m = /^(id|at|out)=(\S+)$/.exec(token);
    if (m?.[1] === 'id') id = m[2];
    else if (m?.[1] === 'at') atRaw = m[2];
    else if (m?.[1] === 'out') outRaw = m[2];
    else if (token === 'document') document = true;
    else fail(file, `beat marker has an unknown attribute ${JSON.stringify(token)}`);
  }
  if (id === '') fail(file, `a beat marker has no id (${JSON.stringify(attrs.trim())})`);
  const at = atRaw === undefined ? NaN : Number(atRaw);
  if (!Number.isFinite(at) || at < 0 || at >= 1) {
    fail(file, `beat ${id}: "at" must be a number in [0, 1) (got ${JSON.stringify(atRaw ?? null)})`);
  }
  if (outRaw === undefined) return { id, at, document };
  const out = Number(outRaw);
  if (!Number.isFinite(out) || out <= at || out > 1) {
    fail(file, `beat ${id}: "out" must be a number after its "at" and at most 1 (got ${JSON.stringify(outRaw)})`);
  }
  return { id, at, document, out };
}

const LIST_ITEM = /<li\b([^>]*)>([\s\S]*?)<\/li>/gi;
const DATA_AT = /\bdata-at\s*=\s*"([^"]*)"/i;

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
    const out = pageOut(pages, pi);
    for (const beat of page.beats) {
      beat.lines.forEach((line, i) => {
        const after = i === 0 ? beat.at + fade : beat.lines[i - 1].at;
        const ok = i === 0 ? line.at >= after - 1e-12 : line.at > after;
        if (!ok) {
          fail(file, `beat ${beat.id}: line ${i + 1} at ${line.at} must come ${i === 0 ? 'once the beat has come up, at or after' : 'after'} ${after}`);
        }
      });
      const last = beat.lines[beat.lines.length - 1];
      if (last && !(last.at + fade < out - 1e-9)) {
        fail(file, `beat ${beat.id}: its last line at ${last.at} must be up before its page goes at ${out}`);
      }
    }
  });
}

/**
 * The pages of a body, split on the marker lines BEFORE markdown, so each beat renders on its own
 * and no marker ends up inside another beat's html. `<!-- page -->` starts a new page; the first
 * beat is on page 1 without one.
 */
function parsePages(body: string, file: string, outs: Map<string, number>): Page[] {
  const pages: Page[] = [];
  const beats: Beat[] = [];
  let open: { id: string; at: number; document: boolean; out?: number; lines: string[] } | null = null;
  let pageWaiting = false; // a page marker waiting for its first beat

  const closeBeat = () => {
    if (!open) return;
    const html = marked.parse(open.lines.join('\n'), { async: false }).trim();
    const text = htmlToText(html).replace(/\s+/g, ' ').trim();
    if (text === '') fail(file, `beat ${open.id} has no text`);
    const lines = documentLines(html, open.id, open.document, file);
    const beat: Beat = { id: open.id, at: open.at, document: open.document, html, text, words: countWords(text), lines };
    pages[pages.length - 1].beats.push(beat);
    beats.push(beat);
    if (open.out !== undefined) outs.set(beat.id, open.out);
    open = null;
  };

  for (const raw of body.split('\n')) {
    const line = raw.trim();
    if (PAGE_MARKER.test(line)) {
      if (!open) fail(file, 'a page marker before the first beat (the first page needs none)');
      closeBeat();
      pageWaiting = true;
      continue;
    }
    const m = BEAT_MARKER.exec(line);
    if (m) {
      closeBeat();
      const marker = parseMarker(m[1], file);
      const prev = beats[beats.length - 1];
      if (beats.some((b) => b.id === marker.id)) fail(file, `beat ${marker.id}: duplicate id`);
      if (!prev && marker.at !== 0) fail(file, `beat ${marker.id}: the first beat must be at 0 (got ${marker.at})`);
      if (prev && !(marker.at > prev.at)) {
        fail(file, `beat ${marker.id}: "at" ${marker.at} must come after ${prev.id} at ${prev.at}`);
      }
      if (pages.length === 0 || pageWaiting) {
        pages.push({ beats: [] });
        pageWaiting = false;
      }
      open = { ...marker, lines: [] };
      continue;
    }
    if (open) open.lines.push(raw);
    else if (line !== '') {
      fail(file, pageWaiting ? 'text after a page marker, before its first beat' : 'text before the first beat marker');
    }
  }
  closeBeat();
  if (pageWaiting) fail(file, 'a page marker with no beat after it');
  if (pages.length === 0) fail(file, 'no beats (expected <!-- beat id=... at=0 --> markers)');
  return pages;
}

/**
 * An explicit page-out (`out=` on a beat marker) sets `Page.out`. Only a page's last beat may carry
 * one; it must come after the beat is up and the page can fade (`last.at + fade < out`), and must
 * not run past the next page's first beat (`out <= next.at`, or the section's end).
 */
function applyPageOuts(pages: Page[], outs: Map<string, number>, length: number, file: string): void {
  const fade = fadeWidth(length);
  pages.forEach((page, pi) => {
    page.beats.forEach((beat, bi) => {
      const out = outs.get(beat.id);
      if (out === undefined) return;
      if (bi !== page.beats.length - 1) fail(file, `beat ${beat.id}: "out" is only for the last beat of a page`);
      const next = pages[pi + 1]?.beats[0].at ?? 1;
      if (!(beat.at + fade < out - 1e-9)) {
        fail(file, `beat ${beat.id}: "out" ${out} must come after the beat is up and the page can fade (at ${beat.at} + ${fade})`);
      }
      if (out > next + 1e-9) fail(file, `beat ${beat.id}: "out" ${out} runs past the next page's first beat at ${next}`);
      if (out < next - 1e-12) page.out = out;
    });
  });
}

export function parseSection(raw: string, file: string): StorySection {
  const { meta, body } = splitFrontmatter(raw, file);
  const id = unquote(meta.get('id') ?? '');
  if (id === '') fail(file, 'frontmatter is missing "id"');
  const lengthRaw = meta.get('length');
  const length = lengthRaw === undefined || lengthRaw === '' ? NaN : Number(lengthRaw);
  if (!Number.isFinite(length) || length <= 0) {
    fail(file, `"length" must be a number > 0 (got ${JSON.stringify(lengthRaw ?? null)})`);
  }
  const outs = new Map<string, number>();
  const pages = parsePages(body, file, outs);
  applyPageOuts(pages, outs, length, file);
  checkLines(pages, length, file);
  const beats = pages.flatMap((p) => p.beats);
  return {
    id,
    length,
    alt: unquote(meta.get('alt') ?? ''),
    draft: meta.get('draft') === 'true',
    pages,
    body,
    text: beats.map((b) => b.text).join(' '),
    words: beats.reduce((n, b) => n + b.words, 0),
    file,
  };
}

/** Vite/Vitest only: sections in filename order. */
export function loadStory(): StorySection[] {
  const modules: Record<string, string> = import.meta.glob('./*.md', {
    query: '?raw',
    import: 'default',
    eager: true,
  });
  return Object.keys(modules)
    .sort()
    .map((path) => parseSection(modules[path], path.replace(/^\.\//, '')));
}
