# Schematic research notes (working file; the deliverable is ideas.html)

## Essay facts (T1, read 2026-10-10)
- Text band: top 42 % (TEXT_BAND 0.42), BAND_MARGIN_PX 8; topmost lit pixel >= 8 px under the band.
- Palette: NODE_AGENT #4DA3FF (hue 211), NODE_HUMAN #FFB347 (35), NODE_EMBER #FF6B57 (7), frozen cyan #1FB0FF (201),
  star tint white #F4F7FF -> amber #FFD9A0 (36); disk warm (1,.64,.36) / cool (.55,.76,1); jets (0.30,0.64,1)->(0.64,0.40,1) violet tip (264);
  HOLE_EMBER (1,.26,.18). Free hue zones: ~60-190 (yellow-green-teal) and ~280-340 (magenta); magenta + additive blue = violet = the jets.
- Stars: 40 core + 120 halo dots, 6x16 spike dots in screen space; 4 or 6 spikes; white->amber only, never green or purple.
- LOD bands by projected px: planet points 10->20, shells 25->50, moons/tracks/orbits/derps 60->120; at most two systems at full detail.
- Copy: Act II narration never uses galaxy, planet, moon, star, orbit, track, atom, stack, cube, stream, crack, ring, glow, colour/dot words; "system" never.
- fr-1 alt: "Nothing is marked" -> schematics must be gone at the galaxy wide.
- Healthy bodies are perfect: no event of any kind on a healthy body.
- Act I precedent: the blueprint's margin notes were "texture only, never words" (blueprint spec 2.7).
- Defect vocabulary (df alt): breathes, comes apart and re-forms, a moon stutters, a moon off its path beside a faint double, marks drawn round both.

## Round 3: R + H and the port notes (2026-10-10)
- The author: R for one system, H for the neighbourhood. Combined as concept RH, first in the swipe.
- Hand-over by projected outer diameter: HANDOVER = [220, 320] CSS px (essay s_px, the outer radius: 110 -> 160). H drawn at 1 - w, R at w, w = smoothstep.
- Zoom framing: hood model with the hero at the origin; camera log-linear hood -> close; slider, wheel, ?z=, ?px=, &solo=1.
- Hero-only schematic dots (phone): 224 px 384; 275 px 461; 326 px 1,523; close 1,934 (healthy 1,813). Hood (H): 2,730 for 25 systems, about 110 each.
- The port notes (star kept inside the drawing, files touched, LOD bands in s_px, the 6,000-dot reservation, nodes = orbitPos(t + k*period/12), off plan = orbit without the derp vs the body with it, the states cracked/lit/derp/freeze/fix) are in ideas.html section 8.

## Round 4: the hand-over as one geometry (2026-10-10)
- RH morphs one geometry, staggered by element over 150 -> 420 px of projected diameter (WINDOWS in mock.html); every dot set dissolves in by hash rank (RANK); the old cross-fade stays as RH0.
- No hard switch left in the zoom range: point -> sphere cross-fades over 12 -> 18 px, sphere detail 41 % -> 100 % by rank over 200 -> 320 px, inner rings dissolve 110 -> 170 px, full-detail cap is a smoothed lead over the third-largest system (+-24 px), off-screen and near-camera culls dissolve dot by dot.
- Scrub (200 steps, defect, whole frame): old count max 1,324 / p95 397, brightness max 918 / p95 293; new count max 774 / p95 613 (a steady ramp), brightness max 712 / p95 120.
- Hero-only schematic dots: 228 px 1,153; 280 px 1,417; 332 px 1,850; close 2,570 (healthy 2,446); hood 2,047 for the frame.
- Details and the amended port notes: ideas.html section 9.
