# Task 11: remove the mannequin, the running labels and the text switcher; text style C only

Repo /home/user/motes-of-work, branch main; commit there, do not push. Read global-constraints.md and
implementer-instructions.md in this folder. Purity invariant holds. Do not change mote.glsl / mote.ts.

The author's words: "Remove the mannequin, I don't feel like it's adding anything besides distraction."
"Delete the metadata looking things that don't add much for the reader e.g. '01 — The brief'." "C looks the closest."

Do NOT edit the story copy (src/story/*.md body text) or the camera/motion keyframes beyond what removal needs:
a designer is rewriting the copy, storyboard and text engine in parallel; a later task rebuilds those.

## Remove the mannequin entirely
- Delete src/mechanisms/bike/rider.ts and its tests, the optional `rider` field from the Mechanism contract
  (src/mechanisms/types.ts), src/scene/mote/riderPoints.ts and every renderer/compare hook that draws it, the
  `overlay.rider` SceneState leaf (defaults, leaf list, keyframes track, sampler), and the e2e/purity checks that
  include it. Remove its CREDITS.md entry (Winter / Drillis and Contini) if nothing else cites it.
- Spec (docs/specs/2026-10-02-motes-of-work-design.md): remove the mannequin from §4 I.1b, §5.8 Staging and §9;
  keep the rest of the twin description (frame built around the swap, basket, rack). docs/adding-a-mechanism.md:
  remove the `rider` contract line and section. README if it mentions it.
- Reveal camera: it was pulled back for the seated figure; you may pull it back in (keep the reveal camera test's
  intent: elevated front three-quarter, fov <= 33, whole bike in frame and clear of the text).

## Remove the running labels
- Drop the `label:` front matter key and its rendering, styles and tests ("01 — The brief" etc.). Also drop the
  brief's "The brief" mono label (text style C already hid it visually; remove it from the DOM unless needed for
  screen readers — if kept, keep it visually hidden).

## Text style C only
- Make style C the essay's one style: fold the `[data-text="c"]` rules into the base CSS, delete style A and B
  rules, the switcher module (src/draft/textSwitcher.ts and tests, the e2e/textSwitcher.spec.ts), the data-text
  attribute handling, and the fonts nothing uses any more (Plex Sans/Mono; Newsreader; Geist Mono unless C uses it),
  with their CREDITS.md entries. Keep the no-borders, no-transition and met-line e2e checks (now for C only) and the
  "readers download only the fonts they use" check if it still makes sense.

## Verification
tsc; vitest; full e2e `E2E_PORT=4202 npx playwright test`; `SHOTS=1 E2E_PORT=4202 npx playwright test e2e/shots.spec.ts
e2e/compare.spec.ts`; capture `?test=1` frames at 1440x900 and 390x844 for p 0.09, 0.27, 0.45, 1.0 into shots/task11/.
Commit in logical commits (mannequin, labels, style C). Report to task-11-report.md here; return only status, commits,
one-line test summary, screenshot paths, concerns.
