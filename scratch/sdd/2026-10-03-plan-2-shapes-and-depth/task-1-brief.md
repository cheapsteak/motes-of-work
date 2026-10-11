### Task 1: Decouple the story and tests from the gears

**Files:** Modify `src/mechanisms/index.ts`, `src/config.ts`, `src/mechanisms/types.ts`, `src/scene/cameraRig.ts` (+ test), `src/timeline/sceneState.ts` (+ test), `src/timeline/keyframes.json`, `src/timeline/keyframes.test.ts`, `src/main.ts`, `e2e/looks.spec.ts`, `e2e/app.spec.ts`, `src/spikes/renderSpike.ts`, `src/parity/parity.ts`. Create `src/mechanisms/anchors.ts` (+ test).

**Interfaces:**
- `export const mechanisms = { gears } as const satisfies Record<string, Mechanism>;` `export type MechanismId = keyof typeof mechanisms;` `ACTIVE_MECHANISM: MechanismId`.
- `export interface RoleAnchor { center: Vec3; radius: number }`
- `export function mechanismAnchors(mech: Mechanism): { whole: RoleAnchor; core: RoleAnchor; body: RoleAnchor }` — centroid and bounding radius of sampled points at `pose(0, ZERO_FAULTS, 0)`, assembly 1 (deterministic, budget 4000, seed 1; memoised per mechanism id).
- SceneState gains `camera.coreFocus: number` (0 = frame the whole machine, 1 = frame the core). `camera.pos` and `camera.target` become **machine-relative**: world = `anchorCenter + value × anchorRadius`, where anchor = lerp(whole, core) by `coreFocus`. `applyCamera(camera, s, anchors)`.
- `?mech=<id>` selects the mechanism when `?test=1` (ignored otherwise).
- [ ] Failing tests: anchors deterministic and inside the machine's bounding box; `applyCamera` with `coreFocus` 0 vs 1 targets the respective centroids; keyframes framing test iterates **every** registered mechanism (whole drive core in frame and right of the panel at spec locals); `looks.spec.ts` derives its probe regions from projected anchors, not hard-coded pixels; spikes and parity use `ACTIVE_MECHANISM` (parity loops over all mechanisms); `app.spec.ts` reads section spans from the DOM (`readSpans`) instead of hard-coding them.
- [ ] Convert `keyframes.json` camera keys to machine-relative values that reproduce the current gears framing (within a few pixels).
- [ ] Run typecheck, unit, e2e. Commit `refactor: mechanism-relative camera and gear-independent tests`.

