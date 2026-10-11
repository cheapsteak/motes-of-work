# Performance work, deferred until after the essay review

The author, 2026-10-10: performance work waits until after the essay review, and nothing in the review
path waits on it. This page is the list of what we intend to do, so none of it is lost. The re-skin's
visible tasks (1c onward) run first; when the review is done, this list becomes a plan of its own.

What already shipped: Task 3's early-out (pushed at 9744a56). It is pixel-identical on every still and cut
the heavy vertex runs at the hood on a phone from 278k to 152k, and at fr-1 from 278k to 48k.

## 1. Task 3's fix round, parked on a branch

Branch `perf-deferred` in the archive repo `cheapsteak/motes-of-work-private` (pushed), four commits on a10f7d8, written in the review worktree:

| Commit | What it does |
|---|---|
| 92043b6 | Act I's hidden mote meshes draw nothing once Act I's stage is 0 (about 1.2M vertex passes saved at fr-1); re-points `e2e/network.spec.ts:58` |
| 250e919 | Fences the off-screen reach against a wrong bound (review finding I2) |
| 84ab2c4 | Holds the early-out pixel-identical in every run, not only on request (review finding I1) |
| 2900c50 | Fences the TypeScript twin against the late paths the early-out hoists (I1) |

State: committed, not verified. The mutation checks were partly run and the affected e2e never finished
(a container restart, then this deferral). To land it:

1. Rebase the four commits onto main (main has moved: Task 1c and later).
2. Mutation checks: break the early-out's composition (I1's test must fail); widen and narrow the
   off-screen bound (I2's test must fail); draw Act I's hidden meshes again (the re-pointed test must fail).
3. Unit tests, the affected e2e, then one full e2e; a scoped re-review of I1 and I2; push.

The review of Task 3 is `.superpowers/sdd/2026-10-09-act-2-reskin/task-3-review.md` (git-ignored; the
findings are summarised here and in the minors file).

## 2. The budget and the real phone

- `GALAXY_SHARE` is 0.935 (93,500 of the 100,000 desktop budget) in `src/galaxy/generate.ts`, raised on
  the author's word ("err on a little more, dial down later"). Dial it down after a frame-time check on a
  real phone.
- The real-phone frame-time check itself (the old Task 13's phone pass): frame times at every beat on a
  mid-range phone, against the budget each tier assumes.
- Add up what the re-skin adds once it is in, and check it against that measurement:
  - the black hole, 27,610 dots (the disk 18,000);
  - the schematic's reservation, about 7,500 (Task 7b); the bands' closed-arc fill is the first saving,
    about 300 dots a band;
  - the defect's leak, per dot (Task 8b expects under 2 % of df-1's heavy vertex runs);
  - the binaries' extra Kepler step, in paired systems only (Task 1e).

- `keyframes.json` grew from 60.6 to 102.4 KB gzipped (+42 KB on a phone's first load) when Task 1d fixed `moveKeyCount`'s slope (1.5 to 3); the fix is right, so look at thinning keys or loading them lazily.

## 3. Task 3's minors

They are in `2026-10-09-act-2-reskin-minors.md` under "Task 3". The ones that are performance work:

- The desktop tier has no vertex fence (it is only logged in `e2e/vertexCost.spec.ts`); its heavy shells at
  fr-1 would miss the 5 % bound. Fence it, or say why it is exempt.
- `streamSkips` leaves out `stream.vert`'s band skip, so `vertexStats()` over-counts the heavy stream runs
  while the streams are up.
- The early-out pixel test cannot tell whether its reference set was shot from the build under test (the
  `reuseExistingServer` trap).

## 4. Settled, recorded so it is not re-tried blind

- One triangle per dot instead of a quad was tried and reverted: 4× multisampling and the 1/16 px vertex
  snap make any triangle differ by up to 122/255, far past the 3/255 bound. Quads stay. To revisit, the
  revert is `git revert 27119bf 57727b8`.
- The particle and shader research (`scratch/session/particles/findings.md`): dots beat a shader field on
  look and on a phone. Its list of tricks to raise the count without raising the cost is the place to start
  if the phone check says we are over.

## Removal trigger

Delete this page when its items have landed or been ruled out in the post-review performance plan.
