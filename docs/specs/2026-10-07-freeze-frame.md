# The freeze frame: the held, inked moment when the reader is shown the defect

*Status: design for review, with mocks; revision 4 (the author's mapping: one planet with its moons is one
piece of code, each star a plan, the galaxy's core the rules; the fix heals the whole piece; warm mode A
chosen. Revision 3 folded in the author's notes on the mock: no border, the planet bursts too, no danger
lines after the fix; revision 2 the beat split, the colour comparison, the galaxy's revisions 3–4 and the
scatter). Date: 2026-10-07. Sits on the galaxy design (docs/specs/2026-10-07-galaxy-orbits.md, whose
body vocabulary this document uses under the new mapping: §1.2 the bodies, §5 and §12.3 the derps and
the burst; §7 the four things it asks of this document; §8 the two clocks) and on the morph
and scatter (docs/specs/2026-10-07-morph-and-scatter.md: §2 the breathing shell and the scatter, §3.3
the pin clause); the push-in and focus fade of the defect-shape spec (§3.2, §4) transfer unchanged.
The words are script draft 4 (docs/script/act-2-draft-4.md, page 7) with the split the author asked
for (§1.1). Reference board: scratchpad `freeze-refs/board.md`. Mocks: §5.*

## 0. The author's asks, and what they decide

> in just the focus mode when we zoom in to inspect one defect, can we do a sort of freeze-frame and
> stylize it sort of in the vein of "into the spider verse" spidey sense comic book-y style? also the
> borderlands character intro freeze frames could also be a good inspiration

And on revision 1's two open choices: *"So you fix it should get its own beat"*, and, on the colour
of the warm copy, *"I don't understand question two, can you build me a comparison?"* (§2.3, and the
mock's **compare** button); then, on the comparison, *"Let's try a and see how it feels"* (A is the
default). And the mapping, author-approved: **one planet with its moons is one piece of code** (the moons
are its parts), **each star is a plan**, **the galaxy's core is the rules**. So the freeze's subject is
the whole planet-with-moons, the defect is the piece derping (the planet's shell mid-scatter and
rippling, a moon mid-burst), and "So you fix it." heals the whole piece.

Still binding: phone first (390 × 844); the text sits at the top above the picture; nothing in the
picture that is a label, a caption, lettering or metadata; no colour words in the prose; every *story*
frame a pure function of scroll; ambient motion (orbits, derps, the galaxy's turn) on wall time, frozen
in tests, stopped under reduced motion; reduced motion honoured; publication-safe, "in the vein of",
never a copy of a film's or a game's signature marks; every mote shader change keeps its GLSL/TS mirror.

Three decisions fall out, each argued below:

1. **The freeze is a cut, not a slow-down, and the cut is what catches the derp** (§1). The moons run
   on the ambient clock, so no scroll position can wait for a derp. On the scroll step where "Up close,
   if you watch, you can see it." is legible, the picture cuts from the live clock to a **pinned
   instant**: the piece caught mid-derp, its planet's shell mid-scatter and one of its moons mid-burst,
   teleported off its track with its ghost double beside it. The moon's pose jumps at the cut, and that
   jump *is* a burst snap: the picture of the line. The hold lasts through that line's rest; "So you
   fix it." comes up on the held frame, the fix lands across the whole held piece, the hold releases,
   and that line's rest shows the mended piece running.
2. **The dressing is motes, drawn round the held frame, in the planet's own lights** (§2): the frame
   steps on twos; two dotted bursts of straight ticks, a small dense one round the moon and a larger
   sparse one round the planet (both are defective: the moon mid-burst, the planet mid-scatter); two
   misregistered copies of the planet-system (cold and warm, 3 px apart); an inked limb; the
   neighbours dimmed and greyed; a 4° roll. No panel border (the author: "no border please"; it read
   as a document icon). Halftone, hatching, the squiggle ring, inset panels, lettering, caption slabs
   and sound-words are cut. The
   single-frame flash stays, planet-only and off under reduced motion.
3. **One leaf group and no post-process** (§3): `freeze.hold` (the cut, read as a boolean),
   `freeze.dress` (0..1), `freeze.flash` (0..1) and `camera.roll` (degrees), all keyed by scroll; the
   ambient clock the node shaders *and the camera's target* read is `hold ? FREEZE_PIN : ambient`, so
   the held frame is pure of scroll by construction; every look term is a per-mote term in the node
   mirror pair plus one small instanced set (the ticks). Nothing is a screen-space pass, so the
   phone budget is unchanged.

## 1. The moment

### 1.1 Which beats, which window

Page 7, three beats now (the author's split; three lines on a page is within the limits, and both
dwells clear the lint: 0.58 and 0.48 screens against a floor of 0.3):

| id | at | Line | words |
|---|---|---|---|
| `df-1` | 0 | Come closer. Out here, one piece of code has a defect. | 11 |
| `df-2` | 0.24 | Up close, if you watch, you can see it. | 9 |
| `df-2b` (new) | 0.36 | So you fix it. | 4 |

The defect section is 4.8 screens long; local progress below, with the existing keys kept (the push-in
0.04–0.20, the pull-out from 0.4392, the page fading 0.46–0.4808). Auto-advance's stops, as `plan.ts`
finds them: df-1's at ≈ 0.238 (before df-2 comes up, the push at rest), held max(2, 11/3) = 3.7 s;
df-2's at ≈ 0.358 (before df-2b comes up), held 3 s; df-2b's at ≈ 0.437 (before the pull-out leaves),
held 2 s.

| Local | What happens | Leaves |
|---|---|---|
| 0.00–0.02 | df-1 up; the dive has landed on N8a | |
| 0.04–0.20 | the push-in to N8 (−35, 32, 3.4, 36, 1; the planet `P1`, the camera riding it) and the focus fade on the planet-system, unchanged in kind | `net.focus` 0 → 1 |
| 0.20–0.2605 | **held close, live**: the six moons run on their Kepler ellipses; the defect moon derps on its schedule (an event every 2.2 s, a burst most often); df-1's rest (3.7 s) is here, so a reader at auto pace watches one or two | |
| 0.24 | df-2 comes up (full ink 0.2608) | |
| **0.2605** | **the cut**: the ambient clock is replaced by `FREEZE_PIN`; the defect moon is mid-burst with its jump on (up to 0.45 r off its ellipse, lifted, its ghost double a few degrees along the track) and `P1`'s shell is 0.16 s into a scatter (every mote out, the first not yet home); the whole frame (neighbours, the star) holds | `freeze.hold` 0 → 1 over 0.2600–0.2605 |
| 0.260–0.264 | the flash: the planet-system +100 % brightness, 45 % toward white, decaying to 0; at auto pace 32 ms ≈ 2 frames | `freeze.flash` 1 → 0 |
| 0.262–0.292 | **the dressing snaps in** (0.24 s at auto pace): the roll eases in; the neighbours dim and grey; the two copies spread; the limb inks; the two bursts are drawn last (dress 0.45–0.95, i.e. 0.275–0.290), the planet's first, the moon's a beat after | `freeze.dress` 0 → 1 (inOutCubic), `camera.roll` 0 → 4 |
| 0.292–0.36 | **the held frame**: df-2's rest (3 s) is here, on the defect shown: the moon off its track beside its ghost, the planet a cloud, a burst round each | |
| 0.36 | df-2b "So you fix it." comes up on the held frame (full ink 0.3808); df-2 dims | |
| 0.37–0.40 | the person's warm motes fall from above **across the whole held piece**: about 70 onto the planet's shell and 50 over its moons (the derping one takes 20, the others 6 each); every target is static during the hold, so the Beziers' ends do not move; the warm copy and both bursts' warm halves turn to amber (mode A, §2.3) | `net.fix` as the galaxy spec's blend (`fixAt` 0.40, `W_fix` 0.06); `v` 1 → 0 over 0.385–0.40 |
| 0.385–0.40 | the derp's amplitude goes to zero *inside the held frame*: the scattered shell comes home along each mote's own leap and its ripple flattens to a perfect sphere; the ghost fades; the derping moon slides home to its ellipse and every moon runs clean; the planet and all six moons keep the warm dusting (the piece, not a part, is what was fixed); **both bursts retract and vanish in step with `v`** (the author: no danger lines after the fix lands): each dash loses motes toward its limb in steps and winks out at its own hashed moment, un-eased, all gone by `v` = 0 at 0.40, so the fixed frame is a mended planet and moon with no marks on them | |
| **0.405** | **release**: the ambient clock resumes (the moon on its track running, no derp term left) and the dressing peels over 0.405–0.421: the roll levels, the copies converge, the limb un-inks, the neighbours come back (the bursts are already gone) | `freeze.hold` 1 → 0; `freeze.dress` 1 → 0, `camera.roll` 4 → 0 |
| 0.421–0.4392 | **the mended piece, live**: df-2b's rest (2 s) is here: the planet a perfect sphere, six moons running on their ellipses, warm dust on all of it | |
| 0.4392–0.4808 | the pull-out, the page fading, `net.focus` 1 → 0, as today | |

*The fix's rows (0.37-0.40) are superseded by docs/specs/2026-10-09-act-2-reskin.md §13.6 (the author on
v25): the warm motes land over 0.36-0.374, the piece glows gold over 0.374-0.388, and it mends over
0.388-0.404, inside the same hold. And the defect moon no longer derps before the cut: under the planet
lamp the piece holds its paths; the cut's jump to the pin is the only time it leaves its path.*

Why the cut is at 0.2605: df-1's rest at 0.238 must be live (the reader watches; "if you watch" is
earned there), and the cut must come after df-2 is legible so "you can see it" is read *on* the held
frame. Why the release is at 0.405 and not on the page turn: df-2b's rest has to show the orbit going
round smoothly, which is what its stage direction promises, so the hold ends before the stop and the
rest window (0.004 local) has the dressing at rest from 0.421.

### 1.2 How it relates to the two clocks

- **Story clock (scroll):** every leaf above. The held frame's content depends on scroll and on the
  constant `FREEZE_PIN`, not on wall time, so it is a pure frame: a jump to local 0.33 and a scroll to
  it render the same bytes.
- **Ambient clock (wall time):** before the cut and after the release it drives the orbits, the
  galaxy's turn and the derps (galaxy §8). During the hold the node shaders *and the camera's target
  resolution* are handed `FREEZE_PIN` in place of it, so the camera that rides the planet stops with
  the picture. The only wall-time thing running during the hold is the **twos tick** (§2.1): a 12 Hz
  re-roll of the ticks' lengths and a ≤ 0.6 px breath of the copies, additive and after
  sampling, exactly the shimmer's slot (design §6.1's one exception). Frozen in tests, off under
  reduced motion.
- **The cut is a step, not a blend.** `freeze.hold` is keyed 0 → 1 over 0.0005 of local progress and
  read as `hold ≥ 0.5` on the CPU when the uniform is chosen. A blend of two clocks would whirl the
  moons backwards through an arbitrary number of laps on a slow hand-scroll; a step shows one pose,
  then the other. The pose jump at the cut is the burst's snap (the moon teleports off its ellipse,
  which is what a burst does, un-eased, galaxy §12.3); the jump at the release is the orbit resuming
  (the moon is on its track in both frames, at different angles, with the dressing leaving).
- **`FREEZE_PIN` is searched, then forced only if the search fails.** `schedule.ts` walks the hero
  moon's derp slots over one ambient period (the galaxy's turn, 1,200 s = 545 slots of 2.2 s) for the
  first `k` that satisfies, in order: (a) the kind is **burst** and at `s` = 0.3 (micro-slot 2, snap
  on) the jump is on and the **ghost** is on; (b) the moon's **home point** (its ellipse position at
  that instant) faces the shot's camera, `dot(home, camDir)/|home| > 0.35`, so the landing is not
  hidden behind the planet's limb; (c) the pinned pose **projects inside the picture** through the
  composed rig (within the central 60 % of the width, under the band); (d) **`P1`'s shell** is in a
  scatter with `s` ∈ [0.10, 0.20] s (every mote out, none home yet). If no slot satisfies all four,
  drop (d) and force the scatter on the held planet (`FREEZE_SCATTER_S = 0.16`, the scatter spec's
  override); then drop the ghost; then force everything. The fence names the path taken. On the mock
  the full clause set is met at 953 s (§5), within the period; the probability per slot is about
  0.3 × 0.7 × 0.5 × 0.5 × 0.1 × 0.45 × 0.25 ≈ 0.0006 for a *random* seed, so a hero whose seed fails
  the search is expected, and the forced path is a first-class outcome, not an error.
- **The other close holds.** A star is now a plan, so the plan heroes' pins are **shiver peaks**, `s` = 0.5
  of a wobble (galaxy §7.3), or a scatter at `s` = 0.16 if one coincides, with the burst drawn round the
  star at `FREEZE_TICK_R0 × R_star`. The rules are the galaxy's core, whose close-up shape is not yet
  designed; its pin and dressing follow the same rule once it is (a shiver or scatter peak, the burst
  round the body the camera holds). The "off its track" fence applies to the code heroes' moons only.

### 1.3 Auto-advance

`freeze.hold`, `freeze.dress` and `camera.roll` join `sceneMotion()` so a stop waits for them. The
stops fall where §1.1 says: df-1's at 0.238 (before the cut), df-2's at 0.358 (the dressing at rest
since 0.292, the fix not begun), df-2b's at 0.437 (the dressing gone since 0.421). None is inside the
flash, the cut, the dressing's snap or the release, so a reader at auto pace never rests on a bright
frame or on a jump. The hold runs from 0.2605 to 0.405: df-2's whole rest (3 s) plus its transit in
(≈ 0.8 s) plus the fix (≈ 0.4 s): about four and a half seconds.

### 1.4 What the freeze adds to the truth of the lines

"Up close, if you watch, you can see it." The piece is the planet with its moons, and a derp of it is
intermittent and sub-second; from far it is under a pixel and hidden by the level of detail. The galaxy design makes the defect honest (a healthy frame
and a derping frame are the same picture between events). The freeze is the essay doing the watching
*for* the reader: it holds the one frame in which the defect is visible, a moon plainly off its dotted
ellipse with a ghost of where it was and its planet coming apart, each ringed by its own burst, and
dresses it so the reader knows the frame was chosen, the way a developer screenshots the one bad frame of a flaky test. It also makes
the still true: a reader with WebGL off or reduced motion, who never sees a moon move, sees the defect
anyway (§3.5). "So you fix it." then lands on a held thing, and on all of it: the person's motes dust the planet and
every moon, because the piece is what was wrong, not one part of it; you can only fix what you have
caught; and its rest shows the result, which is motion again.

## 2. The look

Built from the board's ranked transfers, in the order they read on a phone. Numbers are for 390 × 844
at the close shot N8 (bearing −35, elevation 32, distance 3.4, fov 36 widened by the portrait rig,
frame 1, the planet's centre at 76 % of the height; about 170 px per world unit, so the planet is
100 px across, a moon 34 px, the outer ellipse 230 px wide); px are CSS px.

### 2.1 Kept

*Item 3's copies and the held planet's colour are superseded by the re-skin (docs/specs/2026-10-09-act-2-reskin.md §4.5): the copies blend additively, as the mock's, the offsets and gains unchanged; C1 is cyan (`#1FB0FF`); while the scatter is out the held planet's fill is halved and its motes keep C1's hue.*

| # | Element | The mote version, with numbers |
|---|---|---|
| 1 | **The hold, on twos** | The cut (§1.2). During the hold the picture breathes at 12 Hz: `twos = floor(12 · ambient)`; the ticks alternate between two hashed length sets (`variant = twos mod 2`); the two copies shift by `(hash(twos) − 0.5) · 0.6 px`. The base draw never moves. The burst's own held jitter and the scatter's are frozen with the pin. |
| 2 | **The moon's burst** | 14 straight dotted dashes, radial about the moon's *projected* centre, in the view plane (billboarded): inner radius 2.1 × the moon's screen radius (≈ 36 px), length 14–30 px by hash, ±4° angular stagger, 6 motes per dash at 1.6 px (3–6 px apart: dense). Alternating cold (agent blue) and warm (§2.3). A dash is clipped where it would enter the planet's burst radius, so the two never interleave. Drawn last (dress 0.45–0.95); it follows the moon as it slides home and **retracts with the fix**: with `retract = 1 − v`, a dash keeps `min(1, 1.6 · v)` of its motes (dropped from the outer end, stepwise) and winks out once `retract > 0.15 + 0.8 · hash(i)`, so the dashes go one by one over 0.385–0.40 and none is left at `v` = 0. No squiggles, no ring over a head: dashes round a moon. |
| 2b | **The planet's burst** | The planet carries the defect too (its shell is mid-scatter), so it gets its own, larger ring: 22 straight dotted dashes about the planet's projected centre, inner radius 1.12 × its screen radius **plus 0.40 R while the shell is out** (the dashes start just outside the flung motes' reach, ≈ 76 px at the pin, closing to the inked limb, ≈ 56 px, as the fix brings the shell home), length 26–50 px by hash, 7 motes per dash at 1.6 px (4–8 px apart: sparse), angles offset half a step from the moon's set. A **gap of ±26°** is left in the direction of the moon, so the moon's burst sits in a notch of the planet's and the eye reads two sources. Same colours, alternation phase-shifted by one dash. Drawn with the moon's, a beat earlier; retracts and winks out with the fix by the same rule, as the shell comes home and the inner radius closes to the limb. Its top at the pin is ≈ 126 px above the planet's centre: 61 % of the phone's height, well under the band. |
| 3 | **Misregistration** of the planet-system's lights | The planet-system's motes (`P1`'s hero shell 6,000, its six moons' 216, its tracks, the ghost) drawn three times: the base, a cold copy at −3 px and a warm copy at +3 px (screen x, rolled with the camera), copies at 0.26 of base brightness, ±0.4 px twos breath; the defect moon's copies at ±6 px (it is "the broken one"). With the shell mid-scatter the copies are offset clouds: a comic panel of a body coming apart. |
| 4 | **The inked limb** | Shell motes with \|n·v\| < 0.22 (f = 1 − \|n·v\| > 0.78, feathered to 0.92) get ×2.25 brightness and ×1.55 size; weight 0.7 + 0.6 · max(0, n·L) with L the key light's screen direction (upper left), so the line swells on the lit side; a 20° break centred top-left (screen angle 135°, feathered over 10°), where the ring starts and ends. On the copies the limb term is halved. `n` is the mote's *rest* normal, so a scattered limb mote keeps its ink and is flung 10–20 px out: a broken ink line. |
| 5 | **Dim and grey** the rest | Every mote not in the planet-system (the other planets, the star and its glow, the streams): brightness × 0.4 on top of the focus floor (0.3 → 0.12), colour mixed 0.55 toward a cold grey-blue `#5c6a86`. The ground stays `#0B0D12`. The hero's own tracks stay at full (they are full at this zoom, galaxy §12.2): they are the reference the moon is off. |
| 6 | **The roll** | `camera.roll` 4°, about the line of sight through the planet (the target), eased in with the dressing. With no panel border it is the one thing that says "a tilted frame", so keep it at 4°, not less; the ticks are radial so it does not matter to them. |
| 7 | **The flash** (optional, on by default) | `freeze.flash` keyed 1 → 0 over 0.260–0.264: the planet-system's motes +100 % brightness and 45 % toward white. Planet-only (≈ 5 % of the viewport), once per section, 2 frames at auto pace; a hand-scroller who parks on it sees a brighter still, not flashing. Off under reduced motion (`uFlashOn`, as `uShimmerOn`). |

### 2.2 Cut, and why

| Element | Why not |
|---|---|
| Halftone lattice on the body | At 100 px across on a phone a 6 px pitch is 17 dots: a grid, and re-seating 6,000 shell motes onto a lattice destroys the limb the sphere draws for free (galaxy §1.3) and fights the morph. |
| Hatching on the shadow side | Muddy at a finger-width of blur; the limb and the two copies already give the "print" read. |
| Kirby bubbles, inset panels, frame-edge speed lines | Louder than the calm the essay keeps; inset panels do not read on a phone; the edge spikes (board 03) are the most recognisable device after the squiggles. |
| Any lettering: name slab, tagline, sound-word, caption box | Labels in the picture, and the most identifiable marks of both inspirations. The line is the caption, at the top, where the essay's words live. |
| The wavy squiggle ring | The film's signature. Ticks are straight, dotted, and round a moon. |
| A panel border (a dotted hairline frame with a cut corner, revision 1's #7) | The author: "no border please"; it read as a document icon, and a rectangle inside the phone's rectangle. The roll alone carries the "tilted panel" read. |
| A red-and-blue split as the scheme | Reads as the film's identity; the essay's own pair does the same work and carries the story's colours (§2.3). |

### 2.3 The warm copy: the comparison the author asked for

The warm copy (and the warm half of the ticks) can be one of two of the essay's colours. The mock's
**compare** button shows the same held frame twice, side by side at a phone size, with a one-line
caption under each and, under that, the later moment the twelve light up, so the author can judge
whether the alarm colour at the freeze takes anything from page 8. The **compare: fix landed** toggle
shows both after the fix, where they agree and no burst is left (`compare-fix-landed.png`).

| | A: ember before the fix, amber after | B: amber throughout |
|---|---|---|
| What the warm ghost says at the freeze | "this piece carries a defect": the **alarm colour**, the one the twelve will light in | "a person is looking at this": the **person's colour**, the one the fix lands in |
| What happens as the fix lands | the ghost turns from alarm to amber as the warm motes land: the act's whole arc on one planet, one page early | nothing changes colour; the fix's amber was there from the cut |
| When the reader next sees ember | page 8, df-4/df-5: the twelve light up; this is its **second** appearance, on a planet-system they now know is the source's child | page 8: its **first** appearance, kept whole for the twelve |
| What it costs | the galaxy design's letter ("no ember before df-4", a spec statement; no test asserts it) | the fix's colour arrives before the fix, so "So you fix it" lands on a frame that is already warm |
| Mechanism | `tint = mix(EMBER, HUMAN, 1 − v)` | `tint = HUMAN` |

Both are one constant (`FREEZE_WARM_MODE`); **the author chose A** ("Let's try a and see how it feels"),
so A is the default and the single view of the mock draws it; the compare button stays for now, with
the later lit moment under each side drawn under the new mapping (a star's pieces lit ember whole,
planet and moons; the fixed piece blue with warm dust on all of it).

### 2.4 Phone and desktop

On the phone the held picture is the planet (100 px, a cloud at the pin) inside its long sparse burst,
the moon off its ellipse with its ghost inside its short dense burst sitting in the planet burst's notch,
the five other moons held, the dotted ellipses, and the dim neighbours and the dim star above. The mock
at 1440 × 900 (§5) shows the same set. Clearance (§4): the highest mark is the planet burst's top dash,
≈ 126 px above the planet's centre, i.e. at 61 % of a phone's height (the band's bottom is at ≈ 23 %)
and 62 % on desktop; the 4° roll moves it by under 10 px; the moon's burst is lower than the planet's
top at every pin the search can return (clause (c)).

## 3. How it is built

### 3.1 Where each term lives

| Element | Mechanism | Where |
|---|---|---|
| The cut | CPU: `ambientShown = hold ≥ 0.5 ? FREEZE_PIN[hero] : ambientLive`; `uAmbient` and the camera's target resolution both take `ambientShown` | `nodeSystem.ts`, `cameraRig.ts` (the target resolver) |
| Twos tick | `uTwos = reduced or test ? 0 : floor(12 · ambientLive)`, a uniform like `uShimmerTime` | `nodeSystem.ts`; read by the node vertex shader |
| Copies | **Instanced geometry ×3 for the planet-system's motes** (galaxy §7.2): the focused system's node set is drawn with `instanceCount × 3` and `copy = gl_InstanceID / n` (as Act II's workshop copies are drawn); copies 1 and 2 get `uOffPx · (copy − 1.5) · 2` in clip space (`gl_Position.xy += off · gl_Position.w`), brightness × 0.26 · dress, colour forced to cold / warm. Copies are invisible at dress 0 (brightness 0), so the extra instances cost vertex work only during the hold. | `node.glsl` + `node.ts` (`freezeCopy(copy, dress, v, mode) → {offPx, gain, tint}`), `nodeSystem.ts` (the draw count) |
| Limb | Per-mote term `freezeLimb(restNormalView, lightDir, dress) → {gain, size}` beside `nodeNearGain`, after `shellWarp` (the scatter) so the ink rides the flung mote | `node.glsl` + `node.ts` |
| Dim and grey | `nodeFocus()`'s floor becomes `floor · (1 − 0.6 · dress)` and a tint mix `0.55 · dress` toward `FREEZE_GREY`, on every mote outside the focused planet-system (the lamp's membership, level 1); the star's glow sprite takes the same gain | `node.glsl` + `node.ts`, `stream.vert.glsl`, the glow sprite's material |
| Flash | `gain × (1 + flash)`, colour mixed `0.45 · flash` toward white, planet-system motes only, × `uFlashOn` | `node.glsl` + `node.ts` |
| Ticks | **A small instanced set** (14 × 6 + 22 × 7 = 238 motes; one system focused at a time) with role `Tick = 4` in `aMeta.w` and a `source` bit (moon / planet): `freezeTick(source, i, j, variant) → (angle, radius, len)` in the mirror pair; the vertex shader projects the source's centre (`nodeWorld(C1, uAmbient)` for the moon, `P1`'s centre for the planet; a star's own centre for `R0`/`R1`, whose burst is the planet's kind at `FREEZE_TICK_R0 × R_star`), adds the view-plane offset scaled by the source's screen radius (plus `0.40 R · uScatterOut` for the planet), applies the planet's gap toward the moon and the moon's clip against the planet's radius, the retraction by `1 − v` (`uFixV`, the fix blend the node set already has), and pulls the point back to its depth. Visible by `smoothstep(0.45, 0.95, dress)` (the planet's by `smoothstep(0.40, 0.90, dress)`) × the retraction. | `freeze.glsl` + `freeze.ts` (mirror pair, `?lib=freeze`), `nodeAttrs.ts` |
| Roll | `cameraRig.compose`: `up = rotate(up, dir, roll)` before `lookAt`; the view offset is applied after, so the roll is about the target where it lands on screen | `cameraRig.ts`, `sceneState.ts` (`camera.roll`, default 0, degrees) |
| The held system's detail | `uSysPx` clamped to ≥ 120 for the focused system while `net.focus` > 0 (galaxy §7.4), so the hold never catches a hand-over; tracks are full at this zoom (galaxy §12.2) | `nodeSystem.ts` |
| Fix on the held piece | The person motes land across the piece: each has a host (the planet's shell, or one of its moons) and a rest point on it; the Bezier's end is `nodeWorld(host, uAmbient)` + the rest offset, the pinned pose during the hold; `v` → 0 brings the scattered shell home along each mote's leap and flattens the morph (scatter §3.3), brings the ghost's gain to 0, and tints every moon 0.6 and the planet's rim 0.3 toward amber; the warm dust rides its host afterwards | `node.*` |

**Why not a post-process pass.** A screen-space pass (`HalftonePass`, an outline pass, a chromatic
split of the framebuffer) would also split the text's scrim, the neighbours and the ground, and it is
a second full-screen draw on a phone. Every effect above is a per-mote term or a few hundred extra
instances, so the budget test holds and the look is made of the same material as everything else: a
mote.

### 3.2 SceneState and keys

New leaves, all default 0 so every existing frame is unchanged: `freeze.hold`, `freeze.dress`,
`freeze.flash` (0..1) and `camera.roll` (degrees). Keys in `keyframes.json`, section-local as §1.1:
`hold` 0 @0.2600, 1 @0.2605, 1 @0.4045, 0 @0.405; `dress` 0 @0.262, 1 @0.292, 1 @0.405, 0 @0.421
(inOutCubic); `flash` 1 @0.260, 0 @0.264; `camera.roll` 0 @0.262, 4 @0.292, 4 @0.405, 0 @0.421.
`SCENE_STATE_PATHS` and the paths test pick them up; `sceneMotion()` gains `hold`, `dress`, `roll`.
The story gains `df-2b` at 0.36 in `src/story/08-defect.md` (and `net.fix`'s keys move to `fixAt`
0.40). Uniforms: `uDress`, `uFlash`, `uFlashOn`, `uRoll`, `uTwos`, `uOffPx` (vec2, the copy offset
rolled), `uScatterOut` (the planet burst's extra radius while the shell is out); `FREEZE_PIN` is not a uniform: the CPU folds it into `uAmbient`.

Constants (one source, spliced into the GLSL as the `NODE_*` constants are, in `birth.ts`):
`FREEZE_COPY_PX = 3`, `FREEZE_MOON_COPY_PX = 6`, `FREEZE_COPY_GAIN = 0.26`, `FREEZE_WARM_MODE = 'A'` (B kept as a value)
(§2.3), `FREEZE_LIMB_BAND = [0.78, 0.92]`, `FREEZE_LIMB_GAIN = 2.25`, `FREEZE_LIMB_SIZE = 1.55`,
`FREEZE_LIMB_BREAK = [135°, 10°]`, `FREEZE_DIM = 0.4`, `FREEZE_GREY = '#5c6a86'`, `FREEZE_GREY_MIX = 0.55`,
`FREEZE_TICK_MOON = { n: 14, motes: 6, r0: 2.1, len: [14, 30] }`, `FREEZE_TICK_PLANET = { n: 22, motes: 7,
r0: 1.12, out: 0.40, len: [26, 50], gapHalf: 0.45 }` (`FREEZE_TICK_R0` for a star is the planet's `r0`),
`FREEZE_ROLL = 4`, `FREEZE_FLASH = { gain: 1, white: 0.45 }`, `FREEZE_TWOS_HZ = 12`, `FREEZE_BREATH_PX = 0.6`,
`FREEZE_MOON_S = 0.3` (the burst micro-slot the pin lands in), `FREEZE_SCATTER_S = 0.16`,
`FREEZE_PIN_SEARCH_S = 1200` (one ambient period).

### 3.3 The pin

`schedule.ts`: `FREEZE_PINS: Record<HeroId, { t: number; path: 'full' | 'forced-scatter' | 'forced-ghost' | 'forced' }>`
computed at module load from each hero's `derpSeed`/`derpPhase`, its parent's seed (for the scatter
clause), and its close shot's composed rig (for the home-faces-camera and in-frame clauses), by the
search of §1.2 with its named fallbacks. A fence test asserts, for the path taken: the moon's pose at
the pin is a burst snap with the jump on, ≥ 0.2 r off its ellipse, with the ghost present (or forced);
the home point faces the camera; the projected pose is inside the picture; and the planet is at scatter
`s` ∈ [0.10, 0.20] (or forced). The galaxy spec's `DERP_STILLS` (pins on the story clock) is replaced
by this: with the derps on the ambient clock, the *held* frame is the still, and the pin is a constant
per hero, not a keyframe. `AMBIENT_POSE` (reduced motion, galaxy §8, scatter §3.4) is the hero's pin.

### 3.4 Performance

Planet-system motes 6,000 + 216 + tracks 120 + one ghost (8k + 216 for a rule hero's system at its
close-up) × 3 copies ≈ 19k–25k instances and 238 tick motes: under a quarter of the
essay's budget, vertex-bound only during the hold, no extra pass, no extra texture; the scatter and
morph add no instances (scatter §3.5). On a 2× phone the copies add two more additive blends over the
planet's 100 px disc: negligible fill.

### 3.5 Reduced motion and the stills

Reduced motion: the ambient clock is stopped at `AMBIENT_POSE` (the hero's pin), so a reduced-motion
reader never sees a moon move and never sees a live derp; the freeze is where they see the defect: the
cut puts the moon off its track beside its ghost on their scroll step, and every dressing element is
scroll-scrubbed (not wall-time), so it works as a hand-scrolled still sequence. `uFlashOn = 0` and
`uTwos = 0` under reduced motion and in test mode: no flash, no 12 Hz breath. The roll is a static tilt
and stays.

No-WebGL stills: the defect section's still is the held frame at local 0.33 (dress 1, before the fix),
rendered with `uAmbient = FREEZE_PIN`, so it is reproducible regardless of wall time. The section's alt
text gains one sentence: the view holds still on the piece, one moon caught off its path beside a
faint double of itself, the planet's dots flung out, marks drawn round both.

## 4. Tests

| Test | What it checks |
|---|---|
| **Purity** (`purity.spec.ts`) | Adds defect 0.265 (the dressing mid-snap), 0.33 (held), 0.395 (the fix on the held moon), 0.413 (release mid-peel). Byte-equal by jump, scroll, and scroll-past-and-back. With `?test=1` the ambient is frozen and the hold overrides it anyway, so the frames are pure in both senses. |
| **Freeze only in focus** (`networkKeys.test.ts`, `network.spec.ts`) | Keys: `freeze.*` and `camera.roll` are 0 outside defect 0.260–0.421 (and the other close holds once they get theirs); `hold` is 0 or 1 at every key, never between. Render: `?state={"freeze":{"hold":1,"dress":1},"net":{"focus":0}}` at fr-1 differs from the plain fr-1 frame by ≤ 20 px: the dressing multiplies by `net.focus` in the shader, so it cannot appear off a focused system. |
| **The bursts read, as two** (`network.spec.ts`, phone and desktop) | At defect 0.33, from the TS twin's projected centres: the moon's annulus (1.8–3.4 moon-radii) holds ≥ 60 lit px on the phone (≥ 120 desktop); the planet's annulus (`1.12 R + 0.40 R` to that + 50 px) holds ≥ 160 (≥ 300); the planet's annulus restricted to the ±26° gap toward the moon holds ≤ 10 beyond the moon's own dashes; and no lit pixel of the moon's annulus lies inside the planet's inner radius. At 0.25 (live, `?test=1`) both annuli ≤ 8. At 0.395 (`v` 0.26) both annuli hold fewer lit px than at 0.33 and the planet's has moved in toward 1.12 R; **and they are gone after the fix**: at 0.40 and at 0.437 both annuli ≤ 8 lit px, and `?state={"freeze":{"hold":1,"dress":1},"net":{"fix":1}}` at the pin draws no tick mote at all (the TS twin reports every dash gone at `v` = 0). |
| **The ghost reads** | At 0.33 a second moon-sized component (8–60 px²) of the moon's colour lies on the ellipse within 0.6 rad of the moon's home point, and none at 0.25 or 0.437. |
| **The scatter is in the frame** | At 0.33 the planet-system's lit pixels outside the planet's 1.05 R disc number ≥ 400 (phone); at 0.437 ≤ 60 (the shell is a sphere again). The limb test below masks motes with `k` > 0 using the TS twin (scatter §5). |
| **The limb reads** | The "bubble, not a blur" rule tightened for the held frame on the un-scattered motes: limb annulus (0.8–1.0 R) ≥ 2.4× the inner disc's mean brightness at 0.33 vs ≥ 1.8× at 0.25. |
| **The split reads** (mode A) | Inside the planet-system's rectangle at 0.33: ≥ 300 ember-dominant px (r > 200, r > b + 90, r > g + 70, test 12's rule) and ≥ 300 blue-dominant px outside the base disc's limb; at 0.25 ≤ 20 ember-dominant. At 0.395 the ember count falls to ≤ 40 and the amber count (r > 200, g > 140, b < 120) rises ≥ 150. In mode B the ember count is ≤ 20 at every sample and the amber count ≥ 300 at 0.33. |
| **The fix heals the whole piece** | At 0.437 (df-2b's rest): amber-dominant px (r > 200, g > 140, b < 120) ≥ 120 inside the planet's disc and ≥ 12 inside each of the six moons' discs (from the TS twin's projected centres); no lit pixel outside the planet's 1.05 R disc that is not a moon, its track, a neighbour or the dust (the shell is home); the planet's limb annulus is a circle to within 2 px of a fit (the morph is flat); and the TS twin reports every moon on its ellipse (`\|r − r_kepler\| < 1e-3`) and every derp term 0. |
| **Clearance** (`clearance.spec.ts`) | Unchanged rule, now sampling the dressed frames too: at defect 0.33 and 0.395 (both sizes, every `AMBIENT_GRID` pose: the hold makes them identical) the topmost lit pixel (the planet burst's top dash, rolled) is ≥ 8 px under the text panel's bottom. Expected margin ≈ 300 px phone / 340 px desktop. |
| **Flash rate** | Keys: exactly one `freeze.flash` pulse per section, width ≤ 0.005 local, peak ≤ 1; the pulse's window contains no auto-advance stop (`autoStops` ∩ [0.260, 0.264] = ∅). Render: with `prefers-reduced-motion: reduce` the 0.261 frame equals the 0.2605 frame with `flash` forced 0 (`reducedMotion.spec.ts`). |
| **Twos** | `?test=1`: two shots 3 s apart at 0.33 are byte-equal (no breath in test mode); without `?test=1` and reduced motion off, they differ by ≤ 400 px and only inside the planet-system's rectangle and the two bursts' annuli. |
| **Parity** (`parity.spec.ts`) | `?lib=freeze`: `freezeCopy`, `freezeLimb`, `freezeTick` (both sources, the gap and the clip) over a grid of dress/flash/copy/variant/mode/scatterOut and both aspects; the node cases add "defect 0.33, `P1` held" and "fix 0.395, `P1` held and fixing". |
| **The pin fence** (`schedule.test.ts`) | §3.3, with the path named. |
| **Auto-advance** (`autoAdvance.spec.ts`) | Stops at 0.238, 0.358 and 0.437 (± 0.002) with the new leaves in `sceneMotion`; none inside [0.260, 0.292], [0.37, 0.405] or [0.405, 0.421]. |
| **Content** (`content.test.ts`) | Page 7 has three beats; df-2's and df-2b's dwells clear the lint; the words fence (galaxy §6) passes on "So you fix it." |

## 5. Mocks (phone first, 390 × 844 at 2×)

`<scratchpad>/freeze-mocks/`:

- **`before-after-pair.png`** — left, the focus as designed today (push-in done, neighbours faded) with
  the moon and the shell at the same pinned pose; right, the freeze frame. (`before-focus.png`,
  `after-freeze.png` at full size.)
- **`enter-leave-strip.png`** — eight frames, two rows: live at 0.250 (df-1's rest, the moons on their
  ellipses), the cut with the flash at 0.261 (the moon has jumped off its ellipse beside its ghost, the
  planet a cloud), the roll and dim coming in at 0.272, dressed at 0.292 (both bursts up), held at 0.330 (df-2's rest), the fix
  landing at 0.395 (the shell re-forming, the moon sliding home and turning amber, the ghost gone, both
  bursts shortening and winking out), the release at 0.413 (no marks left, the roll levelling, the clock
  resumed), df-2b's rest at 0.437 (the
  mended piece running, warm dust on the planet and every moon). (`s1-live.png` … `s8-mended-rest.png`
  at full size.)
- **`compare-pair.png`** — the author's comparison (§2.3): A (ember then amber) beside B (amber
  throughout), before the fix on the left page and after it on the right, each with its caption and
  the twelve-lit moment under it. (`compare-before-fix.png`, `compare-fix-landed.png` at full size; `fix-landed-pair.png` is 0.395 beside 0.40: the dashes winking out, then none.)
- **`reduced-motion.png`** — the held frame with the ambient stopped at the pin and the flash and twos
  off: the same picture.
- **`desktop-freeze.png`, `desktop-compare.png`** — 1440 × 900: the same set; the band is clear.
- **`freeze-mock.html`** (+ `three.module.js`, `three.core.js`, `literata-400.woff` beside it, all
  relative; served over http; no query string) — the generator of every frame above and **the animated
  page**: buttons *before: focus, no freeze* / *the freeze frame* / *play the beat* (page 7 at
  auto-advance pace with its three rests, looping) / *compare* / *pause*; a scrub slider over local
  0.20–0.49; toggles for the flash, reduced motion, the ticks, the split, the tilt, and
  *compare: fix landed*. The moons run on a wall-time ambient clock on Kepler ellipses that precess; the
  defect moon derps on the galaxy's schedule (burst with its ghost and quantised stutter, scatter of its
  dust, skip, stall, reverse, wobble by the §12.3/§2.2 weights); the hero planet breathes (the morph)
  and scatters on its own schedule. The readout names the phase, the shown clock, the pin's search path
  and what the moon and the shell are doing.

What the mock is: a three.js stand-in with the galaxy's bodies (a planet of 0.30 with six moons of
0.10 on three ellipses, three neighbour planets and the star with its glow, dimmed), the derp vocabulary
on the ambient clock, the morph and scatter as a point shader on the shell, and the freeze as three
draw passes of the same planet-system (base, cold copy, warm copy) carrying the limb and flash terms;
the two bursts as points placed in the view plane; the roll on the camera's up vector; the
house text band and scrim; and, for the comparison, one star's (one plan's) pieces: four planets-with-
moons lit ember whole and the fixed one blue with warm dust on its planet and moons. What it is not: the mote shaders, the instanced node set, the streams
flowing, the lighting pass, the level of detail, or the real camera rig (its framing is approximated).

## 6. Recommendation

Build it as one task after the galaxy revision's Task 3 (the node set on bodies) and the scatter's
`shellWarp`, before the shots and keys, since the freeze adds four leaves and reads the hero moon
through `nodeWorld`: the mirror pair `freeze.ts`/`freeze.glsl` and its parity mode first (half a day,
pure), then the copies, limb, dim and flash terms in `node.*` and the tick instances (a day),
then the roll in the rig, the split beat and the keys (half a day), then the tests of §4 (half a day).
Keep the flash on; pick the warm copy's colour on the mock's comparison (§2.3, A recommended); the
beat split is decided.
