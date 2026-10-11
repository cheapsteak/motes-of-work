// Reference implementation of the black hole (docs/specs/2026-10-09-act-2-reskin.md §4.2): the lens,
// the disk (Kepler shear by streak lifetimes, Doppler lopsidedness, the underside arc a moment late),
// the photon ring, the jets, the knots, the in-fall and the strands' disk part. A port of the
// inspector's vertex shaders (scratch/session/bhmock/blackhole.html: COMMON, DISK_VERT, RING_VERT,
// JET_VERT, KNOT_VERT, INFALL_VERT, STRAND_VERT) with the disk's motion of the prototype's streakDot()
// (scratch/session/diskmotion/proto.html), every hash the mote library's hash01 of a holeSeed, every
// look value from holeLook.ts. The GLSL in hole.glsl mirrors every function step for step; the parity
// page (`?lib=hole`) compares them. Only operations GLSL has are used. Nothing is integrated: a dot is a
// pure function of its attributes (holeAttrs.ts), the view and the ambient clock.
//
// Frames. A dot is placed in the hole's frame: galactic axes (y up, the disk in x-z), the hole at the
// origin, in r_s (× HOLE_LOOK.scale to world units). The view maps it into view space (the camera's),
// where the lens bends it about the hole's view-space centre.
//
// Float-safe clocks. Every phase is reduced before it is scaled, so the twins agree at any ambient: at
// t = 3599.9 the inner disk's angle is about 2,447 rad, and float32 holds that to 2e-4.
//  - holeLives: a clock that runs a whole number of times an hour (a disk streak's lives, the haze's),
//    from the ambient's integer seconds, exactly: 3600 is t = 0.
//  - holeCycle: any other period, by orbitTurns (the orbit library's Cody-Waite reduction), with the
//    period held at the same float32 in both mirrors (HOLE_PERIODS, or a period quantized exactly).
import { hash01 } from '../../math/hash';
import { SALT } from '../../math/salts';
import type { Vec3 } from '../../math/vec';
import { orbitTurns } from '../node/orbit';
import {
  HOLE_COLOUR,
  HOLE_DISK,
  HOLE_DOT,
  HOLE_EMBER,
  HOLE_HOUR,
  HOLE_INFALL,
  HOLE_JET,
  HOLE_KNOT,
  HOLE_LENS,
  HOLE_LOOK,
  HOLE_PERIODS,
  HOLE_RING,
  HOLE_STRAND,
  HOLE_VIEW,
  holeSeed,
  STRAND,
  STRANDS,
} from './holeLook';
import { DISK_STRIDE, PART_STRIDE } from './holeAttrs';

export { knotInterval } from './holeLook';

const TAU = 6.283185307179586;

/** What a dot is drawn from: the ambient `t`; the camera `cam` in the hole's frame (r_s); `viewRot` (mat3, hole frame → view, column-major); `hv` the hole's centre in view space; `gain` the part's gain before the per-dot clamp (lamp, presence, compensation, the small hole: the inspector's uGain × its part gain; 1 for the bare look). */
export interface HoleView {
  t: number;
  cam: Vec3;
  viewRot: readonly number[];
  hv: Vec3;
  gain: number;
}

/** A dot: its place in view space after the lens, its colour, its alpha (clamped), its size in CSS px (before the pixel ratio and the distance) and the lens's `ok` (0 hidden; over 1 magnified). */
export interface HoleDot {
  view: Vec3;
  rgb: Vec3;
  alpha: number;
  sizeCss: number;
  ok: number;
}

function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1);
  return t * t * (3 - 2 * t);
}
const clamp = (x: number, a: number, b: number): number => Math.min(Math.max(x, a), b);
const mix = (a: number, b: number, h: number): number => a + (b - a) * h;
const mixRange = (r: readonly number[], h: number): number => mix(r[0], r[1], h);
const mix3 = (a: readonly number[], b: readonly number[], h: number): Vec3 => [mix(a[0], b[0], h), mix(a[1], b[1], h), mix(a[2], b[2], h)];
const fract = (x: number): number => x - Math.floor(x);
/**
 * A clock that runs `lives` (a whole number) times an hour, at `phase` lives ahead (phase > −1): x = t
 * lives / 3600 + phase, as its whole part `n`, its fraction `u` and the life's index in the hour, n mod
 * lives. Taken from the ambient's integer seconds, so the life count is exact and t = 3600 is t = 0 (n
 * by `lives` on, the same index); a t under 0 counts from the hour before. The index is integer
 * arithmetic, as the GLSL's: a float mod(n, lives) is n − lives floor(n / lives), and a GPU that divides
 * by the reciprocal gets floor(N / N) = 0 for 77 of the integers to 600, so the hour's last life would
 * take the seed of life N, not 0, and jump at the wrap.
 */
export function holeLives(t: number, lives: number, phase: number): { n: number; u: number; index: number } {
  let ti = Math.floor(t);
  const tf = t - ti;
  if (ti < 0) ti += HOLE_HOUR;
  const x = ti * lives;
  const q = Math.floor(x / HOLE_HOUR);
  const y = (x - q * HOLE_HOUR + lives * tf) / HOLE_HOUR + phase;
  const f = Math.floor(y);
  // q + f + lives ≥ 0 for f ≥ −1, so the remainder is of whole non-negative numbers (GLSL's int %).
  return { n: q + f, u: y - f, index: (q + f + lives) % lives };
}

/** A clock of period `period` s, `phase` turns ahead: (t / period + phase) as its whole part `n` and fraction `u`, the turns by orbitTurns. */
export function holeCycle(t: number, period: number, phase: number): { n: number; u: number } {
  const k = Math.floor(t / period);
  const w = orbitTurns(t, period) + phase;
  const f = Math.floor(w);
  return { n: k + f, u: w - f };
}

/** log(1 + e^(k x)) / k, in the form that is finite everywhere. */
function softplus(x: number, k: number): number {
  return Math.max(x, 0) + Math.log(1 + Math.exp(-k * Math.abs(x))) / k;
}

/**
 * The lens: bend a view-space point `pv` about the hole's view-space centre `hv` (§4.2). Image 0 is the
 * point's own (captured behind the shadow, magnified behind the hole); image 1 the far side's underside
 * arc, mirrored and hugging the shadow, only from depth underFrom. Anything inside the shadow piles
 * onto its rim, thinned; nothing past the view's edge is drawn. `ok` is 0 for hidden.
 */
export function holeLens(pv: Vec3, hv: Vec3, image: 0 | 1, scale: number = HOLE_LOOK.scale): { pos: Vec3; ok: number } {
  const Ls = HOLE_LENS;
  const rx = (pv[0] - hv[0]) / scale;
  const ry = (pv[1] - hv[1]) / scale;
  const rz = (pv[2] - hv[2]) / scale;
  const d = -rz;
  let tx = rx;
  let ty = ry;
  const b = Math.sqrt(rx * rx + ry * ry);
  const deff = Math.max(d, 0) + Ls.near * Math.exp(-Math.abs(d));
  const disc = Math.sqrt(b * b + 8 * Ls.bend * deff);
  let bp: number;
  let ok = 1;
  if (image === 0) {
    bp = 0.5 * (b + disc);
    if (d > 0 && bp < Ls.bCrit) ok = 0;
    ok *= 1 + Ls.magnify * smoothstep(0, Ls.magnifyDepth, d);
  } else {
    if (d < Ls.underFrom) ok = 0;
    bp = 0.5 * (disc - b);
    bp = Ls.bCrit + (bp - Ls.bCrit) * Ls.underHug;
    tx = -tx;
    ty = -ty;
  }
  if (bp > Ls.edge) ok = 0;
  const x = bp - Ls.bCrit;
  ok *= mix(Ls.rimDim, 1, smoothstep(Ls.rim[0], Ls.rim[1], x));
  bp = Ls.bCrit + Ls.rimGap + softplus(x, Ls.softness);
  const onAxis = !(b > Ls.axis);
  const px = onAxis ? 0 : tx * (bp / b);
  const py = onAxis ? bp : ty * (bp / b);
  const w = d > 0 ? 1 : Math.exp(d / Ls.flatten);
  const z = rz * (1 - w);
  return {
    pos: [hv[0] + px * scale, hv[1] + py * scale, hv[2] + z * scale],
    ok,
  };
}

/** Doppler beaming of matter at `p` (hole frame) moving along unit `v` at `beta`, seen from `cam`: the gain g^(dopplerPow · lop) and the factor g. */
export function holeDoppler(p: Vec3, v: Vec3, beta: number, cam: Vec3): { gain: number; g: number } {
  const dx = cam[0] - p[0];
  const dy = cam[1] - p[1];
  const dz = cam[2] - p[2];
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const c = (v[0] * dx + v[1] * dy + v[2] * dz) / len;
  const g = Math.sqrt(Math.max(1 - beta * beta, 0)) / (1 - beta * c);
  return {
    gain: Math.pow(g, HOLE_DISK.dopplerPow * HOLE_LOOK.lopsidedness),
    g,
  };
}

/** The disk's colour at Doppler factor `g` and `heat`: warm receding, cool approaching, whiter when hot. */
export function holeTemp(g: number, heat: number): Vec3 {
  const C = HOLE_COLOUR;
  const m = smoothstep(C.coolBand[0], C.coolBand[1], 1 + (g - 1) * HOLE_LOOK.lopsidedness);
  return mix3(mix3(C.warm, C.cool, m), C.white, heat * C.whiteMix);
}

/** The Kepler rate at r: omega0 r^−1.5 rad/s. */
export function holeOmega(r: number): number {
  return HOLE_DISK.omega0 * Math.pow(r, -1.5);
}

/** A hole-frame point in view space: hv + viewRot (p × scale). */
function toView(v: HoleView, p: Vec3): Vec3 {
  const m = v.viewRot;
  const s = HOLE_LOOK.scale;
  return [0, 1, 2].map((r) => v.hv[r] + (m[r] * p[0] + m[3 + r] * p[1] + m[6 + r] * p[2]) * s) as Vec3;
}

/** The inspector's emit(): alpha I × min(ok, 1), clamped, and none at all under ok HOLE_DOT.hidden. */
function holeFinish(view: Vec3, rgb: Vec3, I: number, sizeCss: number, ok: number): HoleDot {
  const alpha = ok < HOLE_DOT.hidden ? 0 : clamp(I * Math.min(ok, 1), 0, 1);
  return { view, rgb, alpha, sizeCss, ok };
}

/** Place a hole-frame point through the view and the lens's `image`, and finish the dot. */
function holeEmit(v: HoleView, p: Vec3, image: 0 | 1, rgb: Vec3, I: number, sizeCss: number, ok: number): HoleDot {
  const lensed = holeLens(toView(v, p), v.hv, image);
  return holeFinish(lensed.pos, rgb, I, sizeCss, ok * lensed.ok);
}

/** A streak's life of index `index` in the hour (holeLives's) (§4.2): its centre radius at the life's fraction `u` (drift), angle, length, brightness, pitch and hot flag, from the life seed (k, index). */
export function streakLife(
  k: number,
  rb: number,
  index: number,
  u = 0,
): {
  rc: number;
  angle: number;
  len: number;
  bright: number;
  pitch: number;
  hot: number;
} {
  const M = HOLE_DISK.motion;
  const S = HOLE_DISK.streak;
  const seed = holeSeed(k, index);
  const hot = hash01(seed, SALT.diskHot) < M.hotShare ? 1 : 0;
  const rc = rb * (1 - M.lifeJitter + 2 * M.lifeJitter * hash01(seed, SALT.diskLifeR)) - M.drift * u;
  const angle = TAU * hash01(seed, SALT.diskLifeAngle);
  const len = mixRange(S.len, hash01(seed, SALT.diskLifeLen)) * (1 + rc / S.lenGrow) * mix(1, M.hotLen, hot);
  const bright = mixRange(S.bright, hash01(seed, SALT.diskLifeBright)) * mix(1, M.hotBright, hot);
  const pitch = mixRange(S.pitch, hash01(seed, SALT.diskLifePitch));
  return { rc, angle, len, bright, pitch, hot };
}

/** Where disk dot `i` is (hole frame, polar), how bright before the light law, and its streak's state. */
export interface DiskPlace {
  r: number;
  phi: number;
  h: number;
  /** b · bf · envelope for a streak dot, bright · envelope for a haze dot. */
  bright: number;
  env: number;
  hot: number;
  sizeAdd: number;
  /** The streak (−1 for haze), its life count and the life's index in the hour (holeLives), and the angle of its centre (a haze dot's own). */
  k: number;
  n: number;
  index: number;
  centre: number;
}

/**
 * Disk dot `i` at ambient `t`, `lag` s behind (the underside arc's arcDelay). A streak dot (aC.x = k ≥ 0)
 * keeps its static place in its streak (u, g, bf) and its streak lives aB.w times an hour, re-hashed each
 * life: r = max(inner, rc + g jitter − u len pitch), φ = a + u len + ω(rc) τ + shear (ω(r) − ω(rc)) τ,
 * under the envelope. A haze dot keeps its radius and turns rigidly at ω(r) within each of its lives,
 * its angle re-hashed per life, under the gentler envelope. The lag runs the clock's phase back.
 */
export function diskPlace(a: Float32Array, i: number, t: number, lag = 0): DiskPlace {
  const o = i * DISK_STRIDE;
  const M = HOLE_DISK.motion;
  const r0 = a[o];
  const h = a[o + 2];
  const lives = a[o + 7];
  const k = a[o + 8];
  const life = HOLE_HOUR / lives;
  const back = (lag * lives) / HOLE_HOUR;
  if (k >= 0) {
    const rb = a[o + 5];
    const phaseSeed = holeSeed(k, -1);
    const c = holeLives(t, lives, hash01(phaseSeed, SALT.diskPhase) - back);
    const s = streakLife(k, rb, c.index, c.u);
    const tau = c.u * life;
    const offa = a[o + 9] * s.len;
    const r = Math.max(HOLE_DISK.inner, s.rc + a[o + 10] * HOLE_DISK.streak.jitter - offa * s.pitch);
    const wC = holeOmega(s.rc);
    const wI = holeOmega(r);
    const phi = s.angle + offa + wC * tau + M.shear * (wI - wC) * tau;
    const env = smoothstep(0, M.env[0], c.u) * (1 - smoothstep(M.env[1], 1, c.u));
    return {
      r,
      phi,
      h,
      bright: s.bright * a[o + 11] * env,
      env,
      hot: s.hot,
      sizeAdd: s.hot * M.hotSize,
      k,
      n: c.n,
      index: c.index,
      centre: s.angle + wC * tau,
    };
  }
  const id = a[o + 6];
  const phaseSeed = holeSeed(id, -1);
  const c = holeLives(t, lives, hash01(phaseSeed, SALT.hazePhase) - back);
  const lifeSeed = holeSeed(id, c.index);
  const phi = TAU * hash01(lifeSeed, SALT.hazeAngle) + holeOmega(r0) * c.u * life;
  const env = smoothstep(0, M.hazeEnv[0], c.u) * (1 - smoothstep(M.hazeEnv[1], 1, c.u));
  return {
    r: r0,
    phi,
    h,
    bright: a[o + 3] * env,
    env,
    hot: 0,
    sizeAdd: 0,
    k,
    n: c.n,
    index: c.index,
    centre: phi,
  };
}

/** Disk dot `i` (§4.2) through `image` (1: the underside arc, arcDelay s behind, at underGain). */
export function diskDot(a: Float32Array, i: number, v: HoleView, image: 0 | 1): HoleDot {
  const D = HOLE_DISK;
  const d = diskPlace(a, i, v.t, image === 1 ? D.motion.arcDelay : 0);
  const sn = Math.sin(d.phi);
  const cs = Math.cos(d.phi);
  const p: Vec3 = [d.r * cs, d.h, d.r * sn];
  const dop = holeDoppler(p, [-sn, 0, cs], Math.sqrt(D.beta / Math.max(d.r, D.inner)), v.cam);
  const heat = clamp((D.heat[0] - d.r) / D.heat[1], 0, 1);
  const radial = Math.pow(D.radialRef / d.r, D.radialPow) * smoothstep(D.rise[0], D.rise[1], d.r);
  const grav = Math.max(1 - 1 / d.r, 0);
  const outer = 1 - smoothstep(D.fade[0], D.fade[1], d.r);
  const I = d.bright * radial * dop.gain * grav * outer * HOLE_LOOK.diskBrightness * v.gain * (image === 1 ? HOLE_LENS.underGain : 1);
  const size = a[i * DISK_STRIDE + 4] + d.sizeAdd + D.lift[0] * clamp(I - 1, 0, D.lift[1]);
  return holeEmit(v, p, image, holeTemp(dop.g, heat), I, size, 1);
}

/** Photon ring dot `i` (§4.2): a circle in the view plane about hv, beamed as the disk's matter on the ring's bearing would be. */
export function ringDot(a: Float32Array, i: number, v: HoleView): HoleDot {
  const R = HOLE_RING;
  const o = i * PART_STRIDE;
  const sn = Math.sin(a[o]);
  const cs = Math.cos(a[o]);
  // The ring's direction in the hole's frame: viewRotᵀ (cos, sin, 0), onto the disk's plane.
  const m = v.viewRot;
  const ex = m[0] * cs + m[1] * sn + HOLE_LENS.axis;
  const ez = m[6] * cs + m[7] * sn;
  const len = Math.sqrt(ex * ex + ez * ez);
  const px = ex / len;
  const pz = ez / len;
  const dop = holeDoppler([px * HOLE_LENS.bCrit, 0, pz * HOLE_LENS.bCrit], [-pz, 0, px], R.beta, v.cam);
  const I = a[o + 2] * Math.pow(Math.max(dop.gain, 0), R.pow) * R.gain * v.gain;
  const rr = (HOLE_LENS.bCrit * R.radius + a[o + 1] * R.jitter) * HOLE_LOOK.scale;
  return holeFinish([v.hv[0] + cs * rr, v.hv[1] + sn * rr, v.hv[2]], holeTemp(dop.g, R.heat), I, R.size, 1);
}

/** The jet's radius at s: (jetWidth / 2) s^rhoPow. */
export function jetRho(s: number): number {
  return HOLE_LOOK.jetWidth * 0.5 * Math.pow(Math.max(s, 0), HOLE_JET.rhoPow);
}

/**
 * Jet dot `i` at ambient `t`: s = L fract(s0 + f t / jetPeriod), its drift factor f quantized to
 * 1/driftSteps of its range so that f × the period count is exact in float32; twisting at HOLE_JET.twist.
 */
export function jetPlace(a: Float32Array, i: number, t: number): { p: Vec3; s: number } {
  const J = HOLE_JET;
  const o = i * PART_STRIDE;
  const side = a[o + 3];
  const f = mixRange(J.drift, Math.floor(hash01(a[o + 5], SALT.jetSpeed) * J.driftSteps) / J.driftSteps);
  const c = holeCycle(t, HOLE_PERIODS.jetPeriod, 0);
  const s = HOLE_LOOK.jetLength * fract(a[o] + fract(c.n * f) + f * c.u);
  const rr = jetRho(s) * a[o + 2];
  const ang = a[o + 1] + side * TAU * orbitTurns(t, HOLE_PERIODS.twistPeriod);
  return {
    p: [rr * Math.cos(ang), side * (J.base + s), rr * Math.sin(ang)],
    s,
  };
}

/** Jet dot `i` (§4.2). */
export function jetDot(a: Float32Array, i: number, v: HoleView): HoleDot {
  const J = HOLE_JET;
  const L = HOLE_LOOK.jetLength;
  const { p, s } = jetPlace(a, i, v.t);
  const fade = smoothstep(0, J.fadeIn, s) * (1 - smoothstep(J.fadeOut * L, L, s));
  const I = a[i * PART_STRIDE + 4] * fade * (J.gain / (1 + s / J.falloff)) * v.gain;
  return holeEmit(v, p, 0, mix3(J.baseRgb, J.tipRgb, smoothstep(0, 1, s / L)), I, J.size, 1);
}

/**
 * Knot dot `i` at ambient `t`: slot j of its side launches once a cycle of K intervals, at j I + jitter
 * I hash into cycle n, and rides out at HOLE_KNOT.speed. `ok` while it is on the jet (0 ≤ s ≤ L);
 * `emberDraw` the knot's own draw for the ember.
 */
export function knotPlace(a: Float32Array, i: number, t: number): { p: Vec3; s: number; n: number; ok: number; emberDraw: number } {
  const K = HOLE_KNOT;
  const P = HOLE_PERIODS;
  const o = i * PART_STRIDE;
  const slot = a[o];
  const side = a[o + 1];
  const c = holeCycle(t, P.knotCycle, 0);
  const inCycle = c.u * P.knotCycle;
  const back = inCycle < slot * P.knotInterval ? -1 : 0;
  const n = c.n + back;
  const id = holeSeed(slot + (side < 0 ? P.knotSlots : 0), n);
  const launch = slot * P.knotInterval + back * P.knotCycle + K.jitter * P.knotInterval * hash01(id, SALT.knotLaunch);
  const s = (inCycle - launch) * K.speed;
  const ok = s >= 0 && s <= HOLE_LOOK.jetLength ? 1 : 0;
  const rho = jetRho(s);
  const p: Vec3 = [a[o + 4] * rho * K.spread, side * (HOLE_JET.base + s + a[o + 5] * (K.lift[0] + K.lift[1] * s)), a[o + 6] * rho * K.spread];
  return { p, s, n, ok, emberDraw: hash01(id, SALT.knotEmber) };
}

/** Knot dot `i` (§4.2) under the fronts: ember iff its draw < emberShare and fronts.clean L ≤ s ≤ fronts.ember L. */
export function knotDot(a: Float32Array, i: number, v: HoleView, fronts: { ember: number; clean: number }): HoleDot & { ember: number } {
  const K = HOLE_KNOT;
  const L = HOLE_LOOK.jetLength;
  const k = knotPlace(a, i, v.t);
  const ember = k.emberDraw < K.emberShare && k.s <= fronts.ember * L && k.s >= fronts.clean * L ? 1 : 0;
  const fade = smoothstep(0, K.fade[0], k.s) * (1 - smoothstep(K.fade[1] * L, L, k.s));
  const I = a[i * PART_STRIDE + 2] * fade * v.gain;
  return {
    ...holeEmit(v, k.p, 0, mix3(K.clean, K.ember, ember), I, K.size, k.ok),
    ember,
  };
}

/**
 * In-fall dot `i` at ambient `t`: its slot falls once a period (quantized, so float32 holds it), from
 * radius `from` tilted out of the plane into the disk at `to`; the trail dot `trail` falls behind. The
 * path is fixed per fall: its winding, and the disk's turn at its end radius over the fall's own time.
 */
export function infallPlace(a: Float32Array, i: number, t: number): { p: Vec3; u: number; ok: number } {
  const F = HOLE_INFALL;
  const o = i * PART_STRIDE;
  const slot = a[o];
  const slotSeed = holeSeed(slot, -1);
  const period = mixRange(F.period, Math.floor(hash01(slotSeed, SALT.infallPeriod) * F.periodSteps) / F.periodSteps);
  const c = holeCycle(t, period, hash01(slotSeed, SALT.infallOffset));
  const u = (c.u * period) / F.fall - a[o + 1] * F.trail;
  const ok = u >= 0 && u <= 1 ? 1 : 0;
  const fallSeed = holeSeed(slot, c.n);
  const tilt = mixRange(F.tilt, hash01(fallSeed, SALT.infallTilt)) * (hash01(fallSeed, SALT.infallSide) < 0.5 ? -1 : 1);
  const from = mixRange(F.from, hash01(fallSeed, SALT.infallFrom));
  const to = mixRange(F.to, hash01(fallSeed, SALT.infallTo));
  const uc = clamp(u, 0, 1);
  const e = Math.pow(uc, F.ease);
  const rho = mix(from * Math.cos(tilt), to, e);
  const y = from * Math.sin(tilt) * Math.pow(1 - e, F.drop);
  const phi = TAU * hash01(fallSeed, SALT.infallAzimuth) + mixRange(F.wind, hash01(fallSeed, SALT.infallWind)) * e + holeOmega(to) * F.fall * uc * e;
  return { p: [rho * Math.cos(phi), y, rho * Math.sin(phi)], u, ok };
}

/** In-fall dot `i` (§4.2). */
export function infallDot(a: Float32Array, i: number, v: HoleView): HoleDot {
  const F = HOLE_INFALL;
  const f = infallPlace(a, i, v.t);
  const fade = smoothstep(0, F.fade[0], f.u) * (1 - smoothstep(F.fade[1], 1, f.u));
  const I = (F.bright - F.trailDim * a[i * PART_STRIDE + 1]) * fade * v.gain;
  return holeEmit(v, f.p, 0, [...F.rgb], I, F.size, f.ok);
}

/** Strand `which`'s window: R0's whole from the start (head lstr, tail 0); R1's grows from its join, head strand1 × lstr. */
export function strandWindow(which: 0 | 1, strand1: number): { head: number; tail: number } {
  return {
    head: which === 0 ? STRANDS[0].lstr : strand1 * STRANDS[1].lstr,
    tail: 0,
  };
}

/** Where strand `which` joins the disk at ambient `t`: rJoin (cos ωt, 0, sin ωt), ω = omega0 rMean^−1.5 (R1's is where the C7 → R1 stream ends). */
export function strandJoin(which: 0 | 1, t: number): Vec3 {
  const a = TAU * orbitTurns(t, HOLE_PERIODS.strandPeriod[which]);
  const r = STRANDS[which].rJoin;
  return [r * Math.cos(a), 0, r * Math.sin(a)];
}

/** Strand dot `i` at ambient `t` (its disk part, q ≥ 0): r = rJoin − pitch q / rMean, turning with the join, jittered. */
export function strandPlace(a: Float32Array, i: number, t: number): { p: Vec3; r: number; q: number; which: 0 | 1 } {
  const o = i * PART_STRIDE;
  const q = a[o];
  const which = a[o + 4] as 0 | 1;
  const S = STRANDS[which];
  const psi = q / S.rMean;
  const r = S.rJoin - STRAND.pitch * psi;
  const phi = psi + TAU * orbitTurns(t, HOLE_PERIODS.strandPeriod[which]);
  const cs = Math.cos(phi);
  const sn = Math.sin(phi);
  const rj = r + a[o + 2] * HOLE_STRAND.jitter[0];
  return {
    p: [rj * cs, a[o + 3] * HOLE_STRAND.jitter[1], rj * sn],
    r,
    q,
    which,
  };
}

/** Strand dot `i` (§4.2): its strand (aB.x) inside the window [0, s.head], clean to HOLE_EMBER by `s.heat`. */
export function strandDot(a: Float32Array, i: number, v: HoleView, s: { head: number; heat: number }): HoleDot {
  const T = HOLE_STRAND;
  const d = strandPlace(a, i, v.t);
  const tail = 0;
  const vis = d.q >= tail && d.q <= s.head ? 1 : 0;
  const rv = Math.sqrt(d.p[0] * d.p[0] + d.p[2] * d.p[2]);
  const dop = holeDoppler(d.p, [-d.p[2] / rv, 0, d.p[0] / rv], Math.sqrt(HOLE_DISK.beta / Math.max(d.r, T.betaFloor)), v.cam);
  const endFade = smoothstep(tail, tail + T.fade[0], d.q) * (1 - smoothstep(s.head - T.fade[1], s.head, d.q));
  const I =
    mixRange(T.bright, hash01(a[i * PART_STRIDE + 1], SALT.strandBright)) *
    Math.pow(Math.max(dop.gain, 0), T.dopplerPow) *
    HOLE_LOOK.strandBrightness *
    v.gain *
    mix(T.cleanGain, HOLE_EMBER.gain, s.heat) *
    endFade;
  return holeEmit(v, d.p, 0, mix3(T.clean, HOLE_EMBER.rgb, s.heat), I, mix(T.size, HOLE_EMBER.size, s.heat), vis);
}

/** A dot's size in device px: × the pixel ratio × clamp(refDist / z, near), never under one CSS px. */
export function holeDotPx(sizeCss: number, viewDepth: number, pixelRatio: number): number {
  const px = sizeCss * pixelRatio * clamp(HOLE_VIEW.refDist / Math.max(viewDepth, 1), HOLE_DOT.near[0], HOLE_DOT.near[1]);
  return Math.max(px, HOLE_DOT.floor * pixelRatio);
}
