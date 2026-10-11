# Task 9a: visual polish pass (report)

Base `ee4f09c`, branch `plan-1-foundation`, main worktree, e2e on port 4173. I did not touch `src/compare/**`.

## Commits

| SHA | Subject | Review items |
|---|---|---|
| `7ea4e82` | feat: screen-blend motes, raise the settled floor, CSS-px point caps | 1, 2, 5, 12 |
| `4ce022b` | feat: rebalance point shares so cores are warm, not dense | 3 |
| `96e5964` | feat: cooler ghost, deeper Dialogue violet, more heroes, firmer threads | 4, 6, 8, 13, 15 |
| `6ec5ee8` | feat: steam twin reads broken in a still; mill floor; heavier fork, solid comb | 9 (a, b, c), 10, 11 (partial) |
| `0af78ba` | feat: radial vignette over the essay stage | 14 |

I split the commits by writing intermediate file versions. Each intermediate tree passed typecheck and the affected unit tests. The final tree matches the version I tested end to end.

## What I implemented, item by item (final values)

1. **Screen blending.** Motes and threads use `CustomBlending` with `OneFactor` / `OneMinusSrcColorFactor`. `mote.frag` and `thread.frag` output premultiplied colour, `vec4(color * b * alpha, alpha)`. The ghost stays `AdditiveBlending`. A unit test pins both.
2. **Brightness and lighting.** The settled floor `mix(1, 0.5, t)` is now the named constant `SETTLED_BRIGHTNESS` in `mote.ts` and `MOTE_SETTLED_BRIGHTNESS` in `mote.glsl`. A test parses `mote.glsl` and compares it with the TS export. LIGHTING values are exactly the review's: key 1.0, fill 0.45, rim 0.5, backfaceDim 0.5, depthDim 0.7, depthShrink 0.25.
3. **Point shares.**
   - steam: `CORE_SHARE` 0.15.
   - gears: `[0.26, 0.2, 0.05, 0.4, 0.09]`.
   - strandbeest: core 0.12 and `CORE_GIRTH` 1.6.
   - watch: plate 0.36, escape 0.05, fork 0.045, balance 0.095, hairspring 0.03.
   - **Deviations:**
     - Watch: the review's numbers sum to 1.034, so barrel 0.123 → 0.109 and bridges 0.15 → 0.13 make them sum to 1.
     - Strandbeest: drift 0.035 → 0.025 and body 0.855, not 0.845. With the core at 0.12, the feet became the densest part, at 1.5× body density. That fails the "no part outshines" assertion and would read as bright specks. At 0.025 they are 1.05× body.
4. **Ghost.** Cool tint `(0.78, 0.84, 1.0)`, additive. `keyframes.json` sets `mech.ghost` at spec@0.3 to 0.6.
   - **Deviation: alpha 0.4 at stride 4, not 0.18 at stride 6.** I measured the ghost's added light on the steam spec close-up: the summed pixel difference between ghost on and off.
     - HEAD at ghost 1: 13.8M.
     - Review values at ghost 1: 3.6M. At the story's 0.6 that is about 15% of the old light, and in the render the engine outline was gone.
     - 0.4 at stride 4, at ghost 0.6: 7.0M, about 50%. The stand and bed outline reads again.
     - On gears quiet failure at ghost 0.4 (the new compare preset), the warm-on-case pattern stays legible.
   - I also tried 0.3/6, 0.4/6, 0.5/6 and 0.6/6. All were fainter in the render than 0.4/4.
5. **Pixel ratio.**
   - `uniform float uPixelRatio` is declared in `instance.glsl` and shared by all three materials.
   - `moteSystem.update` takes `viewportPx.pixelRatio`, optional and defaulting to 1. `main.ts` and `renderSpike.ts` pass `renderer.getPixelRatio()`.
   - Caps are now CSS px × uPixelRatio: halo 56, point 3.5, twin 12. The ghost half-size and the thread half-width scale the same way.
   - Purity holds: the ratio comes from the renderer, not from time.
6. **Dialogue colour.** `#C4B0FF` in `mote.frag` and `thread.frag`.
8. **Heroes.** `HERO_HUMAN` 0.02, `HERO_DIALOGUE` 0.04. The halo is `0.35·exp(−5r²)` plus the unchanged bright core.
9. **Steam twin.** Kinematics constants are in `steam/kinematics.ts`:
   - (a) The lever hangs at `TWIN_LEVER_DROOP` = −35° whatever the speed. The stem has dropped into the bonnet and leans 40° (`TWIN_STEM_LEAN`) against the valve. Gaps are > 0.3 at both lever ends; tests check this.
   - (b) The spindle, arms, links and sleeve lean 12° toward the flywheel about the spindle foot.
   - (c) Slack belt: belt points get a sagged `localTwin`, a parabola on both straight runs of up to 0.12 at mid-span, zero on the pulley wraps.
   - The overspeed is kept. Unit tests changed where they asserted the old twin ("lever thrown the other way", "throttle wide open", "pose-only twin"). Governor tests now check the twin in its unleaned frame.
10. **Steam floor.** A `floor` body part is a single-sided `ShapeGeometry` facing +y, level with the underside of the bed. It holds a fixed `FLOOR_SHARE` = 2% of the body + drift points through a new `share` field on the part spec. Jitter does not move it.
    - **Deviation: an oval, not a 1.5× rectangle.** The rectangle pushed the steam whole-anchor radius from 2.24 to 2.67, which pulls every wide camera back about 19%. The oval (centre (−0.2, −0.3), radii 2.1 × 1.05 in engine x/z) keeps the radius at 2.22. A test requires the floor to stay within 2% of the engine-only framing sphere.
    - **Deviation: the floor sits at the bed bottom (y −0.62), not 0.1 below it,** so the bed and the outboard bearing stand on it.
    - It has a pit where the flywheel rim crosses the floor plane.
11. **Watch (partial).**
    - Pallet fork: arm and lever half-widths doubled (0.068 / 0.076), and the extrude depth doubled (0.08).
    - Comb: one extruded outline (block plus 18 tines) from the bedplate to the tine front, tines 0.1 wide with 0.025 slots.
    - I skipped the framing and Dialogue-typing parts, as instructed.
12. **Settle window** −0.12 (`SETTLE_WINDOW` / `MOTE_SETTLE_WINDOW`), identical in TS and GLSL. Parity passes.
13. **Thread alpha** 0.4.
14. **Vignette.**
    - On the essay page it is `body::after`, `position: fixed`, `z-index: 0`: above the canvas, below `#story` (z 1). It uses `pointer-events: none` and is hidden under `.no-webgl`. A new e2e test checks this, and that a panel's centre still hits the panel.
    - **The comparison page is left alone.** It loads only `src/compare/compare.css`, so the vignette would not be a pure shared-stylesheet change there.
15. **Jitter in the story.** I checked: `keyframes.json` has no `mech.faults.*` track, so story jitter is 0 everywhere. I added a keyframe test that samples 401 points and fences story jitter at ≤ 0.25 and ghost below 1. The preset part of this item is in `src/compare`, so not mine.
7. **Skipped,** as instructed.

## Tests

- `npm run typecheck`: clean.
- `npm test`: 35 files, 420 tests passed.
- `npm run e2e` (port 4173, run twice, the second time on the final values): 62 passed, 6 skipped (the SHOTS-gated ones), 0 failed. No thresholds changed in looks or compare.
- Measured (looks annotations, final run):

| Mechanism | Lit faces before | Lit faces after (front / back) | Ghost test near-white after (ghost 1 / ghost 0) |
|---|---|---|---|
| gears | 1.42 | **1.207** (24.26M / 20.09M) | 17353 / 4598 |
| steam | 1.33 | 1.275 | 18980 / 6655 |
| strandbeest | 1.70 | 1.61 | 19417 / 7317 |
| watch | 1.66 | 1.42 | 15737 / 7149 |

- The fence is > 1.2. **The gears margin is thin**: screen blending compresses its dense core front. Key 1.1 only gets it to 1.22. I kept the review's 1.0 and recorded this in the `looks.spec.ts` comment.
- Purity non-background pixels: 33819 / 41618 / 125701.

### TDD evidence

- RED: `npx vitest run src/scene/mote/mote.test.ts src/scene/mote/moteSystem.test.ts` → 6 failed. The causes were: `SETTLE_WINDOW` / `SETTLED_BRIGHTNESS` not exported; "expected 2 to be 5" (`AdditiveBlending`, not `CustomBlending`); `uPixelRatio` undefined. GREEN: 56/56 after implementing.
- RED for the weights (gears counts, watch weights, strandbeest share): 3 failed. GREEN after the change.
- RED for steam: "no part floor", plus `leverAngle` twin 0.159 ≠ −0.611. GREEN: 228/228 across mechanisms and timeline.
- RED for watch: fork "0.038 to be greater than 0.07", comb "0.64 ≥ 0.75". GREEN after the change.

## Shots: before and after

The before set is in `scratchpad/shots-before/`. I regenerated with the four SHOTS specs, and also re-rendered the reviewer's 21 extra views into my private scratch (`agents/ab77677c9f03d5ba2/review-after/`). The figures below come from the reviewer's `measure.mjs`.

**Improved:**
- **White-out is gone almost everywhere.** Share of machine pixels at ≥ 250:
  - gears 5.7% → 0.2%
  - steam 7.1% → 0.7%
  - strandbeest 19.9% → 0.7%; with faults 21–26% → 5–7%
  - watch 3.3% → 0.1%
  - watch twin 9.0% → 2.3%
- The strandbeest core leg is now a legible amber leg instead of a white bar. The watch fly and balance are no longer blown. The steam governor balls are spheres again, not white discs.
- **Steam twin.** It now reads as broken in a still: in the cold-open render the lever hangs loose, the stem leans by itself, the governor tilts, and the belt visibly sags. This is the clearest gain of the pass.
- **Watch twin comb (head-on).** It now reads as discrete teeth on a block, not hatching.
- The body is more even, and coverage is up 1–4 points in every mechanism shot.
- The vignette gives the wide shots a soft centre.

**Did not improve, or got worse:**
- **Exposure in the story sections barely moved.** Mean machine luminance: vibe-build 0.9 70 → 74, rewind 0.1 71 → 75. The review hoped for about 110.
  - rewind 0.9 fell 101 → 87: the nebula dots are smaller, because the point cap at dpr 1 is now 3.5 px, not 4.
  - The spec sections fell 111–117 → 88–94, from the dimmer ghost and fewer core points.
  - Screen blending trades peak for spread; it does not add light.
- **Warm share fell** in most shots, for example spec 0.9 16.4% → 9.1% and steam 4.3% → 3.7%. The core reads cream or pale gold rather than saturated amber. 45% of specced core motes are Dialogue, and screen-mixing amber with the deeper violet goes toward cream. So "warm, not dense" is only half achieved. Fixing that would need a change to the core type mix (spec §5.1), which is out of scope.
- **The steam floor at 2% reads as dust under the bed, not as a floor,** from the three-quarter and cold-open cameras. From three-quarter it could be mistaken for drift shedding. It may want a higher share or a ground line once the low story cameras (item 7) exist.
- **Watch at three-quarter: the comb and fork gains are small.** The solid comb spreads the bridges' points over much more area (slot walls), so it is dim at 3/4. The fork is a slightly brighter chip.
- **Gears (story mechanism) spec framing changed.** With the crank at 5%, the gears core anchor centroid moved and its radius grew (2.27 → 2.53), so the spec close-up pulls back about 11%. The framing test still passes. The twin crank fan is also less prominent in vibe-build. Gears is the placeholder, so I left this alone.
- **Faults-0.6 shots** are still smears: the shot specs use jitter 0.6. Item 15 caps only the story and presets.

## Files changed

- Rendering:
  - `src/scene/lighting.ts`
  - `src/scene/mote/{mote.ts, mote.glsl, mote.test.ts, moteSystem.ts, moteSystem.test.ts}`
  - `src/scene/mote/shaders/{mote.vert, mote.frag, thread.vert, thread.frag, ghost.vert, ghost.frag, instance}.glsl`
- Callers: `src/main.ts`, `src/spikes/renderSpike.ts`. The spike caller is outside the listed files; it needed the new `pixelRatio` for consistency.
- Mechanisms:
  - `src/mechanisms/gears/index{,.test}.ts`
  - `src/mechanisms/strandbeest/index{,.test}.ts`
  - `src/mechanisms/watch/{index.ts, index.test.ts, shapes.ts, layout.ts}`
  - `src/mechanisms/steam/{index, index.test, kinematics, kinematics.test, shapes}.ts`
- Timeline: `src/timeline/keyframes.json`, `keyframes.test.ts`.
- Page and tests: `src/style.css`, `e2e/app.spec.ts` (vignette test), `e2e/looks.spec.ts` (ghost-count annotation and lit-faces comment only; no threshold or assertion changed).

## Concerns

1. **`src/compare/compare.ts` still calls `motes.update(..., { width: w * pixelRatio, height: h * pixelRatio }, ...)` without `pixelRatio`.** It defaults to 1, so on retina the compare page keeps drawing-buffer-px caps. The fix is one line, adding `pixelRatio`, best made by the compare-page task or after the merge. The compare shots in `shots/` were not regenerated by this task.
2. The gears lit-faces margin is 1.207 against the 1.2 fence.
3. Ghost alpha and stride, the floor shape and height, and the strandbeest drift share deviate from the review, for the measured reasons above.
4. The story's exposure and warmth goals are not met by these values alone (see "Did not improve").

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
