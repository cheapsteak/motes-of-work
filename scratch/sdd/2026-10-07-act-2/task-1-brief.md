# Act II, Task 1: the network generator and the schedule

Repo /home/user/motes-of-work, branch main; commit there, do not push. Read global-constraints.md and
implementer-instructions.md in this folder, and the repo's CLAUDE.md (phone first, pure function of scroll).

Requirements: docs/specs/2026-10-06-act-2-storyboard-and-network.md — read it whole once (you need the full
picture), then build exactly §7 task 1: "The generator and the schedule. `src/network/` (§3.2, §3.3,
`review.ts`), `firstStack()`, tests 2 and 7. Pure TypeScript, no renderer." Apply §11's rulings (the second fix
visits C5, one of the twelve; no highlight before the defect is found; the loop path for the surge).

Later tasks build on what you export (the reflow uses `firstStack()`; the node renderer uses the layout and birth
values; the keyframes use the schedule), so give the module clear, documented exports named as the design names
them, and keep it deterministic from a seed (same seed, same network, bit for bit).

Verification: `npx tsc --noEmit -p .`; `npx vitest run`. No e2e needed for a pure module unless you touch
rendering. Commit in logical commits.

Report to task-1-report.md here (what you exported, any number you had to change from the design and why); return
only status, commits, one-line test summary, concerns.
