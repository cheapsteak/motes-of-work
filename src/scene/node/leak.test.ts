import { describe, expect, it } from 'vitest';
import { MOTE_BUDGET_DESKTOP, MOTE_SEED } from '../../config';
import { AMBIENT_POSE } from '../../galaxy/ambient';
import { latticeCount } from '../../galaxy/body';
import { galaxyBudget, generateGalaxy } from '../../galaxy/generate';
import type { Vec3 } from '../../math/vec';
import { Lamp } from '../../timeline/netTrack';
import { FREEZE_SCATTER_S, LEAK, LEAK_CLOSED, LEAK_CONSTANTS, LEAK_VEC2S, NODE_DERP_DUR, NODE_DERP_PERIOD, NODE_NEVER } from './birth';
import { packShellData, SHELL_TEXELS } from './bodyAttrs';
import { packBodyData } from './bodyData';
import { bodyLeak, focusScatterRow, type BodyClocks } from './bodyMote';
import { DerpKind, derpEvent } from './derp';
import { leakDotTiming, leakOffset, leakWounds, leakWoundsAt, LEAK_WOUNDS, type Wound } from './leak';
import leakGlsl from './leak.glsl?raw';
import { leakLibraryGlsl } from './shaderSource';
import { BODY_LEAK_AMBIENTS } from '../../parity/bodyCases';
import { latticeLL, llUnit, shellSeed } from './shell';

const T = NODE_DERP_PERIOD;
const FRAME = 1 / LEAK.fps;
const g = generateGalaxy(MOTE_SEED, 'desktop', galaxyBudget(MOTE_BUDGET_DESKTOP));
const data = packBodyData(g);
const C1 = g.bodies[g.ids.C1];
const SEED = C1.derpSeed;
const PHASE = Math.fround(C1.derpPhase);
const BODY = shellSeed('C1');
const [ROWS, COLS] = C1.lattice!;
const UNITS: Vec3[] = Array.from({ length: latticeCount(ROWS, COLS) }, (_, i) => llUnit(latticeLL(i, ROWS, COLS)));
const len = (v: readonly number[]) => Math.hypot(v[0], v[1], v[2]);
/** The farthest a dot reaches at the end of its curve out (k = 1): reach × (dist[0] + dist[1]) × amp R. */
const PEAK = LEAK.reach * (LEAK.dist[0] + LEAK.dist[1]) * LEAK.amp;

describe('the wounds', () => {
  it('two wounds trail each scatter', () => {
    // Each of 2,000 slots read as a scatter: wound 1 opens 0.30-0.40 s after the onset and wound 2
    // 0.18-0.38 s after wound 1, each on a whole 1/30 s frame of the ambient (the frame it falls in: up
    // to a frame earlier than the unquantised time, as the inspector's q30 floors); its cone's cosine
    // within cos(0.45 ... 0.60); its centre a unit vector; its seed 24 bits.
    for (let k = 0; k < 2000; k++) {
      const onset = derpEvent(SEED, PHASE, (k - PHASE) * T + T / 2).t0;
      const [w1, w2] = leakWounds(SEED, PHASE, BODY, k);
      const d1 = w1.open - onset;
      const d2 = w2.open - w1.open;
      expect(d1).toBeGreaterThan(LEAK.wound1[0] - FRAME - 1e-9);
      expect(d1).toBeLessThan(LEAK.wound1[0] + LEAK.wound1[1] + 1e-9);
      expect(d2).toBeGreaterThan(LEAK.wound2[0] - FRAME - 1e-9);
      expect(d2).toBeLessThan(LEAK.wound2[0] + LEAK.wound2[1] + 1e-9);
      for (const w of [w1, w2]) {
        expect(Math.abs(w.open * LEAK.fps - Math.round(w.open * LEAK.fps))).toBeLessThan(1e-6);
        expect(w.cosT).toBeGreaterThanOrEqual(Math.cos(LEAK.cosT[0] + LEAK.cosT[1]));
        expect(w.cosT).toBeLessThanOrEqual(Math.cos(LEAK.cosT[0]));
        expect(len(w.dir)).toBeCloseTo(1, 12);
        expect(Number.isInteger(w.seed) && w.seed >= 0 && w.seed < 2 ** 24).toBe(true);
      }
    }
  });

  it('a slot is open only while it scatters, and the one before it reaches no further than the next', () => {
    // The wounds open at an ambient are those of the current slot and the one before, each only if it
    // scatters (or the scatter is forced): the latest dot of a slot is home before the slot after next
    // begins, so two slots hold every wound that can still be leaking.
    const lastHome = (k: number) => {
      const off = derpEvent(SEED, PHASE, (k - PHASE) * T + T / 2).t0 - (k - PHASE) * T;
      return off + LEAK.wound1[0] + LEAK.wound1[1] + LEAK.wound2[0] + LEAK.wound2[1] + LEAK.edgeDelay + LEAK.startJitter + LEAK.out[0] + LEAK.out[1] + LEAK.linger[0] + LEAK.linger[1];
    };
    for (let k = 0; k < 500; k++) expect(lastHome(k)).toBeLessThan(2 * T);
    let natural = 0;
    for (let i = 0; i < 4000; i++) {
      const t = 0.37 + i * 0.29;
      const ev = derpEvent(SEED, PHASE, t);
      const open = leakWoundsAt(SEED, PHASE, BODY, t, false);
      const forced = leakWoundsAt(SEED, PHASE, BODY, t, true);
      expect(forced.length).toBe(ev.k > 0 ? 4 : 2);
      expect(forced.map((w) => w.seed)).toEqual([...(ev.k > 0 ? leakWounds(SEED, PHASE, BODY, ev.k - 1) : []), ...leakWounds(SEED, PHASE, BODY, ev.k)].map((w) => w.seed));
      const scatters = [ev.k - 1, ev.k].filter((k) => k >= 0 && derpEvent(SEED, PHASE, (k - PHASE) * T + T / 2).kind === DerpKind.Scatter);
      expect(open.length).toBe(2 * scatters.length);
      natural += open.length;
      expect(open.length).toBeLessThanOrEqual(LEAK_WOUNDS);
    }
    expect(natural).toBeGreaterThan(0);
  });
});

describe('a leaking dot', () => {
  /** Wounds of 60 forced slots, each with the dots of C1's lattice inside it. */
  const wounds: Wound[] = Array.from({ length: 60 }, (_, k) => leakWounds(SEED, PHASE, BODY, 40 + k)).flat();
  const inside = (w: Wound) => UNITS.flatMap((u, i) => (u[0] * w.dir[0] + u[1] * w.dir[1] + u[2] * w.dir[2] >= w.cosT ? [i] : []));

  it("three in four of a wound's dots leak, out and back", () => {
    let held = 0;
    let leaking = 0;
    for (const w of wounds) {
      for (const i of inside(w)) {
        held++;
        const u = UNITS[i];
        const at = leakDotTiming(u, i, w);
        if (at === null) {
          // A dot that does not leak stays home at every moment of its wound.
          if (i % 5 === 0) for (const s of [0.2, 0.9, 1.6]) expect(leakOffset(u, i, w.open + s, [w]).off).toEqual([0, 0, 0]);
          continue;
        }
        leaking++;
        // Its motion, on every fifth leaking dot (the share above counts them all).
        if (leaking % 5 !== 0) continue;
        // It starts within the edge's delay and its jitter, curves out over 0.5-1.1 s and lingers 0.25-0.95 s.
        expect(at.start - w.open).toBeGreaterThanOrEqual(0);
        expect(at.start - w.open).toBeLessThanOrEqual(LEAK.edgeDelay + LEAK.startJitter);
        expect(at.out).toBeGreaterThanOrEqual(LEAK.out[0]);
        expect(at.out).toBeLessThanOrEqual(LEAK.out[0] + LEAK.out[1]);
        expect(at.linger).toBeGreaterThanOrEqual(LEAK.linger[0]);
        expect(at.linger).toBeLessThanOrEqual(LEAK.linger[0] + LEAK.linger[1]);
        // Home before it starts; at its peak (the end of the curve out) out and dimmed to 1 − dim.
        expect(leakOffset(u, i, at.start - FRAME, [w])).toEqual({ off: [0, 0, 0], gain: 1 });
        const peak = leakOffset(u, i, at.start + at.out, [w]);
        expect(len(peak.off)).toBeGreaterThan(0);
        expect(len(peak.off)).toBeLessThanOrEqual(PEAK * (1 + 1e-9) + LEAK.shiver);
        expect(peak.gain).toBeCloseTo(1 - LEAK.dim, 12);
        // Lingering it creeps at most `creep` further (and shivers); then home in one frame.
        const late = leakOffset(u, i, at.start + at.out + at.linger - 1e-6, [w]);
        expect(len(late.off)).toBeLessThanOrEqual(PEAK * (1 + LEAK.creep) + 2 * LEAK.shiver);
        expect(len(late.off)).toBeGreaterThan(0);
        expect(leakOffset(u, i, at.start + at.out + at.linger + 1e-9, [w])).toEqual({ off: [0, 0, 0], gain: 1 });
        expect(leakOffset(u, i, at.start + at.out + at.linger + FRAME, [w])).toEqual({ off: [0, 0, 0], gain: 1 });
      }
    }
    expect(held).toBeGreaterThan(5000);
    // Measured: 0.7537 of 51,044 dots held by 120 wounds (60 slots).
    expect(Math.abs(leaking / held - LEAK.frac)).toBeLessThanOrEqual(0.03);
  });

  it('goes out along its own bent normal, and the first wound that holds it wins', () => {
    for (const w of wounds.slice(0, 20)) {
      for (const i of inside(w)) {
        const at = leakDotTiming(UNITS[i], i, w);
        if (at === null) continue;
        const off = leakOffset(UNITS[i], i, at.start + at.out, [w]).off;
        // Outward: the bend is half a unit vector, so the offset keeps a positive share along the normal.
        expect(off[0] * UNITS[i][0] + off[1] * UNITS[i][1] + off[2] * UNITS[i][2]).toBeGreaterThan(0);
        // Behind a closed wound, and ahead of any other: the dot follows the wound that holds it.
        const closed: Wound = { open: 0, dir: [0, 1, 0], cosT: LEAK_CLOSED, seed: 7 };
        expect(leakOffset(UNITS[i], i, at.start + at.out, [closed, w])).toEqual(leakOffset(UNITS[i], i, at.start + at.out, [w]));
        expect(leakOffset(UNITS[i], i, at.start + at.out, [w, wounds[0]])).toEqual(leakOffset(UNITS[i], i, at.start + at.out, [w]));
      }
    }
  });
});

describe('where the leak draws', () => {
  it('a healthy body never leaks', () => {
    for (let i = 0; i < 2000; i++) expect(leakWoundsAt(NODE_NEVER, 0.3, 12345, i * 1.79, true)).toEqual([]);
    for (const u of UNITS.slice(0, 200)) expect(leakOffset(u, 3, 50, [])).toEqual({ off: [0, 0, 0], gain: 1 });
    // Every healthy row of the shell texture, at any ambient, forced or not: every wound closed.
    const healthy = g.bodies.filter((b) => !b.cracked).map((b) => b.index);
    expect(healthy.length).toBeGreaterThan(10);
    for (const t of [0, AMBIENT_POSE, 101, 3599.9]) {
      const shells = packShellData(g, t, C1.index, true);
      for (const row of healthy) expect(bodyLeak(row, t, { ...data, shells })).toEqual([]);
    }
  });

  it('the freeze holds the leak still', () => {
    // The held frame (the freeze forcing C1's scatter FREEZE_SCATTER_S in, the hold up): no forced
    // scatter from the focus, and no wound open on any row. Not vacuous: the same frame live, forced by
    // the focus, has C1 leaking.
    const held: BodyClocks = { growth: 1, fix: 0, highlight: 0, show: 1, focus: 1, ambient: AMBIENT_POSE, lamp: Lamp.Planet, lampRow: C1.index, sysPx: new Float32Array(32).fill(200), forcedScatter: C1.index, holding: true };
    expect(focusScatterRow(held, data)).toBe(-1);
    const shells = packShellData(g, AMBIENT_POSE, focusScatterRow(held, data), !held.holding);
    for (const b of g.bodies) expect(bodyLeak(b.index, AMBIENT_POSE, { ...data, shells }), b.id).toEqual([]);
    const live = { ...held, forcedScatter: -1, holding: false };
    expect(focusScatterRow(live, data)).toBe(C1.index);
    // Find an ambient near the pose where a forced wound of C1 has dots out.
    let out = 0;
    for (let t = AMBIENT_POSE; t < AMBIENT_POSE + 3 && out === 0; t += 0.1) {
      const ws = bodyLeak(C1.index, t, { ...data, shells: packShellData(g, t, C1.index, true) });
      out = UNITS.filter((u, i) => len(leakOffset(u, i, t, ws).off) > 0).length;
    }
    expect(out).toBeGreaterThan(0);
    expect(FREEZE_SCATTER_S).toBeLessThan(NODE_DERP_DUR);
  });

  it('the body parity samples C1 mid-leak (bodyCases.ts BODY_LEAK_AMBIENTS)', () => {
    for (const t of BODY_LEAK_AMBIENTS) {
      const ws = bodyLeak(C1.index, Math.fround(t), { ...data, shells: packShellData(g, Math.fround(t), C1.index, true) });
      expect(UNITS.filter((u, i) => i % 3 === 0 && len(leakOffset(u, i, Math.fround(t), ws).off) > 0).length, `at ${t}`).toBeGreaterThan(100);
    }
  });

  it('packs as the shader reads it: four wound texels, the ages and the seeds', () => {
    expect(SHELL_TEXELS).toBe(7 + 6);
    for (const t of [3.3, 47.1, 1061.5]) {
      const shells = packShellData(g, t, C1.index, true);
      const want = leakWoundsAt(SEED, PHASE, BODY, t, true);
      const got = bodyLeak(C1.index, t, { ...data, shells });
      expect(got.length).toBe(want.length);
      got.forEach((w, j) => {
        expect(w.seed).toBe(want[j].seed);
        expect(w.cosT).toBe(Math.fround(want[j].cosT));
        expect(w.open).toBeCloseTo(want[j].open, 3);
        expect(t - w.open).toBe(Math.fround(t - want[j].open));
      });
    }
  });
});

describe('leak.glsl', () => {
  it('declares the leak constants birth.ts exports, and names no bare copy', () => {
    const lib = leakLibraryGlsl();
    for (const [name, value] of LEAK_CONSTANTS) {
      const m = new RegExp(`const float ${name} = ([-0-9.e]+);`).exec(lib);
      expect(m, name).not.toBeNull();
      expect(Number(m![1]), name).toBe(value);
    }
    for (const [name, [a, b]] of LEAK_VEC2S) expect(lib, name).toMatch(new RegExp(`const vec2 ${name} = vec2\\(${a}(\\.0)?, ${b}(\\.0)?\\);`));
    for (const m of leakGlsl.matchAll(/\bLEAK_[A-Z_]+\b/g)) expect(LEAK_CONSTANTS.has(m[0]) || LEAK_VEC2S.has(m[0]), m[0]).toBe(true);
    expect(leakGlsl).not.toMatch(/const (float|vec2) LEAK_/);
    expect(leakGlsl).not.toMatch(/\b(0\.75|1\.8|0\.15|0\.25|0\.012|0\.08)\b/);
    expect(leakGlsl).not.toMatch(/(?<![A-Za-z_])(sin|cos)\(/);
    expect(lib).toMatch(/LeakOut leakOffset\(vec3 u, float i, Leak leak\)/);
  });
});
