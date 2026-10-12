# Shared instructions for Tasks 5–7 (mechanism modules)

You are building ONE mechanism module in your own git worktree (path and branch in your dispatch). Three mechanisms are being built in parallel in separate worktrees; stay inside your own files so they merge cleanly.

## Read first
- Implementer rules: .superpowers/sdd/2026-10-03-plan-2-shapes-and-depth/implementer-instructions.md — but your repo/working directory is YOUR WORKTREE, not <repo>, and your branch is `mech-<id>`.
- Plan 2 global constraints (licensing rule!): .superpowers/sdd/2026-10-03-plan-2-shapes-and-depth/global-constraints.md
- The brief for Tasks 5–7 (your mechanism's paragraph + the shared checklist): .superpowers/sdd/2026-10-03-plan-2-shapes-and-depth/task-5-7-brief.md
- Spec §5 (visual language) and §6.3 (mechanism contract) in docs/specs/2026-10-02-motes-of-work-design.md (in your worktree).

## The essay's needs (why the mechanism exists)
Particles ("motes") build a machine. The **core** is the small, critical part a human must specify (it renders warm when specced); the **body** is the large, repetitive bulk agents fill in; **drift** parts are where loose motes wander. The **wrong twin** is a confident, polished build of the wrong thing made from the SAME parts (point-for-point morph via `localTwin`). **Faults** must show as visible malfunctions *of this machine* against a faint ghost of the correct pose.

## Contract (read src/mechanisms/types.ts and an existing module: src/mechanisms/gears/*)
- `Mechanism { id; parts: MechanismPart[]; pose(drive, faults, variant): PartTransform[]; samplePoints(budget, seed): BoundPoint[] }`. `BoundPoint { part; local; localTwin; normal; normalTwin; seed }` (unit normals; normalTwin rotated consistently with localTwin; equal to normal where the twin shape equals the correct shape).
- `pose()` must be PURE (no module-level mutable state, no wall clock); it handles every fault except `drift` (drift is per-point, handled generically).
- `explodedOffset` moves/rotates a part about its own posed position (see types.ts doc). **Keep core-part offsets modest** — the spec section frames the core and the framing test (src/timeline/keyframes.test.ts) iterates every registered mechanism.
- Machines **face +z** toward the key light (lighting looks test convention); roughly centred on the origin, overall size comparable to the gears (bounding radius ~2.5 units).
- Build geometry with the shape library in src/shapes/ (involute/cycloidal gears, extrudeProfile, primitives, samplePart with seeded rng). Add new primitives to your own module folder if needed (do not edit src/shapes/* — the other two tasks share it; if you truly need a library change, report it).
- Point weights per part are your choice; keep the core a meaningful share (~25–35%) and avoid tiny parts with huge weights (they blow out white under additive blending).
- Export `export const label = '...'` and `export const blurb = '...'` (one sentence, sentence case) from your module's index.ts for the comparison page (Task 8 wires them).

## Files you may touch
- Create: `src/mechanisms/<id>/**` (index, shapes, kinematics, tests).
- Modify: `src/mechanisms/index.ts` — add ONE line registering your mechanism (keep alphabetical order of the object keys; nothing else).
- Create: `e2e/mech-<id>.shots.spec.ts` — SHOTS-gated (skip unless `SHOTS=1`), using `?test=1&mech=<id>&state=…` to save three-quarter screenshots to `shots/mech-<id>-{assembled,twin,exploded-0.75,faults-0.6}.png` (camera e.g. pos [1.6,1.1,2.4] machine-relative, target [0,0,0]).
- Anything else: report it instead of editing.

## Verification
- `npx tsc --noEmit -p .` and `npx vitest run` (contract test + keyframes framing test + your kinematics tests).
- e2e with your own port to avoid colliding with the parallel worktrees: `E2E_PORT=<port from dispatch> npx playwright test e2e/parity.spec.ts e2e/looks.spec.ts` (parity runs over every registered mechanism), then `SHOTS=1 E2E_PORT=<port> npx playwright test e2e/mech-<id>.shots.spec.ts`.
- LOOK at your four screenshots and describe them honestly in the report: does it read as the machine? is the core distinguishable? does the twin read as a different, plausible machine? do faults read as malfunctions? anything blown out or too sparse?
- Commit on your branch with the trailer. Do not push. Do not merge. Leave no background processes running.

## Licensing
Port only MIT/BSD/Apache/PD math (record in your report so the controller can add it to CREDITS.md — do NOT edit CREDITS.md yourself, to avoid merge conflicts). Study-only for NC/SA/LGPL/unlicensed sources; never paste or translate their code.

## Report
Full report to the report path in your dispatch; reply with ONLY the short contract (status, commits, one-line tests, concerns, report path).
