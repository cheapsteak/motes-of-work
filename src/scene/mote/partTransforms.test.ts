import { describe, expect, it } from 'vitest';
import { transformDistance } from '../../math/transform';
import { mechanisms } from '../../mechanisms';
import { defaultSceneState, mergeState, ZERO_FAULTS } from '../../timeline/sceneState';
import { settleWindow } from './attributes';
import { partAssembly, partTransforms } from './partTransforms';
import { SETTLE_WINDOW } from './settle';

// Each part comes together with its own motes: its exploded offset closes over its own settle
// window (from the first of its motes starting out to the last landing), not over the whole of
// assembly, so a part whose window has ended sits exactly in its pose.

const state = (assembly: number) =>
  mergeState(defaultSceneState(), { mech: { assembly, drive: 0.37, variant: 0, faults: ZERO_FAULTS } });

describe.each(Object.entries(mechanisms))('per-part assembly: %s', (_id, mech) => {
  const pose = mech.pose(0.37, ZERO_FAULTS, 0);

  it('holds each part fully exploded until its first mote sets out, and exactly in place once its last has landed', () => {
    mech.parts.forEach((part, i) => {
      const [from, to] = settleWindow(part);
      expect(partAssembly(part, from - SETTLE_WINDOW), part.id).toBe(0);
      expect(partAssembly(part, to), part.id).toBe(1);
      expect(transformDistance(partTransforms(mech, state(to))[i], pose[i]), part.id).toBeLessThan(1e-9);
      const exploded = partTransforms(mech, state(Math.max(0, from - SETTLE_WINDOW)))[i];
      const offset = mech.parts[i].explodedOffset;
      const moves = Math.hypot(...offset.position) > 1e-9 || Math.abs(offset.quaternion[3]) < 1 - 1e-9;
      if (moves) expect(transformDistance(exploded, pose[i]), part.id).toBeGreaterThan(1e-3);
    });
  });

  it('closes each part on the default curve monotonically over its window', () => {
    for (const part of mech.parts) {
      if (part.arrival) continue; // its own curve may hold and rebound: the contract test bounds it
      let prev = 0;
      for (let k = 0; k <= 100; k++) {
        const a = partAssembly(part, k / 100);
        expect(a, part.id).toBeGreaterThanOrEqual(prev);
        prev = a;
      }
    }
  });
});

describe('a part with its own arrival curve', () => {
  const base = mechanisms.gears.parts[0];
  const hop = (x: number) => (x < 0.5 ? 0 : 1 - 0.2 * Math.sin(Math.PI * (2 * x - 1)));
  const part = { ...base, settle: [0.5, 0.6] as const, arrival: hop };

  it('follows the curve through its window, and is exploded before it and posed after it, whatever the curve says at its ends', () => {
    const lo = 0.5 - SETTLE_WINDOW;
    const x = (a: number) => (a - lo) / (0.6 - lo);
    for (const a of [0.45, 0.5, 0.55, 0.58]) expect(partAssembly(part, a), `assembly ${a}`).toBeCloseTo(hop(x(a)), 12);
    expect(partAssembly({ ...part, arrival: () => 0.5 }, lo)).toBe(0);
    expect(partAssembly({ ...part, arrival: () => 0.5 }, 0.6)).toBe(1);
    expect(partAssembly(part, 0.3)).toBe(0);
    expect(partAssembly(part, 0.9)).toBe(1);
  });
});

describe('the scene steer', () => {
  it('reaches the pose: partTransforms of an assembled machine is pose(drive, faults, variant, steer)', () => {
    for (const [id, mech] of Object.entries(mechanisms)) {
      const s = mergeState(defaultSceneState(), { mech: { assembly: 1, drive: 0.37, variant: 1, steer: -0.7 } });
      const want = mech.pose(0.37, ZERO_FAULTS, 1, -0.7);
      partTransforms(mech, s).forEach((t, i) => expect(transformDistance(t, want[i]), `${id} part ${i}`).toBeLessThan(1e-9));
    }
    const bike = mechanisms.bike;
    const steered = partTransforms(bike, mergeState(defaultSceneState(), { mech: { steer: 1 } }));
    const plain = partTransforms(bike, defaultSceneState());
    expect(steered).not.toEqual(plain);
  });
});
