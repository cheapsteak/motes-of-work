# Act II, Task 7: pixels and the phone pass

Repo <repo>, branch main; commit there, do not push. Read global-constraints.md and
implementer-instructions.md in this folder, and the repo's CLAUDE.md first. **Phone first**: judge every change at
390×844 before 1440×900.

## What to read
- docs/specs/2026-10-06-act-2-storyboard-and-network.md:
  - §1 (the copy);
  - §3.3, §3.5, §3.7 and §3.8 (glow, crack, highlight, halos);
  - §6 tests 11–14 and 16;
  - §11 including "As built".
- The task reports in this folder:
  - task-3-report.md: the node set, the close-up gain, its concerns;
  - task-5-report.md and task-6-report.md: the shots as built, why band crossings ride page turns, and the
    clearance search method.

## The task
Build §7 task 7:

> Pixels and the phone pass. Tests 11–14 and 16, the stills, then the author's look at both sizes at the
> storyboard's beat midpoints; tune the shots by the clearance test and the ember by test 12.

The author's standing rule: **every line must be true of what is on screen while it is up**, and the camera and
the motion show what the line says. The controller looked at the phone stills from Tasks 5 and 6
(`shots/act2-keys-1/`, `shots/act2-keys-2/`) and found the defects below. Fix each one, or report why it cannot
be fixed and what it would cost.

### Truth gaps (the line is not shown)
1. **ly-2**, "At the top, the rules every agent reads before it starts.": the rules read only as faint speckle.
   They must read as stacks at the top while this line is up.
2. **up-1** (spread), "… Now the defect is in the rules too.": no rule is visible. R1 forming and lit must be in
   frame.
3. **tr-2**, "… one incorrect rule.": R0 must be singled out. It is the one lit rule, and the eye goes to it.
   Today the frame is several equal ember blobs.
4. **fx-3**, "Now new work built from them is correct.": new blue work must visibly arrive, built from the fixed
   rule. An ember tree still lit elsewhere is fine; this is before the trace.
5. **R0's crack must read up close** (tr-2's close shot, and the fixes). It is faint on a phone. The levers are
   R0's motes on its crack cube, the hero count, or the shot.

### Look problems
6. **Halos are huge up close.** The wordless second fix and the trace close-ups fill a third of the phone screen
   with ember fog. Cap a halo's on-screen size, or fade it as its stack's on-screen radius grows. Far shots stay as
   §3.8 designs them.
7. **The twelve read as about ten shapes:** the halos of P1, P2 and P3 merge. Test 12 (exactly twelve
   ember-dominant components) is the arbiter, on both sizes.
8. **The act is dim on a phone overall.** The end of zoom-out is nearly an empty screen; plain code stacks read as
   sparse speckle at medium range; the rules are faint at the wide shots (N18, N20). Lift brightness where the
   frame reads empty, without blowing the first stack or the halos out white.
9. **A rule's body drops off the bottom of the phone frame** at the fix close-ups.
10. **The reviewer's ring is held to the end of the essay.** Ruling: fade it out over the fix section, review
    1.5 → 2 per §2.11, done by the start of lesson. The lesson frame is the clean network alone.

### Tests to add (§6)
- 11: crack near and far.
- 12: exactly twelve, in pixels.
- 14's missing half: a wide shot's top never leaves the viewport. `visibleMachine` ignores off-frame points, so
  this needs its own check.
- 16: the budget.

### Phone budget
The code has no phone budget tier, so a phone draws the same 76k network motes plus 100k bike motes as desktop.
- If the existing mote system has a device tier, use it.
- If not, measure: report frame times from the e2e browser at 390×844 at lesson 0.9 and at a wide shot.
- Add a tier only if the numbers say so, and say which.

## Constraints
- **Text band:** keep the band-crossing camera moves on page turns or wordless stretches, as Tasks 5 and 6 did.
  The clearance test stays the arbiter, and you must not weaken it.
- **Shader mirror pairs:** `mote.glsl`/`mote.ts` and `node.glsl`/`node.ts` change only together, with parity
  passing.
- **Purity:** keep every frame a pure function of scroll.
- **Copy:** never change the essay's words. If a truth gap cannot be closed by picture alone, report it with a
  proposed minimal copy edit for the author.

## Verification
- `npx tsc --noEmit -p .`
- `npx vitest run`
- the full e2e (`E2E_PORT=4199 npx playwright test`). A preview server may already be on 4199, so rebuild `dist/`
  first. Never `playwright install`.

## Stills
Phone first, then desktop. Capture every Act II beat's midpoint plus the wordless moments (spread 0.51,
trace 0.80) into `shots/act2-look/`. Make a phone contact sheet (`montage` is installed) at
`shots/act2-look/phone-sheet.png`.

In the report, list for each beat: the line, what the frame shows, and whether it is true. Use a temporary script
under `shots/` and delete it afterwards.

## Docs
Append "As built (Tasks 5–7)" entries to the design's §11:
- the page-turn moves;
- the shots that moved and why (one line each);
- the ring fade;
- the halo cap;
- anything else that departs from the design.

## Carried from the Task 6 review (fold these in)
- Remove the unused `SECOND_HALF_MOVES` export and the stray blank lines at the end of `netShots.ts`.
- Fix the comment at `plan.test.ts:312`: its control uses a different motion, not the same one.
- Name the bare literals `prev = 0.68` (`networkKeys.test.ts:344`) and `0.47619048` (`netShots.ts:464`).
- Add a committed clearance sample at the rule fix onsets, where the falling motes cross the band. Then try the
  R0 and R1 fix close-ups nearer than distance 12.
- Ruling on the fx-4 `STILL_MOVING` exception: you re-key the fix section anyway for the ring fade. End the last
  highlight fade before fx-4's stop and remove the entry, so every stop is at rest (§6 test 6).

## Commits and report
Commit in logical commits. Write the report to task-7-report.md in this folder. Return only status, commits, a
one-line test summary, and concerns.
