import { describe, expect, it } from 'vitest';
import { MOTE_BUDGET_DESKTOP, MOTE_SEED } from '../../config';
import type { BodyKind } from '../../galaxy/body';
import { generateGalaxy, galaxyBudget, type Body } from '../../galaxy/generate';
import { hash01 } from '../../math/hash';
import { Fails } from '../../testing/fails';
import {
  BURST_GHOST_P,
  BURST_JITTER,
  BURST_JITTER_HZ,
  BURST_JUMP_P,
  BURST_QUANT_P,
  BURST_QUANT_STEP,
  BURST_SLOTS,
  BURST_SNAP,
  BURST_SNAP_HOLD,
  BURST_TREMBLE,
  BURST_TREMBLE_HZ,
  BURST_TREMBLE_PARTS,
  DERP_CONSTANTS,
  DERP_CUMULATIVE,
  DERP_FINE_EVENT,
  DERP_FINE_JITTER,
  DERP_FINE_JITTER_AT,
  DERP_FINE_LATTICE,
  DERP_FINE_SALT,
  DERP_STAR_SHIVER,
  DERP_UINT_CONSTANTS,
  DERP_WOBBLE,
  DERP_WOBBLE_RATE,
  DERP_WOBBLE_Y,
  NODE_DERP_DUR,
  NODE_DERP_PERIOD,
  NODE_NEVER,
} from './birth';
import { derp, derpEvent, DerpKind, DERP_WEIGHTS, ZERO_DERP, type Derp } from './derp';
import { derpLibraryGlsl, withDerpLibrary } from './shaderSource';
import derpGlsl from './derp.glsl?raw';

const T = NODE_DERP_PERIOD;
const D = NODE_DERP_DUR;
const grid = (from: number, to: number, n: number): number[] => Array.from({ length: n }, (_, i) => from + ((to - from) * i) / n);

const g = generateGalaxy(MOTE_SEED, 'desktop', galaxyBudget(MOTE_BUDGET_DESKTOP));
const byId = (id: string): Body => g.bodies[g.ids[id]];
const C1 = byId('C1');
const P1 = byId('P1');
const R0 = byId('R0');
const c1Moons = g.bodies.filter((b) => b.kind === 'moon' && b.host === C1.index);
const SEED = R0.derpSeed;

/** A body's derp at ambient t, from its own seed, phase and sizes (r: its track's semi-major axis; ω: its mean motion). */
const derpOf = (b: Body, t: number, v = 1): Derp =>
  derp(b.derpSeed, b.derpPhase, t, b.kind, b.orbit?.a ?? 0, b.R, b.orbit ? (2 * Math.PI) / b.orbit.period : 0, v);

/** Event k of a schedule: its start, kind and the ambient time at its own time s. */
function eventK(seed: number, phase: number, k: number): { t0: number; kind: DerpKind; at: (s: number) => number } {
  const ev = derpEvent(seed, phase, (k - phase) * T + T / 2);
  expect(ev.k).toBe(k);
  return { t0: ev.t0, kind: ev.kind, at: (s) => ev.t0 + s * D };
}

/** The first `n` events of `kind` in a schedule, from k = 0. */
function eventsOfKind(seed: number, phase: number, kind: DerpKind, n: number) {
  const out: ReturnType<typeof eventK>[] = [];
  for (let k = 0; out.length < n; k++) {
    const e = eventK(seed, phase, k);
    if (e.kind === kind) out.push(e);
  }
  return out;
}

/** Synthetic derping bodies: R0's seed with phases spread over [0, 1). */
const PHASES = grid(0, 1, 40);

describe('the schedule', () => {
  it('ZERO_DERP is frozen through', () => {
    expect(Object.isFrozen(ZERO_DERP)).toBe(true);
    expect(Object.isFrozen(ZERO_DERP.wobble)).toBe(true);
    expect(() => {
      (ZERO_DERP.wobble as unknown as number[])[0] = 1;
    }).toThrow();
    expect(ZERO_DERP.wobble).toEqual([0, 0, 0]);
  });

  it('a healthy body never derps', () => {
    for (const t of grid(0, 1200, 5000)) expect(derp(NODE_NEVER, 0.3, t, 'planet', 5, 0.3, 0.1, 1)).toEqual(ZERO_DERP);
    for (const t of grid(0, 1200, 500)) expect(derpEvent(NODE_NEVER, 0.3, t).active).toBe(false);
    // Every healthy body of the galaxy carries NODE_NEVER.
    for (const b of g.bodies.filter((x) => !x.cracked)) expect(b.derpSeed).toBe(NODE_NEVER);
  });

  it('the fix silences every term', () => {
    const kinds: BodyKind[] = ['core', 'star', 'planet', 'moon'];
    for (const phase of PHASES.slice(0, 8))
      for (const kind of kinds) for (const t of grid(0, 60, 2000)) expect(derp(SEED, phase, t, kind, 4, 0.3, 0.7, 0)).toEqual(ZERO_DERP);
    for (const b of [C1, ...c1Moons, P1, R0]) for (const t of grid(0, 60, 2000)) expect(derpOf(b, t, 0)).toEqual(ZERO_DERP);
  });

  it('k, t0 and s are the brief formulas', () => {
    for (const phase of PHASES.slice(0, 10))
      for (const t of grid(0, 300, 997)) {
        const ev = derpEvent(SEED, phase, t);
        const k = Math.floor(t / T + phase);
        expect(ev.k).toBe(k);
        expect(ev.t0).toBeCloseTo((k - phase) * T + hash01(SEED, 2 * k) * (T - D), 9);
        expect(ev.s).toBeCloseTo((t - ev.t0) / D, 9);
        expect(ev.active).toBe(ev.s >= 0 && ev.s < 1);
      }
  });

  it('the duty is 45 % and no gap exceeds 2.4 s', () => {
    const slots = 10_000;
    for (const phase of [0, 0.37, 0.81]) {
      // Sampled: the share of time an event runs.
      const n = 200_000;
      let active = 0;
      for (let i = 0; i < n; i++) if (derpEvent(SEED, phase, ((i + 0.5) * slots * T) / n).active) active++;
      expect(active / n).toBeGreaterThanOrEqual(0.42);
      expect(active / n).toBeLessThanOrEqual(0.48);
      // From the starts: one event a slot, each D long, never overlapping, the gaps ≤ 2.4 s.
      let maxGap = 0;
      let prev = eventK(SEED, phase, 0);
      for (let k = 1; k < slots; k++) {
        const e = eventK(SEED, phase, k);
        const gap = e.t0 - (prev.t0 + D);
        expect(gap).toBeGreaterThanOrEqual(0);
        maxGap = Math.max(maxGap, gap);
        prev = e;
      }
      expect(maxGap).toBeLessThanOrEqual(2.4);
      expect(maxGap).toBeGreaterThan(2.3);
    }
  });

  it('kinds come by weight', () => {
    const counts = new Array<number>(6).fill(0);
    const n = 10_000;
    for (let k = 0; k < n; k++) counts[derpEvent(SEED, 0, k * T + T / 2).kind]++;
    counts.forEach((c, i) => expect(Math.abs(c / n - DERP_WEIGHTS[i]), DerpKind[i]).toBeLessThanOrEqual(0.02));
    expect(DERP_WEIGHTS.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    // The thresholds are the float32 running sums, the last 1.
    expect(DERP_CUMULATIVE.map((c) => Math.fround(c))).toEqual(DERP_CUMULATIVE);
    expect(DERP_CUMULATIVE[5]).toBe(1);
    DERP_CUMULATIVE.slice(0, 5).forEach((c, i) =>
      expect(c).toBeCloseTo(
        DERP_WEIGHTS.slice(0, i + 1).reduce((a, b) => a + b, 0),
        7,
      ),
    );
  });

  it("inherits the source's order", () => {
    const heirs = [C1, ...c1Moons, P1, R0];
    expect(c1Moons).toHaveLength(6);
    for (const b of heirs) expect(b.cracked, b.id).toBe(true);
    for (const b of heirs) expect(b.derpSeed, b.id).toBe(SEED);
    expect(new Set(heirs.map((b) => b.derpPhase)).size).toBe(heirs.length);
    const order = (b: Body) => Array.from({ length: 51 }, (_, k) => eventK(b.derpSeed, b.derpPhase, k).kind);
    const source = order(R0);
    for (const b of heirs) expect(order(b), b.id).toEqual(source);
    // Not one kind over and over: the order has every kind in it.
    expect(new Set(source).size).toBe(6);
  });
});

describe('the kinds', () => {
  const r = 5;
  const R = 0.3;
  const omega = 0.9;
  const at = (kind: BodyKind, t: number, v = 1): Derp => derp(SEED, 0.37, t, kind, r, R, omega, v);
  const events = (kind: DerpKind, n: number) => eventsOfKind(SEED, 0.37, kind, n);

  it('each kind reaches its extremum and no further', () => {
    // Measured: 1.1 s on CI, 1.2 s alone, 5.0 s locally at load 12-22 beside the full suite (it ran out of
    // the default 5 s under load). 30 s is 6 times the loaded time.
    // Skip: out to 0.55 r and up 0.2 r at s 0.6, never further; it rings home, never past a quarter.
    for (const e of events(DerpKind.Skip, 5)) {
      const peak = at('planet', e.at(0.6));
      expect(peak.dR).toBeCloseTo(0.55 * r, 9);
      expect(peak.lift).toBeCloseTo(0.2 * r, 9);
      // Each sample tested plainly and the failures held to none once (Fails): an expect per sample
      // was half of this test (2.4 s on CI, past 5 s under load).
      const fails = new Fails();
      for (const s of grid(0, 1, 2000)) {
        const d = at('planet', e.at(s));
        if (!(d.dR <= 0.55 * r + 1e-12 && d.dR >= -0.25 * 0.55 * r)) fails.add(`s ${s}: dR ${d.dR}`);
        if (!(d.lift <= 0.2 * r + 1e-12 && d.lift >= -0.25 * 0.2 * r)) fails.add(`s ${s}: lift ${d.lift}`);
        if (![d.dNu, d.ghost, d.orbitT].every((x) => Object.is(x, 0))) fails.add(`s ${s}: dNu, ghost, orbitT ${[d.dNu, d.ghost, d.orbitT]}`);
      }
      expect(fails.count, String(fails)).toBe(0);
      expect(Math.abs(at('planet', e.at(0.72)).dR)).toBeLessThan(1e-9);
    }
    // Burst: the snap within ±0.225 rad, the jump within ±0.45 r, the lift within ±0.15 r, and each reached.
    let maxNu = 0;
    let maxR = 0;
    let maxLift = 0;
    for (const e of events(DerpKind.Burst, 200))
      for (let slot = 0; slot < BURST_SLOTS; slot++) {
        const d = at('planet', e.at((slot + 0.3) / BURST_SLOTS));
        maxNu = Math.max(maxNu, Math.abs(d.dNu));
        maxR = Math.max(maxR, Math.abs(d.dR));
        maxLift = Math.max(maxLift, Math.abs(d.lift));
      }
    expect(maxNu).toBeLessThanOrEqual(0.225);
    expect(maxR).toBeLessThanOrEqual(0.45 * r);
    expect(maxLift).toBeLessThanOrEqual(0.15 * r);
    expect(maxNu).toBeGreaterThan(0.95 * 0.225);
    expect(maxR).toBeGreaterThan(0.95 * 0.45 * r);
    expect(maxLift).toBeGreaterThan(0.95 * 0.15 * r);
    // Reverse: back by 0.5 rad at s 0.5, and no further.
    for (const e of events(DerpKind.Reverse, 5)) {
      expect(at('moon', e.at(0.5)).dNu).toBeCloseTo(-0.5, 9);
      for (const s of grid(0, 1, 500)) expect(at('moon', e.at(s)).dNu).toBeGreaterThanOrEqual(-0.5);
    }
    // Stall: the body stands still (its angle held back by ω × time) until s 0.7, then catches up by s 1.
    for (const e of events(DerpKind.Stall, 5)) {
      for (const s of [0.1, 0.4, 0.69]) expect(at('planet', e.at(s)).dNu).toBeCloseTo(-omega * D * s, 9);
      expect(at('planet', e.at(0.85)).dNu).toBeGreaterThan(-omega * D * 0.7);
      expect(Math.abs(at('planet', e.at(0.99999)).dNu)).toBeLessThan(1e-6);
      for (const s of grid(0, 1, 2000)) expect(at('planet', e.at(s)).dNu).toBeGreaterThanOrEqual(-0.7 * omega * D - 1e-12);
    }
    // Wobble: up to 0.06 R on x and z, half that on y; a star's (and the core's) is four times a planet's.
    let maxW = 0;
    for (const e of events(DerpKind.Wobble, 60))
      for (const s of grid(0, 1, 300)) {
        const p = at('planet', e.at(s));
        const star = at('star', e.at(s));
        const core = at('core', e.at(s));
        for (let i = 0; i < 3; i++) {
          expect(star.wobble[i]).toBeCloseTo(DERP_STAR_SHIVER * p.wobble[i], 12);
          expect(core.wobble[i]).toBeCloseTo(DERP_STAR_SHIVER * p.wobble[i], 12);
        }
        expect(Math.abs(p.wobble[0])).toBeLessThanOrEqual(DERP_WOBBLE * R);
        expect(Math.abs(p.wobble[2])).toBeLessThanOrEqual(DERP_WOBBLE * R);
        expect(Math.abs(p.wobble[1])).toBeLessThanOrEqual(0.5 * DERP_WOBBLE * R);
        maxW = Math.max(maxW, Math.abs(star.wobble[0]), Math.abs(star.wobble[2]));
      }
    expect(DERP_STAR_SHIVER * DERP_WOBBLE).toBeCloseTo(4 * 0.06, 12);
    expect(maxW).toBeLessThanOrEqual(4 * 0.06 * R);
    expect(maxW).toBeGreaterThan(0.9 * 4 * 0.06 * R);
  }, 30_000);

  it('a star and the core only shiver, except for the scatter', () => {
    for (const kind of [DerpKind.Burst, DerpKind.Skip, DerpKind.Stall, DerpKind.Reverse, DerpKind.Wobble])
      for (const e of events(kind, 3))
        for (const s of grid(0, 1, 50))
          for (const body of ['star', 'core'] as const) {
            const d = at(body, e.at(s));
            expect([d.dNu, d.dR, d.lift, d.orbitT, d.ghost, d.ghostNu, d.scatterS], `${DerpKind[kind]} ${body}`).toEqual([
              0, 0, 0, 0, 0, 0, -1,
            ]);
          }
  });

  it('the scatter hands the shell its own clock, and moves nothing', () => {
    for (const e of events(DerpKind.Scatter, 4))
      for (const s of grid(0.005, 1, 100))
        for (const body of ['core', 'star', 'planet', 'moon'] as const) {
          const d = at(body, e.at(s));
          expect(d.scatterS).toBeCloseTo(s * D, 9);
          expect({ ...d, scatterS: -1 }).toEqual(ZERO_DERP);
        }
    // Outside a scatter there is no scatter clock.
    for (const e of events(DerpKind.Burst, 4)) expect(at('planet', e.at(0.5)).scatterS).toBe(-1);
  });

  it('v scales every term', () => {
    for (const kind of [DerpKind.Burst, DerpKind.Skip, DerpKind.Stall, DerpKind.Reverse, DerpKind.Wobble])
      for (const e of events(kind, 3))
        for (const s of grid(0, 1, 40))
          for (const body of ['star', 'planet'] as const) {
            const full = at(body, e.at(s), 1);
            const part = at(body, e.at(s), 0.37);
            for (const f of ['dNu', 'dR', 'lift', 'orbitT', 'ghost', 'ghostNu'] as const) expect(part[f]).toBeCloseTo(0.37 * full[f], 12);
            for (let i = 0; i < 3; i++) expect(part.wobble[i]).toBeCloseTo(0.37 * full.wobble[i], 12);
            expect(part.scatterS).toBe(full.scatterS);
          }
    // A scatter's clock is a time, not an amplitude: the same at any v above 0.
    let scatters = 0;
    for (const e of events(DerpKind.Scatter, 3))
      for (const s of grid(0.005, 1, 40))
        for (const body of ['star', 'planet'] as const) {
          const full = at(body, e.at(s), 1);
          const part = at(body, e.at(s), 0.37);
          expect(full.scatterS).not.toBe(-1);
          expect(part.scatterS).toBe(full.scatterS);
          scatters++;
        }
    expect(scatters).toBeGreaterThan(0);
  });
});

describe('the burst', () => {
  const r = 5;
  const R = 0.3;
  const at = (t: number): Derp => derp(SEED, 0.37, t, 'moon', r, R, 1.0, 1);
  const bursts = eventsOfKind(SEED, 0.37, DerpKind.Burst, 40);
  /** Slot `slot` of event `e`'s hashes, as the brief salts them: hash01(seed, k·64 + slot·8 + j). */
  const hs = (e: ReturnType<typeof eventK>, slot: number) => {
    const k = derpEvent(SEED, 0.37, e.at(0.5)).k;
    return Array.from({ length: 8 }, (_, j) => hash01(SEED, k * 64 + slot * 8 + j));
  };
  /** Every millisecond of slot `slot`, half a millisecond off its edges. */
  const msOf = (e: ReturnType<typeof eventK>, slot: number) =>
    Array.from({ length: Math.round((1000 * D) / BURST_SLOTS) }, (_, i) => e.at((slot * D) / BURST_SLOTS / D + (i + 0.5) / 1000 / D));

  it('the burst cuts, it does not tween', () => {
    let quantised = 0;
    let jitterTicks = 0;
    for (const e of bursts.slice(0, 12))
      for (let slot = 0; slot < BURST_SLOTS; slot++) {
        const h = hs(e, slot);
        const snap = (h[0] - 0.5) * BURST_SNAP;
        const ms = msOf(e, slot);
        const ds = ms.map(at);
        // The snap: exactly two values in a slot, the snap for its first 60 %, then 0.
        expect(new Set(ds.map((d) => d.dNu))).toEqual(new Set([snap, 0]));
        ds.forEach((d, i) => expect(d.dNu).toBe((i + 0.5) / ds.length < BURST_SNAP_HOLD ? snap : 0));
        // The jump and the lift are square pulses with it.
        expect(new Set(ds.map((d) => d.dR)).size).toBeLessThanOrEqual(2);
        expect(new Set(ds.map((d) => d.lift)).size).toBeLessThanOrEqual(2);
        if (h[1] >= Math.fround(BURST_JUMP_P)) for (const d of ds) expect(d.dR).toBe(0);
        // The ghost holds with the snap, in a slot that draws one.
        ds.forEach((d, i) => expect(d.ghost).toBe(h[6] < Math.fround(BURST_GHOST_P) && (i + 0.5) / ds.length < BURST_SNAP_HOLD ? 1 : 0));
        // The quantised clock: the body's own time stands on multiples of 0.1 s through the whole slot.
        if (h[7] < Math.fround(BURST_QUANT_P)) {
          quantised++;
          ms.forEach((t, i) => {
            const steps = (t + ds[i].orbitT) / BURST_QUANT_STEP;
            expect(Math.abs(steps - Math.round(steps))).toBeLessThan(1e-9);
            expect(ds[i].orbitT).toBeLessThanOrEqual(0);
            expect(ds[i].orbitT).toBeGreaterThan(-BURST_QUANT_STEP);
          });
        } else for (const d of ds) expect(d.orbitT).toBe(0);
        // The jitter: outside the burst's middle third the wobble is the jitter alone, which changes
        // only where a multiple of 1/30 s of the event's time falls between two samples.
        if (slot < BURST_SLOTS / 3 - 1 || slot > (2 * BURST_SLOTS) / 3) {
          for (let i = 1; i < ms.length; i++) {
            const a = (ms[i - 1] - e.t0) * BURST_JITTER_HZ;
            const b = (ms[i] - e.t0) * BURST_JITTER_HZ;
            const changed = ds[i].wobble.some((w, j) => w !== ds[i - 1].wobble[j]);
            if (changed) jitterTicks++;
            expect(changed, `slot ${slot} sample ${i}`).toBe(Math.floor(a) !== Math.floor(b));
          }
          for (const d of ds) {
            expect(d.wobble[1]).toBe(0);
            expect(Math.abs(d.wobble[0])).toBeLessThanOrEqual(BURST_JITTER * r);
            expect(Math.abs(d.wobble[2])).toBeLessThanOrEqual(BURST_JITTER * r);
          }
        }
      }
    expect(quantised).toBeGreaterThan(0);
    expect(jitterTicks).toBeGreaterThan(0);
  });

  it('the tremble is the middle third, at 40 Hz and 0.05 R', () => {
    let peak = 0;
    for (const e of bursts) {
      for (const s of grid(0, 1, 400)) {
        const d = at(e.at(s));
        const jitterFree = d.wobble[1];
        if (s < 1 / 3 || s >= 2 / 3) expect(jitterFree).toBe(0);
        expect(Math.abs(jitterFree)).toBeLessThanOrEqual(0.5 * BURST_TREMBLE * R);
        peak = Math.max(peak, Math.abs(jitterFree));
      }
      // The envelope: sin(π · third) over the middle third, times the event's own value noise on y.
      const k = derpEvent(SEED, 0.37, e.at(0.5)).k;
      const lat = (i: number) => 2 * hash01(SEED, DERP_FINE_SALT + k * DERP_FINE_EVENT + i * DERP_FINE_LATTICE + 1) - 1;
      for (const s of grid(0.34, 0.66, 64)) {
        const x = BURST_TREMBLE_HZ * s * D;
        const i = Math.floor(x);
        const u = (x - i) * (x - i) * (3 - 2 * (x - i));
        const ny = lat(i) + (lat(i + 1) - lat(i)) * u;
        const want = DERP_WOBBLE_Y * BURST_TREMBLE * R * Math.sin(Math.PI * (s * BURST_TREMBLE_PARTS - 1)) * ny;
        expect(at(e.at(s)).wobble[1]).toBeCloseTo(want, 12);
      }
      // 40 Hz: the noise's lattice is 1/40 s apart, so it is not still over a 1/40 s window mid-burst.
      const a = at(e.at(0.5)).wobble[1];
      const b = at(e.at(0.5 + 1 / BURST_TREMBLE_HZ / D)).wobble[1];
      expect(a).not.toBe(b);
    }
    expect(peak).toBeGreaterThan(0.5 * 0.5 * BURST_TREMBLE * R);
  });

  it('ghost is 0 outside a burst', () => {
    // Each sample tested plainly and the failures held to none once (Fails): an expect per sample was
    // four tenths of this test (2.1 s on CI, past 5 s under load).
    const fails = new Fails();
    for (const phase of PHASES.slice(0, 6))
      for (const t of grid(0, 200, 20_000)) {
        const ev = derpEvent(SEED, phase, t);
        const d = derp(SEED, phase, t, 'moon', r, R, 1, 1);
        if ((!ev.active || ev.kind !== DerpKind.Burst) && !(Object.is(d.ghost, 0) && Object.is(d.ghostNu, 0)))
          fails.add(`phase ${phase} at ${t}: ghost ${d.ghost}, ghostNu ${d.ghostNu}`);
      }
    expect(fails.count, String(fails)).toBe(0);
  });

  it('the ghost sits along the orbit from the snapped body', () => {
    let seen = 0;
    for (const e of bursts)
      for (let slot = 0; slot < BURST_SLOTS; slot++) {
        const h = hs(e, slot);
        const d = at(e.at((slot + 0.3) / BURST_SLOTS));
        if (d.ghost === 0) continue;
        seen++;
        expect(d.ghostNu).toBeCloseTo(d.dNu + (h[5] - 0.5) * 0.6, 12);
      }
    expect(seen).toBeGreaterThan(0);
  });
});

describe('derp.glsl', () => {
  it('declares the derp constants birth.ts exports', () => {
    const lib = derpLibraryGlsl();
    for (const [name, value] of DERP_CONSTANTS) {
      const m = new RegExp(`const float ${name} = ([-0-9.e]+);`).exec(lib);
      expect(m, name).not.toBeNull();
      expect(Number(m![1]), name).toBe(value);
    }
    for (const [name, value] of DERP_UINT_CONSTANTS) expect(lib, name).toContain(`const uint ${name} = ${value}u;`);
    expect(lib).toMatch(/const float DERP_NEVER = 2\.0;/);
    const cum = /const float DERP_CUMULATIVE\[6\] = float\[6\]\(([^)]*)\);/.exec(lib);
    expect(cum).not.toBeNull();
    expect(cum![1].split(', ').map(Number)).toEqual([...DERP_CUMULATIVE]);
    for (const [name, v] of Object.entries(DerpKind).filter(([, x]) => typeof x === 'number'))
      expect(lib).toContain(`const int DERP_KIND_${name.toUpperCase()} = ${v};`);
    expect(lib).not.toMatch(/#include/);
    expect(lib).toMatch(/Derp derp\(float seed, float phase, float t, int kind, float r, float R, float omega, float v\)/);
    expect(lib.match(/struct Derp\b/g)).toHaveLength(1);
  });

  it('names every constant it uses from the spliced set, never a bare copy', () => {
    for (const m of derpGlsl.matchAll(/\b(?:NODE_DERP|DERP|BURST)_[A-Z_]+\b/g)) {
      const known = DERP_CONSTANTS.has(m[0]) || DERP_UINT_CONSTANTS.has(m[0]) || /^DERP_(KIND_|BODY_|NEVER$|CUMULATIVE$)/.test(m[0]);
      expect(known, m[0]).toBe(true);
    }
    expect(derpGlsl).not.toMatch(/const float (NODE_DERP|DERP|BURST)_[A-Z_]+ =/);
    expect(derpGlsl).not.toMatch(/\b(2\.2|0\.55|0\.45|0\.06)\b/);
    expect(derpGlsl).not.toMatch(/NODE_NEVER/);
    // The salt layout and the shape factors are spliced too: no bare stride, no bare half or third.
    expect(derpGlsl).not.toMatch(/\b(256u|128u)|\* [23]u\b|amp \* 0\.5|s \* 3\.0/);
    expect(derpGlsl).not.toMatch(/const uint DERP_/);
  });

  it('takes sin and cos from moteSinCos, never the builtins, and orbitTurns from orbit.glsl', () => {
    expect(derpGlsl).not.toMatch(/(?<![A-Za-z_])(sin|cos)\(/);
    expect(derpGlsl).toMatch(/orbitTurns\(/);
    expect(withDerpLibrary('// #include mote.glsl + orbit.glsl + derp.glsl (spliced in by src/scene/node/shaderSource.ts)')).toMatch(
      /vec2 moteSinCos\(float x\)[\s\S]*float orbitTurns\(float t, float period\)[\s\S]*Derp derp\(/,
    );
  });

  it('keeps its salt families apart', () => {
    // The schedule's 2k + 1 and the burst's k·64 + 63 stay far below the fine salts at any ambient
    // a reader reaches (k below 2^20 is 26 days).
    const kMax = 2 ** 20;
    expect(kMax * 64 + 63).toBeLessThan(DERP_FINE_SALT);
    expect(DERP_FINE_SALT + kMax * DERP_FINE_EVENT + DERP_FINE_EVENT - 1).toBeLessThan(2 ** 32);
    // An event's lattice (wobble i ≤ 9, tremble i ≤ 27, three axes) sits below its jitter, and its
    // jitter ticks (two axes) inside its block.
    expect(DERP_FINE_LATTICE).toBeGreaterThanOrEqual(3);
    expect(DERP_FINE_JITTER).toBeGreaterThanOrEqual(2);
    const latticeTop = (x: number) => Math.ceil(x) * DERP_FINE_LATTICE + 2;
    expect(latticeTop(DERP_WOBBLE_RATE)).toBeLessThan(DERP_FINE_JITTER_AT);
    expect(latticeTop((BURST_TREMBLE_HZ * D * 2) / BURST_TREMBLE_PARTS)).toBeLessThan(DERP_FINE_JITTER_AT);
    expect(DERP_FINE_JITTER_AT + Math.ceil(BURST_JITTER_HZ * D) * DERP_FINE_JITTER + 1).toBeLessThan(DERP_FINE_EVENT);
  });
});
