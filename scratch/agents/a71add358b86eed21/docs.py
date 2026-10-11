p = '/home/user/motes-of-work/docs/specs/2026-10-05-act-1-build-and-orbit.md'
s = open(p).read()
s = s.rstrip('\n') + '''

## 7. As built (2026-10-05)

Everything above is built as written, except for these differences, each made where a number did
not hold or a test could not be met as worded:

- **The drive's window is [0.54, 0.60], not [0.53, 0.60]**, and the loose bolts' [0.54, 0.59]. §2.2's
  arithmetic was off by one step: a stage sets out at `from − SETTLE_WINDOW`, so at 0.53 the drive
  sets out at 0.45, before the spec section's hold at 0.46, and blue motes would leave the shell
  while sp-6 says only the gold lands (the keyframes test "nothing of its body" fails). At 0.54 it
  sets out exactly at 0.46, as the old windows did. Line 2 still lights at 0.60.
- **Test 1 reads "disjoint in list order" for core, drive, fork and frame.** The fittings cannot be
  disjoint from the frame as §3.6 designs them (they set out at 0.86, while the seat tube is laid):
  the test holds them to setting out after the frame starts and landing after it ends.
- **The ordering fence's "parts of a line"** are the parts it names that are not already in place
  when the line before it lights (line 2 names the pedals, which land with line 1; line 3 names the
  front wheel, which lands with line 2). And `local(a)` is the first local at which assembly passes
  `a`, strictly: a stage held exactly at a set-out value (0.61, 0.73) has not yet set out.
- **The frame's settle field** picks the tube whose surface is nearest (distance to the run less its
  radius), not the nearest axis: the rear cable runs along the top tube 0.024 m off its axis, nearer
  than the top tube's own axis to the top tube's skin on that side.
- **Line 1 is 14 words, not 15** (§1 corrected; the 96-word total was right).
- **The lap's crane and diagram are further out**: W2 5.2 m at fov 38 (was 3.8 m at 34) and W3 6.3
  m at fov 30 (was 4.6 m). At the starting values the twin's top stood at 32 % of a wide screen
  between them, in the text band. The dolly-zoom is kept: W3 is further and longer-lensed than W2,
  and the bike about the same size. The dive's lens shift (`camera.frame`) starts at W3 (0.94375),
  not 0.95, so the bike is already moving down as the camera drops toward the saddle.
- **The lap keys** are the 36 uniform ones plus one at each inner waypoint (41), so every waypoint is
  a key and reads back to the shot test's tolerances; between keys a 10-15 degree chord would miss
  W1..W5 by 4 cm. The spline's knots are centripetal in the camera's own path (bike metres),
  reached at `inOutCubic(t_i)`, so the camera is at waypoint i at its own `t`.
- **The global constraint "mote.glsl and mote.ts are not changed"** gave way to this design's §3.7,
  which the author approved; both mirrors change together and the parity e2e passes (and fails when
  the two flare gains differ).
'''
open(p, 'w').write(s)

p = '/home/user/motes-of-work/docs/specs/2026-10-04-act-1-storyboard-and-text-engine.md'
s = open(p).read()
old = "- The steer swings ease in and out (`inOutQuad`); every other key is as §2.1–§2.4 give it.\n"
assert old in s
s = s.replace(old, old + """- **Round 2a (2026-10-05).** The cold open was re-cut by docs/specs/2026-10-05-act-1-build-and-
  orbit.md: four brief lines, each absent until its own `data-at`, the words before the parts, the
  front wheel's turn as its own segment, the frame laid tube by tube with a landing flare, and vb-4
  as one lap of the camera round the riding bike. §2.1 and §2.5 above are that build; S4 is retired.
  Where it differs from its own design, that document's §7 says so.
""")
open(p, 'w').write(s)
