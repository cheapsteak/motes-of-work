# Task 3 report: the derp mirror pair

Status: DONE_WITH_CONCERNS (interface readings the brief left open; see Concerns 1–4)

## Commits (on `main`, not pushed)

- `775f71a` galaxy: the derps, a schedule of six kinds and an un-eased burst, in both mirrors

One commit, because the mirror pair, its splice and its parity mode change together.

## What I implemented

- **`birth.ts`**: every brief constant, verbatim, plus a few more so that no number of the formulas lives in two files:
  - brief: `NODE_DERP_PERIOD 2.2`, `NODE_DERP_DUR 1.0`, `DERP_SKIP_R 0.55`, `DERP_SKIP_LIFT 0.20`, `DERP_WOBBLE 0.06`, `DERP_STAR_SHIVER 4`, `BURST_SLOTS 8`, `BURST_SNAP 0.45`, `BURST_SNAP_HOLD 0.6`, `BURST_JUMP_P 0.7`, `BURST_JUMP 0.9`, `BURST_LIFT 0.3`, `BURST_JITTER 0.03`, `BURST_JITTER_HZ 30`, `BURST_TREMBLE 0.05`, `BURST_TREMBLE_HZ 40`, `BURST_GHOST_P 0.5`, `BURST_GHOST_GAIN 0.45`, `BURST_GHOST_SPAN 0.6`, `BURST_QUANT_P 0.45`, `BURST_QUANT_STEP 0.1`.
  - added (the brief formulas' own numbers): `DERP_SKIP_PEAK 0.6`, `DERP_SKIP_HOME 0.72`, `DERP_SKIP_RING 0.25`, `DERP_STALL_HOLD 0.7`, `DERP_REVERSE 0.5`, `DERP_WOBBLE_RATE 9` (the `n(9s)`), and `DERP_FINE_SALT = 2^30` (see Salts below).
  - `DerpKind` and `DERP_WEIGHTS` live here (as `NodeRole` does) so the splice can read them; `derp.ts` re-exports both, so `import { DerpKind, DERP_WEIGHTS } from './derp'` works as the brief's interface says.
  - `DERP_CUMULATIVE`: the running sums rounded to float32, the last exactly 1. Both mirrors compare the kind hash against the same float32 thresholds; the TS also compares the burst probabilities against `Math.fround(p)`. That way a hash that lands exactly on a threshold picks the same branch in both mirrors.
  - `glslDerpConstants()` and `DERP_CONSTANTS`. This is a separate list from the NODE and ORBIT lists, so the three libraries can share one shader. For the same reason the GLSL gets `NODE_NEVER` as `DERP_NEVER`, and the kinds as `DERP_KIND_*` (a bare `DERP_WOBBLE` would clash with the amplitude constant).
- **`derp.ts`** (`derp.glsl` mirrors it step for step): `DerpKind`, `DERP_WEIGHTS`, `DerpEvent`, `derpEvent`, `Derp`, `derp` with the brief's signatures. It also exports `ZERO_DERP` (the tests use it). Nothing is integrated, and there is no `Math.random`.
  - **The schedule** is the brief's formula. The slot's own time `t − (k − phase)T` comes from the remainder of `t` by `T`, through `orbitTurns` (now exported from `orbit.ts`; the GLSL calls orbit.glsl's own copy). After that, the phase carries the slot on by at most one. The result equals `floor(t/T + phase)`, but float32 keeps it to the precision of `t`, as the controller's note asked. A test checks `k`, `t0` and `s` against the literal formulas.
  - **Kinds:**
    - The skip's `p` is a quadratic ease-out to 1 by s 0.6, a linear snap to 0 over 0.6–0.72, then the ring `−0.25 sin(4πτ)(1 − τ)`. It is continuous throughout.
    - The stall and the reverse use the brief's formulas exactly.
    - The wobble is `0.06 R sin(πs) n(9s)` on x and z, and half that on y. `n` is a seeded value noise with lattice values in [−1, 1], smoothstepped between.
    - A star or a core body turns every kind but the scatter into the wobble at 4×.
    - A scatter moves nothing and returns `scatterS`, the seconds into the event.
  - **The burst**: slot = `floor(8s)`, τ its fraction; `h_j = hash01(seed, k·64 + slot·8 + j)`. The terms use j as follows (my assignment of the j the spec does not name):
    - the snap `(h0 − 0.5)·0.45` holds while τ < 0.6;
    - the jump is on when `h1 < 0.7`, and is `(h2 − 0.5)·0.9 r`, square-pulsed with the snap;
    - the lift `(h3 − 0.5)·0.3 r` holds with the snap;
    - the ghost is on when `h6 < 0.5`, at `(h5 − 0.5)·0.6` rad, while the snap holds;
    - the quantised clock applies over the whole slot when `h7 < 0.45`;
    - h4 is unused.
  - **The jitter** is held for 1/30 s of the event's time. **The tremble** is 40 Hz value noise at `0.05 R`, in the middle third, under a sine envelope, so it eases in and out ("only the tremble keeps an eased profile").
  - **The fix**: `v ≤ 0` returns `ZERO_DERP`, and otherwise every term is multiplied by `v` (`ghost` = `v`). `scatterS` is a clock and is not scaled; the shell scales its scatter by `v` itself (Task 4's `gain`).
  - **A healthy seed** (`NODE_NEVER`) returns `ZERO_DERP` before hashing anything, and its `derpEvent` is never `active`.
- **`derp.glsl`**:
  - It reads the mote library (`hash01`, `moteSinCos`, `MOTE_TAU`) and orbit.glsl (`orbitTurns`), and never calls the builtin sin or cos (a unit test fails if it does).
  - The `Derp` struct is generated from `DERP_PARITY_FIELDS` (fields.ts) and spliced in, as `NodeOut` is.
  - The body kinds come from bodyData.ts's `BODY_KIND` as `DERP_BODY_CORE` and `DERP_BODY_STAR`, spliced by shaderSource.ts.
  - One naming difference: the GLSL `DerpEvent` names `active` as `on`, because `active` is a reserved word in GLSL ES. The first compile failed on it.
- **`shaderSource.ts`**:
  - `DERP_INCLUDE_MARKER`
  - `derpLibraryGlsl()`: derp.glsl alone
  - `withDerpLibrary(vertex)`: the mote library, then orbit.glsl, then derp.glsl. A shader that already has the mote and orbit libraries should splice `derpLibraryGlsl()` alone, in the same way as `orbitLibraryGlsl()`.
- **Salts**: the schedule hashes 2k and 2k+1, and the burst k·64 + slot·8 + j, as the brief says. The value-noise lattice uses `DERP_FINE_SALT + k·256 + i·3 + axis`, and the jitter `+ k·256 + 128 + m·2 + c`. A test checks that the families stay apart for k < 2^20 (26 days).

## Parity (`?lib=derp`)

- `fields.ts`: `DERP_PARITY_FIELDS` (all eight Derp fields, 10 components) and `glslDerpStruct()`. `fields.test.ts` checks that the list covers `Derp` exactly and is the struct the library is built with.
- `shaders.ts`: `DERP_VERTEX`, with `aDerpA` = (seed, phase, t, body kind) and `aDerpB` = (r, R, ω, v).
- `parity.ts`: `derpCases`, one case per body.
  - The bodies are `C1 (planet)`, `C1-m1 (moon)`, `P1 (star)` and `R0 (core)`, all on R0's seed with their own phases, plus `a healthy planet` (`NODE_NEVER`). I added C1's moon to the brief's seed list to cover the moon kind.
  - Each body is sampled at t = i·0.0137 for i = 0..1459 (0–20 s) at v = 1.
  - Each cracked body is also sampled at the first two events of each kind (k ≥ 0), at `t0 + 0.3D`, with v ∈ {1, 0.37, 0}. That makes 1,496 samples for each cracked body and 1,460 for the healthy one.
  - r is the track's semi-major axis and ω = 2π/period, both as float32, read from the body.
- **Cuts and float32.** Every burst term, the schedule's edges, the jitter ticks and the quantised clock are hard cuts in time.
  - Float32 rounds the event's own time by a few units in its last place. So a sample that close to a cut can land on the other side of it in the GLSL, which is a real difference of up to the cut's size, not a mirror bug.
  - Each sample is therefore scored against the TS at `t` and at `t ± 16 ulp(t)`, and keeps the closest. The page counts the samples that needed the shift (`shifted`, shown in a third column), and the e2e test requires `shifted ≤ 1 %` of samples.
  - In practice this happens exactly where the brief's event samples sit: `s = 0.3` is a jitter tick, because 0.3 × 30 = 9. C1 and its moon each have 2 shifted samples out of 1,496; P1, R0 and the healthy planet have 0. A probe confirmed that no grid sample lies within 16 ulp of a cut in the TS.
- **Measured maxError:**

  | case | maxError | shifted |
  |---|---|---|
  | C1 (planet) | 4.7e-6 | 2 / 1496 |
  | C1-m1 (moon) | 1.9e-6 | 2 / 1496 |
  | P1 (star) | 1.6e-6 | 0 |
  | R0 (core) | 2.5e-6 | 0 |
  | a healthy planet | 0 | 0 |

  hash01 and the pcg goldens are 0.
- **Mutation checks** (GLSL only, each restored from a saved copy afterwards):
  1. Flipping the sign of the skip's ring fails with 0.53 on C1 and 0.097 on its moon.
  2. Moving the jitter's salt from 128u to 129u fails with 0.11 and 0.020.
  3. Setting the star shiver factor to 3 instead of `DERP_STAR_SHIVER` fails with 0.052 on P1 and 0.082 on R0.

  The three mutations cover the planet path, the burst and the star/core path. `derp.glsl` is byte-identical to the committed file.

## Tests and results

### TDD

- **RED:** `npx vitest run src/scene/node/derp.test.ts` failed with `Error: Cannot find module './derp'` (no tests ran). That was expected, because the module did not exist yet.
- **First GREEN run:** 17 of 18 passed. The scatter test sampled `s = 0` exactly, where `t0 + 0·D` rounds to just before the event. That is a fault in the test, so its grid now starts at s 0.005.
- **GREEN:** `npx vitest run src/scene/node/derp.test.ts` gives 18 passed.

### What `derp.test.ts` holds

- **The brief's seven tests:**
  - **A healthy body never derps** (verbatim, 5,000 t). Every healthy body also carries `NODE_NEVER`.
  - **The fix silences every term** (v = 0): R0's seed at 8 phases × 4 body kinds × 2,000 t, plus C1, its six moons, P1 and R0.
  - **The duty is 45 % and no gap exceeds 2.4 s:**
    - The duty is sampled over 10⁴ slots (200,000 samples) at 3 phases, and is within [0.42, 0.48].
    - The gaps between consecutive events are ≥ 0 and ≤ 2.4 s, and the largest is > 2.3 s, so the bound is nearly reached.
  - **Kinds come by weight:** over 10⁴ events, every |freq − weight| ≤ 0.02. The float32 thresholds are checked too.
  - **Each kind reaches its extremum and no further:**
    - skip: dR = 0.55 r and lift = 0.2 r at s 0.6, never further, and home at 0.72;
    - burst: |dNu| ≤ 0.225, |dR| ≤ 0.45 r and |lift| ≤ 0.15 r, each reaching 95 % of its bound over 200 bursts;
    - reverse: −0.5 at s 0.5, and no lower;
    - stall: −ωDs until 0.7, and back to 0 by 1;
    - wobble: within 0.06 R on x and z and half that on y. A star's and the core's are exactly 4× a planet's at the same instant, the largest within 4 × 0.06 R and above 90 % of it.
  - **The burst cuts, it does not tween:**
    - in 12 bursts × 8 slots sampled every 1 ms, dNu is exactly {snap, 0}, with the snap computed independently from `hash01(seed, k·64 + slot·8)`, and switches at 60 % of the slot;
    - dR and lift take at most two values each, and dR is 0 when h1 ≥ 0.7;
    - the ghost is exactly its hashed on/off with the hold;
    - when h7 < 0.45, `t + orbitT` is a multiple of 0.1 (to 1e-9) and orbitT ∈ (−0.1, 0], and otherwise it is 0;
    - outside the middle third, the wobble changes between two 1 ms samples if and only if a multiple of 1/30 s of the event's time lies between them.
  - **Inherits the source's order:** C1, its six moons, P1 and R0 are cracked, share R0's seed, have distinct phases and have the same kind sequence for k = 0..50 (which holds all six kinds).
- **Added:**
  - k, t0 and s match the brief's formulas.
  - A star and the core only shiver, except for the scatter.
  - The scatter hands the shell its clock and moves nothing.
  - v scales every term linearly; scatterS is unscaled.
  - The tremble is confined to the middle third, bounded by 0.05 R, and changes at 40 Hz.
  - The ghost is 0 outside a burst (20,000 t × 6 phases).
  - The ghost sits at the snap plus its offset.
- **GLSL:**
  - It declares every constant birth.ts exports.
  - It names constants only from the spliced set, and holds no bare copy of 2.2, 0.55, 0.45, 0.06 or NODE_NEVER.
  - It never calls the builtin sin or cos, and orbitTurns is spliced ahead of it.
  - The salt families stay apart.

### Close-out

- **A.** `npm run typecheck && npm test`: 74 files, 1,635 passed (the base 1,616, plus 18 derp tests and 1 fields test).
- **B.** There are no stills.
- **C.** `E2E_PORT=4199 npm run e2e` (the web server rebuilds dist/ first) on `775f71a`: 149 passed and 9 skipped, exit 0 (details at the end).
- **D.** Committed by name.
- Nothing was retired or re-pinned.

## Files changed

- Created:
  - `src/scene/node/derp.ts`
  - `src/scene/node/derp.glsl`
  - `src/scene/node/derp.test.ts`
- Modified:
  - `src/scene/node/birth.ts`: the derp constants and their splice
  - `src/scene/node/orbit.ts`: `orbitTurns` is exported, with no behaviour change
  - `src/scene/node/shaderSource.ts`
  - `src/parity/fields.ts` and `fields.test.ts`
  - `src/parity/shaders.ts`
  - `src/parity/parity.ts`: `?lib=derp`, and `samples`/`shifted` on `ParityCase`
  - `e2e/parity.spec.ts`

## Self-review

- **Signatures:** the brief's signatures are kept. `ZERO_DERP` is exported, and `orbitTurns` is now exported from orbit.ts.
- **Formatting:**
  - The new TS files pass `prettier --print-width 140 --single-quote`.
  - The edited files have the same prettier drift as before my edits (I compared each file against HEAD): none added. `fields.test.ts` drift went from 21 lines to 11.
- **Probes removed:**
  - three throwaway probe tests (`tmpcut.test.ts`);
  - a temporary `console.log` in the e2e spec.
  - Nothing stray is left in the tree.
- **Docs:** derp.ts's header holds the whole contract: what each field means, its units, the salt map and the v rule. derp.glsl points to it.

## Concerns (readings to confirm before Tasks 4 and 6 build on them)

1. **Where the jitter lives.**
   - The brief bounds the burst at |dNu| ≤ 0.225 and |dR| ≤ 0.45 r, and requires dNu to take exactly two values inside a slot. Jitter on the angle or the radius would break all three, and `Derp` has no jitter field.
   - So the jitter (up to 0.03 r, in the galaxy's plane, x and z) is in `wobble`, beside the tremble. Task 6 adds `wobble` as a world offset, so the body jitters along and across its track as §12.3 says, in world axes rather than orbit axes.
   - The alternative is a new `Derp` field.
2. **`orbitT` is an offset**: the body's orbit reads ambient `t + orbitT`.
   - A constant `ZERO_DERP` and "every term × v" both need it to be an offset.
   - So "orbitT is a multiple of 0.1" is tested as "`t + orbitT` is a multiple of 0.1". The quantisation is absolute (`floor(t/0.1)·0.1`, §12.3's formula), computed with `orbitTurns`.
3. **The ghost.**
   - `ghost` is the ghost's presence (0, or v while the snap holds); Task 6 draws it at `BURST_GHOST_GAIN·ghost·gain`.
   - `ghostNu` is measured from the body's undisturbed angle: snap + (h5 − 0.5)·0.6. The ghost sits on the track, with no dR or lift.
4. **Other open readings:**
   - "the 2k-th t0 + 0.3D of each kind" is read as each kind's first two events.
   - The jitter ticks and the tremble run on the event's own time (so the copied gesture is the same in every heir). The schedule and the quantised clock run on the ambient.
   - The tremble is on x and z, and half on y, as the wobble is, under a sine envelope over the middle third.
   - The skip's ease-out is quadratic and its snap linear. The spec gives neither curve.
5. **v is applied inside `derp()`.** Task 6's plan line says every term is scaled by `lodGain(Derp)·v`. The renderer should multiply by `lodGain` only, or v is applied twice.
6. **Salt overlap the brief implies.** The schedule's `2k` and the burst's `k·64 + …` share one salt space, so event k's schedule hash equals some earlier event's burst hash. Task 4's scatter `k·64 + j` also overlaps burst slot 0. These are correlations between different events, or between kinds that never share an event. They are harmless, and I kept the brief's salts verbatim.

## Close-out C (final e2e on HEAD)

`E2E_PORT=4199 npm run e2e` (the web server rebuilds dist/ first) on HEAD `775f71a`: 149 passed and 9 skipped (the SHOTS-gated screenshots) in 23.6 min, exit 0. That is the base 148 plus the new derp parity test. No background processes were left.

## Fix round 1 (review Minors 1 to 6)

Commit: `0d6f921` galaxy: name the derps' salt layout, hold their parity to 1e-4, and sample every kind across its profile. It sits on top of `775f71a`; no history was rewritten.

Every mutation below was applied and then undone with an exact inverse string edit by a small script. The script checks that each target occurs exactly once, and confirms the file is byte-identical afterwards. All six reported "restored byte-identical: True". No git checkout was used.

### 1. The v-scaling test covers the scatter

- **The change.** The test now also loops over 3 scatter events × 40 values of s × (star, planet). At each sample, `scatterS` must not be −1 and must be the same at v 0.37 as at v 1.
- **Mutation.** `d.scatterS = sec * v` in derp.ts fails "v scales every term" (0.00185 against 0.005).

### 2. The derp parity is held to 1e-4

- **The change.** e2e/parity.spec.ts gives the derp test its own `DERP_TOLERANCE = 1e-4`; the other libraries keep 1e-3. The test also pins the sample counts exactly: 1,640 for a cracked body and 1,460 for the healthy one.
- **Measured now:**

  | case | maxError | shifted |
  |---|---|---|
  | C1 (planet) | 4.7e-6 | 4 / 1640 |
  | C1-m1 (moon) | 6.2e-6 | 2 / 1640 |
  | P1 (star) | 5.9e-6 | 0 |
  | R0 (core) | 9.0e-6 | 0 |
  | a healthy planet | 0 | 0 |

- **Mutation.** In the GLSL only, I made the tremble 5 % too large (`1.05 * BURST_TREMBLE`).
  - C1 failed at 5.7e-4. That error is under the old 1e-3 bound, so only the new bound catches it.
  - The moon's error was 7.5e-5, which still passes 1e-4 alone (R = 0.04). Its larger terms are covered.

### 3. The salt layout and the shape factors are named and spliced

- **New in birth.ts:**
  - `DERP_FINE_EVENT 256`, `DERP_FINE_LATTICE 3`, `DERP_FINE_JITTER_AT 128` and `DERP_FINE_JITTER 2`. These are spliced as `const uint` from a new `DERP_UINT_CONSTANTS` list, together with `DERP_FINE_SALT`.
  - `DERP_WOBBLE_Y 0.5` and `BURST_TREMBLE_PARTS 3`, spliced as floats.
- **Both mirrors now read the names.**
- **The GLSL tests:**
  - every uint constant must be declared with its value;
  - derp.glsl may hold no bare `256u`, `128u`, `* 2u`, `* 3u`, `amp * 0.5` or `s * 3.0`.
- **The salt-families test** now computes its bounds from the named values: the lattice top below `DERP_FINE_JITTER_AT`, and the jitter top below `DERP_FINE_EVENT`.
- **Mutation.** `DERP_FINE_JITTER_AT = 250` fails "keeps its salt families apart" (311 is not less than 256).

### 4. Eased-profile unit tests

- **The tremble's envelope.**
  - **The test.** Over the middle third, `wobble[1]` must equal `DERP_WOBBLE_Y · 0.05 R · sin(π(3s − 1)) · n_y(40 s)` to 1e-12. The test recomputes the y noise independently from its lattice hashes.
  - **Mutation.** A flat envelope (the sine dropped) fails, with the received value 16× the expected one.
- **The skip's lift ring.**
  - **The test.** `lift ≥ −0.25 · 0.2 r` at 2,000 samples of s over 5 skip events.
  - **Mutation.** The lift alone made 1.5× deeper on the ring fails that line (−0.2536 against −0.25).
- **The stall's lower bound.**
  - **The test.** `dNu ≥ −0.7 ωD` at 2,000 samples of s over 5 stall events.
  - **Mutation.** I changed the catch-up so that it overshoots past the hold, with `1.2 · ss(0.75, 1) − 0.2 · ss(0.7, 0.75)`. It still returns to 0 at s 1, so only the new line can catch it, and that line fails (−0.63004 against −0.63).
  - A first, cruder stall mutation was also caught, but by the older return-to-zero line. I replaced it with this targeted one.

### 5. Kind coverage by construction

- **The change.** Each cracked body's first two events of each kind are now sampled at s ∈ {0.1, 0.3, 0.5, 0.65, 0.85}, at each v ∈ {1, 0.37, 0}. That is 180 event samples a body, on top of the grid.
  - Only events with `t0 ≥ 0` are taken.
  - The search is capped at `DERP_EVENT_SLOTS = 2000` slots, and the page throws if a kind has fewer than two events in them.
- **Mutation.** I emptied the grid (`DERP_GRID_END = 0`) and, in the GLSL only, made the stall's catch-up end by s 0.9. Only the event samples remained, and they alone failed: C1 at 0.025 and the moon at 0.25.

### 6. ZERO_DERP is frozen through

- **The change.** The wobble array is frozen too. The type is `Readonly<Omit<Derp, 'wobble'>> & { readonly wobble: Readonly<Vec3> }`.
- **The new test, "ZERO_DERP is frozen through":**
  - both the object and the array are frozen;
  - a write to `wobble[0]` throws;
  - the value is still `[0, 0, 0]`.
- **Mutation.** Leaving the array unfrozen fails it.

### Results

- `npx tsc --noEmit -p .`: clean.
- `npx vitest run`: 74 files, 1,636 passed. derp.test.ts now has 19 tests.
- `E2E_PORT=4199 npx playwright test -g derp e2e/parity.spec.ts`: 1 passed.
- Formatting:
  - derp.ts and derp.test.ts pass `prettier --print-width 140 --single-quote`;
  - parity.ts and parity.spec.ts have the same prettier drift as at HEAD;
  - birth.ts is clean.
- Full e2e: `E2E_PORT=4199 npx playwright test` on `0d6f921` gives 149 passed and 9 skipped (the SHOTS-gated screenshots) in 23.6 min, exit 0. No background processes were left.
