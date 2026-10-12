p = 'src/story/loader.ts'
s = open(p).read()
old_iface = s[s.index('export interface StorySection {'):s.index('function fail(')]
new_iface = '''/** One line of a page: a short paragraph, or the brief (a `document` beat). */
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
}

/** Lines over one picture. A page gives way to the next at opacity 0 (src/story/reveal.ts). */
export interface Page {
  beats: Beat[];
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

'''
s = s.replace(old_iface, new_iface)
old_parse = s[s.index('export function parseSection('):s.index('/** Vite/Vitest only')]
new_parse = r'''const BEAT_MARKER = /^<!--\s*beat\b(.*?)-->$/;
const PAGE_MARKER = /^<!--\s*page\s*-->$/;

/** `id=<id> at=<local> [document]` of a beat marker. */
function parseMarker(attrs: string, file: string): { id: string; at: number; document: boolean } {
  let id = '';
  let atRaw: string | undefined;
  let document = false;
  for (const token of attrs.trim().split(/\s+/).filter((t) => t !== '')) {
    const m = /^(id|at)=(\S+)$/.exec(token);
    if (m?.[1] === 'id') id = m[2];
    else if (m?.[1] === 'at') atRaw = m[2];
    else if (token === 'document') document = true;
    else fail(file, `beat marker has an unknown attribute ${JSON.stringify(token)}`);
  }
  if (id === '') fail(file, `a beat marker has no id (${JSON.stringify(attrs.trim())})`);
  const at = atRaw === undefined ? NaN : Number(atRaw);
  if (!Number.isFinite(at) || at < 0 || at >= 1) {
    fail(file, `beat ${id}: "at" must be a number in [0, 1) (got ${JSON.stringify(atRaw ?? null)})`);
  }
  return { id, at, document };
}

/**
 * The pages of a body, split on the marker lines BEFORE markdown, so each beat renders on its own
 * and no marker ends up inside another beat's html. `<!-- page -->` starts a new page; the first
 * beat is on page 1 without one.
 */
function parsePages(body: string, file: string): Page[] {
  const pages: Page[] = [];
  const beats: Beat[] = [];
  let open: { id: string; at: number; document: boolean; lines: string[] } | null = null;
  let pageWaiting = false; // a page marker waiting for its first beat

  const closeBeat = () => {
    if (!open) return;
    const html = marked.parse(open.lines.join('\n'), { async: false }).trim();
    const text = htmlToText(html).replace(/\s+/g, ' ').trim();
    if (text === '') fail(file, `beat ${open.id} has no text`);
    const beat: Beat = { id: open.id, at: open.at, document: open.document, html, text, words: countWords(text) };
    pages[pages.length - 1].beats.push(beat);
    beats.push(beat);
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

export function parseSection(raw: string, file: string): StorySection {
  const { meta, body } = splitFrontmatter(raw, file);
  const id = unquote(meta.get('id') ?? '');
  if (id === '') fail(file, 'frontmatter is missing "id"');
  const lengthRaw = meta.get('length');
  const length = lengthRaw === undefined || lengthRaw === '' ? NaN : Number(lengthRaw);
  if (!Number.isFinite(length) || length <= 0) {
    fail(file, `"length" must be a number > 0 (got ${JSON.stringify(lengthRaw ?? null)})`);
  }
  const pages = parsePages(body, file);
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

'''
s = s.replace(old_parse, new_parse)
open(p, 'w').write(s)
