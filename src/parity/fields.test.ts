import { describe, expect, it } from 'vitest';
import { mechanisms } from '../mechanisms';
import { buildMoteAttrs } from '../scene/mote/attributes';
import { mote } from '../scene/mote/mote';
import { partTransforms } from '../scene/mote/partTransforms';
import { defaultSceneState } from '../timeline/sceneState';
import { moteLibraryGlsl } from '../scene/mote/shaderSource';
import { derpLibraryGlsl } from '../scene/node/shaderSource';
import { STAR_VERTEX } from './shaders';
import { ZERO_DERP } from '../scene/node/derp';
import {
  STAR_PARITY_FIELDS,
  glslStarOutStruct,
  DERP_PARITY_FIELDS,
  fieldValues,
  glslDerpStruct,
  glslMoteOutStruct,
  glslPassOutput,
  PARITY_FIELDS,
  parityPasses,
} from './fields';

const mech = mechanisms.gears;
const s = defaultSceneState();
const sample = mote(buildMoteAttrs(mech, mech.samplePoints(10, 7))[0], s, partTransforms(mech, s));

describe('PARITY_FIELDS', () => {
  it('compares every MoteOut field', () => {
    expect(new Set(PARITY_FIELDS.map((f) => f.name))).toEqual(new Set(Object.keys(sample)));
    expect(PARITY_FIELDS).toHaveLength(Object.keys(sample).length);
  });

  it('flattens each field to its declared size', () => {
    for (const f of PARITY_FIELDS) expect(fieldValues(sample, f.name), f.name).toHaveLength(f.size);
    expect(fieldValues({ ...sample, visible: true }, 'visible')).toEqual([1]);
    expect(fieldValues({ ...sample, visible: false }, 'visible')).toEqual([0]);
  });
});

describe('parityPasses', () => {
  const passes = parityPasses();

  it('places every field once, whole, in a pass of at most one RGBA texel', () => {
    expect(passes.flat().map((p) => p.field.name).sort()).toEqual(PARITY_FIELDS.map((f) => f.name).sort());
    for (const pass of passes) {
      expect(pass.reduce((n, p) => n + p.field.size, 0)).toBeLessThanOrEqual(4);
      let offset = 0;
      for (const p of pass) {
        expect(p.offset).toBe(offset);
        offset += p.field.size;
      }
    }
  });

  it('writes each pass as a vec4 of the MoteOut fields, zero padded', () => {
    for (const pass of passes) {
      const glsl = glslPassOutput(pass, 'o');
      expect(glsl).toMatch(/^vec4\(/);
      for (const p of pass) expect(glsl).toContain(`o.${p.field.name}`);
    }
    expect(glslPassOutput([{ field: { name: 'brightness', size: 1 }, offset: 0 }], 'o')).toBe(
      'vec4(o.brightness, 0.0, 0.0, 0.0)',
    );
  });
});

describe('glslMoteOutStruct', () => {
  it('declares every parity field, in order, with the GLSL type of its size', () => {
    const glslType = ['', 'float', 'vec2', 'vec3', 'vec4'];
    const members = [...glslMoteOutStruct().matchAll(/^\s+(float|vec[234]) (\w+);/gm)].map((m) => [m[2], m[1]]);
    expect(members).toEqual(PARITY_FIELDS.map((f) => [f.name, glslType[f.size]]));
  });

  it('is the MoteOut struct the mote library is built with', () => {
    expect(moteLibraryGlsl()).toContain(glslMoteOutStruct());
    expect(moteLibraryGlsl().match(/struct MoteOut\b/g)).toHaveLength(1);
  });
});

describe('STAR_PARITY_FIELDS', () => {
  it('compares every star.ts output the star parity shader computes, in its StarOut struct', () => {
    expect(STAR_PARITY_FIELDS.map((f) => f.name)).toEqual(['offset', 'gain', 'spike', 'breath', 'tint']);
    expect(STAR_VERTEX).toContain(glslStarOutStruct());
    for (const f of STAR_PARITY_FIELDS) expect(STAR_VERTEX).toContain(`o.${f.name} = `);
  });
});

describe('DERP_PARITY_FIELDS', () => {
  it('compares every Derp field, and is the Derp struct the derp library is built with', () => {
    const out = ZERO_DERP;
    expect(DERP_PARITY_FIELDS.map((f) => f.name).sort()).toEqual(Object.keys(out).sort());
    for (const f of DERP_PARITY_FIELDS) expect(fieldValues(out, f.name), f.name).toHaveLength(f.size);
    expect(derpLibraryGlsl()).toContain(glslDerpStruct());
    expect(derpLibraryGlsl().match(/struct Derp\b/g)).toHaveLength(1);
  });
});
