# Task 2 report: the bicycle mechanism

Status: DONE_WITH_CONCERNS. One shared e2e assertion fails for the bike: looks.spec "lit faces", details below. Everything else is green.

## What I built

- `src/mechanisms/bike/kinematics.ts` holds the geometry in metres. Rear axle at x 0. Wheelbase 1.05. BB 0.27 high. Chainstay 0.43. Seat tube at 73°. Head tube at 71° with its top at 0.85. Rake 0.045. Saddle top 0.73 up the seat-tube line. Crank 0.17. Chain pitch 12.7 mm, 44/16, chain line z 0.045. It also holds the maths:
  - `crankAngle`: `bind` drags the drive once a turn, amplitude 0.5, and the angle stays monotonic.
  - `wheelAngle`: 2.75 × crank. `ratio` adds +55%. `slip` gives a 20% lag plus a sawtooth jerk three times a turn. `stall` makes the wheels coast to a stop: `COAST·(1−e^(−θ/COAST))`, measured from drive 0.
  - `chainAdvance` (the chain follows the sprocket when it has dropped), `pedalCentre`, `steer`, `steerQuat`, `aboutHead`.
  - The chain path is two pitch-circle wraps plus their outer tangents, with `chainPoint`, `chainLength`, `SEGMENT_PITCH = L/24`.
  - `chainSag`: the dropped chain stays on the sprocket. Toward the chainring it falls by up to 0.12 m and its loop flattens.
  - `chainSegment`: each segment sits on the chord between its two pins, so neighbours share pins.
  - `GEARING`, `CHAIN_SEGMENTS`.
- `src/mechanisms/bike/shapes.ts` holds the `tube(a, b, radius)` helper and every part shape:
  - Wheels: torus tyre (0.34 outer, 0.03 section), rim 0.31, hub 0.025, 12 spokes laced to alternate flanges, and a spoke reflector (see below). The rear wheel carries its 16T involute sprocket.
  - Cranks: 44T chainring on a 5-arm spider, axle and both arms.
  - Chain link. Frame (diamond, stays, BB shell, brake bridge). Fork (steerer, headset cups, crown, blades).
  - Rim-brake calipers. Annular-sector mudguards. Saddle with seat post. Swept-back bars with grips, levers and bell. 0.10 × 0.07 pedals with spindles.
  - Loose bolts. Ground strip (single-sided, facing up).
- `src/mechanisms/bike/index.ts` holds `bike` (id `bike`), `label` ('Bicycle'), `blurb`, `partIndex`, `SCALE` = 2.25 (whole anchor radius 2.45), `CENTRE`, `GEARING`, `CHAIN_SEGMENTS`, `GROUND_SHARE`, `partDensities`.
  - The exact part ids and `settle` windows from the brief.
  - Steam's `PartSpec` area shares with `CORE_SHARE` 0.2. The ground has a fixed 2% of the body. Chain links have density 1.6; brakes and bolts 1.3.
  - The twin blends the two mounts (seat clamp and stem clamp) and each part's share of the steering, `steerQuat(a·v)` and `steerQuat(a·(1−v))`. No rotation blending. Shapes are unchanged.
  - Faults:
    - misalign: the front wheel tilts 0.12 rad in its own frame, so it wobbles.
    - slip, bind, ratio, stall: through the kinematics.
    - jitter: rattles the mudguards, brakes and the handlebars (bell), using hash ticks of drive. The ground never moves.
- Registered in `src/mechanisms/index.ts` (alphabetical, so `bike` is first) and `src/mechanisms/meta.ts`. `ACTIVE_MECHANISM` is still `gears`.
- Changes outside the bike folder, all caused by registering a fifth mechanism:
  - `src/compare/compare.css`: the picker is now one row for any count (`grid-auto-flow: column`). The 4-column grid wrapped five buttons onto a second row, and that pushed the single view to 740 px, past 720.
  - `e2e/compare.spec.ts`: two budget tests assumed the page opens on `MECHANISM_IDS[0]`. It opens on `ACTIVE_MECHANISM` (see compare.ts), so they now use that. With bike first they read "bike@30000" while the page showed gears.
- The keyframes framing test passed for the bike with the current camera keys. No keyframes.json change.
- CREDITS.md is unchanged: no external source is cited.

## Tests

- `npx tsc --noEmit -p .`: clean.
- `npx vitest run`: 42 files, 583 tests passed. That includes contract, anchors, continuity, the keyframes framing and continuity tests, and meta for the bike.
- `E2E_PORT=4191 npx playwright test e2e/compare.spec.ts`: 19 passed, after the picker and test fixes.
- `E2E_PORT=4191 npx playwright test e2e/parity.spec.ts e2e/looks.spec.ts`: 25 passed, 1 failed. The failure is bike › lit faces: front 849263 against back 770487, a ratio of 1.10, where the test wants more than 1.2.
- `SHOTS=1 E2E_PORT=4191 npx playwright test e2e/shots.spec.ts -g bike`: passed. 10 shots in shots/mech-bike-*.png.

## TDD evidence

- Shapes. RED: `npx vitest run src/mechanisms/bike/shapes.test.ts` failed because the module did not exist. GREEN: 22 passed. One real failure on the way: the handlebars had 24 open edges. Two cross-bar tubes met at the stem with coincident caps, so I made them one tube.
- Kinematics. RED: "TypeError: chainLength is not a function". GREEN: 13 passed. A test bug on the way: wrap checks used 3D distance against a z = 0 centre, so I switched them to side-view distance.
- Module. RED: "Cannot find module './index'". GREEN: 24 passed after two fixes:
  - SCALE 2.6 gave radius 2.83, so I moved it to 2.25.
  - The test compared `-0` to `0` in quaternions, so it now uses `transformDistance`.
- Reflector test: added with the change. Without the reflector it fails on "length > 0".

## What the index tests assert, measured

- Reach: saddle top to the pedal at the bottom of the stroke is 0.80–0.95 m, each grip is 0.45–0.75 m from the saddle and forward of it, and the grips are about 1.05 m high.
- Swap: exact, 0 m. The saddle turns with `steerQuat(steer(d))` at variant 1 and the handlebars stay at identity. In the twin still the saddle stands in front of and above both grips.
- Other parts: equal at variants 0, 0.5 and 1 over 7 drives.
- Faults: each fault at 1 moves some sampled point more than 0.05 world units, at drive 0.3 and 1.1.
- Stall: adjacent chain centres stay within 1.5 pitch, and the chain hangs more than 0.2 world units lower than the ghost.
- Shares: core 20%. Every part has at least 50 points at 30k and every chain link 37–38; the minimum outside the chain is loose-bolts at 137.
- Placement note: "pedals level" and "fork steers by steer(drive)" are pose-level checks, so they live in index.test.ts. kinematics.test.ts covers the pure halves: pedal centres on the crank ends, and `aboutHead` turning about the axis by the angle.

## Looking at the shots (shots/mech-bike-*.png, three-quarter, drive 0.3)

- **Reads as a bicycle at a glance?** Yes, clearly, from both the head-on looks shot and the three-quarter view. You can see the diamond frame, both spoked wheels with mudguards, chainring and chain, the swept-back bars, the saddle and the ground strip.
- **Twin obviously unrideable in a still?** Yes. The saddle sits high over the front wheel and the bars stick out of the seat tube behind it. It reads at once.
- **Core warm, not white?** Mostly. Pedals and handlebars read amber. The saddle top is a pale cream, close to white but still warm. That is from its large flat top lit by the key from above. If it should be more amber, drop CORE_SHARE toward 0.15.
- **Each fault** (ghost at 1 makes everything paler):
  - misalign: weak to moderate. Ghost spokes are visibly doubled beside the front wheel's spokes, but the tyre itself only looks slightly thicker. At the brief's 0.12 rad the buckle is subtle from this camera. Raising WOBBLE toward 0.18–0.2 would make it read.
  - slip and bind: read. Both wheels show doubled spokes. Under bind the pedals sit visibly off their ghosts too.
  - ratio: reads now. In the first run the 12-fold spokes had turned almost exactly one spoke pitch past the ghost and looked like it. I added a spoke reflector to each wheel, the steam flywheel's clock-face lesson, and moved the ratio gain from 0.6 to 0.55. The spokes now sit between the ghost's and the reflectors are visibly off their ghost positions.
  - stall: reads. A slack strand hangs from the chainring down toward the ground, and the reflectors and spokes are off their ghosts.
  - jitter: reads. The front mudguard is visibly displaced and fuzzed, and the rear mudguard and brakes are shifted.
- exploded-0.75: the wheels, cranks, chain and core have landed. The frame, mudguards and fork are still in flight as a haze, matching the staged settle windows.

## Self-review

- Pose is pure: no module state apart from the memoised geometry, as in steam. Jitter hashes a tick of drive.
- Twin blends parameters, never rotations.
- Normals: the twin uses the same shapes, and a test checks `localTwin`/`normalTwin` equal `local`/`normal`.
- Formatting matches the repo's prettier style: single quotes, width 120.
- The stall coast is anchored at drive 0, so the wheels "coast and stop" from the start of the drive. If a later story ramps `stall` up while drive is large, the wheels will visibly spin back toward the coasted angle during the ramp. Pure and continuous, but worth knowing for Task 3+ keyframes.

## Concerns

1. **looks.spec "lit faces" fails for the bike (ratio 1.10 against a threshold of 1.2).** I did not loosen the test. An offline model of the shader's shading predicts the bike at 1.10, matching the measurement. The cause is that the bike is almost all round tubes plus faces whose normals are perpendicular to z: mudguard bands, saddle top, pedal platforms, and handlebars running along z. The symmetric rim term lights these equally from front and back. The bike is also flat in z, so depth dimming barely helps. Even with the mudguards, saddle and pedals removed, the model gives 1.13. No honest tweak of these parts reaches 1.2. Options for the controller:
   - accept a per-mechanism threshold for the bike;
   - add large ±z plates a town bike really has: a chain case or skirt guard. These would muddy the chain the spec wants visible.
   - leave the bike out of this assertion.
2. misalign reads only moderately at the brief's 0.12 rad (see above).
3. Saddle top is cream rather than full amber (see above).
4. Two shared files changed because of the fifth registration: compare.css (picker row) and compare.spec.ts (active mechanism, not index 0).

---

## Fix report: controller rulings

### 1. Lit-faces floor (e2e/looks.spec.ts)

- `LIT_FLOOR` sets the bike to 1.05 and every other mechanism to 1.2.
- The doc comment gives the reason: a thin frame of round tubes, flat in z, whose big faces sit edge-on to both cameras, where the symmetric rim light treats front and back alike. The offline model of moteLight() gives 1.10, or 1.13 with those faces removed, and the measurement is 1.10.
- The comment also says broken lighting (about 1.0) still fails.
- No other threshold changed.
- I did not run prettier over looks.spec.ts: the file was not prettier-clean before my edit, so I kept its existing layout.

### 2. Misalign

`WOBBLE` goes from 0.12 to 0.18 rad. The test bounds change from tilt < 0.13 and max > 0.1 to tilt < 0.19 and max > 0.15.

### 3. Core warmth

- `CORE_SHARE` is 0.15, the floor of the tested range.
- At 0.15 alone the saddle top was still mostly cream. Pixel counts over the saddle in the three-quarter shot:

| Setting | Near-white px | Amber px | Mean RGB |
|---|---|---|---|
| 0.20 | 940 | 6 | 231,223,211 |
| 0.15 | 953 | 44 | 228,214,191 |
| 0.15 + saddle density 0.6 | 667 | 47 | 215,197,170 |

- So I also set the saddle's density to 0.6 within the core. Its broad top is lit square-on by the key, and its top and bottom faces stack in the view.
- Before/after: in the assembled three-quarter shot the saddle went from a near-white slab with a cream edge to a clearly amber saddle. It now matches the pedals and bars. The handlebars and pedals stay amber.
- The shares test still passes: core 15%, saddle above 50 points.

### 4. Stall is now periodic (kinematics.ts `coast`)

- Each crank turn, the wheels lurch ahead, coast to a stop over the first half of the turn (`STALL_COAST` 0.5, quadratic deceleration) and sit still. The cranks catch them up, and they are level with the cranks again at the end of the turn.
- In crank turns the coast curve is g(x) = 1 - (1 - x/0.5)^2, then 1. Since g(x) >= x, the stalled wheel never trails the unstalled one, so raising `stall` at any drive never runs the wheels backwards.
- Wheel angle is still `lerp(driven, 2.75 coast(theta), stall)`. The chain follows the sprocket, and the sag is still scaled by stall.
- This replaces the "anchored at drive 0" note under Self-review above, which no longer applies.
- Tests:
  - kinematics: over each turn the wheel never goes backwards, has more than 40 of 200 steps still, has a lurch faster than twice the normal step, and is level with 2.75 theta at whole turns. The lead repeats every turn (no drift). For drives 0.3, 1.7, 7.3 and 12.05 and stall from 0 to 1 in 0.01 steps, the wheel is never behind its unstalled angle.
  - index: at drive 7.3, raising stall in 200 and then 400 steps, the largest step of the rear reflector point halves (fine/coarse < 0.6) and stays below 0.15. The unwrapped turn against stall 0 never goes more than one spoke pitch (pi/6) backwards.
- RED: with the old coast, all three new or changed stall tests failed, and so did the misalign test once its bounds were raised. GREEN after the changes: bike tests 63/63.

### Re-run

- `npx tsc --noEmit -p .`: clean.
- `npx vitest run`: 42 files, 585 tests passed.
- `E2E_PORT=4191 npx playwright test e2e/parity.spec.ts e2e/looks.spec.ts e2e/compare.spec.ts`: 45 passed, 1 skipped (already skipped before these changes). Bike lit faces now passes against its 1.05 floor.
- `SHOTS=1 E2E_PORT=4191 npx playwright test e2e/shots.spec.ts -g bike`: passed, shots regenerated.

### Shots after the fixes

- fault-misalign: the front tyre is visibly doubled and thickened toward its bottom-right against the ghost, and the spokes are doubled. It reads now, where at 0.12 it was subtle.
- fault-stall: both reflectors sit away from their ghost positions, the spokes are doubled, and a slack chain strand hangs from the chainring toward the ground.
- assembled: the saddle, bars and pedals read amber.

### Commits

- 0e9d070 bike: a periodic stall, so raising it never spins the wheels back
- 56325ec bike: a bolder buckle, and a core that stays amber
- fd12e22 looks: a documented lit-faces floor for the bicycle

---

## Fix report: review round 1

### 1. One shared module: `src/mechanisms/partGeometry.ts`

- The module exports three helpers:
  - `merge`: one error message now, "part geometries do not share attributes".
  - `surfaceArea`.
  - `pointWeights(parts, coreShare)`: the core / fixed-share / area-times-density split, written in the same arithmetic order as steam's loop.
- Bike and steam use all three. Watch and gears use `merge`. Their four `merge` copies and the two `surfaceArea` and allocation copies are gone. Watch's `geometry.ts` no longer exports `merge`; `watch/shapes.ts` imports it from the shared module.
- `src/mechanisms/partGeometry.test.ts` covers:
  - `merge` joins indexed and non-indexed solids into one closed, non-indexed geometry, and throws when the attributes differ.
  - `surfaceArea` of a box (exact) and of a 64-gon cylinder.
  - `pointWeights`: the core share, density weighting and a fixed share, with exact expected weights.
- `src/mechanisms/pointCounts.test.ts` (new) pins the points per part of every registered machine at 30k, seed 3.
- Behaviour is unchanged. Before the refactor I captured, for every machine, the counts at 30000 and 4001 and a sha256 of `samplePoints(20000, 5)`. After the refactor `diff` reported IDENTICAL for all five machines, hashes included, so the points themselves are unchanged.

### 2. Slip is bounded and periodic (bike and steam)

- Bike: `driven = GEAR·θ·(1 + RATIO_GAIN·ratio) − slip·SLIP_JERK·fract(3θ/TAU)`.
  - The cumulative `(1 − SLIP_LAG·slip)` factor is gone.
  - The wheel lags by up to `SLIP_JERK` = 0.9 rad, then lurches level when the chain catches, three times a crank turn.
  - At the drive-0.3 still the lag is 0.81 rad, about half a spoke pitch off its ghost.
- Steam: `governorSpin = belt − slip·SLIP_JERK·fract(θ/π)`, with `SLIP_JERK` = 1.2 rad, twice a crank turn.
  - The cumulative spin factor is gone.
  - `governorOmega` keeps `SLIP_LAG` as a speed loss. That is not cumulative; it is what makes the balls droop.
- Tests:
  - bike kinematics: over drive 0 to 10.05 the lag stays in [0, SLIP_JERK] with exactly 30 lurches. The wheel is behind at drives 0.3, 0.9 and 1.6. I swapped 1.7, where the sawtooth lag is only 0.09, for 1.6.
  - bike index: the ramp helper is generalised. At drive 7.3, raising slip in 200 and then 400 steps, the reflector's largest step halves (< 0.6) and stays below 0.15. The unwrapped wheel turn stays in [0, SLIP_JERK]. The stall ramp test now uses the same helper.
  - steam kinematics: over ten crank turns the `governorSpin` lag stays in [0, SLIP_JERK] and reaches above 0.9·SLIP_JERK.
  - steam index:
    - It replaces "lags it when the belt slips", which encoded the cumulative lag. Over a turn the spindle is behind by 0 to SLIP_JERK and by more than half a jerk at some point.
    - A new ramp test at drive 7.3 checks that the step of a governor ball halves and stays below 0.15, and that the spindle turn stays within SLIP_JERK.
- RED: five failures. Four were from `SLIP_JERK` not yet being exported (NaN bounds). The fifth was steam's lag going negative (−0.3, the old centred sawtooth). GREEN after the change.

### 3. CORE_SHARE moves to 0.155

The bike row in the pinned counts is updated to match.

### 4. No silent placements

- `STATIC_PARTS` names 'frame', 'ground' and 'loose-bolts'.
- `pose` throws "bike: no pose for part <id>" for any part that is neither moving nor static.
- At module load, the static ids and the `RATTLE` keys are checked through `partIndex`, which throws on an unknown id.
- New test, "placement": only those three parts sit at the bike origin across drives, the twin and jitter. Every other part moves somewhere in that set.

### 5. `partDensities` is tested

- Body parts have density 1, apart from the chain links (1.6), brakes and loose bolts (1.3) and the sparse ground (< 0.25).
- Core pedals and handlebars are evenly dense, and the saddle is 0.6 of them.
- No core part is more than 2× the body density.

### Commands and output

- `npx tsc --noEmit -p .`: clean.
- `npx vitest run`: 44 files, 599 tests passed.
- `E2E_PORT=4191 npx playwright test e2e/parity.spec.ts e2e/looks.spec.ts e2e/compare.spec.ts`: 45 passed, 1 skipped (already skipped before these changes).

### Commits

- f68f892 mechanisms: one shared home for merge, surface area and point shares
- f9950be bike, steam: a bounded, periodic slip
- f5fb1c2 bike: name the static parts, test densities, core share off the floor

### Notes

- I did not run prettier over `steam/index.test.ts` or `looks.spec.ts`. Neither was prettier-clean before, so a full reformat would have buried the real change.
- The steam slip shot will look different from before: the governor now jerks rather than drifting behind. I did not regenerate the shots this round because none were asked for.
