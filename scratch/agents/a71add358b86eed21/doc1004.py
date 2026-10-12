p = 'docs/specs/2026-10-04-act-1-storyboard-and-text-engine.md'
s = open(p).read()


def rep(old, new):
    global s
    assert s.count(old) == 1, old[:80]
    s = s.replace(old, new)


rep("""### Section 1: vibe-build (6 screens)
""", """### Section 1: vibe-build (8 screens)

*Amended 2026-10-05 by docs/specs/2026-10-05-act-1-build-and-orbit.md §1: the brakes-and-bell line
is gone, and the section grows to 8 screens. The row below is that table's, as built.*
""")
rep("""| vb-brief (document) | *Build me a bike for getting around town.* · A comfy seat and handlebars, both adjustable to fit tall people and short people. · Two wheels. The pedals drive the back wheel through a chain. · The front wheel turns, so you can steer. · Hand brakes and a bell. · Sturdy, but light enough to carry up the stairs. (55) |""",
    """| vb-brief (document) | *Build me a bike for getting around town.* · A comfy seat and handlebars, both adjustable to fit tall people and short people. · Two wheels. The pedals drive the back wheel through a chain. · The front wheel turns, so you can steer. · Sturdy, but light enough to carry up the stairs. (51) |""")
rep("""The brief's lines keep their part mapping (`data-parts`, unchanged ids) and light in reading order
as their parts land: seat and handlebars (assembly 0.45), wheels and chain (0.72), front wheel (0.80),
brakes (0.87), frame (0.95). Every line is met by the twin: the saddle telescopes in the mast and the
bars clamp into the stub, so "both adjustable" holds; the chain drives the back wheel; the front wheel
turns; the levers are on the bars; the frame is a frame.""", """The brief's lines keep their part mapping (`data-parts`) and each comes up on its own (`data-at`,
§3.5), before its parts set out; each lights in reading order as its parts land: seat and handlebars
(assembly 0.44), wheels and chain (0.60), front wheel (0.72), frame with its fittings (0.97). The
brake calipers, mudguards and rack are fittings of the frame and land with it, under the last line;
the levers and the bell are on the bars and arrive with line 1, unremarked. Every line is met by the
twin: the saddle telescopes in the mast and the bars clamp into the stub, so "both adjustable" holds;
the chain drives the back wheel; the front wheel turns; the frame is a frame.""")
rep("""- vibe-build: A cloud of small blue dots. They fly in and build a bicycle part by part: seat and handlebars, wheels and chain, the front wheel, the brakes, then the frame, as the lines of a list light up one after another.""",
    """- vibe-build: A cloud of small blue dots. They fly in and build a bicycle part by part as the lines of a list appear one after another: seat and handlebars, wheels and chain, the front wheel, then the frame, laid tube by tube. The finished bicycle runs while the view circles it.""")

# §2.1: the new table, local first (the sync fence reads the first number of the third column).
start = s.index("### 2.1 vibe-build (L = 6, fade 0.017)")
end = s.index("### 2.2 reveal")
s = s[:start] + """### 2.1 vibe-build (L = 8, fade 0.0125)

*Amended 2026-10-05: this is docs/specs/2026-10-05-act-1-build-and-orbit.md §2.1 as built (each
row there gives screens and local; here local comes first, then screens). The words come before
the parts: a brief line comes up from nothing, is read, and only then do its parts set out. The
front wheel's turn is its own segment, and the frame is laid tube by tube (that document's §3). S4 is
retired with the brakes line.*

| Beat | Page | Appears → leaves (local, then screens) | Camera | Motion while it is up |
|---|---|---|---|---|
| vb-1 | 1 | 0 (no fade-in: the essay opens on it) → dims at 0.0375 | S0: target whole, bearing 50, elev 10, d 6.0, fov 40, frame 0. The spawn shell fills the frame as a starfield. | assembly 0, drive 0, steer 0, variant 1, vibed 1. Nothing moves. |
| vb-2 | 1 | 0.0375 (0.30 screens) → dims at 0.10 | S0 | As above. |
| vb-3 | 1 | 0.10 (0.80 screens) → page out ends 0.175 | S0 → S1 over 0.10–0.175 (the camera comes down into the cloud). | As above: the dots are the shell, which is what "see the blue dots" points at. |
| vb-brief | 2 | 0.175 (1.40 screens) → page out ends 0.875. Only the ask is on the page until line 1 comes up. | S1: target whole, bearing 55, elev 8, d 4.6, fov 40, frame 0. Holds to 0.37. | assembly 0: the shell drifts, nothing has set out. |
| line 1 appears (seat, bars) | 2 | 0.2125 (1.70), up from nothing over one fade; read until 0.28125 | S1. | assembly 0 held to 0.28125, then 0 → 0.45 over 0.28125–0.34375: the core flies in (saddle, bars, pedals). drive 0. |
| line 1 lights | 2 | 0.342 (threshold 0.44) | S1. | assembly 0.45 held. |
| line 2 appears (wheels, chain) | 2 | 0.3625 (2.90); read until 0.4125 | S1 holds to 0.37, → S2 over 0.37–0.41 (target (0.5, 0.4), bearing 95, elev 12, d 3.2, fov 38, frame 1). | assembly 0.45 → 0.61 over 0.4125–0.46875: both wheels, the cranks and the chain. drive 0 → 2.0 over 0.43125–0.5125 (two crank turns); `mech.steer` cancels the drive's own swing so the front wheel stays straight. |
| line 2 lights | 2 | 0.465 (threshold 0.60) | S2. | drive turning to 0.5125, then held at 2.0. |
| line 3 appears (front wheel) | 2 | 0.525 (4.20); read until 0.56875 | S2 holds to 0.53, → S3 over 0.53–0.565 (target (0.95, 0.5), bearing 50, elev 20, d 3.0, fov 36, frame 1). | assembly 0.61 → 0.73 over 0.56875–0.6125: the fork with its basket and headlamp. drive 2.0 held. |
| line 3 lights | 2 | 0.609 (threshold 0.72) | S3. | Still. |
| the turn | 2 | 0.625–0.70 (5.00–5.60); no text changes | S3 holds. | `mech.steer` 0 → +1 at 0.64375 → −1 at 0.68125 → 0 at 0.70, inOutQuad each leg: straight, one lock, the other, straight. Nothing else moves. |
| line 4 appears (frame) | 2 | 0.7125 (5.70); read until 0.75625 | S3 → S1 over 0.70–0.745, then a linear lean-in S1 → S1′ over 0.745–0.85. | assembly 0.73 → 0.98 over 0.75625–0.85: the frame laid tube by tube, the fittings last; → 1 at 0.85625. drive 2.0 held. |
| line 4 lights | 2 | 0.846 (threshold 0.97); the page leaves whole over 0.8625–0.875 | S1′ holds from 0.85. | assembly 1. |
| vb-4 | 3 | 0.875 (7.00 screens) → fade-out ends 1.00 | The lap: S1′ → one full circuit → S1′ (2026-10-05 §4). | drive 2.0 → 2.4: the bike rides as the camera goes round. |

""" + s[end:]

rep("""- Section lengths: vibe-build 3 → 6, reveal 2 → 4, rewind 2 → 1, spec 3 → 6 (17 screens).
- `mech.assembly` in vibe-build: linear segments 0.23→0, 0.48→0.45, 0.56→0.72, 0.64→0.80, 0.72→0.87,
  0.80→0.95, 0.85→1 (so each brief line lights at the local progress its row says).
- `mech.drive` in vibe-build: 0 until 0.52, then 0.56→0.25, 0.64→0.9, 0.72→1.3, 0.80→1.6, 1.0→2.0;
  reveal 0.14→2.6, 0.26→2.9, 0.52→3.0, 1.0→3.0. Rewind and spec as today.
- `mech.steer` (new): the two swings above; 0 everywhere else.
- `camera.frame` (new): 1 on S2, S3, S4, S6, S7; 0 elsewhere; eased with the camera moves.""",
    """- Section lengths: vibe-build 3 → 6 → 8 (2026-10-05), reveal 2 → 4, rewind 2 → 1, spec 3 → 6
  (19 screens).
- `mech.assembly` in vibe-build (2026-10-05 §2.4): linear, 0 → 0; 0.28125 → 0; 0.34375 → 0.45;
  0.4125 → 0.45; 0.46875 → 0.61; 0.56875 → 0.61; 0.6125 → 0.73; 0.75625 → 0.73; 0.85 → 0.98;
  0.85625 → 1 (each stage held one flare width past its window's end, so nothing flares at rest).
- `mech.drive` in vibe-build: 0 until 0.43125, 2.0 at 0.5125, held to 0.875, 2.4 at 1.0; reveal
  0.14→2.7, 0.26→2.9, 0.52→3.0, 1.0→3.0. Rewind and spec as today.
- `mech.steer` (new): the cancel over the drive ramp and the turn (2026-10-05 §2.3), and rv-3's swing;
  0 everywhere else.
- `camera.frame` (new): 1 on S2, S3, S6, S7 and the lap's dive; 0 elsewhere; eased with the camera
  moves.""")

rep("""In screens, `dwell_i · L` must be at least `max(0.3, words_i / 40)`. For a document beat the dwell is
measured to the first event that changes it (the first brief line's lighting, read from the assembly
keys): `≥ words / 40` screens (55 words: 1.375; the storyboard gives 1.5, of which 1.4 at full ink).""",
    """In screens, `dwell_i · L` must be at least `max(0.3, words_i / 40)`. For a document beat (amended
2026-10-05) the dwell is the ask's: from the beat's `at` to its first line's `data-at`, for the ask's
own words (8 words: 0.3 screens, as given). Each brief line then has the ordering fence of
2026-10-05 §2.5: none of its parts sets out until it has been up `max(0.3, words / 40)` screens, and
it is never met before it is up.""")

rep("""One document beat, one page, no label (the markup drops `p.brief-label`; vb-2 has just said what the
list is). The ask is the Instrument Serif italic pull-quote; the lines hang with no bullet, no rule, no
box; a line comes up from `--ink-dim` to `--ink` and takes C's faint blue halo when `data-met` lands,
as a pure function of assembly (`src/story/brief.ts`, unchanged). The document beat never dims when
the page's next beat arrives because there is none: vb-4 is on its own page, so the brief leaves
whole after all five lines have lit.""", """One document beat, one page, no label (the markup drops `p.brief-label`; vb-2 has just said what the
list is). The ask is the Instrument Serif italic pull-quote; the lines hang with no bullet, no rule, no
box. Amended 2026-10-05 (§2.5 of that document): each `ul.brief > li` carries its own `data-at` and
is **absent** (opacity 0, still in the accessibility tree) until then; it comes up over one fade, in
`--ink-dim` (its own `--reveal`, `lineReveal` in `src/story/reveal.ts`), and never dims. It turns to
`--ink` and takes C's faint blue halo when `data-met` lands, as a pure function of assembly
(`src/story/brief.ts`, unchanged). The document beat never dims when the page's next beat arrives
because there is none: vb-4 is on its own page, so the brief leaves whole after all four lines have
lit.""")

rep("""<!-- beat id=vb-2 at=0.05 -->
So you write down what a bike needs, and hand the list to an agent.

<!-- beat id=vb-3 at=0.13 -->
See the blue dots? Each one is a little bit of work the agent can do. There are thousands.

<!-- page -->
<!-- beat id=vb-brief at=0.23 document -->
<div class="brief">
<p class="brief-ask">Build me a bike for getting around town.</p>
<ul class="brief">
<li data-parts="saddle handlebars">A comfy seat and handlebars, both adjustable to fit tall people and short people.</li>
<li data-parts="front-wheel rear-wheel cranks chain-* pedal-left pedal-right">Two wheels. The pedals drive the back wheel through a chain.</li>
<li data-parts="fork front-wheel">The front wheel turns, so you can steer.</li>
<li data-parts="brake-front brake-rear handlebars">Hand brakes and a bell.</li>
<li data-parts="frame">Sturdy, but light enough to carry up the stairs.</li>
</ul>
</div>

<!-- page -->
<!-- beat id=vb-4 at=0.87 -->
Done. Every line on the list is met.""", """<!-- beat id=vb-2 at=0.0375 -->
So you write down what a bike needs, and hand the list to an agent.

<!-- beat id=vb-3 at=0.1 -->
See the blue dots? Each one is a little bit of work the agent can do. There are thousands.

<!-- page -->
<!-- beat id=vb-brief at=0.175 document -->
<div class="brief">
<p class="brief-ask">Build me a bike for getting around town.</p>
<ul class="brief">
<li data-parts="saddle handlebars" data-at="0.2125">A comfy seat and handlebars, both adjustable to fit tall people and short people.</li>
<li data-parts="front-wheel rear-wheel cranks chain-* pedal-left pedal-right" data-at="0.3625">Two wheels. The pedals drive the back wheel through a chain.</li>
<li data-parts="fork front-wheel" data-at="0.525">The front wheel turns, so you can steer.</li>
<li data-parts="frame brake-front brake-rear mudguard-front mudguard-rear" data-at="0.7125">Sturdy, but light enough to carry up the stairs.</li>
</ul>
</div>

<!-- page -->
<!-- beat id=vb-4 at=0.875 -->
Done. Every line on the list is met.""")
rep("""length: 6
alt: A cloud of small blue dots. ...""", """length: 8
alt: A cloud of small blue dots. ...""")
rep("""2. Length: 17 screens (rewind cut to 1; spec grown to 6 for the drawing); the dwell constant stays the lever.""",
    """2. Length: 17 screens (rewind cut to 1; spec grown to 6 for the drawing); the dwell constant stays the lever.
   Since 2026-10-05, 19: the cold open grows to 8 for the front wheel's turn and the frame's laying.""")
open(p, 'w').write(s)
