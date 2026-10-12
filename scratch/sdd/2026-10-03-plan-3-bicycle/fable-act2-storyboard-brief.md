# Design brief: the Act II storyboard and the network scene

You are the art director and technical designer for "Motes of Work". Repo <repo> (read-only for
you except your output file). Do not edit source code.

## Read first
- docs/script/act-2.md — the Act II script, draft 3, reviewed line by line by the author. The words are settled
  enough to storyboard; treat them as fixed (if a line cannot be shown truthfully, say so and propose a minimal edit).
- docs/specs/2026-10-05-act-2-wrong-guidance.md — the agreed design (layers, flows, the defect shown as a hairline
  crack up close, the six beats).
- How Act I is built, to reuse it: docs/specs/2026-10-04-act-1-storyboard-and-text-engine.md (§2 storyboard shape, §3
  text engine), docs/specs/2026-10-05-act-1-build-and-orbit.md and 2026-10-05-blueprint-and-build.md (as built
  sections), src/story/*.md (beat markers), src/timeline/keyframes.json, src/timeline/sceneState.ts,
  src/scene/cameraRig.ts, src/scene/mote/ (mote.glsl + its TS mirror mote.ts with a parity test; attributes, settle
  windows, partTransforms), src/mechanisms/types.ts (the Mechanism contract), src/autoAdvance/ (stops per scene).
- The node spike (throwaway, but it proved the crack): worktree <mow-nodes checkout>, src/mechanisms/nodes/ and its
  shots in <mow-nodes checkout>/shots/nodes/{far,near}.png. Lesson recorded: a plain gap is invisible even up close
  because the cloud is see-through; motes must sit on the crack's own faces.
- CLAUDE.md in the repo: phone first (390x844 before 1440x900), pure function of scroll, publication-safe copy.

## The author's rules that bind this design
- Every line is true of what is on screen while it is up; the camera and motion show what the line says.
- Act II opens with "Now let's zoom out." while the riding bike's particles loosen and reflow into the first stack
  of cubes (the bike becomes the first stack).
- The prose never needs a colour legend; who did what reads from verbs and camera distance. Stage directions may use
  the picture's own vocabulary (stacks of cubes, streams, crack).
- No labels on layers, no fence at the fix.
- Phone first; text above the machine; one auto-advance stop per scene, at its end.
- Every frame a pure function of scroll; reduced motion honoured.

## Produce one file: docs/specs/2026-10-06-act-2-storyboard-and-network.md
1. **The storyboard**: a table per section (decide how Act II splits into sections and their lengths in screens),
   one row per beat: text, appears/leaves (local progress), camera (in the network's own coordinates), and motion
   (what grows, what lights, what is fixed). Include the wordless moments the script names (the second fix, the
   fan-out). Exactly twelve highlighted defects on "Twelve new defects."
2. **The network scene, technically**: how the network is generated deterministically from a seed (layers, node
   sizes and positions, streams, growth order, lineage, which nodes are defective), how nodes and streams are drawn
   with the existing mote system (a new mechanism-like scene? a second mote set? how many motes, phone budget), how the
   crack is drawn (from the spike), how highlight, the person's fix, the reviewer's ring, and the up-stream read
   without colour words in the prose (colour may still carry meaning visually: say how you use it), how growth over
   scroll stays pure (birth windows like settle windows), and the camera rig for a non-mechanism scene.
3. **The reflow from bike to first stack**: how the Act I bike's motes are reassigned to the first stack's cubes
   continuously (point-for-point mapping, timing), compatible with the mote shader (changes only in lockstep with its TS
   mirror and the parity test).
4. **What changes in existing code** (SceneState leaves, keyframes, text engine, auto-advance, compare page if any),
   and **tests that pin it** (purity, count of twelve, crack visible up close and invisible far, clearance on phone,
   one stop per scene).
5. A short task breakdown an implementer can follow (4–7 tasks, each independently testable), and the risks.
6. Decisions and what each costs if wrong; at most three open questions for the author.

Optional: static mock frames (phone first) in <scratchpad>/act2-mocks/.
Return only the file path and a 10-line summary.
