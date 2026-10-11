# Task 3 re-review: fix round 1 (775f71a..0d6f921)

Reviewer: task reviewer, 2026-10-08. Scope: the six Minor findings of task-3-review.md against review-775f71a..0d6f921.diff (commit 0d6f921), plus a check for new Critical or Important problems. Nothing was modified. No subagents. Playwright was not run (the implementer ran the full e2e).

## Verification run

- `npx tsc --noEmit -p .`: exit 0, no output.
- `npx vitest run src/scene/node`: 7 files, 113 tests passed.
- `git status --short`: clean afterwards.

## The six Minor findings

1. **scatterS assertion vacuous: RESOLVED.** The v-scaling test now has a separate loop over 3 `DerpKind.Scatter` events x 40 values of s (grid(0.005, 1, 40), which excludes s = 1) x star and planet. It asserts `full.scatterS !== -1`, `part.scatterS === full.scatterS` (v 0.37 against 1) and `scatters > 0`. Each assertion can fail, and the implementer's `scatterS = sec * v` mutation was caught.
2. **Parity tolerance coarse: RESOLVED.** `DERP_TOLERANCE = 1e-4` applies to every case of the derp test. That includes the hash01 and pcg cases, and they stay far below it. The other libraries keep 1e-3. The sample counts are pinned exactly (1460 for the healthy planet, 1460 + 180 for a cracked body), which matches the code (the grid has ceil(20 / 0.0137) = 1460 points, and the events add 6 x 2 x 5 x 3 = 180). Measured error is at most 9e-6, a 10x or greater margin. A 5 % tremble error on C1 (5.7e-4) now fails, where the old 1e-3 let it pass. Residual: the moon (R = 0.04) lets that same 5 % error through (7.5e-5), and the implementer says so. The larger code paths are covered on C1, P1 and R0, so the residual is acceptable.
3. **Fine-salt strides and shape factors literal: RESOLVED.**
   - birth.ts now exports `DERP_FINE_EVENT` (256), `DERP_FINE_LATTICE` (3), `DERP_FINE_JITTER_AT` (128), `DERP_FINE_JITTER` (2), `DERP_WOBBLE_Y` (0.5) and `BURST_TREMBLE_PARTS` (3).
   - Both mirrors read the names. Nothing literal is left in derp.ts or derp.glsl for these. I checked each replaced site in the diff, and the TS and GLSL expressions are the same.
   - The GLSL splice is correct. The float names go through `lit()`, which yields `3.0` and `0.5`. The uint names are emitted as `const uint NAME = <n>u;` from `DERP_UINT_CONSTANT_LIST`. `uint(k) * DERP_FINE_EVENT` and `s * BURST_TREMBLE_PARTS` type-check in GLSL (uint x uint, float x float). The declarations come before use, because the constants are spliced first.
   - The tests check every uint declaration, forbid the bare forms, and derive the salt-families bounds from the named values.
   - Nit: the bare-form regex `\* [23]u\b` only matches that exact spacing. The parity page fences the rest.
4. **Eased-profile tests missing: RESOLVED.**
   - The tremble envelope test recomputes the y noise from lattice hashes, so it is independent of `noise()` in the code under test. It checks `wobble[1]` over the middle third to 1e-12 (`toBeCloseTo(.., 12)` is under 5e-13). A flat envelope fails it.
   - The skip lift lower bound `lift >= -0.25 * 0.2 r` and the stall lower bound `dNu >= -0.7 omega D` are both asserted over 2000 samples x 5 events. The implementer's targeted mutations (1.5x deeper lift ring, and a stall overshoot that still returns to 0) were caught only by these lines.
   - The envelope test restates the formula with the same `DERP_FINE_*` names, so it fences the shape but not the salt layout. The parity page fences the layout.
5. **Kind coverage depends on the seed: RESOLVED.**
   - Each cracked body's first two events of each kind are sampled at s in {0.1, 0.3, 0.5, 0.65, 0.85} x v in {1, 0.37, 0}.
   - The search is capped at `DERP_EVENT_SLOTS` = 2000, and the page throws if fewer than two events are found.
   - The test pins the resulting sample count. The implementer showed that the event samples alone (grid emptied) catch a stall catch-up mutation.
   - Observation, not an issue: s = 0.5 sits exactly on the burst's slot-4 boundary. Those samples therefore land on a hard cut, which is the case the ulp-shift accounting (`shifted`, at most 1 %) exists for. Measured shifted is 4 and 2 of 1640, so it is well inside the budget.
6. **ZERO_DERP shallowly frozen: RESOLVED.**
   - `wobble` is frozen (`Object.freeze([0, 0, 0] as Vec3)`), and the type is `Readonly<Omit<Derp, 'wobble'>> & { readonly wobble: Readonly<Vec3> }`.
   - The test "ZERO_DERP is frozen through" checks both freezes, checks that a write throws (the vitest files run as ES modules, in strict mode) and checks the value is unchanged.
   - tsc is clean, so no caller assigns it to a mutable `Derp`.

## New problems introduced by the diff

- **Tests that assert nothing: none.** Each new assertion has a recorded mutation that fails it. The scatter loop guards with `scatters > 0`.
- **Constants spliced into the GLSL incorrectly: none.** The literal forms, types and order are correct, and `DERP_FINE_SALT` still emits the same line as before. The declarations test checks every float and every uint. The vitest run covers the TS side. The GLSL compile and parity are covered by the implementer's full e2e (149 passed). I did not re-run them.
- **Parity grid no longer samples inactive windows or hard cuts: none.** The 0 to 20 s grid is unchanged (same step, same end, v = 1), so it still covers the inactive windows (about 800 samples a body) and the burst cuts. The event samples are added on top, not substituted. Event selection now requires `ev.t0 >= 0` (before: `t >= 0`), which is stricter and harmless.
- **Broken type: none.** `tsc --noEmit` exit 0.

## Result

All six Minor findings are resolved. New Critical or Important issues: none.
