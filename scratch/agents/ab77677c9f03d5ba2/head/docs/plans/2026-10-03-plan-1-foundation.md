# Plan 1 — Foundation and first slice

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A working scroll-driven page where the placeholder gear mechanism is built by motes through the first three story sections (vibe build → rewind → spec with ghost), with the rewind invariant proven by tests and hardware spike pages ready for real devices.

**Architecture:** Scroll position is the single source of truth: `scrollY → progress → KeyframeSampler.sample(progress) → SceneState`. Everything rendered is a pure function of `SceneState`. Motes are stateless instanced camera-facing quads whose positions come from one `mote()` function written in GLSL and mirrored in TypeScript; rigid part transforms are uploaded each frame to an RGBA32F data texture.

**Tech Stack:** TypeScript (strict), Vite, three.js `^0.186`, Vitest, `@playwright/test` **1.56.1** (pinned — matches the preinstalled Chromium in `/opt/pw-browsers`), `marked` for panel markdown.

**Spec:** `docs/specs/2026-10-02-motes-of-work-design.md`. Read §6 (architecture), §6.4 (mote system), §9 (testing) before any task.

**Out of this plan (later plans):** Prologue (P1–P2), Act I sections I.4–I.8, Act II and tier fields, overlays (mote-mix strip, effort counter), coda, reduced-motion and no-WebGL fallbacks, mobile portrait layout, depth of field, Theatre.js (spike 6), thread-aliasing check at DPR 2–3 (spike 7), final copy. `SceneState` fields for these exist from Task 3 but nothing reads them yet.

## Global Constraints

- Node 22. TypeScript `strict: true`. ES modules.
- `@playwright/test` pinned to exactly `1.56.1`. Never run `playwright install` locally; `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers` is preset. CI installs its own Chromium.
- Chromium launch args for every Playwright run: `--use-angle=swiftshader`, `--enable-unsafe-swiftshader`, `--ignore-gpu-blocklist`.
- **Purity invariant (spec §6.1):** every frame is a pure function of scroll progress. No state accumulates across frames. Machine motion is driven by `SceneState.mech.drive`, never wall-clock time. The only exception is idle shimmer, added after `mote()`, disabled when `?test=1`.
- **Progress always derives from `scrollY`.** `?p=` sets the scroll position; it never sets progress directly.
- `SceneState` is flat, numeric and blendable (spec §6.2). No discrete fields.
- Seeds are integers in `[0, 2^24)` so they survive float attributes exactly.
- UI text in sentence case. Content must be publication-safe: no company names, internal issue numbers or internal paths (spec §7).
- Mote colors: human `#FFB347`, agent `#4DA3FF`, dialogue `#E6DDFF`. Background `#0B0D12`.
- Device pixel ratio capped at `Math.min(window.devicePixelRatio, 2)`.
- Every commit message ends with the line `Claude-Session: https://claude.ai/code/session_01NeUYkcE3BstKfMUyx32g8w`.
- Work on branch `plan-1-foundation`. `git add` named files only.

## Review Focus

1. **Out-of-range progress** (iOS overscroll, negative `scrollY`, `NaN`) — clamped to `[0,1]`, never propagates `NaN` into the shader. Tests in Task 2 and Task 3.
2. **Malformed keyframes** (unknown path, unknown section id, non-increasing `at`, wrong value shape, non-finite value, unknown ease) — throws at load with the track named; never renders garbage. Tests in Task 3.
3. **Window resize mid-story** — the reader stays at the same progress (within 0.002) and sees the same section. Test in Task 9.
4. **WebGL context loss** — no uncaught errors; story text stays readable; `body.no-webgl` is set. Test in Task 9.
5. **Hidden tab** — the render loop stops while `document.hidden` and resumes after. Test in Task 9.

---

## File structure

```
index.html                       app shell
vite.config.ts                   multi-page (app, parity, spikes), base from BASE_PATH
playwright.config.ts
src/
  main.ts                        app wiring (Task 9)
  config.ts                      ACTIVE_MECHANISM, budgets
  math/vec.ts                    Vec3 + helpers
  math/transform.ts              PartTransform, Quat, compose/apply/lerp
  math/hash.ts                   pcg, hash01, mulberry32
  story/NN-<id>.md               sections
  story/loader.ts                parseSection, loadStory
  scroll/progress.ts             pure scroll/progress math
  scroll/driver.ts               DOM scroll → progress
  timeline/sceneState.ts         SceneState, defaults, paths
  timeline/easing.ts
  timeline/sampler.ts            Sampler interface
  timeline/keyframeSampler.ts
  timeline/keyframes.json
  mechanisms/types.ts            contract (spec §6.3)
  mechanisms/index.ts            registry
  mechanisms/gears/index.ts      placeholder mechanism
  scene/cameraRig.ts
  scene/mote/attributes.ts       MoteAttrs, buildMoteAttrs
  scene/mote/partTransforms.ts   pose ∘ explode, packing for the data texture
  scene/mote/mote.ts             TS reference mote()
  scene/mote/mote.glsl           GLSL mote() library
  scene/mote/moteSystem.ts       instanced quads, threads, ghost
  scene/mote/shaders/*.glsl
  parity/parity.html, parity.ts  GLSL ↔ TS parity page
  spikes/*.html, spikes/*.ts     hardware spike pages + HUD
e2e/*.spec.ts
tests (Vitest) colocated as *.test.ts
```

---

### Task 1: Project scaffold and CI

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `index.html`, `src/main.ts`, `src/style.css`, `.gitignore`, `.github/workflows/ci.yml`, `src/smoke.test.ts`, `e2e/smoke.spec.ts`

**Interfaces:**
- Produces: npm scripts `dev`, `build`, `preview`, `typecheck` (`tsc --noEmit`), `test` (`vitest run`), `e2e` (`playwright test`).

- [ ] **Step 1:** Create `package.json` with dependencies `three@^0.186.1`, `marked`; devDependencies `typescript`, `vite`, `vitest`, `@types/three`, `@playwright/test@1.56.1` (exact). Run `npm install`. Expected: lockfile written, no errors.
- [ ] **Step 2:** `tsconfig.json` (strict, `moduleResolution: "bundler"`, `types: ["vite/client"]`). `vite.config.ts` with `base: process.env.BASE_PATH ?? '/'` and `?raw` imports allowed for `.glsl`/`.md`. `.gitignore`: `node_modules`, `dist`, `test-results`, `playwright-report`, `shots`, `content-denylist.local.txt`.
- [ ] **Step 3:** `index.html` + `src/main.ts`: full-viewport fixed `<canvas id="stage">` behind a `<main id="story">` containing one placeholder section. Background `#0B0D12`. three.js renders a cleared frame.
- [ ] **Step 4:** Write `src/smoke.test.ts` (`expect(1 + 1).toBe(2)` importing nothing but `three` to prove resolution) and `e2e/smoke.spec.ts`: load `/`, assert `#stage` exists and no `pageerror` events.
- [ ] **Step 5:** `playwright.config.ts`: project `chromium` with the Global Constraints launch args; `webServer: { command: 'npm run build && npm run preview -- --port 4173 --strictPort', port: 4173, reuseExistingServer: true }`; `use.baseURL = 'http://localhost:4173'`.
- [ ] **Step 6:** Run `npm run typecheck && npm test && npm run e2e`. Expected: all pass.
- [ ] **Step 7:** `.github/workflows/ci.yml`: on push/PR — `npm ci`, `npm run typecheck`, `npm test`; job `e2e`: `npx playwright install --with-deps chromium` then `npm run e2e`.
- [ ] **Step 8:** Commit `chore: scaffold vite + three + vitest + playwright`.

---

### Task 2: Scroll math and story loader (with content lint)

**Files:**
- Create: `src/scroll/progress.ts`, `src/scroll/progress.test.ts`, `src/story/loader.ts`, `src/story/loader.test.ts`, `src/story/content.test.ts`, `src/story/01-vibe-build.md` (placeholder; real text in Task 9)

**Interfaces:**
- Produces:
  ```ts
  // scroll/progress.ts
  export interface SectionSpan { id: string; start: number; end: number } // progress units, contiguous, [0,1]
  export function sectionSpans(sections: { id: string; length: number }[]): SectionSpan[]
  export function progressFromScroll(scrollY: number, scrollHeight: number, viewportH: number): number
  export function scrollYForProgress(p: number, scrollHeight: number, viewportH: number): number // integer px
  export function locate(p: number, spans: SectionSpan[]): { index: number; id: string; local: number }
  // story/loader.ts
  export interface StorySection { id: string; length: number; alt: string; draft: boolean; html: string; words: number; file: string }
  export function parseSection(raw: string, file: string): StorySection
  export function loadStory(): StorySection[] // import.meta.glob('./*.md', { query: '?raw', eager: true }), sorted by filename
  ```
- Section file format: frontmatter between `---` lines with `id`, `length` (viewport heights, > 0), `alt` (canvas description), optional `draft: true`; body is markdown rendered with `marked`.

- [ ] **Step 1: Failing tests** in `progress.test.ts`:
  - `sectionSpans([{id:'a',length:1},{id:'b',length:3}])` → `[{id:'a',start:0,end:0.25},{id:'b',start:0.25,end:1}]`.
  - `progressFromScroll(-40, 3000, 1000)` → `0`; `(2500, 3000, 1000)` → `1`; `(1000, 3000, 1000)` → `0.5`; `(NaN, 3000, 1000)` → `0`; `scrollHeight <= viewportH` → `0`.
  - `scrollYForProgress(0.5, 3000, 1000)` → `1000`; result is always an integer; round-trip `progressFromScroll(scrollYForProgress(p))` within `1/(scrollHeight-viewportH)` of `p`.
  - `locate(0.25, spans)` → `{index:1, id:'b', local:0}`; `locate(1, spans)` → `{index:1, local:1}`; `locate(-1)` clamps to index 0, local 0.
- [ ] **Step 2:** Run `npx vitest run src/scroll` — expect FAIL (module missing).
- [ ] **Step 3:** Implement `progress.ts`. Clamp and `NaN → 0` everywhere.
- [ ] **Step 4:** Failing tests in `loader.test.ts`: parses frontmatter fields and types; `words` counts body words (markdown stripped); throws naming the file when `id` missing, `length` ≤ 0 or non-numeric, or frontmatter absent.
- [ ] **Step 5:** Implement `loader.ts` (hand-written frontmatter parser — `key: value` lines only; no YAML dependency).
- [ ] **Step 6:** `content.test.ts` (the content lint, spec §7) over `loadStory()`: each section `words ≤ 80`; ids unique; no body or `alt` matches the committed generic patterns `/#\d{3,}/` (issue numbers) and `/\b[\w-]+\/[\w-]+\.(ts|py|md|sh|json)\b/` (file paths); plus every non-empty line of `content-denylist.local.txt` if that gitignored file exists (case-insensitive substring). Never commit organisation names into the repo — they live only in the local file.
- [ ] **Step 7:** Run `npm test`. Expected: PASS. Commit `feat: scroll progress math and story loader with content lint`.

---

### Task 3: SceneState and KeyframeSampler

**Files:**
- Create: `src/math/vec.ts`, `src/timeline/sceneState.ts`, `src/timeline/easing.ts`, `src/timeline/sampler.ts`, `src/timeline/keyframeSampler.ts`, tests `src/timeline/*.test.ts`

**Interfaces:**
- Consumes: `SectionSpan` (Task 2).
- Produces:
  ```ts
  // math/vec.ts
  export type Vec3 = [number, number, number];
  // timeline/sceneState.ts — SceneState and Faults exactly as spec §6.2 (including `clock`)
  export const FAULT_KEYS: readonly (keyof Faults)[]; // misalign, slip, bind, jitter, ratio, stall, drift
  export const ZERO_FAULTS: Faults;
  export function defaultSceneState(): SceneState;
  export const SCENE_STATE_PATHS: Record<string, 'number' | 'vec3'>; // e.g. 'mech.assembly':'number', 'camera.pos':'vec3', 'mech.faults.drift':'number'
  export function setPath(s: SceneState, path: string, value: number | Vec3): void;
  export function mergeState(base: SceneState, partial: unknown): SceneState; // deep merge for ?state= debugging; ignores unknown keys
  // timeline/sampler.ts
  export interface Sampler { sample(progress: number): SceneState }
  // timeline/keyframeSampler.ts
  export interface Keyframe { at: number | string; value: number | Vec3; ease?: EaseName }
  export interface KeyframeFile { tracks: Record<string, Keyframe[]> }
  export class KeyframeError extends Error {}
  export class KeyframeSampler implements Sampler { constructor(file: KeyframeFile, spans: SectionSpan[]) }
  // timeline/easing.ts
  export type EaseName = 'linear' | 'step' | 'inQuad' | 'outQuad' | 'inOutQuad' | 'inOutCubic' | 'outCubic';
  export const EASINGS: Record<EaseName, (t: number) => number>;
  ```
- Defaults: `camera.pos [0,0,8]`, `camera.target [0,0,0]`, `camera.fov 40`, `camera.focus 0`; `mech.assembly 1`, `variant 0`, `drive 0`, faults 0, `ghost 0`; provenance 0/0; `motes.agent 1`, other motes 0; `workshop.copies 1`, `spread 0`; all tiers 0; overlays 0; `clock 0`.
- `at` is a global progress number, or `"<sectionId>@<local>"` resolved via spans (`start + local*(end-start)`). `ease` on key *k* shapes the segment from key *k−1* to *k* (default `linear`). Before the first key → first value; after the last → last value. Tracks absent from the file take the default.

- [ ] **Step 1: Failing tests:**
  - Sampling at a key's `at` returns its value exactly; midway between `0→1` linear keys returns `0.5`; with `ease:'inOutCubic'` returns `0.5` at midpoint and `< 0.5` at 0.25.
  - `camera.pos` interpolates componentwise.
  - `"spec@0.5"` resolves through spans.
  - `sample(-1)`, `sample(2)`, `sample(NaN)` equal `sample(0)`, `sample(1)`, `sample(0)`.
  - **Purity:** `sample(0.4)` deep-equals itself after sampling 0.9, 0.1 in between; mutating a returned state does not affect later samples.
  - `KeyframeError` (message contains the track path) for: unknown path, unknown section id, `at` not strictly increasing, vec3 track given a number (and vice versa), non-finite value, unknown ease, local outside `[0,1]`.
  - `mergeState(default, {mech:{assembly:0.3}, bogus:1})` sets assembly and ignores `bogus`.
- [ ] **Step 2:** Run `npx vitest run src/timeline` — expect FAIL.
- [ ] **Step 3:** Implement. Validate everything in the constructor; `sample` never throws.
- [ ] **Step 4:** Run tests — PASS. Commit `feat: SceneState and KeyframeSampler`.

---

### Task 4: Transform and hash math

**Files:**
- Create: `src/math/transform.ts`, `src/math/hash.ts`, tests.

**Interfaces:**
- Produces:
  ```ts
  export type Quat = [number, number, number, number]; // x,y,z,w
  export interface PartTransform { position: Vec3; quaternion: Quat }
  export const IDENTITY: PartTransform;
  export function compose(a: PartTransform, b: PartTransform): PartTransform; // apply b, then a
  export function applyToPoint(t: PartTransform, p: Vec3): Vec3;
  export function lerpTransform(a: PartTransform, b: PartTransform, t: number): PartTransform; // lerp position, slerp rotation
  export function fromAxisAngle(axis: Vec3, angle: number): Quat;
  export function transformDistance(a: PartTransform, b: PartTransform): number; // |Δposition| + angle between rotations (rad)
  // hash.ts — integer ops only, so GLSL can match bit-for-bit
  export function pcg(v: number): number;            // uint32 in, uint32 out
  export function hash01(seed: number, salt: number): number; // [0,1)
  export function mulberry32(seed: number): () => number;
  ```
- `pcg` is exactly: `state = v*747796405 + 2891336453; word = ((state >>> ((state >>> 28) + 4)) ^ state) * 277803737; return ((word >>> 22) ^ word) >>> 0` (uint32 arithmetic via `Math.imul`, `>>> 0`). `hash01(seed, salt) = pcg((seed ^ Math.imul(salt, 0x9E3779B9)) >>> 0) / 4294967296`.

- [ ] **Step 1: Failing tests:** `compose(IDENTITY, t)` equals `t`; `applyToPoint(compose(a,b), p)` equals `applyToPoint(a, applyToPoint(b, p))` within 1e-9 for random a, b, p; `fromAxisAngle([0,0,1], π/2)` rotates `[1,0,0]` to `[0,1,0]`; `lerpTransform(a,b,0)=a`, `(…,1)=b`; `transformDistance(t,t)=0`. `pcg` is deterministic and output `< 2^32` integer; record `pcg(0)`, `pcg(1)`, `pcg(12345)` as golden values in the test (computed once by the implementation, then frozen); `hash01` mean over 10k seeds in `[0.48, 0.52]`; `mulberry32(7)` sequence repeats for the same seed.
- [ ] **Step 2–4:** Run (FAIL), implement, run (PASS).
- [ ] **Step 5:** Commit `feat: transform and hash math`.

---

### Task 5: Mechanism contract and placeholder gears

**Files:**
- Create: `src/mechanisms/types.ts`, `src/mechanisms/index.ts`, `src/mechanisms/gears/index.ts`, `src/mechanisms/contract.test.ts`, `src/config.ts`

**Interfaces:**
- Consumes: `Vec3`, `PartTransform`, `Faults`, `ZERO_FAULTS`, `FAULT_KEYS`, `mulberry32`, `fromAxisAngle`.
- Produces: the spec §6.3 types verbatim (`Role`, `MechanismPart`, `BoundPoint`, `Mechanism`), plus
  ```ts
  export const mechanisms: Record<string, Mechanism>; // mechanisms/index.ts
  export const ACTIVE_MECHANISM: keyof typeof mechanisms; // config.ts, = 'gears'
  ```
- `pose()` covers every fault **except `drift`**, which is per-point and lives in `mote()` (Task 6).

**Placeholder "gears" design** (units: world; machine centred on origin, facing +z):

| # | id | role | correct shape / place | wrong-twin shape / place | explodedOffset position |
|---|---|---|---|---|---|
| 0 | drive-gear | core | gear r=1.2, 18 teeth, centre (−0.9,0,0) | same gear | (−1.5, 0, 1.2) |
| 1 | driven-gear | body | gear r=0.6, 9 teeth, centre (0.9,0,0) — meshes with 0 | same gear stacked coaxially on 0 at (−0.9,0,0.3) | (1.5, 0.5, 1.5) |
| 2 | crank | core | capsule arm length 1.0 from driven-gear centre | 3-blade fan around driven-gear centre | (2, 1.5, 2.5) |
| 3 | frame | body | rounded rectangle plate 4.2×2.8 at z=−0.2 | same | (0, 0, −2) |
| 4 | loose-bracket | drift | L-bracket near (1.6,−1.1,0) | same | (0, −2, 1.5) |

Kinematics with θ = 2π·drive, then faults (correct variant; twin: parts 1–2 rotate with θ, not −2θ; blend angles by `variant`):
- `bind`: θ ← θ − bind·0.35·sin(2θ)
- `stall`: with period P = π, u = θ/P: θ ← mix(θ, P·(floor(u) + smoothstep(0.4, 1, fract(u))), stall)
- driven angle φ = −2θ·(1 + 0.6·ratio) − slip·0.8·(fract(3θ/2π) − 0.5)
- `misalign`: driven gear and crank get extra rotation about x by misalign·0.25·sin(θ) and position offset misalign·0.08 on y
- `jitter`: every part's position += jitter·0.03·(hash01-based noise of `floor(drive·40)` and part index, each axis in [−1,1])
- `samplePoints(budget, seed)`: part weights 0.32 / 0.18 / 0.12 / 0.30 / 0.08 (last part absorbs rounding so the total equals `budget`); gears = annulus fill + tooth outline; frame = filled rounded rect; crank = capsule; bracket = L. `localTwin` for parts 0, 3, 4 equals `local`; part 1's twin is the same local shape (its *placement* differs via pose); part 2's twin is the fan.

- [ ] **Step 1: Failing contract test** iterating `Object.entries(mechanisms)`:
  - has ≥1 `core` and ≥1 `body` part; `pose()` returns `parts.length` transforms; deterministic across calls and call order.
  - for each fault in `FAULT_KEYS` except `drift`: some `d ∈ {0.13, 0.37, 0.71}` gives `max_i transformDistance(pose(d, {…ZERO_FAULTS, [k]:1}, 0)[i], pose(d, ZERO_FAULTS, 0)[i]) > 1e-3`.
  - `pose(d, ZERO_FAULTS, 0)` differs from `pose(d, ZERO_FAULTS, 1)` for some part, or some point's `localTwin ≠ local`.
  - `samplePoints(1000, 7)` has length 1000, equals a second call, differs from `samplePoints(1000, 8)`; every `part` index valid; all coordinates finite; `seed` integers in `[0, 2^24)`.
- [ ] **Step 2–4:** Run (FAIL), implement gears, run (PASS).
- [ ] **Step 5:** Commit `feat: mechanism contract and placeholder gears`.

---

### Task 6: Mote attributes and TypeScript `mote()`

**Files:**
- Create: `src/scene/mote/attributes.ts`, `src/scene/mote/partTransforms.ts`, `src/scene/mote/mote.ts`, tests.

**Interfaces:**
- Consumes: `Mechanism`, `BoundPoint`, `SceneState`, transform + hash math.
- Produces:
  ```ts
  export enum MoteType { Human = 0, Agent = 1, Dialogue = 2 }
  export const ROLE_INDEX: Record<Role, number>; // core 0, body 1, drift 2
  export interface MoteAttrs {
    part: number; role: number; local: Vec3; localTwin: Vec3; seed: number; settle: number;
    type: [MoteType, MoteType, MoteType];      // [specced, vibed, misallocated]
    visible: [boolean, boolean, boolean];
  }
  export function buildMoteAttrs(mech: Mechanism, points: BoundPoint[]): MoteAttrs[];
  export function partTransforms(mech: Mechanism, s: SceneState): PartTransform[]; // compose(lerpTransform(IDENTITY, part.explodedOffset, 1 - assembly), pose[i])
  export function packPartTexture(xf: PartTransform[]): Float32Array; // 2 RGBA texels per part: [qx,qy,qz,qw],[px,py,pz,0]
  export interface MoteOut { pos: Vec3; type: MoteType; brightness: number; visible: boolean; settled: number }
  export function mote(a: MoteAttrs, s: SceneState, xf: PartTransform[]): MoteOut;
  export function spawnPoint(seed: number): Vec3;
  ```
- `buildMoteAttrs` rules (h_k = `hash01(seed, k)`):
  - `settle`: core `0.05 + 0.40·h1`; body `0.35 + 0.60·h1`; drift `0.50 + 0.45·h1`.
  - specced: core → Human if h2 < 0.55 else Dialogue; body/drift → Agent. vibed: all Agent. misallocated: core → Agent; body/drift → Human if h2 < 0.30 else Agent.
  - extras = body points with h3 < 0.15. Visible: specced and vibed → all except extras; misallocated → extras visible, core visible only if h4 ≥ 0.5, others visible.
- **`mote()` algorithm** (the GLSL in Task 7 must match it):
  1. Scenario: `u = hash01(seed, 11)`; `v = clamp(vibed,0,1)`, `m = clamp(misallocated,0,1−v)`; k = 1 if u < v, 2 if u < v+m, else 0.
  2. `rest = applyToPoint(xf[part], mix(local, localTwin, variant))`.
  3. Drift: `w = drift·(role==2 ? 1 : 0.25)`; `rest += w·0.6·[sin(1.7·rest.y + 1.3·drive + 6.283·h5), sin(1.9·rest.z + 1.1·drive + 6.283·h6), sin(2.3·rest.x + 0.9·drive + 6.283·h7)]` using the pre-drift `rest` on the right-hand side.
  4. `t = smoothstep(settle − 0.08, settle, assembly)`; `e = 1 − (1−t)^3`.
  5. `spawn = spawnPoint(seed)`: direction from h8, h9 (uniform on sphere), radius `9 + 3·h10`, y scaled by 0.6.
  6. Control point `c = (spawn + rest)/2 + 2·(h12 − 0.5)·normalize(cross(rest − spawn, [0,1,0]))` (use `[1,0,0]` if the cross is ~0). `pos = (1−e)²·spawn + 2(1−e)e·c + e²·rest`.
  7. `brightness = mix(1, 0.35, t)`; `type = type[k]`; `visible = visible[k]`; `settled = t`.

- [ ] **Step 1: Failing tests:**
  - assembly 1, zero faults, variant 0, specced: `pos` equals `applyToPoint(xf[part], local)` (1e-9), `settled=1`, `brightness=0.35`.
  - assembly 0: every attr with `settle ≥ 0.08` has `settled=0` and `pos` equals `spawnPoint(seed)`.
  - variant 1 uses `localTwin`.
  - `provenance.vibed=1` → every type is Agent; specced → some core points Human and some Dialogue, all body Agent.
  - drift 1 moves a drift-role point more than a core point (ratio ≈ 4 on average over the sample).
  - misallocated 1: fraction of visible core points in `[0.45, 0.55]` over 2000 points from gears.
  - determinism and call-order independence.
  - `packPartTexture` length = `parts·8`.
- [ ] **Step 2–4:** Run (FAIL), implement, run (PASS).
- [ ] **Step 5:** Commit `feat: mote attributes and reference mote()`.

---

### Task 7: GLSL `mote()` and parity page

**Files:**
- Create: `src/scene/mote/mote.glsl`, `src/parity/parity.html`, `src/parity/parity.ts`, `e2e/parity.spec.ts`; Modify: `vite.config.ts` (add page input).

**Interfaces:**
- Consumes: Task 6 algorithm, `packPartTexture`, `buildMoteAttrs`.
- Produces (GLSL, `#version 300 es` compatible, included via `?raw` string concatenation):
  ```glsl
  struct MoteAttrs { vec3 local; vec3 localTwin; float part; float seed; float settle; float role; vec3 type; vec3 visible; };
  struct MoteOut { vec3 pos; float type; float brightness; float visible; float settled; };
  uniform sampler2D uParts;  // RGBA32F, width = 2*partCount, row = copy
  uniform float uAssembly, uVariant, uDrive, uDrift, uVibed, uMisallocated;
  uint pcg(uint v); float hash01(uint seed, uint salt);
  MoteOut mote(MoteAttrs a, int copy);
  ```
- Parity page: builds attrs for 256 gear points, stores them in float textures, renders a 16×16 RGBA32F target where each fragment writes `vec4(mote().pos, settled)`, reads back with `readRenderTargetPixels`, compares with TS `mote()`; exposes `window.__parity = { cases: { name: string; maxError: number }[] }`.

- [ ] **Step 1: Failing e2e test** `parity.spec.ts`: open `/src/parity/parity.html?test=1`, wait for `window.__parity`, assert every case `maxError < 1e-3`. Cases: assembly 0 / 0.5 / 1; variant 0.5; drift 1 with drive 0.37; vibed 0.5 + misallocated 0.3; all faults 0.6 at drive 0.71.
- [ ] **Step 2:** Run `npx playwright test e2e/parity.spec.ts` — FAIL.
- [ ] **Step 3:** Implement `mote.glsl` (uint arithmetic for `pcg`; texelFetch with NEAREST) and the parity page.
- [ ] **Step 4:** Run — PASS. If a case fails, fix the GLSL, never loosen the tolerance.
- [ ] **Step 5:** Commit `feat: GLSL mote() with TS parity test`.

---

### Task 8: Mote system rendering

**Files:**
- Create: `src/scene/mote/moteSystem.ts`, `src/scene/mote/shaders/mote.vert.glsl`, `mote.frag.glsl`, `thread.vert.glsl`, `thread.frag.glsl`, `ghost.vert.glsl`, `ghost.frag.glsl`, `e2e/looks.spec.ts`
- Modify: `src/main.ts` — mount the mote system for `ACTIVE_MECHANISM` (budget 100k desktop) and render `mergeState(defaultSceneState(), <?state= JSON>)`; `?test=1` disables shimmer. Task 9 replaces the default state with the sampler output and keeps `?state=` as an override.

**Interfaces:**
- Consumes: `mote.glsl`, `buildMoteAttrs`, `partTransforms`, `packPartTexture`.
- Produces:
  ```ts
  export interface MoteSystem {
    object: THREE.Group; // motes + threads + ghost meshes
    update(state: SceneState, camera: THREE.PerspectiveCamera, viewportPx: { width: number; height: number }, shimmerTime: number | null): void;
    dispose(): void;
  }
  export function createMoteSystem(mech: Mechanism, budget: number, seed: number): MoteSystem;
  ```
- Rendering rules (spec §5.1, §6.4):
  - One `InstancedBufferGeometry`, two quads (8 vertices) per instance; the second quad is the dialogue twin and is collapsed to zero size unless type is Dialogue. Instanced attributes: `aLocal`, `aTwin`, `aMeta0 = (part, seed, settle, role)`, `aMeta1 = (typeS, typeV, typeM, visibleBits)`.
  - Sizes (world units, then clamped in pixels): human 0.12 / cap 48px, agent 0.025 / cap 4px, dialogue 0.05 / cap 10px; minimum 1px. Invisible motes collapse to zero size.
  - Fragment: human = soft halo `exp(−4r²)` plus bright core; agent = hard disc with 1px smoothstep edge; dialogue = small soft disc. Colors from Global Constraints, multiplied by `brightness`. `blending: AdditiveBlending`, `depthWrite: false`, `transparent: true`.
  - Dialogue twins orbit the mote position in the view plane: radius 0.06, phase `uDrive·6 + 6.283·hash01(seed, 13)`.
  - Thread mesh: same instanced attributes; a 1.5px-wide quad between the two twins, alpha 0.25, only for Dialogue.
  - Ghost mesh: same attributes, every 4th instance (`gl_InstanceID % 4 == 0`), evaluated with faults zero (uses a second part texture from `pose(drive, ZERO_FAULTS, 0)`, assembly 1), variant 0, drift 0, specced; 2px hard dot, white, alpha `0.35·ghost`; hidden when `ghost == 0`.
  - Shimmer: when `shimmerTime !== null`, settled motes get `0.01·sin(shimmerTime·1.3 + 6.283·hash01(seed,14))` per axis; `shimmerTime` is wrapped `% 1000` on the CPU.
- `aMeta1.w` packs the three visibility flags as bits (1 = specced, 2 = vibed, 4 = misallocated); the vertex shader unpacks them into `MoteAttrs.visible`.

- [ ] **Step 1: Failing e2e** `looks.spec.ts` (renders fixed states via `/?test=1&state=…`, screenshots the canvas, asserts by pixel sampling):
  - specced, assembly 1: amber pixels exist near the drive-gear centre's projection; blue pixels exist over the frame.
  - vibed 1: no amber pixels anywhere (sample whole canvas; amber = R>200, G 140–200, B<120).
  - ghost 1 vs ghost 0: count of near-white pixels increases.
  - all motes invisible state (assembly 1, misallocated 1 on a core-only crop) renders without errors.
  - Save screenshots to `shots/looks-*.png` for human review.
- [ ] **Step 2–4:** Run (FAIL), implement, run (PASS). Look at the saved screenshots before committing.
- [ ] **Step 5:** Commit `feat: instanced mote rendering with dialogue threads and ghost`.

---

### Task 9: App wiring and the first story slice

**Files:**
- Create: `src/scroll/driver.ts`, `src/scene/cameraRig.ts`, `src/story/01-vibe-build.md`, `src/story/02-rewind.md`, `src/story/03-spec.md`, `src/timeline/keyframes.json`, `e2e/app.spec.ts`; Modify: `src/main.ts`, `src/style.css`, `index.html`

**Interfaces:**
- Consumes: everything above.
- Produces:
  ```ts
  export interface ScrollDriver { progress(): number; dispose(): void }
  export function createScrollDriver(onProgress: (p: number) => void): ScrollDriver; // rAF-coalesced; on resize re-scrolls to scrollYForProgress(last p)
  export function applyCamera(camera: THREE.PerspectiveCamera, s: SceneState): void; // position, lookAt(target), fov
  // test-mode hook, only when ?test=1:
  window.__motes = { progress(): number; frames(): number; settle(): Promise<void> } // settle = resolves after 2 rAFs with no scroll events
  ```
- URL params: `?p=<0..1>` scrolls to `scrollYForProgress(p)` on load; `?test=1` disables shimmer and exposes `window.__motes`; `?state=<URI-encoded JSON>` (from Task 8) now merges over the sampled state.
- Layout: each section is a `<section>` of height `length × 100vh` containing a sticky text panel (max-width 28rem, left gutter, readable on `#0B0D12`); the canvas is `position: fixed`, `aria-hidden="true"`; each section carries `data-alt` text in a visually hidden element.
- Render loop: rAF; skip rendering while `document.hidden`; `webglcontextlost` → `preventDefault()`, stop the loop, add `body.no-webgl`.
- Story slice (draft gist copy, `draft: true`, ≤ 80 words each — final copy is the author's):
  - `01-vibe-build` (length 3): the vague prompt; the swarm builds something impressive; it's the wrong machine.
  - `02-rewind` (length 2): scroll back; vibing the spec doesn't skip the spec, it defers it.
  - `03-spec` (length 3): commander's intent — purpose, end state, constraints; the ghost appears.
- `keyframes.json` (section-relative `at`):
  - vibe-build: `provenance.vibed` 1 throughout; `mech.variant` 1; `mech.assembly` 0 @0 → 1 @0.7 (outCubic); `mech.drive` 0 @0 → 2 @1; camera wide `pos [0,1.5,14]` @0 → `[3,1,10]` @1; `ghost` 0.
  - rewind: `assembly` 1 @0 → 0 @0.8 (inOutQuad); `drive` 2 → 0; `variant` 1 → 0 @0.9; `provenance.vibed` 1 → 0 @0.9..1; camera pulls back to `[0,0,16]`.
  - spec: `ghost` 0 @0 → 1 @0.3; `assembly` 0 @0.2 → 0.45 @1 (core settles first per Task 6 settle ranges); camera close `pos [-1.2,0.3,5]`, `target [-0.9,0,0]`, `fov` 35; `drive` 0 → 0.5.

- [ ] **Step 1: Failing e2e** `app.spec.ts`:
  - `/?test=1&p=0.5`: `__motes.progress()` within 0.002 of 0.5; the section containing 0.5 is in view.
  - **Resize:** at `p=0.42`, set viewport 1280×800 → 900×700, `settle()`, progress within 0.002 of the pre-resize value.
  - **Context loss:** call `WEBGL_lose_context.loseContext()`; no `pageerror`; `body` has class `no-webgl`; first section panel text visible.
  - **Hidden tab:** override `document.hidden` to true + dispatch `visibilitychange`; `frames()` stops increasing over 300ms; restore → increases again.
  - Out-of-range: `?p=1.7` → progress 1; `?p=-3` → 0; `?p=abc` → 0.
- [ ] **Step 2–4:** Run (FAIL), implement, run (PASS).
- [ ] **Step 5:** Commit `feat: app wiring and first story slice (vibe build, rewind, spec)`.

---

### Task 10: Rewind invariant e2e, section screenshots, CI e2e

**Files:**
- Create: `e2e/purity.spec.ts`, `e2e/shots.spec.ts`; Modify: `package.json` (script `shots`: `SHOTS=1 playwright test e2e/shots.spec.ts`), `.github/workflows/ci.yml` (upload `shots/` and `test-results/` as artifacts on failure)

**Interfaces:**
- Consumes: `window.__motes`, `?p=`, `?test=1`.

- [ ] **Step 1: Write** `purity.spec.ts`:
  - **Jump vs scroll:** page A `/?test=1&p=0.41` → `settle()` → canvas screenshot. Page B `/?test=1`, wheel-scroll in 40 steps to `scrollYForProgress(0.41)` exactly (final `window.scrollTo` to the integer target), `settle()`, screenshot. Assert `Buffer.equals`.
  - **Forward past and back:** page C scrolls to 0.8 then back to the same integer `scrollY` as A; screenshot equals A.
  - Repeat for p = 0.12 (mid vibe build) and 0.88 (spec).
- [ ] **Step 2:** Run. Expected: PASS (if it fails, a purity violation exists — find the accumulated state and remove it; never add tolerance).
- [ ] **Step 3:** `shots.spec.ts` (skipped unless `SHOTS=1`): for each section, screenshot at local 0.1, 0.5, 0.9 to `shots/<id>-<local>.png`.
- [ ] **Step 4:** Run `npm run shots`; review the images.
- [ ] **Step 5:** Commit `test: rewind invariant and section screenshots`.

---

### Task 11: Hardware spike pages and preview deploy

**Files:**
- Create: `src/spikes/index.html`, `src/spikes/fill.html`, `src/spikes/vertex.html`, `src/spikes/floattex.html`, `src/spikes/caps.html`, `src/spikes/hud.ts`, `src/spikes/*.ts`, `e2e/spikes.spec.ts`, `.github/workflows/pages.yml`; Modify: `vite.config.ts`

**Interfaces:**
- Consumes: `createMoteSystem`, `mechanisms`, `mergeState`.
- Produces: `export function createHud(): { frame(cpuMs: number): void; setGpuMs(ms: number | null): void; setInfo(lines: string[]): void }` — shows rolling 60-frame average and p95 frame time; uses `EXT_disjoint_timer_query_webgl2` when available, else shows "GPU timer unavailable".

Spike pages (spec §10), each with a "copy results" button that copies a JSON summary (UA, renderer string, DPR, params, averages):
- `fill.html` — spike 1: `?n=30000&dpr=1.5`, every mote Human (state override), camera at the worst framing (`pos [-0.9,0,2.2]`), drive animating.
- `vertex.html` — spike 2: `?n=100000`, every fault 1, drift 1, drive animating; reports whether vertex time exceeds 4ms when GPU timing is available.
- `floattex.html` — spike 3: vertex shader `texelFetch`es a 4×4 RGBA32F texture with known values and positions 16 quads from them; reads pixels back; shows PASS/FAIL.
- `caps.html` — spike 5: lists `ALIASED_POINT_SIZE_RANGE`, `MAX_VERTEX_UNIFORM_VECTORS`, `MAX_VERTEX_ATTRIBS`, `MAX_TEXTURE_SIZE`, `EXT_color_buffer_float`, `EXT_disjoint_timer_query_webgl2`, renderer, DPR.

- [ ] **Step 1: Failing e2e** `spikes.spec.ts`: each page loads with no `pageerror`; `floattex` shows PASS; `caps` lists a numeric `MAX_VERTEX_UNIFORM_VECTORS`; `fill` and `vertex` HUDs show a numeric average after 1s.
- [ ] **Step 2–4:** Run (FAIL), implement, run (PASS).
- [ ] **Step 5:** `pages.yml`: on push to `main`, build with `BASE_PATH=/motes-of-work/`, deploy `dist` via `actions/deploy-pages`. Document in `README.md` that GitHub Pages must be enabled (Settings → Pages → Source: GitHub Actions); for a private repo this needs a plan that supports private Pages.
- [ ] **Step 6:** Commit `feat: hardware spike pages and Pages preview workflow`.

---

## Final verification (after Task 11)

- [ ] `npm run typecheck && npm test && npm run e2e` all pass.
- [ ] `npm run shots`; review `shots/` for the three sections.
- [ ] Push branch `plan-1-foundation`.
