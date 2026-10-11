### Task 8: Comparison page

**Files:** Create `src/compare/compare.html`, `src/compare/compare.ts`, `src/compare/controls.ts`, `e2e/compare.spec.ts`; modify `vite.config.ts`.

- Layout: a canvas with OrbitControls (drag to orbit, scroll to zoom — this page is not scroll-driven, and it is exempt from the purity invariant except that the machine itself is still a pure function of the slider state); a side panel with: mechanism picker (four ids), sliders for `assembly`, `variant`, `drive` (+ play toggle), provenance (`vibed`, `misallocated`), every fault, `ghost`; presets ("Specced", "Vibed (wrong twin)", "Quiet failure", "Exploded", "Faults 0.6"); a "side by side" toggle that shows all four mechanisms in a 2×2 grid at the same state. Budget selector (30k / 100k).
- The page reads mechanism names and one-line descriptions from the modules (each mechanism exports `label` and `blurb`).
- [ ] Failing e2e: page loads for each mechanism with no errors; each preset renders a non-blank canvas; extreme slider values (all 0, all 1) produce no `pageerror` and no NaN (probe via a test hook); 2×2 view renders four non-blank quadrants.
- [ ] Commit `feat: mechanism comparison page`.

