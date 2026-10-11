# Task 9 report: App wiring and the first story slice

Status: DONE_WITH_CONCERNS (the concerns are visual and copy layout only; every test passes)
Commit: 9910970 feat: app wiring and first story slice (vibe build, rewind, spec)

## What I implemented
- `src/scroll/driver.ts`: `createScrollDriver(onProgress)`. Progress is always read from `window.scrollY` through `progressFromScroll`. Scroll events are coalesced into one read per rAF. On resize the driver calls `scrollTo(scrollYForProgress(last, newScrollHeight, newInnerHeight))` and then re-reads progress from scrollY. It never sets progress directly. It also emits the initial progress synchronously, and `dispose()` removes the listeners.
- `src/scene/cameraRig.ts`: `applyCamera(camera, s)` sets the position, calls `lookAt(target)` and sets the fov. It updates the projection matrix only when the fov changes and leaves the aspect alone.
- `src/main.ts`:
  - Builds the `<section>`s from `loadStory()`. Each one has `data-section`, `data-alt` and `--length`, a `.sr-only` alt element, and a sticky wrapper that holds the `.panel` article.
  - Creates `KeyframeSampler(keyframes.json, sectionSpans(story))`. Every frame renders `mergeState(sampler.sample(progress), ?state=)`.
  - `?p=` is parsed with `Number()`. A non-finite value becomes 0, and `scrollYForProgress` clamps it. The page is scrolled there with `history.scrollRestoration = 'manual'`, and progress is then read back from scrollY.
  - Render loop:
    - It runs on rAF and returns early while `document.hidden`. `visibilitychange` cancels the pending rAF when the tab is hidden and requests a frame when it is visible again.
    - On `webglcontextlost` it calls `preventDefault()`, stops the loop and adds `body.no-webgl`. If the `WebGLRenderer` constructor throws, the page also falls back to `no-webgl`.
  - DPR is capped at 2.
  - **In `?test=1` a frame is drawn only on request**: on a progress change, a resize, a resume or the first frame. Outside test mode the loop runs continuously for the shimmer. This keeps test pages fast at the 100k budget, and frames are pure, so redrawing an unchanged frame is wasted work. `?n=` was not needed.
  - The test hook is `window.__motes = { progress, frames, settle }`. `settle` resolves after two consecutive rAFs with no scroll or resize event. It replaces the old `window.__moteFrames`.
- `index.html`: the canvas has `aria-hidden="true"` and `#story` is empty (filled by main).
- `src/style.css`:
  - Sections are `length × 100vh` tall. Each has a sticky wrapper 100vh tall with a left gutter of `clamp(1rem, 5vw, 4rem)`.
  - The panel has max-width 28rem, text `#ecebf2` on a `rgba(11,13,18,.78)` scrim, 1.0625rem type with line-height 1.6.
  - Standard `.sr-only` rule; `.no-webgl #stage { display: none }`.
  - `html { overflow-anchor: none }` so Chromium's scroll anchoring cannot move scrollY on resize in competition with the driver.
- `src/timeline/keyframes.json`: the brief's values, written with section-relative `at`. Continuity rules followed:
  - drive: vb@0 0 → vb@1 2 → rewind@1 0 → spec@1 0.5.
  - The camera's vibe-build end key is vb@1, so it is also the rewind start. The spec flight runs from rewind@1 `[0,0,16]` to spec@0.35. Target and fov reach `[-0.9,0,0]` and 35 by spec@0.35.
  - assembly in the rewind is pinned to 1 at rewind@0, then the inOutQuad to 0 at rewind@0.8.
  - No track has both `<a>@1` and `<next>@0`.
- Story files: `01-vibe-build` (length 3), `02-rewind` (2), `03-spec` (3). All are `draft: true` in sentence case, with no names, numbers or paths, and all pass the content lint (≤ 80 words).
- Extra tests, which are not in the brief's file list:
  - `src/scene/cameraRig.test.ts`: position, fov, aspect untouched, and the view direction points at the target.
  - `src/timeline/keyframes.test.ts`: the shipped keyframes compile against the shipped story, and every leaf is continuous across each section boundary. It also checks the thesis beats across 21 samples per section: the vibe build is vibed, wrong twin, no ghost; the rewind never shows a ghost and ends at assembly, variant, vibed and drive all 0; the spec is specced with assembly ≤ 0.45 and ends with ghost 1 and the brief's camera.
- **Modified outside the file list: `e2e/looks.spec.ts`.** This was necessary for two reasons:
  1. `?state=` now merges over the sampled state, so the looks spec expands each partial with `mergeState(defaultSceneState(), partial)`. Every leaf is pinned and nothing from the story leaks into a look.
  2. Element screenshots are composited, so the story panels covered the canvas, and the "specced: cool frame corner" check failed under the first panel. The spec now hides `#story` before taking the screenshot.

  It also waits on `__motes.frames()` instead of `__moteFrames`.

## Tests and results
- `npm run typecheck`: clean.
- `npm test`: 13 files, 130 tests passed.
- `npm run e2e`: 14 passed in 36s (smoke 1, parity 1, looks 4, app 8).
- `e2e/app.spec.ts` covers:
  - Sections, alt text and the aria-hidden canvas.
  - `p=0.5`: progress is within 0.002 and the rewind panel is in the viewport, while the vibe-build and spec panels are not.
  - Resize from 1280×800 to 900×700 at p=0.42, then `settle()`: progress is within 0.002 and the rewind panel is still in view.
  - Context loss:
    - No page errors.
    - `body.no-webgl` is set.
    - The first panel is visible and in the viewport.
    - Frames stop increasing after a scroll.
  - Hidden tab: frames stay constant over 300ms even though the page is scrolled while hidden, which would otherwise render. After restore, frames increase.
  - `p=1.7` gives 1, `p=-3` gives 0, `p=abc` gives 0.
- Mutation checks to prove the tests detect the failures they target (each mutation reverted afterwards):
  - With the driver's resize re-scroll removed, the resize test fails: expected < 0.002, received 0.06.
  - With the `document.hidden` guards removed, the hidden-tab test fails: expected 2, received 3.

## TDD evidence
- RED: `npx playwright test e2e/app.spec.ts --reporter=line`, built from the old `main.ts`. Result: `8 failed`, each `page.waitForFunction: Test timeout of 60000ms exceeded` in `open()` waiting for `__motes`. This was expected because the old app exposed no `__motes` hook and had no story DOM.
- GREEN: same command after the implementation. Result: `8 passed (31.1s)`.
- The unit tests for cameraRig and keyframes were written alongside the code rather than test-first.

## Screenshots (1280×720, `?test=1&p=<section local 0.5>`; files in `shots/`)
- `app-vibe-build.png` (p=0.1875):
  - The machine is fully assembled and entirely cool blue, with no amber anywhere and no ghost.
  - It is the **wrong twin**. Compare `app-vibe-build-canvas.png` with `app-vibe-build-correct-twin-canvas.png` (same frame with `?state={"mech":{"variant":0}}`). The wrong twin has one large gear with a three-spoke crank on its hub. The correct twin has the large gear, a small meshed gear and a crank arm on the small gear. They read as different machines, and the wrong one is plausible.
  - The machine is centred and fairly small (wide shot), and the panel slightly overlaps the gear's left teeth.
- `app-rewind.png` (p=0.5): mid-dissolve (assembly ≈ 0.28). Mostly a cool nebula, with the crank bar and bracket still partly formed and a faint gear outline behind the panel. `app-rewind-0.95.png` confirms it **returns to a nebula**: no structure left. Amber motes fade into the cloud as `vibed` goes 1→0 over rewind 0.9..1, so the cloud that the spec starts from is already the specced population.
- `app-spec.png` / `app-spec-canvas.png` (p=0.8125):
  - The **ghost appears**: a dense white dotted outline of the assembled intended machine (two gears, crank, bracket).
  - **Amber core motes are settling** on the exploded drive gear, offset to the left of its ghost. The body is still unsettled.
  - The camera is close with fov 35, as specified.

## Concerns (visual and layout; for the controller or the polish pass)
1. **In the spec section, the warm core sits behind the text panel.** With the brief's verbatim spec camera (`pos [-1.2,0.3,5]`, `target [-0.9,0,0]`), the exploded drive gear carrying the amber core lands on the left third of the screen, under the 28rem left panel. The most important visual of the high-touch beat is mostly hidden. Possible fixes:
   - Shift the target left so the core sits right of the panel, e.g. a target x around -2.5.
   - Use a lighter scrim.
   - Use a right-hand panel for this section.

   I kept the brief's values.
2. **The ghost reads as bright and dense rather than "faint"** at this close camera, because it dominates the frame. This belongs to the Task 8 ghost brightness and density tuning, which is already deferred to the polish pass.
3. **The DOM sections and the progress spans are offset.** Sections are `length × 100vh` tall, but progress maps over `(Σlength − 1) × 100vh` of scroll. So near the end of a section's progress span, its sticky panel is already scrolling away and the next section's panel is entering. At rewind local 0.95 both panels show. At each section's local 0.5 the correct panel is the only one in view, as the tests check. This follows the brief's layout. A future pass may want each section's sticky range aligned with its progress span.
4. **Test-mode rendering is on demand**, as described above. The Task 10 purity test (screenshots of jump vs scroll) should be unaffected, because a frame is still a pure function of progress, and `settle()` waits two quiet rAFs after the last scroll or resize.
5. The vibe-build machine is small in the wide shot. That matches the "wide" intent, but the first-impression "impressive" beat may want a closer start. This is the author's call.

## Files changed
- Created:
  - `src/scroll/driver.ts`
  - `src/scene/cameraRig.ts`
  - `src/scene/cameraRig.test.ts`
  - `src/story/02-rewind.md`
  - `src/story/03-spec.md`
  - `src/timeline/keyframes.json`
  - `src/timeline/keyframes.test.ts`
  - `e2e/app.spec.ts`
- Modified:
  - `src/main.ts`
  - `src/style.css`
  - `index.html`
  - `src/story/01-vibe-build.md`
  - `e2e/looks.spec.ts` (outside the list; reasons above)

## Self-review
- Purity: the frame is `sample(progress)` merged with the `?state=` override. The only wall-clock input is shimmer, which `?test=1` turns off. No state accumulates from frame to frame. The driver's `last` is a cache of a value read from scrollY, never an independent state.
- NaN: `?p=` values that are not finite become 0. `progressFromScroll` and `sampler.sample` both clamp.
- The JSON import is cast through `unknown` to `KeyframeFile` (TS types vec3 values as `number[]`). The sampler validates every track at load.
- Neither `?state=` nor `?n=` gained any new parsing beyond the existing `?state=`.

---

## Fix report (controller rulings: fix concerns 1 and 3; concern 2 deferred)

Commit: c189f38 fix: align story panels with progress spans and frame the spec core

### Concern 3: panels and progress now agree
- A trailing `<div class="story-end" aria-hidden="true">` (100vh, no content) follows the last section. So `scrollHeight − innerHeight = Σ length × vh`, and each section's DOM top sits exactly at its span `start`. A new e2e test asserts the range equals the summed section heights within 1px.
- **Why a spacer alone was not enough.** The old sticky wrapper was 100vh tall and stuck at `top: 0`, so a panel only stuck for `(length − 1) vh` of its section's `length vh` of progress. Near the end of a span it had already slid off, and the requested ±0.01 test failed for 4 of the 6 cases.
- **Fix (new `src/story/dom.ts`, moved out of `main.ts`):**
  - Each section is `length × 100vh` tall with `padding-top: 50vh`. Inside it, the panel rides a `.track` that is also `length × 100vh` tall, so the track spans `[top + 0.5vh, top + length·vh + 0.5vh]`.
  - The panel itself is sticky, with `top: max(0px, calc(50vh − var(--half-h)))`. `--half-h` is half the panel's measured height, set at render time and kept current by a ResizeObserver, because CSS cannot read an element's own height.
  - Result: a panel's top edge reaches the viewport centre line exactly when its span starts. It then sticks, centred. After release, its bottom edge leaves the centre line exactly when its span ends, because a released panel's bottom sits on the track bottom whatever its height. The outgoing and incoming panels meet at the centre line on the boundary without overlapping.
  - Edge cases: at p = 0 the first panel's top sits on the centre line, and at p = 1 the last panel's bottom does.
- **New e2e coverage.** For each section, at `?test=1&p=start+0.01` and `end−0.01`, the set of panels crossing `innerHeight/2` equals exactly `[that section]`.
- RED: `npx playwright test e2e/app.spec.ts -g "centre line|scroll range"` gave `5 failed, 2 passed`: end of vibe-build, start/end of rewind, start of spec, and the scroll range (received 720, one viewport short).
- GREEN: all pass.

### Concern 1: spec framing
- New spec camera keys (continuity kept: the spec still starts from rewind@1 `[0,0,16]` / `[0,0,0]` / fov 40):
  - `camera.pos`: spec@0.35 `[-3.6,0.3,6.5]` (inOutCubic), then spec@1 `[-3,0.3,6.3]`.
  - `camera.target`: spec@0.35 `[-3.6,0,0]`, then spec@1 `[-3,0,0]`.
  - fov is unchanged at 35.
- The camera looks straight down −z from left of the gear, so the gear lands right of centre. It drifts right at the same linear rate as the exploded drive gear as assembly goes 0 → 0.45, so the framing holds through the section.
- **New unit test** (`keyframes.test.ts`): at spec local 0.35, 0.5, 0.7, 0.9 and 1, every drive-gear point is projected through the real `partTransforms` and `applyCamera` at 1280×720. It asserts NDC x is in (0, 1) and |y| < 1, so the gear is wholly in the right half and in frame. With the old keys it fails (`local 0.35: expected -1.197 to be greater than 0`). The end-camera assertion in that file was updated to the new values.
- **Screenshots (looked at):**
  - `shots/app-spec.png` (local 0.5) and `shots/app-spec-0.9.png` (local 0.9): the whole drive gear (amber core motes settling, ghost outline, hub hole) sits at roughly x 650–1170px, fully clear of the panel, which ends at about 562px.
  - Framing is close: the gear fills about 70% of the frame height, versus the wide vibe-build shot.
  - The ghost of the driven gear is partly visible at the right edge.
- Known limit: the framing is tuned for 16:9. On much narrower aspects (portrait or mobile) the gear will crowd the right edge. The mobile layout is still undecided (spec §8).

### Refreshed shots (1280×720, `?test=1`)
- `app-vibe-build.png` (local 0.5): unchanged. The wrong twin, all cool, no ghost.
- `app-rewind.png` (local 0.5): unchanged. Dissolving to a nebula.
- `app-rewind-end.png` (p=0.62, rewind local 0.98): the nebula, with the rewind panel's bottom just below the centre line and the spec panel's top just under it. This shows the handover happening on the span boundary.
- `app-spec.png` and `app-spec-0.9.png`: as above.

### Tests run
- `npm run typecheck`: clean.
- `npm test`: 13 files, 131 tests passed.
- `npm run e2e`: 21 passed (smoke 1, parity 1, looks 4, app 15), including resize, hidden-tab and context-loss.
- No background processes of mine remain. An earlier background waiter matched its own command line in `pgrep -f`; I killed it.

### Files in the fix commit
- New: `src/story/dom.ts`. It is not on the original file list: the story DOM and its layout contract moved out of `main.ts`.
- Modified:
  - `src/main.ts`
  - `src/style.css`
  - `src/timeline/keyframes.json`
  - `src/timeline/keyframes.test.ts`
  - `e2e/app.spec.ts`
