q = '/home/user/motes-of-work/src/galaxy/generate.test.ts'
s = open(q).read()


def rep(a, c):
    global s
    assert a in s, a[:70]
    s = s.replace(a, c)


rep('''  it('fits the budget', () => {
    expect(g.motes).toBeLessThanOrEqual(galaxyBudget(MOTE_BUDGET_DESKTOP));
    expect(g.motes).toBe(g.bodies.reduce((s, b) => s + b.motes + b.personMotes, 0));
    expect(galaxyBudget(MOTE_BUDGET_DESKTOP)).toBe(76_000);
    // At the desktop budget no shell is thinned: every lattice is the spec's.
    expect(byId(g, 'C1').motes).toBe(6116);
    for (const b of g.bodies) expect(b.personMotes > 0).toBe(b.cracked);
  });''', '''  it('fits everything it draws in the budget', () => {
    expect(galaxyBudget(MOTE_BUDGET_DESKTOP)).toBe(76_000);
    for (const [x, budget] of [
      [g, galaxyBudget(MOTE_BUDGET_DESKTOP)],
      ...Array.from({ length: 20 }, (_, i) => [generateGalaxy(i + 1, 'phone', galaxyBudget(MOTE_BUDGET_DESKTOP)), galaxyBudget(MOTE_BUDGET_DESKTOP)] as const),
    ] as const) {
      const sum = drawnInstances(x);
      expect(sum, `seed ${x.seed}`).toBeLessThanOrEqual(budget);
      expect(x.motes).toBe(sum);
      expect(x.instances.total).toBe(sum);
    }
    // The named shells keep their lattices on the story's seed: the filler's give way first.
    expect(byId(g, 'C1').motes).toBe(6116);
    for (const b of g.bodies) if (b.kind === 'core' || b.kind === 'star') expect(b.lattice).toEqual(b.kind === 'core' ? [...LATTICE.core] : [...LATTICE.star]);
    for (const b of g.bodies) expect(b.personMotes > 0).toBe(b.cracked);
  });''')
rep('''describe('generateGalaxy', () => {''', '''/**
 * Every instance the renderer will draw for a galaxy (plan Task 5's budget test): shells and person
 * sets; 90 dots per planet orbit and 40 per moon track (a track's moons share it); one body per body
 * and a ghost per planet or moon that carries the defect; a glow per star and core body; and each
 * stream's dots, one per 1.2 units of its longest chord between 6 and 40, plus the feed's 40.
 */
function drawnInstances(x: Galaxy): number {
  const planets = kinds(x, 'planet');
  const tracks = planets.reduce((n, p) => n + 90 + 40 * new Set(moonsOf(x, p.id).map((m) => m.orbit!.r)).size, 0);
  const ghosts = x.bodies.filter((b) => b.cracked && (b.kind === 'planet' || b.kind === 'moon')).length;
  const glow = kinds(x, 'star').length + kinds(x, 'core').length;
  const centre = (b: Body): readonly number[] => (b.kind === 'planet' ? x.bodies[b.host].spot! : b.kind === 'moon' ? x.bodies[x.bodies[b.host].host].spot! : b.spot!);
  const reach = (b: Body): number => (b.kind === 'planet' ? b.orbit!.r : b.kind === 'moon' ? x.bodies[b.host].orbit!.r + b.orbit!.r : 0);
  const dots = x.streams.reduce((n, s) => {
    const [a, b] = [x.bodies[s.from], x.bodies[s.to]];
    return n + Math.min(40, Math.max(6, Math.round((dist(centre(a), centre(b)) + reach(a) + reach(b)) / 1.2)));
  }, 40);
  const shells = x.bodies.reduce((n, b) => n + b.motes + b.personMotes, 0);
  return shells + tracks + x.bodies.length + ghosts + glow + dots;
}

describe('generateGalaxy', () => {''')
rep('''        if (!p.scripted) expect(p.born).toBeGreaterThanOrEqual(s.born + 0.5 * s.dur - 1e-12);''', '''        // Every planet is born once its star is half built, but N0, there before its plan.
        if (p.id !== 'N0') expect(p.born, p.id).toBeGreaterThanOrEqual(s.born + 0.5 * s.dur - 1e-12);''')
rep('''  it("lands every moon in the last 30 % of its planet's build", () => {''', '''  it("keeps every planet's eccentricity in its band but in a flattened system", () => {
    // §12.1's 0.05-0.22; only a system of the story's planets that cannot fit otherwise (P5's nine) falls below it.
    expect(g.fit.flattened).toContain('P5');
    for (const p of kinds(g, 'planet')) {
      if (g.fit.flattened.includes(g.bodies[p.host].id)) {
        expect(p.orbit!.e).toBeLessThanOrEqual(0.22);
        continue;
      }
      expect(p.orbit!.e, p.id).toBeGreaterThanOrEqual(0.05 - 1e-12);
      expect(p.orbit!.e, p.id).toBeLessThanOrEqual(0.22);
    }
    for (const m of kinds(g, 'moon')) {
      expect(m.orbit!.e).toBeGreaterThanOrEqual(0.05);
      expect(m.orbit!.e).toBeLessThanOrEqual(0.12);
    }
  });

  it("lands every moon in the last 30 % of its planet's build", () => {''')
open(q, 'w').write(s)
