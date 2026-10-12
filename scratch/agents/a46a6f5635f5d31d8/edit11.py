p = 'src/galaxy/background.ts'
s = open(p).read()


def rep(a, b):
    global s
    assert a in s, a[:70]
    s = s.replace(a, b)


rep('''      const r = (core ? BG.coreAt : 1) * BG.radius * rng() ** BG.starExp;
      const th = core
        ? 2 * Math.PI * rng()
        : armAngleAt(Math.max(r, 1e-9), ARM_PHASE, rng() < 0.5 ? 0 : 1) + scatterAt(BG.scatter, r) * (2 * rng() - 1);
      const c = at(r, th, BG.starY, rng);''', '''      let r: number;
      let th: number;
      if (core) {
        // A core star's radius is drawn in its own stratum of the radial law and its bearing on the
        // golden angle (jittered a little): every ring of the core is filled evenly all the way
        // round, so no part of it is bare.
        const u = coreU0 + ((1 - coreU0) * (i + rng())) / nCore;
        r = BG.coreAt * BG.radius * u ** BG.starExp;
        th = coreTurn + i * GOLDEN_ANGLE + CORE_JITTER * (2 * rng() - 1);
      } else {
        r = BG.radius * rng() ** BG.starExp;
        th = armAngleAt(Math.max(r, 1e-9), ARM_PHASE, rng() < 0.5 ? 0 : 1) + scatterAt(BG.scatter, r) * (2 * rng() - 1);
      }
      const c = at(r, th, BG.starY, rng);''')
rep('''  for (const s of hood) settle(s, HALO_PX.hood);''', '''  for (const s of hood) settle(s, HALO_PX.hood);
  // The core stars' radial law starts past the core's exclusion (u of radius 16), and their golden
  // spiral is turned by the seed.
  const coreU0 = (BG.coreExclusion / (BG.coreAt * BG.radius)) ** (1 / BG.starExp) * (1 + 1e-9);
  const coreTurn = 2 * Math.PI * rngFor(seed, 4, 0)();''')
rep('''/** Draws per star (outside the core's exclusion): the first that is clear, else the roomiest of them. */''', '''/** The golden angle, and the jitter about it of a core star's bearing (radians). */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const CORE_JITTER = 0.05;
/** Draws per star (outside the core's exclusion): the first that is clear, else the roomiest of them. */''')
open(p, 'w').write(s)
