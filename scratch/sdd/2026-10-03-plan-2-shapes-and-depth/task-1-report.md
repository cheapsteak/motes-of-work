# Task 1 report: decouple the story and tests from the gears

## Status: DONE (commit 27a8eb0); the original NEEDS_CONTEXT is kept below, and the ruling and resolution follow it

### The conflict
Two requirements can't both hold for the gears:
1. Convert the camera keys so the gears framing matches today's to within a few pixels.
2. The framing test asserts the whole `core` role is in frame and right of the panel at spec locals, for every mechanism.

The gears `core` role is the drive gear plus the crank. The crank rides on the driven gear at x = +0.9 and extends to x ≈ 2.0 assembled; during the spec, exploded, it reaches x ≈ 3.8, z ≈ 2.3. Today's spec shot looks at x = -3 to -3.6 and frames only the drive gear: visible world x at z = 0 is about [-6.5, +0.5]. The old test passed only because it probed the drive gear by part id.

Measured with the converted keys (1280×720, core points; story pose = partTransforms(state), assembled = assembly 1):

| spec local | share of the core in frame, right of the panel (story / assembled) | core centroid NDC x |
|---|---|---|
| 0.35 | 0.73 / 0.69 | 0.91 |
| 0.5 | 0.73 / 0.79 | 0.87 |
| 0.7 to 1 | 0.73 / 0.73 | 0.83 to 0.77 |

No core point is ever under the panel (NDC x < -0.12) from local 0.35 on.

Because the gears core is lopsided (drive gear left of the centroid), keeping today's shot in core-relative units puts the **core centroid at NDC x ≈ 0.8**. A future mechanism with a symmetric core would then sit half off the right edge in the spec section. That defeats the point of the task ("frame any mechanism correctly with no other edit").

### Options
- **A. Keep today's shot** (as implemented now). Weaken the framing test to generic properties gears pass: the core centroid is in frame and right of the panel, and no core point is under the panel. Risk: new mechanisms are likely mis-framed in the spec section, so Task 8 reframes anyway.
- **B. Reframe the spec section** so the whole core anchor sphere sits in frame, right of the panel. For the gears that means a wider shot (about 7.3 rather than 6.3 from z = 0) centred near the core centroid, with the driven gear and crank in view. The test would project the core at the assembled (anchor) pose, since exploded offsets are mechanism-authored choreography (the gears crank flies to x ≈ 3.8). This changes the approved look of the gears spec section.
- **C.** A different "core" definition for framing. Out of my brief.

My recommendation is **B**: the spec framing then matches the anchor contract for every mechanism. A only postpones the reframe. I need a ruling before converting the spec keys and finishing the test.

## Done so far (uncommitted, typecheck clean, unit tests 159/160; the only failure is the framing test above)
- `src/mechanisms/anchors.ts` (+ test): `RoleAnchor`, `MechanismAnchors`, `mechanismAnchors(mech)`. It samples 4000 points with seed 1 and transforms them by `partTransforms(mech, stateAssembled)`: drive 0, ZERO_FAULTS, variant 0, assembly 1. The centroid is per role. `radius` is the max distance from that centroid. The result is memoised by id, and an empty role falls back to `whole`. Gears: whole c=(0.174,-0.104,-0.059) r=2.564; core c=(-0.294,-0.008,0.000) r=2.284; body c=(0.383,-0.002,-0.125) r=2.704.
- `src/mechanisms/index.ts`: `mechanisms = { gears } as const satisfies Record<string, Mechanism>`, `MechanismId`, `MECHANISM_IDS`, `isMechanismId`. `src/config.ts`: `ACTIVE_MECHANISM: MechanismId`.
- `src/timeline/sceneState.ts` (+ test): `camera.coreFocus` (default 0) in the type, the defaults and `SCENE_STATE_PATHS`.
- `src/scene/cameraRig.ts` (+ test): `applyCamera(camera, s, anchors)`. The anchor is lerp(whole, core) by coreFocus, centre and radius both; world = centre + value × radius. New tests cover coreFocus 0, 1 and 0.25.
- `src/timeline/keyframes.json`: camera keys converted exactly (3 dp). There is a new `camera.coreFocus` track, spec@0 → 0 and spec@0.35 → 1 (inOutCubic). Against the old file, the probe-point pixel delta is ≤ 0.12 px outside the spec and ≤ 0.27 px for spec ≥ 0.35. During the spec 0 → 0.35 camera flight it reaches up to 23 px, because coreFocus multiplies pos. That is a smooth path change with no jump; linear and inOutQuad eases on coreFocus give about 19 px, no meaningful gain.
- `src/timeline/keyframes.test.ts`: the end-of-spec camera values are updated; the framing test iterates every mechanism using the `core` role (failing, see above).
- `src/main.ts`: `?mech=<id>` with `?test=1` only. An unknown id gives one `console.warn` and falls back. Anchors are memoised once; the `__motes.mechanism()` hook is new.
- `src/spikes/renderSpike.ts`: uses `ACTIVE_MECHANISM` and anchors, and echoes `mechanism` in the results params. `src/spikes/fill.ts` (outside the list, but necessary): its world camera is converted to machine-relative (exact for the gears).
- `src/parity/parity.ts`: mote cases loop over every mechanism, named `<id>: <case>`. The hash cases are unprefixed and use the active mechanism's seeds. `e2e/parity.spec.ts` (outside the list, but necessary) expects the prefixed names.
- `e2e/looks.spec.ts`: runs per mechanism with `&mech=<id>` and checks that `__motes.mechanism()` reports it. The camera is machine-relative. Probe boxes are the projected anchor spheres (core: amber, body: blue), from a Node `PerspectiveCamera` built with `applyCamera` and the same anchors.
- `e2e/app.spec.ts`: spans come from `readSpans` (section list, ?p=0.5 and resize panels, the centre-line test is now one test over every span). There are three new `?mech=` tests: it selects, an unknown id warns once and falls back, and it is ignored without `?test=1`.
- `README.md`: `?mech=` and `mechanism()` documented.
- e2e has not been run yet (waiting on the ruling, since it touches the spec framing).


---

## Resolution after ruling B (commit 27a8eb0)

**Ruling.** Reframe the spec section so the whole core, at the assembled pose, fits in frame right of the panel for every mechanism. Keep the framing close. During the 0 → 0.35 move, require only continuity. The fill.ts, parity.spec.ts and README changes were accepted.

### Spec framing (core-relative, coreFocus 1)
| key | pos | target |
|---|---|---|
| spec@0.35 (inOutCubic) | [-1.02, 0.1, 4.15] | [-1.02, 0, 0] |
| spec@1 | [-0.98, 0.1, 4] | [-0.98, 0, 0] |

The keys are designed against the core anchor sphere itself (radius 1 in these units), so they hold for any mechanism. At 1280×720 a unit sphere about the core projects to NDC x ∈ [0.009, 0.922] at local 0.35 and [-0.009, 0.941] at local 1, with |y| ≤ 0.82. The panel edge is at -0.12, so the sphere spans about 83% of the free width.

The keys outside the spec are unchanged: the exact conversion from before, within 0.12 px of the old framing.

**First attempt.** It sat closer, with the sphere at x [-0.076, 0.936]. Its screenshot showed the gears' *exploded* drive gear (story pose, offset left and toward the camera) tucked 25–36 px under the panel at spec 0.9–1. I pulled the shot back and moved it right; that gear now clears the panel from spec 0.9 on (left edge 577 → 587 px vs the panel edge at 562 px). Earlier in the spec its motes are still in flight. The exploded body pieces (blue) still bleed off the right edge, but those are the body, not the core.

### Tests
- `keyframes.test.ts`, for every mechanism. At spec locals 0.35, 0.5, 0.7, 0.9 and 1, every sampled core point at the assembled pose must have NDC x > -0.12, x < 1 and |y| < 1. The pose is assembly 1, ZERO_FAULTS, variant 0 at the sampled drive. The core anchor sphere's projected diameter must also be more than 75% of the free width, so the framing stays close.
- New continuity test, for every mechanism: the world-space camera position and look point never jump across the whole story. The largest step at 4000 samples must be under 0.6 × the largest step at 2000; a jump would not shrink.
- RED: `npx vitest run src/timeline/keyframes.test.ts` with the old keys gave `local 0.35: expected 1.2651916112931816 to be less than 1`, the crank off the right edge.
- GREEN: same command, 7/7 passed.

### Verification
- `npm run typecheck`: clean.
- `npm test`: 17 files, 161 tests passed.
- `npm run e2e` (final keys): 34 passed, 1 skipped (`shots`, by design), 3.6 min. That covers looks ×4 for gears via `?mech=gears`, parity with the `gears:` prefixed cases, all app specs and the three new `?mech=` tests.
- Screenshots: `npm run shots` (canvas only), plus a temporary panel-visible capture at spec 0.2, 0.5 and 0.95, which I looked at.
  - At 0.95: the settled drive gear (warm) sits clear of the panel. The ghost of the driven gear, crank and bracket is to its right, all inside the frame.
  - At 0.2 (mid-move): the whole ghost machine sits right of the panel.
  - The temporary spec was deleted.

### Self-review notes
- `?mech=` ignored outside test mode: the check works because `main.ts` resolves the mechanism at module load, before the page's load event. Warnings and page errors are captured.
- `looks.spec` builds the page camera in Node with `applyCamera` and the same anchors, so the probe boxes follow any mechanism or camera change. Its camera is machine-relative `[0, 0, 3.1]` with coreFocus 0, about the old world distance of 8 for the gears.
- Anchors are memoised by mechanism id. `anchors.test` asserts every registry key equals its mechanism's `id`.

### Files changed
README.md, e2e/app.spec.ts, e2e/looks.spec.ts, e2e/parity.spec.ts, src/config.ts, src/main.ts, src/mechanisms/{index,anchors,anchors.test}.ts, src/parity/parity.ts, src/scene/cameraRig{,.test}.ts, src/spikes/{fill,renderSpike}.ts, src/timeline/{keyframes.json,keyframes.test.ts,sceneState.ts,sceneState.test.ts}.

### Concerns
- The framing is guaranteed at 16:9 (the test viewport). Narrower aspects move the panel edge and shrink the horizontal field of view, so they are not covered. That was true before as well.
- The spec framing is checked on the assembled pose, per the ruling. Where the reader sees the core during the spec also depends on each mechanism's `explodedOffset`, which the mechanism authors (the gears crank flies off the right edge). New mechanisms should keep core offsets modest.

---

## Fix round 1 (commit below)

1. **Vertex spike and default camera.**
   - `src/spikes/vertex.ts` now pins `camera: { pos: [-0.068, 0.04, 3.144], target: [-0.068, 0.04, 0.023], coreFocus: 0 }`. This is the exact whole-anchor conversion of its old world framing (pos (0, 0, 8) looking at the origin, fov 40), the same method used for fill.ts.
   - `defaultSceneState().camera` is now `pos [0, 0, 3.1], target [0, 0, 0], coreFocus 0`, a head-on overview at about three machine radii (the looks.spec shot). `sceneState.test` was the only test that assumed `[0, 0, 8]`; it is updated. The keyframeSampler tests set their own values.
2. **Anchor memo.**
   - `mechanismAnchors` is memoised in a `WeakMap<Mechanism, MechanismAnchors>` and returns a deep-frozen result (the object, each role and each centre).
   - Tests now cover memo identity, a fresh copy recomputing equal values, and frozenness. A new case gives two distinct mechanisms the same id, one with every part shifted +10 in x. It gets its own anchors (centre +10, same radius), and the original's memo is untouched.
   - RED against the HEAD anchors.ts (`npx vitest run src/mechanisms/anchors.test.ts`): 2 failed. The failures were `expected { …(3) } not to be { …(3) }` and `expected 0.1740788821794848 to be close to 10.174078882179485`.
   - GREEN: 5/5 passed.
3. **Centre-line e2e.** Each section edge is now its own `test.step`, with `expect.soft`, so one bad edge still reports the rest.

**Verification.** `npm run typecheck` is clean. `npm test`: 17 files, 162 tests passed. `npm run e2e`: 34 passed, 1 skipped (`shots`), 3.6 min.
