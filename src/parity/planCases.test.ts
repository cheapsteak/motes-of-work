import { describe, expect, it } from 'vitest';
import { MOTE_BUDGET_DESKTOP, MOTE_SEED } from '../config';
import { galaxyBudget, generateGalaxy } from '../galaxy/generate';
import { packBodyData } from '../scene/node/bodyData';
import { LOD_VISIBLE } from '../scene/node/lod';
import { planDot, planResolve } from '../scene/node/plan';
import { pairRuns, PLAN_MARK, PLAN_RUNS, PLAN_STRIDE } from '../scene/node/planAttrs';
import { planStatic } from '../scene/node/planOnScreen';
import { PLAN_AMBIENTS, PLAN_CASES, PLAN_SIZES, planCaseFrame } from './planCases';

// The ?lib=plan parity page compares the GLSL with the TS on these frames (parity.ts planParity). A
// case that lit nothing, or never drew a mark, would compare it only where it is hidden and still pass;
// a non-finite dot reads as a parity failure on the page, so it is caught here first, in the twin.

const g = generateGalaxy(MOTE_SEED, 'desktop', galaxyBudget(MOTE_BUDGET_DESKTOP));
const data = packBodyData(g);
const { pools } = planStatic(g);
const MARK_NAMES = Object.fromEntries(Object.entries(PLAN_MARK).map(([k, v]) => [v, k])) as Record<number, string>;

describe('the ?lib=plan parity cases', () => {
  // Timing: 2.5 s alone for every frame (36 frames of 4,854 dots); the timeout, 60 s, is 24 times that,
  // over 5 times a run at a load that slows it four-fold.
  it('light every dot finite, every case some, and every mark in one of them', { timeout: 60_000 }, () => {
    const seen = new Set<string>();
    for (const c of PLAN_CASES) {
      for (const size of PLAN_SIZES) {
        for (const ambient of PLAN_AMBIENTS) {
          const f = planCaseFrame(g, data, c, ambient, size);
          let lit = 0;
          for (const pool of [pools.world, pools.screen]) {
            for (let i = 0; i < pool.length / PLAN_STRIDE; i++) {
              const d = planDot(pool, i, f, data);
              const label = `${c.name} ${size.width} ${ambient} ${i}`;
              expect([...d.pos, ...d.px, ...d.rgb, d.alpha, d.sizeCss].every(Number.isFinite), label).toBe(true);
              if (d.alpha >= LOD_VISIBLE) {
                lit++;
                seen.add(MARK_NAMES[planResolve(pool, i, f).mark]);
              }
            }
          }
          expect(lit, `${c.name} ${size.width} ${ambient}`).toBeGreaterThan(300);
        }
      }
    }
    // Every mark a run or a pair draws (bandFill and edge draw none of their own: planAttrs.ts PLAN_MARK).
    const drawn = new Set([...PLAN_RUNS.map((r) => r[1]), ...pairRuns().map((r) => r[0])].map((m) => MARK_NAMES[m]));
    expect([...seen].sort()).toEqual([...drawn].sort());
  });
});
