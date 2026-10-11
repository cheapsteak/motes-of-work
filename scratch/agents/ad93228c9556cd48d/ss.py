PATH = "/home/user/motes-of-work/e2e/shots.spec.ts"
s = open(PATH).read()
a = s.index("/**\n * The cold open's named frames")
b = s.index("];\n", a) + 3
new = """/**
 * The cold open's named frames (docs/specs/2026-10-05-act-1-build-and-orbit.md §6, test 16, and
 * §2.1a), section-local in vibe-build: the ask alone; each brief line just as it has come up, its
 * parts already in flight (they set out with it), and again just after it lights (keyframes.test.ts
 * pins the lighting at 0.2483, 0.3628, 0.5189 and 0.8); the front wheel at one lock; the frame as it
 * is laid; and the lap at its low pass, crane, diagram and dive.
 */
const COLD_OPEN: [name: string, local: number][] = [
  ['vb-brief-ask', 0.1484375],
  ['vb-brief-line1', 0.190625],
  ['vb-brief-line1-lit', 0.251],
  ['vb-brief-line2', 0.315625],
  ['vb-brief-line2-lit', 0.366],
  ['vb-brief-line3', 0.4875],
  ['vb-brief-line3-lit', 0.522],
  ['vb-brief-line4', 0.70625],
  ['vb-brief-line4-lit', 0.803],
  ['vb-turn-lock', 0.5625],
  ['vb-frame-knot', 0.7171875],
  ['vb-frame-mid', 0.7546875],
  ['vb-frame-stays', 0.7859375],
  ['vb-lap-low', lapLocal(LAP[1].t)],
  ['vb-lap-crane', lapLocal(LAP[2].t)],
  ['vb-lap-diagram', lapLocal(LAP[3].t)],
  ['vb-lap-dive', lapLocal(LAP[4].t)],
];
"""
s = s[:a] + new + s[b:]
open(PATH, "w").write(s)
print("ok")
