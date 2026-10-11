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
/** The bearing scatter of a star's spot about arm 0: the background arm's (`BG.scatter`, narrowing outward). */
export const HOOD_SCATTER = BG.scatter;

/** How long a body takes to build, by kind (the stacks network's layers). */
export const DUR: Readonly<Record<'core' | 'star' | 'planet', number>> = { core: 0.06, star: 0.03, planet: 0.012 };
/**
 * Every filler star is born by this growth, so its planets have time to be born into its slots
 * before growth 1: the stacks network's birth law for plans, run over [0, STAR_BORN_BY].
 */
export const STAR_BORN_BY = 0.9;
/** The filler's birth laws (the stacks network's): count by growth g is `total · (g / to)^exponent`. */
const STAR_LAW = { exponent: 1 };
const PLANET_LAW = { exponent: 1.3 };
/** The share of filler planets that copy a planet of their system instead of reading the star. */
export const COPY_SHARE = 0.15;
/** The share of filler stars that also reuse an earlier star (a second, sideways stream). */
export const REUSE_SHARE = 0.1;

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

/** A moon as drawn for its slot. */
interface MoonDraw {
  R: number;
  orbit: OrbitElements;
  partGroup: number | null;
}
/** A planet slot of a star, as drawn: who fills it is decided later (a scripted planet, or the filler). */
interface SlotDraw {
  R: number;
  orbit: OrbitElements;
  moons: MoonDraw[];
}
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

/** A star's slots: the count, the orbits, and each slot's planet size and moons (pinned where the story pins them). */
function drawSlots(seed: number, star: Draft, scripted: readonly ScriptedBody[]): SlotDraw[] {
  const rng = rngFor(seed, 'slots', star.key);
  const n = Math.max(planetCount(rng()), scripted.length);
  const radii = planetOrbitRadii(n, rng);
  return radii.map((r, k) => {
    const prng = rngFor(seed, 'planets', star.key * SLOT_KEYS + k);
    const pin = scripted[k];
    const drawnR = planetRadius(gauss(prng));
    const drawnMoons = moonCount(prng(), prng());
    const R = pin?.R ?? drawnR;
    const m = pin?.moons ?? drawnMoons;
    const orbit = orbitFor('planet', r, planetPeriod(r), prng);
    const trackPhase = [prng(), prng(), prng()];
    const onTrack = [0, 1, 2].map((t) => Array.from({ length: m }, (_, j) => moonTrack(j, m)).filter((x) => x === t).length);
    const seen = [0, 0, 0];
    const isFirst = pin?.id === FIRST;
    const maxShare = Math.max(...N0_PART_SHARE);
    const moons = Array.from({ length: m }, (_, j): MoonDraw => {
      const t = moonTrack(j, m);
      const drawn = moonRadius(R, gauss(prng));
      const mR = isFirst ? Math.max(0.04, 0.35 * R * Math.sqrt(N0_PART_SHARE[j] / maxShare)) : drawn;
      const o = orbitFor('moon', MOON_TRACK[t] * R, MOON_PERIOD[t], prng);
      // The moons of a track are spaced evenly round it, from the track's seeded phase.
      const q = seen[t]++;
      const phase = (trackPhase[t] + q / onTrack[t]) % 1;
      return { R: mR, orbit: { ...o, phase }, partGroup: isFirst ? j + 1 : null };
    });
    return { R, orbit, moons };
  });
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
 * Spots for the stars on the arm stretch (ruling 7): a radius in the stretch, a bearing on arm 0
 * within its scatter, every pair of systems at least their outer radii plus a margin apart. The
 * widest systems are placed first. If the thirty do not fit, the stretch reaches out to `HOOD_R_WIDE`.
 */
function placeStars(seed: number, stars: Draft[]): void {
  const order = [...stars].sort((a, b) => b.outer! - a.outer! || a.key - b.key);
  for (const rMax of [HOOD_R[1], HOOD_R_WIDE]) {
    const placed: Draft[] = [];
    for (const d of order) {
      const rng = rngFor(seed, 'spots', d.key + (rMax === HOOD_R[1] ? 0 : 50_000));
      for (let attempt = 0; attempt < 4000; attempt++) {
        const r = HOOD_R[0] + (rMax - HOOD_R[0]) * rng();
        const th = armAngleAt(r, ARM_PHASE, 0) + HOOD_SCATTER * (1 - (0.5 * r) / BG.radius) * (2 * rng() - 1);
        const c: [number, number, number] = [r * Math.cos(th), 0, r * Math.sin(th)];
        if (placed.every((o) => dist(c, o.spot!) >= d.outer! + o.outer! + HOOD_MARGIN)) {
          d.spot = c;
          placed.push(d);
          break;
        }
      }
      if (placed[placed.length - 1] !== d) break;
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
  fillerBirths(STAR_COUNT, STAR_LAW.exponent, STAR_BORN_BY, stars.map((d) => d.born), coreFrom, rngFor(seed, 'births', FILLER_STAR_KEY)).forEach(
    (born, k) => stars.push({ key: FILLER_STAR_KEY + k, id: `star-${k + 1}`, kind: 'star', born, dur: DUR.star }),
  );

  // 2. Each star's slots and system radius; then the spots.
  const byId = new Map<string, Draft>();
  for (const d of [...core, ...stars]) byId.set(d.id, d);
  for (const d of stars) {
    const scripted = (HOSTS[d.id] ?? []).map((id) => LINEAGE.find((s) => s.id === id)!);
    d.slots = drawSlots(seed, d, scripted);
    d.outer = d.slots.reduce((m, s) => Math.max(m, s.orbit.r + pieceReach(s.R, s.moons.map((x) => ({ r: x.orbit.r, R: x.R })))), STAR_R);
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
    for (const _ of slots) releases.push(release(d));
  }
  releases.sort((a, b) => a - b);
  const planetFrom = Math.min(...stars.map(halfBuilt));
  const totalSlots = stars.reduce((n, d) => n + d.slots!.length, 0);
  const births = fillerBirths(totalSlots, PLANET_LAW.exponent, 1, planets.map((d) => d.born), planetFrom, rngFor(seed, 'births', FILLER_PLANET_KEY));
  for (let i = 0; i < births.length; i++) {
    births[i] = Math.max(births[i], releases[i], i > 0 ? births[i - 1] + 1e-6 : 0);
    if (births[i] > 1) throw new Error('the filler planets cannot all be born by growth 1');
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
        const p = nearest(d.hostDraft!.spot!, eligible('star', d.born).filter((n) => !n.cracked));
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
      const rules = eligible('core', d.born);
      const main = rules[pickWeighted(rules.map((n) => d.born - n.born), rng)];
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
      const host = hosts[pickWeighted(hosts.map((n) => free.get(n)!.length), rng)];
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
    moon?: { j: number; of: number; draw: MoonDraw };
    born: number;
  }
  const protos: Proto[] = done.map((d) => ({ d, born: d.born }));
  for (const d of done) {
    if (d.kind !== 'planet') continue;
    const moons = d.hostDraft!.slots![d.slot!].moons;
    moons.forEach((draw, j) => protos.push({ d, moon: { j, of: moons.length, draw }, born: d.born + d.dur * (0.7 + (0.3 * (j + 1)) / moons.length) }));
  }
  protos.sort((a, b) => a.born - b.born || (a.moon ? 1 : 0) - (b.moon ? 1 : 0) || a.d.index! - b.d.index! || (a.moon?.j ?? 0) - (b.moon?.j ?? 0));
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
  const hoodCentroid = systems
    .map((i) => bodies[i].spot!)
    .reduce<[number, number, number]>((c, s) => [c[0] + s[0] / systems.length, c[1] + s[1] / systems.length, c[2] + s[2] / systems.length], [0, 0, 0]);
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
    background: generateBackground(seed, tier, hoodCentroid),
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
    if (n.fixAt === null || n.fixAt === undefined || (lo !== null && n.fixAt <= lo)) throw new Error(`the sweep's order puts ${n.id} out of turn`);
    flush(n.fixAt);
    lo = n.fixAt;
  }
  flush(SWEEP[1]);
}

/** A body's full lattice: the hero planet's, a core body's, a star's, or scaled with its radius. */
function baseLattice(b: Body): [number, number] {
  if (b.kind === 'core') return [...LATTICE.core];
  if (b.kind === 'star') return [...LATTICE.star];
  if (b.kind === 'planet') return b.hero ? [...LATTICE.hero] : planetLattice(b.R);
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
 * Sets every body's lattice, motes and person set. At full detail if that fits the budget; else every
 * lattice's rows and columns are scaled by the largest factor that fits (never under 3 × 6). Returns
 * the total.
 */
function fitBudget(bodies: Body[], budget: number): number {
  const base = bodies.map(baseLattice);
  const apply = (f: number): number => {
    let total = 0;
    bodies.forEach((b, i) => {
      const [rows, cols] = base[i];
      b.lattice = f >= 1 ? [rows, cols] : [Math.max(3, Math.round(rows * f)), Math.max(6, Math.round(cols * f))];
      b.motes = latticeCount(...b.lattice);
      b.personMotes = personFor(b, b.motes);
      total += b.motes + b.personMotes;
    });
    return total;
  };
  if (apply(1) <= budget) return apply(1);
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (apply(mid) <= budget) lo = mid;
    else hi = mid;
  }
  return apply(lo);
}
