import os

os.chdir('/home/user/motes-of-work')


def rep(p, old, new, count=1):
    s = open(p).read()
    assert s.count(old) == count, (p, s.count(old), old[:70])
    open(p, 'w').write(s.replace(old, new))


T = 'src/timeline/shots.test.ts'
rep(T, """  ['vibe-build', 0, 0.046875, 'S0', 'vb-1: the spawn shell as a starfield'],
  ['vibe-build', 0.125, 0.25, 'S1', 'vb-brief: the ask, then line 1 and the core, low drive-side three-quarter'],
  ['vibe-build', 0.296875, 0.421875, 'S2', 'brief line 2: two wheels, the chain, the drive side'],
  ['vibe-build', 0.46875, 0.6328125, 'S3', 'brief line 3 and the turn: the front wheel'],
  ['vibe-build', 0.6875, 0.6875, 'S1', 'brief line 4 comes up on the whole bike'],
  ['vibe-build', 0.8046875, 0.84375, 'S1p', 'brief line 4 lights: the frame laid, leaned in'],""",
    """  ['vibe-build', 0, 0.04166667, 'S0', 'vb-1: the spawn shell as a starfield'],
  ['vibe-build', 0.11111111, 0.22222222, 'S1', 'vb-brief: the ask, then line 1 and the core, low drive-side three-quarter'],
  ['vibe-build', 0.26388889, 0.375, 'S2', 'brief line 2: two wheels, the chain, the drive side'],
  ['vibe-build', 0.41666667, 0.68055556, 'S3', 'brief line 3, the turn and line 4: the front wheel, then the basket dropped onto it'],
  ['vibe-build', 0.72222222, 0.72222222, 'S1', 'brief line 5 comes up on the whole bike'],
  ['vibe-build', 0.82638889, 0.86111111, 'S1p', 'brief lines 5 and 6 light: the frame laid and the mudguards on, leaned in'],""")
rep(T, """  it.each(LAP.map((w, i) => [`W${i}`, w] as const))('passes through %s at its local', (name, w) => {
    const got = shotOf(lapCamera(lapLocal(w.t)), anchors);""", """  it.each(LAP.map((w, i) => [`W${i}`, w] as const))('passes through %s at its local', (name, w) => {
    // At its key's local, as orbitKeys() rounds it (to 8 places).
    const got = shotOf(lapCamera(Math.round(lapLocal(w.t) * 1e8) / 1e8), anchors);""")
print('ok')
