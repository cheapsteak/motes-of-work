/** A moon as drawn for its slot: its radius, its track, its orbit (its track's, at its own phase). */
interface MoonDraw {
  R: number;
  track: 0 | 1 | 2;
  orbit: OrbitElements;
  partGroup: number | null;
}
/** A planet slot of a star, as drawn: who fills it is decided later (a scripted planet, or the filler). */
interface SlotDraw {
  R: number;
  /** The planet's orbit; its apoapsis, `a` and period are set when its system is laid out (`fitSystem`). */
  orbit: OrbitElements;
  /** Its drawn eccentricity, before a crowded system scales it down. */
  e0: number;
  moons: MoonDraw[];
  /** Each track's ellipse (every moon on a track shares it, at its own phase) and starting phase, drawn whether or not the track is used. */
  tracks: OrbitElements[];
  trackPhase: number[];
  /** The story pins its moons: the fit never drops one. */
  pinned: boolean;
  /** The moon-system radius: the outermost track's apoapsis plus the largest moon on it; 0 if bare. */
  ms: number;
}

/**
 * The gap the fit keeps (galaxy rev 6, fix ruling): between a star and its first planet's piece,
 * and between neighbouring pieces, past the least distance at which no two can touch.
 */
export const PLANET_MARGIN = 0.15;
/** The same between a planet and its first track, and between neighbouring tracks, as a share of the planet's radius. */
export const MOON_MARGIN_SHARE = 0.05;

/** A slot's reach from its planet's centre: the planet's radius, or its moon system's if that is wider. */
const slotReach = (slot: SlotDraw): number => Math.max(slot.R, slot.ms);

/** How many slots a star draws before the fit: at least as many as its scripted planets. */
function slotCount(seed: number, star: Draft, scripted: number): number {
  return Math.max(planetCount(rngFor(seed, 'slots', star.key)()), scripted);
}

/** The designed apoapses of a star's `n` orbits (§13), the floor of the fit's: the stream's draws after the count. */
function nominalRadii(seed: number, star: Draft, n: number): number[] {
  const rng = rngFor(seed, 'slots', star.key);
  rng();
  return planetOrbitRadii(n, rng);
}

/**
 * The moons' tracks round a planet (fix ruling 2): track `t` sits at `MOON_TRACK[t]·R` or, if that
 * is too close, just far enough out that its periapsis clears the planet (or the track inside it) by
 * the largest moon on each plus a margin, so no moon ever touches the planet or a moon of another
 * track at any precession or tilt. Moons on one track share its ellipse and keep their phases apart.
 */
function layMoons(slot: SlotDraw): void {
  // Moon j of m rides track `moonTrack(j, m)`, the moons of a track spaced evenly round it.
  const m = slot.moons.length;
  const onTrack = [0, 1, 2].map((t) => slot.moons.filter((_, j) => moonTrack(j, m) === t).length);
  const seen = [0, 0, 0];
  slot.moons.forEach((moon, j) => {
    moon.track = moonTrack(j, m);
    moon.orbit = { ...moon.orbit, phase: (slot.trackPhase[moon.track] + seen[moon.track]++ / onTrack[moon.track]) % 1 };
  });
  const margin = MOON_MARGIN_SHARE * slot.R;
  let outer = slot.R;
  for (const t of [0, 1, 2] as const) {
    const on = slot.moons.filter((m) => m.track === t);
    if (on.length === 0) continue;
    const big = Math.max(...on.map((m) => m.R));
    const el = slot.tracks[t];
    const r = Math.max(MOON_TRACK[t] * slot.R, ((outer + big + margin) * (1 + el.e)) / (1 - el.e));
    for (const m of on) m.orbit = { ...el, r, a: r / (1 + el.e), phase: m.orbit.phase };
    outer = r + big;
  }
  slot.ms = slot.moons.length > 0 ? outer : 0;
}

/**
 * Slot `k` of a star: its planet's size, eccentricity and orbital elements, and its moons, pinned
 * where the story pins them. `u0` is the slot's bare-or-not draw when the caller stratifies it (the
 * filler's slots); otherwise the slot draws its own.
 */
function drawSlot(seed: number, star: Draft, k: number, pin: ScriptedBody | undefined, u0: number | null): SlotDraw {
  const prng = rngFor(seed, 'planets', star.key * SLOT_KEYS + k);
  const drawnR = planetRadius(gauss(prng));
  const own = prng();
  const drawnMoons = moonCount(u0 ?? own, prng());
  const R = pin?.R ?? drawnR;
  const m = pin?.moons ?? drawnMoons;
  const orbit = orbitFor('planet', 1, 1, prng);
  const tracks = ([0, 1, 2] as const).map((t) => orbitFor('moon', 1, MOON_PERIOD[t], prng));
  const trackPhase = [prng(), prng(), prng()];
  const isFirst = pin?.id === FIRST;
  const maxShare = Math.max(...N0_PART_SHARE);
  const moons = Array.from({ length: m }, (_, j): MoonDraw => {
    const t = moonTrack(j, m);
    const drawn = moonRadius(R, gauss(prng));
    const mR = isFirst ? Math.max(0.04, 0.35 * R * Math.sqrt(N0_PART_SHARE[j] / maxShare)) : drawn;
    return { R: mR, track: t, orbit: tracks[t], partGroup: isFirst ? j + 1 : null };
  });
  const slot: SlotDraw = { R, orbit, e0: orbit.e, moons, tracks, trackPhase, pinned: pin?.moons !== undefined, ms: 0 };
  layMoons(slot);
  return slot;
}

/**
 * The apoapses of a star's planets for eccentricities `λ e0` (fix ruling 2), or null if the last
 * passes 9.6: each at least its designed radius, and far enough out that its periapsis clears the
 * star's glow body (the first) or its inner neighbour's apoapsis by the two pieces plus a margin. For
 * neighbours i < j the clearance is `max(R_i + R_j + max(ms_i, ms_j), reach_i + reach_j) + 0.15`, so
 * no two planets, and no two pieces, ever touch at any precession or tilt.
 */
function layOut(slots: readonly SlotDraw[], nominal: readonly number[], lambda: number): number[] | null {
  const radii: number[] = [];
  slots.forEach((s, k) => {
    const e = lambda * s.e0;
    const p = slots[k - 1];
    const inner = k === 0 ? STAR_R + slotReach(s) : radii[k - 1] + Math.max(p.R + s.R + Math.max(p.ms, s.ms), slotReach(p) + slotReach(s));
    radii.push(Math.max(nominal[k], ((inner + PLANET_MARGIN) * (1 + e)) / (1 - e)));
  });
  return radii[radii.length - 1] <= PLANET_ORBIT_MAX ? radii : null;
}

/** How often the fit had to give way, over a galaxy: slots dropped, systems with eccentricity scaled, moons dropped. */
export interface FitCounts {
  slotsDropped: number;
  systemsFlattened: number;
  moonsDropped: number;
}

/**
 * Lays out a star's system so that it fits within 9.6 (fix ruling 2). If the drawn slots do not fit,
 * the outermost filler slot is dropped, down to the star's scripted planets (and never under two).
 * If that still does not fit, the system's eccentricities are scaled down together, as little as
 * fits; and if even circles do not fit, moons the story does not pin are dropped, from the widest
 * piece's outermost track inward. Returns the slots kept, their orbits set.
 */
function fitSystem(seed: number, star: Draft, all: SlotDraw[], scripted: number, counts: FitCounts): SlotDraw[] {
  const apply = (slots: SlotDraw[], radii: number[], lambda: number): SlotDraw[] => {
    slots.forEach((s, k) => {
      const e = lambda * s.e0;
      s.orbit = { ...s.orbit, r: radii[k], e, a: radii[k] / (1 + e), period: planetPeriod(radii[k]) };
    });
    return slots;
  };
  const least = Math.max(scripted, 2);
  for (let n = all.length; n >= least; n--) {
    const radii = layOut(all.slice(0, n), nominalRadii(seed, star, n), 1);
    if (radii) {
      counts.slotsDropped += all.length - n;
      return apply(all.slice(0, n), radii, 1);
    }
  }
  counts.slotsDropped += all.length - least;
  const slots = all.slice(0, least);
  const nominal = nominalRadii(seed, star, least);
  counts.systemsFlattened++;
  for (;;) {
    if (layOut(slots, nominal, 0)) {
      let lo = 0;
      let hi = 1;
      for (let i = 0; i < 40; i++) {
        const mid = (lo + hi) / 2;
        if (layOut(slots, nominal, mid)) lo = mid;
        else hi = mid;
      }
      return apply(slots, layOut(slots, nominal, lo)!, lo);
    }
    const free = slots.filter((s) => !s.pinned && s.moons.length > 0);
    if (free.length === 0) throw new Error(`the system of ${star.id} does not fit within ${PLANET_ORBIT_MAX}`);
    const widest = free.reduce((a, b) => (b.ms > a.ms ? b : a));
    widest.moons.pop();
    layMoons(widest);
    counts.moonsDropped++;
  }
}
