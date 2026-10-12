import { describe, expect, it } from 'vitest';
import { MOTE_BUDGET_DESKTOP, MOTE_SEED } from '../config';
import { CLEAN_AFTER, G_TWELVE, HI_AT_BIRTH, HI_TWELVE, REVIEW_VISITS, SWEEP, TWELVE } from './schedule';
import { bike, partShares } from '../mechanisms/bike';
import { NODE_NEVER } from '../scene/node/birth';
import { BG } from './background';
import { BIN, LATTICE, MOON_TRACK, binaryPeriod, forcedEccentricity, hwS, latticeCount, moonLattice, planetLattice, starMass } from './body';
import { packBodyData } from '../scene/node/bodyData';
import { bodyGalactic, elementsAt, orbitLocal } from '../scene/node/orbit';
import { streamFor } from './seeds';
import { holeInstances } from './hole';
import { STAR_LOOK } from '../scene/node/classLook';
import {
  CORE_MIN_GAP,
  CORE_SPREAD,
  FULL_DENSITY,
  HERO_PLANET,
  HOOD_BEARING,
  HOOD_MARGIN,
  HOOD_PITCH,
  HOOD_R,
  HOOD_R_WIDE,
  HOOD_SPACING,
  HOOD_SPREAD,
  MOON_MARGIN_SHARE,
  PLANET_MARGIN,
  STAR_COUNT,
  SYS_MAX,
  bodyIndex,
  GALAXY_SHARE,
  galaxyBudget,
  generateGalaxy,
  type HoodMode,
  PERSON_MIN,
  anchorOf,
  systemOuter,
  type Body,
  type Galaxy,
} from './generate';
import { HOSTS, LINEAGE, OWN_FIXES, SOURCE } from './lineage';

const g = generateGalaxy(MOTE_SEED, 'desktop', galaxyBudget(MOTE_BUDGET_DESKTOP));
const byId = (x: Galaxy, id: string): Body => x.bodies[bodyIndex(x, id)];
const moonsOf = (x: Galaxy, id: string): Body[] => x.bodies.filter((b) => b.kind === 'moon' && b.host === bodyIndex(x, id));
const planetsOf = (x: Galaxy, star: number): Body[] => x.bodies.filter((b) => b.kind === 'planet' && b.host === star);
const kinds = (x: Galaxy, kind: Body['kind']): Body[] => x.bodies.filter((b) => b.kind === kind);
const dist = (a: readonly number[], b: readonly number[]): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/**
 * The neighbourhood's spacing (Task 1d's rule, and re-skin Task 1e's for a binary's stars): every two
 * stars not of one pair, each where it can come nearest (a single at its spot; a binary's star at its
 * barycentre's spot, swung out by its orbit's apoapsis about it), at least HOOD_SPACING × the sum of
 * their own systems' reaches plus HOOD_MARGIN apart. The least of those margins over the galaxy.
 */
function leastSpacing(x: Galaxy): { margin: number; between: string } {
  const at = (s: Body) => (s.spot ? { spot: s.spot, swing: 0 } : { spot: x.bodies[s.host].spot!, swing: s.orbit!.r });
  const stars = x.bodies.filter((b) => b.kind === 'star');
  let least = { margin: Infinity, between: '' };
  for (let i = 0; i < stars.length; i++)
    for (let j = i + 1; j < stars.length; j++) {
      const [s, t] = [stars[i], stars[j]];
      if (s.host >= 0 && s.host === t.host) continue;
      const [a, b] = [at(s), at(t)];
      const margin = dist(a.spot, b.spot) - a.swing - b.swing - (HOOD_SPACING * (systemOuter(x, s.index) + systemOuter(x, t.index)) + HOOD_MARGIN);
      if (margin < least.margin) least = { margin, between: `${s.id} and ${t.id}` };
    }
  return least;
}

/**
 * Every instance the galaxy counts (plan Task 5's budget test, and the re-skin's §7): shells and person
 * sets; 90 dots per planet orbit and 40 per moon track (a track's moons share it); an icosphere per
 * planet and moon (none for a star, a core row or a barycentre) and a ghost per planet or moon that
 * carries the defect; a glow per star; each stream's dots, one per 1.2 units of its longest chord
 * between 6 and 40, plus the feed's 40; 96 spike dots per star; and the hole's 27,610, drawn since the
 * re-skin's Task 5 (the core rows draw nothing).
 */
function drawnInstances(x: Galaxy): number {
  const planets = kinds(x, 'planet');
  const tracks = planets.reduce((n, p) => n + 90 + 40 * new Set(moonsOf(x, p.id).map((m) => m.orbit!.r)).size, 0);
  const ghosts = x.bodies.filter((b) => b.cracked && (b.kind === 'planet' || b.kind === 'moon')).length;
  const glow = kinds(x, 'star').length;
  // A body's fixed spot up its host chain (a binary's star's is its barycentre's), and the apoapses on the way.
  const centre = (b: Body): readonly number[] => (b.spot ? b.spot : centre(x.bodies[b.host]));
  const reach = (b: Body): number => (b.spot ? 0 : reach(x.bodies[b.host]) + b.orbit!.r);
  const dots = x.streams.reduce((n, s) => {
    const [a, b] = [x.bodies[s.from], x.bodies[s.to]];
    // Ceil: the shader draws an unrounded count, the last dot partly (stream.ts streamCount).
    return n + Math.min(40, Math.max(6, Math.ceil((dist(centre(a), centre(b)) + reach(a) + reach(b)) / 1.2)));
  }, 40);
  const shells = x.bodies.reduce((n, b) => n + b.motes + b.personMotes, 0);
  const stars = kinds(x, 'star').length;
  // An icosphere per planet and moon: none for a star, a core row or a barycentre (which draw none).
  const icospheres = kinds(x, 'planet').length + kinds(x, 'moon').length;
  // The plans' schematics (re-skin §4.7, Task 7b): the two pools and a pair's marks per binary pair.
  const pairs = new Set(kinds(x, 'star').filter((b) => b.host >= 0).map((b) => b.host)).size;
  return shells + tracks + icospheres + ghosts + glow + dots + 96 * stars + 27_610 + 3_800 + 760 + 294 * pairs;
}

/**
 * The neighbourhood's units' spots [x, z] (y 0; a binary's barycentre for its pair), copied from
 * scratch/session/galaxytuner/hood.txt. Re-pinned by the re-skin's Task 1e (the designed change: the
 * story's seed has one binary, star-7 and star-14, on its stars' barycentre, nudged 3.41; every
 * single star keeps its Task 1d spot), so 29 spots: before it, 30 star spots, the first and last
 * [36.60935229815551, 55.28699773763559] and [132.77024894223192, 7.513180951214093]. Re-pinned by
 * Task 1d before that (systems at least HOOD_SPACING 1.5 × their outer radii apart): before it, the
 * first and last were [40.56849831458735, 50.916398553737885] and [-56.58197443306347, 69.75555196235015].
 */
const HOOD_SPOTS: readonly (readonly [number, number])[] = [
  [36.60935229815551, 55.28699773763559],
  [-3.064983303006141, 97.11884645179722],
  [-24.990025384909995, 81.95654992999428],
  [60.288409581708244, 33.4309767319346],
  [35.3210495971816, 30.28844072500911],
  [103.0327984931982, 18.0248212178328],
  [98.8646523258612, 67.44789957337133],
  [-19.5209699380317, 52.305502095801565],
  [20.952504373583334, 83.21883327832168],
  [41.42997024847768, -34.892121917870135],
  [67.46707959517133, 66.48817195445919],
  [87.23743634965058, 102.0355246266771],
  [-6.073098316343183, 126.25640973596569],
  [100.63741312535996, -19.727398707314485],
  [3.487486748531065, 42.985073835873195],
  [-2.3987743251210105, 70.40602408168174],
  [40.78987092169486, 5.429809842542184],
  [75.51605236188338, 1.7019270426147586],
  [53.99874093697776, 97.76772659891508],
  [112.22196816165535, 41.68653532101668],
  [48.78983701169009, 124.46068779638647],
  [-28.381013045141856, 28.776705769474084],
  [87.81475314975592, 42.13670975351566],
  [23.153999527203595, 115.35336764758912],
  [-44.361732604201215, 57.55939241572435],
  [-28.411178979802266, 107.8003212843932],
  [28.7306202411107, 147.2105805244047],
  [131.16769501256698, 58.02088727709871],
  [132.77024894223192, 7.513180951214093],
];

/** A lattice at most its full size, never under 3 × 6. */
function thinned(lattice: readonly number[], full: readonly number[]): void {
  expect(lattice[0]).toBeLessThanOrEqual(full[0]);
  expect(lattice[1]).toBeLessThanOrEqual(full[1]);
  expect(lattice[0]).toBeGreaterThanOrEqual(Math.min(3, full[0]));
  expect(lattice[1]).toBeGreaterThanOrEqual(Math.min(6, full[1]));
}

describe('generateGalaxy', () => {
  it('is deterministic and seed-sensitive', () => {
    const again = generateGalaxy(MOTE_SEED, 'desktop', galaxyBudget(MOTE_BUDGET_DESKTOP));
    expect(again).toEqual(g);
    const other = generateGalaxy(MOTE_SEED + 1, 'desktop', galaxyBudget(MOTE_BUDGET_DESKTOP));
    expect(other.bodies.map((b) => b.spot)).not.toEqual(g.bodies.map((b) => b.spot));
    expect(other.bodies.length === g.bodies.length && other.bodies.every((b, i) => b.R === g.bodies[i].R)).toBe(false);
  });

  it('the tier changes the background only', () => {
    const phone = generateGalaxy(MOTE_SEED, 'phone', galaxyBudget(MOTE_BUDGET_DESKTOP));
    expect(phone.bodies).toEqual(g.bodies);
    expect(phone.streams).toEqual(g.streams);
    expect(phone.background.stars.length + phone.background.bright.length).toBe(4 * BG.stars.phone);
    expect(phone.tier).toBe('phone');
  });

  it('indexes every body by id and alias, in birth order, the barycentres last', () => {
    const bary = kinds(g, 'bary').length;
    expect(bary).toBeGreaterThan(0);
    g.bodies.forEach((b, i) => {
      expect(b.index).toBe(i);
      expect(bodyIndex(g, b.id)).toBe(i);
      if (b.alias) expect(bodyIndex(g, b.alias)).toBe(i);
      // A barycentre draws nothing: its row comes after every body's, so it moves no row before it.
      expect(b.kind === 'bary', b.id).toBe(i >= g.bodies.length - bary);
      if (i > 0 && b.kind !== 'bary') expect(b.born).toBeGreaterThanOrEqual(g.bodies[i - 1].born);
    });
    expect(bodyIndex(g, 'C19')).toBe(bodyIndex(g, 'V3'));
    expect(() => bodyIndex(g, 'nope')).toThrow();
    for (const s of LINEAGE) expect(byId(g, s.id).scripted).toBe(true);
  });

  it('has six core bodies, R0 at the centre, the rest within 12 and ≥ 5 apart', () => {
    const core = kinds(g, 'core');
    expect(core.map((b) => b.id).sort()).toEqual(['R0', 'R1', 'R_a', 'R_b', 'R_c', 'R_d']);
    expect(byId(g, 'R0').spot).toEqual([0, 0, 0]);
    for (const b of core) {
      expect(b.R).toBe(1.4);
      // The core rows stay in the model and draw nothing (re-skin §3, Task 5): the hole is drawn in their place.
      expect([b.lattice, b.motes, b.personMotes]).toEqual([null, 0, 0]);
      expect(b.orbit).toBeNull();
      expect(Math.hypot(...b.spot!)).toBeLessThanOrEqual(CORE_SPREAD);
      for (const o of core) if (o !== b) expect(dist(b.spot!, o.spot!)).toBeGreaterThanOrEqual(CORE_MIN_GAP);
    }
  });

  it('has STAR_COUNT stars on the arm stretch, every system disjoint', () => {
    const stars = kinds(g, 'star');
    expect(stars).toHaveLength(STAR_COUNT);
    expect(g.systems).toEqual(stars.map((s) => s.index));
    // One system per unit: a single star, or a binary's barycentre (in its first star's place).
    expect(g.units).toEqual([...new Set(stars.map((s) => (s.host >= 0 ? s.host : s.index)))]);
    expect(g.units.length).toBeLessThanOrEqual(SYS_MAX);
    const units = g.units.map((i) => g.bodies[i]);
    for (const s of stars) {
      expect(s.R).toBe(0.9);
      expect(s.lattice).toBeNull();
      // A single star has its spot; a binary's has none (it goes round its barycentre, which has it).
      expect(s.spot === null, s.id).toBe(s.host >= 0);
    }
    for (const u of units) {
      const r = Math.hypot(u.spot![0], u.spot![2]);
      expect(r).toBeGreaterThanOrEqual(HOOD_R[0]);
      expect(r).toBeLessThanOrEqual(HOOD_R_WIDE);
    }
    for (let i = 0; i < units.length; i++) {
      for (let j = i + 1; j < units.length; j++) {
        const gap = dist(units[i].spot!, units[j].spot!);
        expect(gap).toBeGreaterThanOrEqual(systemOuter(g, units[i].index) + systemOuter(g, units[j].index) + 1);
      }
    }
    const n = units.length;
    const c = units.reduce((a, s) => [a[0] + s.spot![0] / n, a[1] + s.spot![1] / n, a[2] + s.spot![2] / n], [0, 0, 0]);
    for (let k = 0; k < 3; k++) expect(g.hoodCentroid[k]).toBeCloseTo(c[k], 9);
  });

  it('the neighbourhood does not move', () => {
    // The systems' spots (a binary's barycentre for its pair), in order, as the tuner's neighbourhood
    // holds them (its hood.txt, [x, z], y 0).
    // placeStars lays them along HOOD_PITCH, not the arms' pitch, so a re-tuned arm moves none of them.
    expect(g.units).toHaveLength(HOOD_SPOTS.length);
    g.units.forEach((i, k) => {
      const spot = g.bodies[i].spot!;
      expect(Math.abs(spot[0] - HOOD_SPOTS[k][0]), `spot ${k} x`).toBeLessThanOrEqual(1e-9);
      expect(spot[1], `spot ${k} y`).toBe(0);
      expect(Math.abs(spot[2] - HOOD_SPOTS[k][1]), `spot ${k} z`).toBeLessThanOrEqual(1e-9);
    });
  });

  describe('the wider neighbourhood (re-skin Task 1d), seeds 1–40 on both tiers', () => {
    const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1);
    const memo = new Map<string, Galaxy>();
    /** The galaxy of `seed` on `tier`, generated once (it throws if its thirty do not fit). */
    const of = (seed: number, tier: 'phone' | 'desktop'): Galaxy => {
      const key = `${seed} ${tier}`;
      if (!memo.has(key)) memo.set(key, generateGalaxy(seed, tier, galaxyBudget(MOTE_BUDGET_DESKTOP)));
      return memo.get(key)!;
    };
    const each = (fn: (x: Galaxy, where: string) => void) => {
      for (const tier of ['phone', 'desktop'] as const) for (const seed of SEEDS) fn(of(seed, tier), `${tier} seed ${seed}`);
    };
    /** Each star's nearest other star, seed 1. */
    const nearest = (x: Galaxy): number[] => {
      const spots = x.units.map((i) => x.bodies[i].spot!);
      return spots.map((s, i) => Math.min(...spots.map((o, j) => (i === j ? Infinity : dist(s, o)))));
    };

    it('places thirty for every seed', () => {
      // Measured: every seed of 1–40 fits through the wide pass; the widest galactic radius used is
      // 149.99 (seed 1's farthest spot), against HOOD_R_WIDE 150.
      let widest = 0;
      each((x, where) => {
        expect(x.systems, where).toHaveLength(STAR_COUNT);
        for (const i of x.units) widest = Math.max(widest, Math.hypot(x.bodies[i].spot![0], x.bodies[i].spot![2]));
      });
      expect(widest).toBeLessThanOrEqual(HOOD_R_WIDE);
    }, 120_000);

    it('keeps every pair of systems at least 1.5 × their outer radii plus the margin apart', () => {
      expect(HOOD_SPACING).toBe(1.5);
      expect(HOOD_MARGIN).toBe(1);
      // A binary's star (Task 1e) as a single is spaced, from where it swings nearest (leastSpacing).
      each((x, where) => {
        const least = leastSpacing(x);
        expect(least.margin, `${where}: ${least.between}`).toBeGreaterThanOrEqual(-1e-9);
      });
      // The neighbourhood grows by about the spacing: seed 1's nearest-neighbour mean was 18.63 (least
      // 14.07, RMS spread about the centroid 55.19); measured at Task 1d 27.48 (least 24.41, RMS 67.67),
      // 1.475×. Since Task 1e it is taken between units, a pair's at its barycentre.
      const nn = nearest(g);
      const mean = nn.reduce((s, v) => s + v, 0) / nn.length;
      expect(mean / 18.63).toBeGreaterThanOrEqual(1.3);
      expect(mean / 18.63).toBeLessThanOrEqual(1.7);
    }, 120_000);

    it('keeps the first plan in the middle', () => {
      // The scripted stars are placed first, nearest the middle (radius 65, bearing 0.9) on the
      // HOOD_SPREAD ellipse laid along the arm at HOOD_PITCH, so P_a keeps the spot nearest it.
      const mid = (HOOD_R[0] + HOOD_R[1]) / 2;
      const centre = [mid * Math.cos(HOOD_BEARING), mid * Math.sin(HOOD_BEARING)];
      const t = [Math.cos(HOOD_BEARING) - Math.sin(HOOD_BEARING) / HOOD_PITCH, Math.sin(HOOD_BEARING) + Math.cos(HOOD_BEARING) / HOOD_PITCH];
      const along = [t[0] / Math.hypot(t[0], t[1]), t[1] / Math.hypot(t[0], t[1])];
      const score = (p: readonly number[]): number => {
        const [dx, dz] = [p[0] - centre[0], p[2] - centre[1]];
        const [u, v] = [dx * along[0] + dz * along[1], -dx * along[1] + dz * along[0]];
        return (u / HOOD_SPREAD[0]) ** 2 + (v / HOOD_SPREAD[1]) ** 2;
      };
      each((x, where) => {
        const pa = x.bodies[bodyIndex(x, 'P_a')];
        for (const i of x.units) if (i !== pa.index) expect(score(pa.spot!), `${where}: P_a against ${x.bodies[i].id}`).toBeLessThan(score(x.bodies[i].spot!));
      });
    }, 120_000);
  });

  it("a system's outer radius is its widest planet's apoapsis plus that planet's reach", () => {
    for (const star of g.systems) {
      const planets = planetsOf(g, star);
      // A binary's star keeps at least one (its limit truncates it); a single one at least two.
      expect(planets.length).toBeGreaterThanOrEqual(g.bodies[star].bin ? 1 : 2);
      expect(planets.length).toBeLessThanOrEqual(9);
      let outer = 0;
      for (const p of planets) {
        const reach = Math.max(p.R, ...moonsOf(g, p.id).map((m) => m.orbit!.r + m.R));
        outer = Math.max(outer, p.orbit!.r + reach);
        expect(p.orbit!.r).toBeLessThanOrEqual(9.6 + 1e-12);
      }
      expect(systemOuter(g, star)).toBeCloseTo(outer, 12);
    }
    // A binary's: the wider of its stars' apoapses round the barycentre plus that star's system.
    for (const c of kinds(g, 'bary')) {
      const stars = kinds(g, 'star').filter((s) => s.host === c.index);
      expect(stars).toHaveLength(2);
      expect(systemOuter(g, c.index)).toBeCloseTo(Math.max(...stars.map((s) => s.orbit!.r + systemOuter(g, s.index))), 12);
    }
  });

  it("pins the story's planets", () => {
    const hosted = (star: string, by: number = G_TWELVE[1]) =>
      g.bodies.filter((b) => b.kind === 'planet' && b.host === bodyIndex(g, star) && b.born <= by).map((b) => b.id);
    expect(hosted('P1')).toEqual(['C1', 'C2', 'C3', 'C4']);
    expect(hosted('P2').sort()).toEqual(['C5', 'C6', 'C9']);
    expect(hosted('P3').sort()).toEqual(['C10', 'C7', 'C8']);
    expect(hosted('P_a', 1)).toEqual(expect.arrayContaining(['N0', 'B1', 'B2']));
    expect(hosted('P5', 1)).toEqual(['V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9']);
    expect(moonsOf(g, 'N0')).toHaveLength(7);
    expect(moonsOf(g, 'C1')).toHaveLength(6);
    expect(moonsOf(g, 'C5')).toHaveLength(3);
    expect(byId(g, 'C1').R).toBe(0.3);
    expect(byId(g, 'C5').R).toBe(0.3);
    expect(byId(g, 'N0').R).toBe(0.3);
  });

  it('puts every scripted planet on its host in slot order', () => {
    for (const [star, ids] of Object.entries(HOSTS)) {
      const radii = ids.map((id) => byId(g, id).orbit!.r);
      for (const id of ids) expect(byId(g, id).host).toBe(bodyIndex(g, star));
      for (let k = 1; k < radii.length; k++) expect(radii[k]).toBeGreaterThan(radii[k - 1]);
      // The scripted planets hold the innermost slots; the filler takes the rest.
      const all = planetsOf(g, bodyIndex(g, star))
        .map((p) => p.orbit!.r)
        .sort((a, b) => a - b);
      expect(radii).toEqual(all.slice(0, ids.length));
    }
  });

  it('fills every slot by growth 1, the filler in birth order inner to outer', () => {
    for (const star of g.systems) {
      const s = g.bodies[star];
      const filler = planetsOf(g, star).filter((p) => !p.scripted);
      for (let k = 1; k < filler.length; k++) expect(filler[k].orbit!.r).toBeGreaterThan(filler[k - 1].orbit!.r);
      for (const p of planetsOf(g, star)) {
        expect(p.born).toBeLessThanOrEqual(1);
        // Every planet is born once its star is half built, but N0, there before its plan.
        if (p.id !== 'N0') expect(p.born, p.id).toBeGreaterThanOrEqual(s.born + 0.5 * s.dur - 1e-12);
      }
    }
  });

  it('gives N0 its seven parts, sized by their share of the bike', () => {
    const moons = moonsOf(g, 'N0');
    expect(moons.map((m) => m.partGroup)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    // The test's own copy of §14.3's table: the parts each moon gathers (the chain's links with the cranks).
    const parts: string[][] = [
      ['front-wheel'],
      ['rear-wheel'],
      ['fork', 'handlebars'],
      ['cranks', 'pedal-left', 'pedal-right', ...bike.parts.filter((p) => p.id.startsWith('chain-')).map((p) => p.id)],
      ['saddle'],
      ['basket'],
      ['mudguard-front', 'mudguard-rear', 'brake-front', 'brake-rear'],
    ];
    const weights = partShares();
    const share = parts.map((ids) => ids.reduce((n, id) => n + weights[bike.parts.findIndex((p) => p.id === id)], 0));
    // The planet keeps the rest: the frame, the ground and the loose bolts.
    const planet = ['frame', 'ground', 'loose-bolts'].reduce((n, id) => n + weights[bike.parts.findIndex((p) => p.id === id)], 0);
    expect(planet + share.reduce((n, x) => n + x, 0)).toBeCloseTo(1, 12);
    const most = Math.max(...share);
    moons.forEach((m, i) => expect(m.R, m.id).toBeCloseTo(Math.max(0.04, 0.35 * 0.3 * Math.sqrt(share[i] / most)), 12));
    // Every moon is a part of the bike, none a twin of its planet.
    for (const m of moons) expect(m.R).toBeLessThanOrEqual(0.35 * 0.3 + 1e-12);
    // On three tracks, 3 / 2 / 2, each at least its designed radius (further out where a wheel needs the room).
    const tracks = [0, 0, 0, 1, 1, 2, 2];
    moons.forEach((m, i) => {
      expect(m.orbit!.r).toBeGreaterThanOrEqual(MOON_TRACK[tracks[i]] * 0.3 - 1e-12);
      expect(m.orbit!.r).toBe(moons[tracks.indexOf(tracks[i])].orbit!.r);
    });
    expect(new Set(moons.map((m) => m.orbit!.r)).size).toBe(3);
    for (const b of g.bodies) if (b.host !== bodyIndex(g, 'N0')) expect(b.partGroup).toBeNull();
  });

  it('spaces the moons of a track evenly round it and sizes every shell by its radius', () => {
    for (const b of g.bodies) {
      if (b.kind === 'planet') {
        // The hero's is the spec's; the rest are their radius's, thinned (never thickened) to the budget.
        if (b.id === HERO_PLANET) expect(b.lattice).toEqual([...LATTICE.hero]);
        else thinned(b.lattice!, planetLattice(b.R));
        const moons = moonsOf(g, b.id);
        for (const r of new Set(moons.map((m) => m.orbit!.r))) {
          // A track's moons share its ellipse, and keep their phases evenly apart round it.
          const on = moons.filter((m) => m.orbit!.r === r);
          for (const m of on) expect({ ...m.orbit!, phase: 0 }).toEqual({ ...on[0].orbit!, phase: 0 });
          const phases = on.map((m) => m.orbit!.phase).sort((x, y) => x - y);
          for (let k = 1; k < phases.length; k++) expect(phases[k] - phases[k - 1]).toBeCloseTo(1 / phases.length, 9);
        }
      }
      // A moon's is its planet's pitch, from its planet's lattice as fitted: its planet's grain.
      if (b.kind === 'moon') expect(b.lattice).toEqual(moonLattice(b.R, g.bodies[b.host].R, g.bodies[b.host].lattice!));
      if (b.kind === 'bary' || b.kind === 'core') expect([b.lattice, b.motes]).toEqual([null, 0]);
      else expect(b.motes).toBe(b.kind === 'star' ? 160 : latticeCount(...b.lattice!));
    }
  });

  it('carries the defect by the rule, and exactly the twelve are lit under df-5', () => {
    const r0 = byId(g, SOURCE);
    for (const b of g.bodies) {
      if (b.kind === 'moon') {
        expect(b.cracked, b.id).toBe(g.bodies[b.host].cracked);
        continue;
      }
      const expected = b.id === SOURCE || (b.born < CLEAN_AFTER && b.parents.some((p) => g.bodies[p].cracked));
      expect(b.cracked, b.id).toBe(expected);
    }
    for (const b of g.bodies) {
      expect(b.derpSeed, b.id).toBe(b.cracked ? r0.derpSeed : NODE_NEVER);
      expect(b.derpPhase).toBeGreaterThanOrEqual(0);
      expect(b.derpPhase).toBeLessThan(1);
    }
    expect(r0.derpSeed).not.toBe(NODE_NEVER);
    expect(Number.isInteger(r0.derpSeed)).toBe(true);
    // The twelve are pieces and plans: a moon is a part of its piece and lights with it.
    const lit = g.bodies
      .filter((b) => b.kind !== 'moon' && b.hiAt !== null && b.hiAt <= HI_TWELVE && b.born <= G_TWELVE[0])
      .sort((a, b) => a.hiAt! - b.hiAt!)
      .map((b) => b.id);
    expect(lit).toEqual([...TWELVE]);
    expect(lit).not.toContain('C1');
    expect(lit).not.toContain('R0');
    for (const id of ['P1', 'P2', 'P3']) expect(byId(g, id).kind).toBe('star');
    for (const id of TWELVE.filter((x) => x.startsWith('C'))) expect(byId(g, id).kind).toBe('planet');
    // No other body that carries the defect is built before the twelve's span ends.
    for (const b of g.bodies) {
      if (b.kind === 'moon' || !b.cracked || b.born > G_TWELVE[1]) continue;
      expect([...TWELVE, 'C1', 'R0'], b.id).toContain(b.id);
    }
  });

  it('a moon shares its planet clocks, and the filler lights as it is built', () => {
    for (const b of g.bodies) {
      if (b.kind === 'moon') {
        const p = g.bodies[b.host];
        expect([b.hiAt, b.fixAt, b.hop]).toEqual([p.hiAt, p.fixAt, p.hop]);
        expect(b.star).toBe(p.star);
        expect(b.rule).toBe(p.rule);
        expect(b.planet).toBe(p.index);
      } else if (!b.scripted) {
        expect(b.hiAt).toBe(b.cracked ? HI_AT_BIRTH : null);
      }
      if (!b.cracked) expect([b.hiAt, b.fixAt, b.hop]).toEqual([null, null, null]);
    }
  });

  it('hops count streams from the source through bodies that carry the defect', () => {
    expect(byId(g, 'R0').hop).toBe(0);
    for (const b of g.bodies) {
      if (!b.cracked || b.kind === 'moon' || b.id === SOURCE) continue;
      expect(b.hop, b.id).toBe(Math.min(...b.parents.filter((p) => g.bodies[p].cracked).map((p) => g.bodies[p].hop! + 1)));
    }
  });

  it('sweeps every other body that carries the defect within the sweep, stars first, by hop and birth', () => {
    const own = new Set<string>(OWN_FIXES);
    const swept = g.bodies.filter((b) => b.cracked && b.kind !== 'moon' && !own.has(b.id));
    for (const b of swept) {
      expect(b.fixAt).toBeGreaterThanOrEqual(SWEEP[0]);
      expect(b.fixAt).toBeLessThanOrEqual(SWEEP[1]);
    }
    const order = [...swept].sort(
      (a, b) => (a.kind === 'star' ? 0 : 1) - (b.kind === 'star' ? 0 : 1) || a.hop! - b.hop! || a.born - b.born || a.index - b.index,
    );
    for (let k = 1; k < order.length; k++) expect(order[k].fixAt!).toBeGreaterThan(order[k - 1].fixAt!);
    for (const s of LINEAGE) if (s.fixAt !== undefined) expect(byId(g, s.id).fixAt).toBe(s.fixAt);
  });

  it('sets the membership rows', () => {
    for (const b of g.bodies) {
      if (b.kind === 'core') expect([b.rule, b.star, b.planet, b.host]).toEqual([b.index, -1, -1, -1]);
      if (b.kind === 'star') {
        // A binary's star goes round its barycentre (its host); a single one has none.
        expect([b.star, b.planet, b.host]).toEqual([b.index, -1, b.bin ? b.host : -1]);
        if (b.bin) expect(g.bodies[b.host].kind).toBe('bary');
        expect(b.rule).toBe(g.bodies[b.parents[0]].rule);
      }
      if (b.kind === 'bary') expect([b.star, b.planet, b.host, b.parents]).toEqual([-1, -1, -1, []]);
      if (b.kind === 'planet') {
        expect([b.star, b.planet]).toEqual([b.host, b.index]);
        expect(g.bodies[b.host].kind).toBe('star');
        expect(b.rule).toBe(g.bodies[b.parents[0]].rule);
      }
      if (b.kind !== 'core') expect(g.bodies[b.rule].kind).toBe('core');
    }
    expect(byId(g, 'V5').rule).toBe(bodyIndex(g, 'R1'));
    expect(byId(g, 'V5').star).toBe(bodyIndex(g, 'P5'));
    expect(byId(g, 'C1').rule).toBe(bodyIndex(g, 'R0'));
  });

  it('runs streams core → star, star → planet, sideways, and C7 → R1 inward', () => {
    for (const [i, s] of g.streams.entries()) {
      const from = g.bodies[s.from];
      const to = g.bodies[s.to];
      expect(to.parents).toContain(s.from);
      if (s.kind === 'in') expect([from.id, to.id]).toEqual(['C7', 'R1']);
      else if (s.kind === 'out') expect([from.kind, to.kind]).toEqual(from.kind === 'core' ? ['core', 'star'] : ['star', 'planet']);
      else expect(from.kind).toBe(to.kind);
      expect(s.born).toBeGreaterThanOrEqual(to.born);
      expect(s.born).toBeGreaterThanOrEqual(from.born + 0.5 * from.dur - 1e-12);
      const carried = from.cracked && to.cracked;
      expect(s.hiAt).toBe(carried ? to.hiAt : null);
      expect(s.hop).toBe(carried ? from.hop! + 1 : null);
      expect(s.bowBearing).toBeGreaterThanOrEqual(0);
      expect(s.bowBearing).toBeLessThan(2 * Math.PI);
      if (to.parents[0] === s.from) expect(to.stream).toBe(i);
    }
    expect(g.streams.filter((s) => s.kind === 'in')).toHaveLength(1);
    expect(g.streams.filter((s) => s.kind === 'side').map((s) => `${g.bodies[s.from].id}>${g.bodies[s.to].id}`)).toEqual(
      expect.arrayContaining(['C3>C7', 'C5>C9', 'P1>P2', 'C8>C13']),
    );
    expect(g.streams).toHaveLength(g.bodies.reduce((n, b) => n + b.parents.length, 0));
    for (const b of g.bodies) if (b.kind === 'moon') expect([b.parents, b.stream]).toEqual([[], null]);
    expect(g.feedFrom).toBe(bodyIndex(g, SOURCE));
    expect(g.visits).toEqual([...REVIEW_VISITS]);
  });

  it('the reviewer visits take the nearest clean star where the script says so, and keep their other streams', () => {
    for (const id of ['V1', 'V2', 'V4', 'V6']) {
      const p = g.bodies[byId(g, id).parents[0]];
      expect(p.kind).toBe('star');
      expect(p.cracked).toBe(false);
    }
    expect(g.bodies[byId(g, 'V5').parents[0]].id).toBe('Q2');
    expect(g.bodies[byId(g, 'V8').parents[0]].id).toBe('P6');
    expect(byId(g, 'C25').host).toBe(bodyIndex(g, 'P6'));
  });

  it('has 45 ± 5 % bare planets among the filler and no planet over 6 moons but N0', () => {
    const filler = kinds(g, 'planet').filter((p) => !p.scripted);
    const bare = filler.filter((p) => moonsOf(g, p.id).length === 0).length / filler.length;
    expect(bare).toBeGreaterThanOrEqual(0.4);
    expect(bare).toBeLessThanOrEqual(0.5);
    for (const p of kinds(g, 'planet')) if (p.id !== 'N0') expect(moonsOf(g, p.id).length).toBeLessThanOrEqual(6);
  });

  it('keeps every piece clear of its neighbours at any precession or tilt, over many seeds', () => {
    // Measured, now its 299 galaxies draw no background: 9.1 s on CI, 10.9 s alone, 46.5 s locally at load
    // 12-22 beside the full suite (before: 46 s on CI, 99 s alone, and over the old 120 s under load). 180 s
    // is nearly 4 times the loaded time and 20 times CI's.
    // Fix ruling 2. Neighbouring planets i < j: a_j(1 − e_j) − a_i(1 + e_i) ≥ R_i + R_j + max(ms_i, ms_j) + 0.15,
    // and the pieces (planet or moon system, whichever reaches further) clear each other by 0.15 too;
    // the first piece clears the star. Neighbouring tracks round a planet, and the first track and the
    // planet, clear each other by their largest moons plus 0.05 R.
    const check = (x: Galaxy): void => {
      for (const star of x.systems) {
        const planets = planetsOf(x, star).sort((p, q) => p.orbit!.r - q.orbit!.r);
        const ms = (p: Body): number => Math.max(0, ...moonsOf(x, p.id).map((m) => m.orbit!.r + m.R));
        const reach = (p: Body): number => Math.max(p.R, ms(p));
        const peri = (b: Body): number => b.orbit!.a * (1 - b.orbit!.e);
        const apo = (b: Body): number => b.orbit!.a * (1 + b.orbit!.e);
        expect(peri(planets[0]) - x.bodies[star].R).toBeGreaterThanOrEqual(reach(planets[0]) + PLANET_MARGIN - 1e-9);
        for (let k = 1; k < planets.length; k++) {
          const [i, j] = [planets[k - 1], planets[k]];
          const gap = peri(j) - apo(i);
          expect(gap, `${i.id} ${j.id}`).toBeGreaterThanOrEqual(i.R + j.R + Math.max(ms(i), ms(j)) + PLANET_MARGIN - 1e-9);
          expect(gap, `${i.id} ${j.id}`).toBeGreaterThanOrEqual(reach(i) + reach(j) + PLANET_MARGIN - 1e-9);
        }
        for (const p of planets) {
          expect(apo(p)).toBeLessThanOrEqual(9.6 + 1e-9);
          const moons = moonsOf(x, p.id);
          const radii = [...new Set(moons.map((m) => m.orbit!.r))].sort((a, b) => a - b);
          let outer = p.R;
          for (const r of radii) {
            const on = moons.filter((m) => m.orbit!.r === r);
            const big = Math.max(...on.map((m) => m.R));
            expect(peri(on[0]) - outer, p.id).toBeGreaterThanOrEqual(big + MOON_MARGIN_SHARE * p.R - 1e-9);
            outer = r + big;
          }
        }
      }
    };
    check(g);
    for (let seed = 2; seed <= 300; seed++) check(generateGalaxy(seed, 'phone', galaxyBudget(MOTE_BUDGET_DESKTOP)));
  }, 180_000);

  it("keeps every planet's eccentricity in its band but in a flattened system", () => {
    // §12.1's 0.05-0.22; only a system of the story's planets that cannot fit otherwise (P5's nine) falls below it.
    expect(g.fit.flattened).toContain('P5');
    for (const p of kinds(g, 'planet')) {
      if (g.fit.flattened.includes(g.bodies[p.host].id)) {
        expect(p.orbit!.e).toBeLessThanOrEqual(0.22);
        continue;
      }
      // A binary star's planets carry the forced eccentricity on top (the binaries' own test).
      if (g.bodies[p.host].bin) continue;
      expect(p.orbit!.e, p.id).toBeGreaterThanOrEqual(0.05 - 1e-12);
      expect(p.orbit!.e, p.id).toBeLessThanOrEqual(0.22);
    }
    for (const m of kinds(g, 'moon')) {
      expect(m.orbit!.e).toBeGreaterThanOrEqual(0.05);
      expect(m.orbit!.e).toBeLessThanOrEqual(0.12);
    }
  });

  it("lands every moon in the last 30 % of its planet's build", () => {
    for (const m of kinds(g, 'moon')) {
      const p = g.bodies[m.host];
      expect(m.born).toBeGreaterThanOrEqual(p.born + 0.7 * p.dur - 1e-12);
      expect(m.born).toBeLessThanOrEqual(p.born + p.dur + 1e-12);
    }
  });

  it("gives the planets, the moons and a binary's stars orbits and nothing else one", () => {
    for (const b of g.bodies) {
      const binary = b.kind === 'star' && b.host >= 0;
      expect(b.orbit === null).toBe(b.kind === 'core' || b.kind === 'bary' || (b.kind === 'star' && !binary));
      expect(b.spot === null).toBe(b.kind === 'planet' || b.kind === 'moon' || binary);
      if (binary) expect(g.bodies[b.host].kind).toBe('bary');
      expect(b.bin !== undefined && b.aCrit !== undefined).toBe(binary);
    }
  });

  it('fits everything it draws in the budget', () => {
    // Measured, now its galaxies draw no background: 0.5 s on CI, 0.6 s alone, 3.3 s locally at load 12-22
    // beside the full suite (before, 2.8 s on CI and 6.4 s alone, over the default 5 s). 30 s is 9 times the
    // loaded time.
    // Re-pinned from 76,000 (0.76 of the mote budget): the author's provisional allowance for the
    // hole, the stars and the planets, GALAXY_SHARE 0.935 (re-skin §7).
    expect(GALAXY_SHARE).toBe(0.935);
    expect(galaxyBudget(MOTE_BUDGET_DESKTOP)).toBe(93_500);
    for (const [x, budget] of [
      [g, galaxyBudget(MOTE_BUDGET_DESKTOP)],
      ...Array.from(
        { length: 20 },
        (_, i) => [generateGalaxy(i + 1, 'phone', galaxyBudget(MOTE_BUDGET_DESKTOP)), galaxyBudget(MOTE_BUDGET_DESKTOP)] as const,
      ),
    ] as const) {
      const sum = drawnInstances(x);
      expect(sum, `seed ${x.seed}`).toBeLessThanOrEqual(budget);
      expect(x.motes).toBe(sum);
      expect(x.instances.total).toBe(sum);
    }
    // The named shells keep their lattices on the story's seed: the filler's give way first.
    expect(byId(g, 'C1').motes).toBe(6116);
    // The bike's planet keeps its full lattice, so its moons keep their full pitch.
    expect(FULL_DENSITY).toEqual(['N0']);
    for (const id of FULL_DENSITY) {
      const p = byId(g, id);
      expect(p.lattice, id).toEqual(planetLattice(p.R));
      for (const m of moonsOf(g, id)) expect(m.lattice, m.id).toEqual(moonLattice(m.R, p.R, planetLattice(p.R)));
    }
    // Re-pinned by the re-skin's Task 7b (the design change: the plans' reservation, 4,854), exactly: on
    // the story's seed the filler pays for it again, 108 of the 110 planets (every one but the named two)
    // a little thinner than its radius's lattice, 3,188 lattice points in all, the galaxy 93,456 of
    // 93,500 (the planets and moons keep their room: below). From Task 5 to 7b, which freed the core's
    // 5,520 instances, no planet was thinned (91,895 of 93,500). Where a seed's galaxy does not fit, the
    // filler pays first (seed 2: planets thinned, the named ones whole).
    const thinned = (x: Galaxy) => kinds(x, 'planet').filter((p) => latticeCount(...p.lattice!) < latticeCount(...planetLattice(p.R)));
    expect(thinned(g).length).toBe(108);
    expect(kinds(g, 'planet').length - thinned(g).length).toBe(2);
    expect(thinned(g).reduce((n, p) => n + latticeCount(...planetLattice(p.R)) - latticeCount(...p.lattice!), 0)).toBe(3_188);
    expect(g.instances.total).toBe(93_456);
    for (const p of thinned(g)) expect(p.id !== HERO_PLANET && !FULL_DENSITY.includes(p.id), p.id).toBe(true);
    const tight = generateGalaxy(2, 'desktop', galaxyBudget(MOTE_BUDGET_DESKTOP));
    expect(thinned(tight).length).toBeGreaterThan(0);
    for (const p of thinned(tight)) expect(p.id !== HERO_PLANET && !FULL_DENSITY.includes(p.id), p.id).toBe(true);
    for (const b of g.bodies) {
      if (b.kind === 'core') expect([b.lattice, b.motes, b.personMotes]).toEqual([null, 0, 0]);
      if (b.kind === 'star') expect([b.lattice, b.motes]).toEqual([null, 160]);
    }
    // Every body that carries the defect has a person set, but a core row, which draws nothing.
    for (const b of g.bodies) expect(b.personMotes > 0).toBe(b.cracked && b.kind !== 'core');
    // Measured: 0.62 s alone, 1.30 s at load 8.6 (8 busy loops, 1 worker), 0.65 s on CI
    // (run 38264919221). 10 s is 7.7 times the loaded time and 15 times CI's.
  }, 10_000);

  it('stars are dots and spikes, not lattices', () => {
    for (const tier of ['desktop', 'phone'] as const) {
      const x = generateGalaxy(MOTE_SEED, tier, galaxyBudget(MOTE_BUDGET_DESKTOP));
      for (const b of kinds(x, 'star')) {
        expect(b.motes, b.id).toBe(160);
        expect(b.lattice, b.id).toBeNull();
        expect(b.look, b.id).not.toBeNull();
      }
      for (const b of x.bodies) if (b.kind !== 'star') expect(b.look, b.id).toBeNull();
      expect(x.instances.spikes).toBe(2_880);
      expect(x.instances.hole).toBe(27_610);
      expect(x.motes).toBeLessThanOrEqual(93_500);
      // The icospheres drawn: the planets', the moons' and the ghosts'; none for a star, a core row or a barycentre.
      const ghosts = x.bodies.filter((b) => b.cracked && (b.kind === 'planet' || b.kind === 'moon')).length;
      expect(x.instances.bodies).toBe(kinds(x, 'planet').length + kinds(x, 'moon').length + ghosts);
    }
    // Each star's look is its own stream's, so the stars do not all look alike.
    const looks = kinds(g, 'star').map((b) => b.look!);
    expect(new Set(looks.map((l) => l.brightness)).size).toBe(STAR_COUNT);
    expect(looks.some((l) => l.spikes === 6) && looks.some((l) => l.spikes === 4)).toBe(true);
    // Only the brightest carry spikes far off (STAR_LOOK.spikeFrom): 7 of the 30, about the top quarter.
    expect(looks.filter((l) => l.brightness >= STAR_LOOK.spikeFrom).length).toBe(7);
  });

  it('C5 is an ordinary planet in the budget', () => {
    const c5 = byId(g, 'C5');
    expect(FULL_DENSITY).not.toContain('C5');
    expect(c5.hero).toBe(false);
    // Its pinned radius and three moons stay: they set P2's system radius, which places the neighbourhood.
    expect(c5.R).toBe(0.3);
    expect(moonsOf(g, 'C5')).toHaveLength(3);
    // Its person set is the rule's, as any cracked planet's of its size.
    expect(c5.cracked).toBe(true);
    expect(c5.personMotes).toBe(PERSON_MIN);
    expect(c5.personMotes).toBe(24);
  });

  it('draws the hole, and no core row has an instance', () => {
    for (const x of [g, generateGalaxy(MOTE_SEED, 'phone', galaxyBudget(MOTE_BUDGET_DESKTOP))]) {
      const i = x.instances;
      expect(i.hole).toBe(holeInstances());
      expect(i.hole).toBe(27_610);
      expect(i.total).toBe(i.shells + i.persons + i.tracks + i.bodies + i.glow + i.streams + i.spikes + i.hole + i.plan);
      expect(i.total).toBeLessThanOrEqual(93_500);
      // The plans' reservation (re-skin §4.7, Task 7b): the world pool 3,800, the screen pool 760, and the one pair's marks 294.
      expect(i.plan).toBe(4_854);
      // The core rows: no shell, no person set, no lattice, no glow, no icosphere.
      for (const b of kinds(x, 'core')) expect([b.motes, b.personMotes, b.lattice], b.id).toEqual([0, 0, null]);
      expect(i.glow).toBe(30);
      const ghosts = x.bodies.filter((b) => b.cracked && (b.kind === 'planet' || b.kind === 'moon')).length;
      expect(i.bodies).toBe(kinds(x, 'planet').length + kinds(x, 'moon').length + ghosts);
    }
  });

  // From the re-skin's Task 5, which frees the core's 5,520 instances (measured at Task 2: 34,880,
  // against the 35,620 this asks, while the core still drew; 31,196 before the re-skin).
  it('the planets and moons keep their room', () => {
    const room = g.bodies.filter((b) => b.kind === 'planet' || b.kind === 'moon').reduce((n, b) => n + b.motes + b.personMotes, 0);
    expect(room).toBeGreaterThanOrEqual(31_196 + 4_424);
  });

  it('a smaller budget thins the shells, never the layout, and the named shells last', () => {
    const layout = (x: Galaxy) => x.bodies.map((b) => [b.id, b.R, b.orbit, b.spot, b.born]);
    // Re-based from 60,000 with the allowance (re-skin §7): the fixed instances are now about 48,050,
    // so at 60,000 the named shells (C1's, N0's and the core's) give way too; at 80,000 only the filler does.
    const mid = generateGalaxy(MOTE_SEED, 'desktop', 80_000);
    expect(mid.motes).toBeLessThanOrEqual(80_000);
    expect(layout(mid)).toEqual(layout(g));
    for (const b of mid.bodies) {
      if (b.kind === 'core' || b.kind === 'star' || b.id === HERO_PLANET || FULL_DENSITY.includes(b.id)) expect([b.lattice, b.motes], b.id).toEqual([g.bodies[b.index].lattice, g.bodies[b.index].motes]);
    }
    expect(mid.bodies.some((b, i) => b.motes < g.bodies[i].motes)).toBe(true);
    // Re-based from 30,000: the fixed instances alone (tracks 14,780, the icospheres, glow, streams
    // 2,437, spikes 2,880 and the hole's 27,610) are about 48,050, and the named shells about 11,600.
    const small = generateGalaxy(MOTE_SEED, 'desktop', 70_000);
    expect(small.motes).toBeLessThanOrEqual(70_000);
    expect(layout(small)).toEqual(layout(g));
  });

  it('builds every body by growth 1', () => {
    for (const b of g.bodies) expect(b.born + b.dur, b.id).toBeLessThanOrEqual(1);
  });

  it('holds its pins over many seeds', () => {
    for (let seed = 2; seed < 12; seed++) {
      const x = generateGalaxy(seed, 'phone', galaxyBudget(MOTE_BUDGET_DESKTOP));
      expect(x.motes).toBeLessThanOrEqual(galaxyBudget(MOTE_BUDGET_DESKTOP));
      expect(x.bodies.filter((b) => b.kind !== 'moon' && b.hiAt !== null && b.hiAt <= HI_TWELVE && b.born <= G_TWELVE[0]).length).toBe(12);
      expect(moonsOf(x, 'N0')).toHaveLength(7);
      expect(kinds(x, 'star')).toHaveLength(STAR_COUNT);
    }
  });
});

describe('the S-type binaries (re-skin Task 1e)', () => {
  const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1);
  const memo = new Map<string, Galaxy>();
  /** The galaxy of `seed` (desktop) with its binaries, every star single (Task 1d's), or its pre-binary packing, generated once. */
  const of = (seed: number, mode: HoodMode = 'binaries'): Galaxy => {
    const key = `${seed} ${mode}`;
    if (!memo.has(key)) memo.set(key, generateGalaxy(seed, 'desktop', galaxyBudget(MOTE_BUDGET_DESKTOP), mode));
    return memo.get(key)!;
  };
  /** A barycentre's two stars, the heavier (`a`, the smaller share) first. */
  const pairOf = (x: Galaxy, bary: Body): [Body, Body] => {
    const stars = x.bodies.filter((b) => b.kind === 'star' && b.host === bary.index).sort((p, q) => p.bin!.share - q.bin!.share);
    expect(stars, bary.id).toHaveLength(2);
    return stars as [Body, Body];
  };
  const mass = (b: Body): number => starMass(b.look!.brightness);
  /** A binary star's place in the galaxy's own frame at `t`, in float64: its barycentre's spot plus its orbit. */
  const placeOf = (x: Galaxy, b: Body, t: number): number[] => {
    const local = orbitLocal(b.orbit!, t);
    return x.bodies[b.host].spot!.map((v, k) => v + local[k]);
  };

  it('pairs only close filler stars, mutual nearest, and never a scripted one', () => {
    let pairs = 0;
    for (const seed of SEEDS) {
      const x = of(seed);
      const pre = of(seed, 'singles');
      const where = `seed ${seed}`;
      // Task 1d's packing, where the pairs are found: every star single, 1.5 × their outer radii plus the margin apart.
      expect(kinds(pre, 'bary'), where).toHaveLength(0);
      const preStars = kinds(pre, 'star');
      const nearest = (s: Body): Body => preStars.reduce((m, o) => (o !== s && (m === s || dist(o.spot!, s.spot!) < dist(m.spot!, s.spot!)) ? o : m), s);
      const close = preStars
        .flatMap((s) => {
          const o = nearest(s);
          const k = dist(s.spot!, o.spot!) / (systemOuter(pre, s.index) + systemOuter(pre, o.index));
          return s.id < o.id && nearest(o) === s && !s.scripted && !o.scripted && k < BIN.pairK ? [{ ids: [s.id, o.id].sort(), k }] : [];
        })
        .sort((p, q) => p.k - q.k);
      const bary = kinds(x, 'bary');
      expect(bary.length, where).toBeLessThanOrEqual(BIN.max);
      pairs += bary.length;
      const formed = new Set(bary.map((c) => pairOf(x, c).map((b) => b.id).sort().join(' ')));
      // Closest first, each kept by its stream's first draw, until BIN.max are kept.
      const want: string[] = [];
      for (const c of close) {
        if (want.length >= BIN.max) break;
        const keys = c.ids.map((id) => 1000 + Number(id.split('-')[1]) - 1).sort((p, q) => p - q);
        if (streamFor(seed, 'binaries', 4096 * keys[0] + keys[1])() < BIN.share) want.push(c.ids.join(' '));
      }
      // Every pair formed is one of those; one that is not formed could not be placed, and its stars are single.
      for (const f of formed) expect(want, where).toContain(f);
      for (const w of want.filter((f) => !formed.has(f)))
        for (const id of w.split(' ')) expect(x.bodies[bodyIndex(x, id)].host, `${where} ${id}`).toBe(-1);
      for (const c of bary) {
        for (const s of pairOf(x, c)) {
          expect(s.scripted, `${where} ${s.id}`).toBe(false);
          expect(s.id, where).not.toBe('P_a');
        }
      }
      // Every scripted star single, P_a (N0's star) above all: the world is anchored at N0.
      for (const s of kinds(x, 'star')) if (s.scripted) expect([s.host, s.orbit, s.spot === null], `${where} ${s.id}`).toEqual([-1, null, false]);
      expect(x.bodies[x.bodies[bodyIndex(x, 'N0')].host].id).toBe('P_a');
    }
    // Pairs form on some seeds, not all.
    expect(pairs).toBeGreaterThan(0);
    // Deterministic and seed-sensitive.
    expect(generateGalaxy(1, 'desktop', galaxyBudget(MOTE_BUDGET_DESKTOP)).bodies.filter((b) => b.kind === 'bary')).toEqual(kinds(of(1), 'bary'));
    expect(kinds(of(2), 'bary').map((b) => b.id)).not.toEqual(kinds(of(1), 'bary').map((b) => b.id));
    // Measured: 2.37 s alone, 4.84 s at load 8.6 (8 busy loops, 1 worker), 2.25 s on CI
    // (run 38264919221). 20 s is 4.1 times the loaded time and 9 times CI's.
  }, 20_000);

  it("keeps each binary star's planets inside its stable limit", () => {
    for (const seed of SEEDS) {
      const x = of(seed);
      for (const c of kinds(x, 'bary')) {
        const [a, b] = pairOf(x, c);
        const M = mass(a) + mass(b);
        expect(a.bin!.share).toBeCloseTo(mass(b) / M, 12);
        expect(b.bin!.share).toBeCloseTo(mass(a) / M, 12);
        expect(a.bin!.e).toBeGreaterThanOrEqual(BIN.e[0]);
        expect(a.bin!.e).toBeLessThanOrEqual(BIN.e[1]);
        expect(a.bin!.a).toBeGreaterThanOrEqual(BIN.a[0]);
        for (const s of [a, b]) {
          const where = `seed ${seed} ${s.id}`;
          expect(s.aCrit, where).toBeCloseTo(hwS(s.bin!.share, s.bin!.e) * s.bin!.a, 12);
          const planets = planetsOf(x, s.index);
          expect(planets.length, where).toBeGreaterThanOrEqual(1);
          for (const p of planets) {
            const o = p.orbit!;
            expect(o.a * (1 + o.e), `${where} ${p.id}`).toBeLessThanOrEqual(s.aCrit! + 1e-9);
            expect(o.e, `${where} ${p.id}`).toBeLessThanOrEqual(BIN.eMax + 1e-12);
            // The forced eccentricity, added on top of the band: at least the band's floor plus 0.95 of it at
            // its final a, unless capped (it is taken at the a of the fit before, iterated once; measured
            // over seeds 1-40: at least 0.963 of it).
            expect(o.e, `${where} ${p.id}`).toBeGreaterThanOrEqual(Math.min(BIN.eMax, 0.05 + 0.95 * forcedEccentricity(o.a, s.bin!.a, s.bin!.e)) - 1e-12);
            // The precession quickened by 1 + 2 (r / aCrit)³ from its band (400-900 s).
            const drawn = o.precession * (1 + BIN.quicken * (o.r / s.aCrit!) ** 3);
            expect(drawn, `${where} ${p.id}`).toBeGreaterThanOrEqual(400 - 1e-9);
            expect(drawn, `${where} ${p.id}`).toBeLessThanOrEqual(900 + 1e-9);
            expect(o.precession).toBeLessThan(drawn);
          }
        }
      }
    }
    // Measured: 0.01 s alone, 0.04 s at load 8.6 (8 busy loops, 1 worker), under 0.3 s (vitest's report line) on CI
    // (run 38264919221). 5 s is 125.0 times the loaded time and over 16 times CI's.
  }, 5_000);

  it('the pair turns round a fixed barycentre', () => {
    for (const seed of [1, 2, 3, 7]) {
      const x = of(seed);
      for (const c of kinds(x, 'bary')) {
        const [a, b] = pairOf(x, c);
        const { a: aB, e, period } = a.bin!;
        expect(period).toBeCloseTo(BIN.kep * aB ** 1.5, 9);
        expect(period).toBe(binaryPeriod(aB));
        expect([a.orbit!.period, b.orbit!.period, a.orbit!.precession, b.orbit!.precession, a.orbit!.tilt]).toEqual([period, period, 0, 0, 0]);
        // The heavier star goes round on the smaller ellipse.
        expect(a.orbit!.a).toBeLessThanOrEqual(b.orbit!.a);
        let [near, far] = [Infinity, 0];
        for (let t = 0; t < 3600; t += 7.3) {
          const [pa, pb] = [placeOf(x, a, t), placeOf(x, b, t)];
          const M = mass(a) + mass(b);
          for (let k = 0; k < 3; k++) expect((mass(a) * pa[k] + mass(b) * pb[k]) / M, `seed ${seed} ${c.id} at ${t}`).toBeCloseTo(c.spot![k], 6);
          const sep = dist(pa, pb);
          expect(sep).toBeGreaterThanOrEqual(aB * (1 - e) - 1e-9);
          expect(sep).toBeLessThanOrEqual(aB * (1 + e) + 1e-9);
          [near, far] = [Math.min(near, sep), Math.max(far, sep)];
        }
        // It runs the whole ellipse in the hour (its period is 10-17 min).
        expect(near).toBeLessThan(aB * (1 - e) * 1.01);
        expect(far).toBeGreaterThan(aB * (1 + e) * 0.99);
        // The barycentre has the spot and draws nothing.
        expect([c.motes, c.personMotes, c.lattice, c.orbit, c.host, c.star]).toEqual([0, 0, null, null, -1, -1]);
      }
    }
  });

  it('planets ride their star', () => {
    // Through the packed texture, as both mirrors read it: a binary star's planet's place minus its
    // star's is its own orbit, so the host chain carries it (and its moons) round the barycentre.
    const x = of(1);
    const data = packBodyData(x);
    const binaryPlanets = kinds(x, 'planet').filter((p) => x.bodies[p.host].host >= 0);
    expect(binaryPlanets.length).toBeGreaterThan(0);
    for (let t = 0; t < 3600; t += 37.7)
      for (const p of binaryPlanets) {
        const [pp, ps] = [bodyGalactic(data, p.index, t), bodyGalactic(data, p.host, t)];
        const local = orbitLocal(elementsAt(data, p.index), t);
        for (let k = 0; k < 3; k++) expect(pp[k] - ps[k], `${p.id} at ${t}`).toBeCloseTo(local[k], 4);
      }
    // ...and a moon of one rides three hops: moon, planet, star, to the barycentre.
    const moon = kinds(x, 'moon').find((m) => x.bodies[x.bodies[m.host].host].host >= 0)!;
    expect(moon).toBeDefined();
    for (const t of [0, 101, 3599.9]) {
      const [pm, pp] = [bodyGalactic(data, moon.index, t), bodyGalactic(data, moon.host, t)];
      const local = orbitLocal(elementsAt(data, moon.index), t);
      for (let k = 0; k < 3; k++) expect(pm[k] - pp[k]).toBeCloseTo(local[k], 4);
    }
  });

  it("places every seed on Task 1d's spots: the singles on their own, each pair on its stars' barycentre, nudged at most 12, in the band", () => {
    const counts = new Map<number, number>();
    for (const seed of SEEDS) {
      const [x, one] = [of(seed), of(seed, 'singles')];
      const where = `seed ${seed}`;
      const spotOf = (y: Galaxy, id: string) => y.bodies[bodyIndex(y, id)].spot!;
      // Every single star, and every star of a pair that could not be placed, on its Task 1d spot.
      for (const s of kinds(x, 'star')) if (s.spot) expect(s.spot, `${where} ${s.id}`).toEqual(spotOf(one, s.id));
      for (const c of kinds(x, 'bary')) {
        const [a, b] = pairOf(x, c);
        const M = mass(a) + mass(b);
        const mid = [0, 1, 2].map((k) => (mass(a) * spotOf(one, a.id)[k] + mass(b) * spotOf(one, b.id)[k]) / M);
        expect(dist(c.spot!, mid), `${where} ${c.id}: its nudge`).toBeLessThanOrEqual(BIN.nudgeMax + 1e-9);
        const r = Math.hypot(c.spot![0], c.spot![2]);
        expect(r, `${where} ${c.id}`).toBeGreaterThanOrEqual(HOOD_R[0]);
        expect(r, `${where} ${c.id}`).toBeLessThanOrEqual(HOOD_R_WIDE);
      }
      // Each star of a pair as a single is spaced, from where it swings nearest.
      const least = leastSpacing(x);
      expect(least.margin, `${where}: ${least.between}`).toBeGreaterThanOrEqual(-1e-9);
      const n = kinds(x, 'bary').length;
      counts.set(n, (counts.get(n) ?? 0) + 1);
    }
    // Measured: 0 pairs on 15 seeds, 1 on 16, 2 on 6, 3 on 3; the story's seed has one (star-7 and star-14).
    expect([...counts].sort()).toEqual([
      [0, 15],
      [1, 16],
      [2, 6],
      [3, 3],
    ]);
    expect(kinds(of(1), 'bary').map((c) => c.id)).toEqual(['bary-star-14-star-7']);
    // Measured: 0.24 s alone, 0.70 s at load 8.6 (8 busy loops, 1 worker), under 0.3 s (vitest's report line) on CI
    // (run 38264919221). 5 s is 7.1 times the loaded time and over 16 times CI's.
  }, 5_000);

  it('keeps every birth: the planets are born as if no star were paired, those past a binary star\'s limit dropped', () => {
    for (const seed of SEEDS) {
      const [x, one] = [of(seed), of(seed, 'singles')];
      const where = `seed ${seed}`;
      for (const p of [...kinds(x, 'planet'), ...kinds(x, 'moon')]) {
        const q = one.bodies[bodyIndex(one, p.id)];
        expect(p.born, `${where} ${p.id}`).toBe(q.born);
        expect([p.hiAt, p.fixAt, p.cracked], `${where} ${p.id}`).toEqual([q.hiAt, q.fixAt, q.cracked]);
      }
      // Dropped: exactly the planets (and their moons) of a binary's star past the ones it keeps.
      const gone = kinds(one, 'planet').filter((q) => !(q.id in x.ids));
      for (const q of gone) expect(x.bodies[bodyIndex(x, one.bodies[q.host].id)].bin, `${where} ${q.id}`).toBeDefined();
      for (const c of kinds(x, 'bary'))
        for (const st of pairOf(x, c)) {
          const kept = planetsOf(x, st.index).length;
          const all = planetsOf(one, bodyIndex(one, st.id)).sort((p, q) => p.orbit!.r - q.orbit!.r);
          expect(all.slice(0, kept).map((q) => q.id).sort(), `${where} ${st.id}`).toEqual(planetsOf(x, st.index).map((q) => q.id).sort());
        }
    }
    // Measured: 0.24 s alone, 0.37 s at load 8.6 (8 busy loops, 1 worker), under 0.3 s (vitest's report line) on CI
    // (run 38264919221). 5 s is 13.5 times the loaded time and over 16 times CI's.
  }, 5_000);

  it('places every seed, units at 1.5 × apart', () => {
    for (const seed of SEEDS) {
      const x = of(seed);
      const where = `seed ${seed}`;
      expect(kinds(x, 'star'), where).toHaveLength(STAR_COUNT);
      expect(x.systems).toEqual(kinds(x, 'star').map((b) => b.index));
      // One unit per single star, and one per pair (its barycentre).
      expect(x.units.length, where).toBe(STAR_COUNT - kinds(x, 'bary').length);
      for (const i of x.units) expect(x.bodies[i].spot, `${where} ${x.bodies[i].id}`).not.toBeNull();
      expect(leastSpacing(x).margin, where).toBeGreaterThanOrEqual(-1e-9);
      // A pair's reach: the wider of its stars' apoapses round the barycentre plus that star's system.
      for (const c of kinds(x, 'bary')) {
        const [a, b] = pairOf(x, c);
        const reach = (s: Body) => s.bin!.share * s.bin!.a * (1 + s.bin!.e) + systemOuter(x, s.index);
        expect(systemOuter(x, c.index)).toBeCloseTo(Math.max(reach(a), reach(b)), 12);
        expect(anchorOf(x.bodies, a)).toEqual({ spot: c.spot, reach: a.orbit!.r });
      }
    }
    // Measured: 0.20 s alone, 0.50 s at load 8.6 (8 busy loops, 1 worker), under 0.3 s (vitest's report line) on CI
    // (run 38264919221). 5 s is 10.0 times the loaded time and over 16 times CI's.
  }, 5_000);

  it('counts the budget with the pairs', () => {
    for (const seed of SEEDS)
      for (const tier of ['phone', 'desktop'] as const) {
        const x = tier === 'desktop' ? of(seed) : generateGalaxy(seed, tier, galaxyBudget(MOTE_BUDGET_DESKTOP));
        const where = `${tier} seed ${seed}`;
        expect(x.motes, where).toBeLessThanOrEqual(93_500);
        expect(x.motes, where).toBe(drawnInstances(x));
        // A barycentre adds no instance (no shell, no person, no icosphere, no glow, no spikes), nor a core row.
        const ghosts = x.bodies.filter((b) => b.cracked && (b.kind === 'planet' || b.kind === 'moon')).length;
        expect(x.instances.bodies, where).toBe(kinds(x, 'planet').length + kinds(x, 'moon').length + ghosts);
        expect(x.instances.glow, where).toBe(STAR_COUNT);
        expect(x.instances.spikes, where).toBe(96 * STAR_COUNT);
      }
    // Measured: 1.20 s alone, 2.57 s at load 8.6 (8 busy loops, 1 worker), 1.26 s on CI
    // (run 38264919221). 10 s is 3.9 times the loaded time and 8 times CI's.
  }, 10_000);
});
