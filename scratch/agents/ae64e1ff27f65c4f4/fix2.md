
## Fix round 2: the review's Important finding and Minors

Commits:
- d6ac4dd node: every stream flows parent to child, so the up-stream climbs
- e8fd874 e2e: count every landed cube's corners; zoom-out's shots move in to 8

### Important: the up-stream ran backwards (taken)

- **Cause:** `stream.vert.glsl` used §3.6's `dir = −1` on the up-stream. Task 1 builds every edge parent → child, so the up edge already runs from C7's top (a) to R1's foot (b), and the −1 sent its dots from R1 down to C7.
- **Fix:**
  - Every dot now moves `u = fract(aK + NODE_STREAM_SPEED · clock)`, a → b, for every kind of edge.
  - The speed (0.15) moved into birth.ts as `NODE_STREAM_SPEED` and is spliced into the GLSL.
- **Test:** `src/scene/node/stream.ts` is the TypeScript twin of the dot position (`streamDotU`, `streamDotPos`). `src/scene/node/stream.test.ts` checks four things:
  - The shader's `u` line is exactly the twin's rule, with no per-kind direction.
  - The one up-stream is C7 → R1, its dot's height rises at every step as the clock rises (by more than 10 units), and R1's builders spawn at the same end (`R1.spawn == edge.a`).
  - Every down-stream's dot falls.
  - The wrap behaves (0.95 at clock 1 goes to 0.1).
- **RED/GREEN:** against the old shader the test fails ("Expected fract(aK + NODE_STREAM_SPEED * uClock), Received fract(aK + (up ? -1.0 : 1.0) * STREAM_SPEED * uClock)"). It passes on the fix.

### Minor 2: the clearance test sampled the network sparsely (taken)

`visibleNetwork` now adds the eight corners of every cube whose motes have all landed (growth ≥ born + dur · (k + 0.8) / n), as well as the landed motes, so every stack's top course is counted.

That caught a real case: the first stack's plan, P_a, straddles the top edge of the phone's frame at zoom-out 0.555, with a corner at 53 px. None of the sparse motes had landed on that corner.

I searched the shots again:

| Change tried | Result |
|---|---|
| Bearing 25 to 120 | P_a stays at the top edge |
| Elevation 20 to 30 | P_a stays at the top edge, and another plan comes in |
| Distance 9 → 8, bearings and elevations kept | Clears on both sizes |

So:
- N1 is now target N0, bearing 45, elevation 14, distance **8**.
- N2 is target N0, bearing 40, elevation 18, distance **8**.
- The keys are pasted: N1 pos [2.285, 0.739, 2.295], N2 pos [2.035, 0.963, 2.437].
- The comments in netShots.ts say why.

The portrait rig backs off by √m, so on a phone the camera really stands about 11 units out. The zo stills from fix round 1 are now 1 unit further out than the shipped shots, and I did not re-capture them this round.

### Other Minors

Taken:
- **1 and 10:** machine.ts's header now says that the network is `visibleNetwork()`, beside `visibleMachine()`. It also says that off-screen network points (above or below) are not counted, so test 14's "a wide shot's top never leaves the viewport" needs its own check.
- **4:** the change-detector test in netShots.test.ts is gone. The holds test pins the keys in network terms.
- **5:** `NODE_NEVER` replaces the literal 2 in node.test.ts.
- **8:** the node parity test asserts `hash01 < 1e-7`, as the mote test does.
- **9:** the double blank line in mote.frag.glsl is gone.

Left:
- **3:** GLSL `nodeNearGain` is not in the parity page. It runs outside `node()`, and covering it means a new parity output or a vertex shader of its own.
- **6:** duplication left as it is:
  - `turn()` (cluster.ts does not export its version, and the forms differ).
  - `floatTexture` (one in the app, one on the test page).
  - AGENT in halo.vert.glsl.
- **7:** the type cast in `parityPasses`'s default argument. Removing it changes every caller's signature.
- The near gain: ratifying it in design §11 is the controller's call.

### Results

- `npx tsc --noEmit -p .`: clean.
- `npx vitest run`: 66 files, 1230 tests passed.
