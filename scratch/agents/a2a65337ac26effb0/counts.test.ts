import { it } from 'vitest';
import { bike } from '../../../src/mechanisms/bike';
it('c', () => {
  const counts = bike.parts.map(() => 0);
  for (const p of bike.samplePoints(30_000, 3)) counts[p.part]++;
  console.log(JSON.stringify(counts));
  console.log(JSON.stringify(bike.parts.map((p, i) => [p.id, counts[i]])));
});
