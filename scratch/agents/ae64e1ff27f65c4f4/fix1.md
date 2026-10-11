
## Fix round 1: the zoom-out shots, retuned by the clearance test

Ruling: retune now. Commit 85b57d5, "timeline: zoom-out stays close on the first stack, clear of the text band with the network drawn".

### What changed, against the design

| Shot | Design (§2.1) | Now |
|---|---|---|
| N1 (zo-1, at 0.50) | target N0, bearing 45, elev **12**, d 9, fov 40 | target N0, bearing 45, elev **14**, d 9, fov 40 |
| N2 (zo-2, at 1.00) | target **(0, 1.5, 0)**, bearing 40, elev 18, d **26**, fov 40 | target **N0**, bearing 40, elev 18, d **9**, fov 40 |

- In keyframes.json, the zoom-out camera keys at 0.50 and 1.00 are `netShotKeyframe` of the new shots:
  - N1: pos [2.572, 0.84, 2.582], target [-0.011, -0.071, -0.001]
  - N2: pos [2.291, 1.092, 2.741], target [-0.011, -0.071, -0.001]
- The S10′ hold over 0..0.02 is untouched, so the boundary with Act I does not move. The existing test still pins it equal to spec's end.
- netShots.test.ts pins both shots' values in network terms. The HOLDS line for N2 is reworded. The existing holds and pasted-keys tests now read the new values.

### Why not the levers in the order you gave

I measured each lever with a temporary search, which I have since deleted. It used e2e/machine.ts's visible machine and the clearance spec's own panel bottoms (+8 px), and stepped 0.01 over the page's full-ink stretch on both sizes. It also recorded which stacks entered the band.

- **Lowering N2's elevation** (18 → 16, 14, 12, 10, 8, 6, with N1 at 12, 10 or 8): every combination still failed.
  - P_a, a filler plan, R_a, R0 and R_b still entered the top of the frame during the pull-back.
- **Raising N2's target** (y +0.5 to +3): failed. It tilts the view up and lets the plans in sooner.
- **Pulling out** (d 28 to 40): failed. A pull-back is exactly what sweeps the plans (y 7) and the rules (y 14) in through the top edge. Anything entering from the top crosses the band.
- **N1 alone fails at elevation 12.** The first stack's plan, P_a, is born at zoom-out 0.5. On a phone it lands in the band at 0.53 even with the camera held at N1. Elevation 13 still fails; 14 is the least that clears it.
- **No pull-back survives on a phone.** From N1, any pull-back past about 9.5 units fails, whatever the elevation (14 to 50), target height or bearing (0 to 315 tried). The portrait rig's frame is tall, and the plan layer is 18 units wide above it.
- **What passes:** looking further down from the same distance.
  - N2 at d 9, target N0, bearing 40, elevation 14 to 22: all pass.
  - I kept the design's elevation of 18 and bearing of 40, and changed only the target (to N0) and the distance (to 9).
  - zo-2's motion is now a small swing round the first stack, from bearing 45 to 40, while the view tilts from 14° to 18° down.

So the change keeps everything the design asked of zo-1. It gives up zo-2's pull-back over the bottom layer. On a phone, the network's upper layers rule that pull-back out under this clearance test. The layers section starts from N2 and is task 5's: its rise and drops will meet the same crossings.

### Stills (`shots/act2-nodes/fix1-zo-*`), phone first

- **390×844 at 0.55**: the first stack, six blue bricks, small at about 62 % of the height. One stream of dots (from its plan, out of frame above) leaves its lower left. The frame above it is dark to the text. Nothing is in the band.
- **390×844 at 0.75**: the stack dimmer (stage.motes falling). Sparse speckle of newly born bottom stacks lower left and right, and stream dots. Nothing is in the band.
- **390×844 at 1.00**: the stack dim and faint. A handful of bottom stacks as speckle round and below it. A few streams run diagonally down from upper right, with their dots between about 180 and 450 px, all under the text (the panel ends about 144 px). No stack is in the band.
- **1440×900 at 0.55 / 0.75 / 1.00**: the same story, larger.
  - At 1.00, the stack is centred low, the bottom stacks are speckle to the right and lower left, and streams come down from the upper right.
  - A few stream dots run up to the top edge beside the text column. Streams are not part of the clearance test's visible machine: it counts landed motes only.
- **Does anything enter the text band on the phone now?** No stack does. On desktop, a few dots of streams from the plans above reach the top edge to the right of the text, not over it.

### Results

- `npx tsc --noEmit -p .`: clean.
- `npx vitest run`: 65 files, 1228 tests passed.
- `E2E_PORT=4199 npx playwright test e2e/clearance.spec.ts`: 4 passed.
