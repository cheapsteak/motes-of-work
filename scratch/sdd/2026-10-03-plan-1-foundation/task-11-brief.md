### Task 11: Hardware spike pages and preview deploy

**Files:**
- Create: `src/spikes/index.html`, `src/spikes/fill.html`, `src/spikes/vertex.html`, `src/spikes/floattex.html`, `src/spikes/caps.html`, `src/spikes/hud.ts`, `src/spikes/*.ts`, `e2e/spikes.spec.ts`, `.github/workflows/pages.yml`; Modify: `vite.config.ts`

**Interfaces:**
- Consumes: `createMoteSystem`, `mechanisms`, `mergeState`.
- Produces: `export function createHud(): { frame(cpuMs: number): void; setGpuMs(ms: number | null): void; setInfo(lines: string[]): void }` — shows rolling 60-frame average and p95 frame time; uses `EXT_disjoint_timer_query_webgl2` when available, else shows "GPU timer unavailable".

Spike pages (spec §10), each with a "copy results" button that copies a JSON summary (UA, renderer string, DPR, params, averages):
- `fill.html` — spike 1: `?n=30000&dpr=1.5`, every mote Human (state override), camera at the worst framing (`pos [-0.9,0,2.2]`), drive animating.
- `vertex.html` — spike 2: `?n=100000`, every fault 1, drift 1, drive animating; reports whether vertex time exceeds 4ms when GPU timing is available.
- `floattex.html` — spike 3: vertex shader `texelFetch`es a 4×4 RGBA32F texture with known values and positions 16 quads from them; reads pixels back; shows PASS/FAIL.
- `caps.html` — spike 5: lists `ALIASED_POINT_SIZE_RANGE`, `MAX_VERTEX_UNIFORM_VECTORS`, `MAX_VERTEX_ATTRIBS`, `MAX_TEXTURE_SIZE`, `EXT_color_buffer_float`, `EXT_disjoint_timer_query_webgl2`, renderer, DPR.

- [ ] **Step 1: Failing e2e** `spikes.spec.ts`: each page loads with no `pageerror`; `floattex` shows PASS; `caps` lists a numeric `MAX_VERTEX_UNIFORM_VECTORS`; `fill` and `vertex` HUDs show a numeric average after 1s.
- [ ] **Step 2–4:** Run (FAIL), implement, run (PASS).
- [ ] **Step 5:** `pages.yml`: on push to `main`, build with `BASE_PATH=/motes-of-work/`, deploy `dist` via `actions/deploy-pages`. Document in `README.md` that GitHub Pages must be enabled (Settings → Pages → Source: GitHub Actions); for a private repo this needs a plan that supports private Pages.
- [ ] **Step 6:** Commit `feat: hardware spike pages and Pages preview workflow`.

---

## Final verification (after Task 11)

- [ ] `npm run typecheck && npm test && npm run e2e` all pass.
- [ ] `npm run shots`; review `shots/` for the three sections.
- [ ] Push branch `plan-1-foundation`.
