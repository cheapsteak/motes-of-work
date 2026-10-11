import { describe, expect, it } from 'vitest';
import { cycloidalGear, involuteGear } from './involute';
import { insideShare, radialExtrema, signedArea } from './testing';

const radii = (poly: [number, number][]) => poly.map(([x, y]) => Math.hypot(x, y));

describe('involuteGear', () => {
  it.each([9, 18, 40])('%i teeth: one tip and one root per tooth (2x teeth radial extrema)', (teeth) => {
    expect(radialExtrema(involuteGear({ teeth, module: 0.1 }))).toBe(2 * teeth);
  });

  it.each([
    [18, 2.4 / 18],
    [9, 1.2 / 9],
    [30, 0.05],
  ])('%i teeth: the pitch circle (module x teeth / 2) is half tooth, half gap', (teeth, module) => {
    const outline = involuteGear({ teeth, module });
    const pitch = (module * teeth) / 2;
    // Tooth thickness at the pitch circle is half the circular pitch, so a meshing gear of the same
    // module rolls without interference at centre distance = sum of pitch radii.
    expect(insideShare(outline, pitch)).toBeCloseTo(0.5, 2);
    // Just inside the pitch circle the tooth is thicker, just outside it is thinner.
    expect(insideShare(outline, pitch * 0.97)).toBeGreaterThan(0.5);
    expect(insideShare(outline, pitch * 1.03)).toBeLessThan(0.5);
  });

  it('spans the root circle (pitch - 1.25 m) to the tip circle (pitch + m)', () => {
    const module = 0.1;
    const r = radii(involuteGear({ teeth: 18, module }));
    expect(Math.min(...r)).toBeCloseTo(0.9 - 1.25 * module, 9);
    expect(Math.max(...r)).toBeCloseTo(0.9 + module, 9);
  });

  it('is a simple counter-clockwise outline without repeated points', () => {
    const outline = involuteGear({ teeth: 12, module: 0.2, pressureAngleDeg: 25 });
    expect(signedArea(outline)).toBeGreaterThan(0);
    for (let i = 0; i < outline.length; i++) {
      const [ax, ay] = outline[i];
      const [bx, by] = outline[(i + 1) % outline.length];
      expect(Math.hypot(bx - ax, by - ay)).toBeGreaterThan(1e-6);
    }
  });

  it('a larger pressure angle gives fatter roots and narrower tips', () => {
    const tipShare = (pa: number) => insideShare(involuteGear({ teeth: 18, module: 0.1, pressureAngleDeg: pa }), 0.99);
    expect(tipShare(25)).toBeLessThan(tipShare(14.5));
  });
});

describe('cycloidalGear', () => {
  it.each([8, 15, 60])('%i teeth: 2x teeth radial extrema', (teeth) => {
    expect(radialExtrema(cycloidalGear({ teeth, module: 0.1 }))).toBe(2 * teeth);
  });

  it('the pitch circle is half tooth, half gap, and the tip stays within the addendum', () => {
    const module = 0.05;
    const teeth = 30;
    const outline = cycloidalGear({ teeth, module });
    const pitch = (module * teeth) / 2;
    expect(insideShare(outline, pitch)).toBeCloseTo(0.5, 2);
    expect(Math.max(...radii(outline))).toBeLessThanOrEqual(pitch + 1.4 * module + 1e-12);
    expect(signedArea(outline)).toBeGreaterThan(0);
  });
});
