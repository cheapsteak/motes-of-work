# Act II galaxy: the minors backlog

From 2026-10-09 (author's ruling), a task's review fix round takes only its **Critical** and **Important**
findings. Every **Minor** finding, and every look item deferred to a later task, is appended here instead.
Task 13 (pixels and the phone pass) works through this list and closes each item, or rules it closed with a
reason. Nothing here is dropped silently.

Each item gives its source (the task and the review or ruling), the file it concerns where there is one, and
what "done" looks like.

**Triage (the backlog sweep, 2026-10-09).** Task 13's pixel tests and phone pass wait for the re-skin
(the black hole at the centre, self-lit spiked stars, planets shaded by their star, a truer spiral), so
the sweep took only the items that do not depend on how things look. Each unchecked item is tagged:
`→ DO` (the sweep does it: tests, flakes, docs, layering, mirror fences, correctness not about look),
`→ re-skin` (about how something looks, which the re-skin replaces or re-tunes) or `→ T13` (needs the
pixel or phone pass after the re-skin). A DO item the sweep finished is checked, "done in <sha>"; one
it found wrong or not worth doing is marked ✗ with the reason. Counts: 51 DO, 17 re-skin, 4 T13; the
sweep did 44 DO items, ruled 6 not to do, and re-triaged one (the limb's break) to T13, so 5 are T13.
Its report: `.superpowers/sdd/2026-10-08-act-2-galaxy/backlog-sweep-report.md`.

## For Task 11 (reviewer, trace, fix, lesson keys)

- [x] **The haze under PROVISIONAL** (Task 8 review M4). → re-skin: done in 18b1f40 (re-skin Task 1a, archive repo): the haze is drawn only while the story leaf `net.haze` is up, which the keys raise at the galaxy wides alone; `HAZE_FROM`, the eye-distance gate, is gone (netShots.test.ts "net.haze", galaxySystem.test.ts)
  - The holding shot (the neighbourhood at 390/610) draws the 56 px core haze on unkeyed sections, but the
    haze is meant for the galaxy wides only.
  - It goes when PROVISIONAL is removed. Check this when Task 11 removes it.

## For Task 12 (the freeze frame)

- [x] **Force the scatter** (Task 4 ruling 1). → done in 2f278e8 (Task 12)
  - The pin is `forced-scatter`. Force `FREEZE_SCATTER_S` on C1 through the hold, reduced motion included.
- [x] **The pose sits on a jitter tick** (Task 6 ruling 2). → done in e3fc3a2 (Task 12: FREEZE_PIN_OFFSET_S, half a tick off the cut)
  - At s 0.3 × 30 Hz the jitter is exactly tick 9.0. Float32 reads tick 8 and float64 reads tick 9, about
    0.035 units apart.
  - The hold must not sit on a tick boundary in either precision.
- [x] **The visual reference** is `docs/mocks/freeze-frame.html` (spec `docs/specs/2026-10-07-freeze-frame.md`, → done in Task 12 (built against it, 2f278e8..69e82c0)
  rev 4).

## For Task 13 (pixels and the phone pass)

- [x] **Twelve, lit shells ember** (Task 7 ruling 2, round 4). → re-skin: done in 4390bcb (re-skin Task 9): both twelve tests count with the shells on, on both screens; a lit planet's dust is drawn round its ember point, never over it (shell.vert.glsl), so the point stays ember (the desktop's C10 was 7 px² with the dust over it, 12 now); the plan's marks are left out of the count
  - "The twelve light as twelve" counts lit points with the planet shells forced off.
  - At phone 93 and desktop 82, lit mid-size shells must stay ember-dominant. Restore the shells-on
    classifier, and run it on the desktop too.
- [x] **Moon see-through** (moon fix, concern 5). → re-skin: done in 5659f7e (re-skin Task 9): a moon's far hemisphere takes PLANET_LOOK.night.rest × LIGHTING.backfaceDim (`MOON_FAR_DIM`, 0.075; a planet's stays 0.2); at df-1 each of C1's 16-24 px moons' far hemisphere (past the soft band) draws 0.051-0.066 of its near one's light, against 0.132-0.175 at a planet's 0.2; held at most 0.11 (measured / 0.6) per moon, the test hook `faceOnly` drawing each hemisphere alone (Task 9 fix round 1)
  - At 16–24 px a moon's far side faintly shows through.
- ✗ **Coarse moons** (moon fix, concern 2). → re-skin: ✗ ruled closed, nothing raised (re-skin Task 9): after Task 5's budget, 107 of 135 moons sit at the 3×6 floor on both tiers (was 113 of 138); C1's six are 8×21 to 12×32 and N0's seven 3×6 to 5×13. On the R7 stills N0's moons (zo-0.25, 15-17 px) and C1's (df-1) read as dotted spheres with clean lattices; no framing shows a floor moon close enough to look coarse, so no measurement asks for more motes
  - 113 of 138 moons sit at the 3×6 lattice floor. N0 and C1 are full density. Judge them up close.
- [x] **Motes near the camera** (Task 5 concern 5). → re-skin: done in 9e846e3 (re-skin Task 9): `motePx` is capped at `MOTE_PX_MAX` 6 CSS px in both mirrors; at the desktop close with every body lit, P1's star dots stood 26 px across (32 on a phone); the essay's own frames never pass 4.2 px
  - `PX.mote` has no cap, so a body next to the camera draws 30–40 px motes (desktop close).
- ✗ **Dotted orbits** (Task 5 concern 5). → re-skin: ✗ ruled closed, `BODY_LOOK.trackBrightness` unchanged (re-skin Task 9): at DPR 1, net-tracks isolated, the dots' mean peak over the background is 67 / 68 at ly-1 and 54 / 54 at re-1 (phone / desktop), over the 40 at which a dot reads
  - They are faint at DPR 1.
- ✗ **The galaxy wide** (Task 5 stills). → re-skin: ✗ ruled closed (re-skin Task 9): `frame` cannot raise or enlarge it. Frame 0 already puts the core at the rig's highest placement (portrait y 0.62); `frame` only lowers it toward the close's 0.76. On a phone the wide's light is centred at row 524 of 844, its lit rows from 330 (the band ends at 362), 89-299 across; enlarging it needs `GALAXY_WIDE`'s distance or fov, which set the background's halo placement and Task 1b's fingerprints. Nothing changed, so ZOOM_OUT.far, FAR_SHOT and the probe keep their keys. For the author: a larger phone wide needs a portrait distance that galaxyWideView does not read
  - It reads as a spiral but dim, and sits low and small in the phone frame.
- [x] **Streams** (author, 2026-10-09). → done in 4fdf329 (every STREAM_BEATS beat at both sizes: lit on the twin's flowing dots, 34-72 % of pixels moving in 0.5 s; how they read stays the author's, live)
  - Faint is fine if they animate.
  - Check that the dots flow on the ambient clock at every `STREAM_BEATS` beat. The author judges them live.
- [ ] **Phone close, C1 off the frame** (Task 7 ruling a). → T13
  - C1's centre leaves the phone frame for 1.4 % of frames, in 227 exits an hour, mostly skips.
  - This is accepted pending the author's view. If rejected: the close camera tracks a fraction of the derp,
    and the pin is re-searched.
- [x] **Flake: autoAdvance** (Task 8 concern 7). → done in 24848ca (the fade is run to its end; under load 24/24, was 3/16 failing)
  - "At the end it stops and the ring fades away" fails under full-suite load.
  - Root-cause it. No retry masking.
- [x] **Flake: spikes** (Task 1). → done in 220b3f9 (the smoke test left a live full-budget page whose drawing held the next newContext 14-28 s)
  - `e2e/spikes.spec.ts` times out in browser setup now and then. Root-cause it, or bound it.
- ✗ **Glow half-extent** (Task 8 round 2, concern 1). → ✗ keep the term: it is a true part of the bound, costs nothing, and the re-skin's spiked stars change the glow sizes it bounds; the contract test stays
  - The half-extent in the clearance bound never binds, because the cylinder dominates. A contract test
    holds it.
  - Decide whether to keep the term.
- [x] **Landscape bearing coverage** (Task 7 re-review). → done in 67c7f9c
  - "Tracks the shot's target" checks the phone aspect only.
  - The landscape bearing is covered only by the hour sweep and the shots table.
- [ ] **Flying motes** (Task 8 round 2, concern 3). → T13
  - Builder motes in flight reach above the text band on the phone at zoom-out 0.55.
  - They are allowed under the loose-cloud convention. Confirm by eye.

## Appended by later reviews

Each review from Task 9 on appends its Minor findings below, under the task's name.

### Task 9

- ✗ **ly-4's planets are 2–4 px points** (Task 9 round 1, concern 1). They read as points beside their stars; → re-skin: ✗ reported, nothing changed (re-skin Task 9): on R7-ly-4 (layers 3.45/4.3, the hold on star-4) the planets are 1-2 px points, each on its node cross of the system's drawing; they read as marks on the plan more than as planets. The author judges it live
  a closer framing shows fewer than four systems. The author judges it live.
- [x] **A slow Act I key test** (Task 9 round 1, concern 4). `keyframes.test.ts` "builds the bike in five → done in 45791a8 (4.8 s to 0.19 s)
  held stages" takes 3.4–4.6 s against a 5 s limit and times out under a shared CPU. This predates the
  galaxy work. Speed it up; don't just raise the limit.

From the Task 9 review:

- [x] M1 (Task 9 review): docs/specs/2026-10-06-act-2-storyboard-and-network.md:129. The ly-5 row says "pulling back first". Since fix round 1, ly-4 ends at 108 and ly-5 at about 32, so the move pans first and closes in after. Say so. → done in fcefd15
- [x] M2 (Task 9 review): src/timeline/netShots.ts:805–806 claims the ride's two end systems stay whole in the frame over the hour, but no test holds it. The "≥ 4 systems in view" test (netShots.test.ts:838) checks only `AMBIENT_POSE`. Add `wholeInFrame` for P_a at the ride's start and star-4 at its end. → done in 67c7f9c
- [x] M3 (Task 9 review): src/story/content.test.ts:276/278. `SYSTEM_ONCE` misses "systems", and `PICTURE_WORDS` misses "rings" and "glows" (the brief's regex). Widen both to `s?`. → done in aada5df (SYSTEM_ONCE is now SYSTEM_NEVER, which already took systems)
- [x] M4 (Task 9 review): e2e/purity.spec.ts:118–131 has no layers or far sample, so the new moves' purity is untested in e2e. Add `layers@0.36` (the pull before the pan), `layers@0.705` (a via lamp) and `far@0.02` (across the boundary). All three pass, as the reviewer's probe showed. → done in 75452b7
- [x] M5 (Task 9 review): docs/specs/2026-10-07-galaxy-orbits.md:749 still says "each lamp steps at the first thousandth from which its level clears". That is no longer fenced; say "as fitted", as the code comments do. → done in fcefd15
- [x] M6 (Task 9 review): src/timeline/netShots.ts:1058/1069. `moveShares`/`panSpan` take any move with equal distances on both screens to be a ride. Mark the ride explicitly on its `ACT_TWO_MOVES` entry instead. → done in ea99e9e (Move `motion`, fenced)
- [x] M7 (Task 9 review): netShots.test.ts. The layers lamp and via steps are checked only by the 2,001-sample sweep, one sample every 0.0034 screens. Their margins are 0.25–0.64 px. Add a per-move dense check, or a "clears from its step to the move's end" test. → done in 67c7f9c

### Task 10

- [x] **Haze in up-2 on desktop** (Task 10 concern 7). At 442 the core's haze shows. The haze is meant only for the galaxy wides. → re-skin: done in 18b1f40 (re-skin Task 1a, archive repo): the haze is drawn only while the story leaf `net.haze` is up, which the keys raise at the galaxy wides alone; `HAZE_FROM`, the eye-distance gate, is gone (netShots.test.ts "net.haze", galaxySystem.test.ts)
- [x] **A src test imports e2e code** (Task 10 concern 7). A unit test under src imports `visibleGalaxy` from `e2e/machine.ts`. Move the shared projection into src. → done in 59a9ea8 (src/scene/node/galaxyOnScreen.ts)
- [x] **The push-in leans on an implicit rule** (Task 10 concern 7). It extends Task 9 M6's equal-distance rule. Mark it explicitly. → done in ea99e9e
- [x] **Twelve test with shells off** (Task 10 concern 5). With shells on, a pale lit shell drops C9 below 8 px² on desktop. This is the same item as "Twelve, lit shells ember" above. → re-skin: done in 4390bcb (re-skin Task 9): both twelve tests count with the shells on, on both screens; a lit planet's dust is drawn round its ember point, never over it (shell.vert.glsl), so the point stays ember (the desktop's C10 was 7 px² with the dust over it, 12 now); the plan's marks are left out of the count
- ✗ **df-2b's stop is at 0.4398, not 0.437** (Task 10 concern 1). The pull-out leaves at 0.4392. Task 12 re-times the close-up for the freeze; settle it there. → ✗ settled in Task 12: the controller ruled the stop as built (0.4398), progress.md

From the Task 10 review:

- [x] M1: the core haze is drawn on up-2's desktop frame (landscape 442 > `HAZE_FROM`). That breaks "galaxy wides only", and the PROVISIONAL ruling's "gone with Task 11" premise is now false (netShots.ts:938, galaxySystem.ts:183). → re-skin: done in 18b1f40 (re-skin Task 1a, archive repo): the haze is drawn only while the story leaf `net.haze` is up, which the keys raise at the galaxy wides alone; `HAZE_FROM`, the eye-distance gate, is gone (netShots.test.ts "net.haze", galaxySystem.test.ts)
- [x] M2: the follow's rationale ("lamp 1 on C7 lights its stream in to R1") is not on screen. The C7 → R1 up-stream arrives at growth 0.385, about spread 0.08, after the follow ends (netShots.ts:982, galaxy-orbits.md:771, storyboard:153). → done in fcefd15 (the docs say the stream comes up after the follow)
- [x] M3: a src unit test imports the clearance twin from e2e/machine.ts (netShots.test.ts:75). Move the twin to a shared src module. → done in 59a9ea8
- [x] M4: `oneMotion` infers a push-in from equal target and bearings, widening Task 9 M6. Mark ride and push on the move (netShots.ts `oneMotion`). → done in ea99e9e
- [x] M5: the `FOCUS_KEYS` ramps are linear while the camera eases, so focus starts falling at each pull-out's first instant. Ease them `inOutCubic` (netShots.ts `FOCUS_KEYS`). → done in dd471ac

### Task 11

- [x] The core haze at re-3 and ls-1 on desktop (Concern 4): gate it by shot, not eye distance. → re-skin: done in 18b1f40 (re-skin Task 1a, archive repo): the haze is drawn only while the story leaf `net.haze` is up, which the keys raise at the galaxy wides alone; `HAZE_FROM`, the eye-distance gate, is gone (netShots.test.ts "net.haze", galaxySystem.test.ts)
- [x] `moveShares` infers a one-motion push-in from equal target and bearings; `inOnR1` relies on it again (the review's M4, Task 9's M6). → done in ea99e9e
- [x] `visibleTracks` is in the unit close-shot twin only; e2e `machineOnScreen` (clearance.spec) still does not count tracks. → done in 59a9ea8
- [x] `src/timeline/netShots.test.ts` imports more from `e2e/machine.ts` (`visibleTracks`; the review's M3). → done in 59a9ea8
- [x] The lamp-step fitting is a deleted helper; a committed tool (or a test that names the first clearing thousandth) would make refits cheaper. → done in 1f340bf (firstClearing, held as an assertion)
- [x] The feed e2e test tolerates one wrapped dot (Deviation 4); the twin could model float32 `fract`. → done in 4fdf329 (the wrap modelled at either end; no stray pixel allowed)
- [x] The re-3 stage direction "the camera starts to follow it inward" is the pull-back to the hub; the inward follow is the climb over the page turn. → done in fcefd15 (netShots.ts comments)
- [x] **Purity floors** (Task 11 concern 4). The three new purity samples use the 1,000 floor; measure their real lit counts and set honest floors. → done in 75452b7 (half the measured lit count)
- [x] **Core haze on desktop** at re-3 and ls-1 (Task 11 concern 4; the same family as the Task 10 review M1). → re-skin: done in 18b1f40 (re-skin Task 1a, archive repo): the haze is drawn only while the story leaf `net.haze` is up, which the keys raise at the galaxy wides alone; `HAZE_FROM`, the eye-distance gate, is gone (netShots.test.ts "net.haze", galaxySystem.test.ts)

From the Task 11 review:

- [x] M1: the core haze draws on the phone at ls-1 (eye 375 > `HAZE_FROM` 300) and on desktop at re-3, tr-1, the surge, fx-3, fx-4 and ls-1. That breaks "galaxy wides only" and widens Task 10 M1 (galaxySystem.ts:183). → re-skin: done in 18b1f40 (re-skin Task 1a, archive repo): the haze is drawn only while the story leaf `net.haze` is up, which the keys raise at the galaxy wides alone; `HAZE_FROM`, the eye-distance gate, is gone (netShots.test.ts "net.haze", galaxySystem.test.ts)
- [x] M2: ls-1's hold is missing from `HOLDS`, so the holds test and the per-hold late clearance test skip it. Only the dense sweep covers it (netShots.test.ts:706, :1263). → done in 67c7f9c
- [x] M3: the three new purity samples use `MIN_LIT_PIXELS_SMALL` unmeasured; measure them and raise the floor where it holds (e2e/purity.spec.ts:138-140). → done in 75452b7
- [ ] M4: no pixel check sees the feed's brightness or its being unfaded; only parity and shader regexes do (e2e/galaxy.spec.ts, the feed test). → T13
- [x] M5: the e2e web server warns about extensionless imports in src/story (loader.ts:2, markup.ts:1, reveal.ts:1; `VITE_CONFIG_NATIVE_IGNORE_WARNING`), from before this diff. → done in 33ace50

### Task 12

- [x] **The held frame reads weaker than the mock** (Task 12 concern 1). The copies show as fine red/blue fringes rather than a strong double image, and the scatter's white haze dominates the planet. Tune the copy offset and gain, and the scatter haze. → re-skin: done in 2104009 (re-skin Task 8): the copies add, as the mock's; the held planet's fill is halved while its scatter is out, which keeps C1's hue (softer than the mock: a pending author call)
- [x] **C1 is pale blue, not the mock's luminous cyan** (Task 12 concern 3). Raising the gain only whitens it; it needs a hue change. Fold this into the class re-skin (the black hole, stars and planets workshop). → re-skin: done in 7a5d2fb (re-skin Task 7: C1 pinned to `#1FB0FF`) and 2104009 (Task 8: the held planet cyan)
- [x] **No still shows the ticks part-way** (Task 12 concern 2). They are gone by 0.395. Add a still mid-retraction, around 0.39. → done in aad5070 (0.390-retracting)
- [ ] **e2e thresholds measured at 1x on SwiftShader** (Task 12 concern 5). The limb test's margin is thin (2.29 against 2.4). Revisit with real-device stills. → T13
- [x] **Flake: autoAdvance "from the top"** (Task 12 concern 7). It fails 3 to 6 times in 8 runs, before and after Task 12. Root-cause it alongside the other autoAdvance flake. → done in 24848ca (the page records its holds; the test polled past 0.4 s holds)
- [x] **Slow e2e specs** (Task 12). The pages jump/scroll test and reduced-motion took longer timeouts (6 and 3 min), and keyframes "five held stages" got 20 s. Find out why these specs are this slow; don't just grow the timeouts. → done in c3db2da and 5ef3a39 (profiled: the pages deep links relink the galaxy's shaders on the CPU, so the check runs in three balanced parallel parts, 1.6-1.9 min each; the live reduced-motion pages wait 15-20 s on their first canvas read, explained and bounded at 3 min; keyframes 20 s to 0.19 s in 45791a8)

From the Task 12 review:

- [ ] **The limb's break is a feathered notch, not a 20° gap.** - Where: src/scene/node/freeze.ts:94 and src/scene/node/freeze.glsl:63 use `smoothstep(0, FREEZE_LIMB_BREAK[1], apart)` with `[135, 10]` (birth.ts:546). - Effect: the ink is zero only at exactly 135°, half at ±5° and full at ±10°. - Spec: freeze-frame §2.1 item 4 asks for "a 20° break … feathered over 10°". The approved mock closes ±9.7° and feathers out to ±24° (`smoothstep(0.17, 0.42, |ang − 2.356|)`, docs/mocks/freeze-frame.html:217). - Fix: e.g. `smoothstep(BREAK[1], 2·BREAK[1], apart)`, in both mirrors plus the unit test's band. The brief's test wording ("2.25 outside the 20° break") is satisfied either way. - Related: the limb test's margin is thin, 2.46 measured against 2.4 (e2e/network.spec.ts, "the limb reads"). The implementer also reported this. → T13 (re-triaged in the sweep: the spec's "a 20° break … feathered over 10°" reads either way, and the built break is 20° across, feathered 10° each side; the mock's wider gap would change how an approved frame looks, so it goes to the author with the limb test's thin margin)
- [x] **The 0.395 sample lands after the retraction, which no browser check or still catches part-way.** - Timing: C1's v runs 1 → 0 over defect 0.37–0.40. The probe gives v 0.926 at 0.375, 0.500 at 0.385, 0.259 at 0.39 and **0.074 at 0.395**, because net.fix goes 0.05 → 0.08 over 0.37–0.40 (src/timeline/keyframes.json:4828-4829) and C1's fixAt is 0.08. The spec puts v 0.26 at 0.395 (§1.1: 1 → 0 over 0.385–0.40). - Consequences: - "fewer at 0.395" (e2e/network.spec.ts:242-244) compares against roughly 0–2 surviving inner motes. - The spec's "the planet's annulus has moved in toward 1.12 R" is not asserted. - The parity node case "0.395, held and fixing" (src/parity/bodyCases.ts:76) sits at v 0.074. - The 0.395 still (e2e/stills.spec.ts:111) shows no ticks. - Fix: sample at 0.39 (v ≈ 0.26) or 0.385. Assert that some dashes still stand, fewer than at 0.33, with the planet's inner edge closer in. Add a 0.39 still. → done in aad5070
- [x] **The moon-dash clip check is tautological, and the clip sits outside the mirror pair.** - e2e/network.spec.ts:229-230 asserts that the TS twin's moon dashes lie outside the planet's inner radius, but the twin applies that clip itself (e2e/machine.ts `freezeTicks`). It cannot fail. - The clip lives only in tick.vert.glsl:61-63 and the test twin. It is not in freeze.ts/freeze.glsl, so no `?lib=freeze` row covers it, although spec §4 asks parity for "the gap and the clip". - A pixel check on the ticks-only frame closes it: no lit pixel inside the planet's inner radius. → done in aad5070 (a pixel check on the ticks-only frame, mutation-checked against the shader)
- [x] **The copies are not counted in either clearance twin.** - e2e/machine.ts:414 and src/timeline/netShots.test.ts:116 add the ticks but not the ±3/±6 px rolled copies or their breath. - At a 4° roll the copies stand at most about 0.5 px higher than the base. The ticks top them by tens of px and the margin is about 300 px, so this is harmless today. It is listed because the named requirement counts the copies. → done in 59a9ea8 (copyRisePx, galaxyPointTop)
- [x] **The forced scatter (and the clock substitution) are not gated by `net.focus`.** - The scatter is CPU-side (bodySystem.ts:384-385), so `hold ≥ 0.5` forces C1's scatter in any frame. - The "freeze only in focus" render test (fr-1, hold 1, focus 0) cannot see this: C1 is sub-pixel there, and in test mode the ambient is already the pin. - The keys keep hold at 0 outside the focused close-up, so nothing ships wrong. A `focus > 0` term on `forcedScatter` would make "every freeze term × focus" literally true. → done in aad5070 (the scatter gated by focus; the clock fenced by a keys test)
- [x] **`freezeTickWarm` is mirrored but not in the parity grid.** See src/scene/node/freeze.glsl:104 and src/parity/parity.ts:1067 (`freezeCase`). It is trivial; one more FreezeOut field would cover it. → done in aad5070
- [x] **The ghost's "none at 0.25" check was dropped** (e2e/network.spec.ts:335). - Test mode stands at the pin, so the check cannot run there. It could run with `&ambient=` set to a slot with no burst: hold is 0 at 0.25, so that ambient is shown. → done in b3e86d0
- [x] **keyframes.test's raise to 20 s is four times the need** (src/timeline/keyframes.test.ts:120). - Measured 4.35–5.03 s at the tip against 4.21–4.34 s at the base. A 10 s budget clears it on a busy machine and would still flag a regression that doubles it. → done in 45791a8 (the default 5 s again: the test takes 0.19 s)
- [x] **The twos being off under reduced motion has no browser check.** - The flash test (e2e/reducedMotion.spec.ts:176) covers only the flash. The twos test covers test mode only. - The code path is the same (`ambientClock.live()` is false), so the risk is low. A held 0.33 frame under `reduce`, compared 3 s apart, would pin it. → done in 5ef3a39
- ✗ **The streams and the feed are not dimmed or greyed** (src/scene/node/shaders/stream.vert.glsl:65; spec §3.1 lists `stream.vert.glsl`). - The implementer reported this. `net.streams` and `net.feed` are 0 throughout the defect section, so nothing visible is affected until another close hold keys a freeze over a lineage beat. → ✗ not done: the stream shader stays undressed; instead a keys test (aad5070) holds net.streams and net.feed at 0 wherever a freeze leaf is up, so no frame can need the dressing. Dress them if a hold is ever keyed over a lineage beat

### Post-12 batch (cuts and stream mask)

- [x] C5's hero flag, its FULL_DENSITY entry (a full lattice no shot visits now), its pinned radius and three moons, and its TRACK_TARGETS entry (index 11) have had no story use since the second fix was deleted. Removing them changes the generated galaxy's budget fit and the shots. Separately, `HERO_PLANET`'s comment still calls R0 and R1 the other heroes. → re-skin: the budget part done in 91f546a (re-skin Task 2, archive repo): C5 left `FULL_DENSITY` and lost its hero flag (generate.test.ts "C5 is an ordinary planet in the budget"). The layout part ruled closed (re-skin spec §7): its pinned radius and three moons set P2's system radius, which places the neighbourhood, and its `TRACK_TARGETS` slot stays (append only). `HERO_PLANET`'s comment no longer names R0 and R1
- ✗ The explicit page `out` (loader, reveal, markup, plan, the storyboard fence) no longer has a user in the essay. It is kept and tested on made-up stories. → ✗ kept: one of the text engine's two ways to end a page, tested on made-up stories, no cost to the reader; removing it is a text-engine change with nothing to gain here
- [x] Storyboard intro line 15 still says "thirty screens" (now 28.508). This is the stacks-era overview, left as written. → done in fcefd15
- ✗ Layers and spread now mix `layersAt`/`spreadAt` places (exact fractions) with thousandth lamp steps (spread) and 8-place beat `at`s in the markdown. Several tests needed 1e-6 tolerances for that. A shared "places in screens" convention for every section would remove them. → ✗ not worth it in this sweep: it would re-key every section's beats and lamp steps (keyframes.json and the markdown ats) to drop 1e-6 tolerances from a few tests
- ✗ `machineOnScreen`'s stream dots use a pixel ratio of 1 (as every twin does). The shader masks in device px divided by the ratio, so on DPR 2 the soft edge is 4 CSS px, as intended. The twin is not checked at DPR 2. → ✗ not worth a twin change: the mask is a function of CSS px (stream.vert.glsl divides the device row and height by the ratio), so the edge and its 4 CSS px soft span are the same at any ratio; the ratio only moves which device pixel a dot lands on, under 1 CSS px, and a masked dot is below the margin either way
- [x] **netShots.test.ts takes about 13 min alone** (post-12 batch). Counting stream dots in clearance made it slow; profile it and cut the cost (cache, coarser sweeps where it is safe) without weakening it. → done in f36918c (5.2 min loaded; see the sweep report)
