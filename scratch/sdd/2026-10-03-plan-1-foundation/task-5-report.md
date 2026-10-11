# Task 5 report: Mechanism contract and placeholder gears

## Implemented
- `src/mechanisms/types.ts`: Role, MechanismPart, BoundPoint, Mechanism (spec 6.3). PartTransform/Quat/Vec3 imported from math modules.
- `src/mechanisms/gears/index.ts`: placeholder gears (5 parts per brief table), pure `pose()` (bind, stall, ratio, slip, misalign, jitter, variant blend; drift deliberately excluded), `samplePoints()`.
- `src/mechanisms/gears/shapes.ts`: shape samplers (gear annulus+teeth, capsule/fan crank, rounded plate, L-bracket).
- `src/mechanisms/index.ts` registry; `src/config.ts` `ACTIVE_MECHANISM = 'gears'`.
- `src/mechanisms/contract.test.ts`: contract tests per brief plus a config check and small/odd budget check.

## Design notes
- Twin crank: same capsule sample rotated about z by a random blade angle (3 blades), so local/localTwin morph point for point.
- Twin driven gear: gearing multiplier lerps -2 -> 1 with variant (equivalent to blending angles); centre lerps (0.9,0,0) -> (-0.9,0,0.3). Crank shares the driven gear's pose.
- Point counts via cumulative rounding (last part absorbs remainder; total always equals budget, including 0/1/7).
- Per-part mulberry32 stream seeded by pcg(seed, part); BoundPoint.seed = pcg(seed + imul(index, golden)) & 0xffffff.
- Gear tooth tip at angle 0 so the drive gear's tooth/gap phase meshes with the driven gear at theta=0.
- Extra beyond brief: none outside the file list; config.ts has only ACTIVE_MECHANISM (no budgets, YAGNI).

## TDD
RED: `npx vitest run src/mechanisms` -> FAIL: contract.test.ts could not resolve `./gears` (module did not exist; expected).
GREEN: same command -> 1 file, 12 tests passed.
Full: `npm run typecheck && npm test` -> typecheck clean; 9 files, 96 tests passed. e2e not run (nothing the browser runs imports these yet).

## Files
Created: the six listed above (gears/shapes.ts is the optional split; index.ts 107 lines, shapes.ts 99).

## Self-review
- pose() has no module-level mutable state; each call builds fresh arrays (identity quaternions are fresh arrays per part, not shared).
- Frozen ZERO_FAULTS only read.
- No concerns.
