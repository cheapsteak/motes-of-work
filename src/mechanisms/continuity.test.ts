import { describe, expect, it } from 'vitest';
import { applyToPoint, type PartTransform } from '../math/transform';
import type { Vec3 } from '../math/vec';
import { partTransforms } from '../scene/mote/partTransforms';
import { sectionSpans } from '../scroll/progress';
import { loadStory } from '../story/loader';
import { KeyframeSampler, type KeyframeFile } from '../timeline/keyframeSampler';
import keyframes from '../timeline/keyframes.json';
import { ZERO_FAULTS } from '../timeline/sceneState';
import { mechanisms } from './index';
import type { Mechanism } from './types';

// Every part moves continuously while drive and variant move together, as they do in the rewind.
// A jump keeps its size as sampling gets finer; a continuous path's largest step halves. Steps are
// measured on real sampled points (both variants' shapes), so a flip about a tilted axis shows up
// as the distance a point actually travels. Slip and jitter snap by design and stay at zero here.

const spans = sectionSpans(loadStory());
const sampler = new KeyframeSampler(keyframes as unknown as KeyframeFile, spans);

/** The drive range the story covers. */
const DRIVE = (() => {
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i <= 2000; i++) {
    const d = sampler.sample(i / 2000).mech.drive;
    lo = Math.min(lo, d);
    hi = Math.max(hi, d);
  }
  return [lo, hi] as const;
})();

/** Per part, in both variants' shapes: a few sampled points plus the farthest from the part origin. */
function probes(m: Mechanism): Vec3[][] {
  const byPart: Vec3[][] = m.parts.map(() => []);
  for (const b of m.samplePoints(4000, 11)) byPart[b.part].push(b.local, b.localTwin);
  return byPart.map((pts) => {
    const far = [...pts].sort((a, b) => Math.hypot(...b) - Math.hypot(...a)).slice(0, 8);
    return [...pts.slice(0, 16), ...far];
  });
}

/** Largest world-space step of any probe point of each part, between consecutive poses. */
function largestSteps(poses: Iterable<PartTransform[]>, points: Vec3[][]): number[] {
  const worst = points.map(() => 0);
  let prev: Vec3[][] | null = null;
  for (const xf of poses) {
    const cur = points.map((pts, i) => pts.map((p) => applyToPoint(xf[i], p)));
    if (prev) {
      cur.forEach((pts, i) =>
        pts.forEach((p, k) => {
          const q = (prev as Vec3[][])[i][k];
          worst[i] = Math.max(worst[i], Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]));
        }),
      );
    }
    prev = cur;
  }
  return worst;
}

function* driveSweep(m: Mechanism, variant: number, n: number): Generator<PartTransform[]> {
  for (let i = 0; i <= n; i++) yield m.pose(DRIVE[0] + ((DRIVE[1] - DRIVE[0]) * i) / n, ZERO_FAULTS, variant);
}

/** Poses over one section's span of the scroll, in `n` equal steps. */
function* story(m: Mechanism, n: number, { start, end }: { start: number; end: number }): Generator<PartTransform[]> {
  for (let i = 0; i <= n; i++) yield partTransforms(m, sampler.sample(start + ((end - start) * i) / n));
}

/** Each moving part's largest step at 2n is at most 0.6 of its largest step at n. */
function expectHalving(coarse: number[], fine: number[], m: Mechanism, what: string): void {
  coarse.forEach((c, i) => {
    if (c < 1e-9) return; // a part that never moves
    expect(fine[i] / c, `${m.parts[i].id} ${what}`).toBeLessThan(0.6);
  });
}

/**
 * A long section sampled at 4000 and 8000 steps, through a mechanism with many parts (the
 * strandbeest), takes several seconds alone and more beside the other test files, past vitest's 5s.
 */
const SECTION_TIMEOUT_MS = 60_000;

describe.each(Object.entries(mechanisms))('part-pose continuity: %s', (_id, m) => {
  const points = probes(m);

  it('the story covers more than one unit of drive', () => {
    expect(DRIVE[1] - DRIVE[0]).toBeGreaterThan(1);
  });

  it.each([0, 0.25, 0.5, 0.75, 1])('every part moves continuously in drive at variant %s', (variant) => {
    const coarse = largestSteps(driveSweep(m, variant, 1000), points);
    const fine = largestSteps(driveSweep(m, variant, 2000), points);
    expectHalving(coarse, fine, m, `at variant ${variant}`);
    // An absolute bound too. At 2000 steps the fastest honest motion (the watch's balance rim at the
    // bottom of its swing) travels about 0.08 a step; a flip through a half turn travels a unit or more.
    fine.forEach((s, i) => expect(s, `${m.parts[i].id} at variant ${variant}`).toBeLessThan(0.15));
  });

  // Section by section, 2000 and 4000 steps each (twice that for a section longer than 4 screens):
  // the rewind unwinds 3 units of drive in one screen and the spec section rides 1.4 in under one,
  // and a fast part (the watch's escape wheel and pallet fork) is only in its halving regime when
  // those stretches are sampled densely enough. Section boundaries are continuous by
  // keyframes.test.ts.
  const lengths = new Map(loadStory().map((s) => [s.id, s.length]));
  it.each(spans.map((s) => [s.id, s] as const))('every part moves continuously through the %s section', (id, span) => {
    const n = (lengths.get(id) ?? 1) > 4 ? 4000 : 2000;
    const coarse = largestSteps(story(m, n, span), points);
    const fine = largestSteps(story(m, 2 * n, span), points);
    expectHalving(coarse, fine, m, `through ${id}`);
  }, SECTION_TIMEOUT_MS);
});
