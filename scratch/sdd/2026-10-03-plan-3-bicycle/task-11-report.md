# Task 11 report: remove the mannequin, the running labels and the text switcher; text style C only

Status: DONE_WITH_CONCERNS (the concerns are all from before this task; see below)
Base: ea05ca3. Commits on main, not pushed:

- 3cc5bc7 bike: remove the reveal mannequin
- 71aa683 story: drop the running labels and the brief label
- b0e2ff8 text: style C is the one style; the switcher and unused fonts go

44 files changed, 183 insertions, 1674 deletions. `mote.glsl` and `mote.ts` are unchanged. The story body copy is unchanged apart from two removals the brief asked for. I did not touch the designer's untracked `docs/specs/2026-10-04-act-1-storyboard-and-text-engine.md`.

## What I did

### 1. Mannequin (3cc5bc7)
- Deleted `src/mechanisms/bike/rider.ts`, `rider.test.ts`, `src/scene/mote/riderPoints.ts` and `riderPoints.test.ts`.
- Removed the `Rider` interface and the optional `rider` field from `src/mechanisms/types.ts`. The bike no longer exports a rider. I also dropped the now-unused `samplePart` and `Rider` imports.
- In `moteSystem.ts`, removed the rider point set: create, update, dispose and the header comment.
- Removed the `overlay.rider` leaf from SceneState: the type, `defaultSceneState`, `SCENE_STATE_PATHS` and the `keyframes.json` track. The sampler is generic over the tracks, so it needed no code change.
- Tests:
  - `keyframes.test.ts`: the reveal framing test now covers the bike and ground only. The rising-mannequin clause and the "seats the grey mannequin" test are gone.
  - `portrait.test.ts`: no rider points. The vacuity guard now checks that the frames show the twin.
  - `e2e/machine.ts`: no rider points.
  - `e2e/purity.spec.ts`: the mannequin frame test is gone.
  - A comment in `e2e/portrait.spec.ts` no longer mentions the rider.
- Docs:
  - Spec §4 I.1b: the mannequin sentence is gone.
  - Spec §5.8 Staging now reads "No rider is ever drawn: the warm contact points stand in for the person."
  - Spec §9 Bicycle tests: the mannequin clause is gone.
  - The rest of the twin description is kept: the frame built around the swap, basket and rack.
  - `docs/adding-a-mechanism.md`: the `rider` contract line and its section are gone.
  - `CREDITS.md`: the Winter / Drillis and Contini / Wang and Peng entry is gone, since nothing else cites it. The README had no mention.
- Reveal alt text (`02-reveal.md` front matter): I removed the sentence about the dim grey figure, because the alt text must describe what is drawn.
- Reveal camera:
  - It moves in by 10% along its line of sight. The camera position and target also drop 0.1 machine radii, so the bike sits nearer the vertical centre; it sat low because the figure used to fill the top.
  - reveal@0.3: pos [1.952, 2.12, 3.123], target y 0.03.
  - reveal@1: pos [1.553, 1.917, 3.256], target y 0.09.
  - Bearing, elevation and fov 33 are unchanged.
  - I measured the extents before choosing these values. At 1280x720 the bike now spans NDC x 0.05..0.79 and |y| <= 0.83. At 1440x900 x reaches 0.88. At 390x844 x is -0.58..0.70 and y is -0.06..0.51.
  - The existing tests pass: panel edge +0.03, x < 0.95, |y| < 0.93, high front three-quarter, top tube >= 15 degrees, and the portrait upper frame.

### 2. Running labels (71aa683)
- Removed the `label:` front matter key from all four sections, `StorySection.label`, the loader parsing, the `run-label` rendering in `dom.ts`, and the label styles in `style.css` and in the A/C blocks.
- Removed `<p class="brief-label">The brief</p>` from the DOM entirely. The paragraph before it ("You hand an agent a brief.") already introduces the brief, so a screen reader loses nothing.
- Tests:
  - `content.test.ts`: dropped the label lint and the "running label" format test. The brief test now checks that the brief opens on its ask with no `brief-label`.
  - `loader.test.ts`: dropped the label tests.
  - `e2e/text.spec.ts`: "every panel opens with its running label" became "no panel carries a running label". The font test no longer reads `.run-label`.
- At this commit `--ink-mute` was already gone while the draft switcher still used it. The switcher's text colour was inherited for one commit; the next commit deletes the switcher.

### 3. Style C only (b0e2ff8)
- Folded the `[data-text='c']` rules into `src/style.css`:
  - Body text: Literata 1.1875rem/1.55 with the layered stage-colour shadow.
  - No feathered pool: the `.panel::before` rule and `isolation` are deleted.
  - `div.brief` has no gutter.
  - The ask is set in Instrument Serif italic, 1.8rem/1.2.
  - The lines have no marker. The li `::before` mote rules are deleted.
  - A met line takes full ink plus a blue halo in its text shadow.
  - Portrait sizes: body 1.0625rem, ask 1.45rem, lines 1rem with 0.34rem padding.
  - The B-only look (Newsreader, mote markers, pool) is gone.
- Deleted `src/text-options.css`, `src/draft/textSwitcher.ts`, `.test.ts`, `.css` and `e2e/textSwitcher.spec.ts`, plus the imports and mount call in `main.ts`. Nothing sets or reads `data-text` any more.
- Fonts:
  - Deleted the Newsreader (3), Geist Mono (2), IBM Plex Sans (2) and Plex Mono (2) WOFFs, their `@font-face` rules and their CREDITS entries.
  - The credits test drops their copyright checks.
  - Kept Literata regular and italic, and Instrument Serif italic.
- e2e checks, now for C only (`e2e/text.spec.ts`):
  - No border, fill, box-shadow, or `::before`/`::after` content on any panel element.
  - No transition or animation on brief lines or on panels.
  - A met line brightens, takes a blue halo and says " (done)" to a screen reader, and looks the same reached by a jump as by a scroll. This merges the old B-only "lights its mote" test.
  - Literata and Instrument Serif load from the site, and the body, brief and ask families are checked.
  - The "readers download only the fonts they use" check now asserts that the only woff files fetched are `literata-400-*` and `instrument-serif-400-italic-*`, and never Literata italic.
  - In `e2e/portrait.spec.ts`, the pool check reads `::before` content (`none`) instead of display, since the rule no longer exists.

## Tests and results
- `npx tsc --noEmit -p .`: clean.
- `npx vitest run`: 49 files, 703 tests passed. The baseline was 52 files and 730 tests; the difference is the removed rider, riderPoints, switcher, label and mannequin tests.
- `E2E_PORT=4202 npx playwright test` (full, on b0e2ff8's tree before commit, identical content): 100 passed, 7 skipped (shots), 7.2 min. The baseline was 125 passed; the removed switcher spec, the A/B option loops and the mannequin purity test account for the drop.
- Intermediate runs:
  - After the mannequin commit: purity, portrait and parity, 13 passed.
  - After the labels commit: text, textSwitcher, brief and app, 55 passed.
- `SHOTS=1 E2E_PORT=4202 npx playwright test e2e/shots.spec.ts e2e/compare.spec.ts`: 26 passed.

TDD: this task is removal, not new behaviour. The tests I changed or wrote were checks that removed things stay gone:
- no running label
- no brief-label
- no pseudo-element pool
- only the used fonts fetched
- the C halo on met lines

I confirmed they pass on the new code. I did not run them RED on the old code. Under the old code the label test would fail on `01 — The brief`, and the font-file test would fail on the Newsreader files.

## Screenshots (`?test=1`, fresh page per shot)
Script: `.superpowers/sdd/2026-10-03-plan-3-bicycle/task11-shots.mjs`. Output in `/home/user/motes-of-work/shots/task11/`:
- desktop-p0.09.png, desktop-p0.27.png, desktop-p0.45.png, desktop-p1.png (1440x900)
- portrait-p0.09.png, portrait-p0.27.png, portrait-p0.45.png, portrait-p1.png (390x844)

What I saw:
- Desktop p0.09: the bike is part-assembled, with no label above the panel. The brief is in Literata. The ask is an Instrument Serif italic pull-quote. The first three lines are met (full ink, faint halo) and the last two are dim. There is no pool rectangle and no markers.
- Desktop p0.27: the twin is fully built and all five lines are met.
- Desktop p0.45: reveal, with no mannequin. The whole twin (mast with saddle over the basket, bars at the back, rack, ground) sits right of the text, clear of the frame edges. It sits a little low and right, leaving empty sky upper right.
- Desktop p1: the core is warm on the ghost, with the spec text at left.
- Portrait p0.09 and p0.45: the machine is above the text and the text is under the scrim, with no labels.
- Portrait p0.27 and p1: see concerns 1 and 2.

## Self-review
- I grepped for leftovers: `rider`, `mannequin`, `run-label`, `brief-label`, `data-text`, `textSwitcher`, `text-options`, Newsreader, Geist and Plex across src, e2e, docs, README and CREDITS.
  - The only hits left are "where the rider touches it" and "rider contact points" in the bike blurb and shapes. They describe the core's concept, not the figure, so I kept them.
  - The historical plan docs under `docs/plans/` still mention the mannequin. I left them as a record.
- I left no background processes.
  - Playwright's own preview servers exited with their runs.
  - The vite preview I started for screenshots was orphaned by `npx`. I found it and stopped it.

## Concerns
1. Portrait cold open (p0.27): the ground strip and the bottom of the rear wheel touch the first text line ("You hand an agent a brief…"). This predates this task: Task 8's portrait-p0.27 overlapped more, and the 01 label sat in the ground. C's brief makes the panel tall. Clearance is only tested at the spec frames. Left for the text-engine and storyboard rebuild.
2. Portrait p1: the footer "Credits and licences" link sits on the last text line's baseline, about 4px right of "you.". Task 9's portrait-p1 shows the same placement with B's type. Left for the rebuild.
3. Literata italic is kept although no current copy uses it, so it is never fetched. The brief did not list it for deletion, and the designer's new copy may use emphasis. Delete it if the final copy has none.
4. Reveal desktop framing is now tighter but still sits low-right. The designer's storyboard rebuilds these keys anyway.
