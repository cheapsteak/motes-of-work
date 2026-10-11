# Morph and scatter: the defective body's shell breathes, and leaps off and re-forms

*Status: design for review, with a reference analysis and a mock; **revision 2** (the author, on the
mock: "the lumpiness isn't quite right … there's some order to it, a pattern, like an expression of
some sort of equation"): §7 replaces §2.1's noise with a parametric equation on a lattice shell, with
the measured evidence. Date: 2026-10-07. Sits on the
galaxy design (docs/specs/2026-10-07-galaxy-orbits.md: §1.2 the bodies, §5 the derp, §12.3 the
burst) and the freeze frame (docs/specs/2026-10-07-freeze-frame.md). Adds two terms to the shell of
a cracked body at the close-ups: a standing **morph** of the sphere and a **scatter** derp. Nothing
here changes an orbit; the burst, skip, stall, reverse and wobble are as written.*

## 0. The author's ask, and what it decides

> For the close up, can the sphere shape itself morph a bit? Can you have a subagent analyze this
> video, particularly the first 2 seconds. It jumps and scatters particles is a really neat way

Still binding: phone first (390 × 844); the text above the picture; crisp and countable at every zoom;
no soft discs; every frame a pure function of (scroll, ambient); reduced motion honoured; the
GLSL/TS mirror; the far limits of galaxy §5.4 (a derp is invisible from the neighbourhood and the
galaxy); the burst's un-eased vocabulary (galaxy §12.3: hard cuts, held jitter, no ease-out).

Three decisions, argued below:

1. **Healthy bodies stay perfect spheres; only a cracked body's shell morphs** (§2.1). The morph is
   small (±0.035 R, two pixels on a phone at the close shot) and continuous on the ambient clock: a
   sphere that breathes beside one that does not is the tell, the way a stepped orbit beside a smooth
   one is the burst's.
2. **The scatter is a sixth derp kind, of the shell rather than the orbit** (§2.2): the shell's motes
   leap off in a sweep that crosses the body in 80 ms, hold off it for 120–180 ms with hashed jitter,
   and snap home in three hard cuts, landing on a *new* morph phase, so the body comes back a
   different shape. It is the reference's move transposed into the burst's grammar: square pulses,
   held jitter, no ease-out; only the settle ring after landing is eased, like the skip's.
3. **The freeze frame may catch the scatter mid-leap** (§3.3): the pin search gains a clause so the
   held frame shows the planet's motes off its limb while the satellite is off its track; the ×3
   copies, the limb and the ticks carry it unchanged. Reduced motion holds the same mid-scatter pose.

## 1. The reference, frame by frame

Stock footage, 640 × 360, 25 fps, 15 s: a 3D sphere of particles. Read only with ffmpeg and
ImageMagick; everything written to
`<scratchpad>/morph-ref/analysis/`:

| File | What it is |
|---|---|
| `frames/f001..f060.png` | every frame of the first 2.4 s |
| `sheet_00-29.png`, `sheet_30-59.png` | contact sheets of those, 6 × 5, labelled by frame |
| `diff/d001_002..d059_060.png`, `sheet_diff_01-30.png`, `sheet_diff_31-60.png` | consecutive-frame difference images (auto-levelled) and their sheets |
| `crop_10-19.png`, `crop_33-40.png`, `diffcrop_11-18.png` | the sphere at 2× across the first two events, frames and differences |
| `rest/s001..s015.png`, `sheet_rest_1fps.png` | one frame per second for the whole clip |
| `interp/`, `sheet_interp_0.40-0.80s_50fps.png` | **interpolated** (`minterpolate`, 50 fps) over the first event; it smears the hard cuts into tweens and was not relied on |
| `motion_energy_first60.txt` | mean absolute difference between consecutive frames (whole frame, %) |

Measured on the frames (centre (320, 180); the limb's mean radius **R = 129 px**, so the sphere is
0.72 of the frame's height; "bright" is grey > 90):

### 1.1 Calm (frames 1–12, 0–0.48 s)

- The shell is not a sphere: its limb is **scalloped**, with the outer radius per 5° bin running
  124–134 px, i.e. **±0.036 R**, in roughly **eight to twelve lumps** round the circumference (the
  angular wavelength is 30–45°, an arc of about **0.6 R**). The lumps are a low-frequency noise
  displacement of the whole shell, visible as a wavy limb and as moiré ridges across the face (the
  particles sit on a lat/long lattice, so the warp shows as bands).
- The lattice drifts: the whole frame differs 2.8–3.2 % from the one before at every frame, with
  no still frame anywhere in the clip. The sphere rotates slowly about a near-vertical axis (the
  ridges walk left to right by about a lump per second) and the noise field drifts with it, so the
  lumps change shape over seconds, not frames.
- Per-particle hue is fixed by height (cold at the top, warm at the bottom) and does not change
  during an event, which is what makes the scatter legible: top-coloured particles above the limb.

### 1.2 The first event (frames 13–18, 0.52–0.72 s), frame by frame

| Frame | t (s) | What happens |
|---|---|---|
| 12 | 0.48 | the calm shell; the upper-left limb is already faintly fuzzed (the first particles leave) |
| 13 | 0.52 | the upper-left and top loosen: a thin halo of particles 5–20 px outside the limb, sector counts N/NE/E up 10 % while S/SW/W are unchanged |
| 14 | 0.56 | the halo thickens on the top and right and the right-hand limb dissolves; the interior starts to fill with loose particles (the hollow is no longer dark) |
| 15 | 0.60 | **peak**: every sector is out; the halo reaches **~0.25 R past the limb** (bright-pixel bands: 1,373 → 2,277 px in the 130–150 px annulus, a handful at 150+), i.e. a few particles at 1.35 R; the limb is gone at the top and the bottom-left; the interior is a uniform cloud |
| 16 | 0.64 | the top has already re-formed a (new) limb; the bottom and lower-left are at their peak (S/SW/W sectors peak one to two frames after N/NE/E) |
| 17 | 0.68 | most particles are back on the shell; stragglers ring the bottom |
| 18–19 | 0.72–0.76 | re-formed: a crisp limb with **different lumps** from frame 12's, and the lattice at a different phase; the face has a looser, more random texture than before for a few frames before the ridges re-appear |

So the move is **a position-swept release and re-form**, not a radial pulse and not a shear:

- **Direction** per particle is mostly outward along the normal with a large random tangential part
  (the halo is fuzzy, not a scaled copy of the limb) and some particles go **inward** (the interior
  fills). No trails: every particle is a dot at a new place each frame.
- **Timing** is staggered **by position**, not random: the release crosses the body from the
  upper-left to the lower-right in about two frames (80 ms), and the return crosses it the same
  way about three frames later, so the top is re-forming while the bottom is still out. A single
  particle is out for roughly 100–160 ms.
- **Easing**: the departure is a cut (from on the shell to fully out between two frames, 40 ms);
  the return is quick but takes two or three frames with the particles converging, i.e. a short,
  stepped fall rather than a tween. The interpolated sheet turns both into tweens, which is exactly
  what the real frames do not show.
- **Amplitude**: most particles leave by 0.1–0.2 R, a few by 0.3–0.35 R; the silhouette goes from a
  crisp scalloped disc to a soft-edged cloud 1.25 R across and back in 240 ms.
- **The shape changes across the event**: the shell that re-forms has different lumps and a
  different lattice phase. The scatter is how the sphere *jumps between two shapes*: the morph
  does not tween from one to the other, it scatters and lands on the next.
- **What reads as neat**: (1) the cut, i.e. a thing that was a solid object is a cloud one frame
  later, with no anticipation; (2) the sweep, which gives the cloud a direction so it reads as a
  wave passing through the body rather than an explosion; (3) the stragglers, a thin ring of late
  particles that makes the re-form read as settling, not snapping; (4) the hue gradient kept per
  particle, so the eye can see which particles went where.

### 1.3 The rest of the first 2.4 s and the clip

- **Second event, frames 34–37 (1.36–1.48 s)**: the same move, smaller (annulus peak 1,064 px vs
  2,277), starting at the top and right, lower-left trailing by a frame.
- **Third, frames 55–57 (2.20–2.28 s)**: smaller again (930 px), top-first.
- Events are 0.85 s apart and shrink; between them the shell is calm with the noise drifting. The
  frames 26–32 difference in the far band is the background gradient moving, not particles.
- **Over 15 s** (`sheet_rest_1fps.png`): the sphere keeps its radius; the hue map turns round the
  sphere (warm at the top by 7 s, at the bottom by 10 s), i.e. the body rotates about a horizontal
  axis on a ~12 s period as well as drifting about the vertical; the shell alternates between a
  lattice look (crisp ridges, seconds 4–5, 9–11) and a scattered look (random dots, seconds 2–3,
  12–14); at 13–14 s the sphere is a thick hollow ring, a scatter that did not fully re-form. The
  noise frequency never changes (always 8–12 lumps); what changes is the amount of random
  per-particle offset, which is what the scatter leaves behind as it decays.

## 2. The design

Two terms, both on the shell motes of a body (galaxy §1.2) and both evaluated in the node vertex
shader from the mote's unit position `u`, its hashes and the ambient clock, with a TS twin:

```
shellWarp(u, h[6], t, ev, sweep, phaseOld, phaseNew) -> position in units of R
  = u * (1 + MORPH_AMP * morphN(u, t, phase) + ring(s))      // the morph and the settle ring
  + scatterDir(u, h) * scatterAmp(h) * k(s, u, sweep, h)      // the scatter (0 off-event)
  + jitter(h, floor(30 s)) * SCATTER_JITTER                   // held for 1/30 s while out
```

### 2.1 The morph: a standing breath of the cracked shell

**Superseded by §7 (revision 2).** The four-lobe sine noise below reads as lumps, not as a pattern;
the author saw order in the reference and §7 finds where it is (the lattice, and a product-of-sines
wave on it). Kept for the record of what was tried.

| Parameter | Value | Why |
|---|---|---|
| noise | four sine lobes `Σ w_k sin(f_k · (u · d_k) + φ_k + phase·(1 + 0.3 f_k/7) + ω_k t)`, `d_k` fixed unit directions | no texture, no gradient noise: a dozen `sin` per mote, identical on both sides of the mirror |
| frequencies `f_k` | 7, 11, 16, 23 rad per R (wavelengths 0.9, 0.57, 0.39, 0.27 R) with weights 0.50, 0.30, 0.15, 0.05 | the reference's 8–12 lumps round the limb come from the 7 and 11 terms; 16 and 23 add the ridging at 1–2 px |
| amplitude `MORPH_AMP` | **0.035 R** on a cracked body; **0 on a healthy one** | ±0.036 R measured; at the close shot (planet 116 px across on a phone) it is ±2 px, enough to see "if you watch" and a limb that is not a circle; invisible below the close shots (§3.2) |
| drift `ω_k` | +0.35, −0.55, +0.80, −1.30 rad/s | the lumps change over 5–15 s, as in the clip; opposite signs so the field never looks like it slides |
| phase | an integer count of the body's scatters so far, hashed into each lobe | the shape **jumps at each scatter** (§2.2); between scatters it only drifts |
| the body mesh | the instanced icosphere's vertices take the same `morphN` (and the ring), not the scatter | the rim follows the lumpy limb; the fill dims by 50 % while the shell is out, so the body "loses substance" instead of a rim sitting inside a cloud |
| moons | 36-mote shells get the morph at 0.05 R (a 3–12 px dot wobbles by under a pixel) | they inherit the term but it never reads; the scatter is what reads on a moon |

Healthy bodies get `MORPH_AMP = 0`: the contrast is the tell, and a perfect sphere beside a breathing
one says "this one is wrong" without an ember or a label. (The alternative, every planet breathing
at 0.015 R and the cracked one at 0.05 R, is a two-constant change; it loses the tell and gains
nothing the orbits' precession does not already give the picture. Not recommended.)

### 2.2 The scatter: a derp of the shell

A sixth kind on the derp schedule (galaxy §5.2: slot `T` 2.2 s, event `D` 1.0 s, `t0` hashed in the
slot). Weights become **burst 0.30, scatter 0.25, skip 0.20, stall 0.10, reverse 0.075, wobble
0.075**, so at the close-up a reader parked two seconds has a 0.9 chance of some event and a 0.25
chance it is a scatter; a planet's scatter is the one a close shot is most likely to be framing
after a burst. Inside its event, seconds from `t0`:

| Term | Value | Bound |
|---|---|---|
| **sweep** | a hashed unit direction per event; a mote with `su = u · sweep` leaves at `t_dep = 0.04 (su + 1)` s: the release crosses the body in **80 ms** | |
| **departure** | a cut: `k` goes 0 → 1 at `t_dep`, no anticipation, no ease | |
| **hold** | the mote stays out `0.12 + 0.06 h4` s (120–180 ms), with **jitter** `0.03 R` hashed per mote per 1/30 s and cut to the next (the burst's jitter) | 0.03 R |
| **return** | three hard cuts 50 ms apart: `k` = 1 → 0.55 → 0.25 → 0 (stepped, 100 ms), so the re-form reads as converging stragglers, not a tween and not a snap | |
| **direction** | `normalize(u · inward · (0.35 + 0.65 h0) + 0.9 (h1..3 − 0.5))`, `inward` = −0.6 for 22 % of the motes, else 1 | mostly out along the normal, a wide tangential fuzz, a fifth inward so the hollow fills |
| **amplitude** | `R (0.12 + 0.28 h5²)`: most motes 0.12–0.2 R, a few to 0.40 R | **≤ 0.40 R**, under the skip's 0.45 bound, so galaxy §5.4's far limits hold |
| **the shape jump** | a mote that has landed samples the morph at `phase + 1`; one that has not, at `phase` | the new shape appears in sweep order, as in the reference |
| **settle ring** | after a mote lands, radial `0.06 R · e^{−a/0.16} cos(2π · 6 a)`, `a` seconds since landing | eased, like the skip's ring; the one eased term |
| **aftershock** | at 550 ms, with probability 0.5 per event, the same sweep at 0.45 amplitude, hold only (no second shape jump) | the clip's shrinking repeats |
| **brightness** | a mote out of the shell draws at `1 + 0.6 k` gain | the halo reads on a phone; no extra instances |
| **ghost** | none; the scatter has no double | it is the shell itself, not a copy |

Everything is `hash01(seed, k · 64 + j)` per event and `hash01(seed, i · 8 + j)` per mote: a pure
function of (ambient, seed), replayable and frozen in tests. The whole event is over by 0.36 s (0.8 s
with the aftershock) inside the 1.0 s `D`, so the scatter fits the schedule's duty and gap unchanged.

**Un-eased, like the burst.** The departure, the hold's jitter and the three-step return are cuts; a
mote is never between two positions. The ring is the exception the skip already has, and it rides the
shell's radius, not the mote's leap. A healthy body draws no event: its shell is a sphere at every
frame, and the pair in the close view (galaxy §12.3's last paragraph) gains a second contrast: the
left planet is round and still; the right one breathes, and once in a while comes apart and
reassembles as a different lump.

**Bursts may puff.** Optional, one constant: a burst slot with `h6 < 0.3` also drives `k` = 1 for its
first 60 % (no sweep, amplitude 0.15 R), so the shell flickers off and on with the snaps. Off by
default; try it on the mock's pair before deciding.

### 2.3 Which bodies

| Body | Morph | Scatter | Reads at |
|---|---|---|---|
| hero planet at a close-up (6,000 motes) | 0.035 R | full | the close shots: this is where the author asked for it |
| other cracked planets (300 motes) | 0.035 R | full | the system shot (`P1`–`P3` lit, df-5): a 300-mote cloud 15 px across coming apart |
| cracked moons (36 motes) | 0.05 R, invisible | full, amplitude capped 0.30 R | the close-ups: a 6 px dot bursts into a 10 px puff and re-forms |
| cracked stars (700 motes) | 0.02 R | full, the shiver's 4× rule does **not** apply | tr-2's close on `R0`: the star comes apart and re-forms as it shivers |
| healthy anything | 0 | none | perfect spheres, as now |

## 3. How it fits

### 3.1 The derp, inherited and fixed

The scatter is drawn from the source's seed with the body's phase like every kind (galaxy §5.3), so a
moon, its planet and their star scatter in the same order. The fix multiplies both terms by `v`
(galaxy §5.5): as the warm motes land, the shell's lumps flatten and no event is drawn, and the body
is a sphere from then on, which is a quieter picture of "the orbit settles" than a settled orbit
alone. The morph's phase counter stops with `v` = 0.

### 3.2 LOD and far-invisibility

Both terms are multiplied by the moons' ramp `smoothstep(60, 120, s_px)` (galaxy §3.1, §12.2), so
they are exactly zero wherever the far test runs. Arithmetic: at the neighbourhood (`s_px` ≈ 55,
5.7 px per unit) a planet's full scatter (0.4 × 0.3 units) would be 0.7 px and the morph 0.06 px;
the ramp makes both 0. At `s_px` 70 (the ramp's foot) the scatter is at 0.25 gain and 0.5 px: under
the "≤ 20 px at 70" allowance. At the close shot (`s_px` ≥ 400) the planet is 116 px across, the morph
±2 px, the scatter's halo out to 23 px from the limb, and the far limits are the galaxy's unchanged.

### 3.3 The freeze frame

- **The pin may catch the scatter mid-leap.** `schedule.ts`'s search (freeze §1.2) gains a clause:
  the first slot `k ≥ 1` where `C1`'s kind is skip, its home faces the camera, **and** `P1`'s event at
  `t0(k) + 0.6 D` is a scatter at local `s` ∈ [0.10, 0.20] (every mote out, none home: the sweep is
  done at 0.08 and the first returns start at 0.12). Both schedules are hashed, so the expected
  search length is ~1/(0.25 · 0.45 · 0.1 / 1.0) ≈ 90 slots, 200 s of ambient; still a constant. If
  the search passes 2,000 slots it falls back to the skip-only pin and `FREEZE_SCATTER_S = 0.16` is
  forced on the hero planet during the hold (the renderer already forces `uSysPx` on the held system,
  galaxy §7.4; this is the same kind of override). The fence test asserts which path was taken.
- **The dressing carries it.** The ×3 copies are the same instances, so the cold and warm copies are
  scattered clouds offset ±3 px: a comic panel of a body coming apart. The limb term keys on `n · v`,
  which a scattered mote keeps, so the ink lands on the motes that would have been the limb, now
  flung 10–20 px out: a broken ink line, which reads. The ticks are round the satellite and unchanged.
  The flash catches the cloud. The twos breath moves the cloud ±0.6 px like everything else.
- **The fix on the held frame**: `v` → 0 over 0.39–0.41 brings every scattered mote home along its
  own leap (k × v) and flattens the lumps, inside the held frame, as the satellite slides home.
- **The release** resumes the ambient clock; the scatter's remaining 0.2 s plays out if `v` were still
  1, but it is 0, so the shell is a sphere at the release. Nothing to re-time.

### 3.4 Two clocks, tests, reduced motion

- Both terms read `uAmbient` only; `?ambient=` freezes them; the freeze folds its pin in; a frame is a
  pure function of (scroll, ambient) as before.
- **Reduced motion** (`AMBIENT_POSE`): chosen so the hero planet is at a scatter's `s` = 0.16 and the
  defect moon at a skip's peak (one constant satisfies both by the same search as the pin): the
  reduced-motion reader sees a lumpy sphere coming apart beside round ones. The mock's **reduced
  motion** button shows the pose.
- **Mirror**: `shellWarp` in `node.glsl` and `node.ts` (`?lib=shell` parity over a grid of `u`, hashes,
  `s` ∈ {−1, 0, 0.03, 0.08, 0.15, 0.2, 0.26, 0.31, 0.4, 0.6, 0.9} and both phases). The mock carries the
  pair: its readout prints the JS twin's largest `|r − R|` over 300 sampled motes next to what the GLSL
  draws (0.034 R calm, 0.36–0.40 R at the peak, 0.10 R in the ring).

### 3.5 Phone cost

No new instances: the scatter displaces the shell motes that already exist, and the morph is on the
same motes and the body mesh's 320 triangles. Per mote per frame: four `sin` for the morph, a `dot`,
six comparisons and three `fract(sin)` for the scatter, i.e. under 40 ALU ops on at most two systems'
shells (galaxy §3.3; ≤ 2 × (6,000 + 5 × 300 + 30 × 36) ≈ 17k motes), and during the freeze's hold
×3 copies of one hero (18k). The icosphere's morph is 320 vertices. Nothing in the fragment stage
changes. The mock's 12,000 motes draw at the browser's refresh rate on hardware; the headless
software renderer used for the captures ran at 20–30 fps, which says nothing about a phone.

## 4. The mock

`<scratchpad>/morph-mock/`:

- **`morph.html`** (+ `three.module.js`, `three.core.js`, `literata-400.woff` beside it, relative; no
  document wrapper; served over http; no query string): a healthy sphere beside the defective one at
  390 × 844 under the house text band, 6,000 motes each plus the rim icosphere; the derp schedule on a
  wall-time ambient clock with the scatter as the mock's only kind. Buttons: **play / pause / slow
  ×0.2**, **scatter now** (jumps the clock to 50 ms before the next scatter), **freeze mid-scatter**
  (holds at `s` = 0.16), **reduced motion** (the held pose); toggles **morph / scatter / settle ring /
  morph on healthy too**. The readout gives the ambient time, the event phase, the JS mirror's largest
  displacement and the morph phase. `window.mock.setAmbient(t)` is for capture scripts.
- **`scatter-strip.png`**: ten phone frames across one event: calm, `s` = 0.02, 0.05, 0.09 (the sweep
  crossing), 0.16 (the peak; the freeze and reduced-motion pose), 0.24, 0.31 (the stepped return,
  stragglers), 0.45 (the ring), 0.60 (the aftershock), 0.90 (calm, new shape).
- **`scatter-crops.png`**: the two bodies at 2× at calm (the right limb is lumpy, the left a circle),
  0.05 s, 0.16 s and 0.31 s; `crop-*.png` the singles, `shots/*.png` the full frames.

What it is: the `shellWarp` pair (GLSL and JS) as specified, the sweep, the hold, the stepped return,
the shape jump, the ring, the aftershock, the rim mesh dimming. What it is not: the orbit derps, the
moons and tracks, the freeze's dressing, the node texture, the LOD ramp.

## 5. Tests

| Test | What it checks |
|---|---|
| **Parity** (`parity.spec.ts`, `?lib=shell`) | `shellWarp` GLSL vs TS over the grid of §3.4 to 1e-5 R; the node cases add "close, `P1` at scatter 0.16" and "close, `P1` at 0.31". |
| **Bounds** (`shell.test.ts`) | over 10⁵ (mote, event) samples: `|p − u| ≤ 0.40 R + 0.03 R` always; `|r − R| ≤ MORPH_AMP + RING_AMP` off-event; healthy seeds give `p = u` exactly. |
| **Sweep order** | at `s` = 0.04 the motes with `su > 0` are all home and ≥ 95 % of those with `su < −0.2` are out; at `s` = 0.16 all are out; at `s` = 0.36 all are home. |
| **Shape jump** | `morphN` at phase `n` and `n + 1` differ in RMS by ≥ 0.5 of the amplitude; the mesh's and the shell's limb agree at every phase. |
| **Derp far / near** (galaxy §5.4, re-pinned) | zero diff at `s_px` 50 and ≤ 20 px at 70 with a scatter at its peak forced on the sampled planet; near: ≥ 400 px (phone) of difference inside a 1.4 R rectangle at the close shot between `s` = −0.1 and 0.16. |
| **The pin fence** (freeze §3.3) | the pinned instant has `C1` at skip 0.6 D, home facing the camera, and `P1` at scatter `s` ∈ [0.10, 0.20] or the forced fallback, named. |
| **Freeze carries it** (`network.spec.ts`) | at defect 0.33 the hero's lit pixels outside the body's 1.05 R disc number ≥ 400 (phone); the split and limb tests of freeze §4 pass on the scattered frame (limb annulus ≥ 2.4× is re-measured on the un-scattered 70 % of motes: the test masks motes with `k` > 0 using the TS twin). |
| **Reduced motion** | the `AMBIENT_POSE` frame shows `P1` at scatter `s` = 0.16: same lit-pixels test as above with the clock stopped. |
| **Budget** | instance counts unchanged from galaxy §3.4; frame time on the test browser within the existing bound. |
| **Purity** | the defect samples of freeze §4 are byte-equal by jump, scroll, and scroll-past-and-back with the scatter in frame. |

## 6. Task note

One task after the galaxy revision's Task 2 (the derp mirror pair) and before its Task 3's shells
land: **`shellWarp` in the mirror pair with the parity mode and the bounds test** (half a day, pure),
then **the lattice shell, the shell and body vertex shaders reading it, the LOD gate, the kind
weights, the fix's `v`** (half a day), then **the pin search clause, `AMBIENT_POSE`, the re-pinned
far/near and freeze tests** (half a day). Judge the amplitude and the sweep on the mock's pair at
slow ×0.2 before touching the renderer; the numbers most likely to move are `EQ_A` (0.02; 0.03 is
louder, 0.012 is a rumour), the `EQ_P` set (§7.2) and the hold (120–180 ms; shorter reads as a
flicker, longer as an explosion).

## 7. Revision 2: the equation

### 7.1 What the author saw, and where the order is

The author's note on the revision-1 mock: the lumpiness "feels mathematical, there's some order to
it, a pattern, like an expression of some sort of equation." Revision 1 fit the *silhouette*
(±0.04 R of scallop) with a four-lobe sine noise; the result is lumps, and lumps are what noise
makes. A second, closer study of the reference (`…/morph-ref/analysis/eq/`) finds the order in two
places the silhouette fit could not see:

1. **The particles sit on a lattice, not at random.** At 5× (`f005-interior-5x.png`,
   `s009-interior-5x.png`) the dots run in **rows**: parallel lines of dots, 2.3–3.3 px apart along
   a row (the 2D spectrum of an interior patch, `f005-fft.png` / `fftlow-sheet.png`, has its only
   peaks at λ = 2.2–3.5 px, the dot pitch, in four directions), the rows 5–10 px apart (λ = 10.3 px
   in the centre patch). When the sphere turns a pole toward the camera (9 s, `s009-3x.png`) the
   rows become **concentric arcs round the pole**: a latitude/longitude grid. The displacement
   field bends these rows into regular waves, so a smooth field that would read as blobs on a
   random shell reads as **contour lines** on a lattice: the fingerprint look. This is most of the
   "equation".
2. **The displacement is a smooth wave with a band of wavelengths, no n-fold symmetry.** Limb radius
   vs angle for eight calm frames across the clip, centre-corrected and adaptively thresholded
   (`limbfit-sheet.png`: white = measured limb, magenta = its four largest harmonics;
   `spectra-sheet.png`: harmonics k = 2..40 per frame; `limb-strips.png`: the unwrapped deviation
   per frame; `depolar-sheet.png`: the polar unwrap of the frame itself):

   | Frame | t (s) | Limb ±R | rms R | Tallest harmonics (k: amplitude R) | Σ k2–9 / k10–25 / k26–40 (R) |
   |---|---|---|---|---|---|
   | f005 | 0.20 | 0.021 | 0.0086 | 17: 0.0038, 10: 0.0032, 18: 0.0032, 12: 0.0030 | 0.011 / 0.033 / 0.017 |
   | f012 | 0.48 | 0.023 | 0.0087 | 17: 0.0056, 2: 0.0049, 3: 0.0029 | 0.016 / 0.029 / 0.015 |
   | f022 | 0.88 | 0.025 | 0.0098 | 19: 0.0054, 20: 0.0048, 6: 0.0045 | 0.019 / 0.032 / 0.015 |
   | s004 | 4 | 0.025 | 0.0098 | 11: 0.0058, 10: 0.0043, 8: 0.0043, 16: 0.0034 | 0.021 / 0.029 / 0.017 |
   | s005 | 5 | 0.024 | 0.0092 | 5: 0.0039, 12: 0.0038, 3: 0.0035, 11: 0.0032 | 0.014 / 0.033 / 0.017 |
   | s009 | 9 | 0.017 | 0.0072 | 3: 0.0033, 2: 0.0033, 25: 0.0026 | 0.015 / 0.021 / 0.013 |
   | s011 | 11 | 0.039 | 0.0120 | 2: 0.0063, 9: 0.0038, 37: 0.0037 | 0.024 / 0.028 / 0.034 |
   | s015 | 15 | 0.026 | 0.0102 | 8: 0.0050, 4: 0.0048, 23: 0.0039 | 0.019 / 0.031 / 0.040 |

   (Frames 45 and 60 are excluded: a background highlight crosses the limb there and corrupts the
   profile. Revision 1's ±0.036–0.04 R was measured with a fixed centre; the k = 1 term was the
   centre, 3 px off.) Reading: the limb's scallop is **±0.02–0.025 R**, rms 0.009 R; its energy
   sits in a **band k = 10–25** (wavelengths 0.25–0.6 R along the limb), with the tallest single
   line at **k = 17–20 in the first second** and at **k = 10–12 at 4–5 s**; no line is ever above
   0.006 R, so there is **no n-fold symmetry** to fit (a superformula or a single harmonic would put
   most of the energy in one line). The lobes are rounded (the magenta fits sit on the white limb
   with no cusps), i.e. sinusoidal, not superformula-sharp.
3. **Rotation, not re-rolling, between events.** Cross-correlating consecutive limb profiles
   (revision 1's run) gives 0.95 at a 5° shift over 4 frames and 0.88 at 8° over 7 frames: the
   scallop **slides round the limb at ~1°/frame (≈ 28°/s)** and keeps its shape; across the first
   scatter (f012 → f022) the correlation is still 0.79 at 8°, so **a scatter does not re-roll the
   field**: the shape after it is mostly the shape before it, turned. The 1 fps sheet shows the hue
   map (fixed per particle) turning round the sphere on a ~12 s period: the lattice spins about a
   tilted axis, and the pole comes into view. The lobe count's drift from 17–20 to 10–12 over the
   first five seconds is the one parameter change in the clip and cannot be pinned to an event;
   it is as consistent with the spin bringing a different part of the field to the limb.

So the reference is **a UV-lattice sphere, spinning, displaced by a smooth wave of modest amplitude
whose rows make it legible**; the "equation" the author sees is the lattice reading the wave.

### 7.2 The equation

On the lattice's own coordinates (lat, lon), with `lat' = lat + π/2` so the wave vanishes at the
poles and the rows there stay clean:

```
r(lat, lon, t) = 1 + A · [ sin(p·lon + φ1 + ω1 t) · sin(q·lat' + φ2 + ω2 t)
                         + 0.45 · sin(p2·lon + φ3 − ω3 t) · sin(q2·lat' + φ4) ]
```

As built, the bracket is multiplied by `cos(lat)` (= `sin(lat')`): the phases φ2 + ω2 t and φ4 inside the latitude sines keep them from vanishing at the poles, so the envelope is what makes the wave zero there.

| Parameter | Value | Why |
|---|---|---|
| `A` | **0.02 R** | the limb at ±0.02–0.03 R (measured ±0.021–0.025); ±1.7 px on a 116 px planet |
| `p` | one of **{12, 14, 16, 18, 20}** per shape | lobes round a parallel: the limb's k = 17–20 early, 10–12 later |
| `q` | **p/2 + {−1, 0, +1}** | half-waves pole to pole, so the bumps are as wide along a meridian as along a parallel (lat spans π, lon 2π) |
| `p2`, `q2` | **p + 3..7**, **q − 1..3** (≥ 3) | a second, weaker product at 0.45 breaks the checkerboard's perfect tiling into the reference's band of wavelengths |
| `φ1..φ4` | hashed per shape | |
| `ω1, ω2, ω3` | **0.35, −0.22, 0.5 rad/s** | the wave walks along the rows between events (the reference's 28°/s is the spin plus this; the spin carries most of it) |
| spin | the lattice turns about a **seeded axis 25–40° off the vertical, once in 14 s** | the reference's ~12 s hue turn; the pole comes into view and the rows become arcs |
| the lattice | **60 rows**, columns per row `round(160 cos lat)` (≥ 6), odd rows offset half a step: **6,116 motes** for the hero shell | the rows are the pattern's reader; 300-mote planets use 14 rows × 36 and 36-mote moons 5 × 10 |
| healthy bodies | the same lattice, the same spin, `A = 0` | a perfect sphere of rows: the moiré of a lattice sphere is itself orderly, and the cracked body's wave is what bends it |

**Shape steps at each scatter.** A shape is `shapeAt(seed, n)` for the body's n-th scatter: `p`, `q`,
`p2`, `q2` and the four phases are hashed from `(seed, n)`; a mote samples shape `n` until it lands in
scatter `n + 1`, then shape `n + 1`, so the new shape appears in sweep order and the body comes back
with a different lobe count (`shapes.png`: shapes 1, 2 and 3 of the mock's defect, p = 12, 12, 16).
This is **the design's choice, not the reference's**: §7.1 (3) finds the reference keeps its field
across a scatter and only turns. The scatter as the way the body jumps between shapes is what the
author liked in revision 1, and the parameter step is what makes the shell "a different equation"
afterwards rather than the same one turned; if the author prefers the reference's continuity, the step
is one constant (`shapeAt(seed, 0)` for every n) and the ω drift alone carries the change.

**What stays from revision 1.** §2.2's scatter, unchanged, now on the lattice (`scatter-crops.png`,
`scatter-strip.png`): the sweep, the hold with jitter, the three-cut return, the ring, the aftershock;
§2.3's bodies; §3's LOD gate (`A` and the scatter both multiplied by the moons' ramp), inheritance,
the fix's `v` (which also stops the shape counter and takes `A` to 0, so a fixed body is a perfect
lattice sphere, spinning); the freeze pin clause and the mid-scatter reduced-motion pose; the mirror
(`shellWarp` now takes the mote's `(lat, lon)` as an attribute `aLL` and the shape as two `vec4`
uniforms per body: `uShapeOld/New = (p, q, φ1, φ2)`, `uShape2Old/New = (p2, q2, φ3, φ4)`; the body
mesh evaluates the same equation from its vertex's `(asin y, atan2 z x)`); the cost (four `sin`,
one `rotAxis`, no new instances; the lattice replaces random sampling at the same count).

### 7.3 Mock, revision 2

Same page, `…/morph-mock/morph.html`: both bodies are lattice shells; the defect carries the equation
and the scatter; **spin** toggles the lattice's turn; **step the shape** advances the defect's shape
without a scatter (to compare shapes side by side); the readout prints the equation with the
**current and next shape's parameters** (`p q φ1 φ2 · p2 q2 φ3 φ4`), the shape index, the spin axis,
the event phase and the JS mirror's largest displacement (0.026–0.028 R calm, 0.37–0.40 R at the
scatter's peak). Verified at 390 × 844 (Chromium headless, 2×):

- `shapes.png` — calm at shape 1 (p = 12), after the next scatter at shape 2 (p = 12, q = 5), stepped
  to shape 3 (p = 16), and **morph on healthy too** (the toggle: both bodies under the equation).
- `defect-calm-4x.png`, `healthy-calm-4x.png` — the two shells at 4×: rows bent by the wave with a
  12-lobed scalloped limb beside a perfect lattice sphere, both turned so a pole is in view.
- `scatter-crops.png`, `scatter-strip.png`, `crop-*.png`, `shots/*.png` — the scatter on the lattice
  at calm, 0.05, 0.16, 0.31 s and the ten-frame strip; `reduced.png` the held pose.

Tests (§5) gain: **shape step** (a mote's shape index before and after landing differs by exactly 1;
the limb's dominant harmonic equals `p` when the spin axis faces the camera, to within the second
term) and **lattice** (row count and per-row column counts are a pure function of the tier; the
healthy shell's motes lie on the unit sphere to 1e-6 at every ambient).
