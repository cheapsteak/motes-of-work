import { describe, expect, it } from 'vitest';
import { STREAM_SALT, streamFor } from './seeds';

describe('the galaxy streams', () => {
  it('gives every concern its own salt', () => {
    const salts = Object.values(STREAM_SALT);
    expect(new Set(salts).size).toBe(salts.length);
    expect(streamFor(1, 'births', 0)()).not.toBe(streamFor(1, 'bgStars', 0)());
  });

  it('keeps every salt frozen, each by its key', () => {
    // The values are the galaxy: a changed salt moves every point drawn from it. Each key is held on
    // its own, so a task that appends a salt adds a line and edits none. bgRingTurn and bgRingSlots
    // stay registered and unused (the background draws no rings any more).
    const frozen = {
      births: 1,
      parents: 2,
      spots: 3,
      slots: 4,
      planets: 5,
      bows: 6,
      derps: 7,
      bgStars: 8,
      bgDust: 9,
      bgRingTurn: 10,
      bgRingSlots: 11,
      bgKnots: 12,
      bgPop: 13,
      starLook: 14,
    } as const;
    for (const [key, salt] of Object.entries(frozen)) expect(STREAM_SALT[key as keyof typeof STREAM_SALT], key).toBe(salt);
  });

  it("draws the wisps from the tuner's own salts, and the along-arm modulation from 22", () => {
    // bgWisps, bgWispGrad and bgBeads keep the galaxy tuner's numbers. Its bgArmMod (14 there) is the
    // essay's starLook, so it moved past it to 22, in the tuner's gen.js as here (re-skin §4.1).
    expect([STREAM_SALT.bgWisps, STREAM_SALT.bgWispGrad, STREAM_SALT.bgBeads, STREAM_SALT.bgArmMod]).toEqual([17, 18, 19, 22]);
  });

  it('draws the binaries from 30, past planetHue 29 (re-skin Task 1e)', () => {
    // Appended: 23-29 are the black hole's and planetHue's, which their own tasks append; every earlier
    // salt is held above by its key.
    expect(STREAM_SALT.binaries).toBe(30);
    const salts: number[] = Object.values(STREAM_SALT);
    expect(Math.max(...salts)).toBe(30);
    expect(streamFor(1, 'binaries', 4096 * 1003 + 1007)()).not.toBe(streamFor(1, 'spots', 4096 * 1003 + 1007)());
  });

  it('draws each planet’s hue from planetHue 29 (re-skin Task 7)', () => {
    expect(STREAM_SALT.planetHue).toBe(29);
    expect(streamFor(1, 'planetHue', 17)()).not.toBe(streamFor(1, 'planets', 17)());
  });

  it("draws the black hole's parts from 23-28 (re-skin Task 4), below planetHue 29 and binaries 30", () => {
    expect([
      STREAM_SALT.holeDisk,
      STREAM_SALT.holeJet,
      STREAM_SALT.holeKnot,
      STREAM_SALT.holeRing,
      STREAM_SALT.holeInfall,
      STREAM_SALT.holeStrand,
    ]).toEqual([23, 24, 25, 26, 27, 28]);
  });

  it("leaves 15, 16, 20 and 21 unused: the tuner's bgSpurs, bgTemp, bgHoodLook and bgHoodJitter", () => {
    const salts: number[] = Object.values(STREAM_SALT);
    for (const reserved of [15, 16, 20, 21]) expect(salts, String(reserved)).not.toContain(reserved);
  });
});
