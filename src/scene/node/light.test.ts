import { describe, expect, it } from 'vitest';
import { MOTE_BUDGET_DESKTOP, MOTE_SEED } from '../../config';
import { galaxyBudget, generateGalaxy } from '../../galaxy/generate';
import { LIGHT_CONSTANTS, NODE_FIX_WINDOW, NODE_HI_WINDOW, NODE_NEVER, NODE_PALETTE, NODE_SURGE_MAX_HOP } from './birth';
import { nodeArrival, nodeLight, nodeSettle, nodeSpread } from './light';
import { lightLibraryGlsl } from './shaderSource';
import lightGlsl from './light.glsl?raw';

// The light every galaxy mote shares (light.ts, light.glsl), carried over from the stacks network's
// node tests when the stacks went: the highlight, the surge and the fix's going out; the landing; the
// spread; and the one spliced source of light.glsl's constants and the palette.

const g = generateGalaxy(MOTE_SEED, 'desktop', galaxyBudget(MOTE_BUDGET_DESKTOP));
const byId = (id: string) => g.bodies[g.ids[id]];
const lightOf = (id: string, c: { fix: number; highlight: number }) => {
  const b = byId(id);
  return nodeLight(b.fixAt ?? NODE_NEVER, b.hiAt ?? NODE_NEVER, b.hop ?? -1, c);
};

describe('nodeLight: the highlight and the surge', () => {
  it('hi is 0 before its window, 1 at hiAt, and 0 again once fixed', () => {
    const c2 = byId('C2');
    expect(lightOf('C2', { fix: 0, highlight: c2.hiAt! - NODE_HI_WINDOW - 1e-3 }).hi).toBe(0);
    expect(lightOf('C2', { fix: 0, highlight: c2.hiAt! }).hi).toBe(1);
    expect(lightOf('C2', { fix: 0.1, highlight: 0.25 }).hi).toBe(1);
    expect(lightOf('C2', { fix: c2.fixAt!, highlight: 0.25 }).hi).toBe(0);
  });

  it('nothing is lit before the defect is found, and C1 (found close) never lights', () => {
    for (const b of g.bodies)
      expect(
        nodeLight(b.fixAt ?? NODE_NEVER, b.hiAt ?? NODE_NEVER, b.hop ?? -1, {
          fix: 0,
          highlight: 0,
        }).hi,
        b.id,
      ).toBe(0);
    expect(byId('C1').hiAt).toBeNull();
    for (const highlight of [0.25, 0.5, 0.9]) expect(lightOf('C1', { fix: 0.1, highlight }).hi).toBe(0);
  });

  it('the surge lights by hop from the source, 0..6 by highlight 1, and every hop past 6 with hop 6', () => {
    const at = (hop: number, highlight: number) => nodeLight(NODE_NEVER, NODE_NEVER, hop, { fix: 0, highlight }).surge;
    for (let h = 0; h <= NODE_SURGE_MAX_HOP; h++) {
      const done = 0.92 + 0.012 * h;
      expect(at(h, done - 0.01), `hop ${h} before`).toBe(0);
      expect(at(h, done), `hop ${h} lit`).toBe(1);
    }
    expect(at(7, 0.992)).toBe(at(6, 0.992));
    expect(at(9, 1)).toBe(1);
    expect(at(-1, 1)).toBe(0); // off the lineage: never
    expect(at(0, 0.91)).toBe(0);
  });

  it('a rebuilt body goes out at its fix: the highlight and the surge times (1 - fix)', () => {
    const r0 = byId('R0');
    expect(lightOf('R0', { fix: 0, highlight: 1 }).hi).toBe(1);
    expect(lightOf('R0', { fix: r0.fixAt! + 1e-6, highlight: 1 })).toEqual({
      fix: 1,
      hi: 0,
      surge: 0,
    });
    const c1 = byId('C1');
    expect(lightOf('C1', { fix: 0.1, highlight: 1 }).surge).toBe(0);
    expect(lightOf('C1', { fix: c1.fixAt! - NODE_FIX_WINDOW, highlight: 1 }).surge).toBe(1);
  });

  it('a clean body never lights', () => {
    const clean = g.bodies.filter((b) => !b.cracked);
    expect(clean.length).toBeGreaterThan(50);
    for (const b of clean)
      for (const highlight of [0.3, 0.92, 1])
        expect(
          nodeLight(b.fixAt ?? NODE_NEVER, b.hiAt ?? NODE_NEVER, b.hop ?? -1, {
            fix: 0,
            highlight,
          }).hi,
          b.id,
        ).toBe(0);
  });
});

describe('the landing and the spread', () => {
  it('lands at born + dur × birth, smoothstepped over the window before it', () => {
    expect(nodeSettle(0.2, 0.05, 0.4)).toBeCloseTo(0.22, 12);
    expect(nodeArrival(0.22, 0.22 - 0.012, 0.012)).toBe(0);
    expect(nodeArrival(0.22, 0.22 - 0.006, 0.012)).toBeCloseTo(0.5, 12);
    expect(nodeArrival(0.22, 0.22, 0.012)).toBe(1);
  });

  it('spreads a flight’s start over the unit cube, from the seed alone', () => {
    const seen = Array.from({ length: 4000 }, (_, i) => nodeSpread(i * 7919));
    for (const p of seen) for (const v of p) expect(Math.abs(v)).toBeLessThanOrEqual(1);
    for (let k = 0; k < 3; k++) expect(Math.abs(seen.reduce((s, p) => s + p[k], 0) / seen.length)).toBeLessThan(0.05);
    expect(nodeSpread(12345)).toEqual(nodeSpread(12345));
  });
});

describe('light.glsl', () => {
  it('declares its constants and the palette once, spliced, and only those', () => {
    const lib = lightLibraryGlsl();
    for (const [name, value] of LIGHT_CONSTANTS) {
      const m = new RegExp(`const float ${name} = ([-0-9.e]+);`).exec(lib);
      expect(m, name).not.toBeNull();
      expect(Number(m![1]), name).toBe(value);
    }
    for (const name of Object.keys(NODE_PALETTE)) expect(lib.match(new RegExp(`const vec3 ${name} =`, 'g')), name).toHaveLength(1);
    for (const m of lightGlsl.matchAll(/\bNODE_[A-Z_]+\b/g)) expect(LIGHT_CONSTANTS.has(m[0]) || m[0] in NODE_PALETTE, m[0]).toBe(true);
    expect(lightGlsl).not.toMatch(/const (float|vec3) NODE_/);
  });
});
