import os

os.chdir('.')
P = 'docs/specs/2026-10-05-act-1-build-and-orbit.md'
s = open(P).read()


def rep(old, new):
    global s
    assert s.count(old) == 1, (s.count(old), old[:80])
    s = s.replace(old, new)


rep("""timings, it is superseded by §2.1a below and by the storyboard's §2.1
(docs/specs/2026-10-04-act-1-storyboard-and-text-engine.md), which the sync fence reads.
""", """timings, it is superseded by §2.1a below and by the storyboard's §2.1
(docs/specs/2026-10-04-act-1-storyboard-and-text-engine.md), which the sync fence reads.

**Amended again 2026-10-05 (the author, on line 3):** "We add the basket in that animation too. How
about mention something like 'and a basket too for holding stuff'. Can we animate the basket in after
the wheel turns?" And later: add "Mudguards, so puddles don't splash you." after the frame's line,
but without lengthening anything ("it's already a bit long and mudguards aren't central"). So the
brief has six lines: the basket's ("A basket too, for carrying things.") follows the front wheel's
and has a stage of its own after the turn, in which the basket, now a part of its own, gathers above
the fork, drops onto it and hops once; the mudguards' line follows the frame's and comes up inside
the frame's stage as the mudguards set out. The section is 7.2 screens. §2.1b and §2.2a below give
the timings and the windows; where anything above says four lines, four stages or 6.4 screens, they
supersede it.
""")
rep("""| vb-brief (document) | *Build me a bike for getting around town.* (8) · A comfy seat and handlebars, both adjustable to fit tall people and short people. (14) · Two wheels. The pedals drive the back wheel through a chain. (11) · The front wheel turns, so you can steer. (8) · Sturdy, but light enough to carry up the stairs. (9) — 50 in all |""",
    """| vb-brief (document) | *Build me a bike for getting around town.* (8) · A comfy seat and handlebars, both adjustable to fit tall people and short people. (14) · Two wheels. The pedals drive the back wheel through a chain. (11) · The front wheel turns, so you can steer. (8) · A basket too, for carrying things. (6) · Sturdy, but light enough to carry up the stairs. (9) · Mudguards, so puddles don't splash you. (6) — 62 in all |""")
rep("""cloud needs no explanation. vb-2 leads straight into the list. Word count 77 over 6.4 screens.*
""", """cloud needs no explanation. vb-2 leads straight into the list. Word count 77 over 6.4 screens.*

*Amended again 2026-10-05 (the author): the basket's line and the mudguards' line are added (the
header above). The brake calipers are now named by no line: they land with the mudguards, once the
frame is laid, as the levers and bell arrive unremarked with line 1. The basket rides the fork on
both bikes, so the twin meets its line; both mudguards are on, so it meets theirs. 62 words in the
brief, 89 over 7.2 screens. The brief is 62 words, over the 60 a document was allowed: the limit is
64 (`src/story/content.test.ts`), since it is read a line at a time, each line with its own reading
time.*
""")

# §2.1b after §2.1a, before §2.2
rep("""1.0 before the page goes), so a line is read while its parts are in flight.

### 2.2 Settle windows""", """1.0 before the page goes), so a line is read while its parts are in flight.

### 2.1b The basket and the mudguards (amended 2026-10-05)

Every event up to the end of the turn keeps its screen; the basket's stage inserts 0.8 screen after
it, and every later event moves 0.8 later. The mudguards' line takes no time: it comes up inside
the frame's stage. L = 7.2: one screen is 0.13888889 local, a fade 0.01388889; locals are screens /
7.2 written to 8 places (no length near 6.4 + 0.8 gives exact binary or short decimal fractions).

| Event | Screens | Local | Was (screens) |
|---|---|---|---|
| vb-2 | 0.30 | 0.04166667 | 0.30 |
| brief page in: the ask alone | 0.80 | 0.11111111 | 0.80 |
| line 1 up; assembly 0 → 0.33 | 1.10 → 1.60 | 0.15277778 → 0.22222222 | 1.10 → 1.60 (to 0.45) |
| line 2 up; assembly 0.33 → 0.49 | 1.90 → 2.35 | 0.26388889 → 0.32638889 | the same (0.45 → 0.61) |
| drive 0 → 2.0 and the steer cancel | 2.05 → 2.70 | 0.28472222 → 0.375 | the same |
| line 3 up; assembly 0.49 → 0.61 | 3.00 → 3.35 | 0.41666667 → 0.46527778 | the same (0.61 → 0.73) |
| the turn (+1 at 3.60, −1 at 3.90) | 3.45 → 4.05 | 0.47916667 → 0.5625 | the same |
| **line 4 up (basket)**; its motes gather above the fork, assembly 0.61 → 0.698 | 4.20 → 4.50 | 0.58333333 → 0.625 | new |
| the basket drops onto the fork, 0.698 → 0.709 | 4.50 → 4.65 | 0.625 → 0.64583333 | new |
| it hops once and settles, 0.709 → 0.72; held at 0.73 from 4.85 | 4.65 → 4.80 | 0.64583333 → 0.66666667 | new |
| S3 holds through the basket's stage, then S3 → S1 | 4.90 → 5.20 | 0.68055556 → 0.72222222 | 4.05 → 4.40 |
| line 5 up (frame); assembly 0.73 → 0.98, lean-in S1 → S1′ | 5.20 → 5.95 | 0.72222222 → 0.82638889 | 4.40 → 5.15 |
| **line 6 up (mudguards)**, as they set out (assembly 0.87) | 5.62 | 0.78055556 | new, inside the frame's stage |
| assembly 1 | 6.00 | 0.83333333 | 5.20 |
| vb-4 and the lap (`LAP_FROM` 0.86111111) | 6.20 → 7.20 | 0.86111111 → 1 | 5.40 → 6.40 |

The basket's line comes up 0.15 screen after the wheel is straight, and the basket sets out as it
does. The drop is shaped by the basket's own `arrival` curve (`basketArrival` in
`src/mechanisms/bike/index.ts`), a pure function of assembly: held up, 0.22 m above its seat and
tipped a little nose down, while its motes gather (the first 80 % of its window); falling, faster
and faster, to the seat (to 90 %); then one hop of 12 % of the drop and down for good. The camera
stays on S3, where the basket lands under the text; the line keys the drop with three assembly keys
so the fall and the hop each get 0.15 screen. Lines light at locals 0.220, 0.322, 0.461, 0.667,
0.814 and 0.822. Reading time before the next line or the page's end: 0.8, 1.1, 1.2, 1.0, 0.42 and
0.58 screens (the frame's line needs 0.3 and the mudguards' 0.3, so neither needs an exception).

### 2.2 Settle windows""")

# §2.2a after §2.2 (before §2.3)
rep("""Exploded offsets: the frame's becomes the **identity** (it is laid in place, §3.6); every other
offset stays as built in 10-04 §2.7 (late parts from below or level, never through the text).

### 2.3 The steer track""", """Exploded offsets: the frame's becomes the **identity** (it is laid in place, §3.6); every other
offset stays as built in 10-04 §2.7 (late parts from below or level, never through the text).

### 2.2a The windows with the basket's stage (amended 2026-10-05)

A fifth stage needs its own SETTLE_WINDOW lead (0.08) inside assembly 0..1, and the frame needs its
0.14 to be laid tube by tube, so the room came from the core, which lands as one group: its role
window (`ROLE_SETTLE.core`, every machine's) is now [0.08, 0.32], was 0.44. The drive and the fork
move down 0.12; the basket takes the fork's old window; the frame is unchanged. The spec section's
core hold moves from 0.46 to 0.34, where the drive sets out (0.42 − 0.08), as 0.46 was.

| Stage | Parts | Window `[from, to]` | Sets out | Line / threshold |
|---|---|---|---|---|
| core | saddle, handlebars, pedal-left, pedal-right | `[0.08, 0.32]` (role default) | 0.00 | line 1 · 0.32 |
| drive | front-wheel, rear-wheel, cranks, chain-* | `[0.42, 0.48]` | 0.34 | line 2 · 0.48 |
| fork | fork | `[0.57, 0.60]` | 0.49 | line 3 · 0.60 |
| basket | basket (the basket, its stays and its headlamp) | `[0.69, 0.72]`, its own `arrival` | 0.61 | line 4 · 0.72 |
| frame tubes | frame (per-tube slots, §3.6) | `[0.81, 0.95]` | 0.73 | line 5 · 0.95 |
| mudguards | mudguard-front, mudguard-rear (with the rack) | `[0.95, 0.97]` | 0.87 | line 6 · 0.97 |
| fittings | brake-front, brake-rear, ground | `[0.94, 0.97]` | 0.86 | — (land with the mudguards) |
| drift | loose-bolts | `[0.57, 0.59]` | 0.49 | — (now with the fork: the drive's window is below the drift role's 0.5) |

Holds: 0.33, 0.49, 0.61, 0.73, then 1 after 0.98; the spec at 0.34. `data-parts`: line 4 `basket`;
line 5 `frame` (it used to name the brakes and mudguards as well: the mudguards are line 6's, and a
line whose threshold were 0.97 would leave the mudguards' line nothing fresh); line 6
`mudguard-front mudguard-rear`. `briefThresholds`: `[0.32, 0.48, 0.60, 0.72, 0.95, 0.97]`.

The basket is the one body part that comes from above (0.22 m, straight down onto the fork): it is
on the close front shot, and the clearance check (§6 test 14) holds it under the text. Its geometry
is unchanged; it was a weighted solid inside the fork and is now its own part at the same density
(0.22 of the body's), so the fork and the basket together keep the fork's old point count. It is
the last part in the list, so no other part's sample (seeded by its index) moved.

### 2.3 The steer track""")

rep("""- Section length: vibe-build 6 → 8 (Act I 17 → 19 screens). Amended 2026-10-05: 8 → 6.4 (§2.1a);
  the reveal 4 → 3.2 with rv-6 cut (storyboard §2.2); Act I 21 → 18.6 screens.""",
    """- Section length: vibe-build 6 → 8 (Act I 17 → 19 screens). Amended 2026-10-05: 8 → 6.4 (§2.1a);
  the reveal 4 → 3.2 with rv-6 cut (storyboard §2.2); Act I 21 → 18.6 screens. Amended again
  2026-10-05: 6.4 → 7.2 for the basket's stage (§2.1b); Act I 19.4 screens.""")

# §2.5 markdown block
a = s.index('```markdown\n', s.index('### 2.5'))
b = s.index('```', a + 10)
s = s[:a] + """```markdown
<!-- page -->
<!-- beat id=vb-brief at=0.11111111 document -->
<div class="brief">
<p class="brief-ask">Build me a bike for getting around town.</p>
<ul class="brief">
<li data-parts="saddle handlebars" data-at="0.15277778">A comfy seat and handlebars, both adjustable to fit tall people and short people.</li>
<li data-parts="front-wheel rear-wheel cranks chain-* pedal-left pedal-right" data-at="0.26388889">Two wheels. The pedals drive the back wheel through a chain.</li>
<li data-parts="fork front-wheel" data-at="0.41666667">The front wheel turns, so you can steer.</li>
<li data-parts="basket" data-at="0.58333333">A basket too, for carrying things.</li>
<li data-parts="frame" data-at="0.72222222">Sturdy, but light enough to carry up the stairs.</li>
<li data-parts="mudguard-front mudguard-rear" data-at="0.78055556">Mudguards, so puddles don't splash you.</li>
</ul>
</div>

<!-- page -->
<!-- beat id=vb-4 at=0.86111111 -->
Done. Every line on the list is met.
""" + s[b:]

# §6 note
rep("""and a content test keeps Act I's narration free of colour and dot words.*
""", """and a content test keeps Act I's narration free of colour and dot words.*

*Amended again 2026-10-05 (the basket and the mudguards): test 1's stages are core, drive, fork,
basket and frame, end to end, with the mudguards landing after the frame and the bolts inside the
fork's span, and the thresholds `[0.32, 0.48, 0.60, 0.72, 0.95, 0.97]`; test 5 counts the four
stage holds and the spec's 0.34; tests 7 to 9 and 16 hold the same things at §2.1b's locals (the
chain ramp 0.28472222–0.375, the turn 0.47916667–0.5625, the lap from 0.86111111); test 10's fence
covers six lines; a keyframes test holds the basket's motes in the shell until the turn is over and
landed before the frame's line; a bike test pins the basket's drop (held up to 80 % of its window,
a falling curve, one hop under 20 % of the drop, then exactly posed); and test 14 holds the machine
under the lowest brief line that is up (a line not yet up is absent), with the panel's full height
still inside the band. Test 12's "four lines" is six.*
""")

# §7 entry
rep("""- **The author's edits (2026-10-05).** The parts fly in as their line comes up (§2.1a), vb-3 is cut,
  and the section is 6.4 screens. Nothing about the stages, the turn, the frame's lay order or the lap
  changed but their places in the section.""", """- **The author's edits (2026-10-05).** The parts fly in as their line comes up (§2.1a), vb-3 is cut,
  and the section is 6.4 screens. Nothing about the stages, the turn, the frame's lay order or the lap
  changed but their places in the section.
- **The basket and the mudguards (2026-10-05).** Built as §2.1b and §2.2a give them. Three things
  came up on the way. The core's window gave the basket's stage its room (there was none: four
  stages and the frame's lay already filled assembly 0..1 with a lead each). Splitting the basket
  out re-sampled the fork, which moved the camera's anchors (measured from the sample) by a few
  millimetres, and the shot tests by more than their 5 mm tolerance; every camera key was
  re-expressed against the new anchors (the same camera in bike terms) and the lap regenerated, and
  the bench's "Cold open" camera follows (`src/compare/controls.ts`). And the brief's two extra
  lines push the panel's bottom down to 0.40 of a wide screen, so the bike under line 1 and on the
  S2 → S3 move came within the clearance margin of the panel's full height; since a line is absent
  until it is up, the clearance check now holds the machine under the lowest line that is up, and
  the panel's full height inside the 0.42 band, as before.""")
open(P, 'w').write(s)
print('ok')
