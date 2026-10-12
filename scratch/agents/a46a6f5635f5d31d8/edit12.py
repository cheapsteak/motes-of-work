p = 'src/galaxy/background.ts'
s = open(p).read()


def rep(a, b):
    global s
    assert a in s, a[:70]
    s = s.replace(a, b)


rep('''        // A core star's radius is drawn in its own stratum of the radial law and its bearing on the
        // golden angle (jittered a little): every ring of the core is filled evenly all the way
        // round, so no part of it is bare.
        const u = coreU0 + ((1 - coreU0) * (i + rng())) / nCore;
        r = BG.coreAt * BG.radius * u ** BG.starExp;
        th = coreTurn + i * GOLDEN_ANGLE + CORE_JITTER * (2 * rng() - 1);''', '''        // The core stars fill rings of CORE_RING stars in turn, inner to outer. A ring takes its share
        // of the radial law, and its stars take evenly spaced bearings (jittered within their slot)
        // at random radii in it: every part of the core is filled all the way round, with no hole
        // and no pattern.
        const ring = Math.floor(i / CORE_RING);
        const inRing = Math.min(CORE_RING, nCore - ring * CORE_RING);
        const u = coreU0 + ((1 - coreU0) * (ring * CORE_RING + inRing * rng())) / nCore;
        r = BG.coreAt * BG.radius * u ** BG.starExp;
        th = ringTurn[ring] + (2 * Math.PI * (slot[i] + 0.5 + CORE_JITTER * (2 * rng() - 1))) / inRing;''')
rep('''  const coreTurn = 2 * Math.PI * rngFor(seed, 4, 0)();''', '''  const rings = Math.ceil(nCore / CORE_RING);
  const ringTurn = Array.from({ length: rings }, (_, q) => 2 * Math.PI * rngFor(seed, 4, q)());
  // Each ring's bearing slots, dealt to its stars in a seeded order.
  const slot = new Int32Array(nCore);
  for (let q = 0; q < rings; q++) {
    const lo = q * CORE_RING;
    const n = Math.min(CORE_RING, nCore - lo);
    const order = Array.from({ length: n }, (_, j) => j);
    const prng = rngFor(seed, 5, q);
    for (let j = n - 1; j > 0; j--) {
      const k = Math.floor(prng() * (j + 1));
      [order[j], order[k]] = [order[k], order[j]];
    }
    order.forEach((o, j) => (slot[lo + j] = o));
  }''')
rep('''  // The core stars' radial law starts past the core's exclusion (u of radius 16), and their golden
  // spiral is turned by the seed.''', '''  // The core stars' radial law starts past the core's exclusion (u of radius 16); each ring is turned by the seed.''')
rep('''/** The golden angle, and the jitter about it of a core star's bearing (radians). */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const CORE_JITTER = 0.05;''', '''/** Core stars per ring, and how far a core star's bearing strays in its slot (a share of half the slot). */
const CORE_RING = 72;
const CORE_JITTER = 0.25;''')
open(p, 'w').write(s)
