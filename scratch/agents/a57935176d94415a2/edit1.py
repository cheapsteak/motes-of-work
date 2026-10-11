import os
os.chdir('/home/user/motes-of-work')
p='src/timeline/sceneState.ts'
s=open(p).read()
def rep(s, a, b):
    assert a in s, a
    return s.replace(a, b)
s=rep(s, """   * anchor is lerp(whole machine, core) by `coreFocus` (0 frames the whole machine, 1 the core).
   */
  camera: { pos: Vec3; target: Vec3; fov: number; focus: number; coreFocus: number };
  mech: {
    assembly: number; // 0 exploded → 1 assembled
    variant: number; // 0 correct → 1 wrong twin
    drive: number; // the machine's own clock
    faults: Faults;
    ghost: number; // ghost opacity
  };""","""   * anchor is lerp(whole machine, core) by `coreFocus` (0 frames the whole machine, 1 the core).
   * `frame` composes the shot round the essay's text (src/scene/cameraRig.ts): 0 a wide shot, the
   * target low-centre; 1 a close shot, the target lower (and right of the text on a wide screen).
   */
  camera: { pos: Vec3; target: Vec3; fov: number; focus: number; coreFocus: number; frame: number };
  mech: {
    assembly: number; // 0 exploded → 1 assembled
    variant: number; // 0 correct → 1 wrong twin
    drive: number; // the machine's own clock
    /** Steering added to the drive's own swing, as a fraction of full lock; the sum is clamped to ±1. */
    steer: number;
    faults: Faults;
    ghost: number; // ghost opacity
    ghostVariant: number; // the variant the ghost outline is drawn in, 0 correct → 1 wrong twin
  };""")
s=rep(s, "camera: { pos: [0, 0, 3.1], target: [0, 0, 0], fov: 40, focus: 0, coreFocus: 0 },","camera: { pos: [0, 0, 3.1], target: [0, 0, 0], fov: 40, focus: 0, coreFocus: 0, frame: 0 },")
s=rep(s, "mech: { assembly: 1, variant: 0, drive: 0, faults: { ...ZERO_FAULTS }, ghost: 0 },","mech: { assembly: 1, variant: 0, drive: 0, steer: 0, faults: { ...ZERO_FAULTS }, ghost: 0, ghostVariant: 0 },")
s=rep(s, """  'camera.coreFocus': 'number',
""","""  'camera.coreFocus': 'number',
  'camera.frame': 'number',
""")
s=rep(s, """  'mech.drive': 'number',
""","""  'mech.drive': 'number',
  'mech.steer': 'number',
""")
s=rep(s, """  'mech.ghost': 'number',
""","""  'mech.ghost': 'number',
  'mech.ghostVariant': 'number',
""")
open(p,'w').write(s)
p='src/timeline/sceneState.test.ts'
s=open(p).read()
s=rep(s, "expect(s.camera).toEqual({ pos: [0, 0, 3.1], target: [0, 0, 0], fov: 40, focus: 0, coreFocus: 0 });","expect(s.camera).toEqual({ pos: [0, 0, 3.1], target: [0, 0, 0], fov: 40, focus: 0, coreFocus: 0, frame: 0 });")
s=rep(s, "expect(s.mech).toEqual({ assembly: 1, variant: 0, drive: 0, faults: ZERO_FAULTS, ghost: 0 });","expect(s.mech).toEqual({ assembly: 1, variant: 0, drive: 0, steer: 0, faults: ZERO_FAULTS, ghost: 0, ghostVariant: 0 });")
open(p,'w').write(s)
