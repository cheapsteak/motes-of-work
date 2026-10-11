# Task 14: the opening build in order, the frame laid tube by tube, and the "Done" orbit

Repo /home/user/motes-of-work, branch main (HEAD 484f248 or later); commit there, do not push. Read
global-constraints.md and implementer-instructions.md in this folder.

Requirements: docs/specs/2026-10-05-act-1-build-and-orbit.md — read it whole; the author approved it ("Go") and chose
the frame entrance Option A (laid in a frame builder's order, tube by tube, with the landing flare). It amends
docs/specs/2026-10-04-act-1-storyboard-and-text-engine.md (§1 vb copy, §2.1 storyboard, §3 brief handling); keep
that doc consistent (the sync fence reads its tables) and record what changed as built.

Build all of it: the 4-line brief (brakes line gone; brake calipers settle with the frame), each brief line absent
(opacity 0, not dim) until its own `data-at`, words before parts (the ordering fence), the re-cut settle windows and
SETTLE_WINDOW change, the front wheel's own turning segment before the frame, the frame laid in FRAME_LAY order via
the settleField hook (frame exploded offset identity; the twin inherits point for point), the landing flare (mote.glsl
AND its TS mirror mote.ts together; the parity e2e must pass; no flare at rest), the one-lap "Done" orbit generated
from waypoints, the vibe-build at 8 screens, and every test in its §6.

Look at your frames: each brief line appears alone first, then its parts fly in; the frame visibly builds tube by
tube with a travelling seam; the wheel turn is its own beat; the orbit is lively (low pass, crane behind, telephoto,
dive onto the saddle) and keeps the text clear; it ends where the reveal begins.

Verification: tsc; vitest; full e2e `E2E_PORT=4205 npx playwright test`; `SHOTS=1 E2E_PORT=4205 npx playwright test
e2e/shots.spec.ts e2e/compare.spec.ts`. Frames at 1440x900 and 390x844 into shots/task14/: every brief line just after
it appears and again mid-build, four frames through the frame's laying, the wheel turn at both locks, and eight frames
through the orbit. Fresh page per URL; never `playwright install`.

Commit in logical commits. Report to task-14-report.md here; return only status, commits, one-line test summary,
screenshot paths, concerns, and any beat that fails to show its line.
