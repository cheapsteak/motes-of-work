import { describe, expect, it } from 'vitest';
import { MOTE_BUDGET_DESKTOP, MOTE_SEED } from '../config';
import { CLEAN_AFTER, G_TWELVE, HI_AT_BIRTH, HI_TWELVE, REVIEW_VISITS, SWEEP, TWELVE } from '../network/schedule';
import { NODE_NEVER } from '../scene/node/birth';
import { BG } from './background';
import { LATTICE, MOON_TRACK, latticeCount, moonLattice, planetLattice } from './body';
import {
  CORE_MIN_GAP,
  CORE_SPREAD,
  HERO_PLANET,
  HOOD_R,
  MOON_MARGIN_SHARE,
  PLANET_MARGIN,
  STAR_COUNT,
  SYS_MAX,
  bodyIndex,
  galaxyBudget,
  generateGalaxy,
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
      expect(r).toBeLessThanOrEqual(110);
      expect(s.R).toBe(0.9);
      expect(s.lattice).toEqual([...LATTICE.star]);
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
        if (!p.scripted) expect(p.born).toBeGreaterThanOrEqual(s.born + 0.5 * s.dur - 1e-12);
      }
    }
  });

  it('gives N0 its seven parts, sized by their share of the bike', () => {
    const moons = moonsOf(g, 'N0');
    expect(moons.map((m) => m.partGroup)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    const share = [1, 1, 0.6, 0.5, 0.3, 0.4, 0.2];
    moons.forEach((m, i) => expect(m.R).toBeCloseTo(Math.max(0.04, 0.35 * 0.3 * Math.sqrt(share[i] / 1)), 12));
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
        expect(b.lattice).toEqual(b.id === HERO_PLANET ? [...LATTICE.hero] : planetLattice(b.R));
        const moons = moonsOf(g, b.id);
        for (const r of new Set(moons.map((m) => m.orbit!.r))) {
          // A track's moons share its ellipse, and keep their phases evenly apart round it.
          const on = moons.filter((m) => m.orbit!.r === r);
          for (const m of on) expect({ ...m.orbit!, phase: 0 }).toEqual({ ...on[0].orbit!, phase: 0 });
          const phases = on.map((m) => m.orbit!.phase).sort((x, y) => x - y);
          for (let k = 1; k < phases.length; k++) expect(phases[k] - phases[k - 1]).toBeCloseTo(1 / phases.length, 9);
        }
      }
      if (b.kind === 'moon') expect(b.lattice).toEqual(moonLattice(b.R));
      expect(b.motes).toBe(latticeCount(...b.lattice));
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
      expect(s.bow).toBeGreaterThanOrEqual(0);
      expect(s.bow).toBeLessThan(2 * Math.PI);
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

  it('fits the budget', () => {
    expect(g.motes).toBeLessThanOrEqual(galaxyBudget(MOTE_BUDGET_DESKTOP));
    expect(g.motes).toBe(g.bodies.reduce((s, b) => s + b.motes + b.personMotes, 0));
    expect(galaxyBudget(MOTE_BUDGET_DESKTOP)).toBe(76_000);
    // At the desktop budget no shell is thinned: every lattice is the spec's.
    expect(byId(g, 'C1').motes).toBe(6116);
    for (const b of g.bodies) expect(b.personMotes > 0).toBe(b.cracked);
  });

  it('a smaller budget thins the shells, never the layout, and the named shells last', () => {
    const layout = (x: Galaxy) => x.bodies.map((b) => [b.id, b.R, b.orbit, b.spot, b.born]);
    const mid = generateGalaxy(MOTE_SEED, 'desktop', 60_000);
    expect(mid.motes).toBeLessThanOrEqual(60_000);
    expect(layout(mid)).toEqual(layout(g));
    for (const b of mid.bodies) {
      if (b.kind === 'core' || b.kind === 'star' || b.id === HERO_PLANET) expect(b.lattice).toEqual(g.bodies[b.index].lattice);
    }
    expect(mid.bodies.some((b, i) => b.motes < g.bodies[i].motes)).toBe(true);
    const small = generateGalaxy(MOTE_SEED, 'desktop', 30_000);
    expect(small.motes).toBeLessThanOrEqual(30_000);
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
