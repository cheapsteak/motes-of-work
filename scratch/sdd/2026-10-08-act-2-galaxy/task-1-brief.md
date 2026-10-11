### Task 1: The galaxy's pure model

**Files:**
- Create: `src/galaxy/body.ts`, `src/galaxy/body.test.ts`, `src/galaxy/background.ts`, `src/galaxy/background.test.ts`, `src/galaxy/lineage.ts`, `src/galaxy/generate.ts`, `src/galaxy/generate.test.ts`
- Read only: `src/network/schedule.ts` (`G_TWELVE`, `TWELVE`, `CLEAN_AFTER`, `HI_AT_BIRTH`, `SWEEP`, `REVIEW_VISITS`), `src/math/hash.ts`, `src/config.ts`

**Interfaces:**
- Consumes: `mulberry32`, `pcg` (`src/math/hash.ts`); the schedule constants above; `networkBudget(moteBudget)` from `src/network/generate.ts`. Copy it into `generate.ts` as `galaxyBudget` with the same body, because Task 8 deletes the old file.
- Produces:
  ```ts
  // src/galaxy/body.ts
  export type BodyKind = 'core' | 'star' | 'planet' | 'moon';
  export interface OrbitElements { r: number; a: number; e: number; tilt: number; tiltAz: number; omega0: number; precession: number; period: number; phase: number }
  export const CORE_R = 1.4, STAR_R = 0.9, PLANET_R_PIN = 0.30;
  export const LATTICE = { hero: [60, 160], core: [22, 64], star: [20, 55] } as const;
  export function latticeRowCols(rows: number, cols: number): number[];   // max(6, round(cols·cos lat_i)), lat_i = −π/2 + π(i+0.5)/rows
  export function latticeCount(rows: number, cols: number): number;
  export function planetLattice(R: number): [number, number];             // [max(5, round(14R/0.3)), max(10, round(36R/0.3))]
  export function moonLattice(R: number): [number, number];               // [max(3, round(5R/0.1)), max(6, round(10R/0.1))]
  export function planetCount(u: number): number;                         // 2 + floor(8u²)
  export function planetOrbitRadii(n: number, rng: () => number): number[]; // first 2.2, last 5.5 + 4.1(n−2)/7, gaps ±15 %, every apoapsis ≤ 9.6
  export function planetRadius(g: number): number;                        // clamp(0.22·exp(0.5g), 0.14, 0.50)
  export function moonCount(u0: number, u1: number): number;              // u0 < 0.45 ? 0 : min(6, 1 + floor(−ln(max(1e-6, u1)) / 0.7))
  export function moonRadius(Rp: number, g: number): number;              // clamp(0.12·Rp·exp(0.45g), 0.04, 0.35·Rp)
  export function moonTrack(i: number, n: number): 0 | 1 | 2;            // per-track counts [ceil(n/3), ceil((n−1)/3), floor(n/3)]
  export const MOON_TRACK = [1.3, 1.9, 2.5], MOON_PERIOD = [6, 9, 12];
  export function planetPeriod(r: number): number;                        // 60 + 18.75·(r − 2.4)
  export function orbitFor(kind: 'planet' | 'moon', r: number, period: number, rng: () => number): OrbitElements;
  //   planet: e 0.05–0.22, tilt ±0.25 about a seeded azimuth, precession 400–900 s; moon: e 0.05–0.12, tilt ±0.20, precession 90–200 s; a = r/(1+e)

  // src/galaxy/background.ts
  export type Tier = 'phone' | 'desktop';
  export function galaxyTier(widthCss: number, heightCss: number): Tier;  // phone when the shorter side < 600
  export const BG = { radius: 220, stars: { phone: 2400, desktop: 4000 }, dust: { phone: 4000, desktop: 8000 }, coreShare: 0.22, coreAt: 0.35,
    pitch: 0.28, scatter: 0.42, dustScatter: 0.9, starExp: 0.75, dustExp: 0.6, brightShare: 0.15, warmShare: 0.12,
    hoodExclusion: 50, hoodLeak: 0.15, coreExclusion: 16, dustY: 1.1, starY: 0.6 } as const;
  export interface Background { stars: Float32Array; bright: Float32Array; dust: Float32Array; armPhase: number } // xyz + brightness per point
  export function armPhaseFor(r: number, bearing: number): number;        // the phase that puts arm 0 at (r, bearing)
  export function armAngleAt(r: number, armPhase: number, arm?: 0 | 1): number; // arm·π + ln(r/2)/0.28 + armPhase, wrapped to (−π, π]
  export function generateBackground(seed: number, tier: Tier, hoodCentroid: readonly [number, number, number]): Background;

  // src/galaxy/lineage.ts
  export interface ScriptedBody { id: string; alias?: string; kind: 'core' | 'star' | 'planet';
    parents: readonly string[] | 'nearest-clean-star'; host?: string; born: number; dur?: number;
    hero?: boolean; hiAt?: number; fixAt?: number; moons?: number; R?: number; spot?: readonly [number, number] }
  export const SOURCE = 'R0', AGENT_RULE = 'R1', FIRST = 'N0', OWN_FIXES = ['C1', 'C5', 'R0', 'R1'] as const;
  export const LINEAGE: readonly ScriptedBody[];

  // src/galaxy/generate.ts
  export type StreamKind = 'out' | 'side' | 'in';
  export interface Body { index: number; id: string; alias?: string; kind: BodyKind; scripted: boolean;
    parents: number[]; host: number; star: number; rule: number; planet: number;   // rows; −1 where n/a
    born: number; dur: number; cracked: boolean; hero: boolean; hiAt: number | null; fixAt: number | null; hop: number | null;
    R: number; lattice: [number, number]; motes: number; personMotes: number;
    orbit: OrbitElements | null; spot: readonly [number, number, number] | null; derpSeed: number; derpPhase: number;
    partGroup: number | null; stream: number | null }
  export interface Stream { from: number; to: number; kind: StreamKind; born: number; hiAt: number | null; hop: number | null; bow: number }
  export interface Galaxy { seed: number; tier: Tier; bodies: Body[]; streams: Stream[]; feedFrom: number; visits: string[];
    ids: Record<string, number>; systems: number[]; hoodCentroid: [number, number, number]; background: Background; motes: number }
  export const SYS_MAX = 32, STAR_COUNT = 30, CORE_SPREAD = 12, CORE_MIN_GAP = 5, HOOD_R = [40, 90] as const, HOOD_BEARING = 0.9;
  export function generateGalaxy(seed: number, tier: Tier, budget: number): Galaxy;
  export function bodyIndex(g: Galaxy, id: string): number;
  export function systemOuter(g: Galaxy, star: number): number;           // max planet apoapsis + its moons' reach
  export function galaxyBudget(moteBudget: number): number;               // round(0.76 × moteBudget)
  ```

- [ ] **Step 1: Confirm the base is green.** Run the full suite on HEAD (Close-out A and C). Expected: all pass. If anything fails, stop and report: the box-body commits must not enter a base that is red.

- [ ] **Step 2: Write the failing tests** (`body.test.ts`, `background.test.ts`, `generate.test.ts`)

```ts
// body.test.ts
it('the lattice counts are the spec\'s', () => {
  expect(latticeCount(60, 160)).toBe(6116);   // morph §7.2's hero shell
  expect(latticeCount(22, 64)).toBe(900);     // a core body (§14.2)
  expect(latticeCount(20, 55)).toBe(706);     // a star (700)
  expect(latticeCount(14, 36)).toBe(324);     // a 0.30 planet (300)
  expect(latticeCount(...moonLattice(0.036))).toBeGreaterThanOrEqual(12); // §13's floor
});
it('sizes and counts stay in their bands', () => {
  for (const g of gaussGrid) { expect(planetRadius(g)).toBeGreaterThanOrEqual(0.14); expect(planetRadius(g)).toBeLessThanOrEqual(0.5); }
  for (const Rp of [0.14, 0.3, 0.5]) for (const g of gaussGrid) { const r = moonRadius(Rp, g); expect(r).toBeGreaterThanOrEqual(0.04); expect(r).toBeLessThanOrEqual(0.35 * Rp + 1e-12); }
  expect(planetCount(0)).toBe(2); expect(planetCount(0.9999)).toBe(9);
  expect(moonCount(0.44, 0.5)).toBe(0); expect(moonCount(0.5, 1e-9)).toBe(6);
  expect([0, 1, 2, 3, 4, 5, 6].map((i) => moonTrack(i, 7))).toEqual([0, 0, 0, 1, 1, 2, 2]); // the bike: 3 / 2 / 2
});
it('orbits keep inside their bounds', () => {
  // over 10⁴ seeded draws: planets e ∈ [0.05,0.22], |tilt| ≤ 0.25, precession ∈ [400,900]; moons e ∈ [0.05,0.12], |tilt| ≤ 0.2,
  // precession ∈ [90,200]; a·(1+e) === r (r is the apoapsis); planetOrbitRadii(n) is increasing, its first is 2.2 and its last ≤ 9.6
});
// background.test.ts
it('draws the tier counts, deterministically', () => { /* phone 2400/4000, desktop 4000/8000; two calls equal; another seed differs */ });
it('keeps the core clear and the neighbourhood mostly clear', () => {
  // no star or dust within 16 of the centre; among stars within 50 of hoodCentroid, all are leak draws (≤ 15 % of the draws there)
});
it('the arms are spaced for the galaxy wide', () => {
  // median nearest-neighbour distance among arm stars × 0.86 px/unit ≥ 7 px (galaxy §4, §10)
});
it('arm 0 passes the neighbourhood', () => { expect(armAngleAt(65, armPhaseFor(65, 0.9))).toBeCloseTo(0.9, 6); });
// generate.test.ts
const g = generateGalaxy(MOTE_SEED, 'desktop', MOTE_BUDGET_DESKTOP);
it('is deterministic and seed-sensitive', ...);
it('has six core bodies, R0 at the centre, the rest within 12 and ≥ 5 apart', ...);
it('has STAR_COUNT stars on the arm stretch, every system disjoint', () => {
  // each star's galactic radius ∈ [40, 110]; for every pair, |spot_i − spot_j| ≥ systemOuter(i) + systemOuter(j) + 1; systems.length ≤ SYS_MAX
});
it('pins the story\'s planets', () => {
  const hosted = (star: string, by = G_TWELVE[1]) => g.bodies.filter((b) => b.kind === 'planet' && b.host === bodyIndex(g, star) && b.born <= by).map((b) => b.id);
  expect(hosted('P1')).toEqual(['C1', 'C2', 'C3', 'C4']);
  expect(hosted('P2').sort()).toEqual(['C5', 'C6', 'C9']);
  expect(hosted('P3').sort()).toEqual(['C10', 'C7', 'C8']);
  expect(hosted('P_a', 1)).toEqual(expect.arrayContaining(['N0', 'B1', 'B2']));
  expect(hosted('P5', 1)).toEqual(['V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9']);
  expect(moonsOf(g, 'N0')).toHaveLength(7); expect(moonsOf(g, 'C1')).toHaveLength(6); expect(moonsOf(g, 'C5')).toHaveLength(3);
  expect(g.bodies[bodyIndex(g, 'C1')].R).toBe(0.3);
});
it('carries the defect by the rule, and exactly the twelve are lit under df-5', () => {
  // cracked ⇔ (a stream parent cracked ∧ born < CLEAN_AFTER) ∨ R0; a cracked planet's moons are cracked;
  // every cracked body's derpSeed === R0's; healthy derpSeed === NODE_NEVER;
  // the set {hiAt ≤ HI_TWELVE ∧ born ≤ G_TWELVE[0]} === TWELVE (stars P1–P3, planets C2–C10), C1 and R0 excluded
});
it('has 45 ± 5 % bare planets among the filler and no planet over 6 moons but N0', ...);
it('lands every moon in the last 30 % of its planet\'s build', () => { /* moon.born ∈ [p.born + 0.7 p.dur, p.born + p.dur] */ });
it('fits the budget', () => { expect(g.motes).toBeLessThanOrEqual(galaxyBudget(MOTE_BUDGET_DESKTOP)); });
```

- [ ] **Step 3: Run them to see them fail.** `npx vitest run src/galaxy`. Expected: FAIL, modules not found.

- [ ] **Step 4: Implement `body.ts` and `background.ts`** with the signatures above.
  - A star's bearing on arm `k`: `θ = k·π + ln(r/2)/0.28 + armPhase`.
  - The scatter narrows toward the rim as `0.42·(1 − 0.5 r/220)`.
  - A star's brightness is `0.35 + 0.65u²`, and 12 % are warmed toward white. Dust brightness is 0.08–0.18.
  - The brightest 15 % of stars go to `bright`.

- [ ] **Step 5: Implement `lineage.ts`.**
  - Carry every id, `born`, `dur`, `hiAt` and `fixAt` from `src/network/lineage.ts`, mapping rule → `core`, plan → `star` and code → `planet`.
  - Add the hosts and pins. Each list is in orbit-slot order.

    | Star | Hosts |
    |---|---|
    | P_a | N0 (7 moons, `R` 0.30), B1, B2 |
    | P1 | C1, C2, C3, C4 |
    | P2 | C5, C6, C9, C12 |
    | P3 | C8, C10, C7, C11, C13 |
    | P4 | C14, C16, C18 |
    | Q1 | C15, C17 |
    | P5 | V1–V9 |
    | P6 | C24, C25 |
    | Q2 | C26 |
    | P7 | C27–C29 |
    | Q3 | C30–C32 |

  - C1 is pinned at 6 moons and C5 at 3, both with `R` 0.30.
  - `'nearest-clean-plan'` becomes `'nearest-clean-star'`.

- [ ] **Step 6: Implement `generate.ts`.**
  - Place the core: R0 at the centre, the rest seeded within 12 and ≥ 5 apart.
  - Place the stars on the arm stretch. Draw each star's slots as `max(planetCount(u), its scripted planets)`.
  - Fill filler planets into free slots in birth order, using the old filler's birth law, until every slot is full by growth 1.
  - Give each planet its moons by §13's laws, except where pinned.
  - Set each body's `star`, `rule` and `planet` membership rows. Streams run core → star (`out`), star → planet (`out`), planet → planet (`side`) and C7 → R1 (`in`).
  - Keep the old generator's rules for crack, hop, `hiAt` and the sweep.
  - **N0's moons** get `partGroup` 1–7, with radius `0.35·0.30·sqrt(share_g / max share)`, floor 0.04. The share is each group's share of the bike's motes, computed in Task 8. Until then use `[1, 1, 0.6, 0.5, 0.3, 0.4, 0.2]`, a placeholder that Task 8 replaces.

- [ ] **Step 7: Run the tests.** `npx vitest run src/galaxy`. Expected: PASS.

- [ ] **Close-out** A, C and D. There are no stills: nothing is drawn yet. No existing test is retired or re-pinned, because the app is untouched.

---

