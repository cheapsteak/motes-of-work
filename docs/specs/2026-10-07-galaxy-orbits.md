# Act II on the galaxy: one solar system per rule, a galaxy of thousands, and the defect as a derp

*Status: design for review, with mocks; revision 3 (the author's second look at the orbits mock: one
solar system, a galaxy that looks like one, detail by zoom; and "some amount of glow might make
sense"). Date: 2026-10-07. Follows the form options (docs/specs/2026-10-07-network-form-options.md
§S4) and replaces the crack (docs/specs/2026-10-07-defect-shape.md) and the cube bodies of the
storyboard's §12 / Task 8 (docs/specs/2026-10-06-act-2-storyboard-and-network.md). The words are
script draft 4 (docs/script/act-2-draft-4.md); §6 says which lines the mapping touches. The freeze
frame (docs/specs/2026-10-07-freeze-frame.md) sits on this; §7 says what it must change. Mocks: §9.*

## 0. The author's asks, and what they decide

> Galaxy feels great; … things that look like atoms and molecules (planets and moons?) … something
> that looks a bit derpy, like the sphere and smaller things in its orbit "derp" or spaz out once in
> a while. … It's a Galaxy. Things should move in the Galaxy.

> The system should probably look like one solar system rather than a bunch of them. The Galaxy
> doesn't look like a galaxy, should have much more systems. Systems can shrink to look like just
> stars. Different levels of detail at different zoom. Some amount of glow might make sense fwiw.

Agreed with the author: **story motion is a pure function of scroll** (camera, zoom-out, growth and
births, highlight, fixes, the reviewer's mark, the sweep) and **ambient motion runs on wall time and
never stops** (orbits at every level, the galaxy's turn, the derps). Still binding: phone first
(390 × 844); the text sits above the picture; every piece crisp and countable at every zoom, and no
return of the big overlapping soft discs that fogged the middle and bottom into blur; reduced motion
honoured; the GLSL/TS mirror discipline.

Five decisions, each argued below:

1. **Star = a rule, planets = the plans written from it, moons = the code built from each plan**
   (§1). A piece of code is a moon; the plan it came from is the planet it goes round; the rule both
   read is the star at the centre. One rule is one solar system, and "All of it is one system" is
   literal.
2. **The galaxy is thousands of stars** (§2): a two-arm spiral with a bright core and dust between,
   2,400 stars and 4,000 dust motes on a phone, turning rigidly once in twenty minutes. The essay's
   six rules are six of those stars, a neighbourhood 70 units across on one arm; every other star is
   background and never gets detail.
3. **Detail by zoom** (§3): a system is one crisp star sprite below 10 px of projected radius, a star
   with planet points on faint orbits to 60 px, and the full orbits, moons and derps above 120. Every
   hand-over is a brightness ramp of a crisp element, never a geometric blur, and at most two
   systems are ever at full detail (phone budget §3.4).
4. **Glow, bounded** (§4): a star is a bright core with a tight halo inside a sprite capped in
   pixels (3.5 px for background stars, 5–18 px for the six), the galaxy's core has one faint soft
   haze, and nothing else glows. Halos can never merge because each is capped below its neighbour
   spacing at the only shot where they are close.
5. **The defect is a derp of the body itself** (§5): a moon stalls, runs backwards, drifts off its
   track and snaps back; a planet does the same on its orbit; a star shivers in place; all on the
   ambient clock, inherited down the lineage, settled by the fix.

## 1. The mapping: star, planets, moons

*Superseded by §14 (revision 6): the core is the rules, a star is a plan, a planet with its moons is a piece of code. Kept for the record.*

### 1.1 Why star = rule

| | Star = rule, planets = plans, moons = code (chosen) | Star = plan, planets = code, moons = parts | Star = the whole neighbourhood, planets = rules |
|---|---|---|---|
| "Rules shape plans, and plans shape code" | the orbital hierarchy *is* the lineage: a plan goes round the rule it was written from, a piece of code round the plan it was built from | plans are stars with no rule above them: the top of the spine is lost | rules are planets round nothing the script names |
| "At the centre, the rules" / "Around them, the plans" / "Out at the edge, the code" | true inside every system: the star at its centre, the planets around it, the moons at its edge | false (code would be "around") | true of one system only |
| "All of it is one system" (ly-6) | one solar system, said at the first frame that holds one whole | a system is a plan: too small a thing for the line | fine (ly-6 deleted by the author, 2026-10-09: "system" is ambiguous here) |
| "One place at the centre: one incorrect rule" (tr-2) | the source is the star of its system | the source is a planet | fine |
| The up-stream ("now the defect is in the rules too") | a moon's stream reaches out and a **new star kindles** nearby: a new system, which carries the defect | a new planet | a new planet |
| The piece of code the reader watches (df-1/2) | a moon on a track round its planet; the moon itself derps | a planet | a moon of a rule: three hops from the rule in the picture, one in the words |
| The bike's piece at the zoom-out | a moon: the smallest thing, then its planet, its star, the neighbourhood, the galaxy: five powers of ten, all literal | a planet: four | a moon |
| Countable twelve | three planets and nine moons of one star, framed by one medium shot | nine moons of three stars: three shots | three planets and nine moons |

**Chosen: star = rule.** It keeps the script's spine word for word (§6), makes the new line literal,
and puts the thing the reader watches at the bottom of the hierarchy where the words put it. The
cost is scale: a moon is a fifth of a unit across, so the close shot frames its planet and the
camera rides the moon round the planet (the tracking of §8, unchanged in kind).

### 1.2 The bodies

| | Body R | Shell motes | Orbit round its parent | Period (ambient s) | Its children's tracks | Outer radius (with children) |
|---|---|---|---|---|---|---|
| star (rule) | 0.90 | 700 | in place (the neighbourhood rides the galaxy's turn) | — | five planet orbits: 2.4, 4.0, 5.6, 7.2, 8.8 | 9.6 |
| planet (plan) | 0.30 | 300 | its star, one of the five orbits | 60, 90, 120, 150, 180 by orbit | three moon tracks: 0.36, 0.52, 0.68, two moons each | 0.78 |
| moon (code) | 0.10 | its planet's row pitch, at least 3 × 6 (18) (§1.3, §13) | its planet, one of the three tracks | 6, 9, 12 by track | — | 0.10 |

Every body is a mote shell (crisp at its limb, §1.3) and one instanced icosphere with a rim term;
the six stars also carry a glow sprite (§4). Orbits and tracks are dotted rings of static motes drawn
by the parent (90 motes per planet orbit, 40 per moon track), tilted by up to ±0.1 rad each so no two
are the same ellipse. Each track holds two moons half a turn apart; a planet orbit holds one planet.
A system's outer radius is 9.6 and adjacent planet orbits are 1.6 apart, more than two planet-systems
(2 × 0.78), so no two planets' moons ever meet. End counts 6 rules, 30 plans, 180 code: five planets a
star, six moons a planet, every slot a scripted or filler node as before, born on the growth clock
into a slot that exists from ambient 0 (the revision-2 rule: the stream reaches a moving point and the
builders fly to it).

### 1.3 Crisp, and how a body is built

A uniform mote shell is brightest at its limb, so a shell is a hard-edged bubble at any size; the
icosphere's rim (`pow(1 − |n·v|, 2.6) × 0.55`, fill 0.035) adds a 1–2 px limb and a faint fill. Moons
are fine-dotted spheres of their planet's material, at the author's request (a dark solid fill under a
few big motes read as a moon with moons of its own): a moon's lattice keeps its planet's row pitch, so
its motes are the planet's grain on screen, over the planet's faint fill and rim; and a moon under
4 px across is a single point, handing over to its dotted sphere by 8 px, so a 3 px moon is a dot, not
a ring. Being built: the stream's dots run to the body's slot, the shell wraps from the stream's arrival
point, and (for a planet) each moon is a landing event in the last 30 % of its duration, landing on
the moving moon. Landings flare as before.

## 2. The galaxy

### 2.1 Thousands of stars

`src/network/galaxy.ts` (new, pure): `generateGalaxy(seed, tier)` draws `N_STARS` (2,400 phone /
4,000 desktop) background stars and `N_DUST` (4,000 / 8,000) dust motes in the galaxy's frame:

- **Radius** 220 world units. A star's radius is `R · u^0.75`, a dust mote's `R · u^0.6` (denser
  toward the core); 22 % of stars are **core** stars at 0.35 of their radius with a uniform bearing;
  the rest sit on one of **two arms**, a logarithmic spiral `θ = arm · π + ln(r / 2) / 0.28`, with a
  scatter of ±0.42 rad narrowing toward the rim; dust scatters ±0.9 rad. No background star within
  60 units of the neighbourhood's centre (its own stars own that stretch of the arm) except 15 % of
  the draws, which keeps the arm continuous through it.
- **Brightness** per star `0.35 + 0.65 u²` (a few bright, most faint), 12 % warmed toward white;
  dust at 0.08–0.18.
- **The turn**: the whole galaxy turns rigidly about its core, `uGalaxyTurn = 2π · ambient / 1200`:
  once in twenty minutes, so the spiral keeps its shape and the neighbourhood rides its arm at
  0.3°/s (0.6 units/s at radius 118). Rigid, not Keplerian: a flat rotation curve would wind the arms
  up during a long read, and the point of the turn is that the picture is alive, not that it is
  astronomy.
- The **neighbourhood** is at radius 118, bearing 0.9 rad, on arm 0: six stars within a patch 70
  across, the source (`R0`) at its centre and the others at hand-placed spots ≥ 22 apart (two system
  radii plus a margin), `R1`'s slot among them.

The galaxy is drawn as three instanced point sets with a pixel floor and a pixel cap (§3.2): stars
(3.5 px sprites, 1-px core + halo), bright stars (6 px), dust (1 px hard motes); plus one 56 px soft
sprite at the core. It never changes after generation except by the turn.

### 2.2 Powers of ten, literally

| Scale | Across (units) | On a phone at that shot | What the reader sees |
|---|---|---|---|
| the bike's piece: a moon | 0.2 | fills the frame | the bike's motes contracted into one small sphere |
| its planet with its moons | 1.6 | 300 px | the first plan and the six pieces built from it |
| its star with its planets | 19 | 320 px | the first rule's system: five planets, their moons as points |
| the neighbourhood | 70 | 320 px | six stars with planet points, the stretch of arm they sit on |
| the galaxy | 440 | 380 px | two arms, a bright core, dust; the neighbourhood a knot on an arm |

The zoom-out (§8) rides this ladder in one continuous overhead pull-back, the target walking moon →
planet → star → galaxy centre as the distance grows log-linearly from 1.2 to 640.

## 3. Detail by zoom

### 3.1 The thresholds

Detail is decided per star system from its **projected outer radius** `s_px` (9.6 units at the
system's distance through the composed rig, CSS px), computed on the CPU per frame for the six
systems (`uSysPx[6]`) and read by every mote of the system through its root index. Background stars
have no detail at any zoom.

| Element | Appears over `s_px` | Gone below | What it is at its smallest |
|---|---|---|---|
| the star | always | — | its glow sprite, 5 px: a crisp core with a tight halo (§4) |
| planet points and their orbits | 10 → 20 | 10 | a 2 px dot on a 1 px dotted ring |
| planet shells (the bubble) | 25 → 50 | 25 | a 6 px bubble over the dot |
| moons, their tracks, the derps | 60 → 120 | 60 | a 1.5 px dot on a 1 px dotted track |
| streams to planets / to moons | with the planet points / with the moons | | a dotted line between two visible things |

Three levels fall out: **star only** (`s_px` < 10: the galaxy wide, where a system is 9 px), **star
and planets** (10–60: the neighbourhood, where a system is 55 px), **full** (≥ 60: the system shots,
213 px, and the close-ups). The thresholds are in pixels, not distances, so a desktop reaches a level
sooner than a phone, as it should.

### 3.2 No pop, no blur

- **A hand-over is a brightness ramp of a crisp thing.** Each element's brightness is multiplied by
  `smoothstep(lo, hi, s_px)` over its band; below the band it is not drawn (`visible = gain > 0.02`,
  so it costs nothing). A planet point at `s_px` 11 is a dim 2 px dot that brightens to full by 20 px;
  it never changes shape, only light.
- **A pixel floor and a pixel cap on every point.** The point shader clamps `gl_PointSize` to
  [`minPx`, `maxPx`]: 1 px for motes and dust (a moon's motes too), 1.5 px for a moon's point (§1.3), 3.5 / 6 px for background star
  sprites, 5–18 px for the six stars' glow. Nothing ever renders smaller than a pixel (so a far thing
  is a crisp point, not a sub-pixel smear) or larger than its cap (so a glow never spreads).
- **Bodies keep a minimum.** A star's icosphere is drawn at every level, its glow sprite on top; a
  planet's icosphere fades with its shell (25–50 px); a moon's with the moons.
- **The derps are motion of the moons and planets**, so they appear with them: at the neighbourhood
  and galaxy wides there is no moon to derp and the far-invisibility is by construction (the far test
  of §5.4 becomes a check that nothing of the moons is drawn when `s_px` is 40).

### 3.3 How many systems get detail at once

The camera decides. At every shot of the act at most **two** systems are at full detail (the system
shots: the target's; the fx-2 pan: `R0`'s and `R1`'s briefly both above 60 px) and at most six at
star-and-planets (the neighbourhood). The budget assumes 2 full + 4 star-and-planets, and the LOD
test (§10) asserts the counts at every beat sample.

### 3.4 Phone budget (instances)

| Set | Count | When drawn |
|---|---|---|
| background stars + bright stars + dust + the core sprite | 2,400 + 4,000 + 1 ≈ 6,400 | always (one draw each, static buffers) |
| the six stars: shells 6 × 700, planet-orbit dots 6 × 5 × 90, glow 6 | 4,200 + 2,700 + 6 ≈ 6,900 | always (the orbit dots fade by LOD) |
| 30 planets: shells 30 × 300, moon-track dots 30 × 3 × 40 | 9,000 + 3,600 = 12,600 | shells above 25 px, tracks above 60 px, per system |
| 180 moons: shells at their planet's row pitch, at least 3 × 6 (18) each (§1.3, §13) | ≥ 3,240 | above 60 px, per system |
| the hero planet's dense shell (one at a time) | 6,000 | the close-ups |
| streams, dotted (≤ 215 edges × ~14) | ≤ 3,000 | between visible things only |
| bodies: 216 icospheres (star 320 tris, planet 320, moon 80) | 216 instances, ~26k tris | by level |
| **total motes** | **≈ 42,000** | under the network's 76k budget; a phone draws about half of them at any shot |

Measured in the mock (§9): 36,000 neighbourhood instances plus 6,400 background at every shot
(the mock allocates everything and hides by level; the renderer draws by level). The halo and
far-glow quads of the old design are gone; the glow sprites are six points.

## 4. Glow, bounded

The author: "some amount of glow might make sense." Where it makes the galaxy read as a galaxy, and
nowhere that it could fog:

- **A star is a sprite with a core and a tight halo.** Inside a point sprite of diameter `D` px, the
  profile is `core(r) = 1 − smoothstep(0, 0.35, r)` plus `halo(r) = 0.45 (1 − r)²`, `r` the distance from
  the sprite's centre in halves of `D`, zero at the edge. The halo is inside the sprite, so its reach is
  exactly `D / 2` and never more.
- **The cap is the bound.** *As built (Task 1 fix round 2; Task 8 fix rounds 1 and 2):* background
  stars are 2 px (3 px for the brightest 15 %) at every galaxy wide, where the halos must stay apart,
  and grow with nearness to at most 4 px (6 px) at the zoom-out's middle distances (`BG_STAR_SIZE`:
  0.7 and 1.0 world units across), so the arm the camera rises over reads as stars, not specks: the
  legibility the author asked for in the middle of the pull. The text below is revision 5's design.
  Background stars: `D` = 3.5 px (6 px for the brightest 15 %). At the galaxy
  wide on a phone (0.86 px per unit) the median star spacing is 7 px on the arms and 4 px in the core:
  a 3.5 px sprite reaches 1.75 px, half the arm spacing, and the core's overlap is the bright core the
  author asked for, which is the one place a galaxy is allowed to be a glow. The six stars: `D` =
  clamp(5 × R × focal / d, 5, 18) px, a halo reach ≤ 9 px against a neighbour spacing of ≥ 22 units,
  which is ≥ 19 px at the neighbourhood shot and ≥ 100 px at the system shot. No two of the six can
  ever touch halos; no background star can touch one of the six (the 60-unit exclusion, §2.1).
- **One soft disc:** the core's haze, a 56 px faint sprite (0.35 brightness) at the galactic centre,
  drawn only at the galaxy wides where it is the middle of the picture, under the dust. It is the one
  thing in the act that is allowed to be a glow with no core, and it is 15 % of the galaxy's diameter.
- **Nothing else glows.** Planets, moons, orbits, tracks, streams and the neighbourhood's bodies are
  hard motes and limbs as in revision 2; the ember highlight is on crisp parts only.
- **The earlier failure cannot recur** because the thing that fogged the middle and bottom was a halo
  per stack whose radius grew with the stack on screen and overlapped its neighbours' at the wide
  shots; here the only halos are capped in pixels, independent of distance, and are smaller than the
  spacing at every shot where more than one is on screen. A test (§10, "halos apart") projects every
  pair of the six stars at every beat sample and asserts the distance between their centres exceeds
  the sum of their sprite radii; for the background, the generator asserts the arm spacing at the
  galaxy wide.

## 5. The defect as a derp

### 5.1 The vocabulary, by body

A body that carries the defect derps **on its own orbit**: a moon on its track round its planet, a
planet on its orbit round its star. A star has no orbit, so it **shivers in place** (the wobble, at
four times a moon's amplitude so it reads on a 0.9 body) and its light flickers with it. Kinds, drawn
per event on the ambient clock, as revision 2: **stall** (stops dead, catches up), **reverse** (backs
up a quarter turn), **skip** (drifts 0.55 r off its track, lifts 0.2 r, snaps back and rings),
**wobble** (the shiver). `derp-vocabulary.png` shows the four on a moon at mid-event.

### 5.2 Timing on the ambient clock

Unchanged from revision 2: slot `T` = 2.2 s, event `D` = 1.0 s, `t0` hashed inside the slot, kind
hashed per event; duty 45 %, gaps 1.2 s on average and never more than 2.4 s. A reader parked on "Up
close, if you watch, you can see it" sees a derp within two seconds with probability 0.9. A healthy
body's `derpSeed` is `NODE_NEVER` and derps nothing.

### 5.3 Inherited, and the twelve

*The twelve are re-derived in §14.4 (three stars and nine planets).*

The generator's rule is unchanged: cracked ⇔ a stream parent is cracked ∧ born before `CLEAN_AFTER`,
or it is `R0`. A cracked body draws its event kinds from the source's seed with its own phase, so a
moon, its planet and their star stutter in the same order. The twelve under df-5 are `P1`–`P3` (three
planets of `R0`) and nine of their moons: all inside `R0`'s system, which the "step back" shot frames
at full detail (`system-twelve.png`). A lit planet is ember on its shell, rim, orbit and moon tracks;
a lit moon is an ember dot with an ember dust and its track at 0.5; the fixed moon is amber. Test 12
counts three ember components ≥ 60 px² (planets) and nine of 8–60 px² (moons at ≥ 3 px). Beyond
the system (the neighbourhood and galaxy wides) a lit *system* shows as its star tinting ember once
`R0` lights (tr-2) and `R1` with it; before that the galaxy wides show nothing, which is "from far
away, everything looks right".

### 5.4 Invisible far, unmistakable near

Far is now by construction: moons are not drawn below `s_px` 60, so at the neighbourhood wide (`s_px`
≈ 55) a derping moon and a healthy one render the same bytes; test "derp far" asserts a zero diff at
`s_px` 50 and ≤ 20 px at 70 (the moons just fading in). Near: `close-strip.png`, 1,320 CSS px
inside the planet's rectangle at the skip's peak (floor 400 phone / 900 desktop).

### 5.5 The fix

As revision 2: `v` multiplies every derp term, the person motes fall onto the derping body itself
(the moon, the planet, or the star), the body keeps its amber dusting, "the orbit settles". For a
star, the warm motes land on the star and its shiver stops; its planets keep derping until the
sweep reaches them (fx-4 "fix what it already made"), which is the story.

## 6. Script draft 4 under this mapping

*Superseded by §14.6.*

Every line survives; the stage directions move from hub / ring / arms to star / planets / moons, and
two lines are offered small edits for the author.

| Beat | Line (draft 4) | True of the picture? | Stage direction becomes |
|---|---|---|---|
| zo-1, zo-2 | Now let's zoom out. / You want a hundred things built… | yes | the bike's motes contract into **a moon**; the camera lifts: its planet, its star, the neighbourhood's six stars on their arm, the galaxy |
| ly-1 | Each piece of work is built from what its agent reads. | yes | medium on one planet: moons forming on their tracks as streams arrive from the planet |
| ly-2 | At the centre, the rules every agent reads before it starts. | yes, of a system; "rules" plural is the six systems' stars, one centre each | the camera flies in to the star of the first system; the neighbourhood's other stars visible beyond, each the centre of its own system. **Optional edit:** "At the centre of each, a rule every agent reads before it starts." (12) |
| ly-3 | Around them, the plans: the instructions for one piece of work. | yes | the planets on their orbits round the star, each fed by a stream from it |
| ly-4 | Out at the edge, the code, written from the plans. | yes | the moons on the outer planets' tracks, quick to appear, the newest on the outer tracks |
| ly-5 | Rules shape plans, and plans shape code. | yes | the system wide: star, orbits, planets, tracks, moons, streams running outward |
| ly-6 (new) | All of it is one system. | **literally** | hold on the system; the strongest landing the line can have (ly-6 deleted by the author, 2026-10-09: "system" is ambiguous here) |
| fr-1 | From far away, everything looks right. | yes | pull out to the galaxy: the system a star among thousands, the slow turn |
| df-1 | Come closer. Out here, one piece of code has a defect. | yes | dive to a moon of `P1` on an outer track; the camera rides it round its planet |
| df-2 | Up close, if you watch, you can see it. So you fix it. | yes | the moon derps; the freeze (§7); the fix lands on the moon |
| df-3..5 | Now step back. / … / Twelve new defects. You fixed one. | yes | the system shot on `R0`: three planets and nine moons ember, one moon amber |
| up-1 | One agent wrote down what it built… Now the defect is in the rules too. | yes | a stream reaches **out** from a moon to where **a new star kindles** nearby (`R1`'s slot in the neighbourhood); its system forms round it, shivering. (Draft 4 says "inward … to the hub"; the direction is now outward to a new star.) |
| up-2 | You cannot fix them one at a time as fast as they are made. | yes | the neighbourhood close: lit planets and moons in `R0`'s and `R1`'s systems, two amber among them |
| re-1..3 | So you ask a reviewer… / …all fine. / …read the same rule. | yes | the mark visits the newest moons on `R0`'s outer planets; a stream from the star feeds it |
| tr-1 | Follow the defects back. | yes | moon → planet → star, the lit streams converging |
| tr-2 | They all lead to one place at the centre: one incorrect rule. | yes | the star shivers; the surge fans out to its planets, their moons, the mark, and over to `R1` |
| fx-1..3 | Fix the rule. / And fix the rule an agent wrote… / Now new work built from them is correct. | yes | warm motes on `R0`; pan across the neighbourhood to `R1`; new planets and moons form clean |
| fx-4 | Then trace everything built from the incorrect rule… | yes | the sweep: star → planets → moons, outward |
| ls-1 | The closer to the centre a thing sits, the longer you look at it. | yes | overhead of `R0`'s system: the star, its planets round it, the moons at the edge; the Coda's map is a system's rings |

The draft's introduction ("one small body with its satellites far out on an arm … a few large bodies
at the hub, a ring of middling ones around them, the small ones strung out along the arms") describes
revision 1's picture and should be re-cut to this one: "one small body going round a larger one, in a
system of such bodies round a star, on an arm of a galaxy of thousands". The words fence adds star,
planet, moon, orbit, track, galaxy to the picture's own words the narration may not use; "system"
draft 4 spends once on purpose.

## 7. What the freeze frame must change

docs/specs/2026-10-07-freeze-frame.md transfers whole in mechanism; the mapping moves four things:

1. **The held subject is a moon that is a node.** "The defect satellite" is `C1` itself (a code node
   with orbital elements), not a `defectMoon` of a body: `nodeMoon(defectMoon, uAmbient)` →
   `nodeWorld(C1, uAmbient)` wherever the spec projects the satellite (the ticks' centre, the fix's
   Bezier end, the pin fence). The planet is `P1`; the focused body for the copies, the limb and the
   dim-and-grey is **the planet-system** (`P1` and its six moons, lamp level 1).
2. **The copies ×3 cover the planet and its moons together** (one draw, `P1`'s hero shell 6,000 plus
   its moons' 216), and the moon copies get `FREEZE_MOON_COPY_PX` as written.
3. **Stars derp by shivering**, so the pins for `R0` and `R1` are wobble peaks (`s` = 0.5), not skips,
   and the burst of ticks is drawn round the star at `FREEZE_TICK_R0 × R_star`; the "off its track"
   fence applies to `C1` and `C5` only, and the star pins assert the shiver's amplitude instead.
4. **The level of detail is forced full** on the held system (`uSysPx` is clamped to ≥ 120 for the
   focused system whenever `net.focus` > 0), so the freeze never catches a hand-over.

The skip the cut lands on, the dressing, the leaves, the twos tick, reduced motion and the tests are
otherwise as written.

## 8. The zoom-out, the two clocks, and the camera

*The zoom-out ladder and the per-beat table are replaced by §14.3 and §14.5; the two clocks, the tracking camera and the clearance argument stand.*

**The zoom-out** is one continuous overhead pull-back (elevation 86), distance log-linear from 1.2 to
640 over zoom-out's 2.2 screens, the target walking moon → planet (local 0.08–0.30) → star (0.30–0.55)
→ the galaxy's centre (0.70–1.0), the reflow landing the bike's motes on the moon's shell over
0.04–0.40 (the bike contracts: the moon is a tenth of the bike's size, which is the first power of ten
in one gesture), `stage.motes` to 0 by 0.9, and the first births (`P_a`'s other moons, `R_a`'s other
planets) sliding into the frame-first windows. The mock's **Zoom out ▶** plays it in 24 s and the
slider scrubs it; `zoom-strip.png` is five frames of it. The detail levels hand over at local ≈ 0.45
(moons go), 0.58 (planet shells go), 0.75 (planet points go).

**The two clocks** are revision 2's: every `net.*`, `camera.*` and `clock` key is scroll; `uAmbient`
drives the orbits, the galaxy's turn and the derps, is frozen by `?ambient=` and by reduced motion at
`AMBIENT_POSE`, and the freeze frame folds its pin into it. A frame is a pure function of (scroll,
ambient).

**The camera tracks** a moving target resolved at the current ambient (a moon, a planet, a star, the
neighbourhood's centre, the galaxy's centre), with target-relative keys, as revision 2. The
neighbourhood rides the galaxy's turn at 0.6 units/s, which every target inherits, so the
neighbourhood shots are still: the background stars drift with it (rigid turn), and only the galaxy
wides show the turn against the frame.

**Clearance** is revision 2's argument with a larger cylinder: the galaxy is a disc of radius 220
fixed in its own frame, height 2.2 (dust scatter) plus the moons' lift; the **lamp** by membership
(levels: 1 the planet-system, 2 the star-system, 3 the neighbourhood: the six systems and the
background within 60 units; as built also 4 the core, 5 a rule's lineage and **6 the arms**, every
star's system lit and the core dark, the zoom-out's middle, Task 8 fix round 1) dims everything else to zero on every shot that is not a galaxy wide, and
the galaxy wides fit the whole disc under the band by distance. `cylinderTop(shot)` projects the lit
set's bounding cylinder (radius 0.78 / 9.6 / 60 / 220 about the target) through the rig and asserts
≥ 8 px under the band on both sizes; the e2e clearance test samples every beat × `AMBIENT_GRID`
(eight poses across the galaxy's 1,200 s turn: 0, 37.3, 149, 311, 487, 659, 853, 1,061).

| Beat | Camera (bearing, elevation, distance, fov, frame; target) | Lamp | Detail at the target |
|---|---|---|---|
| zo-1..2 | the zoom-out above | 1 → 2 → 3 → 0 | full → star-only |
| ly-1 | (20, 55, 3.4, 38, 0; `P_a`) | 1 | full |
| ly-2 | (30, 64, 14, 40, 0; `R_a`) | 3 | full on `R_a`, star+planets on the others |
| ly-3 | (30, 70, 18, 40, 0; `R_a`) | 2 | full |
| ly-4 | (20, 60, 4.5, 40, 0; `P_a`'s outer neighbour) | 1 | full |
| ly-5, ly-6 | (−10, 72, 26, 40, 0; `R_a`) | 2 | full |
| fr-1 | (0 → 40, 86, 640, 40, 0; the galaxy's centre) | 0 | star-only everywhere |
| df-1, df-2 | N8a (−35, 32, 4.5) → N8 (−35, 32, 3.0, 36, 1; `P1`, the camera riding `C1`'s planet) | 1 | full |
| df-3..5 | (−10, 70, 26, 40, 0; `R0`) | 2 | full |
| up-1 | the follow: `C7` → `R1`'s slot; (60, 60, 20, 38, 0; `R1`) | 3 | full on `R1` |
| the second fix (the author deleted the wordless second fix, 2026-10-09: redundant) | (−35, 32, 3.0, 36, 1; `C5`'s planet); then (0, 82, 120, 40, 0; the neighbourhood) | 1; 3 | full; star+planets |
| up-2 | (0, 82, 120, 40, 0; the neighbourhood) | 3 | star+planets |
| re-1..3 | (−170, 68, 9, 38, 0.5; `P5`) | 1 | full |
| tr-1 | the climb: `V9` → `P5` → `R0` | 2 | full |
| tr-2 | (−25, 35, 6.5, 36, 1; `R0`) → (−10, 62, 22, 40, 0; `R0`) | 2 | full |
| fx-1, fx-2 | (−15, 35, 6.5, 36, 0.75; `R0`), pan to the same on `R1` | 2 | full |
| fx-3 | (20, 70, 40, 40, 0; between `R0` and `R1`) | 3 | star+planets, planet shells at the two |
| fx-4 | (0, 82, 120, 40, 0; the neighbourhood) | 3 | star+planets |
| ls-1 | (10, 80, 24, 40, 0; `R0`) | 2 | full |

## 9. Mocks (phone first, 390 × 844 at 2×)

`<scratchpad>/galaxy-mocks/`
(the publishable copy of the animated page: `…/orbitpub/orbits.html`):

- **`close-strip.png`** — one planet with its six moons at the close shot, four ambient times across
  one skip; healthy row over defect row: the moon leaves its dotted track and comes back.
- **`derp-vocabulary.png`** — skip, stall, reverse, wobble at mid-event.
- **`system-twelve.png`** — df-5: `R0`'s solar system at full detail under the lamp, three ember
  planets and nine ember moons, one amber.
- **`hood.png`** — the neighbourhood: six stars with planet points on faint orbits on a stretch of
  arm, background stars and dust beyond.
- **`galaxy-wide.png`** — the galaxy: two arms, the bright core, dust; the neighbourhood a knot of
  six on an arm.
- **`zoom-strip.png`** — the zoom-out at 0, 0.25, 0.5, 0.75, 1: moon, planet, star system,
  neighbourhood, galaxy; the hand-overs between.
- **`galaxy-mock.html`** (+ `three.module.js`, `three.core.js`, `literata-400.woff`, relative, no
  network) — the animated page: buttons **Close: healthy vs defect**, **One solar system**, **The
  neighbourhood**, **The galaxy**, a **Zoom out ▶** play (24 s, moon to galaxy) with a slider to
  scrub it, pause, the ambient clock and fps, and a status line with the distance, the largest
  system's projected radius, how many systems are at each level and the instance count. A query
  string is optional (`?mode=…&ambient=<s>&zoom=<0..1>&derp=0|1&kind=…` reproduces the stills).

What the mocks are: three.js stand-ins (icosphere bodies with a rim shader, point shells with a pixel
floor and cap, sprite stars, the nested orbits, the galaxy generator, the LOD ramps and the derp as
written, the house text band, the portrait rig), rendered headless and checked by eye at the phone
size, with the fps counter watched in the animated page. Not the generator's births, the mote
shaders, growth, the reflow, the lighting pass or the fix.

## 10. Code changes and tests (delta from revision 2)

| Where | Change |
|---|---|
| **New** `src/network/galaxy.ts` (+ test) | `generateGalaxy(seed, tier)`: stars, bright stars, dust, the neighbourhood's exclusion; determinism; the arm-spacing assertion at the wide shot's scale; tier counts. |
| `src/network/body.ts`, `generate.ts`, `lineage.ts` | The three body kinds of §1.2 with their orbits and tracks (a planet's children on three tracks, two per track; a star's five orbits); `HOOD` (the neighbourhood's place in the galaxy frame and its six star spots); scripted rows name orbit and track slots (`R0` the neighbourhood's centre star; `P1`–`P3` its inner orbits; `C1` on `P1`'s outer track; `R1` the slot ≥ 22 from `R0`); 180 moons are the code nodes. |
| `src/scene/node/*` | `uSysPx[6]` and the LOD ramps (`lodGain(element, sysPx)` in the mirror pair; constants `NODE_LOD_*` in `birth.ts`); the point shader's pixel floor and cap (`NODE_PX_MIN`, per-role caps); the star glow sprite as role `Glow = 4` (one mote per star, size `clamp(5 R focal / d, 5, 18)`, the core-and-halo profile in `mote.frag.glsl` behind a role test); the derp on the body's own orbit (`nodeWorld` applies `derp` to a cracked node's angle/radius/lift, or the star's shiver); the lamp's level 3. |
| **New** `src/scene/galaxy/galaxySystem.ts` + `shaders/star.vert/frag.glsl` | Three static point sets and the core sprite, `uGalaxyTurn`, drawn before the network. |
| `src/timeline/netShots.ts`, `cameraRig.ts`, `keyframes.json` | The zoom-out as the log-linear pull with the walking target; every shot of §8 with lamp level and the expected detail level; `cylinderTop` with the four radii. |
| `src/story/*.md` | Draft 4's stage-direction pass of §6; the words fence. |
| `e2e/*` | **LOD**: at every beat sample the count of systems per level equals §8's column (from `uSysPx` read back) and no moon mote is drawn where `s_px` < 60. **Halos apart**: every pair of the six stars' projected centres are further apart than the sum of their sprite radii; the galaxy wide's arm spacing ≥ 2 × 3.5 px at the median. **Derp far**: zero diff at `s_px` 50, ≤ 20 at 70; **near** as before. **Test 12**: three ≥ 60 px² and nine 8–60 px² ember components on `R0`'s system at the pose. **Bubble, not a blur** on planets at the system shot. **Budget**: instances ≤ 42k motes + the galaxy's tier count; frame time on the test browser. Purity, clearance × `AMBIENT_GRID`, parity (`?lib=derp`, `?lib=body`, `?lib=lod`) as revision 2. |

**Tasks:** 1 the bodies and the galaxy generator (pure, 1.5 days) · 2 the derp/orbit/LOD mirror pair
(pure, 1 day) · 3 the node set with LOD, the glow role, the galaxy draw (2 days) · 4 the reflow onto
the moon (0.5) · 5 the zoom-out, the tracking shots, `cylinderTop` (1.5) · 6 tests re-pinned (0.5).
The freeze frame's tasks follow 3 with §7's four changes.

## 11. Recommendation

One solar system per rule (star, planets, moons), the six systems a neighbourhood on an arm of a
galaxy of thousands that turns once in twenty minutes; detail by projected size with brightness
hand-overs and pixel floors and caps, so a system shrinks to a crisp star and nothing blurs; glow
only as capped star sprites and one faint core haze, bounded below the neighbour spacing at every
shot; the defect a derp of the body itself; the two clocks, the lamp, the cylinder test and the
freeze frame carried over with the four changes of §7. Build the galaxy generator and the LOD pair
first and judge the hand-overs on the mock's zoom play before touching the renderer.

## 12. Revision 4: orbits with life, and tracks that fade with zoom

The author's two notes on revision 3 ("Looks good"), from a phone screenshot of the zoom play at the
neighbourhood level: *"can the orbits not be perfectly static and circular?"* and *"the orbit trails
look way too prominent when zoomed out."* Both are changes to §1.2 and §3.1; the mock and the
publishable copy carry them.

### 12.1 Orbits are ellipses that precess, with Kepler-ish speed

Every orbit (a planet's round its star, a moon's round its planet) gains three seeded elements, all
on the ambient clock and deterministic from the node's seed:

| Element | Planets | Moons | What it does |
|---|---|---|---|
| eccentricity `e` | 0.05–0.22 | 0.05–0.12 | the orbit is an ellipse with semi-major axis `a = r / (1 + e)`, so the designed radius `r` is its apoapsis and the outer bound is unchanged |
| tilt | ±0.25 rad about a seeded azimuth | ±0.20 rad | from overhead the ellipses sit at different angles and openings, not as concentric circles |
| precession | one turn in 400–900 s | 90–200 s | the periapsis turns slowly: `ω(t) = ω0 + 2π t / P`, so no two frames a minute apart show the same ellipse |
| speed | Kepler | Kepler | mean anomaly `M = phase + 2π t / period` → eccentric anomaly by three Newton steps → true anomaly `ν` and radius `a (1 − e cos E)`: faster near periapsis, slower at apoapsis |

The derp is applied after Kepler as before: `Δa` on `ν`, `Δr` on the radius, the lift out of the
plane; the stall holds the moon against a path the eye can still predict because the ellipse is
drawn (§12.2) and `e` is modest. Moons' eccentricities are small enough that adjacent tracks (0.16
apart) never cross (`a e` ≤ 0.08); planets' ellipses may cross a neighbour's annulus at the widest
eccentricities, which is wanted (a system that is not a bullseye), and their tilts keep the bodies
apart in depth. **Clearance bound:** the lift out of the galaxy plane is now `r sin(tilt)`, at most
8.8 × sin 0.25 = 2.2 for a planet and 0.68 × sin 0.2 = 0.14 for a moon, so the cylinder of §8 has
height 2 × (2.2 + 0.14 + 0.1 + the dust scatter 1.1) = 7.1, still fixed in world; `cylinderTop` uses
it. Unit tests for the pair (`?lib=derp` gains the Kepler step): the solver converges to 1e-6 at
`e` ≤ 0.3; a body's distance from its parent lies in `[a (1 − e), a (1 + e)]` at every sample; the
precession is a pure function of `t`; `e` = 0 reproduces revision 3's circles exactly.

Period and precession are in the node texture with the other orbital elements (T1 grows by `e`,
`ω0`, `P`: one more texel per node), and the dotted track is drawn at its current orientation (the
track motes carry the true-anomaly parameter and are placed by the same ellipse function in the
vertex shader, so a track precesses with its body at no CPU cost).

### 12.2 Tracks fade with zoom

The dotted orbits and tracks get their own ramp: **invisible below a system radius of 60 px, full by
120 px** (`smoothstep(60, 120, s_px)` on their brightness), the same band as the moons, so a system
at the neighbourhood (55 px) or galaxy (9 px) level is a star with a few planet points and nothing
else, and the tracks come up exactly where the derp needs them as its reference (the close-ups and
the system shots, ≥ 120 px). Planet points keep their 10–20 px ramp. The ramp is a brightness ramp of
1.4 px dots with the pixel floor, so there is no pop and no blur; §3.1's table gains the row, and the
LOD test asserts no track mote is drawn where `s_px` < 60.

What the mock shows (`zoom-strip.png`, `hood.png`): at the neighbourhood the six systems are stars
with planet points and no rings; the ellipses appear as the zoom comes in past 60 px, each at its
own angle and opening; `close-strip.png` shows the moons on tilted ellipses with the defect moon
leaving its own.

### 12.3 The burst: a derp that is clearly wrong when you watch the system

The author, on the solar-system view: *"could we have it be a bit more schizo?"* A fifth kind,
**burst**, now the commonest (kinds are drawn by weight from the event's hash: burst 0.40, skip 0.25,
stall 0.15, reverse 0.10, wobble 0.10), on the same schedule (`T` 2.2 s, `D` 1.0 s), so a reader parked
two seconds sees one, and at the system shot it is the one they are most likely to see. Inside its
second the burst is eight micro-slots of 125 ms, each hashed from the event and slot index:

| Term | Per slot | Bound |
|---|---|---|
| snap along the orbit | `Δν = (h0 − 0.5) × 0.45` rad for the first 60 % of the slot, then back: the body jumps up to 13° ahead or behind and returns, so the direction appears to flip several times a second | ±0.225 rad |
| jump off the track | with probability 0.7, `Δr = (h2 − 0.5) × 0.9 r`, square-pulsed with the snap | ±0.45 r, the skip's bound |
| lift | `(h3 − 0.5) × 0.3 r` with the snap | ±0.15 r |
| jitter | a hashed offset of up to 0.03 r on the angle and the radius, held for 1/30 s and cut to the next, throughout | 0.03 r |
| tremble | in the middle third of the burst the whole planet-and-moons group shivers at 40 Hz noise, `0.05 R` (the body's radius) | 0.2 R on the mesh |
| ghost double | with probability 0.5 per slot, a dim copy (0.45 brightness) of the body drawn `(h5 − 0.5) × 0.6` rad further along its orbit while the snap holds | one extra body instance, present only during bursts |

**Un-eased, on purpose** (the author: "it doesn't need to tween everything; better sometimes if it's
not eased"). Every burst term is a hard cut: the snap and the jump are square pulses (the body
teleports off the track on one frame, holds, and teleports back with no ease-out); the jitter is a
hashed offset held for 1/30 s and cut to the next; and in slots where `h7 < 0.45` the body's own
orbital time is **quantised to 0.1 s** (`t_M = floor(t / 0.1) × 0.1`), so it stands still for a few
frames and jumps along its orbit: a dropped-frame stutter. Only the tremble (40 Hz noise) and the
skip's departure keep an eased profile, so the mix reads as broken rather than animated; the healthy
bodies keep their smooth Kepler motion, and the contrast between smooth and stepped is the tell.

Everything is `hash01(seed, k · 64 + slot · 8 + j)`, so the burst is a pure function of the ambient
clock and the node's seed: frozen in tests, replayable, and the reduced-motion / freeze pose for a
hero is set inside a burst slot with the jump on (`s` = 0.3), so the still shows a moon off its track
with its ghost beside it. The bounds are the skip's (0.45 r off the track, 0.15 r of lift), so the
far limits of §5.4 hold unchanged (measured on the mock: 6 CSS px at the old far shot, 2,715 CSS px near),
and the LOD rule already hides moons and tracks below 60 px, so a burst cannot be seen from the
neighbourhood or the galaxy. A healthy body draws no event of any kind and runs its Kepler ellipse
without a tremor, which is the contrast the burst needs: in the close view's pair the left planet's
moons are perfectly calm while the right one's defect moon goes through its second of nonsense.

In the renderer: `derp()` in the mirror pair gains the burst branch and returns the ghost offset; the
ghost is one more instance per cracked body in `net-bodies` (`aKind` ghost), positioned by
`nodeWorld` with the offset and drawn at `0.45 × gain` only while the burst asks for it; the tremble
rides the existing wobble term. Mock: `burst-strip.png` (seven frames across one burst, healthy row
over defect row) and `system-burst.png` (R0's system with its three lit planets and their moons
mid-burst).

## 13. Revision 5: sizes vary, counts vary

*The pins paragraph is re-scoped in §14.2; the distributions stand (a star 1–9 planets, a planet 0–6 moons, the bike's planet 7).*

The author on revision 4: *"The moons are a bit too large. Should there be some variance in their
sizes?"* and *"The solar systems should probably have varying number of planets. Not every planet
needs to have moons. Planets should also vary in size."* Orbits, LOD, glow bounds, derps, clearance
and the two clocks are as revisions 3–4; this changes §1.2's table into distributions, all seeded
from the node's hash so a layout is a pure function of the seed:

| | Was | Now |
|---|---|---|
| planets per star | 5 | **2–9**: `n = 2 + floor(8 u²)` (most systems 2–5, a few crowded), orbits spread from 2.2 out to `5.5 + 4.1 (n − 2) / 7` with ±15 % jitter on each gap, so a sparse system is compact and a crowded one reaches the old 9.6 bound and never past it |
| planet radius | 0.30 | **log-normal, 0.14–0.50**: `0.22 · exp(0.5 g)` clamped, `g` a seeded unit normal: many small, a few large |
| moons per planet | 6 | **0 with probability 0.45**, else `1 + floor(geometric)` capped at 6: most planets bare, a few with several |
| moon radius | 0.10 | **log-normal, ≤ 0.35 of its planet**: `0.12 R_p · exp(0.45 g)` clamped to `[0.04, 0.35 R_p]`: a typical moon is now 0.03–0.05, a third of revision 4's, and never a near-twin of its planet |
| moon tracks | 0.36 / 0.52 / 0.68 | **relative to the planet**: `1.3 / 1.9 / 2.5 R_p`, so a small planet keeps its moons close and a planet-system's radius is `2.5 R_p + the largest moon` (≤ 2.85 R_p) |
| shell motes | fixed: 300 a planet, 36 a moon | scale with surface: `300 (R_p / 0.3)²`, and a moon's lattice at its planet's row pitch (§1.3) with a floor of 3 × 6 (18), so density on screen is constant across sizes |

**What the story pins.** The generator seeds everything except the bodies the beats need, which get
their counts from the lineage table as before: `R0`'s first three planets (`P1`–`P3`) carry **4, 3
and 3 moons**, so the twelve lit under df-5 are `P1`, `P2`, `P3` and nine of their ten moons, with
the tenth (`C1`, `P1`'s outer moon, the fixed one) amber among them: exactly twelve ember things in
one system, as before, and `P1`'s moons are the only ones that must exist for the close-up. `C5`'s
planet (`P2`) has three moons so the second fix has a moon to land on. `R1`, the rule an agent
writes, is born with at least one planet with at least one moon (the lineage already gives it `Q1`,
`Q2` and their code). Every other count is the distribution's. Under the mapping a planet with no
moons is a plan nothing has been built from yet, which growth can change: a moon born later lands on
a bare planet's first track.

**What it does to the picture.** The systems stop being six copies of one diagram: at the
neighbourhood level a star has two to nine planet points at uneven spacings; at the system shot the
planets are visibly unequal and most ride alone; close up the moons are small beside their planet
and the defect moon is a small thing that misbehaves, which is truer to "one piece of code". The
clearance bound is unchanged (the outer orbit is still ≤ 9.6 and the lift bound used 8.8 × sin 0.25
already); the LOD thresholds are unchanged (they are per system, not per body), but a moon of radius
0.03 at the system shot (26 px per unit) is under a pixel: it is its point (§1.3), drawn at the
1.5 px floor, ember while lit; test 12's small-component band becomes 4–60 px². Budget falls (fewer moons,
smaller shells): the mock allocates 20.8k neighbourhood motes (was 36k) plus 6.4k background. The
system shot frames the target system to its own outer orbit (`d = 2.7 × r_out`: 15 for a
three-planet system, 26 for a crowded one), so a compact system is not a small thing in a wide frame
and its moons stay at 3 px or more. Measured on the mock: skip near diff 1,192 CSS px, burst 967,
far 7 (limit 20).

Mock: `close-strip.png` (the planet with four small moons, one of them derping), `system-twelve.png`
(R0 with its three pinned inner planets and seeded outer ones), `hood.png` (six unequal systems),
`zoom-strip.png`.

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
the bike's motes (the wheels largest; by part weight the saddle is the smallest; all ≤ 0.35 of the planet). The reflow
(§8, revision 2's `moteBodyRest`) becomes per part: a mote of part group `g` reflows onto moon `g`'s
shell (or the planet's for the frame and the dust) by the same hash-on-a-sphere (a moon keeps only
enough of its part's motes, by a hash, to land at three-quarters of the planet's density, the rest
dimming to nothing as they land, so no moon reads brighter than its planet: Task 8 fix round 1), the moons already
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
  neighbourhood and galaxy wides and by measurement at the close-ups (the mock: skip 17,830 CSS px
  near on the whole piece, scatter 11,136; the old 66-unit far shot with the LOD forced full measures
  25 CSS px for a scatter, which the renderer's planet-shell ramp takes to 0: the far limit is the
  LOD's, not the amplitude's).
- **The up-stream** (up-1): a piece's stream runs inward from a planet (C7) to the core, where a new
  rule body (R1) kindles: "now the defect is in the rules too"; Q1 and Q2 are then stars written
  from it, out on the arm.

### 14.5 Each beat (replaces §8's table)

| Beat | On screen | Camera (bearing, elevation, distance, fov, frame; target) · lamp |
|---|---|---|
| zo-1, zo-2 | the bike's frame contracts into a planet, its wheels, bars, saddle and basket into moons; the camera lifts: P_a's star and planets, the neighbourhood, the galaxy with its core; **no streams (§15)** | the zoom-out: d 1.6 → 640, target planet → star → neighbourhood → core. **As built (Task 8 fix round 1):** the rise to overhead overlaps the reflow and arrives at 0.30; the walk reaches P_a by 0.60 and the neighbourhood by 0.80; lamp 1 → **arms** (every star's system lit, the core dark; level 6) at 0.52 → 3 at 0.87 → 0 at 0.93, each the first hundredth that clears the band with every drawn sprite's half counted (fix round 2; PROVISIONAL then stands 390 off on a phone, 610 on a landscape screen); the ride eases on with the rise over the galaxy's turn unwrapped (`k · 2π t / period`), so a share between 0 and 1 is continuous in the ambient, its only cut the hourly ambient wrap, whole turns at 1 (fix round 2); `net.growth` keyed against the schedule's births (P_a and the first stars come up lit from 0.52, the next star's system once it clears at 0.74–0.76, 0.12 by the end); the background stars grow to 4 px (bright 6) at the middle distances so the arm reads as stars |
| ly-1 | P_a's system: the bike's planet and two others wheeling round the star, streams arriving | (20, 60, 2.7 r_out, 38, 0; P_a) · 2 |
| ly-2 | the core: six large bodies, slow, ~~every stream leaving outward~~ **no streams (§15)** | (30, 64, 30, 40, 0; the core) · core |
| ly-3 | the stars around the core: the neighbourhood's plans, ~~each fed by a stream from a core body~~ **no streams (§15)** | (0, 82, 120, 40, 0; the neighbourhood) · 3 |
| ly-4 | one star's outer planets: small pieces with their moons, quick to appear | (20, 66, 9, 40, 0; P_a's outer planet) · 1 |
| ly-5 (ly-6 deleted, 2026-10-09) | one plan's system whole: the star, its planets, their moons, the stream from the core **under ly-5, out with its page (§15)** | (−10, 72, 2.7 r_out, 40, 0; P_a) · 2 |
| fr-1 | the galaxy: the bright core, two arms, the slow turn | (0 → 40, 86, 640, 40, 0; the core) · 0 |
| df-1, df-2 | dive to C1, the bike's sibling piece under P1: a planet with moons; it breathes, scatters, its moons burst; the freeze; the fix | (−35, 32, 3.0, 36, 1; C1) · 1 |
| df-3..5 | step back to P1, P2, P3: three stars and nine planets ember, C1 amber | (−10, 74, 58, 40, 0; the centroid of P1–P3) · the three systems and the core |
| up-1 | the stream from C7 inward to the core; R1 kindles there, shivering | the follow: C7 → the core; (60, 60, 24, 38, 0; R1) · core |
| the second fix (the author deleted the wordless second fix, 2026-10-09: redundant) | dive to C5 (P2's first lit planet), the fix, pull-out | (−35, 32, 3.0, 36, 1; C5) · 1; then the neighbourhood |
| up-2 | the neighbourhood: lit stars and planets under R0 and R1, two amber | (0, 82, 120, 40, 0; the neighbourhood) · 3 |
| re-1..3 | the mark visits the newest planets of P5, Q2, P6; a stream from the core feeds it **(§15: the feed only, under re-3; no lineage streams)** | (−170, 68, 2.7 r_out, 38, 0.5; P5) · 2 |
| tr-1 | planet → star → core along the lit streams | the climb |
| tr-2 | R0 close: a large body in the core, shivering; the pull-back and the surge outward to its stars, their planets, the mark, and R1 | (−25, 35, 8, 36, 1; R0) → (−10, 62, 30, 40, 0; the core) |
| fx-1..3 | warm motes on R0, then R1; new stars and planets form clean | (−15, 35, 8, 36, 0.75; R0), pan to R1; (20, 70, 60, 40, 0; between the core and the neighbourhood) |
| fx-4 | the sweep: core → stars → planets, outward | (0, 82, 120, 40, 0; the neighbourhood) · 3 |
| ls-1 | overhead of the core: the few large bodies, the stars around them, the arms fanning out | (10, 80, 40, 40, 0; the core) · core and 3 |

`cylinderTop` keeps its four radii with the core added (a lit set of the core is a disc of radius 14).

**As built (Task 9): layers and far.** Every layers shot at the values above puts its lit set into the
text band (`cylinderTop`) on both screens, so each keeps its target, bearing, elevation, field and
lamp and takes the nearest change that clears the band at every `AMBIENT_GRID` pose with what is built
under its line, keeping its subject's bodies whole in the frame over the hour (`LAYERS_SHOTS` in
src/timeline/netShots.ts; netShots.test.ts fences each). On a phone it composes lower (`camera.frame`,
the first hundredth that clears), first standing the least further off where that low a frame would
put a body off the bottom: ly-1 at 3.31 r_out, frame 0.28; ly-2 at 30, frame 0.39; ly-5 and ly-6 at
3.11 r_out, frame 0.41. On a landscape screen it stands further off, composed wide (the landscape
rule): 66, 62 and 66. Every shot rides the galaxy's turn.

**Fix round 1 (Task 9): ly-3 and ly-4 re-keyed so their lines are true of the picture.**
- **ly-3** looks straight down on the core (bearing 42, elevation 82, lamp 3): the neighbourhood's
  middle lies 42 degrees round from +z seen from the core, so the core sits in the middle of the
  screen and the stars arc round it below, out to both sides. 191, frame 0 on a phone; 273 on a
  landscape screen (the least whole distances that clear with every built star and core body whole in
  the frame).
- **ly-4** rides out along N0's arm (the script's "the camera rides a stream out along an arm: many
  small pieces, quick to appear, the newest farthest out"). Lamp **arms** (6): every system lit, the
  core dark. The camera starts on P_a and rides, under the line (2.9–3.4 screens into layers, one inOutCubic,
  at rest before the stop), out to star-4: of the systems built by then that lie outward of P_a along
  the arm, the newest and the farthest out, a planet of its own born as the camera arrives. Bearing
  −126 lays the arm's outward direction across the screen left to right; elevation 66; 108, frame
  0.29 on a phone (the least distance at which the ride clears the band, keeps at least four built
  systems in view under the text and its two end systems whole in the frame); 212 on a landscape
  screen. Each system is about 55 px across on a phone: its planets read as points beside its star.
- Two turns have no single lamp step that clears: from the core round to the arm (into ly-4) and
  from star-4 back to P_a (into ly-5). There the lamp passes through one star's system on the way
  (`via`): lamp 2 on P_a from 2.745 to 2.78 screens into layers, then arms; lamp 2 on star-4 from
  3.505 to 3.56, then lamp 2 on P_a (screens, since the author's cut of ly-6 shortened the section). The moves ride the page turns, from where the page before
starts to fade to where the next is full ink; a move that ends further off pulls back first and pans
after, one that ends nearer pans first (`MOVE_LEAD`, 0.6 of the move each), so the old lit set never
crosses the band while the new one is not yet clear of it; each lamp steps where it was fitted, at
the first thousandth from which its level cleared the band to the end of the move when fitted (as
fitted: no test holds the step minimal; netShots.test.ts holds that each clears from its step). fr-1 is the galaxy wide on the core,
riding the turn, its bearing 0 → 40 over far 0.0625–0.90 (twelve keys on an inOutCubic); the move
over the page turn into defect takes the camera to the shot the later sections still hold. `net.streams`
is 1 under ly-1 and ly-5, fading on the page turns (ly-6 is deleted; ly-5's goes with its page). The growth under
ly-1 is re-keyed (0.121 at layers 0.02, 0.141 at 0.14) so B1 and B2 are born and built while ly-1
holds P_a's system; the end values 0.23 and 0.27 stand.

**As built (Task 10): defect and spread**, from Task 10's approved shot pass, which rendered each beat
against its line (`DEFECT_SHOTS`, `NET_MOVES` in src/timeline/netShots.ts; netShots.test.ts fences
each):
- **df-1, df-2:** the dive from fr-1 (far 0.9375 → defect 0.0208, the core → C1, 640 → 4.5) lands on
  N8a (−35, 32, 4.5, 36, 1; C1), 8.6 on a landscape screen; the push-in to N8, the close shot (3.4;
  6.5 landscape), over defect 0.04–0.20 as one motion, `net.focus` 0 → 1 with it; held to 0.4392.
  Lamp 1 on C1 from far 0.938. Under lamp 1 the lit planet's own orbit round its star is not drawn
  (bodyMote trackLampGain): it is the star's, and on a landscape screen its dots rose into the band.
  (Task 10 faded it with `net.focus`; its review found it in the band wherever the focus was below 1,
  33 px as the dive lands and up to 83 px over the push-in, so Task 11 darkens it at every focus, and
  the close shots' clearance twin counts the drawn track dots.) `net.fix` 0 at 0.36, 0.05 at 0.37, 0.08 (C1 whole) at 0.40, 0.10 at 0.42.
- **df-3..5:** the built twelve (−10, 74, 93, 40, 0; the centroid of P1–P3), lamp 5 (R0's lineage),
  its landscape variant now 120 at bearing −115 (82 at −105 put the top star and C12 in the band); the
  pull-out over 0.4392–0.4808, `net.focus` 1 → 0 before the lamp opens at 0.472.
- **up-1:** (60, 60, 50, 38, frame 0.8; R1), 130 landscape, lamp 4. The follow over the page turn
  (defect 0.9792 → 0.1 screens into spread) pans in from the twelve to R1; no one step from the lineage to
  the core clears the band over it, so the lamp narrows to C7's piece (lamp 1 on C7) from defect
  0.983 and opens on the core at spread 0.027 (a local of the 2.808 screens spread keeps since the
  second fix went). C7's up-stream in to R1 does not show during the follow: it comes up after it, under
  up-1's line (growth 0.385, about 0.30 screens into spread). `net.streams` 0 → 1 over the follow,
  1 → 0 as up-1's page fades.
- **The second fix** (the author deleted the wordless second fix, 2026-10-09: redundant; up-1 moves straight to up-2 over its page turn, `net.fix` holds at
  0.10 through spread and C5 is swept under fx-4. The record:) (−35, 32, 6.0, 36, 1; C5), 10 landscape, lamp 1 from spread 0.373; the dive over
  0.3722–0.46, `net.focus` 0 → 1 from the lamp to the landing; `net.fix` 0.10 → 0.20 over 0.47–0.56
  as before; the pull-out over 0.56–0.6478, `net.focus` 1 → 0 before the lamp opens on the
  neighbourhood at 0.60.
- **up-2:** (0, 82, 169, 40, frame 0.85; the neighbourhood), 442 landscape, lamp 3; over the page turn
  into reviewer the camera moves to PROVISIONAL, which the later sections hold until Task 11.
- **Every shot rides the galaxy's turn**, the close shots too: they ride it from 2.85° (the galaxy's
  turn by `AMBIENT_POSE`, 9.5 s of 1,200) back of §14.5's −35, so at the pose, the freeze pin's
  instant, the keyed close shot is the pin's camera. A shot that stood still in the world would have
  to come on and off the ride over a move, swinging the camera round its target by however far the
  galaxy has turned (up to three turns in the hour).
- **Clearance:** `cylinderTop` holds up-1, up-2 and every lamp-3 and lamp-4 step; it cannot pass the
  lamp-1 close shots (its half-height is the whole galaxy's lift, far above a close piece) or lamp 5's
  wide disc, which are held instead to their projected visible bodies with each sprite's half
  (`visibleGalaxy`, e2e/machine.ts), at both sizes and every `AMBIENT_GRID` pose.

**As built (Task 11): reviewer, trace, fix and lesson**, from Task 11's approved shot pass, which
rendered each beat against its line at both sizes (`LATE_SHOTS`, `FX2_PAN`, `LATE_MOVES` in
src/timeline/netShots.ts; netShots.test.ts fences each). Every shot rides the galaxy's turn. No Act
II section holds `PROVISIONAL` any more; it is gone.
- **The reviewer's ring is drawn** (a shipped defect since Task 6: its quad faced down, so every Act
  II camera culled it while the draw list still named it visible; it now draws both sides, and a
  pixel test at re-1 and re-3 sees it), never under 9 CSS px across its outer radius
  (`RING.minPx`, flatRing.vert.glsl and its twin `ringDrawnRadius`).
- **re-1, re-2:** (−127, 68, 3.5 r_out(P5), 38, 0.5; P5), lamp 2 on P5, 70 composed wide on a
  landscape screen; the move from up-2 over the page turn pans first. The ring visits V1–V9, all
  P5's planets, each in the frame under the band as it holds on it, each at least 80 % landed.
- **re-3:** from where its line is full ink (0.651) to 0.80, the pull-back to the hub and the light
  together, (39, 75, 170, 38, 0.85; the middle of P5 and R0), 300 at bearing −51 on a landscape
  screen, lamp 4 from 0.652. The feed alone: `net.feed` 1, `net.streams` 0 (§15.1, as ruled), drawn
  at `FEED_CAP` (§15.2, as ruled).
- **tr-1:** the climb over the page turn into trace, to the lineage wide (42, 82, 210, 40, 0; the
  core), 340 at bearing −10 on a landscape screen, lamp 5 on R0's lineage from trace 0.012,
  `net.streams` up over the turn. R0 is not lit yet (it lights under tr-2): the branches converge on
  the core, and on R0 itself at the close.
- **tr-2:** from where it is full ink (0.389) to 0.48, in to R0 close (−15, 35, 8, 36, 1; 15 from
  bearing 0 on a landscape screen), lamp 4 from 0.39; held to 0.58; back out to tr-1's wide over
  0.58–0.68, lamp 5 from 0.615, before the surge (0.68–0.92) runs out along the lineage, the feed to
  the ring among it.
- **fx-1:** back in to R0 over the page turn into fix, tr-2's close again (framed 1, not 0.75: at 0.75
  the core bodies behind R0 dip a pixel into the band on a phone as the camera closes in), lamp 4.
  `net.fix` re-keyed: 0.2 → 0.42 over the page turn (no fix lies between), 0.48 at fix 0.12, 0.5 at
  0.14, so R0's warm motes land over fix 0.04–0.09, mid-hold.
- **fx-2:** a pan across the hub at the close shots' 8 units swings the other core bodies up through
  the band (up to 90 px on both screens), so the camera stands back to 30 (40 landscape) as it leaves
  R0 and pans to R1 (0.162–0.21), then pushes in along fx-2's bearing (0.215–0.25) to (−60, 35, 8,
  36, 0.75; R1), 15 composed close on a landscape screen; R1's warm motes land after.
- **fx-3, fx-4:** from where fx-3 is full ink (0.422) to 0.50, out to the neighbourhood (0, 82, 210,
  40, 0.85), 540 on a landscape screen, lamp 3 from 0.458; P7 and Q3 forming in plain blue in the
  frame; fx-4 holds it, `net.streams` coming up over that page turn for the sweep.
- **ls-1:** over the page turn into lesson, (42, 82, 270, 40, 0; the core), 400 on a landscape
  screen. No one step from the neighbourhood's lamp clears the band over that move, so the lamp passes
  through the core alone from fix 0.986 to lesson 0.026, then lamp 3: the hub lights first, then the
  rings round it.
- **Clearance:** `cylinderTop` holds every hold and move but the close stretches (from each move onto
  tr-2, fx-1 or fx-2 to the end of the move leaving it), which are held to their visible bodies with
  their sprites, as Task 10 held the lamp-1 shots: there the camera stands inside the core's lit disc.

### 14.6 Script draft 4, line by line (replaces §6)

Every line survives word for word; the stage directions move to this mapping.

| Beat | Line | Stage direction becomes |
|---|---|---|
| zo-1 | Now let's zoom out. | the bike's frame gathers into a planet and its wheels, bars, saddle and basket into moons going round it: the bike becomes the first piece of work |
| zo-2 | You want a hundred things built, and the agents build all day. | the camera lifts: the piece's star and its other pieces, the neighbourhood of stars, the arms, the bright core at the centre; the first piece one of hundreds |
| ly-1 | Each piece of work is built from what its agent reads. | medium on P_a's system: pieces (planets with moons) forming round their star as streams arrive from it |
| ly-2 | At the centre, the rules every agent reads before it starts. | the camera flies in to the core: a handful of large bodies, slow to change~~, streams leaving them outward~~ (**§15: no streams**). **Unchanged from draft 4** |
| ly-3 | Around them, the plans: the instructions for one piece of work. | out to the stars around the core~~, each fed by a stream from it~~ (**§15: no streams**). **Unchanged** |
| ly-4 | Out at the edge, the code, written from the plans. | out along a stream to a star's outer planets: pieces with their moons, quick to appear, the newest farthest out |
| ly-5 | Rules shape plans, and plans shape code. | one plan's system whole, with its stream from the core |
| ly-6 | All of it is one system. | hold on it (ly-6 deleted by the author, 2026-10-09: "system" is ambiguous here) |
| fr-1 | From far away, everything looks right. | the galaxy with its core; every star a point, every piece unseen. **Unchanged** |
| df-1 | Come closer. Out here, one piece of code has a defect. | dive to one planet with its moons far out in a star's system, like any other |
| df-2 | Up close, if you watch, you can see it. So you fix it. | the planet breathes, comes apart and re-forms; a moon stutters; the person's work lands on the planet and its moons; it runs smooth. **Unchanged in words** |
| df-3..5 | Now step back. / … / Twelve new defects. You fixed one. | pull back to three stars: the three plans written from the rule and the nine pieces built from them, lit; the fixed one dark among them |
| up-1 | One agent wrote down what it built… Now the defect is in the rules too. | a stream runs inward from a piece, past its star, to the core, where a new large body forms. **Unchanged** (draft 4 already says "inward … to the hub") |
| up-2 | You cannot fix them one at a time as fast as they are made. | the neighbourhood: lit stars and pieces, the two fixed ones lost among them |
| re-1..3 | So you ask a reviewer… / …all fine. / …read the same rule. | the mark passes over new pieces at the edge of a star's system; a stream from the core feeds it (**§15: the feed only, under re-3**). **Unchanged** |
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
C1 (6,116-mote lattice), other cracked planets are the lit nine (300 motes), moons are parts (at
their planet's pitch, §1.3),
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

## 15. Streams only when the story needs them

*Revision 7, approved by the author (2026-10-08) after a look on a phone: the lineage streams (core
→ star → planet), drawn as bright, straight, laser-like arcs out of the core, dominated the zoom-out
and the neighbourhood, where no line is about lineage. This section supersedes every stage
direction above that shows a stream on a beat §15.1 does not list (marked in §14.5 and §14.6), and
revision 2's §3.1 where it keeps the streams' dots on the scroll `clock`.*

### 15.1 When

A new story leaf, **`net.streams`** (0..1, default 0, in `sceneMotion` so a stop waits for its
fades), multiplies the brightness of every lineage stream dot. It is keyed per beat and fades in and
out on the page turns; it is never driven by the level of detail. It is **1** only on the beats whose
line is about lineage, and **0** everywhere else, the whole zoom-out included.

**As ruled in Task 11 (the author's ruling):** the reviewer's feed has a leaf of its own,
**`net.feed`** (0..1, default 0, in `sceneMotion`), which multiplies the feed's dots as `net.streams`
does the lineage's (and the feed's own alpha, review.ts `feedAlpha`, still applies). One leaf for
both could not key §14.5's "the feed only" under re-3: lighting the feed lit P5's lineage streams
with it. So re-3 keys `net.streams` 0 and `net.feed` 1:

| Beat | Line | `net.streams` | `net.feed` |
|---|---|---|---|
| ly-1 | Each piece of work is built from what its agent reads. | 1 | 0 |
| ly-5 | Rules shape plans, and plans shape code. | 1 (out with its page; ly-6 is deleted) | 0 |
| up-1 | One agent wrote down what it built… Now the defect is in the rules too. | 1 (the up-stream) | 0 |
| re-3 | The reviewer read the same rule. | 0 | 1 (the feed alone, times its own alpha) |
| tr-1, tr-2 | Follow the defects back. / They all lead to one place at the centre: one incorrect rule. | 1 (the climb and the surge) | 1 (it stays up while the camera follows the lineage back and the surge runs into it) |
| fx-4 | Then trace everything built from the incorrect rule, and fix what it already made. | 1 (the sweep) | 0 |
| every other Act II beat (the wordless second fix too, until the author deleted the wordless second fix, 2026-10-09: redundant) | | 0 | 0 |

A builder's flight is not a stream: a body is still built by its motes flying in from its parent, so
births read on every beat. Only the standing dotted line between parent and child is gated.

### 15.2 How, when shown

- **Thinner:** 1 CSS px dots (the pixel floor and cap both 1 px) at a wider pitch: one dot per
  1.2 units of chord (was 0.6), between 6 and 40 dots a stream.
- **Dimmer:** a stream dot's brightness is capped at `STREAM_CAP` = 0.3 of a star glow's core peak,
  well under any star's core; a lit (ember) stream is capped the same.
- **Fading along its length:** gain `mix(1, 0.15, u)` from the parent (`u` = 0) to the child
  (`u` = 1), so no stream reads as a full-strength beam end to end.
- **Slightly curved:** the control point sits 0.10 of the chord off the midpoint, sideways.
- **Ember only while it carries the defect**, as before: lit at its `hiAt`, out as its child's fix
  lands.
- **The dots flow on the ambient clock**, `fract(k + NODE_STREAM_SPEED · uAmbient)`, frozen in tests
  and under reduced motion like every ambient term.
- **The feed is exempt from the cap and the fade** (the author's ruling in Task 11): its dots are
  drawn at `FEED_CAP` = 0.9 of a star glow's core, the same along its whole length (stream.ts
  `feedGain`, bodyMote.glsl's twin, spliced and held to parity like the others). The feed is re-3's
  subject ("The reviewer read the same rule": a line from the hub to the reviewer's light), not
  ambient lineage. Task 11's shot pass rendered it at the cap and the fade: one stream that long,
  0.3 at the hub falling to 0.045 at the light, drew 5 px at a peak of 16 levels over the background
  even framed whole, invisible even moving. At 0.9, unfaded, it reads as one dotted line from the hub
  to the light on both screens. The lineage streams keep the cap and the fade.
- **Never in the text band** (Task 11 review I1, the ruling): the streams and the feed are drawn
  through the band only as the loose cloud is, which is not at all. Each dot, once placed on its
  pixel, is masked in screen space: 0 wherever the top of its pixel is at or above the band's margin
  (`TEXT_BAND` of the height plus `BAND_MARGIN_PX`), rising to 1 over `STREAM_BAND_SOFT_PX` = 4 CSS px
  below it, a smoothstep (stream.ts `streamBandMask`, bodyMote.glsl's twin, spliced from birth.ts and
  held to parity). The clearance twins count the dots after the mask (streamOnScreen.ts
  `streamPixels`, in `cylinderTop` and the visible bodies' twin). On a desktop a stream visibly ends
  at the band's edge (ly-1, ly-5): accepted.

### 15.3 Tests

- **Off by default:** at every zoom-out sample, and at every beat whose `net.streams` is 0, the
  streams draw nothing (`net-streams` is absent from `drawStats().visible`); and wherever `net.feed`
  is 0, the feed draws nothing (`net-feed` absent). Each leaf gates its own mesh.
- **Quiet when shown:** at ly-5, the difference between the frames with `net.streams` 1 and 0 has no
  pixel above 96 in any channel (phone and desktop), and the brightest stream pixel within the first
  10 % of a stream (its parent end) is at least 3× the brightest within the last 10 % (its child
  end), from the TS twin's projected endpoints.
- **Keys:** `net.streams` ≥ 0.99 at the middle of every on-beat's hold, and ≤ 0.01 at the middle of
  every other Act II beat's hold.
