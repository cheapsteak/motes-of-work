# Act II: guidance that is wrong but consistent with the code

*Status: agreed design direction, not yet storyboarded or planned. Date: 2026-10-05 (decisions made
2026-10-03 in conversation with the author, written down here so they survive). Builds on the design
spec docs/specs/2026-10-02-motes-of-work-design.md §2 thesis and §4 Act II, whose II.3 "Leverage" beat
this replaces.*

## The author's intent (paraphrased from their words)

The most damaging instances are pieces of guidance that are internally consistent with the code: the
implementation is correct, but the guidance is flat wrong. In a real repository's history, a security
rule once wrongly placed a third-party service inside a security boundary, and a lot of code
materialised on that guidance. The goal is to instil the importance of reviewing this particular type
of guidance: the type that creates more code, and the type that later LLM sessions read. It need not be
a physical object: abstract streams and nodes, not a machine.

The author on the imagery: it is hard to tell a wrong node from a right one, especially from far away;
that is why this kind of error is dangerous. Up close you can spot the difference, but metastasis is the
failure mode: a human cannot zoom in and fix nodes faster than many agents create new faulty ones.
Wanted: nodes being created, zooming in and fixing, zooming out, and the bad nodes still being created.
Nodes are clusters of blocks. It is not imperative that a bad node shows why it is bad.

## Decisions so far

| Decision | Choice | Why |
|---|---|---|
| Placement | Act II's central beat, replacing II.3 "Leverage" (show leverage through a mistake instead of asserting it). The bike stays Act I (within one piece of work); Act II (across many pieces of work) moves into an abstract node-and-stream world instead of the old "workshop full of machine copies". Later Act II beats (overload, promotion, guidance about guidance) would live in the same world, designed later. | Author approved |
| The defect | **A hairline crack** in one block of a node: invisible from far away, a bright jagged line up close. Chosen by eye from a spike comparing crack, hollow block, tilted block, mirrored spiral and a plain control (the spike's lesson: a plain gap is invisible even up close because the cloud is see-through; motes must sit on the crack's own faces). A node built from a cracked node is cracked too. | "crack works, go with that" |
| Nodes | Small clusters of stacked blocks built from motes, block by block as motes settle. Bigger and further up for durable guidance, smaller and lower for code. | Author: "clusters of some kind of blocks" |
| Streams | Sessions reading a node. Agent motes flow along a stream and settle into new nodes. | |
| Layers | Three, stacked vertically, slow at the top and fast at the bottom (pace layering): **durable guidance** (top: instruction files, rules, decision records, skills, reviewer prompts; few, large, slow, read by nearly every session); **specs** (middle: design docs and plans, one per piece of work; a whole feature's code is generated from each, and later sessions reread them); **code** (bottom: functions, modules, tests; many, small, fast). Shared code lives in the code layer. | Author: "middle layer should maybe be specs" — it also ties to Act I, which was about one spec |
| Flows | **Down:** guidance into specs, specs into code. **Sideways:** code copying nearby code, specs reusing earlier specs. **Up:** code turning back into guidance (comments, decision records, reviewer prompts written from what the code does). A crack that loops back up is in the top layer twice and spreads from both places. | Matches the real history: one wrong rule → specs and a decision record → code → more code copying it → comments and a lint docstring restating it → the reviewer prompt telling reviews not to flag it |
| Ending | Fix the source, not the nodes. | |

## The six beats (agreed shape; copy is draft)

1. **Wide.** A healthy-looking network grows across the three layers, every node the same glow. "From here, every node looks right."
2. **Zoom in on one node.** The crack shows. Warm human motes rebuild the block and it is whole again. "Up close you can see it, and fix it."
3. **Zoom out.** While you were close, the network grew. A highlight shows the cracked lineage, still spawning, spreading down and sideways, and a thin stream climbing back up into a second guidance node. A tally: 1 fixed, 12 created.
4. **Again, faster.** The highlighted tree is bigger. "You can't out-review agents one node at a time."
5. **Trace upstream.** Every cracked branch converges, up through the layers, on one large source node and the guidance nodes it seeded, including the reviewer's: the stream feeding the review lens comes from the same source. "What looked like independent confirmation was one mistake, repeated."
6. **Fix the source.** Human motes rebuild the source and put a fence at its outflow; the nodes the up-streams created are swept too, or the crack comes back down. New growth comes out whole, and existing cracked nodes are swept by following their lineage. "Review hardest the guidance that generates code and that other sessions read. Check guidance written from code against the world, not against the code it came from."

## Open

- **Layer labels:** labelled ("guidance", "specs", "code", with small examples such as "instruction files, rules" beside the top one) or unlabelled shapes the text explains. Labels are concrete for engineers; unlabelled keeps the abstract feel. Undecided.
- **Voice:** Act I became a picture book for developers reading to their kids (2026-10-04); Act II's copy should follow, and per the author (2026-10-05) colour words and "dots" should not be vocabulary the reader must learn in Act I. Decide whether Act II teaches a colour legend or stays wordless about colour.
- **Copy safety:** describe the real history only in shape (a rule that placed a service inside a security boundary, dozens of changes built on it, all approved because the reviewer's own instructions repeated the rule) with no names, services, counts or links.
- **Build:** a network scene, not a mechanism. Still a pure function of scroll: growth from a seed, each node's birth from settle windows, the crack as proven in the spike (a throwaway worktree that has since been or can be deleted; its findings are recorded above). Needs its own storyboard, plan and tasks after Act I settles.
