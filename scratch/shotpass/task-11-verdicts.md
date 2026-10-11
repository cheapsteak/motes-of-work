# Task 11 shot pass: the reviewer, trace, fix and lesson sections

Worktree at 105fe61. Stills come from probe poses (`?test=1&mech=bike&probe=<shot[,to,x]>&state=…&ambient=…`). The `probe` parameter is a shot-pass-only addition to `main.ts` that frames any `GalaxyShot`, or a point on a move between two shots, through `poseOf`/`moveShares`/`between`. Every still is at `AMBIENT_POSE` (9.5 s) unless its name ends in `-a101`. Phone 390×844 comes first, then `desktop/` at 1440×900. Each beat is sampled at the middle of its hold, with `net.*` interpolated from keyframes.json (growth, fix, highlight and review are keyed already) and the brief (lamp, streams):

| Beat | Local | growth | fix | highlight | review | streams | lamp |
|---|---|---|---|---|---|---|---|
| re-1 | reviewer 0.2 | 0.5594 | 0.2 | 0.3 | 0.233 | 0 | 2 on P5 |
| re-2 | reviewer 0.51 | 0.5868 | 0.2 | 0.3 | 0.807 | 0 | 2 on P5 |
| re-3 | reviewer 0.81 | 0.5975 | 0.2 | 0.3 | 1.2 (feed full) | 1 | 2 on P5 |
| tr-1 | trace 0.18 | 0.6162 | 0.2 | 0.548 | 1.2 | 1 | 2 → 4 (brief) |
| tr-2 close | trace 0.5 | 0.638 | 0.2 | 0.92 | 1.2 | 1 | 4 |
| tr-2 surge | trace 0.84 | 0.6505 | 0.2 | 0.977 | 1.2 | 1 | 4 |
| fx-1 | fix 0.08 | 0.6658 | 0.279 | 1 | 1.2 | 0 | 4 (brief leaves it blank) |
| fx-2 | fix 0.28 | 0.6808 | 0.521 | 1 | 1.2 | 0 | 4 (brief leaves it blank) |
| fx-3 | fix 0.51 | 0.725 | 0.6 | 1 | 1.2 | 0 | 3 |
| fx-4 | fix 0.81 | 0.81 | 0.786 | 1 | 1.571 | 1 | 3 |
| ls-1 | lesson 0.5 | 0.934 | 1 | 0 | 2 | 0 | 3 |

**The band** is measured on the lit set alone. The frame is redrawn with every `galaxy-*` (sky) mesh isolated away, and the first row that differs from the stage by more than 24 is read. The limit is 0.42 h + 8 px, which is 0.4295 on a phone and 0.429 on desktop. "Lit top" below is that row as a share of the height. The red line on `sheet-phone.png` is 0.42. **"Cylinder"** is `bandClearance` (cylinderTop minus band minus 8 px): ≥ 0 passes. It is the minimum over `AMBIENT_GRID`.

**Which shaders each still was rendered with:**
- Everything rendered before 07:47 (the brief's stills `re-1`…`ls-1`, `-a101`, `diag/tr-1-*`) uses the shaders as committed. In those, the reviewer's ring is not drawn (see "Code changes" 1).
- From 07:47 the ring material is DoubleSide: every `-ring`, `-alt-*` and `-rec*` still. `re-3-alt-feedflip*` adds the feed-fade flip, and `re-3-alt-feedlast*` / `re-3-alt-b127*` add the last-quarter feed dots too.
- `re-3-rec-specfeed*`, `re-3-alt-cent-*`, `fx-*-rec-healed`, `ls-1-rec`, `tr-1-rec` use DoubleSide with the stream shader as specified (no feed probes).
- `re-3-alt-climb-ringfloor-*` and `re-3-rec-ringfloor-*` add a 9 px ring floor and lineage streams gated off while the feed is up.
- `re-3-alt-climb-feed09*` and `re-3-rec-feed09*` add the ring floor, the feed-only gate and the feed at 0.9, unfaded (Code changes 2 to 4).
- `tr-1-rec-210*` and `tr-2-surge-rec-210*` use DoubleSide, the ring floor, and the stream shader as specified.

---

## re-1: "So you ask a reviewer to look at every new piece of work before it is kept."

- **Proposed:** (−170, 68, 2.7·outer(P5), 38, 0.5; P5), lamp 2. The ring visits V1–V9 on P5. No landscape variant.
- **Verdict: FALSE.**
  - **The ring is not drawn.** With the shaders as committed, `re-1` and `re-1-ring` differ only in the ring, which appears once the ring material is DoubleSide. The ring's quad winds (x,z) (−1,−1)→(1,−1)→(1,1), so its face normal is −y, and every Act II camera looks down on it and back-face culls it. The reviewer's light is invisible on every beat. `drawStats().visible` still lists `net-ring`, so no current test sees this.
  - **Framing.** With the ring fixed, the phone frame reads (lit top 0.504). But at −170 the visited planets leave the frame over the hour: V9 is at x −21 at a101 and at 419 at a600, and V8 is at x 0 at a900 (sp11pos). Desktop has no landscape variant, so its lit top is 0.371 (−52 px). Cylinder: −10 phone, −206 desktop.
- **Change:** (**−127**, 68, **3.5**·outer(P5), 38, 0.5; P5), lamp 2, riding the turn, with **`landscape: { distance: 70, frame: 0 }`**. Plus Code change 1.
  - At −127/3.5, V1–V9 stay inside the frame at all five sampled poses (9.5, 101, 300, 600, 900).
  - Lit top is 0.543 on a phone and 0.517 on desktop.
  - Cylinder is 41 phone and 25 desktop. Landscape 55, the previous agent's value, gave −24/−44 on desktop, so 70 is the least that passes.
- **Stills:** `re-1-390x844.png` (as briefed, ring culled) vs `re-1-ring-390x844.png` (ring fixed) vs `re-1-alt-b127-390x844.png` (recommended); `desktop/re-1-1440x900.png` vs `desktop/re-1-rec-1440x900.png`.

## re-2: "The reviewer says they are all fine."

- **Proposed:** as re-1.
- **Verdict: FALSE as briefed** (the ring is not drawn; the desktop lit top is 0.337; the visits leave the frame). **TRUE with re-1's change.**
  - Mid-hold, the ring sits on V8 (C22, an ember defective piece) whole in the lower left. Ember and blue visits alike are passed and left as they were, which is "all fine" with the defect plainly there.
  - Lit top is 0.520 on a phone and 0.492 on desktop. Cylinder (re-3's growth, the worst case) is 26 phone and 9 desktop.
- **Stills:** `re-2-390x844.png`, `re-2-ring-390x844.png` vs `re-2-alt-b127-390x844.png`; `desktop/re-2-rec-1440x900.png`.

## re-3: "The reviewer read the same rule."

- **Proposed:** as re-1; `net.streams` 1, with the feed from R0 to the ring timing its own `feedAlpha`. Stage direction: *a stream runs out from the hub to the light; the camera starts to follow it inward.*
- **Verdict: FALSE.**
  - **No reviewer framing can show the feed.** In any frame where the ring is legible, R0 is thousands of px off-screen (at (48, 4540) at −127/3.5). Only the feed's child end reaches the frame, where §15.2's fade has it at 0.15 × `STREAM_CAP`, with ≤ 40 dots spread over a ~70-unit chord. As specified it draws **5 px with a peak delta of 16** (`re-3-rec-specfeed` vs `-nofeed`).
  - **The previous agent's probes don't fix it.** Its feed flip (bright at the ring) gives 6 px at delta 63. Adding its last-quarter dots gives 24 px at delta 64, a few faint dots running along the right frame edge (`diag/re-3-rec-feedflip*`, `diag/re-3-rec-feedfliplast*`, `re-3-alt-feedlast*`).
  - **The lineage streams show instead.** `net.streams` 1 also lights P5's lineage streams (123 px, `re-3-rec-specfeed` vs `re-3-rec-nostreams`), which contradicts §14.5's "the feed only".
- **Change:** re-3 becomes the first leg of the climb.
  - **Camera.** Under re-3's line the camera pulls back from the re shot to **(39, 75, 170, 38, 0.85; centroid [P5, R0]), `landscape: { distance: 300, frame: 0, bearing: −51 }`**, riding the turn. That frames the hub and the light together.
  - **Lamp.** Lamp **4 (core)** from the pull-back, so the hub is lit. Under lamp 2 on P5 the hub is dark and the feed comes out of nothing (`re-3-alt-climb-ringfloor-feedonly`).
  - **Code.** Three rendering changes, plus Code change 1 for the ring.
  - **Measured.** Lit top is 0.552 on a phone (0.552 at a101) and 0.642 on desktop. Cylinder is 70 phone and 185 desktop.
  - **What it shows.** The four core bodies (R1 ember, R0 not yet lit; it lights at the surge), one dotted stream from R0 straight down to the reviewer's ring, and nothing else lit. That is "the same rule" feeding the reviewer.
  - **Tried without the three code changes** (`re-3-alt-cent-core`, as specified): the feed is 40 px at delta ≤ 61, invisible at true gain among a dozen lineage streams leaving the core, and the ring is a 3 px grey dot. It reads as "streams leave the hub", not "the reviewer read the rule".
  - **If the author will not exempt the feed from `STREAM_CAP`**, re-3 cannot be better than WEAK. The best fallback is the hub-and-light framing with the ring floor and the feed-only gate, which still leaves a feed you can find only when you look for it.
- **Stills:** `re-3-390x844.png` (brief), `re-3-ring-390x844.png`, `re-3-rec-specfeed-390x844.png` (the recommended reviewer shot, feed as specified), `re-3-alt-cent-core-390x844.png` (hub and light, as specified) vs **`re-3-alt-climb-feed09-390x844.png`**, `re-3-alt-climb-feed09-a101-390x844.png`, **`desktop/re-3-alt-climb-feed09-1440x900.png`** (recommended).

## tr-1: "Follow the defects back."

- **Proposed:** the climb, tracking V9 → P5 → R0 along the lit streams, lamp 2 → 4.
- **Verdict: FALSE.**
  - Mid-climb under lamp 2 nothing is lit: the frame is empty (`tr-1`, `tr-1-a101`, desktop too). P5's system is behind the camera and nothing else is in the lit set.
  - Under lamp 4 the core bodies fill the band: lit top 0.358–0.402 for climb shares 0.6–1.0 (`diag/tr-1-x*-l4`).
  - At no point does the climb show "the defects" (the ember lineage) leading anywhere.
- **Change:** the climb rides the page turn from re-3's hub-and-light framing to **the lineage wide: (42, 82, 210, 40, 0; core), `landscape: { distance: 340, frame: 0, bearing: −10 }`, riding the turn, lamp 5 (R0's lineage, `lampAt` R0)**, `net.streams` 1. tr-1 holds there.
  - **What it shows.** Every ember branch (stars, planets and their streams) runs in to the core. It is the line's "back" as one picture, and a reader follows it with their eye.
  - **Measured.** Lit top is 0.603 on a phone (0.603 at a101) and 0.504 on desktop. Cylinder is 81 phone and 53 desktop.
  - **Why 210 and not ly-3's 191:** 191 leaves an R0-lineage filler star cut by the right edge on a phone (x ≈ 388, `tr-1-alt-lineage`).
  - **Why bearing −10 on desktop:** the landscape at 273/b42 runs the lineage off the bottom edge (`desktop/tr-2-surge-alt-lineage`); −10/320 or 340 holds it whole.
- **Caveat:** at tr-1, R0 is not lit yet (hiAt 0.92), so the one ember core body is R1. The branches converge on the core, not visibly on R0, until tr-2's close shot. That is the reveal, so it is acceptable. Note it for the author.
- **Stills:** `tr-1-390x844.png`, `diag/tr-1-x0.6-l4-390x844.png` (as briefed) vs **`tr-1-rec-210-390x844.png`**, `tr-1-rec-210-a101-390x844.png`, **`desktop/tr-1-rec-210-1440x900.png`**.

## tr-2: "They all lead to one place at the centre: one incorrect rule."

- **Proposed:** (−25, 35, 8, 36, 1; R0) → (−10, 62, 30, 40, 0; core), lamp 4, the surge 0.92 → 1.
- **Verdict: FALSE.**
  - **The close.** R0 is ember and whole, but a blue core body sits cut at the right edge in the band: lit top 0.393 on a phone and 0.099 on desktop (no landscape variant).
  - **The surge at 30.** It shows four core bodies with R1 cut at the right edge. None of the stars, their planets or the mark that the surge is meant to reach is in frame. Lit top is 0.435 on a phone (5 px clear, 3 px short of the margin) and 0.096 on desktop. Cylinder is −78 phone and −268 desktop.
- **Change:**
  - **Close:** **(−15, 35, 8, 36, 1; R0), `landscape: { distance: 15, frame: 1, bearing: 0 }`**, lamp 4. R0 is alone, whole and ember on a phone (0.610; 0.608 at a101). Desktop shows R0 beside one blue core body, both whole (0.596). It is the same bearing as fx-1, so fx-1 is a hold.
  - **Surge:** pull back to **tr-1's lineage wide (210 / landscape 340 at −10), lamp 5**, highlight 0.92 → 1. R0 and R1 are ember and the lit streams fan out to the stars, their planets and the reviewer's ring (the ring needs Code changes 1 and 2). Lit top is 0.603 on a phone and 0.504 on desktop; cylinder 81/53.
  - **Rejected:** bearings 150 and 165 put the other core bodies in the band (0.002–0.086).
- **Stills:** `tr-2-close-390x844.png` vs **`tr-2-close-alt-b-15-390x844.png`**, `tr-2-close-alt-b-15-a101-390x844.png`, **`desktop/tr-2-close-alt-b-15-1440x900.png`**; `tr-2-surge-390x844.png`, `desktop/tr-2-surge-1440x900.png` vs **`tr-2-surge-rec-210-390x844.png`**, **`desktop/tr-2-surge-rec-210-1440x900.png`**.

## fx-1: "Fix the rule."

- **Proposed:** (−15, 35, 8, 36, 0.75; R0). No lamp or landscape given.
- **Verdict: FALSE.**
  - On a phone R0 is whole (0.579). But at mid-hold it is still ember: `net.fix` crosses R0's fixAt 0.46 (window 0.43–0.46) only at fix 0.12–0.13, just before fx-2's line comes up at 0.14 and the camera pans away. The rule is fixed in a blink between two lines.
  - Desktop has no landscape variant, so a second core body stands in the band (0.180).
- **Change:**
  - **Keys:** `net.fix` 0.2 → **0.42 over the page turn into fix** (nothing has a fixAt in 0.2–0.43, so the jump is invisible), then **0.42 → 0.48 over fix 0.0–0.12**, then 0.5 by 0.14 as now. R0's warm motes then land over fix ≈ 0.02–0.08, mid-hold, at ~0.28 screens rather than ~0.05.
  - **Lamp:** 4 (core), as tr-2.
  - **Desktop:** `landscape: { distance: 15, frame: 1, bearing: 0 }`. Healed, R0 is blue with amber dust: 0.579 on a phone and 0.631 on desktop.
- **Stills:** `fx-1-390x844.png` (mid-hold, as keyed, still ember) vs **`fx-1-rec-healed-390x844.png`**, **`desktop/fx-1-rec-healed-1440x900.png`**; `desktop/fx-1-1440x900.png` (as briefed).

## fx-2: "And fix the rule an agent wrote from it, or the defect will spread again."

- **Proposed:** the pan to the same shot on R1.
- **Verdict: FALSE.** At −15 a blue core body is cut by the left edge inside the band: lit top 0.325 on a phone and 0.076 on desktop.
- **Change:** **(−60, 35, 8, 36, 0.75; R1), `landscape: { distance: 15, frame: 1 }`**, lamp 4.
  - Lit top is 0.578 on a phone and 0.478 on desktop at mid-hold, and 0.579/0.478 healed.
  - R1 heals over fix 0.29–0.32 with the existing keys, in the second half of the hold after the pan lands. That is true as is. Optionally ease it to mid-hold with `net.fix` 0.5 at 0.20 → 0.58 at 0.34.
  - Rejected: bearings 165 and 180 (0.284/0.331 on desktop).
- **Stills:** `fx-2-390x844.png` vs **`fx-2-alt-b-60-390x844.png`**, **`fx-2-rec-healed-390x844.png`**, **`desktop/fx-2-alt-b-60-1440x900.png`**, `desktop/fx-2-rec-healed-1440x900.png`.

## fx-3: "Now new work built from them is correct."

- **Proposed:** (20, 70, 60, 40, 0; the midpoint of core and hood), lamp 3, streams 0.
- **Verdict: FALSE.**
  - The new work under this line is P7 (from R0, born 0.70) and Q3 (from R1, born 0.72) with C27–C32 (0.715–0.75), all inside fx-3's growth 0.69–0.76. At 60 both are out of frame on both screens (P7 at x 788, Q3 at x −166 on a phone).
  - The core is in the band: lit top 0.384 on a phone and 0.091 on desktop. Cylinder is −316 phone and −708 desktop.
  - The target also needs a new "midpoint" target type.
- **Change:** **the up-2 framing pulled back: (0, 82, 210, 40, 0.85; hood), `landscape: { distance: 540, frame: 0 }`**, riding the turn, lamp 3.
  - **What it shows.** R0 and R1 healed (pale) in the core, the old ember lineage still lit (the sweep comes next), and P7 and Q3 forming in plain blue at every pose (P7 at (328, 628), Q3 at (145, 780) on a phone).
  - **Measured.** Lit top is 0.545 on a phone and 0.513 on desktop. Cylinder is 42/30 at growth 0.69 and 38/27 at 0.76.
  - **Bonus.** fx-3 and fx-4 share the camera, so there is no move on the page turn.
  - **Rejected:** mid 120 (P7 and Q3 still out of frame; cylinder −1/−17).
- **Caveat (legibility):** the new pieces are 3 px points and their planets 1 px; "new" reads only through their builders' flights. WEAK legibility, but true.
- **Stills:** `fx-3-390x844.png`, `fx-3-alt-mid120-390x844.png` vs **`fx-3-alt-hood210-390x844.png`**, **`desktop/fx-3-alt-hood210-1440x900.png`**.

## fx-4: "Then trace everything built from the incorrect rule, and fix what it already made."

- **Proposed:** (0, 82, 120, 40, 0; hood), lamp 3, streams 1, the sweep.
- **Verdict: FALSE** as briefed. Stars stand in the band: lit top 0.236 on a phone and 0.000 on desktop; cylinder −243/−604. This is the 120 that up-2 already had to leave.
- **Change:** fx-3's shot (hood 210, frame 0.85, landscape 540).
  - **What it shows.** Mid-sweep, the stars are healed (pale), the planets are still ember, and the lineage streams run out from the core: the sweep, hub to rim.
  - **Measured.** Lit top is 0.514 on a phone (0.514 at a101) and 0.489 on desktop. Cylinder is 16 phone and 9 desktop at growth 0.86 (fx-4's end).
  - **Rejected:** up-2's 169, whose cylinder is −31/−26.
- **Stills:** `fx-4-390x844.png`, `fx-4-a101-390x844.png` vs **`fx-4-alt-hood210-390x844.png`**, `fx-4-alt-hood210-a101-390x844.png`, **`desktop/fx-4-alt-hood210-1440x900.png`**.

## ls-1: "The closer to the centre a thing sits, the longer you look at it."

- **Proposed:** (10, 80, 40, 40, 0; core), lamp 3.
- **Verdict: WEAK on a phone, FALSE on desktop.**
  - On a phone the five core bodies are whole and clear (0.472). But the stage direction is *the few large bodies, the stars around them, the arms fanning out*, and the Coda's map needs "rings around a centre". At 40 there are no stars around the core.
  - Desktop is in the band (0.374). Cylinder −691/−1458.
- **Change:** ly-3's framing, further off: **(42, 82, 270, 40, 0; core), `landscape: { distance: 400, frame: 0 }`**, lamp 3, riding the turn.
  - **What it shows.** The core in the middle, the stars in a ring round it, and the arm's dust curving to the edges: literally rings around a centre.
  - **Measured.** Lit top is 0.570 on a phone and 0.596 on desktop. Cylinder is 29/26 at growth 0.934 and 19/13 at growth 1 (lesson's end).
  - **Why bearing 42 and not 10:** at bearing 10 the cylinder fails at 270/380 on desktop (−14), and at 191 on both screens.
- **Stills:** `ls-1-390x844.png`, `desktop/ls-1-1440x900.png` vs **`ls-1-rec-390x844.png`**, **`desktop/ls-1-rec-1440x900.png`**; `ls-1-alt-ly3-270-*` (landscape 380: cylinder 3 on desktop at growth 1, too close).

---

## Code changes the beats need (for the implementer; nothing is committed)

1. **The reviewer's ring is culled (needed for re-1, re-2, re-3 and the surge).**
   - **Edit:** `ringMaterial.side = DoubleSide` in `bodySystem.ts` (the previous agent's probe edit), or keep FrontSide and flip the quad's winding in `flatRing.vert.glsl` (`vec3(aCorner.x, 0.0, -aCorner.y)`).
   - **Why:** without it the ring never draws from any camera above the galactic plane, which is every Act II camera.
   - **Add a pixel test:** `drawStats().visible` lists `net-ring` while the ring is culled, so a visibility check cannot catch this.
2. **A pixel floor on the ring (needed for re-3's hub-and-light framing and the surge).**
   - **Edit (tested):** in `flatRing.vert.glsl`, the drawn radius becomes `max(uRingRadius, 9 · uPixelRatio / pxPerUnit)`. At 170–210 the ring is otherwise a 3 px grey dot.
   - **Mirror pair:** ringAt's TS side and any ring test that reads the radius must follow.
3. **The feed shown alone under re-3 (needed for re-3).**
   - **Edit:** `net.streams` gates the lineage streams and the feed together, so "the feed only" (§14.5) cannot be keyed. Split the gate: lineage streams × `net.streams`, and the feed × a new leaf (for example `net.feed`, 1 under re-3, tr-1 and tr-2, 0 elsewhere; feedAlpha still applies). Then re-3 keys `net.streams` 0.
   - **Tested:** I approximated it by gating lineage dots × (1 − uFeed). That approximation is wrong for the trace (the feed stays up through it) and is a probe only.
4. **The feed exempt from `STREAM_CAP` and the fade (needed for re-3; needs the author's ruling).**
   - **Edit (tested):** the feed at gain 0.9, unfaded, 1 px dots. At §15.2's 0.3 cap fading to 0.15, a single feed is invisible at true gain even framed whole. At 0.9 it reads as one dotted line from R0 to the ring on both screens.
   - **Conflict:** this breaks the global "capped at STREAM_CAP 0.3 … faded mix(1, 0.15, u)" constraint for the feed only.
   - **Mirror pair:** `stream.vert.glsl` with `bodyMote.glsl`'s `streamGain` and its `stream.ts` twin, plus a parity mode.
5. **A track target for re-3.** Append `{ centroid: ['P5', 'R0'] }` to `TRACK_TARGETS` (the previous agent's netTrack edit already does).

**Probe edits not needed:**
- **`bodyMote.glsl` last-quarter feed dots and `stream.vert.glsl` feed-fade flip.** They do not make the feed legible at any reviewer framing (6 and 24 px, along the frame edge). They were the previous agent's attempt at 4, and the brighter, unfaded, framed-whole feed above replaces them.
- **`netTrack`/`netShots` `{ mid: true }` target, and V9, P6, Q2 in `TRACK_TARGETS`.** These serve the brief's fx-3 midpoint, the brief's V9 climb, and §14.5's older visit list (P5, Q2, P6; the brief puts all nine visits on P5). The recommendations use neither the midpoint nor V9, so none of them is needed.
- **`main.ts` `?probe=` and the exported `between`.** Shot-pass tooling only.

## The brief's clearance checks that cannot pass as written

1. **"`cylinderTop` for every sample" (netShots.test)** cannot pass for tr-2's close, fx-1 or fx-2 at any framing. The camera stands 8 units (landscape 15) from a core body under lamp 4, inside the core's 14-unit lit disc. The value is undefined on a phone at 8, and −281 to −389 on desktop at 15, although the pixels clear (0.478–0.631). Fence these by projected visible bodies (`visibleGalaxy`), as Task 10 did for the lamp-1 close shots.
2. **"Streams follow the story" with `net.streams` 1 under re-3** contradicts §14.5's "the feed only": as briefed, P5's lineage streams light up with the feed. With Code change 3 the test should assert `net-feed` drawn and `net-streams` absent under re-3.
3. **The global "streams capped at STREAM_CAP 0.3, faded" constraint** cannot hold for the feed if re-3 is to be true (Code change 4). The §15.3 "quiet when shown" test samples ly-5 only, so it is unaffected; the constraint text needs the author's exception.
4. **Any test that reads `net-ring` in `drawStats().visible` as "the ring is seen"** passes while the ring is culled. It needs a pixel check.
5. **Not verified here:**
   - the lamp steps over the new moves: re 2 → 4 into re-3's pull-back, 4 → 5 on the climb, 5 → 4 on tr-2's dive, 4 → 5 on the surge, 4 → 3 into fx-3, and 3 into ls-1. Each must step at the first thousandth that clears.
   - test 7's "each visit ≥ 80 % landed under the ring's hold".
