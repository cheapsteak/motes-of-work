# Act II, final whole-branch review (d34fd70..d609556)

Reviewer: read-only, broad view across the seven tasks. Inputs: design §3–§11 (incl. both "As built"
notes), repo CLAUDE.md, global-constraints.md, progress.md (rulings), `git log` / `git diff --stat`
d34fd70..d609556 (36 commits, 86 files, +8.5k/−0.3k), then the code at each named risk.

What I ran or measured (nothing in the repo changed):

| Check | Result |
|---|---|
| `npx vitest run` at d609556 | 67 files, 1523 tests, all pass |
| Scratch probe (scratchpad only): network size at the essay seed | 346 stacks, 350 streams, 75,877 motes at the desktop budget (22,528 at a 30k budget), 4,997 stream dots + 34 feed dots, 346 halos |
| Scratch probe: page-load cost of the network (Node, fast desktop CPU, 3 runs) | `generateNetwork` 80–115 ms, `buildNodeAttrs` 53–120 ms, `packNodeData` + `nodeInstancedAttributes` 228–294 ms: about 0.36–0.53 s on the main thread |
| Impurity sources in the new code (`Math.random`, clocks, rAF, module `let`) | none; the one module `let` is netShots' memo of the essay network (tooling only) |
| Publication-safe scan of the diff, the Act II copy and all 36 commit messages | no employer, product, person, issue number or internal path in code, copy or message bodies (see Minor 12 for trailers and authorship) |
| e2e | not run (it builds `dist/`); the ledger records 143 pass at d609556, and the task 7 review verified determinism under the pinned SwiftShader |

## Cross-task interfaces, checked

- **Generator ↔ renderer.** `Network` → `packNodeData` → two RGBA32F textures read by `node.glsl` and by
  `node.ts` from the same Float32Arrays; edge T3 carries the parent radius and the child's fixAt
  that `node()` and `stream.vert.glsl` need; `NODE_NEVER` and hop −1 are the shared sentinels. The
  layout is independent of the budget (tested, generate.test.ts:104), so `essayNetwork()` (netShots,
  desktop budget), `e2e/machine.ts` (budget 8000) and `main.ts` (`?n=`) all see the same stacks.
- **Generator ↔ reflow.** `firstStack()` is the one source: `stack.ts` freezes it to float32 and
  splices it into `mote.glsl`; the network's N0 uses the same cluster at the origin; reflow.test.ts
  holds the corners of the drawn boxes to the stack the motes land on.
- **Schedule ↔ keyframes.** `G_TWELVE`, `CLEAN_AFTER`, `REVIEWER_KEYS`, `RING_OUT`, `HI_OUT` are
  exported once from `schedule.ts`, imported by the generator and fenced against `keyframes.json` in
  networkKeys.test.ts. No copied constant.
- **Text engine `out=` ↔ stops ↔ e2e.** `pageOut()` in reveal.ts drives the loader check, page
  opacity, the markup's `data-out` and the stop planner (`early`); the plan test pins up-1's stop
  before the wordless second fix and none inside it.
- **Shots ↔ rig.** `cameraRig.ts` untouched; `cameraSpline.ts` is the one spline for Act I's lap and
  Act II's moves; every pasted move regenerates to 1e-3.
- **Mirror pairs.** `mote.glsl` ↔ `mote.ts` (reflow cases in parity) and `node.glsl` ↔ `node.ts`
  (eight parity cases over builders, crack faces, person motes, the highlight, surge and hidden) are
  fenced on the GPU, with their constants spliced from one TS source and declaration tests. Streams
  and halos are only partly fenced (Minor 3–4).
- **Act I.** Every keyframe hunk sits in an Act II section or after `spec@0.9`; `mote()` at reflow 0
  is byte-identical on Act I's golden states (reflow.test.ts); `mote.frag.glsl`'s ember mix is
  guarded by `vHi > 0.0` and the bike writes 0; the far plane 100 → 400 moves no pixel (nothing
  writes depth). Two Act I-side edits, both deliberate: `shots.ts`'s lap now calls the shared spline
  (same easing formula, regenerates to 1e-3), and the Act I design gained the `out=` paragraph.

## Critical

None.

## Important

1. **Every reader pays for the network at load, and a phone draws the desktop's full Act II.**
   `src/main.ts:148-151` builds the network synchronously during startup, before the first frame,
   for every reader on every device, including one who never scrolls past Act I. Measured in Node on
   a fast desktop CPU, generation plus attribute building plus packing takes 0.36–0.53 s of main
   thread, and `nodeInstancedAttributes` (`src/scene/node/nodeLayout.ts:83`) allocates a `flatMap`
   array per mote per attribute (76k × 6). A phone is several times slower than that. Through all of
   Act II the phone then vertex-shades about 100k bike motes (`moteBudget` takes no device input,
   `src/main.ts:58-61`), which the design's own lever does not cover because the bike *is* the first
   stack (`stage.motes` 0.05 to the end, `keyframes.json:1224`). On top of that come 76k node motes,
   5k stream dots and 346 halos, every frame. The ledger records "real-phone perf" as open, but the
   load-time cost is new and is paid in Act I too. Cheap fixes that do not depend on a phone
   measurement:
   - build the network lazily, on idle or as the reader nears zoom-out (it is pure, so building it
     later changes no frame), and pack the attributes straight into the typed arrays;
   - give the bike a reduced instance count once the reflow has landed, or a phone budget tier.

2. **Two e2e files hard-code the essay's length, and the author's next step is to trim it.**
   `e2e/reducedMotion.spec.ts:19` opens `p=0.381`, which is "spec@0.927 of the 49.4 screens".
   `e2e/purity.spec.ts:9` scales its three points by the literals `21.6 / 49.4`. Trimming Act II
   (ledger: "start with the full 30, trim later") silently moves both samples onto other frames. The
   reduced-motion check needs a settled, built machine, so it can start to flake or fail for a reason
   unrelated to what it guards. The same files already read spans from the page (`sectionProgress`
   in purity.spec.ts), so derive both from `spec`'s span instead.

## Minor

1. **The yaw rotation is copied four times**, in the same convention: `src/network/cluster.ts:79`
   (`turn`), `src/scene/node/crack.ts:56`, `src/scene/node/nodeAttrs.ts:35`, `src/scene/mote/mote.ts:55`
   (`turned`), plus the GLSL `moteStackTurn`. The comments say "cluster.ts's convention", but no test
   holds the copies together. Export one from cluster.ts.
2. **Other helpers copied rather than imported.**
   - Box area: `cluster.ts:99`, `nodeAttrs.ts:32`, `stack.ts:30`.
   - Float-literal writers with different rules: `stack.ts:70` (nine digits, float32) and
     `birth.ts:110` (`String(v)`).
   - Layer rank: `nodeData.ts:23` `LAYER_INDEX` and `generate.ts:500` `rank`.
   - `<section>@<local>` parsing in four places (`keyframeSampler.ts:46` is the canonical one, then
     `netShots.ts:318`, `netShots.test.ts:183`, `e2e/network.spec.ts:133`).
   - `pageOut()` re-derived inline in three e2e readers (`e2e/clearance.spec.ts:68`,
     `e2e/pages.spec.ts:61`, `e2e/shots.spec.ts:30`), when e2e already imports from `src/story/reveal`.
   - `generate.ts:401` names `'R1'` as a literal beside the `SOURCE` constant.
3. **The stream mirror is fenced by one regex.** `src/scene/node/stream.test.ts:22` holds the shader's
   `u` line to `stream.ts`. The Bezier position, and the feed's control point (built in
   `stream.vert.glsl` from a cross product with +y, with `FEED_BOW = 0.12` copying `STREAM_BOW` from
   `generate.ts:64`), have no TypeScript twin or test. The risk is low, since only the direction test
   reads dot positions, but this is the one "mirror pair" the parity page does not cover.
4. **Constants and functions the parity page never runs.**
   - `EMBER` and `AGENT` appear in both `halo.vert.glsl:33-34` and `mote.frag.glsl:15-17`, and no
     test holds the copies together.
   - The halo has no TypeScript twin at all (its `bornFrac` repeats generate.ts's `bornFrac`).
   - `node.glsl`'s `nodeNearGain` (node.glsl:39-43) is called only from `node.vert.glsl`, so parity
     never exercises it. Only the TS twin is tested.
5. **The clearance measure ignores halos** (`e2e/machine.ts` `visibleNetwork`). A lit halo is 1.0–1.2×
   a stack's bounding radius, which for a rule reaches about 1.2 units above its top course. Its rim
   is faint (alpha 0 at the edge) and the 0.15-of-the-screen cap bounds it, so this is a gap, not a
   known failure. Design test 14 counts only motes, so this is a design gap as much as a test gap.
6. **The clearance sampling is sparse for big cubes near the camera.** Network points off the top of
   the screen are dropped (`machine.ts` `project(network, false)`), and the network is sampled at
   budget 8000. A rule cube close to the camera could have its corners above the frame and below the
   band, with few sampled motes between. That would pass while its face crosses the band. It is an
   edge case at today's rule close-ups (distance 12).
7. **The `early` flag marks every beat of a page with `out=`, not just its last scene**
   (`src/autoAdvance/plan.ts:166,175`). This is harmless today, because up-1 is a one-beat page. A
   future multi-beat page with an `out` would also stop its earlier beats from waiting for motion.
8. **Two invariants rest on comments.** The warm-speckle fade (provenance.vibed under zo-2) relies on
   the vibed scenario's visibility matching the specced one (`attributes.ts:86`, cited in a comment
   at `keyframes.test.ts:571`). The design's "no second code path" for reduced motion in Act II is
   true (no network shader reads the shimmer), but no e2e sample covers it: the reduced-motion page
   samples Act I only. One assertion each would pin them.
9. **Test 12 and test 11 are close to their limits** (recorded in design §11 "Tests as built" and in the
   task 7 review). The smallest phone ember shape is 36 px against the 30 px floor. Under the pinned
   SwiftShader they are deterministic, but a Chromium or SwiftShader bump or any change to the look
   can flip them. Treat a failure there as a signal to look at the picture, not to retune the
   threshold.
10. **Small per-frame allocations** in `nodeSystem.update`: `new Vector3()` for the eye, and the arrays
    `ringAt` returns. These match the mote system's existing pattern and are negligible next to
    Important 1.
11. **Exports used only internally or by tests**: `SPACING`, `COPY_REACH`, `PARENT_REACH`, `HERO_YAW`,
    `RING_ALPHA` and `splineShot`. They document tuning knobs, so this is not dead code; nothing in
    the branch is unreachable.
12. **The publication-safe checks themselves.**
    - The local content denylist (`content-denylist.local.txt`) is empty in this checkout, so
      `src/story/content.test.ts:155` passes vacuously here.
    - 20 of 36 commits carry the dispatch's session-URL trailer, which names a product's domain, and
      every commit's author metadata is the agent's company address. Both are repo-wide and
      pre-existing, not Act II's doing, but they are worth the author's look before the repository is
      published (the ledger already records the refusal to rewrite history).

## Verdict

**Approved for the author's look, with two Important follow-ups.** No Critical findings.

The seven tasks join cleanly:
- The schedule, the first stack and the birth constants each have one source, and the keyframes,
  both mirrors and the tests import from it.
- The `out=` engine change reaches every reader that needs it.
- Every Act II frame is a function of the six scalars, `clock`, the camera and static buffers. The
  network is generated once, and nothing is integrated.
- `mote()` and `node()` are fenced on the GPU. Act I is untouched in pixels and semantics.

Before trimming, fix Important 2: it is a one-line change per file. Before a phone audience, fix
Important 1: build the network lazily and cap the bike's draw. The Minors are consolidation:
- export one `turn` and one box area;
- share `pageOut` and the `@` parser with e2e;
- add a stream/halo twin, or a constants fence for the copied colours.
