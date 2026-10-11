
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
- Full e2e: see below.
