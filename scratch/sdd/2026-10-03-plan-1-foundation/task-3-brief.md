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

