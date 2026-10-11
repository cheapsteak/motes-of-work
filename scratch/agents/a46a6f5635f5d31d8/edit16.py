p = '/home/user/motes-of-work/src/galaxy/background.ts'
s = open(p).read()


def rep(a, b):
    global s
    assert a in s, a[:70]
    s = s.replace(a, b)


rep('''        th = ringTurn[ring] + (2 * Math.PI * (slot[i] + 0.5 + CORE_JITTER * (2 * rng() - 1))) / inRing;''', '''        // A slot that a neighbourhood star's halo covers is given up for any bearing in the ring.
        const anywhere = draws > 10 * PLACE_ATTEMPTS;
        th = ringTurn[ring] + (2 * Math.PI * (anywhere ? inRing * rng() : slot[i] + 0.5 + CORE_JITTER * (2 * rng() - 1))) / inRing;''')
open(p, 'w').write(s)
