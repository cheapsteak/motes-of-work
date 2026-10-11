# Task 4 report: the bike on stage

Status: DONE_WITH_CONCERNS (one deliberate reading of the brief on the compare presets, below).

## What I implemented

1. **`ACTIVE_MECHANISM = 'bike'`** (`src/config.ts`). With the old keys the unit suite (616) and the
   full e2e (82 passed, 7 skipped by design) were already green: earlier tasks had already made every
   test read `ACTIVE_MECHANISM` or pin `?mech=`. The only stale text was a comment in
   `e2e/brief.spec.ts` ("the bike is on stage only with ?mech=bike"), now "`?mech=bike` pins the bike
   whatever ACTIVE_MECHANISM is". README status line updated (bike on stage, four draft sections,
   the other four machines kept as a bench).
2. **Camera keys** (`src/timeline/keyframes.json`, machine-relative). Tuned with a numeric framing
   probe (the page camera rebuilt in Node: projected NDC box of the bike, bearing, height) and then
   by rendering frames with the text panel visible at 1280x720.

   | Key | pos | target | fov | What it is |
   |---|---|---|---|---|
   | vibe-build@0 | [2.522, -0.05, 1.97] | [-0.414, 0.016, 0.529] | 40 | bearing 64° from side-on toward the front, camera world y -0.04 |
   | vibe-build@1 (inOutQuad) | [1.528, -0.12, 2.103] | [-0.392, 0.025, 0.285] | 40 | bearing 47°, camera world y -0.20 (bottom bracket at -0.41, wheel tops at +0.52) |
   | reveal@0.5 (inOutCubic) | [0.274, 0.502, 3.513] | [-0.623, 0.015, 0.165] | 30 | view axis 15° off side-on, pitched 8° down; bike about 4° off its own side-on |
   | reveal@1 | [0.143, 0.491, 3.42] | [-0.614, 0.018, 0.139] | 30 | 13°, slow push in |
   | rewind@1 (inOutQuad) | [-0.068, 0.04, 6.264] (unchanged) | [-0.068, 0.04, 0.023] | 40 (at spec@0) | pull back, as before |
   | spec@0.35 (inOutCubic) | [0.717, 0.134, 4.254] | [-0.962, -0.3, 0.484] | 35 | coreFocus 1, view axis 24° |
   | spec@1 | [0.406, 0.049, 4.137] | [-0.957, -0.3, 0.393] | 35 | view axis 20°, slow drift toward side-on |

   Targets are offset left of the machine so the bike sits in the free area right of the text panel
   (NDC x about -0.1 to 0.95 for the whole bike in vibe-build and reveal). The reveal narrows the
   field to 30° and backs off (a dolly at constant size): at 40° the off-axis framing stretched the
   front wheel and read as three-quarter even at a 15° bearing (compared side by side: fov 40 vs 30).
   The spec target's y is -0.3 core radii, not the -0.4 to -0.48 that would centre the bike's
   top-heavy core: at -0.4 the steam and strandbeest cores crossed the top of the frame (maxY 1.01)
   in the framing test. The bike's core therefore sits a little low (NDC y about -0.64..0.48
   assembled); every bench machine still passes the framing test unchanged.
3. **`keyframes.test.ts`**: the reveal test keeps the state holds (assembly 1, non-decreasing drive
   2 to 3.5; variant, vibed and ghost stay fenced by the vibe-build/reveal test) but no longer holds
   the camera. Two new tests fence the camera intent: the cold open's camera height lies between the
   bike's bottom bracket and its wheel tops, its bearing stays 30..70° and sweeps by more than 10°;
   from reveal@0.5 the bearing is 0..25° (drive side) and the camera looks down. The spec end values
   pin the new spec@1 key.
4. **Compare presets** (`src/compare/controls.ts`): "Cold open" and "Spec (core)" take the story
   camera's position, fov and coreFocus at the end of vibe-build and spec, with a new sync-fence
   test that samples the shipped keyframes through `KeyframeSampler`. Their target is the machine
   (or core) centre `[0, 0, 0]`, not the story's offset aim. See concerns.

## Tests and results

- `npx tsc --noEmit -p .`: clean.
- `npx vitest run`: 45 files, 619 tests passed.
- Full e2e on the final tree, `E2E_PORT=4193 npx playwright test`: 82 passed, 7 skipped (the
  SHOTS-gated ones), 8.4 min.
- `SHOTS=1 E2E_PORT=4193 npx playwright test e2e/shots.spec.ts e2e/compare.spec.ts`: 26 passed;
  compare review shots re-run after the preset change.

## TDD evidence

- RED (keyframes, new tests against the HEAD keyframes.json copied back in temporarily):
  `npx vitest run src/timeline/keyframes.test.ts` -> 2 failed:
  `opens low and three-quarter ... : local 0: expected 1.589 to be less than 0.5175` (the old cold
  open camera sat above the wheel tops) and the spec end pin. Expected: the old cold open is high
  and near head-on. The reveal bearing test passed against the old keys too (the old held framing
  was already 17° off side-on), so it fences the intent rather than proving the change.
- RED (compare fence, HEAD controls.ts restored temporarily): `npx vitest run src/compare/controls.test.ts`
  -> `Cold open: expected { pos: [1.528, -0.12, 2.103] ... } to match object { pos: [1.35, 0.3, 2.7] ... }`.
- GREEN: both files pass with the new keys and presets (19 and 30 tests).

## Screenshots (looked at, described honestly)

Canvas-only `shots/` plus my own full-page renders with the panel visible:
- **vibe-build-0.1**: nebula; the saddle, handlebars and two pedals are already formed (the core
  settles first), upper right of centre. With the panel visible they sit clear of it.
- **vibe-build-0.5 / 0.9**: the polished twin, low three-quarter from the drive side and front:
  front wheel near and large on the right, chainring and chain readable, saddle (on the steering
  column) and the handlebars (in the seat tube) against the empty dark above. Bike spans about x
  590-1220 px, right of the panel (panel edge 562 px). The ground strip slants away to the left.
- **reveal-0.1**: still the cold-open framing, beginning to swing. **reveal-0.5 / 0.9**: close to
  side-on, slightly above: the saddle clearly sits over the fork and the handlebars stick back out
  of the seat tube; neither is occluded by the frame. Rear wheel's left edge about 585 px, just
  right of the panel. Wheels look nearly equal in size.
- **rewind-0.1**: the twin morphing back (saddle on its way to the seat tube), camera starting to
  pull back. **rewind-0.5**: core remnants upper centre-right, rest dispersing. **rewind-0.9**:
  a uniform nebula; the camera ends centred and far as before, so in the story the faint nebula
  centre is partly behind the panel (unchanged from the old keys).
- **spec-0.1**: the white ghost of the correct bike appears small and centred in the nebula, before
  the camera closes in. **spec-0.5 / 0.9**: close on the three contact points: saddle top left,
  handlebars top right, pedals low centre, warm, with the ghost frame and wheels behind; the front
  wheel is cropped at the right edge; the core spans about x 700-1150 px, right of the panel. The
  lowest pedal sits near the bottom at spec 0.5 (exploded offsets), about 600 px at 0.9.
- **compare-camera-cold-open / spec-core** (bike, my render): with the story aim the bike ran off
  the right of the pane (front wheel and handlebars cut off); aimed at the centre both framings
  show the whole bike from the story's vantage point.

## Files changed

`src/config.ts`, `README.md`, `e2e/brief.spec.ts` (comment), `src/timeline/keyframes.json`,
`src/timeline/keyframes.test.ts`, `src/compare/controls.ts`, `src/compare/controls.test.ts`,
`src/compare/compare.ts` (comment about the orbit target).

## Self-review

- Removed the scratch probe tests I used for tuning (they were never committed).
- The continuity test's doubled story sampling (ledger note) left as is.
- No e2e needed changing beyond the comment: none assumed the gears were active.

## Concerns

1. **Compare presets aim at the centre, not the story target.** The brief says the presets "match
   the new keys". Matching exactly pushed the machine off the right of the compare pane (no text
   panel there, and a narrower aspect): the bike's front wheel and handlebars were cut off. I kept
   position, fov and coreFocus identical (fenced) and aimed at the machine centre, so the orbit now
   circles the machine. The old presets did not match the old keys either. If an exact match is
   wanted, change the two targets and the fence's last assertion.
2. **Spec framing compromise.** The bike's core centroid is high (saddle and bars), so with the
   shared target y of -0.3 its contact points sit a little low in the frame; lowering the target
   further breaks the steam and strandbeest framing tests.
3. **Reveal fov.** Narrowing to 30° in the reveal and back to 40° by the end of the rewind is a
   slow dolly; it reads as a calm change of lens, but it is a judgement call.
