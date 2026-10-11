import { describe, expect, it } from 'vitest';
import { RollingStats } from './stats';

describe('RollingStats', () => {
  it('is empty until a sample arrives', () => {
    const s = new RollingStats(60);
    expect(s.count).toBe(0);
    expect(s.average()).toBeNull();
    expect(s.p95()).toBeNull();
  });

  it('averages and takes the nearest-rank p95', () => {
    const s = new RollingStats(100);
    for (let i = 1; i <= 100; i++) s.push(i);
    expect(s.average()).toBe(50.5);
    expect(s.p95()).toBe(95);
  });

  it('keeps only the last `capacity` samples', () => {
    const s = new RollingStats(60);
    for (let i = 0; i < 200; i++) s.push(1000); // old, slow frames
    for (let i = 0; i < 60; i++) s.push(2);
    expect(s.count).toBe(60);
    expect(s.average()).toBe(2);
    expect(s.p95()).toBe(2);
  });

  it('p95 of a single sample is that sample', () => {
    const s = new RollingStats(60);
    s.push(7);
    expect(s.p95()).toBe(7);
  });

  it('ignores non-finite samples', () => {
    const s = new RollingStats(60);
    s.push(NaN);
    s.push(Infinity);
    s.push(4);
    expect(s.count).toBe(1);
    expect(s.average()).toBe(4);
  });
});
