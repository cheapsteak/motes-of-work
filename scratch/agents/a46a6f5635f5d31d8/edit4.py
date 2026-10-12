q = 'src/galaxy/generate.test.ts'
t = open(q).read()
old = """  it('a smaller budget thins the shells, never the layout', () => {
    const small = generateGalaxy(MOTE_SEED, 'desktop', 30_000);
    expect(small.motes).toBeLessThanOrEqual(30_000);
    expect(small.bodies.map((b) => [b.id, b.R, b.orbit, b.spot, b.born])).toEqual(g.bodies.map((b) => [b.id, b.R, b.orbit, b.spot, b.born]));
  });"""
new = """  it('a smaller budget thins the shells, never the layout, and the named shells last', () => {
    const layout = (x: Galaxy) => x.bodies.map((b) => [b.id, b.R, b.orbit, b.spot, b.born]);
    const mid = generateGalaxy(MOTE_SEED, 'desktop', 60_000);
    expect(mid.motes).toBeLessThanOrEqual(60_000);
    expect(layout(mid)).toEqual(layout(g));
    for (const b of mid.bodies) {
      if (b.kind === 'core' || b.kind === 'star' || b.id === HERO_PLANET) expect(b.lattice).toEqual(g.bodies[b.index].lattice);
    }
    expect(mid.bodies.some((b, i) => b.motes < g.bodies[i].motes)).toBe(true);
    const small = generateGalaxy(MOTE_SEED, 'desktop', 30_000);
    expect(small.motes).toBeLessThanOrEqual(30_000);
    expect(layout(small)).toEqual(layout(g));
  });

  it('builds every body by growth 1', () => {
    for (const b of g.bodies) expect(b.born + b.dur, b.id).toBeLessThanOrEqual(1);
  });"""
assert old in t
t = t.replace(old, new)
open(q, 'w').write(t)
