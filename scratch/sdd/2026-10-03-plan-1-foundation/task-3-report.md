# Task 3 report: SceneState and KeyframeSampler

## Implemented
- `src/math/vec.ts`: `Vec3`, `isVec3`, `lerp`, `lerpVec3`.
- `src/timeline/sceneState.ts`: `Faults`, `SceneState` (verbatim spec 6.2, incl. `clock`), `FAULT_KEYS`, `ZERO_FAULTS` (frozen), `defaultSceneState()`, `SCENE_STATE_PATHS` (explicit list of all 36 leaves; vec3 leaves are one path), `setPath` (throws on unknown path or wrong shape), `mergeState` (non-mutating deep merge driven by base keys, so unknown keys and `__proto__` are ignored; malformed or non-finite leaves are ignored).
- `src/timeline/easing.ts`, `sampler.ts`, `keyframeSampler.ts` per brief. No DOM or three.js imports. All validation is in the constructor (`KeyframeError`, message names the track and key index); `sample` never throws, clamps progress (NaN -> 0), returns a fresh state, and vec3 values are copied on input and output (no aliasing).
- Extra validation beyond the brief (judgment calls): global numeric `at` must be in [0,1]; empty track, non-object keyframe and malformed file are rejected; `Object.hasOwn` guards paths and ease names (so `toString` is not accepted).
- `step` ease holds the previous value until the next key is reached.

## Tests
- `src/timeline/sceneState.test.ts`, `src/timeline/keyframeSampler.test.ts` (32 tests). Sync fence: walks `defaultSceneState()` and asserts set equality of leaf paths, plus equal kinds, against `SCENE_STATE_PATHS`.

## TDD evidence
- RED: wrote tests first. Because I had already drafted the implementation, I moved the implementation files aside and ran `npx vitest run src/timeline` -> `Test Files 2 failed (2)`, `no tests` (import resolution failure, expected: modules absent).
- GREEN: restored the files; `npx vitest run src/timeline` -> `Test Files 2 passed (2)`, `Tests 32 passed (32)`.
- Full: `npm run typecheck && npm test` -> typecheck clean; `Test Files 6 passed (6)`, `Tests 69 passed (69)`.

## Files changed
Created only: 5 source files (`src/math/vec.ts`, `src/timeline/{sceneState,easing,sampler,keyframeSampler}.ts`) and 2 test files. `npm run e2e` not run (nothing browser-facing).

## Self-review
No concerns. Note: `SCENE_STATE_PATHS` is a hand-written literal (fenced by the sync test) rather than derived from the defaults, matching the brief's declared const type.
