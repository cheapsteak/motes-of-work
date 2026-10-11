# Judge 1 verdict: the defect effect

Evidence used: `review.html` measures, every `strips/<id>/sheet.png` (re-montaged at 240 px per frame), consecutive-frame difference images for Arrhythmia, Stutter, Spasm and Frame hold, the 18 freeze-frame crops at I = 1.0, and my own Playwright close-ups (zoom 1.5, 1/30 s, I = 0.35) of Arrhythmia, Spasm (1/15 s over 1 s), Slice tear, Dropout, C1 and C2.

Scores 1-5 per criterion: (a) unhealthy not soothing, (b) essay register, (c) readable at I = 0.35 "if you watch", (d) not gimmicky / not tiring, (e) vertex-shader + TS-twin feasibility, (f) photosensitivity.

| # | Variant | a | b | c | d | e | f | Sum | Note |
|---|---|---|---|---|---|---|---|---|---|
| 0 | Today | 1 | 4 | 3 | 3 | 4 | 2 | 17 | Regular 2.2 s slot, symmetric; worst flash number in the set (2/s, 60 % luminance swing from the x1.6 flung dots). |
| 1 | Arrhythmia | 3 | 4 | 2 | 4 | 5 | 5 | 23 | At 0.35 the beat is a 9 px swell that reads like the old breathing; a 65 bpm pulse is itself a calming rhythm. The misses are the sickness but a miss is an absence, invisible on its own. |
| 2 | Stutter | 4 | 3 | 4 | 3 | 4 | 5 | 23 | Diffs prove clean holds (frame diff ~1) and lurches (~107 vs ~80 spin baseline). But the "faster drifting wave" added to make the clock visible keeps the shell a cauliflower at all times, at both intensities. |
| 3 | Spasm and slump | 4 | 4 | 3 | 4 | 4 | 5 | 24 | Two-frame scramble, then a half-second sag that visibly widens the bottom. The best body language in the set; no glitch vocabulary on its own. |
| 4 | Lumps | 3 | 3 | 3 | 3 | 5 | 5 | 22 | A slow potato. Tumour-like but slow noise is soothing; only the cave lurch is erratic. |
| 5 | Leaking | 2 | 5 | 3 | 4 | 4 | 5 | 23 | Beautiful and in register, but drifting dots are calm; 90 % frames changing at 1.0, peak 55 px. |
| 6 | Desync | 4 | 1 | 1 | 1 | 5 | 4 | 16 | The lattice is gone; it is a ball of static at both intensities. No event to watch for, and it stops being the same object. |
| 7 | Tremor | 3 | 2 | 3 | 2 | 5 | 4 | 19 | Constant 24 Hz dot jitter tires the eye; at 1.0 the rows blur out. |
| 8 | G1 Colour split | 3 | 2 | 3 | 3 | 3 | 5 | 19 | Renders as a full red-green-blue fringe. Green does not exist in this essay. Needs 2-3 draws of the piece. |
| 9 | G2 Slice tear | 4 | 4 | 4 | 4 | 4 | 5 | 25 | The signature move, legible at 0.35 in close-up (bands shift 5-10 px for 3 frames), brightness-neutral, best still of the set. Alone it has no body between events. |
| 10 | G3 Block snap | 3 | 3 | 3 | 2 | 2 | 4 | 17 | Reads as a stock pixelate; dims the planet (luminance dip). The one-dot-per-node dedup is a CPU trick with no cheap vertex-shader equivalent. |
| 11 | G4 Frame hold | 3 | 4 | 2 | 4 | 4 | 5 | 22 | Half the planet frozen behind a vertical seam, catch-up in one frame. Quiet on the bare spin; a stacking ingredient. |
| 12 | G5 Dropout lines | 3 | 5 | 3 | 5 | 5 | 4 | 25 | Removes light, 2 frames, trivially a discard on screen y. The best secondary ingredient; not a lead. |
| 13 | G6 Burst | 5 | 2 | 2 | 2 | 2 | 3 | 16 | Four stock effects stacked: RGB mosaic. 2 onsets in 20 s at 0.35, so nothing to watch for. Inherits the snap problem. |
| 14 | C1 Arrhythmia + tear | 5 | 4 | 4 | 4 | 4 | 5 | 26 | The tear becomes the pulse, so the timing is biological and the look is glitch-game. Readable at 0.35 in close-up; hard beats add the split (rainbow as built). |
| 15 | C2 Stutter + hold + split | 5 | 3 | 4 | 3 | 4 | 5 | 24 | Highest irregularity (CV 0.6-0.8) and the most "code" metaphor (hang, lurch, stale half). Walnut look from wave + seam; rainbow split. |
| 16 | C3 Spasm + burst | 5 | 3 | 3 | 3 | 2 | 3 | 19 | As built. The violent-then-exhausted contrast is the right idea; the burst's snap and RGB are the wrong clothes. Tweaked (below) it scores ~24. |
| 17 | C4 Tremor + leak + dropout | 4 | 3 | 3 | 2 | 4 | 4 | 20 | Chronic. 96-99 % frames changing, never rests; tiring over several seconds. |

## Top 3

**1. v14 C1 Arrhythmia + tear**, with two changes.
- Replace the RGB colour split (on hard compensatory beats) with a two-copy cold/warm split: one copy tinted the agents' blue `#4DA3FF`, one ember `#FF6B57`, each at ~0.5 brightness, offset ±(3-8) px mostly sideways as now, same 2-4 frame life. This keeps the rhyme with the freeze frame's offset cold/warm copies and keeps green out of the essay.
- Make the skipped beat visible: at the slot time of a skipped beat, fire a G5 dropout (1-2 scanlines, 2-5 px, 2 frames) instead of nothing. A miss then reads as a miss, so the arrhythmia is legible as arrhythmia rather than as a slower pulse. Keep everything else (65 bpm, 45 ms swell with ringing undershoot, lopsided, doubles 0.21 s apart, tear 4-28 px with half the bands still, 2-3 frames).
- Why first: it is the only variant where the glitch has a reason to happen when it happens, it is readable at 0.35 close up and unmistakable at 1.0, every piece is brightness-neutral (0 flashes/s), and the tear plus swell are cheap in a vertex shader (band index from projected y, stepped time hashed per beat).

**2. v16 C3 Spasm + burst**, with the burst slimmed to tear + dropout.
- Burst = G2 tear (1.2x size) + G5 dropout only, 5-7 frames, re-rolled every two frames as now. Drop G3 block snap (the stock pixelate, the luminance dip, and the dedup that has no cheap shader twin) and the colour split. Keep the two-frame clench (axis squeeze with held jitter) and the clean half-second slump exactly as built; the slump is the best "unhealthy" read in the set and it must stay un-glitched so the contrast lands.
- Freeze frame: the clench frame (static at 5.37 s), not a burst frame.

**3. v15 C2 Stutter + hold + split**, with the shell wave halved and the split in palette.
- Halve the amplitude of the drifting shell wave so the silhouette is no longer a cauliflower at rest; the holds stay visible through the moons (they stop mid-track and jump) and the lattice's moire. Keep the 70-270 ms holds, the two-frame lurch, and the frame hold (8-18 frames, one side of a hashed line) which is the "stale half" image.
- Split: same cold/warm two-copy split as in #1, on each lurch.
- This is the most "defect in code" of the three (it hangs, it lurches, half of it stops updating) and the most irregular (CV 0.6-0.8). It ranks third because its still is the weakest of the three unless a split is on, and because even halved the wave is a permanent deformation.

Fallback with no tweaks at all: v09 G2 Slice tear as built, with events kept as rare as now.

## The one thing I would most warn against

Do not ship any variant carrying the red-green-blue split as rendered (G1, and inside G6, C1, C2, C3): it puts a third hue into a two-colour essay and is the single element that reads as a stock glitch plugin rather than a defect in this code. If a split is wanted, it must be the essay's own cold and warm copies. (Second, and close: never let the effect run continuously; Desync, Tremor and C4 erase the lattice, tire the eye within seconds, and leave nothing for "if you watch" to find.)
