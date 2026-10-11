# Task 6 re-review: fix round 1 (5ff68dc..cc91d66)

Scope: the seven findings of task-6-review.md against the fix diff. Read-only: no tracked file changed,
nothing committed, no subagents, no playwright.

## Verification run

- `npx tsc --noEmit -p .`: exit 0, no output.
- `npx vitest run`: 82 files, 1763 tests passed (119 s). Matches the report.
- `git status --short`: empty at the end (`.superpowers/` is gitignored, so this file does not show).
- The e2e results (179 passed, 11 skipped, and the two mutation runs) are the report's. I did not rerun playwright.

## Findings

| # | Finding | Status |
|---|---|---|
| Important 1 | Orbit-track turn untested | Resolved |
| Minor 1 | `LIT_CORE` copy unfenced | Resolved |
| Minor 2 | Parity never draws a dark mote | Resolved, by reading the code and not by measuring (see below) |
| Minor 3 | Last stream dot lacks an instance | Resolved |
| Minor 4 | Literal salts in bodyAttrs | Resolved |
| Minor 5 | Duplicated hash, hard-coded 0.4 | Resolved |
| Minor 6 | Gradient rests on one stream | Resolved |

### Important 1: resolved

The new coverage computes dot positions independently of the shader, at a non-zero ambient.

- **The twin is TypeScript.** `trackDot(row, turns, t, data)` (bodyMote.ts) is `bodyWorld(host)` plus `turnVec(orbitLocal({...o, phase: turns − orbitTurns(t, period)}, t))`. All of it runs through the TS mirrors. `turnVec` is the TS rotation by `galaxyTurn(t)`.
- **The dot list is separate from the shader.** The e2e test (galaxy.spec.ts, "the dotted orbits turn with the galaxy") takes its dots from `buildTrackAttrs(g)` and projects each through `trackDot` and the composed `twinCamera`. The track pass of the GPU shader plays no part.
- **The ambients are non-zero.** The test runs at `AMBIENT_POSE` and at 101 s. `GALAXY_TURN_PERIOD` is 1200, so the turn at 101 s is 2π·101/1200 ≈ 0.53 rad.
- **It checks the pixels.** It isolates `net-tracks` with the lamp off and requires more than 100 lit pixels. Every lit pixel must be within 2.5 px of a twin dot, with zero strays. A track drawn without the turn would sit about 0.5 rad of orbit radius off its dot, which is many pixels.
- **A unit test backs it.** In bodyMote.test.ts, "a dotted orbit's dot", a dot at a body's own mean anomaly lands on `bodyWorld` within 1e-9 at t ∈ {0, AMBIENT_POSE, 101}. `bodyWorld` computes the turn on its own path, so the comparison does not share `turnVec`'s code. The control at 101 s shows an unturned host + `orbitLocal` missing C4 by more than 1 unit, so the check bites.
- **The mutation was caught.** The report says that reverting track.vert.glsl:35 failed the e2e at both sizes with 175 and 346 stray pixels. I did not rerun it. The shader line itself now applies `turnVec`, and the diff changes no shader.

### Minor 1: resolved

bodySystem.test.ts now requires `const float LIT_CORE = ${BODY_LOOK.litCore};` in mote.frag.glsl, exactly once. The test passes. The spliced `LOOK_LIT_CORE` that the review called unused no longer appears anywhere in `src`. Not splicing is justified, because the bike's mote system shares the fragment shader and has no `BODY_LOOK`.

### Minor 2: resolved, from the code and not from a measurement

- **I could not run the throwaway test.** vitest.config.ts has `include: ['src/**/*.test.ts']`. I made `shots/tmp-dark.test.ts` and ran `npx vitest run shots/tmp-dark.test.ts`. It said "No test files found", so I removed the file. Per the instruction I reasoned from the code. I have no dark and lit counts.
- **The four new cases are the same 64 hashed motes.** They are `all[floor(hash01(MOTE_SEED, 0x5000 + k) * all.length)]`, drawn from every shell and person mote of the essay galaxy (about 76 k). Each case runs at focus 0.5, growth 0.55 and sysPxSpread.
- **`lampLit` decides darkness by membership.** I read `lampLit` and `lampGain` in bodyMote.ts. A mote is dark when its row is outside the lit set. Per level:
  - **Planet on C1.** Lit is C1 and its moons, a small fraction of the galaxy. About 30 stars each have a system, so almost every sampled mote is dark.
  - **Star on C1.** Lit is the systems with C1's star, that is P1's alone. The other stars' systems and the core are dark, so most motes are dark.
  - **Core.** Lit is only the six core bodies. Every star, planet and moon mote is dark.
  - **Lineage on P1.** Lit is the core plus every body whose rule equals P1's, and P1's rule is R0. `generate.ts` gives the rule from the parents, and the filler stars pick a rule weighted by age. P_a is on R_a and the Q stars are on R1. The filler picks among six rules, and the weights for R_a, R_b and R_c are comparable to R0's. A large share of the systems born by growth 0.55 are therefore on other rules and are dark, and this exercises the rule comparison on a non-core row.
- **Dark and invisible are different.** At growth 0.55, bodies born later are absent anyway, such as P7, Q3 and some filler. Systems in the 0 px band are also culled. Those motes are hidden whatever the lamp does, so they do not test it. Only motes that are present, in an on-screen band and lamp-dark test the false branch. The population is large and varied enough that I expect well over one of 64 at each level. This is an expectation. The exact counts are not measured, so a skeptic can still ask for them.
- **Request.** To turn this into a measurement, let me add a temporary test under `src/` (or widen vitest's include), and I will report the counts.
- **Coverage.** The cases are registered in e2e/parity.spec.ts as 8 new names, one pair for each of the four cases, and `BODY_CASES` runs them all. The lit side of Planet, Star and Lineage is covered by the earlier cases. Hood and Off have no false branch.

### Minor 3: resolved

`streamDots` now uses `Math.ceil(chord / STREAM_PITCH)`, clamped to the 6 to 40 range, matching the shader's `clamp(n − i, 0, 1)` for dot i < ceil(n). generate.test.ts's independent count uses `ceil` too, and the budget total is 75,925, still within 76,000. The unrounded shader count against the brief's `round` is now declared as a deviation in the report.

### Minor 4: resolved

`SALT` gains `bodyBirth` 23, `personLat` 24 and `personLon` 25. bodyAttrs.ts uses them in place of the literals. salts.test.ts pins the values and now scans bodyAttrs.ts, whose `hash01` calls must take `SALT.x`. The suite, including the distinct-values test, passes.

### Minor 5: resolved

`bodyMote()` calls `moteHashes(seed, a.index)`, and the now-unused `hash01` and `SHELL_MOTE_STRIDE` imports are gone. The shell-equation test bounds the warp by `SCATTER_AMP[0] + SCATTER_AMP[1]`.

### Minor 6: resolved

The gradient check is now a `gradient(shot, lit)` helper run on two frames, the system probe (at least 1 compared) and the neighbourhood (`hood`, streams 1, at least 2 compared). It reads each twin dot's own pixel, uses a 3 × 3 window, and compares a dot only when it has presence ≥ 1 and no other stream's dot overlaps it. The fix for neighbouring dots addresses the failure the implementer hit on R_a → star-1. I did not rerun it. The report's mutation (`streamGain(0.0, …)`) fails both sizes.

## New problems

- **Critical:** none.
- **Important:** none.
- **Observations, not findings:** the dark cases compare only the TS and GLSL mirrors on the 64 shared motes, and they cannot show how many of those motes are actually lamp-dark and present until someone counts them.
