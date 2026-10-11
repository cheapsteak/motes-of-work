# Task 2 report: the orbit mirror pair and the bodies texture

Status: DONE_WITH_CONCERNS (one test bound changed from the brief; see Concern 1)

## Commits (on `main`, not pushed)

- `3105b63` galaxy: orbits on Kepler ellipses that precess and tilt, the rigid turn, and the bodies texture

This is one commit because the mirror pair, its splice and its parity mode change together.

## What I implemented

- **`src/scene/node/bodyData.ts`**: `BODY_TEXELS = 6`, `BodyData`, `packBodyData(g)` and `bodyTexel(data, t, row)`, with the brief's signatures.
  - Body rows use the brief's layout exactly. A core body's and a star's orbit texels are 0, and an orbiting body's spot is (0, 0, 0). A `fixAt` or `hiAt` that never comes is `NODE_NEVER`, and a hop off the lineage is −1.
  - Stream rows hold `T0 from, to, kind, born` and `T1 hiAt, hop, bowBearing, childFixAt`. The feed is the last row: from R0, to −1, kind 3, born 0, hiAt NEVER, hop = R0's hop + 1 (1, as in the stacks network's feed), bow 0, and R0's fixAt.
  - **Judgement call:** the streams texture is also `BODY_TEXELS` wide, with T2–T5 zero. That lets one `bodyTexel(data, t, row)` read both textures, as the brief's signature (no width parameter) needs, and as nodeData.ts does with one width for both. The cost is about 300 × 4 unused texels.
  - Also exported: `BODY_KIND` and `STREAM_KIND`. `packBodyData` throws if the galaxy has no N0.
- **`src/scene/node/orbit.ts`**, mirrored by **`orbit.glsl`**: `GALAXY_TURN_PERIOD` (re-exported from birth.ts), `keplerE`, `orbitLocal`, `galaxyTurn`, `bodyGalactic` and `bodyWorld`, plus the type alias `OrbitParams` (the brief's `Pick<OrbitElements, …>`). The GLSL has `vec3 bodyWorld(int row, float t)`, which reads `uBodies` with `texelFetch`, and `uN0Row`.
  - Kepler: `E0 = M + e sin M`, then three Newton steps. The in-plane point is `(a(cos E − e), a√(1−e²) sin E)`, whose radius is `a(1 − e cos E)` at the true anomaly.
  - `M = phase·2π + 2πt/period` and `ω = ω0 + 2πt/precession`. Both are computed as `2π·fract(phase + mod(t,P)/P)` and `ω0 + 2π·mod(t,prec)/prec`. That is the same angle up to whole turns, but it keeps float32 precision: a moon's 6 s period is 600 turns at an hour. The doc comment says so.
  - The plane is rotated to bearing ω, then tilted by `tilt` about the horizontal axis at bearing `tiltAz`, so `y = v·sin(tilt)` with v the distance across the axis.
  - The host chain is at most 3 hops (moon → planet → star) and ends at the spot.
  - `bodyWorld = turn(galactic − galactic(N0))`, about +y. This equals `turn(galactic) − turn(galactic(N0))` because the turn is linear. N0 comes out as exactly `[0, 0, 0]` (a `+ 0` in the TS turns −0 into 0).
  - **Conventions (judgement calls):** the plane is x–z with y up, and a bearing is `atan2(z, x)`, as in background.ts. Orbits run with the bearing. The galaxy turns against it, which makes the spiral arms (which wind outward with the bearing) trail. The turn's direction is not stated in the spec.
  - **GLSL sin/cos:** orbit.glsl uses the mote library's `moteSinCos` (accurate to about 1e-7), never the builtin sin/cos. `withOrbitLibrary()` splices the mote library in ahead of it. With the builtins, the first parity run was off by 4.6e-3 to 1.8e-2, because SwiftShader's sin/cos are accurate only to about 2^-11 and that error is multiplied by distances of about 100 units. mote.glsl documents the same problem. A unit test now fails if orbit.glsl ever calls a builtin `sin(` or `cos(`.
- **`birth.ts`**: `GALAXY_TURN_PERIOD = 1200`, `glslOrbitConstants()` and `ORBIT_CONSTANTS`. This is a separate list from the `NODE_*` constants, so orbit.glsl and node.glsl can later go into one shader without declaring anything twice.
- **`shaderSource.ts`**:
  - `ORBIT_INCLUDE_MARKER`
  - `orbitLibraryGlsl()`: orbit.glsl with its constants spliced in
  - `withOrbitLibrary(vertex)`: the mote library plus orbit.glsl
- **Parity (`?lib=orbit`)**:
  - `fields.ts`: `OrbitOut { bodyWorld }`, `ORBIT_PARITY_FIELDS` and `glslOrbitOutStruct()`.
  - `shaders.ts`: `ORBIT_VERTEX`. Each instance carries `aRowT` = (row, t).
  - `parity.ts`: `orbitCases`. The sample is N0, C1 and its six moons (it throws if C1 does not have six), P1, R0, R1, and 32 rows chosen by `pcg(i+1) % bodyCount`. Each is taken at t ∈ {0, 37.3, 101, 953, 3599.9}, which is 215 instances in a single draw. There is one case per time, named `orbit: bodyWorld at <t> s`. The TS reference takes `Math.fround(t)`, as the attribute carries it.
  - The lib choice now goes through a `LIBS` list.
  - `e2e/parity.spec.ts`: `test('GLSL bodyWorld() matches the TS reference')`, which checks the case names and maxError < 1e-3.

## Tests and results

### TDD

- **RED:** `npx vitest run src/scene/node/orbit.test.ts` failed with `Failed to resolve import './bodyData'` (no tests ran). That was expected, because the modules did not exist yet.
- **GREEN (after the lift-bound change, Concern 1):** the same command gives 16 passed. The file holds the brief's seven tests plus these:
  - the pack layout, and the stream and feed rows
  - a check that orbits go round once a period, with Kepler's speed ratio of (1+e)/(1−e) between periapsis and apoapsis, and with the periapsis at bearing ω(t) over three periods
  - the turn's period and splice
  - the host-chain walk
  - the GLSL declares its constants and never uses a bare copy or a bare 1200
  - no builtin sin/cos in orbit.glsl
- **Strengthened beyond the brief:**
  - "No two bodies meet" checks every pair of bodies in each system (star, planets and moons, as spheres of their R) over 720 samples of 0–1200 s, not only planet–planet pairs.
  - The adjacent-track inequality is checked on every planet's distinct track ellipses.
  - "The galaxy turns rigidly" also checks that R0 seen from N0 turns by `galaxyTurn(t)` about +y.
- **What the tests measure:**
  - Kepler converges to below 1e-6 at e = 0.3.
  - Every body stays within [a(1−e), a(1+e)] at all 1,000 samples.
  - N0 is exactly `[0, 0, 0]` at 0, 37.3, 101, 953 and 86,400 s.

### Parity

- **Command:** `E2E_PORT=4199 npx playwright test e2e/parity.spec.ts -g bodyWorld` gives 1 passed.
- **Measured maxError per time** (from a temporary log, since removed):

  | t (s) | maxError |
  |---|---|
  | 0 | 7.0e-6 |
  | 37.3 | 5.9e-6 |
  | 101 | 1.5e-5 |
  | 953 | 4.6e-5 |
  | 3599.9 | 1.6e-4 |

  hash01 and the pcg goldens are 0.
- **Mutation check:** I flipped the sign of the lift (`v * st.x` to `-v * st.x`) in orbit.glsl only. The test failed with an error of 2.73, so it catches a real divergence. The GLSL was then restored.

### Close-out

- **A.** `npm run typecheck && npm test`: 73 files, 1616 passed.
- **B.** There are no stills; the parity page is not a picture.
- **C.** Full e2e: see the end of this report.
- **D.** Committed by name.
- Nothing was retired or re-pinned.

## Self-review

- **Brief signatures:** all kept as written. `orbitLocal` takes `Pick<OrbitElements, …>` through the `OrbitParams` alias.
- **Formatting:** new files pass `prettier --print-width 140 --single-quote`. bodyData's packed array keeps one line per texel under `// prettier-ignore`, as in nodeData.ts. The existing files I edited were already not prettier-clean, so I did not reformat them.
- **Probes:** a throwaway lift probe test and a temporary log line in the e2e spec were both deleted. Nothing stray is left in the tree.
- **Docs:** every mirror function in orbit.glsl has a twin in orbit.ts, and their comments point at each other.

## Concerns

1. **The brief's moon lift bound, `2.5·Rp·sin 0.2`, does not hold on the accepted generator.**
   - **Why:** Task 1 fix round 1 (accepted) moves a moon track outward until its moons clear the planet and the inner track. On MOTE_SEED that takes tracks up to 3.95 Rp: 34 of 138 moons sit past 2.5 Rp, and 7 can lift past the bound, up to 1.26×.
   - **Over seeds 1–60:** 59 of 60 seeds have such a moon (301 of 7,577 moons). The worst lift is 1.60× the bound, and the worst absolute moon lift is 0.31 units, against §12.1's assumed 0.14.
   - **What the test does instead:** the planet bound `9.6·sin 0.25` is kept verbatim. The worst planet lift over 60 seeds is 2.370, which is exactly that bound. Each moon is held to `max(2.5·Rp, its planet's outermost track apoapsis)·sin 0.2`.
   - **Ruling needed:** either accept this bound, or have the generator (Task 1's files) cap each pushed-out track's tilt to `asin(2.5·Rp·sin 0.2 / apoapsis)` so the brief's value holds.
   - Either way, Task 5/8's `cylinderTop` should take the moon lift from the generated galaxy (ruling 10), up to about 0.31, not 0.14.
2. **Angle reduction.** M and ω are reduced with `mod(t, P)/P` before they are scaled to radians. This is equivalent to the brief's formulas modulo 2π, but it is not literally the same expression. `galaxyTurn` is the literal 2πt/1200. Task 7's ambient wrap is still needed for tabs left open for hours.
3. **moteSinCos dependency.** orbit.glsl now needs the mote library spliced in ahead of it, which `withOrbitLibrary` does. A shader that already includes the mote library (through `withNodeLibrary`) must splice `orbitLibraryGlsl()` alone, or the mote library is declared twice. Task 5/6 should add a combined splice helper when they first need one.
4. **The turn's direction** (against the bearing, so the arms trail) and the orbits' direction (with the bearing) are my choices; the spec does not state either.

## Close-out C (final e2e on HEAD)

`E2E_PORT=4199 npm run e2e` (the web server rebuilds dist/ first) on HEAD `3105b63`: 148 passed and 9 skipped (the SHOTS-gated screenshots) in 23.7 min, exit 0. That is the base 147 plus the new bodyWorld parity test. No background processes were left.

## Fix round 1 (review Minors 1, 2, 3, 4, 5)

Commit: `aabcc65` galaxy: reduce the turn to one turn exactly, and name the bodies sampler for its texture. It sits on top of `3105b63`; no history was rewritten.

### 1. The galaxy turn is reduced to one turn, in both mirrors

- **The change.** `galaxyTurn(t)` is now `2π·orbitTurns(t, GALAXY_TURN_PERIOD)` in `orbit.ts` and `orbit.glsl`, in [0, 2π). It is the same angle as 2πt/1200 to within whole turns. The unit test asserts that `galaxyTurn(1200)` is 0, that `galaxyTurn(86,700)` is π/2, and that the value stays in range.
- **The parity test samples a day in.** `ORBIT_TIMES` gains 86,400 s in both `parity.ts` and the e2e test. Six times × 43 rows no longer fit the 256-texel target in one draw, so there is now one draw per time.
- **The new time catches the bug.** With the GLSL turn temporarily put back to the literal 2πt/1200, the case at 86,400 s fails at 3.4e-3.
- **Reducing the turn was not enough.** With the turn reduced but the old `mod(t, P)`, 86,400 s still failed at 1.4e-3. A planet's period is not an integer, so float32 rounds `k·P` by up to half a unit in the last place of t (about 4 ms a day in).
- **So `orbitTurns` now reduces Cody-Waite style, as `moteSinCos` does for π/2.**
  - The period P splits into a head (its top `ORBIT_HEAD_BITS` = 9 significant bits) and a tail.
  - `k·head` is exact in float32 for k below 2^15, and only `k·tail` rounds.
  - The GLSL takes the head with `floatBitsToUint(P) & ORBIT_HEAD_MASK`. The mask (0xFFFF8000) is generated from `ORBIT_HEAD_BITS` in birth.ts and spliced in, with tests on its bits and on the splice.
  - The TS takes the same steps in float64, where the split changes nothing.
- **Parity now:**

  | t (s) | maxError |
  |---|---|
  | 0 | 7.0e-6 |
  | 37.3 | 5.9e-6 |
  | 101 | 1.5e-5 |
  | 953 | 4.1e-5 |
  | 3599.9 | 7.2e-5 |
  | 86,400 | 7.8e-6 |

  All four parity tests pass.
- Concern 2 above is superseded: every angle, the turn included, is now reduced.

### 2. `uBodies` becomes `uBodyTex`

- The sampler is renamed in `orbit.glsl` and `parity.ts`.
- The plan's Task 2 GLSL line now names `uBodyTex`, and names `uStreamTex` for the streams texture. No shader reads the streams texture yet. The line also says why neither may be `uBodies` (Task 8's `uBodies[8]` in mote.glsl), and that the streams texture is `BODY_TEXELS` wide (review Minor 7).

### 3–5. One-liners taken

- 3: the vacuous `toEqual` purity line is gone.
- 4: the pack tests read `NODE_NEVER` by name.
- 5: `elementsAt` is exported from `orbit.ts`, and the test uses it instead of its own copy.

### Not taken

- Minor 6: more seeds for the time-sampled tests. It is not a one-liner, and seeds 2–300 are covered structurally.
- Minor 7: a note for the Tasks 5 and 6 briefs, now also in the plan line above.

### Results

- `npm run typecheck && npm test`: 73 files, 1616 passed.
- Full e2e (`E2E_PORT=4199 npm run e2e`, which rebuilds dist/ first, on HEAD `aabcc65`): 148 passed and 9 skipped in 23.1 min, exit 0. No background processes were left.
