import { describe, expect, it } from 'vitest';
import type { Vec3 } from '../../math/vec';
import {
  FREEZE_CONSTANTS,
  FREEZE_COPY_GAIN,
  FREEZE_LIMB_BAND,
  FREEZE_LIMB_BREAK,
  FREEZE_LIMB_GAIN,
  FREEZE_LIMB_LIGHT,
  FREEZE_LIMB_SIZE,
  FREEZE_SCATTER_FILL,
  FREEZE_SCATTER_WINDOW,
  FREEZE_TICK_COUNT,
  FREEZE_TICK_MOON,
  FREEZE_TICK_PLANET,
  FREEZE_VEC2S,
  FREEZE_WARM_MODE,
  hexToRgb,
  NODE_PALETTE,
} from './birth';
import { freezeBreath, freezeCopy, freezeLimb, freezeScatterFill, freezeTick, freezeTickShow, freezeTickWarm, freezeTwos, type TickSource } from './freeze';
import { heldFill } from './bodyMote';
import { freezeLibraryGlsl, withGalaxyLibrary, GALAXY_INCLUDE_MARKER } from './shaderSource';
import freezeGlsl from './freeze.glsl?raw';

const AGENT = hexToRgb(NODE_PALETTE.NODE_AGENT);
const HUMAN = hexToRgb(NODE_PALETTE.NODE_HUMAN);
const EMBER = hexToRgb(NODE_PALETTE.NODE_EMBER);
const LIGHT = [...FREEZE_LIMB_LIGHT] as Vec3;
const DEG = Math.PI / 180;
const grid = (from: number, to: number, n: number): number[] => Array.from({ length: n + 1 }, (_, i) => from + ((to - from) * i) / n);
/** A view-space normal at screen angle `deg` (degrees from the screen's right, y up), `f` of the way to edge-on (f = 1 − |z|). */
const normalAt = (deg: number, f: number): Vec3 => {
  const z = 1 - f;
  const r = Math.sqrt(1 - z * z);
  return [r * Math.cos(deg * DEG), r * Math.sin(deg * DEG), z];
};
const SOURCES: readonly TickSource[] = ['moon', 'planet'];
const spec = (s: TickSource) => (s === 'moon' ? FREEZE_TICK_MOON : FREEZE_TICK_PLANET);
/** Every mote of a source's burst at the given clocks. */
const motesOf = (s: TickSource, v: number, scatterOut = 0, toMoon = 0, variant: 0 | 1 = 0) =>
  Array.from({ length: spec(s).n }, (_, i) => Array.from({ length: spec(s).motes }, (_, j) => ({ i, j, ...freezeTick(s, i, j, variant, v, scatterOut, toMoon) }))).flat();
const apart = (a: number, b: number) => Math.abs(((((a - b + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI);

describe('freezeCopy', () => {
  it('draws no copy at dress 0, the base at its own brightness where it stands', () => {
    for (const copy of [1, 2] as const)
      for (const v of [0, 0.4, 1])
        for (const moon of [false, true]) {
          const c = freezeCopy(copy, 0, v, 'A', moon);
          expect(c.gain, `copy ${copy}`).toBe(0);
          expect(Math.abs(c.offPx), `copy ${copy}`).toBe(0);
        }
    for (const dress of [0, 0.5, 1]) expect(freezeCopy(0, dress, 1, 'A', true)).toEqual({ offPx: 0, gain: 1, tint: [0, 0, 0] });
  });

  it('stands the moon caught mid-burst 6 px off, every other part of the piece 3, cold to one side and warm to the other, at 0.26 of the base', () => {
    expect(freezeCopy(1, 1, 1, 'A', true).offPx).toBe(-6);
    expect(freezeCopy(2, 1, 1, 'A', true).offPx).toBe(6);
    expect(freezeCopy(1, 1, 1, 'A', false).offPx).toBe(-3);
    expect(freezeCopy(2, 1, 1, 'A', false).offPx).toBe(3);
    expect(freezeCopy(2, 1, 1, 'A', false).gain).toBeCloseTo(FREEZE_COPY_GAIN, 12);
    // They spread in with the dressing.
    expect(freezeCopy(2, 0.5, 1, 'A', false).offPx).toBeCloseTo(1.5, 12);
    expect(freezeCopy(1, 0.5, 1, 'A', false).gain).toBeCloseTo(0.13, 12);
  });

  it('tints the cold copy agent blue, and the warm one ember turning amber with 1 − v in mode A, amber throughout in B', () => {
    for (const v of [0, 0.5, 1]) expect(freezeCopy(1, 1, v, 'A', false).tint).toEqual(AGENT);
    const a = (v: number) => freezeCopy(2, 1, v, 'A', false).tint;
    a(1).forEach((c, i) => expect(c).toBeCloseTo(EMBER[i], 12));
    a(0).forEach((c, i) => expect(c).toBeCloseTo(HUMAN[i], 12));
    a(0.25).forEach((c, i) => expect(c).toBeCloseTo(EMBER[i] + (HUMAN[i] - EMBER[i]) * 0.75, 12));
    for (const v of [0, 0.5, 1]) freezeCopy(2, 1, v, 'B', false).tint.forEach((c, i) => expect(c).toBeCloseTo(HUMAN[i], 12));
    // The author's choice.
    expect(FREEZE_WARM_MODE).toBe('A');
  });
});

describe('freezeLimb', () => {
  it('inks the band at FREEZE_LIMB_GAIN (2.25) outside the 20° break, from f 0.92 out to edge-on', () => {
    for (const f of grid(FREEZE_LIMB_BAND[1], 1, 4))
      for (const deg of grid(0, 360, 72)) {
        if (apart(deg * DEG, FREEZE_LIMB_BREAK[0] * DEG) < FREEZE_LIMB_BREAK[1] * DEG) continue;
        expect(freezeLimb(normalAt(deg, f), LIGHT, 1, 0).gain, `${deg}° at f ${f}`).toBeCloseTo(FREEZE_LIMB_GAIN, 9);
      }
    expect(FREEZE_LIMB_GAIN).toBe(2.25);
  });

  it('leaves the face (f under 0.78) and the break’s centre unlit, feathers between, and draws nothing at dress 0', () => {
    for (const deg of grid(0, 360, 24)) {
      expect(freezeLimb(normalAt(deg, FREEZE_LIMB_BAND[0] - 0.01), LIGHT, 1, 0)).toEqual({ gain: 1, size: 1 });
      expect(freezeLimb(normalAt(deg, 1), LIGHT, 0, 0)).toEqual({ gain: 1, size: 1 });
    }
    expect(freezeLimb(normalAt(FREEZE_LIMB_BREAK[0], 1), LIGHT, 1, 0).gain).toBe(1);
    const half = freezeLimb(normalAt(FREEZE_LIMB_BREAK[0] + FREEZE_LIMB_BREAK[1] / 2, 1), LIGHT, 1, 0).gain;
    expect(half).toBeGreaterThan(1);
    expect(half).toBeLessThan(FREEZE_LIMB_GAIN);
  });

  it('swells toward the key light (upper left), up to FREEZE_LIMB_SIZE, and halves the ink on a copy', () => {
    const dark = freezeLimb(normalAt(-45, 1), LIGHT, 1, 0);
    expect(dark.size).toBeCloseTo(1 + (FREEZE_LIMB_SIZE - 1) * 0.7, 9);
    const toward = freezeLimb(normalAt(100, 1), LIGHT, 1, 0);
    expect(toward.size).toBeGreaterThan(dark.size);
    expect(toward.size).toBeLessThanOrEqual(1 + (FREEZE_LIMB_SIZE - 1) * 1.3 + 1e-9);
    const copy = freezeLimb(normalAt(-45, 1), LIGHT, 1, 2);
    expect(copy.gain).toBeCloseTo(1 + (FREEZE_LIMB_GAIN - 1) / 2, 9);
  });
});

describe('freezeTick', () => {
  it('is 238 motes: 14 dashes of 6 round the moon, 22 of 7 round the planet', () => {
    expect(FREEZE_TICK_COUNT).toBe(238);
    expect(motesOf('moon', 1)).toHaveLength(84);
    expect(motesOf('planet', 1)).toHaveLength(154);
  });

  it('draws no tick at v = 0, and every one at v = 1 but the planet’s gap', () => {
    for (const s of SOURCES)
      for (const variant of [0, 1] as const) {
        expect(motesOf(s, 0, 0, 0, variant).filter((m) => m.visible > 0), s).toEqual([]);
        expect(motesOf(s, 0, 1, 2, variant).filter((m) => m.visible > 0), s).toEqual([]);
      }
    expect(motesOf('moon', 1).every((m) => m.visible === 1)).toBe(true);
  });

  it('leaves the planet’s burst a gap of ±26° toward the moon, wherever the moon is, and the moon’s none', () => {
    for (const toMoon of grid(-Math.PI, Math.PI, 36)) {
      const shown = motesOf('planet', 1, 0.5, toMoon).filter((m) => m.visible > 0);
      expect(shown.length).toBeGreaterThan(0);
      for (const m of shown) expect(apart(m.angle, toMoon), `toward ${toMoon}`).toBeGreaterThanOrEqual(26 * DEG - 0.005);
      // Only the gap is left out: at most four of 22 dashes (16.4° apart, ±4°) fall in ±25.8°.
      expect(new Set(shown.map((m) => m.i)).size).toBeGreaterThanOrEqual(FREEZE_TICK_PLANET.n - 4);
      expect(motesOf('moon', 1, 0.5, toMoon).every((m) => m.visible === 1)).toBe(true);
    }
  });

  it('places the dashes radially, ±4° of even, the planet’s half a step off the moon’s, from r0 (planet + 0.40 while the shell is out), within their lengths', () => {
    for (const s of SOURCES) {
      const k = spec(s);
      for (const m of motesOf(s, 1, 1)) {
        const even = (2 * Math.PI * m.i) / k.n + (s === 'planet' ? Math.PI / k.n : 0);
        expect(Math.abs(m.angle - even)).toBeLessThanOrEqual(0.07 + 1e-12);
        expect(m.radius).toBeCloseTo(s === 'moon' ? 2.1 : 1.12 + 0.4, 12);
        expect(m.len).toBeGreaterThanOrEqual(0);
        expect(m.len).toBeLessThanOrEqual(k.len[1] * (m.j / (k.motes - 1)) + 1e-9);
        if (m.j === k.motes - 1) expect(m.len).toBeGreaterThanOrEqual(k.len[0]);
      }
    }
    expect(freezeTick('planet', 3, 0, 0, 1, 0, 0).radius).toBeCloseTo(1.12, 12);
  });

  it('re-rolls only the lengths between the twos’ two sets', () => {
    for (const s of SOURCES) {
      const [a, b] = [motesOf(s, 1, 0, 1, 0), motesOf(s, 1, 0, 1, 1)];
      expect(a.map((m) => m.angle)).toEqual(b.map((m) => m.angle));
      expect(a.some((m, i) => m.len !== b[i].len)).toBe(true);
    }
  });

  it('retracts as the fix lands: fewer motes as v falls, each dash from its outer end, winking out one by one', () => {
    for (const s of SOURCES) {
      const count = (v: number) => motesOf(s, v, 0, 7).filter((m) => m.visible > 0).length;
      const counts = grid(1, 0, 40).map(count);
      for (let i = 1; i < counts.length; i++) expect(counts[i]).toBeLessThanOrEqual(counts[i - 1]);
      // At v = 1 every dash stands whole (the planet's but its gap).
      expect(counts[0]).toBeGreaterThanOrEqual((spec(s).n - (s === 'moon' ? 0 : 4)) * spec(s).motes);
      // Some dashes are gone while others still stand: they go one by one, not all at once.
      const mid = motesOf(s, 0.5, 0, 7).filter((m) => m.visible > 0);
      const dashes = new Set(mid.map((m) => m.i)).size;
      expect(dashes).toBeGreaterThan(0);
      expect(dashes).toBeLessThan(spec(s).n);
      // A standing dash keeps its inner motes: whatever it drops is from its outer end.
      for (const i of new Set(mid.map((m) => m.i))) {
        const js = mid.filter((m) => m.i === i).map((m) => m.j);
        expect(js).toEqual(js.map((_, k) => k));
      }
      // ... and keeps min(1, 1.6 v) of them: at v 0.3, 0.48 of the dash.
      const late = motesOf(s, 0.3, 0, 7).filter((m) => m.visible > 0);
      expect(late.length).toBeGreaterThan(0);
      for (const i of new Set(late.map((m) => m.i))) expect(late.filter((m) => m.i === i)).toHaveLength(Math.floor(0.48 * (spec(s).motes - 1)) + 1);
    }
  });

  it('comes in with the dressing, the planet’s a beat before the moon’s, alternating cold and warm out of step', () => {
    expect(freezeTickShow('moon', 0.45)).toBe(0);
    expect(freezeTickShow('moon', 0.95)).toBe(1);
    expect(freezeTickShow('planet', 0.4)).toBe(0);
    expect(freezeTickShow('planet', 0.9)).toBe(1);
    expect(freezeTickShow('planet', 0.6)).toBeGreaterThan(freezeTickShow('moon', 0.6));
    expect([0, 1, 2, 3].map((i) => freezeTickWarm('moon', i))).toEqual([false, true, false, true]);
    expect([0, 1, 2, 3].map((i) => freezeTickWarm('planet', i))).toEqual([true, false, true, false]);
  });
});

describe('the twos', () => {
  it('tick at 12 Hz on the live ambient, and stand at 0 (no breath) where it is not live', () => {
    expect(freezeTwos(null)).toBe(0);
    expect(freezeTwos(1)).toBe(12);
    expect(freezeTwos(1.08)).toBe(12);
    expect(freezeBreath(0)).toBe(0);
    for (let t = 1; t < 200; t++) expect(Math.abs(freezeBreath(t))).toBeLessThanOrEqual(0.3);
    expect(new Set(Array.from({ length: 10 }, (_, t) => freezeBreath(t + 1))).size).toBeGreaterThan(5);
  });
});

describe('the scatter haze (re-skin §4.5)', () => {
  it('fills the held planet at 0.5 while its scatter is out, [0, 0.36) s, and at 1 outside the window', () => {
    expect(FREEZE_SCATTER_FILL).toBe(0.5);
    expect([...FREEZE_SCATTER_WINDOW]).toEqual([0, 0.36]);
    for (const s of [0, 0.01, 0.16, 0.3, 0.359999]) expect(freezeScatterFill(true, s), `${s} s`).toBe(0.5);
    for (const s of [-1, -1e-9, 0.36, 0.5, 1.2, 2]) expect(freezeScatterFill(true, s), `${s} s`).toBe(1);
    // Not held: never, whatever the scatter.
    for (const s of [-1, 0, 0.16, 0.36, 1]) expect(freezeScatterFill(false, s), `${s} s`).toBe(1);
  });

  it('is the held planet’s alone, and only while the freeze holds: never another row, nor the focused planet’s own scatters', () => {
    const planet = 31;
    const moon = 40;
    const held = { holding: true, freeze: { dress: 1, flash: 0, copy: 0 as const, moon, planet } };
    expect(heldFill(planet, 0.16, held)).toBe(0.5);
    // Its copies carry it too (the copy's material reads the same row and uniforms).
    for (const copy of [1, 2] as const) expect(heldFill(planet, 0.16, { ...held, freeze: { ...held.freeze, copy } })).toBe(0.5);
    expect(heldFill(planet, 0.4, held)).toBe(1);
    expect(heldFill(planet, -1, held)).toBe(1);
    // Any other row: its moon, a neighbour.
    for (const row of [moon, planet + 1, 0]) expect(heldFill(row, 0.16, held), `row ${row}`).toBe(1);
    // Not holding (df-1's forced scatters, the release, the mended planet): its own fill.
    expect(heldFill(planet, 0.16, { ...held, holding: false })).toBe(1);
    expect(heldFill(planet, 0.16, { freeze: held.freeze })).toBe(1);
    // No freeze frame (no held planet): its own fill.
    expect(heldFill(planet, 0.16, { holding: true })).toBe(1);
  });
});

describe('freeze.glsl', () => {
  it('declares the constants birth.ts exports for it, spliced, and names only those', () => {
    const lib = freezeLibraryGlsl();
    for (const [name, value] of FREEZE_CONSTANTS) {
      const m = new RegExp(`const float ${name} = ([-0-9.e]+);`).exec(lib);
      expect(m, name).not.toBeNull();
      expect(Number(m![1]), name).toBe(value);
    }
    for (const [name, [a, b]] of FREEZE_VEC2S) expect(lib, name).toMatch(new RegExp(`const vec2 ${name} = vec2\\(${a}(\\.0)?, ${b}(\\.0)?\\);`));
    expect(lib).toContain("const int FREEZE_WARM_MODE = 0; // 'A'");
    expect(lib).not.toMatch(/#include/);
    for (const m of freezeGlsl.matchAll(/\bFREEZE_[A-Z0-9_]+\b/g)) {
      const known = FREEZE_CONSTANTS.has(m[0]) || FREEZE_VEC2S.has(m[0]);
      expect(known || /^FREEZE_(LIMB_LIGHT|GREY|WARM_MODE|TICK_SEED|TICK_SALT|PI|SOURCE_MOON|SOURCE_PLANET)$/.test(m[0]), m[0]).toBe(true);
    }
  });

  it('is in every galaxy shader once, after light.glsl (the palette) and before bodyMote.glsl', () => {
    const shader = withGalaxyLibrary(GALAXY_INCLUDE_MARKER);
    expect(shader.split('FreezeTick freezeTick(')).toHaveLength(2);
    expect(shader.indexOf('const vec3 NODE_EMBER')).toBeLessThan(shader.indexOf('FreezeCopy freezeCopy('));
    expect(shader.indexOf('FreezeCopy freezeCopy(')).toBeLessThan(shader.indexOf('BodyMoteOut bodyMote(BodyMoteAttrs a)'));
    expect(shader.split('float freezeScatterFill(bool held, float scatterS)')).toHaveLength(2);
    expect(shader.indexOf('float freezeScatterFill(')).toBeLessThan(shader.indexOf('float heldFill(int row, float scatterS)'));
  });
});
