# Task 6 report: `strandbeest` mechanism

Worktree `/home/user/mow-strandbeest`, branch `mech-strandbeest` (base f3421f1). E2E port 4175. Commit: 905ad1e feat: strandbeest mechanism.

## What I implemented

`src/mechanisms/strandbeest/`:

- `kinematics.ts`: one Jansen leg in Jansen units (crank throw 15).
  - `JANSEN` = the published lengths a=38, b=41.5, c=39.3, d=40.1, e=55.8, f=39.4, g=36.7, h=65.7, i=49, j=50, k=61.9, l=7.8, m=15. Source of the numbers: Wikipedia, "Jansen's linkage". I typed the numbers in myself and copied no prose or code.
  - Topology: crank axle O at the origin, frame pivot A = (−a, −l), crank pin C.
    - top: j from C, b from A
    - low: k from C, c from A
    - outer: the corner of the rigid upper triangle A–top–outer (d from A, e from top)
    - knee: f from outer, g from low
    - foot: the corner of the rigid foot triangle low–knee–foot (i from low, h from knee)

    I settled the length-to-joint assignment and the branch signs numerically, not by copying a figure. I searched all 8 assignments × 32 branch choices. Only this one holds every length with no clamping and gives a flat ground stroke (0.0046 of stride, against at least 0.012 for every other candidate).
  - `intersectCircles(c0, r0, c1, r1, side)`: circle–circle intersection on a fixed side of c0→c1. When the circles don't meet (too far apart, or one inside the other) it returns the point of circle 0 nearest circle 1. Link c0 keeps its length and link c1 misses by the least amount it can. Coincident centres give a finite point. It never returns NaN (Review Focus 3).
  - Only top, low and knee are intersected. The two triangles are rigid, so they are placed by rotating their reference shape. Each intersection keeps one `BRANCH` side for the whole cycle, so the leg never flips between assembly modes.
  - `solveMirrored` gives the +x leg on the same pin: the reflection of the plain solve at π − θ. Both feet push the same way.
  - `TWIN` is the same 13 numbers with b=46.6, e=47, g=42.3, j=43.8. I found it by a seeded random search. It solves with zero clamps over the full cycle at every stage of the morph from JANSEN (and 4% past it). The feet stay outboard and the stride stays similar (69 vs 68). The foot path loses its flat bottom: 0.145 vs 0.0046.
  - `groundFlatness(path)`: the vertical spread over the lowest third of the cycle (a cyclic window), divided by the stride.
- `shapes.ts`: part geometry as elements, sampled by area with `samplePart` and the shared primitives (`axle`, `ball`). The open unit tube (`CylinderGeometry`) is defined in this folder.
  - Round tubes between pivots.
  - Pivot discs (short cylinders along z).
  - Foot balls.

  A tube's twin runs between the twin's endpoints: the same samples, stretched along the tube and turned with it. Normals are radial, so they turn with the tube (`alongX` keeps in-plane tubes turning about z). Pivots and balls translate.
- `index.ts`: the machine.
  - Layout: four crank throws on one crankshaft, phases [0, ½, ¼, ¾] of a turn. Each throw drives a mirrored pair of legs, eight legs in total. Two to four feet are on the ground at every moment (tested).
  - Each leg has 6 parts: j, k, upper triangle, c, f, and the foot triangle ("shin"). Its bars sit in three planes. There are also 4 crank arms (hub, arm, and a pin through both legs' j/k planes), the crankshaft, a frame and 8 feet: 62 parts in all.
  - The frame is two rails through the A pivots plus V cross-members to the crank bearing, between the throws.
  - Roles:
    - **Core**: the front crank arm plus the front +x leg's six links. That is the "holy numbers" leg. It is built 1.4× heavier, so its 30% of the points is less white-hot.
    - **Body**: the other seven legs, three cranks, the crankshaft and the frame (65%).
    - **Drift**: the 8 feet (3.5%).
  - Scale is 0.018 world per Jansen unit, about 3.9 × 2.3 × 2.1. The whole anchor radius is 2.28.
  - The machine is turned −0.25 rad about y (`YAW`). The legs still face +z, toward the key light, but slanted, so a three-quarter view looks along the spine rather than through it.
  - `pose`: solve 8 legs. Each part is placed at its `from` joint, pointing at its `to` joint. The pose uses the lengths and triangle shapes the morphed parts actually have at `variant` (a lerp of correct and twin). That keeps every bar end on its joint mid-morph (tested at variants 0, 0.5 and 1).
  - Body ride height: the machine is raised or lowered so its lowest foot stays on a level ground (`lift`). The bob is 0.08 Jansen units for Jansen's lengths and 5.7 for the twin, so the twin's body visibly bobs ("legs flail and lift the body").
  - Faults:
    - `ratio`: the crank throw the legs feel grows by up to +60%. The pin rides off the end of the arm and the stride overshoots the ghost (more than 1.15× at 0.5). Above ratio ≈ 0.13 (throw > 16.2) the lower rocker can't close for part of the turn (C comes within |k − c| of A), so it clamps there. At full ratio that is visible as stretched or detached bars.
    - `slip`: the rear throws lose phase on the shaft in jerks twice a turn; the reference throw holds.
    - `stall`: periodic halt, then catch-up.
    - `bind`: the gait drags at certain angles.
    - `misalign`: the legs splay out of their planes. They turn about a cross axis through the frame pivot, with neighbouring throws and the two sides leaning opposite ways.
    - `jitter`: tremor, as in gears.
  - `explodedOffset`s are modest for the core (≤ 0.8). Body legs fly outward along their side and their throw.
  - `label = 'Strandbeest'`, `blurb = 'A Theo Jansen walking machine whose gait comes entirely from thirteen link lengths.'`
- `src/mechanisms/index.ts`: one import plus the `strandbeest` key, alphabetical.
- `e2e/mech-strandbeest.shots.spec.ts`: SHOTS-gated three-quarter shots `shots/mech-strandbeest-{assembled,twin,exploded-0.75,faults-0.6}.png` at camera [1.6, 1.1, 2.4]. It also takes one shot per fault at 1.0 over the ghost (`fault-<k>`) for review.

## Tests

- `kinematics.test.ts` (12 tests):
  - Circle intersection on the requested side.
  - Clamps to the nearest point of circle 0 in the far-apart, 1-inside-0 and 0-inside-1 cases.
  - Finite for coincident centres and zero radii.
  - All 11 link lengths (plus the crank) held over 720 steps with zero clamps.
  - Branch signs constant and joints continuous (no flips).
  - **Flatness**: Jansen < 0.01, twin > 0.1, twin > 20× Jansen. Measured 0.0046 vs 0.145.
  - Ground share over 35% and foot clearance over 15.
  - Twin = 4 changed numbers, solvable at every morph stage.
  - The mirror leg pushes the same way.
  - Throw 24 (out of range): clamps, everything finite, and the clamped joints keep their first link.
- `index.test.ts` (22 tests):
  - Roles and counts.
  - Core share 0.30, drift 0.035. Point density: core 2.6× body, and no part denser than about the core.
  - Envelope radius between 2 and 2.6, centred. The core sits front and +x.
  - Every bar and triangle end lands on its solved joint, and crank pins match, at variants 0, 0.5 and 1.
  - 2 to 4 feet down.
  - Level ride vs twin bob.
  - Reference foot world-path flatness: correct vs twin.
  - **Extreme ratio** (ratio 1 with all other faults at 1, and ratio 4): every transform finite, and clamps actually exercised.
  - Ratio over-stride.
  - Slip keeps throw 0 and moves throw 3.
  - Misalign moves the feet out of plane but not the crankshaft.
  - Stall halts.
  - Every fault at 1 on the twin stays finite.
  - Tube samples lie on the tube for both variants, with radial normals that turn with it.
  - Pivot twin is a translation.
- The contract test and the keyframes framing test now also run over strandbeest. The framing test caught the first crank arm (1.7 m): its tip poked left of the text panel at spec local 0.9 (NDC −0.127). I shortened it to 1.15 m (now −0.081 at worst).

Runs:
- `npm run typecheck`: clean.
- `npm test`: 28 files, 287 tests passed.
- `E2E_PORT=4175 npx playwright test e2e/parity.spec.ts e2e/looks.spec.ts --workers=1`: 11 passed. Strandbeest: warm core / cool body, vibed, ghost, lit front > back, misallocated.
- `E2E_PORT=4175 npx playwright test --workers=1` (full e2e): 40 passed in 9.2m, exit 0. The SHOTS-gated specs were skipped.
- `SHOTS=1 E2E_PORT=4175 npx playwright test e2e/mech-strandbeest.shots.spec.ts`: 1 passed.

## TDD evidence

The tests came after a numeric exploration of the linkage (branch and topology search, twin search, phase search, in scratch scripts). So the RED evidence is a mutation check, not a test-first run:

- **RED**: I removed the clamp in `intersectCircles` (the `along` clamping and the `Math.max(0, …)`). Then `npx vitest run src/mechanisms/strandbeest/kinematics.test.ts` failed 5 tests: the three clamp cases ("clamps to the point of circle 0 nearest circle 1 …"), "stays finite for coincident centres and zero radii", and "a crank throw pushed past what the linkage can reach clamps instead of producing NaN" (NaN joints). That is what I expected: without the clamp, the out-of-range sqrt goes NaN.
- **GREEN**: with the clamp restored, the same command passed all 12 tests.
- A real RED from the shared suite: `keyframes.test.ts › frames the whole assembled strandbeest core …` failed with `expected -0.1274 to be greater than -0.12` (crank arm too long). It passed after the fix.

## Screenshots (looked at, described honestly)

- **assembled**: The core leg is in front: a heavy amber-edged, mostly near-white leg showing the upper triangle, the foot triangle and the long j/k links. Seven blue legs recede behind and to the right, with ball feet along the bottom and the crankshaft/rail line through the middle. It reads as a legged lattice machine. At this static frame, "walking machine" comes more from the ball feet in a row and the repeated leg pattern than from an obvious gait. The eight legs overlap a lot from this angle, which is what a real eight-legged Strandbeest looks like too, but it is busy. **The core is clearly distinguishable**, but it is mostly white with an amber rim rather than warm amber (additive saturation; same "near-white core" issue as the gears crank, deferred to Task 9 per progress notes). The looks test's amber count passes.
- **twin**: The same machine with visibly different legs. The front leg is longer and narrower, a kite-shaped foot triangle with the foot hanging lower and further in, and the other legs' feet are spread differently. It reads as a plausible, polished variant, not a broken one. The flail itself (foot path, body bob) shows in motion, not in one frame.
- **exploded-0.75**: The core leg is nearly assembled in front. The body legs are pulled apart and outward into a loose blue lattice, feet float below, and wandering motes speckle the stage. Not blown out.
- **faults-0.6**: Every fault at once is a mess. Drift streams blue motes off to the upper right, jitter and drift blur the core into a white–amber smear, and the white ghost dots show the intended legs behind. It reads as a malfunctioning machine, but no individual fault is identifiable in this combined shot.
- **Per-fault shots at 1.0 over the ghost** (`shots/mech-strandbeest-fault-*.png`):
  - ratio: the legs over-stride and stretch away from the ghost, with bars visibly off their pins.
  - misalign: the legs lean out of their planes, so white ghost legs separate from the blue ones.
  - slip: the rear legs are out of phase with their ghosts while the front leg matches.
  - bind and stall: the legs lag their ghosts.

  Each reads as divergence from the ghost.
- Nothing is too sparse. The densest areas are the core leg and its pivots.

## Files changed

- `src/mechanisms/strandbeest/index.ts` (new)
- `src/mechanisms/strandbeest/kinematics.ts` (new)
- `src/mechanisms/strandbeest/shapes.ts` (new)
- `src/mechanisms/strandbeest/index.test.ts` (new)
- `src/mechanisms/strandbeest/kinematics.test.ts` (new)
- `src/mechanisms/index.ts` (one registration line plus an import)
- `e2e/mech-strandbeest.shots.spec.ts` (new)

I edited nothing outside the allowed list. `src/shapes/*` and CREDITS.md are untouched.

## For CREDITS.md (controller)

- Inspired by: Theo Jansen, *Strandbeest*. The Jansen linkage's 13 link lengths come from Wikipedia, "Jansen's linkage" (numbers only, no text or code). No code was ported from anywhere. The circle–circle intersection, nearest-point clamp, foot-path flatness metric and twin search are my own.

## Self-review and concerns

1. **Core brightness.** I spread the core across thicker bars (girth 1.4), and its density is now 2.6× the body's. It still saturates to near-white in the middle, with amber at the rims. This is the same global exposure item already deferred to Task 9.
2. **Three-quarter readability.** Eight legs from [1.6, 1.1, 2.4] form a dense lattice. I spread the throws along the spine (gap 32 Jansen units) and added a −0.25 rad yaw (`YAW`), so the leg rows recede and the core leg faces the camera. If the essay's camera keys need a cleaner silhouette, the cheap levers are fewer legs (`STATION_PHASES` with 3 entries gives 6 legs, still 2 to 3 feet down), a larger yaw, or thinner body bars.
3. **The yaw is a design choice.** "Machines face +z" still holds (normals at 14° off +z, lit-front > lit-back passes). A reviewer may prefer the machine axis-aligned; that is a one-constant change, and the tests un-yaw explicitly.
4. **The ratio fault is out of range almost immediately.** Jansen's m = 15 sits close to the lower rocker's limit (m < 16.2), so any ratio above about 0.13 clamps for part of the turn. That is deliberate, and it is what makes Review Focus 3 testable with a real fault. At high ratio, though, bars visibly detach at the clamp angles rather than just mis-stride.
5. **e2e connection errors were external.** On the first parallel run of parity + looks, two strandbeest looks tests got `net::ERR_CONNECTION_REFUSED` on :4175. The controller confirmed that another task killed every `vite preview` process at about 06:49 UTC. Both passed on the rerun.
6. **Purity.** `pose` is pure. The module-level state is constant tables: `RIDE` ride heights computed at load, and a geometry cache in `shapes.ts` keyed by size.
