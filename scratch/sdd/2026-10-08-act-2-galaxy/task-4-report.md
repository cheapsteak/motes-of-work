# Task 4 report: the shell mirror pair, and the pins

Status: DONE_WITH_CONCERNS (see Concerns: the pin's path is `forced-scatter`, and clause (d) cannot be met by this galaxy at all).

## The pin

| | |
|---|---|
| `FREEZE_PINS.C1.path` | **`forced-scatter`** |
| `FREEZE_PINS.C1.moon` | **`C1-m5`** |
| `FREEZE_PINS.C1.t` | **9.493782472098248** |
| `AMBIENT_POSE` | **9.493782472098248** |
| `AMBIENT_GRID` | `[9.493782472098248, 0, 149, 311, 487, 659, 853, 1061]` |

The same pin comes out of the phone tier's galaxy (tested). Computing it at module load costs about
80 ms (generating the essay galaxy) plus about 100 ms (the search), so about 180 ms; the whole
`ambient.test.ts` file runs in about 1.1 s.

## What I implemented

- `src/scene/node/birth.ts`: every constant of the brief, verbatim (EQ_A, EQ_W, EQ_P, SCATTER_SWEEP,
  SCATTER_HOLD, SCATTER_RETURN, SCATTER_STEP, SCATTER_JITTER, SCATTER_INWARD, SCATTER_AMP,
  SCATTER_MOON_CAP, RING_AMP, RING_TAU, RING_HZ, AFTERSHOCK_AT, AFTERSHOCK_P, AFTERSHOCK_AMP,
  SCATTER_OUT_GAIN, FREEZE_MOON_S, FREEZE_SCATTER_S, FREEZE_PIN_SEARCH_S), and the ones the
  spec's prose carries as bare numbers, named: EQ_SECOND 0.45, the shape ranges (EQ_Q_STEP,
  EQ_P2_STEP, EQ_Q2_STEP, EQ_Q2_MIN), SHELL_SPIN_TILT [25, 40] and SHELL_SPIN_PERIOD 14,
  SCATTER_JITTER_HZ 30, SCATTER_JITTER_AXIS, SCATTER_NORMAL [0.35, 0.65], SCATTER_FUZZ 0.9, and the
  salt layout (SHELL_EVENT_STRIDE 64 with j 0/1 sweep and 2 aftershock; SHELL_MOTE_STRIDE 8;
  SHELL_JITTER_STRIDE; SHELL_SALT 0x60000000 above every derp salt, SHELL_SHAPE_AT,
  SHELL_SHAPE_STRIDE). `glslShellConstants()` splices the ones the GLSL reads, the derps' pattern
  (floats, float arrays, uints), with `SHELL_CONSTANTS` / `SHELL_ARRAYS` / `SHELL_UINT_CONSTANTS`
  for the declarations test. No puffing-burst constant.
- `src/scene/node/shell.ts` (TS reference): `shapeAt`, `shapeUniforms`, `latticeLL` (odd rows offset
  half a step, on `latticeRowCols`), `moteHashes` (`hash01(seed, i·8 + j)`), `llUnit`, `spinAxis`
  (25–40° off vertical, hashed azimuth), `spinShell` (one turn in 14 s, via `orbitTurns`), `morphR`
  (the brief's equation verbatim), `scatterK`, `landingSec`, `scatterCount` (scatter events of the
  schedule from slot 0 that have ended; cached prefix counts per (seed, phase)), `shellEvent` (a body's
  scatter at an ambient: sec from the derp schedule, sweep and aftershock from
  `hash01(seed, k·64 + j)`, n, and shapes n and n + 1), `shellK`, `shellHome` and `shellWarp`.
- `src/scene/node/shell.glsl` (mirror): `ShellEvent` struct (sec, sweep, aftershock, shapes n and n + 1
  as four vec4 uniforms), `morphR`, `scatterK`, `shellWarpK` (place + k), `shellWarp`, `spinAxis`,
  `spinShell`. Only `moteSinCos` for sin/cos; `orbitTurns` for the spin; `sqrt(dot)` not `normalize`.
- `src/scene/node/shaderSource.ts`: `SHELL_INCLUDE_MARKER`, `shellLibraryGlsl()`,
  `withShellLibrary()` (mote library + orbit.glsl + shell.glsl), the derps' splice pattern.
- Parity: `ShellOut` / `SHELL_PARITY_FIELDS` / `glslShellOutStruct` (fields.ts), `SHELL_VERTEX`
  (shaders.ts), `?lib=shell` in parity.ts: every mote of a 14 × 36 lattice (324) × the 11 seconds
  {−1, 0, 0.03, 0.08, 0.15, 0.2, 0.26, 0.31, 0.4, 0.6, 0.9} × three hash sets (each its own event,
  time, A, gain and cap; set 1 is a moon's cap, sets 0 and 2 have the aftershock) × shapes n = 4 and
  5, comparing the warp, k and the spun place. `e2e/parity.spec.ts` holds it to 1e-5 R and checks the
  case names and the 3,564 samples per case.
- `src/galaxy/ambient.ts`: `AMBIENT_GRID_TIMES`, `HERO_CLOSE`, `PinPath`, `Pin`, `searchPin`,
  `FREEZE_PINS` (module load, essay galaxy), `AMBIENT_POSE`, `AMBIENT_GRID`, and `pinnedMoon` (the
  moon's derped place, for clause (c)). The projection is the existing `applyCamera(..., { compose:
  true })` (portraitRig + targetOnScreen) on a three.js camera; no second projection.
- `src/timeline/cameraSpline.ts`: `lookFromBearing`, moved out of `netShots.ts` (which now imports it)
  so the pin's close shot and the network's shots share one bearing convention.

### Semantics I chose where the spec is silent (all documented in the code)

- `shellWarp` works in the lattice's frame; the spin is a separate `spinShell(p, spinAxis(seed), t)`.
  The sweep is in the lattice's frame too.
- `scatterK` returns 1 for the hold, then 0.55 and 0.25 for 50 ms each, then 0: landing at
  `0.04 (su + 1) + 0.12 + 0.06 h4 + 0.10` ≤ 0.36 s. A mote samples shape n until then and n + 1 after.
- The ring runs from each mote's landing for the rest of the event, scaled by `gain`.
- The aftershock is "hold only": k = AFTERSHOCK_AMP from `0.55 + 0.04 (su + 1)` for the mote's hold,
  then a single cut home; no return steps, no ring, no shape step. It ends by 0.81 s.
- The jitter is scaled by k (so the stragglers shake less), held per 1/30 s tick, hashed from the
  mote's h7 as its own seed (`hash01(h7 · 2^24, tick · 3 + c)`), each axis ± SCATTER_JITTER/√3 so its
  length stays under 0.03 R and the 0.43 R bound is a real bound.
- `gain` scales the leap and the ring (the fix's v and the LOD); `A` the morph; `cap` the amplitude
  (pass 0.40 or more for a planet, SCATTER_MOON_CAP for a moon).
- `searchPin` walks slot index k = 0..545 outer and the six moons in generated order inner, at
  t = t0 + 0.3 D (t ≥ 0). (a) burst with the jump drawn (`dR ≠ 0`) and the ghost on; (b) as the brief;
  (c) both the pinned moon and its home inside x ∈ (0.2, 0.8)·390 and y ∈ (0.42, 1)·844 through the
  composed close shot on C1; (d) C1's `scatterS` ∈ [0.10, 0.20]. Fallbacks in order: drop (d)
  (`forced-scatter`), drop the ghost (`forced-ghost`), then the first framed slot or the first slot
  (`forced`).

## Tests and results

- `src/scene/node/shell.test.ts` (18 tests): the lattice (rows, offsets, counts, 6,116 hero motes),
  mote hashes, the spin (tilt 25–40 over 400 seeds, all eight azimuth octants, period 14 s, axis
  fixed, half-turn mirror), shape ranges (all five p seen), the equation against an independent
  formula and its bound A(1 + 0.45) reached, and the brief's six: healthy sphere (|p| = 1 to 1e-6 over
  every mote of (14, 36) × 50 t, spun too), bounds (10^5 samples; leap ≤ 0.43, off-event
  ||p| − 1| ≤ 1.45 EQ_A + RING_AMP; both reached, not vacuous; and with A = 0, |p − u| ≤ 0.43),
  the sweep (at 0.04 every su > 0 home and ≥ 95 % of su < −0.2 out, at 0.16 all out, at 0.36 all
  home, on the hero lattice), the three cuts (the brief's set, and the order 0, 1, 0.55, 0.25, 0), the
  shape step (RMS ≥ 0.5 A for 12 consecutive pairs; on a real schedule the count steps by one exactly
  at each scatter's end, and each mote's radius moves from shape n to n + 1 once, in u·sweep order),
  the moon's cap (≤ 0.30 + jitter, reached, and a planet exceeds it), the ring / aftershock / gain, the
  schedule (sec equals derp()'s scatterS over 20,000 ambients; aftershock share ~0.5; healthy seed
  never scatters), scatterCount against an independent walk over 300 slots; the GLSL declarations,
  no bare constants, no builtin sin/cos/normalize, library order, salt families apart.
- `src/galaxy/ambient.test.ts` (5 tests): six cracked moons; the fence (path named; (a) with the
  hashes read directly; (b) with camDir from `lookFromBearing(HERO_CLOSE.C1)`; (c) through
  `applyCamera` compose on a 390 × 844 camera; (d) when the path is `full`; AMBIENT_POSE/GRID);
  the same pin from the phone tier; `pinnedMoon` against the derp; the grid and HERO_CLOSE values.
- Parity `?lib=shell`: largest error 6.4e-7 R over all six cases (tolerance 1e-5 R).
- **Mutation check**: in shell.glsl `MOTE_TAU / 4.0` → `MOTE_TAU / 4.001`: the e2e failed
  (`shell: hashes 0, shape 4` at 9.76e-5 > 1e-5); undone by the exact inverse edit, then green.

### TDD evidence

I drafted `shell.ts` before its test file; to get an honest RED I moved the draft out of the tree,
wrote the tests, ran them, then restored it.

- RED: `npx vitest run src/scene/node/shell.test.ts` → `Error: Cannot find module './shell'` (expected:
  no module). `npx vitest run src/galaxy/ambient.test.ts` → `Error: Cannot find module './ambient'`.
- First GREEN run: 2 failures, both in my tests: a "flat at the poles" assertion (the brief's equation
  does not vanish at the poles: see Concerns) and a 5 s timeout in the shape-step test (grid made
  coarser, 30 s timeout). Then `shell.test.ts` 18 passed; `ambient.test.ts` 5 passed.

### Close-out

- A: `npm run typecheck && npm test`: 76 files, 1,659 tests passed, typecheck clean.
- C: `E2E_PORT=4199 npm run e2e`: 150 passed, 9 skipped (the SHOTS-gated stills), 0 failed, 24.4 min. The previous ledger count was 149; this adds the shell parity test.
- D: commits below. No stills; nothing retired or re-pinned.

## Files

Created: `src/scene/node/shell.ts`, `shell.glsl`, `shell.test.ts`, `src/galaxy/ambient.ts`,
`ambient.test.ts`. Modified: `src/scene/node/birth.ts`, `shaderSource.ts`, `src/parity/fields.ts`,
`shaders.ts`, `parity.ts`, `e2e/parity.spec.ts`, and (outside the brief's list)
`src/timeline/cameraSpline.ts`, `src/timeline/netShots.ts` (lookFromBearing moved, behaviour
unchanged).

## Commits

- 7f84c1b galaxy: the cracked shell, a lattice sphere on an equation that scatters in a sweep, in both mirrors
- b75875a galaxy: search the freeze pin from the essay galaxy, and pose the ambient clock on it

## Self-review

- Removed a conditional assertion from the ring test (now asserts k = 1 first).
- No unused locals in the touched files (`tsc --noUnusedLocals`).
- Helper probes lived in `shots/` and are deleted.
- Prettier is not configured in this repo (existing files fail its defaults), so I kept the repo's
  own style and ignored the editor hook's prettier warnings.

## Concerns

1. **Clause (d) is unreachable for this galaxy, so the path is `forced-scatter`.** Every cracked body
   shares R0's derp seed, so a slot's kind is the same for C1 and its moons (by design: "stutter in
   the same order"). A moon at s = 0.3 of a burst in slot k sees C1 in slot k too unless their phases
   differ by about 0.5 or more, and only then can C1's neighbouring slot be a scatter 0.10–0.20 s in.
   C1's phase is 0.515, and its moons' are 0.023, 0.714, 0.730, 0.938, 0.234 and 0.667: every gap is
   under 0.5. I counted 143 slots in 1,200 s that meet (a) and (b), and C1 is in no scatter at all at
   any of them. So Task 12 must force `FREEZE_SCATTER_S` on C1 during the hold. **Reduced motion**
   (morph §3.4 wants C1 at a scatter's 0.16 under reduced motion) gets the burst moon from
   AMBIENT_POSE but not the scatter unless the renderer forces it there too. This needs a ruling.
2. **Interface additions.**
   - `ShellEvent` carries `shape` and `next` (the brief lists `{sec, sweep, n, aftershock}`), because
     `shellWarp` has no seed to hash shapes from and the GLSL takes them as uniforms.
   - New exports: `shellEvent`, `shellHome`, `shellK`, `landingSec`, `moteHashes`, `llUnit`,
     `shapeUniforms`, `spinShell` and `pinnedMoon`.
   - The spin is not inside `shellWarp`: a caller applies `spinShell(p, spinAxis(seed), t)` after it.
3. **Seeds for shapes and spin.** `shellEvent` defaults the shape seed to the derp seed, which every
   cracked body shares, so every cracked body with the same n has the same shape. Likewise a shared
   seed in `spinAxis` gives them one axis. Task 6 should pass a per-body seed for both.
4. **The bound "|p − u| ≤ 0.43".** It only holds with A = 0, and it is tested that way. With the morph
   on, the test bounds the leap from the mote's place on the shell (≤ 0.43) and |p − u| by
   0.43 + 1.45 EQ_A + RING_AMP.
5. **Morph §7.2 says lat' makes the wave vanish at the poles.** With φ2 and ω2 t inside the second
   sine it does not. I built the brief's equation verbatim.
6. **`pinnedMoon` approximates Task 6's composition.** It applies dNu about +y, dR in the galaxy's
   plane, lift on y, and the wobble, with the moon on its own (quantised) clock. If Task 6 composes the
   derp differently, clause (c) should switch to its function.
7. **Module-load cost** is about 180 ms (80 ms generation plus 100 ms search), close to the 200 ms
   mark.
8. **Convention.** `lookFromBearing` (camera bearing 0 from +z, 90 from +x) is not the galaxy's
   position bearing, which is atan2(z, x). Task 5's shots should import it.

## Fix round 1 (rulings 3 and 5)

Commit: `2c4287f` galaxy: fade the shell's wave to nothing at the poles, and seed each body's shapes and
spin from its own id.

### What changed

1. **The wave now vanishes at the poles.**
   - `morphTerm` (shell.ts) and `shellMorphTerm` (shell.glsl) now multiply the whole bracketed wave by
     cos(lat), which equals sin(lat'). The GLSL takes it as `moteSinCos(ll.x).y`, not the builtin.
   - Everything else in the equation is unchanged.
   - The doc comments say why the envelope is there, and so does one new line under the equation in
     the morph spec's §7.2.
2. **Each body seeds its own shapes and spin.**
   - `shellEvent(seed, phase, t, bodySeed)`: the body seed is required and has no default.
   - New `shellSeed(id)` derives it from the body's id. It reuses the existing `pcg` hash
     (src/math/hash.ts): it starts from SHELL_SALT, folds each UTF-16 code unit of the id in with
     `h = pcg(h ^ code)`, then keeps the low 24 bits so the seed survives a float attribute. There was
     no string hash in the repo, so this is pcg applied over the id's characters.
   - `spinAxis` already took a seed; its doc now says to pass the body seed.
   - The parity page's three hash sets are now the body seeds of `C1`, `C1-m1` (with a moon's cap) and
     `P1`. Each one feeds that set's mote hashes, shapes and spin axis.
   - The parity cases are renamed `shell: <id>, shape <n>`, and the e2e list matches.
   - `searchPin` calls no shell function: it reads only the derp schedule and the orbits. So it has no
     seed to pass and needed no change.

### Tests

- **The poles (new).** For every p in EQ_P (the first shape with that p, from C1's body seed), at
  lat = ±π/2, r = 1 to 1e-6 over 50 values of t in [0, 1200) and 24 longitudes. The test also shows
  the wave is still there: it exceeds 0.5 A at lat 0.1 and is bounded by sin(0.05)·1.45 A at 0.05 rad
  from the pole.
- **Per-body seeds (new).** C1 and its six moons, all cracked, share one derp seed. Their seven body
  seeds are distinct 24-bit integers. Two bodies' `shellEvent`s at the same derp seed, phase and t
  have the same n but different shapes. All 21 pairs differ in shape 0 and in spin axis.
- **The formula test** now includes cos(lat).
- **Still passing:** the bounds test (leap ≤ 0.43; off-event within 1.45 EQ_A + RING_AMP, still
  reached), the RMS shape-step test (≥ 0.5 A for all 12 pairs) and the sweep test. `shell.test.ts` has
  20 tests and all pass.
- **`?lib=shell` parity** passes at the 1e-5 R tolerance.
- **Mutation check.** In shell.glsl only, I changed `float envelope = moteSinCos(ll.x).y;` to
  `float envelope = 1.0;`. The e2e failed (`shell: C1, shape 4` at 1.81e-2 > 1e-5). I restored the
  line with the exact inverse edit, and the parity passes again.
- **Typecheck and full vitest:** 76 files, 1,661 tests passed.
- **Full e2e (`E2E_PORT=4199`):** 150 passed, 9 skipped (the SHOTS-gated stills), 0 failed, in 24.8 min.

### The pin

The pin is unchanged: `forced-scatter`, `C1-m5`, t = AMBIENT_POSE = 9.493782472098248. It depends only
on the derps and the orbits, not on the shell.

### Concerns

- `shellSeed` hashes the id only, not the galaxy's seed, so the same id in a galaxy with a different
  seed gets the same shapes. The essay has one galaxy. If that should change, mixing `g.seed` in is a
  one-line change, and Task 6 would have to match it.

## Fix round 2 (review: Important 1, Minor 1–4, the grid note)

Commit: `4b627ad` galaxy: make the freeze pin's fence walk every slot, require the moon's jump at a
fifth of its track, and keep the shell's event salts off the schedule's.

### What changed

- **Important 1: the fence now checks the path that was taken.** In `ambient.test.ts` I replaced the
  early-returning test with "is the first slot of its path, and no slot anywhere meets a stronger path".
  - `clauseWalk()` walks all slots k = 0..545 of the six moons in the search's own order: k first, then
    the moons in generated order, keeping 0 ≤ t ≤ 1200. That is 3,000+ slots.
  - Each clause is checked independently of `searchPin`:
    - (a): the burst kind from `derpEvent`, and the jump and ghost read straight from
      `hash01(seed, k·64 + 2·8 + j)` (j 1 and 2 for the jump, j 6 for the ghost);
    - (b): the dot of the moon's offset from C1 with `camDir`;
    - (c): `onPhone` through `applyCamera`, for both the pinned moon and its home;
    - (d): C1's `scatterS`.
  - `MEETS` gives each path's clause set, strongest first.
  - The test asserts three things:
    - the pin is a slot of the walk and meets its own path's clauses;
    - no earlier slot meets them;
    - no slot anywhere meets a stronger path. For `forced-scatter` that means no (a)–(d) anywhere; for
      `forced-ghost`, no (a)–(c) with the ghost.
  - The phone-tier check is now a test of its own.
- **Minor 1: the jump size.** Clause (a) now needs |dR| ≥ 0.2 r (freeze-frame §3.3).
  - `searchPin` adds `PIN_JUMP = 0.2` times the moon's orbit `a`.
  - The walk checks `|(h2 − 0.5)·BURST_JUMP| ≥ 0.2`.
  - The fence test asserts `|d.dR| ≥ 0.2 a` on the pin.
- **Minor 2: the per-event salts.**
  - `SHELL_EVENT_SWEEP_Z / _SWEEP_AZ / _AFTERSHOCK` are now 2, 3 and 4 (they were 0, 1 and 2). Slot 0's
    sweep and aftershock no longer read its own `derpEvent` offset (salt 0) and kind (salt 1).
  - The salt-families test asserts the three j are distinct and inside the 64-wide block. It also
    asserts that, for k < 4096, no `k·64 + j` equals that slot's own 2k or 2k + 1, and that min j ≥ 2.
  - On "both mirrors and the spliced constants": shell.glsl hashes no event. It takes the sweep and the
    aftershock as uniforms from `shellEvent`, so these salts are TS-only and not spliced. I said so in
    the shell.glsl header.
  - The salts still meet *other* slots' schedule hashes: slot k's j = 2 and 3 are slot 32k + 1's offset
    and kind. That is a cross-slot coincidence, the same as the burst's block has, not a slot reading
    its own hashes.
- **Minor 3.** The cameraSpline.ts header now says the splines are test and tooling support, and that
  `lookFromBearing` is also read at runtime, by the pin's search at module load.
- **Minor 4.** The `moteHashes` doc now says to pass the body's `shellSeed(id)`, never the shared derp
  seed, and why.
- **Grid note.** I kept the spec's grid values. The `SHELL_SECS` doc now says why its multiples of 1/30
  (0, 0.2, 0.4, 0.6 and 0.9) are safe: at 0.2, 0.4 and 0.6, float32 `sec·30` rounds to the same tick
  on both sides; at 0 and 0.9 no mote is out, so no jitter is read. It also says new values should stay
  off multiples of 1/30.

### Mutation checks (each undone by its exact inverse edit, then green)

1. **(d) made always false** (`scatter: false && …` in `searchPin`): the tests pass. That is expected
   and cannot be otherwise. No slot in this galaxy meets (a)–(d), so the search returns the identical
   pin (`forced-scatter`, C1-m5, 9.4938). A broken (d) and a working one give the same output, so no
   test of the outcome can tell them apart. The new walk would catch the same slip in any galaxy where
   a (d) slot exists: it would say "forced-scatter: some slot meets full".
2. **(d) made always true** (`scatter: true || (…)`): two tests fail. The fence test fails with
   `expected -1 to be ≥ 0.1` (C1 is not scattering at the pin). The walk test fails with
   `full: expected false to be true` (the pin claims `full`, but its slot does not meet (d)).
3. **The ghost clause broken** (`d.ghost === 2`, so the path drops to `forced-ghost`): the walk test
   fails with `forced-scatter: C1-m5 at 9.493782472098248: expected true to be false`. A stronger path
   is met, so the downgrade is caught.

### Correction to my first report

Concern 1 said every moon's phase gap to C1 under 0.5 made (d) unreachable. The reviewer is right that
this reasoning is wrong: the threshold is lower, and C1-m1 does meet (d) on its own. The path is still
`forced-scatter` because the exhaustive search finds no slot that meets (a)–(d) together. The new walk
test asserts exactly that, so the ledger's rationale should rest on the search, not the phase argument.

### The pin

Unchanged: `forced-scatter`, moon `C1-m5`, t = AMBIENT_POSE = 9.493782472098248. The 0.2 r jump clause
only removes candidates, and the pin's jump is 0.40 r.

### Tests

- Typecheck and full vitest: 76 files, 1,662 tests passed. `ambient.test.ts` has 6 tests in about
  1.5 s; `shell.test.ts` has 20.
- Full e2e (`E2E_PORT=4199`): 150 passed, 9 skipped (the stills-gated tests), 0 failed, in 25.1 min. The shell parity is among them.

### Concerns

- The (d)-always-false mutation cannot fail any test in this galaxy, as explained above. The (d)
  clause is covered by the always-true mutation and by the walk's "no stronger path" assertion.
