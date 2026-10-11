# Visual review — Plan 2, Task 9 (mechanism choice, lighting, framing)

Reviewer: art direction pass over `shots/` plus 24 extra renders from the live build (SwiftShader, 1280×720, 100k motes unless noted). Extra renders are in `<scratchpad>/visual-review/` (`*-story-coldopen-twin`, `*-story-spec-close`, `strandbeest-side-low*`, `steam-*-frontleft`, `watch-headon*`, `watch-core-close`, `*-quiet-ghost*`, `steam-fault-*`, `*-rewind-mid`, `gain15-*`). Numbers below (coverage, mean luminance, "white" = share of machine pixels at ≥250 on all channels, warm/cool split) come from `measure.mjs` in the same folder, run over the committed shots.

One note on provenance of the shots: the lighting commit (`cc216b3`) predates every mechanism commit, so `mech-<id>-*.png` and `mech-<id>-lit-*.png` are both lit. They differ only in drive (0.3 vs 0). Measured, they are identical to within 1% — there is no unlit baseline in the folder, so "exposure dropped after lighting" cannot be confirmed from screenshots, only from the maths (see §3, change 1).

## 1. Per mechanism

Scores are 1–5. "Reads" = does a Reddit engineer who has not read the caption name the machine within a second.

### Gears (placeholder)

| | Score | Why |
|---|---|---|
| Reads as the machine | 4 | Involute teeth and lightening holes are unambiguous from any angle (`mech-gears-lit-assembled`, `vibe-build-0.5`). It is, however, a diagram of "gears", not a machine that does anything; no reader will care what it is for. |
| Core / body legible | 3 | Drive gear is warm, driven gear + frame cool — clear. But the crank (core, 12% of points on a tiny bar) is a solid white rod in every shot (`mech-gears-lit-assembled`, `compare-single-specced`), and the "core" is 44% of the point budget, so the thesis ("a small critical part") is visually inverted: the warm part is the big part. |
| Wrong twin plausible | 2 | Pinion coaxial with the drive gear reads as "the same two gears, one moved" (`mech-gears-lit-twin`). It is not a different machine; a reader cannot tell what is wrong, only that something overlaps. |
| Faults read | 2 | `mech-gears-lit-faults-0.6` is a blue-amber smear; the only legible thing is the white crank. Jitter at 0.6 destroys the silhouette before any individual fault reads. |

### Watch (Swiss lever; twin = music box)

| | Score | Why |
|---|---|---|
| Reads as the machine | 3 (4 head-on) | Head-on (`watch-headon`) it is unmistakably a movement: barrel with click teeth, going train, escape wheel, balance with a visible hairspring spiral. From the three-quarter view (`mech-watch-lit-assembled`) it reads as "a disc of gears" — the round plate's rim and the near-flat geometry fight the perspective, and the 3D lighting work buys almost nothing on a planar movement. |
| Core / body legible | 4 | Best of the four: the balance + escapement cluster sits on its own, warm, at the lower right, and its *function* (the heartbeat) matches the "critical small part" story. The pallet fork is invisible at three-quarter and a 10px white chip head-on (`watch-headon` between escape wheel and balance). The plate (30% of points over the largest area) is a thin blue dust that gives the body no mass. |
| Wrong twin plausible | 3 | Conceptually the strongest twin in the set — same parts, genuinely different machine. On screen (`watch-headon-twin`, `mech-watch-lit-twin`) it reads as "a box with a cylinder and a propeller": the comb is a faint row of lines that vanishes at three-quarter, the fly is a blown-white cross (9% of its pixels clipped vs 3% for the correct watch), and the music-box *sound* — the thing that makes a music box recognisable — has no visual stand-in. |
| Faults read | 2 | `mech-watch-lit-faults-0.6` is a blue cloud with a gold cloud in it; the balance/escapement have no silhouette left. In a still, no fault is identifiable. (Watch faults are inherently small-amplitude; they need motion and a close camera.) |

### Strandbeest (Jansen linkage; twin = wrong link lengths)

| | Score | Why |
|---|---|---|
| Reads as the machine | 2 (3 side-on) | Three-quarter (`mech-strandbeest-lit-assembled`, `compare-grid-specced`) is a blue truss; nothing says "walks". Side-on and low (`strandbeest-side-low`) the eight feet line up at ground level and it reads as a walking linkage — but only if you already know the Strandbeest. There is no ground, so nothing to walk *on*, and no body mass: 100% bars, so it reads as a wireframe, not a machine made of parts. |
| Core / body legible | 3 | The core leg is clearly separate and warm, but it is 30% of the budget on one of eight identical legs: it clips to white-gold (20% of machine pixels at ≥250, by far the worst) and swamps the rest. Conceptually weaker too — "one of eight copies" is not "the small part inside the body"; the story wants a *different kind* of part, not one instance. |
| Wrong twin plausible | 2 | In stills (`mech-strandbeest-lit-twin`, `strandbeest-side-low-twin`) the twin is the same lattice with slightly different proportions. The flailing is motion-only; a reader scrolling slowly will not see "wrong machine", only "lattice". |
| Faults read | 2 | `mech-strandbeest-fault-*` are near-identical lattices; `faults-0.6` is a white-gold blob (`mech-strandbeest-faults-0.6`). Bind/stall are invisible in a still; misalign shows as a double-image at the core leg only. |

### Steam (mill engine; twin = governor disconnected, overspeed)

| | Score | Why |
|---|---|---|
| Reads as the machine | 5 | Flywheel + cylinder + bed + flyball governor is the most iconic silhouette here, and it reads from three-quarter (`mech-steam-lit-assembled`), front-left (`steam-correct-frontleft`), side (`steam-story-coldopen-twin`) and at 30k (`compare-grid-specced`). It survives exploding (`mech-steam-lit-exploded-0.75`) and even faults at 0.6 (`mech-steam-lit-faults-0.6` still has a flywheel and a cylinder). |
| Core / body legible | 4 | The governor is warm, on top, small, and is *the part that keeps the engine honest* — the thesis mapped onto a real mechanism, which neither gears nor strandbeest manage. Deduction: the balls and sleeve blow out (7% clipped; the balls read white-gold, `mech-steam-lit-assembled`), and the belt + gov-drive are the only warm things touching the body, so the "inside the body" idea reads as "on top of the body". |
| Wrong twin plausible | 3 | The twin's governor is flung wide and the engine runs at 2.5× — in the story at drive 2 (`steam-story-coldopen-twin`) the arms are horizontal and the lever disconnected. In a still this is subtle unless the reader is told; in motion (flywheel racing, balls out, nothing changing at the valve) it will read as "runaway". It is the same machine with a dead core, which is actually the author's sentence ("no person ever touched the part that matters most"), but it is not "a different plausible machine" in the music-box sense. |
| Faults read | 3 | Best of the four. `steam-fault-misalign` is a visibly wobbled flywheel against the ghost; `steam-fault-drift` reads as the governor shedding motes; ratio/stall/slip are visible on a flywheel because a flywheel is a clock face. |

## 2. Recommendation

**Choose `steam`.** Runner-up: `watch`.

Why steam carries the story end to end:

- **Cold open** needs a wide, impressive, instantly nameable machine running. Steam is the only one that is nameable from every story camera and whose "running" is legible in a still (spokes, crank, conrod).
- **Rewind** to a nebula: the flywheel ring is the last thing to dissolve and the first to re-form (`steam-rewind-mid`), which gives the reverse an anchor the eye can follow; the watch at the same state is a faint rectangle (`watch-rewind-mid`).
- **Spec with the ghost**: the core-focused camera (`steam-story-spec-close`) frames a governor assembling against a dotted ghost of the engine — a readable picture of "the small part, specified first, against an outline of the whole". The watch's equivalent is good too (`watch-story-spec-close`) but flat.
- **Build / drift / checkpoint**: a flywheel is a clock face, so every fault is legible on it, and drift from the governor (balls losing motes) is the clearest "quiet failure" in the set.
- **Core = governor** is a true statement about engines, not a visual convention. The copy can say "the governor is the part a person has to specify" and be right.

What steam needs (all in §3): fix the blow-out so the governor stays amber, strengthen the twin so the wrongness is visible in a still (change 9), and a low three-quarter story camera.

Why watch is runner-up and not first: it has the best twin *concept* and the best core *meaning*, but it only reads head-on, so the whole 3D/lighting investment is wasted on it; the plate has no mass; the pallet fork (the actual critical part of a lever escapement) is invisible at the story's distances; and its faults are motion-only and small. If the author is willing to shoot the entire essay head-on with a 1–5° tilt, watch becomes a close second and arguably the more beautiful object. Not recommended with the current depth-cue design.

Gears third (good diagram, no story), strandbeest fourth (beautiful in motion, a wireframe in stills, and its core is "one of eight" rather than "the part that matters").

## 3. Ranked changes (most impact first)

Each marked **global** or **mechanism-specific**. Values are starting points; the pairs marked "fence" are what the existing `looks.spec.ts` lit-faces test (`lit > 1.2 × away`) and warm-core / cool-body counts protect, so re-run it after each lighting change.

1. **Stop the white-out at the source: screen blending instead of additive.** (global) `src/scene/mote/moteSystem.ts` `material()`: `blending: CustomBlending, blendEquation: AddEquation, blendSrc: OneFactor, blendDst: OneMinusSrcColorFactor` (screen), and in `mote.frag.glsl` / `thread.frag.glsl` output premultiplied colour: `outColor = vec4(color * vBrightness * alpha, alpha)`. Screen saturates toward the *type colour* per channel instead of racing all three channels to white: a stack of amber motes stays amber for ~3× as many layers (blue channel at 0.28 gains ~0.1 per layer instead of 0.35). This is the single change that fixes the gears crank, strandbeest core leg, steam governor balls and watch fly together, and it lets the brightness constants in change 2 go *up* without re-clipping. Keep the ghost additive (it is meant to sit on top). The lit-faces test still holds — screen is monotonic in brightness.

2. **Raise the settled floor and the fill; soften the two dims.** (global) Today a settled, back-facing, far mote renders at `0.35 (settled) × 0.3 (fill) × 0.35 (backface) × 0.55 (depth) = 2%` of its flight brightness, which is why the body of every machine is a dim dust and the story sections measure a mean machine luminance of ~70/255 (`vibe-build-0.9`, `rewind-0.1`) against ~110 for the three-quarter shots. Do all of these together, after change 1:
   - `mote.glsl` `o.brightness = mix(1.0, 0.35, t)` → `mix(1.0, 0.5, t)` (settled motes keep half their glow, not a third).
   - `lighting.ts` `fillStrength 0.3 → 0.45`, `keyStrength 1.2 → 1.0` (less contrast range, same lit/away ratio ≈ 1.45/0.45 — comfortably above the 1.2 fence), `rimStrength 0.35 → 0.5` (point clouds need the silhouette), `backfaceDim 0.35 → 0.5`, `depthDim 0.55 → 0.7`, `depthShrink 0.15 → 0.25` (let *size* carry more of the depth cue and *brightness* less; shrink is free of clipping).
   - Do not add a global exposure multiplier — with screen blending it would just move the clip point.

3. **Rebalance the core's share of the point budget — the core should be bright because it is warm, not because it is dense.** (mechanism-specific, all four)
   - steam `src/mechanisms/steam/index.ts` `CORE_SHARE 0.25 → 0.15`; the governor is ~5% of surface area, so this is still ~3× body density. Governor balls were the worst clip (`mech-steam-lit-assembled`).
   - strandbeest `ROLE_SHARE core 0.3 → 0.12`, body `0.665 → 0.845`; also raise `CORE_GIRTH 1.4 → 1.6` (more surface for the same points).
   - gears `WEIGHTS [0.32, 0.18, 0.12, 0.3, 0.08] → [0.26, 0.2, 0.05, 0.4, 0.09]` (crank 12% → 5%; it is a ~2% area bar).
   - watch `WEIGHTS`: plate `0.296 → 0.36` (it needs mass), escape wheel `0.06 → 0.05`, pallet fork `0.03 → 0.045`, balance `0.125 → 0.095`, hairspring `0.035 → 0.03` (the fork is the part nobody can see; the balance rim is the part that clips).

4. **Ghost: dimmer, sparser, cooler, and never 1.0 in a preset.** (global) `ghost.vert.glsl` `vAlpha = 0.35 * uGhost` → `0.18 * uGhost`; stride `gl_InstanceID % 4` → `% 6`; `ghost.frag.glsl` colour `vec3(1.0)` → `vec3(0.78, 0.84, 1.0)` so the ghost is a cool pencil line and cannot be confused with Dialogue motes or with clipped core. Then in `controls.ts` `PRESETS`: Quiet failure `mech.ghost 1 → 0.4`, Exploded `1 → 0.6`, Faults 0.6 `1 → 0.6`; and in `keyframes.json` `mech.ghost` at `spec@0.3` `1 → 0.6`. Confirmed: at ghost 1 the quiet-failure gears are a grey-white slab in which the misallocation colouring is invisible (`gears-quiet-ghost1`); at 0.35 the warm-on-case / sparse-core pattern comes back (`gears-quiet-ghost035`, `steam-quiet-ghost035`).

5. **Fix the retina cap.** (global) `mote.vert.glsl` caps are in drawing-buffer px, so a hero halo is 48 device px = 24 CSS px on a 2× display, and the 4px point cap makes agent motes 2 CSS px — half the intended weight on every Mac the audience uses. Add `uniform float uPixelRatio` (set from `renderer.getPixelRatio()` next to `uViewport` in `moteSystem.update`) and clamp to `CAP_PX[form] * uPixelRatio`; same for `GHOST_HALF_SIZE_PX` and the 1.5px thread. Then set the CSS-px caps to halo 56, point 3.5, twin 12.

6. **Separate Dialogue from "white".** (global) `mote.frag.glsl` / `thread.frag.glsl` `DIALOGUE #E6DDFF → #C4B0FF (0.769, 0.690, 1.0)`. At present dialogue is 90/87/100% — in any stack it is indistinguishable from the ghost and from a clipped core (`watch-core-close`: the balance reads white-gold, not warm/violet). Deeper violet keeps the spec's "pale violet-white" at hero size (the halo's alpha falloff lightens it) while the small points carry hue. Keep the human amber `#FFB347` and agent blue `#4DA3FF`; both are right.

7. **Story cameras for steam (and in general, lower and closer).** (mechanism-specific; `keyframes.json`) A horizontal engine's heroic angle is low three-quarter, not above. Current `vibe-build@1 [1.102, 0.431, 3.924]` leaves the engine at ~35% of frame width and the governor against the flywheel (`steam-story-coldopen-twin`). Suggested:
   - `vibe-build@0`: `[-0.3, 0.5, 5.2]` (wide, slightly above, nebula fills the frame).
   - `vibe-build@1`: `[1.35, 0.3, 2.7]`, target `[0.05, -0.05, 0]`, fov 40 — engine fills ~60% of the width, governor stands against dark sky, flywheel on the right facing the camera.
   - `rewind@1`: `[-0.4, 0.25, 5.8]`, target `[0, 0, 0]` — pull back along the same low line, so the reverse reads as the cold-open shot un-happening.
   - `spec@0.35 → spec@1`: keep `coreFocus 1`, but `pos [-0.98, 0.1, 4] → [-0.9, 0.35, 3.4]`, target `[-0.9, -0.1, 0]`, fov 35: slightly above the governor so the balls and lever separate (at eye level they overlap the spindle, `steam-story-spec-close`).
   - For I.5 drift / I.6 checkpoint (not yet keyed): drift at `coreFocus 0.5, pos [0.9, 0.4, 3.0]` with ghost 0.5; checkpoint at `coreFocus 1, pos [0.5, 0.6, 2.2]`, fov 32.
   - The machine-relative convention is good; keep the offset-x-target trick so the machine sits in the right two-thirds beside the 28rem text panel.

8. **Hero fractions and forms.** (global) `instance.glsl` `HERO_HUMAN 0.01 → 0.02`, `HERO_DIALOGUE 0.03 → 0.04`. At 100k with the steam core at 15% share, 1% human heroes is ~80 halos, most of them inside the governor where they merge; 2% gives the spec section the "tens" of deliberate warm actors the narrative table asks for. Also `mote.frag.glsl` halo: `0.5 * exp(-4 r²)` → `0.35 * exp(-5 r²)` (tighter, less of a blob when they stack) and keep the bright core.

9. **Make the steam twin read in a still.** (mechanism-specific; `src/mechanisms/steam/index.ts` / `kinematics.ts`) Today the twin is "governor flung wide at 2.5×"; in a still that is a slightly different governor pose. Two cheap additions so the *shape* is wrong, not just the speed: (a) in the twin pose, drop the governor lever and valve stem to a hanging, disconnected angle (lever at −35° from the stand, stem resting on the cylinder) so there is a visible gap between core and body — the sentence "no one touched the part that matters" becomes a picture; (b) mount the twin's governor spindle leaning 12° off vertical. Keep the overspeed. Then the cold open shows an engine whose governor is obviously ornamental, and the rewind/spec contrast (governor upright and linked) is a readable before/after. Optional (c): give the twin a slack belt — `belt` sagging between pulleys — since a slack belt is *the* visual for "not driven".

10. **Give the steam engine a floor.** (mechanism-specific) A thin `body` part: a flat plate (or a ring of ~2% of the body points) 0.1 units below the bed, 1.5× the bed's footprint, dim. It grounds the machine for the low cameras of change 7, gives depthDim something to work on in the foreground, and reads as a mill floor. If strandbeest is ever revisited, the same idea (a ground line at foot level, plus a side-on default) is what makes it read (`strandbeest-side-low` vs `mech-strandbeest-lit-assembled`), but do not spend it now.

11. **Watch: ship head-on if it is ever chosen; otherwise skip.** (mechanism-specific) Default framing `pos [0.15, 0.35, 3.0]` (a 7° tilt — enough for depth shrink to show the wheel stack, not enough to foreshorten the plate). Plate share up (change 3). Pallet fork: double its tube radius in `watch/shapes.ts` and give it the Dialogue type for 100% of its points (it is literally the part that talks to both sides). Twin comb: make the comb a solid block with teeth (extrude), not lines, and give the cylinder pins Dialogue colour so the "music" is visible.

12. **In-flight glow vs settled: keep the flight brighter but shorter.** (global) In `vibe-build-0.5` the nebula is the brightest thing on the page because in-flight motes are at brightness 1 and unlit; after change 2 raises the settled floor, flight should still win, so leave `mix(1.0, …)` and instead tighten the settle window `smoothstep(a.settle - 0.08, a.settle, uAssembly)` → `- 0.12`: motes dim over a slightly longer approach, so the machine does not "pop" from dust to solid.

13. **Thread alpha.** (global) `thread.frag.glsl` alpha `0.25 → 0.4` after the Dialogue colour change; the threads are the only thing that says "pair", and at 0.25 on a 1.5px quad they vanish at retina (`spec-0.9`: pairs read as two dots, not a dumbbell).

14. **Background: leave `#0B0D12`; add a vignette, not a gradient.** (global) The near-black is right for screen blending. Add a CSS radial vignette on `#stage`'s container (`radial-gradient(ellipse at 60% 50%, transparent 55%, rgba(0,0,0,0.45) 100%)` as an overlay with `pointer-events: none`) — it gives the wide shots a centre without touching the renderer or the purity invariant.

15. **Jitter amplitude in the "all faults" preset.** (global, `controls.ts` + any story keyframes) At 0.6, jitter is what turns every faults shot into a smear (`mech-gears-lit-faults-0.6`, `mech-watch-lit-faults-0.6`, `mech-strandbeest-faults-0.6`). Cap `jitter` at 0.25 in the Faults preset and in the drift section; let misalign/ratio/stall/drift carry the "malfunction" read, which they do on steam.

## 4. Comparison page

What hurts the comparison, in order:

1. **No way to compare correct vs twin for one mechanism side by side.** The 2×2 grid compares *mechanisms* at one state; the question the author is actually asking ("does the twin read as a different machine?") needs *one* mechanism at variant 0 | variant 1 in two panes sharing the orbit. Add a third view mode, "Twin pair" (left: sliders as set with variant 0, vibed 0; right: variant 1, vibed 1, no ghost), using the same rig and the existing pane code. This is the single most useful addition.

2. **No story cameras.** `HOME` is the three-quarter view only; the essay never uses it. Add a "Camera" row of buttons that set the rig: `Three-quarter` (current), `Cold open` (`[1.35, 0.3, 2.7]`), `Spec (core)` (coreFocus 1, `[-0.9, 0.35, 3.4]` — this needs `coreFocus` plumbed into `stateFromSliders`, currently hard-coded 0), `Head-on` (`[0, 0, 3.1]`), `Side, low` (`[0.1, 0.12, 2.9]`, target `[0, -0.15, 0]`). The strandbeest and watch look like different machines at side/head-on than at three-quarter; the page currently hides that.

3. **Grid defaults to 30k and the grid budget is remembered separately.** At 30k every machine is a faint sketch (`compare-grid-specced`) and the author will judge density, not shape. Default the grid to 100k (build time is fine, there is already a "Building…" overlay) and drop the per-view budget memory; one budget selector.

4. **Presets set ghost to 1.** Quiet failure / Exploded / Faults 0.6 all at `mech.ghost 1` wash the pane (`compare-single-quiet-failure`). Use 0.4 / 0.6 / 0.6 (change 4), and show the ghost value in the preset blurb so the author knows it is a choice.

5. **Faults cannot be stepped.** Play at 0.25/s is the only way to see slip/stall/bind; a still at drive 0.15 shows nothing. Add `−0.02` / `+0.02` drive nudge buttons beside Play (or make the drive slider step 0.01 with keyboard focus) so the author can scrub a stall by hand.

6. **No lighting controls.** Exposure, fill, backface dim, depth dim and ghost alpha are the parameters this review is tuning, and the page has no sliders for them. A collapsed "Lighting (dev)" group bound to `lightingUniforms()` + the ghost alpha, with a "copy as JSON" button, would turn the next review round from screenshots into a 10-minute session. Not shipped to readers (`?dev=1`).

7. Minor: the mechanism picker disables itself in grid mode but still shows the pressed state styling of none; the blurb under the picker and the preset blurb are the same grey and run together — give the preset blurb an em-dash prefix or 4px more top margin. The "Drag to orbit" hint overlaps the bottom-right pane label in grid mode at 720px.

## 5. Could not assess

- **Motion.** Everything above is from stills. The strandbeest and watch twins, and the bind/stall/slip faults on all four, are motion signatures; they may read far better in a scrolling build than any still suggests. The recommendation weights stills heavily because a scroll-driven essay is read at arbitrary stopping points, so a state that only reads in motion is a state most readers will miss.
- **Retina.** SwiftShader at dpr 1; the cap bug (change 5) is inferred from the shader, not seen.
- **Shallow depth of field** (spec §5.4): `camera.focus` exists in state but nothing renders it; not reviewed.
- **Text panels over the canvas.** All shots hide `#story`; the left 28rem panel will cover ~30% of the frame at 1280 wide, which the framing in change 7 assumes but I did not see composited.
- **Lit vs unlit baseline.** Not available (see the note at the top).
