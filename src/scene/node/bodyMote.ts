// Reference implementation of the galaxy's motes in motion (docs/specs/2026-10-07-galaxy-orbits.md
// §14.4, §14.5, §15; morph-and-scatter §2, §3.1, §3.2): how a body is built by its motes flying in
// from its parent, lit, dimmed by the lamp, fixed by the person's motes, and, where it carries the
// defect, derped on its orbit and its shell morphed and scattered. The GLSL in bodyMote.glsl mirrors
// it step for step; the parity page (`?lib=body`) compares them. Only operations GLSL has are used,
// and both mirrors read the constants of birth.ts and lod.ts (spliced into the GLSL) and the same
// float32 textures: the bodies and streams (bodyData.ts) and the shells at the frame's ambient
// (bodyAttrs.ts packShellData). Nothing is integrated: a mote is a pure function of its attributes,
// the story's clocks (scroll) and the ambient clock.
//
// The roles (BodyMoteAttrs.role):
//  - Builder, a lattice mote of a core body or a planet, or a star's dot: it sets out from its
//    stream's parent (spread by the parent's radius), flies the stream's curve (streamControl: the
//    midpoint bowed STREAM_BOW of the chord toward its bowBearing) and lands on its lattice point on
//    the shell (a star's dot at its own place in the star's cloud, star.ts starDot), in the order the
//    shell wraps outward from the stream's arrival side; a body nothing built falls from above it. On
//    `net.growth`, within its body's [born, born + dur].
//  - Moon, a lattice mote of a moon: it flies its planet's stream the same way, and every mote of
//    the moon lands at the moon's birth (the last 30 % of its planet's build: one event, a flare).
//  - Person, the person's warm mote for a fix: it falls from above the piece (the planet, for a
//    moon's) onto its host's sphere (the body itself, row = host), on `net.fix`, and stays there as
//    amber dust. On the planet lamp's subject it is home by the body's nodeLanded(fixAt), before the
//    piece glows (fixPulse) and mends (the author on v25: the gold lands, then glows, then the piece
//    mends); on any other body, seen from afar in the sweep, it lands at its fixAt, with the mend.
//
// The defect, on a body that carries it (its derp seed), scaled by lodGain(Derp) on top of derp()'s
// own `v` (the fix), and none on the planet lamp's subject's paths (focusDerp, the author on v25: no
// elastic skip, no moon wobble at the close-up): a planet's and a moon's orbit derp goes on ν, r and
// the lift after Kepler, in the galaxy's plane about its host, on its own (possibly quantised) clock;
// a star and a core body shiver; every one of them offsets by the wobble; the shell takes the morph (A·v·gain) and the
// scatter (its leap and ring at v·gain), and after the scatter the leak (leak.ts, re-skin Task 8b: its
// wounds move and dim their dots, at v·gain), the focused planet's every slot a scatter
// (focusScatter). A star's dot cloud takes them as a shell does, each dot by
// its own direction: the morph scales its distance from the centre, the scatter flings it along it. Its host is where its host would be without the derp, so a
// moon keeps its track while its planet stutters (src/galaxy/ambient.ts pinnedMoon is this
// composition; bodyMote.test.ts holds the two together).
//
// The light: a star's dots are its brightness × their own gain × its breath (star.ts, its look in the
// bodies texture's T7); lit (nodeLight's hi, by hiAt on `net.highlight`, the surge by hop), a shell's motes are
// ember (NODE_EMBER_MIX) and NODE_HI_GAIN brighter; fixed, a shell is tinted toward the person's
// amber (`warm`). The lamp (lampGain): a mote is lit iff its membership row at the lamp's level is
// the focus body's, else dark; inside, `net.focus` dims all but the subject to LAMP_FLOOR. A planet's
// and a moon's shell motes are shaded by their terminator toward their own star (terminator.ts, re-skin
// Task 7: bodyShade), on the mote's rest normal, so a scattered or leaking dot keeps its own side's
// light; a lit (ember) body is unshaded.
import type { Vec3 } from '../../math/vec';
import { Lamp } from '../../timeline/netTrack';
import {
  BODY_BUILD_JITTER,
  BODY_FALL_HEIGHT,
  BODY_WARM,
  BODY_WARM_MOON,
  BURST_GHOST_GAIN,
  FIX_PULSE,
  FOCUS_GAIN,
  FREEZE_DIM,
  FREEZE_FLASH,
  FREEZE_GREY,
  FREEZE_GREY_MIX,
  FREEZE_SCATTER_S,
  FREEZE_WARM_MODE,
  hexToRgb,
  LAMP_FLOOR,
  NODE_BIRTH_WINDOW,
  NODE_BUILDER_SPREAD,
  NODE_FIX_WINDOW,
  NODE_FLARE_GAIN,
  NODE_FLARE_WIDTH,
  NODE_HI_GAIN,
  NODE_LAND_WINDOW,
  NODE_PERSON_BOW,
  NODE_PERSON_HEIGHT,
  NODE_PERSON_SPREAD,
  NODE_SETTLED_BRIGHTNESS,
  NodeRole,
  SCATTER_AMP,
  SCATTER_MOON_CAP,
  SCATTER_OUT_GAIN,
  FOCUS_SCATTER,
  NODE_NEVER,
} from './birth';
import { SHELL_LEAK_AT, SHELL_TEXELS } from './bodyAttrs';
import { BODY_KIND, bodyTexel, type BodyData } from './bodyData';
import { derp, type Derp } from './derp';
import { freezeCopy, freezeScatterFill, type FreezeCopyIndex } from './freeze';
import { nodeArrival, nodeLanded, nodeLight, nodePulse, nodeSettle, nodeSpread } from './light';
import { LOD_VISIBLE, LodElement, lodGain } from './lod';
import { bodyWorld, elementsAt, galaxyTurn, orbitLocal, orbitTurns } from './orbit';
import { llUnit, moteHashes, shellHome, shellK, shellWarpLeak, spinShell, type Shape, type ShellEvent } from './shell';
import { unpackLeak, type Wound } from './leak';
import { starBreath, starDot, starDotPolar } from './star';
import { streamControl } from './stream';
import { PLANET_LOOK } from './classLook';
import { lightDir, terminator } from './terminator';
import type { StarLook } from '../../galaxy/body';

/** What a mote of the galaxy is (bodyAttrs.ts packs these into its instance attributes). */
export interface BodyMoteAttrs {
  /** The body it belongs to: its lattice's, or (a person mote) the one it lands on. */
  row: number;
  /** NodeRole.Builder, NodeRole.Moon or NodeRole.Person. */
  role: NodeRole;
  /** Its lattice point (a person mote: its rest point on its host's sphere). */
  ll: { lat: number; lon: number };
  /** A builder's own hash in [0, 1): its jitter in the shell's landing order. */
  birth: number;
  /** The seed its spread is hashed from (24 bits). */
  seed: number;
  /** A builder's and a moon mote's stream (its row in the streams texture, −1 if none); a person mote's host (its row). */
  host: number;
  /** Its lattice index (a person mote: its index in its body's set): its hashes are moteHashes(shellSeed, index). */
  index: number;
  /** Its body's system (an index into `sysPx`), −1 for the core. */
  sys: number;
}

/** The clocks a mote reads: the story's (scroll), the ambient, the lamp's, and each system's size on screen (CSS px, `uSysPx`). */
export interface BodyClocks {
  growth: number;
  fix: number;
  highlight: number;
  show: number;
  ambient: number;
  focus: number;
  lamp: Lamp;
  lampRow: number;
  sysPx: Float32Array;
  /**
   * The row whose derp the freeze frame's hold replaces with a scatter FREEZE_SCATTER_S in (the held
   * planet, when the pin's search found none in frame: freeze-frame §1.2's `forced-scatter`); −1 or
   * absent, none (`uForcedScatter`).
   */
  forcedScatter?: number;
  /**
   * The freeze frame holds (`freeze.hold` up in a focused frame, the pin shown): the focus's forced
   * scatter, the leak and the dropout stand down, so the held frame is the freeze's (re-skin Task 8b;
   * `uHolding`). Absent: not held.
   */
  holding?: boolean;
  /** The freeze frame's dressing (absent: none, as every frame outside the defect's close-up). */
  freeze?: FreezeClocks;
}

/**
 * The freeze frame's clocks a mote reads (freeze-frame §2.1, §3.1): the dressing and the flash (the
 * shaders' uDress and uFlash · uFlashOn, each times `net.focus` there as here), which copy of the held
 * piece is drawn (0 the base, 1 cold, 2 warm: uCopy), and the held moon's and planet's rows (uHeld; −1
 * none). The piece is the held planet and its moons.
 */
export interface FreezeClocks {
  dress: number;
  flash: number;
  copy: FreezeCopyIndex;
  moon: number;
  planet: number;
}

/** The freeze frame's clocks outside it: what the shaders' uniforms hold by default. */
const NO_FREEZE_CLOCKS: FreezeClocks = { dress: 0, flash: 0, copy: 0, moon: -1, planet: -1 };

/**
 * The freeze frame's look on a mote, a body or a dot of `row` at its fix's `v`, before the camera: its
 * brightness as a multiple of its own, how far off its place it is drawn along the rolled screen x (CSS
 * px), and the colour it is mixed toward (rgb, and how far: a). On the held piece, the base takes the
 * flash (FREEZE_FLASH, toward white) and each copy freezeCopy's offset, gain and colour; everything
 * else is dimmed to FREEZE_DIM and mixed toward FREEZE_GREY by the dressing, and has no copy (gain 0).
 * Every term is times `net.focus`: off a focused frame the dressing cannot show. The limb is the shell
 * draw's own (shell.vert.glsl, freezeLimb on the mote's rest normal in view space).
 */
export function freezeLook(row: number, v: number, c: Pick<BodyClocks, 'focus' | 'freeze'>, data: BodyData): { gain: number; offPx: number; tint: [number, number, number, number] } {
  // No freeze frame is the shaders' idle uniforms: no dressing, no flash, the base, nothing held.
  const f = c.freeze ?? NO_FREEZE_CLOCKS;
  const dress = f.dress * c.focus;
  const flash = f.flash * c.focus;
  const piece = f.planet >= 0 && pieceOf(data, row) === f.planet;
  if (!piece) {
    if (f.copy > 0) return { gain: 0, offPx: 0, tint: [0, 0, 0, 0] };
    return { gain: 1 - (1 - FREEZE_DIM) * dress, offPx: 0, tint: [...FREEZE_GREY_RGB, FREEZE_GREY_MIX * dress] };
  }
  const copy = freezeCopy(f.copy, dress, v, FREEZE_WARM_MODE, row === f.moon);
  if (f.copy > 0) return { gain: copy.gain, offPx: copy.offPx, tint: [...copy.tint, 1] };
  return { gain: 1 + FREEZE_FLASH.gain * flash, offPx: 0, tint: [1, 1, 1, FREEZE_FLASH.white * flash] };
}

/**
 * The icosphere's fill on `row`, as a multiple of PLANET_LOOK.fill (body.vert.glsl; bodyMote.glsl
 * heldFill): the scatter haze (freezeScatterFill) on the held planet (the freeze's, uHeld) while the
 * freeze holds (uHolding) and its scatter seconds `scatterS` (bodyDerp's) are in the window; 1 on every
 * other row and frame. It keys on the hold, not the dressing, so the focused planet's own scatters
 * (re-skin Task 8b, df-1 and after the fix) never touch its fill.
 */
export function heldFill(row: number, scatterS: number, c: Pick<BodyClocks, 'holding' | 'freeze'>): number {
  return freezeScatterFill(c.holding === true && (c.freeze?.planet ?? -1) === row, scatterS);
}

export interface BodyMoteOut {
  pos: Vec3;
  /** Unit world normal (its lattice point's, spun). */
  normal: Vec3;
  /** Its brightness before the camera's (moteLight, the overlap cap): flight, flare, light, scatter, lamp, level of detail, presence. */
  brightness: number;
  visible: boolean;
  /** How far it has landed, 0 in flight to 1. */
  settled: number;
  /** How far its colour is mixed toward ember (× NODE_EMBER_MIX): max(highlight, surge). */
  hi: number;
  /** How far its colour is mixed toward the person's amber: 1 for a person mote, a fixed shell's tint. */
  warm: number;
  /** The freeze frame's colour on it (rgb) and how far it is mixed toward it (a): freezeLook's. */
  tint: [number, number, number, number];
  /** How far off its place it is drawn along the rolled screen x (CSS px): a copy's (freezeLook). */
  offPx: number;
}

const FREEZE_GREY_RGB = hexToRgb(FREEZE_GREY);

/** The textures a mote reads: the bodies and streams, and the shells at the frame's ambient (packShellData). */
export type BodyMoteData = BodyData & { shells: Float32Array };

// GLSL semantics.
const mix = (a: number, b: number, t: number): number => a * (1 - t) + b * t;
function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1);
  return t * t * (3 - 2 * t);
}
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];

/** Texel `t` of a body's row of the shell texture. */
export function shellTexel(shells: Float32Array, t: number, row: number): [number, number, number, number] {
  const i = (row * SHELL_TEXELS + t) * 4;
  return [shells[i], shells[i + 1], shells[i + 2], shells[i + 3]];
}

/** An element's gain at system `sys`'s size: 1 for the core (sys −1), which is no system: its bodies and their derps are drawn at every level. */
export function sysGain(el: LodElement, sys: number, sysPx: Float32Array): number {
  return sys < 0 ? 1 : lodGain(el, sysPx[sys]);
}

/** A body's kind, as the texture numbers it (bodyData.ts BODY_KIND). */
const kindOf = (data: BodyData, row: number): number => Math.round(bodyTexel(data.bodies, 0, row)[3]);

/** A star's look as the bodies texture's T7 holds it (its temperature is in its tint, T6: 0 here). */
export function bodyStarLook(data: BodyData, row: number): StarLook {
  const [brightness, spikes, period, phase] = bodyTexel(data.bodies, 7, row);
  return { brightness, spikes: spikes === 6 ? 6 : 4, temperature: 0, period, phase };
}

/** A row's piece: a planet's own row, a moon's planet; −1 for the core and the stars. */
export function pieceOf(data: BodyData, row: number): number {
  const k = kindOf(data, row);
  if (k === BODY_KIND.planet) return row;
  return k === BODY_KIND.moon ? Math.round(bodyTexel(data.bodies, 3, row)[0]) : -1;
}

/**
 * Whether `row` is in the lamp's lit set at `level` about the focus body `focus` (−1 none): its
 * piece is the focus's (Planet), its star (Star), it is any body (Hood: the neighbourhood and the
 * core), a core body (Core), its rule is the focus's, or it is a core body (Lineage), or it is any
 * body but the core's (Arms). Off lights everything.
 */
export function lampLit(row: number, level: Lamp, focus: number, data: BodyData): boolean {
  const kind = kindOf(data, row);
  if (level === Lamp.Off || level === Lamp.Hood) return true;
  if (level === Lamp.Core) return kind === BODY_KIND.core;
  if (level === Lamp.Arms) return kind !== BODY_KIND.core;
  if (level === Lamp.Lineage && kind === BODY_KIND.core) return true;
  if (focus < 0) return false;
  if (level === Lamp.Planet) {
    const p = pieceOf(data, focus);
    return p >= 0 && pieceOf(data, row) === p;
  }
  const t = level === Lamp.Star ? 2 : 3; // T5.z the star, T5.w the rule
  return Math.round(bodyTexel(data.bodies, 5, row)[t]) === Math.round(bodyTexel(data.bodies, 5, focus)[t]);
}

/** The lamp's subject: the focus body itself, and, for a piece, all of it (its planet and moons). */
function lampSubject(row: number, focus: number, data: BodyData): boolean {
  if (focus < 0) return false;
  if (row === focus) return true;
  const p = pieceOf(data, focus);
  return p >= 0 && pieceOf(data, row) === p;
}

/**
 * The lamp's gain on a body's motes (and its body, glow, tracks): 0 outside the lit set, 1 inside
 * it, or at `focus` 1 LAMP_FLOOR for everything but the subject. Off is 1 everywhere.
 */
export function lampGain(row: number, c: Pick<BodyClocks, 'lamp' | 'lampRow' | 'focus'>, data: BodyData): number {
  const level = Math.round(c.lamp) as Lamp;
  if (level === Lamp.Off) return 1;
  if (!lampLit(row, level, c.lampRow, data)) return 0;
  return lampSubject(row, c.lampRow, data) ? 1 : mix(1, LAMP_FLOOR, c.focus);
}

/** Whether `row` is the planet lamp's subject (the focused piece: its planet and moons). */
function planetLampSubject(row: number, c: Pick<BodyClocks, 'lamp' | 'lampRow'>, data: BodyData): boolean {
  return Math.round(c.lamp) === Lamp.Planet && lampSubject(row, c.lampRow, data);
}

/**
 * The focused piece's light (FOCUS_GAIN, the author's Task 12 addition): under the planet lamp its
 * motes, points and bodies are mix(1, FOCUS_GAIN, focus) as bright; everything else 1. Its tracks are not.
 */
export function focusGain(row: number, c: Pick<BodyClocks, 'lamp' | 'lampRow' | 'focus'>, data: BodyData): number {
  return planetLampSubject(row, c, data) ? mix(1, FOCUS_GAIN, c.focus) : 1;
}

/**
 * How much of its own orbit derp a body keeps (its scatter is its shell's and stays): the planet lamp's
 * subject, its planet and its moons, none at any focus (the author on v25: the skip's elastic snap, on
 * the planet as the focus came up and on all six moons at once, and the moons' wobble while the scatter,
 * the leak and the dropout play, are gone), save its moons while the freeze holds, which keep the derp
 * the pin caught (the moon off its path beside its ghost); every other body all of it. The lamp steps onto
 * C1 where its system is under its derps' level of detail (lodGain(Derp) 0), so the step shows nothing.
 */
export function focusDerp(row: number, c: Pick<BodyClocks, 'lamp' | 'lampRow' | 'holding'>, data: BodyData): number {
  if (!planetLampSubject(row, c, data)) return 1;
  return c.holding === true && kindOf(data, row) === BODY_KIND.moon ? 1 : 0;
}

/**
 * The fix's gold pulse on `row` (the author on v25; FIX_PULSE): on the planet lamp's subject, its planet
 * and its moons together, nodePulse of its fixAt at `net.fix`, times `net.focus`; 0 on every other body.
 * It runs after the person's motes are home and before the mend begins.
 */
export function fixPulse(row: number, c: Pick<BodyClocks, 'lamp' | 'lampRow' | 'focus' | 'fix'>, data: BodyData): number {
  if (!planetLampSubject(row, c, data)) return 0;
  return nodePulse(bodyTexel(data.bodies, 4, row)[0], c.fix) * c.focus;
}

/**
 * The row whose derp is a scatter in every slot (re-skin Task 8b, the controller's ruling 1), −1 none:
 * the planet lamp's subject planet, while it carries the defect and `net.focus` is over FOCUS_SCATTER,
 * so a scatter (and its wounds) lands within NODE_DERP_PERIOD + (NODE_DERP_PERIOD − NODE_DERP_DUR) s
 * wherever the ambient stands. Its orbit derps are gone there (focusDerp), and its moons keep their
 * own schedules' scatters, on their paths. Not under the freeze: while it holds, or forces a row of its own, the held
 * frame is the freeze's.
 */
export function focusScatterRow(c: Pick<BodyClocks, 'lamp' | 'lampRow' | 'focus' | 'forcedScatter' | 'holding'>, data: BodyData): number {
  if (c.holding === true || (c.forcedScatter !== undefined && c.forcedScatter >= 0)) return -1;
  if (Math.round(c.lamp) !== Lamp.Planet || c.lampRow < 0 || !(c.focus > FOCUS_SCATTER)) return -1;
  const planet = pieceOf(data, c.lampRow);
  if (planet < 0 || kindOf(data, planet) !== BODY_KIND.planet || bodyTexel(data.bodies, 5, planet)[0] === NODE_NEVER) return -1;
  return planet;
}

/** Whether `row`'s derp is a scatter in every slot (focusScatterRow; bodyMote.glsl focusScatter). */
export function focusScatter(row: number, c: Pick<BodyClocks, 'lamp' | 'lampRow' | 'focus' | 'forcedScatter' | 'holding'>, data: BodyData): boolean {
  return row === focusScatterRow(c, data);
}

/**
 * A dotted orbit's or moon track's gain under the lamp (track.vert.glsl's, bodyMote.glsl
 * trackLampGain): the gain of the body in its row (a planet's orbit round its star, a moon's track
 * round its planet), save that under the planet lamp the lit planet's own orbit (the one planet row
 * that lamp lights) is never drawn: it belongs to the star, not to the piece. Task 10 faded it with
 * `focus`; its review found it standing in the text band on a landscape screen wherever the focus is
 * below 1 (up to 83 px in over the push-in, 33 px as the dive lands at focus 0), so no gate on the
 * focus clears it: it is dark at every focus.
 */
export function trackLampGain(row: number, c: Pick<BodyClocks, 'lamp' | 'lampRow' | 'focus'>, data: BodyData): number {
  return Math.round(c.lamp) === Lamp.Planet && kindOf(data, row) === BODY_KIND.planet ? 0 : lampGain(row, c, data);
}

/**
 * The terminator's light on a planet's or moon's surface of rest normal `n` at ambient `t` (re-skin §4.4):
 * terminator(n, lightDir, night), its night PLANET_LOOK.night.subject on the planet lamp's subject and
 * PLANET_LOOK.night.rest everywhere else, mixed to 1 by `hi` (a lit body glows everywhere). Every
 * other body, 1. The icosphere's fragments take the same (body.vert.glsl, body.frag.glsl).
 */
export function bodyShade(row: number, n: Vec3, hi: number, t: number, c: Pick<BodyClocks, 'lamp' | 'lampRow'>, data: BodyData): number {
  const kind = kindOf(data, row);
  if (kind !== BODY_KIND.planet && kind !== BODY_KIND.moon) return 1;
  const night = planetLampSubject(row, c, data) ? PLANET_LOOK.night.subject : PLANET_LOOK.night.rest;
  return mix(terminator(n, lightDir(data, row, t), night), 1, hi);
}

/** A body's light at the story's clocks (light.ts nodeLight over its T4: fixAt, hiAt, hop). */
export function bodyLight(row: number, c: Pick<BodyClocks, 'fix' | 'highlight'>, data: BodyData) {
  const [fixAt, hiAt, hop] = bodyTexel(data.bodies, 4, row);
  return nodeLight(fixAt, hiAt, hop, c);
}

/**
 * How far a body has come up by `growth`: 0 before its window opens, 1 once built
 * (smoothstep(born − NODE_BIRTH_WINDOW, born + dur, growth)). A body's point, glow, mesh and tracks
 * come up with it.
 */
export function bodyPresence(row: number, growth: number, data: BodyData): number {
  const [, , born, dur] = bodyTexel(data.bodies, 3, row);
  return nodeArrival(born + dur, growth, dur + NODE_BIRTH_WINDOW);
}

/**
 * A body's derp at the ambient, its terms scaled by lodGain(Derp) (or `gain`) on top of derp()'s own
 * `v`; scatterS is a clock and is not. The freeze's forced row (`c.forcedScatter`) is a scatter
 * FREEZE_SCATTER_S in and nothing else, whatever its schedule says: the shell scales it by `v` itself.
 * The focused defective planet (focusScatter) scatters in every slot of its schedule.
 */
export function bodyDerp(row: number, sys: number, c: BodyClocks, data: BodyData, gain = sysGain(LodElement.Derp, sys, c.sysPx)): Derp {
  if (c.forcedScatter !== undefined && c.forcedScatter >= 0 && row === c.forcedScatter)
    return { dNu: 0, dR: 0, lift: 0, wobble: [0, 0, 0], orbitT: 0, ghost: 0, ghostNu: 0, scatterS: FREEZE_SCATTER_S };
  const kind = kindOf(data, row);
  const [seed, phase] = bodyTexel(data.bodies, 5, row);
  const R = bodyTexel(data.bodies, 3, row)[1];
  const o = elementsAt(data, row);
  const omega = o.period > 0 ? (2 * Math.PI) / o.period : 0;
  const v = 1 - bodyLight(row, c, data).fix;
  const name = kind === BODY_KIND.core ? 'core' : kind === BODY_KIND.star ? 'star' : kind === BODY_KIND.planet ? 'planet' : 'moon';
  const d = derp(seed, phase, c.ambient, name, o.a, R, omega, v, focusScatter(row, c, data));
  const g = gain * focusDerp(row, c, data);
  return {
    dNu: d.dNu * g,
    dR: d.dR * g,
    lift: d.lift * g,
    wobble: scale(d.wobble, g),
    orbitT: d.orbitT * g,
    ghost: d.ghost * g,
    ghostNu: d.ghostNu * g,
    scatterS: d.scatterS,
  };
}

/** A vector of the galaxy's own frame turned into the world's at ambient `t` (bodyWorld's turn, without its anchor). */
function turnVec(p: Vec3, t: number): Vec3 {
  const a = galaxyTurn(t);
  const cs = Math.cos(a);
  const sn = Math.sin(a);
  return [p[0] * cs + p[2] * sn, p[1], -p[0] * sn + p[2] * cs];
}

/** `p` turned about +y by `a` from x toward z (the bearing's sense), and pushed `dR` further out in the plane. */
function aboutY(p: Vec3, a: number, dR: number): Vec3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  const x = p[0] * c - p[2] * s;
  const z = p[0] * s + p[2] * c;
  const flat = Math.sqrt(x * x + z * z);
  const push = flat > 0 ? 1 + dR / flat : 1;
  return [x * push, p[1], z * push];
}

/**
 * Where a body is drawn at the ambient, its derp `d` on (bodyDerp): an orbiting body at its place
 * about its host (where its host would be undisturbed) on its own clock t + orbitT, turned along by
 * dNu and pushed off its track by dR in the galaxy's plane, lifted by `lift`; a star or a core body
 * at its spot; and every body offset by the wobble.
 */
export function bodyCentre(row: number, d: Derp, t: number, data: BodyData): Vec3 {
  const host = Math.round(bodyTexel(data.bodies, 3, row)[0]);
  if (host < 0) return add(bodyWorld(data, row, t), d.wobble);
  const local = aboutY(orbitLocal(elementsAt(data, row), t + d.orbitT), d.dNu, d.dR);
  local[1] += d.lift;
  return add(add(bodyWorld(data, host, t), turnVec(local, t)), d.wobble);
}

/**
 * A dotted orbit's or track's dot (track.vert.glsl's twin): on the ellipse of the body in `row` (a
 * planet's orbit round its star, or a moon track round its planet) at its own mean anomaly `turns`,
 * whatever the body's own place: the ellipse precesses and turns with the galaxy, and the dot stays
 * put on it. A dot at the body's own mean anomaly is the body (bodyWorld).
 */
export function trackDot(row: number, turns: number, t: number, data: BodyData): Vec3 {
  const host = Math.round(bodyTexel(data.bodies, 3, row)[0]);
  const o = elementsAt(data, row);
  // orbitLocal reads fract(phase + orbitTurns(t, period)): this phase leaves the dot's own anomaly.
  const local = orbitLocal({ ...o, phase: turns - orbitTurns(t, o.period) }, t);
  return add(bodyWorld(data, host, t), turnVec(local, t));
}

/** The burst's ghost of an orbiting body: on its track at its undisturbed angle plus ghostNu, at BURST_GHOST_GAIN of `ghost`. */
export function bodyGhost(row: number, d: Derp, t: number, data: BodyData): { pos: Vec3; gain: number } {
  const host = Math.round(bodyTexel(data.bodies, 3, row)[0]);
  if (host < 0 || !(d.ghost > 0)) return { pos: bodyWorld(data, row, t), gain: 0 };
  const local = aboutY(orbitLocal(elementsAt(data, row), t), d.ghostNu, 0);
  return { pos: add(bodyWorld(data, host, t), turnVec(local, t)), gain: BURST_GHOST_GAIN * d.ghost };
}

/** Shape `a`, `b` of the shell texture as a Shape. */
function shapeOf(a: readonly number[], b: readonly number[]): Shape {
  return { p: a[0], q: a[1], p2: b[0], q2: b[1], phi: [a[2], a[3], b[2], b[3]] };
}

/** A body's scatter event as the shell texture holds it, with derp()'s clock. */
export function bodyShellEvent(row: number, sec: number, data: BodyMoteData): ShellEvent {
  const sweep = shellTexel(data.shells, 6, row);
  return {
    sec,
    sweep: [sweep[0], sweep[1], sweep[2]],
    n: 0,
    aftershock: sweep[3] > 0.5,
    shape: shapeOf(shellTexel(data.shells, 0, row), shellTexel(data.shells, 1, row)),
    next: shapeOf(shellTexel(data.shells, 4, row), shellTexel(data.shells, 5, row)),
  };
}

/** The wounds a body holds at ambient `t`, as the shell texture holds them (T7..T12, leak.ts packLeak): none on a healthy body. */
export function bodyLeak(row: number, t: number, data: BodyMoteData): Wound[] {
  return unpackLeak((j) => shellTexel(data.shells, SHELL_LEAK_AT + j, row), t);
}

/** The level-of-detail element a body's shell (and its person motes) come in by: a moon's, a planet's shell, or none (1). */
function shellElement(kind: number, sys: number, sysPx: Float32Array): number {
  if (kind === BODY_KIND.moon) return sysGain(LodElement.Moon, sys, sysPx);
  return kind === BODY_KIND.planet ? sysGain(LodElement.PlanetShell, sys, sysPx) : 1;
}

/**
 * Where a mote sets out and the control point it flies through to `land` (bodyMote's step 3): a
 * person mote falls from above its piece's planet, through a point above its flight's middle; a
 * builder or a moon mote sets out from its stream's parent, spread by the parent's radius, through the
 * stream's own control point, so it comes down the stream; a body nothing built falls from above it.
 */
export function bodyMoteFlight(a: BodyMoteAttrs, centre: Vec3, land: Vec3, t: number, data: BodyData): { spawn: Vec3; ctrl: Vec3 } {
  const j = nodeSpread(a.seed);
  const kind = kindOf(data, a.row);
  if (a.role === NodeRole.Person) {
    const piece = kind === BODY_KIND.moon ? Math.round(bodyTexel(data.bodies, 3, a.row)[0]) : a.row;
    const Rp = bodyTexel(data.bodies, 3, piece)[1];
    const spawn = add(add(bodyWorld(data, piece, t), [0, NODE_PERSON_HEIGHT * Rp, 0]), scale(j, NODE_PERSON_SPREAD * Rp));
    return { spawn, ctrl: add(scale(add(spawn, land), 0.5), [0, NODE_PERSON_BOW * Rp, 0]) };
  }
  if (a.host >= 0) {
    const [from, to] = bodyTexel(data.streams, 0, a.host);
    const parent = Math.round(from);
    const pa = bodyWorld(data, parent, t);
    const pb = bodyWorld(data, Math.round(to), t);
    return {
      spawn: add(pa, scale(j, NODE_BUILDER_SPREAD * bodyTexel(data.bodies, 3, parent)[1])),
      ctrl: streamControl(pa, pb, bodyTexel(data.streams, 1, a.host)[2]),
    };
  }
  const R = bodyTexel(data.bodies, 3, a.row)[1];
  const spawn = add(add(centre, [0, BODY_FALL_HEIGHT * R, 0]), scale(j, NODE_BUILDER_SPREAD * R));
  return { spawn, ctrl: scale(add(spawn, land), 0.5) };
}

/**
 * When a mote lands and on which clock (bodyMote's step 3): a person mote on `net.fix`, on the planet
 * lamp's subject by its body's nodeLanded(fixAt) over NODE_LAND_WINDOW (before its pulse and its mend),
 * on any other body at its fixAt over NODE_FIX_WINDOW (with its mend); a builder or a moon mote on
 * `net.growth` within its body's [born, born + dur], where its shell wraps outward from its stream's arrival side (a moon's: all at once, at the moon's birth).
 * `normal` is the mote's lattice normal as spun at the ambient.
 */
export function bodyMoteSettle(a: BodyMoteAttrs, normal: Vec3, c: BodyClocks, data: BodyData): { settle: number; clock: number; window: number } {
  if (a.role === NodeRole.Person) {
    const fixAt = bodyTexel(data.bodies, 4, a.row)[0];
    // On the planet lamp's subject the gold is home before its pulse and its mend (the author on v25);
    // everywhere else (the sweep, seen from afar) it lands with the mend, as it always has.
    return planetLampSubject(a.row, c, data)
      ? { settle: nodeLanded(fixAt), clock: c.fix, window: NODE_LAND_WINDOW }
      : { settle: fixAt, clock: c.fix, window: NODE_FIX_WINDOW };
  }
  const [, , born, dur] = bodyTexel(data.bodies, 3, a.row);
  let arrival: Vec3 = [0, 1, 0];
  if (a.host >= 0) {
    const pa = bodyWorld(data, Math.round(bodyTexel(data.streams, 0, a.host)[0]), c.ambient);
    const self = bodyWorld(data, a.row, c.ambient);
    const toward: Vec3 = [pa[0] - self[0], pa[1] - self[1], pa[2] - self[2]];
    const len = Math.sqrt(toward[0] * toward[0] + toward[1] * toward[1] + toward[2] * toward[2]);
    if (len > 1e-6) arrival = scale(toward, 1 / len);
  }
  // The shell wraps outward from its arrival side, each mote's place in that order jittered by its own hash.
  const wrap = 0.5 * (1 - (normal[0] * arrival[0] + normal[1] * arrival[1] + normal[2] * arrival[2]));
  return { settle: nodeSettle(born, dur, mix(wrap, a.birth, BODY_BUILD_JITTER)), clock: c.growth, window: NODE_BIRTH_WINDOW };
}

export function bodyMote(a: BodyMoteAttrs, c: BodyClocks, data: BodyMoteData): BodyMoteOut {
  const t = c.ambient;
  const row = a.row;
  const kind = kindOf(data, row);
  const R = bodyTexel(data.bodies, 3, row)[1];
  const person = a.role === NodeRole.Person;
  // A star's dot: its own direction (lat, lon) and distance from the centre in R, in place of a lattice point.
  const dot = kind === BODY_KIND.star && !person ? starDotPolar(a.index, a.seed) : null;
  const ll = dot ? dot.ll : a.ll;

  // 1. The body as drawn: its derp, its light, the fix's v, and where the shell is.
  const d = bodyDerp(row, a.sys, c, data);
  const light = bodyLight(row, c, data);
  const v = 1 - light.fix;
  const centre = bodyCentre(row, d, t, data);
  const axisA = shellTexel(data.shells, 2, row);
  const axis: Vec3 = [axisA[0], axisA[1], axisA[2]];
  const normal = spinShell(llUnit(ll), axis, t);

  // 2. Where it lands: a lattice mote on its shell, the morph and the scatter on it (a moon's leap
  // capped); a star's dot at its distance along its direction, the morph scaling that distance and
  // the scatter flinging it along it; a person mote on its host's sphere.
  let land: Vec3;
  let k = 0;
  // The leak's light on a leaking dot (re-skin Task 8b): it dims as it seeps out.
  let leakLight = 1;
  if (person) {
    land = add(centre, scale(normal, R));
  } else {
    const seed = shellTexel(data.shells, 3, row)[2];
    const h = moteHashes(seed, a.index);
    const ev = bodyShellEvent(row, d.scatterS, data);
    const g = v * sysGain(LodElement.Derp, a.sys, c.sysPx);
    const cap = kind === BODY_KIND.moon ? SCATTER_MOON_CAP : SCATTER_AMP[0] + SCATTER_AMP[1];
    const leaked = shellWarpLeak(ll, h, a.index, t, ev, axisA[3] * g, g, cap, bodyLeak(row, t, data));
    let warp = leaked.p;
    if (dot) warp = add(warp, scale(shellHome(ll, h, t, ev, axisA[3] * g, g), dot.rho - 1));
    land = add(centre, scale(spinShell(warp, axis, t), R));
    k = shellK(ll, h, ev) * g;
    leakLight = leaked.light;
  }

  // 3. Where it sets out, through what, and when.
  const { spawn, ctrl } = bodyMoteFlight(a, centre, land, t, data);
  const { settle, clock, window } = bodyMoteSettle(a, normal, c, data);
  const tt = nodeArrival(settle, clock, window);
  const e = 1 - (1 - tt) * (1 - tt) * (1 - tt);
  const om = 1 - e;
  const pos: Vec3 = [0, 1, 2].map((i) => om * om * spawn[i] + 2 * om * e * ctrl[i] + e * e * land[i]) as Vec3;

  // 4. Outputs: the flight's and the landing's light, the highlight, the scatter's halo, the lamp and the level of detail.
  const flare = 1 - smoothstep(0, NODE_FLARE_WIDTH, Math.abs(clock - settle));
  const lamp = lampGain(row, c, data);
  const el = shellElement(kind, a.sys, c.sysPx);
  const hi = person ? 0 : light.hi;
  const surge = person ? 0 : light.surge;
  const look = freezeLook(row, v, c, data);
  // A star's dot: its star's brightness, its own gain by its distance, the star's breath.
  const star = dot ? bodyStarLook(data, row) : null;
  const self = star ? star.brightness * starDot(a.index, a.seed).gain * starBreath(star, t) : 1;
  // A planet's or moon's shell mote: its terminator on its rest normal (the person's dust is unshaded).
  const shade = person ? 1 : bodyShade(row, normal, Math.max(hi, surge), t, c, data);
  // The fix's gold pulse on the focused piece, between the landing and the mend.
  const pulse = fixPulse(row, c, data);
  const brightness =
    (mix(1 / NODE_SETTLED_BRIGHTNESS, 1, tt) + NODE_FLARE_GAIN * flare) * (1 + NODE_HI_GAIN * hi + surge) * (1 + SCATTER_OUT_GAIN * k) * leakLight * c.show * lamp * el * look.gain * focusGain(row, c, data) * self * shade * (1 + FIX_PULSE.gain * pulse);
  return {
    pos,
    normal,
    brightness,
    visible: c.show > 0 && clock >= settle - window && lamp > 0 && el >= LOD_VISIBLE && look.gain > 0,
    settled: tt,
    hi: Math.max(hi, surge),
    warm: person ? 1 : Math.max(light.fix * (kind === BODY_KIND.moon ? BODY_WARM_MOON : BODY_WARM), FIX_PULSE.warm * pulse),
    tint: look.tint,
    offPx: look.offPx,
  };
}
