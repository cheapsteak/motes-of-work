# Act II re-skin: minor review findings

Minor findings from each task's review, collected here instead of fixed in the task's fix rounds (the
process rule adopted for the galaxy plan, carried into this one). Task 9 works through them.

## Task 1a (review of 18b1f40: approved, no Critical or Important)

- [ ] `galaxySystem.ts` `update(state, _camera, …)`: the camera parameter is unread. Task 5 (the hole's shadow mask) consumes it; if it does not, drop it and its two call sites.
- [ ] `e2e/galaxy.spec.ts` `HAZE_PX = 64` and `galaxySystem.test.ts`'s literal pin of `HAZE` and `STAR_TINT`: a retune edits three places. Read `hazePx` from the source in the e2e (it already imports `readFileSync`). The behavioural bounds already catch drift.
- [ ] `plan.ts`: the added doc sentence about `net.haze` is not needed (the `plan.test.ts` pin carries it).
- [ ] `galaxySystem.ts`: the dust set's `warmMix` is never read (no dust mote is warm), and its test pins the dead value.
- [ ] `netShots.ts`: `ACT_TWO_MOVES[0]` is taken by index while `INTO_FAR` is found by shot name; find by shot, or assert at the source.
- [ ] `e2e/galaxy.spec.ts`: the stage background literal `[0x0b, 0x0d, 0x12]` is repeated, as elsewhere in that file; consolidate in a cleanup.

## Task 2 (review of 91f546a..c1460bd: spec compliant; 1 Important fixed in round 1)

- [ ] The lit handover is partial: a lit star's glow and spikes take brightness and breath 1, but its dot cloud keeps `brightness × gain × breath` (`bodyMote.ts`, `bodyMote.glsl`), so the dots breathe under a steady ember glow. Hand the dots over too in both mirrors, or say why they differ.
- [ ] The star core is a 2-D (Rayleigh) radial law, not the spec's 3-D gaussian ball (`star.ts`, `star.glsl` `starDotPolar`); the RMS fence cannot tell them apart. Small at 40 dots.
- [ ] Stale pointers after the `spriteLook.ts` split: `classLook.ts` names `galaxySystem.ts` as the home; `e2e/galaxy.spec.ts` says `HAZE` cannot be imported (it now can: import `HAZE.hazePx` and close Task 1a's literal). Spec §4.6 and plan-constraints' homes table should name `spriteLook.ts` (controller: the re-export is accepted as the home).
- [ ] `starTopPx` leaves out the spike tip dot's own half-pixel and snap (harmless: tip gain about 0.003).
- [ ] `spikeFade` in `bodySystem.ts` re-implements `star.ts`'s smoothstep and the spike LOD fade; export one `starSpikeFade(glowPx)`.
- [ ] `galaxyMote.frag.glsl` hand-copies `HUMAN`, `EMBER`, `EMBER_MIX`, `LIT_CORE` instead of splicing them through `shaderSource.ts` (fenced by a test; the old mote.frag pattern).
- [ ] "Stars are white to amber" isolates only `net-glow` and `net-spikes`; the star's dot cloud (`net-shells`) is never colour-checked.
- [ ] A mended star (and now its spikes, `spike.vert.glsl`) tints toward the person's amber (`BODY_WARM`); spec §11 ruling 8 says a mended star reads by its ember going out, not by turning amber. Controller: owned by Task 9 unless the schematic re-design replaces the star look first.
- [ ] Spec §6 df-3 row says "P1–P3 (spiked stars)"; after the author's fewer-spikes change only P1 is spiked there. Update the picture column.
- [ ] Load-sensitive 5 s unit timeouts under parallel review load (background halos-apart, content line 6, reveal reading order, shell bounds, netShots "narrower set"); all pass alone. Pre-existing; bound or speed them.

## Task 1b (review of 37a19a9..ff55db9: approved; fingerprints verified bit-exact by the reviewer)

- [x] Done in 1c (5815c5a): renamed "… in the disc plane"; the stars of the disc (|y| ≤ starY) are held on screen too, the stars off it in the plane only (one desktop bulge star projects inside a spot's halo under Wisps (reviewed)). `background.test.ts` hood test: the name "no background star nears a neighbourhood star's halo" overclaims (on screen 5 bulge stars per tier do; worst 0.78 phone, 0.58 desktop). Rename to "in the disc plane", give the old on-screen value in the comment, and assert the on-screen form for non-bulge stars (|y| ≤ 1.5), keeping the disc-plane form for the bulge only.
- [x] Superseded by 1c (5815c5a): there is no `RECOMMENDED` lane band to bound; the wisps' lane is a filament of the field. `background.test.ts` lane test: pooled seeds 1–4 cannot see that the shipped seed-1 phone render has a weak lane (0.825 against no-lane 1.26). Add a seed-1 sanity bound (< 1.0) and note in the comment that seeds 5–8 pool to the same 0.635. → also a look note for the author: the shipped spiral's dust lane is faint on the phone.
- [x] Done in 1c (5815c5a): "turns its arms as armAngleAt says". `background.test.ts`: the old `armAngleAt` coverage (the wrap into (−π, π], arm 1 = arm 0 + π) went with the replaced test; add a small direct test.
- [x] Superseded by 1c (5815c5a): the wisps' knots are 24 beads with an exact share by index range ("draws the populations by index range"). `background.test.ts` knot-share bound ±0.02 sits 0.006 under its limit on the phone (0.194 vs 0.20); widen or pool seeds so a `clumpShare` re-tune survives.
- [x] Done in 1c (5815c5a): 1–14 frozen per key, 17–19 and 22 held, 15, 16, 20 and 21 unused, all distinct. `seeds.test.ts`: the whole-object `toEqual` on `STREAM_SALT` forces every later salt-appending task (15–21) to edit it; freeze 1–14 per key plus distinctness instead.
- [x] Done in 1c (5815c5a): two `// @ts-expect-error` cases in `background.test.ts`. No type-level fence that `satisfies BgRecipe` rejects an unknown key or an unported mode; add a `// @ts-expect-error` case.

## Task 3 (review of 5317c61..a10f7d8: spec compliant; I1 and I2 fixed in round 1; triangles reverted by ruling)

- [ ] The report says HEAD equals commit A; it equals A plus a10f7d8's three files. Correct the report line.
- [ ] Stale triangle comments in `e2e/stills.spec.ts` ("one triangle per dot … Act I's motes are triangles too") and `tools/still-diff.mjs` ("one triangle per dot moves pixels only by rounding").
- [ ] Spec §7's as-built note says the triangles "wait on a ruling"; record the ruling (quads stay: 4× multisampling and 1/16 px vertex snap make any triangle differ beyond 3/255). The plan's vertex-cost constraint and plan-constraints still mandate one triangle per dot: update both (controller housekeeping).
- [ ] The desktop tier has no vertex fence (only logged in `e2e/vertexCost.spec.ts`); its fr-1 heavy shells (about 10,314, less the 5,400 core) would miss the 5 % bound. Fence it or say why it is exempt.
- [ ] The early-out pixel test cannot tell whether `VERTEX_HEAD` was shot from the build under test; name the `reuseExistingServer` trap in its header and require both sets from a freshly built server.
- [ ] `streamSkips` leaves out `stream.vert`'s band skip, so `vertexStats()` over-counts heavy stream runs when the streams are up; say so in its doc (`earlyOut.ts`, `main.ts`).
- [ ] The three load-sensitive 5 s unit timeouts (reveal, content, netShots) again; already listed under Task 2.

## Task 1c (review of 9744a56..f392a5c: spec compliant; Important #1, the hold's key runs, fixed in round 1)

- [ ] **A stills comment is wrong** (`e2e/stills.spec.ts:182`). It says zo-0.75 shows the neighbourhood's "far form". zo-0.75 is real 1 on both tiers: the report's table, and my scan (whole through zo 0.80 on a phone).
- [ ] **An assertion is phone-only without a reason** (`src/scene/galaxy/galaxySystem.test.ts:85`). The test holds the far share at 1 at the galaxy wide on the phone only. The desktop's glow there is 8.6–8.7 px, under 11, so it should hold at 1 too. Either assert it or say why not.
- [ ] **`armAngleAt` lost its arm type** (`src/galaxy/background.ts:282`). The `arm` parameter widened from `0 | 1` to `number`, so an arm index of 2 or 0.5 now typechecks.
- [ ] **Two exported `hoodGlowPx` functions** (`src/galaxy/background.ts:332` `(tier, spot)` and `src/scene/node/lod.ts:106` `(d, focal)`). They share a name, have different signatures, and both mean "a neighbourhood star's glow". The names are plan-mandated (the brief's Interfaces), but they invite a wrong import.
- [ ] **The report omits the vertex baseline.** Brief Step 6 says to re-shoot `shots/vertex/base` "and say so". The baseline appears re-shot (15:52–15:56), but the report never mentions it.
- [ ] **A stale comment in the tuner** (`scratch/session/galaxytuner/gen.js:198`). It still says "stream bgArmMod, salt 14". It was left per "nothing else changes", but it now misdescribes the table above it.
- [x] **The look-check table points the mid row at the wrong framing** (decisions page, "Look check", the `galaxy-hood-dissolve-late-mid-phone.png` row, zo-0.75). On a phone the band runs from zo 0.80 to 0.88; zo-0.75 is past it, so a side-by-side there cannot show the fade. Suggest zo-0.84, with a decision-still framing to match. This is the controller's table, not the implementer's code. Done: the row now points at about zo-0.84.
- [ ] **The process deviation is noted, not raised.** The brief's one close-out commit subject is split over 5815c5a and 2611544, one per green step, for restart safety.
- [ ] **Stale hold comments** (re-review of 62ed247): `e2e/stills.spec.ts:183` and `docs/specs/2026-10-09-act-2-reskin.md:750` still name only ly-3 and ls-1 as held; the hold is now ly-3, up-2, fx-3 and ls-1 (and Task 1d adds tr-1 and fx-4).

## Task 1d (review of 73062e0..da7f631: spec compliant but for ly-4, fixed in round 1)

- [ ] **The hood probe at 120 cuts the core's six bodies at the phone's left edge** (`netShots.ts:142`). No reader sees `GALAXY_SHOTS.hood` (it is not keyed), but it is the look-check framing for the binaries row: set it to 146 or note the crop on the decisions page.
- [ ] **`keyframes.json` grew** from 6,640 to 11,377 keys (60.6 to 102.4 KB gzipped, +42 KB on a phone's first load) with the correct `moveKeyCount` fix. Listed on the deferred performance page.
- [ ] **The stream-flow step still aliases one count** (`e2e/galaxy.spec.ts:984`): a stream of about 26.7 dots would stand still between the two frames. Sampling two incommensurate steps would make it robust.
- [ ] **Stale text:** `generate.test.ts:158` still asserts the old `outer + outer + 1` gap (redundant beside the 1.5 test); `background.test.ts:50`'s `wideProjector` doc still says distance 640 for both tiers.
- [ ] **Look rows for the galaxy wide, the far dissolve and zo-0.84 were not re-shot** after the spots and the zoom-out's lamp steps moved; the next pre-publish judge re-shoots them.
- [ ] **Stale ly-4 text** (re-review of e9daeb1): `docs/specs/2026-10-06-act-2-storyboard-and-network.md:133-134` and `docs/specs/2026-10-07-galaxy-orbits.md:736` still say the ride runs 2.9-3.4 at growth 0.21 with the planet "born as the camera arrives".
- [ ] **`actTwoKeys`' mix-key reuse is not fenced** (`src/timeline/netShots.ts:1810-1818`): `flush` uses `>=`, so an overlapping previous pan would also merge silently. Only ly-4's push-in triggers it today; pin that with a test.
- [ ] **ly-4's hold margins are thin** (`src/timeline/netShots.test.ts:960`): planet-10 is 0.517 landed at 3.4, and the 4 px check uses the planet's full radius while its mote cloud is still building. The lamp sequence (Arms, then Star on star-4, then Star on P_a) has no dedicated test.

## Task 1e (review of c71c2c0..12e9209: spec compliant; Important 1 (motion test) and 2 (zoom-out else) fixed in round 1)

- [ ] **`src/galaxy/generate.test.ts` ("keeps every pair of systems…"): a bound was loosened without need.** The nearest-neighbour bound went from ≤ 1.5 to ≤ 1.7. Measured over units, it stands at 1.481 (mean 27.59). **Fix:** restore 1.5 and note the measured 1.481.
- [ ] **The survivors' streams are unfenced.** Born, hiAt, hop and bowBearing (via `fullRow`) have no test against the singles generator; the report's "bows are kept" claim has no test behind it. The probe found all 5,863 streams equal over seeds 1–40. **Fix:** add the streams, keyed by (from id, to id), to "keeps every birth".
- [ ] **`e2e/stills.spec.ts` `pairClose`:** - it does not ride the turn, so a0 and a120 show the beat (about 1.6°), not the orbit (about 34° in an Act II shot); the report's look line overstates the a120 motion; - its distance (2.7 × the pair's reach) puts each star's system at the foot of the track band, so it shows no tracks. **Fix:** set `ridesTurn: true`. Frame nearer (distance ≈ 35 puts each system at about 120 px), or note the framing in the look line.
- [ ] **`e2e/galaxy.spec.ts:166-171`: the desktop wide pins counts, not identities.** **Fix:** assert that the two systems under the planets' 10 px that 1d had above it are star-7 and star-14.
- [x] **No `shots/look/` side-by-side for the ly-5 B row** against `ly5-opening-compare-phone.png`. The row is not in the look table yet. **Fix:** add a row to the table and a side-by-side. Done by the controller.
- [x] **`tools/check-public.sh` (outside the diff) passes silently in a worktree without the untracked term file.** It prints "nothing to check against" and exits 0, which reads as a pass. **Fix:** exit non-zero (or print "UNCHECKED") when the term file is missing. Done by the controller.
- [ ] **`generate.ts` `buildPair`: it can still throw.** It throws after 200 grow steps, and when μ falls outside the fit. Both are unreachable for seeds 1–40 and STAR_LOOK's brightness range, but the ruling says placement never throws. **Fix:** fall back to two singles instead of throwing.
- [ ] **The report's concern 3 gives the wrong reason** for the slow on-screen motion (the period rather than the beat). Correct the e2e comment with the fix to Important 1.
- [ ] **`src/timeline/netShots.test.ts` (the raised moon): the fixture was changed to fit.** It now takes the top moon-bearing planet and `r: 2`. That is fine, but the comment should say why `r` moved from 1 to 2.

## Task 4 (review of a6c9dd7..be71bab: compliant; Important 1, the float life index, fixed in round 1)

- [ ] **Test output noise.** hole.test.ts:248, :270 and :291 print the measurements with `console.info`    on every run. The reviewer rules count noise in test output as a finding. Put the values in the    report, or gate the lines behind an env flag.
- [ ] **`HOLE_LOOK.tilt` (holeLook.ts:15) is spliced but nothing reads it.** The inspector's tilt rotates    the group. A re-tune would do nothing unless Task 5 builds it into `viewRot` and `cam`. Either say    so in the comment and in Task 5's brief, or drop it. The spec holds tilt at 0.
- [ ] **`ringDot` borrows `HOLE_LENS.axis` as its normalisation epsilon** (hole.ts:328,    hole.glsl:203). The value is the inspector's 1e-4, but a re-tune of the lens's axis would silently    move the ring's. Give the ring its own named epsilon.
- [ ] **The parity cameras (75 and 210) never reach `holeDotPx`'s upper clamp** (2.2, view depth < 34)    or its depth-under-1 guard. Only the TS unit test exercises the upper clamp. The code is identical    in both mirrors, so the risk is low. A third, near camera would close the gap.
- [ ] **The shader-side draws don't depend on the galaxy seed.** The disk lives, knot jitter and    ember, and the in-fall's falls are keyed `holeSeed(slot, n)` only, so every galaxy seed shares    them (the holeAttrs seed-sensitivity test skips infall for this reason). This is plan-mandated by    the brief's `holeSeed(a, b)` signature, and the essay runs one seed, so it's harmless today.    Record it in the comment.
- [ ] **Residue from the 80-column prettier pass in the new files.** Some objects and return types are    still expanded where the repo's 150-column style keeps them on one line:    - holeCases.ts:40 (HOLE_CAMERAS[0]) and :257;    - hole.ts:148, 162, 357, 405 and 473;    - holeLook.ts:301.    The new imports are also out of order: parity.ts:38 and :40 (`Matrix3`, `Vector3`) and    shaders.ts:23 (`HOLE_PARITY_FIELDS`). This is cosmetic only. Existing files are clean: I counted    all 6 deleted lines, and each is a line the task had to change.
- [ ] **The test name "a dot is never under 1 device px"** (hole.test.ts:591) asserts a 1 CSS px floor.    Rename it to match the code and the inspector (see the ⚠️ above).
- [ ] **The knots' `seed` (aA.w)** is drawn and never read (holeAttrs.ts:135). This is plan-mandated by    the brief's layout, and the inspector's KNOT_VERT doesn't read it either. Note it for Task 5 so    the attribute isn't mistaken for live data.
- [x] **The floor wording:** spec and plan said 1 device px; the code, the inspector and the brief's test value are 1 CSS px. Words corrected by the controller.
