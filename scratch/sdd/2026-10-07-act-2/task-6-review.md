# Act II Task 6 review: keyframes, second half (spread, reviewer, trace, fix, lesson)

Base 23899ac, head 9a08cb0 (589682e, 1e9454c, 548f8e7, 7fb2a47, 9a08cb0). I read the diff file once, all of it. Outside the diff I made one focused check for each named risk:
- the story files, for every `out=`;
- `src/network/schedule.ts` exports and `lineage.ts` (C5/C12);
- `src/network/review.test.ts` (test 7);
- the existing whole-essay monotone test and the twelve test in `networkKeys.test.ts`;
- `e2e/clearance.spec.ts` with `e2e/machine.ts`, to confirm the network counts in clearance;
- the uses of `SECOND_HALF_MOVES`;
- `package.json`, for lint or format tooling.

I re-ran no test suites.

### Spec Compliance
- ✅ Spec compliant. The design's departures are each disclosed, each has a reason grounded in the clearance arbiter (§2 conventions: "the clearance test is the arbiter"), and each is pinned by a test. They are N10, N11, N13, the N14 drop, the climb ending at 0.34, N15 at d 6, N15′ and N17 at d 12, N18, N20, and the second-fix hold to 0.55.
- ⚠️ Cannot verify from the diff (for the controller):
  - Whether the stills in `shots/act2-keys-2/` exist and match the report's frame table. They are gitignored and not in the diff.
  - The e2e results: 131 passed, 9 skipped; purity 13 passed. These are taken from the report.
  - Commits carry no trailer. The brief gives none, and the global constraints say "the trailer line given in your dispatch". This is the controller's call.
  - The fx-4 `STILL_MOVING` entry departs from §6 test 6, "every Act II stop is at rest in the five motion leaves". Its justification is sound and tested: nothing is lit from fix 0.92, so the 0.90–0.98 highlight fade changes nothing visible. But it is a sanctioned exception to the design test, not compliance with it. Decide whether to keep it or re-key the last fade to end before the stop (fix ≈ 0.976).

### Named risks, checked

**The planner change: Act I and generality.** `src/autoAdvance/plan.ts:166,175,203`. The `early` flag is `page.out !== undefined`, a general rule, not one special-cased to up-1. It only removes the motion-wait branch, so the stop falls at `min(next, fadeOut) − margin`: the page's last fully inked moment, as ruling 2 asks. The only `out=` in the story is `src/story/09-spread.md:8` (up-1), so no Act I scene takes the new path, and no Act I stop can move. A made-up story pins the rule (`plan.test.ts` "never waits past a page with an explicit out"). The tripwire clause is kept as `ends: 'text'` and strengthened: no stop and no text in [0.40, 0.62], and nonzero motion there.

**Schedule exports as the authority.**
- `networkKeys.test.ts` "carries the schedule's reviewer keys exactly" reads `net.review` and `net.growth` out of `keyframes.json` for `reviewer@` and compares them with `toEqual` to `REVIEWER_KEYS`, ease included.
- `CLEAN_AFTER`, `CLEAN_WORK_FROM`, `HI_AT_BIRTH`, `SWEEP`, `FIX_TWELVE`, `G_TWELVE` and `TWELVE` are imported, as are the network's own `fixAt`, `hiAt`, `hop` and `born`.
- The remaining literals in the growth-rows test (0.42, 0.47, 0.63, …) are the storyboard's own values. `schedule.ts` exports no counterpart for them, so they do not breach ruling 4.

**Test 4.** The twelve test is unchanged and still exact, every 0.002 over df-5. The new `net.fix` key that mends C5 starts at spread 0.47, after the defect section.

**Test 5.**
- Growth where `net.fix` reaches R0's `fixAt` is within 0.01 of `CLEAN_AFTER`, and nothing born after it is cracked.
- The first clean child of R0 or R1 is born at `CLEAN_WORK_FROM` or later. It is also born after fx-3's `at`, which is stronger than "after fx-2's page is up", since fx-1, fx-2 and fx-3 share page 1. R1 is whole by then.
- "never runs growth or the fix backwards, anywhere in the essay" is an existing test over 8000 samples of 0..1, so it now covers every new key.

**Test 6.**
- `up-1.progress < globalAt(0.40)` and `up-2.progress > globalAt(0.62)`.
- No stop lies in the wordless stretch.
- `netShots.test.ts` "plays the second fix with no text up" checks that the dive and pull-out lie inside it.

**Test 7.** `review.test.ts` proves at least 80 % landed at each hold from `REVIEWER_KEYS`. The keyframes are fenced equal to `REVIEWER_KEYS`, so the two compose soundly, without copied numbers.

**Test 9.** The holds rule and the growth-hold rule now run over `ACT_II`. The non-vacuity floor rises from 3 to 8 fix holds.

**Purity.** `e2e/purity.spec.ts:100-104` samples zoom-out 0.22, defect 0.68, reviewer 0.50, trace 0.80 and fix 0.82, exactly as §6 test 13 lists them. The 0.95 and 0.99 detour branches are now live: by my arithmetic, trace 0.80 is p ≈ 0.861 (→ 0.95) and fix 0.82 is p ≈ 0.951 (→ 0.99). They are rightly kept.

**Clearance.** `e2e/clearance.spec.ts` is untouched. `machineOnScreen` includes `visibleNetwork` for the bike, so Act II's pages are measured.

**Act I keyframes.** The only `-` lines in the `keyframes.json` hunk are the last keys of each track, re-emitted with a trailing comma, with values unchanged. No Act I key moved.

**Shots moved for clearance each have a test.**
- Every held shot is pinned by a `HOLDS` row: N10, N11, N12, N13, N15, N16, N15p, N17, N18, N19, N20, plus the waypoints `followC7`, `followUp` and `reviewOver`.
- The R0-sphere reason for moving N10 and the 2-unit reason for N15 are pinned by the fly-through test. Both shots are move endpoints.
- `overC5` has the "2 above every plan" test.
- `toReview` joins the page-turn timing test, which checks that it leaves as up-2 fades and is over the visits as re-1 is up.
- The second fix's hold against C5's fix window is tested, as are R0's and R1's.

**Band-crossing moves.**
- `toReview` rides the spread→reviewer page turn. Up-2's stop is the instant it leaves (`PAGE_TURN_MOVES` + `up-2`).
- The second dive and its pull-out sit in the wordless stretch.
- Every other move runs under a line that the clearance spec samples.
- `camera.frame` is hand-keyed consistently with each move's endpoint frames: 0→1 on the dive, 1→0 on the pull-out, 0→0.5 into the reviewer, 0.5→1 on the climb, and 1→0 at the fan-out and at `toRules`. `HOLDS` checks frame at every held shot.

### Strengths
- The planner rule is a small, general, well-commented change.
- The tripwire is upgraded rather than deleted, and now asserts the stretch is truly wordless and not motionless.
- The ring fence is exact against the schedule, ease included, and composes with test 7 without duplicating it.
- The second-half clock tests are behavioural, through `nodeLight`. They cover:
  - the surge by hop, with the clamp at 6;
  - the mended C1 and C5 staying dark;
  - R0 dark until tr-2;
  - each fix's warm motes setting out after its line is up and landing before the next.
- Every camera departure is named, commented in `NET_SHOTS` with its reason, and reported with numbers.

### Issues

#### Critical
None.

#### Important
None.

#### Minor
1. **Dead export and trailing whitespace.** `src/timeline/netShots.ts:530-545`: `SECOND_HALF_MOVES` is exported but nothing reads it (grep over `src` and `e2e`). The report presents it as part of the camera's structure. Either use it, for example in a test of second-half move order or contiguity, or drop it. The file also ends with two extra blank lines. The repo has no formatter to catch them.
2. **Misleading control comment.** `src/autoAdvance/plan.test.ts:312`: "Without the out, the same motion holds the stop back". The control uses a different motion (0.42–0.46 on `shape(0.5)`), not the 0.32–0.45 `move` above it, so it does not isolate `out` as the cause. It only re-shows the waiting rule. Fix the comment, or build a control that differs only in `out`.
3. **Literals beside named moves.**
   - `src/timeline/networkKeys.test.ts:344`: `let prev = 0.68` is the fan-out's end, written as a literal next to named moves. `NET_MOVES.fanOut.to` would keep it from drifting when the move is re-keyed, which the brief anticipates.
   - `src/timeline/netShots.ts:464`: the `toReview` waypoint `0.47619048` is a bare literal, where Task 5's moves use `tIn(...)`. The page-turn test fences it, so this is consistency only.
4. **Fix-onset clearance not committed.** N15p and N17 sit at d 12 (`src/timeline/netShots.ts:240,242`) because the warm motes cross the band at the fix onset. The committed clearance spec samples every 0.01 local, which the report itself says steps over that instant. The reason is therefore pinned only by `HOLDS` freezing the value, and by the coarse grid catching d 5.5 on desktop. A dense clearance sample at each fix onset would make the reason self-checking. This is coverage, not a defect.
5. **fx-4 `STILL_MOVING`.** `src/autoAdvance/plan.test.ts:122`; see the ⚠️ above. It is justified and tested (`networkKeys.test.ts`, "sweeps every other stack", no stack lit from fix 0.92), but it is an exception to §6 test 6.

### Assessment
**Task quality:** Approved
**Reasoning:** The planner rule is general and cannot touch Act I. The keys follow the storyboard and are checked against the schedule's exports, with `REVIEWER_KEYS` fenced exactly. Tests 4–9 and 13 cover the new sections with behavioural assertions. The remaining findings are polish: a dead export, one misleading comment, two literals, and one sanctioned at-rest exception.
