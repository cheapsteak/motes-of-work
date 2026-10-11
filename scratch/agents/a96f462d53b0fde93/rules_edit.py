p = '/home/user/motes-of-work/src/timeline/netShots.ts'
s = open(p).read()
old = """  /**
   * fx-1: R0's cracked cube again, a little round. Distance 12, not the design's 5.5: a fix's warm
   * motes come down from three radii above their stack, and over a rule (radius about 4.4) closer
   * than 12 they cross the text band as they land, at both sizes.
   */
  N15p: { target: crackCentre('R0'), bearing: -15, elevation: 20, distance: 12, fov: 36, frame: 1 },
  /** fx-2: R1's cracked cube, a pan along the top layer from R0. Distance 12 for the same reason. */
  N17: { target: crackCentre('R1'), bearing: -15, elevation: 20, distance: 12, fov: 36, frame: 1 },"""
new = """  /**
   * fx-1: R0's cracked cube again, a little round. Distance 10 and frame 0.5, not the design's 5.5
   * and 1: a fix's warm motes come down from three radii above their stack, and over a rule (radius
   * about 4.4) they cross the text band as they land from closer than about 9 on a desktop screen;
   * and at frame 1 the cube sits so low on a phone that the rule's body runs off the bottom. At 10,
   * framed half way, the whole rule is on a phone's screen and the warm motes land clear of the text.
   */
  N15p: { target: crackCentre('R0'), bearing: -15, elevation: 20, distance: 10, fov: 36, frame: 0.5 },
  /** fx-2: R1's cracked cube, a pan along the top layer from R0. Distance 10 and frame 0.5 for the same reasons. */
  N17: { target: crackCentre('R1'), bearing: -15, elevation: 20, distance: 10, fov: 36, frame: 0.5 },"""
assert old in s
s = s.replace(old, new)
open(p, 'w').write(s)
p = '/home/user/motes-of-work/src/timeline/keyframes.json'
s = open(p).read()
old = '{ "at": "fix@0.08", "value": 1, "ease": "inOutCubic" },\n      { "at": "fix@0.4", "value": 1 },'
assert old in s
s = s.replace(old, '{ "at": "fix@0.08", "value": 0.5, "ease": "inOutCubic" },\n      { "at": "fix@0.4", "value": 0.5 },')
open(p, 'w').write(s)
