import { describe, expect, it } from 'vitest';
import moteGlsl from '../scene/mote/mote.glsl?raw';
import instanceGlsl from '../scene/mote/shaders/instance.glsl?raw';
import attributesTs from '../scene/mote/attributes.ts?raw';
import moteTs from '../scene/mote/mote.ts?raw';
import { glslSaltConstants, glslSaltName, SALT, type SaltName } from './salts';

/** `name -> value` for every `const uint SALT_X = Nu;` line in a GLSL chunk. */
function parseGlslSalts(glsl: string): Map<string, number> {
  const out = new Map<string, number>();
  for (const m of glsl.matchAll(/const uint (SALT_[A-Z0-9_]+) = (\d+)u;/g)) out.set(m[1], Number(m[2]));
  return out;
}

describe('SALT', () => {
  it('keeps the values every mote has been rendered with', () => {
    // Changing any value changes how every mote looks; this table is the regression fence.
    expect(SALT).toEqual({
      settle: 1,
      type: 2,
      extra: 3,
      misVisible: 4,
      driftX: 5,
      driftY: 6,
      driftZ: 7,
      spawnZ: 8,
      spawnAzimuth: 9,
      spawnRadius: 10,
      scenario: 11,
      bezierSide: 12,
      twinPhase: 13,
      shimmer: 14,
      hero: 15,
    });
  });

  it('gives every salt a distinct value', () => {
    const values = Object.values(SALT);
    expect(new Set(values).size).toBe(values.length);
  });

  it('generates exactly the SALT set as GLSL constants', () => {
    const glsl = parseGlslSalts(glslSaltConstants());
    const ts = new Map(Object.entries(SALT).map(([k, v]) => [glslSaltName(k as SaltName), v]));
    expect(glsl).toEqual(ts);
    expect(new Set(glsl.values())).toEqual(new Set(Object.values(SALT)));
    expect(glslSaltName('misVisible')).toBe('SALT_MIS_VISIBLE');
  });
});

describe('salt call sites', () => {
  // Every hash01 of a mote seed names its salt from the registry; a numeric literal is a fork.
  it('GLSL hash01 calls take a SALT_ constant, never a literal', () => {
    for (const [file, src] of [
      ['mote.glsl', moteGlsl],
      ['instance.glsl', instanceGlsl],
    ]) {
      const calls = src.split('\n').filter((l) => /\bhash01\(/.test(l) && !/^\s*float hash01\(uint/.test(l));
      expect(calls.length, file).toBeGreaterThan(0);
      for (const line of calls) expect(line, file).toMatch(/hash01\(.*,\s*SALT_[A-Z0-9_]+\)/);
    }
    const generated = new Set(parseGlslSalts(glslSaltConstants()).keys());
    const used = new Set([...(moteGlsl + instanceGlsl).matchAll(/\bSALT_[A-Z0-9_]+/g)].map((m) => m[0]));
    expect(used.size).toBeGreaterThan(0);
    for (const name of used) expect(generated.has(name), name).toBe(true);
  });

  it('TS hash01 calls on a mote seed take a SALT entry, never a literal', () => {
    for (const [file, src] of [
      ['attributes.ts', attributesTs],
      ['mote.ts', moteTs],
    ]) {
      const calls = src.split('\n').filter((l) => /\bhash01\(/.test(l) && !/^import/.test(l));
      expect(calls.length, file).toBeGreaterThan(0);
      for (const line of calls) expect(line, file).toMatch(/hash01\([^,]+,\s*SALT\.\w+\)/);
    }
  });
});
