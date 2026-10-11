import { describe, expect, it } from 'vitest';
import { MOTE_BUDGET_DESKTOP, MOTE_SEED } from '../../config';
import { AMBIENT_POSE } from '../../galaxy/ambient';
import { galaxyBudget, generateGalaxy } from '../../galaxy/generate';
import { hexToRgb } from './birth';
import { bodyTexel, LIGHT_MODE, packBodyData } from './bodyData';
import { PLANET_LOOK } from './classLook';
import { bodyWorld } from './orbit';
import { starTint } from './star';
import { farSide, lightDir, planetTint, terminator } from './terminator';

// The planets' and moons' light (re-skin §4.4): a terminator toward their own star, a moon's its
// planet's, and their cool colours tinted by that star; C1 pinned to its luminous cyan.

const g = generateGalaxy(MOTE_SEED, 'desktop', galaxyBudget(MOTE_BUDGET_DESKTOP));
const data = packBodyData(g);
const AMBIENTS = [0, AMBIENT_POSE, 101, 1234.5, 3599.9];
const unit = (v: readonly number[]): number[] => {
  const n = Math.hypot(...v);
  return v.map((x) => x / n);
};

describe('the terminator (re-skin §4.4)', () => {
  it('lit facing the star, night behind it', () => {
    expect(terminator([0, 0, 1], [0, 0, 1], 0.15)).toBe(1);
    expect(terminator([0, 0, -1], [0, 0, 1], 0.15)).toBe(0.15);
    expect(terminator([1, 0, 0], [0, 0, 1], 0.15)).toBeCloseTo(0.575, 9);
  });

  it('rises over ±PLANET_LOOK.edge of n·L, never below its night nor above 1, and keeps the subject’s night', () => {
    const e = PLANET_LOOK.edge;
    for (const night of [PLANET_LOOK.night.rest, PLANET_LOOK.night.subject]) {
      expect(terminator([0, -1, 0], [0, 1, 0], night)).toBe(night);
      // Just past the edge either way it is at its ends; in between it climbs.
      const at = (d: number) => terminator([Math.sqrt(1 - d * d), d, 0], [0, 1, 0], night);
      expect(at(-e - 1e-9)).toBe(night);
      expect(at(e + 1e-9)).toBe(1);
      let last = -Infinity;
      for (let d = -1; d <= 1; d += 0.01) {
        const v = at(d);
        expect(v).toBeGreaterThanOrEqual(night);
        expect(v).toBeLessThanOrEqual(1);
        expect(v).toBeGreaterThanOrEqual(last);
        last = v;
      }
    }
  });

  it("a planet is lit from its own star, and a moon from its planet's star", () => {
    const planets = g.bodies.filter((b) => b.kind === 'planet');
    const moons = g.bodies.filter((b) => b.kind === 'moon');
    expect(planets.length).toBeGreaterThan(50);
    expect(moons.length).toBeGreaterThan(50);
    for (const t of AMBIENTS) {
      for (const b of [...planets, ...moons]) {
        // A moon's star is its planet's: the star its planet goes round.
        const star = b.kind === 'moon' ? g.bodies[g.bodies[b.planet].host].index : b.host;
        expect(g.bodies[star].kind, b.id).toBe('star');
        const want = unit(bodyWorld(data, star, t).map((x, k) => x - bodyWorld(data, b.index, t)[k]));
        const got = lightDir(data, b.index, t);
        got.forEach((x, k) => expect(x, `${b.id} at ${t}`).toBeCloseTo(want[k], 9));
        expect(Math.hypot(...got)).toBeCloseTo(1, 12);
      }
    }
  });

  it('a binary star’s planet is lit from its own star as the star goes round its barycentre', () => {
    const planet = g.bodies.find((b) => b.kind === 'planet' && g.bodies[b.host].host >= 0);
    expect(planet, 'the essay’s galaxy has a pair with a planet').toBeDefined();
    const dirs = [0, 600, 1200].map((t) => lightDir(data, planet!.index, t));
    for (const [t, d] of [0, 600, 1200].map((t, k) => [t, dirs[k]] as const)) {
      const want = unit(bodyWorld(data, planet!.host, t).map((x, k) => x - bodyWorld(data, planet!.index, t)[k]));
      d.forEach((x, k) => expect(x).toBeCloseTo(want[k], 9));
    }
  });
});

describe('the far side (fix round 1: a crescent from behind)', () => {
  it('is whole facing the camera and on the limb, PLANET_LOOK.farSide.dim facing away, rising over its soft band', () => {
    const { dim, soft } = PLANET_LOOK.farSide;
    expect(farSide([0, 0, 1], [0, 0, 1])).toBe(1);
    expect(farSide([1, 0, 0], [0, 0, 1])).toBe(1);
    expect(farSide([0, 0, -1], [0, 0, 1])).toBe(dim);
    const at = (d: number) => farSide([Math.sqrt(1 - d * d), 0, d], [0, 0, 1]);
    expect(at(-soft - 1e-9)).toBe(dim);
    expect(at(-soft / 2)).toBeCloseTo((dim + 1) / 2, 12);
    let last = -Infinity;
    for (let d = -1; d <= 1; d += 0.01) {
      expect(at(d)).toBeGreaterThanOrEqual(last);
      last = at(d);
    }
  });

  it('makes a planet lit from behind a crescent: its far hemisphere, lit, under its near one at the rest night', () => {
    // Lit from straight behind (toStar away from the eye): the near hemisphere is at its night, the far
    // one lit but seen through the lattice. With the far side dimmed, no far dot outshines the near ones'
    // night by more than dim / rest.
    const toEye: [number, number, number] = [0, 0, 1];
    const toStar: [number, number, number] = [0, 0, -1];
    const far = terminator([0, 0, -1], toStar, PLANET_LOOK.night.rest) * farSide([0, 0, -1], toEye);
    const near = terminator([0, 0, 1], toStar, PLANET_LOOK.night.rest) * farSide([0, 0, 1], toEye);
    expect(near).toBe(PLANET_LOOK.night.rest);
    expect(far).toBe(PLANET_LOOK.farSide.dim);
    // The crescent: the limb toward the star stays whole and lit.
    const limb: [number, number, number] = [0, 1, -0.05];
    const n = Math.hypot(...limb);
    expect(terminator(limb.map((x) => x / n) as [number, number, number], toStar, PLANET_LOOK.night.rest) * farSide(limb.map((x) => x / n) as [number, number, number], toEye)).toBeGreaterThan(0.6);
  });
});

describe('the planets’ colours (re-skin §4.4)', () => {
  const mix = (a: readonly number[], b: readonly number[], t: number) => a.map((x, k) => x * (1 - t) + b[k] * t);

  it('C1 is #1FB0FF; others mix 0.25 toward their star', () => {
    for (const T of [0, 0.3, 1]) {
      for (let h = 0; h < PLANET_LOOK.cool.length; h++) {
        expect(planetTint(h, T, true)).toEqual(hexToRgb('#1FB0FF'));
        planetTint(h, T, false).forEach((x, k) => expect(x).toBeCloseTo(mix(hexToRgb(PLANET_LOOK.cool[h]), starTint(T), 0.25)[k], 12));
      }
    }
    // Times FOCUS_GAIN 2.5 the hero is the freeze mock's luminous cyan, (0.30, 1, 1) saturated.
    const lit = planetTint(0, 0, true).map((x) => Math.min(1, 2.5 * x));
    expect(lit[0]).toBeCloseTo(0.3, 2);
    expect(lit[1]).toBe(1);
    expect(lit[2]).toBe(1);
  });

  it('every planet and moon carries its colour in the bodies texture, lit by the terminator; C1 and its moons the hero’s cyan', () => {
    const f = Math.fround;
    const c1 = g.ids.C1;
    let heroes = 0;
    for (const b of g.bodies) {
      if (b.kind !== 'planet' && b.kind !== 'moon') continue;
      const planet = g.bodies[b.planet];
      const hero = planet.index === c1;
      if (hero) heroes++;
      const want = planetTint(b.hue!, g.bodies[b.star].look!.temperature, hero);
      expect(bodyTexel(data.bodies, 6, b.index), b.id).toEqual([...want.map(f), LIGHT_MODE.terminator]);
    }
    expect(heroes).toBe(1 + g.bodies.filter((b) => b.kind === 'moon' && b.planet === c1).length);
  });

  it('a planet’s hue is its own draw from planetHue, a moon’s its planet’s, and nothing else has one', () => {
    const hues = new Set<number>();
    for (const b of g.bodies) {
      if (b.kind === 'planet') {
        expect(Number.isInteger(b.hue), b.id).toBe(true);
        expect(b.hue!).toBeGreaterThanOrEqual(0);
        expect(b.hue!).toBeLessThan(PLANET_LOOK.cool.length);
        hues.add(b.hue!);
      } else if (b.kind === 'moon') {
        expect(b.hue, b.id).toBe(g.bodies[b.planet].hue);
      } else {
        expect(b.hue, b.id).toBeNull();
      }
    }
    // Every colour of the palette is drawn somewhere in the essay's galaxy.
    expect(hues.size).toBe(PLANET_LOOK.cool.length);
  });
});
