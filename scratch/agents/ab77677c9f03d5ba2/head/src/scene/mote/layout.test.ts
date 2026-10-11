import { describe, expect, it } from 'vitest';
import { mechanisms } from '../../mechanisms';
import { buildMoteAttrs, type MoteAttrs } from './attributes';
import {
  glslAttributeDecls,
  glslInstanceAttrs,
  glslMoteAttrsStruct,
  INSTANCE_ATTRIBUTES,
  instancedAttributes,
} from './layout';
import { moteLibraryGlsl, splice, withMoteLibrary } from './shaderSource';
import { HASH_VERTEX, MOTE_VERTEX, PARITY_FRAGMENT } from '../../parity/shaders';
import ghostFrag from './shaders/ghost.frag.glsl?raw';
import ghostVert from './shaders/ghost.vert.glsl?raw';
import moteFrag from './shaders/mote.frag.glsl?raw';
import moteVert from './shaders/mote.vert.glsl?raw';
import threadFrag from './shaders/thread.frag.glsl?raw';
import threadVert from './shaders/thread.vert.glsl?raw';

const mech = mechanisms.gears;
const attrs = buildMoteAttrs(mech, mech.samplePoints(500, 3));
const fields = INSTANCE_ATTRIBUTES.flatMap((a) => a.fields);

describe('INSTANCE_ATTRIBUTES', () => {
  it('carries every MoteAttrs field exactly once', () => {
    const names = fields.map((f) => f.field);
    expect(new Set(names).size).toBe(names.length);
    expect(new Set(names)).toEqual(new Set(Object.keys(attrs[0])));
  });

  it('packs each attribute to exactly itemSize components, at most a vec4', () => {
    for (const spec of INSTANCE_ATTRIBUTES) {
      expect(spec.itemSize, spec.name).toBeLessThanOrEqual(4);
      expect(spec.itemSize, spec.name).toBe(spec.fields.reduce((n, f) => n + f.components, 0));
      for (const a of attrs) expect(spec.pack(a), spec.name).toHaveLength(spec.itemSize);
    }
  });

  it('packs the three visibility flags as bits 1, 2, 4', () => {
    const meta1 = INSTANCE_ATTRIBUTES.find((s) => s.name === 'aMeta1');
    for (let bits = 0; bits < 8; bits++) {
      const visible: MoteAttrs['visible'] = [(bits & 1) !== 0, (bits & 2) !== 0, (bits & 4) !== 0];
      expect(meta1?.pack({ ...attrs[0], visible })).toEqual([...attrs[0].type, bits]);
    }
  });
});

describe('instancedAttributes', () => {
  it('builds one instanced buffer per spec, holding pack() of every mote in order', () => {
    const built = instancedAttributes(attrs);
    expect(Object.keys(built)).toEqual(INSTANCE_ATTRIBUTES.map((s) => s.name));
    for (const spec of INSTANCE_ATTRIBUTES) {
      const attr = built[spec.name];
      expect(attr.itemSize).toBe(spec.itemSize);
      expect(attr.count).toBe(attrs.length);
      expect(Array.from(attr.array)).toEqual(Array.from(new Float32Array(attrs.flatMap((a) => spec.pack(a)))));
    }
  });
});

describe('generated GLSL', () => {
  it('declares exactly the spec attributes with their vector sizes', () => {
    const decls = [...glslAttributeDecls().matchAll(/^in (float|vec[234]) (\w+);/gm)].map((m) => [m[2], m[1]]);
    const glslType = (n: number) => (n === 1 ? 'float' : `vec${n}`);
    expect(decls).toEqual(INSTANCE_ATTRIBUTES.map((s) => [s.name, glslType(s.itemSize)]));
  });

  it('declares every MoteAttrs field in the struct and assigns each once in instanceAttrs()', () => {
    const members = [...glslMoteAttrsStruct().matchAll(/^\s+(float|vec[234]) (\w+);/gm)].map((m) => m[2]);
    expect(members).toEqual(fields.map((f) => f.field));
    const assigned = [...glslInstanceAttrs().matchAll(/^\s+a\.(\w+) = /gm)].map((m) => m[1]);
    expect(assigned).toEqual(fields.map((f) => f.field));
  });

  it('reads every attribute component in instanceAttrs()', () => {
    const body = glslInstanceAttrs();
    for (const spec of INSTANCE_ATTRIBUTES) {
      const swizzle = 'xyzw'.slice(0, spec.itemSize);
      const read = [...body.matchAll(new RegExp(`\\b${spec.name}\\.([xyzw]+)`, 'g'))].map((m) => m[1]).join('');
      expect(read, spec.name).toBe(swizzle); // in order, each component once
    }
  });
});

describe('shader assembly', () => {
  it('splices every marker in the production vertex shaders', () => {
    for (const vert of [moteVert, threadVert, ghostVert]) {
      const src = withMoteLibrary(vert);
      expect(src).not.toMatch(/#include/);
      expect(src).toContain('MoteAttrs instanceAttrs()');
      expect(src).toContain('const uint SALT_HERO = 15u;');
      expect(src).toContain(glslAttributeDecls());
    }
    expect(moteLibraryGlsl()).not.toMatch(/#include/);
    expect(moteLibraryGlsl()).toContain(glslMoteAttrsStruct());
  });

  it('fails loudly on a missing or repeated marker', () => {
    expect(() => withMoteLibrary('void main() {}')).toThrow(/marker/);
    expect(() => splice('a // M\nb', '// M', 'x')).not.toThrow();
    expect(() => splice('a', '// M', 'x')).toThrow(/marker/);
    expect(() => splice('// M\n// M', '// M', 'x')).toThrow(/marker/);
  });
});

describe('vertex attribute budget', () => {
  // WebGL2 guarantees 16 vertex attributes (MAX_VERTEX_ATTRIBS); every shader that reads the instanced
  // layout must fit in that alongside its own per-vertex inputs.
  const WEBGL2_MIN_VERTEX_ATTRIBS = 16;
  const ownInputs = (src: string): string[] => [...src.matchAll(/^in (?:float|vec[234]) (\w+);/gm)].map((m) => m[1]);
  const vertexShaders = { mote: moteVert, thread: threadVert, ghost: ghostVert, parity: MOTE_VERTEX };

  it('INSTANCE_ATTRIBUTES plus the largest per-shader extra fits in 16', () => {
    const extras = Object.values(vertexShaders).map((v) => ownInputs(v).length);
    expect(Math.max(...extras)).toBe(2); // the mote quad: aCorner, aQuad
    expect(INSTANCE_ATTRIBUTES.length + Math.max(...extras)).toBeLessThanOrEqual(WEBGL2_MIN_VERTEX_ATTRIBS);
  });

  it('each assembled vertex shader declares at most 16 inputs', () => {
    for (const [name, v] of Object.entries(vertexShaders)) {
      expect(ownInputs(withMoteLibrary(v)).length, name).toBeLessThanOrEqual(WEBGL2_MIN_VERTEX_ATTRIBS);
    }
  });
});

describe('mote.glsl stays in the vertex stage', () => {
  it('no fragment shader carries the mote library', () => {
    const fragments = { mote: moteFrag, thread: threadFrag, ghost: ghostFrag, parity: PARITY_FRAGMENT };
    for (const [name, f] of Object.entries(fragments)) {
      expect(f, name).not.toMatch(/\bpcg\(|\bhash01\(|\bmote\(|MoteOut|#include/);
    }
  });

  it('the parity hash check runs in a vertex shader', () => {
    expect(HASH_VERTEX).toContain(moteLibraryGlsl());
    expect(HASH_VERTEX).toMatch(/gl_PointSize/);
  });
});
