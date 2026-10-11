# Binary stars for the neighbourhood: an experiment

## Recommendation

**Port it as a small extra once the widening lands. It does not replace the widening.**

- **What it fixes.** With today's packing, 29 of the 30 stars have an outermost planet beyond the S-type limit that their nearest neighbour would set if the two were bound. Turning the close pairs into binaries makes those few pairs honest, but under any "close pairs" rule only 3 of the 30 stars qualify. The other 27 still need spacing. The widening at 1.5 × still leaves 22 of 30 over that limit. The yardstick needs about 2 × (5 of 30 over) to 2.25 × (4 of 30 over).
- **What reads well.** The P-type pair: two stars a little over two units apart that whirl round their barycentre every ~30 s, with two near-circular planets just outside a dashed circumbinary limit. It is the image people know from real systems such as Kepler-16. It is cheap, and it is clear at both framings.
- **What reads less well.** S-type pairs at neighbourhood distances (a_B ≈ 16–19) keep only 1–2 planets per star, because a_crit ≈ 0.15–0.25 a_B. Their unit footprint (outer ≈ 14–16) is about twice a single's, so they do not make the neighbourhood smaller: (c) is radius 104 and (b) is 103. Keeping 3+ planets per star needs a_B ≳ 30, which is wider than the widened spacing itself.
- **Cost: dots.** The instance budget goes down. Truncation drops planets, moons and tracks: 49,634 becomes 44,783 for (c), or 44,426 for (d), including the plan overlay of 294 dots per S pair and 234 per P pair.
- **Cost: vertex work.** It is one extra Kepler hop per mote, and only in binary systems (about 10 % of the motes). The shader's host-chain walk (`bodyGalactic`, `orbit.glsl`) already allows three hops. A moon goes to its planet, the planet to its star, and the star to a new invisible barycentre row with a spot, so moons and planets ride their star with no new shader math.
- **Cost: code.** About 300–400 lines, roughly:
  - `generate.ts`: about 150–200 lines (pair pick, refit at a_crit, two-pass placement, barycentre rows).
  - `body.ts`: about 30 lines (the two limit fits, the binary orbit).
  - About 6 readers of a star's `spot!`.
  - The schematic overlay: about 60 lines.
  - Snapshot and budget tests.
- **What it touches in the main generator:**
  - `placeStars` and `fitSystem`/`layOut`, which the widening is changing now. Port after it merges.
  - A new body kind (barycentre) or a hidden core row. `Body.host`/`orbit` for binary stars.
  - The `spot!` readers: `bodyData.ts`, `netShots.ts`, `main.ts` (background clearance), `hoodCentroid`, `streamDots`, `systemOuter`.
  - `galaxyOnScreen`/`uSysPx` sizing (barycentre plus the binary's reach).
  - A new `streamFor` concern, `'binaries'`.
  - The `fitBudget` fixed counts (plan dots).
- **Keep out:** scripted stars, and above all N0's star, because `bodyWorld` anchors the whole galaxy at N0, so a moving N0 star would shake everything.

## Files

| Path | What |
|---|---|
| `binaries/mock.html` | The swipeable mock. Options a/b/c/d (swipe, ← →, chips), a hood/close toggle, plan on/off, a time slider with live ×1/×10/×60, and a collapsible info line with dot counts. URL: `?o=a..d&f=hood|close&t=<s>&plan=0&band=1&ui=0`. |
| `binaries/three.module.js`, `three.core.js` | Copied from the schematic mock. The page imports `./three.module.js`. |
| `binaries/three.classic.js` | The same three.js, rewrapped as one classic script (`tools/classic.py`). It is loaded only under `file://` when the module import is refused (the headless test browser does refuse it). The mock now opens from disk in that browser too, as well as over a static server. |
| `binaries/stills/{a,b,c,d}-{hood,close}.png` | 390×844 stills at t = 120 s, ui hidden. `sheet.png` is all eight. `ui-c-close.png` and `ui-d-close-info.png` show the ui. |
| `binaries/tools/` | `model.mjs` runs the mock's MODEL section headless and prints the numbers below. `shots.mjs` takes the stills. `checks.mjs` covers file://, purity, motion and swipe. `sweepk.mjs` sweeps the widening factor. `classic.py`. |

**Checks passed:**
- file:// boots in the headless test browser, through the classic fallback.
- The same t gives a byte-identical frame after scrubbing to other times.
- The barycentre stays fixed while the stars move.
- A swipe left goes c → d.
- The camera is fixed per framing.
- No `Math.random`.
- No page errors.

## Research

### T2: peer-reviewed

- **Holman & Wiegert 1999**, AJ 117, 621, "Long-term stability of planets in binary systems" (arXiv astro-ph/9809315). The formulas below were read from the paper.
  - Test particles were integrated for 10⁴ binary periods, starting on circular, coplanar orbits.
  - **S-type** (round one star; μ = m_other / (m_host + m_other); 0.1 ≤ μ ≤ 0.9, 0 ≤ e ≤ 0.8; good to 4 % typical, 11 % worst):
    `a_c / a_B = 0.464 − 0.380 μ − 0.631 e + 0.586 μ e + 0.150 e² − 0.198 μ e²`
    For an equal-mass circular pair this is 0.274. Near μ → 0 or 1 it turns into a Hill-sphere law, ∝ μ^(1/3).
  - **P-type** (round both; μ = m₂ / (m₁ + m₂); 0 ≤ e ≤ 0.7; good to 3 % typical, 6 % worst):
    `a_c / a_B = 1.60 + 5.10 e − 2.22 e² + 4.12 μ − 4.27 e μ − 5.09 μ² + 4.61 e² μ²`
    That is 2.39 at μ = 0.5, e = 0, and about 2–4 over the usual range.
  - Beyond the P-type limit there are **islands of instability at the n:1 mean-motion resonances** (3:1 to 9:1). The boundary is not sharp.
- **Raghavan et al. 2010**, ApJS 190, 1, "A survey of stellar families" (454 solar-type stars within 25 pc).
  - Multiplicity: 54 ± 2 % of systems are single after completeness corrections. Observed: 33 % double, 8 % triple, 3 % higher.
  - Periods are roughly log-normal: mean log P = 5.03 (P in days), σ = 2.28. That puts the peak near 300 yr, about 50 AU.
  - Recalled, not re-checked: orbits are near-circular below about 12 days and roughly flat in e above; mass ratios are roughly flat with an excess of near-equal pairs.
  - The earlier survey, Duquennoy & Mayor 1991 (A&A 248, 485), gives about log P 4.8, σ 2.3.
- **Doyle et al. 2011**, Science 333, 1602, Kepler-16.
  - The binary: a_B = 0.22431 AU, e_B = 0.15944, P_B = 41.08 d.
  - The planet: a = 0.7048 AU, P = 228.8 d, e = 0.0069.
  - The masses, about 0.69 and 0.20 M☉ (μ ≈ 0.23), are recalled.
  - The formula gives a_c = 2.88 a_B = 0.646 AU, so **the planet sits at 1.09 × the limit, and is near circular**. The mock's `P_FIRST = 1.08` comes from this.
- **Kraus et al. 2016**, AJ 152, 8.
  - Inside a_cut ≈ 47 (+59/−23) AU, planet occurrence in binaries is 0.34 (+0.14/−0.15) × that of single stars or wide binaries.
  - Debated: Horch et al. 2014 and Matson et al. 2018 do not find the suppression.
- **Armstrong et al. 2014**, MNRAS 444, 1873.
  - Circumbinary planet occurrence is about 10 % (+18/−6.5) for R > 6 R⊕ and P < 300 d if the planets are coplanar. That is consistent with single stars.
  - Giant circumbinary planets are rarer than small ones.
- **Circumbinary pile-up near the limit.**
  - Welsh et al. 2014 and Martin & Triaud 2014 found that biases alone do not reproduce it.
  - Quarles et al. 2018 (arXiv 1802.08868) find no strong evidence for it. Li, Holman & Tao 2016 (arXiv 1608.01768) show it depends on Kepler-1647b.
  - Treat it as plausible, not settled.
- **α Cen AB**, from Pourbaix & Boffin 2016 (A&A, arXiv 1601.01636): P = 79.91 yr, e = 0.524, masses 1.133 / 0.972 M☉.
  - a ≈ 23.5 AU. This is my own conversion of the angular orbit at 1.35 pc, not a published figure.
  - The S-type formula gives a_c ≈ 0.116 a ≈ 2.7 AU round A.
  - The forced eccentricities are in Quarles et al. 2018 (arXiv 1801.06116).
  - No confirmed planet round A or B. Proxima b goes round the distant third star.
- **Kostov et al. 2014**, ApJ 784, 14, Kepler-413b.
  - The planet's orbit is tilted 2.5° to the binary's. Nodal precession makes its transits vanish for about 800 days and then return.
  - This is the real version of the essay's "slightly tilted orbits that turn slowly".
- **Forced eccentricity**:
  - S-type, Heppenheimer 1978 (A&A 65, 421): `e_F = 5/4 · (a / a_B) · e_B / (1 − e_B²)`.
  - P-type, Moriwaki & Nakagawa 2004 (ApJ 609, 1065), recalled: `e_F ≈ 5/4 · (a_B / a) · e_B · (m₁ − m₂)/(m₁ + m₂)`. It is small, which is why circumbinary planets stay near circular.
- **Apsidal precession** (standard quadrupole results, recalled, check before quoting):
  - S-type: `ω̇ ≈ 3/4 · n · (m_c / m_h) · (a / a_B)³ · (1 − e_B²)^(−3/2)`.
  - P-type: `ω̇ ≈ 3/4 · n · μ(1−μ) · (a_B / a)²`.
  - Both get faster toward the limit.

### T3: blogs and press

- The press releases on Kepler-413b, at jpl.nasa.gov/news/kepler-finds-a-very-wobbly-planet and newswise.com/articles/kepler-finds-a-very-wobbly-planet.
  - These carried a spin-precession figure (30° over 11 yr) that the lead author later corrected to "fixed, or about 300 yr".
  - So use the paper, not the press.
- Popular write-ups of Kepler-16b, for example the en.wikipedia.org/wiki/Kepler-16b summary. Use them only to cross-check the T2 numbers.

### How a binary moves (two-body problem)

- The relative orbit is a Kepler ellipse: r = a(1 − e cos E), M = E − e sin E, P² ∝ a³ / (m_A + m_B).
- Each star moves on its own ellipse round the barycentre, with the barycentre at one focus.
  - Star A: semi-major axis (m_B/M) a, at −(m_B/M) **r**.
  - Star B: semi-major axis (m_A/M) a, at +(m_A/M) **r**.
  - Same e, same period, opposite phase.
- The heavier star makes the smaller ellipse.

## Design proposal for the generator

### Which pairs

Two-pass and seeded:

1. Lay out as today: `fitSystem`, then `placeStars`.
2. Take the mutual-nearest pairs of filler stars closer than `PAIR_K = 1.35` × their combined outer radii.
3. Go through them closest first and keep each with a seeded chance `BIN_SHARE = 0.8`, at most `BIN_MAX = 4`. This seed gives 3, which is 3 of 27 systems, about 11 %.
   - Real solar-type systems are about 33 % doubles. But at this scale a real "typical" binary (about 50 AU, with planets near 1 AU) would sit 100+ units apart: every pair here is a *close* binary.
4. The pair nearest the neighbourhood's middle is the hero. Option (d) makes it P-type.
5. Never pair scripted stars, and never N0's star.

The other approach, a seeded share drawn before placement, avoids the second pass but stops being about *close* pairs.

### Masses and type

- The essay has no masses. The mock uses mass = 0.5 + 0.7 · (brightness − 0.5)/0.5, so the brighter star is the heavier.
- S-type or P-type: one P-type at most (the hero), the rest S-type. A seeded P share is just as easy.

### S-type

- a_B = today's distance, clamped to `BIN_A = [16, 26]`. e_B is seeded in `[0.1, 0.4]`.
- Each star's limit is `a_c = hwS(m_other/M, e_B) · a_B`.
- Refit each star's own slots with `fitSystem`, using a_c as its bound instead of 9.6:
  - The designed spacing (`nominalRadii`) is scaled in, by 0.92 · a_c / its last floor.
  - Outer slots are dropped down to one planet.
  - If even one planet does not fit, a_B grows by 3 % and the fit runs again.
- Near the limit:
  - Eccentricity: each planet gets the forced e_F added on top of its band draw, capped at 0.4. That is about +0.05–0.1 here.
  - Precession: each planet's precession quickens by 1 + 2 (r / a_c)³.

### P-type

- e_B is seeded in `[0.02, 0.12]`.
- The stars' least gap at periapsis is `P_GAP = 1.8`, so a_B ≈ 2.1.
- `a_c = hwP(μ, e_B) · a_B ≈ 5.8`.
- Both stars' slots are interleaved, and the generator's clearance rule lays them out from a first periapsis at `P_FIRST = 1.08 × a_c` out to 9.6. This seed keeps 2 planets, at 7.55 and 9.60, with e = 0.07.
- Precession quickens by 1 + 2 (a_c / r)².

### The stars' own orbit

- Both stars use one Kepler constant, matched to `planetPeriod` at r = 5: `P = 9.73 · a^1.5` ambient seconds.
  - S pairs: 620–790 s (10–13 min). Slow, but visible in a long dwell or with the slider.
  - P pair: 29 s, a clear dance.
- In the generator, a binary star becomes an orbiting body:
  - `host` = a new barycentre row, which has the spot.
  - `orbit` = {a: f·a_B, e: e_B, ω: ω_B (+π for B), period, phase, tilt 0, precession ∞}.
  - `spot` = null.
- The existing 3-hop `bodyGalactic` walk then covers moon → planet → star → barycentre unchanged. A P-type pair's planets take the barycentre as their `host` and keep their plan as `star`, for lineage and streams.

### Planets ride their host

This is automatic with the host chain. Tracks drawn about `bodyWorld(host)` move with it.

### The plan schematic

All of it is in phosphor (#8FE3C8):
- The barycentre mark: a cross and a small circle, 24 dots.
- Each star's ellipse about the barycentre, dotted: 60 dots and 90 dots.
- The **stability limit as a dashed ring**: 96 slots, 60 lit.
  - Round each star (S-type): it moves with the star.
  - Round the barycentre (P-type): fixed.

That is 294 dots per S pair and 234 per P pair. It fades in with the essay's system LOD (40 → 110 px here), so nothing is marked at the far neighbourhood, as the schematic rules require.

Options (a) and (b) draw the would-be limits round the hero pair. They are there only to make the case, and are not part of the proposal.

### Purity

- Every frame is a pure function of (scroll, ambient t).
- Draws come from `streamFor(seed, 'binaries', pairKey)`.
- The Kepler solve runs a fixed 6 Newton steps, so it is bit-stable.
- No `Math.random`.
- In the mock, `performance.now()` only advances `P.t` in live mode. Every frame is drawn from `P.t` alone, which the purity check confirms.

## Numbers (seed of the mock)

The **budget** counts instances the way `fitBudget` does: every shell at full lattice, 160 + 96 dots per star, 90 per planet track, 40 per moon track, plus the binary plan. **Drawn** is what the mock's level of detail puts on screen at t = 120 s, at 390×844, without the 900 background dots.

| option | systems | planets | moons | budget (stars / shells / moons / tracks / plan) | drawn, hood | drawn, close |
|---|---|---|---|---|---|---|
| a today | 30 | 107 | 128 | **49,634** (7,680 / 25,575 / 2,349 / 14,030 / 0) | 7,633 | 21,461 |
| b widened 1.5× | 30 | 107 | 128 | **49,634** (same) | 8,533 | 15,678 |
| c S-type | 27 | 95 | 100 | **44,783** (7,680 / 22,349 / 1,842 / 12,030 / 882) | 9,359 | 24,495 |
| d + P-type | 27 | 94 | 100 | **44,426** (7,680 / 22,142 / 1,842 / 11,940 / 822) | 8,794 | 24,344 |

**Neighbourhood radius** (from each layout's centroid): a 75, b 103, c 104, d 104.

**The pairs:**
- 10+15: S, a 16.0, e 0.22, P 623 s, limits 3.9 / 2.5, planets 2 + 1. As P-type: a 2.08, e 0.11, P 29 s, limit 5.8, 2 planets.
- 14+28: S, a 17.5, e 0.34, limits 2.9 / 2.9, planets 1 + 1.
- 22+27: S, a 18.7, e 0.28, limits 3.6 / 3.3, planets 1 + 1.

**Over the would-be limit** (outermost planet past `hwS(μ, 0) × distance` to the nearest star): a 29/30, b 22/30, c 13/30, d 13/30.

**Widening sweep on (b):**

| factor | over the limit | hood radius |
|---|---|---|
| 1.75 × | 11/30 | 109 |
| 2.0 × | 5/30 | 133 |
| 2.25 × | 4/30 | 135 |

## Uncertain

- **Using the limit as the yardstick for unbound neighbours.** The essay's stars never move, so a reader would take a neighbour as a permanent companion. HW99 assumes a bound binary, so the "over the limit" counts are a stand-in, not a stability result. I compare apoapsis and semi-major axis with a_c, which is conservative.
- **The mock's model is a port, not the generator.**
  - It drops the HOOD_R galactic-radius band and scripted pins (P5's nine).
  - It uses its own hash in place of `streamFor`.
  - Exact counts will differ in the essay. The ratios should hold.
- **Recalled, not re-checked:** the P-type forced eccentricity and both precession formulas, Kepler-16's masses, the e and mass-ratio shapes in Raghavan et al., and the citations for Duquennoy & Mayor, Wiegert & Holman 1997 and Hatzes et al. 2003 (γ Cep Ab, an S-type planet in a ~20 AU binary, not used above). Check them before any of it goes into prose.
- **Masses.** Mass from brightness is a stand-in. If the essay ever states sizes, μ should come from those.
- **The vertex-cost figure.** It assumes binary systems hold about 10 % of the motes, and that the shader evaluates the host chain per mote as `bodyCentre`/`bodyGalactic` read. I did not profile.
