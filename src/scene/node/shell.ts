// Reference implementation of a body's shell (docs/specs/2026-10-07-morph-and-scatter.md §7 the
// lattice and the equation, §2.2 the scatter): the motes sit on a lat/long lattice that turns about a
// seeded axis; a cracked shell's radius follows a product-of-sines equation that drifts on the
// ambient clock, and on a scatter derp its motes leap off in a sweep, hold, and come home in three
// cuts onto the next shape. The GLSL in shell.glsl mirrors morphR, scatterK, shellWarp, spinAxis and
// spinShell step for step; the parity page (`?lib=shell`) compares them. Only operations GLSL has are
// used, and both mirrors read the constants of birth.ts (spliced into the GLSL). Nothing is
// integrated: a mote's place is a pure function of (its lattice point, its hashes, the ambient, the
// event).
//
// What is TS only, and why: the lattice (latticeLL, the `aLL` attribute's values), a mote's hashes
// (moteHashes, attribute values), the shapes (shapeAt) and the scatter count (scatterCount), which
// walks the derp schedule from slot 0: per body and frame, handed to the shader as uniforms, never
// per mote. shellEvent gathers what shellWarp needs of a body's schedule at an ambient.
//
// Units: a shell is drawn at unit radius and scaled by its body's R; `sec` is seconds into a scatter
// (derp()'s `scatterS`), −1 when none runs. The lattice's frame is the body's before its spin:
// shellWarp places a mote there, spinShell turns the result.
import type { Vec3 } from '../../math/vec';
import { latticeRowCols } from '../../galaxy/body';
import { hash01, pcg } from '../../math/hash';
import {
  AFTERSHOCK_AMP,
  AFTERSHOCK_AT,
  AFTERSHOCK_P,
  EQ_P,
  EQ_P2_STEP,
  EQ_Q2_MIN,
  EQ_Q2_STEP,
  EQ_Q_STEP,
  EQ_SECOND,
  EQ_W,
  NODE_DERP_DUR,
  NODE_DERP_PERIOD,
  NODE_NEVER,
  RING_AMP,
  RING_HZ,
  RING_TAU,
  SCATTER_AMP,
  SCATTER_FUZZ,
  SCATTER_HOLD,
  SCATTER_INWARD,
  SCATTER_JITTER_AXIS,
  SCATTER_JITTER_HZ,
  SCATTER_NORMAL,
  SCATTER_RETURN,
  SCATTER_STEP,
  SCATTER_SWEEP,
  SHELL_EVENT_AFTERSHOCK,
  SHELL_EVENT_STRIDE,
  SHELL_EVENT_SWEEP_AZ,
  SHELL_EVENT_SWEEP_Z,
  SHELL_JITTER_STRIDE,
  SHELL_MOTE_STRIDE,
  SHELL_SALT,
  SHELL_SHAPE_AT,
  SHELL_SHAPE_STRIDE,
  SHELL_SPIN_PERIOD,
  SHELL_SPIN_TILT,
} from './birth';
import { derpEvent, DerpKind } from './derp';
import { orbitTurns } from './orbit';

const PI = Math.PI;
const TAU = 2 * PI;
const DEG = PI / 180;

/** One shape of the equation (morph §7.2): its lobes round a parallel and pole to pole, twice, and four phases (rad). */
export interface Shape {
  p: number;
  q: number;
  p2: number;
  q2: number;
  phi: [number, number, number, number];
}

/** An integer in [lo, hi] from a hash in [0, 1). */
const pick = (h: number, lo: number, hi: number): number => lo + Math.min(hi - lo, Math.floor(h * (hi - lo + 1)));

/**
 * Shape `n` of a body (its n-th scatter lands it): `p` one of EQ_P, `q = p / 2 + {−1, 0, 1}`,
 * `p2 = p + 3..7`, `q2 = max(3, q − 1..3)`, and four phases, all hashed from (seed, n).
 */
export function shapeAt(seed: number, n: number): Shape {
  const h = (j: number) => hash01(seed, SHELL_SALT + SHELL_SHAPE_AT + n * SHELL_SHAPE_STRIDE + j);
  const p = EQ_P[pick(h(0), 0, EQ_P.length - 1)];
  const q = p / 2 + pick(h(1), EQ_Q_STEP[0], EQ_Q_STEP[1]);
  const p2 = p + pick(h(2), EQ_P2_STEP[0], EQ_P2_STEP[1]);
  const q2 = Math.max(EQ_Q2_MIN, q - pick(h(3), EQ_Q2_STEP[0], EQ_Q2_STEP[1]));
  return { p, q, p2, q2, phi: [TAU * h(4), TAU * h(5), TAU * h(6), TAU * h(7)] };
}

/** A shape as shell.glsl's ShellEvent takes it: (p, q, φ1, φ2) and (p2, q2, φ3, φ4). */
export function shapeUniforms(s: Shape): [[number, number, number, number], [number, number, number, number]] {
  return [
    [s.p, s.q, s.phi[0], s.phi[1]],
    [s.p2, s.q2, s.phi[2], s.phi[3]],
  ];
}

const rowStarts = new Map<string, { starts: number[]; cols: number[] }>();

/**
 * Mote `i` of a [rows, cols] lattice (galaxy/body.ts latticeRowCols): its row's latitude
 * `−π/2 + π (row + 0.5) / rows` and its longitude round the row, odd rows offset half a step.
 */
export function latticeLL(i: number, rows: number, cols: number): { lat: number; lon: number } {
  const key = `${rows}x${cols}`;
  let table = rowStarts.get(key);
  if (table === undefined) {
    const perRow = latticeRowCols(rows, cols);
    const starts: number[] = [];
    let at = 0;
    for (const n of perRow) {
      starts.push(at);
      at += n;
    }
    table = { starts, cols: perRow };
    rowStarts.set(key, table);
  }
  const { starts, cols: perRow } = table;
  if (!(i >= 0 && i < starts[rows - 1] + perRow[rows - 1])) throw new Error(`latticeLL: mote ${i} is not on a ${rows}x${cols} lattice`);
  let row = rows - 1;
  while (starts[row] > i) row--;
  const j = i - starts[row];
  return { lat: -PI / 2 + (PI * (row + 0.5)) / rows, lon: (TAU * (j + (row % 2 === 1 ? 0.5 : 0))) / perRow[row] };
}

/**
 * Mote `i`'s eight hashes, `hash01(seed, i · 8 + j)`: what shellWarp's `h` takes. Pass the body's own
 * `shellSeed(id)`, never the derp seed every cracked body shares, or every cracked body's motes would
 * leap alike (the same hold, amplitude, direction and jitter).
 */
export function moteHashes(seed: number, i: number): number[] {
  return Array.from({ length: SHELL_MOTE_STRIDE }, (_, j) => hash01(seed, i * SHELL_MOTE_STRIDE + j));
}

/** A lattice point on the unit sphere: y up, longitude from +x toward +z. */
export function llUnit(ll: { lat: number; lon: number }): Vec3 {
  const c = Math.cos(ll.lat);
  return [c * Math.cos(ll.lon), Math.sin(ll.lat), c * Math.sin(ll.lon)];
}

/**
 * The axis the lattice turns about: SHELL_SPIN_TILT[0]..[1] degrees off the vertical, at a hashed
 * azimuth. `seed` is the body's own (shellSeed), never the derp seed every cracked body shares.
 */
export function spinAxis(seed: number): Vec3 {
  const tilt = (SHELL_SPIN_TILT[0] + (SHELL_SPIN_TILT[1] - SHELL_SPIN_TILT[0]) * hash01(seed, SHELL_SALT)) * DEG;
  const az = TAU * hash01(seed, SHELL_SALT + 1);
  const s = Math.sin(tilt);
  return [s * Math.cos(az), Math.cos(tilt), s * Math.sin(az)];
}

/** `p` turned about the unit `axis` by the spin's angle at ambient `t`: one turn in SHELL_SPIN_PERIOD s. */
export function spinShell(p: Vec3, axis: Vec3, t: number): Vec3 {
  const a = TAU * orbitTurns(t, SHELL_SPIN_PERIOD);
  const c = Math.cos(a);
  const s = Math.sin(a);
  const d = (axis[0] * p[0] + axis[1] * p[1] + axis[2] * p[2]) * (1 - c);
  const x: Vec3 = [axis[1] * p[2] - axis[2] * p[1], axis[2] * p[0] - axis[0] * p[2], axis[0] * p[1] - axis[1] * p[0]];
  return [p[0] * c + x[0] * s + axis[0] * d, p[1] * c + x[1] * s + axis[1] * d, p[2] * c + x[2] * s + axis[2] * d];
}

/**
 * The equation's wave at a lattice point, ambient `t`: r = 1 + A × this, in [−(1 + EQ_SECOND), 1 + EQ_SECOND].
 * The bracket is enveloped by cos(lat) (= sin(lat')): the phases inside the sines would otherwise
 * leave it non-zero at the poles, and §7.2 wants the rows there clean.
 */
function morphTerm(lat: number, lon: number, t: number, s: Shape): number {
  const lat1 = lat + PI / 2;
  return (
    Math.cos(lat) *
    (Math.sin(s.p * lon + s.phi[0] + EQ_W[0] * t) * Math.sin(s.q * lat1 + s.phi[1] + EQ_W[1] * t) +
      EQ_SECOND * Math.sin(s.p2 * lon + s.phi[2] - EQ_W[2] * t) * Math.sin(s.q2 * lat1 + s.phi[3]))
  );
}

/**
 * The shell's radius at a lattice point (morph §7.2):
 * `1 + A cos(lat) [sin(p lon + φ1 + 0.35 t) sin(q lat' + φ2 − 0.22 t) + 0.45 sin(p2 lon + φ3 − 0.5 t) sin(q2 lat' + φ4)]`,
 * lat' = lat + π/2; the cos(lat) envelope makes the wave vanish at the poles.
 */
export function morphR(lat: number, lon: number, t: number, s: Shape, A: number): number {
  return 1 + A * morphTerm(lat, lon, t, s);
}

/** When a mote of sweep coordinate `su` leaves, in seconds into the scatter: the release crosses the body in 80 ms. */
const departure = (su: number): number => SCATTER_SWEEP * (su + 1);
/** How long it stays out: 120–180 ms. */
const hold = (h4: number): number => SCATTER_HOLD[0] + SCATTER_HOLD[1] * h4;

/**
 * How far out a mote is, `sec` seconds into a scatter: 0 before it leaves at `0.04 (su + 1)`; 1 for
 * `0.12 + 0.06 h4` s; then 0.55, 0.25 and 0, cut SCATTER_STEP apart. Every change is a cut.
 */
export function scatterK(sec: number, su: number, h4: number): number {
  const a = sec - departure(su);
  if (!(a >= 0)) return 0;
  const back = a - hold(h4);
  if (back < 0) return 1;
  const step = Math.floor(back / SCATTER_STEP);
  return step < SCATTER_RETURN.length ? SCATTER_RETURN[step] : 0;
}

/** When a mote is home again, in seconds into the scatter: the last cut, onto the next shape. */
export function landingSec(su: number, h4: number): number {
  return departure(su) + hold(h4) + (SCATTER_RETURN.length - 1) * SCATTER_STEP;
}

/** What shellWarp reads of a body's scatter at an ambient. */
export interface ShellEvent {
  /** Seconds into a scatter, −1 if none runs (derp()'s `scatterS`). */
  sec: number;
  /** The sweep's unit direction, in the lattice's frame. */
  sweep: Vec3;
  /** The body's scatters so far (scatterCount): a mote not yet landed draws `shape`, one landed `next`. */
  n: number;
  /** The event repeats its sweep at AFTERSHOCK_AT s, hold only. */
  aftershock: boolean;
  /** Shape n and shape n + 1 (shapeAt), as the shader takes them in uniforms. */
  shape: Shape;
  next: Shape;
}

/** Prefix counts of scatter slots per (seed, phase): `counts[k]` scatters among slots 0..k − 1. */
const scatterPrefix = new Map<string, number[]>();

/** The number of scatter slots among slots 0..k − 1 of a schedule (cached: the walk is from slot 0). */
function scattersBefore(seed: number, phase: number, k: number): number {
  const key = `${seed}/${phase}`;
  let counts = scatterPrefix.get(key);
  if (counts === undefined) {
    counts = [0];
    scatterPrefix.set(key, counts);
  }
  for (let j = counts.length - 1; j < k; j++) {
    const ev = derpEvent(seed, phase, (j - phase) * NODE_DERP_PERIOD + NODE_DERP_PERIOD / 2);
    counts.push(counts[j] + (ev.kind === DerpKind.Scatter ? 1 : 0));
  }
  return counts[Math.max(0, k)];
}

/**
 * The body's scatters so far at ambient `t`, its shape index n: every scatter event of its schedule
 * from slot 0 that has ended (s ≥ 1). During a scatter it is still the count before it; the event's
 * motes step to shape n + 1 as they land, and the count steps when the event ends.
 */
export function scatterCount(seed: number, phase: number, t: number): number {
  if (seed === NODE_NEVER) return 0;
  const ev = derpEvent(seed, phase, t);
  if (ev.k < 0) return 0;
  return scattersBefore(seed, phase, ev.k) + (ev.kind === DerpKind.Scatter && ev.s >= 1 ? 1 : 0);
}

/**
 * A body's own seed for its shell's shapes and spin axis, from its id (`'C1'`, `'C1-m5'`): the id's
 * UTF-16 code units folded through `pcg`, kept to 24 bits so it survives a float attribute. Every
 * cracked body shares R0's derp seed (so the whole piece stutters in step); the shapes and the axis
 * must not, or every cracked body would take the same lumps and turn about the same axis.
 */
export function shellSeed(id: string): number {
  let h = SHELL_SALT;
  for (let i = 0; i < id.length; i++) h = pcg((h ^ id.charCodeAt(i)) >>> 0);
  return h & 0xffffff;
}

/**
 * A body's scatter at ambient `t` (its derp seed and phase): how far into it, the event's sweep and
 * aftershock (`hash01(seed, k · 64 + j)`), and its shapes, hashed from the body's own `bodySeed`
 * (shellSeed). The body seed is required: the derp seed is shared by every cracked body.
 */
export function shellEvent(seed: number, phase: number, t: number, bodySeed: number): ShellEvent {
  const n = scatterCount(seed, phase, t);
  const ev = derpEvent(seed, phase, t);
  const on = ev.active && ev.kind === DerpKind.Scatter;
  const h = (j: number) => hash01(seed, ev.k * SHELL_EVENT_STRIDE + j);
  const z = 2 * h(SHELL_EVENT_SWEEP_Z) - 1;
  const az = TAU * h(SHELL_EVENT_SWEEP_AZ);
  const rho = Math.sqrt(Math.max(0, 1 - z * z));
  return {
    sec: on ? ev.s * NODE_DERP_DUR : -1,
    sweep: on ? [rho * Math.cos(az), z, rho * Math.sin(az)] : [0, 1, 0],
    n,
    aftershock: on && h(SHELL_EVENT_AFTERSHOCK) < Math.fround(AFTERSHOCK_P),
    shape: shapeAt(bodySeed, n),
    next: shapeAt(bodySeed, n + 1),
  };
}

/** The sweep coordinate of a lattice point: `u · sweep`. */
function sweepOf(u: Vec3, sweep: Vec3): number {
  return u[0] * sweep[0] + u[1] * sweep[1] + u[2] * sweep[2];
}

/** How far out mote `h` at `u` is in event `ev`: the scatter's k, plus the aftershock's hold at AFTERSHOCK_AMP. */
function kAt(su: number, h: readonly number[], ev: Pick<ShellEvent, 'sec' | 'aftershock'>): number {
  if (!(ev.sec >= 0)) return 0;
  const k = scatterK(ev.sec, su, h[4]);
  if (!ev.aftershock) return k;
  const a = ev.sec - AFTERSHOCK_AT - departure(su);
  return k + (a >= 0 && a < hold(h[4]) ? AFTERSHOCK_AMP : 0);
}

/** How far out a mote is in `ev` (0 home, 1 fully out): the brightness reads `1 + SCATTER_OUT_GAIN k`. */
export function shellK(ll: { lat: number; lon: number }, h: readonly number[], ev: Pick<ShellEvent, 'sec' | 'sweep' | 'aftershock'>): number {
  return kAt(sweepOf(llUnit(ll), ev.sweep), h, ev);
}

/**
 * A shell mote's place on the shell, in units of R and the lattice's frame, at ambient `t`: at its
 * lattice point `ll`, at the equation's radius (`A`: EQ_A on a cracked body, 0 on a healthy one) of
 * shape `ev.shape` until it lands in this scatter and `ev.next` after, and after landing the settle
 * ring on that radius, scaled by `gain`. It is shellWarp without the leap: where the mote would be if
 * it were home (the freeze's limb test masks the motes that are not).
 */
export function shellHome(ll: { lat: number; lon: number }, h: readonly number[], t: number, ev: ShellEvent, A: number, gain: number): Vec3 {
  const u = llUnit(ll);
  const land = landingSec(sweepOf(u, ev.sweep), h[4]);
  const landed = ev.sec >= 0 && ev.sec >= land;
  let r = 1 + A * morphTerm(ll.lat, ll.lon, t, landed ? ev.next : ev.shape);
  if (landed) {
    const a = ev.sec - land;
    r += gain * RING_AMP * Math.exp(-a / RING_TAU) * Math.cos(TAU * RING_HZ * a);
  }
  return [u[0] * r, u[1] * r, u[2] * r];
}

/**
 * A shell mote's place in units of R, in the lattice's frame (before spinShell), at ambient `t`: its
 * place on the shell (shellHome), and while out (k > 0) off it by k along its own leap: a hashed
 * direction, mostly along the normal (a share inward) with a tangential fuzz,
 * `SCATTER_AMP[0] + SCATTER_AMP[1] h5²` long and at most `cap`, plus the jitter, held for
 * 1 / SCATTER_JITTER_HZ s. `gain` scales the leap and the ring (the fix's v and the level of
 * detail); `A` the morph.
 */
export function shellWarp(
  ll: { lat: number; lon: number },
  h: readonly number[],
  t: number,
  ev: ShellEvent,
  A: number,
  gain: number,
  cap: number,
): Vec3 {
  const p = shellHome(ll, h, t, ev, A, gain);
  const u = llUnit(ll);
  const k = kAt(sweepOf(u, ev.sweep), h, ev);
  if (!(k > 0)) return p;
  const w = (h[6] < Math.fround(SCATTER_INWARD[0]) ? SCATTER_INWARD[1] : 1) * (SCATTER_NORMAL[0] + SCATTER_NORMAL[1] * h[0]);
  const d: Vec3 = [
    u[0] * w + SCATTER_FUZZ * (h[1] - 0.5),
    u[1] * w + SCATTER_FUZZ * (h[2] - 0.5),
    u[2] * w + SCATTER_FUZZ * (h[3] - 0.5),
  ];
  const len = Math.max(Math.sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]), 1e-6);
  const amp = Math.min(SCATTER_AMP[0] + SCATTER_AMP[1] * h[5] * h[5], cap) / len;
  const jseed = Math.round(h[7] * 16777216);
  const tick = Math.floor(ev.sec * SCATTER_JITTER_HZ);
  const jit = (c: number) => (2 * hash01(jseed, tick * SHELL_JITTER_STRIDE + c) - 1) * SCATTER_JITTER_AXIS;
  const out = gain * k;
  return [p[0] + out * (d[0] * amp + jit(0)), p[1] + out * (d[1] * amp + jit(1)), p[2] + out * (d[2] * amp + jit(2))];
}
