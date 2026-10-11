// The bicycle drawn in ink (docs/specs/2026-10-05-blueprint-and-build.md §2.4): polylines built from
// the same constants and helpers as the solids in shapes.ts, so the drawing cannot drift from the
// bike, in the order a pen draws them. A side elevation: a tube is its two contour lines, a wheel its
// tyre and rim circles, hub and spokes, a gear its tooth outline. Strokes are 3D in their part's own
// space, so posing them with the real part transforms and pressing them flat makes the drawing, and
// letting them up lifts it into the bike. Both builds are drawn by the same calls, point for point,
// so the redraw strikes out and draws again exactly the lines that move. Pure and deterministic;
// index.ts scales it to world units and numbers the parts.
import { hash01 } from '../../math/hash';
import type { Vec2, Vec3 } from '../../math/vec';
import type { InkStroke } from '../types';
import {
  BB,
  CHAIN_SEGMENTS,
  CHAIN_Z,
  CRANK,
  CRANK_Z,
  FRONT_AXLE,
  HEAD_TOP,
  MAST_MOUNT,
  PEDAL,
  REAR_AXLE,
  SADDLE_TOP,
  SEAT_CLAMP,
  SEAT_DIR,
  STEER_AXIS,
  STEER_MOUNT,
  STUB_TOP,
  WHEEL,
  pedalCentre,
} from './kinematics';
import {
  BASKET,
  CRANKSET,
  CROWN,
  FLANGE,
  FORK_Z,
  FRONT_BRAKE_DIR,
  FRONT_BRAKE_REACH,
  GROUND,
  GUARD_ARCS,
  HEADLAMP,
  LINK_LENGTH,
  MUDGUARD,
  RACK,
  REAR_BRAKE_REACH,
  REAR_DROPOUT_Z,
  REFLECTOR,
  REFLECTOR_PLATE,
  RIM_INNER,
  SADDLE,
  STAY_DIR,
  TAIL_REFLECTOR,
  barCentre,
  barPoints,
  bell,
  cableHousing,
  caliperPoints,
  chainringOutline,
  frameTubes,
  gripEnds,
  leverEnds,
  rackStay,
  sprocketOutline,
  stemDir,
  stemTop,
  type Build,
  type FrameTube,
} from './shapes';

/** A stroke as the builder makes it: `part` by id, points in part space in metres. */
export interface DraftStroke extends Omit<InkStroke, 'part'> {
  part: string;
}

/** Both copies of the moving strokes count: the drawing's segments stay under this. */
export const INK_SEGMENT_BUDGET = 6000;
/** No segment is longer than this (metres): the pen's wobble needs vertices to bend at. */
export const INK_MAX_SEGMENT = 0.03;
/** More than this apart (metres, posed at rest) on the two builds, a stroke moves in the redraw. */
export const INK_MOVE_EPS = 0.002;

/**
 * The sheet the bike is drawn on (bike metres): just behind the bike's mid-plane, facing the drive
 * side, larger than the drawing so the notes sit in its margins (§2.11).
 */
export const SHEET = { centre: [0.55, 0.55, -0.03] as Vec3, width: 1.9, height: 1.45 } as const;

/** The person's ring round the wrong seat: its centre (the twin saddle's top) and radius, where it starts and how far it sweeps. */
export const RING = {
  centre: [MAST_MOUNT[0] + SADDLE_TOP[0] - SEAT_CLAMP[0], MAST_MOUNT[1] + SADDLE_TOP[1] - SEAT_CLAMP[1], 0] as Vec3,
  radius: 0.2,
  start: (110 * Math.PI) / 180,
  sweep: (380 * Math.PI) / 180,
} as const;
/** The person's tick, in the sheet's lower right (bike metres). */
export const TICK: readonly Vec3[] = [
  [1.25, 0.08, 0],
  [1.31, 0.02, 0],
  [1.45, 0.2, 0],
];
/** The margin notes: three blocks of scribble (bike metres): x from, x to, first row's y, rows. */
export const NOTE_BLOCKS: readonly { x0: number; x1: number; y: number; rows: number }[] = [
  { x0: -0.38, x1: 0.04, y: 1.2, rows: 3 },
  { x0: 1.05, x1: 1.45, y: 1.22, rows: 2 },
  { x0: 1.25, x1: 1.48, y: 0.62, rows: 3 },
];
/** Hatching: parallel lines at this angle (radians from +x: upper left to lower right), this far apart (m). */
export const HATCH = { angle: (-50 * Math.PI) / 180, pitch: 0.012 } as const;

const DEG = Math.PI / 180;
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const withZ = (p: Vec3, z: number): Vec3 => [p[0], p[1], z];
const along = (p: Vec3, dir: Vec3, t: number): Vec3 => add(p, scale(dir, t));
const dist = (a: Vec3, b: Vec3): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const mixV = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// ---- Where each part's own space sits, on each build, at rest (drive 0, no steering) ----

/** A part's origin in bike coordinates on `build`, as `pose` places it at rest (no part turns at rest). */
function mount(part: string, build: Build): Vec3 {
  switch (part) {
    case 'saddle':
      return build === 'twin' ? MAST_MOUNT : SEAT_CLAMP;
    case 'handlebars':
      return build === 'twin' ? STUB_TOP : STEER_MOUNT;
    case 'fork':
    case 'basket':
    case 'brake-front':
    case 'mudguard-front':
      return HEAD_TOP;
    case 'front-wheel':
      return FRONT_AXLE;
    case 'rear-wheel':
    case 'brake-rear':
    case 'mudguard-rear':
      return REAR_AXLE;
    case 'cranks':
      return BB;
    case 'pedal-right':
      return pedalCentre(0, 1);
    case 'pedal-left':
      return pedalCentre(0, -1);
    default:
      // The frame, the ground and the chain links are drawn in their own space already.
      return [0, 0, 0];
  }
}

// ---- Polylines ----

/** A circle (or an arc of one) about `c` in the plane z = c[2], from `a0` sweeping `sweep`. */
function arc(c: Vec3, r: number, a0 = 0, sweep = 2 * Math.PI): Vec3[] {
  const n = Math.max(16, Math.ceil((r * Math.abs(sweep)) / INK_MAX_SEGMENT));
  const full = Math.abs(Math.abs(sweep) - 2 * Math.PI) < 1e-9;
  const pts = Array.from({ length: n + 1 }, (_, i): Vec3 => {
    const a = a0 + (sweep * i) / n;
    return [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a), c[2]];
  });
  if (full) pts[n] = pts[0];
  return pts;
}

/** The two side-view contour lines of a round bar from `a` to `b`: its silhouette seen along z. */
function contours(a: Vec3, b: Vec3, r: number): [Vec3[], Vec3[]] {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l = Math.hypot(dx, dy) || 1;
  const n: Vec3 = [(-dy / l) * r, (dx / l) * r, 0];
  return [
    [add(a, n), add(b, n)],
    [sub(a, n), sub(b, n)],
  ];
}

/** A closed side-view rectangle centred on `c`, `w` along x and `h` along y, turned by `angle` about z. */
function rect(c: Vec3, w: number, h: number, angle = 0): Vec3[] {
  const [ca, sa] = [Math.cos(angle), Math.sin(angle)];
  const corner = (x: number, y: number): Vec3 => [c[0] + x * ca - y * sa, c[1] + x * sa + y * ca, c[2]];
  const pts = [corner(-w / 2, -h / 2), corner(w / 2, -h / 2), corner(w / 2, h / 2), corner(-w / 2, h / 2)];
  return [...pts, pts[0]];
}

/** Every leg of both builds cut into the same number of pieces, none longer than INK_MAX_SEGMENT. */
function subdivide(correct: Vec3[], twin: Vec3[]): [Vec3[], Vec3[]] {
  const outC: Vec3[] = [correct[0]];
  const outT: Vec3[] = [twin[0]];
  for (let i = 1; i < correct.length; i++) {
    const n = Math.max(1, Math.ceil(Math.max(dist(correct[i - 1], correct[i]), dist(twin[i - 1], twin[i])) / INK_MAX_SEGMENT - 1e-9));
    for (let k = 1; k <= n; k++) {
      outC.push(k === n ? correct[i] : mixV(correct[i - 1], correct[i], k / n));
      outT.push(k === n ? twin[i] : mixV(twin[i - 1], twin[i], k / n));
    }
  }
  return [outC, outT];
}

// ---- The drawing, stroke by stroke ----

type Style = Partial<Pick<InkStroke, 'cls' | 'farSide' | 'across' | 'paper' | 'width' | 'alpha' | 'only' | 'mark' | 'redrawRank'>>;

/** Collects strokes in the order they are added: the pen's order. */
class Pen {
  readonly strokes: DraftStroke[] = [];
  private readonly ids = new Set<string>();

  /**
   * One stroke of `part`, its points in bike coordinates on each build (`at`); a stroke that does
   * not differ between builds may ignore its argument.
   */
  draw(id: string, part: string, at: (build: Build) => Vec3[], style: Style = {}): void {
    if (this.ids.has(id)) throw new Error(`ink: duplicate stroke ${id}`);
    this.ids.add(id);
    // A stroke on one build only stands in for itself on the other (that copy is never drawn).
    const only = style.only;
    const co = at(only === 'twin' ? 'twin' : 'correct');
    const tw = only === 'correct' ? co : at('twin');
    if (co.length !== tw.length || co.length < 2) throw new Error(`ink: ${id} has ${co.length} and ${tw.length} points`);
    const moves = only !== undefined || co.some((p, i) => dist(p, tw[i]) > INK_MOVE_EPS);
    const [bc, bt] = subdivide(co, tw);
    const local = (pts: Vec3[], build: Build) => pts.map((p) => sub(p, mount(part, build)));
    const closed = dist(co[0], co[co.length - 1]) < 1e-12 && dist(tw[0], tw[tw.length - 1]) < 1e-12;
    this.strokes.push({
      id,
      part,
      cls: style.cls ?? 'outline',
      points: local(bc, only === 'twin' ? 'twin' : 'correct'),
      pointsTwin: local(bt, only === 'correct' ? 'correct' : 'twin'),
      moves,
      ...(style.only ? { only: style.only } : {}),
      farSide: style.farSide ?? false,
      across: style.across ?? false,
      paper: style.paper ?? false,
      closed,
      width: style.width ?? 1.6,
      alpha: style.alpha ?? 1,
      ...(style.mark ? { mark: style.mark } : {}),
      ...(moves ? { redrawRank: style.redrawRank ?? 99 } : {}),
    });
  }

  /** A round bar's two contour lines, as `${id}.a` and `${id}.b`. */
  tube(id: string, part: string, at: (build: Build) => [Vec3, Vec3, number], style: Style = {}): void {
    for (const k of [0, 1] as const) this.draw(`${id}.${'ab'[k]}`, part, (b) => contours(...at(b))[k], style);
  }
}

const construction: Style = { cls: 'construction', paper: true, width: 0.8 };

function constructionLines(pen: Pen): void {
  pen.draw('construction.ground', 'ground', () => [[-0.5, 0, 0], [1.55, 0, 0]], construction);
  pen.draw('construction.axles', 'ground', () => [[-0.1, WHEEL.tyre, 0], [1.2, WHEEL.tyre, 0]], construction);
  pen.draw('construction.steer', 'ground', () => [along(HEAD_TOP, STEER_AXIS, -0.75), along(HEAD_TOP, STEER_AXIS, 0.45)], construction);
  pen.draw('construction.seat', 'ground', () => [along(BB, SEAT_DIR, -0.12), along(BB, SEAT_DIR, 0.95)], construction);
  for (const [name, c] of [['rear', REAR_AXLE], ['front', FRONT_AXLE], ['bb', BB]] as const) {
    pen.draw(`construction.cross.${name}.h`, 'ground', () => [add(c, [-0.03, 0, 0]), add(c, [0.03, 0, 0])], construction);
    pen.draw(`construction.cross.${name}.v`, 'ground', () => [add(c, [0, -0.03, 0]), add(c, [0, 0.03, 0])], construction);
  }
}

/** Tyre, rim, hub, spokes and the spoke reflector, about `axle` (shapes.ts `wheel`). */
function wheel(pen: Pen, part: 'front-wheel' | 'rear-wheel', axleAt: Vec3): void {
  const name = part === 'front-wheel' ? 'front' : 'rear';
  const o = (p: Vec3): Vec3 => add(axleAt, p);
  pen.draw(`${name}Wheel.tyre`, part, () => arc(axleAt, WHEEL.tyre));
  pen.draw(`${name}Wheel.rim`, part, () => arc(axleAt, WHEEL.rim), { width: 1.2 });
  pen.draw(`${name}Wheel.rimInner`, part, () => arc(axleAt, RIM_INNER), { width: 0.9, alpha: 0.75 });
  pen.draw(`${name}Wheel.flange`, part, () => arc(withZ(axleAt, FLANGE.z), FLANGE.r), { width: 1.2 });
  pen.draw(`${name}Wheel.axle`, part, () => arc(withZ(axleAt, FLANGE.z), WHEEL.hub / 2), { width: 0.9 });
  for (let k = 0; k < WHEEL.spokes; k++) {
    const a = (k * 2 * Math.PI) / WHEEL.spokes;
    const z = k % 2 === 0 ? FLANGE.z : -FLANGE.z;
    const dir: Vec3 = [Math.cos(a), Math.sin(a), 0];
    pen.draw(`${name}Wheel.spoke${k}`, part, () => [o(withZ(scale(dir, 0.032), z)), o(scale(dir, RIM_INNER + 0.002))], {
      width: 0.9,
      alpha: 0.8,
    });
  }
  const { r, angle, z } = REFLECTOR;
  pen.draw(`${name}Wheel.reflector`, part, () => rect(o([r * Math.cos(angle), r * Math.sin(angle), z]), REFLECTOR_PLATE.length, REFLECTOR_PLATE.width, angle), {
    width: 1.1,
  });
}

/** The frame's tubes (shapes.ts `frameTubes`), in a draughtsman's order; its cables come with the bars. */
function frame(pen: Pen): void {
  const t = (pick: (f: ReturnType<typeof frameTubes>) => FrameTube) => (b: Build): [Vec3, Vec3, number] => {
    const tube = pick(frameTubes(b));
    return [tube.a, tube.b, tube.radius];
  };
  pen.tube('frame.seatTube', 'frame', t((f) => f.seatTube), { redrawRank: 4 });
  pen.tube('frame.collar', 'frame', t((f) => f.collar), { redrawRank: 4 });
  pen.tube('frame.downTube', 'frame', t((f) => f.downTube));
  pen.draw('frame.shell', 'frame', () => arc(withZ(BB, 0.035), frameTubes('correct').shell.radius), { width: 1.4 });
  for (const [k, side] of [[1, 'near'], [0, 'far']] as const) {
    const farSide = side === 'far';
    pen.tube(`frame.chainstay.${side}`, 'frame', t((f) => f.sides[k].chainstay), { width: 1.3, farSide });
    const dropout = frameTubes('correct').sides[k].dropout;
    pen.draw(`frame.dropout.${side}`, 'frame', () => arc(mixV(dropout.a, dropout.b, 0.5), dropout.radius), { width: 1.1, farSide });
  }
  for (const [k, side] of [[1, 'near'], [0, 'far']] as const) {
    pen.tube(`frame.seatStay.${side}`, 'frame', t((f) => f.sides[k].seatStay), { width: 1.3, farSide: side === 'far' });
  }
  pen.tube('frame.topTube', 'frame', t((f) => f.topTube), { redrawRank: 3 });
  pen.tube('frame.headTube', 'frame', t((f) => f.headTube), { redrawRank: 5 });
}

/** Steerer, crown and blades (shapes.ts `fork`), then the basket with its stays and the headlamp (`basket`); about the head-tube top. */
function fork(pen: Pen): void {
  let part = 'fork';
  pen.tube('fork.steerer', part, () => [along(CROWN, STEER_AXIS, -0.01), STEER_MOUNT, 0.012], { width: 1.2 });
  pen.draw('fork.crown', part, () => arc(withZ(CROWN, FORK_Z + 0.01), 0.015), { width: 1.2 });
  for (const s of [1, -1]) {
    const side = s > 0 ? 'near' : 'far';
    pen.tube(`fork.blade.${side}`, part, () => [withZ(CROWN, s * FORK_Z), withZ(FRONT_AXLE, s * FORK_Z), 0.011], { width: 1.3, farSide: s < 0 });
  }
  part = 'basket';
  const { x0, x1, y0, y1, halfWidth: w } = BASKET;
  for (const s of [1, -1]) {
    const side = s > 0 ? 'near' : 'far';
    const farSide = s < 0;
    pen.draw(`basket.panel.${side}`, part, () => [[x0, y0, s * w], [x1, y0, s * w], [x1, y1, s * w], [x0, y1, s * w], [x0, y0, s * w]], { farSide });
    pen.draw(`basket.rim.${side}`, part, () => [[x0 - 0.01, y1, s * w], [x1 + 0.01, y1, s * w]], { width: 2.2, farSide });
    pen.draw(`basket.stay.back.${side}`, part, () => [[x0, y0, s * (w - 0.03)], withZ(CROWN, s * FORK_Z)], { width: 1.0, farSide });
    pen.draw(`basket.stay.front.${side}`, part, () => [[x1 - 0.02, y0, s * (w - 0.03)], withZ(FRONT_AXLE, s * (FORK_Z + 0.02))], { width: 1.0, farSide });
  }
  for (const x of [x0, x1]) pen.draw(`basket.rim.across.${x === x0 ? 'back' : 'front'}`, part, () => [[x, y1, -w], [x, y1, w]], { across: true, width: 2.2 });
  const { centre, radius, depth } = HEADLAMP;
  pen.draw('lamp.bracket', part, () => [[x1 - 0.02, y0, 0], add(centre, [-depth / 4, radius * 0.6, 0])], { width: 1.2 });
  pen.draw('lamp.body', part, () => rect(centre, depth, 2 * radius), { width: 1.3 });
  pen.draw('lamp.lens', part, () => arc(add(centre, [depth / 2, 0, 0]), radius * 0.8, -Math.PI / 2, Math.PI), { width: 1.3 });
}

/** Every `step`-th point of a gear outline, closed: its teeth at a pen's resolution. */
function gear(outline: Vec2[], c: Vec3, step: number): Vec3[] {
  const pts = outline.filter((_, i) => i % step === 0).map((p): Vec3 => [c[0] + p[0], c[1] + p[1], c[2]]);
  return [...pts, pts[0]];
}

/** Crank arms, chainring and spider, sprocket, chain and pedals. */
function drive(pen: Pen): void {
  const { ringInner, spiderAngle, armHalf, axle } = CRANKSET;
  pen.tube('cranks.arm.near', 'cranks', () => [withZ(BB, CRANK_Z), add(BB, [CRANK, 0, CRANK_Z]), armHalf], { width: 1.4 });
  pen.tube('cranks.arm.far', 'cranks', () => [withZ(BB, -CRANK_Z), add(BB, [-CRANK, 0, -CRANK_Z]), armHalf], { width: 1.4, farSide: true });
  pen.draw('cranks.chainring', 'cranks', () => gear(chainringOutline(), withZ(BB, CHAIN_Z), 3), { width: 1.2 });
  pen.draw('cranks.ringInner', 'cranks', () => arc(withZ(BB, CHAIN_Z), ringInner), { width: 0.9, alpha: 0.7 });
  for (let k = 0; k < 5; k++) {
    const a = (k * 2 * Math.PI) / 5 + spiderAngle;
    const dir: Vec3 = [Math.cos(a), Math.sin(a), 0];
    pen.draw(`cranks.spider${k}`, 'cranks', () => [along(withZ(BB, CHAIN_Z), dir, 0.024), along(withZ(BB, CHAIN_Z), dir, ringInner + 0.004)], { width: 1.2 });
  }
  pen.draw('cranks.axle', 'cranks', () => arc(withZ(BB, CRANK_Z), axle), { width: 1.1 });
  pen.draw('rearWheel.sprocket', 'rear-wheel', () => gear(sprocketOutline(), withZ(REAR_AXLE, CHAIN_Z), 3), { width: 1.1 });
  // Each link is drawn in its own space, along its x: the chain is a dashed line.
  for (let k = 0; k < CHAIN_SEGMENTS; k++) {
    const id = `chain-${String(k).padStart(2, '0')}`;
    pen.draw(`${id}.link`, id, () => [[-LINK_LENGTH / 2, 0, 0], [LINK_LENGTH / 2, 0, 0]], { width: 1.4 });
  }
  for (const s of [1, -1] as const) {
    const part = s > 0 ? 'pedal-right' : 'pedal-left';
    const c = pedalCentre(0, s);
    pen.draw(`${part}.platform`, part, () => rect(c, PEDAL.length, PEDAL.thickness), { width: 1.3, farSide: s < 0 });
  }
}

/** The saddle's side profile about its top point (part space, about the seat clamp): 0.27 m long, its nose down. */
function saddleProfile(): Vec3[] {
  const top = sub(SADDLE_TOP, SEAT_CLAMP);
  const n: Vec3 = [Math.cos(SADDLE.noseDown), -Math.sin(SADDLE.noseDown), 0];
  const down: Vec3 = [-Math.sin(SADDLE.noseDown), -Math.cos(SADDLE.noseDown), 0];
  const p = (t: number, d: number): Vec3 => add(add(top, scale(n, t)), scale(down, d));
  const pts = [p(-0.115, 0), p(-0.1, -0.01), p(0.05, -0.005), p(0.155, 0.012), p(0.14, 0.026), p(0, 0.03), p(-0.1, 0.024)];
  return [...pts, pts[0]];
}

/** The saddle on its post (correct) or on the steering column with its cradle (twin), shapes.ts `saddle`. */
function saddle(pen: Pen): void {
  const at = (build: Build, local: Vec3[]) => local.map((p) => add(p, mount('saddle', build)));
  const top = sub(SADDLE_TOP, SEAT_CLAMP);
  const postTop = add(top, scale(SEAT_DIR, -SADDLE.thick - 0.01));
  pen.draw('saddle.profile', 'saddle', (b) => at(b, saddleProfile()), { redrawRank: 0 });
  pen.tube(
    'saddle.post',
    'saddle',
    (b): [Vec3, Vec3, number] => {
      if (b === 'correct') return [...at(b, [scale(SEAT_DIR, -0.03), postTop]), 0.0135] as [Vec3, Vec3, number];
      const columnFoot = scale(STEER_AXIS, -(MAST_MOUNT[1] - HEAD_TOP[1]) / STEER_AXIS[1]);
      const length = Math.hypot(...sub(postTop, columnFoot));
      return [...at(b, [add(postTop, scale(STEER_AXIS, -length)), postTop]), 0.016] as [Vec3, Vec3, number];
    },
    { redrawRank: 0 },
  );
  const rail: Vec3 = [Math.cos(SADDLE.noseDown), -Math.sin(SADDLE.noseDown), 0];
  pen.tube('saddle.cradle', 'saddle', (b) => [...at(b, [along(postTop, rail, -0.075), along(postTop, rail, 0.06)]), 0.012] as [Vec3, Vec3, number], {
    only: 'twin',
    width: 1.3,
    redrawRank: 0,
  });
}

/** Stem, bars, grips, levers, bell and the levers' housings (shapes.ts `handlebars`), about the stem clamp. */
function handlebars(pen: Pen): void {
  const part = 'handlebars';
  const at = (build: Build, local: Vec3[]) => local.map((p) => add(p, mount(part, build)));
  const style = (extra: Style = {}): Style => ({ redrawRank: 2, ...extra });
  pen.tube('handlebars.stem', part, (b) => [...at(b, [scale(stemDir(b), -0.04), stemTop(b)]), 0.011] as [Vec3, Vec3, number], style());
  pen.draw('handlebars.stemCap', part, (b) => at(b, arc(stemTop(b), 0.014)), style({ width: 1.2 }));
  pen.tube('handlebars.reach', part, (b) => [...at(b, [stemTop(b), barCentre(b)]), 0.012] as [Vec3, Vec3, number], style());
  pen.draw('handlebars.cross', part, (b) => at(b, [barPoints(-1, b)[0], barPoints(1, b)[0]]), style({ across: true, width: 2 }));
  for (const s of [1, -1]) {
    const side = s > 0 ? 'near' : 'far';
    const farSide = s < 0;
    pen.draw(`handlebars.bar.${side}`, part, (b) => at(b, barPoints(s, b)), style({ width: 2, farSide }));
    pen.draw(`handlebars.grip.${side}`, part, (b) => at(b, gripEnds(s, b)), style({ width: 3.2, farSide }));
    pen.draw(`handlebars.lever.${side}`, part, (b) => at(b, leverEnds(s, b)), style({ width: 1.2, farSide }));
  }
  pen.draw('handlebars.bell', part, (b) => at(b, arc(bell(b).centre, bell(b).radius)), style({ width: 1.3 }));
  for (const s of [1, -1] as const) {
    // cableHousing is in bike coordinates already.
    pen.draw(`handlebars.housing.${s > 0 ? 'near' : 'far'}`, part, (b) => cableHousing(s, b, mount(part, b)), style({ width: 0.9, farSide: s < 0 }));
  }
}

function cables(pen: Pen): void {
  const run = (pick: (f: ReturnType<typeof frameTubes>) => Vec3[]) => (b: Build) => pick(frameTubes(b));
  pen.draw('frame.frontCable', 'frame', run((f) => f.frontCable), { width: 0.9, redrawRank: 6 });
  pen.draw('frame.rearCable', 'frame', run((f) => f.rearCable), { width: 0.9, redrawRank: 6 });
}

/** A caliper (shapes.ts `caliper`): the near arm and pad, the pivot bolt, the far arm and pad faint. */
function caliper(pen: Pen, id: string, part: string, axleAt: Vec3, dir: Vec3, reach: number): void {
  const { top, pad, tangent } = caliperPoints(axleAt, dir, reach);
  for (const s of [1, -1]) {
    const side = s > 0 ? 'near' : 'far';
    const farSide = s < 0;
    pen.draw(`${id}.arm.${side}`, part, () => [withZ(top, s * 0.036), withZ(pad, s * 0.03)], { width: 1.2, farSide });
    pen.draw(`${id}.pad.${side}`, part, () => [withZ(add(pad, scale(tangent, -0.02)), s * 0.022), withZ(add(pad, scale(tangent, 0.02)), s * 0.022)], { width: 1.6, farSide });
  }
  pen.draw(`${id}.bolt`, part, () => arc(withZ(top, 0.04), 0.011), { width: 1.1 });
}

/** Brakes, mudguards (two arcs each), the tail reflector and the rack. */
function fittings(pen: Pen): void {
  caliper(pen, 'brakeFront', 'brake-front', FRONT_AXLE, FRONT_BRAKE_DIR, FRONT_BRAKE_REACH);
  caliper(pen, 'brakeRear', 'brake-rear', REAR_AXLE, STAY_DIR, REAR_BRAKE_REACH);
  for (const [name, part, axleAt, [a0, a1]] of [
    ['front', 'mudguard-front', FRONT_AXLE, GUARD_ARCS.front],
    ['rear', 'mudguard-rear', REAR_AXLE, GUARD_ARCS.rear],
  ] as const) {
    pen.draw(`mudguard.${name}.outer`, part, () => arc(axleAt, MUDGUARD.outer, a0, a1 - a0), { width: 1.3 });
    pen.draw(`mudguard.${name}.inner`, part, () => arc(axleAt, MUDGUARD.inner, a0, a1 - a0), { width: 1.0 });
  }
  const { angle, height, depth } = TAIL_REFLECTOR;
  const tail = add(REAR_AXLE, [(MUDGUARD.outer + depth / 2 + 0.004) * Math.cos(angle), (MUDGUARD.outer + depth / 2 + 0.004) * Math.sin(angle), 0]);
  pen.draw('mudguard.rear.reflector', 'mudguard-rear', () => rect(tail, depth, height), { width: 1.1 });
  const { x0, x1, height: y, halfWidth: w } = RACK;
  const r = (p: Vec3): Vec3 => add(REAR_AXLE, p);
  for (const s of [1, -1]) {
    const side = s > 0 ? 'near' : 'far';
    const farSide = s < 0;
    pen.draw(`rack.rail.${side}`, 'mudguard-rear', () => [r([x0, y, s * w]), r([x1, y, s * w])], { width: 1.4, farSide });
    pen.draw(`rack.leg.${side}`, 'mudguard-rear', () => [r([x0 + 0.04, y, s * w]), r([0, 0, s * (REAR_DROPOUT_Z + 0.012)])], { width: 1.1, farSide });
    pen.draw(`rack.strut.${side}`, 'mudguard-rear', () => [r([x1 - 0.01, y, s * w]), r(rackStay(0.3, s))], { width: 1.1, farSide });
  }
}

// ---- Hatching ----

/**
 * Parallel lines at HATCH.angle, HATCH.pitch apart on one grid over the whole page (so neighbouring
 * regions' hatching lines up), clipped to the region `inside` within `box` [x0, y0, x1, y1]: the
 * runs of each line that fall inside, found by stepping along it.
 */
export function hatchLines(inside: (x: number, y: number) => boolean, box: readonly [number, number, number, number]): [Vec2, Vec2][] {
  const d: Vec2 = [Math.cos(HATCH.angle), Math.sin(HATCH.angle)];
  const nrm: Vec2 = [-d[1], d[0]];
  const corners: Vec2[] = [
    [box[0], box[1]],
    [box[2], box[1]],
    [box[0], box[3]],
    [box[2], box[3]],
  ];
  const dot = (p: Vec2, v: Vec2) => p[0] * v[0] + p[1] * v[1];
  const cs = corners.map((p) => dot(p, nrm));
  const ts = corners.map((p) => dot(p, d));
  const step = 0.001;
  const out: [Vec2, Vec2][] = [];
  for (let k = Math.ceil(Math.min(...cs) / HATCH.pitch); k * HATCH.pitch <= Math.max(...cs); k++) {
    const c = k * HATCH.pitch;
    const at = (t: number): Vec2 => [nrm[0] * c + d[0] * t, nrm[1] * c + d[1] * t];
    let start: number | null = null;
    const t0 = Math.min(...ts);
    const t1 = Math.max(...ts);
    for (let t = t0; t <= t1 + step; t += step) {
      const p = at(t);
      const inBox = p[0] >= box[0] && p[0] <= box[2] && p[1] >= box[1] && p[1] <= box[3];
      const ok = t <= t1 && inBox && inside(p[0], p[1]);
      if (ok && start === null) start = t;
      if (!ok && start !== null) {
        if (t - step - start >= 0.002) out.push([at(start), at(t - step)]);
        start = null;
      }
    }
  }
  return out;
}

/** Inside a polygon (even-odd). */
function inPolygon(poly: Vec3[], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function hatching(pen: Pen): void {
  const style: Style = { cls: 'hatch', paper: true, width: 0.9 };
  const lines = (id: string, part: string, segs: [Vec2, Vec2][], at: (p: Vec2, b: Build) => Vec3 = (p) => [p[0], p[1], 0]) =>
    segs.forEach(([a, b], i) => pen.draw(`${id}.${i}`, part, (build) => [at(a, build), at(b, build)], style));
  // A lower-right crescent of each tyre, between the rim and the tread, over 100 degrees.
  for (const [name, c] of [['rear', REAR_AXLE], ['front', FRONT_AXLE]] as const) {
    const inside = (x: number, y: number) => {
      const r = Math.hypot(x - c[0], y - c[1]);
      const a = Math.atan2(y - c[1], x - c[0]);
      return r >= WHEEL.rim + 0.002 && r <= WHEEL.tyre - 0.002 && a >= -110 * DEG && a <= -10 * DEG;
    };
    lines(`hatch.tyre.${name}`, 'ground', hatchLines(inside, [c[0] - 0.35, c[1] - 0.35, c[0] + 0.35, c[1] + 0.35]));
  }
  const { x0, x1, y0, y1 } = BASKET;
  lines('hatch.basket', 'ground', hatchLines(() => true, [x0 + 0.006, y0 + 0.006, x1 - 0.006, y1 - 0.006]));
  const spider = (x: number, y: number) => {
    const r = Math.hypot(x - BB[0], y - BB[1]);
    return r >= 0.03 && r <= 0.08;
  };
  lines('hatch.spider', 'ground', hatchLines(spider, [BB[0] - 0.08, BB[1] - 0.08, BB[0] + 0.08, BB[1] + 0.08]));
  // The saddle's top rides with the saddle (its own part, paper all the same): it is redrawn with it.
  const profile = saddleProfile();
  const xs = profile.map((p) => p[0]);
  const ys = profile.map((p) => p[1]);
  const top = sub(SADDLE_TOP, SEAT_CLAMP);
  const upper = (x: number, y: number) => inPolygon(profile, x, y) && y >= top[1] - 0.018;
  const segs = hatchLines(upper, [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]);
  segs.forEach(([a, b], i) =>
    pen.draw(`hatch.saddle.${i}`, 'saddle', (build) => [add([a[0], a[1], 0], mount('saddle', build)), add([b[0], b[1], 0], mount('saddle', build))], {
      ...style,
      redrawRank: 1,
    }),
  );
}

// ---- The margin notes: texture, never words ----

/** Salts for the notes' hash jitter (any fixed integers; the notes are built once, here). */
const NOTE_SALT = { word: 0x51, gap: 0x52, phase: 0x53, rise: 0x54 } as const;

/**
 * One row of scribble, right to left from `x1` to `x0` at height `y`: runs of "words" 30-100 mm long
 * with 20-40 mm gaps, each word a polyline in 4 mm steps whose height wobbles by up to 6 mm on a sine
 * with a hashed phase, now and then rising 12 mm. A sine and a hash only: no glyphs, no text.
 */
export function noteRow(x0: number, x1: number, y: number, seed: number): Vec3[][] {
  const words: Vec3[][] = [];
  let x = x1;
  let w = 0;
  while (x > x0 + 0.03) {
    const h = (salt: number, k = 0) => hash01((seed * 1000 + w * 37 + k) >>> 0, salt);
    const len = Math.min(0.03 + 0.07 * h(NOTE_SALT.word), x - x0);
    const phase = 2 * Math.PI * h(NOTE_SALT.phase);
    const word: Vec3[] = [];
    for (let t = 0, k = 0; t <= len + 1e-9; t += 0.004, k++) {
      const rise = h(NOTE_SALT.rise, k) < 0.12 ? 0.012 : 0;
      word.push([x - t, y + 0.006 * Math.sin(phase + t * 220) + rise, 0]);
    }
    if (word.length >= 2) words.push(word);
    x -= len + 0.02 + 0.02 * h(NOTE_SALT.gap);
    w++;
  }
  return words;
}

function notes(pen: Pen): void {
  NOTE_BLOCKS.forEach((block, b) => {
    for (let r = 0; r < block.rows; r++) {
      noteRow(block.x0, block.x1, block.y - r * 0.036, 1 + b * 10 + r).forEach((word, i) =>
        pen.draw(`note.${b}.${r}.${i}`, 'ground', () => word, { cls: 'note', paper: true, width: 0.85 }),
      );
    }
  });
}

function personMarks(pen: Pen): void {
  const person: Style = { cls: 'person', paper: true };
  pen.draw('person.ring', 'ground', () => arc(RING.centre, RING.radius, RING.start, RING.sweep), { ...person, width: 2.2, mark: 'ring' });
  pen.draw('person.tick', 'ground', () => [...TICK], { ...person, width: 2.4, mark: 'tick' });
}

/**
 * The whole drawing in the pen's order: construction, the rear wheel, the front wheel, the frame,
 * the fork with its basket and lamp, the drive, the saddle, the bars with the cables, the brakes,
 * mudguards and rack, the hatching and the notes; then the person's ring and tick, which are not the
 * pen's. Part space, metres.
 */
export function inkDrawing(): DraftStroke[] {
  const pen = new Pen();
  constructionLines(pen);
  wheel(pen, 'rear-wheel', REAR_AXLE);
  wheel(pen, 'front-wheel', FRONT_AXLE);
  frame(pen);
  fork(pen);
  drive(pen);
  saddle(pen);
  handlebars(pen);
  cables(pen);
  fittings(pen);
  hatching(pen);
  notes(pen);
  personMarks(pen);
  return pen.strokes;
}

/** Segments a stroke list draws: each moving stroke twice (its struck-out copy and its new one), unless it is on one build only. */
export function inkSegmentCount(strokes: readonly Pick<InkStroke, 'points' | 'moves' | 'only'>[]): number {
  return strokes.reduce((n, s) => n + (s.points.length - 1) * (s.moves && !s.only ? 2 : 1), 0);
}
