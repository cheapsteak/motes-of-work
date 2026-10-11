# Task 8 report: Mote system rendering

Status: DONE_WITH_CONCERNS. Commit `4a76f10 feat: instanced mote rendering with dialogue threads and ghost`.

## What I implemented
- `src/scene/mote/moteSystem.ts`: `createMoteSystem(mech, budget, seed)` returns `{ object, update, dispose }` with the interface from the brief.
  - Three meshes share one set of `InstancedBufferAttribute`s: `aLocal`, `aTwin`, `aMeta0 = (part, seed, settle, role)`, and `aMeta1 = (typeS, typeV, typeM, visibleBits)`, where the bits are 1 specced, 2 vibed, 4 misallocated.
  - **Motes:** 8 vertices per instance (two quads, `aCorner` plus `aQuad`).
  - **Threads:** 4 vertices per instance.
  - **Ghost:** 4 vertices per instance.
  - All materials are `RawShaderMaterial` (GLSL3) with `AdditiveBlending`, `depthWrite: false` and `transparent: true`. `frustumCulled = false`.
  - The live part texture is rewritten every `update` from `partTransforms(mech, state)`.
  - The ghost has its own part texture (`partTransforms(mech, {…state, mech: {…, assembly 1, variant 0, faults ZERO_FAULTS}})`) and its own uniform objects: assembly 1, variant 0, drift 0, vibed 0, misallocated 0, with `uDrive` set to the state drive.
  - The ghost mesh's `visible` is set to `ghost > 0`.
  - Shimmer: `null` or non-finite turns it off. Otherwise the time is wrapped `% 1000` into [0, 1000).
- Shaders in `src/scene/mote/shaders/`:
  - `mote.vert.glsl`:
    - Sizes: human 0.12 / 48px, agent 0.025 / 4px, dialogue 0.05 / 10px, minimum 1px. Invisible motes are collapsed.
    - Twins orbit in the view plane: radius 0.06, phase `uDrive·6 + 6.283·hash01(seed,13)`. Twin 0 sits at +offset and twin 1 at −offset. The twin quad is collapsed unless the mote is Dialogue.
    - Shimmer is added after `mote()`: `settled · 0.01·sin(t·1.3 + 6.283·hash01(seed,14))`, the same value on each axis.
  - `mote.frag.glsl`: human is an `exp(−4r²)` halo plus a bright core, agent a hard disc with a 1px smoothstep edge, dialogue a small soft disc. Colors are the brief's colors × brightness.
  - `thread.vert.glsl` / `thread.frag.glsl`: a 1.5px screen-space quad between the twins, Dialogue only.
  - `ghost.vert.glsl` / `ghost.frag.glsl`: `gl_InstanceID % 4 == 0`, a 2px white dot, alpha `0.35·ghost`.
  - Every vertex shader starts with `precision highp float; precision highp int;`.
  - `mote.glsl` is spliced in only into vertex shaders, at a marker line. `withMoteLibrary` throws if the marker is missing.
  - Fragment shaders get everything through varyings and declare no uniforms.
  - Seed and part conversions use `uint(round(x))` / `int(round(x))`.
- Extra file: `shaders/instance.glsl`. It is a shared chunk with the instanced attribute decoding (bit unpack), `shimmer()`, `twinOffset()`, `toView()` and `pxPerUnit()`, spliced after `mote.glsl` so the three vertex shaders do not duplicate it. It matches the plan's `shaders/*.glsl` glob.
- `src/main.ts`:
  - Mounts `createMoteSystem(mechanisms[ACTIVE_MECHANISM], MOTE_BUDGET_DESKTOP, MOTE_SEED)` (100k).
  - The state is `mergeState(defaultSceneState(), JSON.parse(?state=))`. Invalid JSON logs one `console.warn` and falls back to the defaults (verified: "Ignoring ?state=: not valid JSON", no errors).
  - A fixed `PerspectiveCamera` is set from `state.camera` (pos, target, fov).
  - `?test=1` renders once with shimmer `null`. Otherwise a rAF loop runs with `shimmerTime = (now/1000) % 1000`.
  - `window.__moteFrames` counts rendered frames, and e2e waits on it.
  - Sizes are in drawing-buffer pixels (`renderer.getDrawingBufferSize`).
- `src/config.ts` (outside the task's file list, but the plan's layout says budgets live here): added `MOTE_BUDGET_DESKTOP = 100_000` and `MOTE_SEED = 1`.
- devDependencies: `pngjs@^7.0.0` and `@types/pngjs`. The e2e uses `page.locator('#stage').screenshot()` and decodes the PNG in Node with pngjs. That is the screenshot-and-decode option, not in-page readPixels.
- `?n=` is not added. SwiftShader renders the 100k budget fast enough in test mode: about 3 s per look, and the whole looks suite takes about 20 s.

## Tests
- `e2e/looks.spec.ts` uses a fixed camera (0,0,8) → origin, fov 40, at 1280×720. Every render asserts no `pageerror` and no console errors, and screenshots go to `shots/looks-*.png`.
  - **Specced, assembly 1:**
    - Amber (R>200, G 140–200, B<120): more than 50 amber pixels in the box around the drive gear centre's projection, extent ±1.2 world units. Actual about 1.6k–5k depending on tuning.
    - More than 50 blue pixels in the frame's top-left corner, which is clear of both gears.
  - **Vibed 1:** 0 amber pixels on the whole canvas, and more than 1000 blue pixels.
  - **Ghost:** with misalign 1, the near-white count with ghost 1 is more than the count with ghost 0 plus 200.
  - **Misallocated 1, assembly 1:** renders without errors. A core crop is saved to `shots/looks-misallocated-core.png`, and the canvas still has more than 1000 blue pixels.
- `src/scene/mote/moteSystem.test.ts` (Vitest, 5 tests, written after the implementation) checks:
  - the `aMeta1` bits and types against `buildMoteAttrs`;
  - that the instanced attributes are shared across the three meshes, and that the mote geometry has 8 corners;
  - that the ghost texture equals the zero-fault, assembled, variant-0 pose, the ghost uniforms (1/0/0/0/0, drive passed through) and that the live texture stays the real state;
  - that the ghost is hidden at 0;
  - shimmer wrap (2500.5 → 500.5) and `null` → off.

### TDD evidence
- RED: `npx playwright test e2e/looks.spec.ts --reporter=line`. Result: `4 failed`, each `page.waitForFunction: Test timeout of 120000ms exceeded` at `__moteFrames >= 1`. This was expected because the old `main.ts` rendered an empty scene and set no frame counter.
- First GREEN attempt: 3 passed and 1 failed. The specced test got `Expected: > 50, Received: 16`, because the core had saturated to white (see concern 1). After calibrating alphas: `4 passed (20.3s)`.
- Final: `npm run typecheck` is clean. `npm test` gives `Test Files 11 passed (11)` and `Tests 116 passed (116)`. `npm run e2e` gives `6 passed (33.3s)` (smoke, parity, 4 looks).

## What I saw in the screenshots (I read them)
- **specced:** The drive gear and crank are warm. The gear body is a dense amber speckle, and its tooth outline is a bright amber-white rim with a soft halo glow at the edges. The crank bar clips to white.
  - The driven gear and frame are cool blue. The driven gear's dense tooth outline and the loose bracket clip to near-white.
  - Human halos are not individually visible at the overview distance; they merge into a warm glow. In a close-up (camera 2.5 from the gear, assembly 0.6), the halos and bright cores are clearly individual and capped at 48px.
- **vibed:** The whole machine is blue. The gear annuli are a lighter blue and the outlines white-blue. No warmth.
- **ghost-1 vs ghost-0 (misalign 1):** The ghost shows as a second, crisp white outline of the driven gear beside the tilted, sagging real one. The frame and gear pick up a sparse white dotting. The ghost is clearly visible.
- **misallocated:** The drive-gear core is sparse and cool (half invisible, the rest agent). Warm speckle appears on the frame and bracket, and the driven gear and crank turn warm/white. This matches "warmth and density on the case; core sparse".
- **In flight (assembly 0.12, debug render):** Amber halos and blue points are scattered. Dialogue twins with their thread render correctly as dumbbell pairs; I checked this at full alpha. At the committed calibration they are faint ghostly pairs.

## Concerns
1. **Additive density vs. the mote counts. This is the main concern, and it led to a deviation.**
   - `buildMoteAttrs` makes 55% of core motes Human and 45% Dialogue. At 100k that is roughly 24k humans and 20k dialogue motes, against the spec's "tens–hundreds" and "hundreds".
   - With additive blending, the specced core clipped to pure white: mean (249,243,230), with 16 amber pixels.
   - The dominant term was the thread at the brief's alpha 0.25. With threads disabled, the mean drops to (214,192,150).
   - I therefore calibrated the free per-type peak alphas: human halo 0.1, human core 0.78, dialogue twin peak 0.12.
   - I also made the thread alpha **0.25 relative to the dialogue peak** (0.25 × 0.12 = 0.03) instead of an absolute 0.25. With an absolute 0.25, the specced core cannot be amber at this density: violet adds about B+125.
   - `DIALOGUE_PEAK` lives in `moteSystem.ts` and is `#define`d into both shaders, so the two cannot drift apart.
   - Cost: dialogue twins and threads are faint, both in flight and settled. Dense parts (crank, tooth outlines, bracket, driven gear outline) still clip to white.
   - The real lever is the type mix and counts in `attributes.ts` (Task 7's output) or a count/density control. Please rule on it. Raising the dialogue peak to 0.3 drops the amber count to about 58, which is borderline for the test.
2. **Shimmer "per axis"** is implemented as the same scalar on all three axes, as the brief reads literally. Per-axis phases would need extra hash salts that the brief does not give.
3. **SwiftShader, non-test page:** the continuous rAF loop at 100k runs at about 8 fps. Under that load, `page.screenshot` on a non-test page timed out after 30 s in an ad-hoc script. Test-mode pages render once and are unaffected, and the smoke test (non-test `/`, no screenshot) passes. Task 9's e2e on non-test pages may need `?test=1` or a smaller `?n=`.
4. **Screenshots include the DOM overlay** (the "Placeholder section." text). It does not affect the classifiers: its color is not amber or blue, and it is the same in the ghost 0/1 pair.
5. The `camera` parameter of `update` is unused (it is named `_camera`). The renderer supplies the camera matrices, so it is kept only for the contract.

## Files
- New:
  - `src/scene/mote/moteSystem.ts`
  - `src/scene/mote/moteSystem.test.ts`
  - `src/scene/mote/shaders/{instance,mote.vert,mote.frag,thread.vert,thread.frag,ghost.vert,ghost.frag}.glsl`
  - `e2e/looks.spec.ts`
- Modified: `src/main.ts`, `src/config.ts`, `package.json`, `package-lock.json`.

## Self-review
- Every vertex shader that includes `mote.glsl` starts with highp float and int. Fragment shaders declare no shared uniforms.
- The ghost has separate uniform objects and its own texture; the unit test checks both. Motes and threads share uniform objects on purpose.
- Hidden quads move to a clip point outside the view volume (`MOTE_HIDDEN`), so they produce no fragments.
- Formatting follows the repo style (prettier, 120 columns, single quotes).

---

## Fix report: controller ruling on concern 1 (hero fraction)

Commit: `5cd3c3c fix: hero fraction for large human and dialogue forms`.

### What changed
- `shaders/instance.glsl` gets `moteForm(type, seed)`, which uses the library `hash01(uint(round(seed)), 15u)` and returns one of three forms:
  - `FORM_HALO` for Human when the hash is < 0.01 (`HERO_HUMAN`);
  - `FORM_TWIN` for Dialogue when the hash is < 0.03 (`HERO_DIALOGUE`);
  - `FORM_POINT` for everything else.

  At 100k that is roughly 240 hero humans and about 600 hero dialogue pairs.
- `mote.vert.glsl` sizes by form: halo 0.12 / 48px, point 0.025 / 4px, twin 0.05 / 10px.
  - The twin quad and the orbit offset apply only to `FORM_TWIN`. For non-hero dialogue the second quad collapses.
  - Colour still comes from the MoteType (`vType`), and the shape now comes from the form (`vForm`).
- `thread.vert.glsl` draws threads only for `FORM_TWIN`. `thread.frag.glsl` uses alpha 0.25 again, as briefed.
- `mote.frag.glsl`:
  - **Halo:** `0.5*exp(-4r^2)` plus a full-strength core.
  - **Point:** hard disc with a 1px edge, in its type colour, the same as agents.
  - **Twin:** soft disc at full peak, `1 - smoothstep(0.3, 1, r)`.
  - The 0.1/0.78/0.12 reductions and the `DIALOGUE_PEAK` define are removed, since the define is no longer shared.
- `mote()`, `mote.glsl`, `attributes.ts` and the parity page are unchanged.

### Tests
- `npx playwright test e2e/looks.spec.ts`: 4 passed (20.2 s). All four assertions still hold.
- `npm run typecheck`: clean. `npm test`: 11 files, 116 tests passed. `npm run e2e`: 6 passed (25.0 s).
- After the run, no preview servers, Playwright or Chromium processes of mine were left running. Two `<defunct>` headless_shell zombie entries were left over from an ad-hoc script I had killed earlier; they hold no resources.

### Near-white pixels in the specced shot (min channel >= 170, spread <= 40; the same classifier as the ghost test)

| | before (4a76f10) | after (5cd3c3c) |
|---|---|---|
| whole canvas, near-white | 25,008 | 24,898 |
| whole canvas, all channels >= 250 | 16,129 | 17,095 |
| drive-gear annulus fill (0.38-0.94 world units from the centre), near-white | 11,422 | 12,672 |
| everywhere else, near-white | 13,586 | 12,226 |
| amber pixels, whole canvas | 2,222 | 873 |
| drive-gear annulus mean RGB | (235, 219, 176) | (184, 177, 168) |

**The specced core still has near-white pixels, so the ruling's expectation did not fully hold.** The cause is no longer halos or threads; it is the density of the points.
- The annulus holds about 0.55 points/px². In specced, 45% of the core points are dialogue-coloured.
- `#E6DDFF` x 0.35 settled brightness is (80, 77, 89), so two or three overlapping dialogue points, or amber plus violet points, already land in the near-white band.
- Overall near-white is flat. The drop away from the core (crank and outlines lost their halo bloom) is offset by a rise in the gear fill.
- Mean brightness in the fill fell (235 → 184 red), and no clipped halo blanket is left.
- For comparison, the vibed shot has 9,154 near-white pixels, from the dense tooth outlines, the crank and the bracket. Mechanism shape density clips in every provenance.

If the controller wants the specced core to stop reaching near-white, possible levers are:
- dim the point form, or the settled brightness of 0.35, for non-hero human and dialogue points;
- reduce the outline share in the gear sampler.

Neither is in the ruling, so I left both alone.

### What I saw (re-taken shots, read)
- **specced:** The drive-gear core is a fine speckle of amber, pale violet-white and some blue (frame behind). It reads warm/violet rather than a white slab. The tooth outline is white-cream, and the crank and bracket clip to white. The driven gear and frame are blue.
- **Close-up** (camera 4 units from the gear, assembly 1): sparse hero halos show as soft amber glows over the point speckle, most visibly along the tooth rim.
- **In flight** (assembly 0.12): amber, blue and violet points. One hero halo is visible as a soft orange glow, and several hero dialogue pairs show as twin dots joined by a faint thread.
- **ghost-1:** a crisp second white outline of the driven gear beside the misaligned one, and white dotting over the frame.
- **vibed:** all blue, no warmth.
- **misallocated:** a sparse cool core, warm speckle on the frame, and the driven gear and crank whitish-warm.
