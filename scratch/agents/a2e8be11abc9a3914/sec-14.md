
## 14. Revision 6: the core is the rules, a star is a plan, a planet with its moons is a piece of code

The author re-decided the mapping (approved: "yes go with that mapping"). This section supersedes §1
(the mapping), §2.1's neighbourhood, §5.3 (the twelve), §6 (the script pass), §8's per-beat table,
§13's pins and the freeze-frame note in §7 where they name bodies; everything else (orbits §12.1,
track fading §12.2, derps and bursts §4–5 and §12.3, sizes and counts §13, LOD §3, glow §4, two
clocks §3.1, clearance §3.4 and §8) stands with the re-scoping below.

### 14.1 The mapping

| Picture | Story | Count | Where |
|---|---|---|---|
| **the galaxy's bright core**: a few large bodies | **the rules** ("At the centre, the rules every agent reads before it starts"; "one place at the centre: one incorrect rule" is one of them) | 6 (R_a, R0, R_b, R_c, R1, R_d) | within 12 units of the galaxy's centre, R0 at the middle |
| **a star** with its own solar system | **a plan** ("Around them, the plans") | ~30 scripted + filler; thousands of background stars are other teams' plans and never get detail | the neighbourhood: the arm stretch nearest the core, radius 40–90 |
| **a planet with its moons** | **one piece of code**; the moons are its parts | 1–9 planets a star, 0–6 moons a planet; the bike's planet has 7 | on ellipses round its star |
| **a stream** | lineage: core → star (the rule a plan was written from), star → planet (the plan a piece was built from), planet → planet sideways (a copy) | | |

Why it is the right mapping for the words: the core is the one place in a galaxy that is literally
"the centre", and the rules are few, large and slow there; the plans are many and "around them"; the
code is "out at the edge" of every system; and the thing the reader is shown closest, the bike, is a
*whole piece with parts*, a planet with moons, which is what it was in Act I (a frame with wheels,
bars, saddle, basket). "All of it is one system" lands on the first frame holding a plan's star with
its planets (ly-5/ly-6), and the galaxy wide (fr-1) is the whole with its bright core.

### 14.2 The generator (replaces §2.1's neighbourhood and §13's pins)

- **The core**: six rule bodies, `R` 1.4, 900-mote lattice shells, a glow sprite capped at 24 px, at
  seeded spots within 12 units of the galaxy's centre (R0 at the centre), drawn at every level
  (the core *is* the bright core of §2.1: its haze sits under them). They do not orbit; the galaxy's
  rigid turn carries them.
- **The neighbourhood**: a dozen scripted plan-stars (P_a, P1–P7, Q1–Q3 and fillers to the lineage's
  ~30) on the arm stretch nearest the core (radius 40–90, bearing 0.9, spread 90 × 70), each with
  `lineage` = its rule's core body, streams core → star drawn at the neighbourhood and system levels
  (not at the galaxy wide: there the arm is the picture). Background stars as §2.1, minus the
  neighbourhood's exclusion (now 50 units round the neighbourhood's centroid).
- **Stars** (plans): 1–9 planets, orbits as §12.1 and §13 (`2 + floor(8 u²)`, spread to the 9.6
  bound), shivering only if the plan carries the defect.
- **Planets** (pieces): sizes as §13; 0–6 moons as §13, tracks relative to the planet; the derp, the
  burst, the morph and the scatter of docs/specs/2026-10-07-morph-and-scatter.md rev 2 all belong to
  the **planet**, and its moons derp and burst with it (a cracked planet's moons are cracked).
- **Pinned by the story**: P1 has 4 planets (C1 the fixed one, C2–C4), P2 3 (C5, C6, C9), P3 3 (C8,
  C10, C7), all built from R0; P_a has the bike's planet N0 first (7 moons) and two more; R1 is born
  in the core at up-1 and Q1/Q2 are stars written from it. The copies C7 and C9 keep their sideways
  streams.

### 14.3 The reflow: the bike's parts become the planet and its moons

The bike's 16 parts (`src/mechanisms/bike/index.ts`) map to the first piece of work as:

| Moon | Parts | Why one moon |
|---|---|---|
| (the planet itself) | `frame` | the body everything hangs on; `ground` and `loose-bolts` are the stage and the vibe-build's debris, not parts of the piece: they fall into the planet's shell as its dust |
| 1 | `front-wheel` | the two wheels are the bike's two biggest parts and each reads as a body on its own |
| 2 | `rear-wheel` | |
| 3 | `fork` + `handlebars` | the steering, one assembly |
| 4 | `cranks` + `pedal-left` + `pedal-right` | the drivetrain |
| 5 | `saddle` | |
| 6 | `basket` | the part Act I drops in from above; its moon lands last |
| 7 | `mudguard-front` + `mudguard-rear` + `brake-front` + `brake-rear` | the fittings |

So the bike's planet has **seven moons**, on three tracks (3 / 2 / 2), sized by each group's share of
the bike's motes (the wheels largest, the fittings smallest, all ≤ 0.35 of the planet). The reflow
(§8, revision 2's `moteBodyRest`) becomes per part: a mote of part group `g` reflows onto moon `g`'s
shell (or the planet's for the frame and the dust) by the same hash-on-a-sphere, the moons already
running on their tracks as the bike loosens, so "the bike becomes the first piece" is the frame
contracting into a planet while its wheels, bars, saddle and basket go into orbit round it. The
zoom-out then rides the ladder: the bike's planet with its moons (1.6 across) → its star P_a with
its planets (19) → the neighbourhood (90) → the galaxy with its core (440).

### 14.4 The defect, re-scoped

- **A piece carries the defect as a whole**: its planet breathes (the morph), scatters (the scatter,
  hard cuts) and derps on its orbit (skip, stall, reverse, burst, §4–5, §12.3), and its moons stutter
  and burst on their tracks; "one piece of code has a defect" is one planet with its moons, and the
  fix (warm motes on the planet and its moons) heals the whole piece: the morph's amplitude goes to 0,
  the scatter counter stops, every derp term is multiplied by `v`.
- **A star shivers only if its plan carries it** (P1–P3, Q1, Q2); the core's R0 and R1 shiver (the
  rules that carry it); every other body is perfectly smooth, which is the tell.
- **The twelve** (df-5): the three plans written from the incorrect rule and the nine pieces built
  from them: **stars P1, P2, P3 and planets C2–C10**, lit ember; C1, P1's first planet, amber among
  them. The "step back" shot frames the three stars (about 60 units across, 6 px per unit on a
  phone): a lit star is a 12 px ember disc with its glow, a lit planet a 3 px ember point (the planet
  points' LOD at that range, drawn with a 3 px floor and its ember dust) on a faint orbit. **Test 12**
  counts three ember components ≥ 60 px² and nine of 8–60 px², the amber one excluded by its channel
  order as before. The core's R0 is not lit yet (the highlight has not gone up: tr-2).
- **Far**: moons and tracks are hidden below 60 px of system radius; a planet's scatter and morph are
  multiplied by the planet-shell ramp (25–50 px), so the far limits hold by construction at the
  neighbourhood and galaxy wides and by measurement at the close-ups (the mock: skip 1,192 CSS px
  near, burst 967, scatter SCATTER_NEAR; far 7).
- **The up-stream** (up-1): a piece's stream runs inward from a planet (C7) to the core, where a new
  rule body (R1) kindles: "now the defect is in the rules too"; Q1 and Q2 are then stars written
  from it, out on the arm.

### 14.5 Each beat (replaces §8's table)

| Beat | On screen | Camera (bearing, elevation, distance, fov, frame; target) · lamp |
|---|---|---|
| zo-1, zo-2 | the bike's frame contracts into a planet, its wheels, bars, saddle and basket into moons; the camera lifts: P_a's star and planets, the neighbourhood, the galaxy with its core | the zoom-out: d 1.6 → 640, target planet → star → neighbourhood → core |
| ly-1 | P_a's system: the bike's planet and two others wheeling round the star, streams arriving | (20, 60, 2.7 r_out, 38, 0; P_a) · 2 |
| ly-2 | the core: six large bodies, slow, every stream leaving outward | (30, 64, 30, 40, 0; the core) · core |
| ly-3 | the stars around the core: the neighbourhood's plans, each fed by a stream from a core body | (0, 82, 120, 40, 0; the neighbourhood) · 3 |
| ly-4 | one star's outer planets: small pieces with their moons, quick to appear | (20, 66, 9, 40, 0; P_a's outer planet) · 1 |
| ly-5, ly-6 | one plan's system whole: the star, its planets, their moons, the stream from the core | (−10, 72, 2.7 r_out, 40, 0; P_a) · 2 |
| fr-1 | the galaxy: the bright core, two arms, the slow turn | (0 → 40, 86, 640, 40, 0; the core) · 0 |
| df-1, df-2 | dive to C1, the bike's sibling piece under P1: a planet with moons; it breathes, scatters, its moons burst; the freeze; the fix | (−35, 32, 3.0, 36, 1; C1) · 1 |
| df-3..5 | step back to P1, P2, P3: three stars and nine planets ember, C1 amber | (−10, 74, 58, 40, 0; the centroid of P1–P3) · the three systems and the core |
| up-1 | the stream from C7 inward to the core; R1 kindles there, shivering | the follow: C7 → the core; (60, 60, 24, 38, 0; R1) · core |
| the second fix | dive to C5 (P2's first lit planet), the fix, pull-out | (−35, 32, 3.0, 36, 1; C5) · 1; then the neighbourhood |
| up-2 | the neighbourhood: lit stars and planets under R0 and R1, two amber | (0, 82, 120, 40, 0; the neighbourhood) · 3 |
| re-1..3 | the mark visits the newest planets of P5, Q2, P6; a stream from the core feeds it | (−170, 68, 2.7 r_out, 38, 0.5; P5) · 2 |
| tr-1 | planet → star → core along the lit streams | the climb |
| tr-2 | R0 close: a large body in the core, shivering; the pull-back and the surge outward to its stars, their planets, the mark, and R1 | (−25, 35, 8, 36, 1; R0) → (−10, 62, 30, 40, 0; the core) |
| fx-1..3 | warm motes on R0, then R1; new stars and planets form clean | (−15, 35, 8, 36, 0.75; R0), pan to R1; (20, 70, 60, 40, 0; between the core and the neighbourhood) |
| fx-4 | the sweep: core → stars → planets, outward | (0, 82, 120, 40, 0; the neighbourhood) · 3 |
| ls-1 | overhead of the core: the few large bodies, the stars around them, the arms fanning out | (10, 80, 40, 40, 0; the core) · core and 3 |

`cylinderTop` keeps its four radii with the core added (a lit set of the core is a disc of radius 14).

### 14.6 Script draft 4, line by line (replaces §6)

Every line survives word for word; the stage directions move to this mapping.

| Beat | Line | Stage direction becomes |
|---|---|---|
| zo-1 | Now let's zoom out. | the bike's frame gathers into a planet and its wheels, bars, saddle and basket into moons going round it: the bike becomes the first piece of work |
| zo-2 | You want a hundred things built, and the agents build all day. | the camera lifts: the piece's star and its other pieces, the neighbourhood of stars, the arms, the bright core at the centre; the first piece one of hundreds |
| ly-1 | Each piece of work is built from what its agent reads. | medium on P_a's system: pieces (planets with moons) forming round their star as streams arrive from it |
| ly-2 | At the centre, the rules every agent reads before it starts. | the camera flies in to the core: a handful of large bodies, slow to change, streams leaving them outward. **Unchanged from draft 4** |
| ly-3 | Around them, the plans: the instructions for one piece of work. | out to the stars around the core, each fed by a stream from it. **Unchanged** |
| ly-4 | Out at the edge, the code, written from the plans. | out along a stream to a star's outer planets: pieces with their moons, quick to appear, the newest farthest out |
| ly-5 | Rules shape plans, and plans shape code. | one plan's system whole, with its stream from the core |
| ly-6 | All of it is one system. | hold on it |
| fr-1 | From far away, everything looks right. | the galaxy with its core; every star a point, every piece unseen. **Unchanged** |
| df-1 | Come closer. Out here, one piece of code has a defect. | dive to one planet with its moons far out in a star's system, like any other |
| df-2 | Up close, if you watch, you can see it. So you fix it. | the planet breathes, comes apart and re-forms; a moon stutters; the person's work lands on the planet and its moons; it runs smooth. **Unchanged in words** |
| df-3..5 | Now step back. / … / Twelve new defects. You fixed one. | pull back to three stars: the three plans written from the rule and the nine pieces built from them, lit; the fixed one dark among them |
| up-1 | One agent wrote down what it built… Now the defect is in the rules too. | a stream runs inward from a piece, past its star, to the core, where a new large body forms. **Unchanged** (draft 4 already says "inward … to the hub") |
| up-2 | You cannot fix them one at a time as fast as they are made. | the neighbourhood: lit stars and pieces, the two fixed ones lost among them |
| re-1..3 | So you ask a reviewer… / …all fine. / …read the same rule. | the mark passes over new pieces at the edge of a star's system; a stream from the core feeds it. **Unchanged** |
| tr-1 | Follow the defects back. | inward along the lit streams: pieces, their stars, the core. **Unchanged** |
| tr-2 | They all lead to one place at the centre: one incorrect rule. | the source: a large body in the core; up close it shivers; the surge fans out to its stars, their pieces, the mark, and the second body. **Unchanged** |
| fx-1..3 | Fix the rule. / And fix the rule an agent wrote from it… / Now new work built from them is correct. | warm motes on the source; pan across the core to the second body; new stars and pieces form clean. **Unchanged** |
| fx-4 | Then trace everything built from the incorrect rule… | the sweep core → stars → pieces. **Unchanged** |
| ls-1 | The closer to the centre a thing sits, the longer you look at it. | overhead of the core: the few large bodies, the stars around them, the arms fanning out to the frame's edge. **Unchanged** |

Draft 4's introduction and "Words" paragraph already describe this picture ("one small body with its
satellites far out on an arm", "a few large bodies at the hub, a ring of middling ones around them,
the small ones strung out along the arms", "the hub, the ring and the arms; bodies and the
satellites that go round them"): no edit is needed there. The optional ly-2 edit of §6 is withdrawn.

### 14.7 The freeze frame and the morph-and-scatter spec under this mapping

The held subject is **the planet C1 with its moons** (the planet-system, lamp level 1); the ticks
burst round the planet; the pins search C1's own schedule for a scatter or a burst (the author's
"sense" moment is the piece coming apart), and R0's for a shiver. The morph-and-scatter spec's §2.3
table re-reads with "planet = a piece of code, star = a plan, core body = a rule": the hero planet is
C1 (6,116-mote lattice), other cracked planets are the lit nine (300 motes), moons are parts (36),
cracked stars are P1–P3 (700, shiver and scatter), the core's R0 and R1 (900) scatter as the stars
do.

### 14.8 Mocks and tests (delta)

Mock modes: **The bike's planet: healthy vs defect** (the pair, seven moons each, the defect planet
scattering and its moons bursting), **One plan's system** (P_a: the bike's planet among its
siblings), **The twelve** (P1–P3 with the core at the frame's edge), **The neighbourhood** (a dozen
stars and the core, streams from the core), **The galaxy** (core, arms, dust), and the zoom play.
Stills: `close-strip.png`, `burst-strip.png`, `scatter-strip.png` (the planet coming apart and
re-forming, seven frames), `system.png`, `twelve.png`, `hood.png`, `galaxy-wide.png`,
`zoom-strip.png`. Tests: test 12 as §14.4; the LOD test's expected levels per §14.5; the pins per
§14.7; the reflow test checks every bike mote lands on its group's moon or the planet.
