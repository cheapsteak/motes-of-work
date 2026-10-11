# Task 11 report: hardware spike pages and preview deploy

Status: DONE_WITH_CONCERNS (concerns below are notes, not blockers)
Commit: bd4a432 `feat: hardware spike pages and Pages preview workflow` (not pushed)

## Implemented

- `src/spikes/index.html`: lists the four spikes, one sentence each on what it measures and what number decides what (spec §10), sentence case.
- `fill.html` / `fill.ts`: spike 1. `?n=30000&dpr=1.5` (dpr applied directly, may exceed 2), every mote forced Human via `forceType`, camera `pos [-0.9,0,2.2]`, `mech.drive` = wall-clock seconds.
- `vertex.html` / `vertex.ts`: spike 2. `?n=100000`, dpr default = device capped at 2. Worst case state: all seven faults 1 (drift 1), assembly 0.5, variant 0.5, vibed 0.3, misallocated 0.3, drive animating. Reports whether GPU time exceeds 4 ms. Added an opt-in `?isolate=1` that scissors the render to 1 px so GPU time is almost all vertex work; without it the verdict says "whole-frame GPU time over 4 ms" and `vertexOverBudget` is null (a whole-frame number is only an upper bound on vertex time). With no GPU timer: "unknown".
- `floattex.html` / `floattex.ts`: spike 3. 4x4 RGBA32F texture, attribute-less draw of 16 quads, vertex shader `texelFetch`es texel i and takes its quad cell from x,y and its red value from z. z = 65536 + i, exact in float32 and overflowing a half float, so a silent precision downgrade FAILs. Reads pixels back, PASS/FAIL (tolerance 1/255). Never throws; a failure is FAIL plus the reason.
- `caps.html` / `caps.ts`: spike 5. Renderer, DPR, ALIASED_POINT_SIZE_RANGE, MAX_VERTEX_UNIFORM_VECTORS, MAX_VERTEX_ATTRIBS, MAX_TEXTURE_SIZE, EXT_color_buffer_float, EXT_disjoint_timer_query_webgl2.
- `hud.ts`: `createHud()` returns `{ frame, setGpuMs, setInfo }` as specified plus `summary()` (used for the JSON). Rolling 60-frame average and p95 (nearest rank) of CPU frame time (rAF delta); GPU line shows numbers or "GPU timer unavailable" (`setGpuMs(null)`), "GPU timer: measuring" until the first sample.
- `stats.ts` (`RollingStats`), `gpuTimer.ts` (EXT_disjoint_timer_query_webgl2 wrapper: queue of queries, non-blocking `collect()`, `GPU_DISJOINT_EXT` discards every pending sample), `params.ts` (query parsing), `results.ts` (copy-results panel: `navigator.clipboard.writeText`, textarea+`execCommand('copy')` fallback, and if both fail a status line plus the JSON textarea opened and selected), `renderSpike.ts` (shared harness for fill/vertex), `spikes.css`.
- Every entry file (`fill.ts`, `vertex.ts`) has the top comment that wall-clock `drive` is fine on spike pages (measurement harnesses; purity applies to the story page only).
- Copy-results JSON: spike, UA, renderer (unmasked when exposed), devicePixelRatio, params (n, dpr, extras), viewport and drawing-buffer size, CPU and GPU averages/p95/frames, verdict fields, timestamp. Always visible in a collapsible read-only textarea (`#results-json`).
- Controller ruling: `createMoteSystem(mech, budget, seed, opts?: { forceType?: MoteType })`. forceType replaces every mote's type in all three scenarios and sets a new `uForceHero` uniform (default 0) that makes `moteForm` return the hero form (halo for Human, twin for Dialogue; Agent has no hero form so it is a no-op for Agent). Default path unchanged (types identical to `buildMoteAttrs`, `uForceHero` 0).
- `vite.config.ts`: five spike inputs. `.github/workflows/pages.yml`: push to main (+ `workflow_dispatch`), `configure-pages` / `upload-pages-artifact` / `deploy-pages`, `permissions: pages: write, id-token: write, contents: read`, `environment: github-pages`, `BASE_PATH=/motes-of-work/`. README "Preview deploy" section: enabling Pages (Settings → Pages → Source: GitHub Actions), private-repo plan note, spike URLs relative to the Pages base.

## TDD evidence

- RED (moteSystem): `npx vitest run src/scene/mote/moteSystem.test.ts` after adding the two `forceType` tests: `Tests 2 failed | 5 passed (7)`; failure `expected false to be true` at `types.every(... === MoteType.Human)` (the override did not exist; the default-path test failed on the missing `uForceHero` uniform). Expected.
- GREEN: same command after implementing: `Test Files 2 passed (2) Tests 22 passed (22)` (`src/scene/mote`).
- Unit tests for the new pure modules (stats, gpuTimer with a scripted fake GL including disjoint discard and bounded queue, params) were written before their implementations; GREEN `Test Files 3 passed, Tests 16 passed`.
- e2e RED: I wrote `e2e/spikes.spec.ts` before the pages, but my RED run was botched (the run hung on the stale preview server and I killed it before getting readable failure output), so I do not have clean RED output for the e2e. First GREEN-side run exposed three real failures that I fixed, see below.
- GREEN full suite: `npm run typecheck` clean; `npm test` `16 files, 149 tests passed`; `npm run e2e` `33 passed, 1 skipped` (the skipped one is the SHOTS-gated screenshot spec) in 3.4 min. Spikes spec: 8 tests, all pass.

## Problems found while testing, and fixes

1. GPU timer under SwiftShader: the extension exists but results arrive more than 8 frames late, so my first `MAX_PENDING = 8` queue dropped every query before it resolved and the HUD stayed on "measuring" forever. Raised to 64 with a comment, test updated. (Real GPUs lag 2-4 frames.)
2. The spike JSON only refreshed every 30 frames, which at SwiftShader speeds is several seconds; now refreshed every 250 ms.
3. The "defaults" e2e rendered the default n=30000 at DPR 1.5 under SwiftShader and timed out. Defaults moved to `params.ts` with a unit test; the e2e now checks `?n=500&dpr=3` pass-through on a 320x240 viewport.

I also eyeballed screenshots of fill (halo cloud) and vertex (mid-assembly cloud) pages and the floattex JSON (`observed` equals `expected`, max error 0).

## Files changed

Created: `src/spikes/{index,fill,vertex,floattex,caps}.html`, `src/spikes/{fill,vertex,floattex,caps,hud,stats,gpuTimer,params,results,renderSpike}.ts`, `src/spikes/{stats,gpuTimer,params}.test.ts`, `src/spikes/spikes.css`, `e2e/spikes.spec.ts`, `.github/workflows/pages.yml`.
Modified: `vite.config.ts`, `README.md`, and outside the brief's file list but required by the controller ruling: `src/scene/mote/moteSystem.ts`, `src/scene/mote/moteSystem.test.ts`, `src/scene/mote/shaders/instance.glsl`.

## Self-review / concerns

- Prettier is not a repo dependency, but a hook warned about formatting; I formatted new/edited files with `npx prettier --print-width 120 --single-quote` (verified these options reproduce the existing files unchanged).
- The vertex verdict is a whole-frame upper bound unless `?isolate=1` is used; scissoring may under-report vertex cost on tile-based mobile GPUs (binning), so the human should treat isolate numbers on phones with care. The spike is aimed at laptops, where it is fine.
- The HUD/results overlay is a DOM panel over the bottom of the canvas (up to 60vh when the JSON is expanded); it covers part of the framing but not the render cost.
- `?isolate=1` and the "frameOverBudget" field are additions beyond the brief.
- Pages workflow and the clipboard fallback on real iOS over http are untested here (no Pages env, no iOS); the e2e covers the clipboard-present and clipboard-missing paths in Chromium only.
- Final verification steps not done by me: `npm run shots` review and `git push` (left to the controller per the dispatch; no push made).

## Fix round 1

1. Manual-copy fallback vs live refresh: `results.ts` now freezes the JSON textarea once the fallback fires (and `refresh()` also skips while the textarea is focused). The Copy click always writes a current snapshot into the textarea first, so a second click is not stale. New e2e "a manual selection survives the live refresh on a render spike" (fill page, clipboard removed, `execCommand` forced false): asserts the selection range is non-empty and unchanged, with the text untouched, 1.2 s (about five refresh ticks) later.
   - RED (guard temporarily removed): `npx playwright test e2e/spikes.spec.ts -g "manual selection"` failed, selection `[0, 965, 965]` collapsed to `[991, 991, 991]`. Guard restored.
2. CPU vs interval: the harness now times `stateAt` + `motes.update` + `renderer.render` with `performance.now()` and reports it as CPU (`hud.frame`). The rAF delta is a separate `hud.interval(ms)`. HUD shows two lines (`data-hud` cpu-avg/cpu-p95 and interval-avg/interval-p95); the JSON has separate `cpu` and `interval` keys; the index text explains CPU, frame interval and GPU. The HUD e2e asserts both, and that CPU average is below frame interval average.
3. JSON now has `instances` (actual instance count, from new `MoteSystem.counts`) and `visibleInstances` `{specced, vibed, misallocated}`; the visible count is per scenario because which scenario a mote lands in is decided in the shader by the provenance uniforms. Unit test for `counts` in `moteSystem.test.ts` (written after the implementation, not RED-first). `pages.yml`: `configure-pages` has `id: pages` and the build uses `BASE_PATH: ${{ steps.pages.outputs.base_path }}/` (the action reports the path without a trailing slash, so the slash is appended; for a user site the empty base becomes `/`). README updated. Isolate wording fixed to "a 1 CSS px square (about dpr² buffer pixels)" in `vertex.ts` and `renderSpike.ts`, and the index says "mostly vertex work".

Verification: `npm run typecheck` clean; `npx vitest run` 16 files / 150 tests pass; `npx playwright test e2e/spikes.spec.ts` 9 passed. The full e2e suite was not re-run (changes are confined to spike pages and one additive field on `MoteSystem`; the story page is untouched). No background processes left running.
