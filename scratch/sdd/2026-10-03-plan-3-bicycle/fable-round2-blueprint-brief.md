# Design brief (round 2b): the blueprint drawing and the build from it

You are the art director for "Motes of Work", a scroll-driven essay on a three.js point cloud. Repo
<repo> (read-only for you except your output file). Current design:
docs/specs/2026-10-04-act-1-storyboard-and-text-engine.md (§1 Section 4 "the drawing first", §2.4 and §2.7 as
built). Look at shots/task13/*-sp-*.png. Another designer is working in parallel on the cold-open build and an
orbit; stay out of the vibe-build and reveal sections.

## The author's feedback, verbatim
"When we go drawing first, can we hide or make more transparent the background motes, and make the drawing look more
like a drawing on paper? Like ink blueprint style? Color should be different too. Maybe like ink on parchment. Think
Da Vinci. More flat, should look more 2d here. Maybe some kind of 2d shader? This sketch shouldn't look particle-y
at all. Have a fable subagent think through some ideas and web search reference implementations.
And then add a scene where the now corrected and approved blueprint gets turned into 3d and 'built'."

## What exists
- The drawing today is the ghost outline (src/scene/mote/shaders/ghost.*.glsl, sampled points of the bike's parts;
  `mech.ghost` opacity and `mech.ghostVariant` morphing it from the swapped twin to the correct bike). It reads as
  particles.
- Bike geometry: src/mechanisms/bike/shapes.ts (tubes, wheels, saddle, bars, basket...), part poses
  pose(drive, faults, variant) in index.ts. The twin and the correct bike share parts, blended by parameters.
- Camera rig src/scene/cameraRig.ts; keyframes src/timeline/keyframes.json; SceneState leaves.

## Constraints
- Purity: every frame a pure function of scroll progress (including any "drawing" stroke reveal and the redraw).
- The drawing must not look like particles: lines/strokes, flat, ink on parchment (Da Vinci notebook: sepia/iron-
  gall ink, hatching, construction lines, maybe mirror-script-like annotations as texture only, never real words
  that need reading). Decide whether the "paper" is a full-screen parchment that the scene fades into, a sheet
  floating in space, or the background turning to paper; and what happens to the motes (hidden or faint).
- The redraw (seat to the back, bars to the front) must read as the agent redrawing lines, cheaply.
- Then a NEW scene: the approved drawing becomes 3D and is built: e.g. the flat sheet tilts up into space and the
  lines extrude/inflate into the 3D bike, gold motes land on the contact points first, blue motes fill the body.
  Give options, recommend one.
- Text stays above the machine; picture-book copy voice (developers reading to their kids); publication-safe. You
  may adjust the spec section's copy (sp-1..sp-7) and add a line or two for the new scene; keep "You point it out,
  and the agent redraws it ... No new frame this time. Just new lines." which the author approved.
- Technically: new renderers/shaders are allowed (e.g. three.js Line2/LineMaterial fat lines, SDF or screen-space
  line shaders, a parchment background shader, a projected 2D silhouette/edge pass). The mote shader may change only
  if its TS mirror changes with it (parity test). WebGL2, must run on mid-range laptops and phones.

## Produce
One file: docs/specs/2026-10-05-blueprint-and-build.md containing:
1. Research (web search, cite links with tiers): reference implementations of ink/sketch/blueprint/hand-drawn line
   rendering in WebGL/three.js (e.g. stroke reveal via dash offset, wobbly lines, cross-hatching shaders,
   paper textures, NPR edge rendering, Da Vinci-style notebook pages on the web), and of 2D-to-3D reveals.
2. The look: 2–4 options with what the reader sees, then one recommendation specified for an implementer: how the
   drawing geometry is produced from the bike's shapes (e.g. projected silhouette and key edges of each part in a
   fixed side view, as polylines), how it's rendered (shader, line width, wobble, ink colour values, paper colour
   and texture), how strokes draw in by scroll, how the redraw animates, what happens to the motes and background.
3. The new "drawing becomes 3D and gets built" scene: options and a recommendation with timings.
4. The revised spec-section storyboard table (beat, text, appears, camera, motion/drawing state) with any copy edits.
5. Tests that would pin it (purity, the drawing has no point rendering, colours, redraw morph continuity).
6. Decisions and costs if wrong.
Optional: one or two static mock frames in <scratchpad>/blueprint/.
Return only the file path and a 10-line summary.
