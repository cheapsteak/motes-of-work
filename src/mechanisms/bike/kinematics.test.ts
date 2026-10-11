import { describe, expect, it } from 'vitest';
import type { Vec3 } from '../../math/vec';
import { ZERO_FAULTS } from '../../timeline/sceneState';
import {
  aboutHead,
  BB,
  CHAIN_SEGMENTS,
  chainAdvance,
  chainLength,
  chainPoint,
  CHAIN_Z,
  CHAINRING_RADIUS,
  CRANK,
  crankAngle,
  GEARING,
  HEAD_TOP,
  pedalCentre,
  PEDAL_Z,
  REAR_AXLE,
  SEGMENT_PITCH,
  SLIP_JERK,
  SPROCKET_RADIUS,
  steer,
  STEER,
  STEER_AXIS,
  STEER_TWIN,
  wheelAngle,
} from './kinematics';

const TAU = Math.PI * 2;
/** The unstalled wheel turns this far per sweep step (drive 1/200). */
const GEAR_STEP = (2.75 * TAU) / 200;
const DRIVES = Array.from({ length: 41 }, (_, i) => i / 20 - 0.5 + 0.0137);
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dist = (a: Vec3, b: Vec3) => Math.hypot(...sub(a, b));
/** Distance in the side view (the xy plane). */
const flat = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1]);
/** Angle of p about centre c in the xy plane. */
const angleAbout = (p: Vec3, c: Vec3) => Math.atan2(p[1] - c[1], p[0] - c[0]);
const wrap = (a: number) => a - TAU * Math.round(a / TAU);

describe('gearing', () => {
  it('is 44 by 16, a ratio of 2.75, on gears sized for a half-inch chain', () => {
    expect(GEARING).toEqual({ chainring: 44, sprocket: 16 });
    expect(CHAINRING_RADIUS / SPROCKET_RADIUS).toBeCloseTo(2.75, 12);
    // A chain wrapped on a pitch circle of N teeth closes in N links.
    expect((TAU * CHAINRING_RADIUS) / 44).toBeCloseTo(0.0127, 12);
  });

  it('turns the wheels 2.75 times the crank angle when nothing is wrong', () => {
    for (const d of DRIVES) {
      expect(crankAngle(d, ZERO_FAULTS)).toBeCloseTo(TAU * d, 12);
      expect(wheelAngle(d, ZERO_FAULTS)).toBeCloseTo(2.75 * crankAngle(d, ZERO_FAULTS), 12);
    }
  });
});

describe('chain path', () => {
  const L = chainLength();

  it('closes on itself, in CHAIN_SEGMENTS segments of one pitch', () => {
    expect(SEGMENT_PITCH * CHAIN_SEGMENTS).toBeCloseTo(L, 12);
    expect(CHAIN_SEGMENTS).toBe(24);
    const a = chainPoint(0);
    const b = chainPoint(L);
    expect(dist(a, b)).toBeLessThan(1e-12);
  });

  it('is as long as it measures: the walked length matches, with no jumps', () => {
    const n = 100_000;
    let walked = 0;
    let worst = 0;
    let prev = chainPoint(0);
    for (let i = 1; i <= n; i++) {
      const p = chainPoint((L * i) / n);
      const step = dist(p, prev);
      walked += step;
      worst = Math.max(worst, step);
      prev = p;
    }
    expect(walked).toBeCloseTo(L, 6);
    expect(worst).toBeLessThan(1.0001 * (L / n));
  });

  it('wraps the chainring and the sprocket on their pitch circles, in the chain plane', () => {
    let onRing = 0;
    let onSprocket = 0;
    for (let i = 0; i < 1000; i++) {
      const p = chainPoint((L * i) / 1000);
      expect(p[2]).toBe(CHAIN_Z);
      if (Math.abs(flat(p, BB) - CHAINRING_RADIUS) < 1e-12) onRing++;
      if (Math.abs(flat(p, REAR_AXLE) - SPROCKET_RADIUS) < 1e-12) onSprocket++;
    }
    // Wrap angles: a little over half the chainring, a little under half the sprocket.
    expect(onRing / 1000).toBeGreaterThan((0.5 * TAU * CHAINRING_RADIUS) / L);
    expect(onSprocket / 1000).toBeLessThan((0.5 * TAU * SPROCKET_RADIUS) / L);
    expect(onSprocket).toBeGreaterThan(0);
  });

  it('moves with the chainring at the chainring and with the sprocket at the sprocket', () => {
    // Find a pin mid-wrap on each and nudge the drive: it must turn with that gear, to 1e-6.
    const pinOn = (centre: Vec3, r: number) => {
      for (let i = 0; i < 1000; i++) {
        const s = (L * i) / 1000;
        const before = chainPoint(s - 0.01);
        const after = chainPoint(s + 0.01);
        if ([before, after].every((p) => Math.abs(flat(p, centre) - r) < 1e-12)) return s;
      }
      throw new Error('no pin found on the wrap');
    };
    const ring = pinOn(BB, CHAINRING_RADIUS);
    const sprocket = pinOn(REAR_AXLE, SPROCKET_RADIUS);
    for (const d of [0.1, 0.37, 1.6]) {
      const h = 1e-4;
      const ds = chainAdvance(d + h, ZERO_FAULTS) - chainAdvance(d, ZERO_FAULTS);
      // The chainring turns by -(crank angle) (clockwise seen from the drive side), the sprocket by -(wheel angle).
      const dCrank = crankAngle(d + h, ZERO_FAULTS) - crankAngle(d, ZERO_FAULTS);
      const dWheel = wheelAngle(d + h, ZERO_FAULTS) - wheelAngle(d, ZERO_FAULTS);
      const turnRing = wrap(angleAbout(chainPoint(ring + ds), BB) - angleAbout(chainPoint(ring), BB));
      const turnSprocket = wrap(
        angleAbout(chainPoint(sprocket + ds), REAR_AXLE) - angleAbout(chainPoint(sprocket), REAR_AXLE),
      );
      expect(Math.abs(turnRing + dCrank)).toBeLessThan(1e-6);
      expect(Math.abs(turnSprocket + dWheel)).toBeLessThan(1e-6);
    }
  });
});

describe('pedals', () => {
  it('ride the crank ends, opposite each other, out on their own sides', () => {
    for (const d of DRIVES) {
      const theta = crankAngle(d, ZERO_FAULTS);
      const right = pedalCentre(theta, 1);
      const left = pedalCentre(theta, -1);
      expect(Math.hypot(right[0] - BB[0], right[1] - BB[1])).toBeCloseTo(CRANK, 12);
      expect(right[0] - BB[0] + (left[0] - BB[0])).toBeCloseTo(0, 12);
      expect(right[1] - BB[1] + (left[1] - BB[1])).toBeCloseTo(0, 12);
      expect(right[2]).toBe(PEDAL_Z);
      expect(left[2]).toBe(-PEDAL_Z);
      // The right crank turns clockwise seen from the drive side: at angle -theta from forward.
      expect(wrap(angleAbout(right, BB) + theta)).toBeCloseTo(0, 9);
    }
  });
});

describe('steering', () => {
  it('swings gently either side: 0.14 sin(pi drive / 2) radians', () => {
    for (const d of DRIVES) expect(steer(d)).toBeCloseTo(0.14 * Math.sin((Math.PI * d) / 2), 12);
    expect(steer(1)).toBeCloseTo(0.14, 12);
    expect(steer(3)).toBeCloseTo(-0.14, 12);
  });

  it('swings the wrong twin to about 26 degrees, blending the amplitude by variant', () => {
    expect(STEER).toBe(0.14);
    expect(STEER_TWIN).toBe(0.45);
    for (const d of DRIVES) {
      expect(steer(d, 0)).toBe(steer(d));
      expect(steer(d, 1)).toBeCloseTo(0.45 * Math.sin((Math.PI * d) / 2), 12);
      expect(steer(d, 0.5)).toBeCloseTo(((0.14 + 0.45) / 2) * Math.sin((Math.PI * d) / 2), 12);
    }
    expect((steer(3, 1) * 180) / Math.PI).toBeCloseTo(-25.8, 1);
  });

  // Storyboard §2.6: an authored swing adds to the drive's own, and the sum clamps at full lock.
  it('adds an authored steer to the drive-coupled one, clamped at full lock either way', () => {
    for (const d of [...DRIVES, 2.9, 3]) {
      for (const v of [0, 0.5, 1]) {
        expect(steer(d, v, 0), `drive ${d} variant ${v}`).toBe(steer(d, v));
        const amp = STEER * (1 + (STEER_TWIN / STEER - 1) * v);
        const natural = Math.sin((Math.PI * d) / 2);
        for (const extra of [-2, -1, -0.4, 0.3, 1, 2]) {
          const want = amp * Math.min(1, Math.max(-1, natural + extra));
          expect(steer(d, v, extra), `drive ${d} variant ${v} steer ${extra}`).toBeCloseTo(want, 12);
        }
      }
    }
    // At drive 0 a steer of ±1 is full lock; past it the sum clamps.
    expect(steer(0, 1, 1)).toBeCloseTo(STEER_TWIN, 12);
    expect(steer(0, 1, -1)).toBeCloseTo(-STEER_TWIN, 12);
    expect(steer(0.5, 1, 2)).toBeCloseTo(STEER_TWIN, 12);
    expect(steer(2.9, 1, 2)).toBeCloseTo(STEER_TWIN, 12);
  });

  it('turns about the head-tube axis: the axis stays put, everything else turns by the angle', () => {
    const onAxis: Vec3 = [HEAD_TOP[0] - 0.4 * STEER_AXIS[0], HEAD_TOP[1] - 0.4 * STEER_AXIS[1], 0];
    const crown: Vec3 = [HEAD_TOP[0] + 0.2, HEAD_TOP[1] - 0.5, 0.05];
    for (const d of [0.3, 1, 2.6]) {
      const a = steer(d);
      expect(dist(aboutHead(HEAD_TOP, a), HEAD_TOP)).toBeLessThan(1e-12);
      expect(dist(aboutHead(onAxis, a), onAxis)).toBeLessThan(1e-12);
      // Square to the axis, the crown's offset turns by a about the axis (right-handed).
      const perp = (p: Vec3): Vec3 => {
        const v = sub(p, HEAD_TOP);
        const k = dot(v, STEER_AXIS);
        return [v[0] - k * STEER_AXIS[0], v[1] - k * STEER_AXIS[1], v[2] - k * STEER_AXIS[2]];
      };
      const u = perp(crown);
      const v = perp(aboutHead(crown, a));
      const turned = Math.atan2(dot(cross(u, v), STEER_AXIS), dot(u, v));
      expect(turned).toBeCloseTo(a, 9);
    }
  });
});

describe('faults on the drive', () => {
  const sweep = (f: Partial<typeof ZERO_FAULTS>, fn: (d: number, faults: typeof ZERO_FAULTS) => number) =>
    Array.from({ length: 801 }, (_, i) => fn(i / 200, { ...ZERO_FAULTS, ...f }));

  it('bind slows the drive unevenly each turn but never runs it backwards', () => {
    const a = sweep({ bind: 1 }, crankAngle);
    const steps = a.slice(1).map((v, i) => v - a[i]);
    expect(Math.min(...steps)).toBeGreaterThan(0);
    expect(Math.max(...steps) / Math.min(...steps)).toBeGreaterThan(2);
    // Over a whole turn it keeps up.
    expect(crankAngle(1, { ...ZERO_FAULTS, bind: 1 })).toBeCloseTo(TAU, 12);
  });

  it('ratio runs the wheels at another speed from the cranks', () => {
    const w = wheelAngle(1, { ...ZERO_FAULTS, ratio: 1 }) / crankAngle(1, ZERO_FAULTS);
    expect(Math.abs(w - 2.75)).toBeGreaterThan(1);
  });

  it('slip lets the wheel fall behind the cranks in jerks, never by more than one jerk, at any drive', () => {
    const slipped = { ...ZERO_FAULTS, slip: 1 };
    for (const d of [0.3, 0.9, 1.6]) expect(wheelAngle(d, slipped)).toBeLessThan(wheelAngle(d, ZERO_FAULTS) - 0.2);
    let snaps = 0;
    let prevLag = 0;
    for (let i = 0; i <= 4020; i++) {
      const d = i / 400; // drive 0..10.05
      const lag = wheelAngle(d, ZERO_FAULTS) - wheelAngle(d, slipped);
      expect(lag, `drive ${d}`).toBeGreaterThanOrEqual(-1e-9);
      expect(lag, `drive ${d}`).toBeLessThanOrEqual(SLIP_JERK + 1e-9);
      if (lag < prevLag - 0.5 * SLIP_JERK) snaps++; // the chain catches: the wheel lurches forward
      prevLag = lag;
    }
    expect(snaps).toBe(30); // three a turn, for ten turns
  });

  it('stall drops the chain: the cranks spin on, the wheels coast to a stop and catch up, every turn', () => {
    const stalled = { ...ZERO_FAULTS, stall: 1 };
    expect(crankAngle(3.4, stalled)).toBeCloseTo(TAU * 3.4, 12);
    // Over each crank turn: never backwards, still for part of it, and level with the cranks at its end.
    const w = sweep({ stall: 1 }, wheelAngle); // drive 0..4 in steps of 1/200
    const steps = w.slice(1).map((v, i) => v - w[i]);
    expect(Math.min(...steps)).toBeGreaterThanOrEqual(0);
    for (let turn = 0; turn < 4; turn++) {
      const inTurn = steps.slice(turn * 200, (turn + 1) * 200);
      expect(inTurn.filter((d) => d === 0).length, `turn ${turn}`).toBeGreaterThan(40);
      expect(Math.max(...inTurn), `turn ${turn}`).toBeGreaterThan(2 * GEAR_STEP);
      expect(wheelAngle(turn + 1, stalled)).toBeCloseTo(2.75 * TAU * (turn + 1), 9);
    }
    // Periodic, so it never drifts from the cranks: the same lead at the same point of every turn.
    for (const d of [0.3, 0.7]) {
      const lead = (k: number) => wheelAngle(d + k, stalled) - 2.75 * TAU * (d + k);
      expect(lead(5)).toBeCloseTo(lead(0), 9);
    }
    // The chain stays on the sprocket, so it moves with the wheel.
    expect(chainAdvance(2.3, stalled)).toBeCloseTo(SPROCKET_RADIUS * wheelAngle(2.3, stalled), 12);
  });

  it('raising stall at any drive never runs the wheels back behind their unstalled angle', () => {
    for (const d of [0.3, 1.7, 7.3, 12.05]) {
      const free = wheelAngle(d, ZERO_FAULTS);
      for (let i = 0; i <= 100; i++) {
        expect(wheelAngle(d, { ...ZERO_FAULTS, stall: i / 100 })).toBeGreaterThanOrEqual(free - 1e-9);
      }
    }
  });
});
