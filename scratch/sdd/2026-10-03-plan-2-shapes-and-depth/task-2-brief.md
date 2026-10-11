### Task 2: One attribute layout, parity through the production path

**Files:** Create `src/scene/mote/layout.ts` (+ test); modify `src/scene/mote/moteSystem.ts`, `src/scene/mote/shaders/instance.glsl`, `src/parity/parity.ts`, `e2e/parity.spec.ts`; create `src/math/salts.ts` and `src/scene/mote/salts.glsl` (generated or fenced).

**Interfaces:**
- `layout.ts` declares the per-instance attribute list once (`name`, `itemSize`, `pack(attrs) → number[]`), and generates the GLSL attribute declarations and the `instanceAttrs()` unpacking snippet from it.
- A single salt registry: `export const SALT = { settle: 1, type: 2, extra: 3, misVisible: 4, driftX: 5, ... , hero: 15 } as const;` mirrored in GLSL; a test asserts the GLSL constants equal the TS values as a set.
- Parity renders instances through the real vertex path (`instanceAttrs()` → `mote()`), writing outputs via transform-feedback-free readback (a points draw into a float target, one texel per instance), and compares every `MoteOut` field. A test asserts `set(Object.keys(MoteOut sample)) == set(parity compared fields)`.
- [ ] Failing tests first; implement; parity green for all mechanisms; commit `refactor: single mote attribute layout and production-path parity`.

