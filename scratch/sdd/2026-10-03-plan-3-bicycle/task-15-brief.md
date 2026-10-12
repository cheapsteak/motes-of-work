# Task 15: the ink drawing on parchment, the lift into 3D, and two fixes from Task 14

Repo <repo>, branch main (HEAD 1665537 or later); commit there, do not push. Read
global-constraints.md and implementer-instructions.md in this folder, and task-14-report.md.

## A. Two fixes first (small)
1. The author: "don't show the list until the corresponding scene gets activated ... not grayed out." Task 14 shows each
   brief line absent until its turn (correct) but then shows it in --ink-dim until its parts land, which reads as
   greyed out. Make a visible brief line full ink from the moment it appears; mark the met state another way (style C's
   faint blue halo / a subtle brightening glow on met), never by dimming. Update the brief tests (a visible unmet line
   has full-ink colour). Also check other beats: no visible line should ever read greyed out except the design's
   "earlier lines on a page dim" rule for narration — keep that rule only if the dim is gentle (opacity >= 0.7); if it
   reads as greyed out, raise it.
2. The landing flare is faint (Task 14 concern 5). Raise MOTE_FLARE_GAIN (and width if needed, both mirrors, parity)
   until a travelling seam is clearly visible in the frame-laying frames at 1x, without blowing out to white; show
   before/after crops.

## B. The design
Requirements: docs/specs/2026-10-05-blueprint-and-build.md — read it whole; the author approved it ("Go on both
designs"). It replaces the spec section's ghost-dots drawing with authored ink strokes on a parchment sheet in the
scene (instanced screen-space stroke quads, no point rendering), dims the motes behind it, does the redraw as
strike-and-redraw with the person's gold ring and tick, and adds the lift-off scene (the drawing becomes 3D and gets
built: gold first, then blue), the spec section at 8 screens with the copy edits. Keep
docs/specs/2026-10-04-act-1-storyboard-and-text-engine.md consistent (the sync fence reads its tables) and record what
changed as built. mech.ghost / ghostVariant stay for later use but are 0 in this section. Build every test in its list.

Look at your frames: the drawing must not look like particles at all; it must read as ink on parchment; the wrong
drawing must be legible (seat over the front wheel); the redraw must read as lines being redrawn; the lift must read as
the drawing becoming the 3D bike; gold lands before blue; the essay ends on the finished riding bike.

## Verification
tsc; vitest; full e2e `E2E_PORT=4206 npx playwright test`; `SHOTS=1 E2E_PORT=4206 npx playwright test e2e/shots.spec.ts
e2e/compare.spec.ts`. Frames at 1440x900 and 390x844 into shots/task15/: every spec beat, four frames through the stroke
draw-in, three through the redraw, four through the lift-off, and the last frame; plus the brief-line fix (a line just
appeared) and the flare crops. Fresh page per URL; never `playwright install`. Check performance: report the frame time
of the drawing scene in Chromium (headless SwiftShader numbers are fine as a relative check against the build scene).

Commit in logical commits. Report to task-15-report.md here; return only status, commits, one-line test summary,
screenshot paths, concerns, and any beat that fails to show its line.
