# Task 7 report: `steam` mechanism

**Status:** DONE_WITH_CONCERNS (minor; see Concerns)
**Worktree / branch:** /home/user/mow-steam, `mech-steam`
**Commit:** `8cf9117 feat: steam mechanism` (not pushed, not merged)

## What was built

`src/mechanisms/steam/`, a horizontal mill engine:

- **kinematics.ts** (pure math, no state):
  - `pistonDistance(θ) = r cosθ + sqrt(l² − r² sin²θ)` with r = 0.3 and l = 1.2. `conrodAngle` gives sin β = r sinθ / l.
  - `governorAngle(ω)` is the conical-pendulum equilibrium cos θ = g/(ω²L), clamped to [15°, 70°]. It returns the exact stop value when clamped, and ω = 0 hangs at the lower stop.
  - `NOMINAL_OMEGA` puts the arms at 35°.
  - `sleeveY(θ)` is the Watt link geometry (a slider-crank of its own).
  - `leverAngle` is a first-class lever. The twin reverses it.
  - `stemY` gives the valve stem height.
  - `crankAngle(drive, faults, variant)` is TAU·drive·speed. `bind` adds a sin 2θ warp: the slope is 0.08 at mid-stroke, so the piston sticks. `stall` holds at the dead centres (0, π), then catches up. The angle is monotonic in drive.
  - `governorOmega` is the mean speed × the belt, less slip. It is a pure function of the faults and the variant, with no integration.
  - `governorSpin` is the belt ratio, less slip, plus jerks.
- **shapes.ts** builds part geometry from the shared shape library: `axle`/`bar`/`plate`/`ball`/`extrudeProfile`/`involuteGear`. It adds local helpers (`rod` along x/y/z, `box`, `beltOutline` (the external tangent hull of two circles), `surfaceArea`). `src/shapes/*` is untouched.
- **index.ts** has 18 parts: parts list, pose and sampling, plus `label` and `blurb`.
  - **Body:** flywheel (r = 1, 6 spokes), crank (with crankshaft and belt pulley), conrod, crosshead (with piston rod and piston), cylinder (with chest, throttle valve body and steam main), bed (with guides and two bearing pedestals), belt, gov-stand.
  - **Core:** gov-drive (pulley, shaft and bevel), gov-spindle, two arms with balls, two links, sleeve, throttle lever, valve stem.
  - **Drift:** fittings (oil cups, lubricator).
  - Points are allocated per group by surface area × a density factor. The core gets 25% of the points (≈3.65× body density, because the governor is small). The drift is 1.3× body density.
  - The machine faces +z and is centred near the origin. Whole anchor radius ≈ 2.2 (gears: 2.6).
- **Wrong twin** (pose-only; `localTwin` equals `local`): the governor linkage is reversed. The engine runs at 2.5× and the governor rides at the 70° stop ("balls fly out and stay out"). The lever is thrown the other way, so its sleeve end leaves the sleeve and the valve stem rises: throttle wide open. Every value is lerped by `variant`, so the morph is continuous.
- **Faults:**
  - `ratio` overspeeds the engine 1.8×, and the governor rises and closes the throttle against it.
  - `bind` makes the piston stick mid-stroke.
  - `slip` makes the belt slip: the spindle lags and the balls droop.
  - `stall` stops the engine at dead centre.
  - `misalign` wobbles the flywheel: a 0.3 rad tilt fixed in the wheel frame, so it precesses. The crank stays true.
  - `jitter` shakes the whole bed and rattles each part a little.
- **Exploded offsets:** the body moves up to about 1.4. The core moves 0.3–0.6.
- **Registered** in `src/mechanisms/index.ts` (one import, `{ gears, steam }`).
- **e2e/mech-steam.shots.spec.ts** is SHOTS-gated. It writes `shots/mech-steam-{assembled,twin,exploded-0.75,faults-0.6}.png` from camera pos [1.6, 1.1, 2.4], drive 0.3, ghost 1 on the faults shot.

## Tests

- **kinematics.test.ts (15):**
  - Piston position matches the formula at 73 angles.
  - The con-rod length stays l (closure).
  - Dead centres sit at l ± r, with a stroke of 2r.
  - The governor sits at the nominal angle at nominal ω, and is monotonic in ω (strictly between the stops).
  - cos θ = g/(ω²L) holds in the band (more than 50 samples), and the stops are exact.
  - The sleeve is monotonic in θ.
  - The throttle closes as speed rises in the correct variant and opens in the twin.
  - Speed and fault behaviour: twin and ratio overspeed, slip droops the balls, crank angle is monotonic under every fault, bind crawls at 90° (< 0.2× the nominal rate), stall holds at π and catches up.
- **index.test.ts (20):**
  - Role and core share between 0.24 and 0.35. Density bounds.
  - Flywheel shape (rim at 1, spokes, faces toward ±z). The twin is pose-only.
  - The posed crosshead matches the slider-crank formula.
  - The posed con-rod ends land exactly on the crosshead pin and the crank pin (correct, twin, and with faults).
  - The flywheel makes 1 turn per unit of drive.
  - Ball centre radius and height match the equilibrium angle. Link tops sit on the arms and link feet on the sleeve (correct, twin, slip, ratio).
  - The lever rides the sleeve and drives the stem. The twin lever is disconnected (> 0.2 off the sleeve) with the throttle open.
  - The spindle turns through the belt, and lags by more than 25% under slip.
  - Twin flywheel makes > 2× the ghost's turns. Ratio gives > 1.5×.
  - Misalign tilts and precesses the flywheel while the crank stays true. Jitter stays bounded.
- **TDD evidence:**
  - RED: `npx vitest run src/mechanisms/steam` failed with "Test Files 1 failed, no tests". `./kinematics` did not exist, which was expected before implementation.
  - First GREEN run: 13/15, with 2 genuine failures. `acos(cos(stop))` is not bit-exact, so `governorAngle` now returns the stop constants directly.
  - GREEN: 15/15.
  - index.test.ts was written before index.ts and shapes.ts (RED: module missing), then went GREEN.
- **Full suites:**
  - `npx tsc --noEmit -p .` is clean.
  - `npx vitest run`: 28 files, 288 tests passed. This includes the contract test for steam and the keyframes framing and camera-continuity tests for steam.
  - `E2E_PORT=4176 npx playwright test` (all specs): 40 passed, 3 skipped (SHOTS-gated). This includes parity for steam (all 11 cases) and the 5 steam looks tests.
  - `SHOTS=1 E2E_PORT=4176 npx playwright test e2e/mech-steam.shots.spec.ts`: passed.
- **Lit-faces looks test** (front/back core brightness), measured:
  - steam: 9.58M / 7.18M = 1.33 (threshold 1.2)
  - gears: 20.1M / 14.1M = 1.42

## Screenshots (reviewed)

- **assembled:** reads unmistakably as a horizontal mill engine.
  - The large spoked flywheel is the anchor, and the cylinder has its steam chest.
  - The steam main comes in from the left and rises overhead.
  - The bed has its bearing pedestals.
  - The governor stands up from the crosshead guides: spindle, two balls on arms, links, sleeve, and a lever running across to the throttle valve on the chest.
  - The core is clearly warm (cream-amber). It is denser than the body and near-white at its brightest points, like the gears' crank.
  - The crosshead and con-rod are the least legible elements at this angle; the con-rod reads as a line to the crank. The head-on looks shot shows them clearly: crosshead between the guide bars, rod to the crank.
- **twin:** the balls are flung wide, and the lever is thrown steeply up-left so the valve stem stands high. The flywheel sits at a different angle (it runs 2.5× fast in motion). It reads as the same engine, polished, with the feedback reversed.
- **exploded-0.75:** the parts are visibly displaced. The flywheel is turned and pushed back, the crank swings out, the belt and bed separate, and the governor parts spread modestly. Loose motes fill the background. Nothing is blown out.
- **faults-0.6:** generic drift at 0.6 dominates. The motes fuzz off every part and the dense governor blooms white. The flywheel's wobble shows against the white ghost ellipse.
  - To check the mechanism-specific signatures I took scratch shots (not committed) with drift at 0, at ratio = 1 and with all other faults at 0.6.
  - Ratio: the flywheel spokes lead the ghost spokes, the balls ride higher than the ghost balls, and the lever tilts to close the throttle against the level ghost lever. This reads clearly.
  - With all faults: the wobble and jitter are clear against the ghost.

## Tuning history (for the reviewer)

The first build failed lit-faces at 1.13. A Node model of `moteLight` (summed per part inside the core box) showed three causes:

1. The governor saturates in both views.
2. The governor sat behind the machine's depth centre, so the depth dim favoured the back view.
3. The steam main ran along z, and its sideways normals give no front/back contrast.

Fixes, which also made the machine read better:

- The governor stands on the crosshead guides in the engine plane (z = lineZ).
- The steam main runs in along x and rises overhead.
- The bed is shallower in z and taller.
- The flywheel rim has more face and less depth.
- The governor members are wider flat bars, and the balls are bigger (0.14).
- The static stand moved to body. The brief's core list is spindle, balls, sleeve and throttle linkage.

The model predicted 1.33, and the render measured 1.33.

## Files

- Created:
  - src/mechanisms/steam/index.ts
  - src/mechanisms/steam/shapes.ts
  - src/mechanisms/steam/kinematics.ts
  - src/mechanisms/steam/index.test.ts
  - src/mechanisms/steam/kinematics.test.ts
  - e2e/mech-steam.shots.spec.ts
- Modified: src/mechanisms/index.ts (one registration line plus its import).
- Nothing else touched. CREDITS.md was not edited.

## Licensing / credits

No third-party code was ported or studied. Everything comes from textbook physics, written from scratch:

- The slider-crank formula.
- The conical-pendulum (Watt governor) equilibrium cos θ = g/(ω²L).
- The external-tangent belt hull.

Optional "Inspired by" credit: the horizontal mill engine and the Watt flyball governor as historical machines. No CREDITS.md entry is required.

## Concerns

- **Core density.** The core is 25% of the points on a small assembly, so it is about 3.6× as dense as the body. It renders cream-amber, near-white at its brightest points, which matches how the gears' small crank looks. Dropping the share to 0.2 barely changed the look or the lit ratio, so I kept 0.25 to stay inside the brief's 25–35%.
- **gov-stand is body, not core.** The stand is static frame and the brief's core list excludes it. Keeping it warm as well hurt the lit-faces margin.
- **Flaky first shots run.** My first shots run timed out waiting for the first frame and passed on rerun. This is consistent with the controller's note that another task killed every `vite preview` around 06:49 UTC. Every later run was green.
- **`index.ts` keeps a lazily built geometry cache** (`built`), the same pattern as gears' `lazy()`. `pose` uses none of it and stays pure.
- **`partDensities()` is an extra export** used by the tests (and handy for Task 8 tuning). It is not part of the Mechanism contract.
