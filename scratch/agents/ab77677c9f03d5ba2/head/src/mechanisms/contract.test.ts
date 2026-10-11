import { describe, expect, it } from 'vitest';
import { mechanisms } from './index';
import { ACTIVE_MECHANISM } from '../config';
import { FAULT_KEYS, ZERO_FAULTS } from '../timeline/sceneState';
import { transformDistance } from '../math/transform';

describe('config', () => {
  it('selects a registered mechanism', () => {
    expect(mechanisms[ACTIVE_MECHANISM]).toBeDefined();
  });
});

describe.each(Object.entries(mechanisms))('mechanism contract: %s', (_name, m) => {
  it('has at least one core and one body part', () => {
    expect(m.parts.some((p) => p.role === 'core')).toBe(true);
    expect(m.parts.some((p) => p.role === 'body')).toBe(true);
  });

  it('pose returns one transform per part, deterministically and independent of call order', () => {
    const a = m.pose(0.37, ZERO_FAULTS, 0);
    expect(a).toHaveLength(m.parts.length);
    m.pose(0.9, { ...ZERO_FAULTS, jitter: 1, stall: 1 }, 1); // interleave an unrelated call
    const b = m.pose(0.37, ZERO_FAULTS, 0);
    expect(b).toEqual(a);
    for (const t of a) {
      expect(t.position.every(Number.isFinite)).toBe(true);
      expect(t.quaternion.every(Number.isFinite)).toBe(true);
    }
  });

  it.each(FAULT_KEYS.filter((k) => k !== 'drift'))('fault "%s" moves at least one part', (k) => {
    const moved = [0.13, 0.37, 0.71].some((d) => {
      const base = m.pose(d, ZERO_FAULTS, 0);
      const faulted = m.pose(d, { ...ZERO_FAULTS, [k]: 1 }, 0);
      return Math.max(...base.map((t, i) => transformDistance(faulted[i], t))) > 1e-3;
    });
    expect(moved).toBe(true);
  });

  it('the wrong twin differs from the correct variant in pose or point shape', () => {
    const correct = m.pose(0.37, ZERO_FAULTS, 0);
    const twin = m.pose(0.37, ZERO_FAULTS, 1);
    const poseDiffers = correct.some((t, i) => transformDistance(t, twin[i]) > 1e-3);
    const shapeDiffers = m.samplePoints(500, 3).some((p) => p.local.some((v, i) => v !== p.localTwin[i]));
    expect(poseDiffers || shapeDiffers).toBe(true);
  });

  it('samplePoints is deterministic, seed-sensitive and well formed', () => {
    const a = m.samplePoints(1000, 7);
    expect(a).toHaveLength(1000);
    expect(m.samplePoints(1000, 7)).toEqual(a);
    expect(m.samplePoints(1000, 8)).not.toEqual(a);
    for (const p of a) {
      expect(Number.isInteger(p.part)).toBe(true);
      expect(p.part).toBeGreaterThanOrEqual(0);
      expect(p.part).toBeLessThan(m.parts.length);
      expect(p.local.every(Number.isFinite)).toBe(true);
      expect(p.localTwin.every(Number.isFinite)).toBe(true);
      expect(Number.isInteger(p.seed)).toBe(true);
      expect(p.seed).toBeGreaterThanOrEqual(0);
      expect(p.seed).toBeLessThan(2 ** 24);
    }
  });

  it('every point carries a unit surface normal for both variants', () => {
    for (const p of m.samplePoints(2000, 5)) {
      for (const n of [p.normal, p.normalTwin]) {
        expect(n).toHaveLength(3);
        expect(n.every(Number.isFinite)).toBe(true);
        expect(Math.abs(Math.hypot(n[0], n[1], n[2]) - 1)).toBeLessThan(1e-6);
      }
    }
  });

  it('samplePoints honours small and odd budgets exactly', () => {
    for (const budget of [0, 1, 7, 13, 101]) expect(m.samplePoints(budget, 1)).toHaveLength(budget);
  });
});
