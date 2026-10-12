p = 'src/timeline/netShots.ts'
s = open(p).read()
old = """   * zo-1: the first stack small and low under the text, the dark round it. Elevation 14, not the
   * design's 12: at 12 the first stack's plan, born above it at zoom-out 0.5, shows inside the text
   * band on a phone (the clearance test).
   */"""
new = """   * zo-1: the first stack small and low under the text, the dark round it. Elevation 14 and
   * distance 8, not the design's 12 and 9: otherwise the first stack's plan, born above it at
   * zoom-out 0.5, shows at the top of a phone's frame, inside the text band (the clearance test,
   * which counts the corners of every landed cube).
   */"""
assert old in s
s = s.replace(old, new)
old2 = """   * zo-2: the camera swings a little round the first stack and looks further down on it as the first
   * stacks are born round it. Not the design's pull-back to (0, 1.5, 0) at 26: once the network is
   * drawn, any pull-back from N1 brings the plans (y 7) and the rules (y 14) in through the top of the
   * frame, across the text band, on a phone from 9.5 units out (the clearance test). Lowering the
   * elevation or raising the target only lets them in sooner; looking further down at the same
   * distance keeps them above the frame.
   */"""
new2 = """   * zo-2: the camera swings a little round the first stack and looks further down on it as the first
   * stacks are born round it. Not the design's pull-back to (0, 1.5, 0) at 26: once the network is
   * drawn, any pull-back from N1 brings the plans (y 7) and the rules (y 14) in through the top of the
   * frame, across the text band, on a phone (the clearance test). Lowering the elevation or raising
   * the target only lets them in sooner; looking further down from the same distance keeps them
   * above the frame.
   */"""
assert old2 in s
s = s.replace(old2, new2)
open(p, 'w').write(s)
