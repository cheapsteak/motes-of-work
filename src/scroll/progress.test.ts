import { describe, expect, it } from 'vitest';
import { locate, progressFromScroll, scrollYForProgress, sectionSpans } from './progress';

const spans = sectionSpans([
  { id: 'a', length: 1 },
  { id: 'b', length: 3 },
]);

describe('sectionSpans', () => {
  it('lays sections out contiguously over [0,1] weighted by length', () => {
    expect(spans).toEqual([
      { id: 'a', start: 0, end: 0.25 },
      { id: 'b', start: 0.25, end: 1 },
    ]);
  });

  it('splits evenly (never NaN) when total length is 0', () => {
    expect(
      sectionSpans([
        { id: 'a', length: 0 },
        { id: 'b', length: 0 },
        { id: 'c', length: 0 },
        { id: 'd', length: 0 },
      ]),
    ).toEqual([
      { id: 'a', start: 0, end: 0.25 },
      { id: 'b', start: 0.25, end: 0.5 },
      { id: 'c', start: 0.5, end: 0.75 },
      { id: 'd', start: 0.75, end: 1 },
    ]);
    expect(sectionSpans([])).toEqual([]);
  });

  it('ends exactly at 1 despite float accumulation', () => {
    const many = sectionSpans(Array.from({ length: 7 }, (_, i) => ({ id: `s${i}`, length: 0.1 + i * 0.37 })));
    expect(many[0].start).toBe(0);
    expect(many[many.length - 1].end).toBe(1);
    for (let i = 1; i < many.length; i++) expect(many[i].start).toBe(many[i - 1].end);
  });
});

describe('progressFromScroll', () => {
  it('clamps and maps scroll to [0,1]', () => {
    expect(progressFromScroll(-40, 3000, 1000)).toBe(0);
    expect(progressFromScroll(2500, 3000, 1000)).toBe(1);
    expect(progressFromScroll(1000, 3000, 1000)).toBe(0.5);
  });

  it('maps NaN and degenerate geometry to 0', () => {
    expect(progressFromScroll(NaN, 3000, 1000)).toBe(0);
    expect(progressFromScroll(500, 1000, 1000)).toBe(0);
    expect(progressFromScroll(500, 800, 1000)).toBe(0);
    expect(progressFromScroll(500, NaN, 1000)).toBe(0);
    expect(progressFromScroll(500, 3000, NaN)).toBe(0);
  });
});

describe('scrollYForProgress', () => {
  it('maps progress to scroll position', () => {
    expect(scrollYForProgress(0.5, 3000, 1000)).toBe(1000);
    expect(scrollYForProgress(NaN, 3000, 1000)).toBe(0);
    expect(scrollYForProgress(2, 3000, 1000)).toBe(2000);
    expect(scrollYForProgress(-1, 3000, 1000)).toBe(0);
  });

  it('is always an integer and round-trips within one pixel of progress', () => {
    const h = 7321;
    const vh = 913;
    const tol = 1 / (h - vh);
    for (let i = 0; i <= 200; i++) {
      const p = i / 200;
      const y = scrollYForProgress(p, h, vh);
      expect(Number.isInteger(y)).toBe(true);
      expect(Math.abs(progressFromScroll(y, h, vh) - p)).toBeLessThanOrEqual(tol);
    }
  });
});

describe('locate', () => {
  it('finds the section and local progress', () => {
    expect(locate(0.25, spans)).toEqual({ index: 1, id: 'b', local: 0 });
    expect(locate(0.625, spans)).toEqual({ index: 1, id: 'b', local: 0.5 });
    expect(locate(0.125, spans)).toEqual({ index: 0, id: 'a', local: 0.5 });
  });

  it('puts p=1 at the end of the last section', () => {
    expect(locate(1, spans)).toEqual({ index: 1, id: 'b', local: 1 });
  });

  it('clamps out-of-range and NaN progress', () => {
    expect(locate(-1, spans)).toEqual({ index: 0, id: 'a', local: 0 });
    expect(locate(5, spans)).toEqual({ index: 1, id: 'b', local: 1 });
    expect(locate(NaN, spans)).toEqual({ index: 0, id: 'a', local: 0 });
  });
});
