import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../math/hash';
import {
  BIN,
  CORE_R,
  GLOW_CAP,
  LATTICE,
  MOON_LATTICE_MIN,
  MOON_PERIOD,
  MOON_TRACK,
  PLANET_R_PIN,
  STAR_R,
  binaryPeriod,
  forcedEccentricity,
  glowPx,
  hwS,
  latticeCount,
  latticeRowCols,
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
  starLook,
  starMass,
} from './body';
import { STAR_LOOK } from '../scene/node/classLook';

/** Unit normals from −4 to 4: the log-normal laws' whole useful range and past both clamps. */
const gaussGrid = Array.from({ length: 81 }, (_, i) => -4 + i / 10);

describe('body', () => {
  it("the lattice counts are the spec's", () => {
    expect(latticeCount(60, 160)).toBe(6116); // morph §7.2's hero shell
    expect(latticeCount(...LATTICE.hero)).toBe(6116);
    expect(latticeCount(22, 64)).toBe(900); // a core body (§14.2)
    expect(latticeCount(...LATTICE.core)).toBe(900);
    // A star has no lattice (re-skin §4.3): its shell is a cloud of dots.
    expect(Object.keys(LATTICE)).toEqual(['hero', 'core']);
    expect(latticeCount(14, 36)).toBe(324); // a 0.30 planet (300)
    expect(planetLattice(PLANET_R_PIN)).toEqual([14, 36]);
    expect(latticeCount(...moonLattice(0.036, PLANET_R_PIN, planetLattice(PLANET_R_PIN)))).toBeGreaterThanOrEqual(12); // §13's floor
  });

  it('a lattice row has max(6, round(cols cos lat)) points, the rows evenly spaced in latitude', () => {
    const rows = latticeRowCols(14, 36);
    expect(rows).toHaveLength(14);
    for (let i = 0; i < 14; i++) {
      const lat = -Math.PI / 2 + (Math.PI * (i + 0.5)) / 14;
      expect(rows[i]).toBe(Math.max(6, Math.round(36 * Math.cos(lat))));
    }
    expect(rows).toEqual([...rows].reverse()); // symmetric about the equator
    expect(latticeCount(14, 36)).toBe(rows.reduce((s, n) => s + n, 0));
  });

  it('planet and moon lattices scale with the radius and keep their floors', () => {
    expect(planetLattice(0.14)).toEqual([7, 17]);
    expect(planetLattice(0.5)).toEqual([23, 60]);
    expect(planetLattice(0.01)).toEqual([5, 10]);
    // A moon takes its planet's pitch (its planet's grain), whatever its planet's lattice, over MOON_LATTICE_MIN.
    expect(moonLattice(0.1, 0.3, [14, 36])).toEqual([5, 12]);
    expect(moonLattice(0.04, 0.3, [...LATTICE.hero])).toEqual([8, 21]);
    expect(moonLattice(0.06, 0.3, [...LATTICE.hero])).toEqual([12, 32]);
    expect(moonLattice(0.01, 0.3, [14, 36])).toEqual([...MOON_LATTICE_MIN]);
    // Density on the sphere holds roughly constant across sizes (§13: motes ∝ R²).
    const perArea = (R: number, n: number): number => n / (4 * Math.PI * R * R);
    const ref = perArea(0.3, latticeCount(...planetLattice(0.3)));
    for (const R of [0.2, 0.4, 0.5]) expect(perArea(R, latticeCount(...planetLattice(R))) / ref).toBeGreaterThan(0.8);
  });

  it('sizes and counts stay in their bands', () => {
    for (const g of gaussGrid) {
      expect(planetRadius(g)).toBeGreaterThanOrEqual(0.14);
      expect(planetRadius(g)).toBeLessThanOrEqual(0.5);
    }
    expect(planetRadius(0)).toBeCloseTo(0.22, 12);
    for (const Rp of [0.14, 0.3, 0.5]) {
      for (const g of gaussGrid) {
        const r = moonRadius(Rp, g);
        expect(r).toBeGreaterThanOrEqual(0.04);
        expect(r).toBeLessThanOrEqual(0.35 * Rp + 1e-12);
      }
    }
    expect(planetCount(0)).toBe(2);
    expect(planetCount(0.9999)).toBe(9);
    expect(planetCount(0.5)).toBe(4);
    expect(moonCount(0.44, 0.5)).toBe(0);
    expect(moonCount(0.5, 1e-9)).toBe(6);
    expect(moonCount(0.5, 1)).toBe(1);
    expect(moonCount(0.5, Math.exp(-0.7) - 1e-9)).toBe(2);
    expect([0, 1, 2, 3, 4, 5, 6].map((i) => moonTrack(i, 7))).toEqual([0, 0, 0, 1, 1, 2, 2]); // the bike: 3 / 2 / 2
    expect([0, 1, 2].map((i) => moonTrack(i, 3))).toEqual([0, 1, 2]);
    expect([0, 1, 2, 3, 4, 5].map((i) => moonTrack(i, 6))).toEqual([0, 0, 1, 1, 2, 2]);
    expect(moonTrack(0, 1)).toBe(0);
    expect([0, 1].map((i) => moonTrack(i, 2))).toEqual([0, 1]);
    expect(MOON_TRACK).toEqual([1.3, 1.9, 2.5]);
    expect(MOON_PERIOD).toEqual([6, 9, 12]);
    expect(CORE_R).toBe(1.4);
    expect(STAR_R).toBe(0.9);
  });

  it('the share of bare planets is 0.45, and moon counts fall off geometrically', () => {
    const rng = mulberry32(7);
    const n = 20_000;
    const counts = Array.from({ length: 7 }, () => 0);
    for (let i = 0; i < n; i++) counts[moonCount(rng(), rng())]++;
    expect(counts[0] / n).toBeGreaterThan(0.43);
    expect(counts[0] / n).toBeLessThan(0.47);
    for (let k = 1; k < 5; k++) expect(counts[k + 1]).toBeLessThan(counts[k]);
  });

  it('a planet period grows with its orbit', () => {
    expect(planetPeriod(2.4)).toBe(60);
    expect(planetPeriod(8.8)).toBeCloseTo(180, 12);
    expect(planetPeriod(2.2)).toBeLessThan(planetPeriod(9.6));
  });

  it('orbits keep inside their bounds', () => {
    const rng = mulberry32(11);
    for (let i = 0; i < 10_000; i++) {
      const r = 2.2 + 7.4 * rng();
      const p = orbitFor('planet', r, planetPeriod(r), rng);
      expect(p.e).toBeGreaterThanOrEqual(0.05);
      expect(p.e).toBeLessThanOrEqual(0.22);
      expect(Math.abs(p.tilt)).toBeLessThanOrEqual(0.25);
      expect(p.precession).toBeGreaterThanOrEqual(400);
      expect(p.precession).toBeLessThanOrEqual(900);
      expect(p.a * (1 + p.e)).toBeCloseTo(r, 12); // r is the apoapsis
      expect(p.r).toBe(r);
      expect(p.period).toBe(planetPeriod(r));
      for (const v of [p.tiltAz, p.omega0]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(2 * Math.PI);
      }
      expect(p.phase).toBeGreaterThanOrEqual(0);
      expect(p.phase).toBeLessThan(1);

      const m = orbitFor('moon', 0.5, 9, rng);
      expect(m.e).toBeGreaterThanOrEqual(0.05);
      expect(m.e).toBeLessThanOrEqual(0.12);
      expect(Math.abs(m.tilt)).toBeLessThanOrEqual(0.2);
      expect(m.precession).toBeGreaterThanOrEqual(90);
      expect(m.precession).toBeLessThanOrEqual(200);
      expect(m.a * (1 + m.e)).toBeCloseTo(0.5, 12);
    }
  });

  it('adjacent moon tracks never cross at the widest eccentricity', () => {
    // Apoapsis of track i under the periapsis of track i + 1 with e at the moons' maximum.
    for (let i = 0; i < 2; i++) expect(MOON_TRACK[i]).toBeLessThan((MOON_TRACK[i + 1] * (1 - 0.12)) / (1 + 0.12));
  });

  it('planet orbit radii run from 2.2 out to the count-scaled last, increasing, within 9.6', () => {
    const rng = mulberry32(3);
    for (let trial = 0; trial < 2000; trial++) {
      const n = 2 + (trial % 8);
      const radii = planetOrbitRadii(n, rng);
      expect(radii).toHaveLength(n);
      expect(radii[0]).toBe(2.2);
      expect(radii[n - 1]).toBeCloseTo(5.5 + (4.1 * (n - 2)) / 7, 12);
      expect(radii[n - 1]).toBeLessThanOrEqual(9.6 + 1e-12);
      const nominal = (radii[n - 1] - 2.2) / (n - 1);
      for (let k = 1; k < n; k++) {
        const gap = radii[k] - radii[k - 1];
        expect(gap).toBeGreaterThan(0);
        // ±15 % on each gap, renormalised to the last radius: within the ratio of the extremes.
        expect(gap / nominal).toBeGreaterThanOrEqual(0.85 / 1.15 - 1e-9);
        expect(gap / nominal).toBeLessThanOrEqual(1.15 / 0.85 + 1e-9);
      }
    }
  });
});

describe('starLook', () => {
  it('draws brightness in [0.55, 1], period in [4, 9] s, phase in [0, 1), and six spikes iff brightness ≥ 0.8', () => {
    const rng = mulberry32(7);
    let [six, four] = [0, 0];
    for (let i = 0; i < 2000; i++) {
      const look = starLook(rng);
      expect(look.brightness).toBeGreaterThanOrEqual(0.55);
      expect(look.brightness).toBeLessThanOrEqual(1);
      expect(look.period).toBeGreaterThanOrEqual(4);
      expect(look.period).toBeLessThanOrEqual(9);
      expect(look.phase).toBeGreaterThanOrEqual(0);
      expect(look.phase).toBeLessThan(1);
      expect(look.temperature).toBeGreaterThanOrEqual(0);
      expect(look.temperature).toBeLessThan(1);
      expect(look.spikes).toBe(look.brightness >= STAR_LOOK.sixFrom ? 6 : 4);
      if (look.spikes === 6) six++;
      else four++;
    }
    // Both kinds occur: about 4/9 of the stars have six.
    expect(six).toBeGreaterThan(700);
    expect(four).toBeGreaterThan(900);
  });

  it('takes its draws in the order brightness, temperature, period, phase', () => {
    const draws = [0.6, 0.25, 0.75, 0.125];
    let i = 0;
    expect(starLook(() => draws[i++])).toEqual({ brightness: 0.55 + 0.45 * 0.6, spikes: 6, temperature: 0.25, period: 4 + 5 * 0.75, phase: 0.125 });
    expect(i).toBe(4);
  });
});

describe('glowPx', () => {
  it('sizes a glow by distance and holds it to [5, cap]', () => {
    expect(glowPx(0.9, 640, 1236.4, GLOW_CAP.star)).toBeCloseTo(8.69, 2);
    expect(glowPx(0.9, 1e6, 1000, GLOW_CAP.star)).toBe(5);
    expect(glowPx(0.9, 1, 1000, GLOW_CAP.star)).toBe(18);
    expect(glowPx(1.4, 1, 1000, GLOW_CAP.core)).toBe(24);
  });
});

describe('binaries (re-skin Task 1e)', () => {
  it("the S-type limit is Holman & Wiegert's", () => {
    // AJ 117, 621 (1999), eq. 1: a_c / a_B = 0.464 − 0.380 μ − 0.631 e + 0.586 μ e + 0.150 e² − 0.198 μ e².
    expect(hwS(0.5, 0)).toBeCloseTo(0.464 - 0.19, 9); // 0.274: equal masses, circular
    // By hand: 0.464 − 0.114 − 0.1262 + 0.03516 + 0.006 − 0.002376.
    expect(hwS(0.3, 0.2)).toBeCloseTo(0.262584, 9);
    // 0.464 − 0.266 − 0.2524 + 0.16408 + 0.024 − 0.022176.
    expect(hwS(0.7, 0.4)).toBeCloseTo(0.111504, 9);
    // Within 6 % of the paper's own Table 3 at those three points (0.26, 0.25, 0.11; the fit is good to 4 % typically).
    expect(Math.abs(hwS(0.5, 0) / 0.26 - 1)).toBeLessThan(0.06);
    expect(Math.abs(hwS(0.3, 0.2) / 0.25 - 1)).toBeLessThan(0.06);
    expect(Math.abs(hwS(0.7, 0.4) / 0.11 - 1)).toBeLessThan(0.06);
  });

  it("the forced eccentricity is Heppenheimer's", () => {
    // A&A 65, 421 (1978), eq. 4: e swings between 0 and 5/2 (a / a_B) e_B / (1 − e_B²); the forced term is half that.
    expect(forcedEccentricity(2, 20, 0.3)).toBeCloseTo((1.25 * 0.1 * 0.3) / 0.91, 12);
    expect(forcedEccentricity(2, 20, 0)).toBe(0);
  });

  it('the masses and the period are the design stand-ins', () => {
    expect(starMass(0.5)).toBeCloseTo(0.5, 12);
    expect(starMass(1)).toBeCloseTo(1.2, 12);
    expect(starMass(0.9)).toBeGreaterThan(starMass(0.6));
    // Every essay star's mass ratio is inside the fit's 0.1 ≤ μ ≤ 0.9 (the lightest against the
    // heaviest), and every binary's eccentricity inside its 0 ≤ e ≤ 0.8.
    const [lo, hi] = STAR_LOOK.brightness.map(starMass);
    expect(lo / (lo + hi)).toBeGreaterThan(0.1);
    expect(hi / (lo + hi)).toBeLessThan(0.9);
    expect(BIN.e[1]).toBeLessThanOrEqual(0.8);
    // Matched to planetPeriod at r = 5: a pair 5 apart goes round in a planet's period at 5.
    expect(binaryPeriod(5)).toBeCloseTo(planetPeriod(5), 9);
    expect(BIN.kep).toBeCloseTo(9.727, 3);
    expect(binaryPeriod(16)).toBeCloseTo(BIN.kep * 64, 9);
  });
});
