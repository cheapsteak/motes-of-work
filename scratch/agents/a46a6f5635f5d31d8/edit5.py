p = 'src/galaxy/generate.ts'
s = open(p).read()


def rep(old, new):
    global s
    assert old in s, old[:60]
    s = s.replace(old, new)


rep('''    d.outer = d.slots.reduce(
      (m, s) =>
        Math.max(
          m,
          s.orbit.r +
            pieceReach(
              s.R,
              s.moons.map((x) => ({ r: x.orbit.r, R: x.R })),
            ),
        ),
      STAR_R,
    );''', '''    d.outer = d.slots.reduce((m, slot) => Math.max(m, slot.orbit.r + slotReach(slot)), STAR_R);''')
rep('''const halfBuilt = (d: Pick<Draft, 'born' | 'dur'>): number => d.born + 0.5 * d.dur;
''', '''const halfBuilt = (d: Pick<Draft, 'born' | 'dur'>): number => d.born + 0.5 * d.dur;
const slotReach = (slot: SlotDraw): number => pieceReach(slot.R, slot.moons.map((m) => ({ r: m.orbit.r, R: m.R })));
''')
rep('''    free.set(d, slots);
    for (const _ of slots) releases.push(release(d));''', '''    free.set(d, slots);
    releases.push(...slots.map(() => release(d)));''')
rep('''/** The filler's birth laws (the stacks network's): count by growth g is `total · (g / to)^exponent`. */
const STAR_LAW = { exponent: 1 };
const PLANET_LAW = { exponent: 1.3 };''', '''/** The filler's birth laws' exponents (the stacks network's plans and code): see `fillerBirths`. */
const STAR_LAW_EXPONENT = 1;
const PLANET_LAW_EXPONENT = 1.3;''')
rep('STAR_LAW.exponent', 'STAR_LAW_EXPONENT')
rep('PLANET_LAW.exponent', 'PLANET_LAW_EXPONENT')
open(p, 'w').write(s)
