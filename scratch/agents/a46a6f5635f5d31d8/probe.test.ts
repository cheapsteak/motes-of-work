import { it } from 'vitest';
import { BG, generateBackground } from '/home/user/motes-of-work/src/galaxy/background';

it('probe', () => {
  const HOOD: [number, number, number] = [65 * Math.cos(0.9), 0, 65 * Math.sin(0.9)];
  for (const tier of ['phone', 'desktop'] as const) {
    const pts = (a: Float32Array) => { const o: number[][] = []; for (let i = 0; i < a.length; i += 4) o.push([a[i], a[i + 1], a[i + 2]]); return o; };
    const near = (p: number[]) => Math.hypot(p[0] - HOOD[0], p[1] - HOOD[1], p[2] - HOOD[2]) < BG.hoodExclusion;
    const f = generateBackground(1, tier, [1e6, 0, 0]);
    const h = generateBackground(1, tier, HOOD);
    const there = [...pts(f.stars), ...pts(f.bright)].filter(near).length;
    const kept = [...pts(h.stars), ...pts(h.bright)].filter(near).length;
    console.log(tier, 'there', there, 'kept', kept, 'ratio', kept / there);
  }
});
