p = '/home/user/motes-of-work/src/galaxy/background.ts'
s = open(p).read()


def rep(a, b):
    global s
    assert a in s, a[:70]
    s = s.replace(a, b)


rep('''    for (let attempt = 0; attempt < PLACE_ATTEMPTS && best < 1; ) {''', '''    for (let attempt = 0, draws = 0; attempt < PLACE_ATTEMPTS && best < 1; draws++) {
      if (draws > 100 * PLACE_ATTEMPTS) throw new Error(`no room for background star ${i}`);''')
open(p, 'w').write(s)
