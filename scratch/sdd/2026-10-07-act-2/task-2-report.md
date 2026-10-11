# Task 2 report: the reflow (the bike becomes the first stack)

Status: **DONE_WITH_CONCERNS**. Base ee1f8ac. Four commits on main, not pushed:

- 38330e5 scene state: the six leaves of Act II, and the stops wait for five
- 8c78406 mote: the reflow, every mote of the machine onto the first stack (both mirrors in one commit)
- 79c0bab story: zoom-out, the first section of Act II, fenced against its storyboard
- 0eec242 timeline: zoom-out, the bike reflows into the first stack as the camera pulls back

## What was implemented

**SceneState (§2.11, ruling 2).** `mech.reflow` plus `net.{show, growth, fix, highlight, review}`, all defaulting to 0. They are in `SCENE_STATE_PATHS` and the sync test checks them. `sceneMotion` gains `mech.reflow`, `net.show`, `net.highlight`, `net.fix` and `net.review`. It does not gain `net.growth` or `clock`. In plan.test, the at-rest check's `TRACKS` gains a `network` group.

The compare bench's "sliders cover every mech leaf" test now excludes `mech.reflow`. The design says the compare page changes nothing, and the reflow is not a property of a mechanism.

**The reflow (§4, step 3b, both mirrors).**
- **New `src/scene/mote/stack.ts`.** Exports `STACK`, the first stack's six boxes from `firstStack()`, with every value rounded to float32. It holds:
  - centres
  - half sizes
  - (cos, sin) of each box's own yaw
  - cumulative box-area shares
  - per-box cumulative face-area shares

  It also exports `glslStackConstants()`. Because both sides read the same float32 values, the GLSL literals parse back to exactly these numbers, and the box and face picks agree bit for bit between GLSL and TypeScript.
- **`shaderSource.ts`** splices the constants after the SALT block (`STACK_BOXES`, `STACK_CENTRE`, `STACK_HALF`, `STACK_YAW`, `STACK_BOX_CDF`, `STACK_FACE_CDF`).
- **Four salts:** `stackBox` 16, `stackFace` 17, `stackU` 18, `stackV` 19. The salts table test is updated.
- **`moteStackRest(seed)` / `moteStackNormal(face)`** are exported from mote.ts and mirrored in mote.glsl. The face index is 6 × box + face, with faces ordered +x, −x, +y, −y, +z, −z. Points and normals follow each box's yaw, using cluster.ts's `turn()` convention.
- **Step 3b** follows §4's code, with the deviations listed below. The normal is the posed normal mixed toward the face normal by `er`. If that mix passes through zero, the face normal is used, matching step 7's own fallback.
- **Wiring.** `uReflow` is in `moteUniforms` and `moteSystem.update` sets it from `state.mech.reflow`. The ghost keeps 0 (it draws the intended machine).
- **Parity page:** three new cases (`reflow 0.4 at drive 1.6`, `reflow 0.4 mid-flight, drifting`, `reflow 1 at drive 1.9`). Reflow 0 is every existing case. `e2e/parity.spec.ts` lists the three new names, and the suite passes for every mechanism.

**Section and fences (ruling 1).**
- `src/story/05-zoom-out.md`: length 2.2, `draft: true`. It has §1's copy and alt text, zo-1 at 0 and zo-2 at 0.5, both on page 1.
- `storyboard.test.ts` now takes a list of storyboards (`BOARDS`), each naming the sections it covers. A new test checks that every story section is covered exactly once and in story order. The Act II document covers `zoom-out` for now, with its timings cut at `### 2.10`.
  - Act II's §1 table lists the whole act, so its copy rows are filtered by the two-letter prefixes that the covered sections' timing rows use.
  - Rows are split per `### 2.N <id>` heading, and each beat's section is checked as well.
- **Words fence** (`content.test.ts`):
  - `ACT_II = ['zoom-out']`.
  - A check that the story is exactly Act I followed by Act II, so a new section has to be classified.
  - No colour, dot or picture words (stack, cube, stream, crack, ring, glow, with plurals) in Act II's narration, plus a test of the pattern itself.
- **Dwell lint:** passes (each line gets 1.1 screens).

**netShots.ts (ruling 3).**
- `NetShot` (target is a node id, a world point or `'net'`), `NET_CENTRE` (0, 10, 0), and `essayNetwork()` (memoised `generateNetwork(MOTE_SEED, NETWORK_BUDGET)`).
- `netTarget`, `netShotKeys` (machine-relative to the bike's whole anchor, coreFocus 0), `netShotOf`, and `netShotKeyframe` (keys rounded to 1e-3).
- `NET_SHOTS = { S10p, N1, N2 }`. `S10p` is computed from `SHOTS.S10p`, i.e. the last shot of Act I in network terms. `splineKeys` is not written; it waits for Task 5.

**Keyframes (§2.1, §2.10, ruling 4).**

| Track | Keys |
|---|---|
| `mech.reflow` | 0 at zoom-out 0.04 → 1 at 0.40 (inOutCubic) |
| `mech.drive` | 1.4 at spec end → 1.9 at 0.40 (linear), then held |
| `ink.opacity` | 0.25 at 0 → 0 at 0.08 (inOutQuad) |
| `stage.motes` | 1 at 0.10 → 0.2 at 0.45 (inOutCubic); held to 0.50; → 0.03 at 0.90 (inOutCubic) |
| `net.show` | 0 at 0.30 → 1 at 0.50 (inOutCubic) |
| `net.growth` | 0 at 0 → 0.03 at 0.5 → 0.12 at 1 (linear) |
| `clock` | 0 at 0 → 2.86 at 1 (1.3 per screen × 2.2) |
| camera | Held exactly at Act I's last keys until 0.02; → N1 at 0.50 (inOutCubic, fov 35 → 40); → N2 at 1.00 (inOutCubic), held at the end until the next section exists |

Every first new key equals the track's previous value, so no Act I value changes.

## Numbers that differ from, or fill in, the design

- **Eases the design leaves open:**
  - `net.show` uses inOutCubic. Linear would move 0.045 in the 0.02-screen rest window before zo-1's stop, which would fail the at-rest rule.
  - `stage.motes` uses inOutCubic on both dims.
  - `ink.opacity` uses inOutQuad, like the other ink fades.
  - `mech.drive` 1.4 → 1.9 is linear, because it is the machine's clock.
- **The bow's sideways vector.** §4's snippet uses `side`, which step 6 only defines later (`cross(rest − spawn, up)`). Step 3b uses its own `rside = cross(home − rest, up)`, normalised, with the same `(1,0,0)` fallback as step 6. The bow's size is unchanged: 0.8 outward and 0.4 × (h − 0.5) sideways.
- **`uReflow` is clamped to 0..1 in both mirrors**, like `uVibed`. The `if` is on the clamped value, so a 0 key is still a skipped branch.
- **The S10′ hold repeats Act I's pasted keys, not a fresh conversion.** Act I's pasted spec@0.9 keys ([2.653, 1.751, 2.655] / [−0.001, 0.001, 0.001]) differ in the third decimal from a fresh `shotKeys(S10p)` ([2.654, 1.75, 2.654] / [0, 0, 0]). The hold uses Act I's values so the boundary does not move by even a rounding step. A test pins the zoom-out 0–0.02 camera as equal to the camera at spec's end.
- N1 and N2 keys are `netShotKeyframe` exactly:
  - N1: pos [2.593, 0.712, 2.603], target [−0.011, −0.071, −0.001]
  - N2: pos [6.638, 3.917, 7.922], target [−0.011, 0.557, −0.001]

## Existing tests that had to change (none of them still images)

- **`keyframes.test.ts`**:
  - "draws the finished bicycle on its lines at the very end" now samples `spec@1` instead of p=1.
  - "brings the cloud back before any mote lands, everywhere" is now limited to Act I, because Act II dims the built bike on purpose.
- **`e2e/clearance.spec.ts`**: "the essay ends on the finished bike" becomes "Act I ends on the finished bike". It samples and opens the stage at spec's end, uses spec's panel, and also asserts reflow 0 there.
- **`e2e/reducedMotion.spec.ts`**: `p=0.97` → `p=0.871`, the same spec@0.927 point of the longer essay, so the shimmer test still looks at the built bike.
- **`e2e/parity.spec.ts`**: three case names added.

Purity, the screenshot spec and the parity tolerances are untouched. No e2e still image changed.

## Tests and results

- `npx tsc --noEmit -p .`: clean.
- `npx vitest run`: 62 files, 1178 tests passed.
- Full e2e (`E2E_PORT=4791 npx playwright test`): 125 passed, 9 skipped (the SHOTS-gated screenshot spec), 13.9 min. This includes parity with the reflow cases, purity, clearance over the new section on both sizes, auto-advance, and pages and text.
- **GPU identity check (T1, beyond the brief).** I built the base commit ee1f8ac in a temporary worktree and served both builds. I then rendered the same 24 Act I scene states (the four sections at local 0.05, 0.3, 0.5, 0.7, 0.9 and 1, passed as full `?state=` JSON) at 390×844 and 1440×900, and compared canvas PNG bytes. Result: **48 of 48 byte-identical**. The script and the worktree have been deleted.

### Test 1 (`src/scene/mote/reflow.test.ts`)

- An FNV-1a fingerprint of every `mote()` output (pos, normal, brightness, settled, type, visible) over 3000 bike motes × 84 golden Act I states (each section at 21 locals, leaves rounded to 1e-9). **I pinned it to `7bd9b743` before changing mote()**, and it still holds. A reflow of 1e-6 changes it, so the check is not vacuous.
- At reflow 1, in three machine states, every mote lies on a box surface (|sdf| ≤ 1e-6) and inside none, and its normal is the face normal of a box it lies on. Where boxes touch, a point is on two faces, so any one of them counts.
- Each mote lands on the same point whatever the drive, variant or faults are.
- Each box's share of the motes matches its area share, and all 36 faces are used.
- Face normals are unit length, and the boxes really are yawed.
- Every registered mechanism lands on the stack.
- Motes move continuously as the reflow rises, with unit normals throughout.
- The cloud puffs outward: halfway along the eased bow, motes average more than 0.3 further from the origin than the straight bike-to-stack line.
- The `STACK` constants equal `firstStack()` to float32, and the spliced GLSL literals parse back to exactly `STACK`.
- mote.glsl declares `uReflow`, `moteStackRest`, `moteStackNormal` and the four salts.

### Other new tests

- **`netShots.test.ts`:**
  - conversion round trips
  - the bearing convention (0 from +z, 90 from +x)
  - N0 resolves to the origin, and `net` to (0, 10, 0)
  - `S10p` equals Act I's `shotKeys(S10p)`
  - the holds in network terms: S10p over zoom-out 0–0.02, N1 at 0.50 and N2 at 1.00
  - N1 and N2 are pasted as `netShotKeyframe`
  - the camera moves throughout 0.02–1
- **`keyframes.test.ts` "zoom-out" block:** pins every value in §2.10 for the section. It also checks that the network clocks rise monotonically, that fix, highlight and review stay at 0, and that every Act II leaf is 0 through all of Act I.
- **`plan.test.ts`:** `sceneMotion` moves with the five leaves and not with growth, clock or drive. The existing "at rest at every stop" check now covers zo-1 and zo-2 with the network group, and passes with no new STILL_MOVING entries.

### TDD evidence

- **SceneState.** RED: `npx vitest run src/timeline/sceneState.test.ts` failed "matches the spec defaults", as expected because there were no `net` or `mech.reflow` leaves. GREEN: 10 passed.
- **sceneMotion.** RED: `npx vitest run src/autoAdvance/plan.test.ts`, 5 failed ("moves with mech.reflow / net.*"). GREEN: 32 passed.
- **Reflow.** RED: reflow.test.ts did not resolve `moteStackRest`, `moteStackNormal` or `./stack` before the implementation. During iteration the face-normal test failed on touching faces (my test, now fixed). The first version of the puff test also asserted the wrong thing: whole-cloud spread instead of the bow's offset. I rewrote it. GREEN: `npx vitest run src/scene/mote src/math`, 115 passed.
- **Fences.** RED: `npx vitest run src/story/storyboard.test.ts`, 4 failed (zoom-out missing). `content.test.ts`, 2 failed. GREEN: `npx vitest run src/story`, 190 passed.
- **netShots.** RED: 4 failed (no zoom-out keys). GREEN: 12 passed.
- **keyframes.** RED after the keys went in: 2 Act I tests failed on sample(1) and "everywhere" (fixed as above). GREEN: 53 passed.

## Stills (`shots/act2-reflow/`, gitignored through `shots`), looked at one by one

Phone, 390×844 (`zo-<local>-390x844.png`):
- **0.00:** The finished bike riding, under the band. The text has not come up yet.
- **0.10:** "Now let's zoom out." is up. The bike is visibly loosening: its outline is soft and fuzzy, the warm seat, bars and pedals are smeared, and the wheels still read as wheels. It sits well under the text.
- **0.22:** Mid-reflow. The bike is gone into a compact, rounded, pale-blue cloud with a few warm specks, low and centred, far under the text. The centre is the brightest point and is pale, but it keeps a blue gradient and edge. It is not a white lamp.
- **0.40:** A small stack of six blue cubes in three courses (3, 2, 1), with the seams between bricks visible. It sits small and low at about 62% of the height, well under the text, with dark all round. Not blown out.
- **0.50:** zo-2 is up. The camera has pulled back and the stack is smaller and dim, with the faces still distinguishable.
- **0.95:** The stack is a tiny, very dim smudge at about 66% of the height (stage 0.03). It is barely visible.

Desktop, 1440×900, same story:
- **0.00:** The finished bike.
- **0.10:** The bike loosening.
- **0.22:** A soft cloud with a near-white core and blue rim, warm specks along its top.
- **0.40 and 0.50:** A crisp little stack of six bricks under the text column, with each brick's faces shaded differently by the light.
- **0.95:** A faint dark-blue stack, almost lost.

Answers:
- **Does the bike loosen and fall into a small stack of cubes?** Yes, on both sizes. It loosens by 0.10, is a cloud at 0.22, and is a stack by 0.40.
- **Is it under the text band on the phone?** Yes, at every still. The clearance e2e also passes over zoom-out on both sizes.
- **Does it blow out white?** No. The stack never does. The mid-reflow cloud at 0.22 is the brightest frame: its core is pale white-blue, saturated at the very centre, but still reads as a lit cloud.

## Concerns

1. **The zo-2 frame is nearly empty until Task 3.** By zoom-out 0.95, `stage.motes` at 0.03 and the N2 distance make the lone first stack almost invisible. That matches the design, where the neighbours and streams carry the frame, but without the network the end of zo-2 reads as an empty screen.
2. **The 0.22 core is close to white on desktop.** If the author finds it hot, the lever is to start the `stage.motes` dim a little earlier than 0.10.
3. **Ruling 1 in §11 (the warm speckle fades under zo-2) is not implemented.** It is not in this task's brief. The warm specks are visible in the 0.22 cloud. A `provenance.vibed` 0 → 1 key under zo-2 would turn every mote to the agent type, which may be the "one key" the ruling means, but vibed also changes visibility and hero forms, so I left it for a deliberate decision.
4. **The zoom-out alt text** describes stacks and streams that will not draw until Task 3. It is the designed text, used verbatim.
5. **netShots resolves N0 by generating the whole network** (memoised). That is fine for tests and tooling, and nothing at runtime imports it.

## Self-review

- Both mirrors changed in one commit, and step 3b is the same on both sides.
- No module-level mutable state in `pose`. `STACK` is frozen data. The netShots memo is test-only.
- No new dependencies. Commit messages and copy contain no names.
- The `shots/` temp scripts are deleted, no background processes are left, and the base worktree is removed.
