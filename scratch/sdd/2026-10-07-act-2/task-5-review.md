# Task 5 review: keyframes, first half (layers, far, defect)

Diff 58ebddd..89b86f5 (three commits: 82a834e, 3d4ba99, 89b86f5). Read-only review. I read the diff file once and ran two scratch checks outside the repo; both are listed under "Focused checks".

### Spec Compliance
- ✅ Spec compliant. The deviations from the design are each one the clearance test forced or the controller accepted (the page-turn moves), and the report names each one: N5, N6 and N8 moved; the dive moved out of df-1 into the far → defect page turn; the orbit ends at far 0.92; the dive's waypoint is 15 above C1, not 6.
  - **Scalars match §2.2–§2.4 and §2.10 key for key.**
    - `net.growth`: 0.135 / 0.165 / 0.19 / 0.21 / 0.23 / 0.27 / 0.30 / 0.32 / 0.335 / 0.345 / 0.36, all linear.
    - `clock`: +1.3 × L per section.
    - `net.fix`: 0 → 0.10 over defect 0.27–0.40.
    - `net.highlight`: 0 → 0.25 over defect 0.60–0.76.
    - Source: keyframes.json, the `net.growth`, `clock`, `net.fix` and `net.highlight` hunks.
  - **Ruling "no highlight before the defect is found":** the first highlight key is defect@0.6 = 0. networkKeys.test.ts asserts 0 over [0, defect 0.6] at 6000 samples.
  - **Ruling 1 (warm speckle fades under zo-2):** done with keys alone: `provenance.vibed` 0 → 1 over zoom-out 0.5–0.9, held after.
  - **Stops:** no `STILL_MOVING` entries were added. plan.test.ts:211, "is at rest at every stop", is unchanged.
- ⚠️ Cannot verify from the diff:
  - **The feel of the five page-turn moves in motion.** This is the author's call. The controller accepted the approach provisionally.
  - **Design §11 "As built" has no Task 5 entry yet.** Missing: the N5, N6 and N8 shots, the page-turn moves, the orbit ending at 0.92, the dive moved out of df-1, the diveOver height, and the N2 → N3 halt below. The controller should decide whether the design should record these now or at Task 7.
  - **The commits carry no trailer.** The report says the dispatch gave none. Global constraints require "the trailer line given in your dispatch".
  - **The clearance numbers come from the implementer's own harness**, which was deleted. Only the e2e pass, 126 passed / 0 failed, is reported evidence.

### Strengths
- **Test 4 keys against the schedule.** Keyed against `src/network/schedule.ts` (`G_TWELVE`, `HI_TWELVE`, `FIX_TWELVE`, `TWELVE`) and the network's own `fixAt`, `hiAt` and `born`, not copied numbers. It samples every 0.002 local from df-5's `at` (stricter than "fully up") to 1, both ends included, 111 samples, with a non-vacuity count. It goes through `nodeLight`, the shader's twin, and it also checks that C1 and R0 are dark and that the next cracked birth is above `G_TWELVE[1]`.
- **Test 5 (this half) asserts what the design says:**
  - growth and fix never decrease over the whole essay (8000 samples);
  - highlight reaches `HI_TWELVE` at 0.76, before df-5's `at`, and holds to the section's end;
  - fix holds at `FIX_TWELVE`, and C5's fix has not set out.
- **Generated moves.** They are pasted, and the regeneration test (netShots.test.ts:167) finds every regenerated key by its exact `at` string in all three camera tracks. It holds each to 1e-3 and requires every key to be linear. A change to the story's timing changes the `at` strings and fails the test, which is the right coupling.
- **The speckle test is real.** keyframes.test.ts, "fades the first stack's warm speckle…":
  - it runs `mote()` over 3000 motes at three locals, with and without the key;
  - it shows `pos`, `visible`, `brightness` and `settled` identical, and the warm count falling to 0.
  - Act I is untouched: the vibed track's Act I keys are unchanged, and the new keys interpolate 0 → 0 from rewind@1 to zoom-out@0.5.
- **The clearance test was not touched.** `e2e/clearance.spec.ts` and `e2e/machine.ts` are not in the diff stat. I confirmed that the full-ink-only window the report describes is pre-existing (clearance.spec.ts:121-126).
- **The boundary-continuity change is not a weakening.** keyframes.test.ts:52 changes eps from 1e-7 to 1e-9 with the 1e-4 jump threshold unchanged, so any real discontinuity still fails. Only a fast continuous move is no longer misread as a jump.
- **Purity holds.**
  - Runtime code is unchanged. Only keyframes.json changed.
  - `netShots.ts` is imported by no non-test module (grep).
  - There is no `Math.random`, no clock, and no new runtime dependency.
- The report is unusually candid: the failed paths with their numbers, the TDD order admitted, and the stale preview server flagged.

### Issues

#### Critical
None.

#### Important
1. **Verbatim duplication of the spline block.**
   - `splineShot` (src/timeline/netShots.ts:242-275) repeats `lapShot`'s body (src/timeline/shots.ts:187-214) line for line: the phantom-end extension, the centripetal knots, the eased segment search and the Barry–Goldman pyramid. Only the channel and `cameraAt` helpers differ in units, and those are already separate functions.
   - `EASE` (netShots.ts:217-220) repeats `EASINGS.inOutCubic` and `EASINGS.outCubic` from src/timeline/easing.ts:11-12, character for character.
   - The rubric counts verbatim duplication of a logic block as Important. The report's own concern 9 declines to fix it. Its reason, that the two differ in units, does not apply to the shared part.
   - **Fix:**
     - Extract one centripetal Catmull–Rom over channel vectors, taking `cameraAt` and the eased waypoint parameters, and have `lapShot` and `splineShot` call it.
     - Import `EASINGS` instead of redefining the two eases.
     - The lap's and the moves' regeneration tests then pin the shared code from both sides.

#### Minor
1. **Page-turn stops have no margin before the change.**
   - The plain stops sit `STOP_MARGIN_SCREENS` (0.01 screens) before any change of text or motion. The five `PAGE_TURN_MOVES` stops sit within one planner sample (0.001 screens, under 1 px on a phone) of the camera leaving at outCubic's peak speed (3× the move's mean) and the page starting to fade.
   - The new test (plan.test.ts:185) checks that the text is whole at the stop and that the camera leaves within the rest window. It does not check any margin after the stop.
   - The practical cost is small: about a pixel of overshoot moves the camera by roughly 1° of view on the rise.
   - **But two things are now overloaded:**
     - `ends: 'motion'` now means two things: wait for a motion (vb-4), and stop just before one.
     - The planner's header in src/autoAdvance/plan.ts says the stop "waits for it", which no longer describes these five.
   - **Either** start each page-turn move a margin after the fade start, **or** document the second meaning in plan.ts.
2. **Move times are rounded copies of page-fade boundaries, not derived from the story.**
   - The literals in netShots.ts:334-397 (`0.4392`, `0.4808`, `0.0208`, `0.9375`, `0.14`/`0.18`, …) are rounded fade boundaries. 0.4392 is 3e-5 local after df-2's true fade start of 0.439167.
   - The copy is `draft: true`, so a re-timed page would silently misalign a move with its page turn. Only the planner pin and the e2e clearance run would notice, partially.
   - **Fix:** derive `from`/`to` and the waypoint `t` values from `pageOut` and `fadeWidth`, or add a unit test that each page-turn move's `from` equals its page's fade start and its waypoint equals the next page's `in + fade`.
3. **Test 4 filters its candidate set** (src/timeline/networkKeys.test.ts:124).
   - `n.hiAt !== null && n.fixAt !== null` drops nodes from the candidate set before counting the lit ones. The design asks for the set over all nodes, and the renderer maps a null to `NODE_NEVER`.
   - I checked the essay network: no node has `hiAt` set with `fixAt` null, so nothing is masked today. A future generator change would be masked.
   - **Fix:** use `n.fixAt ?? NODE_NEVER` and `n.hiAt ?? NODE_NEVER`, as nodeData.ts does.
4. **The regeneration test is one-directional** (netShots.test.ts:167). It proves every generated key is in the file but not that the file has no extra camera keys inside a move's span. A stray hand key between two generated keys would pass.
5. **Test 8's dive clause** ("stays ≥ 2 above the middle layer's slab until it is past it") is met by two checks:
   - **A path check:** sphere clearance of 2 units from every born plan and rule, on both rigs, over every move (netShots.test.ts:219).
   - **A point check:** the diveOver waypoint stands at least 2 above the highest plan top (netShots.test.ts:229).
   - This interpretation is reasonable, and I verified it numerically. But the second test's name says the dive and the pull-out "pass 2 units above every plan", while it only checks the waypoint.
   - Code stacks are excluded from the path check. My scratch check found no fly-through anyway (details below), so including code stacks other than the target would be cheap insurance.
6. **N2 → N3 halts at the zoom-out/layers boundary.** The zoom-out@1 key arrives inOutCubic and layers 0–0.06 leaves inOutCubic, so the camera's speed is 0 at the boundary. §2.1 says zo-2's move continues into the next section's first move. The `HOLDS` comment that tracked this was deleted rather than resolved (netShots.test.ts diff, `HOLDS`). Harmless under a page turn, but it is a quiet deviation.
7. **`starts each move from the shot held before it…`** compares only distance (1 dp) and elevation (0 dp). The `HOLDS` test carries the real weight, so this test adds little.

### Focused checks (outside the diff; one per named risk)
- **Camera through code stacks.** Risk: the clearance test in netShots.test.ts skips code stacks, so a page-turn move could fly through one. Check: a scratch vitest, outside the repo, of the minimum gap from the camera to every born code stack's bounding sphere over all seven moves, both rigs, 2000 samples each.
  - Result: rise 4.59, toPlans 22.6, drop 2.55, pullBack 2.56, orbit 48.8.
  - dive and pullOut: 1.72, and only to C1, at the N8 close shot itself.
  - No fly-through.
- **Test 4's candidate filter.** Risk: the filter hides a lit node. Check: count of nodes with `hiAt` set and `fixAt` null in `essayNetwork()`. Result: 0.
- **Planner semantics.** Risk: the new `ends: 'motion'` stops weaken the stop rule. I read `autoStops` (plan.ts:180-204). The latest at-rest point found by searching down from the next text is the instant the move leaves. The general at-rest test is unchanged and still covers these five stops.
- **Clearance window.** Risk: e2e/clearance.spec.ts was loosened. Check: it is not in the diff, and lines 121-126 show the full-ink window was already there.
- **`provenance.vibed` consumers.** Risk: the key changes something besides colour. Check: grep. Its only consumers are `mote.ts`/`mote.glsl` (scenario select), the parity states and the compare tool. Nothing else in Act II reads it.
- **Stills.** All 22 files exist in `shots/act2-keys-1/`. I viewed ly-2 and df-1 on the phone:
  - **ly-2:** almost empty, with faint speckle low in the frame. The report's "weakly shown" is fair; this is Task 7's look.
  - **df-1:** the crack reads plainly.

### Assessment
**Task quality:** Needs fixes
**Reasoning:** The keys, the rulings and the named-risk tests do what the design asks, and they are keyed against the schedule. The page-turn moves are implemented consistently and verified clear of the stacks. But `splineShot` and `EASE` are verbatim copies of `lapShot`'s spline and `easing.ts`'s eases. That is an Important duplication, and it should be extracted before the second half adds five more generated moves on top of it.
