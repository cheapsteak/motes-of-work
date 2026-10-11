# Plan 2 — Shape exploration and the 3D look

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Three candidate mechanisms (watch movement, Strandbeest, steam engine with flyball governor), plus the existing gears, rendered with real 3D depth and viewable side by side on a comparison page the author can open in a browser.

**Architecture:** Builds on Plan 1 (scroll → progress → `SceneState` → stateless `mote()` on the GPU). This plan (a) decouples the story and tests from the gears so a mechanism swap is one config line, (b) defines the per-mote attribute layout once, (c) adds per-point surface normals and lighting so shapes read as solid, (d) adds a shared procedural shape library sampled with three.js `MeshSurfaceSampler`, and (e) adds three mechanism modules and a comparison page.

**Tech Stack:** as Plan 1 (TypeScript strict, Vite 8, three `^0.186`, Vitest 5, `@playwright/test` 1.56.1).

**Spec:** `docs/specs/2026-10-02-motes-of-work-design.md` (§5–§6 visual language and architecture). Plan 1: `docs/plans/2026-10-03-plan-1-foundation.md`. Plan 1 ledger rulings are in force.

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

### Task 2: One attribute layout, parity through the production path

**Files:** Create `src/scene/mote/layout.ts` (+ test); modify `src/scene/mote/moteSystem.ts`, `src/scene/mote/shaders/instance.glsl`, `src/parity/parity.ts`, `e2e/parity.spec.ts`; create `src/math/salts.ts` and `src/scene/mote/salts.glsl` (generated or fenced).

**Interfaces:**
- `layout.ts` declares the per-instance attribute list once (`name`, `itemSize`, `pack(attrs) → number[]`), and generates the GLSL attribute declarations and the `instanceAttrs()` unpacking snippet from it.
- A single salt registry: `export const SALT = { settle: 1, type: 2, extra: 3, misVisible: 4, driftX: 5, ... , hero: 15 } as const;` mirrored in GLSL; a test asserts the GLSL constants equal the TS values as a set.
- Parity renders instances through the real vertex path (`instanceAttrs()` → `mote()`), writing outputs via transform-feedback-free readback (a points draw into a float target, one texel per instance), and compares every `MoteOut` field. A test asserts `set(Object.keys(MoteOut sample)) == set(parity compared fields)`.
- [ ] Failing tests first; implement; parity green for all mechanisms; commit `refactor: single mote attribute layout and production-path parity`.

### Task 3: Normals, lighting and depth cues

**Files:** Modify `src/mechanisms/types.ts`, `src/mechanisms/gears/*`, `src/mechanisms/contract.test.ts`, `src/scene/mote/{attributes,mote,layout}.ts`, `mote.glsl`, shaders, `src/math/transform.ts` (export `rotate`); create `src/scene/lighting.ts`.

**Interfaces:**
- `BoundPoint` gains `normal: Vec3; normalTwin: Vec3` (unit length). `MoteAttrs` likewise. `MoteOut` gains `normal: Vec3` = normalize(rotate(partQuat, mix(normal, normalTwin, variant))); if the mixed vector's length `< 1e-4`, use `rotate(partQuat, normal)` (fallback identical in TS and GLSL).
- `lighting.ts`: `export const LIGHTING = { keyDir: Vec3, keyStrength, fillStrength, rimStrength, depthNear, depthFar, depthDim, backfaceDim }` → uniforms.
- Fragment/vertex shading: settled brightness × (fill + key·max(0, n·L) + rim·(1 − |n·V|)^2); points facing away from the camera dimmed by `backfaceDim`; depth fade between `depthNear`/`depthFar` (view-space) multiplies brightness and slightly shrinks size. In-flight motes are unlit (they glow).
- [ ] Failing tests: contract test asserts unit normals for every point; parity covers `normal` (≤ 1e-3) including the opposite-normals fallback case; a looks test asserts that a lit gear face is brighter than the same face rotated away.
- [ ] Gears get real thickness via Task 4's library (do Task 4 first if needed — controller orders 4 before 3).
- [ ] Commit `feat: surface normals, lighting and depth cues`.

### Task 4: Procedural shape library and 3D gears

**Files:** Create `src/shapes/` — `involute.ts` (involute and cycloidal tooth profiles, ported math with notices), `extrude.ts` (profile → `BufferGeometry` with thickness), `primitives.ts` (axle, bar with rounded ends, ball, plate with depth, spring/helix), `sample.ts` (deterministic `MeshSurfaceSampler` wrapper returning points + normals), tests; `CREDITS.md`. Modify `src/mechanisms/gears/*` to use the library (gears with real thickness 0.25, axles, a 0.15-thick frame plate).

**Interfaces:**
- `export function involuteGear(opts: { teeth: number; module: number; pressureAngleDeg?: number }): Vec2[]` (closed outline).
- `export function extrudeProfile(outline: Vec2[], holes: Vec2[][], depth: number): BufferGeometry`
- `export function samplePart(geom: BufferGeometry, count: number, rng: () => number): { positions: Vec3[]; normals: Vec3[] }`
- [ ] Failing tests: involute profile has 2× teeth extrema and the expected pitch radius (`module × teeth / 2`); extruded geometry is closed (no boundary edges); sampling is deterministic for a seed and returns unit normals; samples lie on the surface (distance to mesh < 1e-4).
- [ ] Commit `feat: procedural shape library and 3D gears`.

### Tasks 5–7: Mechanism modules (independent; may run in parallel worktrees)

Each creates `src/mechanisms/<id>/` (index + shapes + kinematics + tests), registers the id, and must pass the contract test, parity, and a looks screenshot at three-quarter view in `shots/mech-<id>-*.png` (specced assembled, wrong twin, exploded, faults at 0.6). Roles must make the **core small and critical** and the **body large and repetitive**. Faults map to visible failures of *that* mechanism.

**Task 5 — `watch`:** Swiss lever escapement (escape wheel, pallet fork, balance wheel with a hairspring helix) as **core**; going train (centre, third, fourth wheels with pinions; cycloidal teeth), mainspring barrel, bridges and plate as **body**; a few jewels as **drift** candidates. Kinematics: balance oscillates (simple harmonic, amplitude ~250° visual); escape wheel advances in discrete ticks synced to the balance; train ratios derived from the escape-wheel step. Wrong twin: the same parts rearranged as a **music box** — barrel becomes the pinned cylinder (spinning steadily), the escape wheel and pallet become a comb-and-governor fan, balance becomes the air-brake fan. Faults: `ratio` → hands/train too fast vs ghost; `slip` → escape wheel skips teeth; `stall` → balance stops then restarts; `bind` → balance amplitude collapses; `misalign` → pallet fork misses teeth; `jitter` → tremor.

**Task 6 — `strandbeest`:** Jansen linkage with the published link lengths (a=38, b=41.5, c=39.3, d=40.1, e=55.8, f=39.4, g=36.7, h=65.7, i=49, j=50, k=61.9, l=7.8, m=15.0; cite Wikipedia "Jansen's linkage", numbers only) solved by circle–circle intersection from the crank angle. Crank + one leg's linkage geometry is **core**; 6–8 phase-offset legs on a shared crankshaft and the spine are **body**; feet are **drift**. Wrong twin: same bars with perturbed lengths so the foot path loses its flat bottom (legs flail and lift the body). Faults: `ratio` → wrong link proportions (foot path deforms vs ghost path); `slip` → crank phase slips between leg pairs; `stall`/`bind` → gait halts / drags; `misalign` → legs splay out of plane. Degenerate intersections clamp (Review Focus 3). Optional: draw the ghost foot path.

**Task 7 — `steam`:** Horizontal mill engine: cylinder, piston + rod, crosshead, connecting rod, crank, flywheel (large, spoked), frame; **core** = the flyball governor (spindle, two balls on arms, sleeve, throttle linkage) driven by belt from the flywheel shaft; **body** = flywheel, cylinder, frame, rods. Kinematics: slider-crank exact; governor arm angle from equilibrium cosθ = g/(ω² L) clamped, with ω from `drive` rate (use a fixed nominal speed modulated by faults). Wrong twin: governor disconnected/reversed — balls hang limp while the flywheel overspeeds (spins visibly faster against the ghost). Faults: `ratio` → overspeed; `bind` → piston sticks mid-stroke; `slip` → belt slips (governor lags flywheel); `stall` → stops at dead centre; `misalign` → wobbling flywheel; `jitter` → vibration.

For every mechanism module:
- [ ] Contract test passes; parity passes (Task 2 runs parity over all mechanisms).
- [ ] Kinematics unit tests pin the defining relationship (escape wheel steps per balance period; Jansen foot path flatness over the ground stroke vs twin; slider-crank piston position formula and governor angle monotonic in speed).
- [ ] Screenshots reviewed by the implementer (described in report).
- [ ] Commit `feat: <id> mechanism`.

### Task 8: Comparison page

**Files:** Create `src/compare/compare.html`, `src/compare/compare.ts`, `src/compare/controls.ts`, `e2e/compare.spec.ts`; modify `vite.config.ts`.

- Layout: a canvas with OrbitControls (drag to orbit, scroll to zoom — this page is not scroll-driven, and it is exempt from the purity invariant except that the machine itself is still a pure function of the slider state); a side panel with: mechanism picker (four ids), sliders for `assembly`, `variant`, `drive` (+ play toggle), provenance (`vibed`, `misallocated`), every fault, `ghost`; presets ("Specced", "Vibed (wrong twin)", "Quiet failure", "Exploded", "Faults 0.6"); a "side by side" toggle that shows all four mechanisms in a 2×2 grid at the same state. Budget selector (30k / 100k).
- The page reads mechanism names and one-line descriptions from the modules (each mechanism exports `label` and `blurb`).
- [ ] Failing e2e: page loads for each mechanism with no errors; each preset renders a non-blank canvas; extreme slider values (all 0, all 1) produce no `pageerror` and no NaN (probe via a test hook); 2×2 view renders four non-blank quadrants.
- [ ] Commit `feat: mechanism comparison page`.

### Task 9: Visual review by a Fable subagent, then polish

- [ ] After Tasks 3–8 are in, dispatch a review subagent on the **fable** model with: the spec §5 visual language, the per-mechanism shots, the section shots (`npm run shots`), and the built comparison page (it may drive it with Playwright and take its own screenshots). Ask for art-direction guidance: does each mechanism read as solid 3D (depth, lighting, perspective), is the core/body distinction and the wrong twin legible, composition and framing per section, colour and brightness (white-out), mote sizes and hero density, and which mechanism tells the essay's story best. Output: ranked, concrete changes (parameter values where possible).
- [ ] Implement the agreed polish changes in one dispatch (lighting constants, sizes, camera keys, brightness), re-run tests and shots.

### Task 10: Publish for the author (controller task)

- [ ] Build with `BASE_PATH=./` and publish `dist/` (compare page as the entry, plus the story page) as a private claude.ai Artifact with supporting files; send the author the link.
- [ ] Also push the branch.

## Final verification

- [ ] `npm run typecheck && npm test && npm run e2e` all pass.
- [ ] `npm run shots` and the per-mechanism shots reviewed.
