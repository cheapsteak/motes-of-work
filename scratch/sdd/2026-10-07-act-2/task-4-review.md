# Task 4 review: the remaining eight sections and their copy (691ff28..4b6df6b)

Note on inputs: the diff file named in the dispatch (`.../2026-10-06-act-2-storyboard-and-network/review-691ff28..4b6df6b.diff`) does not exist there. The same-named file in `.superpowers/sdd/2026-10-07-act-2/` does, and I reviewed that one (1441 lines, head 4b6df6b, three commits). Hunks I judged were complete in the diff; I read changed files separately only where noted below.

## Spec Compliance

- ✅ Spec compliant. No Critical or Important findings.

Checks made (each against the design spec, not the report):

- **Copy verbatim.** All 24 beat lines in `06-layers.md` .. `13-lesson.md` were read against §1's table, line by line: text identical, and pages match the table's Page column (ly-1..5 on pages 1..5; df-1/2 page 1, df-3/4/5 page 2; up-1/up-2 pages 1/2; fx-1/2/3 page 1, fx-4 page 2; the rest page 1). The eight alt texts and the zoom-out one were compared mechanically with §1's Alt text list: 9 of 9 byte-equal. Lengths (5, 1.6, 4.8, 3.6, 3.2, 3.4, 4.6, 1.6) and every `at` match §2.2–§2.9's "Appears" column (checked against the table rows). `draft: true` and the frontmatter/marker format match `05-zoom-out.md`. Sentence case, no names, none of the picture words in narration.
- **Storyboard fence is stricter, not looser** (`src/story/storyboard.test.ts`):
  - The `prefixes` filter on §1 rows and the `board.sections` filter on timing blocks are removed, so `covered ids == every §1 row id` and `block ids == board.sections` now fail on an unclaimed row or heading.
  - New assertion: the count of beat rows in §2 (from `## 2.` to `### 2.10`) must equal the rows inside the `### 2.x` blocks, so a row above the first heading, or under a heading the block regexp does not match, fails. `between(...)` stops at `### 2.10`, so §2.10–2.12 table rows are out of range by construction.
  - New out-fence: every "page out ends X" / "fade-out ends X" cell must equal `pageOut(...)` of that row's page, and the row must be the last beat of the page. This also now checks every existing Act I and Act II row.
  - The wordless rows (`*the second fix (wordless)*`) are skipped by the beat-id pattern as intended, and are the only rows that are.
  - Act I board unchanged and still runs through the stricter code.
- **`out=` honoured by every consumer of a page's end.** I grepped `src`, `e2e`, `scripts` and `vite.config.ts` for `pages[...+1]`, `beats[0].at`, `data-page`, `.pages`, `.page` and `dataset.at`. The remaining page-end computations are:
  - `reveal.ts` `pageOut` (the one definition) and `storyLooks` (opacity; `dom.ts` writes whatever it returns);
  - `plan.ts` `scenes` (fade-out, and so the stops); `loader.ts` `checkLines` and `applyPageOuts` (the latter has its own `next` because it validates against it);
  - `markup.ts` (`data-out`, so the no-JS markup carries it; the no-JS CSS shows every page regardless);
  - `content.test.ts` `dwell` and the brief's "newest line" fence;
  - `reveal.test.ts` "page is up mid-page";
  - e2e `pages.spec.ts`, `clearance.spec.ts`, `shots.spec.ts` (all three now read `data-out`).
  - No other site computes a page's end as the next page's first `at`. `app.spec.ts`'s `showing()` reads rendered opacity only. The oracle in `plan.test.ts` (`textOpacity`) goes through `storyLooks`, so it is independent of `plan.ts`'s own `scenes`.
- **Re-pointed e2e samples still sample the same Act I frames.** Act I = 19.4 screens (7.2 + 3.2 + 1 + 8), spec starts at 11.4 and is 8 long, total now 49.4.
  - `reducedMotion`: 0.381 x 49.4 = 18.82 screens, spec local 0.9277 (was 0.871 x 21.6 = 18.81, local 0.9267; same frame to a few thousandths of a local unit, inside the built-bike hold).
  - `purity`: 0.12/0.41/0.88 x 21.6/49.4 = 0.0525/0.1793/0.3848 map to the same absolute screens (2.59, 8.86, 19.01) to within 0.002 screen, so vibe-build@0.36, reveal@0.52, spec@0.95 as before. The non-vacuity test uses the same points.
  - `app.spec` end-of-essay test is stricter (last section is `lesson`; `reflow` 1; drive still running), not looser.
- **Act I behaviour unchanged.** `pageOut` with no `out` returns exactly the old `next page's first at, else 1`; `storyLooks` and `scenes` keep "the essay's last page does not fade out" unless an explicit out is given; no Act I markdown changed.
- **Wordless moments.** The beat format cannot hold a beat with no line (`closeBeat` fails on empty text), so Act I's model (no marker; the line before holds) was used for the fan-out, which the design says is "under the line" anyway, and `out=` was added for the second fix, which the controller's ruling made text-free. The report states which it chose.
- **Dwell lint.** Tightest are df-3 (0.576 screens against 0.3) and fx-1 (0.644 against 0.3); up-1 is 1.44 against 0.525 with the explicit out. The report's numbers agree with the `at`/length values.
- **Scoped exclusions:** none claimed, and none needed.

### ⚠️ Cannot verify from the diff (for the controller)

1. **Phone stills.** The eight PNGs and the per-still measurements are gitignored and were not in the diff. They also predate fix round 1; spread's still at `?p=0.69061` is local 0.31, which is inside up-1's hold both before (page out 0.62) and after (page out 0.40, fade starts about 0.372), so the claim should still hold, but it was not retaken.
2. **The `SHOTS=1` shot spec is skipped** in the e2e run (9 skipped), so the `shots.spec.ts` edit is checked only by `tsc`.
3. **§6 test 6 ruling.** After Task 6 keys the dive, the plan's own rule moves up-1's stop to the pull-out's end (just before 0.62), so the second fix (0.40–0.62) then lies *before* up-1's stop, and test 6's "lies between up-1's stop and up-2's" cannot hold as worded. The implementer's clause in `plan.test.ts` is deliberately a tripwire (`ends: 'text'`, removal trigger in a comment) and says what to replace it with. That is acceptable for this task, but the controller should settle the wording of test 6 before Task 6.
4. **Purity coverage of Act II is nil until keys exist.** All essay samples are now in Act I. The detour overshoot target is 0.8 for every sample (Act II frames, un-keyed), so the rewind is exercised across Act II motion only trivially. Tasks 5/6 should add Act II sample points.

## Strengths

- Generalised the fence by deleting the filters instead of adding exceptions, and checked it negatively (removing `lesson` fails three tests). The new "page out ends X" fence checks every existing row of both boards for free.
- `pageOut` is a single pure helper, used by the loader, opacity, stops, lint and the e2e readers; the e2e readers read a DOM attribute rather than re-deriving.
- Loader validation is thorough and each failure names the file: only-last-beat, at+fade < out, out <= next at, document lines still have time to come up. Nine invalid cases and four valid ones are tested; `out == next at` is normalised to "unset", so a redundant `out` cannot diverge from the default.
- Reveal tests assert zero opacity across the whole gap on the real story (201 samples) and on a synthetic section, including the last-page-with-out case.
- The e2e re-pointing preserves the intent (same frames, stricter end-of-essay assertion) and the comments say why.

## Issues

#### Critical
None.

#### Important
None.

#### Minor

1. `docs/specs/2026-10-04-act-1-storyboard-and-text-engine.md` §3.1, just after the new `out=` bullet (about line 402): "Everything else (fade, hold, dim, out) is derived (§3.2), never authored" is now false for `out`, and §3.2's `out_k = the next page's in` is not updated. Reword both to "unless the last beat gives `out=`".
2. `e2e/purity.spec.ts` (the `past` line, about line 100): every sample is now below 0.8, so the `p < 0.94 ? 0.95 : 0.99` branches are dead and the new comment ("a target at or past 0.8 overshoots to 0.95 or 0.99") describes code that no sample reaches. Simplify, or keep it for Task 6's Act II samples and say so. The `essayPoint` mapping rounds to 4 dp (up to 0.002 screen off the original frames); harmless here, but the comment's "still lands on the frame it was chosen for" is approximate.
3. `src/story/loader.ts` `parsePages`/`applyPageOuts`: the `out` travels through a `Map<beatId, number>` side-channel keyed by id, so two beats with the same id in a section would mix up their outs (no id-uniqueness check exists for this either). Attaching the pending `out` to the page being built would avoid the Map. Low risk now.
4. `e2e/app.spec.ts` tests at `?p=0.6` and `?p=0.42` now land in Act II (defect, zoom-out) rather than Act I; they are section-agnostic and pass, but they no longer cover what they once did.
5. No e2e checks that the rendered DOM is text-free across spread 0.40–0.62 (only unit tests on `storyLooks`). Fine for now; `pages.spec.ts`'s "one page at a time" test only samples page midpoints and each page's `in`.
6. Commit messages carry no trailer (no trailer was given in the dispatch; the report explains why). Noting only for the controller's record.

## Assessment

**Task quality:** Approved

**Reasoning:** The copy, alt text, beats, pages, `at` values and lengths are verbatim from the design; the storyboard fence now fails on any unclaimed §1 or §2 row, and the `out=` feature is honoured at every place that computes a page's end (I found no remaining next-page-`at` derivations), with the Act I frames unchanged and the re-pointed e2e samples landing on the same Act I frames. Remaining points are doc staleness, a dead branch in the purity detour, and the §6 test 6 wording for the controller.
