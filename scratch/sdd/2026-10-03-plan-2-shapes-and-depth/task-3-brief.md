### Task 3: Normals, lighting and depth cues

**Files:** Modify `src/mechanisms/types.ts`, `src/mechanisms/gears/*`, `src/mechanisms/contract.test.ts`, `src/scene/mote/{attributes,mote,layout}.ts`, `mote.glsl`, shaders, `src/math/transform.ts` (export `rotate`); create `src/scene/lighting.ts`.

**Interfaces:**
- `BoundPoint` gains `normal: Vec3; normalTwin: Vec3` (unit length). `MoteAttrs` likewise. `MoteOut` gains `normal: Vec3` = normalize(rotate(partQuat, mix(normal, normalTwin, variant))); if the mixed vector's length `< 1e-4`, use `rotate(partQuat, normal)` (fallback identical in TS and GLSL).
- `lighting.ts`: `export const LIGHTING = { keyDir: Vec3, keyStrength, fillStrength, rimStrength, depthNear, depthFar, depthDim, backfaceDim }` → uniforms.
- Fragment/vertex shading: settled brightness × (fill + key·max(0, n·L) + rim·(1 − |n·V|)^2); points facing away from the camera dimmed by `backfaceDim`; depth fade between `depthNear`/`depthFar` (view-space) multiplies brightness and slightly shrinks size. In-flight motes are unlit (they glow).
- [ ] Failing tests: contract test asserts unit normals for every point; parity covers `normal` (≤ 1e-3) including the opposite-normals fallback case; a looks test asserts that a lit gear face is brighter than the same face rotated away.
- [ ] Gears get real thickness via Task 4's library (do Task 4 first if needed — controller orders 4 before 3).
- [ ] Commit `feat: surface normals, lighting and depth cues`.

