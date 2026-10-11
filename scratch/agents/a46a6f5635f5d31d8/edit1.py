p = 'src/galaxy/generate.ts'
s = open(p).read()
old_head = s[s.index("/** A star's slots: the count, the orbits"):s.index("    const R = pin?.R ?? drawnR;")]
new_head = '''/** A star's slot orbits: at least as many as its scripted planets, inner to outer. */
function slotRadii(seed: number, star: Draft, scripted: number): number[] {
  const rng = rngFor(seed, 'slots', star.key);
  const n = Math.max(planetCount(rng()), scripted);
  return planetOrbitRadii(n, rng);
}

/**
 * Slot `k` of a star, at apoapsis `r`: its planet's size and orbit and its moons, pinned where the
 * story pins them. `u0` is the slot's bare-or-not draw when the caller stratifies it (the filler's
 * slots); otherwise the slot draws its own.
 */
function drawSlot(seed: number, star: Draft, k: number, r: number, pin: ScriptedBody | undefined, u0: number | null): SlotDraw {
  {
    const prng = rngFor(seed, 'planets', star.key * SLOT_KEYS + k);
    const drawnR = planetRadius(gauss(prng));
    const own = prng();
    const drawnMoons = moonCount(u0 ?? own, prng());
'''
s = s.replace(old_head, new_head)
old_tail_start = s.index("      return { R: mR, orbit: { ...o, phase }, partGroup: isFirst ? j + 1 : null };")
seg = s[old_tail_start:old_tail_start + 300]
print(repr(seg))
open(p, 'w').write(s)
