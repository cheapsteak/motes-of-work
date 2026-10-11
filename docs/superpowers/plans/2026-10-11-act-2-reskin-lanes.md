# Act II re-skin: running the remaining tasks in two lanes

Author-approved 2026-10-11 ("yes go ahead, 8b first in lane B"). This page changes **how** the remaining tasks of
`2026-10-09-act-2-reskin.md` run, not **what** they build: each task's brief, the spec, the decisions page and the
look check are unchanged. It is written down so the plan survives a lost context.

## Why

Until Task 5, every task ran one at a time on `main`, with a full local e2e (about 1.5 h on this 4-core container)
before review and again after fixes. Running two things at once pushed the load to 15 to 20 and made tests time out
for no real reason. So the limit was the machine, not the plan order. The test speed-up (branch `test-speed`) runs
the full e2e on GitHub in 8 shards in 10 to 16 min, free on a public repo. With e2e on GitHub, the container only
runs unit tests and a few targeted specs, which leaves room for two implementers at once.

## The lanes

Grouped by the files each task's plan section lists, so that tasks sharing hot files run one after the other:

| Lane | Tasks, in order | Shared files that force the order |
|---|---|---|
| A: shots and the hole | 6, then 7b | `netShots.ts`, `keyframes.json`, the shot e2e specs; 7b also edits `main.ts` / the stage |
| B: body shaders | 8b, then 7, then 8 | `body.frag.glsl`, `shell.vert.glsl`, `body.vert.glsl`, `bodyMote.ts`, `bodySystem.ts`, `birth.ts` |
| Last | 9 | the backlog and the author's contact sheet need everything else |

8b (the defect's motion, the author's variant 18) leads lane B so the author sees it early.

Across lanes the overlap is mostly append-only lists (`src/parity/parity.ts`, `e2e/stills.spec.ts`,
`e2e/network.spec.ts`) and generated files (`src/timeline/keyframes.json`, fingerprints). A generated file is
regenerated after a rebase, never merged by hand.

## Before the lanes start (in this order)

1. Task 5 closes (fix round 1, re-review).
2. The test speed-up merges into `main`: rebase `test-speed` onto `main`, redoing Task 5's `main.ts` changes in
   `src/scene/stage.ts` (the shadow uniform made once per stage, not per module; main's hole samples moved from
   `e2e/purity.spec.ts` into `src/purity/samples.ts`, with a hole fence sample; `e2e/reducedMotion.spec.ts` is
   re-indented on the branch, so take the branch's file and re-apply main's hole tests to it). Unit + typecheck
   locally, `e2e:full` on GitHub, then fast-forward `main`.
3. v23 (the black hole) is published from that `main` after the pre-publish judge.
4. `e2e.yml` gains `task-*` branches as push triggers (keep `main`, `reskin-wip`, on demand), so every task branch
   gets the 8-shard run.
5. `e2e.yml`'s on-demand trigger gains two optional inputs, `specs` (spec files) and `grep` (a test-name filter),
   for **focused runs on GitHub**: one shard when the selection is small, 8 when it is large; same image, font check
   and tolerances. Author-approved 2026-10-11, and the author asked that everyone know about it and how to use it:
   - the implementer and reviewer instructions get a "Focused tests on GitHub" paragraph: when to use it (a heavy
     spec such as clearance, galaxy or network; a re-run of a test that timed out; anything while the machine is
     loaded) and when not to (a quick single test while iterating: run it locally, since CI spends about 3 to 4 min
     before the first test), with the exact call (the GitHub tools' `actions_run_trigger`, `run_workflow`, workflow
     `e2e.yml`, ref = the task branch, inputs `specs` / `grep`) and how to read the result (list the branch's runs,
     then the job logs);
   - every lane dispatch names it in one line;
   - the controller proves it once (a focused run of one spec on a task branch) before the first lane dispatch.

## How a task runs in a lane

- **Branch and worktree.** Task N works on branch `task-N` in its own worktree `<scratchpad>/task-N`, never in the
  main checkout. Lane A's first task branches from `main`; a stacked task branches from the task before it in its
  lane (7b from `task-6`, 7 from `task-8b`, 8 from `task-7`) as soon as that task has its implementer report, so it
  does not wait for review.
- **Ports.** Lane A 4195, lane B 4194, reviews 4198 and 4196, the main checkout 4199, previews 4193.
- **Tests.**
  - Locally: typecheck, the unit tests (`npx vitest run --maxWorkers=2`), and the e2e specs the task touches,
    with one worker.
  - The end-of-task e2e is the GitHub run on the pushed `task-N` branch (`e2e:full`, 8 shards). A red shard is the
    implementer's to fix, the same as a local failure.
- **Push.** The implementer pushes its own `task-N` branch to `origin` (public) after each green step, to trigger
  CI. Never `main`. (The session's push guard watches another repository's CI; pushes here pass
  `ANDON_OVERRIDE=1` because they spend none of it.)
- **PR.** The controller opens one PR per task on `cheapsteak/motes-of-work`: base `main`, or the previous task's
  branch when stacked. The PR is the record (CI result, review summary, look check). Review still runs as a
  subagent in a detached review worktree, as before.
- **Fix rounds.** These are unchanged: Critical and Important only, then a scoped re-review. When a fix lands on a
  task that has a stacked successor, the successor rebases onto it before its own review.
- **Merge.** Merges go in plan order within a lane. A task whose review has closed and whose GitHub run is green
  merges by fast-forwarding `main` (rebased first if `main` moved: regenerate generated files, unit + typecheck,
  push, wait for green). Then `main`'s own GitHub run must be green before the next merge. A stacked PR is
  retargeted to `main` once its base merges.
- **Lane B before lane A, or the reverse?** Whichever closes first merges first; the other rebases.

## What the author sees

- **The preview** (https://claude.ai/artifact/PjfkjTTuJhQSVKK6Vi76bX, unreviewed) is rebuilt after each
  implementer report or fix round. It is built from `main` plus both lanes' latest heads, combined in a throwaway
  detached worktree (`<scratchpad>/prevwt`), so the author sees everything in progress together. If the lanes
  conflict there, the preview takes `main` plus the lane that changed, and its landing page says which.
- **The reviewed essay** (https://claude.ai/artifact/EzEUekzAsq7qSgxRjGT8wa) is republished after each merge into
  `main`, once `main`'s GitHub run is green and the pre-publish judge passes.
- **The look check** judges each task's own side-by-sides in its review, and the pre-publish judge walks the
  decisions page's "Look check" table against the combined `main` before each reviewed publish.

## Costs, accepted

- Rebase churn when a stacked task's base changes in a fix round.
- Two implementers' tokens at once (the same total, spent sooner).
- A combined result can break what each lane passed alone. `main`'s GitHub run after each merge is the net.
