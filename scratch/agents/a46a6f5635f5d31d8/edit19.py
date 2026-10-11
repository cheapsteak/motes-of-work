import re

g = '/home/user/motes-of-work/src/galaxy/generate.ts'
s = open(g).read()


def rep(a, b, cnt=1):
    global s
    assert s.count(a) >= 1, a[:70]
    s = s.replace(a, b) if cnt == 0 else s.replace(a, b, cnt)


rep('''/** One seeded stream per (concern, key), its first output dropped (it runs high for close keys). */
const CONCERN = { births: 1, parents: 2, spots: 3, slots: 4, planets: 5, bows: 6, derps: 7 } as const;
function rngFor(seed: number, concern: keyof typeof CONCERN, key: number): () => number {
  const salt = pcg((Math.imul(CONCERN[concern], 0x9e3779b9) ^ Math.imul(key + 1, 0x85ebca6b)) >>> 0);
  const rng = mulberry32(pcg((seed ^ salt) >>> 0));
  rng();
  return rng;
}
''', '''/** One seeded stream per (concern, key): `streamFor` (seeds.ts). */
const rngFor = streamFor;
''')
rep("import { mulberry32, pcg } from '../math/hash';", "import { pcg } from '../math/hash';")
rep("import { FIRST, HOSTS", "import { streamFor } from './seeds';\nimport { FIRST, HOSTS")
# type-level lies
rep('''      hiAt: d.hiAt!,
      fixAt: d.fixAt!,
      hop: d.hop!,''', '''      hiAt: d.hiAt ?? null,
      fixAt: d.fixAt ?? null,
      hop: d.hop ?? null,''')
# bow -> bowBearing
rep('''  /** The bearing, about the chord, of the side its control point is bowed to, in [0, 2π). */
  bow: number;''', '''  /**
   * The bearing, about the chord, of the side its control point is bowed to, in [0, 2π): a direction,
   * not an amount. The bow's size is the renderer's, a fixed share of the chord (galaxy §15.2: 0.10).
   */
  bowBearing: number;''')
rep('''        bow: 2 * Math.PI * rngFor(seed, 'bows', b.index * 4 + slot)(),''', '''        bowBearing: 2 * Math.PI * rngFor(seed, 'bows', b.index * 4 + slot)(),''')
# reuse largestFit in fitBudget
rep('''  /** The largest f in [0, 1] with `fits(f)`, given `fits(0)`. */
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
''', '')
rep('largest((f) => apply(f, 1) <= budget)', 'largestFit((f) => apply(f, 1) <= budget)')
rep('largest((f) => apply(0, f) <= budget)', 'largestFit((f) => apply(0, f) <= budget)')
open(g, 'w').write(s)

b = '/home/user/motes-of-work/src/galaxy/background.ts'
t = open(b).read()
a0 = t.index('/** One seeded stream per (concern, point).')
a1 = t.index('/** A draw at radius')
t = t[:a0] + t[a1:]
t = t.replace("import { mulberry32, pcg } from '../math/hash';", "import { streamFor } from './seeds';")
t = t.replace('rngFor(seed, 1, i)', "streamFor(seed, 'bgStars', i)")
t = t.replace('rngFor(seed, 4, q)', "streamFor(seed, 'bgRingTurn', q)")
t = t.replace('rngFor(seed, 5, q)', "streamFor(seed, 'bgRingSlots', q)")
t = t.replace('rngFor(seed, 2, i)', "streamFor(seed, 'bgDust', i)")
assert 'rngFor' not in t
open(b, 'w').write(t)
