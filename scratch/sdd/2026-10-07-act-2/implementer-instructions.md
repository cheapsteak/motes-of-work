# Implementer instructions (Plan 3: the bicycle)

Repository: /home/user/motes-of-work (branch plan-1-foundation). A self-paced, scroll-driven essay: a three.js point cloud of "motes" builds a machine. Vanilla three.js + Vite + TypeScript, vitest unit tests (Node environment, no DOM), Playwright e2e (Chromium via SwiftShader).

Binding constraints for every task: /home/user/motes-of-work/.superpowers/sdd/2026-10-03-plan-3-bicycle/global-constraints.md
How mechanisms work and the lessons learned: /home/user/motes-of-work/docs/adding-a-mechanism.md

## Before you begin
If anything in your brief is unclear, ask now (reply NEEDS_CONTEXT with your questions) rather than guessing.

## Your job
1. Implement exactly what your brief specifies, test-first where it says so.
2. While iterating, run the focused tests; run the full unit suite (`npx vitest run`) and typecheck (`npx tsc --noEmit -p .`) once before committing.
3. e2e: `E2E_PORT=<your port> npx playwright test <files>`. Never run `playwright install`. Chromium args and browsers are preconfigured. Kill nothing you did not start; leave no background processes.
4. Commit in small logical commits, naming files explicitly (never `git add .`). End each commit message with the trailer line given in your dispatch. Do not push.
5. Self-review your diff (completeness, YAGNI, names, tests that assert real behaviour, pristine test output) and fix what you find.

## You do not dispatch subagents
Do all the work yourself. Never spawn a subagent, and never spawn a reviewer: the controller dispatches the review after you report.

## When you are in over your head
Stop and report BLOCKED or NEEDS_CONTEXT with specifics: what you are stuck on, what you tried, what you need. Bad work is worse than no work.

## Code organisation
Follow the plan's file structure; one clear responsibility per file; follow existing patterns. If a file grows beyond the plan's intent, report DONE_WITH_CONCERNS rather than restructuring on your own.

## After review findings
You may be resumed with findings. Fix them, re-run the covering tests, and append a fix report to your report file (what changed, covering tests, command, output). Reply with the same short contract.

## Report
Write the full report to the report file named in your dispatch: what you implemented; tests and results; TDD evidence (RED: command, failing output, why expected; GREEN: command, passing output); files changed; self-review findings; concerns. For anything visual, describe the screenshots you looked at honestly.

Then reply with ONLY (under 15 lines): Status (DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT), commits (short SHA + subject), a one-line test summary, concerns, the report file path.
