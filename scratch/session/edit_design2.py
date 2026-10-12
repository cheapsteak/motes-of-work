p = 'docs/specs/2026-10-04-act-1-storyboard-and-text-engine.md'
s = open(p).read()


def replace_block(s, start, end, new):
    i = s.index(start)
    j = s.index(end, i)
    return s[:i] + new + s[j:]


COPY = '''### Section 4: spec — the drawing first (6 screens)

Workshopped with the author (2026-10-04): before anything is built, the agent draws the bike as a
white wireframe from the same list, and makes the same mistake. Caught in a drawing, it costs a
moment: you point it out, the agent redraws, and no frame has to be rebuilt. Only then do the gold
dots land and the agent builds the rest, so Act I ends on a correct, running bike.

| Beat | Page | Text |
|---|---|---|
| sp-1 | 1 | Start again. This time, ask for a drawing first. (9) |
| sp-2 | 1 | The agent draws the bike in thin white lines. Nothing is built yet. (13) |
| sp-3 | 2 | Look closely. The seat is on the front again! (9) |
| sp-4 | 3 | You point it out, and the agent redraws it: seat at the back, handlebars at the front. No new frame this time. Just new lines. (25) |
| sp-5 | 4 | Now it looks like a bike a person could ride. You say yes. (13) |
| sp-6 | 5 | The gold dots are where you looked closely. They land first, on the seat, the handlebars and the pedals. (19) |
| sp-7 | 5 | Then the agent builds the rest. (6) |

The reader never moves anything: "you point it out" is the person's part; the redraw is the agent's.
"No new frame" answers the reveal's "to fix it, you need a new frame". The legend: white outline =
the drawing (taught in sp-2), gold = where a person looked closely (taught in sp-6), blue = the
agent's work (taught in vb-3).

'''
s = replace_block(s, '### Section 4: spec', '### Section alt text', COPY)
s = s.replace(
    '- spec: A close view of the scattered parts. A faint white outline of the intended bicycle appears, and gold dots settle onto its seat, handlebars and pedals.',
    '- spec: A thin white line drawing of a bicycle appears, with its seat over the front wheel and its handlebars at the back. The drawing re-forms into an ordinary bicycle. Gold dots land on its seat, handlebars and pedals, then blue dots build the rest, and the finished bicycle rides.',
)

STORY = '''### 2.4 spec — the drawing first (L = 6, fade 0.017)

New scalar: `mech.ghostVariant` (0..1, default 0): the variant the ghost outline is drawn in,
independent of `mech.variant` (the motes). The ghost is `pose(drive, ZERO_FAULTS, ghostVariant)` and
its points take `mix(local, localTwin, ghostVariant)`, as the motes do; at 0 every existing frame is
unchanged. Throughout this section `mech.variant` is 0 and provenance is "specced" (warm core, cool
body).

| Beat | Page | Appears → leaves | Camera | Motion |
|---|---|---|---|---|
| sp-1 | 1 | 0.00 → dims at 0.07 | S8 → S10 over 0–0.10. S10: target whole, bearing 40, elev 25, d 4.2, fov 35, frame 0 (the reveal's high front three-quarter, a touch closer: the same view in which the reader learned the mistake). | assembly 0, drive 0, ghost 0. The cloud is loose. |
| sp-2 | 1 | 0.07 → page out ends 0.19 | S10. | ghost 0 → 0.6 over 0.08–0.17 with ghostVariant 1: the drawing traces in, in the wrong shape (seat atop the steering post over the basket, bars on the stub). |
| sp-3 | 2 | 0.19 → page out ends 0.30 | → S6g over 0.19–0.23. S6g: as S6 (target `MAST_MOUNT`, bearing 30, elev 28, d 1.3, fov 33, frame 1) — the seat on the front, in white lines. | Still. ghostVariant 1. |
| sp-4 | 3 | 0.30 → page out ends 0.47 | → S10 over 0.30–0.34. | ghostVariant 1 → 0 over 0.35–0.44 (inOutCubic): the lines re-form into the right bike, saddle to the back, bars to the front. Only lines move; no dots are spent. |
| sp-5 | 4 | 0.47 → page out ends 0.58 | S10. | Approval: ghost 0.6 → 0.85 at 0.50 → 0.7 at 0.55 (one gentle brightening, scroll-scrubbed). |
| sp-6 | 5 | 0.58 → dims at 0.76 | → S9′ over 0.58–0.64: coreFocus 0 → 0.6, the contact points nearer, the whole drawing still in view. | assembly 0 → 0.46 over 0.60–0.74: gold motes land on the seat, bars and pedals (each part in place as its window ends). drive 0. |
| sp-7 | 5 | 0.76 → end (no fade-out: the essay ends on it) | → S10′ over 0.76–0.84 (coreFocus → 0; bearing 45, d 4.4, frame 0). | assembly 0.46 → 1 over 0.76–0.92: blue motes build the body round the gold. drive 0 → 1.4 over 0.84–1.0: the finished bike rides. ghost fades 0.7 → 0.25 over 0.84–0.95 (the drawing stays faintly under the real bike). |

'''
s = replace_block(s, '### 2.4 spec', '### 2.5 Keyframe changes', STORY)
s = s.replace('rewind 2 → 1, spec 3 → 4 (15 screens).', 'rewind 2 → 1, spec 3 → 6 (17 screens).')
s = s.replace('- `mech.ghost` in spec: 0.08→0, 0.20→0.6.',
              '- `mech.ghost` in spec: as §2.4 (0 → 0.6 traced in, an approval brightening, 0.25 under the finished bike).\n- `mech.ghostVariant` (new): 1 in spec until 0.35, → 0 by 0.44.\n- `mech.assembly` in spec: 0 until 0.60, 0.46 at 0.74, 1 at 0.92. `mech.drive` in spec: 0 until 0.84, 1.4 at 1.0.')
s = s.replace('### 2.6 Two new SceneState scalars', '### 2.6 Three new SceneState scalars')
s = s.replace('No other SceneState change. Nothing in `mote.glsl` / `mote.ts` changes.',
              '3. **`mech.ghostVariant`** (0..1, default 0): see §2.4. The ghost point pipeline takes the twin\n   positions as the motes do; this is the ghost\'s renderer, not the mote shader.\n\nNo other SceneState change. Nothing in `mote.glsl` / `mote.ts` changes.')
s = s.replace('2. Length: 15 screens after the rewind cut; the dwell constant stays the lever.',
              '2. Length: 17 screens (rewind cut to 1; spec grown to 6 for the drawing); the dwell constant stays the lever.')
open(p, 'w').write(s)
