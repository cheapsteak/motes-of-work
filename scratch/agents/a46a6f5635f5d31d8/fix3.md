
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
- Full e2e: see below.
