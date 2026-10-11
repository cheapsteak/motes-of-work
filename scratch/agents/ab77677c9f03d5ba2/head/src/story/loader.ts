import { marked } from 'marked';

export interface StorySection {
  id: string;
  /** Scroll length in viewport heights, > 0. */
  length: number;
  /** Description of the canvas for assistive tech. */
  alt: string;
  draft: boolean;
  /** Rendered body. HTML-escaped (`&amp;`, `&#39;`), so never lint or count words on this. */
  html: string;
  /** Raw markdown body, exactly as authored. */
  body: string;
  /** Rendered body as plain text: tags stripped, entities decoded. */
  text: string;
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

export function parseSection(raw: string, file: string): StorySection {
  const { meta, body } = splitFrontmatter(raw, file);
  const id = unquote(meta.get('id') ?? '');
  if (id === '') fail(file, 'frontmatter is missing "id"');
  const lengthRaw = meta.get('length');
  const length = lengthRaw === undefined || lengthRaw === '' ? NaN : Number(lengthRaw);
  if (!Number.isFinite(length) || length <= 0) {
    fail(file, `"length" must be a number > 0 (got ${JSON.stringify(lengthRaw ?? null)})`);
  }
  const html = marked.parse(body, { async: false });
  const text = htmlToText(html);
  return {
    id,
    length,
    alt: unquote(meta.get('alt') ?? ''),
    draft: meta.get('draft') === 'true',
    html,
    body,
    text,
    words: countWords(text),
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
