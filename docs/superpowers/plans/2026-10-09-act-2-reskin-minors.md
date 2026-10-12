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
- [ ] **The life-index fence pins the GLSL half only by regex and parity on an exact-division GPU** (re-review of 9c4b109): the TS fence guards the TS index; a GLSL-side test that runs the shader under emulated reciprocal division would make it airtight.

## Test speed (review of 12e9209..2a0d5f5: spec compliant; Important 1, the GPU reader ignoring unmodelled kinds, fixed in round 1)

- [ ] **The browser fence is one sample deep in three of four scenes** (`src/purity/samples.ts`): none at the pose ambient, the freeze hold (defect 0.33), the reviewer's ring or the trace's surge. The shaders are pure, so the risk is low; the guard asks only for one per scene.
- [ ] **The scroll and detour landing checks now run at the 6 fence samples only** (`e2e/purity.spec.ts`). They are page-level preconditions, but the report should name them under "what stayed in the browser".
- [ ] **Texture format, type, filters, wrap, flipY, image size and material defines are read live**, not as of the last upload or compile (`gpuInputs.ts`). A change without `needsUpdate` that is later reverted would read as equal.
- [ ] **The twin rebuilds the frame assembly of main.ts by hand** (`src/purity/twin.ts` against `src/main.ts`): the build rule, `shown`, the pins, the live ambient, flash and shimmer. A shared helper in `stage.ts` mapping clock and mode to a `StageFrame` would close the drift.
- [ ] **CI e2e no longer runs on pull requests** (`ci.yml`, `e2e.yml`); the README's CI line should say so.
- [ ] **The Playwright image and actions are pinned by tag**, not digest or SHA (hardening only; it matches the old `ci.yml`).
- [ ] **`digestOf` hashes aligned views by word and unaligned by byte**, so equal bytes at different alignments differ (false positive only); its docstring overstates.
- [x] **The reviewer instructions named port 4199 for reviews**; corrected to 4198 by the controller.
- [ ] **Workers: re-measure 2, 3 and 4 on a quiet machine.** No setting met "no timeouts across two runs" on the shared machine; 2 workers kept.

## Task 5 (review of fb0f69f..91a2f91: Important 1, every lamp judged by drawn pixels over the hole stretch, fixed in round 1)

- [ ] **The hole vertex shader's compensation step has a TS twin but no fence** (`hole.vert.glsl`: `min(1.0, d.alpha * uComp.x)`, `d.sizeCss * uComp.y`). No `?lib=` parity case or source-text fence; a drift would move the drawn hole away from the clearance twin unseen.
- [ ] **holeTopBound's fence is coarse:** `HOLE_REACH` x 0.5 fails only the hour sweep at 1440, and x 0.6 passes every test. The bound rests on its (sound) structural argument. Fence: assert `HOLE_REACH` is at least the largest per-axis view offset of every twin dot over a few cameras and the hour.
- [ ] **The shadow mask is enumerated, not discovered:** the five-frag test lists files by name, and the bike motes (`mote.frag`, `ghost.frag`, `thread.frag`, N0 in Act II) carry no mask; a probe of 801 Act II samples never found N0 inside the shadow. Fence: walk every material under the galaxy groups and assert `uniforms.uShadow` is the shared object, plus a check that N0 never projects into the disc.
- [ ] **The two netShots layers sweeps went from 300 s to 900 s** before 91a2f91's bound; re-measure and bring the timeouts back down if the bound recovered the time.
- [ ] **The reduced-motion test waits 1000 ms before comparing** (`e2e/reducedMotion.spec.ts`); the brief says the hole stops at the pose on the next frame. The test proves it stops, not when.
- [ ] **For the author (look):** R0's clean blue strand reads as blue arcs on the warm receding half; the shadow blanks background stars while the hole is unlit (up to 23 px radius in the move into ly-2, before its lamp step).
- [ ] **Test speed: gpuInputs does not check `updateRanges` on the index or interleaved data**, and does not read interleaved `stride` or `gpuType` (re-review of fix round 1).
- [ ] **Test speed: `assertDefaults` skips every underscore-prefixed field**, not only fields behind read getters (re-review of fix round 1).

## Task 8b (review of d037ca8..8831f96: compliant and approved; no fix round)

- [ ] **The dropout hides any dot whose disc touches a line** (`bodyScreen.glsl`), where G5 hides by centre: the dark band is up to a dot diameter taller than the line and the rim's cut; `dropout.ts` still says "whose centres". A per-fragment discard in `galaxyMote.frag` for the piece would match G5 exactly and still pass the 50 % test.
- [ ] **The twin's flash guard hides by centre, the page by disc** (`dropout.test.ts`); disclosed in a comment, but the twin no longer models the drawn rule.
- [ ] **The dressed limb test no longer tests an unscattered shell** (`e2e/network.spec.ts`): `freeze.hold: 0` turns the forced scatter, leak and dropout back on. Sent to Task 7, which re-pins it.
- [ ] **The leak's vertex cost is estimated, not measured**: about 10 % of the shell's heavy path, about 1-3 % of vertex work against the 2 % limit. Cheap savings: reuse `shellWarpK`'s unit vector; fetch ages and seeds only inside a cone. A healthy body pays one texel fetch.
- [x] **The drawn flash guard (about 8 min a size) made one CI shard 13.7 min against 9.4**: split into chunks with overlapping windows on branch `task-ci-balance` (pipeline fix).
- [ ] **The shape steps when the force comes or goes** (`shell.ts` `scatterCount` counts every slot when forced): focus crossing 0.5 near defect 0.12, and the hold's release at 0.405; scroll-pure pops of 0.02 R. Disclosed.
- [ ] **The forced scatter, leak and dropout return during the freeze's release** (hold 0 from 0.405, dress fading to 0.421), copies included. For Task 8, which tunes that window.
- [ ] **117fd24's message claims a shell.test timeout** its diff no longer holds (main's version was taken in the rebase).
- [ ] **The `DROPOUT_MAX` splice comment names `bodyAttrs.ts`** but the value is `DROPOUT.maxLines` from `birth.ts`; the constant is generated in two places.
- [ ] **The 8b side-by-sides shrink the decision strip to a 400 px thumbnail**; the full-size strip is what makes the comparison possible.

## Task 7b (review of 26deda5..1eab68b: Important 1-4 fixed in rounds 1-2; re-reviewed at 628e070, all addressed)

- [ ] **The plan's parity bar is looser than the brief's 1e-3** (`src/parity/parity.ts`, `e2e/parity.spec.ts`): least error over 256 time shifts with `shifted` unbounded (the body cases cap it at samples/50), and `px` relative to the screen's larger side (up to 1.44 CSS px passes on a desktop). Bound `shifted`; hold `px` in absolute CSS px.
- [ ] **Magic numbers in the plan shaders and twin, not in `PLAN_LOOK`**: the tick's `smoothstep(0.85, 1, lf)`, the extension's 0.7 alpha, a 0.95, `0.15 * share`, `planDash`'s 0.02 edge, the dimension's literal 6/10/16 (constants exist), `d.j / 14`, the ellipses' 60 and 90 in `planAttrs.ts`.
- [ ] **Stale slot wording** after the pools replaced the slots: `planMeshes.ts` header, `plan.vert.glsl`, `planScreen.vert.glsl`.
- [ ] **`PlanStats.slots`** reports the first two systems in index order with full > 0, not the two in R by size, as its doc says.
- [ ] **ls-1 on a desktop stands at s_px 30.7**, past the outer ring's window start of 30; unmarked only because the ramp's first 0.4 % stays under `LOD_VISIBLE`. The brief asked for 40. Thin margin.
- [ ] **No purity fence asserts a chevron** any more (P5's system at 149 px is past PlanLeave 75-105); only the plan parity page covers the chevron GLSL.
- [ ] **`lod.ts` overstates 0.45's win**: 0.40 had the lower worst light (5.7 % vs 7.7 %); 0.45 wins on worst dots and p95 only.
- [ ] **A 6-dot dash rank piece can span parts of two dashes** on a large departure (period fixed in angle on large radii). Visual nicety.
- [ ] **The twelve's H arrives in one step at df-3's lamp 5** (defect 0.4725: 7 → 359 dots in one 0.0025 step); lamp gating, but on a phone the neighbourhood's marks land at once.
- [ ] **The frame drain covers only `pages.spec.ts` and the plan schematic describe**; any other DOM-only test that scrolls through the galaxy can still leave queued frames for the next test in its worker.
- [x] **The shard table is stale again** on 628e070 (slowest shard 3.1 min over the mean): refresh `tools/shard-times.json`. Done in 325d10a (Task 9, from run 38251323888).

**Author calls from Task 7b** (provisional rulings in place; see the ledger):
- The chevron window is 30 → 55 against the spec's 45 → 65, so chevrons show at df-5.
- At df-5 on a phone about a third of H's dashes and chevrons dissolve whole at s_px 45-48 (the arcs' window is about 0.65 there); the decided still draws every one. Closing it means moving H's windows down.
- On df-3's pull, lamp 1 lights only C1, so only C1's marks morph R → H; the rest of the system arrives at lamp 5.
- The plain ring skips the open arc's 100° (budget: 3,742 of 3,800 at the hood, 4,778 without).
- Continuity holds at 7 / 9 / 3.5 % (measured 5.6 / 7.7 / 2.8) against the spec's 3 % per step.
- At ly-4 the binary pair draws no plan on a phone (s_px 22-26; in the hold lamp 2 narrows to star-4's system).

**Author calls from Task 9** (nothing changed for them; each awaits the author):
- ✗ **The galaxy wide on a phone** sits low and small (its light centred at row 524 of 844, columns 89-299). `frame` cannot raise or enlarge it: frame 0 is already the rig's highest placement. A bigger phone wide needs a portrait-only distance (a new mechanism), or `GALAXY_WIDE`'s distance or fov with the background's fingerprints re-measured.
- ✗ **ly-4's planets** are 1-2 px points on their node crosses at the hold (R7-ly-4), reading as marks on the plan more than as planets. Judge it live.
- ✗ **A lit planet's dust is drawn round its ember point**, never over it (4390bcb). It is invisible at the essay's df-5 (85 px of a phone frame); at re-1 and re-2 the lit planets' centres are slightly smaller, deeper ember discs.
- ✗ **C1's moons' far hemispheres are dimmer** (`MOON_FAR_DIM` 0.075, a planet's 0.2; 5659f7e). At df-1 the lower moons read a little more as crescents, which bears on the pending crescent call (option A).
- ✗ **The dotted orbits at DPR 1**: the mean dot reads (54 over the background at re-1), but half of re-1's dots sit just under the 40 that reads (median 39 / 37). Check them on a real phone.
