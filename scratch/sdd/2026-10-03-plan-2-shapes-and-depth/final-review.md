# Final whole-branch review: Plan 2, shapes and depth

Range `3ca9acb..8dba8c1` (27 commits). Reviewed against the plan, the spec (the binding authority) and the ledger rulings.

**What I ran at 8dba8c1, in a temp worktree under /tmp that has since been removed:**
- `npx tsc --noEmit -p .`: clean.
- `npx vitest run`: 441 out of 441 passed.
- Full Playwright suite with `E2E_PORT=4199`: 70 passed, 6 skipped. The 6 skips are the SHOTS-gated specs. No processes were left running.
- Throwaway vitest probes (now deleted) that check:
  - each mechanism's `pose()` for finiteness over 20k random fault and variant draws;
  - continuity in drive and in variant;
  - part-pose continuity along the real story timeline;
  - framing of the wrong twin in the vibe build;
  - build cost at 100k.

## Strengths

- **The mechanism swap works.** Each of the four ids gets correct anchors, a correct camera and correct framing (Review Focus 1):
  - camera keys are machine-relative;
  - anchors are frozen and memoised;
  - `keyframes.test.ts` checks framing and camera continuity for every registered mechanism;
  - `looks.spec.ts` derives its probe regions from projected anchors.
- **Shader and TS stay in sync by construction:**
  - `layout.ts`, `salts.ts`, `fields.ts` and `lighting.ts` generate the GLSL;
  - `splice()` throws on a missing marker;
  - parity runs through the production attribute path, for every mechanism, and compares every `MoteOut` field. The normal-through-zero fallback case is included (Review Focus 2).
- **Pose stays pure, and sampling stays deterministic:**
  - no `Math.random` and no clock calls in pose;
  - `samplePart` hands three's sampler our PRNG (Review Focus 4);
  - 20k random fault, variant and drive draws per mechanism gave no non-finite values and no non-unit quaternions;
  - degenerate Jansen intersections never produce NaN (Review Focus 3, the NaN half).
- **The comparison page is careful work:**
  - a per-budget system cache with disposal;
  - a build overlay that cannot get stuck or loop on a failing build;
  - ARIA on toggles, and UI text in sentence case;
  - dev lighting sliders that read their defaults from `LIGHTING`;
  - credits shipped inside the page.
- **Licensing is handled well:**
  - the BOSL2 port is narrowly scoped and carries its full BSD-2 text;
  - the Jansen numbers are used as facts, with no text copied;
  - the cycloid is derived, not ported.
- **Publication safety:** a scan of the diff found no employer names, internal paths, issue numbers or tool names.

## Issues by severity

### Critical

None. The essay ships `ACTIVE_MECHANISM = 'gears'`, which shows none of the defects below in the story. Issue 1 would become Critical the moment the author picks the watch.

### Important

**1. The watch's wrong-twin morph snaps parts through half turns as drive moves.**
- **Where:** `src/mechanisms/watch/index.ts:175`.
- **What is wrong:**
  - For `0 < variant < 1`, `pose()` blends the watch pose and the music-box pose with `lerpTransform`. Its slerp takes the shorter arc: `src/math/transform.ts:47-54` negates `b` when `dot < 0`.
  - The two poses spin independently, about different axes (z for the watch; x after `onSide` for the box). So their quaternion dot product crosses zero again and again as drive advances.
  - At each crossing the blended rotation jumps to the other hemisphere, about a tilted axis.
- **Measured:**
  - At variant 0.5, 53 flips over drive 0 to 2.
  - Points jump by up to 1.9 world units (barrel), 1.3 (balance) and about 1.0 (centre wheel). The whole watch has a radius of about 2.3.
  - Along the real timeline with `?mech=watch`, the largest per-step part rotation is 3.14 rad at p ≈ 0.488. That point is mid-rewind: variant 0.5, assembly 0.38, drive 1.1, so the settled core shows it.
  - The other three mechanisms stay below 0.01 per step along the whole story.
- **Why it matters:**
  - The spec (§6.3) says the twin is built from the same parts "so morphing between variants stays continuous". The rewind is exactly a variant morph with drive moving.
  - On the comparison page, a mid "Wrong twin" value plus Play shows the same snapping. That makes the watch look broken to an author choosing between candidates, and the watch is the runner-up.
- **Why nothing caught it:** variant-only continuity holds (at most 0.003 per 1/2000 step). No test sweeps drive at an intermediate variant, and no test checks part-pose continuity along the story.
- **Suggested fix:**
  - Blend in parameter space, as gears, strandbeest and steam already do. Give each part a rest orientation and a spin angle per variant, and compose `slerp(restWatch, restBox, v)` (both fixed, so it never flips) with a rotation about the blended axis by `lerp(angleWatch, angleBox, v)`.
  - Positions can keep their lerp.
  - Then add a contract or keyframes test per mechanism: the largest part-transform step along the story, sampled at N and 2N points, should halve (the same technique as the camera continuity test at `src/timeline/keyframes.test.ts:127`). Exclude the slip and jitter faults, which snap by design.

**2. The strandbeest ratio fault teleports feet from about ratio 0.2 up, including the "Faults 0.6" preset.**
- **Where:**
  - `src/mechanisms/strandbeest/index.ts:64`: `RATIO_GAIN = 0.6`.
  - Applied at `:386`.
  - The mechanism is the `sqrt` at `kinematics.ts:107`.
- **What is wrong:**
  - Lengthening the crank makes the lower rocker run past tangency.
  - Near tangency, `h = sqrt(r0² − along²)` has unbounded slope, so a 0.4-unit move of `low` moves the knee about 13 units and the foot about 18 units in one 1/20000 turn.
  - Measured largest single-step foot jump, in Jansen units (feet hang about 92 below the axle):

    | Ratio fault | Largest foot jump |
    |---|---|
    | 0.1 | 0.25 |
    | 0.2 | 22 |
    | 0.6 | 49 |
    | 1.0 | 62 |

  - At `SCALE` 0.018, the 0.6 case is about 0.9 world units.
  - There is no NaN, so the letter of Review Focus 3 holds. Its "clamps to the nearest reachable configuration" intent does not: the feet pop.
- **Why it matters:**
  - The ledger recorded this at Task 6 as deferred to Task 9, with a suggested `RATIO_GAIN` of about 0.08. None of the Task 9 rulings picked it up, so it fell through.
  - The "Faults 0.6" preset is how the author compares the four machines. A teleporting foot makes the strandbeest read as buggy rather than faulty.
- **Suggested fix:**
  - Lower `RATIO_GAIN` to the largest value with no clamp for ratio from 0 to 1. A sweep like the one above finds it in seconds; it is about 0.1.
  - Or split the ratio fault across several link lengths.
  - Add a test that the foot path is continuous at ratio 1 (the step halves when sampling doubles).
  - Update the `RATIO_GAIN` doc comment, which currently promises a clamp at full fault.

**3. The licence notice is not reachable from the essay. The decision deferred to "end of branch" is still open.**
- **Where:** `index.html` and `src/story/dom.ts` have no footer or credits link. `CREDITS.md` is shipped only inside the comparison bundle (`src/compare/compare.ts:92-96`).
- **What is wrong:**
  - The essay entry imports the whole registry, so the ported BOSL2 involute code (through gears) ships minified in the essay's main chunk.
  - In the built `dist/`, the string "Revar" (from the BSD notice) appears only in `assets/compare-*.js`.
  - BSD-2 clause 2 requires the notice in materials distributed with binary-form redistributions.
  - The essay never links the comparison page, and a standalone deploy of the essay would carry no notice at all.
- **Ledger:** Task 4 said the notice "must ship with the site". Task 8 said "decide at end-of-branch: add credits link to essay footer". That point is now.
- **Suggested fix:**
  - Add a small "Credits and licences" link to the essay. The spec already plans a sources footer (§7), so the link can live there and open a static credits page built from the same `CREDITS.md`. A `public/CREDITS.md` would also satisfy the notice clause.
  - While there, list `marked` (MIT, which ships in both pages) under Libraries; only three.js is listed today.

### Minor

**4. The README does not document the comparison page.**
- `README.md:34-44`: the URL-parameter table covers the essay and the spike pages only. It omits:
  - `src/compare/compare.html`;
  - its `?mech=`, `?budget=30000|100000` and `?dev=1` parameters;
  - its `?test=1` hook `window.__compare`.
- The next maintainer has to read `compare.ts` to find any of them. Fix: add rows for the comparison page.

**5. Some mechanism blurbs break the documented contract.**
- `src/mechanisms/meta.ts:10` documents `blurb` as "what the machine is and what its wrong twin does".
- Two blurbs never mention the twin: steam (`src/mechanisms/steam/index.ts:53`) and strandbeest (`src/mechanisms/strandbeest/index.ts:28`).
- The single-view blurb is where the author reads what each wrong twin is. Add the twin clause, or loosen the doc comment.

**6. The shot specs overlap.**
- `e2e/mech-{watch,strandbeest,steam}.shots.spec.ts` are near-copies of each other. They also overlap with the per-mechanism lit three-quarter shots in `e2e/shots.spec.ts`.
- `shots/` ends up holding both `mech-watch-assembled.png` and `mech-watch-lit-assembled.png`, and gears has no per-mechanism spec.
- `npm run shots` runs only `shots.spec.ts`, so the README's description does not cover the other three files.
- Fix: fold the per-fault and state lists into `shots.spec.ts`, looping over `MECHANISM_IDS`, and delete the three copies.

**7. A comment restates the ghost alpha value.**
- `src/scene/mote/shaders/ghost.vert.glsl:15-19` repeats `0.4` in prose next to the measurement rationale.
- `LIGHTING` is meant to be the single home of the value, and the dev slider now changes it live, so the comment will go stale on the first retune.
- Fix: refer to `LIGHTING.ghostAlpha` by name only. `GHOST_STRIDE` stays a literal.

**8. The steam twin's belt sags without updating its normals.**
- `src/mechanisms/steam/index.ts:257-258`: `localTwin` gets `beltSag`, but `normalTwin` copies the flat belt's normal. The sagging belt is therefore lit as if it were taut.
- This is cosmetic. Fix: derive the twin normal from the sag curve's slope, or accept it and say so in the comment.

**9. The side-by-side view silently caps at four panes.**
- `src/compare/compare.ts:64, 243`: `PANES_IN_GRID = 4` with `MECHANISM_IDS[i] ?? null` means a fifth registered mechanism would never appear in "Side by side", and nothing would fail.
- The "Not yet built" branch can no longer be reached with four ids.
- Fix: derive the grid from `MECHANISM_IDS.length` (for example, `cols = ceil(sqrt(n))`), or assert `MECHANISM_IDS.length <= 4` in `meta.test.ts`.

**10. A ledger deferral still stands: the fill spike's camera constants are gears-derived.**
- `src/spikes/fill.ts:13-15`: the worst-case halo framing is documented as gears world coordinates, yet `renderSpike` now follows `ACTIVE_MECHANISM`.
- After a mechanism switch, the spike would still measure a framing chosen for the gears.
- Fix: note this in the spike HUD params, or re-derive the framing from anchors.

## Declined to judge

- **Art direction and per-mechanism readability:** the Fable visual review and the Task 9 polish rulings own these. I checked mechanics, not looks.
- **Real-device performance:**
  - Under SwiftShader, building 100k motes took 105–350 ms on the CPU, the watch being slowest.
  - Phone and integrated-GPU budgets need the device spikes.
- **Physical fidelity of the escapement, governor and Jansen numbers beyond their unit tests:** these are outside a code review.
- **Slip sawtooth snap-backs:** gears, steam, strandbeest and the music-box fly all snap at each slip period. The spec's "lags its driver in jerks" makes this intentional, and the ledger already defers it.
- **Ledger rulings:** I found none wrong. These include:
  - the steam twin overdriven 2.5×;
  - an 80/20 Human/Dialogue core;
  - ghost alpha 0.4 at stride 4;
  - `YAW` 0.25 rad;
  - running Tasks 5–8 in parallel.
- **Completeness of "Inspired by":** I cannot see which sources the implementers studied. Nothing in the code cites an NC, SA or unlicensed source.

## Verdict

**Ready after fixes.**
- Fix 1, the watch morph, before the author is asked to judge the watch.
- Fix 2, the strandbeest `RATIO_GAIN`, which is one constant plus a test.
- Fix 3 before any public deploy of the essay.
- None of the three changes the shipped gears essay; the minors can ride along.
