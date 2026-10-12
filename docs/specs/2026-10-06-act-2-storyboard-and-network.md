# Act II: storyboard, and the network scene

*Status: design for implementation. Date: 2026-10-06. The words are docs/script/act-2.md (draft 3,
reviewed line by line by the author; treated as fixed here). The agreed shape is
docs/specs/2026-10-05-act-2-wrong-guidance.md (three layers, flows, the hairline crack, the six beats).
The engine it is built on is Act I's: the text engine and the camera conventions of
docs/specs/2026-10-04-act-1-storyboard-and-text-engine.md (§2, §3), the mote system as built in
docs/specs/2026-10-05-act-1-build-and-orbit.md (settle windows, the landing flare, the generated lap),
and the node spike in the throwaway worktree (`src/mechanisms/nodes/`, shots `far.png` / `near.png`),
whose one lesson is carried over: a plain gap is invisible even up close because the cloud is
see-through, so the crack is drawn by motes sitting on the crack's own faces.*

## 0. The shape in one paragraph

Act II is nine sections and 28.508 screens (thirty when first drawn). The riding bike's hundred thousand motes reflow, point for
point, into a small stack of cubes at the world origin, and a network of such stacks grows out of the
dark around and above it: a few big slow stacks at the top, more and smaller in the middle, many small
quick ones at the bottom, joined by streams of drifting dots that run downward. Every stack is built
by its own motes flying in along its stream, cube by cube, each cube's landing a birth window on a
single growth clock, so growth is a pure function of scroll like everything else. One top stack has a
hairline crack in one cube; every stack built from it has one too; the crack is motes on two jagged
faces, invisible past a dozen radii and a bright line at two. The reader dives to one cracked code
stack, warm motes rebuild it, the camera steps back and an ember highlight counts out twelve more; a
thin stream climbs to the top and a second cracked rule forms; new ones keep coming (the second fix that
was lost among them is deleted, 2026-10-09); a
ring of cool light reviews new stacks and passes the cracked ones because its own stream comes from the
same rule; the camera climbs the lit lineage to the source, the source's streams surge outward, the
person rebuilds both rules, new work comes out clean, a sweep rebuilds the rest top to bottom, and the
camera settles above the top layer looking down. The prose names rules, plans, code, a defect and a
reviewer; the picture keeps stacks, streams, cracks, ember and warm motes to itself.

## 1. The copy

The words are the script's, unchanged. Ids are two letters and a number so the storyboard fence
(`src/story/storyboard.test.ts`) can parse them; every id is new (Act I owns `vb-`, `rv-`, `rw-`,
`sp-`). Word counts in brackets. This table is the fence's source for Act II's sections (§5): the
markdown in `src/story/` is the source of truth, this is the designed snapshot, and a change to either
fails the test until the other follows.

| Beat | Page | Text |
|---|---|---|
| zo-1 | 1 | Now let's zoom out. (4) |
| zo-2 | 1 | You want a hundred things built, and the agents build all day. (12) |
| ly-1 | 1 | Each piece of work is built from what its agent reads. (11) |
| ly-2 | 2 | At the centre, the rules every agent reads before it starts. (11) |
| ly-3 | 3 | Around them, the plans: the instructions for one piece of work. (11) |
| ly-4 | 4 | Out at the edge, the code, written from the plans. (10) |
| ly-5 | 5 | Rules shape plans, and plans shape code. (7) |
| fr-1 | 1 | From far away, everything looks right. (6) |
| df-1 | 1 | Come closer. Out here, one piece of code has a defect. (11) |
| df-2 | 1 | Up close, if you watch, you can see it. (9) |
| df-2b | 1 | So you fix it. (4) |
| df-3 | 2 | Now step back. (3) |
| df-4 | 2 | The agents kept building. Whatever is built on a defect carries it too. (13) |
| df-5 | 2 | Twelve new defects. You fixed one. (6) |
| up-1 | 1 | One agent wrote down what it built, so the next agent would know. Now the defect is in the rules too. (21) |
| up-2 | 2 | You cannot fix them one at a time as fast as they are made. (14) |
| re-1 | 1 | So you ask a reviewer to look at every new piece of work before it is kept. (17) |
| re-2 | 1 | The reviewer says they are all fine. (7) |
| re-3 | 1 | The reviewer read the same rule. (6) |
| tr-1 | 1 | Follow the defects back. (4) |
| tr-2 | 1 | They all lead to one place at the centre: one incorrect rule. (12) |
| fx-1 | 1 | Fix the rule. (3) |
| fx-2 | 1 | And fix the rule an agent wrote from it, or the defect will spread again. (15) |
| fx-3 | 1 | Now new work built from them is correct. (8) |
| fx-4 | 2 | Then trace everything built from the incorrect rule, and fix what it already made. (14) |
| ls-1 | 1 | The closer to the centre a thing sits, the longer you look at it. (14) |

253 words over 28.508 screens (8.9 a screen; the lint allows 35; script draft 4, Task 9: the copy table above is draft 4's, with df-2's two sentences as two beats, df-2 and df-2b). No beat over 26 words, no page over
three beats. Every line is true of what is on screen while it is up (§2 shows each one); none needs an
edit to be shown truthfully. Two readings to keep in mind: "a hundred things" (zo-2) is a figure of
speech and the picture shows about forty stacks by the end of its line and three hundred by the end
of the act; "invisible a moment ago" (df-1) is true of distance, not of state: the crack is in the
cube from its birth and nothing changes but how close the camera is.

**Words fence** (`src/story/content.test.ts`, a sibling of the Act I rule): Act II's narration uses no
colour or dot word (the Act I list) and none of the picture's own words: stack, stacks, cube, cubes,
stream, streams, crack, cracks, ring, glow; and, on the galaxy (draft 4), galaxy, planet, moon, star,
orbit, track and atom, singular or plural. It never says "system": draft 4's ly-6 ("All of it is one
system.") was its one use, and the author deleted it (2026-10-09: the word is ambiguous here), not to be
moved anywhere else. The alt text may use any of them.

**Alt text** (canvas descriptions, one per section; the stacks' design, kept as the record: the alt texts as built are re-cut to the galaxy in `src/story/`, following galaxy §14.6, Task 9):

- zoom-out: The riding bicycle's blue dots loosen and gather into a small stack of glowing cubes. More stacks appear in the dark around and above it, joined by thin streams of drifting dots.
- layers: A network of glowing stacks of cubes in three layers: a few large ones at the top, more and smaller in the middle, many small ones at the bottom, with streams of dots running down between them. The view visits each layer in turn, then pulls back to see all three.
- far: The whole network, three layers deep, seen from far away and slowly circled. Every stack has the same blue glow and more keep appearing.
- defect: The view dives to one small stack at the bottom. One of its cubes is split by a bright jagged line. Warm gold dots land on the cube and the line closes. The view pulls back; the network has grown; twelve stacks light up red-orange, spreading from one stack in the middle layer, and the mended one stays dark.
- spread: A thin stream of dots climbs from a lit stack at the bottom to the top layer, where a new large stack forms, lit red-orange. A quick dive mends a second stack; from far away the lit tree has grown and keeps growing, with the two mended stacks dark among many lit ones.
- reviewer: A small ring of pale light moves from one new stack to the next along the bottom layer, pausing on each, lit ones and unlit alike. A stream of dots runs down to the ring from a large stack at the top.
- trace: The view climbs the lit streams from the bottom through the middle to one large stack at the top, where a cube is split by a bright jagged line. The view pulls back and brightness surges out along every stream from that stack, down into the middle layer, to the ring, and up to the second lit stack at the top.
- fix: Warm gold dots land on the cracked cube of the large top stack and the line closes; the same for the second top stack. New streams leave both and new stacks form below with no lines in them. Then, from the top down, each lit stack is mended in turn and its light goes out.
- lesson: The network from just above its top layer: a few large stacks near, the whole network fanning out beneath them, every stack whole.

## 2. The storyboard

Conventions. Progress is **section-local** (0..1); `L` is the section's length in screens; a fade is
`0.1 / L` local. Camera shots are in the **network's own coordinates** (§3.9): world units, origin at
the first stack's centre (the bike's `CENTRE`, world (0, 0, 0)), y up; the three layers' centre lines
at y = 0, 7 and 14. A shot is a target (a node id from §3.2, a point, or `net` for the network's
framing centre (0, 10, 0): above its geometric centre, §3.9 says why), a bearing (degrees about y: 0 seen from +z, the side the key light is on; 90 from
+x), an elevation (degrees above level), a distance (world units), a vertical fov and `frame` (0 wide,
1 close; storyboard §2.6). `coreFocus` is 0 throughout Act II. The implementer converts each shot once
to the rig's machine-relative keys with `netShotKeys` (§3.9) and pins it with a test in network terms,
as `shots.test.ts` does in bike terms. The rows below give a camera's **starting values**; the
clearance test (§6, test 14) is the arbiter and moves a shot out or up where the network enters the
text band, exactly as Act I's shots were tuned.

Network scalars (§2.11): `net.growth` the growth clock (births are in its units, §3.2), `net.fix` the
fix clock, `net.highlight` the highlight clock, `net.review` the ring's visit, `net.show` the
network's presence, `mech.reflow` the bike's reflow, and the existing `clock` runs the streams. Growth
and `clock` never decrease and never hold for long: the network keeps growing under every line, which
is the point of the act.

### 2.1 zoom-out (L = 2.2, fade 0.04545)

| Beat | Page | Appears → leaves (local) | Camera | Motion while it is up |
|---|---|---|---|---|
| zo-1 | 1 | 0.00 → dims at 0.50 | S10′ (Act I's last shot, continuous) → N1 over 0.02–0.50 (inOutCubic). N1: target `N0` (the first stack), bearing 45, elev 12, d 9, fov 40, frame 0: the stack small and low under the text, the dark round it. | `mech.reflow` 0 → 1 over 0.04–0.40 (inOutCubic): the bike's motes puff outward and fall into the first stack's cubes (§4). `mech.drive` 1.4 → 1.9 over 0–0.40 (the wheels still turn as the bike loosens). `ink.opacity` 0.25 → 0 over 0–0.08 (the faint lines under the bike go). `stage.motes` 1 → 0.2 over 0.10–0.45 (a hundred thousand motes in a small stack would blow out white). `net.show` 0 → 1 over 0.30–0.50: the network's streams and far-glow come up. `net.growth` 0 → 0.03: the first stack's own rule and plan are born high above, out of frame. |
| zo-2 | 1 | 0.50 → fade-out ends 1.00 | N1 → N2 over 0.50–1.00 (inOutCubic, continuing into the next section's first move). N2: target (0, 1.5, 0), bearing 40, elev 18, d 26, fov 40, frame 0. | `net.growth` 0.03 → 0.12: about twenty bottom stacks and six plans are born near and far round the first stack, each along a stream from above; two more rules at the top. `stage.motes` 0.2 → 0.03 over 0.50–0.90 so the first stack's glow matches its neighbours' by the time they are its size on screen. `clock` runs (every stream flows) from here to the act's end. |

### 2.2 layers (L = 4.3, fade 0.02326)

The author deleted ly-6 ("All of it is one system.", 2026-10-09: "system" is ambiguous here), and the
section lost the 0.7 screens ly-6 held at its end (it was 5.0). Every other place kept its scroll, so
the locals below are screens over 4.3 (netShots.ts `layersAt`); the screens are in brackets.

| Beat | Page | Appears → leaves (local) | Camera | Motion while it is up |
|---|---|---|---|---|
| ly-1 | 1 | 0.00 → page out ends 0.18604651 | Galaxy §14.5's ly-1 on P_a, as built (`LAYERS_SHOTS`, netShots.ts): the move from the galaxy wide over 0.001–0.0233 (0.1), the camera turning to P_a first and closing in after; holds to 0.163 (0.7). | `net.growth` 0.12 → 0.141 (0.121 at 0.0233, 0.141 at 0.163, Task 9): `B1` (born 0.122) and `B2` (0.128) form in frame under the line, each built by 0.163. `net.streams` up over 0.00–0.0233, down over 0.163–0.186 (0.7–0.8; galaxy §15.1). |
| ly-2 | 2 | 0.18604651 → page out ends 0.41860465 | Galaxy §14.5's ly-2, re-skinned: the move over 0.163–0.209 (0.7–0.9), the camera flying in along the arm to the black hole at the centre, `HOLE_CLOSE` (re-skin §8, as built in its Task 5: the core, bearing 165, elevation 16, 54 off at fov 33, framed 0.643 so the hole stands 0.71 down a phone, the inspector's own framing; 105 at frame 0.417 on a landscape screen; lamp 4, the core; riding the galaxy's turn); holds to 0.395 (1.7). | The hole at rest: the disk shears on the ambient clock, bright and blue-white on its approaching side; the arch over the black shadow, its ring, the jets with clean knots, specks falling in. R0's strand winds through the outer disk in the disk's own blue (re-skin §2.1). `net.holeLamp` 0 → 1 over 0.209–0.267 (`layersAt` 0.9–1.15): the hole ×1.3, the background down to 0.3. `net.growth` 0.141 → 0.165 (the core rows draw nothing). No streams (galaxy §15). |
| ly-3 | 3 | 0.41860465 → page out ends 0.65116279 | Galaxy §14.5's ly-3, re-framed (Task 9 fix round 1): straight down on the core, the stars arcing round it below to both sides; the move over 0.395–0.442 (1.7–1.9), pulling back first; holds to 0.628 (2.7). | `net.growth` 0.165 → 0.19: stars come up round the core. No streams. |
| ly-4 | 4 | 0.65116279 → page out ends 0.8372093 | Galaxy §14.5's ly-4, re-keyed (Task 9 fix round 1): over the turn to P_a, every system lit and the core dark (lamp arms); then over 0.674–0.791 (2.9–3.4) the camera rides out along N0's arm to star-4, the newest system out there and the farthest out; holds to 0.814 (3.5). | `net.growth` 0.19 → 0.21: star-4's newest planet is born as the camera arrives. No streams. |
| ly-5 | 5 | 0.8372093 → fade-out ends 1.00 | Galaxy §14.5's ly-5 on P_a, as built: the move over 0.814–0.860 (3.5–3.7), panning back to P_a first and closing in after (from ly-4's 108 to about 32); holds to 0.977 (4.2); then the pull-back to fr-1 over the page turn into far. The section's last line. | `net.growth` 0.21 → 0.23. `net.streams` up over 0.837–0.860 (3.6–3.7, galaxy §15.1), held under the line, down over its page's fade into far (4.2–4.3). |

### 2.3 far (L = 1.6, fade 0.0625)

| Beat | Page | Appears → leaves (local) | Camera | Motion while it is up |
|---|---|---|---|---|
| fr-1 | 1 | 0.00 → fade-out ends 1.00 | Galaxy §14.5's fr-1, as built: the pull-back from ly-5 over layers 0.977 (4.2 screens) to far 0.0625; the slow overhead turn, bearing 0 → 40 over 0.0625–0.90, generated as the lap was (twelve keys on an inOutCubic, `FAR_ORBIT`); then, over the page turn into defect, the dive to `C1` (galaxy §14.5, as built, Task 10). | `net.growth` 0.23 → 0.27: stars keep appearing in every arm. `net.highlight` 0. Lamp off: everything lit alike. No streams. |

### 2.4 defect (L = 4.8, fade 0.02083)

| Beat | Page | Appears → leaves (local) | Camera | Motion while it is up |
|---|---|---|---|---|
| df-1 | 1 | 0.00 → dims at 0.24 | Galaxy §14.5's df-1, as built (Task 10, `DEFECT_SHOTS`, netShots.ts): the dive from fr-1 lands on N8a (−35, 32, 4.5, 36, 1; `C1`) by 0.02, lamp 1 on `C1`; the push-in to N8, the close shot (3.4), over 0.04–0.20, one motion, `net.focus` 0 → 1 with it (the planet's own orbit round its star is not drawn under that lamp). | `net.growth` 0.27 → 0.30. `C1` has carried its defect since its birth (0.14); up close it derps on its schedule (galaxy §5). No state changes. |
| df-2 | 1 | 0.24 → dims at 0.36 | Galaxy §14.5's df-2, as built: N8 held, the freeze pin's camera at the pose. | `net.fix` 0 to 0.36 (Task 10, freeze-frame §1.1): `C1`'s defect is watched for, under the line. `net.growth` 0.30 → 0.32. |
| df-2b | 1 | 0.36 → page out ends 0.46 | N8 held to 0.4392; then the pull-out to the twelve over the page turn (0.4392–0.4808). | `net.fix` 0 at 0.36, 0.05 at 0.37, 0.08 at 0.40, 0.10 at 0.42 (Task 10): `C1`'s fix is at 0.08 on the fix clock, so the person's motes land on the planet and its moons by 0.40 under this line, and it runs smooth. `net.focus` 1 → 0 over the pull-out, before the lamp opens on the twelve at 0.472. |
| df-3 | 2 | 0.46 → dims at 0.58 | Galaxy §14.5's df-3..5, as built: the twelve (−10, 74, 93, 40, 0; the centroid of `P1`–`P3`; 120 at bearing −115 on a landscape screen), lamp 5 on `R0`'s lineage, riding the turn; in place by 0.4808. | `net.growth` 0.32 → 0.335: by the time the wide shot is up, fifteen more bottom stacks and two more plans exist than when we went close. |
| df-4 | 2 | 0.58 → dims at 0.78 | The twelve holds. | `net.highlight` 0 → 0.25 over 0.60–0.76: the ember halos and streams light in order from `P1` down and sideways (§3.2 gives each node's `hiAt`): `P1` first, its code `C2`–`C4`, then `P2` (which reuses `P1`), its code, `P3`, its code, and the two copies `C7`, `C9`. `net.growth` 0.335 → 0.345. |
| df-5 | 2 | 0.78 → fade-out ends 1.00 | The twelve holds (the stop); the follow leaves as the page starts to fade. | `net.highlight` held at 0.25; `net.growth` 0.345 → 0.36. **Exactly twelve stacks are lit** (`P1`, `P2`, `P3`, `C2`–`C10`) for the whole of the line: the next cracked birth (`C11`) is at 0.37 (§3.2, pinned by test 4). `C1` is dark among them, with its warm dusting. `R0` is not lit: the highlight has not gone up. |

### 2.5 spread (L = 2.808, fade 0.03561)

The author deleted the wordless second fix that played between up-1 and up-2 (2026-10-09: redundant):
the dive to `C5`, its mend and the pull-out. Its stretch (0.40–0.62 of the old 3.6 screens, 0.792
screens) is gone, up-2 comes up as up-1's page goes, and `net.fix` holds at 0.10 (`FIX_TWELVE`)
through the section; `C5` has no fix of its own any more and is swept with the rest under fx-4. Every
other place kept its scroll, so the locals below are screens over 2.808 (netShots.ts `spreadAt`); the
screens are in brackets.

| Beat | Page | Appears → leaves (local) | Camera | Motion while it is up |
|---|---|---|---|---|
| up-1 | 1 | 0.00 → page out ends 0.51282051 | Galaxy §14.5's up-1, re-skinned: the follow over the page turn from defect 0.9792, the camera panning in from the twelve with the lamp narrowed to `C7`, then in to the hole, `HOLE_CLOSE` (re-skin §8, as built in its Task 5: the core, bearing 165, elevation 16, 54 off at fov 33, framed 0.643 so the hole stands 0.71 down a phone, the inspector's own framing; 105 at frame 0.417 on a landscape screen; lamp 4, the core; riding the galaxy's turn), the core lit from 0.027 (re-skin Task 5: it stood off `R1` at 50 before). Holds to 0.477 (1.34). `net.streams` 0 → 1 over the follow, 1 → 0 as the page fades. | `net.growth` 0.36 → 0.42: the `C7` → `R1` stream comes up at growth 0.378 (about 0.216 screens in) and is the in-fall, ending at `R1`'s strand join in the disk, ember as it leaves `C7` (`net.inEmber` 0 → 1 over `spreadAt` 0–0.15, before its first dots). `net.strand1` 0 → 1 from its arrival to `spreadAt` 0.9: `R1`'s strand winds in from the join, ember from birth, about 3 turns. `net.knots` 0 → 1 over `spreadAt` 0.9–1.3: ember knots start up the jets. `net.highlight` 0.25 → 0.30 over 0.128–0.256 (0.36–0.72). `net.fix` 0.10 held. |
| up-2 | 2 | 0.51282051 → fade-out ends 1.00 | Galaxy §14.5's up-2, as built (Task 10): over up-1's page turn (0.477–0.548, 1.34–1.54) the camera pulls back from `R1` and pans to (0, 82, 169, 40, frame 0.85; the neighbourhood), 442 on a landscape screen, lamp 3, riding the turn; then, over the page turn into reviewer, the move to re-1. | `net.growth` 0.42 → 0.54: `P4` (0.44), `Q1` (0.45) and their code are born, every cracked body from here lit as it is built; the lit tree has grown out (`C14`, `C16`), sideways (`C13`, `C18`) and in (`R1`, `Q1`, `C15`, `C17`), and the one fixed piece, `C1`, is dark among them. `net.highlight` 0.30 held; `net.fix` 0.10 held. |

### 2.6 reviewer (L = 3.2, fade 0.03125)

| Beat | Page | Appears → leaves (local) | Camera | Motion while it is up |
|---|---|---|---|---|
| re-1 | 1 | 0.00 → dims at 0.40 | Galaxy §14.5's re-1, as built (Task 11, `LATE_SHOTS`, netShots.ts): over the page turn into reviewer the camera pans from up-2 to `P5` and closes in (−127, 68, 3.5 times `P5`'s system, 38, 0.5; 70 composed wide on a landscape screen), lamp 2 on `P5`, riding the turn. The ring visits `V1`–`V9`, all `P5`'s planets, each in the frame under the band as it holds on it. | `net.review` 0 → 0.55 over 0.08–0.40: the ring (§3.7) visits `V1`–`V5` in birth order, pausing on each for 70 % of its visit and crossing to the next over the rest. `net.growth` 0.54 → 0.576: each visited stack is built by the time the ring reaches it (§3.2's births, pinned by test 7). |
| re-2 | 1 | 0.40 → dims at 0.62 | re-1's shot holds. | `net.review` 0.55 → 1.00 over 0.40–0.62: visits `V6`–`V9`. `V7`, `V8`, `V9` (`C21`, `C22`, `C23`) are cracked and lit ember; the ring passes over each, pauses, and moves on, leaving it as it was. `net.growth` 0.576 → 0.595. |
| re-3 | 1 | 0.62 → fade-out ends 1.00 | From where re-3 is full ink (0.65) to 0.80, the camera pulls back from the ring to the hub and the light together (39, 75, 170, 38, 0.85; the middle of `P5` and `R0`; 300 at bearing −51 on a landscape screen), the lamp opening on the core at 0.652: the one dotted line from `R0` down to the ring, the feed alone (`net.feed` 1, `net.streams` 0, galaxy §15.1). | `net.review` 1.00 → 1.20 over 0.62–0.70: the ring stays on `V9` and the **feed stream** `R0` → ring comes up (its alpha is `smoothstep(1.0, 1.2, review)`), dots running down from the top to the ring. `net.growth` 0.595 → 0.60. |

### 2.7 trace (L = 3.4, fade 0.02941)

| Beat | Page | Appears → leaves (local) | Camera | Motion while it is up |
|---|---|---|---|---|
| tr-1 | 1 | 0.00 → dims at 0.36 | The climb, over the page turn into trace: the camera pulls back and turns onto the core, the lineage wide (42, 82, 210, 40, 0; the core; 340 at bearing −10 on a landscape screen), lamp 5 on `R0`'s lineage from 0.012, `net.streams` coming up: every ember branch runs in to the core. | `net.growth` 0.60 → 0.63. `net.highlight` 0.30 → 0.90 over 0.05–0.40 (nothing new lights: every node on the climb is already lit; the scalar is moved so `R0`'s turn comes next). |
| tr-2 | 1 | 0.36 → fade-out ends 1.00 | From where tr-2 is full ink (0.389) to 0.48, in to the hole (`toSource`): `HOLE_CLOSE` (re-skin §8, as built in its Task 5: the core, bearing 165, elevation 16, 54 off at fov 33, framed 0.643 so the hole stands 0.71 down a phone, the inspector's own framing; 105 at frame 0.417 on a landscape screen; lamp 4, the core; riding the galaxy's turn), the lamp narrowing to the core at 0.39; held to 0.58; the pull-back to tr-1's wide over 0.58–0.68, lamp 5 from 0.642, before the surge runs. Judged and measured at trace 0.57, the end of its hold on the hole (its auto-advance stop is after the surge). | R0's strand, the disk's blue until now, heats to ember and is singled out over 0.48–0.56 (`net.heat0`, `net.single`): it brightens ×1.9 while the rest of the hole dims to 0.28, `R1`'s strand with it; the knots are ember. `net.single` 1 → 0 over the fan-out (0.58–0.68). `net.highlight` 0.90 → 0.92 over 0.40–0.50. **The fan-out (wordless, under the line):** `net.highlight` 0.92 → 1.00 over 0.68–0.92: a surge of brightness runs out from the centre along its streams by hop (§3.7): hop 1 its plans and the feed to the ring, hop 2 their code, hop 3 the copies of that code, hop 4 `R1` by the up-stream from `C7`, hop 5 `R1`'s plans, hop 6 their code. One mistake, copied. `net.growth` 0.63 → 0.66. |

### 2.8 fix (L = 4.6, fade 0.02174)

| Beat | Page | Appears → leaves (local) | Camera | Motion while it is up |
|---|---|---|---|---|
| fx-1 | 1 | 0.00 → dims at 0.14 | Over the page turn into fix (`toFix`), back in to the hole: `HOLE_CLOSE` (re-skin §8, as built in its Task 5: the core, bearing 165, elevation 16, 54 off at fov 33, framed 0.643 so the hole stands 0.71 down a phone, the inspector's own framing; 105 at frame 0.417 on a landscape screen; lamp 4, the core; riding the galaxy's turn), lamp 4 on the core from trace 0.971; held through fx-2 (one hold, no pan: there is one hole). | R0's strand cools to the disk's clean blue (`net.heat0` 1 → 0 over 0.03–0.12); `R1`'s strand stays ember, and so do the knots. `net.fix` 0.20 → 0.42 over the page turn into fix, 0.48 at 0.12, 0.50 at 0.14 (Task 11). `net.growth` 0.66 → 0.67. |
| fx-2 | 1 | 0.14 → dims at 0.40 | fx-1's hold on the hole, `HOLE_CLOSE` (re-skin §8, as built in its Task 5: the core, bearing 165, elevation 16, 54 off at fov 33, framed 0.643 so the hole stands 0.71 down a phone, the inspector's own framing; 105 at frame 0.417 on a landscape screen; lamp 4, the core; riding the galaxy's turn) (re-skin §8: `panToR1`, `inOnR1` and `FX2_PAN` went, so there is no pan between the two fixes). | `R1`'s strand, the one `C7`'s notes made, cools to clean (`net.cool1` 0 → 1 over 0.17–0.30), and the in-fall with it; the knots are still ember. `net.fix` 0.50 → 0.60 over 0.26–0.36. `net.growth` 0.67 → 0.69. From `CLEAN_AFTER` (growth 0.665; §3.2) every new piece is clean. |
| fx-3 | 1 | 0.40 → page out ends 0.62 | From where fx-3 is full ink (0.422) to 0.50, out to the neighbourhood (0, 82, 210, 40, 0.85; 540 on a landscape screen), lamp 3 from 0.458: both rules healed in the core, `P7` and `Q3` forming in plain blue. | `net.growth` 0.69 → 0.76: new streams leave `R0` and `R1` (`P7` at 0.70, `Q3` at 0.72), and their code forms below (0.71–0.75), no crack, no ember. `net.fix` held at 0.60. |
| fx-4 | 2 | 0.62 → fade-out ends 1.00 | fx-3's shot holds (no move on the page turn; `net.streams` comes up over it for the sweep). | `net.fix` 0.60 → 1.00 over 0.68–0.96: the sweep. Fix times run top layer to bottom, then by hop from `R0` (§3.2): `R0`'s plans 0.64–0.69, `R1`'s 0.72–0.73, then the code 0.75–0.935 (first the stacks built from those plans, then the copies, then `R1`'s code). Each lit stack is rebuilt as the sweep reaches it (warm motes land, its crack closes) and its halo goes out with it (§3.7). `net.highlight` 1 → 0 over 0.90–0.98 (anything left). `net.growth` 0.76 → 0.86. |

### 2.9 lesson (L = 1.6, fade 0.0625)

| Beat | Page | Appears → leaves (local) | Camera | Motion while it is up |
|---|---|---|---|---|
| ls-1 | 1 | 0.00 → fade-out ends 1.00 (the Coda's first page follows) | Over the page turn into lesson, overhead of the core from the side its stars lie on (42, 82, 270, 40, 0; 400 on a landscape screen), lamp 3 by 0.026, through the core alone from fix 0.986: the core in the middle, the stars in a ring round it, the arm's dust to the edges. Holds to the end. | `net.growth` 0.86 → 1.00: the network keeps growing, all of it clean. `net.fix` 1 held: the rebuilt stacks keep their warm dusting. The Coda's map comes up over this frame (out of scope here). |

### 2.10 Keyframe changes, summarised

- New sections, in `src/story/05-zoom-out.md` … `13-lesson.md`, `length` as the headings above (Act II
  30.0 screens; the essay 49.4). Beats and `at` as the tables; `draft: true` until the author signs off.
- `mech.reflow`: 0 until zoom-out 0.04, 1 at 0.40 (inOutCubic), 1 to the end. `mech.drive`: 1.4 at
  zoom-out 0 (continuous with the spec section), 1.9 at 0.40, held. `mech.assembly` 1, `mech.variant`
  0, `provenance` 0 throughout. `ink.opacity`: 0.25 → 0 over zoom-out 0–0.08. `stage.motes`: 1 → 0.2
  (0.10–0.45), → 0.03 (0.50–0.90), held.
- `net.show`: 0 → 1 over zoom-out 0.30–0.50, held 1.
- `net.growth`: linear within each section, the end values 0.12, 0.23, 0.27, 0.36, 0.54, 0.60, 0.66,
  0.86, 1.00 (with the inner keys the tables give; monotone, never decreasing anywhere in the essay).
- `net.highlight`: 0 to defect 0.60; 0.25 at 0.76; 0.30 at spread 0.38; 0.90 at trace 0.40; 0.92 at
  0.50; 1.00 at 0.92; 0 at fix 0.98.
- `net.fix`: 0 to defect 0.27; 0.10 at 0.40; 0.20 at spread 0.56; 0.50 at fix 0.14; 0.60 at 0.36; 1.00
  at 0.96.
- `net.review`: 0 to reviewer 0.08; 1.00 at 0.62; 1.20 at 0.70; held.
- `clock`: 0 at zoom-out 0, rising 1.3 per screen of scroll (linear per section) to the act's end: the
  streams flow as the reader scrolls (§3.6).
- `camera.pos/target/fov/frame`: the shots above through `netShotKeys`; the dive, the pull-outs, the
  up-stream follow and the climb are generated splines (§3.9) pasted once and held by a test, as the
  lap is. Act II's first key equals Act I's last (S10′) so the boundary is continuous.

### 2.11 New SceneState leaves (defaults leave every Act I frame unchanged)

| Leaf | Range | Default | Meaning |
|---|---|---|---|
| `mech.reflow` | 0..1 | 0 | The bike's motes reflow into the first stack (§4): 0 the bike, 1 the stack. |
| `net.show` | 0..1 | 0 | The network's presence: its draws are invisible at 0 and their brightness scales with it. |
| `net.growth` | 0..1 | 0 | The growth clock. Each cube's birth is a value on it (§3.4). |
| `net.fix` | 0..1 | 0 | The fix clock. Each cracked node's rebuild is a value on it (§3.7). |
| `net.highlight` | 0..1 | 0 | The highlight clock: each node's ember lights at its `hiAt`; 0.92–1 is the fan-out surge. |
| `net.review` | 0..2 | 0 | The ring: 0..1 its nine visits; 1..1.2 brings up the feed stream; 1.5..2 fades the ring out. |

`clock` already exists ("scroll-derived clock for Act II field effects") and is used as the design
spec §6.4 meant it. `SCENE_STATE_PATHS`, `defaultSceneState()` and their sync test grow by six leaves;
`mergeState` needs nothing. `sceneMotion` (auto-advance) gains `mech.reflow`, `net.show`,
`net.highlight`, `net.fix` and `net.review`, **not** `net.growth` or `clock`: those are the network's
running clocks, like the bike's drive, and a stop does not wait for them.

### 2.12 Mock frames (T1)

Static frames from a canvas stand-in for the network (a seeded three-layer layout, dotted bricks,
the far-glow impostor, the ember halos, the house text panel and scrim; not the generator and not
the shader), rendered with Chromium at 390×844 first and 1440×900, in
`<scratchpad>/act2-mocks/`:
`twelve-phone.png` / `twelve-desktop.png` (df-5 at N9), `far-*.png` (fr-1 at N7), `lesson-*.png`
(ls-1 at N20); `mock.html?frame=twelve|far|lesson` is the generator and `shoot.cjs` the shooter.
What they settled: the wide shots' elevation and target (§3.9: at 32–34° the three layers interleave
into one blob; at 18° and 52 units the bottom layer runs off a desktop screen while the top just
clears the band; the rows above are the corrected values), the halo's radius and falloff (§3.8), that
twelve ember halos are countable on a phone at the wide shot, and that the far-glow impostor reads as
soft bodies for the small stacks at that distance (the author should look; §9's impostor row is the
lever). What they do not show: the crack (the spike's `near.png` does), the streams flowing, the
reflow, the lighting, or the real stack counts and density. The numbers in §2 are starting values
either way.

## 3. The network scene, technically

### 3.1 What it is, in one sentence each

- **A node** is a stack of cubes: a small brick-bond cluster of boxes (§3.3), at a fixed place, with a
  layer, a size, a parent, a birth on the growth clock, and a flag for whether it carries the crack.
- **A stream** is an edge: parent → child, a quadratic Bezier from the parent's foot (or top, for the
  up-stream; or side, for a copy) to the child's head, drawn as a row of small dots that drift along it
  with `clock`, and the path the child's motes fly in along.
- **The network** is generated once from a seed on the CPU (`src/network/`), written into two static
  textures (nodes, edges) and five instance buffers (node motes, stream dots, halos, the ring, the
  feed), and never touched again: every frame reads the six scalars of §2.11, `clock` and the camera.
- **It is not a Mechanism.** It has no pose, no faults, no twin morph and no part transforms; it has
  births instead of settle windows and streams instead of a spawn shell. It has its own small position
  library, `node.glsl` with a TypeScript mirror `node.ts` and a parity check (§3.4), sharing
  `hash01`, `moteSinCos` and `moteRotate` from the mote library by splicing the same way the vertex
  shaders do (`withMoteLibrary`), and rendered by the mote system's conventions (instanced quads,
  `instance.glsl`'s `toView`, `moteLight`, `pxPerUnit`, the point form, screen blending, the
  `mote.frag.glsl` colours). The bike mechanism and `mote()` are untouched by it; only the reflow (§4)
  touches them.

### 3.2 Generation, deterministic from a seed

`src/network/generate.ts`: `generateNetwork(seed, budget): Network`, pure, with `mulberry32(pcg(seed ^
salt))` streams as the mechanisms use, one per concern (positions, sizes, births, yaws) so a change to
one does not reshuffle another. Output: `nodes: Node[]`, `edges: Edge[]`, `visits: NodeId[]`,
`schedule`. Node 0 is the first stack (`N0`): it has a place, a plan and a stream like any other, and
**no network motes**: its motes are the bike's (§4).

**Layers.** Centre lines y = 0 (code), 7 (plans), 14 (rules); each a slab with y jitter ±0.6, ±1.0,
±1.5. Horizontal extents: code within radius 26 of the origin, plans 16, rules 7. Final counts 300 / 40
/ 6. A node's horizontal place is drawn near its parent (a plan within 7 of its rule's xz, a code stack
within 4 of its plan's, a copy within 3 of its source), rejected and redrawn while it is within 1.1 ×
(its radius + a neighbour's) of any node already placed in its layer, so the fan-out of lineage is
visible as clustering and nothing overlaps. Each node has a yaw (uniform) and a size: cube unit u =
0.42 / 0.65 / 1.10 (cluster radius about 0.9 / 1.4 / 2.4) and 5–7 / 9–12 / 16–22 cubes, by layer.

**The scripted lineage.** The story needs particular nodes at particular times; they are a table the
generator places first (positions are starting values; the clustering rule above draws the rest):

| Id | Layer | Parent (stream) | Born | Cracked | Hero | hiAt | fixAt | Place (x, y, z) | Role in the story |
|---|---|---|---|---|---|---|---|---|---|
| R_a | top | — | 0.00 | no | | | | (5, 14, −3) | the first stack's rule |
| R0 | top | — | 0.05 | **source** | 8k | 0.92 | 0.46 | (−6, 14, 2) | one incorrect rule |
| R_b | top | — | 0.09 | no | | | | (9, 14, 4) | still being built under ly-2 |
| R_c | top | — | 0.20 | no | | | | (−2, 15, −8) | |
| R1 | top | up from C7 | 0.39 | yes | 4k | 0.28 | 0.56 | (−12, 14.5, −4) | the rule an agent wrote |
| R_d | top | — | 0.80 | no | | | | (1, 13.5, 8) | |
| P_a | middle | R_a | 0.02 | no | | | | (3, 7, −1) | the first stack's plan |
| P1 | middle | R0 | 0.10 | yes | | 0.03 | 0.64 | (−5, 7, 3) | the plan the fixed one came from |
| P2 | middle | R0, reuses P1 | 0.24 | yes | | 0.10 | 0.65 | (−9, 7, 1) | |
| P3 | middle | R0, reuses P2 | 0.31 | yes | | 0.15 | 0.66 | (−3, 7.5, 6) | |
| P4 | middle | R0, reuses P3 | 0.44 | yes | | 0.30 | 0.67 | (−10, 6.5, 6) | |
| P5 | middle | R0, reuses P1 | 0.50 | yes | | 0.30 | 0.68 | (−1, 7, 9) | the ring's stack's plan; the climb passes it |
| P6 | middle | R0, reuses P4 | 0.55 | yes | | 0.30 | 0.69 | (−13, 7, 0) | |
| Q1 | middle | R1 | 0.45 | yes | | 0.30 | 0.72 | (−15, 7.5, −6) | |
| Q2 | middle | R1 | 0.52 | yes | | 0.30 | 0.73 | (−11, 7, −9) | |
| P7 | middle | R0 | 0.70 | no | | | | (−7, 7, −3) | new work from the fixed rule |
| Q3 | middle | R1 | 0.72 | no | | | | (−16, 7, −1) | |
| N0 | bottom | P_a | — | no | (the bike) | | | (0, 0, 0) | the first stack |
| B1, B2 | bottom | P_a | 0.122, 0.128 | no | | | | within 3 of N0 | form in frame under ly-1 |
| C1 | bottom | P1 | 0.14 | yes | 8k | — | 0.08 | (−4, 0, 5) | the first fix |
| C2, C3, C4 | bottom | P1 | 0.18, 0.22, 0.27 | yes | | 0.06, 0.07, 0.08 | 0.75, 0.76, 0.77 | near P1 | |
| C5, C6 | bottom | P2 | 0.29, 0.33 | yes | | 0.12, 0.13 | 0.78, 0.80 | near P2 | |
| C7 | bottom | copies C3 | 0.30 | yes | | 0.19 | 0.895 | within 3 of C3 | writes the rule up (the up-stream leaves its top) |
| C8 | bottom | P3 | 0.32 | yes | | 0.17 | 0.79 | near P3 | |
| C9 | bottom | copies C5 | 0.335 | yes | | 0.21 | 0.90 | within 3 of C5 | |
| C10 | bottom | P3 | 0.338 | yes | | 0.23 | 0.81 | near P3 | the twelfth |
| C11 | bottom | P3 | 0.37 | yes | | 0.30 | 0.82 | near P3 | the thirteenth: born after df-5 |
| C12 | bottom | P2 | 0.38 | yes | 4k | 0.30 | 0.18 | (−12, 0, 3) | the second fix |
| C13 | bottom | copies C8 | 0.41 | yes | | 0.30 | 0.905 | | |
| C14, C16 | bottom | P4 | 0.455, 0.49 | yes | | 0.30 | 0.83, 0.84 | | |
| C15, C17 | bottom | Q1 | 0.47, 0.51 | yes | | 0.30 | 0.92, 0.925 | | |
| C18 | bottom | copies C14 | 0.53 | yes | | 0.30 | 0.91 | | |
| V1–V9 | bottom | see below | 0.530 + 0.0053·j (j = 0..8) | V3, V5, V7, V8, V9 | | 0.30 | 0.85, 0.93, 0.86, 0.87, 0.88 | a cluster round (4, 0, 10) | the nine review visits, in birth order |
| C24, C25, C26 | bottom | P6, copies C21, Q2 | 0.61, 0.63, 0.645 | yes | | 0.30 | 0.89, 0.915, 0.935 | | born during the ring and the climb |
| C27–C32 | bottom | P7 ×3, Q3 ×3 | 0.71–0.75 | no | | | | | new work, correct |

The visits: V1, V2, V4, V6 are clean (from the nearest clean plans); V3 = C19 (P5), V5 = C20 (Q2),
V7 = C21 (P5), V8 = C22 (P6), V9 = C23 (P5). The climb (§2.7) runs V9 → P5 → R0. `R0` has `hop` 0;
every other node's `hop` is its distance from `R0` along streams, a copy one further than its source
(the feed to the ring is hop 1; `C7` is hop 3 as a copy of `C3`; `R1` is hop 4 through C7's
up-stream; its plans 5, their code 6). The sweep's `fixAt` runs by (layer, hop, birth): every plan
before any code, then by hop, then by birth, so the rebuild runs top to bottom and outward. Births
respect `child.born ≥ parent.born + 0.5 · parent.dur` (a stack is at least half built before anything
is built from it).

**The filler.** The remaining ~260 bottom stacks, ~28 plans and nothing at the top (the six rules are
all scripted) are drawn statistically: counts by growth `n_code(g) = 300 · g^1.3`, `n_plan(g) = 40 ·
g` (so about 55 / 11 exist at the far shot, 80 / 14 at the twelve, 135 / 22 at the reviewer, 300 / 40
at the end), each with a parent from the layer above weighted by closeness and by the parent's age
(an older rule has more plans: "the few things at the top that every agent reads"); 15 % of filler
code stacks copy a nearby code stack instead (a sideways stream from it, no plan stream); 10 % of
filler plans also reuse an earlier plan (a second, sideways stream). A filler node is cracked iff any
of its stream parents is cracked **and** it was born before `CLEAN_AFTER = 0.665`; the scripted table
obeys the same rule (it is a test, not an input). Up-streams: exactly one in the act, C7 → R1.

**Durations** (`dur`, how long a node's cubes take to land, in growth units): 0.012 / 0.030 / 0.060 by
layer; `R0` 0.08, `R1` 0.05.

**The schedule** (`src/network/schedule.ts`): the constants the keyframes must agree with, with a
fence each (§6, test 5): `G_TWELVE = [0.345, 0.36]` (the growth span under df-5, over which exactly
twelve are lit), `CLEAN_AFTER = 0.665` (the growth at which `net.fix` passes `R0`'s 0.46), the review
visits' births against `net.review`, and `REVIEW_VISITS` (V1–V9).

### 3.3 The node set: cubes, motes, budget

**A stack's cubes** (`src/network/cluster.ts`): for n cubes, courses from the bottom with widths from
a seeded table (n = 6: 3, 2, 1; n = 10: 4, 3, 2, 1; n = 18: 5, 4, 4, 3, 2), bricks of size (u · 1.1–1.6,
u · 0.6, u · 0.8) side by side along the stack's x with a half-brick stagger between courses, each
course yawed ±0.06 rad and nudged ±0.05u so stacks look hand-stacked, the whole cluster yawed by the
node's yaw and placed at its centre. The **crack site** is the front brick of the top course (its +z
face toward the default bearing and the key light; nothing stands above it, which is what keeps the
close shots clear of the text band on a phone). The first stack (`N0`) is this generator's n = 6 at
u = 0.42, seed-fixed, and its boxes are the constants the reflow uses (§4).

**Motes per node.** Surface points on the boxes (`samplePart` on a merged `plate` geometry, as the
spike did), area-weighted across the cubes, each with its normal. Counts: bottom 120, middle 300, top
700; the four **hero** nodes the camera visits close carry 8k (`C1`, `R0`) and 4k (`C12`, `R1`), so a
crack reads at two radii. Every cracked node also carries a small **person** set: 6 % of its count,
never fewer than 24 (the heroes 300), role `person`, resting on the cracked cube's whole surface, born
on the fix clock (§3.7). Total about 76k on desktop (`NETWORK_BUDGET = round(0.76 × MOTE_BUDGET)`,
the generator scaling the non-hero counts to fit and keeping the heroes' shares fixed), about 30k with
a 30k mote budget on a phone (the per-tier probe of the design spec §8 is still not built; `?n=`
lowers both budgets together). Instances in flight cost nothing extra: there is one draw.

**Glow normalisation.** A hero at 60 × the density of its neighbours would be a lamp from afar;
every stack must have the same glow (fr-1). Each node carries `glow = refDensity / density` (its
motes per unit of surface against a bottom stack's), multiplied into its motes' brightness, so under
screen blending a pixel of a hero and a pixel of a plain stack sum to the same light at any distance.

**Per-instance attributes** (`src/scene/node/nodeLayout.ts`, declared once as `layout.ts` is, packed
and unpacked by the same generated-GLSL pattern): `aLocal` (vec3, world space, the whole build),
`aTwin` (vec3, the cracked build; equal to `aLocal` on every clean node and on every mote not in the
crack), `aNormal`, `aNormalTwin` (vec3 each), `aMeta` (node index, seed, `birth` 0..1 within the
node's duration, role: 0 builder, 1 person, 2 crack-face). Five attributes, 16 components.

**Per-node texture** (RGBA32F, 4 texels wide, one row per node, `texelFetch`): T0 centre.xyz, born;
T1 spawn.xyz (the parent's stream foot), dur; T2 fixAt, hiAt, glow, hop; T3 radius, layer, cracked,
pad. **Per-edge texture**: T0 a.xyz, born; T1 b.xyz, hiAt; T2 c.xyz (the control point), kind (down /
side / up / feed) and hop.

### 3.4 `node()`: birth windows like settle windows (the mirror pair)

`src/scene/node/node.glsl` ↔ `node.ts`, step for step, with `src/parity/` gaining a second mode that
renders `node()` over a sampled attribute set and compares it with the TypeScript (the existing
parity page's machinery; a `?lib=node` switch). Constants in `src/scene/node/birth.ts` mirrored as
`NODE_BIRTH_WINDOW = 0.012`, `NODE_FIX_WINDOW = 0.03`, `NODE_FLARE_WIDTH = 0.004`,
`NODE_FLARE_GAIN = 3.0`, declared in the GLSL and checked by a test as `mote.test.ts` checks the
mote's.

1. **Node data** from the texture by `a.node`.
2. **Which clock, and when.** A builder or crack-face mote lands at `settle = born + dur · a.birth`
   on `uGrowth`; a person mote at `settle = fixAt` on `uFix`. `t = smoothstep(settle − W, settle,
   clock)` with `W` the birth or fix window. Before `settle − W` the mote is **hidden** (not parked at
   its spawn as the bike's are: nothing waits on a shell here). `e = 1 − (1 − t)³`, the mote's easing.
3. **The crack.** `v = cracked · (1 − smoothstep(fixAt − W_fix / 2, fixAt, uFix))` (1 while cracked,
   closing as the fix lands); `lp = mix(a.local, a.twin, v)`; the normal likewise.
4. **Spawn.** A builder flies from the node's stream foot: `spawn + 0.3 · parentRadius · jitter(seed)`;
   a person mote from above: `centre + (0, 3 · radius, 0) + 0.5 · radius · jitter(seed)`.
5. **Flight.** The quadratic Bezier of `mote()` step 6, through the stream's control point `c` (so
   the motes fly along the stream they came down) for builders, and through `mid + (0, 1.5 · radius,
   0)` for person motes (they fall). `pos = om² · spawn + 2 · om · e · c + e² · lp`.
6. **Flare.** `1 − smoothstep(0, FLARE_WIDTH, |clock − settle|)`: a cube flares as it lands, the way the
   bike's do, so "a cube settles each time a stream arrives" has a visible event.
7. **Highlight.** `hi = smoothstep(hiAt − 0.02, hiAt, uHighlight) · (1 − fix)` where `fix =
   smoothstep(fixAt − W_fix, fixAt, uFix)`; `surge = smoothstep(0.92 + 0.012 · hop − 0.01, 0.92 +
   0.012 · hop, uHighlight)` (the fan-out: 0 below 0.92, hops 0..6 lighting in order, the last done at 1).
8. **Outputs** (a `MoteOut`, so `instance.glsl` and `mote.frag.glsl` need nothing new, plus a varying
   `vHi`): `pos`; `type` Agent for builders and crack-face motes, Human for person motes; `brightness
   = (mix(1, 0.5, t) + FLARE_GAIN · flare) · glow · (1 + 1.5 · hi + surge) · uShow` (crack-face motes
   × 1.3: the lips are bright); `visible` (born, and `uShow > 0`); `settled = t`; `normal` posed by the
   node's yaw. `vHi = max(hi, surge)` mixes the fragment's colour toward ember (§3.7).

Every term is a function of the attributes, the textures and the scalars; nothing is integrated.
Growth over scroll is pure for the same reason assembly is: a birth is a value on a clock the
keyframes move, and the keyframes only ever move it forward. The holds rule from Act I applies: no
`net.growth` or `net.fix` key may hold within `FLARE_WIDTH` of any birth or fix value for longer than
0.05 local (test 9), or those motes glow for the hold.

### 3.5 The crack, from the spike

As `crackTwin` in the spike, applied to the crack cube of a cracked node and nothing else: a plane
through the cube with normal `norm(1, 0.15, 0)` in the cube's own frame (no z component, and a jag
that depends on height only, so the crack's traces on the front and back faces line up from a frontal
camera; the spike found a crack whose two traces do not overlap is filled in by the other face's
motes and vanishes), a gap of `0.07 · u / 0.42` (the spike's gap scaled with the cube), the jag
`0.08 · u · (tri(4.1 y + 0.31) + 0.6 · tri(9.7 y + 0.17))` (a triangle wave, so the line is jagged
rather than wavy). In the **twin**: every mote of the cube shifts `± gap / 2` along the normal by
which side of the jagged plane it is on, and **every fifth mote moves onto one of the two new crack
faces** (`CRACK_FACE_SHARE = 0.2`, alternating faces), with the face's own normal, role `crack-face`.
Those are the motes that draw the line: a face seen nearly edge-on concentrates its motes into a
line, as the seams between cubes already do in the spike's near shots, and the key light from the
front-left rakes it. In the **whole** build the same motes are ordinary surface points, so the fix
(§3.4 step 3) slides the lips shut and the face motes back onto the surface over the last half of the
fix window, under the warm motes landing.

Why it is invisible far: at twelve radii a bottom stack is sixteen pixels tall and the gap is under a
tenth of a pixel; the face motes add a few dozen points to a cluster of a hundred and twenty. At two
radii (the close shots) the cube is three hundred pixels tall, the gap three pixels, and a hero's 250
face motes draw two overlapping lips a pixel apart. Test 11 measures both.

### 3.6 Streams

One instanced draw, `stream.vert.glsl` (+ `mote.frag.glsl`), `K = clamp(round(length / 0.6), 8, 80)`
dots per edge, instance attributes `aEdge`, `aK` (the dot's hash). Per dot: `u = fract(h + dir · 0.15
· uClock)` (`dir` −1 on the up-stream, so its dots climb; +1 elsewhere); `pos = bezier(a, c, b, u)`
with `c = mid + 0.12 · length · bow(seed)` (a seeded lateral bow in the plane perpendicular to the
edge, so streams curve a little and no two coincide); the point form, 1 CSS px, capped at 2;
brightness `0.5 · show · born_e · (1 + 1.4 · hiEdge + surge_e)`, `born_e = smoothstep(childBorn −
0.02, childBorn, uGrowth)` (a stream arrives just before its first cube), `hiEdge =
smoothstep(hiAt_e − 0.02, hiAt_e, uHighlight) · (1 − fix_child)`, `surge_e` by the edge's hop as the
nodes'. The up-stream is drawn thin and a little brighter (0.7, K halved). The **feed** (`R0` → the
ring) is the same instance kind with `b = uRing` and `born_e` replaced by `smoothstep(1.0, 1.2,
uReview) · (1 − smoothstep(1.5, 2.0, uReview))`. The dots move only as `clock` moves, which is only
as the reader scrolls: a reader who stops sees a still stream, and auto-advance's transits show it
flowing.

### 3.7 Highlight, the fix, the ring and the feed — and colour

The prose never names a colour; the picture still means things by them, as Act I did, and the alt
text says so. The palette, and what each means:

| What | Colour | Where it comes from |
|---|---|---|
| The agents' work: every stack, every stream | agent blue `#4DA3FF` | Act I's body motes; `mote.frag.glsl` |
| The person's work: the motes that rebuild a cracked cube | human amber `#FFB347` (with the core's violet accents) | Act I's core motes; the fix motes are role `person`, type Human |
| The highlight: what carries the defect | **ember** `#FF6B57` | New. Nobody's colour: the camera's x-ray, not a kind of work. Reddish so it reads as "wrong" without a word, and far from the amber (hue 12° against 38°) so a fixed stack's warm dusting is never mistaken for a lit one. |
| The reviewer's ring | cool white `#DCE6FF` | The ghost's pencil colour family: neither the person's warmth nor the builders' blue. |
| The fan-out surge | white-cored ember | Brightness, not a new hue: the ember pushed toward white as a flare is. |

- **Highlight.** Three things light together at a node's `hi`: its motes (brightness × (1 + 1.5 hi),
  colour mixed 80 % toward ember in the fragment via `vHi`), its halo (§3.8, alpha 0.6 hi, ember) and
  the streams into it (§3.6). The order is `hiAt` (§3.2): the twelve under df-4 in breadth-first
  order from `P1` down and sideways, never up; `R1` and the up-stream at 0.28; everything cracked
  born after the twelve at 0.30 (lit at birth); `R0` at 0.92 (the end of the climb); the surge over
  0.92–1 by hop from `R0`. A lit node goes out as its fix lands (`hi · (1 − fix)`), which is how the
  sweep (fx-4) reads as running down the lineage: the plans go out first, then the code.
- **The fix.** A cracked node's `fixAt` on the fix clock (§3.2). Over `[fixAt − 0.03, fixAt]` its person
  motes fall onto the crack cube from above (amber, the flare on landing), and over the last half of
  that its lips close (§3.5). After the fix the cube is whole with a warm dusting on it that stays:
  the mark of where a person's attention went, as in Act I. The fixed stack is **dark** in the
  highlight sense (`hi` 0) and warm-speckled in colour: "the fixed one sits dark among them".
- **The ring.** One billboarded quad (`ring.vert/frag.glsl`): an annulus of inner radius 0.8 and outer
  1.0 of `1.5 × nodeRadius`, 2 px soft edges, cool white, alpha 0.7 × presence. Its position is a pure
  function of `net.review` on the CPU (`ringAt(review, visits)` in `src/network/review.ts`, tested): for
  `r` in [0, 1], visit `j = floor(9r)`, `f = fract(9r)`; at `V_j` while `f < 0.7`, then a smoothstep
  move to `V_{j+1}` over `f` 0.7..1 (`V9` holds); for `r > 1` it stays on `V9`; presence
  `smoothstep(0, 0.03, r) · (1 − smoothstep(1.5, 2.0, r))`. The ring **changes nothing** it passes
  over; a lit stack stays lit under it and after it.
- **The feed.** The stream from `R0`'s foot to the ring (§3.6), up from `net.review` 1.0. It is in
  the lineage at hop 1, so it lights in the surge and the climb's camera can start along it.

### 3.8 Halos: the far glow and the highlight in one quad

One instanced quad per node (`halo.vert/frag.glsl`, 346 instances): a radial disc of radius
`1.2 × nodeRadius` (capped at 120 px) with a tight core (alpha at the centre, 45 % of it at half the
radius, 0 at the rim: at 1.6 × with a plain falloff, two adjacent lit stacks merged into one blob in the
mock frames), alpha = `show · bornFrac · (0.35 · lod + 0.6 · hi + 0.8 · surge)`, colour `mix(agent
blue, ember, max(hi, surge))`, additive like the ghost. `bornFrac = clamp((
growth − born) / dur)`; `lod = 1 − smoothstep(10, 28, projected radius in px)` is the **far-glow
impostor**: when a stack is smaller than ten pixels its hundred and twenty motes are a sparse speckle,
and the disc gives it the same soft body as every other stack ("every stack has the same glow"); by
twenty-eight pixels it is gone and the motes carry the stack. `lod` is a function of the camera and
the node's place, so it is as pure as the rest. The same quad is the highlight's halo and the
surge's flash. On a phone at the wide shots this disc is what makes the twelve countable (test 12
counts them in pixels).

### 3.9 The camera rig for a scene that is not a mechanism

Nothing in `cameraRig.ts` changes. The keys stay machine-relative to the **bike's** anchors (`world
= centre + v × radius`, the bike's whole anchor, radius about 2.4 at the origin); a network shot is
just a key with larger numbers. `src/timeline/netShots.ts` (test and tooling, like `shots.ts`) holds
`NET_SHOTS` in network terms (§2's conventions; a target may be a node id, resolved from
`generateNetwork(MOTE_SEED)` so a regenerated layout moves the shots with it), `netShotKeys(shot)` →
the rig's keys, `netShotOf(camera)` → network terms for the tests, and `splineKeys(waypoints, from,
to, n)` for the generated moves (the dive and its reverse, the up-stream follow, the second dive, the
climb, the orbit): the lap's centripetal Catmull-Rom over (bearing, elevation, ln distance, fov,
target), sampled to linear keys and pasted once, held by a test to 1e-3 as `orbitKeys` is. `frame` is
keyed by hand.

**Why the wide shots are nearly level, and target above the centre.** The text sits over the top
42 % of every screen and the network is eighteen units tall with its stacks. A wide shot with `frame`
0 lands its target at 66 % of the height (62 % on a phone), leaving 24 % of the height above the
target and 34 % below it. Two things compete: the top layer must clear the band, and the bottom layer,
a disc fifty-two units across, must stay inside the screen. Elevating the camera foreshortens the
layers but spreads the bottom disc's depth down the screen (at 34° the near half of the disc falls
13 units below the target and the three layers interleave on screen into one blob: the mock frames,
§2.12), so the wide shots are nearly level (12–16°), far (60–62 units), and target (0, 10, 0), above
the network's centre: the top layer's top (about 8 units above the target, 9 with the far rim of its
disc) then takes 21 % of a 1440×900 screen, under the 24 %, and the bottom layer's near rim (14 units
below) takes 33 %, inside the 34 %. Bottom stacks are eighteen pixels tall there, with the far-glow
impostor (§3.8) giving each its body. The portrait rig backs off by √m and widens by √m about the
same target, so a phone sees the whole network smaller and with room to spare. The lesson shot (N20)
is the one high camera, by design. The clearance test measures every sample (§6, test 14); its
failing sample moves the nearest shot up or out.

**Close shots on a phone.** `frame` 1 puts the subject at 76 % of a phone's height; a cracked cube is
the top-front cube of its stack (§3.3), so nothing of the stack stands above it and the band is clear.
Starting distance 2.6 for a bottom stack and 5.5 for a rule (about three cluster radii; the spike's
near shots at 1.6 radii showed the crack plainly, and three keeps the cube's neighbours in frame so it
reads as a cube in a stack). The dive's spline passes a waypoint six units above the target so the
camera never crosses a layer's slab on the way down.

### 3.10 Purity, reduced motion, no WebGL

Every draw reads the six scalars, `clock`, the camera and static buffers; nothing is accumulated;
jumping to a progress and scrolling to it render the same pixels (test 2 samples mid-reflow,
mid-highlight, mid-ring and mid-sweep on both sizes). Reduced motion: all motion is scroll-scrubbed
(the camera, the flights, the streams), there is no second code path, and auto-advance starts paused
as today. Without WebGL the stills are the screenshot suite's at the storyboard's beat midpoints
(test 15), as in Act I.

## 4. The reflow: the bike becomes the first stack

**What the reader sees** (zo-1): the riding bike's motes, every one, puff a little outward and fall
into the first stack's cubes; the wheels are still turning as they go; by the end of the line there
is a small stack where the bike was and nothing else of it.

**The mapping is point for point and procedural**, so no attribute changes: each mote's place on the
stack is a function of its seed, `moteStackRest(seed)`, which picks a box of the first stack by
cumulative surface area (`hash01(seed, SALT_STACK_BOX)`), a face of it by the face areas
(`SALT_STACK_FACE`) and a point on the face (`SALT_STACK_U`, `SALT_STACK_V`), and returns the point and
the face's normal. The first stack's six boxes (centre, size, in world units, from
`firstStack()` in `src/network/cluster.ts`) are spliced into `mote.glsl` as constants by
`shaderSource.ts`, exactly as the SALT constants are, so the GLSL and the TypeScript read one source.
Four new salts in `salts.ts` (which already generates the GLSL side). A scatter mapping (not a nearest-
surface projection) is chosen on purpose: every face of the stack is sampled by area, so the stack
is uniformly built, and the bike dissolves into a cloud that crystallises as cubes, the way the
cold open's cloud crystallised as a bike.

**The change to `mote()`** (both mirrors, one step, the parity page's sample states gaining
`mech.reflow` ∈ {0, 0.4, 1}):

```glsl
uniform float uReflow;
// 3b. The reflow (Act II): the mote's second home is the first stack. A pure blend of the posed,
// drifted rest toward a point on the stack, along a bow that puffs outward first.
if (uReflow > 0.0) {
  vec4 home = moteStackRest(seed);            // xyz the point, w the face index (its normal below)
  float er = 1.0 - (1.0 - uReflow) * (1.0 - uReflow) * (1.0 - uReflow);
  vec3 outward = length(rest) > 1e-6 ? rest / length(rest) : vec3(0.0, 1.0, 0.0);
  vec3 cr = 0.5 * (rest + home.xyz) + 0.8 * outward + 0.4 * (hash01(seed, SALT_BEZIER_SIDE) - 0.5) * side / length(side);
  float omr = 1.0 - er;
  rest = omr * omr * rest + 2.0 * omr * er * cr + er * er * home.xyz;
  homeNormal = moteStackNormal(int(home.w)); // used in step 7: n = normalize(mix(posed n0, homeNormal, er))
}
```

`rest` is the drifted, posed rest of step 3, so the ride (drive) and the twin blend are already in it
and the stack takes over as `uReflow` rises; at 1 the position is exactly the stack point whatever the
drive does, and step 6's flight (assembly 1 throughout Act II) lands on it. `uReflow` 0 is the
identity on every existing frame, byte for byte (test 1); the uniform branch is the same on both
mirrors. The TypeScript mirror reads `s.mech.reflow` and the same box constants. `mote.vert.glsl`,
`thread.vert.glsl` and `ghost.vert.glsl` need nothing; `moteSystem.update` sets `uReflow` from
`state.mech.reflow`. `MoteAttrs`, `layout.ts` and the parity fields are unchanged.

**Timing** (zo-1): `mech.reflow` 0 → 1 over local 0.04–0.40 (0.8 screen) on an inOutCubic; the camera's
pull from S10′ to N1 runs 0.02–0.50 so the stack is centred and small by the time the second line
comes up. `stage.motes` dims the bike's draw from 1 to 0.2 over the reflow and to 0.03 by zo-2's end:
a hundred thousand motes on nine square units would otherwise be a white lamp beside stacks of a
hundred and twenty; by the first layers shot the first stack reads as a stack among stacks, only
finer-grained. The core's 15 % warm motes come along and stay as a faint warm speckle on the first
stack: the one stack a person looked closely at (open question 1).

## 5. What changes in existing code

| Where | Change |
|---|---|
| `src/timeline/sceneState.ts` | Six leaves (§2.11), `SCENE_STATE_PATHS`, defaults; the sync test grows. |
| `src/scene/mote/mote.glsl`, `mote.ts` | Step 3b, the reflow (§4), `uReflow`, `moteStackRest/Normal`; spliced `STACK_*` constants; both mirrors in one commit; `mote.test.ts` checks the declarations. |
| `src/math/salts.ts` | Four salts. |
| `src/scene/mote/shaderSource.ts` | Splices the first stack's boxes after the SALT block. |
| `src/scene/mote/moteSystem.ts` | `uReflow` from state. |
| `src/scene/mote/shaders/mote.frag.glsl`, `mote.vert.glsl` | A `vHi` varying mixing the colour toward ember; the bike's vertex shader writes 0. |
| `src/parity/` | A `?lib=node` mode for `node()`; `mech.reflow` in the sampled states. |
| **New** `src/network/` | `generate.ts` (§3.2), `cluster.ts` (§3.3, incl. `firstStack()`), `schedule.ts`, `review.ts` (`ringAt`), tests. |
| **New** `src/scene/node/` | `nodeSystem.ts` (five meshes: nodes, streams, halos, ring, feed; two textures; update from state), `node.glsl` + `node.ts` + `birth.ts`, `nodeLayout.ts`, `shaders/node.vert.glsl`, `stream.vert.glsl`, `halo.vert/frag.glsl`, `ring.vert/frag.glsl`, tests. |
| `src/main.ts` | Create the node system beside the mote system when the stage mechanism is the bike; `update` it each frame; `drawStats` lists its meshes. |
| `src/timeline/keyframes.json` | Act II's tracks (§2.10), the generated splines pasted. |
| `src/timeline/netShots.ts` (+ test) | §3.9. |
| `src/story/05-…13-….md`, `src/story/storyboard.test.ts` | Nine sections; the fence takes a list of storyboard documents, each naming the sections it covers (this one, copy in §1 and timings in §2 up to "### 2.10"); the Act I document keeps its own entries. |
| `src/story/content.test.ts` | The Act II words fence (§1). |
| `src/autoAdvance/plan.ts` | `sceneMotion` gains the five leaves of §2.11 (not `net.growth`, not `clock`). |
| `src/timeline/keyframes.test.ts` | Continuity at the spec → zoom-out boundary; monotone `net.growth` / `net.fix`; the holds rule for births. |
| `e2e/machine.ts` | `visibleMachine` adds the network's born, settled motes (through `node.ts`) and the reflowed bike (through `mote.ts`, which already follows); the clearance test runs over Act II unchanged. |
| `e2e/purity.spec.ts`, `e2e/clearance.spec.ts`, `e2e/parity.spec.ts`, screenshots | Samples and stills for Act II (§6). |
| Compare page | Nothing: the network is not a mechanism and does not appear on the bench. |
| Not changed | `cameraRig.ts`, `attributes.ts`, `layout.ts`, `partTransforms.ts`, the bike mechanism, the ink system, the text engine, anything in Act I's sections. |

## 6. Tests that pin it

Vitest (pure, no browser):

1. **Reflow identity and target.** With `mech.reflow` 0, `mote()` is byte-identical to today on the
   golden states of every Act I section; with 1, every bike mote's position lies on the first stack's
   surface (distance to the box union ≤ 1e-6) with the face's normal; the GLSL declares the same
   `STACK_*` constants and salts the TypeScript exports.
2. **Generator.** `generateNetwork(seed, budget)` is deterministic and seed-sensitive; counts per layer
   at growth 1 are 6 / 40 / 300; every stream joins a child to a parent one layer up (down), the same
   layer (side) or one layer down (the single up-stream, C7 → R1); `child.born ≥ parent.born + 0.5 ·
   parent.dur`; no two nodes of a layer overlap; cracked ⇔ (a stream parent is cracked ∧ born <
   `CLEAN_AFTER`) ∨ the node is `R0`; the scripted table's ids, births, parents, `hiAt`, `fixAt` and
   hero counts are as §3.2; `fixAt` is ordered by (layer, hop, born) among the swept nodes and every
   one lies in [0.64, 0.94]; the hero and person counts and the total fit the budget.
3. **`node()` mirror.** Determinism; a mote is hidden before `settle − W`, in flight through it (on
   the Bezier through its edge's control point), landed after; person motes follow `uFix`, builders
   `uGrowth`; `hi` is 0 before `hiAt`, 1 after, and 0 again once fixed; the flare peaks at `settle`;
   the crack blend is 1 until the fix and 0 after; the GLSL declares the birth constants.
4. **Twelve.** Over the whole up stretch of df-5 (every 0.002 local, both ends), the set of nodes with
   `hi ≥ 0.5` has exactly twelve members, equals {P1, P2, P3, C2…C10}, and `C1`'s and `R0`'s `hi`
   are 0; the next cracked birth is above `G_TWELVE[1]`.
5. **Schedule fence.** `net.growth` sampled at the first local where `net.fix` reaches `R0`'s `fixAt`
   is within 0.01 of `CLEAN_AFTER`; the first clean child of `R0`/`R1` is born after fx-2's page is
   up; `net.growth` and `net.fix` never decrease over the essay; `net.highlight` reaches 0.25 before
   df-5's `at` and holds it to the section's end.
6. **Stops.** The existing one-stop-per-scene tests over the new beats; every Act II stop is at rest
   in the five motion leaves. (The wordless second fix lay between up-1's stop and up-2's; the author deleted the wordless second fix, 2026-10-09: redundant.)
7. **Review.** When the ring is over `V_j` (its hold), `V_j`'s cubes are ≥ 80 % landed; `ringAt` is
   continuous and monotone along the visits; the feed's alpha is 0 before review 1.0 and 1 at 1.2.
8. **Shots.** Every `NET_SHOT` holds at its beat's samples (bearing, elevation, distance, fov, frame in
   network terms); the generated splines regenerate to the keyframes within 1e-3; the orbit's bearing
   is strictly increasing; the dive's path stays ≥ 2 units above the middle layer's slab until it is
   past it.
9. **Holds.** No `net.growth` or `net.fix` hold of ≥ 0.05 local sits within `NODE_FLARE_WIDTH` of any
   birth or fix value (the Act I rule, for the network).
10. **Copy and words.** The storyboard fence against §1 and §2 of this document; the words fence (§1);
    the dwell lint at the lengths above.

Playwright (`?test=1`, 1440×900 and 390×844):

11. **Crack near and far.** At df-1's close shot with `net.fix` forced to 0 and to 1 (`?state=`), the
    frames differ in ≥ 400 pixels inside `C1`'s screen rectangle on the phone (≥ 900 on desktop); at
    fr-1's wide shot the same two states differ in ≤ 20 pixels. The same at tr-2's close shot on `R0`.
12. **Twelve, in pixels.** At df-5's midpoint the canvas has exactly twelve connected components of
    ember-dominant pixels (r > 200, r > b + 90, r > g + 70, area ≥ 30 px: the halos' cores, not their
    skirts) on both sizes.
13. **Pure of scroll.** The purity set gains zoom-out 0.22 (mid-reflow), defect 0.68 (mid-highlight),
    reviewer 0.50 (the ring moving), trace 0.80 (the surge) and fix 0.82 (the sweep): jump vs forward
    vs past-and-back byte-equal.
14. **Clearance.** The existing test over Act II: at every beat sample the visible network (born,
    settled motes, the reflowed bike) starts ≥ 8 px under the panel's bottom on both sizes; a wide
    shot's top never leaves the viewport.
15. **Stills and parity.** Screenshots at every beat's midpoint plus the wordless moments (trace 0.80;
    spread 0.51, the second fix, is gone: the author deleted the wordless second fix, 2026-10-09: redundant) for the no-WebGL stills; `e2e/parity.spec.ts` passes with the reflow in and the
    `node()` mode on.
16. **Budget.** `drawStats()` at lesson 0.9 reports the network's instance count ≤ `NETWORK_BUDGET`
    and the bike's unchanged.

## 7. Tasks (each independently testable)

1. **The generator and the schedule.** `src/network/` (§3.2, §3.3, `review.ts`), `firstStack()`, tests
   2 and 7. Pure TypeScript, no renderer.
2. **The reflow.** Step 3b in both mirrors, the salts, the spliced constants, `uReflow`, the parity
   states; test 1; zoom-out's keys for `mech.reflow`, `drive`, `ink.opacity`, `stage.motes` and the
   S10′ → N1 → N2 moves (needs task 1's `firstStack()` and the first `netShots.ts`). Viewable at
   `?p=` in the zoom-out section with the network still absent.
3. **The node set.** `node.glsl` / `node.ts` / `birth.ts`, `nodeLayout.ts`, `nodeSystem.ts` with its
   five meshes and two textures, the parity mode, `main.ts` wiring, `machine.ts`; tests 3 and 15's
   parity. Viewable with `?state=` overrides of the six scalars before any keyframes exist.
4. **Sections and copy.** The nine story files, the fence generalised to two documents, the words
   fence, the dwell lint, the auto-advance leaves; test 10 and the existing stop tests.
5. **Keyframes, first half.** zoom-out through defect: `netShots.ts` with the shots and the generated
   dive, the network scalars, the twelve; tests 4, 5, 6, 8, 9 for those sections.
6. **Keyframes, second half.** spread through lesson: the up-stream follow, the second dive, the
   ring, the climb, the fan-out, the fixes, the sweep; the rest of tests 4–9.
7. **Pixels and the phone pass.** Tests 11–14 and 16, the stills, then the author's look at both
   sizes at the storyboard's beat midpoints; tune the shots by the clearance test and the ember by
   test 12.

## 8. Risks

- **Phone cost.** 100k bike instances plus ~30k network instances plus the dots: vertex-bound on an
  old phone. The lever is `NETWORK_BUDGET` (the generator scales the filler) and, if needed, dimming
  rather than drawing the bike's reflowed motes past the layers section (a visibility flag on
  `stage.motes` 0 is one line; purity is unaffected). The design spec's per-tier probe is still unbuilt.
- **The crack's legibility at hero density.** 8k motes may not draw lips as clean as the spike's 100k.
  Levers: the hero count, `CRACK_FACE_SHARE` (0.2 → 0.3), the crack-face brightness (1.3 → 1.6), and
  the shot distance (3 → 2.4 radii). Test 11 measures, the author's eye decides.
- **The count of twelve is a schedule, not a law.** Any re-timing of defect's growth keys or of the
  scripted births moves it; tests 4 and 5 fail loudly, which is the point. The generator's scripted
  table is the thing to edit, never the filler.
- **Wide shots versus the text band.** Nine units of network above the target under 24 % of the
  screen and fourteen below it inside 34 %: the distances and the target height are starting values
  and the clearance test will move some of them, as it did Act I's. If a shot cannot clear both ends
  on a desktop screen, the lever is the layer spacing (7 → 6) in one constant, or the bottom disc's
  radius (26 → 22); more elevation is not a lever (§2.12).
- **The warm speckle on the first stack** may read as "marked" at fr-1 (open question 1).
- **Length.** Thirty screens for fifteen pages. The dwell constant is the lever; the tour of the
  layers (2.2) is the first thing to shorten if it drags (each of its holds has 0.5 screen of slack).
- **The far-glow impostor** could read as a different material from the motes at the distance where
  it fades (10–28 px). If it does, narrow the fade band or lower its alpha; nothing else depends on it.

## 9. Decisions and what each costs if wrong

| Decision | Cost if wrong |
|---|---|
| A second mote set with its own `node()` library, not a Mechanism and not `mote()`. | If the author wants one system, the network could be a Mechanism (stacks as parts, births as settle fields) at the cost of unborn motes parked on a spawn shell inside the network and a global twin blend that cannot crack one node; the renderer conventions are shared either way, so the shaders port. |
| Motes fly in along their stream (spawn at the parent), and streams are a separate row of dots. | If the two read as unrelated, the dots can be dropped and the streams drawn by the flights alone (a stream then shows only while its child is being built); or the dots kept and the flights spawned at the shell as the bike's are. |
| Births on one growth clock, with fix, highlight and review on clocks of their own. | One clock would be purer to author but every page's pace would be tied to growth; six leaves cost six tracks and the schedule fence (test 5) keeps them honest. If a leaf proves redundant, folding it into `net.growth` is a generator change (its `At` columns) and a key deletion. |
| The scripted lineage is a table in the generator; the filler is statistical. | If the author re-cuts the story, the table changes and the filler never does; the twelve and the visits are rows, not luck. |
| The crack is in the top-front cube of its stack. | Chosen for the phone's text band; if the author wants it low (as the spike had it), the close shots need a higher elevation and the clearance test says how much. |
| Ember `#FF6B57` for the highlight, cool white for the ring. | Two constants in two fragment shaders. If red reads as too loud, a desaturated rose keeps the hue distance from the amber; if the ring should be blue (the reviewer is an agent), one constant. |
| The highlight never goes up on its own (page 8 spreads down and sideways; `R0` lights at the end of the climb), and the fan-out is a surge along hops from `R0`. | If the author wants the source implicated earlier, `R0`'s `hiAt` is one number. |
| `R1` is reached by the surge through the up-stream loop; there is no direct top-layer stream `R0` → `R1`. | If "over to the second defective stack at the top" wants a straight line at the top, the generator adds one `side` edge at the top (the design spec has no rule-to-rule flow, so it is a design change, open question 2). |
| The fix lands warm motes from above and closes the lips; the warm dusting stays. | If the author wants the fixed cube indistinguishable afterwards, give person motes a death window (fade their brightness to 0 over the next 0.05 of `net.fix`): one line in `node()`. |
| The far-glow impostor and the highlight halo are one quad per node. | If the impostor is unwanted, set its term to 0 and the halo stays; if the halo is unwanted, the ember on motes and streams still carries the highlight but the twelve are harder to count on a phone. |
| The reflow is a seed-hashed scatter onto the stack's faces, not a spatial projection. | If the author wants the bike to visibly fold into the stack (wheels to one face, saddle to the cap), replace `moteStackRest(seed)` with a nearest-surface map of the posed rest: same hook, both mirrors, and uneven face density. |
| Glow normalisation per node (`glow = refDensity / density`). | If heroes still read brighter, the exponent (1 → 0.8) is one constant; if plain stacks read too dim near, raise their count (the budget lever). |
| Wide shots nearly level (12–16°) at 60 units, targeting (0, 10, 0); close shots at three radii; the lesson shot high. | The clearance test decides; every number in §2 is a starting value. If the level shots read as flat, raise the layer spacing (7 → 8) rather than the elevation: elevation interleaves the layers (§2.12). |
| Thirty screens. | The dwell constant and the layers tour are the levers; the lint keeps the floor. |

## 10. Open questions for the author (at most three)

1. **The first stack's warm speckle.** After the reflow the bike's warm core motes (15 %) sit on the
   first stack, so the one stack a person looked closely at is faintly warm for the rest of the act.
   Keep it (it is true, and far shots barely show it), or fade those motes to blue under zo-2 so that
   "every stack has the same glow" is exact?
2. **"Over to the second defective stack at the top."** As designed, the surge reaches `R1` through
   the loop that made it (down to the plans, to `C7`, up its stream) and arrives at the top last, which
   says "one mistake, copied, and it came back up". A straight stream across the top from `R0` to `R1`
   would match the words more literally but adds a rule-to-rule flow the agreed design does not have.
   Which?
3. **The second fix's stack.** The wordless dive on page 10 goes to `C12`, a code stack built from
   `P2`. Should it instead be one of the twelve the reader has just counted (say `C5`), so the fix
   visibly subtracts one from the count the reader holds in mind, at the cost of the twelve having
   been lit a page earlier?

## 11. Rulings (2026-10-07)

The author: "Let's start with the full 30 and see how it feels before we trim." The three questions in §10
were left to the controller, who ruled:

1. **The first stack's warm speckle fades** to the same glow as every other stack under zo-2, so "from far
   away, everything looks right" is literally true. (Cost if wrong: one key.)
2. **The surge keeps the loop path** (down to the plans, to C7, up its stream to R1): it is the agreed design
   and it shows the defect coming back up. (Cost if wrong: one scripted stream.)
3. **The second fix visits one of the twelve** (C5), so the count the reader holds visibly drops by one.
   (Cost if wrong: one lineage entry.) Superseded: the author deleted the wordless second fix, 2026-10-09: redundant; C5 is swept under fx-4.

Also: no highlight of any kind before the defect is found (fr-1 is all one glow); the mock frame "far" shows
highlights only because the mock reused one render.

### As built (Tasks 2 and 3, 2026-10-07)

- **Close-up gain for hero stacks.** §3.3's glow normalisation alone left a hero stack (C1: about 0.0075 a
  mote) invisible at its close shot. A stack with glow under 1 now rises toward glow 1 as its on-screen radius
  grows from 120 to 300 CSS px; below 120 px it keeps the designed glow, so every far and wide shot is as §3.3
  says. It is pure (a function of the camera, so of scroll). This breaks "the same glow at any distance" for
  heroes only once they are big on screen (the dives, the climb onto R0). Ratified by the controller.
- **Zoom-out stays close.** On a phone, any pull-back past about 8 units sweeps the plans (y 7) and rules
  (y 14) down through the text band, at every elevation, target height and bearing tried. So N1 is elevation
  14 at distance 8 and N2 is target N0 at distance 8, bearing 40, elevation 18: a small swing round the first
  stack while new stacks appear round it, not the pull-back §2.1 drew. The layers section's first move must
  bring the upper layers in without crossing the band (Task 5).
- **Streams flow parent to child on every edge**, the up-stream included (C7's top to R1's foot), so the
  defect visibly climbs (§3.6); `stream.ts` is the shader's TypeScript twin and its test pins the direction.

### As built (Tasks 5–7, 2026-10-07)

**The page-turn moves.** On a phone the text band is a thin strip at the top of the frame, so a stack
that starts above the frame and ends inside it (or the other way) crosses the band unless it leaves by a
side. Every rise, drop, pull-back, dive and pull-out searched with the clearance measure crossed it. So
each band-crossing move leaves (outCubic, at speed) as its page starts to fade and stands on a waypoint
above or below every stack by the time the next page is fully up, then eases home under the next line:
the rise into ly-2, the drop into ly-4, the pull-back into ly-5, the dive from far into df-1 (out of
df-1, so df-1 comes up already close), the pull-out into df-3, and the move from up-2 into the
reviewer's shot. The second fix's dive and pull-out run in its wordless stretch. Each such stop ends the
instant its move leaves, text whole (`PAGE_TURN_MOVES` in the planner's tests). The author has not yet
seen them in motion.

**Shots that moved, and why** (the clearance test is the arbiter unless said):
- N3 → N4: the rise passes `rise` (above every stack, nearly level) as ly-2 comes up.
- N5: elevation 18, distance 32 (from inside the layers the rules sat in a desktop band).
- N6: bearing 60, elevation 24, distance 6 (from further out the plans overhead sit in a phone's band).
- N7 → N7′: the orbit ends at far 0.92 and holds, so the dive leaves from rest.
- N8: bearing −10, elevation 16 (a far plan sat in a phone's band).
- N9: bearing −30, elevation 20, distance 66, not 50, 14, 60: from bearing 50 the three lit plans stand
  one behind another and the twelve read as ten shapes; from here test 12 counts twelve on both sizes.
  The pull-out's waypoint over the network turned with it (bearing −20, elevation 16, not 50 and 14).
- N10: R1 from bearing 75, elevation 25, distance 20 (the design's shot stood inside R0's reach).
- N11: C5's crack (ruling 3), bearing −35; its hold runs to 0.55 so C5's fix lands under it.
- N13: the visits from high behind (−170, 65, 42, frame 0.5); every closer view put rules and plans in
  the band. N14 is dropped: the climb starts from N13 and ends at trace 0.34, so tr-1's stop is on the
  source.
- N15: distance 6 (at 5.5 the camera stood inside R0's reach).
- N15′ and N17: distance 12 and frame 0.75, not 5.5 and 1: from any nearer the warm motes cross a
  desktop band at the instant they all count as landed (at 11 by 2 px, at 10 by 79), and at frame 1 the
  rule's body ran off the bottom of a phone.
- N18: target (0, 13, 0) at 36 (a far rule sat in a desktop band).
- N20: target (0, 11, 0) (the same).

**Clocks moved for the picture.** Under up-1, growth reaches R1's birth at spread 0.1 (not 0.2) and the
highlight rises 0.25 → 0.30 over 0.1–0.2 (not 0.30–0.38), so the rule the line names is forming and lit
while the line is up. The highlight's last fade runs fix 0.90–0.96 (not 0.98), before fx-4's stop, so
every stop is at rest (§6 test 6, no exception).

**The ring goes.** `net.review` holds at 1.2 to fix 0.68 and runs to 2 by 0.96 with the sweep (§2.11's
1.5–2 fade-out), so the ring and its feed are gone before the lesson, whose frame is the network alone.

**The halo, held to a core.** A halo's radius is capped at 0.15 of the screen's shorter side (not
120 px); its far glow and its highlight fade as its stack's radius grows from 0.15 to 0.35 of that side,
so a stack near the camera is carried by its motes, not by fog. The surge's flash does not fade (it is
what singles R0 out under tr-2); only the cap holds it. A lit halo is tighter and fuller than the far
glow (1.0 × the stack's radius at alpha 1.0, not 1.2 at 0.6), so lit neighbours stay separate shapes.
Every stack in a wide shot is smaller than the fade's start, so wide shots keep §3.8's far glow.

**The look on a phone.**
- A rule hero's crack cube (R0, R1) is sampled eight times denser than the rest of its stack, and each
  of its motes carries an eighth of the light (a per-mote `share`, in both mirrors), so the crack reads
  up close (test 11) and the cube is no brighter from afar.
- Motes are drawn 1.5, 2.2 and 3.2 times a bike mote's size by layer (code, plan, rule), so plans and
  rules read as stacks at medium range; from afar every mote is clamped to a pixel, as before.
- Landed motes are brighter (0.8 of the glow, not 0.5), and the first stack ends zoom-out at
  `stage.motes` 0.05 (not 0.03) to match its neighbours.

**Tests as built.** Test 11 counts changed pixels inside the stack's rectangle, as §6 says, with the
highlight held at 0 in both frames (a fix also puts a lit stack's light out). Near: C1 at df-1, R0 at
tr-2's close shot (the hold on its crack while tr-2 is up, trace about 0.47) and at its fix close-up, and
R1 at its fix close-up. Far: C1 and R0 at fr-1, where the rectangle must be at least 100 px and drawn in
at least 20 px, so the far half cannot pass by being empty. One carve-out, ratified by the controller:
the fix's own warm motes (§3.7 means them to be seen at any distance) are not the crack, so a changed
pixel whose change has amber's channel order (red rising, red's rise ≥ green's ≥ blue's: screen-blended
amber over the stack, and nothing else) is left out of the count the limits apply to. Each assertion
reports both counts, with and without the carve-out. The clearance test also checks every fix at the
instant its warm motes are all half landed (C1's, R0's and R1's among them), and that a wide shot's top
(points above the screen counted; N18 and N20 count as wide) stays under the band (test 14). Tests 12 and
16 are as §6; test 12's smallest phone shape is 36 px against the 30 px floor, deterministic under the
pinned renderer but fragile to a renderer or look change, which is what it is for.

**Phone budget.** No device tier: frame times in the test browser are bound by the display's refresh
(a 17 ms median at both sizes and both budgets), so they cannot say whether a phone needs one; a phone
draws the desktop's 100k bike and 76k network motes. A tier waits on a measurement on a real phone.


## 12. The author's first look (2026-10-07): a powers-of-ten zoom, and stacks that read as cubes

The author watched the first full cut on a phone and said, at zoom-out's end:

> The bike stack is huge compared to the others. Makes it look special, such isn't the goal. Should we
> keep zooming out / shrinking it at the same time as transforming it from bike shape so it looks the
> same as the others? Transforming to cubes should happen at the same time as other cubes coming out. It
> should look and feel like a zoom out like those scenes where the camera moves out from a place on the
> street to earth to solar system to galaxy.
>
> The other things are really small, are they all dots? Shouldn't we have some more square
> configurations?

Two causes, both ours. **The first stack looks special** because the camera never pulls back (§11 "As
built": a straight pull-back sweeps the plans and rules through the text band), so it stays near and
large, and because it is drawn by the bike's hundred thousand motes while a plain stack has about a
hundred and twenty, so it is solid where they are speckle. **The others read as dots** because a plain
stack is a sparse speckle at medium range and, past ten pixels, its far body is a round glow (§3.8).

### 12.1 Stacks read as cubes at every distance

- **A cube body for every stack.** One instanced box per cube of every stack (the network's boxes, from
  `src/network/`; about 2,000 instances, twelve triangles each): faint translucent faces, a little
  brighter on the faces toward the key light, and a thin brighter edge, in the agent blue at the
  network's glow. It is born with its cube (the cube's own birth window, as its motes are), scales
  with `net.show`, and carries the highlight's ember and the fix's warmth as the motes do. It replaces
  the round far glow (§3.8's `lod` term) as what gives a small stack its body: at any distance a stack
  is a little brick stack, never a dot. The halo quad stays only as the highlight's and the surge's
  glow (the twelve must still count as twelve, test 12).
- **The motes stay** as the texture on and around the cubes (the dust they are made of, landing as
  they are built); the box body is what reads at a distance.
- **The first stack is drawn like every other stack.** N0's boxes are drawn by the node set too (the
  ruling "N0's cubes are not drawn twice" is withdrawn). As the camera recedes the bike's motes hand
  over to it: `stage.motes` falls to 0 by the end of zoom-out, so at the end the first stack is one
  stack among many, with the same body, density and glow.

### 12.2 The zoom-out is one continuous pull-back from overhead

- **Powers of ten, literally overhead.** The camera rises from Act I's last shot to look straight down
  on the bike, and then pulls straight up, without stopping, through the whole of zoom-out: from the
  one bike, to its stack among a few neighbours, to a field of stacks. Seen from overhead the layers
  stack toward the camera instead of rising up the screen, so the upper layers do not sweep down
  through the text band the way they do in a side-on pull-back (§11 "As built"); the clearance test
  is the arbiter, as always. The layers section then swings down to the side view its lines need
  ("At the top… In the middle… At the bottom…"), riding the page turn as Task 5's moves do.
- **Reflow and births together.** The bike loosens into cubes while its neighbours are being built
  round it: the first neighbours are born as the reflow begins, not after it, so "the bike becomes a
  stack" and "the agents build all day" are one motion seen from further and further away.
- **Shrinks to match.** By zoom-out's end the first stack is on screen at the size of its neighbours
  and drawn as they are (§12.1), so nothing marks it out.

### 12.3 Tasks

8. **Stacks as cubes.** The box body (§12.1) in `src/scene/node/` (instanced boxes, born and lit
   like the motes, a function of state only), the halo reduced to the highlight's and surge's glow,
   N0 drawn by the node set, the mote hand-over; tests: purity, a stack's body visible at a wide shot
   as a rectangle-ish blob (not a disc), the twelve still twelve, clearance and parity unchanged.
9. **The powers-of-ten zoom-out.** Re-key zoom-out's camera as one continuous overhead pull-back (a
   generated spline, held by a test), the reflow and the first births together, `stage.motes` to 0;
   the layers section's first move from overhead to its side view on the page turn. Search candidate
   paths numerically with the clearance measure first.

### As built (Task 8, 2026-10-07)

*Superseded by the galaxy (docs/specs/2026-10-07-galaxy-orbits.md): the stacks, their cubes, crack and halos below were removed when the galaxy became the scene, in the commit that added this line.*

- **The bodies.** `src/scene/node/box.ts` and `box.glsl` are a mirror pair (`?lib=box` on the parity
  page compares every output), over one instanced mesh, `net-boxes`: a unit box per cube of every stack,
  N0's included, front faces only, screen-blended with the motes. A body lands at the middle of its
  cube's mote landings (`cubeLanding`, shared with the motes) through the motes' own `nodeSettle` and
  `nodeArrival`, is scaled by `net.show`, and takes the highlight's ember and the fix's warmth through
  `nodeLight` and the network palette (`NODE_PALETTE` in birth.ts, spliced; a test holds it to the
  motes' fragment colours). Faces: alpha 0.07, plus up to 0.08 on a face square to the key light; a
  1 CSS px edge at alpha 0.32. A fixed crack cube's body is mixed halfway to the person's amber.
- **The crack: split, not left out.** A cracked stack's crack cube is two body instances, one per lip.
  Each keeps only its own side of the jagged plane (`crack.glsl`, the GLSL mirror of `crackLevel`, its
  constants generated from `crack.ts`) and moves half the gap off it while the crack is open, as the
  motes do, so no body paints over the crack. A body is a filled surface, and a gap of a few pixels
  through it reads where the motes' sparse lips did not (R0's gap is about 3.6 px at fr-1 on a desktop,
  and test 11's far half failed at 35 changed pixels), so the body opens only as the gap grows from 5
  to 10 CSS px on screen (`NODE_BOX_CRACK_PX_*`), and is whole below that. Every close shot's gap is
  wider (C1's about 30 px, the rules' about 17).
- **The halo is the highlight's and the surge's glow only.** `lod` is gone. A lit halo's alpha is 1.35
  (the far glow's 0.35 and the highlight's 1.0 it summed to over a small stack), and from afar a lit
  stack's body gives way to its halo by the halo's own fade (`nodeHaloNear`, shared by both shaders):
  drawn under the glow, the body's faces and edges whitened its core, which cut the end-on plan's core
  into pieces and shrank a code stack's under test 12's floor. Close up, where the halo fades, the lit
  body is drawn in ember. Test 12 counts twelve on both sizes.
- **N0 is drawn by the node set,** with a plain code stack's motes and glow, and zoom-out's
  `stage.motes` falls to 0 by 0.9 (was 0.05), so the bike's motes hand over to it; every later section
  holds 0.
- **A stack is not a disc** (e2e/network.spec.ts): at N9 (defect 0.89), every lone plain stack (clean,
  built, its box hull's circumscribed circle at least 8 CSS px in radius and clear of every other
  stack's by 1.2 times the two radii, under the text) lights at least 80 % of its hull's pixels and at
  most 10 % of the rest of the circle. The round far glow failed it both ways: a small plan's disc lit
  74 % of the ring on a phone, and a larger stack's speckle lit 17 to 45 % of its hull.
