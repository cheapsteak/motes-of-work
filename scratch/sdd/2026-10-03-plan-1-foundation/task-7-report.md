# Task 7 report: GLSL `mote()` and parity page

Status: DONE_WITH_CONCERNS (one deviation from a controller ruling, explained below)
Commit: d0bdd20 feat: GLSL mote() with TS parity test

## What I implemented
- `src/scene/mote/mote.glsl`: includable library with no `main()`. It contains the brief's `MoteAttrs`/`MoteOut` structs, `uParts` plus the six float uniforms, `uint pcg(uint)`, `float hash01(uint, uint)` and `MoteOut mote(MoteAttrs a, int copy)`. It also adds the helpers `moteSinCos`, `moteRotate` and `moteSpawnPoint`. It ports mote.ts step by step: scenario k, the mix rest, the quaternion rotate plus position read with `texelFetch(uParts, ivec2(2*part(+1), copy), 0)`, drift from the pre-drift rest, smoothstep settle, spawn, the Bezier with the `(1,0,0)` fallback, and the outputs. TAU is 6.283185307179586.
- `src/parity/parity.html` and `src/parity/parity.ts`: use `RawShaderMaterial` with `glslVersion: GLSL3`, built by `?raw` concatenation of a precision prelude, `mote.glsl` and a test `main()`. The page:
  - takes 256 gear points (`samplePoints(256, 7)`) and packs their attributes into an 80×16 RGBA32F DataTexture (5 texels per mote, NEAREST);
  - renders into a 16×16 FloatType/RGBA target with NoBlending and reads it back with `readRenderTargetPixels` into a Float32Array.
  - Each mote case draws twice: mode 0 writes `vec4(pos, settled)` as the brief says, and mode 1 writes `(type, brightness, visible, 0)`, so scenario and type selection are checked too. `maxError` is the maximum absolute difference over all 7 outputs.
  - Shader compile errors are captured through `renderer.debug.onShaderError` and reported in `window.__parity.error`.
- Cases in `window.__parity.cases`:
  - The brief's 7: `assembly 0`, `assembly 0.5`, `assembly 1`, `variant 0.5`, `drift 1 at drive 0.37`, `vibed 0.5 + misallocated 0.3`, `all faults 0.6 at drive 0.71`. The last one sets all 7 faults to 0.6.
  - `copy row 1`: an extra case. The part texture has 2 rows and row 0 holds a decoy pose, so it checks the `copy` row index that Task 8 will rely on.
  - `hash01`: 256 (seed, salt) pairs, made of the gear seeds with salts 1..12 plus edge pairs (seeds 0, 1, 0x800000, 0xabcdef, 0xffffff; salts 0, 12, 255).
  - `pcg goldens`: pcg(0), pcg(1) and pcg(12345) against the BigInt goldens. Each value is read back exactly as hi16/lo16 floats.
- `e2e/parity.spec.ts`: opens `/src/parity/parity.html?test=1` and waits for `__parity`. It asserts no page errors, no `error`, the exact set of case names (so a missing case cannot pass), and every `maxError < 1e-3`. It also asserts `hash01 < 1e-7` and `pcg goldens === 0`.
- `vite.config.ts`: `build.rolldownOptions.input` = { main: index.html, parity: src/parity/parity.html }. I used `rolldownOptions` because `rollupOptions` is deprecated in Vite 8. The build emits `dist/src/parity/parity.html`, so the brief's URL works unchanged under `vite preview`.

## Two GLSL fixes found by the parity test (tolerance not loosened)
1. **Seed conversion. This deviates from the controller ruling.** `uint(x + 0.5)` is wrong for odd seeds in [2^23, 2^24). In that range the float32 ulp is 1, so `seed + 0.5` rounds to the even neighbour and you get seed+1. The hash01 case caught this: errors up to 0.92 on seeds 16777215, 12571395 and 15635687, while pcg goldens and even seeds were exact. I use `uint(round(x))` and `int(round(x))` instead, which is exact for every integer below 2^24. **Task 8 must use the same conversion, not `+ 0.5`.**
2. **sin/cos precision.** SwiftShader's builtin sin/cos have about 1e-4 absolute error, and the spec only asks for about 2^-11. Multiplied by the spawn radius (up to 12), that gave errors of 2.1e-3 in x/y for `assembly 0`, `assembly 0.5` and `copy row 1`; z, which uses no trig, matched to 1e-7. I added `vec2 moteSinCos(float)`, which does a Cody-Waite reduction by π/2 (3-part constant) and then Taylor polynomials on [-π/4, π/4], with about 1e-7 error. It replaces every sin/cos in the library, including the drift terms. It also makes results consistent across GPUs.

I changed no TS-side code: mote.ts, hash.ts and transform.ts are untouched.

## Results (SwiftShader)
| case | maxError |
|---|---|
| hash01 | 4.4e-8 |
| pcg goldens | 0 |
| assembly 0 | 6.9e-6 |
| assembly 0.5 | 8.9e-6 |
| assembly 1 | 1.1e-7 |
| variant 0.5 | 1.1e-7 |
| drift 1 at drive 0.37 | 6.3e-7 |
| vibed 0.5 + misallocated 0.3 | 1.1e-7 |
| all faults 0.6 at drive 0.71 | 2.5e-7 |
| copy row 1 | 1.0e-5 |

Mutation checks, run by hand and then reverted:
- Ignoring the `copy` row in `texelFetch` makes `copy row 1` fail with 3.5.
- Swapping the vibed and misallocated scenario indices makes `vibed 0.5 + misallocated 0.3` fail with 1.0.

So both checks discriminate.

## TDD evidence
- RED: `npx playwright test e2e/parity.spec.ts` gave `Test timeout of 30000ms exceeded ... page.waitForFunction`. This was expected because the page did not exist yet.
- Intermediate RED, after implementing: `Error: hash01 ... Expected: < 0.001, Received: 0.924649746157229`. That was the seed rounding bug; the `+0.5` → `round` fix resolved it. After that, the remaining 2.1e-3 failures on `assembly 0`, `assembly 0.5` and `copy row 1` came from sin/cos, and the moteSinCos fix resolved them.
- GREEN: `npm run typecheck` is clean; `npm test` gives 111 passed (10 files); `npm run e2e` gives 2 passed (smoke + parity).

## Files changed
- Created: `src/scene/mote/mote.glsl`, `src/parity/parity.html`, `src/parity/parity.ts`, `e2e/parity.spec.ts`
- Modified: `vite.config.ts`

## Self-review / concerns
- **Deviation from the controller ruling:** `uint(round(x))` instead of `uint(x + 0.5)`. The ruling is incorrect for odd seeds ≥ 2^23, and Task 8's vertex shaders should follow mote.glsl.
- **Library precision:** mote.glsl declares `uniform highp sampler2D uParts;` and expects the including shader to set `precision highp float/int`. The parity prelude does this, and three's non-raw ShaderMaterial does it automatically. The library uses the uniforms `uAssembly`… and `uParts`; if Task 8 also declares them in a fragment shader with different precision, linking will fail, so it should include the library only in the vertex shader.
- **Build warning:** the chunk-size warning (>500 kB) comes from the three.js chunk and was already there when three lived in the main chunk; it is not new.
- **Extras beyond the brief:** the `copy row 1` case and the mode-1 type/brightness/visible readback. Both are small and catch real porting errors.
- **Unused flag:** `?test=1` is accepted but the page does nothing different with it; there is no shimmer on this page.
