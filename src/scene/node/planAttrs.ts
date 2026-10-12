// The plan's schematic as instances (re-skin §4.7, Task 7b): the static pools net-plan and
// net-plan-screen draw, and the layout table (uPlanTex) that tells a pool's dots, frame by frame, which
// system, mark, body and place in the mark they are.
//
// The dots are shared, not owned: a frame lays its two pools out over the systems on screen by what
// each one's drawing needs at its size (plan.ts planLayout), so the neighbourhood's twenty-odd systems
// share the dots when the camera is far, and one system in R takes most of them up close. The world pool
// (net-plan) holds every world mark of every system; the screen pool (net-plan-screen) the silhouettes
// and numerals of the systems in R. A binary pair's marks (re-skin §4.10: its barycentre's cross and
// circle, each star's ellipse, each star's stable limit, dashed) are static: they are its own.
//
// A dot is 8 floats: (owner, mark, ord, j) (aux, rank, n, owner2):
//  - a pool's dot: owner PLAN_POOL.world or PLAN_POOL.screen and j its index in the pool, the rest 0
//    (its system, mark, body, run and rank are the frame's: plan.ts planResolve);
//  - a pair's dot: owner its first star's system, mark, ord its star (0, 1; −1 the barycentre's), j its
//    index in its mark, aux the star's stable limit (units), rank hash01 of its place with
//    SALT.planRank, n its mark's count and owner2 its second star's system.
import type { Galaxy } from '../../galaxy/generate';
import { hash01 } from '../../math/hash';
import { SALT } from '../../math/salts';
import { PLAN_LOOK } from './classLook';

/** The plan's marks (plan.ts, plan.glsl). bandFill and edge draw no dots of their own: they are the closed arc's and the settled deviation's last forms. */
export const PLAN_MARK = {
  ring: 0,
  bandEdge: 1,
  bandFill: 2,
  arc: 3,
  node: 4,
  chevron: 5,
  deviation: 6,
  edge: 7,
  stalk: 8,
  outlineEq: 9,
  outlineMer: 10,
  graduation: 11,
  centre: 12,
  dimension: 13,
  silhouette: 14,
  numeral: 15,
  binaryCross: 16,
  binaryCircle: 17,
  binaryEllipse: 18,
  binaryLimit: 19,
} as const;

/** A pool dot's owner: the world pool's, the screen pool's. */
export const PLAN_POOL = { world: -1, screen: -2 } as const;

/**
 * The reservation (re-skin §7, §4.7): the world pool, the screen pool, and `pair` a binary pair's marks.
 * 3,800 + 760 + 294 for the essay's one pair = 4,854: the most that leaves the planets and moons their
 * room under the cap (generate.test.ts; the brief's 8,676 did not fit: see the task report). A change
 * of the reservation is this one line.
 */
export const PLAN_DOTS = { world: 3800, screen: 760, pair: 294 } as const;

/**
 * The runs a frame lays out for a system, in each pool's order: [name, mark, variant, per body], each
 * run a mark of one body (per body) or of the system (the graduations, the centre circle, a dimension
 * and its value, on the system's focused planet). The world pool's first, then the screen pool's.
 */
export const PLAN_RUNS = [
  ['ring', PLAN_MARK.ring, 0, true],
  ['arc', PLAN_MARK.arc, 0, true],
  ['edgeIn', PLAN_MARK.bandEdge, 0, true],
  ['edgeOut', PLAN_MARK.bandEdge, 1, true],
  ['deviation', PLAN_MARK.deviation, 0, true],
  ['node', PLAN_MARK.node, 0, true],
  ['chevron', PLAN_MARK.chevron, 0, true],
  ['devChevron', PLAN_MARK.chevron, 1, true],
  ['stalk', PLAN_MARK.stalk, 0, true],
  ['stalkActual', PLAN_MARK.stalk, 1, true],
  ['outlineEq', PLAN_MARK.outlineEq, 0, true],
  ['outlineMer', PLAN_MARK.outlineMer, 0, true],
  ['graduation', PLAN_MARK.graduation, 0, false],
  ['centre', PLAN_MARK.centre, 0, false],
  ['dimension', PLAN_MARK.dimension, 0, false],
  ['dimensionActual', PLAN_MARK.dimension, 1, false],
  ['silhouette', PLAN_MARK.silhouette, 0, true],
  ['numeral', PLAN_MARK.numeral, 0, false],
  ['numeralActual', PLAN_MARK.numeral, 1, false],
] as const;

/** H's arc's run (PLAN_RUNS), whose dots plan.ts planDot re-seats on its dashes while the arc is open. */
export const PLAN_RUN_ARC = PLAN_RUNS.findIndex((r) => r[0] === 'arc');

/** The marks drawn in screen space (net-plan-screen, planScreen.glsl); every other is a world mark (net-plan). */
export const PLAN_SCREEN_MARKS: readonly number[] = [PLAN_MARK.silhouette, PLAN_MARK.numeral];

/** Whether run `r` of PLAN_RUNS is the screen pool's. */
export const planRunScreen = (r: number): boolean => PLAN_SCREEN_MARKS.includes(PLAN_RUNS[r][1]);

/** A system's bodies the plan draws at most: its planets, then their moons (the essay's largest has 16). */
export const PLAN_BODY_MAX = 16;
/** A numeral's glyphs at most ("10.6": two digits, the point, one decimal), and a glyph's cells (5 × 7). */
export const PLAN_GLYPHS = 4;
export const PLAN_GLYPH_CELLS = 35;
/** A node cross's dots: its centre and four arms. */
export const PLAN_NODE_DOTS = 5;
/** A dimension's dots before its line: its tick's, then its extension's. */
export const PLAN_DIM_TICK_DOTS = 6;
export const PLAN_DIM_EXT_DOTS = 10;

/**
 * The table's texels per system (uPlanTex, RGBA32F, a row per system in g.systems order):
 *  T0..T3 the body rows by ordinal (PLAN_BODY_MAX, −1 none); T4 (outer radius, planets, bodies, star
 *  row): these are fixed; then the frame's: T5 (its focused planet's row, −1 none; 0, 0, 0); then for
 *  each run of PLAN_RUNS four texels: the end of each ordinal's run, counted from the system's first
 *  dot in the run's pool (ordinal k's run is [end of k − 1, end of k); ordinal 0's from the end of the
 *  pool's previous run, the first run's from 0). A system-wide run uses ordinal 0.
 */
export const PLAN_TABLE_AT = 6;
export const PLAN_TABLE_TEXELS = PLAN_TABLE_AT + 4 * PLAN_RUNS.length;

/** Floats a dot. */
export const PLAN_STRIDE = 8;

/** A system's bodies by ordinal: its planets inner to outer (by semi-major axis), then each planet's moons in row order. */
export function planBodies(g: Galaxy, star: number): number[] {
  const planets = g.bodies.filter((b) => b.kind === 'planet' && b.host === star).sort((a, b) => a.orbit!.a - b.orbit!.a || a.index - b.index);
  const moons = planets.flatMap((p) => g.bodies.filter((b) => b.kind === 'moon' && b.host === p.index).map((b) => b.index));
  const rows = [...planets.map((p) => p.index), ...moons];
  if (rows.length > PLAN_BODY_MAX) throw new Error(`planBodies: ${g.bodies[star].id} has ${rows.length} bodies, over ${PLAN_BODY_MAX}`);
  return rows;
}

/** `total` split by `weights` in whole dots (largest remainder; ties to the lower index); all 0 when every weight is 0. */
export function allocate(total: number, weights: readonly number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (!(sum > 0) || total <= 0) return weights.map(() => 0);
  const exact = weights.map((w) => (total * w) / sum);
  const out = exact.map(Math.floor);
  let left = total - out.reduce((a, b) => a + b, 0);
  const order = exact.map((x, i) => [x - Math.floor(x), i] as const).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (const [, i] of order) {
    if (left <= 0) break;
    out[i]++;
    left--;
  }
  return out;
}

/**
 * The table's fixed part (planAttrs's T0..T4 of every row; plan.ts planLayout writes the rest each
 * frame): a row of PLAN_TABLE_TEXELS RGBA texels per system, in `g.systems` order.
 */
export function planTable(g: Galaxy, outer: readonly number[]): Float32Array {
  const row = PLAN_TABLE_TEXELS * 4;
  const out = new Float32Array(g.systems.length * row);
  g.systems.forEach((star, si) => {
    const rows = planBodies(g, star);
    const planets = rows.filter((r) => g.bodies[r].kind === 'planet').length;
    const at = si * row;
    for (let k = 0; k < PLAN_BODY_MAX; k++) out[at + k] = rows[k] ?? -1;
    out.set([outer[si], planets, rows.length, star, -1, 0, 0, 0], at + 16);
  });
  return out;
}

/** A binary pair: its two stars' rows and systems, and its barycentre's row. */
export interface PlanPair {
  stars: [number, number];
  systems: [number, number];
  bary: number;
}

/** The galaxy's binary pairs (re-skin Task 1e): two stars sharing a barycentre host. */
export function planPairs(g: Galaxy): PlanPair[] {
  const sysOf = new Map(g.systems.map((row, i) => [row, i]));
  const byBary = new Map<number, number[]>();
  for (const row of g.systems) {
    const h = g.bodies[row].host;
    if (h >= 0) byBary.set(h, [...(byBary.get(h) ?? []), row]);
  }
  return [...byBary.entries()].map(([bary, stars]) => {
    if (stars.length !== 2) throw new Error(`planPairs: barycentre ${bary} has ${stars.length} stars`);
    // The smaller ellipse first (60 dots), the larger second (90).
    const [a, b] = [...stars].sort((x, y) => g.bodies[x].bin!.share - g.bodies[y].bin!.share || x - y);
    return { stars: [a, b], systems: [sysOf.get(a)!, sysOf.get(b)!], bary };
  });
}

/** A pair's marks: [mark, star (0, 1; −1 the barycentre's), dots]; the limits' dots are the lit slots of PLAN_LOOK.binary.limitDots. */
export function pairRuns(): [number, number, number][] {
  const b = PLAN_LOOK.binary;
  const lit = Array.from({ length: b.limitDots }, (_, k) => k).filter((k) => k % 8 < b.limitDash).length;
  return [
    [PLAN_MARK.binaryCross, -1, 2 * b.crossDots],
    [PLAN_MARK.binaryCircle, -1, b.circleDots],
    [PLAN_MARK.binaryEllipse, 0, 60],
    [PLAN_MARK.binaryEllipse, 1, 90],
    [PLAN_MARK.binaryLimit, 0, lit],
    [PLAN_MARK.binaryLimit, 1, lit],
  ];
}

/** Every plan dot the galaxy reserves: the two pools and its pairs' marks (GalaxyInstances.plan). */
export function planDotCount(pairs: number): number {
  return PLAN_DOTS.world + PLAN_DOTS.screen + pairs * PLAN_DOTS.pair;
}

/**
 * The static pools: `world` (net-plan: the world pool, then the pairs' marks) and `screen`
 * (net-plan-screen: the screen pool), PLAN_STRIDE floats a dot. Deterministic.
 */
export function buildPlanAttrs(g: Galaxy): { world: Float32Array; screen: Float32Array; worldCount: number; screenCount: number } {
  const world: number[] = [];
  const screen: number[] = [];
  for (let j = 0; j < PLAN_DOTS.world; j++) world.push(PLAN_POOL.world, 0, 0, j, 0, 0, 0, -1);
  for (let j = 0; j < PLAN_DOTS.screen; j++) screen.push(PLAN_POOL.screen, 0, 0, j, 0, 0, 0, -1);
  let seed = 0;
  planPairs(g).forEach((p) => {
    for (const [mark, star, n] of pairRuns()) {
      const aux = mark === PLAN_MARK.binaryLimit ? g.bodies[p.stars[star]].aCrit! : 0;
      for (let j = 0; j < n; j++) world.push(p.systems[0], mark, star, j, aux, hash01((0x80000 + seed++) >>> 0, SALT.planRank), n, p.systems[1]);
    }
  });
  return { world: Float32Array.from(world), screen: Float32Array.from(screen), worldCount: world.length / PLAN_STRIDE, screenCount: screen.length / PLAN_STRIDE };
}

/** The layout constants plan.glsl reads (spliced by shaderSource.ts): the marks, the pools, the table's shape and its runs. */
export function glslPlanLayoutConstants(): string {
  const name = (k: string): string => `PLAN_MARK_${k.replace(/[A-Z]/g, (c) => `_${c}`).toUpperCase()}`;
  return [
    "// The plan's marks and layout, generated from src/scene/node/planAttrs.ts.",
    ...Object.entries(PLAN_MARK).map(([k, v]) => `const int ${name(k)} = ${v};`),
    `const int PLAN_POOL_WORLD = ${PLAN_POOL.world};`,
    `const int PLAN_POOL_SCREEN = ${PLAN_POOL.screen};`,
    `const int PLAN_BODY_MAX = ${PLAN_BODY_MAX};`,
    `const int PLAN_TABLE_AT = ${PLAN_TABLE_AT};`,
    `const int PLAN_RUN_COUNT = ${PLAN_RUNS.length};`,
    `const int PLAN_RUN_ARC = ${PLAN_RUN_ARC};`,
    `const int PLAN_GLYPH_CELLS = ${PLAN_GLYPH_CELLS};`,
    `const int PLAN_NODE_DOTS = ${PLAN_NODE_DOTS};`,
    `const int PLAN_DIM_TICK_DOTS = ${PLAN_DIM_TICK_DOTS};`,
    `const int PLAN_DIM_EXT_DOTS = ${PLAN_DIM_EXT_DOTS};`,
    `const int PLAN_RUN_MARK[${PLAN_RUNS.length}] = int[${PLAN_RUNS.length}](${PLAN_RUNS.map((r) => r[1]).join(', ')});`,
    `const int PLAN_RUN_AUX[${PLAN_RUNS.length}] = int[${PLAN_RUNS.length}](${PLAN_RUNS.map((r) => r[2]).join(', ')});`,
    `const bool PLAN_RUN_SCREEN[${PLAN_RUNS.length}] = bool[${PLAN_RUNS.length}](${PLAN_RUNS.map((_, i) => String(planRunScreen(i))).join(', ')});`,
    `const bool PLAN_RUN_BODY[${PLAN_RUNS.length}] = bool[${PLAN_RUNS.length}](${PLAN_RUNS.map((r) => String(r[3])).join(', ')});`,
  ].join('\n');
}
