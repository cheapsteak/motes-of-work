# Adding a mechanism

A mechanism is the machine the motes build. The essay needs one; the comparison page shows every registered
one side by side. This guide covers what a mechanism has to provide, how to build one from the shape
library, what the existing tests check for you, and what we learned building the gears, the watch movement,
the strandbeest and the steam engine.

The four existing modules are the best reference. `src/mechanisms/gears/` is the smallest (one file of
logic plus shapes). `src/mechanisms/steam/` is the most complete: area-weighted point shares, a floor, a
governor linkage and every fault.

## What the story asks of a machine

- **Core** parts are the small, critical part a person has to specify. They render warm when the machine is
  specced. Pick a core that is true of the machine, not a visual convention: the steam engine's governor
  really is the part that keeps the engine honest.
- **Body** parts are the bulk that agents fill in. They render cool.
- **Drift** parts are where loose motes wander when the machine drifts.
- **The wrong twin** (`variant` 1) is what the swarm builds without a spec. Every mote has a place in both
  variants, and the story morphs between them point for point.
- **Faults** are malfunctions of this machine, shown against a faint ghost of the correct pose.

## The contract

`src/mechanisms/types.ts`:

```ts
interface Mechanism {
  id: string;
  parts: MechanismPart[];                                   // { id, role, explodedOffset }
  pose(drive: number, faults: Faults, variant: number, steer?: number): PartTransform[];
  samplePoints(budget: number, seed: number): BoundPoint[]; // { part, local, localTwin, normal, normalTwin, seed }
  ink?(): InkStroke[];                                      // optional: the machine drawn in ink
  sheet?: InkSheet;                                         // the page it is drawn on, with `ink`
}
```

- **`ink` and `sheet` are optional.** Only the bicycle has them (`src/mechanisms/bike/ink.ts`): the spec
  section draws it in ink on a sheet of paper and lifts the drawing into the machine
  (docs/specs/2026-10-05-blueprint-and-build.md). A machine without them is never drawn, and nothing
  else changes. A drawing is strokes in part space (world units, like `local`), built from the same
  constants and calls as the solids so it cannot drift, both builds point for point, in the pen's order.

- **`pose` is pure.** No module state, no clock, no `Math.random`. Every frame of the essay is a function of
  scroll position, so the same arguments must always give the same transforms. It returns one transform per
  part. The ghost is `pose(drive, ZERO_FAULTS, ghostVariant)`. `steer` is the scene's `mech.steer`, steering
  added to the drive's own as a fraction of full lock; a machine that does not steer ignores it.
- **`pose` handles every fault except `drift`**, which is applied per point by the renderer. For randomness
  (jitter), hash a tick of `drive` with `hash01` from `src/math/hash.ts`.
- **`samplePoints` is deterministic** for a given budget and seed, and returns exactly `budget` points.
  Points live in part space. `local` and `normal` are the correct shape; `localTwin` and `normalTwin` are the
  twin's. Normals are unit length, and where the twin's shape is unchanged they equal the correct ones.
  `seed` is an integer below 2^24; copy the derivation in `gears/index.ts`.
- **`explodedOffset`** moves and turns a part about its own posed position. Each part closes it over its
  own settle window (from its first mote setting out to its last landing, `partAssembly` in
  `src/scene/mote/partTransforms.ts`), so a part arrives with its motes and sits exactly in its pose once its
  window has ended, while later parts stay exploded. Keep the core's offsets modest: the spec section frames
  the assembled core, and a test checks it fits. By default the offset closes on a smoothstep; a part may
  give its own `arrival(x)` curve instead (0 at the window's start, 1 at its end; in between it may hold,
  fall and rebound a little), as the bicycle's basket does to hover, drop onto the fork and settle.

## Building one

1. **Create `src/mechanisms/<id>/`.** The usual split is `shapes.ts` (geometry), `kinematics.ts` (the
   machine's maths, unit-tested on its own), `index.ts` (parts, point shares, `pose`, `samplePoints`), and
   tests beside each.
2. **Build geometry from `src/shapes/`.**
   - `involuteGear` and `cycloidalGear` produce tooth outlines.
   - `extrudeProfile` turns any outline, with holes, into a solid.
   - `circle`, `plate`, `bar`, `axle`, `ball` and `helix` cover most of the rest.
   - `samplePart` scatters seeded points with normals over a geometry.
   - `src/shapes/testing.ts` has helpers for geometry tests (open edges, distance to a mesh, bounds).
   - Shapes only one machine needs go in that machine's folder.
3. **Place it.** Centre the machine near the origin with a bounding radius of about 2.5 units, facing +z,
   toward the key light.
4. **Share out the points.** See the lessons below. Steam's `PartSpec` pattern (points by surface area within
   each role, with optional fixed shares) is the one to copy. A part may set `settle: [from, to]` to control
   when its motes land; it must stay inside its role's default window. Within the window a mote's landing
   is spread by its hash, unless the part also gives a `settleField(local, h)`, which orders the landing
   by place (the bicycle lays its frame tube by tube this way, with an identity `explodedOffset` so the
   part is built where it stands). Every mote flares as it lands (`FLARE_WIDTH` in
   `src/scene/mote/settle.ts`), so a keyframed assembly hold must sit at least that far from every
   settle value, or the motes there glow for as long as the hold lasts.
5. **Write `pose`.** Get the correct machine moving first, then faults, then the twin.
6. **Name it.** Export `label` (sentence case) and `blurb` from `index.ts`. The blurb is one sentence on what
   the machine is and what its wrong twin does; a test checks it mentions the wrong twin.
7. **Register it.** Add one key to `mechanisms` in `src/mechanisms/index.ts` (alphabetical) and one entry to
   `mechanismMeta` in `src/mechanisms/meta.ts`. The type checker fails until both are done.

## What you get for free

Registering a mechanism runs it through every shared check:

| Check | Where |
|---|---|
| Contract: pure and deterministic `pose`, exact budgets, unit normals, the twin actually differs | `src/mechanisms/contract.test.ts` |
| Anchors: a sensible whole-machine and core centre and radius for the cameras | `src/mechanisms/anchors.test.ts` |
| Every part moves continuously across the twin morph and the whole story | `src/mechanisms/continuity.test.ts` |
| The spec camera frames the whole assembled core beside the text panel | `src/timeline/keyframes.test.ts` |
| Label and blurb present | `src/mechanisms/meta.test.ts` |
| GLSL and TypeScript motes agree on this machine's points | `e2e/parity.spec.ts` |
| Warm core and cool body when specced, no warm motes when vibed, ghost visible, lit faces brighter | `e2e/looks.spec.ts` |
| Picker, presets, slider extremes and side by side | `e2e/compare.spec.ts` |
| Three-quarter screenshots of every state and fault | `e2e/shots.spec.ts` (`npm run shots`) |

Cameras need no per-machine work: they are placed relative to the machine's anchors.

## Checking your work

```bash
npx tsc --noEmit -p .
npx vitest run
npx playwright test e2e/parity.spec.ts e2e/looks.spec.ts e2e/compare.spec.ts
npm run shots                  # then look at shots/mech-<id>-*.png
npm run dev                    # then open /src/compare/compare.html?mech=<id>
```

Look at the screenshots and the comparison page yourself; the tests check mechanics, not whether the machine
reads. To see it in the essay, open `/?test=1&mech=<id>`.

## Lessons

### Reading as a point cloud

- **Silhouette and one big moving part matter most.** The steam engine reads from every camera because of
  its flywheel, which also works like a clock face: every fault shows on it. The watch read well only
  head-on, and the strandbeest only side-on and low; from the three-quarter view, both turned into
  lattices.
- **Flat, layered machines lose depth.** A point cloud shows both faces of a plate, so lighting can only
  separate front from back so far. Prefer machines with depth in several directions.
- **Share points by visible area, not by importance.** A small, dense part blows out to near-white, because
  overlapping motes add up. Keep the core between about 15% and 30% of all points, lower the smaller and denser its surface: the
  gears' crank and drive gear take about 30%, while the steam engine's governor blew out at 25% and stays
  amber at 15%. Share points by area within the core and within the body (steam's `PartSpec` pattern).
- **The twin and the faults must read in a still frame.** Readers scroll slowly and often stop. A change
  that only shows in motion (a gait, a small wobble) does not land. Small mechanisms hide small faults, so
  give faults enough amplitude to see at the story's camera distance.

### Kinematics

- **Blend parameters, not rotations.** Morph the twin by interpolating each part's angles and positions,
  then build its rotation. Blending two final rotations by the shortest arc flips a part half a turn once
  the poses drift far enough apart. That was the watch's bug, and the continuity test now catches it.
- **Linkages have a reach.** Solving a linkage (circle–circle intersections) has no answer past a dead
  point. Clamp, and keep fault gains small enough that the dials never reach the clamp. The strandbeest's
  ratio fault had to drop from 0.6 to 0.06 to keep its feet from teleporting.
- **Gears must actually mesh.** Shared module and the right centre distance, with a test that sweeps the
  teeth through a tooth period (see `gears/index.test.ts`).
- **Keep the pose pure even for randomness.** Hash a tick of `drive`, never the clock.

### Twin normals

When the twin changes a shape rather than just its pose (a sagging belt, a resized link), derive
`normalTwin` from the changed surface. Copying the correct normal lights the twin as if it were the correct
shape.

The simplest way to get both right is to build the twin's shape with the same calls as the correct one, only
with other dimensions (a tube from other end points, a shorter stem), so the two meshes share one topology, and
sample them together with `samplePartPair` (`src/shapes/sample.ts`). Each point lands on the same face at the
same barycentric coordinates of both, so a point on a tube keeps its place along and round the tube, and its
twin normal comes from the twin's own vertex normals. The bicycle's twin frame, saddle and handlebars are
built this way (`frame('twin')` in `bike/shapes.ts`).

## Licensing

Port maths only from permissively licensed sources (MIT, BSD, Apache, public domain) and add the notice to
`CREDITS.md`. Sources under non-commercial, share-alike, LGPL or no stated licence (including most
Shadertoy and OpenProcessing sketches) are study-only: read them for ideas, never paste or translate their
code, and list them under "Inspired by" in `CREDITS.md`.
