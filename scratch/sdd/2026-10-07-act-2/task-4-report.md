# Task 4 report: the remaining eight sections and their copy

Status: DONE_WITH_CONCERNS (one storyboard inconsistency for the controller, below).

## Commits (main, not pushed)

- `4e2cd2d` story: the rest of Act II, eight sections fenced against the storyboard
- `9191edf` e2e: the end-of-essay, reduced-motion and purity checks follow Act II past the zoom-out

No session trailer was added to either message: the dispatch gave none, and the harness's suggested trailer
carries a product name, which the publication-safe rule forbids.

## What was built

Files (all in `/home/user/motes-of-work`):

- New `src/story/06-layers.md`, `07-far.md`, `08-defect.md`, `09-spread.md`, `10-reviewer.md`, `11-trace.md`,
  `12-fix.md`, `13-lesson.md`. Frontmatter (`id`, `length`, `alt`, `draft: true`) and beat markers in
  `05-zoom-out.md`'s format. Copy and alt text verbatim from §1; beats, pages, `at` and lengths from §2.2–§2.9.
  Section ids are the §2 heading names: layers, far, defect, spread, reviewer, trace, fix, lesson.
- `src/story/storyboard.test.ts`: the Act II board lists all nine sections. The Minor 3 gap is closed:
  - The prefix filter on the copy rows and the section filter on the timing blocks are gone, so nothing is dropped.
  - The copy fence now compares every §1 row with the covered beats, and a row no section claims fails it.
  - The timing fence compares every `### 2.x` block with the board's sections, and also asserts that no beat row
    sits outside a block.
  - Checked negatively: removing `lesson` from the board's list failed three tests (cover-once, the §1 fence and
    the §2 fence). The Act I board passes the stricter fence unchanged.
- `src/story/content.test.ts`: `ACT_II` lists all nine sections, so the Act II words fence (no colour or dot word,
  none of stack/cube/stream/crack/ring/glow) runs over every one of them. It passes. The stale "sections so far"
  sentence in the comment is gone.
- Auto-advance: no code change. `autoStops` derives one stop per scene from the story data and the keyframes, and
  `sceneMotion` already carries the five leaves (Task 2). The existing stop tests (one stop per scene, ordering,
  just-before-the-next-text, at rest) pass over the 13 sections, with the last stop being `ls-1` at progress 1.
- `e2e/app.spec.ts`: the bottom-of-page test was titled "the finished, riding bike". It now names the lesson, asserts
  the last section is `lesson`, and holds the state at p=1 to `[built.assembly, assembly, variant, reflow] = [1,1,0,1]`
  and `drive` above the built bike's. This is stricter than before, not looser.
- `e2e/reducedMotion.spec.ts`: the sample was `p=0.871`, which was spec@0.927 of 21.6 screens. It is `p=0.381`, the
  same spec@0.927 of 49.4 screens. The comment says so.
- `e2e/purity.spec.ts`: the three essay points (0.12, 0.41, 0.88) were chosen at 21.6 screens. They are scaled by
  21.6/49.4 (`essayPoint`) to p=0.0525, 0.1793 and 0.3848, so each still lands on its original frame. The non-vacuity
  test uses the same points. The overshoot comment is updated.
- No test pins the landing-page screen count, and nothing else assumed zoom-out ends the essay.

## The wordless moments

The beat format cannot express a beat with no line: `closeBeat` fails with "beat X has no text". So the second fix
(spread 0.40–0.62) and the fan-out (trace 0.68–0.92) are modelled as Act I's "the turn" is: no beat marker, the line
before them holds. The storyboard's wordless rows start with `*the second fix (wordless)*`, which the fence's beat-id
pattern does not match, so they are skipped as intended.

## Dwell lint and words fence at the designed lengths

No failures; no copy was edited. The tightest lines are df-3 (3 words, 0.576 screens against the 0.3 minimum) and fx-1
(3 words, 0.644 against 0.3). Every line clears its budget by at least 1.9x. Words per screen are well under 35 for every
section. Each page has at most 3 beats.

## Scoped exclusions

None needed. Every test that runs over all sections passes with the new sections un-keyed, because the sampler holds
each track at its last key and the stops are therefore trivially at rest. There is therefore nothing for Tasks 5 and 6
to empty. One consequence: "at rest at every stop" is vacuous for Act II until keys exist, and Tasks 5 and 6 will likely
need `STILL_MOVING` entries in `src/autoAdvance/plan.test.ts` where a stop lands mid-move.

## Verification

- `npx tsc --noEmit -p .`: clean.
- `npx vitest run`: 66 files, 1373 tests passed.
- Full e2e (`E2E_PORT=4199 npx playwright test`) before the e2e fixes: 125 passed, 9 skipped (the SHOTS-gated
  shot specs), 1 failed (`reducedMotion`, the `p=0.871` sample, which now lands in Act II). After the fix, the three
  touched files (`app`, `purity`, `reducedMotion`) were re-run: 26 passed.

## Phone stills (390x844, `?test=1`, `?p=` at the first beat's midpoint)

Saved to `shots/act2-copy/` (gitignored): `layers-390x844.png`, `far-`, `defect-`, `spread-`, `reviewer-`, `trace-`,
`fix-`, `lesson-`. The temporary capture script was deleted; no page errors.

Measured from the DOM at each still (the first beat on screen, page opacity 1):

| Section | `?p=` | Lines | Text bottom |
|---|---|---|---|
| layers | 0.44534 | 2 | 103 px |
| far | 0.55466 | 1 | 77 px |
| defect | 0.58352 | 2 | 103 px |
| spread | 0.69061 | 3 | 130 px |
| reviewer | 0.75486 | 2 | 103 px |
| trace | 0.81907 | 1 | 77 px |
| fix | 0.88202 | 1 | 77 px |
| lesson | 0.98381 | 2 | 103 px |

Every line box spans x 16–374 of 390 with no horizontal overflow. The text bottoms are at most 15.4 % of the 844 px
height, well inside the 42 % band. At most 3 lines a page, and only spread's up-1 (21 words) takes 3. I looked at the
layers and spread stills: the text is whole and unclipped, and the camera sits on zoom-out's last shot (the small
stack, a few drifting dots), as expected until Tasks 5 and 6. The other six were checked by the measurements above,
not by eye.

## Concern for the controller (a storyboard inconsistency; no words changed)

§2.5's up-1 row says the line is up "0.00 → page out ends 0.62", while the wordless row says "the second fix ...
0.40–0.62: no text". The format can only take a page away by starting the next one, so up-1 is on screen through the
whole dive (its stop is at 0.589 local). §6 test 6 ("the wordless second fix lies between up-1's stop and up-2's") cannot
hold as written: the fix lies before up-1's stop. If the line really should be gone for the dive, the options are an
earlier page break or an empty page; both are an author or format ruling. I did not add test 6's clause for this reason.
Nothing else in the tables conflicted with the format.

(Resolved in fix round 1, below.)

## Fix round 1: an explicit page out, so the second fix has no text

Ruling applied: the script is the authority, so the dive is text-free. Commit `4b6df6b` adds an optional `out=` on a
beat marker and uses it in `09-spread.md` (`<!-- beat id=up-1 at=0 out=0.4 -->`). The controller's correction of the
design's §2.5 up-1 row (page out ends 0.40) is committed with it.

What changed:
- `src/story/loader.ts`: `parseMarker` reads `out=` (a number after its `at`, at most 1). `applyPageOuts` then checks
  that only a page's last beat carries one, that `last.at + fade < out`, and that `out` is no later than the next page's
  first `at` (or 1). Each failure names the file. It sets `Page.out`, left unset when `out` equals the default, so a
  redundant `out` is harmless. `checkLines` (document lines must be up before the page goes) uses the page's real end.
- `src/story/reveal.ts`: new `pageOut(pages, pi)` (own `out`, else the next page's `at`, else 1), used by `storyLooks`.
  The essay's last page still does not fade out unless it was given an explicit out.
- `src/story/markup.ts`: a page given an out is written with `data-out`. The no-JS page shows every line regardless, so
  nothing else depends on it, but the e2e readers need it.
- `src/autoAdvance/plan.ts`: scenes use `pageOut`, so up-1's text ends at 0.40 less a fade and a margin. The motion rule
  is unchanged: a scene's stop waits for its motion after the text, to the latest point at rest before the next text.
- Fences: the dwell lint uses `pageOut` (up-1 now gets 1.44 screens against a budget of 0.525). The storyboard fence
  gained a test: every "page out ends X" and "fade-out ends X" in a §2 row must equal the explicit or derived out of
  that row's page, and the row must be its page's last beat. It passes for both boards, so every existing row is
  checked too.
- e2e `pages.spec.ts`, `clearance.spec.ts` and `shots.spec.ts` read `data-out` (they had assumed a page ends where the
  next begins).
- Docs: a bullet on `out=` in the text-engine spec's marker section (§3.1).

Tests added:
- `loader.test.ts`: valid cases (sets `Page.out`; the last of several beats; an out equal to the next page's `at`, or 1,
  accepted; a last page may have one), nine invalid cases each throwing with the file name (not last on its page, not a
  number, out equal to at, out before at, negative, past 1, no room to fade, past the next page, a document line with
  no time to come up), and the messages name `out` and "last beat".
- `reveal.test.ts`: on the shipped story, spread's page 1 is whole until its fade, fading over it, and every page is
  below 1e-9 across [0.40, 0.62], with page 2 whole after its fade-in. A synthetic section covers the same: gone at
  the out, absent until the next `at`, and the essay's last page fading only with an out. The "a page is up mid-page"
  test uses `pageOut`.
- `markup.test.ts`: `data-out` appears exactly on pages with an out, and the page matcher accepts it.
- `plan.test.ts`: the test 6 clause: up-1's stop is before the second fix (before spread 0.40) and up-2's is after it
  (after 0.62), with page 1's out equal to 0.4.

Test 6, scoped: the clause holds now. The dive is not keyed, so up-1's stop ends with its text (`ends: 'text'`), and the
clause asserts that. Removal trigger (in a comment in the test): once Task 6 keys the dive (spread 0.40-0.62), the
plan's rule (a scene ends where its motion after the text ends) moves up-1's stop to the pull-out's end
(`ends: 'motion'`), just before 0.62, and the second fix then lies before that stop, so this clause fails on purpose.
Replace it then with: up-1 ends 'motion' in [spread 0.54, up-2's `at`), and no text is up anywhere in [0.40, 0.62].
This is a tension between §6 test 6 and the author's rule that the controller should settle before Task 6.

Verification: `npx tsc --noEmit -p .` clean; `npx vitest run` 66 files, 1393 tests pass; full e2e
(`E2E_PORT=4199`) 126 passed, 9 skipped (SHOTS-gated), 0 failed.
