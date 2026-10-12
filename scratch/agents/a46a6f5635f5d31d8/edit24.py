q = 'src/galaxy/generate.test.ts'
s = open(q).read()


def rep(a, c):
    global s
    assert a in s, a[:70]
    s = s.replace(a, c)


rep('''        expect(b.lattice).toEqual(b.id === HERO_PLANET ? [...LATTICE.hero] : planetLattice(b.R));''', '''        // The hero's is the spec's; the rest are their radius's, thinned (never thickened) to the budget.
        if (b.id === HERO_PLANET) expect(b.lattice).toEqual([...LATTICE.hero]);
        else thinned(b.lattice, planetLattice(b.R));''')
rep('''      if (b.kind === 'moon') expect(b.lattice).toEqual(moonLattice(b.R));''', '''      if (b.kind === 'moon') thinned(b.lattice, moonLattice(b.R));''')
rep('''describe('generateGalaxy', () => {''', '''/** A lattice at most its full size, never under 3 × 6. */
function thinned(lattice: readonly number[], full: readonly number[]): void {
  expect(lattice[0]).toBeLessThanOrEqual(full[0]);
  expect(lattice[1]).toBeLessThanOrEqual(full[1]);
  expect(lattice[0]).toBeGreaterThanOrEqual(Math.min(3, full[0]));
  expect(lattice[1]).toBeGreaterThanOrEqual(Math.min(6, full[1]));
}

describe('generateGalaxy', () => {''')
open(q, 'w').write(s)
