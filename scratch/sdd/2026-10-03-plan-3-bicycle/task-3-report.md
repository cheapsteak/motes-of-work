# Task 3 report: the brief card and the reveal section

Status: DONE_WITH_CONCERNS (copy trims, one out-of-scope test change; see Concerns).

## What I implemented
- `src/story/brief.ts`: `parsePartList`, `matchesPart`, `BriefLine`, `parseBrief` (DOM glue), `briefThresholds` (max `settleWindow(part)[1]` over matched parts; 1 when no part matches), `applyBrief` (`toggleAttribute('data-met', assembly >= threshold)`).
- Story: `01-vibe-build.md` carries the brief card; new `02-reveal.md` (`id: reveal`, length 2, draft); `git mv` of rewind to `03-rewind.md` and spec to `04-spec.md` (ids unchanged); spec gets "The brief listed parts. It never said how a body uses them."
- `src/main.ts`: lines and thresholds computed once after `renderStory`; `applyBrief(..., sceneStateAt(p).mech.assembly)` runs in the scroll driver callback, which the driver also calls once synchronously at creation. It does not depend on the renderer, so the `showWithoutWebGl` and context-loss paths still tick.
- `src/style.css`: bordered card (`div.brief`), `ul.brief` list with a CSS check box per line that fills with a tick when `data-met` is set. No transition.
- `src/timeline/keyframes.json`: added `mech.drive` `reveal@1 = 3.5` and `camera.pos` `reveal@1 =` the `vibe-build@1` framing. Assembly, variant and vibed already hold through `reveal` (keys at `vibe-build@0.7` / `rewind@0` are 1 and linear between equal values); the new test fences that. Rewind's drive now runs 3.5 to 0 with no key change (the `reveal@1` key is rewind's start).

## Tests and results
- `npx vitest run`: 45 files, 616 tests pass. `npx tsc --noEmit -p .`: clean.
- e2e (`E2E_PORT=4192`): `brief.spec.ts` 6/6; `app.spec.ts` 15/15 after fixing one test (below); `purity.spec.ts`, `smoke.spec.ts`, `reducedMotion.spec.ts` pass (7 passed; shots skipped without `SHOTS=1`). I started a run of `looks`, `compare`, `parity` and `spikes` but stopped it early on time (about 8 of 68 had passed, none failed). Those specs do not read story sections or keyframes; the controller may want a full run.

## TDD evidence
- RED: `brief.test.ts` written first; `mv src/story/brief.ts` away, `npx vitest run src/story/brief.test.ts` gave "Test Files 1 failed, Tests no tests" (import of `./brief` unresolved). GREEN after restoring: 10 passed. (I had written the implementation before the first run, so I demonstrated RED by removing it.)
- Content tests: first run after the story edit failed on word counts (vibe-build 81, spec 90), driving the trims below; then 49 story tests pass. The sync fence (`only names parts the bike has`) is a set-membership check over every `data-parts` token.
- Keyframes: `keyframes.test.ts` now expects `['vibe-build','reveal','rewind','spec']`, covers `reveal` in the vibed/wrong-twin/no-ghost test, and a new test holds assembly 1 and the camera still through the reveal with drive rising 2 to 3.5.

## Files changed
src/story/brief.ts, brief.test.ts, content.test.ts, 01-vibe-build.md, 02-reveal.md (new), 03-rewind.md, 04-spec.md (renamed), src/main.ts, src/style.css, src/timeline/keyframes.json, keyframes.test.ts, src/mechanisms/continuity.test.ts, e2e/brief.spec.ts (new), e2e/app.spec.ts.

Commits: 515d06f, bab0f43, ab4ade7.

## Self-review and deviations
- Word limit: the brief copy came to 81 words, so I dropped "both" from "both adjustable so it fits..." (now 80). The spec section came to 90; I cut "Now there is something to aim at.", "(why this exists)" to "(why)", and "intended" from "the intended machine" in the last paragraph (now 79). The wording is draft, so the author can reinstate.
- `e2e/app.spec.ts`: the "?p=0.5" test now uses 0.6. With four sections, 0.5 is exactly the reveal/rewind boundary, where the reveal panel's bottom edge is still on the centre line, so "only its section in view" cannot hold. 0.6 is mid-rewind.
- `src/mechanisms/continuity.test.ts` (outside the brief's file list): the watch's escape wheel failed the halving check along the story (ratio 0.608, was 0.51) because the rewind now unwinds 3.5 drive units instead of 2 in the same scroll, so 2000/4000 samples are no longer in the halving regime. I raised the story sampling to 4000/8000 with a comment. Other mechanisms and the drive sweeps pass unchanged. A reviewer may prefer a different remedy (gentler rewind drive keys).
- Screenshots viewed (1280x720, `?mech=bike&n=3000`): at p=0.12 the card shows four ticked boxes and an empty box on the frame line, over a dim bike; at p=0.29 (late vibe-build, reveal panel entering) all five ticked. The card reads cleanly; the boxes and tick glyphs are centred. The bike is dim only because of the lowered budget.
- `content.test.ts` is not prettier-clean at HEAD (pre-existing); I matched its style rather than reformatting the file.

## Concerns
- In the default essay (gears on stage until Task 4) every line ticks only at full assembly, as expected.
- The reveal panel text overlaps the vibe-build panel at the boundary in the p=0.29 shot only because both panels are sticky at that moment; that is the existing layout.

## Fix report (coordinator follow-ups)
1. Restored "both" in the seat line and trimmed the closing line to "The swarm floods in. Every requirement is met." (commit 7798534). Covering test: `npx vitest run src/story` gives 49 passed, so every section stays within 80 words.
2. Full e2e, once, to completion: `E2E_PORT=4192 npx playwright test` gave 89 tests, 82 passed, 7 skipped (the `shots.spec.ts` tests, which need `SHOTS=1`), 0 failed, 0 flaky, exit 0, 7.8 min. This includes looks, compare, parity and spikes, which my earlier run had not finished. Nothing needed fixing.
