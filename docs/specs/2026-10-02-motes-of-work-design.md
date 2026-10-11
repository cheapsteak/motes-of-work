# Motes of Work — design spec

*Working title. Status: draft for review. Date: 2026-10-02 (revised 2026-10-03: mote rendering, risks and spikes; revised again 2026-10-03: the bicycle and the ergonomic wrong twin, §5.8).*

A self-paced, scroll-driven essay about where human attention belongs when working with coding agents. A 3D point cloud is the centerpiece: particles ("motes") of human, agent, and human↔agent work build a machine, and scrolling moves the camera and morphs the cloud through the phases of the argument.

---

## 1. Purpose and audience

- **Reader:** the public — mainly engineers on Reddit — plus the author's friends at work. Non-commercial.
- **Outcome:** readers change how they spend attention day to day — slow down and go hands-on for specs, checkpoints and durable guidance; step back and stop micromanaging during execution.
- **Format:** self-paced scrollytelling page read alone, not a live talk. The text must carry the argument without a presenter; the cloud makes it stick.
- **Hosting:** its own standalone repository and static host, public-capable. All content must be publication-safe (see §7).

## 2. Thesis

1. **High-touch moments exist.** Some phases of agentic work need the human close, slow and focused; others need the human to step back.
2. **The spec is the most important high-touch moment**, because models still lack high-level taste — they don't know what matters to humans. A spec carries *intent* (purpose, end state, constraints — "commander's intent"), which is exactly the part an agent cannot infer.
3. **Vibing the spec doesn't skip the spec; it defers it** — until after you've paid for a confident, polished build of the wrong thing.
   The wrong thing is rarely broken: with end-to-end tests, agent-built parts connect and run. It fails where it meets people — it misunderstands how a person will use it, like a teapot with its handle on the spout side. A brief that lists parts and features can look complete and still never say how a body uses the thing, because no person would think to write that down.
4. **Without a spec you can't even see drift**, because there's nothing to measure against.
5. **Attention should scale with leverage** (≈ blast radius × lifetime). One line of durable guidance shapes every arc for months; a prompt shapes one session. "High touch" is a tier, not only a moment.
6. **Durable tiers must stay sparse**, and guidance should move between tiers: repeated corrections get promoted to rules, repeatedly broken rules to mechanisms. *Fast layers learn, slow layers remember.*

## 3. Decisions log

| Decision | Choice |
|---|---|
| Delivery | Self-paced scrollytelling page |
| Audience | Engineers on the team; practical behavior change |
| Visual subject | Recognizable 3D **mechanical systems** whose motion reveals whether they work |
| Which mechanism | **A bicycle** (§5.8). Everyone knows how one should work, it moves, and its wheels and chainring are large enough to read as a point cloud. Chosen after comparing a watch movement, a Strandbeest, a steam engine and the placeholder gears side by side; those four stay registered as a development bench (§6.3). Architecture keeps the swap to one config line |
| Wrong twin | **The saddle and handlebars swap posts, and the frame is built around the swap**: the saddle is fixed on top of a tall, telescopic steering mast (it still adjusts for height, so every line of the brief is met), the handlebars clamp to a stub of seat tube, and the top tube climbs from the stub to the mast. A fully working bike, every test green, that no one could ride, and that no spanner could put right: fixing it means a new frame. It follows from a plausible bulleted brief (§4, I.1) |
| Core | **The contact points** — saddle, handlebars, pedals — where the bike meets a body. Frame, wheels, chain and brakes are the body |
| Geometry source | Procedural (three.js geometry sampled with a seeded `MeshSurfaceSampler`), not static meshes — mechanisms need exact pivots, ratios and a same-parts wrong twin. Gear and linkage math ported from permissive sources |
| Licensing | Port only MIT/BSD/Apache/public-domain code, with notices in `CREDITS.md`. NC, SA, copyleft or unlicensed code (Shadertoy/OpenProcessing defaults) is studied for technique only, never copied or translated; credited under "Inspired by" |
| 3D look | Per-point surface normals with key/fill/rim lighting, back-face dimming, depth fade, three-quarter camera views. A Fable-model visual review guides the polish pass |
| Counterexample | A brief that looks complete yields a working machine that misunderstands its user (the swapped bike), plus a subtler "detail in the wrong place" failure |
| Structure | Two acts — within an arc, across tiers — bridged by leverage |
| Opening | Cold open on the vibe build, then a scroll-driven **rewind** |
| Hosting | Standalone repo, static host, public-capable |
| Stack | Vanilla three.js + Vite + small scroll driver now; **move to Theatre.js for choreography soon** — architecture isolates that swap (§6.2). Theatre's last release was 0.7.2 (May 2024), so its keyframes must stay exportable to our own JSON |
| Renderer | `WebGLRenderer` (WebGL2). Motes drawn as stateless instanced camera-facing quads, not `gl_PointSize` points (§6.4). Revisit `WebGPURenderer` once three.js stops calling it experimental and Firefox ships WebGPU on Linux and Android |
| Language | TypeScript *(assumed — override if preferred)* |

## 4. Narrative

Each section is one idea, told as a picture book: a few pages of short lines, each line coming up when it is its turn to be read. Act I's copy, storyboard and text engine are designed in `docs/specs/2026-10-04-act-1-storyboard-and-text-engine.md` (the storyboard doc below); elsewhere the copy here is the *gist*, not final text — final copy is the author's (voice and taste are high-touch).

### Prologue — Meet the motes

| # | Idea | Scene | Camera |
|---|---|---|---|
| P1 | Three kinds of work | One human mote, then an agent swarm, then a back-and-forth pair, each introduced alone with a caption | Close, static |
| P2 | The camera is your attention | Camera eases in, then pulls wide; caption names the rule | Demonstrates close vs. wide |

### Act I — Within an arc

| # | Idea | Scene | Camera |
|---|---|---|---|
| I.1 | The vibe build (cold open), 6 screens | You want a bike; you write down what it needs and hand the list to an agent; the blue dots are the agent's work. The **brief** (a document, on its own page) comes up, and a polished bike assembles and runs; each brief line lights in reading order once its parts have settled (seat and handlebars first, the frame's "sturdy" line last). All settled motes are cool (no human touched the core). No ghost. Copy and beats: storyboard doc §1, §2.1 | Low three-quarter, drive side; wide |
| I.1b | Reveal, 4 screens | The running bike is the **wrong twin**, and its frame is shaped around the mistake: the saddle is fixed on top of a tall mast that rises from the head tube and steers, the handlebars stick out of a stub where the seat tube should be, and the top tube climbs to the front to meet the mast, so the still reads as a new frame to fix, not a part to turn. The lines walk the reader through it: it runs; now try to ride it; the seat turns with the wheel; the bars never turn; to fix it you need a new frame; every dot is blue; every line on the list is met, and nobody wrote down that you sit on the seat and hold the bars. Still cool throughout, no ghost. The saddle visibly turns with the front wheel. Copy and beats: storyboard doc §1, §2.2 | Rises to a high front three-quarter so the saddle's turn and the fork under it read (side-on is the most mistakable angle: a swapped bike reads as a normal bike facing the other way) |
| I.2 | Rewind, 1 screen | "So you take it all apart." Scrolling runs the machine backward to a nebula. The ghost of intent has never existed yet. Storyboard doc §2.3 | Pulls back |
| I.3 | Spec: the drawing first (high touch), 6 screens | Before anything is built, the agent draws the bike as a white wireframe (the **ghost**, first appearance) from the same list, and makes the same mistake. Caught in a drawing, it costs a moment: you point it out, the agent redraws, and no frame has to be rebuilt. Then the gold (human) motes land on the seat, the handlebars and the pedals, the agent builds the rest, and Act I ends on the correct bike running. Copy and beats: storyboard doc §1, §2.4 | Storyboard doc §2.4 |
| I.4 | Build (low touch) | Swarm fills the body; assembly 0→1. Time-lapse feel | Wide |
| I.5 | Drift | Fault dials creep up with run length (adherence decays over long sessions). Quiet failure appears: detail piling up on the case while the core goes sparse/fuzzy | Medium; ghost makes the gap visible |
| I.6 | Checkpoint (high touch) | Dive into the core. Human motes catch drift; loose motes are pulled back; faults reset | Very close |
| I.7 | It runs | Correct machine running against its ghost; mote-mix strip shows the hourglass shape | Hero orbit |
| I.8 | Bridge | "You'll make that same correction in the next arc. And the one after." | Begins pulling out |

**The brief (I.1).** Shown as a document on its own page (wording: storyboard doc §1, its handling §3.5): an Instrument Serif ask and five hanging lines, no bullets, no box. Each line lights as a pure function of scroll progress (§6.1), when the parts it names have settled, and every line is met by the swapped bike. "Both adjustable" makes the seat and handlebars read as interchangeable; "the front wheel turns, so you can steer" ties steering to the wheel, not to anything a person holds. Final wording is the author's.

### Act II — Across arcs

| # | Idea | Scene | Camera |
|---|---|---|---|
| II.1 | Zoom out | The machine is one of many (instanced copies) in a workshop of arcs; the same drift recurs across copies | Very wide |
| II.2 | The layers | Tier fields appear nested — guards, constitution, domain, playbook, arc, task, turn — each evolving at its own rate (pace layering) | Slow orbit |
| II.3 | Wrong but consistent guidance (replaces Leverage) | Streams and nodes in three layers (durable guidance, specs, code); a cracked guidance node seeds cracked specs and code faster than anyone can fix them one by one; fix the source. Full design: docs/specs/2026-10-05-act-2-wrong-guidance.md | Wide, zoom in, zoom out, trace upstream |
| II.4 | Overload | Constitution current fills with conflicting arrows → turbulence; one important arrow gets lost. Rules present but not firing | Medium, into the turbulence |
| II.5 | Promotion | A repeated turn-ripple thickens into a field, then hardens into a wall (hierarchy of controls). "Fast layers learn, slow layers remember" | Tracks one ripple |
| II.6 | Meta | Guidance about guidance. Tools don't resolve conflicts between tiers, so keeping tiers clean is human work | Pulls back to the whole stack |

### Coda — Where to spend your attention

A one-screen reference map: which moments and which tiers are high-touch, and why. Static enough to bookmark and revisit.

## 5. Visual language

### 5.1 Motes

Distinguished by size, motion and count as well as color, so the piece reads without relying on hue.

| | Human | Agent | Back-and-forth (dialogue) |
|---|---|---|---|
| Color | warm amber | cool blue | pale violet-white |
| Form | large, soft, haloed | tiny, sharp | twin points orbiting each other |
| Motion | slow, deliberate | fast, swarming | braided spiral, faint thread between the pair |
| Count | tens–hundreds | tens of thousands | hundreds |

**Motes become the material.** A mote is bright in flight and dims when it settles into the machine, keeping its color. The finished machine therefore shows **provenance**:

- **Specced:** warm/violet core, cool body.
- **Vibed:** cool throughout.
- **Misallocated (quiet failure):** warmth and density on the case; core sparse and fuzzy.

### 5.2 Ghost of intent

Once a spec exists, a faint dotted ghost of the *intended* machine (zero faults, correct variant) persists. Every fault is legible as divergence from it. The vibe build has no ghost; it first appears during the rewind/spec.

### 5.3 Faults

Each is a 0–1 dial with a distinct motion signature:

| Fault | Signature |
|---|---|
| `misalign` | part wobbles off-axis; gears interpenetrate at the mesh |
| `slip` | driven part lags its driver in jerks |
| `bind` | motion slows at certain angles; particles at the contact bunch up and flicker |
| `jitter` | fine high-frequency shake |
| `ratio` | output runs at the wrong speed (obvious against the ghost) |
| `stall` | periodic stop, then catch-up |
| `drift` | settled motes detach and wander from their parts |

### 5.4 Camera

Close and slow = high touch; wide and time-lapse = low touch. Shallow depth of field in close shots.

### 5.5 Act II tier fields

| Tier | Rendering |
|---|---|
| Guards | translucent walls particles bounce off |
| Constitution | gentle global current over all copies |
| Domain | regions that light up when motes enter |
| Playbook | a reusable path motes trace |
| Arc | the frame from Act I |
| Task / turn | small ripples |

Outer layers evolve slowly, inner ones fast. Overload = turbulence. Promotion = ripple → field → wall.

### 5.6 Overlays

- **Mote-mix strip:** stacked band along the bottom edge spanning the whole story, with a playhead.
- **Effort counter:** "mote-seconds"; keeps counting through the vibe build and never resets in the rewind.

### 5.7 Look

Dark stage so particles glow; calm, highly legible text panels; sentence case throughout.

### 5.8 The bicycle

**Parts and roles.**

| Role | Parts |
|---|---|
| Core (warm when specced) | Saddle and seat post (on the twin, its cradle and the top of the steering mast); handlebars with brake levers, the cable housings from the levers and bell; pedals |
| Body | Frame with the brake cable runs; fork with the front basket and its headlamp; front and rear wheels; chainring and cranks; rear sprocket; chain; brakes; mudguards (a reflector and the rear rack on the rear one); ground strip |
| Drift | A few small loose parts |

**Wrong twin.** The saddle assembly and the handlebar assembly swap posts, and the frame is built around the swap, so a reader sees at a glance that fixing it means a new frame, not turning a part (wrong specs harden into structure). The head tube runs on up as a tall mast; the steering column inside it carries the saddle on a cradle at its top (no seat post), so the saddle turns with the fork. The column telescopes in the mast, so the seat still adjusts for height and the brief's "both adjustable" line is met. The seat tube is cut to a stub a little above where the top tube and stays meet it, and the handlebars clamp into that stub through a short stem: low, behind the rider, square, never turning. The top tube climbs from the stub up to the mast, the opposite slope to the correct frame's nearly level one, and is the whole-frame cue from the reveal camera (at least 15° of rise on screen). The brake cables are committed to it: from the levers on the low rear bars forward along the top tube to the front brake, and a short loop down to the rear brake (on the correct bike they run the usual way, from the levers by the stem). The frame, saddle and handlebars change shape point for point (each tube keeps its points at the same place along and round it); every other part keeps its pose and shape, so the variant morph reads as the two warm assemblies trading places while the frame reshapes under them. Direction cues, the same on both bikes, keep the twin from reading as a normal bike facing the other way: the town bike's front basket over the front wheel, carried on the fork (on the twin the saddle perches just behind and above it), a headlamp on the basket, a rear rack over the back wheel, and a reflector on the rear mudguard. The twin still runs: pedalling drives the back wheel, and steering turns the front wheel (by twisting the saddle). In the twin the steering swings further (about 26° against the correct bike's 8°) so the saddle visibly cocks with the front wheel while the handlebars stay square — the one still-frame cue that cannot read as "the same bike facing the other way".

**Faults** (§5.3, mapped to the bike).

| Fault | On the bike |
|---|---|
| `misalign` | Buckled front wheel: it wobbles off-axis as it turns |
| `slip` | Chain skips teeth: the cranks turn, the back wheel lurches behind them |
| `bind` | A brake rubs: the wheel slows unevenly each turn |
| `ratio` | Wrong gear: the back wheel runs much faster or slower than the cranks |
| `stall` | The chain drops: the pedals spin on while the wheels repeatedly coast to a stop and catch up again (periodic, so every frame stays a pure function of scroll); the chain visibly sags |
| `jitter` | Loose parts rattle (mudguards, bell, brake cables) |
| `drift` | Motes wander off their parts (generic) |

**Chain.** Built as a run of short segment parts posed along the chain path, so a dropped, sagging chain is a pose, not a new shape.

**Staging.** A faint ground strip under the wheels (dim, sparse, like the steam engine's floor); the bike stays in place and its wheels turn. No rider is ever drawn: the warm contact points stand in for the person. Default camera low, three-quarter, from the drive side, so the chain, chainring and both wheels read and the saddle and handlebars stand against the sky. The spec close-up frames all three contact points together.

**Pedals** stay level as the cranks turn, as real pedals do under a foot.

## 6. Architecture

```
 DOM scroll ──► scroll driver ──► progress (0…1 global, + section-local)
                                        │
                                        ▼
                          ┌──── Sampler (interface) ────┐
                          │ v1: KeyframeSampler (JSON)  │
                          │ v2: TheatreSampler          │
                          └─────────────┬───────────────┘
                                        ▼
                                   SceneState (flat, numeric)
                     ┌──────────────────┼───────────────────┐
                     ▼                  ▼                   ▼
               camera rig        mechanism module      mote system (GPU points)
                                 pose(drive, faults)
                                        └─────────┬─────────┘
                                                  ▼
                                    renderer + overlays
```

### 6.1 The purity invariant

**Every rendered frame is a pure function of scroll progress.** No simulation state accumulates across frames. This is what makes the rewind exact and makes a reader who jumps mid-story see the same thing as one who scrolled there. Consequences:

- Mechanism motion is driven by `SceneState.mech.drive`, never the wall clock.
- The effort counter's value is defined by the timeline (integrated analytically from progress), never accumulated per frame.
- Per-point randomness comes from a fixed per-point seed.
- **Idle shimmer** while the reader pauses is the single exception: an additive, time-based perturbation applied after sampling, never fed back into state; disabled in test mode and under reduced motion.
- The text obeys it too: every page's opacity and every line's reveal and dim are pure functions of progress, set from the scroll driver with no CSS transition (storyboard doc §3.2).

### 6.2 SceneState and the Sampler (the Theatre.js seam)

```ts
interface Sampler {
  sample(progress: number): SceneState; // pure, deterministic
}

type Vec3 = [number, number, number];

interface Faults {
  misalign: number; slip: number; bind: number; jitter: number;
  ratio: number; stall: number; drift: number; // each 0..1
}

interface SceneState {
  camera:  { pos: Vec3; target: Vec3; fov: number; focus: number };
  mech:    { assembly: number;   // 0 exploded → 1 assembled
             variant: number;    // 0 correct → 1 wrong twin
             drive: number;      // the machine's own clock
             faults: Faults;
             ghost: number };    // ghost opacity
  provenance: { vibed: number; misallocated: number }; // both 0 = specced
  motes:   { human: number; agent: number; dialogue: number; activity: number };
  workshop:{ copies: number; spread: number };
  tiers:   { guards: number; constitution: number; domain: number; playbook: number;
             arc: number; task: number; turn: number;
             turbulence: number; promotion: number };
  overlay: { strip: number; effort: number; effortVisible: number };
  clock:   number;                // τ: scroll-derived clock for Act II field effects
}
```

Rules:

- Every field is **flat, numeric and blendable** so it maps one-to-one onto a Theatre.js property. Discrete choices (e.g. which variant) are expressed as 0–1 blends.
- Downstream code reads only `SceneState`. Nothing downstream knows which Sampler produced it.
- **v1 `KeyframeSampler`:** a JSON file of per-field keyframe tracks (`{ at: progress, value, ease }`).
- **v2 `TheatreSampler`:** wraps a Theatre.js project; `sequence.position` is derived from progress. Migration is a one-time conversion script from v1 JSON to an initial Theatre project state, plus a config switch. The studio UI is dev-only; production ships `@theatre/core` only.
- **Theatre is replaceable.** Its last release was 0.7.2 (May 2024). Theatre drives only `SceneState` scalars, and an export script converts its keyframes back to the v1 JSON format, so dropping Theatre never loses choreography work.

### 6.3 Mechanism module contract

```ts
type Role = 'core' | 'body' | 'drift';

interface PartTransform { position: Vec3; quaternion: [number, number, number, number] }

interface MechanismPart {
  id: string;
  role: Role;
  explodedOffset: PartTransform;  // closed over the part's own settle window: exploded before it, in pose after it
}

interface BoundPoint {
  part: number;          // index into parts
  local: Vec3;           // position in part space, correct variant
  localTwin: Vec3;       // position in part space, wrong-twin variant
  normal: Vec3;          // unit surface normal in part space, correct variant
  normalTwin: Vec3;      // unit surface normal in part space, wrong-twin variant
  seed: number;
}

interface Mechanism {
  id: string;
  parts: MechanismPart[];
  // Pure. Ghost pose is pose(drive, ZERO_FAULTS, 0).
  pose(drive: number, faults: Faults, variant: number): PartTransform[];
  // Deterministic for a given (budget, seed).
  samplePoints(budget: number, seed: number): BoundPoint[];
}
```

- Narrative and camera reference parts **by role**, never by name ("the core", not "the escapement").
- The wrong twin is built from the **same parts**, so morphing between variants stays continuous.
- Mechanisms live in `src/mechanisms/<name>/` and are selected by one config line.
- **Placeholder for development:** a simple mechanism (two meshing gears + crank arm with a wrong-twin variant) that exercises the whole contract until the real mechanism is chosen. Its existence keeps the swap honest.
- **Development bench:** the gears, watch movement, Strandbeest and steam engine stay registered alongside the bicycle. They appear on the comparison page, not in the essay, and every shared test runs over all of them, so the contract never quietly bends to fit one machine. How to add one: `docs/adding-a-mechanism.md`.

### 6.4 Mote system

Stateless and computed from scroll progress every frame. GPU simulation (ping-pong render targets) is rejected because it breaks the purity invariant: jumping or rewinding would require re-simulating from the start.

- **Instanced camera-facing quads, not `THREE.Points`.** One instance per mote via `InstancedBufferGeometry`. Quad size is computed in the shader with perspective attenuation and clamped to a per-quality-tier pixel cap. Points are avoided because maximum point size varies by device (reportedly as low as 64px on some Apple GPUs — measure on test devices), drivers clip points inconsistently at screen edges, and `WebGPURenderer` only draws 1px points.
- **Per-instance attributes, packed into ≤ 6 vec4s:** bound part, local and twin positions, mote type per provenance scenario, visibility per provenance scenario, settle order, seed.
- **One pure position function, `mote(id, SceneState) → { pos, type, brightness, visible }`,** kept as a small isolated GLSL library and shared by every draw that shows a mote: motes, dialogue threads, ghost, Act II trails. It computes in-flight vs. settled from `assembly` and settle order, then applies the part transform, variant blend, faults and drift. A **TypeScript mirror** of `mote()` is the reference implementation for unit and purity tests. Isolation also lets it port to TSL as one unit if we later move to WebGPU.
- **Part transforms live in an RGBA32F `DataTexture`** read with `texelFetch` (NEAREST filtering): one row per copy × part, 2–3 texels per part (quaternion + translation, or a 3×4 matrix). This is rigid skinning with one bone per point. A uniform array is rejected because many devices, Safari especially, guarantee only ~256 vertex uniform vectors. No half floats for positions (visible jitter).
- **CPU per frame:** `SceneState` plus parts × copies transforms. Nothing else.
- **Dialogue motes:** one instance per pair. The shader derives both twins from the pair anchor plus an orbit phase. The thread is a second draw over the same instance buffer — thin quads with alpha falloff (WebGL ignores `linewidth`), or `LineSegments` if a 1px line holds up at high DPR.
- **Ghost:** a redraw of a subset of instances with faults forced to 0, in a small hard-dot style.
- **Act II:** all copies in one instanced draw (`copy = instanceID / perCopy`) with a reduced per-copy budget. Tier-field effects are closed-form functions of position and τ, a scroll-derived clock (`SceneState.clock`):
  - **Walls:** triangle-wave reflection, `fold(x) = L − |mod(x, 2L) − L|` (bounce without simulation).
  - **Current:** `+ c·τ`, applied before the fold.
  - **Turbulence and drift:** curl or value-noise displacement sampled at (rest position, τ), never integrated.
  - **Regions:** an SDF test on the computed position.
  - **Ripples:** radial `sin(k·r − ω·τ)`.
  - **Trails:** K extra samples of `mote()` at τ − kΔ.
- **Idle shimmer** is added after `mote()`; its wall-clock time is wrapped on the CPU to preserve float precision.
- **Optional, only if spike 2 (§10) shows vertex cost above ~4ms:** a stateless position pass that evaluates `mote()` once per point into a float render target each frame, read by the quads, threads and trails. Still pure: it's recomputed from progress every frame and nothing carries over.

### 6.5 Folder layout

```
src/
  story/        NN-name.md sections (front matter: id, length, alt; body: beat and page markers),
                the loader, the text engine's curves and the story markup
  scroll/       scroll driver: DOM scroll → progress
  timeline/     Sampler interface, KeyframeSampler, (later) TheatreSampler, keyframes.json
  scene/        renderer, camera rig, mote system
    mote/       mote.glsl (shared position function) + mote.ts (TS mirror for tests)
  mechanisms/   <name>/ modules + contract test
  overlays/     mote-mix strip, effort counter
  fallback/     generated stills for no-WebGL / reduced motion
```

## 7. Content rules

- One idea per section, told in pages of short lines. Limits per line (≤ 26 words; a document such as the brief ≤ 60), per page (≤ 3 lines) and per section (≤ 35 words per screen), and the dwell each line must get, are in the storyboard doc §3.3.
- Words live in `story/*.md`, separate from code.
- **Publication-safe:** no internal issue numbers, file paths, tool or company names. Incidents are retold generically (e.g. "a style rule scoped to the frontend never fired when an agent drafted a chat message").
- **Sources** in a footer, labeled by tier; preprints marked as preprints. Re-verify every citation before publishing.
- Sentence case for all UI text.
- **Content lint** (a deterministic check, not a prose rule): the limits and the dwell budget above, a denylist of internal-identifier patterns, and a sync fence between the story markdown and the storyboard doc's copy and timing tables.

## 8. Performance, fallbacks, accessibility

**Budgets**

- 60 fps on an integrated-GPU laptop; ≥ 30 fps on a ~3-year-old phone.
- Motes: ~100k desktop, ~30k mobile, chosen by a quick GPU capability probe. Device pixel ratio capped at 1.5–2 (set by spike 1, §10).
- Fill rate, not vertex count, is the expected phone bottleneck: halos have a per-quality-tier pixel cap, and mote materials use additive blending with `depthWrite: false`.
- All per-point animation on the GPU.
- Rendering pauses when the canvas is off-screen or the tab is hidden.

**Fallbacks and accessibility**

- `prefers-reduced-motion`: no camera flights; crossfade between section stills; idle shimmer off.
- No WebGL: per-section stills **generated by the screenshot test suite** from the same build, so they cannot drift from the real thing.
- Text fully readable without the canvas, and without JavaScript (the build writes the story into the page); keyboard scrolling works; canvas is `aria-hidden` with a short per-section text description. The text engine is opacity and a colour mix only, the same under reduced motion (storyboard doc §3.6, §3.7).
- Text sits above the machine on every screen, over a scrim at the top of the stage (storyboard doc §3.4).

## 9. Testing

- **Rewind invariant:** `sample(p)` is identical regardless of the path taken to `p` (forward, backward, jump).
- **Golden-frame purity test, from day one:** render progress `p` by scrolling forward and by jumping straight to it (shimmer off) and require pixel equality.
- **`mote()` unit tests** against the TypeScript mirror (§6.4): determinism, settle behavior, each fault's divergence from the ghost.
- **Mechanism contract test**, run against every module in `mechanisms/`:
  - `pose(d, ZERO_FAULTS, 0)` equals the ghost pose.
  - Each fault > 0 produces measurable divergence from the ghost.
  - `samplePoints` is deterministic for a fixed seed and returns the requested budget.
  - Correct and twin positions exist for every point.
- **Visual regression:** Playwright screenshots at each section anchor (deterministic because state = f(progress) and idle shimmer is off in test mode). The same captures feed the no-WebGL fallback.
- **Performance smoke test:** frame-time measurement over a scripted scroll in headless Chromium. Software-rendered, so it's indicative only; a short manual checklist covers real devices.
- **Bicycle tests** (§5.8): the chain, chainring, sprocket and wheel speeds agree; pedals stay level through a crank turn; steering turns the fork, and in the twin the saddle with it; in the correct bike the contact points sit where one seated body reaches all three, and in the twin the saddle and handlebar assemblies have swapped posts while every other part's pose is unchanged; the twin frame has a stub seat tube, a tall mast and a top tube that climbs at least 15° on screen from the reveal camera, its points map tube to tube from the correct frame, and only the frame, saddle and handlebars change shape; the spec section's last stretch holds the core fully settled; every fault diverges from the ghost; the chain stays continuous through `stall`.
- **Brief card:** each line's tick is a pure function of section-local progress and lands after its parts settle (the jump/scroll purity test covers the card).
- **Content lint** in CI (§7).

## 10. Risks and first spikes

The implementation plan starts with these spikes, before story work. The rendering estimates in §6.4 are engineering estimates, not benchmarks.

| # | Risk | Spike | Decides |
|---|---|---|---|
| 1 | Phone fill rate from large additive halos | 30k quads with human halos at the worst camera framing, on a recent iPhone and a 2023 mid-range Android; measure GPU frame time | DPR cap, per-tier halo pixel cap |
| 2 | Vertex cost with every fault and Act II field active | Worst-case `mote()` with 100k motes on an integrated-GPU laptop (Intel Iris Xe or M1 Air) | Whether the optional position pass (§6.4) is needed (threshold ~4ms) |
| 3 | Float data texture read in the vertex shader on iOS | `texelFetch` of RGBA32F in a vertex shader on iOS Safari | Transform storage format |
| 4 | Purity regressions | Golden-frame test (§9) running in CI from the first commit | — |
| 5 | Point-size and clipping limits (why quads) | Record `ALIASED_POINT_SIZE_RANGE` on the test devices | Confirms the quads decision |
| 6 | Theatre.js is unmaintained (last release May 2024) | Round-trip a small Theatre project through the export script back to v1 JSON | Whether Theatre stays in the plan |
| 7 | Dialogue thread aliasing at 1px | Render threads at DPR 2–3 | `LineSegments` vs. thin quads |

## 11. Sources to draw on

Tiers: T1 data, T2 official docs / peer-reviewed, T3 blogs / talks. Re-verify before publication.

- Gloaguen et al., "Evaluating AGENTS.md: Are Repository-Level Context Files Helpful for Coding Agents?", arXiv 2602.11988, 2026 — T1, preprint. Context files rarely improve success, add >20% inference cost; value lies in documenting non-standard practice.
- McMillan, "Instruction Adherence in Coding Agent Configuration Files", arXiv 2605.10039, 2026 — T1, preprint, single author. File structure showed no detectable effect; adherence decays within a session.
- Jaroslawicz et al., "How Many Instructions Can LLMs Follow at Once?" (IFScale), arXiv 2507.11538, 2025 — T1, preprint.
- Liu et al., "Lost in the Middle", TACL 2024 — T2.
- Hong, Troynikov, Huber, "Context Rot", Chroma, 2025 — vendor technical report.

Rendering (§6.4, §10):

- three.js `WebGPURenderer` manual (experimental status, no `ShaderMaterial`); `PointsNodeMaterial` docs (1px points); `LineBasicMaterial` docs (`linewidth` ignored) — T2.
- W3C GPU for the Web, "Implementation Status" wiki (browser WebGPU support), updated 2026-10-02 — T2.
- Web3D Survey, WebGL2 parameters (`MAX_VERTEX_UNIFORM_VECTORS`, `MAX_VERTEX_ATTRIBS`, float extensions) — T1 data.
- npm registry: `@theatre/core` 0.7.2 released 2024-05-19 — T1 data.
- Khronos WebGL issue #2888, inconsistent point clipping across drivers, 2019 — T3.
- Apple Developer Forums, M1/M2 `ALIASED_POINT_SIZE_RANGE` capped at 64, 2022 — T4, unverified (spike 5).
- Bruno Simon, Three.js Journey, "Particles morphing shader" — T3; prior art for the stateless progress-mix pattern.
- Bridson et al., "Curl-Noise for Procedural Fluid Flow", SIGGRAPH 2007 — T2.
- Anthropic, "Effective context engineering for AI agents", 2025 — T3; Claude Code memory docs — T2 (incl. "context, not enforced configuration"; conflicting user/project rules are unresolved).
- AGENTS.md spec; Cursor rules docs; Kiro steering/specs docs; GitHub Spec Kit (`constitution.md`) — T2/T3.
- Böckeler, "Context Engineering for Coding Agents", martinfowler.com, 2026 — T3.
- Brand, *How Buildings Learn* (1994); "Pace Layering", *Journal of Design and Science*, 2018 — T2.
- US Army ADP 6-0, *Mission Command* (commander's intent) — T2.
- Norman, *The Design of Everyday Things* (rev. ed. 2013); its cover shows Jacques Carelman's "coffeepot for masochists", spout and handle on the same side — T2. The swapped bike echoes the idea; nothing from the image is reproduced.
- Steam velocipedes of the 1860s (Roper; Michaux–Perreaux), for the parked fix spiral — T3, verify before use.
- NIOSH Hierarchy of Controls; Shingo on poka-yoke — T2.
- Kelsen's hierarchy of norms (SEP); *lex specialis* — T2.
- Procida, Diátaxis — T3. Nygard, "Documenting Architecture Decisions", 2011 — T3.

## 12. Open questions (parked)

1. ~~Which mechanism~~ — decided: the bicycle (§5.8). Still open: whether Act II's workshop of arcs uses copies of the bike or mixes in the bench machines.
2. Repository name, host, and final title.
3. Mobile portrait layout (card vs. scrim) — settle by testing.
4. Whether to include the exercise-bike ("works, goes nowhere") and Rube Goldberg ("over-building") asides.
7. **The fix spiral (parked idea).** After the swap reveal, you ask the agent to fix the seat and handlebars; it does, then keeps "improving" — captioned as commits (`fix: swap seat and handlebars`, `refactor: lower the seat to suit the new geometry`, `feat: add gears so pedalling stays easy`, `feat: add an assist motor for hills`, `feat: replace the battery with steam for durability`) — until a steam engine is bolted on. It shows a missing **end state** (when to stop) and a trampled **constraint** ("light enough to carry up a flight of stairs"); a later drift beat could call back to it, caught at the checkpoint by that line. Parked because it would compete with the swap reveal; it needs staged build sequences and reserve motes, not just one twin. Steam velocipedes were really built in the 1860s.
8. **More life in the motion (parked).** Today motes fly in along curved paths as you scroll and freeze when scrolling stops (§6.1). If it ever feels too still: let the scene ease toward the scroll position over about a second, so motion carries on briefly and settles on the same pure frame; keep the machine turning gently while the reader pauses, as a time-based layer like the shimmer (off in tests and under reduced motion); and have motes fade and grow in from nothing at the start of their flight. Triggered, video-like playback was considered and rejected: it breaks scrubbing and the rewind.
9. **The frame grown like frost (parked, to try later).** An alternative frame entrance to the one built (laid tube by tube in a frame builder's order): the frame's motes land in order of plain distance from the bottom bracket, so it grows outward from one point like frost: the shell, then the down tube, seat tube and chainstays together, then the lugs, the stays and the head, with the twin's mast and climbing top tube arriving last (the wrong parts last, a nice accident). Reads as growth more than building, with no single seam. Cheap: the same per-part settle-field hook as the built option, with a one-line field (distance from the bottom bracket). Full write-up: docs/specs/2026-10-05-act-1-build-and-orbit.md §3.2.
5. Final copy for every panel.
6. Exact effort-counter units and the shape of the hourglass in the mote-mix strip.

## 13. Out of scope

Audio; a live-talk/presenter mode; interactivity beyond scrolling (e.g. a "where does this rule go?" sorter); a CMS; analytics; localization.
