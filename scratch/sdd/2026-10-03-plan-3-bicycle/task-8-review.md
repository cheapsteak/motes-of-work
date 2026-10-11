# Task 8 review: text treatment, brief reorder, portrait framing, mannequin torso

Range `85b72a3..d505835` (4 commits). Reviewer checks run, all read-only:
- `npx tsc --noEmit -p .`: clean.
- `npx vitest run`: 50 files and 676 tests passed, with no warnings in the output.
- `E2E_PORT=4198 npx playwright test e2e/app.spec.ts e2e/text.spec.ts e2e/portrait.spec.ts e2e/brief.spec.ts`: 31 passed. This covers the one-line fix in `d505835`, which the implementer did not re-run in the full suite.
- `BASE_PATH=./ npx vite build`, written to a scratch outDir outside the repo. The built `main-*.css` references every font as `url(./newsreader-400-….woff)` and so on, and `index.html` links `./assets/main-….css`. The fonts load from a relative path.
- Mannequin joints, read through Vite SSR from `riderSkeleton()` to judge observation 2. The near shoulder sits at lateral 0.227 m. The elbow sits at lateral 0.277 m, 0.18 m forward of the shoulder and 0.26 m below it.

## Spec compliance

❌ **One requirement is missed.** Section F says the portrait text "never overlaps the machine". At the spec section the label and the first lines sit on the machine, and the e2e fence is written loose enough to pass with the overlap (I1).

Everything else in A–G is present and matches the brief:
- Fonts are self-hosted, credited under the OFL and load from a relative URL.
- The colour tokens are defined once. The new `colours.test.ts` fences them against the shader.
- The panels have no border or fill and use the `::before` pool. An e2e test sweeps every element in every panel for borders, fills and shadows.
- The brief label, the italic ask and the mote gutter are in place. The lit mote matches the brief. `transition: none` is set and fenced on `li` and `li::before`. A screen-reader "(done)" is set as a pure function of assembly.
- The brief lines are in the order the controller ruled. The thresholds test expects `[0.45, 0.72, 0.8, 0.87, 0.95]`, and a shipped-order test checks the thresholds are non-decreasing.
- The running labels come from the `label:` front-matter key. The panel fade is pure and is driven from the scroll-driver callback.
- `portraitRig` implements the formula as written. The lens shift puts the target at y_ndc 0.3. Landscape is bit-identical: projection and matrixWorld are compared across five frames.
- The portrait CSS, the scrim, the vignette centre and the portrait sizes match the brief.
- The torso is one elliptical frustum with outward normals.

Deviations, each disclosed and each accepted below:
- The first panel does not fade in and the last does not fade out.
- `reframePortrait` is opt-in.
- `left: var(--gutter)` is omitted. The track padding already places the panel there, and on a sticky element `left` would be an inset.
- The core-span target at the spec section is measured on the anchor sphere (concern 1).

⚠️ **Cannot verify from the diff:**
- That the reordered ticks look right while the brief is mid-build. No screenshot shows it, because p=0.2 is already fully ticked (M3).
- Whether the author still reads the figure as having a bust. That is the author's call; see observation 2.

## Strengths
- **Purity holds throughout.** `panelReveals`, `sectionReveal`, `applyBrief` and `portraitRig` are pure functions. `main.ts:684` applies opacity from the driver callback. There is no clock, no randomness and no module state.
- **The view-offset approach is sound.** It uses `setViewOffset(aspect, 1, 0, shift, aspect, 1)`, which works in proportions. A later aspect change cannot desync it, because `view.width/fullWidth` stays 1. `clearViewOffset` on the way back to landscape is tested (`portrait.test.ts`).
- **The tests can fail.**
  - The torso overhang test and the shape test fail on the old capsules.
  - The canvas lit-pixel check fails with the reframe off.
  - The shipped-order thresholds test failed on the old line order.
  - The border sweep found 27 offenders on the old CSS.
- **The report is honest.** It says the brief's own lobe test passes on the old geometry, and it measures why.

## Issues

### Critical
None.

### Important

**I1. In portrait, the spec section's text overlaps the machine, and the fence permits it.** The locations are `e2e/portrait.spec.ts:50`, `src/scene/portrait.test.ts` (the `machineFrames` list) and `src/style.css:217-262`.

What `portrait-p0.9.png` shows:
- "04 — Start again" is drawn across the bottom of the ghost's wheels and is hard to read.
- One of the core's exploded pedals (warm) sits between body lines 1 and 2.

The spec panel is the label plus five paragraphs, and its top lands at about 48% of the height.

The tests do not catch it:
- The panel test only asks `box.top / 844 > 0.44`. The machine test allows the machine down to y_ndc −0.15, which is 57.5% of the height down the screen. Together the two thresholds allow about 13% of the height of overlap by design. The brief's bound was text in the lower ~45%, so a top at about 55% or lower.
- No test checks the spec frames for clearance at all. `machineFrames` covers vibe-build@1 and reveal only, and the canvas check runs only at p=0.41.

The brief-section overlap (p=0.2–0.29) is sanctioned by the mockup: `b-portrait-brief.png` shows the same overlap. The spec-section overlap is not covered by any mockup.

Fix: needs a controller ruling on the means. The bar to meet is that no text line or label is drawn over machine motes at spec@0.35–1 at 390x844, with a test that measures that directly. Options:
- (a) A larger portrait lens shift while `coreFocus > 0`. This stays a pure function of state and aspect.
- (b) The spec copy is draft, so trimming it would shorten the panel.
- (c) Both.

Do not enlarge the core to reach 75% (concern 1), because that makes the overlap worse.

### Minor

**M1. The panels' no-transition rule is not fenced.** The brief's purity rule covers "ticks or panels". `e2e/text.spec.ts:68-70` checks `transition-duration` on `li` and `li::before` only. Add the computed `transition-duration` of every `.panel`.

**M2. The torso lobe tests stop at |lateral| 0.15 m** (`src/mechanisms/bike/rider.test.ts:125-131`). At the chest band the torso is about 0.21 m half-wide, so the outer 0.15–0.21 m is never checked. The arm surfaces begin at about 0.185 m, so the cap could rise to about 0.18 m.

**M3. No screenshot shows the brief mid-build.**
- Assembly finishes by about local 0.44 of the cold open, so `*-p0.2.png` already has all five lines lit.
- That makes the reading-order tick, the point of section D, invisible in the evidence.
- A shot at p≈0.08–0.12 would show it.
- The brief's choice of p=0.2 caused this, not the implementer.

**M4. The core-framing test asserts a proxy** (`src/scene/portrait.test.ts:149`). The anchor sphere spanning at least 75% says nothing about what the reader sees. The direct measure is the core-motes check at `:151` (≥ 0.6). Keep the motes assertion as the requirement and drop or relabel the sphere one, once the concern 1 ruling is made.

**M5. Portrait mixes `100vh` and `100svh`** (`src/style.css:246`). The track uses `100vh` while the sticky top and section padding use `svh`. This is required, because section heights are `vh` for the scroll-progress mapping. But it departs from "svh, never vh" and has no comment saying why. Add one line of comment.

**M6. The font path in the `BASE_PATH=./` build has no automated fence.** It is correct today, by my check above. Optional: a build-output grep in CI.

## Controller observations

**1. Portrait spec section (p=0.9): agree.**
- The label sits on the ghost's wheel bottoms.
- The first text line itself just clears the wheels. A warm exploded pedal sits inside the text, between lines 1 and 2.
- The rear wheel is cropped by about 10 px at the left edge, and the front wheel touches the right edge.
- The cropping is the whole-machine ghost under core-focus framing. Desktop crops the right wheel at the same point, so the cropping is Minor and inherent to framing the core.
- The overlap is the real defect: I1.

**2. Desktop reveal (p=0.41): agree with what it looks like, but the cause is not the torso, and it is outside this task's scope.**
- **Standing-behind look.**
  - Geometrically the figure is seated. The existing test puts the hip within 0.03 m of the saddle top. It is also not oversized: shoulder width over wheel height in the shot is about 0.62, against 0.45/0.70 ≈ 0.64 in metres.
  - The standing look comes from the near side-on 3/4 camera, which foreshortens the thighs toward the viewer. The shins hang near vertically behind the seat post, and the sparse dim-grey figure sits behind the bright bike.
  - G required "pose unchanged", so this is a follow-up, not a task 8 defect. Options: a more forward thigh and knee pose, denser or brighter rider motes, or a reveal camera angle less side-on.
- **Shoulder bulge.** The mass at chest height on the near side lies outside the torso solid. It is the near upper arm plus the rounded end of the shoulder-line capsule:
  - The upper arm is a capsule of radius 0.042 m running from the shoulder (lateral 0.227 m) to the elbow (lateral 0.277 m, 0.18 m forward, 0.26 m down).
  - The shoulder-line capsule's end has radius 0.05 m and reaches lateral 0.277 m.
  - The frustum's front has no lobe, and the tests pin that.
  - If the author still reads a bust, the follow-up is in the limbs:
    - End the shoulder-line capsule inside the frustum, or reduce its radius.
    - Pull the elbows in by changing `ELBOW_POLE`.

**3. Implementer's concerns:**
1. Spec core span of 62–66% against 75%: **accept.** Do not shrink m. A bigger core worsens I1 and crops the ghost further. Amend the target to the motes measure (≥ 0.6) and see M4.
2. The brief panel reaches about 54% in portrait: **accept for the brief section**, since the mockup shows the same. It is not the only case, though: the spec section overlaps too, which is I1 and needs a **fix**.
3. The brief's lobe test is vacuous on the old geometry: **accept.** The analysis is right, and the two added tests fail on the old capsules. Keep all three, and widen the lateral cap per M2.
4. The first and last panels do not fade at the essay's ends: **accept.** Without this, p=0 and p=1 would open and close on an empty page. It is tested in `reveal.test.ts` and `text.spec.ts`.
5. `reframePortrait` is opt-in: **accept.** It lives inside `applyCamera`, keeps the out-of-scope comparison page unchanged, and the landscape identity is tested.

Smaller points: Newsreader on the credits and footer, the probably inert `font-optical-sizing`, and following the existing code style. **Accept** all three.

## Assessment
**Task quality:** Needs fixes
**Reasoning:** The code is pure, well separated and tested with tests that fail on regression. Landscape is bit-identical and the fonts are relative in the `./` build. One brief requirement, portrait text never overlapping the machine, is missed at the spec section, and the e2e threshold of 0.44 is set loose enough to pass with it.
