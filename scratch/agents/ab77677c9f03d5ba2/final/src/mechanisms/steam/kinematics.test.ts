import { describe, expect, it } from 'vitest';
import { ZERO_FAULTS } from '../../timeline/sceneState';
import {
  crankAngle,
  ENGINE,
  G,
  GOVERNOR,
  governorAngle,
  governorOmega,
  LEVER,
  leverAngle,
  NOMINAL_OMEGA,
  pistonDistance,
  sleeveY,
  stemY,
  TWIN_LEVER_DROOP,
} from './kinematics';

const sweep = (n: number, from: number, to: number) =>
  Array.from({ length: n + 1 }, (_, i) => from + ((to - from) * i) / n);
const THETAS = sweep(72, 0, 2 * Math.PI);

describe('slider-crank', () => {
  const { crank: r, conrod: l } = ENGINE;

  it('puts the crosshead pin at x = r cos(theta) + sqrt(l^2 - r^2 sin^2(theta)) from the crank centre', () => {
    for (const t of THETAS) {
      const want = r * Math.cos(t) + Math.sqrt(l * l - r * r * Math.sin(t) ** 2);
      expect(pistonDistance(t)).toBeCloseTo(want, 12);
    }
  });

  it('keeps the con-rod length fixed: crank pin to crosshead pin is l at every angle', () => {
    for (const t of THETAS) {
      // Crank pin at r(cos, sin) along the line of stroke; crosshead pin on that line.
      const dx = pistonDistance(t) - r * Math.cos(t);
      const dy = -r * Math.sin(t);
      expect(Math.hypot(dx, dy)).toBeCloseTo(l, 12);
    }
  });

  it('reaches the dead centres at 0 and pi with a stroke of 2r', () => {
    expect(pistonDistance(0)).toBeCloseTo(l + r, 12);
    expect(pistonDistance(Math.PI)).toBeCloseTo(l - r, 12);
    const xs = THETAS.map((t) => pistonDistance(t));
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(2 * r, 9);
  });
});

describe('flyball governor', () => {
  const { minAngle, maxAngle, arm } = GOVERNOR;
  const omegas = sweep(400, 0, 4 * NOMINAL_OMEGA);

  it('settles at the nominal angle at the nominal speed', () => {
    expect(governorAngle(NOMINAL_OMEGA)).toBeCloseTo(GOVERNOR.nominalAngle, 12);
  });

  it('opens monotonically with speed, strictly so between the stops', () => {
    const angles = omegas.map((w) => governorAngle(w));
    for (let i = 1; i < angles.length; i++) {
      expect(angles[i]).toBeGreaterThanOrEqual(angles[i - 1]);
      if (angles[i - 1] > minAngle + 1e-9 && angles[i] < maxAngle - 1e-9)
        expect(angles[i]).toBeGreaterThan(angles[i - 1]);
    }
    expect(angles[0]).toBe(minAngle);
    expect(angles.at(-1)).toBe(maxAngle);
  });

  it('obeys the conical-pendulum equilibrium cos(theta) = g / (omega^2 L) between the stops', () => {
    let inBand = 0;
    for (const w of omegas) {
      const t = governorAngle(w);
      if (t > minAngle + 1e-9 && t < maxAngle - 1e-9) {
        inBand++;
        expect(Math.cos(t)).toBeCloseTo(G / (w * w * arm), 12);
      }
    }
    expect(inBand).toBeGreaterThan(50);
  });

  it('stays finite with the engine stopped (balls hang at the lower stop)', () => {
    expect(governorAngle(0)).toBe(minAngle);
  });

  it('lifts the sleeve as the balls fly out', () => {
    const angles = sweep(50, minAngle, maxAngle);
    for (let i = 1; i < angles.length; i++) expect(sleeveY(angles[i])).toBeGreaterThan(sleeveY(angles[i - 1]));
  });

  it('closes the throttle as the engine speeds up; the twin lever hangs disconnected whatever the speed', () => {
    const speeds = sweep(40, 0.5 * NOMINAL_OMEGA, 2 * NOMINAL_OMEGA);
    const stem = (w: number, variant: number) => stemY(leverAngle(sleeveY(governorAngle(w)), variant));
    for (let i = 1; i < speeds.length; i++) {
      expect(stem(speeds[i], 0)).toBeLessThanOrEqual(stem(speeds[i - 1], 0));
      expect(leverAngle(sleeveY(governorAngle(speeds[i])), 1)).toBeCloseTo(TWIN_LEVER_DROOP, 12);
    }
    // Hanging: the sleeve end has dropped, 35 degrees below level.
    expect(TWIN_LEVER_DROOP).toBeCloseTo((-35 * Math.PI) / 180, 12);
    expect(stem(2 * NOMINAL_OMEGA, 0)).toBeLessThan(stem(NOMINAL_OMEGA, 0) - 0.05);
    // At nominal the lever is level: the stem sits at the fulcrum height.
    expect(stem(NOMINAL_OMEGA, 0)).toBeCloseTo(LEVER.fulcrumY, 12);
  });
});

describe('speed and faults', () => {
  it('runs at the nominal governor speed when nothing is wrong', () => {
    expect(governorOmega(ZERO_FAULTS, 0)).toBeCloseTo(NOMINAL_OMEGA, 12);
  });

  it('overspeeds in the twin, and under the ratio fault, with the balls flying out', () => {
    for (const d of [0.2, 0.5, 1.3]) {
      expect(crankAngle(d, ZERO_FAULTS, 1)).toBeGreaterThan(2 * crankAngle(d, ZERO_FAULTS, 0));
      expect(crankAngle(d, { ...ZERO_FAULTS, ratio: 1 }, 0)).toBeGreaterThan(1.5 * crankAngle(d, ZERO_FAULTS, 0));
    }
    expect(governorAngle(governorOmega(ZERO_FAULTS, 1))).toBe(GOVERNOR.maxAngle);
    expect(governorAngle(governorOmega({ ...ZERO_FAULTS, ratio: 1 }, 0))).toBeGreaterThan(GOVERNOR.nominalAngle + 0.2);
  });

  it('a slipping belt starves the governor: the balls droop', () => {
    expect(governorAngle(governorOmega({ ...ZERO_FAULTS, slip: 1 }, 0))).toBeLessThan(GOVERNOR.nominalAngle - 0.2);
  });

  it('crank angle never runs backwards, under any single fault', () => {
    for (const k of ['bind', 'stall', 'ratio', 'slip'] as const) {
      const ds = sweep(400, 0, 2);
      for (let i = 1; i < ds.length; i++) {
        expect(crankAngle(ds[i], { ...ZERO_FAULTS, [k]: 1 }, 0)).toBeGreaterThanOrEqual(
          crankAngle(ds[i - 1], { ...ZERO_FAULTS, [k]: 1 }, 0) - 1e-12,
        );
      }
    }
  });

  /** Crank angle swept per unit drive, near crank angle `at`. */
  function rateNear(at: number, faults = ZERO_FAULTS): number {
    const ds = sweep(4000, 0, 1);
    let best = 0;
    let bestErr = Infinity;
    for (let i = 1; i < ds.length; i++) {
      const err = Math.abs(crankAngle(ds[i], faults, 0) - at);
      if (err < bestErr) [bestErr, best] = [err, i];
    }
    return (crankAngle(ds[best] + 1e-4, faults, 0) - crankAngle(ds[best] - 1e-4, faults, 0)) / 2e-4;
  }

  it('bind: the piston sticks mid-stroke (the crank crawls at 90 degrees, races through the dead centres)', () => {
    const bind = { ...ZERO_FAULTS, bind: 1 };
    expect(rateNear(Math.PI / 2, bind)).toBeLessThan(0.2 * rateNear(Math.PI / 2));
    expect(rateNear(Math.PI, bind)).toBeGreaterThan(rateNear(Math.PI));
  });

  it('stall: the engine stops at dead centre for a while, then catches up', () => {
    const stall = { ...ZERO_FAULTS, stall: 1 };
    const held = sweep(20, 0.5, 0.5 + 0.18).map((d) => crankAngle(d, stall, 0));
    for (const t of held) expect(t).toBeCloseTo(Math.PI, 9);
    // Catches up: a full turn still takes one unit of drive.
    expect(crankAngle(1, stall, 0)).toBeCloseTo(2 * Math.PI, 9);
  });
});
