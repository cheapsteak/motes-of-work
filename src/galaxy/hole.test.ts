import { describe, expect, it } from 'vitest';
import { HOLE_DOTS, holeInstances } from './hole';

describe('the hole’s budget (re-skin §7)', () => {
  it('the hole takes 27,610', () => expect(holeInstances()).toBe(18000 + 2400 + 320 + 4800 + 2 * 6 * 64 + 18 * 4 + 750 + 500));

  it('counts each part as the spec’s allocation has it', () => {
    expect(HOLE_DOTS).toEqual({
      disk: 18000,
      arch: 2400,
      ring: 320,
      jetsPerSide: 2400,
      knotSlots: 6,
      knotDots: 64,
      knotCore: 24,
      infallSlots: 18,
      infallTrail: 4,
      strand0: 750,
      strand1: 500,
    });
    // A knot is its core and its halo: 24 and 40.
    expect(HOLE_DOTS.knotDots - HOLE_DOTS.knotCore).toBe(40);
  });
});
