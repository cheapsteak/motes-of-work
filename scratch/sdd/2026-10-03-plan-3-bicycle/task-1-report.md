# Task 1 report: per-part settle windows

Status: DONE (one note under Concerns)
Commit: a4e9b4e "Per-part settle windows"

## Implemented
- `MechanismPart.settle?: readonly [number, number]` in `src/mechanisms/types.ts`, with a doc comment (window semantics, role default, must stay inside it, "settled once assembly >= to").
- `src/scene/mote/attributes.ts`: exported `ROLE_SETTLE` (core `[SETTLE_WINDOW, 0.45]`, body `[0.35, 0.95]`, drift `[0.5, 0.95]`) and `settleWindow(part)` (own window, else role default). `buildMoteAttrs` now computes `settle = from + (to - from) * h1` for all roles through `settleWindow`; the private `CORE_SETTLED_BY` constant is gone (folded into the table). `mote.ts` and `mote.glsl` are untouched.
- Contract test over every registered mechanism: a declared `settle` has `from < to` and lies inside `ROLE_SETTLE[role]` (imports the shared table).
- `docs/adding-a-mechanism.md`, "Building one" step 4: one sentence on `settle`.

## Tests
- New `src/scene/mote/attributes.test.ts` (there was no attributes test file): settleWindow default and own window; for each of the 4 registered mechanisms, with no `settle` declared, every mote's settle matches the old formulas (computed in the test) at budget 3000 / seed 11; a steam body part with `settle: [0.6, 0.7]` has all its motes in [0.6, 0.7] and other parts are unchanged.
- Full run: `npx vitest run` 39 files, 493 tests pass. `npx tsc --noEmit -p .` clean.

## TDD evidence
- RED: `npx vitest run src/scene/mote/attributes.test.ts src/mechanisms/contract.test.ts` -> 3 failed | 57 passed. Failures: `settleWindow is not a function` (x2, the two settleWindow tests) and `expected 0.8394... to be less than or equal to 0.7` (the part-window test; the old code ignores `settle`). Expected: the feature did not exist. The legacy-equivalence and contract tests passed at RED because behaviour was unchanged (the contract test is vacuous until a part declares `settle`).
- GREEN: same command after implementation, then `npx vitest run`: 493 passed.

## Files changed
docs/adding-a-mechanism.md, src/mechanisms/contract.test.ts, src/mechanisms/types.ts, src/scene/mote/attributes.ts, src/scene/mote/attributes.test.ts (new).

## Self-review
- Briefly applied prettier by mistake (repo has no prettier config; it reflowed whole files). Caught in the diff stat, restored the three files from the previous commit and re-applied only the intended edits, then amended. Final diff is 129 insertions, 9 deletions.
- No existing mechanism declares `settle`, so the contract test's new check has nothing to fail on today; it will bite when the bicycle declares windows.

## Concerns
- The brief asks for settle values "identical to before". With the window formula, body and drift values can differ from the old literal-span formulas by one double ULP (about 1e-16), because `0.95 - 0.35` is not bitwise `0.6`. The legacy-equivalence test therefore compares to 12 decimal places (exact `toBe` failed on 4 values in the first run). This is far below float32 precision (the GPU attribute), so no rendering or parity change is expected. `e2e/parity.spec.ts` was not run (the brief specifies unit tests only).
