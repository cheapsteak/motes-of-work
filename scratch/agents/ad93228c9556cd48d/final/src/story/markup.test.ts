import { describe, expect, it } from 'vitest';
import { loadStory, parseSection } from './loader';
import { storyMarkup } from './markup';

describe('storyMarkup', () => {
  const story = loadStory();
  const html = storyMarkup(story);

  it('writes every section, page and beat in reading order, with their ids, lengths and timings', () => {
    const sections = [...html.matchAll(/<section class="section" data-section="([^"]+)" style="--length: ([\d.]+)">/g)];
    expect(sections.map((m) => [m[1], Number(m[2])])).toEqual(story.map((s) => [s.id, s.length]));
    const beats = [...html.matchAll(/<div class="beat" data-beat="([^"]+)" data-at="([\d.]+)"/g)];
    const want = story.flatMap((s) => s.pages.flatMap((p) => p.beats.map((b) => [b.id, b.at])));
    expect(beats.map((m) => [m[1], Number(m[2])])).toEqual(want);
    const pages = [...html.matchAll(/<div class="page" data-page="(\d+)">/g)].map((m) => Number(m[1]));
    expect(pages).toEqual(story.flatMap((s) => s.pages.map((_, i) => i + 1)));
  });

  it('keeps the brief whole, its lines carrying their part mapping and their timing, and marks it a document', () => {
    expect(html).toMatch(/<div class="beat" data-beat="vb-brief" data-at="0.125" data-document><div class="brief">/);
    expect([...html.matchAll(/<li data-parts="[^"]*" data-at="0\.\d+">/g)].length).toBe(4);
  });

  it('puts each alt text in a visually hidden paragraph, escaped, and ends on one spacer', () => {
    for (const s of story) expect(html).toContain(`<p class="sr-only">${s.alt}</p>`);
    const odd = parseSection('---\nid: a"b\nlength: 1\nalt: x < y & z\n---\n<!-- beat id=q at=0 -->\nHi.', 'f.md');
    const out = storyMarkup([odd]);
    expect(out).toContain('<p class="sr-only">x &lt; y &amp; z</p>');
    expect(out).toContain('data-section="a&quot;b"');
    expect(html.match(/class="story-end"/g)?.length).toBe(1);
    expect(html.trimEnd().endsWith('<div class="story-end" aria-hidden="true"></div>')).toBe(true);
  });
});
