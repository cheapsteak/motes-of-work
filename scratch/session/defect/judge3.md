# Judge 3: verdict on the 18 defect variants

Evidence used: `review.html` measures and every `strips/<id>/sheet.png` (re-tiled at 250 px so the
9-16 px effects could be seen), plus my own close-up sequences from `inspector.html` at zoom 1.5
(Playwright, swiftshader) for the cases the strips could not settle: arrhythmia and C1 at 0.35, spasm
at 0.35 and 1.0 around its onsets, stutter and C2 at 0.35 and 1.0, leak and tear at 0.35, lumps at 1.0.

Scores are 1-5 (5 best) on: (a) unhealthy, not soothing; (b) the essay's register (dots, restrained,
a defect in code); (c) readable at intensity 0.35, "if you watch"; (d) not gimmicky, not tiring over
several seconds; (e) feasible as a pure function of time in a vertex shader with a TS twin;
(f) photosensitivity safety. Σ is the plain sum (max 30).

| # | Variant | a | b | c | d | e | f | Σ | Note |
|---|---|---|---|---|---|---|---|---|---|
| 0 | Today | 1 | 3 | 3 | 3 | 5 | 2 | 17 | Soothing by design. The ONLY variant with a big brightness swing (60 %, 2 flips/s from the x1.6 flung-dot gain). |
| 1 | Arrhythmia | 4 | 4 | 1 | 4 | 5 | 5 | 23 | Near-invisible at 0.35 in my captures (a 1-2 frame ~5 % swell); at 1.0 a 2-frame fuzz. Great rhythm, too small a gesture. |
| 2 | Stutter | 3 | 2 | 2 | 3 | 5 | 5 | 20 | The hold/lurch is a timing effect (unverifiable in stills, ~4 px lurch at the limb); what you actually see is a permanently scalloped shell (0.045 R wave, wScale 3) even at 0.35. |
| 3 | Spasm and slump | 4 | 3 | 3 | 3 | 5 | 5 | 23 | Clench is invisible when its hashed axis points at the camera (verified at t = 4.567, I = 1); when it lands it reads as a fuzz pop like a mini Today scatter. Slump barely reads. |
| 4 | Lumps | 2 | 3 | 2 | 3 | 3 | 5 | 18 | Slow noise, slight egg; soothing-adjacent. `lurchSum` loops over every cell since t = 0 (O(t)) and needs a rework for a shader. |
| 5 | Leaking | 4 | 5 | 4 | 4 | 5 | 5 | 27 | Reads at 0.35 (a spray of dimmed dots off the limb), perfect sphere elsewhere, snap-home is the erratic beat. Organic, not glitch. |
| 6 | Desync | 3 | 2 | 3 | 2 | 5 | 5 | 20 | 100 % changing, no event, no rest: the rows dissolve into a shimmer that is its own kind of soothing, and tiring. |
| 7 | Tremor | 3 | 3 | 3 | 2 | 5 | 5 | 21 | 24 Hz held jitter never stops: a vibration you cannot look at for long. Surges help. |
| 8 | G1 Colour split | 2 | 2 | 2 | 3 | 4 | 4 | 17 | Rim disc splits into saturated R/G/B: green and yellow are off the blue/ember palette. 4.6 px at 0.35 barely reads. Needs 3 draw passes. |
| 9 | G2 Slice tear | 4 | 4 | 4 | 4 | 5 | 5 | 26 | Reads at 0.35 (verified), breaks the silhouette, half the bands static, 0 luminance swing. The signature move, and the cheapest (24 band uniforms). |
| 10 | G3 Block snap | 3 | 1 | 2 | 1 | 4 | 3 | 14 | The 3 R box, moons and tracks included, becomes a dim coarse grid: a different object, not a sick planet. Visible dimming that the dot-gain flash guard does not measure. |
| 11 | G4 Frame hold | 2 | 4 | 2 | 4 | 4 | 5 | 21 | On a bare spin the seam is a quiet dark line. Fine ingredient, nothing alone. |
| 12 | G5 Dropout lines | 3 | 4 | 3 | 4 | 5 | 4 | 23 | Black scanlines; removes light. 15 % swing, 1 flip/s at 1.0. Reads as a CRT dropout. Good ingredient. |
| 13 | G6 Burst | 4 | 1 | 1 | 1 | 4 | 3 | 14 | 2 onsets in 20 s at 0.35 (not "if you watch"); at 1.0 a 6-10 frame pile of snap + RGB + tear re-rolled every 2 frames, 15 % swing. The gimmick. |
| 14 | C1 Arrhythmia + tear | 5 | 4 | 4 | 4 | 5 | 5 | 27 | The tear carries the beat's irregular timing (skips, doubles, hard compensations): verified legible at 0.35. Only flaw: the hard-beat split goes full RGB. |
| 15 | C2 Stutter + hold + split | 4 | 3 | 3 | 3 | 4 | 5 | 22 | The hold seam with halves disagreeing is the best "broken video" idea here, but it sits on the scalloped stutter shell and an RGB split. |
| 16 | C3 Spasm + burst | 4 | 1 | 2 | 1 | 4 | 3 | 15 | The snap mosaic dominates every clench; 19 % swing. |
| 17 | C4 Tremor + leak + dropout | 4 | 3 | 3 | 2 | 5 | 4 | 21 | "Nothing is ever right" is a valid sickness, but 96-99 % changing is tiring over several seconds. |

Photosensitivity across the board: every variant is at or under 2 luminance flips/s on a disc that is
under 10 % of a phone viewport, so all are inside the 3-flashes/s guidance. Two cautions: Today has
the largest swing (60 %), and the flash guard sums dot gains rather than rendered pixels, so the
visible dimming of the block snap / burst mosaic (dots collapsed onto grid nodes) is unmeasured.

## Top 3

### 1. v14 C1 Arrhythmia + tear (with three tweaks)

Why: it is the only variant where the glitch has a reason. The tear fires on the heartbeat, so its
timing is near-regular with misses, which reads as sickness rather than as a random effect; the
tear is the one kit move that survives 0.35 (verified in my captures: three-frame band tears at the
limb), it has zero luminance swing, and it is restrained (23 % of frames changing). It is a planet
that works until it doesn't.

Tweaks, precisely:
- Split: replace the R/G/B copies with the essay's own two-copy convention from the freeze frame
  (one cold `#4DA3FF` copy, one warm `#FF6B57` copy, offset ±(3-8 px)·amp, no green). If that is
  more than a day's work, drop the split from C1 entirely; the tear alone carries it.
- Arrhythmia amplitude so the beat itself reads between tears at 0.35: raise `a` from
  `0.075 * ampOf(I)` to `0.11 * ampOf(I)`, and give `beatProfile` a 2-frame plateau at the peak
  (rise 0-45 ms, hold to 110 ms, then the ringing fall) so a 30 fps display shows the thump.
- Keep the tear at 2-3 frames and its "about half the bands stay put" rule; do not raise the tear's
  band offsets above 28 px·amp (the planet is 96 px: more than that and it stops reading as a tear
  and starts reading as a scatter).

### 2. v09 G2 Slice tear, as built

Why: the safe ship. Legible at 0.35, legibly glitch-game, survives the phone crop, breaks the silhouette
without changing brightness, and the cheapest to port (the 24 bands are a uniform array computed from
`hash01` of the event key; the dot's clip-space y picks a band, x adds the offset; the rim shader
gets the same uniforms). Its weakness is that between tears the planet is perfectly healthy, so there
is no "body" to the sickness, only a rendering fault. For "a defect in code" that is arguably the
honest reading. Optional: raise `p[0]` from 0.22 to 0.30 so the first tear lands within about 2 s of
"if you watch" at 0.35.

### 3. v15 C2 Stutter + hold + split (with the shell tamed)

Why: the frame hold, where half the planet freezes in its own past along a hashed line and the
halves disagree, is the most "broken video" idea in the set and the least gimmicky glitch (no colour,
no brightness change, one seam). Ranked third, not higher, because its legibility is a timing effect
I could not verify in stills, and because as built the stutter's drifting wave scallops the shell at
all intensities, which turns the planet into a different object (a raspberry) rather than a sick
copy of the healthy one beside it.

Tweaks, precisely:
- Stutter wave `a`: `0.045 * ampOf(I)` down to `0.015 * ampOf(I)`; keep `wScale = 3` so the hold is
  still visible as a frozen ripple.
- Split: same two-colour change as in C1, or drop it and let the hold seam and the lurch carry it.
- Lurch: raise the overshoot from `0.35 * hd.d` to `0.6 * hd.d` so the two-frame catch-up moves the
  limb ~7 px instead of ~4 at a 14 s spin.

Honourable mention: v05 Leaking is the best non-glitch answer (27 points, ties C1 on my sheet). If the
author cools on the glitch-game direction, ship Leaking as built; it is in the essay's own language
(motes leaving a lattice), reads at 0.35, and has no flashes.

Two defects in the prototypes worth fixing whichever way this goes: the spasm's clench axis should be
chosen in the screen plane (as built it is a hashed 3D axis and the clench vanishes when it points at
the camera), and lumps' `lurchSum` is O(t) and cannot be a vertex-shader function as written.

## The one thing I'd warn against

Do not ship the block snap or anything that stacks it (G3, G6 Burst, C3). Collapsing the planet,
its moons and their tracks onto a dim screen grid replaces the object instead of sickening it, it is
the only family that visibly dims the body (a swing the flash guard cannot see, re-rolled every two
frames for 6-10 frames), and it is the one thing here a reader would call a gimmick. The author's
"skitzo" is the arrhythmia's missed beat, not a pixel-mosaic transition.
