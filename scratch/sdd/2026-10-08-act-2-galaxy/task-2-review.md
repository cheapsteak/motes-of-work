# Task 2 review: the orbit mirror pair and the bodies texture (bf44c97..3105b63)

Reviewer: task-scoped gate, read-only. Inputs: task-2-brief.md, task-2-report.md, progress.md (rulings 1–4 on the report's concerns), the review diff, spec §2.1 (the turn), §8 (two clocks, clearance), §12.1, §14.1–14.2, plan Task 2 (and the Task 5/6/8 lines that consume it), plan-constraints.md.

Checks outside the diff, one per named risk:
- **Phone tier / seeds.** `src/galaxy/generate.ts:4-8`: the tier only sets the background's counts, so orbits are the same on both tiers. Seeds: `generate.test.ts:357-391` checks the orbit spacing structurally ("at any precession or tilt") over seeds 2–300.
- **Hashed parity rows.** `src/math/hash.ts:4-8`: `pcg` returns a uint32, so `pcg(i+1) % bodyCount` is an integer row.
- **moteSinCos convention.** `src/scene/mote/mote.glsl:47-59`: it returns (sin, cos), which matches every `.x` and `.y` use in orbit.glsl.
- **NODE_NEVER.** It is 2.0 (`birth.ts:48`), which is what the tests' literal `2` assumes.
- **Future consumers.** Plan lines 597, 808, 830 and 874 (Tasks 5 and 8) were read for the texture and uniform contract.

No suites were re-run, because no specific doubt called for a focused run.

## Spec Compliance

✅ **Spec compliant**, with the moon-lift bound changed under controller ruling 1.

What I checked against the brief, the spec and the diff:

- **Kepler** (`orbit.ts:42-46`, `orbit.glsl:30-37`)
  - E0 = M + e sin M, then exactly three Newton steps, in both mirrors. Pure.
  - The test covers e ∈ {0, 0.1, 0.22, 0.3} over 360 M (`orbit.test.ts:75-78`), as the brief asks.
- **In-plane point**
  - `(a(cos E − e), a√(1−e²) sin E)` has radius `a(1 − e cos E)`.
  - Rotating by ω puts the periapsis at bearing ω, and motion runs with the bearing.
- **Tilt** (`orbit.ts:71-78`, `orbit.glsl:50-56`)
  - The tilt is a rotation by `tilt` about k = (cos az, 0, sin az): `u·k + v cos(tilt)·m + v sin(tilt)·ŷ`.
  - I re-derived it. It is isometric, and the two mirrors match term for term.
- **Angle reduction**
  - `M = 2π·fract(phase + mod(t,P)/P)` is congruent to `phase·2π + 2πt/P` modulo 2π. `mod(t,P)/P` differs from t/P by an integer, and fract drops another integer.
  - ω is likewise congruent to `ω0 + 2πt/precession`.
  - Correct modulo whole turns, including at negative t, because `mod` is floor-based. Ruling 3 accepted it.
- **Host chain** (`orbit.ts:98-112`, `orbit.glsl:65-75`)
  - A moon takes two orbit additions and then breaks at the star (host −1), ending at the star's spot.
  - A planet takes one, and a star or core body takes zero.
  - The loop is bounded at 3, as the brief says.
- **bodyWorld** (`orbit.ts:120-128`, `orbit.glsl:78-82`)
  - It computes `rot_y(galactic − galactic(N0))`, which equals the brief's `turn(galactic) − turn(galactic(N0))` because the rotation is linear.
  - For N0 the difference is exactly zero in both mirrors, and the TS `+ 0` clears −0.
  - The turn sends bearing b to b − turn (trailing), per ruling 4.
- **Splice**
  - `GALAXY_TURN_PERIOD` is defined in `birth.ts` and spliced into orbit.glsl.
  - Tests assert the declaration, that no bare `1200` appears, and that no `GALAXY_*` name is unspliced.
- **Texture layout** (`bodyData.ts`)
  - Body rows T0–T5 match the brief's layout field for field.
  - Stream rows match: T0 from, to, kind, born; T1 hiAt, hop, bowBearing, childFixAt. The feed is the last row.
  - The tests check every field of every body and stream against `Math.fround` of the model, plus the feed row.
- **Parity (`?lib=orbit`)**
  - Rows: N0, C1 and its six moons (the sample throws if C1 has not six), P1, R0, R1, and 32 hashed rows.
  - Times: {0, 37.3, 101, 953, 3599.9}. That is 215 instances, under the 256-texel target.
  - Field: `bodyWorld.xyz`. The TS reference takes `fround(t)`.
  - The e2e test pins the case names and holds each to 1e-3.
  - Reported mutation check: flipping the lift's sign gives an error of 2.73, so the comparison is a real one.
- **Purity.** There is no `Math.random`, `Date` or `performance` in any new file. t is the only time input.
- **Tests beyond the brief.** "No two bodies meet" is stronger than the brief asks: every pair of bodies in a system, the star included, at 720 samples.
- **Deviation from the brief, accepted.** The moon lift bound is `max(2.5·Rp, outermost apoapsis)·sin 0.2` (`orbit.test.ts:208-223`). Ruling 1 accepted it, with the carry to Task 8's `cylinderTop`. The planet bound `9.6·sin 0.25` is verbatim.

⚠️ **Cannot verify from the diff (for the controller):**
- **Reported test results** are taken from the report, not re-run: 16 vitest passes, 1616 unit tests, 148 e2e passes, the parity maxErrors, and the mutation result.
- **Task 5's tracks** (plan line 597) are "placed by `orbitLocal` with their own true anomaly". `orbitLocal` takes ambient t and fuses Kepler with the plane transform, so Task 5 will need an entry point at a given anomaly (or E) in both mirrors, such as an `orbitPlane(E)` factored out of `orbitLocal`. This is not a Task 2 defect, because the brief's signature is fixed, but Task 5's brief should say so.
- **Combined splice helper.** Report concern 3 stands: a shader that already carries the mote library must use `orbitLibraryGlsl()` alone, so Task 5/6 need a combined splice helper.

## Strengths

- **The mirrors are step-for-step twins**, with cross-pointing comments and the same reduction (`orbitTurns`), so parity measures float32 against float64 and not two different algorithms.
- **The SwiftShader sin/cos problem was diagnosed with a measurement** (4.6e-3 to 1.8e-2 before, 7e-6 to 1.6e-4 after) and fixed with the existing `moteSinCos`. A test keeps builtin `sin(`/`cos(` out of orbit.glsl.
- **The unit tests measure real behaviour:**
  - Kepler's (1+e)/(1−e) speed ratio between periapsis and apoapsis.
  - The periapsis bearing over three periods.
  - e = 0 inverted through the tilt to recover phase + ω + 2πt/P.
  - The host-chain composition.
  - R0 seen from N0 turning by exactly `galaxyTurn`.
- **The orbit tests read the elements from the packed float32 texture**, so they check what the shaders read.
- **The pack layout is documented once, in the bodyData.ts header**, together with the encodings: NEVER, hop −1, zero orbit texels for the core and stars, and the feed row.

## Issues

### Critical

None.

### Important

None.

### Minor

1. **The galaxy turn's angle is not reduced, though it has the largest lever arm.**
   - Where: `orbit.glsl:60-62` and `:80`; the mirror is `orbit.ts:81-83`. The header comment at `orbit.ts:17-20` reads as if every angle is reduced.
   - `galaxyTurn(t)` is the literal `2πt/1200`, as the brief's signature comment pins.
   - Inside `bodyWorld`, though, it multiplies distances of about 118 units. At t = 86,400 s (which the TS unit test samples) the GLSL turn is about 452 rad, with roughly 5e-5 rad of float32 error, or about 6e-3 units. That is past the 1e-3 parity tolerance. At 3,600 s it is 1.6e-4 units.
   - Fix: have `bodyWorld` use `ORBIT_TAU * orbitTurns(t, GALAXY_TURN_PERIOD)` in both mirrors, and keep `galaxyTurn` literal for its own callers. This costs nothing.
   - Otherwise, carry it explicitly to Task 7's ambient wrap.
2. **A plan-level uniform name collision is waiting for Task 8.**
   - `orbit.glsl:14` declares `uniform highp sampler2D uBodies`.
   - The plan has Task 8 add `uBodies[8]` (a vec4 array) to `mote.glsl` (plan lines 808, 830 and 874).
   - `withOrbitLibrary` (`shaderSource.ts:50`) now splices the mote library ahead of orbit.glsl. So once Task 8 lands, every orbit-bearing shader declares `uBodies` twice with conflicting types and fails to compile. That includes the orbit parity shader and Tasks 5/6's galaxy shaders.
   - It fails loudly rather than silently, but renaming now (for example to `uBodyTex`) is cheaper than doing it in Task 8. Otherwise carry it to Task 8's brief.
3. **A vacuous purity assertion.** `orbit.test.ts:116` (`expect(orbitLocal(o, 37.3)).toEqual(orbitLocal(o, 37.3))`) only proves that the function was called twice. Drop it, or state purity as a property, for example that equal t gives bitwise-equal output across a fresh `packBodyData`.
4. **`NODE_NEVER` is hard-coded as `2` in the tests.** See `orbit.test.ts:49`, `:66` and `:70`. Import `NODE_NEVER` from `birth.ts`, so that the pack tests follow the constant if it changes.
5. **The test helper duplicates a private function.** `elements` (`orbit.test.ts:21-25`) duplicates `elementsAt` in `orbit.ts:86-90`. Exporting `elementsAt` would remove the copy. It is small, so this is not Important.
6. **The time-sampled tests use a single seed.** "No two bodies meet" and "every body stays inside its lift bound" sample time only on MOTE_SEED. Seeds are covered structurally by `generate.test.ts:357-391` (seeds 2–300, at any precession or tilt), so this is not a gap in safety. Running the time-sampled check on two or three more seeds would tie the orbit function to that structural guarantee beyond one galaxy.
7. **The streams texture is `BODY_TEXELS` wide, with T2–T5 zero** (`bodyData.ts:117-119`). This was a judgement call so that one `bodyTexel` serves both textures; the cost is about 19 KB of zeros. It is fine, but Tasks 5/6 must build the streams `DataTexture` with width `BODY_TEXELS`, not 2. Put that in their briefs.

## Assessment

**Task quality:** Approved

**Reasoning:** The two mirrors match step for step and the maths is correct:
- Kepler converges.
- The tilt is a rotation.
- The angle reduction holds modulo whole turns.
- The host chain composes star → planet → moon.
- N0 is exactly the origin.

The parity test is real: 215 instances over 5 times, a 1e-3 tolerance, and it caught a mutation. The remaining items are forward-carry notes and test polish: the unreduced turn angle, and the `uBodies` collision with Task 8.
