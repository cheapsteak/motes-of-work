# Act II, Task 4: the remaining eight sections and their copy

Repo /home/user/motes-of-work, branch main; commit there, do not push. First read global-constraints.md and
implementer-instructions.md in this folder, and the repo's CLAUDE.md.

**Requirements:** docs/specs/2026-10-06-act-2-storyboard-and-network.md, §1 (the copy), §2 (conventions and
§2.2–§2.9's tables, for beats, pages, `at` values and lengths), §2.10's first bullet, and §6 test 10. Build §7
task 4:

> Sections and copy. The nine story files, the fence generalised to two documents, the words fence, the dwell lint,
> the auto-advance leaves; test 10 and the existing stop tests.

**Already done by Task 2:**
- `src/story/05-zoom-out.md` exists.
- The storyboard fence already takes a list of boards.
- The words fence has an "Act I + Act II" classification.
- `sceneMotion` already has the five motion leaves.

Read those first and extend them; do not rebuild them.

**What is yours:**
1. **Eight new story files, `06-layers.md` to `13-lesson.md`.** Copy each page and line verbatim from §1. Take
   beats, `at` values and lengths from §2.2–§2.9, use `draft: true`, and match `05-zoom-out.md`'s format exactly.
   The wordless moments the storyboard names (the second fix, the fan-out) are beats with no line, if the beat
   format allows that. Otherwise, model them the way Act I models a wordless hold, and say which you chose.
2. **The storyboard fence covers all nine sections.** It must also close the gap the Task 2 review found (Minor 3):
   every §1 copy row and every §2 beat row in each board must be claimed by some section. A row that nothing claims
   fails the fence. It is not silently skipped.
3. **The words fence and the dwell lint at the new lengths.** If a line fails the dwell lint at the designed
   length, do not edit the copy. Report the line and the numbers; the controller rules.
4. **Auto-advance:** one stop per scene, at its end, over the new beats. The existing stop tests must pass.
5. **The keyframes do not exist yet** (Tasks 5 and 6). The new sections must still render without error:
   - The sampler holds every track at its last key, so the camera stays on zoom-out's last shot. That is expected.
   - If a test asserts something about every section that cannot hold until keys exist, do not weaken it. Either
     scope it with a named exclusion list that Tasks 5 and 6 empty, with the removal trigger in a comment, or
     report it to the controller.
6. **Fix tests that assumed zoom-out ends the essay** (end-of-essay checks, the reduced-motion sample, the
   landing-page screen count if a test pins it). Point them at the right place; do not loosen them.

**Verification:**
- `npx tsc --noEmit -p .`
- `npx vitest run`
- the full e2e suite (`E2E_PORT=4199 npx playwright test`; never `playwright install`)
- **Phone first:** capture one still at 390×844 for each new section's first page, at `?p=` its first beat's
  midpoint. Save them to `shots/act2-copy/` (gitignored); use a temporary script under `shots/`, then delete it.
  Confirm in the report that each text page sits within the text band: no line clipped, at most three lines per
  page.

**Commits:** in logical commits. Copy and commit messages must be publication-safe (no names).

**Report** to task-4-report.md in this folder: the files, any dwell-lint failures with their numbers, the scoped
exclusions, and the still paths. Return only status, commits, a one-line test summary, and concerns.
