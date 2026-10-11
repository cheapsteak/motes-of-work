# Task 6 report: polish from the visual review, and the reveal mannequin

Status: DONE_WITH_CONCERNS (concerns at the end)

## Commits (on plan-1-foundation, not pushed)

- b514c5d bike: the wrong twin steers to about 26 degrees, so its saddle visibly cocks
- c6677ab bike: a thin nose-down saddle, bolder brake levers, denser pedals
- b5675bb bike: a schematic grey mannequin that rides the wrong twin's saddle
- ddf9b93 scene: draw a mechanism's rider as its own dim grey point set
- 35e1d14 story: the reveal turns to full lock, rises to a high front three-quarter, and seats the mannequin
- d7b333b brief card: a ticked box a hair quieter than the text
- 485b881 lighting: a softer key (0.85), so flat tops lit square-on stop blowing out
- 5ac9306 purity: prove the reveal frame it checks carries the mannequin
- 85b72a3 docs: the optional rider in the mechanism contract

## What I implemented

### A. Readability of the swap
1. **Twin steering.** `kinematics.ts` exports `STEER = 0.14` and `STEER_TWIN = 0.45`. `steer(drive, variant = 0)` returns `STEER * (1 + (STEER_TWIN/STEER - 1) * variant) * sin(pi drive / 2)`, so the amplitude is blended as a parameter. `pose` uses `steer(drive, variant)` for the whole front, meaning the fork, front wheel, front brake, front mudguard and the twin's saddle. A saddle steering 26 degrees on a fork steering 8 would twist on its post. The ghost uses variant 0, so it still steers 8 degrees. Continuity tests pass at variants 0 to 1.
   - Keyframes: `mech.drive` goes vibe-build@1 2, reveal@0.3 3, reveal@0.4 3.08, reveal@0.6 3.08 (the still hold), reveal@1 3.28. I used 3.28 rather than 3.3 because 3.3 gives |sin| = 0.891, which breaks the brief's own ">= 0.9". With 3.28 the minimum is 0.904.
2. **Reveal camera: high front three-quarter.** I started from the review's numbers. In the frames, the review's framing put the rear wheel under the text panel and clipped the front wheel and ground at the bottom. Including the mannequin, the subject is about twice as tall as the bike alone. I kept the review's view direction, pulled the camera back 1.3 times and panned it to centre the subject in the free area. Final keys: pos reveal@0.3 [2.03, 2.28, 3.2] and reveal@1 [1.62, 2.07, 3.34]; target [-0.77, 0.13, 0.47] and [-0.79, 0.19, 0.35]; fov 33. That gives a bearing of 46 then 39 degrees toward the front wheel and an elevation of 29 then 26 degrees.
   - The camera now arrives at reveal@0.3, not 0.5. While it was still in transit, the fading-in mannequin's head clipped the top of the frame.
3. **Saddle silhouette.** The saddle is 0.028 thick. The nose taper is `0.55 - 0.45 cos`. The body is tilted 4 degrees nose-down about the saddle-top point, so the top still passes through `SADDLE_TOP` and every fit measurement is unchanged. Saddle density is 0.5. `SADDLE = { thick, noseDown }` is exported for the rider. In the shots it stays amber, not white.
4. **Further items:**
   - The brake-lever tube radius is 0.007.
   - Pedal density is 1.4. In mech-bike-assembled and spec-0.9 the pedals now read warm amber.
   - The ticked brief box's background is `rgba(236, 235, 242, 0.85)`.
   - `keyStrength` is 0.85. Every lit-faces floor still holds, measured via the e2e annotations:

     | Mechanism | Front/back at key 1.0 | Front/back at key 0.85 | Floor |
     |---|---|---|---|
     | Bike | 1.133 | 1.119 | 1.05 |
     | Gears | 1.248 | 1.226 | 1.2 |
     | Steam | 1.365 | 1.345 | 1.2 |
     | Strandbeest | 1.590 | 1.565 | 1.2 |
     | Watch | 1.568 | 1.545 | 1.2 |

     I updated the measured numbers in the looks.spec comment.
   - **vibe-build@1 camera y:** I set it to **0.18, not 0.4**. Numbers: whole-bike anchor centre y is 0.067 and radius is 2.39. Camera y in metres above the ground: -0.12 gives 0.35 m (the old value), 0.18 gives 0.67 m, 0.4 gives 0.90 m. The bottom bracket is at 0.27 m, the twin's handlebars at about 0.89 m, the twin's saddle top at 1.08 m and the correct saddle at 0.97 m.
     - At 0.4 the camera is still below both saddles, so 0.4 would not achieve "not below the saddle". It would also put the cold open at handlebar height, which is not "low, slightly above the bottom bracket".
     - The test's bounds (bottom bracket to two tyre heights, 0.27 to 0.68 m) therefore still express the spec intent, and I left them unchanged.
     - 0.18 is the highest value inside them. Side by side, the frames at 0.4 and 0.18 read almost the same.
     - The compare page's "Cold open" preset, which is fenced to this key, is updated to match.
   - Skipped as instructed: fault amplitudes and a ghost at the reveal.

### B. The mannequin
- **Model:** `src/mechanisms/bike/rider.ts`.
  - **Proportions.** `RIDER_HEIGHT = 1.75` and `PROPORTIONS` hold the Winter fig. 4.1 table.
  - **Skeleton.** `riderSkeleton()` returns every joint in the saddle's part space, about the seat clamp.
  - **Geometry.** `riderGeometry()` merges capsules for: head, neck, chest bar, waist, shoulder line, pelvis, upper arms, forearms, hands, thighs, shanks and feet.
  - **Seat.** The hip joints sit 0.02 m above the saddle's top surface and 0.07 m behind the saddle-top point, on the saddle's broad back.
  - **Torso.** It is pitched 78 degrees. Its length is Winter's standing joint-to-joint value, (0.818 - 0.530) H.
  - **Neck.** Its length is (1 - 0.130 - 0.818) H.
  - **Hands.** The grip targets are the correct bike's grips relative to its seat clamp: `STEER_MOUNT + GRIPS[i] - SEAT_CLAMP`. Each hand is pitched 60 degrees down and holds 0.25 of the way along its length.
  - **Feet.** They sit on the correct bike's pedal positions relative to the seat clamp, at 20 and 30 degrees below forward. They hang low and do not pedal.
  - **Elbows and knees.** Solved with two-bone IK.
  - **Resulting angles:** elbows 23 degrees, hips 114 and 118, knees 56 and 50.
  - **Cross-check against Wang and Peng.** Shoulder-to-wrist comes out at 0.325 H against their 0.318 H. Hip-to-shoulder uses Winter's 0.288 H; their seated figure is 0.313 H.
- **Contract:** `Mechanism.rider?: Rider`, where `Rider` is `{ part, samplePoints(count, seed) -> { positions, normals } }`. The bike's rider rides the `saddle` part, with points sampled in world units in that part's space.
- **Rendering:** `src/scene/mote/riderPoints.ts`. This is the simplest approach I found that keeps purity. It is a three.js `Points` object with a stock `PointsMaterial` and no custom GLSL, and mote.glsl and mote.ts are untouched.
  - Dots are 2 CSS px with additive blending and no depth write.
  - Colours are neutral grey, r = g = b = 0.62, multiplied by a key-light shading baked once at build time. Alpha is 0.55 times `overlay.rider`.
  - The point count is 3% of the mote budget: 3000 at 100k.
  - Because every point is in the saddle's part space, the whole object takes the saddle's transform from `partTransforms(mech, state)` each frame. `moteSystem` adds the object only for mechanisms that have a rider.
  - The frame is a pure function of state: there is no clock and no accumulated state. It turns with the saddle because it is the saddle's transform.
- **SceneState:** a new leaf, `overlay.rider`, added to `defaultSceneState` and `SCENE_STATE_PATHS`. Its keyframes are 0 at reveal@0.18, 1 at reveal@0.32 (inOutQuad), 1 at reveal@0.75, and 0 at reveal@0.9.
- CREDITS.md "Facts and data" credits Winter after Drillis and Contini (1966), and Wang and Peng (2023) for the cross-check. docs/adding-a-mechanism.md documents the optional rider.

## Tests and results
- `npx tsc --noEmit -p .`: clean.
- `npx vitest run`: 47 files, 636 tests passed.
- `E2E_PORT=4196 npx playwright test`: 83 passed, 7 skipped (the ones gated on SHOTS), in 7.7 min.
- `SHOTS=1 E2E_PORT=4196 npx playwright test e2e/shots.spec.ts e2e/compare.spec.ts`: 26 passed.

New and changed tests:
- **kinematics:** the twin amplitude blends by variant, and full lock is -25.8 degrees.
- **bike index:**
  - The twin's saddle turns by `steer(d, 1)`, and its yaw at full lock is over 20 degrees, against under 9 for the correct bike's bars.
  - "Steers the whole front further, and changes nothing else" replaces "changes nothing else".
  - Density test: the saddle is 0.5 and the pedals 1.4 relative to the handlebars.
  - pointCounts: the bike row is re-pinned, a deliberate retune.
- **shapes:** the saddle is 0.028 thick, its top tilts 4 degrees nose-down through the saddle-top point, and the nose is under 0.25 of the widest width.
- **rider.test.ts (new):**
  - The proportions table matches exactly, and every segment is within 1e-6 of fraction times H (the brief's list plus torso and neck).
  - The pose angles fall in the brief's ranges.
  - The hip is within 0.03 m of the saddle's sampled top surface.
  - Each hand is within 0.05 m of the correct grip offset and at least 0.3 m from the twin's real handlebar points at the reveal drives.
  - Heel, ankle, sole and toe are at least 0.2 m from every pedal point at 161 drives from 0 to 4. That covers the reveal's 2 to 3.28 with the steering at both locks; the worst case is 0.25 m.
  - The rider points are deterministic with unit normals.
- **riderPoints.test.ts (new):**
  - The rider object exists only for the bike.
  - Its colour is neutral (|r-g| and |g-b| under 0.02, and r = g = b exactly per point), additive, with no depth write.
  - It is hidden at `overlay.rider` 0, and its opacity is alpha times rider.
  - It takes the saddle part's transform at two drives.
- **keyframes.test.ts:**
  - Drive ends at 3.28.
  - From reveal 0.3 on, the steering stays within 10% of full lock, with a hold over 0.4 to 0.6.
  - A new reveal camera test: bearing 30 to 60 degrees, elevation at least 20 degrees, fov at most 33. It fails on the old profile keys: "local 0.5: expected 14.99 >= 30".
  - Framing: the bike, ground and mannequin all clear the panel at NDC > -0.09, with x < 0.95 and |y| < 0.93 from reveal 0.3 on. While the camera rises, the fading mannequin stays inside |NDC| < 0.97.
  - `overlay.rider` is 0 everywhere outside the reveal (2001 samples), peaks at 1, and is 0 from reveal 0.9.
- **purity.spec:** p = 0.41 lies in the reveal (local 0.55) and `overlay.rider` is 1 there. The frame differs from the same frame with `overlay.rider: 0`, so the existing jump/scroll/detour check at 0.41 really includes the mannequin, and it passes byte for byte.

## TDD evidence
- **Twin steering**
  - RED: `npx vitest run src/mechanisms/bike` gave "expected undefined to be 0.14" for STEER, and the saddle yaw test failed. Expected, because STEER was not exported and the twin's amplitude was 0.14.
  - GREEN: 331 passed.
- **Saddle and densities**
  - RED: "expected 1 to be close to 1.4", and the saddle thickness came out as "-Infinity" (no faces at the 4-degree tilt). Expected before the change.
  - GREEN: after the change and re-pinning the counts.
- **Rider**
  - RED: the first run failed "elbow 0: expected 43.4 <= 30" and "foot 1 at drive 0.2: expected 0.188 >= 0.2".
  - GREEN: after tuning the pose (hand pitch and grip point, feet at -20 and -30 degrees).
- **Rider points**
  - RED: "Cannot find module './riderPoints'".
  - GREEN: 72 scene tests.
- **Keyframes**
  - RED: "TypeError: actual value must be number ... undefined" (no `overlay.rider`), and "local 0.5: expected -0.22 > -0.09" (the panel overlapped).
  - GREEN: after the leaf, the keyframes and the camera.

## What I saw in the shots (honest)
Best shots:
- /home/user/motes-of-work/shots/reveal-0.5.png
- /home/user/motes-of-work/shots/reveal-0.9.png
- /home/user/motes-of-work/shots/reveal-0.1.png
- Mannequin close-up: <scratchpad>/agents/a839cbcb474978ff7/frames/a55-close2.png (the reveal@0.55 state with a closer camera, panel visible)

Per shot:
- **reveal-0.5.** Now reads as wrong, not reversed. Seen from high and in front, the front wheel is visibly turned and the saddle sits on the steering column over it, cocked with it. The bars stick out of the seat tube square.
  - The grey mannequin sits on that saddle with an arm reaching forward past the front wheel into empty air. It reads clearly as a person: head, shoulders, chest and the reaching arm.
  - I would put this at about 4/5.
  - The legs read poorly from this angle, because they overlap the front wheel and fork.
  - The hands read as the end of a reaching arm, not as closed fists.
- **Is the mannequin eerie?** Not creepy in my judgement. It is a faceless, see-through grey dot figure, so it has a mildly spectral, hologram quality rather than a mannequin's solidity. It is dimmer than the bike and never competes with it. If the author finds it ghostly, lowering `RIDER_LOOK.alpha` or the share makes it quieter.
- **reveal-0.9.** The mannequin is gone. The bike is smaller in frame (the camera was pulled back for the mannequin), with the saddle cocked over the turned front wheel. About 3.5/5: it no longer reads as a normal bike facing the other way, but it is small.
- **reveal-0.1.** The camera is still low and drive-side and the steering is only about 0.2 rad. It still reads like a normal bike facing left (2/5), as before; the reveal's legibility arrives from about reveal 0.25.
- **vibe-build.** Unchanged in character. 0.9 is slightly higher, and the build reads well.
- **rewind and spec.** Unchanged. In spec-0.9 the front wheel runs past the right edge; that camera is not touched by this task.
- **mech-bike-assembled and twin.** The pedals now read amber, and the saddle is a thin amber shape with a nose, not a white slab.
- **Clipping.** Nothing is clipped in the reveal from 0.3 on. The tests confirm this numerically for the bike, ground and mannequin together.

## Self-review
- The pose stays pure. The rider's geometry cache is lazy and built once, in the same pattern as the bike's own `built` cache. `pose` gains no state.
- Names: `Rider`, `RIDER_LOOK`, `riderPointCount` and `overlay.rider`. Tests assert behaviour (distances, angles, framing, pixels), not that code exists.
- Temporary tuning tests were written under `src/` only while iterating and then removed. The tree is clean.
- The preview server I started on 4196 is stopped, and no background processes are left.

## Concerns
1. **Contract change.** I added an optional `rider` to the `Mechanism` interface (`types.ts`), which goes beyond the files the brief named. It was the cleanest way to give moteSystem and the compare page the mannequin without special-casing the bike in main.ts. Other mechanisms are unaffected.
2. **Departures from the brief's numbers:**
   - vibe-build@1 camera y is 0.18, not 0.4 (reasons and numbers above).
   - Drive ends at 3.28, not 3.3.
   - The reveal camera arrives at reveal@0.3, not 0.5, and the fade-in runs from reveal 0.18 to 0.32 rather than 0.15 to 0.3. The rise from the cold open now happens over about 0.6 viewport heights of scroll, which is brisker than before.
3. **Reveal framing is a compromise.** To fit a seated 1.75 m figure, the reveal frames the bike smaller than the review imagined, and after the mannequin fades (reveal 0.9 to 1) the bike looks small.
4. **Gears lit-faces margin.** At key 0.85 the gears ratio is 1.226 against its 1.2 floor, a thin margin.
5. **Hip test interpretation.** "Hip within 0.03 m of the saddle top" is measured to the saddle's top surface, not to the `SADDLE_TOP` point; the sit bones rest 0.07 m behind that point on the broad back of the saddle.
6. **Pose limits.** The mannequin's legs and closed hands do not read strongly at story distance. Its torso and reaching arm carry it.
