# Task 1 review: the galaxy's pure model (3f70f70..29f75cf)

Reviewer: task-scoped gate. Binding constraints: `plan-constraints.md` (this plan). Read-only, except for probe scripts kept in the session scratchpad. One stray probe output file (`out2.txt`) briefly landed in the repo root and was moved out straight away; `git status` is clean.

### Spec Compliance
- ❌ **Issues found:**
  1. **The budget leaves out what the plan's budget test adds up.** `generate.ts:2204-2240` `fitBudget` (and `Galaxy.motes`, `generate.ts:1391`) counts only shells plus person sets. Task 5's "the galaxy keeps within its budget" test (plan l.613: Σ `net-*` instances ≤ `galaxyBudget(n)`) also counts `net-tracks` (90 per planet + 40 per moon, plan l.590), `net-bodies` (one per body) and `net-glow`. Measured (probe, phone tier, desktop budget):
     - MOTE_SEED: shells 64,869 + tracks 15,780 + bodies 288 + glow 36 = **80,973 > 76,000**
     - with the person sets (1,647) and about 2,284 stream dots: **≈ 84,900**
     - seeds 1–20: worst case **84,741** without persons or streams
     - spec §3.4's phone budget was ≈ 42k in total, including 6.4k of background
     
     `generate.test.ts:1215` "fits the budget" passes only because it checks the narrower sum. The named risk, "instance/mote counts within the spec's phone budget", is not met.
  2. **The "no background halo touches a neighbourhood star's" test uses the wrong glow on desktop.** `HALO_PX.hood = 5` (`background.ts:348`) assumes the neighbourhood stars' glow sits at its 5 px floor at the galaxy wide. On the desktop probe screen it does not:
     - The GC's `clamp(5·R·focal/d, 5, 18)` gives 5 × 0.9 × 1236.4 / 640 = **8.69 px** (focal 1236 px, ppu 1.93).
     - The generator's `nearHood` clearance (`background.ts:432-433`) and the test's `hoodApart` (`background.test.ts:95,104`) both use 5 px. So the test asserts a weaker property than §4's "no background star can touch one of the six (stars)".
     - Measured on MOTE_SEED desktop: the nearest background star is 5.28 px from a neighbourhood star, against a touching distance of (3 + 8.69)/2 = 5.85 px. **5 background halos touch a neighbourhood glow.**
     - The phone is fine: the glow is 5 px, the probe found 0 touches, and the nearest is 5.26 px.
     - The `HALO_PX` doc comment ("a neighbourhood star's glow is at its 5 px floor") is false for the desktop tier.
- ⚠️ **Cannot verify from the diff (for the controller):**
  - **HALO_PX 2 / 3 px against the binding GC 3.5 / 6 px.** This is ruled in the ledger (fix round 2), but `plan-constraints.md` ("No soft discs") and Task 5's planned `PX.bgStar: 3.5, brightStar: 6` (plan l.561) still say 3.5 / 6. The halos-apart guarantee holds only if Task 5 draws background stars at `HALO_PX`, so the constraint file and the Task 5 brief need amending. Spec §2.1 / §4 are author-approved figures: confirm that the author has ratified this, not only the controller.
  - **The interface drift is ruled but not yet reflected in the plan.** Plan l.172-177 still names `BG.hoodExclusion` / `BG.hoodLeak` and `generateBackground(seed, tier, hoodCentroid)`. The code (`background.ts:384`) takes the neighbourhood's star spots and has dropped those two fields. Amend the Task 5 brief, which consumes `Background`.
  - **The warm-star encoding is not in the plan.** A negative brightness means warm (`background.ts:300-304`, judgement call 3). Task 5's `createGalaxySystem` must read `abs(b)` and `b < 0`.
  - **`Stream.bow` semantics.** The code stores the bearing of the bow about the chord, in [0, 2π) (`generate.ts:1369`, judgement call 9). Task 6 (plan l.682) says "midpoint bowed by `bow`", which reads like a magnitude. Pin which one it is before Task 2/3 packs it into T1.
  - **The old generator's crack, hop, `hiAt` and sweep rules** (brief Step 6, "keep the old generator's rules") were not compared line by line against `src/network/generate.ts`. That is not a named risk. The tests do check the stated rules on the output.

### Named risks and the one check made for each
| Risk | Check | Result |
|---|---|---|
| Determinism | Grepped `src/galaxy/` for `Math.random`, `Date` and `performance`; looked for module-level mutable state; checked that sorts break ties | Clean: no hits, no shared state, every sort ends on a unique key. `generate.test.ts:872` deep-equals two runs, Float32Arrays included ✅ |
| Story pins on MOTE_SEED | Read the pin tests and ran a probe of P1–P3's `parents[0]` | R0 at (0,0,0); P1–P3 main parent R0 (probe; no test asserts it directly, only through `C1.rule`); P1 = C1–C4 by `G_TWELVE[1]`; P2 ⊇ C5, C6, C9; P3 ⊇ C8, C10, C7; C1 R 0.30, 6 moons, 6,116 motes; C5 R 0.30, 3 moons; N0 innermost on P_a with 7 moons; V1–V9 exactly on P5; lit set = TWELVE, C1 and R0 excluded ✅ |
| No-crossing test is real | Checked that the inequality is sufficient (distances to the star, triangle inequality in 3-D) and that the test is independent of `layOut` | Sufficient for every planet–planet, planet–moon and moon–moon pair at any tilt or precession, because `reach_i + reach_j` dominates every cross term. The test reads the generated `a` and `e` and recomputes `ms` at least as strictly as the code. With nominal radii and e up to 0.22 (periapsis 0.64 r) it would fail ✅ |
| Halos-apart test projects through the real camera | Read `portraitRig` (`src/scene/cameraRig.ts:48-57`) against `wideProjector` and `galaxyWidePxPerUnit` | Real rig, vertical-fov focal and a sync fence on ppu ✅. Not vacuous: 98.9–99.6 % against a threshold of 95 %, and it would fall to about 18 % at 3.5 / 6 px. **But the neighbourhood glow is mis-sized on desktop (Spec issue 2).** |
| Sector coverage | Read `background.test.ts:200-215` | Real, but it covers only the 16–40 annulus. The only thinning left is the per-star clearance discs, at radius 40–90 (Minor 4) |
| Budget | Probe of the Σ `net-*` instance sum | **Over (Spec issue 1)** |
| Exports | Compared against the brief's `Produces` block | Every name in the brief is present, with the same signatures, except `generateBackground`'s third parameter and `BG`'s two removed fields (ruled; ⚠️ above). Extra exports: `HOSTS`, `HERO_PLANET`, `HALO_PX`, `GALAXY_WIDE`, `TIER_SCREEN`, `ARM_PHASE`, `PLANET_MARGIN`, `MOON_MARGIN_SHARE`, `FitCounts`, … |

### Strengths
- `body.ts` has the brief's formulas verbatim and is tested at the band edges. `latticeCount` gives 6116 / 900 / 706 / 324 exactly.
- **Layout.** `fitSystem` and `layOut` turn the ruling's inequality into a constructive layout with a clear give-way order. It is tested over 300 seeds on the output, not on an internal value.
- **The pin tests are strong.** They check slot order, membership rows, the hops and sweep order, the twelve, moons sharing clocks with their planet, the stream kinds and the stream count. The pins are held over ten seeds.
- **Separate seeded streams.** Each concern has its own stream, so the tier changes only the background (tested), and the budget thins only shells, never the layout (tested at 60k and 30k).
- **The halos test is honest.** It projects through the real portrait rig, and it fences `galaxyWidePxPerUnit` against that projection.
- **The judgement calls are well documented.** The report is candid about every deviation.

### Issues

#### Critical
None.

#### Important
1. **The generator does not budget all the galaxy's instances** (`generate.ts:2204-2240`, `generate.test.ts:1215-1222`). The galaxy model needs about 81k–85k instances on MOTE_SEED, against the 76k cap. Task 5's planned budget test will fail. Fix:
   - Make `fitBudget` count everything the plan sums: track dots `90·planets + 40·moons`, body instances, glow, and either the stream dots or a stated reserve for them. Expose that number as `Galaxy.motes`, or as a second field the Task 5 test reads.
   - Thin to fit, or get a ruling that the cap covers shells only and amend plan l.613.
   - Extend "fits the budget" to the same sum.
2. **The neighbourhood glow is mis-sized at the desktop galaxy wide** (`background.ts:348`, `background.ts:432-433`, `background.test.ts:95,104`). Use the real glow, `clamp(5·STAR_R·focal/d, 5, 18)` for the tier's probe screen (8.69 px on desktop), in both the generator's `nearHood` clearance and the test's `hoodApart`. Fix the doc comment. On MOTE_SEED desktop, 5 background halos currently touch a neighbourhood glow.
3. **Two logic blocks are duplicated verbatim** (rubric: Important).
   - `rngFor`: `background.ts:368-373` and `generate.ts:1484-1489`. Both carry the same subtle drop-the-first-output bias workaround, which will drift if only one is changed.
   - The 40-step bisection: `largestFit` at `generate.ts:1714-1724`, and `largest` inside `fitBudget` at `generate.ts:2220-2229`.
   - Fix: put one `seededStream(seed, salt, key)` next to `mulberry32` in `src/math/hash.ts`, or in a galaxy-local util, and reuse `largestFit` in `fitBudget`.

#### Minor
1. **C7 is born before its host star** (`lineage.ts:2361`: C7 born 0.30; P3 born 0.31, half built at 0.325). Every other scripted planet except N0 is born after its host. The step-3 comment's invariant, "a slot's planet can be born once its star is half built" (`generate.ts:1897-1899`), is enforced for filler only. The test exempts scripted planets (`generate.test.ts:989`). It is plan-mandated: the hosts table plus the carried births. Name C7 as a deliberate exception beside N0, or get a ruling.
2. **No test asserts the generator's final planet eccentricities.** Nothing checks that every planet outside the flattened systems keeps `e ∈ [0.05, 0.22]` (§12.1). `orbits keep inside their bounds` tests only `orbitFor`. The easing in `fitSystem` should be tested to stay in the band.
3. **The fit counts are thrown away.** `FitCounts` is exported (`generate.ts:1699`) and `fit` is filled in (`generate.ts:1886`), but neither is returned or used. Either surface them, for example on `Galaxy`, so the reported 300-seed numbers can be reproduced, or drop them. The `HOOD_R_WIDE` fallback is never exercised by a test.
4. **The sector test covers 16–40 only** (`background.test.ts:200-215`). The neighbourhood thinning that is left, the hard clearance discs round each of the 30 stars, happens at radius 40–90 and has no coverage check. That gap is small, because each disc is about 2.7 units.
5. **`wideProjector` hand-rolls the camera pose** (`background.test.ts:64-81`). It uses bearing 0 only (fr-1 sweeps 0 → 40) and a pose convention of its own, rather than the app's pose function. Near overhead the nearest-neighbour distances do not depend on that rotation, so this is a robustness note, not a bug.
6. **Bit-identical only within one engine.** `Math.log`, `cos` and `exp` are not bit-specified across JS engines. Layout branches on float comparisons (`placeStars` score, `largestFit`, `nearHood`), so a different engine could in rare cases lay out a different galaxy. The tests run in Node only. This is a pre-existing pattern; note it for the parity tasks.
7. **Type-level lies.** `hiAt: d.hiAt!`, `fixAt: d.fixAt!` and `hop: d.hop!` (`generate.ts:2043-2045`) assert non-null on values that are legitimately null. They should be `?? null`.
8. **`generate.ts` is 983 lines** across births, slot drawing and fitting, placement, the defect rules, the sweep and the budget. The plan names one file, so this is noted only: the slot and fit logic is a natural split.
9. **Reported test noise.** In the first fix-round-2 e2e run, `e2e/spikes.spec.ts` "index lists every spike in sentence case" failed on a 30 s `browser.newContext` timeout and passed on rerun. It is unrelated to this task, but it is a flaky test and should be tracked.
10. **One test is slow.** "Keeps every piece clear… over many seeds" runs 300 full generations, about 9 s with a 120 s timeout. Consider fewer seeds in the unit suite.

### Assessment
**Task quality:** Needs fixes
**Reasoning:** The pure model is careful, deterministic and well tested on the story's pins and on the no-crossing rule. But the generator's budget leaves out about 16k track, body and glow instances that the plan's budget test counts, so MOTE_SEED needs about 81k against 76k. The halos-apart guarantee also uses a 5 px neighbourhood glow that is really 8.7 px on desktop, and 5 halos touch. Both need fixing, or an explicit ruling, before later tasks build on these numbers.
