// Reference implementation of the plan's schematic (re-skin §4.7, Task 7b; the author's concepts R and
// H, scratch/session/schematic/mock.html `drawRH`): every plan dot of net-plan and net-plan-screen, as
// plan.glsl and planScreen.glsl draw it, step for step; the parity page (`?lib=plan`) compares them. It
// also frames what every dot reads of a frame (planFrameOf: each system's size, full-detail gain, cull
// and real share, the systems in R, their focused bodies, and the layout of the two shared pools over the
// systems on screen: planLayout), which bodySystem.ts hands the shaders as uniforms and a table, and the
// tests and the test hook (BodySystem.plan) read through this twin.
//
// A plan is drawn from its orbits without the derp, round its star as it stands at t, on the ambient
// clock; its bodies are drawn with the derp. So a healthy body sits on its marks exactly, and a
// defective one stands off them by the derp the essay already computes (planDeparture).
//
// One geometry morphs from H (the neighbourhood: a faint ring, dashed forward arcs with node crosses and
// chevrons) into R (one system up close: bands, graduations, a centre circle, stalks, outlines and one
// dimension with its value), element by element over the system's s_px (lod.ts LOD_BANDS, the
// Plan* elements), each dot dissolving in by its hash rank (lod.ts planGain). A mark of a fixed count of
// dots is sampled at its pitch in CSS px (PLAN_LOOK.marks) along its length on screen (at the star's
// px per unit), the last dot partly lit, so a count ramps; a mark longer than its dots can space them
// out to PLAN_LOOK.stretch times its pitch, and past that it draws the part of itself nearest its
// planned place.
import type { Galaxy } from '../../galaxy/generate';
import { GLOW_CAP, glowPx } from '../../galaxy/body';
import type { Vec3 } from '../../math/vec';
import { hash01 } from '../../math/hash';
import { SALT } from '../../math/salts';
import { hexToRgb, NODE_PALETTE } from './birth';
import { bodyTexel, type BodyData } from './bodyData';
import { bodyCentre, bodyDerp, bodyLight, bodyPresence, freezeLook, lampGain, pieceOf, type BodyClocks } from './bodyMote';
import { PLAN_FONT, PLAN_GLYPH_POINT, PLAN_LOOK } from './classLook';
import { LodElement, PLAN_CULL, PLAN_FULL_SHARE, PLAN_FULL_SOFT, PLAN_NO_THIRD, planCull, planFull, planGain, planRank, planSkip, planWindow } from './lod';
import { elementsAt, galaxyTurn, keplerE, orbitLocal, orbitTurns, bodyWorld, type OrbitParams } from './orbit';
import {
  allocate,
  PLAN_BODY_MAX,
  PLAN_DIM_EXT_DOTS,
  PLAN_DIM_TICK_DOTS,
  PLAN_DOTS,
  PLAN_GLYPH_CELLS,
  PLAN_GLYPHS,
  PLAN_MARK,
  PLAN_NODE_DOTS,
  PLAN_POOL,
  PLAN_RUNS,
  PLAN_STRIDE,
  PLAN_TABLE_AT,
  PLAN_TABLE_TEXELS,
  planRunScreen,
} from './planAttrs';
import { streamBandMask } from './stream';

const TAU = 6.283185307179586;
const PHOSPHOR = hexToRgb(PLAN_LOOK.phosphor) as Vec3;
const EMBER = hexToRgb(NODE_PALETTE.NODE_EMBER) as Vec3;
const L = PLAN_LOOK;
const M = PLAN_LOOK.marks;

// GLSL semantics.
const clamp = (x: number, a: number, b: number): number => Math.min(Math.max(x, a), b);
const mix = (a: number, b: number, t: number): number => a * (1 - t) + b * t;
const fract = (x: number): number => x - Math.floor(x);
function smoothstep(e0: number, e1: number, x: number): number {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const len = (a: Vec3): number => Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
const norm = (a: Vec3): Vec3 => {
  const l = len(a);
  return l > 0 ? scale(a, 1 / l) : [0, 0, 0];
};
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot3 = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const mix3 = (a: Vec3, b: Vec3, t: number): Vec3 => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];

/** The camera a plan dot reads: the view (world to view space) and projection matrices (column-major, as three.js holds them), and the screen in CSS px. */
export interface PlanView {
  view: ArrayLike<number>;
  projection: ArrayLike<number>;
  width: number;
  height: number;
}

/**
 * What every plan dot reads of a frame (the shaders' uniforms and the table): the ambient `t`; per
 * system, 4 floats (uPlanSys): its s_px (its outer radius on screen, CSS px; 0 behind the camera), its
 * full-detail gain (0 but for the two systems in R), its cull and its star's real share; and 4 (uPlanRange):
 * the first and past-the-last of its dots in the world pool and in the screen pool; the bodies' clocks;
 * the camera; the test mode's level-of-detail overrides (uLodForce); and the layout table (uPlanTex:
 * planAttrs.ts planTable's fixed part, planLayout's the frame's).
 */
export interface PlanFrame {
  t: number;
  sys: Float32Array;
  range: Float32Array;
  clocks: BodyClocks;
  view: PlanView;
  force: Float32Array;
  table: Float32Array;
  /** Each pool's used length, planUsed(range), once a frame: [world, screen] (uPlanUsed). */
  used: [number, number];
}

/** A plan dot: its place (world; a screen mark's anchor), its centre on screen (CSS px from the top left), its colour, its alpha (before the LOD_VISIBLE cut) and its size (CSS px). */
export interface PlanDot {
  pos: Vec3;
  px: [number, number];
  rgb: Vec3;
  alpha: number;
  sizeCss: number;
}

/** A plan dot's attributes, resolved against its frame (planResolve): its system (−1: none, hidden), mark, body ordinal (−1 the system's), index and count in its run, variant, rank, a pair's second system. */
export interface PlanAttrs {
  sys: number;
  mark: number;
  ord: number;
  j: number;
  n: number;
  aux: number;
  rank: number;
  sys2: number;
}

/** Texel `t` of system `s`'s row of the layout table. */
export function planTexel(table: Float32Array, s: number, t: number): [number, number, number, number] {
  const i = (s * PLAN_TABLE_TEXELS + t) * 4;
  return [table[i], table[i + 1], table[i + 2], table[i + 3]];
}

/** Body ordinal `k`'s row in system `s` (−1 none). */
export function planBodyRow(table: Float32Array, s: number, k: number): number {
  return k < 0 || k >= PLAN_BODY_MAX ? -1 : Math.round(planTexel(table, s, k >> 2)[k & 3]);
}

/** A run's dot's arrival rank: hash01 of its place (system, run, body, index) with SALT.planRank (a node's with SALT.planNode), so a mark dissolves alike however the pools are laid out. */
export function planRunRank(s: number, r: number, k: number, j: number): number {
  const seed = ((s * 32 + r) * 16 + Math.max(k, 0)) * 4096 + Math.min(j, 4095);
  return PLAN_RUNS[r][1] === PLAN_MARK.node ? hash01(seed >>> 0, SALT.planNode) : hash01(seed >>> 0, SALT.planRank);
}

/** A mark's reach in world units: `units`, or `px` CSS px on screen at `ppu` CSS px a unit, whichever is longer. */
export function planReach(units: number, px: number, ppu: number): number {
  return Math.max(units, px / Math.max(ppu, 1e-6));
}

/** Each pool's used length in a frame's ranges, the last range's end: [world, screen] (uPlanUsed). */
export function planUsed(range: ArrayLike<number>): [number, number] {
  let world = 0;
  let screen = 0;
  for (let k = 0; k < range.length / 4; k++) {
    world = Math.max(world, range[k * 4 + 1]);
    screen = Math.max(screen, range[k * 4 + 3]);
  }
  return [world, screen];
}

/**
 * Dot `i` of a pool's attributes `a` resolved against the frame: a pair's dot as it is; a pool's dot,
 * the system whose range holds it, then the run and the body whose ends do (−1 where none: unused).
 */
export function planResolve(a: ArrayLike<number>, i: number, f: Pick<PlanFrame, 'range' | 'table' | 'used'>): PlanAttrs {
  const o = i * PLAN_STRIDE;
  const owner = Math.round(a[o]);
  const out: PlanAttrs = { sys: owner, mark: Math.round(a[o + 1]), ord: Math.round(a[o + 2]), j: Math.round(a[o + 3]), n: Math.round(a[o + 6]), aux: a[o + 4], rank: a[o + 5], sys2: Math.round(a[o + 7]) };
  if (owner >= 0) return out;
  const screen = owner === PLAN_POOL.screen;
  const at = out.j;
  out.sys = -1;
  // Past its pool's used length no range holds it (plan.glsl's uPlanUsed, planUsed).
  if (at >= f.used[screen ? 1 : 0]) return out;
  const systems = f.range.length / 4;
  let s = -1;
  for (let k = 0; k < systems; k++) {
    const lo = f.range[k * 4 + (screen ? 2 : 0)];
    const hi = f.range[k * 4 + (screen ? 3 : 1)];
    if (at >= lo && at < hi) {
      s = k;
      break;
    }
  }
  if (s < 0) return out;
  const l = at - f.range[s * 4 + (screen ? 2 : 0)];
  let prev = 0;
  for (let r = 0; r < PLAN_RUNS.length; r++) {
    if (planRunScreen(r) !== screen) continue;
    const last = planTexel(f.table, s, PLAN_TABLE_AT + 4 * r + 3)[3];
    if (l >= last) {
      prev = last;
      continue;
    }
    for (let k = 0; k < PLAN_BODY_MAX; k++) {
      const end = planTexel(f.table, s, PLAN_TABLE_AT + 4 * r + (k >> 2))[k & 3];
      if (l < end) {
        out.sys = s;
        out.mark = PLAN_RUNS[r][1];
        out.aux = PLAN_RUNS[r][2];
        out.ord = PLAN_RUNS[r][3] ? k : -1;
        out.j = l - prev;
        out.n = end - prev;
        out.rank = planRunRank(s, r, k, out.j);
        return out;
      }
      prev = end;
    }
  }
  return out;
}

/** A vector of the galaxy's own frame turned into the world's at ambient `t` (bodyMote.glsl turnVec). */
export function planTurn(p: Vec3, t: number): Vec3 {
  const a = galaxyTurn(t);
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c];
}

/** A place on an orbit relative to what it goes round, at eccentric anomaly `E` (orbit.ts orbitLocal from its E on). */
export function planOrbitLocalE(o: OrbitParams, E: number, t: number): Vec3 {
  const px = o.a * (Math.cos(E) - o.e);
  const py = o.a * Math.sqrt(1 - o.e * o.e) * Math.sin(E);
  const w = o.precession === 0 ? o.omega0 : o.omega0 + TAU * orbitTurns(t, o.precession);
  const cw = Math.cos(w);
  const sw = Math.sin(w);
  const x = px * cw - py * sw;
  const z = px * sw + py * cw;
  const ca = Math.cos(o.tiltAz);
  const sa = Math.sin(o.tiltAz);
  const u = x * ca + z * sa;
  const v = -x * sa + z * ca;
  const h = v * Math.cos(o.tilt);
  return [u * ca - h * sa, v * Math.sin(o.tilt), u * sa + h * ca];
}

/** Where `row`'s host stands at `t`, undisturbed. */
function hostWorld(data: BodyData, row: number, t: number): Vec3 {
  return bodyWorld(data, Math.round(bodyTexel(data.bodies, 3, row)[0]), t);
}

/** The eccentric anomaly `row` stands at, at `t`. */
export function planE0(data: BodyData, row: number, t: number): number {
  const o = elementsAt(data, row);
  return keplerE(TAU * fract(o.phase + orbitTurns(t, o.period)), o.e);
}

/** A point of `row`'s orbit at `t`, at eccentric anomaly `E`, pushed `push` units out from its host in the orbit's plane, in the world. */
export function planOrbitPoint(data: BodyData, row: number, E: number, push: number, t: number): Vec3 {
  const local = planOrbitLocalE(elementsAt(data, row), E, t);
  const r = len(local);
  return add(hostWorld(data, row, t), planTurn(scale(local, r > 0 ? 1 + push / r : 1), t));
}

/**
 * The planned place `k` steps ahead (re-skin §4.7): the host as it stands at t, plus orbitLocal(row,
 * t + k·period·nodeStep), in the system's frame at t. k = 0 is bodyWorld(row, t): a healthy body sits on it.
 */
export function planNode(data: BodyData, row: number, k: number, t: number): Vec3 {
  const o = elementsAt(data, row);
  return add(hostWorld(data, row, t), planTurn(orbitLocal(o, t + k * o.period * L.arc.nodeStep), t));
}

/** The orbit ahead of the planned place over u ∈ [0, 1] of PLAN_LOOK.arc.span (eccentric anomaly). */
export function planArcPoint(data: BodyData, row: number, u: number, t: number): Vec3 {
  return planOrbitPoint(data, row, planE0(data, row, t) + u * L.arc.span, 0, t);
}

/** The unit normal of `row`'s orbit's plane in the world at `t`, along its motion (from E0 toward E0 + π/2). */
export function planNormal(data: BodyData, row: number, t: number): Vec3 {
  const o = elementsAt(data, row);
  return norm(planTurn(cross(planOrbitLocalE(o, 0, t), planOrbitLocalE(o, 1.5707963267948966, t)), t));
}

/** `v` turned by `a` about the unit axis `n` (Rodrigues). */
export function planRotate(v: Vec3, n: Vec3, a: number): Vec3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return add(add(scale(v, c), scale(cross(n, v), s)), scale(n, dot3(n, v) * (1 - c)));
}

/** A body's undisturbed system index (its star's in g.systems): the plan's `sys`, which bodyDerp reads its size by. */
function derpOf(row: number, sys: number, f: PlanFrame, data: BodyData) {
  return bodyDerp(row, sys, f.clocks, data);
}

/** Where `row` is drawn at the frame, its derp on (bodyMote.ts bodyCentre). */
export function planActual(row: number, sys: number, f: PlanFrame, data: BodyData): Vec3 {
  return bodyCentre(row, derpOf(row, sys, f, data), f.t, data);
}

/** How far `row` stands off its plan (re-skin §4.7): smoothstep(departure) of its derp's offset in band half-widths. */
export function planDeparture(row: number, sys: number, f: PlanFrame, data: BodyData): number {
  const off = len(sub(planActual(row, sys, f, data), bodyWorld(data, row, f.t)));
  return smoothstep(L.departure[0], L.departure[1], off / L.bandHalfWidth);
}

/** How lit `row` is: the highlight or the surge (bodyMote.ts bodyLight), as its marks mix toward ember. */
function litOf(row: number, f: PlanFrame, data: BodyData): number {
  const l = bodyLight(row, f.clocks, data);
  return Math.max(l.hi, l.surge);
}

/** The glyph indices of `value` to PLAN_LOOK.dimension.decimals (one): its digits, the point, its decimal (PLAN_FONT's 0-9, PLAN_GLYPH_POINT). */
export function planNumeral(value: number): number[] {
  const tenths = Math.floor(Math.max(0, value) * 10 + 0.5);
  const whole = Math.floor(tenths / 10);
  const dec = tenths - whole * 10;
  const digits = whole >= 100 ? [Math.floor(whole / 100) % 10, Math.floor(whole / 10) % 10, whole % 10] : whole >= 10 ? [Math.floor(whole / 10), whole % 10] : [whole];
  return [...digits, PLAN_GLYPH_POINT, dec];
}

/** Where a world point stands on screen (CSS px from the top left) through `v`, and its view depth (−z, ≤ 0 behind). */
export function planProject(p: Vec3, v: PlanView): { x: number; y: number; depth: number; d: number } {
  const m = v.view;
  const vx = m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12];
  const vy = m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13];
  const vz = m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14];
  const q = v.projection;
  const cx = q[0] * vx + q[4] * vy + q[8] * vz + q[12];
  const cy = q[1] * vx + q[5] * vy + q[9] * vz + q[13];
  const cw = q[3] * vx + q[7] * vy + q[11] * vz + q[15];
  return { x: (cx / cw + 1) * 0.5 * v.width, y: (1 - cy / cw) * 0.5 * v.height, depth: -vz, d: Math.sqrt(vx * vx + vy * vy + vz * vz) };
}

/** CSS px per unit of the frame's focal length (0.5 × height × projection[5]). */
export function planFocal(v: PlanView): number {
  return 0.5 * v.height * v.projection[5];
}

/**
 * A run of `n` dots along a curve `lenPx` CSS px long on screen at `pitch` CSS px (PLAN_LOOK.marks):
 * `nf` dots along the whole of it (the last partly lit) while they fit; past that `n` dots spaced out to
 * at most PLAN_LOOK.stretch × the pitch, over the `share` of the curve that holds (1 the whole).
 * Dot `j`'s place along the curve (`u`, 0 to `share`) and its light (the last's part, and a taper over
 * the last 15 % at each end of a part). A run of no dots (a chevron's leg of a one-dot run) lights none.
 */
export function planRun(j: number, n: number, lenPx: number, pitch: number): { u: number; light: number; share: number } {
  if (n < 1) return { u: 0, light: 0, share: 1 };
  const want = lenPx / pitch;
  if (!(want > n)) {
    const nf = Math.max(want, 1e-6);
    const light = j < Math.floor(nf) ? 1 : j === Math.floor(nf) ? nf - Math.floor(nf) : 0;
    return { u: j / nf, light, share: 1 };
  }
  const pitchUsed = Math.min(lenPx / n, pitch * L.stretch);
  const share = (n * pitchUsed) / lenPx;
  const u = (j / n) * share;
  const end = Math.min(u, share - u);
  const light = 1 - (1 - smoothstep(0, 0.15 * share, end)) * (1 - share);
  return { u, light, share };
}

/** Whether angle `a` (rad, along a dashed curve from its start, plus the curve's phase in periods) is on a dash: 1 on, 0 in a gap, a 2 % soft edge. */
export function planDash(a: number, phase: number): number {
  const x = fract(a / L.arc.dashPeriod + phase);
  const on = L.arc.dash[0] / L.arc.dash[1];
  return 1 - smoothstep(on - 0.02, on, x) * (1 - smoothstep(1 - 0.02, 1, x));
}

/** The element whose window a plan mark comes in by (and is skipped by, while its window is 0). */
export function planElement(mark: number, aux: number, ord: number, planets: number): LodElement {
  switch (mark) {
    case PLAN_MARK.ring:
      return ord === planets - 1 ? LodElement.PlanRingOuter : LodElement.PlanRingInner;
    case PLAN_MARK.bandEdge:
      return LodElement.PlanBand;
    case PLAN_MARK.chevron:
      return aux > 0.5 ? LodElement.PlanArc : LodElement.PlanChevron;
    case PLAN_MARK.stalk:
      return LodElement.PlanStalk;
    case PLAN_MARK.outlineEq:
    case PLAN_MARK.outlineMer:
      return LodElement.PlanWire;
    case PLAN_MARK.graduation:
      return LodElement.PlanGrad;
    case PLAN_MARK.centre:
      return LodElement.PlanCentre;
    case PLAN_MARK.dimension:
      return LodElement.PlanDim;
    case PLAN_MARK.silhouette:
      return ord >= planets ? LodElement.PlanWire : LodElement.PlanOutline;
    case PLAN_MARK.numeral:
      return LodElement.PlanNum;
    case PLAN_MARK.binaryCross:
    case PLAN_MARK.binaryCircle:
    case PLAN_MARK.binaryEllipse:
      return LodElement.PlanRingOuter;
    default:
      return LodElement.PlanArc;
  }
}

/** A system's frame values: s_px, full, cull, real. */
function sysOf(f: PlanFrame, s: number): [number, number, number, number] {
  return [f.sys[s * 4], f.sys[s * 4 + 1], f.sys[s * 4 + 2], f.sys[s * 4 + 3]];
}

const HIDDEN: PlanDot = { pos: [0, 0, 0], px: [0, 0], rgb: [0, 0, 0], alpha: 0, sizeCss: 0 };

/**
 * Whether dot `i` of a pool is certainly hidden before its marks are placed (the shaders' early-out,
 * exactly conservative): the frame lays no run on it; its element's window, its system's cull or its
 * star's real share is 0 (lod.ts planSkip); its star is not up; or its lamp is dark.
 */
export function planSkips(a: ArrayLike<number>, i: number, f: PlanFrame, data: BodyData): boolean {
  const d = planResolve(a, i, f);
  if (d.sys < 0) return true;
  const s = d.mark >= PLAN_MARK.binaryCross && d.mark <= PLAN_MARK.binaryLimit ? pairSys(d, f) : d.sys;
  const [sPx, full, cull, real] = sysOf(f, s);
  const T4 = planTexel(f.table, s, 4);
  const el = planElement(d.mark, d.aux, d.ord, Math.round(T4[1]));
  if (planSkip(el, sPx, full, cull, real, f.force[el])) return true;
  const star = Math.round(T4[3]);
  const other = d.mark >= PLAN_MARK.binaryCross && d.ord < 0 ? starOf(d.sys === s ? d.sys2 : d.sys, f) : star;
  if (!(Math.max(bodyPresence(star, f.clocks.growth, data), bodyPresence(other, f.clocks.growth, data)) > 0)) return true;
  return !(Math.max(lampGain(markRow(d, f, s), f.clocks, data), other === star ? 0 : lampGain(other, f.clocks, data)) > 0);
}

/** A pair's mark's system: its own star's, or (the barycentre's) the larger of its two. */
function pairSys(d: PlanAttrs, f: PlanFrame): number {
  if (d.ord === 1) return d.sys2;
  if (d.ord === 0) return d.sys;
  return f.sys[d.sys2 * 4] > f.sys[d.sys * 4] ? d.sys2 : d.sys;
}

/** The row a mark's lamp, light and freeze are read from: its body's; the system's star's for the graduations and the centre; its focused planet's for a dimension or value. */
function markRow(d: PlanAttrs, f: Pick<PlanFrame, 'table'>, s: number): number {
  if (d.mark === PLAN_MARK.dimension || d.mark === PLAN_MARK.numeral) return Math.round(planTexel(f.table, s, 5)[0]);
  if (d.ord >= 0 && d.mark < PLAN_MARK.binaryCross) return planBodyRow(f.table, s, d.ord);
  return Math.round(planTexel(f.table, s, 4)[3]);
}

/**
 * Dot `i` of a plan pool `a` (planAttrs.ts) at frame `f` (re-skin §4.7): its place, colour, alpha and
 * size, world marks and screen marks alike (planScreenDot is the screen pool's name for it). Hidden
 * (alpha 0) where planSkips holds or its mark leaves it unlit.
 */
export function planDot(a: ArrayLike<number>, i: number, f: PlanFrame, data: BodyData): PlanDot {
  if (planSkips(a, i, f, data)) return HIDDEN;
  const d = planResolve(a, i, f);
  const pair = d.mark >= PLAN_MARK.binaryCross;
  const s = pair ? pairSys(d, f) : d.sys;
  const [sPx, full, cull, real] = sysOf(f, s);
  const T4 = planTexel(f.table, s, 4);
  const outer = T4[0];
  const planets = Math.round(T4[1]);
  const star = Math.round(T4[3]);
  const ppu = sPx / outer;
  const t = f.t;
  const el = planElement(d.mark, d.aux, d.ord, planets);
  const force = (e: LodElement) => f.force[e];
  const win = (e: LodElement) => planWindow(e, sPx, full, force(e));
  let gain = planGain(el, sPx, d.rank, full, cull, real, force(el));
  const row = markRow(d, f, s);
  if (row < 0) return HIDDEN;
  const starW = bodyWorld(data, star, t);
  let pos: Vec3 = starW;
  let px: [number, number] | null = null;
  let alpha = 0;
  let size = 0;
  let ember = 0;
  const lit = d.mark === PLAN_MARK.graduation || d.mark === PLAN_MARK.centre || pair ? 0 : litOf(row, f, data);
  const runOf = (lenPx: number, pitch: number) => planRun(d.j, d.n, lenPx, pitch);
  switch (d.mark) {
    case PLAN_MARK.ring: {
      const E0 = planE0(data, row, t);
      const r = runOf(TAU * elementsAt(data, row).a * ppu, M.ring[2]);
      pos = planOrbitPoint(data, row, E0 + TAU * (r.u - 0.5 * r.share), 0, t);
      // Out by rank as the arc closes over it (a fade would take every ring dot under LOD_VISIBLE at once).
      alpha = M.ring[0] * planRank(1 - win(LodElement.PlanClose), d.rank) * r.light;
      size = M.ring[1];
      break;
    }
    case PLAN_MARK.arc: {
      const E0 = planE0(data, row, t);
      const close = win(LodElement.PlanClose);
      const peel = win(LodElement.PlanBand);
      const span = L.arc.span + (TAU - L.arc.span) * close;
      const r = runOf(span * elementsAt(data, row).a * ppu, mix(M.arc[2], M.bandFill[2], peel));
      const phi = span * r.u;
      pos = planOrbitPoint(data, row, E0 + phi, 0, t);
      const on = planDash(phi, hash01(row >>> 0, SALT.planDash));
      // The gaps fill by rank as the arc closes.
      alpha = mix(M.arc[0], M.bandFill[0], peel) * mix(planRank(close, d.rank), 1, on) * r.light;
      size = mix(M.arc[1], M.bandFill[1], peel);
      ember = lit;
      break;
    }
    case PLAN_MARK.bandEdge: {
      const E0 = planE0(data, row, t);
      const peel = win(LodElement.PlanBand);
      const hw = L.bandHalfWidth * peel * (d.aux > 0.5 ? 1 : -1);
      const r = runOf(TAU * (elementsAt(data, row).a + hw) * ppu, M.bandEdge[2]);
      pos = planOrbitPoint(data, row, E0 + TAU * (r.u - 0.5 * r.share), hw, t);
      alpha = M.bandEdge[0] * peel * r.light;
      size = M.bandEdge[1];
      ember = lit;
      break;
    }
    case PLAN_MARK.deviation:
    case PLAN_MARK.chevron: {
      if (d.mark === PLAN_MARK.chevron && d.aux < 0.5) {
        // The arc's chevron at its end, two legs back from the tip.
        const E0 = planE0(data, row, t);
        const span = L.arc.span + (TAU - L.arc.span) * win(LodElement.PlanClose);
        const tip = planOrbitPoint(data, row, E0 + span, 0, t);
        const tangent = norm(sub(planOrbitPoint(data, row, E0 + span + 0.01, 0, t), planOrbitPoint(data, row, E0 + span - 0.01, 0, t)));
        const leg = d.j % 2;
        const legLen = planReach(L.arc.chevron.len, L.arc.chevron.lenPx, ppu);
        const r = planRun(Math.floor(d.j / 2), Math.floor(d.n / 2), legLen * ppu, M.chevron[2]);
        const dir = scale(planRotate(tangent, planNormal(data, row, t), leg === 0 ? L.arc.chevron.spread : -L.arc.chevron.spread), -1);
        pos = add(tip, scale(dir, legLen * r.u));
        alpha = M.chevron[0] * planRank(win(LodElement.PlanLeave), d.rank) * r.light;
        size = M.chevron[1];
        ember = lit;
        break;
      }
      // The departure: from where the body is, curving out; with the band it settles on the outer edge.
      const sys = s;
      const actual = planActual(row, sys, f, data);
      const host = hostWorld(data, row, t);
      const vA = sub(actual, host);
      const rA = len(vA);
      const rEdge = len(sub(bodyWorld(data, row, t), host)) + L.bandHalfWidth;
      const pe = win(LodElement.PlanBand);
      const r0 = rA + (rEdge - rA) * pe;
      const span = L.deviation.span - (L.deviation.span - 2 * L.edge.span) * pe;
      const grow = L.deviation.out * (1 - pe);
      const a0 = -L.edge.span * pe;
      const n = planNormal(data, row, t);
      const dirA = rA > 0 ? scale(vA, 1 / rA) : vA;
      const at = (u: number): Vec3 => add(host, scale(planRotate(dirA, n, a0 + span * u), r0 + grow * u));
      const dep = Math.max(planDeparture(row, sys, f, data), lit);
      if (d.mark === PLAN_MARK.chevron) {
        const tip = at(1);
        const tangent = norm(sub(at(1), at(0.98)));
        const leg = d.j % 2;
        const legLen = planReach(L.arc.chevron.len, L.arc.chevron.lenPx, ppu);
        const r = planRun(Math.floor(d.j / 2), Math.floor(d.n / 2), legLen * ppu, M.chevron[2]);
        const dir = scale(planRotate(tangent, n, leg === 0 ? L.arc.chevron.spread : -L.arc.chevron.spread), -1);
        pos = add(tip, scale(dir, legLen * r.u));
        alpha = M.deviation[0] * 0.95 * dep * planRank(1 - pe, d.rank) * r.light;
        size = M.chevron[1];
      } else {
        const r = runOf(span * r0 * ppu, M.deviation[2]);
        const u = r.u;
        pos = at(u);
        alpha = M.deviation[0] * dep * mix(planRank(pe, d.rank), 1, planDash(span * u, 0)) * r.light;
        size = M.deviation[1] + (L.edge.size - M.deviation[1]) * pe;
      }
      ember = lit;
      break;
    }
    case PLAN_MARK.node: {
      const k = d.j % L.arc.nodes;
      const arm = Math.floor(d.j / L.arc.nodes);
      const out = win(LodElement.PlanOutline);
      const c = planNode(data, row, k, t);
      const reach = planReach(L.nodeArm, L.nodeArmPx, ppu) * (k === 0 ? 1 - out : 1);
      const dirs: Vec3[] = [
        [0, 0, 0],
        [1, 0, 0],
        [-1, 0, 0],
        [0, 0, 1],
        [0, 0, -1],
      ];
      pos = add(c, scale(dirs[Math.min(arm, PLAN_NODE_DOTS - 1)], reach));
      alpha = M.node[0] * planRank(k === 0 ? 1 - out : win(LodElement.PlanLeave), d.rank);
      size = M.node[1];
      break;
    }
    case PLAN_MARK.stalk: {
      const w = win(LodElement.PlanStalk);
      const top = d.aux > 0.5 ? planActual(row, s, f, data) : bodyWorld(data, row, t);
      const foot: Vec3 = [top[0], starW[1], top[2]];
      if (d.j < 4) {
        const sgn = d.j % 2 === 0 ? 1 : -1;
        pos = add(foot, d.j < 2 ? [sgn * L.stalkFoot, 0, 0] : [0, 0, sgn * L.stalkFoot]);
        alpha = M.stalk[0] * w;
      } else {
        const lift = scale(sub(top, foot), w);
        const r = planRun(d.j - 4, d.n - 4, len(lift) * ppu, M.stalk[2]);
        pos = add(foot, scale(lift, Math.min(1, r.u)));
        alpha = M.stalk[0] * w * r.light;
      }
      if (d.aux > 0.5) alpha *= Math.max(planDeparture(row, s, f, data), lit);
      size = M.stalk[1];
      ember = lit;
      break;
    }
    case PLAN_MARK.outlineEq:
    case PLAN_MARK.outlineMer: {
      const R = bodyTexel(data.bodies, 3, row)[1];
      const c = bodyWorld(data, row, t);
      const r = runOf(TAU * R * ppu, M.wire[2]);
      const th = TAU * r.u;
      if (d.mark === PLAN_MARK.outlineEq) pos = add(c, [R * Math.cos(th), 0, R * Math.sin(th)]);
      else {
        const h: Vec3 = [starW[0] - c[0], 0, starW[2] - c[2]];
        const dir = len(h) > 0 ? scale(h, 1 / len(h)) : ([1, 0, 0] as Vec3);
        pos = add(c, [R * Math.cos(th) * dir[0], R * Math.sin(th), R * Math.cos(th) * dir[2]]);
      }
      alpha = M.wire[0] * r.light;
      size = M.wire[1];
      break;
    }
    case PLAN_MARK.graduation: {
      const w = win(LodElement.PlanGrad);
      const outerRow = planBodyRow(f.table, s, planets - 1);
      const group = Math.floor(d.j / 14);
      const r = d.j % 14;
      const major = r < L.graduations.dots[0];
      const tick = major ? L.graduations.major * group : L.graduations.major * group + 1 + Math.floor((r - L.graduations.dots[0]) / L.graduations.dots[1]);
      const m = major ? L.graduations.dots[0] : L.graduations.dots[1];
      const k = major ? r : (r - L.graduations.dots[0]) % L.graduations.dots[1];
      const tickLen = (major ? L.graduations.len[0] : L.graduations.len[1]) * w;
      const push = L.graduations.out * w + (k / (m - 1) - 0.5) * tickLen;
      pos = planOrbitPoint(data, outerRow, (TAU * tick) / L.graduations.count, push, t);
      alpha = M.graduation[0] * w;
      size = M.graduation[1];
      break;
    }
    case PLAN_MARK.centre: {
      const w = win(LodElement.PlanCentre);
      const rad = L.centreCircle * w;
      const r = runOf(TAU * rad * ppu, M.centre[2]);
      const th = TAU * r.u;
      pos = add(starW, [rad * Math.cos(th), 0, rad * Math.sin(th)]);
      alpha = M.centre[0] * w * r.light;
      size = M.centre[1];
      break;
    }
    case PLAN_MARK.dimension: {
      const lf = win(LodElement.PlanDim);
      const late = smoothstep(0.85, 1, lf);
      const end = d.aux > 0.5 ? planActual(row, s, f, data) : bodyWorld(data, row, t);
      const v = sub(end, starW);
      const rr = len(v);
      if (d.j < 6) {
        const n = planNormal(data, row, t);
        const a = planRotate(v, n, L.dimension.tick);
        const b = planRotate(v, n, -L.dimension.tick);
        const r = planRun(d.j, 6, len(sub(a, b)) * ppu, 3);
        pos = add(starW, mix3(a, b, r.u));
        alpha = M.dimension[0] * late * r.light;
      } else if (d.j < 16) {
        const r = planRun(d.j - 6, 10, L.dimension.ext * ppu, M.dimension[2]);
        pos = add(end, scale(norm(v), L.dimension.ext * r.u));
        alpha = M.dimension[0] * 0.7 * late * r.light;
      } else {
        const r = planRun(d.j - 16, d.n - 16, rr * lf * ppu, M.dimension[2]);
        pos = add(starW, scale(v, lf * Math.min(1, r.u)));
        alpha = M.dimension[0] * r.light;
      }
      if (d.aux > 0.5) {
        alpha *= Math.max(planDeparture(row, s, f, data), lit);
        ember = lit;
      }
      size = M.dimension[1];
      break;
    }
    case PLAN_MARK.silhouette: {
      const c = bodyWorld(data, row, t);
      const at = planProject(c, f.view);
      if (!(at.depth > 0)) return HIDDEN;
      const R = bodyTexel(data.bodies, 3, row)[1];
      const ppuBody = planFocal(f.view) / at.depth;
      const full0 = R * ppuBody + L.outline.padPx;
      const moon = d.ord >= planets;
      const w = moon ? win(LodElement.PlanWire) * smoothstep(L.outline.moonPx[0], L.outline.moonPx[1], 2 * R * ppuBody) : win(LodElement.PlanOutline);
      const rpx = moon ? full0 : full0 * w;
      const r = planRun(d.j, d.n, Math.max(6 * M.outline[2], TAU * rpx), M.outline[2]);
      const th = TAU * (r.u + hash01(row >>> 0, SALT.planOutline));
      pos = c;
      px = [at.x + rpx * Math.cos(th), at.y + rpx * Math.sin(th)];
      alpha = M.outline[0] * w * r.light;
      size = M.outline[1];
      break;
    }
    case PLAN_MARK.numeral: {
      const end = d.aux > 0.5 ? planActual(row, s, f, data) : bodyWorld(data, row, t);
      const value = len(sub(end, starW));
      const glyphs = planNumeral(value);
      const g = Math.floor(d.j / PLAN_GLYPH_CELLS);
      const cell = d.j % PLAN_GLYPH_CELLS;
      const gr = Math.floor(cell / 5);
      const gc = cell % 5;
      const bit = g < glyphs.length ? (PLAN_FONT[glyphs[g] * 7 + gr] >> (4 - gc)) & 1 : 0;
      const along = d.aux > 0.5 ? 1 + L.dimension.past / Math.max(value, 1e-3) : L.dimension.along;
      const mid = add(starW, scale(sub(end, starW), along));
      const m = planProject(mid, f.view);
      const c0 = planProject(starW, f.view);
      const e0 = planProject(end, f.view);
      if (!(m.depth > 0 && c0.depth > 0 && e0.depth > 0)) return HIDDEN;
      const dx = e0.x - c0.x;
      const dy = e0.y - c0.y;
      const l = Math.max(Math.sqrt(dx * dx + dy * dy), 1e-6);
      const side = d.aux > 0.5 ? 0 : 1;
      const pitch = L.numeral.pitchPx;
      const wPx = 6 * pitch * glyphs.length;
      const x0 = clamp(m.x + (side * -dy * L.dimension.offsetPx) / l - wPx / 2, L.dimension.margin, f.view.width - L.dimension.margin - wPx);
      const y0 = m.y + (side * dx * L.dimension.offsetPx) / l - 3.5 * pitch;
      pos = mid;
      size = pitch * L.numeral.size;
      px = [x0 + (6 * g + gc) * pitch, y0 + gr * pitch];
      alpha = M.numeral[0] * bit;
      if (d.aux > 0.5) {
        alpha *= Math.max(planDeparture(row, s, f, data), lit);
        ember = lit;
      }
      break;
    }
    case PLAN_MARK.binaryCross: {
      const bary = hostWorld(data, star, t);
      const bar = Math.floor(d.j / L.binary.crossDots);
      const q = ((d.j % L.binary.crossDots) / (L.binary.crossDots - 1) - 0.5) * L.binary.crossLen;
      pos = add(bary, bar === 0 ? [q, 0, 0] : [0, 0, q]);
      alpha = M.binaryCross[0];
      size = M.binaryCross[1];
      break;
    }
    case PLAN_MARK.binaryCircle: {
      const bary = hostWorld(data, star, t);
      const th = (TAU * d.j) / L.binary.circleDots;
      pos = add(bary, [L.binary.circle * Math.cos(th), 0, L.binary.circle * Math.sin(th)]);
      alpha = M.binaryCircle[0];
      size = M.binaryCircle[1];
      break;
    }
    case PLAN_MARK.binaryEllipse: {
      pos = planOrbitPoint(data, star, (TAU * d.j) / d.n, 0, t);
      alpha = M.binaryEllipse[0];
      size = M.binaryEllipse[1];
      break;
    }
    case PLAN_MARK.binaryLimit: {
      const k = 8 * Math.floor(d.j / L.binary.limitDash) + (d.j % L.binary.limitDash);
      const th = (TAU * k) / L.binary.limitDots;
      pos = add(starW, [d.aux * Math.cos(th), 0, d.aux * Math.sin(th)]);
      alpha = M.binaryLimit[0];
      size = M.binaryLimit[1];
      break;
    }
    default:
      return HIDDEN;
  }
  // Every mark: its star up (presence: the drawing is there before its bodies land; each dot dissolves
  // in by its rank as the star comes up, so a system's drawing arrives over the star's arrival, not all
  // at once as the star's first light passes LOD_VISIBLE), its body's lamp, the galaxy shown, the freeze
  // frame's dressing, nothing inside the star's glow sprite, and nothing in the text band (the streams'
  // mask, streamBandMask, on the top of its pixel: a close shot's bands and arcs run off the screen's
  // top, through the band).
  const look = freezeLook(row, 1 - bodyLight(row, f.clocks, data).fix, f.clocks, data);
  // A pair's barycentre's marks are up and lit with either star.
  const other = pair && d.ord < 0 ? starOf(d.sys === s ? d.sys2 : d.sys, f) : star;
  const presence = Math.max(bodyPresence(star, f.clocks.growth, data), bodyPresence(other, f.clocks.growth, data));
  const lamp = Math.max(lampGain(row, f.clocks, data), other === star ? 0 : lampGain(other, f.clocks, data));
  const screen = px ?? (() => {
    const q = planProject(pos, f.view);
    return [q.x, q.y] as [number, number];
  })();
  const sc = planProject(starW, f.view);
  const glowR = sc.depth > 0 ? 0.5 * glowPx(bodyTexel(data.bodies, 3, star)[1], sc.d, planFocal(f.view), GLOW_CAP.star) : 0;
  const away = Math.hypot(screen[0] - sc.x, screen[1] - sc.y);
  const clear = smoothstep(glowR, glowR + L.glowEdgePx, away) * smoothstep(PLAN_CULL.near[0], PLAN_CULL.near[1], planProject(pos, f.view).depth);
  alpha *= gain * planRank(presence, d.rank) * lamp * f.clocks.show * look.gain * clear * streamBandMask(screen[1] - 0.5 * size, f.view.height);
  let rgb = mix3(PHOSPHOR, EMBER, ember);
  rgb = mix3(rgb, [look.tint[0], look.tint[1], look.tint[2]], look.tint[3]);
  return { pos, px: screen, rgb, alpha, sizeCss: size };
}

/** A system's star row (the table's T4.w). */
function starOf(s: number, f: Pick<PlanFrame, 'table'>): number {
  return Math.round(planTexel(f.table, s, 4)[3]);
}

/** The screen pool's name for planDot: its silhouettes and numerals, placed in CSS px (`px`). */
export const planScreenDot = planDot;

/** What planFrameOf reads beside the galaxy: the camera, the screen (CSS px), the clocks, each system's real share, and the level-of-detail overrides. */
export interface PlanFrameInput {
  view: PlanView;
  clocks: BodyClocks;
  real: ArrayLike<number>;
  force: Float32Array;
}

/** The graduations' dots: every `major`th tick of dots[0], the rest of dots[1]. */
export const PLAN_GRAD_DOTS = (L.graduations.count / L.graduations.major) * L.graduations.dots[0] + (L.graduations.count - L.graduations.count / L.graduations.major) * L.graduations.dots[1];

/** The windows a run's ask is × (planLayout): every plan window but PlanLeave and PlanClose, which only shape what another opens. */
const PLAN_GATES: readonly LodElement[] = [
  LodElement.PlanRingOuter,
  LodElement.PlanArc,
  LodElement.PlanChevron,
  LodElement.PlanRingInner,
  LodElement.PlanBand,
  LodElement.PlanStalk,
  LodElement.PlanOutline,
  LodElement.PlanWire,
  LodElement.PlanGrad,
  LodElement.PlanCentre,
  LodElement.PlanDim,
  LodElement.PlanNum,
];

/** A run a frame asks for: its system, run (PLAN_RUNS), body ordinal, the dots it would light whole, how much it shows (its window), whether its count is fixed (all or none). */
export interface RunAsk {
  s: number;
  r: number;
  k: number;
  want: number;
  show: number;
  fixed: boolean;
}

/**
 * The dots each run is given out of `room` (the water level): a fixed run its whole count while room
 * lasts, in order; the rest their whole want if all fit, else each min(want, λ · want · show) for the λ
 * that fills the room, the remainder by the largest fraction.
 */
function fill(asks: readonly RunAsk[], room: number): number[] {
  const out = asks.map(() => 0);
  let left = room;
  asks.forEach((a, i) => {
    if (a.fixed && a.want <= left) {
      out[i] = a.want;
      left -= a.want;
    }
  });
  const flex = asks.map((a, i) => [a, i] as const).filter(([a]) => !a.fixed);
  const total = flex.reduce((n, [a]) => n + a.want, 0);
  if (total <= left) {
    for (const [a, i] of flex) out[i] = a.want;
    return out;
  }
  const at = (lambda: number): number => flex.reduce((n, [a]) => n + Math.min(a.want, lambda * a.want * a.show), 0);
  let lo = 0;
  let hi = 1;
  while (at(hi) < left && hi < 1e12) hi *= 2;
  for (let it = 0; it < 60; it++) {
    const m = 0.5 * (lo + hi);
    if (at(m) < left) lo = m;
    else hi = m;
  }
  const exact = flex.map(([a]) => Math.min(a.want, lo * a.want * a.show));
  const whole = exact.map(Math.floor);
  let rest = left - whole.reduce((n, x) => n + x, 0);
  flex.forEach(([, i], q) => (out[i] = whole[q]));
  const order = exact.map((x, q) => [x - Math.floor(x), q] as const).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (const [, q] of order) {
    if (rest <= 0) break;
    if (whole[q] < flex[q][0].want) {
      out[flex[q][1]]++;
      rest--;
    }
  }
  return out;
}

/**
 * The frame's layout of the two shared pools over the systems (re-skin §4.7): what each system's
 * drawing asks for at its size (each run's whole count at its pitch along its length on screen, or a
 * fixed count: the graduations, a value's glyph cells), for every run whose window is open, of a body
 * the lamp lights, of a system whose star is up, in frame, in front and drawn as itself; then the
 * pools filled (fill): every ask whole when they fit, else each in proportion to what it asks and how
 * much of it shows. Writes each system's focused planet and run ends into a copy of `table` (the fixed
 * part kept), and returns it with each system's ranges in the two pools.
 */
export function planLayout(
  g: Galaxy,
  data: BodyData,
  table: Float32Array,
  sys: Float32Array,
  input: PlanFrameInput,
): { table: Float32Array; range: Float32Array; asks: RunAsk[]; got: number[] } {
  const { view, clocks, force } = input;
  const out = Float32Array.from(table);
  const n = g.systems.length;
  const range = new Float32Array(n * 4);
  const t = clocks.ambient;
  const focal = planFocal(view);
  const lampPiece = clocks.lampRow >= 0 ? pieceOf(data, clocks.lampRow) : -1;
  const asks: RunAsk[] = [];
  for (let s = 0; s < n; s++) {
    const [sPx, full, cull, real] = [sys[s * 4], sys[s * 4 + 1], sys[s * 4 + 2], sys[s * 4 + 3]];
    const T4 = planTexel(table, s, 4);
    const [outer, planets, bodies, star] = [T4[0], Math.round(T4[1]), Math.round(T4[2]), Math.round(T4[3])];
    // Its focused planet: the lamp's piece's, in this system; else the middle of its planets.
    const focus = lampPiece >= 0 && Math.round(bodyTexel(data.bodies, 3, lampPiece)[0]) === star ? lampPiece : planets > 0 ? planBodyRow(table, s, Math.floor((planets - 1) / 2)) : -1;
    out[(s * PLAN_TABLE_TEXELS + 5) * 4] = focus;
    if (!(cull > 0 && real > 0 && sPx > 0) || !(bodyPresence(star, clocks.growth, data) > 0)) continue;
    const ppu = sPx / outer;
    const win = (e: LodElement): number => planWindow(e, sPx, full, force[e]);
    // Every run's ask is × one of these windows: a system with all of them 0 (under s_px 30, the far
    // level, nothing forced) asks for nothing, so it is passed by before its runs are walked.
    if (!PLAN_GATES.some((e) => win(e) > 0)) continue;
    const starW = bodyWorld(data, star, t);
    const close = win(LodElement.PlanClose);
    const peel = win(LodElement.PlanBand);
    const lit = (row: number): boolean => row >= 0 && lampGain(row, clocks, data) > 0;
    const cracked = (row: number): boolean => bodyTexel(data.bodies, 4, row)[3] > 0.5;
    // How much of the system shows: its cull and its real share (each a rank dissolve on its dots).
    const seen = Math.min(1, cull) * Math.min(1, real);
    const ask = (r: number, k: number, want: number, show: number, fixed = false): void => {
      if (want > 0 && show > 0) asks.push({ s, r, k, want: fixed ? want : Math.floor(want) + 1, show: Math.min(1, show) * seen, fixed });
    };
    const chevronDots = 2 * Math.floor((planReach(L.arc.chevron.len, L.arc.chevron.lenPx, ppu) * ppu) / M.chevron[2] + 1);
    PLAN_RUNS.forEach(([name, , , perBody], r) => {
      if (!perBody) {
        const fRow = focus;
        if (name === 'graduation') {
          if (lit(star)) ask(r, 0, PLAN_GRAD_DOTS, win(LodElement.PlanGrad), true);
        } else if (name === 'centre') {
          const w = win(LodElement.PlanCentre);
          if (lit(star)) ask(r, 0, (TAU * L.centreCircle * w * ppu) / M.centre[2], w);
        } else if (fRow >= 0 && lit(fRow) && (name === 'dimension' || name === 'numeral' || cracked(fRow))) {
          const rr = len(sub(bodyWorld(data, fRow, t), starW));
          if (name === 'dimension' || name === 'dimensionActual') {
            const w = win(LodElement.PlanDim);
            ask(r, 0, PLAN_DIM_TICK_DOTS + PLAN_DIM_EXT_DOTS + (rr * w * ppu) / M.dimension[2], w);
          } else ask(r, 0, PLAN_GLYPHS * PLAN_GLYPH_CELLS, win(LodElement.PlanNum), true);
        }
        return;
      }
      for (let k = 0; k < bodies; k++) {
        const row = planBodyRow(table, s, k);
        if (!lit(row)) continue;
        if (k >= planets) {
          // A moon: only its silhouette, by its own size on screen.
          if (name !== 'silhouette') continue;
          const at = planProject(bodyWorld(data, row, t), view);
          if (!(at.depth > 0)) continue;
          const R = bodyTexel(data.bodies, 3, row)[1];
          const ppuBody = focal / at.depth;
          const show = win(LodElement.PlanWire) * smoothstep(L.outline.moonPx[0], L.outline.moonPx[1], 2 * R * ppuBody);
          ask(r, k, Math.max(6, (TAU * (R * ppuBody + L.outline.padPx)) / M.outline[2]), show);
          continue;
        }
        const a = bodyTexel(data.bodies, 1, row)[0];
        const R = bodyTexel(data.bodies, 3, row)[1];
        const bad = cracked(row);
        switch (name) {
          case 'ring':
            ask(r, k, (TAU * a * ppu) / M.ring[2], win(k === planets - 1 ? LodElement.PlanRingOuter : LodElement.PlanRingInner) * (1 - close));
            break;
          case 'arc': {
            const span = L.arc.span + (TAU - L.arc.span) * close;
            ask(r, k, (span * a * ppu) / mix(M.arc[2], M.bandFill[2], peel), win(LodElement.PlanArc));
            break;
          }
          case 'edgeIn':
          case 'edgeOut':
            ask(r, k, (TAU * (a + (name === 'edgeIn' ? -1 : 1) * L.bandHalfWidth * peel) * ppu) / M.bandEdge[2], peel);
            break;
          case 'deviation':
            if (bad) ask(r, k, ((L.deviation.span - (L.deviation.span - 2 * L.edge.span) * peel) * (a + L.bandHalfWidth * peel) * ppu) / M.deviation[2], win(LodElement.PlanArc));
            break;
          case 'node':
            ask(r, k, L.arc.nodes * PLAN_NODE_DOTS, win(LodElement.PlanArc), true);
            break;
          case 'chevron':
            ask(r, k, chevronDots, win(LodElement.PlanChevron) * win(LodElement.PlanLeave));
            break;
          case 'devChevron':
            if (bad) ask(r, k, chevronDots, win(LodElement.PlanArc) * (1 - peel));
            break;
          case 'stalk':
          case 'stalkActual':
            if (name === 'stalk' || bad) ask(r, k, 4 + (Math.abs(bodyWorld(data, row, t)[1] - starW[1]) * ppu) / M.stalk[2], win(LodElement.PlanStalk));
            break;
          case 'outlineEq':
          case 'outlineMer':
            ask(r, k, (TAU * R * ppu) / M.wire[2], win(LodElement.PlanWire));
            break;
          case 'silhouette': {
            const at = planProject(bodyWorld(data, row, t), view);
            if (at.depth > 0) ask(r, k, Math.max(6, (TAU * (R * (focal / at.depth) + L.outline.padPx)) / M.outline[2]), win(LodElement.PlanOutline));
            break;
          }
        }
      }
    });
  }
  // Fill each pool, then lay its runs out system by system, in PLAN_RUNS order, body by body.
  const given = asks.map(() => 0);
  for (const screen of [false, true]) {
    const mine = asks.map((a, i) => [a, i] as const).filter(([a]) => planRunScreen(a.r) === screen);
    const got = fill(
      mine.map(([a]) => a),
      screen ? PLAN_DOTS.screen : PLAN_DOTS.world,
    );
    const count = new Map<string, number>();
    mine.forEach(([a, i], q) => {
      count.set(`${a.s},${a.r},${a.k}`, got[q]);
      given[i] = got[q];
    });
    let cursor = 0;
    for (let s = 0; s < n; s++) {
      range[s * 4 + (screen ? 2 : 0)] = cursor;
      let end = 0;
      for (let r = 0; r < PLAN_RUNS.length; r++) {
        if (planRunScreen(r) !== screen) continue;
        for (let k = 0; k < PLAN_BODY_MAX; k++) {
          end += count.get(`${s},${r},${k}`) ?? 0;
          out[(s * PLAN_TABLE_TEXELS + PLAN_TABLE_AT + 4 * r) * 4 + k] = end;
        }
      }
      cursor += end;
      range[s * 4 + (screen ? 3 : 1)] = cursor;
    }
  }
  return { table: out, range, asks, got: given };
}

/**
 * A frame's plan values, pure (bodySystem.ts hands them to the shaders): each system's s_px (its outer
 * radius on screen about its star, CSS px; 0 behind the camera), cull (planCull: how far its outer ring
 * reaches inside the frame, and its star's view depth), real share; its full-detail gain, planFull of
 * its culled s_px (s_px × cull) over the third-largest's (0 when fewer than three are in frame: then
 * every system is in R) over ± PLAN_FULL_SOFT, or PLAN_FULL_SHARE of the third's where that is wider:
 * the two largest are drawn in R, the third at half and every smaller one less, so R passes from one
 * system to another as their sizes cross, never at a switch, and a system leaving the frame leaves R as
 * it fades (round 4's mock: `smooth(−24, 24, sizes[i] − third)` for every system); and the pools' layout
 * (planLayout).
 */
export function planFrameOf(g: Galaxy, data: BodyData, table: Float32Array, input: PlanFrameInput): PlanFrame {
  const { view, clocks } = input;
  const n = g.systems.length;
  const sys = new Float32Array(Math.max(n, 1) * 4);
  const focal = planFocal(view);
  const sPx: number[] = [];
  const cull: number[] = [];
  g.systems.forEach((star, i) => {
    const at = planProject(bodyWorld(data, star, clocks.ambient), view);
    const outer = planTexel(table, i, 4)[0];
    const front = at.depth > 0;
    const s = front ? (outer * focal) / Math.max(at.d, 1e-4) : 0;
    const inside = Math.min(at.x + s, view.width - (at.x - s), at.y + s, view.height - (at.y - s));
    sPx.push(s);
    cull.push(front ? planCull(inside, at.depth, s) : 0);
  });
  const culled = g.systems.map((_, i) => sPx[i] * cull[i]);
  const order = culled
    .map((c, i) => [c, i] as const)
    .filter(([c]) => c > 0)
    .sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  // At most two systems in R (spec §4.7): the gain rises from the third-largest culled size, so the
  // third and every smaller system are exactly 0, and R passes between neighbours only as the third's
  // size crosses the second's. With fewer than three on screen, every one is whole.
  const t3 = order.length > 2 ? order[2][0] : 0;
  const soft = Math.max(PLAN_FULL_SOFT, PLAN_FULL_SHARE * t3);
  const third = order.length > 2 ? t3 : PLAN_NO_THIRD;
  for (let i = 0; i < n; i++) sys.set([sPx[i], culled[i] > 0 ? planFull(culled[i], third, soft) : 0, cull[i], input.real[i]], i * 4);
  const { table: laid, range } = planLayout(g, data, table, sys, input);
  return { t: clocks.ambient, sys, range, clocks, view, force: input.force, table: laid, used: planUsed(range) };
}
