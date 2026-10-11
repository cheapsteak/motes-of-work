# Task 13 report: the storyboard, every line's camera shot and motion

Status: DONE_WITH_CONCERNS (see Concerns: a few shot numbers changed a lot, the body's exploded
offsets changed, and two beats show their line only weakly).
Base: 808f6e9. Commits on main, not pushed:

- 724e683 scene: mech.steer, mech.ghostVariant and camera.frame
- 3af5966 story: every storyboard shot, keyed from bike terms
- e3baa33 story: the steering swings, and the late parts fly in from below
- f864c2d story: the spec section draws the bike first, then builds it
- 7db8c31 e2e: the machine keeps below the text, and the essay ends on the bike
- d012970 docs: the storyboard records its shots as built
- 057b582 compare, e2e: fit the new sliders, and end the essay on the riding bike

`mote.glsl` and `mote.ts` are unchanged. The ghost vertex shader changed only in a comment. No new
runtime dependencies.

## What I implemented

### The three scalars (§2.6, §2.4)

**`mech.steer`** (default 0)
- `steer(drive, variant, extra = 0)` in `bike/kinematics.ts` returns
  `amplitude(variant) × clamp(sin(π·drive/2) + extra, −1, 1)`. At 0 the angle is exactly the old one.
- `Mechanism.pose` takes an optional fourth argument, `steer`. The bike passes it to `steer()`. The
  other machines ignore it. `partTransforms` passes `s.mech.steer`.
- `types.ts` and `docs/adding-a-mechanism.md` describe the argument.
- The scalar itself is not clamped. The storyboard keys it to ±2, so that the sum can cross from one
  lock to the other.

**`mech.ghostVariant`** (default 0)
- The ghost's part texture is now `partTransforms` of the intended machine with
  `variant: ghostVariant` and `steer: 0`.
- `ghost.uVariant = ghostVariant`, so the ghost's points take `mix(local, localTwin, ghostVariant)`
  through the same `mote()` the motes use. That is "the twin positions in the ghost pipeline".
- `e2e/machine.ts` does the same in TypeScript.

**`camera.frame`** (default 0)
- `cameraRig.ts` has `FRAMING`, a table of where the authored target lands on screen, per
  orientation, wide and close. `targetOnScreen(aspect, frame)` blends between them.
- `applyCamera(..., { compose: true })` sets a view offset so the target lands there. The option was
  `reframePortrait`; it is renamed because it now composes landscape shots too.
- `portraitRig` now keeps the authored target. It still backs off by √m and widens by √m.
- The old portrait lift (0.15, blended to 0.22 by coreFocus) is gone.
- Without `compose`, `applyCamera` is exactly the plain camera, whatever `frame` says. The comparison
  bench and every plain caller are unchanged.

**Leaf lists and the bench**
- All three are in `defaultSceneState()` and `SCENE_STATE_PATHS`.
- The comparison bench gains Steer and Ghost twin sliders. Its test requires a slider for every
  `mech.*` leaf.

**"Defaults reproduce today's frames exactly"**
- True for every pose, the ghost and the plain camera.
- Not true of the essay's composed camera at `frame` 0 on a wide screen. §2.6's table puts the wide
  target at y 66%, not at the centre, and the text-band clearance needs it there.
- I read §4 test 9's "landscape with frame 0 is unchanged from the plain camera" as applying to the
  plain (uncomposed) call. That is what is tested.

### The shots (§2)

**`src/timeline/shots.ts`**
- Holds every shot in bike terms: S0, S1, S2, S3, S4, S1′, S5, S5′ (rv-6's push-in), S6, S7, S8, S6g,
  S10, S9′ and S10′.
- Each shot has a target in metres (or `'whole'` / `'core'`), a bearing (0 front, 90 drive side,
  180 behind), an elevation, a distance, a fov, a frame and a coreFocus.
- `shotKeys` converts a shot to machine-relative keys:
  - `world = (p − CENTRE) × SCALE`
  - relative to the anchor lerped by the shot's coreFocus
- `shotOf` reads a sampled camera back into bike terms.
- Nothing at runtime imports this file.

**Generation**
- The camera tracks in `keyframes.json` were generated once from this table, by a throwaway script
  that is not committed. They are rounded to 3 decimals.
- Each hold is keyed at its start and end. Moves use `inOutCubic`.

**`src/timeline/shots.test.ts`**
- Round-trips every shot through the conversion.
- Checks the bearing convention.
- For every hold window of every beat (18 windows, 11 samples each), reads the keyframes back and
  checks bearing ±0.5°, elevation ±0.5°, distance ±5 mm, target ±5 mm, and fov, frame and coreFocus
  exactly.
- Checks that the reveal shots stay inside the pinned bounds.
- Checks that the close shots aim at the parts their lines name.

### The motion (§2.1–§2.4)

- **vibe-build and reveal:** the assembly and drive keys of §2.5, as Task 12 left them.
- **Front-wheel swing:** `mech.steer` is 0 at vb 0.64, −2 at 0.68 and 0 at 0.72, so the wheel goes
  lock → other lock → back.
- **rv-3 swing:** 0 at rv 0.29, +2 at 0.345 and 0 at 0.40. The saddle on the twin's mast turns with
  the wheel.
- **Swing easing:** both swings use `inOutQuad`.
- **The spec section:**
  - `ghost`: 0 until 0.08, then 0.6 at 0.17, held to 0.47.
  - `ghost` brightening: 0.85 at 0.50, then 0.7 at 0.55, held to 0.84, then 0.25 at 0.95.
  - `ghostVariant`: 1 until 0.35, then 0 by 0.44 (`inOutCubic`).
  - `assembly`: 0 until 0.60, 0.46 at 0.74, held to 0.76, then 1 at 0.92.
  - `drive`: 0 until 0.84, then 1.4 at 1.0.
  - `coreFocus`: 0 → 0.6 → 0 with S9′.
  - variant 0, specced.
- **Exploded offsets (a change the storyboard did not ask for):**
  - The fork, both brakes, both mudguards and the frame now fly in from below or level. They used to
    come from up to 0.6 m above the bike.
  - From above, they crossed the text while the brief's lines lit. In the vb 0.64 close-ups the
    landing frame stood at y −124 px on a 900 px screen.
  - Their settle windows are unchanged, so the brief lights exactly as before.
  - A bike test pins that no body part's offset points up by more than 0.2.

### Clearance (§4 test 12)

**`e2e/clearance.spec.ts`, at 1440x900 and 390x844**
- For each section, reads the panel's bottom on the page. It also checks the panel is inside 42%.
- For each page, samples every 0.01 of section progress through its full-ink stretch (more than 100
  samples with a machine per size, asserted so the test cannot pass vacuously).
- At each sample, `machineOnScreen` (settled motes plus the drawing, through the composed camera)
  must start at least 8 px below the panel.
- Only points inside the screen's width count: a close shot may run off a side, and what is off a
  side covers no text.
- A second test checks the last frame:
  - assembly 1, variant 0, specced, drive > 0
  - every visible mote settled and on screen, under the panel
  - the rendered canvas lit under the panel and all but empty above it (under 1%)

**Mutation check:** with §2.6's desktop close y of 0.72 restored, the desktop test fails at vibe-build
0.555 (machine top 322 px against the panel's 321 + 8).

**Retired and replaced tests**
- Retired: the keyframes test that framed the reveal against the old left-hand column, and the
  every-mechanism spec "core right of the text panel" test.
- In their place, the reveal's wide shots (rv-5 to rv-7) are checked: the whole twin on screen and
  under the 42% band, at desktop and phone sizes.
- The cold-open sweep test is replaced by the per-shot tests.
- The reveal bounds test now reads bearings in bike terms from rv-5 on (local ≥ 0.56). Before that
  the camera is on the rv-3 and rv-4 close shots, which are meant to be outside the bounds.

**The phone**
- The rig no longer lifts the machine.
- `frame` puts the target at 62% (wide) or 76% (close) of the height.
- Every page clears its panel by about 90 px or more on the phone (the vb-brief S1 hold is the
  closest; desktop's closest is about 13 px, also there, and 21 px in the S2-to-S3 move).

## Numbers that changed, and why

These are also written into the storyboard as a new §2.7.

| Item | Doc | Built | Why |
|---|---|---|---|
| desktop `frame` 1 target y | 72% | 78% | The close shots on a wide screen could not keep the twin under the brief's 36% panel at 72%. |
| S2 | target (0.25, 0.32), d 1.9 | target (0.5, 0.4), d 3.2 | At 1.9 m the saddle on the mast stood in the text, and the front wheel was cut off. "Two wheels" needs both wheels. |
| S3 | `FRONT_AXLE`, bearing 25, elev 18, d 1.4 | (0.95, 0.5), bearing 50, elev 20, d 3.0 | From bearing 25 the wheel is edge-on, and the frame flying in filled the shot. At 1.4 m the mast and saddle (0.7 m above the axle) cover the text. From bearing 50 the wheel is seen at three-quarters, so its turn reads. |
| S4 | `HEAD_TOP`, bearing 20, d 1.5 | (0.85, 0.65), bearing 35, elev 15, d 2.4 | Same clearance reason. This shot also shows the bars with their levers and bell. |
| S6 | `MAST_MOUNT`, d 1.3 | (0.9, 0.65), bearing 35, d 2.4 | At 1.3 m the front wheel was out of shot. The line says "over the front wheel". |
| S7 | elev 30, d 1.6 | d 2.6 | At 1.6 m the mast and saddle beyond entered the text, and the shot was hard to read. |
| S6g | as S6 | (0.75, 0.55), bearing 40, elev 28, d 3.0 | The drawing is sparse (every 4th point). Close up it did not read as a bike at all. |
| S5 / S5′ | d 4.0 / 3.8 | d 4.8 / 4.6 | The whole twin and its ground must fit under the 42% band and inside the frame at both sizes. |
| S8 | bearing 0 | bearing 90 | The spec itself calls S8 "the existing pull-back", which looks from the drive side. Bearing 0 shows the bike end-on as it comes apart. |
| S9′ | "nearer" at coreFocus 0.6 | the whole bike at 4.15 m (S10 is 4.2 m) | Any nearer and the drawing's front wheel and ground left the bottom of a wide screen. So S9′ is effectively S10; the gold is not brought nearer. |
| Body exploded offsets | (not in the doc) | from below or level | Parts fell through the text from above. |

## Tests and results

- `npx tsc --noEmit -p .`: clean.
- `npx vitest run`: 52 files, 826 tests passed (the baseline was 51 files, 793 tests).
- `E2E_PORT=4204 npx playwright test` (full suite): the first full run had 98 passed, 3 failed and
  7 skipped. The failures, and their fixes in 057b582:
  - `app.spec` "scrolling to the very bottom" (both sizes) expected the old spec section's held
    core. It now expects the finished bike: built by spec@0.92, variant 0 and still riding at
    the end.
  - `compare.spec` "controls fit a 1280x720 window": the two new sliders pushed the panel 26 px
    over. The Machine sliders are now two columns, like Provenance and Faults, with the play row
    spanning both. I looked at `shots/compare-camera-cold-open.png` and the panel reads cleanly.
  - After the fixes, app and compare passed 35 of 35. The final full run, on 057b582 with a fresh
    build: 101 passed, 7 skipped (the shots), 0 failed (7.0m).
- `SHOTS=1 E2E_PORT=4204 npx playwright test e2e/shots.spec.ts e2e/compare.spec.ts`: 26 passed (6.0m).

## TDD evidence

| Test | RED (command, output, why expected) | GREEN |
|---|---|---|
| Steer | `npx vitest run src/mechanisms/bike src/scene/mote/partTransforms.test.ts`: 4 failed (`steer` had no third argument, and pose ignored a fourth). | 379 passed |
| Ghost variant | `npx vitest run src/scene/mote/moteSystem.test.ts`: 1 failed (the ghost was always drawn in the correct variant). | 14 passed |
| Rig and frame | `npx vitest run src/scene/portrait.test.ts`: `Cannot read properties of undefined (reading 'landscape')`, because `FRAMING` did not exist. | 9 passed |
| Swings | `keyframes.test.ts` against the shots-stage keys: 2 failed, both swings (no steer track). | 36 passed with the motion keys |
| Spec sequence | `keyframes.test.ts` against the motion-stage keys: 16 failed (the old spec section). | All passed with the new keys, after narrowing the "no body mote landed" check to the bike. The other machines' default settle windows overlap the core's. |

- **Shots:** the tests were written after the generated keys, so I saw no RED for them. They are
  exact read-backs, and they failed when an intermediate S5 change was not regenerated.
- **Clearance:** mutation-checked, as described above.

## Screenshots

All are `?test=1` at full mote budget, with a fresh page per shot. They are in
`/home/user/motes-of-work/shots/task13/`, at both `desktop-` (1440x900) and `portrait-` (390x844).

**Per beat**, at the middle of its hold: `{desktop,portrait}-<beat>.png` for all 20 beats, made by
task12-shots.mjs.

**Extra frames**, made by `.superpowers/.../task13-at.mjs`:
- `vb-brief-line1` (0.50), `vb-brief-line2` (0.59)
- `vb-brief-line3-lock` (0.68), `vb-brief-line3-back` (0.715)
- `vb-brief-line4` (0.75), `vb-brief-line5` (0.84)
- `rv-3-swing` (0.345)
- `sp-4-redraw` (0.40)
- `sp-7-building` (0.84)

### What I saw, beat by beat

- **vb-1, vb-2, vb-3:** the starfield only, with the lines over it. True: there is nothing but blue
  dots.
- **vb-brief (whole page):** the core, then the drive parts, landing low-right under the text.
  - *Line 1, seat and bars:* small pieces in the wide shot, true but small.
  - *Line 2:* both wheels, the cranks, the chain and the pedals, square from the drive side. True.
  - *Line 3:* at 0.68 the front wheel is at the other lock, with the basket and the saddle on the
    mast turned with it. At 0.66 it is straight. Its turn reads as you scroll.
  - *Line 4:* the front of the bike, and the bars on the stub with their levers. The brakes
    themselves are small.
  - *Line 5:* the frame lands and the whole bike stands.
- **vb-4, rv-1:** the whole bike, low-centre, wide. rv-1's front wheel is a little turned.
- **rv-2:** the camera rising to the reveal.
- **rv-3:** the saddle on top of the post, the basket under it and the front wheel under that. The
  swing frame shows it turned the other way.
- **rv-4:** from behind, the bars stick out sideways in the foreground, with the mast, saddle and
  cocked wheel beyond. Busy, but the bars are clearly at the back.
- **rv-5 to rv-7:** the whole twin, high front three-quarter, every dot blue. It is smaller on screen
  than before (4.8 m).
- **rw-1:** the bike mostly apart, from the drive side.
- **sp-1:** the starfield. True: nothing drawn yet.
- **sp-2:** the white drawing of the twin.
- **sp-3:** the drawing, closer, with the seat over the basket and the front wheel. On the phone it
  is clear. On desktop it is readable but sparse.
- **sp-4:** mid-redraw, the seat travelling back.
- **sp-5:** the correct drawing.
- **sp-6:** gold on the seat, the bars and the pedals, on the white drawing.
- **sp-7:** blue building round the gold, then the finished bike with gold contact points on its
  ground.

**Portrait.** The text is always above, and the machine is always below it. This fixes the overlap
Task 12 noted.

## Files changed

- `src/timeline/sceneState.ts` (+test)
- `src/mechanisms/types.ts`
- `src/mechanisms/bike/kinematics.ts` (+test)
- `src/mechanisms/bike/index.ts` (+test)
- `src/scene/mote/partTransforms.ts` (+test)
- `src/scene/mote/moteSystem.ts` (+test)
- `src/scene/mote/shaders/ghost.vert.glsl` (a comment only)
- `src/scene/cameraRig.ts`
- `src/scene/portrait.test.ts` (rewritten)
- `src/timeline/shots.ts` (+test, new)
- `src/timeline/keyframes.json`
- `src/timeline/keyframes.test.ts`
- `src/compare/controls.ts` (+test), `src/compare/compare.css`
- `e2e/app.spec.ts`
- `src/main.ts`
- `e2e/machine.ts`
- `e2e/clearance.spec.ts` (new)
- `e2e/portrait.spec.ts`
- `docs/adding-a-mechanism.md`
- `docs/specs/2026-10-04-act-1-storyboard-and-text-engine.md` (§2.7)

## Self-review

- Removed my throwaway generator, evaluator and probe tests from `src/timeline` (they were never
  committed).
- Stopped my preview server on 4204.
- Grepped for `reframePortrait` and `PORTRAIT_*_LENS_SHIFT`: no references are left.
- `shots.ts` has no runtime importers.

## Concerns

1. **Close shots are medium-close.** They keep the whole twin under the brief's 36% panel on a wide
   screen. The full-width text band (§4 test 12) and the twin's tall front make true close-ups
   impossible on desktop. If the author wants tighter shots, the band rule has to become
   "outside the text column".
2. **The body's exploded offsets changed** (bike `index.ts`) so that late parts do not fall through
   the text. This is a mechanism change the storyboard did not name.
3. **S9′ is effectively S10.** "The contact points nearer" is not shown; nearer crops the drawing on
   desktop.
4. **Shot convention.** S8 uses bearing 90 against the doc's 0, because the doc's own parenthetical
   points to the existing drive-side pull-back.
5. **The reveal's wide shot is smaller on screen** (4.8 m against 4.0 m). The twin still reads, and
   the top-tube climb test still passes.
6. **`camera.frame` 0 on a wide screen is not the plain camera** in the essay. §2.6's table and test
   9 disagree, and I followed the table (see the scalars section).
