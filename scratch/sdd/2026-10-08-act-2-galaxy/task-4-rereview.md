# Task 4 re-review: the fix round (2c4287f..4b627ad)

Reviewer: scoped re-reviewer (sonnet). Inputs: task-4-review.md (Important, Minor, Notes), task-4-report.md "Fix round 2", the last four lines of progress.md, review-2c4287f..4b627ad.diff, and the source at 4b627ad (ambient.ts, derp.ts). No file other than this one was written.

## Verification I ran

- `npx tsc --noEmit -p .`: clean, exit 0.
- `npx vitest run src/galaxy src/scene/node`: 13 files, 187 tests, all passed, exit 0.
- Playwright not run, as instructed. The report's 150 pass / 9 skipped e2e figure is unverified here.

## Finding by finding

### Important 1 (the fence returned early on a non-full path): resolved

The early return is gone. "is the first slot of its path, and no slot anywhere meets a stronger path" now runs for the path actually taken (`forced-scatter`).

- **Independent of searchPin: yes.** `clauseWalk()` in ambient.test.ts never calls `searchPin` or `candidate`, and imports only `FREEZE_PINS` and `pinnedMoon` from ambient.ts. It computes each clause itself:
  - (a) the kind from `derpEvent`; the jump and the ghost from `hash01(m.derpSeed, ev.k*64 + 2*8 + j)` read directly (j 1 and 2 for the jump, j 6 for the ghost). The jump size is `|(h2 − 0.5)·BURST_JUMP| ≥ 0.2`, which equals `|dR| ≥ 0.2·a` since derp.ts:210 has `dR = (h2 − 0.5)·BURST_JUMP·r·v` with r = orbit a and v = 1.
  - (b) the dot of the moon-to-C1 offset with `lookFromBearing(...)`, computed in the test.
  - (c) the test's own `onPhone` (own camera, `applyCamera({compose:true})`, `project`) for both the pinned moon and its home.
  - (d) C1's `scatterS` through the test's own `derpOf`.
- **Covers every slot in the search's order: yes.**
  - The loop is `k = 0..floor(1200/2.2) = 545`, inclusive, with the six C1 moons in generated order inside each k. That is the same nesting as `searchPin` (k outer, `moons` inner) and the same `(k − φ)·T + T/2`, `t0 + 0.3·D` and 0 ≤ t ≤ 1200 handling.
  - The walk skips slots whose t falls outside [0, 1200], as the search does. The test asserts `walk.length > 3000` out of at most 3,276.
- **What it asserts:**
  - The pin is a slot of the walk.
  - It meets its own path's clauses (`MEETS`, with `forced` special-cased for slot 0).
  - No earlier slot meets them.
  - No slot anywhere meets any stronger path. For `forced-scatter` that is: nothing meets (a)–(d) anywhere.
- **The report's mutations are credible.** Ghost clause broken: the downgrade is caught. (d) always true: two tests fail.
- **Accepted by the controller, and I agree:** (d) forced always false is not caught, because in this galaxy the correct and the broken search give the identical pin.
- **A gap I note without raising it:** the walk's own `scatter` clause is never shown to be true anywhere. If the test's (d) read were wrong and always false, "no stronger path" would pass vacuously. The always-true mutation proves the search's (d), not the walk's. One cheap positive control would close it: assert that at least one slot has `scatter` true. The earlier review's probe found such slots, for example k = 356 for C1-m1.
- **Phone tier:** the check is kept as its own test.

### Minor 1 (jump size): resolved

`searchPin` now requires `|d.dR| ≥ PIN_JUMP · a` with `PIN_JUMP = 0.2` (ambient.ts). The fence walk checks the same independently. The pin test asserts `|d.dR| ≥ 0.2·a` on the pin. The doc comment is updated. The pin has 0.40 r by the earlier review, so the extra clause only removes candidates.

### Minor 2 (slot-0 salt overlap): resolved

`SHELL_EVENT_SWEEP_Z/_SWEEP_AZ/_AFTERSHOCK` are now 2, 3, 4 (birth.ts). The shell reads them only through the named constants (shell.ts:278–285); no literal salts remain. The GLSL never hashes an event, because it takes the sweep and aftershock as uniforms, so the report's "TS only" claim holds. The shell.glsl header says so.

- The salt test now asserts the three j are distinct, inside the 64 block, never equal to 2k or 2k + 1 for k < 4096, and min j ≥ 2.
- The k < 4096 loop is nearly vacuous: only k = 0 can collide at all. The `min(eventJ) ≥ 2` assertion is the one that bites.
- Cross-slot overlap (slot k's j = 2, 3 against slot 32k + 1's offset and kind) remains. That is the burst's pre-existing pattern, and the report discloses it.

### Minor 3 (stale cameraSpline header): resolved

The header now says the splines are test and tooling support, and that `lookFromBearing` is also read at runtime by the freeze pin's search at module load.

### Minor 4 (`moteHashes` seed doc): resolved

The doc says to pass the body's `shellSeed(id)`, never the shared derp seed, and why.

### Note (parity grid on 1/30 tick boundaries): resolved

The spec's grid values are kept, deliberately, and the `SHELL_SECS` doc now explains it. 0.2, 0.4 and 0.6 round to the same tick in float32 and float64. At 0 and 0.9 no mote is out, so no jitter is read. It also says new values should stay off multiples of 1/30. This matches the earlier review's analysis. No logic changed in the parity page.

## New problems in the fix diff

- **Critical:** none.
- **Important:** none.
  - No test is performative. The fence and walk assertions fail under the reported mutations.
  - **The pin is unchanged.** I did not re-evaluate it, because that needs a scratch file under the repo. The reasoning: the only search change is the extra jump clause, which only removes candidates; the pin already has 0.40 r (earlier review's probe), and the new walk independently confirms the pin is the first slot of `forced-scatter`. The report says the same. The salt change cannot move it, since the search reads no shell salts.
  - **Types:** tsc is clean. `PinPath` is imported as a type from ambient.ts and was already exported, and `MEETS` is a total `Record<PinPath, …>`.
- **Cosmetic only:**
  - the ambient.ts doc comment at line 149 runs about 140 characters because the rewrap left it unbalanced;
  - the salt test's k < 4096 loop is nearly vacuous, as noted above.
