# Act II Task 3 review: the node set (3205730..85b57d5)

Reviewer: task-scoped gate. Read-only. Inputs: task-3-brief.md, the design (§3.3–§3.8, §3.10, §5, §6 tests 3 and 15, §11), task-3-report.md including "Fix round 1", and review-3205730..85b57d5.diff. The constraints are in global-constraints.md.

**Verdicts:** spec ❌ (one misread requirement) · quality **Needs fixes** (one Important).

## Spec compliance

- ❌ **Issues found:**
  1. **The up-stream's dots run down, not up** (Important, details below). `src/scene/node/shaders/stream.vert.glsl:62` uses `dir = −1` on the up-stream, which is §3.6's formula as written. Task 1 orients every edge parent → child: the up edge is `[a, b] = [top(C7), foot(R1)]` (`src/network/generate.ts:511`). So `u` falling moves the dots from R1 down to C7. That is the reverse of §3.6's stated intent ("`dir` −1 on the up-stream, so its dots climb"). It is also the reverse of R1's builders, which fly up the same Bezier from C7's top. The design's formula assumed the up-stream's `a` was its upper end; with task 1's convention, `+1` on every edge is what makes all streams flow parent → child and the up-stream climb.
- Everything else in §7 task 3 is present:
  - `birth.ts`, `node.glsl` / `node.ts`, `nodeLayout.ts` (5 attributes, 16 components), `nodeData.ts` (two RGBA32F textures), `nodeSystem.ts` with the five meshes.
  - The `?lib=node` parity mode, the `main.ts` wiring and `e2e/machine.ts`.
  - Test 3 in vitest, and test 15's parity half in `e2e/parity.spec.ts`.
- The controller's rulings, checked in the diff:
  - **Surge hop clamped at 6:** `min(hop, NODE_SURGE_MAX_HOP)`, in `nodeLight` in both mirrors (node.glsl:33, node.ts nodeLight). It is shared by the halos and streams, and tested for hops 0–6, 7, 9 and −1.
  - **Surge × (1 − fix):** in the same function. Streams use the child's fixAt (edge T3.z). Tested on R0 and C1.
  - **Generated once per page load:** `main.ts:149`, inside `if (renderer)`, only for `mechanismId === 'bike'`. Once per process in machine.ts and once per page in the parity page.
  - **N0's cubes are not drawn twice:** `buildNodeAttrs` gives N0 no motes, and node.test.ts asserts it. N0's halo is drawn (halo instances = `net.nodes.length`), and so is its stream from P_a.
  - **No highlight before hiAt:** every lit window ends at its `hiAt`. A never-coming `hiAt` / `fixAt` is `NODE_NEVER` = 2. Nothing is lit at `net.highlight` 0 (tested).
  - **Phone budget:** there is no tier, so `networkBudget(moteBudget)` is used on both sizes and the report gives the counts. This is as ruled.
  - **§3.10:** the network carries no time term (`shimmer()` is never called by node.vert.glsl), and without WebGL it is never created.
- Parity: `NODE_VERTEX` (src/parity/shaders.ts) runs `node(nodeInstanceAttrs())` from the production `withNodeLibrary`. It covers 8 states: building, fixing, the twelve, the surge, R0 fixing, all-ones and hidden. The sample is weighted onto C1/R0's crack faces, crack-cube builders and person motes. The constants are spliced from birth.ts, and a test rejects a bare copy in node.glsl.
- Fix round 1 (N1 elevation 14; N2 = target N0 at d 9, with no pull-back) is a controller-ruled retune. `netShots.ts` documents the reason, and the holds test reads the new keys.
- ⚠️ **Cannot verify from the diff:**
  - The e2e results: 126 passed, 9 skipped, 0 failed, and parity errors of 1e-6 to 3.4e-5.
  - The parity mutation check.
  - The 14 byte-identical Act I frames.
  - The stills, and what each one shows.
  - **The near gain (`nodeNearGain`, birth.ts `NODE_NEAR_PX_FROM/TO`) is an addition beyond the design.** §3.3 says glow normalisation equalises light "at any distance". The gain deliberately breaks that once a hero's on-screen radius passes 120 CSS px.
    - It is **pure**: a function of the camera, which is a function of scroll.
    - It is **bounded**: at most 1/glow, about 66× for C1. The factor is 1 for glow ≥ 1.
    - It **leaves far shots as designed**: below 120 px it is exactly 1, so test 11's far half and test 12 are untouched.
    - Through the 120–300 px band (the dive, the climb onto R0) a hero is many times brighter per area than its neighbours.
    - The thresholds are absolute CSS px, so on a phone, where the portrait rig backs off by √m, the same beat sits lower in the band than on desktop.
    - The controller should ratify it and record it in design §11; it is not in the design doc.
  - Main-thread load cost: generating the network (about 100 ms) plus `buildNodeAttrs` for 76k motes, all before the first frame. This is not measured.

## Strengths

- The two mirrors agree line for line: same steps, same order, same sentinels.
- Every constant is spliced from one TS source (`glslNodeConstants`), as with the stack.ts pattern. The NodeAttrs and NodeOut structs, declarations and unpacking are generated from one list. Tests hold each of these.
- The rulings live in one function (`nodeLight`), shared by motes, halos and streams, so the three cannot drift apart.
- The tests check real behaviour, not tautologies:
  - The in-flight position is checked against an independent Bezier recomputation from the Network's edge, not from the texture.
  - The crack is checked at three cube units for geometry, gap, jag shape and face normals.
  - The texture packing is compared value for value as float32.
  - The parity sample is chosen to hit every branch.
- Purity: `update()` writes uniforms only. The textures and attributes are built once and never touched. The ring and feed are CPU-pure functions of `net.review`.
- GPU lifetime: everything is created once, and `dispose()` covers 5 geometries, 4 materials and 2 textures. The feed shares the stream material, and it is disposed once. The parity page disposes its material, geometry and textures.
- `main.ts`:
  - It degrades correctly for a non-bike stage (no network) and without WebGL (nothing created).
  - The compare page is untouched, as §5 asks.
  - `drawStats().instances` is a useful addition for test 16.
- Act I safety: the bike's vertex shader writes `vHi = 0`, and the ember mix is gated behind `vHi > 0.0`. Ghost and thread use their own fragment shaders.
- Honest reporting: the near gain, every changed number, and how TDD went in practice.

## Issues

### Critical

None.

### Important

1. **Up-stream dots flow downward, against the design's intent and against R1's builders.**
   - Where: `src/scene/node/shaders/stream.vert.glsl:62`, `float u = fract(aK + (up ? -1.0 : 1.0) * STREAM_SPEED * uClock);`
   - Why: task 1 orients the up edge `a = top(C7)` → `b = foot(R1)` (`src/network/generate.ts:511`). With `dir = −1`, `u` falls as `clock` rises, so the dots slide from R1 (y ≈ 14) down to C7.
   - Impact: §3.6 asks for the opposite ("so its dots climb"). That is the whole point of "the defect came back up", and task 6's up-stream follow shot rides along this stream. Meanwhile R1's builder motes fly up the same Bezier, so two things on one stream move in opposite directions.
   - Coverage: no test pins the direction.
   - Fix: use `+1` for every kind, since every edge runs parent → child. Add a test that the up-stream dot's y rises with `clock`, and one that a down-stream dot's y falls. The test can be a TS recomputation of the dot formula, or a note in the design's §3.6 that `dir` is +1 under the parent→child convention.

### Minor

1. **The off-screen exclusion also drops the bottom edge.** `e2e/machine.ts:155` drops network points with `|q.y| > 1`, which removes points below the frame as well as above it. It matches zo-1's intent that stacks born high above are out of frame. But test 14's second clause ("a wide shot's top never leaves the viewport") can no longer be read from this data. Task 7 needs a separate check, so say that in the docstring or the plan.
2. **The clearance test samples the network sparsely.** `e2e/machine.ts:46` builds it at `networkBudget(8000)` = 6,080 motes, about 12–24 per plain stack. A stack's top course can be under-sampled. The pre-fix failure was by 1 px (R_b at 151 against 152), so the margin this sparse sampling can hide is real. It is the same convention as the bike's 8,000, but the network's stacks are much sparser per stack.
3. **The parity page never runs the GLSL `nodeNearGain`.** node.vert.glsl:47 applies it outside `node()`. The TS twin is unit-tested; the GLSL copy is held only by eye. It is one line, but it is a mirrored function with no comparison.
4. **A change-detector test.** `src/timeline/netShots.test.ts:86-87` restates `NET_SHOTS.N1/N2` as literals. The holds test above it already pins the keyframes to the shots in network terms, so this one only proves the constants were typed twice.
5. **A literal where the sentinel belongs.** `src/scene/node/node.test.ts:166` writes `n.fixAt ?? 2` / `n.hiAt ?? 2` instead of `NODE_NEVER`.
6. **Small duplication:**
   - `turn()` is redefined in `crack.ts:56` and `nodeAttrs.ts:23` (and `cluster.ts:79` has a third form).
   - `floatTexture` is in `nodeSystem.ts` and in parity.ts.
   - `AGENT` / `EMBER` are copied in `halo.vert.glsl` and `mote.frag.glsl`. §9 accepts two copies of ember; the AGENT copy is extra.
7. **A type cast in a default argument.** `src/parity/fields.ts` `parityPasses<Out = MoteOut>(fields = PARITY_FIELDS as readonly ParityField<Out>[])` casts to make the default type-check. Requiring the argument for non-MoteOut would be cleaner.
8. **An inconsistency in the node parity spec.** In `e2e/parity.spec.ts` the node test pins `pcg goldens` to 0 but drops the mote test's `hash01 < 1e-7`. The hash case is generic, so the node test should assert it the same way or not at all.
9. **A stray blank line.** `src/scene/mote/shaders/mote.frag.glsl:9-10` has a double blank line after the `vHi` declaration.
10. **`visibleMachine` is unchanged.** §5 says `visibleMachine` adds the network. The diff adds a separate `visibleNetwork` and merges it only in `machineOnScreen`. That is fine for clearance, but any other caller of `visibleMachine` will not see the network. Name this in the file's header comment.

## Focused checks made outside the diff (one per named risk)

| Risk | Where I looked | Finding |
|---|---|---|
| Stream direction | `src/network/generate.ts:126-160, 505-528` (Edge `a` / `b` orientation) | Important 1. |
| `mote.frag.glsl`'s new `in float vHi` breaking a vertex shader that does not write it | grep over `src/` | Only mote.vert, node.vert and stream.vert pair with mote.frag. All three write `vHi`. Ghost and thread have their own fragment shaders. OK. |
| The stage mechanism is not the bike, or there is no WebGL | `src/main.ts:60-130, 195-215` | The network is created only under `renderer && mechanismId === 'bike'`. `draw()` returns early without a renderer. Context loss stops the loop. OK. |
| The budget moving the layout (main.ts's `?n=` against NET_SHOTS's default) | `src/network/generate.ts` budget uses | The budget sets only `allocateMotes`, never the layout. OK. |
| `pxPerUnit` units for the near gain and the halo's lod | `src/scene/mote/shaders/instance.glsl:77` | It returns drawing-buffer px; both callers divide by `uPixelRatio`, giving CSS px. OK. |

## Assessment

**Task quality:** Needs fixes

**Reasoning:** The node set is careful, pure and well tested. The two mirrors agree, the rulings are applied in one shared place, and resources are created once. One requirement is misread: the up-stream's dots descend because §3.6's `dir = −1` was applied over task 1's parent → child edge orientation. Fix it and pin it with a test before the up-stream follow (task 6) is built on it. The near gain is sound engineering, but it is a design deviation the controller should ratify in §11.
