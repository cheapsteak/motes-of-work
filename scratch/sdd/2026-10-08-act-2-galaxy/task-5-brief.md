### Task 5: The renderer, I: the galaxy drawn by level of detail (behind `?galaxy=1`)

**Files:**
- Create:
  - `src/scene/node/lod.ts`, `lod.glsl`, `lod.test.ts`
  - `src/scene/galaxy/galaxySystem.ts`, `galaxySystem.test.ts`, `shaders/star.vert.glsl`, `shaders/star.frag.glsl`
  - `src/scene/node/bodySystem.ts`, `bodySystem.test.ts`, `bodyAttrs.ts`, `shaders/shell.vert.glsl`, `shaders/body.vert.glsl`, `shaders/body.frag.glsl`, `shaders/track.vert.glsl`
  - `src/timeline/galaxyShots.ts`
  - `e2e/galaxy.spec.ts`, `e2e/stills.spec.ts`
- Modify: `src/main.ts` (`?galaxy=1`, `?shot=` in test mode, `drawStats`, `__motes.lod()`), `src/scene/node/birth.ts` (`NodeRole` adds Moon 2, Track 3, Glow 4; the CrackFace value is dropped in Task 8), `src/scene/mote/shaders/mote.frag.glsl` (the Glow role's profile), the parity files (`?lib=lod`), `package.json` (`"stills": "SHOTS=1 playwright test e2e/stills.spec.ts"`)

**Interfaces:**
- Consumes: Tasks 1–4. `lightingUniforms`/`updateDepthUniforms` (`src/scene/lighting.ts`), `withNodeLibrary`-style splicing.
- Produces:
  ```ts
  // lod.ts (lod.glsl mirrors it)
  export enum LodElement { PlanetPoint = 0, PlanetShell = 1, Moon = 2, Track = 3, Derp = 4 }
  export const LOD_BANDS: Record<LodElement, [number, number]> = { 0: [10, 20], 1: [25, 50], 2: [60, 120], 3: [60, 120], 4: [60, 120] };
  export function lodGain(el: LodElement, sysPx: number): number;          // smoothstep over the band; 0 below
  export function systemPx(outer: number, dist: number, focalPx: number): number;
  export { glowPx } from '../../galaxy/body';                             // clamp(5·R·focal/d, 5, cap): one TS function (Task 1), lod.glsl mirrors it
  export const PX = { mote: [1, Infinity], moon: [1.5, Infinity], litPlanet: [3, Infinity], bgStar: 2, brightStar: 3, starGlow: 18, coreGlow: 24, haze: 56 } as const;
  export const HAZE_GAIN = 0.35;
  export type Viewport = { width: number; height: number; pixelRatio: number }; // as nodeSystem's update takes it today
  // galaxySystem.ts
  export interface GalaxySystem { object: Group; counts: { stars: number; bright: number; dust: number; haze: 1 };
    update(state: SceneState, camera: PerspectiveCamera, viewport: Viewport, ambient: number): void; dispose(): void }
  export function createGalaxySystem(bg: Background): GalaxySystem;        // meshes galaxy-stars, galaxy-bright, galaxy-dust, galaxy-haze
  // bodySystem.ts
  export interface BodySystem { object: Group; counts: Record<'shells' | 'bodies' | 'glow' | 'tracks', number>;
    update(state: SceneState, camera: PerspectiveCamera, viewport: Viewport, ambient: number): void;
    lod(): { sysPx: number[]; levels: [starOnly: number, starPlanets: number, full: number] }; dispose(): void }
  export function createBodySystem(g: Galaxy): BodySystem;                 // meshes net-shells, net-bodies, net-glow, net-tracks
  // galaxyShots.ts: §14.5's shots as data, resolved untracked (world-anchored) until Task 7
  export interface GalaxyShot { target: TargetRef; bearing: number; elevation: number; distance: number | { outerTimes: number }; fov: number; frame: number; lamp: number }
  export const GALAXY_SHOTS: Record<'galaxyWide' | 'hood' | 'core' | 'system' | 'twelve' | 'close', GalaxyShot>;
  export function galaxyShotKeys(shot: GalaxyShot, g: Galaxy, ambient: number): SceneState['camera'];
  ```
  The probe shots are §14.5's values:
  - `galaxyWide` (0, 86, 640, 40, 0; core)
  - `hood` (0, 82, 120, 40, 0; the neighbourhood centroid)
  - `core` (30, 64, 30, 40, 0; core)
  - `system` (−10, 72, 2.7·outer(P_a), 40, 0; P_a)
  - `twelve` (−10, 74, 58, 40, 0; centroid P1–P3)
  - `close` (HERO_CLOSE.C1)

  **What the meshes draw:**
  - `net-shells`: every body's lattice motes, in one instanced set with `aLL`. Planets with `aRole` Moon or Builder are gated by `lodGain(PlanetShell)` and `lodGain(Moon)`. A planet's point is drawn as a 2 px dot by `lodGain(PlanetPoint)`.
  - `net-bodies`: icospheres with 320 tris for the core, stars and planets, and 80 for moons. The rim is `pow(1 − |n·v|, 2.6)·0.55`; the fill is 0.035, or 0.28 for moons.
  - `net-glow`: one Glow mote per star and core body, with profile `core(r) = 1 − smoothstep(0, 0.35, r)` plus `halo(r) = 0.45(1 − r)²`.
  - `net-tracks`: dotted orbits (90 per planet orbit, 40 per moon track in use: a track's moons share its ellipse) placed by `orbitLocal` with their own true anomaly, gated by `lodGain(Track)`.
  - `uSysPx[SYS_MAX]` is computed on the CPU each frame.

- [ ] **Step 1: Write the failing unit tests.**
  - `lod.test.ts`:
    - each band is 0 below and 1 above, smoothstep between
    - the three levels split at 10 and 60
    - `glowPx` clamps to [5, 18] and [5, 24]
  - `bodySystem.test.ts`:
    - each mesh's instance count equals the generator's sum (shell motes = Σ `latticeCount`; tracks = 90·planets + 40·moon tracks; glow = stars + 6; the sum of every set = `Galaxy.instances`)
    - `aLL` per body equals `latticeLL`
  - `galaxySystem.test.ts`: the counts equal the tier's.

- [ ] **Step 2: Write the failing e2e tests** (`e2e/galaxy.spec.ts`, `?galaxy=1&test=1&shot=<name>&state={"net":{"show":1,"growth":1}}`, both sizes)

```ts
test('three levels by projected size: galaxy wide is star-only, the neighbourhood star-and-planets, the system full', async ({ page }) => {
  // __motes.lod().levels at galaxyWide: [all, 0, 0]; hood: full === 0 and starPlanets ≥ 6; system: full ∈ [1, 2]
});
test('no moon or track mote is drawn where s_px < 60', ...);   // render with moons' gain forced 0 vs normal: byte-equal at hood
test('halos apart at the probe shots', ...);                    // every pair of core/star glow centres: distance > r_i + r_j (sprite radii from glowPx)
test('caps are CSS px at DPR 3', ...);                          // deviceScaleFactor 3: the brightest star sprite's lit width ≤ 3 × 3 + 2 device px; ≥ 3 device px for a dust mote
test('a resize keeps the counts', ...);                         // 390×844 → 844×390 → 390×844: drawStats instances identical, no console error, lod() recomputed
test('the galaxy keeps within its budget', ...);                // Σ net-* instances = Galaxy.instances.total ≤ galaxyBudget(n); galaxy-* = tier counts exactly
```

- [ ] **Step 3: Run them.** Expected: FAIL.

- [ ] **Step 4: Implement `lod.*`, `galaxySystem.ts` and the star shaders** (haze drawn only when the camera's distance to the core is > 300), then `bodyAttrs.ts`, `bodySystem.ts` and their shaders at a static `uAmbient = 0`, with `?galaxy=1` wiring in `main.ts`.
  - The old network stays the default.
  - `?shot=` and `?galaxy=` are honoured only with `?test=1` (`?galaxy=1` also works without it, for the author).
  - Each sprite's `gl_PointSize` = `clamp(px, min, max) × uPixelRatio`.

- [ ] **Step 5: Add `?lib=lod`** (`lodGain` and `glowPx` over a grid) and `e2e/stills.spec.ts`.
  - The spec takes a table `STILLS: { tag: string; name: string; query: string }[]` and writes `shots/galaxy/<tag>-<name>-<w>x<h>.png` at 390×844, then 1440×900.
  - Task 5's rows: `T5-galaxy-wide`, `T5-hood`, `T5-core`, `T5-system`, `T5-twelve`, `T5-close`.

- [ ] **Step 6: Run.** Expected: PASS.

- [ ] **Close-out** A–D. Stills: `T5-*` at the phone size first. Retired: nothing; the old picture is untouched and its tests still run.

---

