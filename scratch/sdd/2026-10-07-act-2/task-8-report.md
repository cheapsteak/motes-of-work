# Act II, Task 8 report: stacks that read as cubes

Status: **DONE_WITH_CONCERNS**. Base 8deeaf6. Commits on main, not pushed:

- 2b0bc2a node: every cube of every stack has a body, and the halo is only the highlight's glow
- 9039521 network: the first stack is drawn like every stack, and the bike's motes hand over to it
- 7b963b4 e2e: a plain stack at the wide shot is a brick stack, not a disc
- 8638fb2 design: Act II stacks as cubes, as built

Two docs-only commits landed on main while I worked (f02b8c3, bbbe3ac: new files under docs/specs, not
mine); mine sit on top of them. No file overlaps. Each of my commits ends with the session trailer.

## What I built, by the brief's items

### 1. A box body for every cube (src/scene/node/)

- **One instanced mesh, `net-boxes`**: a unit box (three's BoxGeometry: 24 vertices, 12 triangles) per
  cube of every stack, N0's included, front faces only, screen-blended like the motes, drawn before them.
- **Look** (box.vert.glsl / box.frag.glsl): face alpha 0.07, plus up to 0.08 on a face square to the key
  light (`uKeyDir`, the motes' own lighting uniform); a 1 CSS px edge (fwidth of the in-face distance to
  the nearest edge) at alpha 0.32. Agent blue.
- **Born with its cube**: a body's `birth` is `cubeLanding(bi, cubes, 0.5)`, the middle of its cube's
  mote landings. `cubeLanding` is now the one function the motes' births use too (nodeAttrs.ts). The
  presence is `nodeArrival(nodeSettle(born, dur, birth), uGrowth, NODE_BIRTH_WINDOW)`. `nodeSettle`,
  `nodeArrival` and `nodeCrackOpen` are new shared functions factored out of node() in both mirrors
  (node.ts and node.glsl, changed together; parity green). Nothing is copied.
- **Scaled by `net.show`** (presence × show).
- **Ember and warmth**: `nodeLight` (shared) gives hi, surge and fix. The colour is mixed toward ember by
  `NODE_EMBER_MIX × max(hi, surge)`. A fixed crack cube's body is mixed halfway toward the person's amber
  by its fix. The colours come from a new palette in birth.ts (`NODE_PALETTE`: agent, human, ember,
  plus `NODE_EMBER_MIX`), spliced into the node library. The halo now reads it too (its literals are
  gone). mote.frag.glsl keeps its own copies, because the bike draws by them; a test holds the two sets
  equal, name for name.
- **The crack: I chose to split the body, not leave it out.** A cracked stack's crack cube has two body
  instances, one per lip (`BoxAttrs.side` +1 / −1). Each lip discards, in the fragment shader, the
  points on the other side of the jagged plane, and moves half the gap off the plane while the crack is
  open, exactly as `crackShift` moves the motes. Through the open gap no body paints. The jagged plane
  is a new GLSL file, `crack.glsl`. It mirrors `crackLevel` and `crackGap` in crack.ts, and its constants
  (the normal, gap, jag, unit, and the two triangle waves, now data in `CRACK.waves`) are generated from
  crack.ts. Leaving the cube out would have made a cracked stack visibly short a cube from afar.
- **One addition the brief did not name: the body opens only once the crack is big on screen.** With a
  filled body, R0's crack read at fr-1 on desktop (test 11 far: 35 changed px against a limit of 20). R0's
  gap there is about 3.6 px; the motes' sparse lips had hidden it. So the lips' shift is multiplied by
  `boxCrackSeen(gapPx) = smoothstep(5, 10, gapPx)`, where gapPx is the crack's full gap on screen in CSS px,
  measured in the vertex shader. Constants: `NODE_BOX_CRACK_PX_FROM/TO` in birth.ts. Below 5 px the two
  lips tile the whole box; the crack is the motes' alone, as before. The close shots all have wider gaps
  (C1's about 30 px at df-1, the rules' about 17 at their close-ups). This is a judgement call; see concerns.
- **Mirror / parity**: box.ts ↔ box.glsl is a new mirror pair. The parity page gains `?lib=box`, which
  renders box() through the production attribute path. Its sample is both lips of C1's and R0's crack
  cubes at 32 surface points each, then bodies spread over every stack, with gaps on screen across the
  opening span. It compares every BoxOut field (pos, presence, q, cut, normal, hi, warm) over 8 states.
  e2e/parity.spec.ts has a third test. To check it is not vacuous, I scaled the jag by 1.01 in
  crack.glsl only: the box parity test then failed at 1.08e-3. I reverted the change.

### 2. The round far glow goes

halo.vert.glsl: `lod`, `LOD_PX` and `LOD_ALPHA` are gone. Alpha is now `show · bornFrac · (near · HI_ALPHA ·
hi + SURGE_ALPHA · surge)`. Test 12 then failed, and I re-tuned it in two steps:

- **The lit halo's alpha is 1.35, up from 1.0.** That is the 0.35 + 1.0 it used to sum to over a small
  stack. At 1.0 the phone counted 0 to 1 shapes and the desktop 2.
- **From afar, a lit stack's body gives way to its halo.** The body's alpha is × (1 − hi · nodeHaloNear).
  `nodeHaloNear` is the halo's own fade by on-screen size, now one shared function (node.ts/.glsl) with
  constants `NODE_HALO_NEAR_FROM/TO` 0.15/0.35. Drawn under the glow, the body's faces and lit edges pushed
  green and blue past test 12's ember test. That cut the end-on plan's core into 2–4 pieces and pushed one
  phone code stack under the 30 px floor. Close up, where the halo fades, the lit body is drawn in ember
  (tr-2, fx-1).
- **The body takes no brightness gain from the highlight; only its colour changes.** An earlier
  variant applied the motes' 1 + 1.5 hi + surge, and it whitened the cores. The gain output was removed
  from box().

Test 12 now: phone 12 shapes (areas 142, 144, 110, 40, 36, 40, 45, 44, 58, 56, 46, 43); desktop 12 (745,
717, 634, 207, 155, 200, 224, 223, 269, 222, 253, 223). The smallest on the phone is 36 px, the same as Task
7's smallest, against the 30 px floor. It is still fragile in the way Task 7 described.

### 3. N0 is drawn by the node set

generate.ts: N0 is no longer left out of `allocateMotes`, so it carries a plain code stack's motes (117 at
the full budget) and its glow. `net-nodes` goes from 75,877 to 75,994, still under 76,000. Its body comes
from buildBoxAttrs like any stack's. The comments in lineage.ts, generate.ts and nodeAttrs.ts that said
it had none are updated.

### 4. The hand-over

keyframes.json: zoom-out's last `stage.motes` key, `zoom-out@0.9`, changes from 0.05 to 0. No other key
moves. The reflow is untouched. Every later section holds 0. The tests that pinned 0.05 now pin 0
(keyframes.test.ts zoom-out, networkKeys.test.ts twice).

## Tests and results

- `npx tsc --noEmit -p .`: clean.
- `npx vitest run`: **68 files, 1,550 tests passed.** One run made while the e2e suite was also running
  timed out on three slow, untouched tests (reveal, reflow fingerprint, keyframes brief). On its own the
  suite is green.
- Full e2e (`E2E_PORT=4199 npx playwright test`, dist rebuilt first, on the final tree): **147 passed, 9
  skipped (the SHOTS-gated spec), 0 failed** (25.2 min). This covers purity (all samples), parity (mote,
  node and the new box), clearance (all three tests on both sizes), tests 11, 12 and 16, and the new disc
  test.

### New tests

- **src/scene/node/box.test.ts** (22). Bodies: one per cube, two for a crack cube, N0's equal to
  firstStack's. Births equal `cubeLanding` at 0.5. The layout packs as float32 from the one list. box()
  checks:
  - absent before its window and present after, on `nodeArrival`;
  - half there while its own cube's motes are landing;
  - scaled by show;
  - hi equal to its own stack's motes' hi in four states;
  - warmth on the crack cube's lips only;
  - normals turned by the yaw and of unit length;
  - whole cubes keep every point;
  - each lip keeps exactly crackSide's side, and the two lips tile the cube;
  - lips move to crackShift's positions while open and back to whole once fixed;
  - whole below 5 px of gap on screen, halfway at 7.5, open at 17;
  - opening exactly as the motes' crack does (nodeCrackOpen), through the fix.
  Shader checks: markers spliced; inputs ≤ 16; the fragment stage carries crack.glsl only; the crack
  constants equal crack.ts's and crack.glsl copies no literal; box.glsl times, lights and cracks by the
  node library's functions (its one smoothstep of its own is the on-screen opening). The palette is
  fenced to mote.frag.glsl. The halo uses nodeHaloNear and has no colour or lod of its own. The parity
  fields cover BoxOut exactly.
- **nodeSystem.test.ts**: six meshes; `net-boxes` has an instance per body, 24 vertices and 36 indices.
- **e2e/network.spec.ts, "a plain stack at the wide shot is a brick stack, not a disc"**, both sizes. At
  N9 (defect 0.89) it takes every lone plain stack. Lone means: clean, built, in front, its box hull's
  minimal circumscribed circle at least 8 CSS px in radius, wholly on the canvas below its top third,
  and with every other built stack's circle further than 1.2 × the two radii. For each such stack, at
  least 80 % of the pixels in its hull must be lit (more than 24 off the background on a channel), and
  at most 10 % of the rest of the circle (1.5 px margin off the hull). At least 2 stacks must be measured.

| | Base build (old round glow) | Now |
|---|---|---|
| phone R_b (r 22 px) | hull 45 % lit, ring 1 % (**fails hull**) | hull 95 %, ring 1.2 % |
| phone plan-7 (r 11 px) | hull 94 %, ring **74 %** (**fails ring**) | hull 99 %, ring 1.3 % |
| desktop R_b (r 45 px) | hull 23 % (**fails**) | hull 95 %, ring 0.3 % |
| desktop plan-7 (r 22 px) | hull 18 % (**fails**) | hull 96 %, ring 2.6 % |
| desktop code-59 (r 10 px) | hull 97 %, ring **88 %** (**fails**) | hull 100 %, ring 1.5 % |

  The helpers (convex hull, minimal enclosing circle, hull-and-ring count) are in e2e/pixels.ts. The
  stack-rectangle projection in network.spec.ts was split into `cameraAt` and `projectedCorners`, shared
  with the new test.

### TDD evidence, honestly

The e2e disc test came first. I ran it against the base build, with a log in place of assertions, and
the numbers above are that run: every stack it measured fails at least one of the two thresholds, so it
is RED on the old glow. GREEN is the run after the bodies. The box unit tests were written after box.ts,
but each pins a relation to the motes' own functions, not to box.ts's output. The parity mode was shown
to catch a 1 % jag change. Tests 11 and 12 went RED during the work and drove the two retunes: test 11
far, R0 on desktop, 35 changed px; test 12, phone 0 / 1 / 4 / 7 / 11 and desktop 2 / 14 / 16 across the
iterations.

## Instance and triangle counts (drawStats, both sizes alike, full budget)

Same at zoom-out 0.999, defect 0.89 and lesson 0.9:

| Mesh | Instances | Triangles |
|---|---|---|
| motes (the bike) | 100,000 | 200,000 |
| mote-threads | 100,000 | 200,000 |
| net-nodes | 75,994 (was 75,877; N0's motes) | 151,988 |
| **net-boxes (new)** | **2,388** | **28,656** |
| net-streams | 4,997 | 9,994 |
| net-halos | 346 | 692 |

`drawStats().triangles` is 791,330. The bodies are 28,656 of that (3.6 %). There are 2,388 bodies: one
per cube, plus one for each cracked stack's second lip.

## Look, phone first

Everything is in `shots/act2-cubes/` (gitignored). That folder holds every Act II beat's midpoint at
390×844 and at 1440×900 (`<beat>-<local>-phone|desktop.png`, 25 each), `phone-sheet.png` (montage, 7
across) and `desktop-sheet.png`. The before/after pairs are `before/`, `after/` and `pair-*.png`, side by
side. "ly-5 (N9)": ly-5's shot is N7 (distance 60); N9 is df-3 to df-5. So the pair is ly-5 as the beat's
midpoint, and `after/df-5-N9-*` adds N9 itself. I have no before for N9: I took the base build's stills
before changing anything, and only for the two named frames.

**Do the stacks read as little brick stacks at the wide shots?** Yes, on both sizes.

- ly-5 and fr-1 (wide): every code stack is a small glass brick pile with visible courses. Before, they
  were a bed of round blue blobs on a phone and faint speckle on a desktop. Plans and rules read as
  stepped brick pyramids.
- df-3 to df-5 at N9: the code layer reads as scattered bricks, not dots.
- At medium range (zo-2, ly-1 to ly-4) the stacks are translucent bricks with bright edges and motes
  speckled on and around them.
- Close up (df-1, df-2) C1's split top course shows the crack as a dark jagged gap with bright lips.
- tr-2 / fx-1: R0 close is a lit ember-white brick pyramid.

Where it reads less well:

- A stack seen exactly along its length reads as a column of stacked boxes, a "pillar". This is true to
  the geometry; it shows at zoom-out's end, bottom left on the phone.
- Lit stacks at the wide and reviewer shots are still round ember glows: the halo is now the lit
  stack's body from afar, by design, for test 12. So the twelve, and the reviewer's lit field, read as
  ember discs among blue bricks.

**Is N0 indistinguishable from its neighbours at zoom-out's end?** Yes in kind: the same body, the same
mote density, the same glow. At 0.999 it is a small 3-2-1 glass stack, mid-frame (phone y ≈ 480–560), with
its neighbours drawn alike. It is no longer large, solid and white. Before, it was the bike's 100k motes
as a dense, dimmed solid; now the bike's own draw is 0 from zoom-out 0.9. It is **not** the same size as
every neighbour: stacks nearer the camera at the bottom of the frame are larger. The camera is still the
close N2 (distance 8). That is Task 9's re-keyed powers-of-ten pull-back.

## Files changed

- New: `src/scene/node/` box.ts, box.glsl, crack.glsl, boxLayout.ts, boxAttrs.ts, box.test.ts,
  shaders/box.vert.glsl, shaders/box.frag.glsl.
- Changed: `src/scene/node/` birth.ts (palette, halo-near and box-crack constants), crack.ts (waves as
  data, crackLevel, CRACK_NORMAL, glslCrackConstants), node.ts and node.glsl (nodeSettle, nodeArrival,
  nodeCrackOpen, nodeHaloNear; node() calls them), nodeAttrs.ts (cubeLanding), nodeSystem.ts
  (net-boxes), shaderSource.ts (withBoxLibrary, withCrackLibrary), shaders/halo.vert.glsl;
  nodeSystem.test.ts and node.test.ts.
- Also changed:
  - src/parity: fields.ts (BOX_PARITY_FIELDS), parity.ts (?lib=box), shaders.ts (BOX_VERTEX);
    e2e/parity.spec.ts.
  - src/network: generate.ts (N0 in allocateMotes), lineage.ts, generate.test.ts.
  - src/timeline: keyframes.json (one key), keyframes.test.ts, networkKeys.test.ts.
  - e2e/network.spec.ts and e2e/pixels.ts.
  - docs/specs/2026-10-06-act-2-storyboard-and-network.md: a new "As built (Task 8)" under §12.

## Self-review

- The mirror pairs changed together. node.ts and node.glsl gained the same four functions, and node()
  calls them in both, with the output bit for bit the same (parity green). box.ts and box.glsl are new
  and parity-checked. crack.ts gained data and functions without changing a mote, because jag()'s
  arithmetic order is unchanged. I tried not to copy any timing, colour or crack logic: the halo's
  colour literals and its NEAR literal are gone too.
- Purity: everything the bodies use is a function of the attributes, the static texture, the clocks and
  the camera. The purity e2e passed at every sample.
- No essay words changed.
- Not done (YAGNI): no depth sorting (screen blend is order-independent), and no body for the feed or ring.
- Temporary scripts in shots/ (cubes-stills, cubes-ember, cubes-stats) are deleted. The `task19-*.mjs`
  files in shots/ are not mine and I left them. I stopped the preview server I started on 4199.

## Concerns

1. **The body's crack opens only by its size on screen** (`NODE_BOX_CRACK_PX` 5–10 CSS px). Without it,
   test 11's far half fails on desktop for R0 (35 > 20): a filled body makes a ~3.6 px gap read where
   sparse motes did not. Two consequences:
   - The split is camera-dependent, though pure.
   - From afar a rule's body paints over its motes' 3.6 px gap. I read that as the design's "invisible
     far" rather than as painting over the crack, but it is a ruling to confirm.
2. **From afar a lit stack's body gives way to its halo** (× (1 − hi · nodeHaloNear)), and the lit halo's
   alpha rose to 1.35. Both were needed for test 12. Lit stacks at wide shots are ember discs, not ember
   bricks. Close up the lit body is drawn in ember. If the author wants lit bricks at the wide shot too,
   test 12's ember measure needs rethinking: lit body edges add green and blue, which cut cores apart.
3. **Test 12 is still near its floor**: phone smallest 36 px against 30, as in Task 7. Any later look
   change may tip it.
4. **The bike still draws 200k instances (motes and threads) through all of Act II at `stage.motes` 0,**
   invisibly. Hiding the mote mesh at stage 0 would save most of a phone's frame. I did not do it: the
   brief limits this task to zoom-out's `stage.motes` key, and test 16 pins `instances.motes`. It is
   worth doing alongside the real-phone performance measurement.
5. **N0 is drawn like the others, but at zoom-out's end it is not yet the same size as every
   neighbour**: nearer stacks are larger. That is Task 9's camera.
