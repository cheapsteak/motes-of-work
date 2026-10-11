p = '/home/user/motes-of-work/src/galaxy/generate.test.ts'
s = open(p).read()


def rep(a, b):
    global s
    assert a in s, a[:70]
    s = s.replace(a, b)


rep('''    expect(moons.map((m) => m.orbit!.r / 0.3)).toEqual([0, 0, 0, 1, 1, 2, 2].map((t) => expect.closeTo(MOON_TRACK[t], 12)));''', '''    // On three tracks, 3 / 2 / 2, each at least its designed radius (further out where a wheel needs the room).
    const tracks = [0, 0, 0, 1, 1, 2, 2];
    moons.forEach((m, i) => {
      expect(m.orbit!.r).toBeGreaterThanOrEqual(MOON_TRACK[tracks[i]] * 0.3 - 1e-12);
      expect(m.orbit!.r).toBe(moons[tracks.indexOf(tracks[i])].orbit!.r);
    });
    expect(new Set(moons.map((m) => m.orbit!.r)).size).toBe(3);''')
rep('''        for (let t = 0; t < 3; t++) {
          const on = moons.filter((m) => Math.abs(m.orbit!.r - MOON_TRACK[t] * b.R) < 1e-9);
          const phases = on.map((m) => m.orbit!.phase).sort((x, y) => x - y);
          for (let k = 1; k < phases.length; k++) expect(phases[k] - phases[k - 1]).toBeCloseTo(1 / phases.length, 9);
        }''', '''        for (const r of new Set(moons.map((m) => m.orbit!.r))) {
          // A track's moons share its ellipse, and keep their phases evenly apart round it.
          const on = moons.filter((m) => m.orbit!.r === r);
          for (const m of on) expect({ ...m.orbit!, phase: 0 }).toEqual({ ...on[0].orbit!, phase: 0 });
          const phases = on.map((m) => m.orbit!.phase).sort((x, y) => x - y);
          for (let k = 1; k < phases.length; k++) expect(phases[k] - phases[k - 1]).toBeCloseTo(1 / phases.length, 9);
        }''')
rep('''  it("lands every moon in the last 30 % of its planet's build", () => {''', '''  it('keeps every piece clear of its neighbours at any precession or tilt, over many seeds', () => {
    // Fix ruling 2. Neighbouring planets i < j: a_j(1 − e_j) − a_i(1 + e_i) ≥ R_i + R_j + max(ms_i, ms_j) + 0.15,
    // and the pieces (planet or moon system, whichever reaches further) clear each other by 0.15 too;
    // the first piece clears the star. Neighbouring tracks round a planet, and the first track and the
    // planet, clear each other by their largest moons plus 0.05 R.
    const check = (x: Galaxy): void => {
      for (const star of x.systems) {
        const planets = planetsOf(x, star).sort((p, q) => p.orbit!.r - q.orbit!.r);
        const ms = (p: Body): number => Math.max(0, ...moonsOf(x, p.id).map((m) => m.orbit!.r + m.R));
        const reach = (p: Body): number => Math.max(p.R, ms(p));
        const peri = (b: Body): number => b.orbit!.a * (1 - b.orbit!.e);
        const apo = (b: Body): number => b.orbit!.a * (1 + b.orbit!.e);
        expect(peri(planets[0]) - x.bodies[star].R).toBeGreaterThanOrEqual(reach(planets[0]) + PLANET_MARGIN - 1e-9);
        for (let k = 1; k < planets.length; k++) {
          const [i, j] = [planets[k - 1], planets[k]];
          const gap = peri(j) - apo(i);
          expect(gap, `${i.id} ${j.id}`).toBeGreaterThanOrEqual(i.R + j.R + Math.max(ms(i), ms(j)) + PLANET_MARGIN - 1e-9);
          expect(gap, `${i.id} ${j.id}`).toBeGreaterThanOrEqual(reach(i) + reach(j) + PLANET_MARGIN - 1e-9);
        }
        for (const p of planets) {
          expect(apo(p)).toBeLessThanOrEqual(9.6 + 1e-9);
          const moons = moonsOf(x, p.id);
          const radii = [...new Set(moons.map((m) => m.orbit!.r))].sort((a, b) => a - b);
          let outer = p.R;
          for (const r of radii) {
            const on = moons.filter((m) => m.orbit!.r === r);
            const big = Math.max(...on.map((m) => m.R));
            expect(peri(on[0]) - outer, p.id).toBeGreaterThanOrEqual(big + MOON_MARGIN_SHARE * p.R - 1e-9);
            outer = r + big;
          }
        }
      }
    };
    check(g);
    for (let seed = 2; seed <= 300; seed++) check(generateGalaxy(seed, 'phone', galaxyBudget(MOTE_BUDGET_DESKTOP)));
  }, 120_000);

  it("lands every moon in the last 30 % of its planet's build", () => {''')
rep('''  HOOD_R,
''', '''  HOOD_R,
  MOON_MARGIN_SHARE,
  PLANET_MARGIN,
''')
open(p, 'w').write(s)
