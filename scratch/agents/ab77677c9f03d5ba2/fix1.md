
---

# Fix round 1 (review findings and controller follow-ups)

Base `071a60f` (after the polish-compare merge). Commits:

| SHA | Subject | Items |
|---|---|---|
| `71939c9` | fix: comparison page minors (build failure notice, disabled twin rows, ARIA) | 5 (compare caller), 8 |
| `2a2b228` | fix: ghost drawn on top, alpha as a LIGHTING uniform; required pixel ratio | 1, 5, 6, 7 (blend equation) |
| `548e0a4` | fix: widen the pallet fork arms outward only, clear of the escape wheel | 2 |
| `7c9abe3` | feat: amber core (80% Human), core settles from the settle window | 3, 4 |
| `8dba8c1` | test: capture the renderer alone; lit-faces probe at a 3k budget | 7 (capture), 9 |

## What changed

1. **Ghost under the motes.** `ghostMesh.renderOrder = 1`, so the ghost now draws after the motes and threads. A unit test asserts it is above both meshes. The "drawn on top" comments now say why.
   - **Re-measured** with the ghost on top. The figure is added light on the steam spec close-up, summed RGB over the no-ghost render:

     | Alpha, stride | Ghost 0.6 (story) | Ghost 1 |
     |---|---|---|
     | 0.18, 6 | 2.3M | 3.9M |
     | 0.25, 6 | 3.2M | 5.4M |
     | 0.3, 4 | 5.7M | 9.3M |
     | 0.4, 4 | 7.5M | 12.3M |

   - The old white ghost at 1 was 13.8M.
   - Fixing the order barely changed the numbers: 0.4/4 at 0.6 went from 7.0M to 7.5M.
   - **Final values: alpha 0.4, stride 4.** Looked at in the renders, 0.4/4 is the faintest setting that still shows the stand and bed outline at the story's 0.6. Gears quiet failure at 0.4 still shows the warm-on-case flecks.
2. **Fork clearance.**
   - `forkOutline` takes an optional `armOuterHalfWidth`. The arms keep their 0.034 inner half-width and widen to 0.102 on the outer side. The lever (0.076) and depth (0.08) stay doubled. The values live in an exported `FORK` constant.
   - New test: the closest arm-outline point to the escape arbor must be at least the stones' inner end, at rest and at plus or minus BANKING.
   - RED with the old symmetric 0.068: "angle 0: expected 0.3789 to be >= 0.4049". GREEN after the change.
3. **Core typing.** Specced core motes are Human when h2 < `CORE_HUMAN_SHARE` (0.8), Dialogue otherwise. The new test measures an 80/20 split over 20k points. Hero fractions are unchanged.
   - Shots: cores are now clearly amber with violet accents (steam governor, watch escapement, gears drive gear).
   - Warm share of machine pixels:

     | Shot | Before | Round 0 | Now |
     |---|---|---|---|
     | steam | 4.3% | 3.7% | 8.5% |
     | strandbeest | 4.0% | 5.5% | 11.0% |
     | watch | 6.5% | 4.3% | 9.3% |
     | gears | 10.6% | 7.9% | 14.9% |
     | spec 0.9 | 16.4% | 9.1% | 16.8% |
4. **Core settle floor.** Core settle runs from `SETTLE_WINDOW` (0.12) to 0.45, so no core mote is part-settled at assembly 0. A test checks that every core mote has `settled === 0` at assembly 0.
   - The settle constants moved to the new `src/scene/mote/settle.ts`, because `attributes.ts` needs them and importing from `mote.ts` would make a cycle. `mote.ts` re-exports them.
   - Parity is unaffected: settle is an attribute fed to both sides.
5. **`pixelRatio` is required** in `MoteSystem.update`. `src/compare/compare.ts` now passes `renderer.getPixelRatio()`; `main.ts` and `renderSpike.ts` already did.
6. **Ghost alpha as a uniform.** `LIGHTING.ghostAlpha` = 0.4 reaches the ghost as `uGhostAlpha`. The ghost material now gets the lighting uniforms too; it reads only that one. So the `?dev=1` Lighting group gains a "Ghost alpha" slider automatically. `lightingDev.test.ts` checks the slider exists.
7. **Capture CSS and blend equation.**
   - `CANVAS_ONLY_CSS` in `e2e/helpers.ts` hides `#story` and the `body::after` vignette. It is used by `openStage`, so it covers shots and purity, and by `looks.spec` and `reducedMotion.spec`.
   - `blendEquation: AddEquation` is set explicitly and a unit test asserts it.
8. **Comparison page minors.**
   - `buildThenDraw` catches a failing build: it logs, shows the existing notice, and requests a frame only after a successful build.
   - Twin pair disables the Wrong twin and Vibed inputs as well as dimming them. The twin-pair e2e checks they are disabled, and enabled again in Single.
   - The View radiogroup sets role and aria-label with `setAttribute`; e2e finds it by role and name.
   - Fixed the stale `systemCache` comment and the "circles the core" comment.
9. **Lit-faces probe, re-derived** (looks.spec, `LIT_QUERY = '&n=3000'`, rationale in a comment there).
   - A point cloud has no occlusion, so each view sums both faces of a plate. That bounds the ratio at (L + f d)/(f + L d), about 1.31 for fill 0.45, key 1.0, backfaceDim 0.5.
   - At 100k, the gears core stacks deep enough that screen blending saturates pixels toward the type colour, so the probe measures coverage more than shading (gears 1.208).
   - At 3k the stacking is shallow and the ratio is flat from 5k down to 2k (gears 1.237 / 1.248 / 1.248). So the probe reads per-mote shading.
   - The threshold stays 1.2. Other probes I tried:

     | Probe | gears | steam | strandbeest | watch |
     |---|---|---|---|---|
     | Unsaturated-pixel mean at 100k | 1.34 | 1.15 | 1.11 | 1.37 |
     | Sum at 10k | 1.25 | 1.36 | 1.62 | 1.52 |
     | **Sum at 3k (chosen)** | **1.248** | **1.365** | **1.59** | **1.568** |

   - The unsaturated mean was inconsistent across mechanisms (strandbeest drops to 1.11), so I rejected it.
   - The remaining gears margin comes from the review's softer lighting (the two-sided bound of 1.31), not from the probe.

## Tests

- `npm run typecheck`: clean. `npm test`: 36 files, 441 tests passed.
- `npm run e2e` (port 4173, once at the end): **70 passed, 6 skipped, 0 failed**.
- Looks measurements:

| Mechanism | Lit faces | Ghost test near-white (ghost 1 / ghost 0) |
|---|---|---|
| gears | 1.248 | 19519 / 2830 |
| steam | 1.365 | 23133 / 4239 |
| strandbeest | 1.59 | 21715 / 5896 |
| watch | 1.568 | 17782 / 4358 |

- Purity non-background pixels: 33907 / 41618 / 125912.
- No looks or compare thresholds changed.

## Shots

- Regenerated with the four SHOTS specs. The round-0 set is kept at `scratchpad/agents/ab77677c9f03d5ba2/shots-round0/`.
- Machine shots no longer include the vignette, because they go through `CANVAS_ONLY_CSS`. The page itself still has it.
- White-out stays at 0 to 0.4% (watch twin 1.4%).
- The amber cores are the visible change.
- Exposure is unchanged from round 0 (vibe-build 0.9 74, spec 0.9 96).

## Concerns

- The ghost is a faint pencil outline at the story's 0.6. That is deliberate per the review, but fainter than the old white ghost the reviewer liked on the spec close-up. Raising `LIGHTING.ghostAlpha` (now a dev slider) is the knob.
- The gears lit-faces ratio is bounded near 1.31 by the two-sided geometry under the review's lighting. A future lighting change that softens backfaceDim further will meet the 1.2 fence again.
