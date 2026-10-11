# Act II, Task 7 report: pixels and the phone pass

Status: **DONE_WITH_CONCERNS**. Base 9a08cb0. Commits on main, not pushed:

- 6a7c179 node: the network reads on a phone: dense rule cracks, larger motes up the layers, halos held to a core
- e648dca timeline: the twelve stand apart, R1 forms under up-1, the rules framed whole, the ring goes
- c95ef24 timeline: the rule close-ups stand at 12, framed three quarters close
- a4232ed e2e: the network in pixels: the crack near and far, the twelve, the budget, every fix and wide top
- ce6e4b8 design: Act II as built through the pixels pass

Each commit ends with the session trailer the dispatch's harness gave (`Claude-Session: …`). No names in
copy, code, comments or messages.

## What changed, by the brief's items

### Truth gaps

| # | Line | What I did | Closed? |
|---|---|---|---|
| 1 | ly-2 "At the top, the rules every agent reads before it starts." | Motes drawn larger up the layers (`NODE_DOT_SCALE_*` 1.5 / 2.2 / 3.2 for code / plan / rule, birth.ts, spliced; node.vert.glsl scales by the stack's layer), landed motes brighter (`NODE_SETTLED_BRIGHTNESS` 0.5 → 0.8). From afar a mote is clamped to one pixel either way, so wide shots are unchanged in shape. | **Yes.** Phone ly-2: two rules read as brick stacks (R0's striped courses left, R_b right), mid-frame under the text. |
| 2 | up-1 "… Now the defect is in the rules too." | Growth reaches R1's birth at spread 0.1 (new key; design had it at 0.2 on the straight 0.36 → 0.42 run), highlight 0.25 → 0.30 over 0.1–0.2 (was 0.30–0.38). The follow already arrives over R1 by 0.21. | **Yes.** Phone up-1 at 0.2: R1 forming, ember, mid-frame, the up-stream rising into it. Test: R1 forming (10–100 % built) and lit at up-1's midpoint. |
| 3 | tr-2 "… one incorrect rule." | Halo held to a core (below). The surge's flash is the one halo term that does not fade with size, so R0 (hi + surge from highlight 0.92) keeps a white-hot core while the near plans' highlight halos fade; R0's motes are larger and brighter. | **Yes.** Phone tr-2: R0 is one large ember stack with a white core mid-frame; the lit plans are smaller ember discs at the bottom edge. |
| 4 | fx-3 "Now new work built from them is correct." | Searched (below); no shot under the clearance test picks the new work out. N18 left as Task 6 built it. | **No.** See "Copy and design proposals". |
| 5 | R0's crack up close | A rule hero's (R0, R1) crack cube is sampled `CRACK_DENSITY` = 8 times denser than the rest of its stack; each of its motes carries 1/8 of the light (a new per-mote `share` attribute, applied in node.ts and node.glsl together and in node.vert's near gain), so from afar the cube is no brighter. R0's crack cube goes from about 420 motes to about 2,500 (about 500 on the lips). | **Yes.** Phone tr-1b: the two lips are a bright jagged split through R0's top cube. Test 11 below. |

### Look problems

6. **Halos huge up close.** halo.vert.glsl: radius capped at 0.15 of the screen's shorter side (was 120 CSS px:
   58 px on a phone, 135 on a desktop); the far glow and the highlight fade as the stack's radius grows from 0.15
   to 0.35 of that side; the surge's flash does not fade (it singles R0 out under tr-2) and only the cap holds it.
   Wordless (spread 0.51): one small neighbour halo at the edge, no fog. Trace close-ups: none.
7. **The twelve as ten shapes.** Two levers, both needed: N9 moved to bearing −30, elevation 20, distance 66
   (from bearing 50 the three lit plans stand one behind another); a lit halo is tighter and fuller (radius 1.0 ×
   the stack's, alpha 1.0; was 1.2 and 0.6) so each lit code stack has a core over test 12's thresholds. The
   pullOut waypoint moved to bearing −20, elevation 16 to suit. Test 12: 12 components on both sizes.
8. **Dim on a phone.** The dot scale and the landed brightness above; the first stack ends zoom-out at
   `stage.motes` 0.05 (was 0.03) to match. Medium shots (ly-1 … ly-4) now show stacks, not dust, but the end of
   zoom-out and ly-1 are still mostly dark frames with a few stacks (see concerns).
9. **A rule's body off the bottom.** N15′ and N17: distance 12, frame 0.75 (was 12, 1). The rule is whole on a
   phone (lowest corner 37 px above the bottom for R0, 31 for R1). Tried nearer: at 11 the warm motes cross the
   desktop band by 2 px at the fix's onset, at 10 by 79 (frame 0.5) to 25 (frame 1). So 12 stays.
10. **The ring.** `net.review` 1.2 held to fix 0.68, then 2 at 0.96 (`RING_OUT` in schedule.ts, keyframes fenced
    to it): it fades with the sweep, after fx-4 is up, so every stop stays at rest; gone through the lesson.

### Carried from the Task 6 review

- `SECOND_HALF_MOVES` and the trailing blank lines removed from netShots.ts.
- plan.test.ts comment: the control uses a different motion.
- `prev = 0.68` is read from `NET_MOVES.fanOut.to`; `0.47619048` is `TO_REVIEW_OVER = 0.2 / 0.42`, documented
  (regenerated keys are identical).
- The fix-onset clearance sample is committed: a new clearance test bisects, for every fix that lands under a
  line, the instant its warm motes all count as landed (`net.fix = fixAt − NODE_FIX_WINDOW / 2`) and checks it
  and 0.001 after. It caught the d 10 attempt on desktop (−84 px), which the page grid stepped over.
- fx-4: the highlight's last fade is fix 0.90–0.96 (`HI_OUT`, was 0.98); the `fx-4: ['network']`
  `STILL_MOVING` entry is gone and every stop is at rest.

## Tests added

- **11** (e2e/network.spec.ts): at the close shot (C1 at defect 0.12, R0 at trace 0.45) and at fr-1 (far 0.5),
  frames with `net.fix` 0 and 1, the highlight held at 0 in both (a fix also puts a lit stack's light out),
  counted inside the **crack cube's** rectangle, leaving out pixels that turned warmer. **Corrected in fix
  round 1:** I called the cube's rectangle "stricter than the stack's"; that is true only of the near half.
  For the far half ("at most 20") a smaller rectangle is the laxer choice (C1's cube is 23 px² on a phone), and
  the warm exclusion was a change to a §6 test that needed ratifying. Fix round 1 restores the stack's
  rectangle and narrows the exclusion (below). The numbers in this paragraph are superseded by fix round 1's.
- **12**: df-5 at 0.89, canvas only: component areas phone [112, 116, 43, 37, 36, 40, 45, 44, 58, 56, 46, 43],
  desktop [416, 397, 354, 162, 141, 154, 164, 173, 182, 175, 177, 169]. Twelve on both.
- **14, second clause** (clearance.spec.ts): on every sample whose camera targets `net`, `networkTop` (new in
  e2e/machine.ts; points above the screen counted) is at least the band + 8. Not vacuous (> 20 samples).
  It already held before my changes (my harness: worst wide-top margins +131 desktop, +208 phone).
- **16**: lesson 0.9 `drawStats()`: net-nodes 75,877 ≤ `NETWORK_BUDGET` 76,000; motes 100,000.
- Unit: the dense crack cube (density about 8×, light per area equal, total light per mote 1, near gain brings
  both shares to a plain mote), the dot scale read from the spliced constants, the layout (six attributes,
  seventeen components, a float attribute read whole), R1 forming and lit at up-1's midpoint, the ring's fade
  against `RING_OUT` (presence 1 at 0.68, 0 from 0.96 and through the lesson, feed 0), the highlight's fade
  against `HI_OUT`.

TDD, honestly: the look changes and keys came first, judged by stills and the search harness; the tests came
with or after them. RED that did happen: the pixel tests failed against the base look (test 12: 6 components
phone, 6 desktop; test 11 R0 far: 32 / 74 with the plain changed-pixel count), the fix-onset clearance test
failed at d 10 (−84 px desktop), the layout tests failed on the new attribute, and the first build with the
float attribute failed to compile (`aShare.x`; the generator now reads a scalar whole).

## Results

- `npx tsc --noEmit -p .`: clean.
- `npx vitest run`: 67 files, 1,523 tests passed.
- Full e2e (`E2E_PORT=4199 npx playwright test`, dist rebuilt first, on the final commit): **141 passed, 9
  skipped (the SHOTS-gated shot spec), 0 failed** (24.6 min): parity in both modes, purity, pages,
  auto-advance, reduced motion, clearance with its two new checks, and the new network spec.
  The run before the last shot fix: 140 passed, 9 skipped (SHOTS-gated), 1 failed (the new fix-onset test,
  desktop, R0 at d 10, the failure that made me move the close-ups back to 12); after the fix
  `clearance.spec.ts` + `network.spec.ts`: 14 passed.

## Phone budget

No device tier exists in the code (only `?n=`). Measured in the e2e browser (SwiftShader), forcing a redraw by a
resize event and waiting on `gl.finish()`, 10 frames each:

| Size | Frame | Budget | Median | Min |
|---|---|---|---|---|
| 390×844 | lesson 0.9 | full (100k + 75,877) | 17 ms | 14 ms |
| 390×844 | lesson 0.9 | `?n=30000` (30k + 22,528) | 17 ms | 15 ms |
| 390×844 | df-5 wide | full | 17 ms | 14 ms |
| 390×844 | df-5 wide | `?n=30000` | 17 ms | 14 ms |
| 1440×900 | both | both | 17 ms | 14–17 ms |

Every number is the display refresh: the measure cannot see the render's cost here, at either size or budget.
The numbers do not say a tier is needed, so I added none. They cannot say one is not: a phone draws the
desktop's 176k instances. A real-device measurement should decide; the lever is `networkBudget` and `?n=`.

## Shots searched (temporary harness, deleted)

- N9: separation of the twelve's projected cores by bearing (−80 … 80) at elevations 10–18, then test 12's own
  count rendered at 13 candidates. Twelve on both sizes only at (−70, 20, 66) and (−30, 20, 66); I took −30
  (the nearer swing from the pull-out and to the follow).
- Rule close-ups: 100 candidates (distance 8–12, elevation 20/26, frame 0–1) for R0 and R1, measuring the
  body's lowest corner and the clearance at the fix onset.
- fx-3: 384 wide candidates round P7 / Q3 / R0 / R1, 168 + 96 close candidates on P7 and its code; every close
  shot fails clearance (the code layer fills the band when looked down on); every wide one that keeps the new
  work in frame has the old lit tree covering about 13–14 % of a phone's frame and dominating it.

Clearance after all changes (my harness, step 0.005, worst per page, px): unchanged from Task 6 except defect
p2 +208 / +131 (was +212 / +139), spread p1 +189 / +55 (was +243 / +162; R1 now forms earlier, in frame), fix p1
+143 / +27.

## Stills (`shots/act2-look/`, gitignored), phone first; `phone-sheet.png` is the phone contact sheet

`?test=1&mech=bike&p=` at each beat's middle plus the two wordless moments and a few extra frames, full budget,
with the text. Earlier iterations are in `shots/act2-look/iter/` (`before/` is the base build).

| Still (phone) | Line | What the frame shows | True? |
|---|---|---|---|
| zo-1 0.25 | Now let's zoom out. | The bike's motes gathered into the first stack, bright, centre. | Yes |
| zo-2 0.75 | You want a hundred things built, and the agents build all day. | The first stack, dimmer; speckle of new stacks round it, streams. | Yes, sparse |
| zo-end 0.98 | (same, fading) | The first stack and a few small stacks; mostly dark. | Weak |
| ly-1 0.08 | Each piece of work is built from what its agent reads. | The first stack, B1/B2 forming beside it, a stream of dots coming down from above. | Yes, dim |
| ly-2 0.26 | At the top, the rules every agent reads before it starts. | Two rules as brick stacks mid-frame. | Yes (was faint speckle) |
| ly-3 0.46 | In the middle, the plans … | Rules above, plans' stacks in the middle, code halos below. | Yes |
| ly-4 0.64 | At the bottom, the code … | The first stack close, code stacks round it. | Yes |
| ly-5 0.86 | Rules shape plans, and plans shape code. | Three bands, streams between. | Yes |
| fr-1 0.5 | From far away, everything looks right. | The whole network, all blue. | Yes |
| df-1 0.12 | Come closer … one piece of code has a defect. | C1 close, the bright split in its top cube. | Yes |
| df-2 0.35 | Up close, you can see it. So you fix it. | Amber motes falling onto C1. | Yes |
| df-3 0.52 | Now step back. | The whole network from the new bearing, all blue but C1's dusting. | Yes |
| df-4 0.68 | … carries it too. | Lighting from P1 down: plans and code ember. | Yes |
| df-5 0.89 | Twelve new defects. You fixed one. | Three ember plans in a row, nine ember code stacks below; C1 dark. Twelve shapes. | Yes (was ten) |
| up-1 0.2 | … Now the defect is in the rules too. | R1 forming, ember, mid-frame, the up-stream rising into it; lit code low. | Yes (was no rule) |
| up-1b 0.36 | (same) | R1 larger, ember. | Yes |
| wordless 0.51 | — | C5 close, ember, warm motes landing; one small neighbour halo at the edge. | — (fog gone) |
| up-2 0.81 | You cannot fix them one at a time as fast as they are made. | The lit tree grown, wide. | Yes |
| re-1/2/3 | The reviewer … | The ring on stacks lit and not; re-3's feed still faint. | Yes; re-3 weak (as Task 6) |
| tr-1 0.18 | Follow the defects back up. | Climbing over lit stacks and the ring. | Yes |
| tr-1b 0.45 | They all lead to one place at the top … | R0's top cube close, split by a bright jagged crack. | Yes (crack was invisible) |
| tr-2 0.68 | … one incorrect rule. | R0 large and ember with a white core, alone at the top; lit plans smaller below. | Yes (was equal blobs) |
| surge 0.80 | — | The surge spreading below R0. | — |
| fx-1 0.07 | Fix the rule. | R0 ember, warm motes falling. | Yes |
| fx-1b 0.14 | (same) | R0 whole, blue, its crack cube dusted warm, the whole rule on screen. | Yes |
| fx-2 0.27 / fx-2b 0.38 | And fix the rule an agent wrote … | R1 lit, then whole and dusted, whole on screen. | Yes (body was off the bottom) |
| fx-3 0.51 | Now new work built from them is correct. | Both rules blue at the top; the old lit tree a large ember cluster lower left; blue right. New stacks are there but not picked out. | **No** |
| fx-4 0.81 | Then trace everything … | Mid-sweep: fewer ember stacks; the ring fading. | Yes |
| ls-1 0.5 | The higher up a thing sits, the longer you look at it. | From above: a field of blue code, plans, the rules faint at the top; no ring. | Mostly; rules weak |

Desktop (1440×900), checked after: the same story at a larger scale. Rules read as stacks at ly-2 and ly-3;
the twelve are twelve; tr-2's R0 is singled out; R0 and R1's fix close-ups are crops of the rule's top
(a desktop is closer at the same keys; the rule's foot is below the frame there, as it was).

## Copy and design proposals for the author (no words changed)

1. **fx-3** cannot be made true by picture under the clearance test: the old ember tree is still lit (the sweep
   is fx-4's) and it is larger than the handful of new stacks in every frame that keeps both rules and the new
   work in it. Options: (a) copy, minimal: "Now new work built from them is correct, but what they made before is
   not." (14 words); (b) design: let the highlight dim the old tree to a low glow under fx-3 and come back up for
   fx-4's trace (one key pair, costs the purity of "lit until fixed"); (c) swap the order of fx-3's and fx-4's
   ideas so the sweep comes first.
2. None needed elsewhere.

## Self-review

- Mirror pair: node.ts and node.glsl changed only together (the share), in one commit; parity e2e passed in the
  full run before the last shot change (the shot change touched neither). R0's dense motes are in the parity
  sample (it takes R0's crack-face and crack-cube motes).
- Purity: everything added is a function of the attributes, textures, scalars and camera; no clock.
- `NODE_SETTLED_BRIGHTNESS` changed in birth.ts, so both mirrors read it; tests read the constant.
- Halo constants are local to halo.vert.glsl, as the existing ones were; the pixel tests cover them.
- Temporary scripts (shots/*.pw.ts, *.probe.ts, measure.ts, panels.json, configs) deleted; no background
  processes of mine left. The preview server on 4199 was there before me and is left running.

## Concerns

1. **fx-3 is not true on screen** (proposal above).
2. **Test 12 is tight on a phone:** the smallest core is 36 px against the 30 px floor, and only two bearings
   gave twelve on both sizes. A look change to halos or the lit code's motes can break it; that is its job.
3. **Test 11's far R0 count is 18 against 20 on desktop.**
4. **Medium-range frames are still dark** at the end of zoom-out and ly-1, and the rules are only fair at ls-1:
   lifted, not solved. Further levers: more motes for plain stacks (budget), or the far glow kept on longer for
   sparse stacks.
5. **No phone tier**: the test browser cannot measure it (above).
6. **N9 is a large departure** (bearing −30, elevation 20, distance 66 against 50, 14, 60), taken for test 12.
7. **The dense crack cube reads a little brighter than its neighbours up close** once the near gain lifts every
   mote to full brightness (fx-1b, fx-2b: the mended cube stands out). I think it helps ("where the person
   looked"), but it is a look the design did not ask for.

## Fix round 1

Review: task-7-review.md. Ruling: test 11 on the stack's rectangle with a minimum area; the warm exclusion only
as a documented, tight carve-out, both counts reported; far ≤ 20 on the carved count; correct the "stricter"
claim; add the near half at tr-2's close shot on R0; take the one-line Minors.

### Important: test 11 (taken)

- **The stack's rectangle**, as §6 says, for both halves (`stackRect`: every box corner of the stack through
  the essay's composed camera, floor/ceil, clipped to the canvas).
- **The far half cannot be vacuous:** the rectangle must be at least 100 px of the PNG and the cracked frame must
  draw at least 20 px inside it. At fr-1: C1 120 px phone / 408 desktop (112 / 303 drawn), R0 1,610 / 6,392
  (615 / 1,399 drawn).
- **The carve-out, tight and documented** (`changes()` in e2e/network.spec.ts, and the design's "Tests as built"):
  a changed pixel is left out only if its change has amber's channel order: red rising, and red's rise at least
  green's, green's at least blue's. The person's motes are amber (#FFB347), not ember; they are screen-blended
  over the stack, which can only raise each channel, red most and blue least, so this is exactly "the fix's warm
  motes arriving" and nothing else. I did not use "similar luminance": screen-blended light always raises
  luminance, so that clause would carve out nothing. An agent-blue mote moving in (blue rises most), one moving
  out (every channel falls) and the lips' brighter faces going ordinary (every channel falls) all count. I dumped
  every changed far pixel before choosing it: R0's far changes are almost all amber-ordered rises; the rest are
  blue moves.
- **Both counts in every assertion's message:** "N changed without the warm dusting, M with it, D drawn of A px".
- **Near shots now:** C1 at df-1 (defect 0.12); R0 at **tr-2's close shot**, computed in the test as the middle of
  the N15 hold (from the climb's end to the fan-out's start, `NET_MOVES`) while tr-2 is fully up (its `data-at`
  plus the fade, read from the page): trace 0.4747; R0 at its fix close-up (the middle of the N15′ hold, fix 0.12);
  R1 at its fix close-up (the middle of the N17 hold, fix 0.33). Far: C1 and R0 at fr-1 (R1 is not born there).
  A note: trace 0.45 (the old sample) was already under tr-2, whose page is up from 0.36; the review read it as
  tr-1's. The test now derives the time from the page and the moves.
- **Counts** (carved / all; limits: near ≥ 400 phone, ≥ 900 desktop on the carved count; far ≤ 20 on the carved count):

| Stack, shot | Phone | Desktop |
|---|---|---|
| C1 near, defect 0.12 | 7,290 / 8,713 | 12,915 / 15,179 |
| R0 near, tr-2's close shot (trace 0.4747) | 13,030 / 15,125 | 24,159 / 28,033 |
| R0 near, fix close-up (fix 0.12) | 3,405 / 4,446 | 12,780 / 14,841 |
| R1 near, fix close-up (fix 0.33) | 3,114 / 4,327 | 9,063 / 11,846 |
| C1 far, fr-1 | 0 / 0 | 0 / 0 |
| R0 far, fr-1 | **3** / 32 | **19** / 74 |

The honest measure passes, so nothing was tuned. R0's far count on desktop is 19 against 20: a renderer or look
change to R0 will trip it, which is the point of it. If you want margin, the lever is the crack's far
visibility (the lips' ×1.3 face gain could fade with the stack's size on screen), not the test.

- **"Stricter" corrected** in the design's "Tests as built" note and above in this report.

### Minors

| # | Minor | Taken? |
|---|---|---|
| 1 | Wide predicate leaves out N18 and N20 | **Taken:** `wide()` also matches N18's and N20's targets (`WIDE_TARGETS`). Both pass. |
| 2 | Fix-onset test does not check which fixes it covered | **Taken:** it asserts C1's, R0's and R1's fixes are among those checked. |
| 3 | Test 12 counts shapes but does not match them to the twelve | **Left** (not a one-liner); the tightness (36 px against 30) is now noted in the design's "Tests as built". |
| 4 | Test 11's R0 shot undocumented | **Taken** with the Important fix (above, and the design note). |
| 5 | Parity reference does not round `share` to float32 | **Taken:** `share: f32(a.share)` in parity.ts. |
| 6 | The design's moved-shots list omits `pullOut` | **Taken:** added under N9. |
| 7 | e648dca holds shots a later test fails | **Left:** rewriting local history is not mine to do without a ruling; c95ef24 fixes the state. |

### Results

- `npx tsc --noEmit -p .`: clean.
- `npx vitest run`: 67 files, 1,523 passed.
- Full e2e (dist rebuilt, `E2E_PORT=4199 npx playwright test`): **143 passed, 9 skipped (SHOTS-gated), 0 failed** (25.2 min).

Commit: d609556 e2e: test 11 over the stack, as designed, with the warm dusting a stated carve-out
