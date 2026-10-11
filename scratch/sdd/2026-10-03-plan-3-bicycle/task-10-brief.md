# Task 10: a live switcher between text treatments A, B and C

Worktree: /home/user/mow-text, branch `text-switcher` (based on main bc2fac7). Commit there; do not push,
do not touch /home/user/motes-of-work (another task is committing on main there in parallel; your commits
will be cherry-picked onto main afterwards, so keep them self-contained and avoid editing
src/story/02-reveal.md, src/timeline/keyframes.json and src/mechanisms/**).

Read global-constraints.md and implementer-instructions.md in /home/user/motes-of-work/.superpowers/sdd/2026-10-03-plan-3-bicycle/.

## Why
Task 8 shipped text option B ("Motes") as the essay's look. The author wants to compare it live against the
other two mockups: option A ("Memo") and option C ("Ink"). Mockups in the same folder: a.html, c.html (and
b.html, shared.css for the shared base), with frames a-*.png, c-*.png, b-*.png. Read all three html files and
look at the PNGs. Fonts for all three are in fonts/ (woff + css): A = IBM Plex Sans + IBM Plex Mono;
C = Literata + Instrument Serif; B = Newsreader + Geist Mono (already self-hosted by Task 8).

## What to build
- A `data-text="a|b|c"` attribute on <html> (or body) selects the treatment. Default stays **b** (nothing
  changes for a reader who does nothing). Implement A and C as CSS overrides scoped under
  `[data-text="a"]` / `[data-text="c"]`, translating each mockup's rules onto the real DOM (Task 8 already
  translated B; read src/style.css and follow its structure). Keep each option faithful to its mockup:
  A = memo: Plex Sans body, mono brief with a margin tick, side scrim; C = ink: Literata body, Instrument
  Serif accents, the met line brightens, shadow only. No borders or filled cards in any option (the existing
  e2e "no rectangles" check must pass for all three — parameterise it over a, b, c).
- Self-host A's and C's fonts the same way Task 8 did for B (relative URLs that survive
  `BASE_PATH=./ npx vite build`); add them to CREDITS.md with their licence (all SIL OFL 1.1). Load only what
  the chosen option needs if that is simple (e.g. per-option @font-face is fine since browsers fetch fonts
  lazily on use).
- Selection: `?text=a|b|c` in the URL sets it on load. NOTE the published artifact cannot read the query
  string from its top-level link, so also add a small, quiet switcher UI on the page: three tiny Geist/mono
  labels "Text: A · B · C" fixed in a corner (bottom-right on desktop, top-right on portrait, clear of the
  text column and the canvas focus), current one highlighted, keyboard accessible (buttons), no border/card
  (typography only, matches the rectangle rule). Clicking switches instantly (no transition) and updates
  the URL with history.replaceState if allowed (wrap in try/catch). Remember the choice in localStorage
  inside try/catch only as a convenience. The switcher is marked as a draft tool (e.g. `data-draft`), easy to
  delete later: keep it in one small module plus a few CSS lines.
- Brief markers: every option must still show met state as a pure function of scroll (no transitions), and
  ticks must stay in reading order (Task 8 reordered the brief).
- Portrait: all three must work at 390x844 with Task 8's portrait layout (bottom text area, scrim).

## Tests
- vitest/e2e: `?text=a` and `?text=c` set the attribute; default is b; an unknown value falls back to b;
  clicking the switcher changes the attribute; the no-rectangles and no-transition checks run for all three.
- Keep the full suite green: `E2E_PORT=4200 npx playwright test` (node_modules is symlinked from the main
  checkout; never run `playwright install`).

## Screenshots
With `?test=1&text=<x>` at 1440x900 and 390x844 for p in {0.09 (mid-build), 0.27 (brief done), 0.41
(reveal)} for x in a, b, c into /home/user/mow-text/shots/task10/ — fresh page per URL. Look at them and say
honestly whether each is legible and faithful to its mockup.

Report to /home/user/motes-of-work/.superpowers/sdd/2026-10-03-plan-3-bicycle/task-10-report.md; return
only status, commits, one-line test summary, screenshot paths, concerns.
