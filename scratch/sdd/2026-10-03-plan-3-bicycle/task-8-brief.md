# Task 8: text treatment (option B "Motes"), brief reorder, portrait framing, mannequin torso

Repo: <repo>, branch `main`. Commit on main; do NOT push (the controller pushes).
Read first: global-constraints.md and implementer-instructions.md in this folder. Purity invariant holds:
every frame and every brief tick is a pure function of scroll progress; no CSS transitions on ticks or panels.

Why: the author dislikes "rectangles in rectangles" (bordered panel > bordered brief card > checkbox glyphs)
and says the brief is not a web form. An art director mocked three options; option B was chosen. The
reference mockup is `b.html` + `shared.css` in this folder, with frames `b-{desktop,portrait}-{brief,reveal}.png`.
Look at the PNGs before you start. Research notes: research-text-treatment.md.

## A. Type and colour
- Self-host the fonts (no network at test time): `fonts/` in this folder has Newsreader (400, 400 italic,
  500) and Geist Mono (400, 500) as .woff plus their @font-face css. Put them under `public/fonts/` (or
  `src/fonts/` imported by Vite; whichever survives `BASE_PATH=./ npx vite build`, check the built essay
  loads them with a relative URL). Both are SIL OFL 1.1: add them to CREDITS.md with the licence.
  Remove any now-unused font links.
- Body: Newsreader 400, `font-optical-sizing: auto`, fallback Georgia, serif. Desktop 1.25rem/1.5.
  Labels: Geist Mono 400, 0.6875rem, letter-spacing .16em, uppercase.
- Tokens: `--ink: #E8E6EE; --ink-dim: #9F9DAB; --ink-mute: #76748A;` agent #4DA3FF, human #FFB347,
  dialogue #C4B0FF (reuse existing tokens if the names differ; keep one source of truth).
- `body { text-shadow: 0 1px 2px rgba(11,13,18,.9); }`

## B. The panel: no border, no box
```css
.panel { left: var(--gutter); width: min(30rem, calc(100vw - 2*var(--gutter)));
  border: 0; background: none; border-radius: 0; padding: 0; isolation: isolate; }
.panel::before { content: ''; position: absolute; z-index: -1; inset: -2.75rem -3.25rem;
  background: rgba(11,13,18,.86); border-radius: 2.5rem; filter: blur(26px); }
```
(Adapt selectors to the real DOM.) No element in the story text may have a visible border or a
filled card background afterwards — add an e2e assertion: for every element inside the panels,
computed border widths are 0 (or border-style none) and background-color is transparent, except the
`::before` pool.

## C. The brief as typography, not a form
- Add `<p class="brief-label">The brief</p>` above the ask (in 01-vibe-build.md; keep the parser and the
  content test happy). Ask: italic 1.3rem/1.35.
- `div.brief { margin: 1.1rem 0 1.2rem; padding-left: 1.5rem; border: 0; background: none; }`;
  `ul.brief` 1.125rem/1.42, no list-style, `li { position: relative; padding: .28rem 0; color: var(--ink-dim) }`.
- Unmet marker: `li::before` a 4px unlit mote, `rgba(232,230,238,.28)`, round, at `left: -1.5rem; top: .86em`.
- Met (`li[data-met]`): text `var(--ink)`; `::before` 7px,
  `radial-gradient(circle at 40% 40%, #DFF0FF, #4DA3FF 55%, #2D7AD6)`,
  `box-shadow: 0 0 6px 1px rgba(77,163,255,.65), 0 0 16px 3px rgba(77,163,255,.28)`. No transition.
  Remove every checkbox glyph/tick character and the old bordered tick box.
- Fence the no-transition constraint (deferred minor from Task 3): an e2e assert that the computed
  `transition-duration` of `li::before` and of `li` is `0s`.
- Accessibility (deferred minor): expose met state to screen readers without changing visuals, e.g.
  `applyBrief` also sets `aria-label` or a visually-hidden "done" suffix; keep it a pure function of progress.

## D. Reorder the brief so ticks land in reading order
Ruled by the controller: new line order, copy unchanged:
1. `saddle handlebars` — "A comfy seat and a set of handlebars, both adjustable so it fits people of different heights."
2. `front-wheel rear-wheel cranks chain-* pedal-left pedal-right` — "Two wheels, with the pedals driving the back one through a chain."
3. `fork front-wheel` — "The front wheel turns so you can steer."
4. `brake-front brake-rear handlebars` — "Hand brakes and a bell."
5. `frame` — "Sturdy, but light enough to carry up a flight of stairs."
Update the thresholds test to the strictly increasing [0.45, 0.72, 0.8, 0.87, 0.95] and add an assertion
that the shipped brief's thresholds are non-decreasing in document order.

## E. Running labels and panel fade
- Each section's panel gets a Geist Mono running label above its text: "01 — The brief", "02 — It runs",
  "03 — Rewind", "04 — Start again" (sentence case after the number; take the label from the section's
  front matter, e.g. a `label:` key, not hard-coded by index). Colour --ink-mute.
- Panel opacity from scroll: `reveal = smoothstep(0,.06,local) * (1 - smoothstep(.94,1,local))` where
  `local` is the section's own progress. Pure function of progress, set as a CSS variable or opacity from
  the scroll-driver callback; no CSS transition. This also stops panels stacking at section boundaries.
  Make sure `?p=` jumps and the e2e tests that read panel text still work (they may need p values away
  from a boundary).

## F. Portrait (aspect < 1)
Camera, in `applyCamera` only (the keyframes stay untouched; landscape output must be bit-identical):
- `m = clamp(0.89 / aspect, 1, 2.4)`; `target' = [0, target.y, 0]`; `pos' = target' + (pos - target) * sqrt(m)`;
  `fov' = 2 * atan(tan(fov/2) * sqrt(m))`; `camera.setViewOffset(w, h, 0, 0.15*h, w, h)`;
  `camera.clearViewOffset()` in landscape. (Interpret sign of the lens shift so the machine sits in the
  UPPER part of the screen; text lives in the lower part.)
- Tests at a 390x844 viewport (unit test on the pure camera function is fine, plus one e2e screenshot
  check if cheap): the projected whole-machine bounding points for vibe-build@1 and reveal 0.3..1 fit
  |x_ndc| < 0.92 and y_ndc > -0.15; at the spec section the core spans >= 75% of the width.
  A landscape test proves the function is the identity for aspect >= 1.
Text:
```css
@media (orientation: portrait) {
  .panel { top: calc(100svh - 2*var(--half-h) - 20px); left: 16px; right: 16px; width: auto; }
  .panel::before { display: none; }
}
```
plus a fixed bottom scrim behind the text (z below the panels, above the canvas):
`linear-gradient(to top, rgba(11,13,18,.95) 0, rgba(11,13,18,.88) 38svh, rgba(11,13,18,0) 62svh)`,
portrait only. Move the vignette centre to 50% 38% in portrait. Use svh, never vh. Portrait sizes: body
1.125rem, brief lines 1.0625rem, ask 1.2rem, paragraph gap .85em. (`--half-h` is from the mockup; use
whatever the real layout needs so text sits in the lower ~45% and never overlaps the machine.)
Also: the landing page / compare page are out of scope.

## G. Mannequin torso (bike/rider.ts)
The author says the mannequin "looks like it has boobs". Cause: the chest is a horizontal capsule of
radius 0.1 across chestWidth whose two rounded ends bulge forward over a thinner waist capsule.
Replace chest + waist with ONE tapered torso: a lofted/tapered solid from the pelvis (hip width) to the
shoulder line (shoulder width), front-to-back depth about 0.55-0.65 of its width, flat or gently convex
front with no paired lobes (an elliptical frustum is fine; add a small helper in bike/ or src/shapes if
needed, closed surface, outward normals). Keep head, neck, limbs, proportions and pose unchanged; the
proportions tests stay. Add a test that fails on the old geometry: in the chest band (CHEST_AT +/- 0.05 of
hip->shoulder), the forward extent of points at |lateral| > 0.06 m does not exceed the forward extent at
|lateral| < 0.03 m (no paired forward lobes). Keep the mannequin dim neutral grey.

## Verification
`npx tsc --noEmit -p .`; `npx vitest run`; full e2e `E2E_PORT=4197 npx playwright test`; then
`SHOTS=1 E2E_PORT=4197 npx playwright test e2e/shots.spec.ts`. Also capture your own screenshots of the
essay with `?test=1` at 1440x900 and 390x844 for p in {0.2 (brief mid-build), 0.3 (brief done), 0.41
(reveal with mannequin), 0.9 (spec)} into `shots/task8/` (gitignored is fine; tell me the paths). Use fresh
pages per URL (SwiftShader is slow). Never run `playwright install`. Look at them and say honestly whether
any rectangle remains, whether text is legible over the bike, whether the portrait bike is whole, and
whether the torso still reads as having breasts.

Commit in logical commits (text+brief, portrait, mannequin). Report to task-8-report.md in this folder;
return only status, commits, one-line test summary, screenshot paths, concerns.
