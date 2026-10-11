# Task 16 report: Act I copy and timing edits from the author

Status: DONE_WITH_CONCERNS (see Concerns; none blocks).
Base: d6158c5. Commits on main, not pushed:

- 1392105 story: the cold open builds each line's parts as the line comes up
- ad434c0 e2e: the cold open's named frames at the simultaneous build's timings
- d73ccbd story: Act I's narration names no colours or dots
- e251122 e2e: the redraw window starts just past the ring's knot

**Act I length: 18.6 screens (was 21).** The sections are now vibe-build 6.4 (was 8), reveal 3.2
(was 4), rewind 1 and spec 8.

## What I implemented

### 1. The simultaneous build (vibe-build, 8 → 6.4 screens)

Each brief line's assembly ramp now starts on the line's `data-at`. All four reading leads are gone.

**Camera moves.** The camera moves that used to play inside the leads (S1→S2, S2→S3, S3→S1) now
play just before their line appears. The camera is therefore still in place before anything sets
out. Each move is about the same length as before: 0.30, 0.30 and 0.35 screens (were 0.32, 0.28
and 0.36).

**Unchanged spans.** These keep their lengths and only move in time:
- each stage ramp
- the drive with its steer cancel
- the turn (0.6 screens)
- the frame lay (0.75 screens)
- the lap (1 screen)

**Timeline, in screens:**

| Event | Screens |
|---|---|
| vb-2 | 0.30 |
| brief page | 0.80 |
| Line 1 | 1.10, ramp to 1.60 |
| Line 2 | 1.90, ramp to 2.35; drive 2.05–2.70 |
| Line 3 | 3.00, ramp to 3.35 |
| The turn | 3.45–4.05 |
| Line 4 | 4.40, ramp to 5.15; assembly 1 at 5.20 |
| vb-4 and the lap | 5.40–6.40 |

**Locals.** L = 6.4, so one screen is 0.15625 local. I chose that L so every key is an exact
binary fraction:
- `data-at` values are 0.171875, 0.296875, 0.46875 and 0.6875.
- `LAP_FROM` is 0.84375.
- The lines light at locals 0.2483, 0.3628, 0.5189 and 0.800.

**How the keyframes were changed.** `keyframes.json` was rewritten by a script that maps each old
`at` to its new place. Only the `at` strings changed; the values did not.
- The lap keys' `at` values were recomputed as `round(lapLocal(t), 8)` from each key's lap
  parameter.
- `shots.test` regenerates `orbitKeys()` and checks it against the file; it passes.

**Ordering fence (`content.test.ts`).** It is now "the words and the parts arrive together". For
each line:
- its new parts set out at or after its `at`, and no more than 0.1 screen after it (`SET_OUT_TOLERANCE`);
- it is never met while it is invisible;
- it stays the newest line for its reading time.

### 2. No colour or dot words in Act I's narration

- **vb-3** ("See the blue dots? ...") is cut. vb-2 leads straight into the list.
- **rv-6** ("Look at the colours. Every dot is blue. ...") is cut, and the reveal is re-timed to
  3.2 screens:
  - rv-1 to rv-4 keep their screens.
  - rv-5 comes up 0.08 screen sooner, because the S7 hold is shorter. That leaves rv-5 (25 words,
    0.625 screens needed) 0.64 screens and rv-7 (22 words, 0.55 needed) 0.56 screens.
  - The slow S5→S5′ push-in that was rv-6's now plays under rv-7 (0.825–0.925 local), then holds.
  - Reveal beat ids are not renumbered: rv-7 keeps its id.
- **The brief's "sp-6"** is the gold line, which is now **sp-7**. The blueprint doc renumbered it:
  "sp-7 and sp-8 are the old sp-6 and sp-7". I reworded it to the author's suggestion: "You looked
  closely at the parts a person touches, so they land first: the seat, the handlebars and the
  pedals." It is 20 words, within the limits.
- **New content test ("Act I narration").** For vibe-build, reveal, rewind and spec, no beat's
  text matches `\b(blue|gold|orange|dots?|colou?rs?)\b`, case-insensitive. Alt text is not checked.
  A self-check confirms the pattern catches all nine words and does not catch "dotted" or "golden".

### 3. The docs

**The storyboard (2026-10-04)**, which the sync fence reads:
- §0/§1: the legend paragraph is struck through, with a dated amendment quoting the author.
- §1 (the copy tables, Sections 1, 2 and 4): vb-3 and rv-6 are removed and sp-7 is reworded, each
  with a dated note.
- §2.1 and §2.2: the tables are rewritten for the new timing, with dated notes.
- §2.5: the summary is updated (18.6 screens).
- §2.7: an "author's edits" entry is added.
- §3.1: the markdown example is updated.
- §5: the vb-3 row is retired and the "Gold" row is annotated.

**The round-2 design (build-and-orbit)**:
- A dated header amendment.
- vb-3 is removed from the fenced §1 table, with a note.
- A new §2.1a table of old → new times.
- §2.4 lengths are updated.
- The fenced §2.5 markdown block is replaced.
- The ordering-fence rule is amended; the old rule is struck through.
- A §6 note and a §7 entry.

**Blueprint-and-build**: the sp-7 row is reworded, the legend is struck through, and a dated
amendment quotes all three changed lines.

### 4. An e2e test fixed in the blast radius (e251122)

The full suite failed once: `drawing.spec.ts` "the redraw strikes ..." at 390x844, with "3 pixels
changed away from the redrawn lines" at spec@0.315. This was deterministic.

**Cause.** A temporary probe (deleted afterwards) showed that a scroll to spec@0.31 lands on local
0.30996 at 390x844. That is because the essay is now shorter and a scroll lands on a whole pixel.
At that point the ring is at 0.9988 and the camera has not quite come to rest, so later samples
differ in ring pixels.

**Fix.** The test's window now starts at 0.311 and still ends at 0.42. Its intent is unchanged,
and both sizes pass.

## Tests and results

- **tsc**: clean.
- **vitest**: 54 files, 921 tests passed (was 916 before the vocabulary fence). The intermediate
  commit 1392105 was also checked: 916 passed, tsc clean.
- **Full e2e** (`E2E_PORT=4208 npx playwright test`): 115 passed, 9 skipped, 1 failed (the drawing
  test above). After the fix I re-ran that test at both sizes: 2 passed. I did not re-run the whole
  suite.
- **`SHOTS=1 E2E_PORT=4208 npx playwright test e2e/shots.spec.ts`**: 8 passed. It writes
  shots/*.png, including the new cold-open frames vb-brief-line1..4 (as the line comes up) and
  vb-brief-line1..4-lit.

## TDD evidence

**RED.** Command: `npx vitest run src/story/content.test.ts`. Seven tests failed before any copy
or keyframe change, as expected, because the old timing has reading leads and the old copy has
the colour words:
- The four fence tests, for example "line 1 (at 0.2125): its parts set out at local 0.281255:
  expected 0.281255 to be less than or equal to 0.225".
- The three vocabulary tests, naming vb-3, rv-6 and sp-7.

**GREEN.** The same command passed after the copy and keyframe edits. The story suite then had
167 passing tests.

## Screenshots (shots/task16/)

All are `?test=1`, one fresh page per shot, at desktop 1440x900 and portrait 390x844. The script
is `.superpowers/sdd/2026-10-03-plan-3-bicycle/task16-at.mjs`.

Files (each one as `desktop-<name>.png` and `portrait-<name>.png`):
- **line1–line4**: each line 0.12 screen after its `at`. The line is fully up and its parts are
  in flight.
- **rv-page1–rv-page4**: reveal locals 0.28, 0.585, 0.77 and 0.95.
- **sp-7**: spec local 0.78.

What I saw:
- **line1**: the line is fully up and the core is plainly mid-flight (saddle, bars and pedals
  converging out of the starfield). This frame shows the change best.
- **line2**: S2 is in place and the core has landed. The wheel motes have only just left the
  shell (about 0.1 screen after setting out), so they read as starfield, not yet as wheels.
- **line3**: the wheels and chain are in place. The fork has set out, but its motes have not yet
  formed the basket.
- **line4**: the bike is still frameless on S1. The frame's first tubes are only faintly forming.
- **Reveal**: page 3 is rv-5 alone over the whole twin. Page 4 is rv-7 over the pushed-in shot.
  Text is clear of the bike at both sizes.
- **Portrait rv-page2** is the S7 close shot with the bike low and cropped at the bottom. That is
  the existing S7 framing; I did not change it.
- **sp-7**: the new line over gold landing on seat, bars and pedals on the lifted ink lines. It
  wraps to 2 lines on desktop and 3 on the phone.

## Files changed

- `src/story/01-vibe-build.md`, `02-reveal.md`, `04-spec.md`
- `src/story/content.test.ts`, `markup.test.ts`
- `src/timeline/keyframes.json`, `keyframes.test.ts`, `shots.ts` (`LAP_FROM` and two comments),
  `shots.test.ts` (HOLDS)
- `e2e/shots.spec.ts`, `e2e/drawing.spec.ts`
- `docs/specs/2026-10-04-act-1-storyboard-and-text-engine.md`,
  `docs/specs/2026-10-05-act-1-build-and-orbit.md`, `docs/specs/2026-10-05-blueprint-and-build.md`

## Self-review

- **Commit split.** I built the cold-open commit as an intermediate tree from HEAD, so each commit
  passes its own fences. The legend amendment and the vocabulary test land in the second story
  commit, once all three lines are gone.
- **Unchanged pieces.** The settle windows, `SETTLE_WINDOW`, the flare, the steer swings and the
  lap waypoints are untouched. The comments in `bike/index.ts` and `settle.ts` ("no part sets out
  before the line before it has lit") are still true in assembly terms.
- **Unchanged checks.** The no-flare-at-rest, continuity, clearance, purity and brief-ticking e2e
  checks all pass at the new timing.

## Concerns

1. **The full e2e suite ran once and had one failure.** I fixed it (an existing test that breaks
   on scroll rounding at the new total length) and re-ran only that test.
2. **Visual pace is tighter.** Parts now fly while the line is being read. Each line still has its
   reading time before the next line comes up (0.8, 1.1, 1.4 and 1.0 screens). But on line 2 and
   line 4, what moves in the first tenth of a screen is mostly scattered motes; the shape forms
   later in the ramp. If the author wants a recognisable shape on screen as the line lands, the
   ramps could start up to 0.1 screen early, which the fence's tolerance already allows.
3. **Two lines in the reveal sit near the reading floor.** rv-5 has 0.64 screens (needs 0.625)
   and rv-7 has 0.56 (needs 0.55). I chose L = 3.2 so locals stay exact. If those lines feel
   rushed, 3.4 matches the old dwell exactly, but its locals would be inexact.
4. **Naming.** The brief's "sp-6" is today's sp-7. Reveal ids are not renumbered after the cut
   (rv-5 is followed by rv-7).
5. **The top-level design doc is stale.** `docs/specs/2026-10-02-motes-of-work-design.md` §4
   still describes the cold open as "the blue dots are the agent's work" and gives older section
   lengths. It was already stale before this task, and the brief did not list it, so I left it.
