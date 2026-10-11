# Task 4 review: the shell mirror pair, and the pins (0d6f921..2c4287f)

Reviewer: task reviewer (opus). Inputs: reviewer-instructions.md, plan-constraints.md, task-4-brief.md, task-4-report.md (with Fix round 1), progress.md (rulings from "Task 4: done" on), review-0d6f921..2c4287f.diff, and the specs morph-and-scatter §2.2/§3/§5/§7.2, freeze-frame §1.2/§3.3 and galaxy-orbits.

## Verification I ran

- `npx tsc --noEmit -p .`: clean (exit 0).
- `npx vitest run`: 76 files, 1,661 tests passed, exit 0. There were no warnings in the output.
- `E2E_PORT=4199 npx playwright test e2e/parity.spec.ts`: 6/6 passed (mote, node, box, orbit, derp, shell).
- **My own mutation, a different constant from the implementer's.** In shell.glsl only, I changed the settle ring's decay from `exp(-a / RING_TAU)` to `exp(-a / (RING_TAU * 1.01))`.
  - The shell parity failed: `shell: C1, shape 4` at 2.17e-4, more than 1e-5. My estimate beforehand was ≈ 0.06 · 0.01 · e⁻¹ ≈ 2.2e-4, so the ring term is really sampled after landing.
  - I undid it with the exact inverse `sed`, re-ran the shell parity (green), and checked `git status` (clean, with no diff).
- **A probe under `shots/t4probe/` (deleted afterwards).** It walked every moon slot k ∈ [0, 545] independently of `searchPin`. It reads the burst hashes directly, uses the real `bodyWorld`, `applyCamera({compose:true})` and `pinnedMoon`, and computes C1's `scatterS` with `derp()`. The results are under "The pin search" below.

## Spec Compliance

✅ **Spec compliant.** The two deliberate departures (the cos(lat) pole envelope, and per-body `shellSeed` for shapes and spin) are controller rulings and are built as ruled.

- `birth.ts` has every brief constant verbatim, plus named versions of the spec's bare numbers. There is no puffing-burst constant. `glslShellConstants()` splices them, and the declarations test plus the "no bare copy" test fence the splice.
- `shell.ts` and `shell.glsl` match the brief's interfaces. The approved extras are `ShellEvent.shape/next`, `spinShell` outside `shellWarp`, and the new exports.
- The equation matches §7.2 with the ruled envelope. `scatterK` has the exact cut schedule. The direction, amplitude, cap, ring, aftershock and jitter all match §2.2.
- `?lib=shell` matches the brief:
  - the full (14, 36) lattice of 324 motes;
  - all 11 values of `s`;
  - three hash sets, each its own body seed, event, A, gain and cap, with a moon's cap among them;
  - shapes n and n + 1 in every case;
  - 1e-5 R, with the sample count asserted.
- `searchPin` walks k ∈ [0, 545] (`floor(1200 / 2.2)`, inclusive). It takes moons in generated order inside each slot and falls back full → forced-scatter → forced-ghost → forced, in the brief's order. `FREEZE_PINS`, `AMBIENT_POSE` and `AMBIENT_GRID` are as specified: 8 entries, the pin first.

⚠️ Cannot verify from the diff (for the controller):
- **The full e2e suite.** I re-ran only the parity spec, as dispatched; the report claims 150 pass / 9 skipped.
- **Which seed Task 6 passes.** The intent is `shellSeed(id)` for `moteHashes` as well as for shapes and spin, which is what the parity page does. `moteHashes`' doc does not say so (Minor 4).
- **The fix's `v`.** Spec §3.1/§7.2 say `v` stops the shape counter and takes A to 0. `scatterCount` has no `v`; that composition is Task 6's job. It is invisible once A·v = 0.

## Strengths

- **The parity is meaningful.** Every sample runs through float32-rounded inputs on both sides, and the tolerance is 1/2000 of the wave's amplitude. Three mutations have now been caught: MOTE_TAU/4 at 9.8e-5, the envelope at 1.8e-2, and my ring decay at 2.2e-4. The sec grid covers the sweep, hold, cuts, ring and aftershock, so all three cut regimes and the eased ring are sampled.
- **The sweep tests are not performative.**
  - "Out" is measured as the real displacement `|shellWarp − shellHome|` over all 6,116 hero motes, not by reading `k`.
  - The shape-step test is behavioural. With gain 0, so the ring cannot confuse it, it classifies each mote's radius as old shape or new shape at 250 instants. It asserts one switch per mote, monotone in `u · sweep`, with a spread of more than 70 ms.
  - The cut test asserts both the value set and the order.
- **The bounds test is honestly non-vacuous.** It asserts that its maxima are reached (leap > 0.38, off-event > 0.05) and counts its off-event samples.
- **The pin's clauses use the real camera.** Clause (c) goes through `applyCamera(…, { compose: true })`, so through the real `portraitRig` and `targetOnScreen` plus three's `project`; it does not reimplement the projection. Clause (b)'s `camDir` is the unreframed `lookFromBearing`, which is correct because `portraitRig` keeps the line of sight. The fence reads the burst hashes directly rather than trusting `derp()`.
- **Purity and determinism.** There is no `Math.random`, `Date` or `performance` in shell.ts, ambient.ts, shell.glsl or the parity code. The module-load search is a pure function of `MOTE_SEED`, and the phone tier gives the identical pin. The two caches (`rowStarts`, `scatterPrefix`) are pure memoisation.
- **`lookFromBearing` moved without changing behaviour.** The formula is byte-identical to the removed `lookFrom`. Both netShots.ts call sites (`netShotKeys` and `splineShot`) now use it, and no other caller of the old name remained. `shots.ts`'s own bike-axis `lookFrom` is separate and untouched.
- **`shellSeed` is sound for its use.** It folds the code units in order through `pcg` from `SHELL_SALT`, so it depends on order and is deterministic. It keeps 24 bits, which survive a float attribute or uniform. The seven C1 bodies give distinct seeds, shapes and axes (tested).
- **The mirrors agree on per-body shapes.** The shapes are computed only on the CPU (`shapeAt`) and reach the GLSL as uniforms. The spin axis is hashed in both mirrors from the same seed, and parity compares `spun`.

## The pin search, clause by clause (named risk)

- **The walk** is correct against `derpEvent` (derp.ts:122–135). `(k − φ)·T + T/2` lands in slot k, and `t = t0 + 0.3·D` is micro-slot 2 at τ = 0.4.
- **The fallback order** is correct. A candidate must be framed, then burst + jump, then ghost, then scatter. The first candidate at each level is kept.
- **The pin is real.** The result is `forced-scatter`, moon `C1-m5`, t = 9.493782472098248. My probe gives the same first slot meeting (a)–(c), at k = 4, with dR = 0.40 r and the ghost on.
- **"(d) is unreachable": the conclusion holds for this galaxy, but the stated argument does not.**
  - **The threshold is not 0.5.** From derp.ts, the moon's event in slot k shares its kind with C1's slot k, so C1 must be in slot k ± 1.
    - For slot k + 1, C1's local time is `(Δ − 1)·T + off_k + 0.3·D`, with Δ = φ_C1 − φ_moon. That must equal `off_{k+1} + σ`, with σ ∈ [0.10, 0.20] and off ∈ [0, T − D]. This is reachable whenever Δ ≥ (0.7·D + 0.1)/T = **0.364**, not 0.5.
    - For slot k − 1 the condition is Δ ≤ (0.2 − 1.3·D)/T = −0.5.
  - **C1-m1 clears it.** Its Δ is 0.492.
  - **The probe found two C1-m1 burst slots where C1 is 0.10–0.20 s into a scatter.**
    - k = 313 (t = 689.911 s): jump on but only 0.024 r, ghost on, and it fails (b).
    - k = 356 (t = 784.485 s): it meets jump (0.378 r), (b), (c) and (d), and fails only the ghost.
  - **What the probe confirmed.** 143 slots meet (a)+(b), as the report says. 106 meet (a)+(b)+(c). 0 meet (a)+(b)+(d). So `forced-scatter` is the correct result of the brief's fallback order, which drops (d) before the ghost.
  - **What is wrong.** The ledger's rationale for ruling (1) ("phase gaps < 0.5 make (d) unreachable") and the report's "C1 is in no scatter at all at any of them / (d) cannot be met by this galaxy" overstate the case. The truth: the pin is `forced-scatter` because the exhaustive search says so, not because of the phases.
  - **For the controller.** A real-scatter pin with no ghost exists at t = 784.485 s, C1-m1, so Task 12 could avoid forcing the scatter if it traded the ghost instead. The brief's order says not to; I mention it only because ruling (1) was argued from the false premise. Under the brief as written this causes no bug.

## Issues

### Critical

None.

### Important

1. **The fence does not check the fallback on the path actually taken.** At src/galaxy/ambient.test.ts:105–129, "is the first slot that meets the clauses" returns early at :110 when `pin.path !== 'full'`. The path is `forced-scatter`, so its whole slot walk is dead for the essay galaxy.
   - The test's name claims something it never checks. What actually runs asserts only that the phone tier gives the same pin.
   - The path is what the ledger records and what Task 12 acts on, by forcing `FREEZE_SCATTER_S` on C1. Suppose a slip in `searchPin`'s (d) clause made `scatter` always false: a wrong hero row, a `derpOf` argument, or a unit error in `PIN_SCATTER_SEC`. Every test would still pass, and the pin would silently become `forced-scatter`. The same holds one level down for a ghost-clause slip and `forced-ghost`.
   - My probe shows the search is honest today: 0 of 143 (a)+(b) slots meet (d). That is regression protection the suite lacks.
   - Even on the `full` path, the walk stops at `k < kPin − 1` (:113). It skips slot kPin − 1, and it never checks the pin slot's earlier moons, which can be earlier in k-major order.
   - **The fix.** Drop the early return. For each path, walk all 546 × 6 slots with the clause checks the test already has (hash-read jump and ghost, the `camDir` dot, `onPhone`, C1's `scatterS`). Assert that:
     - no slot before the pin, in walk order, meets the full set of clauses for its path;
     - for `forced-scatter`, no slot at all meets (a)–(d);
     - for `forced-ghost`, none meets (a)–(c).

     This costs about the module-load search, roughly 100 ms.

### Minor

1. **The fence does not check the spec's jump size.** Freeze-frame §3.3's fence says the moon is "≥ 0.2 r off its ellipse". The search counts any `d.dR !== 0` as the jump (src/galaxy/ambient.ts:134), and the fence asserts only `dR ≠ 0` (src/galaxy/ambient.test.ts:73). The brief's (a) does not state the size, and this pin is at 0.40 r, so nothing is wrong today. But a jump hash in the middle of its range passes: the probe's k = 313 candidate has |dR| = 0.024 r. Add `|d.dR| ≥ 0.2 r` to (a) in both places, or note the departure.
2. **The per-event shell salts overlap `derpEvent`'s own salts.**
   - The layout is the brief's (`k · 64 + j`, src/scene/node/shell.ts:273 and src/scene/node/birth.ts:428–431). The burst in derp.ts has the same pre-existing overlap.
   - `derpEvent` reads `hash01(seed, 2k)` (offset) and `hash01(seed, 2k + 1)` (kind). So slot k's sweep z, sweep azimuth and aftershock are slot 32k's offset and kind and slot 32k + 1's offset.
   - For k = 0 this is self-correlation. Slot 0's sweep azimuth is its own kind hash, so slot 0's scatter always sweeps within a 90° azimuth wedge (the scatter's 0.25 band), and its sweep z is tied to its own t0.
   - The effect is cosmetic and touches one event. But the test "keeps its salt families apart" (src/scene/node/shell.test.ts:489) checks only the 64-block width, not this collision. Either note it there, or start j at 2 so slot 0 avoids salts 0 and 1.
3. **A stale header.** The src/timeline/cameraSpline.ts:8 header still says "Test and tooling support, like its callers". ambient.ts now imports `lookFromBearing` at module load, and `AMBIENT_POSE` is runtime-bound (reduced motion, `?test=1`), so this module is no longer tooling-only. Update the sentence.
4. **`moteHashes` does not say which seed to pass.** Its doc (src/scene/node/shell.ts:130) does not say the seed is the body's `shellSeed(id)`, though the parity page passes that seed. `spinAxis` and `shellEvent` say so explicitly. If Task 6 passes the shared derp seed, every cracked body's motes leap identically, with the same hold, amplitude, direction and jitter. Add one sentence.

### Notes (not findings)

- **A fragile spot in the parity grid.** Several grid seconds sit on jitter tick boundaries: 0.2, 0.4, 0.6 and 0.9 are multiples of 1/30. For example, `f32(0.9)·30` rounds to 27.0 in float32, while TS's float64 floor gives 26. This is harmless only because no mote is out at 0.9; 0.2, 0.4 and 0.6 round the same way on both sides. If the grid ever changes, keep the sampled seconds off multiples of 1/30, or tolerate a tick shift as the derp case does.
- **"Every mote home by 0.36 s"** holds strictly on the lattice: the latest landing is `0.08·(su+1)/2 + 0.12 + 0.06·h4 + 0.10`, below 0.36 because su < 1 and h4 < 1. `landingSec(1, 1) = 0.36` is pinned.

## Assessment

**Task quality:** Needs fixes

**Reasoning:** The shell pair, the parity and the scatter timing are correct, and well and honestly tested; I verified independently that the pin search is right. The fence test, though, does nothing on the fallback path that was actually taken, so nothing in the suite would catch a broken clause (d) silently turning the pin into `forced-scatter`. Also, the ledger's "phase gap < 0.5" rationale for that path is mathematically wrong: the threshold is 0.364, and C1-m1 at 0.492 does meet (d) twice. The path holds only because of the exhaustive search.
