# Task 12: the text engine, the picture-book copy and the text-above-the-machine layout

Repo /home/user/motes-of-work, branch main (HEAD at the latest commit); commit there, do not push. Read global-constraints.md
and implementer-instructions.md in this folder. Do not change mote.glsl / mote.ts.

Your requirements are the design doc: docs/specs/2026-10-04-act-1-storyboard-and-text-engine.md — read it whole.
It was approved by the author with one edit already applied (the rewind is one line, one screen; §6 settles the
open questions). Research behind it: research-text-apparition.md in this folder.

## This task builds
- §1 The copy: every section's text exactly as the tables give it (and the alt texts), the brief document with its
  `data-parts` mapping and reading-order lighting.
- §3 The text engine whole: §3.1 beats in the story markdown (`<!-- beat ... -->`, `<!-- page -->`), §3.2 opacity
  from progress (pure; written from the scroll driver; no CSS transitions), §3.3 the dwell lint, §3.4 layout (text
  ABOVE the machine on desktop and portrait; no labels; no boxes), §3.5 the brief, §3.6 accessibility, §3.7 no-JS /
  no-WebGL, §3.8 type (style C).
- Section lengths from §2.5 (vibe-build 6, reveal 4, rewind 1, spec 6) and each beat's appear/leave timings from the
  "Appears → leaves" columns of §2.1–2.4.
- The §4 tests that concern the engine, copy, ordering, purity, layout, no boxes/transitions, no-JS/no-WebGL,
  dwell lint and the storyboard-copy sync fence.

## Not this task (Task 13 does it next)
The camera shots and motion of §2 (S0–S9, the shot pins), the two new SceneState scalars `mech.steer` and
`camera.frame` (§2.6), and the machine-clearance e2e test. Keep the existing camera/motion keyframes, but rescale
their section-local positions so they still fit the new section lengths sensibly (the keys are "<section>@<0..1>",
so they stretch automatically; check the bike still assembles while the brief is up, the reveal holds still while
its lines are up, and the core lands by spec@0.8). Text may overlap the machine in this task's frames; Task 13 fixes
framing. Do not add the clearance test yet.

## Notes
- Existing tests that pinned the old copy, labels, panel fade, word budgets (§7 of the main spec says <= 80 words per
  section panel — the new model is per beat/page; update the content rule and its test to the design's limits:
  page <= 3 lines and <= 26 words except the document beat) must be updated to the new model, not deleted silently;
  say which you changed and why.
- Main spec docs/specs/2026-10-02-motes-of-work-design.md: update §4 Act I rows, §7 content rules and §6/§8 where the
  text model changed, pointing to the new doc rather than duplicating it.

## Verification
tsc; vitest; full e2e `E2E_PORT=4203 npx playwright test`; `SHOTS=1 E2E_PORT=4203 npx playwright test e2e/shots.spec.ts`.
Capture `?test=1` frames at 1440x900 and 390x844 into shots/task12/ at one progress inside every page (name them by
beat id) — fresh page per URL; never `playwright install`. Look at them: does each line appear only on its turn, do
pages never overlap, is the text above the bike.

Commit in logical commits. Report to task-12-report.md here; return only status, commits, one-line test summary,
screenshot paths, concerns.
