# Task 3 review: the derp mirror pair (aabcc65..775f71a)

Reviewer: task reviewer, 2026-10-08. Inputs: reviewer-instructions.md, plan-constraints.md, task-3-brief.md, task-3-report.md, progress.md (Task 3 rulings), review-aabcc65..775f71a.diff, and the derp sections of docs/specs/2026-10-07-galaxy-orbits.md (§5, §12.3) and docs/specs/2026-10-07-morph-and-scatter.md (§2.2). The controller's rulings (1) to (6) were not re-raised. None of them causes a bug I could find.

## Spec Compliance

✅ **Spec compliant.**

- Interfaces match the brief. `DerpKind` (values 0 to 5 in the brief's order), `DERP_WEIGHTS`, `DerpEvent`, `derpEvent(seed, phase, t)`, `Derp` (all eight fields) and `derp(seed, phase, t, kind, r, R, omega, v)` are in src/scene/node/derp.ts. The enum and the weights are defined in birth.ts and re-exported. This is how the brief's import path works.
- Every constant the brief names is in birth.ts with the brief's value, and all of them are spliced into the GLSL (`glslDerpConstants`). A declarations test checks that the spliced value equals the TS value. A no-bare-copy test checks that 2.2, 0.55, 0.45, 0.06 and NODE_NEVER never appear as literals in derp.glsl.
- **Schedule.** k, t0 and s are computed by the remainder route. A test checks them against the brief's literal formulas over 10 phases × 997 times (derp.test.ts "k, t0 and s are the brief formulas"). The kind comes from float32 cumulative thresholds on `hash01(seed, 2k+1)`.
- **Terms.** These match the brief verbatim:
  - The skip is 0.55 r·p and 0.20 r·p. Its ease-out reaches 1 at s 0.6, it snaps to 0 over 0.6 to 0.72, and then it rings as −0.25 sin(4πτ)(1−τ).
  - The stall is −ωD[min(s, 0.7) − 0.7·smoothstep(0.7, 1, s)].
  - The reverse is −0.5 sin(πs).
  - The wobble is 0.06 R sin(πs) n(9s) on x and z, and half that on y.
  - For a star or the core, every kind except the scatter becomes the wobble at 4×.
  - The burst hashes come from `hash01(seed, k·64 + slot·8 + j)`.
  - Every term is multiplied by v, and v ≤ 0 returns ZERO_DERP.
- **Scatter as the sixth kind.** It moves nothing and returns `scatterS` as the seconds into the event. This agrees with morph §2.2, where the shell owns the scatter's terms.
- **`?lib=derp`.**
  - The page samples C1, C1-m1, P1, R0 and a NODE_NEVER planet.
  - Each body is sampled at t = i·0.0137 over 0 to 20 s, and also at each kind's first two events at t0 + 0.3D, with v ∈ {1, 0.37, 0}.
  - Every Derp field is compared, all 10 components (`DERP_PARITY_FIELDS`).
  - There is an e2e test (e2e/parity.spec.ts:125–137).
  - The moon case is an addition beyond the brief, and a sensible one.
- All seven of the brief's unit tests are present. Extra tests cover the k/t0/s formulas, the star and core shiver, the scatter clock, v scaling, the tremble, the ghost and the salt families.

⚠️ **Cannot verify from the diff:** nothing material. The plan's mirror-pair rule wants a parity mode and an e2e test for each pair. Both exist here, and I ran them (see Verification).

## Named risks: what I checked and what I found

1. **Parity is meaningful (all six kinds, active and inactive windows, hard cuts).**
   - **Check 1, a TS probe.** I put a temporary vitest config and probe in shots/ and deleted both afterwards. The probe tallied the parity grid's samples by active kind for each cracked body. All six kinds are active inside the 0 to 20 s grid for C1, C1-m1, P1 and R0. Each kind has 73 to 219 samples, including 20 to 61 late samples (s > 0.72), so the skip's ring and the stall's catch-up are covered. Each body has about 800 inactive samples. A burst gets about 9 grid samples per 125 ms micro-slot, so the snap-hold and slot cuts are crossed.
   - **Check 2, a mutation re-run.** In `src/scene/node/derp.glsl`, I changed `if (tau < BURST_SNAP_HOLD)` to `if (tau < 0.5)`. That moves the burst's hard cut. `E2E_PORT=4199 npx playwright test e2e/parity.spec.ts -g derp` then **failed**: `derp: C1 (planet)` had maxError 1 (the ghost differed by 0 against 1).
   - **Check 3, a second mutation to probe the tolerance.** I removed the tremble's sin envelope in the GLSL. The test **failed** on C1 (planet) with 0.0103.
   - **Restoring the file.** `git checkout` was denied by this session's permission layer. Each mutation was restored by the exact inverse edit instead. After each one, `git diff --quiet HEAD -- src/scene/node/derp.glsl` reported the file identical to HEAD, and `git status --short` was clean. A final clean run of the whole parity spec, which rebuilds dist/, passed 5 of 5.
   - **Verdict: holds.** The tolerance does have a blind spot on the moon (Minor 2).
2. **Determinism and purity.**
   - Neither derp.ts, derp.glsl nor birth.ts contains Math.random, Date, performance.now or rAF.
   - derp() reads only (seed, phase, t, kind, r, R, ω, v) and the hashes, and it integrates nothing.
   - The parity page is the cross-check that the same (seed, t) gives the same output in both mirrors.
   - **Verdict: holds.**
3. **Un-eased cuts.**
   - The snap, jump, lift and ghost are gated on `tau < BURST_SNAP_HOLD`, which is a square pulse.
   - The jitter is `floor(sec·30)`, which is held.
   - The quantised clock is `−(t mod 0.1)`, which is a step.
   - The slot index is `floor(8s)`.
   - Only the tremble carries an envelope (sin over the middle third). That matches §12.3: "Only the tremble … and the skip's departure keep an eased profile".
   - The unit test "the burst cuts, it does not tween" samples 12 bursts × 8 slots every 1 ms. dNu is exactly {snap, 0}. dR and lift have at most two values. The jitter changes only at 1/30 s ticks.
   - **Verdict: holds.**
4. **LOD and v scaling.**
   - Every amplitude carries exactly one `* v`. That includes the wobble amp, the stall, the reverse, both skip terms, the snap, jump and lift, the ghost (= v), ghostNu, orbitT, the jitter and the tremble amp.
   - Nothing is multiplied by v twice, and no LOD term is present (correctly: lodGain belongs to Task 6, per ruling 4).
   - `scatterS` is the raw seconds at any v > 0, and −1 at v ≤ 0, which the brief's "the fix silences every term" requires. That is consistent.
   - **Verdict: holds.** One test claim about scatterS is vacuous (Minor 1).
5. **Bounds tests.**
   - **Burst:** |dNu| ≤ 0.225, |dR| ≤ 0.45 r and |lift| ≤ 0.15 r over 200 bursts × 8 slots. Each also has to reach 95 % of its bound, so these are not performative.
   - **Skip:** the peak is 0.55 r and 0.2 r at s 0.6, never exceeded over 2,000 s-samples × 5 events, and home at 0.72.
   - **Reverse:** −0.5 at s 0.5, and no lower.
   - **Wobble:** within the stated bounds. The star and the core are exactly 4× and reach 90 % of 4 × 0.06 R.
   - **Duty and gap:** these use 10⁴ slots × 3 phases. The maximum gap is also asserted to be > 2.3 s, so the 2.4 s bound is nearly reached.
   - **Kinds:** 10⁴ events, ±0.02.
   - **Verdict:** real assertions on enough samples. The gaps are listed under Minor 4.

## Strengths

- **Float32 handling.** The precision work is careful and has a reason behind each step:
  - The slot time comes from the remainder via `orbitTurns`.
  - The cumulative and probability thresholds are compared as float32 in both mirrors, so a hash exactly on a threshold branches the same way in both.
  - The parity page reports how many samples needed the ±16 ulp shift, so the tolerance is visible and bounded instead of silent.
- **Splicing fences.** Constants, the Derp struct (from `DERP_PARITY_FIELDS`, with a test that checks it covers Derp exactly), the body kinds from `BODY_KIND`, and a lint-style test against bare literals and builtin sin/cos.
- **Salt families.** These are documented and tested to stay apart for k < 2^20.
- **The header of derp.ts** states the whole contract: units, salts and the v rule.

## Issues

### Critical

None.

### Important

None.

### Minor

1. **The scatterS assertion in the v-scaling test is vacuous** (src/scene/node/derp.test.ts:245–254).
   - The test loops over Burst, Skip, Stall, Reverse and Wobble, but not Scatter. In every iteration, `part.scatterS` and `full.scatterS` are therefore both −1.
   - No unit test checks that a scatter's `scatterS` is the same at v 0.37 and at v 1. The scatter test (around line 232) runs at v = 1 only.
   - The report's "v scales every term linearly; scatterS is unscaled" overstates this. The code is right (`d.scatterS = sec`), and the parity event samples do exercise a scatter at v 0.37. The fix is one more loop over `events(DerpKind.Scatter, …)` at two values of v.
2. **The parity tolerance is coarse for the moon's small terms** (e2e/parity.spec.ts:131).
   - The cases share the absolute 1e-3 bound of the other libraries, but the measured error is ≤ 4.7e-6.
   - On C1-m1 (R = 0.04), the wobble's amplitude is 0.0024 and the tremble's is 0.002 (0.001 on y). An error in those terms on the moon would mostly pass.
   - The same code paths are covered at larger scale on C1 (R 0.3), P1 and R0, which is where my tremble mutation was caught (0.0103). So this is a sensitivity gap, not a hole.
   - A derp-specific bound of 1e-4 would leave about 20× headroom over the measured error and would catch an error of about 5 % in the planet's wobble.
3. **Fine-salt strides and shape factors are literals in both mirrors, not spliced.**
   - The strides: `k·256`, `+128`, `i·3`, `m·2` (derp.ts:130, 212; derp.glsl:73, 140).
   - The shape factors: the half-on-y `0.5` (derp.ts:182, 217) and the middle-third `3` (derp.ts:214, derp.glsl:144).
   - The plan's mirror-pair rule wants constants from one source. These are implementer-invented layout numbers, and parity does fence them: the implementer's 128u → 129u mutation failed. Still, naming them (for example `DERP_FINE_STRIDE`) would make the salt-families test check the real values rather than restating them.
4. **A few eased-profile properties have no unit test** (derp.test.ts:322 onward).
   - The tremble's sin envelope is not checked. A flat envelope passes every unit test: zero outside the third, the bound, peak > 50 %, and a change over 1/40 s all still hold. Only the GLSL side is fenced, by parity.
   - The lower bounds of the skip's lift ring (≥ −0.25 · 0.2 r) and of the stall's dNu (≥ −0.7 ωD) are not asserted.
   - These are coverage gaps, not wrong tests.
5. **The parity grid's kind coverage depends on the seed** (src/parity/parity.ts:664, 716).
   - With today's galaxy, the 0 to 20 s grid holds all six kinds at every s for every cracked body (my probe).
   - The only coverage guaranteed by construction is one s (0.3) per kind. If the generator's seed or phases change, the stall's catch-up or the skip's ring could quietly leave the parity sample.
   - Possible fixes: also sample each kind's event at a few values of s (for example 0.1, 0.5, 0.65, 0.85), or have the page assert per-kind sample counts.
   - Related: the kind loop at line 716 has no cap on k. This is harmless with these weights.
6. **`ZERO_DERP` is frozen only shallowly** (src/scene/node/derp.ts:104). `Object.freeze` leaves the `wobble` array mutable, so a caller that writes `ZERO_DERP.wobble[0]` corrupts the shared constant. derp() itself returns a fresh `zero()` each time. Only importers of `ZERO_DERP` (tests now, maybe Task 6) are at risk. The fix is to freeze the array too, or type `wobble` as `readonly`.

## Verification (run by this reviewer)

- `npx tsc --noEmit -p .`: exit 0, no output.
- `npx vitest run`: 74 files, 1,635 passed, exit 0, no warnings in the summary.
- `E2E_PORT=4199 npx playwright test e2e/parity.spec.ts` (the web server rebuilt dist/ from the clean tree): 5 passed.
- With mutations, `-g derp` only: the burst hold-cut mutation failed (1.0 on C1), and the tremble-envelope mutation failed (0.0103 on C1).
- After the work:
  - derp.glsl is identical to HEAD.
  - `git status --short` is clean.
  - The shots/ helper files are deleted.
  - No server is left on port 4199.

## Assessment

**Spec compliance:** ✅
**Task quality:** Approved
**Reasoning:** The mirror pair implements the brief's schedule and terms verbatim, with careful float32 handling. The parity page exercises all six kinds, inactive windows and the hard cuts, and it catches GLSL mutations I chose myself. The findings are test-coverage and sensitivity gaps (Minor), and none of them makes the task untrustworthy.
