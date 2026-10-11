## Global Constraints

- Everything in Plan 1's Global Constraints still binds (purity invariant, progress from `scrollY`, flat numeric `SceneState`, integer seeds `< 2^24`, `uint(round(x))` for float→uint, `mote.glsl` only in vertex shaders with `precision highp float; precision highp int;`, colours, DPR cap, commit trailer `Claude-Session: https://claude.ai/code/session_01NeUYkcE3BstKfMUyx32g8w`, `git add` named files only).
- **Licensing rule:** code from MIT/BSD/Apache/public-domain sources may be ported, with the notice recorded in `CREDITS.md`. Code under any NC, SA, LGPL/GPL or unstated licence (including Shadertoy and OpenProcessing defaults) may be studied for technique only — never pasted or translated line by line. Inspirations are credited in `CREDITS.md` under "Inspired by".
- Every mechanism satisfies the contract test (`src/mechanisms/contract.test.ts`) and the GLSL/TS parity test.
- Mechanism ids: `gears`, `watch`, `strandbeest`, `steam`.
- Lighting constants live in one TS module and are passed to shaders as uniforms; no duplicated literals.

## Review Focus

1. **Mechanism swap** — changing `ACTIVE_MECHANISM` (or `?mech=` in test mode) to any of the four ids renders a framed machine in every story section with no other edit. Test in Task 1 and Task 8.
2. **Normal blending through zero** — when a point's correct and twin normals point in opposite directions, the blended normal must fall back identically in TS and GLSL (no NaN). Test in Task 3.
3. **Degenerate linkage** — a Jansen leg whose circle intersection has no solution (a ratio fault pushing lengths out of range) must not produce NaN positions; it clamps to the nearest reachable configuration. Test in Task 6.
4. **Deterministic surface sampling** — `MeshSurfaceSampler` must use our seeded PRNG, so `samplePoints(budget, seed)` stays deterministic. Contract test covers it for every mechanism.
5. **Comparison page with any slider combination** — no NaN, no shader errors, and the page never throws when sliders hit extremes. Test in Task 8.

---
