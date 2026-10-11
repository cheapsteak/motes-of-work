p = '/home/user/motes-of-work/src/galaxy/background.ts'
s = open(p).read()


def rep(a, b):
    global s
    assert a in s, a[:70]
    s = s.replace(a, b)


rep('''  for (const s of hood) settle(s, HALO_PX.hood);''', '''  // A neighbourhood star's halo is never touched: a draw too near one is always drawn again.
  const nearHood = (p: readonly number[], px: number): boolean =>
    hood.some((s) => Math.hypot(p[0] - s[0], p[2] - s[2]) < gap(px, HALO_PX.hood));''')
rep('''      if (Math.hypot(c[0], c[1], c[2]) < BG.coreExclusion) continue;''', '''      if (Math.hypot(c[0], c[1], c[2]) < BG.coreExclusion || nearHood(c, px)) continue;''')
open(p, 'w').write(s)
