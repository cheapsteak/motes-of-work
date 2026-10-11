# More motes for the same hardware tax — research findings

Status: complete (written incrementally; a container restart killed the first attempt).
Date: 2026-10-09. Question from the author: "Are there any clever tricks people have used to increase
particle count without increasing hardware tax?" and "Being able to utilise shaders more does sound like
something we should investigate." Weighted toward shader-driven approaches.

Source tiers used throughout: T1 codebase / direct test · T2 official docs / papers · T3 blogs, talks,
forum posts · T4 unverified.

---

## 1. How the renderer submits dots today (T1: read of `/home/user/motes-of-work/src`)

### 1.1 Submission model

Every dot in Act II is **one instance of a 4-vertex indexed quad** (`InstancedBufferGeometry`, `aCorner`
in [-1,1]², index `[0,1,2,0,2,3]`), expanded in clip space in the vertex shader:

```glsl
clip.xy += aCorner * (px / uViewport) * clip.w;   // shell.vert.glsl emit(), star.vert.glsl, mote.vert.glsl
```

- `RawShaderMaterial`, `GLSL3` (WebGL2 required), `depthWrite: false`, `transparent: true`,
  `frustumCulled = false` on every mesh (positions are shader-computed, so three.js cannot cull).
- **Blending is "screen"**: `CustomBlending`, `One, OneMinusSrcColor`, fragment output premultiplied
  (`mote.frag.glsl`, `star.frag.glsl`). The bhmock reference page instead uses **additive** `One, One`
  (and the re-skin spec §4.2 adopts additive for the hole's dots).
- Fragment shaders `discard` outside the unit circle; a point is a hard disc with a 1 px edge.
- The design spec (§6.4) **rejected `THREE.Points`/`gl_PointSize`** deliberately: point-size caps vary
  (M1/M2 reportedly 64 px, T4), points clip inconsistently at screen edges, and `WebGPURenderer`
  draws only 1 px points. The caps spike (`src/spikes/caps.ts`) records `ALIASED_POINT_SIZE_RANGE`
  to confirm this on devices. The bhmock reference page **does** use `THREE.Points` + `gl_PointSize`
  with `gl_PointCoord` discs, so the two are not like-for-like on vertex cost today.

### 1.2 Draw calls (Act II, galaxy on screen)

`bodySystem.ts`: `net-tracks`, `net-bodies` (instanced icospheres, 320/80 tris), `net-streams`,
`net-feed`, `net-shells`, `net-persons`, `net-glow`, `net-ring`, plus 6 `net-copy-*` and `net-ticks`
only during the freeze hold. `galaxySystem.ts`: `galaxy-haze`, `galaxy-dust`, `galaxy-stars`,
`galaxy-bright`. Act I's `moteSystem` adds `motes` (2 quads/instance), `threads`, `ghost`.
So roughly **12–15 draw calls** in a normal Act II frame — draw-call count is **not** a bottleneck.

### 1.3 Instance counts (T1: spec §7 of `2026-10-09-act-2-reskin.md`, `generate.ts fitBudget`)

Today `galaxyBudget(100,000) = 76,000`, drawn 75,908: shells 56,715 · persons 1,589 · tracks 14,780 ·
bodies 351 · glow 36 · streams 2,437. Background on top (not in the budget): phone 2,400 stars +
4,000 dust; desktop 4,000 + 8,000 (`background.ts BG`). The re-skin moves the cap to 93,500 (hole
27,610 of which disk 18,000; stars 7,680; the rest planets/moons/tracks/streams). During the zoom-out
the bike's 100,000 instances are drawn **as well** (spec §7: "they already draw together").

### 1.4 Per-dot attribute bandwidth

Shell/person/glow sets: `aLL` vec2 + `aMote` vec4 + `aFlight` vec4 = **40 bytes/instance** of
float32, plus the shared 4-vertex quad. Tracks: vec4 (16 B). Streams: vec2 (8 B). Background stars:
vec4 (16 B). Nothing is packed (no `Int16`/`Uint8` normalized attributes). Per-body data lives in
three RGBA32F `DataTexture`s read by `texelFetch` (bodies 6 texels/row, streams 6, shells 7).

### 1.5 Per-frame CPU uploads

One: **`uShellTex` is repacked and re-uploaded every frame the ambient changes** (`bodySystem.ts
update()`: `packShellData(g, ambient)` → `shellTex.needsUpdate = true`). It is `bodies × 7 texels ×
16 B` ≈ 351 × 112 B ≈ **39 KB/frame** — small, but it is a per-frame CPU→GPU upload and a
per-frame CPU pack over every body. Everything else per frame is uniforms (`uSysPx[32]`,
`uGlowCap[40]`, ~30 scalars) and the CPU LOD pass (`project()` over 30 systems + glow caps, O(n²) over
≤40 sprites). No per-frame attribute buffer writes. **Good.**

### 1.6 What the vertex shader does per dot

`shell.vert.glsl` runs the full `bodyMote()` chain per **vertex**, i.e. **4× per dot**: `bodyTexel`
fetches (27 `texelFetch` sites in `bodyMote.glsl`, 5 in `orbit.glsl`, 1 in `bodyScreen.glsl`), a
Cody-Waite `moteSinCos` (two 9-term polynomials), PCG hashes, orbit solve for the host chain
(moon → planet → star), derp, shell warp, spin, lod, light, freeze dressing. `bodyAcross(row)` is
computed even for the dots that are then hidden. A quad hides itself by writing `MOTE_HIDDEN`
(clip (2,2,2,1)) — the vertex cost is paid in full for a hidden dot; only the fragment cost is saved.

### 1.7 Level of detail (T1: `lod.ts`, `lod.glsl`)

LOD is **brightness-ramp by projected system size** (`lodGain` smoothstep over `LOD_BANDS`; invisible
under `LOD_VISIBLE = 0.02`), plus a per-shell **density compensation**:
`density = min(1, LOOK_DENSITY·π·bodyPx² / (0.5·N·px²) / lit)` — each mote carries no more than its
share of the disc, so a dense lattice seen small stays its own blue, not a white blot. `detailPx`
holds at most `FULL_DETAIL_MAX = 2` systems at full detail. Moons hand over point ↔ dotted sphere by
`moonSphereGain(across)`. **LOD never reduces the instance count submitted** — hidden motes still run
the vertex shader. There is no "merge distant clusters into one brighter dot" step beyond the
star glow sprite standing for a shell under 1–3 px (`LOOK_SHELL_FADE_*`).

### 1.8 Testing constraints that any trick must respect (T1)

- `e2e/purity.spec.ts`: reaching the same integer `scrollY` by jump, forward scroll, or overshoot must
  render **byte-identical** pixels — no tolerance. Any temporal trick (TAA, stochastic transparency,
  checkerboard, frame-indexed jitter) is excluded unless its frame index is itself a pure function of
  (scroll, ambient), which test mode freezes.
- `e2e/parity.spec.ts` + `src/parity`: GLSL vertex libraries are run as `gl.POINTS` into a float
  render target via `gl_InstanceID` and compared **field by field** with the TS twins (`?lib=orbit`,
  `derp`, `shell`, `lod`, `body`, `freeze`), tolerance ~1e-3 world units. A per-pixel field has no
  per-dot position to twin — see the Shader-first section for what its parity check would be instead.
- The purity spec records **"A frame costs about 2.4 s under SwiftShader (100k instanced motes,
  vertex-bound at any viewport size)"** — a direct T1 measurement that under the software renderer the
  essay is **vertex-bound**, not fill-bound.

### 1.9 The likely phone bottleneck (judgement from the above)

1. **Vertex work, by a wide margin.** ~76k (→93.5k) instances × 4 vertices × a very heavy vertex
   program (≈30 texel fetches, two polynomial sin/cos, several hashes, an orbit chain) = ~300–375k
   heavy vertex invocations per frame for the galaxy alone, and 400k more (lighter) for the bike
   during the zoom-out. Mobile GPUs (Apple A/M, Mali, Adreno) are tile-based: all vertex shading for
   the frame runs in the binning pass **before** any fragment work, and the varyings for every visible
   primitive are written to memory. Four vertices per dot quadruples both the ALU and the
   varying-write bandwidth versus one vertex per dot. SwiftShader's "vertex-bound at any viewport
   size" is consistent with this.
2. **Fill/overdraw is small today**: dots are 1–2 CSS px (2–4 device px at DPR 2), so a 93k-dot frame
   touches at most ~1.5 M fragments even with every dot visible — about half a 390×844@2 screen
   (2.6 M px). The large sprites (glow ≤24 px, haze 56 px) are a few dozen. Overdraw becomes relevant
   only where the hole's 18k disk dots pile into ~25 px at the galaxy wides (spec §4.2 "the small
   hole") and when the re-skin enlarges dots by `(MOCK/ours)^¼`.
3. **Attribute bandwidth**: 40 B × 57k ≈ 2.3 MB/frame for shells — real but secondary on a phone's
   ~30–60 GB/s. Packing halves it; a `gl_VertexID`-only scheme removes it.
4. **CPU**: the per-frame shell texture repack (~39 KB) and the LOD projection are cheap; three.js
   overhead for ~15 draws is negligible.
5. **Draw calls**: not a factor.

So the levers, in order of expected payoff on a phone: (a) cut vertex invocations per dot (one triangle
or one point per dot, 3× or 4× fewer); (b) move the dot field for dense regions (the disk) into the
fragment shader so the vertex count is O(quads), not O(dots); (c) skip the heavy vertex path for
hidden/LOD-faded dots early; (d) pack attributes / go attribute-less; (e) keep fill in check with the
density compensation already in place and a resolution cap for the dense layer.

---

## 2. Web research — the tricks

Legend for "fit": **Purity** = frame stays a pure function of (scroll, ambient) · **Twins** = a TS twin
can still be checked by `?lib=` parity · **Stills** = frozen SwiftShader stills stay deterministic ·
**Phone** = helps on 390×844@2 tile-based GPUs. Effort: S (hours) · M (a day or two) · L (a week+).

### 2.1 Point sprites vs instanced quads vs one triangle per particle

**What.** Three ways to put a dot on screen: `gl.POINTS` with `gl_PointSize` (1 vertex/dot);
instanced 4-vertex quads (today; 4 vertex invocations/dot, 2 triangles); one instanced *triangle*
that circumscribes the disc (3 vertex invocations/dot, 1 triangle, ~30 % more rasterized area than the
quad: a triangle enclosing a unit circle has area 3√3 ≈ 5.2 vs the quad's 4).

**Evidence.**
- Point-size caps: Apple forum report of `ALIASED_POINT_SIZE_RANGE` max **64** on M1/M2 Safari
  (iPad, MacBook Pro), "every other device has minimum of 512, usually 1024" — Sept 2022, one post,
  no replies (T4, unverified; it is the spec's own cited source). Historical webglstats values span
  1, 63, 64, 100, 128, 255, 256 … 32786 (Khronos public_webgl, Feb 2014, T3). The project's own
  `caps.html` spike records this on test devices (T1 once run). web3dsurvey has no page for it (404).
- Point clipping: Khronos WebGL #2888 (May 2019, kdashg, still open): iPhone 6+, Pixel 2 XL and an
  NVIDIA GT 750M drop a point as soon as its *centre* leaves the viewport; Intel/GTX 1060 keep the
  partial point. Proposed resolution "point clipping is undefined"; workaround "draw quads" (T2:
  working-group issue).
- Vertex vs fill trade: Ericson, *Optimizing the rendering of a particle system* (Jan 2009, T3): trim
  the quad to an n-gon close up, fall back to a quad at distance because you become vertex-bound; also
  1/4 and 1/16-resolution particle buffers. Khronos/gamedev threads (T3): one triangle cuts vertices
  and indices by a quarter, costs up to ~2× the fill of a tight quad if badly chosen; "good if you are
  geometry limited but not fill-rate limited".
- Imagination, *Improving particle systems on PowerVR* (13 Nov 2019, T3 vendor blog): alpha-blended
  particles defeat hidden-surface removal; keep the overdraw counter near 1.0, "consistently higher
  than 2.0 may start affecting performance"; tighter meshes cost vertices, "acceptable unless the
  application is vertex-limited".
- three.js discourse 20293 (30 Oct 2020, T3): Mugen87 says Points beat a circle mesh because one
  point is cheaper than several triangles — no measurement.
- WebKit bug 230749 (T3): a Safari 15 iOS slowdown hit both a `gl.POINTS` demo and a quad version;
  iPhone 7 Plus and Pixel 3 ran both at 60 fps; "the quad path is less efficient with draw calls than
  our points rendering path".
- T1 (this repo): the essay is vertex-bound under SwiftShader (`purity.spec.ts`); dots are 1–2 CSS px,
  so fill is not the limit (§1.9). The bhmock reference uses `gl.POINTS`, the essay quads.

**Expected gain.** Quads → one triangle: **−25 % vertex invocations**, −25 % index fetches, ~+30 %
rasterized fragments on dots that are already tiny (negligible on 2–4 device-px dots: the extra corner
is sub-pixel). Quads → points: **−75 % vertex invocations** and no `aCorner`/index stream, but points
are capped (a 64 cap is under the 56 CSS px haze at DPR 2 = 112 device px), pop at the centre on some
phones (a 2 px dot pops one pixel early: invisible; a 24 px glow pops visibly), and `WebGPURenderer`
draws 1 px points (a future-proofing cost). A hybrid is sound: **points for the ≤ 4 CSS px dots**
(shells, dust, streams, tracks, hole disk/jets — >95 % of instances), **quads for the few dozen
glow/haze sprites**.

**Fit.** Purity ✓ (no state). Twins ✓ (the vertex library is unchanged; only `emit()` changes).
Stills ✓ but *every* still changes by a pixel here and there (point rasterization rounds the centre
differently from a quad's edge function; the mock's `gl_PointCoord` disc is the same maths as `vUv`).
Phone ✓✓ — this attacks the measured bottleneck directly. Risk: the spec's §6.4 decision was explicit;
revisiting it needs the `caps.html` numbers from the real test phones.

**Effort.** One triangle per dot: **S** — change `QUAD`/`QUAD_INDEX` to 3 corners
(e.g. (−√3,−1),(√3,−1),(0,2)) and keep `vUv = aCorner` (the fragment's `r > 1 discard` already clips
the corners). Points hybrid: **M** — a second material path (`gl_PointSize`, `gl_PointCoord`), per-set
choice, and re-baselining the stills.

### 2.2 `gl_VertexID`-only particles (no attribute buffers)

**What.** WebGL2 gives `gl_VertexID`/`gl_InstanceID`; a dot's identity is its index, every per-dot
constant is a hash or a `texelFetch` of that index — no `aLL`/`aMote`/`aFlight` streams at all.
webgl2fundamentals, *Drawing without data* (T3 reference tutorial): "gl_VertexID … effectively serves
as a vertex counter". Khronos forum (T3, old ATI anecdote): keep a VAO bound and a dummy attribute for
driver safety.

**Evidence of gain.** No measured WebGL benchmark found. Mechanically it removes the 40 B/instance
fetch (2.3 MB/frame for shells) and the generator's attribute packing step. On tile-based GPUs the
vertex fetch is a memory read that competes with varying writes (Arm Mali blog, *Memory limits with
Vulkan on Mali*, 2019, T3: all varyings go to a memory region before fragment shading; vertex load
"ties directly to memory bandwidth").

**Fit.** Purity ✓. Twins ✓✓ — in fact *easier*: the TS twin already derives everything from
`(row, index, seed)`; `instanceAttrs()` becomes a function of `gl_InstanceID`. Stills ✓ (identical
output if the derivation is identical). Phone ✓ (bandwidth, secondary). But the shell set is *not*
uniform: each body has its own lattice size, so "which body does instance k belong to" needs a prefix
sum lookup (a small texture of body start offsets + a binary search, or one texel per instance — which
is the attribute buffer again in texture form). Streams and tracks (`aDot = (row, i)`) are the natural
first candidates: `row = gl_InstanceID / STREAM_DOTS_MAX`, `i = gl_InstanceID % …`.

**Effort.** M for streams/tracks/background; L for shells (prefix-sum texture + parity plumbing).
Gain is secondary to §2.1 and §2.3; do it only where it also simplifies code.

### 2.3 Impostors and procedural dot fields in the fragment shader

**What.** Draw a dense region (the black-hole disk, a jet sheath, the background dust) as a **few
quads (or one coarse mesh) whose fragment shader hashes dots onto a grid** in the region's own
coordinates (for the disk: ring index × angular cell in the *unsheared* frame), evaluates the ≤ 9
neighbouring cells' dots per pixel, and sums their discs. Vertex count is O(mesh), not O(dots);
fragment cost is O(pixels covered × cells checked), independent of dot count. Keplerian shear is applied
**analytically per pixel**: φ₀ = φ − ω(r_ring)·t, with ω per ring so dots inside a ring rotate rigidly
and shear only between rings (exactly the mock's `phi = aPhi + ω(r)·t` sampled at ring centres).

**Evidence.**
- Grid-hash star fields: gamedev.net *Randomness from a hash* tutorial (T3), Godot ports of Martijn
  Steinrucken's "The Art of Code" starfield (T3; Shadertoy's default licence is CC BY-NC-SA 3.0 —
  don't copy code, the idea is public domain): floor the coordinate into a cell, hash the cell, place a
  star by the hash, layer for parallax, stable because it depends on position only.
- Per-pixel accretion disks: *Gargantua* (three.js discourse 94960, 3 Oct 2026, T3): the disk is
  "Keplerian fbm noise with two cross-faded epochs so the shear never winds it into sub-pixel rings",
  one full-screen draw, 190–340 integration steps/pixel, 8 jittered frames accumulated (**impure** —
  not for us), phone performance unverified. Bruneton's `black_hole_shader` (WebGL2, 2020, T2-adjacent:
  based on his published lensing precomputation) renders disc + stars per pixel.
- Why the per-primitive pipeline is the ceiling: Schütz, Kerbl, Wimmer, *Rendering Point Clouds with
  Compute Shaders and Vertex Order Optimization*, Computer Graphics Forum 40(4), July 2021 (T2):
  compute rasterization "outperform[s] the hardware pipeline by up to an order of magnitude"; an
  optimized vertex order alone "boost[s] the efficiency of GL_POINTS by a factor of 5x" (RTX 3090,
  796 M points at 62–64 fps). Per-primitive submission is the expensive part; a per-pixel field is the
  WebGL-available way to skip it (no compute needed).
- T1: the prototype in this scratchpad (see **Shader-first** below) draws a 26k-equivalent disk with
  two draws of a ~4k-vertex mesh and measures the fragment cost.

**Expected gain.** The disk's **18,000 instances (72k vertex runs) → ~4k mesh vertices per image**,
i.e. −90 % of that part's vertex work, and the dot count can rise to 50k–100k for *zero* extra vertex
cost and small extra fragment cost (more dots per cell = a longer inner loop, only inside the disk's
footprint, ~10 % of a phone screen at the close shots). Same for the jets (two cones) and the
background dust (a disc). Fragment cost: footprint px × 9 cells × K dots × ~20 ALU ≈ for a 300×300 px
disk at DPR 2 (360k px) × 9 × 4 ≈ 13 M dot tests — fine on a phone GPU (hundreds of GFLOPs), heavy
but bounded under SwiftShader.

**Fit.** Purity ✓✓ (pure function of (pixel, ambient)). **Twins ✗ as they exist** — there is no
per-dot position for `?lib=` to read back. The replacement check is **centre sampling**: the TS twin
*enumerates* the same dots (cell → hash → centre, radius, brightness at ambient t: the enumeration is
the twin), forward-projects each centre through the same lens maths (the mock's `lens()` is 20 lines
and already a TS-twin candidate) and the test reads the rendered pixel there, asserting it is lit at
≥ the expected premultiplied value; plus N "dark" samples ≥ 2 dot radii from every enumerated centre
assert near-black. That is as strong a determinism check as a field admits, and it also pins the dot
*count* (the enumeration's length) for the budget tests. Stills ✓ (deterministic; SwiftShader's
`dFdx/fwidth` are deterministic). Phone ✓✓ for dense regions. **Look risk**: a hashed grid shows its
lattice unless jitter is a full cell and ≥ 2 dots per cell; the mock's streaks (groups sharing an r)
must be re-expressed as ring-local runs; dots in a sheared cell stay round because the shear is applied
to the *lookup*, not the disc. "Everything is dots" holds at phone size as long as each dot is a
discrete disc ≥ 1 device px — which the field guarantees by construction (the disc radius is set in
device px via the derivative of the unbent coordinate).

**Effort.** **M–L**: the field shader (~150 lines), its TS enumerator (~80), the centre-sampling parity
page, and the budget-test rewiring (`instances.reserved` → "field dots" counted from the enumerator).

### 2.4 Hybrids: true particles where dots read individually, field density elsewhere

**What.** Keep instanced dots for anything a reader can single out and that the story addresses
(the strands, the knots, the in-fall streaks, the ring, every planet/moon mote, the spikes, the star
cores) and use the §2.3 field for the undifferentiated mass (disk diffuse share, jet sheaths,
background dust and dim stars). The seam is hidden because both are additive discs of the same px size.

**Evidence.** Standard practice in large star renderers: Gaia Sky draws per-star only what passes an
octree solid-angle threshold θ (recommended 60–80) and aggregates the rest by level (Gaia Sky LOD docs,
T2 project docs). Potree's adaptive point size grows points as the LOD thins them (Schütz, CESCG 2015,
T2) and continuous LOD (Schütz, Krösl, Wimmer, IEEE VR 2019, T2) removes the density pops of chunked
LOD. The essay already has the first half (`glow` sprite stands for a shell under 3 px; `density`
compensation) — T1.

**Expected gain.** Of the hole's 27,610 instances, ~22,800 (disk + arch + jets) are field-able;
~4,800 (knots, ring, infall, strands) stay instances. Of the 93,500 cap, the field moves ~25–30k out
of the vertex budget. Fit as §2.3. Effort M (the split is by set, so it lands set by set).

### 2.5 Level of detail by projected size; merge distant clusters into brighter dots; density compensation

**What.** (a) Skip the heavy vertex path *before* `bodyMote()` when the system's `uSysPx` says the
element is under `LOD_VISIBLE` (today `bodyAcross(row)` and `bodyCentre()` run first — §1.6).
(b) When a shell is under N px, draw it as **one brighter sprite** and hide its motes: already done for
stars (`LOOK_SHELL_FADE`), not for the hole's disk at the wides (spec §4.2 `HOLE_SMALL` only *dims*;
a 25 px disk of 18k dots is 72k vertex runs for a 500-px² smudge). (c) Keep `density` compensation so
brightness is conserved: gain·size² = count ratio (spec §7 `holeComp`, T1).

**Evidence.** Potree adaptive point size / continuous LOD (T2, above); Gaia Sky θ threshold (T2);
the essay's own `detailPx`/`density` (T1). The Arm Mali architecture blog (T3 vendor) on why: all
vertex shading runs in the binning pass over memory; a hidden quad still costs its 4 vertex runs and
its varying writes (`MOTE_HIDDEN` is a *post*-shading decision).

**Expected gain.** (a) An early `return` in `shell.vert.glsl` on `sysGain < LOD_VISIBLE` saves the
~30 texel fetches and two sin/cos for every mote of a system drawn at star-only level — at the hood
and galaxy wides that is **most of the 57k shell motes** (`FULL_DETAIL_MAX = 2` systems are full).
GPUs execute the early return (the branch is uniform per instance). This is the single cheapest win.
(b) For the hole at the wides: an instance-count switch — draw `min(count, k·footprint_px²)` dots
(`geometry.instanceCount` from the CPU's projected size; pure, since it is a function of camera and
scroll) with `density`-style gain compensation. **Not** a dot-merge in the shader (would need a
neighbour search); the CPU already knows every system's `sysPx`.

**Fit.** Purity ✓ (instanceCount from state). Twins ✓ (the early return changes no computed field;
parity shaders force `uLodForce`). Stills: (a) ✓ identical; (b) changes the wides' pixels — re-baseline.
Phone ✓✓. **Effort S** for (a); **M** for (b).

### 2.6 Attribute packing

**What.** `aLL` (lat, lon) → `Int16 normalized` (2 B each); `aMote` (row ≤ 351, role ≤ 4, sys ≤ 32,
index ≤ ~1000) → one `Uint16×4` (8 B) or `UNSIGNED_INT_2_10_10_10_REV` for three fields; `aFlight`
(birth hash, seed, host) → `Uint32` seed + `Uint16`s. 40 B → **≈16 B/instance**, half the shell
stream's bandwidth, and 40 % less GPU memory for 93.5k instances.

**Evidence.** MDN `vertexAttribPointer` (T2): normalized BYTE/SHORT map to [−1,1], UNSIGNED to [0,1];
WebGL2 adds `INT_2_10_10_10_REV`. Khronos public_webgl thread (Dec 2012, T3): 8/16-bit attributes were
"extremely slow" on an ATI card and an iPad 3 when **misaligned**; fix: keep each attribute 4-byte
aligned (4×8-bit, 2×16-bit, 4×16-bit). Arm's best-practice summary (2017 blog, T3) lists "choosing
attribute precision", "laying out vertex attributes efficiently", "choosing precision for varying
outputs" among vertex-stage optimizations (the full guide 101897 was not retrievable here).

**Expected gain.** Bandwidth only: ~1 MB/frame saved at 93.5k instances. On a phone at 60 fps that is
~60 MB/s of ~30–60 GB/s — **≤ 1 %**. Real only if the GPU is memory-bound, which §1.9 argues it is
not. Fit: Purity ✓; Twins ✓ with care — a normalized int16 `lat` is quantized, so the TS twin must
quantize identically (`Math.round(v·32767)/32767`) or parity drifts past 1e-3 on the lattice positions.
Stills: sub-pixel shifts, re-baseline. **Effort M, low priority.**

### 2.7 Overdraw and fill-rate control on phones; a dense layer at lower resolution

**What.** (a) Keep dots ≤ 2 CSS px and halos capped (already: `PX`, `GLOW_CAP`, haze 56 px) — overdraw
is the alpha-blend's enemy on TBDR (PowerVR blog, T3: HSR cannot cull blended fragments). (b) Render
the dense additive layer (the hole, or the whole galaxy pass) into a **half- or ⅔-resolution render
target** and composite with one full-screen quad; the fill cost falls by the area ratio (2.25–4×).
Ericson (T3) used ¼ and 1/16 particle buffers in 2009; Unity/three.js forum threads (T3) note you
need a full-res target to composite into and that bilinear upscaling blurs edges and halos bright
sprites.

**Evidence of need.** Weak today (§1.9): a 93k-dot frame of 2–4 device-px dots is ≤ 1.5 M fragments
on a 2.6 M-px screen, far under overdraw 2.0. It becomes real if the re-skin enlarges dots
(`(MOCK/ours)^¼` → 1.1–1.3×) or draws the arch twice. **Expected gain on fill: 2–4× on that layer;
on the frame: small while vertex-bound.**

**Fit.** Purity ✓. Twins n/a. **Stills ✗✗**: a 1-px dot rendered at half resolution and upscaled is a
2-px blur — it breaks "1–2 CSS px dots", the crisp edge the frag shaders build, and every baseline.
At DPR 2 the honest version is "cap the layer's buffer at DPR 1.5" (a 1.8× fill saving, 1 CSS px dots
become 1.5 device px: still crisp-ish). Phone ✓ only if fill-bound. **Effort M.** Not recommended now.

### 2.8 Temporal tricks and how they interact with purity and frozen stills

**What.** Temporal accumulation (Gargantua's 8 jittered frames), stochastic/hashed transparency
(Wyman & McGuire, *Hashed Alpha Testing*, I3D 2017, T2; *Improved Alpha Testing Using Hashed Sampling*,
TVCG 2019, T2), checkerboard or interlaced particle updates (draw half the dots per frame).

**Fit.** **Purity ✗** for anything frame-indexed: `purity.spec.ts` compares byte-for-byte across
jump/forward/overshoot, so a frame counter is state. The one admissible form is **hashed** (not
stochastic) per-pixel decisions keyed on `(pixel, ambient)` — Wyman & McGuire's point is exactly that a
hash makes the noise "stable from frame to frame"; with the ambient frozen in test mode the frame is
reproducible. It buys nothing here, though: there is no alpha test and no multi-sample budget to spend.
**Recommendation: none.** Effort n/a.

### 2.9 WebGPU compute — readiness on phone Safari (versions and dates)

**Status (T2: gpuweb *Implementation Status* wiki, last edited 2 Oct 2026; WebKit blog *WebKit
features in Safari 26.0*, 15 Sep 2025).**
- Safari **26** (macOS Tahoe 26, iOS 26, iPadOS 26, visionOS 26): WebGPU shipping, enabled by default,
  **with compute shaders** ("adds compute shaders, which allow general purpose computations on the GPU").
  `navigator.gpu` needs iOS 26+ (WebKit bug 299237 comment, T3). iOS 18 and earlier: **none**.
- Chrome: desktop since 113 (May 2023); Android **121** on ARM/Qualcomm/Intel with Android 12+,
  **139** on Imagination with Android 16+; Samsung Xclipse "TBD"; Linux 144/147 partial.
- Firefox: Windows 141, macOS 145/147, Linux Nightly only ("expects to ship in 2026"), **Android
  behind a flag, off**.
- three.js: `WebGPURenderer` is a separate import path; the design spec (T1) already said "revisit once
  three.js stops calling it experimental and Firefox ships WebGPU on Linux and Android". Claims that
  r182 "recommends WebGPURenderer" come from 2026 blogs (T4, unverified against release notes).

**What compute would buy.** A compute pass could evaluate `bodyMote()` **once per dot** into a buffer
the draw reads (the design spec §6.4's "optional stateless position pass" — pure, recomputed every
frame), removing the 4× redundancy of §1.6 without changing the quad path; or rasterize points in
compute à la Schütz (T2, up to 10× over `GL_POINTS` on desktop). **Verdict for now:** iOS 26 is
~13 months old at this writing; a phone-first essay cannot require it, and a dual renderer doubles the
test matrix (SwiftShader has no WebGPU — stills would need Dawn on SwiftShader-Vulkan, another lane).
The same **position-pass** idea is available in WebGL2 today via **transform feedback** or a float
render target written with `gl.POINTS` (exactly what `src/parity/parity.ts` already does for the
twins) and read back in the quad vertex shader with `texelFetch(gl_InstanceID)`. **Effort L; defer.**

### 2.10 Culling under the text panel or off-screen in the vertex shader

**What.** Today a dot off-screen or under the text band still runs its full vertex program and is
rasterized (the rasterizer clips it; the band is a fragment-level `streamBandMask` for streams only).
Options: (a) **early-out** on a cheap projected test *before* `bodyMote()` — project the body's
centre (one `bodyWorld`, already needed) and write `MOTE_HIDDEN` if it is more than its system's
`uSysPx` outside the viewport or wholly inside the band rect; (b) `gl.SCISSOR_TEST` to exclude the text
band from the galaxy passes (free: the scissor is before fragment shading; three.js `setScissor`);
(c) `onScreen()` already feeds `detailPx` on the CPU — shells are built per body in order
(`buildShellAttrs`), so a per-system `setDrawRange` works for one contiguous run; several runs need
`multiDrawArraysInstancedWEBGL` or several meshes.

**Evidence.** Arm (T3) and the Mali patents (T3/T4): position shading of culled primitives is wasted
work on TBDR; varying shading can be skipped for culled primitives (IDVS) — so the win is the
*varying* and ALU work, not the position. T1: `MOTE_HIDDEN` after full evaluation (§1.6).

**Expected gain.** At the close shots, 28 of 30 systems are off-screen or tiny: an early centre test
saves their motes' heavy path (same mechanism as §2.5a — implement together). Scissor saves the band's
fragments (~25 % of the screen at the wides) for free. **Fit** Purity ✓, Twins ✓, Stills ✓
(identical if the test is conservative). **Effort S.**

### 2.11 Analytic Keplerian shear, so dots never need re-upload

**What.** φ(t) = φ₀ + ω(r)·t with ω = 3.1·r^−1.5, evaluated in the shader from static (r, φ₀) — the mock
already does this (T1, `DISK_VERT`), and the spec reduces the phase to turns via `orbitTurns` before the
trig for float safety (T1 §4.2). No per-frame buffer upload is needed for the disk; the only per-frame
upload in the galaxy is `uShellTex` (§1.5), which could also go: its content is `shapeAt(ambient)` per
body — a pure function of ambient that `shell.glsl` could evaluate from the static body row.

**Evidence.** T1 (mock + spec); Gargantua (T3) for the per-pixel variant and its one real hazard —
differential rotation winds any *continuous* texture into sub-pixel rings after a few turns, hence
"two cross-faded epochs". A **hashed dot field does not suffer this**: dots are discrete; a ring of
dots rotating rigidly stays a ring of dots; only *between* rings is there shear, and the dots there are
still discrete discs. Gain: removes the one per-frame upload (tiny) and keeps the disk's dots static.
Fit ✓✓ all round. **Effort S** (already the plan).


### 2.12 Sources consulted (tiered)

- T1 — `/home/user/motes-of-work/src/scene/{galaxy,node,mote}`, `src/galaxy/generate.ts`, `src/scene/node/lod.ts`, `e2e/purity.spec.ts`, `e2e/parity.spec.ts`, `src/parity/parity.ts`, `src/spikes/caps.ts`, `docs/specs/2026-10-02-motes-of-work-design.md` §6.4/§8/§10, `docs/specs/2026-10-09-act-2-reskin.md` §4.2/§7; the bhmock reference `blackhole.html`; the prototype measurements in `measure.json`.
- T2 — Khronos WebGL issue #2888 (point clipping, 2019): https://github.com/KhronosGroup/WebGL/issues/2888 · MDN `vertexAttribPointer` (normalized types): https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/vertexAttribPointer · Schütz, Kerbl, Wimmer, *Rendering Point Clouds with Compute Shaders and Vertex Order Optimization*, CGF 40(4) 2021: https://www.cg.tuwien.ac.at/research/publications/2021/SCHUETZ-2021-PCC/ (DOI 10.1111/cgf.14345) · Schütz, Krösl, Wimmer, continuous LOD, IEEE VR 2019: https://www.cg.tuwien.ac.at/research/publications/2019/schuetz-2019-CLOD/ · Schütz, *Rendering Large Point Clouds in Web Browsers*, CESCG 2015 (Potree adaptive point size) · Wyman & McGuire, *Hashed Alpha Testing*, I3D 2017: https://research.nvidia.com/labs/rtr/publication/wyman2017hashed · gpuweb *Implementation Status* wiki (edited 2 Oct 2026): https://github.com/gpuweb/gpuweb/wiki/Implementation-Status · WebKit, *WebKit features in Safari 26.0* (15 Sep 2025): https://webkit.org/blog/17333/webkit-features-in-safari-26-0/ · Gaia Sky LOD catalogs docs: https://gaia.ari.uni-heidelberg.de/gaiasky/docs/3.7.0/LOD-catalogs.html
- T3 — Apple Developer Forums thread 714831, M1/M2 point size 64 (Sept 2022, single post; the design spec files it as T4): https://developer.apple.com/forums/thread/714831 · Khronos public_webgl, point-size value census (2014): https://www.khronos.org/webgl/public-mailing-list/public_webgl/1402/msg00016.php · Khronos public_webgl, 8/16-bit attribute alignment (2012): https://www.khronos.org/webgl/public-mailing-list/public_webgl/1207/msg00045.php · Ericson, *Optimizing the rendering of a particle system* (2009): https://realtimecollisiondetection.net/blog/?p=91 · Imagination, *Improving particle systems on PowerVR* (2019): https://blog.imaginationtech.com/improving-particle-systems-on-powervr/ · Arm, *The Mali GPU: an abstract machine, part 2* and *Memory limits with Vulkan on Mali* (2019): https://developer.arm.com/community/arm-community-blogs/b/mobile-graphics-and-gaming-blog/posts/memory-limits-with-vulkan-on-mali-gpus · Arm best-practices guide summary (2017): https://developer.arm.com/community/arm-community-blogs/b/mobile-graphics-and-gaming-blog/posts/new-developer-guide-arm-mali-application-developer-best-practices (the guide 101897 itself did not load) · three.js discourse 20293 (Points vs InstancedMesh, 2020): https://discourse.threejs.org/t/better-performance-instanced-mesh-or-points/20293 · three.js discourse 94960, *Gargantua* (3 Oct 2026): https://discourse.threejs.org/t/gargantua-a-ray-traced-black-hole-in-my-portfolio-webgl-one-draw-call/94960 · WebKit bug 230749 (Safari 15 points/quads slowdown): https://bugs.webkit.org/show_bug.cgi?id=230749 · webgl2fundamentals, *Drawing without data*: https://webgl2fundamentals.org/webgl/lessons/webgl-drawing-without-data.html · gamedev.net, *Randomness from a hash*: https://gamedev.net/shaderlab/20-randomness-from-a-hash/ · Godot ports of The Art of Code starfield (CC BY-NC-SA on Shadertoy): https://godotshaders.com/shader/starfield-parallax-shader/ · Bruneton `black_hole_shader` (WebGL2, 2020): https://github.com/ebruneton/black_hole_shader · Khronos community thread on `gl_VertexID`-only draws: https://community.khronos.org/t/running-a-vertex-shader-without-any-per-vertex-attribute/69568
- T4 — 2026 blog claims that three.js r182 "recommends WebGPURenderer" (unverified against release notes); Mali patents on deferred varying shading (indicative only).

---

## 3. Shader-first prototype: the black-hole disk as a per-pixel dot field (T1)

**Where.** `<scratchpad>/particles/`:
`disk-field.html` (the prototype), `mock.html` (a copy of `bhmock/blackhole.html` with measurement
hooks only — `patch_mock.py`, `patch2.py`; the look is untouched), `measure.json` / `measure.log`
(the numbers below), `mock-*.png`, `field-26000-*.png`, `field-100000-*.png` (phone 390×844@2 and
desktop 1440×900@1, ambient 3 s, disk + underside arc only, same camera: elevation 16°, distance 75,
fov 45). Driven by a temporary Playwright spec under `motes-of-work/shots/` (deleted afterwards)
with the SwiftShader Chromium args.

**What it does.** One coarse annulus mesh (40 rings × 96 segments = **3,977 vertices, 7,680
triangles**, denser inside) drawn twice (image 0, image 1), its vertices pushed through the
reference's `lens()` **verbatim**, carrying the *unbent* disk point `(x, z)` as a varying. The
fragment shader: `r, φ` from the varying; the reference's Doppler/temperature/radial/gravity/outer
terms once per pixel; then for the pixel's ring and its two neighbours, `φ₀ = φ − fract(ω_i·t/2π)·2π`
(rigid rotation per 0.35-unit ring, Keplerian between rings, phase reduced to turns), the angular
cell `j = floor(φ₀/w)`, and for the 3×3 cells × K candidate dots a PCG hash (the essay's `hash01`
form) gives existence (density ∝ (3.5/r)^0.8), radial jitter, angular offset, brightness and
px size; each dot's disc is tested in device px using the varying's screen derivative
(`sqrt|det(dFdx, dFdy)|`), so dots stay round and px-sized through the lens's stretch. Additive
`One, One`, premultiplied, like the reference. A JS **enumerator** (the TS twin) lists the same
dots from the same hash, bisects the density to hit a target count, and forward-projects any dot's
centre through a JS port of `lens()` for the **centre-sampling parity check**.

### 3.1 Cost — measured under SwiftShader (software; phone-GPU numbers are *not* these)

| | draw calls | vertices submitted | triangles | fragments | SwiftShader median frame (phone 780×1688) | (desktop 1440×900) |
|---|---|---|---|---|---|---|
| **Reference, 26,000 dots** (`gl.POINTS`, image 0 + arc) | 2 | **52,000** points | 0 | ≈ 490k (Σ point-sprite squares: 326k + ~163k, estimate) | **54–99 ms** across runs (min 60) | **50–71 ms** (min 39) |
| **Field, 26,000-dot equivalent** (K = 15, 3,845 cells) | 2 | **7,954** (2 × 3,977) | 15,360 | **114,858** px covered (image 0; image 1 only 104 px — see limits) each running 9 × 15 = **135 dot tests** | **903–1,340 ms** across runs (min 759) | **288–484 ms** (min 288) |
| **Field, 100,000-dot equivalent** (K = 58) | 2 | 7,954 | 15,360 | 114,858 px × 522 tests | **3,200–3,940 ms** (min 2,679) | **1,057–1,517 ms** (min 858) |
| *What the essay would submit for the spec's 18,000-dot disk as instanced quads* | 2 | **72,000** vertex runs of `shell.vert`-class cost | 36,000 | ≈ 340k | — | — |

Timing = `renderer.render()` + a 1-px `readPixels` (the sync), median of 5, after one warm render.
`gl.finish()` alone returned in 0.2 ms under ANGLE/SwiftShader and was not trusted.

**Reading it honestly.** The field turns **vertex work into fragment work**: −85 % vertices
(−89 % against the essay's quad path), but every covered pixel pays 9·K dot tests, and under a
*software* rasterizer that is 9× slower than the reference at equal count (and 32× at 100k). On a
phone GPU the same work is ~115k px × 135 tests × ~25 flops ≈ **0.4 GFLOP/frame ≈ 23 GFLOP/s at
60 fps — a few percent of an A15/Mali-G78**, versus ~8 MFLOP for the reference's 52k point
vertices; i.e. on hardware both are cheap, and the field's advantage is **structural**: its cost no
longer grows with the dot count (100k dots cost the same vertices and 3.5× the fragment loop,
confined to the disk's ~9 % of the phone screen), and it removes 72k runs of the essay's heavy
vertex program. The price that *is* certain is **test wall-time**: the SwiftShader lanes (stills,
purity, parity) would spend ~0.9 s per frame on the disk alone (the whole essay frame is ~2.4 s
today), unless the field's K and neighbourhood are trimmed (a 2×2 search with dots held inside the
inner half of their cell cuts the loop 2.25×; a sparser ring grid cuts K).

### 3.2 Look (phone, 390×844@2) — `mock-phone.png` vs `field-26000-phone.png`

- The field reproduces the reference's **shape** (the lensed arch over the shadow, the Doppler
  lopsidedness warm-left/cool-right, the whitening inside r ≈ 6.5, the outer fade) because the lens
  and the intensity terms are the reference's own, applied to the mesh and per pixel.
- It does **not** reproduce the reference's **texture**: the reference's 26k dots are 66 % on 360
  *streaks* sharing a radius, so it reads as grainy filaments with voids; the field's dots are
  uniformly hashed per ring, so it reads as even grain, denser inside (the density law saturates at
  r < 3.5). Streaks are expressible — a per-ring run of cells sharing a hash — but were not built.
- At **100k** the disk is a continuous wash on the bright side (`field-100000-phone.png`): 100k
  discs of ~3 device px on a 115k-px footprint is ~9× overdraw. **At phone size the disk cannot
  carry many more than ~20–30k dots and still read as dots, whatever the technique.** The field's
  benefit for the disk is therefore *cheaper* dots, not *more* dots; "more" belongs to parts with a
  larger footprint (jets, background) or to desktop.
- Prototype artefacts, not inherent: the shadow's "eye corners" where the mesh's near-side
  triangles fold under the pile-up; a darker rim than the reference (whose captured dots pile into
  a bright crescent); the underside arc (image 1) collapses to 104 px because the mirrored,
  shadow-hugging map squashes the far-side triangles — a dedicated thin ring mesh for image 1 would
  fix it; no height jitter (`aH`); dot size via √|det J| is isotropic, so a dot on the pile-up rim
  is stretched with the mesh rather than staying round.

### 3.3 Can it match "everything is dots" at phone size?

**Yes for the disk's body, with two caveats.** Every lit pixel is still inside a discrete,
hash-placed, px-sized disc (the `smoothstep(rad − 0.75, rad + 0.25, d)` edge is the reference's),
so a still is made of dots and the parity check can find each dot by its centre. The caveats: (1)
the dot pattern must be designed for the ring grid (streaks as runs, jitter a full cell, ≥ 2 dots
per cell) or the lattice shows; (2) nothing in the field is *individually* addressable — a strand's
dot, a knot, an in-fall streak, anything the story points at, must stay an instance (§2.4 hybrid).
The field is for the undifferentiated mass only.

### 3.4 The parity check for a per-pixel field (proposed, and run)

A field has no per-dot output to read back, so the twin is the **enumeration**, and the assertion
is on **pixels**:

1. The TS twin enumerates every dot from the cell hash (same `hash01`, same density rule) — this
   also *is* the budget count (`field.dots`), so the generator's "drawn equals counted" fences keep
   working with "enumerated equals drawn-by-construction".
2. For a sample of enumerated dots at the frame's ambient, the twin forward-projects the centre
   through the lens (TS twin of `lens()`, 20 lines, itself `?lib=`-checkable as a vertex library)
   and the test reads the rendered pixel: it must be lit at ≥ 0.35 × the dot's expected
   premultiplied intensity (centre sample of a ≥ 1 px disc).
3. For N sample points ≥ 2 radii from every enumerated dot of the three nearest rings (screen
   distance, from the same projection), the pixel must be ≤ 3/255.

Results (`measure.json`): **lit 191/192 at phone 26k, 180/180 at phone 100k**; desktop @DPR 1
185/192 and 179/180 — the misses are 1.3–2.2 px dots whose centre falls on a pixel boundary at
DPR 1, so the real check should sample the 2×2 neighbourhood's max or run at DPR 2 only.
Dark samples: **7/7 dark at phone 26k** (≤ 3/255 at ≥ one disc radius + 1.5 px from every dot of the three nearest rings, outer half of the disk); at 100k and at desktop DPR 1 **no sample point qualified** in 160k candidates — the field is too dense for a clear pixel, which is itself the §3.2 finding that 100k dots on a 115k-px footprint is a wash. A real check would thin K for the dark half, or assert on the *sum* of lit pixels against the enumeration instead. Both halves run in ~2 s of JS and need no new infrastructure beyond
what `src/parity/parity.ts` already has (a render target and `readRenderTargetPixels`).


---

## 4. Shader-first: the ranked shortlist

The bottleneck (§1.9) is **vertex work**: ~76k → 93.5k instances × 4 vertex runs of a program with
~30 texel fetches and two polynomial sin/cos, on tile-based phone GPUs that shade every vertex in
the binning pass whether or not the dot is later hidden. Fill is small (1–2 CSS px dots), draw calls
are ~15, CPU uploads are one 39 KB texture. So the ranking favours whatever removes vertex runs per
dot, then whatever removes dots from the vertex pipeline altogether.

| # | Trick | Helps | Gain | Fit (purity / twins / stills / phone) | Effort | When |
|---|---|---|---|---|---|---|
| **1** | **Early-out before `bodyMote()`** (§2.5a + §2.10a): in `shell.vert.glsl` test `sysGain`/`lodGain` and a conservative projected-centre-vs-viewport-and-band test *first*, write `MOTE_HIDDEN`, `return`. Same in `track.vert`/`stream.vert`. | **Planets, moons, tracks, stars at the hood and galaxy wides** — the 28 of 30 systems that are star-only or off-screen, i.e. most of the 57k shell motes | Skips the heavy path for the majority of instances in wide shots; identical pixels | ✓ / ✓ (no computed field changes; `uLodForce` still overrides) / ✓ byte-identical / ✓✓ | **S** | **In the re-skin, first** |
| **2** | **One triangle per dot** (§2.1): replace `QUAD`/`QUAD_INDEX` with one circumscribing triangle, keep `vUv = aCorner` and the `r > 1` discard | **Every instanced set**: shells, persons, tracks, streams, background dust/stars, the hole's instanced parts (knots, ring, in-fall, strands) | −25 % vertex runs and index fetches on ~100k instances; +~30 % rasterized area on 2–4 device-px dots (sub-pixel in practice) | ✓ / ✓ / re-baseline (edge-function rounding moves a pixel here and there) / ✓✓ | **S** | **In the re-skin**, alongside the stills re-baseline the re-skin forces anyway |
| **3** | **Per-pixel dot field for the dense mass** (§2.3 + §2.4 + §2.11): the disk (and its arch) and the jet sheaths as 2–4 coarse meshes through the forward lens, dots hashed per ring/cell, Keplerian shear unwound per pixel; knots, ring, in-fall, strands stay instances | **Black hole disk, arch, jets** (~22.8k of the hole's 27,610 instances); later the **background dust** (a disc) | Removes ~90k quad-vertex runs from the vertex budget; dot count decoupled from cost; measured: 7,954 vertices vs 52,000 points for the reference disk, at 9× the SwiftShader fragment time | ✓✓ / **new check: centre-sampling parity** (§3.4, run: 191/192 lit) / ✓ deterministic but SwiftShader frames ~0.9 s slower / ✓✓ on hardware (0.4 GFLOP/frame) | **M–L** | **After the re-skin's dot version ships** — build the field against those stills, so the look is judged against something that exists |
| **4** | **Points hybrid** (§2.1): `gl.POINTS` + `gl_PointCoord` for sets whose dots are ≤ 4 CSS px (streams, tracks, dust, shells, the hole's instanced dots); quads only for glow/haze sprites | Same sets as #2 | −75 % vertex runs on ~95 % of instances (supersedes #2 where applied) | ✓ / ✓ / re-baseline / ✓✓ — **but** gated on `caps.html` on the real test phones (64-px cap, centre-clipping) and it closes the `WebGPURenderer` door for those sets | **M** | Phone pass, once `caps.html` numbers exist |
| **5** | **Instance-count LOD for the hole + drop the per-frame `uShellTex` upload** (§2.5b, §2.11): at the galaxy wides set `instanceCount = min(N, k·footprint²)` with `holeComp`-style gain; evaluate `shapeAt(ambient)` in `shell.glsl` from the static body row | **Black hole at the wides; every shell (upload)** | 18k → ~1k disk instances when the hole is 25 px; one fewer per-frame upload and CPU pack | ✓ (functions of state) / ✓ / wides re-baseline / ✓ | **S–M** | Phone pass |

Not now, and why: **attribute packing** (§2.6: ≤ 1 % on a vertex-bound frame, parity quantization
risk); **half-resolution dense layer** (§2.7: blurs 1-px dots, breaks every still; only worth it if
fill-bound, which the frame is not); **temporal tricks** (§2.8: a frame index is state; purity
forbids it); **WebGPU compute** (§2.9: iOS 26 only, ~13 months old, no SwiftShader lane; the same
"position pass once per dot" is available in WebGL2 via a float target and `texelFetch(gl_InstanceID)`
if #1–#4 are not enough); **`gl_VertexID`-only buffers** (§2.2: bandwidth is not the limit; do it
where it simplifies, streams/tracks first).

**Order of operations for the re-skin:** #1 and #2 land with the re-skin (hours each, #1 is pixel-
identical, #2 rides the stills re-baseline the re-skin already forces); the hole ships as dots per
the spec; then the phone pass measures with `vertex.html`/`fill.html`/`caps.html` on real devices
and decides between #4 and #3, with #5 as the cheap fallback for the wides.
