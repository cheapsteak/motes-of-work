import { describe, expect, it } from 'vitest';
import moteGlsl from '../scene/mote/mote.glsl?raw';
import instanceGlsl from '../scene/mote/shaders/instance.glsl?raw';
import attributesTs from '../scene/mote/attributes.ts?raw';
import moteTs from '../scene/mote/mote.ts?raw';
import lightGlsl from '../scene/node/light.glsl?raw';
import lightTs from '../scene/node/light.ts?raw';
import bodyAttrsTs from '../scene/node/bodyAttrs.ts?raw';
import holeGlsl from '../scene/hole/hole.glsl?raw';
import holeTs from '../scene/hole/hole.ts?raw';
import holeLookTs from '../scene/hole/holeLook.ts?raw';
import leakGlsl from '../scene/node/leak.glsl?raw';
import leakTs from '../scene/node/leak.ts?raw';
import dropoutTs from '../scene/node/dropout.ts?raw';
import planGlsl from '../scene/node/plan.glsl?raw';
import planScreenGlsl from '../scene/node/planScreen.glsl?raw';
import planTs from '../scene/node/plan.ts?raw';
import planAttrsTs from '../scene/node/planAttrs.ts?raw';
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
      bodyZ: 16,
      bodyAzimuth: 17,
      nodeSpreadX: 20,
      nodeSpreadY: 21,
      nodeSpreadZ: 22,
      bodyBirth: 23,
      personLat: 24,
      personLon: 25,
      bodyKeep: 26,
      starDotZ: 27,
      starDotAzimuth: 28,
      starDotRadius: 29,
      // The black hole (re-skin Task 4): the knots, the jets, the in-fall and the strands, then the disk's motion.
      knotLaunch: 30,
      knotEmber: 31,
      jetSpeed: 32,
      infallPeriod: 33,
      infallOffset: 34,
      infallTilt: 35,
      infallSide: 36,
      infallAzimuth: 37,
      infallFrom: 38,
      infallTo: 39,
      infallWind: 40,
      strandBright: 41,
      diskPhase: 42,
      diskLifeR: 43,
      diskLifeAngle: 44,
      diskLifeLen: 45,
      diskLifeBright: 46,
      diskLifePitch: 47,
      diskHot: 48,
      hazePhase: 49,
      hazeAngle: 50,
      // The plan's schematic (re-skin Task 7b).
      planDash: 51,
      planNode: 52,
      planOutline: 53,
      planRank: 54,
      // The defect's leak and dropout (re-skin Task 8b).
      leakOpen: 55,
      leakDir: 56,
      leakWidth: 57,
      leakDot: 58,
      leakAim: 59,
      leakReach: 60,
      leakShiver: 61,
      dropCell: 62,
      dropLine: 63,
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
  // Every hash01 of a mote seed names its salt from the registry; a numeric literal is a fork. The
  // network's spread is light.*'s (node.* takes it from there).
  it('GLSL hash01 calls take a SALT_ constant, never a literal', () => {
    for (const [file, src] of [
      ['mote.glsl', moteGlsl],
      ['instance.glsl', instanceGlsl],
      ['light.glsl', lightGlsl],
      ['hole.glsl', holeGlsl],
      ['leak.glsl', leakGlsl],
      ['plan.glsl', planGlsl],
      ['planScreen.glsl', planScreenGlsl],
    ]) {
      const calls = src.split('\n').filter((l) => /\bhash01\(/.test(l) && !/^\s*float hash01\(uint/.test(l));
      expect(calls.length, file).toBeGreaterThan(0);
      for (const line of calls) expect(line, file).toMatch(/hash01\(.*,\s*SALT_[A-Z0-9_]+\)/);
    }
    const generated = new Set(parseGlslSalts(glslSaltConstants()).keys());
    const used = new Set([...(moteGlsl + instanceGlsl + lightGlsl + holeGlsl + leakGlsl + planGlsl + planScreenGlsl).matchAll(/\bSALT_[A-Z0-9_]+/g)].map((m) => m[0]));
    expect(used.size).toBeGreaterThan(0);
    for (const name of used) expect(generated.has(name), name).toBe(true);
  });

  it('TS hash01 calls on a mote seed take a SALT entry, never a literal', () => {
    for (const [file, src] of [
      ['attributes.ts', attributesTs],
      ['mote.ts', moteTs],
      ['light.ts', lightTs],
      ['bodyAttrs.ts', bodyAttrsTs],
      ['hole.ts', holeTs],
      ['holeLook.ts', holeLookTs],
      ['leak.ts', leakTs],
      ['dropout.ts', dropoutTs],
      ['plan.ts', planTs],
      ['planAttrs.ts', planAttrsTs],
    ]) {
      const calls = src.split('\n').filter((l) => /\bhash01\(/.test(l) && !/^import/.test(l));
      expect(calls.length, file).toBeGreaterThan(0);
      for (const line of calls) expect(line, file).toMatch(/hash01\([^,]+,\s*SALT\.\w+\)/);
    }
  });
});
