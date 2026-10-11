# Act I, round 2a: the build sequence, the frame's entrance and the "Done" orbit

*Status: design for implementation. Date: 2026-10-05. Amends the vibe-build section of
docs/specs/2026-10-04-act-1-storyboard-and-text-engine.md (§1 copy, §2.1 storyboard, §2.5 keys,
§2.7 as built, §3.3 dwell lint, §3.5 the brief). Everything else in that document stands. The spec
section ("the drawing first", sp-1..sp-7) is another designer's and is not touched here, except
where a shared constant changes and the line says so.*

Author feedback this answers (2026-10-04), in order: no brakes-and-bell line; a brief line is
**absent**, not dim, until its own scene; the words come **before** the parts; the front wheel's
turn is its **own segment** before the frame; the frame's entrance is to look like the many-piece
build it is, not a slide; and "Done" gets an orbit that plays with angle and zoom.

**Amended 2026-10-05 (the author, after seeing it built):** "bring the 3d animation up to happen at
the same time as the text", and cut "See the blue dots?", since readers should not have to know what
blue and dots mean in Act I. So a brief line's parts now set out the moment the line comes up (no
reading lead; the camera is in place before the line appears), vb-3 is cut, and the section is 6.4
screens, not 8. The stages, the front wheel's turn, the frame laid tube by tube and the lap are
unchanged. Where this document still says "the words before the parts", or gives the 8-screen
timings, it is superseded by §2.1a below and by the storyboard's §2.1
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

## 0. The section in one paragraph

Eight screens (was six). Three lines over the starfield; the ask alone on the brief page; then,
four times over: a line of the list comes up out of nothing, the reader has it for its reading time,
and only then do the agents fly its parts in and the line lights. After the third line the front
wheel gets a segment to itself and turns lock to lock with nothing else moving. After the fourth
line the frame is laid tube by tube in a frame builder's order, each tube flaring as it is laid,
with the fittings hung on it last. "Done. Every line on the list is met." plays over one lap round
the bike that dips to the ground, cranes up behind, looks down on it like a diagram, dives onto the
saddle on its mast, and settles back on the shot the reveal opens with.

## 1. The copy (vibe-build, L = 8)

| Beat | Text |
|---|---|
| vb-1 | You want a bike. (4) |
| vb-2 | So you write down what a bike needs, and hand the list to an agent. (15) |
| vb-brief (document) | *Build me a bike for getting around town.* (8) · A comfy seat and handlebars, both adjustable to fit tall people and short people. (14) · Two wheels. The pedals drive the back wheel through a chain. (11) · The front wheel turns, so you can steer. (8) · A basket too, for carrying things. (6) · Sturdy, but light enough to carry up the stairs. (9) · Mudguards, so puddles don't splash you. (6) — 62 in all |
| vb-4 | Done. Every line on the list is met. (8) |

The brakes line is gone (the author: pointless detail). The brake calipers still exist on the bike
and land as **fittings of the frame**, under the last line, with the mudguards and the rack: a
frame is "sturdy" with its fittings hung on it, and nothing in the list claims them. The levers and
the bell are on the handlebars and arrive with line 1, unremarked. Every remaining line is still met
by the twin: the saddle telescopes in the mast and the bars clamp into the stub ("both adjustable");
the chain drives the back wheel; the front wheel turns; the frame is a frame.

Alt text (vibe-build): *A cloud of small blue dots. They fly in and build a bicycle part by part as
the lines of a list appear one after another: seat and handlebars, wheels and chain, the front
wheel, then the frame, laid tube by tube. The finished bicycle runs while the view circles it.*

*Amended 2026-10-05 (the author): vb-3 ("See the blue dots? Each one is a little bit of work the
agent can do. There are thousands.") is cut: Act I's narration names no colour and no dots, and the
cloud needs no explanation. vb-2 leads straight into the list. Word count 77 over 6.4 screens.*

*Amended again 2026-10-05 (the author): the basket's line and the mudguards' line are added (the
header above). The brake calipers are now named by no line: they land with the mudguards, once the
frame is laid, as the levers and bell arrive unremarked with line 1. The basket rides the fork on
both bikes, so the twin meets its line; both mudguards are on, so it meets theirs. 62 words in the
brief, 89 over 7.2 screens. The brief is 62 words, over the 60 a document was allowed: the limit is
64 (`src/story/content.test.ts`), since it is read a line at a time, each line with its own reading
time.*

Word count 96 over 8 screens (12 per screen; the lint allows 35). The 2026-10-04 §1 vb-brief row and
alt text are superseded by this table; the beat-text sync fence (10-04 §4 test 6) reads that table,
so the implementer updates it in the same change.

## 2. The storyboard

Conventions as 10-04 §2: progress is section-local (0..1), `L = 8`, so one screen is 0.125 local
and a fade (0.1 screen) is 0.0125. Shots are in bike metres (`src/timeline/shots.ts`), named as
built there (10-04 §2.7): S0, S1, S2, S3, S1′ unchanged; **S4 is retired** with the brakes line.
"Screens" in the first column is the authoring unit; the local value beside it is what goes in the
markdown and the keys.

### 2.1 vibe-build (L = 8, fade 0.0125)

| Beat | Page | Appears → leaves (screens · local) | Camera | Motion while it is up |
|---|---|---|---|---|
| vb-1 | 1 | 0.00 · 0 (no fade-in) → dims at 0.30 · 0.0375 | S0 (whole, bearing 50, elev 10, d 6.0, fov 40, frame 0): the spawn shell as a starfield. | assembly 0, drive 0, steer 0, variant 1, vibed 1. Nothing moves. |
| vb-2 | 1 | 0.30 · 0.0375 → dims at 0.80 · 0.10 | S0. | As above. |
| vb-3 | 1 | 0.80 · 0.10 → page out ends 1.40 · 0.175 | S0 → S1 over 0.10–0.175 (down into the cloud). | As above. |
| vb-brief: the ask alone | 2 | 1.40 · 0.175 (page in; only *Build me a bike…* is on it) | S1 (whole, bearing 55, elev 8, d 4.6, fov 40, frame 0). Holds to 0.37. | assembly 0. The shell drifts, nothing has set out. |
| line 1 appears (seat, bars) | 2 | 1.70 · 0.2125, comes up from nothing over one fade; read until 2.25 · 0.28125 | S1. | assembly 0 held to 0.28125, then **0 → 0.45 over 0.28125–0.34375** (2.25–2.75 screens): the core flies in (saddle, bars, pedals). drive 0. |
| line 1 lights | 2 | 2.75 · 0.34375 (threshold 0.44) | S1. | assembly 0.45 held. |
| line 2 appears (wheels, chain) | 2 | 2.90 · 0.3625; read until 3.30 · 0.4125 | S1 holds to 0.37, → S2 over 0.37–0.41 (whole drive side, target (0.5, 0.4), bearing 95, elev 12, d 3.2, fov 38, frame 1): the camera is in place before anything sets out. | assembly **0.45 → 0.61 over 0.4125–0.46875** (3.30–3.75): both wheels, the cranks and the chain fly in. drive **0 → 2.0 over 0.43125–0.5125** (3.45–4.10): two crank turns, the chain runs round the back wheel, the wheels go round. `mech.steer` **cancels the drive's own swing** over this ramp (§2.3) so the front wheel stays straight: its turn is line 3's. |
| line 2 lights | 2 | 3.75 · 0.46875 (threshold 0.60) | S2. | drive still turning to 4.10, then held at 2.0 (cranks still, wheel straight: sin(π·2/2) = 0). |
| line 3 appears (front wheel) | 2 | 4.20 · 0.525; read until 4.55 · 0.56875 | S2 holds to 0.53, → S3 over 0.53–0.565 (target (0.95, 0.5), bearing 50, elev 20, d 3.0, fov 36, frame 1: the front wheel at three-quarters, the basket above). | assembly **0.61 → 0.73 over 0.56875–0.6125** (4.55–4.90): the fork with its basket and headlamp flies in and seats on the wheel. drive 2.0 held. steer 0. |
| line 3 lights | 2 | 4.90 · 0.6125 (threshold 0.72) | S3. | Still for 0.1 screen. |
| **the turn** (its own segment) | 2 | 5.00–5.60 · 0.625–0.70; no text changes | S3 holds. | `mech.steer` 0 at 0.625 → **+1 at 0.64375** → **−1 at 0.68125** → 0 at 0.70, inOutQuad each leg: straight, to one lock, across to the other, straight. The drive is held at 2.0 so the natural steer is 0 and the wheel really starts and ends straight; the twin's 26° either way. Only the wheel, fork, basket and front brake-mount move. assembly 0.73 held. |
| line 4 appears (frame) | 2 | 5.70 · 0.7125; read until 6.05 · 0.75625 | S3 → S1 over 0.70–0.745 (back out to the whole bike, drive-side three-quarter), then a **linear lean-in S1 → S1′ over 0.745–0.85** (bearing 55 → 45, d 4.6 → 4.4) through the build. | assembly 0.73 held to 0.75625, then **0.73 → 0.98 over 0.75625–0.85** (6.05–6.80): the frame is laid tube by tube in jig order (§3.6), the fittings land last (0.94–0.97), the landing flare dies by 0.98. **→ 1.0 at 0.85625.** drive 2.0 held: the bike waits while its frame is laid. |
| line 4 lights | 2 | 6.77 · 0.846 (threshold 0.97); the page leaves whole over 0.8625–0.875 | S1′ holds from 0.85. | assembly 1 at 0.85625. |
| vb-4 | 3 | 7.00 · 0.875 → fade-out ends 1.00 | **The lap** (§4): S1′ → one full circuit → S1′, 0.875–1.0, 36 generated keys. | drive **2.0 → 2.4 over 0.875–1.0**: the bike rides, slowly, as the camera goes round; the twin's saddle swings with the wheel as the natural steer moves 0 → −0.59. Steer 0. |

Reading budget (10-04 §3.3, 40 words a screen, never under 0.3): vb-1 0.30 ✓, vb-2 0.50 ≥ 0.375 ✓,
vb-3 0.60 ≥ 0.475 ✓, the ask 0.30 ✓, line 1 0.55 ≥ 0.35 ✓, line 2 0.40 ≥ 0.30 ✓, line 3 0.35 ✓,
line 4 0.35 ✓, vb-4 1.00 ✓. Each brief line's dwell is measured from its `at` to the local at which
the first of its parts sets out (§2.4), which is the event that changes the picture it is about.

### 2.1a The simultaneous build (amended 2026-10-05)

The author: "bring the 3d animation up to happen at the same time as the text". Each line's parts
now set out as the line comes up; every reading lead above is gone, and the camera moves that used
to play inside the leads now play just before their line appears, so the camera is still in place
before anything sets out. vb-3 is cut. L = 6.4 (one screen is 0.15625 local, a fade 0.015625).

| Event | Screens | Local | Was (screens) |
|---|---|---|---|
| vb-2 (S0 → S1 over 0.30–0.80, down into the cloud) | 0.30 | 0.046875 | 0.30 (the descent was vb-3's, 0.80–1.40) |
| brief page in: the ask alone | 0.80 | 0.125 | 1.40 |
| line 1 up; assembly 0 → 0.45 | 1.10 → 1.60 | 0.171875 → 0.25 | 1.70; 2.25 → 2.75 |
| S1 → S2 (before line 2) | 1.60 → 1.90 | 0.25 → 0.296875 | 2.96 → 3.28 |
| line 2 up; assembly 0.45 → 0.61 | 1.90 → 2.35 | 0.296875 → 0.3671875 | 2.90; 3.30 → 3.75 |
| drive 0 → 2.0 and the steer cancel | 2.05 → 2.70 | 0.3203125 → 0.421875 | 3.45 → 4.10 |
| S2 → S3 (before line 3) | 2.70 → 3.00 | 0.421875 → 0.46875 | 4.24 → 4.52 |
| line 3 up; assembly 0.61 → 0.73 | 3.00 → 3.35 | 0.46875 → 0.5234375 | 4.20; 4.55 → 4.90 |
| the turn (+1 at 3.60, −1 at 3.90) | 3.45 → 4.05 | 0.5390625 → 0.6328125 | 5.00 → 5.60 |
| S3 → S1 (before line 4) | 4.05 → 4.40 | 0.6328125 → 0.6875 | 5.60 → 5.96 |
| line 4 up; assembly 0.73 → 0.98, lean-in S1 → S1′ | 4.40 → 5.15 | 0.6875 → 0.8046875 | 5.70; 6.05 → 6.80 |
| assembly 1 | 5.20 | 0.8125 | 6.85 |
| vb-4 and the lap (`LAP_FROM` 0.84375) | 5.40 → 6.40 | 0.84375 → 1 | 7.00 → 8.00 |

Every span keeps its length but the camera moves (0.30, 0.30 and 0.35 screens; were 0.32, 0.28 and
0.36) and vb-2's descent (0.5; was 0.6). Lines light at locals 0.248, 0.363, 0.519 and 0.800. Each
line still has its reading time before the next line comes up (0.8, 1.1 and 1.4 screens; the last
1.0 before the page goes), so a line is read while its parts are in flight.

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

### 2.2 Settle windows (the order the bike is built in)

`SETTLE_WINDOW` (`src/scene/mote/settle.ts`, mirrored as `MOTE_SETTLE_WINDOW`) goes **0.12 →
0.08**. A mote sets out `SETTLE_WINDOW` before its settle value; for "the words before the parts" no
part may set out before the previous line has lit, so the four stages must fit end to end inside
assembly 0..1 with a lead each. At 0.12 they do not (three leads and the core's 0.45 leave 0.18 for
three landing spans); at 0.08 they do, with room for the frame to take 0.14 of assembly for its
tube-by-tube laying. Every flight still covers the same scroll distance, because the keys set how
fast assembly moves (§2.4); the constant only decides how far ahead of landing a mote leaves the
shell. Everything that reads it: `settle.ts`, `mote.glsl` (constant, checked by `mote.test.ts`),
`partAssembly`, `ROLE_SETTLE.core` (its `from` is `SETTLE_WINDOW`), and the spec section's "no body
mote has set out at 0.46" (drive from 0.53 − 0.08 = 0.45 ≤ 0.46: still true, with a hair less
margin than today's 0.46).

| Stage | Parts | Window `[from, to]` | Sets out | Line / threshold |
|---|---|---|---|---|
| core | saddle, handlebars, pedal-left, pedal-right | `[0.08, 0.44]` (role default) | 0.00 | line 1 · 0.44 |
| drive | front-wheel, rear-wheel, cranks, chain-* | `[0.53, 0.60]` | 0.45 | line 2 · 0.60 |
| fork | fork | `[0.69, 0.72]` | 0.61 | line 3 · 0.72 |
| frame tubes | frame (per-tube slots, §3.6) | `[0.81, 0.95]` | 0.73 | line 4 · — |
| fittings | brake-front, brake-rear, mudguard-front, mudguard-rear (with the rack), ground | `[0.94, 0.97]` | 0.86 | line 4 · 0.97 |
| drift | loose-bolts | `[0.53, 0.59]` (declared; inside the drift default `[0.5, 0.95]`) | 0.45 | — (lands with the drive; a hash spread over the default would flare through the 0.61 and 0.73 holds) |

`ROLE_SETTLE.body` becomes `[0.35, 0.97]` (was 0.95) so the fittings' window is inside its role
default, as the contract test demands. Assembly **holds** sit one flare-width (0.01, §3.7) past the
stage's `to`: 0.45, 0.61, 0.73, and 1.0 after 0.98; the spec section's hold at 0.46 is 0.02 past the
core's end. `data-parts` in the markdown: line 1 `saddle handlebars`; line 2 `front-wheel rear-wheel
cranks chain-* pedal-left pedal-right`; line 3 `fork front-wheel`; line 4 `frame brake-front
brake-rear mudguard-front mudguard-rear`. `briefThresholds` then gives `[0.44, 0.60, 0.72, 0.97]`
(update `brief.test.ts`; the bike's `index.test.ts` window table likewise).

Exploded offsets: the frame's becomes the **identity** (it is laid in place, §3.6); every other
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

### 2.3 The steer track

Two authored stretches, nothing else:

1. **The cancel** (line 2's drive ramp, 0.43125–0.5125): the drive's own swing is `sin(π·drive/2)`
   and would carry the twin's front wheel to full lock and back while the chain is being shown.
   Nine linear keys at drive 0, 0.25, … 2.0 (local 0.43125 + k·0.01015625, k = 0..8) with values
   `−sin(π·drive/2)`: 0, −0.383, −0.707, −0.924, −1, −0.924, −0.707, −0.383, 0. Between keys the
   chord of a sine misses by at most 0.02 of lock (half a degree on the twin): test 7 below pins
   `|total steer| ≤ 0.02` across the ramp. Outside the ramp the drive is held at an even number of
   turns, where the natural swing is exactly 0.
2. **The turn** (0.625–0.70): 0 → +1 → −1 → 0, inOutQuad per leg, at drive 2.0, so the total goes
   0 → +1 → −1 → 0 with no clamping anywhere (the clamp only bites when natural + extra leaves ±1).

The reveal's swing (rv-3) is unchanged.

### 2.4 Keyframe changes, summarised

- Section length: vibe-build 6 → 8 (Act I 17 → 19 screens). Amended 2026-10-05: 8 → 6.4 (§2.1a);
  the reveal 4 → 3.2 with rv-6 cut (storyboard §2.2); Act I 21 → 18.6 screens. Amended again
  2026-10-05: 6.4 → 7.2 for the basket's stage (§2.1b); Act I 19.4 screens.
- `mech.assembly` (vibe-build, local): 0 → 0; 0.28125 → 0; 0.34375 → 0.45; 0.4125 → 0.45;
  0.46875 → 0.61; 0.56875 → 0.61; 0.6125 → 0.73; 0.75625 → 0.73; 0.85 → 0.98; 0.85625 → 1.
  All linear. Rewind and spec as today.
- `mech.drive` (vibe-build): 0 until 0.43125; 0.5125 → 2.0; 0.875 → 2.0; 1.0 → 2.4. **Reveal
  re-keyed for continuity:** 0.14 → 2.7; 0.26 → 2.9; 0.52 → 3.0; 1.0 → 3.0 (rv-1 still shows 0.3
  crank turns, 0.8 wheel turns, with the natural steer going −0.59 → −0.89 as the line says it
  steers). Rewind and spec as today.
- `mech.steer`: §2.3 plus the reveal's existing swing.
- `camera.pos/target/fov`: S0 0–0.10; S1 at 0.175 (inOutCubic), hold to 0.37; S2 at 0.41
  (inOutCubic), hold to 0.53; S3 at 0.565 (inOutCubic), hold to 0.70; S1 at 0.745 (inOutCubic);
  S1′ at 0.85 (linear drift); hold to 0.875; then the lap's 36 keys to 1.0 (§4.3), ending exactly
  on S1′, which rv-1 holds to reveal 0.14 as today.
- `camera.frame`: 0 to 0.37; 1 at 0.41 (inOutCubic); 1 to 0.70; 0 at 0.745 (inOutCubic); 0 to 0.95;
  1 at 0.9675 (inOutCubic, the dive); 0 at 0.9875 (inOutCubic, W5).
- `camera.coreFocus`: 0 throughout the section (unchanged).
- Retired: the S4 hold (0.72–0.78) and its keys.

### 2.5 The brief's lines come up one at a time (text-engine delta to 10-04 §3)

The brief stays one document beat on one page, but each `ul.brief > li` carries its own `data-at`
and is **absent until then**:

```markdown
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
```

- **Loader**: a document beat gains `lines: { at: number; words: number }[]`, read from
  `data-at` on its brief lines (the html passes through `marked` untouched, as today). Lint: every
  brief line has a `data-at`; they are strictly increasing; the first is ≥ the beat's `at` + FADE
  (the ask comes up alone first); the last + FADE < the next page's `in`.
- **Curves** (`reveal.ts`): `lineReveal_i(l) = smoothstep(at_i, at_i + FADE, l)`, the beat's own
  curve shape; a line never dims (the document rule). `storyLooks` returns `lines: number[]` on a
  document beat's `BeatLook`; `applyLooks` writes `--reveal` on each `li`.
- **CSS**: `ul.brief > li { opacity: var(--reveal, 1); }`, and the `.no-js` block sets `--reveal: 1`
  on them as it does on beats. No transition (the existing check extends to `ul.brief > li`). The
  met look (`data-met`, `applyBrief`) is unchanged and still assembly-driven; the two never disagree
  because of the ordering fence below.
- **Screen readers**: opacity 0 keeps a line in the tree, so the whole brief is read in order as
  today; the hidden "(done)" status is unchanged.
- **Ordering fence (lint, vitest), amended 2026-10-05**: the words and the parts arrive together.
  For each brief line, its new parts set out at or after its `at` and no more than 0.1 screen after
  it (`at_i ≤ local(setOut_i) ≤ at_i + 0.1 / L`); it is never met while invisible
  (`local(threshold_i) ≥ at_i + FADE`); and it stays the newest line for its reading time
  (`max(0.3, words_i / 40)` screens before the next line comes up or the page goes). The rule as
  first designed follows, superseded:
- ~~**Ordering fence (lint, vitest)**~~: for each brief line, with `setOut_i = min over its parts of
  (settle.from − SETTLE_WINDOW)` and `local(a)` the first local at which the section's assembly
  track reaches `a`: `local(setOut_i) ≥ at_i + max(0.3, words_i / 40) / L` (the words come first and
  are read), and `local(threshold_i) ≥ at_i + FADE` (a line is never met while invisible). Both read
  the markdown, the keyframes and the bike's windows, so a change to any one of the three fails
  loudly. The 10-04 §3.3 document-beat dwell rule (measured to the first lighting) is replaced by
  this per-line rule; the ask's dwell is line 1's `at` − the page's `in`.

## 3. The frame's entrance

What exists: `frame` is one part — nine tube solids, the bottom-bracket shell, two cable runs
(`src/mechanisms/bike/shapes.ts` `frame()`), on the twin the stub, the mast sleeve and the climbing
top tube, mapped point for point. Today its motes fly from the spawn shell on their Bezier while the
whole part slides in from 0.9 m below and 1.4 m to the non-drive side, turned 0.4 rad about Y, over
one window: a rigid slide with motes raining onto it. The pipeline that any option must live in:
per-mote `settle` is set on the CPU (`attributes.ts`, a hash inside the part's window) and the
shader only reads it; the flight is `smoothstep(settle − SETTLE_WINDOW, settle, assembly)` along a
fixed quadratic Bezier from the shell; a mote is bright in flight and half as bright once settled,
then lit. So the cheapest place to make the frame interesting is **what order its motes land in**,
which costs no shader change at all; the next cheapest is one line of brightness in the shader.

### 3.1 Option A — laid in jig order, tube by tube (recommended)

The reader sees a bright knot form at the bottom bracket, then the down tube run from it up to the
head, the head tube rise (on the twin, on up into the mast), the seat tube and the top tube close
the triangle, the stays reach back to the axle, the bridge and the cables go on last; each tube
flares as it is laid and dims as the next one starts, so there is always one live seam. It feels
like a swarm building because the motes are everywhere in the air at once and the structure
crystallises out of them in a builder's order, not a renderer's. Needs: a per-part settle field
(§3.6), the frame's exploded offset set to the identity, and the landing flare (§3.7). The order is
the one steel-frame builders use — tack the main triangle in the jig from the bottom bracket out,
then the stays — described in Starling's build walkthrough (T3,
https://theloamwolf.com/2023/08/16/how-its-made-steel-frames-by-starling-cycles/) and in the jig
patent US5249818 (T2, https://patents.google.com/patent/US5249818: all members held in the jig, then
tacked to fix the geometry); a forum post quoting a tube maker's brazing order, bottom bracket →
down/head → head/top → top/seat, is T4 (https://www.bikeforums.net/18827303-post5.html) and only
confirms that there is a canonical order.

### 3.2 Option B — grown from the bottom bracket

The cheap cousin of A: the settle field is plain distance from the bottom bracket in part space, so
the frame grows outward like frost from one point: shell, then down tube, seat tube and chainstays
together, then the lug, the stays, the head, and the mast and the climbing top tube last (the wrong
parts arrive last, a nice accident). Reads as growth more than building; the tubes come up in
parallel, so no single seam. Needs: the same settle-field hook, one line of field.

### 3.3 Option C — tubes as sticks

Split `frame` into one part per tube (frame-down, frame-head, …), each with a short settle slot and
its own exploded offset, so each tube swings in as a rigid stick from its own direction and clicks
into its lug, staggered: the exploded-view drawing assembling itself. Strongly "pieces", reads in a
still (a stick mid-swing), and no shader change. Costs: twelve parts instead of one (the part
texture, the brief's `data-parts` → `frame-*`, `STATIC_PARTS`, the twin's point-for-point mapping
done per part, and every test that names `frame`); and rigid sticks arriving with motes already on
them is the same slide-in, twelve times, unless each stick's motes also stream.

### 3.4 Option D — tack, then braze

Two phases inside the window: a sparse 10 % of each tube's motes land first along its whole length
(the tacks, like the real jig step), then the rest fill in from the tacks outward, so the frame is
a dotted stick figure that thickens. Reads well in a still. Risk: a dotted blue outline of the whole
frame is one step from the white "drawing" the spec section owns, and the legend (white outline =
drawing, taught in sp-2) is better left unconfused; the author also said "no drawing" is the point
of the vibe build. Needs: the settle-field hook with a hash branch; no shader change.

### 3.5 Option E — a holding pattern

The frame's motes do not come from the shell: they gather first into a slow ring round the bike (a
staging orbit, the way a drone show parks its fleet between formations — Ingenia on drone displays,
T3, https://ingenia.org.uk/articles/how-do-drone-displays-work/; the assignment-plus-trajectory
formulation in arXiv 2603.24401, T2 preprint, https://arxiv.org/abs/2603.24401) and peel off tube by
tube. The most "swarm" of the five and the most expensive: a second control point or a per-mote
spawn attribute (a new `LayoutField`, the GLSL struct, the parity page), and a ring of
20 000 bright motes round the bike is hard to keep out of the text band. Not for this round.

### 3.6 Recommendation: Option A, in detail

**The lay order** (`FRAME_LAY`, exported from `shapes.ts` beside `frame()` and built from the same
constants, so it cannot drift from the geometry): segments `{ a, b, slot }` in bike coordinates
(correct build), `a` the root end (the joint already laid), `b` the far end, `slot` the frame's
settle sub-window. Slots partition `[0.81, 0.95]`, widths by tube length:

| # | Tube | Root → far end | Slot |
|---|---|---|---|
| 1 | bottom-bracket shell | a knot: `BB` (z ±0.035), no along | 0.810–0.818 |
| 2 | down tube | `BB` → `HEAD_BOTTOM` (+0.03 up the axis) | 0.818–0.838 |
| 3 | head tube | `HEAD_BOTTOM` → `HEAD_TOP`; the twin's mast sleeve maps onto its top | 0.838–0.854 |
| 4 | seat tube and clamp collar | `BB` → `SEAT_CLAMP`; the twin's stub maps onto its lower part | 0.854–0.872 |
| 5 | top tube | `SEAT_LUG` → head; on the twin it climbs to the mast join | 0.872–0.892 |
| 6 | chainstays and dropout stubs, both sides | `BB` → `REAR_AXLE` | 0.892–0.910 |
| 7 | seat stays, both sides | `SEAT_LUG` → `REAR_AXLE` | 0.910–0.928 |
| 8 | brake bridge | a knot on the stays | 0.928–0.934 |
| 9 | cables, front run then rear run | each from its stop at the head to its caliper end | 0.934–0.950 |

**The field**: `settleField(local, h)` for the frame = find the nearest segment to `local` (point
to segment distance; a frame mote is always within a tube radius of one), take `t` = its projection
along that segment clamped to 0..1 (0 for a knot), and return
`slot.from + (slot.to − slot.from) · clamp(0.8·t + 0.2·h, 0, 1)`: 80 % along-the-tube, 20 % the
mote's own hash, so the seam is a soft front, not a ruler. `h` is the mote's existing `h1`. The
field is evaluated on the **correct** local position for every mote; the twin's positions map point
for point, so the twin's mast and climbing top tube inherit the head tube's and top tube's order
without a twin-specific rule (pinned by test 3).

**Plumbing** (no shader change for this part):

- `MechanismPart` gains `settleField?: (local: Vec3, h: number) => number`, returning a value inside
  the part's `settle` window; `buildMoteAttrs` uses it in place of `from + (to − from)·h1` when
  present. The contract test checks the returned value lies in the window for every sampled point.
- The bike's `frame` spec declares it, with `settle: [0.81, 0.95]` and `explodedOffset` the
  identity (`at(0, 0, 0)`): the frame is laid in place; nothing already laid may slide.
- `partAssembly` for the frame then returns a value nobody reads (identity offset), which is fine.

**Timing on screen**: assembly 0.73 → 0.98 over 0.75625–0.85 (0.75 screens), so each slot is
0.04–0.06 screens: at a leisurely 4 s a screen the frame is laid in 3 s, one tube every 0.2–0.25 s,
the knot and the bridge faster. Motes for a tube set out 0.08 earlier (0.24 screens), so a third of
the way through, every frame mote is airborne and the picture is a cloud of thousands converging
on a half-laid frame whose live end flares. Stop anywhere and the still reads: laid tubes dim and
lit, one tube bright, the rest in the air. The fittings (brakes, mudguards, rack, ground) set out at
0.86, while the seat tube and top tube are being laid, and land 0.94–0.97 from below, as built.

**The lean-in** (S1 → S1′ over the build) is the only camera motion: the frame is the subject, and a
slow approach reads as attention.

### 3.7 The landing flare (shader change, both mirrors)

One line in `mote.glsl` and `mote.ts`, step 8, with two constants in `settle.ts` mirrored as
`MOTE_FLARE_WIDTH = 0.01` and `MOTE_FLARE_GAIN = 1.0` (declarations checked by `mote.test.ts` like
the existing pair):

```glsl
float flare = 1.0 - smoothstep(0.0, MOTE_FLARE_WIDTH, abs(uAssembly - a.settle));
o.brightness = mix(1.0, MOTE_SETTLED_BRIGHTNESS, t) + MOTE_FLARE_GAIN * flare;
```

A mote is brightest at the instant it lands (1.5: three times its settled 0.5, before lighting
multiplies on top) and fades as assembly moves 0.01 past its settle value. Size is unchanged. It is
one rule for every mote in the essay, and that is the point: on hash-windowed parts it is a sparkle
scattered over the landing (the wheels glitter as they seat; the gold in sp-6 twinkles as it lands),
on the frame the same rule lines up into a seam because the frame's settle values are ordered along
the tubes. On the rewind it runs backward: each mote sparks as it comes loose. Reduced motion: the
flare is a pure function of scroll like everything else, no code path to add.

Why the holds matter: a mote whose settle value is within 0.01 of a held assembly value would flare
for as long as the hold lasts. Every hold in the essay therefore sits ≥ 0.01 past the nearest window
edge (§2.2: 0.45, 0.61, 0.73, 1.0; the spec's 0.46), and test 5 sweeps the keyframes to prove no
mote flares during any hold. If the flare reads too hot on the wheels, the lever is `MOTE_FLARE_GAIN`
(0.5 keeps the seam readable); if it reads too short on the frame, `MOTE_FLARE_WIDTH` (0.015 with
the holds moved to 0.02 past their edges).

Prior art for the whole particles-arrange-into-a-mesh technique, for the implementer's orientation
only: r3f-points-fx (T3, https://www.npmjs.com/package/r3f-points-fx) morphs point clouds between
meshes with a per-point progress, which is the same shape as our per-mote settle.

## 4. The "Done" orbit

### 4.1 What it is

One full lap round the running bike in one screen of scroll (local 0.875–1.0), starting and ending
on S1′ so the brief's last frame and the reveal's first are both continuous with it: the camera
rises from the hold, goes round once, and comes to rest exactly where it started. It is a loop with
a shape, not a turntable (a lazy susan keeps radius and height fixed, which is the boring one —
melies.co on the lazy susan, T3, https://melies.co/cinematic-techniques/camera-movement/lazy-susan;
the curved-dolly and crane vocabulary it borrows from, T3,
https://www.strayspark.studio/blog/blender-cinematic-camera-rigs-dolly-crane-orbit). Four moves in
one path: a low wide pass along the drive side; a crane up behind, looking down the bike's length
(bars nearest and low, saddle far and high over the basket: the swap in one glance); a high
telephoto look from the far side, the bike as a diagram (seat, basket, wheel at one end, bars at the
other); a dive over the front onto the saddle on its mast, with the lens shift (`frame` → 1) putting
the saddle low-right under the text; then out and round to rest.

### 4.2 Waypoints (bike terms)

`t` is the lap's own parameter (0..1 over local 0.875–1.0). Bearing is continuous and increasing
(45 → 405 ≡ 45): one direction, no reversal.

| Key | t · local | Target (m) | Bearing | Elev | Distance | fov | frame | What is in shot |
|---|---|---|---|---|---|---|---|---|
| W0 = S1′ | 0 · 0.875 | whole | 45 | 8 | 4.4 | 40 | 0 | The finished bike, drive-side three-quarter, as line 4 left it. |
| W1 | 0.18 · 0.8975 | whole | 95 | 2 | 4.6 | 46 | 0 | The low pass: lens wide, nearly at ground level, square to the drive side; the near wheel and the chain large, the ground strip edge-on. |
| W2 | 0.38 · 0.9225 | (0.45, 0.60, 0) the top tube's middle | 160 | 38 | 3.8 | 34 | 0 | The crane: above and behind, looking down the length of the bike. The bars on the stub are nearest and lowest; the top tube climbs away to the mast; the saddle is the far, high thing over the basket. |
| W3 | 0.55 · 0.94375 | (0.55, 0.50, 0) | 250 | 55 | 4.6 | 30 | 0 | The diagram: high on the non-drive side, telephoto, perspective flattened; the order of things along the bike reads like a plan. |
| W4 | 0.74 · 0.9675 | (0.9, 0.65, 0) (S6's target) | 335 | 25 | 2.9 | 36 | 1 | The dive: over the front-left, onto the saddle on its mast just behind the basket, the wheel under it, the saddle cocked a little with the wheel (natural steer −0.45 here). S6's subject, mirrored to the non-drive side so the path does not cross itself. |
| W5 | 0.90 · 0.9875 | whole | 390 (=30) | 14 | 4.2 | 40 | 0 | Out and across the front toward the drive side; the whole bike again. |
| W6 = S1′ | 1.0 · 1.0 | whole | 405 (=45) | 8 | 4.4 | 40 | 0 | Rest. rv-1 holds here. |

Zoom and angle are played in three ways: lens (fov 46 at the ground, 30 at the top: the wide lens
makes the low pass loom, the long lens makes the diagram flat), distance (4.6 → 2.9 → 4.4), and
elevation (2 → 55 → 8). The dolly-zoom feel between W2 and W3 (further away, narrower lens, the bike
the same size, the background swinging) is a feature, not a side effect.

### 4.3 From waypoints to keys

`camera.pos/target` keys are lerped straight-line in machine-relative space, so two keys 90° apart
cut a chord through the bike. The lap is therefore **generated**, not hand-keyed: `orbitKeys()` in
`src/timeline/shots.ts` takes the waypoints above, interpolates them with a centripetal Catmull-Rom
spline in (bearing, elevation, ln distance, fov, target xyz) against a global `inOutCubic`
over `t` (so the lap leaves the hold and returns to it at zero speed, which is what makes W0 and W6
continuous with the holds on either side), samples **36** keys (every 1/36 of eased `t`; at the
fastest point about 15° of bearing a key), converts each with `shotKeys`, and emits linear keys for
`camera.pos`, `camera.target` and `camera.fov`; `camera.frame` is keyed by hand as §2.4 says. A
15° chord misses the arc by 1 − cos 7.5° = 0.9 % of the distance (4 cm at 4.4 m): invisible. The
generated keys are pasted into `keyframes.json` once, and test 9 regenerates them and holds the
file to them within 1e-3, the way the shots are held today.

### 4.4 Keeping the text clear

The text is one short line, but the panel's height is its tallest page's (the brief), so the
machine must stay under the 42 % band at every sample of the lap at both sizes, exactly as the
existing clearance test demands (it samples every 0.01 local through the page's full-ink stretch,
so the whole path is checked, not just the keys). The rule the waypoints were chosen by, for a wide
shot on a wide screen: the target lands at 66 % of the height, so the top of the twin (the saddle,
about 1.12 m up, 0.67 m above the whole-machine anchor) sits at
`0.66 − 0.5 · (0.67 · cos elev) / (d · tan(fov / 2))`, which must be ≥ 0.43:
`d · tan(fov/2) ≥ 1.46 · cos elev`. W1: 1.95 ≥ 1.46 ✓ (top at 49 %); W2: 1.16 ≥ 0.89 (the target is
0.15 m above the anchor, so the saddle is 0.52 m above it, and it is the far end from a camera
behind the bike) ✓; W3: high
and long, trivially ✓; W4: with `frame` 1 the target sits at 78 %, the saddle 0.47 m above it
projects at 55 % ✓, and nothing stands above the saddle; W5: 1.53 ≥ 1.42 ✓ (d 4.2, not 4.0, for
that reason). Portrait is safer still: the rig backs off by √m and widens by √m. These are starting
values; the clearance test is the arbiter and a failing sample moves the nearest waypoint out or up.

### 4.5 Continuity, motion, reduced motion

- Starts and ends on S1′ at zero speed; the brief's last 0.025 of hold and rv-1's 0.14 of hold sit
  either side. No reveal camera key changes.
- The bike rides during the lap (drive 2.0 → 2.4, 0.4 crank turns, 1.1 wheel turns): slow enough
  that the camera is the motion and the wheels are life. The twin's saddle swings toward lock with
  the natural steer, visible from the crane and in the dive, unremarked: the reader who notices is
  ahead of the text, which is the picture-book way to plant it.
- Reduced motion: every camera move in the essay today is scroll-scrubbed and governed by the
  reader's own scrolling (the e2e reduced-motion check pins only the shimmer), and the lap is no
  different. The design spec §8's "no camera flights, crossfade stills" is not built; if it is, the
  lap's reduced form is **hold S1′ for the whole of vb-4**, which is continuous on both sides by
  construction. Say that in the code comment on `orbitKeys()` so nobody designs a second path.

## 5. Decisions and what each costs if wrong

| Decision | Cost if wrong |
|---|---|
| Brakes become fittings of the frame (land last, under line 4), not a line. | If the author wants the levers' moment back, the parts are already under the bars (core); a line is a markdown edit and one window. Nothing structural. |
| Per-line `data-at` on the brief, absent until then; the met look stays assembly-driven. | If the author prefers lines to come up *with* their parts, drop the ordering fence's read margin (one constant); the mechanism is the same. |
| `SETTLE_WINDOW` 0.12 → 0.08 (global). | Every flight leaves the shell later in assembly terms, re-spaced by keys so scroll time is unchanged; the spec section's margin at 0.46 shrinks from 0.12 to 0.01. If a flight ever looks short, the lever is the key spacing, not the constant. Reverting means squeezing the four stages back into 0.54 of assembly: not possible with the words-before-parts rule, so this one is load-bearing. |
| Drive held at 2.0 (an even number of turns) through the turn and the frame; the natural swing cancelled with nine steer keys during the chain demo. | If the cancel reads as a wobble (it is ≤ 0.5° on the twin), replace `mech.steer`'s add with a replace (one line in `steer()`) and re-key the reveal's lock, as 10-04 §5 already allowed. |
| The frame grows in place (identity offset) with a settle field; no split into tube parts. | If the author wants rigid sticks swinging in (Option C), the field stays and each tube part gets its own offset; the fence and brief mapping change to `frame-*`. |
| The landing flare is one rule for every mote. | If it over-sparkles the wheels or the gold, `MOTE_FLARE_GAIN` 1.0 → 0.5; if it must be frame-only, a role or part bit in `aMeta1` (a `LayoutField`, the struct, the parity page): a day, not an hour. |
| Holds sit 0.01 past window edges so nothing flares at rest; the spec's hold at 0.46 is unchanged. | A future key that holds exactly on an edge lights a few motes for as long as the hold: test 5 catches it. |
| The lap is generated (36 keys) from seven waypoints, not hand-keyed. | More keys in the JSON; a hand edit to one of them fails test 9. The alternative, a polar key type in the rig, is cleaner but touches the sampler and every mechanism. |
| The lap keeps the bike riding (drive 2.0 → 2.4) and the reveal's drive keys shift to 2.7 / 2.9 / 3.0. | If rv-1's 0.3 turns read as too little "it runs", hold the drive through the lap and give rv-1 the full 2.0 → 2.6 as today; the lap then shows a still bike, which the author may prefer. |
| Eight screens for the cold open (was six). | The 40-words-a-screen constant is still the lever; the turn and the frame (1.35 screens together) are the new cost and are the point. |
| Reduced motion treats the lap as any scroll-scrubbed move, with "hold S1′" named as its still form. | If a reviewer insists on stills now, it is a `?rm=` input to the sampler and one branch at vb-4; the rest of the essay's camera needs the same treatment and should get it together. |

## 6. Tests that pin it

Vitest:

1. **Windows in list order**: in the bike, the stages of §2.2 are disjoint in `[from −
   SETTLE_WINDOW, to]` in list order (core, drive, fork, frame, fittings), and `briefThresholds` for
   the shipped brief is `[0.44, 0.60, 0.72, 0.97]`.
2. **Frame lay order**: over the frame's sampled points, every mote's settle lies in its nearest
   segment's slot; mean settle rises in `FRAME_LAY` order; along each tube the rank correlation of
   settle with `t` is ≥ 0.9 (the 20 % hash keeps it under 1).
3. **The twin inherits the order**: the same motes sorted by settle, read at their twin positions,
   trace the twin's head tube bottom to top and its top tube from the stub to the mast join (the
   last-settling frame motes are the mast's and the join's).
4. **Flare**: `MOTE_FLARE_WIDTH` / `MOTE_FLARE_GAIN` declared in `mote.glsl` equal to `settle.ts`;
   `mote()` brightness at `assembly = settle` is `SETTLED_BRIGHTNESS + FLARE_GAIN` and at
   `settle ± WIDTH` is `SETTLED_BRIGHTNESS` (landed) / 1 (in flight).
5. **No flare at rest**: for every stretch of the keyframes where `mech.assembly` is constant for ≥
   0.05 local (including the spec's 0.46 and the finished bike at 1), no mote of the bike has flare
   > 0.
6. **Seam**: at assembly 0.86 the motes with flare > 0.5 are all frame motes within 0.03 m of at most
   two consecutive `FRAME_LAY` segments.
7. **Steer**: `|total steer| ≤ 0.02` across the chain ramp (0.43125–0.5125); the turn reaches +1 and
   −1 inside 0.625–0.70 and is 0 at both ends; the reveal's swing is as before.
8. **Shots**: `HOLDS` becomes S0 0–0.10, S1 0.175–0.37, S2 0.41–0.53, S3 0.565–0.70, S1 at 0.745,
   S1′ 0.85–0.875, then reveal S1′ 0–0.14 as today; S4 removed.
9. **The lap**: `orbitKeys()` regenerated equals the keyframes' camera keys over 0.875–1.0 to 1e-3;
   the key at 0.875 and at 1.0 both read back as S1′; bearing read back is strictly increasing
   through the lap and spans 360° ± 1°; `shotOf` at each waypoint's local matches its row to the
   tolerances of the existing shot test.
10. **Brief lines**: loader lint (§2.5); `lineReveal` curves exact at the knots; the ordering fence
    (words before parts; never met while invisible); the §1 copy table of this document is the
    fence's source for the vibe-build section.
11. **Dwell**: §2.1's budget table holds, with the per-line rule of §2.5.

*Amended 2026-10-05: tests 7 to 10 and 16 hold the same things at §2.1a's locals (the chain ramp
0.3203125–0.421875, the turn 0.5390625–0.6328125, the lap from 0.84375, the frame frames at
0.7171875, 0.7546875 and 0.7859375); test 10's fence is the amended one (words and parts together);
and a content test keeps Act I's narration free of colour and dot words.*

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

Playwright (both sizes, `?test=1`):

12. **Absent, not dim**: at each brief line's `at` − 0.01 its computed opacity is 0 and it is not
    met; at `at` + FADE it is 1 and still not met; it is met exactly from its threshold's local. The
    "five lines" test becomes four.
13. **Purity** extends to `ul.brief > li` `--reveal` (jump vs scroll, forward vs back).
14. **Clearance** runs unchanged over the longer section and the lap (every 0.01 local); the lap's
    machine top never leaves the viewport in its wide keys.
15. **No transitions** extends to `ul.brief > li`.
16. **Screenshots** at: vb-brief-ask, vb-brief-line1..4 (just after each lights), vb-turn-lock
    (0.64375), vb-frame-knot (0.78), vb-frame-mid (0.81), vb-frame-stays (0.835), vb-lap-low (W1),
    vb-lap-crane (W2), vb-lap-diagram (W3), vb-lap-dive (W4). These feed the no-WebGL stills.
17. **Parity** (existing): the GLSL and TS `mote()` agree with the flare in, over the same sample set.

## 7. As built (2026-10-05)

Everything above is built as written, except for these differences, each made where a number did
not hold or a test could not be met as worded:

- **The drive's window is [0.54, 0.60], not [0.53, 0.60]**, and the loose bolts' [0.54, 0.59]. §2.2's
  arithmetic was off by one step: a stage sets out at `from − SETTLE_WINDOW`, so at 0.53 the drive
  sets out at 0.45, before the spec section's hold at 0.46, and blue motes would leave the shell
  while sp-6 says only the gold lands (the keyframes test "nothing of its body" fails). At 0.54 it
  sets out exactly at 0.46, as the old windows did. Line 2 still lights at 0.60.
- **Test 1 reads "disjoint in list order" for core, drive, fork and frame.** The fittings cannot be
  disjoint from the frame as §3.6 designs them (they set out at 0.86, while the seat tube is laid):
  the test holds them to setting out after the frame starts and landing after it ends.
- **The ordering fence's "parts of a line"** are the parts it names that are not already in place
  when the line before it lights (line 2 names the pedals, which land with line 1; line 3 names the
  front wheel, which lands with line 2). And `local(a)` is the first local at which assembly passes
  `a`, strictly: a stage held exactly at a set-out value (0.61, 0.73) has not yet set out.
- **The frame's settle field** picks the tube whose surface is nearest (distance to the run less its
  radius), not the nearest axis: the rear cable runs along the top tube 0.024 m off its axis, nearer
  than the top tube's own axis to the top tube's skin on that side.
- **Line 1 is 14 words, not 15** (§1 corrected; the 96-word total was right).
- **The lap's crane and diagram are further out**: W2 5.2 m at fov 38 (was 3.8 m at 34) and W3 6.3
  m at fov 30 (was 4.6 m). At the starting values the twin's top stood at 32 % of a wide screen
  between them, in the text band. The dolly-zoom is kept: W3 is further and longer-lensed than W2,
  and the bike about the same size. The dive's lens shift (`camera.frame`) starts at W3 (0.94375),
  not 0.95, so the bike is already moving down as the camera drops toward the saddle.
- **The lap keys** are the 36 uniform ones plus one at each inner waypoint (41), so every waypoint is
  a key and reads back to the shot test's tolerances; between keys a 10-15 degree chord would miss
  W1..W5 by 4 cm. The spline's knots are centripetal in the camera's own path (bike metres),
  reached at `inOutCubic(t_i)`, so the camera is at waypoint i at its own `t`.
- **The global constraint "mote.glsl and mote.ts are not changed"** gave way to this design's §3.7,
  which the author approved; both mirrors change together and the parity e2e passes (and fails when
  the two flare gains differ).
- **`MOTE_FLARE_GAIN` is 3, not 1** (amended after the first build). At 1 the tube being laid was
  barely brighter than the tubes already laid: screen blending saturates the agent blue, so a
  brighter mote can only go whiter, and the seam did not read at 1x. At 3 the live tube is clearly
  brighter, white-cored with blue edges, and nothing at rest flares (the holds are unchanged;
  `MOTE_FLARE_WIDTH` stays 0.01).
- **The author's edits (2026-10-05).** The parts fly in as their line comes up (§2.1a), vb-3 is cut,
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
  the panel's full height inside the 0.42 band, as before.
