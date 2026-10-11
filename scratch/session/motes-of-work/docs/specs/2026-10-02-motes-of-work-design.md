# Motes of Work — design spec

*Working title. Status: draft for review. Date: 2026-10-02.*

A self-paced, scroll-driven essay about where human attention belongs when working with coding agents. A 3D point cloud is the centerpiece: particles ("motes") of human, agent, and human↔agent work build a machine, and scrolling moves the camera and morphs the cloud through the phases of the argument.

---

## 1. Purpose and audience

- **Reader:** engineers on the author's team (and, later, possibly the wider public).
- **Outcome:** readers change how they spend attention day to day — slow down and go hands-on for specs, checkpoints and durable guidance; step back and stop micromanaging during execution.
- **Format:** self-paced scrollytelling page read alone, not a live talk. The text must carry the argument without a presenter; the cloud makes it stick.
- **Hosting:** its own standalone repository and static host, public-capable. All content must be publication-safe (see §7).

## 2. Thesis

1. **High-touch moments exist.** Some phases of agentic work need the human close, slow and focused; others need the human to step back.
2. **The spec is the most important high-touch moment**, because models still lack high-level taste — they don't know what matters to humans. A spec carries *intent* (purpose, end state, constraints — "commander's intent"), which is exactly the part an agent cannot infer.
3. **Vibing the spec doesn't skip the spec; it defers it** — until after you've paid for a confident, polished build of the wrong thing.
4. **Without a spec you can't even see drift**, because there's nothing to measure against.
5. **Attention should scale with leverage** (≈ blast radius × lifetime). One line of durable guidance shapes every arc for months; a prompt shapes one session. "High touch" is a tier, not only a moment.
6. **Durable tiers must stay sparse**, and guidance should move between tiers: repeated corrections get promoted to rules, repeatedly broken rules to mechanisms. *Fast layers learn, slow layers remember.*

## 3. Decisions log

| Decision | Choice |
|---|---|
| Delivery | Self-paced scrollytelling page |
| Audience | Engineers on the team; practical behavior change |
| Visual subject | Recognizable 3D **mechanical systems** whose motion reveals whether they work |
| Which mechanism | **Parked.** Architecture must allow swapping it independently (§6.3). Candidates: watch movement, Strandbeest, Jacquard loom; exercise-bike and Rube Goldberg as possible asides |
| Counterexample | "Build the wrong thing" from an under-specified prompt, plus a subtler "detail in the wrong place" failure |
| Structure | Two acts — within an arc, across tiers — bridged by leverage |
| Opening | Cold open on the vibe build, then a scroll-driven **rewind** |
| Hosting | Standalone repo, static host, public-capable |
| Stack | Vanilla three.js + Vite + small scroll driver now; **move to Theatre.js for choreography soon** — architecture isolates that swap (§6.2) |
| Language | TypeScript *(assumed — override if preferred)* |

## 4. Narrative

Each section is one idea with a text panel of ≤ ~80 words. Copy below is the *gist*, not final text — final copy is the author's (voice and taste are high-touch).

### Prologue — Meet the motes

| # | Idea | Scene | Camera |
|---|---|---|---|
| P1 | Three kinds of work | One human mote, then an agent swarm, then a back-and-forth pair, each introduced alone with a caption | Close, static |
| P2 | The camera is your attention | Camera eases in, then pulls wide; caption names the rule | Demonstrates close vs. wide |

### Act I — Within an arc

| # | Idea | Scene | Camera |
|---|---|---|---|
| I.1 | The vibe build (cold open) | One human mote (the vague prompt) → swarm floods in → an impressive machine assembles and runs. Reveal: it's the **wrong twin**. All settled motes are cool (no human touched the core). No ghost. Effort counter running | Wide, sweeping, impressive |
| I.2 | Rewind | Scrolling runs the cloud backward to a nebula. Effort counter does **not** reset. The ghost of intent has never existed yet | Pulls back |
| I.3 | Spec (high touch) | Exploded view. Human + dialogue motes place core parts and define interfaces. The **ghost** of the intended machine appears for the first time. Text: commander's intent — purpose, end state, constraints, not the how | Close, slow, shallow focus |
| I.4 | Build (low touch) | Swarm fills the body; assembly 0→1. Time-lapse feel | Wide |
| I.5 | Drift | Fault dials creep up with run length (adherence decays over long sessions). Quiet failure appears: detail piling up on the case while the core goes sparse/fuzzy | Medium; ghost makes the gap visible |
| I.6 | Checkpoint (high touch) | Dive into the core. Human motes catch drift; loose motes are pulled back; faults reset | Very close |
| I.7 | It runs | Correct machine running against its ghost; mote-mix strip shows the hourglass shape | Hero orbit |
| I.8 | Bridge | "You'll make that same correction in the next arc. And the one after." | Begins pulling out |

### Act II — Across arcs

| # | Idea | Scene | Camera |
|---|---|---|---|
| II.1 | Zoom out | The machine is one of many (instanced copies) in a workshop of arcs; the same drift recurs across copies | Very wide |
| II.2 | The layers | Tier fields appear nested — guards, constitution, domain, playbook, arc, task, turn — each evolving at its own rate (pace layering) | Slow orbit |
| II.3 | Leverage | One constitution line acts on every machine at once. "High touch scales with leverage" | Wide |
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
}
```

Rules:

- Every field is **flat, numeric and blendable** so it maps one-to-one onto a Theatre.js property. Discrete choices (e.g. which variant) are expressed as 0–1 blends.
- Downstream code reads only `SceneState`. Nothing downstream knows which Sampler produced it.
- **v1 `KeyframeSampler`:** a JSON file of per-field keyframe tracks (`{ at: progress, value, ease }`).
- **v2 `TheatreSampler`:** wraps a Theatre.js project; `sequence.position` is derived from progress. Migration is a one-time conversion script from v1 JSON to an initial Theatre project state, plus a config switch. The studio UI is dev-only; production ships `@theatre/core` only.

### 6.3 Mechanism module contract

```ts
type Role = 'core' | 'body' | 'drift';

interface PartTransform { position: Vec3; quaternion: [number, number, number, number] }

interface MechanismPart {
  id: string;
  role: Role;
  explodedOffset: PartTransform;  // applied as assembly → 0
}

interface BoundPoint {
  part: number;          // index into parts
  local: Vec3;           // position in part space, correct variant
  localTwin: Vec3;       // position in part space, wrong-twin variant
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

### 6.4 Mote system

- One GPU `Points` system. Per-point attributes: bound part, local / twin positions, mote type per provenance scenario, settle order (when it lands during assembly), seed.
- The vertex shader computes in-flight vs. settled position from `assembly` and settle order, applies part transforms (uploaded as a small uniform array or data texture), variant blend, fault perturbations and drift.
- The CPU per frame computes only `SceneState` and a few dozen part transforms.
- Act II instances copies of the mechanism with a reduced per-copy point budget.

### 6.5 Folder layout

```
src/
  story/        NN-name.md sections (frontmatter: scroll length, timeline keys)
  scroll/       scroll driver: DOM scroll → progress
  timeline/     Sampler interface, KeyframeSampler, (later) TheatreSampler, keyframes.json
  scene/        renderer, camera rig, mote system, shaders
  mechanisms/   <name>/ modules + contract test
  overlays/     mote-mix strip, effort counter
  fallback/     generated stills for no-WebGL / reduced motion
```

## 7. Content rules

- One idea per section; panel ≤ ~80 words.
- Words live in `story/*.md`, separate from code.
- **Publication-safe:** no internal issue numbers, file paths, tool or company names. Incidents are retold generically (e.g. "a style rule scoped to the frontend never fired when an agent drafted a chat message").
- **Sources** in a footer, labeled by tier; preprints marked as preprints. Re-verify every citation before publishing.
- Sentence case for all UI text.
- **Content lint** (a deterministic check, not a prose rule): panel word count, and a denylist of internal-identifier patterns.

## 8. Performance, fallbacks, accessibility

**Budgets**

- 60 fps on an integrated-GPU laptop; ≥ 30 fps on a ~3-year-old phone.
- Points: ~100k desktop, ~30k mobile, chosen by a quick GPU capability probe. Device pixel ratio capped on mobile.
- All per-point animation on the GPU.
- Rendering pauses when the canvas is off-screen or the tab is hidden.

**Fallbacks and accessibility**

- `prefers-reduced-motion`: no camera flights; crossfade between section stills; idle shimmer off.
- No WebGL: per-section stills **generated by the screenshot test suite** from the same build, so they cannot drift from the real thing.
- Text fully readable without the canvas; keyboard scrolling works; canvas is `aria-hidden` with a short per-section text description.
- Mobile portrait: canvas on top with a text card below, or text over a scrim — decided by testing.

## 9. Testing

- **Rewind invariant:** `sample(p)` is identical regardless of the path taken to `p` (forward, backward, jump).
- **Mechanism contract test**, run against every module in `mechanisms/`:
  - `pose(d, ZERO_FAULTS, 0)` equals the ghost pose.
  - Each fault > 0 produces measurable divergence from the ghost.
  - `samplePoints` is deterministic for a fixed seed and returns the requested budget.
  - Correct and twin positions exist for every point.
- **Visual regression:** Playwright screenshots at each section anchor (deterministic because state = f(progress) and idle shimmer is off in test mode). The same captures feed the no-WebGL fallback.
- **Performance smoke test:** frame-time measurement over a scripted scroll in headless Chromium. Software-rendered, so it's indicative only; a short manual checklist covers real devices.
- **Content lint** in CI (§7).

## 10. Sources to draw on

Tiers: T1 data, T2 official docs / peer-reviewed, T3 blogs / talks. Re-verify before publication.

- Gloaguen et al., "Evaluating AGENTS.md: Are Repository-Level Context Files Helpful for Coding Agents?", arXiv 2602.11988, 2026 — T1, preprint. Context files rarely improve success, add >20% inference cost; value lies in documenting non-standard practice.
- McMillan, "Instruction Adherence in Coding Agent Configuration Files", arXiv 2605.10039, 2026 — T1, preprint, single author. File structure showed no detectable effect; adherence decays within a session.
- Jaroslawicz et al., "How Many Instructions Can LLMs Follow at Once?" (IFScale), arXiv 2507.11538, 2025 — T1, preprint.
- Liu et al., "Lost in the Middle", TACL 2024 — T2.
- Hong, Troynikov, Huber, "Context Rot", Chroma, 2025 — vendor technical report.
- Anthropic, "Effective context engineering for AI agents", 2025 — T3; Claude Code memory docs — T2 (incl. "context, not enforced configuration"; conflicting user/project rules are unresolved).
- AGENTS.md spec; Cursor rules docs; Kiro steering/specs docs; GitHub Spec Kit (`constitution.md`) — T2/T3.
- Böckeler, "Context Engineering for Coding Agents", martinfowler.com, 2026 — T3.
- Brand, *How Buildings Learn* (1994); "Pace Layering", *Journal of Design and Science*, 2018 — T2.
- US Army ADP 6-0, *Mission Command* (commander's intent) — T2.
- NIOSH Hierarchy of Controls; Shingo on poka-yoke — T2.
- Kelsen's hierarchy of norms (SEP); *lex specialis* — T2.
- Procida, Diátaxis — T3. Nygard, "Documenting Architecture Decisions", 2011 — T3.

## 11. Open questions (parked)

1. **Which mechanism** (and whether it's one hero mechanism or one per act). The architecture doesn't depend on the answer.
2. Repository name, host, and final title.
3. Mobile portrait layout (card vs. scrim) — settle by testing.
4. Whether to include the exercise-bike ("works, goes nowhere") and Rube Goldberg ("over-building") asides.
5. Final copy for every panel.
6. Exact effort-counter units and the shape of the hourglass in the mote-mix strip.

## 12. Out of scope

Audio; a live-talk/presenter mode; interactivity beyond scrolling (e.g. a "where does this rule go?" sorter); a CMS; analytics; localization.
