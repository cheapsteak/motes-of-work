// Swiss lever escapement kinematics, as pure functions of the drive clock and the faults.
//
// The balance swings simple-harmonically. The impulse pin on its roller is inside the fork's notch
// only while the balance is within the lift angle of its rest position: there the fork is carried
// from one banking to the other and the escape wheel, unlocked, advances half a tooth pitch (one
// beat). Everywhere else the fork rests on a banking and the wheel is locked on a pallet stone.
// Two beats per oscillation, so the wheel advances one tooth per balance period.

import type { Faults } from '../../timeline/sceneState';

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

/** Beats (half-swings of the balance) per unit of drive: four full oscillations. */
export const BEATS_PER_DRIVE = 8;
export const ESCAPE_TEETH = 15;
/** Balance amplitude either side of rest: about 250 degrees, a healthy watch seen dial-down. */
export const AMPLITUDE = 250 * DEG;
/** Half the lift angle: the balance is coupled to the fork while |balance| < LIFT. */
export const LIFT = 30 * DEG;
/** Fork rotation either side of the line of centres when it rests on a banking pin. */
export const BANKING = 7 * DEG;
/**
 * Escape-wheel angle (relative to the line of centres, escape → pallet) that puts tooth 0's
 * locking corner just behind the stone at -30 degrees: the wheel's rest after an even beat. After
 * an odd beat, half a pitch on, a corner rests just behind the stone at +30 degrees instead.
 */
export const ESCAPE_PHASE = -28 * DEG;

const ESCAPE_PITCH = TAU / ESCAPE_TEETH;
/** Beats per stall cycle: the watch stops at the start of every second oscillation. */
const STALL_WINDOW = 4;

function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

const fract = (x: number): number => x - Math.floor(x);

export interface Clock {
  /** Beats elapsed: the balance passes rest at every integer. */
  beats: number;
  /** Amplitude scale from the faults (1 for a healthy watch). */
  amplitude: number;
}

/**
 * The watch's own beat clock. `ratio` runs it fast; `stall` freezes it near rest for a stretch of
 * every cycle and then hurries it to catch up; `bind` collapses the amplitude.
 */
export function clock(drive: number, f: Faults): Clock {
  const raw = BEATS_PER_DRIVE * drive * (1 + f.ratio);
  // Stall cycles start half a beat early so the clock freezes at an extreme, where the fork rests
  // on a banking and the wheel is locked; meanwhile the amplitude dies away towards rest.
  const v = (raw + 0.5) / STALL_WINDOW;
  const f01 = fract(v);
  const stalled = STALL_WINDOW * (Math.floor(v) + smoothstep(0.45, 1, f01)) - 0.5;
  const beats = raw * (1 - f.stall) + stalled * f.stall;
  const dip = smoothstep(0, 0.15, f01) * (1 - smoothstep(0.45, 0.6, f01));
  const amplitude = (1 - 0.75 * f.bind) * (1 - 0.82 * f.stall * dip);
  return { beats, amplitude };
}

export interface EscapementState {
  /** Balance angle from rest (radians, counter-clockwise positive). */
  balance: number;
  /** Fork angle from the line of centres. */
  pallet: number;
  /** The banking the fork rests on (its full swing either side). */
  banking: number;
  /** Escape-wheel angle relative to the line of centres; it turns clockwise, so it falls. */
  escape: number;
  /** The beat clock the escapement ran on. */
  beats: number;
}

export function escapement(drive: number, f: Faults): EscapementState {
  const { beats: u, amplitude } = clock(drive, f);
  const amp = AMPLITUDE * amplitude;
  const balance = amp * Math.sin(Math.PI * u);

  // Beat k happens as the balance passes rest at u = k; the fork is engaged while |w| < h.
  const k = Math.round(u);
  const w = u - k;
  const h = Math.asin(Math.min(1, LIFT / amp)) / Math.PI;
  const s = smoothstep(-h, h, w);
  const parity = k % 2 === 0 ? 1 : -1;
  // The pin pushes the fork the opposite way to the balance's swing (they turn about different centres).
  const pallet = -BANKING * parity * (2 * s - 1);

  // Ticks completed, continuous through each beat. Slip lets two extra half-pitches through on every
  // third beat (beats 2, 5, 8, ...); misalign lets the wheel creep past pallets that no longer lock it.
  const ticks = k - 1 + s;
  const kMod3 = ((k % 3) + 3) % 3;
  const skipped = 2 * (Math.floor(k / 3) + (kMod3 === 2 ? s : 0));
  const creep = 0.12 * u * ESCAPE_PITCH * f.misalign;
  const escape = ESCAPE_PHASE - (ticks + f.slip * skipped) * (ESCAPE_PITCH / 2) - creep;

  return { balance, pallet, banking: BANKING, escape, beats: u };
}

/**
 * Angle of a wheel of `drivenTeeth` driven by a wheel or pinion of `driverTeeth` at `driverAngle`,
 * their centres on a line at angle `phi` (driver → driven). Teeth of both outlines are centred on
 * their local +x. The phases interleave: when a driver tooth points along the line of centres, a
 * gap of the driven wheel faces it.
 */
export function mesh(driverAngle: number, driverTeeth: number, phi: number, drivenTeeth: number): number {
  return phi + Math.PI - Math.PI / drivenTeeth - (driverAngle - phi) * (driverTeeth / drivenTeeth);
}
