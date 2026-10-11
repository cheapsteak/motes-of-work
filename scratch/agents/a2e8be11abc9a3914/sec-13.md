
## 13. Revision 5: sizes vary, counts vary

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
| shell motes | 300 / 36 | scale with surface: `300 (R_p / 0.3)²`, `36 (R_m / 0.1)²` with a floor of 12, so density on screen is constant across sizes |

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
0.03 at the system shot (26 px per unit) is under a pixel: the point floor draws it at 1.5 px, and
the lit moons under df-5 are drawn with their ember dust (10 motes at the floor) so a 3 px ember dot
remains countable; test 12's small-component band becomes 4–60 px². Budget falls (fewer moons,
smaller shells): about 28k motes for the neighbourhood.

Mock: `close-strip.png` (the planet with four small moons, one of them derping), `system-twelve.png`
(R0 with its three pinned inner planets and seeded outer ones), `hood.png` (six unequal systems),
`zoom-strip.png`.
