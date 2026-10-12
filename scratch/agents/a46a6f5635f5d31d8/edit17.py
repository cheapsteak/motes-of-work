p = 'src/galaxy/background.ts'
s = open(p).read()


def rep(a, b):
    global s
    assert a in s, a[:70]
    s = s.replace(a, b)


rep(' * nearest neighbour). These are the most that keep 95 % apart on every seed tried, at the arms\' own\n * scatter.', ' * nearest neighbour). These keep at least 95 % apart, with a margin, on every seed tried, at the arms\'\n * own scatter.')
rep('''  // Places: the core's stars first, then the arms'. A draw is drawn again if it falls in the core's
  // exclusion, or if its halo would touch another's at the galaxy wide (each halo is half its sprite:
  // two stars keep the larger sprite's width apart, so each one's halo is under half the distance to
  // its nearest neighbour). A grid of cells as wide as the largest gap keeps the check local.''', '''  // Places: the core's stars first, then the arms'. A draw in the core's exclusion, or whose halo
  // would touch a neighbourhood star's, is always drawn again. Otherwise a star takes its first draw
  // whose halo touches no other star's at the galaxy wide (each halo is half its sprite: two stars
  // keep the larger sprite's width apart, so each one's halo is under half the distance to its
  // nearest neighbour), or, after PLACE_ATTEMPTS, the roomiest of them. A grid of cells as wide as
  // the largest gap keeps the check local.''')
open(p, 'w').write(s)
