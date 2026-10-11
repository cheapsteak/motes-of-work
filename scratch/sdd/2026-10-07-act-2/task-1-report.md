# Act II, Task 1 report: the network generator and the schedule

Status: DONE_WITH_CONCERNS. Branch main, base d34fd70, commits 13de044..abc2b7d (three), not pushed.

## What I built

`src/network/`, pure TypeScript with no renderer, deterministic from a seed (one `mulberry32(pcg(seed ^ salt))` stream per concern and per stack: births, parents, positions, sizes, yaws, bows). The budget only sets mote counts, never the layout (tested).

### Exports later tasks use

- **`cluster.ts`**
  - `buildCluster(cubes, u, yaw, centre, rng): Cluster`: the brick-bond stack. Its fields are `boxes: Box[]`, where `Box` is `{centre, size, yaw, course}` in world units with yaw about +y through the box centre; `crackBox` (the crack site: top course, frontmost brick toward +z); `radius` (bounding, about the centre); `height` (the stack spans centre.y ± height/2); and `area`.
  - `firstStack()`: N0's six boxes at the origin, from `FIRST_STACK = {cubes: 6, unit: 0.42, seed}`. It is independent of any network seed. Each box carries its own small `yaw` (the course yaw, about ±0.06 rad), so **task 2's `moteStackRest` must rotate by box yaw**, not treat the boxes as axis-aligned.
  - Also exported: `boxCorners`, `courseWidths`, `COURSES`, `BRICK`.
- **`generate.ts`**
  - `generateNetwork(seed, budget): Network`, where `Network` is `{nodes, edges, feed, visits, schedule, ids, motes, seed, budget}`. `nodes` are in birth order.
  - `Node` extends `Cluster` with: `index, id, alias?, layer ('code'|'plan'|'rule'), scripted, parents (indices, main first), born, dur, cracked, hero, hiAt|null, fixAt|null, hop|null, centre, yaw, unit, cubes, stream (main edge index|null), spawn, spawnRadius, motes, personMotes, glow`.
  - `Edge` is `{from, to, kind ('down'|'side'|'up'), a, b, c, born, hiAt|null, hop|null}`.
  - `Feed` is `{from: R0, a: R0's foot, hop: 1}`.
  - `nodeIndex(net, id)` (resolves aliases such as C19 → V3) and `bornFrac(node, growth)` (the halo's).
  - Constants: `NETWORK_BUDGET` (76,000), `networkBudget(moteBudget)`, `LAYERS`, `PERSON_SHARE`, `PERSON_MIN`, `HERO_PERSON_MOTES`, `SPACING`, `COPY_REACH`, `COPY_SHARE`, `REUSE_SHARE`, `STREAM_BOW`, `HERO_YAW`, `PARENT_REACH`.
- **`lineage.ts`**: `LINEAGE` (the scripted table as data), `SOURCE`, `FIRST`, `OWN_FIXES`. Whether a stack is cracked is derived from this table, never stored in it.
- **`schedule.ts`**
  - Constants: `G_TWELVE`, `TWELVE` (in light order), `HI_TWELVE` 0.25, `FIX_TWELVE` 0.10, `CLEAN_AFTER` 0.665, `CLEAN_WORK_FROM` 0.70, `HI_AT_BIRTH` 0.30, `SWEEP` [0.64, 0.94], `REVIEW_VISITS`.
  - `REVIEWER_KEYS`: the reviewer section's designed review and growth keys from §2.6. Task 6's keyframes must match them.
  - Helpers: `atKeys`, `whenKeys`.
- **`review.ts`**: `ringAt(review, visits) → {position, radius, presence, along}`, `visitHold(j, n)`, `feedAlpha(review)`, `RING`.

### Rulings applied (§11)

- **The second fix visits C5.** C5 is now a hero (4k motes), takes the place designed for the second fix (−12, 0, 3), and has fixAt 0.18. It stays one of the twelve, lit at df-5. C12 becomes a plain stack, placed near P2, and joins the sweep.
- **No highlight before the defect is found.** Every `hiAt` is > 0. Nothing in the generator lights on its own; the timing belongs to the keyframes.
- **The surge keeps the loop path.** There is no rule-to-rule stream; R1 is reached through C7's up-stream.

## Numbers I changed from the design, and why

1. **P_a born 0.03, not 0.02.** The design's own rule is child.born ≥ parent.born + 0.5·dur, and R_a is only half built at 0.03. zo-1 still ends with both born.
2. **C8 born 0.325, not 0.32.** Same rule: P3 (born 0.31) is half built at 0.325.
3. **Hop-2 sweep renumbered after the ruling.** C5's sweep slot is gone and C12 needs one. In birth order: C8 0.78, C6 0.79, C10 0.80, C11 0.81, C12 0.82. The rest are unchanged.
4. **C27–C32 births** are 0.715, 0.722, 0.73 (from P7) and 0.736, 0.743, 0.75 (from Q3). The design gave only "0.71–0.75", and P7 is not half built until 0.715.
5. **Stack sizes.** I kept the design's bricks (u·1.1–1.6 × 0.6u × 0.8u, one row along x) and its course rows for 6, 10 and 18. With those, the measured radii are code 0.93–0.99, plans 1.8–2.0, rules 4.0–4.8. The design says about 1.4 for plans and 2.4 for rules: those match 2.15·u, as if every stack had the six-cube shape scaled. So for plans and rules the design's bricks and its radii cannot both hold. I wrote the other course rows no wider at the base than the design's (3 / 4 / 5) to keep radii down. Knock-on effects:
   - **Plan extent 18, not 16.** At radius ~2, forty plans do not fit within 16 at 1.1× spacing (the generator threw).
   - **Designed places are moved apart where they crowd.** Moved by: R_b 1.50, R_c 0.99, R1 0.96, R_d 0.49, P3 0.87, P5 1.56, P6 0.13, Q3 1.37. Shots resolve node ids, so they follow.
   - **The V cluster's draw radius is 4.5** round (4, 0, 10).
   - **The levers, if the author wants the design's radii:** the cube units (0.65 / 1.10) or two-deep courses. Either changes the look.
6. **The up-stream climbs two layers.** Test 2's wording says the up-stream is "one layer down". C7 is code and R1 is a rule, so I tested code → rule.
7. **`hop` and stream lights are defined only along cracked stacks.** A clean node's hop is null, and a stream lights only when both ends are cracked. Otherwise P7 (hop 1 from R0) would light in the surge, which is still held at 1 under fx-3's correct new work.

## Rules I had to invent (the design is silent)

- **Filler born at or before G_TWELVE[1] (0.36) draws only clean parents.** Otherwise more than twelve defects would exist at df-5.
- **Between CLEAN_AFTER and CLEAN_WORK_FROM (0.665–0.70), nothing new is built from R0 or R1.** This keeps P7 as the first clean work (test 5's intent).
- **Filler births** follow n(g) minus the scripted count (running maximum), each drawn at a random point in its slot. None is born before its layer has a half-built parent (code 0.045, plans 0.03).
- **Parent choice.** Weight is exp(−d/6) to a random spot in the layer's disc, times age for a layer above. A parent with no room left within its reach is passed over; if every parent is full, the child goes to the first choice and the search radius widens.
- **Sweep for filler.** Each run of filler between two scripted anchors in (plans first, hop, born) order is spaced evenly between the anchors' fixAt values.
- **Mote budget.** Heroes scale as budget/76,000. Plain stacks share the rest by one factor (bisection, largest that fits). Person sets are 6%, never fewer than 24, unless the budget cannot hold even that. Glow = refDensity/density, with refDensity taken from the plain code stacks.
- **Stream ends.** Down: parent foot → child head. Up: parent top → child foot. Side: the point on the parent's radius facing the child → child head. A rule nothing built spawns 3 radii above itself. N0's stream comes up at 0.045, when P_a is half built.

## Tests and results

- `npx tsc --noEmit -p .`: clean.
- `npx vitest run src/network`: 146 passed, covering test 2 (generator), test 7 (review), cluster, schedule helpers, and invariants across seeds 2–6.
- Full `npx vitest run`: 1108 passed, 2 failed. The failures are `src/mechanisms/continuity.test.ts` (strandbeest, vibe-build and spec sections), and both are **5 s timeouts** (5.2–5.7 s). That file imports nothing from `src/network/`, and this task only added files, so they predate this work; they are slow on this 4-core box.

TDD evidence:
- **cluster:** RED was `npx vitest run src/network` failing on the missing `./cluster` module (no tests). GREEN: 37 passed.
- **review:** RED was the missing `./review` module. GREEN: 15 passed.
- **generator:** I wrote the test before the code, but first ran it with the implementation in place. That first run failed with "no room for plan-28", then on the sweep start, then on three real design inconsistencies (items 1, 5 and 6 above). I fixed each, and the run went green at 86, then 128 with the seed sweep.

## Self-review

- I removed dead code (an unused map and field) and deleted all temporary probe tests.
- Copy is publication-safe: no names in code or commits.
- The prettier hook warned on every file. Prettier is not a project dependency and there is no config, so I matched the house style by eye (lines up to about 170 wide, as in the existing code).

## Concerns

1. **The bottom layer is near full.** 300 stacks of radius ~1 at 1.1× spacing need about 1,700 square units, more than the discs "within 4 of a plan" cover. Only about half the filler code lands within reach of its plan (median about at the reach, 90th percentile about 9 units beyond). The rest sit at the nearest free room, which gives longer streams. Tested as: at least 40% within reach, all within reach + 25, copies always within 3.
2. **Lit count at up-2 is 41–47 across seeds, not "about twenty-four".** The scripted stacks alone give 24, and filler built from cracked parents adds the rest. The lever is a weight against cracked parents for filler. The twelve at df-5 are exact.
3. **Notes for task 3's surge.**
   - Some seeds have a hop-7 node (a copy of hop-6 code; none for seed 1). The §3.4 surge formula only completes hops 0–6 by highlight 1, so the formula may want to clamp hop at 6.
   - As written in §3.4, the surge is not multiplied by (1 − fix). Fixed stacks (C1, C5, and then the sweep) would stay surge-lit until highlight drops at fix 0.90–0.98.
4. **Generation takes about 70–110 ms in Node**, likely more on a phone. Task 3 should generate once and keep the result.
5. **Stacks born near g = 1 are not finished building when the act ends** (growth stops at 1.00).

Files:
- /home/user/motes-of-work/src/network/cluster.ts and cluster.test.ts
- /home/user/motes-of-work/src/network/generate.ts and generate.test.ts
- /home/user/motes-of-work/src/network/lineage.ts
- /home/user/motes-of-work/src/network/schedule.ts and schedule.test.ts
- /home/user/motes-of-work/src/network/review.ts and review.test.ts
