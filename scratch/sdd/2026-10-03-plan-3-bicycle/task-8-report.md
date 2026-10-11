# Task 8 report: text treatment (option B "Motes"), brief reorder, portrait framing, mannequin torso

Status: DONE_WITH_CONCERNS

Commits on `main` (not pushed), range `85b72a3..d505835`:

- `3715d9f` text: the story as type on the stage, the brief as a document (A–E)
- `7a83823` portrait: lift the machine over the text on an upright screen (F)
- `2ed8148` bike: one tapered torso for the mannequin, in place of chest and waist (G)
- `d505835` e2e: read each section's own alt text, not the brief's hidden status (a fix to an existing test that the full e2e run turned up; see "Test results")

## What I implemented

### A. Type and colour
- Fonts are self-hosted in `src/fonts/` and renamed by weight: `newsreader-400`, `-400-italic` and `-500`, plus `geist-mono-400` and `-500`. `src/fonts/fonts.css` holds the `@font-face` rules and `src/style.css` imports it. With `BASE_PATH=./ npx vite build`, Vite fingerprints the files into `assets/`, and the built CSS points at them with relative URLs such as `url(./newsreader-400-BTPsnPzk.woff)`. I checked this in a throwaway build. There were no font links to remove, because the old CSS used `system-ui`.
- `CREDITS.md` gains a "Fonts" section. It gives each family's copyright line exactly as it appears in the font's own name table (Newsreader: 2020 The Newsreader Project Authors; Geist Mono: 2024 The Geist Project Authors) and the full SIL OFL 1.1 text. I compared that text word for word against a system copy (`/usr/share/doc/fonts-noto-color-emoji/copyright`) and it is identical. `credits.test.ts` now asserts the OFL heading and both copyright lines.
- The body text is Newsreader 400 at 1.25rem/1.5 with `font-optical-sizing: auto`, falling back to Georgia, serif. The labels are Geist Mono 400 at 0.6875rem, letter-spacing .16em, uppercase, in `--ink-mute`.
- The colour tokens are `--ink`, `--ink-dim`, `--ink-mute`, `--agent`, `--human` and `--dialogue`. They replace the old `--text`, `--panel-bg` and `--panel-edge`. The credits dialog's hairline is now `--rule`. A new sync-fence test, `src/scene/mote/colours.test.ts`, checks that the three mote tokens equal the `HUMAN`, `AGENT` and `DIALOGUE` constants in `mote.frag.glsl`. Neither shader file was edited.
- `body { text-shadow: 0 1px 2px rgba(11,13,18,.9) }`.

### B. Panel
The panel has no border, fill, radius or padding. Its width is `min(30rem, 100vw - 2*gutter)` and it sets `isolation: isolate`. Behind it is the `::before` pool, using the values in the brief exactly. I did not add `left: var(--gutter)`: the track's padding already places the panel at the gutter, and on a sticky element `left` would act as a sticky inset rather than an offset. A new e2e test checks every element in every panel, the panel included, for a visible border, a background colour other than transparent, a background image or a box shadow. It finds none. The same test asserts that the pool is the single exception and that it is blurred to 26px.

### C. The brief
- `<p class="brief-label">The brief</p>` now sits above the ask, which is italic at 1.3rem/1.35. The brief's container is `div.brief`, with the margins and padding from the brief and no border or background. `ul.brief` is 1.125rem/1.42 with no list style. Each `li` is relative, padded `.28rem 0`, in `--ink-dim`.
- Each line has a 4px unlit mote. A met line has a 7px mote with the agent-blue radial gradient and the two-layer glow, and its text turns `--ink`. I took the small `transform` nudges from `b.html` so that the lit mote is centred where the unlit one was. The old checkbox, its tick glyph and the bordered card are all gone.
- An e2e test asserts that `transition-duration` is `0s` on every `li` and on every `li::before`. Both rules also say `transition: none` explicitly.
- Screen readers: `parseBrief` appends an empty `span.sr-only` to each line. `applyBrief` sets it to `" (done)"` when the line is met and clears it otherwise. That is a pure function of assembly, as before. A unit test covers it, and an e2e test checks that a met line has a 7px mote, a glow and the hidden text, while an unmet line has none of those.

### D. Reorder
The lines in `01-vibe-build.md` are now in the order the controller ruled, with the copy unchanged. The thresholds unit test expects `[0.45, 0.72, 0.8, 0.87, 0.95]`. A new test in `content.test.ts` parses the brief as shipped and asserts its thresholds never decrease in document order. It failed on the old order: line 2 was 0.45 against 0.72 before it. The e2e indices in `brief.spec.ts` have been swapped to match. The word count stays within 80.

### E. Running labels and fade
- The front matter now has a `label:` key, parsed by `loader.ts` into `StorySection.label`. The labels are "01 — The brief", "02 — It runs", "03 — Rewind" and "04 — Start again". `dom.ts` adds each one as a `p.run-label` at the top of its panel. Labels are not part of the body, so they do not count toward the word limit. They are included in the content lint (issue numbers, file paths, the denylist), and a test checks their format: two digits, an em dash, then sentence case.
- `src/story/reveal.ts` provides `smoothstep`, `sectionReveal(local)` and `panelReveals(p, spans)`, all pure. The scroll-driver callback in `main.ts` sets each panel's `style.opacity` from them, with no CSS transition. `renderStory` now returns the panels in story order, and `--half-h` is set on the section rather than the panel so the portrait CSS can read it.
- **Judgement call.** The first panel does not fade in and the last does not fade out. With the brief's formula applied to every section, p=0 opens on an empty page and p=1 ends on one. Every inner boundary uses the formula exactly as given.
- Existing tests that read panels still pass without changes. They check geometry or `toBeVisible`, and opacity 0 still counts as visible to those checks.

### F. Portrait
- `cameraRig.ts` gains `portraitRig(rig, aspect)`, a pure function that implements the formula in the brief: m, the new target, the new position, the new field of view, and a shift of 0.15. `applyCamera(camera, s, anchors, { reframePortrait })` applies it. In portrait it uses `setViewOffset(aspect, 1, 0, 0.15, aspect, 1)`, which keeps the aspect unchanged and moves the machine up the screen. Going back to landscape restores the field of view and calls `clearViewOffset`.
- The reframe is opt-in. Only `main.ts` passes it, so the comparison page and the spikes are unchanged. The comparison page has its own portrait fit (`fitFov`), which would conflict.
- At aspect 1 and wider the function returns its input unchanged. A test also confirms that landscape `projectionMatrix` and `matrixWorld` are bit-identical with and without the option, across five story frames.
- **Layout.** The portrait media query (`orientation: portrait`) makes these changes:
  - The panel sticks at `100svh - 2*half-h - 20px`, 16px from each side, with the pool hidden.
  - The section's top padding starts the track at that same point, and the track runs one panel height past the span. The effect is that each panel holds still at the bottom of the screen for its whole section and only scrolls off after it has faded. Without this, panels would scroll up over the machine near the end of each section.
  - A fixed scrim (`#story::before`, using the gradient from the brief) sits above the canvas and vignette and below the panels.
  - The vignette is centred at 50% 38%.
  - Sizes: body 1.125rem, brief lines 1.0625rem, ask 1.2rem. The .85em paragraph gap applies at both orientations, as in the mockup.
- **Tests.** `src/scene/portrait.test.ts` (unit, at 390x844) projects the posed bike points plus the rider points (when the rider is shown) at vibe-build@1 and reveal@0.3 to 1.0 in steps of 0.1. In every frame, |x_ndc| < 0.92, the lowest y_ndc > -0.15, and the highest y_ndc < 1. The highest-point check is my addition: it confirms the mannequin's head is not clipped at the top.
  - `e2e/portrait.spec.ts` runs at 390x844. It checks that every panel sits 16px from the sides with its bottom 20px from the screen's, holds still at local progress 0.08, 0.5 and 0.92, and has its top below 44% of the height. It checks the scrim, the hidden pool and the vignette. It also does one cheap canvas screenshot check at p=0.41: fewer than 1% as many lit pixels below 57.5% of the height as above it. That check fails with the reframe switched off.

### G. Mannequin torso
- `src/shapes/primitives.ts` gains `ellipticFrustum(bottom, top, height)`. It is closed and non-indexed, with exact outward normals on the sides and flat caps. Its tests cover closure, bounds, every vertex on its ellipse, and outward normals that agree with the triangle winding.
- In `rider.ts`, `torso(k)` replaces the chest and waist capsules with one frustum. It runs from the hip joints, at hip width, to the shoulder joints, at shoulder width, and its depth is 0.6 of its width at every height. The head, neck, shoulder line, pelvis and limbs are unchanged, as are the proportions and the pose. The skeleton's `chest` points remain, because the proportions test still measures them. `CHEST_AT` is now exported for the new tests. The mannequin's colour and look are unchanged.

## Test results (final state)
- `npx tsc --noEmit -p .`: clean.
- `npx vitest run`: 50 files, 676 tests, all passed.
- Full e2e, `E2E_PORT=4197 npx playwright test`: 92 passed, 1 failed, 7 skipped (the SHOTS-only tests).
  - The failure was in the existing `app.spec.ts`: its locator `section[...] .sr-only` now also matched the brief's new hidden status spans (a strict-mode violation).
  - I scoped the locator to the section's direct child (`> .sr-only`) in commit `d505835`, and that test now passes. I did not re-run the full suite after this one-line test-only fix.
- `SHOTS=1 E2E_PORT=4197 npx playwright test e2e/shots.spec.ts`: 6 passed, writing to `shots/`.
- Targeted runs while iterating: `text.spec` plus `brief.spec` (13 passed) and `portrait.spec` (3 passed).

## TDD evidence
- **Loader, content and brief unit tests.** RED: `npx vitest run src/story` gave 22 failures before the change, mainly `label` being undefined and `BRIEF_DONE` missing. Once labels existed, three failures remained, as expected: "line 2: expected 0.45 to be greater than or equal to 0.72", no brief label, and no label on 01. GREEN: 57/57 passed.
- **`reveal.test.ts`.** RED: the `./reveal` module did not exist. GREEN: 7/7 passed.
- **`e2e/text.spec.ts` against the old CSS** (old `style.css` swapped in temporarily). The border/background test failed with 27 offending entries, and the font test failed with no fonts loaded. The transition test passed on the old CSS too, because nothing transitioned there; it is a fence against future changes.
- **Portrait unit tests.** RED: "portraitRig is not a function" (13 failures). GREEN: all passed.
  - The portrait e2e screenshot check fails with the reframe off: 972 lit pixels in the upper frame against a floor of 1000.
- **Torso tests against the old geometry.**
  - The overhang test failed: at |lateral| 0.06–0.07 m, the waist front was 0.058 against a chest front of 0.096.
  - The shape test failed: mid-torso width was 0.16 against a hip width of 0.334.
  - **The brief's own lobe test passes on the old geometry.** See concern 3.
  - GREEN with the frustum: 79/79 bike tests passed.

## Screenshots (in `shots/task8/`, which is gitignored)
- `desktop-p0.2.png`, `desktop-p0.27.png`, `desktop-p0.295.png`, `desktop-p0.3.png`, `desktop-p0.41.png`, `desktop-p0.9.png`
- `portrait-p0.2.png`, `portrait-p0.27.png`, `portrait-p0.295.png`, `portrait-p0.3.png`, `portrait-p0.41.png`, `portrait-p0.9.png`
- `mannequin-closeup-p0.41.png` (a 2x crop around the rider)
- The scripts that produced them are `task8-shots.mjs` and `task8-closeup.mjs` in this folder. They take fresh pages per URL and need a `vite preview` server to run.

What I saw:
- **Rectangles.** None of the old frames remain: no border, no card and no checkbox. On desktop, the pool behind the column shows as a very faint darker, rounded area around the text. Its edges are feathered, and it matches the mockup frames.
- **Legibility.** On desktop the text is easily legible; it sits in the left column away from the bike. In portrait the body text reads well over the scrim.
  - At p=0.2 and 0.27, the brief's running label and first line ("01 — The brief" and "You hand an agent a brief…") are drawn over the bike's ground shadow and the bottom of its wheels. They stay readable because of the text shadow.
  - At p=0.9, the "04 — Start again" label sits over the ghost outline's wheels and is hard to read. The body text below it is fine.
- **The whole bike in portrait.**
  - p=0.2, 0.27 and 0.41: the bike, and the rider at 0.41, are whole and in the upper part of the screen.
  - p=0.9 (spec): the warm core is whole. The faint white ghost outline is cut off at both sides, as it already is at the right edge on desktop.
- **Breasts.** No longer. The torso reads as a flat-fronted, tapering block that widens toward the shoulders, with square shoulders. Its points are sparse, so the figure is schematic.
- **p=0.3.** This is exactly the boundary between sections, so by the fade formula both panels are fully transparent. It shows the bike with no text, at both sizes.
  - The completed brief at full opacity is in `*-p0.27.png`. The brief is fully ticked from local progress of about 0.44 to 0.94 of the cold open.
  - `*-p0.295.png` shows the brief part-way through fading out.

## Concerns
1. **The spec framing target is not fully met by the formula as given.** With the portrait formula exactly as specified, the core's exploded motes at the spec section span only 62–66% of the phone's width. The core's framing sphere (the core anchor) spans 86–89%.
   - The test asserts that the sphere spans at least 75%, and that the motes span at least 60% and stay on screen.
   - Reaching 75% for the actual motes would mean reducing m by about 0.86 when `coreFocus` is 1, which departs from the given formula.
   - For comparison, the core spans about 41% of the desktop width at the same point.
   - Your call: accept this as is, or apply that reduction when the camera is focused on the core.
2. **The brief panel in portrait reaches about 54% of the height,** so its label and first line overlap the bottom of the bike and its shadow at p=0.2 to 0.29. The mockup shows the same overlap. With the specified sizes the cold-open panel cannot fit in the lower 45%. Every other panel's top sits below 44% of the height, so this is the case where "never overlaps" falls short.
3. **The brief's lobe test cannot fail on the old geometry.** I measured the old chest capsule's forward profile across the chest band: about 0.0978 m in the middle and 0.0961 m at 0.06 m to the side, falling to 0.04 m at 0.14 m. The old chest was flat across the middle with sides that fell back; it had no forward lobes. What read as a bust was the chest bulging forward over a much narrower waist capsule.
   - I kept the brief's test, limited to |lateral| < 0.15 m because the arms hang beyond that.
   - I added one test that does fail on the old geometry: no part of the chest stands more than 0.03 m forward of the waist beneath it.
   - I added a second that also fails on the old geometry: a single tapered solid between the hip and shoulder widths, 0.55 to 0.65 as deep as it is wide.
4. **First and last panels.** I made the first panel skip its fade-in and the last skip its fade-out, so p=0 and p=1 are never blank; see E. Applying the formula to all four panels is a one-line change in `panelReveals` if you want strict uniformity.
5. **The portrait reframe is opt-in** (`{ reframePortrait: true }`, passed only by the essay) so that the comparison page, which is out of scope, does not change. The brief said "in applyCamera only", and the reframe does live inside `applyCamera`.
6. **Smaller points.**
   - `body` now sets the Newsreader font and the text shadow, so the credits dialog and footer use them too.
   - The static WOFF files probably have no optical-size axis, in which case `font-optical-sizing: auto` has no effect.
   - The repo has no prettier config. The editor hook flagged prettier style throughout the repo; I followed the existing style instead.

## Files changed
- **Commit 1:** `CREDITS.md`, `src/fonts/*`, `src/style.css`, `src/main.ts`, `src/story/{01..04}*.md`, `src/story/{loader,brief,dom,reveal}.ts` and their tests, `src/story/content.test.ts`, `src/credits/credits.test.ts`, `src/scene/mote/colours.test.ts`, `e2e/text.spec.ts`, `e2e/brief.spec.ts`
- **Commit 2:** `src/scene/cameraRig.ts`, `src/scene/portrait.test.ts`, `src/main.ts`, `src/style.css`, `src/story/dom.ts`, `e2e/portrait.spec.ts`
- **Commit 3:** `src/shapes/primitives.ts` and its test, `src/mechanisms/bike/rider.ts` and its test
- **Commit 4:** `e2e/app.spec.ts`
- Not touched: `mote.glsl`, `mote.ts`, `keyframes.json`, the comparison page and the landing page.

## Fix round 1

Status: DONE_WITH_CONCERNS. Commits on `main`, not pushed: `d505835..bc2fac7`.

- `77cf7be` portrait: lift the core shot clear of the spec text (I1, M4)
- `04313dc` bike: slimmer shoulders for the mannequin, its elbows closer in (shoulder fix, M2)
- `bc2fac7` text: fence the panels against transitions; say why the portrait track uses vh (M1, M5)

### I1: the spec text over the machine in portrait

**What changed.**
- `portraitRig(rig, aspect, coreFocus)` now blends the lens shift from `PORTRAIT_LENS_SHIFT` (0.15) to `PORTRAIT_CORE_LENS_SHIFT` (0.22) of the screen height as `coreFocus` goes from 0 to 1.
- It stays a pure function of camera state. Pose and field of view are unchanged; only the shift moves.
- `applyCamera` passes in the state's `coreFocus`. Landscape still returns `shift: 0`, and the bit-identical landscape test still passes.

**A new measure of the visible machine, `e2e/machine.ts`** (test-only). It computes screen positions with the renderer's own reference algorithm (`mote()` in `src/scene/mote/mote.ts`, the TypeScript twin of the shader; not modified). It counts three things:
- every mote that is at least half settled;
- the ghost of the whole intended machine (assembled, correct variant, zero faults), whenever the ghost shows, including its ground;
- the rider, when it shows.

It leaves out motes still in flight from their spawn shell. Those are the loose starfield, which covers the whole screen at the spec section and cannot be cleared by any framing.

**A new e2e test in `portrait.spec.ts`**, one per frame at spec@0.1, 0.35, 0.5, 0.75 and 0.9, at 390x844:
- It reads the spec panel's top from the page. The running label is the panel's first child, so this is the top of the text, label included.
- It projects the visible machine with the same camera and the same scene state.
- It asserts that the panel's top minus the machine's bottom is at least 8 px, and that the machine's top is at 0 px or below the screen's top edge.

**Why the copy had to be trimmed.** The ruling allowed a trim only if no shift could clear the text without cropping the core's top. No shift can. With the old copy:

| | Panel top | Machine | Height |
|---|---|---|---|
| spec@0.35 | 409 px | 94–521 px | 427 px |
| spec@0.5 | 409 px | 99–506 px | 407 px |

At spec@0.35 the shot is 427 px tall, against at most 401 px of room above the text. The lowest points are an exploded core pedal and the ghost's ground and wheels; the highest is the exploded warm handlebars.

**RED, before the fix.** Shift 0.15 with the old copy failed at spec@0.35, 0.5, 0.75 and 0.9, with the machine bottom at 521, 506, 487 and 482 px against a panel top of 409. With shift 0.23 and the old copy it still failed: bottoms of 453, 439, 419 and 415 against 409.

**The trim.** I cut the spec panel's last paragraph: "A faint outline of the machine appears, and the core takes shape inside it." It is a stage direction for what the canvas already shows, and the section's alt text still describes it. The other four paragraphs are verbatim.

**GREEN, with shift 0.22 and the trimmed copy:**

| | Panel top | Machine | Clearance |
|---|---|---|---|
| spec@0.1 | 478 px | 235–342 px | 136 px |
| spec@0.35 | 478 px | 35–462 px | 16 px |
| spec@0.5 | 478 px | 40–447 px | 31 px |
| spec@0.75 | 478 px | 18–428 px | 50 px |
| spec@0.9 | 478 px | 68–423 px | 55 px |

I chose 0.22 rather than 0.23 to leave room at the top: the machine's top is at 18 px rather than 9 px at spec@0.75.

**M4.** The core-framing unit test no longer uses the anchor sphere. It now asserts on the core's own motes: they span at least 60% of the width (measured 62–66%), stay on screen sideways, and keep their top on screen. New unit tests cover the shift blend: 0.15 at a focus of 0, 0.185 at 0.5 and 0.22 at 1, clamped above 1, with pose and field unchanged by focus and zero in landscape.

### Mannequin shoulders

- **Shoulder line.** It is now a bar of radius 0.035 m (was 0.05) whose rounded ends stop 0.03 m inside each shoulder joint, so the upper arms' caps round the shoulders off. Its outer reach went from 0.277 m to within the upper arm's cap (at most 0.269 m).
- **Elbows.** The pole's outward component went from 0.5 to 0.2, which brings the elbow from lateral 0.277 m to 0.261 m. The hand target fixes the elbow's position almost entirely; the pole only sets which way the elbow bends, so it cannot tuck it in much further.
- **Unchanged.** Proportions, the pose-bound tests and the hand and foot targets all pass unchanged.
- **New test.** At and above the shoulder joints, no surface reaches further out than the shoulder joint plus the upper arm's radius (0.002 m tolerance). It fails on the previous rider at 0.276 m against 0.2706 m, and passes on the new one.
- **M2.** The torso lobe checks now run out to |lateral| 0.18 m, up from 0.15 m. The mid-torso width check now samples only near forward 0, because the tucked upper arm crosses the old lateral cap of 0.25 m at that height.

### Minors

- **M1.** A new e2e test: every `.panel` has a `transition-duration` of `0s` and no animation.
- **M3.** A mid-build frame at p=0.09, where three of the five lines are lit (assembly is about 0.81). The lit lines are the first three, in reading order. The frame is `*-p0.09.png`.
- **M5.** One line of comment on the portrait track rule, explaining why it uses `vh`: it must match the section heights, which set the scroll range against `innerHeight`.
- **M6.** No fence added; it was optional. A check would need a separate `BASE_PATH=./` build inside the test run.

### Verification

- `npx tsc --noEmit -p .`: clean.
- `npx vitest run`: 50 files, 678 tests, all passed.
- Full e2e, `E2E_PORT=4197 npx playwright test`: 99 passed, 7 skipped (the SHOTS-only tests), 0 failed.
- Shots regenerated in `shots/task8/`: `desktop-p0.09.png`, `portrait-p0.09.png`, `desktop-p0.41.png`, `portrait-p0.41.png`, `desktop-p0.9.png`, `portrait-p0.9.png` and `mannequin-closeup-p0.41.png`. The earlier `p0.2`, `p0.27`, `p0.295` and `p0.3` frames are left in place; nothing they show has changed.

### Looking at the new shots

- **`portrait-p0.9.png`.** The bike sits wholly above the text. The lowest exploded pedal is at about y=400, and the label "04 — Start again" is at about 485, over the scrim.
  - The warm handlebars reach about y=70. The ghost's wheels still touch both side edges, as before; this is accepted and inherent to framing the core.
  - The loose starfield of motes still in flight lies behind the text, as on desktop.
- **`*-p0.09.png`.** The seat-and-bars, wheels and steering lines are lit, and the brakes and frame lines are unlit.
- **`mannequin-closeup-p0.41.png`.** The near shoulder is visibly slimmer and squarer, with no knob past the arm. The near upper arm still runs down the near side of the torso at chest height and makes a contour there; I don't read it as a bust.

### Concerns

1. **The spec copy is one paragraph shorter**, as described under I1. The author may prefer to cut something else of a similar length (about two lines at 390 px).
2. **Clearance is measured only at 390x844.** A shorter phone, or a longer panel on a narrower one, could overlap again. The rule is the same; only the margin would change.
3. **Clearance counts settled motes, the ghost and the rider only.** The in-flight starfield still crosses the text at the spec section, at both aspects, under the scrim. That is the existing look and was out of the ruling's reach.
4. **The near-side arm contour at the reveal.** Any further change to the mannequin would need the pose or the reveal camera to change, as the reviewer noted. Both are out of scope here.
