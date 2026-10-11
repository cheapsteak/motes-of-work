# Task 1 re-review: fix round 3 (29f75cf..bf44c97)

Scoped to the prior findings and to new defects introduced by the fix. Read-only. The probe tree used for the RED check lives in the session scratchpad, outside the repo; `git status` is clean.

## Findings

| Finding | Resolved |
|---|---|
| Important 1: budget undercounted against the plan's Task 5 sum | **Yes** |
| Important 2: desktop neighbourhood glow radius in the halos-apart check | **Yes** |
| Important 3: duplicated `rngFor` and bisection | **Yes** |
| Ruling: HALO_PX 2 / 3 (plan and constraints amended) | **Yes** |
| Ruling: `Stream.bow` renamed | **Yes** |
| Ruling: C7 birth order | **Yes** |

## Evidence

**Important 1.**
- `fitBudget` (`generate.ts`) now counts the same sets the plan's Task 5 test sums: tracks (90 per planet, 40 per moon track in use), bodies plus a ghost per cracked planet or moon, glow, stream dots (`streamDots` per stream, plus the feed at 40), shells and persons. The shells and persons are thinned to `budget - fixed`. `Galaxy.motes` is `instances.total`.
- The new test `fits everything it draws in the budget` computes the sum with a test-side `drawnInstances` that reads `bodies` and `streams` and does not call `fitBudget`. It runs on MOTE_SEED (desktop) and seeds 1–20 (phone tier, desktop budget), and asserts `sum ≤ 76,000`, `motes === sum` and `instances.total === sum`.
- RED confirmed. I extracted `29f75cf` to the scratchpad, dropped in the `bf44c97` `generate.test.ts` and ran that test. It fails with `seed 1: expected 84098 to be less than or equal to 76000`, which matches the implementer's figure.
- GREEN confirmed. `npx vitest run src/galaxy src/math`: 7 files, 71 tests, all passed.
- The fix gives way where it said it would. Filler planet and moon lattices are thinned, and the core, star, hero and C1 (6116) lattices are asserted unchanged. No layout change.

**Important 2.**
- `glowPx(R, d, focal, cap)` and `GLOW_CAP` are now in `body.ts`, with a unit test (8.69 px for R 0.9, d 640, focal 1236.4).
- `hoodGlowPx(tier, spot)` uses the real per-star distance from the galaxy-wide camera, from `galaxyWideView` (which handles the portrait reframe). The generator's `nearHood` clearance and the grid cell size use `glows[k]` per star. The test's `hoodApart` uses `hoodGlowPx(tier, p)`.
- The `HALO_PX.hood` constant is gone, and the doc comment no longer claims a 5 px floor.
- The assertions `hoodGlowPx('phone') === 5` and `hoodGlowPx('desktop') ≈ 8.69` pin the sizes.
- The "keeps the halos apart" test, which includes `hoodApart` on both tiers, passes.

**Important 3.**
- `seededStream(seed, salt, key)` lives in `src/math/hash.ts`, with tests.
- `rngFor` in the generator is now an alias of `streamFor` in `seeds.ts`. The background's local copy is deleted. The formula is identical, with salts 1–7 unchanged, so the generator's streams are bit-identical.
- `fitBudget` calls `largestFit`. The second 40-step bisection is gone. `largestFit` adds a `fits(1)` short-circuit, which differs from the old loop only when the answer is 1.
- `STREAM_SALT` has a uniqueness test. The background's salts moved to 8–11, so its draws changed, and its tests re-measure them.

**Rulings.**
- HALO_PX: the code has `{ star: 2, bright: 3 }`. The plan's Global Constraints, Review Focus 1 (DPR example), Task 5's `PX` (`bgStar 2`, `brightStar 3`) and the DPR-3 width check (`3 × 3 + 2`) all agree. The untracked `plan-constraints.md` carries the same Global Constraints sentence verbatim. A grep finds no stray 3.5 / 6 px outside the deliberate "superseding §4" note and a code comment.
- `bow`: renamed to `bowBearing` in `Stream`, the generator, the test, the plan's `Stream` interface, the Task 2 texel layout (T1) and the Task 6 builder text, which now says `STREAM_BOW`·chord toward `bowBearing`. No `.bow` use is left in `src/galaxy`.
- C7 is born at 0.327 in `lineage.ts`. The comment names N0 as the only exception. The "fills every slot" test now exempts only N0. The full galaxy suite passes, so the hop-3 sweep order and R1's birth still hold. The plan has no stale C7 birth value.

## New Critical / Important findings
None.

## New Minor notes (no action needed before Task 2)
1. **Constants duplicated across modules.** `STREAM_PITCH` and `STREAM_DOTS` are now exported from `generate.ts`. The plan (Task 6, lines 656 and 678) also declares them in `src/scene/node/birth.ts`. When Task 6 lands, import one from the other, or add a set-equality fence. Otherwise the generator's budget and the renderer's dot count can drift apart silently.
2. **The lattice test is looser.** "Spaces the moons… sizes every shell" now checks only that a filler lattice is at most its full size and at least 3 × 6. It used to check equality. This follows from the budget change and is fine, but nothing pins how much thinning is allowed. `g.instances.shells` plus the "named lattices exact" assertions bound it in practice.
3. **`FitCounts.flattened` and `Galaxy.fit` are not in the plan's interface block.** `Galaxy.fit` is listed, but `FitCounts` is not defined there. Add it when Task 2 or 3 first reads it.
4. **Phone-tier budget.** The test keeps using the desktop budget for the phone tier, as before. The spec §3.4 phone budget of about 42k is not exercised. This is not part of the prior findings and is noted only.
