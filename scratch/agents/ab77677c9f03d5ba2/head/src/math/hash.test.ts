import { describe, expect, it } from 'vitest';
import { hash01, mulberry32, pcg } from './hash';

describe('pcg', () => {
  it('is deterministic and returns a uint32 integer', () => {
    for (const v of [0, 1, 2, 12345, 0xffffffff, 0x80000000]) {
      const a = pcg(v);
      expect(pcg(v)).toBe(a);
      expect(Number.isInteger(a)).toBe(true);
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThan(2 ** 32);
    }
  });

  it('matches frozen golden values (GLSL must reproduce these bit-for-bit)', () => {
    expect(pcg(0)).toBe(GOLDEN.pcg0);
    expect(pcg(1)).toBe(GOLDEN.pcg1);
    expect(pcg(12345)).toBe(GOLDEN.pcg12345);
  });
});

describe('hash01', () => {
  it('stays in [0,1) and has a mean near 0.5 over 10k seeds', () => {
    let sum = 0;
    for (let seed = 0; seed < 10000; seed++) {
      const h = hash01(seed, 3);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThan(1);
      sum += h;
    }
    const mean = sum / 10000;
    expect(mean).toBeGreaterThanOrEqual(0.48);
    expect(mean).toBeLessThanOrEqual(0.52);
  });

  it('is exactly representable in float32 (a multiple of 2^-24), so the GLSL mirror cannot round up to 1', () => {
    for (let seed = 0; seed < 5000; seed++) {
      const h = hash01(seed, 7);
      expect(Math.fround(h)).toBe(h);
      expect(Number.isInteger(h * 16777216)).toBe(true);
    }
    // The top of the range: the largest pcg output still maps below 1.
    expect((0xffffffff >>> 8) / 16777216).toBeLessThan(1);
  });

  it('differs across salts for the same seed', () => {
    expect(hash01(42, 1)).not.toBe(hash01(42, 2));
  });
});

describe('mulberry32', () => {
  it('repeats the same sequence for the same seed', () => {
    const a = mulberry32(7);
    const b = mulberry32(7);
    for (let i = 0; i < 20; i++) expect(a()).toBe(b());
  });

  it('differs between seeds and stays in [0,1)', () => {
    const a = mulberry32(7);
    const b = mulberry32(8);
    expect(a()).not.toBe(b());
    const c = mulberry32(1);
    for (let i = 0; i < 1000; i++) {
      const x = c();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
});

// Golden values: computed once (independently, with BigInt arithmetic), then frozen.
const GOLDEN = { pcg0: 129708002, pcg1: 2831084092, pcg12345: 4099845390 };
