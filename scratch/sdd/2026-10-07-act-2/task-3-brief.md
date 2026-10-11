# Act II, Task 3: the node set (the network, drawn)

Repo /home/user/motes-of-work, branch main; commit there, do not push. First read global-constraints.md and
implementer-instructions.md in this folder, and the repo's CLAUDE.md (phone first, pure function of scroll).

**Requirements:** docs/specs/2026-10-06-act-2-storyboard-and-network.md. Read it whole once; §3.3 to §3.8, §3.10, §5
and §6 (tests 3 and 15) are yours. Build exactly §7 task 3:

> The node set. `node.glsl` / `node.ts` / `birth.ts`, `nodeLayout.ts`, `nodeSystem.ts` with its five meshes and two
> textures, the parity mode, `main.ts` wiring, `machine.ts`; tests 3 and 15's parity. Viewable with `?state=`
> overrides of the six scalars before any keyframes exist.

Apply §11's rulings. In particular, nothing is highlighted before the defect is found, and the surge keeps the loop
path.

**What earlier tasks gave you** (all on main):
- **Task 1, `src/network/`:**
  - `generateNetwork(seed, budget)` returns `{nodes, edges, feed, visits, schedule, ...}`. Nodes are in birth order.
    Each node has `boxes`, `crackBox`, `born`, `dur`, `cracked`, `hiAt`, `fixAt`, `hop`, `motes`, `personMotes`,
    `glow`, `spawn`, `stream`.
  - Also from Task 1: `nodeIndex`, `bornFrac`, `NETWORK_BUDGET` / `networkBudget(moteBudget)`, `ringAt` /
    `feedAlpha` / `RING` (review.ts), and `boxCorners` (cluster.ts, the yaw convention, about +y through the box
    centre).
  - The task 1 report is task-1-report.md in this folder. Read its "Exports" and "Concerns".
- **Task 2:**
  - The six SceneState leaves exist: `mech.reflow`, `net.show`, `net.growth`, `net.fix`, `net.highlight` and
    `net.review`.
  - The zoom-out section is keyed for `net.show` and `net.growth`, and `clock` runs from zoom-out on.
  - The reflow lands the bike's motes on `firstStack()`. N0 in the network is that same stack, already drawn by the
    bike's motes, so **do not draw N0's cubes a second time** (do draw its streams and its halo, per the design).
  - The spliced-constants pattern for GLSL ↔ TS (`src/scene/mote/stack.ts` → `shaderSource.ts`) is the model to
    follow for the node mirror's constants.
- **Test infrastructure:** the parity page (`src/parity/`, `e2e/parity.spec.ts`) and `e2e/machine.ts`'s
  `visibleMachine` are how mirrors and the clearance test see motes; extend them as §5 says.

**Rulings from the controller** (decisions; follow them):
1. **Clamp the surge's hop at 6.** Task 1 found that some seeds have a hop-7 node, and §3.4's surge only completes
   hops 0–6.
2. **Multiply the surge by (1 − fixed).** A rebuilt stack goes out at its fix, as its highlight does; it does not
   stay surge-lit until the highlight clock drops.
3. **Generate the network once per page load** and keep it; generation takes about 100 ms. The essay's seed is the
   existing `MOTE_SEED` unless the design names another.
4. **Mote budget on a phone:** follow the existing mote system's phone budget mechanism, if there is one; the design
   gives `networkBudget(moteBudget)`. Report the instance counts on both sizes.
5. **No WebGL, and reduced motion:** honour §3.10.

**Verification:**
- `npx tsc --noEmit -p .`
- `npx vitest run`
- the full e2e suite (`E2E_PORT=4199 npx playwright test`; never `playwright install`)
- **Look at frames, phone first** (390×844, then 1440×900), using `?test=1&state=` overrides of the six scalars at
  the zoom-out section's end and at a wide network shot. Save stills to `shots/act2-nodes/` (gitignored); use a
  temporary script under `shots/`, then delete it. The states to capture:
  - growth 0.12 (the end of zoom-out);
  - growth 0.36 with highlight 0.25 and fix 0 (the twelve lit);
  - growth 0.36 with fix 0 versus fix 1, close on a cracked stack (the crack visible, then gone);
  - growth 1 with show 1.

  In the report, say what each still shows, and whether anything enters the text band on the phone.

**Commits:** in logical commits; the node mirror pair (`node.glsl` and `node.ts`) changes only in one commit
together.

**Report** to task-3-report.md in this folder. Include what you exported, any number you changed from the design
and why, the instance counts, and the still paths. Return only status, commits, a one-line test summary, and
concerns.
