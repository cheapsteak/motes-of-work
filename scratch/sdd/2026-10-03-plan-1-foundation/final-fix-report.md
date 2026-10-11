# Final-review fix wave (Plan 1): report

Branch `plan-1-foundation`, six commits on top of `9e4e2d3`, nothing pushed, no background processes left running.

| Item | Commit |
|---|---|
| 1 Pages deploy runs typecheck and unit tests | 9e5ac47 |
| 2 `applyCamera` refreshes `matrixWorld` | f4650c7 |
| 6 `explodedOffset` about the posed position | 2372be9 |
| 5 `hash01` top 24 bits | 65d2dc8 |
| 4 shimmer off under reduced motion (+ `?n=`) | f644232 |
| 3 README | f9f9491 |

## 1. Pages workflow
`.github/workflows/pages.yml`, build job: `npm ci`, then `npm run typecheck`, `npm test`, then `npm run build`. No e2e. Verified by reading the diff only (it cannot run locally); the same two commands pass locally (see final run).

## 2. `applyCamera`
`src/scene/cameraRig.ts` now calls `camera.updateMatrixWorld()` after `lookAt` (the `fov`/`updateProjectionMatrix` branch is unchanged).
Test (`cameraRig.test.ts`, "refreshes matrixWorld immediately, without a render") checks the translation of `matrixWorld` and that `(0,0,-1)` transformed by `matrixWorld` points at the target.
- RED: `AssertionError: expected 0.0846 to be less than 0.000001` (the orientation in `matrixWorld` lagged one pose behind; the translation assertion already passed because `lookAt` refreshes the position).
- GREEN: `Tests 2 passed (2)`.

## 3. README
Replaced "Status: design" with Plan 1 status; added a Develop section (`npm ci/dev/typecheck/test/e2e/shots/build`), the SwiftShader launch args and "never run `playwright install` locally / `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`", and a URL-parameter table: `?p`, `?test=1`, `?state=`, `?n=` (essay, new, see item 4), `?n=`/`?dpr=` (spikes), `?isolate=1`. Notes shimmer is also off under reduced motion.

## 4. Reduced motion
`src/main.ts`: `reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')`; `shimmerOn() = !testMode && !reducedMotion.matches`. `draw` passes `shimmerTime = null` when off; the rAF loop only continues while `shimmerOn()`; a `change` listener calls `requestFrame()` so flipping the preference redraws once without shimmer (or resumes the loop).

`?n=`: the essay had no `?n=`, and a continuously rendering 100k-mote page under SwiftShader made the shimmer contrast check hang past 120 s (and a stale preview server hid a first attempt). I added a small `?n=` to the essay (`moteBudget()` in `main.ts`): a positive integer, capped at `MOTE_BUDGET_DESKTOP`; invalid or missing means the default. This is an addition beyond the brief, documented in the README. Flag for review if you would rather not have it.

e2e `e2e/reducedMotion.spec.ts` (no `?test=1`, `?p=0.88&n=3000`):
1. `emulateMedia({reducedMotion:'reduce'})`: canvas screenshots 3 s apart are byte-identical, with a non-blank guard (`countNonBackground > 200`).
2. Non-vacuous contrast: `no-preference`, canvas read via `toDataURL` inside an animation frame 3 s apart must differ.
- RED: temporarily changed `shimmerOn` to `!testMode`: test 1 failed (`frame changed with time under reduced motion`, Received false). Restored.
- GREEN: `2 passed (20.3s)`.

## 5. `hash01`
`src/math/hash.ts`: `(pcg(...) >>> 8) / 16777216`; `src/scene/mote/mote.glsl`: `float(pcg(...) >> 8u) / 16777216.0`.
Test (`hash.test.ts`, "is exactly representable in float32 (a multiple of 2^-24)…"): over 5000 seeds `Math.fround(h) === h` and `h * 2^24` is an integer.
- RED: `expected 0.9802654981613159 to be 0.9802654900122434` (old formula not float32-exact).
- GREEN after the change. No test expectations needed updating; the statistical tests, mote tests and parity all pass unchanged (parity e2e passed: hash01 < 1e-7, motes < 1e-3).

## 6. `explodedOffset`
`src/scene/mote/partTransforms.ts`: position = `lerp(0, offset.position, 1-a) + pose.position`; rotation = `slerp(identity, offset.quaternion, 1-a) * pose.quaternion` (via `lerpTransform` then `compose` with a zero-position transform). Documented on `explodedOffset` in `src/mechanisms/types.ts` and in the function comment.
Test (`mote.test.ts`): stub mechanism, pose at `(2,0,0)` with a y-rotation, offset `(1,0,0)` with a 90 degree z-rotation. Assembly 1: exactly the pose. Assembly 0: position `(3,0,0)` and rotation = offset*pose. Assembly 0.5: position `(2.5,0,0)`, rotation = 45 degree offset * pose.
- RED: `expected 1.0000000000000004 to be close to 3` (the old code swung it to `(1,2,0)`).
- GREEN: `16 passed`.
Gears offsets have identity rotation, so gears output is unchanged; the existing test "applies the exploded offset in world space after the pose" still passes, and the parity page (which uses `partTransforms`) passes.

## Final verification (after all changes)
```
npm run typecheck           -> tsc --noEmit, no errors
npm test                    -> Test Files 16 passed (16); Tests 153 passed (153)
npm run e2e                 -> 36 passed, 1 skipped (shots, needs SHOTS=1), 3.5m, EXIT=0
```
Not committed: `docs/plans/2026-10-03-plan-2-shapes-and-depth.md` (pre-existing untracked file, not mine) and `.superpowers/`.

## Notes
- Running `npx prettier --write` on the new spec rewrote it with double quotes (the repo has no prettier config and uses single quotes); I restored the repo style by hand. The PostToolUse hook's prettier warning on that file is that mismatch, not a lint failure.
- A stray `vite preview` left over from an interrupted run made Playwright reuse a stale build (`reuseExistingServer`); it was killed and none remain.
