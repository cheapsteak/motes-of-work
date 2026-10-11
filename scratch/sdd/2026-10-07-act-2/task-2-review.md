# Task 2 review: the reflow (ee1f8ac..0eec242)

Reviewer: task-scoped gate. Inputs: task-2-brief.md, design §0–§2.1, §2.10, §2.11, §3.9, §4, §5, §6 test 1, §7 task 2,
§11, task-2-report.md, review-ee1f8ac..0eec242.diff. Binding constraints: this folder's global-constraints.md.

### Spec Compliance
- ✅ Spec compliant. Everything §7 task 2 and the brief's five rulings ask for is in the diff:
  - step 3b in both mirrors
  - the four salts (16–19)
  - the spliced `STACK_*` constants with yawed boxes
  - `uReflow` in moteSystem and parity
  - the parity states `mech.reflow` ∈ {0, 0.4, 1}
  - test 1
  - the zoom-out keys for `mech.reflow`, `drive`, `ink.opacity`, `stage.motes`, `net.show`, `net.growth`, `clock` and the camera S10′ → N1 → N2
  - the six SceneState leaves, `SCENE_STATE_PATHS` and their sync test
  - the five `sceneMotion` leaves
  - `05-zoom-out.md`
  - the storyboard and words fences
  - `netShots.ts` with the N1 and N2 holds pinned

  Every keyed number matches §2.1 and §2.10 (keyframes.json:48, 145–148, 225–228, 288–289, 329–332, 339–340, 365–381). The two departures from §4's snippet are justified and disclosed:
  - `side` is undefined at step 3b, so the implementation uses its own `rside`, which is the chord's side.
  - `uReflow` is clamped.
- ⚠️ Cannot verify from the diff (for the controller):
  - **GPU identity.** The claim that Act I is GPU byte-identical (48/48 canvases) rests on a one-off script that has since been deleted. The screenshot spec is SHOTS-gated (9 skipped), so the e2e run itself compared no stills. Parity, purity and the TS fingerprint do cover the identity indirectly.
  - **The fingerprint.** `7bd9b743` was "pinned before changing mote()". The diff cannot show that. The 1e-6 nudge test does show the fingerprint is not vacuous.
  - **Stops at rest.** The claim that zo-1's and zo-2's stops pass the at-rest check with no new STILL_MOVING entries comes from a test run. I did not re-run it.
  - **§11 ruling 1 is not keyed.** The warm speckle should fade under zo-2. That is outside §7 task 2, and the ledger shows the controller ruled to revisit it in task 7.
  - **Later-task items.** Test 13's purity sample (zoom-out 0.22) and test 14's network clearance belong to task 7.

### Named risks and the focused check behind each
1. **GLSL/TS parity of step 3b.** I read both mirrors line by line (mote.glsl:76–117 and 148–163 and 196–200, against mote.ts:57–101 and 133–157 and 196–203). The following match:
   - the box and face picks
   - the face order (+x, −x, +y, −y, +z, −z)
   - the `6b + f` index
   - the half-size placement
   - the yaw turn
   - the bow (0.8 outward, 0.4 × (h − 0.5) sideways on `SALT_BEZIER_SIDE`, with the same `(1,0,0)` fallback)
   - the cubic `er`
   - the normal mix and its zero fallback

   Loop bounds agree: the GLSL loops `STACK_BOXES − 1` and the TS loops `boxCdf.length`, and both are 5.

   **Focused check:** do the picks really agree bit for bit? `hash01` keeps 24 bits in both mirrors (src/math/hash.ts:17, mote.glsl `hash01`), so the hash is exact in float32. The CDFs are `Math.fround`-ed (stack.ts:37, 47) and spliced with 9 significant digits. reflow.test.ts parses them back to equal STACK. So every `<` comparison agrees.

   **Focused check:** is the yaw convention right? `turned`/`moteStackTurn` is `[x c + z s, y, −x s + z c]`, which equals cluster.ts:79–83 `turn()` and its use in `boxCorners` (cluster.ts:86–96). ✓
2. **`uReflow` = 0 is an exact identity.** The only new work sits inside `if (reflow > 0)` in both mirrors. Outside it, the TS changes `const` to `let` on `rest` and `normal` and nothing else; the GLSL adds dead initialisers. ✓

   **Focused check:** do the other draws that use the library get the uniform? The mote and thread materials share one `live` uniform object (moteSystem.ts:184–191), so threads follow the reflow. The ghost keeps its own 0. The ink shader splices the library but uses only `moteRotate` and `hash01` (inkSystem.ts:48), so an undeclared `uReflow` defaults to 0 and nothing changes there.
3. **The re-pointed tests.** None was weakened in substance.
   - **keyframes "very end":** it now samples `spec@1`, which is the old `p=1` exactly. That is the same frame.
   - **keyframes "everywhere":** it is now scoped to Act I. The invariant (assembly > 0 ⇒ motes ≥ 0.9) is false in zoom-out by design. Act II's dimming is pinned instead by the new "never brightening" test. See Minor 2 on the sample density.
   - **clearance:** the same frame and the same panel, plus a new `reflow 0` assertion. It is stricter than before.
   - **reducedMotion:** **Focused check:** I recomputed `sectionSpans` with the story lengths (7.2, 3.2, 1, 8, 2.2). Old p 0.97 × 19.4 lands at spec local 0.9273. New p 0.871 × 21.6 lands at spec local 0.9267. That is the same built and riding bike, so the comment is correct.
   - **controls "sliders":** it excludes `mech.reflow`, consistent with §5 ("Compare page: Nothing").
4. **Purity.** `mote()`, `moteStackRest` and `moteStackNormal` are pure. `STACK` is built deterministically at load. There is no `Math.random`, no clock and no state in `pose`. The only module-level mutable value is the `essayNetwork` memo (netShots.ts:44–48), which is test and tooling only and is never imported at runtime.
5. **The fence did not lose Act I.** **Focused check:** in the Act I storyboard, §1 and §2 hold 19 beat rows each, under `vb-`/`rv-`/`rw-`/`sp-`. Every §2 row sits under a `### 2.N <section>` block, and "### 2.4 spec — the drawing first" still parses to `spec`. Nothing was dropped.

I also looked at three stills: phone 0.22, phone 0.40 and desktop 0.22. They match the report:
- The 0.22 phone cloud is pale but not blown out.
- The 0.40 stack shows six bricks in three courses, low and well under the band.
- The desktop 0.22 core is near-white, which is the report's concern 2, accepted by the controller.

### Strengths
- **One source of truth for the stack.** The float32 rounding lives in stack.ts, so the GLSL literals and the TS values are the same numbers, and a test parses the spliced library back.
- **Test 1 is strong:**
  - an FNV fingerprint over 3000 motes × 84 golden states, with a non-vacuity nudge
  - an SDF oracle that is independent of the code under test
  - touching faces handled correctly
  - box shares by area, with all 36 faces used
  - every mechanism covered
  - a continuity check
  - a puff check that is derived, not tuned
- **The Act I boundary is guarded deliberately.** The camera hold repeats Act I's pasted keys, and a test pins zoom-out 0–0.02 equal to spec's end. Every new first key equals the track's previous value.
- **The storyboard fence generalises cleanly** to a list of boards, with a coverage-exactly-once test. The words fence is guarded by a "story = Act I + Act II" check, so a new section has to be classified.
- **Commits are publication-safe and logical.** Both mirrors changed in one commit.

### Issues
#### Critical
None.

#### Important
None.

#### Minor
1. **stack.ts:59: `STACK` is not actually frozen.** `Readonly<StackConstants>` is shallow and type-only, so its arrays stay mutable at runtime. The report's "STACK is frozen data" overstates this. Nothing mutates it today. A deep `Object.freeze` would make the claim true.
2. **keyframes.test.ts:378: sampling is thinner.** "Everywhere in Act I" now stops at `i/20000 < zoom-out start`, which is about 18 000 samples of Act I instead of 20 000. Sampling `i/20000 × at('zoom-out', 0)` would keep the old density.
3. **storyboard.test.ts (the `prefixes` filter and `timingBlocks`): the fence is structurally looser.** Two kinds of row are now silently ignored where the old fence would have failed:
   - a §1 copy row whose two-letter prefix no covered timing row uses
   - a §2 beat row outside a `### 2.N <section>` block

   I verified that nothing is dropped for Act I today. Task 4 regeneralises the fence, and it could assert that every row is claimed by some board.
4. **The yaw convention is not fenced.** It now lives in four copies: cluster.ts `turn`, mote.ts `turned`, mote.glsl `moteStackTurn` and reflow.test.ts `turn`. The test's SDF oracle copies cluster's convention rather than importing it or using `boxCorners`. If cluster's convention changed, the mote mirrors and the test would still agree with each other but no longer with the boxes task 3 draws. Exporting `turn`, or checking `moteStackRest` points against `boxCorners`, would close this.
5. **mote.ts step 3b (about :150–155): a style change in the reference.** It uses `[0, 1, 2].map(...) as Vec3`, unlike the component-wise style of the rest of the reference. It allocates per mote in the TS reference, which e2e/machine.ts also runs.
6. **The declarations check is in a different file.** §5's table puts it in `mote.test.ts`, but it lives in reflow.test.ts:223–228. The check itself is complete.

### Assessment
**Task quality:** Approved
**Reasoning:** The two mirrors are the same algorithm, with the same constants and the same yawed boxes, and the picks are exact by construction. Reflow 0 skips every new line, so it is an exact identity. The four re-pointed tests sample the same Act I frames as before, or stricter ones. What remains is minor hardening.
