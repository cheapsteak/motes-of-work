import { test } from '../../../node_modules/vitest/dist/index.js';
import { sectionSpans } from '../../../src/scroll/progress';
import { loadStory } from '../../../src/story/loader';

test('spans', () => {
  const story = loadStory();
  const spans = sectionSpans(story);
  const total = story.reduce((n, s) => n + (s as unknown as { length: number }).length, 0);
  console.log('total screens', total);
  for (const s of spans) console.log(s.id, s.start.toFixed(6), s.end.toFixed(6));
  const z = spans.find((s) => s.id === 'zoom-out')!;
  const spec = spans.find((s) => s.id === 'spec')!;
  console.log('zoom-out end * total', z.end * total);
  for (const p of [0.12, 0.41, 0.88]) {
    const old = Math.round(((p * 21.6) / 49.4) * 1e4) / 1e4;
    const derived = Math.round(p * z.end * 1e4) / 1e4;
    console.log('essay point', p, 'old', old, 'derived', derived, 'raw', p * z.end, (p * 21.6) / 49.4);
  }
  const specP = spec.start + 0.927 * (spec.end - spec.start);
  console.log('spec@0.927', specP, 'rounded 1e-3', Math.round(specP * 1e3) / 1e3);
  for (const s of spans) if (s.id.startsWith('zoom')) console.log(s);
});
