import { describe, expect, it } from 'vitest';
import { ZERO_FAULTS, type Faults } from '../../timeline/sceneState';
import { AMPLITUDE, BEATS_PER_DRIVE, ESCAPE_TEETH, LIFT, escapement, mesh } from './kinematics';

const PITCH = (2 * Math.PI) / ESCAPE_TEETH;
const PERIOD = 2 / BEATS_PER_DRIVE; // drive per full balance oscillation (two beats)
const ok = ZERO_FAULTS;
const at = (d: number, f: Partial<Faults> = {}) => escapement(d, { ...ok, ...f });

describe('escapement kinematics', () => {
  it('swings the balance through the visual amplitude of about 250 degrees', () => {
    const peak = Math.max(...Array.from({ length: 401 }, (_, i) => at((i / 400) * PERIOD).balance));
    expect((peak * 180) / Math.PI).toBeCloseTo(250, 0);
    expect(AMPLITUDE).toBeCloseTo((250 * Math.PI) / 180, 12);
  });

  it('advances the escape wheel exactly one tooth per balance period, in two half-pitch ticks', () => {
    for (const d0 of [0.1, 0.37, 1.3]) {
      const a = at(d0).escape;
      expect(a - at(d0 + PERIOD).escape).toBeCloseTo(PITCH, 9); // turns clockwise: the angle falls
      expect(a - at(d0 + PERIOD / 2).escape).toBeCloseTo(PITCH / 2, 9);
    }
  });

  it('steps discretely: the wheel is locked except while the balance is inside the lift angle', () => {
    for (let i = 0; i < 400; i++) {
      const d = (i / 400) * 2 * PERIOD;
      const s = at(d);
      if (Math.abs(s.balance) > LIFT && Math.abs(at(d + 1e-4).balance) > LIFT) {
        expect(at(d + 1e-4).escape).toBe(s.escape);
      }
    }
    // ...and moves while it is inside (the balance passes zero at drive 0).
    expect(at(1e-4).escape).not.toBe(at(0).escape);
  });

  it('rocks the pallet fork between its two bankings in step with the balance', () => {
    for (let i = 0; i < 200; i++) {
      const s = at((i / 200) * 2 * PERIOD);
      expect(Math.abs(s.pallet)).toBeLessThanOrEqual(s.banking + 1e-12);
      // Outside the lift the fork rests on the banking opposite the balance's swing.
      if (Math.abs(s.balance) > LIFT) expect(s.pallet).toBeCloseTo(-Math.sign(s.balance) * s.banking, 12);
    }
  });

  it('stays continuous through every tick', () => {
    let prev = at(0);
    for (let i = 1; i <= 4000; i++) {
      const s = at((i / 4000) * 3 * PERIOD);
      expect(Math.abs(s.escape - prev.escape)).toBeLessThan(PITCH / 20);
      expect(Math.abs(s.pallet - prev.pallet)).toBeLessThan(s.banking / 4);
      prev = s;
    }
  });
});

describe('escapement faults', () => {
  it('ratio runs the watch fast: more ticks than the ghost over the same drive', () => {
    expect(at(0, { ratio: 1 }).escape - at(1, { ratio: 1 }).escape).toBeGreaterThan(
      1.5 * (at(0).escape - at(1).escape),
    );
  });

  it('slip skips teeth: the wheel gets ahead of the ghost by whole half-pitches', () => {
    const lead = at(1).escape - at(1, { slip: 1 }).escape;
    expect(lead).toBeGreaterThan(PITCH);
    const halves = lead / (PITCH / 2);
    expect(halves - Math.round(halves)).toBeCloseTo(0, 6);
  });

  it('bind collapses the balance amplitude but keeps it above the lift so the watch still ticks', () => {
    const peak = (f: Partial<Faults>) =>
      Math.max(...Array.from({ length: 401 }, (_, i) => Math.abs(at((i / 400) * PERIOD, f).balance)));
    expect(peak({ bind: 1 })).toBeLessThan(0.35 * peak({}));
    expect(peak({ bind: 1 })).toBeGreaterThan(LIFT);
  });

  it('stall stops the balance for part of every cycle, then it restarts', () => {
    const still: boolean[] = [];
    for (let i = 0; i < 400; i++) {
      const d = (i / 400) * 4 * PERIOD;
      const a = at(d, { stall: 1 });
      const b = at(d + 1e-3, { stall: 1 });
      still.push(a.escape === b.escape && Math.abs(a.balance - b.balance) < 1e-3);
    }
    expect(still.filter(Boolean).length).toBeGreaterThan(80);
    expect(still.filter((x) => !x).length).toBeGreaterThan(80);
  });

  it('misalign lets the escape wheel creep past the pallets', () => {
    expect(at(0.7).escape - at(0.7, { misalign: 1 }).escape).toBeGreaterThan(PITCH / 4);
  });
});

describe('mesh', () => {
  it('turns the driven wheel the other way at the tooth ratio', () => {
    expect(mesh(0.4, 7, 1.2, 40) - mesh(0.3, 7, 1.2, 40)).toBeCloseTo((-0.1 * 7) / 40, 12);
  });

  it('puts a driven gap on the centre line whenever a driver tooth is on it', () => {
    const phi = 0.8;
    for (const k of [0, 1, 3]) {
      const driven = mesh(phi + (k * 2 * Math.PI) / 7, 7, phi, 40);
      // Driven teeth sit at driven + j * pitch, so its gaps sit half a pitch later.
      const gaps = (phi + Math.PI - (driven + Math.PI / 40)) / ((2 * Math.PI) / 40);
      expect(gaps - Math.round(gaps)).toBeCloseTo(0, 9);
    }
  });
});
