import { it } from 'vitest';
import { riderSkeleton, CHEST_AT } from '/home/user/motes-of-work/src/mechanisms/bike/rider';
it('dump', () => {
  const k = riderSkeleton();
  const f = (v: number[]) => v.map((x) => x.toFixed(3)).join(',');
  console.log('hip', f(k.hip), 'shoulder', f(k.shoulder), 'CHEST_AT', CHEST_AT);
  for (const i of [0, 1]) console.log('side', i, 'shoulder', f(k.shoulders[i]), 'elbow', f(k.elbows[i]), 'wrist', f(k.wrists[i]), 'grip', f(k.grips[i]));
});
