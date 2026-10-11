# The defect, from shape alone: a crack that reads as a crack

*Superseded by docs/specs/2026-10-07-galaxy-orbits.md revisions 4–6: the defect is a derp, a burst, a
morph and a scatter of a planet and its moons, and the stacks' crack is gone.*

*Status: design for review. Date: 2026-10-07. Answers the author's note on the defect close-up (df-1, df-2
of docs/specs/2026-10-06-act-2-storyboard-and-network.md §2.4), seen on a phone: "zoom in more on the
defect, fade the non-defective pieces out a bit more, rotate the camera a bit so we're not seeing it
head-on, it's not very obvious that it's a defect, make the crack look more like a crack (diagonal, zig
zag), and figure out how to make defective blocks look more defective from just the shape." Builds on
§3.3–§3.5, §3.7, §3.9, §11 "As built" and §12 of that document; nothing here changes the copy.*

## 0. What is wrong with the frame today, in one paragraph

Look at the author's screenshot and `shots/act2-keys-1/df-1-0.12-390x844.png`. The crack is a straight,
near-vertical, full-height bright line splitting the top cube into two equal halves, seen head-on
(bearing −10), among equally bright neighbours, with the cube about 60 px tall on the phone. That is
**exactly the vocabulary of the joints between bricks**: a joint is also a straight vertical line, also
full height, also drawn bright because two end faces are seen edge-on (§3.5 says so: "as the seams
between cubes already do"). In the screenshot the crack's line even continues visually into the joints
of the courses below, so the stack reads as *seven bricks instead of six*, not as *one broken brick*. The
crack is well drawn and invisible as a defect, because the stack's legitimate structure is made of the
same marks. Every change below follows from that: the defect must use marks **no joint ever makes**.

## 1. What makes a block look defective from shape alone

The constraints: no colour, no glow, no label (the ember comes at df-5; the prose uses no colour words);
it must read at a phone close-up where the cube is a hundred-odd pixels tall; it must vanish at fr-1
where the cube is two pixels tall (test 11's far half); the cube is a see-through cloud of points, so
*absence* of matter does not read (the spike's lesson, §3.5: a plain gap vanishes; motes must sit on the
break's own faces); and the audience is a developer reading to a child, so the mark should be one a child
already knows means "broken".

| Treatment | How it reads | Close (≈110 px cube) | Far (2 px cube) | Against the joints | Verdict |
|---|---|---|---|---|---|
| **Diagonal zig-zag crack**, wider at its mouth, tapering, wrapping over an edge onto a second face | The universal "broken" glyph: the broken-heart emoji, the broken-link icon, every cartoon of a cracked cup or wall is a zig-zag that runs *across* the thing, not along its grain (T3: drawing tutorials on cracks all start from "sharp zig-zag lines, then branches, tapering from the point of impact"; T4: the broken-heart glyph's crack is a zig-zag, recognised across every platform) | Yes: a diagonal, non-straight line across a brick is unlike anything else in the stack | Yes: a line a tenth of a pixel wide | Joints are straight, vertical, full-height, on the grid. A diagonal, kinked, tapering line that crosses a face and turns over the top edge cannot be a joint | **Primary** |
| **A displaced piece**: the half on one side of the crack sheared down or tilted a few degrees | Game damage-state practice: "silhouette first — the broken shape must still read from distance" (T3); a step in a top edge is read as a break before the line is | Yes: the top edge of the cube has a step; the crack is a *wedge*, open at the top | Yes: a 6° tilt of half a brick moves its corner 0.3 px at fr-1 | A joint never offsets the bricks' tops | **Secondary** (one transform; it also *gives* the taper for free, §2) |
| Chipped corner / missing cubelet | Reads in a solid drawing | No: a missing wedge of a see-through cloud is a slightly thinner cloud; the chip's new faces would have to carry motes, and then it is the crack treatment with less line | Yes | Fine | No |
| Whole cube tilted or sagging in its course | Reads as "mis-stacked", and the courses are already yawed and nudged by design (§3.3, "hand-stacked"), so a tilt is inside the stack's normal range | Weak | Yes | Ambiguous | No |
| Branching cracks, spalling, spider web | Realistic, but a web of lines on a cube this small becomes texture, and branches on a see-through cube cross the far face's traces | No (noise) | Yes | Fine | No; one short side branch at most, and not now |
| Hollow block, mirrored spiral (the spike's others) | Tested in the spike and rejected by eye; the author chose the crack | — | — | — | Settled (2026-10-05) |

**Chosen: the diagonal zig-zag crack with one tilted piece.** A crack is what the author chose and what the
copy says ("a defect" you can see "up close"), and these two marks together are what every drawing of a
broken brick uses: a kinked line across it and a step in its outline. Both are pure geometry of the
mote positions (the twin build of §3.5), so the fix still closes them by the existing `local`/`twin` blend
with no new shader step; both scale with the cube unit, so the same shape serves C1, C5 (code), R0 and R1
(rules); and both are sub-pixel at the wide shots. The camera change (§3) is what lets the crack be seen
across two faces, and the fade (§4) is what makes the cube the subject.

## 2. The crack's geometry

All in the crack cube's own frame (`Box`: x along its length L, y its height H, z its depth D; the +z
face is the front, the face the shot and the key light see; for C1: L 0.581, H 0.252, D 0.336 at u 0.42;
for R0: 1.481 × 0.660 × 0.880 at u 1.1; for a plain cube L = H = D = u). The shape is drawn at **the
scale `S = min(H, 0.55 L)`**: the face's height, or a little over half its length on a tall face, so the
bolt keeps its angles whether the piece is a brick or a cube (§6: offsets in L were fine on a brick and
flattened the bolt into a straight scratch on a cube). Every random draw is `hash01(node row,
SALT_CRACK_*)` (new salts in `src/math/salts.ts`; the node's row in the texture, which both mirrors
have), so it is deterministic from the node and the same on every load, in TypeScript and in GLSL. The numbers below are the ones the mock of §6 was judged on.

### 2.1 The path: a bolt, as a ruled surface x = X(y, z)

The crack is a surface through the whole piece, `x = p(y) + q(z)`, with `p` the trace on the front face
and `q` the drift of that trace across the depth. Because `p` and `q` are both polylines, the surface is
piecewise **planar** (on each y-segment × z-segment cell it is `x = a·y + b·z + c`), which §2.5 uses.

- **The front trace `p(y)`** is a **bolt**: four segments, top to bottom, through the vertices
  `(fraction of H from the top, x offset from the mouth in S)` = `(0, 0)`, `(0.3, 0.6)`, `(0.5, 0.15)`,
  `(0.78, 0.8)`, `(1, 0.45)`, the three inner ones jittered by ±0.06 S. The mouth is at the top edge,
  `x_t = (−0.4 ± 0.1) S` (left of centre, on the side the camera and the key light come from); the foot
  at the bottom edge, `x_b = x_t + 0.45 S`. So the line runs down-right, jogs sharply back, runs
  down-right again and turns in to the foot: the broken-heart glyph's crack, at the glyph's proportions.
  A straight chord would already be unlike a joint; the jog is what the eye names "crack", and at a
  phone's size it has to be big: §6 found kinks of ±0.05 L read as a scratch.
- **The top trace `q(z)`**, front edge to back edge, jogs the same way: `(D/2, 0)`, `(D/6, −0.25 S)`,
  `(−D/6, −0.05 S)`, `(−D/2, −0.35 S)` (z, x offset), drifting toward −x. The crack **wraps over the top
  edge onto the top face** as a second bolt, and the back face carries the front's profile shifted
  0.35 S left. (The spike's lesson about the front and back traces lining up was for the head-on camera;
  §3's three-quarter view separates them by parallax anyway, and the lips, not the gap, draw the line.)
- **Which side is which.** Piece A is the −x side (the larger piece, whose end face the camera sees);
  piece B is the +x side, a wedge narrower at the top. `crackSide` returns +1 for B.

### 2.2 The break: piece B leans out, and a hairline keeps the lips apart

In the twin build:

- **Piece B rotates about the z axis through its own bottom-outer edge** `(L/2, −H/2)` by **θ = 0.14 rad
  (8°)**, clockwise seen from the front: its top leans *out* (+x) and the mouth opens. Hinged there, B
  still stands on whatever it stood on (the course below, or the ground): nothing sinks into a neighbour,
  which a hinge at the crack's foot did (§6). The mouth corner rises by about 0.4 S · θ and moves out by
  H · θ (0.035 world on C1, 0.06 on a cube of 0.42: a 15–25 px overhang on a phone at §3's shot); the
  top edge shows a notch and a step, the silhouette of a break.
- **A hairline `g0 = 0.04 u`** splits the two lips along ±x on top of that (0.017 world at code), so the
  foot is never a point where both lips' motes coincide. The opening is then `g0 + θ·H` at the mouth
  (0.052 world on C1, 22 px on a phone at §3's shot) and `g0 + θ·(L/2 − x_b)` at the foot (0.029 on C1,
  12 px): **a wedge, open at the top, narrowing to the foot**, the width profile the note asked for.
- Every mote of the crack cube whose rest position is on B's side moves with B (rotated about the hinge,
  then +g0/2 along x); A's motes move −g0/2 along x. The person motes (role `person`) keep `twin =
  local` as now: they land on the whole cube as it closes under them.
- The **normals** of B's motes are rotated with it (`normalTwin`), so B's faces catch the key light a
  little differently from A's: the step in the top edge is also a step in brightness.

### 2.3 The lips: where the motes sit (the spike's lesson), and the density a close-up needs

- **A quarter of the cube's motes** move onto the two crack faces with the face's normal
  (`CRACK.faceShare` 0.2 → 0.25). A lip point is `(X(y, z) ± g0/2, y, z)` for A and B, B's then rotated
  with B; its normal is the local plane's gradient, facing into the gap, as `crackFacePoint` computes
  today.
- **Density follows the opening.** Sample the lip's height fraction with weight proportional to the
  local gap (linear from the foot's to the mouth's), by inverse CDF of a seeded uniform: the mouth carries
  about twice the foot's motes per unit height. The line then tapers in brightness as well as in width,
  which is how a drawn crack tapers (the tutorials' "thinner and fainter away from the impact").
- The top-face trace is drawn by the lips' top ends and by B's top-face motes, which move with B, so the
  top face shows a jogged seam with the step across it. No extra surface is needed.
- **Lighting.** The key light is from the upper front-left (`LIGHTING.keyDir ∝ (−0.4, 0.7, 0.6)`). With the
  crack running down-right, A's lip faces roughly +x (away from the key: fill only, ×0.45) and B's lip
  faces −x (toward it, up to ×1.3): **one bright lip beside one dim lip**, the chiaroscuro of a real
  crack, and the lips' brightness changes at each jog. `NODE_CRACK_FACE_GAIN` stays 1.3.
- **The crack cube must be sampled dense, on every hero.** This is the finding of §6 the design stands
  on: moving the camera from 2.6 to 1.6 spreads the crack cube over ten times the pixels, and at C1's
  ordinary density (about 1,300 of its 8,000 motes on the crack cube) the cube became dust and the crack
  vanished, lips and all. The rule heroes already solve exactly this (§11 "The look on a phone":
  `CRACK_DENSITY = 8`, each dense mote carrying an eighth of the light, the near gain bringing them to a
  plain mote's brightness close up, `denseCrack` in `nodeAttrs.ts`). **Extend `denseCrack` to every hero
  (C1 and C5 too)**: C1's crack cube then carries about 5,000 of its 8,000 motes (1,250 on the lips) and
  is a solid-looking cube at the close shot, while from afar its share keeps it no brighter than its
  neighbours. §12.1's box body will add a continuous skin to the same cube later; the density is what
  makes the crack read in the mote drawing alone, with or without the body.

### 2.4 The whole build, and the fix

Unchanged in kind: in the whole build every one of these motes is an ordinary surface point (`local`),
so the fix (§3.4 step 3, `v` 1 → 0 over the last half of the fix window) **leans B back in and slides the
lips shut** by the existing `mix(a.local, a.twin, v)`. Linear interpolation of an 8° rotation is a straight
path that stays within 0.7 % of the arc: no new step in node(), and node.glsl/node.ts are untouched by
§2. The pair that does change is crack.ts and its GLSL mirror crack.glsl (§2.5). The warm motes land on it
as it closes, as §3.7 says.

### 2.5 The cube's translucent body (§12), split along the crack

§12.1's bodies are in the tree (Task 8, in progress as this is written): a cracked stack's crack cube is
**two body instances, one per lip** (`BoxAttrs.side` ±1), each shifted half the gap off the plane while
the crack is open (`box.glsl` / `box.ts` step 3) and **cut by the fragment shader to its own side**
(`vSide · crackLevel(vQ) < 0` discards), through **`crack.glsl`, the GLSL mirror of `crackLevel` and
`crackGap` in `crack.ts`**, its constants generated from `CRACK`, held to the TypeScript by the box parity
mode (`?lib=box`, `e2e/parity.spec.ts`). So the surface already lives in both languages, and the design
goes into that pair rather than into a TypeScript clip:

- **`crackLevel(q, u)`** becomes `q.x − X(q.y, q.z)`: the bolt `p(y)` and the top jog `q(z)` evaluated
  piecewise-linearly from generated constants (the two vertex tables in S, `CRACK_BOLT_i`, `CRACK_TOP_i`)
  plus the node's jitters from `hash01(row, SALT_CRACK_*)`, with `S = min(H, 0.55 L)` from the box's size
  (both mirrors have `a.size`/`a.unit`). Its sign is still the side; the fragment cut is unchanged in form.
- **`crackGap(u)`** becomes the hairline `g0 = 0.04 u`.
- A new **`crackLipShift(q, side, u, v)`** replaces step 3's shift along the normal: side −1 (A) moves
  `−g0/2 · v` in x; side +1 (B) is rotated about `(L/2, −H/2)` by `θ · v` and moved `+g0/2 · v` in x. The
  body's normal on B turns with it. At v = 0 both are the identity, so the body closes with the motes.
- The motes' twin (`crackShift`, `crackFacePoint` in `nodeAttrs.ts`) is built from the same TypeScript
  functions, so the body's two halves and the motes' two pieces are the one surface and the one lean.
- The body draws no crack faces of its own: the opening is the absence of body between the halves, and
  the lip motes draw the line in it, as §2.3 says. (If the body ever wants lip quads, they are the
  surface's planar cells offset ±g0/2; not now.)
- Parity: the box cases already sample both lips of C1's and R0's crack cubes at many points; they hold
  the new `crackLevel`, `crackGap` and `crackLipShift` as they hold today's. `box.test.ts` gains: a point
  on B's bottom-outer edge does not move at any v; a point at B's mouth corner moves out by `H · θ · v`.

### 2.6 Why it vanishes from far away

At fr-1 (distance 62, widened to 86 on a phone) the screen holds about 11 px per world unit: the mouth
(0.052) is 0.6 px, B's overhang (0.035) 0.4 px, the hairline 0.2 px, and the lip motes are a quarter of
the cube's motes along a diagonal instead of a fifth along a vertical. The dense sampling moves nothing
from afar: it is what R0 already does at fr-1, inside test 11's far limit. If the far half (≤ 20 changed
pixels) trips, θ comes down first (6° still reads at the close-up), the lip share second, the hairline
last.

### 2.7 On a single cube, whatever stands round it

The author has since set aside the one-brick-deep wall form of the stacks, and the piece and system shape
are being redesigned. Nothing in §2 depends on the wall: the crack is defined in **one box's own frame**
(any L, H, D at any yaw), drawn at the scale `S` so a brick and a cube get the same bolt, and the mock of
§6 shows it on a lone cube as well as on C1's brick. What it does assume about the cube's neighbours,
and what to carry into the redesign:

1. **Nothing stands on the crack cube.** The mouth, the top-face bolt and B's notch are on the top face;
   a piece on top hides all three (and B's lean would have to lift it). Today this is §3.3's rule (the
   crack site is a top-course piece); the redesign must keep "a cracked piece has its top face free", or
   move the mouth to whichever face is free.
2. **Its front and top are the faces the shot sees.** The bolt is on +z and wraps onto +y; the hero's yaw
   is held within ±0.2 rad of the default bearing (`HERO_YAW`) so +z faces the camera and the key light.
   If the redesign turns pieces freely, the crack frame should be chosen per node from its yaw so that
   its +z is the face nearest the shot's bearing.
3. **The +x neighbour, if any, tolerates an overhang of `H · θ`** (0.035 world on C1; a joint between bricks is 0.05 u = 0.021, so about 1.7 joints). In a wall the top course
   had one brick, so there was none; in a tighter arrangement either leave `H · θ` of clearance on the
   crack cube's +x side or hinge B about its bottom-*inner* edge instead (the foot), accepting that its
   outer bottom corner then sinks `(L/2 − x_b) · θ` into whatever is below.
4. **The piece has a flat face at least `S` tall** for the bolt to cross: a sphere or a very flat slab
   would need the bolt re-fitted. A cube, a brick, a slab of aspect up to about 1 : 4 all work.
5. **The ground is below.** B leans about its bottom edge; it stands on whatever the whole cube stood on.

## 3. The shot

### 3.1 N8, re-aimed

| | Today (N8) | Proposed (N8) | Why |
|---|---|---|---|
| target | `crackCentre('C1')` | same | nothing stands above it (§3.3), so the band above is dark |
| bearing | −10 | **−35** | a three-quarter view from the front-left: the front face, the top face and the −x end face are all visible, so the crack reads across two faces (front and top) and the step in the top edge is a silhouette, not a line inside a face. The key light is from the same side, so the lit lip faces the camera |
| elevation | 16 | **22** (search 20–24) | enough tilt to see the top face and its second zig-zag; see §3.3 for why not more |
| distance | 2.6 | **1.6** | the cube goes from ≈60 px tall on a phone to ≈105 px tall and ≈230 px long (desktop: ≈215 × 475 px); the mouth is ≈17 px wide on a phone, the foot's hairline ≈2 px. The stack's bottom course runs off both sides of a phone, which is what a close-up should do: the cube is the subject, the neighbours say "in a stack" |
| fov | 36 | 36 | |
| frame | 1 | 1 | the target at 76 % of a phone's height |

### 3.2 The move: "Come closer" under its own line

Today the dive crosses the band during the page turn and df-1 "comes up already close" (§11), so the
line is narrated over a still camera. Proposed:

- The dive (`NET_MOVES.dive`) keeps its timing (far 0.9375 → defect 0.0208, outCubic, through the page
  turn) but ends at a new **N8a**: the proposed bearing and elevation at **distance 2.6** (the near stop,
  about today's size). `diveOver` turns to bearing −35 too, so the drop comes down on the final bearing.
- A new move **`pushIn`: N8a → N8 over defect 0.04–0.20, inOutCubic**, a straight push along the line of
  sight (bearing, elevation and target fixed, distance 2.6 → 1.6). df-1 is up from 0 (full ink by 0.02)
  and dims at 0.24; the scene's stop (one per scene, at its end: the auto-advance holds just before df-2
  comes up) is at rest because the push ends at 0.20. "Come closer" is then literally what the camera is
  doing while the line is read; "Up close, you can see it" (df-2, 0.24) arrives on the held close shot.
- The pull-out (`NET_MOVES.pullOut`) starts from the new N8 at 0.4392, as now, through `diveOver`.
- The focus fade (§4) rides the same 0.04–0.20.

### 3.3 Clearance, reasoned (the test is the arbiter)

The text band's rule is the clearance test: the visible machine's top ≥ 8 px under the panel's bottom
at every sample of a page's full ink, both sizes. For this shot the things that could stand in the band
are not the stack (nothing is above the crack cube, and the stack only grows *about the target* during a
push along the line of sight) but the **far code layer on the horizon** and **a far plan over it**.

- With `frame` 1 the target sits at 76 % of the height on a phone (v = −0.52 in half-heights), 78 % on
  desktop (−0.56). A direction at angle θ above the optical axis lands at `v = v_t + tan θ / tan(fov/2)`.
  The portrait rig widens a phone's fov 36 to 48.6 (√1.93); desktop keeps 36.
- **The horizon** (the far code stacks, whose tops are within ±1° of level from a camera 0.6 above the
  crack cube) is at θ = elevation. At 22°: phone v = −0.52 + 0.404/0.451 = 0.38, i.e. 31 % from the
  top; desktop v = −0.56 + 0.404/0.325 = 0.68, 16 % from the top. df-1's panel on the phone is two
  lines, bottom ≈ 18 %; on desktop one line, ≈ 11 %. Both clear, desktop by 5 %. **At 26° and above the
  horizon enters the desktop band; at 16° (today) it sits at mid-screen, which is why the screenshot's
  background is a dim smear across the middle.** So elevation 20–24, not more.
- **The frame's top edge** is at θ_top = atan((1 − v_t) tan(fov/2)) above the axis: 34.4° on the phone,
  26.9° on desktop. At elevation 22 that is 12.4° (phone) and 4.9° (desktop) above level. A plan at
  height 7 (6 above the camera) is in the frame only if nearer than 6/tan 12.4° = 27 units horizontally
  on the phone (none from C1 at (−4, 5): the plan layer's extent is 18) and 70 on desktop (none). The
  "far plan in a phone's band" that pushed today's N8 from bearing −20 to −10 was at elevation 16 (top
  edge 18.4° above level, plans within 18 units in frame). Elevation buys the bearing freedom.
- **The push-in changes none of these angles** (bearing, elevation and the lens shift are fixed), so if
  N8a clears, every frame of the push clears, and N8 too. The one thing that grows is the stack about
  the target: the crack cube's top edge rises to 76 % − 105/2 px ≈ 70 % on the phone. Nothing else of
  C1 is above it.
- **The camera's own position** at N8: target + 1.6 × (−0.53, 0.37, 0.76) = about (−4.9, 0.85, 6.2),
  2.3 on a phone; C1's radius is 0.97 and its nearest neighbour born by df-2 (growth ≤ 0.32) is 3.7
  away (B2, C3, C8); the fillers 2.1 away (code-67, code-68) are born at 0.36, after the pull-out. The
  camera stands in the dark.

If the test still finds a sample, move elevation first (within 20–24), then bearing (−30 to −40), then
distance up to 1.8; never below 20 on elevation (the top face goes), never back toward head-on.

## 4. Fading the non-defective pieces

**What.** From df-1 0.04 to 0.20 (with the push-in), every mote that is not on the crack cube of the stack
the camera is on dims to **0.3** of its brightness (`NODE_FOCUS_FLOOR = 0.3`): the rest of C1, and every
other stack and stream. The crack cube — its builders, its lips, and the person motes landing on it under
df-2 — stays at 1. It holds through df-2 and comes back to 1 over the pull-out, 0.4392 → 0.4808, so
"Now step back" (df-3, up at 0.46, full ink 0.48) opens on a network at its ordinary glow. 0.3, not off:
the cube must still read as the top of a stack, and the neighbours as the same material gone quiet.

**Mechanism: one leaf, one point, a per-mote term in the mirror pair.**

- A new `SceneState` leaf **`net.focus`** (0..1, default 0, so every existing frame is unchanged),
  keyed in keyframes.json: `defect@0.04` 0 → `defect@0.20` 1, hold, `defect@0.4392` 1 → `defect@0.4808`
  0. (The existing `net.highlight` cannot do this: it is the ember, which must not appear before df-4.)
- Two uniforms: `uFocus = net.focus`, and **`uFocusAt`**, the camera's world-space target, which the
  CPU already computes from state each frame (the bike's whole anchor, `world = centre + v × radius`; the
  function in `cameraRig.ts`). A pure function of scroll, like everything else.
- In `node.glsl` and `node.ts`, **`nodeFocus(centre, radius, role, focusAt, focus)`**: the mote's stack
  is *the focused stack* if `|centre − focusAt| < radius` (the focus point is a crack cube's centre, which
  is always inside its own stack's bounding radius and never inside another's: stacks do not overlap);
  on the focused stack a mote **on the crack cube** keeps 1 and every other mote takes the floor; on any
  other stack every mote takes the floor. `brightness *= mix(1, that, focus)`. Called from the vertex
  shader next to `nodeNearGain`, exactly as that is, and from the stream and halo shaders with the
  floor alone (a stream has no cube).
- "On the crack cube" needs one bit the attributes do not carry: a builder on the crack cube has role
  `builder` today. Add **`NodeRole.CrackCube = 3`** for a builder whose rest position is on the crack cube
  (`nodeAttrs.ts` knows which box it drew), so roles 1, 2 and 3 are "the cube" and 0 is "the rest".
  node() treats 3 as it treats 0 everywhere else (one `role == ROLE_BUILDER || role == ROLE_CRACK_CUBE`
  in the two places that test for builder, and the person test is unchanged).
- Why not a radial falloff from the focus point: the course under the crack cube is 0.25 below it and
  its bricks' near ends are inside any radius that keeps the cube's own corners lit (0.36 from its
  centre), so a radius cuts through the course below with a gradient; the membership bit draws the
  line where the cube ends. Why not a per-node `focusAt` in the texture: the texture is full (T3.w is
  the stream row), and a clock-per-node is more state than one leaf and one point.
- The §12 body shader applies the same term (it reads the node texture too); the two pieces of §2.5 count
  as the cube.

**Later, the same leaf** (not in this task's scope, one key pair each): the wordless second fix on C5
(spread 0.44–0.48 up, 0.55–0.58 down), tr-1's hold on R0 (trace 0.30–0.34 up, out with the fan-out at
0.56–0.60), and the fix close-ups N15′/N17. Each wants the same "the cube is the subject" reading; each
is a keyframe change only.

## 5. What changes, where, and the tests

### 5.1 Code

| File | Change |
|---|---|
| `src/scene/node/crack.ts` + **`crack.glsl` (the crack's parity pair)** | `crackLevel(q, u)` → `q.x − X(q.y, q.z)` (the bolt and the top jog at scale S, from the generated vertex tables and the node row's jitters), `crackGap` → the hairline, new `crackLipShift(q, side, u, v)` (A's half-hairline shift; B's lean about its bottom-outer edge plus its half), `crackSide`/`crackShift`/`crackFacePoint` on top of them with lip points weighted toward the mouth and B's normals turned. `CRACK` gains `lean` (0.14 rad), `hairline` (0.04 u), the bolt and top-jog tables and the jitter (0.06 S); `normal`, `jag`, `gap`, `waves` go. `glslCrackConstants()` emits the tables. |
| `src/scene/node/crack.test.ts`, `box.test.ts`, the box parity cases | Determinism by node row; every twin point of A is its rest point shifted −g0/2 in x, every twin point of B its rest point rotated by θ about `(L/2, −H/2)` then shifted +g0/2; the opening is `g0 + θ·H` at the mouth and `g0 + θ·(L/2 − x_b)` at the foot; every lip point satisfies `x = X(y, z) ± g0/2` before B's lean; the front trace has the bolt's three turns (right, back, right); the top trace reaches the back edge 0.35 S left of the mouth; B's bottom-outer edge is fixed at every v; the whole/twin displacement of every mote is under 0.2 u (the far-invisibility bound); the box parity cases on C1's and R0's lips pass against the new GLSL. |
| `src/scene/node/box.glsl` + `box.ts` | Step 3 calls `crackLipShift` instead of shifting along a normal; B's normal turns with it. |
| `src/math/salts.ts` | `SALT_CRACK_MOUTH`, `SALT_CRACK_KINK` (one salt, the vertex index folded in), spliced into the GLSL as the other salts are. |
| `src/scene/node/nodeAttrs.ts` | **`denseCrack` → every hero** (`n.hero && n.cracked`, not only rules): C1 and C5 get the 8× crack cube with the 1/8 share (§2.3). Role `CrackCube` for builders on the crack cube; lip sampling by the gap-weighted CDF. |
| `src/scene/node/birth.ts` | `NODE_FOCUS_FLOOR = 0.3`; `NodeRole.CrackCube = 3` (the GLSL `ROLE_CRACK_CUBE` is generated). |
| `src/scene/node/node.glsl` + `node.ts` | **The parity pair**: `nodeFocus(...)` added to both, step for step; the two builder tests accept role 3. node() itself is otherwise unchanged. |
| `src/scene/node/shaders/node.vert.glsl`, `stream.vert.glsl`, `halo.vert.glsl` | `uFocus`, `uFocusAt`; brightness × `nodeFocus(...)` beside `nodeNearGain` (streams and halos: the floor alone). |
| `src/scene/node/nodeSystem.ts` (or wherever the node uniforms are set) | `uFocus` from `net.focus`; `uFocusAt` from the composed camera's world target each frame. |
| `src/timeline/sceneState.ts` | `net.focus` (default 0) in the interface, `defaultSceneState`, `SCENE_STATE_PATHS`; the paths test picks it up. |
| `src/timeline/netShots.ts` | N8 → (−35, 22, 1.6, 36, 1); N8a (−35, 22, 2.6); `diveOver` bearing −35; `NET_MOVES.dive` ends on N8a; new `NET_MOVES.pushIn` (N8a → N8, defect 0.04–0.20, inOutCubic, 12 keys); `pullOut` starts from the new N8. |
| `src/timeline/keyframes.json` | The regenerated dive, push-in and pull-out camera keys (`splineKeys`), `camera.frame` unchanged, the four `net.focus` keys. |
| `src/timeline/netShots.test.ts`, `networkKeys.test.ts` | The shots table and the generated moves hold to the keyframes (test 8); `net.focus` is 0 outside defect 0.04–0.4808 and 1 over 0.20–0.4392; the scene's stop is at rest (the push ends at 0.20, before df-2 at 0.24). |
| `docs/specs/2026-10-06-act-2-storyboard-and-network.md` §2.4, §3.5 | The storyboard row for df-1 (the push-in; the camera "closes on the cube" is now true of the frame), §3.5 replaced by a pointer here. |

### 5.2 Tests that move

- **Test 11 (`e2e/network.spec.ts`), near half.** C1's close sample moves from `defect@0.12` (mid-push
  now) to **`defect@0.22`**, the held close shot. The thresholds rise with the picture: the tilt moves
  about two fifths of 8,000 motes over a cube ten times the area it had, so **`NEAR_MIN` 400 → 1,500 on
  the phone, 900 → 4,000 on desktop** (set from the first green run at about half the measured count,
  as the current values were). R0's and R1's samples and limits are unchanged in kind (their shots are
  not touched here), but their cracks change shape; expect their counts to rise and leave the limits.
  The state merge still holds `highlight` at 0; it should hold **`focus` as sampled** (both frames get
  it, so the floor cancels).
- **Test 11, far half.** Unchanged: ≤ 20 changed pixels at fr-1, rect ≥ 100 px, ≥ 20 drawn. §2.6 says
  why it should still pass; θ is the first knob if not.
- **Clearance (`e2e/clearance.spec.ts`).** No change to the test; it is the arbiter of §3 (N8a, the
  push, N8, the re-bearinged dive and pull-out), both sizes, and of the fix's warm motes at C1's fix.
- **Purity and reduced motion.** The purity set already samples defect 0.68; add **defect 0.12**
  (mid-push, mid-fade). Reduced motion needs nothing: scrubbed, no second path.
- **Parity (`e2e/parity.spec.ts`, `?lib=node`).** `nodeFocus` is in both mirrors; the page's sampled
  attribute set includes role-3 motes.
- **node.test.ts.** The two-shares test on R0 (`r0.glow * share * nodeNearGain(...)` → 1) runs on C1 and C5
  too, and `denseCrack` is true for all four heroes. A `nodeFocus` describe like `nodeNearGain`'s: 1 on the crack cube of the focused
  stack, the floor elsewhere, 1 everywhere at focus 0; the constants test picks up `NODE_FOCUS_FLOOR`.
- **Stills.** `shots/` regenerated for df-1, df-2 (both sizes) for the author.

### 5.3 Tasks

1. **The crack's shape** (`crack.ts` and `crack.glsl` together, `box.glsl`/`box.ts` step 3, salts,
   `nodeAttrs.ts`'s dense crack cube on every hero, lip sampling and the `CrackCube` role, `birth.ts`, their
   tests and the box parity run; the `role` acceptance in both node mirrors). The picture changes at every
   existing shot. Ships with test 11's new thresholds. A day.
2. **The shot and the push-in** (`netShots.ts`, the regenerated keys, the shots and moves tests, the
   clearance run on both sizes, the stills). Searched with the clearance measure first, as §11's moves
   were. Half a day, most of it the search.
3. **The focus** (`net.focus`, the uniforms, `nodeFocus` in the parity pair, the vertex shaders, the four
   keys, purity sample, parity). Half a day. Independent of 1 and 2; land after 2 so the keys refer to
   the final push-in times.

§2.5 rides on §12's Task 8, which is in the tree: Task 1 here lands after it, on its crack pair.

## 6. Mock frames, and what they changed

`<scratchpad>/defect-mocks/defect-mocks.html`
draws point clouds at 390 × 844 with the rig's framing (frame 1, the portrait widening, the key light's
Lambert, fill and rim, screen blending) from seeded surface points; the rendered sheet is
`…/defect-mocks/shot5.png` (four panes, left to right): **today** (C1's six real bricks, N8 as it is, the
vertical jag), **proposed on C1** (§3's shot, §2's crack, the crack cube 8× dense, the rest at 0.3),
**proposed on a lone cube** (0.42 a side, 5,000 motes, the same shot) and the lone cube from bearing −25,
elevation 24. It is a static drawing, not the renderer: the mote look is approximate and the numbers are
the design's, not a measurement. The "today" pane matches the real still (a bright vertical line that
reads as a joint), which is what calibrates the rest.

Four renders, each changing the design (`shot2`–`shot5.png` beside it):

1. At the proposed shot with C1's ordinary density the crack cube was **dust**: no cube, no crack. Zooming
   in dilutes a fixed mote count. Fix: the dense crack cube on every hero (§2.3), which R0 already has.
2. With density, a ±0.05 L zig-zag read as a **straight scratch** with two parallel streaks (the lips).
   Fix: the bolt, with jogs of 0.45 S (§2.1); lip share a quarter; a larger wedge.
3. On a lone cube the bolt, scaled by L, flattened again (a cube is no wider than it is tall), and the
   hinge at the crack's foot sank B's outer corner into the ground. Fix: the scale `S = min(H, 0.55 L)`
   and the hinge at B's bottom-outer edge (§2.2).
4. All four panes read as a broken piece: a bolt-shaped bright crack, a bright lip beside a dim one, a
   wedge open at the mouth, a notch and a step where B leans out. The C1 pane reads best from −35 / 22;
   on the lone cube −25 / 24 shows the top-face bolt a little more. The shot stays as §3 says, with
   elevation searched over 20–24 by the clearance test.

## 7. Sources

T1: the files named above; the stills in `shots/act2-keys-1/` and the author's screenshot. T3: drawing
tutorials on cracks and broken glass (easydrawingguides.com, "sharp zig-zag lines … then branch … taper",
<https://easydrawingguides.com/?p=2614813>; nimss.org on cracked walls, "sharp, angular breaks" in
masonry vs "meandering lines" in plaster,
<https://new.nimss.org/article/the-art-of-realism-how-to-draw-a-cracked-wall-like-a-pro>); game-art
practice on destructible props, "silhouette first — the broken shape must still read from distance",
<https://app.studyraid.com/en/read/100746/4510887/maintaining-visual-fidelity-in-a-destructible-world>.
T4: the broken-heart glyph (U+1F494), a zig-zag crack across the heart, recognised across platforms,
<https://1000logos.net/broken-heart-emoji/>.
