import os

os.chdir('.')
P = 'docs/specs/2026-10-04-act-1-storyboard-and-text-engine.md'
s = open(P).read()


def rep(old, new):
    global s
    assert s.count(old) == 1, (s.count(old), old[:80])
    s = s.replace(old, new)


# ---- §1 Section 1 ----
rep("""### Section 1: vibe-build (6.4 screens)
""", """### Section 1: vibe-build (7.2 screens)
""")
rep("""vb-2 leads straight into the list. With vb-3 gone and each line's parts flying in as the line
appears, the section is 6.4 screens.*
""", """vb-2 leads straight into the list. With vb-3 gone and each line's parts flying in as the line
appears, the section is 6.4 screens.*

*Amended 2026-10-05 (the author, on "The front wheel turns, so you can steer."): "We add the basket
in that animation too. How about mention something like 'and a basket too for holding stuff'. Can
we animate the basket in after the wheel turns?" A fifth line, "A basket too, for carrying things.",
comes after the front wheel's, and the basket, which used to land with the fork, is now its own part
with its own stage after the turn: it gathers above the fork, drops onto it and hops once. And
later the same day: a sixth line, "Mudguards, so puddles don't splash you.", after the frame's,
with the hard condition that it adds no time ("it's already a bit long and mudguards aren't
central"): it comes up inside the frame's stage, as the mudguards set out. The basket's stage makes
the section 7.2 screens; the mudguards' line adds nothing.*
""")
rep("""| vb-brief (document) | *Build me a bike for getting around town.* · A comfy seat and handlebars, both adjustable to fit tall people and short people. · Two wheels. The pedals drive the back wheel through a chain. · The front wheel turns, so you can steer. · Sturdy, but light enough to carry up the stairs. (50) |""",
    """| vb-brief (document) | *Build me a bike for getting around town.* · A comfy seat and handlebars, both adjustable to fit tall people and short people. · Two wheels. The pedals drive the back wheel through a chain. · The front wheel turns, so you can steer. · A basket too, for carrying things. · Sturdy, but light enough to carry up the stairs. · Mudguards, so puddles don't splash you. (62) |""")
rep("""§3.5) as its parts set out (amended 2026-10-05: no longer before them); each lights in reading order as its parts land: seat and handlebars
(assembly 0.44), wheels and chain (0.60), front wheel (0.72), frame with its fittings (0.97). The
brake calipers, mudguards and rack are fittings of the frame and land with it, under the last line;
the levers and the bell are on the bars and arrive with line 1, unremarked. Every line is met by the
twin: the saddle telescopes in the mast and the bars clamp into the stub, so "both adjustable" holds;
the chain drives the back wheel; the front wheel turns; the frame is a frame.""",
    """§3.5) as its parts set out (amended 2026-10-05: no longer before them); each lights in reading order as its parts land: seat and handlebars
(assembly 0.32), wheels and chain (0.48), front wheel (0.60), basket (0.72), frame (0.95), mudguards
(0.97). (Amended 2026-10-05 for the basket and mudguard lines: the core's window was 0.44 and every
threshold after it moved; the frame's line used to name the brakes and mudguards and light at 0.97.)
The mudguards, with the rack, are fittings of the frame and have their own line; the brake calipers
and the ground land with them, named by no line; the levers and the bell are on the bars and arrive
with line 1, unremarked. Every line is met by the twin: the saddle telescopes in the mast and the
bars clamp into the stub, so "both adjustable" holds; the chain drives the back wheel; the front
wheel turns; the basket rides the fork on both bikes; the frame is a frame; both mudguards are on.""")

# ---- §2.1 ----
rep("""### 2.1 vibe-build (L = 6.4, fade 0.015625)
""", """### 2.1 vibe-build (L = 7.2, fade 0.01388889)
""")
rep("""I). The section goes 8 → 6.4 screens.*
""", """I). The section goes 8 → 6.4 screens. Amended again 2026-10-05 (the author: the basket gets its own
line and is animated in after the wheel turns; then a mudguards line that must not lengthen
anything): the basket's stage adds 0.8 screen after the turn and the mudguards' line comes up inside
the frame's stage, so the section is 7.2 screens. Locals are screens / 7.2, written to 8 places;
every event before the end of the turn keeps its screen, and every one after it moves 0.8 later.*
""")
a = s.index('| Beat | Page | Appears → leaves (local, then screens) |')
b = s.index('\n', s.index('| vb-4 | 3 | 0.84375 (5.40 screens)')) + 1
s = s[:a] + """| Beat | Page | Appears → leaves (local, then screens) | Camera | Motion while it is up |
|---|---|---|---|---|
| vb-1 | 1 | 0 (no fade-in: the essay opens on it) → dims at 0.04166667 | S0: target whole, bearing 50, elev 10, d 6.0, fov 40, frame 0. The spawn shell fills the frame as a starfield. | assembly 0, drive 0, steer 0, variant 1, vibed 1. Nothing moves. |
| vb-2 | 1 | 0.04166667 (0.30 screens) → page out ends 0.11111111 | S0 → S1 over 0.04166667–0.11111111 (the camera comes down into the cloud as the list is handed over). | As above. |
| vb-brief | 2 | 0.11111111 (0.80 screens) → page out ends 0.86111111. Only the ask is on the page until line 1 comes up. | S1: target whole, bearing 55, elev 8, d 4.6, fov 40, frame 0. Holds to 0.22222222. | assembly 0: the shell drifts, nothing has set out. |
| line 1 appears (seat, bars) | 2 | 0.15277778 (1.10), up from nothing over one fade as its parts set out | S1. | assembly 0 → 0.33 over 0.15277778–0.22222222 (1.10–1.60): the core flies in (saddle, bars, pedals) as the line comes up. drive 0. |
| line 1 lights | 2 | 0.220 (1.58; threshold 0.32) | S1 holds to 0.22222222, → S2 over 0.22222222–0.26388889 (1.60–1.90): target (0.5, 0.4), bearing 95, elev 12, d 3.2, fov 38, frame 1, in place before line 2. | assembly 0.33 held. |
| line 2 appears (wheels, chain) | 2 | 0.26388889 (1.90) | S2. | assembly 0.33 → 0.49 over 0.26388889–0.32638889 (1.90–2.35): both wheels, the cranks and the chain. drive 0 → 2.0 over 0.28472222–0.375 (2.05–2.70, two crank turns); `mech.steer` cancels the drive's own swing so the front wheel stays straight. |
| line 2 lights | 2 | 0.322 (2.32; threshold 0.48) | S2 holds to 0.375, → S3 over 0.375–0.41666667 (2.70–3.00): target (0.95, 0.5), bearing 50, elev 20, d 3.0, fov 36, frame 1, in place before line 3. | drive turning to 0.375, then held at 2.0. |
| line 3 appears (front wheel) | 2 | 0.41666667 (3.00) | S3. | assembly 0.49 → 0.61 over 0.41666667–0.46527778 (3.00–3.35): the fork (and, unremarked, the loose bolts). drive 2.0 held. |
| line 3 lights | 2 | 0.461 (3.32; threshold 0.60) | S3. | Still. |
| the turn | 2 | 0.47916667–0.5625 (3.45–4.05); no text changes | S3 holds. | `mech.steer` 0 → +1 at 0.5 → −1 at 0.54166667 → 0 at 0.5625, inOutQuad each leg: straight, one lock, the other, straight. Nothing else moves. |
| line 4 appears (basket) | 2 | 0.58333333 (4.20), once the wheel is straight again | S3 holds to 0.68055556 (4.90): the front, where the basket lands, under the text. | assembly 0.61 → 0.698 over 0.58333333–0.625 (4.20–4.50): the basket's motes gather into it in the air, 0.22 m above its seat on the fork; 0.698 → 0.709 over 0.625–0.64583333 (4.50–4.65): it drops onto the fork, gathering speed; 0.709 → 0.72 over 0.64583333–0.66666667 (4.65–4.80): it hops once and settles; held at 0.73 from 0.67361111 (4.85). drive 2.0, steer 0. |
| line 4 lights | 2 | 0.667 (4.80; threshold 0.72) | S3. | Still. |
| line 5 appears (frame) | 2 | 0.72222222 (5.20) | S3 → S1 over 0.68055556–0.72222222 (4.90–5.20), in place as the line comes up; then a linear lean-in S1 → S1′ over 0.72222222–0.82638889. | assembly 0.73 → 0.98 over 0.72222222–0.82638889 (5.20–5.95), with a key at 0.87 on the way: the frame laid tube by tube; → 1 at 0.83333333 (6.00). drive 2.0 held. |
| line 6 appears (mudguards) | 2 | 0.78055556 (5.62), as the mudguards set out (assembly 0.87, the top tube being laid): no time of its own | The lean-in. | The mudguards and the rack fly in with the brakes and the ground, and land once the frame is laid (0.95–0.97). |
| line 5 lights | 2 | 0.814 (5.86; threshold 0.95) | The lean-in. | The frame's last cable lands. |
| line 6 lights | 2 | 0.822 (5.92; threshold 0.97); the page leaves whole over 0.84722222–0.86111111 | S1′ holds from 0.82638889. | assembly 1. |
| vb-4 | 3 | 0.86111111 (6.20 screens) → fade-out ends 1.00 | The lap: S1′ → one full circuit → S1′ (2026-10-05 §4). | drive 2.0 → 2.4: the bike rides as the camera goes round. |
""" + s[b:]

# ---- §2.5 ----
rep("""- Section lengths: vibe-build 3 → 6 → 8 → 6.4 (2026-10-05), reveal 2 → 4 → 3.2 (2026-10-05),
  rewind 2 → 1, spec 3 → 6 → 8 (2026-10-05: 21 screens; after the author's cuts and the
  simultaneous build, 2026-10-05: 18.6 screens).
- `mech.assembly` in vibe-build (2026-10-05 §2.4, re-timed for the simultaneous build): linear,
  0 → 0; 0.171875 → 0; 0.25 → 0.45; 0.296875 → 0.45; 0.3671875 → 0.61; 0.46875 → 0.61;
  0.5234375 → 0.73; 0.6875 → 0.73; 0.8046875 → 0.98; 0.8125 → 1 (each stage held one flare width
  past its window's end, so nothing flares at rest; each ramp starts on its line's `data-at`).
- `mech.drive` in vibe-build: 0 until 0.3203125, 2.0 at 0.421875, held to 0.84375, 2.4 at 1.0;
  reveal 0.175→2.7, 0.325→2.9, 0.625→3.0, 1.0→3.0. Rewind and spec as today.""",
    """- Section lengths: vibe-build 3 → 6 → 8 → 6.4 → 7.2 (2026-10-05), reveal 2 → 4 → 3.2
  (2026-10-05), rewind 2 → 1, spec 3 → 6 → 8 (2026-10-05: 21 screens; after the author's cuts and
  the simultaneous build, 2026-10-05: 18.6 screens; with the basket's stage, 2026-10-05: 19.4).
- `mech.assembly` in vibe-build (2026-10-05 §2.4, re-timed for the simultaneous build, then for the
  basket): linear, 0 → 0; 0.15277778 → 0; 0.22222222 → 0.33; 0.26388889 → 0.33;
  0.32638889 → 0.49; 0.41666667 → 0.49; 0.46527778 → 0.61; 0.58333333 → 0.61; 0.625 → 0.698;
  0.64583333 → 0.709; 0.66666667 → 0.72; 0.67361111 → 0.73; 0.72222222 → 0.73; 0.78055556 → 0.87;
  0.82638889 → 0.98; 0.83333333 → 1 (each stage held one flare width past its window's end, so
  nothing flares at rest; each ramp starts on its line's `data-at`; the 0.87 key is where the
  mudguards set out, under their line).
- `mech.drive` in vibe-build: 0 until 0.28472222, 2.0 at 0.375, held to 0.86111111, 2.4 at 1.0;
  reveal 0.175→2.7, 0.325→2.9, 0.625→3.0, 1.0→3.0. Rewind and spec as today.""")
rep("""- `mech.assembly` in spec: 0 until 0.72, 0.46 at 0.84 and 0.85, 1 at 0.95. `mech.drive` in spec: 0
  until 0.90, 1.4 at 1.0.""", """- `mech.assembly` in spec: 0 until 0.72, 0.34 at 0.84 and 0.85, 1 at 0.95 (0.46 until 2026-10-05: the
  core's window now ends at 0.32, and the drive sets out at 0.34). `mech.drive` in spec: 0 until
  0.90, 1.4 at 1.0.""")
rep("""| sp-7 | 6 | 0.70 → dims at 0.84 | S10 → S9′ over 0.70–0.74 (coreFocus → 0.6). | assembly 0 → 0.46 over 0.72–0.84: gold motes land on the lines at the seat, bars and pedals. drive 0. |
| sp-8 | 6 | 0.84 → end (no fade-out: the essay ends on it) | S9′ → S10′ over 0.84–0.90 (coreFocus → 0; bearing 45, d 4.4, frame 0). | assembly 0.46 → 1 over 0.85–0.95:""",
    """| sp-7 | 6 | 0.70 → dims at 0.84 | S10 → S9′ over 0.70–0.74 (coreFocus → 0.6). | assembly 0 → 0.34 over 0.72–0.84: gold motes land on the lines at the seat, bars and pedals. drive 0. |
| sp-8 | 6 | 0.84 → end (no fade-out: the essay ends on it) | S9′ → S10′ over 0.84–0.90 (coreFocus → 0; bearing 45, d 4.4, frame 0). | assembly 0.34 → 1 over 0.85–0.95:""")

# ---- §2.7 ----
rep("""  with no reading lead (§2.1). vibe-build is 6.4 screens and the reveal 3.2.
""", """  with no reading lead (§2.1). vibe-build is 6.4 screens and the reveal 3.2.
- **The basket and the mudguards (2026-10-05).** The author asked for the basket to have its own
  line and to be animated in after the front wheel turns, then for a mudguards line that adds no
  time. The basket is its own part (it was geometry inside the fork) with its own stage after the
  turn, where it gathers above the fork, drops onto it and hops once (an `arrival` curve on the
  part; S3 holds through it). The mudguards' line comes up inside the frame's stage, as their motes
  set out, and they land once the frame is laid. To make room for a fifth stage inside assembly 0..1
  the core's role window became [0.08, 0.32] (was 0.44): every hold after it moved (0.33, 0.49,
  0.61, 0.73), and the spec section's core hold is 0.34. vibe-build is 7.2 screens (Act I 19.4).
  The brief has six lines and 62 words, so the document word limit is 64 (§3.3). Adding the basket
  re-sampled the fork and moved the camera's anchors by a few millimetres, so every camera key was
  re-expressed against them, the same shots in bike terms. The clearance check holds the machine
  under the lowest brief line that is up, since lines not yet up are absent (§3.5), and the panel's
  full height still inside the text band.
""")

# ---- §3.1 example ----
old_ex_a = s.index('<!-- beat id=vb-2 at=0.046875 -->')
old_ex_b = s.index('Done. Every line on the list is met.\n```', old_ex_a)
s = s[:old_ex_a] + """<!-- beat id=vb-2 at=0.04166667 -->
So you write down what a bike needs, and hand the list to an agent.

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
""" + s[old_ex_b:]

# ---- §3.3, §3.5 ----
rep("""Other lints (vitest, `src/story/content.test.ts`): per beat ≤ 26 words (document ≤ 60);""",
    """Other lints (vitest, `src/story/content.test.ts`): per beat ≤ 26 words (document ≤ 64; 60 until
2026-10-05, when the brief grew to six lines and 62 words, read a line at a time);""")
rep("""because there is none: vb-4 is on its own page, so the brief leaves whole after all four lines have
lit.""", """because there is none: vb-4 is on its own page, so the brief leaves whole after all six lines have
lit (four until 2026-10-05).""")
open(P, 'w').write(s)
print('ok')
