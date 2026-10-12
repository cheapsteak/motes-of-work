# Design brief (round 2a): the build sequence, the frame's entrance and the "Done" orbit

You are the art director for "Motes of Work", a scroll-driven essay on a three.js point cloud. Repo
<repo> (read-only for you except your output file). Current design:
docs/specs/2026-10-04-act-1-storyboard-and-text-engine.md (§1 copy, §2 storyboard incl. §2.7 as built, §3 text
engine). Look at the live frames in shots/task13/*.png. Another designer is working in parallel on the
"drawing first" (blueprint) part of the spec section; stay out of that (spec section beats sp-1..sp-7).

## The author's feedback, verbatim (on the cold open / vibe-build section)
- "Kill the mention of hand brakes and a bell, that is pointlessly extra detail."
- "I thought I said don't show the list until the corresponding scene gets activated. So precisely not have it be
  grayed out. I'm saying not grayed out. Just don't show it at all." (Each brief line must be absent — not dim —
  until its own scene starts.)
- "The ordering isn't right. The text should appear before the thing it's meant to build shows up. Right now the
  feature (or wheels) get built before the prompt is given."
- "We should separate out the animation of front wheel turning and the frame materializing. Front wheel turn should
  be its own segment before frame."
- "Can we make the frame's animate-in much more visually interesting? Not just a slide in. ... It seems to have a
  lot of pieces. Make it look interesting." (Give creative options, then recommend one.)
- "When we get to 'Done, every line on the list is met' let's orbit around the bike. Make it an interesting orbit,
  not a boring one. Play with zoom and angles too, not just rotation."

## What exists
- Bike parts and settle windows: src/mechanisms/bike/index.ts and shapes.ts (the frame is several tubes plus the
  twin's mast/stub; brakes, mudguards, basket, rack, cables). Per-part exploded offsets and settle windows drive
  arrival (src/scene/mote/partTransforms.ts, attributes.ts settleWindow). Motes: src/scene/mote/ (mote.glsl with a
  TS mirror mote.ts; a parity e2e test compares them).
- The brief lights per line from assembly (src/story/brief.ts, data-parts in src/story/01-vibe-build.md).
- Camera: src/scene/cameraRig.ts with machine-relative keys, camera.frame, coreFocus; keyframes in
  src/timeline/keyframes.json.

## Constraints
- Purity: every frame a pure function of scroll progress. Reduced motion respected.
- You MAY propose changes to the mote shader (mote.glsl + its TS mirror together, parity kept), new per-part
  attributes, or a small extra effect layer, if the frame entrance needs it; say exactly what and why. Prefer
  ideas that read in a still frame too, and that feel like a swarm of agents building.
- Text stays above the machine; the clearance test stays.
- Copy: picture-book voice for developers reading to their kids; publication-safe.

## Produce
One file: docs/specs/2026-10-05-act-1-build-and-orbit.md containing:
1. The vibe-build section re-storyboarded: each brief line appears (absent before), THEN its parts fly in; the brakes
   line removed (decide which line the brake parts settle under, or whether they settle with the frame); a front-
   wheel turning segment of its own before the frame; then the frame's entrance; then "Done. Every line on the list
   is met." with the orbit. Same table shape as §2.1 (beat, appears, camera, motion), with the brief's per-line
   reveal timings and the brief's new wording.
2. The frame entrance: 3–5 creative options (each in 2–3 sentences: what the reader sees, why it feels like agents
   building, what it needs technically), web-searched references where useful (cite links), and one recommendation
   with enough detail for an implementer (timings, per-tube order, any shader/attribute change, tests).
3. The orbit: a camera path (keys in bike terms: target, bearing, elevation, distance, fov per key, with easing),
   that plays with zoom and angle, sweeps past the swapped seat and bars so the mistake is visible during it, and
   ends where the reveal section begins (continuity). Say how it keeps text clear.
4. A short decisions list with costs if wrong.
Return only the file path and a 10-line summary.
