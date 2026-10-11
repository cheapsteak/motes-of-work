### Task 7: GLSL `mote()` and parity page

**Files:**
- Create: `src/scene/mote/mote.glsl`, `src/parity/parity.html`, `src/parity/parity.ts`, `e2e/parity.spec.ts`; Modify: `vite.config.ts` (add page input).

**Interfaces:**
- Consumes: Task 6 algorithm, `packPartTexture`, `buildMoteAttrs`.
- Produces (GLSL, `#version 300 es` compatible, included via `?raw` string concatenation):
  ```glsl
  struct MoteAttrs { vec3 local; vec3 localTwin; float part; float seed; float settle; float role; vec3 type; vec3 visible; };
  struct MoteOut { vec3 pos; float type; float brightness; float visible; float settled; };
  uniform sampler2D uParts;  // RGBA32F, width = 2*partCount, row = copy
  uniform float uAssembly, uVariant, uDrive, uDrift, uVibed, uMisallocated;
  uint pcg(uint v); float hash01(uint seed, uint salt);
  MoteOut mote(MoteAttrs a, int copy);
  ```
- Parity page: builds attrs for 256 gear points, stores them in float textures, renders a 16×16 RGBA32F target where each fragment writes `vec4(mote().pos, settled)`, reads back with `readRenderTargetPixels`, compares with TS `mote()`; exposes `window.__parity = { cases: { name: string; maxError: number }[] }`.

- [ ] **Step 1: Failing e2e test** `parity.spec.ts`: open `/src/parity/parity.html?test=1`, wait for `window.__parity`, assert every case `maxError < 1e-3`. Cases: assembly 0 / 0.5 / 1; variant 0.5; drift 1 with drive 0.37; vibed 0.5 + misallocated 0.3; all faults 0.6 at drive 0.71.
- [ ] **Step 2:** Run `npx playwright test e2e/parity.spec.ts` — FAIL.
- [ ] **Step 3:** Implement `mote.glsl` (uint arithmetic for `pcg`; texelFetch with NEAREST) and the parity page.
- [ ] **Step 4:** Run — PASS. If a case fails, fix the GLSL, never loosen the tolerance.
- [ ] **Step 5:** Commit `feat: GLSL mote() with TS parity test`.

---

