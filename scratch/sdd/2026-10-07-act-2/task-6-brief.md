# Act II, Task 6: keyframes, second half (spread, reviewer, trace, fix, lesson)

Repo /home/user/motes-of-work, branch main; commit there, do not push. First read global-constraints.md and
implementer-instructions.md in this folder, and the repo's CLAUDE.md. Phone first, and every frame a pure function
of scroll.

**Requirements:** docs/specs/2026-10-06-act-2-storyboard-and-network.md. Read §2 (the conventions, §2.5–§2.10),
§3.2, §3.7, §3.9, §6 tests 4–9 and 13, and §11 including "As built". Build §7 task 6:

> Keyframes, second half. spread through lesson: the up-stream follow, the second dive, the ring, the climb, the
> fan-out, the fixes, the sweep; the rest of tests 4–9.

**Build on Task 5. Read task-5-report.md in this folder first.** It covers:
- the shots as built;
- why every camera move that crosses the text band rides a page turn;
- `PAGE_TURN_MOVES`;
- the shared spline helper, after Task 5's fix round;
- the clearance search method.

Use the same approach for the second half. Every move that would cross the text band rides a page turn, or a
wordless stretch with no text up. Search candidate paths with the clearance measure before keying, and report the
failures with their numbers. This approach is provisional: the author will judge it in motion, so keep the moves
easy to re-key (named shots and named move windows, not scattered literals).

**Rulings that bind you:**
1. **spread's second fix is wordless.** `09-spread.md` has `up-1 … out=0.4`, and nothing is on screen from 0.40
   until up-2 at 0.62. That stretch is free of the text band, so the dive to C12, its hold and the pull-out can run
   there as designed.
2. **The stop rule for a page with `out=`.** up-1's stop sits while its own text is up: R1 forming and lit, about
   0.38, before its page fades. The wordless second fix is crossed in transit, and up-2's stop follows it. There is
   no pause on an empty frame.
   - `src/autoAdvance/plan.test.ts` has a deliberate tripwire clause (`ends: 'text'`, written by Task 4) that
     expects exactly this. Make the planner honour it: a scene whose page has an explicit `out` ends no later than
     that page's last fully inked moment. Keep the clause passing.
3. **Rulings from earlier tasks still hold:**
   - no highlight before the defect is found;
   - the surge keeps the loop path (C7's up-stream to R1);
   - the second fix visits C5. Check whether Task 1's lineage put C5 or C12 at the second fix, and use what
     `src/network/` says. The design table's C12 predates ruling 3; the generator is the authority.
   - the surge is clamped at hop 6 and multiplied by (1 − fixed), already in the node set.
4. **The schedule constants are the authority.** Key against `src/network/schedule.ts`'s exports (`REVIEWER_KEYS`,
   `SWEEP`, `CLEAN_AFTER`, `CLEAN_WORK_FROM` and the rest), never copied numbers. `REVIEWER_KEYS` must match the
   reviewer section's keys exactly.
5. **Purity samples for Act II.** Add §6 test 13's samples to `e2e/purity.spec.ts`: zoom-out 0.22, defect 0.68,
   reviewer 0.50, trace 0.80 and fix 0.82. If the purity detour's 0.95/0.99 branches are still dead after this,
   remove them.

**Verification:**
- `npx tsc --noEmit -p .`
- `npx vitest run`
- the full e2e suite (`E2E_PORT=4199 npx playwright test`; rebuild `dist/` first if a preview server is already
  running on 4199; never `playwright install`)

**Look, phone first:** capture stills at 390×844 and then 1440×900 at every beat's midpoint in spread, reviewer,
trace, fix and lesson. Also capture the wordless moments: spread 0.51 and trace 0.80. Save them to
`shots/act2-keys-2/` (gitignored); use a temporary script under `shots/`, then delete it. In the report, check every
line against its frame: is it true of what is on screen?

**Commits:** in logical commits.

**Report** to task-6-report.md in this folder. Include the shots as built against the design (a table), the failed
camera paths, any `PAGE_TURN_MOVES` and `STILL_MOVING` entries, and the still paths. Return only status, commits, a
one-line test summary, and concerns.
