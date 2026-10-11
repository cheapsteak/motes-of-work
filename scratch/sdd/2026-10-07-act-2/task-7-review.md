# Act II, Task 7 review: pixels and the phone pass (9a08cb0..ce6e4b8)

Reviewer, read-only. Inputs: task-7-brief.md, task-7-report.md (unverified), design §3.3/§3.5/§3.7/§3.8/§6/§11,
the diff file `review-9a08cb0..ce6e4b8.diff`. Binding constraints: `2026-10-07-act-2/global-constraints.md`.

Focused checks I ran outside the diff, one per named risk:

| Named risk | Check |
|---|---|
| Parity covers the new `share` term | Read `src/parity/parity.ts` `nodeSample()`/`nodeCases()`: attributes come from `nodeInstancedAttributes(set)` (so `aShare` is bound), and the sample takes R0's crack-face and crack-cube builders (share = rest/8) and its off-cube builders (share = rest). Both share values are compared. Both mirrors changed in one commit (6a7c179). |
| Pixel tests: real thresholds or vacuous? | Scratch vitest probe (in my scratchpad, not the repo) that projects each crack cube through the essay's composed camera at the test's progress values: rectangle sizes below. |
| Test 14's wide clause coverage | The same probe: `networkTop` over far, defect, fix and lesson at 201 samples each, split by the test's `wide()` predicate. |
| fx-4 `STILL_MOVING` removed, every stop at rest | `npx vitest run src/autoAdvance/plan.test.ts src/timeline/networkKeys.test.ts src/scene/node`: 6 files, 118 tests passed, no warnings. |
| Pixel-test determinism | `playwright.config.ts`: Chromium is pinned to `--use-angle=swiftshader`, so the GPU and driver are out of the loop. |
| Act I unchanged | Diff: `mote.glsl`/`mote.ts` and the bike's vertex shader are untouched; every keyframe hunk falls in an Act II section (zoom-out@0.9 `stage.motes`, defect, spread, fix). |

Probe results (crack cube's screen rectangle, CSS px² at DPR 1):

| Shot | Phone | Desktop |
|---|---|---|
| C1 at fr-1 (far 0.5), the far half of test 11 | **23** (5 × 4.5 px) | 97 |
| R0 at fr-1 (far 0.5) | 122 | 479 |
| C1 close (defect 0.12) | 13,932 | 60,170 |
| R0 close (trace 0.45) | 21,754 | 92,572 |
| R0 at tr-2 (trace 0.68) | 2,095 | 8,984 |
| R0 fix close-up (fix 0.07) / R1 (fix 0.27) | 4,578 / 5,560 | 19,393 / 23,537 |

Lowest `networkTop` (px) under `wide()`: 388 to 438 on the phone, 324 to 421 on the desktop. Outside `wide()`, at
fx-3 and ls-1 (N18, N20): fix 333 / 247 and lesson 305 / 155, all on screen.

### Spec Compliance
- ❌ Issues found:
  - **Test 11's far half does not measure what §6 test 11 specifies, and for C1 on a phone it is close to
    vacuous** (e2e/network.spec.ts:51-76, 86-97, 110, 129). The design counts changed pixels inside the
    *stack's* screen rectangle. The test counts them inside the *crack cube's* rectangle and drops every pixel
    the whole frame shows warmer. The report and the design's "Tests as built" (design line 852) both call the
    cube rectangle "stricter than the stack's". That holds for the near half (≥ N inside a smaller area), but
    the far half is "≤ 20 inside the area", and a smaller area makes that easier to pass. At fr-1, C1's cube
    rectangle is 23 px² on a phone, so the "≤ 20" limit fails only if 21 of 23 pixels change. R0's is 122 px²,
    and the warm exclusion then removes the pixels where R0's 300 amber person motes land, which by the
    report's own numbers is most of the difference (32 / 74 before the exclusion, 3 / 18 after). The design's
    measure failed (32 / 74 > 20), and the measure was changed until it passed. The design never mentions the
    exclusion of the warm dusting, so it is a change to a §6 test that needs ratification. It is not just an
    implementation detail.
  - Truth gap 4 (fx-3, "Now new work built from them is correct.") is open. The brief allows reporting it
    instead of fixing it, and the report gives three costed options. It is listed here so the controller rules
    on it.
- ⚠️ Cannot verify from diff:
  - Brief item 5 says R0's crack must read "up close (tr-2's close shot, and the fixes)". Test 11 samples R0 only
    at trace 0.45 (N15, under tr-1's second half). Nothing measures tr-2 (trace 0.68) or the fix close-ups.
    Those close-ups moved further out in this task (distance 12, frame 0.75), and the report's stills
    descriptions for fx-1 and fx-2 do not mention the crack. Only the stills can confirm it.
  - Brief item 8 (the phone is dim): the report says it is lifted, not solved, at the end of zoom-out, at ly-1
    and at ls-1's rules. That is the author's call from the stills.
  - That the 3.2× rule dot scale and `NODE_SETTLED_BRIGHTNESS` 0.8 do not blow out the first stack or the halos
    ("without blowing ... out white"). Stills only.
  - The fx-3 reasoning: the brief says "an ember tree still lit elsewhere is fine". The report's reason for
    "cannot" is that the lit tree dominates every frame that keeps the new work in it. The controller should
    judge whether that answers what the brief asked ("new blue work must visibly arrive").
  - The phone-budget numbers are capped by the display refresh (17 ms everywhere), so they say nothing about
    render cost. The report says so. Timing synchronous `render()` + `gl.finish()` loops would have given a
    relative cost, although SwiftShader is still not a phone.
  - "Every stack in a wide shot is smaller than the fade's start" (the halo `NEAR` fade, halo.vert.glsl). My
    rough arithmetic from the probe agrees (a rule at fr-1 has a radius of about 39 px against 58 on a phone,
    about 76 against 135 on a desktop), but no test pins it.

### Strengths
- The mirror pair is clean: `a.share` enters `node()` in node.ts:911 and node.glsl:766 at the same place in the
  product, in one commit. The parity sample exercises both share values. The near gain in node.vert.glsl:1314
  applies the share consistently with `nodeNearGain`, and node.test.ts pins it.
- The share algebra is exact. I checked it: with p = onCube, the expected share is rest·(p/dense + 1 − p) = 1, and
  light per unit area is equal on and off the cube. The glow normalisation therefore holds and other stacks'
  RNG streams are untouched, because each stack seeds its own.
- Purity holds. The halo cap and fade, the dot scale and the near gain read only attributes, textures, camera,
  viewport and pixel ratio. There is no clock or random number.
- The ring fade and the highlight fade live as `RING_OUT`/`HI_OUT` in schedule.ts, and the keyframes are
  fenced to them over the whole fix section (networkKeys.test.ts). The lesson is checked ring-free and
  feed-free. The fx-4 `STILL_MOVING` entry is gone and plan.test passes, so every stop is at rest with no
  exception. §2.11's semantics hold: review 1.2→1.5 changes nothing on screen, and 1.5→2 fades it.
- The fix-onset clearance test (clearance.spec.ts) bisects to the exact instant the grid steps over. It caught a
  real −84 px failure at distance 10. This is a genuine strengthening of the clearance test, and nothing in it
  is weakened: the original grid test and its `> 100` floor are intact, and `fullInk` is extracted unchanged.
- `networkTop` counts off-screen points, which is the right complement to `machineOnScreen`.
- Every Task 6 minor is folded in: `SECOND_HALF_MOVES` and the trailing blank lines are removed, the
  plan.test.ts comment is corrected, `prev` is read from `NET_MOVES.fanOut.to`, `TO_REVIEW_OVER` is named and
  explained, the fix-onset sample is committed, and nearer close-ups were tried and reported.
- Test 12 uses the design's thresholds verbatim, and test 16 is as §6. Under the pinned SwiftShader, tests 11
  and 12 are deterministic.
- The report is unusually honest about where it fell short (fx-3, dimness, no budget tier, test margins).

### Issues

#### Critical
None.

#### Important
1. **Test 11's far half is weakened and close to vacuous** (e2e/network.spec.ts:62, 93, 110, 129; design
   "Tests as built", line 852).
   - The rectangle was switched from the stack's (as the design specifies) to the crack cube's. For the far
     half that is the laxer choice, not the stricter one: C1 on a phone is 23 px² against a limit of 20.
   - The warm-pixel exclusion hides most of R0's far difference.
   - The "stricter" claim in the design note and the report is wrong for the far half.
   - Fix: measure the far half over the stack's rectangle, as §6 specifies, and assert a minimum rectangle
     area so an off-screen or tiny rectangle cannot pass by default. If the warm dusting must be left out, ask
     the controller to ratify that, and either cap the share of pixels excluded or keep the person motes out
     of both frames. Then correct the "stricter" sentence in the design note.

#### Minor
1. **The wide predicate leaves out N18 and N20** (e2e/clearance.spec.ts:105). `wide()` requires the camera
   target within 0.5 of `NET_CENTRE` (0, 10, 0). N18 targets (0, 13, 0) and N20 targets (0, 11, 0), and the
   brief calls both "the wide shots". Both pass today (all their points are on screen, at 247 px and up), so
   this is a gap for future regressions, not a hidden failure. Count those shots as wide too, for example
   with an explicit shot list or a distance-and-elevation test.
2. **The fix-onset test does not check which fixes it covered** (e2e/clearance.spec.ts:211). `checked > 40` is
   met by the sweep alone, so it would not notice C1, R0 or R1 dropping out of full ink. The comment lists
   them: assert their ids are among those checked.
3. **Test 12 counts shapes but does not match them to the twelve** (e2e/network.spec.ts:139). One merged pair
   plus one split stack would still make twelve. The design asks only for the count, but projecting the
   twelve centres and requiring one component near each would make it robust. The margin is tight: the
   smallest phone component is 36 px against a floor of 30. It is deterministic under the pinned SwiftShader,
   but a Chromium or SwiftShader update can flip it. Note that in the test or the design.
4. **Test 11 samples R0 at a different shot than §6 names, and the change is not documented**
   (e2e/network.spec.ts:107). It uses trace 0.45 (N15, tr-1's close shot) instead of "tr-2's close shot",
   and the design's "Tests as built" does not say so. The fix close-ups the brief names for item 5 are not
   measured either (see ⚠️).
5. **The parity reference does not round `share` to float32** (src/parity/parity.ts:392-398). Its comment says
   the attributes are read "as float32 too", but the new `share` field is passed through in double precision,
   which `rest/8` is not exactly. The tolerance absorbs the difference, so this is only an inconsistency with
   the comment.
6. **The "Shots that moved" list omits the `pullOut` waypoint** (docs/specs/2026-10-06-act-2-storyboard-and-network.md,
   §11). `pullOut` moved from bearing 50 / elevation 14 to −20 / 16 (src/timeline/netShots.ts:191). The report
   mentions it; the design does not.
7. **A commit in history holds shots the next commit's test fails.** Intermediate commit e648dca puts the rule
   close-ups at distance 10, frame 0.5, and its message says so. a4232ed's fix-onset test fails that state
   (−84 px on desktop), and c95ef24 reverts it to 12. Folding c95ef24 into e648dca would have kept every
   commit honest.

### Assessment
**Task quality:** Needs fixes

**Reasoning:** The look changes, the shot retunes, the ring and highlight fades, the halo cap and the Task 6
carry-overs are well built, pure and fenced, and parity covers the new term. But the far half of test 11 was
changed from the design's measure until it passed, and for C1 on a phone it is now close to vacuous. It has to
be restored, or the change ratified, before the crack's "invisible from far" claim can be trusted.
