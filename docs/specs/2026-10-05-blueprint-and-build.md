# The blueprint and the build: ink on paper, then lifted into the bike

*Status: design for implementation (round 2b), built 2026-10-05: §8 lists where the build differs.
Date: 2026-10-05. Revises §1 Section 4, §2.4–§2.7 of
docs/specs/2026-10-04-act-1-storyboard-and-text-engine.md (the spec section only). Builds on the
design spec (docs/specs/2026-10-02-motes-of-work-design.md): §5.2 ghost of intent, §5.8 the bicycle,
§6.1 purity, §6.2 SceneState, §6.4 mote system, §8 budgets. Mock frames: see §2.9. A parallel design
(docs/specs/2026-10-05-act-1-build-and-orbit.md) owns the cold open, the reveal and the rewind; this
one stays inside the spec section and touches nothing before it.*

## 0. The shape in one paragraph

The author's note: the drawing should not look like particles; it should look like a drawing, ink on
parchment, flat, Da Vinci; and then the approved drawing should be turned into 3D and built. So the
drawing stops being a subset of the motes. It becomes **strokes**: polylines authored from the same
construction calls as the bike's solids, drawn as screen-space ink lines (one instanced draw) onto a
**sheet of paper that floats in the scene**, square to the camera, with the mote cloud dimmed to
dust behind it. The agent's pen draws the bike in by scroll (a dash reveal over the strokes' arc
length); the person's hand circles the wrong seat in gold; the agent strikes the wrong lines faint
and draws the new ones; a gold tick says yes. Then the camera swings round to the three-quarter view
of the build, and the sheet is revealed as a thing in space: the lines **lift off the page** into
their 3D places (one scalar collapses or restores each stroke's depth), the paper fades, the stars
come back, the gold motes land on the lines where the person looked, and the blue motes build the
rest around them. Every frame is still a pure function of scroll. The spec section grows from 6 to 8
screens (Act I: 19).

## 1. Research

Tiers: T1 this codebase and the mock frames rendered for this design; T2 official docs and
peer-reviewed papers; T3 blog posts, talks, demos; T4 unverified or marketing.

### 1.1 Ink and sketch lines in WebGL

| Source | Tier | What it gives us |
|---|---|---|
| three.js `LineMaterial` / `Line2` docs — `dashed`, `dashOffset`, `dashSize`, `gapSize`, `linewidth` in CSS px unless `worldUnits`, `resolution` kept by `LineSegments2.onBeforeRender`; dashes need `computeLineDistances()` (https://threejs.org/docs/pages/LineMaterial.html) | T2 | The stock fat-line renderer: instanced screen-space quads under the hood. Its dash offset is the classic stroke reveal. We do not use it (§2.4 says why) but its shader is the reference for the quad extrusion and the AA edge. |
| Rye Terrell, *Instanced Line Rendering Part I* (2019-11-17, https://wwwtyro.net/2019/11/18/instanced-lines.html) | T3 | One quad instance per segment, endpoints as instance attributes, width built in the vertex shader from the screen-space normal; round caps and joins folded into the segment geometry so a polyline is one draw call; a 500k-point demo. Our `ink.vert.glsl` is this, plus a part transform and a reveal. |
| Ricky Reusser, `regl-gpu-lines` (https://github.com/rreusser/regl-gpu-lines/) and Cesium, *Robust polyline rendering with WebGL* (2013, https://cesium.com/blog/2013/04/22/robust-polyline-rendering-with-webgl/) | T3 | Joins, miters and the clip-space pitfalls (segments crossing the near plane) of screen-projected lines. We avoid the join problem by subdividing every stroke finely and butt-joining interior vertices (§2.4). |
| Inigo Quilez, *2D distance functions* — `sdSegment`, `sdOrientedBox` (https://iquilezles.org/articles/distfunctions2d/) | T2 | The capsule distance the fragment shader uses for the AA edge and the round caps. A full-screen SDF pass over thousands of segments is O(pixels × segments) and is rejected; the SDF is evaluated only inside each segment's own quad. |
| Jake Archibald, *Animated line drawing in SVG* (2013, https://jakearchibald.com/2013/animated-line-drawing-svg/) | T3 | The stroke reveal: a dash as long as the path, offset from fully hidden to fully drawn. Ours is the same idea with the dash offset replaced by a cumulative arc-length attribute and one `drawn` scalar, so the whole drawing is one dash and the pen moves at constant speed. |
| Codrops, *Animated Mesh Lines* (2019, https://tympanus.net/codrops/2019/01/08/animated-mesh-lines/) | T3 | MeshLine with per-line dash arrays and a visibility ramp; the look of lines that taper and draw in. Confirms the reveal reads better when a line's *width* also eases in at its leading end (we taper the last 2 % of the drawn length). |
| Codrops, *Sketchy Pencil Effect with Three.js Post-Processing* (Maya Nedeljković Batić, 2022, https://tympanus.net/codrops/2022/11/29/sketchy-pencil-effect-with-three-js-post-processing/) | T3 | Screen-space edge detection (Sobel over normals and depth) tinted with a pencil texture and jittered by noise. A post-pass over the whole frame; rejected here because it would draw the motes' edges too, costs a full-screen pass on phones, and gives no stroke order for the reveal. Its noise-jittered lines are the reference for the wobble amplitude (small). |
| godotshaders, *hand-drawn colour highlighting shader for blueprints* (https://godotshaders.com/shader/hand-drawn-color-highlighting-shader-for-e-g-blueprints/) | T3 | Screen-space crosshatching with value-noise distortion so lines read as hand-drawn; width and spacing constant on screen regardless of distance. We keep hatching in CSS px for the same reason. |
| Praun, Hoppe, Webb, Finkelstein, *Real-Time Hatching* (SIGGRAPH 2001, https://hhoppe.com/proj/hatching/) | T2 | Tonal art maps: mip-mapped hatch textures blended by tone, coherent across scale. Over-engineered for one bike; what we take is the rule that hatch density conveys tone and must not shimmer when the view changes, which authored strokes (not a texture) satisfy by construction. |
| three.js `EdgesGeometry` (threshold angle; crease edges only) and gkjohnson's conditional-lines demo (silhouette edges where a front face meets a back face, https://gkjohnson.github.io/threejs-sandbox/conditional-lines/) | T2 / T3 | Automatic line extraction from the solids. Rejected for the drawing (§2.3 option C): the tubes are 12-segment cylinders merged into unindexed soups, and twin and correct builds would give different edge sets with no stroke-to-stroke correspondence for the redraw. |
| three.js discourse, *Improving the performance of high density lines* (https://discourse.threejs.org/t/improving-the-performance-of-high-density-lines/67635) and *LineMaterial dashed* (https://discourse.threejs.org/t/linematerial-dashed/24628) | T3 | Fat lines are fill-bound at tens of thousands of segments on phones; dashes need `USE_DASH`. Our budget (≤ 6,000 segments, ≤ 2.4 px wide) is two orders of magnitude under that. |

### 1.2 Paper

| Source | Tier | What it gives us |
|---|---|---|
| godotshaders, *Retro Parchment Paper* (https://godotshaders.com/shader/retro-parchment-paper/) | T3 | Layered fbm grain plus a vignette and a warm tint is enough for parchment at screen size; no texture asset needed. |
| The mock frames (§2.9), SVG `feTurbulence` grain 0.9 cpx × 3 octaves at 16 % + fibre noise 0.012 × 0.08 cpx at 10 %, over `#E7D9B9` | T1 | Measured: the parchment reads at these amplitudes under the essay's scrim and vignette; the ink values in §2.6 were chosen against it. |

### 1.3 Leonardo's notebooks (the reference look)

| Source | Tier | What it gives us |
|---|---|---|
| British Library, Codex Arundel (Arundel MS 263) digitised (570 pages, Turning the Pages, 2007; reported by Metalocus, https://metalocus.es/en/news/570-pages-leonardo-da-vincis-manuscripts-are-online-thanks-british-library-and-microsoft; overview at https://www.discoveringdavinci.com/codex-arundel) | T3 | The page: warm paper, brown iron-gall ink gone sepia, machines drawn as side elevations with construction lines and hatching, notes crowding the margins in mirror script. Our notes are texture only (§2.7), never words. |
| Museo Galileo, *Cycling through time: Leonardo's bicycle* (https://brunelleschi.imss.fi.it/biciclette/eleonardo.html); Frieze, *Did Leonardo da Vinci invent the bicycle?* (https://www.frieze.com/article/did-leonardo-da-vinci-invent-bicycle); Deseret News, 1997 (https://www.deseret.com/1997/10/16/19340083/leonardo-s-bike-sketch-termed-a-forgery/) | T3 | The famous "Leonardo bicycle" (Codex Atlanticus f. 133v) is widely held to be a later addition in graphite, not his. Useful as the cultural echo the author is reaching for, and a warning: the essay never claims the drawing is his, and nothing in the copy names him. |

### 1.4 Two-dimensional drawings becoming three-dimensional

| Source | Tier | What it gives us |
|---|---|---|
| Framer *MorphField* (particles gather into 3D forms on scroll; flat SVG extruded to depth; https://www.framer.com/community/marketplace/components/morphfield/); Awwwards scroll-driven 3D reveals (e.g. https://www.awwwards.com/inspiration/on-scroll-3d-animation-der-baukasten) | T4 | The genre: wireframe or flat art that stands up into a product as you scroll. None found with a reference implementation worth copying; every one is a position blend keyed to scroll, which is what §3 specifies in one line of shader. |
| This codebase: `mech.ghostVariant` morph (`src/scene/mote/shaders/ghost.vert.glsl`), `partTransforms`, the anchor-relative camera keys (`src/scene/cameraRig.ts`) and the bike-terms shots (`src/timeline/shots.ts`) | T1 | The lift is the existing camera orbit plus one new scalar that scales each stroke's world z toward the sheet plane. No new animation system. |

## 2. The look

### 2.1 What the reader sees (recommended)

The cloud of blue dust dims to almost nothing. A sheet of paper, warm cream, slightly larger than the
screen's middle, hangs square to us against the dark. Faint brown construction lines go down first:
a ground line, the two wheel centres on one level, the two steering and seat axes. Then the pen draws
the bike in sepia ink, part by part, as a side elevation: wheels (two circles, hub, twelve spokes),
the frame as double contour lines, the fork and the basket, the chainring with its teeth, the chain
as a dashed line, the saddle perched on its mast over the front wheel, the low bars on the stub at
the back. Hatching shades the tyres, the saddle and the basket. Three small blocks of
mirror-script-like scribble sit in the margins, unreadable, as texture. The page has grain, fibres,
a slight vignette and a darker edge.

We close in on the seat (sp-3). A gold ring is drawn round it by a hand (sp-4). The wrong lines go
faint (left on the page, as corrections are), and the pen draws the new ones: the seat post and
saddle at the back, the stem and bars at the front, the level top tube, the full seat tube, the
cables. Nothing else is touched. A gold tick is drawn in the corner (sp-5).

The camera swings up and round to the view in which the reader learned the mistake. The sheet turns
in space with it, seen now as a page at an angle. From the back of the bike to the front, the ink
lines rise off the page into their places in the air, the wheels becoming rings, the bars coming out
toward us; the paper fades with its construction lines, hatching, notes and struck-out lines; the
stars return; the lines, now pale on the dark, stand where the parts will go (sp-6). Gold motes land
on the seat, the bars and the pedals (sp-7); blue motes fill the body (sp-8); the finished bike rides,
the ink lines left faint beneath it.

### 2.2 The three paper placements, and why the sheet floats

| Option | What the reader sees | Cost / risk |
|---|---|---|
| **P1. A sheet floating in space** (recommended) | A page in the dark, square-on during the drawing; the camera's swing to the build shot shows it as an object; the lines lift off it. Stars dimmed around it. | One static quad with a shader. The lift and the 3D reveal cost nothing extra: the camera orbit does the tilting. The dark stage is back before any mote lands. |
| P2. Full-screen parchment the scene fades into | The whole stage becomes paper; the drawing fills it. | Strong "page" feel, but the motes' screen/additive blending (`moteSystem.ts`) cannot read against a light stage, so the build would need a fade back to dark before anything lands; the 2D→3D moment becomes a crossfade. The text scrim is tuned to a dark stage (`#story::before`) and would have to change. |
| P3. The background turns to paper, motes hidden | As P2 but the motes are gone rather than dimmed. | Same blending problem; also loses the stars that make "nothing is built yet" true on screen. |

### 2.3 Four ways to make the drawing, and the one to build

| Option | How | Verdict |
|---|---|---|
| A. Sparser, bigger ghost dots | Keep `ghost.vert.glsl`, raise the stride, draw bigger sepia dots on a paper quad. | Still dots: the author's note is exactly that it reads as particles. Rejected. |
| B. Projected 2D silhouette of each part as a textured decal | Render each part's solid to an offscreen edge pass once, in a fixed side view; show as a textured quad on the sheet. | Flat and cheap at rest, but the redraw needs a stroke order and a stroke-by-stroke erase, which a raster has no handle on, and the lift into 3D has nothing to lift. Rejected. |
| C. Automatic edges (`EdgesGeometry` plus silhouette edges) from the solids | Extract crease and silhouette edges for the side view at build time; render as lines. | Honest lines, no authoring, but no correspondence between the twin's and the correct bike's edge sets (the redraw would be a crossfade), faceted output from 12-segment tubes, and hatching and construction lines still need authoring. Rejected. |
| **D. Authored strokes from the construction calls** (recommended) | A stroke builder beside `shapes.ts` emits polylines per primitive (two contour lines per tube, circles per wheel, the involute outline per gear, the saddle's profile, …) in part space, for both builds, in the pen's order. Rendered as instanced screen-space ink. | The same point-for-point correspondence the sampler relies on (each solid built by the same call in both builds), so the redraw can strike and redraw exactly the lines that move; a natural draw order; hatching and notes are just more strokes; and because strokes live in 3D part space, posing them with the real part transforms and relaxing one flatten scalar lifts the drawing into the bike for free. |

### 2.4 Stroke geometry: `src/mechanisms/bike/ink.ts`

A new module next to `shapes.ts`, pure, deterministic, built once like `geometry()` in `index.ts`:

```ts
export type StrokeClass = 'outline' | 'construction' | 'hatch' | 'note' | 'person';
export interface Stroke {
  part: number;            // index into SPECS (ground for strokes that belong to the paper)
  cls: StrokeClass;
  points: Vec3[];          // part space, metres, correct build
  pointsTwin: Vec3[];      // same length; the twin build (equal to points when the part has no twin)
  moves: boolean;          // max |points − pointsTwin| > 2 mm: struck out and redrawn in sp-4
  farSide: boolean;        // the mirror duplicate (left pedal, left blade, far flange…): hidden while flat
  paper: boolean;          // belongs to the page: never lifts, fades with the sheet
  closed: boolean;         // first and last point joined (circles, outlines)
}
export function inkStrokes(): Stroke[];      // in the pen's order
export const INK_SEGMENT_BUDGET = 6000;     // both copies; a test holds the count under it
```

**How a primitive becomes strokes** (every function reuses the constants and exported helpers of
`shapes.ts` / `kinematics.ts`, in the part's own space, scaled by `SCALE` in `index.ts` as the solids are):

| Solid (shapes.ts) | Strokes |
|---|---|
| `tube(a, b, r)` with r ≥ 6 mm | two contour lines at ±r from the axis in the part's xy plane (the side-view silhouette of a cylinder), subdivided every 30 mm; r < 6 mm (spokes, stays' thin tubes, cables, basket stays) one centreline |
| wheel | tyre: circles at `WHEEL.tyre` and `tyre − section`; rim at `WHEEL.rim` (the inner circle is skipped: three concentric circles read as a tyre, four as a target); hub at 0.036 and 0.012; 12 spokes from r 0.034 to `rim − 0.018`, every other one `farSide`; the reflector plate's outline |
| chainring / sprocket | `chainringOutline()` / `sprocketOutline()` as closed polylines (the involute teeth are the drawing's finest detail and cost ~350 + 130 segments); the spider's five arms as centrelines; the crank arms as two contour lines each (the left `farSide`) |
| chain link | one segment along the link (36 of them: the chain draws as a dashed line, which is how a pen draws a chain) |
| saddle | the side profile about the saddle-top point: an 8-point closed polyline (length 0.27 m, nose down `SADDLE.noseDown`); post and clamp (correct) or column and cradle (twin) as tubes; the top gets a hatch region |
| handlebars | stem tube, the bar's centreline from the clamp out and back to the grip (near side; far side `farSide`), the grip as a thicker short line, the lever, the bell as a circle, the housings as centrelines |
| fork, basket, headlamp | steerer and near blade as tubes (far blade `farSide`); the basket's near side panel as a closed rectangle with a hatch region, its rim as a heavier line; the two near stays; the lamp as a circle plus its bracket |
| brakes, mudguards, rack, bolts | caliper as three short centrelines; each mudguard as two arcs (`MUDGUARD.inner`/`outer`) over the angles `guard()` uses; the rack's deck and near leg and strut; the tail reflector as a small rectangle; no strokes for `loose-bolts` |
| ground | the ground line (construction) from `GROUND.x0` to `GROUND.x1` |

**Paper strokes** (`paper: true`, assigned to the static `ground` part so they never pose):
- construction: the ground line, the wheel-centre level through both axles, `STEER_AXIS` through
  `HEAD_TOP` extended 0.75 m down and 0.45 m up, `SEAT_DIR` through `BB` extended, and 60 mm
  crosses at both axles and the bottom bracket;
- hatch: parallel lines at −50° (upper-left to lower-right: the left-hander's hatch), pitch
  12 mm, clipped at build time to five convex regions: a lower-right crescent of each tyre (between
  `rim` and `tyre`, over 100°), the saddle's top, the basket's near panel, and the chainring's spider
  disc (r 0.03–0.08); ≤ 400 segments in all;
- note: three scribble blocks (§2.7);
- person: the ring and the tick (§2.8).

**Moving strokes.** `moves` is computed, not authored, and a test (§5.2) asserts the set equals the
story's claim: the saddle, the handlebars, and of the frame the seat tube/stub, the top tube, the
head tube's mast extension and the brake-cable runs; nothing else. The tyre circles, spokes, chain,
cranks, fork, basket, stays and down tube have identical points in both builds and never move.

**Pen order** (the order strokes are drawn in by scroll; also the order of `inkStrokes()`):
construction → rear wheel → front wheel → frame (seat tube, down tube, chainstays, seat stays, top
tube, head tube/mast) → fork, basket, lamp → cranks, chainring, sprocket, chain, pedals → saddle →
handlebars, cables → brakes, mudguards, rack → hatching → notes. Each stroke's reveal window is its
share of the total arc length, so the pen moves at one speed; a part's rank in this order is a
tested fact (§5.2).

**Segments.** Every stroke is subdivided so no segment is longer than 30 mm (bike metres): the
wobble needs vertices to bend at. Estimated total: wheels 2 × (3 × 48 + 12 + 10) ≈ 330; gears ≈ 480;
frame and fork ≈ 700; the rest of the bike ≈ 600; hatching ≤ 400; notes ≈ 900; construction ≈ 60.
About 3,500 for one copy; moving strokes are drawn twice (§2.5); the budget is 6,000.

### 2.5 Rendering: `src/scene/ink/` (one instanced draw, no points)

**Instances.** One quad per segment, `InstancedBufferGeometry` with a 4-corner quad exactly as the
mote meshes build theirs (`instancedGeometry` in `moteSystem.ts`), instance attributes:
`aA, aB` (vec3, correct build, part space, world scale), `aATwin, aBTwin`, `aPart`, `aArc` (vec2:
normalised cumulative arc at the segment's start and end, over the whole drawing in pen order),
`aMoveArc` (vec2: the same over the moving subset only, or −1), `aS` (vec2: metres along the stroke
at each end, the wobble's phase), `aStroke` (stroke index, the wobble's seed), `aFlags` (bits:
`moves`, `farSide`, `paper`, `copy`, `capStart`, `capEnd`, and 3 bits of class), `aXRank` (the
part's x-rank 0..1 for the lift's wave). Moving strokes are emitted **twice**: copy 0 posed in the
twin build, copy 1 in the correct build; everything else once with `copy` 0.

**Vertex shader (`ink.vert.glsl`).** Spliced with `instance.glsl`'s uniforms as the ghost is (the
part texture, viewport, pixel ratio), plus:

```glsl
uniform sampler2D uPartsCorrect, uPartsTwin; // pose(drive, ZERO_FAULTS, 0 / 1, steer 0), assembly 1
uniform float uDrawn, uRedraw, uFlat, uOpacity, uSheet, uRing, uTick;
```

1. Pick the build: `copy == 1 || !moves ? (aA, uPartsCorrect) : (aATwin, uPartsTwin)`; pose the two
   endpoints with the part's quaternion and position (the `moteRotate` of `mote.glsl` is reused by
   name; the library is spliced in read-only, nothing in it changes).
2. Flatten: `f = paper ? 1.0 : clamp((uFlat - 0.3 * aXRank) / 0.7, 0.0, 1.0)`; `p.z *= (1.0 - f)`.
   At `uFlat` 1 every stroke lies in the world plane z = 0 (the bike's mid-plane; the sheet sits
   just behind it). As `uFlat` falls, parts lift in x-rank order, rear first, the bars last.
3. Project both endpoints to screen px (`clip.xy / clip.w * 0.5 * uViewport`); tangent `t`, normal
   `n`. Width in CSS px by class, times the pen's pressure: `w = W[cls] * (0.78 + 0.44 * noise1(aS * 9.0 + aStroke * 17.0))`.
   Wobble along the normal: `d = A_PX * noise1(aS * 4.0 + aStroke * 31.0)`, `A_PX = 0.9 * uPixelRatio`
   (0.9 CSS px). `noise1` is a hash-based 1D value noise (two `hash01` lookups, smoothstep), keyed on
   arc metres and the stroke index: identical for both builds of a stroke and for both copies, so a
   line never shivers between frames. Vertex `k` of the segment: `P = mix(A, B, c.x) + n * (d_k + c.y * (w/2 + 1.5px)) + t * (c.x * 2 - 1) * cap_k * (w/2)`, where `cap_k` is 1 only at a stroke's own ends (`capStart`/`capEnd`): interior joins are butt joins and share their displaced vertex, so a subdivided stroke is watertight and does not pool alpha at every vertex.
4. Reveal: `vis = clamp((uDrawn - aArc.x) / (aArc.y - aArc.x), 0.0, 1.0)` for ordinary strokes; for a
   moving stroke's copy 1, `vis` uses `aMoveArc` and `drawn = clamp((uRedraw - 0.2) / 0.8, 0.0, 1.0)`.
   Pass `vis`, the along-coordinate, the across distance, the width, the class and an alpha factor:
   `a = uOpacity * (copy == 0 && moves ? mix(1.0, PENTIMENTO, clamp(uRedraw / 0.3, 0.0, 1.0)) : 1.0) * (paper || (copy == 0 && moves) ? uSheet : 1.0) * (farSide ? 1.0 - 0.85 * f : 1.0)`.
   A segment with `vis == 0`, `a == 0` or a `person` class whose scalar is 0 goes to `MOTE_HIDDEN`.
5. The ring and the tick use `uRing` and `uTick` instead of `uDrawn`: `drawn = min(v, 1.0)`, alpha
   times `clamp(2.0 - v, 0.0, 1.0)` (a draw-then-fade scalar, §2.10).

**Fragment shader (`ink.frag.glsl`).** Capsule distance in px (`sdSegment` from §1.1) with the
along-coordinate clipped at `vis` (and the last 2 % of the drawn length tapered to a point, so the
pen's leading end is a nib, not a square); `edge = 1.0 - smoothstep(w/2 - 0.75, w/2 + 0.75, dist)`;
colour per class mixed between its paper value and the stage value by `uSheet` (§2.6); output
premultiplied, blended `One, OneMinusSrcAlpha`, `depthWrite: false`, `depthTest: true` (so the sheet
occludes nothing in front of it and strokes behind a fading sheet still show), `renderOrder` 2 (after
motes and the ghost dots). No `gl.POINTS`, no point sprites anywhere in the ink path (§5.6).

**Uniforms per frame** from `SceneState` (§2.10): `uDrawn = ink.drawn`, `uRedraw = ink.redraw`,
`uFlat = ink.flat`, `uOpacity = ink.opacity`, `uSheet = sheet.opacity`, `uRing = ink.ring`,
`uTick = ink.tick`; the two part textures from `partTransforms(mech, intended)` with assembly 1,
`ZERO_FAULTS`, steer 0, `drive = mech.drive`, variant 0 and 1 (the second texture is new; the first
is the ghost's own `ghostParts` at `ghostVariant` 0, shared). The mesh is `visible` only when
`ink.opacity > 0`, as the ghost mesh is for `mech.ghost`.

**Why not `Line2`.** `LineMaterial` would need its vertex shader patched for the part transform, the
two builds, the flatten, the per-stroke reveal and the wobble; `onBeforeCompile` over an addon
material is brittle across three.js versions (the dashed path already needs a define and a distance
pass). The instanced-quad shader is ~120 lines in the house style, shares `instance.glsl`'s
plumbing, and is one draw call either way.

**Cost.** ≤ 6,000 instances × 4 vertices; fill ≤ 6,000 × (30 mm × ~370 px/m ≈ 11 px) × ~4 px ≈
0.3 Mpx at 1440×900, under 1 % of the motes' fill. Phones see fewer px per metre and the same CSS
widths. The sheet is one quad with a procedural fragment (§2.6), ~0.5 Mpx of three-octave value noise
at its largest: cheap. Nothing allocates per frame.

### 2.6 Colour, paper and ink (values; T1 from the mock, to be re-measured on the real renderer)

| Thing | Value | Notes |
|---|---|---|
| Sheet base | `#E7D9B9` | A warm cream, not yellow: under the essay's scrim and vignette it reads as old paper, not as a sticky note. |
| Sheet grain | base × (1 + 0.05 · (fbm₃(uv · 180) − 0.5)) | Three octaves of hash value noise (the mock's `feTurbulence` 0.9 cpx at 16 % alpha ≈ this). |
| Sheet fibres | base × (1 + 0.025 · (noise(uv · (12, 80)) − 0.5)) | Anisotropic, stretched along the sheet's long axis. |
| Speckles | hash(uv · 700) < 0.004 → base × 0.9 | A few darker flecks. |
| Vignette | × (1 − 0.16 · smoothstep(0.55, 1.0, r)) with r the normalised distance from the sheet's centre | The mock's radial gradient. |
| Edge | mix to `#C9B890` over the outer 1.5 % of the quad, plus a 1 px `#B9A77F` border | The page's cut edge; no drop shadow (a shadow would need a surface to fall on). |
| Outline ink (paper) | `#2E2117` at alpha 0.9, width 1.6 px; heavier lines (basket rim, grips) 2.2 px; thin lines (spokes, cables, chain) 0.9–1.4 px | Iron-gall ink gone brown-black; contrast ≈ 10:1 on the sheet. |
| Construction ink | `#6B5436` at 0.5, 0.8 px | The faint under-drawing. |
| Hatch ink | `#2E2117` at 0.55, 0.9 px | Tone by line density, not by colour. |
| Note ink | `#2E2117` at 0.5, 0.85 px | |
| Pentimento | the stroke's own colour at alpha 0.15 | The struck-out lines; they stay on the page and leave with it. |
| Person's ink (ring, tick) | `#9C6A14` at 0.85; ring 2.2 px, tick 2.4 px | Ochre: "gold" on paper (the bright `#FFB347` is 2.1:1 on cream and reads as yellow). ≈ 3.1:1 on the sheet. The warm family the legend calls gold, before the gold motes exist. |
| Outline ink (stage) | `#DBD4C2` at alpha 0.7 | What the lines become as the sheet fades: pale and warm, clearly not the agent's blue nor the gold. `colour = mix(STAGE, PAPER[cls], sheet.opacity)`, so the change is a pure function of state and happens exactly while the page goes. |
| Stars during the drawing | `stage.motes` 0.1 | The cloud as dust. Motes in front of the page are at a tenth of their brightness; those behind it are hidden by the page's depth (§2.11). |

### 2.7 The notes (texture, never words)

Three blocks of right-to-left scribble, each 2–3 rows 36 mm apart: a row is a run of "words" (30–100
mm long) separated by 20–40 mm gaps, each word a polyline with 4 mm steps whose y wobbles by
±6 mm with an occasional 12 mm ascender; drawn right to left in the pen order (mirror script runs
that way). Positions on the sheet (bike metres): upper-left (−0.38…0.04, 1.2), upper-right
(1.05…1.45, 1.22), right of the front wheel (1.12…1.48, 0.62). They are `paper` strokes at note ink.
Rule (also the content lint, §5.2): no glyph is ever a letter; the generator uses a sine plus hash
jitter only, no character tables, no text rendering. The alt text says "scribbled notes in the
margins". If the author finds them fussy, drop the right-of-wheel block first; all three cost under
1,000 segments.

### 2.8 The person's marks

- **The ring** (sp-4, "You point it out"): a circle of radius 0.2 m about the twin saddle's centre
  (`MAST_MOUNT + 0.18 · SEAT_DIR`), started at 110° and swept 380° so the ends overlap as a hand's
  do, in ochre. It draws in over `ink.ring` 0 → 1 and fades over 1 → 2 (§2.10) once the redraw is
  done. It is the picture of pointing, and the first warm mark in the section: "gold = where you
  looked closely" is named in sp-7, but the reader has already seen the person's hand be gold.
- **The tick** (sp-5, "You say yes."): a three-point stroke at the sheet's lower right,
  (1.25, 0.08) → (1.31, 0.02) → (1.45, 0.20), 2.4 px, ochre, drawn over `ink.tick` 0 → 1. It never
  fades; it leaves with the page.

### 2.9 Mock frames (T1)

Rendered with Chromium from an SVG mock of the sheet and the strokes (the wobble as a displacement
map, the grain as turbulence), at 1440×900 with the essay's copy and scrim in place:

- `<scratchpad>/blueprint/sp-frame1.png` — sp-2: the twin drawn in ink on the sheet.
- `…/sp-frame2.png` — sp-4 mid-redraw: the old lines faint, the gold ring, the new saddle and bars part-drawn.
- `…/sp-frame3.png` — sp-5: the corrected drawing with the gold tick.
- `…/mock.html` — the generator (`?frame=1|2|3`), geometry from the kinematics constants.

What the mock settled: the sheet's size and place (§2.11), the ink and paper values (§2.6), that the
hatching and the chain's dashes read at 1 px, that the notes read as marginalia and not as text, and
that the ochre ring reads as the person's mark against the sepia. What it does not show: the wobble
at the shader's amplitude (the SVG displacement is coarser), the stroke reveal, and the lift.

### 2.10 New SceneState leaves (all default to a value that leaves every existing frame unchanged)

| Leaf | Range | Default | Meaning |
|---|---|---|---|
| `sheet.opacity` | 0..1 | 0 | The paper's opacity. At 1 the quad writes depth (it occludes the cloud behind it); below 1 it does not. |
| `ink.opacity` | 0..1 | 0 | The strokes' overall opacity; 0 hides the ink mesh. |
| `ink.drawn` | 0..1 | 0 | Fraction of the drawing's arc length the pen has drawn, in pen order. |
| `ink.redraw` | 0..1 | 0 | The correction: 0–0.3 the moving strokes' old copies fade to pentimento; 0.2–1 their new copies draw in. |
| `ink.flat` | 0..1 | 0 | 1: every bike stroke pressed onto the sheet plane; 0: every stroke in its 3D place. Parts lift rear to front as it falls (§2.5 step 2). |
| `ink.ring` | 0..2 | 0 | The person's ring: 0 → 1 draws, 1 → 2 fades. |
| `ink.tick` | 0..1 | 0 | The person's tick: draws. |
| `stage.motes` | 0..1 | 1 | Brightness multiplier on the mote and thread draws (§2.11). |

`mech.ghost` and `mech.ghostVariant` keep their meaning (the dotted ghost of intent, for Act II) and
are **0 throughout the spec section**: the ink replaces the dots there. `SCENE_STATE_PATHS`,
`defaultSceneState()` and their sync test grow by eight leaves; `mergeState` needs nothing.

### 2.11 The sheet, the motes and the background

- **The sheet** is a static `PlaneGeometry` in the plane z = −0.03 m (bike), i.e. world z = −0.0675,
  centred at bike (0.55, 0.55), 1.9 × 1.45 m (world 4.275 × 3.26), facing +z (the drive side, where
  the drawing's camera is). It never moves or turns; only `sheet.opacity` changes. Its material is a
  `RawShaderMaterial` with the fragment of §2.6; `transparent: true`; `depthWrite` is set each frame
  to `sheet.opacity >= 0.999` (a pure function of state); `renderOrder` −1 (before the motes).
- **The motes** get one uniform, `uStage` (= `stage.motes`), multiplied into `vBrightness` in
  `mote.vert.glsl` and into the thread's alpha in `thread.vert.glsl`. These are the draw shaders,
  not the `mote.glsl` library: `mote()`, its TypeScript mirror and the parity page are untouched,
  and `e2e/machine.ts` (which reads `visible` and `settled`, not brightness) is unaffected.
  Nothing hides the mote mesh: at `stage.motes` 0.1 the cloud is dust round the page and comes back
  smoothly when the page goes.
- **The ghost dots** stay for Act II; their mesh is invisible in this section (`mech.ghost` 0).
- **The stage** stays `#0B0D12`; the CSS scrim and vignette are unchanged. The sheet's top sits
  under the text band (§2.12), so the light paper never sits behind the light text.

### 2.12 Shots (bike terms, as `src/timeline/shots.ts` keys them; the clearance test tunes them as §2.7 of the storyboard did)

| Shot | Target (m) | Bearing | Elev | d (m) | fov | frame | coreFocus | Used for |
|---|---|---|---|---|---|---|---|---|
| **S11** the page, square on | (0.55, 0.72, 0) | 90 | 0 | 3.9 | 35 | 0 | 0 | sp-1, sp-2, sp-4, sp-5 |
| **S11c** the seat on the page | (0.80, 0.95, 0) | 90 | 0 | 2.2 | 33 | 1 | 0 | sp-3 |
| S10 (existing) the build's three-quarter | whole | 40 | 25 | 4.2 | 35 | 0 | 0 | sp-6: the orbit's end |
| S9′, S10′ (existing) | as built | | | | | | | sp-7, sp-8 |

S11's numbers, checked against the band on 1440×900: 366 px per metre; the sheet's top (y 1.275) is
0.555 m above the target, which lands at 66 % of the height → the top at 43 %, just under the 42 %
band + 8 px; the sheet's bottom runs 22 px off the bottom of the screen (a page larger than the
frame); the sheet spans 48 % of the width; the ground line sits at 95 %. The twin's saddle top
(y ≈ 1.16) is 0.44 m above the target → 48 %. On a phone the rig backs off by √m about the same
target; the sheet should span ≤ 92 % of the width, and if it does not, S11 backs off (d) rather than
the sheet shrinking. S11 is reached from S8 (bearing 90, elevation 0) with no turn: the rewind's
pull-back already looks at the drive side, so sp-1 is a push-in onto a page that fades up in front
of the camera.

## 3. The drawing becomes 3D and gets built

### 3.1 Options

| Option | What the reader sees | Verdict |
|---|---|---|
| **L1. Lift-off** (recommended) | The camera swings from square-on to the build's three-quarter; the sheet, a thing in space, is seen at an angle; the ink lines rise off it rear to front into their 3D places; the page fades with its notes and corrections; the stars return; gold lands on the lines, blue fills. | One scalar (`ink.flat`) and the existing camera keys. The sheet's "tilt" is parallax, so it is exactly consistent with the 3D bike that appears. |
| L2. Pop-up book | The sheet lies down to become the ground and the bike stands up out of it; the page stays as the floor under the built bike. | Charming, but the sheet would need a pose track and the drawing is a side elevation (lying it down foreshortens it to a line before the bike stands); the ground strip already exists as a part. Keep as a variant if the author wants the page to stay. |
| L3. Inflate | The strokes thicken into tubes: the lines become the solids, then the motes arrive. | A second renderer (tube mesh) for a two-second effect; and the motes *are* the material of the essay — a solid bike that the motes then re-make muddles the thesis. Rejected. |
| L4. Crossfade | The sheet fades out and the old ghost dots fade in; the build runs as today. | Cheapest; nothing is "turned into 3D", which is what the author asked for. Rejected. |

### 3.2 L1, timed (section-local, L = 8)

| Local | What moves |
|---|---|
| 0.53 → 0.63 | Camera S11 → S10 (inOutCubic): bearing 90 → 40, elevation 0 → 25, d 3.9 → 4.2. The page turns in view as the camera orbits. |
| 0.58 → 0.68 | `ink.flat` 1 → 0 (inOutCubic). The rear wheel's rings lift first, the frame, the front wheel, the bars last (x-rank wave, §2.5 step 2). Far-side duplicates come up to full alpha as they lift. |
| 0.60 → 0.69 | `sheet.opacity` 1 → 0 (inOutQuad). The construction lines, hatching, notes, tick and the struck-out lines go with it. The ink colour runs from sepia to pale over the same span (§2.6). |
| 0.62 → 0.72 | `stage.motes` 0.1 → 1. The cloud is back before the first mote lands. |
| 0.70 → 0.74 | Camera S10 → S9′ (coreFocus 0 → 0.6) for sp-7. |
| 0.72 → 0.84 | `mech.assembly` 0 → 0.34 (0.46 until 2026-10-05, when the core's window shrank to [0.08, 0.32] to make room for the basket's stage in the cold open): the gold motes land on the seat, bars and pedals — onto the lines that stand there. |
| 0.84 → 0.90 | Camera S9′ → S10′ (coreFocus → 0). |
| 0.85 → 0.95 | `mech.assembly` 0.34 → 1: blue builds the body round the gold. |
| 0.90 → 0.97 | `ink.opacity` 1 → 0.25: the lines stay faint under the built bike (the ghost of intent, as ink). |
| 0.90 → 1.00 | `mech.drive` 0 → 1.4: the finished bike rides. |

The one copy line for the scene (sp-6) is true throughout it: "Then the drawing lifts off the page.
Every line stands where a part will go."

## 4. The revised spec section

### 4.1 Copy (replaces the Section 4 table of storyboard §1; `at` values in §4.2)

The storyboard test (`src/story/storyboard.test.ts`) parses the §1 tables of
`2026-10-04-act-1-storyboard-and-text-engine.md`; the implementer copies this table over that
document's Section 4 table (and the alt text) in the same commit as `src/story/04-spec.md`, or the
fence fails, as intended. The other designer's document may edit the same §1 for Sections 1–3; the
rows do not overlap.

| Beat | Page | Text |
|---|---|---|
| sp-1 | 1 | Start again. This time, ask for a drawing first. (9) |
| sp-2 | 1 | The agent draws the bike in ink, on a sheet of paper. Nothing is built yet. (16) |
| sp-3 | 2 | Look closely. The seat is on the front again! (9) |
| sp-4 | 3 | You point it out, and the agent redraws it: seat at the back, handlebars at the front. No new frame this time. Just new lines. (25) |
| sp-5 | 4 | Now it looks like a bike a person could ride. You say yes. (13) |
| sp-6 | 5 | Then the drawing lifts off the page. Every line stands where a part will go. (15) |
| sp-7 | 6 | You looked closely at the parts a person touches, so they land first: the seat, the handlebars and the pedals. (20) |
| sp-8 | 6 | Then the agent builds the rest. (6) |

Copy notes. sp-2 drops "thin white lines" (the lines are brown ink now) and names the paper, so
"lifts off the page" in sp-6 lands on a thing the reader has been told about. sp-4 is the author's
approved line, unchanged. sp-6 is the new scene's one line: "lifts off the page" is what the picture
does, "stands where a part will go" is what the motes then prove. sp-7 and sp-8 are the old sp-6
and sp-7, unchanged. 112 words over 8 screens (14 per screen; limit 35); no beat over 26 words; no
page over 3 beats.

~~The legend, revised: **blue** = the agent's work (vb-3); **ink lines** = the drawing (sp-2);
**gold** = the person (first seen as the ring and the tick, named in sp-7 as "where you looked
closely").~~

*Amended 2026-10-05 (the author): "we don't want readers to have to know what blue and dots mean, at
least not in act 1." sp-7 was "The gold dots are where you looked closely. They land first, on the
seat, the handlebars and the pedals." (the old sp-6 in the author's numbering). It now says what you
did, not what colour it made: "You looked closely at the parts a person touches, so they land first:
the seat, the handlebars and the pedals." vb-3 ("See the blue dots?") and rv-6 ("Look at the
colours. Every dot is blue.") are cut, so Act I's narration teaches no legend; the picture keeps its
colours, and the alt text below still names them. 113 words over 8 screens.*

Alt text (spec): *A sheet of old paper with a bicycle drawn on it in brown ink, its seat over the
front wheel and its handlebars at the back, with scribbled notes in the margins. A gold ring is drawn
round the seat; the seat and handlebars are drawn again in their right places and the old lines left
faint; a gold tick marks the corner. The page turns away, the lines rise off it into the shape of a
bike in the air, gold dots land on its seat, handlebars and pedals, blue dots build the rest, and the
finished bicycle rides.*

### 4.2 Storyboard (L = 8, fade 0.0125)

Throughout: `mech.variant` 0, provenance specced, `mech.ghost` 0, `mech.ghostVariant` 0, `mech.steer` 0.

| Beat | Page | Appears → leaves (local) | Camera | Motion / drawing state |
|---|---|---|---|---|
| sp-1 | 1 | 0.00 → dims at 0.06 | S8 → S11 over 0–0.08 (a push-in; no turn). | `sheet.opacity` 0 → 1 over 0.02–0.08 (inOutQuad); `stage.motes` 1 → 0.1 over 0.02–0.08; `ink.flat` 1 from the section's start; `ink.opacity` 0 → 1 over 0.04–0.05; `ink.drawn` 0 at 0.05: the construction lines begin as the page is up. assembly 0, drive 0. |
| sp-2 | 1 | 0.06 → page out ends 0.17 | S11. | `ink.drawn` 0.05 → 1 over 0.05–0.16, linear (the pen at one speed; the wheels are down by ≈ 0.07, the frame by ≈ 0.10, the saddle on the mast and the bars on the stub by ≈ 0.13, hatching and notes last). |
| sp-3 | 2 | 0.17 → page out ends 0.27 | S11 → S11c over 0.17–0.21 (frame → 1): the seat on its mast, lower right; the sheet's margin and notes around it. Holds to 0.27. | Still. |
| sp-4 | 3 | 0.27 → page out ends 0.43 | S11c → S11 over 0.27–0.31 (frame → 0). | `ink.ring` 0 → 1 over 0.28–0.31 (the ring is drawn round the seat as the line says "you point it out"); `ink.redraw` 0 → 1 over 0.32–0.41, linear: the old seat, bars, mast, stub, top tube and cables fade to pentimento by 0.347, the new seat post and saddle draw first, then the stem and bars, then the top tube, seat tube and cables, done at 0.41; `ink.ring` 1 → 2 over 0.39–0.42 (the ring fades once the redraw is done). |
| sp-5 | 4 | 0.43 → page out ends 0.53 | S11. | `ink.tick` 0 → 1 over 0.46–0.49. Otherwise still: the corrected page. |
| sp-6 | 5 | 0.53 → page out ends 0.70 | S11 → S10 over 0.53–0.63 (inOutCubic): the orbit that shows the page as a page. | §3.2: `ink.flat` 1 → 0 over 0.58–0.68; `sheet.opacity` 1 → 0 over 0.60–0.69; `stage.motes` 0.1 → 1 over 0.62–0.72. assembly 0. |
| sp-7 | 6 | 0.70 → dims at 0.84 | S10 → S9′ over 0.70–0.74 (coreFocus → 0.6). | `mech.assembly` 0 → 0.34 over 0.72–0.84: gold lands on the lines. drive 0. |
| sp-8 | 6 | 0.84 → end (no fade-out) | S9′ → S10′ over 0.84–0.90 (coreFocus → 0). | `mech.assembly` 0.34 → 1 over 0.85–0.95; `mech.drive` 0 → 1.4 over 0.90–1.0; `ink.opacity` 1 → 0.25 over 0.90–0.97 (inOutQuad). |

Dwell check (screens, `dwell · 8` against `max(0.3, words / 40)`): sp-1 0.48 ≥ 0.3; sp-2 0.88 ≥ 0.4;
sp-3 0.80 ≥ 0.3; sp-4 1.28 ≥ 0.63; sp-5 0.80 ≥ 0.33; sp-6 1.36 ≥ 0.38; sp-7 1.12 ≥ 0.48; sp-8 1.28 ≥ 0.3.

### 4.3 Keyframe changes, summarised

- `src/story/04-spec.md`: `length: 8`; beats and `at` as §4.2; `draft` stays until the author signs off the copy.
- Removed in the spec section: every `mech.ghost` key and every `mech.ghostVariant` key (both default 0; the dots are not drawn).
- `mech.assembly` in spec: 0 until 0.72, 0.34 at 0.84, 0.34 at 0.85, 1 at 0.95 (0.46 until 2026-10-05). `mech.drive`: 0 until 0.90, 1.4 at 1.0. (The 6-screen values re-timed; the core still lands with nothing of the body started, as `index.ts` notes.)
- `camera.*`: S8 → S11 (0–0.08), S11c (0.17–0.21 in, 0.27–0.31 out, `frame` 1 between), S11 → S10 (0.53–0.63), S9′ (0.70–0.74), S10′ (0.84–0.90). `coreFocus` 0.6 from 0.74 to 0.84.
- New tracks: `sheet.opacity`, `ink.opacity`, `ink.drawn`, `ink.redraw`, `ink.flat`, `ink.ring`, `ink.tick`, `stage.motes` as §4.2. Every one of them is keyed only inside the spec section and returns to its default by the section's end except `ink.opacity` (0.25) and `ink.flat` (0), which the essay ends on.
- `src/timeline/shots.ts`: add `S11`, `S11c`; `src/timeline/shots.test.ts` pins them (§5.3).
- Section lengths: spec 6 → 8 (Act I 19 screens).

## 5. Tests that pin it

Vitest (pure, no browser):

1. **Stroke builder.** `inkStrokes()` is deterministic (two calls deep-equal); every stroke has
   `points.length === pointsTwin.length ≥ 2`; no segment longer than 30 mm × `SCALE`; the segment
   count (moving strokes counted twice) is ≤ `INK_SEGMENT_BUDGET`; every `part` index is valid and
   every `paper` stroke is on the `ground` part; `closed` strokes' first and last points coincide.
2. **Moving set and pen order.** The set of parts with any `moves` stroke equals {saddle,
   handlebars, frame}; within the frame, the moving strokes are exactly the seat tube/stub, the top
   tube, the head tube/mast and the cable runs (identified by the builder's stroke ids); the first
   arc of each part's strokes is in the pen order of §2.4; the cumulative arc is monotone and ends
   at 1; the moving subset's cumulative arc likewise. Content lint: the note generator exposes no
   glyph table and its output has no two rows byte-equal (texture, not text).
3. **Shots.** S11 and S11c hold at their beats' sample points (bearing, elevation, distance, fov,
   frame, as the existing shot tests do); the orbit from S11 to S10 is monotone in bearing and
   elevation over 0.53–0.63; `coreFocus` 0.6 holds over 0.74–0.84.
4. **Tracks.** Sampled at 10,000 points over the section: `ink.drawn` monotone non-decreasing;
   `ink.redraw` 0 before 0.32, 1 after 0.41; `ink.ring` reaches 1 inside sp-4 and 2 by 0.42;
   `ink.tick` 0 before 0.46; `ink.flat` 1 until 0.58 and 0 from 0.68; `sheet.opacity` 1 over
   0.08–0.60 and 0 from 0.69; `stage.motes` ≥ 0.999 wherever `sheet.opacity` is 0 outside the
   section and 0.1 wherever the sheet is 1; **ordering**: at every sample, `sheet.opacity < 0.999`
   whenever `ink.flat < 1` (nothing lifts through an opaque page) and `stage.motes ≥ 0.9` whenever
   `mech.assembly > 0` (no mote lands in the dark); `mech.ghost` is 0 throughout the section.
5. **SceneState.** `SCENE_STATE_PATHS` and `defaultSceneState()` agree (existing test, now
   covering the eight leaves); defaults leave the first frame of every other section byte-identical
   (the existing golden-state fixtures, re-run).
6. **Copy sync.** The storyboard fence (existing) against §4.1 once copied into the storyboard doc;
   the dwell lint with `L = 8`.

Playwright (`?test=1`, 1440×900 and 390×844):

7. **Pure of scroll.** The purity test's sample set gains spec-local 0.10 (mid-draw), 0.36
   (mid-redraw), 0.63 (mid-lift) and 0.78 (gold landing): jump vs forward vs past-and-back are
   byte-equal.
8. **No point rendering in the drawing.** At spec 0.16 (drawn), 0.30 (the ring) and 0.50 (the
   tick): the `mote-ghost` mesh is not visible; the ink mesh's geometry is triangles (`drawMode`
   is not points; a test hook reports `gl.POINTS` draw calls per frame as 0); inside the sheet's
   screen rectangle no pixel is blue-dominant (b > r + 40 and b > g + 20: the agent's hue); the
   number of ink-dark pixels (luminance < 0.35) is above a measured floor and rises monotonically
   through the five samples of the reveal (0.06, 0.08, 0.10, 0.13, 0.16).
9. **Colours.** The median colour of the sheet's rectangle away from the drawing (its margins) is
   within ΔE 6 of `#E7D9B9` after the scrim and vignette are accounted for (sampled below 45 % of the
   height); the ring's pixels have hue in the ochre band; at 0.80 (sheet gone) the surviving lines'
   pixels are warm-pale (r ≥ b) and the stage outside the bike is `#0B0D12` ± 4.
10. **Redraw continuity.** Over 24 samples of 0.31–0.42, consecutive frames differ in no more than
    2.5 % of pixels, and the count of ink-dark pixels never drops below 70 % of its value at 0.31
    (the old lines fade *while* the new ones draw; the bike is never gone); the frame's pixels
    outside a box round the seat, bars and top tube are identical across the window (nothing else is
    touched: "no new frame").
11. **Lift continuity.** Over 0.58–0.68 consecutive frames differ in ≤ 4 % of pixels; at 0.68 the
    projected stroke endpoints (`e2e/machine.ts`, extended to the ink: the builder's points posed and
    flattened by `ink.flat` exactly as the shader does) coincide with the ghost pose's part positions
    to within 2 px, and at 0.58 their z-spread is 0.
12. **Clearance** (existing test, extended): the visible machine includes the ink strokes whenever
    `ink.opacity > 0`, and the sheet's quad whenever `sheet.opacity > 0`; both stay ≥ 8 px under the
    panel's bottom at every beat sample on both sizes; the sheet spans ≤ 92 % of the phone's width.
13. **Reduced motion, no-JS, no-WebGL** (existing): unchanged curves; the stills regenerate from the
    new beats.

## 6. Decisions and what each costs if wrong

| Decision | Cost if wrong |
|---|---|
| Authored strokes from the construction calls, not extracted edges. | Authoring is ~400 lines that must follow `shapes.ts` when a part changes; a sync test (§5.1–5.2) catches a part that gained a solid with no stroke only if the builder enumerates solids. If the author wants a different drawing style later (e.g. only silhouettes), the builder is the one place to change. |
| A floating sheet, square-on, dimmed cloud (P1), not full-screen paper. | If the author wants the whole screen to be paper, the sheet's quad can grow to cover the view at S11 (one size constant) and the text scrim gains a dark band; the lift still works because the page fades before the motes land. |
| The sheet never moves; the camera orbit does the tilting. | If the author wants the page to lie down (L2), add a `sheet.tilt` track and a pose for the quad: one leaf, no renderer change. |
| One global `ink.drawn` with constant pen speed. | If the reveal feels too even, a per-class speed (construction fast, outline slow) is a second cumulative-arc attribute; purity is unaffected. |
| The redraw strikes and redraws (pentimento), rather than morphing the lines. | The approved line says "Just new lines", which this shows. If the author prefers the slide, `ink.redraw` can drive a position blend instead (the two copies are already on the GPU); the continuity test changes from "never gone" to "never jumps". |
| Gold ring and tick as the person's marks, in ochre. | Gold before sp-7 is a legend risk only if a reader takes the ring for the agent's; it is drawn in a different hand (overshoot, 2.2 px) and colour. Drop both by zeroing two tracks. |
| Notes as scribble. | If they read as fake writing rather than marginalia, drop the blocks (one call each) — nothing else depends on them. |
| Ink colour runs sepia → pale as the sheet fades; the lines persist under the built bike at 0.25. | If pale lines under the finished bike compete with the motes, end `ink.opacity` at 0 instead; the ghost dots are still available for Act II. |
| `stage.motes` dims the cloud to 0.1 rather than hiding it. | If dust on the page shows, 0.1 → 0.03 is one key; the mote shader library is untouched either way. |
| 8 screens for the section. | The dwell lint is the lever; if 8 feels long, sp-3's page (0.17–0.27) and sp-5's (0.43–0.53) can each lose 0.03 before any beat falls under budget. |
| Widths in CSS px (not world units). | Lines are relatively heavier on a phone, as in a printed book. If the author wants the drawing to scale with the page, set widths in bike mm × px-per-metre (one branch in the vertex shader). |
| No `Line2`/`LineMaterial`. | If a later three.js ships the features we patched in, swapping the renderer is contained in `src/scene/ink/`; the stroke data and the SceneState leaves do not change. |

## 7. Handoff notes

- Files to add: `src/mechanisms/bike/ink.ts` (+ test), `src/scene/ink/inkSystem.ts`,
  `src/scene/ink/shaders/ink.vert.glsl`, `ink.frag.glsl`, `sheet.vert.glsl`, `sheet.frag.glsl`
  (+ tests); `Mechanism.ink?: () => Stroke[]` in `src/mechanisms/types.ts` (optional: the other
  mechanisms and the comparison bench run without ink).
- Files to change: `sceneState.ts` (eight leaves), `keyframes.json` (spec section), `shots.ts`,
  `04-spec.md`, the storyboard doc §1 Section 4 and §2.4–§2.7 (replace with a pointer to this
  document), `main.ts` (create and update the ink and sheet systems next to the motes; the sheet
  and ink read the same `SceneState` and camera), `mote.vert.glsl` / `thread.vert.glsl` (`uStage`),
  `e2e/machine.ts` (ink and sheet extents), `e2e/clearance.spec.ts`, `e2e/purity.spec.ts` samples.
- Not changed: `mote.glsl`, `mote.ts`, the parity page, `ghost.*.glsl`, anything in the vibe-build,
  reveal and rewind sections, the text engine.
- Open for the author: whether the notes stay (§2.7); whether the ink stays faint under the built
  bike (§6); whether the tick should instead be the person's initials-like squiggle (the same
  generator as the notes, one short row) — the tick is clearer, so it is the default.

## 8. As built (2026-10-05)

Everything above is built as written, except for these differences, each made where a number did
not hold, a test could not be met as worded, or the frames said so:

- **`ink.flat` falls over 0.61–0.69, not 0.58–0.68.** §5 test 4 asks that nothing lift through an
  opaque page (`sheet.opacity < 0.999` whenever `ink.flat < 1`), but §4.2 keeps the sheet at 1 until
  0.60. The lift now starts once the page has begun to fade (it is 0.975 at 0.61) and ends with it.
- **The ink draws before the motes** (`renderOrder` −0.5, after the sheet's −1), not after them (2):
  the motes screen-blend over the lines, so at the end the faint lines lie *beneath* the built bike,
  as §2.1 says, rather than over it.
- **All twelve spokes are drawn plainly**, not every other one as a far-side line: with six faint the
  wheels read sparse, and the mock frames the author liked show twelve.
- **Three tyre circles are the tyre (0.34), the tyre less its section (0.31, which is `WHEEL.rim`)
  and the rim's inner edge (0.294)**: the table's "rim" circle is the second.
- **`moves` compares the two builds posed at rest (bike coordinates), not part space.** The saddle's
  profile is the same in its own space on both builds; only its mount moves. In part space it would
  not "move", and the drawing would show the saddle in the right place from the start.
- **The saddle's hatching rides with the saddle** (a page stroke on the saddle part, struck out and
  redrawn with it), not with the ground: on the ground it would stay over the front wheel after the
  redraw. The paper test excepts it by name.
- **Strokes on one build only** (`only`): the twin's cradle under its saddle is struck out and never
  redrawn. **Strokes straight across the side view** (`across`: the bars' cross tube, the basket's
  short rims) collapse to a dot when flat, so they are hidden until they lift.
- **The lamp is its side silhouette** (the cylinder as a rectangle, the lens as a half circle), not a
  circle; a circle reads as a second bell.
- **The right-of-the-wheel notes start at x 1.25, not 1.12**, clear of the front tyre.
- **S11c targets (0.85, 0.85), not (0.80, 0.95)**: the seat on its mast stays in the upper middle of
  the close frame and the basket and the top of the front wheel come into it, so "on the front" is
  in the picture, not only implied.
- **Each part's x-rank is its strokes' mean x** posed at rest, rear 1, front 0; the bars are not made
  last by hand (they lift with the head of the bike, last but for the front wheel and fork).
- **Stroke points are part space in world units** (`BoundPoint.local`'s units), and the mechanism
  gains `sheet` beside `ink` (both optional; only the bike has them). The pen's arc is measured in 3D
  part space, so the pen keeps one speed whatever the pose.
- **The pentimento is 0.17 of a line's own alpha** (0.15 absolute on the outline ink), and the wobble
  is centred on the line (±0.9 px), not a one-sided offset.
- **The chain is 24 links** (`CHAIN_SEGMENTS`), not 36.
- **Act I is 21 screens** (8 + 4 + 1 + 8), not 19: §0 counted the old six-screen spec section.
- **Tests.** §5 test 10's "box round the seat, bars and top tube" is a mask of every pixel within
  8 px of a moving stroke (both copies) or the ring, which also covers the cables' run down the seat
  stay. Test 11 is in two halves: the geometry (at the end of the lift every line stands on its
  part's pose; before it every line has z 0) is a unit test of the shader's TypeScript mirror
  (`src/scene/ink/inkLayout.test.ts`); the pixels are sampled every 0.002 from 0.63, where the
  camera's turn has come to rest, to 0.70. While the camera turns the whole page slides across the
  screen, which changes more than 4 % of the frame between any two useful samples whatever the
  lines do; that move is held continuous by the camera tests. The page's own test hook reports
  three.js's point and triangle counts and the visible meshes (`window.__motes.drawStats()`).
