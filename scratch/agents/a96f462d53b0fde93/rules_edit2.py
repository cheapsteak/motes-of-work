p = 'src/timeline/netShots.ts'
s = open(p).read()
old = """  /**
   * fx-1: R0's cracked cube again, a little round. Distance 10 and frame 0.5, not the design's 5.5
   * and 1: a fix's warm motes come down from three radii above their stack, and over a rule (radius
   * about 4.4) they cross the text band as they land from closer than about 9 on a desktop screen;
   * and at frame 1 the cube sits so low on a phone that the rule's body runs off the bottom. At 10,
   * framed half way, the whole rule is on a phone's screen and the warm motes land clear of the text.
   */
  N15p: { target: crackCentre('R0'), bearing: -15, elevation: 20, distance: 10, fov: 36, frame: 0.5 },
  /** fx-2: R1's cracked cube, a pan along the top layer from R0. Distance 10 and frame 0.5 for the same reasons. */
  N17: { target: crackCentre('R1'), bearing: -15, elevation: 20, distance: 10, fov: 36, frame: 0.5 },"""
new = """  /**
   * fx-1: R0's cracked cube again, a little round. Distance 12 and frame 0.75, not the design's 5.5
   * and 1: a fix's warm motes come down from three radii above their stack, and over a rule (radius
   * about 4.4) they cross a desktop screen's text band as they land from any nearer (at 11, by 2 px;
   * at 10, by 79), at the instant they all count as landed; and at frame 1 the cube sits so low on a
   * phone that the rule's body runs off the bottom. Framed three quarters close, the whole rule is on
   * a phone's screen.
   */
  N15p: { target: crackCentre('R0'), bearing: -15, elevation: 20, distance: 12, fov: 36, frame: 0.75 },
  /** fx-2: R1's cracked cube, a pan along the top layer from R0. Distance 12 and frame 0.75 for the same reasons. */
  N17: { target: crackCentre('R1'), bearing: -15, elevation: 20, distance: 12, fov: 36, frame: 0.75 },"""
assert old in s
s = s.replace(old, new)
open(p, 'w').write(s)
p = 'src/timeline/keyframes.json'
s = open(p).read()
old = '{ "at": "fix@0.08", "value": 0.5, "ease": "inOutCubic" },\n      { "at": "fix@0.4", "value": 0.5 },'
assert old in s
s = s.replace(old, '{ "at": "fix@0.08", "value": 0.75, "ease": "inOutCubic" },\n      { "at": "fix@0.4", "value": 0.75 },')
open(p, 'w').write(s)
p = 'docs/specs/2026-10-06-act-2-storyboard-and-network.md'
s = open(p).read()
old = """- N15′ and N17: distance 10 and frame 0.5, not 5.5 and 1: nearer than about 9 the warm motes cross a
  desktop band as they land, and at frame 1 the rule's body ran off the bottom of a phone."""
new = """- N15′ and N17: distance 12 and frame 0.75, not 5.5 and 1: from any nearer the warm motes cross a
  desktop band at the instant they all count as landed (at 11 by 2 px, at 10 by 79), and at frame 1 the
  rule's body ran off the bottom of a phone."""
assert old in s
s = s.replace(old, new)
open(p, 'w').write(s)
