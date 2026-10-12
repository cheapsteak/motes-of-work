# Visual review brief (Plan 2, Task 9)

You are the art director for a public, self-paced, scroll-driven web essay (audience: engineers on Reddit, plus the author's friends) about where human attention belongs when working with coding agents. The centrepiece is a 3D point cloud: particles ("motes") of three kinds — human (warm amber, few, large haloed heroes), agent (cool blue, tiny, many), dialogue (pale violet-white twin pairs with a thread) — fly in and assemble a mechanical machine. The finished machine shows provenance: a warm **core** (the small, critical part a human specified) inside a cool **body** (the bulk agents filled in). A **wrong twin** is a confident, polished build of the wrong machine from the same parts. **Faults** are visible malfunctions against a faint **ghost** of the intended machine.

The author must choose ONE mechanism for the essay from four candidates: `gears` (placeholder), `watch` (Swiss lever movement; twin = music box), `strandbeest` (Theo Jansen walking linkage; twin = mis-proportioned flailing legs), `steam` (mill engine with flyball governor; twin = governor disconnected, overspeed).

## What to look at
- Spec visual language: docs/specs/2026-10-02-motes-of-work-design.md — §2 (thesis), §4 (narrative table), §5 (visual language). Read those sections only.
- Screenshots in shots/:
  - `mech-<id>-*.png` and `mech-<id>-lit-*.png`: three-quarter views per mechanism (assembled, twin, exploded-0.75, faults-0.6, and per-fault where present).
  - `vibe-build-*.png`, `rewind-*.png`, `spec-*.png`: story sections (currently built with the gears) at local 0.1/0.5/0.9.
  - `compare-*.png`: the comparison page.
- You may also drive the live build with Playwright to take your own screenshots: the repo is <repo>; `npm run build && npx vite preview --port 4190 --strictPort` (run it in the background and stop it when done; do not touch other ports), Chromium args `--use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`, `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers` is preset (never run `playwright install`). Pages: `/index.html?test=1&mech=<id>&p=<0..1>` (story), `/index.html?test=1&mech=<id>&state=<URI-encoded partial SceneState JSON>` (any state; camera pos/target are machine-relative: world = anchorCentre + value × anchorRadius; `camera.coreFocus` 0..1 frames whole machine → core), `/src/compare/compare.html?test=1` (comparison page). Rendering is software (SwiftShader): judge composition, colour, density and readability, not frame rate. Use `?n=30000` for faster renders when the density is not what you're judging.
- Current lighting/brightness constants: src/scene/lighting.ts; mote sizes/colours/hero fractions: src/scene/mote/shaders/*.glsl and src/scene/mote/moteSystem.ts; camera keyframes: src/timeline/keyframes.json.

## Known issues already logged (confirm or refute, and prioritise)
- Overall exposure is low after lighting; head-on story sections look dark; the warm core lost punch.
- Small dense core parts blow out to near-white (gears crank, strandbeest core leg, steam governor, watch twin fly).
- Ghost too bright up close; the "Quiet failure" preset washes out (ghost opacity 1 covers the misallocation colouring).
- Strandbeest reads as a dense lattice from three-quarter view; may read better side-on with a ground line.
- Watch: pallet fork hard to see from three-quarter view; sparse plate; the twin's comb is weak.
- Glow sizes are capped in drawing-buffer pixels (half-size on retina).

## Deliverable (write it to the report file named in your dispatch)
1. **Per mechanism**: does it read as that machine as a point cloud? Is the core/body distinction legible? Does the wrong twin read as a different, plausible machine? Do faults read as malfunctions? Score each 1–5 and say why, citing screenshots.
2. **Recommendation**: which mechanism best carries the essay's story (cold open on the wrong twin, rewind, spec with the ghost appearing, build, drift, checkpoint), with a runner-up, and why.
3. **Ranked, concrete changes** (most impact first, at most 15), each with the exact parameter/file and the value you suggest where possible: exposure, key/fill/rim, depth dim, back-face dim, hero fractions and sizes, per-type colours, ghost opacity/style, point densities/weights, camera framings per section and per mechanism, background, any staging (e.g. ground line). Mark each as "global" or "mechanism-specific".
4. **Anything in the comparison page** that hurts the author's ability to compare (layout, defaults, presets).
Be specific and decisive; this guidance will be implemented directly.
