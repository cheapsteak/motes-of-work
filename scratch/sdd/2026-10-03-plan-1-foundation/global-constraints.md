## Global Constraints

- Node 22. TypeScript `strict: true`. ES modules.
- `@playwright/test` pinned to exactly `1.56.1`. Never run `playwright install` locally; `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers` is preset. CI installs its own Chromium.
- Chromium launch args for every Playwright run: `--use-angle=swiftshader`, `--enable-unsafe-swiftshader`, `--ignore-gpu-blocklist`.
- **Purity invariant (spec §6.1):** every frame is a pure function of scroll progress. No state accumulates across frames. Machine motion is driven by `SceneState.mech.drive`, never wall-clock time. The only exception is idle shimmer, added after `mote()`, disabled when `?test=1`.
- **Progress always derives from `scrollY`.** `?p=` sets the scroll position; it never sets progress directly.
- `SceneState` is flat, numeric and blendable (spec §6.2). No discrete fields.
- Seeds are integers in `[0, 2^24)` so they survive float attributes exactly.
- UI text in sentence case. Content must be publication-safe: no company names, internal issue numbers or internal paths (spec §7).
- Mote colors: human `#FFB347`, agent `#4DA3FF`, dialogue `#E6DDFF`. Background `#0B0D12`.
- Device pixel ratio capped at `Math.min(window.devicePixelRatio, 2)`.
- Every commit message ends with the line `Claude-Session: https://claude.ai/code/session_01NeUYkcE3BstKfMUyx32g8w`.
- Work on branch `plan-1-foundation`. `git add` named files only.

## Review Focus

1. **Out-of-range progress** (iOS overscroll, negative `scrollY`, `NaN`) — clamped to `[0,1]`, never propagates `NaN` into the shader. Tests in Task 2 and Task 3.
2. **Malformed keyframes** (unknown path, unknown section id, non-increasing `at`, wrong value shape, non-finite value, unknown ease) — throws at load with the track named; never renders garbage. Tests in Task 3.
3. **Window resize mid-story** — the reader stays at the same progress (within 0.002) and sees the same section. Test in Task 9.
4. **WebGL context loss** — no uncaught errors; story text stays readable; `body.no-webgl` is set. Test in Task 9.
5. **Hidden tab** — the render loop stops while `document.hidden` and resumes after. Test in Task 9.

---
## File structure

```
index.html                       app shell
vite.config.ts                   multi-page (app, parity, spikes), base from BASE_PATH
playwright.config.ts
src/
  main.ts                        app wiring (Task 9)
  config.ts                      ACTIVE_MECHANISM, budgets
  math/vec.ts                    Vec3 + helpers
  math/transform.ts              PartTransform, Quat, compose/apply/lerp
  math/hash.ts                   pcg, hash01, mulberry32
  story/NN-<id>.md               sections
  story/loader.ts                parseSection, loadStory
  scroll/progress.ts             pure scroll/progress math
  scroll/driver.ts               DOM scroll → progress
  timeline/sceneState.ts         SceneState, defaults, paths
  timeline/easing.ts
  timeline/sampler.ts            Sampler interface
  timeline/keyframeSampler.ts
  timeline/keyframes.json
  mechanisms/types.ts            contract (spec §6.3)
  mechanisms/index.ts            registry
  mechanisms/gears/index.ts      placeholder mechanism
  scene/cameraRig.ts
  scene/mote/attributes.ts       MoteAttrs, buildMoteAttrs
  scene/mote/partTransforms.ts   pose ∘ explode, packing for the data texture
  scene/mote/mote.ts             TS reference mote()
  scene/mote/mote.glsl           GLSL mote() library
  scene/mote/moteSystem.ts       instanced quads, threads, ghost
  scene/mote/shaders/*.glsl
  parity/parity.html, parity.ts  GLSL ↔ TS parity page
  spikes/*.html, spikes/*.ts     hardware spike pages + HUD
e2e/*.spec.ts
tests (Vitest) colocated as *.test.ts
```

---
