p = '<scratchpad>/galaxy-mocks/galaxy-mock.html'
s = open(p).read()
n = 0
def rep(a, b):
    global s, n
    assert a in s, a[:70]
    s = s.replace(a, b); n += 1

# sizes and counts are seeded distributions; the story pins the source star's three inner planets (4, 3, 3 moons)
rep("""      function addSystem(at, opts = {}) {
        const star = addNode('rule', null, 0, 0, 0, { at });
        const planets = ORBIT.plan.radii.map((r, i) => addNode('plan', star.idx, r, rng() * Math.PI * 2, ORBIT.plan.periods[i]));
        for (const p of planets) for (let k = 0; k < ORBIT.code.tracks.length * ORBIT.code.per; k++) { const ti = k % ORBIT.code.tracks.length; addNode('code', p.idx, ORBIT.code.tracks[ti], rng() * Math.PI * 2 + (k >= 3 ? Math.PI : 0), ORBIT.code.periods[ti]); }
        return star;
      }""",
"""      const gauss = () => { const u = Math.max(1e-6, rng()), v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
      const SIZES = {
        planet: () => clamp(0.22 * Math.exp(0.5 * gauss()), 0.14, 0.5),               // log-normal: many small, a few large
        moon: (Rp) => clamp(0.12 * Rp * Math.exp(0.45 * gauss()), 0.04, 0.35 * Rp),    // never more than 0.35 of its planet
        moons: () => (rng() < 0.45 ? 0 : Math.min(6, 1 + Math.floor(-Math.log(Math.max(1e-6, rng())) / 0.7))), // most bare, a few with several
        planets: () => 2 + Math.floor(8 * rng() * rng()),                                // 2-9, most 2-5
        tracks: [1.3, 1.9, 2.5],                                                         // moon tracks, in planet radii
      };
      // a planet's moons: on tracks relative to the planet's radius, two per track at most, sizes seeded
      function addMoons(planet, count, opts = {}) {
        for (let k = 0; k < count; k++) { const ti = k % SIZES.tracks.length; const m = addNode('code', planet.idx, SIZES.tracks[ti] * planet.R, rng() * Math.PI * 2 + (k >= 3 ? Math.PI : 0), ORBIT.code.periods[ti], { R: SIZES.moon(planet.R) }); if (opts.sick && k === count - 1) { m.cracked = true; m.seed = SEED * 131 + 7; m.phase = 0.37; } }
      }
      function addSystem(at, opts = {}) {
        const star = addNode('rule', null, 0, 0, 0, { at });
        const np = opts.pinMoons ? Math.max(opts.pinMoons.length, SIZES.planets()) : SIZES.planets();
        const rOut = 5.5 + 4.1 * (np - 2) / 7; // a sparse system is compact; a crowded one reaches the 9.6 bound
        for (let i = 0; i < np; i++) {
          const f = np === 1 ? 0 : i / (np - 1); const gap = np === 1 ? 0 : (rOut - 2.2) / (np - 1);
          const r = 2.2 + f * (rOut - 2.2) + (i === 0 || i === np - 1 ? 0 : (rng() - 0.5) * 0.3 * gap);
          const planet = addNode('plan', star.idx, r, rng() * Math.PI * 2, 60 + 30 * i, { R: SIZES.planet() });
          const count = opts.pinMoons && i < opts.pinMoons.length ? opts.pinMoons[i] : SIZES.moons();
          addMoons(planet, count);
        }
        return star;
      }""")
rep("""        for (const s of spots) addSystem(s);""", """        spots.forEach((s, i) => addSystem(s, i === 0 ? { pinMoons: [4, 3, 3] } : {}));""")
# shells scale with the body's surface, so density on screen is the same at every size
rep("const shellN = n.hero ? 6000 : L.shell;", "const shellN = n.hero ? 6000 : Math.max(12, Math.round(L.shell * (n.R / L.R) ** 2));")
# the close view: a planet with four seeded moons, the defect on the outer track; the neighbours bare or lightly mooned
rep("""          const mk = (at, sick) => { const p = addNode('plan', null, 0, 0, 0, { at, hero: mode === 'close' }); for (let k = 0; k < 6; k++) { const ti = k % 3; const m = addNode('code', p.idx, ORBIT.code.tracks[ti], rng() * Math.PI * 2 + (k >= 3 ? Math.PI : 0), ORBIT.code.periods[ti]); if (sick && ti === 2 && k === 2) { m.cracked = true; m.seed = SEED * 131 + 7; m.phase = 0.37; } } return p; };
          if (STILL) { mk([0, 0, 0], SICK); for (const [i, at] of [[-2.2, 0, -1.5], [2.0, 0, -2.4], [-2.8, 0, 2.0]].entries()) { const p = addNode('plan', null, 0, 0, 0, { at }); p.dim = true; for (let k = 0; k < 6; k++) { const ti = k % 3; addNode('code', p.idx, ORBIT.code.tracks[ti], rng() * 6.28, ORBIT.code.periods[ti]); } } }""",
"""          const mk = (at, sick) => { const p = addNode('plan', null, 0, 0, 0, { at, hero: mode === 'close', R: 0.3 }); addMoons(p, 4, { sick }); return p; };
          if (STILL) { mk([0, 0, 0], SICK); for (const [i, at] of [[-2.2, 0, -1.5], [2.0, 0, -2.4], [-2.8, 0, 2.0]].entries()) { const p = addNode('plan', null, 0, 0, 0, { at, R: SIZES.planet() }); p.dim = true; addMoons(p, [0, 2, 1][i]); } }""")
rep("system: 'One solar system: a rule is the star, the plans written from it are its planets, the code built from each plan its moons. The twelve defective pieces are lit (three planets, nine moons); the fixed one has gone amber. Orbits run on the ambient clock.',",
    "system: 'One solar system: a rule is the star, the plans written from it are its planets (two to nine, unequal), the code built from each plan its moons (most planets have none; a few have several; all small). The twelve defective pieces are lit (three planets, nine moons); the fixed one has gone amber.',")
open(p, 'w').write(s)
print('patched', n)
start = s.index('<title>'); end = s.index('</style>') + len('</style>')
bstart = s.index('<canvas'); bend = s.index('</body>')
pub = '<meta charset="UTF-8" />\n' + s[start:end] + '\n' + s[bstart:bend].rstrip() + '\n'
open('<scratchpad>/orbitpub/orbits.html', 'w').write(pub)
print('pub bytes', len(pub))
