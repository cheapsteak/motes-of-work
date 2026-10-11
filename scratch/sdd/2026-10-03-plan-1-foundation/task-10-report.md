# Task 10 report: rewind invariant e2e, section screenshots, CI e2e

Status: DONE_WITH_CONCERNS (wheel step counts reduced from 40, see below)

## Implemented
- `e2e/purity.spec.ts`: for p in 0.12, 0.41, 0.88 three pages (one at a time) are compared byte for byte on `#stage` canvas screenshots with `#story` hidden:
  - jump: `/?test=1&p=<p>`
  - scroll: `/?test=1`, wheel-scrolled to the target then `scrollTo(target)`
  - detour: wheel to 0.8, wheel back to 0.05, wheel to the target, `scrollTo(target)` (both directions, then land)
  - Target scrollY is computed in the page from `scrollHeight` and `innerHeight` with the `scrollYForProgress` formula; the test asserts all three pages end at the identical integer scrollY (and that each page computes the same target) BEFORE comparing pixels.
  - Non-vacuity (a): a fourth test asserts the p=0.41 and p=0.12 screenshots differ.
- `e2e/shots.spec.ts`: skipped unless `SHOTS=1`; per section at local 0.1/0.5/0.9 writes `shots/<id>-<local>.png`. Section ids and spans are read from the DOM (`[data-section]` + `--length` via `sectionSpans`), nothing hard-coded. No `spans()` accessor was needed; the test hook is unchanged.
- `e2e/helpers.ts` (new, not in the brief's file list): shared `openStage`, `settle` (calls `__motes.settle()` then waits one more rAF), `targetScrollY`, `readSpans`, `canvasShot`. Used by both specs to avoid duplicating the hiding/settling logic.
- `package.json`: script `shots`.
- `.github/workflows/ci.yml`: top-level `permissions: contents: read`; e2e job uploads `shots/`, `test-results/`, `playwright-report/` via `actions/upload-artifact@v4` with `if: failure()` (`if-no-files-found: ignore`).

## Findings that shaped the tests
1. A frame costs ~2.4 s under SwiftShader (100k instanced motes; measured identical at 640x360 and 1280x720, so vertex-bound) and every wheel event renders one. The brief's 40 wheel steps (per hop) made each purity test run > 180 s and time out (first attempt: 3 failed on timeout in `mouse.wheel`). I reduced to 8 wheel steps for the scroll case and 4 per hop in the detour (constants `SCROLL_STEPS`, `HOP_STEPS`); each purity test now runs ~1 min, the file ~3.1 min. The concern: fewer intermediate frames than the brief's 40; the mutation check below shows the test still catches accumulation.
2. Wheel scrolling is animated and continues after the last event, so a `scrollTo(target)` issued right after the wheel loop got overrun (scrollY ended 300-700 px past target; caught by the explicit scrollY equality assertion). `wheelTo` now waits for scrollY to be still for 6 frames and within 2 px of the target before the final `scrollTo`.

## TDD evidence
GREEN (unmutated), `npx playwright test e2e/purity.spec.ts`:
```
✓ p=0.12: jumping, scrolling and scrolling past and back render identical pixels (57.4s)
✓ p=0.41: ... (57.9s)
✓ p=0.88: ... (1.1m)
✓ the check is not vacuous: different progress renders different pixels (5.6s)
4 passed (3.1m)
```
RED (temporary purity violation in `src/main.ts` `draw()`: `mutationDrive += 0.37; state.mech.drive += mutationDrive;`, a per-frame accumulator), `npx playwright test e2e/purity.spec.ts -g "p=0.41"`:
```
✘ p=0.41: jumping, scrolling and scrolling past and back render identical pixels (59.3s)
Error: scrolled render differs from jumped render
  Expected: true
  Received: false
  > 83 | expect(scroll.shot.equals(jump.shot), 'scrolled render differs from jumped render').toBe(true);
1 failed
```
Expected: the jumped page renders few frames, the scrolled page many, so the accumulated drive differs. The mutation was reverted (`git status` shows `src/main.ts` clean) and is not committed.

Full suite before commit: `npm run typecheck` clean; `npm test` clean; `npm run e2e`: 25 passed, 1 skipped (shots, as designed), 3.7 min. `npm run shots` passed (29 s), 9 images written.

## Section screenshots (looked at vibe-build 0.1/0.5/0.9, rewind 0.5, spec 0.5)
- **vibe-build-0.1 (mid-flight):** the first view of in-flight motes. Cool-blue ambient field of stray motes over the whole frame (no amber: vibed provenance). Left of centre, the drive gear is a blue ring of motes with sharp outlined hero teeth in pale cyan and a clean hole; to its right a three-armed hub (crank/spider) with a bright white-blue core, arms as dense bright strokes, with a faint haze of dust drifting between the two parts. Pieces are mid-assembly and apart rather than meshed. I could not clearly identify distinct dialogue twins or threads at this scale: the pale cyan hero outlines on the gear teeth and the brighter arm edges are the only near-white elements, and no thread lines were visible. Worth a human look at the full-resolution PNG for threads/twins.
- **vibe-build-0.5 / 0.9:** assembled case (a rounded rectangle of fine blue motes) with the gear and three-armed hub meshed on its left and a bright white "L" bracket at the lower right; the ambient field has cleared. At 0.9 the case is larger and slightly rotated (camera move).
- **rewind-0.5:** machine dissolved back into the ambient field: the gear ring on the left and a chevron/arrow-shaped bright hero mote upper right, still all blue.
- **spec-0.5:** warm amber (human) motes dominate on the large gear at right of frame, mixed with near-white ghost dots and the blue agent field; a ghosted second gear dissolves to the right edge; a few thread-like short lines are visible on the left. Reads as the specced core in a different palette from the vibed machine.

## Files changed
`e2e/purity.spec.ts`, `e2e/shots.spec.ts`, `e2e/helpers.ts` (extra), `package.json`, `.github/workflows/ci.yml`. `shots/` is gitignored.

Commit: see git log (`test: rewind invariant and section screenshots`).

## Fix round 1
Changes (`e2e/purity.spec.ts`, `e2e/helpers.ts`):
1. Not-blank guard: the `shot.length > 1000` check is replaced by `countNonBackground(jump.shot)` (pngjs decode, pixels differing from #0B0D12 by more than 24 on any channel) asserted `> MIN_LIT_PIXELS = 5000`. Measured counts of the jumped renders: p=0.12 -> 38980, p=0.41 -> 54636, p=0.88 -> 163339 (threshold is ~8x below the lowest). The count is also recorded as a test annotation. The "not vacuous" test now renders the jump shots at 0.12, 0.41 and 0.88 and asserts all three pairs differ.
2. Detour now ends with a backward landing: forward to 0.8 then back to the target for p < 0.8, forward to 0.95 then back to the target for p = 0.88 (extra hop to 0.05 dropped). This also cut each test to ~50 s.
3. `readSpans` throws on zero sections or a non-finite / non-positive `--length` (used by shots.spec.ts). On every p test the jump, scroll and detour PNGs are attached with `testInfo.attach` before the assertions, so `test-results/` (uploaded by CI on failure) holds them.

Verification:
- `npx playwright test e2e/purity.spec.ts` (unmutated): 4 passed (2.9m).
- Re-run of the temporary `mech.drive` accumulator mutation in `main.ts` against the new detour: `npx playwright test e2e/purity.spec.ts -g "p=0.41"` -> `✘ ... Error: scrolled render differs from jumped render`, 1 failed. Mutation reverted (`git status`: src clean).
- `npm run shots`: 1 passed (29 s). `npx tsc --noEmit` clean.
