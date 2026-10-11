# Task 5 re-review: the fix round (6f243e5..7910cd3)

Reviewer: scoped re-reviewer (sonnet). Inputs: task-5-review.md, task-5-report.md "Fix round 1", the last three lines of progress.md, review-6f243e5..7910cd3.diff, and the source at 7910cd3. No file other than this one was written.

## Verification I ran

- `npx tsc --noEmit -p .`: clean, exit 0. The tsconfig include covers `src`, `e2e` and `*.ts`, so the new e2e imports are typechecked.
- `npx vitest run`: 80 files, 1,699 tests, all passed, exit 0. This matches the report.
- Playwright not run, as instructed. The e2e result (167 passed) and the implementer's mutation runs are taken from the report and are not verified here.

## Finding by finding

### Important 1 (the large icosphere was 180 triangles): resolved

- `ICOSPHERE_DETAIL = { body: 3, moon: 1 }` is used by `icospheres()`. Three's `IcosahedronGeometry(1, d)` has 20(d+1)^2 triangles, so 3 gives 320 and 1 gives 80.
- `icospheres()` is now exported. The new unit test splits the `aPart` attribute and asserts the per-part triangle counts equal `[320, 80]`, plus a position count of 3 x 400. It passed in my vitest run, so the pin is live.
- The comments in bodySystem.ts and the body.vert header now agree with the geometry.

### Minor 1 (DPR test was an upper bound only): resolved

- The test now runs at DPR 2 and DPR 3, at both sizes.
- The bright star is bounded below as well as above: `>= 3r - 1` and `<= 3r + 1` (`+ 2` at DPR 3). A dropped `x uPixelRatio` gives 3 buffer px, which falls under the lower bound at both ratios.
- Dust is held to `>= ratio`.
- DPR 2 has no upscale, so it is the strict case. The reported mutation (dropping the multiply in star.vert) failed all four cases; I did not re-run it.
- Remaining slack: the dust floor at DPR 3 is 3 px, which a 1 buffer px dot can still reach after the 1.5x upscale. The bright-star lower bound carries the DPR 3 guard, and it does.

### Minor 2 (held systems never checked in pixels): resolved

- New e2e "a system held under full detail draws no moon or track mote", at the `system` and `twelve` shots, both sizes.
- **It does not restate `lod()`.** The precondition computes each system's raw size itself (`systemPx` on the test's own camera, built with `applyCamera` and `project`). It requires a system that is in frame, has a raw size at or above 60 (`c.r >= full`), and is reported below full by the page (`!c.full`, from `sysPx`). So a system is held below 60 at that shot, and the test asserts that per run.
- The pixel assertion forces Moon, Track and Derp to 0 and allows changes only inside the full systems' projected outer spheres (400 sample points through the essay's camera, plus 2 px). It also asserts that the full systems do change pixels (`changed > 0`), so it is not vacuous.
- The reported mutation (`sysPx.set(lastSys)` replaced by `sysPx.set(raw)`) failed at the system shot with 514 and 111 outside pixels.
- Residual, not blocking: I could not verify that the precondition holds at all four shot/size combinations. It is asserted per run and the full e2e was green.

### Minor 3 (halo slack larger than the margin): resolved

- The pixel half now uses `GLOW_LIT = 4`, a lit radius `GLOW_LIT_R = 1 - sqrt(GLOW_LIT / (255 * glowBrightness * 0.45))` derived from the profile's halo term, and `GLOW_SLACK = 0.5` px (it was 1.5 px past the full radius).
- Per the report, the correct build's worst excess is -0.02 px, and a shader that ignores `uGlowCap` fails at slack 0.5 on both sizes at the galaxy wide. The derivation matches the profile in mote.frag (`0.45 (1 - r)^2`, core 35 %). I did not re-run the mutation.

### Minor 4 (`uLodForce[5]` literal): resolved

- `glslLodConstants` emits `const int LOD_COUNT = 5;` and `LOD_BANDS[LOD_COUNT]`.
- body.vert, shell.vert and track.vert all declare `uLodForce[LOD_COUNT]`. `LOD_COUNT` is exported from lod.ts, and bodySystem.ts sizes `force` with it.
- lod.test.ts asserts both emitted lines.

### Minor 5 (unfenced star.vert copies, wrong comment): resolved

- The star.vert literals are gone, replaced by a marker. `STAR_VERTEX` splices them in from `NODE_PALETTE.NODE_AGENT` and the new `STAR_TINT`.
- galaxySystem.test.ts asserts there is no `const vec3 AGENT|WARM` or `WARM_MIX =` in the shader source and that the spliced text equals the TS values, so the three constants cannot drift.
- star.frag's comment now names bodySystem.test.ts, which does hold the profile (it passed).
- The tint change is rounding only: (1.0, 0.95, 0.88) becomes #FFF2E0 = (1.0, 0.949, 0.878). The controller accepted it.

### Minor 6 (moon tracks deduped by float equality): resolved

- `Body.track: 0 | 1 | 2 | null` is set from the moon's draw (`draw.track`) and is `null` for every non-moon body. No other generator logic changed.
- `buildTrackAttrs` and `fitBudget` (the sibling counting site) both dedupe by `m.track`. bodySystem.test.ts counts by `track`, and generate.test.ts (not in the diff) still counts by radius, so the two are an independent cross-check.
- Counts and budget tests are unchanged: neither generate.test.ts nor any budget test appears in the diff, and all 1,699 tests pass.

### Minor 7 (planet lattice mote 0 undocumented): resolved

- The shell.vert header now says a planet's lattice mote 0 is its point and is never drawn as a shell mote, so the shown bubble lacks that one site, and gives the reason (it keeps net-shells at the sum of `latticeCount`).

### Minor 8 (unnamed lamp codes): resolved

- `Lamp` enum (Off 0, Planet 1, Star 2, Hood 3, Core 4, Lineage 5) in galaxyShots.ts. `GalaxyShot.lamp` is typed `Lamp`, and the six shots use the names.
- galaxyShots.test.ts checks the six shots' lamps and the enum values. The numeric values are unchanged, so Task 6's decoding is unaffected.

### Minor 9 (`d` overwritten with a diameter): resolved

- The glow sprite records now carry `diam`. `glowCaps` takes `diam`, bodySystem builds `{ x, y, front, cap, diam }` instead of spreading the projection, and `lastGlows` reads `s.diam`. The unit tests were updated to match.

## Your three named checks

- **Icosphere detail 3, and a unit test pins 320/80: yes.** See Important 1.
- **Held-system pixel test runs at a shot where a system is actually held below 60: yes, and independent of `lod()`.** The raw size comes from the test's own projection, the held state from the page, and the test asserts the case exists on each run. See Minor 2.
- **`Body.track` leaves the instance counts and budget tests unchanged: yes.** The generator diff is the field, its two assignments and the `fitBudget` dedupe key. No count or budget test file changed, and all 1,699 tests pass.

## New problems

- Tests that assert nothing: none. The new tests assert real numbers (320/80, the splice equality, `changed > 0` with a pixel containment bound, caps bounded both ways). The Lamp assertions are a literal-equality check of data, which is mildly tautological but pins the values Task 6 will read.
- Type break: none. `tsc` is clean, including the e2e files.
- Test hooks reachable without `?test=1`: none. main.ts is not in the diff, and `shotName` and the `__motes` hooks remain gated by `testMode` (main.ts:67, 79, 361). The new exports (`icospheres`, `ICOSPHERE_DETAIL`, `STAR_TINT`, `glslRgb`, `STAR_VERTEX`, `LOD_COUNT`, `Lamp`) are plain module exports, not runtime hooks.
- Observation, not blocking: the e2e spec now imports from `src/` (three, `applyCamera`, `packBodyData` and others) to rebuild the camera. It typechecks and loads in node. It is also why the held-system test is independent of `lod()`, so I count it as acceptable.

Findings: Critical 0, Important 0, Minor 0 open (all 10 resolved).
