import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';

describe('toolchain smoke', () => {
  it('adds', () => {
    expect(1 + 1).toBe(2);
  });

  it('resolves three', () => {
    expect(new Vector3(1, 2, 3).length()).toBeCloseTo(Math.sqrt(14));
  });
});
