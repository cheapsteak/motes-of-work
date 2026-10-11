# Act II, Task 2: the reflow (the bike becomes the first stack)

Repo /home/user/motes-of-work, branch main; commit there, do not push. First read global-constraints.md and
implementer-instructions.md in this folder, and the repo's CLAUDE.md (phone first, pure function of scroll).

**Requirements:** docs/specs/2026-10-06-act-2-storyboard-and-network.md. Read §0, §1 (the zoom-out copy), §2's
conventions plus §2.1, §2.10, §2.11, §3.9, §4, §5 and §6 test 1. Build exactly §7 task 2:

> Step 3b in both mirrors, the salts, the spliced constants, `uReflow`, the parity states; test 1; zoom-out's keys
> for `mech.reflow`, `drive`, `ink.opacity`, `stage.motes` and the S10′ → N1 → N2 moves (needs task 1's
> `firstStack()` and the first `netShots.ts`). Viewable at `?p=` in the zoom-out section with the network still
> absent.

**What Task 1 gave you** (already on main, see `src/network/`):
- `firstStack()` from `src/network/cluster.ts` returns N0's six boxes at the origin. Each `Box` is
  `{centre, size, yaw, course}`, in world units, with yaw about +y through the box centre.
- **The boxes are not axis-aligned.** Each one has its own small yaw (about ±0.06 rad), so `moteStackRest` must
  place points on the yawed box, and `moteStackNormal` must return the yawed face normal. Splice the yaw (or its
  cos/sin) into the GLSL constants beside centre and size.
- `generateNetwork(seed, budget)` and `nodeIndex(net, id)` are in `src/network/generate.ts`. A shot target may be a
  node id (§3.9), and `N0` is the first stack.

**Rulings from the controller** (each is a decision; follow it):
1. **This task creates `src/story/05-zoom-out.md`**, using §1's zoom-out copy and §2.1's beats and `at` values, with
   `length` 2.2 and `draft: true`, in the same format as `04-spec.md`. A section is needed before it can carry keys.
   Task 4 adds the other eight sections and generalises the storyboard and words fences. Whatever the existing
   fences, lints and stop tests need for this one section, satisfy it now:
   - extend the storyboard fence so it also reads the Act II document, for the zoom-out section at least;
   - add the zoom-out copy to the words fence;
   - keep the dwell lint passing.
2. **Add all six SceneState leaves of §2.11 now**, with their defaults, `SCENE_STATE_PATHS` and the sync test.
   Key zoom-out's network scalars too (`net.show`, `net.growth`, `clock` per §2.1 and §2.10). Nothing draws them
   until Task 3. Add the five motion leaves to `sceneMotion` in `src/autoAdvance/plan.ts` (§2.11), so the new
   section's stop is checked at rest.
3. **Write `netShots.ts`** with what this task needs: `NET_SHOTS` holding at least S10′'s continuation, N1 and N2;
   `netShotKeys`; `netShotOf`; and a test pinning the N1 and N2 holds in network terms. `splineKeys` can wait for
   Task 5 unless you need it.
4. **Timing and dimming are as §2.1 and §4 give them.** The camera's zo-2 move continues into the next section's
   first move, which does not exist yet, so hold N2 at the section's end for now.
5. **Act I must stay byte-identical.** `uReflow` = 0 must be the identity on every existing frame (test 1), and the
   existing parity, purity and screenshot e2e must pass unchanged. If an existing e2e still image changes, stop and
   report why rather than re-baselining it.

**Verification:**
- `npx tsc --noEmit -p .`
- `npx vitest run`
- the full e2e suite (`npx playwright test`, as the repo's scripts run it; never `playwright install`)
- **Look at the frames, phone first.** Capture `?p=` stills at 390×844 and then 1440×900, at zoom-out local
  0, 0.1, 0.22, 0.40, 0.5 and 0.95, via a temporary Playwright script under the repo's `shots/` folder; delete the
  script afterwards. Save the PNGs to `shots/act2-reflow/`, which is gitignored if `shots/` is; check.

Look at each still yourself and say in the report what each one shows:
- does the bike visibly loosen and fall into a small stack of cubes?
- is it under the text band on the phone?
- does it blow out white?

**Commits:** in logical commits; parity means both mirrors change in one commit.

**Report** to task-2-report.md in this folder. Include what you exported, any number you changed from the design
and why, and the still paths. Return only status, commits, a one-line test summary, and concerns.
