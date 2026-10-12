// The plan's pools and layout (re-skin §4.7, Task 7b): planAttrs.ts's static pools and table, and the
// frame's layout of the shared pools (plan.ts planLayout).
import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { MOTE_BUDGET_DESKTOP, MOTE_SEED } from '../../config';
import { AMBIENT_POSE } from '../../galaxy/ambient';
import { galaxyBudget, generateGalaxy, systemOuter } from '../../galaxy/generate';
import { GALAXY_SHOTS, galaxyShotCamera, galaxyShotLampAt } from '../../timeline/netShots';
import { Lamp, lampFocusRow } from '../../timeline/netTrack';
import { packBodyData } from './bodyData';
import { PLAN_LOOK } from './classLook';
import { LOD_COUNT, LOD_VISIBLE, LodElement } from './lod';
import { bodyWorld } from './orbit';
import { planDot, planE0, planLayout, planOrbitPoint, planResolve, type PlanFrame } from './plan';
import {
  allocate,
  buildPlanAttrs,
  pairRuns,
  planBodies,
  planDotCount,
  planPairs,
  planTable,
  PLAN_BODY_MAX,
  PLAN_DOTS,
  PLAN_MARK,
  PLAN_POOL,
  PLAN_RUNS,
  PLAN_STRIDE,
  PLAN_TABLE_TEXELS,
  planRunScreen,
} from './planAttrs';
import planGlsl from './plan.glsl?raw';
import planScreenGlsl from './planScreen.glsl?raw';
import { planFrameAt } from './planOnScreen';
import { pairCloseCamera } from '../../parity/planCases';

const g = generateGalaxy(MOTE_SEED, 'desktop', galaxyBudget(MOTE_BUDGET_DESKTOP));
const data = packBodyData(g);
const attrs = buildPlanAttrs(g);
const pairs = planPairs(g);

describe('the static pools', () => {
  it('are deterministic', () => {
    const again = buildPlanAttrs(generateGalaxy(MOTE_SEED, 'desktop', galaxyBudget(MOTE_BUDGET_DESKTOP)));
    expect(again.world).toEqual(attrs.world);
    expect(again.screen).toEqual(attrs.screen);
    expect(planTable(g, g.systems.map((r) => systemOuter(g, r)))).toEqual(planTable(g, g.systems.map((r) => systemOuter(g, r))));
  });

  it('hold the reservation: the world pool and the pairs’ marks, the screen pool', () => {
    expect(pairs).toHaveLength(1);
    expect(attrs.worldCount).toBe(PLAN_DOTS.world + PLAN_DOTS.pair);
    expect(attrs.screenCount).toBe(PLAN_DOTS.screen);
    expect(attrs.worldCount + attrs.screenCount).toBe(planDotCount(pairs.length));
    expect(planDotCount(pairs.length)).toBe(4_854);
    expect(g.instances.plan).toBe(4_854);
    // A pair's marks: the barycentre's cross and circle (24), each star's ellipse (60, 90), each star's limit (60 of 96 lit).
    expect(pairRuns().reduce((n, r) => n + r[2], 0)).toBe(PLAN_DOTS.pair);
    expect(pairRuns().map((r) => r[2])).toEqual([14, 10, 60, 90, 60, 60]);
    // A pool's dot carries only its index; the frame says the rest.
    for (let j = 0; j < PLAN_DOTS.world; j += 997) expect(Array.from(attrs.world.subarray(j * PLAN_STRIDE, j * PLAN_STRIDE + 8))).toEqual([PLAN_POOL.world, 0, 0, j, 0, 0, 0, -1]);
  });

  it('give each mesh only its own marks: every world-pool run and pair mark is planWorldMark’s, every screen-pool run planScreenMark’s (planDotOf’s split)', () => {
    const name = (glsl: string): number => PLAN_MARK[glsl.toLowerCase().replace(/_(.)/g, (_, c: string) => c.toUpperCase()) as keyof typeof PLAN_MARK];
    const drawn = (src: string, fn: string): number[] => [...new Set([...src.slice(src.indexOf(`bool ${fn}(`)).split('\n}\n')[0].matchAll(/d\.mark == PLAN_MARK_([A-Z_]+)/g)].map((m) => name(m[1])))].sort((a, b) => a - b);
    const pairMarks = Array.from({ length: PLAN_DOTS.pair }, (_, k) => attrs.world[(PLAN_DOTS.world + k) * PLAN_STRIDE + 1]);
    const marks = (screen: boolean, extra: number[] = []): number[] => [...new Set([...PLAN_RUNS.filter((_, r) => planRunScreen(r) === screen).map((r) => r[1] as number), ...extra])].sort((a, b) => a - b);
    expect(drawn(planGlsl, 'planWorldMark')).toEqual(marks(false, pairMarks));
    expect(drawn(planScreenGlsl, 'planScreenMark')).toEqual(marks(true));
  });

  it('list each system’s bodies, planets inner to outer, then their moons', () => {
    const table = planTable(g, g.systems.map((r) => systemOuter(g, r)));
    g.systems.forEach((star, s) => {
      const rows = planBodies(g, star);
      expect(rows.length).toBeLessThanOrEqual(PLAN_BODY_MAX);
      const planets = rows.filter((r) => g.bodies[r].kind === 'planet');
      expect(planets.map((r) => g.bodies[r].orbit!.a)).toEqual([...planets.map((r) => g.bodies[r].orbit!.a)].sort((a, b) => a - b));
      for (let k = 0; k < PLAN_BODY_MAX; k++) expect(table[(s * PLAN_TABLE_TEXELS + (k >> 2)) * 4 + (k & 3)]).toBe(rows[k] ?? -1);
      expect(Array.from(table.subarray((s * PLAN_TABLE_TEXELS + 4) * 4, (s * PLAN_TABLE_TEXELS + 5) * 4))).toEqual([Math.fround(systemOuter(g, star)), planets.length, rows.length, star]);
    });
  });

  it('allocate splits a whole number by weight, the remainder to the largest fractions', () => {
    expect(allocate(10, [1, 1, 1])).toEqual([4, 3, 3]);
    expect(allocate(7, [0, 2, 5])).toEqual([0, 2, 5]);
    expect(allocate(5, [0, 0])).toEqual([0, 0]);
    expect(allocate(100, [3, 7, 11]).reduce((a, b) => a + b, 0)).toBe(100);
  });
});

describe('a pair’s marks', () => {
  // A camera over the pair's barycentre (planCases.ts pairCloseCamera: the pair under the text band),
  // every window forced open: each mark as planDot places it.
  const force = new Float32Array(LOD_COUNT).fill(-1);
  force[LodElement.PlanRingOuter] = 1;
  force[LodElement.PlanArc] = 1;

  for (const t of [0, AMBIENT_POSE, 3599.9]) {
    it(`stand at the barycentre, on each star's orbit and round each star at its stable limit, at ${t}`, () => {
      const camera = pairCloseCamera(g, data, t, { width: 390, height: 844 });
      const f: PlanFrame = planFrameAt(g, data, camera, { width: 390, height: 844 }, { growth: 1, fix: 0, highlight: 0, show: 1, ambient: t, focus: 0, lamp: Lamp.Off, lampRow: -1 }, force);
      const b = bodyWorld(data, pairs[0].bary, t);
      const seen = new Map<number, number>();
      for (let i = PLAN_DOTS.world; i < attrs.worldCount; i++) {
        const a = planResolve(attrs.world, i, f);
        const d = planDot(attrs.world, i, f, data);
        // Nothing is drawn inside a star's glow sprite: an ellipse passes through its star.
        if (!(d.alpha >= LOD_VISIBLE)) {
          expect(a.mark, `${a.mark} ${a.j}`).toBe(PLAN_MARK.binaryEllipse);
          continue;
        }
        seen.set(a.mark, (seen.get(a.mark) ?? 0) + 1);
        const star = a.ord >= 0 ? pairs[0].stars[a.ord] : -1;
        if (a.mark === PLAN_MARK.binaryCross || a.mark === PLAN_MARK.binaryCircle) {
          const r = Math.hypot(d.pos[0] - b[0], d.pos[1] - b[1], d.pos[2] - b[2]);
          expect(r).toBeLessThanOrEqual(PLAN_LOOK.binary.crossLen / 2 + 1e-9);
        } else if (a.mark === PLAN_MARK.binaryLimit) {
          const s = bodyWorld(data, star, t);
          expect(Math.hypot(d.pos[0] - s[0], d.pos[1] - s[1], d.pos[2] - s[2])).toBeCloseTo(g.bodies[star].aCrit!, 4);
        }
      }
      expect(seen.get(PLAN_MARK.binaryEllipse)).toBeGreaterThan(140);
      expect(seen.get(PLAN_MARK.binaryCross)).toBe(14);
      expect(seen.get(PLAN_MARK.binaryCircle)).toBe(10);
      expect(seen.get(PLAN_MARK.binaryLimit)).toBe(120);
      // Each star is on its own ellipse, at its own eccentric anomaly.
      for (const star of pairs[0].stars) {
        const p = planOrbitPoint(data, star, planE0(data, star, t), 0, t);
        const w = bodyWorld(data, star, t);
        expect(Math.hypot(p[0] - w[0], p[1] - w[1], p[2] - w[2])).toBeLessThan(1e-9);
      }
    });
  }
});

describe('the frame’s layout of the shared pools', () => {
  const shot = (name: keyof typeof GALAXY_SHOTS, size: { width: number; height: number }) => {
    const camera = galaxyShotCamera(GALAXY_SHOTS[name], g, data, size, AMBIENT_POSE);
    return planFrameAt(g, data, camera, size, {
      growth: 1,
      fix: 0,
      highlight: 0,
      show: 1,
      ambient: AMBIENT_POSE,
      focus: 0,
      lamp: GALAXY_SHOTS[name].lamp,
      lampRow: lampFocusRow(galaxyShotLampAt(GALAXY_SHOTS[name]), g),
    });
  };
  const layoutOf = (f: PlanFrame) => planLayout(g, data, planTable(g, g.systems.map((r) => systemOuter(g, r))), f.sys, { view: f.view, clocks: f.clocks, real: Array.from({ length: g.systems.length }, (_, s) => f.sys[s * 4 + 3]), force: f.force });

  for (const size of [
    { width: 390, height: 844 },
    { width: 1440, height: 900 },
  ]) {
    it(`gives P_a's every run its whole drawing at its system shot${size.width < 700 ? ', and every system its own at the hood' : ''}, ${size.width}x${size.height}`, () => {
      // The desktop hood asks more than the pool holds (12,268: its systems stand about 100 px across), so there they share it.
      for (const name of size.width < 700 ? (['hood', 'system'] as const) : (['system'] as const)) {
        const { asks, got } = layoutOf(shot(name, size));
        expect(asks.length, name).toBeGreaterThan(20);
        const short = asks.filter((a, i) => got[i] < a.want && (name === 'hood' || g.systems[a.s] === g.ids.P_a));
        expect(short.map((a) => `${g.bodies[g.systems[a.s]].id} ${PLAN_RUNS[a.r][0]} ${a.k}: ${a.want}`), name).toEqual([]);
      }
    });

    it(`lays each system's runs out in its ranges, inside the pools, ${size.width}x${size.height}`, () => {
      for (const name of ['hood', 'system', 'twelve', 'close'] as const) {
        const f = shot(name, size);
        let world = 0;
        let screen = 0;
        for (let s = 0; s < g.systems.length; s++) {
          expect(f.range[s * 4], name).toBe(world);
          expect(f.range[s * 4 + 2], name).toBe(screen);
          world = f.range[s * 4 + 1];
          screen = f.range[s * 4 + 3];
        }
        expect(world).toBeLessThanOrEqual(PLAN_DOTS.world);
        expect(screen).toBeLessThanOrEqual(PLAN_DOTS.screen);
        // Every dot laid out resolves to a run of its system; every dot past the last range to none.
        for (let i = 0; i < PLAN_DOTS.world; i++) expect(planResolve(attrs.world, i, f).sys >= 0, `${name} ${i}`).toBe(i < world);
      }
    });
  }
});
