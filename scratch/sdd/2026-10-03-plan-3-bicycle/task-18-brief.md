# Task 18: auto-advance, with a faint countdown you can pause

Worktree <mow-auto checkout>, branch `auto-advance` (from main 3e4d03e; node_modules symlinked). Commit there; do
not push; do not touch <repo> (another task is committing on main there; your commits will be
cherry-picked, so keep them self-contained: a new module, a few lines in src/main.ts, src/config.ts and CSS; do not
edit src/story/*.md, keyframes.json or src/mechanisms/**). Read global-constraints.md and implementer-instructions.md
in .superpowers/sdd/2026-10-03-plan-3-bicycle/.

The author (2026-10-05): "Can we also add auto advance please, in case people don't realize they can scroll. Show a
faint indicator on screen that dials down. Manual scroll pauses it. Click / tap it to resume. Start with 2s but we
might need to tweak it later so make it editable. Might also want different lengths depending on how long the content
is, with a 2s floor."

## Behaviour
- **Stops.** The essay advances from stop to stop. A stop is the scroll position at which a beat (a line, or a brief
  line) has finished fading in. Derive the stop list from the text engine's beat data (read src/story/ and the engine
  built in Tasks 12–16; do not hard-code positions), so it follows any copy/timing change. The last stop is the end.
- **Dwell.** At each stop, hold for `dwell = max(floorSeconds, words / wordsPerSecond)` where words are the beat's own
  words (for the brief document, that line's words). Defaults: floorSeconds 2, wordsPerSecond 3 (about 180 wpm, a
  relaxed read-aloud pace); both editable.
- **Transit.** Then scroll smoothly to the next stop at a steady pace (default 0.6 screens per second, eased in/out at
  each end; editable), because the scroll position drives all motion: the build, the orbit, the drawing play as the page
  scrolls. Scroll programmatically (window.scrollTo per animation frame), never via CSS smooth scroll.
- **Start.** Auto-advance starts on its own after the first page has loaded and its first dwell has passed. Under
  prefers-reduced-motion it starts paused (the indicator shows "play"); the reader can start it.
- **Pause.** Any manual scroll intent pauses it at once: wheel, touchstart/touchmove, keyboard scrolling keys (Space,
  PageUp/PageDown, arrows, Home/End), pointerdown on the scrollbar / page drag. Detect intent from input events, not from
  `scroll` events (programmatic scrolls fire those too). Paused, it stays paused until resumed.
- **Resume.** Click/tap the indicator (or press it with the keyboard) to resume from the current position: it finds the
  next stop after the current scroll position, dwells (a short dwell, the floor) and continues. Clicking while running
  pauses (toggle).
- **End.** At the last stop it stops and the indicator fades away (or shows a quiet "replay" that scrolls to the top and
  resumes — optional; say what you chose).

## The indicator
- Faint, small, typographic, no box/border/card (the e2e no-boxes rule applies): e.g. a thin ring about 22px that
  "dials down" as a clock-wipe during the dwell (an SVG circle with stroke-dashoffset), very low contrast (ink at about
  30–40 % opacity), bottom-centre on desktop and bottom-centre above the safe area on phones, clear of the text band and
  the credits link. During transit it shows a steady thin ring or a gentle progress; paused it shows a small play glyph.
- It is a real <button> with aria-label "Pause auto-advance" / "Resume auto-advance" (aria-pressed or label swap), focus
  visible, keyboard operable. It must not catch scroll/touch gestures meant for the page beyond its own hit area.
- Never a CSS transition on anything tied to scroll position; the ring's countdown is time-based (that is fine: it is UI,
  not scene) but stops cleanly on pause.

## Editable
- One config object in src/config.ts, e.g. `AUTO_ADVANCE = { enabled: true, floorSeconds: 2, wordsPerSecond: 3,
  transitScreensPerSecond: 0.6, startDelaySeconds: 0 }` with a comment saying what each does.
- URL overrides for quick tuning without a rebuild: `?auto=0` disables; `?dwell=<seconds>` sets the floor; `?wps=<n>`;
  `?pace=<screens per second>`. (Note: the published artifact's top-level link cannot pass a query string, but the
  essay page itself can be opened with one.)
- `?test=1` disables auto-advance unless `?auto=1` is also given (existing tests rely on a still scroll position).

## Tests
- Unit: the stop list from beat data (monotonic, ends at the end, one per beat); the dwell function (floor holds; longer
  lines dwell longer); URL/config parsing.
- e2e (with `?test=1&auto=1&dwell=<small>&pace=<fast>` so it runs quickly): the page advances to the next stop after the
  dwell; a wheel event pauses it (scroll position then stays put); clicking the indicator resumes; keyboard Space on the
  page pauses; the indicator has its aria label and no border/box; reduced motion starts paused; `?auto=0` shows no
  indicator.
- The full existing suite stays green: `E2E_PORT=4214 npx playwright test`.

## Verification
tsc; vitest; full e2e on port 4214. Screenshots at 1440x900 and 390x844 into <mow-auto checkout>/shots/task18/: the
indicator mid-dwell, paused, and during transit, at a brief line and at a reveal line.

Report to .superpowers/sdd/2026-10-03-plan-3-bicycle/task-18-report.md; return only status,
commits, one-line test summary, screenshot paths, concerns.
