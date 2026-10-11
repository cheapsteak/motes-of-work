# ly-5's opening: A (today) vs B (aimed) vs B2 (two-shot)

All three are built from main at 1170eb8, in the throwaway worktree `scratchpad/ly5cmp`. Nothing is committed.
Each variant had its own fresh `vite build` and was served alone on :4198 (`vite preview --strictPort`).
Each server was stopped by its PID before the next started.

Screens are "layers N": N screens into layers (`layersAt`).
- ly-4's page fades out over 3.5–3.6.
- ly-5's page fades in over 3.6–3.7.
- So in every variant no text is on screen around 3.6 (the 3.62 frames show none).

## Files

| file | what |
|---|---|
| `ly5-compare-390x844.png`, `ly5-compare-1440x900.png` | Strips: A on top, then B, then B2. Frames at 3.42, 3.48, 3.52, 3.55, 3.58, 3.62 and 3.70. Each is the whole viewport with the text showing, `?test=1`, ambient at the pose. |
| `ly5-A.webm`, `ly5-B.webm`, `ly5-B2.webm` | Phone, 390×844. A scroll from 3.35 to 3.75 over 4 s, with 0.5 s held at each end. The layers place is burnt in at bottom left. |
| `ly5-side-by-side.webm` | The three videos side by side: A, then B, then B2. |
| `ly5-B.patch`, `ly5-B2.patch` | The source change and the pasted keys for each variant, against 1170eb8. |

**How the video was made.**
- Playwright's `recordVideo` works headless. But under swiftshader the page drew only about 15 frames during a real 4 s scroll, so that recording is a slideshow.
- Instead, each video is 97 evenly spaced scroll positions, each settled and screenshotted, then encoded at 24 fps. The motion is the essay's, sampled evenly in scroll.

## A: today

- ly-5's move runs 3.5 → 3.7. It ends nearer than it starts (66 → 32 on a phone), so it pans first: an inOutCubic over 3.50–3.62. It closes in over 3.58–3.70.
- The lamp steps from Star on star-4 to Star on P_a at 3.5.
- **Phone:** at 3.5, P_a is about 650 px left of star-4 (x ≈ −458). The pan's ease-in leaves P_a off screen until about 3.57. Meanwhile star-4 is dark, because the lamp has already left it. So there are about 0.07 screens of empty sky, about 60 px of scroll. The 3.52 and 3.55 frames show it.
- **Desktop:** P_a is already in the frame at 3.5 (x ≈ 68), so there is no gap.

## Why no variant can have P_a in frame at 3.5 itself on a phone

- The hold keeps the camera on star-4 at 66, so that planet-10 is at least 4 px across.
- At that stand-off P_a is about 650 px from star-4 on a 390 px wide screen.
- Pulling back far enough to fit both (about 170 and up) shrinks planet-10 to under 2 px.
- So "aimed when ly-5 opens" can only mean "aimed within a few px of scroll after the hold ends", unless the hold itself changes.

## B: aimed (quick swing). Least change.

What changes, in `netShots.ts` (+16 −6 lines) and the pasted keys (keyframes.json +349 −169 lines):
- **A new optional field, `Move.pan`.** It is the share of the move a pans-first move pans over; MOVE_LEAD (0.6) otherwise.
  - ly-5 gets `pan: 0.15`, so the swing to P_a runs 3.50–3.53.
  - The close-in is unchanged (3.58–3.70).
  - So the camera swings, rests on P_a at ly-5's angle for 3.53–3.58, then pushes in as before.
- **Its keys.** `actTwoKeyPlaces` gives a move with a `pan` its usual n keys over the swing and n more over the rest. Without them the swing would be sampled by only 2 or 3 keys.
- **ly-5's lamp step**, 3.5 → 3.515: mid-swing, where the tracked mix is 0.5.
  - star-4 stays lit as it slides out.
  - P_a is lit as it slides in.
  - No frame shows a lit body off screen and nothing lit on screen.
- **Phone:** P_a is in frame from about 3.518 and centred by 3.53. The 3.52 frame already shows P_a's system.
- **Cost:** the swing takes 0.03 screens, about 25 px of scroll on a phone. A fast flick reads it as a near-cut. The lamp step clears the band by at least 110 px at the pose.

## B2: two-shot (code and plan together)

What changes, in `netShots.ts` (+19 −2 lines), the pasted keys (keyframes.json +679 −218 lines), and one test line:
- **A new shot, `LY5_WIDE`.**
  - On P_a, bearing −30, elevation 66, distance 180, frame 0.6. On a landscape screen: distance 260, frame 0.8.
  - Lamp Arms, so both systems are lit.
- **A new move, `ly-5 wide`, over 3.50–3.56.** It is made as one motion (`motion: 'ride'`): the pull back and the swing together.
  - So star-4 never leaves a phone's frame: its x runs 195 → 377 → 313.
  - The lamp steps Star(star-4) → Arms at layers local 0.819 (3.522). That is the first thousandth from which Arms clears the band.
- **The two-shot holds over 3.56–3.60:**
  - Phone: P_a at (195, 594), r 34; star-4 up and right at (313, 413), r 30.
  - Desktop: P_a at (950, 680); star-4 at (1118, 422).
- **Then `ly-5` moves from the two-shot into ly-5's close over 3.60–3.70**, as ly-5's line comes up. The lamp narrows to Star on P_a at 3.605.
- **Phone:** P_a enters about 3.53 and is whole by about 3.54. Some lit body is in frame on every frame.
- **Band, in the two-shot:** +35 px on a phone, +15 px on a desktop. The desktop's is the tightest margin in any variant.
- **The lamp level comes back.**
  - Fix round 1's sequence was Arms → Star(star-4) → Star(P_a), with "no level comes back".
  - B2 makes it Arms → Star(star-4) → Arms → Star(P_a).
  - The arm's other built systems light again from 3.522 to 3.605. Whether that reads as "the arm" or as a flash is a look call.
- **The push-in from 180 to 32 now fits in 0.1 screens**, against 0.2 in A, so it is quicker.
- **How it reads (the 3.55 and 3.58 frames, on both screens): weaker than the numbers suggest.**
  - At 180 under Arms, every built system in view lights. That is about six stars on a phone.
  - P_a and star-4 are two of those stars, with no orbit rings, and planet-10 is too small to see.
  - So the frame says "the arm's stars", not "this code beside its plan".
  - This is the phone's width at work. Any stand-off that fits both systems on 390 px is one at which neither system's planets read.
  - Lighting the two systems alone would need a lamp that does not exist (Star lights one system).
  - Keeping Star on star-4 through the widening would show star-4's rings but leave P_a dark.

## Tests (`netShots.test.ts` + `networkKeys.test.ts`, in the worktree)

| | A (HEAD) | B | B2 |
|---|---|---|---|
| ly-4's hold test (planet-10 at least half landed, at least 4 px, in frame, under the band, lamp on star-4, 3.4 → 3.5, both sizes, every AMBIENT_GRID pose) | pass | **pass** | **pass** (see note) |
| Keyed band, every sample of layers and far | pass | pass | pass |
| Regenerated keys = keyframes.json | pass | pass | pass |
| Whole run | 138/138 (re-run here on an export of 1170eb8) | **138/138** | **135/138** |

**Note on B2's hold test.**
- The test took the hold's end from the move named `ly-5`. B2 moves that move to 3.6, which would have stretched the test window to 3.4–3.6.
- In the worktree I changed the test to take the end from the move after the push-in.
- It is the same 3.5 in A and B, so the test still checks exactly 3.4–3.5.

**B2's three failures are fences that list the moves, not frame results:**
1. "times every move on a page turn": it expects 8 moves on page turns, but B2 has 7. ly-5's move now starts at 3.6 rather than on the turn at 3.5.
2. "holds each shot at every sample of its hold": its shot table has no `ly-5 wide`, so it throws (`undefined.distance`).
3. "the moves made as one motion": a `ride` must keep its distance, and B2's widening does not. It would need its own mark, or to be modelled as a pull plus a pan.

B2 would need those three fences updated before it could be shipped. B needs none.

## Band and frame issues seen

- **A, phone:** the gap described above (3.50–3.57). No band issue.
- **B, phone:** none. **B, desktop:** P_a is in frame throughout, as in A. Over the swing the band margin is at least 94 px on both screens.
- **B2, desktop:** the two-shot sits low and right (P_a at x ≈ 950). Its band margin is 15 px, the least of any variant.
- **B2, phone:** star-4 sits within 47 px of the right edge in the two-shot. Both systems are whole, but they read as bare stars (above).
- **All variants:** about 3.6 shows no text, being the gap between ly-4's page fading out and ly-5's fading in. This is unchanged from HEAD.

## The worktree as left

`scratchpad/ly5cmp` is detached at 1170eb8 and nothing is committed. Its checkout holds **B2**: `netShots.ts`, `keyframes.json` and one line of `netShots.test.ts`.

It also holds four untracked probe files in `src/timeline/`:
- `zzpaste.test.ts` regenerates `actTwoKeys` and pastes the keys into `keyframes.json`. At HEAD it reproduces the file byte for byte.
- `zzprobe.test.ts` gives P_a's and star-4's screen positions and the band margin at chosen layers places.
- `zzscan*.test.ts` scan candidate two-shot framings.

To switch the checkout to a variant: `git checkout 1170eb8 -- src/timeline`, then `git apply ../ly5cmp-out/ly5-B.patch` (or `ly5-B2.patch`).
