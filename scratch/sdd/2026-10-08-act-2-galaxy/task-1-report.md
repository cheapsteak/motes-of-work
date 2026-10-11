# Task 1 report: the galaxy's pure model

Status: DONE_WITH_CONCERNS

## Commits (on `main`, not pushed)

- `4d79b31` galaxy: body kinds, sizes, counts, lattices and orbital elements
- `5748cbc` galaxy: the background of stars and dust on two arms
- `7591566` galaxy: the scripted bodies and the generator

## What I implemented

All in `src/galaxy/`. Nothing in the app imports it.

- **`body.ts`** has every signature in the brief, with the formulas verbatim. These are the lattice rows and counts, `planetLattice` and `moonLattice`, `planetCount`, `planetOrbitRadii`, `planetRadius`, `moonCount`, `moonRadius`, `moonTrack`, `MOON_TRACK` and `MOON_PERIOD`, `planetPeriod` and `orbitFor`.
  - `planetOrbitRadii` jitters each even gap by ±15 % and then scales the gaps together, so the first orbit is exactly 2.2 and the last is exactly `5.5 + 4.1(n−2)/7`.
  - `orbitFor` makes six draws in a fixed order. They are e, tilt, tiltAz, ω0, precession and phase, with phase in turns.
- **`background.ts`** has `galaxyTier`, `BG` verbatim, `armAngleAt`, `armPhaseFor`, `ARM_PHASE = armPhaseFor(65, 0.9)` (exported) and `generateBackground`.
  - Every star and every dust mote draws from its own seeded stream, which drops its first output (see self-review).
  - Core stars sit at `0.35·220·u^0.75` with a uniform bearing. Arm stars sit at `220·u^0.75` on arm 0 or arm 1, with the scatter `0.42(1 − 0.5r/220)`. Dust sits at `220·u^0.6` with a scatter of 0.9, narrowing the same way. Heights are triangular within ±0.6 for stars and ±1.1 for dust.
  - Brightness is `0.35 + 0.65u²`, the brightest 15 % go to `bright`, and dust brightness is 0.08–0.18.
  - Nothing lies within 16 of the centre. A star is a leak star with probability 0.15, and only a leak star may stay within 50 of the neighbourhood centroid.
  - Coordinates are rounded to float32 before the exclusions are checked, so the checks hold on the stored values.
- **`lineage.ts`** has `ScriptedBody`, `SOURCE`, `AGENT_RULE`, `FIRST`, `OWN_FIXES` and `LINEAGE`, plus an exported `HOSTS` table.
  - `HOSTS` is the brief's table in orbit-slot order. Each planet's `host` is looked up from it.
  - Every id, alias, birth, `dur`, `hiAt`, `fixAt`, hero flag and parent list matches `src/network/lineage.ts`, with rule → core, plan → star, code → planet and `nearest-clean-plan` → `nearest-clean-star`. A throwaway probe compared all 56 rows and every one matched.
  - The pins are N0 (7 moons), C1 (6) and C5 (3), all at `R` = `PLANET_R_PIN` (0.30). R0's spot is pinned at (0, 0).
- **`generate.ts`** has every type, constant and function in the brief. The body of `galaxyBudget` is copied from `networkBudget`.
  1. **Core.** R0 is at the centre. The other five are seeded within 12 of it and at least 5 apart.
  2. **Stars.** There are 11 scripted stars and 19 filler stars. The filler births use the old plan law.
  3. **Slots.** Each star has `max(planetCount(u), scripted planets)` slots on `planetOrbitRadii`. Each slot gets a planet radius, moon count, orbit and moons (§13), except where the story pins them. Scripted planets take the innermost slots in `HOSTS` order.
  4. **Star spots.** Each system's outer radius is computed first, then the spots are placed. See judgement call 1.
  5. **Filler planets.** They are born by the old code law (`count·g^1.3`), in birth order, into the innermost free slot of an eligible star. The star is picked weighted by how many free slots it has, so the newest planets end up farthest out. 15 % are copies of a planet in the same system, which gives a sideways stream.
  6. **Defect rules.** The old generator's rules for crack, hop, `hiAt` (`HI_AT_BIRTH` for filler), eligibility and the sweep are kept unchanged. The sweep orders stars before planets, then by hop, then by birth.
  7. **Moons** land at `p.born + p.dur·(0.7 + 0.3(j+1)/m)`. A track's moons are spaced evenly round it. N0's moons get `partGroup` 1–7, with radius `max(0.04, 0.35·0.30·sqrt(share/max))` from the placeholder shares `N0_PART_SHARE`.
  8. **Streams** run core → star (`out`), star → planet (`out`), same kind (`side`) and planet → core (`in`), and C7 → R1 is the only `in` stream. Each stream's `born`, `hiAt` and `hop` follow the old rules.
  9. **`derpSeed`.** R0 gets an integer in [0, 2²⁴) that is never `NODE_NEVER`, and every cracked body shares it. Healthy bodies get `NODE_NEVER`, imported from `src/scene/node/birth.ts`. `derpPhase` is seeded per body.
  10. **Lattices and budget.** Lattices are full when the total fits the budget. Otherwise the unnamed shells are thinned first. See judgement call 7.

## Judgement calls (please confirm or overrule)

1. **Neighbourhood placement (ruling 7).** I could not draw the spots at random on the arm stretch, because 30 systems do not fit.
   - With outer radii of 5.7–10.4, each pair needs a gap of about 13–21.
   - Arm 0 at the background's scatter (±0.42 rad) is narrow across. Between radius 40 and 110 it also winds most of the way round the core. Only 15 systems fit there, even widened to 110.
   - A bearing scatter of 0.9–1.0 rad does fit them at 40–110, but the "neighbourhood" then wraps right round the core. On MOTE_SEED it covered every bearing, its centroid sat at radius 43 and its spots lay up to 111 from the centroid.
   - So each star in turn (scripted first) takes, of 1,500 seeded candidates, the free spot nearest the middle (65, 0.9). Nearness is measured on an ellipse laid along the arm with semi-axes 45 along × 35 across (§14.2's 90 × 70). The radius stays within `HOOD_R` and the pair gap rule is kept.
   - **Result on MOTE_SEED:** all 30 fit within radius 40–90, so the 110 widening was never needed. The spots span about 112 × 104 units, with the centroid at (34.3, 0, 39.0), which is radius 52 and bearing 0.85.
   - **Over 300 seeds:** every one fits, and none needs the widening to 110.
2. **The arm-spacing test is infeasible as specified.** The brief asks for a median of at least 7 px at 0.86 px per unit, which is at least 8.1 units.
   - The arms cover about 27,000 units², roughly a sixth of the disc. The phone's 1,872 arm stars therefore have about 14 units² each.
   - Even a perfect hexagonal lattice on the arms would space them 4.1 units apart (3.5 px). Random draws give a median of 1.76 units (1.51 px, measured on the phone tier).
   - I kept the brief's assertion exactly, but as `it.fails`, with the arithmetic in a comment. It will turn red if the counts or scatter are changed enough to meet it. The design needs a ruling on fewer stars, a wider scatter, or a different criterion.
3. **Warm stars** are stored as a negative brightness (|b| is the brightness), because the interface gives four floats per point. The renderer reads `abs(b)` and `b < 0`. The alternative is an extra field on `Background`.
4. **Only C1 gets the dense 6,116-mote lattice** (`HERO_PLANET = 'C1'`, morph §14.7: "the hero planet is C1"). C5 keeps `hero: true`, meaning the camera visits it close, but it is drawn on the ordinary 0.30 lattice of 324 motes.
   - With both dense, MOTE_SEED needs about 79k motes against a budget of 76,000, which would thin every shell, C1's included.
   - With only C1 dense it needs 73,560, which fits at full detail.
5. **Moons share their planet's `hiAt`, `fixAt` and `hop`**, so a piece lights and heals as a whole. Because of that, the "exactly the twelve" set in `generate.test.ts` is taken over non-moon bodies. That is the brief's "stars P1–P3, planets C2–C10".
   - Each moon has `parents = []`, no stream, and `cracked` equal to its planet's. A moon of a planet born just before `CLEAN_AFTER` lands after it, so the "stream parent" rule cannot decide a moon.
6. **Stratified bare-or-not draws.** The filler slots' first draw (bare or not) is stratified across all filler slots (a seeded permutation), so the 45 % bare share holds for every seed. Independent draws over about 100 filler planets give ±5 % at one standard deviation, so the brief's ±5 % test would fail on about a third of seeds. Each slot's draw is still uniform.
7. **Births and the budget.**
   - Filler stars use the plan law compressed into [0, `STAR_BORN_BY` = 0.9], so a late star still has time for its planets.
   - Filler planets use the code law up to `1 − 0.012`. Where a birth comes before a slot is free, it is moved later. That is the minimum that guarantees every slot can be filled, and every planet and moon is built by growth 1.
   - When the total is over budget, the unnamed shells are thinned first: every planet's and moon's lattice except C1's. C1, the core and the stars are scaled only if that is still not enough. Over 300 seeds at the desktop budget, C1, the core and the stars always keep their full lattices.
8. **Membership rows.**
   - A core body's `rule` is itself.
   - A star's `star` is itself, and its `rule` is its main parent's rule.
   - A planet's `star` is its host and its `planet` is itself. Its `rule` comes from its main lineage, so V5, hosted on P5 but built from Q2, has rule R1.
   - A moon copies its planet's rows.
   - `systems` lists every star's row (30, under `SYS_MAX` 32).
9. **`Stream.bow`** is the seeded bearing of the bow about the chord, in [0, 2π). The renderer applies `STREAM_BOW` × chord.
10. **Person motes.** The share is 6 % with a minimum of 24, a hero planet gets 70, and a moon gets 6. The derping moon's 20 is left to Task 6, which owns the split.
11. **`CLEAN_WORK_FROM`** is also read from `schedule.ts`, for the old eligibility rule.

## Tests and results

- **Step 1 (base, HEAD `3f70f70`).**
  - `npm run typecheck && npm test`: 68 files, 1550 tests passed.
  - `E2E_PORT=4199 npm run e2e` (dist rebuilt first): 147 passed and 9 skipped (the SHOTS-gated screenshots) in 24.9 min, exit 0.
- **RED.** `npx vitest run src/galaxy` failed 3 files with `Cannot find module './body'` / `'./background'`. That is expected, because the modules did not exist yet.
- **GREEN.** `npx vitest run src/galaxy` gives 3 files, 41 passed and 1 expected fail (the arm spacing).
- **Close-out A.** `npm run typecheck && npm test` gives 71 files, 1591 passed and 1 expected fail.
- **Close-out C.** `E2E_PORT=4199 npm run e2e` on HEAD `7591566`: see the end of this report.
- **What the tests cover beyond the brief:**
  - lattice row law
  - lattice density with size
  - bare share 0.45 for `moonCount`
  - moon tracks that never cross at the widest eccentricity
  - phone vs desktop tier changing only the background
  - membership rows
  - stream kinds and fields
  - nearest clean star for V1, V2, V4 and V6
  - track phases spaced evenly
  - every body built by growth 1
  - budget thinning that keeps the layout, with the named shells thinned last
  - pins held over ten seeds

## Self-review

- **Bias in mulberry32's first output.** For closely keyed seeds it ran high: 0.1541 below 0.15 over 48,000 draws, which is +2.5σ. The hood leak test then showed 20 % instead of 15 %. Both `rngFor`s now drop the first output, and the leak has its own stream.
- **Formatting.** There is no prettier config in the repo, and existing files match `--print-width 140 --single-quote`, so the new files are formatted that way.
- **Probes.** The throwaway probe tests were deleted and nothing else is left in the tree.

## Concerns

1. **Arm spacing.** See judgement call 2. A design ruling is needed.
2. **Task 2's "no two planets of a star intersect" test will fail with the specified eccentricities.**
   - I probed with a Kepler solver (three Newton steps, tilt about the azimuth axis, precession) over 720 samples of 0–1200 s. Planet spheres overlap in 266 of 226,800 samples on MOTE_SEED, with a minimum gap of −0.55, and similarly on seeds 2 and 3.
   - The cause is in §12.1: with e up to 0.22 a periapsis is `0.64 r`, so adjacent orbits cross, and ±0.25 rad of tilt does not keep the bodies apart in depth.
   - Two fixes are possible. Task 1 could redraw phases or ω0 against Task 2's `orbitLocal` until the samples are clear. Or the test or spec could be changed.
3. **Neighbourhood geometry.** See judgement call 1. It is a compact knot on the arm, not random spots along the arm stretch.
4. **The background's hole near the core.** Per §14.2, the exclusion is a disc of radius 50 round the neighbourhood centroid. With the centroid at radius 52, that disc reaches to within about 2 units of the galactic centre. On the phone tier it removes 59 of the 328 stars inside radius 40, all on the neighbourhood's side, so it may read as a bite out of the core. Clipping the exclusion to radius ≥ 40, or shrinking it, would avoid that.
5. **Budget headroom.** On MOTE_SEED the shells and person sets use 73,560 of 76,000 motes.
6. **Warm-star encoding.** See judgement call 3.
7. **C5's lattice.** See judgement call 4.

## Close-out C (final e2e on HEAD)

`npm run build`, then `E2E_PORT=4199 npm run e2e` on HEAD `7591566`: 147 passed and 9 skipped (the SHOTS-gated screenshots) in 23.9 min, exit 0. That is the same as the base run, as it should be, because nothing in the app imports `src/galaxy/`. The run left no background processes. There are no stills for this task, and no test was retired or re-pinned.

## Fix round 1

Commits: `9e61c50` galaxy: background halos apart at the galaxy wide, and no hole round the neighbourhood · `074d93f` galaxy: lay out every system so no two pieces ever touch.

### 1. Arm spacing becomes "halos apart"

- **The `it.fails` test is gone.** In its place, `background.test.ts` "keeps the halos apart at the galaxy wide" checks the rule itself.
  - It projects every background star through the real galaxy-wide camera: fr-1 at bearing 0, elevation 86, distance 640 and fov 40, aimed at the core. It applies `portraitRig` from `src/scene/cameraRig.ts` and uses the vertical-fov focal length.
  - It does this on both probe screens, 390×844 and then 1440×900.
  - It asserts that at least 95 % of background stars have a halo cap radius (sprite/2: 1.75 px dim, 3 px bright) less than half the projected distance to their nearest neighbour. The neighbours are the background stars plus the neighbourhood's 30 stars.
  - It also asserts that no background halo touches a neighbourhood star's (5 px floor glow).
  - It runs on MOTE_SEED through `generateGalaxy` for both tiers, plus seeds 2 and 3.
  - "measures the galaxy wide as the camera does" fences `galaxyWidePxPerUnit`, which the generator uses, against the projection.
- **Scale.** The galaxy wide shows 0.94 CSS px per unit on the phone and 1.93 on the desktop. §4 assumed 0.86 for the phone.
- **With the specified counts the rule fails badly, even with clearance-seeking placement.** With 64 draws per star, keeping the roomiest:
  - phone 2,400: 18 % of stars apart
  - desktop 4,000: 94 % apart
  - widening the arm scatter alone, phone at 2,400: 0.7 rad gives 50 % and 1.0 rad gives 84 %
- **Smallest change chosen: lower the counts, keep the scatter.** The scatter is the look of the arms.
  - `BG.stars` is now phone 850 and desktop 3,400.
  - Measured over seeds 1–6 on the final code, phone 850 keeps 96.0–98.0 % apart and desktop 3,400 keeps 95.9–97.0 %.
  - On MOTE_SEED through `generateGalaxy`, both tiers pass the 95 % test.
- **Placement.** Each star takes its first draw whose halo is clear, or the roomiest of `PLACE_ATTEMPTS` (64) draws.
  - Clearance from the neighbourhood's stars is hard: such a draw is always redrawn.
  - The margin is ×1.05 for the perspective's spread of scale.
- **Spec superseded:** galaxy §2.1's star counts (2,400 / 4,000), and §4's claim that "the median star spacing is 7 px on the arms" at 0.86 px per unit. Both are noted in the `BG` doc comment.
- **Interface change.** `generateBackground(seed, tier, hood)` now takes the neighbourhood's star spots instead of `hoodCentroid`. `Galaxy.hoodCentroid` stays. `BG.hoodExclusion` and `BG.hoodLeak` are removed.
- **New exports:**
  - `GALAXY_WIDE`
  - `TIER_SCREEN`
  - `HALO_PX`
  - `HALO_MARGIN`
  - `PLACE_ATTEMPTS`
  - `galaxyWidePxPerUnit`
- **Caveat.** A landscape phone (844×390) is phone tier but sees 0.84 px per unit at the galaxy wide. Its halos are a little tighter than on the portrait probe.

### 2. Pieces never touch, so Task 2's intersection test will pass

- **Planets.** For neighbouring planets i < j (by orbit), `fitSystem` keeps `a_j(1 − e_j) − a_i(1 + e_i) ≥ max(R_i + R_j + max(ms_i, ms_j), reach_i + reach_j) + 0.15`.
  - That is the ruling's inequality, plus the moon systems kept apart as well.
  - The first piece clears the star (R 0.9) by its reach + 0.15.
  - `ms` is the moon system's radius (outermost track apoapsis + largest moon on it, 0 if bare), and `reach = max(R, ms)`.
  - A body on the outer ellipse is never nearer the star than its periapsis, so this holds at any precession or tilt.
- **Moons.** The moons of a track now share one ellipse, so they cannot drift into each other under different precessions. Their phases stay evenly spaced.
  - Each track sits at `MOON_TRACK[t]·R` or, where that is too close, just far enough out that its periapsis clears the planet (or the inner track's apoapsis plus its largest moon) by the track's largest moon + 0.05 R.
  - The margin is 0.05 R, not 0.15, because 0.15 is half a planet radius; at a moon's scale it would push every track outward.
  - Tracks reach up to 4.6 R for big moons. N0's three tracks are pushed past 1.3, 1.9 and 2.5 R by the wheels.
- **Fitting within 9.6.** A system that does not fit gives way as little as it must, in this order:
  1. Its eccentricities ease together toward the band's floor of 0.05, staying in §12.1's band.
  2. Its outermost filler slots are dropped, retrying step 1 each time, down to its scripted count (never under 2).
  3. A system of only the story's planets lets its designed spacing go (only the 2.2 floor stays) and its eccentricities fall below the band toward circles.
  4. Moons the story does not pin are dropped, widest piece first.
- **I did not follow the literal "clamp counts first".** I eased eccentricity first because the literal order drops many more planets:
  - about 11,400 filler slots over 300 seeds
  - P5 could not fit at all on 29 of 300 seeds, because the designed floors pinned its last orbit at 9.6
- **How often it gives way** (300 seeds, 9,000 systems):
  - eccentricities eased in 4,540 systems
  - 7,510 filler slots dropped (25 per galaxy, about 18 % of the drawn slots)
  - 459 systems flattened below the band: P5 on every seed, plus 159 others of only scripted planets
  - 1,410 unpinned moons dropped
  - planets per star: 2: 2,375 · 3: 1,700 · 4: 2,439 · 5: 1,940 · 6: 241 · 7: 5 · 8: 0 · 9: 300 (P5 only)
- **The rule effectively caps a system at about 6 planets with §12.1's eccentricities.** Only P5 holds 9, on near-circles.
- **MOTE_SEED:**
  - 20 systems eased, 24 slots dropped
  - P5 flattened, with 7 of its visits' moons dropped
  - 114 planets and 138 moons; 66,516 motes (was 73,560)
  - filler bare share 0.453
- **Tests.** `generate.test.ts` "keeps every piece clear of its neighbours at any precession or tilt, over many seeds" checks every inequality above on MOTE_SEED (desktop) and seeds 2–300 (phone). That covers the planets' (ruling's and pieces'), star–first planet, every planet's apoapsis ≤ 9.6, and the tracks'. It takes about 9 s. The N0 and track-spacing tests now check that tracks are at least their designed radius and that a track's moons share one ellipse.

### 3, 5. Accepted as built.

### 4. No hole in the core

- The 50-unit exclusion disc is gone. Only the 16-unit core exclusion remains, for stars and dust.
- The neighbourhood is protected only by halo clearance round each of its 30 stars, about 6–7 units on a phone.
- **Core stars are placed in rings.**
  - They fill rings of 72 in turn, inner to outer.
  - Each ring takes its share of the radial law and gives its stars evenly spaced bearings, jittered ±0.25 slot, at random radii within the ring.
  - So every part of the core is filled all the way round, with no spiral or grid pattern.
  - If a neighbourhood halo covers a core star's slot, that star takes any bearing in its ring.
- **Test.** "leaves no hole in the core" checks that no 10° sector between 16 and 40 holds fewer than half the median sector's stars. It runs on both tiers, on MOTE_SEED through `generateGalaxy` and on seed 2.
  - Measured minimum against median: phone 1 vs 2, desktop 6–7 vs 9.
  - The phone has only about 70 stars inside radius 40, so its margin is thin, but the ring stratification bounds the largest gap in ring 0 at 7.5°.

### Results

- `npm run typecheck && npm test`: 71 files, 1595 passed.
- `npx vitest run src/galaxy`: 45 passed.
- Full e2e (`npm run build`, then `E2E_PORT=4199 npm run e2e` on HEAD `074d93f`): 147 passed and 9 skipped in 23.6 min, exit 0. No background processes were left.

## Fix round 2

Commit: `29f75cf` galaxy: keep the full background and make its stars crisp points instead.

- **The counts are back to the spec's:** `BG.stars` is phone 2,400 and desktop 4,000.
- **Halos apart now comes from smaller sprite caps.** `HALO_PX` is star 2 px (was 3.5), bright 3 px (was 6), and neighbourhood glow floor 5 px (unchanged). A background star is now a crisp 2 px point with at most a 1 px halo.
  - The generator spaces stars by these caps as before: first clear draw, else the roomiest of 64, with a hard clearance round the neighbourhood's stars.
- **Caps tried** (planar measure, seeds 1–4, full counts):

  | Cap (star / bright) | Phone | Desktop |
  |---|---|---|
  | 2 / 3 px | 99.1–99.4 % | 100 % |
  | 1.5 / 2.5 px | 100 % | 100 % |
  | 1.5 / 2 px | 100 % | 100 % |
  | 1.25 / 2 px | 100 % | 100 % |

  I chose 2 / 3 px, the largest of these that still passes with a clear margin.
- **Pass rates with the test exactly as written** (real camera through `portraitRig`, both sizes, the neighbourhood's stars counted as neighbours):
  - phone, MOTE_SEED with the neighbourhood: 98.96 %
  - phone, seeds 2–5: 98.88 %, 99.04 %, 99.17 %, 98.92 %
  - desktop, MOTE_SEED with the neighbourhood: 99.52 %
  - desktop, seeds 2–5: 99.22 %, 99.52 %, 99.35 %, 99.60 %
  - no background halo touches a neighbourhood star's
- **Doc comment.** The `BG` doc comment no longer says the counts supersede §2.1. It keeps the note that §4's 7 px median spacing cannot hold, and the removal of the neighbourhood exclusion.
  - The `HALO_PX` doc says where the glow lives instead: the core haze, the neighbourhood's stars and nearer stars.
  - This supersedes the plan's Global Constraint figures for background sprites (3.5 px, and 6 px for the brightest 15 %). Tasks 5 and 6 should draw background stars at `HALO_PX` and keep the neighbourhood and core glows as specified.
- **Everything else from round 1 is unchanged:**
  - eccentricity easing before dropping slots
  - pieces never touching
  - core rings
  - the 16-unit core exclusion only
- **Results:**
  - `npm run typecheck && npm test`: 71 files, 1595 passed.
  - Full e2e (`npm run build`, then `E2E_PORT=4199 npm run e2e` on HEAD `29f75cf`).
    - First run: 146 passed, 9 skipped, 1 failed. The failure was `e2e/spikes.spec.ts` "index lists every spike in sentence case": a 30 s timeout while Playwright set up the browser context (`browser.newContext`), on a page this task does not touch. That spec file then passed alone, 9 of 9.
    - Full rerun: 147 passed and 9 skipped in 23.4 min, exit 0. No background processes were left.

## Fix round 3

Commits: `054ebde` galaxy: budget every instance drawn, size the neighbourhood glow by distance, one seeded stream · `bf44c97` plan: the background sprite caps, the background and stream interfaces, and the budget as built. Both sit on top of `29f75cf`; no history was rewritten.

### 1. Budget (Important 1)

- **Everything the renderer draws is now counted.** `fitBudget` sums every set the plan's Task 5 test counts, exposes the result as `Galaxy.instances`, and sets `Galaxy.motes = instances.total`. The sets are:
  - `shells` (Σ `latticeCount`) and `persons`
  - `tracks`: 90 per planet orbit (`TRACK_DOTS`), plus 40 per moon track in use. Since round 1 a track's moons share one ellipse, so one dotted track per used track is what Task 5 will draw. The plan's line now reads `40·moon tracks`.
  - `bodies`: one per body, plus a ghost per planet or moon that carries the defect
  - `glow`: stars plus core bodies
  - `streams`: `streamDots` per stream, the most dots it can need. That is its longest chord over any ambient (the distance between the two systems' fixed spots plus each end's apoapsis round its star), one dot per 1.2 units, clamped to [6, 40]. The feed is counted at 40.
- **The fit.** Orbits, tracks, bodies, glow and streams are fixed by the layout. The shells and person sets take what is left, through the same thinning order as before: unnamed shells first, the hero, core and star lattices last.
- **New test: "fits everything it draws in the budget".** A test-side function, `drawnInstances`, recomputes the sum independently from the bodies and streams. The test runs it on MOTE_SEED (desktop) and seeds 1–20 (phone), and asserts the sum is ≤ 76,000 and equals `Galaxy.motes` and `instances.total`.
  - **RED.** The same function run against a copy of HEAD `29f75cf` gives 84,098 on MOTE_SEED, which fails at ≤ 76,000. The old `motes` (shells plus persons only) was 66,516 there.
- **New totals on MOTE_SEED (desktop):**

  | Set | Instances |
  |---|---|
  | shells | 56,722 |
  | persons | 1,585 |
  | tracks | 14,780 |
  | bodies | 351 |
  | glow | 36 |
  | streams | 2,415 |
  | **total** | **75,889** |

  - Seeds 2–20 run from 75,327 to 75,999.
- **What gave:**
  - **Filler planet and moon lattices.** On MOTE_SEED, the columns of the planets other than C1 sum to 0.85 of full (about 0.72 of the area). Over seeds 1–20 the ratio runs 0.79–1.00.
  - **Not given:** C1 keeps its 6,116 motes, and the core and star lattices are untouched on every seed checked.
  - **Track dots** fall by one per moon that shares a track with another (MOTE_SEED: 14,780 instead of the plan's per-moon 15,780).
  - **Not touched:** no filler planet was dropped for the budget, and the planet and star counts are unchanged.
- **Tests adjusted.** The lattice test now checks thinned-but-bounded lattices, not exact ones. The hero and named lattices are still exact.

### 2. Desktop halo (Important 2)

- **One glow function.** `glowPx(R, d, focalPx, cap)` (`clamp(5 R focal / d, 5, cap)`) and `GLOW_CAP` (18 / 24) are exported from `src/galaxy/body.ts`.
- **Galaxy-wide helpers.** `galaxyWideView(w, h)` returns the camera position, focal length and px per unit at the galaxy wide, with the portrait reframe. `hoodGlowPx(tier, spot)` gives a neighbourhood star's glow there.
  - On the phone the glow is 5 px. On the desktop it is 8.69 px, from focal 1,236.4 px at 640.
- **The fix.** The background's hard clearance from each neighbourhood star and the test's `hoodApart` both use that per-star glow now.
- **Results.** On MOTE_SEED desktop, no background halo touches a neighbourhood glow (the 5 that did are gone). Pass rates with the real camera:

  | Tier | MOTE_SEED with neighbourhood | Seeds 2–5 |
  |---|---|---|
  | Phone | 98.62 % | 98.88 / 99.54 / 99.08 / 98.83 % |
  | Desktop | 99.35 % | 99.62 / 99.60 / 99.32 / 99.55 % |

- **Doc and plan.** The `HALO_PX` doc no longer claims a 5 px floor. Task 5's `glowPx` in the plan is now a re-export of this one, with `lod.glsl` mirroring it.

### 3. Duplication (Important 3)

- **One stream.** `seededStream(seed, salt, key)`, with the drop-the-first-output workaround documented once, lives in `src/math/hash.ts` beside `mulberry32`, with tests.
- **One salt registry.** `src/galaxy/seeds.ts` holds `STREAM_SALT` and `streamFor` for the generator and the background, with a uniqueness test.
  - The background's salts moved off the generator's (8–11), so its draws changed. The tests re-measure them.
  - The generator's streams are bit-identical to before.
- **One bisection.** `fitBudget` uses `largestFit`. The second copy is gone.

### 4. Rulings applied

- **Plan amended** (`docs/superpowers/plans/2026-10-08-act-2-galaxy.md`):
  - the Global Constraints' sprite figures (2 / 3 px background, `glowPx` for the rest)
  - Review Focus 1's DPR example
  - the Task 1 interface lines: `BG` without the exclusion fields; `Background` with the warm encoding; `HALO_PX`, `galaxyWideView` and `hoodGlowPx`; `generateBackground(seed, tier, hood)`; `Stream.bowBearing`; `Galaxy.instances` and `Galaxy.fit`; `GalaxyInstances`, `TRACK_DOTS`, `STREAM_PITCH`, `STREAM_DOTS` and `streamDots`
  - Task 2's streams texel (`bowBearing`)
  - Task 5: `PX.bgStar 2`, `brightStar 3`, `glowPx` as a re-export, 40 per moon track in use, the budget as `Galaxy.instances.total`, and the DPR-3 width check at 3 × 3 + 2
  - Task 6: the builder's bow is `STREAM_BOW`·chord toward `bowBearing`
- **Plan constraints amended** (`plan-constraints.md`): the same Global Constraints figures. That file is not tracked by git; it is edited in place.
- **Encodings documented** in the exported types:
  - `Background`: a negative brightness is a warm star (already in its doc).
  - `Stream.bow` is renamed `bowBearing`, documented as a direction in [0, 2π), with the bow's size the renderer's fixed share of the chord. No magnitude field is needed, because Task 6's `STREAM_BOW` is global.
- **C7's birth order is fixed.** C7 is now born at 0.327, once P3 (born 0.31) is half built at 0.325, instead of the stacks network's 0.3.
  - The lineage comment says why, and names N0 as the only piece born before its plan.
  - The "fills every slot" test now holds every planet except N0 to its host's half-build.
  - Nothing else moves. The twelve's span, the hop-3 sweep order (C7 at 0.327 before C9 at 0.335) and R1's birth from C7 at 0.39 all still hold, and the tests pass.

### 5. Minors

- **Taken:**
  - 1: C7, above.
  - 2: a test holds every planet's eccentricity in [0.05, 0.22] outside the flattened systems, and every moon's in [0.05, 0.12].
  - 3: `Galaxy.fit` keeps the `FitCounts`, with the flattened stars' ids, so the 300-seed numbers can be reproduced.
  - 7: `?? null` instead of `!` on `hiAt`, `fixAt` and `hop`.
- **Left:**
  - 4: the sector test stays at 16–40 only.
  - 5: `wideProjector`'s own pose is fine near overhead.
  - 6: engine bit-identity is a note for the parity tasks.
  - 8: the file split. `generate.ts` is now about 1,050 lines; I'm reporting it, not restructuring on my own.
  - 9: the flaky spikes test is unrelated, and still to be tracked.
  - 10: the 300-seed test stays as ruled in round 1. With the 20-seed budget test the generator file now takes about 25 s.

### Results

- `npm run typecheck && npm test`: 72 files, 1600 passed.
- Full e2e (`npm run build`, then `E2E_PORT=4199 npm run e2e` on HEAD `bf44c97`): 147 passed and 9 skipped in 24.3 min, exit 0. No background processes were left.
