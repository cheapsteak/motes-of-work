
## Fix round 1

Review: task-7-review.md. Ruling: test 11 on the stack's rectangle with a minimum area; the warm exclusion only
as a documented, tight carve-out, both counts reported; far ≤ 20 on the carved count; correct the "stricter"
claim; add the near half at tr-2's close shot on R0; take the one-line Minors.

### Important: test 11 (taken)

- **The stack's rectangle**, as §6 says, for both halves (`stackRect`: every box corner of the stack through
  the essay's composed camera, floor/ceil, clipped to the canvas).
- **The far half cannot be vacuous:** the rectangle must be at least 100 px of the PNG and the cracked frame must
  draw at least 20 px inside it. At fr-1: C1 120 px phone / 408 desktop (112 / 303 drawn), R0 1,610 / 6,392
  (615 / 1,399 drawn).
- **The carve-out, tight and documented** (`changes()` in e2e/network.spec.ts, and the design's "Tests as built"):
  a changed pixel is left out only if its change has amber's channel order: red rising, and red's rise at least
  green's, green's at least blue's. The person's motes are amber (#FFB347), not ember; they are screen-blended
  over the stack, which can only raise each channel, red most and blue least, so this is exactly "the fix's warm
  motes arriving" and nothing else. I did not use "similar luminance": screen-blended light always raises
  luminance, so that clause would carve out nothing. An agent-blue mote moving in (blue rises most), one moving
  out (every channel falls) and the lips' brighter faces going ordinary (every channel falls) all count. I dumped
  every changed far pixel before choosing it: R0's far changes are almost all amber-ordered rises; the rest are
  blue moves.
- **Both counts in every assertion's message:** "N changed without the warm dusting, M with it, D drawn of A px".
- **Near shots now:** C1 at df-1 (defect 0.12); R0 at **tr-2's close shot**, computed in the test as the middle of
  the N15 hold (from the climb's end to the fan-out's start, `NET_MOVES`) while tr-2 is fully up (its `data-at`
  plus the fade, read from the page): trace 0.4747; R0 at its fix close-up (the middle of the N15′ hold, fix 0.12);
  R1 at its fix close-up (the middle of the N17 hold, fix 0.33). Far: C1 and R0 at fr-1 (R1 is not born there).
  A note: trace 0.45 (the old sample) was already under tr-2, whose page is up from 0.36; the review read it as
  tr-1's. The test now derives the time from the page and the moves.
- **Counts** (carved / all; limits: near ≥ 400 phone, ≥ 900 desktop on the carved count; far ≤ 20 on the carved count):

| Stack, shot | Phone | Desktop |
|---|---|---|
| C1 near, defect 0.12 | 7,290 / 8,713 | 12,915 / 15,179 |
| R0 near, tr-2's close shot (trace 0.4747) | 13,030 / 15,125 | 24,159 / 28,033 |
| R0 near, fix close-up (fix 0.12) | 3,405 / 4,446 | 12,780 / 14,841 |
| R1 near, fix close-up (fix 0.33) | 3,114 / 4,327 | 9,063 / 11,846 |
| C1 far, fr-1 | 0 / 0 | 0 / 0 |
| R0 far, fr-1 | **3** / 32 | **19** / 74 |

The honest measure passes, so nothing was tuned. R0's far count on desktop is 19 against 20: a renderer or look
change to R0 will trip it, which is the point of it. If you want margin, the lever is the crack's far
visibility (the lips' ×1.3 face gain could fade with the stack's size on screen), not the test.

- **"Stricter" corrected** in the design's "Tests as built" note and above in this report.

### Minors

| # | Minor | Taken? |
|---|---|---|
| 1 | Wide predicate leaves out N18 and N20 | **Taken:** `wide()` also matches N18's and N20's targets (`WIDE_TARGETS`). Both pass. |
| 2 | Fix-onset test does not check which fixes it covered | **Taken:** it asserts C1's, R0's and R1's fixes are among those checked. |
| 3 | Test 12 counts shapes but does not match them to the twelve | **Left** (not a one-liner); the tightness (36 px against 30) is now noted in the design's "Tests as built". |
| 4 | Test 11's R0 shot undocumented | **Taken** with the Important fix (above, and the design note). |
| 5 | Parity reference does not round `share` to float32 | **Taken:** `share: f32(a.share)` in parity.ts. |
| 6 | The design's moved-shots list omits `pullOut` | **Taken:** added under N9. |
| 7 | e648dca holds shots a later test fails | **Left:** rewriting local history is not mine to do without a ruling; c95ef24 fixes the state. |

### Results

- `npx tsc --noEmit -p .`: clean.
- `npx vitest run`: 67 files, 1,523 passed.
- Full e2e (dist rebuilt, `E2E_PORT=4199 npx playwright test`): RESULT_LINE

Commit: COMMIT_LINE
