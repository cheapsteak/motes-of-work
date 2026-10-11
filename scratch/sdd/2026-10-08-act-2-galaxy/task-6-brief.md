### Task 6: The renderer, II: growth, light, lamp and the defect on moving bodies (behind `?galaxy=1`)

**Files:**
- Create:
  - `src/scene/node/light.ts`, `light.glsl` (moved from `node.ts`/`node.glsl`: `nodeLight`, `nodeSettle`, `nodeArrival`, `nodeSpread` and `NODE_PALETTE`'s splice; `node.*` imports them, with no behaviour change)
  - `src/scene/node/bodyMote.ts`, `bodyMote.glsl`, `bodyMote.test.ts`
  - `src/timeline/netTrack.ts`, `netTrack.test.ts`
- Modify:
  - `bodySystem.ts` (adds `net-streams`, `net-feed` and `net-ring`; the builder and person motes; the ghost instances; uniforms `uGrowth`, `uFix`, `uHighlight`, `uShow`, `uClock`, `uFocus`, `uLamp`, `uLampRow`)
  - `shaders/shell.vert.glsl`, `body.vert.glsl`, `track.vert.glsl`, and a new `shaders/stream.vert.glsl` for the galaxy
  - `src/network/review.ts`: `ringAt(review, visits, ambient, data)` tracks `bodyWorld`, lies flat in the galaxy plane, radius 1.5 × the visit's outer
  - `src/timeline/sceneState.ts`: `net.focus` (0..1), `net.lamp` (0..5, step), `net.lampAt` (a `TRACK_TARGETS` index, step); `SCENE_STATE_PATHS`; defaults 0
  - `src/autoAdvance/plan.ts`: `sceneMotion` adds `net.focus` and `net.streams`
  - `src/timeline/sceneState.ts` also gets `net.streams` (0..1, default 0)
  - `src/scene/node/stream.ts` and `stream.test.ts`: the dot flow moves from `uClock` to `uAmbient`; `streamGain` is added
  - `src/timeline/galaxyShots.ts`: `STREAM_BEATS`
  - `src/scene/node/birth.ts`: `STREAM_CAP`, `STREAM_FADE`, `STREAM_PITCH`, `STREAM_BOW`
  - the parity files (`?lib=body`, and the stream dot's gain inside it)
  - `e2e/galaxy.spec.ts`

**Interfaces:**
- Consumes: Tasks 1–5.
- Produces:
  ```ts
  // netTrack.ts
  export type TrackTarget = { body: string } | { centroid: readonly string[] } | { core: true } | { hood: true } | { galaxy: true };
  export const TRACK_TARGETS: readonly (TrackTarget | null)[];            // index 0 = null (untracked, Act I)
  export function trackIndex(t: TrackTarget): number;
  export function lampFocusRow(index: number, g: Galaxy): number;         // the body whose membership the lamp tests (−1 for core/hood/galaxy)
  export enum Lamp { Off = 0, Planet = 1, Star = 2, Hood = 3, Core = 4, Lineage = 5 }
  // bodyAttrs.ts (from Task 5, extended here)
  export interface BodyMoteAttrs { row: number; role: NodeRole; ll: { lat: number; lon: number }; birth: number; seed: number; host: number }
  // bodyMote.ts (bodyMote.glsl mirrors it)
  export interface BodyClocks { growth: number; fix: number; highlight: number; show: number; ambient: number; focus: number; lamp: Lamp; lampRow: number; sysPx: Float32Array }
  export interface BodyMoteOut { pos: Vec3; normal: Vec3; brightness: number; visible: boolean; settled: number; hi: number; warm: number }
  export function bodyMote(a: BodyMoteAttrs, c: BodyClocks, data: BodyData): BodyMoteOut;
  export function lampGain(row: number, c: Pick<BodyClocks, 'lamp' | 'lampRow' | 'focus'>, data: BodyData): number; // 0 outside, 0.3 floor inside for non-subject at focus 1
  // stream.ts (stream.vert.glsl mirrors it; galaxy §15)
  export const STREAM_CAP = 0.3, STREAM_FADE = [1, 0.15] as const, STREAM_PITCH = 1.2, STREAM_DOTS = [6, 40] as const, STREAM_BOW = 0.10;
  export function streamDotU(k: number, ambient: number): number;            // fract(k + NODE_STREAM_SPEED · ambient)
  export function streamGain(u: number, streams: number, lamp: number): number; // streams · lamp · STREAM_CAP · mix(1, 0.15, u); 0 when streams = 0
  // galaxyShots.ts
  export const STREAM_BEATS = ['ly-1', 'ly-5', 'up-1', 're-3', 'tr-1', 'tr-2', 'fx-4'] as const; // galaxy §15.1: net.streams = 1 on these, 0 on every other Act II beat
  ```
  **The streams** (galaxy §15.2):
  - Each stream and the feed is drawn as 1 px dots (pixel floor and cap both 1), `round(chord / 1.2)` of them, clamped to [6, 40].
  - A dot's brightness is `streamGain(u, net.streams, lampGain)`. It is ember while the stream carries the defect (its `hiAt`, out as its child's fix lands), and capped the same when lit.
  - `net-streams` and `net-feed` are invisible, not drawn, while `net.streams` is 0.
  **How the motes move:**
  - **A builder** sets out from `bodyWorld(parent, t)` plus a spread, takes a Bezier whose control point is the midpoint moved `STREAM_BOW`·chord toward `bowBearing` about the chord, and lands on `bodyWorld(self, t) + R·shellWarp(...)`. The shell wraps outward by angle from the stream's arrival direction.
  - **A moon** lands as one event in the last 30 % of its planet's build, with a flare.
  - **Person motes** have a host (the planet or one of its moons). C1's split is planet 70, the hero moon 20 and the other moons 6 each.
  - **Derp terms** apply as follows:
    - The planet's and moons' orbit derp goes on `ν`, `r` and lift after Kepler.
    - The shell gets the morph and the scatter.
    - Stars and the core shiver and scatter.
    - Every term is scaled by `lodGain(Derp)·v`.
  - **The ghost** is one `net-bodies` instance per cracked planet or moon, at `0.45·ghost·gain`.

  **How the light reads:**
  - A lit body is ember on its shell (0.8 mix, ×2.5), its rim and fill (×1.35), its tracks at 0.5 and its moons.
  - A fixed body keeps amber dust.
  - The surge runs by hop.

  **The lamp:** a mote is lit iff its membership row at the lamp's level equals `lampRow`'s. Otherwise its gain is 0. Level 3 lights the core and every star, and level 5 lights `rule == lampRow` plus the core.

- [ ] **Step 1: Write the failing unit tests.**
  - `bodyMote.test.ts`:
    - a builder is hidden before `settle − W`, on its Bezier during the window and on its lattice point after it
    - a healthy planet's shell motes satisfy `|pos − bodyWorld| = R` exactly at 50 ambients
    - a cracked one's leave the sphere only through `derp`/`shellWarp`, and only when `lodGain(Derp)` > 0
    - `hi` is 0 before `hiAt`, 1 after, and 0 once fixed
    - `lampGain` is 0 for every row outside the lit set at each level, and 1 (or 0.3 at focus 1 for a non-subject) inside it
  - `netTrack.test.ts`: `lampFocusRow` for each kind of target.
  - `review.test.ts`: re-pin `ringAt` to the visit's `bodyWorld` at three ambients.
  - `stream.test.ts`:
    - `streamGain(u, 0, 1)` is 0 for every `u`
    - `streamGain` falls monotonically along `u`, `streamGain(0, 1, 1) = STREAM_CAP` and `streamGain(1, 1, 1) = 0.15 · STREAM_CAP`
    - no lit or unlit dot exceeds `STREAM_CAP`
    - the dots move with ambient and not with scroll: same `uAmbient`, any `uClock`, same positions

- [ ] **Step 2: Write the failing e2e tests** (`galaxy.spec.ts`, `?galaxy=1&test=1&shot=…&state=…`)

```ts
test('the lamp has a hard edge', ...);    // shot close, lamp 1 on C1: no lit px outside C1's projected planet-system disc (+2 px) but tracks and person motes
test('the twelve light as twelve at the twelve probe', ...); // growth 0.35, highlight 0.25, fix 0.1, lamp 5 on R0: emberComponents → 3 ≥ 60 px² and 9 in 8–60 px²
test('a healthy planet is a sphere and a cracked one breathes', ...); // close shot, ambient 0 vs 0.5: diff inside a healthy planet's rect only from orbital motion masked by the twin; cracked > 0
test('streams are off by default', ...); // system probe, growth 0.2, net.streams 0: net-streams and net-feed not in drawStats().visible; the frame equals the frame with both meshes forced hidden
test('streams are quiet when shown', ...); // system probe, net.streams 1 vs 0: no pixel of the difference above 96 in any channel (both sizes);
                                          // the brightest stream px in the parent-end 10 % of each stream ≥ 3× the child-end 10 % (from the twin's projected endpoints)
```

- [ ] **Step 3: Run them.** Expected: FAIL.

- [ ] **Step 4: Extract `light.*`** (no behaviour change: the old `?lib=node` parity stays green), then implement `bodyMote.*`, `netTrack.ts`, the stream, feed and ring draws, the ghost instances and the new leaves.

- [ ] **Step 5: Add `?lib=body`.**
  - Cases: C1, its moons and P1 at defect-close states; R0 at fix; 64 hashed motes.
  - Each at ambient ∈ {pose, 101}.
  - Every `BodyMoteOut` field is compared.

- [ ] **Step 6: Run.** Expected: PASS.

- [ ] **Close-out** A–D. Stills: `T6-twelve` (lamp 5), `T6-close-pose` (C1 at `AMBIENT_POSE`), `T6-close-fixed` (fix 0.1), `T6-hood-lit` (highlight 0.3), `T6-system-streams` (net.streams 1) beside `T6-system-nostreams` (net.streams 0). Retired: nothing. Re-pinned:
  - `src/network/review.test.ts`, for ambient: the ring now tracks moving visits.
  - `src/scene/node/stream.test.ts`'s `fract(aK + NODE_STREAM_SPEED * uClock)` assertion becomes `uAmbient`: galaxy §15 moves the dot flow to the ambient clock.
  - `nodeSystem.test.ts`'s `DOT_SPACING` 0.6 assertion stays for the old network, which Task 8 deletes.

---

