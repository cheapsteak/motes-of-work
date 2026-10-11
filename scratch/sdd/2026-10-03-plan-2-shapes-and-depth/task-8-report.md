# Task 8 report: mechanism comparison page

## What I implemented

**Page:** `src/compare/compare.html` (+ `compare.css`), `src/compare/compare.ts`, `src/compare/controls.ts`;
added as the `compare` input in `vite.config.ts`. Built to `dist/src/compare/compare.html`; every asset URL
in the built HTML is relative (`../../assets/...`) under `BASE_PATH=./`.

- **Registry-driven.** The mechanism picker, the blurb, the 2×2 panes and the e2e loops all come from
  `MECHANISM_IDS` / `mechanisms` plus `mechanismMeta`. A merged mechanism appears with no compare-page edit
  (only its line in `meta.ts`).
- **Meta:** `src/mechanisms/meta.ts` exports `mechanismMeta: Record<MechanismId, { label; blurb }>`, read
  from each module's `label` / `blurb` exports. Added `label = 'Gears'` and a one-sentence blurb to
  `src/mechanisms/gears/index.ts`. `src/mechanisms/meta.test.ts` asserts set-equality of meta keys with the
  registry and checks sentence-case label / one-sentence blurb, so a merged mechanism without meta fails
  (it also fails the type check, since the record is keyed by `MechanismId`).
- **Side panel** (`controls.ts`): picker (one button per registered mechanism, `aria-pressed`), blurb,
  "Side by side" checkbox, budget select (30k / 100k motes, remembered separately per view: default 100k
  single, 30k per pane in 2×2; `?budget=30000|100000` sets both), "Reset view"; the five presets; sliders
  grouped Machine (assembly, wrong twin, ghost, drive + Play/Pause and a speed slider), Provenance (vibed,
  misallocated), Faults (all `FAULT_KEYS`, two columns). Every slider row has a tooltip (from spec §5.3 for
  faults). The slider list is a pure table (`SLIDERS`) built from `FAULT_KEYS`, so a new fault appears
  automatically; a unit test fences `SLIDERS` against every `mech.*` / `provenance.*` leaf of
  `SCENE_STATE_PATHS` by set-equality.
- **Presets** each spell out every slider (built over the specced values, unit-tested for set-equality with
  the slider paths and range). Values: *Specced* — assembly 1, everything else 0, drive 0.15. *Vibed (wrong
  twin)* — variant 1, vibed 1, no ghost (spec §5.2: the vibe build has no ghost). *Quiet failure* —
  misallocated 1, ghost 1. *Exploded* — assembly 0.75 (the per-mechanism "exploded-0.75" look: core
  settled, offsets a quarter out; assembly 0 is the nebula, not an exploded view), ghost 1. *Faults 0.6* —
  every fault 0.6, ghost 1. Presets set drive to 0.15 too; the Play toggle and speed are modes, not
  sliders, and are left as they are (if playing, play continues from 0.15).
- **Drive play:** drive slider spans 0..10 cycles; Play animates it from the wall clock
  (`playDrive(start, rate, seconds)`, wrapping at 10, default 0.25 cycles/s) by moving the slider; any
  change by the author restarts play from the slider's current value. Pause freezes it. The machine is
  `stateFromSliders(values, camera)` → `SceneState` each frame; nothing accumulates.
- **Camera (ruling interpretation, please check):** one `OrbitControls` drives a *rig camera in
  machine-relative space* (SceneState.camera units), starting at pos [1.6, 1.1, 2.4], target [0, 0, 0].
  Each pane maps the rig to world space with `applyCamera(camera, state, mechanismAnchors(mech))`
  (coreFocus 0 → the whole anchor). That map is a translate + uniform scale, so it is exactly a world-space
  orbit about the mechanism's whole anchor, as ruled, with zoom distances in machine radii (min 0.3,
  max 12). Consequences: picking another mechanism re-frames it at the *current* orbit angle (same
  relative view, new machine); "Reset view" returns to the three-quarter view; in 2×2 **orbit is shared**
  (one rig, same spherical angles and relative zoom for all four panes; dragging any pane orbits all).
  Damping on outside test mode. `state().camera` is therefore the machine-relative camera, so the hook's
  state fully describes the frame.
- **2×2:** four renderer scissor/viewport panes, each with its own mote system (cached per
  mechanism@budget, so switching back is instant) and its own camera at the same state. HTML overlay panes
  carry the label; panes beyond the registry say "Not yet built". The picker is disabled in 2×2 and the
  blurb line explains the view.
- **Rendering:** reuses `createMoteSystem`, `applyCamera`, `mechanismAnchors`, lighting via the mote
  system. DPR capped at 2, clear colour #0B0D12, context-loss and no-WebGL notices. Idle shimmer as in the
  essay (off in test mode and under prefers-reduced-motion). The loop runs continuously only while
  something animates (shimmer, play, orbit damping); otherwise frames render on change.
- **Credits:** `CREDITS.md` is imported `?raw`, rendered with `marked` into a `<dialog>` opened from the
  footer link "Credits and licences"; the BSD-2 notice is in the page bundle, so it ships wherever the site
  goes. Footer also links "Read the essay" (`../../index.html`, relative).
- **Test hook** (`?test=1` only): `window.__compare = { state(), nan(), frames() }`. `nan()` is true if the
  latest state has a non-finite leaf **or** `partTransforms(mech, state)` of any mechanism on screen does
  (catches degenerate linkages, not only bad slider input).
- **Layout:** dark theme, sentence case throughout, panel 340px; at 1280×720 the whole panel fits with
  room to spare and nothing is clipped (both asserted in e2e). Below 720px wide the canvas stacks above
  the panel.

## Tests

- Unit (`src/compare/controls.test.ts`, 15 tests): sliders ≡ mech/provenance leaves (set-equality),
  every fault present, sentence-case labels, ranges; the five presets in order, each sets every slider in
  range, and say what they claim; `stateFromSliders` writes every slider and is finite at all extremes;
  `playDrive` rate, wrap, non-finite fallbacks. `src/mechanisms/meta.test.ts` (2 tests).
- e2e (`e2e/compare.spec.ts`, 9 tests + 1 SHOTS-gated, 900×560 viewport, 30k budget):
  picker lists exactly `MECHANISM_IDS` and each mechanism renders non-blank with its blurb, no errors, no
  NaN; `?mech=`; each preset non-blank, state and every slider input match the preset, no NaN; slider
  extremes (all min, all max, alternating) on every mechanism → no pageerror / console error (shader
  errors are console errors), no NaN, still drawing; 2×2 → four panes, every registered one non-blank by
  quadrant crop, others say "Not yet built"; drag orbits (distance preserved) and Reset view restores;
  play advances drive, pause freezes it and the slider shows it; controls fit 1280×720 with no clipped
  label/button/output; credits dialog contains the BSD-2 licence and copyright line.
- Relative base, by hand: `BASE_PATH=./ vite build` into `<tmp>/site/sub/`, served from `<tmp>/site`,
  opened `/sub/src/compare/compare.html` in Chromium: no page errors, no 4xx responses, credits present,
  "Read the essay" lands on `/sub/index.html` ("Motes of work").

## TDD evidence

- RED (unit): `npx vitest run src/mechanisms/meta.test.ts` → "Failed to resolve import ./meta" (file did
  not exist). `npx vitest run src/compare/controls.test.ts` → "Cannot find module './controls'".
  After implementing, one RED-then-GREEN: `playDrive(0.3, NaN, 1)` returned 0.3000000000000007 (double
  modulo); fixed the wrap.
- RED (e2e): with the `compare` input removed from `vite.config.ts` (page not built),
  `E2E_PORT=4180 npx playwright test e2e/compare.spec.ts -g credits` hung waiting for `__compare` until
  killed (`timeout 110` → exit 124) — the page 404s. (A first full RED run was killed by my own 300 s
  timeout before printing.) The clipping assertion was added after the first screenshots showed
  "Spe…" / "Misallo…" ellipses and failed on that build (7 outputs 1px too narrow, the "Side by side"
  label clipped) before the CSS fix.
- GREEN: `npx playwright test e2e/compare.spec.ts` → 9 passed (1 skipped without SHOTS); with
  `SHOTS=1` → 10 passed (1.9 m).
- Full suite: `npm run typecheck` clean; `npm test` → 28 files, 252 tests passed; `npm run e2e` →
  43 passed, 3 skipped, 1 failed: `parity.spec.ts` "GLSL mote() matches the TS reference" timed out
  *setting up the browser context* (30 s, before the test body ran) while three other worktrees were
  running e2e on the same machine. Rerun `npx playwright test e2e/parity.spec.ts e2e/compare.spec.ts`
  → 10 passed, 1 skipped (SHOTS). I did not touch shaders or parity code.

Commit: `083786a feat: mechanism comparison page`.

## Screenshots (looked at)

`shots/compare-single-specced.png` (1280×720, gears, Specced, 100k): panel left, all controls visible with
space below the faults; machine right, three-quarter view from upper right: amber drive gear with
lightening holes and involute teeth reading as a solid disc, blue 9-tooth pinion meshing to its right, the
crank a near-white bar (known Task 4/9 look item), the frame plate as a blue dotted slab behind, the loose
bracket an L at lower right. Depth reads (far edge of plate dimmer, perspective on the plate). The label
"Gears" top left. Faults 0.6 shot: everything visibly smeared/jittered with the ghost dots, crank
brightest; Vibed: all blue, the pinion moved coaxial onto the drive gear (twin) and reads as a different
build; Exploded: parts offset with in-flight motes as a star field. Quiet failure
(`compare-single-quiet-failure.png`) is the weakest: the whole machine reads pale/near-white with blue
flecks (the white ghost dots at opacity 1 sit on every surface), and "warm on the case, sparse core" is not
legible at this view — a look item for Task 9 (preset ghost lower, or the misallocated colouring), not a
page bug.
`shots/compare-grid-specced.png` (2×2, 30k per pane): four panes with thin dividers; top-left "Gears",
smaller and sparser (30k in a quarter pane) but the gears, pinion, crank and bracket are legible; the other
three say "Not yet built" centred. Picker disabled, blurb explains the view.

## Files

Created: `src/compare/compare.html`, `src/compare/compare.css`, `src/compare/compare.ts`,
`src/compare/controls.ts`, `src/compare/controls.test.ts`, `src/mechanisms/meta.ts`,
`src/mechanisms/meta.test.ts`, `e2e/compare.spec.ts`. Modified: `vite.config.ts`,
`src/mechanisms/gears/index.ts` (label/blurb exports). Beyond the brief's list: `compare.css`,
`controls.test.ts`, `meta.ts`/`meta.test.ts` and the gears exports (all per the dispatch).

## Self-review / concerns

- **Camera interpretation** (rel-space rig) above — equivalent to a world-space orbit about the whole
  anchor, chosen because it gives shared 2×2 angles and re-framing for free. Flagging in case the
  controller wanted the angle reset on mechanism change (one-line change: call `resetView()` in the picker
  handler).
- **Merging Tasks 5–7:** add one line per mechanism to `src/mechanisms/meta.ts` (import its `label` /
  `blurb`). Until then `meta.test.ts` and the type check fail on purpose.
- **2×2 panes at 30k look sparse** in a quarter pane; the author can pick 100k per pane (400k total) on a
  real GPU.
- **Process note:** while cleaning up my own preview server I ran `kill` on every `vite preview` process
  once (around 06:49 UTC); that may have stopped the parallel worktrees' preview servers on ports
  4174–4176 mid-run. If a Task 5–7 e2e run failed with a connection error around then, rerun it. Later
  cleanups were scoped to my own ports.
- Not done: a URL that encodes the full slider state (shareable link) — not asked for.

## Fix round 1 (commit a72ada3)

1. **Vacuous 2×2 check.** `canvas()` in `e2e/compare.spec.ts` now adds a style tag that hides every
   overlay on the canvas (`#panes, .pane, #building, #notice, #orbit-hint`) before the element
   screenshot. All non-blank checks use it, both single view and 2×2. Pane label text is asserted first,
   while the overlays are still visible. Then each quadrant is cropped and checked: a registered pane must
   be `> NON_BLANK` and an empty ("Not yet built") pane must be `< NON_BLANK`. With overlays hidden the
   empty panes now pass below the threshold. Before the fix the reviewer measured 1975 for an empty pane,
   so the check now separates drawn panes from blank ones. Once all four mechanisms are registered there
   is no empty pane, and that half of the check has nothing to test.
2. **Author UX.**
   - Each preset has a one-sentence `blurb` (unit-tested). The line under the presets reads
     "<name>: <blurb>", or "Custom state. A preset sets every slider at once." after a slider is moved by
     hand.
   - The last-clicked preset is marked with `aria-pressed`. Moving any slider by hand clears the mark;
     play-driven drive updates do not. The page opens with "Specced" marked.
   - `GROUP_HINTS` adds a visible one-line hint under the Machine, Provenance and Faults headings. A unit
     test fences the keys against the slider groups.
   - When a mote system is not yet cached, draw shows a centred "Building <names>, <n>k motes…" notice
     (`#building`, role=status). It waits two animation frames so the notice paints, then builds and
     draws.
   - To keep 1280×720 scroll-free with the new lines:
     - the panel is now 372px wide;
     - the orbit hint moved to a small overlay at the bottom right of the canvas;
     - Provenance is two columns;
     - slider rows are 20px high;
     - padding is tighter.

     There is about 30px of slack. A mechanism blurb of 5 or more lines would overflow, and the fit test
     would catch it.
3. **Lifetime.** New `src/compare/systemCache.ts` (`SystemCache`). Within the current view's budget,
   every mechanism stays cached, so single-view mechanism switches stay instant. Each draw calls
   `keepOnly(budget)`, which disposes (scene.remove + `MoteSystem.dispose`) every entry at another budget.
   That covers both a budget change and a view-mode change, because the two views keep separate budgets.
   - Unit test (`systemCache.test.ts`, 3 tests): build-once, keepOnly disposes exactly the other budget,
     and rebuild after dispose.
   - e2e: the hook gains `systems(): string[]`. Changing 30k→100k leaves exactly `gears@100000`, and the
     building notice was seen (recorded with a MutationObserver) mentioning 100k. Switching to side by
     side (30k) leaves only `@30000` keys.
4. **A11y.** The Play button toggles only its label (Play/Pause) and has no `aria-pressed`. The no-op
   `aria-hidden="false"` is removed.

Tests:
- `npx tsc --noEmit -p .` is clean.
- `npx vitest run`: 29 files, 257 tests passed.
- `SHOTS=1 E2E_PORT=4173 npx playwright test e2e/compare.spec.ts`: 12 passed (1.3 m).
- RED along the way: the fit test failed at 812 > 720 after the hints and preset line were added. It
  passed after the layout changes.
- I wrote `SystemCache` before its unit test, so that part has no RED step.

Screenshots were re-taken. The single view and the 2×2 view look as before, now with the preset line
("Specced: the right machine built from a spec: warm core, cool body, no faults."), the three group hints,
and the orbit hint at the bottom right of the canvas.

Process: the only servers I started were Playwright's own on 4173 and a temporary probe on 4183. I
started the probe from a Node script and stopped it by its own process group. I did not touch
4174–4176.
