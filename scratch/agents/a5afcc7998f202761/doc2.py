p = 'docs/specs/2026-10-04-act-1-storyboard-and-text-engine.md'
s = open(p).read()


def rep(a, b):
    global s
    assert s.count(a) == 1, a[:80]
    s = s.replace(a, b)


rep("""the **white outline** and the **gold** dots in the spec section; the reveal uses only blue.""",
    """the **ink lines** and the **gold** dots in the spec section; the reveal uses only blue.""")

rep("""### Section 4: spec — the drawing first (6 screens)

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
agent's work (taught in vb-3).""",
    """### Section 4: spec — the drawing first (8 screens)

Workshopped with the author (2026-10-04): before anything is built, the agent draws the bike from
the same list, and makes the same mistake. Caught in a drawing, it costs a moment: you point it
out, the agent redraws, and no frame has to be rebuilt. Only then do the gold dots land and the
agent builds the rest, so Act I ends on a correct, running bike.

*Amended 2026-10-05 by docs/specs/2026-10-05-blueprint-and-build.md §4.1: the drawing is ink on a
sheet of paper, not white lines, and it lifts off the page into the bike before the gold lands; the
section grows to 8 screens. The table below is that one's, as built.*

| Beat | Page | Text |
|---|---|---|
| sp-1 | 1 | Start again. This time, ask for a drawing first. (9) |
| sp-2 | 1 | The agent draws the bike in ink, on a sheet of paper. Nothing is built yet. (16) |
| sp-3 | 2 | Look closely. The seat is on the front again! (9) |
| sp-4 | 3 | You point it out, and the agent redraws it: seat at the back, handlebars at the front. No new frame this time. Just new lines. (25) |
| sp-5 | 4 | Now it looks like a bike a person could ride. You say yes. (13) |
| sp-6 | 5 | Then the drawing lifts off the page. Every line stands where a part will go. (15) |
| sp-7 | 6 | The gold dots are where you looked closely. They land first, on the seat, the handlebars and the pedals. (19) |
| sp-8 | 6 | Then the agent builds the rest. (6) |

The reader never moves anything: "you point it out" is the person's part; the redraw is the agent's.
"No new frame" answers the reveal's "to fix it, you need a new frame". The legend: ink lines = the
drawing (taught in sp-2), gold = where a person looked closely (first seen as the person's ring and
tick, named in sp-7), blue = the agent's work (taught in vb-3).""")

rep("""- spec: A thin white line drawing of a bicycle appears, with its seat over the front wheel and its handlebars at the back. The drawing re-forms into an ordinary bicycle. Gold dots land on its seat, handlebars and pedals, then blue dots build the rest, and the finished bicycle rides.""",
    """- spec: A sheet of old paper with a bicycle drawn on it in brown ink, its seat over the front wheel and its handlebars at the back, with scribbled notes in the margins. A gold ring is drawn round the seat; the seat and handlebars are drawn again in their right places and the old lines left faint; a gold tick marks the corner. The page turns away, the lines rise off it into the shape of a bike in the air, gold dots land on its seat, handlebars and pedals, blue dots build the rest, and the finished bicycle rides.""")

start = s.index('### 2.4 spec — the drawing first (L = 6, fade 0.017)')
end = s.index('### 2.5 Keyframe changes, summarised')
s = s[:start] + """### 2.4 spec — the drawing first (L = 8, fade 0.0125)

*Amended 2026-10-05: the drawing is ink on paper and lifts into the bike, as designed in
docs/specs/2026-10-05-blueprint-and-build.md (§2 the look, §3 the lift, §4.2 this table); its §8
says where the build differs. `mech.ghost` and `mech.ghostVariant` (§2.6) stay for Act II and are 0
throughout this section: the ink replaces the dots. Throughout, `mech.variant` is 0 and provenance
is "specced" (warm core, cool body); `mech.steer` 0.*

| Beat | Page | Appears → leaves (local) | Camera | Motion / drawing state |
|---|---|---|---|---|
| sp-1 | 1 | 0.00 → dims at 0.06 | S8 → S11 over 0–0.08 (a push-in; no turn). S11: target (0.55, 0.72), bearing 90, elev 0, d 3.9, fov 35, frame 0: the page square on. | `sheet.opacity` 0 → 1 over 0.02–0.08; `stage.motes` 1 → 0.1 over 0.02–0.08; `ink.flat` 1; `ink.opacity` 0 → 1 over 0.04–0.05; `ink.drawn` 0 at 0.05. assembly 0, drive 0. |
| sp-2 | 1 | 0.06 → page out ends 0.17 | S11. | `ink.drawn` 0 → 1 over 0.05–0.16, linear: construction lines, the wheels, the frame, fork and basket, the drive, the saddle on its mast and the bars on the stub, the fittings, hatching and notes. |
| sp-3 | 2 | 0.17 → page out ends 0.27 | S11 → S11c over 0.17–0.21. S11c: target (0.80, 0.95), bearing 90, elev 0, d 2.2, fov 33, frame 1: the seat on its mast, close on the page. Holds to 0.27. | Still. |
| sp-4 | 3 | 0.27 → page out ends 0.43 | S11c → S11 over 0.27–0.31. | `ink.ring` 0 → 1 over 0.28–0.31: the person's gold ring round the seat. `ink.redraw` 0 → 1 over 0.32–0.41: the old seat, bars, mast, stub, top tube and cables fade to faint, the new seat draws, then the bars, then the frame and cables. `ink.ring` 1 → 2 over 0.39–0.42. |
| sp-5 | 4 | 0.43 → page out ends 0.53 | S11. | `ink.tick` 0 → 1 over 0.46–0.49: the person's gold tick. The corrected page. |
| sp-6 | 5 | 0.53 → page out ends 0.70 | S11 → S10 over 0.53–0.63: the orbit that shows the page as a page. S10: target whole, bearing 40, elev 25, d 4.2, fov 35, frame 0. | `ink.flat` 1 → 0 over 0.61–0.69, rear first: the lines lift off the page; `sheet.opacity` 1 → 0 over 0.60–0.69; `stage.motes` 0.1 → 1 over 0.62–0.72. assembly 0. |
| sp-7 | 6 | 0.70 → dims at 0.84 | S10 → S9′ over 0.70–0.74 (coreFocus → 0.6). | assembly 0 → 0.46 over 0.72–0.84: gold motes land on the lines at the seat, bars and pedals. drive 0. |
| sp-8 | 6 | 0.84 → end (no fade-out: the essay ends on it) | S9′ → S10′ over 0.84–0.90 (coreFocus → 0; bearing 45, d 4.4, frame 0). | assembly 0.46 → 1 over 0.85–0.95: blue builds the body round the gold. drive 0 → 1.4 over 0.90–1.0: the finished bike rides. `ink.opacity` 1 → 0.25 over 0.90–0.97: the lines stay faint beneath it. |

""" + s[end:]

rep("""- Section lengths: vibe-build 3 → 6 → 8 (2026-10-05), reveal 2 → 4, rewind 2 → 1, spec 3 → 6
  (19 screens).""", """- Section lengths: vibe-build 3 → 6 → 8 (2026-10-05), reveal 2 → 4, rewind 2 → 1, spec 3 → 6 → 8
  (2026-10-05: 21 screens).""")
rep("""- `mech.ghost` in spec: as §2.4 (0 → 0.6 traced in, an approval brightening, 0.25 under the finished bike).
- `mech.ghostVariant` (new): 1 in spec until 0.35, → 0 by 0.44.
- `mech.assembly` in spec: 0 until 0.60, 0.46 at 0.74, 1 at 0.92. `mech.drive` in spec: 0 until 0.84, 1.4 at 1.0.""",
    """- `mech.ghost` and `mech.ghostVariant`: not keyed (0 everywhere, 2026-10-05); the spec section's
  drawing is the ink's eight tracks (`sheet.opacity`, `ink.*`, `stage.motes`), as §2.4 gives them.
- `mech.assembly` in spec: 0 until 0.72, 0.46 at 0.84 and 0.85, 1 at 0.95. `mech.drive` in spec: 0
  until 0.90, 1.4 at 1.0.""")
rep("""- **Round 2a (2026-10-05).** The cold open was re-cut""", """- **Round 2b (2026-10-05).** The spec section's drawing is ink on a sheet of paper, redrawn by
  strike and redraw, and lifted off the page into the bike before it is built
  (docs/specs/2026-10-05-blueprint-and-build.md). §1 Section 4, §2.4 and §2.5 above are that build;
  S6g is retired for S11 and S11c. Where it differs from its own design, that document's §8 says so.
- **Round 2a (2026-10-05).** The cold open was re-cut""")
rep("""   Since 2026-10-05, 19: the cold open grows to 8 for the front wheel's turn and the frame's laying.""",
    """   Since 2026-10-05, 21: the cold open grows to 8 for the front wheel's turn and the frame's laying,
   and the spec section to 8 for the drawing on paper and its lift into the bike.""")
open(p, 'w').write(s)
print('ok')
