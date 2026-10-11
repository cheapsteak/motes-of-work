### Task 3: The derp mirror pair

**Files:**
- Create: `src/scene/node/derp.ts`, `src/scene/node/derp.glsl`, `src/scene/node/derp.test.ts`
- Modify: `src/scene/node/birth.ts`, `src/scene/node/shaderSource.ts`, the parity files (`?lib=derp`), `e2e/parity.spec.ts`

**Interfaces:**
- Consumes: `hash01` (`src/math/hash.ts`), `NODE_NEVER`, `BodyKind`.
- Produces:
  ```ts
  export enum DerpKind { Burst = 0, Scatter = 1, Skip = 2, Stall = 3, Reverse = 4, Wobble = 5 }
  export const DERP_WEIGHTS = [0.30, 0.25, 0.20, 0.10, 0.075, 0.075] as const;  // morph §2.2
  export interface DerpEvent { active: boolean; k: number; t0: number; s: number; kind: DerpKind }
  export function derpEvent(seed: number, phase: number, t: number): DerpEvent;
  export interface Derp { dNu: number; dR: number; lift: number; wobble: Vec3; orbitT: number; ghost: number; ghostNu: number; scatterS: number /* seconds into a scatter, −1 if none */ }
  export function derp(seed: number, phase: number, t: number, kind: BodyKind, r: number, R: number, omega: number, v: number): Derp;
  ```
  The constants go in `birth.ts` and are spliced into the GLSL:
  - schedule: `NODE_DERP_PERIOD 2.2`, `NODE_DERP_DUR 1.0`
  - skip: `DERP_SKIP_R 0.55`, `DERP_SKIP_LIFT 0.20`
  - wobble: `DERP_WOBBLE 0.06`, `DERP_STAR_SHIVER 4`
  - burst slots: `BURST_SLOTS 8`
  - burst motion: `BURST_SNAP 0.45`, `BURST_SNAP_HOLD 0.6`, `BURST_JUMP_P 0.7`, `BURST_JUMP 0.9`, `BURST_LIFT 0.3`
  - burst jitter: `BURST_JITTER 0.03`, `BURST_JITTER_HZ 30`
  - tremble: `BURST_TREMBLE 0.05`, `BURST_TREMBLE_HZ 40`
  - ghost: `BURST_GHOST_P 0.5`, `BURST_GHOST_GAIN 0.45`, `BURST_GHOST_SPAN 0.6`
  - quantise: `BURST_QUANT_P 0.45`, `BURST_QUANT_STEP 0.1`

  **The schedule:**
  ```
  k = floor(t/T + phase)
  t0 = (k − phase)·T + hash01(seed, 2k)·(T − D)
  s = (t − t0)/D
  kind by cumulative DERP_WEIGHTS on hash01(seed, 2k + 1)
  ```
  **The terms:**
  - **Burst:** `hash01(seed, k·64 + slot·8 + j)`.
  - **Skip:** `Δr = 0.55 r·p(s)` and `y = 0.20 r·p(s)`. `p` eases out to 1 by s 0.6, snaps to 0 over 0.6–0.72, then rings as `−0.25 sin(4πτ)(1 − τ)`.
  - **Stall:** `Δa = −ωD[min(s, 0.7) − 0.7·smoothstep(0.7, 1, s)]`.
  - **Reverse:** `Δa = −0.5 sin(πs)`.
  - **Wobble:** `0.06 R·sin(πs)·n(9s)` on x and z, half on y.
  - **Stars and the core:** every kind but Scatter becomes Wobble, at 4×.
  - **The fix:** every term is multiplied by `v`.

- [ ] **Step 1: Write the failing tests** (`derp.test.ts`)

```ts
it('a healthy body never derps', () => { for (const t of grid(0, 1200, 5000)) expect(derp(NODE_NEVER, 0.3, t, 'planet', 5, 0.3, 0.1, 1)).toEqual(ZERO_DERP); });
it('the fix silences every term', () => { /* v = 0 → ZERO_DERP for cracked seeds at every t */ });
it('the duty is 45 % and no gap exceeds 2.4 s', () => { /* over 10⁴ slots: active share ∈ [0.42, 0.48]; max gap ≤ 2.4 */ });
it('kinds come by weight', () => { /* 10⁴ events: |freq − DERP_WEIGHTS[i]| ≤ 0.02 */ });
it('each kind reaches its extremum and no further', () => {
  // skip: max dR = 0.55 r at s 0.6, lift 0.2 r; burst: |dNu| ≤ 0.225, |dR| ≤ 0.45 r, |lift| ≤ 0.15 r; reverse: min dNu = −0.5 at s 0.5;
  // star: wobble amplitude = 4 × 0.06 R
});
it('the burst cuts, it does not tween', () => {
  // inside one micro-slot sampled every 1 ms, dNu takes exactly two values {0, snap}; the jitter changes only at multiples of 1/30 s;
  // when h7 < 0.45, orbitT is a multiple of 0.1; ghost is 0 outside a burst
});
it('inherits the source\'s order', () => { /* C1, its moons, P1, R0: the same kind sequence for k = 0..50 */ });
```

- [ ] **Step 2: Run it.** Expected: FAIL.

- [ ] **Step 3: Implement `derp.ts` and `derp.glsl`** with the formulas above and only GLSL operations.

- [ ] **Step 4: Add `?lib=derp`.**
  - Sample seeds: C1, P1 and R0's derp seeds, plus `NODE_NEVER`.
  - Sample t from 0 to 20 s in steps of 0.0137, plus the 2k-th `t0 + 0.3D` of each kind.
  - Compare every `Derp` field.
  - Add the parity e2e test.

- [ ] **Step 5: Run.** Expected: PASS.

- [ ] **Close-out** A, C and D. No stills; nothing is retired.

---

