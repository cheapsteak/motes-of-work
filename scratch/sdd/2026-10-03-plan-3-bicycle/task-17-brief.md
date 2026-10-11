# Task 17: the basket gets its own line and its own entrance

Repo /home/user/motes-of-work, branch main (HEAD e251122 or later); commit there, do not push. Read global-constraints.md,
implementer-instructions.md and task-16-report.md in this folder.

The author (2026-10-05): "'The front wheel turns, so you can steer.' We add the basket in that animation too. How about
mention something like 'and a basket too for holding stuff'. Can we animate the basket in after the wheel turns?"

## Changes
1. **Brief line.** Add a new brief line right after the front-wheel line: "A basket too, for carrying things." (picture-book
   voice; a close variant is fine). The brief becomes five lines: seat and handlebars; wheels and chain; front wheel turns;
   basket; sturdy frame. Every line must still be met by the twin (it has the basket).
2. **The basket as its own stage.** Today the basket (and its headlamp) are geometry inside the fork part, so they land with
   the front wheel. Recommended: split them into their own body part `basket` (same geometry in both variants, so the twin
   mapping is trivial), with its own settle window placed after the front wheel's turning segment and before the frame;
   re-pin point counts (pointCounts.test.ts) and keep part shares sensible. If splitting is clearly worse, use the
   settleField hook on the fork instead and say why. The basket line appears as its parts set out (Task 16's simultaneous
   rule and its ordering fence apply). Give the basket an entrance with a little character (e.g. it drops in and settles
   onto the fork), staying pure-of-scroll.
3. **Camera.** During the basket's stage, frame the front of the bike so the basket landing reads (reuse the front-wheel
   shot or a slight move from it), keeping the text clear (clearance test).
4. Keep the design docs consistent (2026-10-04 storyboard tables read by the sync fence; 2026-10-05 build-and-orbit) and
   date the change with the author's reason.

## Verification
tsc; vitest; full e2e `E2E_PORT=4213 npx playwright test`; `SHOTS=1 E2E_PORT=4213 npx playwright test e2e/shots.spec.ts e2e/compare.spec.ts`.
Frames at 1440x900 and 390x844 into shots/task17/: the wheel turn just before the basket line, the basket line just appearing,
two frames of the basket landing, and the frame line appearing after. Fresh page per URL; never `playwright install`.

Commit in logical commits. Report to task-17-report.md here; return only status, commits, one-line test summary, screenshot
paths, concerns.
