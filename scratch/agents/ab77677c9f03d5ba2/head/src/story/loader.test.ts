import { describe, expect, it } from 'vitest';
import { parseSection } from './loader';

const good = `---
id: vibe-build
length: 2.5
alt: A cloud of warm motes drifting
draft: true
---
Some *emphasised* text with a [link](https://example.com) and \`code\`.

## A heading

- one
- two
`;

describe('parseSection', () => {
  it('parses frontmatter fields with their types', () => {
    const s = parseSection(good, '01-vibe-build.md');
    expect(s.id).toBe('vibe-build');
    expect(s.length).toBe(2.5);
    expect(s.alt).toBe('A cloud of warm motes drifting');
    expect(s.draft).toBe(true);
    expect(s.file).toBe('01-vibe-build.md');
    expect(s.html).toContain('<em>emphasised</em>');
    expect(s.html).toContain('<h2');
  });

  it('defaults draft to false and alt to empty', () => {
    const s = parseSection('---\nid: x\nlength: 1\n---\nHello world', 'x.md');
    expect(s.draft).toBe(false);
    expect(s.alt).toBe('');
  });

  it('counts body words with markdown stripped', () => {
    // "Some emphasised text with a link and code" = 8, "A heading" = 2, "one two" = 2
    expect(parseSection(good, 'f.md').words).toBe(12);
    expect(parseSection('---\nid: x\nlength: 1\n---\n**bold** [a b](http://x.y/z) `c`', 'f.md').words).toBe(4);
    expect(parseSection('---\nid: x\nlength: 1\n---\n', 'f.md').words).toBe(0);
  });

  it('counts contractions, ampersands and entities as one word each', () => {
    const count = (body: string) => parseSection(`---\nid: x\nlength: 1\n---\n${body}`, 'f.md').words;
    expect(count("Don't")).toBe(1);
    expect(count("Don't stop, it's fine")).toBe(4);
    expect(count('Q&A')).toBe(1);
    expect(count('AT&T and "quoted" words')).toBe(4);
    expect(count('well-known idea')).toBe(2);
    expect(count('a &mdash; b')).toBe(2);
  });

  it('exposes the raw markdown body and entity-decoded plain text', () => {
    const s = parseSection("---\nid: x\nlength: 1\n---\nAT&T said *don't* now", 'f.md');
    expect(s.body).toBe("AT&T said *don't* now");
    expect(s.html).toContain('AT&amp;T');
    expect(s.text).toContain("AT&T said don't now");
    expect(s.text).not.toContain('&amp;');
    expect(s.text).not.toContain('<em>');
  });

  it('tolerates CRLF line endings', () => {
    const s = parseSection('---\r\nid: x\r\nlength: 2\r\n---\r\nHi there', 'f.md');
    expect(s.id).toBe('x');
    expect(s.length).toBe(2);
    expect(s.words).toBe(2);
  });

  it('throws naming the file when frontmatter is absent', () => {
    expect(() => parseSection('just text', 'nofront.md')).toThrow(/nofront\.md/);
    expect(() => parseSection('---\nid: x\nlength: 1\nno closing fence', 'unclosed.md')).toThrow(/unclosed\.md/);
  });

  it('throws naming the file when id is missing', () => {
    expect(() => parseSection('---\nlength: 1\n---\nbody', 'noid.md')).toThrow(/noid\.md.*id/);
  });

  it.each([['0'], ['-2'], ['abc'], ['']])('throws naming the file when length is %j', (len) => {
    expect(() => parseSection(`---\nid: x\nlength: ${len}\n---\nbody`, 'badlen.md')).toThrow(/badlen\.md.*length/);
  });

  it('throws naming the file when length is missing', () => {
    expect(() => parseSection('---\nid: x\n---\nbody', 'nolen.md')).toThrow(/nolen\.md.*length/);
  });

  it('throws on a malformed frontmatter line', () => {
    expect(() => parseSection('---\nid x\nlength: 1\n---\nbody', 'malformed.md')).toThrow(/malformed\.md/);
  });
});
