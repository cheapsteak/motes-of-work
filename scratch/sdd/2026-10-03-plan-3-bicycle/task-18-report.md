# Task 18 report: auto-advance, with a faint countdown you can pause

Worktree <mow-auto checkout>, branch `auto-advance`, on main 3e4d03e. Not pushed.

## Commits
- 98b3ad0 auto-advance: stops, dwells and transits from the beat data
- 27e9199 auto-advance: the essay moves itself, with a faint ring to pause it

Self-contained for cherry-picking: two new modules (src/autoAdvance/plan.ts, src/autoAdvance/indicator.ts),
`AUTO_ADVANCE` in src/config.ts, 14 lines in src/main.ts, one CSS block in src/style.css, a new e2e spec, and a
one-line URL change in e2e/reducedMotion.spec.ts (see below). No story, keyframes or mechanism file touched.

## What I built
- **Stops** (`autoStops`, pure): from the loaded story's beat data. One stop per beat where it has finished fading in
  (`at + fadeWidth(length)`, mapped to global progress through the section spans), one per brief line (its `data-at` +
  fade), and a final `end` at progress 1. The essay's first line has no fade-in (reveal.ts), so its stop is 0. The
  brief's own stop (the ask) carries the beat's words less its lines' words. 24 stops on today's copy.
- **Dwell**: `max(floorSeconds, words / wordsPerSecond)`. On today's copy the full run is about 2 min 24 s
  (dwells 2 to 8.3 s; transits 1 to 2.8 s).
- **Transit**: `window.scrollTo` every animation frame. Trapezoidal speed: speeds up evenly over `easeSeconds` (0.5),
  cruises at `transitScreensPerSecond` (0.6), slows evenly into the stop; a transit too short to reach the pace shrinks
  the ease to fit. Interpolated in progress, so a resize mid-transit stays on course. A stop's scrollY is rounded up so
  the line is never a pixel short of fully up. No CSS smooth scroll.
- **Start**: on the window `load` event, it holds at the stop the page opened on for that stop's full dwell (plus
  `startDelaySeconds`), or for the floor if the page opened between stops (`?p=`, scroll restoration). Under
  prefers-reduced-motion it starts paused, with the play glyph.
- **Pause**: from input events only (capture, passive): `wheel`; `touchstart`/`touchmove` and `pointerdown` anywhere
  except on the ring (a pointerdown on the scrollbar targets the root, so it counts); `keydown` of Space, PageUp/Down,
  the arrows, Home/End (Space on a button, link or field is a press, not a scroll, so it is ignored there). Never from
  `scroll` events.
- **Resume**: click/tap/Enter/Space on the ring: holds for the floor where the reader is, then goes to the next stop
  strictly after the current position. Clicking while running pauses (toggle).
- **End (my choice)**: at the last stop it stops and the ring fades away (0.8 s opacity, then `visibility: hidden`, so
  it leaves the tab order and the accessibility tree; no fade under reduced motion). No replay. If the reader then
  scrolls back up from the end, the ring comes back, paused, so it can be restarted.
- **Time**: the countdown is UI time from rAF timestamps, each frame's step capped at 0.25 s, so a hidden tab picks up
  where it left off. The loop runs only while running; paused, it stops at once.
- **The ring**: a real `<button id="auto-advance">`, label swap "Pause auto-advance" / "Resume auto-advance" (also
  `title`), created by script (without JS there is nothing to advance). Fixed bottom centre at
  `env(safe-area-inset-bottom) + 0.75rem`, a 44px hit area around a 22px SVG ring: a faint track (about 10 % ink), the
  arc (35 % ink) that dials down through a hold and fills back through a transit (`stroke-dashoffset` on a
  `pathLength=1` circle), and a small play triangle when paused. No border, fill or shadow; 70 % on hover/focus, a
  1px focus-visible outline. `touch-action: none` on the button only, so a press on it never scrolls and nothing
  outside its 44px is caught.
- **Editable**: `AUTO_ADVANCE` in src/config.ts (enabled, floorSeconds 2, wordsPerSecond 3, transitScreensPerSecond
  0.6, easeSeconds 0.5, startDelaySeconds 0), each commented. URL: `?auto=0|1`, `?dwell=`, `?wps=`, `?pace=`; a value
  that is not a positive number is ignored with a console warning. `?test=1` turns it off unless `?auto=1`.
- Test hook: `__motes.autoAdvance()` returns `{ state, stops }` (stop scrollYs) or null when off.

## Tests and results
- `npx tsc --noEmit -p .`: clean.
- Unit, `npx vitest run src/autoAdvance`: 19 passed (stops: count = beats + brief lines + end, strictly increasing,
  ends at 1, first at 0, a reveal beat and every brief line at `at + fade` with their own words, a moved beat moves its
  stop; dwell: floor holds, longer lines dwell longer, follows its settings; transit: duration, monotonic 0 to 1, slow
  at both ends and at the pace between; pixel rounding; next stop; URL/config parsing incl. test mode and bad values).
- Full unit suite, `npx vitest run`: 944 passed, 2 failed under full parallel load
  (strandbeest continuity, strandbeest ratio dial); both pass when run alone (78/78). Not touched by this task; they
  look like load-sensitive timeouts.
- e2e, `E2E_PORT=4214 npx playwright test e2e/autoAdvance.spec.ts`: 7 passed (holds at the first line then lands
  exactly on stops 1 and 2; a wheel pauses and the page then stays put for 1.5 s; clicking the ring resumes to the next
  stop after the paused position; Space on the page pauses, Space on the focused ring toggles; the ring is a 44px
  button with a 22px ring, opacity in (0.2, 0.4], bottom centre, no border/background/shadow/pseudo-content; at the end
  it is hidden and a wheel back up brings it back paused; reduced motion starts paused with the play glyph and the page
  does not move; `?auto=0` and `?test=1` alone show no ring, the default essay shows one).
- e2e/reducedMotion.spec.ts now opens with `&auto=0`: it runs without `?test=1`, so auto-advance would otherwise scroll
  the page from p=0.97 to the end and the "frame changes with time" check would pass for the wrong reason.
- Full e2e, `E2E_PORT=4214 npx playwright test` after the last change: 123 passed, 9 skipped (the existing
  opt-in specs), 16.2 min, exit 0.

## TDD evidence
- RED: `npx vitest run src/autoAdvance` with plan.test.ts written first: "Test Files 1 failed, Tests no tests" (the
  module `./plan` did not exist).
- GREEN: same command after plan.ts: "Tests 19 passed (19)".
- e2e RED on the way: the first run of the wheel test failed ("Expected paused, Received dwell") because
  `mouse.wheel` reaches the page asynchronously; the assertion now polls.

## Screenshots (<mow-auto checkout>/shots/task18/, script shots/task18-shots.mjs, gitignored)
`{desktop,portrait}-{brief,reveal}-{dwell,paused,transit}.png`, each with a `-ring.png` crop (120x100 around the ring).
Taken with `?test=1&auto=1&n=15000`, a fresh page per shot; "brief" is the second brief line's stop, "reveal" is rv-3.
- Mid-dwell: a thin open arc of about 60 % of the circle, faint grey, over the faint full track; clearly readable once
  looked for, easy to ignore otherwise.
- Paused: a small play triangle inside the faint track, no arc.
- Transit: the arc about 40 % filled, the page between two lines (in the brief shot the next line is partly up).
- Desktop: the ring sits well below the bike and the text band. Portrait (390x844): it sits about 40px above the
  bottom; in the reveal shots the bottom of the bike's front wheel motes come close to it but it stays legible.

## Self-review
- `plan.ts` is pure and DOM-free; `indicator.ts` owns DOM, events and the clock. main.ts only builds settings, mounts it
  and exposes the hook.
- No `scroll` listener drives pausing; the one `scroll` listener only brings the ring back after the end.
- Frames remain a pure function of scroll progress: auto-advance only moves the scroll position.

## Concerns
- The pointerdown pause is page-wide (outside the ring): a click on the credits link also pauses. I judged that right
  (the reader is doing something else), but it is broader than "scrollbar / page drag".
- `easeSeconds` is an extra config key beyond the brief's example.
- Time steps are capped at 0.25 s per frame: on a device rendering below 4 fps the holds and transits run slower than
  configured (SwiftShader at the full 100k budget did; the screenshots use n=15000).
- Two strandbeest unit tests fail only under full parallel load (see above), unrelated to this change.
