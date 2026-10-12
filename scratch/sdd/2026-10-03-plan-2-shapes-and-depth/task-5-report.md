# Task 5 report: `watch` mechanism

Status: DONE_WITH_CONCERNS (the concerns are about looks only; every test passes).
Branch `mech-watch`, worktree <mow-watch checkout>. Commit `14321b7 feat: watch mechanism`. Not pushed.

## What I built

`src/mechanisms/watch/`:
- `kinematics.ts`: pure escapement functions.
  - `clock(drive, faults)` gives the beat clock (8 beats per unit of drive, which is 4 oscillations) and an amplitude scale.
  - `escapement(drive, faults)` returns the balance, pallet, banking and escape angles.
  - `mesh()` relates the angles of two meshing wheels.
  - The balance is simple harmonic, amplitude 250°. The fork is engaged only while |balance| < LIFT (30°). It moves from one banking (±7°) to the other with a smoothstep. Over the same window the escape wheel advances half a tooth pitch.
  - The window is h = asin(LIFT / amplitude) / π beats wide, so the fork, the wheel and the balance stay in sync exactly, even when bind lowers the amplitude.
- `layout.ts`: all positions and gear data.
  - The escapement lies on one straight line of centres at -15°.
  - The pallet is at distance R/cos30° from the escape wheel, so the lines from the pallet arbor to the stones are tangent to the wheel.
  - The impulse-pin radius is FORK_PIN·sin(BANKING)/sin(LIFT), so the pin carries the notch through the banking angle.
  - Train positions are computed from the mesh distances: escape pinion 7 ↔ fourth wheel 40, fourth pinion 7 ↔ third 42, third pinion 8 ↔ centre 48, centre pinion 10 ↔ barrel 60. Wheels sit in two height layers (0.38 and 0.48) so wheels that overlap in plan never collide. The barrel is at 0.17, the bridges at 0.6, the balance at 0.7, the hairspring at 0.82 and the balance cock at 0.97. The plate's front face is at z = 0, and the machine faces +z.
  - The music-box twin layout is in the same file. Its governor-train positions are also computed from mesh distances in the yz plane.
- `geometry.ts`: shape helpers.
  - Convex hull of circles, used for the bridge outlines.
  - Crossing windows: the spoked wheel centres.
  - `clubToothOutline`: 15 club teeth whose locking faces lean forward.
  - `forkOutline`: the anchor with its lever, notch and horns.
  - `morph()`: samples the correct and twin solids separately with the same count, then pairs the points in order of a key (angle about the arbor, or x / z). The morph sweeps coherently instead of scattering.
  - `pairedTubes()`: samples a wire by arc length along one curve and pairs each point with the same (t, angle) on a second curve. It is used for hairspring ↔ worm.
- `shapes.ts`: per-part geometry for both variants. Teeth use `cycloidalGear` from src/shapes; extrusions and primitives also come from src/shapes. I did not edit src/shapes.
- `index.ts`:
  - 11 parts, the pose and samplePoints, plus `label = 'Watch movement'` and `blurb`.
  - Core weight is 0.26. Body: plate .296, barrel .123, centre .07, third .055, fourth .05, bridges .15. Core: escape .06, fork .03, balance .125, hairspring .035. Drift: jewels .006.
- Registered in `src/mechanisms/index.ts`: one import plus one key, `{ gears, watch }`.
- `e2e/mech-watch.shots.spec.ts`: gated on SHOTS=1. It writes `shots/mech-watch-{assembled,twin,exploded-0.75,faults-0.6}.png` from the three-quarter camera. The faults look also turns the ghost on, at 1.

### Parts and twin mapping

| part | role | watch | music-box twin |
|---|---|---|---|
| plate | body | round pillar plate, radius 2.3 | rounded-rectangle bedplate, 4.4 × 2.9 |
| barrel | body | toothed drum, 60 teeth | pinned cylinder (150 pins) with its great wheel, laid along x, turning steadily |
| centre / third / fourth wheels | body | cycloidal wheels with 5 or 4 crossings, plus pinions and arbors | the governor train: smaller cycloidal wheels standing on edge (axes along x) |
| bridges | body | barrel bridge, train bridge and pallet bridge (hulls), plus the balance cock | the steel comb: a slanted base with 18 graduated tines reaching under the cylinder |
| escape wheel | core | 15 club teeth, 5 crossings, with pinion | worm wheel (30 teeth, on edge) |
| pallet fork | core | anchor, lever, notch and horns, with two ruby stone slabs | governor cock: foot, post and arm over the fly arbor |
| balance | core | rim, 3 arms, 16 timing screws, roller and impulse pin, staff | the fly: 4 vanes pitched 45° on an upright arbor, spinning fast |
| hairspring | core | flat Archimedean spiral, 7 turns | upright worm (helix) on the fly arbor; same wire, paired along its length |
| jewels | drift | 6 pivot jewels on the bridges and cock | 6 bedplate screws |

### Kinematics

- **Watch:**
  - The escape wheel turns clockwise in eased half-pitch ticks.
  - The fourth, third, centre and barrel wheels are geared off the escape pinion with `mesh()`, so the train ticks in proportion. Their phases interleave the teeth.
  - The balance and the hairspring turn together about the staff. Rotating an Archimedean spiral looks like coiling and uncoiling.
- **Twin:** it runs on the same clock, so ratio and stall act on it too. The cylinder turns at 0.25 rev per unit of drive and the fly at about 5.3. These speeds are chosen to be readable, not taken from the tooth counts: true ratios would spin the fly at hundreds of revolutions per unit of drive.

One deviation from the controller's note: the note says "one tooth per half-swing". I used the horologically correct rule instead. The wheel advances half a pitch per beat (half-swing), so one tooth per balance period. The kinematics test pins exactly this.

### Faults (pose handles all but drift)

- `ratio`: the beat clock runs ×(1 + ratio), so the balance, the ticks and the whole train run fast against the ghost.
- `slip`: on every third beat two extra half-pitches get through. The escape wheel and train jump ahead in whole half-pitches.
- `stall`: the clock freezes at a swing extreme for part of every 4-beat cycle while the amplitude dies to about 18%. Then it hurries to catch up, as the spec's "periodic stop, then catch-up".
- `bind`: the amplitude collapses to 25% (62°, still above the lift, so the watch keeps ticking).
- `misalign`:
  - The fork backs 0.15 off the wheel, lifts 0.08 and rolls up to 0.6 rad about its lever, so the stones miss.
  - The escape wheel creeps past the pallets and wobbles on its arbor.
  - In the twin, the fly arbor wobbles.
- `jitter`: per-tick position tremor of ±0.025 on every part.
- In the twin, slip makes the worm wheel and fly lag in jerks, and bind slows the fly.

## Tests

- `kinematics.test.ts` (12 tests). It checks:
  - the amplitude is 250°;
  - **exactly one tooth per balance period, in two half-pitch ticks**;
  - the wheel is locked whenever |balance| > LIFT and moves inside the lift;
  - the fork sits on the banking opposite the swing outside the lift;
  - motion is continuous through ticks;
  - one test per fault: ratio gives more than 1.5× the ticks; slip leads by whole half-pitches; bind collapses the amplitude but keeps it above the lift; stall stands still for a share of the cycle and moves for the rest; misalign creeps;
  - `mesh` gives the ratio and direction, and leaves a gap on the line of centres.
- `index.test.ts` (11 tests). It checks:
  - weights and roles (core within 0.25–0.35);
  - the club outline has 30 radial extrema and leaning locking faces;
  - the hairspring maps to the worm point for point (inner coil to the bottom, outer coil to the top);
  - the barrel lies along x in the twin;
  - **locking**: at rest after even and odd beats, the right stone reaches inside the tips, the other clears them, and a tooth corner rests within 4° behind the locking stone;
  - **impulse-pin sync**: through the whole lift the pin stays inside the fork's notch, and beyond a quarter swing it is clear of the fork;
  - the fourth wheel turns 7/40 of an escape pitch per period;
  - **meshing**: the escape pinion and the fourth wheel do not overlap across ticks, and a control with the pinion shifted half a pitch does collide.
- Mutation checks (temporary, reverted):
  - ESCAPE_PHASE −28° → −16° fails the 3 locking tests.
  - Flipping the pallet sign fails 5 tests: the pallet-banking test in kinematics.test.ts, plus the locking and pin-sync tests.

### TDD evidence

- RED: `npx vitest run src/mechanisms/watch` with only kinematics.test.ts present gave `Test Files 1 failed (1) / Tests no tests`. The import of `./kinematics` did not resolve; the module did not exist yet.
- GREEN: the same command after writing kinematics.ts gave `Tests 12 passed (12)`.
- I wrote the geometry and escapement tests in index.test.ts after the module. I backed them with the mutation checks above, and the mesh test has a control case.

### Full runs

- `npx tsc --noEmit -p .`: clean.
- `npm test`: 28 files, 276 tests passed. That includes the contract test for watch and the keyframes framing and camera-continuity tests for watch.
- `E2E_PORT=4174 npx playwright test e2e/parity.spec.ts e2e/looks.spec.ts`: 11 passed. Parity covers every MECHANISM_ID; all 5 looks tests pass for watch (warm core, vibed, ghost, lit faces, misallocated).
- `SHOTS=1 E2E_PORT=4174 npx playwright test e2e/mech-watch.shots.spec.ts`: 1 passed.
- One timing note: the mesh test first timed out at 5 s under full-suite load. I restricted its grid to the sliver inside both tip circles; it is fast now.

## Screenshots (shots/, gitignored), honestly

- **assembled:** reads clearly as a watch movement from the three-quarter view.
  - Visible: the round plate (sparse blue disc), the big toothed barrel with its bridge, three spoked train wheels under the train bridge, the club-toothed escape wheel, and a large amber balance with arms, timing screws and a visible hairspring spiral, plus the balance cock.
  - The core is clearly warm and distinct.
  - The fork (anchor) is the weakest-reading core part. It is small and sits under the balance rim. It reads well head-on and in the exploded shot.
  - There is some white bloom at the balance hub, where the staff, the inner hairspring coils and the jewel overlap.
  - From a head-on camera (exploration shot) it is very legible: the barrel, spoked wheels, escape wheel, anchor with stones, and the balance with its spiral.
- **twin:** reads as a different, plausible machine.
  - Visible: a rectangular bedplate with screws, a long pinned cylinder, and gears standing on edge.
  - The amber 4-vane fly and the governor cock are visible.
  - Head-on (exploration shot) the comb with graduated tines is very clear.
  - From the three-quarter view the comb is less distinct: it sits under the cylinder.
  - **Concern:** a white hot spot at the fly's centre. The worm, the worm wheel seen near edge-on, and the arbor are all core parts in a small volume. I reduced it (larger worm and worm wheel, no fly hub, 4 pitched vanes in place of 2 edge-on vanes, which had made a white bar), but it remains.
- **exploded-0.75:** the parts are only slightly separated (offsets × 0.25) inside the unsettled dust field, the same as gears. The fork shows clearly between the escape wheel and the balance.
- **faults-0.6:** every fault at 0.6, including drift. Drift and jitter dominate, so the frame is a fuzzy, recognisable watch with a white-hot core region. Individual-fault exploration shots (core camera, with ghost) show the balance arms doubled against the ghost for ratio, stall and misalign, and the fork displaced for misalign. Faults are dynamic, so a still shows only the divergence.

## Concerns / notes for the controller

1. The twin's governor hot spot (above). If a Task 9 look pass finds it too bright, the options are:
   - lower the escape and balance weights;
   - spread the governor parts further apart;
   - accept it, since the twin is shown vibed (cool), so it reads as bright blue-white.
2. The plate is sparse: about 0.018 mean nearest-neighbour distance, against 0.0145 for the gears frame. The watch has more surface to cover with the same budget.
3. Twin speeds are visual, not tooth-ratio (documented in the code).
4. One tooth per balance period, not per half-swing (see Kinematics; it is horologically correct).
5. Minor internal surfaces, accepted for small areas:
   - the pallet stones overlap the ends of the fork arms;
   - the comb tine roots coincide with the base's side wall, which gives a brighter line along the slanted edge;
   - the bores coincide with the arbors, as in gears.
6. Arbors are thin (0.018) and the balance staff runs only from the roller to the cock. Seen end-on, thicker or longer rods piled motes into white dots.
7. The worktree had no prettier config; my files are formatted at 120 columns with single quotes, matching the gears style. The prettier hook warnings at 80 columns are noise.
8. The controller's heads-up about vite preview being killed around 06:49: none of my e2e runs failed. My shots run at about 06:50 passed, and later runs passed too.

## Licensing (for CREDITS.md)

No code was ported. The escapement geometry, club-tooth outline, Archimedean spiral and helix are textbook constructions, derived from scratch. The cycloidal teeth come from the existing src/shapes/involute.ts. The convex hull is the standard Andrew's monotone chain, also written from scratch. There are no new third-party sources.

## Files

- Created:
  - src/mechanisms/watch/{index,kinematics,layout,geometry,shapes}.ts
  - src/mechanisms/watch/{index,kinematics}.test.ts
  - e2e/mech-watch.shots.spec.ts
- Modified: src/mechanisms/index.ts (one import plus the `watch` key).

No background processes are left running; port 4174 is free.
