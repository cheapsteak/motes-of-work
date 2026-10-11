# Task 19 report: one stop per scene, at its end; the ring in the bottom-right corner

Repo /home/user/motes-of-work, branch main, on 84d5c33 (a docs commit that landed after 93a2d19). Not pushed.

## Commits
- 71a968b auto-advance: one stop per scene, at its end
- 4b2927a auto-advance: the ring in the bottom-right corner, findable on a phone

(src/config.ts's comment, which already names the bottom-right ring, went into the first commit; the e2e update is in
the second, so the auto-advance e2e is only consistent from 4b2927a on.)

## Stops: before 26, after 25
Before: one stop per scene where its text had *finished fading in* (19 beats + 6 brief lines) plus a separate `end`.
That old list did not have two stops per scene. I think the doubled feel the author describes came from where those
stops sat. Each stop was at the start of a scene, so the motion played during the next transit. Once the motion had
landed, the transit kept scrolling at cruise pace across a stretch where nothing changed on screen, and that looked like
a second pause before the next line.

After: one stop per scene, at its end. That is 25 stops: 19 beats, including the brief's ask as a scene of its own, plus
the 6 brief lines. The last scene (sp-8) runs to the end of the essay, so its stop *is* the end (progress 1) and there
is no separate `end`. Full list: shots/task19/stops.txt (progress, screens, scene, dwell, why).

### The rule (src/autoAdvance/plan.ts)
- `textEnd` = the earlier of (a) the next scene's fade-in start and (b) this scene's page fade-out start, minus
  `STOP_MARGIN_SCREENS` = 0.01 screens. Never before the scene is fully up.
- If the motion still has more than `OUTLASTS_TEXT` = 0.25 to go between `textEnd` and the next text coming up, the
  scene's motion outlasts its text. Its stop is then the latest point *at rest* before the next text. "At rest" means no
  motion value changed by `REST_EPSILON` = 0.025 over the last `REST_WINDOW_SCREENS` = 0.02 screens. Such a stop is
  marked `ends: 'motion'`. If the motion is never at rest in that range, the stop stays at `textEnd`.
- Motion is `sceneMotion(state)`: assembly, steer, camera (pos and target in machine radii, fov/40, frame,
  coreFocus, focus) and ink.* plus sheet.opacity. It leaves out the drive, because that is the machine's running clock
  and a riding bike rides on under its lines by design. main.ts passes `p => sceneMotion(sampler.sample(p))`. It uses
  the keyframes, not a `?state=` override. Sampling costs about 1.5k samples at load.
- On today's data only **vb-4 (the orbit)** ends on motion. Its stop is at 7.19 screens, where the orbit has
  returned home and vb-4's page has faded out, so it holds 2.67 s on a frame with no text. The lift-off (sp-6) is
  essentially done where its page starts to fade (flat 0.9996), so it keeps its text stop.
- Dwell is unchanged: `max(floor, words/wps)`, with the ask's words being the beat's words minus its lines' words.
- Start (indicator.ts): opened at a stop, it holds that stop's dwell. Opened inside a scene, it goes straight on to that
  scene's stop and holds there; the top of the essay counts as inside the first scene. Anywhere else it holds the floor
  first. Without this, the opening would have held twice on "You want a bike." (floor, then a silent 0.29-screen move,
  then the dwell). A zero hold's arc is guarded against 0/0.

### Unit tests (src/autoAdvance/plan.test.ts, 24 tests)
On the real story and keyframes:
- Exactly one stop per scene, in reading order; the 6 brief lines are scenes.
- The stops are strictly increasing, and the last scene's stop is at progress 1.
- Each stop lies after its scene is fully up (or at 0 for the essay's opening) and before the next scene's appear
  point.
- For every `text` stop: the text is at opacity 1 at the stop and still 1 almost a margin later, the next text is at 0,
  and 1.5 margins later one of them has started to change. This pins "just before the next change".
- Only vb-4 ends on motion. At its stop its text is below 1 and the next text is still 0.
- At rest at every stop: assembly, drive, steer, camera and ink each change by less than 0.025 over the last 0.02
  screens, except for these documented ones:
  - vb-2 camera: the push-in to the brief eases home as the page turns.
  - rv-2 camera: the rise to the seat shot.
  - rw-1 drive and camera: the rewind runs to the section end.
  - sp-1 camera and ink: the sheet slides in and the pen starts under sp-2.
  - sp-4 ink: the gold ring is still fading as the page turns.
  - sp-8 drive: the bike rides off to the end.
  The riding drive elsewhere (vb-4, rv-1..rv-4) stays under the epsilon. The test asserts the exact set, so a new
  exception fails it.
- Each brief line is ticked at its own stop (assembly at or above `briefThresholds` for the bike), except **line 5
  (the frame)**. Its last tubes land under line 6 (frame settle 0.81–0.95, assembly 0.87 when line 6 comes up), so it
  is ticked at line 6's stop. The test asserts that it is *not* yet ticked at its own stop.
- The ask's and the lines' words.

On a made-up story:
- A moved beat moves the stop before it.
- Motion that outlasts the text holds the stop until just before the next line.
- Motion done before the fade keeps the stop at the text.
- Motion that never comes to rest keeps the stop at the text.

## Indicator
- `#auto-advance` sits fixed bottom-right on every screen. The button's right and bottom are `8px` plus the safe-area
  inset, so the 28px ring's edge is 16px from the corner. The hit area is 44px.
- The ring: `r=11` in a 24 viewBox at 28px. The track is at stroke-opacity 0.55; the dial is 2 units wide at 0.9.
  When paused, the play glyph shows at 0.85 fill. Hover or focus brightens it, and focus also gets a 1px outline. The
  button's own opacity is now 1; the old version was 0.35 overall.
- The halo: `radial-gradient(closest-side, stage colour .78 62%, .45 82%, 0 100%)`. There is no border, box-shadow,
  background-color or pseudo-element.
- The credits link moved from bottom right to bottom left (`left: var(--gutter)`), so the two never meet. The e2e
  checks their boxes at the essay's end at both sizes.

## Tests and results
- `npx tsc --noEmit -p .`: clean.
- `npx vitest run`: 55 files, 960 tests passed. This time the full run included the strandbeest tests that task 18 saw
  flake under load.
- `E2E_PORT=4216 npx playwright test e2e/autoAdvance.spec.ts`: 9 passed (23 s). It covers:
  - From the top: the first hold is at stops[0] > 0, then stops[1], then stops[2].
  - Wheel pause and ring resume; Space handling.
  - Ring look at 1440x900 and at 390x844: 44px button, 28px ring 16px from the corner, button opacity 1, track
    between 0.45 and 0.65, dial brighter, radial-gradient pool fading to 0, no border, shadow, background colour or
    pseudo-element.
  - The credits link clear of the ring at both sizes.
  - The end; reduced motion; `?auto=0` and `?test=1`.
- The `.panel` no-boxes rule in e2e/text.spec.ts is unchanged, and the ring is not inside a panel.
- Full e2e, once after the last change: FULL_E2E_RESULT

## TDD evidence
- RED: with the new plan.test.ts against the previous plan.ts (`git show HEAD:src/autoAdvance/plan.ts`),
  `npx vitest run src/autoAdvance` gave "Failed Tests 9". Examples: "expected [ 'vb-1', … (23) ] to deeply equal
  [ … (22) ]" for the old `end` stop, "expected { id: 'end' … } to match object { id: 'sp-8', progress: 1 }", and
  "expected [] to deeply equal [ 'vb-4' ]".
- GREEN: same command, 24 passed.
- The implementation was written before the tests; the RED above is the new tests against the old code.
- e2e on the way: the first run failed `scrollY == 0` after load, because the page now goes straight on from the top.
  I dropped that assertion; the first hold is still pinned to stops[0].

## Screenshots (shots/task19/, gitignored; scripts shots/task19-shots.mjs, task19-sweep.mjs, task19-contact.mjs)
Taken with `?test=1&auto=1&dwell=8&n=50000`, a fresh page per shot, 3 s into the hold. Each shot has a `-ring.png`
crop of the bottom-right 140px.
- `portrait-*` (390x844) and `desktop-*` (1440x900):
  - `brief-dwell`: vb-brief[2].
  - `basket-dwell`: vb-brief[4].
  - `sheet-dwell`: sp-3, where the ink sheet fills the bottom-right at both sizes.
  - `closeup-dwell`: rv-4, where the bike close-up reaches the bottom.
  - `brief-paused`: vb-brief[4] after a click on the ring.
  - `sheet-paused`: sp-3 after a click on the ring.
- What I saw:
  - On a phone the ring is clearly findable in the corner: a light circle with a bright dial arc, or the play
    triangle when paused.
  - Over the ink sheet (sp-3) it reads as a soft dark disc on the paper, with the ring and dial light inside it.
    Legible in both states, and noticeably darker than the paper, which is what the halo is for.
  - Over the brief's build the bike never reaches the corner at any brief stop, at either size. The ring sits on the
    dark stage, and the pool is almost invisible there.
  - At rv-4 the motes come within about 30px of it but do not cross.
- `sweep/contact.png`: every one of the 25 stops at 390x844. Only sp-3 puts something bright under the ring. The vb-4
  frame shows the orbit's stop holding with no text, as described above. The last frame (sp-8, the end) shows the
  credits link at bottom left with the ring at bottom right.

## Self-review
- plan.ts stays pure and DOM-free. The only new input is a `Motion` function.
- I renamed a local that shadowed the global `window`.
- indicator.ts changes only the start rule, the zero-hold arc and the ring radius.
- No story, keyframe or mechanism file was touched.
- Prettier is not configured in this repo, and HEAD's files are not formatted by default prettier, so I followed the
  surrounding style (120 columns).

## Concerns
1. **vb-4 (the orbit) holds 2.67 s with no text up.** The brief asks for this ("the latest settled point before the
   next text appears"), but the reader may read it as a pause on nothing. The fallback would be one constant
   (`OUTLASTS_TEXT`) or a dwell rule for `motion` stops.
2. **The rest exceptions** (vb-2, rv-2, rw-1, sp-1, sp-4, sp-8) and **line 5's late tick** come from the keyframes:
   the motion runs right up to, or under, the next line. Fixing them would mean shifting keyframes, which is outside
   this brief.
3. The thresholds (0.25 to outlast, 0.025 for rest) are hand-picked against today's data. The tests pin the outcome
   per scene, so a keyframe edit that changes the classification fails loudly, not silently.
4. Stops sit at the *last* still point, so a scene whose motion finishes early (rv-5, sp-3: about 0.37 screens of no
   change) still crosses a short static stretch at cruise pace before the stop. That is a much shorter version of what
   the author noticed.
