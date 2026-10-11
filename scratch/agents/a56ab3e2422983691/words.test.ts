import { it } from 'vitest';
import { loadStory } from '/home/user/motes-of-work/src/story/loader';
it('prints', () => {
  for (const s of loadStory()) for (const p of s.pages) for (const b of p.beats) console.log(s.id, b.id, b.at, b.words, b.text);
});
