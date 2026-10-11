
---

## Fix round 1 (commit below)

1. **Vertex spike and default camera.**
   - `src/spikes/vertex.ts` now pins `camera: { pos: [-0.068, 0.04, 3.144], target: [-0.068, 0.04, 0.023], coreFocus: 0 }`. This is the exact whole-anchor conversion of its old world framing (pos (0, 0, 8) looking at the origin, fov 40), the same method used for fill.ts.
   - `defaultSceneState().camera` is now `pos [0, 0, 3.1], target [0, 0, 0], coreFocus 0`, a head-on overview at about three machine radii (the looks.spec shot). `sceneState.test` was the only test that assumed `[0, 0, 8]`; it is updated. The keyframeSampler tests set their own values.
2. **Anchor memo.**
   - `mechanismAnchors` is memoised in a `WeakMap<Mechanism, MechanismAnchors>` and returns a deep-frozen result (the object, each role and each centre).
   - Tests now cover memo identity, a fresh copy recomputing equal values, and frozenness. A new case gives two distinct mechanisms the same id, one with every part shifted +10 in x. It gets its own anchors (centre +10, same radius), and the original's memo is untouched.
   - RED against the HEAD anchors.ts (`npx vitest run src/mechanisms/anchors.test.ts`): 2 failed. The failures were `expected { …(3) } not to be { …(3) }` and `expected 0.1740788821794848 to be close to 10.174078882179485`.
   - GREEN: 5/5 passed.
3. **Centre-line e2e.** Each section edge is now its own `test.step`, with `expect.soft`, so one bad edge still reports the rest.

**Verification.** `npm run typecheck` is clean. `npm test`: 17 files, 162 tests passed. `npm run e2e`: 34 passed, 1 skipped (`shots`), 3.6 min.
