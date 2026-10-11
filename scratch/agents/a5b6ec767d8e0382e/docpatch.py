import sys

p = sys.argv[1]
lines = open(p).read().split("\n")

# 1. §2.0-§2.3: lines 50..115 (1-based) replaced.
new_s2 = r"""All in the crack cube's own frame (`Box`: x along its length L, y its height H, z its depth D; the +z
face is the front, the face the shot and the key light see; for C1: L 0.581, H 0.252, D 0.336 at u 0.42;
for R0: 1.481 × 0.660 × 0.880 at u 1.1; for a plain cube L = H = D = u). The shape is drawn at **the
scale `S = min(H, 0.55 L)`**: the face's height, or a little over half its length on a tall face, so the
bolt keeps its angles whether the piece is a brick or a cube (§6: offsets in L were fine on a brick and
flattened the bolt into a straight scratch on a cube). Every random draw is `hash01(node seed,
SALT_CRACK_*)` (new salts in `src/math/salts.ts`), so it is deterministic from the node's seed and the
same on every load. The numbers below are the ones the mock of §6 was judged on.

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
  makes the crack read in the mote drawing alone, with or without the body."""
assert lines[49].startswith("All in the crack cube's own frame"), lines[49]
assert lines[115] == "", lines[115]
assert lines[116].startswith("### 2.4"), lines[116]
lines = lines[:49] + new_s2.split("\n") + lines[115:]
s = "\n".join(lines)

# 2. §2.4: the rotation is 8°.
s = s.replace(
    "**slides B back up and the lips\nshut** by the existing `mix(a.local, a.twin, v)`. Linear interpolation of a 6° rotation is a straight\npath that stays within 0.4 % of the arc",
    "**leans B back in and slides the\nlips shut** by the existing `mix(a.local, a.twin, v)`. Linear interpolation of an 8° rotation is a straight\npath that stays within 0.7 % of the arc",
)
assert "leans B back in" in s

# 3. §2.6 rewritten and §2.7 added.
i = s.index("### 2.6 Why it vanishes from far away")
j = s.index("## 3. The shot")
new_26 = r"""### 2.6 Why it vanishes from far away

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
3. **The +x neighbour, if any, tolerates an overhang of `H · θ`** (0.035 world on C1, less than a joint
   of 0.05 u is wide … no: 0.021 at code, so the overhang is about 1.7 joints). In a wall the top course
   had one brick, so there was none; in a tighter arrangement either leave `H · θ` of clearance on the
   crack cube's +x side or hinge B about its bottom-*inner* edge instead (the foot), accepting that its
   outer bottom corner then sinks `(L/2 − x_b) · θ` into whatever is below.
4. **The piece has a flat face at least `S` tall** for the bolt to cross: a sphere or a very flat slab
   would need the bolt re-fitted. A cube, a brick, a slab of aspect up to about 1 : 4 all work.
5. **The ground is below.** B leans about its bottom edge; it stands on whatever the whole cube stood on.

"""
s = s[:i] + new_26 + s[j:]
# tidy the slip in item 3 of 2.7 (the overhang against the joint width, computed cleanly)
s = s.replace(
    "(0.035 world on C1, less than a joint\n   of 0.05 u is wide … no: 0.021 at code, so the overhang is about 1.7 joints)",
    "(0.035 world on C1; a joint between bricks is 0.05 u = 0.021, so about 1.7 joints)",
)
assert "about 1.7 joints)" in s

# 4. §5.1 rows and Task 1.
s = s.replace(
    "| `src/scene/node/nodeAttrs.ts` | Role `CrackCube` for builders on the crack cube; lip sampling by the gap-weighted CDF. |",
    "| `src/scene/node/nodeAttrs.ts` | **`denseCrack` → every hero** (`n.hero && n.cracked`, not only rules): C1 and C5 get the 8× crack cube with the 1/8 share (§2.3). Role `CrackCube` for builders on the crack cube; lip sampling by the gap-weighted CDF. |",
)
assert "`denseCrack` → every hero" in s
s = s.replace(
    "- **node.test.ts.** A `nodeFocus` describe like `nodeNearGain`'s",
    "- **node.test.ts.** The two-shares test on R0 (`r0.glow * share * nodeNearGain(...)` → 1) runs on C1 and C5\n  too, and `denseCrack` is true for all four heroes. A `nodeFocus` describe like `nodeNearGain`'s",
)
s = s.replace(
    "1. **The crack's shape** (`crack.ts`, salts, `nodeAttrs.ts`'s lip sampling and the `CrackCube` role,\n   `birth.ts`, their tests; the `role` acceptance in both mirrors).",
    "1. **The crack's shape** (`crack.ts`, salts, `nodeAttrs.ts`'s dense crack cube on every hero, lip sampling\n   and the `CrackCube` role, `birth.ts`, their tests; the `role` acceptance in both mirrors).",
)
assert "dense crack cube on every hero" in s

# 5. §6.
i = s.index("## 6. Mock frames")
j = s.index("## 7. Sources")
new_6 = r"""## 6. Mock frames, and what they changed

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

"""
s = s[:i] + new_6 + s[j:]
open(p, "w").write(s)
print("ok")
