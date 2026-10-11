### Task 7: The ambient clock and the tracking camera (behind `?galaxy=1`)

**Files:**
- Create: `src/scene/ambientClock.ts`, `src/scene/ambientClock.test.ts`
- Modify:
  - `src/main.ts`: owns the clock, passes `ambient` to both systems, keeps the loop running while the ambient is live and `net.show` > 0, and re-evaluates on a reduced-motion change
  - `src/scene/cameraRig.ts`: `applyCamera(..., { compose, origin })`
  - `src/timeline/sceneState.ts`: `camera.track: { a: number; b: number; mix: number }`, defaults 0
  - `src/timeline/netTrack.ts`: `trackPoint`
  - `src/autoAdvance/plan.ts`: `sceneMotion` adds `camera.track.mix`
  - `src/timeline/galaxyShots.ts`: keys target-relative
  - `e2e/reducedMotion.spec.ts`, `e2e/galaxy.spec.ts`

**Interfaces:**
- Consumes: `AMBIENT_POSE` (Task 4), `bodyWorld` (Task 2), `TRACK_TARGETS` (Task 6).
- Produces:
  ```ts
  export const AMBIENT_WRAP = 3600;                      // s: the shown ambient wraps here (float32 ulp at 3600 ≈ 0.00024 s)
  export interface AmbientClock { at(nowMs: number): number; live(): boolean }
  export function createAmbientClock(o: { override: number | null; test: boolean; reduced: () => boolean; startMs: number }): AmbientClock;
  //   override → it; test or reduced → AMBIENT_POSE; else ((nowMs − startMs)/1000) mod AMBIENT_WRAP
  export function trackPoint(track: SceneState['camera']['track'], g: Galaxy, data: BodyData, ambient: number): Vec3; // mix(resolve(a), resolve(b), mix)
  // cameraRig.ts
  export interface CameraOptions { compose?: boolean; origin?: Vec3 } // world = anchor-mapped + origin, for pos and target
  ```
  Act II camera keys become target-relative: `galaxyShotKeys` returns `pos` and `target` relative to the tracked point.

- [ ] **Step 1: Write the failing unit tests.**
  - `ambientClock.test.ts`:
    - `?ambient=101` → 101 whatever the time
    - test and reduced → `AMBIENT_POSE`
    - live → `(now − start)/1000`
    - **"ambient wraps before float32 precision runs out"**: for start + 86,399.9 s, `Math.fround(at(…))` steps by 1/60 ± 1e-3 across 120 frames
  - `cameraRig.test.ts`: origin [0,0,0] is byte-identical to today for every Act I golden; an origin `o` moves `camera.position` and the look target by exactly `o`.
  - `netTrack.test.ts`: `trackPoint` equals `bodyWorld` for a body target at three ambients; mix 0.5 is the midpoint.
  - `sceneState.test.ts`: the path sync picks up the three leaves.

- [ ] **Step 2: Write the failing e2e tests.**
  - `galaxy.spec.ts`, **"the camera rides its subject"**: at the `close` probe with tracking on C1, `?ambient=0` and `?ambient=7`, C1's projected centre (from the TS twin) differs by ≤ 1 px.
  - `galaxy.spec.ts`, **"pure at a fixed ambient"**: at the `hood` probe with `?ambient=101`, jumping vs scrolling is byte-equal.
  - `reducedMotion.spec.ts`, **"the galaxy stops at the pose"**: with reduced motion, two `?galaxy=1` frames 2 s apart are equal; without reduced motion and without `?test`, they differ.
  - `reducedMotion.spec.ts`, **"reduced motion toggled mid-read"**: `emulateMedia` on then off, with no console error. While it is on, the frame equals the `?ambient=<pose>` frame.

- [ ] **Step 3: Run them.** Expected: FAIL.

- [ ] **Step 4: Implement** the clock, `origin`, `trackPoint`, the leaves and the target-relative `galaxyShotKeys`.
  - `main.ts` passes `origin = trackPoint(...)` when `?galaxy=1`. Act I has `track.a = track.b = 0`, so its origin is [0,0,0].

- [ ] **Step 5: Run.** Expected: PASS.

- [ ] **Close-out** A–D. Stills: `T7-close-a0`, `T7-close-a7` (the subject in the same place) and `T7-hood-pose`. Retired: nothing. Re-pinned: `cameraRig.test.ts` gains the origin cases (signature change).

---

