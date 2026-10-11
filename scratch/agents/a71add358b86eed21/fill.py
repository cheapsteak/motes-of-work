p = '/home/user/motes-of-work/.superpowers/sdd/2026-10-03-plan-3-bicycle/task-14-report.md'
s = open(p).read()
s = s.replace('RESULTS_PLACEHOLDER', '''- **Typecheck.** `npx tsc --noEmit -p .`: clean.
- **Unit tests.** `npx vitest run`: 52 files, 883 tests passed. The baseline was 52 files and 826
  tests.
- **Full e2e.** `E2E_PORT=4205 npx playwright test`, fresh build, on 1665537: 103 passed, 8 skipped
  (the shots), 0 failed, in 6.7 min. The baseline was 101 passed and 7 skipped. The additions are
  the absent-not-dim test at two sizes and the new named-frames shot test.
- **Screenshot run.** `SHOTS=1 E2E_PORT=4205 npx playwright test e2e/shots.spec.ts e2e/compare.spec.ts`:
  27 passed, in 6.2 min. It writes `shots/<beat>.png` and `shots/vb-*.png` (the 13 named
  cold-open frames).
- **Targeted e2e runs while iterating:**
  - `parity.spec`: 1 passed.
  - `brief.spec`, `text.spec`, `pages.spec`: 21 passed.
  - `clearance.spec`: 4 passed on the re-cut, and again with the lap.
  - `app.spec`: 16 passed.''')
s = s.replace('SHOTS_PLACEHOLDER', '''`?test=1`, a fresh page per shot, full page (text and canvas), at 1440x900 (`desktop-`) and 390x844
(`portrait-`). They are in `/home/user/motes-of-work/shots/task14/`, made by
`.superpowers/sdd/2026-10-03-plan-3-bicycle/task14-at.mjs` with a preview server on 4205 (since
stopped). Local values are vibe-build's.

- **The brief, each line just after it appears (`*-up`) and mid-build (`*-build`).**
  - `ask` (0.2): only the ask is on the page, over the starfield.
  - `line1-up` (0.23): the ask and line 1 (dim ink), and nothing else. The shell is still loose.
    `line1-build` (0.3125): saddle, bars and pedals in flight, under the text.
  - `line2-up` (0.38): line 1 lit; line 2 is up, dim; lines 3 and 4 absent. The core is still on
    its own.
    `line2-build` (0.44): the drive side close up, both wheels converging, the cranks and pedals.
  - `line3-up` (0.5425): lines 1 and 2 lit, line 3 up and unmet. The wheels and chain are on, the
    fork not yet.
    `line3-build` (0.59): the fork with its basket and headlamp flying in at the front.
  - `line4-up` (0.73): lines 1 to 3 lit, line 4 up, dim. The bike stands without a frame: wheels,
    fork, basket and the saddle on its mast.
    `line4-build` (0.80): the frame laying.
  - In every one, no line is visible before its turn, and the parts fly in only after the line is
    up.
- **The turn.** `turn-lock-a` (0.64375) and `turn-lock-b` (0.68125): the front wheel, basket and
  the saddle on the mast are turned to one lock, then to the other. Nothing else differs between
  the two.
- **The frame laid.**
  - `frame-1` (0.79, assembly 0.82): the down tube and head tube stand alone in the cloud. There is
    no stub under the bars, no top tube and no stays.
  - `frame-2` (0.805, 0.86): the stub is in, faintly brighter. A haze of motes converges from the
    bars to the mast where the twin's top tube is being laid.
  - `frame-3` (0.82, 0.90): the main triangle is closed and the chainstays are on.
  - `frame-4` (0.835, 0.94): the stays are done; the mudguards, rack and ground strip arrive from
    below.
  - Zoom crops of the frames are `zoom-frame-{1,2,3}.png`.
  - The order is unmistakable. The flare itself is only faintly visible (Concerns 5).
- **The lap.** `lap-1` .. `lap-8` at t 0.09, 0.18 (W1), 0.28, 0.38 (W2), 0.55 (W3), 0.65, 0.74
  (W4), 0.90 (W5):
  - **The low pass:** square to the drive side, the ground strip edge-on.
  - **The crane:** above and behind; the bars nearest and the saddle far over the basket. Small on
    screen.
  - **The diagram:** high on the far side, flattened.
  - **The approach to the dive:** a big three-quarter from the front-left.
  - **The dive:** close on the saddle on its mast, low-right under the text, the front wheel under
    it, cropped by the bottom edge.
  - **W5:** the whole bike from the front-left, coming round.
  - On the phone the same shots are smaller, and the text is always clear.
- **The hand-over.** `reveal-start` (reveal 0.02): S1', identical framing to the lap's end, with
  rv-1's line.''')
open(p, 'w').write(s)
