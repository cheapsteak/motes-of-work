p = '/home/user/motes-of-work/src/galaxy/generate.ts'
s = open(p).read()
a = s.index("/**\n * Sets every body's lattice, motes and person set.")
s = s[:a] + '''/**
 * Sets every body's lattice, motes and person set. At full detail if that fits the budget. Else the
 * shells the story does not name are thinned first: every planet's and moon's rows and columns but
 * the hero planet's, scaled by the largest factor that fits (never under 3 × 6), so the hero planet,
 * the core and the stars keep their lattices. Only if the thinnest of those still does not fit are
 * the named lattices scaled too. Returns the total.
 */
function fitBudget(bodies: Body[], budget: number): number {
  const base = bodies.map(baseLattice);
  const named = bodies.map((b) => b.kind === 'core' || b.kind === 'star' || b.id === HERO_PLANET);
  const scale = ([rows, cols]: [number, number], f: number): [number, number] =>
    f >= 1 ? [rows, cols] : [Math.max(3, Math.round(rows * f)), Math.max(6, Math.round(cols * f))];
  const apply = (fOther: number, fNamed: number): number => {
    let total = 0;
    bodies.forEach((b, i) => {
      b.lattice = scale(base[i], named[i] ? fNamed : fOther);
      b.motes = latticeCount(...b.lattice);
      b.personMotes = personFor(b, b.motes);
      total += b.motes + b.personMotes;
    });
    return total;
  };
  /** The largest f in [0, 1] with `fits(f)`, given `fits(0)`. */
  const largest = (fits: (f: number) => boolean): number => {
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (fits(mid)) lo = mid;
      else hi = mid;
    }
    return lo;
  };
  if (apply(1, 1) <= budget) return apply(1, 1);
  if (apply(0, 1) <= budget) return apply(largest((f) => apply(f, 1) <= budget), 1);
  return apply(0, largest((f) => apply(0, f) <= budget));
}
'''
old = '''  const births = fillerBirths(totalSlots, PLANET_LAW.exponent, 1, planets.map((d) => d.born), planetFrom, rngFor(seed, 'births', FILLER_PLANET_KEY));
  for (let i = 0; i < births.length; i++) {
    births[i] = Math.max(births[i], releases[i], i > 0 ? births[i - 1] + 1e-6 : 0);
    if (births[i] > 1) throw new Error('the filler planets cannot all be born by growth 1');
  }'''
new = '''  // Every planet is built, its moons landed, by growth 1.
  const planetsBy = 1 - DUR.planet;
  const births = fillerBirths(totalSlots, PLANET_LAW.exponent, planetsBy, planets.map((d) => d.born), planetFrom, rngFor(seed, 'births', FILLER_PLANET_KEY));
  for (let i = 0; i < births.length; i++) {
    births[i] = Math.max(births[i], releases[i], i > 0 ? births[i - 1] + 1e-6 : 0);
    if (births[i] > planetsBy) throw new Error('the filler planets cannot all be built by growth 1');
  }'''
assert old in s
s = s.replace(old, new)
open(p, 'w').write(s)

q = '/home/user/motes-of-work/src/galaxy/zz-probe.test.ts'
t = open(q).read()
t = t.replace("      const g = G.generateGalaxy(seed * 7919, 'phone', 76000);\n", "      const g = G.generateGalaxy(seed * 7919, 'phone', 76000);\n      if (Math.max(...g.bodies.map((b) => b.born + b.dur)) > 1 + 1e-12) errs.push('late');\n")
open(q, 'w').write(t)
