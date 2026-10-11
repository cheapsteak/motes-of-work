p = '/home/user/motes-of-work/src/galaxy/background.ts'
s = open(p).read()


def rep(a, b):
    global s
    assert a in s, a[:70]
    s = s.replace(a, b)


rep('''  const clear = (p: readonly number[], px: number): boolean => {
    const ci = Math.floor(p[0] / cell);
    const ck = Math.floor(p[2] / cell);
    for (let di = -1; di <= 1; di++) {
      for (let dk = -1; dk <= 1; dk++) {
        for (const [x, z, opx] of grid.get((ci + di + 4096) * 8192 + (ck + dk + 4096)) ?? []) {
          if (Math.hypot(p[0] - x, p[2] - z) < gap(px, opx)) return false;
        }
      }
    }
    return true;
  };''', '''  /** The closest call: the least, over the halos near `p`, of the distance over the gap it needs (1 or more is clear). */
  const room = (p: readonly number[], px: number): number => {
    const ci = Math.floor(p[0] / cell);
    const ck = Math.floor(p[2] / cell);
    let least = Infinity;
    for (let di = -1; di <= 1; di++) {
      for (let dk = -1; dk <= 1; dk++) {
        for (const [x, z, opx] of grid.get((ci + di + 4096) * 8192 + (ck + dk + 4096)) ?? []) {
          least = Math.min(least, Math.hypot(p[0] - x, p[2] - z) / gap(px, opx));
        }
      }
    }
    return least;
  };''')
rep('''    let p: [number, number, number] | null = null;
    for (let attempt = 0; attempt < PLACE_ATTEMPTS && !p; attempt++) {
      const r = (core ? BG.coreAt : 1) * BG.radius * rng() ** BG.starExp;
      const th = core
        ? 2 * Math.PI * rng()
        : armAngleAt(Math.max(r, 1e-9), ARM_PHASE, rng() < 0.5 ? 0 : 1) + scatterAt(BG.scatter, r) * (2 * rng() - 1);
      const c = at(r, th, BG.starY, rng);
      if (Math.hypot(c[0], c[1], c[2]) >= BG.coreExclusion && clear(c, px)) p = c;
    }
    if (!p) throw new Error(`no room for background star ${i} with its halo apart`);
    settle(p, px);''', '''    let p: [number, number, number] | null = null;
    let best = -1;
    for (let attempt = 0; attempt < PLACE_ATTEMPTS && best < 1; ) {
      const r = (core ? BG.coreAt : 1) * BG.radius * rng() ** BG.starExp;
      const th = core
        ? 2 * Math.PI * rng()
        : armAngleAt(Math.max(r, 1e-9), ARM_PHASE, rng() < 0.5 ? 0 : 1) + scatterAt(BG.scatter, r) * (2 * rng() - 1);
      const c = at(r, th, BG.starY, rng);
      if (Math.hypot(c[0], c[1], c[2]) < BG.coreExclusion) continue;
      attempt++;
      const q = room(c, px);
      if (q > best) [p, best] = [c, q];
    }
    settle(p!, px);''')
rep('''/** Draws per star before the generator gives up: a full arm is a design error, not a case to paper over. */
const PLACE_ATTEMPTS = 2000;''', '''/** Draws per star (outside the core's exclusion): the first that is clear, else the roomiest of them. */
export const PLACE_ATTEMPTS = 64;''')
rep('stars.push(p);', 'stars.push(p!);')
open(p, 'w').write(s)
