import { describe, expect, it } from 'vitest';
import { MOTE_BUDGET_DESKTOP, MOTE_SEED } from '../config';
import { CLEAN_AFTER, G_TWELVE, HI_AT_BIRTH, HI_TWELVE, REVIEW_VISITS, SWEEP, TWELVE } from './schedule';
import { bike, partShares } from '../mechanisms/bike';
import { NODE_NEVER } from '../scene/node/birth';
import { BG } from './background';
import { LATTICE, MOON_TRACK, latticeCount, moonLattice, planetLattice } from './body';
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
  PERSON_MIN,
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
 * Every instance the galaxy counts (plan Task 5's budget test, and the re-skin's §7): shells and person
 * sets; 90 dots per planet orbit and 40 per moon track (a track's moons share it); an icosphere per
 * body but a star and a ghost per planet or moon that carries the defect; a glow per star and core
 * body; each stream's dots, one per 1.2 units of its longest chord between 6 and 40, plus the feed's
 * 40; 96 spike dots per star; and the hole's 27,610, reserved while nothing draws it.
 */
function drawnInstances(x: Galaxy): number {
  const planets = kinds(x, 'planet');
  const tracks = planets.reduce((n, p) => n + 90 + 40 * new Set(moonsOf(x, p.id).map((m) => m.orbit!.r)).size, 0);
  const ghosts = x.bodies.filter((b) => b.cracked && (b.kind === 'planet' || b.kind === 'moon')).length;
  const glow = kinds(x, 'star').length + kinds(x, 'core').length;
  const centre = (b: Body): readonly number[] =>
    b.kind === 'planet' ? x.bodies[b.host].spot! : b.kind === 'moon' ? x.bodies[x.bodies[b.host].host].spot! : b.spot!;
  const reach = (b: Body): number => (b.kind === 'planet' ? b.orbit!.r : b.kind === 'moon' ? x.bodies[b.host].orbit!.r + b.orbit!.r : 0);
  const dots = x.streams.reduce((n, s) => {
    const [a, b] = [x.bodies[s.from], x.bodies[s.to]];
    // Ceil: the shader draws an unrounded count, the last dot partly (stream.ts streamCount).
    return n + Math.min(40, Math.max(6, Math.ceil((dist(centre(a), centre(b)) + reach(a) + reach(b)) / 1.2)));
  }, 40);
  const shells = x.bodies.reduce((n, b) => n + b.motes + b.personMotes, 0);
  const stars = kinds(x, 'star').length;
  return shells + tracks + x.bodies.length - stars + ghosts + glow + dots + 96 * stars + 27_610;
}

/**
 * The neighbourhood's 30 star spots [x, z] (y 0), copied from scratch/session/galaxytuner/hood.txt.
 * Re-pinned by the re-skin's Task 1d (the designed change: systems at least HOOD_SPACING 1.5 × their
 * outer radii apart). Before it, the first and last were [40.56849831458735, 50.916398553737885] and
 * [-56.58197443306347, 69.75555196235015].
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
  [57.34926083050949, -28.502208062543563],
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
  [25.620209490705605, -34.41354177628917],
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

  it('indexes every body by id and alias, in birth order', () => {
    g.bodies.forEach((b, i) => {
      expect(b.index).toBe(i);
      expect(bodyIndex(g, b.id)).toBe(i);
      if (b.alias) expect(bodyIndex(g, b.alias)).toBe(i);
      if (i > 0) expect(b.born).toBeGreaterThanOrEqual(g.bodies[i - 1].born);
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
      expect(b.lattice).toEqual([...LATTICE.core]);
      expect(b.orbit).toBeNull();
      expect(Math.hypot(...b.spot!)).toBeLessThanOrEqual(CORE_SPREAD);
      for (const o of core) if (o !== b) expect(dist(b.spot!, o.spot!)).toBeGreaterThanOrEqual(CORE_MIN_GAP);
    }
  });

  it('has STAR_COUNT stars on the arm stretch, every system disjoint', () => {
    const stars = kinds(g, 'star');
    expect(stars).toHaveLength(STAR_COUNT);
    expect(g.systems).toEqual(stars.map((s) => s.index));
    expect(g.systems.length).toBeLessThanOrEqual(SYS_MAX);
    for (const s of stars) {
      const r = Math.hypot(s.spot![0], s.spot![2]);
      expect(r).toBeGreaterThanOrEqual(HOOD_R[0]);
      expect(r).toBeLessThanOrEqual(HOOD_R_WIDE);
      expect(s.R).toBe(0.9);
      expect(s.lattice).toBeNull();
    }
    for (let i = 0; i < stars.length; i++) {
      for (let j = i + 1; j < stars.length; j++) {
        const gap = dist(stars[i].spot!, stars[j].spot!);
        expect(gap).toBeGreaterThanOrEqual(systemOuter(g, stars[i].index) + systemOuter(g, stars[j].index) + 1);
      }
    }
    const c = stars.reduce(
      (a, s) => [a[0] + s.spot![0] / STAR_COUNT, a[1] + s.spot![1] / STAR_COUNT, a[2] + s.spot![2] / STAR_COUNT],
      [0, 0, 0],
    );
    for (let k = 0; k < 3; k++) expect(g.hoodCentroid[k]).toBeCloseTo(c[k], 9);
  });

  it('the neighbourhood does not move', () => {
    // The 30 star spots, in order, as the tuner's neighbourhood holds them (its hood.txt, [x, z], y 0).
    // placeStars lays them along HOOD_PITCH, not the arms' pitch, so a re-tuned arm moves none of them.
    expect(g.systems).toHaveLength(HOOD_SPOTS.length);
    g.systems.forEach((i, k) => {
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
      const spots = x.systems.map((i) => x.bodies[i].spot!);
      return spots.map((s, i) => Math.min(...spots.map((o, j) => (i === j ? Infinity : dist(s, o)))));
    };

    it('places thirty for every seed', () => {
      // Measured: every seed of 1–40 fits through the wide pass; the widest galactic radius used is
      // 149.99 (seed 1's farthest spot), against HOOD_R_WIDE 150.
      let widest = 0;
      each((x, where) => {
        expect(x.systems, where).toHaveLength(STAR_COUNT);
        for (const i of x.systems) widest = Math.max(widest, Math.hypot(x.bodies[i].spot![0], x.bodies[i].spot![2]));
      });
      expect(widest).toBeLessThanOrEqual(HOOD_R_WIDE);
    }, 120_000);

    it('keeps every pair of systems at least 1.5 × their outer radii plus the margin apart', () => {
      expect(HOOD_SPACING).toBe(1.5);
      expect(HOOD_MARGIN).toBe(1);
      each((x, where) => {
        for (let a = 0; a < x.systems.length; a++)
          for (let b = a + 1; b < x.systems.length; b++) {
            const [i, j] = [x.systems[a], x.systems[b]];
            const want = HOOD_SPACING * (systemOuter(x, i) + systemOuter(x, j)) + HOOD_MARGIN;
            expect(dist(x.bodies[i].spot!, x.bodies[j].spot!), `${where}: ${x.bodies[i].id} and ${x.bodies[j].id}`).toBeGreaterThanOrEqual(want - 1e-9);
          }
      });
      // The neighbourhood grows by about the spacing: seed 1's nearest-neighbour mean was 18.63 (least
      // 14.07, RMS spread about the centroid 55.19); measured now 27.48 (least 24.41, RMS 67.67), 1.475×.
      const nn = nearest(g);
      const mean = nn.reduce((s, v) => s + v, 0) / nn.length;
      expect(mean / 18.63).toBeGreaterThanOrEqual(1.3);
      expect(mean / 18.63).toBeLessThanOrEqual(1.5);
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
        for (const i of x.systems) if (i !== pa.index) expect(score(pa.spot!), `${where}: P_a against ${x.bodies[i].id}`).toBeLessThan(score(x.bodies[i].spot!));
      });
    }, 120_000);
  });

  it("a system's outer radius is its widest planet's apoapsis plus that planet's reach", () => {
    for (const star of g.systems) {
      const planets = planetsOf(g, star);
      expect(planets.length).toBeGreaterThanOrEqual(2);
      expect(planets.length).toBeLessThanOrEqual(9);
      let outer = 0;
      for (const p of planets) {
        const reach = Math.max(p.R, ...moonsOf(g, p.id).map((m) => m.orbit!.r + m.R));
        outer = Math.max(outer, p.orbit!.r + reach);
        expect(p.orbit!.r).toBeLessThanOrEqual(9.6 + 1e-12);
      }
      expect(systemOuter(g, star)).toBeCloseTo(outer, 12);
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
      expect(b.motes).toBe(b.kind === 'star' ? 160 : latticeCount(...b.lattice!));
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
        expect([b.star, b.planet, b.host]).toEqual([b.index, -1, -1]);
        expect(b.rule).toBe(g.bodies[b.parents[0]].rule);
      }
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
  }, 120_000);

  it("keeps every planet's eccentricity in its band but in a flattened system", () => {
    // §12.1's 0.05-0.22; only a system of the story's planets that cannot fit otherwise (P5's nine) falls below it.
    expect(g.fit.flattened).toContain('P5');
    for (const p of kinds(g, 'planet')) {
      if (g.fit.flattened.includes(g.bodies[p.host].id)) {
        expect(p.orbit!.e).toBeLessThanOrEqual(0.22);
        continue;
      }
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

  it('gives the planets and moons orbits and nothing else one', () => {
    for (const b of g.bodies) {
      expect(b.orbit === null).toBe(b.kind === 'core' || b.kind === 'star');
      expect(b.spot === null).toBe(b.kind === 'planet' || b.kind === 'moon');
    }
  });

  it('fits everything it draws in the budget', () => {
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
    // ...and the filler pays: some unnamed planet is thinner than its radius's lattice.
    expect(kinds(g, 'planet').some((p) => p.id !== HERO_PLANET && !FULL_DENSITY.includes(p.id) && latticeCount(...p.lattice!) < latticeCount(...planetLattice(p.R)))).toBe(true);
    for (const b of g.bodies) {
      if (b.kind === 'core') expect(b.lattice).toEqual([...LATTICE.core]);
      if (b.kind === 'star') expect([b.lattice, b.motes]).toEqual([null, 160]);
    }
    for (const b of g.bodies) expect(b.personMotes > 0).toBe(b.cracked);
  });

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
      // The icospheres drawn: none for a star.
      const ghosts = x.bodies.filter((b) => b.cracked && (b.kind === 'planet' || b.kind === 'moon')).length;
      expect(x.instances.bodies).toBe(x.bodies.length - STAR_COUNT + ghosts);
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

  it('reserves the hole until it is drawn', () => {
    for (const x of [g, generateGalaxy(MOTE_SEED, 'phone', galaxyBudget(MOTE_BUDGET_DESKTOP))]) {
      const i = x.instances;
      expect(i.reserved).toBe(i.hole);
      expect(i.hole).toBe(holeInstances());
      expect(i.reserved).toBe(27_610);
      expect(i.total - i.reserved).toBe(i.shells + i.persons + i.tracks + i.bodies + i.glow + i.streams + i.spikes);
    }
  });

  // Runs by itself once the core rows draw nothing (the re-skin's Task 5): until then the six core
  // bodies keep their 5,520 instances and the planets and moons cannot have this room (measured at
  // Task 2: 34,880 against the 35,620 this asks; 31,196 before the re-skin).
  it.skipIf(kinds(g, 'core').some((b) => b.motes > 0))('the planets and moons keep their room', () => {
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
