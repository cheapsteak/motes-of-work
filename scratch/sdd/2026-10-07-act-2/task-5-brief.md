# Act II, Task 5: keyframes, first half (layers, far, defect)

Repo <repo>, branch main; commit there, do not push. First read global-constraints.md and
implementer-instructions.md in this folder, and the repo's CLAUDE.md. Phone first; every frame is a pure function of
scroll.

**Requirements:** docs/specs/2026-10-06-act-2-storyboard-and-network.md. Read §2 (the conventions, §2.2–§2.4, §2.10,
§2.11), §3.2 (the schedule), §3.9 (the camera rig, the generated splines), §6 tests 4, 5, 6, 8 and 9, and §11
including "As built". Build §7 task 5:

> Keyframes, first half. zoom-out through defect: `netShots.ts` with the shots and the generated dive, the network
> scalars, the twelve; tests 4, 5, 6, 8, 9 for those sections.

zoom-out is already keyed (Tasks 2 and 3), so yours are **layers, far and defect**.

**What is already there:**
- `src/timeline/netShots.ts`, with `NET_SHOTS` (N1, N2 as built), `netShotKeys` and `netShotOf`. Add `splineKeys`
  and the shots N3 onward that these three sections use.
- The six SceneState leaves. The network is drawn by `src/scene/node/`.
- The text engine, with `out=` on a beat.
- The story files `06-layers.md`, `07-far.md` and `08-defect.md`.
- `src/network/schedule.ts`, which holds the growth, highlight and fix constants that the keys must meet
  (`G_TWELVE`, `HI_TWELVE`, `FIX_TWELVE`, `CLEAN_AFTER` and others). Key against those exports. Do not copy their
  numbers.
- `e2e/clearance.spec.ts`. It is the arbiter for every shot.

**The finding you must design around** (design §11 "As built"): on a phone, any pull-back past about 8 units from
the first stack sweeps the plans (y 7) and rules (y 14) down through the text band. That holds at every elevation,
target height and bearing tried with a straight pull. So zoom-out now ends close: N2 has target N0, distance 8,
bearing 40, elevation 18.

The layers section opens by revealing the layers above. Its first move must bring the upper layers into frame
without any stack crossing the text band. Candidate paths to try:
- **Rise first.** The camera rises and pitches up before it backs off, so the upper layers enter from below the
  band.
- **Swing wide.** Swing out sideways first, so they enter from the side.
- **Bridge the cut.** Let the zoom-out → layers boundary carry a fast move under no text: the boundary fade gap,
  if any.

Clearance is measured. Use the clearance test's sampler to search candidate paths numerically before keying. In the
report, show which ones failed and by how much.

**Rulings that bind you:**
- **No highlight before the defect is found** (§11). `net.highlight` stays 0 until defect's designed key.
- **The first stack's warm speckle fades** under zoom-out's zo-2 (§11 ruling 1, not yet done).
  - If it can be done with keys alone in zoom-out, without changing the bike's look in Act I, do it, and say how.
  - Otherwise report the lever and do not change the mote shader.
- **Stops:** one per scene, at its end, at rest in the five motion leaves. Expect to add `STILL_MOVING` entries in
  `src/autoAdvance/plan.test.ts` only where the design says the motion runs on through a stop. Name each one in the
  report.

**Verification:**
- `npx tsc --noEmit -p .`
- `npx vitest run`
- the full e2e suite (`E2E_PORT=4199 npx playwright test`; never `playwright install`)

**Look, phone first:** capture stills at 390×844 and then 1440×900 at every beat's midpoint in layers, far and
defect, plus the defect's twelve (df-5's midpoint). Save them to `shots/act2-keys-1/` (gitignored); use a temporary
script under `shots/`, then delete it. In the report, say what each still shows. Check every line against the frame
it sits over: is the line true of what is on screen?

**Commits:** in logical commits.

**Report:** write task-5-report.md in this folder. Include the shots as built against the design (a table), the
failed camera paths and their numbers, the `STILL_MOVING` entries, and the still paths. Return only status,
commits, a one-line test summary, and concerns.
