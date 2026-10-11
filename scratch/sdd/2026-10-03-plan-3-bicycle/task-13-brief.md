# Task 13: the storyboard — every line's camera shot and motion

Repo /home/user/motes-of-work, branch main (after Task 12, 808f6e9); commit there, do not push. Read
global-constraints.md and implementer-instructions.md in this folder. Do not change mote.glsl / mote.ts.

Requirements: docs/specs/2026-10-04-act-1-storyboard-and-text-engine.md §2 (all of it) and the §4 tests that
concern shots, motion and clearance. Task 12 built the text engine, copy, section lengths (6/4/1/6) and beat
timings, and adopted §2.5's cold-open/reveal assembly and drive keys; read task-12-report.md for what it left.

## This task builds
- The three new SceneState scalars of §2.6 and §2.4: `mech.steer` (additive steering, clamped, pure),
  `camera.frame` (per-orientation lens shift; the portrait rig keeps the authored target), and
  `mech.ghostVariant` (the ghost outline drawn in the twin shape, morphing to the correct one; ghost shaders
  are src/scene/mote/shaders/ghost.*.glsl, separate from the mote shader — add the twin positions to the ghost
  pipeline; parity is unaffected). Defaults reproduce today's frames exactly; add each leaf to the defaults and
  leaf list.
- Every shot S0–S10 (incl. S1′, S6g, S9′, S10′) as camera keys, converted once from bike metres to the rig's
  machine-relative terms, with a test per shot in bike terms (bearing, elevation, distance, fov, target) as the
  existing bearing/elevation tests do.
- Every motion row of §2.1–§2.4: drive, assembly, steer swings, ghost and ghostVariant, coreFocus, provenance and
  variant, the spec section's "drawing first" sequence ending on the finished bike riding.
- The machine-clearance e2e test (§4): at 1440x900 and 390x844, at a progress inside every page, the projected
  visible machine (settled motes, ghost) does not enter the text band (with a small margin), and the essay's last
  frame shows the finished bike. Retire the keyframes test that still measures framing against the old left-hand
  text column, replacing it with the new framing intent.
- The phone: Task 12 notes the machine overlaps the text on portrait because the rig lifts the machine; fix with
  `camera.frame` / the portrait rig as §2.6 says.

## Judgement
The doc's numbers are starting values. Tune by looking: each line must be true of the frame while it is up (the
front wheel visibly turning on "The front wheel turns", the seat cocking with the wheel on rv-3, square bars on
rv-4, the wrong drawing on sp-3, the redraw on sp-4, gold landing on sp-6, blue building the rest and the bike
riding on sp-7). Where a number had to change, say what and why. Keep the continuity and purity tests green.

## Verification
tsc; vitest; full e2e `E2E_PORT=4204 npx playwright test`; `SHOTS=1 E2E_PORT=4204 npx playwright test
e2e/shots.spec.ts e2e/compare.spec.ts`. Capture `?test=1` frames at 1440x900 and 390x844 at a progress inside
every beat into shots/task13/ (named by beat id), fresh page per URL; never `playwright install`. Look at every
one and say honestly, beat by beat, whether the frame shows what the line says.

Commit in logical commits (scalars, shots, motion, spec drawing, clearance). Report to task-13-report.md here;
return only status, commits, one-line test summary, screenshot paths, concerns, and a one-line verdict per beat
that fails to show its line.
