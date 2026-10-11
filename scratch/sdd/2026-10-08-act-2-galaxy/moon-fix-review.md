# Moon fix review (259890f..66b8678)

Reviewer for moon-fix-brief.md. Inputs: reviewer-instructions.md, plan-constraints.md, moon-fix-brief.md,
moon-fix-report.md, the controller's rulings (progress.md, last 3 lines, treated as decided), and
review-259890f..66b8678.diff (3 commits: f10ede9, d11e2df, 66b8678).

## Verdicts

- **Spec compliance:** ✅ Spec compliant (with the controller's rulings 1-5 applied).
- **Task quality:** **Needs fixes**: one Important finding (a fixed moon's point takes the planet's warmth, not the moon's).

## Verification run by the reviewer (final tree, HEAD 66b8678, clean)

- `npx tsc --noEmit -p .`: exit 0, clean.
- `npx vitest run`: 84 files, **1801 passed**, exit 0, no warnings.
- `E2E_PORT=4199 npx playwright test e2e/galaxy.spec.ts e2e/parity.spec.ts`: **42 passed** (9.4 min), exit 0. This includes
  both new "Moons at 390x844" tests, the lod parity test (now with `lod: motePx`), `?lib=body`, "the twelve light as
  twelve", the lamp-edge test, both "keeps within its budget" tests and "a healthy planet is a sphere". The only noise
  is the existing Vite `configLoader` notice from the web server and the "slow test file" note.
- A temporary generator probe (shots/, deleted afterwards): `instances.total` is **75,649** on both tiers, against
  `galaxyBudget` 76,000. Planet motes are 26,488 and moon motes 3,388. Two calls with the same seed give identical
  lattices, so the cut is deterministic. C1's moons are 8×21 (×4), 12×32 and 9×25. N0 is 12×30 and C1 is 60×160.
- Pixel diff of the old stills (shots/before/) against the new ones: C1's interior in T6-close-fixed-390 (r 45 px)
  has **0 changed pixels**, and the system shot's centre body (r 22 px) has **0 changed pixels**. On the desktop
  T6-close-pose, 2,599 of 1.3 M pixels change, all of them at the moons. The planet and star looks are unchanged.
- Stills, looked at with Read, then cropped and enlarged 7-8×: T6-close-pose-390x844, T6-close-fixed-390x844,
  T6-system-nostreams-390x844 (old and new), and the implementer's crops/old-a0-moon.png.
  - **Close, pose.** A 22 px moon is a sphere of single-px blue motes. They have the same pitch and size as the
    planet's motes in a crop of the planet's limb. There is a faint fill and a slightly brighter limb, with no dark
    ball and nothing standing proud of the limb. The old crop shows about 10 big round blobs on a navy disc. **The
    moon reads as a small dotted sphere of the planet's material.**
  - **Close, fixed.** The moons are warm tan/amber dotted spheres, plainly dots, not an amber ball. The planet is
    pale blue.
  - **Far (system shot, phone).** N0's small moons are each one bright 2-3 px point, not a ring. Before, each was a
    3-4 px blob with a fill. **A far moon reads as a point.**

## Named risks, one focused check each

| Risk | Check | Result |
|---|---|---|
| Root cause, not a fudge | Diff of body.ts:63-76, generate.ts:1040-1046 and shell.vert.glsl:134. Pixel diff of the planet regions. | Fixed at the cause. `moonLattice` now gives a moon its planet's row and column pitch, and the mote-size formula (`dotShare π R / rows`) is the same for every body. `PX_MOON` no longer floors moon motes (`motePx` is one floor for all). No moon-only scale factor. Planet and star pixels are unchanged. |
| Budget | Generator probe, generate.test.ts:427-460, bodySystem.test.ts:77-78, e2e budget tests | 75,649 ≤ 76,000. `largestFit` is a deterministic bisection. Moons derive from their host's fitted lattice in a second pass (generate.ts:1043-1044), so ordering is safe. The budget tests still count instances independently (`drawnInstances`, the drawn count from the GPU) and assert ≤ budget over 21 seeds. "Named shells last" (C1, core, stars) still holds. Orbit, neighbourhood and count tests are green, and the layout is untouched (radii and orbits unchanged). |
| Point handover | lod.ts:52-73, lod.glsl:18-31, shell.vert.glsl:63, 87-95, 127, body.vert.glsl:36, parity.ts lodCases | Continuous. Sphere gain is `smoothstep(4, 8, across)` and the point gets `1 − it`. Point size is `min(4, max(1.5, across))`, continuous and held at 4 through the ramp. It is a pure function of the moon's undisturbed projected diameter. TS and GLSL are identical where mirrored. `?lib=lod` samples `moonSphereGain` and `moonPointPx` every 0.25 px over 0-140 (both sides of 1.5, 4 and 8), and `motePx` over 3 diameters × 64 scales on both sides of its floor. The parity mutations reported (band end, ×1.01, floor) are each caught. The composition in shell.vert (the point branch) has no TS twin, the same as the planet's point. No new branch exists in `bodyMote`, so `?lib=body` needs no extension. |
| Scatter and derp on moons | bodyMote.glsl unchanged. bodyMote.test.ts:216-223, 355-363. shell.vert.glsl:127. | Above 8 px the sphere gain is 1, so moon motes go through `bodyMote()` unchanged and still leap (the SCATTER_MOON_CAP test is green on the denser 112-mote lattice). The point sits at the derped centre. The loosened bound at bodyMote.test.ts:362 is morphTerm's documented range (shell.ts:166, `[−(1+EQ_SECOND), 1+EQ_SECOND]`), and that is legitimate. Under 8 px, scatter fades with the sphere (ruling 4). |
| New tests discriminate | Read each test against the reported mutations | The unit test (bodySystem.test.ts:312-340) reads the real shell texture and failed under the old lattice (ratio 2.67). The dark-floor e2e failed under `moonFill` 0.28 (68 vs ≤ 14) and under the old lattice (25, 30). The off-limb e2e failed under the old lattice on C1-m2 only (see Minor 2). The small-moon blob test failed with no point, on N0-m6 only (see Minor 3). |
| Spec edit scope | Diff of docs/specs/2026-10-07-galaxy-orbits.md | Two hunks: §1.3's sentence (lines 93-98) and the §13 "shell motes" table row (line 559), as the brief allows. Nothing else changed. Prose restatements left stale are listed under Minor 6. |

## Spec Compliance

- ✅ The brief's requirements are met.
  - Up close, moon motes are the planet's grain (within 0-4.8 %) over the planet's faint fill and rim, with no
    solid ball.
  - Far away, a moon is a single point under 4 px, handing over by 8 px.
  - Budget: 75,649, with the trade reported.
  - Scatter and derp still work.
  - A lit moon reads ember and a fixed moon reads amber with dots (up close).
  - The spec sentence and the restating table row are updated.
  - The unit, pixel, small-moon and parity tests are present.
- The dark-disc metric deviates from the brief's wording. Ruling (1) accepted it. I agree with the reasoning: a
  dotted disc is mostly near-black, so the literal metric runs the wrong way.
- ⚠️ Cannot verify from the diff:
  - The lit-moon look was checked by eye only, from a scratch render that is not a committed still
    (shots/crops/lit-390.png). I did not re-render it.
  - The report says "125 of the 138 moons are on the 3 × 6 floor". The probe finds **113** moons exactly at
    [3, 6]. The rest are presumably floored in one dimension only. This is report wording, not code, but ruling
    (2) quotes the 125.

## Strengths

- A real root-cause diagnosis. Grain is tied to a body's own row pitch, and every moon sat on the 3 × 6 floor. The
  fix states it as a rule ("a moon has its planet's pitch") instead of a factor. Deriving moons from the host's
  *fitted* lattice keeps the grain whenever the planet is thinned.
- One mote floor (`motePx`) for every body, mirrored and parity-checked. Three stale galaxy constants are removed
  (`PX_MOTE`, `PX_MOON` and `PX_NO_CAP` in bodyAttrs.ts), with no remaining users.
- The planet and star looks are pixel-identical, which I confirmed by diff.
- The tests use the planet's mote radius, not the moon's own, for the off-limb allowance. That was a deliberate
  choice so that the old look cannot pass by construction. The per-moon checks are `expect.soft`, so a mutation
  reports every moon.

## Issues

### Critical

None.

### Important

1. **A fixed moon's point takes the planet's warmth, not the moon's.**
   - Location: src/scene/node/shaders/shell.vert.glsl:70 (used by the new moon branch at :94).
   - The shared point block computes `float warm = light.x * BODY_WARM;` (0.3). The new moon branch emits with
     that `warm`. Everywhere else, a moon is tinted `BODY_WARM_MOON` (0.6):
     - its shell motes, at bodyMote.glsl:312 (`kind == KIND_MOON ? BODY_WARM_MOON : BODY_WARM`);
     - its icosphere, at body.vert.glsl:68.
   - So a fixed moon under 4 px is half as amber as the same moon up close. Through the 4-8 px handover its hue
     slides from planet-warm to moon-warm. Brightness has no pop, but the colour is wrong. The brief (Look, item 4)
     asks that a fixed moon reads amber, and this is a new branch copied from the planet's point without its
     moon-specific term.
   - The fix is one line: `float warm = light.x * (kind == KIND_MOON ? BODY_WARM_MOON : BODY_WARM);`.
   - No test covers a fixed moon at point size. Add a check to the small-moon e2e, or a pixel hue check at a shot
     with a small fixed moon.

### Minor

1. **Stale comment describing a metric the test does not use.**
   - Location: e2e/galaxy.spec.ts:830-831.
   - The test's header comment says "inside 0.85 of its disc, the share of pixels lifted past near-black is no
     more than the planet's (a solid fill lifts all of them)". That is the metric the report says was tried and
     abandoned as too noisy. The code checks the 25th-percentile dark floor against the planet's plus
     `DARK_FLOOR_SLACK` (:817, :868).
   - Rewrite the comment to the implemented check.
2. **The off-limb check discriminates the old look on one moon of four.**
   - Location: e2e/galaxy.spec.ts:871-886.
   - Per the report's own mutation, under the old lattice only C1-m2 overhangs. C1-m1, m3 and m6 sit right at the
     allowance, about 2 px. It does fail on the old look today, but a camera or seed change could leave it passing
     the old look.
   - The `moonFill` 0.28 mutation is caught only by the dark-floor half, as expected.
3. **The small-moon "lit at its centre" check is vacuous at 2-5 px.**
   - Location: e2e/galaxy.spec.ts:926-932.
   - The 3 × 3 window round the centre covers any ring of diameter ≤ about 3 px, so a ring passes it. The
     component count (:924) is the only discriminating assertion. Under the no-point mutation it failed on N0-m6
     alone; the hard `expect` stopped there, and N0-m4 and m5 passed as one blob.
   - Either assert the centre pixel's own lift against the peak, or make the per-moon checks `expect.soft` so the
     margin is visible.
4. **The second cause (`PX_MOON` on moon motes) is not pinned by any test.**
   - The unit test (bodySystem.test.ts:312-340) runs the TS `motePx`, and parity only proves the GLSL function
     matches. If shell.vert.glsl:134 regains a moon-only floor, no test fails: at the close shot it lifts moon
     motes from about 1.35 to 1.5 px, about 11 %, invisible to the off-limb allowance and the dark floor.
   - Low risk, since the shader now calls the shared `motePx`.
5. **The same expression is written twice in two shaders.**
   - Location: body.vert.glsl:36 and shell.vert.glsl:63.
   - The moon's on-screen diameter, `2 R pxPerUnit(toView(bodyWorld(row, uAmbient))) / uPixelRatio`, is computed in
     both. It is the handover's only input, so the two must not drift. A `moonAcross(row)` helper in
     bodyMote.glsl, next to `shellElement`, would make it one source.
6. **The spec keeps three prose restatements of the old moon construction.**
   - Lines: docs/specs/2026-10-07-galaxy-orbits.md:172, :578-579 and :749.
   - :172, §3.2: "1.5 px for moon dots". Moon motes are now floored at 1 px, and 1.5 px is the point's floor.
   - :578-579, §13: "the lit moons under df-5 are drawn with their ember dust (10 motes at the floor) so a 3 px
     ember dot remains countable". It is now the point.
   - :749: "moons are parts (36)".
   - The brief limited the edit to the sentence and table rows, so leaving them was compliant. They now contradict
     §1.3. This is for the controller: either widen the edit or log it for the spec sweep.
7. **`baseLattice` computes an unused lattice for moons.**
   - Location: src/galaxy/generate.ts:995-999.
   - Moons fall through to `planetLattice(b.R)`, which `apply` ignores (:1043). It is documented in the comment
     and harmless, but it would be clearer to return early for a moon or leave `base[i]` undefined for moons.
   - Related: the `b.kind !== 'moon' && set(...)` short-circuit used for its side effect (:1043) reads better as an
     `if`.

## Assessment

**Task quality:** Needs fixes

**Reasoning:** The root cause is found and fixed as a rule. The planet and star looks are pixel-identical, the budget
holds deterministically at 75,649, the handover is continuous, pure and mirrored with parity, and the stills confirm
the look. The new moon-point branch copies the planet's warmth (`BODY_WARM`), so a fixed moon under 8 px is not the
moon's amber. That is a one-line fix, and it should come with a test.

**Findings:** 0 Critical, 1 Important, 7 Minor.
