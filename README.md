# Motes of Work

*Working title.* A self-paced, scroll-driven 3D essay about where human attention belongs when working with coding agents.

Particles ("motes") of human work, agent work, and human↔agent back-and-forth assemble a machine; scrolling moves the camera and morphs the cloud through the argument.

Status: the foundation (scroll-to-progress pipeline, keyframed scene state, point-cloud renderer, parity page,
hardware spikes, e2e suite), lighting and a comparison page are built. The bicycle is on stage: the cold open builds
it from a bulleted brief whose lines tick as its parts settle, and the four draft sections (vibe build, reveal,
rewind, spec) frame it. The gears, watch movement, strandbeest and steam engine stay registered as a development
bench. The final copy, the rest of the story and the final look are later plans. Design:
[`docs/specs/2026-10-02-motes-of-work-design.md`](docs/specs/2026-10-02-motes-of-work-design.md). To build a new
machine, read [`docs/adding-a-mechanism.md`](docs/adding-a-mechanism.md).

## Develop

Node 22.

```sh
npm ci
npm run dev         # Vite dev server
npm run typecheck   # tsc --noEmit
npm test            # unit tests (Vitest), including the story content lint
npm run e2e:task    # the e2e tier a task ends with: every spec but the full-only ones (e2e/tiers.ts)
npm run e2e:full    # every e2e test (also `npm run e2e`); builds and previews the site on :4173
npm run shots       # screenshots of every story beat, and of every mechanism at a three-quarter view (states, faults), written to shots/ (SHOTS=1 e2e/shots.spec.ts)
npm run build       # production build into dist/
```

The e2e tests run Chromium on software WebGL (SwiftShader), launched with `--use-angle=swiftshader
--enable-unsafe-swiftshader --ignore-gpu-blocklist` (see `playwright.config.ts`). A frame of the 100k-mote
cloud takes a couple of seconds there, so `npm run e2e` takes minutes. `@playwright/test` is pinned to
`1.56.1` and `PLAYWRIGHT_BROWSERS_PATH` is preset to the machine's browser directory
(`/opt/pw-browsers`): never run `playwright install` locally.

The e2e suite has two tiers. `e2e:full` runs before a push to `main` and before a publish; `e2e:task` leaves
out the specs tagged `@full-only` (purity, reduced motion and the pages), and a unit test
(`src/e2eTiers.test.ts`) fails if a spec file falls out of both. The rewind invariant is checked in two
places: the purity twin (`src/purity/`) drives the page's own stage in Node through every sample of the
grid and compares what each path leaves for the GPU, and `e2e/purity.spec.ts` is its browser fence.
CI (`.github/workflows/e2e.yml`) runs `e2e:full` in 8 shards in the Playwright image of the pinned version,
and merges their reports into one HTML report (the `playwright-report` artifact).

### URL parameters

| Parameter | Page | Effect |
|---|---|---|
| `?p=0.4` | essay | Scrolls to progress 0.4. Progress is always read back from `scrollY`; `?p=` never sets it directly. |
| `?test=1` | essay | No idle shimmer, and a frame renders only when something changes. Exposes `window.__motes` (`progress()`, `frames()`, `settle()`, `mechanism()`) to the e2e tests. |
| `?mech=gears` | essay | With `?test=1` only: puts that registered mechanism on stage instead of `ACTIVE_MECHANISM` (`src/config.ts`). An unknown id falls back with a console warning. |
| `?state=<URI-encoded JSON>` | essay | Merged over the sampled scene state, e.g. `?state={"mech":{"assembly":0.5}}`. Malformed JSON is ignored with a console warning. |
| `?n=3000` | essay | Lowers the mote budget (default and maximum `MOTE_BUDGET_DESKTOP`, 100k, in `src/config.ts`) so frames are cheap under software WebGL. |
| `?mech=watch` | comparison page | Opens on that registered mechanism instead of `ACTIVE_MECHANISM`. An unknown id is ignored. |
| `?budget=30000` | comparison page | Starting mote budget, `30000` or `100000` (the default); the panel switches it after load. |
| `?dev=1` | comparison page | Adds the collapsed "Lighting (dev)" group: live sliders over the `LIGHTING` constants (`src/scene/lighting.ts`), with Copy as JSON. Never linked from the essay. |
| `?test=1` | comparison page | No idle shimmer and no orbit damping, so frames render only on change. Exposes `window.__compare` (`state()`, `paneStates()`, `nan()`, `frames()`, `systems()`) to the e2e tests. |
| `?n=30000` | spike pages | Mote count (`fill.html`, `vertex.html`). |
| `?dpr=1.5` | spike pages | Device pixel ratio, applied as given (`fill.html`, `vertex.html`). |
| `?isolate=1` | `vertex.html` | Scissors the render to a 1 px square so the GPU time is vertex work only. |

The idle shimmer is also off under `prefers-reduced-motion: reduce`.

### Comparison page

`src/compare/compare.html` (at `/src/compare/compare.html` on the dev server and in the build) shows the
registered mechanisms at a state set by sliders, orbited with the mouse: one mechanism, one mechanism as
correct and wrong twin side by side ("Twin pair"), or every mechanism in a grid ("Side by side"). Presets set
the sliders to named looks (specced, the vibed wrong twin, quiet failure, exploded, faults at 0.6). It is not
scroll-driven. Its "Credits and licences" button opens the same notices (`CREDITS.md`) as the button at the
end of the essay.

## Preview deploy

Every push to `main` builds the site with `BASE_PATH` set from the base path `actions/configure-pages` reports (`/motes-of-work/` for this repository) and publishes `dist` to GitHub Pages
(`.github/workflows/pages.yml`). Enable it once: **Settings → Pages → Source: GitHub Actions**. A private
repository needs a GitHub plan that supports private Pages; on other plans the repository has to be public
for Pages to serve it.

The hardware spike pages (spec §10) ship in the same build. Open them on the device under test, let them run
for a few seconds, press **Copy results** and paste the JSON back. Relative to the Pages base
(`https://<owner>.github.io/motes-of-work/`):

| Page | URL | Parameters |
|---|---|---|
| Index | `src/spikes/index.html` | |
| Spike 1, fill rate | `src/spikes/fill.html` | `?n=30000&dpr=1.5` |
| Spike 2, vertex cost | `src/spikes/vertex.html` | `?n=100000&dpr=<device, capped at 2>&isolate=1` |
| Spike 3, float texture read | `src/spikes/floattex.html` | |
| Spike 5, point size limits | `src/spikes/caps.html` | |

Locally, `npm run dev` serves them at `/src/spikes/…` on the Vite dev server. Over plain http on a phone,
Copy results falls back to selecting the text, because the clipboard API needs https.
