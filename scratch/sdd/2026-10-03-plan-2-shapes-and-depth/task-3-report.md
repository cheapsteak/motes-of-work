# Task 3 report: Normals, lighting and depth cues

Status: DONE_WITH_CONCERNS (see "Concerns")
Commit: cc216b3 feat: surface normals, lighting and depth cues

## What I implemented

### Normals through the pipeline
- `BoundPoint` gains `normal` and `normalTwin`. Both are unit vectors in part space.
- Gears (`src/mechanisms/gears/shapes.ts`): `ShapeSample` gains the same two fields.
  - `solid()` takes `samplePart(...).normals` and sets `normalTwin = normal`.
  - `crankSampler()` turns both the point and its normal about z by the blade angle, (i mod 3)·120°.
  - `index.ts` passes the sample through.
  - New `gearOutline(pitchRadius, teeth)` (shared by the sampler and the meshing test) and an exported `GEAR_TRAIN` constant (the 18/9-tooth specs used by both).
- `src/math/transform.ts` exports `rotate`.
- `MoteAttrs` gains `normal` and `normalTwin`. `buildMoteAttrs` copies them.
- `layout.ts`:
  - Two new entries, `aNormal` and `aNormalTwin` (vec3 each), for 6 instance attributes in total.
  - The helper field unions are now derived from MoteAttrs with a mapped type: `FieldsOf<number>` and `FieldsOf<Vec3>`. They are no longer hand-written.
- `MoteOut.normal`, computed identically in TS and GLSL:
  1. `nm = mix(normal, normalTwin, variant)`
  2. `n0 = length(nm) < 1e-4 ? normal : nm`
  3. `normalize(rotate(partQuat, n0))`, where `partQuat` is the part-texture quaternion (pose plus exploded offset).
- The GLSL `MoteOut` struct is generated from `PARITY_FIELDS` (`glslMoteOutStruct()` in `src/parity/fields.ts`: size 1 → float, 2–4 → vecN) and spliced into mote.glsl at a new marker. Adding `normal` meant touching only TS `MoteOut` and `PARITY_FIELDS`. The set-equality fence (fields.test) is kept, and a new test checks the struct members and types against PARITY_FIELDS.

### Parity
- The parity shader sources moved to `src/parity/shaders.ts`, which has no WebGL so tests can import it.
- The hash/pcg check now runs in the vertex stage. It is an instanced points draw with input `aHashIn` (seed, salt, pcg input) that writes into the float target. mote.glsl is no longer included in any fragment shader, and a unit test checks this: no production or parity fragment shader contains `pcg(`, `hash01(`, `mote(`, `MoteOut` or `#include`.
- New case `opposite normals at variant 0.5` (drive 0.29). It uses a second geometry in which every mote has `normalTwin = −normal`, so every mote's blend is exactly zero and takes the fallback.
- `normal` is compared through its own pass, with a 1e-3 tolerance like every other field.

### Lighting (`src/scene/lighting.ts`, new)
- `LIGHTING` holds keyDir, keyStrength, fillStrength, rimStrength, backfaceDim, backfaceSoftness, depthDim and depthShrink.
- `depthRange(cameraPos, anchor)` returns near = d − r and far = d + r. Near is clamped ≥ 1e-3 and far > near.
- `lightingUniforms()` and `updateDepthUniforms()` build and update the uniforms.
- `glslLightingUniforms()` generates the GLSL declarations (spliced into instance.glsl), so no literal is duplicated. A test checks that the declared uniforms equal the given uniforms as a set, and that every LIGHTING key plus the two depth uniforms is present.
- Ruling deviation from the brief's interface: `depthNear`/`depthFar` are not constants in LIGHTING. They are computed on the CPU each frame from the camera position and `mechanismAnchors(mech).whole`, inside `moteSystem.update`, as the controller ruled. I added `depthShrink` (the brief's "slightly shrinks size") and `backfaceSoftness`, so the GLSL holds no lighting literal.
- `moteLight(o, view)` in instance.glsl works in view space:
  - The normal is transformed by `mat3(viewMatrix * modelMatrix)`, keyDir by `mat3(viewMatrix)`, and V = −view.
  - It computes `lit = fill + key·max(0, n·L) + rim·(1 − |n·V|)²`.
  - It then multiplies by `mix(backfaceDim, 1, smoothstep(−s, s, n·V))`, a soft step so edge-on walls do not band, and by `mix(1, depthDim, depthFrac)`.
  - The size factor is `1 − depthShrink·depthFrac`.
  - It returns `mix((1, 1), (lit, size), settled)`, so in-flight motes stay unlit glow.
- mote.vert applies both factors; thread.vert applies brightness only. The ghost stays unlit.
- Purity: lighting reads only uniforms derived from state, anchors (memoised and frozen) and the camera. The purity e2e passes.

### Final lighting values (tuned by screenshot)
| constant | start (ruling) | final |
|---|---|---|
| keyDir | normalize(−0.4, 0.7, 0.6) | same |
| keyStrength | 0.75 | **1.2** |
| fillStrength | 0.25 | **0.3** |
| rimStrength | 0.35 | 0.35 |
| backfaceDim | 0.35 | 0.35 |
| backfaceSoftness | (new) | 0.2 (n·V half-width) |
| depthDim | 0.45 | **0.55** |
| depthShrink | 15% | 0.15 |
| depthNear/Far | camera to whole-anchor sphere, d ∓ r | same, per frame |

Why I changed the starting values:
- With 0.75/0.25, a face turned to the camera gets only 0.25 + 0.75·0.6 = 0.7, because the key is 53° off the face normal.
- The ±radius depth range puts the machine mid-fade (depth fraction ≈ 0.56 for the drive gear, ×0.75).
- Together these made the warm drive gear a muddy brown, and the vibe-build machine lost a lot of exposure.
- Key 1.2 and fill 0.3 bring a lit face back to ≈1.0 before the fade, put light-facing walls at ≈1.5, and keep shaded faces at 0.3 for contrast.
- depthDim 0.55 compensates for the sphere overstating the machine's real depth extent.

### Gear meshing regression (Task 4 carry)
- The test rotates the 18- and 9-tooth outlines (from `GEAR_TRAIN`) to their posed centres and angles from `gears.pose(d, ZERO_FAULTS, 0)`, i.e. the real −2× kinematics.
- It sweeps 12 steps over one drive tooth period and counts grid cells (h = 0.004) covered by both outlines, with a tip-circle prefilter.
- Measured with a probe at h = 0.002 and h = 0.0005 over 24 steps:
  - Correct mesh: max overlap 2.6e-5 at both resolutions. This is a real sliver where the drive tip meets the pinion's radial (not undercut) flank.
  - Half-pitch control: min 4.65e-2.
  - For scale, one tooth has area 5.3e-2.
- Asserts: correct < 1e-4; control > 1e-2 at every step. Runtime is about 1 s per test.

### Shots
- `e2e/shots.spec.ts` gains a SHOTS-gated test that writes `shots/mech-<id>-lit-{assembled,exploded-0.75,twin,faults-0.6}.png` for every registered mechanism.
  - The camera is machine-relative three-quarter: pos [1.6, 1.1, 2.4], target 0, fov 40, the same framing as Task 4's shots. `faults-0.6` is at drive 0.3 with all seven faults, drift included.
  - This also covers the Task 4 carry note (Tasks 5–7 needed a committed mech-shot spec). `npm run shots` produces them, and the README line is updated.

## Tests and TDD evidence

RED: `npx vitest run src/mechanisms src/scene src/parity` failed 8 tests and 2 files, as expected:
- contract "unit surface normal" → "Target cannot be null or undefined".
- mote() normal ×3 → "Cannot read properties of undefined".
- gears twin-normal and outward-normal tests → undefined.
- `glslMoteOutStruct is not a function` ×2.
- lighting.test → "Cannot find module './lighting'".
- layout.test → "Cannot find module '../../parity/shaders'".

GREEN:
- `npm run typecheck` is clean.
- `npx vitest run`: 26 files, 235 tests passed (baseline 25/214).

New unit tests:
- Contract: unit normals for both variants, every mechanism.
- Gears:
  - The twin-fan normal is turned by the blade angle; other parts keep normalTwin = normal.
  - Gear-face normals are ±z and the plate's front face is +z.
  - Meshing, plus the half-pitch control.
- mote():
  - The normal is the posed, unit part normal.
  - The variant blend.
  - Opposite normals at 0.5 fall back to the correct normal (finite, not NaN).
- Layout:
  - INSTANCE_ATTRIBUTES (6) plus the largest per-shader extra (2: aCorner, aQuad) ≤ 16.
  - Every assembled vertex shader declares ≤ 16 inputs.
  - No fragment shader carries the mote library.
  - The hash check is a vertex shader.
- fields: the generated MoteOut struct matches PARITY_FIELDS, and the library carries exactly one MoteOut struct.
- lighting:
  - keyDir is unit and as ruled.
  - The strengths and dims are in range.
  - depthRange values, including the camera inside the sphere.
  - Uniforms are declared in GLSL as a set equal to those given.
  - Values and the per-frame depth update.
- moteSystem: motes and threads carry the LIGHTING values, and the depth range follows the camera and the whole anchor across two camera positions.

Parity, with mutation evidence:
- All cases are ≤ 1.0e-5 (hash01 0, pcg 0, opposite normals 2.1e-7).
- With the GLSL fallback removed (`n0 = nm`), the `opposite normals` case returns NaN → Infinity, so the spec fails it. I restored the fallback afterwards.

Looks (`e2e/looks.spec.ts`), new test "lit faces: the machine seen from the key-light side is brighter than from behind":
- It renders the gears from camera [0, 0, 3.1] and from [0, 0, −3.1], and compares summed above-background brightness inside the projected core box.
- Measured: lit 20.1M / 14.1M = 1.42. With the shading neutralised (fill 1, key/rim 0, dims 1, shrink 0), the ratio is 0.994, so the test discriminates lighting rather than framing.
- Threshold: > 1.2.
- Every other looks threshold passes unchanged (warm core, vibed no-amber, ghost, misallocated). None were adjusted.

E2E: `npm run e2e` (final code) → 35 passed, 2 skipped (the SHOTS-gated shots tests), 3.7 min; parity, purity (rewind invariant byte-equal), looks, app, smoke, spikes, reduced-motion all green. `SHOTS=1 npm run shots` → 2 passed (section shots + mech shots).

## What the screenshots show (I looked at each)
Before/after crops: each "before" is the same build with the shading neutralised, which reproduces the pre-task render exactly.

- **Three-quarter, assembled.** It reads clearly more solid.
  - Before, each gear was a uniformly saturated slab: both faces showed through at full brightness and the lightening holes were the only depth cue.
  - Now the near face carries the light and the far face is back-facing and dim (≈0.1 against ≈0.8), so each gear reads as one body.
  - The tooth lands and flank walls that face the upper-left key catch bright highlight streaks, so the teeth read as extruded blocks.
  - On the blue pinion, the upper-left flanks are lit and the lower-right flanks shaded: proper chiaroscuro.
  - The plate's top edge picks up a rim highlight.
  - I see no banding at the back-face transition (3× crop of the pinion) and no halos.
- **Exploded 0.75.** Same reading. The parts separate in depth, and the plate, which is further away, is dimmer than the gears in front of it. The in-flight dust still glows unlit, as intended.
- **Twin.** The coaxial pinion and the 3-blade fan read layered. The fan blades' walls light differently by orientation, which is correct, because the twin normals rotate with the blade.
- **Faults 0.6.** Drift 0.6 dominates: a scattered cloud, as before. Lighting adds little here.
- **Section shots** (`npm run shots`, all 9 taken):
  - Head-on views (spec, vibe-build) gain less, because faces seen square-on get no rim and the shading is subtle.
  - The main visible effect there is lower exposure: the amber drive gear in spec-0.5 and the whole blue machine in vibe-build-0.9 are noticeably dimmer than before.
  - Edges and walls still outline everything, so the machine stays legible.
  - In rewind-0.5, the unlit in-flight dust now outshines the settled gear by more than before. This is pre-existing design (in-flight brightness 1, settled 0.35) amplified by lighting.

## Files changed
- Modified:
  - `src/math/transform.ts`
  - `src/mechanisms/{types.ts,contract.test.ts}`
  - `src/mechanisms/gears/{index.ts,shapes.ts,index.test.ts}`
  - `src/scene/mote/{attributes.ts,layout.ts,layout.test.ts,mote.ts,mote.test.ts,mote.glsl,moteSystem.ts,moteSystem.test.ts,shaderSource.ts}`
  - `src/scene/mote/shaders/{instance.glsl,mote.vert.glsl,thread.vert.glsl}`
  - `src/parity/{fields.ts,fields.test.ts,parity.ts}`
  - `e2e/{looks,parity,shots}.spec.ts`
  - `README.md` (shots line)
- Created: `src/scene/lighting.ts` (+ test) and `src/parity/shaders.ts`.
- Outside the brief's list:
  - `src/parity/*`, `e2e/*` and `moteSystem.ts`: required by the rulings (parity, looks, uniforms).
  - `README.md`: the shots line.

## Concerns
1. **Exposure.**
   - Lighting can only take brightness away from back faces and the far depth, so the machine as a whole is dimmer: the lit core is about 44% of the unlit core's summed brightness in the head-on looks render.
   - I recovered the lit faces by raising the key to 1.2, but the head-on story sections (spec, vibe-build) look darker and the warm core is less punchy.
   - Task 9's polish may want a global exposure, a more frontal key, or a tighter depth range than the whole-anchor sphere (the sphere radius includes the drift bracket and corners, so the machine never reaches near or far).
2. **The crank is still blown out to white.** This is the Task 4 deferred item: weights, plus a lit face on a small part. Lighting does not fix it.
3. **Pinion interference.** The meshing test tolerates the measured 2.6e-5 sliver from the missing undercut. Undercut or profile shift would remove it, and the threshold could then tighten.
4. **The `lit faces` looks test lives in the per-mechanism loop.** It assumes every machine faces +z toward the key light. Tasks 5–7 should keep that convention, or the test will tell them otherwise.
5. **Import direction.** `shaderSource.ts` imports `glslMoteOutStruct` from `src/parity/fields.ts` (scene → parity). That was the ruling: PARITY_FIELDS is the source. fields.ts imports MoteOut as a type only, so there is no runtime cycle.
