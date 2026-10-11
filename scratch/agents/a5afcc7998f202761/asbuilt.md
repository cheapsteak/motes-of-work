
## 8. As built (2026-10-05)

Everything above is built as written, except for these differences, each made where a number did
not hold, a test could not be met as worded, or the frames said so:

- **`ink.flat` falls over 0.61–0.69, not 0.58–0.68.** §5 test 4 asks that nothing lift through an
  opaque page (`sheet.opacity < 0.999` whenever `ink.flat < 1`), but §4.2 keeps the sheet at 1 until
  0.60. The lift now starts once the page has begun to fade (it is 0.975 at 0.61) and ends with it.
- **The ink draws before the motes** (`renderOrder` −0.5, after the sheet's −1), not after them (2):
  the motes screen-blend over the lines, so at the end the faint lines lie *beneath* the built bike,
  as §2.1 says, rather than over it.
- **All twelve spokes are drawn plainly**, not every other one as a far-side line: with six faint the
  wheels read sparse, and the mock frames the author liked show twelve.
- **Three tyre circles are the tyre (0.34), the tyre less its section (0.31, which is `WHEEL.rim`)
  and the rim's inner edge (0.294)**: the table's "rim" circle is the second.
- **`moves` compares the two builds posed at rest (bike coordinates), not part space.** The saddle's
  profile is the same in its own space on both builds; only its mount moves. In part space it would
  not "move", and the drawing would show the saddle in the right place from the start.
- **The saddle's hatching rides with the saddle** (a page stroke on the saddle part, struck out and
  redrawn with it), not with the ground: on the ground it would stay over the front wheel after the
  redraw. The paper test excepts it by name.
- **Strokes on one build only** (`only`): the twin's cradle under its saddle is struck out and never
  redrawn. **Strokes straight across the side view** (`across`: the bars' cross tube, the basket's
  short rims) collapse to a dot when flat, so they are hidden until they lift.
- **The lamp is its side silhouette** (the cylinder as a rectangle, the lens as a half circle), not a
  circle; a circle reads as a second bell.
- **The right-of-the-wheel notes start at x 1.25, not 1.12**, clear of the front tyre.
- **S11c targets (0.85, 0.85), not (0.80, 0.95)**: the seat on its mast stays in the upper middle of
  the close frame and the basket and the top of the front wheel come into it, so "on the front" is
  in the picture, not only implied.
- **Each part's x-rank is its strokes' mean x** posed at rest, rear 1, front 0; the bars are not made
  last by hand (they lift with the head of the bike, last but for the front wheel and fork).
- **Stroke points are part space in world units** (`BoundPoint.local`'s units), and the mechanism
  gains `sheet` beside `ink` (both optional; only the bike has them). The pen's arc is measured in 3D
  part space, so the pen keeps one speed whatever the pose.
- **The pentimento is 0.17 of a line's own alpha** (0.15 absolute on the outline ink), and the wobble
  is centred on the line (±0.9 px), not a one-sided offset.
- **The chain is 24 links** (`CHAIN_SEGMENTS`), not 36.
- **Act I is 21 screens** (8 + 4 + 1 + 8), not 19: §0 counted the old six-screen spec section.
- **Tests.** §5 test 10's "box round the seat, bars and top tube" is a mask of every pixel within
  8 px of a moving stroke (both copies) or the ring, which also covers the cables' run down the seat
  stay. Test 11 is in two halves: the geometry (at the end of the lift every line stands on its
  part's pose; before it every line has z 0) is a unit test of the shader's TypeScript mirror
  (`src/scene/ink/inkLayout.test.ts`); the pixels are sampled every 0.002 from 0.63, where the
  camera's turn has come to rest, to 0.70. While the camera turns the whole page slides across the
  screen, which changes more than 4 % of the frame between any two useful samples whatever the
  lines do; that move is held continuous by the camera tests. The page's own test hook reports
  three.js's point and triangle counts and the visible meshes (`window.__motes.drawStats()`).
