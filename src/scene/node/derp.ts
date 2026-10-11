// Reference implementation of the derps (docs/specs/2026-10-07-galaxy-orbits.md §5, §12.3, §14.4;
// docs/specs/2026-10-07-morph-and-scatter.md §2.2): a body that carries the defect misbehaves on a
// schedule hashed from its seed on the ambient clock. The GLSL in derp.glsl mirrors this step for
// step; the parity page (`?lib=derp`) compares them. Only operations GLSL has are used, and both
// mirrors read the constants of birth.ts (spliced into the GLSL). Nothing is integrated: a derp is a
// pure function of (seed, phase, ambient) and the body's sizes.
//
// The schedule: one slot of NODE_DERP_PERIOD a body, its event NODE_DERP_DUR long somewhere inside:
//   k = floor(t / T + phase),  t0 = (k − phase) T + hash01(seed, 2k) (T − D),  s = (t − t0) / D,
// active for s in [0, 1), the kind drawn by DERP_WEIGHTS on hash01(seed, 2k + 1). Every cracked
// body has R0's seed and its own phase, so a moon, its planet, their star and the rule stutter in
// the same order. The slot's own time t − (k − phase) T is taken from the remainder of t by T
// (orbitTurns, orbit.ts), so float32 keeps it to the precision of t itself, as the orbits are.
//
// What a derp moves (Derp), every term but the scatter's clock multiplied by the fix's `v`:
//  - `dNu` (rad), `dR` and `lift` (world units) on the body's orbit, after Kepler: the angle along
//    it, the distance off its track, the height out of its plane;
//  - `wobble` (world units), an offset of the whole body: the wobble, a star's and the core's
//    shiver, the burst's tremble, and the burst's jitter (in the galaxy's plane, x and z);
//  - `orbitT` (s), added to the ambient the body's own orbit reads: the burst's quantised clock;
//  - `ghost` (0 or v) and `ghostNu` (rad): the burst's dim double, on the track at the body's
//    undisturbed angle plus ghostNu;
//  - `scatterS`: seconds into a scatter, which the shell (shell.ts) draws, else −1. It is a clock,
//    not an amplitude: the shell scales its scatter by `v` itself.
//
// Kinds: the burst is eight hashed micro-slots of hard cuts (§12.3); the scatter moves nothing here
// and hands the shell its clock; the skip drifts off and rings home; the stall stands still and
// catches up; the reverse backs up; the wobble shivers. A star and a core body have no orbit: every
// kind but the scatter is a wobble DERP_STAR_SHIVER times as large.
//
// Salts: the schedule hashes 2k and 2k + 1 and the burst k·64 + slot·8 + j (j: 0 snap, 1 jump on,
// 2 jump, 3 lift, 5 ghost offset, 6 ghost on, 7 quantise; 4 is unused). The value noise of the
// wobble and the tremble, and the jitter, hash event k's block of DERP_FINE_EVENT salts far above
// the others, laid out by the DERP_FINE_* constants (birth.ts).
import type { Vec3 } from '../../math/vec';
import type { BodyKind } from '../../galaxy/body';
import { hash01 } from '../../math/hash';
import {
  BURST_GHOST_P,
  BURST_GHOST_SPAN,
  BURST_JITTER,
  BURST_JITTER_HZ,
  BURST_JUMP,
  BURST_JUMP_P,
  BURST_LIFT,
  BURST_QUANT_P,
  BURST_QUANT_STEP,
  BURST_SLOTS,
  BURST_SNAP,
  BURST_SNAP_HOLD,
  BURST_TREMBLE,
  BURST_TREMBLE_HZ,
  BURST_TREMBLE_PARTS,
  DERP_CUMULATIVE,
  DERP_FINE_EVENT,
  DERP_FINE_JITTER,
  DERP_FINE_JITTER_AT,
  DERP_FINE_LATTICE,
  DERP_FINE_SALT,
  DERP_REVERSE,
  DERP_SKIP_HOME,
  DERP_SKIP_LIFT,
  DERP_SKIP_PEAK,
  DERP_SKIP_R,
  DERP_SKIP_RING,
  DERP_STALL_HOLD,
  DERP_STAR_SHIVER,
  DERP_WEIGHTS,
  DERP_WOBBLE,
  DERP_WOBBLE_RATE,
  DERP_WOBBLE_Y,
  DerpKind,
  NODE_DERP_DUR,
  NODE_DERP_PERIOD,
  NODE_NEVER,
} from './birth';
import { orbitTurns } from './orbit';

export { DerpKind, DERP_WEIGHTS };

const PI = Math.PI;

export interface DerpEvent {
  /** The event is running: s in [0, 1), and the body carries the defect. */
  active: boolean;
  /** The slot's index. */
  k: number;
  /** The event's start (ambient s). */
  t0: number;
  /** The event's own time, 0 to 1 over NODE_DERP_DUR (outside [0, 1) between events). */
  s: number;
  kind: DerpKind;
}

export interface Derp {
  dNu: number;
  dR: number;
  lift: number;
  wobble: Vec3;
  orbitT: number;
  ghost: number;
  ghostNu: number;
  /** Seconds into a scatter, −1 if none. */
  scatterS: number;
}

const zero = (): Derp => ({ dNu: 0, dR: 0, lift: 0, wobble: [0, 0, 0], orbitT: 0, ghost: 0, ghostNu: 0, scatterS: -1 });

/** What a body that is not derping gets: nothing moved, no scatter. Frozen through, its wobble too. */
export const ZERO_DERP: Readonly<Omit<Derp, 'wobble'>> & { readonly wobble: Readonly<Vec3> } = Object.freeze({
  ...zero(),
  wobble: Object.freeze([0, 0, 0] as Vec3),
});

/** The hash's kind by the cumulative weights (float32, as the GLSL compares them). */
function kindOf(h: number): DerpKind {
  for (let i = 0; i < DERP_CUMULATIVE.length - 1; i++) if (h < DERP_CUMULATIVE[i]) return i;
  return DerpKind.Wobble;
}

/** The derp schedule at ambient `t`: which slot, when its event starts, how far into it, and its kind. */
export function derpEvent(seed: number, phase: number, t: number): DerpEvent {
  const T = NODE_DERP_PERIOD;
  const D = NODE_DERP_DUR;
  // t = k0 T + r0, r0 in [0, T); then the phase carries the slot on by at most one.
  const r0 = orbitTurns(t, T) * T;
  const k0 = Math.round((t - r0) / T);
  let local = r0 + phase * T;
  const k1 = Math.floor(local / T);
  local -= k1 * T;
  const k = k0 + k1;
  const off = hash01(seed, 2 * k) * (T - D);
  const s = (local - off) / D;
  return { active: seed !== NODE_NEVER && s >= 0 && s < 1, k, t0: (k - phase) * T + off, s, kind: kindOf(hash01(seed, 2 * k + 1)) };
}

/** One value of event k's lattice, in [−1, 1]: point i of axis `axis`. */
function lattice(seed: number, k: number, i: number, axis: number): number {
  return 2 * hash01(seed, DERP_FINE_SALT + k * DERP_FINE_EVENT + i * DERP_FINE_LATTICE + axis) - 1;
}

/** Event k's seeded value noise at x ≥ 0, per axis: its lattice points smoothstepped between. */
function noise(seed: number, k: number, x: number): Vec3 {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  const at = (axis: number) => {
    const a = lattice(seed, k, i, axis);
    return a + (lattice(seed, k, i + 1, axis) - a) * u;
  };
  return [at(0), at(1), at(2)];
}

/** GLSL's smoothstep. */
function smoothstep(e0: number, e1: number, x: number): number {
  const u = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1);
  return u * u * (3 - 2 * u);
}

/** The skip's profile: eases out to 1 by DERP_SKIP_PEAK, snaps to 0 by DERP_SKIP_HOME, then rings. */
function skipProfile(s: number): number {
  if (s < DERP_SKIP_PEAK) {
    const x = 1 - s / DERP_SKIP_PEAK;
    return 1 - x * x;
  }
  if (s < DERP_SKIP_HOME) return 1 - (s - DERP_SKIP_PEAK) / (DERP_SKIP_HOME - DERP_SKIP_PEAK);
  const tau = (s - DERP_SKIP_HOME) / (1 - DERP_SKIP_HOME);
  return -DERP_SKIP_RING * Math.sin(4 * PI * tau) * (1 - tau);
}

/**
 * What a derp moves on a body at ambient `t` (see the head of this file): its seed and phase, its
 * kind, its track's radius `r`, its own radius `R`, its angular speed `omega` (rad/s, for the stall)
 * and the fix's `v` (1 unfixed, 0 fixed). A healthy seed, a fixed body (`v` 0) or no event: ZERO_DERP.
 */
export function derp(seed: number, phase: number, t: number, kind: BodyKind, r: number, R: number, omega: number, v: number): Derp {
  if (seed === NODE_NEVER || !(v > 0)) return zero();
  const ev = derpEvent(seed, phase, t);
  if (!ev.active) return zero();
  const s = ev.s;
  const sec = s * NODE_DERP_DUR;
  const d = zero();
  if (ev.kind === DerpKind.Scatter) {
    d.scatterS = sec;
    return d;
  }
  const shiver = kind === 'star' || kind === 'core';
  if (shiver || ev.kind === DerpKind.Wobble) {
    const amp = DERP_WOBBLE * R * Math.sin(PI * s) * v * (shiver ? DERP_STAR_SHIVER : 1);
    const n = noise(seed, ev.k, DERP_WOBBLE_RATE * s);
    d.wobble = [amp * n[0], amp * DERP_WOBBLE_Y * n[1], amp * n[2]];
    return d;
  }
  if (ev.kind === DerpKind.Skip) {
    const p = skipProfile(s);
    d.dR = DERP_SKIP_R * r * p * v;
    d.lift = DERP_SKIP_LIFT * r * p * v;
  } else if (ev.kind === DerpKind.Stall) {
    d.dNu = -omega * NODE_DERP_DUR * (Math.min(s, DERP_STALL_HOLD) - DERP_STALL_HOLD * smoothstep(DERP_STALL_HOLD, 1, s)) * v;
  } else if (ev.kind === DerpKind.Reverse) {
    d.dNu = -DERP_REVERSE * Math.sin(PI * s) * v;
  } else {
    // The burst: micro-slot `slot`, `tau` of the way through it, each term a hard cut.
    const slot = Math.min(Math.floor(s * BURST_SLOTS), BURST_SLOTS - 1);
    const tau = s * BURST_SLOTS - slot;
    const h = (j: number) => hash01(seed, ev.k * 64 + slot * 8 + j);
    if (tau < BURST_SNAP_HOLD) {
      const snap = (h(0) - 0.5) * BURST_SNAP;
      d.dNu = snap * v;
      if (h(1) < Math.fround(BURST_JUMP_P)) d.dR = (h(2) - 0.5) * BURST_JUMP * r * v;
      d.lift = (h(3) - 0.5) * BURST_LIFT * r * v;
      if (h(6) < Math.fround(BURST_GHOST_P)) {
        d.ghost = v;
        d.ghostNu = (snap + (h(5) - 0.5) * BURST_GHOST_SPAN) * v;
      }
    }
    // The dropped-frame stutter: the body's own clock stands on multiples of BURST_QUANT_STEP.
    if (h(7) < Math.fround(BURST_QUANT_P)) d.orbitT = -orbitTurns(t, BURST_QUANT_STEP) * BURST_QUANT_STEP * v;
    // The jitter, held for 1 / BURST_JITTER_HZ s of the event's time and cut to the next.
    const m = Math.floor(sec * BURST_JITTER_HZ);
    const jitter = (c: number) =>
      (2 * hash01(seed, DERP_FINE_SALT + ev.k * DERP_FINE_EVENT + DERP_FINE_JITTER_AT + m * DERP_FINE_JITTER + c) - 1) *
      BURST_JITTER *
      r *
      v;
    // The tremble, eased in and out over the middle third.
    const third = s * BURST_TREMBLE_PARTS - 1;
    const amp = third >= 0 && third < 1 ? BURST_TREMBLE * R * Math.sin(PI * third) * v : 0;
    const n = amp === 0 ? ([0, 0, 0] as Vec3) : noise(seed, ev.k, BURST_TREMBLE_HZ * sec);
    d.wobble = [jitter(0) + amp * n[0], amp * DERP_WOBBLE_Y * n[1], jitter(1) + amp * n[2]];
  }
  return d;
}
