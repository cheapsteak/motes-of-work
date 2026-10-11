# Galaxy arm research: what a realistic arm formula looks like

Status: COMPLETE (see §9 for the tier key).

Question (the author): "What might a realistic-looking galaxy arm formula look like?"

Scope: Act II galaxy, 2,400 stars + 4,000 dust (phone), 86° elevation, 390×844. Today's generator is
`src/galaxy/background.ts`; the tuner (`galaxytuner/galaxy-tuner.html`) ports it and adds `RECOMMENDED`.

Source tiers: T1 direct test · T2 papers/official · T3 blogs/talks · T4 unverified.

## 0. What the code does today (T1: read the source)

- Arm angle: `armAngleAt(r) = arm·π + ln(r/2)/pitch + phase`, pitch 0.28 ⇒ `r = 2·e^{0.28 θ}`; pitch angle
  `i = atan(0.28) = 15.6°`. (That is already an Sb/Sc-like pitch; the "recommended" 0.34 is 18.8°.)
- Phase: arm 0 passes (r 65, bearing 0.9), the neighbourhood's middle.
- Cross-arm: *bearing* scatter, `scatter·(1 − 0.5 r/R)·U(−1,1)` (today); the recommended `perp` mode
  moves along the arm normal by `σ(r)·(sum of three uniforms)` — bounded at ±3σ — and the
  `inLane` rule deletes stars inside a hard band `|d/σ − laneOffset| < laneWidth/2` with prob
  `laneDepth`.
- Placement: each star takes the first of up to 64 draws whose halo touches no other at the galaxy
  wide, else the roomiest. Wherever the target density exceeds the packing density this flattens the
  profile toward a plateau (the "colouring inside the lines" cliff).
- Radial: `r = R·u^0.75` today; `exp` mode is a Gamma(2) draw of scale `discScale·R` (surface density
  ∝ e^{−r/h} in 2-D: correct), clamped to R.
- Core: 22% of stars in `CORE_RING`-star rings out to 0.35 R (today), or an exponential sphere.
- Inter-arm: 0 today; 10% in `RECOMMENDED`.

### The neighbourhood and the arm (T1: computed from `HOOD`)

The 30 `HOOD` spots lie at r 40–90, bearings −1.05…2.85. Arm 0 (pitch 0.28, phase 1.033) sweeps
bearing −0.84 (r 40) to 2.05 (r 90) across that range, so the hood sits *on* arm 0 with a
perpendicular scatter (table in §7).


### The neighbourhood vs the arm, measured (T1: `hoodcheck.mjs`)
Minimum distance of each of the 30 `HOOD` spots to arm 0 (phase re-solved to pass (65, 0.9) for
each pitch):

| pitch (tan i) | i | median dist | p90 | max | arm radii spanned |
|---|---|---|---|---|---|
| 0.22 | 12.4° | 15.4 | 32.1 | 33.8 | 21–88 |
| 0.28 (today) | 15.6° | 18.4 | 34.3 | 37.1 | 16–95 |
| 0.34 (recommended) | 18.8° | 18.7 | 37.4 | 40.2 | 12–101 |
| 0.40 | 21.8° | 22.1 | 39.7 | 42.9 | 9–108 |

So the neighbourhood is not a strip along the arm: it is a round clump ~35 units in radius centred on
(65, 0.9). Pitch barely changes how well the arm "passes through" it (median 15–22 units at every
pitch), because the phase is re-solved each time. **Pitch is therefore free within 0.22–0.40 at no
cost to the neighbourhood.** What the recipe must do instead is treat the clump as what a 70-unit
patch at r 65 IS in a real galaxy: a star complex / spur on the arm (see §3), i.e. a knot wider than
the arm, with members spilling into the interarm. The old-star arm at r 65 is ~20 units FWHM (§2),
the young-star arm ~8 units FWHM, so the hood is 2–4 arm widths across: a knot, not the arm.

## 2. Density structure

### Lin–Shu density waves and how graphics renders them
- Lin & Shu (1964): the arms are a quasi-stationary density wave in the old-star disc, a few tens of
  percent over the axisymmetric disc; gas entering the potential well shocks (the dust lane), star
  formation follows downstream, young stars and HII regions outline the wave at high contrast. (Summary
  in Elmegreen et al. 2011 §2, T2.)
- Procedural rendering (Ingo Berg, beltoforion.de "Rendering a Galaxy with the density wave theory",
  T3; TypeScript source read, T1): every star rides an ellipse with the centre at a focus; the
  ellipse eccentricity is piecewise linear in radius (1 at the centre → `ex1` = 0.8 at the core
  radius → `ex2` = 1.0 at the galaxy radius → 1 at 2× radius), and each ellipse is rotated by
  `tilt = r·deltaAng` (default 0.019 °/ly, radius 15,000 ly, core 6,000 ly). Where neighbouring
  tilted ellipses crowd, the density rises: that crowding IS the arm; nothing is placed "on" an
  arm. Radial law: bulge `I0·exp(−k·r^{1/4})` (k 0.02) inside the core radius, an exponential disc
  `exp(−r/a)` with `a = R/3` outside, inverted by a tabulated CDF. H-II regions are scattered like
  stars and drawn big only where the local wave spacing is small, so they appear only on the arms.
  Dust: half from the CDF, half uniform over the square; dust filaments are random walks. Colour by
  black-body temperature 3,000–9,000 K. Default 60,000 stars (the first 1/60 brighter).
- What the ellipse method buys: a cross-arm profile that is automatically smooth and unbounded (the
  density of crowded ellipses falls off continuously), arms that widen outward, a natural inner
  "bar/oval" where eccentric inner ellipses align, and arms whose contrast fades at the rim where
  eccentricity returns to 1. What it costs: the arm shape is not a log spiral exactly (it is an
  "isochrone" of tilted ellipses), so an arm cannot be pinned through (65, 0.9) by a phase; the
  other agent’s density-wave mode will need to solve the tilt rate so that the crowding ridge passes
  the neighbourhood, and the ridge pitch is not constant with radius.

### Arm–interarm contrast by population (numbers)
- **Old stars (3.6 µm, S4G; Elmegreen et al. 2011, ApJ 737, 32; T2, Table 2 & Fig 6):**
  arm–interarm contrast `A = 2.5 log[2 I_arm / (I_inter1 + I_inter2)]` averaged over the disc:
  grand design 1.14 ± 0.44 mag (×2.9), multiple-arm 0.81 ± 0.28 mag (×2.1), flocculent 0.75 ± 0.35
  mag (×2.0). Per galaxy: **M51 1.3 mag (×3.3)**, **M74/NGC 628 0.95 mag (×2.4)**, **M100 1.3 mag
  (×3.3)**; M51 also 1.6 mag in B. The contrast is "nearly independent of colour" for multi-arm and
  grand-design galaxies (B 1.04, I 0.99, 3.6 µm 1.17 mag): the arms are strong mass perturbations.
  Flocculents are colour-dependent (B 0.63, I 0.34, 3.6 µm 0.44 mag): young stars on a smooth disc.
  Peak relative m=2 Fourier amplitude (×2 = arm amplitude) M51 0.23, NGC 628 0.10, M100 0.20.
  Arm "slope" with radius: M51, NGC 628, M100 all **Rise** — contrast grows outward.
- **K band (Rix & Rieke 1993, M51; T2):** surface-mass-density arm/interarm contrast 1.8–3; larger
  than the I-band light contrast because dust dims the optical arm crest. NGC 4254: K′ contrast 2–3.
- **Young stars / star formation (Foyle et al. 2010, T2, arXiv:1010.0678):** with arms defined as
  the top 25% of 3.6 µm pixels per annulus, ~60% of the FUV / 24 µm star-formation tracers are
  STILL interarm; with 45% of pixels, ≥30% interarm. Ranking of concentration: 24 µm > FUV > 3.6 µm;
  CO > HI. So even star formation is only ~2–3× more arm-concentrated than the old disc, in area
  terms; what makes young arms look high-contrast is that young light is CLUMPED (HII regions,
  complexes) rather than that it is confined.
- **Implication for a point cloud:** with contrast ×2.4–3.3 between arm crest and interarm, and the
  arm (FWHM 0.3 r, §below) covering roughly 30–40% of each annulus, the old population is ~45–55%
  interarm by count. The "recommended" 10% interarm is a factor 4–5 too low; today’s 0% is why the
  galaxy reads as a drawn outline.

### Cross-arm profile shape (Chugunov, Marchuk & Savchenko 2025, Galaxies; arXiv:2504.11642; T2)
19 face-on S4G spirals at 3.6 µm (stellar mass), radial slices across each arm, 2-D fits:
- Profile: asymmetric "Sérsic" `I⊥(ρ) = I0·exp(−ln2·(ρ/w_in)^{1/n})` (ρ<0), same with `w_out`
  (ρ≥0), where w are half-widths at half max; `n = 0.5` is a Gaussian, `n = 1` an exponential.
  **Median n = 0.59–0.74 (0.4 < n < 0.9 for most arms)**: peakier than a Gaussian, broader-tailed,
  but not as cuspy as an exponential. (Their Fig 9, §4.1.)
- Skewness `S = (w_out − w_in)/(w_out + w_in)` scatters around ZERO with no systematic side; it may
  change sign at corotation. Adding skewness + n improved χ² by only 2–3%: "recommend not using
  these parameters by default".
- **Width grows linearly with radius:** `w_loc = w1·r + w0` (FWHM, radial direction) with median
  **w1 = 0.30** (q=0.1 disc) or 0.19 (decomposition disc), zero-point share 19–34%, and
  **median FWHM / r ≈ 0.37 (0.29)**. In FUV (young stars) w1 = 0.14: the young arm is ~half the
  width of the old-star arm. 82–88% of arms widen outward. Constant width fits worse (+9–12% χ²);
  width ∝ r (w0 = 0) fits almost as well as linear (+1–2%). Widths perpendicular to the arm are
  cos(i) ≈ 0.97 of radial ones.
- Along-arm brightness: exponential in r with scale **1.3–1.35× the disc scale length** (so the arm
  contrast rises outward), times a flat-top window with cubic (smoothstep) growth and cutoff at the
  arm ends; sharp arm ends fit >10% worse. 1–2 Gaussian brightness DIPS along an arm were the single
  most valuable addition (−17% χ² each): real arms are not uniformly bright along their length.
- Arm exponential scale vs disc: 1.30 ± 0.13 (type I discs), 1.35 ± 0.08 incl. type II.
- Compare HII-region arms (Honig & Reid 2015, §1): σ/r ≈ 0.04–0.08 ⇒ FWHM/r ≈ 0.1–0.19 — again the
  young arm is 2–3× narrower than the old-star arm, and it narrows again at the outer end.
- Milky Way masers (Reid et al. 2014): σ/r ≈ 0.03–0.05, growing 42 pc/kpc.

### Where the young stars sit (dust lane inside, young stars downstream)
- Density-wave expectation (Roberts 1969): gas shocks on the inner (concave) edge of the arm inside
  corotation → narrow dust lane; star formation follows after Δt → young stars downstream, i.e. on
  the outer/convex side; offset `Δφ = (Ω(r) − Ωp)·Δt` shrinks to zero at corotation and flips sign
  beyond it. (Louie, Koda & Egusa 2013, arXiv:1301.2601; T2.)
- M51 numbers (Louie et al. 2013): CO is "aligned perfectly with narrow dust lanes"; CO→Hα offsets
  mostly positive, up to ~25–30° azimuthal in arm 1 (E09), HI→24 µm offsets mostly < 10°; inferred
  Δt 3.4 Myr (T08, HI→24 µm) to 7–14 Myr (E09, CO→Hα).
- Pour-Imani et al. 2016 (via arXiv:1911.06798, T2): star-forming tracers show a MORE OPEN pitch
  than old stars (medians 3.6 µm 12°, B 16°, 8 µm 21°, FUV 23°) — equivalent to the young arm being
  displaced increasingly outward/downstream with radius inside corotation.
- Seigar & James 1998 (K vs B, T2): B-band arms lead K-band arms by ~5° at small radii, tens of
  degrees at large radii, and B-band cross-sections are much narrower than K.
- M81 is the exception (dust filaments spread 1.5 kpc downstream, no single lane; T2); M51 and M83
  have the classic single lane on the inside edge.
- Reference images (T1, `img/m51_heic0506a.jpg`, `img/m74_heic0719a.jpg`): in M51 the dark lane
  hugs the inner edge of each arm along its whole length; pink HII knots sit on the lane’s outer
  side and along the arm crest; the blue arm is a broad band outside the lane; between the arms the
  disc is a smooth grey-blue haze of unresolved stars, NOT empty. In M74 the lanes are more
  fragmented (many short feathers), the bulge is small and yellow, the arms are broad and
  blue with pink knots, and the outer arms bifurcate and fade into a flocculent outer disc.

### Arm width growth with radius (summary)
Old stars: FWHM ≈ 0.3 r (0.19–0.37 r), roughly linear. Young stars / HII: σ ≈ 0.04–0.08 r growing
~0.05–0.12 kpc/kpc, then narrowing where star formation dies at the rim. Savchenko 2020 (SDSS r):
mean full width 0.14 r25, slope 0.24 r25/r25.

## 3. Sub-structure

### Beads on a string (HII regions / star complexes)
- Elmegreen & Elmegreen 1983 (T2 via arXiv:1310.0082): regular strings of star complexes in 22 grand
  design galaxies, spacing 1–4 kpc (≈ 0.1–0.3 R25).
- Elmegreen et al. 2018 (M100 Spitzer, T2): evenly spaced IR clumps along dust filaments, spacing
  ~410 pc ≈ 3× clump diameter (gravitational instability of the shocked gas filament).
- Gusev & Efremov 2013 and later (T2): adjacent HII-region separations 350–500 pc or integer
  multiples; NGC 628 and M100 both ~400 pc; M31 ~1.1 kpc.
- Two scales therefore: fine beads every ~0.03 R25 (invisible at 0.86 px/unit: 6 units ≈ 5 px), and
  complexes every ~0.1–0.3 R25 (20–60 units ≈ 17–50 px on a phone) — the latter is the scale a
  2,400-star phone galaxy can show. The neighbourhood (70 units) is one such complex.
- Knots sit on the young-star arm (downstream of the lane), so slightly OUTSIDE the old-star crest.

### Spurs and feathers (La Vigne, Vogel & Ostriker 2006, ApJ 650, 818; arXiv:astro-ph/0606761; T2)
- Found in 20% of 223 HST spirals; 26–33% of Sb–Sc; 17% Sab; none in Scd–Sd.
- They emerge from the primary dust lane (inner edge) as LEADING features, curve to trailing
  downstream on the outer edge, and often cross the whole interarm, some merging with the next arm’s
  lane; a few traceable over >180°.
- Spacing: M51 ~200 pc inside → 500–1000 pc outside; NGC 3433 310–430 pc; NGC 5985 445–770 pc;
  spacing grows as gas surface density falls. Pitch ~50° on average, decreasing downstream.
  OB associations line them: a spur is where interarm young stars come from.
- For a point cloud: 10–20 short trailing-leaning streaks per arm that leave the arm’s outer edge at
  ~50° and dissolve over 0.1–0.2 R, drawn from a seeded stream per spur. They are what makes an arm
  edge ragged instead of a cliff.

### Dust lanes
- Position: inner/concave edge inside corotation; CO/dust lane coincident; young stars and HII
  regions downstream (outer side). Offset to the stellar (old) crest: a fraction of the old-arm
  width (from the M51 image: lane ≈ 1/4–1/3 of the way from the inner edge to the crest; T1 eyeball).
- Width: narrow — the M51 lane is roughly 1/4 of the blue arm’s width, and it is continuous for
  >180° per arm, with feathers hanging off it; in M74 it breaks into short segments.
- Depth: in the optical the lane dims the arm crest enough that the I-band contrast (1.8–3 in mass)
  reads lower; in K band attenuation is ≲10% even in the lane (Rix & Rieke 1993). For a point cloud,
  a multiplicative dip of 0.4–0.6 on the star density (and the opposite — a peak — on the dust
  motes) with a Gaussian cross-section is the honest shape; nothing hard-edged.

## 4. The disc and bulge
- **Disc scale length vs visible radius.** Freeman (1970): B-band central surface brightness ≈ 21.65
  mag/arcsec² for most discs; R25 is where μ_B = 25, so `R25 = (25 − 21.65)/1.086 · h ≈ 3.1 h`, i.e.
  **h ≈ 0.32 R25** (T2, derived). Beltoforion uses a = R/3 for the same reason. Chugunov 2025: arm
  light has a scale 1.3× that, ≈ 0.42 R25. With R = 220 (the galaxy radius; the visible edge), use
  h ≈ 0.32 R ≈ 70 for the old disc and h_arm ≈ 0.42 R ≈ 92 for the arm population.
- **Bulge.** Graham & Worley 2008 (MNRAS 388, 1708; arXiv:0805.3565; T2), dust-corrected medians:
  K-band B/D Sb 0.25, Sbc 0.15, **Sc 0.09**, Scd 0.06; B-band B/D Sc 0.052; K-band bulge Sérsic n
  Sb 2.0, Sbc 1.87, **Sc 1.78**, Scd 1.18. Weinzirl et al. 2009 (H band, T2): ~60% of bright spirals
  have n ≤ 2 bulges, most with B/T ≤ 0.2. So an Sc bulge is **5–10% of the light, n ≈ 1–2
  (exponential-ish), effective radius ≈ 0.2–0.25 h ≈ 0.05–0.08 R** (bulge R_e/h ≈ 0.2–0.25 from the
  same paper’s discussion). The current 22–25% core share is Sb-like; the "rings" bulge is 0.35 R
  across, far too big for an Sc.
- **Colour gradients.** de Jong 1996 (T2): discs get bluer outward (age + metallicity, not dust);
  Taylor et al. 2005 (T2): early/mid spirals slightly bluer with radius; arm/interarm: the classic
  age gradient across an arm (bluest at the young arm, reddening downstream) and a red→blue "colour
  jump" across the arm from the offset between the old-star and star-forming arms (HUDF study,
  arXiv:2306.08037, T2). Arms are bluer than the interarm by the young population, not by
  the old one: in 3.6 µm the contrast is colour-independent.
- **Bars.** M100 = SAB(s)bc with a ~4 kpc K-band bar (T2); M51 = SA(s)bc pec (no bar; a weak inner
  oval); M74 = SA(s)c (no bar). Ringermacher & Mead: a bar is the small-B limit of the same curve,
  and it is Sa/Sb-typical; Elmegreen 2011: late-type bars are short, low-amplitude, exponential, with
  arm contrast rising beyond them. For an Sc model of M74: **no bar**; at most the inner ends of the
  two arms may start as a short straight-ish segment (what an aligned inner ellipse gives in the
  density-wave mode). Our neighbourhood at r 65 (0.3 R) is well outside any Sc bar anyway.
- **Vertical thickness.** de Grijs 1998 (T2 via arXiv:2410.09762): scale length / scale height
  1.5–2 for early types, **3–8 for Sc–Sd**; thick/thin ratio 2.65 (S4G edge-ons). Young populations
  are thinner (≈100 pc vs ≈300 pc, ratio ~3). With h ≈ 70 units: old-disc z0 ≈ 9–20 units, young
  z0 ≈ 3–7; the bulge is rounder (flattening 0.55–0.7). At 86° elevation this only shows as a slight
  blur of the arms’ far side; keep the triangular draw but widen it to ±(0.1–0.2 h) for the old disc.

## 5. Procedural practice (what makes a point cloud read as a galaxy)
- **Space Engine** (official blog, T3): stars generated to follow the galaxy "subsystems" (spiral
  pattern, disc, bulge, halo) with density falling exponentially from the centre and from the plane;
  arm stars skewed to young blue giants; every star seeded so it reappears in place. Galaxy sprites
  are still "standard models" + procedural noise.
- **Elite Dangerous / Stellar Forge** (80.lv, Frontier forum; T3): the galaxy-scale density is an
  artist-painted top-down density map (the one non-programmatic input), plus age functions per
  sector; arms come from the painting, not a formula.
- **Gaia Sky 2025 procedural galaxies** (gaiasky.space, T3): separate channels for stars, HII, gas,
  dust, bulge, each with a shape (sphere, Gaussian disc, spiral, log spiral, bar, …) and the spiral
  channel "based on density wave theory"; compute-shader sampled.
- **three.js-journey / Codrops galaxy** (T3, community copies): `angle = branch·2π/branches +
  spin·r`, then per-axis offset `±randomness·r·U^randomnessPower` (power 3). Note this is a
  BOUNDED scatter (|offset| ≤ randomness·r) — exactly the cliff we are trying to lose; its only
  softening is the power law piling draws near zero.
- **beltoforion** (T3/T1): the density-wave ellipse method above — unbounded by construction.
- **gamedev.net "Galaxy generation"** (T3): a 3-D density function = max(halo, spiral density map,
  globular clusters); stars by rejection sampling against it; the advice thread: "model it as a
  fractal density field; Perlin noise is the practical route".
- **Godot/Shadertoy galaxy shaders** (godotshaders "Volumetric Cosmic Dust", Neyret’s index; T3):
  map UV into log-spiral space (`u = ln r − θ·tan i`), then multi-octave fBm along that warped
  domain for dust and arm density; blend core, dust and background by density masks. A research
  posting (abg.asso.fr, T3) notes Perlin-type noise fails to give the filamentary look of real dust.
- **Tricks that matter, distilled:** (1) never bound a scatter — use a Gaussian / Sérsic n≈0.6
  tail, or crowding of ellipses; (2) modulate the arm amplitude along the arm with low-frequency
  seeded noise (dips, segments of ~5 kpc ≈ 0.35 R, per Honig & Reid) and let the arm fade at both
  ends with a smoothstep; (3) put ~half the old stars in a smooth interarm disc so the arm is a
  crest on a sea, not a line on black; (4) clump the young light at two scales (complexes 20–60
  units, beads below the pixel) and pull knots slightly outward of the crest; (5) streak spurs off
  the outer edge; (6) warm bulge, blue knots, neutral old disc; (7) a narrow Gaussian dust dip on
  the inner edge, never a hard band; (8) arm width ∝ r.

## 6. Diagnosis of the current look, checked against the code (T1)
The author’s verdict ("stark, filled inside a spiral outline, density cliff, colouring inside the
lines") and the caller’s four-point diagnosis are confirmed by reading `background.ts` and the
tuner’s `generateBackground`, and by the other agent’s own measurement in `shape-notes.md`:
1. Bounded cross profile: `perp` mode uses `gauss3` = sum of three uniforms, zero beyond ±3σ (σ 3→9
   units). The density falls ×2.6 per 3-unit bin at the bound: a cliff, not a tail.
2. The roomiest-of-64 placement shaves 29% off the crest and doubles the flanks at ±14 units: the
   profile is pushed toward a plateau exactly as wide as the bound.
3. The lane is `|d/σ − laneOffset| < laneWidth/2` with probability `laneDepth`: a hard band.
4. `discShare` 0.1 and the bearing/perp scatter put 90% of non-core stars ON the arm profile; real
   old discs are ~50% interarm by count (§2). Plus three points the diagnosis did not list:
5. One population: the same width and contrast for old and young stars, whereas the real young arm
   is ~2× narrower and ~3–4× higher-contrast than the old-star arm, and sits downstream of it.
6. Constant arm amplitude along the arm, sharp ends: real arms have dips and ~5 kpc segments and
   smoothstep ends (Chugunov 2025, Honig & Reid 2015).
7. The bulge: 22–25% of the stars out to 0.35 R is an Sb bulge; an Sc like M74 has 5–10% in ≈0.06 R.

## 7. The recipe: an Sc like M74 (NGC 628) at 2,400 stars
Why M74: SA(s)c, no bar, nearly face-on (i = 7°), two long grand-design arms at pitch ≈ 15° (our
0.28 ⇒ 15.6°, so the neighbourhood’s spiral is already M74’s), tiny bulge, strong blue knots,
arms that fade and bifurcate into a flocculent outer disc. M51’s heavier bulge and tidal arm would
need a companion to read right; M100’s bar is an Sb trait. (Prototype: `proto.html`, stills in
`stills/`; every number below is what the prototype runs.)

**Populations** (shares of the fixed star count N; a star’s population is its index range, so the
counts are exact and every star still draws from its own `bgStars` stream):
bulge 0.08 · old disc 0.50 · young arm 0.26 · knots 0.12 · spurs 0.04.

**Arm angle** (unchanged): `θ_arm(r, k) = k·2π/m + ln(r/2)/pitch + phase`, m = 2, pitch 0.28
(0.31 is also fine: §1 table), `phase = 0.9 − ln(65/2)/pitch`. Pitch angle i = atan(pitch).

**Cross-arm coordinate**: `Δ = wrap(m·(θ − θ_arm(r, 0)))/m` (bearing offset to the nearest crest),
`d = −Δ·r·sin i` (perpendicular distance; **negative is the inner, concave edge**).

**Cross-arm profile** (Chugunov 2025): `f(d; w) = exp(−ln2·(|d|/w)^{1/n})`, **n = 0.6** (0.5 would be
a Gaussian, 1 an exponential), w the half-width at half max. Unbounded; tail heavier than Gaussian.
- old: `w_old(r) = 0.15·r·cos i` (FWHM 0.30 r)
- young: `w_young(r) = 0.065·r·cos i` (FWHM 0.13 r), centred at `d = +0.12·w_old` (downstream)

**Arm amplitude along the arm**: `ramp(r) = smoothstep(0.07R, 0.18R, r)·(1 − smoothstep(0.85R,
1.05R, r))`; `mod(r, k) = 1 + 0.45·(2·V_k(ln r / 0.35) − 1)` with V_k a seeded value-noise table
per arm (stream `bgArmMod`, key k), smoothstep-interpolated — the ~5 kpc segments and 1–2 dips.

**Acceptance weight for a disc star** (rejection sampling: draw r from the radial law, θ uniform,
accept with probability W):
`W_old = (1 + A_old·ramp·mod·f(d; w_old)) / (1 + A_old) · taper(r) · lane(d)`, **A_old = 1.8**
(crest/interarm 2.8 ≈ 1.1 mag; M74 measures 0.95 mag ⇒ 1.4, M51 1.3 mag ⇒ 2.3);
`W_young = (1 + A_young·ramp·mod·f(d − 0.12 w_old; w_young)) / (1 + A_young) · taper · lane · ramp`,
**A_young = 9**.
`taper(r) = (1 − smoothstep(0.9R, 1.2R, r)) · smoothstep(0.75·16, 1.25·16, r)` (soft rim, soft core
hole: no clamp at R, no hard exclusion).

**Radial laws** (2-D exponential: `r = −h·ln(u1·u2)`): old disc **h = 0.32 R** (Freeman: R25 ≈ 3.1 h);
young arm and knots **h_arm = 0.42 R** (arm light scale 1.3× the disc’s, so arm contrast rises
outward); bulge: exponential sphere `r = −h_b·ln(u1u2u3)`, **h_b = 0.06 R**, flattened ×0.6 in y.

**Dust lane** (multiplicative, Gaussian, on stars): `lane(d) = 1 − 0.6·exp(−½((d + 0.45·w_old) /
(0.14·w_old))²)` — centred 0.45 old half-widths inside the old crest (just inside the young arm’s
inner edge), FWHM ≈ 0.33 w_old; the same Gaussian multiplies the dust motes’ weight by (1 + 2.5·g).

**Knots** (star complexes, the neighbourhood’s kin): 26 centres (13 per arm) from stream `bgKnots`,
r from the arm law within the ramp, at `d = (0.12 + 0.15)·w_old ± 0.25·w_old·N(0,1)`; member
positions `centre + σ_k·N(0,1)` with **σ_k = 0.045·r·U(0.7, 1.3)**; brightness ×1.45. Members
beyond the arm are allowed (that is what a complex looks like).

**Spurs** (La Vigne 2006): 20 roots from stream `bgSpurs`, at `d = +0.72·w_old` (the young arm’s
outer flank), direction = arm tangent rotated **50°** outward (trailing), length `0.16·r·U(0.6,
1.4)`, members at `root + dir·Exp(len/2) + 0.012·r·N(0,1)` (dense at the root, fading out).

**Vertical** (Gaussian σ, h = 0.32 R): old 0.12 h ≈ 8; young/knot/spur 0.04 h ≈ 3; dust 0.06 h ≈ 4;
bulge spherical × 0.6. (de Grijs: h/z0 3–8 for Sc; young ~3× thinner.)

**Colour and brightness**: bulge 95% warm, ×0.9; old warm share `0.75 → 0.2` as √(r/R), brightness
`0.75·(0.3 + 0.7·u^2.5)`; young `0.45 + 0.55u²`, never warm; knots young ×1.45 (cap 1); spurs
`0.4 + 0.5u²`. Bright set = top 15% by brightness (lands mostly on knots and young stars).

**Dust** (4,000): 70% drawn with the old-arm weight at A = 1.2 and the lane peak, 30% smooth disc;
brightness 0.08–0.22; same soft taper.

**Placement**: no halo clearance (rejection sampling only; halos may overlap per the author); a draw
within 3.2 units of a neighbourhood spot is redrawn, so the 30 `HOOD` spots keep their room.

**Determinism**: streams per star (`bgStars` i), per mote (`bgDust` i), per knot (`bgKnots` k), per
spur (`bgSpurs` k, new salt 15), per arm modulation table (`bgArmMod` k, new salt 14). All draws
are from the star’s own stream, including the Box–Muller normals; no `Math.random`.

### Parameter map (tuner name → recipe)
| recipe | tuner (exists) | note |
|---|---|---|
| pitch 0.28, arms 2 | `pitch`, `arms` | unchanged; 0.31 optional |
| bulge 0.08, h_b 0.06 R, flat 0.6 | `coreShare`, `bulgeScale`, `bulgeFlat`, `bulgeMode: exp` | was 0.22–0.25 / 0.08–0.09 |
| old disc h 0.32 R | `radialLaw: exp`, `discScale` | was 0.4 |
| old share 0.50 (≈ half interarm) | `discShare` (meaning changes: see §2) | was 0.1 |
| young 0.26 | `youngShare` (other agent’s new key) | — |
| knots 0.12, 26, σ 0.045 r, +0.15 w, ×1.45 | `clumpShare`, `clumpCount`, `clumpRadius` (→ share of r), `clumpOut`, `clumpBright` | radius ∝ r is new |
| spurs 0.04, 20, 50°, 0.16 r, 0.012 r | NEW `spurShare`, `spurCount`, `spurAngle`, `spurLength`, `spurWidth` | salt 15 |
| arm start 0.07–0.18 R, end 0.85–1.05 R | `armStart`, `armEnd` (as smoothstep pairs) | — |
| A_old 1.8, A_young 9 | NEW `contrastOld`, `contrastYoung` (the other agent’s A per population) | — |
| FWHM_old 0.30 r, FWHM_young 0.13 r | NEW `widthOld`, `widthYoung` (replace `sigmaCore`/`sigmaRim`: width ∝ r) | — |
| n 0.6 | NEW `sersicN` (replaces `armSoft`) | — |
| young offset +0.12 w_old | NEW `youngOffset` | — |
| modulation 0.45, period 0.35 | NEW `modDepth`, `modPeriod` | salt 14 |
| lane −0.45 w, 0.14 w, depth 0.6, dust ×2.5 | `laneOffset`, `laneWidth`, `laneDepth` (now in old half-widths, Gaussian), NEW `dustLaneGain` | — |
| h_arm 0.42 R | NEW `armScale` | — |
| disc taper 0.9–1.2 R, soft core 12–20 | NEW `discFade`; `coreExclusion` becomes soft | — |
| z: old 0.12 h, young 0.04 h, dust 0.06 h | `starY`, `dustY` (now per population, Gaussian) | — |
| warm 0.75 → 0.2, old dim 0.75 | `warmCore`, `warmRim`, NEW `oldDim` | — |
| dust arm share 0.7, A 1.2 | `dustMode` → NEW `dustArmShare`, `dustContrast` | — |

### Density-wave mode (the other agent’s `shape: 'wave'`) — how the recipe maps
The crowding of tilted ellipses gives the OLD population its profile and contrast for free (their
measured 1.5× at a 40 → 3.7× at 200 matches S4G’s 2–3.3× and the "Rise" slope); keep young stars,
knots, spurs, the lane and the modulation as above but measured from the crest t* instead of
`θ_arm`. The one thing to check there is width: ellipse crowding tends to make a crest whose width
grows with r automatically, but its profile shape is set by e(a) and the tilt rate; compare its
cross-arm histogram with the n = 0.6, FWHM 0.3 r target rather than tuning by eye.

### Cost to the neighbourhood
None for pitch 0.22–0.40 (§1 table): the arm is re-phased through (65, 0.9) and the hood is a
35-unit clump either way. The recipe makes the hood read as one of the knots (σ_k at r 65 ≈ 3 units
is smaller than the hood’s 35, so the hood is the biggest complex on the arm — appropriate, it is
the subject). If the young crest offset (+0.12 w_old ≈ +1 unit at r 65) is unwanted at the hood,
set `youngOffset` 0 at no visible cost; it matters at r > 120.

## 8. Prototype check (T1: `proto.html`, stills in `stills/`)
Canvas-2D stand-in for the essay’s sprites (2/3 px stars, 1 px dust, warm haze; additive), the
essay’s phone framing (0.94 px/unit, core at 0.62 H, 86°). Rendered with Playwright/SwiftShader.
- `stills/phone-seed1.png`, `phone-seed2.png` (390×844 @3x), `phone-seed1-1x.png` (@1x): the recipe
  at the essay’s galaxy wide. Reads as a disc with two broad clumpy arms on a sea of faint stars
  and dust, a small warm bulge; no outline, no cliff.
- `stills/overhead-seed1.png`, `overhead-seed1-nohood.png` (800×800, 1.7 px/unit): structure check
  with and without the neighbourhood sprites.
- `stills/overhead-m51like-pitch031.png`: pitch 0.31, A_old 1.2, A_young 6 (a lower-contrast,
  more open variant); `stills/overhead-noknots-nomod.png`: no knots, no spurs, no modulation
  (what the smooth profiles alone give — the arms turn back into even bands: the clumping is
  most of the realism).
- Measured on the old population at r 80–160 (3-unit bins of perpendicular distance): share beyond
  one HWHM of the crest **0.52–0.59** (target ≈ 0.5); largest bin-to-bin step 1.7–2.2 with ~20
  counts per bin, i.e. Poisson noise, versus ×2.6 at the gauss3 bound in RECOMMENDED. 60–85 ms to
  generate 2,400 + 4,000 points (rejection sampling, no clearance grid).
- Not tuned for taste: A_old, the dust gain and the knot brightness are the knobs the tuner should
  own. The reference images for taste are `img/m74_heic0719a.jpg` (the model) and
  `img/m51_heic0506a.jpg` (lane + knots); both ESA/Hubble, internal reference only.

## 9. Sources (tiered)
T1 (direct): `src/galaxy/background.ts`; `galaxy-tuner.html` (`generateBackground`, TODAY,
RECOMMENDED, HOOD); `shape-notes.md` (the other agent’s measurements); `hoodcheck.mjs`;
`proto.html` + stills; beltoforion Galaxy-Renderer-Typescript `Galaxy.ts`,
`CumulativeDistributionFunction.ts` (read); ESA/Hubble images heic0719a (M74), heic0506a (M51).
T2 (papers): Elmegreen et al. 2011, ApJ 737, 32 (S4G arm–interarm contrasts; Tables 2–3, Fig 6);
Chugunov, Marchuk & Savchenko 2025, Galaxies, arXiv:2504.11642 (cross-arm Sérsic n, width ∝ r,
along-arm law); Mosenkov/Savchenko/Marchuk 2020, arXiv:2003.13994 (arm widths, 155 SDSS spirals);
Honig & Reid 2015, arXiv:1412.1012 (HII-region arm widths, pitch per arm, 5 kpc segments);
Reid et al. 2014, arXiv:1401.5377 (Milky Way arm widths, 42 pc/kpc); Yu & Ho 2019,
arXiv:1812.06010 (pitch vs type and concentration); Ma et al. 2002, arXiv:astro-ph/0002476 (mean
pitch by type incl. Kennicutt 1981); Ringermacher & Mead 2009, MNRAS 397, 164, arXiv:0908.0892
(scaffold formula; M51 fit N = 4, B = 0.63, log pitch 17°); Foyle et al. 2010, arXiv:1010.0678
(arm/interarm star-formation fractions); Rix & Rieke 1993 / Rix & Zaritsky 1995 (K-band mass
contrast 1.8–3; via arXiv:astro-ph/9505111 and astro-ph/9803254); Seigar & James 1998,
arXiv:astro-ph/9803254 (K vs B arm position/width); Louie, Koda & Egusa 2013, arXiv:1301.2601
(M51 offsets, dust lane = CO); Pour-Imani et al. 2016 via arXiv:1911.06798 (pitch by tracer);
La Vigne, Vogel & Ostriker 2006, arXiv:astro-ph/0606761 (feathers); Elmegreen & Elmegreen 1983
via arXiv:1310.0082 and Elmegreen et al. 2018 / Gusev & Efremov 2013 (beads, 400 pc; 1–4 kpc
complexes); Graham & Worley 2008, arXiv:0805.3565 (B/D and bulge n by type); Weinzirl et al. 2009,
arXiv:0807.0040 (low-n bulges); Freeman 1970 (μ0 = 21.65 ⇒ R25 ≈ 3.1 h); de Jong 1996 (colour
gradients); Taylor et al. 2005; arXiv:2306.08037 (colour jump across arms); de Grijs 1998 via
arXiv:2410.09762 (h/z0 3–8 for Sc; thick/thin 2.65); arXiv:2410.07676 (arm-class fractions);
RC3 types for M51/M74/M100 (via arXiv papers and the de Vaucouleurs atlas, NGC 4321 SAB(s)bc).
T3 (blogs/talks): beltoforion.de density-wave renderer article; Space Engine blog; 80.lv and
Frontier forum on Stellar Forge; Gaia Sky 2025 galaxy-generation post; three.js-journey / Codrops
galaxy generator (community copies); gamedev.net galaxy-generation blog; godotshaders
"Volumetric Cosmic Dust"; Neyret’s Shadertoy index.
T4 (unverified): the emergentmind summary that first surfaced "42 pc/kpc" (then confirmed in the
paper text, so promoted to T2); the exact Lin–Shu amplitude numbers quoted from memory in §2’s
first bullet (the measured contrasts in the same section are T2).

Status: COMPLETE.
