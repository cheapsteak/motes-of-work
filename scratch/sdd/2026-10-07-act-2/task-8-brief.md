# Act II, Task 8: stacks that read as cubes

Repo <repo>, branch main; commit there, do not push. First read global-constraints.md and
implementer-instructions.md in this folder, and the repo's CLAUDE.md. Phone first; every frame a pure function of
scroll.

## Requirements

docs/specs/2026-10-06-act-2-storyboard-and-network.md:
- **§12, all of it.** This is the author's feedback and the design that answers it. Build §12.3 task 8.
- **§3.3–§3.8, for context.** Glow, birth windows, the crack, highlight and fix, and the halos.
- **§11 "As built".** The close-up gain, the halo cap, and the pixel tests as built.

Earlier reports in this folder: task-3-report.md (the node set) and task-7-report.md (the look pass and the pixel
tests).

## What to build

1. **A box body for every cube of every stack,** in `src/scene/node/`:
   - one instanced mesh;
   - each box faint and translucent, with the key-lit faces a little brighter, and a thin brighter edge;
   - born with its cube, using the same birth window the motes use (share the timing function; do not copy it);
   - scaled by `net.show`;
   - takes the highlight's ember and the fix's warmth as the motes do;
   - drawn under the crack correctly: the cracked cube's body must not paint over the crack. Either split the
     cracked cube's body as the crack's faces are split, or leave it out while the crack is open. Choose one and
     say which.

   This is a new mesh with its own shaders. If any of its colour, timing or crack logic exists in `node.glsl` /
   `node.ts`, reuse it through the shared constants and functions, so the box and the motes cannot drift apart.
   Add a parity or mirror check if the box shader computes something the TypeScript side also computes.
2. **The round far glow goes.** `lod` in §3.8 stops being a stack's body. The halo quad stays only as the
   highlight's and the surge's glow. Test 12 (exactly twelve) must still pass on both sizes; re-tune the ember
   halo if it does not.
3. **N0 is drawn by the node set too.** Its motes and its box body are drawn like any stack's. Task 3's ruling that
   they are not drawn twice is withdrawn by §12.1.
4. **The hand-over.** In zoom-out, `stage.motes` falls to 0 by the section's end, so the bike's motes give way to
   N0's own drawing. Change only zoom-out's `stage.motes` key in this task; Task 9 re-keys zoom-out's camera and
   timing.
   - Keep the reflow (`mech.reflow`) as it is.
   - At zoom-out's end, N0 should be indistinguishable from its neighbours at the same distance.

## Verification

- `npx tsc --noEmit -p .` and `npx vitest run`.
- The full e2e suite (`E2E_PORT=4199 npx playwright test`). Rebuild `dist/` first if a preview server is already
  on 4199. Never run `playwright install`.
- Purity, parity, clearance, and tests 11 and 12 must all pass.
- Add a test that a plain stack's body at a wide shot is not a disc. One way: at N9, a lone plain stack's lit
  pixels fill its projected box hull and not the hull's circumscribed circle. Choose a measure that would fail on
  the old round glow.
- Report the new instance and triangle counts against `drawStats()`.

## Look, phone first

Capture these into `shots/act2-cubes/` at 390×844, then at 1440×900:
- every Act II beat's midpoint;
- `phone-sheet.png`, made with `montage`;
- a before/after pair at zoom-out's end and at ly-5 (N9).

Use a temporary script under `shots/`, then delete it. In the report, say plainly: do the stacks read as little
brick stacks at the wide shots, and is N0 indistinguishable from its neighbours at zoom-out's end?

## Commits and report

- Commit in logical commits. Commit messages must be publication-safe.
- Report to task-8-report.md in this folder.
- Return only status, commits, a one-line test summary, and concerns.
