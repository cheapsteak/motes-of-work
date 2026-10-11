# Task 6 report: growth, light, the lamp and the defect on moving bodies (behind `?galaxy=1`)

Status: DONE_WITH_CONCERNS. Base 7910cd3, branch main, not pushed.

## Commits

| SHA | What |
|---|---|
| b419296 | `light.ts` / `light.glsl`: the landing, the spread, the light and the palette moved out of `node.*` (behaviour-neutral) |
| 5ae82fc | the model: `bodyMote.ts` + `bodyMote.glsl` (mirror pair), `netTrack.ts` (one `Lamp`), scene-state leaves, `sceneMotion`, `STREAM_BEATS`, `stream.ts` (`streamGain`, the galaxy's twin), `ringAt` on `bodyWorld`, the hero moon's person share, and their tests |
| 3a9a686 | the renderer: shaders, `bodySystem.ts` (8 meshes), `main.ts` (`?ambient=`, the shot's lamp), the budget e2e updated |
| de77888 | `?lib=body` parity (motes and stream dots) |
| 5ff68dc | `galaxy.spec.ts` Task 6 tests and the T6 stills rows |

Each commit's tree was checked on its own (exported from the index, `tsc` and the unit suite) before it was made.

## What was built

### 1. `light.*` (b419296)
`nodeLight`, `nodeSettle`, `nodeArrival`, `nodeSpread` and `NodeLight` moved to `light.ts`; `light.glsl` carries the same, its `nodeLight` taking the two clocks as arguments, and `node.glsl` keeps a three-argument overload over `uFix`/`uHighlight`, so every old caller (`box.glsl`, the halo and stream shaders) reads unchanged. `birth.ts` splits its constant list: `glslLightConstants()` (the fix/highlight/surge windows, `NODE_EMBER_MIX` and the palette) goes into `light.glsl`, the rest stays in `node.glsl`'s splice; `NODE_CONSTANTS` is still the union. `node.ts` re-exports the moved functions so the stacks' callers did not change. The salt call-site test now reads `light.*` (where `nodeSpread` lives). A new test holds `light.glsl` to its own constants and checks `node.glsl` declares none of them twice.
Neutrality: `?lib=node` and `?lib=box` parity green, `e2e/network.spec.ts` 13/13 green on this commit (before any other change).

### 2. The model (5ae82fc)
- **`netTrack.ts`**: `TrackTarget`, `TRACK_TARGETS` (index 0 null; galaxy, core, hood, N0, P_a, C1, P1, the P1–P3 centroid, C7, R1, C5, P5, R0), `trackIndex`, `lampFocusRow` (a body's own row; a centroid's first body; −1 for core/hood/galaxy). **One `Lamp`** lives here; `galaxyShots.ts` imports it and its copy is deleted. Task 5's values agree: Off 0, Planet 1, Star 2, Hood 3, Core 4, Lineage 5 — no mismatch.
- **Scene state**: `net.focus`, `net.lamp`, `net.lampAt`, `net.streams`, default 0, in `SCENE_STATE_PATHS`; `sceneMotion` adds `net.focus` and `net.streams` (lamp and lampAt are steps and are not motion).
- **`galaxyShots.ts`**: `STREAM_BEATS` verbatim, `galaxyShotLampAt(shot)`.
- **`birth.ts`**: `STREAM_CAP` 0.3, `STREAM_FADE` [1, 0.15], `STREAM_BOW` 0.10 (one place; spliced). `STREAM_PITCH`/`STREAM_DOTS` stay in `generate.ts`; `stream.ts` re-exports all five and generates the GLSL for them (birth.ts cannot import generate.ts: it would be a cycle).
- **`stream.ts`**: `streamDotU(k, t)` (the ambient for the galaxy), `streamGain` exactly as the brief, `streamControl` (bow toward `bowBearing` about the chord), `streamCount` and `streamDot` (the twin of a dot). The old network's dot rule is unchanged and stays on `uClock` (its shader is renamed `nodeStream.vert.glsl`, so that the brief's new `shaders/stream.vert.glsl` is the galaxy's).
- **`review.ts`**: `ringAt(review, visits, ambient, data)` rides `bodyWorld`, radius 1.5 × the visit's outer (`pieceOuter`, newly exported from `generate.ts`); the stacks network keeps `stackRingAt` (same pose logic, shared) until Task 8.
- **`bodyMote.ts` / `bodyMote.glsl`** (the brief's interface, with two additions, see Deviations): builders fly from their stream's parent (spread by the parent's radius) through the stream's control point and land on `bodyWorld + R·spin(shellWarp)`; the shell wraps outward from the arrival side (`(1 − n·arrival)/2`, jittered by `BODY_BUILD_JITTER` of the mote's own hash). Moon motes fly their planet's stream and all land at the moon's birth (the generator already puts it in the last 30 % of the planet's build) with the flare. Person motes fall from above the piece onto their host's sphere on `net.fix`. The derp: `derp()` times `lodGain(Derp)` only (never v again; `scatterS` unscaled); a planet's and a moon's on ν, r and lift about the undisturbed host in the galaxy's plane on the body's own clock (`t + orbitT`); stars and the core shiver; the shell takes the morph `A·v·gain` and the scatter at `v·gain` (moons capped at `SCATTER_MOON_CAP`), from `moteHashes(shellSeed(id), i)`. Ghost: `bodyGhost` at the undisturbed angle + ghostNu, `0.45·ghost·gain`. Light: hi/surge by `nodeLight`; a shell ×(1 + 1.5 hi + surge) (= ×2.5), warm = fix·0.3 (moons 0.6), a person mote warm 1. The lamp: lit iff the membership row at the level equals the focus body's (Planet: piece; Star: star; Hood: everything; Core: core bodies; Lineage: rule, plus the core); inside, `mix(1, LAMP_FLOOR 0.3, focus)` for all but the subject (the focus body and, for a piece, its planet and moons).
- **The hero moon's share** (brief: planet 70, hero moon 20, others 6): `generate.ts` gets `PERSON_HERO_MOON = 20` and `HERO_MOON = 'C1-m5'`; `ambient.test.ts` fences `HERO_MOON === FREEZE_PINS.C1.moon` (the generator cannot import the pin search: ambient.ts generates from it). The budget gains 14 instances: 75,903 ≤ 76,000, no thinning, pin unchanged.
- **`bodyAttrs.ts`**: a third instance attribute per mote, `aFlight` (birth hash, spread seed, stream/host); `buildPersonAttrs`, `buildBodyAttrs` (ghosts after the bodies), `buildStreamAttrs`; the shell texture widens to 7 texels (next shape, sweep + aftershock, the body's own seed at T3.z).

### 3. The renderer (3a9a686)
Meshes: `net-tracks`, `net-bodies` (bodies + ghosts), `net-streams`, `net-feed`, `net-shells`, `net-persons`, `net-glow`, `net-ring` (one flat quad, not instanced). Uniforms `uGrowth, uFix, uHighlight, uShow, uAmbient, uFocus, uLamp, uLampRow, uStreams, uRing…`. `net-streams` and `net-feed` are `visible = false` while `net.streams` is 0 (the feed also while its alpha is 0). The galaxy library now splices derp, light, the streams' constants and `bodyMote.glsl` once into every galaxy shader (a unit test fails on any name declared twice). `main.ts`: `?ambient=<s>` (default still 0 until Task 7) and the probe shot sets `net.lamp`/`net.lampAt` from the shot unless `?state=` names them. Stream dots are 1 CSS px, centred on their pixel (see below), at `LOOK_GLOW_BRIGHTNESS · streamGain(…)`, ember while the stream carries the defect, no highlight gain.

The light as built (and why it departs from the brief's ×2.5 at far range):
- A lit **glow sprite** is pure ember with its core filled to a crisp disc of 0.75 of its radius (`mote.frag.glsl`, vForm 3 + hi; the unlit glow is byte-identical to Task 5's).
- A lit **planet point** is a pure-ember disc of the planet's own disc (0.8 of it), between 5 and 7 CSS px, ×1.75, over its shell dimmed to 0.35 (the spec's "3 px ember point … and its ember dust"), handing back to the lit shell as the planet grows past 14→28 px across.
- A lit **shell** is 0.8 ember mix ×2.5 where its motes stand apart; where they pile up (Task 5's density cap) the ×2.5 is spent inside the same share, so a lit disc is the same light in ember, not a white blot.
- Bodies: rim and fill ×1.35, ember 0.8·hi, warm toward amber; tracks take 0.5 of their body's light.

Why: with 0.8 mix and ×2.5, every far lit disc screen-summed to pink-white, and test 12's classifier (r > 200, r > b + 90, r > g + 70) found 0 components (measured). See Concern 1.

Bugs fixed on the way (Task 5's, same blast radius): the **dotted orbits were not turned with the galaxy** (`track.vert.glsl` added the un-turned `orbitLocal` to the turned host: invisible at ambient 0, 0.45 units off a 9-unit orbit at the pose). Now `turnVec`. Also the CPU's **glow positions** now include the star's/core's derp (a shivering star's glow moved off the reported sprite: Task 5's halos test failed at core/twelve once derps were drawn), and only drawn sprites (built and lit by the lamp) are reported and kept apart. The **core** is no system: its bodies' derps are at full gain at every level and the test-mode LOD override does not apply to it (otherwise forcing Derp to 0 changed R0's shiver, failing Task 5's far test).

### 4. `?lib=body` (de77888)
`BODY_VERTEX` runs `bodyMote()` over the real `aLL/aMote/aFlight` attributes and the three textures; cases: C1 building; C1 and its moons, defect close (lamp 1, focus 0.6, lit); C1 and its moons, the fix landing (persons in flight, derp gain partial at sysPx 90); P1 defect close (lamp 2, focus 1); R0 at its fix (lamp 5, surge); 64 hashed motes (every shell and person mote, each system at its own LOD); and **stream dots** (`streamDot` + `streamGain` moved into `bodyMote.glsl`, every stream and the feed, four dots, four (streams, lamp) pairs). Each at the pose and at 101 s; every field; a ±16-ulp time shift is allowed at a derp cut and counted (`shifted`). Measured: ≤ 1.0e-5 (C1, moons, P1, R0), 1.3e-4 (hashed, far systems), 8.2e-5 (stream dots); tolerance 5e-4; shifted 0 everywhere.

### 5. e2e and stills
`e2e/galaxy.spec.ts`, per size (phone first):
- **the lamp has a hard edge** — close shot, lamp 1 on C1, `net-shells/bodies/glow` isolated: 0 lit px outside the twin's discs of C1's piece (each derped body and ghost, R(1 + EQ_A + 0.4) + 2 px); control: lamp off lights > 50 px beyond.
- **a healthy planet is a sphere and a cracked one breathes** — close shot at ambient 0 and 0.5, shells and bodies isolated, inside C1's 1.4 R rectangle with the twin's discs (both ambients, moons too) masked: C1 healed (fix 1: v takes every term to 0, the healthy case available in the close frame) changes and lights 0 px off its sphere; C1 cracked changes > 0.
- **streams are off by default** — system probe, growth 0.2, `net.streams` 0: neither mesh in `drawStats().visible`, and the frame equals the frame with everything else isolated; control: with `net.streams` 1 both are visible.
- **streams are quiet when shown** — system probe at `0.08/NODE_STREAM_SPEED` s (every stream's first dot at u 0.08): `net.streams` 1 vs 0 differ by ≤ 96 on every channel; for each lit stream with both ends drawn alone, parent-end peak ≥ 3 × child-end peak (measured 64 vs ~15 by eye of the mutation output).
- **the twelve light as twelve at the twelve probe** (phone) — growth 0.35, highlight 0.25, fix 0.1, lamp 5 on R0, at ambient 135: exactly 3 ember components ≥ 60 px² and 9 in 8–60 px² (measured 108 101 91 | 30 14 13 13 13 13 12 11 11); the twin first asserts all twelve are in the frame.

The budget test now opens with streams 1 and review 1.2 and checks Σ net-* = `Galaxy.instances.total` (75,903 desktop tier) ≤ budget, every set named.

## Tests, RED and GREEN

- Unit RED: the four new/re-pinned unit files run on b419296 (the light commit, in a scratch worktree): 4 files failed (missing `netTrack`, `pieceOuter`, `nodeStream.vert.glsl`) — expected, nothing of the model existed.
- e2e RED: the Task 6 e2e on the model-only tree (5ae82fc, exported): 9 failed (`lit px outside C1's piece`, `healed, C1 is a sphere`, `the streams draw`, `ember areas` empty, the visible-list checks).
- GREEN: `npx tsc --noEmit -p .` clean; `npx vitest run`: 82 files, 1761 tests passed. Full e2e (`E2E_PORT=4199 npm run e2e`, before the last commit, which only adds the e2e/stills files that run in it): 177 passed, 11 skipped (the stills, skipped without SHOTS=1), 0 failed, 29.4 min. Old network's `network.spec.ts` and `?lib=node`/`?lib=box` parity unchanged and green.
- Mutation checks (each broken, run, failed, then undone by the exact inverse edit, confirmed by grep):
  - `?lib=body`: morph ignoring v·gain → fails (5.5e-3 on "the fix landing"); stream fade reversed → fails (0.47 on stream dots).
  - lamp: level 1 lights everything → "lit px outside C1's piece" 10,121 / 48,061.
  - twelve: lit glow core removed → ember areas 30 14 13 … no ≥ 60 component.
  - healthy sphere: shell morph/scatter ignoring v → "healed, C1 is a sphere" fails at both sizes.
  - streams off: `streamMesh.visible = true` → visible-list check fails at both sizes.
  - streams quiet: flat fade → "parent end 64, child end 64" fails at both sizes. (The first version of this test did NOT catch it: a 1 px quad lit its pixel at a sub-pixel-dependent fraction, so peaks were noise. Fixed in the shader: a stream dot is centred on its pixel. Then the mutation failed as it should.)
  None was refused by the permission layer.

## Re-pinned / retired
- Re-pinned: `src/network/review.test.ts` (the ring at each visit's `bodyWorld` at ambients 0, 37.3, 101; it rides its visit; radius 1.5 × `pieceOuter`); `src/scene/node/stream.test.ts` (the galaxy's dots on `uAmbient`; the old network's `uClock` assertion kept for its renamed shader until Task 8); `nodeSystem.test.ts`'s `DOT_SPACING` untouched; the budget e2e and `bodySystem.test.ts` counts (persons, ghosts, streams, feed now drawn); `salts.test.ts` reads `light.*`.
- Retired: nothing.

## The T6 stills (`shots/galaxy/T6-*`), looked at phone first

- **T6-twelve (390×844)**: three ember star discs with small glows and nine ember planet points; C1 sits pale blue-white beside P1 with a faint amber dust — it is the one that is not ember. The twelve read as twelve. On the desktop still (1440×900) P1 and its planets are below the frame at that ambient (and at 0): only two stars and their planets show. That is the probe shot's framing (Task 5's world-anchored twelve), not the lamp.
- **T6-close-pose (pose 9.4938 s)**: C1 is in a burst at the pose (micro-slot 7, snap on): it sits ~0.5 units down-left of where the camera aims; its six moons on dotted tracks, one moon over its limb, and a faint ghost disc inside the planet (C1-m5's burst ghost, at 0.45). The lattice reads slightly bent by the morph. **No scatter**: the pin's path is `forced-scatter` (C1 is not scattering at the pose), and forcing it on the hold is Task 12's. On the desktop still the derped C1 is half out of the bottom of the frame.
- **T6-close-fixed (fix 0.1 at the pose)**: C1 round, calm and centred where the camera aims (every derp term at 0), its shell tinted pale (0.3 toward amber), the six moons warm amber with the person's motes on them. It reads as healed. The planet's own 70 amber motes are 1 px on a 230 px sphere and barely show.
- **T6-hood-lit (highlight 0.3)**: about a dozen ember star discs and many ember planet points across the neighbourhood, the core's six blue bodies at upper left (R1 among the ember, R0 not yet), unlit stars blue. Reads.
- **T6-system-streams vs T6-system-nostreams**: indistinguishable by eye at phone size; the difference is ~37 single pixels at most 58 above the background (P_a's three short streams and the core's stream leaving to the right). Quiet; when off they are not drawn at all (`drawStats`).

## Deviations from the brief, and rulings I made

1. `BodyMoteAttrs` has two more fields, `index` (the lattice index: `moteHashes(shellSeed, index)`) and `sys` (the system index into `sysPx`). `host` is a builder's/moon mote's stream row and a person mote's host (its own row).
2. `bodyMote(a, c, data)` takes `BodyMoteData = BodyData & { shells }` (the shell texture at the frame's ambient): the TS reads the same float32 shapes and sweeps as the shader.
3. The galaxy's stream shader is `shaders/stream.vert.glsl` as the brief says; the old network's was renamed `nodeStream.vert.glsl` (unchanged).
4. No `uClock` uniform: nothing in the galaxy reads scroll time; a test asserts the stream shader and library never mention it.
5. Lit look at far range (see "The light as built"): the brief's 0.8 mix × 2.5 gives no ember-dominant pixel on a far lit disc, so the twelve test cannot pass with it. Glows and points go pure ember; shells keep 0.8 × 2.5 where motes stand apart.
6. The twelve test runs at ambient 135 on a phone only: at ambient 0 C9 is off the right edge; at the pose C2 is off the bottom; 130–140 s is the first window with all twelve in frame. The desktop frame never holds P1.
7. "a healthy planet is a sphere" uses C1 healed (fix 1) as the healthy planet, since the close shot frames only C1's piece and every planet of P1 is cracked.
8. The streams-gradient test needs ≥ 1 stream with both ends drawn alone (P_a's streams share their parent end at the star).
9. Stream dots are pixel-centred.

## Concerns

1. **The lit look** (deviation 5) is my call; the author should see `T6-twelve` and `T6-hood-lit`. The constants are in `BODY_LOOK` (`litCore`, `litPoint*`, `litDust`).
2. **The pose sits exactly on a jitter cut.** `FREEZE_MOON_S` 0.3 s at 30 Hz is jitter tick 9.0: the generator's float64 phase reads tick 9, the texture's float32 phase reads tick 8, so the drawn hero moon at the pose can be one jitter step (≤ 0.035 units here) from where `pinnedMoon` (the pin search) put it. The composition itself agrees with `pinnedMoon` to 5.7e-4 given the same derp; the test states both tolerances. `pinnedMoon` was not changed and the pin did not change. Worth a Task 12 look (a pose a hair inside the tick).
3. **The twelve probe does not frame the twelve** at ambient 0, at the pose, or ever on desktop (Task 7's tracking camera / Task 13).
4. **The close shot rides the undisturbed planet**, so at the pose C1's burst carries it ~0.5 units off target (half out of frame on desktop). Correct for a derp; Task 7/12 should decide what the camera follows.
5. The core's shiver is not gated by the level of detail (the core is no system); R0's shiver is ≤ 0.34 units, about 1.7 px at the neighbourhood.
6. `GALAXY_AMBIENT` stays 0 by default in test mode (Task 7 makes it `AMBIENT_POSE`): the T6 close stills pass `&ambient=` explicitly.
7. Floating point: "exactly R" for a healthy shell holds to 1e-7 of a unit (the float32 spin axis and radius), not 1e-12.

## Files

Created: `src/scene/node/light.{ts,glsl}`, `bodyMote.{ts,glsl}`, `bodyMote.test.ts`, `src/timeline/netTrack{,.test}.ts`, `shaders/stream.vert.glsl` (galaxy), `shaders/flatRing.vert.glsl`. Renamed: `shaders/stream.vert.glsl` → `shaders/nodeStream.vert.glsl` (old network). Modified: `birth.ts`, `node.{ts,glsl}`, `shaderSource.ts`, `bodyAttrs.ts`, `bodySystem.ts`, `shaders/{shell,body,track}.vert.glsl`, `body.frag.glsl`, `mote.frag.glsl` (vType 0..1 mix, lit glow core: identical for every existing caller), `star.vert.glsl` (marker), `stream.ts`, `review.ts`, `generate.ts`, `galaxyShots.ts`, `sceneState.ts`, `plan.ts`, `main.ts`, `nodeSystem.ts`, `nodeData.ts` (comment), `src/parity/{fields,shaders,parity}.ts`, and tests: `node`, `salts`, `stream`, `review`, `nodeSystem`, `networkKeys`, `bodySystem`, `ambient`, `galaxyShots`, `sceneState`, `plan`, `e2e/{galaxy,parity,stills}.spec.ts`.

Stills: `shots/galaxy/T6-{twelve,close-pose,close-fixed,hood-lit,system-streams,system-nostreams}-{390x844,1440x900}.png`.

## Fix round 1

All seven findings of `task-6-review.md` are fixed in one commit (`cc91d66`).

### Important 1: the orbit-track turn, tested where the galaxy has turned

- **TS twin.** `trackDot(row, turns, t, data)` in `bodyMote.ts` mirrors `track.vert.glsl`. It returns `bodyWorld(host) + turnVec(orbitLocal(elements with phase = turns − orbitTurns(t, period)), t)`.
- **Unit test** (`bodyMote.test.ts`, "a dotted orbit's dot"). At t ∈ {0, AMBIENT_POSE, 101}, every orbiting body's own dot (at its mean anomaly) lands on `bodyWorld` within 1e-9. Control: at 101 s, C4's unturned host + `orbitLocal` sits more than 1 unit from the body, so the turn matters there.
- **Pixel e2e test**, at both sizes: "the dotted orbits turn with the galaxy: every track pixel is on a twin dot, at the pose and at 101 s".
  - Setup: the system shot with the lamp off and `net-tracks` isolated.
  - It projects every `buildTrackAttrs` dot through `trackDot` and the composed twin camera.
  - It requires more than 100 lit pixels, and zero lit pixels more than 2.5 px from a twin dot.
- **Mutation.** I reverted `track.vert.glsl:35` to `bodyWorld(host, uAmbient) + orbitLocal(bodyTexel(1, row), t2, uAmbient)` and the e2e test failed at both sizes: `track pixels off the twin dots at 9.49…`, expected 0, received 175 at 390x844 and 346 at 1440x900. I undid it with the exact inverse edit; `git diff -- src/scene/node/shaders/` is empty.

### Minor 1: `LIT_CORE` in mote.frag

Fenced rather than spliced. `mote.frag.glsl` is shared with the bike's mote system, which has no access to `BODY_LOOK` and no node splice. A `bodySystem.test.ts` case requires that mote.frag contains `const float LIT_CORE = ${BODY_LOOK.litCore};` and contains `LIT_CORE = ` exactly once.

### Minor 2: parity on dark motes

`BODY_CASES` gains four cases. Each has the same 64 hashed motes, focus 0.5, `sysPxSpread()`, growth 0.55, highlight 0.95 and fix 0.6. Each runs at the pose and at 101 s, and `e2e/parity.spec.ts` lists all four. The lamps:
- `Lamp.Planet` on C1
- `Lamp.Star` on C1 (level 2)
- `Lamp.Core` (level 4)
- `Lamp.Lineage` on P1

These cover `lampLit`'s false branch at every level that has one. Each lit set is a small part of the galaxy, so nearly all 64 motes fall dark. I did not count how many each case lights.

### Minor 3: the stream instance count

`streamDots` (generate.ts) now returns `clamp(ceil(chord / STREAM_PITCH), 6, 40)`, so the last partly present dot has an instance. The test's independent count uses `ceil` too. The essay galaxy's drawn total moves from 75,903 to **75,925**, still within 76,000.

**Deviation, listed here as asked:** the dot count the shader draws by is the unrounded `n = clamp(chord / 1.2, 6, 40)`, with dot i drawn at `clamp(n − i, 0, 1)`. The brief says `round(chord / 1.2)`. The instance count is `ceil(n)`.

### Minor 4: named salts

- `SALT` gains `bodyBirth: 23` (a builder's place in its shell's landing order), `personLat: 24` and `personLon: 25` (a person mote's rest point). `bodyAttrs.ts` uses them in place of the literals 0, 0 and 1.
- `salts.test.ts` pins the three values and now scans `bodyAttrs.ts` for literal-salt call sites.
- This moves every builder's landing jitter and every person mote's rest point to new hashes, as intended. No pinned value or still changed.

### Minor 5: `moteHashes`

`bodyMote()` calls `moteHashes(seed, a.index)` instead of re-deriving it. The shell-equation test bounds the warp by `SCATTER_AMP[0] + SCATTER_AMP[1]` instead of a literal 0.4.

### Minor 6: a second compared stream in the gradient test

"streams are quiet when shown" now measures the gradient on two frames:
- the system probe under P_a's star lamp, where at least 1 stream is compared;
- the neighbourhood (`shot=hood`, streams on, lamp off; the core's streams out to the stars), where at least 2 streams are compared.

Making the neighbourhood pass took one more fix: deciding which dots stand alone. The first full run failed at 390x844 on R_a → star-1 (parent end 62, child end 23 < 3 × 23). The child-end reading of 23 was a neighbouring stream's dot 3.1 px away, which the 1 px search window reached. Measured on that dot's own pixel, the reading was 12. The check now works on pixels:
- each twin dot is read as the 3 × 3 around its own pixel (`floor(x), floor(y)`);
- a dot is compared only when no other drawn dot's 3 × 3 overlaps its own, partly present dots of other streams included.

**Mutation:** in `stream.vert.glsl`, `streamGain(sd.u, …)` → `streamGain(0.0, …)` (no fade). The test fails at both sizes: `system: stream P_a to N0: parent end 64, child end 64`. Restored with the exact inverse edit.

### Commands and results

- `npx tsc --noEmit -p .`: clean.
- `npx vitest run`: 82 files, 1763 tests passed.
- `E2E_PORT=4199 npx playwright test e2e/galaxy.spec.ts e2e/parity.spec.ts`: 34 passed and 1 failed, the hood gradient described under Minor 6. After the fix, "streams are quiet" passes at both sizes.
- `E2E_PORT=4199 npm run e2e` (after the fix): 179 passed and 11 skipped (the suite's existing skips) of 190, in 30.4 min, exit 0.
- Mutation runs: the two above, each failing as expected and each restored.

### Files (fix round 1)

`src/math/salts{,.test}.ts`, `src/scene/node/bodyAttrs.ts`, `src/galaxy/generate{,.test}.ts`, `src/scene/node/bodyMote{,.test}.ts`, `src/scene/node/bodySystem.test.ts`, `src/parity/parity.ts`, `e2e/galaxy.spec.ts`, `e2e/parity.spec.ts`. The helper scripts `shots/fix1{,b,c}.py` were used and deleted.
