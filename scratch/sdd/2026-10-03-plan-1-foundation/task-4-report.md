# Task 4 report: Transform and hash math

## Implemented
- `src/math/hash.ts`: `pcg` (Math.imul + `>>> 0` on the state add and final xor), `hash01`, `mulberry32`.
- `src/math/transform.ts`: `Quat`, `PartTransform`, `IDENTITY`, `compose`, `applyToPoint`, `lerpTransform` (lerp position, slerp rotation, shortest path via negating b when dot < 0, nlerp fallback when dot > 0.9995, results normalized), `fromAxisAngle`, `transformDistance`. Imports `Vec3` from `./vec`; no three.js.
- Tests: `hash.test.ts`, `transform.test.ts`.

## TDD evidence
- RED: `npx vitest run src/math` before implementation: both test files failed to load (modules `./hash`, `./transform` missing), "Test Files 2 failed (2), no tests".
- Mid-way failures, expected/informative:
  - pcg golden placeholders (0) failed; replaced with values computed by an independent BigInt implementation (not the Math.imul code): pcg(0)=129708002, pcg(1)=2831084092, pcg(12345)=4099845390. The Math.imul implementation agrees with them.
  - Slerp shortest-path test failed at 3e-8 because `acos(dot)` is ill-conditioned near 1. Rewrote `transformDistance` angle as `2*atan2(|rel.xyz|, |rel.w|)` with rel = conj(a)*b (also handles q/-q).
  - `transformDistance(t,t)` gave 5.5e-17, not exactly 0; test relaxed to `< 1e-12` (floating-point noise; exact-zero assertion was wrong).
- GREEN: `npm run typecheck && npm test` -> typecheck clean; "Test Files 8 passed (8), Tests 84 passed (84)".

## Files changed
Created only: src/math/hash.ts, hash.test.ts, transform.ts, transform.test.ts. No e2e run (nothing browser-facing).

## Self-review
- pcg wrap behaviour matches brief formula; GLSL mirror can use the three golden values as fixtures.
- Note: transform.ts triggers a prettier warning from a hook, but prettier is not a project dependency and no config exists; left as is.
- `hash01` uses `0x9e3779b9` (lowercase hex, same value as brief).
