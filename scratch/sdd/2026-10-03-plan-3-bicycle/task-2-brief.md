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

