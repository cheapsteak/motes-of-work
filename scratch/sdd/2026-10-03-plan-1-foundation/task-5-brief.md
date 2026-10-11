### Task 5: Mechanism contract and placeholder gears

**Files:**
- Create: `src/mechanisms/types.ts`, `src/mechanisms/index.ts`, `src/mechanisms/gears/index.ts`, `src/mechanisms/contract.test.ts`, `src/config.ts`

**Interfaces:**
- Consumes: `Vec3`, `PartTransform`, `Faults`, `ZERO_FAULTS`, `FAULT_KEYS`, `mulberry32`, `fromAxisAngle`.
- Produces: the spec §6.3 types verbatim (`Role`, `MechanismPart`, `BoundPoint`, `Mechanism`), plus
  ```ts
  export const mechanisms: Record<string, Mechanism>; // mechanisms/index.ts
  export const ACTIVE_MECHANISM: keyof typeof mechanisms; // config.ts, = 'gears'
  ```
- `pose()` covers every fault **except `drift`**, which is per-point and lives in `mote()` (Task 6).

**Placeholder "gears" design** (units: world; machine centred on origin, facing +z):

| # | id | role | correct shape / place | wrong-twin shape / place | explodedOffset position |
|---|---|---|---|---|---|
| 0 | drive-gear | core | gear r=1.2, 18 teeth, centre (−0.9,0,0) | same gear | (−1.5, 0, 1.2) |
| 1 | driven-gear | body | gear r=0.6, 9 teeth, centre (0.9,0,0) — meshes with 0 | same gear stacked coaxially on 0 at (−0.9,0,0.3) | (1.5, 0.5, 1.5) |
| 2 | crank | core | capsule arm length 1.0 from driven-gear centre | 3-blade fan around driven-gear centre | (2, 1.5, 2.5) |
| 3 | frame | body | rounded rectangle plate 4.2×2.8 at z=−0.2 | same | (0, 0, −2) |
| 4 | loose-bracket | drift | L-bracket near (1.6,−1.1,0) | same | (0, −2, 1.5) |

Kinematics with θ = 2π·drive, then faults (correct variant; twin: parts 1–2 rotate with θ, not −2θ; blend angles by `variant`):
- `bind`: θ ← θ − bind·0.35·sin(2θ)
- `stall`: with period P = π, u = θ/P: θ ← mix(θ, P·(floor(u) + smoothstep(0.4, 1, fract(u))), stall)
- driven angle φ = −2θ·(1 + 0.6·ratio) − slip·0.8·(fract(3θ/2π) − 0.5)
- `misalign`: driven gear and crank get extra rotation about x by misalign·0.25·sin(θ) and position offset misalign·0.08 on y
- `jitter`: every part's position += jitter·0.03·(hash01-based noise of `floor(drive·40)` and part index, each axis in [−1,1])
- `samplePoints(budget, seed)`: part weights 0.32 / 0.18 / 0.12 / 0.30 / 0.08 (last part absorbs rounding so the total equals `budget`); gears = annulus fill + tooth outline; frame = filled rounded rect; crank = capsule; bracket = L. `localTwin` for parts 0, 3, 4 equals `local`; part 1's twin is the same local shape (its *placement* differs via pose); part 2's twin is the fan.

- [ ] **Step 1: Failing contract test** iterating `Object.entries(mechanisms)`:
  - has ≥1 `core` and ≥1 `body` part; `pose()` returns `parts.length` transforms; deterministic across calls and call order.
  - for each fault in `FAULT_KEYS` except `drift`: some `d ∈ {0.13, 0.37, 0.71}` gives `max_i transformDistance(pose(d, {…ZERO_FAULTS, [k]:1}, 0)[i], pose(d, ZERO_FAULTS, 0)[i]) > 1e-3`.
  - `pose(d, ZERO_FAULTS, 0)` differs from `pose(d, ZERO_FAULTS, 1)` for some part, or some point's `localTwin ≠ local`.
  - `samplePoints(1000, 7)` has length 1000, equals a second call, differs from `samplePoints(1000, 8)`; every `part` index valid; all coordinates finite; `seed` integers in `[0, 2^24)`.
- [ ] **Step 2–4:** Run (FAIL), implement gears, run (PASS).
- [ ] **Step 5:** Commit `feat: mechanism contract and placeholder gears`.

---

