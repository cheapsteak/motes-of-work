import { describe, expect, it } from 'vitest';
import { mechanisms, type MechanismId } from './index';

// Points per part at a 30k budget (seed 3), pinned. They follow from each machine's shares and its
// geometry's surface areas, so a refactor of the shared sampling helpers must leave every count
// unchanged; a deliberate retune updates its row here.
const PINNED: Record<MechanismId, number[]> = {
  bike: [
    4286, 1169, 5214, 5344, 1091, 33, 33, 34, 33, 33, 34, 33, 33, 33, 34, 33, 33, 34, 33, 33, 33, 34, 33, 33, 34, 33, 33, 33,
    34, 180, 208, 1499, 2692, 960, 2618, 536, 536, 121, 507, 2240,
  ],
  gears: [7800, 6000, 1500, 12000, 2700],
  steam: [5906, 1211, 621, 1141, 6365, 8199, 597, 586, 701, 771, 807, 807, 183, 183, 385, 663, 115, 249, 510],
  strandbeest: [
    251, 200, 200, 200, 385, 450, 920, 326, 327, 942, 93, 327, 386, 803, 273, 273, 834, 94, 327, 386, 802, 273, 274,
    834, 94, 326, 387, 802, 273, 273, 835, 94, 326, 386, 803, 273, 273, 834, 94, 327, 386, 802, 273, 274, 834, 94, 326,
    387, 802, 273, 273, 835, 94, 326, 386, 803, 273, 273, 835, 93, 838, 3940,
  ],
  watch: [10800, 3270, 2100, 1650, 1500, 3900, 1500, 1350, 2850, 900, 180],
};

describe.each(Object.entries(mechanisms))('point counts: %s', (id, m) => {
  it('gives each part its pinned share of a 30k budget', () => {
    const counts = m.parts.map(() => 0);
    for (const p of m.samplePoints(30_000, 3)) counts[p.part]++;
    expect(counts).toEqual(PINNED[id as MechanismId]);
  });
});
