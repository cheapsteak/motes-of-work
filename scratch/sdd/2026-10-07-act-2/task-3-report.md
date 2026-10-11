# Act II, Task 3 report: the node set (the network, drawn)

Status: **DONE_WITH_CONCERNS**. Base 3205730. Commits on main, not pushed:

- 0fad6e6 node: the network's position library, its TypeScript mirror and its motes (node.glsl and node.ts together)
- 127f475 node: the network drawn, with its streams, halos, the reviewer's ring and the feed
- 3aa4796 parity: a node() mode, the GLSL network library held to its TypeScript mirror
- 733916e e2e: the visible machine includes the network where it is on screen

## What I built

### `src/scene/node/` (new)

| File | What it is |
|---|---|
| `birth.ts` | Every node-library constant, once: `NODE_BIRTH_WINDOW` 0.012, `NODE_FIX_WINDOW` 0.03, `NODE_FLARE_WIDTH` 0.004, `NODE_FLARE_GAIN` 3, settled brightness 0.5, highlight window 0.02 and gain 1.5, the surge (0.92 + 0.012 hop, window 0.01, `NODE_SURGE_MAX_HOP` 6), crack-face gain 1.3, the spawn spreads (0.3 parent radius; person 3 radii up, 0.5 spread, 1.5 bow), `NODE_NEVER` 2, the near-gain band (see below), `NodeRole`, `EDGE_KIND`. `glslNodeConstants()` splices them into node.glsl (the stack.ts pattern), so the GLSL carries no copy. |
| `nodeData.ts` | `packNodeData(net)`: the two RGBA32F textures, four texels a row. Nodes: T0 centre, born; T1 spawn, dur; T2 fixAt, hiAt, glow, hop; T3 radius, layer, cracked, stream row. Edges: T0 a, born; T1 b, hiAt; T2 c, hop; T3 kind, parent radius, child's fixAt, child row; the feed is the last row. `texel()` reads them as texelFetch does. |
| `nodeLayout.ts` | `NodeAttrs` and `NODE_ATTRIBUTES` (aLocal, aTwin, aNormal, aNormalTwin, aMeta = node, seed, birth, role: five attributes, 16 components), with the generated GLSL declarations, struct and `nodeInstanceAttrs()`. |
| `node.ts` / `node.glsl` | The mirror pair, §3.4 steps 1-8. Also `nodeLight(fixAt, hiAt, hop)` (step 7, shared with the halos and streams), `nodeSpread(seed)`, `nodeNearGain(glow, radiusPx)`, and in GLSL `nodeMoteOut()` (a NodeOut as the MoteOut that `moteLight` takes). |
| `shaderSource.ts` | `withNodeLibrary(vertex, nodeAttributes?)`: mote library, then node.glsl, then instance.glsl over the node layout (or over no attributes, for the streams and halos). |
| `crack.ts` | §3.5: `jag`, `crackGap`, `crackSide`, `crackShift`, `crackFacePoint`. |
| `nodeAttrs.ts` | `buildNodeAttrs(net)`: area-weighted surface points on every stack's boxes, a builder's `birth` inside its own cube's share of the duration (bottom course first), the crack twin on every cracked stack's crack cube (every fifth mote of it onto a crack face, faces alternating), the person set on the crack cube. Seeds are distinct 24-bit integers. N0 gets none. |
| `nodeSystem.ts` | `createNodeSystem(net)`: five meshes (`net-halos`, `net-streams`, `net-feed`, `net-nodes`, `net-ring`) over the two textures; `update(state, camera, viewport)` sets uniforms only. The group is hidden while `net.show` is 0. Exports `streamDots`, `streamInstances`, `networkAnchor`, `DOT_SPACING`, `STREAM_DOTS`, `RING_ALPHA`. |
| `shaders/` | `node.vert.glsl`, `stream.vert.glsl` (both with mote.frag.glsl), `halo.vert/frag.glsl`, `ring.vert/frag.glsl`. |

### Changes to existing code

- `mote.frag.glsl`: `in float vHi`; `if (vHi > 0.0) color = mix(color, EMBER, 0.8 * vHi)` with EMBER #FF6B57. `mote.vert.glsl` writes `vHi = 0.0`.
- `mote/shaderSource.ts`: `instanceChunk(decls, unpack)` exported (the mote shaders' chunk is now `instanceChunk(...)` of the same text), `spliceAll` exported.
- `parity/fields.ts`: `NODE_PARITY_FIELDS` and `glslNodeOutStruct()`; the field helpers are generic over the output type.
- `math/salts.ts`: `nodeSpreadX/Y/Z` = 20, 21, 22 (the salts table test, and the call-site tests now cover node.glsl and node.ts).
- `main.ts`: when the bike is on stage, `createNodeSystem(generateNetwork(MOTE_SEED, networkBudget(budget)))` once per page load, updated each frame after the ink. The camera's far plane 100 → 400 (the wide shots reach about 120 units on a phone). `drawStats()` also returns `instances` per visible instanced mesh.
- `parity/parity.ts`, `parity/shaders.ts`: `?lib=node` (below). `e2e/parity.spec.ts`: a second test.
- `e2e/machine.ts`: `visibleNetwork(s)` (born, settled ≥ 0.5, through node.ts); `machineOnScreen` counts it for the bike, but only where it is on screen.

### The rulings

1. Surge hop clamped at 6 (`NODE_SURGE_MAX_HOP`), in `nodeLight`, so motes, halos and streams agree. Tested: hops 0-6 light in order; hop 7 and 9 light with 6; −1 never.
2. Surge × (1 − fix), in the same function (and the stream surge by its child's fix). Tested on R0 and C1.
3. Generated once per page load in main.ts (and once per process in machine.ts and the parity page). The seed is `MOTE_SEED`.
4. Mote budget: there is no phone tier in the code (only `?n=` lowers the budget), so the network budget is `networkBudget(moteBudget)` on every size.
5. No WebGL: the network is created only with a renderer. Reduced motion: nothing in the network is time-based (no shimmer on its motes; the streams move only with `clock`).
- N0's cubes are not drawn again (no network motes); its stream from P_a and its halo are drawn.
- No highlight before the defect: every `hiAt` is above 0, and a test checks nothing is lit at highlight 0.

### Instance counts (drawStats, desktop and phone alike, no `?n=`)

| Mesh | Instances |
|---|---|
| motes (the bike) | 100,000 (unchanged) |
| net-nodes | 75,877 (`NETWORK_BUDGET` 76,000) |
| net-streams | 4,997 |
| net-feed | 34 |
| net-halos | 346 |
| net-ring | 1 |

The phone draws the same: there is no per-tier budget yet (the design's §8 probe is unbuilt).

## Numbers changed from, or added to, the design

1. **A close-up gain on hero motes (added).** With the designed glow normalisation alone, a hero's motes are dim at every distance (C1's glow is about 0.015, so a mote is 0.0075 bright). At the close shot on C1 the stack was invisible: a blank frame where the stack should be (still `c1` before the fix, described below). The normalisation equalises light where motes overlap; close up they do not. So `nodeNearGain`: a stack whose glow is under 1 is brought up to glow 1 as its radius on screen grows from 120 to 300 CSS px. Far shots keep the designed glow (a rule's radius about 90 px at the wide shots, a code stack's 20); stacks with glow ≥ 1 are never touched. It is applied in node.vert.glsl, because node() takes no camera; the TS mirror is exported and tested.
2. **The crack's jag height is read at the spike's scale**: `jag(y) = 0.08 u (tri(4.1 s + 0.31) + 0.6 tri(9.7 s + 0.17))` with `s = y · 0.42 / u`. The design scales the gap and the amplitude with u but not the frequencies; this keeps every crack the same shape. A crack face's height span is shrunk by the lip's small y shift so face motes stay inside the cube.
3. **Crack-face brightness ×1.3 only while open**: `mix(1, 1.3, v)`, so after the fix they are "ordinary surface points" as §3.5 says.
4. **Edge texture has a fourth texel.** §3.3 lists T2 as `c.xyz, kind and hop`, five values. T2 is c and hop; T3 is kind, the parent's radius (the builders' spawn spread), the child's fixAt (the stream's light goes out with it) and the child row.
5. **The node texture's pad (T3.w) is the main stream's edge row**: a builder flies through that edge's control point.
6. **Sentinels.** A null `hiAt`/`fixAt` is `NODE_NEVER` = 2 (past every 0..1 clock), a null hop −1.
7. **Builder births.** Cube k of n lands in `[(k + 0.2)/n, (k + 0.8)/n]` of the stack's duration (`CUBE_LANDING`): discrete cube-by-cube landings.
8. **Stream dots**: world diameter 0.03, 1-2 CSS px (the up-stream capped at 1 px: "thin"); speed 0.15 of a stream per unit of clock. The feed's control point is bowed sideways in the shader (its far end moves); its dot count is for its longest reach (R0's foot to the farthest visit).
9. **Halo profile** `(1 − r²) e^(−k r²)`, k = 4 ln(5/3): 1 at the centre, 0.45 at half the radius, 0 at the rim. The lod uses the radius in CSS px.
10. **Surface sampling** is an analytic box sampler (area, then face, then point), not `samplePart` on a merged plate: the same distribution, far cheaper for 76k points at page load.
11. **Depth cue**: the network's motes are dimmed across the network's own bounding sphere, not the bike's.
12. **Far plane** 400 (main.ts and machine.ts). Nothing writes depth, so this moves no Act I pixel (verified below).

## Tests and results

- `npx tsc --noEmit -p .`: clean.
- `npx vitest run`: 65 files, 1227 tests passed (an earlier count of 1229 in 67 files included two temporary files, since deleted).
- `npx playwright test e2e/parity.spec.ts`: 2 passed. Node parity errors are 1e-6 to 3.4e-5 per case (tolerance 1e-3). A mutation check (crack-face gain removed from node.glsl only) raised four cases to 0.29-0.30, so the comparison is not vacuous.
- Full e2e: 124 passed, 9 skipped, 2 failed (clearance at zoom-out; see "e2e").
- **Act I identity (beyond the brief):** I captured 14 canvas-only frames of Act I (p = 0.03, 0.15, 0.3, 0.45, 0.6, 0.75, 0.88, both sizes, n=20000) on a build of 3205730 and on this build: **14 of 14 byte-identical.**

### Test 3 (`src/scene/node/node.test.ts`, `crack.test.ts`, `nodeSystem.test.ts`)

- Determinism of node() and of the motes; every mote the generator allotted, none for N0, distinct seeds.
- A builder is hidden before `settle − W`, in flight on the Bezier from its stream's foot (spread by its parent's radius) through the stream's control point (checked against an independent recomputation from the Network's edge, not the texture), landed after.
- Builders land cube by cube, each on its own cube's surface.
- Person motes follow `net.fix` (falling from above), builders `net.growth`; types Human and Agent.
- The flare peaks at `settle` (0.5 + 3 times glow) and is gone at ±0.004.
- Hidden and dark at `show` 0.
- `hi` 0 before hiAt, 1 after, 0 once fixed; ×2.5 brightness when lit; nothing lit at highlight 0; C1 never lights; clean stacks never light; the surge by hop with the clamp; the surge out at the fix.
- The crack: twins only on cracked crack cubes; 20 % on faces; open until `fixAt − W/2`, whole at `fixAt`, between part way; lips ×1.3 open, ordinary whole; unit normals.
- `nodeNearGain`: 1 far, 1/glow close, never below 1.
- node.glsl takes every constant from the spliced set, with the designed values.
- crack.ts at three cube units: gap scaling, a triangle-wave jag of the same shape at every scale, lips half the gap off the plane, faces on the plane and facing into the gap.
- The layout (5 attributes, 16 components, generated decls, struct and unpacking in step); the shaders splice every marker, take at most 16 inputs, and node.vert.glsl's size table equals mote.vert.glsl's; no library in a fragment shader; the ember mix is behind `vHi > 0`.
- The textures carry every value as float32 with the sentinels; the stream dot counts; the system's meshes, counts, hidden-at-show-0, uniforms from state, the ring and feed against `ringAt` and `feedAlpha`; the budget at 500, 3,000 and 30,000.
- `fields.test.ts`: NODE_PARITY_FIELDS covers NodeOut exactly and is the struct the library is built with.

### TDD evidence (honest)

The mirror and the tests were written in the same pass, not test-first. RED runs that did happen:
- `node.test.ts` "distinct seeds": 75,727 distinct of 75,877. The first seed hash collided; fixed with an odd-multiplier bijection.
- `crack.test.ts` faces: face motes 0.0027-0.007 above the cube top (the lip's y shift). Fixed in crack.ts.
- The parity mutation check above (GREEN → RED on a one-line GLSL change → restored).

## e2e

Full run (`E2E_PORT=4199 npx playwright test`, 14.7 min): **124 passed, 9 skipped (the SHOTS-gated screenshot spec), 2 failed**: both are `clearance.spec.ts` "the visible machine stays below the text in every page" (1440x900 and 390x844), at zoom-out. Everything else passes, including parity in both modes, purity, auto-advance, pages and text.

**`e2e/clearance.spec.ts` now fails at zoom-out on both sizes, because the network is now drawn and counted.** The zoom-out keys (task 2's N1 → N2) carry stacks through the text band as the camera pulls back:

| Size | zoom-out local | What is in the band (top px) |
|---|---|---|
| 390×844 | 0.55-0.65 | P_a (the first stack's plan) at 15-97 px |
| 390×844 | 0.75-0.85 | R_a, R0 (and R_b at 0.85) at 12-139 px |
| 390×844 | 1.00 | R_b at 151 px (the panel's bottom + 8 is 152) |
| 1440×900 | 0.75 | P_a, a filler plan at 23-57 px |
| 1440×900 | 0.85-1.00 | R_a, R0 at 0-4 px (the very top edge) |

Points above the top of the screen are not counted (a stack born high above the frame is out of the picture, as zo-1's design says). The ones in the table are on screen. On the phone it is the rules' faint speckle just under the text (still `zo-0.85`). §2 makes the clearance test the arbiter for the shots, and §7 gives the tuning to task 7, so I did not move task 2's N2 or its pull-back. The decision belongs to the controller: retune N2 now (out, or with the rules kept above the frame), or carry the failure to task 7.

## Stills (`shots/act2-nodes/`, gitignored), phone first

All are `?test=1&mech=bike&p=1` (the end of zoom-out, the essay's current end) with `?state=` setting the six scalars, the reflow at 1, stage.motes 0.03 and the camera from `netShotKeys`. The text panel in the frames is zoom-out's (the only section yet).

- **`a-growth0.12-zoomout-end-390x844.png`** (and `zo-1.00-*`, the keyframed frame, identical in content). The first stack (the bike's) low centre at about 66 %, small and bluish. Faint speckle clusters of the first bottom stacks and plans round it, two soft far-glow halos to its right, dotted streams running down. Top-left, just under the text (about 180-270 px): a rule stack seen nearly edge-on, a faint striped speckle. Upper right: faint speckle at about 165-260 px. **This is the band crossing above.** Desktop: the same, dimmer and smaller; the rules are faint dots at the very top edge, behind the text column.
- **`b-growth0.36-hi0.25-fix0-N9-390x844.png`** (the twelve, wide). The network small and low (about 440-700 px), well under the text. Nine small ember discs (the nine code stacks) and one large ember blob, which is the three plans P1, P2 and P3 merged at this bearing. Blue halo discs for the code layer, the rules as sparse speckle above. Countable as ten things, not twelve. Desktop: the same layout, larger, with the plans' blob again one shape. The bottom layer reaches the bottom edge on desktop.
- **`c1-growth0.36-fix0-close-C1-390x844.png`** (the crack). C1's top course fills the lower screen at about 600-700 px. Its top-front brick is split by a jagged near-vertical gap with a faint brighter jagged line in it. The cube's neighbours below it are dense blue speckle; the bike's stack is at the right edge. Nothing stands above the cube; the frame above is dark but for distant speckle. Desktop: the same, the split clearly jagged.
- **`c2-growth0.36-fix1-close-C1-390x844.png`**: the same frame with the brick whole, its surface dusted with amber; no gap.
- `i-growth0.36-fix0.07-close-C1-*`: mid-fix, amber motes landing on the brick from above, the gap narrowing.
- **`d-growth1-show1-N19-390x844.png`** (the whole network, all fixed). A dense field of soft blue code discs filling the lower third (about 500-740 px). The rules as striped speckle above it: R0's with a warm dusting. The plans are barely visible: their radius is past the impostor's band, and 300 motes are a thin speckle. Nothing is in the text band. Desktop: the same, the code field running off the bottom edge.
- Extras: `e-growth0.135-N3-*` (B1 and B2 forming next to the first stack: sparse speckle; the streams are faint dotted lines), `f-surge0.96-N16-*` (R0 and its lineage as big ember discs, the halos capped at 120 px), `g-review0.5-N13-*` (the ring, a thin cool-white annulus round V5; the lit stacks' ember halos are large at this distance and the plans' reach into the text band), `h-growth0.62-fix0.2-close-R0-*` (R0 close: sparse speckle, no readable crack).

**Does anything enter the text band on the phone?** At the end of zoom-out, yes: faint rule speckle just under the text (R_b at 151 px against a band edge of 152). During the pull-back, also P_a, R_a and R0. In the twelve, the crack close-up and the whole network: no. In the extra `g` (reviewer) still, lit plans' halos do, at a camera that is task 6's.

## Self-review

- Both mirrors in one commit. Every node.glsl constant is spliced from birth.ts (a test fails on a bare copy).
- No module-level mutable state in node(); the textures and attributes are built once and never touched.
- Copy and commit messages carry no names. No new dependencies.
- Temporary scripts (`shots/capture.mjs`, `crop.mjs`, `parity-dump.mjs`, the still lists, two temporary vitest files) deleted. My preview servers stopped.
- node.vert.glsl copies mote.vert.glsl's size table: a test holds the two equal.

## Concerns

1. **Clearance fails at zoom-out** with the network drawn (table above). It needs a shot decision: N2, or the pull-back from N1.
2. **R0's crack does not read at its close shot.** R0 is a rule of radius 4.4 (task 1's sizes), so its 8k hero motes are about 77 per unit² against C1's 1,600. At N15 (d 5.5) the crack cube is sparse speckle. Levers: R0's and R1's hero counts, putting a hero's share on its crack cube, or the shot.
3. **Plain stacks are sparse speckle at medium range** (N3, d 10: 120 motes on a stack about 120 px across). The impostor has faded by then. This is the design's density. Levers: the budget, the counts, or the impostor band.
4. **The twelve are ten shapes at N9**: P1, P2 and P3's halos merge into one blob on both sizes (test 12 is task 7's).
5. **Lit halos are large close up** (alpha 0.6 hi, not lod-scaled; `g` still): at the reviewer's shot the lit plans' discs are big and reach the band.
6. **The near gain is my addition** (above). Without it no close shot can show a hero.

## Fix round 1: the zoom-out shots, retuned by the clearance test

Ruling: retune now. Commit 85b57d5, "timeline: zoom-out stays close on the first stack, clear of the text band with the network drawn".

### What changed, against the design

| Shot | Design (§2.1) | Now |
|---|---|---|
| N1 (zo-1, at 0.50) | target N0, bearing 45, elev **12**, d 9, fov 40 | target N0, bearing 45, elev **14**, d 9, fov 40 |
| N2 (zo-2, at 1.00) | target **(0, 1.5, 0)**, bearing 40, elev 18, d **26**, fov 40 | target **N0**, bearing 40, elev 18, d **9**, fov 40 |

- In keyframes.json, the zoom-out camera keys at 0.50 and 1.00 are `netShotKeyframe` of the new shots:
  - N1: pos [2.572, 0.84, 2.582], target [-0.011, -0.071, -0.001]
  - N2: pos [2.291, 1.092, 2.741], target [-0.011, -0.071, -0.001]
- The S10′ hold over 0..0.02 is untouched, so the boundary with Act I does not move. The existing test still pins it equal to spec's end.
- netShots.test.ts pins both shots' values in network terms. The HOLDS line for N2 is reworded. The existing holds and pasted-keys tests now read the new values.

### Why not the levers in the order you gave

I measured each lever with a temporary search, which I have since deleted. It used e2e/machine.ts's visible machine and the clearance spec's own panel bottoms (+8 px), and stepped 0.01 over the page's full-ink stretch on both sizes. It also recorded which stacks entered the band.

- **Lowering N2's elevation** (18 → 16, 14, 12, 10, 8, 6, with N1 at 12, 10 or 8): every combination still failed.
  - P_a, a filler plan, R_a, R0 and R_b still entered the top of the frame during the pull-back.
- **Raising N2's target** (y +0.5 to +3): failed. It tilts the view up and lets the plans in sooner.
- **Pulling out** (d 28 to 40): failed. A pull-back is exactly what sweeps the plans (y 7) and the rules (y 14) in through the top edge. Anything entering from the top crosses the band.
- **N1 alone fails at elevation 12.** The first stack's plan, P_a, is born at zoom-out 0.5. On a phone it lands in the band at 0.53 even with the camera held at N1. Elevation 13 still fails; 14 is the least that clears it.
- **No pull-back survives on a phone.** From N1, any pull-back past about 9.5 units fails, whatever the elevation (14 to 50), target height or bearing (0 to 315 tried). The portrait rig's frame is tall, and the plan layer is 18 units wide above it.
- **What passes:** looking further down from the same distance.
  - N2 at d 9, target N0, bearing 40, elevation 14 to 22: all pass.
  - I kept the design's elevation of 18 and bearing of 40, and changed only the target (to N0) and the distance (to 9).
  - zo-2's motion is now a small swing round the first stack, from bearing 45 to 40, while the view tilts from 14° to 18° down.

So the change keeps everything the design asked of zo-1. It gives up zo-2's pull-back over the bottom layer. On a phone, the network's upper layers rule that pull-back out under this clearance test. The layers section starts from N2 and is task 5's: its rise and drops will meet the same crossings.

### Stills (`shots/act2-nodes/fix1-zo-*`), phone first

- **390×844 at 0.55**: the first stack, six blue bricks, small at about 62 % of the height. One stream of dots (from its plan, out of frame above) leaves its lower left. The frame above it is dark to the text. Nothing is in the band.
- **390×844 at 0.75**: the stack dimmer (stage.motes falling). Sparse speckle of newly born bottom stacks lower left and right, and stream dots. Nothing is in the band.
- **390×844 at 1.00**: the stack dim and faint. A handful of bottom stacks as speckle round and below it. A few streams run diagonally down from upper right, with their dots between about 180 and 450 px, all under the text (the panel ends about 144 px). No stack is in the band.
- **1440×900 at 0.55 / 0.75 / 1.00**: the same story, larger.
  - At 1.00, the stack is centred low, the bottom stacks are speckle to the right and lower left, and streams come down from the upper right.
  - A few stream dots run up to the top edge beside the text column. Streams are not part of the clearance test's visible machine: it counts landed motes only.
- **Does anything enter the text band on the phone now?** No stack does. On desktop, a few dots of streams from the plans above reach the top edge to the right of the text, not over it.

### Results

- `npx tsc --noEmit -p .`: clean.
- `npx vitest run`: 65 files, 1228 tests passed.
- `E2E_PORT=4199 npx playwright test e2e/clearance.spec.ts`: 4 passed.
- Full e2e (`E2E_PORT=4199 npx playwright test`, 14.5 min): **126 passed, 9 skipped (the SHOTS-gated screenshot spec), 0 failed.**

Status after fix round 1: concern 1 is resolved; concerns 2-6 stand as reported (task 7 tunes looks).

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
- Full e2e (`E2E_PORT=4199 npx playwright test`, 14.4 min): **126 passed, 9 skipped (SHOTS-gated), 0 failed**, including clearance on both sizes and both parity modes.
