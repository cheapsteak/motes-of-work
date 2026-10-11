# Task 7 report: the ambient clock and the tracking camera (behind `?galaxy=1`)

Status: DONE_WITH_CONCERNS. Base cc91d66, branch main, not pushed.

The phone halves of carried rulings 2 and 3 cannot be met under the constraints the rulings set. The phone's close shot is locked by the freeze-pin fence and `HERO_CLOSE`. The phone's twelve is held to §14.5's values. The desktop halves are done and tested. The numbers and the two possible fixes are under Concerns 1 and 2, and both need a ruling.

## Commits

| SHA | What |
|---|---|
| 299d58d | `ambientClock.ts` and its tests |
| ca22a9d | body parity cases moved to `bodyCases.ts`, and the dark-parity count test |
| c4684f3 | the tracking camera: `camera.track`, `trackPoint`, the rig's `origin`, target-relative `galaxyShotKeys` with landscape framings for close and twelve, the pin-camera fence, `main.ts` (clock, origin, loop), e2e and T7 stills rows |

## What was built

### 1. The ambient clock (`src/scene/ambientClock.ts`)
- `AMBIENT_WRAP = 3600`, and `createAmbientClock({ override, test, reduced, startMs })` with `at(nowMs)` and `live()`, as the brief gives them.
- The value is the override if one is given; otherwise `AMBIENT_POSE` in test mode or under reduced motion; otherwise `((now − start)/1000) mod 3600`.
- `reduced` is a function, read on every call. Turning the preference on stops the clock at the pose on the next frame, and turning it off restarts it on wall time.
- The clock imports `AMBIENT_POSE`, and with it the pin search. So `main.ts` loads it with a dynamic import, and only in `?galaxy=1`. The default page never loads it.
- `main.ts` owns the clock and creates it in the first galaxy frame drawn after the module loads (`startMs` = that frame's timestamp). It passes `ambient` to the background and to the bodies. A galaxy page draws nothing until the module has loaded.
- `?ambient=` is parsed once, into the clock's `override`. The old `GALAXY_AMBIENT` constant is gone.
- The loop keeps running while the galaxy was drawn (`net.show` > 0) and the clock is live. A reduced-motion change already requests a frame.

### 2. The tracking camera
- **`camera.track: { a, b, mix }`**: added to `SceneState`, its defaults (0), `SCENE_STATE_PATHS`, and the three key builders that are not tracked (`shots.ts`, `netShots.ts`, `compare/controls.ts`, all `{0,0,0}`).
- **`sceneMotion`** gains `camera.track.mix`. `a` and `b` are steps, like `net.lampAt`.
- **`netTrack.ts`**:
  - `trackTargetWorld(index, g, data, t)`: index 0 (or null) resolves to [0,0,0]. A body resolves to `bodyWorld`. A centroid resolves to the mean of its bodies. The core and the galaxy resolve to the galactic centre, and the hood to `hoodCentroid`, both through `galacticToWorld`. A step index read mid-way is rounded, as `lampFocusRow` does.
  - `trackPoint(track, g, data, ambient)`: `mix(resolve(a), resolve(b), clamp(mix))`. It returns `a` or `b` exactly at mix 0 or 1.
  - These replace `galaxyShotTarget` and its private data cache, which are deleted.
- **`cameraRig.ts`**:
  - `CameraOptions.origin` is added to the anchor-mapped position and target.
  - A zero component adds nothing, not even turning −0 into +0, so an untracked frame is the old frame bit for bit.
  - `CAMERA_NEAR` (0.1) and `GALAXY_FAR` (4000) moved here from `main.ts`, so the pin search and the essay share one camera.
- **`galaxyShots.ts`**:
  - `galaxyShotKeys(shot, g, aspect, anchors?)` returns keys relative to the tracked point: `target` maps to the point and `pos` to `dir·d` from it. `track` is `{a: trackIndex(target), b: same, mix: 0}`.
  - The keys no longer depend on the ambient, so that parameter is gone. The new `aspect` parameter selects a shot's optional `landscape: { distance, frame }` on a landscape screen (see §3).
  - `main.ts` passes `origin = trackPoint(state.camera.track, …, ambient)` whenever the galaxy is built. It builds the galaxy in any frame whose camera is tracked.

### 3. The carried rulings
1. **The freeze pin's framing is a contract.** `HERO_CLOSE` is unchanged.
   - `ambient.ts` now exports `closeCamera`, `onScreen` and `PIN_SCREEN`. `closeCamera` now uses the essay's near and far planes (0.1 / 4000, before 0.01 / 1000). Projected x and y do not depend on either plane, so the pin did not move: `AMBIENT_POSE` is still 9.493782472098248 and `ambient.test.ts` passes unchanged.
   - Fence (`galaxyShots.test.ts`): on the phone at `AMBIENT_POSE`, the essay camera (`galaxyShotKeys` + `trackPoint` + `applyCamera` with origin) matches `closeCamera`. Every element of both the projection matrix and the world matrix agrees to 1e-6, and the fov agrees.
   - The pinned moon (`pinnedMoon`) and its home land within 1e-6 px of where `closeCamera` puts them. Both are inside the central 60 % of the phone and below 0.42 of its height.
   - A third case checks that the phone tier's bodies are the desktop tier's, which is the tier the pin was searched in.
   - Mutation: aiming the target key 0.01 off makes three cases fail. Restored.
2. **The close shot keeps a derped C1 in frame: desktop done, phone impossible under the fence (Concern 1).**
   - The camera tracks the undisturbed `bodyWorld(C1)`.
   - On a landscape screen the close shot backs off to distance 6.5 and composes wide (frame 0, subject at 0.5, 0.66). That is `GALAXY_SHOTS.close.landscape`; `HERO_CLOSE` and the phone are untouched.
   - Unit check: every 1/30 s across the whole wrap (108,000 frames), C1's whole disc stays inside the 1440×900 frame at full derp gain. The check also confirms the derps carry C1 more than 4 R off its place (the maximum is 1.29 units).
   - Mutation: dropping the landscape distance puts 1,692 frames partly out. Restored.
3. **The twelve frames P1–P3: desktop done, phone not at §14.5's values (Concern 2).**
   - The shot tracks the centroid of P1–P3.
   - On a landscape screen it backs off to distance 128 (§14.5 says 58; this is `GALAXY_SHOTS.twelve.landscape`).
   - Unit check: at every `AMBIENT_GRID` pose, every body of the three systems, moons included, is whole inside the 1440×900 frame. The mutation without the landscape distance fails at the pose with 13 bodies out.
4. **The dark-parity count.**
   - `BODY_CASES` moved out of `parity.ts` (a browser page that runs at import) into `src/parity/bodyCases.ts`, behaviour-neutral. The new file also holds `BODY_DARK_CASES`, `BODY_AMBIENTS`, `sysPxAll`, `bodyAttrsOf` and `allBodyMoteAttrs`.
   - `src/parity/bodyCases.test.ts` checks that the four dark cases are exactly the planet lamp on C1, the star lamp on C1, the core lamp and the lineage lamp on P1, and that each is in `BODY_CASES`.
   - At each parity ambient, each case has at least 8 motes that are visible with the lamp off but have `lampGain` 0. The test also checks that each of those motes is dark with the lamp on (`visible` false, brightness 0).
   - Interpretation: `bodyMote`'s own `visible` already includes `lamp > 0`, so "visible but lampGain 0" taken literally is empty by construction. I read it as "the lamp alone darkens them".
   - Mutation: making the planet lamp light everything gives 0 dark motes at the pose, and the test fails. Restored.
5. **Act I does not change.**
   - `cameraRig.test.ts` fingerprints the composed camera over the 84 Act I golden states on a phone and a desktop: position, world matrix, projection and fov. The fingerprint `9d670404` was computed on the code before the origin existed. Passing no origin and passing origin [0,0,0] both give it, and a 1e-9 origin changes it.
   - The default page never loads the clock module, and its frame code takes the same branches.

## Tests, RED and GREEN

### Unit
RED (each run before its implementation existed):
- `ambientClock.test.ts`: `Cannot find module './ambientClock'`.
- `cameraRig.test.ts`: 3 failed. The fingerprint received `9d670404` against a placeholder, and the origin cases failed.
- `sceneState.test.ts`: 2 failed (the track leaves).
- `netTrack.test.ts`: 5 failed (`trackPoint is not a function`).
- `plan.test.ts`: 1 failed (`moves with camera.track.mix`).

New tests:
- `ambientClock.test.ts`, 5 cases: the override, the pose, live, reduced read on every call, and "ambient wraps before float32 precision runs out". The last runs 120 frames from start + 86,399.9 s. It checks every float32 step is 1/60 ± 1e-3 (taken modulo the wrap), that exactly one wrap is crossed, and a control that the unwrapped float32 steps fail the same bound.
- `cameraRig.test.ts`: the three origin cases.
- `netTrack.test.ts`: five `trackPoint` cases.
- `sceneState.test.ts`: the track leaves.
- `galaxyShots.test.ts`, rewritten: tracking at 0, 123.4 and the pose; the landscape keys; the pin fence (three cases); the close-derp check; the twelve check.
- `bodyCases.test.ts`: 5 cases.
- `plan.test.ts`: `camera.track.mix` moves the stop; `a` and `b` do not.

GREEN: `npx tsc --noEmit -p .` is clean. `npx vitest run`: 84 files, 1,791 tests passed.

### e2e
New:
- `galaxy.spec.ts` **"the camera rides its subject"**, at both sizes. On the twin, C1's projected centre is the same pixel at ambient 0 and 7 (≤ 1 px). On the page, C1 healed (fix 1, so no derp moves it) is drawn with only shells and bodies, the moons masked by the twin. Its lit disc is centred within 1.5 px of the twin at each ambient and within 1 px between the two. Control: untracked, C1 would have moved more than 20 px.
- `galaxy.spec.ts` **"pure at a fixed ambient"** (phone): the hood probe at `?ambient=101`, with the page scrolled from the top in six steps to `layers` 0.5 versus opened there. The frames are byte-equal.
- `reducedMotion.spec.ts` **"the galaxy stops at the pose"** (phone, live page, no `?test`): the hood keys tracked through `?state=`, the galaxy grown, the bike dimmed out (`stage.motes` 0).
  - Under reduced motion, two frames 2 s apart are equal. Without it they differ.
  - Control: the same live page without the galaxy holds still, so what moved was the galaxy.
- `reducedMotion.spec.ts` **"reduced motion toggled mid-read"** (phone): the page opens live, then `emulateMedia` turns reduce on. The frame then equals the frame of a page opened at `&ambient=<AMBIENT_POSE>`. With reduce off again the galaxy runs again. No console or page errors.

Existing tests adjusted:
- `galaxy.spec.ts`: `openShot` (Task 5's tests) now passes `&ambient=0` explicitly. Those tests were measured at the old test-mode ambient of 0, and the test-mode default is now the pose. With tracking at ambient 0, the camera is the old world-anchored camera, so they test the same frames.
- `twinCamera` and the held-system test's camera now track: keys for the screen's aspect, plus `trackPoint` at the frame's ambient as origin. A world-anchored camera at ambient t equals a tracked camera at t, so the Task 6 tests keep their meaning. The close and twelve shots on a desktop are now the landscape framings.

RED for e2e: the five new tests ran against the base `main.ts` with the rest of the change in place (base `main.ts` written into the tree, run, and the saved file copied back and `cmp`-checked).
- 3 failed: the phone ride ("C1 is drawn": 0, because the base camera looks at the world origin), "the galaxy stood still on a live page", and "under reduced motion the frame is not the pose".
- 2 passed:
  - Purity passes because the base is pure too at a fixed ambient. Its mutation is below.
  - The desktop ride passed against the base. The base passes the ambient as the new `aspect` argument: at 0 it took the portrait keys, at 7 the landscape keys, with no origin. That it passed is a coincidence of that mismatch. The mutation below fails both sizes.

Mutations (each made, run, failed, then undone by the exact inverse `sed` and confirmed by `cmp` against the saved `main.ts`):
- Tracking at ambient 0 instead of the frame's ambient: "the camera rides its subject" fails at both sizes (37 px and 36 px off the twin).
- `ambient += frameCount · 0.01` (a state carried from frame to frame): "pure at a fixed ambient" fails (scrolled ≠ jumped).
- `reduced: () => false`: both reduced-motion tests fail ("moved under reduced motion", "not the pose").
- Removing the galaxy's loop clause: the live test still passes, as expected. On a live page the clock is live only when the shimmer is on (both need no test mode and no reduced motion), so the shimmer loop already redraws every frame and the clause is redundant today. I kept it because the brief asks for it, and it stays correct if the shimmer ever stops in Act II. This is the one mutation that did not fail, and the reason is that the clause is redundant, not that the test is weak.

None of the mutation runs was refused by the permission layer.

Full e2e (`E2E_PORT=4199 npm run e2e`, after the last code change, before committing): **184 passed, 12 skipped (the stills without SHOTS=1), 0 failed**, 31.7 min.

## Stills (`shots/galaxy/`), looked at, phone first

`SHOTS=1 … stills.spec.ts -g "T6|T7"`. I wrote `T7-*` and re-ran all of `T6-*` under tracking. All are under `shots/galaxy/`.

- **T7-close-a0 / T7-close-a7 (390×844).**
  - At a0, C1 is at about (195, 641), its six moons round it, with the dotted tracks.
  - At a7, C1 sits about 27 px right and 10 px up. That is not the camera: at 7 s C1 is in a **skip** (derp offset 0.117, 0.048, 0.063 units, checked on the twin), and the frame holds still while C1 moves against it, which is the point of ruling 2.
  - The healed check in "the camera rides its subject" puts the page's C1 within 1 px between a0 and a7, and within 1.5 px of the twin.
  - **Does C1 hold its place between a0 and a7?** The frame does. The drawn planet shifts by its skip, as designed.
  - Desktop: at a0 C1 is at (720, 594), about 64 px in radius, centred under the text column at the wide framing. At a7 it is again about 28 px right in its skip. Both are well inside the frame.
- **T7-hood-pose (390×844).** The neighbourhood at the pose: blue star discs scattered across the frame, the six core bodies upper left, small planet points. It reads as a field of systems. Desktop: the same, wider, with the core's six at upper left.
- **T6-twelve under tracking (ambient 135, lamp 5 on R0).**
  - Phone: three ember stars with ember planet points. P3 is mid-left, P2 upper-middle, and P1 with C1 (pale) sits in the bottom-right corner, its outer planets at the edge. The upper third (under the text) is empty.
  - **The twelve do not fill the frame on the phone.** They are spread wide and P1 is cramped at the bottom. This is Concern 2.
  - Desktop at distance 128: the three ember systems are small in the middle and lower middle, and the core's six blue bodies are on the left (the lineage lamp lights the core). P1's system touches the bottom edge at 135. 135 is not a grid pose, so the unit check does not cover it.
  - The desktop twelve reads as twelve, small, in a lot of empty sky.
- **T6-close-pose under tracking (the pose).**
  - Phone: C1 is low-left, at about (145, 740), radius 63, whole in the frame, mid-burst. The burst moon is on its limb at lower right, and the faint ghost disc is inside the planet. The other moons are on their dotted tracks to the upper right. The phone frame is the pin's and is unchanged from Task 6.
  - Desktop, now at distance 6.5 and composed wide: C1 is at about (667, 700), whole, with the burst moon on its limb and the ghost visible. The frame no longer cuts C1 in half, as it did in Task 6.
  - **Does the close pose frame C1 and the bursting moon well?** Yes on both sizes, at the pose. The phone composition is low-left, and the upper half is empty sky under the text.

## Files

Created: `src/scene/ambientClock.{ts,test.ts}`, `src/parity/bodyCases.{ts,test.ts}`.

Modified:
- source: `src/main.ts`, `src/scene/cameraRig.ts`, `src/timeline/{sceneState,netTrack,galaxyShots,netShots,shots}.ts`, `src/autoAdvance/plan.ts`, `src/compare/controls.ts`, `src/galaxy/ambient.ts`, `src/parity/parity.ts`
- unit tests: `src/scene/cameraRig.test.ts`, `src/timeline/{sceneState,netTrack,galaxyShots}.test.ts`, `src/autoAdvance/plan.test.ts`, `src/compare/controls.test.ts`
- e2e: `e2e/{galaxy,reducedMotion,stills}.spec.ts`

Re-pinned:
- `cameraRig.test.ts` gains the origin cases (the signature change).
- `controls.test.ts`'s camera equality gains `track`.
- `galaxyShots.test.ts`'s world-anchored test became the tracking test.
- `galaxy.spec.ts`'s Task 5 probes name `ambient=0`.

Retired: nothing. The helper scripts in `shots/probe/` and the logs in `shots/` were deleted after use.

## Concerns

1. **Phone close shot (ruling 2): C1 leaves the phone frame during its largest derps, and only a change the rulings forbid can fix it.**
   - Measured over every 1/30 s of the wrap at `HERO_CLOSE` on 390×844, C1's disc is partly out of the frame in 4,599 of 108,000 frames (4.3 %): 2,652 in skips, 988 in reverses, 959 in bursts.
   - Its disc spans x −128..518 and y 419..908 against the 390 × 844 frame. In a skip even its centre leaves the frame.
   - The derps move C1 up to 1.29 units (skip 0.55 r, reverse 0.5 rad, burst jump 0.45 r, with r = 2.2). The phone frame at C1 is about 2 units wide.
   - Fitting every extreme on the phone needs distance ≥ 5.78 (×1.7 of 3.4). That changes `HERO_CLOSE`, so the pin must be searched again. Alternatively the phone framing could be decoupled from the pin.
   - The other option is to accept that C1's biggest derps cross the phone's edge. The freeze's moment, the pose, is in frame.
   - **Needs a ruling.** No phone assertion is committed for this.
2. **Phone twelve (ruling 3): P1–P3 do not fit the phone at §14.5's values.**
   - Tracking the centroid at (−10, 74, 58, 40, 0), the three systems' bodies are out of the phone frame at 9.49 (C2, C12), 0 (C9, C12), 149, 311, 487, 659, 853 and 1061: every `AMBIENT_GRID` pose.
   - The cause is the systems' rigid triangle, which turns with the galaxy and is up to 1.4 phone widths across. Fitting all of them needs distance 98 on the phone (×1.69).
   - The ruling says to change the desktop framing only. I did not touch the phone. **Needs a ruling:** distance ~98 for the twelve on both sizes would replace both of my desktop overrides' role for it.
3. **The desktop overrides are a new per-shot `landscape` field that the keys read through `aspect`.** No rig rule changes Act I, and no scene leaf was added. Task 8's keyframes cannot express a per-orientation distance. When Act II moves to keyframes, this needs either a rig rule (for example, a tracked landscape close shot backs off) or a leaf.
   - The desktop close C1 radius goes from 122 px to about 64 px, near the phone's 59 px.
   - The desktop twelve at 128 is nearly the hood's view (120).
4. **The test-mode default ambient is now `AMBIENT_POSE`**, so the T5 stills, which name no ambient, now show the pose.
5. **The shown ambient wraps once an hour.** The galaxy's turn (1,200 s) is continuous across the wrap, but orbits and derps jump there. This is by the brief's design.
6. **The loop clause is redundant today** (see Mutations).

## Fix round 1

The rulings, from progress.md:
1. The twelve gets one distance that fits both sizes; its landscape override is dropped; the fit is asserted on both sizes.
2. The phone close shot keeps `HERO_CLOSE`. C1's disc may cross the edge, but C1's centre must stay inside the phone frame at every 1/30 s of the hour. If it does not, report it.
3. The desktop close override stays.

Ruling 1 is done. Ruling 2 cannot be asserted: C1's centre does leave the phone frame, and per the ruling I report it rather than change `HERO_CLOSE`. Ruling 3 needed no change.

### 1. The twelve: one distance, 135
The ~98 I estimated was the phone's minimum alone. The desktop needs more:
- On the desktop, frame 0 puts the subject at 0.66 of a short screen.
- The triangle's depth runs down the screen.
- So the desktop runs out of room top to bottom before the phone does side to side.

The table gives the smallest margin, in CSS px, between any body of P1–P3 and the frame edge, over every `AMBIENT_GRID` pose. Moons are included, each as its whole disc, through the essay's tracked, composed camera.

| distance | phone | desktop |
|---|---|---|
| 58 (§14.5) | −136 | −394 |
| 98 | 0.6 | −82 |
| 110 | 22 | −36 |
| 120 | 37 | −6 |
| 125 | 43 | 8 |
| **135** | **54** | **31** |
| 140 | 59 | 42 |

**Chosen: 135** (`TWELVE_DISTANCE` in galaxyShots.ts). That gives at least 31 px of margin on both sizes. Note that 135 is farther out than the neighbourhood probe (120).

What changed:
- `GALAXY_SHOTS.twelve.landscape` is removed. Only the close shot keeps a landscape override, and the shots table now asserts exactly `{ close: { distance: 6.5, frame: 0 } }`.
- The `galaxyShots.test.ts` check now runs at 390×844 and at 1440×900. At every `AMBIENT_GRID` pose, every body of the three systems must be whole inside the frame.
- **Mutation:** with `TWELVE_DISTANCE` back at 58, the phone case fails (`out of the frame at 9.493782472098248: [ 'C2', 'C12' ]`). The desktop case (13 bodies out) and the shots table fail too. I restored it with the exact inverse `sed`, and `grep` confirms 135.

What it did to the e2e:
- "A system held under full detail draws no moon or track mote" ran on the system and twelve shots at both sizes.
  - On the phone at 135, the twelve has no held system in its frame, so the test's precondition ("a held system in frame") failed.
  - The phone now runs the system shot only; the desktop still runs both.
  - This is a re-pin. The case goes untested on the phone's twelve because it no longer occurs there.
- "The twelve light as twelve at the twelve probe" (phone, ambient 135) passes unchanged at the new distance: 3 ember discs of at least 60 px² and 9 points.

### 2. The phone close shot: C1's centre leaves the frame
I ran the same sweep the desktop check uses, at 390×844 through the essay's close camera:
- every 1/30 s of `AMBIENT_WRAP` (108,000 frames);
- every derp at full gain;
- the camera riding C1's undisturbed place.

**C1's centre (its derped `bodyCentre`) is outside the phone frame in 1,509 frames (1.4 %), in 227 separate excursions over the hour.**
- By derp kind: skip 1,185 frames, reverse 248, burst 76.
- The centre spans x −63.9..453.8 against a 0..390 frame, and y 469.5..838.2, which is inside 0..844. So it leaves through the left and right sides only.
- The first excursion is at 6.57–6.80 s; the next starts at 13.37 s.

Per the ruling I did not change `HERO_CLOSE`. **No phone assertion is committed**, because it would fail.

Two things could keep the centre on the phone; each needs a ruling:
- **Smaller planet derps.** A skip pushes C1 0.55 r (1.21 units) out, and a reverse turns it 0.5 rad on its 2.2-unit orbit. Lowering the planets' skip, reverse and burst-jump amplitudes would do it. The pin search reads the moons' derps, so its result must be re-checked if any shared constant moves.
- **Decouple the phone's close framing from the pin's camera.**

### 3. The desktop close shot
Unchanged: distance 6.5, frame 0.

### Stills, re-run, phone first (`shots/galaxy/`)
- **T6-twelve, 390×844** (ambient 135, lamp 5 on R0):
  - Now a compact triangle in the middle of the frame: P2 at about (213, 440), P3 at (134, 500), and P1 at (238, 636).
  - The planets are ember points, and C1 is pale beside P1.
  - All twelve are clear of every edge and well under the text band.
  - The cost is size: the star discs are about 12 px across and the planets are 3–4 px dots. The top 45 % and the bottom 25 % of the frame are empty sky.
  - It reads as twelve, but small. The earlier frame was larger but cut P1's system at the bottom edge.
- **T6-twelve, 1440×900:** much as at 128:
  - The three ember systems are small, in the middle and lower middle.
  - The core's six blue bodies are on the left.
  - P1's system sits near the bottom (centre at y ≈ 830). It is inside the frame at ambient 135, which is not a grid pose.
- **T7-close-a0 / a7 and T7-hood-pose:** unchanged from the first round, since the close and hood shots did not change. The frame holds C1's undisturbed place, and at a7 C1 sits about 27 px right of where it is at a0, in its skip.

### Commands and results
- `npx tsc --noEmit -p .`: clean.
- `npx vitest run`: 84 files, 1,792 tests passed.
  - My first run went alongside the e2e and two untouched tests timed out at the 5 s limit (`background.test.ts` halos, `reveal.test.ts` page order).
  - Run again on its own, everything passed.
- `E2E_PORT=4199 npx playwright test e2e/galaxy.spec.ts`, before the held-system fix: 29 passed, 1 failed (the held-system test above).
- Stills (`SHOTS=1 … stills.spec.ts -g "T6|T7"`): 2 passed.
- Full e2e (`E2E_PORT=4199 npm run e2e`, on the final tree): **184 passed, 12 skipped (the stills), 0 failed**, 33.2 min.

Commit: `6aa5588` galaxy: frame the twelve from one distance on both screens, checked at every grid pose on each, and test held systems only where the shot holds one.

### Files (fix round 1)
`src/timeline/galaxyShots.ts`, `src/timeline/galaxyShots.test.ts`, `e2e/galaxy.spec.ts`. The probe scripts in `shots/probe/` were deleted after use.

### Concerns (fix round 1)
1. **C1's centre leaves the phone frame** in the close shot: 1.4 % of the hour, 227 excursions, mostly skips. It needs a ruling, and nothing committed asserts it.
2. **The twelve at 135 is farther out than the neighbourhood probe (120), and small on the phone** (stars about 12 px). If the author wants the twelve bigger:
   - A different frame value does not help. Each size runs out of room on a different axis: the phone needs 98 for its width, the desktop about 125 for its height.
   - What would help is a camera bearing that rides the galaxy's turn. The triangle would then stand still on screen and could be framed tightly once.

## Fix round 2

The rulings, from progress.md:
- **(a)** C1's centre leaving the phone frame is accepted for now and has gone to the author. I changed nothing for it and added no assertion.
- **(b)** The twelve gets a per-aspect distance. The phone takes the smallest distance that keeps every body of P1–P3 at least 30 px clear of the frame edges at every `AMBIENT_GRID` pose. The desktop keeps 135, through the same `landscape` mechanism the close shot uses.
- **(c)** The held-system test running on fewer shots is accepted.

### The twelve: 116 on the phone, 135 on a desktop
I measured the smallest margin, in CSS px, between any body of P1–P3 (moons included, each as its whole disc) and the edge of the 390×844 frame. The minimum is taken over every `AMBIENT_GRID` pose, through the essay's tracked, composed camera:

| distance | 98 | 110 | 113 | 114 | 115 | **116** | 117 | 120 |
|---|---|---|---|---|---|---|---|---|
| phone margin (px) | 0.6 | 22.0 | 26.7 | 28.2 | 29.6 | **31.1** | 32.5 | 36.6 |

- **The phone distance is 116.** The "about 98–100" in my first-round estimate was the distance with zero margin. The 30 px margin needs 116.
- The code (galaxyShots.ts):
  - `TWELVE_DISTANCE = 116` is the shot's own distance, which a portrait screen takes.
  - `TWELVE_LANDSCAPE = { distance: 135, frame: 0 }` is the twelve's `landscape` value, the same mechanism the close shot uses. At 135 the desktop margin is 31 px.
  - `TWELVE_MARGIN_PX = 30` is exported, and the test reads it.
- The tests (galaxyShots.test.ts):
  - The shots table asserts a distance of 116, and landscape values for both the twelve (135, 0) and the close shot (6.5, 0).
  - At 390×844 and at 1440×900, every body of the three systems is in the frame at every `AMBIENT_GRID` pose, with at least `TWELVE_MARGIN_PX` to every edge.
  - New: "on a phone, from the nearest whole distance that does". At the shot's distance minus 1, some body is within 30 px of an edge, which pins 116 as the smallest whole distance that keeps the margin.
- Mutations, each restored by the exact inverse `sed`, with `grep` confirming 116:
  - **116 → 115:** the phone framing case fails (`[ 'C4-m1 at 1061' ]`), and so does the shots table.
  - **116 → 118:** the minimality case fails, and so does the shots table.
- **The held-system test:** I put the twelve back on the phone in "a system held under full detail draws no moon or track mote" and ran it at 116. It still failed its precondition, "twelve: a held system in frame". No held system comes back into the phone's twelve frame, so the phone still runs the system shot only. The edit was reverted from a saved copy; only the comment changed, from 135 to 116 away.

### The phone still: T6-twelve (390×844, ambient 135, lamp 5 on R0), `shots/galaxy/T6-twelve-390x844.png`
- The three ember systems form a triangle in the middle of the frame:
  - P2 at about (216, 427), with its three planet points round it;
  - P3 at about (124, 496), with its planets;
  - P1 at about (246, 655), its planets spread to the left and right and C1 pale just below it.
- Compared with 135, the star discs are a little larger, about 14 px against 12. The triangle spans about 120 × 230 px against 105 × 200.
- Everything is clear of the edges and well under the text band.
- It reads as twelve, but still small: the top 45 % and the bottom 20 % of the frame are empty sky. The 30 px margin at the worst grid pose (C4's moon at 1061 s) is what sets the size at every other ambient.

### Commands and results
- `npx tsc --noEmit -p .`: clean.
- `npx vitest run`: 84 files, 1,793 tests passed.
- Held-system probe (the twelve on both sizes): 1 failed (phone, the precondition), 1 passed (desktop). Reverted.
- Stills (`SHOTS=1 … stills.spec.ts -g "T6"`): 1 passed.
- Full e2e: **not completed.** The container restarted while it was running, at test 66 of 196, with no failure up to that point. The round-2 tree was committed as it stood (`4cad826`, galaxy: frame the twelve nearer on a phone, from the nearest whole distance that keeps 30 px round every body, and keep the desktop further out). The round-3 full e2e below runs on the tree that follows it.

### Files (fix round 2)
`src/timeline/galaxyShots.ts`, `src/timeline/galaxyShots.test.ts`, `e2e/galaxy.spec.ts` (comment only). The probe scripts were deleted after use.

### Concerns (fix round 2)
1. **The phone twelve is still small.** 116 is only 14 % nearer than 135. Most of the frame's room goes to the one grid pose where the triangle lies widest (1061 s), because the triangle turns with the galaxy under a camera with a fixed bearing. A bearing that rides the galaxy's turn would let one tight frame hold the triangle at every ambient.
2. **The phone close centre** (accepted for now, with the author).

## Fix round 3

The ruling: take my own suggestion. The twelve's camera bearing rides the galaxy's turn, using the turn the bodies use, so P1–P3 hold one composition at every ambient. This applies to the twelve only; the close shot and the pin camera are unchanged. The phone distance and the desktop landscape distance are each refitted to the smallest whole distance that keeps the 30 px margin at every `AMBIENT_GRID` pose. If riding the turn reads worse than 116 and 135, I was to say so and keep round 2.

### How the ride works
- **`camera.track.turn`** is a new scene leaf, 0 by default. It says how far the camera's bearing rides the galaxy's turn about the tracked point: 0 stands still in the world, 1 turns with the galaxy. It is in `SCENE_STATE_PATHS`, `sceneMotion` (a ride that comes in or goes out is camera motion), the zero tracks of `shots.ts`, `netShots.ts` and `compare/controls.ts`, and the sceneState and plan tests.
- **`trackTurn(track, ambient)`** (netTrack.ts) returns `clamp(turn) · galaxyTurn(ambient)`. `galaxyTurn` is the same function that turns the bodies (`bodyWorld`) and the background (`galaxySystem.ts`), so the turn is not duplicated.
- **`CameraOptions.turn`** (cameraRig.ts) gives radians about +y. The anchor-mapped position and target are turned about the origin before the origin is added, using three's `applyAxisAngle` about +y, the same rotation as the background's `makeRotationY`. A turn of 0 skips the step, so Act I's fingerprint `9d670404` still holds; a cameraRig test checks turn 0 and a 1e-9 turn. A second new test checks that a turn of 0.7 swings the camera and its look target about the origin exactly as `makeRotationY` does.
- **`GalaxyShot.ridesTurn`**: `galaxyShotKeys` writes `track.turn` = 1 when it is set, else 0. Only the twelve sets it. The close shot's track is `turn: 0`, so the pin fence (projection and world matrices to 1e-6 at the pose) is untouched and still passes.
- **`main.ts`** passes `turn: trackTurn(state.camera.track, ambient)` beside the origin. The e2e twins (`twinCamera` and the held-system camera) do the same.

### Refit
At ambient 0 the galaxy has not turned, so the twelve's composition is §14.5's bearing (−10) at ambient 0, at every ambient. Only the planets and moons move round their stars. The smallest margin, in CSS px, between any body of P1–P3 (moons included, each as its whole disc) and the frame edge, over every `AMBIENT_GRID` pose:

| distance | 80 | 85 | 86 | **87** | 90 | 100 | 135 | 150 | 160 | 161 | **162** | 165 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| phone | 15.9 | 26.3 | < 30 | **30.2** | 35.6 | 51.3 | 88.3 | | | | | |
| desktop | | | | | | | −28.6 | 7.1 | 26.9 | 28.7 | **30.5** | 35.8 |

- **Phone: 87, down from 116.** That is 25 % nearer, so everything in the twelve is a third larger.
- **Desktop: 162, up from 135.** That is 20 % further, so everything is smaller. On a wide screen the ridden composition is the tall one: the triangle's length runs down the short side at every ambient, whereas unridden the triangle came round to lie across the screen at some poses.

### Tests and mutations
Framing (`galaxyShots.test.ts`):
- The shots table asserts 87 and landscape `{ twelve: { distance: 162, frame: 0 }, close: { distance: 6.5, frame: 0 } }`.
- The tracking test asserts `track.turn` is 1 for the twelve and 0 for every other shot.
- At 390×844 and at 1440×900, every body of P1–P3 is at least 30 px clear of every edge at every `AMBIENT_GRID` pose.
- **New, per size:** "rides the galaxy's turn: P1, P2 and P3 hold their places on screen at every `AMBIENT_GRID` pose". Each star stays within 1e-3 px of its place at ambient 0. Control: the same shot without the ride moves a star more than 50 px by 311 s. This test also fences the camera's rotation sense against `bodyWorld`'s.
- **Minimality, now on both sizes:** one unit nearer on the phone (86) and one unit nearer on a desktop (161) each leaves some body within 30 px of an edge.

Each mutation was made with `sed` and undone with the exact inverse `sed`; `grep` confirmed 87, 162 and `ridesTurn: true` afterwards.

| mutation | what failed |
|---|---|
| 87 → 86 | phone framing, shots table |
| 87 → 88 | minimality, shots table |
| 162 → 161 | desktop framing, shots table |
| `ridesTurn: false` | 5 cases: tracking, phone framing, both ride cases, minimality |

**New e2e, both sizes** (`galaxy.spec.ts`): "the twelve ride the galaxy's turn: P1, P2 and P3 glow where they stood at ambient 0".
- The page opens the twelve probe at ambient 311. For each of P1, P2 and P3, one of the page's glow sprites (`__motes.glows()`) must be within 1 px of where the ridden twin puts that star at ambient 0.
- Passes at both sizes.
- **Mutation:** `main.ts` passing `turn: 0`. The test fails at both sizes; P1's nearest glow is 129 px away on the phone and 140 px on the desktop. Undone by the exact inverse `sed`, confirmed by `grep`.

**Held-system test: the phone's twelve is back in it.** At 87 the phone's twelve frames held systems again. I ran "a system held under full detail draws no moon or track mote" with the twelve restored on the phone and it passed at both sizes. So the test again runs the system and twelve shots on both sizes, as round 2's ruling asked.

**The full e2e on `9b0f6ab` failed in two tests:**
1. **"The twelve light as twelve at the twelve probe"** (phone, ambient 135, lamp 5 on R0) found 3 ember discs but only 8 ember points, not 9. The missing one is C10.
   - Its lit point's core reads 255,185,162. The classifier wants red to exceed green by more than 70 (and blue by more than 90), so it fails by one level of green. C7's point reads 255,180,155 and passes.
   - What I ruled out:
     - C10's moon (2 px off C10): forcing moons, tracks and derps off changed nothing.
     - The ambient: the pose fails the same way.
     - The ride: the test passes at 116 ridden and at 116 unridden.
   - What causes it: forcing only the planet shells off makes it pass. At 87 the three systems are past the planet shells' band (25–50 px), so each lit planet is drawn with its lit shell (0.8 ember) under its point. That pales C10's point just past the classifier's line.
   - The fix: the test now forces `LodElement.PlanetShell` to 0 and counts the planets as their lit points. With that it passes, and `TWELVE_AMBIENT` stays at 135, with its comment updated.
   - **This is a re-pin of a Task 6 test.** It no longer sees the lit shells at the twelve on a phone. Whether a nearer twelve's lit planets still read as ember is a question about the look, which I take to Concerns.
2. **`spikes.spec.ts` "index lists every spike in sentence case"** failed with "browser.newContext: Test ended". That is the setup flake already in the ledger. It passed when re-run on its own.

### Stills (`shots/galaxy/`), phone first
- **T6-twelve, 390×844** (ambient 135, lamp 5 on R0):
  - The triangle now spans the phone's width: P3 at about (148, 438), P2 at (304, 442), and P1 with its system at (126, 702), with C1 pale beside it. It is about 180 × 265 px, against 120 × 230 at 116.
  - The star discs are about 15 px, and the planet points are clear of one another.
  - It reads as twelve, larger and better spread than at 116 or 135. The top 45 % of the frame, under the text, is still empty sky.
- **T6-twelve, 1440×900:**
  - The triangle stands tall and small in the middle and lower middle: P3 at about (668, 500), P2 at (840, 504), P1 at (645, 788).
  - The core's four lit blue bodies are at the upper left.
  - It reads as twelve, but smaller than at 135.
- **Does the galaxy behind look frozen in a way that misleads?** No.
  - The background is in the galaxy's own frame, so at the twelve it stands still on screen while the planets go round their stars.
  - That is what galaxy §8 describes for the neighbourhood shots: "the neighbourhood shots are still … only the galaxy wides show the turn against the frame".
  - Nothing on screen claims the turn at this shot, and the stars stay where the lineage story puts them.
- **T7-\*:** unchanged; the close and hood shots do not ride.

### Commands and results
- `npx tsc --noEmit -p .`: clean.
- `npx vitest run`: 84 files, 1,799 tests passed.
- Stills (`SHOTS=1 … stills.spec.ts -g "T6|T7"`): 2 passed.
- Full e2e on `9b0f6ab`: 184 passed, 2 failed (both described above), 12 skipped.
- Full e2e on the fixed tree (`d67259f`, apart from a one-word comment fix made after the run): **186 passed, 12 skipped, 0 failed**, 31.1 min.

### Commits
- `4cad826` round 2 as it stood.
- `9b0f6ab` galaxy: the twelve ride the galaxy turn about their centroid, holding one composition at every ambient, refitted nearer on a phone.
- `d67259f` galaxy: count the twelve as lit points with the planet shells off, and test held systems at the twelve on the phone again.

### Concerns (fix round 3)
1. **Riding the turn is better on the phone (87 instead of 116) and worse on a desktop (162 instead of 135).** I kept the ride on both, so that one shot reads the same way on both and both hold one composition. If the desktop should come nearer, there are two ways:
   - A landscape bearing turned about 90°, so the fixed triangle lies across the wide screen. This changes a §14.5 value, but only for the landscape screen.
   - No ride on a landscape screen. This keeps 135, but the desktop triangle turns again.

   Both need a ruling. Task 8's rule for per-aspect framing would carry either.
2. **The new leaf `camera.track.turn`** is what lets keyframes carry the ride in Task 8. It is a second camera leaf beside `track.mix` that Task 8's netShots must set.
3. **A nearer twelve meets the lit-shell look.** At 87 on the phone, P1–P3 draw their lit planet shells. One planet (C10) then pales just past the ember classifier, which test 12 used to count lit planets.
   - The twelve test now counts lit points with the shells forced off.
   - Seen by eye, C10 still reads pink-ember in T6-twelve.
   - Task 13 (pixels) or the author should rule on whether a lit shell at this size must stay ember-dominant.

## Fix round 4

This round fixes the review's Important and four Minors (`task-7-review.md`) and applies the ruling on the desktop twelve (progress.md).

### Important 1: one source for the composed essay camera
Before this round, the essay camera was composed in five places: main.ts's draw, `essayCamera` and `essayClose` in galaxyShots.test.ts, and `twinCamera` and the held-system camera in galaxy.spec.ts. Now there is one path:

- **`createEssayCamera(aspect, galaxy)`** (cameraRig.ts) builds the camera with a 40° field, `CAMERA_NEAR`, and `GALAXY_FAR` in galaxy mode (the new `ESSAY_FAR`, 400, otherwise). main.ts creates its camera with it.
- **`composeEssayCamera(camera, state, anchors, galaxy, ambient)`** (netTrack.ts, beside `trackPoint`) poses the camera every frame. It applies the keys of `state` through the anchors, composed round the text. Once the galaxy is built (`galaxy = { g, data }`), it also takes the origin from `trackPoint` and the swing from `trackTurn`. With `galaxy` null, or with Act I's untracked keys, the camera is as it always was. main.ts's draw now calls only this.
- **`galaxyShotCamera(shot, g, data, size, t)`** (galaxyShots.ts) is main.ts's probe-shot path: `createEssayCamera`, then `galaxyShotKeys` for that screen, then `composeEssayCamera`.

What now calls `galaxyShotCamera`:
- the pin fence, which replaces `essayClose` with `galaxyShotCamera(GALAXY_SHOTS.close, phone, phoneData, PIN_SCREEN, t)`;
- `essayCamera` in galaxyShots.test.ts, now a one-line wrapper;
- `twinCamera` and the held-system camera in galaxy.spec.ts.

The literals `0.1, 4000` are gone, and so are the test-side imports of `applyCamera`, `trackPoint`, `trackTurn` and `mergeState`.

**Mutation:** I doubled the near plane in `createEssayCamera`, the camera main.ts creates. The pin fence ("at AMBIENT_POSE on the phone: the same projection and world matrices, to 1e-6") fails. Restored with the exact inverse `sed`.

### Minor 1: the twelve, swept over the hour
The framing and minimality checks now sweep every 1/30 s of `AMBIENT_WRAP`, the same step as the close-derp check, instead of the 8 grid poses:
- Each frame is posed through `galaxyShotCamera`, which is main.ts's path.
- Each size's body positions are computed once and shared between the framing and minimality checks.
- Moons are included, undisturbed. Derped bodies are still left out; they are a few px at these distances.
- The doc on `TWELVE_MARGIN_PX` now says "at every 1/30 s of the hour".

Refitted with the sweep:
- **Phone: 93.** At 87 the hour's worst margin is 20.3 px (the reviewer's figure), so 87 no longer holds 30 px. At 93 the worst margin is 31.3 px.
- **Desktop: 82, at landscape bearing −105.** See Ruling 6.

Each mutation below was undone by its exact inverse `sed`:

| mutation | what failed |
|---|---|
| phone 93 → 92 | phone hour framing, shots table |
| phone 93 → 94 | minimality, shots table |
| desktop 82 → 81 | desktop hour framing, shots table |
| desktop 82 → 83 | minimality, shots table |
| landscape bearing −105 → −10 | desktop hour framing, shots table |

The twelve unit tests take about 25 s in all.

### Minor 2: the twin line removed
In "the camera rides its subject", the twin-only assertion was true by construction, so I deleted it. The page assertions carry the test:
- the page draws C1 within 1.5 px of the twin at ambient 0 and at 7;
- the page's C1 is within 1 px between the two ambients;
- the control: untracked, C1 would have moved more than 20 px.

The test's comment now says that.

### Minor 3: the loop clause
main.ts now says at the clause that `live()` implies `shimmerOn()` today, so the galaxy's clause adds no frame and is there in case the shimmer ever stops.

### Minor 4: named caps
`sysPx` arrays now use `SYS_MAX` (generate.ts) in galaxyShots.test.ts and galaxy.spec.ts. The near and far planes are covered under Important 1.

### Ruling 6: the desktop twelve lies across the screen
- `GalaxyShot.landscape` may now carry a `bearing`, and `galaxyShotKeys` takes it on a landscape screen.
- Riding the galaxy's turn holds one composition at every ambient, so the bearing sets the composition outright.
- Smallest whole distance with 30 px over the hour, on 1440×900, by landscape bearing:

  | bearing | −10 (phone's) | 50 | 65 | 80 | 95 | 110 | −70 | −85 | −95 | **−100** | **−105** | −110 | −115 | −130 |
  |---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
  | distance | 164 | 81 | 102 | 119 | 132 | 138 | 143 | 119 | 100 | 90 | **82** | 88 | 92 | 103 |

- **Chosen: bearing −105, distance 82.** That is a turn of 95° from the phone's −10, and the nearest fit near a quarter turn either way. (50, a 60° turn, fits at 81, but it is not "about 90°".)
- The desktop twelve is now nearer than the phone's (82 against 93), down from 162.
- Checked in the unit tests:
  - the hour sweep and minimality at 82;
  - the ride test, which holds P1–P3 in place at every grid pose at both sizes, and still passes with the landscape bearing;
  - the shots table, which asserts `{ distance: 82, frame: 0, bearing: -105 }`.

### Stills, phone first (`shots/galaxy/`)
- **T6-twelve-390x844 (93):** the triangle much as at 87, a little smaller: P3 at about (151, 444), P2 at (297, 448), and P1 with its planets at (131, 690), C1 pale beside P1. All twelve are clear of every edge and under the text band. The star discs are about 14 px.
- **T6-twelve-1440x900 (82, bearing −105):**
  - The three systems now lie across the wide screen: one at upper left, about (522, 385); one at lower left, (528, 713), with its dotted orbits; and one at lower right, (1123, 698), with C1 pale beside it.
  - The star discs are about 28 px, with their lit shells showing, and the planets are clear ember points.
  - Nothing is near the text band; the topmost body is at y ≈ 338.
  - The core's bodies are now out of the frame.
  - It reads as twelve and fills the wide frame far better than at 162.
- **T7-close-a0/a7, T7-hood-pose:** unchanged.

### Commands and results
- `npx tsc --noEmit -p .`: clean.
- `npx vitest run`: 84 files, 1,799 tests passed.
- Stills (`SHOTS=1 … stills.spec.ts -g "T6|T7"`): 2 passed.
- Full e2e (`E2E_PORT=4199 npm run e2e`, on `259890f`): **186 passed, 12 skipped (the stills), 0 failed**, 31.3 min.

### Commits
- `259890f` galaxy: one composed essay camera for main and every twin, the twelve fitted over the whole hour, and turned across a wide screen.

### Concerns (fix round 4)
1. **The desktop twelve now shows lit planet shells and dotted orbits.** At 82 the systems are near full detail. Test 12 (lit points, shells forced off) runs only on the phone, so whether these desktop shells read as ember is not tested. It falls under the look question already raised for Task 13.
2. **The phone twelve went from 87 to 93, so it is about 6 % smaller.** That is the price of holding 30 px over the whole hour rather than at 8 poses.
