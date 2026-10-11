### Task 9: App wiring and the first story slice

**Files:**
- Create: `src/scroll/driver.ts`, `src/scene/cameraRig.ts`, `src/story/01-vibe-build.md`, `src/story/02-rewind.md`, `src/story/03-spec.md`, `src/timeline/keyframes.json`, `e2e/app.spec.ts`; Modify: `src/main.ts`, `src/style.css`, `index.html`

**Interfaces:**
- Consumes: everything above.
- Produces:
  ```ts
  export interface ScrollDriver { progress(): number; dispose(): void }
  export function createScrollDriver(onProgress: (p: number) => void): ScrollDriver; // rAF-coalesced; on resize re-scrolls to scrollYForProgress(last p)
  export function applyCamera(camera: THREE.PerspectiveCamera, s: SceneState): void; // position, lookAt(target), fov
  // test-mode hook, only when ?test=1:
  window.__motes = { progress(): number; frames(): number; settle(): Promise<void> } // settle = resolves after 2 rAFs with no scroll events
  ```
- URL params: `?p=<0..1>` scrolls to `scrollYForProgress(p)` on load; `?test=1` disables shimmer and exposes `window.__motes`; `?state=<URI-encoded JSON>` (from Task 8) now merges over the sampled state.
- Layout: each section is a `<section>` of height `length × 100vh` containing a sticky text panel (max-width 28rem, left gutter, readable on `#0B0D12`); the canvas is `position: fixed`, `aria-hidden="true"`; each section carries `data-alt` text in a visually hidden element.
- Render loop: rAF; skip rendering while `document.hidden`; `webglcontextlost` → `preventDefault()`, stop the loop, add `body.no-webgl`.
- Story slice (draft gist copy, `draft: true`, ≤ 80 words each — final copy is the author's):
  - `01-vibe-build` (length 3): the vague prompt; the swarm builds something impressive; it's the wrong machine.
  - `02-rewind` (length 2): scroll back; vibing the spec doesn't skip the spec, it defers it.
  - `03-spec` (length 3): commander's intent — purpose, end state, constraints; the ghost appears.
- `keyframes.json` (section-relative `at`):
  - vibe-build: `provenance.vibed` 1 throughout; `mech.variant` 1; `mech.assembly` 0 @0 → 1 @0.7 (outCubic); `mech.drive` 0 @0 → 2 @1; camera wide `pos [0,1.5,14]` @0 → `[3,1,10]` @1; `ghost` 0.
  - rewind: `assembly` 1 @0 → 0 @0.8 (inOutQuad); `drive` 2 → 0; `variant` 1 → 0 @0.9; `provenance.vibed` 1 → 0 @0.9..1; camera pulls back to `[0,0,16]`.
  - spec: `ghost` 0 @0 → 1 @0.3; `assembly` 0 @0.2 → 0.45 @1 (core settles first per Task 6 settle ranges); camera close `pos [-1.2,0.3,5]`, `target [-0.9,0,0]`, `fov` 35; `drive` 0 → 0.5.

- [ ] **Step 1: Failing e2e** `app.spec.ts`:
  - `/?test=1&p=0.5`: `__motes.progress()` within 0.002 of 0.5; the section containing 0.5 is in view.
  - **Resize:** at `p=0.42`, set viewport 1280×800 → 900×700, `settle()`, progress within 0.002 of the pre-resize value.
  - **Context loss:** call `WEBGL_lose_context.loseContext()`; no `pageerror`; `body` has class `no-webgl`; first section panel text visible.
  - **Hidden tab:** override `document.hidden` to true + dispatch `visibilitychange`; `frames()` stops increasing over 300ms; restore → increases again.
  - Out-of-range: `?p=1.7` → progress 1; `?p=-3` → 0; `?p=abc` → 0.
- [ ] **Step 2–4:** Run (FAIL), implement, run (PASS).
- [ ] **Step 5:** Commit `feat: app wiring and first story slice (vibe build, rewind, spec)`.

---

