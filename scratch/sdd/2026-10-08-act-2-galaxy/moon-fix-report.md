# Moon fix report: moons are fine-dotted spheres like their planet

Base 259890f, branch main. Everything stays behind `?galaxy=1`. Brief: moon-fix-brief.md.

## Root cause

A shell mote's world diameter is `BODY_LOOK.dotShare × π R / rows`: half its own lattice's row pitch
(bodyAttrs.ts packShellData, T3.x). That ties a body's grain to its own lattice. The moon lattice
(`moonLattice`, body.ts) was `5 × 10 at R 0.10`, scaled with the radius and floored at 3 × 6. Every
moon in the galaxy is 0.04–0.15, so every one of C1's moons sat on the 3 × 6 floor: 18 motes, each
`0.5 π / 3 = 0.52 R` across (a quarter of the moon's diameter). C1 is the hero planet on the
60 × 160 lattice, whose motes are `0.026 R_p` = 0.0079 units. So C1's moons' motes were 0.021–0.032
units, 2.7–4 × the planet's on screen (about 4–5 CSS px against 1.5 at the phone's close shot), and
centred on the limb they stuck out by a quarter of the moon's diameter. That is "a moon with moons".
The 0.28 solid fill (`BODY_LOOK.moonFill`) made the dark ball behind them.

A second, smaller cause: moon motes had their own floor, `PX_MOON` 1.5 px, against every other
mote's 1 px. Where a planet's motes fall under 1.5 px, a moon's would still be 1.5 × the planet's.

Not causes: `dots.x` is computed the same way for every body (the formula is right; its input, the
moon's row count, was not); the derp and scatter code is untouched.

## What changed

1. **The grain (the cause).** `moonLattice(R, Rp, planetLattice)` now gives a moon its planet's row
   and column pitch, `round(rows_p R / Rp) × round(cols_p R / Rp)`, never under `MOON_LATTICE_MIN`
   3 × 6. In `fitBudget` (generate.ts) a moon's lattice is derived from its planet's lattice *as
   fitted*, so moons thin with their planet and C1's moons keep C1's grain (C1 is named and never
   thinned). The mote size formula is unchanged, so a moon's motes are its planet's motes, up to the
   rounding of a row count; where the floor binds (a small moon of a coarse planet) the moon is finer
   than its planet, never coarser. C1's moons: 8 × 21 (112 motes) for the four at R 0.040, 12 × 32
   (248) at 0.0605, 9 × 25 (146) at 0.0472; their mote diameters are 0.00785, 0.00792 and 0.00823
   against C1's 0.00785 (0 %, +0.9 %, +4.8 %).
2. **One mote floor.** `motePx(diameter, pxPerUnit)` (lod.ts, mirrored in lod.glsl) is
   `max(PX.mote, diameter × pxPerUnit)` for every shell and person mote. `PX_MOON` no longer sizes moon
   motes; `PX.moon` (1.5 px) is now the floor of the moon's point (below). The galaxy constants no
   longer carry `PX_MOTE`/`PX_MOON`/`PX_NO_CAP` (lod.glsl's constants carry the first two).
3. **The fill.** `BODY_LOOK.moonFill` is gone; a moon's icosphere has the planet's fill 0.035 and the
   same rim. The far side's motes are hidden the way the planet's are: the same `moteLight` path
   (back-face dim, rim) and the same faint fill. A fixed moon keeps `BODY_WARM_MOON` 0.6, so it reads
   amber with dots, not an amber ball (stills below).
4. **The point when small.** A moon's lattice mote 0 is its point, as a planet's is
   (shell.vert.glsl). By the moon's own diameter on screen at its undisturbed place
   (`across = 2 R pxPerUnit`): `moonSphereGain(across) = smoothstep(4, 8, across)` (`MOON_POINT_PX`,
   lod.ts / lod.glsl). The shell motes and the icosphere (and the burst ghost) are multiplied by it,
   the point by `1 − it`. The point's diameter is `moonPointPx(across) = min(4, max(1.5, across))`: the
   moon's own disc, floored at 1.5 px, held at 4 px while it fades out. A pure function of projected
   size, continuous (a brightness ramp of crisp things, as §3.2 asks), with no pop. Under 4 px a moon
   is one point only, so a 3 px moon is still a dot, not a ring. The point is FORM_POINT (a crisp small
   disc, ember while lit, `LOOK_POINT_BRIGHTNESS` like a planet's point), not a soft glow: "soft" in
   the brief is read as the gentle hand-over, because the constraints allow no soft discs. It comes up
   with the moons' LOD band (60–120 px) like the shell did, and with the derp's centre.
5. **Scatter and derp.** Untouched: moon motes still go through `bodyMote()` and leap and return
   (the body parity mode is green, unchanged). A moon that is a point still derps (the point sits at
   the derped centre: skips, stalls, reverses, bursts move it), but under 4 px across its scatter's
   leaping motes and its burst ghost are faded with the sphere. That only happens for moons under
   8 px; every moon at the close shot is 16–24 px on a phone.
6. **Spec.** §1.3's sentence now states the rule and the author's reason; §13's "shell motes" row,
   which restated the 36-mote moon lattice, now names the planet's pitch and the 3 × 6 floor.

Files: src/galaxy/body.ts, src/galaxy/generate.ts, src/scene/node/lod.ts, lod.glsl, bodyAttrs.ts,
shaders/shell.vert.glsl, shaders/body.vert.glsl, src/parity/{fields,parity,shaders}.ts; tests
src/galaxy/body.test.ts, generate.test.ts, src/scene/node/bodySystem.test.ts, bodyMote.test.ts,
e2e/galaxy.spec.ts, e2e/parity.spec.ts; docs/specs/2026-10-07-galaxy-orbits.md.

## Budget

`Galaxy.instances.total` is now **75,649** (was 75,925), against `galaxyBudget` 76,000, on both
tiers: shells 56,456, persons 1,589, tracks 14,780, bodies 351, glow 36, streams 2,437. `fitBudget`
already fills the budget with the largest thinning factor that fits, so the denser moons were paid
for by thinning the unnamed planets a little more: moon motes 2,620 → 3,388 (+768, of which C1's six
moons +708), planet motes 27,522 → 26,488 (−1,034, about −4 %; N0 and C5 go from 12 × 31 to 12 × 30).
The hero planet, the core and the stars keep their lattices. 113 of the 138 moons are exactly on the
3 × 6 floor and 125 have its 3 rows (corrected in Fix round 1); floored moons are finer than their
planets.

## Tests

New:

- **Unit** (src/scene/node/bodySystem.test.ts, "a moon is a small sphere of its planet's material"):
  at the close shot, through `galaxyShotCamera` at AMBIENT_POSE, with the CSS px per unit at C1's view
  depth, `motePx(T3.x)` of each of C1's moons is within 10 % of C1's, on the phone and the desktop.
  A second check holds every moon in the galaxy to at most its planet's mote diameter times 3.5 / 3
  (the most a row count's rounding can add).
  - RED (mutation, the old cause put back: `moonLattice(b.R, 0.1, [5, 10])` in fitBudget, which is
    the old 5 × 10 at 0.1 with the 3 × 6 floor): `npx vitest run src/scene/node/bodySystem.test.ts`
    → 2 failed. `C1-m1 at 390x844: expected 1.6666665085604437 to be less than or equal to 0.1`
    (the moon's mote 2.67 times the planet's), and `C1-m1: expected 2.666666508560444 to be less than or
    equal to 1.1666676666666667`. Undone by the exact inverse sed.
  - GREEN: 29 passed.
- **e2e, close shot** (e2e/galaxy.spec.ts, "Moons at 390x844 › up close a moon is fine dots over the
  faint fill…"): phone, close shot, AMBIENT_POSE, `net-shells` + `net-bodies` isolated. It checks
  each moon clear of the planet, of the other moons and of the burst's ghost (C1-m1, m2, m3 and m6
  qualify; at least 3 required). Two checks per moon:
  - *No dark disc.* The darkest quarter of the moon's disc (25th-percentile lift over the
    background, inside 0.85 R) must be no brighter than the planet's plus 4 levels. Measured: 10 for
    every moon, and 10 for the planet. **Interpretation, said plainly:** the brief's literal metric
    ("the fraction of near-black pixels must not exceed the planet's") runs the wrong way. A solid
    fill has *no* near-black pixels, while a dotted sphere is mostly near-black between its dots. I
    measured the old moon: 0 % of its disc is under 16 levels, against 60 % for the new moon and 51 %
    for the planet. So the literal test passes the old look and fails the new one. I first tried
    "the share lifted past near-black must not exceed the planet's". It was too noisy: 0.55 against
    0.52 on a correct render. The dark floor measures the same thing robustly: what lies between
    the motes.
  - *No mote off the limb.* Every lit `net-shells` pixel within 2 R of the moon lies within
    `R (1 + EQ_A (1 + EQ_SECOND))` plus **the planet's** mote radius on screen plus 1 px of sampling.
    I use the planet's radius, not the moon's own: with the moon's own (old, large) motes, the old
    look would pass by construction.
  - RED 1 (`moonFill: 0.28` and `vFill = moon ? LOOK_MOON_FILL : LOOK_FILL` restored): `C1-m1: its
    disc's dark floor (the planet's 10) Expected: <= 14 Received: 68`. Undone exactly.
  - RED 2 (old lattice as above; per-moon checks are `expect.soft` so both report): dark floor
    C1-m1 25, C1-m3 30; and `C1-m2: lit px past its limb by more than a mote's radius Expected: 0
    Received: 24`. Undone exactly. (Under the old lattice, C1-m1/m3/m6 stay within the limb bound:
    their old motes overhang by about 2 px, right at the allowance. C1-m2, the largest, does not.)
- **e2e, small moons** ("a moon a few px across is one point, not a ring"): phone, system shot,
  ambient 0, lamp off, shells + bodies isolated. It checks every drawn moon (its system at full
  detail) 2–5 px across, on screen and clear of every other body: N0-m4 3.3 px, N0-m5 2.6, N0-m6
  2.9, N0-m7 2.1 (at least 3 required). In a window of across / 2 + 2 px, the pixels past half its
  peak form exactly one 8-connected component, and the 3 × 3 at its centre is lit.
  - RED (`MOON_POINT_PX = [0, 0.001]`, no point): `N0-m6 (2.9 px): lit components Expected: 1
    Received: 2`. Undone exactly.
- **Parity** (`?lib=lod`): LodOut gains `moonSphere`, `moonPoint` (over the 0–140 px grid) and
  `mote`, with a new case `lod: motePx` (3 diameters × 64 scales, 0.5–1000 px/unit). Each mutation
  was run on its own: the GLSL handover's band end + 0.5 failed `lod: lodGain` 0.104; motePx × 1.01
  failed `lod: motePx` 0.39; the point's floor + 0.25 failed `lod: lodGain` 0.25. All undone exactly.
  `?lib=body` is unchanged and green.
- **Existing test fixed:** bodyMote.test.ts "and bodyMote … within one tick of the burst's jitter"
  bounded the hero moon's motes at `R (1 + EQ_A)`. The morph's own bound is `EQ_A (1 + EQ_SECOND)`
  (morphTerm's documented range). The old 18-mote lattice never sampled past it; the 112-mote one
  does (1.0212 R). Only the test's bound changed.

Runs (final tree):

- `npx tsc --noEmit -p .`: clean.
- `npx vitest run`: 84 files, **1801 passed**.
- `E2E_PORT=4199 npx playwright test` (full): **187 passed, 12 skipped** (the SHOTS-gated stills and
  shots), 1 failed. The failure was `spikes.spec.ts › index lists every spike in sentence case`:
  "Test timeout … while setting up "context" … Failed to find browser context". That is the ledger's
  known browser-setup flake. A rerun of `e2e/spikes.spec.ts` passed 9/9.
- The tests the brief named stay green in that run: "the twelve light as twelve", "the lamp has a
  hard edge", both "keeps within its budget", "a healthy planet is a sphere", and all of parity.

## Stills (looked at with the Read tool, phone first)

I re-rendered `SHOTS=1 … stills.spec.ts -g "T6|T7"`: every T6 and T7 still at 390×844, then 1440×900.
I looked at T6-close-pose, T6-close-fixed, T7-close-a0, T6-system-nostreams and T6-twelve on the
phone, then T6-close-pose, T6-close-fixed and T6-system-nostreams on the desktop. The crops are in
`shots/crops/`; the old stills I could keep are in `shots/before/`. The phone T6-close-pose and
T6-twelve had already been overwritten when I copied them, so those two are missing from it.

- **Close, phone (T6-close-pose, T7-close-a0).** Each moon is a small sphere of fine blue single-px
  motes in rows, with a faint fill and a slightly brighter limb. There is no dark ball and no big
  dots. In the 8× crop of a 22 px moon (`new-pose-moon.png`) the motes are 1 px dots at the same
  spacing and size as in the 8× crop of the planet's limb (`new-pose-planet-limb.png`). The old
  crop (`old-a0-moon.png`) shows ~10 big round blobs on a navy disc with lumps standing proud of the
  limb. The new moon reads as a small dotted sphere of the planet's material. Honest
  qualifications:
  - A moon reads a little dimmer and less dense than the planet. It has fewer rows across, so
    fewer motes overlap at the limb, and the planet's denser 6,116-mote bubble looks more solid.
  - At 16–24 px the lattice rows are visible as faint curved lines across the moon (the planet
    shows the same).
  - The near and far hemispheres both show. The far side is dimmed by the same back-face term as
    the planet's, but at this size a moon looks a touch more see-through than the planet. I would
    not call it a cage, but it is not opaque either.
- **Fixed (T6-close-fixed, both sizes).** The moons are amber dotted spheres, plainly dots, with no
  solid amber ball. The planet is pale blue.
- **Lit** (scratch render of the close shot at highlight 1, not a committed still). Planet and moons
  are ember dotted spheres; the moons read ember.
- **Far (T6-system, phone).** P_a's system at 2.7 × its outer radius. N0's seven moons are 2–5 px
  across and each reads as a single point of 2–4 px, some a 2 × 2 or 3 × 2 square: dots, not rings
  and not blobs with a fill. Before, they were 3–4 px blobs with a dim fill
  (`new-system-n0.png` / `old-system-n0.png`, 7×). At the phone's true size, far moons read as
  points.
- **Far (T6-system, desktop).** The same moons are 8–10 px across, so they are past the hand-over:
  small dotted spheres (`new-system-n0-desk.png`). Coarser than C1's, because they take N0's thinned
  12 × 30 grain or the 3 × 6 floor (18–32 motes). They read as small dotted balls, but a few-dot
  moon is clearly a lattice, not a fine sphere.
- **Desktop close (T6-close-pose 1440).** Dotted spheres at the planet's grain (`new-pose-moon-desk.png`),
  the same look as the phone.
- **Twelve (T6-twelve, phone).** Unchanged by eye. The moons are not drawn at the twelve's distance
  (below their LOD band), and the twelve test passes.

## Self-review

- A mirror pair moves together. lod.ts and lod.glsl both gain `moonSphereGain`, `moonPointPx` and
  `motePx`, with their constants spliced from `MOON_POINT_PX` and `PX`, and parity covers all three.
  The shader branches that use them (the point in shell.vert, the gains in shell.vert and body.vert)
  follow the planet's point and `litHandover` pattern, which has no TS twin either.
- `PX_MOTE`, `PX_MOON` and `PX_NO_CAP` left the galaxy constants, since lod.glsl now owns the first
  two. `BODY_LOOK.moonFill` and `LOOK_MOON_FILL` are gone; grep finds no other user.
- No moon-only fudge factor. The mote-size formula is the same for every body; only the moon's
  lattice input changed, to a rule ("a moon has its planet's pitch").
- `baseLattice` still computes a planet lattice for moons, which `apply` ignores. The doc says so;
  I left it rather than complicate the map.
- Purity: everything new is a function of the projected size and the ambient. No new state, no
  `Math.random`.

## Concerns

1. **The dark-disc metric differs from the brief's wording** (explained under Tests). The brief's
   literal inequality passes the old look and fails the new one. I test the intent: the darkest
   quarter of a moon's disc is as dark as the planet's.
2. **Moons of thinned planets are coarse.** 113 of 138 moons sit exactly on the 3 × 6 floor (18 motes; 125 have 3 rows), finer
   than their planets but few. That includes N0's seven bike-part moons (18–32 motes each) and C5's.
   Seen close (the zoom-out start, or C5's visit) they read as small lattices, not fine spheres.
   Task 8's reflow onto N0's moons should decide whether N0 (and its moons) should be named in
   `fitBudget` like C1. That would cost about 1–2k motes from the filler.
3. **Budget trade.** The unnamed planets lost about 4 % of their motes (27,522 → 26,488) to pay for
   C1's denser moons. Total 75,649 ≤ 76,000.
4. **The point is a crisp FORM_POINT, not a soft sprite.** The brief says "a single soft point". The
   constraints forbid soft discs, so "soft" is the brightness hand-over (smoothstep 4 → 8 px). A
   lit small moon's point is ember at the planet point's lit gain, but it does not grow like a lit
   planet's. No story beat needs a lit moon counted at a few px. I checked a lit moon by eye only up
   close.
5. **While a moon is a point** (under 4 px), its scatter's leaping motes and its burst ghost fade
   with the sphere. Its derps still move the point. Moons that small are at the system shot and
   further out, never at the close shot.
6. A known-flaky spikes test failed once in the full run and passed on rerun.
7. The final full e2e ran on the committed code. My only edit after its build began was a
   comment-only rewrap in shell.vert.glsl.

## Commits

- f10ede9 galaxy: moons in their planet's grain: a moon's lattice at its planet's pitch, the planet's faint fill, and a point when small
- d11e2df galaxy: test the moons up close and small: no dark disc, no mote off the limb, one point under 5 px
- 66b8678 spec: moons are fine-dotted spheres of their planet's material, and a point when small
