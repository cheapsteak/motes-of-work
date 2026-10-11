import { describe, expect, it } from 'vitest';
import { MOTE_BUDGET_DESKTOP, MOTE_SEED } from '../../config';
import { latticeCount, latticeRowCols } from '../../galaxy/body';
import { galaxyBudget, generateGalaxy } from '../../galaxy/generate';
import { mulberry32 } from '../../math/hash';
import { Fails } from '../../testing/fails';
import type { Vec3 } from '../../math/vec';
import {
  AFTERSHOCK_AMP,
  AFTERSHOCK_AT,
  EQ_A,
  EQ_P,
  EQ_Q2_MIN,
  EQ_SECOND,
  NODE_DERP_DUR,
  NODE_DERP_PERIOD,
  NODE_NEVER,
  RING_AMP,
  SCATTER_AMP,
  SCATTER_JITTER,
  SCATTER_MOON_CAP,
  SHELL_ARRAYS,
  SHELL_CONSTANTS,
  SHELL_EVENT_AFTERSHOCK,
  SHELL_EVENT_STRIDE,
  SHELL_EVENT_SWEEP_AZ,
  SHELL_EVENT_SWEEP_Z,
  SHELL_MOTE_STRIDE,
  SHELL_SALT,
  SHELL_SHAPE_AT,
  SHELL_SHAPE_STRIDE,
  SHELL_SPIN_PERIOD,
  SHELL_UINT_CONSTANTS,
  DERP_FINE_EVENT,
  DERP_FINE_SALT,
} from './birth';
import { derp, derpEvent, DerpKind } from './derp';
import {
  landingSec,
  latticeLL,
  llUnit,
  morphR,
  moteHashes,
  scatterCount,
  scatterK,
  shapeAt,
  shellEvent,
  shellSeed,
  shellHome,
  shellK,
  shellWarp,
  shellWarpLeak,
  spinAxis,
  spinShell,
  type ShellEvent,
} from './shell';
import { shellLibraryGlsl, withShellLibrary } from './shaderSource';
import shellGlsl from './shell.glsl?raw';
import { leakOffset, leakWounds } from './leak';

const grid = (from: number, to: number, n: number): number[] => Array.from({ length: n }, (_, i) => from + ((to - from) * i) / n);
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (v: Vec3): number => Math.hypot(v[0], v[1], v[2]);
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** A derp seed (shared by every cracked body), and a body's own seed for its shapes and spin. */
const SEED = 0x2f6a1;
const BODY = shellSeed('C1');
/** A planet's lattice (14 × 36) and a hero's (60 × 160), every mote's (lat, lon). */
const lattice = (rows: number, cols: number) => Array.from({ length: latticeCount(rows, cols) }, (_, i) => latticeLL(i, rows, cols));
const PLANET = lattice(14, 36);
const HERO = lattice(60, 160);
/** The largest a leap gets: the amplitude's top plus the jitter. */
const LEAP_MAX = SCATTER_AMP[0] + SCATTER_AMP[1] + SCATTER_JITTER;
/** A planet's cap: none below the amplitude's top. */
const PLANET_CAP = SCATTER_AMP[0] + SCATTER_AMP[1];

/** An event `sec` seconds into a scatter at shape index n, swept along `sweep`. */
const scatterAt = (sec: number, opts: { sweep?: Vec3; aftershock?: boolean; n?: number; seed?: number } = {}): ShellEvent => {
  const n = opts.n ?? 3;
  const raw = opts.sweep ?? [0.6, 0.48, 0.64];
  const l = len(raw);
  return {
    sec,
    sweep: [raw[0] / l, raw[1] / l, raw[2] / l],
    n,
    aftershock: opts.aftershock ?? false,
    shape: shapeAt(opts.seed ?? SEED, n),
    next: shapeAt(opts.seed ?? SEED, n + 1),
  };
};
const calm = (n = 3): ShellEvent => scatterAt(-1, { n });

describe('the lattice', () => {
  it('lays each row at its latitude with latticeRowCols points, odd rows offset half a step', () => {
    for (const [rows, cols] of [
      [14, 36],
      [60, 160],
      [5, 10],
    ] as const) {
      const perRow = latticeRowCols(rows, cols);
      let i = 0;
      perRow.forEach((n, row) => {
        for (let j = 0; j < n; j++, i++) {
          const ll = latticeLL(i, rows, cols);
          expect(ll.lat).toBeCloseTo(-Math.PI / 2 + (Math.PI * (row + 0.5)) / rows, 12);
          expect(ll.lon).toBeCloseTo((2 * Math.PI * (j + (row % 2) / 2)) / n, 12);
        }
      });
      expect(i).toBe(latticeCount(rows, cols));
      expect(() => latticeLL(i, rows, cols)).toThrow();
    }
    expect(HERO).toHaveLength(6116);
  });

  it('hashes a mote as hash01(seed, i · 8 + j)', () => {
    const h = moteHashes(SEED, 41);
    expect(h).toHaveLength(SHELL_MOTE_STRIDE);
    expect(new Set(h).size).toBe(8);
    expect(moteHashes(SEED, 42)[0]).not.toBe(h[0]);
  });
});

describe('the spin', () => {
  it('turns about an axis 25–40° off the vertical, once in 14 s', () => {
    const tilts: number[] = [];
    const azimuths = new Set<number>();
    for (let seed = 1; seed <= 400; seed++) {
      const a = spinAxis(seed);
      expect(len(a)).toBeCloseTo(1, 12);
      tilts.push((Math.acos(a[1]) * 180) / Math.PI);
      azimuths.add(Math.floor(((Math.atan2(a[2], a[0]) + Math.PI) / (2 * Math.PI)) * 8));
    }
    expect(Math.min(...tilts)).toBeGreaterThanOrEqual(25);
    expect(Math.max(...tilts)).toBeLessThanOrEqual(40);
    expect(Math.max(...tilts) - Math.min(...tilts)).toBeGreaterThan(13);
    expect(azimuths.size).toBe(8);
    const axis = spinAxis(7);
    const p: Vec3 = [0.3, -0.5, 0.81];
    for (const t of [0, 3.3, 7, 101]) {
      expect(len(spinShell(p, axis, t))).toBeCloseTo(len(p), 12);
      expect(dot(spinShell(p, axis, t), axis)).toBeCloseTo(dot(p, axis), 12);
      spinShell(axis, axis, t).forEach((c, i) => expect(c).toBeCloseTo(axis[i], 12));
    }
    spinShell(p, axis, SHELL_SPIN_PERIOD).forEach((c, i) => expect(c).toBeCloseTo(p[i], 12));
    spinShell(p, axis, 3 * SHELL_SPIN_PERIOD + 2).forEach((c, i) => expect(c).toBeCloseTo(spinShell(p, axis, 2)[i], 9));
    // Half a turn takes p to its mirror through the axis.
    const half = spinShell(p, axis, SHELL_SPIN_PERIOD / 2);
    const onAxis = dot(p, axis);
    half.forEach((c, i) => expect(c).toBeCloseTo(2 * onAxis * axis[i] - p[i], 12));
  });
});

describe('the equation', () => {
  it('draws each shape from its ranges: p in {12..20}, q = p/2 ± 1, p2 = p + 3..7, q2 = max(3, q − 1..3)', () => {
    const ps = new Set<number>();
    for (let n = 0; n < 200; n++) {
      const s = shapeAt(SEED, n);
      ps.add(s.p);
      expect(EQ_P).toContain(s.p);
      expect(Math.abs(s.q - s.p / 2)).toBeLessThanOrEqual(1);
      expect(s.p2 - s.p).toBeGreaterThanOrEqual(3);
      expect(s.p2 - s.p).toBeLessThanOrEqual(7);
      expect(s.q2).toBeGreaterThanOrEqual(EQ_Q2_MIN);
      expect(s.q2 === EQ_Q2_MIN || (s.q - s.q2 >= 1 && s.q - s.q2 <= 3)).toBe(true);
      for (const phi of s.phi) expect(phi >= 0 && phi < 2 * Math.PI).toBe(true);
    }
    expect([...ps].sort((a, b) => a - b)).toEqual([...EQ_P]);
  });

  it('is the product of sines of §7.2, linear in A and within A (1 + 0.45)', () => {
    const s = shapeAt(SEED, 5);
    const lat = 0.31;
    const lon = 2.2;
    const t = 37.3;
    const want =
      1 +
      EQ_A *
        Math.cos(lat) *
        (Math.sin(s.p * lon + s.phi[0] + 0.35 * t) * Math.sin(s.q * (lat + Math.PI / 2) + s.phi[1] - 0.22 * t) +
          0.45 * Math.sin(s.p2 * lon + s.phi[2] - 0.5 * t) * Math.sin(s.q2 * (lat + Math.PI / 2) + s.phi[3]));
    expect(morphR(lat, lon, t, s, EQ_A)).toBeCloseTo(want, 14);
    expect(morphR(lat, lon, t, s, 0)).toBe(1);
    expect(morphR(lat, lon, t, s, 2 * EQ_A) - 1).toBeCloseTo(2 * (want - 1), 14);
    let top = 0;
    for (const ll of HERO) for (const tt of [0, 9.1]) top = Math.max(top, Math.abs(morphR(ll.lat, ll.lon, tt, s, EQ_A) - 1));
    expect(top).toBeLessThanOrEqual(EQ_A * (1 + EQ_SECOND));
    expect(top).toBeGreaterThan(EQ_A * 0.9);
  });
});

describe('the poles', () => {
  it('the wave vanishes at the poles: r = 1 for every p and every ambient', () => {
    for (const p of EQ_P) {
      let n = 0;
      while (shapeAt(BODY, n).p !== p) n++;
      const s = shapeAt(BODY, n);
      for (const t of grid(0, 1200, 50))
        for (const lon of grid(0, 2 * Math.PI, 24)) {
          expect(Math.abs(morphR(Math.PI / 2, lon, t, s, EQ_A) - 1), `p ${p}`).toBeLessThan(1e-6);
          expect(Math.abs(morphR(-Math.PI / 2, lon, t, s, EQ_A) - 1), `p ${p}`).toBeLessThan(1e-6);
        }
      // Off the poles the wave is there, and it fades toward them with cos(lat).
      let mid = 0;
      let nearPole = 0;
      for (const t of grid(0, 1200, 50))
        for (const lon of grid(0, 2 * Math.PI, 24)) {
          mid = Math.max(mid, Math.abs(morphR(0.1, lon, t, s, EQ_A) - 1));
          nearPole = Math.max(nearPole, Math.abs(morphR(Math.PI / 2 - 0.05, lon, t, s, EQ_A) - 1));
        }
      expect(mid, `p ${p}`).toBeGreaterThan(0.5 * EQ_A);
      expect(nearPole, `p ${p}`).toBeLessThanOrEqual(Math.sin(0.05) * EQ_A * (1 + EQ_SECOND));
    }
  });
});

describe('per-body seeds', () => {
  it('two cracked bodies share a derp seed but not their shapes or their spin axes', () => {
    const g = generateGalaxy(MOTE_SEED, 'desktop', galaxyBudget(MOTE_BUDGET_DESKTOP));
    const cracked = [g.bodies[g.ids.C1], ...g.bodies.filter((b) => b.kind === 'moon' && b.host === g.ids.C1)];
    expect(cracked.every((b) => b.cracked && b.derpSeed === cracked[0].derpSeed)).toBe(true);
    const seeds = cracked.map((b) => shellSeed(b.id));
    expect(new Set(seeds).size).toBe(cracked.length);
    for (const s of seeds) expect(s >= 0 && s < 2 ** 24 && Number.isInteger(s)).toBe(true);
    const [a, b] = seeds;
    const t = 101.3;
    const evA = shellEvent(cracked[0].derpSeed, cracked[0].derpPhase, t, a);
    const evB = shellEvent(cracked[0].derpSeed, cracked[0].derpPhase, t, b);
    expect(evA.n).toBe(evB.n);
    expect(evA.shape).not.toEqual(evB.shape);
    expect(evA.next).not.toEqual(evB.next);
    for (let i = 0; i < seeds.length; i++)
      for (let j = i + 1; j < seeds.length; j++) {
        expect(shapeAt(seeds[i], 0), `${cracked[i].id} ${cracked[j].id}`).not.toEqual(shapeAt(seeds[j], 0));
        expect(dot(spinAxis(seeds[i]), spinAxis(seeds[j])), `${cracked[i].id} ${cracked[j].id}`).toBeLessThan(1 - 1e-6);
      }
    expect(shellSeed('C1')).toBe(shellSeed('C1'));
  });
});

describe('shellWarp', () => {
  it('a healthy shell is a lattice sphere at every ambient', () => {
    const axis = spinAxis(11);
    for (const t of grid(0, 1200, 50)) {
      PLANET.forEach((ll, i) => {
        const p = shellWarp(ll, moteHashes(SEED, i), t, calm(), 0, 1, PLANET_CAP);
        expect(Math.abs(len(p) - 1)).toBeLessThan(1e-6);
        llUnit(ll).forEach((c, k) => expect(p[k]).toBeCloseTo(c, 12));
        expect(Math.abs(len(spinShell(p, axis, t)) - 1)).toBeLessThan(1e-6);
      });
    }
  });

  it('the bounds hold', () => {
    // Measured: 0.6 s on CI and alone, 1.9 s locally at load 12-22 beside the full suite; the default 5 s
    // would be only 2.6 times that. 30 s is 15 times.
    // Every sample's bounds tested plainly and the failures held to none once (Fails): an expect per
    // sample was half of this test (3.5 s on CI, past 5 s under load).
    const fails = new Fails();
    const rng = mulberry32(17);
    let leapTop = 0;
    let offTop = 0;
    let offSamples = 0;
    for (let i = 0; i < 100_000; i++) {
      const ll = { lat: Math.asin(2 * rng() - 1), lon: 2 * Math.PI * rng() };
      const h = moteHashes(SEED + (i % 97), i);
      const ev = scatterAt(rng() < 0.25 ? -1 : rng(), { sweep: [rng() - 0.5, rng() - 0.5, rng() - 0.5], aftershock: rng() < 0.5, n: i % 13 });
      const t = 1200 * rng();
      const p = shellWarp(ll, h, t, ev, EQ_A, 1, PLANET_CAP);
      const home = shellHome(ll, h, t, ev, EQ_A, 1);
      const leap = len(sub(p, home));
      leapTop = Math.max(leapTop, leap);
      // A mote never leaves its place on the shell by more than 0.40 R + the jitter, and that place
      // is never further from the unit lattice point than the morph and the ring.
      if (!(leap <= LEAP_MAX + 1e-12)) fails.add(`${i}: leap ${leap}`);
      const fromUnit = len(sub(p, llUnit(ll)));
      if (!(fromUnit <= LEAP_MAX + EQ_A * (1 + EQ_SECOND) + RING_AMP)) fails.add(`${i}: ${fromUnit} from its lattice point`);
      if (shellK(ll, h, ev) === 0) {
        offSamples++;
        if (!Object.is(leap, 0)) fails.add(`${i}: leap ${leap} off the scatter`);
        const off = Math.abs(len(p) - 1);
        offTop = Math.max(offTop, off);
        if (!(off <= EQ_A * 1.45 + RING_AMP + 1e-12)) fails.add(`${i}: ${off} off the shell`);
      }
    }
    expect(fails.count, String(fails)).toBe(0);
    // The bounds are reached, not vacuous.
    expect(leapTop).toBeGreaterThan(0.38);
    expect(offTop).toBeGreaterThan(0.05);
    expect(offSamples).toBeGreaterThan(30_000);
    // Without the morph, |p − u| itself stays under 0.40 R + 0.03 R.
    const rng2 = mulberry32(5);
    for (let i = 0; i < 20_000; i++) {
      const ll = { lat: Math.asin(2 * rng2() - 1), lon: 2 * Math.PI * rng2() };
      const ev = scatterAt(rng2(), { sweep: [rng2() - 0.5, rng2() - 0.5, rng2() - 0.5], aftershock: true });
      const d = len(sub(shellWarp(ll, moteHashes(SEED, i), 3, ev, 0, 1, PLANET_CAP), llUnit(ll)));
      if (!(d <= LEAP_MAX)) fails.add(`unmorphed ${i}: ${d}`);
    }
    expect(fails.count, String(fails)).toBe(0);
  }, 30_000);

  it('the sweep crosses in 80 ms and all are home by 0.36 s', () => {
    const at = (sec: number) => {
      const ev = scatterAt(sec, { aftershock: true });
      return HERO.map((ll, i) => {
        const h = moteHashes(SEED, i);
        const su = dot(llUnit(ll), ev.sweep);
        const out = len(sub(shellWarp(ll, h, 37.3, ev, EQ_A, 1, PLANET_CAP), shellHome(ll, h, 37.3, ev, EQ_A, 1))) > 1e-9;
        return { su, out };
      });
    };
    const early = at(0.04);
    expect(early.filter((m) => m.su > 0).every((m) => !m.out)).toBe(true);
    const behind = early.filter((m) => m.su < -0.2);
    expect(behind.length).toBeGreaterThan(1000);
    expect(behind.filter((m) => m.out).length / behind.length).toBeGreaterThanOrEqual(0.95);
    expect(at(0.16).every((m) => m.out)).toBe(true);
    expect(at(0.36).every((m) => !m.out)).toBe(true);
    // Before the sweep nothing is out, and the cut is a cut: at 0.04 a mote is fully out or home.
    expect(at(0).every((m) => !m.out)).toBe(true);
    const ev = scatterAt(0.04);
    HERO.forEach((ll, i) => expect([0, 1]).toContain(shellK(ll, moteHashes(SEED, i), ev)));
  });

  it('the return is three cuts', () => {
    expect(new Set(grid(0, 0.4, 4000).map((s) => scatterK(s, 0.3, 0.5)))).toEqual(new Set([0, 1, 0.55, 0.25]));
    // In order: home, out, 0.55, 0.25, home, each once.
    const seq = grid(0, 0.4, 4000)
      .map((s) => scatterK(s, 0.3, 0.5))
      .filter((k, i, a) => i === 0 || k !== a[i - 1]);
    expect(seq).toEqual([0, 1, 0.55, 0.25, 0]);
    expect(scatterK(-1, -1, 0)).toBe(0);
    expect(landingSec(1, 1)).toBeCloseTo(0.36, 12);
  });

  it('the shape steps once per scatter, in sweep order', () => {
    // Two shapes in a row differ: RMS of the radius over the hero lattice ≥ 0.5 A.
    for (let n = 0; n < 12; n++) {
      const [a, b] = [shapeAt(SEED, n), shapeAt(SEED, n + 1)];
      const sq = HERO.reduce((s, ll) => s + (morphR(ll.lat, ll.lon, 37.3, a, EQ_A) - morphR(ll.lat, ll.lon, 37.3, b, EQ_A)) ** 2, 0);
      expect(Math.sqrt(sq / HERO.length), `shape ${n}`).toBeGreaterThanOrEqual(0.5 * EQ_A);
    }
    // A real schedule: the count steps by one across each scatter and nowhere else.
    const phase = 0.37;
    let seen = 0;
    for (let k = 1; k < 120 && seen < 2; k++) {
      const ev = derpEvent(SEED, phase, (k - phase) * NODE_DERP_PERIOD + NODE_DERP_PERIOD / 2);
      if (ev.kind !== DerpKind.Scatter) continue;
      seen++;
      const n0 = scatterCount(SEED, phase, ev.t0 - 0.01);
      expect(scatterCount(SEED, phase, ev.t0 + 0.2)).toBe(n0);
      expect(scatterCount(SEED, phase, ev.t0 + NODE_DERP_DUR - 1e-6)).toBe(n0);
      expect(scatterCount(SEED, phase, ev.t0 + NODE_DERP_DUR + 1e-6)).toBe(n0 + 1);
      expect(shellEvent(SEED, phase, ev.t0 + 0.2, BODY).n).toBe(n0);
      // Each mote (one hash set for all, so only its place sets its time) is on shape n until it
      // lands and on n + 1 after: its radius changes shape once, in the order of u · sweep.
      const live = shellEvent(SEED, phase, ev.t0 + 0.2, BODY);
      expect(live.sec).toBeCloseTo(0.2, 9);
      expect(live.shape).toEqual(shapeAt(BODY, n0));
      expect(live.next).toEqual(shapeAt(BODY, n0 + 1));
      const h = moteHashes(SEED, 5);
      const secs = grid(0, 0.5, 250);
      const landings = PLANET.map((ll) => {
        const old = morphR(ll.lat, ll.lon, 37.3, live.shape, EQ_A);
        const nu = morphR(ll.lat, ll.lon, 37.3, live.next, EQ_A);
        // Which shape the mote's radius is on at each sec: 0 the old, 1 the new.
        const on = secs.map((sec) => {
          const r = len(shellWarp(ll, h, 37.3, { ...live, sec }, EQ_A, 0, PLANET_CAP));
          return Math.abs(r - old) < 1e-12 ? 0 : Math.abs(r - nu) < 1e-12 ? 1 : -1;
        });
        expect(on.includes(-1)).toBe(false);
        const switched = on.indexOf(1);
        expect(switched).toBeGreaterThan(0);
        expect(on.slice(switched).every((x) => x === 1)).toBe(true);
        return { su: dot(llUnit(ll), live.sweep), switched: secs[switched] };
      });
      landings.sort((a, b) => a.su - b.su);
      for (let i = 1; i < landings.length; i++) expect(landings[i].switched).toBeGreaterThanOrEqual(landings[i - 1].switched);
      expect(landings[landings.length - 1].switched - landings[0].switched).toBeGreaterThan(0.07);
    }
    expect(seen).toBe(2);
  }, 30_000);

  it("the moon's scatter is capped at 0.30 R", () => {
    let moonTop = 0;
    let planetTop = 0;
    PLANET.forEach((ll, i) => {
      for (const seed of [SEED, 99, 1234]) {
        const h = moteHashes(seed, i);
        const ev = scatterAt(0.1, { sweep: [0, -1, 0] });
        const home = shellHome(ll, h, 5, ev, EQ_A, 1);
        moonTop = Math.max(moonTop, len(sub(shellWarp(ll, h, 5, ev, EQ_A, 1, SCATTER_MOON_CAP), home)));
        planetTop = Math.max(planetTop, len(sub(shellWarp(ll, h, 5, ev, EQ_A, 1, PLANET_CAP), home)));
      }
    });
    expect(moonTop).toBeLessThanOrEqual(SCATTER_MOON_CAP + SCATTER_JITTER);
    expect(moonTop).toBeGreaterThan(SCATTER_MOON_CAP - SCATTER_JITTER);
    expect(planetTop).toBeGreaterThan(SCATTER_MOON_CAP + SCATTER_JITTER);
  });

  it('rings after landing, repeats at the aftershock without a second shape step, and scales the scatter by gain', () => {
    const ll = PLANET[123];
    const h = moteHashes(SEED, 123);
    const sweep: Vec3 = [0, 0, 1];
    const su = dot(llUnit(ll), sweep);
    const land = landingSec(su, h[4]);
    const ev = (sec: number, aftershock = true) => scatterAt(sec, { sweep, aftershock });
    // The ring: just after landing the radius is the next shape's plus RING_AMP.
    const r0 = len(shellHome(ll, h, 2, ev(land), EQ_A, 1));
    expect(r0 - morphR(ll.lat, ll.lon, 2, ev(land).next, EQ_A)).toBeCloseTo(RING_AMP, 12);
    // The aftershock: out at AFTERSHOCK_AMP for the hold, then home, still on the next shape.
    const after = AFTERSHOCK_AT + 0.04 * (su + 1) + 0.01;
    expect(shellK(ll, h, ev(after))).toBe(AFTERSHOCK_AMP);
    expect(shellK(ll, h, ev(after, false))).toBe(0);
    expect(shellK(ll, h, ev(after + 0.2))).toBe(0);
    // gain 0: no leap and no ring, the shape still steps.
    const mid = ev(0.1);
    expect(shellK(ll, h, mid)).toBe(1);
    expect(shellWarp(ll, h, 2, mid, EQ_A, 0, PLANET_CAP)).toEqual(shellHome(ll, h, 2, mid, EQ_A, 0));
    const p1 = shellWarp(ll, h, 2, ev(0.15), EQ_A, 1, PLANET_CAP);
    const pHalf = shellWarp(ll, h, 2, ev(0.15), EQ_A, 0.5, PLANET_CAP);
    const home = shellHome(ll, h, 2, ev(0.15), EQ_A, 1);
    sub(pHalf, home).forEach((c, i) => expect(c).toBeCloseTo(sub(p1, home)[i] / 2, 12));
  });
});

describe('the scatter schedule', () => {
  it('runs on the derps: its clock is derp()’s scatterS, its sweep and aftershock hashed per event', () => {
    const phase = 0.81;
    let scatters = 0;
    let aftershocks = 0;
    for (const t of grid(0, 400, 20_000)) {
      const ev = shellEvent(SEED, phase, t, BODY);
      const d = derp(SEED, phase, t, 'planet', 4, 0.3, 0.2, 1);
      expect(ev.sec).toBe(d.scatterS);
      if (ev.sec >= 0) {
        expect(len(ev.sweep)).toBeCloseTo(1, 12);
        scatters++;
        if (ev.aftershock) aftershocks++;
      } else expect(ev.aftershock).toBe(false);
    }
    expect(scatters).toBeGreaterThan(500);
    expect(aftershocks / scatters).toBeGreaterThan(0.2);
    expect(aftershocks / scatters).toBeLessThan(0.8);
    const never = shellEvent(NODE_NEVER, 0.2, 33, BODY);
    expect(never.sec).toBe(-1);
    expect(scatterCount(NODE_NEVER, 0.2, 500)).toBe(0);
  });

  it('counts every scatter that has ended, from slot 0', () => {
    const phase = 0.12;
    let want = 0;
    for (let k = 0; k < 300; k++) {
      const mid = (k - phase) * NODE_DERP_PERIOD + NODE_DERP_PERIOD / 2;
      const ev = derpEvent(SEED, phase, mid);
      if (ev.t0 + NODE_DERP_DUR > 0) expect(scatterCount(SEED, phase, Math.max(0, ev.t0 - 1e-6))).toBe(want);
      if (ev.kind === DerpKind.Scatter) want++;
      expect(scatterCount(SEED, phase, ev.t0 + NODE_DERP_DUR + 1e-6)).toBe(want);
    }
    expect(want).toBeGreaterThan(50);
  });
});

describe('shell.glsl', () => {
  it('declares the shell constants birth.ts exports', () => {
    const lib = shellLibraryGlsl();
    for (const [name, value] of SHELL_CONSTANTS) {
      const m = new RegExp(`const float ${name} = ([-0-9.e]+);`).exec(lib);
      expect(m, name).not.toBeNull();
      expect(Number(m![1]), name).toBe(value);
    }
    for (const [name, a] of SHELL_ARRAYS) {
      const m = new RegExp(`const float ${name}\\[${a.length}\\] = float\\[${a.length}\\]\\(([^)]*)\\);`).exec(lib);
      expect(m, name).not.toBeNull();
      expect(m![1].split(', ').map(Number), name).toEqual([...a]);
    }
    for (const [name, value] of SHELL_UINT_CONSTANTS) expect(lib, name).toContain(`const uint ${name} = ${value}u;`);
    expect(lib).not.toMatch(/#include/);
    expect(lib).toMatch(/vec4 shellWarpK\(vec2 ll, vec4 hA, vec4 hB, float t, ShellEvent ev, float A, float gain, float cap\)/);
  });

  it('names every constant it uses from the spliced set, never a bare copy', () => {
    for (const m of shellGlsl.matchAll(/\b(?:EQ|SHELL|SCATTER|RING|AFTERSHOCK)_[A-Z_0-9]+\b/g)) {
      const known = SHELL_CONSTANTS.has(m[0]) || SHELL_ARRAYS.has(m[0]) || SHELL_UINT_CONSTANTS.has(m[0]);
      expect(known, m[0]).toBe(true);
    }
    expect(shellGlsl).not.toMatch(/const (float|uint) (EQ|SHELL|SCATTER|RING|AFTERSHOCK)_/);
    expect(shellGlsl).not.toMatch(/\b(0\.35|0\.22|0\.45|0\.04|0\.12|0\.06|0\.55|0\.25|0\.05|0\.9|0\.16|14\.0|30\.0|8u|3u)\b/);
  });

  it('takes sin and cos from moteSinCos, never the builtins, and the spin from orbitTurns', () => {
    expect(shellGlsl).not.toMatch(/(?<![A-Za-z_])(sin|cos|normalize|inversesqrt)\(/);
    expect(shellGlsl).toMatch(/orbitTurns\(/);
    expect(withShellLibrary('// #include mote.glsl + orbit.glsl + shell.glsl (spliced in by src/scene/node/shaderSource.ts)')).toMatch(
      /vec2 moteSinCos\(float x\)[\s\S]*float orbitTurns\(float t, float period\)[\s\S]*vec4 shellWarpK\(/,
    );
  });

  it('keeps its salt families apart', () => {
    // The spin and the shapes sit above every derp salt, for any shape index a reader reaches.
    expect(SHELL_SALT).toBeGreaterThan(DERP_FINE_SALT + 2 ** 20 * DERP_FINE_EVENT);
    expect(SHELL_SALT + SHELL_SHAPE_AT + 2 ** 20 * SHELL_SHAPE_STRIDE).toBeLessThan(2 ** 32);
    expect(SHELL_SHAPE_AT).toBeGreaterThanOrEqual(2);
    // An event's three hashes stay inside its slot's block ...
    const eventJ = [SHELL_EVENT_SWEEP_Z, SHELL_EVENT_SWEEP_AZ, SHELL_EVENT_AFTERSHOCK];
    expect(new Set(eventJ).size).toBe(3);
    for (const j of eventJ) expect(j >= 0 && j < SHELL_EVENT_STRIDE).toBe(true);
    // ... and never land on the slot's own schedule hashes, derpEvent's offset (2k) and kind (2k + 1):
    // slot 0's block starts at salts 0 and 1, so j starts above them.
    const own: string[] = [];
    for (let k = 0; k < 4096; k++) for (const j of eventJ) if ([2 * k, 2 * k + 1].includes(k * SHELL_EVENT_STRIDE + j)) own.push(`slot ${k}, j ${j}`);
    expect(own).toEqual([]);
    expect(Math.min(...eventJ)).toBeGreaterThanOrEqual(2);
  });
});

describe('shellWarpLeak (re-skin Task 8b)', () => {
  it('is shellWarp and the leak after it: the leak at the gain, its light mixed by it; no wound, shellWarp', () => {
    const wounds = leakWounds(SEED, 0.37, BODY, 9);
    const ev = scatterAt(0.9);
    let moved = 0;
    HERO.forEach((ll, i) => {
      if (i % 7 !== 0) return;
      const h = moteHashes(BODY, i);
      for (const t of [wounds[0].open + 0.7, wounds[1].open + 1.1])
        for (const gain of [1, 0.4, 0]) {
          const base = shellWarp(ll, h, t, ev, EQ_A, gain, PLANET_CAP);
          const l = leakOffset(llUnit(ll), i, t, wounds);
          const got = shellWarpLeak(ll, h, i, t, ev, EQ_A, gain, PLANET_CAP, wounds);
          const want = gain > 0 ? [0, 1, 2].map((k) => base[k] + gain * l.off[k]) : base;
          for (let k = 0; k < 3; k++) expect(got.p[k]).toBeCloseTo(want[k], 12);
          expect(got.light).toBeCloseTo(gain > 0 ? 1 - (1 - l.gain) * gain : 1, 12);
          if (gain === 1 && l.gain < 1) moved++;
          expect(shellWarpLeak(ll, h, i, t, ev, EQ_A, gain, PLANET_CAP, [])).toEqual({ p: base, light: 1 });
        }
    });
    expect(moved).toBeGreaterThan(20);
  });
});

describe('the forced scatter on the shell (re-skin Task 8b)', () => {
  it('lands each forced scatter on a new shape and keeps it; unforced, the count is the schedule\u2019s', () => {
    const phase = 0.37;
    let prev = -1;
    for (let i = 0; i < 3000; i++) {
      const t = 0.05 + i * 0.113;
      const ev = derpEvent(SEED, phase, t, true);
      const n = scatterCount(SEED, phase, t, true);
      expect(n).toBe(Math.max(0, ev.k) + (ev.s >= 1 ? 1 : 0));
      expect(n).toBeGreaterThanOrEqual(prev);
      prev = n;
      const forced = shellEvent(SEED, phase, t, BODY, true);
      expect(forced.n).toBe(n);
      expect(forced.sec).toBe(ev.active ? ev.s * 1 : -1);
      expect(shellEvent(SEED, phase, t, BODY, false)).toEqual(shellEvent(SEED, phase, t, BODY));
    }
  });
});
