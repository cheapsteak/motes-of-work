# Act II, Task 6 report: keyframes, second half (spread, reviewer, trace, fix, lesson)

Status: **DONE_WITH_CONCERNS**. Base 23899ac. Commits on main, not pushed:

- 589682e timeline: the network's clocks through spread, reviewer, trace, fix and lesson
- 1e9454c auto-advance: a page that leaves early ends its scene with its text
- 548f8e7 timeline: spread to lesson shot, each band crossing kept off the text
- 7fb2a47 e2e: the purity check samples Act II's reflow, highlight, ring, surge and sweep
- 9a08cb0 auto-advance, timeline: reflow the planner's header and a test comment

No session trailer, as in Task 5: the dispatch gives none, and the harness's suggested trailer names a product.

## What was built

1. **The clocks** (§2.5-§2.10, verbatim). Growth, the stream clock, `net.fix`, `net.highlight` and `net.review` for spread to lesson.
   - The reviewer section's `net.review` and `net.growth` keys are written from `REVIEWER_KEYS` and a test reads them back out of `keyframes.json` and compares them to `REVIEWER_KEYS` exactly (local, value, ease).
   - Every other test reads its numbers from `schedule.ts` (`CLEAN_AFTER`, `CLEAN_WORK_FROM`, `HI_AT_BIRTH`, `SWEEP`, `FIX_TWELVE`, `G_TWELVE`, `TWELVE`) and the network's own `fixAt`, `hiAt`, `hop` and `born`, never copies.
2. **The stop rule for a page with `out`** (ruling 2). `plan.ts`: a scene whose page has an explicit `out` never waits for motion past it, so it ends at `min(next, fadeOut) - margin`, inside the page's full ink. up-1 stops at spread 0.369 with R1 lit and forming; the second fix is crossed in transit; up-2 stops at spread 0.9722, as its page starts to fade and the camera leaves for the reviewer's shot. The tripwire clause (`ends: 'text'`) is kept, its comment rewritten, and it now also checks that no stop and no text lies in the wordless stretch and that something moves there.
3. **The camera**: seventeen named shots (five of them waypoints) and eleven named moves in `netShots.ts` (`NET_SHOTS`, `NET_MOVES`, `SECOND_HALF_MOVES`), pasted by `splineKeys` and held by the existing two-way regeneration test. `camera.frame` is keyed by hand.
4. **Purity samples** (ruling 5): zoom-out 0.22, defect 0.68, reviewer 0.50, trace 0.80, fix 0.82, through a general `sectionProgress` (the old `specProgress`). The detour's 0.95 and 0.99 branches are now live (trace 0.80 is p 0.861, fix 0.82 is p 0.951), so they stay.

## Rulings, as applied

- **Second fix on C5.** `lineage.ts` gives C5 `hero: 4000`, `fixAt: 0.18` at the design's C12 place; C12 is swept (0.82). N11 targets `crackCentre('C5')`; a test checks it, and that C5 is in `TWELVE`.
- **Wordless second fix.** The dive (0.40-0.48), the hold (0.48-0.55) and the pull-out (0.55-0.62) all lie between up-1's `out` and up-2's `at` (tested). C5's warm motes set out at 0.515 and land at 0.542, inside the hold (tested). The hold runs to 0.55, not the design's 0.54: the design's keys land C5's fix at 0.542.
- **No highlight before the defect is found**: untouched, still tested over the whole essay.
- **Surge**: R0 is dark until highlight 0.90 (trace 0.40, after tr-2 is up, tested). Hop 1 starts after the pull-back (0.68) and each hop after the one before; by trace 0.92 every carrier has surge 1 except C1 and C5, which are mended (tested through `nodeLight`).
- **Schedule constants**: as above. Test 5's clauses: growth where `net.fix` reaches R0's `fixAt` is 0.6692 (within 0.01 of `CLEAN_AFTER` 0.665); nothing born after it is cracked; the first clean child of R0 or R1 is born at `CLEAN_WORK_FROM` or later, after fx-3 comes up and after R1 is whole.

## Shots as built against the design

Distances in world units; bearing, elevation, distance, fov, frame. "Passes" means the clearance test's measure (full: landed motes and cube corners through the composed camera) at both sizes.

| Shot / move | Design | As built | Why |
|---|---|---|---|
| N9 → N10, the follow | spread 0.04-0.30, through C7's top then up the stream | as design, through `followC7` (C7's top; 90, 55, 55) at 0.118 and `followUp` (R1; 60, 18, 26) at 0.209 | the design gives no waypoints; these were searched (1920 paths) |
| N10 (up-1) | R1; 60, 8, 12, fov 38 | R1; **75, 25, 20** | the design's shot stands the camera 0.15 inside R0's bounding sphere (R0 and R1 are larger than designed); this one keeps 4.35 clear and passes |
| N10 → N11, the second dive | 0.40-0.48 | as design, through `overC5` (C5's crack; −50, 70, 12) | `overC5` stands 2 above every plan top (tested); bearing −50 so the rise passes 3.3 clear of P4 |
| N11 | **C12's** crack; −20, 18, 2.6, fov 36, frame 1 | **C5's** crack; **−35**, 18, 2.6 | ruling 3; bearing −35 keeps the way out clear of P4 |
| hold | 0.48-0.54 | **0.48-0.55** | C5's fix lands at 0.542 on the design's keys |
| N11 → N12 | 0.54-0.62 | **0.55-0.62**, through `overC5` | |
| N12 (up-2) | net; 60, 14, 62 | as design | passes |
| N12 → N13 | reviewer 0-0.10 | **spread 0.9722 → reviewer 0.10**, outCubic, through `reviewOver` (visits; −170, 65, 60) as re-1 is fully up | the direct move fails desktop by 3 px (R_b); a page-turn move, so `up-2` joins `PAGE_TURN_MOVES` |
| N13 (re-1 to re-3) | visits' centroid; 40, 24, 14, fov 38 | visits' centroid; **−170, 65, 42, frame 0.5** | the design's shot is −193 phone / −221 desktop (R1, R0, plans); of 1728 searched, only steep looks from behind the visits, out past the network's edge, pass; this one also has R0 and the feed's top end in frame |
| N13 → N14 (re-3) | 0.75-1.00, up the feed | **dropped**: N13 holds through re-3 | N14 fails desktop −221 and phone −2; the climb starts from N13 instead |
| N14 → N15, the climb | trace 0-0.44, beside P5, up past the middle layer | **trace 0-0.34**, through `climbP5` (P5; −150, 50, 32) and `climbR0` (R0's crack; −120, 20, 32) | ends at 0.34 so tr-1's stop (just before tr-2 at 0.36) is at rest on the source; 648 two-waypoint paths searched, 456 pass |
| N15 (tr-1, tr-2) | R0's crack; −25, 20, 5.5, fov 36, frame 1 | distance **6**; holds **0.34**-0.56 | at 5.5 the camera is 1.78 from R0's sphere; the fly-through test asks 2 |
| N15 → N16 | 0.56-0.68 | as design | passes |
| N16 (the fan-out) | R0; −10, 22, 16 | as design | passes |
| N16 → N15′ | fix 0-0.08 | as design | passes |
| N15′ (fx-1) | as N15, bearing −15 | R0's crack; −15, 20, **12** | R0's warm motes come down from three radii above it; from closer than 12 they cross the band as they land (onset at fix 0.1253): 5.5 gives −12 / −217, 9 gives +191 / −77 |
| N15′ → N17, the pan | 0.16-0.26 | as design | passes |
| N17 (fx-2) | R1's crack; −15, 20, 5.5 | distance **12** | the same: 5.5 gives +20 / −221, 9 gives +197 / −48 at the onset (fix 0.305) |
| N17 → N18 | 0.40-0.50 | as design | passes |
| N18 (fx-3) | (0, 11, 0); 20, 20, 24 | **(0, 13, 0)**; 20, 20, **36** | the design's holds at +17 desktop, and the move out from R1 fails by 3 (R_c) |
| N18 → N19 | 0.62-0.72 | as design | passes |
| N19 (fx-4) | net; 20, 16, 62 | as design | passes |
| N19 → N20 | lesson 0-0.50 | as design | passes |
| N20 (ls-1) | (0, 9, 0); 10, 48, 30 | **(0, 11, 0)**; 10, 48, 30 | the design's is −20 desktop (R_c, the far rule) |

`camera.frame`: 0 → 1 over the second dive, 1 → 0 over its pull-out; 0 → 0.5 over the page turn into reviewer; 0.5 → 1 over the climb, 1 → 0 over the pull-back; 0 → 1 over fix 0-0.08, 1 → 0 over 0.40-0.50.

**Clearance as shipped** (my harness, the clearance test's measure, every 0.005 local, worst px per page; phone / desktop):

| Section | Phone | Desktop |
|---|---|---|
| spread p1, p2 | +243, +306 | +162, +307 |
| reviewer | +289 | +199 |
| trace | +181 | +97 |
| fix p1, p2 | +149, +228 | +34, +174 |
| lesson | +194 | +55 |

The rule shots were also sampled densely from the onset of each fix (the instant every warm mote crosses `settled` 0.5 together, which a 0.005 grid steps over): R0 at d 12 +261 / +82, R1 at d 12 +263 / +93.

**Nearest approach to a born plan or rule** (centre distance less radius, either rig): follow 4.35 (R_b), second dive 5.17, second pull-out 3.32 (P4), to the reviewer 19.1, climb 2.26 (R0, at N15), fan-out 2.26, to R0 8.26, to R1 6.86, to the rules 7.31, to the sweep 24.4, to the lesson 18.8.

## Failed camera paths, with their numbers

Margins in px past the panel's bottom + 8, phone / desktop, negative fails.

**The design as drawn** (straight keys between the shots, my waypoints for the moves the design draws through a point):

| Page | Phone | Desktop | What crosses |
|---|---|---|---|
| spread p1 (the follow) | +127 | −130 | R0, R_b, R_a, R_c (with my first follow waypoints) |
| reviewer (N12 → N13, N13 held, N13 → N14) | −193 | −221 | R1, R0, R_c, plans |
| trace (the climb) | −70 | −146 | R0, R_c, R1 (and N14 held on desktop) |
| fix p1 (R1's warm motes at d 5.5) | +23 | −204 | R1's fix motes |
| fix p1, dense at the fix onsets, d 5.5 | −12 (R0), +20 (R1) | −217, −221 | the warm motes |
| fix p1 (N17 → N18) | | −3 | R_c |
| lesson (N20) | +160 | −20 | R_c |

**Searches** (fast measure unless said; every pick re-checked with the full one):
- **N13**: 1728 shots round the visits' centroid (bearing every 20°, elevation 10-80, distance 10-40, frame 0 and 1); 62 pass, all looking down at 50° or more from bearings 120 to −120 through 180. Then 1728 more (frame 0, 0.5, 1; distance 24-42) for R0 and the feed in frame: 702 pass at 20 px or more at both sizes; 22 of those keep R0 and the feed's top end in frame on both.
- **N12 → N13**: direct over reviewer 0-0.10 −3 desktop (R_b), over 0-0.05 +3; 60 page-turn variants (waypoint bearing, elevation and distance as re-1 comes up), 24 fail (worst −221), the chosen one +289 / +200.
- **The climb**, one inner waypoint: 2880 paths (P5, the P5-R0 midpoint or R0's crack × 12 bearings × 5 elevations × 4 distances × 2 times × inOutCubic or a page-turn outCubic); the best +215 / +99. Two inner waypoints: 648, 456 pass.
- **The follow**: 1920 paths; 252 within −30; best +250 / +177.
- **The rule shots**: 100 each (5 bearings × 4 elevations × 5 distances), full measure, dense from the fix onset; at the design's bearing and elevation, only distance 12 or more passes.
- **N18**: 192 shots, 147 hold at 20 px or more; the move from R1 then picks among them.
- **N20**: 1080 shots; 610 pass.

## Stops

- `PAGE_TURN_MOVES` gains **`up-2`**: N12 holds to spread 0.9722 and the move to the reviewer's shot leaves there, outCubic, so up-2's stop is the instant it leaves, text whole.
- `STILL_MOVING` gains **`fx-4: ['network']`**: the design's last highlight fade (fix 0.90-0.98) runs through the page turn. It changes nothing on screen by then: every stack is mended by fix 0.92, which a test now checks (no stack lit from 0.92 on).
- up-1 ends `'text'` at spread 0.3694 (ruling 2). Every other second-half stop is at rest and ends with its text: re-1 0.3969, re-2 0.6169, re-3 0.9656, tr-1 0.3571 (on R0, close), tr-2 0.9676, fx-1 0.1378, fx-2 0.3978, fx-3 0.5961, fx-4 0.9761, ls-1 the end.

## Tests

- `src/timeline/networkKeys.test.ts`: the stream clock, the holds rule (test 9) and the growth-hold rule now run over all of Act II; new blocks for the growth by the storyboard, the reviewer's keys against `REVIEWER_KEYS` (exact), the ring held after its section, nothing changed under the ring, R1 lit under up-1, C5 mended wordlessly, more lit under up-2 with C1 and C5 dark, R0 dark until tr-2, the surge by hop, R0 and R1 mended under their lines, `CLEAN_AFTER` and `CLEAN_WORK_FROM` (test 5), the sweep under fx-4, the lesson clean, and no `hiAt` between the twelve's and R0's.
- `src/timeline/netShots.test.ts` (test 8): twenty second-half `HOLDS` rows; the dive test now covers C1 and C5; `toReview` joins the page-turn timing test; new tests that the second fix's moves lie in the wordless stretch, and that each close shot on C5, R0 and R1 is held while its warm motes fall and land. The regeneration, fly-through and start/end tests cover the new moves as they are.
- `src/autoAdvance/plan.test.ts` (test 6): a made-up story for the explicit-`out` rule; the rewritten tripwire clause; `PAGE_TURN_MOVES` and `STILL_MOVING` as above.

**TDD.**
- RED, clocks: the new clock tests against the base keys, `npx vitest run src/timeline/networkKeys.test.ts`: **17 failed, 10 passed** (every new second-half clause, plus the stream-clock and holds tests now run over Act II).
- RED, stop rule: the made-up-story test against the base planner: **1 failed** (`expected { id: 'a', … } to match object { ends: 'text' }`).
- The camera: the keys came first, chosen by search; the tests followed (as in Task 5).
- GREEN: `npx tsc --noEmit -p .` clean; `npx vitest run`: **67 files, 1517 tests passed**.

**e2e** (`E2E_PORT=4199`, `dist/` rebuilt first; a preview server was running on 4199, not mine, left running):
- `e2e/purity.spec.ts`: **13 passed** (14.5 min), the five Act II samples included.
- Full suite (23.0 min): **131 passed, 9 skipped (the SHOTS-gated shot spec), 0 failed**. Task 5's 126 plus the five new purity samples. Clearance, pages, auto-advance, parity, reduced motion and the rest unchanged and green.
- After the last (comment-only) commit: `npx tsc --noEmit -p .` clean, `npx vitest run` 67 files, 1517 tests passed.

## Stills: `shots/act2-keys-2/` (gitignored)

`<beat>-<section>-<local>-<size>.png` at each beat's midpoint and the two wordless moments, and `at-<section>-<local>-<size>.png` at the stops and fixes; `?test=1&mech=bike&p=`, full budget, with the text. Phone first.

| Still | What is on screen (phone) | The line against the frame |
|---|---|---|
| up-1 0.2 | Mid-follow, high over the bottom layer: lit ember stacks low left, blue ones low right, a thin stream rising. | "One agent wrote down what it built … Now the defect is in the rules too." Not yet: the rule is above the frame here. The line comes true at the stop (0.36). |
| at spread 0.36 (up-1's stop) | R1 forming, ember, mid-frame, with the up-stream's dots coming up into it from the lower left. | True. |
| wordless 0.51 | C5 close, its motes ember, a lit neighbour at the left. | No text. |
| at spread 0.545 | C5 whole, an amber dusting on its top course, now blue. | No text; the fix has landed. |
| up-2 0.81 | The whole network small and low: an ember tree on the left half, blue on the right. | "You cannot fix them one at a time as fast as they are made." True: 35 lit when the line comes up, 44 at its end. |
| re-1 0.2 | From high above, the bottom layer's stacks, ember and blue, the pale ring on one of them. | True. |
| re-2 0.51 | The ring on a lit stack, which stays lit. | "The reviewer says they are all fine." True. |
| re-3 0.81 | The ring on V9 (ember). R0 and the feed's top end are in the frame by the measure, but the feed reads faintly at best on the phone. | "The reviewer read the same rule." Weakly shown (look, task 7). |
| tr-1 0.18 | Mid-climb, over P5: lit stacks low, the ring. | "Follow the defects back up." True, in motion. |
| at trace 0.45 | R0's crack close: pale lit motes low in the frame; the crack line is hard to make out on the phone. | "They all lead to one place at the top" — the place is shown; the crack is weak (look). |
| tr-2 0.68 | R0 large, ember, with its halo; lit stacks below. Desktop: R0's courses and its crack's bright lines read plainly, R1 at the left. | "… one incorrect rule." True. |
| surge 0.80 | As tr-2, with more ember below as the surge runs out. | No new line; the fan-out. |
| fx-1 0.07 | Moving in on R0: a large ember halo low. | "Fix the rule." True (its fix lands at 0.12-0.13). |
| at fix 0.14 | R0 mended. | True. |
| fx-2 0.27 | R1 low in the frame, ember. | "And fix the rule an agent wrote from it …" True (its fix lands at 0.29-0.32). |
| at fix 0.38 | Desktop: R1 whole with an amber dusting, blue. Phone: R1 mostly below the frame's bottom edge. | True on desktop; weak on the phone. |
| fx-3 0.51 | Both rules as faint speckle up top, the plans, a large ember cluster of old work at the left, blue to the right. | "Now new work built from them is correct." The new clean stacks are there but not picked out; the lit old ones dominate. Not untrue. |
| fx-4 0.81 | Mid-sweep: fewer ember stacks, the ring still on V9. | "Then trace everything … and fix what it already made." True. |
| ls-1 0.5 | From above the top layer: a sea of blue code stacks; the rules faint near the top. | "The higher up a thing sits, the longer you look at it." Not untrue; the rules read weakly. |

## Concerns

1. **One new whip move through a page turn**: into the reviewer's shot (from the wide shot to high over the visits in 0.2 screens). The second dive and its pull-out are fast too (0.22 local for dive, hold and pull-out), but wordless, as ruled. Everything else moves under its line, on a path searched until it passed. The author will judge them in motion.
2. **The reviewer's shot is a large departure** (from high above, not the design's close three-quarter view). Nothing else passes. The ring reads; the feed under re-3 is faint.
3. **N14 is gone**: re-3 holds N13 and the climb starts from it.
4. **The rule close-ups are at 12, not 5.5** while their fixes land (fx-1, fx-2): the warm motes' flight from three radii above a rule is what crosses the band. N15 (trace, no fix) stays close (6). On the phone the rule's body falls off the bottom at frame 1.
5. **More lit than the design says.** About twenty-four under up-2 in the design; 35 to 44 as built (Task 1 found this; the line does not count them).
6. **The highlight's last fade** (fix 0.90-0.98) sits under fx-4's stop (`STILL_MOVING`); it puts out nothing still lit.
7. **The design's highlight key at spread 0.38** sits in up-1's page fade now that the page leaves at 0.40: stacks carrying the defect born from spread 0.07 (C11, C12, C13) stay dark until 0.38. R1 itself is lit by 0.348, inside the line. I kept the design's values.
8. **The ring never fades**: `net.review` holds at 1.2 to the end as the design keys it, so the ring sits on V9 through the fix and lesson (visible in fx-4). The 1.5-2 fade-out is unused. A look question for task 7.
9. **Looks for task 7**: the crack on R0 close (phone) is hard to see; the rules read as faint speckle at N18 and N20; the reviewer's feed is faint.
10. **Design §11 "As built"** has no entry for Tasks 5 or 6; I did not edit the design.

## Files

- **Changed:** `src/timeline/keyframes.json`, `src/timeline/netShots.ts`, `src/timeline/netShots.test.ts`, `src/timeline/networkKeys.test.ts`, `src/autoAdvance/plan.ts`, `src/autoAdvance/plan.test.ts`, `e2e/purity.spec.ts`.
- **Temporary** search, paste, measurement and still scripts in `shots/` (`*.search.ts`, `*.pw.ts`, `clear.ts`, `gaps.ts`, `kf.ts`, `plan.ts`, configs and their text outputs): deleted.
