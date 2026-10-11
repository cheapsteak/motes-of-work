### Task 8: Mote system rendering

**Files:**
- Create: `src/scene/mote/moteSystem.ts`, `src/scene/mote/shaders/mote.vert.glsl`, `mote.frag.glsl`, `thread.vert.glsl`, `thread.frag.glsl`, `ghost.vert.glsl`, `ghost.frag.glsl`, `e2e/looks.spec.ts`
- Modify: `src/main.ts` — mount the mote system for `ACTIVE_MECHANISM` (budget 100k desktop) and render `mergeState(defaultSceneState(), <?state= JSON>)`; `?test=1` disables shimmer. Task 9 replaces the default state with the sampler output and keeps `?state=` as an override.

**Interfaces:**
- Consumes: `mote.glsl`, `buildMoteAttrs`, `partTransforms`, `packPartTexture`.
- Produces:
  ```ts
  export interface MoteSystem {
    object: THREE.Group; // motes + threads + ghost meshes
    update(state: SceneState, camera: THREE.PerspectiveCamera, viewportPx: { width: number; height: number }, shimmerTime: number | null): void;
    dispose(): void;
  }
  export function createMoteSystem(mech: Mechanism, budget: number, seed: number): MoteSystem;
  ```
- Rendering rules (spec §5.1, §6.4):
  - One `InstancedBufferGeometry`, two quads (8 vertices) per instance; the second quad is the dialogue twin and is collapsed to zero size unless type is Dialogue. Instanced attributes: `aLocal`, `aTwin`, `aMeta0 = (part, seed, settle, role)`, `aMeta1 = (typeS, typeV, typeM, visibleBits)`.
  - Sizes (world units, then clamped in pixels): human 0.12 / cap 48px, agent 0.025 / cap 4px, dialogue 0.05 / cap 10px; minimum 1px. Invisible motes collapse to zero size.
  - Fragment: human = soft halo `exp(−4r²)` plus bright core; agent = hard disc with 1px smoothstep edge; dialogue = small soft disc. Colors from Global Constraints, multiplied by `brightness`. `blending: AdditiveBlending`, `depthWrite: false`, `transparent: true`.
  - Dialogue twins orbit the mote position in the view plane: radius 0.06, phase `uDrive·6 + 6.283·hash01(seed, 13)`.
  - Thread mesh: same instanced attributes; a 1.5px-wide quad between the two twins, alpha 0.25, only for Dialogue.
  - Ghost mesh: same attributes, every 4th instance (`gl_InstanceID % 4 == 0`), evaluated with faults zero (uses a second part texture from `pose(drive, ZERO_FAULTS, 0)`, assembly 1), variant 0, drift 0, specced; 2px hard dot, white, alpha `0.35·ghost`; hidden when `ghost == 0`.
  - Shimmer: when `shimmerTime !== null`, settled motes get `0.01·sin(shimmerTime·1.3 + 6.283·hash01(seed,14))` per axis; `shimmerTime` is wrapped `% 1000` on the CPU.
- `aMeta1.w` packs the three visibility flags as bits (1 = specced, 2 = vibed, 4 = misallocated); the vertex shader unpacks them into `MoteAttrs.visible`.

- [ ] **Step 1: Failing e2e** `looks.spec.ts` (renders fixed states via `/?test=1&state=…`, screenshots the canvas, asserts by pixel sampling):
  - specced, assembly 1: amber pixels exist near the drive-gear centre's projection; blue pixels exist over the frame.
  - vibed 1: no amber pixels anywhere (sample whole canvas; amber = R>200, G 140–200, B<120).
  - ghost 1 vs ghost 0: count of near-white pixels increases.
  - all motes invisible state (assembly 1, misallocated 1 on a core-only crop) renders without errors.
  - Save screenshots to `shots/looks-*.png` for human review.
- [ ] **Step 2–4:** Run (FAIL), implement, run (PASS). Look at the saved screenshots before committing.
- [ ] **Step 5:** Commit `feat: instanced mote rendering with dialogue threads and ghost`.

---

