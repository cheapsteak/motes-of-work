
## Fix round 1

All ten findings from task-5-review.md are fixed.

- **Important 1, icospheres.**
  - `ICOSPHERE_DETAIL = { body: 3, moon: 1 }` (bodySystem.ts). three.js's `IcosahedronGeometry(1, detail)` has 20·(detail+1)² triangles, so the body sphere is now 320 triangles; detail 2 had given 180. The moon sphere stays at 80.
  - `icospheres()` is exported, and a new unit test asserts the per-part triangle counts are [320, 80].
  - The comments in bodySystem.ts and the body.vert header now match the geometry. The original report's "320 and 80" claim was wrong for the first draw and is right from this round.
- **Minor 1, caps (e2e).** The test now runs at DPR 2 and DPR 3, at both sizes.
  - At DPR 2 a screenshot pixel is a buffer pixel. The brightest bright star must be between 3·ratio − 1 and 3·ratio + 1 px wide (+2 at DPR 3, for the 1.5× upscale). The brightest dust mote must be at least `ratio` px.
  - Measured: star 6 px at DPR 2 (both sizes), 10 / 9 px at DPR 3 (phone / desktop). Dust 2 px at DPR 2, 3 / 4 px at DPR 3.
- **Minor 2, held systems (new e2e: "a system held under full detail draws no moon or track mote").** It runs at the system and twelve shots, both sizes.
  - Precondition, asserted: some system reaching at least half its radius into the frame is full size (≥ 60 px) but held under 60.
  - Forcing Moon, Track and Derp to 0 may change pixels only inside the systems the page reports as full. "Inside" means how far each full system's outer sphere reaches on screen: 400 points projected through the essay's camera, plus 2 px.
  - A first version used outer·focal/d as the radius. It under-estimated the reach near the frame's edge (perspective), which flagged 14 true track pixels, so it was replaced.
  - The test also asserts that the full systems do change some pixels.
- **Minor 3, halos (e2e).** The pixel half now uses a mask threshold matched to the profile, `GLOW_LIT` 4/255.
  - The lit radius is derived from the halo term, 0.45 (1 − r)² at `BODY_LOOK.glowBrightness`, giving 0.803 of the sprite's radius.
  - The slack is 0.5 px. Measured on the correct build, the most any lit pixel went past that radius was −0.02 px, at the phone galaxy wide.
- **Minor 4.** `glslLodConstants` emits `const int LOD_COUNT = 5;` and `LOD_BANDS[LOD_COUNT]`. All three shaders declare `uLodForce[LOD_COUNT]`, and TS sizes `force` from the exported `LOD_COUNT`. lod.test.ts asserts both.
- **Minor 5.**
  - star.vert's tint is spliced: the AGENT / WARM / WARM_MIX literals are gone and replaced by a marker. `glslStarTint()` builds them from NODE_PALETTE.NODE_AGENT and a new `STAR_TINT = { warm: '#FFF2E0', warmMix: 0.55 }`. The old (1.0, 0.95, 0.88) is now #FFF2E0 ≈ (1.0, 0.949, 0.878).
  - galaxySystem.test.ts asserts there are no copies in the source and that the spliced constants equal the TS.
  - star.frag's comment now names bodySystem.test.ts.
- **Minor 6.** `Body` gains `track: 0 | 1 | 2 | null` (generate.ts), set from the moon's draw. `buildTrackAttrs` and `fitBudget` now dedupe moon tracks by `m.track` (fitBudget is the sibling counting site). generate.test.ts still counts by radius, which now serves as an independent cross-check. The counts are unchanged.
- **Minor 7.** The shell.vert header now says lattice mote 0 is the planet's point, so the shown bubble lacks that one site, and why: it keeps net-shells at Σ latticeCount.
- **Minor 8.** `Lamp` enum in galaxyShots.ts: Off 0, Planet 1, Star 2, Hood 3, Core 4, Lineage 5, matching Task 6's planned values. `GalaxyShot.lamp` is typed `Lamp`, and a test checks the six shots' lamps.
- **Minor 9.** The glow sprites' natural diameter is `diam`, no longer an overwritten `d`. This applies to glowCaps, bodySystem and the tests.

### Mutation checks

The permission layer did not refuse any. Each was undone with an exact inverse sed and confirmed by grep.

- **Minor 1:** in star.vert, `clamp(...) * uPixelRatio` → `clamp(...)`. All four caps tests failed: brightest star 3 px against ≥ 5 at DPR 2, and 6 px against ≥ 8 at DPR 3.
- **Minor 2:** in bodySystem.ts, `sysPx.set(lastSys)` → `sysPx.set(raw)`. Both held-system tests failed at the system shot, with 514 and 111 pixels outside the full systems.
- **Minor 3:** the glow ignores uGlowCap (shell.vert uses the kind's cap). At slack 0.75 only the desktop failed: the phone's excess was 0.73 px. With the slack tightened to 0.5, both sizes fail at galaxyWide, with 7 and 56 stray pixels. The clean build passes at 0.5.

### Stills

Re-run, phone first: shots/galaxy/T5-*. T5-system and T5-close at 390×844 look the same as before.
- The icospheres' rim is a faint 1–2 px limb under the shell motes, so the finer sphere does not show at these sizes.
- **T5-system:** P_a's bubble, its dotted orbits and N0's moons.
- **T5-close:** C1's lattice sphere with six lumpy moons and faint tracks, and the row of far bubbles across the top.
- The desktop close still has the near neighbour's 30–40 px motes in the bottom-left corner (carried concern 4).

### Tests

typecheck clean; vitest 80 files, 1,699 passed; full e2e 167 passed, 10 skipped (SHOTS only), 0 failed, 28.6 min (the new held-system test and the DPR 2 caps cases add 4).
