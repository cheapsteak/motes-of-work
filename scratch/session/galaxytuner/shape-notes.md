# Shape notes: soft-edged arms for the galaxy tuner

Galaxy tuner (`galaxy-tuner.html`). The author's complaint about RECOMMENDED was "stark outlines, a density cliff,
colouring inside the lines". This page adds three new shape modes, five presets and a placement option. It also
records the measurements behind them. Comparison image: `shots/shape-compare.png`.

## 0. Source of truth

The built `galaxy-tuner.html` (16:59) differed from `build.py` output (`galaxy-tuner.src.html` + `gen.js` +
`hood.txt`) only by the "Hold to see" peek button. Those three parts (CSS, `<button id="peek">`, and the
pointer/space-bar handler) were ported into `galaxy-tuner.src.html`. A rebuild was then byte-identical (`cmp`) to the
16:59 file. **Edit `galaxy-tuner.src.html` / `gen.js`, then run `python3 build.py`.** Never edit the built file.

**TODAY and RECOMMENDED are bit-for-bit unchanged.** `work/baseline.mjs` (in the scratchpad) hashes the star,
bright and dust arrays for TODAY and RECOMMENDED: phone and desktop tiers, seeds 1 and 2, from the pre-change
`gen.js`. The hashes were re-checked after every edit and still match. The preset objects themselves are untouched.
The new keys live in `SHAPE_DEFAULTS` (shape `'arms'`, place `'roomiest'`), and the page merges them in. At those
defaults nothing new is read.

## 1. The diagnosis, checked against the code and measured

Method (`work/metrics.mjs`):
- Stars at r 80–160 on the phone tier, summed over seeds 1–6.
- Binned by signed distance d across the arm (3-unit bins; d < 0 is the inner, concave edge).
- d is measured perpendicular to the log spiral through the neighbourhood (d ≈ −r·sin(atan pitch)·Δθ).
- `recNone` is RECOMMENDED with no clearance, which shows its underlying density.

```
   d     today      rec  recNone     wave    field      m74 readable
 -29         0       30       26       98       71      122       95
 -23         0       43       27      104       93      101       94
 -17         0       68       36      116      107      154      113
 -14         0      169      101      138      132      185      157
 -11       315      337      238      252      224      156      126
  -8       706      462      383      421      346      167      153
  -5       757      450      402      797      466      299      334
  -2       758      652      758     1105      627      484      636
   2       733      706     1000     1001      743      581      871
   5       778      686      889      630      732      623      846
   8       728      590      584      337      567      496      581
  11       338      392      254      201      395      459      445
  14         0      204      102      133      294      345      311
  17         0       78       33       89      179      255      214
  20         0       36       21       98      130      228      192
  23         0       18       12       80      119      183      166
  29         0       23       17       73       70      126       94
share at |d| ≥ 17:  today 0 % · rec 8.0 % · recNone 4.9 % · wave 15.8 % · field 18.7 % · m74 29.6 % · readable 22.7 %
floor / peak:       today 0 % · rec 2.5 % · recNone 1.2 % · wave 6.2 %  · field 9.4 %  · m74 16.2 % · readable 10.8 %
```
(The table omits the −26 and +26 rows; `work/final-profile.txt` has every bin.)

1. **Confirmed: the cross-arm "gaussian" is hard-bounded.**
   - `gauss3` is a sum of three uniforms, so it is exactly zero beyond ±3σ. At r = 120, σ = 3 + 6·120/220 = 6.3,
     so the bound is ±19 units.
   - RECOMMENDED falls ×2.6 per bin from +14 to +17 and ×2.2 from +17 to +20. It then stays at about 2.5 % of the
     peak: the arm ends on nothing.
   - The bound bites even with no clearance (`recNone`: ×3.1 per bin).
   - TODAY is the extreme case: a uniform bearing scatter gives a flat top, then zero.
2. **Confirmed that placement flattens the crest into a plateau. Corrected on which part of the rule does it.**
   - Roomiest-of-64 shaves 29 % off RECOMMENDED's crest (706 vs 1000 at +2). It doubles the flanks (169/204 vs
     101/102 at ±14), which then meet the ±3σ bound: a plateau with a cliff.
   - But "keep the roomiest" is not the mechanism. "Stop at the first clear draw" is: about half of all stars are
     redrawn at least once.

     | preset | redrawn at least once | no clear draw in 64 |
     |---|---|---|
     | TODAY | 49.6 % | 1.6 % |
     | RECOMMENDED | 51.5 % | 4.3 % |
     | DENSITY_WAVE (reject) | 47 % | 1.5 % |

     Every redraw moves a star from the crowded crest to a clear flank. Only the 1–4 % that never find a clear draw
     are where roomiest and reject differ.
   - Measured: switching RECOMMENDED to the reject-only rule leaves the profile essentially unchanged (peak 706 → 716).
     The new modes, too, give the same profile under roomiest and reject.
   - So option 2 (reject-only) does **not** preserve the density profile in a crowded arm. Only option 3 (none) does.
     The underlying limit is real: at phone scale a bright halo needs 3.35 units of clear space. With 2,400 stars, an
     arm crest can hold only so many stars before they touch. With halo clearance, a readable crest has to be wide,
     and only overlap allows a narrow, high crest.
3. **Confirmed: the dust lane is a hard band.**
   - `inLane` is `|d/σ − offset| < width/2` with probability `laneDepth`.
   - It shows as a notch at −5 (450 against 462 and 652 on either side).
4. **Confirmed: there is far too little inter-arm population.**
   - RECOMMENDED puts 8 % of stars beyond 17 units of the crest (2.5 % floor), and TODAY puts none.
   - The research notes (below) measure real old discs as about 50 % inter-arm. Old-star contrast is ×2.0–3.3
     (S4G 3.6 µm: M74 ×2.4, M51 and M100 ×3.3).
   - The new modes put 16–30 % beyond 17 units, with a floor of 6–16 % of the peak. The arm sits on a sea of stars.
5. **Added: one population.** Real young arms are about 2× narrower and higher-contrast than the old-star arm, and sit
   downstream of it. RECOMMENDED gives every star the same width and contrast.
6. **Added: the bulge is Sb-sized.** 22–25 % of the stars, against 5–10 % for an Sc like M74. This also starves the
   arms of stars.

**Halos (the repo's rule).** `background.test.ts` "keeps the halos apart" requires ≥ 95 % of stars to be clear by the
test's own measure. A flat-ppu approximation (`work/halos.mjs`) gives these phone-tier shares:

| preset | stars clear |
|---|---|
| TODAY | 98.7 % |
| **RECOMMENDED** | **93.8 %** (already below 95 %) |
| wave / field / recipe under reject | 97–99 % |
| wave / field under none | 44–50 % |

## 2. What was built

### Generator (`gen.js`) and page

- `shape`: `'arms'` (today's and RECOMMENDED's generator) · `'wave'` (A) · `'field'` (B) · `'recipe'` (C, the
  research recipe).
- `place`: `'roomiest'` (today) · `'reject'` (the first clear draw of 64; otherwise a fresh draw from the density,
  ignoring room) · `'none'`. In every option a neighbourhood star's halo is still never touched, and the core
  exclusion is still hard.
- **Halo-touch measure.** `bg.touch` is the share of bright stars (and of all stars) whose nearest neighbour is nearer
  than their halo clearance (room < 1, the generator's own rule). It is computed after placement and shown live in the
  readout line: `wave/none · halos touch: bright 85.0 %, all 61.5 %`. `bg.placement` adds the redraw statistics.
- **Page.**
  - A "Shape" and a "Recipe (M74)" control section; `recipe` is one of the `shape` select's options.
  - Preset buttons: Density wave, Smooth field, M74 recipe, Readable.
  - `window.tuner` exposes `DENSITY_WAVE`, `SMOOTH_FIELD`, `RECIPE_M74`, `RECIPE_READABLE` and `SHAPE_DEFAULTS`.
  - The dots and brackets compare against `BASE` = TODAY + shape defaults.
- **Streams.**
  - Unchanged: `bgStars` i, `bgDust` i, `bgPop` i (13, the population draw for wave/field) and `bgKnots` k.
  - New: `bgArmMod` (salt 14, one along-arm modulation table per arm) and `bgSpurs` (salt 15, recipe).
  - No `Math.random`.
- **Counts** are unchanged: 2,400 stars and 4,000 dust on phone, 4,000 and 8,000 on desktop.

### Shared pieces of the new modes

- **Two populations.**
  - Old disc and bulge: warm (`warmCore` → `oldWarm`, as √(r/R)), dimmed by `oldDim`, broad and low-contrast.
  - Young stars and knots: blue, never warm, brightened (`youngBright`, `clumpBright`), tight to the arms. They fill
    most of the bright set.
  - Each population has its own share, contrast A (crest/trough = 1 + A) and sharpness or width.
- **Disc law.** An exponential disc of scale `discScale`·R, with young stars at `armScale` × that. It tapers smoothly to
  zero (`discFade` → `discFadeEnd`); nothing is clamped at the rim.
- **Arm ramp.** The arms fade in past the bulge (`armStartIn` → `armStart`), and optionally out toward the rim.
- **Along-arm modulation** (`modDepth`, `modPeriod`). Seeded value noise in ln r, so real-looking segments and dips
  (Chugunov 2025: the most valuable single addition in their fits).
- **Dust lane.** A multiplicative gaussian dip on the concave edge, never a cut. The dust motes peak in the lane
  (`dustLane` / `dustLaneGain`).
- **Knots.** Placed on the young crest, slightly downstream. Members follow an unbounded normal.
- **Dust follows the same field,** softer.
- **Rejection sampling everywhere.** No profile has a bound.

### A. Density wave (`shape: 'wave'`): arms from orbits

- **Orbits.** Each star rides an ellipse:
  - semi-major axis a, drawn from the disc law;
  - axis ratio q(a) = 1 − e(a), with e(a) = `waveEIn` + (`waveEOut` − `waveEIn`)·a/R;
  - major axis turned by φ(a) = ln(a/2)/pitch + ψ, the same log twist as `armAngleAt`, so the crests run at the
    arms' pitch (0.28);
  - an orbital phase t, giving X(a, t) = Rot(φ)·(a cos t, q a sin t).
- **Where the arms come from.** With uniform t, the planar density is ∝ g(a)/J, where
  J = a[q cos²t + (q + a q′) sin²t] + (1 − q²)(a/pitch)·sin t cos t. This agrees with a finite-difference Jacobian to
  1e-8. The orbits crowd where J is least, at 2t* = atan2(−(1 − q²)/pitch, −(q − (q + a q′))).
  **Nothing is drawn inside an outline:** the arms are where the orbits bunch.
- **Old stars and dust** take uniform t. The crowding alone gives old-star contrast of 1.5× at a = 40, 1.7× at 65,
  2.2× at 120 and 3.7× at 200, rising outward as observed (S4G 2–3.3×, "Rise").
- **Young stars** are weighted toward t* (Δ = −2(t − t*); the sign was checked so the lane falls on the inner edge).
- **Neighbourhood.** ψ is solved numerically so that the crest passes radius 65, bearing 0.9, the neighbourhood's
  middle.
- **Caustic limit.** Orbits cross once q < √(pitch² + 1) − pitch, i.e. e > 0.2415 at pitch 0.28. That is
  a caustic: infinite density and a hard edge. Keep `waveEOut` ≲ 0.2.
- **Arm count.** Ellipses give m = 2 by construction, so `arms` is ignored in this mode.
- **For the essay: time comes free.** A star's position is analytic in (a, t). Advance t at ω(a) and turn the pattern
  at Ω_p, as X(a, t₀ + ω(a)τ) under Rot(φ(a) + Ω_p τ), and the galaxy turns with arms that persist, as a pure function
  of τ. Stars stream through arms that stay put in the pattern frame. Today the whole cloud can only rotate rigidly.

### B. Smooth field (`shape: 'field'`)

- ρ(r, θ) = disc(r) × (1 + A·ramp·mod·f(Δ)) × lane, where:
  - Δ = −wrap(m(θ − θ_arm(r))), using the existing `armAngleAt` (so the arms pass the neighbourhood exactly as today);
  - f(Δ) = ((1 + cos Δ)/2)^s is smooth and periodic. The sharpness s sets the width: FWHM/r = pitch·Δ_FWHM/m. Old s = 2
    gives 0.32 r, which matches the measured 0.3 r.
- Sampling: r from the disc law, θ uniform, accepted with the weight above.

### C. The research recipe (`shape: 'recipe'`), from `armresearch/findings.md` §7 and `proto.html`

Ported line for line: the prototype runs the same five populations, profile and streams. In brief:
- Populations by index range: bulge 8 %, old 50 %, young 26 %, knots 12 %, spurs 4 %.
- An unbounded Sérsic cross-arm profile, exp(−ln2·(|d|/w)^(1/n)), with n = 0.6.
  - The width grows with radius: old FWHM 0.30 r, young 0.13 r.
  - The young crest sits 0.12 old half-widths downstream.
- Arm contrast: A_old = 1.8, A_young = 9.
- Seeded along-arm modulation: 0.45 depth, period 0.35 in ln r.
- A gaussian lane at −0.45 w, 0.14 w wide, 0.6 deep; the dust peaks there (×2.5 gain), with 70 % of the dust on the
  arm weight.
- 26 knots of spread 0.045 r; 20 spurs at 50°.
- A soft rim from 0.9 R to 1.2 R, and the bulge as an exponential sphere of 0.06 R.

Ported check: the old population's share beyond one HWHM (r 80–160) is 0.533–0.558, against the prototype's
0.52–0.59.

**Two deviations from the prototype**, both from the brief's constraints:
- The hard core exclusion is kept, on top of the recipe's soft core taper.
- The neighbourhood is kept clear with the tuner's halo rule (`nearHood`), not the prototype's 3.2-unit radius.

## 3. Presets (and what came from the research)

| key | base | RECOMMENDED | DENSITY_WAVE | SMOOTH_FIELD | RECIPE_M74 | RECIPE_READABLE |
|---|---|---|---|---|---|---|
| `shape` | arms | – | **wave** | **field** | **recipe** | **recipe** |
| `place` | roomiest | – | **none** | **none** | **none** | **none** |
| `pitch` | 0.28 | **0.34** | · | · | · | · |
| `coreShare` | 0.22 | **0.25** | **0.15** | **0.15** | **0.08** | **0.08** |
| `bulgeScale` | 0.09 | **0.08** | **0.06** | **0.06** | **0.06** | **0.06** |
| `bulgeFlat` | 0.55 | · | · | · | **0.6** | **0.6** |
| `discScale` | 0.3 | **0.4** | **0.32** | **0.32** | **0.32** | **0.32** |
| `armScale` (× discScale) | 1 | – | **1.3** | **1.3** | **1.3125** | **1.3125** |
| `discFade` / `discFadeEnd` | 0.7 / 1 | – | **0.8** / 1 | **0.8** / 1 | **0.9 / 1.2** | **0.9 / 1.2** |
| `armStartIn` / `armStart` | 0 / 0.16 | – | · | · | **0.07 / 0.18** | **0.07 / 0.18** |
| `armEnd` / `armEndOut` | 1 / 1 | **0.9** | · | · | **0.85 / 1.05** | **0.85 / 1.05** |
| `youngShare` | 0.3 | – | **0.5** | **0.5** | **0.26** | **0.36** |
| `youngContrast` | 12 | – | **25** | **25** | **9** | **30** |
| `youngSharp` (wave/field) | 8 | – | **6** | **6** | – | – |
| `widthYoung` (recipe) | 0.13 | – | – | – | 0.13 | **0.10** |
| `youngBright` | 0.5 | – | **0.8** | **0.8** | **0** | **0.4** |
| `oldContrast` | 1 | – | **0** (orbits give it) | **2** | **1.8** | **1.8** |
| `oldSharp` / `widthOld` | 2 / 0.3 | – | – | 2 | 0.3 | 0.3 |
| `oldDim` | 0 | – | **0.25** | **0.25** | **0.25** | **0.45** |
| `warmCore` → `oldWarm` | 0.9 → 0.6 | (0.9 → 0.04) | **0.97** → 0.6 | **0.97** → 0.6 | **0.75 → 0.2** | **0.75 → 0.2** |
| `waveEIn` / `waveEOut` | 0.02 / 0.12 | – | **0.03 / 0.15** | – | – | – |
| `clumpShare` / `clumpCount` | 0 / 36 | **0.18 / 30** | **0.12 / 30** | **0.12 / 30** | **0.12 / 26** | **0.12 / 26** |
| knot size | 4.5 units | 5 | 5 units | 5 units | 0.045 r | 0.045 r |
| `clumpOut` | 0.6 | · | **0.5** σ | **0.5** σ | **0.15** w | **0.15** w |
| `laneDepth` / `laneOffset` / `laneWidth` | 0 | 0.6 / −0.6 / 0.4 σ | **0.5 / −1.6 / 1** σ | **0.5 / −1.6 / 1** σ | **0.6 / −0.45 / 0.14** w | **0.6 / −0.45 / 0.14** w |
| `modDepth` / `modPeriod` | 0 / 0.35 | – | **0.45** / 0.35 | **0.45** / 0.35 | **0.45** / 0.35 | **0.45** / 0.35 |
| `dustContrast` / dust sharpness / lane | 1 / 1.5 / 0 | – | **3 / 4 / 1** | **3 / 4 / 1** | **1.2**, gain 2.5, arm share 0.7 | same |
| spurs | – | – | – | – | 4 %, 20, 50°, 0.16 r, 0.012 r | same |
| `brightFloor` / `brightPow` | 0.35 / 2 | 0.3 / 2.2 | 0.3 / 2.2 | 0.3 / 2.2 | **0.3 / 2.5** | **0.3 / 2.5** |

The other keys are inherited from RECOMMENDED (sprites, haze, warm tint) or unused by the mode. The full generated
table is in `work/preset-table.md`.

**Which values came from the research** (`armresearch/findings.md`):
- Wave and field took:
  - disc scale h = 0.32 R (Freeman), with arm light at 1.3 h (Chugunov 2025);
  - a smaller bulge of 0.06 R (Sc, Graham & Worley 2008);
  - old-star contrast ≈ ×3 for the field (`oldContrast` 2, S4G), with old FWHM 0.3 r (`oldSharp` 2 gives 0.32 r);
  - young width from s = 6–10, which gives FWHM 0.13–0.19 r (HII arms 0.1–0.19 r);
  - lane depth 0.5 (the 0.4–0.6 range), as a gaussian on the inner edge with the dust peaking there;
  - knots on the young crest, slightly downstream;
  - the recipe's along-arm modulation (0.45 / 0.35).
- RECIPE_M74 is the recipe's numbers verbatim.
- The rest was tuned by eye, for readability at the phone galaxy-wide view:
  - young contrast 25 in wave/field, above the research's young/old ratio;
  - `youngShare`, `oldDim`, `youngBright`;
  - `coreShare` 0.15 in wave/field, a compromise between Sc (0.08) and keeping the core populated;
  - the wave ellipticities;
  - placement 'none'.
- **RECIPE_READABLE** is the coordinator's brief applied to the recipe:
  - young share 0.26 → 0.36, contrast 9 → 30;
  - young arm narrowed (FWHM 0.13 r → 0.10 r) and brightened (`youngBright` 0.4);
  - the old disc dimmed (`oldDim` 0.25 → 0.45).

  The old disc keeps its broad, low-contrast profile (A 1.8, FWHM 0.3 r) and the recipe's ~50 % inter-arm share.

**Placement.** Every new preset uses `place: 'none'`, because only that keeps the density profile (§1, point 2). The
arms read far more clearly with it: compare `work/iter/sheet7.png` and `sheet8.png`, the same presets under reject
and under none. The cost is overlapping halos. Switching any new preset to `'reject'` brings the touch share to
0–5 % and its halos-apart share back to ≥ 97 %, at the price of wider, fainter arms.

### Measured halo-touch share (bright stars whose halo touches a neighbour; seed 1)

| preset | phone | desktop | same preset under reject (phone) |
|---|---|---|---|
| TODAY (roomiest) | 14.2 % | 0.0 % | 12.8 % |
| RECOMMENDED (roomiest) | 32.2 % | 0.2 % | 24.4 % |
| DENSITY_WAVE (none) | 85.0 % | 61.0 % | 4.4 % |
| SMOOTH_FIELD (none) | 70.8 % | 49.2 % | 1.9 % |
| RECIPE_M74 (none) | 76.9 % | 50.2 % | 0.3 % |
| RECIPE_READABLE (none) | 78.3 % | 53.3 % | 0.0 % |

The arms still pass through the neighbourhood's middle in every new preset. At r 50–80 the crest bin is at d = 0…+2
units (`work/final-profile-hood.txt`), and the 30 `HOOD` spots are fixed constants that no background halo touches.

## 4. What it would take in `src/galaxy/background.ts` (269 lines)

The generator also places the neighbourhood (via `generateGalaxy`) and is pinned by `background.test.ts` and
`generate.test.ts`. Any of these modes changes every background array, so every checksum and golden value moves.
None of them moves the 30 neighbourhood spots: those come from the galaxy's own streams, and the background only
avoids them.

- **Common to all three (about 60 lines).**
  - Population split, per-population brightness and colour.
  - A rejection-sampling candidate function in place of the arm draw.
  - The placement switch.
  - The `bgArmMod` salt (14) in `seeds.ts`, and BG constants for the new keys.
- **A, density wave: about +130 lines.**
  - Orbit helpers, crest t*, ψ solve, sampler, knots, dust.
  - Tests to rewrite:
    - "rest on two arms" (it asserts every star within a bounded scatter) becomes a cross-arm profile, contrast and
      crest-through-the-neighbourhood test;
    - "keeps the halos apart" (≥ 95 %) fails under 'none' (44 %) and would need re-ruling, or 'reject' kept;
    - `|y| ≤ starY`, `brightness ≥ 0.35` and dust 0.08–0.18 need new constants;
    - "no hole in the core" fails for some seeds with the smaller bulge (it passes at today's 22 %).
- **B, smooth field: about +100 lines.** The same test impact as A.
- **C, recipe: about +150 lines** (spurs, Sérsic profile, dust mixture, soft rim).
  - It also breaks r ≤ R: stars reach 1.2 R ≈ 260.
  - It needs salt 15 (`bgSpurs`).
  - It fails the same tests as A and B.
- **Context.** RECOMMENDED itself already breaks r ≤ R (226–231), |y| ≤ starY, brightness ≥ 0.35, the dust range and
  the 95 % halo rule (93.8 %). So adopting RECOMMENDED was already a re-ruling of those tests. The new modes add the
  "no hole in the core" sector test and, under 'none', a much lower halo-apart share.

## 5. Recommendation

**Adopt the research recipe's structure in its readable tuning (`RECIPE_READABLE`), with placement 'none'.** It has
the best-supported shape:
- an unbounded Sérsic profile, width ∝ r, and about 50 % inter-arm old stars;
- the young arm downstream, a gaussian lane, knots, spurs and along-arm segments.

At phone size it reads as two clear arms with soft, ragged edges (floor 10.8 % of peak, against RECOMMENDED's 2.5 %).
The faithful M74 tuning is more realistic, but at 2,400 points the spiral barely reads.

Two options to keep in view:
- **The density wave is the one to take if the essay will ever turn the galaxy.** Its arms survive motion
  analytically, and its old-star contrast comes from physics rather than a slider. Its stills read as clearly as the
  recipe's.
- **The smooth field is superseded** by the recipe: same idea, cruder profile. I would drop it from a port.

Either way, the author has to rule on halo overlap first. Readable arms at phone scale need it: 70–85 % of bright halos
touch under 'none', and 0–5 % under 'reject', which gives wider and fainter arms. RECOMMENDED already breaks the 95 %
rule.

## 6. Files

- `galaxytuner/galaxy-tuner.src.html`, `gen.js`, `build.py` → `galaxy-tuner.html` (rebuilt).
- Stills, phone 390×844@3x and desktop 1440×900, sheet hidden (`peek`):
  `galaxytuner/shots/shape-{today,recommended,density-wave,smooth-field,m74-recipe,readable}-{390x844@3x,1440x900}.png`.
- Comparison: `galaxytuner/shots/shape-compare.png` (all six at phone size).
- Measurement scripts in the scratchpad `work/`: `baseline.mjs` (bit-exactness), `metrics.mjs` (cross-arm profiles),
  `touch.mjs`, `halos.mjs`, `repotests.mjs`, `probe.mjs`. Tables: `final-profile*.txt`, `preset-table.md`.
- The temporary Playwright scripts under `shots/` were deleted. The http.server was stopped
  by PID.
- Added in the second round:
  - `shots/shape-colour.png`;
  - `shots/colour-{readable,readable-colour,readable-colour-x2,density-wave-colour}-{390x844@3x,1440x900}.png`;
  - `shots/compare-default-390x844@3x.png` (the collapsed default view).

## 7. Star colour (second round; opt-in, `starColour` > 0)

The author ruled that halo overlap is fine, so placement 'none' is approved for the new presets.

### What is realistic at this scale

Each mote stands for many stars, so its colour is close to an integrated population colour, and those vary very
little:
- **Arms are only slightly bluer than the disc around them.** Most galaxies show an arm–disc B−V difference of no
  more than 0.1 mag (two-colour study, arXiv:1509.02356, T2).
- **Bulge and disc colours within one galaxy differ less than galaxies of the same type differ from each other**
  (de Jong 1996 and the bulge/disc colour literature, arXiv:astro-ph/9601005, T2).
- Real deep images do show visible variety among the brightest resolved stars and complexes:
  - blue-white OB and A supergiants;
  - a sprinkle of red supergiants, at a blue/red supergiant ratio of about 3 at solar metallicity (Eggenberger,
    Meynet & Maeder 2002, A&A 386, 576; O, B and A counted as blue, 45 Galactic clusters, T2);
  - yellow-white to pale-orange G/K giants in the bulge and the old disc.

So the honest look is **near-white stars with a slight blue cast in the arms and a slight warm cast toward the bulge,
low saturation throughout.** It is not the saturated spectral-class palette of a star chart.

### The model (`gen.js`)

- **Temperature.** Each star draws a temperature from a new per-star stream, `bgTemp` (salt 16), so positions are
  unchanged when colour is on (verified: identical star arrays). The draw picks a spectral class from its population's
  mixture, then a temperature log-uniform within the class (Teff bands after Pecaut & Mamajek 2013's dwarf scale, T2).

  | population | B | A | F | G | K | M |
  |---|---|---|---|---|---|---|
  | young arm, knots, spurs | 48 % | 26 % | 8 % | 5 % | 9 % | 4 % |
  | old disc | 2 % | 4 % | 10 % | 30 % | 46 % | 8 % |
  | bulge | 0.5 % | 1.5 % | 6 % | 25 % | 58 % | 9 % |

  - The young K+M share of 13 % is the red-supergiant sprinkle (B/R ≈ 3 among supergiants), diluted by the equally
    bright main-sequence B/A stars.
  - The old disc's B/A share is the blue-straggler and young-field sprinkle.
  - **The shares are my reading of those sources, not measured values (T4 as numbers).**
  - On seed 1 (2,400 stars): B 643, A 338, F 196, G 407, K 696, M 120.
- **Spread sliders.** `youngTempSpread` and `oldTempSpread` scale log T about each population's median (11,000 K /
  5,200 K / 4,800 K).
- **Blackbody to sRGB.** Tanner Helland's fit (T3) to Mitchell Charity's CIE blackbody table (T3, "What colour is a
  blackbody"), white near 6,600 K.
- **The essay's palette guards** (`guardTint`), applied after the variety scaling:
  - **Variety.** `starColour` scales every star's deviation from white (0 = off, 1 = the blackbody's own, 2 = double).
  - **Warm side.** The colour is projected onto the white → `#FFD9A0` ray: its hue becomes the cap's amber (36°),
    never the blackbody's orange or red, and its saturation is at most the cap's (0.373). M stars land at the cap.
  - **Cool side.** The colour keeps its blackbody hue (≈ 220°), but its saturation is capped at 0.30. The agents'
    `#4DA3FF` is 0.70 and the frozen planet's `#1FB0FF` is 0.88.
  - **No other hue can occur:** no H-alpha pink on the knots, no ember red.
  - **Measured at variety 0.8 / 1.6:** maximum warm saturation 0.373 / 0.373 (the cap); maximum cool saturation
    0.300 / 0.300. Stars at the warm cap: 69 / 564 of 2,400.
- **Rendering.**
  - Per-instance `aTint` is converted sRGB → linear, as three's ColorManagement does for the tint uniforms.
  - It is normalised to the agents' blue's luminance × `colourLum` (default 1.8). At 1 the white-ish stars looked grey
    beside the full-blue channel of `#4DA3FF`, because the raw shader writes linear values.
  - The dust, the haze and the 30 neighbourhood sprites keep their existing tints. The neighbourhood now stands out
    as the only agent-blue stars, which fits their meaning.

### Presets and the chosen variety

- **`RECIPE_READABLE_COLOUR`** is `RECIPE_READABLE` with `starColour` 0.8 (`STAR_COLOUR_VARIETY`).
- **`DENSITY_WAVE_COLOUR`** is the same for the density wave.
- **Why 0.8.** At 0.6 the colour is barely distinguishable. At 0.8 the arms read blue-white with a few amber
  supergiants, and the bulge edge is pale warm. At 1.6, 564 stars sit on the amber cap and it starts to look like a
  palette.
- Comparison: `shots/shape-colour.png`. It shows Readable / + colour 0.8 / + colour 1.6 at phone size, and a 3× crop
  (native @3x pixels 1:1) of the inner arm and the bulge edge.

## 8. Compare mode (second round)

- **Default view.**
  - The galaxy fills the window (`frame-size` defaults to "Fit window"). The controls sheet is closed, and the
    readout and text band are off.
  - The only UI is a translucent pill at the bottom centre (inside the safe-area inset) showing the preset's name and
    a dot per preset. It brightens on a switch and fades back to subtle.
  - Tapping the pill opens the sheet, which holds all the controls plus "Hold to see", the readout and the text-band
    toggle. ✕ (or Escape) closes it back to the pill.
  - The page now has `<meta name="viewport" content="width=device-width, …, viewport-fit=cover">`. Without it a phone
    laid the page out at 980 px.
- **Swipe order:** Today, Recommended, Density wave, Smooth field, M74 recipe, Readable, Readable + colour, Density
  wave + colour.
  - Every preset's geometry is generated once per tier, in the background after load, then cached. A switch is a
    buffer swap: 1.3 ms measured.
  - Moving a slider marks the preset "(edited)" and regenerates live.
- **Gestures.**
  - **Switch preset:** one finger, or a plain click-drag, moved ≥ 36 px sideways and at least 1.2× its vertical
    travel. One step per swipe; vertical one-finger movement does nothing. Also ← / →, and a trackpad's sideways
    swipe (accumulated, with a cooldown so its momentum tail doesn't skip).
  - **Zoom:** pinch, wheel, or trackpad pinch (ctrl+wheel).
  - **Orbit or tilt:** two-finger drag, right-drag, or a drag with a modifier key held.
- **Camera.**
  - Switching never touches the camera: orbit, zoom and framing stay exactly as they were.
  - "Reset camera" and "Essay framing" are in the sheet.
  - The camera, frame mode and preset persist in `localStorage` (`galaxy-tuner/camera/v1`), with every access in
    try/catch.
- **Tested** in Playwright (script deleted afterwards). All checks passed.
  - Phone, 390×844 with touch emulation (`hasTouch`, `isMobile`), CDP touch events:
    - the default view is compare mode, with the galaxy at 390×844;
    - swipes left and right change the preset with the camera bit-identical, and a short sloppy swipe still switches;
    - vertical movement does nothing;
    - a pinch zooms (640 → 303) and a two-finger drag tilts, neither changing the preset;
    - a swipe after zooming keeps the zoom;
    - the pill expands the sheet and ✕ collapses it;
    - a reload restores the camera and preset.
  - Desktop, 1440×900: → → / ← step; click-drag switches; right-drag orbits; the wheel zooms; a sideways trackpad
    wheel switches; the tier follows the window (4,000 stars).
- TODAY and RECOMMENDED are still bit-for-bit (`work/baseline.mjs`).

## 9. Recommended (soft) (third round)

The author, on the shipped RECOMMENDED: "The galaxy shape still looks like it has a harsh cliff on the outer edges of
the elbow." `RECOMMENDED_SOFT` is RECOMMENDED with the smallest change that removes that edge. It sits in the swipe
order right after Recommended. Comparison image: `shots/soft-compare.png`.

### What changed (four keys)

```json
{ "place": "none", "armCross": "normal", "laneShape": "dip", "sigmaRim": 12 }
```

Paste these into the essay's `BG_RECIPE` on top of RECOMMENDED. `armCross` and `laneShape` are new keys of the arms
generator (perp mode). Their defaults (`'gauss3'`, `'band'`) live in `SHAPE_DEFAULTS` and are RECOMMENDED's behaviour.

1. **`armCross: 'normal'`: an unbounded cross-arm profile.** `gauss3` (a sum of three uniforms) is exactly zero past
   ±3σ. `'normal'` is a Box–Muller gaussian with the same σ, drawn from the star's own `bgStars` stream (two draws
   instead of three). No new salt is needed.
   - **Why the gaussian and not the Sérsic.** gauss3 has variance 1. Inside about ±2.5σ its shape is close to a
     normal's, so the normal changes only the tail, and the crest and flanks look the same. The research recipe's
     Sérsic n = 0.6 (`armCross: 'sersic'`, at the gaussian's half width) is peakier, with heavier flanks: at σ rim 11
     it puts 6.4 % of the peak at ±3σ, against 3–4 % for the normal. Both kill the cliff (largest step ×2.2 Sérsic,
     ×2.4 normal), so the normal stays closer to the RECOMMENDED look. The Sérsic stays available in the select (a
     Marsaglia–Tsang Gamma(n) draw, also from the star's own stream).
2. **`place: 'none'`.** As §1 found, only 'none' keeps the density profile. The 30 neighbourhood spots stay clear by
   the existing `nearHood` rule and do not move: `HOOD` holds constants. Halo touch, phone, seed 1: bright 86.7 %,
   all 68.4 % (RECOMMENDED: 32.2 % / 11.0 %). The author approved the overlap.
3. **`laneShape: 'dip'`.** The tuner already had a smooth multiplicative lane, but only in the shape modes
   (`laneDip`, `rcLaneG`). This ports the same gaussian to the arms generator: a star at cross-arm offset x (in σ) is
   removed with probability `laneDepth · exp(−½((x − laneOffset)/(laneWidth/2))²)`, where the band removed
   `laneDepth` inside `|x − laneOffset| < laneWidth/2`. The lane's depth, position and width are RECOMMENDED's.
4. **`sigmaRim` 9 → 12.** Without the roomiest placement pushing stars out to the flanks, the outer bend read as a
   thin thread. ±2σ fell from 29–30 % of the peak to 11 %. A FWHM match at r 160 needs σ rim ≈ 11.6, so I used 12,
   which gives ±2σ 20–25 %. `sigmaCore` stays at 3.

**Unchanged:** the knots. The bright set's outer flank is mostly knot stars, which RECOMMENDED keeps within about
+2σ: there are 514 knot and 294 arm bright stars at +0.5σ, and the knots fall ×4.4 per 0.5σ from +1.5σ to +2σ. Under
'none' they read as clumps rather than an edge (see the crop), so I left them alone; `work/soft/popsplit.mjs` shows
the split. Under 'none' the knots also draw tighter, since nothing spreads their members out.

### The cliff, measured

`work/soft/cliff.mjs`:
- Stars (dim and bright) at r 120–200, phone tier, seeds 1–24.
- Binned by the signed perpendicular distance from each preset's own log spiral, in 0.5σ bins.
- σ is **RECOMMENDED's σ(r) = 3 + 6r/220**, as one yardstick for every preset; u < 0 is the inner edge.
- "Step" is the largest ratio between adjacent bins, among bins at ≥ 2 % of the peak. Densities are given relative to
  the peak bin, inner/outer.
- Full table: `work/soft/final-cliff.txt`.

| preset | largest step | ±2σ | ±3σ | ±4σ |
|---|---|---|---|---|
| Recommended | **×5.44** (2.5σ → 3σ, outer: 299 → 55) | 28.7 / 30.3 % | 2.3 / 1.8 % | 1.6 / 1.9 % |
| Recommended (soft) | **×2.38** (2.5σ → 3σ) | 20.3 / 25.1 % | 5.8 / 5.0 % | 1.7 / 1.9 % |
| Readable | ×2.09 (at the inner lane, −1σ → −0.5σ) | 16.7 / 50.4 % | 15.2 / 31.2 % | 13.7 / 17.7 % |

- **Recommended:** the flanks are filled to 30 % at 2σ, and then the arm ends at 3σ. That is the cliff.
- **Soft:** the gaussian falls through 25 → 5 → 2 % onto the disc floor (about 1.5 % of the peak; `discShare` 0.1 is
  unchanged).
- **Readable:** its largest step is at the lane, not at an edge, and its floor is about 14 %.

**Bit-for-bit.** TODAY and RECOMMENDED hash identically (`work/baseline.mjs`: phone and desktop, seeds 1 and 2),
re-checked after every edit.

## 10. Wisps (third round): arms that emerge from a distribution

The author: "the arm shouldn't be thought of as a shape … wisps along the arm have higher densities, and the
distribution gives the look of an arm." Shape mode `'wisps'` has no centre line and no cross-arm profile. Stars are
drawn by rejection from a density field, and the arms are where the wisps crowd. Preset `WISPS` comes fourth in the
swipe order, after Recommended (soft). Comparison image: `shots/wisps-compare.png` (Recommended, Recommended (soft)
and Wisps at phone size, plus a 3× crop of an arm bend in each).

### The field (`gen.js`, `shape: 'wisps'`)

- **Flow coordinates.** u = ln r / pitch − θ is constant along a log spiral of the arms' pitch (0.28, as
  `armAngleAt`), and v = ln r runs along it.
  - A unit step in u is r·sin i across the flow, and a unit step in v is r / sin i along it. So the features scale
    with r, as real arm widths do.
  - The noise is periodic in u (an integer number of cells around 2π), so there is no seam at θ = ±π.
- **Shear.** The noise is evaluated at U = u − tan(`wispShear`)·v / sin²i. A wisp then drifts outward by
  tan(`wispShear`) per unit length along the arm, so it runs a few degrees off the arm, trailing like a spur or a
  feather.
- **Noise.**
  - Seeded value noise on a lattice, with quintic interpolation. Each lattice point is one draw from a new stream,
    `bgWisps` (salt 17), keyed by (channel, octave, iu, iv), and cached per generation.
  - `wispOctaves` octaves, each half the size and half the weight.
  - `wispRidge` blends toward ridged noise, 1 − |2n − 1|, for thinner filaments.
  - Channel 0 makes the stars' wisps and channel 1 the dust's streaks.
- **Anisotropy.** A wisp is `wispAlong`·r long and `wispAcross`·r wide. `wispAniso` scales the length/width ratio
  about the same mean size: 0 gives round blobs, 1 the sizes as set, and 2 doubles the ratio.
- **Contrast.** The threshold-free curve G = Nᵖ / (Nᵖ + (1 − N)ᵖ), with p = `wispPower`. It is smooth, equals 0.5 at
  N = 0.5, and steepens with p. That gives dense wisps and near-empty gaps without a threshold or a clamp.
- **Bias.** B = (1 + A·ramp(r)·((1 + cos Δ)/2)^s) / (1 + A). Δ is the phase from `armAngleAt`'s crest, which passes
  through the neighbourhood.
- **Populations.** They are split by index range, for exact counts: bulge (`coreShare`), old, young (`youngShare`)
  and knots (`clumpShare`).
  - **Old:** B(`oldContrast` 0.8, `oldSharp` 2) × (1 − `wispOld` + `wispOld`·G). This is a smooth, low-contrast disc
    with a trace of the texture, warm toward the centre and dimmed by `oldDim`.
  - **Young:** (B(`wispBias`, `wispSharp`) · G)^`wispYoung` × ramp(r), the same field sharpened, on the longer arm
    scale length. Young stars are blue and brightened (`youngBright`), so the bright set lands on the wisps.
  - **Knots:** 30 complexes from `bgKnots`. Each is accepted with the young weight squared (the densest wisps) and kept
    at least `wispKnotGap`·R = 0.1 R apart (findings: complexes every 0.1–0.3 R). Members follow an unbounded normal of
    `knotSigma`·r.
  - **Dust:** dark streaks S = (a gaussian toward the inner edge, at `laneOffset`, of width `laneWidth`, in bias phase
    σ) × G of channel 1. The stars are multiplied by 1 − `laneDepth`·S, a soft dip, never a band. The dust motes follow
    the old field and peak in the streaks (`dustLaneGain`).
- **Placement** is 'none', with the 30 neighbourhood spots clear and unmoved. The crest at r 50–80 sits at +0.5σ
  (about +2.4 units), so it passes through the neighbourhood. Halo touch, phone, seed 1: bright 75.0 %, all 57.5 %.
- **Counts** are unchanged: 2,400 / 4,000 on phone, 4,000 / 8,000 on desktop. Generation takes 180 ms on phone and
  240 ms on desktop in Node (RECOMMENDED: about 80 ms), pre-generated in the background like every preset.
- **Sliders** are in a new "Wisps" section: bias contrast and sharpness, noise scale along and across, anisotropy,
  octaves, ridged blend, contrast power, shear, young sharpness, old texture, knot share, young share (old is the rest)
  and knot spacing.
  - The knot share and the young share are the existing `clumpShare` and `youngShare`, mirrored there. The control
    map now takes more than one input per key, and both copies stay in step.
  - Bulge share and knot count stay in their own sections.

### The preset (paste-ready; the keys the wisps mode reads, as they differ from RECOMMENDED)

```json
{
  "shape": "wisps", "place": "none", "pitch": 0.28,
  "coreShare": 0.15, "bulgeMode": "exp", "bulgeScale": 0.06, "discScale": 0.32, "armScale": 1.3,
  "discFade": 0.8, "armStart": 0.16, "armEnd": 1,
  "youngShare": 0.45, "clumpShare": 0.1, "clumpCount": 30, "knotSigma": 0.025,
  "youngBright": 0.8, "clumpBright": 0.5, "oldDim": 0.5, "oldContrast": 0.8, "oldSharp": 2,
  "warmCore": 0.97, "oldWarm": 0.6,
  "laneDepth": 0.7, "laneOffset": -1, "laneWidth": 0.6, "dustContrast": 1.5, "dustLaneGain": 2.5, "dustArmShare": 0.7,
  "wispBias": 2, "wispSharp": 2.5, "wispAlong": 0.45, "wispAcross": 0.055, "wispAniso": 1, "wispOctaves": 3,
  "wispRidge": 0.25, "wispPower": 8, "wispShear": 10, "wispYoung": 3, "wispOld": 0.25, "wispKnotGap": 0.1
}
```

**How it was tuned.** `work/soft/plot.mjs` is an offline top-down plotter (`work/soft/iter/p1–p5.png`), and the
phone stills are in `work/soft/iter/`.
- With a weak contrast (power 4, bias 1.2, young power 2) the arms did not read at phone size.
- Stronger contrast and a sharper young field made them read.
- Shorter wisps (0.65 → 0.45 r) and power 8 raised the along-arm variation from 0.27 to 0.40.
- The bias was then lowered from 4.5 to 2 (peak/trough 3). The arms still read, and the bias stays gentle. At 1.5
  the galaxy turns flocculent.

### Measured

Cross-arm, by the method of §9 (`work/soft/final-cliff.txt`):

| preset | largest step | ±2σ | ±3σ | ±4σ |
|---|---|---|---|---|
| Wisps | **×1.48** (3.5σ → 4σ) | 41.7 / 68.2 % | 21.7 / 39.9 % | 13.5 / 19.4 % |

**Along-arm variation** (`work/soft/alongcv.mjs`, `final-cv.txt`):
- Method:
  - Stars within |d| < 0.06 r of each arm's crest (the preset's own spiral), at r 80–200.
  - Binned in ln r at 0.04, which is about 0.1 R of arc at r 140, per arm.
  - Each bin is divided by a centred 9-bin running mean, which removes the disc's radial fall-off.
  - CV is the std/mean of that ratio, averaged over seeds 1–24. With about 15 stars per bin, Poisson noise alone gives
    about 0.2, so the Poisson-corrected value (shot noise removed in quadrature) is the one to compare.
- Results:

  | preset | CV | Poisson-corrected |
  |---|---|---|
  | Recommended | 0.18 | **0.00**: the arm is uniform along its length |
  | Recommended (soft) | 0.34 | **0.21**: knots only |
  | **Wisps** | 0.46 | **0.35** |
  | Readable | 0.29 | **0.10** |

### Porting Wisps to the essay's `src/galaxy/background.ts`

- **Code, about +120 lines:**
  - the `bgWisps` salt (17) in `seeds.ts`;
  - the lattice noise: hash, cache, fbm, ridge and curve. A `Float32Array` lattice per (channel, octave) filled up
    front would beat the `Map` and the per-point stream setup;
  - the flow coordinates;
  - the old and young rejection samplers;
  - the spaced knot picker;
  - the streak-weighted dust;
  - the index-range populations and their brightness and warmth;
  - the 'none' placement switch;
  - the new BG constants (the JSON above).

  The 30 neighbourhood spots are untouched: they come from the galaxy's own streams, and the background only avoids
  them (`nearHood`).
- **Tests that move:**
  - Every background checksum and golden value.
  - "Rest on two arms" asserts a bounded scatter about a centre line, which no longer exists. Replace it with:
    - the crest passes through the neighbourhood (cross-arm peak at r 50–80 within ±1σ);
    - an arm/inter-arm contrast floor;
    - an along-arm CV floor.
  - "Keeps the halos apart" (≥ 95 %) fails under 'none' (75 % of bright halos touch). The author's overlap ruling
    needs to be written into the test.
  - `brightness ≥ 0.35` fails, because `oldDim` 0.5 takes old stars below it.
  - Check "no hole in the core" at `coreShare` 0.15, which failed for some seeds in wave/field.
  - r ≤ R holds (the disc taper ends at R), and |y| ≤ `starY` holds.
- **Motion.** If the essay ever turns the galaxy, the field is a pure function of (ln r, θ). A rigid rotation of the
  pattern is free. Differential rotation (wisps shearing as they orbit) would mean advancing θ by Ω(r)·t inside the
  noise lookup: stars stay put, and the wisps wind up.

### Files (third round)

- `gen.js`:
  - `armCross`, `laneShape` and the wisps keys in `SHAPE_DEFAULTS`;
  - shape `'wisps'`;
  - presets `RECOMMENDED_SOFT` and `WISPS`.
- `galaxy-tuner.src.html`:
  - buttons, swipe order (Today, Recommended, Recommended (soft), Wisps, Density wave, …);
  - the "Wisps" control section;
  - the `armCross` and `laneShape` selects;
  - mirrored controls.
- `galaxy-tuner.html` was rebuilt with `build.py`, and it is byte-identical to a fresh build. The peek button and the
  swipe view are kept.
- **Images:**
  - `shots/soft-compare.png`, `shots/wisps-compare.png`;
  - the stills `shots/soft-recommended-390x844@3x.png`, `shots/soft-recommended-soft-390x844@3x.png` and
    `shots/wisps-390x844@3x.png`;
  - the composer page `shots/compose.html`.
- **Scripts** (scratchpad `work/soft/`): `cliff.mjs`, `alongcv.mjs`, `popsplit.mjs`, `plot.mjs`, `dumpjson.mjs`.
  Logs: `final-cliff.txt`, `final-cv.txt`, `swipe.log`, `progress.txt`. Pre-change backups: `*.before-soft.*`,
  `gen.before-wisps.js`.
- **Playwright** (`work/soft/swipe.log`, all pass).
  - Phone (390×844, touch, CDP):
    - the swipe order is as above;
    - four left swipes walk Today → Recommended → Recommended (soft) → Wisps → Density wave, with the camera
      (zoomed and turned beforehand) bit-identical throughout;
    - the pill names each preset;
    - swiping back lands on Recommended (soft);
    - a vertical swipe does nothing;
    - the Wisps and Recommended (soft) buttons work;
    - the Wisps section has 14 sliders;
    - the mirrored knot-share slider moves both copies and marks the preset "(edited)";
    - the peek button is present.
  - Desktop: → → → reaches Wisps, with the camera unchanged.
  - The test ran before the last tuning step (`wispBias` 4.5 → 2), which changed only a preset value.
- The temporary scripts under `shots/` were deleted, and the http.server was stopped by PID.

## 11. Wisps (reviewed) (fourth round): an independent review of Wisps, with code changes

Preset `WISPS_REVIEWED`, shown as "Wisps (reviewed)" right after "Wisps" in the swipe order. The existing `WISPS`,
`RECOMMENDED_SOFT`, `RECOMMENDED` and `TODAY` are bit-for-bit unchanged (`work/rev/baseline4.mjs` hashes all four on
both tiers and seeds 1–2; re-checked after every edit). Comparison image: `shots/wisps-reviewed-compare.png`
(Recommended, Wisps, Wisps (reviewed) at phone size, plus 3× crops of the same arm bend). Stills:
`shots/reviewed-recommended-390x844@3x.png`, `shots/reviewed-wisps-390x844@3x.png`, `shots/wisps-reviewed-390x844@3x.png`.

### The critique of Wisps (phone size, essay framing, against M74 / M51 and the author's direction)

Judged from the phone still and, more tellingly, from a render of the acceptance field itself (`work/rev/field.mjs`,
`work/rev/iter/f1.png`: the field Wisps samples from, before any star is drawn).

1. **The noise looks like noise.** The field is value noise on a lattice of one cell size (0.45 r × 0.055 r, three
   octaves, contrast power 8), so the arms are chains of equal-sized puffs with empty gaps between them, and the lattice
   shows through as a camouflage pattern (`f1.png`, left). Nothing in it has two scales: there are no long coherent arm
   segments and no fine feathering, and the 10° shear is invisible. The outer puffs float detached from the arm, which is
   the one place the author's "cliff" still exists: the top arm ends as a thin arc with nothing beyond it.
2. **It is still blue puffs on black.** The old disc (30 % of the stars) is dimmed by half and tinted amber, so the
   inter-arm "sea" that the research measures at ~50 % of the old population is invisible; the bulge is a haze blob with
   a dark moat around it; and at r 60–90 the two arms close into a ring, because the bias has full contrast from the
   centre outward (S4G: arm contrast *rises* outward; the inner disc is smooth).
3. **No dust lane, no beads, one colour.** The dark streaks use the same noise geometry as the wisps, so the lane is as
   blobby as the arm and never reads as a filament; the 30 knots are picked by rejection with a minimum gap, so they look
   like any other puff rather than beads at the complex spacing; the dust motes (1 px, brightness 0.1–0.26) are invisible
   on a phone; and because old stars are dim and warm, the bright set is all young and all blue.

Measured: along-crest CV 0.35 Poisson-corrected (good: the arm is not uniform) but ±2σ at 42 / 68 % of the peak with no
lane dip on the inner side; old inter-arm share 0.58 (the target is ~0.5), which is right only because the old disc is
invisible.

### The code changes (`gen.js`, shape `'wisps'`; every one is off by default and the old Wisps is bit-for-bit)

Every new key is a slider (or a select) in a new "Wisps (reviewed)" section of the page.

1. **Gradient noise** (`wispNoise: 'gradient'`): Perlin noise on the same flow-aligned lattice, with a seeded unit
   gradient per lattice point from a new stream `bgWispGrad` (salt 18), quintic fade, squashed to [0, 1] by
   0.5 + 0.5·tanh(2.2 p) (smooth, never clipped). Why: value noise puts a blob on every lattice point, so the lattice is
   visible; gradient noise has no value at the lattice points and makes ridges and troughs instead of blobs.
2. **Ridged multifractal feed** (`wispRidgeFeed`): each finer octave's weight is × (1 − feed + feed · the coarser
   octave's value), so detail lives on the dense wisps and the gaps stay smooth (Musgrave's ridged multifractal). Why:
   plain fbm puts the same fine texture everywhere, which is what reads as noise.
3. **A slow domain warp** (`wispWarp`, `wispWarpAlong`): u is bent by one long, smooth octave of value noise (channel
   2) before every lookup, so the wisps meander instead of following straight lattice rows. Kept small (0.08 u over
   2.5 r): at 0.25 the wisps bend into chevrons (`work/rev/iter/f4n.png`).
4. **Two scales along the arm** (`modDepth`, `modPeriod`, now applied in the wisps bias): the existing seeded along-arm
   modulation (`bgArmMod`, one table per arm) multiplies the bias, giving long segments and dips (Chugunov 2025: the
   single most valuable addition in their fits) on top of the wisps.
5. **Feathers** (`wispFeather`, `wispFeatherShear`, `wispFeatherAlong`, `wispFeatherAcross`, `wispFeatherAt`,
   `wispFeatherWidth`, `wispFeatherOctaves`): a third noise channel of short, thin wisps (0.22 r × 0.06 r, one octave)
   sheared 45° off the arm, outward and trailing, added to the wisp field under a gaussian window centred 0.9 bias-σ on
   the arm's outer (convex) flank (La Vigne, Vogel & Ostriker 2006: spurs leave the arm at ~50°, 10–20 per arm; the
   recipe's spurs, but as a field, not a list). The channel geometry helper (`chanGeom`) includes cos(shear), so a
   feather's length is measured along the feather.
6. **A bias that rises outward and forks** (`wispBiasRise`, `wispBiasRiseTo`, `wispBranch`, `wispBranchPitch`,
   `wispBranchFrom`): the spiral bias contrast is (1 − rise) of itself at the centre, rising to full by 0.5 R (S4G "Rise":
   M74, M51 and M100 all have contrast growing outward; the inner disc is smooth and the ring at r 60–90 goes away); and
   past 0.55 R a second bias of 0.5 A at a more open pitch (0.42) leaves each arm, so the outer arms bifurcate as M74's
   do. The arms also dissolve from 0.85 R to 1.1 R (`armEnd`, `armEndOut`) while the wisps stay: a flocculent outer disc,
   not an arc that stops.
7. **Beads of knots** (`wispKnotMode: 'beads'`, `wispKnotJitter`, `clumpOut` now read by wisps): a seeded walk along each
   arm (new stream `bgBeads`, salt 19) with gaps of the mean × U(1 ± jitter), the mean set so the arm's knots fill it from
   `armStart` to `armEnd` (here 12 per arm over 2.4 R of arc: one complex every 0.2 R, in the research's 0.1–0.3 R). Each
   bead is put on the densest young wisp near that point, 0.4 bias-σ downstream (the best of 24 draws from its own
   `bgKnots` stream), so the beads follow the wisps, not a hidden line.
8. **A coherent lane filament** (`wispLaneAlong`, `wispLaneAcross`): the dark-streak channel gets its own lattice, long
   (0.8 r) and thin (0.04 r) and unsheared, so the lane is one filament hugging the concave edge, breaking up every
   0.8 r or so (M51's lane is continuous over >180°, M74's fragments). The lane itself moved from −0.9 to −0.5 bias-σ
   (−0.067 r: just inside the young crest, where the M51 image puts it) and narrowed from 0.5 to 0.2 σ (≈ ¼ of the arm).
9. **Dust that traces the wisps** (`dustWispShare`): half of the arm dust follows the wisp field itself rather than the
   lane, so the young filaments get a faint grain of 1 px motes between the stars; the other half still peaks in the
   lane (gain 5).
10. **Populations and colour** (no new keys): the bulge 0.15 → 0.10 (Sc), the old disc undimmed (`oldDim` 0.5 → 0) with
    a warm share of 0.97 at the centre falling to 0.5 at the rim (so the outer old disc is half blue, half amber: the
    "neutral" disc the colour literature describes, within the two-tint model), the young boost 0.8 → 0.4 so the bright
    set includes old giants, the knots at 0.03 r with ×1.7 brightness, young 0.45 → 0.40. Nothing redder than the warm
    tint `#FFD9A0` is used; the knots are the agents' blue.

The old Wisps code path is untouched: with every new key at its default (`'value'`, 0, `'densest'`, …) the field,
the knots and the dust take the same draws in the same order, which the hashes confirm.

Also added for the offline plots, never set by a preset: `P.__probe`, a callback that receives the wisps fields
before any star is drawn (`work/rev/field.mjs` renders them: young, old, streak, feather, raw noise).

### The preset (paste-ready; every key that differs from RECOMMENDED + the shape defaults)

```json
{
  "shape": "wisps", "place": "none", "pitch": 0.28,
  "coreShare": 0.1, "bulgeScale": 0.06, "discScale": 0.32, "armScale": 1.3, "discFade": 0.85,
  "armStart": 0.2, "armEnd": 0.85, "armEndOut": 1.1,
  "youngShare": 0.4, "youngBright": 0.4, "oldContrast": 1.2, "oldWarm": 0.5, "warmCore": 0.97,
  "clumpShare": 0.12, "clumpCount": 24, "clumpOut": 0.4, "clumpBright": 0.7, "knotSigma": 0.03,
  "laneOffset": -0.5, "laneWidth": 0.2, "dustContrast": 1.5, "dustLaneGain": 5, "dustArmShare": 0.8, "dustWispShare": 0.5,
  "dustFloor": 0.12, "dustRange": 0.2,
  "wispBias": 2.5, "wispSharp": 2.5, "wispBiasRise": 0.7, "wispBiasRiseTo": 0.5, "modDepth": 0.5, "modPeriod": 0.4,
  "wispBranch": 0.5, "wispBranchPitch": 0.42,
  "wispNoise": "gradient", "wispAlong": 0.45, "wispRidge": 0.2, "wispRidgeFeed": 0.5, "wispPower": 8, "wispYoung": 3,
  "wispOld": 0.3, "wispWarp": 0.08, "wispWarpAlong": 2.5,
  "wispFeather": 0.4, "wispFeatherAlong": 0.22, "wispFeatherAcross": 0.06, "wispFeatherAt": 0.9, "wispFeatherWidth": 0.6,
  "wispFeatherOctaves": 1,
  "wispLaneAlong": 0.8, "wispLaneAcross": 0.04, "wispKnotMode": "beads"
}
```

The keys it takes from the shape defaults or WISPS without repeating them: `wispAcross` 0.05, `wispOctaves` 4 (WISPS:
3), `wispShear` 8 (WISPS: 10), `wispAniso` 1, `wispKnotJitter` 0.3, `wispFeatherShear` 45, `wispBranchFrom` 0.55,
`laneDepth` 0.6 (WISPS: 0.7), `oldDim` 0, `oldSharp` 2, `brightFloor` 0.3, `brightPow` 2.2, `bulgeMode` exp,
`radialLaw` exp.

**How it was tuned** (`work/rev/iter/`, `work/rev/v*.json`; the still script lived in `shots/`
and was deleted): the first draft (ridge 0.35, feed 0.7, power 5, warp 0.25, feathers 0.015 r wide) rendered as a
diffuse spray: the ridged network spread the young stars evenly along the arm (Poisson-corrected CV 0.15) and the
feathers were hairlines nobody could populate with 2,400 stars. Lower ridge and feed, power 8, shorter wisps and the
modulation at 0.5 brought the CV back to 0.29 with the wisps now elongated rather than round; the warp went from 0.25 to
0.08 after the chevrons; the lane came in from −0.9 to −0.5 σ once its position was worked out in units (−0.108 r was at
the far inner edge of the arm, not at the crest). Undimming the old disc was the single biggest change by eye.

### Measured (`work/rev/final-cliff.txt`, `final-cv.txt`, `final-interarm.txt`; the §9 and §10 methods, seeds 1–24)

Cross-arm, stars at r 120–200, 0.5σ bins of RECOMMENDED's σ(r) = 3 + 6r/220, inner / outer:

| preset | largest step | ±2σ | ±3σ | ±4σ |
|---|---|---|---|---|
| Recommended | **×5.44** (2.5σ → 3σ) | 28.7 / 30.3 % | 2.3 / 1.8 % | 1.6 / 1.9 % |
| Recommended (soft) | ×2.38 (2.5σ → 3σ) | 20.3 / 25.1 % | 5.8 / 5.0 % | 1.7 / 1.9 % |
| Wisps | ×1.48 (3.5σ → 4σ) | 41.7 / 68.2 % | 21.7 / 39.9 % | 13.5 / 19.4 % |
| **Wisps (reviewed)** | **×1.58** (3σ → 3.5σ) | 25.4 / 83.7 % | 17.3 / 40.7 % | 11.3 / 18.7 % |

The reviewed profile is asymmetric on purpose: the lane dip sits at −1 to −2σ on the inner (concave) side and the beads
and feathers sit downstream, which is where the research puts them (Roberts 1969, Louie et al. 2013). The largest step
is Poisson-sized; there is no edge anywhere.

Along-crest CV (|d| < 0.06 r, r 80–200, bins 0.04 in ln r, divided by a 9-bin running mean, Poisson share removed in
quadrature):

| preset | CV | Poisson-corrected |
|---|---|---|
| Recommended | 0.18 | 0.00 |
| Recommended (soft) | 0.34 | 0.21 |
| Wisps | 0.46 | 0.35 |
| **Wisps (reviewed)** | 0.41 | **0.29** |

Slightly below Wisps because its variation is now segments and beads rather than puffs with empty gaps; still well above
Recommended's uniform arm.

Inter-arm share of the old population (`work/rev/interarm.mjs`: old stars at r 80–160 beyond one old HWHM = 0.15 r of
the nearest crest; the research's target is ~0.45–0.55, the recipe prototype measured 0.52–0.59):

| preset | old inter-arm share | all non-core stars |
|---|---|---|
| Recommended | 0.111 (arm + disc stars) | 0.091 |
| Recommended (soft) | 0.107 | 0.088 |
| Wisps | 0.581 | 0.295 |
| **Wisps (reviewed)** | **0.527** | 0.253 |

The neighbourhood: the cross-arm peak at r 50–80 is at +1.0σ (4.8 units downstream of the HOOD spiral; Wisps +0.5σ,
Recommended 0), within the ±1σ criterion of §10's port notes; the 30 `HOOD` spots are constants that no background halo
touches (`nearHood`). Halo touch, phone, seed 1: bright 78.6 %, all 54.7 % (Wisps 75.0 / 57.5 %). Counts unchanged:
2,400 / 4,000 on phone, 4,000 / 8,000 on desktop. Generation: 830 ms phone, 1.4 s desktop in Node (Wisps 120 / 240 ms:
four channels, four octaves and the Map-backed lattice; pre-generated in the background like every preset, and a
`Float32Array` lattice per channel and octave would bring it down a lot).

**Swipe test** (Playwright, phone 390×844 with touch and desktop 1440×900; the script was deleted): the order is Today,
Recommended, Recommended (soft), Wisps, Wisps (reviewed), Density wave, …; four left swipes walk Recommended →
Recommended (soft) → Wisps → Wisps (reviewed) → Density wave with the camera (zoomed and turned beforehand) bit-identical;
swiping back lands on Wisps (reviewed); the button works; the "Wisps (reviewed)" section has 30 controls; moving one
regenerates and marks the preset "(edited)"; on desktop four → reach it at 4,000 stars. All pass.

### Porting Wisps (reviewed) to the essay's `src/galaxy/background.ts`

On top of §10's list (the `bgWisps` salt, the lattice noise, the flow coordinates, the two samplers, the streak-weighted
dust, index-range populations, placement 'none'), about +150 lines more:

- the salts `bgWispGrad` (18) and `bgBeads` (19) in `seeds.ts`;
- `chanGeom` and four channels (wisps, lane, warp, feathers) with their own cell counts and shear; the gradient variant
  of the lattice lookup (one angle per point); the feed-weighted octave loop; the warp lookup folded into every U;
- the bias with rise, modulation (`armDipAt`, so `bgArmMod` salt 14 comes too) and the branch crest;
- the bead walk for the knots (arc from `armStart` to `armEnd`, jittered gaps, best-of-24 placement on the young field);
- the dust split three ways (wisps / lane / smooth);
- the BG constants in the JSON above. Do it with `Float32Array` lattices filled up front per (channel, octave) rather
  than the tuner's `Map` + per-point stream, or the 1.4 s desktop generation will show.

Tests that change, beyond §10's (every checksum and golden value; "rest on two arms" → crest through the neighbourhood,
contrast floor, along-arm CV floor; the ≥ 95 % halo rule, which needs the author's overlap ruling written in):
- the neighbourhood crest test should allow the downstream offset (+1σ at r 50–80, as measured), or set `clumpOut` to 0
  and `wispFeatherAt` further out if it must be 0;
- `brightness ≥ 0.35` now *passes* for old stars (`oldDim` 0) but still fails for the floor (0.3): it needs the new
  constant either way;
- "no hole in the core" at `coreShare` 0.10 needs checking across seeds (it failed for some seeds at 0.15 in wave/field);
- a new fence worth adding: the old inter-arm share (the `interarm.mjs` measure) between 0.4 and 0.6, and the largest
  cross-arm step below ×2 — the two numbers the author's two complaints reduce to;
- r ≤ R holds (`discFadeEnd` 1); |y| ≤ `starY` holds.

### Files (fourth round)

- `gen.js`: the reviewed keys in `SHAPE_DEFAULTS`, the new noise/bias/feather/lane/bead code in the wisps block, the
  bead knot picker, `dustWispShare`, the `__probe` hook, the salts 18–19, preset `WISPS_REVIEWED`.
- `galaxy-tuner.src.html`: the "Wisps (reviewed)" button and section (30 controls, including mirrored copies of
  `modDepth`, `modPeriod`, `clumpOut`, `knotSigma`, `clumpCount`, `oldDim`, `oldWarm`, `armEnd`, `armEndOut`), the
  swipe order, `GEN_KEYS`, `window.tuner.WISPS_REVIEWED`. `galaxy-tuner.html` rebuilt with `build.py`.
- Images: `shots/wisps-reviewed-compare.png` and the three stills named above.
- Scripts (scratchpad `work/rev/`): `baseline4.mjs` (hashes all four frozen presets), `field.mjs` (acceptance-field
  renders), `plot2.mjs` (population-coloured top-down plot), `interarm.mjs`, `hoodcrest.mjs`, `gentime.mjs`; logs
  `final-*.txt`, `progress.txt`; iteration images and variant JSONs in `iter/` and `v*.json`; pre-change backups
  `*.before-review.*`. The temporary Playwright scripts under `shots/` were deleted and the
  http.server stopped by PID.

## 12. The neighbourhood at the galaxy wide (fourth round, follow-up): four representations and a zoom handover

The 30 `HOOD` spots are the story's real star systems. The essay packs them evenly (`generateGalaxy` → `placeStars`,
`src/galaxy/generate.ts`: 1,500 seeded candidates per star, the free one nearest the middle on the 45 × 35 ellipse along
the arm, every pair at least outer + outer + `HOOD_MARGIN` apart: the generated 30 are never nearer than 14.07 units,
nearest-neighbour mean 18.6) and draws each at the galaxy wide as one uniform glow sprite, so from afar they read as a
lattice of same-size agent-blue dots beside the core. The author: "on zoom out we probably only need to remember their
positions rather than keeping an exact representation of them 1:1."

The tuner now has a **Neighbourhood** chip group in the sheet (As today · Blend · Dissolve · Jitter), applied on top of
whatever preset is showing, kept across swipes and reloads (it is saved with the camera). The generated background is
never changed by it: `TODAY` and `RECOMMENDED` (and the rest) hash as before (`work/rev/baseline4.mjs`); the control
only changes how the 30 render, or, in Jitter, where. Comparison image: `shots/hood-compare.png` (the four at the galaxy
wide on Wisps (reviewed), 3× crops of the neighbourhood, and a mid zoom-out frame each). Stills:
`shots/hood-{today,blend,dissolve,jitter}-390x844@3x.png` and `…-mid-390x844@3x.png`.

### The four options (`galaxy-tuner.src.html`, `applyHood`)

1. **As today.** The 30 at their spots as the uniform sprite (world 4.5, 5–18 px: the essay's
   `glowPx(STAR_R 0.9, d, focal, 18)`), agent blue, brightness 1, no fade. Verified pixel-identical to the still made
   before the control existed (0 of 1170 × 2532 pixels differ).
2. **Blend.** The positions stay. Each spot's *far form* is a star of the local population: from its own stream
   (`bgHoodLook`, salt 20, key = spot index) it draws one of its 12 nearest background stars and copies that star's
   class (dim or bright: the sprite size) and signed brightness (warm or blue; and its colour tint when the colour
   model is on). That is the empirical distribution of background stars at that place and radius. The far form fades
   out and the real sprite fades in by the spot's glow size (below). At the wide the spots read as ordinary stars of
   the arm; their even spacing is still there underneath, softened by the varied brightness.
3. **Dissolve** (the author's suggestion; recommended). At the galaxy wide the 30 are not drawn as themselves. Their
   positions are remembered, and **the nearest background star is pulled onto each spot** (one star per spot, spots in
   index order, each taking the nearest star not yet taken; dim or bright, with its own brightness and tint). Measured
   on Wisps (reviewed), seed 1: the pulled stars moved **mean 6.7 units, max 10.5** — they are the stars just outside
   the halo clearance the generator keeps round each spot (5.6 units on a phone), so the clearance hole is filled at its
   centre and nothing else moves. The pulled star is drawn in a far set that fades out as the real sprite fades in, so
   the zoom-in lands on a real star that is already there, and never draws both at full. No sprite, no lattice: in the
   3× crop the patch is just the arm.
4. **Jitter** (for comparison only). The spots move: 16 seeded candidates per spot (`bgHoodJitter`, salt 21), gaussian
   with σ `hoodJitter` (8 units), scored `hoodSnap` × (background stars within 6 units, normalised) − (1 − snap) ×
   candidate order, and the best candidate at least `hoodGap` (14 units, the generated minimum) from every spot already
   placed; a spot with no clear candidate stays put. The sprites are As today's, at the new positions.
   **Displacement, Wisps (reviewed), seed 1, σ 8, snap 1: mean 12.3 units, max 21.8** (the readout shows these live).
   For scale: the neighbourhood is about 70 units across and a system shot stands 30 units off its star, so a 12-unit
   move changes which neighbours share every close frame of Act II and how far apart they stand; the clearance rules
   (`FULL_DETAIL_MAX`, halos apart, the text-clearance twins) would all have to be re-run. Not recommended.

Sliders (section "Neighbourhood", keys in `SHAPE_DEFAULTS` that the generator never reads): `hoodLod0` 6, `hoodLod1`
12 (the handover band), `hoodJitter` 8, `hoodGap` 14, `hoodSnap` 1.

### The zoom handover

Every set's vertex shader now takes `uFade` (0 none, 1 fade in, 2 fade out) and computes the spot's glow size
`glow = clamp(4.5 · ppu, 5, 18)` CSS px — `glowPx` for a neighbourhood star — and `near = smoothstep(hoodLod0,
hoodLod1, glow)`: the real sprite set draws × `near` (Blend, Dissolve) and the far sets × (1 − near). Additive
blending makes the cross-fade a plain brightness hand-over at the same place. Zoom toward the core with a pinch or the
wheel and watch it:

| camera distance (tuner `C.distance`, phone) | glow px | real form | note |
|---|---|---|---|
| 640 (galaxy wide) | 5.0 (the floor) | 0 % | far form only |
| 300 | 8.9 | 50 % | the handover's middle |
| 277 (the essay's log-halfway between the hood shot's 120 and the wide's 640) | 9.9 | 71 % | the mid frames in `hood-compare.png` |
| 230 | 12.0 | 100 % | real form whole |
| 120 (the hood shot) | 18 (the cap) | 100 % | |

`window.tuner.hoodLod()` returns each spot's glow px, `near` and screen position; `hoodReport` the pulls or moves.
Verified in Playwright (phone 390×844 @3x, touch; `work/rev/hood-test.log`, 14 checks): four chips, default As today,
As today pixel-identical to the pre-control still, the mode survives a preset switch and a reload, every spot at the
5 px floor with `near` 0 at the wide, Dissolve dimmer than today at the spots at the wide (luminance 19–24 vs 39–41 in a
9 × 9 px window), the handover in progress at 277, whole at 120 with Dissolve and today lighting the spots alike (74 vs
74), Blend with no moves or pulls, Dissolve pulling exactly 30, Jitter moving 30 and repeating bit for bit.

**How it maps to the essay's bands.** The neighbourhood's stars are not in `galaxySystem` at all (that draws only the
background's four sets); they are bodies of `bodySystem.ts`: a glow sprite per star in `net-glow` (`shell.vert.glsl`,
`ROLE_GLOW`), its diameter `glowPx(R, d, focal, cap)` = `clamp(5 R focal / d, 5, 18)` CSS px with the per-frame
`glowCaps` keeping halos apart; the star's 160 shell dots in `net-shells`; its spikes in `net-spikes`, which come in
over `STAR_LOOK.spikeLod = [6, 12]` of the glow's px (`classLook.ts`); and its tint white → amber by temperature. The
planets' points come in over `LOD_BANDS[PlanetPoint] = [10, 20]` of `s_px`, the system's projected outer radius
(`lod.ts`), and the shells over [25, 50]. So the handover band chosen here, glow 6 → 12 px, is exactly the band the
essay already uses for the spikes: the far form leaves as the star starts to grow its spikes, before any planet point
comes in (a system's outer radius of ~7 units reaches s_px 10 at about the distance where the glow reaches 12). On a
phone the galaxy wide sits at the glow floor (ppu 0.94 → 4.2 px, clamped to 5), so there the far form is whole; the
hood shot (distance 120) is at the cap, so there the real form is whole; the zoom-out's pull from 120 to 640 crosses
the band around its first third in log distance.

### Porting Dissolve to the essay

- **`src/galaxy/background.ts`** (`generateBackground(seed, tier, hood)`): after placement, pull the nearest background
  star onto each spot (nearest not yet taken, in spot order), as the tuner does at render time; mark those 30 (a
  parallel index list in `Background`, or a fifth attribute) so `galaxySystem` can draw them in a far set. The
  clearance rule (`nearHood`) stays: the pulled star is the one that was just outside it. Alternatively keep the arrays
  as they are and do the pull in `createGalaxySystem` from `bg` plus the spots; the generator then stays bit for bit and
  only the drawn buffers change, which is what the tuner does.
- **`src/scene/galaxy/galaxySystem.ts`**: two more sets (`galaxy-far-stars`, `galaxy-far-bright`: the pulled stars at
  the spots, the star sizes `BG_STAR_SIZE`), drawn × (1 − near); `star.vert.glsl` takes the fade uniforms and the glow
  formula (lod.glsl already has `glowPx`); the galaxy-wide counts change by +30 far and −30 drawn-where-they-were.
- **`src/scene/node/bodySystem.ts`**: a star's `net-glow` sprite, shell dots and spikes draw × `near` (the spikes
  already use `spikeLod`; the glow and the shell dots need the same gain). The core's six bodies are untouched.
- **`src/scene/node/lod.ts` / `lod.glsl`**: a `hoodFarGain(glowPx)` = smoothstep(6, 12) next to `lodGain`, mirrored in
  GLSL and checked by the parity page (`?lib=lod`).
- **Tests that move.** `background.test.ts`: the tier counts and "measures the galaxy wide as the camera does" (the
  halo rule now applies to the far forms, 2–3 px, not to 5 px glows). `galaxySystem.test.ts`: "draws the tier's counts
  exactly" (+2 sets). `bodySystem.test.ts`: "draws a glow per star and per core body" still holds, but a glow at gain 0
  at the wide needs the early-out's blessing (`lod.test.ts` "never skips a glow, a star or a core body" would gain a
  "… except a neighbourhood star's at `near` 0" clause). `lod.test.ts` "holds the bands": one more band. e2e
  `galaxy.spec.ts`: "three levels by projected size: galaxy wide is star-only" becomes "far-form only", "halos apart at
  the probe shots" (the wide's halos are now the far stars'), "far stars are points: at fr-1 no spike is drawn" (still
  true), "the twelve ride the galaxy's turn: P1, P2 and P3 glow where they stood" if it reads a wide frame, and the
  purity test's byte-equal hood probe (ambient 101 is at the hood shot, real form whole: unchanged). `stills.spec.ts`
  "Act II beats" and the shots `R1a/R1b-galaxy-wide`, `fr-1`, `zo-0.75` (the zoom-out frames) re-baseline; the hood,
  system and close shots do not change.
- **Blend** would be the same port with 30 synthetic far stars at the spots instead of pulled ones (plus the
  `bgHoodLook` salt in `seeds.ts`); **Jitter** would change `placeStars` and every Act II close shot, which is why it is
  here for comparison only.

### Files (follow-up)

- `galaxy-tuner.src.html`: the chip group (`#hood-row`), the "Neighbourhood" section, `applyHood` / `setHoodMode` /
  `hoodLod` / `nearestStars`, the two far sets, the fade uniforms in the vertex shader, the readout's mode and numbers,
  `window.tuner.{hoodMode, setHoodMode, hoodLod, hoodReport, HOOD_MODES, pose}`. `gen.js`: salts `bgHoodLook` 20 and
  `bgHoodJitter` 21, the five page-level keys in `SHAPE_DEFAULTS`. `galaxy-tuner.html` rebuilt.
- `shots/hood-compare.png`, the eight stills, and the composer `shots/hood-compose.html`.
- `work/rev/hood-test.log` (the Playwright checks), `patch_hood.py`, backups `*.before-hood.*`. The temporary scripts
  under `shots/` were deleted and the http.server stopped by PID.

### 12.1 A second swipe axis, the pill, and Dissolve (late) (follow-up)

- **Swipe axes.** A one-finger vertical swipe (or ↑/↓) now cycles the Neighbourhood option, up for the next, down for
  the previous, wrapping; sideways (or ←/→) still cycles the presets. The same forgiving threshold (36 px) and a
  dominant-axis rule (the winning axis must be 1.2× the other) decide a diagonal; an even diagonal does nothing; one step
  per swipe; the camera is never touched by either axis (`stepHood`, the `pointermove` swipe branch, the keydown
  handler).
- **The pill** reads "Wisps (reviewed) · Dissolve (late)": the preset, then the option, with a second, smaller row of
  five dots under the presets' row; it flashes on either change (`updatePill` is called from `setHoodMode` too).
- **Dissolve (late)**, a fifth option: Dissolve with its own handover band, `hoodLateLod0`–`hoodLateLod1`, preset to
  **11 → 16 px** of glow (sliders in the Neighbourhood section; Blend and Dissolve keep `hoodLod0`–`hoodLod1` = 6 → 12).
  The author noticed the even spacing still showed at mid zoom-out because the real form was 71 % in there. With the
  late band the real-form share is **0 % at distance 640** (glow 5.0 px, the floor), **0 % at 277** (glow 9.9 px, still
  under the band's start) and **100 % at 120** (glow 18 px, the cap): the handover runs between distances 246 and 169
  (glow 11 → 16), entirely inside the last third of the essay's pull from the hood shot to the galaxy wide, and the hood
  shot is fully real. Against the essay's bands this is just past the spikes' `spikeLod` [6, 12] and about where the
  planet points come in (s_px 10 → 20), so the far star hands over as the system starts to show its planets.
- **First visit** lands on Wisps (reviewed) · Dissolve (late) (`cur` 4, `hoodMode` 'dissolve-late'); a saved camera
  blob restores whatever was last used.
- **Verified in Playwright** (phone 390×844 @2x with touch, CDP touch events; and desktop 1440×900;
  `work/rev/hood2-test.log`): the first-visit default and the pill text; two rows of dots (11 / 5); five swipes up
  cycle Blend → Dissolve → Dissolve (late) → Jitter → As today and five down the reverse, the preset untouched; a
  sideways swipe still changes the preset; diagonal swipes pick their dominant axis and an even one does nothing; the
  camera (zoomed and turned beforehand) bit-identical after every swipe; the pill flashes on an option change; the late
  band's shares at 640 / 277 / 120; on desktop ↑ ↑ ↓ → gives Blend on the next preset with the camera unchanged.
- `shots/hood-compare.png` gained a "Dissolve (late)" panel in the mid zoom-out row (`shots/hood-dissolve-late-mid-390x844@3x.png`,
  and the wide `shots/hood-dissolve-late-390x844@3x.png`, which is Dissolve's wide: same far form, same pulls).
