# Act II: the form of a piece of work, and the form of the system (options)

*Status: options for the author, with a recommendation. Date: 2026-10-07. Follows the first look
(docs/specs/2026-10-06-act-2-storyboard-and-network.md §12) and the author's second look the same day.
The words (docs/script/act-2.md, draft 3) are treated as fixed; one option below would need a copy
edit and says so. Mock frames: §6.*

## 0. What the author said, and what it is a reaction to

> I don't like the shape of the overall system, I also don't like the shape of what look like flat
> triangle walls. Let's figure out what we can do instead.

> Yes each stack being a brick wall one brick deep looks really boring and cheap, and why walls. The
> overall system doesn't look like disks to me, middle and bottom blurry as heck, top half just looks
> like a bunch of misshapen walls strewn about.

Earlier the same day: the bike stack is huge compared to the others; the zoom-out should feel like
street → earth → solar system → galaxy; the other things are really small, are they all dots,
shouldn't we have some more square configurations.

Four causes, all in the built form, none in the story:

1. **A stack is a wall.** `src/network/cluster.ts` lays every course as one row of bricks along the
   stack's x (`COURSES`: 3, 2, 1 for six cubes; 5, 4, 4, 3, 2 for eighteen), so a stack is one brick
   deep and narrows upward: a stepped triangle seen from the front, a line seen from the side. With
   a uniform random yaw per stack, the top layer is six such triangles at six angles: "misshapen
   walls strewn about".
2. **The system is a landscape shape on a portrait screen.** Three discs of radius 7 / 18 / 26 at
   y 14 / 7 / 0: fifty-two units wide and eighteen tall, 2.9 : 1. A phone's picture, under the text,
   is about 390 × 490 px, 0.8 : 1. Every wide shot therefore stands far off and nearly level (§3.9),
   the three layers interleave into one blob, and any move between a side view and an overhead view
   drags the upper layers through the text band (§11 "As built", Task 5's page-turn moves).
3. **The far read is a round glow.** Past ten pixels a stack's body is the far-glow impostor (§3.8),
   and a lit stack adds an ember halo. Two soft discs per stack, overlapping their neighbours': the
   "blurry as heck" middle and bottom in the author's third screenshot are nothing but halos. The
   motes themselves, at a hundred and twenty per code stack, are a speckle that reads as dots.
4. **The first stack is drawn differently** from everything else (a hundred thousand motes, solid
   faces) and the camera never leaves it (§12), so it looks special.

§12 already answers 4 and half of 3 (a cube body per cube, Task 8; the overhead pull-back, Task 9).
This document answers 1 and 2, and finishes 3: **the round glow goes entirely.** Nothing in the
network is a disc. A stack's body at every distance is its cubes; a lit stack is its cubes in ember
with a brighter edge; the twelve are counted as twelve crisp shapes, not twelve blurs.

### What any form must still carry

Taken from the storyboard §2 and the script; the tables in §2 and §3 below show each option against
them.

- Three layers that read as **top / middle / bottom** on screen ("At the top… In the middle… At the
  bottom…", "Down here", "one place at the top", "The higher up a thing sits…"). A form that needs
  other words says which, and the recommendation prefers forms that keep them.
- **Lineage visible as streams** (who was built from what), running down the whole way at ly-5,
  and one stream running **up** at up-1.
- **One piece of code with a crack seen close** (df-1), fixed close (df-2); the crack site clear of
  the band at frame 1.
- **Exactly twelve** defective pieces countable from a wide shot (df-5): three plans and nine code,
  with the fixed one dark among them.
- A **reviewer** visiting new pieces in turn (re-1..3) and fed by a stream from the top.
- The **climb** back up the lit lineage to one rule (tr-1..2), the fan-out from it, the two fixes,
  new clean work, the **sweep** top to bottom (fx-1..4).
- The **first piece is the bike's six cubes**; the zoom-out is a powers-of-ten pull-back that ends
  with it indistinguishable among many (§12.2); growth never stops under the text.
- **Portrait first:** every shot frames under the band on 390 × 844 without the camera fighting it.

### Two principles that fall out of the diagnosis

- **Screen-vertical order should equal layer order from every camera the act uses.** The disc form
  breaks this: overhead, the layers are concentric; side-on, stacked. Every transition between those
  two readings is a band crossing. A form in which the rules are the topmost thing on screen from
  overhead *and* from the side has nothing to drag through the text.
- **Frame first, then build.** A stack is born on the growth clock, in place. If the camera reaches a
  wide frame *before* the stacks in its upper part are born, nothing ever moves across the band:
  the stack appears where the frame already had room for it. The rules' births (R_a at 0, R0 at
  0.05, R_b at 0.09) can slide later into zoom-out at no cost to the story; this is cheaper than
  any page-turn move and reads as "the agents build all day".

## 1. The usable frame, in numbers

390 × 844 portrait, text from 7 vh, the scrim to 42 svh. The wide-shot target lands at 62 % of the
height (`FRAMING.portrait.wide`), so a wide frame has 20 % of the height (about 170 px) between the
band's practical edge (around 42 %) and the target, and 38 % (320 px) below it. The picture that
fits with room is about 0.8 : 1 (a little taller than wide), with its **heaviest part low**. A form
that is wider than tall wastes the screen; a form whose top is narrow and whose base is broad and
near sits in it naturally.

## 2. The shape of one piece of work

All four keep `Cluster`'s contract (`boxes`, `crackBox`, `radius`, `height`, `area`) so
`generate.ts`, the node set and the reflow consume them unchanged; the crack site stays "the
top-front cube" (nothing above it, its +z face toward the reader and the key light). All four draw
unit cubes (`u` by layer: 0.42 / 0.65 / 1.1, a joint of 0.06 u) on an integer grid, so a cube is a
cube from every side: no brick is ever longer than it is deep. Yaw is drawn from ±0.2 rad, not
uniform, so stacks sit roughly square to the world and to each other (the "strewn about" read came
from the uniform yaw as much as from the walls).

| | P1 The crate | P2 The cube of cubes | P3 The cairn | P4 The pillar |
|---|---|---|---|---|
| **Pitch** | A square footprint (2 × 2 for code and plans, 3 × 3 for rules), courses filled whole from the bottom, the last course partial, corners first. A squat solid block with a step on top: a crate on a dock. | The smallest near-cube that holds the count (2 × 2 × 2, 2 × 3 × 2, 3 × 3 × 3) with the surplus bitten out of its top corners and edges. One big cube made of small ones: the most literally "square" option. | Accretion: cubes added one at a time, face to face, supported from below, preferring shared faces and low height, with a random tie-break. A lumpy hand-piled heap; no two alike. | A 2 × 2 footprint at every layer, courses filled whole; rules are tall (five or six courses). A stack in the plain sense: a tower of crates. |
| Code (5–7) | 2 × 2 base + 1–3 on top | 2 × 2 × 2 less 1–3 bites | a low lump, 2 courses | 2 × 2 + 1–3 |
| Plan (9–12) | 2 × 2 × 2 + 1–4 | 2 × 3 × 2 less 0–3 | a lump, 2–3 courses | 2 × 2 × 2 + 1–4 |
| Rule (16–22) | 3 × 3 × 2 less 0–2, or + up to 4 | 3 × 3 × 3 less 5–11 | a broad low lump, 2–3 courses | 2 × 2 × 4–5 + rest |
| **Reads from afar as** | a square with a notch | a square | a blob with corners | a short vertical bar (code a square) |
| **Layer told by** | size and a broader rule (3 × 3) | size; the rule is a true cube | size only | size and height: rules are tall |
| **Crack site** | the front cube of the top course | a top-front cube (never a bitten one) | the top-front cube of the highest course | the front cube of the top course |
| **First stack (six)** | 2 × 2 + 2: a crate with a step | 2 × 2 × 2 less two corners | a six-cube lump | same as the crate |
| **Variety** | the partial course and its rotation; counts | the bite pattern; counts | every stack different | counts and height |
| **Phone, at the wide shot** | a crisp square-ish silhouette at 6–10 px, the rule a bigger square | the crispest; rules read as cubes at 10 px | reads as a lump; at 6 px not distinguishable from P1 | code squares; plans and rules as short bars, which read as "stacks" but also as the walls' silhouette from the side |
| **Risk** | plans and code look alike but for size (acceptable: the layers' heights tell them apart) | monotony: every piece the same cube; the "built one cube at a time" story reads less because a cube arriving at a notch is a small event | can produce near-walls or flat pallets (the mock's rule is a slab); needs a compactness score tuned per layer; the hardest to make the reflow target constant and pleasing | the rule's tallness fights the band in the rule close-ups (N15, N17 at frame 0.75 already had to back off) |
| **Code cost** | `cluster.ts` rewritten around a cell grid (~120 lines), `cluster.test.ts`, `firstStack()` and the reflow constants in `src/scene/mote/stack.ts` regenerated (the bike's six cubes change shape: parity test re-pinned), `samplePart`-style surface sampling unchanged (boxes are boxes) | same, plus a bite rule that never removes a supporting cube | same, plus the accretion scorer and a test that no cluster is a wall (max dimension ≤ 2 × min) | same as P1 |

The mock `pieces-*.png` frames show each at medium range (code, plan, rule) and a row of code pieces
far behind.

## 3. The shape of the whole system

Coordinates as the storyboard's: y up, origin at the first stack, +z the side the key light is on
and the default bearing looks from (the reader's side).

### S1 The column

**Pitch.** Keep three layers on one axis but make the form portrait: tight horizontal extents (rules
within 3, plans within 7, code within 11) and tall gaps (y 0 / 13 / 26), each layer a thick slab (code
±3 in y) rather than a disc. A narrow tower of three clouds, few and big at the top, a dense swarm at
the foot, streams falling the length of it. The cheapest change: constants in `LAYERS`, the scripted
places, and the shots.

| Beat | How it reads |
|---|---|
| zo-1/2 (zoom-out) | From overhead the plans and rules sit on the axis *above* the bike: the pull-back flies through the plan slab and the rule slab, or veers off-axis and becomes a side pull-back, which is the band fight of §11. Frame-first-then-build helps (the rules can be born after the frame is set) but the camera still has to leave the axis. The mock's overhead frame shows the rules covering the code. |
| ly-1..4 (one layer each) | Fine: each layer is a compact cluster the camera can sit beside; the layer above is 13 units up, out of frame at a nearly level shot. |
| ly-5 / fr-1 (wide, orbit) | Good: three bands, top / middle / bottom, portrait; an orbit works (the form is round). The top band must clear the band of text: 26 units of height on a 0.8 : 1 frame means a far camera (d ≈ 50) and small stacks, though about twice the current on-screen size. |
| df-1/2 (crack close) | As now. |
| df-3..5 (the twelve) | Countable: lit plans sit in the middle band, lit code in the bottom; depth occlusion in the bottom slab is the risk (the mock shows it mild at 84 code stacks; at 300 it is not). |
| up-1 (the stream up) | Strong: a thin stream climbing the whole height of the column. |
| re-1..3 (the ring) | As now, in the foot. |
| tr-1/2, fx-1..4 | As now; the fan-out from R0 runs down the column: legible. |
| ls-1 | From above the top: the column foreshortened into a disc with the rules nearest: the one shot where this form reads as the old one. |

**Phone.** Portrait form, so the wide shots are closer than now; but the overhead zoom-out is the
weak point, and the side-to-overhead transitions are the same problem as before, only narrower.

**Cost.** `LAYERS` (y, extents, a per-layer y-thickness; the rejection test becomes 3-D in the code
slab), ~40 scripted places in `lineage.ts`, every shot in `netShots.ts`, the clearance test, shots.
Smallest of the four.

**Risks.** It is still a cone (narrow top, broad base, round); the author's "shape of the overall
system" objection may be to exactly that. Depth occlusion in a thick bottom slab.

### S2 The chandelier (a hanging tree)

**Pitch.** Lay the network out as the tree it is: the rules on a small ring at the apex, each plan on
a ring below and around its own rule, each code stack on a ring below and around its own plan.
Lineage is the layout; streams are short and nearly straight; the twelve are one visible branch.
Seen from the side it is a hanging mobile, a chandelier; from the top it is nested rings.

| Beat | How it reads |
|---|---|
| zo-1/2 | Overhead: the apex sits over the centre of the code (mock), so the pull-back puts rules on top of the bike's piece. The bike's piece must be near the rim for the overhead pull-back to clear the apex, and the swing to the side view is a band crossing. |
| ly-1..4 | Very good: each stack visibly hangs under its parent; "built from what its agent reads" is literal. |
| ly-5 / fr-1 | Three tiers, each a ring: the tree reads at a glance. It is a cone: the mound again, taller. |
| df-1/2 | As now. |
| df-3..5 | The best of the four: the twelve are a sub-tree, one rule's plans and their code, lit as a wedge of the cone, countable because the layout keeps a plan's code under it. |
| up-1 | A stream climbing across the tree to a new apex node: legible. |
| re-1..3 | The ring's visits are scattered across the rim (new work is born under its plan, anywhere); the ring travels far between visits. |
| tr-1/2 | The climb is the tree's own branch: strongest of the four. The fan-out is the whole sub-tree lighting. |
| ls-1 | From above the apex looking down the cone: the same as the column's. |

**Phone.** A cone's apex is narrow, so the top clears the band easily; its base is as broad as the
code count makes it (300 code stacks on a rim: radius ≈ 20, wide again). Depth stacking of rings on
screen at the wide shot is the blob risk of §3.9.

**Cost.** A new placement rule in `generate.ts` (ring under parent, then the spacing rejection),
scripted places become relative ("under R0, bearing 40"), shots re-keyed. Medium.

**Risks.** It is the form the author has already said no to, drawn better. Siblings crowd when a
plan has twelve children; copies (sideways streams) break the tree reading.

### S3 The terraces (three steps rising away from the reader)

**Pitch.** Three flat steps, one per layer, climbing away from the reader like a stair or a hillside
of rice terraces: the code on the lowest, nearest, widest step; the plans on the step behind and
above it; the rules on the top step at the back, few and large. Streams fall over the risers: a rule's
plans sit on the step below it, a plan's code on the step below that, so lineage reads as a cascade.
New work is born toward the front edge of its step (birth order runs toward the reader), so growth
comes *at* the reader and the reviewer's ring works the front row. From the reader's side at any
elevation from level to straight down, the rules are the topmost thing on screen, the code the
lowest: screen order is layer order from every camera, which is what makes the band stop fighting.

| Beat | How it reads |
|---|---|
| zo-1/2 | The powers-of-ten pull-back rises from the bike at the back of the code step and tilts from straight down toward the stair; the plans and the rules come up the screen *behind* the code, never over it. With frame-first-then-build, the camera reaches its end frame (mock `terraces-zoom`) while the top steps are still dark, and the first rules and plans are born into the room already left for them under the band. The bike's piece is one code crate among twenty at the bottom of the frame. |
| ly-1 | Medium shot of a few code crates near the back of the code step with streams arriving over the riser from the plans behind: "built from what its agent reads" with the source visible. |
| ly-2 | The camera rises to the top step and looks along it, level: the rules large, their streams leaving over the front edge, downward, out of the bottom of the frame. Nothing stands above a rule: the band is clear by construction. |
| ly-3 | The camera drops to the plan step and looks down at it from the front at about 35°, or along it from the side; the rule step is above and behind, beyond the top edge or off to the side. |
| ly-4 | The code step from above-front: many small crates, quick to appear, the newest nearest. |
| ly-5 | The wide (mock `terraces-layers`): three bands, top / middle / bottom, every stream running down the stair. Portrait: the stair is taller on screen than it is wide. |
| fr-1 | No full orbit (behind the stair the order inverts); a slow sway, bearing −20 → +20 with a small rise, "slowly circled" in the alt text becomes "slowly swept". The orbit is stage direction, not copy. |
| df-1/2 | A dive to a code crate on the front step; the crack cube's +z face faces the reader and nothing is behind it but the dark risers far back: the cleanest close shot of the four. |
| df-3..5 | The wide from above-front (mock `terraces-twelve`): the three lit plans on the middle step, nine lit code crates on the front step, no occlusion between steps, the fixed one dark with its warm dusting. Counted on the mock at a glance. |
| up-1 | A stream climbs the two risers from C7 to the back step; R1 forms at the rules' edge. The camera follows up the stair. |
| wordless fix | Dive and pull-out on the front step. |
| re-1..3 | The ring works the **front row** of the code step, where new work is born: the reviewer stands between the network and the reader. The feed stream from R0 falls the whole stair to it. Camera: low, from the front-side, the stair rising behind. |
| tr-1/2 | The climb runs up the stair along the lit streams, branches merging at each riser, to R0 on the top step. The pull-back shows R0 with its streams fanning down both risers, across to the ring, and over to R1: the cascade is the picture. |
| fx-1..3 | The rule fixes on the top step; fx-3 from the front of the top step looking down the stair at the new clean plans and code forming below: nothing above the camera's subjects. |
| fx-4 | The sweep runs back to front: top step, middle step, front step; the reader watches the fixes come toward them. |
| ls-1 | From just above the top step, looking down the whole stair to the front edge: "the higher up a thing sits" is literally the back of the picture, and the Coda's map lands on a stair. |

**Phone.** Steps have width and depth; depth is foreshortened by elevation and width is the one
dimension to hold. At the mock's numbers (code step 26 wide, 18 deep; plans 22 × 7; rules 12 × 6)
the wide shot is d ≈ 56 at 24° elevation and fills the frame below the band with the stair's top
at about 42 % of the height. With 300 code crates the code step needs about 780 units² (26 × 30):
either the wide shots back off as the front edge advances (growth drifts the camera; a pure
function of scroll still) or the end count comes down to about 180 (the copy says "a hundred
things"; §1 of the storyboard calls three hundred a design number). Recommend 180 / 30 / 6 and
keep the drift small.

**Cost.** `LAYERS` gains a rectangle per layer (x half-width, z range) and the birth-order z rule;
the rejection sampler is unchanged (2-D within a step); parent reach becomes x-only; the copy reach
likewise. `lineage.ts`: every `at` re-drawn on the steps (R0 at about (−4, 16, −22), P1 (−5, 8,
−12), C1 (−4, 0, 1)…), the V-cluster at the front edge. `netShots.ts`: every shot re-keyed, splines
regenerated; the dive, climb and pull-outs are simpler (no slab to cross). Tests: generate.test.ts
extents, the twelve (test 12), clearance (test 14), pixels (test 11). Shots regenerated. Medium: the
same files as S1, more values.

**Risks.** A stair is a strong, slightly literal image (it says hierarchy out loud; the script says
so too). Side views from bearing beyond ±60° foreshorten the steps into each other; the shots stay
within that. If the author wants a full orbit at fr-1 it must be a half-orbit. The rules at the back
are the farthest from the camera at the wide shots, so they must be the biggest pieces (they are:
3 × 3 crates at u 1.1).

### S4 The galaxy (rings seen from overhead)

**Pitch.** Lay the network flat and look down on it: the rules at the hub, the plans on an inner
ring, the code out along three spiral arms, lineage running outward along the arms. The
powers-of-ten pull-back is literal (the bike's piece on an arm, then the arm, then the galaxy), and
the overhead camera never has an upper layer to drag through the band because there is no "up":
the hub sits in the middle of the picture, under the text, at every scale.

| Beat | How it reads |
|---|---|
| zo-1/2 | The best zoom-out of the four (mock `galaxy-zoom`): straight up from one piece to a spiral. |
| ly-1..5 | **Needs copy.** "At the top" → "At the centre"; "In the middle" → "Around them"; "At the bottom" → "At the edge". The mock `galaxy-layers` (elevation 62°) shows why: there is no top, middle and bottom to see. A shallow cone (hub at y 4) gives a side view some stacking, but on a phone that is the mound of §3.9 again. |
| fr-1 | An overhead slow turn: good. |
| df-1/2 | As now ("Down here" → "Out here"). |
| df-3..5 | Countable (mock `galaxy-twelve`): the lit arm segment. |
| up-1 | A stream running inward to the hub: "up" is "in". |
| re-1..3 | The ring at the rim, feed stream from the hub outward. |
| tr-1/2 | The climb is a flight inward along an arm; the fan-out runs out along every arm from the hub: handsome. "one place at the top" → "at the centre". |
| fx-4 | The sweep runs hub to rim. |
| ls-1 | Overhead of the hub: "The higher up a thing sits" → "The closer to the centre…". The Coda's map is built on this line. |

**Phone.** Overhead frames are round; a round picture on a 0.8 : 1 frame is fine. Nothing ever
crosses the band from above because the camera is above everything.

**Cost.** Placement by arm and radius (new, small); shots mostly overhead (simpler rig use); six
lines of copy and the alt texts; the Coda's map line. The storyboard's "up" vocabulary (up-stream,
climb, top layer) is renamed in code comments only.

**Risks.** The copy is the author's, reviewed line by line, and its spine is vertical ("the higher
up a thing sits"). Six rules on three arms conflates rule and arm. Cube bodies seen from straight
above are squares with no sides: the "built from cubes" read weakens exactly where the author
wants squares.

## 4. Recommendation

**P1 the crate, on S3 the terraces.**

Why the crate: it is the plainest thing that is not a wall. A square footprint makes every stack a
square from above and a block from the side; the partial top course keeps the "built one cube at a
time, each landing an event" story (a cube lands on a notch), the 3 × 3 rule is a visibly bigger
kind of thing, and the bike's six cubes become a 2 × 2 crate with two on top, which the reflow can
target as well as the triangle. P2 is crisper but every piece is the same; P3 is the most alive but
the hardest to keep from making walls and pallets, and its reflow target is a lump; P4 puts height
where the band is.

Why the terraces: it is the only one of the four in which the layer order is the screen order from
every camera the act needs, so the text band stops being fought: the rules are always the top of the
picture, the code always the bottom, overhead or side-on. It is portrait by nature (depth climbs the
screen). The twelve count without occlusion. Growth comes toward the reader, which puts the reviewer
at the front where "before it is kept" belongs, and the sweep ends at the reader's feet. It keeps
every word. And it is a *shape*: a stair reads as intention from the first wide frame, where the
discs read as a spill.

What goes with it:

- **No round glow anywhere.** The far-glow impostor (§3.8) is deleted, not reduced; the ember halo
  is deleted; a lit stack is its cube bodies in ember with a brighter edge, and the surge is a
  brightness on the bodies and streams. Test 12 counts ember rectangles. (The author's third
  screenshot is the case.)
- Yaw ±0.2, not uniform.
- Births of the first rules and plans slide into zoom-out *after* the camera has framed their steps
  (frame first, then build).
- fr-1 is a sway, not an orbit (alt text: "slowly swept", not "slowly circled").
- End counts 180 / 30 / 6, or the wide shots drift back with growth; the author's call ("a hundred
  things" favours the smaller).

### What it means for tasks in flight

- **Task 8, cube bodies per cube (§12.1), in the tree as `src/scene/node/box.ts` / `box.glsl` at
  this writing:** keep, and go further: the body is the *only* far read. `nodeSystem.ts` still draws
  `net-halos` ("one disc per stack: the highlight's and the surge's glow"); remove that mesh and the
  `lod` far glow rather than scaling them down, and carry the highlight and the surge on the body's
  `hi` / `gain` (already there) plus a brighter edge. The instanced box draws whatever boxes
  `cluster.ts` lays out, so the task is independent of the piece shape and can land first; only its
  "rectangle-ish blob" test gets stricter (a square-ish blob), and test 12 counts ember bodies.
- **Task 9, the powers-of-ten zoom-out (§12.2):** keep the overhead start and the continuous
  pull-back; the end frame is the terraces' `terraces-zoom` composition (elevation ≈ 72°, the
  stair rising up the screen); the swing into ly-1 is a tilt, not a band crossing; add the
  frame-first-then-build re-timing of R_a / R0 / P_a (births after about zoom-out 0.3 in growth
  terms, i.e. `born` 0.04–0.08 with the camera already wide). The clearance measure stays the
  arbiter.
- **The defect-shape redesign (docs/specs/2026-10-07-defect-shape.md, written the same day):**
  compatible. Its crack is a ruled surface in the crack cube's own frame in multiples of L, H and D
  (§2 there), so it carries over to a cube (L = H = D = 0.94 u) unchanged; its diagonal zig-zag
  wrapping from the front face over the top edge is exactly the two faces the terraces show the
  reader at every shot (the +z face and the top), and its "piece B tilts" step in the top outline
  still has nothing above it on a crate (the crack site stays the top-front cube). Two checks when
  the crate lands: the tilted piece must not enter the neighbour cube beside it in the same course
  (the wall had that neighbour too, so the clearance is the same joint), and its §4 fade of the
  non-defective pieces is per stack, so it is form-independent. Its re-aimed N8 (bearing off
  head-on) should be re-derived on the terraces, where the natural off-axis view is from the
  front-left looking slightly along the step.
- **Order of work:** cluster.ts (crate) → generate.ts / lineage.ts (steps) → Task 8 (bodies, no glow)
  → netShots.ts and Task 9 (re-key, splines) → tests 11 / 12 / 14 → shots/act2-look regenerated.
  The first two can be built and unit-tested without touching the renderer.

## 5. Numbers to start from (S3 + P1)

| Layer | Step (x half-width × z range) | y | Unit u | Footprint | Cubes | End count | dur |
|---|---|---|---|---|---|---|---|
| rule | 6 × [−25, −19] | 16 | 1.1 | 3 × 3 | 16–22 | 6 | 0.06 |
| plan | 11 × [−15, −8] | 8 | 0.65 | 2 × 2 | 9–12 | 30 | 0.03 |
| code | 13 × [−3, +15] (front edge advances with birth order) | 0 | 0.42 | 2 × 2 | 5–7 | 180 | 0.012 |

Starting shots (network terms, bearing from +z, target as a point): zoom-out end (0, 72, 52, 40,
(0, 6, −9)); ly-5 (8, 24, 60, 40, (0, 7, −8)); df-5 (−14, 26, 56, 40, (0, 7, −6)); ls-1 (0, 40, 34,
40, (0, 8, −12)). The clearance test moves them.

## 6. The mock frames

`<scratchpad>/form-mocks/`:
`<system>-<moment>.png` for system ∈ {terraces, column, chandelier, galaxy} and moment ∈ {zoom,
layers, twelve}, 390 × 844 at 2×, drawn with the crate; `pieces-<piece>.png` for the four piece
shapes; `<system>-sheet.png` one montage per system and `pieces-sheet.png`. A standalone three.js
page (cube bodies with faces and edges, a mote speckle on the faces, dotted streams, the house text
band, scrim and vignette, the portrait rig's widening and 62 % framing) rendered headless; not the
generator, not the shader, not the crack. The counts are 22 / 6 / 3, 48 / 10 / 4 and 84 / 14 / 4 at
the three moments (the storyboard's own figures), the twelve are three plans of one rule and nine of
their code with one fixed, and no frame has a halo. What they do not show: streams flowing, the
reflow, growth, the lighting pass, the crack. Camera numbers were tuned by eye to clear the band
and are starting values only.
