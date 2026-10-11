# Task 6 review: growth, light, the lamp and the defect on moving bodies (7910cd3..5ff68dc)

Reviewer: task reviewer (opus). Inputs read in order: reviewer-instructions.md, plan-constraints.md,
task-6-brief.md, task-6-report.md, progress.md (from "Task 6: done"), and the full diff in chunks.
Specs: galaxy-orbits §14 and §15, morph-and-scatter. The controller's Task 6 rulings (the lit look,
the pose on a jitter tick, the twelve framing, the close camera, the Task 5 fixes, the interface
additions, quiet streams) are taken as decided and not re-raised.

## Verdicts

- **Spec compliance:** ✅ Spec compliant (the deviations are the ones ruled in progress.md, plus
  two small unlisted ones under Minor).
- **Task quality:** **Needs fixes**: one Important finding. The fix to Task 5's dotted orbits is
  correct but nothing tests it.

## Spec Compliance

✅ Every item in the brief is present:
- `light.*` is extracted without changing behaviour.
- The `bodyMote` mirror pair and `netTrack.ts` are present, with exactly one `Lamp`.
- The new leaves, with their `sceneMotion` and `SCENE_STATE_PATHS` entries.
- `STREAM_BEATS`, the stream constants, `streamGain` and `streamDotU` on the ambient clock.
- `ringAt` on `bodyWorld`.
- The eight galaxy meshes, ghosts, persons, streams and feed (hidden while off), and the flat ring.
- `?lib=body` parity and the five e2e tests.
- The six T6 stills.

Named risks, each checked:

| Risk | Finding |
|---|---|
| Extraction is behaviour-neutral (b419296) | ✅ `node.glsl` changed only in b419296. Its four removed functions moved verbatim to `light.glsl`/`light.ts`. The only changes are that `uFix`/`uHighlight` became arguments behind a three-argument overload, and a local rename. The constants have the same values and are re-split into `glslLightConstants` and `glslNodeConstants`. The palette moved ahead of the node constants, which is order-only. The old network's stream shader was renamed at 100 % similarity (`nodeStream.vert.glsl`, 0 lines changed). `node.ts` re-exports the functions it moved. `parity.ts` does not touch the `node`/`box` cases, so nothing was re-pinned. The node test pins `nodeLibraryGlsl().startsWith(lightLibraryGlsl())` and single declarations. The `mote.frag.glsl` change landed in 3a9a686, not b419296, and is identical for integer `vType` and `vForm` ≤ 3. `network.spec.ts` and `?lib=node`/`?lib=box` are green (see Verification). |
| No double v-scaling | ✅ Every term of `derp()` (derp.ts:189–228, derp.glsl:109–145) already carries `v`. `bodyDerp` multiplies by `lodGain(Derp)` alone (bodyMote.ts:207–218, bodyMote.glsl:119–129). Only the shell, which derp does not produce, takes `v·gain` (bodyMote.ts:372–374, bodyMote.glsl:271–273). So does the mesh morph (body.vert.glsl `axisA.w * (1 - light.x) * sysGain`), once. `scatterS` is a clock and is left unscaled. |
| Per-body seeds | ✅ Shapes, the next shape and the spin axis come from `shellSeed(b.id)` (bodyAttrs.ts `packShellData`). T3.z carries `shellSeed` (24-bit, shell.ts:265, so float32 is exact). Both mirrors hash the motes from T3.z. bodyMote.test.ts:194 rebuilds the expected warp from `moteHashes(shellSeed(c1.id), i)`, which would fail on the shared derp seed. The flight seeds are `moteSeed(shellSeed(id), i)`, 24-bit. |
| One Lamp enum | ✅ Only one is declared (src/timeline/netTrack.ts:14). galaxyShots.ts imports it and its copy is deleted. Off 0, Planet 1, Star 2, Hood 3, Core 4 and Lineage 5 agree with Task 5's. `lampGain` returns 0 outside the lit set at every level: bodyMote.test.ts checks all bodies × 9 (level, focus) cases. The hard edge is checked in pixels at level 1 at both sizes (galaxy.spec.ts "the lamp has a hard edge", with a control). Level 3 lights every body: spec §3.4 says "the neighbourhood: the six systems and the background", and the brief says "the core and every star". |
| Streams invisible when off | ✅ `streamMesh.visible = streams > 0` and `feedMesh.visible = streams > 0 && fa > 0` (bodySystem.ts update), and the shader also hides at `shown` 0. The e2e checks `drawStats().visible` with a streams-1 control. Brightness is `LOOK_GLOW_BRIGHTNESS · streamGain(...)`, and a unit test pins the shader line so no highlight gain multiplies it. The ≤ `STREAM_CAP` bound is tested over u × streams × lamp. Dots use `streamDot(row, i, uAmbient, …)`. `uClock` appears nowhere in the galaxy: grep finds it only in `nodeStream.vert.glsl` (the old network), and stream.test.ts asserts that. |
| Budget | ✅ The seven counts sum to `g.instances.total`, which is ≤ `galaxyBudget` (bodySystem.test.ts). The e2e budget test now opens with streams 1 and review 1.2 and asserts Σ net-* = total ≤ budget, every set named. |
| Purity | ✅ bodySystem keeps `shellAmbient` (a cache of `packShellData(g, ambient)`, itself pure in ambient) and `lastSys`/`lastGlows` (reports rebuilt every frame). There is nothing integrated and no `Math.random` or wall time (grep over bodyMote, bodySystem, stream, bodyAttrs, review, netTrack and light). The ring is `ringAt(review, visits, ambient, data)`. |
| Pinned-moon agreement | ✅ bodyMote.test.ts compares the real `bodyCentre` with the moon's own float64 derp against `pinnedMoon` to 1e-3. The tolerance is justified: `pinnedMoon` turns the local offset at `t + orbitT` and `bodyCentre` at `t`, which is about 4e-4 here, and the rotation about +y commutes, so that is the only difference. I checked ambient.ts:69–83. A second assertion runs the full float32 path (`bodyDerp` from the texture) to 1e-3 + one jitter step, which is ruling (2)'s known tick and carried to Task 12. |
| Parity | ✅ `BODY_PARITY_FIELDS` lists all seven `BodyMoteOut` fields: pos, normal, brightness, visible, settled, hi, warm. The cases are the brief's (C1, its moons and P1 at defect-close states, R0 at its fix, 64 hashed motes) plus C1 building, the fix landing and the stream dots, each at the pose and at 101 s. The tolerance is 5e-4 and the shifted count is bounded. My own mutation was caught (see Verification). |
| Fixed Task 5 bugs | ⚠️ partly. **Tracks turned with the galaxy:** correct. `turnVec` (bodyMote.glsl) is the same rotation as `bodyWorld`'s (orbit.ts:140–144), and track.vert.glsl:35 now applies it. **Untested:** see Important 1. **Glow sprites derped:** correct and tested. The CPU sprite position is now `bodyCentre(bodyDerp(...))` with the same forced-Derp handling as the shader's `sysGain`. Task 5's "halos apart at the probe shots" requires every lit glow pixel to sit inside a reported sprite, and the report says it failed before the fix. |

⚠️ Cannot verify from the diff (for the controller):
- Whether C1 "reads amber among them" at the twelve (galaxy §14.4). On the phone still it reads pale blue-white with faint amber (`BODY_WARM` 0.3 at fix 0.1, a little more as the fix completes). The brief only asks that "a fixed body keeps amber dust", and §14.6 says "the fixed one dark among them", so the spec is internally loose. I leave it to the author with the lit look.
- §15.3's keys test (`net.streams` at each beat's hold) and the lamp-aware clearance (`cylinderTop`) need the keyframes. They belong to later tasks.

## Strengths

- The mirror pair follows the TS step by step, including GLSL semantics: `smoothstep`, `mix`, `moteSinCos` and the float32 texture reads. The parity numbers are tight: ≤ 1e-5 on the close cases and 1.3e-4 on far hashed motes, against a 5e-4 tolerance.
- The extraction is clean. `node.glsl` keeps a three-argument `nodeLight` overload, so no stacks-network caller changed. The splice tests guard both against double declaration and against `light.glsl` reading a constant it does not own.
- The tests check behaviour, not wiring:
  - healthy shells at R to 1e-7 over 50 ambients and three LODs;
  - cracked shells off the sphere only via derp/shellWarp, with an independent hash rebuild;
  - the lamp swept over every body at each level;
  - a hard-edge pixel test with a control;
  - a healthy/cracked pixel diff with twin-masked orbital motion;
  - the stream gradient measured from the twin's projected ends.
- The report's mutation list is honest. It includes a test that did not catch its mutation at first (sub-pixel noise) and was fixed at the cause by centring the dots on their pixels.
- The stream count is unrounded and the last dot fades by presence (stream.ts:75), so a chord that changes with the orbits never pops a dot. This is consistent with spec §15.2, which does not say "round".

## Issues

### Critical

None.

### Important

1. **The Task 5 orbit-track fix has no test** (src/scene/node/shaders/track.vert.glsl:35).
   - The bug escaped Task 5 because every e2e test that draws `net-tracks` runs at ambient 0, where the galaxy's turn is 0. That is still true:
     - `openShot` passes no `?ambient=`;
     - the lamp-edge control that includes `net-tracks` runs at ambient 0;
     - the only test away from ambient 0 that draws tracks is the twelve test, and it counts ember components, which a misplaced track dot does not change.
   - The track dot has no TS twin and no parity case, so reverting the line to `bodyWorld(host) + orbitLocal(...)` would pass every unit, parity and e2e test.
   - The dispatch requires the fix to be tested, and the error was visible (0.45 units on a 9-unit orbit at the pose).
   - Suggested fix: rerun Task 5's "a system held under full detail draws no moon or track mote" (or the lamp-edge control with `net-tracks`) at `AMBIENT_POSE` and 101 s, where the turn is non-zero. Alternatively, add a small TS twin of the track dot and project its dots through the composed camera.

### Minor

1. **An unfenced copy.** `LIT_CORE = 0.75` in src/scene/mote/shaders/mote.frag.glsl:20 is a hand copy of `BODY_LOOK.litCore` (src/scene/node/bodyAttrs.ts:51). The comment there names the link, but no test holds the two together. bodySystem.test.ts "the shaders' copies" fences AGENT, HUMAN, EMBER, EMBER_MIX, RIM and RIM_POW, but not this one. Also, the spliced `LOOK_LIT_CORE` that `glslGalaxyConstants()` generates is unused.
2. **Parity never draws a dark mote** (src/parity/parity.ts:1036–1060). Every `BODY_CASES` mote is inside its case's lit set: Planet on C1 over C1's piece, Star on C1 over P1, Lineage on R0 over R0, and Hood for the hashed set. So the GLSL `lampLit` false branch, and Lineage's rule comparison on a non-core row, are never compared. Level 1's false branch is covered in pixels. The false branches at levels 2, 4 and 5 have no GLSL check. Suggested fix: a 64-hashed case under `Lamp.Planet` on C1 and one under `Lamp.Lineage` on P1.
3. **The last stream dot can lack an instance.**
   - The renderer's instance count is `streamDots` = `Math.round(maxChord / STREAM_PITCH)` (src/galaxy/generate.ts:184).
   - The shader's count is unrounded: dot i is drawn at `clamp(n − i, 0, 1)` (src/scene/node/stream.ts:76).
   - When the longest chord's `n` has a fractional part below 0.5, the partly-present last dot (index `floor(n)`) has no instance, so it is never drawn. `Math.ceil` would match.
   - Separately, the unrounded count departs from the brief's `round(chord / 1.2)`. The spec allows it and the code comment explains it, but the report's deviation list does not mention it.
4. **Literal salts.** src/scene/node/bodyAttrs.ts:107, 129 and 130 hash a mote seed with literal salts: `hash01(seed, 0)` and `hash01(seed, 1)`. The salts registry rule is "a numeric literal is a fork". salts.test.ts only scans the mote, instance and light files, so it does not see these. There is no correlation today: the spread uses SALT 20–22 on the same seed. Name them in `SALT`.
5. **A duplicated hash and a hard-coded cap.** src/scene/node/bodyMote.ts:370 inlines `moteHashes` (shell.ts:134) instead of calling it. The test that independently rebuilds the warp (bodyMote.test.ts:195) hard-codes the cap `0.4` rather than `SCATTER_AMP[0] + SCATTER_AMP[1]`.
6. **The stream gradient rests on one stream.** "streams are quiet when shown" passes with one compared stream per size (e2e/galaxy.spec.ts:587). P_a's own streams crowd at the star and are skipped, so the parent ≥ 3× child assertion can rest on a single stream. It meets the brief, but a second stream (for example the core's stream to P_a, whose ends are apart) would make it robust.

## Verification

Every run was on a clean tree at 5ff68dc unless noted.
- `npx tsc --noEmit -p .`: exit 0, no output.
- `npx vitest run`: 82 files and 1761 tests passed in 122 s. The log has no warnings.
- `E2E_PORT=4199 npx playwright test e2e/galaxy.spec.ts e2e/parity.spec.ts e2e/network.spec.ts`: 46 passed in 7.6 min, 0 failed and 0 flaky. This includes the old network's `network.spec.ts`, `?lib=node`, `?lib=box` and the new `?lib=body`. The only noise is the webServer's Vite `configLoader` warnings about extensionless imports in vite.config.ts and src/story, which predate this task. Nothing was left listening on 4199 afterwards.
- **My mutation:**
  - The edit: in src/scene/node/bodyMote.glsl:312, the GLSL mirror only, `kind == KIND_MOON ? BODY_WARM_MOON : BODY_WARM` became `BODY_WARM : BODY_WARM`, so a fixed moon was tinted like a planet. This targets the `warm` field, which the report's mutations did not touch.
  - The run: `E2E_PORT=4199 npx playwright test e2e/parity.spec.ts -g bodyMote` failed on "body: C1 and its moons, the fix landing at the pose" with maxError 0.2222 against the 5e-4 tolerance (light.fix ≈ 0.74 × 0.3).
  - The undo: the exact inverse `sed`. Afterwards `git status --short` is empty and `git diff` has 0 lines.
  - The permission layer refused nothing.
- Stills (phone, `shots/galaxy/T6-*-390x844.png`) were looked at with Read. They match the report:
  - `twelve`: three ember star discs and nine ember points; C1 reads pale blue.
  - `close-pose`: C1 low-left, a burst ghost disc inside it, moons on dotted tracks.
  - `close-fixed`: round and calm, amber moons.
  - `hood-lit`: ember stars and points among blue.
  - `system-streams`: near-indistinguishable from `nostreams`, as ruled.
- No helper scripts were needed, so none were created in shots/. Logs went to the session scratchpad.
- Focused checks outside the diff, one per named risk:
  - `derp.ts`/`derp.glsl`: v on every term (double v-scaling).
  - `shell.ts` `shellSeed`/`moteHashes`: 24-bit per-body seed.
  - `orbit.ts` `bodyWorld`: the turn's sense, for the track fix.
  - `ambient.ts` `pinnedMoon`: the agreement test's tolerance.
  - `generate.ts` `streamDots`: the instance count against the unrounded shader count.
  - e2e/galaxy.spec.ts's existing tests: which tests draw tracks at which ambient, and the halos test.
  - Greps for `uClock`, `enum Lamp`, `LIT_CORE` and `Math.random`.

## Assessment

**Task quality:** Needs fixes
**Reasoning:** The model, the mirrors, the lamp, the streams and the extraction are correct and well tested, and every named risk holds. The one gap: a named Task 5 fix (the dotted orbits turned with the galaxy) is shader-only, and no test runs it at an ambient where it matters, so it could regress silently. Adding one test at a non-zero ambient closes it.
