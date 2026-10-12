# Task 14 report: the opening build in order, the frame laid tube by tube, and the "Done" orbit

Status: DONE_WITH_CONCERNS (see Concerns: two design numbers changed so tests could pass, and the
landing flare is subtle on screen).
Base: d5d16a9 (the controller's "park the frost-growth frame entrance" commit, on 484f248).
Commits on main, not pushed:

- 5d0e5f5 scene: a landing flare, a shorter settle window, and settle fields
- b0b9d6e bike: the frame is laid in place, tube by tube
- 8213d44 story: the cold open re-cut: four lines, words before parts
- d8d1676 story: "Done" plays over one lap round the riding bike
- 1665537 docs: the round-2 cold open as built

No new runtime dependencies. `mote.glsl` and `mote.ts` change together, as the approved design
asks (§3.7). This overrides the global constraint that they stay unchanged; the parity e2e passes.

## What I implemented

### Scene (5d0e5f5)
- **Settle constants** (`settle.ts`):
  - `SETTLE_WINDOW` 0.12 → 0.08.
  - New `FLARE_WIDTH` 0.01 and `FLARE_GAIN` 1.0.
  - `mote.glsl` declares `MOTE_FLARE_WIDTH` and `MOTE_FLARE_GAIN`, and `mote.test.ts` checks them
    against the TS values.
- **The landing flare** is in `mote()` in both mirrors, as one line each:
  `brightness = mix(1, SETTLED, t) + GAIN · (1 − smoothstep(0, W, |assembly − settle|))`.
  There is no size change and no new code path.
- **Role windows:** `ROLE_SETTLE.core` is `[SETTLE_WINDOW, 0.44]` and `ROLE_SETTLE.body` is
  `[0.35, 0.97]`.
- **`MechanismPart.settleField?(local, h)`**:
  - `buildMoteAttrs` uses it in place of the hash spread.
  - The contract test holds every sampled value inside the part's declared window, and requires the
    window to be declared.
  - `docs/adding-a-mechanism.md` says how to use it, and warns that holds must stay a flare width
    from settle values.

### The frame's lay order (b0b9d6e)
- **`FRAME_LAY`** (`shapes.ts`) has nine tubes in §3.6's order, with §3.6's slots:
  1. the shell
  2. the down tube
  3. the head tube
  4. the seat tube with its collar
  5. the top tube
  6. the chainstays with the dropouts
  7. the seat stays
  8. the bridge
  9. the cables (front run, then rear)
- `frame()` now builds from the same named solids (`frameTubes`), in the same merge order. A
  throwaway test compared the geometry with HEAD's: the position arrays are identical for both
  builds.
- **The field** is `frameLaySettle(p, h)`:
  - It finds the nearest tube **surface** (distance to the axis less the radius; see Concerns 3).
  - `t` is the position along the tube, mapped through each run's `along` range. The collar is the
    top of the seat tube, the dropouts are the chainstays' far ends, and each cable is spread by arc
    length.
  - The result is `slot.from + width · clamp(0.8t + 0.2h)`.
- **The bike's frame** has `settle [0.81, 0.95]` (the lay order's span), the field, and an identity
  exploded offset.

### The re-cut cold open (8213d44)
- **Story** (`01-vibe-build.md`):
  - length 8
  - the §1 copy, with the brakes line gone
  - per-line `data-at` and `data-parts` exactly as in §2.5's markdown
  - the new alt text
- **Loader:**
  - `Beat.lines: { at, words }[]`, read from a document's `<li data-at>`. Other beats have `[]`.
  - Lints, each naming the file and the beat:
    - every document line has a `data-at`
    - the lines strictly increase
    - the first line is at or after `at + FADE`
    - the last line + FADE is before the page's out
    - `data-at` appears nowhere else
- **Curves:**
  - `lineReveal(l, at, fade)` in `reveal.ts`.
  - `BeatLook.lines` holds each line's reveal.
  - `applyLooks` writes `--reveal` on each `ul.brief > li`, and `mountStory` checks the line counts.
  - CSS: `ul.brief > li { opacity: var(--reveal, 1) }`. In `.no-js` it is 1. There are no
    transitions.
- **Bike windows:**
  - drive `[0.54, 0.60]` (see Concerns 1)
  - fork `[0.69, 0.72]`
  - frame `[0.81, 0.95]`
  - fittings `[0.94, 0.97]`: both brakes, both mudguards (the rear one carries the rack), and the
    ground
  - loose bolts `[0.54, 0.59]`
  - `briefThresholds` = `[0.44, 0.60, 0.72, 0.97]`
- **Keys** follow §2.4:
  - assembly with its four held stages, then 1 at 0.85625
  - drive 0 → 2 over 0.43125–0.5125, held to 0.875, 2.4 at 1
  - the reveal's drive re-keyed to 2.7 / 2.9 / 3.0
  - the steer cancel: nine linear keys of `−sin(πd/2)`
  - the turn: 0 → +1 → −1 → 0 over 0.625–0.70, inOutQuad
  - the camera holds S0, S1, S2, S3, S1 and S1′ at the new times, with the S1 → S1′ linear lean-in
  - frame 1 on S2/S3
  - S4 is retired
- **Fences:**
  - **The ordering fence** (`content.test.ts`). For each line, its new parts (see Concerns 2) set
    out only after `at + max(0.3, words/40)/L`. No line is met before `at + FADE`.
  - **The dwell rule.** A document's dwell is now the ask's own, up to its first line (0.3
    screens).
  - **The sync fence** (`storyboard.test.ts`) also reads the round-2 doc's §1 table (per-piece word
    counts and the total), and checks that its §2.5 markdown block appears verbatim in the story.
  - **The 10-04 storyboard:**
    - §1 row and alt text
    - §2.1 table, rewritten local-first so the fence parses it
    - §2.5
    - §3.1 example
    - §3.3 dwell
    - §3.5
    - §6

### The lap (d8d1676)
- **Waypoints and keys** (`shots.ts`):
  - `LAP` holds W0..W6, with W0 = S1′ and W6 = S1′ at bearing 405.
  - `lapShot(t)` is a centripetal Catmull-Rom (Barry–Goldman) through the waypoints. It runs in
    (bearing, elevation, ln d, fov, target), with knots spaced by the square root of the camera's
    own path length. Waypoint i sits at `u_i = inOutCubic(t_i)`, so the camera is at Wi at its own
    `t`, and both ends have zero speed.
  - `orbitKeys()` emits keys at every 1/36 of the lap plus each inner waypoint (41 keys), linear,
    rounded like the other camera keys.
  - The comment names "hold S1′" as the only reduced-motion form.
- **Frame:** keyed by hand: 0 at 0.94375, 1 at 0.9675 (inOutCubic), 0 at 0.9875.
- **Clearance moves** (see Concerns 4):
  - W2 to 5.2 m at fov 38
  - W3 to 6.3 m
  - the dive's lens shift starts at W3

### Docs (1665537)
- The round-2 design's new §7 "As built" lists every difference and why.
- The storyboard's §2.7 points to it.
- The design's §1 line-1 word count is corrected: 14, not 15. Its 96 total was already right.

## Tests (spec §6) and where they live
1. Windows in list order: `bike/index.test.ts` ("builds in stages that never overlap"). Thresholds
   `[0.44, 0.60, 0.72, 0.97]` are in `brief.test.ts`, checked for both the literal lines and the
   shipped brief.
2. Frame lay order: `bike/index.test.ts`.
   - Each mote lies in its tube's slot, within a radius of it.
   - Mean settle rises down the list.
   - Rank correlation of settle with `t` is between 0.9 and 1, per tube.
3. The twin inherits the order: `bike/index.test.ts`.
   - Settle against height along the steer axis on the twin's head tube: correlation ≥ 0.9.
   - The last tenth to land are in the mast sleeve.
   - The twin top tube runs from the stub (the first tenth is within 0.12 m) to the mast join (the
     last tenth is within 0.12 m).
4. Flare: `mote.test.ts`.
   - The constants, and the GLSL declarations.
   - At settle: `SETTLED + GAIN`.
   - At `settle + W`: SETTLED.
   - At `settle − W`: the flight glow.
   - Monotone either side.
5. No flare at rest: `keyframes.test.ts`. It scans the keyframes at 0.0005 for every constant-
   assembly stretch, including the spec section's hold at 0.46 and the finished bike. In each, every
   bike settle value is ≥ FLARE_WIDTH from the held value. It finds at least 7 holds.
6. Seam: `bike/index.test.ts`. At assembly 0.86 (via the real `mote()`), the motes flaring over half
   are all frame motes, on at most two consecutive tubes, within 0.03 m of them.
7. Steer: `keyframes.test.ts`.
   - `|total| ≤ 0.02` over 0.43125–0.5125. Not vacuous: the drive's own swing reaches full lock
     there.
   - The turn reaches +1 at 0.64375 and −1 at 0.68125, and is 0 at both ends, with assembly and
     drive still.
   - rv-3's swing is unchanged.
   - "No steering elsewhere" now has three windows.
8. Shots: `shots.test.ts` HOLDS are as §6.8, and S4 is gone.
9. The lap: `shots.test.ts`.
   - Regenerated `orbitKeys()` equals the file's lap keys (at, pos, target, fov) to 1e-3.
   - It starts and ends on S1′.
   - Bearing strictly increases, over 360° ± 1.
   - It passes through W0..W6 at their locals, at the shot test's tolerances.
   - Added: the twin stays under the 42% band and on screen at 1440×900 and 390×844, at 101
     samples.
10. Brief lines:
    - loader lint: `loader.test.ts`
    - `lineReveal` knots: `reveal.test.ts`
    - each shipped line is 0 before its `at` and 1 after `at + FADE`: `reveal.test.ts`
    - the ordering fence: `content.test.ts`
    - the round-2 §1 table as a fence source: `storyboard.test.ts`
11. Dwell: `content.test.ts` (the ask's dwell; the per-line rule is the fence).
12. Absent, not dim: `e2e/brief.spec.ts`, at both sizes. For each line:
    - opacity 0 and unmet at `at − 0.01`
    - opacity 1 and unmet at `at + FADE`
    - unmet 0.002 before the local where its threshold is reached, met 0.002 after

    The "five lines" tests are now four.
13. Purity: `e2e/pages.spec.ts` samples each brief line mid fade-in. It compares every line's
    `--reveal` and opacity by jump, forward and backward, and checks that each is part-way up.
14. Clearance: `e2e/clearance.spec.ts`, unchanged, now over the 8-screen section and the lap.
15. No transitions: `ul.brief > li` was already covered (`text.spec.ts`). The no-JS test now also
    requires every brief line at opacity 1.
16. Screenshots: `e2e/shots.spec.ts` "screenshot the cold open at its named frames":
    - vb-brief-ask
    - vb-brief-line1..4
    - vb-turn-lock
    - vb-frame-knot, vb-frame-mid, vb-frame-stays
    - vb-lap-low, vb-lap-crane, vb-lap-diagram, vb-lap-dive
17. Parity: `e2e/parity.spec.ts` passes. Mutation check: with the GLSL gain at 0.5, it fails
    ("bike: copy row 1").

## Test results
- **Typecheck.** `npx tsc --noEmit -p .`: clean.
- **Unit tests.** `npx vitest run`: 52 files, 883 tests passed. The baseline was 52 files and 826
  tests.
- **Full e2e.** `E2E_PORT=4205 npx playwright test`, fresh build, on 1665537: 103 passed, 8 skipped
  (the shots), 0 failed, in 6.7 min. The baseline was 101 passed and 7 skipped. The additions are
  the absent-not-dim test at two sizes and the new named-frames shot test.
- **Screenshot run.** `SHOTS=1 E2E_PORT=4205 npx playwright test e2e/shots.spec.ts e2e/compare.spec.ts`:
  27 passed, in 6.2 min. It writes `shots/<beat>.png` and `shots/vb-*.png` (the 13 named
  cold-open frames).
- **Targeted e2e runs while iterating:**
  - `parity.spec`: 1 passed.
  - `brief.spec`, `text.spec`, `pages.spec`: 21 passed.
  - `clearance.spec`: 4 passed on the re-cut, and again with the lap.
  - `app.spec`: 16 passed.

## TDD evidence
- **Flare and constants.** RED: `npx vitest run src/scene/mote/mote.test.ts src/scene/mote/attributes.test.ts`
  gave 13 failed (`expected 0.12 to be 0.08`; `expected undefined to be 0.01`;
  `expected [0.12, 0.45] to deeply equal [0.12, 0.44]`). Expected: none of it existed yet. GREEN:
  `npx vitest run src/scene src/mechanisms`, 469 passed.
- **Lay order.** RED: `npx vitest run src/mechanisms/bike/index.test.ts` gave 5 failed (the window
  was still [0.8, 0.95]; a mote at 0.882 outside its slot; down tube rank correlation −0.019).
  Expected: there was no field yet. GREEN: 473 passed, after the frame declared the field.
- **Loader lines.** RED: 10 failed of 43. GREEN: 43 passed. One fix in between: 0.7 + 0.1 < 0.8 in
  doubles, so a 1e-9 tolerance.
- **Line curves.** RED: 6 failed (`lineReveal is not a function`; looks without `lines`). GREEN: 18
  passed.
- **Keyframes, fence, seam, lap:** written after the keys or windows they test. They passed on
  their first run, so I mutation-checked them instead:
  - **Ordering fence:** line 2 `data-at` moved 0.3625 → 0.39. The fence fails ("its new parts set
    out only after it has been read").
  - **No flare at rest:** the 0.45 hold moved to 0.4450001. It fails ("held at 0.4450001 …
    expected 0.00503 to be ≥ 0.01").
  - **Round-2 sync fence:** line 3 `data-at` moved 0.525 → 0.53. It fails ("times the brief as its
    §2.5 markdown does").
  - **Lap:** one lap pos key hand-edited. Test 9 fails.
  - **Lap clearance:** at the design's starting waypoints, the unit lap clearance failed (sample 47,
    top 0.1603 against 0.16 NDC). That failure is what moved W2 and W3.

## Screenshots
`?test=1`, a fresh page per shot, full page (text and canvas), at 1440x900 (`desktop-`) and 390x844
(`portrait-`). They are in `shots/task14/`, made by
`.superpowers/sdd/2026-10-03-plan-3-bicycle/task14-at.mjs` with a preview server on 4205 (since
stopped). Local values are vibe-build's.

- **The brief, each line just after it appears (`*-up`) and mid-build (`*-build`).**
  - `ask` (0.2): only the ask is on the page, over the starfield.
  - `line1-up` (0.23): the ask and line 1 (dim ink), and nothing else. The shell is still loose.
    `line1-build` (0.3125): saddle, bars and pedals in flight, under the text.
  - `line2-up` (0.38): line 1 lit; line 2 is up, dim; lines 3 and 4 absent. The core is still on
    its own.
    `line2-build` (0.44): the drive side close up, both wheels converging, the cranks and pedals.
  - `line3-up` (0.5425): lines 1 and 2 lit, line 3 up and unmet. The wheels and chain are on, the
    fork not yet.
    `line3-build` (0.59): the fork with its basket and headlamp flying in at the front.
  - `line4-up` (0.73): lines 1 to 3 lit, line 4 up, dim. The bike stands without a frame: wheels,
    fork, basket and the saddle on its mast.
    `line4-build` (0.80): the frame laying.
  - In every one, no line is visible before its turn, and the parts fly in only after the line is
    up.
- **The turn.** `turn-lock-a` (0.64375) and `turn-lock-b` (0.68125): the front wheel, basket and
  the saddle on the mast are turned to one lock, then to the other. Nothing else differs between
  the two.
- **The frame laid.**
  - `frame-1` (0.79, assembly 0.82): the down tube and head tube stand alone in the cloud. There is
    no stub under the bars, no top tube and no stays.
  - `frame-2` (0.805, 0.86): the stub is in, faintly brighter. A haze of motes converges from the
    bars to the mast where the twin's top tube is being laid.
  - `frame-3` (0.82, 0.90): the main triangle is closed and the chainstays are on.
  - `frame-4` (0.835, 0.94): the stays are done; the mudguards, rack and ground strip arrive from
    below.
  - Zoom crops of the frames are `zoom-frame-{1,2,3}.png`.
  - The order is unmistakable. The flare itself is only faintly visible (Concerns 5).
- **The lap.** `lap-1` .. `lap-8` at t 0.09, 0.18 (W1), 0.28, 0.38 (W2), 0.55 (W3), 0.65, 0.74
  (W4), 0.90 (W5):
  - **The low pass:** square to the drive side, the ground strip edge-on.
  - **The crane:** above and behind; the bars nearest and the saddle far over the basket. Small on
    screen.
  - **The diagram:** high on the far side, flattened.
  - **The approach to the dive:** a big three-quarter from the front-left.
  - **The dive:** close on the saddle on its mast, low-right under the text, the front wheel under
    it, cropped by the bottom edge.
  - **W5:** the whole bike from the front-left, coming round.
  - On the phone the same shots are smaller, and the text is always clear.
- **The hand-over.** `reveal-start` (reveal 0.02): S1', identical framing to the lap's end, with
  rv-1's line.

## Files changed
- `src/scene/mote/{settle.ts, mote.ts, mote.glsl, mote.test.ts, attributes.ts, attributes.test.ts}`
- `src/mechanisms/{types.ts, contract.test.ts}`
- `src/mechanisms/bike/{shapes.ts, index.ts, index.test.ts}`
- `src/story/{01-vibe-build.md, loader.ts, loader.test.ts, reveal.ts, reveal.test.ts, dom.ts, brief.test.ts, content.test.ts, storyboard.test.ts, markup.test.ts}`
- `src/style.css`
- `src/timeline/{keyframes.json, keyframes.test.ts, shots.ts, shots.test.ts}`
- `e2e/{brief.spec.ts, pages.spec.ts, text.spec.ts, shots.spec.ts}`
- `docs/adding-a-mechanism.md`
- `docs/specs/2026-10-04-act-1-storyboard-and-text-engine.md`
- `docs/specs/2026-10-05-act-1-build-and-orbit.md`
- Not committed (`.superpowers/` is ignored): `task14-at.mjs` (screenshots at locals) and
  `task14-crop.mjs` (zoom crops).

## Self-review
- **Throwaway files removed:** the probe, the generator and the geometry-comparison tests under
  `src/`.
- **No stray scripts:** `git status` was clean after each commit, and the keyframes formatting
  round-trips the file's own style (checked against HEAD).
- **No background processes left:** I stopped my preview server and confirmed port 4205 was free.
- **Purity:** `lapShot` and `frameLaySettle` are pure, and `FRAME_LAY` is a frozen-at-load const.
  Nothing is time-based. The lap is a pure function of scroll progress, like every other key.
- **Cold-open comments** were rewritten for the new stages and timings: the bike's settle-window
  comment, `ROLE_SETTLE`'s doc, the `settle.ts` docs, and the shots descriptions.

## Concerns
1. **The drive's window starts at 0.54, not 0.53.**
   - The design's claim that 0.53 − 0.08 = 0.45 ≤ 0.46 is "still true" is backwards: the drive
     would set out before the spec section's 0.46 hold.
   - The existing keyframes test (no body mote moved during sp-6, "the gold lands first, and only
     the gold") fails at 0.53.
   - At 0.54 the drive sets out exactly at 0.46. Every threshold and hold is unchanged.
2. **Readings I had to choose.**
   - **Test 1:** "disjoint in list order" cannot hold for the fittings, which §3.6 designs to set
     out during the frame. They are tested as starting after the frame starts and ending after it
     ends.
   - **The ordering fence:** a line's parts are those not already in place when the line before it
     lit (line 2 names the pedals, which land with line 1; line 3 names the front wheel).
   - **`local(a)`:** "first local where assembly passes a, strictly". With "reaches", the held
     stages would set out before their own lines.
3. **The frame field uses the nearest tube surface (distance less radius), not the nearest axis.**
   The rear cable runs 0.024 m off the top tube's axis, so on the axis rule the top tube's skin on
   that side would be laid as cable.
4. **The lap's crane and diagram are further out.**
   - The changes: W2 3.8 → 5.2 m with fov 34 → 38; W3 4.6 → 6.3 m. The dive's lens shift starts at
     0.94375, not 0.95.
   - At the starting values, the twin's top reached 32% of a wide screen between the crane and the
     diagram, inside the text band.
   - As a result the crane and the diagram are small, especially on the phone, where the portrait
     rig backs off further. The dive and the low pass are the lively shots.
5. **The landing flare is subtle on screen.** The tube-by-tube order reads clearly in stills: laid
   tubes, missing tubes, and a haze of motes converging on the live tube. But the flare itself (1.5×
   flight glow at the instant of landing, on settled motes that are lit at 0.5) is only faintly
   brighter than the tubes already laid.
   - Why: with the ease-out flight, a mote looks landed well before its settle value, so the bright
     instant trails the visual arrival.
   - The design's levers are `MOTE_FLARE_WIDTH` and `MOTE_FLARE_GAIN`; I left them as designed.
6. **The vb-4 line sits over a moving camera.** Its page's panel is as tall as the brief's, so the
   lap must clear the whole band even though vb-4 is one line. That is why the crane and diagram had
   to go further out.
