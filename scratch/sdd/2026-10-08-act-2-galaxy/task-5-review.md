# Task 5 review: the galaxy drawn by level of detail (behind `?galaxy=1`)

Range f253337..6f243e5 (f3edb64, a532be0, 6f243e5). Reviewer: task reviewer (opus). Read-only, except for one mutation, which was reverted.

**Spec compliance:** ❌. One requirement is missed: the large icosphere has 180 triangles, not 320.
**Task quality:** Needs fixes. There is one Important finding, and it is a one-character fix. The rest are Minor.

## Verification run

- `npx tsc --noEmit -p .`: clean (exit 0).
- `npx vitest run`: 80 files, 1,697 passed. This matches the report.
- `E2E_PORT=4199 npx playwright test e2e/galaxy.spec.ts e2e/parity.spec.ts`: 19 passed in 2.2 min.
  - The log carries the existing vite-config and chunk-size build warnings and nothing new.
- **Mutation of my own choosing:**
  - The edit: in `src/scene/node/lod.glsl:16`, `max(GLOW_MIN_PX, GLOW_SCALE…` became `max(GLOW_MIN_PX - 0.001, GLOW_SCALE…`. It moves glowPx's floor clamp by 0.001 px. I picked it to prove that the grid reaches the 5 px floor, not just the cap.
  - The result: `?lib=lod` failed with `lod: glowPx` maxError 9.999e-4 against 1e-5.
  - I reverted it with the exact inverse `sed`, and `git status --short` was empty afterwards.
- **Two more mutations were denied by the permission layer**, so I did not run them:
  - the glow shader ignoring `uGlowCap`, to test "halos apart";
  - star.vert dropping `× uPixelRatio`, to test "caps at DPR 3".
  The findings on those two tests below are reasoned from the code and the measured numbers. No run backs them.
- **Stills.** I looked at T5-galaxy-wide, T5-hood, T5-system, T5-twelve and T5-close at 390×844. Regenerating them was also denied (it would overwrite them), so see ⚠️.

## Spec Compliance

- ❌ **Issues found:** net-bodies' large icosphere is `IcosahedronGeometry(1, 2)`, which has 180 triangles. The brief requires 320 (spec §3.4), and that needs detail 3. See Important 1.
- **Everything else in the brief is present and matches.** The only departures are the ones the controller already ruled on: detailPx, glowCaps, desktop levels asserted on the phone only, CrackFace 5, quads, the origin argument, the test hooks, the dynamic shots import, and net-* without Task 6's sets.
  - `LodElement`, `LOD_BANDS`, `lodGain`, `systemPx`, `glowPx` (re-exported, not redefined), `PX`, `HAZE_GAIN` and `Viewport`.
  - `GalaxySystem`, `BodySystem` (with `lod()`) and `GALAXY_SHOTS`, whose six shots carry §14.5's values; `close` is `HERO_CLOSE.C1`.
  - The meshes `net-shells`, `net-bodies`, `net-glow` and `net-tracks`: 90 dots per orbit and 40 per moon track in use, placed by `orbitLocal` at their own true anomaly and gated by `lodGain(Track)`.
  - `uSysPx` on the CPU each frame.
  - The glow profile in mote.frag form 3.
  - The haze only when the camera is more than 300 from the core.
  - `?lib=lod` with its parity test, `e2e/galaxy.spec.ts`, `e2e/stills.spec.ts`, and the `stills` script.
- ⚠️ **Cannot verify from the diff:**
  - **The stills may be older than HEAD.** They are dated 07:26, and 6f243e5 was committed at 07:54. That commit holds the `?shot=` wiring in main.ts, so the stills came from a working tree that I cannot prove equals HEAD. I could not regenerate them. The controller's push gate (`npm run e2e`) does not run the stills spec, since it is SHOTS-only.
  - **The full 163-test e2e count** in the report. I ran only the two specs named in the dispatch.

### Named risks, one check each

- **Default page untouched: ✅.**
  - main.ts now imports these modules statically: `galaxy/background`, `galaxy/generate`, `scene/galaxy/galaxySystem`, `scene/node/bodyData`, `scene/node/bodySystem` and `scene/node/orbit`.
  - I traced their imports, and none reaches `src/galaxy/ambient.ts`. Outside tests, its only importer is `galaxyShots.ts`, which main.ts loads with a dynamic `import()` only when `shotName !== null`.
  - In the built bundle, the freeze-pin search (the string "has no moon slot") is only in `dist/assets/galaxyShots-*.js`, and main's static chunk imports do not include it.
  - New module-level work on the default page amounts to `ARM_PHASE` (one log) and the `WITH_GALAXY` string splice.
  - **In draw():**
    - `motes.object.visible = true` and `ink.object.visible = true` are no-ops, because neither group's visibility is set anywhere else.
    - `galaxyBackground` and `bodies` are null.
    - The far plane stays at 400.
- **Test hooks gated: ✅.**
  - `shotName = testMode && galaxyMode ? …` (main.ts).
  - `lod`, `glows`, `forceLod` and `isolate` live only on `window.__motes`, inside `if (testMode)`.
  - `uLodForce` stays at −1 otherwise.
  - `?galaxy=1` works alone.
- **Caps in CSS px × DPR: ✅ in the code, but the test is weak (Minor 1).**
  - star.vert: `clamp(uSizeWorld·pxPerUnit/uPixelRatio, min, max) × uPixelRatio`.
  - shell.vert `emit` and track.vert multiply by `uPixelRatio` once, after a CSS-px clamp.
  - The glow's `focal` is CSS px, `0.5·uViewport.y·P[1][1]/uPixelRatio`. That matches the CPU's `0.5·(h/ratio)·P[5]`, and both use Euclidean distance.
- **Budget and counts: ✅.**
  - Unit and e2e both check net-shells = Σ latticeCount = `instances.shells`, net-tracks = 90·planets + 40·tracks, and net-glow = stars + 6.
  - net-bodies = `instances.bodies − ghosts`.
  - Σ net-* + persons + ghosts + streams = total ≤ `galaxyBudget`.
  - The e2e's exact `toEqual` over the `net-*` keys fails as soon as Task 6 adds a mesh, so Task 6 cannot overshoot silently.
- **detailPx and glowCaps are pure: ✅.**
  - Both are computed fresh each frame from that frame's projections.
  - `lastSys` and `lastGlows` are read back only by the hooks.
  - `shellAmbient` is a cache keyed on the ambient.
  - There is nothing integrated and no `Math.random`.
- **Do the e2e tests see rendered output?** Partly; see Minor 2 and 3.
  - "levels" reads only the CPU's own numbers.
  - "halos apart" adds a real pixel containment check, but its slack is larger than the margin at the galaxy wide.
- **Parity: ✅.**
  - `lodGain` is sampled every 0.25 px over 0–140 for all 5 elements. That lands exactly on 10, 20, 25, 50, 60 and 120.
  - `glowPx` covers the floor, the slope and both caps, plus a cap below the floor (2.5), which is how glowCaps uses it.
  - My floor mutation was caught.
- **Resize: ✅.**
  - There is no size-dependent state; the viewport and projections are read every frame.
  - galaxySystem `dispose()` frees all 4 geometries and 4 materials.
  - bodySystem `dispose()` frees 5 geometries (including the shared sphere source), 3 materials (glow shares the shell material) and both textures.
  - The resize e2e passes at both sizes.

## Strengths

- **The default page is genuinely isolated.** The bundle confirms that the freeze-pin search stays in the dynamic chunk.
- **The mirror pair is held to its source.** The constants are spliced: `GLOW_SCALE` and `GLOW_MIN_PX` were lifted out of body.ts, with no change in behaviour, so lod.glsl cannot drift. The parity grid is designed to hit every band edge and every clamp regime, and a 0.001 px change fails it.
- **detailPx is continuous.** It keeps "at most two" without pops, and its unit test walks a system overtaking another in 0.01 px steps.
- **The budget is tied to the generator set by set**, with Task 6's sets named, so the next task's overshoot is a test failure.
- **CrackFace is renumbered everywhere it is used.** The users are all symbolic: node.glsl reads `ROLE_CRACK_FACE`, and nodeAttrs, node.ts and parity use the enum, so the old network's parity stays green.
- **The halo test does not only restate the CPU.** Its isolate-and-mask half checks that every lit pixel of net-glow lies inside a reported sprite.

## Issues

### Critical

None.

### Important

1. **The large icosphere has 180 triangles, not 320** (`src/scene/node/bodySystem.ts:101`).
   - `new IcosahedronGeometry(1, 2)` gives 20·(2+1)² = 180 triangles. In three r186, detail 1 gives 80 (checked), and the brief's 320 needs detail 3.
   - The brief requires "icospheres with 320 tris for the core, stars and planets"; spec §3.4 says "star 320 tris, planet 320".
   - Two comments state 320 and are therefore wrong: `bodySystem.ts:99` and `shaders/body.vert.glsl:6`. So does the report ("320 and 80 triangles").
   - Visually the rims are coarser than specified, and the triangle budget the spec plans for (~26k tris) is not what is drawn.
   - **Fix:** detail 3. A one-line unit assertion, for example `position.count / 3` per part is `[320, 80]`, would pin it.

### Minor

1. **The DPR-3 test cannot tell a missing `× uPixelRatio`** (`e2e/galaxy.spec.ts:232-249`; `src/main.ts:189`).
   - The renderer caps its pixel ratio at 2, so at `deviceScaleFactor` 3 the shaders run with `uPixelRatio` 2 and the browser upscales the canvas 1.5× into the screenshot.
   - **The bright-star check is an upper bound only (≤ 11).** Correct sizing gives 3·2 = 6 buffer px, or about 9 device px after the upscale. If the multiply were dropped, the star would be 3 buffer px, about 4.5 device px. Both pass.
   - **The dust lower bound (≥ 3) is marginal.** A 1-buffer-px dot after a 1.5× bilinear upscale, at mask threshold 0, can already reach 3 px.
   - **Each check measures only one component**, the brightest.
   - The code is right (star.vert:29, shell.vert `emit`, track.vert). The test just doesn't guard it.
   - **Suggested fix:** also bound the bright sprite from below (≥ about 2·3 device px), or add a DPR 2 case where screenshot px = buffer px. Not verified by mutation, which was denied.
2. **"Three levels" restates the CPU, and capped systems are never checked in the pixels** (`e2e/galaxy.spec.ts:108-131, 134-150`; `src/scene/node/bodySystem.ts:230`).
   - `levels[2] ≤ FULL_DETAIL_MAX` reads `lod()`, which is `lastSys`, the output of `detailPx`. So it holds by construction at every shot.
   - The pixel test, "no moon or track mote where s_px < 60", runs only at shots where every *raw* size is already under 60, where detailPx changes nothing.
   - So nothing rendered checks that a system held at 59.9 (system, twelve, desktop hood) draws no moons or tracks. If `sysPx.set(lastSys)` were changed to upload the raw sizes, every e2e would still pass.
   - The brief does prescribe `lod().levels`, and the wiring is one line, so this is Minor.
   - **Suggested fix:** a byte-equal check like the "no moon" one at `system` or `twelve`. Force Moon and Track to 0 with only the held systems on screen, or compare net-tracks pixels against the discs of the ≤ 2 systems `lod()` reports as full.
3. **"Halos apart": the pixel half's slack is larger than the margin at the galaxy wide** (`e2e/galaxy.spec.ts:162-177`).
   - A lit pixel may lie up to `r + 1.5` px from a sprite's centre. The glow profile is under the mask threshold (4/255) for r ≳ 0.8 of the sprite radius.
   - At the phone galaxy wide (R_a–R0 5.2 px apart, capped radii summing to 4.68) the CPU leaves 0.52 px of clearance. The pixel bound would let rendered fringes overlap by up to about 3 px there.
   - It does catch gross regressions. At the phone close shot, a shader that ignored `uGlowCap` would light pixels about 4 px outside the reported disc.
   - So rendered "halos apart" is proven only where the deficit is large. Tightening the slack to 0.5–1 px, with the mask threshold set to match the profile, would close it.
4. **The size of `uLodForce` is a literal `5`** in three shaders: `body.vert.glsl:18`, `shell.vert.glsl:26` and `track.vert.glsl:17`. `LOD_BANDS[5]` is generated from `LodElement`. Adding an element would leave `force[el]` past the uniform's end. The size could be emitted from `glslLodConstants` as `LOD_COUNT`.
5. **Shader copies are unfenced, and one comment points at the wrong test.**
   - star.vert's `AGENT`, `WARM` and `WARM_MIX` (`star.vert.glsl:23-25`) are literal copies that no test holds. Only body.frag's AGENT is fenced (`bodySystem.test.ts`).
   - `star.frag.glsl:5` says galaxySystem.test.ts holds the profile together. It is bodySystem.test.ts.
6. **Moon tracks are deduped by float equality on `orbit.r`** (`bodyAttrs.ts:114`). The generator gives every moon its `track` index (`generate.ts:418`). Keying on `m.track` says what is meant, and does not depend on two tracks never sharing a radius.
7. **A planet's lattice mote 0 is repurposed as its 2 px point** (`shell.vert.glsl:80`, `bodyAttrs.ts` buildShellAttrs). Once its shell is shown, that lattice site is never drawn as a shell mote, so every planet bubble is missing one site. This was done to keep `shells = Σ latticeCount`. It is acceptable, but the shell.vert header should say so.
8. **`GalaxyShot.lamp` uses unnamed codes** (`galaxyShots.ts:44, 46`). §14.5's lamps "core" and "the three systems and the core" become `4` and `5`, with no enum or comment, and Task 6 has to decode them. A small `Lamp` enum or a doc line would do.
9. **One field changes meaning** (`bodySystem.ts:235`). `{ ...c, cap, d: glowPx(…) }` overwrites the projection's `d` (distance) with a diameter, and glowCaps then reads `d` as a diameter. It is correct, but easy to misread; `diam` would be clearer.

## Stills (phone first), against §14.5's intent

- **T5-galaxy-wide-390x844.** "The bright core, two arms."
  - The spiral reads, with a faint haze at the core and crisp blue points.
  - The core is dim rather than "bright".
  - The picture sits in the lower ~55 % of the frame, with the top ~40 % empty.
  - Framing and brightness are already carried to Tasks 7 and 13.
- **T5-hood-390x844.** "The stars around the core."
  - It is a field of about 30 lattice-bubble stars with planet points and small bubbles.
  - The six core bodies are grouped at the left.
  - There are no rings or moons, as star-and-planets should have. It reads as intended.
- **T5-system-390x844.** "One plan's system whole."
  - P_a is a bright bubble with concentric dotted orbits and N0's moons below it.
  - A second full-detail system shows at the top right. That is the cap's second slot.
  - The orbits are faint (carried).
- **T5-twelve-390x844.**
  - Two of P1–P3 show their rings, low in the frame, with one cut off at the bottom left. The third is held below full.
  - Spec intent ("three stars and nine planets") is only partly met. That is the ruled cost of the cap plus world-anchored framing (Task 7).
- **T5-close-390x844.**
  - C1 is a large crisp lattice sphere with six lumpy moon clusters and faint tracks.
  - A row of far bubbles lies across the top, plus one large neighbour at the top right. Nothing is blown out.
  - Lumpy moons and the text band are carried to Tasks 6, 7 and 13.

## Assessment

**Spec compliance:** ❌. One requirement is missed: the 320-triangle icosphere (Important 1).

**Task quality:** Needs fixes.

**Reasoning:**
- The renderer is careful and the named risks hold:
  - The default page is isolated; the bundle proves it.
  - The hooks are gated.
  - DPR is handled correctly.
  - The counts are tied to the generator.
  - Parity catches a 0.001 px change.
- But the large icosphere is 180 triangles against the brief's 320, and comments and the report claim otherwise.
- The fix is one character (detail 3), plus an assertion.
- The Minors are mostly test-strength gaps. The DPR, levels and halo tests prove less in the rendered output than their names suggest. They are worth taking now under the repo's "fix it now" rule, but none blocks.

Findings: Critical 0 · Important 1 · Minor 9.
