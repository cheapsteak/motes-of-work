import { describe, expect, it } from 'vitest';
import { fillParams, vertexParams } from './params';

describe('fillParams', () => {
  it('defaults to n=30000 and dpr=1.5', () => {
    expect(fillParams('')).toEqual({ n: 30_000, dpr: 1.5 });
  });

  it('takes n and dpr as given, allowing dpr above 2', () => {
    expect(fillParams('?n=2000&dpr=3')).toEqual({ n: 2000, dpr: 3 });
  });

  it('ignores junk, zero and negative values', () => {
    expect(fillParams('?n=abc&dpr=0')).toEqual({ n: 30_000, dpr: 1.5 });
    expect(fillParams('?n=-5&dpr=NaN')).toEqual({ n: 30_000, dpr: 1.5 });
  });

  it('floors a fractional n', () => {
    expect(fillParams('?n=10.9').n).toBe(10);
  });
});

describe('vertexParams', () => {
  it('defaults to n=100000 and the device DPR capped at 2', () => {
    expect(vertexParams('', 3)).toEqual({ n: 100_000, dpr: 2, isolate: false });
    expect(vertexParams('', 1.25)).toEqual({ n: 100_000, dpr: 1.25, isolate: false });
  });

  it('an explicit dpr overrides the cap', () => {
    expect(vertexParams('?dpr=3&n=500&isolate=1', 1)).toEqual({ n: 500, dpr: 3, isolate: true });
  });
});
