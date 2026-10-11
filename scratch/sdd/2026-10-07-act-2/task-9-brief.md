# Act II, Task 9: the powers-of-ten zoom-out

Repo /home/user/motes-of-work, branch main; commit there, do not push. First read global-constraints.md and
implementer-instructions.md in this folder, and the repo's CLAUDE.md. Phone first; every frame is a pure function of
scroll.

## What to read

- docs/specs/2026-10-06-act-2-storyboard-and-network.md:
  - §12, all of it: the author's words, and the design that answers them;
  - §2.1 and §2.2: zoom-out's and layers' beats;
  - §3.9: the camera rig;
  - §11's "As built" notes: why a side-on pull-back fails the text band.
- This folder:
  - task-5-report.md: the page-turn moves, the clearance search method, and the shared `cameraSpline.ts`;
  - task-8-report.md: the box bodies, and N0 drawn by the node set.

## The task

Build §12.3 task 9. The author wants the zoom-out to feel like the film shots that pull back from a street to the
earth, to the solar system, to the galaxy. Specifically:

1. **One continuous pull-back.** The camera leaves Act I's last shot (the zoom-out 0–0.02 boundary must stay equal
   to Act I's last key), rises to look straight down on the bike, and then pulls straight up without stopping
   through the rest of zoom-out. The camera never holds still in zoom-out.
   - Use a generated spline through the shared `cameraSpline.ts`, pasted into keyframes.json and held by a
     regeneration test to 1e-3, as Tasks 5 and 6 did.
   - Choose the end distance so zoom-out ends on a field of stacks, with the first stack one small stack among
     many.
2. **Reflow and births together.**
   - The bike loosens into cubes while its neighbours are being built round it. The first neighbouring code
     stacks are born as `mech.reflow` begins, not after it.
   - `net.growth` may need to start earlier and rise across the whole section. Key it against
     `src/network/schedule.ts`, not copied numbers.
   - Every schedule test must still hold: the twelve exact at df-5, `CLEAN_AFTER`, monotone growth, and the rest.
   - If the generator's births near N0 are too late or too few for this, adjust the keys first. Change the
     scripted lineage only if you must, and report it.
3. **Shrinks to match.** By zoom-out's end the first stack is on screen at its neighbours' size, and Task 8 made it
   drawn as they are.
4. **Overhead to side, on the page turn.** The layers section needs a side view for its lines ("At the top…", "In
   the middle…", "At the bottom…"). Move from overhead to layers' first shot on the zoom-out → layers page turn, as
   Task 5's band-crossing moves do. Keep layers' later shots as they are unless clearance forces a change.
5. **Clearance is the arbiter. Search before you key.** Search the overhead pull-back numerically with the
   clearance measure, on both sizes and at every zoom-out sample. The vertical angle and the target height are the
   free parameters.
   - If straight overhead fails, find the steepest elevation that passes and report the numbers.
   - If nothing continuous passes, report what fails and by how much, rather than cutting the pull-back into page
     turns. The author asked for continuous.

## Stops

zoom-out's two stops now sit on a moving camera, so they cannot be "at rest". Two options:
- Add `STILL_MOVING` entries for zoom-out's camera (and growth) with the reason.
- Or, if a short ease-out at each stop reads better, let the camera slow and briefly settle at each stop's moment
  while the motion stays continuous.

Choose one and justify it in the report. The author's rule is one stop per scene, at its end.

## Verification

- `npx tsc --noEmit -p .` and `npx vitest run`.
- The full e2e suite (`E2E_PORT=4199 npx playwright test`). Rebuild `dist/` first; never `playwright install`.

## Look, phone first

Capture into `shots/act2-zoom/`:
- a frame strip of zoom-out, 12 frames evenly from local 0 to 1, at 390×844 and then 1440×900, each tiled with
  `montage` into one sheet;
- the layers page-turn move, 6 frames.

Use a temporary script under `shots/`, then delete it. In the report, say plainly whether it reads as one
continuous pull-back, and whether the first stack ends indistinguishable.

## Commits and report

- Commit in logical commits. Commit messages must be publication-safe.
- Report to task-9-report.md in this folder.
- Return only status, commits, a one-line test summary, and concerns.
