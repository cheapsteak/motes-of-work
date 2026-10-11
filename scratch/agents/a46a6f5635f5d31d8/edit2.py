p = 'src/galaxy/generate.ts'
s = open(p).read()
a = s.index("function drawSlot(seed: number")
b = s.index("/** Spots for the core:")
body = '''function drawSlot(seed: number, star: Draft, k: number, r: number, pin: ScriptedBody | undefined, u0: number | null): SlotDraw {
  const prng = rngFor(seed, 'planets', star.key * SLOT_KEYS + k);
  const drawnR = planetRadius(gauss(prng));
  const own = prng();
  const drawnMoons = moonCount(u0 ?? own, prng());
  const R = pin?.R ?? drawnR;
  const m = pin?.moons ?? drawnMoons;
  const orbit = orbitFor('planet', r, planetPeriod(r), prng);
  const trackPhase = [prng(), prng(), prng()];
  const tracks = Array.from({ length: m }, (_, j) => moonTrack(j, m));
  const onTrack = [0, 1, 2].map((t) => tracks.filter((x) => x === t).length);
  const seen = [0, 0, 0];
  const isFirst = pin?.id === FIRST;
  const maxShare = Math.max(...N0_PART_SHARE);
  const moons = tracks.map((t, j): MoonDraw => {
    const drawn = moonRadius(R, gauss(prng));
    const mR = isFirst ? Math.max(0.04, 0.35 * R * Math.sqrt(N0_PART_SHARE[j] / maxShare)) : drawn;
    const o = orbitFor('moon', MOON_TRACK[t] * R, MOON_PERIOD[t], prng);
    // The moons of a track are spaced evenly round it, from the track's seeded phase.
    const phase = (trackPhase[t] + seen[t]++ / onTrack[t]) % 1;
    return { R: mR, orbit: { ...o, phase }, partGroup: isFirst ? j + 1 : null };
  });
  return { R, orbit, moons };
}

'''
s = s[:a] + body + s[b:]
old = '''  for (const d of stars) {
    const scripted = (HOSTS[d.id] ?? []).map((id) => LINEAGE.find((s) => s.id === id)!);
    d.slots = drawSlots(seed, d, scripted);
    d.outer'''
new = '''  // The filler's slots draw bare-or-not stratified (a seeded permutation of N even strata), so the
  // share of bare filler planets is the design's 0.45 for every seed, not just on average.
  const radii = new Map(stars.map((d) => [d, slotRadii(seed, d, (HOSTS[d.id] ?? []).length)]));
  const fillerSlots = stars.flatMap((d) => radii.get(d)!.map((_, k) => [d, k] as const).filter(([, k]) => k >= (HOSTS[d.id] ?? []).length));
  const strata = fillerSlots.map((_, i) => i);
  const srng = rngFor(seed, 'slots', STRATA_KEY);
  for (let i = strata.length - 1; i > 0; i--) {
    const j = Math.floor(srng() * (i + 1));
    [strata[i], strata[j]] = [strata[j], strata[i]];
  }
  const u0 = new Map(fillerSlots.map(([d, k], i) => [`${d.key}/${k}`, (strata[i] + srng()) / strata.length]));
  for (const d of stars) {
    const scripted = (HOSTS[d.id] ?? []).map((id) => LINEAGE.find((s) => s.id === id)!);
    d.slots = radii.get(d)!.map((r, k) => drawSlot(seed, d, k, r, scripted[k], u0.get(`${d.key}/${k}`) ?? null));
    d.outer'''
assert old in s
s = s.replace(old, new)
s = s.replace('''/** Slots per star in a key (a star has at most 9). */
const SLOT_KEYS = 16;''', '''/** Slots per star in a key (a star has at most 9). */
const SLOT_KEYS = 16;
/** The key of the stream that stratifies the filler slots' bare-or-not draws. */
const STRATA_KEY = 99_999;''')
# hero lattice: the held planet only
old2 = '''  if (b.kind === 'planet') return b.hero ? [...LATTICE.hero] : planetLattice(b.R);'''
assert old2 in s
s = s.replace(old2, '''  if (b.kind === 'planet') return b.id === HERO_PLANET ? [...LATTICE.hero] : planetLattice(b.R);''')
s = s.replace('''/** A body's full lattice: the hero planet's, a core body's, a star's, or scaled with its radius. */''', '''/** A body's full lattice: the hero planet's, a core body's, a star's, or scaled with its radius. */''')
old3 = '''/** A body's person set: this share of its shell'''
s = s.replace(old3, '''/**
 * The planet with the dense shell (morph §7.2, galaxy §14.7): the one the freeze holds. The other
 * heroes (C5, and the rules R0 and R1) are visited close on their ordinary lattices: two dense
 * planets do not fit the budget, and the rules are dense already.
 */
export const HERO_PLANET = 'C1';

/** A body's person set: this share of its shell''')
open(p, 'w').write(s)
