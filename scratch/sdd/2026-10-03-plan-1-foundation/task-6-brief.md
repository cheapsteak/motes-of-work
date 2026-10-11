### Task 6: Mote attributes and TypeScript `mote()`

**Files:**
- Create: `src/scene/mote/attributes.ts`, `src/scene/mote/partTransforms.ts`, `src/scene/mote/mote.ts`, tests.

**Interfaces:**
- Consumes: `Mechanism`, `BoundPoint`, `SceneState`, transform + hash math.
- Produces:
  ```ts
  export enum MoteType { Human = 0, Agent = 1, Dialogue = 2 }
  export const ROLE_INDEX: Record<Role, number>; // core 0, body 1, drift 2
  export interface MoteAttrs {
    part: number; role: number; local: Vec3; localTwin: Vec3; seed: number; settle: number;
    type: [MoteType, MoteType, MoteType];      // [specced, vibed, misallocated]
    visible: [boolean, boolean, boolean];
  }
  export function buildMoteAttrs(mech: Mechanism, points: BoundPoint[]): MoteAttrs[];
  export function partTransforms(mech: Mechanism, s: SceneState): PartTransform[]; // compose(lerpTransform(IDENTITY, part.explodedOffset, 1 - assembly), pose[i])
  export function packPartTexture(xf: PartTransform[]): Float32Array; // 2 RGBA texels per part: [qx,qy,qz,qw],[px,py,pz,0]
  export interface MoteOut { pos: Vec3; type: MoteType; brightness: number; visible: boolean; settled: number }
  export function mote(a: MoteAttrs, s: SceneState, xf: PartTransform[]): MoteOut;
  export function spawnPoint(seed: number): Vec3;
  ```
- `buildMoteAttrs` rules (h_k = `hash01(seed, k)`):
  - `settle`: core `0.05 + 0.40·h1`; body `0.35 + 0.60·h1`; drift `0.50 + 0.45·h1`.
  - specced: core → Human if h2 < 0.55 else Dialogue; body/drift → Agent. vibed: all Agent. misallocated: core → Agent; body/drift → Human if h2 < 0.30 else Agent.
  - extras = body points with h3 < 0.15. Visible: specced and vibed → all except extras; misallocated → extras visible, core visible only if h4 ≥ 0.5, others visible.
- **`mote()` algorithm** (the GLSL in Task 7 must match it):
  1. Scenario: `u = hash01(seed, 11)`; `v = clamp(vibed,0,1)`, `m = clamp(misallocated,0,1−v)`; k = 1 if u < v, 2 if u < v+m, else 0.
  2. `rest = applyToPoint(xf[part], mix(local, localTwin, variant))`.
  3. Drift: `w = drift·(role==2 ? 1 : 0.25)`; `rest += w·0.6·[sin(1.7·rest.y + 1.3·drive + 6.283·h5), sin(1.9·rest.z + 1.1·drive + 6.283·h6), sin(2.3·rest.x + 0.9·drive + 6.283·h7)]` using the pre-drift `rest` on the right-hand side.
  4. `t = smoothstep(settle − 0.08, settle, assembly)`; `e = 1 − (1−t)^3`.
  5. `spawn = spawnPoint(seed)`: direction from h8, h9 (uniform on sphere), radius `9 + 3·h10`, y scaled by 0.6.
  6. Control point `c = (spawn + rest)/2 + 2·(h12 − 0.5)·normalize(cross(rest − spawn, [0,1,0]))` (use `[1,0,0]` if the cross is ~0). `pos = (1−e)²·spawn + 2(1−e)e·c + e²·rest`.
  7. `brightness = mix(1, 0.35, t)`; `type = type[k]`; `visible = visible[k]`; `settled = t`.

- [ ] **Step 1: Failing tests:**
  - assembly 1, zero faults, variant 0, specced: `pos` equals `applyToPoint(xf[part], local)` (1e-9), `settled=1`, `brightness=0.35`.
  - assembly 0: every attr with `settle ≥ 0.08` has `settled=0` and `pos` equals `spawnPoint(seed)`.
  - variant 1 uses `localTwin`.
  - `provenance.vibed=1` → every type is Agent; specced → some core points Human and some Dialogue, all body Agent.
  - drift 1 moves a drift-role point more than a core point (ratio ≈ 4 on average over the sample).
  - misallocated 1: fraction of visible core points in `[0.45, 0.55]` over 2000 points from gears.
  - determinism and call-order independence.
  - `packPartTexture` length = `parts·8`.
- [ ] **Step 2–4:** Run (FAIL), implement, run (PASS).
- [ ] **Step 5:** Commit `feat: mote attributes and reference mote()`.

---

