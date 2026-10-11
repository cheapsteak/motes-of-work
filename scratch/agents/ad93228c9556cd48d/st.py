PATH = "/home/user/motes-of-work/src/timeline/shots.test.ts"
s = open(PATH).read()
old_a = s.index("  ['vibe-build', 0, 0.1, 'S0'")
old_b = s.index("  ['rewind', 1, 1, 'S8'")
new = """  ['vibe-build', 0, 0.046875, 'S0', 'vb-1: the spawn shell as a starfield'],
  ['vibe-build', 0.125, 0.25, 'S1', 'vb-brief: the ask, then line 1 and the core, low drive-side three-quarter'],
  ['vibe-build', 0.296875, 0.421875, 'S2', 'brief line 2: two wheels, the chain, the drive side'],
  ['vibe-build', 0.46875, 0.6328125, 'S3', 'brief line 3 and the turn: the front wheel'],
  ['vibe-build', 0.6875, 0.6875, 'S1', 'brief line 4 comes up on the whole bike'],
  ['vibe-build', 0.8046875, 0.84375, 'S1p', 'brief line 4 lights: the frame laid, leaned in'],
  ['reveal', 0, 0.175, 'S1p', 'rv-1: it runs'],
  ['reveal', 0.325, 0.325, 'S5', 'rv-2 ends on the reveal shot'],
  ['reveal', 0.375, 0.5125, 'S6', 'rv-3: the seat on the steering post'],
  ['reveal', 0.5625, 0.625, 'S7', 'rv-4: the bars at the back'],
  ['reveal', 0.675, 0.825, 'S5', 'rv-5: the whole twin'],
  ['reveal', 0.925, 1, 'S5p', 'rv-7, pushed in'],
"""
s = s[:old_a] + new + s[old_b:]
open(PATH, "w").write(s)
print("ok")
