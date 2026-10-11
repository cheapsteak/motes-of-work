import { describe, expect, it } from 'vitest';
import { MECHANISM_IDS } from './index';
import { mechanismMeta } from './meta';

// The comparison page names every registered mechanism from this table. A mechanism merged into the
// registry without a label and blurb here fails this test (and the type check) rather than showing
// up nameless.
describe('mechanism meta', () => {
  it('has an entry for exactly the registered mechanisms', () => {
    expect(new Set(Object.keys(mechanismMeta))).toEqual(new Set(MECHANISM_IDS));
  });

  it.each(MECHANISM_IDS)('%s has a sentence-case label and a one-sentence blurb', (id) => {
    const { label, blurb } = mechanismMeta[id];
    expect(label.trim()).toBe(label);
    expect(label.length).toBeGreaterThan(0);
    // Sentence case: a capital first letter, no further capitalised words.
    expect(label[0]).toBe(label[0].toUpperCase());
    expect(
      label
        .split(/\s+/)
        .slice(1)
        .every((w) => w === w.toLowerCase()),
    ).toBe(true);
    expect(blurb[0]).toBe(blurb[0].toUpperCase());
    expect(blurb.endsWith('.')).toBe(true);
    expect(blurb.slice(0, -1)).not.toMatch(/[.!?]\s/); // one sentence
  });
});
