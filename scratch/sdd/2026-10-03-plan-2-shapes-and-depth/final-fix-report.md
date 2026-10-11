# Final-review fix report: Plan 2, shapes and depth

Branch `plan-1-foundation`, base `8dba8c1`. Findings from `final-review.md`: Important 1–3 and Minor 4–10,
fixed per the controller rulings. Not pushed.

## Commits

| SHA | Subject | Finding |
|---|---|---|
| 5fee50c | fix: blend the watch twin in parameter space, so the morph never flips | 1 |
| b75e9e6 | fix: hold the strandbeest ratio fault inside the linkage's reach | 2 |
| 308b7b7 | feat: credits and licences link at the end of the essay | 3 |
| 3634ba4 | fix: light the steam twin's slack belt as it hangs | 8 |
| cc4b743 | fix: steam and strandbeest blurbs say what their wrong twin does | 5 |
| 8dd4947 | docs: the ghost alpha lives in LIGHTING alone, its measurements with it | 7 |
| a60b37e | fix: the fill spike says its worst-case framing was chosen on the gears | 10 |
| 82aeffe | fix: side by side lays out every registered mechanism, not four | 9 (and, by mistake, the deletions of 6) |
| 2488334 | test: one shot list for every mechanism, in shots.spec.ts | 6 |
| 37d5c89 | docs: README covers the comparison page and the folded shot list | 4, 6 |
| 1e9fefe | style: wrap the pane-camera line and say what it sizes | 9 follow-up |

Note on 82aeffe: the three `git rm`'d shot specs were already staged when I committed the grid fix, so that
commit also carries their deletion; 2488334 adds the folded replacement. I did not rewrite history to split
them (unpushed, but history rewrites need the user's say-so). The intermediate commit only lacks
SHOTS-gated screenshot specs, so nothing that runs by default breaks in between.

## Important 1: watch wrong-twin morph flipped through half turns

**What changed.** `src/mechanisms/watch/index.ts:97-229`. Each part's pose is now a `Spin`
(`position`, `outer`, `rest`, `angle`, `inner`), realised as `outer · rest · Rz(angle) · inner`
(`realise`, :117). Both variants already turn every part about its own part-space z: the watch with rest =
identity, the music box with rest = `ON_SIDE` (Ry(π/2)). Fault tilts map onto `inner` (the fork's misalign
roll, applied before its spin) and `outer` (the escape wheel's bent-arbor wobble, the fly and worm wobble,
applied after). `blend` (:124) lerps position and **angle**, and slerps `rest` (between two fixed rotations,
dot = cos(π/4), never flips) and the small tilts. Exported the existing `slerp` from
`src/math/transform.ts:48` for this. Endpoint poses are unchanged: a throwaway probe compared old and new
`pose()` at variant 0 and 1 over 2000 drive/fault draws, worst `transformDistance` < 1e-6 (probe deleted).

**Test.** New `src/mechanisms/continuity.test.ts`, run for every registered mechanism:
- drive swept across the story's drive range (derived by sampling the keyframes: [0, 2]) at variants
  0, 0.25, 0.5, 0.75, 1, faults zero; measured as the largest world step of real sampled points (both
  variants' shapes, 16 sampled plus the 8 farthest per part). Each moving part's largest step at 2000 steps
  must be < 0.6 × its largest step at 1000 (a jump keeps its size; continuous motion halves), and below an
  absolute 0.15 world units per step (the fastest honest motion, the watch balance rim, is ~0.08; the flips
  were 1–1.9).
- the whole story via `partTransforms(m, sampler.sample(p))` at 2000 vs 4000 steps, same halving rule.
- Slip and jitter (snap by design) stay at zero.

RED (old watch code), `npx vitest run src/mechanisms/continuity.test.ts`:
```
× every part moves continuously in drive at variant 0.25
× every part moves continuously in drive at variant 0.5
× every part moves continuously in drive at variant 0.75
× every part moves continuously along the whole story
AssertionError: barrel at variant 0.25: expected 1.0002063036263689 to be less than 0.6
AssertionError: barrel at variant 0.5: expected 1.0001395687901102 to be less than 0.6
AssertionError: barrel at variant 0.75: expected 0.9998972194408254 to be less than 0.6
AssertionError: barrel along the story: expected 0.9972103782060391 to be less than 0.6
Tests  4 failed | 24 passed (28)
```
(Gears, steam and strandbeest passed on the old code; the watch at variants 0 and 1 passed, as expected.)
GREEN after the fix: `Tests  28 passed (28)`.

## Important 2: strandbeest ratio fault teleported feet

**Measurement** (throwaway probes over `solveLeg`/`solveMirrored`, deleted). Largest gain with no clamp
anywhere in a turn (7200 steps), by bisection: 0.0703 at variant 0 (Jansen), 0.0789 at 0.1, 0.0795 from 0.2
to 1. Largest single-step foot move over variants 0..1, at 20000 steps per turn, and its ratio at 40000:

| Gain | Largest foot step (Jansen units) | Halving ratio | Stride at ratio 1 |
|---|---|---|---|
| 0.05 | 0.033 | 0.500 | ×1.049 |
| 0.06 | 0.051 | 0.500 | ×1.059 |
| 0.065 | 0.076 | 0.500 | ×1.064 |
| 0.07 | 0.193 | 0.500 | ×1.069 |
| 0.08 | 8.79 | 0.662 | |
| 0.10 | 16.6 | 0.836 | |
| 0.60 (old) | 23.6 | 1.102 | |

**What changed.** `RATIO_GAIN` 0.6 → 0.06 (`src/mechanisms/strandbeest/index.ts:67`), leaving margin
below the 0.0703 onset; the doc comment now says why and no longer promises a clamp at full fault.

**Tests** (`src/mechanisms/strandbeest/index.test.ts`):
- new :204 `every foot walks a continuous path at ratio %s, at every variant`: ratio 0, 0.25, 0.5, 0.75, 1 ×
  variants 0, 0.5, 1; all eight feet (with body lift) over one turn; largest step at 4000 < 0.6 × at 2000,
  and < 1 Jansen unit at 2000.
- new :168 `solves every joint without a clamp over the whole ratio dial, at every variant` (ratio 1 with
  every other fault at 1, variants 0..1, 720 steps: zero clamps, all finite).
- rewritten :185 NaN guard: now exercises the clamp beyond the dial (ratio 4 → throw 18.6), asserting
  clamps happen and nothing is NaN (the old test's geometric premise held only at gain 0.6).
- :231 over-stride: was `stride(0.5) > 1.15 × stride(0)`, now `stride(1) > 1.04 × stride(0)` and
  `stride(0.5) > stride(0)` (measured 1.059).

RED (gain 0.6), `npx vitest run src/mechanisms/strandbeest/index.test.ts -t "continuous path"`:
```
× every foot walks a continuous path at ratio 0.25, at every variant
× every foot walks a continuous path at ratio 0.5, at every variant
× every foot walks a continuous path at ratio 0.75, at every variant
× every foot walks a continuous path at ratio 1, at every variant
AssertionError: variant 0: expected 49.03490584502634 to be less than 1
AssertionError: variant 0: expected 0.6490175571306027 to be less than 0.6
AssertionError: variant 0: expected 0.7004704455053771 to be less than 0.6
AssertionError: variant 0: expected 0.9835714685656394 to be less than 0.6
Tests  4 failed | 1 passed | 22 skipped (27)
```
GREEN (gain 0.06): `Tests  5 passed | 23 skipped (28)`; whole strandbeest folder 40 passed.

**Concern.** The ratio fault is now subtle on the strandbeest: about a 6% over-stride at full fault. That is
the most this linkage allows through the crank alone. If it reads too weakly, the review's alternative
(spread the ratio fault over several link lengths) is the next step.

## Important 3: licence notice not reachable from the essay

**What changed.**
- New `src/credits/credits.ts`: `creditsHtml()` renders `CREDITS.md` with `marked`; `mountCredits()`
  fills a dialog and wires its open and close buttons. The comparison page now uses it
  (`src/compare/compare.ts:95`), and so does the essay (`src/main.ts:75`). In the build the notices sit in a
  shared `credits-*.js` chunk that both `main-*.js` and `compare-*.js` import (checked in `dist/`: "Revar"
  appears in that chunk, which `index.html` preloads).
- `index.html:11-20`: a `<footer id="site-footer">` with a "Credits and licences" button, and the same
  `<dialog>` markup as the comparison page (sentence case, `aria-labelledby`, Close button).
- `src/style.css`: `body { position: relative }` and `#site-footer` absolutely positioned at the page's
  bottom right, inside the trailing 100vh spacer, so it never changes the scroll range; a muted underlined
  text button (about 6.5:1 against the background) that brightens on hover or focus; dialog styles.
- `CREDITS.md` Libraries: adds marked (MIT) and the full notices of three.js and marked. marked's licence
  file also carries the original Markdown (John Gruber) notice; it is reproduced with it.

**Tests.** `src/credits/credits.test.ts` (the rendered credits carry the BOSL2, three.js and marked
notices). `e2e/app.spec.ts:188` `the essay ends on a credits link that opens the licence notices`: at
`?p=1` the contentinfo button is in the viewport, opens a dialog named "Credits and licences" holding the
Revar Desmera and MarkedJS notices, and Close hides it. The existing `the scroll range equals the summed
section heights` still passes, so the footer leaves progress mapping alone. Written with the feature, no
separate red run (the button did not exist before).

## Minor 4: README omitted the comparison page

`README.md:41-44`: rows for the comparison page's `?mech=`, `?budget=30000|100000`, `?dev=1` and the
`?test=1` hook `window.__compare` (its five methods). `README.md:51-57`: a short "Comparison page" section.
`npm run shots` line updated for finding 6.

## Minor 5: blurbs missing the twin clause

`src/mechanisms/steam/index.ts:54-55` and `src/mechanisms/strandbeest/index.ts:28-29`, one sentence each:
- Steam: "A horizontal mill engine whose flyball governor keeps the whole machine honest, and whose wrong
  twin has that governor cut loose, so the engine runs away."
- Strandbeest: "A Theo Jansen walking machine whose gait comes entirely from thirteen link lengths, and
  whose wrong twin gets four of them wrong, so its feet lose their flat stride."

New `src/mechanisms/meta.test.ts:30`: every blurb names its wrong twin. RED before:
```
× steam says in its blurb what its wrong twin does
× strandbeest says in its blurb what its wrong twin does
Tests  2 failed | 7 passed (9)
```
GREEN after. My first, longer strandbeest wording overflowed the comparison panel at 1280×720 by 5 px
(`the controls fit a 1280x720 window …` failed: received 725 against 720); I shortened both, and that e2e
passes.

## Minor 6: overlapping shot specs

Deleted `e2e/mech-{watch,steam,strandbeest}.shots.spec.ts`. `e2e/shots.spec.ts:36-74`: one test per
`MECHANISM_IDS` entry (300 s each), looks `assembled`, `exploded-0.75`, `twin`, `faults-0.6` (over the ghost,
drive 0.3, as the per-mechanism specs had them) and `fault-<key>` for each fault but drift (the
strandbeest's per-fault list, now for every mechanism), written as `shots/mech-<mech>-<look>.png` (the
`-lit` infix is gone, so there is one file per look). Still gated on `SHOTS=1`; page and console errors fail
the test. README updated. The stale `shots/mech-*` files from the old naming were removed before
regenerating (`shots/` is gitignored).

## Minor 7: ghost shader restated the alpha

`src/scene/mote/shaders/ghost.vert.glsl:15-18` now names `LIGHTING.ghostAlpha` only and keeps the stride's
reasoning. The alpha's measurements moved to its entry in `src/scene/lighting.ts:31-38`, the single home of
the value. `GHOST_STRIDE` stays a literal.

## Minor 8: steam twin belt lit as if taut

`src/mechanisms/steam/shapes.ts:171-207`: the span geometry is factored into constants and `spanFraction`
(`beltSag` gives the same values); new `beltSagNormal(x, y, n)` carries the flat normal through the inverse
transpose of the sag map's Jacobian, from the parabola's slope: `n ↦ (nx(1+sy) − sx·ny, ny, nz(1+sy))`,
normalised; the wraps keep theirs. Used at `src/mechanisms/steam/index.ts:264`.

Test `src/mechanisms/steam/index.test.ts:127`: for every belt point in the sagging span, two tangents of the
flat belt are carried through the sag map by finite differences of `beltSag` itself (independent of the
analytic slope), and the twin normal must be square to both (|cos| < 1e-4) and unit; wrap points keep the
flat normal; at least 10% of belt points tilt. The neighbouring "pose-only twin" test now exempts the belt's
normal too. RED before: `AssertionError: expected 0.25559245881889253 to be less than 0.0001`. GREEN after.

## Minor 9: side by side capped at four panes

`src/compare/controls.ts:154` new pure `gridShape(n)`: `cols = ceil(sqrt n)`, `rows = ceil(n / cols)` (4 →
2×2, 5 → 3×2). `src/compare/compare.ts:65` `GRID = gridShape(MECHANISM_IDS.length)`; `panes()` (:246)
covers the whole registry, padded with blank cells; `paneGrid()` (:254) returns `GRID`; `layoutPanes` sets
the overlay's `grid-template` from the same layout, replacing the three hard-coded CSS templates
(`src/compare/compare.css`); pane cameras are sized to the largest layout. The "Not yet built" label is gone:
the null-id branch is still reachable (a spare cell when n is not a full grid) and still clears its
viewport, but a spare cell is blank. The "Side by side" hint no longer says 2×2.

Tests: `src/compare/controls.test.ts:141` (`gridShape` for n = 1..12: fits, near square, no empty row or
column; 4 → 2×2, 5 → 3×2), RED first (`TypeError: gridShape is not a function`). `e2e/compare.spec.ts:191`
derives the pane count and per-cell crops from `gridShape(MECHANISM_IDS.length)` instead of four quadrants,
and spare cells must be empty and unlit; the orbit-hint test now reads `.pane .label` only.

## Minor 10: fill spike framing was gears-derived

`src/spikes/fill.ts:13-19, 31`: the comment says the framing was chosen on the gears and is not re-derived
after a switch, and the results JSON (which the HUD's results panel shows) carries
`framingFor: 'gears'` beside the existing `mechanism`. `e2e/spikes.spec.ts:78` checks both. I did not
re-derive the framing from anchors: the worst-case framing is a device measurement choice, not something to
derive blind.

## Verification

All at `1e9fefe` except the full e2e, which ran at `37d5c89` (the only later change is the line wrap in
`compare.ts`, which the shots run below rebuilt and exercised, compare spec included).

- `npx tsc --noEmit -p .`: clean.
- `npx vitest run`: 38 files, **482 passed** (441 at base; +41 new: continuity 28, strandbeest 6 net,
  steam belt 1, meta 4, gridShape 1, credits 1).
- `E2E_PORT=4191 npx playwright test`: **71 passed, 6 skipped** in 6.2 min (the 6 are the SHOTS-gated
  tests: the sections shot, four per-mechanism shots, the comparison screenshots). Base was 70 passed,
  6 skipped; +1 is the essay credits test.
- `SHOTS=1 E2E_PORT=4191 npx playwright test e2e/shots.spec.ts e2e/compare.spec.ts`: **25 passed** in
  5.1 min. `shots/` now holds 40 `mech-<mech>-<look>.png` (4 mechanisms × 10 looks), the section shots, and
  the comparison shots; the old `-lit` and per-spec duplicates were removed first.
- No processes left running (`pgrep` for vite preview and playwright: none). Nothing pushed.

## Concerns

1. Strandbeest ratio fault is now about a 6% over-stride at full fault: the linkage allows no more through
   the crank without the rocker passing its dead point. If it reads too weakly on the comparison page,
   spreading the fault over several link lengths is the next step.
2. Commit `82aeffe` (grid) also carries the deletion of the three per-mechanism shot specs, whose
   replacement lands in `2488334`; not split, to avoid rewriting history without approval.
3. Not done: re-deriving the fill spike's worst-case framing per mechanism (labelled instead, as the review
   allowed).
