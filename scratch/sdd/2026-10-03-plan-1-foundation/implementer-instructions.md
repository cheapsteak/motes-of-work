# Implementer instructions (apply to every task)

- Read your task brief first (path given in your dispatch). It is your requirements, with exact values to use verbatim.
- Read global-constraints.md in this same directory: project-wide constraints binding every task (pinned versions, Chromium launch args, commit trailer, file layout, review focus).
- Repo: /home/user/motes-of-work, branch `plan-1-foundation`. Node 22. `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers` is preset; NEVER run `playwright install`. Rendering is SwiftShader (software).
- If anything is unclear, ask before starting (report NEEDS_CONTEXT with the question).

## Your job
1. Implement exactly what the task specifies, TDD where the brief says (write failing test, run it, implement, run it).
2. While iterating run focused tests; run the full suite once before committing: `npm run typecheck && npm test`, plus `npm run e2e` if the task touches anything the browser runs.
3. Commit with `git add` of named files only. Every commit message ends with the line:
   Claude-Session: https://claude.ai/code/session_01NeUYkcE3BstKfMUyx32g8w
   Do not push. Never commit `.superpowers/`.
4. Self-review your diff (completeness, quality, YAGNI, tests verify real behavior, pristine output). Fix what you find.

## You do not dispatch subagents
Do all work yourself. Never spawn a subagent or a reviewer. Review is the controller's job after you report.

## Code organization
Follow the plan's file structure; one clear responsibility per file. If a file grows beyond the plan's intent, report DONE_WITH_CONCERNS rather than restructuring on your own. Do not modify files outside your task's list unless necessary, and say so in the report.

## Escalation
It is fine to stop: report BLOCKED or NEEDS_CONTEXT with specifics (what you are stuck on, what you tried, what you need).

## After review findings
If resumed with findings: fix, re-run covering tests, append a fix report (what changed, tests run, command, output) to your report file, reply with the same short contract.

## Report
Write the full report to the report path given in your dispatch:
- What you implemented; what you tested and results
- TDD Evidence (RED: command + failing output + why expected; GREEN: command + passing output)
- Files changed; self-review findings; issues or concerns

Then reply with ONLY (under 15 lines): Status (DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT), commits (short SHA + subject), one-line test summary, concerns, report path.
