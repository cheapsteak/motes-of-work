# Task 16: Act I copy and timing edits from the author

Repo /home/user/motes-of-work, branch main (HEAD d6158c5 or later); commit there, do not push. Read
global-constraints.md, implementer-instructions.md and task-14-report.md / task-15-report.md in this folder.

The author's words (2026-10-05):
- "For the 'build me a bike' section, let's bring the 3d animation up to happen at the same time as the text."
- "Let's delete or rephrase 'Look at the colours. Every dot is blue.' This doesn't make sense to readers; we don't want
  readers to have to know what blue and dots mean, at least not in act 1. ... Maybe we just cut that slide."

## Changes
1. **Simultaneous build (vibe-build).** Each brief line's parts start flying in at the moment the line appears (no
   reading-time lead before the parts set out). Keep the four stages in order and non-overlapping where the design
   needed that (each line's parts land before the next line appears is fine; the next line may appear as the previous
   parts land). Update the ordering fence to the new rule: a line's parts never set out before the line appears, and
   set out within a short tolerance of it (say <= 0.1 screen after). Re-time the section; it should get shorter
   (the reading leads are gone). Keep the front-wheel turn, the frame laid tube by tube, and the orbit as they are.
2. **No colour or dot vocabulary in Act I copy.**
   - Cut the reveal beat rv-6 ("Look at the colours. Every dot is blue. ...") entirely; re-time the reveal to close the gap.
   - Cut vb-3 ("See the blue dots? ...") — the cloud needs no explanation; vb-2 leads straight into the list. Re-time.
   - Rephrase sp-6 without colour or dots, e.g. "You looked closely at the parts a person touches, so they land first: the
     seat, the handlebars and the pedals." (keep within the line limits; a close variant is fine).
   - Alt text may still describe colours (it describes the picture for screen readers).
   - Add a content test: Act I narration (not alt text) contains none of the words blue, gold, orange, dot, dots, colour,
     colours, color, colors.
3. Keep both design docs consistent (docs/specs/2026-10-04-act-1-storyboard-and-text-engine.md tables read by the sync
   fence, docs/specs/2026-10-05-act-1-build-and-orbit.md, docs/specs/2026-10-05-blueprint-and-build.md where they quote
   these lines): mark the edits with the date and the author's reason.

## Verification
tsc; vitest; full e2e `E2E_PORT=4208 npx playwright test`; `SHOTS=1 E2E_PORT=4208 npx playwright test e2e/shots.spec.ts`.
Frames at 1440x900 and 390x844 into shots/task16/: each brief line just as it appears (parts already in flight), the
reveal's pages, sp-6. Fresh page per URL; never `playwright install`.

Commit in logical commits. Report to task-16-report.md here; return only status, commits, one-line test summary,
screenshot paths, concerns, and the new Act I length in screens.
