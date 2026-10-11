### Task 4: Transform and hash math

**Files:**
- Create: `src/math/transform.ts`, `src/math/hash.ts`, tests.

**Interfaces:**
- Produces:
  ```ts
  export type Quat = [number, number, number, number]; // x,y,z,w
  export interface PartTransform { position: Vec3; quaternion: Quat }
  export const IDENTITY: PartTransform;
  export function compose(a: PartTransform, b: PartTransform): PartTransform; // apply b, then a
  export function applyToPoint(t: PartTransform, p: Vec3): Vec3;
  export function lerpTransform(a: PartTransform, b: PartTransform, t: number): PartTransform; // lerp position, slerp rotation
  export function fromAxisAngle(axis: Vec3, angle: number): Quat;
  export function transformDistance(a: PartTransform, b: PartTransform): number; // |Δposition| + angle between rotations (rad)
  // hash.ts — integer ops only, so GLSL can match bit-for-bit
  export function pcg(v: number): number;            // uint32 in, uint32 out
  export function hash01(seed: number, salt: number): number; // [0,1)
  export function mulberry32(seed: number): () => number;
  ```
- `pcg` is exactly: `state = v*747796405 + 2891336453; word = ((state >>> ((state >>> 28) + 4)) ^ state) * 277803737; return ((word >>> 22) ^ word) >>> 0` (uint32 arithmetic via `Math.imul`, `>>> 0`). `hash01(seed, salt) = pcg((seed ^ Math.imul(salt, 0x9E3779B9)) >>> 0) / 4294967296`.

- [ ] **Step 1: Failing tests:** `compose(IDENTITY, t)` equals `t`; `applyToPoint(compose(a,b), p)` equals `applyToPoint(a, applyToPoint(b, p))` within 1e-9 for random a, b, p; `fromAxisAngle([0,0,1], π/2)` rotates `[1,0,0]` to `[0,1,0]`; `lerpTransform(a,b,0)=a`, `(…,1)=b`; `transformDistance(t,t)=0`. `pcg` is deterministic and output `< 2^32` integer; record `pcg(0)`, `pcg(1)`, `pcg(12345)` as golden values in the test (computed once by the implementation, then frozen); `hash01` mean over 10k seeds in `[0.48, 0.52]`; `mulberry32(7)` sequence repeats for the same seed.
- [ ] **Step 2–4:** Run (FAIL), implement, run (PASS).
- [ ] **Step 5:** Commit `feat: transform and hash math`.

---

