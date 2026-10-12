import os

os.chdir('.')


def rep(s, a, b):
    assert a in s, a
    return s.replace(a, b)


p = 'src/compare/controls.ts'
s = open(p).read()
s = rep(s, """  | 'mech.ghost'
  | 'mech.drive'""", """  | 'mech.ghost'
  | 'mech.ghostVariant'
  | 'mech.drive'
  | 'mech.steer'""")
s = rep(s, """  unit('mech.ghost', 'Ghost', 'Opacity of the dotted ghost of the intended machine', 'Machine'),
""", """  unit('mech.ghost', 'Ghost', 'Opacity of the dotted ghost of the intended machine', 'Machine'),
  unit('mech.ghostVariant', 'Ghost twin', 'Draw the ghost as the correct machine (0) or its wrong twin (1)', 'Machine'),
""")
s = rep(s, """    max: DRIVE_MAX,
    step: 0.001,
  },
""", """    max: DRIVE_MAX,
    step: 0.001,
  },
  {
    path: 'mech.steer',
    label: 'Steer',
    hint: 'Steering added to the drive, as a fraction of full lock (machines that steer)',
    group: 'Machine',
    min: -1,
    max: 1,
    step: 0.01,
  },
""")
s = rep(s, """    'mech.ghost': 0,
    'mech.drive': 0.15,""", """    'mech.ghost': 0,
    'mech.ghostVariant': 0,
    'mech.drive': 0.15,
    'mech.steer': 0,""")
open(p, 'w').write(s)

p = 'src/compare/controls.test.ts'
s = open(p).read()
s = rep(s, "expect(s.camera).toEqual({ pos: spec.pos, target: spec.target, fov: 35, focus: 0, coreFocus: 1 });",
        "expect(s.camera).toEqual({ pos: spec.pos, target: spec.target, fov: 35, focus: 0, coreFocus: 1, frame: 0 });")
open(p, 'w').write(s)
