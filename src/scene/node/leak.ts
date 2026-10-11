// Reference implementation of the defect's leak (re-skin Task 8b; the defect inspector's variant 18,
// MOTIONS.leakBurst, at its intensity 0.35): every scatter slot that fires opens two wounds on a
// cracked shell, the first as the scatter's dots come home and the second a little after, and three in
// four of a wound's dots seep out along their bent normals, dimming, linger with a held shiver, and
// snap home in one frame. The GLSL in leak.glsl mirrors leakOffset step for step (its time is each
// wound's age, which the CPU packs); the parity page (`?lib=leak`) compares them. Only operations GLSL
// has are used, and both mirrors read LEAK (birth.ts, spliced into the GLSL). Nothing is integrated: a
// dot's leak is a pure function of (its lattice point, its index, the ambient, the wounds).
//
// What is TS only, and why: the wounds themselves (leakWounds, leakWoundsAt), per body and frame from
// its derp schedule, packed into the shell texture (packLeak, bodyAttrs.ts packShellData) as each
// wound's centre and cone, its age at the frame's ambient and its seed, as the shapes and the sweep
// are. A vertex then pays only the cone tests, and the hashes of the dots inside a wound.
//
// Hashes: a wound's seed mixes the body's own seed (shellSeed), its slot k and which wound (0, 1):
// `pcg(bodySeed ^ pcg(2k + w)) >> 8`; its draws are hash01 of `seed + j` under a SALT name. A dot's
// seed mixes the wound's and its lattice index, `pcg(woundSeed ^ i)`, and its draws are hash01 of
// `ds + j` likewise (j: the draw's index under its salt; a shiver's j is its tick).
import type { Vec3 } from '../../math/vec';
import { hash01, pcg } from '../../math/hash';
import { SALT } from '../../math/salts';
import { LEAK, LEAK_CLOSED, NODE_DERP_PERIOD, NODE_NEVER } from './birth';
import { derpEvent, DerpKind } from './derp';

const TAU = 2 * Math.PI;
/** A derp slot is a whole number of the leak's frames (2.2 s at 30 fps: 66), so a slot's frame grid is k slots of it on from slot 0's. */
export const SLOT_FRAMES = Math.round(LEAK.fps * NODE_DERP_PERIOD);
/** The inspector's q30 rounding guard: a time a hair under a frame's start falls on that frame. */
const FRAME_EPS = 1e-6;
/** How many wounds a body holds at once: two slots' (the current one and the one before), two each. */
export const LEAK_WOUNDS = 4;
/** The shell texture's leak texels (packLeak): one per wound (its centre and cone), the ages, the seeds. */
export const LEAK_TEXELS = LEAK_WOUNDS + 2;

/** A wound: when it opens (ambient s, on a whole 1/LEAK.fps s frame), its centre (unit, the lattice's frame), its cone's cosine and its seed (24 bits). */
export interface Wound {
  open: number;
  dir: Vec3;
  cosT: number;
  seed: number;
}

/** Wound `w` (0, 1) of slot k of a body: its seed, from the body's own seed. */
function woundSeed(bodySeed: number, k: number, w: number): number {
  return pcg((bodySeed ^ pcg((2 * k + w) >>> 0)) >>> 0) >>> 8;
}

/** A unit direction from two draws in [0, 1): its height z = 2 h0 − 1, then its azimuth 2π h1. */
function dirOf(h0: number, h1: number): Vec3 {
  const z = 2 * h0 - 1;
  const az = TAU * h1;
  const rho = Math.sqrt(Math.max(0, 1 - z * z));
  return [rho * Math.cos(az), z, rho * Math.sin(az)];
}

/**
 * The two wounds of slot k of a body's derp schedule (its derp seed and phase, and its own seed,
 * shellSeed): wound 1 opens LEAK.wound1 after the slot's onset, wound 2 LEAK.wound2 after wound 1, each
 * on the frame of the ambient it falls in. The slot is read as a scatter whatever its kind: which slots
 * scatter is leakWoundsAt's.
 */
export function leakWounds(derpSeed: number, phase: number, bodySeed: number, k: number): [Wound, Wound] {
  const T = NODE_DERP_PERIOD;
  // The onset's offset into its slot, derpEvent's own; the slot's start is SLOT_FRAMES (k − phase) frames in.
  const off = derpEvent(derpSeed, phase, (k - phase) * T + T / 2).t0 - (k - phase) * T;
  const s1 = woundSeed(bodySeed, k, 0);
  const s2 = woundSeed(bodySeed, k, 1);
  const d1 = LEAK.wound1[0] + LEAK.wound1[1] * hash01(s1, SALT.leakOpen);
  const d2 = LEAK.wound2[0] + LEAK.wound2[1] * hash01(s2, SALT.leakOpen);
  // The frame each opens on: whole frames of the slot's start, which is SLOT_FRAMES k frames from slot
  // 0's (an integer) less SLOT_FRAMES phase, kept apart so the frame count never meets k's size.
  const f1 = SLOT_FRAMES * k + Math.floor(LEAK.fps * (off + d1) - SLOT_FRAMES * phase + FRAME_EPS);
  const f2 = f1 + Math.floor(LEAK.fps * d2 + FRAME_EPS);
  const wound = (seed: number, frame: number): Wound => ({
    open: frame / LEAK.fps,
    dir: dirOf(hash01(seed, SALT.leakDir), hash01((seed + 1) >>> 0, SALT.leakDir)),
    cosT: Math.cos(LEAK.cosT[0] + LEAK.cosT[1] * hash01(seed, SALT.leakWidth)),
    seed,
  });
  return [wound(s1, f1), wound(s2, f2)];
}

/**
 * The wounds a body holds at ambient `t`, oldest first: those of its current derp slot and the one
 * before (a dot's linger reaches two seconds past its slot), each only if its slot scatters, or every
 * slot when the scatter is forced (bodyMote.ts focusScatter). A healthy body (NODE_NEVER) has none.
 */
export function leakWoundsAt(derpSeed: number, phase: number, bodySeed: number, t: number, forceScatter: boolean): Wound[] {
  if (derpSeed === NODE_NEVER) return [];
  const T = NODE_DERP_PERIOD;
  const k = derpEvent(derpSeed, phase, t, forceScatter).k;
  const out: Wound[] = [];
  for (const j of [k - 1, k]) {
    if (j < 0) continue;
    if (!forceScatter && derpEvent(derpSeed, phase, (j - phase) * T + T / 2).kind !== DerpKind.Scatter) continue;
    out.push(...leakWounds(derpSeed, phase, bodySeed, j));
  }
  return out;
}

/** A leaking dot's own clock: how long after its wound opens it sets out (s), its time out and its linger (s), and its seed. */
export interface LeakDot {
  delay: number;
  out: number;
  linger: number;
  seed: number;
}

/**
 * Whether dot `i` at the unit lattice point `u` leaks from wound `w`, and when: inside the wound's cone
 * and among its LEAK.frac, it sets out up to LEAK.edgeDelay later the nearer the cone's edge it is, plus
 * a jitter; null if it stays home.
 */
export function leakDot(u: Vec3, i: number, w: Pick<Wound, 'dir' | 'cosT' | 'seed'>): LeakDot | null {
  const cw = u[0] * w.dir[0] + u[1] * w.dir[1] + u[2] * w.dir[2];
  if (cw < w.cosT) return null;
  const ds = pcg((w.seed ^ i) >>> 0);
  if (hash01(ds, SALT.leakDot) >= LEAK.frac) return null;
  return {
    delay: LEAK.edgeDelay * (1 - (cw - w.cosT) / (1 - w.cosT)) + LEAK.startJitter * hash01((ds + 1) >>> 0, SALT.leakDot),
    out: LEAK.out[0] + LEAK.out[1] * hash01((ds + 2) >>> 0, SALT.leakDot),
    linger: LEAK.linger[0] + LEAK.linger[1] * hash01((ds + 3) >>> 0, SALT.leakDot),
    seed: ds,
  };
}

/** leakDot on the ambient clock: when dot `i` sets out (ambient s), its time out and its linger; null if it stays home. */
export function leakDotTiming(u: Vec3, i: number, w: Wound): { start: number; out: number; linger: number } | null {
  const d = leakDot(u, i, w);
  return d === null ? null : { start: w.open + d.delay, out: d.out, linger: d.linger };
}

/**
 * Where dot `i` at the unit lattice point `u` is moved by the wounds at ambient `t` (units of R, the
 * lattice's frame, before the spin), and its light: the first wound that holds it (in it, leaking, and
 * between setting out and coming home) wins, as the inspector's `break`. Out along `u` bent by
 * LEAK.bend of a hashed direction, (dist[0] + dist[1] h²) × reach × amp long, over its time out on
 * 1 − (1 − x)³; then lingering, creeping LEAK.creep further, with a shiver held for 1 / shiverHz s;
 * home at once at the end of its linger. Its light is 1 − dim × min(1, k).
 */
export function leakOffset(u: Vec3, i: number, t: number, wounds: readonly Wound[]): { off: Vec3; gain: number } {
  for (const w of wounds) {
    const d = leakDot(u, i, w);
    if (d === null) continue;
    const s = t - w.open - d.delay;
    if (!(s >= 0) || s >= d.out + d.linger) continue;
    let k: number;
    if (s < d.out) {
      const x = 1 - s / d.out;
      k = 1 - x * x * x;
    } else {
      k = 1 + (LEAK.creep * (s - d.out)) / d.linger;
    }
    const aim = dirOf(hash01(d.seed, SALT.leakAim), hash01((d.seed + 1) >>> 0, SALT.leakAim));
    const dir: Vec3 = [u[0] + LEAK.bend * aim[0], u[1] + LEAK.bend * aim[1], u[2] + LEAK.bend * aim[2]];
    const hd = hash01(d.seed, SALT.leakReach);
    const dist = ((LEAK.dist[0] + LEAK.dist[1] * hd * hd) * LEAK.reach * LEAK.amp) / Math.sqrt(dir[0] * dir[0] + dir[1] * dir[1] + dir[2] * dir[2]);
    // The linger's shiver, on x and y alike (the inspector's), held for one tick and cut to the next.
    const jx = s >= d.out ? LEAK.shiver * (hash01((d.seed + Math.floor((s - d.out) * LEAK.shiverHz)) >>> 0, SALT.leakShiver) - 0.5) : 0;
    return { off: [dir[0] * dist * k + jx, dir[1] * dist * k + jx, dir[2] * dist * k], gain: 1 - LEAK.dim * Math.min(1, k) };
  }
  return { off: [0, 0, 0], gain: 1 };
}

/**
 * The wounds as the shell texture holds them at ambient `t` (bodyAttrs.ts packShellData; leak.glsl's
 * Leak): LEAK_WOUNDS texels of (centre, cone's cosine), the open ones first and the rest closed
 * (LEAK_CLOSED: a cone no dot is in), then each wound's age (t − open) and its seed.
 */
export function packLeak(wounds: readonly Wound[], t: number): number[] {
  if (wounds.length > LEAK_WOUNDS) throw new Error(`packLeak: ${wounds.length} wounds, at most ${LEAK_WOUNDS}`);
  const out: number[] = [];
  for (let j = 0; j < LEAK_WOUNDS; j++) {
    const w = wounds[j];
    out.push(...(w ? [...w.dir, w.cosT] : [0, 1, 0, LEAK_CLOSED]));
  }
  for (let j = 0; j < LEAK_WOUNDS; j++) out.push(wounds[j] ? t - wounds[j].open : 0);
  for (let j = 0; j < LEAK_WOUNDS; j++) out.push(wounds[j]?.seed ?? 0);
  return out;
}

/**
 * The wounds back from their texels (`texel(j)`, j 0 .. LEAK_TEXELS − 1, as packLeak wrote them) at
 * ambient `t`: each open one, opening `t − age`.
 */
export function unpackLeak(texel: (j: number) => readonly number[], t: number): Wound[] {
  const ages = texel(LEAK_WOUNDS);
  const seeds = texel(LEAK_WOUNDS + 1);
  const out: Wound[] = [];
  for (let j = 0; j < LEAK_WOUNDS; j++) {
    const [x, y, z, cosT] = texel(j);
    if (!(cosT <= 1)) break;
    out.push({ open: t - ages[j], dir: [x, y, z], cosT, seed: seeds[j] });
  }
  return out;
}
