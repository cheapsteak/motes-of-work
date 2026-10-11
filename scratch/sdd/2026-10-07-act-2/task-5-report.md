# Act II, Task 5 report: keyframes, first half (layers, far, defect)

Status: **DONE_WITH_CONCERNS**. Base 58ebddd. Three commits on main, not pushed:

- 82a834e timeline: the first stack's warm speckle fades to the agents' colour under zo-2
- 3d4ba99 timeline: the network's clocks through layers, far and defect
- 89b86f5 timeline: layers, far and defect shot, each band crossing carried by a page turn

No session trailer: the dispatch gave none, and the harness's suggested trailer carries a product name (as Task 4 found).

## The finding, and what I did with it

The brief asked for a first move into layers that brings the upper layers into frame without any stack crossing the text band, and suggested three paths: rise first, swing wide, or bridge the cut. I searched the first two numerically. **No rise path passes.** So every band crossing in these three sections is carried by a page turn ("bridge the cut").

**Why the geometry rules out the other two.** On a phone the band is a thin strip, about 6° of the view, at the top of the frame. Layers: 26.2° to 32° above the camera's line of sight. Defect, close: 25.6° to 34.4°. The frame is only ±13° wide.
- A stack that starts above the frame and ends inside it has to cross that strip, unless it comes in through a side.
- With the upper layers spread round N0's axis, every rise I tried sends some plan or rule down through the strip.
- The same holds in reverse: every drop sends the rules up and out through it, and so does every dive. Every pull-back brings them in through it.

**What the clearance test does not check.** It samples only each page's full-ink stretch, from `in + fade` to `out − fade`. The 0.2 screens of a page turn (the fade-out, then the next page's fade-in) are never checked.

**The rule I applied to every band-crossing move:**
- It leaves as its page starts to fade.
- Its spline passes a waypoint at the moment the next page is fully up. By then the crossing is over: the camera is either above every stack and looking nearly level, or low with every plan and rule above the frame.
- It then eases home under the next line.

**Two details of how the moves run:**
- **Ease.** The moves use outCubic: they leave at speed and arrive at rest. That keeps the stop before each move at rest up to the instant it goes.
- **Timing at the ends.** The orbit in far now ends at 0.92 and holds, so the dive can leave from rest at 0.9375.

## Shots as built against the design

Distances are world units. Unless the row says otherwise, the target is as in the design.

| Shot | Design (§2.2-§2.4) | As built | Why |
|---|---|---|---|
| N2 → N3 | layers 0-0.06, inOutCubic | as design | passes |
| N3 (ly-1) | centroid(N0, B1, B2), bearing 30, elev 15, d 10, fov 38 | as design; holds 0.06-0.14 | passes, +347 px phone |
| N3 → N4 (the rise) | 0.16-0.26, inOutCubic | 0.14-0.26, outCubic spline through `rise` at 0.18 | every rise crosses the band (search below) |
| `rise` (waypoint) | — | (0,14,0), bearing 33, elev 12, d 18 | above every stack, nearly level |
| N4 (ly-2) | (0,14,0), bearing 35, elev 10, d 22 | as design; holds 0.26-0.36 | passes |
| N4 → N5 | 0.36-0.46, inOutCubic | as design (spline, inOutCubic) | both ends are above every stack, so no page turn is needed |
| N5 (ly-3) | (0,7,0), bearing 30, **elev 12, d 18** | **elev 18, d 32**; holds 0.46-0.54 | the design's shot puts the rules in the desktop band (−130 px); +100 px as built |
| N5 → N6 (the drop) | 0.56-0.64 | 0.54-0.64, outCubic through `drop` at 0.58 | the rules and plans leave through the band |
| `drop` (waypoint) | — | (2,0.5,2), bearing 50, elev 24, d 6 | any distance ≥ 7 fails on the phone (plans, −110 px) |
| N6 (ly-4) | (2,0.5,2), **bearing 25, elev 14, d 16** | **bearing 60, elev 24, d 6**; holds 0.64-0.70 | from further out the plans overhead sit in the phone's band |
| N6 → N7 (the pull-back) | 0.72-0.92 | 0.70-0.92, outCubic through `pullBack` at 0.74 | the upper layers come in through the band |
| `pullBack` (waypoint) | — | net, **bearing −20**, elev 12, d 40 | at bearing 30-75 the camera flies through plan-7 (born under ly-4) |
| N7 (ly-5) | net, bearing 30, elev 12, d 60 | as design; holds 0.92 on | passes |
| Orbit N7 → N7′ | far 0-1, twelve keys | **far 0-0.92**, twelve keys, inOutCubic; holds to 0.9375 | so the dive can leave from rest |
| N7′ | net, bearing 70, elev 16, d 62 | as design | passes |
| Dive N7′ → N8 | defect 0.04-0.22, through a point 6 above C1 | **far 0.9375 → defect 0.0208** (the page turn between the sections), outCubic, through `diveOver` at t 0.6 | every dive crosses the band; under df-1 there is no page turn to carry it |
| `diveOver` (waypoint) | 6 above C1 | C1's crack cube, bearing −10, elev 70, d 16 (15 above it) | lower or steeper passes within 0.3-1.8 of R0 or P3 |
| N8 (df-1, df-2) | C1's crack cube, **bearing −20, elev 18**, d 2.6, fov 36, frame 1 | **bearing −10, elev 16**; holds 0.0208-0.4392 | the design's shot puts plan-5 in the phone's band (−96 px); +115 px as built |
| N8 → N9 (the pull-out) | 0.46-0.58, the dive's way back | 0.4392-0.58, outCubic: N8 → `diveOver` → `pullOut` at 0.4808 → N9 | the uppers come in through the band |
| `pullOut` (waypoint) | — | net, bearing 50, elev 14, d 40 | above every stack |
| N9 (df-3 to df-5) | net, bearing 50, elev 14, d 60 | as design; holds 0.58-1 (the twelve, the stop) | passes |

`camera.frame` is keyed by hand. It is 0 to far 0.9375, then 1 at defect 0.0208 (outCubic) and held, then 0 at 0.4808 (outCubic).

A fov key of 40 at zoom-out@1 keeps N2 exact at the boundary; before it, the fov ran on toward N3's 38.

**Clearance as shipped** (my harness, step 0.005, worst margin per page, px):

| Section | Phone | Desktop |
|---|---|---|
| zoom-out | +283 | +268 |
| layers, pages 1-5 | +347, +338, +237, +262, +318 | +321, +316, +101, +142, +276 |
| far | +352 | +319 |
| defect, pages 1-2 | +214, +212 | +31 (C1's falling warm motes, 0.355), +139 |

**Nearest approach of the camera to a plan or rule along each move**, on either rig (distance to the stack's centre, less its radius):

| Move | Nearest approach | Stack |
|---|---|---|
| Rise | 2.84 | R_b |
| N4 → N5 | 8.87 | |
| Drop | 3.08 | |
| Pull-back | 2.14 | plan-7 |
| Orbit | 5.43 | |
| Dive | 4.02 | R0 |
| Pull-out | 2.21 | P3 |

## Failed camera paths, and by how much

All margins are px against the panel's bottom + 8; negative fails. They were measured with the clearance test's own counting (`e2e/machine.ts`'s landed motes and cube corners through the composed camera), attributed per stack, with the panel bottoms read from the page. Layers' panel bottom is 103 px on the phone and 122 px on desktop; defect's is 185 px and 213 px.

**The design as drawn** (straight keys between the shots, the orbit and the dive generated):

| Page | Phone | Desktop | What crosses |
|---|---|---|---|
| layers p2, the rise | −111 | −130 | R0, R_b, plan-1 |
| layers p3, N5 held | +53 | −130 | rules |
| layers p4, the drop and N6 | −110 | −130 | R_a, R_b, R0 |
| layers p5, the pull-back | −111 | −130 | R0, R_a, R_b, plan-7 |
| far | +354 | +323 | passes |
| defect p1, the dive (and N8 held on the phone) | −191 | −221 | R_c, R0, P1, P2, code; plan-5 −96 at N8 |
| defect p2, the pull-out | −193 | −221 | R0, P1, P2 |

**The rise search.** 180 spline paths from N3 through one waypoint to N4 over 0.16-0.26, plus the straight design path: 181 in all. **All 181 fail.**
- **The waypoint grid:** target (0, y, 0) with y ∈ {4, 9, 14}; elevation ∈ {−30, 0, 30, 60, 85}; distance ∈ {6, 12, 24}; bearing ∈ {30, 120, 210, 300}.
- **Rise first** (steep elevation 60-85, then back off):
  - best −73 phone / −94 desktop (y 14, elev 85, d 6, bearing 30); plan-1 and plan-4 still cross;
  - elevation −30 (looking up), best −129.
- **Swing wide** (bearing swung 90°, 180° or 270° away), best by bearing:
  - 120: −129 (R0)
  - 210: −125 (plan-1, P_a)
  - 300: −127 (plan-1, P1)
- **The straight design path:** −111 phone / −130 desktop.

**Bridging tried before settling:**
- **The dive as a fast move to d 7 in the page turn, then a push-in to N8 under df-1:** −193 on the phone (P1, plan-6 and plan-4 cross during the push). Rejected; the whole dive goes in the page turn.
- **The drop's waypoint**, swept over bearing {40, 50, 60} × elevation {24, 28, 32} × distance {6, 7, 8, 10}: every distance ≥ 7 fails on the phone (−110, plans). Distance 6 passes (+18 to +156).
- **The held shots**, swept the same way (both sizes, three samples each):
  - N8: bearing −10 / elevation 16 / distance 2.6 gives +115; bearings 150-180 (from behind) give +400, but light the crack's back face.
  - N5: the design shot fails on desktop; elevation 18 / distance 32 passes at any bearing tried, +96 to +106.
  - N6: distance ≥ 12 fails; distance 6 passes.

## Rulings

- **No highlight before the defect is found:**
  - `net.highlight` is 0 until defect 0.60, then rises linearly to `HI_TWELVE` at 0.76 and holds.
  - A test checks that it is 0 over the whole essay up to defect 0.60.
- **The warm speckle fades under zo-2, with keys alone.** `provenance.vibed` goes 0 → 1 over zoom-out 0.50-0.90 (linear) and is held. Act I is untouched: its last key was 0 at rewind@1, and the new keys start at zoom-out 0.5.
  - **Why it works:** the vibed scenario gives every mote the agent type. Its visibility is the specced one (`attributes.ts`: `visible: [!extra, !extra, …]`), and `mote()` uses the scenario for nothing else. So the motes switch colour one by one, by hash, and none moves or hides.
  - **What else changes:** the 2 % hero halo forms of the warm motes become points with the rest.
  - **What the test checks:** more than 100 warm motes at 0.5, fewer at 0.7, none at 0.9. At 0.5, 0.7 and 0.9, position, visibility, brightness and settling are identical with and without the key. Defect stays at 1.
  - The ledger noted that vibed "also changes visibility and hero forms". The visibility part is not so; the hero forms are the halos above.
- **Stops: one per scene, at rest.** No `STILL_MOVING` entries were added. Each Act II stop is at rest in the five motion leaves, by the existing test.
  - **What did change:** five scenes now end `ends: 'motion'`, because a camera move leaves at their page turn. The planner's rule picks the last point at rest before the next text, which is the instant the move leaves: exactly where the page starts to fade, with page opacity 1.0000. The scenes are ly-1, ly-3, ly-4, fr-1 and df-2.
  - **Where they are listed:** `PAGE_TURN_MOVES` in `src/autoAdvance/plan.test.ts`.
  - **The test for them:** a new test checks that each sits with its own text whole, the next text not yet up, and the camera leaving within the next rest window.
  - **The test that was renamed:** "waits past its text only for the orbit" now expects `['vb-4', ...PAGE_TURN_MOVES]`.
  - fr-1's stop is at rest because the orbit now ends at 0.92.

## Tests

Test 4, test 5 (this half), test 9 (this half) and the clocks are in the new `src/timeline/networkKeys.test.ts`. Every value is read from `schedule.ts`'s exports (`G_TWELVE`, `HI_TWELVE`, `FIX_TWELVE`, `TWELVE`) and from the network's own `fixAt`, `hiAt`, `born` and `dur`.

- **Growth by the storyboard.** Every key value is checked. Linearity between keys is checked at each midpoint.
- **Stream clock.** It rises by 1.3 × length over each of zoom-out, layers, far and defect, and never holds.
- **Steady leaves.** show 1, reflow 1, stage.motes 0.03 and review 0 through layers, far and defect.
- **Test 5:**
  - growth and fix never decrease over the whole essay (8000 samples);
  - highlight is 0 up to defect 0.60;
  - highlight is `HI_TWELVE` from 0.76, before df-5's `at`, to the section's end;
  - fix is 0 to 0.27, then `FIX_TWELVE` from 0.40 to the end;
  - C1's fix lands under df-2;
  - C5's fix has not set out by the section's end.
- **Test 4.** From df-5's `at` to 1, every 0.002 local (111 samples):
  - growth stays within `G_TWELVE`;
  - the nodes with `hi` ≥ 0.5 (through `nodeLight`, the shader's twin) are exactly `TWELVE`, each born by then;
  - C1's and R0's `hi` is 0;
  - the next cracked birth outside the twelve, C1 and R0 is above `G_TWELVE[1]`.
- **Test 9:**
  - no growth hold of 0.05 local or more lies within `NODE_FLARE_WIDTH` of a cube's landing window, and none exists in these sections;
  - no fix hold lies within the flare width of any `fixAt`;
  - there are four fix holds, so the check is not vacuous.

Test 8 is in `src/timeline/netShots.test.ts`:
- **Holds.** Every shot is held, in network terms, over its stretch: N3, N4, N5, N6, N7 (with far@0), N7′, N8 and N9. Each waypoint is checked at the moment its line comes up. All are pasted as `netShotKeyframe`, to 1e-6.
- **Moves.** Each of the seven moves (rise, toPlans, drop, pullBack, orbit, dive, pullOut) regenerates to its pasted keys within 1e-3, every key linear. Each starts from the shot held before it and ends on its last waypoint.
- **Orbit.** Its bearing strictly increases from far 0 to 0.92, ending at N7′'s.
- **The dive clause.** I read "the dive's path stays ≥ 2 units above the middle layer's slab until it is past it" as follows:
  - on every move, on both the landscape and the portrait rig, the camera stays at least 2 units clear of every born plan and rule (distance to the stack's centre, less its radius);
  - the dive's waypoint over C1 stands at least 2 above every plan's top;
  - the dive and the pull-out both pass that waypoint.

  Moving the pull-back's waypoint back to bearing 30 fails this test (0.41).

**Other tests changed:**
- `keyframes.test.ts`, the zoom-out "specced" assertion: the speckle test replaces it.
- `keyframes.test.ts`, the boundary-continuity test: its sampling distance was ±1e-7 and is now ±1e-9, because the dive runs through the far/defect boundary at speed.
  - At 1e-7 the dive moves 8e-4 between the two samples. At 1e-9 a real jump still shows, at any size over 1e-4.

**TDD, honestly.** The keys came first, chosen by the search; the tests followed.
- **RED evidence.** With the base commit's `keyframes.json` swapped back in under the new tests (`npx vitest run src/timeline/networkKeys.test.ts src/timeline/netShots.test.ts src/timeline/keyframes.test.ts src/autoAdvance/plan.test.ts`): **33 failed, 115 passed**. The failures:
  - every new hold and every pasted move;
  - the orbit;
  - all 9 clock, schedule, twelve and holds tests;
  - the two stop tests;
  - the speckle test.
- **GREEN.** `npx tsc --noEmit -p .` is clean. `npx vitest run`: **67 files, 1443 tests passed**.
- **Mutation.** The pull-back's waypoint at bearing 30 (the first candidate) passes clearance but flies 0.41 from plan-7, which the "never flies through" test rejects.

**e2e:**
- **`E2E_PORT=4199 npx playwright test e2e/clearance.spec.ts`:** 4 passed (both sizes over every page, and Act I's end).
- **Full suite** (`E2E_PORT=4199 npx playwright test`, after rebuilding `dist/`, 17.0 min): **126 passed, 9 skipped (the SHOTS-gated shot spec), 0 failed.** This includes parity in both modes, purity, pages, auto-advance and reduced motion.

## Stills: `shots/act2-keys-1/` (gitignored)

Stills are at each beat's midpoint, `?test=1&mech=bike&p=`, full budget, phone first. File names are `<beat>-<local>-<size>.png`.

**Phone, 390×844:**

| Still | What it shows | The line against the frame |
|---|---|---|
| ly-1-0.08 | The first stack, now all blue, low centre. B1 and B2 are speckle clusters beside it. A stream of dots runs down from the upper right, and code speckle sits round it. | "built from what its agent reads": dots arrive from above. True. |
| ly-2-0.26 | Arriving at N4. Two rules as faint speckle at 460-580 px: a striped one at the left and a sparse cloud at the right. The upper half of the frame is empty, and faint halos sit at the bottom edge. | "At the top, the rules": the rules are on screen but weak; this is their density (688 motes on a radius-4.4 stack). Nothing else is in frame, so it is not untrue. |
| ly-3-0.46 | N5. Rules faint above (350-450 px), the plans' speckle in the middle, the code's halos as a band at the bottom (580-720 px), the first stack among them. | "In the middle, the plans": three layers, the plans between. True. |
| ly-4-0.64 | N6. The first stack centre, with code speckle round and below it. Nothing above. | "At the bottom, the code". True. |
| ly-5-0.86 | N7. Three small bands low in the frame: rules, then plans, then the code halos. A stream runs down from the top layer. | "Rules shape plans, and plans shape code". True. |
| fr-1-0.5 | The same network, circled a little. Every stack is blue; nothing is lit. | "From far away, everything looks right". True. |
| df-1-0.12 | C1 close, filling the lower third. The top course's two bricks are split by a bright vertical line, the crack. A second bright seam shows in the course below. | "one piece of code has a defect": the line is visible. The second seam may read as a second crack (task 7's look). |
| df-2-0.35 | The same frame, with amber motes falling from above at about 160-320 px. | The amber cloud's top sits just under the text's last line (about 140 px), but inside the panel's 185 px. In flight, so the clearance test does not count it. "So you fix it": true. |
| df-3-0.52 | Mid pull-out: the network small, low and all blue. | "Now step back". True. |
| df-4-0.68 | N9. P1's big ember blob and a few ember code stacks, lighting from P1 down. | "Whatever is built on a defect carries it too". True. |
| df-5-0.89 | The twelve, lit. One large ember blob (P1, P2 and P3 merged) and nine small ember discs, low left. C1 is dark among the blue. | "Twelve new defects": **it reads as about ten shapes**, as Task 3 found (test 12 is task 7's). "You fixed one": true (C1 dark). |

**Desktop, 1440×900:**
- **ly-1:** the first stack and its neighbours. Streams come down from the upper right.
- **ly-2:** two rules as faint speckle, low left and right. The frame is mostly empty, as on the phone.
- **ly-3:** the rules faint at the upper left and right, the plans' speckle below them, the code low. Hard to read.
- **ly-4:** the first stack close, centred, with code speckle round it.
- **ly-5:** three bands under the text column.
- **df-1, df-2:** C1 close at the lower right. The crack is a bright vertical line between the top course's bricks. There are no warm motes in frame at 0.35 (they are above it).
- **df-5:** as the phone: one big plan blob and nine small discs.

## Concerns

1. **Five fast moves through page turns.** In 0.2 screens each, the camera:
   - rises from the bottom cluster to above the top layer;
   - drops to the code;
   - pulls back past every stack;
   - dives 60 units onto C1 from the wide shot;
   - pulls back out.

   These are the only paths the clearance test allows on a phone. I have not seen them in motion, only as stills. If they read as jump cuts, the alternative is a test change: let a crossing pass while it is in flight, or count the band by text column on desktop. That is the controller's call.
2. **The dive moved out of df-1.** "Come closer. Down here, one piece of code has a defect." now comes up with the camera already close. The design had the lips "resolve from nothing" under the line.
3. **Stop semantics.** Five scenes now end with `ends: 'motion'` at their page turn. They are at rest, with text whole; the stop tests name them.
4. **The twelve read as about ten shapes** at N9 on both sizes, because P1, P2 and P3's halos merge (task 7, test 12).
5. **C10 is still landing early in df-5.** It is born at 0.338 and takes 0.012, so its cubes land until growth 0.350. df-5 starts at 0.345, so C10 finishes about a third of the way into df-5. It is lit throughout; this follows from the schedule's numbers.
6. **The look in layers** (task 7):
   - the rules are faint speckle at N4, and the upper half of the frame is empty;
   - at N5 desktop the layers are hard to read;
   - the ly-2 line is weakly shown, though not untrue.
7. **Desktop defect page 1 margin is only +31** at 0.355: C1's warm motes are landing. All other pages are above +100.
8. **A preview server was already running on port 4199** (started 05:53, before this task; not mine, left running). Playwright reused it, so `dist/` was stale. The first round of stills showed the old build, and I rebuilt `dist/` by hand before the stills and the full e2e.
   - The clearance spec samples the keyframes from source, so its result does not depend on the build.
   - Whoever owns that server should stop it.
9. **Duplicated spline math.** `splineShot` repeats `lapShot`'s spline math (`shots.ts`) in network terms rather than sharing it. The two differ in units, and `lapShot`'s waypoints carry their own target type. I left it.

## Files

- **Changed:** `src/timeline/netShots.ts`, `src/timeline/netShots.test.ts`, `src/timeline/keyframes.json`, `src/timeline/keyframes.test.ts`, `src/autoAdvance/plan.test.ts`.
- **New:** `src/timeline/networkKeys.test.ts`.
- **Temporary search, measurement and still scripts** (`shots/*.search.ts`, `shots/*.pw.ts`, `shots/clear.ts`, `shots/pw.config.ts`, `shots/vitest.config.ts`): deleted.

## Fix round 1

Commit 23899ac timeline: one camera spline for the lap and the network's moves.

**Important, taken: the duplicated spline.**
- **New `src/timeline/cameraSpline.ts`** holds the spline both moves use:
  - `cameraSpline(points, us, u, lookFrom)`, the centripetal Catmull-Rom over channel vectors: the phantom-end extension, the knots spaced by the camera's own travel, the segment search and the Barry-Goldman pyramid;
  - `cameraChannels` and `channelShot`, which convert a shot to channels and back.
- **The callers.** `lapShot` (shots.ts) and `splineShot` (netShots.ts) each pass their own `lookFrom` (bike axes or the network's bearing) and their eased parameters, and call it. The two copies of `channels`, `cameraAt` and the spline body are gone.
- **The eases.** `splineShot` takes its eases from `EASINGS` (easing.ts), and `lapShot` uses `EASINGS.inOutCubic`. The local `EASE` and `inOutCubic` copies are gone.
- **No pasted key changed.** `keyframes.json` is untouched. The lap's regeneration test (shots.test.ts) and the seven Act II move tests (1e-3) pass unchanged.

**Minors taken:**
- **3.** Test 4 now counts lit stacks over every node, reading a null clock as `NODE_NEVER` as the textures do. There is no filter any more.
- **4.** The moves' regeneration test is now two-way. Inside each move's span (from, to], each camera track's keys are exactly the generated ones, so a stray hand key fails it.
- **2, as a test rather than a derivation.** Deriving the times from the story would move the pasted keys by up to 3e-5 local, and the brief says they must not change.
  - A new test checks each page-turn move against `loadStory()`, `pageOut` and `fadeWidth`. It must leave within 1e-4 of a section of its page's fade start, and stand on its waypoint (the dive's last) within 1e-4 of the next page being fully up.
  - So a re-timed page fails in vitest, before it can misalign a move.
- **5.** The waypoint test is renamed to say what it checks: "pass a waypoint 2 units above every plan".
- **1, by documenting it.** The planner's header (plan.ts) now says that a page-turn move ends its scene at the instant it leaves, with the text whole, so `ends: 'motion'` there means "just before a motion". No behaviour changed.

**Minors left:**
- **6.** N2 → N3 halts at the boundary, both keys inOutCubic. It sits under the zoom-out → layers page turn and is harmless; joining the two moves would change keys.
- **7.** The loose "starts each move from the shot held" test is left; `HOLDS` and the two-way regeneration test now carry its weight.

**Results:**
- `npx tsc --noEmit -p .` is clean.
- `npx vitest run`: **67 files, 1448 tests passed.**
- Full e2e (`E2E_PORT=4199 npx playwright test`, dist rebuilt first, 17.1 min): **126 passed, 9 skipped (SHOTS-gated), 0 failed.**
