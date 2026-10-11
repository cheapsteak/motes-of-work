# Task 7 re-review: fix round 4 (d67259f..259890f)

Scoped re-review of one fix diff. No tracked file was modified. `git status` is clean at 259890f.

## Verification
- `npx tsc --noEmit -p .`: clean.
- `npx vitest run`: 84 files, 1,799 tests passed. Duration 119 s. Playwright was not run, as instructed.

## The three named checks
1. **main.ts has one path.**
   - It creates the camera with `createEssayCamera(1, galaxyMode)` (src/main.ts:~167).
   - It poses the camera with `composeEssayCamera(camera, state, anchors, galaxy|null, ambient)` (src/main.ts:309).
   - main.ts no longer imports `applyCamera`, `trackPoint`, `trackTurn`, `PerspectiveCamera`, `CAMERA_NEAR` or `GALAXY_FAR`.
   - Grepping src, e2e, shots and scripts finds `applyCamera` with `origin`/`turn` only in `composeEssayCamera` (netTrack.ts:132). The rest are Act I twins with no galaxy, or the independent pin search (ambient.ts), which galaxyShots.test.ts fences against `galaxyShotCamera`.
   - `applyCamera` still ends with `updateMatrixWorld()`, so the twins that dropped their own call are fine.
2. **Every galaxy twin uses the same functions.**
   - The unit tests (galaxyShots.test.ts) call `galaxyShotCamera`: the pin fence (`essayClose`), `essayCamera`, the close-derp check, the twelve's framing and minimality, and the ride.
   - The e2e tests (e2e/galaxy.spec.ts) call it through `twinCamera` and the held-system camera. Their `0.1, 4000` literals and `applyCamera`/`trackPoint`/`trackTurn`/`mergeState` imports are gone.
   - `galaxyShotCamera` calls `createEssayCamera(aspect, true)` and `composeEssayCamera`, the same two functions main.ts calls.
   - Two small steps remain outside the shared function, both trivially equal. main.ts writes `state.camera = galaxyShotKeys(shot, galaxy, camera.aspect)` inline, where the twin does `mergeState(default, { camera: galaxyShotKeys(...) })`. The aspect is `camera.aspect` in main.ts and `width/height` in the twin.
   - The mutation the implementer ran (doubling the near plane inside `createEssayCamera`) fails the pin fence. That is the evidence that the fence now reaches the code main.ts calls.
3. **The twelve's checks sweep the whole hour through that path.**
   - `crowded()` loops `AMBIENT_WRAP * 30` frames, every 1/30 s. Each frame is posed through `galaxyShotCamera`. Every body of P1-P3 and their moons is checked against `TWELVE_MARGIN_PX`.
   - The minimality test calls the same function at distance-1 on both sizes, through the same path. Its `limit = 1` only stops it early, and it is a valid test.
   - The distances were refitted to 93 (phone) and 82 (desktop). The report's mutation table (92, 94, 83, 81, bearing -10) fails the matching tests each time.
   - Cost: about 25 s, with 120 s timeouts set.
   - The doc on `TWELVE_MARGIN_PX` now says "at every 1/30 s of the hour".

## Findings
- **Important 1 (essay camera has no single source): resolved.** See the checks above.
- **Minor 1 (twelve margin only at the grid poses): resolved.**
  - The margin and minimality checks now sweep the hour at 1/30 s. The review's 0.5 s sweep found phone 20.3 px and desktop 27.3 px, and the refits at 93 and 82 hold 30 px.
  - The doc is corrected. Derped bodies are still left out, which the review had already accepted as a few px.
- **Minor 2 (vacuous twin line): resolved.** The twin-only assertion is deleted. The page-vs-twin (1.5 px), the page-between-ambients (1 px) and the untracked >20 px control remain, and the comment now says so.
- **Minor 3 (loop-clause comment): resolved.** main.ts's frame() comment says that `live()` implies `shimmerOn()` today, so the galaxy clause adds no frame and is kept for if the shimmer ever stops.
- **Minor 4 (literals with named sources): resolved.**
  - `sysPx` uses `SYS_MAX` in galaxyShots.test.ts and galaxy.spec.ts.
  - The `0.1, 4000` literals are gone, replaced by `CAMERA_NEAR`/`GALAXY_FAR` inside `createEssayCamera`.
  - `ESSAY_FAR` (400) names the other far plane, which was an inline literal in main.ts.
- **Desktop ruling (twelve turned about 90 degrees on landscape): resolved.**
  - `GalaxyShot.landscape.bearing` is added. `galaxyShotKeys` uses it only when `landscape` is set and the screen is not portrait, the same predicate as `galaxyShotDistance`. The phone stays at -10.
  - The twelve on landscape is bearing -105, a turn of 95 degrees, at distance 82, fitted to 30 px over the hour. The sweep table in the report shows -105 as the nearest-to-a-quarter-turn fit. The shots table pins `{ distance: 82, frame: 0, bearing: -105 }`.
  - The desktop still (T6-twelve-1440x900) shows the three systems lying across the wide frame, with nothing near the edges.
  - The carry to Task 13 (lit planet shells at the desktop's nearer distance are untested, and the twelve-as-points test is phone-only) is recorded in progress.md. It is not re-raised.

## New issues
- Critical: none.
- Important: none.
- Minor, not blocking:
  - The "tracks the shot's target" keys test (galaxyShots.test.ts ~:68-90) checks the phone aspect only, so the landscape bearing is asserted through the hour sweep and the shots table, not by that test.
  - The report calls `galaxyShotCamera` "main.ts's probe-shot path", but main.ts does not call it. It calls `galaxyShotKeys` and then `composeEssayCamera`, which `galaxyShotCamera` also does. The claim is true in effect and loose in wording.
