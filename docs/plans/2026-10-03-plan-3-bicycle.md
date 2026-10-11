# Plan 3: the bicycle — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put a bicycle on stage whose wrong twin is a fully working bike with its saddle and handlebars swapped, built in the cold open from a bulleted brief that ticks off line by line.

**Architecture:** A new `bike` mechanism module built from the shape library on the existing contract. A small extension lets a part name the assembly window in which its motes settle, so the brief's ticks can follow real settling. The brief is authored markup in the story; a pure function of scroll progress ticks it. The reveal becomes its own story section. The four existing machines stay registered as a development bench.

**Tech Stack:** TypeScript, three.js (WebGL2), Vite, vitest, Playwright (Chromium via SwiftShader).

**Spec:** `docs/specs/2026-10-02-motes-of-work-design.md` — §2 (thesis 3), §3 (decisions), §4 Act I rows I.1, I.1b, I.3 and "The brief", §5.8 (the bicycle), §6.1 (purity), §6.3 (contract, development bench), §7 (content rules), §9 (bicycle and brief tests), §12 items 7–8 (parked: do not build). How to build a mechanism, and the lessons from the last four: `docs/adding-a-mechanism.md`.

## Global Constraints

- **Purity (spec §6.1):** every frame, and every brief tick, is a pure function of scroll progress. Only the idle shimmer is time-based, and it is off under `?test=1` and `prefers-reduced-motion`. No `Math.random`, no clock, no module-level mutable state in `pose`.
- **Parity:** `mote.glsl` and `mote.ts` are not changed by this plan. Per-part settle windows are a TypeScript-only attribute input; `e2e/parity.spec.ts` must stay green over every registered mechanism.
- **Mechanism contract:** `src/mechanisms/types.ts`, with the rules in `docs/adding-a-mechanism.md` (pure `pose`, exact budgets, unit normals, faults except `drift` handled in `pose`, modest core `explodedOffset`s, machine faces +z, bounding radius about 2.5 units).
- **Copy:** sentence case for all UI text; story panels at most 80 words (`src/story/content.test.ts`); story copy is draft (`draft: true`) — the final wording is the author's.
- **Publication-safe:** no employer or company names, internal paths, issue numbers or people's names in code, copy, comments or commit messages.
- **Licensing:** port only MIT/BSD/Apache/public-domain code, with notices in `CREDITS.md`; NC/SA/LGPL/unlicensed sources are study-only. Bicycle geometry here is from first principles and standard published dimensions; no code is ported.
- **No new runtime dependencies.**
- **Tooling:** never run `playwright install` (`PLAYWRIGHT_BROWSERS_PATH` is preset). Run e2e on your own port with `E2E_PORT=<port from dispatch>`. Leave no background processes. Never `git add .`.
- **Commits:** small and logical, ending with the trailer line given in your dispatch. Do not push.

## Review Focus

1. **A bench machine on the essay page** (`?test=1&mech=steam`): the brief's part names do not exist on that machine. Expected: no error, and every line ticks only once the machine is fully assembled. Pinned in Task 3.
2. **Scrolling backward through the cold open** unticks lines in reverse, and a jump to any progress shows the same ticks as scrolling there. Pinned in Task 3 (e2e).
3. **No WebGL** (context lost or unavailable): the brief still ticks, because ticks are driven by scroll, not by the draw loop. Pinned in Task 3 (e2e, context-loss pattern from `e2e/app.spec.ts`).
4. **Bike-tuned story cameras on the bench machines:** the spec-section framing test iterates every registered mechanism, so new camera keys must still frame each bench machine's core. Pinned by `src/timeline/keyframes.test.ts` in Task 4.
5. **The twin morph mid-rewind:** the saddle and handlebars cross paths while the fork steers. Expected: continuous motion, no flips. Pinned by `src/mechanisms/continuity.test.ts` (runs automatically once the bike is registered, Task 2).

---

### Task 1: Per-part settle windows

**Files:**
- Modify: `src/mechanisms/types.ts` (add an optional field to `MechanismPart`)
- Modify: `src/scene/mote/attributes.ts` (use the window)
- Test: `src/scene/mote/attributes.test.ts` (or the existing attribute test file), `src/mechanisms/contract.test.ts`
- Modify: `docs/adding-a-mechanism.md` (one bullet under "Building one", step 4)

**Interfaces:**
- Produces: `MechanismPart.settle?: readonly [number, number]` — the assembly window `[from, to]` in which this part's motes settle: each mote's settle value is `from + (to - from) * h1` (the same `h1` hash as today). Omitted means the role default.
- Produces: `export function settleWindow(part: MechanismPart): readonly [number, number]` in `src/scene/mote/attributes.ts`, returning the part's window or its role default. A mote of the part is fully settled once `assembly >= settleWindow(part)[1]`.
- Role defaults (today's distributions, unchanged): core `[SETTLE_WINDOW, 0.45]`, body `[0.35, 0.95]`, drift `[0.5, 0.95]`.

- [ ] **Step 1: Write the failing tests**
  - `settleWindow` returns the role default for a part without `settle`, and the part's own window when given.
  - With no part declaring `settle`, every mote's settle value for every registered mechanism is identical to before the change (compare against values computed with the old formulas for a fixed budget and seed).
  - A part with `settle: [0.6, 0.7]` puts all its motes' settle values in `[0.6, 0.7]`.
  - Contract test, over every registered mechanism: any declared `settle` window has `from < to` and lies inside its role's default window.
- [ ] **Step 2: Run them; the new ones fail** — `npx vitest run src/scene/mote src/mechanisms/contract.test.ts`
- [ ] **Step 3: Implement** — add the field with a doc comment; route the three role formulas in `attributes.ts` through `settleWindow`. Export the role defaults as one constant table so the contract test and `settleWindow` share it.
- [ ] **Step 4: Run** `npx tsc --noEmit -p .` and `npx vitest run` — all pass.
- [ ] **Step 5: Guide** — in `docs/adding-a-mechanism.md`, "Building one" step 4, add one sentence: a part may set `settle` to control when its motes land (it must stay inside its role's default window).
- [ ] **Step 6: Commit**

---

### Task 2: The bicycle mechanism

**Files:**
- Create: `src/mechanisms/bike/shapes.ts`, `src/mechanisms/bike/kinematics.ts`, `src/mechanisms/bike/index.ts`, and tests beside each (`*.test.ts`)
- Modify: `src/mechanisms/index.ts` (register `bike`, alphabetical), `src/mechanisms/meta.ts` (add its entry)
- Modify: `CREDITS.md` only if you cite a source under "Facts and data" (standard bicycle dimensions)

**Interfaces:**
- Consumes: `settleWindow` and `MechanismPart.settle` (Task 1); the shape library `src/shapes/*`; steam's `PartSpec` point-share pattern (`src/mechanisms/steam/index.ts`) to copy.
- Produces: `export const bike: Mechanism` with `id: 'bike'`; `export const label = 'Bicycle'`; `export const blurb` (one sentence, mentions "wrong twin"); `export function partIndex(id: string): number`; `export const SCALE` (world units per metre); `export const GEARING = { chainring: 44, sprocket: 16 }`; `export const CHAIN_SEGMENTS = 24`.
- Produces these **exact part ids** (Task 3's brief markup names them):

| Role | Part ids | `settle` window |
|---|---|---|
| core | `saddle` (saddle and seat post), `handlebars` (bars, stem, grips, brake levers, bell), `pedal-left`, `pedal-right` | role default |
| body | `front-wheel`, `rear-wheel` (with its sprocket), `cranks` (chainring and both crank arms), `chain-00` … `chain-23` | `[0.57, 0.72]` |
| body | `fork` | `[0.65, 0.8]` |
| body | `brake-front` (on the fork), `brake-rear` | `[0.72, 0.87]` |
| body | `frame`, `mudguard-front` (on the fork), `mudguard-rear`, `ground` | `[0.8, 0.95]` |
| drift | `loose-bolts` (a few small fittings near the rear wheel) | role default |

Body windows start late enough that nothing but the core is in flight at assembly 0.45, where the spec section stops.

**Geometry** (metres, then `× SCALE`; choose `SCALE` so the bounding radius is about 2.5 units, about 2.4). A town bike, side profile in the x–y plane, **front wheel toward +x, drive side (chain) facing +z**, ground at the bottom:
- Wheels: tyre outer radius 0.34, tyre section 0.03, rim radius 0.31, hub radius 0.025, 12 spokes per wheel (readable as a point cloud; more turn to mush). Wheelbase 1.05.
- Bottom bracket 0.27 above ground; chainstay 0.43; seat tube at 73° from horizontal; head tube at 71°, its top about 0.85 above ground; fork rake 0.045.
- Saddle top at 0.73 from the bottom bracket along the seat-tube line. Swept-back town handlebars with grips about 1.05 above ground, forward of the saddle.
- Cranks 0.17; pedals 0.10 × 0.07 platforms; chainring and sprocket from `involuteGear` with 44 and 16 teeth at a 12.7 mm chain pitch.
- Chain: `CHAIN_SEGMENTS` short link segments along the closed path of chainring arc, upper run, sprocket arc and lower run.
- Mudguards: annular sectors over the top-rear of each wheel. Ground: a thin sparse strip under both wheels (like steam's floor: fixed small share, dim).
- Make a `tube(a, b, radius)` helper (in `bike/shapes.ts`) for the frame and stays.

**Kinematics** (`drive` counts crank turns):
- Crank angle `θ = TAU * drive`, after `bind` and `stall` as below. Wheels turn `(chainring / sprocket) × θ` (2.75×); the chain advances along its path by `θ × chainring pitch radius`.
- Pedals ride the crank ends and **stay level** (no rotation).
- Steering: `steer(drive) = 0.14 * sin(PI * drive / 2)` rad about the head-tube axis. It turns the fork, front wheel, front brake and front mudguard and, in the correct bike, the handlebars.
- **Wrong twin** (`variant` 1): `saddle` and `handlebars` swap mounts. The saddle sits on the steerer top and turns with the steering; the handlebars sit in the seat tube and do not steer. Both stay facing forward. **Every other part's pose is identical at variant 0 and 1.** Shapes do not change (`localTwin = local`, `normalTwin = normal`). Blend the mount position and the steering participation as parameters (lesson: blend parameters, not rotations).
- Faults (spec §5.8): `misalign` buckles the front wheel (its axis tilts by up to about 0.12 rad, varying with wheel angle); `slip` makes the back wheel lag the cranks in jerks; `bind` makes the wheel slow unevenly each turn; `ratio` changes the wheel-to-crank speed; `stall` drops the chain (it sags visibly below its path, the cranks turn on, the wheels coast and stop); `jitter` rattles the mudguards, brakes and bell (hash a tick of `drive`, never the clock); `drift` is generic. Every fault must read at the story's camera distance.

**Point shares:** steam's pattern — `CORE_SHARE` by area within the core and within the body; start at 0.2 and choose between 0.15 and 0.30 by looking. The core must read amber, not white. Ground at a small fixed share.

- [ ] **Step 1: Shapes, test-first.** `bike/shapes.test.ts`: closed geometry where solid (`openEdges` = 0 for extrusions), sensible bounds per part (wheel diameter, frame within the wheelbase), and chainring and sprocket tooth counts. Then implement `bike/shapes.ts`.
- [ ] **Step 2: Kinematics, test-first.** `bike/kinematics.test.ts`:
  - The chain's path length equals `CHAIN_SEGMENTS ×` segment pitch; the chain at the chainring moves at the chainring's surface speed and at the sprocket at the sprocket's (to 1e-6).
  - Wheel angle is 2.75 × crank angle with no faults.
  - Pedals keep the identity rotation through a full crank turn.
  - Steering turns the fork about the head-tube axis by `steer(drive)`.
- [ ] **Step 3: The module, test-first.** `bike/index.test.ts`:
  - **Reach.** With no faults at variant 0, the saddle top to the pedal spindle at the bottom of the stroke is 0.80–0.95 m, the saddle top to each grip is 0.45–0.75 m, and the grips are forward of the saddle (x greater).
  - **Swap.** At variant 1 the saddle sits where the handlebars mounted at variant 0 and vice versa, within 0.05 m; the saddle turns with the steering and the handlebars do not.
  - **Nothing else changes.** Every other part's transform is equal at variant 0 and 1 (several drives, faults zero).
  - **Faults diverge.** Each fault at 1 moves some part away from the ghost pose by a visible amount (at least 0.05 world units).
  - **The chain stays a chain under stall.** Adjacent segment centres stay within 1.5× the pitch of each other for stall in [0, 1].
  - **Shares.** The core point share is within 0.15–0.30, and every part has at least 50 points at a 30k budget.
- [ ] **Step 4: Register.** Add `bike` to `src/mechanisms/index.ts` and `src/mechanisms/meta.ts`.
- [ ] **Step 5: Shared checks.** `npx tsc --noEmit -p .`, `npx vitest run` (contract, anchors, continuity, keyframes framing and meta all now include the bike), then `E2E_PORT=<port> npx playwright test e2e/parity.spec.ts e2e/looks.spec.ts e2e/compare.spec.ts`, then `SHOTS=1 E2E_PORT=<port> npx playwright test e2e/shots.spec.ts`.
- [ ] **Step 6: Look.** Open `shots/mech-bike-*.png` and describe honestly in your report:
  - does it read as a bicycle at a glance?
  - is the twin obviously unrideable in a still?
  - do the core contact points read warm and not white?
  - does each fault read?
- [ ] **Step 7: Commit** (shapes, kinematics, module, registration as separate commits where natural).

---

### Task 3: The brief card and the reveal section

**Files:**
- Modify: `src/story/01-vibe-build.md` (the brief replaces the current copy)
- Create: `src/story/02-reveal.md`
- Rename: `src/story/02-rewind.md` → `src/story/03-rewind.md`, `src/story/03-spec.md` → `src/story/04-spec.md` (`git mv`; ids unchanged)
- Modify: `src/story/04-spec.md` (one sentence tying intent back to the brief; stay at most 80 words)
- Create: `src/story/brief.ts`, `src/story/brief.test.ts`
- Modify: `src/main.ts` (wire the brief to the scroll driver), `src/style.css` (brief card)
- Modify: `src/timeline/keyframes.json` (hold the cold open's state through `reveal`), `src/timeline/keyframes.test.ts`
- Modify/Test: `src/story/content.test.ts`, `e2e/app.spec.ts` (or a new `e2e/brief.spec.ts`)

**Interfaces:**
- Consumes: `settleWindow` (Task 1); the bike's part ids (Task 2); `sceneStateAt(progress).mech.assembly` (`src/main.ts`).
- Produces in `src/story/brief.ts` (unit tests run in Node with no DOM, so keep the logic DOM-free and the DOM glue thin):
  - `parsePartList(attr: string): string[]` — splits a `data-parts` value (space-separated part ids; a trailing `*` matches a prefix, as in `chain-*`).
  - `matchesPart(pattern: string, id: string): boolean`
  - `interface BriefLine { el: HTMLElement; parts: string[] }`
  - `parseBrief(root: ParentNode): BriefLine[]` — DOM glue: reads `ul.brief > li[data-parts]` through `parsePartList`. Covered by e2e.
  - `briefThresholds(lines: readonly { parts: string[] }[], mechanism: Mechanism): number[]` — per line, the largest `settleWindow(part)[1]` over the matched parts; **1 when a line matches no part** (Review Focus 1).
  - `applyBrief(lines: BriefLine[], thresholds: number[], assembly: number): void` — sets the `data-met` attribute on a line exactly when `assembly >= threshold`, and removes it otherwise.

**Copy** (draft; sentence case; keep the existing frontmatter keys):

`01-vibe-build.md` body — an intro line, then the brief as raw HTML, then one line:

```html
<p>You hand an agent a brief. It looks complete.</p>
<div class="brief">
<p class="brief-ask">Build me a bike for getting around town.</p>
<ul class="brief">
<li data-parts="front-wheel rear-wheel cranks chain-* pedal-left pedal-right">Two wheels, with the pedals driving the back one through a chain.</li>
<li data-parts="saddle handlebars">A comfy seat and a set of handlebars, both adjustable so it fits people of different heights.</li>
<li data-parts="fork front-wheel">The front wheel turns so you can steer.</li>
<li data-parts="brake-front brake-rear handlebars">Hand brakes and a bell.</li>
<li data-parts="frame">Sturdy, but light enough to carry up a flight of stairs.</li>
</ul>
</div>
<p>The swarm floods in. Line by line, every requirement is met.</p>
```

(Put the `ul.brief` class on the list itself; the wrapper is for layout. If `marked` mangles the raw block, keep it as one contiguous HTML block with no blank lines inside.) Update the `alt` to describe a bike assembling from a swarm of cool motes.

`02-reveal.md` (`id: reveal`, `length: 2`, `draft: true`, alt describing the running bike with its seat on the steering column and handlebars in the seat tube):

> It runs. It passes every test you wrote: pedal, and it moves; turn the front wheel, and it steers.
>
> Now try to ride it. The seat is on the steering column. The handlebars stick out of the seat tube. Nothing in it is warm: no person touched the parts that meet a person.
>
> Every line is met. Nobody wrote down that you sit on the seat and steer with the handlebars, because nobody would think to.

`04-spec.md`: add one sentence such as "The brief listed parts. It never said how a body uses them." — trim elsewhere if needed to stay at most 80 words.

**Keyframes:** add `reveal@…` keys so that through `reveal`: `mech.assembly` 1, `mech.variant` 1, `provenance.vibed` 1, `mech.ghost` 0, `mech.drive` keeps rising (2 at `vibe-build@1` to 3.5 at `reveal@1`), and the camera holds its `vibe-build@1` framing (Task 4 tunes it). Shift `rewind`'s drive keys so the rewind starts from the reveal's last drive. Update `keyframes.test.ts`: the first sections are `['vibe-build', 'reveal', 'rewind', 'spec']`, and "keeps the vibe build fully vibed, the wrong twin, with no ghost" also holds across `reveal`.

**Card style:** a quiet bordered card inside the panel; each line has a check box glyph that fills when `data-met` is set. **No CSS transition on the tick** (a transition would make a jump and a scroll differ in screenshots). Sentence case.

- [ ] **Step 1: Unit tests first** (`brief.test.ts`, Node; no DOM library — do not add one):
  - `parsePartList` and `matchesPart` handle ids, extra whitespace and the `*` prefix.
  - For the bike, the thresholds in list order are `[0.72, 0.45, 0.8, 0.87, 0.95]` — computed through `settleWindow`, so the test also pins Task 2's windows.
  - For `steam`, every threshold is 1.
  - `applyBrief` sets and clears `data-met` at the boundary (pass minimal objects with `toggleAttribute`, or cover it in e2e).
- [ ] **Step 2: Content tests.** Extend `content.test.ts`:
  - **Sync fence:** every `data-parts` token in the story (extracted from the section markdown with a regex) matches at least one `bike` part id (set membership over all tokens, not an example).
  - Every section stays at most 80 words.
- [ ] **Step 3: Implement** `brief.ts`, the story files, the CSS, and the `main.ts` wiring: compute thresholds once for the active mechanism after `renderStory`; call `applyBrief` with `sceneStateAt(p).mech.assembly` from the scroll driver's callback and once at start, **independent of the renderer**.
- [ ] **Step 4: Keyframes** as above; run `npx vitest run`.
- [ ] **Step 5: e2e** (`E2E_PORT=<port>`):
  - At `vibe-build@0` no line is met; at the end of `vibe-build` all are.
  - The seat-and-handlebars line is met before the wheels line at an intermediate progress.
  - Jumping with `?p=` and scrolling to the same progress give the same met set (three progress values).
  - Scrolling back unticks.
  - After a WebGL context loss the brief still ticks on scroll.
  - With `?test=1&mech=steam` there are no page errors and lines tick only at full assembly.
  - Existing `e2e/app.spec.ts` section tests pass with four sections.
- [ ] **Step 6: Commit.**

---

### Task 4: The bike on stage

**Files:**
- Modify: `src/config.ts` (`ACTIVE_MECHANISM = 'bike'`)
- Modify: `src/timeline/keyframes.json` (camera tracks for all four sections)
- Modify: `src/compare/controls.ts` (the "Cold open" and "Spec (core)" camera presets match the new keys)
- Modify: `README.md` (status line), and any e2e or unit test that assumes the gears are active
- Test: `src/timeline/keyframes.test.ts`, `e2e/shots.spec.ts` output

**Interfaces:**
- Consumes: the bike (Task 2); the four sections (Task 3).
- Produces: camera keys in machine-relative coordinates (world = anchor centre + value × anchor radius; `camera.coreFocus` 0 frames the whole bike, 1 the contact points).

**Camera intent** (spec §5.8, §4):
- **`vibe-build`:** low (camera y slightly above the bottom bracket's height), three-quarter from the drive side (+z, +x), the whole bike and the ground strip in frame, a slow sweep while it assembles.
- **`reveal`:** swing to within about 25° of side-on from the drive side, slightly elevated, so the saddle on the steering column and the handlebars in the seat tube are unmistakable and not occluded by the frame.
- **`rewind`:** pull back as now.
- **`spec`:** `coreFocus` 1 framing all three contact points together, right of the text panel (the existing framing test enforces it).

Tune by rendering shots and looking. Every registered mechanism must still pass `keyframes.test.ts`'s framing test (Review Focus 4). If a bench machine fails only because of the bike's framing, report it rather than loosening the test.

- [ ] **Step 1:** Set `ACTIVE_MECHANISM`; run `npx vitest run` and the full e2e (`E2E_PORT=<port> npx playwright test`); fix tests that assumed gears (they should read the active mechanism, not name one).
- [ ] **Step 2:** Tune camera keys; regenerate shots with `SHOTS=1 E2E_PORT=<port> npx playwright test e2e/shots.spec.ts e2e/compare.spec.ts`; look at `shots/vibe-build-*`, `reveal-*`, `rewind-*`, `spec-*` and describe them honestly in the report.
- [ ] **Step 3:** Update the compare presets and the README status.
- [ ] **Step 4:** Full verification: `npx tsc --noEmit -p .`, `npx vitest run`, full e2e.
- [ ] **Step 5: Commit.**

---

### Task 5: Visual review of the bike

A review, not code. The controller dispatches a reviewer on the Fable model with a brief written for this task (pattern: Plan 2's `visual-review-brief.md`). The reviewer judges the bike and the four story sections from the shots and the live build, and answers:
- Does the bike read at a glance?
- Is the twin unrideable in a still?
- Does the warm core read?
- Do the brief ticks and the reveal land?
- Which faults read?

Deliverable: a scored review and at most 12 ranked, concrete changes (file, parameter, suggested value), written to the plan workspace as `visual-review-bike.md`.

### Task 6: Polish from the review

The controller rules on each review item (ledgered), then dispatches one implementer with the accepted items. The same verification as Task 4, plus the shots and an honest description of before and after.

### Task 7: Publish

The controller rebuilds with `BASE_PATH=./` and republishes the existing comparison artifact. Its landing page now leads with the essay (spec §6.3, development bench) and keeps the comparison page as a secondary link. Smoke-test the published files locally as before.
