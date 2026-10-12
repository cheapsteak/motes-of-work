# Task 10 report: a live switcher between text treatments A, B and C

Worktree <mow-text checkout>, branch `text-switcher`, commits bc2fac7..261c430:

- d4495ad fonts: self-host Plex, Literata and Instrument Serif for text options A and C
- 261c430 text: a live switcher between treatments A, B and C

## What was built

- `html[data-text="a|b|c"]` selects the treatment. B (default) is the untouched base look in `src/style.css`.
  A and C are CSS overrides in `src/text-options.css` (imported after style.css), translating the mockups onto the real DOM
  (`.run-label`, `div.brief > .brief-label / .brief-ask`, `ul.brief > li[data-met]`).
  - A "Memo": IBM Plex Sans body, IBM Plex Mono labels and brief, ask in mono 500, a blue pencil tick (drawn with two borders on `li::before`, so
    it is a pseudo-element glyph, not a box) in the margin of a met line, none on an unmet one; a fixed side scrim
    (`#story::before`, landscape only; portrait keeps the shared bottom scrim); the pool is off.
  - C "Ink": Literata body, ask a pull-quote in Instrument Serif italic, no marker: a met line goes from dim to full ink and takes a blue halo in its
    text shadow; layered body text shadow; no pool, no scrim on desktop (portrait keeps its scrim).
- `src/draft/textSwitcher.ts` (+ `.css`, `.test.ts`): `?text=` (unknown value gives b, and does not fall through to storage), else
  localStorage (try/catch), else b. A `<nav data-draft>` of `Text: A · B · C` buttons (`aria-pressed`, real buttons, so Tab/Enter/Space work), Geist Mono,
  no border or fill. Click sets the attribute instantly, `history.replaceState` keeps the other params (try/catch), remembers the choice.
  Fixed bottom-right on desktop (2.75rem up, clear of the credits link), top-right in portrait. Mounted from one call in `src/main.ts`.
  The module header lists exactly what to delete once an option is chosen.
- Fonts self-hosted in `src/fonts/` (relative URLs; `BASE_PATH=./ vite build` verified: hashed `./...woff` URLs in the built CSS), only the faces in use
  (Plex Sans 400 + italic, Plex Mono 400/500, Literata 400 + italic, Instrument Serif italic). Browsers fetch lazily, so default b downloads none of
  them (asserted in e2e). CREDITS.md lists them with their copyright lines (OFL 1.1, taken from the fonts' own name tables); credits unit test extended.

## Deliberate departures from the mockups (to obey "no borders or filled cards")

- A has no left hairline on the brief (the mockup has a 1px rule); the tick hangs in the brief's left padding instead of the gutter beyond the rule.
- C has no hairlines between brief lines (the mockup has them); separation is by spacing only. C hides the "The brief" label visually (kept for
  screen readers), as the mockup shows none, and the lines hang at the text edge as in the mockup.
- C portrait: ask 1.45rem (mockup 1.6rem) and line padding 0.34rem, so the longest panel sits lower; at the mockup size it wrapped to two lines and rode up
  over the bike's wheel.

## Tests

- vitest: 51 files, 683 passed (new `src/draft/textSwitcher.test.ts`, extended credits test). `tsc --noEmit` clean.
- e2e full suite `E2E_PORT=4200 npx playwright test`: 123 passed, 7 skipped (pre-existing skips), 0 failed, 8.0m.
- `e2e/text.spec.ts`: the no-box, brief-never-animates, panels-never-animate and met-vs-unmet checks now run for a, b and c (pool is asserted for b, absent
  for a and c; the met check asserts colour change per option plus tick / glow / halo, and that a jump to p equals a scroll to p).
- New `e2e/textSwitcher.spec.ts`: default b; unknown value gives b; `?text=a|b|c` sets the attribute and `aria-pressed`; each option sets its own families
  and loads its own faces with no off-site request; default b requests none of the A/C fonts; click updates attribute, URL (other params kept) and
  localStorage and a later visit without `?text=` starts there; keyboard use; switcher has no border, fill, shadow or transition; placement is clear of
  every panel and in the right corner at 1440x900 and 390x844 for all three options.
- Test-first note: the unit test was written before the module (it ran green once the module existed; the e2e specs were written after the CSS, so
  there is no separate RED run for them).

## Screenshots (`?test=1&text=<x>&p=<p>`, fresh page each; <mow-text checkout>/shots/task10/, gitignored)

`{desktop,portrait}-{build,brief,reveal}-{a,b,c}.png`, p = 0.09 / 0.27 / 0.41, desktop 1440x900, portrait 390x844 (18 files). I looked at
desktop brief a/b/c, desktop build a/c, desktop reveal a/c, portrait brief a/b/c, portrait build a, portrait reveal c (the rest are the same
layouts at other progress values).

- A: legible everywhere; the side scrim hides the motes behind the text, the mono brief and ticks read as in the mockup (minus the hairline), met
  lines tick in reading order. Faithful apart from the dropped hairline.
- B: unchanged from Task 8 (pool on desktop, scrim in portrait).
- C: legible; at 0.09 (mid-build) loose motes drift through the column and the text relies on the shadow alone, so it is visibly busier than A or B
  but readable, which is what the mockup trades for. Faithful apart from the dropped hairlines. In portrait the brief panel is the tallest of the three and
  its first line still grazes the front wheel's ground shadow (the mockup overlaps the wheel itself more); B's label already does the same.

## Concerns

- The switcher's own 11px label sits over drifting motes at p = 0.09, so it is faint in the first moment of the build; it is a draft tool, so I left it quiet.
- The switcher sits 2.75rem above the bottom, rather than flush in the corner, so it does not collide with the credits link that appears there at the page end.
- Option A/C fonts add about 0.55 MB to the repo and to `dist` (not to a reader's download of option B).
- `src/main.ts` gets one import and one call, `style.css` is untouched; the cherry-pick onto main should be conflict-free unless the other task edits those lines.
