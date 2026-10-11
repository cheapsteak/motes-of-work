# Task 2 report: One attribute layout, parity through the production path

## What I implemented

- `src/math/salts.ts`: `SALT` const object (settle 1 … hero 15, values unchanged) is the single source.
  `glslSaltName()` (`misVisible` → `SALT_MIS_VISIBLE`) and `glslSaltConstants()` generate
  `const uint SALT_X = Nu;` lines. `attributes.ts`, `mote.ts`, `mote.glsl`, `instance.glsl` now name
  every salt (`SALT.x` / `SALT_X`); no literal salts remain.
- `src/scene/mote/layout.ts`: `INSTANCE_ATTRIBUTES` declares the per-instance layout once
  (`aLocal`, `aTwin`, `aMeta0` = part/seed/settle/role, `aMeta1` = type×3 + visibility bits). Each
  attribute has `name`, `itemSize`, `fields`, `pack(attrs) → number[]`; each field carries its TS
  pack, GLSL struct type and GLSL unpack expression. From it:
  `instancedAttributes(attrs)` (the production InstancedBufferAttributes, used by moteSystem AND
  parity), `glslAttributeDecls()`, `glslMoteAttrsStruct()` (the GLSL `MoteAttrs` struct, so the
  hand-written struct in mote.glsl is gone too), and `glslInstanceAttrs()` (incl. the
  `moteUnpackBits3` visibility-bit decoder, next to its TS encoder).
- `src/scene/mote/shaderSource.ts` (new, not in the brief's file list; see concerns): splices the
  generated GLSL at module load. Markers: SALT constants + MoteAttrs struct in `mote.glsl`;
  attribute decls + `instanceAttrs()` in `instance.glsl`; the existing vertex include marker in the
  mote/thread/ghost vertex shaders (text updated to name shaderSource.ts). `splice()` throws unless
  the marker occurs exactly once. Exports `moteLibraryGlsl()`, `withMoteLibrary()`,
  `VERTEX_INCLUDE_MARKER`.
- `moteSystem.ts`: its private `withMoteLibrary`, `visibleBits`, `instancedAttributes` removed;
  imports them from shaderSource/layout. Behaviour unchanged.
- `src/parity/fields.ts` (new, WebGL-free): `PARITY_FIELDS` (pos 3, settled, type, brightness,
  visible), `parityPasses()` packs them into ≤4-component RGBA passes (2 passes today),
  `glslPassOutput()`, `fieldValues()` (TS value → floats; boolean → 0/1).
- `src/parity/parity.ts`: mote parity now draws `gl.POINTS` with an InstancedBufferGeometry holding
  the production `instancedAttributes()` (+ one non-instanced origin vertex), instanceCount = motes.
  The vertex shader is built with `withMoteLibrary` (so `instanceAttrs()` → `mote()` is the real
  path), places instance i on texel (i%16, i/16) via `gl_InstanceID`, `gl_PointSize = 1`, and writes
  the pass's MoteOut fields to a `flat out vec4`; the fragment shader writes it out. One draw per
  pass; comparison iterates PARITY_FIELDS, so every MoteOut field is compared. The old attrTexture
  and its own GLSL unpacking are gone. The hash check keeps its fullscreen-quad fragment shader
  (now over `moteLibraryGlsl()`, and seeds hashed under every SALT value).
  Visibility-bit coverage: the first 8 motes take all 8 visibility combinations, and two new cases
  (`vibed 1`, `misallocated 1`) put every mote in scenario 1 / 2 (default cases are scenario 0), so
  each bit is unpacked as both 0 and 1 regardless of the mechanism's sample.
- `e2e/parity.spec.ts`: two new case names; comment updated.

## Tests

- `src/math/salts.test.ts`: pins the SALT table; values unique; generated GLSL constants ==
  SALT set (names and values, as a Map and as a value set); every GLSL `hash01(` call in
  mote.glsl/instance.glsl takes a `SALT_` constant and every referenced `SALT_` name is generated;
  every TS `hash01(` call in attributes.ts/mote.ts takes `SALT.x`.
- `src/scene/mote/layout.test.ts`: set(layout fields) == set(keys of a real MoteAttrs) with no
  duplicates; itemSize == sum of field components ≤ 4 and pack length; all 8 visibility combos pack
  to bits; `instancedAttributes` matches pack() per mote; generated decls / struct members /
  instanceAttrs() assignments match the spec; every attribute component read once, in order;
  production vertex shaders fully spliced; splice throws on missing/repeated marker.
- `src/parity/fields.test.ts`: set(Object.keys(sample MoteOut)) == set(PARITY_FIELDS names);
  fieldValues sizes; passes place every field once, unsplit, ≤4 comps; GLSL pass output.
- Mutation check (temporary, reverted): swapping the bit order in the generated
  `moteUnpackBits3` made the parity e2e fail with maxError 1, so parity really runs the production
  `instanceAttrs()` unpack.
- Visual output: captured `#stage` canvas screenshots at p = 0.03, 0.12, 0.25, 0.41, 0.6, 0.75,
  0.88, 0.97 before any change and after the change (temporary spec, deleted): all 8 PNGs are
  byte-identical.

## TDD evidence

RED — `npx vitest run src/math/salts.test.ts src/scene/mote/layout.test.ts src/parity/fields.test.ts`:
```
FAIL  src/math/salts.test.ts  Error: Cannot find module './salts'
FAIL  src/parity/fields.test.ts  Error: Cannot find module './fields'
FAIL  src/scene/mote/layout.test.ts  Error: Cannot find module './layout'
Test Files  3 failed (3)
```
Expected: the modules did not exist yet. (One further RED after implementing: my own test sorted
the swizzle alphabetically, `'wxyz'` vs `'xyzw'`; fixed the test to compare in order.)

GREEN — `npm run typecheck && npm test`: tsc clean; `Test Files 20 passed (20), Tests 180 passed (180)`.
`npx playwright test e2e/parity.spec.ts`: 1 passed.

Full suite: `npm run typecheck && npm test && npm run e2e` → typecheck ok, 20 files / 180 unit
tests passed, e2e `34 passed, 1 skipped (3.6m)` (the skip is shots.spec, gated on SHOTS=1). Purity
and looks specs pass unmodified.

## Files changed

Created: `src/math/salts.ts`, `src/math/salts.test.ts`, `src/scene/mote/layout.ts`,
`src/scene/mote/layout.test.ts`, `src/scene/mote/shaderSource.ts`, `src/parity/fields.ts`,
`src/parity/fields.test.ts`.
Modified: `src/scene/mote/{attributes,mote,moteSystem}.ts`, `src/scene/mote/mote.glsl`,
`src/scene/mote/shaders/{instance,mote.vert,thread.vert,ghost.vert}.glsl`, `src/parity/parity.ts`,
`e2e/parity.spec.ts`.

## Self-review / concerns

- Files outside the brief's list: `attributes.ts`, `mote.ts`, `mote.glsl` (salts, struct marker —
  required by the salt ruling and to remove the hand-written struct), the three vertex shaders
  (marker text only), plus new `shaderSource.ts` (GLSL assembly kept out of layout.ts so layout
  stays the layout; moteSystem and parity both need it) and `src/parity/fields.ts` (compared-field
  list importable without WebGL, per ruling).
- `src/scene/mote/salts.glsl` was not created: per the controller ruling the GLSL constants are
  generated from TS at module load, so a file would be a second copy.
- The `MoteOut` GLSL struct is still hand-written in mote.glsl; parity's generated
  `o.<field>` expressions fail to compile if a PARITY_FIELDS name is missing there, and the unit
  test ties PARITY_FIELDS to the TS MoteOut keys.
- The hash check still includes the mote library in a fragment shader (pre-existing; the global
  constraint says mote.glsl only in vertex shaders). The mote() parity itself now runs in a vertex
  shader as production does. Left as is to keep scope.
- Repo has no prettier config/dependency; the hook's prettier warnings use defaults that do not
  match repo style (120 cols). New code follows the existing style and stays ≤ 120 columns.
