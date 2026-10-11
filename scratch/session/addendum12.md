
## 12. The author's first look (2026-10-07): a powers-of-ten zoom, and stacks that read as cubes

The author watched the first full cut on a phone and said, at zoom-out's end:

> The bike stack is huge compared to the others. Makes it look special, such isn't the goal. Should we
> keep zooming out / shrinking it at the same time as transforming it from bike shape so it looks the
> same as the others? Transforming to cubes should happen at the same time as other cubes coming out. It
> should look and feel like a zoom out like those scenes where the camera moves out from a place on the
> street to earth to solar system to galaxy.
>
> The other things are really small, are they all dots? Shouldn't we have some more square
> configurations?

Two causes, both ours. **The first stack looks special** because the camera never pulls back (§11 "As
built": a straight pull-back sweeps the plans and rules through the text band), so it stays near and
large, and because it is drawn by the bike's hundred thousand motes while a plain stack has about a
hundred and twenty, so it is solid where they are speckle. **The others read as dots** because a plain
stack is a sparse speckle at medium range and, past ten pixels, its far body is a round glow (§3.8).

### 12.1 Stacks read as cubes at every distance

- **A cube body for every stack.** One instanced box per cube of every stack (the network's boxes, from
  `src/network/`; about 2,000 instances, twelve triangles each): faint translucent faces, a little
  brighter on the faces toward the key light, and a thin brighter edge, in the agent blue at the
  network's glow. It is born with its cube (the cube's own birth window, as its motes are), scales
  with `net.show`, and carries the highlight's ember and the fix's warmth as the motes do. It replaces
  the round far glow (§3.8's `lod` term) as what gives a small stack its body: at any distance a stack
  is a little brick stack, never a dot. The halo quad stays only as the highlight's and the surge's
  glow (the twelve must still count as twelve, test 12).
- **The motes stay** as the texture on and around the cubes (the dust they are made of, landing as
  they are built); the box body is what reads at a distance.
- **The first stack is drawn like every other stack.** N0's boxes are drawn by the node set too (the
  ruling "N0's cubes are not drawn twice" is withdrawn). As the camera recedes the bike's motes hand
  over to it: `stage.motes` falls to 0 by the end of zoom-out, so at the end the first stack is one
  stack among many, with the same body, density and glow.

### 12.2 The zoom-out is one continuous pull-back from overhead

- **Powers of ten, literally overhead.** The camera rises from Act I's last shot to look straight down
  on the bike, and then pulls straight up, without stopping, through the whole of zoom-out: from the
  one bike, to its stack among a few neighbours, to a field of stacks. Seen from overhead the layers
  stack toward the camera instead of rising up the screen, so the upper layers do not sweep down
  through the text band the way they do in a side-on pull-back (§11 "As built"); the clearance test
  is the arbiter, as always. The layers section then swings down to the side view its lines need
  ("At the top… In the middle… At the bottom…"), riding the page turn as Task 5's moves do.
- **Reflow and births together.** The bike loosens into cubes while its neighbours are being built
  round it: the first neighbours are born as the reflow begins, not after it, so "the bike becomes a
  stack" and "the agents build all day" are one motion seen from further and further away.
- **Shrinks to match.** By zoom-out's end the first stack is on screen at the size of its neighbours
  and drawn as they are (§12.1), so nothing marks it out.

### 12.3 Tasks

8. **Stacks as cubes.** The box body (§12.1) in `src/scene/node/` (instanced boxes, born and lit
   like the motes, a function of state only), the halo reduced to the highlight's and surge's glow,
   N0 drawn by the node set, the mote hand-over; tests: purity, a stack's body visible at a wide shot
   as a rectangle-ish blob (not a disc), the twelve still twelve, clearance and parity unchanged.
9. **The powers-of-ten zoom-out.** Re-key zoom-out's camera as one continuous overhead pull-back (a
   generated spline, held by a test), the reflow and the first births together, `stage.motes` to 0;
   the layers section's first move from overhead to its side view on the page turn. Search candidate
   paths numerically with the clearance measure first.
