// The galaxy (design: docs/specs/2026-10-07-galaxy-orbits.md §12-§15): the rules as six bodies in the
// core, the plans as stars on the arm stretch nearest it, and the code as planets going round them
// with their parts as moons, joined by the lineage's streams; and the background galaxy round all of
// it. Generated once from a seed. Pure and deterministic: the same seed, tier and budget give the
// same galaxy, bit for bit. Each concern draws from its own seeded streams (births, parents, spots,
// slots, planets, bows, derps), one per body or slot where it can, so a change to one does not
// reshuffle another; the budget only thins the shells, never the layout, and the tier only sets the
// background's counts.
//
// The scripted bodies (lineage.ts) are placed first and the filler is drawn round them, in birth
// order. The story's clocks are the stacks network's: births on `net.growth`, lights (`hiAt`) on
// `net.highlight`, fixes (`fixAt`) on `net.fix` (src/network/schedule.ts holds the values they must
// agree on), and the rules for the defect, its hops, its lights and the sweep are that network's too.
import { mulberry32, pcg } from '../math/hash';
import { CLEAN_AFTER, CLEAN_WORK_FROM, G_TWELVE, HI_AT_BIRTH, REVIEW_VISITS, SWEEP } from '../network/schedule';
import { NODE_NEVER } from '../scene/node/birth';
import { ARM_PHASE, BG, armAngleAt, generateBackground, type Background, type Tier } from './background';
import {
  CORE_R,
  LATTICE,
  MOON_PERIOD,
  MOON_TRACK,
  PLANET_ORBIT_FIRST,
  PLANET_ORBIT_MAX,
  STAR_R,
  latticeCount,
  moonCount,
  moonLattice,
  moonRadius,
  moonTrack,
  orbitFor,
  planetCount,
  planetLattice,
  planetOrbitRadii,
  planetPeriod,
  planetRadius,
  type BodyKind,
  type OrbitElements,
} from './body';
import { FIRST, HOSTS, LINEAGE, OWN_FIXES, SOURCE, AGENT_RULE, type ScriptedBody } from './lineage';

/** Out from the core to a star or from a star to a planet; sideways (a copy, a reused plan); in (C7 → R1). */
export type StreamKind = 'out' | 'side' | 'in';

export interface Body {
  /** Its place in `Galaxy.bodies` (birth order): its row in the bodies texture. */
  index: number;
  /** A scripted id ('R0', 'C12', 'V3'), a filler's ('star-4', 'planet-17') or a moon's ('C1-m2'). */
  id: string;
  /** The design's second name for it, if any (`C19` for `V3`). */
  alias?: string;
  kind: BodyKind;
  /** True for the scripted bodies, false for the filler and every moon. */
  scripted: boolean;
  /** Stream parents (rows), the main stream first. Empty for a rule nothing built and for a moon. */
  parents: number[];
  /** What it goes round: a planet's star, a moon's planet; −1 for the core and the stars. */
  host: number;
  /** Its system's star (a star's own row); −1 for the core. */
  star: number;
  /** The rule its main lineage comes from (a rule's own row). */
  rule: number;
  /** Its piece: a planet's own row, a moon's planet; −1 for the core and the stars. */
  planet: number;
  /** Birth on the growth clock: its first motes set out here. */
  born: number;
  /** How long it takes to build: done at `born + dur` (a moon lands as one event: 0). */
  dur: number;
  /** It carries the defect: R0; or built from a body that does, before `CLEAN_AFTER`; or a part of a piece that does. */
  cracked: boolean;
  /** A body the camera visits close (C1, C5, R0, R1). */
  hero: boolean;
  /** When it lights on the highlight clock; null if it never does. A moon shares its planet's. */
  hiAt: number | null;
  /** When it is rebuilt on the fix clock; null if clean. A moon shares its planet's. */
  fixAt: number | null;
  /** Streams from R0 to it through bodies that carry the defect (the surge's order); null if clean. */
  hop: number | null;
  /** Its radius. */
  R: number;
  /** Its shell's lattice, [rows, cols] (body.ts), thinned only when the budget is short. */
  lattice: [number, number];
  /** Its shell's motes: `latticeCount(lattice)`. */
  motes: number;
  /** The person's warm motes for its fix: bodies that carry the defect only. */
  personMotes: number;
  /** Its orbit round its host (planets and moons); null for the core and the stars. */
  orbit: OrbitElements | null;
  /** Its fixed place in the galaxy's frame (the core and the stars); null for what orbits. */
  spot: readonly [number, number, number] | null;
  /** The seed its derps are drawn from: R0's for every body that carries the defect, else `NODE_NEVER`. */
  derpSeed: number;
  /** Its own phase in the derp schedule, in [0, 1). */
  derpPhase: number;
  /** N0's moons: the bike's part group (1-7, galaxy §14.3); null for every other body. */
  partGroup: number | null;
  /** Its main stream (index into `streams`); null for a rule nothing built and for a moon. */
  stream: number | null;
}

/** A stream from a parent to a child, the path the child's builders fly in on. */
export interface Stream {
  from: number;
  to: number;
  kind: StreamKind;
  /** When it comes up: its child's birth, or its parent's half-build if that is later. */
  born: number;
  /** When it lights: its child's `hiAt`, if the defect ran along it (both ends carry it); else null. */
  hiAt: number | null;
  /** Its parent's hop plus one, if the defect ran along it; else null. */
  hop: number | null;
  /** The bearing, about the chord, of the side its control point is bowed to, in [0, 2π). */
  bow: number;
}

export interface Galaxy {
  seed: number;
  tier: Tier;
  /** Every body, in birth order (a moon after its planet). */
  bodies: Body[];
  /** Every stream, one per (child, stream parent). */
  streams: Stream[];
  /** The reviewer's feed comes from this body (R0). */
  feedFrom: number;
  /** The reviewer's visits, in order. */
  visits: string[];
  /** Body row by id and by alias. */
  ids: Record<string, number>;
  /** The systems that get detail: every star's row, in birth order. */
  systems: number[];
  /** The middle of the neighbourhood: the centroid of the stars' spots. */
  hoodCentroid: [number, number, number];
  background: Background;
  /** All body motes: shells plus person sets. At most the budget, unless even the thinnest shells exceed it. */
  motes: number;
}

/** At most this many systems (the renderer's `uSysPx` array). */
export const SYS_MAX = 32,
  /** The stars of the neighbourhood: the scripted plans and the filler. */
  STAR_COUNT = 30,
  /** The core bodies lie within this of the galaxy's centre ... */
  CORE_SPREAD = 12,
  /** ... and at least this far apart. */
  CORE_MIN_GAP = 5,
  /** The arm stretch the stars are drawn on (galactic radius), and the bearing of its middle. */
  HOOD_R = [40, 90] as const,
  HOOD_BEARING = 0.9;

/** If the 30 systems do not fit between `HOOD_R`, the stretch reaches out to this radius (ruling 7). */
export const HOOD_R_WIDE = 110;
/** Two systems keep their spots this much further apart than the sum of their outer radii. */
export const HOOD_MARGIN = 1;
/** The neighbourhood's shape (§14.2's 90 × 70, along the arm × across it): the metric its spots pack toward the middle in. */
export const HOOD_SPREAD = [45, 35] as const;
/** Candidate spots per star, drawn in a square this far either way of the middle, along and across the arm. */
const HOOD_CANDIDATES = 1500;
const HOOD_BOX = 90;

/** How long a body takes to build, by kind (the stacks network's layers). */
export const DUR: Readonly<Record<'core' | 'star' | 'planet', number>> = { core: 0.06, star: 0.03, planet: 0.012 };
/**
 * Every filler star is born by this growth, so its planets have time to be born into its slots
 * before growth 1: the stacks network's birth law for plans, run over [0, STAR_BORN_BY].
 */
export const STAR_BORN_BY = 0.9;
/** The filler's birth laws' exponents (the stacks network's plans and code): see `fillerBirths`. */
const STAR_LAW_EXPONENT = 1;
const PLANET_LAW_EXPONENT = 1.3;
/** The share of filler planets that copy a planet of their system instead of reading the star. */
export const COPY_SHARE = 0.15;
/** The share of filler stars that also reuse an earlier star (a second, sideways stream). */
export const REUSE_SHARE = 0.1;

/**
 * The planet with the dense shell (morph §7.2, galaxy §14.7): the one the freeze holds. The other
 * heroes (C5, and the rules R0 and R1) are visited close on their ordinary lattices: two dense
 * planets do not fit the budget, and the rules are dense already.
 */
export const HERO_PLANET = 'C1';

/** A body's person set: this share of its shell, never fewer than `PERSON_MIN` ... */
export const PERSON_SHARE = 0.06;
export const PERSON_MIN = 24;
/** ... except a hero planet's (the freeze: about 70 onto the planet's shell) and a moon's (6 each). */
export const PERSON_HERO_PLANET = 70;
export const PERSON_MOON = 6;

/**
 * Each of N0's seven part groups' share of the bike's motes, front wheel to fittings (galaxy §14.3).
 * A placeholder: Task 8 computes the shares from the bike and replaces these.
 */
export const N0_PART_SHARE = [1, 1, 0.6, 0.5, 0.3, 0.4, 0.2] as const;

/** The galaxy's mote budget for a mote budget (0.76 of it, as the stacks network's). */
export function galaxyBudget(moteBudget: number): number {
  return Math.round(0.76 * moteBudget);
}

/** The row of the body named `id` (or its alias). */
export function bodyIndex(g: Galaxy, id: string): number {
  const i = g.ids[id];
  if (i === undefined) throw new Error(`no body named ${id}`);
  return i;
}

/** How far a planet's piece reaches from its centre: its radius, or its outermost moon's apoapsis plus that moon's radius. */
function pieceReach(R: number, moons: readonly { r: number; R: number }[]): number {
  return moons.reduce((m, x) => Math.max(m, x.r + x.R), R);
}

/** A star system's outer radius: the widest of its planets' apoapses plus that planet's reach. */
export function systemOuter(g: Galaxy, star: number): number {
  let outer = g.bodies[star].R;
  for (const p of g.bodies) {
    if (p.kind !== 'planet' || p.host !== star) continue;
    const moons = g.bodies.filter((m) => m.kind === 'moon' && m.host === p.index).map((m) => ({ r: m.orbit!.r, R: m.R }));
    outer = Math.max(outer, p.orbit!.r + pieceReach(p.R, moons));
  }
  return outer;
}

// ---------------------------------------------------------------------------------------------------

/** One seeded stream per (concern, key), its first output dropped (it runs high for close keys). */
const CONCERN = { births: 1, parents: 2, spots: 3, slots: 4, planets: 5, bows: 6, derps: 7 } as const;
function rngFor(seed: number, concern: keyof typeof CONCERN, key: number): () => number {
  const salt = pcg((Math.imul(CONCERN[concern], 0x9e3779b9) ^ Math.imul(key + 1, 0x85ebca6b)) >>> 0);
  const rng = mulberry32(pcg((seed ^ salt) >>> 0));
  rng();
  return rng;
}
/** A unit normal (Box-Muller), two draws. */
function gauss(rng: () => number): number {
  const u = 1 - rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}
const FILLER_STAR_KEY = 1000;
const FILLER_PLANET_KEY = 2000;
const BIRTH_GAP = 0.001;
/** Slots per star in a key (a star has at most 9). */
const SLOT_KEYS = 16;
/** The key of the stream that stratifies the filler slots' bare-or-not draws. */
const STRATA_KEY = 99_999;

/**
 * Filler births (the stacks network's law): the kind's count by growth g follows
 * `count (g / to)^exponent` (scripted bodies included), each filler born at a random point of its
 * slot, none before `from`, and in order.
 */
function fillerBirths(count: number, exponent: number, to: number, scripted: number[], from: number, rng: () => number): number[] {
  const total = count - scripted.length;
  const steps = 8000;
  const f: number[] = [];
  let best = 0;
  for (let i = 0; i <= steps; i++) {
    const g = (to * i) / steps;
    const s = scripted.filter((b) => b <= g).length;
    best = Math.max(best, count * (g / to) ** exponent - s);
    f.push(best);
  }
  const births: number[] = [];
  let prev = from - BIRTH_GAP;
  let i = 1;
  for (let k = 0; k < total; k++) {
    const y = Math.min(k + rng(), f[steps] - 1e-9);
    while (f[i] < y) i++;
    const g = (to * (i - 1 + (y - f[i - 1]) / (f[i] - f[i - 1]))) / steps;
    prev = Math.max(g, prev + BIRTH_GAP);
    births.push(prev);
  }
  return births;
}

/** Picks an index by weight from `rng`; −1 if every weight is 0. */
function pickWeighted(weights: number[], rng: () => number): number {
  const sum = weights.reduce((s, w) => s + w, 0);
  if (!(sum > 0)) return -1;
  let r = rng() * sum;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r < 0) return i;
  }
  return weights.length - 1;
}

const dist = (a: readonly number[], b: readonly number[]): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** A body before it has a row. */
interface Draft {
  key: number;
  id: string;
  alias?: string;
  kind: 'core' | 'star' | 'planet';
  born: number;
  dur: number;
  script?: ScriptedBody;
  spot?: [number, number, number];
  /** A star's slots, inner to outer. */
  slots?: SlotDraw[];
  /** A star's system radius. */
  outer?: number;
  /** A planet's star and slot, once known. */
  hostDraft?: Draft;
  slot?: number;
  /** Rows, once processed in birth order. */
  index?: number;
  parents?: Draft[];
  cracked?: boolean;
  hop?: number | null;
  hiAt?: number | null;
  fixAt?: number | null;
  rule?: Draft;
}

const halfBuilt = (d: Pick<Draft, 'born' | 'dur'>): number => d.born + 0.5 * d.dur;

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
 * The gap the fit keeps: between a star and its first planet's piece,
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
 * The moons' tracks round a planet (no two pieces may ever touch): track `t` sits at `MOON_TRACK[t]·R` or, if that
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
 * The apoapses of a star's planets with eccentricities `ecc(e0)` (no two pieces may ever touch), or null if the last
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
 * (no two pieces may ever touch), giving way as little as it must, in this order:
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

/** Spots for the core: R0 (and any pinned spot) where the story puts it, the rest seeded within the spread. */
function placeCore(seed: number, core: Draft[]): void {
  const placed: Draft[] = [];
  for (const d of [...core].sort((a, b) => (a.script?.spot ? 0 : 1) - (b.script?.spot ? 0 : 1) || a.key - b.key)) {
    if (d.script?.spot) {
      d.spot = [d.script.spot[0], 0, d.script.spot[1]];
    } else {
      const rng = rngFor(seed, 'spots', d.key);
      for (let attempt = 0; ; attempt++) {
        if (attempt > 10_000) throw new Error(`no room in the core for ${d.id}`);
        const rho = CORE_SPREAD * Math.sqrt(rng());
        const th = 2 * Math.PI * rng();
        const c: [number, number, number] = [rho * Math.cos(th), 0, rho * Math.sin(th)];
        if (placed.every((o) => dist(c, o.spot!) >= CORE_MIN_GAP)) {
          d.spot = c;
          break;
        }
      }
    }
    placed.push(d);
  }
}

/**
 * Spots for the stars (ruling 7, §14.2): a knot on arm 0 round the neighbourhood's middle (radius 65,
 * bearing 0.9), drawn out along the arm, every spot at a galactic radius in `HOOD_R` and every pair of
 * systems at least their outer radii plus a margin apart. Each star in turn (the scripted first, so
 * the story's plans sit in the middle) takes, of `HOOD_CANDIDATES` seeded spots, the free one nearest
 * the middle, measured on the ellipse of `HOOD_SPREAD` laid along the arm. That packs the thirty about
 * as tight as their gaps allow. (Drawn anywhere on the arm stretch instead, they do not fit: the arm
 * is narrow, and between radius 40 and 110 it winds most of the way round the core.) If the thirty do
 * not fit, the stretch reaches out to `HOOD_R_WIDE`.
 */
function placeStars(seed: number, stars: Draft[]): void {
  const mid = (HOOD_R[0] + HOOD_R[1]) / 2;
  const centre = [mid * Math.cos(HOOD_BEARING), 0, mid * Math.sin(HOOD_BEARING)];
  // The arm's direction at the middle (outward along it), and the direction across it.
  const t = [Math.cos(HOOD_BEARING) - Math.sin(HOOD_BEARING) / BG.pitch, Math.sin(HOOD_BEARING) + Math.cos(HOOD_BEARING) / BG.pitch];
  const tl = Math.hypot(t[0], t[1]);
  const along = [t[0] / tl, t[1] / tl];
  const across = [-along[1], along[0]];
  const order = [...stars].sort((a, b) => (a.script ? 0 : 1) - (b.script ? 0 : 1) || a.key - b.key);
  for (const rMax of [HOOD_R[1], HOOD_R_WIDE]) {
    const placed: Draft[] = [];
    for (const d of order) {
      const rng = rngFor(seed, 'spots', d.key + (rMax === HOOD_R[1] ? 0 : 50_000));
      let best: [number, number, number] | null = null;
      let bestScore = Infinity;
      for (let k = 0; k < HOOD_CANDIDATES; k++) {
        const u = HOOD_BOX * (2 * rng() - 1);
        const v = HOOD_BOX * (2 * rng() - 1);
        const c: [number, number, number] = [centre[0] + u * along[0] + v * across[0], 0, centre[2] + u * along[1] + v * across[1]];
        const r = Math.hypot(c[0], c[2]);
        const score = (u / HOOD_SPREAD[0]) ** 2 + (v / HOOD_SPREAD[1]) ** 2;
        if (score >= bestScore || r < HOOD_R[0] || r > rMax) continue;
        if (placed.every((o) => dist(c, o.spot!) >= d.outer! + o.outer! + HOOD_MARGIN)) {
          best = c;
          bestScore = score;
        }
      }
      if (!best) break;
      d.spot = best;
      placed.push(d);
    }
    if (placed.length === stars.length) return;
  }
  throw new Error(`the ${stars.length} systems do not fit on the arm stretch`);
}

export function generateGalaxy(seed: number, tier: Tier, budget: number): Galaxy {
  // 1. The core and the stars: who, when. The filler stars are born by the plans' law.
  const scriptedOf = (kind: ScriptedBody['kind']) => LINEAGE.map((s, key) => ({ s, key })).filter((x) => x.s.kind === kind);
  const draft = (key: number, s: ScriptedBody): Draft => ({
    key,
    id: s.id,
    ...(s.alias ? { alias: s.alias } : {}),
    kind: s.kind,
    born: s.born,
    dur: s.dur ?? DUR[s.kind],
    script: s,
  });
  const core = scriptedOf('core').map(({ s, key }) => draft(key, s));
  const stars = scriptedOf('star').map(({ s, key }) => draft(key, s));
  const coreFrom = Math.min(...core.map(halfBuilt));
  fillerBirths(
    STAR_COUNT,
    STAR_LAW_EXPONENT,
    STAR_BORN_BY,
    stars.map((d) => d.born),
    coreFrom,
    rngFor(seed, 'births', FILLER_STAR_KEY),
  ).forEach((born, k) => stars.push({ key: FILLER_STAR_KEY + k, id: `star-${k + 1}`, kind: 'star', born, dur: DUR.star }));

  // 2. Each star's slots and system radius; then the spots.
  const byId = new Map<string, Draft>();
  for (const d of [...core, ...stars]) byId.set(d.id, d);
  // The filler's slots draw bare-or-not stratified (a seeded permutation of N even strata), so the
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
  const fit: FitCounts = { systemsEased: 0, slotsDropped: 0, systemsFlattened: 0, moonsDropped: 0 };
  for (const d of stars) {
    const scripted = (HOSTS[d.id] ?? []).map((id) => LINEAGE.find((s) => s.id === id)!);
    const drawn = Array.from({ length: counts.get(d)! }, (_, k) => drawSlot(seed, d, k, scripted[k], u0.get(`${d.key}/${k}`) ?? null));
    d.slots = fitSystem(seed, d, drawn, scripted.length, fit);
    d.outer = d.slots.reduce((m, slot) => Math.max(m, slot.orbit.r + slotReach(slot)), STAR_R);
  }
  placeCore(seed, core);
  placeStars(seed, stars);

  // 3. The planets: the scripted ones in their host's first slots; the filler born by the code's law
  // into the free slots. A slot's planet can be born once its star is half built (and, for a star
  // carrying the defect, once the twelve's span is over: before it the defect spreads only along the
  // scripted lineage). The births are moved later where they must be so that every slot can be filled.
  const planets: Draft[] = [];
  for (const { s, key } of scriptedOf('planet')) {
    const d = draft(key, s);
    d.hostDraft = byId.get(s.host!)!;
    d.slot = HOSTS[s.host!].indexOf(s.id);
    planets.push(d);
    byId.set(d.id, d);
  }
  // A scripted star with a fix is one that carries the defect (its crack itself is derived in step 4).
  const scriptedCracked = (d: Draft): boolean => !!d.script && d.script.fixAt !== undefined;
  const release = (d: Draft): number => (scriptedCracked(d) && halfBuilt(d) <= G_TWELVE[1] ? G_TWELVE[1] + 1e-9 : halfBuilt(d));
  const free = new Map<Draft, number[]>();
  const releases: number[] = [];
  for (const d of stars) {
    const taken = (HOSTS[d.id] ?? []).length;
    const slots = d.slots!.map((_, k) => k).filter((k) => k >= taken);
    free.set(d, slots);
    releases.push(...slots.map(() => release(d)));
  }
  releases.sort((a, b) => a - b);
  const planetFrom = Math.min(...stars.map(halfBuilt));
  const totalSlots = stars.reduce((n, d) => n + d.slots!.length, 0);
  // Every planet is built, its moons landed, by growth 1.
  const planetsBy = 1 - DUR.planet;
  const births = fillerBirths(
    totalSlots,
    PLANET_LAW_EXPONENT,
    planetsBy,
    planets.map((d) => d.born),
    planetFrom,
    rngFor(seed, 'births', FILLER_PLANET_KEY),
  );
  for (let i = 0; i < births.length; i++) {
    births[i] = Math.max(births[i], releases[i], i > 0 ? births[i - 1] + 1e-6 : 0);
    if (births[i] > planetsBy) throw new Error('the filler planets cannot all be built by growth 1');
  }
  births.forEach((born, k) => planets.push({ key: FILLER_PLANET_KEY + k, id: `planet-${k + 1}`, kind: 'planet', born, dur: DUR.planet }));

  // 4. In birth order: parents, hosts, the defect, hops, lights.
  const order = [...core, ...stars, ...planets].sort((a, b) => a.born - b.born || (a.script ? 0 : 1) - (b.script ? 0 : 1) || a.key - b.key);
  const done: Draft[] = [];
  const eligible = (kind: Draft['kind'], at: number): Draft[] =>
    done.filter((n) => {
      if (n.kind !== kind || halfBuilt(n) > at + 1e-12) return false;
      // Before the twelve's span ends, the defect spreads only along the scripted lineage.
      if (n.cracked && at <= G_TWELVE[1]) return false;
      // Between the rule's fix and the first correct work, nothing new is built from the two rules.
      if ((n.id === SOURCE || n.id === AGENT_RULE) && at >= CLEAN_AFTER && at < CLEAN_WORK_FROM) return false;
      return true;
    });
  const nearest = (c: readonly number[], ns: Draft[]): Draft | null =>
    ns.reduce<Draft | null>((best, n) => (!best || dist(n.spot!, c) < dist(best.spot!, c) ? n : best), null);

  for (const d of order) {
    let parents: Draft[];
    if (d.script) {
      const ps = d.script.parents;
      if (ps === 'nearest-clean-star') {
        const clean = eligible('star', d.born).filter((n) => !n.cracked);
        const p = nearest(d.hostDraft!.spot!, clean);
        if (!p) throw new Error(`no clean star for ${d.id}`);
        parents = [p];
      } else {
        parents = ps.map((id) => {
          const p = byId.get(id)!;
          if (p.index === undefined && d.id !== FIRST) throw new Error(`${d.id} is born before its parent ${id}`);
          return p;
        });
      }
    } else if (d.kind === 'star') {
      const rng = rngFor(seed, 'parents', d.key);
      // A rule by age: the older a rule, the more plans are written from it.
      const rules = eligible('core', d.born);
      const ages = rules.map((n) => d.born - n.born);
      const main = rules[pickWeighted(ages, rng)];
      if (!main) throw new Error(`nothing to build ${d.id} from at ${d.born}`);
      parents = [main];
      if (rng() < REUSE_SHARE) {
        const second = nearest(d.spot!, eligible('star', d.born));
        if (second) parents.push(second);
      }
    } else {
      // A filler planet: a star with a free slot (by free slots), its innermost free slot; read from
      // the star, or a copy of one of the star's planets.
      const rng = rngFor(seed, 'parents', d.key);
      const hosts = eligible('star', d.born).filter((n) => free.get(n)!.length > 0);
      const room = hosts.map((n) => free.get(n)!.length);
      const host = hosts[pickWeighted(room, rng)];
      if (!host) throw new Error(`no free slot for ${d.id} at ${d.born}`);
      d.hostDraft = host;
      d.slot = free.get(host)!.shift()!;
      const copy = rng() < COPY_SHARE;
      const sources = copy ? eligible('planet', d.born).filter((n) => n.hostDraft === host) : [];
      parents = [sources.length > 0 ? sources[Math.floor(rng() * sources.length)] : host];
    }

    d.index = done.length;
    d.parents = parents;
    // The bike is clean, and there before its plan: its parent is not built yet.
    const live = d.id === FIRST ? [] : parents;
    d.cracked = d.id === SOURCE || (d.born < CLEAN_AFTER && live.some((p) => p.cracked));
    d.hop = d.id === SOURCE ? 0 : d.cracked ? Math.min(...live.filter((p) => p.cracked).map((p) => p.hop! + 1)) : null;
    d.hiAt = d.script ? (d.script.hiAt ?? null) : d.cracked ? HI_AT_BIRTH : null;
    d.fixAt = d.script ? (d.script.fixAt ?? null) : null;
    d.rule = d.kind === 'core' ? d : parents[0].rule;
    done.push(d);
  }
  // N0 is born before its plan: its rule is its plan's.
  for (const d of done) if (!d.rule) d.rule = d.parents![0].rule;

  // 5. The sweep: every other body that carries the defect is rebuilt in the order (stars before
  // planets, then by hop from R0, then by birth); the scripted carry their designed `fixAt`, and each
  // run of filler between two of them is spaced evenly between their values.
  sweep(done);

  // 6. Rows: the bodies in birth order, each planet's moons after it, landing in the last 30 % of its build.
  interface Proto {
    d: Draft;
    moon?: { j: number; draw: MoonDraw };
    born: number;
  }
  const protos: Proto[] = done.map((d) => ({ d, born: d.born }));
  for (const d of done) {
    if (d.kind !== 'planet') continue;
    const moons = d.hostDraft!.slots![d.slot!].moons;
    moons.forEach((draw, j) => protos.push({ d, moon: { j, draw }, born: d.born + d.dur * (0.7 + (0.3 * (j + 1)) / moons.length) }));
  }
  protos.sort(
    (a, b) => a.born - b.born || (a.moon ? 1 : 0) - (b.moon ? 1 : 0) || a.d.index! - b.d.index! || (a.moon?.j ?? 0) - (b.moon?.j ?? 0),
  );
  const row = new Map<Draft, number>();
  protos.forEach((p, i) => !p.moon && row.set(p.d, i));

  const r0Seed = derpSeedFor(seed);
  const bodies: Body[] = protos.map((p, index): Body => {
    const d = p.d;
    const rowOf = (x: Draft): number => row.get(x)!;
    const key = p.moon ? d.key * 8 + p.moon.j + 100_000 : d.key;
    const derpPhase = rngFor(seed, 'derps', key)();
    const shared = {
      index,
      cracked: d.cracked!,
      hero: false,
      hiAt: d.hiAt!,
      fixAt: d.fixAt!,
      hop: d.hop!,
      derpSeed: d.cracked ? r0Seed : NODE_NEVER,
      derpPhase,
      rule: rowOf(d.rule!),
      lattice: [0, 0] as [number, number],
      motes: 0,
      personMotes: 0,
    };
    if (p.moon) {
      const { j, draw } = p.moon;
      return {
        ...shared,
        id: `${d.id}-m${j + 1}`,
        kind: 'moon',
        scripted: false,
        parents: [],
        host: rowOf(d),
        star: rowOf(d.hostDraft!),
        planet: rowOf(d),
        born: p.born,
        dur: 0,
        R: draw.R,
        orbit: draw.orbit,
        spot: null,
        partGroup: draw.partGroup,
        stream: null,
      };
    }
    const planet = d.kind === 'planet';
    const slot = planet ? d.hostDraft!.slots![d.slot!] : null;
    return {
      ...shared,
      id: d.id,
      ...(d.alias ? { alias: d.alias } : {}),
      kind: d.kind,
      scripted: !!d.script,
      parents: d.parents!.map(rowOf),
      host: planet ? rowOf(d.hostDraft!) : -1,
      star: d.kind === 'star' ? index : planet ? rowOf(d.hostDraft!) : -1,
      planet: planet ? index : -1,
      born: d.born,
      dur: d.dur,
      hero: !!d.script?.hero,
      R: slot ? slot.R : d.kind === 'core' ? CORE_R : STAR_R,
      orbit: slot ? slot.orbit : null,
      spot: planet ? null : d.spot!,
      partGroup: null,
      stream: null,
    };
  });

  // 7. Streams, now every parent has a row.
  const streams: Stream[] = [];
  for (const b of bodies) {
    b.parents.forEach((pi, slot) => {
      const p = bodies[pi];
      const kind: StreamKind =
        p.kind === b.kind ? 'side' : (p.kind === 'core' && b.kind === 'star') || (p.kind === 'star' && b.kind === 'planet') ? 'out' : 'in';
      if (kind === 'in' && !(p.kind === 'planet' && b.kind === 'core')) throw new Error(`no stream from a ${p.kind} to a ${b.kind}`);
      const carried = p.cracked && b.cracked;
      if (slot === 0) b.stream = streams.length;
      streams.push({
        from: pi,
        to: b.index,
        kind,
        born: Math.max(b.born, halfBuilt(p)),
        hiAt: carried ? b.hiAt : null,
        hop: carried ? p.hop! + 1 : null,
        bow: 2 * Math.PI * rngFor(seed, 'bows', b.index * 4 + slot)(),
      });
    });
  }

  // 8. Shells and person sets, thinned only if the budget is short.
  const motes = fitBudget(bodies, budget);

  const ids: Record<string, number> = {};
  for (const b of bodies) {
    ids[b.id] = b.index;
    if (b.alias) ids[b.alias] = b.index;
  }
  const systems = bodies.filter((b) => b.kind === 'star').map((b) => b.index);
  const hoodCentroid: [number, number, number] = [0, 0, 0];
  for (const i of systems) for (let k = 0; k < 3; k++) hoodCentroid[k] += bodies[i].spot![k] / systems.length;
  return {
    seed,
    tier,
    bodies,
    streams,
    feedFrom: ids[SOURCE],
    visits: [...REVIEW_VISITS],
    ids,
    systems,
    hoodCentroid,
    background: generateBackground(
      seed,
      tier,
      systems.map((i) => bodies[i].spot!),
    ),
    motes,
  };
}

/** The source's derp seed: an integer in [0, 2^24) (exact in float32), never `NODE_NEVER`. */
function derpSeedFor(seed: number): number {
  const s = pcg((seed ^ 0x2545f491) >>> 0) >>> 8;
  return s === NODE_NEVER ? s + 1 : s;
}

/** The sweep's fixes (fx-4), as the stacks network's (see step 5). */
function sweep(ds: Draft[]): void {
  const own = new Set<string>(OWN_FIXES);
  const swept = ds
    .filter((n) => n.cracked && !own.has(n.id))
    .sort((a, b) => (a.kind === 'star' ? 0 : 1) - (b.kind === 'star' ? 0 : 1) || a.hop! - b.hop! || a.born - b.born || a.index! - b.index!);
  let lo: number | null = null;
  let run: Draft[] = [];
  const flush = (hi: number) => {
    const from = lo ?? SWEEP[0];
    if (run.length > 0 && hi <= from) throw new Error(`no room in the sweep before ${hi}`);
    run.forEach((n, i) => (n.fixAt = from + ((hi - from) * (i + 1)) / (run.length + 1)));
    run = [];
  };
  for (const n of swept) {
    if (!n.script) {
      run.push(n);
      continue;
    }
    if (n.fixAt === null || n.fixAt === undefined || (lo !== null && n.fixAt <= lo))
      throw new Error(`the sweep's order puts ${n.id} out of turn`);
    flush(n.fixAt);
    lo = n.fixAt;
  }
  flush(SWEEP[1]);
}

/** A body's full lattice: the hero planet's, a core body's, a star's, or scaled with its radius. */
function baseLattice(b: Body): [number, number] {
  if (b.kind === 'core') return [...LATTICE.core];
  if (b.kind === 'star') return [...LATTICE.star];
  if (b.kind === 'planet') return b.id === HERO_PLANET ? [...LATTICE.hero] : planetLattice(b.R);
  return moonLattice(b.R);
}

/** A body's person set for a shell of `motes`. */
function personFor(b: Body, motes: number): number {
  if (!b.cracked) return 0;
  if (b.kind === 'moon') return PERSON_MOON;
  if (b.kind === 'planet' && b.hero) return PERSON_HERO_PLANET;
  return Math.max(PERSON_MIN, Math.round(PERSON_SHARE * motes));
}

/**
 * Sets every body's lattice, motes and person set. At full detail if that fits the budget. Else the
 * shells the story does not name are thinned first: every planet's and moon's rows and columns but
 * the hero planet's, scaled by the largest factor that fits (never under 3 × 6), so the hero planet,
 * the core and the stars keep their lattices. Only if the thinnest of those still does not fit are
 * the named lattices scaled too. Returns the total.
 */
function fitBudget(bodies: Body[], budget: number): number {
  const base = bodies.map(baseLattice);
  const named = bodies.map((b) => b.kind === 'core' || b.kind === 'star' || b.id === HERO_PLANET);
  const scale = ([rows, cols]: [number, number], f: number): [number, number] =>
    f >= 1 ? [rows, cols] : [Math.max(3, Math.round(rows * f)), Math.max(6, Math.round(cols * f))];
  const apply = (fOther: number, fNamed: number): number => {
    let total = 0;
    bodies.forEach((b, i) => {
      b.lattice = scale(base[i], named[i] ? fNamed : fOther);
      b.motes = latticeCount(...b.lattice);
      b.personMotes = personFor(b, b.motes);
      total += b.motes + b.personMotes;
    });
    return total;
  };
  /** The largest f in [0, 1] with `fits(f)`, given `fits(0)`. */
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
  if (apply(1, 1) <= budget) return apply(1, 1);
  if (apply(0, 1) <= budget)
    return apply(
      largest((f) => apply(f, 1) <= budget),
      1,
    );
  return apply(
    0,
    largest((f) => apply(0, f) <= budget),
  );
}
