# Task 7 review: the ambient clock and the tracking camera (cc91d66..d67259f)

Reviewer: task reviewer (opus). Inputs: reviewer-instructions.md, plan-constraints.md, task-7-brief.md, task-7-report.md (rounds 1–3), progress.md from "Task 7 base", review-cc91d66..d67259f.diff (7 commits). The controller's rulings in progress.md are treated as decided (phone close-centre acceptance, per-aspect `landscape`, the twelve riding the turn, the re-pinned twelve test, the pending desktop 90° turn). None is re-raised.

**Spec compliance: ✅. Task quality: Needs fixes (1 Important, 4 Minor).**

### Spec Compliance
- ✅ Spec compliant.
  - Clock: `AMBIENT_WRAP = 3600`, `createAmbientClock({ override, test, reduced, startMs })` with `at`/`live` exactly as the brief gives it (src/scene/ambientClock.ts:11-35). `reduced` is read on every call.
  - `CameraOptions.origin` (src/scene/cameraRig.ts:71-76, 103-110); `camera.track` leaves with defaults 0 (src/timeline/sceneState.ts); `trackPoint` (src/timeline/netTrack.ts:96-103); `sceneMotion` adds `camera.track.mix` (src/autoAdvance/plan.ts); target-relative `galaxyShotKeys` (src/timeline/galaxyShots.ts:107-129).
  - main.ts owns the clock, passes `ambient` to both systems, passes `origin = trackPoint(...)`, keeps the loop while the ambient is live and `net.show` > 0, and redraws on a reduced-motion change (src/main.ts:285-348, 382).
  - Every unit test in Step 1 and every e2e test in Step 2 exists with the brief's name and meaning. The three T7 stills exist.
  - The additions beyond the brief are all controller rulings: `camera.track.turn` and `trackTurn` (round 3), the per-shot `landscape` field (rulings 3/b), `bodyCases.ts` (the Task 6 carry), `CAMERA_NEAR`/`GALAXY_FAR` moved into cameraRig.ts for the pin fence.
- ⚠️ Cannot verify from the diff (for the controller):
  - Whether the author accepts the phone close shot's centre leaving the frame in 1.4 % of frames. It is ruled "accepted for now" and is with the author.
  - Whether a nearer twelve's lit planet shells stay ember-dominant. This was carried to Task 13 when the twelve test was re-pinned with shells off.

### Named risks: what I checked and how

| Risk | Check | Result |
|---|---|---|
| Act I byte-identical | Diff read of the origin and turn path (cameraRig.ts:103-110: `o[k] === 0 ? x : x + o[k]`, `turn === 0 ? p : …`) and main.ts (default page: `galaxy` null, so `origin` and `turn` are undefined; `galaxyShown` is false; the clock module is never imported). **Focused check:** a helper in shots/ ran the base `applyCamera` (from `git show cc91d66:src/scene/cameraRig.ts`) against the new one with `origin [0,0,0], turn 0`, comparing `matrixWorld`, `projectionMatrix` and `fov` element by element with `Object.is`. It covered **every** section of the story (not only Act I) at 41 locals, on 390×844, 1440×900 and 768×1024. | **0 of 1,599 differ.** On `?galaxy=1` in Act I, `trackPoint` of index 0 is `[0,0,0]` and `trackTurn` of turn 0 is 0, so that path is identical too. |
| Purity | Grepped `src` for `performance.now`, `Date.now` and `Math.random` outside tests: only spikes/compare/a comment. `draw` is called only from `frame` with the rAF timestamp, and the clock is the only reader of it for the galaxy. Test mode and reduced motion hold `AMBIENT_POSE` (ambientClock.ts:29); a reduced-motion flip is read on the next frame and requests one (main.ts:382). | Holds. The jump-vs-scroll e2e discriminates (the implementer's `frameCount·0.01` mutation failed it). |
| Float precision | Read the `AMBIENT_WRAP` test (ambientClock.test.ts:45-70). | Genuine. At start + 86,399.9 s the shown ambient is about 3,599.9, it wraps after 6 frames, and every `Math.fround` step is within 1e-3 of 1/60. The float32 ulp at 3,600 is 2.4e-4, so the worst step error is about 4.9e-4. The control shows the unwrapped float32 seconds fail the same bound (ulp 0.0078). |
| Pin fence | Read galaxyShots.test.ts:98-138. **Focused check:** a helper printed `AMBIENT_POSE` and `FREEZE_PINS` at HEAD. | **The pin did not move:** 9.493782472098248, forced-scatter, C1-m5. The close shot's constants have one source (`GALAXY_SHOTS.close` reads `HERO_CLOSE.C1`), and near and far are now shared. **But the essay side of the fence is a test-local copy of main.ts's composition, not main.ts's own code (Important 1).** |
| Galaxy-turn ride | Read netTrack.ts:105-112, cameraRig.ts:109, galaxySystem.ts:159, orbit.ts:98-158. | `trackTurn` calls the one `galaxyTurn` that `bodyWorld`, `galacticToWorld` and the background use, with no duplicate. `applyAxisAngle(+y)` is fenced against `makeRotationY` (cameraRig.test.ts) and against `bodyWorld` (the ride tests, unit and e2e). `camera.track.turn` is in `SCENE_STATE_PATHS` and in `sceneMotion`, both tested. |
| Render loop | Read main.ts:326, 340-349. | The default page is unchanged (`bodies` null means `galaxyShown` false). The loop runs on while the galaxy is shown and the ambient is live, and idles in test mode, under reduced motion and at `?ambient=` without shimmer. The galaxy clause is currently subsumed by `shimmerOn()`, as the report says (Minor 3). |
| Tests use the essay's camera; re-pins still discriminate | Read the framing, minimality, held-system and twelve tests. **Focused check:** a helper swept the twelve's margin over the whole hour at 0.5 s steps, through the same composition. | The held-system test is back on both shots at both sizes. Its precondition ("a held system in frame") keeps it from passing vacuously. The twelve test still counts 3 discs and 9 points, so it catches a wrong lineage set. The framing and minimality tests use a copy of the essay's composition (Important 1). The 30 px margin holds at the 8 grid poses only (Minor 1). |

### Strengths
- The Act I identity is exact, not approximate. The `o[k] === 0` and `turn === 0` guards keep even −0 out, and the fingerprint test has a non-vacuity control (a 1e-9 origin or turn changes it).
- The clock is small, pure and fully specified. Reading `reduced` as a function, and loading the module dynamically only on `?galaxy=1`, keeps the default page from paying for the pin search.
- Riding the turn reuses `galaxyTurn` and fences the rotation sense three ways (against `makeRotationY`, against `bodyWorld` in units, against the page's glows in e2e). It also turns the twelve's framing from a moving target into one composition.
- The tests are honest. Each new test has a stated control ("the case is real"), and the report records a mutation for each one, including the one that could not fail and why.
- `trackTargetWorld` replaces `galaxyShotTarget` and its private data cache rather than living beside it.

### Issues

#### Critical
None.

#### Important
1. **The essay's composed galaxy camera has no single source. The pin fence and the framing tests check copies of it, not main.ts.**
   - Where it is composed:
     - main.ts:306-312 composes Act II's camera inline: keys, then `trackPoint`, then `trackTurn`, then `applyCamera({ compose, origin, turn })`.
     - The same composition is re-written in the tests: galaxyShots.test.ts:101-106 (`essayClose`) and :142-147 (`essayCamera`); e2e/galaxy.spec.ts:382-386 (`twinCamera`) and :238-241 (the held-system camera).
     - `essayClose` is a verbatim copy of `essayCamera` in the same file, called with the close shot and `PIN_SCREEN`.
     - Both e2e copies hard-code `0.1, 4000` rather than `CAMERA_NEAR` and `GALAXY_FAR`, which were moved into cameraRig.ts precisely "so the pin search and the essay share one camera".
   - Why it matters:
     - The pin-camera fence (the named risk) proves that a test copy equals `closeCamera`.
     - It reaches main.ts only through the e2e "camera rides its subject". That test runs at ambients 0 and 7, not the pose, and allows 1.5 px.
     - The twelve's framing and minimality tests reach main.ts not at all (the 311 s glow e2e covers only the ride).
     - A change to how main.ts composes the camera would leave every unit fence green. Examples: where `aspect` comes from, the near and far planes, or an origin taken at a different ambient.
   - **Fix:** export one function from src, for example `galaxyCamera(camera, state, g, data, ambient)` beside `trackPoint`. main.ts, `essayCamera` and `twinCamera` should all call it, and `essayClose` should be deleted in favour of `essayCamera(GALAXY_SHOTS.close, …, PIN_SCREEN, t)`. Then use `CAMERA_NEAR` and `GALAXY_FAR` in the e2e.

#### Minor
1. **The twelve's 30 px margin, and the "nearest whole distance" minimality, hold only at the 8 grid poses** (galaxyShots.test.ts:184-229; galaxyShots.ts:56-63).
   - Swept over the hour at 0.5 s steps through the same composition:
     - The phone's smallest margin is **20.3 px** (C12 at 1,404 s).
     - The desktop's is **27.3 px** (C4-m1 at 893 s).
   - Every body stays inside the frame, so nothing is cut.
   - Since the ride, the stars stand still and only the planet and moon phases vary, so the grid is no longer a natural sample of the worst case. Either:
     - sweep the hour, as the close-derp check already does (cheap); or
     - document `TWELVE_MARGIN_PX` as "at every `AMBIENT_GRID` pose". Its doc now says "every body … keeps clear", which overstates it.
   - Derped bodies are not included either. They are a few px at 87.
2. **The twin half of "the camera rides its subject" is true by construction** (e2e/galaxy.spec.ts:749).
   - `twinCamera` tracks `bodyWorld(C1)`, so C1 projects to the composed target at any ambient.
   - The page assertions (within 1.5 px of the twin, within 1 px between ambients, and the >20 px untracked control) carry the test. This line asserts nothing about the code.
3. **The loop clause cannot fire on its own today** (main.ts:348).
   - `live()` implies `shimmerOn()` (both need no test mode and no reduced motion), so `galaxyShown && live()` never adds a frame.
   - It is kept because the brief asks for it, and the report says so. A one-line comment at the clause would stop a reader assuming it is covered.
4. **Literals that have named sources:**
   - `Float32Array.from({ length: 32 })` for `sysPx` (galaxyShots.test.ts:170) is the renderer's system cap; the galaxy has 30 systems now.
   - The e2e `0.1, 4000` (e2e/galaxy.spec.ts:239, 383). This is folded into Important 1's fix.

### Stills (looked at, phone first)
- **T7-close-a0-390x844:** C1 lower centre (about 195, 640), whole, with six moons on dotted tracks. The upper 65 % is empty under the text.
- **T7-close-a7-390x844:** C1 about 25 px right and a little up, which is its skip (the frame holds still). One moon is cut at the right edge (about 390, 640). This is consistent with the accepted phone-close ruling and is not a finding.
- **T7-hood-pose-390x844:** a field of blue systems with the core's six upper left. It reads as the neighbourhood.
- **T6-twelve-390x844:** three ember stars in a triangle spanning the width (about 148, 438; 304, 442; 126, 702), planet points clear of each other, C1 pale by P1. All are clear of the edges and under the text band. The top 45 % is empty sky.

### Verification run by the reviewer
- `npx tsc --noEmit -p .`: clean.
- `npx vitest run`: 84 files, **1,799 passed**, no warnings or stderr in the log.
- `E2E_PORT=4199 npx playwright test e2e/galaxy.spec.ts e2e/reducedMotion.spec.ts e2e/parity.spec.ts`: **44 passed** (8.7 min), 0 failed, no retries.
- Focused helper checks (in `shots/review7/`, deleted afterwards): the base-vs-new `applyCamera` bit comparison, the pin value, and the twelve's margin over the hour. No source file was modified.

### Assessment
**Task quality:** Needs fixes

**Reasoning:** The clock, the tracking camera, the Act I identity, purity, the float32 wrap and the turn ride are all correct and well fenced, and the pin did not move. But the essay's composed camera exists only inline in main.ts and as four test copies (one verbatim within a file). So the pin fence and the twelve's framing tests prove a copy rather than the code that renders.
