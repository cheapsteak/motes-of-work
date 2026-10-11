// Reference implementation of the freeze frame's dressing (docs/specs/2026-10-07-freeze-frame.md §2.1,
// §3.1): the held, inked moment on the defect's close shot. Every term is a per-mote term the galaxy's
// vertex shaders apply (bodySystem.ts): the focused piece's two misregistered copies (freezeCopy), its
// inked limb (freezeLimb), and the two bursts of dotted dashes round the moon caught mid-burst and the
// planet caught mid-scatter (freezeTick, freezeTickShow, freezeTickWarm). The GLSL in freeze.glsl mirrors
// it step for step; the parity page (`?lib=freeze`) compares them. Only operations GLSL has are used,
// and both mirrors read the constants of birth.ts (spliced into the GLSL). Nothing here moves on its
// own: the dressing is a pure function of the story's leaves (`freeze.dress`, the fix's `v`) and,
// for the twos, of the 12 Hz tick the CPU hands it (0 in test mode and under reduced motion).
//
// Screen angles are radians counter-clockwise from the screen's right, its y up, as clip space has
// them; screen lengths are CSS px; a burst's radii are in its source's own screen radius.
import { hash01 } from '../../math/hash';
import type { Vec3 } from '../../math/vec';
import {
  FREEZE_BREATH_PX,
  FREEZE_COPY_GAIN,
  FREEZE_COPY_PX,
  FREEZE_LIMB_BAND,
  FREEZE_LIMB_BREAK,
  FREEZE_LIMB_COPY,
  FREEZE_LIMB_GAIN,
  FREEZE_LIMB_SIZE,
  FREEZE_LIMB_WEIGHT,
  FREEZE_MOON_COPY_PX,
  FREEZE_TICK_KEEP,
  FREEZE_TICK_MOON,
  FREEZE_TICK_PLANET,
  FREEZE_TICK_SALT,
  FREEZE_TICK_SEED,
  FREEZE_TICK_SHOW_MOON,
  FREEZE_TICK_SHOW_PLANET,
  FREEZE_TICK_STAGGER,
  FREEZE_TICK_WINK,
  FREEZE_TWOS_HZ,
  hexToRgb,
  NODE_PALETTE,
} from './birth';

/** Which copy of the piece: 0 the base, 1 the cold copy, 2 the warm one. */
export type FreezeCopyIndex = 0 | 1 | 2;
/** The warm copy's colour: A ember turning amber as the fix lands (the author's choice), B amber throughout. */
export type WarmMode = 'A' | 'B';
/** A burst's source: the moon caught mid-burst, or its planet caught mid-scatter. */
export type TickSource = 'moon' | 'planet';

const TAU = 2 * Math.PI;
const AGENT = hexToRgb(NODE_PALETTE.NODE_AGENT);
const HUMAN = hexToRgb(NODE_PALETTE.NODE_HUMAN);
const EMBER = hexToRgb(NODE_PALETTE.NODE_EMBER);

// GLSL semantics.
function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1);
  return t * t * (3 - 2 * t);
}
const mixVec = (a: readonly number[], b: readonly number[], t: number): Vec3 => [0, 1, 2].map((i) => a[i] * (1 - t) + b[i] * t) as Vec3;
/** GLSL's mod: x − y floor(x / y). */
const mod = (x: number, y: number): number => x - y * Math.floor(x / y);
/** How far apart two angles are, radians in [0, π]. */
function angleApart(a: number, b: number): number {
  return Math.abs(mod(a - b + Math.PI, TAU) - Math.PI);
}

/**
 * Copy `copy` of the focused piece at dressing `dress` (0..1, already times `net.focus`) and the fix's
 * `v` (1 unfixed, 0 fixed): how far it stands off the base along the rolled screen x (CSS px, the cold
 * copy to the left, the warm to the right, spreading in with the dressing; the moon caught mid-burst
 * twice as far), its brightness as a share of the base's (0 at dress 0: no copy before the dressing),
 * and the colour it is drawn in. The base (copy 0) stands where it is at its own brightness, its
 * colour its own (`tint` is unused there, black).
 */
export function freezeCopy(copy: FreezeCopyIndex, dress: number, v: number, mode: WarmMode, isDefectMoon: boolean): { offPx: number; gain: number; tint: Vec3 } {
  if (copy === 0) return { offPx: 0, gain: 1, tint: [0, 0, 0] };
  const px = isDefectMoon ? FREEZE_MOON_COPY_PX : FREEZE_COPY_PX;
  const side = copy === 1 ? -1 : 1;
  const warm = mode === 'A' ? mixVec(EMBER, HUMAN, 1 - v) : ([...HUMAN] as Vec3);
  return { offPx: side * px * dress, gain: FREEZE_COPY_GAIN * dress, tint: copy === 1 ? ([...AGENT] as Vec3) : warm };
}

/**
 * The inked limb on a shell mote: its brightness and size, as multiples of its own, from its rest
 * normal in view space (`restNormalView`: its lattice normal spun, before any scatter, so a flung limb
 * mote keeps its ink), the key light's direction in view space (`lightDir`), the dressing and the
 * copy. The ink is the band where the normal stands near edge-on (f = 1 − |n·z| in FREEZE_LIMB_BAND),
 * opened by the break about FREEZE_LIMB_BREAK[0] degrees; it brightens by FREEZE_LIMB_GAIN and swells
 * by FREEZE_LIMB_SIZE, more toward the light. A copy carries FREEZE_LIMB_COPY of the base's ink.
 */
export function freezeLimb(restNormalView: Vec3, lightDir: Vec3, dress: number, copy: FreezeCopyIndex): { gain: number; size: number } {
  const [x, y, z] = restNormalView;
  const band = smoothstep(FREEZE_LIMB_BAND[0], FREEZE_LIMB_BAND[1], 1 - Math.abs(z));
  const angle = (Math.atan2(y, x) * 180) / Math.PI;
  const apart = Math.abs(mod(angle - FREEZE_LIMB_BREAK[0] + 180, 360) - 180);
  const open = smoothstep(0, FREEZE_LIMB_BREAK[1], apart);
  const ink = band * open * dress * (copy === 0 ? 1 : FREEZE_LIMB_COPY);
  const lit = Math.max(0, x * lightDir[0] + y * lightDir[1] + z * lightDir[2]);
  const weight = FREEZE_LIMB_WEIGHT[0] + FREEZE_LIMB_WEIGHT[1] * lit;
  return { gain: 1 + (FREEZE_LIMB_GAIN - 1) * ink, size: 1 + (FREEZE_LIMB_SIZE - 1) * ink * weight };
}

/** A burst's hash `j` of dash `i` (0 the stagger, 1 and 2 the two length sets, 3 the wink). */
function tickHash(source: TickSource, i: number, j: number): number {
  return hash01(FREEZE_TICK_SEED, FREEZE_TICK_SALT + (source === 'moon' ? 0 : 256) + i * 4 + j);
}

/**
 * Mote `j` of dash `i` of a source's burst, for the twos' length set `variant` (0 or 1), the fix's
 * `v`, how far its planet's shell is out (`scatterOut`, 0..1: the planet's dashes start
 * FREEZE_TICK_PLANET.out further while it is) and the screen angle from the planet toward the moon
 * (`toMoon`, the planet's gap): the dash's screen angle about its source; where it starts, in the
 * source's screen radius (`radius`); how far out along it this mote stands, CSS px from that start
 * (`len`); and whether it is drawn (`visible`, 0 or 1): not in the planet's gap, not dropped as the fix
 * lands (a dash keeps min(1, FREEZE_TICK_KEEP v) of its motes, from its inner end) and not winked out
 * (once 1 − v passes FREEZE_TICK_WINK[0] + FREEZE_TICK_WINK[1] of its own hash). At v = 0 none is.
 */
export function freezeTick(
  source: TickSource,
  i: number,
  j: number,
  variant: 0 | 1,
  v: number,
  scatterOut: number,
  toMoon: number,
): { angle: number; radius: number; len: number; visible: number } {
  const planet = source === 'planet';
  const n = planet ? FREEZE_TICK_PLANET.n : FREEZE_TICK_MOON.n;
  const motes = planet ? FREEZE_TICK_PLANET.motes : FREEZE_TICK_MOON.motes;
  const lens = planet ? FREEZE_TICK_PLANET.len : FREEZE_TICK_MOON.len;
  const angle = (TAU * i) / n + (planet ? Math.PI / n : 0) + (tickHash(source, i, 0) - 0.5) * FREEZE_TICK_STAGGER;
  const radius = planet ? FREEZE_TICK_PLANET.r0 + FREEZE_TICK_PLANET.out * scatterOut : FREEZE_TICK_MOON.r0;
  const u = j / (motes - 1);
  const len = u * (lens[0] + (lens[1] - lens[0]) * tickHash(source, i, 1 + variant));
  const gone = 1 - v > FREEZE_TICK_WINK[0] + FREEZE_TICK_WINK[1] * tickHash(source, i, 3);
  const kept = u <= Math.min(1, FREEZE_TICK_KEEP * v);
  const inGap = planet && angleApart(angle, toMoon) < FREEZE_TICK_PLANET.gapHalf;
  return { angle, radius, len, visible: !gone && kept && !inGap ? 1 : 0 };
}

/** How far a source's burst has come in with the dressing (0..1): the planet's a beat before the moon's. */
export function freezeTickShow(source: TickSource, dress: number): number {
  const [a, b] = source === 'moon' ? FREEZE_TICK_SHOW_MOON : FREEZE_TICK_SHOW_PLANET;
  return smoothstep(a, b, dress);
}

/** Whether dash `i` of a source's burst is drawn warm (else cold): they alternate, the planet's a dash out of step with the moon's. */
export function freezeTickWarm(source: TickSource, i: number): boolean {
  return (i + (source === 'moon' ? 0 : 1)) % 2 === 1;
}

/** The twos' tick at the live ambient (s), or 0 where the ambient is not live (test mode, reduced motion, `?ambient=`). */
export function freezeTwos(live: number | null): number {
  return live === null ? 0 : Math.floor(FREEZE_TWOS_HZ * live);
}

/** The copies' breath at twos tick `twos` (CSS px along the rolled screen x): ±FREEZE_BREATH_PX / 2, none while the twos are off (tick 0). */
export function freezeBreath(twos: number): number {
  return twos > 0 ? (hash01(FREEZE_TICK_SEED, twos) - 0.5) * FREEZE_BREATH_PX : 0;
}
