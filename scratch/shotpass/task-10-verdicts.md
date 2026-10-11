# Task 10 shot pass: the defect and spread sections

Worktree at b81dac7, probe shots (`?test=1&mech=bike&shot=…&state=…&ambient=…`). Every still is at `AMBIENT_POSE` (9.5 s, C1's freeze pin) unless it is named `-a101`. Phone 390×844 first, then 1440×900. The beats are sampled at the middle of each hold, with the `net.*` values interpolated from keyframes.json and the brief:

| Beat | Local | growth | focus | fix | highlight | streams |
|---|---|---|---|---|---|---|
| df-1 | defect 0.13 (push-in half done, d 3.95) | 0.286 | 0.5 | 0 | 0 | 0 |
| df-2 | defect 0.31 | 0.306 | 1 | 0 | 0 | 0 |
| df-2b | defect 0.42 | 0.3145 | 1 | 0.10 | 0 | 0 |
| df-3 | defect 0.53 | 0.329 | 0 | 0.10 | 0 | 0 |
| df-4 | defect 0.69 | 0.3405 | 0 | 0.10 | 0.14 | 0 |
| df-5 | defect 0.90 | 0.353 | 0 | 0.10 | 0.25 | 0 |
| up-1 | spread 0.21 | 0.401 | 0 | 0.10 | 0.30 | 1 |
| second fix | spread 0.51 | 0.445 | 1 | 0.144 (C5's fixAt is 0.18) | 0.30 | 0 |
| up-2 | spread 0.82 | 0.507 | 0 | 0.20 | 0.30 | 0 |

**The band** is measured on the lit set alone: the frame is redrawn with every `galaxy-*` (sky) mesh isolated away, and the first row that differs from the stage by more than 24 is read. The limit is 0.42 h + 8 px, which is 0.4295 on a phone and 0.429 on desktop. "lit top" below means that row as a share of the height. The red line on `sheet-phone.png` is 0.42.

---

## df-1: "Come closer. Out here, one piece of code has a defect."

- **Proposed:** push-in from N8a (−35, 32, 4.5, 36, 1; C1) to N8 = `HERO_CLOSE.C1` (3.4), lamp 1 on C1, `net.focus` 0 → 1. No landscape variant is given.
- **Verdict: WEAK.** On a phone it is true: one planet with its six moons is the only lit thing, whole, with its lit top at 0.557. The sky's edge-on band of the disc sits above it and C1's own track sweeps in, so the piece reads as one picked out, out in the disc. With no landscape variant, though, desktop takes the portrait 3.95 at frame 1: the planet is cut off by the bottom edge, and the lit top is 0.417, inside the band.
- **Change:** give the push-in a landscape leg of CLOSE_LANDSCAPE scaled by distance: `landscape: { distance: 8.6 → 6.5, frame: 0 }` (4.5 × 6.5/3.4 → 6.5). At the midpoint (7.55) the planet is whole and the lit top is 0.431, so it clears by 2 px. Phone unchanged. Cost: none to the phone, and desktop matches df-2's close.
- **Stills:** `df-1-390x844.png`; `desktop/df-1-1440x900.png` (as briefed) vs `desktop/df-1-alt-landscape-1440x900.png`.
- **Tried and rejected:** lamp 2 on C1 with focus 0.5, to show siblings for "like any other" (`df-1-alt-lamp2`). It adds only one sibling at the edge, P1's glow is off frame, and the lit top is 0.345 on a phone and 0.168 on desktop.

## df-2: "Up close, if you watch, you can see it."

- **Proposed:** N8 = `close` (−35, 32, 3.4, 36, 1; C1), lamp 1, focus 1.
- **Verdict: TRUE.** C1 and its six moons are whole and lit. The lit top is 0.537 at the pose and 0.667 at 101 on a phone, and 0.563 at 101 on desktop. The still holds the pin's burst moment; at 101 the piece looks healthy, which is exactly "if you watch".
- **Caveat (inherited from the T6/T7 close shot, not this brief):** at the pose on desktop, C1's own orbit-track dots reach 0.403, about 23 px into the margin; see `desktop/df-2-1440x900.png`. No framing fixes it. A landscape bearing sweep gives 0.30–0.43 and d 8.5 gives 0.377, because the low 32° view sees P1's whole track ring rise behind the planet. The fix is a lamp rule: do not light the planet's own orbit track as part of the piece at lamp 1, or fade it with `net.focus`. That is a bodyMote mirror-pair change and I did not render it. Phone is unaffected (0.537).
- **Stills:** `df-2-390x844.png`, `df-2-a101-390x844.png`.

## df-2b: "So you fix it."

- **Proposed:** the close held; `net.fix` 0 → 0.10.
- **Verdict: TRUE.** At fix 0.10 the planet and all six moons carry the warm dusting and the piece is whole. The lit top is 0.537 at the pose and 0.667 at 101 on a phone. The same desktop track caveat as df-2 applies at the pose.
- **Stills:** `df-2b-390x844.png`, `df-2b-a101-390x844.png`.

## df-3: "Now step back."

- **Proposed:** (−10, 74, 58, 40, 0; centroid P1–P3), lamp 5 on R0.
- **Verdict: FALSE.** At 58, P1's system is cut off by the bottom edge on a phone, and P2 and P3 sit on the band (lit top 0.395). On desktop the lit top is 0.109. This is the 58 that netShots.test.ts already records as framing P1–P3 at no AMBIENT_GRID pose.
- **Change:** use the built `twelve` shot (−10, 74, **93**, 40, 0; centroid), riding the turn, lamp 5 on R0, with its **landscape changed from {82, 0, −105} to {120, 0, −115}**. As built, the landscape puts the top star at the band and the R0-lineage planet C12 above it (lit top 0.371). At −115/120 the lit top is 0.474–0.477 and every one of the twelve sits ≥ 30 px inside the edges over the grid; the nearest at −105 is 130. Phone at 93: lit top 0.425 at df-3, where the low point is a builder's flight into C7/C8, which is ≥ 0 under the band but 4 px into the 8 px margin; 0.498 at df-4 and df-5. Cost: the twelve is about 30 % smaller on desktop, so re-check test 12's ≥ 60 px² star components at desktop size.
- **Stills:** `df-3-390x844.png` vs `df-3-alt-twelve-390x844.png`; `desktop/df-5-twelve-as-built-1440x900.png` vs `desktop/df-5-alt-twelve-1440x900.png`.

## df-4: "The agents kept building. Whatever is built on a defect carries it too."

- **Proposed:** as df-3; `net.highlight` 0 → 0.25 over 0.60–0.76.
- **Verdict: FALSE** as briefed (the 58 framing, as df-3). With the twelve the line is true: mid-highlight, P1 and P2 with their planets are ember, P3 is turning, and P3's planets are still healthy, so the spread is visible.
- **Change:** as df-3.
- **Stills:** `df-4-390x844.png` vs `df-4-alt-twelve-390x844.png`.

## df-5: "Twelve new defects. You fixed one."

- **Proposed:** as df-3, highlight 0.25.
- **Verdict: FALSE** as briefed (the 58 framing). With the twelve it is true: three ember stars and nine ember planets read as three clusters of 1 + 3, with C1 a pale point among P1's (lit top 0.498 on a phone, 0.474 on desktop with the landscape change).
- **Change:** as df-3.
- **Stills:** `df-5-390x844.png` vs `df-5-alt-twelve-390x844.png`.

## up-1: "One agent wrote down what it built, so the next agent would know. Now the defect is in the rules too."

- **Proposed:** the follow C7 → core, then (60, 60, 24, 38, 0; R1), lamp 4; streams 1.
- **Verdict: FALSE.** R1 is forming ember, with its stream and flight arriving from below, which is the story. But the four other rules stand inside the band: lit top 0.251 at the pose and 0.359 at 101 on a phone, 0.000 on desktop. The shot does not ride the turn either, so the rules swing through the band over the hour.
- **Change:** keep the target, bearing, elevation, fov and lamp, and stand off: **(60, 60, 50, 38, frame 0.8; R1), `ridesTurn: true`, `landscape: { distance: 130, frame: 0 }`**. On a phone the five rules sit over a small ember R1 in its first build, the flight comes in from below, the lit top is 0.534 at both poses, and the cylinder clears by 8 px at growth 0.44. Desktop's lit top is 0.507. Cost: R1 is small, and on desktop at 130 it is very small; it is legible as the one ember body but not as a shell.
- **Rejected:** bearing −105 at 24 (looking across the core at R1) clears the cylinder at 24 on both screens, but the up-stream and C7's flight then run up from R1 into the band (lit top 0.004). A core target at bearing 60 (42, frame 0.2; landscape 78) clears the cylinder with R1 low at about 0.83, but I did not render it.
- **Note:** R1 is born at 0.39 and built by 0.44 on the growth clock. That growth is reached only around spread 0.49, after up-1's page has turned, so under up-1 R1 is always half-built. That fits "forms", but it is never a whole body under the line.
- **Stills:** `up-1-390x844.png`, `up-1-a101-390x844.png` vs `up-1-alt-d50-390x844.png`, `up-1-alt-d50-a101-390x844.png`; `up-1-alt-b-105-390x844.png` (rejected); `desktop/up-1-alt-d50-1440x900.png`.

## The second fix (wordless)

- **Proposed:** (−35, 32, 3.0, 36, 1; C5), lamp 1; `net.fix` 0.10 → 0.20; then the pull-out.
- **Verdict: WEAK.** On a phone C5 is whole and under the band (0.546), but it reads as a ball of beads. C5's lattice is 324 motes against C1's 6,116, so at 3.0 each mote is a ~10 px disc and the piece does not read as the same kind of thing as the first fix. With no landscape variant, desktop is huge, coarse and in the band (lit top 0.396). At 3.4 with C1's landscape (6.5) it is still coarse on a phone, and desktop is 0.426 (fails).
- **Change:** **(−35, 32, 6.0, 36, 1; C5), `landscape: { distance: 10, frame: 0 }`**, with `net.focus` 1 as in df-2. The piece and its three moons are whole, the grain reads as a lattice, and it heals visibly at fix 0.20 (blue with amber dust). Lit top is 0.621 on a phone and 0.494 on desktop. Cost: the dive lands about twice as far out as C1's close, which suits "a quick dive". The alternative is to give C5 the hero lattice in the generator, which costs budget.
- **Stills:** `second-fix-390x844.png` vs `second-fix-alt-6-390x844.png`, `second-fix-alt-6-healed-390x844.png`; `desktop/second-fix-1440x900.png` vs `desktop/second-fix-alt-6-1440x900.png`.

## up-2: "You cannot fix them one at a time as fast as they are made."

- **Proposed:** `hood` (0, 82, 120, 40, 0; the neighbourhood), lamp 3.
- **Verdict: FALSE.** The picture is right: R1 ember among the rules, about six ember stars with their planets, and the two fixed ones lost among them. But healthy stars and the core stand in the band (lit top 0.306 on a phone, 0.066 on desktop). This is the same 120 that PROVISIONAL and ly-3 had to leave.
- **Change:** **(0, 82, 169, 40, frame 0.85; hood), `ridesTurn: true`, `landscape: { distance: 442, frame: 0 }`**, fitted with the cylinder at growth 0.54 (up-2's end) and the lowest lit star ≥ 30 px above the bottom. Lit top is 0.517 on a phone and 0.493 on desktop. Cost: the neighbourhood is smaller, and on desktop at 442 it is a small cluster, though the ember-vs-blue split still reads.
- **Stills:** `up-2-390x844.png` vs `up-2-alt-169-390x844.png`; `desktop/up-2-1440x900.png` vs `desktop/up-2-alt-169-1440x900.png`.

---

## For the implementer: the brief's "cylinderTop passes for every sample" cannot pass as written

- **Lamp 1 close shots (df-1, df-2, df-2b, the second fix).** The planet disc's half-height is the galaxy-wide `liftBound`, which is a planet's lift about its star plus dust, not about the planet itself. At 3–6 units that puts the cylinder's top far into the band: at growth 0.30 it is −823 px on a phone and −676 on desktop for `close`, even though the pixels clear. Either size the planet lamp's disc by the piece's own lift, or fence these shots by projected bodies or pixels.
- **Lamp 5 on R0 (df-3..5).** The lineage disc spans every R0 star (P1–P7, star-12) about the neighbourhood's centre, plus the core. At 93 it is −178 on a phone and −265 on desktop, although the pixels clear on a phone (0.498) and on desktop with the change above (0.474). Either fence by bodies or pixels, or give the twelve a lamp whose lit set is the three systems and the core, as §14.5 says.
- The up-1 and up-2 recommendations above do pass the cylinder.
