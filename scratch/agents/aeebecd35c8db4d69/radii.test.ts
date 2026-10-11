import { it } from 'vitest';
import { buildCluster, firstStack } from '/home/user/motes-of-work/src/network/cluster';
import { mulberry32 } from '/home/user/motes-of-work/src/math/hash';
it('radii', () => {
  for (const [ns, u] of [[[5, 6, 7], 0.42], [[9, 10, 11, 12], 0.65], [[16, 17, 18, 19, 20, 21, 22], 1.1]] as const) {
    for (const n of ns) {
      const r = Array.from({ length: 50 }, (_, s) => buildCluster(n, u, 0, [0, 0, 0], mulberry32(s)).radius);
      console.log(n, u, Math.min(...r).toFixed(2), (r.reduce((a, b) => a + b) / 50).toFixed(2), Math.max(...r).toFixed(2));
    }
  }
  console.log(JSON.stringify(firstStack()));
});
