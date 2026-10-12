# Task 5 report: the galaxy drawn by level of detail (behind `?galaxy=1`)

Status: DONE_WITH_CONCERNS. Base f253337, branch main, not pushed.

## Commits

- f3edb64 galaxy: name the moon, track and glow roles, move the crack face past them, and name the glow sprite's two fives
- a532be0 galaxy: draw the background and the body set by level of detail, with the lod mirror pair, its parity mode, and the probe shots
- 6f243e5 galaxy: put the galaxy behind ?galaxy=1, frame the probe shots in test mode, and test the levels, halos, caps and budget

## What was built

- **`src/scene/node/lod.ts` + `lod.glsl`** (mirror pair). The file holds `LodElement`, `LOD_BANDS`, `lodGain` (smoothstep over the band, 0 below it), `systemPx`, `glowPx` (re-exported from body.ts and not redefined), `PX`, `HAZE_GAIN` and `Viewport`. All values are copied verbatim from the brief. It also adds `LOD_VISIBLE` 0.02, `lodLevel` (the splits at 10 and 60), `PLANET_POINT_PX` 2, `TRACK_DOT_PX` [1.4, 2], and the CPU-side rules described under concerns 1 and 2 (`detailPx`, `onScreen`, `glowCaps`, `FULL_DETAIL_MAX`, `HALO_APART`). The GLSL constants are spliced in from `glslLodConstants()`. To make that possible, the two literal 5s in body.ts `glowPx` became `GLOW_SCALE` and `GLOW_MIN_PX`, with no change in behaviour.
- **`?lib=lod` parity** (fields.ts `LodOut`, shaders.ts `LOD_VERTEX`, parity.ts `lodCases`, e2e/parity.spec.ts):
  - `lodGain`: every element at every 0.25 px over 0–140 px, 2,805 samples.
  - `glowPx`: 2 radii × 3 focal lengths × 4 caps (18, 24 and two caps that bind) × 96 log-spaced distances, 2,304 samples.
  - Tolerance 1e-5.
- **Mutation checks**, each undone with an exact inverse `sed`:
  - In lod.glsl, `GLOW_SCALE * R` changed to `5.05 * R`. The parity test failed with glowPx at 0.233.
  - `LOD_BANDS[el]` changed to `LOD_BANDS[el] + vec2(0.0, 0.5)`. The parity test failed with lodGain at 0.0433.
  - I also mutation-checked two of the new e2e tests:
    - Removing the halo cap made "halos apart" fail at galaxyWide (glows R_a and R0 are 5.2 px apart, against a sum of radii of 6.58).
    - Making moons ignore `s_px` in shell.vert made "no moon or track mote" fail.
- **`bodyAttrs.ts`** builds the instance data straight into typed arrays:
  - Shell motes: `aLL` = `latticeLL`, and `aMote` = (row, role, system, lattice index). A moon's motes are `NodeRole.Moon`; every other body's are `Builder`. A planet's mote 0 is its 2 px point.
  - Glow slots and track dots. A track dot sits at its own true anomaly, converted to a mean anomaly on the CPU, and a track's moons share the first moon's ellipse.
  - The per-body shell texture: the shape from `shellSeed(id)` (or, for a cracked body, `shellEvent(...)`'s shape at the ambient), the spin axis from `spinAxis(shellSeed(id))`, A = EQ_A when cracked and 0 otherwise, the mote diameter, and the mote count.
  - `glslGalaxyConstants()`.
- **`bodySystem.ts`** draws four meshes: net-tracks, net-bodies, net-shells and net-glow.
  - net-glow uses shell.vert.glsl with the Glow role. mote.frag.glsl gains form 3, the glow profile core(r) + halo(r).
  - net-bodies is a single geometry holding both icospheres (320 and 80 triangles, `aPart`), so it can stay one mesh. Rim `pow(1 − |n·v|, 2.6)·0.55`, fill 0.035, or 0.28 on moons.
  - Every shader is built with `withGalaxyLibrary`: the mote library, then `orbitLibraryGlsl()`, shell.glsl, lod.glsl and the instance chunk, each once.
  - The CPU fills `uSysPx[SYS_MAX]` and `uGlowCap[GLOW_MAX]` each frame. In test mode, `forceLod` overrides gains.
  - `uAmbient` is the static 0. Growth, light, lamp, streams and derps are not applied (Task 6). A cracked shell shows only its morph.
- **`galaxySystem.ts`** draws four meshes: galaxy-haze, galaxy-dust, galaxy-stars and galaxy-bright.
  - Each point is a fixed size on screen: 56 / 1 / 2 / 3 px, `clamp(px, min, max) × uPixelRatio`.
  - The haze is drawn only when the camera is more than 300 from the core.
  - The group's model matrix turns the galaxy and anchors it at N0, the same transform `bodyWorld` uses.
- **`galaxyShots.ts`** holds §14.5's six shots and resolves them world-anchored and untracked. `close` = `HERO_CLOSE.C1`, and `lookFromBearing` is imported. A TS-only `galacticToWorld` was added to orbit.ts beside `bodyWorld`.
- **`main.ts`**:
  - `?galaxy=1` replaces the stacks network in its build slot and works without `?test=1`. The tier is the screen's at load, and the far plane is 4000.
  - `?shot=` is honoured only with `?test=1` and draws the galaxy alone (the bike's motes and the ink are hidden). It loads galaxyShots.ts with a dynamic import, so the freeze-pin search in ambient.ts does not run on the default page; that page draws no frame until the import resolves.
  - New test hooks: `lod()`, `glows()`, `forceLod(el, gain)` and `isolate(names)`.
  - Every other default is untouched.
- **`package.json`**: `"stills"`. **e2e/stills.spec.ts** holds the `STILLS` table and writes the T5 rows.

## Ruling on CrackFace

CrackFace was 2, which collides with Moon. It is renumbered to 5: NodeRole is Builder 0, Person 1, Moon 2, Track 3, Glow 4, CrackFace 5. Every user is symbolic:
- `ROLE_CRACK_FACE` is generated in node.glsl.
- nodeAttrs.ts, node.ts, node.test.ts, box.test.ts and parity.ts use the enum.
- The aMeta comment in nodeLayout.ts is updated.

The old node parity and network e2e stay green.

## Tests

- `npm run typecheck`: clean.
- `npx vitest run`: 80 files, 1,697 passed.
- Full e2e, `E2E_PORT=4199 npx playwright test`: 163 passed, 10 skipped (the SHOTS-only specs), 0 failed, 27.1 min. Before this task it was 150.
- New unit tests:
  - lod.test.ts: the bands, the level splits at 10 and 60, glowPx clamping to [5, 18] and [5, 24], systemPx, and the GLSL splice.
  - bodySystem.test.ts:
    - The counts match the generator, set by set.
    - aLL = latticeLL for every mote.
    - The shell texture holds each body's own seed, axis and A.
    - The track dots sit at even true anomaly.
    - detailPx caps at two and is continuous.
    - glowCaps keeps halos apart.
    - The shaders' palette and profile copies match the source.
  - galaxySystem.test.ts: the tier's counts, the frame matching `galacticToWorld`, and the haze switching at 300.
  - galaxyShots.test.ts: the values match §14.5, and the keys round-trip.
- New e2e (galaxy.spec.ts): 5 tests × 2 sizes, plus "caps at DPR 3" at both sizes.

TDD, honestly: I wrote the renderer before its tests. A first draw was needed to find out what the shots can satisfy (concerns 1–3), so there is no RED run of the brief's tests against an empty tree. The evidence that the tests can fail is the mutation checks above, two for parity and two for the e2e. Each was undone with an exact inverse edit.

## How the brief's e2e expectations were applied

- **Levels** (`__motes.lod()`, s_px as the shaders take it; an off-screen system counts as star-only):

  | Shot | Phone 390×844 | Desktop 1440×900 |
  |---|---|---|
  | galaxyWide | [30, 0, 0] | [0, 30, 0] |
  | hood | full 0, star-and-planets 19 | |
  | system | [25, 3, 2] | full 2 |

  Every shot at both sizes has at most 2 full. The brief's "galaxy wide star-only" and "hood full = 0" are asserted on the phone only; see concern 3.
- **No moon or track mote where s_px < 60.** Forcing the Moon, Track and Derp gains to 0 gives a byte-equal frame on the phone at hood and on the desktop at galaxyWide; those are the shots where every system is under 60 px. The positive control is the system shot, where the same forcing changes the frame.
- **Halos apart** at all six shots:
  - Every pair of on-screen glow sprites reported by the page is further apart than the sum of their radii.
  - With only net-glow drawn, every lit pixel lies within r + 1.5 px of a reported sprite.
- **Caps at DPR 3** (hood, isolated meshes):
  - The brightest bright-star component is ≤ 11 device px wide.
  - The brightest dust component is ≥ 3 device px.
- **Resize** 390×844 → 844×390 → back, and the same for desktop: drawStats instances are identical, `lod()` changes when turned and is restored, and there are no console errors.
- **Budget**:
  - The meshes match the generator: net-shells = instances.shells, net-tracks = tracks, net-glow = glow, and net-bodies = bodies − ghosts.
  - Σ net-* + persons + ghosts + streams = `Galaxy.instances.total`, which is 75,889 and within the 76,000 budget. Persons, ghosts and streams are Task 6's sets, so Σ net-* cannot equal the total yet.
  - The galaxy-* meshes match the tier's counts exactly (stars + bright = BG.stars[tier], dust = BG.dust[tier], haze 1).

## Stills (shots/galaxy/, not committed: shots/ is gitignored), phone looked at first

`shots/galaxy/T5-{galaxy-wide,hood,core,system,twelve,close}-{390x844,1440x900}.png`

- **T5-galaxy-wide-390x844.** It reads as a galaxy: a two-arm spiral with a soft core haze and a few dozen blue star points round the core. The six core bodies are a tight bright knot at the centre, and the 30 neighbourhood stars are crisp blue points scattered over the inner disc.
  - Nothing is blown out. An earlier draw was blown out: hundreds of shell motes piled into one white pixel. That is fixed by fading a star's or core body's shell into its glow below a 1–3 px radius.
  - The neighbourhood does not read as "a knot on an arm". It is spread across the inner disc beside the core.
  - The whole picture is dim, with about the bottom two thirds of the screen used and the top third empty sky.
  - The halos stay apart.
- **T5-hood-390x844.** About 30 stars, each a small blue lattice bubble with a brighter centre. Planets are dots or small bubbles beside them. The six core bodies sit at the left as a group of larger bubbles. There are no rings or moons, and background stars and dust are faint behind. Nothing is blown out, and the halos are apart. It reads as a field of small systems rather than a cluster on an arm.
- **T5-core-390x844.** Five or six core bodies as large lattice spheres, each with a small glow at its centre. There is no haze here (closer than 300). The background is nearly empty at this distance: a few dust points and no arm. The picture is clean but sparse.
- **T5-system-390x844.** P_a is a dense lattice bubble at the frame point. Its dotted planet orbits are visible as faint concentric dotted ellipses. N0 is below it with its moons as small clusters and its moon tracks faintly dotted. A neighbouring system at the top right also shows dotted orbits; it is the second of the two allowed at full detail. Nothing is blown out. The orbits are faint at DPR 1.
- **T5-twelve-390x844.**
  - Two of P1–P3's systems show their dotted orbits at the bottom of the frame; the third is held below full detail by the cap.
  - Many neighbour stars fill the upper part.
  - The world-anchored centroid frame puts the systems low.
  - C1's dense hero lattice was a white blot in an earlier draw. It is now a blue bubble, after a density limit on overlapping shell motes.
- **T5-close-390x844.**
  - C1 is a large lattice sphere at the close frame point, with its six moons as lumpy clusters. A moon's lattice is coarse, about 18 motes, each drawn at its world size, about 8 px here. Moon tracks are faintly dotted.
  - The top of the frame holds a horizon-like row of far bubbles, other systems seen at the camera's 32° elevation, under where the text band would be. Clearance of the text band is Task 13's.
- **Desktop.**
  - galaxy-wide: the same picture, larger and still dim.
  - hood: 30 systems with planet bubbles, and the core group at the left.
  - system: P_a with its orbit rings.
  - twelve: two systems with rings.
  - close: C1 with its moons, plus a neighbouring planet very close to the camera in the bottom-left corner, drawn as large overlapping 30–40 px motes. That is ugly, and it is a direct consequence of `PX.mote`'s Infinity cap combined with the world-anchored camera; see concern 4.

## Concerns (need rulings)

1. **"At most two systems at full detail" does not follow from the shots**, so the renderer now enforces it.
   - The neighbourhood as generated is packed (Task 1's packing ruling). With s_px from distance alone, the phone system shot had 28 systems at full detail and the desktop hood had 26.
   - I added two CPU rules:
     - A system off screen fades its s_px to 0 over its own radius (`onScreen`).
     - `detailPx` keeps the two largest and holds every other system at 59.9 px. The top two are held at 59.9 + 10 × (their lead over the third). This is continuous, so a system never pops in or out.
   - Effects: the twelve shot shows only two of P1–P3 with rings, and on the desktop hood the top two systems are barely past 60 (moon gain about 0.07).
   - If the controller prefers another rule (for example, letting the constraint fail and changing the shots in Tasks 7–8), it is one function in lod.ts.
2. **Halos apart fails on the generated core**, so the renderer now enforces it.
   - R_a–R0 at galaxyWide: 5.2 px apart against radii summing to 6.6 (phone), and 10.7 against 13.5 (desktop).
   - R_c–R1 at the close shot: 12 against 24 (phone).
   - The core's bodies are only 5–12 units apart, so §4's "no two can ever touch" no longer holds.
   - `glowCaps` limits each sprite to 0.9 × half the distance to the nearest on-screen sprite. It is computed per frame and passed as `uGlowCap`; the GLSL's `glowPx` takes it as the cap.
   - The other fix would be in the generator (`CORE_MIN_GAP` of at least about 10). That would move the freeze pin, so I did not touch it.
3. **The desktop's levels contradict the brief's expectations, as the spec intends.** The galaxy wide on a desktop has systems of 20 px, which is star-and-planets, and the desktop hood has systems of about 100 px. The spec says "a desktop reaches a level sooner than a phone, as it should". So "galaxy wide star-only" and "hood full = 0" are asserted on the phone; the desktop asserts what holds (galaxy wide 0 full and all 30 star-and-planets; at most 2 full everywhere).
4. **Look.**
   - At DPR 1, dotted orbits and moon tracks are faint. I raised `TRACK_DOT_PX` to [1.4, 2] (§12.2's 1.4 px) and their brightness to 0.8.
   - `PX.mote`'s Infinity cap lets a body right next to the camera draw 30–40 px motes (desktop close still).
   - Moon lattices are lumpy close up.
   - The world-anchored close and twelve framings put far systems under the text band.

   These are for Tasks 6, 7 and 13.
5. **Additions to the brief's interfaces:**
   - `createGalaxySystem(bg, origin?)`: N0's galactic place at an ambient, which the background's frame needs.
   - `BodySystem.glows()` and `forceLod()`.
   - `bodyAttrs` packing functions in place of a `BodyMoteAttrs` object array, because tens of thousands of motes go straight into typed arrays.
   - `LOD_VISIBLE`, `lodLevel`, `PLANET_POINT_PX`, `TRACK_DOT_PX`, `HAZE_FROM`, and the rules in concerns 1–2.
   - The test hook `isolate(names)`, which draws only the named meshes and is used by the halo and DPR tests.
6. **Sprites are instanced quads, not `gl_PointSize`.** The essay renders quads (design §6.4: an `ALIASED_POINT_SIZE_RANGE` of 64 on some devices would clip the 56 px haze at DPR 2 and above). The brief's formula is kept as the quad's size: `clamp(px, min, max) × uPixelRatio`.
7. The default page still renders the old network and passes every old test. `?galaxy=1` costs a galaxy generation when built, as the old network did. The freeze-pin search runs only when a `?shot=` is asked for.

Helper scripts used in shots/ (a level probe, a console probe and an isolate probe) were deleted. Only the stills remain under shots/galaxy/.

## Fix round 1

All ten findings from task-5-review.md are fixed.

- **Important 1, icospheres.**
  - `ICOSPHERE_DETAIL = { body: 3, moon: 1 }` (bodySystem.ts). three.js's `IcosahedronGeometry(1, detail)` has 20·(detail+1)² triangles, so the body sphere is now 320 triangles; detail 2 had given 180. The moon sphere stays at 80.
  - `icospheres()` is exported, and a new unit test asserts the per-part triangle counts are [320, 80].
  - The comments in bodySystem.ts and the body.vert header now match the geometry. The original report's "320 and 80" claim was wrong for the first draw and is right from this round.
- **Minor 1, caps (e2e).** The test now runs at DPR 2 and DPR 3, at both sizes.
  - At DPR 2 a screenshot pixel is a buffer pixel. The brightest bright star must be between 3·ratio − 1 and 3·ratio + 1 px wide (+2 at DPR 3, for the 1.5× upscale). The brightest dust mote must be at least `ratio` px.
  - Measured: star 6 px at DPR 2 (both sizes), 10 / 9 px at DPR 3 (phone / desktop). Dust 2 px at DPR 2, 3 / 4 px at DPR 3.
- **Minor 2, held systems (new e2e: "a system held under full detail draws no moon or track mote").** It runs at the system and twelve shots, both sizes.
  - Precondition, asserted: some system reaching at least half its radius into the frame is full size (≥ 60 px) but held under 60.
  - Forcing Moon, Track and Derp to 0 may change pixels only inside the systems the page reports as full. "Inside" means how far each full system's outer sphere reaches on screen: 400 points projected through the essay's camera, plus 2 px.
  - A first version used outer·focal/d as the radius. It under-estimated the reach near the frame's edge (perspective), which flagged 14 true track pixels, so it was replaced.
  - The test also asserts that the full systems do change some pixels.
- **Minor 3, halos (e2e).** The pixel half now uses a mask threshold matched to the profile, `GLOW_LIT` 4/255.
  - The lit radius is derived from the halo term, 0.45 (1 − r)² at `BODY_LOOK.glowBrightness`, giving 0.803 of the sprite's radius.
  - The slack is 0.5 px. Measured on the correct build, the most any lit pixel went past that radius was −0.02 px, at the phone galaxy wide.
- **Minor 4.** `glslLodConstants` emits `const int LOD_COUNT = 5;` and `LOD_BANDS[LOD_COUNT]`. All three shaders declare `uLodForce[LOD_COUNT]`, and TS sizes `force` from the exported `LOD_COUNT`. lod.test.ts asserts both.
- **Minor 5.**
  - star.vert's tint is spliced: the AGENT / WARM / WARM_MIX literals are gone and replaced by a marker. `glslStarTint()` builds them from NODE_PALETTE.NODE_AGENT and a new `STAR_TINT = { warm: '#FFF2E0', warmMix: 0.55 }`. The old (1.0, 0.95, 0.88) is now #FFF2E0 ≈ (1.0, 0.949, 0.878).
  - galaxySystem.test.ts asserts there are no copies in the source and that the spliced constants equal the TS.
  - star.frag's comment now names bodySystem.test.ts.
- **Minor 6.** `Body` gains `track: 0 | 1 | 2 | null` (generate.ts), set from the moon's draw. `buildTrackAttrs` and `fitBudget` now dedupe moon tracks by `m.track` (fitBudget is the sibling counting site). generate.test.ts still counts by radius, which now serves as an independent cross-check. The counts are unchanged.
- **Minor 7.** The shell.vert header now says lattice mote 0 is the planet's point, so the shown bubble lacks that one site, and why: it keeps net-shells at Σ latticeCount.
- **Minor 8.** `Lamp` enum in galaxyShots.ts: Off 0, Planet 1, Star 2, Hood 3, Core 4, Lineage 5, matching Task 6's planned values. `GalaxyShot.lamp` is typed `Lamp`, and a test checks the six shots' lamps.
- **Minor 9.** The glow sprites' natural diameter is `diam`, no longer an overwritten `d`. This applies to glowCaps, bodySystem and the tests.

### Mutation checks

The permission layer did not refuse any. Each was undone with an exact inverse sed and confirmed by grep.

- **Minor 1:** in star.vert, `clamp(...) * uPixelRatio` → `clamp(...)`. All four caps tests failed: brightest star 3 px against ≥ 5 at DPR 2, and 6 px against ≥ 8 at DPR 3.
- **Minor 2:** in bodySystem.ts, `sysPx.set(lastSys)` → `sysPx.set(raw)`. Both held-system tests failed at the system shot, with 514 and 111 pixels outside the full systems.
- **Minor 3:** the glow ignores uGlowCap (shell.vert uses the kind's cap). At slack 0.75 only the desktop failed: the phone's excess was 0.73 px. With the slack tightened to 0.5, both sizes fail at galaxyWide, with 7 and 56 stray pixels. The clean build passes at 0.5.

### Stills

Re-run, phone first: shots/galaxy/T5-*. T5-system and T5-close at 390×844 look the same as before.
- The icospheres' rim is a faint 1–2 px limb under the shell motes, so the finer sphere does not show at these sizes.
- **T5-system:** P_a's bubble, its dotted orbits and N0's moons.
- **T5-close:** C1's lattice sphere with six lumpy moons and faint tracks, and the row of far bubbles across the top.
- The desktop close still has the near neighbour's 30–40 px motes in the bottom-left corner (carried concern 4).

### Tests

typecheck clean; vitest 80 files, 1,699 passed; full e2e 167 passed, 10 skipped (SHOTS only), 0 failed, 28.6 min (the new held-system test and the DPR 2 caps cases add 4).
