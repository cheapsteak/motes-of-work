# Task 9: the frame is built around the mistake (twin option A), a seated rider, and an ending that lands

Repo <repo>, branch main; commit there, do not push. Read global-constraints.md and
implementer-instructions.md in this folder. Purity invariant: every frame is a pure function of scroll.
Do not change src/scene/mote/mote.glsl or mote.ts. Read docs/adding-a-mechanism.md (contract, lessons:
"blend parameters, not rotations"; "twin normals").

## Why
The author looked at the reveal and said: "it's not obvious that the assembly is wrong; the seat
position looks easily fixable by just turning it." A swap of two bolt-on parts reads as a mistake you
undo with a spanner. The author chose option A: **the frame itself is built around the mistake**, so a
reader sees at a glance that fixing it means a new frame, not turning a part. This is also the essay's
next argument (wrong specs harden into structure), so it must read in a still frame.

## A. Spec first (docs/specs/2026-10-02-motes-of-work-design.md)
Amend in place (no new doc): §1 decisions row "Wrong twin", §4 row I.1b, §5.8 "Wrong twin", §9 bike tests,
so they say: the saddle and handlebars swap posts AND the frame in the twin is shaped around the swap
(as below); every other part keeps its pose and shape. Keep the steering-amplitude cue (STEER_TWIN).

## B. The twin frame (variant 1), bike/shapes.ts + index.ts
The frame part gets a twin shape (`localTwin`/`normalTwin` differ from `local`/`normal`):
- **Saddle mast:** the head tube continues upward into a tall mast that ends at saddle height, and the
  saddle is fixed on its top with a welded-looking cradle (no seat post, no quick-release clamp). The
  mast is the steering column, so it turns with the fork (the existing twin steering does this to the
  saddle; make the mast's upper part follow the steering too — split it into the part that steers, e.g.
  give that geometry to the fork's twin shape or the saddle's, whichever keeps the contract simple; say
  which).
- **Stub seat tube:** the seat tube is cut short, ending a little above the top-tube junction, and the
  handlebars clamp onto that stub through a short stem — low, behind the rider, square, never turning.
- **Top tube rises to the front:** it runs from the top of the short seat tube UP to the tall mast — the
  opposite slope of a normal frame. This slope is the main whole-frame cue; make it unmistakable from
  the reveal camera (aim for at least 15 deg of rise, judged in the reveal still).
- **Cables committed to it:** the brake cables run from the levers on the (rear, low) handlebars forward
  along the top tube to the front brake, and the rear brake's cable is a short loop. Add the cables to the
  brakes' twin shape (or the frame's) as thin tubes; in the correct bike they run the normal way. If cables
  in the correct bike don't exist yet, add them in both variants with a point-for-point mapping.
- **Point correspondence:** sample each tube in its own (u,v) parameter space so point i on a tube in the
  correct frame maps to the same (u,v) on the corresponding tube of the twin frame; derive twin normals from
  the twin surface. The continuity test must pass (every part moves continuously across the morph).
  Keep point counts/shares within the existing pinned tests (update the pin table only if a share change is
  required, and say so).
- **Direction cues (both variants, unchanged by the morph):** a small headlamp on the fork crown and a red
  reflector on the rear mudguard, so the bike can never read as "a normal bike facing the other way". They
  belong to existing body parts (fork, mudguard-rear) so no new part ids, settle windows or brief lines.
- The correct bike (variant 0) must stay visually and dimensionally as it is (its contact-point tests keep
  passing unchanged).

## C. The rider must read as seated on the twin's saddle
At the reveal the mannequin reads as a big figure standing behind the bike. Re-pose (keep proportions and
the existing intent: hips on the twin saddle, hands closed on empty air where a rider's bars would be, feet
hanging well ahead of the pedals, does not pedal, turns with the saddle):
- thighs roughly horizontal and pointing forward (direction of travel) from the saddle, knees bent so the
  shanks hang, feet clear of the ground by at least 0.1 m; torso leaning forward 10-20 deg from vertical;
- re-check the hand/foot clearance tests against the new saddle height on the mast (hands at least 0.3 m
  from the twin's actual handlebars, feet at least 0.2 m from every pedal at all reveal drives) and add a
  test that the lowest rider point is at least 0.1 m above the ground plane;
- if the reveal camera needs a small change for the bike + rider to read (seated, in frame, clear of the
  text), make it and keep the reveal camera test's intent.

## D. Copy (src/story/02-reveal.md), draft, publication-safe
Update the second paragraph to match the new twin, e.g.:
"Now try to ride it. The seat is welded to the top of the steering column. The handlebars stick out of a
stub where the seat tube should be, and the whole frame is shaped around them. You can't turn the seat
around; you'd need a new frame. Nothing in it is warm: no person touched the parts that meet a person."
Keep within the section's word budget (content tests); trim elsewhere in the section if needed. Update the
`alt` text to describe the new twin. Also update the landing-page-independent docs: README status line if it
describes the twin.

## E. The ending lands (bug the author found)
The spec section is the last section for now, and the author says the gold core does not finish settling
into the outline by the end of the scroll ("would need to scroll a bit more"). Cause: mech.assembly reaches
0.45 (the core window's end) exactly at spec@1. Fix: reach a value a little past the core's settle end (so
every core mote has landed, with margin for any per-mote ease) by about spec@0.8 and hold to spec@1; keep
drive slowing to rest. Check the scroll driver can actually reach p = 1 at the bottom of the page (e.g.
scrollHeight - innerHeight maps to p = 1 at both 1440x900 and 390x844). Add a test: at the maximum scroll
position every core mote is settled (its settle progress is 1) and at spec@0.8..1 the core does not move.

## Verification
tsc; vitest; full e2e `E2E_PORT=4199 npx playwright test`; `SHOTS=1 E2E_PORT=4199 npx playwright test
e2e/shots.spec.ts e2e/compare.spec.ts`. Capture your own frames with `?test=1` into shots/task9/ at 1440x900
and 390x844 for p in {0.41, 0.48 (reveal held), 1.0} plus a twin close-up of the frame from the reveal camera
without the rider (e.g. compare page twin preset) — fresh page per URL; never `playwright install`. Look and
say honestly: does the frame read as built around the mistake (could a reader still think "just turn the
seat"?), does the rider read as seated, is the end state the core settled in the outline.

Commit in logical commits (spec, twin frame + cues, rider, copy, ending). Report to task-9-report.md here;
return only status, commits, one-line test summary, screenshot paths, concerns.
