# Motes of Work

*Working title.* A self-paced, scroll-driven 3D essay about where human attention belongs when working with coding agents.

Particles ("motes") of human work, agent work, and human↔agent back-and-forth assemble a machine; scrolling moves the camera and morphs the cloud through the argument.

Status: Plan 1 (foundation) is built: the scroll-to-progress pipeline, keyframed scene state, the point-cloud
renderer with a placeholder gears mechanism, three placeholder story sections, a GLSL to TypeScript parity page,
the hardware spike pages and the e2e suite. The final mechanism, copy and look are later plans. Design:
[`docs/specs/2026-10-02-motes-of-work-design.md`](docs/specs/2026-10-02-motes-of-work-design.md).

## Develop

Node 22.

```sh
npm ci
npm run dev         # Vite dev server
npm run typecheck   # tsc --noEmit
npm test            # unit tests (Vitest), including the story content lint
npm run e2e         # Playwright end-to-end tests; builds and previews the site on :4173
npm run shots       # screenshots of every story section and three-quarter mechanism views, written to shots/ (SHOTS=1 e2e/shots.spec.ts)
npm run build       # production build into dist/
```

The e2e tests run Chromium on software WebGL (SwiftShader), launched with `--use-angle=swiftshader
--enable-unsafe-swiftshader --ignore-gpu-blocklist` (see `playwright.config.ts`). A frame of the 100k-mote
cloud takes a couple of seconds there, so `npm run e2e` takes minutes. `@playwright/test` is pinned to
`1.56.1` and `PLAYWRIGHT_BROWSERS_PATH` is preset to the machine's browser directory
(`/opt/pw-browsers`): never run `playwright install` locally. CI installs its own Chromium.

### URL parameters

| Parameter | Page | Effect |
|---|---|---|
| `?p=0.4` | essay | Scrolls to progress 0.4. Progress is always read back from `scrollY`; `?p=` never sets it directly. |
| `?test=1` | essay | No idle shimmer, and a frame renders only when something changes. Exposes `window.__motes` (`progress()`, `frames()`, `settle()`, `mechanism()`) to the e2e tests. |
| `?mech=gears` | essay | With `?test=1` only: puts that registered mechanism on stage instead of `ACTIVE_MECHANISM` (`src/config.ts`). An unknown id falls back with a console warning. |
| `?state=<URI-encoded JSON>` | essay | Merged over the sampled scene state, e.g. `?state={"mech":{"assembly":0.5}}`. Malformed JSON is ignored with a console warning. |
| `?n=3000` | essay | Lowers the mote budget (default and maximum `MOTE_BUDGET_DESKTOP`, 100k, in `src/config.ts`) so frames are cheap under software WebGL. |
| `?n=30000` | spike pages | Mote count (`fill.html`, `vertex.html`). |
| `?dpr=1.5` | spike pages | Device pixel ratio, applied as given (`fill.html`, `vertex.html`). |
| `?isolate=1` | `vertex.html` | Scissors the render to a 1 px square so the GPU time is vertex work only. |

The idle shimmer is also off under `prefers-reduced-motion: reduce`.

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
