p = 'src/galaxy/generate.ts'
s = open(p).read()


def rep(old, new):
    global s
    assert old in s, old[:80]
    s = s.replace(old, new)


rep('''        const p = nearest(
          d.hostDraft!.spot!,
          eligible('star', d.born).filter((n) => !n.cracked),
        );''', '''        const clean = eligible('star', d.born).filter((n) => !n.cracked);
        const p = nearest(d.hostDraft!.spot!, clean);''')
rep('''      const rules = eligible('core', d.born);
      const main =
        rules[
          pickWeighted(
            rules.map((n) => d.born - n.born),
            rng,
          )
        ];''', '''      // A rule by age: the older a rule, the more plans are written from it.
      const rules = eligible('core', d.born);
      const ages = rules.map((n) => d.born - n.born);
      const main = rules[pickWeighted(ages, rng)];''')
rep('''      const hosts = eligible('star', d.born).filter((n) => free.get(n)!.length > 0);
      const host =
        hosts[
          pickWeighted(
            hosts.map((n) => free.get(n)!.length),
            rng,
          )
        ];''', '''      const hosts = eligible('star', d.born).filter((n) => free.get(n)!.length > 0);
      const room = hosts.map((n) => free.get(n)!.length);
      const host = hosts[pickWeighted(room, rng)];''')
rep('''    moon?: { j: number; of: number; draw: MoonDraw };''', '''    moon?: { j: number; draw: MoonDraw };''')
rep('''        moon: { j, of: moons.length, draw },''', '''        moon: { j, draw },''')
rep('''  const hoodCentroid = systems
    .map((i) => bodies[i].spot!)
    .reduce<
      [number, number, number]
    >((c, s) => [c[0] + s[0] / systems.length, c[1] + s[1] / systems.length, c[2] + s[2] / systems.length], [0, 0, 0]);''', '''  const hoodCentroid: [number, number, number] = [0, 0, 0];
  for (const i of systems) for (let k = 0; k < 3; k++) hoodCentroid[k] += bodies[i].spot![k] / systems.length;''')
open(p, 'w').write(s)
