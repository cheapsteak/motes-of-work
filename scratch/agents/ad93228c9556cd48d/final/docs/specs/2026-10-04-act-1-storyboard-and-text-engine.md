# Act I: storyboard, copy and the text engine

*Status: design for implementation. Date: 2026-10-04. Builds on the design spec
(docs/specs/2026-10-02-motes-of-work-design.md): §2 thesis, §4 Act I, §5.8 the bicycle, §6.1 purity,
§6.2 SceneState, §7 content rules, §8 accessibility. Research behind the engine:
.superpowers/sdd/2026-10-03-plan-3-bicycle/research-text-apparition.md.*

Designed for the tree after the mannequin, the running labels and the text switcher are removed
(text style C is the one style). Nothing here needs the mannequin.

## 0. The shape in one paragraph

The essay is a picture book: each section is a few **pages**, each page a few short **lines** over one
picture. A line appears, by a plain fade, only when it is its turn to be read; the newest line on a
page is full ink and the lines before it dim; a page gives way to the next at opacity 0, so no two
pages are ever on screen together. Every opacity is a pure function of scroll progress (§6.1 of the
design spec): a reader who stops anywhere sees exactly the frame they would see arriving there any
other way. The text sits **above the machine** on every screen: a centred column at the top on
desktop, the full width at the top on a phone. The camera frames the machine low and keeps it out of
the text band, and for every line the camera looks at the thing the line is about while the motion
makes the line true. A line's dwell is bought with scroll distance: `words / 40` viewport heights,
never less than 0.3.

## 1. The copy

Voice: a picture book a software developer reads to a child. Short sentences, concrete nouns, one
idea per line, nothing a child trips on; the adult still lands the thesis (a list that looks complete
but never says how a body uses the thing; the agent builds exactly what was asked; the costly part is
the part a person must say; the warm dots are where a person's attention went). Every line is true
of what is on screen while it is up, and every claim matches the bike. Sentence case. No company,
tool, path or issue names. ~~The colour legend is taught before it is used: **blue** in the cold open,
the **ink lines** and the **gold** dots in the spec section; the reveal uses only blue.~~

*Amended 2026-10-05 (the author): "we don't want readers to have to know what blue and dots mean, at
least not in act 1." Act I's narration teaches no colour legend and never names a colour or calls
the motes dots: vb-3 and rv-6 are cut, and sp-7 says what the person did ("you looked closely")
instead of what colour it made. The picture still colours them (the warm core, the cool body), and
the alt text still describes the colours, since it describes the picture.
`src/story/content.test.ts` fences the words (blue, gold, orange, dot, dots, colour, colours,
color, colors) out of Act I's beats.*

Word counts are in brackets. "Document" marks the brief, a thing handed over, not narration.

### Section 1: vibe-build (6.4 screens)

*Amended 2026-10-05 by docs/specs/2026-10-05-act-1-build-and-orbit.md §1: the brakes-and-bell line
is gone, and the section grows to 8 screens. The row below is that table's, as built. Amended again
2026-10-05 (the author): vb-3 ("See the blue dots? Each one is a little bit of work the agent can
do. There are thousands.") is cut, since readers should not have to know what blue and dots mean;
vb-2 leads straight into the list. With vb-3 gone and each line's parts flying in as the line
appears, the section is 6.4 screens.*

| Beat | Text |
|---|---|
| vb-1 | You want a bike. (4) |
| vb-2 | So you write down what a bike needs, and hand the list to an agent. (15) |
| vb-brief (document) | *Build me a bike for getting around town.* · A comfy seat and handlebars, both adjustable to fit tall people and short people. · Two wheels. The pedals drive the back wheel through a chain. · The front wheel turns, so you can steer. · Sturdy, but light enough to carry up the stairs. (50) |
| vb-4 | Done. Every line on the list is met. (8) |

The brief's lines keep their part mapping (`data-parts`) and each comes up on its own (`data-at`,
§3.5) as its parts set out (amended 2026-10-05: no longer before them); each lights in reading order as its parts land: seat and handlebars
(assembly 0.44), wheels and chain (0.60), front wheel (0.72), frame with its fittings (0.97). The
brake calipers, mudguards and rack are fittings of the frame and land with it, under the last line;
the levers and the bell are on the bars and arrive with line 1, unremarked. Every line is met by the
twin: the saddle telescopes in the mast and the bars clamp into the stub, so "both adjustable" holds;
the chain drives the back wheel; the front wheel turns; the frame is a frame.

### Section 2: reveal (3.2 screens)

*Amended 2026-10-05 (the author): rv-6 ("Look at the colours. Every dot is blue. The agent did all
of it, and nobody looked closely at the parts a person touches.") is cut: it did not make sense to
readers, who should not have to know what blue and dots mean in Act I. rv-5 has its page to itself,
and the reveal closes the gap: 3.2 screens.*

| Beat | Text |
|---|---|
| rv-1 | It runs. Push the pedals, and the back wheel goes round. Turn the front wheel, and it steers. (18) |
| rv-2 | Now try to ride it. (5) |
| rv-3 | The seat is on top of the steering post, over the front wheel. When the wheel turns, the seat turns with it. (22) |
| rv-4 | The handlebars are at the back, where the seat should be. They never turn. (14) |
| rv-5 | You cannot sit up there and hold these down here. The frame is built around the mistake: to fix it, you need a new frame. (25) |
| rv-7 | Every line on the list is met. Nobody wrote down that you sit on the seat and hold the bars. Who would? (22) |

~~rv-6 replaces "Nothing in it is warm": blue was taught in vb-3 as the agent's work, so "every dot is
blue" says, in the legend already learned, that no person's attention is in the machine. The gold
dots are not mentioned until they exist (spec).~~ (rv-6 cut 2026-10-05, above. The ids are not
renumbered: rv-7 keeps its id.)

### Section 3: rewind (1 screen)

| Beat | Text |
|---|---|
| rw-1 | So you take it all apart. (6) |

The author cut the rewind's commentary as long-winded and not essential (2026-10-04): the picture of
the bike coming apart carries it, and sp-1 ("Start again.") picks up at once.

### Section 4: spec — the drawing first (8 screens)

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
| sp-7 | 6 | You looked closely at the parts a person touches, so they land first: the seat, the handlebars and the pedals. (20) |
| sp-8 | 6 | Then the agent builds the rest. (6) |

The reader never moves anything: "you point it out" is the person's part; the redraw is the agent's.
"No new frame" answers the reveal's "to fix it, you need a new frame". ~~The legend: ink lines = the
drawing (taught in sp-2), gold = where a person looked closely (first seen as the person's ring and
tick, named in sp-7), blue = the agent's work (taught in vb-3).~~ Amended 2026-10-05 (the author):
sp-7 was "The gold dots are where you looked closely. They land first, on the seat, the handlebars
and the pedals." It now names no colour and no dots: what lands first is what you looked closely
at, the parts a person touches. The gold still lands first on screen; the words leave it unnamed.

### Section alt text (canvas descriptions, unchanged in role)

- vibe-build: A cloud of small blue dots. They fly in and build a bicycle part by part as the lines of a list appear one after another: seat and handlebars, wheels and chain, the front wheel, then the frame, laid tube by tube. The finished bicycle runs while the view circles it.
- reveal: The finished bicycle runs, pedals turning and wheels spinning, seen from high and in front. Its seat sits on top of a tall steering post over the front wheel, just behind a basket, and turns with the wheel. Its handlebars stick out of a short stub low at the back, and the top tube climbs from them to the seat.
- rewind: The running machine slows, reverses and comes apart into a loose cloud of blue dots.
- spec: A sheet of old paper with a bicycle drawn on it in brown ink, its seat over the front wheel and its handlebars at the back, with scribbled notes in the margins. A gold ring is drawn round the seat; the seat and handlebars are drawn again in their right places and the old lines left faint; a gold tick marks the corner. The page turns away, the lines rise off it into the shape of a bike in the air, gold dots land on its seat, handlebars and pedals, blue dots build the rest, and the finished bicycle rides.

## 2. The storyboard

Conventions. Progress is **section-local** (0..1). `L` is the section's length in screens; a beat's
fade is 0.1 screen = `0.1 / L` local. Camera shots are given in **bike metres** (the constants of
`src/mechanisms/bike/kinematics.ts`: x forward, y up, z the drive side): a target point, a bearing
(degrees in the x–z plane, 0 = seen from the front, 90 = from the drive side, 180 = from behind), an
elevation (degrees above level), a distance (m) and a vertical fov (degrees). The implementer
converts once to the machine-relative keys cameraRig uses (`world = (p − CENTRE) × SCALE`, then
`rel = (world − anchor.center) / anchor.radius` with the whole anchor, or the core anchor where
`coreFocus` is 1) and pins each shot with a test in bike terms, as the existing bearing and elevation
tests do. "Whole" means the whole-machine anchor centre. Reference points (m): `FRONT_AXLE` (1.05,
0.34), `REAR_AXLE` (0, 0.34), `BB` (0.42, 0.27), `HEAD_TOP` (0.83, 0.85), `MAST_MOUNT` (0.78, 0.99),
`STUB_TOP` (0.27, 0.78), `SEAT_CLAMP` (0.26, 0.80).

`frame` is the new `camera.frame` scalar (§2.6): 0 = a wide shot, the machine low-centre; 1 = a
close shot, the subject low-right on desktop and lower on a phone, so what stands above the subject
(the mast above the front wheel, say) is out of the text band.

### 2.1 vibe-build (L = 6.4, fade 0.015625)

*Amended 2026-10-05: this is docs/specs/2026-10-05-act-1-build-and-orbit.md §2.1 as built (each
row there gives screens and local; here local comes first, then screens). The front wheel's turn is
its own segment, and the frame is laid tube by tube (that document's §3). S4 is retired with the
brakes line. Amended again 2026-10-05 (the author: "bring the 3d animation up to happen at the same
time as the text"): a brief line's parts set out the moment the line comes up, with no reading-time
lead, and the camera is in place before the line appears; vb-3 is cut (no colour or dot words in Act
I). The section goes 8 → 6.4 screens.*

| Beat | Page | Appears → leaves (local, then screens) | Camera | Motion while it is up |
|---|---|---|---|---|
| vb-1 | 1 | 0 (no fade-in: the essay opens on it) → dims at 0.046875 | S0: target whole, bearing 50, elev 10, d 6.0, fov 40, frame 0. The spawn shell fills the frame as a starfield. | assembly 0, drive 0, steer 0, variant 1, vibed 1. Nothing moves. |
| vb-2 | 1 | 0.046875 (0.30 screens) → page out ends 0.125 | S0 → S1 over 0.046875–0.125 (the camera comes down into the cloud as the list is handed over). | As above. |
| vb-brief | 2 | 0.125 (0.80 screens) → page out ends 0.84375. Only the ask is on the page until line 1 comes up. | S1: target whole, bearing 55, elev 8, d 4.6, fov 40, frame 0. Holds to 0.25. | assembly 0: the shell drifts, nothing has set out. |
| line 1 appears (seat, bars) | 2 | 0.171875 (1.10), up from nothing over one fade as its parts set out | S1. | assembly 0 → 0.45 over 0.171875–0.25 (1.10–1.60): the core flies in (saddle, bars, pedals) as the line comes up. drive 0. |
| line 1 lights | 2 | 0.248 (1.59; threshold 0.44) | S1 holds to 0.25, → S2 over 0.25–0.296875 (1.60–1.90): target (0.5, 0.4), bearing 95, elev 12, d 3.2, fov 38, frame 1, in place before line 2. | assembly 0.45 held. |
| line 2 appears (wheels, chain) | 2 | 0.296875 (1.90) | S2. | assembly 0.45 → 0.61 over 0.296875–0.3671875 (1.90–2.35): both wheels, the cranks and the chain. drive 0 → 2.0 over 0.3203125–0.421875 (2.05–2.70, two crank turns); `mech.steer` cancels the drive's own swing so the front wheel stays straight. |
| line 2 lights | 2 | 0.363 (2.32; threshold 0.60) | S2 holds to 0.421875, → S3 over 0.421875–0.46875 (2.70–3.00): target (0.95, 0.5), bearing 50, elev 20, d 3.0, fov 36, frame 1, in place before line 3. | drive turning to 0.421875, then held at 2.0. |
| line 3 appears (front wheel) | 2 | 0.46875 (3.00) | S3. | assembly 0.61 → 0.73 over 0.46875–0.5234375 (3.00–3.35): the fork with its basket and headlamp. drive 2.0 held. |
| line 3 lights | 2 | 0.519 (3.32; threshold 0.72) | S3. | Still. |
| the turn | 2 | 0.5390625–0.6328125 (3.45–4.05); no text changes | S3 holds. | `mech.steer` 0 → +1 at 0.5625 → −1 at 0.609375 → 0 at 0.6328125, inOutQuad each leg: straight, one lock, the other, straight. Nothing else moves. |
| line 4 appears (frame) | 2 | 0.6875 (4.40) | S3 → S1 over 0.6328125–0.6875 (4.05–4.40), in place as the line comes up; then a linear lean-in S1 → S1′ over 0.6875–0.8046875. | assembly 0.73 → 0.98 over 0.6875–0.8046875 (4.40–5.15): the frame laid tube by tube, the fittings last; → 1 at 0.8125 (5.20). drive 2.0 held. |
| line 4 lights | 2 | 0.800 (5.12; threshold 0.97); the page leaves whole over 0.828125–0.84375 | S1′ holds from 0.8046875. | assembly 1. |
| vb-4 | 3 | 0.84375 (5.40 screens) → fade-out ends 1.00 | The lap: S1′ → one full circuit → S1′ (2026-10-05 §4). | drive 2.0 → 2.4: the bike rides as the camera goes round. |

### 2.2 reveal (L = 3.2, fade 0.03125)

*Amended 2026-10-05 (the author): rv-6 is cut (no colour or dot words in Act I). rv-1 to rv-4 keep
their screens; rv-5 comes up 0.08 screen sooner (the S7 hold is that much shorter) so it and rv-7
each keep their reading time, and the section goes 4 → 3.2 screens. The slow push-in that was rv-6's
now plays under rv-7.*

| Beat | Page | Appears → leaves | Camera | Motion |
|---|---|---|---|---|
| rv-1 | 1 | 0.00 → dims at 0.175 | S1′ (continuous from the cold open) holds to 0.175. | drive 2.0 → 2.6 over 0–0.175: the cranks and both wheels turn; natural steer 0 → −0.8, so the front wheel visibly turns as the line says. |
| rv-2 | 1 | 0.175 → page out ends 0.325 | → S5 over 0.175–0.325: the camera rises to the reveal shot. S5: target whole, bearing 40, elev 30, d 4.0, fov 33, frame 0 (within the pinned bounds: bearing 30–60, elev ≥ 20, fov ≤ 33). | drive 2.6 → 2.9 (natural steer → −0.99, near full lock): the bike arrives at the still with its saddle cocked over the front wheel. |
| rv-3 | 2 | 0.325 → dims at 0.5125 | → S6 over 0.325–0.375. S6: target `MAST_MOUNT`, bearing 30, elev 28, d 1.3, fov 33, frame 1: the saddle on its mast, the basket and front wheel under it. Nothing stands above the saddle, so the band above is empty. | steer swing: 0 at 0.3625, +2 at 0.43125, 0 at 0.5 (total −1 → +1 → −1): the saddle turns with the wheel, twice, while the line is up. drive 2.9 held (the still). |
| rv-4 | 2 | 0.5125 → page out ends 0.625 | → S7 over 0.5125–0.5625. S7: target `STUB_TOP`, bearing 150, elev 30, d 1.6, fov 33, frame 1: the bars on the stub in the foreground, the mast, saddle and cocked front wheel beyond. | drive 2.9 → 3.0 over 0.5125–0.625 (natural steer reaches exactly −1 at drive 3); steer 0. The bars stay square while the saddle and wheel sit at lock. |
| rv-5 | 3 | 0.625 → page out ends 0.825 | → S5 over 0.625–0.675 (the whole twin; the top tube's climb reads from here, ≥ 15° on screen as pinned). | drive 3.0 held to the end of the section. Steer at lock. Still life. |
| rv-7 | 4 | 0.825 → fade-out ends 1.00 | S5, drifting to bearing 45, d 3.8 over 0.825–0.925 (a slow push-in, nothing more), then holds. | Still. |

### 2.3 rewind (L = 1, fade 0.1)

| Beat | Page | Appears → leaves | Camera | Motion |
|---|---|---|---|---|
| rw-1 | 1 | 0.00 → fade-out ends 1.00 | S5 → S8 over 0–1. S8: target whole, bearing 0, elev 0, d 6.5, fov 40, frame 0 (the existing pull-back to the nebula). | Existing keys compressed into one screen: drive 3.0 → 0 over the section; assembly 1 → 0 over 0–0.8 (inOutQuad); variant 1 → 0 by 0.9; vibed 1 → 0 over 0.9–1. The machine runs backward and comes apart. |

### 2.4 spec — the drawing first (L = 8, fade 0.0125)

*Amended 2026-10-05: the drawing is ink on paper and lifts into the bike, as designed in
docs/specs/2026-10-05-blueprint-and-build.md (§2 the look, §3 the lift, §4.2 this table); its §8
says where the build differs. `mech.ghost` and `mech.ghostVariant` (§2.6) stay for Act II and are 0
throughout this section: the ink replaces the dots. Throughout, `mech.variant` is 0 and provenance
is "specced" (warm core, cool body); `mech.steer` 0.*

| Beat | Page | Appears → leaves (local) | Camera | Motion / drawing state |
|---|---|---|---|---|
| sp-1 | 1 | 0.00 → dims at 0.06 | S8 → S11 over 0–0.08 (a push-in; no turn). S11: target (0.55, 0.72), bearing 90, elev 0, d 3.9, fov 35, frame 0: the page square on. | `sheet.opacity` 0 → 1 over 0.02–0.08; `stage.motes` 1 → 0.1 over 0.02–0.08; `ink.flat` 1; `ink.opacity` 0 → 1 over 0.04–0.05; `ink.drawn` 0 at 0.05. assembly 0, drive 0. |
| sp-2 | 1 | 0.06 → page out ends 0.17 | S11. | `ink.drawn` 0 → 1 over 0.05–0.16, linear: construction lines, the wheels, the frame, fork and basket, the drive, the saddle on its mast and the bars on the stub, the fittings, hatching and notes. |
| sp-3 | 2 | 0.17 → page out ends 0.27 | S11 → S11c over 0.17–0.21. S11c: target (0.85, 0.85), bearing 90, elev 0, d 2.2, fov 33, frame 1: the seat on its mast, close on the page. Holds to 0.27. | Still. |
| sp-4 | 3 | 0.27 → page out ends 0.43 | S11c → S11 over 0.27–0.31. | `ink.ring` 0 → 1 over 0.28–0.31: the person's gold ring round the seat. `ink.redraw` 0 → 1 over 0.32–0.41: the old seat, bars, mast, stub, top tube and cables fade to faint, the new seat draws, then the bars, then the frame and cables. `ink.ring` 1 → 2 over 0.39–0.42. |
| sp-5 | 4 | 0.43 → page out ends 0.53 | S11. | `ink.tick` 0 → 1 over 0.46–0.49: the person's gold tick. The corrected page. |
| sp-6 | 5 | 0.53 → page out ends 0.70 | S11 → S10 over 0.53–0.63: the orbit that shows the page as a page. S10: target whole, bearing 40, elev 25, d 4.2, fov 35, frame 0. | `ink.flat` 1 → 0 over 0.61–0.69, rear first: the lines lift off the page; `sheet.opacity` 1 → 0 over 0.60–0.69; `stage.motes` 0.1 → 1 over 0.62–0.72. assembly 0. |
| sp-7 | 6 | 0.70 → dims at 0.84 | S10 → S9′ over 0.70–0.74 (coreFocus → 0.6). | assembly 0 → 0.46 over 0.72–0.84: gold motes land on the lines at the seat, bars and pedals. drive 0. |
| sp-8 | 6 | 0.84 → end (no fade-out: the essay ends on it) | S9′ → S10′ over 0.84–0.90 (coreFocus → 0; bearing 45, d 4.4, frame 0). | assembly 0.46 → 1 over 0.85–0.95: blue builds the body round the gold. drive 0 → 1.4 over 0.90–1.0: the finished bike rides. `ink.opacity` 1 → 0.25 over 0.90–0.97: the lines stay faint beneath it. |

### 2.5 Keyframe changes, summarised

- Section lengths: vibe-build 3 → 6 → 8 → 6.4 (2026-10-05), reveal 2 → 4 → 3.2 (2026-10-05),
  rewind 2 → 1, spec 3 → 6 → 8 (2026-10-05: 21 screens; after the author's cuts and the
  simultaneous build, 2026-10-05: 18.6 screens).
- `mech.assembly` in vibe-build (2026-10-05 §2.4, re-timed for the simultaneous build): linear,
  0 → 0; 0.171875 → 0; 0.25 → 0.45; 0.296875 → 0.45; 0.3671875 → 0.61; 0.46875 → 0.61;
  0.5234375 → 0.73; 0.6875 → 0.73; 0.8046875 → 0.98; 0.8125 → 1 (each stage held one flare width
  past its window's end, so nothing flares at rest; each ramp starts on its line's `data-at`).
- `mech.drive` in vibe-build: 0 until 0.3203125, 2.0 at 0.421875, held to 0.84375, 2.4 at 1.0;
  reveal 0.175→2.7, 0.325→2.9, 0.625→3.0, 1.0→3.0. Rewind and spec as today.
- `mech.steer` (new): the cancel over the drive ramp and the turn (2026-10-05 §2.3), and rv-3's swing;
  0 everywhere else.
- `camera.frame` (new): 1 on S2, S3, S6, S7 and the lap's dive; 0 elsewhere; eased with the camera
  moves.
- `mech.ghost` and `mech.ghostVariant`: not keyed (0 everywhere, 2026-10-05); the spec section's
  drawing is the ink's eight tracks (`sheet.opacity`, `ink.*`, `stage.motes`), as §2.4 gives them.
- `mech.assembly` in spec: 0 until 0.72, 0.46 at 0.84 and 0.85, 1 at 0.95. `mech.drive` in spec: 0
  until 0.90, 1.4 at 1.0.
- `camera.pos/target/fov`: re-keyed from the shots above; the portrait rig keeps the authored target
  (§2.6).
- Removed: `overlay.rider` (gone with the mannequin).

### 2.6 Three new SceneState scalars

1. **`mech.steer`** (−1..1, default 0). The bicycle's steering fraction becomes
   `clamp(sin(π·drive/2) + steer, −1, 1)`, times the variant-blended amplitude as today. Additive, so
   every existing frame is unchanged at steer 0; clamped, so an authored swing can reach full lock
   whatever the drive is doing; pure in (drive, steer, variant). The brief said the drive-coupled
   steer could not show "it turns" on cue, and the numbers agree: over the front-wheel beat the
   natural steer only drifts from 0.99 to 0.89.
2. **`camera.frame`** (0..1, default 0). A composition scalar the rig turns into a lens shift per
   orientation, exactly as `coreFocus` already blends the portrait shift. Where the authored target
   lands on screen, as a fraction of the width and height (starting values, tuned by the clearance
   test in §4):

   | | desktop (aspect ≥ 1) | portrait |
   |---|---|---|
   | frame 0 (wide) | x 50 %, y 66 % | x 50 %, y 62 % |
   | frame 1 (close) | x 70 %, y 72 % | x 50 %, y 76 % |

   The keys stay machine-relative and orientation-free; the rig owns the shift. The portrait rig
   **keeps the authored target** (today it moves the target onto the machine's axis, which would
   ruin every close shot); it still backs off by √m and widens the field by √m. Wide shots target the
   whole anchor anyway, so their portrait framing is as today.

3. **`mech.ghostVariant`** (0..1, default 0): see §2.4. The ghost point pipeline takes the twin
   positions as the motes do; this is the ghost's renderer, not the mote shader.

No other SceneState change. Nothing in `mote.glsl` / `mote.ts` changes.

### 2.7 As built (2026-10-04)

The shots above were starting values. The built ones live in `src/timeline/shots.ts` (bike terms,
pinned by `src/timeline/shots.test.ts`); they changed where a frame did not show its line or the
machine entered the text band (`e2e/clearance.spec.ts`):

- **Close shots are medium-close.** The twin's mast and saddle stand over the front wheel, so any
  shot of the front holds about 1.1 m of bike, all of which must sit under the text. S2 targets the
  middle of the bike (0.5, 0.4) at 3.2 m so both wheels and the chain are in; S3 targets (0.95, 0.5)
  from bearing 50, elevation 20, at 3.0 m, so the wheel is seen at three-quarters and its turn reads; S4 targets
  (0.85, 0.65) at 2.4 m and shows the bars with their levers and bell; S6 targets (0.9, 0.65) at
  2.4 m, bearing 35, so the front wheel is in frame under the saddle; S7 is 2.6 m; S6g targets
  (0.75, 0.55) from bearing 40 at 3.0 m, because the drawing is sparse and a closer shot did not read.
- **`camera.frame` 1 on a wide screen lands the target at y 78 %, not 72 %.** The other three
  values of the §2.6 table are as designed.
- **S5 and S5′ pull back to 4.8 m and 4.6 m** so the whole twin and its ground sit under the 42 %
  band at both sizes.
- **S8 looks from the drive side (bearing 90),** as the existing pull-back did; bearing 0 would show
  the bike end-on as it comes apart.
- **S9′ is all but S10** (the whole bike at 4.15 m, coreFocus 0.6 as designed): any nearer and the
  drawing's front wheel and ground leave the bottom of a wide screen, so the gold is not brought
  closer than the drawing already is.
- **The late body parts come in from below.** The fork, brakes, mudguards and frame used to fall
  into place from up to 0.6 m above the bike, through the text while the brief's lines light; their
  exploded offsets now point down or level, and their settle windows are unchanged.
- The steer swings ease in and out (`inOutQuad`); every other key is as §2.1–§2.4 give it.
- **Round 2b (2026-10-05).** The spec section's drawing is ink on a sheet of paper, redrawn by
  strike and redraw, and lifted off the page into the bike before it is built
  (docs/specs/2026-10-05-blueprint-and-build.md). §1 Section 4, §2.4 and §2.5 above are that build;
  S6g is retired for S11 and S11c. Where it differs from its own design, that document's §8 says so.
- **Round 2a (2026-10-05).** The cold open was re-cut by docs/specs/2026-10-05-act-1-build-and-
  orbit.md: four brief lines, each absent until its own `data-at`, the words before the parts, the
  front wheel's turn as its own segment, the frame laid tube by tube with a landing flare, and vb-4
  as one lap of the camera round the riding bike. §2.1 and §2.5 above are that build; S4 is retired.
  Where it differs from its own design, that document's §7 says so.
- **The author's edits (2026-10-05).** vb-3 and rv-6 are cut and sp-7 is reworded, so Act I's
  narration names no colour and no dots (§1); a brief line's parts set out as the line comes up,
  with no reading lead (§2.1). vibe-build is 6.4 screens and the reveal 3.2.

## 3. The text engine

### 3.1 Data model: beats in the story markdown

The words stay in `src/story/NN-id.md`, one file per section, with the front matter `id`, `length`
(screens) and `alt`. `label` is gone. The body is a sequence of beat blocks separated by HTML comment
markers, each followed by its markdown:

```markdown
---
id: vibe-build
length: 6.4
alt: A cloud of small blue dots. ...
---

<!-- beat id=vb-1 at=0 -->
You want a bike.

<!-- beat id=vb-2 at=0.046875 -->
So you write down what a bike needs, and hand the list to an agent.

<!-- page -->
<!-- beat id=vb-brief at=0.125 document -->
<div class="brief">
<p class="brief-ask">Build me a bike for getting around town.</p>
<ul class="brief">
<li data-parts="saddle handlebars" data-at="0.171875">A comfy seat and handlebars, both adjustable to fit tall people and short people.</li>
<li data-parts="front-wheel rear-wheel cranks chain-* pedal-left pedal-right" data-at="0.296875">Two wheels. The pedals drive the back wheel through a chain.</li>
<li data-parts="fork front-wheel" data-at="0.46875">The front wheel turns, so you can steer.</li>
<li data-parts="frame brake-front brake-rear mudguard-front mudguard-rear" data-at="0.6875">Sturdy, but light enough to carry up the stairs.</li>
</ul>
</div>

<!-- page -->
<!-- beat id=vb-4 at=0.84375 -->
Done. Every line on the list is met.
```

- `<!-- beat id=<id> at=<local> [document] -->` starts a beat; `at` is the section-local progress at
  which its fade-in begins, in [0, 1). `document` marks a beat whose own lines carry meaning (the
  brief): it never dims and may exceed the per-beat word limit.
- `<!-- page -->` starts a new page. The first beat of a section is on page 1 without a marker.
- The loader (`src/story/loader.ts`) splits the raw body on these marker lines **before** `marked`,
  renders each beat's markdown on its own, and returns
  `StorySection { id, length, alt, pages: Page[] }`, `Page { beats: Beat[] }`,
  `Beat { id, at, document, html, text, words }`. `at` values must be strictly increasing within a
  section; a page's first `at` is the page's `in`. Everything else (fade, hold, dim, out) is derived
  (§3.2), never authored, so the markdown stays the single source of truth for both words and timing.

### 3.2 Opacity from progress (pure)

For a section of length `L` with local progress `l`, `FADE = 0.1 / L`, `smoothstep` as in
`src/story/reveal.ts`:

- Page `k` with `in_k` = its first beat's `at`, `out_k` = the next page's `in` (or 1 for the last
  page of the section):
  `page_k(l) = smoothstep(in_k, in_k + FADE, l) · (1 − smoothstep(out_k − FADE, out_k, l))`.
  The first page of the essay has no fade-in; the last page of the essay has no fade-out. Across a
  section boundary the handover is the same shape: the old section's last page is at 0 exactly at
  local 1, the new section's first page starts at 0 exactly at local 0 (today's section fade, kept).
- Beat `i` on page `k`: `reveal_i(l) = smoothstep(at_i, at_i + FADE, l)`;
  `dim_i(l) = smoothstep(at_{i+1}, at_{i+1} + FADE, l)` for a beat that is not the last on its page,
  else 0; `dim` is forced to 0 on a document beat.
- Rendered: the page element gets `style.opacity = page_k`; each beat element gets
  `--reveal: reveal_i` and `--dim: dim_i`; CSS draws `opacity: var(--reveal)` and
  `color: color-mix(in oklab, var(--ink), var(--ink-superseded) calc(var(--dim) * 100%))`. No CSS transition
  or animation anywhere on `.page`, `.beat` or their children (the existing no-transition e2e check
  extends to them). Values are written from the scroll driver's callback (where `panelReveals` is
  applied today) and once on load, so `?p=` and a scroll agree; nothing time-based.
- The brief's line lighting (`data-met`, `applyBrief`) is unchanged and stays assembly-driven.

Consequences a reader sees: at most one page is visible; within it the lines come up one at a time in
reading order; the newest is full ink, the earlier ones step back to `--ink-superseded` (the ink at 80 % over the stage, 10.2:1; amended
2026-10-05: the first value, `--ink-dim` at about 67 %, read as greyed out), still
readable); a reader who stops mid-fade sees one line part-way up and nothing else changing; the page
leaves whole.

### 3.3 Dwell budget (lint, not behaviour)

A beat's **dwell** is the local span from the start of its fade-in to the next change on its page:
`dwell_i = at_{i+1} − at_i` for a beat followed by another on its page, and `dwell_i = out_k − at_i`
for the last beat on its page (to the end of the page's fade-out, or to 1 on the essay's last page).
In screens, `dwell_i · L` must be at least `max(0.3, words_i / 40)`. For a document beat (amended
2026-10-05) the dwell is the ask's: from the beat's `at` to its first line's `data-at`, for the ask's
own words (8 words: 0.3 screens, as given). Each brief line then has the ordering fence of
2026-10-05 §2.5: none of its parts sets out until it has been up `max(0.3, words / 40)` screens, and
it is never met before it is up.
Rationale: 40 words per screen at a leisurely 4 s per screen is 2.5 words per second, under the
183 wpm measured for reading aloud (research note §4). The storyboard's timings satisfy this; the lint
stops a later edit from quietly breaking it.

The fades count as reading time: a line is legible well before it reaches full ink. (A first draft of
this rule measured only the full-ink hold between the fades. The storyboard's timings do not meet
that: vb-3 and six of the reveal's seven beats fall short by up to 0.2 screens, and a 4-screen reveal
cannot meet it at all, since its 132 words need 3.4 screens of hold plus 1.1 screens of fades. The
timings were authored to the dwell above; if readers miss lines, the lever is the reveal's length.)

Other lints (vitest, `src/story/content.test.ts`): per beat ≤ 26 words (document ≤ 60); per section
≤ 35 words per screen of `length`; ≤ 3 beats per page (a document page holds exactly one beat);
`at` strictly increasing, in [0, 1), and the first beat of a section at 0; the publication-safety
denylist and patterns as today, run over every beat's text and the alt. The 80-words-per-section rule
and the running-label rule are retired.

### 3.4 Layout

DOM per section: `<section data-section>` → `<p class="sr-only">alt</p>` → `<div class="track">` →
`<article class="panel">` → `<div class="page" data-page>`× → `<div class="beat" data-beat="id">`×.
The panel is a grid and every page sits in the same cell (`grid-area: 1 / 1`), so pages overlay at
one anchor and the panel's height is its tallest page; every beat is in normal flow inside its page
at its final place from the start, so a line coming up never moves another line (no layout shift,
nothing to transform).

| | desktop (aspect ≥ 1, test 1440×900) | portrait (test 390×844) |
|---|---|---|
| anchor | `position: sticky; top: 7vh`, centred, `width: min(36rem, 100vw − 2·gutter)`, text left-aligned | `top: calc(env(safe-area-inset-top) + 6svh)`, `left/right: 16px` |
| text band | the panel's bottom ≤ 42 % of the height on every page (the brief page measures 39 %) | ≤ 42 % (measured 38 %) |
| machine | its visible extent starts ≥ 8 px below the panel's bottom at every beat sample (§4) | same |
| scrim | `#story::before`, fixed, `linear-gradient(to bottom, rgba(11,13,18,.72) 0, rgba(11,13,18,.45) 22svh, transparent 42svh)` | same |
| vignette | `body::after` centred at 50 % / 62 % | 50 % / 64 % |

Sticky geometry: the track runs from the section's top and extends past its end by
`var(--text-top) + var(--panel-h)` (`--panel-h` measured as `--half-h` is today), so the panel is at
its anchor, unmoved, for the whole of local 0..1 and is only pushed up once its last page has faded
out. The next section's panel reaches the anchor 0.07 screens before its local 0, at opacity 0.
`svh` for the anchor so a phone's toolbars never move the text; `vh` for section heights, as today,
because progress is measured against `innerHeight`.

### 3.5 The brief's special handling

One document beat, one page, no label (the markup drops `p.brief-label`; vb-2 has just said what the
list is). The ask is the Instrument Serif italic pull-quote; the lines hang with no bullet, no rule, no
box. Amended 2026-10-05 (§2.5 of that document): each `ul.brief > li` carries its own `data-at` and
is **absent** (opacity 0, still in the accessibility tree) until then; it comes up over one fade, in
full `--ink` (its own `--reveal`, `lineReveal` in `src/story/reveal.ts`; amended 2026-10-05: it
used to come up in `--ink-dim`, which read as greyed out), and never dims. It brightens to `--ink-lit`
and takes C's faint blue halo when `data-met` lands, as a pure function of assembly
(`src/story/brief.ts`, unchanged). The document beat never dims when the page's next beat arrives
because there is none: vb-4 is on its own page, so the brief leaves whole after all four lines have
lit.

### 3.6 Accessibility

- All text is in the DOM in reading order; an unrevealed beat has `opacity: 0`, which keeps it in
  the accessibility tree, so a screen reader reads the whole story top to bottom. The canvas stays
  `aria-hidden` with the per-section alt as its description. The brief's hidden "(done)" status stays.
- `prefers-reduced-motion`: the engine has no transforms, no blur and no masks, only opacity and a
  colour mix, which WCAG 2.3.3 does not count as motion (research note §6); the curves are identical
  under reduced motion, so there is no second code path to test. The camera and shimmer rules of
  the design spec §8 are unchanged.
- Contrast: `--ink` on the stage ≥ 12:1, `--ink-superseded` 10.2:1; the scrim only raises these.
- Keyboard scrolling works as today (nothing intercepts scroll).

### 3.7 No JavaScript, no WebGL

- No WebGL (context lost or unavailable): the engine runs from the scroll driver, not the frame
  loop, exactly as the brief ticks do today, so the pages fade and the lines come up over the dark
  stage. (Pinned by the existing context-loss test, extended to a page opacity.)
- No JavaScript: `<html class="no-js">`, removed by the first inline script. Under `.no-js`: pages
  flow (`grid-area: auto`), the panel is `position: static`, every `--reveal` is 1 and `--dim` 0, the
  scrim and vignette are off. The result is a plain, readable document in order. For the text to be
  there at all, the build writes the story's markup into `index.html` (a Vite `transformIndexHtml`
  plugin running the same loader and `src/story/markup.ts`); the bundle finds that markup and checks
  it is its own story rather than rendering it.

### 3.8 Type (style C, adjusted for text above the machine)

- Body: Literata 400, 1.1875rem / 1.55 desktop, 1.0625rem portrait; `font-optical-sizing: auto`;
  C's layered text shadow kept (`0 1px 2px`, `0 0 14px`, `0 0 30px` in the stage colour).
- Ink `#e8e6ee`; a met brief line `#f8f7fc`; superseded lines `#bcbbc2`; agent halo `rgba(77,163,255,.5)`.
- Measure 36rem, centred as a block, left-aligned text (a centred caption column over a centred
  picture; ragged-right, never centred text).
- The ask: Instrument Serif italic 1.8rem / 1.2 desktop, 1.45rem portrait. Brief lines 1.0625rem /
  1.45 desktop, 1rem portrait, `padding: .42rem 0` (.34rem portrait).
- Beats are paragraphs with `margin-bottom: .85em`; nothing else: no labels, numbers, rules, borders,
  fills, cards or boxes on any element of a panel (the existing e2e check, now for C alone).
- Newsreader, Plex and Geist Mono are no longer used by the essay; only Literata and Instrument Serif
  load (the self-hosted-fonts check is re-pinned to those two).

## 4. Tests that pin it

Vitest (pure functions, no browser):

1. **Loader**: a fixture section parses into pages and beats with the right `at`, `document`, text and
   word counts; a marker with a bad `at`, a duplicate id, a non-increasing `at` or a first beat not
   at 0 throws with the file name.
2. **Curves**: `pageOpacity`, `beatReveal`, `beatDim` are exact at the knots (0 at `at`, 1 at
   `at + FADE`), monotone across each fade, and the first/last-of-essay exceptions hold.
3. **Never two pages**: over a dense sweep of global progress (10,000 samples), the sum of all page
   opacities in the essay is ≤ 1 + 1e-9, and no two pages are both above 0.02.
4. **Ordering**: within a page, `reveal_i ≥ reveal_{i+1}` at every sample; a beat's `dim` is 0 while
   it is the newest revealed beat.
5. **Dwell budget** and the other content lints of §3.3.
6. **Beat text matches the storyboard**: this document's copy tables (§1) are parsed by the test and
   compared, in order and as whole sets, to the loaded beats' plain text and ids. A copy edit in the
   markdown fails the test with a message to update §1 here (and the reverse), so the storyboard and
   the story cannot drift apart silently. The markdown is the source of truth; the table is the
   designed snapshot.
7. **Steer override**: with `mech.steer` = ±1 and drive 0 the front wheel, fork, front brake and
   mudguard yaw by ±amplitude about `STEER_AXIS` and, in the twin, the saddle with them; the sum
   clamps at full lock; steer 0 reproduces today's poses for every drive and variant.
8. **Shots**: each storyboard shot's bearing, elevation, distance and fov hold at its beat's sample
   points (as the existing cold-open and reveal camera tests do), including the pinned reveal bounds
   and the ≥ 15° top-tube climb; the two steer swings reach ±1 inside their beats; the brief lines'
   lighting progress values are the storyboard's to ±0.01.
9. **Portrait rig**: keeps the authored target; `camera.frame` moves where the target lands by the
   table in §2.6 (project the target through the rigged camera and read NDC); landscape with frame 0
   is unchanged from the plain camera.

Playwright (the built page, `?test=1`, both 1440×900 and 390×844):

10. **Pure of scroll**: for three progress values per section (mid fade-in, mid hold, mid page-out),
    every page's `opacity` and every beat's `--reveal` / `--dim` are identical reached by `?p=` and by
    scrolling, and identical scrolling forward and back.
11. **One page at a time**: at a page's `in` the previous page's opacity is 0; mid-page exactly one
    page is above 0 and its beats' reveals are non-increasing down the page.
12. **No overlap with the machine**: at every beat's sample points, the panel's bottom (DOM) is ≤ 42 %
    of the height and the visible machine's top (`e2e/machine.ts`, with `camera.frame` applied) is
    ≥ panel bottom + 8 px; the machine's top never leaves the viewport in a wide shot. Measured on
    both sizes.
13. **Panel anchored**: the panel's box is the same at local 0.05, 0.5 and 0.95 of every section
    (top at 7vh / 6svh + safe area; 16 px sides on the phone).
14. **No boxes, no transitions** (existing checks, extended to `.page` and `.beat`); the brief marks
    never animate (existing); met vs unmet look (existing, C only).
15. **No-JS document**: with JavaScript disabled the whole story is visible in order, nothing sticky,
    nothing at opacity 0.
16. **No-WebGL**: after a context loss the pages still fade and the brief still ticks (existing,
    extended).
17. **Screenshots** at the storyboard's beat midpoints feed the no-WebGL stills as today.

## 5. Decisions and what each costs if wrong

| Decision | Cost if wrong |
|---|---|
| Scrubbed fades, no triggered timing. | None to reverse by design; the alternative breaks purity and the rewind. If the fade reads as too abrupt for fast scrollers, widen `FADE` (one constant). |
| Opacity only, no translate, blur or mask. | If the author wants the "slide up" feel: adding an 8 px translate is one CSS line, but it then has to be removed under reduced motion and tested. |
| Pages with dim-not-vanish for superseded lines. | If dim lines distract, set `--ink-superseded` to the stage colour for superseded beats (they vanish) with no engine change. |
| Text top-centre on desktop, not a left column. | Re-keying every camera shot was needed anyway; if the author prefers a left column, the band test and the `frame` table change and the shots keep their subjects. |
| `camera.frame` as a composition scalar rather than per-shot lens offsets in the keys. | If a shot needs its own placement, a second scalar (`camera.shiftX`) or per-shot lens keys; the keys stay machine-relative either way. |
| Portrait rig keeps the authored target. | A wide shot targeted off the machine's axis could clip the bike on a phone; the storyboard's wide shots target the whole anchor, and test 12 catches a slip. |
| `mech.steer` additive and clamped. | A swing authored while the natural steer is at lock pushes against the clamp (flat for part of the swing); the storyboard's two swings are placed where this does not bite. If it does, make the override replace rather than add (one line, same scalar). |
| 15 screens for Act I (was 10). | If it feels long, the dwell budget is the lever: 40 → 50 words per screen shortens every hold; the lint keeps it honest. |
| Dwell budget 40 words per screen (T4). | Too fast and readers miss lines; too slow and they fidget. Measure on real people once, then move the constant. |
| "Gold" for the warm mote in sp-4 (the author chose it). | The amber renders gold-white when dense, so the word matches the picture. Amended 2026-10-05: Act I's narration no longer names it (the author: readers should not have to know what the colours mean in Act I); "gold" stays in the alt text and the design notes. |
| The brief reworded (55 words) but still complete-looking. | Any rewording must keep every line met by the twin; the parts mapping and the lighting order test guard the mechanics, not the prose. |
| ~~vb-3 names the blue dots while assembly is 0 (the spawn shell).~~ | Retired 2026-10-05: the author cut vb-3, so Act I names no colours or dots. |

## 6. Settled questions (2026-10-04)

1. Colour word: "gold" (the author chose it; the dense amber reads gold-white).
2. Length: 17 screens (rewind cut to 1; spec grown to 6 for the drawing); the dwell constant stays the lever.
   Since 2026-10-05, 21: the cold open grows to 8 for the front wheel's turn and the frame's laying,
   and the spec section to 8 for the drawing on paper and its lift into the bike.
3. The brief leaves whole before vb-4, as specified: carrying it over dimmed would push the portrait
   text band past 42 % of the height, and vb-4 reads fine against the finished bike just after the list.
