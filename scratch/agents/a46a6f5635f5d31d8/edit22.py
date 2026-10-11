g = '/home/user/motes-of-work/src/galaxy/generate.ts'
s = open(g).read()


def rep(a, c):
    global s
    assert a in s, a[:70]
    s = s.replace(a, c)


rep('''  /** Systems of only the story's planets laid out below the band (toward circles). */
  systemsFlattened: number;''', '''  /** Systems of only the story's planets laid out below the band (toward circles). */
  systemsFlattened: number;
  /** Their stars' ids. */
  flattened: string[];''')
rep('''  counts.systemsFlattened++;''', '''  counts.systemsFlattened++;
  counts.flattened.push(star.id);''')
rep('''const fit: FitCounts = { systemsEased: 0, slotsDropped: 0, systemsFlattened: 0, moonsDropped: 0 };''', '''const fit: FitCounts = { systemsEased: 0, slotsDropped: 0, systemsFlattened: 0, flattened: [], moonsDropped: 0 };''')
open(g, 'w').write(s)

l = '/home/user/motes-of-work/src/galaxy/lineage.ts'
t = open(l).read()
old = "  // A copy of C3 on P3's system; its stream runs in to the core, where it writes R1.\n  planet({ id: 'C7', parents: ['C3'], born: 0.3, hiAt: 0.19, fixAt: 0.895 }),"
assert old in t
t = t.replace(old, "  // A copy of C3 on P3's system; its stream runs in to the core, where it writes R1. Born 0.327,\n  // not the stacks network's 0.3: a planet is built once its star is (P3, born 0.31, is half built\n  // at 0.325), and N0 is the only piece there before its plan.\n  planet({ id: 'C7', parents: ['C3'], born: 0.327, hiAt: 0.19, fixAt: 0.895 }),")
open(l, 'w').write(t)
