### Task 4: The shell mirror pair, and the pins

**Files:**
- Create: `src/scene/node/shell.ts`, `src/scene/node/shell.glsl`, `src/scene/node/shell.test.ts`, `src/galaxy/ambient.ts`, `src/galaxy/ambient.test.ts`
- Modify: `birth.ts`, `shaderSource.ts`, the parity files (`?lib=shell`), `e2e/parity.spec.ts`

**Interfaces:**
- Consumes: `derpEvent`, `derp`, `DerpKind` (Task 3); `bodyWorld`, `packBodyData` (Task 2); `generateGalaxy` (Task 1); `portraitRig` and `targetOnScreen` (`src/scene/cameraRig.ts`).
- Produces:
  ```ts
  // shell.ts (shell.glsl mirrors it)
  export interface Shape { p: number; q: number; p2: number; q2: number; phi: [number, number, number, number] }
  export function shapeAt(seed: number, n: number): Shape; // p ∈ {12,14,16,18,20}; q = p/2 + {−1,0,1}; p2 = p + 3..7; q2 = max(3, q − 1..3)
  export function latticeLL(i: number, rows: number, cols: number): { lat: number; lon: number }; // odd rows offset half a step
  export function spinAxis(seed: number): Vec3;              // 25–40° off vertical; one turn in SHELL_SPIN_PERIOD = 14 s
  export function morphR(lat: number, lon: number, t: number, s: Shape, A: number): number;
  //   1 + A[sin(p·lon + φ1 + 0.35t)·sin(q·lat' + φ2 − 0.22t) + 0.45·sin(p2·lon + φ3 − 0.5t)·sin(q2·lat' + φ4)], lat' = lat + π/2
  export function scatterCount(seed: number, phase: number, t: number): number; // scatters so far: the shape index n
  export function scatterK(sec: number, su: number, h4: number): number;       // 0 before 0.04(su+1); 1 for 0.12 + 0.06·h4 s; then 0.55 → 0.25 → 0 at 50 ms steps
  export function shellWarp(ll: { lat: number; lon: number }, h: readonly number[], t: number,
    ev: { sec: number; sweep: Vec3; n: number; aftershock: boolean }, A: number, gain: number, cap: number): Vec3; // unit-R position
  // ambient.ts
  export const AMBIENT_GRID_TIMES = [0, 149, 311, 487, 659, 853, 1061] as const;
  export const HERO_CLOSE = { C1: { bearing: -35, elevation: 32, distance: 3.4, fov: 36, frame: 1 } } as const;
  export type PinPath = 'full' | 'forced-scatter' | 'forced-ghost' | 'forced';
  export interface Pin { t: number; path: PinPath; moon: string }
  export function searchPin(g: Galaxy, hero: 'C1'): Pin;
  export const FREEZE_PINS: { C1: Pin };                     // at module load, from the essay galaxy
  export const AMBIENT_POSE: number;                         // = FREEZE_PINS.C1.t
  export const AMBIENT_GRID: readonly number[];              // [AMBIENT_POSE, ...AMBIENT_GRID_TIMES]
  ```
  The constants go in `birth.ts`:
  - equation: `EQ_A 0.02`, `EQ_W [0.35, −0.22, 0.5]`, `EQ_P [12, 14, 16, 18, 20]`
  - sweep: `SCATTER_SWEEP 0.04`
  - hold: `SCATTER_HOLD [0.12, 0.06]`
  - return: `SCATTER_RETURN [0.55, 0.25, 0]` at `SCATTER_STEP 0.05`
  - jitter: `SCATTER_JITTER 0.03`
  - direction: `SCATTER_INWARD [0.22, −0.6]`
  - amplitude: `SCATTER_AMP [0.12, 0.28]` (≤ 0.40 R); `SCATTER_MOON_CAP 0.30`
  - settle ring: `RING_AMP 0.06`, `RING_TAU 0.16`, `RING_HZ 6`
  - aftershock: `AFTERSHOCK_AT 0.55`, `AFTERSHOCK_P 0.5`, `AFTERSHOCK_AMP 0.45`
  - brightness when out: `SCATTER_OUT_GAIN 0.6`
  - freeze pose: `FREEZE_MOON_S 0.3`, `FREEZE_SCATTER_S 0.16`, `FREEZE_PIN_SEARCH_S 1200`

  `A = EQ_A` on a cracked shell and 0 on a healthy one. Puffing bursts are off: the optional constant is not built.

- [ ] **Step 1: Write the failing tests** (`shell.test.ts`, `ambient.test.ts`)

```ts
it('a healthy shell is a lattice sphere at every ambient', () => { /* A = 0, no event: |shellWarp| = 1 to 1e-6 over every mote of (14,36) × 50 t */ });
it('the bounds hold', () => { /* 10⁵ samples: |p − u| ≤ 0.40 + 0.03; off-event ||p| − 1| ≤ EQ_A·1.45 + RING_AMP */ });
it('the sweep crosses in 80 ms and all are home by 0.36 s', () => {
  // at sec 0.04: every mote with su > 0 home, ≥ 95 % of su < −0.2 out; at 0.16: all out; at 0.36: all home
});
it('the return is three cuts', () => { expect(new Set(grid(0, 0.4, 4000).map((s) => scatterK(s, 0.3, 0.5)))).toEqual(new Set([0, 1, 0.55, 0.25])); });
it('the shape steps once per scatter, in sweep order', () => {
  // morphR at shape n vs n+1: RMS difference ≥ 0.5·A; a mote's n before its landing and after differ by exactly 1
});
it('the moon\'s scatter is capped at 0.30 R', ...);
// ambient.test.ts
it('the pin is a fence: the path is named and its clauses hold', () => {
  const { t, path, moon } = FREEZE_PINS.C1;
  // (a) moon's derpEvent kind Burst, s = 0.3, jump on and ghost on (unless path ∈ forced-ghost, forced)
  // (b) dot(home − C1, camDir)/|home − C1| > 0.35 with camDir from HERO_CLOSE.C1
  // (c) the pinned moon projects inside the central 60 % of 390 px and below 0.42 × 844 through portraitRig/targetOnScreen
  // (d) C1's scatter at sec ∈ [0.10, 0.20] unless path ≠ 'full'
  expect(['full', 'forced-scatter', 'forced-ghost', 'forced']).toContain(path);
  expect(AMBIENT_POSE).toBe(t); expect(AMBIENT_GRID[0]).toBe(t); expect(AMBIENT_GRID).toHaveLength(8);
});
```

- [ ] **Step 2: Run them.** Expected: FAIL.

- [ ] **Step 3: Implement `shell.ts` and `shell.glsl`** (morph §2.2 and §7.2), using `hash01(seed, k·64 + j)` per event and `hash01(seed, i·8 + j)` per mote.

- [ ] **Step 4: Implement `searchPin`.**
  - Walk C1's six moons over k ∈ [0, 545] (1,200 s of 2.2 s slots) and take the first slot meeting (a)–(d).
  - If none does, drop (d) and path = `forced-scatter`. Then also drop the ghost (`forced-ghost`). Then force everything (`forced`).

- [ ] **Step 5: Add `?lib=shell`.**
  - Grid: `u` over a (14,36) lattice, three hash sets, s ∈ {−1, 0, 0.03, 0.08, 0.15, 0.2, 0.26, 0.31, 0.4, 0.6, 0.9}, both shapes n and n+1.
  - Tolerance: 1e-5 R.
  - Add the parity e2e test.

- [ ] **Step 6: Run.** Expected: PASS.

- [ ] **Close-out** A, C and D. No stills; nothing is retired. Report the pin path and `AMBIENT_POSE`: the controller records them in the ledger.

---

