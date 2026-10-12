p = '<scratchpad>/agents/a46a6f5635f5d31d8/slots-new.ts'
s = open(p).read()


def rep(a, b):
    global s
    assert a in s, a[:70]
    s = s.replace(a, b)


rep('''  /** Each track's ellipse (every moon on a track shares it, at its own phase), drawn whether or not the track is used. */
  tracks: OrbitElements[];''', '''  /** Each track's ellipse (every moon on a track shares it, at its own phase) and starting phase, drawn whether or not the track is used. */
  tracks: OrbitElements[];
  trackPhase: number[];''')
rep('''function layMoons(slot: SlotDraw): void {
  const margin''', '''function layMoons(slot: SlotDraw): void {
  // Moon j of m rides track `moonTrack(j, m)`, the moons of a track spaced evenly round it.
  const m = slot.moons.length;
  const onTrack = [0, 1, 2].map((t) => slot.moons.filter((_, j) => moonTrack(j, m) === t).length);
  const seen = [0, 0, 0];
  slot.moons.forEach((moon, j) => {
    moon.track = moonTrack(j, m);
    moon.orbit = { ...moon.orbit, phase: (slot.trackPhase[moon.track] + seen[moon.track]++ / onTrack[moon.track]) % 1 };
  });
  const margin''')
rep('''  const trackPhase = [prng(), prng(), prng()];
  const onTrack = [0, 1, 2].map((t) => Array.from({ length: m }, (_, j) => moonTrack(j, m)).filter((x) => x === t).length);
  const seen = [0, 0, 0];
  const isFirst''', '''  const trackPhase = [prng(), prng(), prng()];
  const isFirst''')
rep('''    const t = moonTrack(j, m);
    const drawn = moonRadius(R, gauss(prng));
    const mR = isFirst ? Math.max(0.04, 0.35 * R * Math.sqrt(N0_PART_SHARE[j] / maxShare)) : drawn;
    // The moons of a track are spaced evenly round it, from the track's seeded phase.
    const phase = (trackPhase[t] + seen[t]++ / onTrack[t]) % 1;
    return { R: mR, track: t, orbit: { ...tracks[t], phase }, partGroup: isFirst ? j + 1 : null };
  });
  const slot: SlotDraw = { R, orbit, e0: orbit.e, moons, tracks, pinned: pin?.moons !== undefined, ms: 0 };''', '''    const t = moonTrack(j, m);
    const drawn = moonRadius(R, gauss(prng));
    const mR = isFirst ? Math.max(0.04, 0.35 * R * Math.sqrt(N0_PART_SHARE[j] / maxShare)) : drawn;
    return { R: mR, track: t, orbit: tracks[t], partGroup: isFirst ? j + 1 : null };
  });
  const slot: SlotDraw = { R, orbit, e0: orbit.e, moons, tracks, trackPhase, pinned: pin?.moons !== undefined, ms: 0 };''')
open(p, 'w').write(s)

g = 'src/galaxy/generate.ts'
t = open(g).read()
a = t.index('/** A moon as drawn for its slot. */')
b = t.index('/** A body before it has a row. */')
c = t.index('const halfBuilt = ')
d = t.index('/** Spots for the core:')
draft_iface = t[b:c]
t = t[:a] + draft_iface + "const halfBuilt = (d: Pick<Draft, 'born' | 'dur'>): number => d.born + 0.5 * d.dur;\n\n" + s + '\n' + t[d:]
old = t[t.index('  // The filler\'s slots draw bare-or-not stratified'):t.index('  placeCore(seed, core);')]
new = '''  // The filler's slots draw bare-or-not stratified (a seeded permutation of N even strata), so the
  // share of bare filler planets is the design's 0.45 for every seed, not just on average.
  const counts = new Map(stars.map((d) => [d, slotCount(seed, d, (HOSTS[d.id] ?? []).length)]));
  const fillerSlots = stars.flatMap((d) =>
    Array.from({ length: counts.get(d)! }, (_, k) => [d, k] as const).filter(([, k]) => k >= (HOSTS[d.id] ?? []).length),
  );
  const strata = fillerSlots.map((_, i) => i);
  const srng = rngFor(seed, 'slots', STRATA_KEY);
  for (let i = strata.length - 1; i > 0; i--) {
    const j = Math.floor(srng() * (i + 1));
    [strata[i], strata[j]] = [strata[j], strata[i]];
  }
  const u0 = new Map(fillerSlots.map(([d, k], i) => [`${d.key}/${k}`, (strata[i] + srng()) / strata.length]));
  const fit: FitCounts = { slotsDropped: 0, systemsFlattened: 0, moonsDropped: 0 };
  for (const d of stars) {
    const scripted = (HOSTS[d.id] ?? []).map((id) => LINEAGE.find((s) => s.id === id)!);
    const drawn = Array.from({ length: counts.get(d)! }, (_, k) => drawSlot(seed, d, k, scripted[k], u0.get(`${d.key}/${k}`) ?? null));
    d.slots = fitSystem(seed, d, drawn, scripted.length, fit);
    d.outer = d.slots.reduce((m, slot) => Math.max(m, slot.orbit.r + slotReach(slot)), STAR_R);
  }
'''
t = t.replace(old, new)
open(g, 'w').write(t)
