/**
 * The apoapses of a star's planets with eccentricities `ecc(e0)` (fix ruling 2), or null if the last
 * passes 9.6: each at least its floor, and far enough out that its periapsis clears the star's body
 * (the first) or its inner neighbour's apoapsis by the two pieces plus a margin. For neighbours
 * i < j the clearance is `max(R_i + R_j + max(ms_i, ms_j), reach_i + reach_j) + 0.15`: a body on the
 * outer ellipse is never nearer the star than its periapsis, nor one on the inner farther than its
 * apoapsis, so no two planets, and no two pieces, ever touch at any precession or tilt.
 */
function layOut(slots: readonly SlotDraw[], floors: readonly number[], ecc: (e0: number) => number): number[] | null {
  const radii: number[] = [];
  slots.forEach((s, k) => {
    const e = ecc(s.e0);
    const p = slots[k - 1];
    const inner = k === 0 ? STAR_R + slotReach(s) : radii[k - 1] + Math.max(p.R + s.R + Math.max(p.ms, s.ms), slotReach(p) + slotReach(s));
    radii.push(Math.max(floors[k], ((inner + PLANET_MARGIN) * (1 + e)) / (1 - e)));
  });
  return radii[radii.length - 1] <= PLANET_ORBIT_MAX ? radii : null;
}

/** How often the fit had to give way over a galaxy (see `fitSystem`). */
export interface FitCounts {
  /** Systems whose eccentricities were eased toward the band's floor (still in §12.1's band). */
  systemsEased: number;
  /** Filler slots dropped. */
  slotsDropped: number;
  /** Systems of only the story's planets laid out below the band (toward circles). */
  systemsFlattened: number;
  /** Moons the story does not pin, dropped. */
  moonsDropped: number;
}

/** The planets' eccentricity band's floor (§12.1). */
const PLANET_E_MIN = 0.05;

/** The largest x in [0, 1] with `fits(x)`, given `fits(0)`. */
function largestFit(fits: (x: number) => boolean): number {
  if (fits(1)) return 1;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) lo = mid;
    else hi = mid;
  }
  return lo;
}

/**
 * Lays out a star's system so that no two of its pieces can touch and the last orbit is within 9.6
 * (fix ruling 2), giving way as little as it must, in this order:
 *  1. The system's eccentricities are eased together toward the band's floor (0.05), as little as fits.
 *  2. If even the floor does not fit, the outermost filler slot is dropped, and 1 is tried again,
 *     down to the star's scripted planets (never under two).
 *  3. A system of only the story's planets that still does not fit (the reviewer's nine on P5) lets
 *     its designed spacing go (only the first orbit's 2.2 floor stays) and its eccentricities fall
 *     below the band toward circles, as little as fits.
 *  4. If even circles do not fit, moons the story does not pin are dropped, from the widest piece's
 *     outermost track inward, and 3 is tried again.
 * Returns the slots kept, their orbits set.
 */
function fitSystem(seed: number, star: Draft, all: SlotDraw[], scripted: number, counts: FitCounts): SlotDraw[] {
  const apply = (slots: SlotDraw[], radii: number[], ecc: (e0: number) => number): SlotDraw[] => {
    slots.forEach((s, k) => {
      const e = ecc(s.e0);
      s.orbit = { ...s.orbit, r: radii[k], e, a: radii[k] / (1 + e), period: planetPeriod(radii[k]) };
    });
    return slots;
  };
  const eased = (x: number) => (e0: number) => PLANET_E_MIN + x * (e0 - PLANET_E_MIN);
  const least = Math.max(scripted, 2);
  for (let n = all.length; n >= least; n--) {
    const slots = all.slice(0, n);
    const floors = nominalRadii(seed, star, n);
    if (!layOut(slots, floors, eased(0))) continue;
    const x = largestFit((v) => layOut(slots, floors, eased(v)) !== null);
    counts.slotsDropped += all.length - n;
    if (x < 1) counts.systemsEased++;
    return apply(slots, layOut(slots, floors, eased(x))!, eased(x));
  }
  counts.slotsDropped += all.length - least;
  counts.systemsFlattened++;
  const slots = all.slice(0, least);
  const floors = slots.map((_, k) => (k === 0 ? PLANET_ORBIT_FIRST : 0));
  const scaled = (x: number) => (e0: number) => x * e0;
  for (;;) {
    if (layOut(slots, floors, scaled(0))) {
      const x = largestFit((v) => layOut(slots, floors, scaled(v)) !== null);
      return apply(slots, layOut(slots, floors, scaled(x))!, scaled(x));
    }
    const free = slots.filter((s) => !s.pinned && s.moons.length > 0);
    if (free.length === 0) throw new Error(`the system of ${star.id} does not fit within ${PLANET_ORBIT_MAX}`);
    const widest = free.reduce((a, b) => (b.ms > a.ms ? b : a));
    widest.moons.pop();
    layMoons(widest);
    counts.moonsDropped++;
  }
}
