import { describe, expect, it } from 'vitest';
import { depthRange, glslLightingUniforms, LIGHTING, lightingUniforms, updateDepthUniforms } from './lighting';

describe('LIGHTING', () => {
  it('keys from the upper left, in front of the machine, as a unit world-space direction', () => {
    const [x, y, z] = LIGHTING.keyDir;
    expect(Math.hypot(x, y, z)).toBeCloseTo(1, 12);
    const k = Math.hypot(-0.4, 0.7, 0.6);
    expect([x, y, z]).toEqual([-0.4 / k, 0.7 / k, 0.6 / k]);
  });

  it('adds light with positive strengths and takes it away with fractional dims', () => {
    for (const key of ['keyStrength', 'fillStrength', 'rimStrength'] as const) {
      expect(LIGHTING[key], key).toBeGreaterThan(0);
    }
    for (const key of ['backfaceDim', 'backfaceSoftness', 'depthDim', 'depthShrink'] as const) {
      expect(LIGHTING[key], key).toBeGreaterThan(0);
      expect(LIGHTING[key], key).toBeLessThanOrEqual(1);
    }
  });
});

describe('depthRange', () => {
  it('spans the anchor sphere along the line of sight: distance -+ radius', () => {
    const { near, far } = depthRange([0, 0, 10], { center: [0, 0, 1], radius: 2 });
    expect(near).toBeCloseTo(7, 12);
    expect(far).toBeCloseTo(11, 12);
  });

  it('stays positive and non-empty with the camera inside the sphere', () => {
    const { near, far } = depthRange([0, 0, 0.5], { center: [0, 0, 0], radius: 2 });
    expect(near).toBeGreaterThan(0);
    expect(far).toBeGreaterThan(near);
  });
});

describe('uniforms', () => {
  it('declares in GLSL exactly the uniforms the materials are given', () => {
    const declared = [...glslLightingUniforms().matchAll(/^uniform (float|vec3) (\w+);/gm)].map((m) => m[2]);
    const given = Object.keys(lightingUniforms());
    expect(new Set(declared)).toEqual(new Set(given));
    expect(declared).toHaveLength(given.length);
    // Every LIGHTING constant reaches the shader, plus the per-frame depth range.
    expect(given).toHaveLength(Object.keys(LIGHTING).length + 2);
  });

  it('carries the LIGHTING values, and the depth range per frame', () => {
    const u = lightingUniforms();
    expect(u.uKeyDir.value).toEqual(LIGHTING.keyDir);
    expect(u.uBackfaceDim.value).toBe(LIGHTING.backfaceDim);
    updateDepthUniforms(u, [0, 0, 10], { center: [0, 0, 1], radius: 2 });
    expect(u.uDepthNear.value).toBeCloseTo(7, 12);
    expect(u.uDepthFar.value).toBeCloseTo(11, 12);
  });
});
