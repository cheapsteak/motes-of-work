# Judge 2: the defect variants

Evidence used: `review.html` and every `strips/<id>/sheet.png` (re-tiled at 200 px), the variant code in
`inspector.html` (motions, glitch kit, `measure()`, `draw()`), and my own Playwright captures from
`inspector.html` on 127.0.0.1:8802 (swiftshader, 390 x 844, camera re-targeted on the planet, zoom 1.25):
45-frame 30 fps close-ups seeded at each strip's onset for v01/v02/v03/v11/v14/v15 at both intensities, and
a 4 s 30 fps "if you watch" run (t = 4-8 s) for all 18 at 0.35 and 1.0, with per-frame frame-to-frame
difference and drawn-frame luminance computed from the PNGs (ImageMagick). Scratch outputs are under
`../judge2/` (not part of the evidence set).

Scores 1-5 (5 best). (a) unhealthy not soothing, (b) the essay's register, (c) readable at 0.35 "if you
watch", (d) not gimmicky / not tiring over several seconds, (e) pure f(t) in a vertex shader with a TS
twin, (f) photosensitivity.

| #  | Variant                     | a | b | c | d | e | f | Sum | Note |
|----|-----------------------------|---|---|---|---|---|---|-----|------|
| 0  | Today                       | 2 | 3 | 3 | 3 | 5 | 2 | 18  | Symmetric, one 2.2 s slot; the largest brightness swing of the set (drawn crop +27 %, guard 2 fl/s). |
| 1  | Arrhythmia                  | 4 | 4 | 3 | 4 | 5 | 5 | 25  | 2-frame hard swell + grain, then ringing; skips read as a bad heart. Small at 0.35 (diff 20 -> 27). |
| 2  | Stutter                     | 4 | 4 | 4 | 3 | 5 | 5 | 25  | True freezes (frame diff 0.2 for 4-7 frames) then a lurch; moons stop too. The constant 0.045 R shell wave makes the planet permanently lumpy, which is not the point. |
| 3  | Spasm and slump             | 4 | 3 | 3 | 3 | 4 | 5 | 22  | The 2-frame clench is a tilted-ellipse squash: squash-and-stretch, slightly cartoon. Slump is quiet. |
| 4  | Lumps                       | 3 | 3 | 2 | 4 | 3 | 5 | 20  | Smooth, slow, still soothing; `lurchSum` loops over every cell since t = 0 (needs a closed form in GLSL). |
| 5  | Leaking                     | 4 | 5 | 3 | 4 | 4 | 5 | 25  | Dots escaping the lattice, dimming, snapping home; the rest perfect. The most "dots" of all. |
| 6  | Desync                      | 3 | 2 | 2 | 2 | 5 | 5 | 19  | Destroys the lattice into fuzz, never rests; reads as noise, not a defect. |
| 7  | Tremor                      | 3 | 3 | 3 | 2 | 5 | 4 | 20  | 24 Hz held shiver all the time: tiring, and hides nothing to "watch" for. |
| 8  | G1 Colour split             | 3 | 3 | 3 | 3 | 3 | 4 | 19  | A rainbow ring on ember dots; 3 colour-masked draws of the piece. Reads as a filter, not a body. |
| 9  | G2 Slice tear               | 4 | 4 | 4 | 4 | 4 | 5 | 25  | The cleanest glitch-game idiom; legible at 0.35 (2-16 px) and brief. No cause of its own (hashed cell). |
| 10 | G3 Block snap               | 3 | 2 | 3 | 2 | 2 | 3 | 15  | Drawn planet loses >half its light in one frame (crop mean 60 % of baseline, 3x in 4 s at 1.0); guard says 0 because `measure()` reads `BUF` before `draw()` merges cells. Pixel-art flavour. |
| 11 | G4 Frame hold               | 3 | 4 | 2 | 4 | 3 | 5 | 21  | Half the planet frozen 13 frames (diff 8.5 vs 20): a quiet seam on bare spin. Costs a second motion eval. |
| 12 | G5 Dropout lines            | 3 | 4 | 3 | 4 | 5 | 5 | 24  | Thin dark scanlines; removes light; cheapest to ship (size 0 by band). Mild on its own. |
| 13 | G6 Burst                    | 4 | 2 | 2 | 2 | 2 | 3 | 15  | Everything stacked for 6-10 frames; 2 onsets in 20 s at 0.35 so not watchable; crop luminance 59 %. |
| 14 | C1 Arrhythmia + tear        | 5 | 4 | 4 | 4 | 4 | 5 | 26  | The tear fires on the sick heartbeat, so the glitch's timing is the illness. 5 tears + 1 split in 4 s at 0.35; luminance 99-102 %. |
| 15 | C2 Stutter + hold + split   | 4 | 3 | 4 | 2 | 3 | 4 | 20  | Lumpy wave + rainbow split every 0.3-0.6 s + seam: the busiest frame; 47-67 % frames changing. |
| 16 | C3 Spasm + burst            | 4 | 3 | 3 | 2 | 2 | 3 | 17  | Burst collapses the planet to a dim striped mosaic for 5-7 frames (crop luminance 54 %), 2x per 4 s. |
| 17 | C4 Tremor + leak + dropout  | 4 | 3 | 3 | 2 | 4 | 4 | 20  | Chronic and restrained in stills, but 96-99 % of frames change: never rests, tiring. |

## Top 3

1. **v14 C1 Arrhythmia + tear, with the coupled split damped.** It is the only variant whose glitch has a
   cause: the tear lands on each beat, beats skip and double, and the hard compensatory beat after a skip
   is the one that splits. At 0.35 a watcher sees a 2-3 frame tear every ~0.9 s with misses (5 tears and
   1 split in 4 s); at 1.0 it is unmistakably broken, and the drawn luminance stays within 99-102 % of
   calm. Tweak: in `glitchParams`, call `doSplit(key, 0.6)` for coupled split events (keep `m = 1` for the
   scheduled kind), so the rainbow fringe on the ember dots stays at 2-5 px at full intensity instead of
   8 px; it is a punctuation mark for the hard beat, not a second effect. Keep `coupled: [['tear',[2,3],0],
   ['split',[2,2],1.0]]`. Feasibility: the beat schedule is 4 hashed beats per vertex; the tear is a
   24-band walk on the projected y, applied to `gl_Position` in pixel space with the planet centre and
   radius as uniforms. Ship the tear on the dots and the rim disc; if the body's fill mesh cannot be
   sheared cheaply, leave the fill untorn (the dots carry it).

2. **v02 Stutter, quieted and given a tear on the lurch ("C2-lite").** A clock that stops and lurches is
   a defect in code, literally dropped frames, and the moons stopping on their tracks sells it. Two
   precise changes: (i) `MOTIONS.stutter.prep`: `a: 0.045 * ampOf(I)` -> `0.02 * ampOf(I)` (Today's
   `EQ.A`), so the planet stops looking permanently corrugated and the freeze is what you see; (ii)
   `coupled: [['tear', [2, 2], 0]]` on the stutter's lurch onsets, no hold and no split (drop C2's `hold`
   and `split`). Zero luminance change, no colour fringe, and `tau(t)` is a two-cell hash: the cheapest
   shader of the set (one time-warp before the existing spin and morph).

3. **v05 Leaking, as is.** The restrained option, and the one most in the essay's register: a few dots
   leave the lattice, dim by a third, linger with a 12 Hz shiver and snap home, while the rest of the
   sphere stays perfect; nothing flashes. At 0.35 it is a trickle you notice only if you watch; at 1.0 it
   is continuous (90 % frames changing, 55 px). Optional tweak if it needs a sharper edge at full: couple a
   2-frame `drop` to each wound opening for I > 0.7 (`coupled: [['drop',[2,2],0]]`), which removes light
   rather than adding it. Feasibility: three cells and per-dot hashes, all per-vertex.

If the author wants a single mechanism and nothing organic, v09 G2 Slice tear alone is the fallback
(score 25), but its timing is a hashed cell with no body behind it, which is exactly what C1 fixes.

## The one thing to warn against

Do not ship the block-snap family (G3, G6 Burst, C3 Spasm + burst). The snap pulls 6,116 dots onto a
6-14 px grid and draws one block-dot per node, so the drawn planet loses more than half its light in a
single frame and gets it back 2-4 frames later, three times in four seconds at full intensity; the page's
flash guard reports 0 for it because `measure()` sums `BUF.g` before `draw()` merges the cells, so that
column is not evidence for these three. Add the rainbow RGB split on top (Burst, C3) and it reads as a
screen filter from a music video, not a sick planet. The guard's blind spot also means the snap cannot be
a pure per-vertex function as drawn: without the CPU cell merge, screen-blended dots stack toward white.
