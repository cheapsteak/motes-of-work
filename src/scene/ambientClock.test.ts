import { describe, expect, it } from 'vitest';
import { AMBIENT_POSE, FREEZE_PINS } from '../galaxy/ambient';
import { AMBIENT_WRAP, createAmbientClock, shown } from './ambientClock';

const START = 12_345.678;
const clock = (o: Partial<Parameters<typeof createAmbientClock>[0]> = {}) =>
  createAmbientClock({ override: null, test: false, reduced: () => false, startMs: START, ...o });

describe('the ambient clock', () => {
  it('?ambient=101 is 101 whatever the time, in test mode and under reduced motion too', () => {
    for (const o of [{}, { test: true }, { reduced: () => true }]) {
      const c = clock({ override: 101, ...o });
      for (const now of [0, START, START + 5_000, START + 9e7]) expect(c.at(now)).toBe(101);
      expect(c.live()).toBe(false);
    }
  });

  it('stands at AMBIENT_POSE in test mode and under reduced motion', () => {
    for (const c of [clock({ test: true }), clock({ reduced: () => true })]) {
      for (const now of [START, START + 1_000, START + 7.3e6]) expect(c.at(now)).toBe(AMBIENT_POSE);
      expect(c.live()).toBe(false);
    }
  });

  it('runs live on the wall clock: (now − start) / 1000', () => {
    const c = clock();
    expect(c.live()).toBe(true);
    expect(c.at(START)).toBe(0);
    expect(c.at(START + 1_000)).toBeCloseTo(1, 12);
    expect(c.at(START + 101_500)).toBeCloseTo(101.5, 9);
  });

  it('reads reduced motion on every call: it stops at the pose and runs again when it is turned off', () => {
    let reduced = false;
    const c = clock({ reduced: () => reduced });
    expect(c.at(START + 2_000)).toBeCloseTo(2, 12);
    reduced = true;
    expect(c.live()).toBe(false);
    expect(c.at(START + 3_000)).toBe(AMBIENT_POSE);
    reduced = false;
    expect(c.live()).toBe(true);
    expect(c.at(START + 4_000)).toBeCloseTo(4, 12);
  });

  it('ambient wraps before float32 precision runs out', () => {
    // A page left open a day: at start + 86,399.9 s the shown ambient is under AMBIENT_WRAP, so its
    // float32 (what the shaders read) steps by a frame's 1/60 s to within 1e-3 s at every frame, the
    // wrap itself taken modulo AMBIENT_WRAP. Unwrapped, float32's ulp at 86,400 s is 0.0078 s.
    const c = clock();
    const t0 = START + 86_399.9 * 1000;
    let wrapped = 0;
    let prev = Math.fround(c.at(t0));
    for (let i = 1; i <= 120; i++) {
      const t = Math.fround(c.at(t0 + (i * 1000) / 60));
      expect(t).toBeGreaterThanOrEqual(0);
      expect(t).toBeLessThan(AMBIENT_WRAP);
      let step = t - prev;
      if (step < 0) {
        wrapped++;
        step += AMBIENT_WRAP;
      }
      expect(Math.abs(step - 1 / 60), `frame ${i}: step ${step}`).toBeLessThanOrEqual(1e-3);
      prev = t;
    }
    // 86,400 s is 24 wraps: the window crosses one.
    expect(wrapped).toBe(1);
    // The control: the unwrapped seconds in float32 fail the same bound.
    const raw = (i: number) => Math.fround((t0 + (i * 1000) / 60 - START) / 1000);
    const worst = Math.max(...Array.from({ length: 120 }, (_, i) => Math.abs(raw(i + 1) - raw(i) - 1 / 60)));
    expect(worst).toBeGreaterThan(1e-3);
  });
});

describe('the ambient shown (the freeze frame’s two clocks, freeze-frame §1.2)', () => {
  it('is the freeze pin while the hold is up, read as a step at 0.5, and the clock’s own otherwise', () => {
    for (const live of [0, 101, 3599.9, FREEZE_PINS.C1.t + 3]) {
      for (const hold of [0.5, 0.75, 1]) expect(shown(live, hold), `hold ${hold}`).toBe(FREEZE_PINS.C1.t);
      for (const hold of [0, 0.25, 0.4999, Number.NaN]) expect(shown(live, hold), `hold ${hold}`).toBe(live);
    }
    // The pin is the pose tests and reduced motion stop at: a held frame is the same in either.
    expect(FREEZE_PINS.C1.t).toBe(AMBIENT_POSE);
  });
});
