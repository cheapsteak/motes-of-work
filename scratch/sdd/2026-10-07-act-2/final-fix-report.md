# Act II, final review fixes (d609556..43d4183)

Input: final-review.md (two Important, twelve Minor). No subagents; eight commits on main, not
pushed.

## Commits

| Commit | What |
|---|---|
| 8faa857 | node: pack the motes' attributes straight into their typed arrays |
| 31e7031 | main: build the network after the first frame, not before it |
| 21a3f97 | e2e: the purity and reduced-motion samples follow the section spans |
| 6ab3119 | network: one yaw turn and one box area, exported from cluster.ts |
| 0e81f22 | network: one layer rank, and the agent's rule named beside the source |
| 74d3724 | timeline: one parser of a section-local position |
| 2ad6fcb | e2e: the page readers take a page's out from pageOut |
| 43d4183 | node: reuse one vector for the camera's position each frame |

## Important 1: load cost

**Packing.** `nodeInstancedAttributes` (nodeLayout.ts) wrote a `flatMap` array per mote per
attribute. It now writes each field straight into the attribute's Float32Array, field by field,
and still reads the layout from `NODE_ATTRIBUTES`. A new unit test (nodeSystem.test.ts) holds about
a thousand sampled motes, plus the last one, to their own fields as float32.

**Lazy build** (main.ts). The network is not built before the first frame any more. It goes into
an unnamed `Group` slot that is added to the scene at startup, where the network used to be added,
so the scene's order does not depend on when the network is built. `drawStats` skips unnamed
objects. Then `ensureNetwork()` builds it:
- when the browser is first idle after the first frame (`requestIdleCallback`; without it,
  `setTimeout` 1 s);
- when the scroll reaches `NETWORK_LEAD`, the start of the section before the first section whose
  end shows the network. It is derived from the sampler and is spec.start today;
- at the latest, inside `draw()` whenever `state.net.show > 0`. The frame waits for the build and
  does not draw a different picture.

Why this keeps frames pure: `nodeSystem.update` sets `group.visible = show > 0` and returns
straight away when `show` is 0, so a frame with no network and a frame with an unshown network are
the same. Render order does not change either. The network's meshes are still created after the
bike's motes, so the bike keeps the lower object ids. Ink sorts by its own negative renderOrder,
so the network's later ids cannot change its place.

A `?p=` jump into Act II builds the network before the first frame: the scroll driver's first
callback is past the lead, and `draw` also checks. A new test hook, `networkBuiltAt()`, records the
frame count at build time. A new e2e test (network.spec.ts, "the network is built lazily") holds
two cases on a phone: in Act I the network is built at frame 1 or later, and at `layers@0.5` it is
built at frame 0 and `net-nodes` is drawn. The purity spec checks that frames do not depend on when
the build ran: a jumped page builds at once, a scrolled page builds on idle or at the lead, and the
two must render byte-equal pixels. That spec passes across all eight Act II samples.

**Build time** (Node, the desktop budget of 75,877 motes, six runs in one process, measured on an
idle machine). The old packer is kept in the scratch bench, so both packers ran on the same motes:

| | old | new |
|---|---|---|
| packer (`nodeInstancedAttributes`) | 210–330 ms | 22–48 ms |
| generate + createNodeSystem (whole build) | ~350–520 ms | ~165–250 ms |
| main-thread cost before the first frame (Act I reader) | the whole build | 0 |

What remains is `generateNetwork` at 70–145 ms and `buildNodeAttrs` at 40–160 ms (the first run is
cold). Both now run off the first frame. As instructed, I added no phone tier and did not reduce
the bike's count.

## Important 2: hard-coded essay length in e2e

- `purity.spec.ts`: the three essay points are now fractions (0.12, 0.41, 0.88) of the way to the
  zoom-out's end, read from the page's spans and rounded to 1e-4 as the old scaled literals were.
  The "not vacuous" test reads them the same way.
- `reducedMotion.spec.ts`: the page first loads to read the spans, then opens spec@0.927, rounded to
  1e-3 as the old literal was.
- Verified against today's spans: the derived values are 0.0525, 0.1793 and 0.3848 (the old ones
  exactly) and 0.381 (the old literal exactly), so both specs open the same progress and land on
  the same frames. Trimming Act II now moves each value with its section.

## Minors

Taken:
- **1 (yaw turn).** `turnYaw(p, a)` and `turnYawCs(p, c, s)` are exported from cluster.ts.
  cluster.ts, crack.ts, nodeAttrs.ts and mote.ts use them. mote.ts passes the first stack's float32
  (cos, sin), as `mote.glsl` does. The arithmetic is term for term the same, and parity passes.
  Only a comment changed in `mote.glsl`. A cluster test pins the convention: a quarter turn takes
  +x to -z, and `turnYaw` equals `turnYawCs` bit for bit. The test oracles in reflow.test.ts,
  node.test.ts and crack.test.ts keep their own copies on purpose, as independent references.
- **2 (copies):**
  - box area: `boxArea` is exported from cluster.ts and used by nodeAttrs.ts and stack.ts;
  - layer rank: `LAYER_RANK` lives in generate.ts, and nodeData.ts packs it (`LAYER_INDEX` is gone);
  - `'R1'`: lineage.ts names it `AGENT_RULE`;
  - `<section>@<local>`: keyframeSampler.ts exports `splitSectionAt` and `progressOfSectionAt`,
    which netShots.ts, netShots.test.ts and e2e/network.spec.ts use, with a unit test;
  - `pageOut`: clearance.spec.ts, pages.spec.ts and shots.spec.ts now call reveal.ts's `pageOut`.
    shots.spec.ts reads the DOM in the page and computes in Node. It only runs under SHOTS=1, so
    it typechecks but was not run.
- **10.** The node system reuses one `Vector3` for the camera position. `ringAt`'s arrays are left
  as they are.

Left:
- **2, float-literal writers.** `stack.ts` writes float32 values exactly in nine digits; `birth.ts`
  writes hand-chosen decimals readably (`String(v)`). The two rules serve different inputs, and
  merging them would rewrite the spliced node constants' text.
- **3–4.** Stream and halo parity, and the `EMBER`/`AGENT` colour fence.
- **5–6.** The clearance-measure gaps (halos, sparse sampling near the camera).
- **7.** The `early` flag on a multi-beat page. Harmless today, and it changes planner behaviour.
- **8.** The comment-only invariants: the warm-speckle fade, and reduced motion in Act II.
- **9.** Tests 11 and 12 near their limits. This is a watch note; there is nothing to change.
- **11.** The exported tuning knobs.
- **12.** Commit metadata. No history was rewritten.

## Tests

- `npx tsc --noEmit -p .`: clean.
- `npx vitest run`: 67 files, 1528 tests, all pass. That is 1523 before, plus the packer test, the
  turn/area tests and the parser test.
- Full e2e (`E2E_PORT=4199`, dist/ rebuilt first): 144 passed, 9 skipped (the SHOTS-gated captures),
  24.5 min. That is the 143 from before plus the lazy-build test. Parity, purity, reduced motion,
  network, clearance and pages are all green.

## Concerns

- **Commit trailers.** These eight commits carry no session-URL trailer. The dispatch asked for
  publication-safe messages and gave no trailer line, and the review flags that URL as naming a
  product's domain. Earlier commits on the branch carry it; the author may want one rule for all.
- **Build timing on a phone.** On a phone the build moves off the first frame but still costs
  roughly 0.5–1 s of main thread when it runs. On idle that is usually during the first line's
  hold. If the reader is scrolling continuously and idle never fires, it runs at the lead (the
  start of spec), which can be a visible hitch mid-scroll. Generation is not chunked. If a
  real-phone measurement shows the hitch, chunking `generateNetwork` across idle slices or moving
  it to a worker is the next lever.
- **Shader compile.** The network's shader compile and GPU upload still happen on the first frame
  that shows it, as before. They are not part of this change.
- **Formatting warnings.** An editor hook reported prettier warnings on edited files. The repo has
  no prettier config or dependency, so I left them.
