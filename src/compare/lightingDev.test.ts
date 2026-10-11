import { Group, Mesh, RawShaderMaterial, type IUniform } from 'three';
import { describe, expect, it } from 'vitest';
import { LIGHTING, lightingUniforms } from '../scene/lighting';
import { applyLighting, LIGHTING_SLIDERS, lightingJson } from './lightingDev';

describe('LIGHTING_SLIDERS', () => {
  it('cover every scalar lighting constant, each bound to a uniform the materials are given', () => {
    const scalars = Object.keys(LIGHTING).filter((k) => typeof LIGHTING[k as keyof typeof LIGHTING] === 'number');
    expect(LIGHTING_SLIDERS.map((s) => s.key)).toEqual(scalars);
    const given = Object.keys(lightingUniforms());
    for (const s of LIGHTING_SLIDERS) expect(given, s.key).toContain(s.uniform);
  });

  it('include the ghost alpha, so a tuning session covers the ghost too', () => {
    expect(LIGHTING_SLIDERS.find((s) => s.key === 'ghostAlpha')?.uniform).toBe('uGhostAlpha');
  });

  it('start at the module value, inside a range that holds it', () => {
    for (const s of LIGHTING_SLIDERS) {
      expect(s.value, s.key).toBe(LIGHTING[s.key]);
      expect(s.min, s.key).toBe(0);
      expect(s.max, s.key).toBeGreaterThan(s.value);
      expect(s.step, s.key).toBeGreaterThan(0);
    }
  });
});

describe('applyLighting', () => {
  it('sets the lighting uniforms of every material under the object, and leaves the rest alone', () => {
    const lit = { ...lightingUniforms(), uAssembly: { value: 1 } } as Record<string, IUniform>;
    const unlit = { uGhost: { value: 0.5 } } as Record<string, IUniform>;
    const group = new Group();
    group.add(new Mesh(undefined, new RawShaderMaterial({ uniforms: lit })));
    group.add(new Mesh(undefined, new RawShaderMaterial({ uniforms: unlit })));
    applyLighting(group, { fillStrength: 0.45, depthDim: 0.7 });
    expect(lit.uFillStrength.value).toBe(0.45);
    expect(lit.uDepthDim.value).toBe(0.7);
    expect(lit.uKeyStrength.value).toBe(LIGHTING.keyStrength);
    expect(lit.uAssembly.value).toBe(1);
    expect(Object.keys(unlit)).toEqual(['uGhost']);
  });
});

describe('lightingJson', () => {
  it('is the whole LIGHTING table with the overrides applied, ready to paste back', () => {
    const parsed = JSON.parse(lightingJson({ rimStrength: 0.5 }));
    expect(parsed).toEqual({ ...LIGHTING, keyDir: [...LIGHTING.keyDir], rimStrength: 0.5 });
  });
});
