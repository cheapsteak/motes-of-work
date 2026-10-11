// The ?lib=hole parity cases (parity.ts holeParity): which of the black hole's dots each case draws,
// from which cameras and at which ambients, and each sample's TS reference (src/scene/hole/hole.ts).
// Kept apart from the parity page, which runs in a browser, so a unit test can read them.
import { AMBIENT_POSE } from '../galaxy/ambient';
import { HOLE_DOTS } from '../galaxy/hole';
import type { Vec3 } from '../math/vec';
import {
  diskDot,
  diskPlace,
  holeDotPx,
  holeLens,
  infallDot,
  jetDot,
  knotDot,
  ringDot,
  strandDot,
  strandJoin,
  strandWindow,
  streakLife,
  type HoleDot,
  type HoleView,
} from '../scene/hole/hole';
import { DISK_STRIDE, PART_STRIDE, type HoleAttrs } from '../scene/hole/holeAttrs';
import { diskLife, HOLE_DISK, HOLE_HOUR, HOLE_VIEW } from '../scene/hole/holeLook';
import type { HoleOut } from './fields';

/** The ambients every hole sample is drawn at: the hour's start, the pose, 101 s and the hour's end. */
export const HOLE_AMBIENTS = [0, AMBIENT_POSE, 101, 3599.9] as const;

/** A parity camera: elevation (degrees) and distance, looking at the hole, lifted to put it at NDC y `ndcY` (the inspector's framing), the hole's frame turned `yaw` about +y, and the part's gain. */
export interface HoleCamera {
  elevation: number;
  distance: number;
  ndcY: number;
  yaw: number;
  gain: number;
}

/** The inspector's close shot (elevation 16 at 75, framed), and the lineage beats' overhead (82 at 210), at a lamp's gain. */
export const HOLE_CAMERAS: readonly HoleCamera[] = [
  {
    elevation: HOLE_VIEW.elevation,
    distance: HOLE_VIEW.refDist,
    ndcY: HOLE_VIEW.ndcY,
    yaw: 0.7,
    gain: 1,
  },
  { elevation: 82, distance: 210, ndcY: 0, yaw: -2.3, gain: 1.3 },
];

/** The view of `cam` at ambient `t` (hole.ts HoleView): the camera at its elevation, up y, lifted along its up. */
export function holeParityView(cam: HoleCamera, t: number): HoleView {
  const e = (cam.elevation * Math.PI) / 180;
  const d = cam.distance;
  const zc: Vec3 = [0, Math.sin(e), Math.cos(e)];
  const yc: Vec3 = [0, Math.cos(e), -Math.sin(e)];
  const lift = -cam.ndcY * d * Math.tan((HOLE_VIEW.fov * Math.PI) / 360);
  const camW: Vec3 = [0, d * zc[1] + lift * yc[1], d * zc[2] + lift * yc[2]];
  const c = Math.cos(cam.yaw);
  const s = Math.sin(cam.yaw);
  // The hole's frame turned about +y: its axes in the world.
  const axes: Vec3[] = [
    [c, 0, -s],
    [0, 1, 0],
    [s, 0, c],
  ];
  const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const rows: Vec3[] = [[1, 0, 0], yc, zc];
  const viewRot = axes.flatMap((ax) => rows.map((row) => dot(row, ax)));
  return {
    t,
    cam: axes.map((ax) => dot(ax, camW)) as Vec3,
    viewRot,
    hv: [0, -lift, -d],
    gain: cam.gain,
  };
}

/** One instance of the hole parity shader: its part, its attributes (aHoleA, aHoleB, aHoleC), aHoleIn's yzw, and its ambient. */
export interface HoleSample {
  part: number;
  a: Float32Array;
  input: [number, number, number];
  t: number;
}

export interface HoleCase {
  name: string;
  samples: HoleSample[];
}

/** The hole parity shader's parts (aHoleIn.x). */
export const HolePart = {
  lens: 0,
  disk: 1,
  ring: 2,
  jet: 3,
  knot: 4,
  infall: 5,
  strand: 6,
  join: 7,
} as const;

/** holeLens's points about the hole's centre (view space): front and behind, inside and outside the shadow, on the axis, past the view's edge. */
const LENS_POINTS: Vec3[] = [
  [6, 0, 2],
  [0.2, 0, -1],
  [0.5, 0, 3],
  [3, 1, -0.5],
  [6, -2, -4],
  [0.4, 0.2, -9],
  [11, 3, -2],
  [0, 0, -5],
  [0, 0, 5],
  [11.6, 0, 2],
  [2, 1.5, -0.3],
  [-4.5, 7, 6],
];

/** The knots' fronts (ember, clean): none, the broadcast, both through, and mid-fix. */
export const HOLE_FRONTS: readonly [number, number][] = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0.5, 0.2],
];
/** R1's strand1, and the heats, every strand dot is drawn under. */
export const HOLE_STRAND1 = [0, 0.3, 0.6, 1] as const;
export const HOLE_HEATS = [1, 0.4, 0] as const;

const dotOf = (set: Float32Array, i: number, stride: number) => set.slice(i * stride, (i + 1) * stride);
const atAmbients = (part: number, a: Float32Array, input: [number, number, number]): HoleSample[] =>
  HOLE_AMBIENTS.map((t) => ({ part, a, input, t }));
const mod = (x: number, y: number) => x - y * Math.floor(x / y);

/**
 * Disk samples chosen by their lives: `count` streak dots each just before and just after a life
 * boundary (0.05 s either side), and `count` in the middle of a hot life; each through both images
 * (image 1 at its own clock, arcDelay later).
 */
function diskLifeSamples(disk: Float32Array, count: number): HoleSample[] {
  const out: HoleSample[] = [];
  const lag = HOLE_DISK.motion.arcDelay;
  let boundaries = 0;
  let hot = 0;
  for (let i = 0; i < HOLE_DOTS.disk && (boundaries < count || hot < count); i += 7) {
    const o = i * DISK_STRIDE;
    const k = disk[o + 8];
    if (k < 0) continue;
    const lives = disk[o + 7];
    const { life, offset } = diskLife(k, disk[o + 5]);
    const a = dotOf(disk, i, DISK_STRIDE);
    // Life m starts at m life - offset.
    if (boundaries < count) {
      const m = 1 + (i % (lives - 1 || 1));
      const at = mod(m * life - offset, HOLE_HOUR);
      if (at > 1 && at < HOLE_HOUR - 3) {
        for (const image of [0, 1])
          for (const dt of [-0.05, 0.05])
            out.push({
              part: HolePart.disk,
              a,
              input: [image, 0, 0],
              t: at + dt + image * lag,
            });
        boundaries++;
      }
    }
    if (hot < count) {
      for (let n = 0; n < lives; n++) {
        if (!streakLife(k, disk[o + 5], n).hot) continue;
        const at = mod((n + 0.5) * life - offset, HOLE_HOUR);
        if (at > 1 && at < HOLE_HOUR - 3) {
          for (const image of [0, 1])
            out.push({
              part: HolePart.disk,
              a,
              input: [image, 0, 0],
              t: at + image * lag,
            });
          if (diskPlace(disk, i, at).hot !== 1) throw new Error(`disk dot ${i} is not hot at ${at}`);
          hot++;
        }
        break;
      }
    }
  }
  if (boundaries < count || hot < count) throw new Error(`found ${boundaries} life boundaries and ${hot} hot lives of ${count}`);
  return out;
}

/** Every hole case: the samples each draws from both cameras. */
export function holeParityCases(attrs: HoleAttrs): HoleCase[] {
  const disk: HoleSample[] = [];
  for (let i = 0; i < HOLE_DOTS.disk; i += 30)
    for (const image of [0, 1]) disk.push(...atAmbients(HolePart.disk, dotOf(attrs.disk, i, DISK_STRIDE), [image, 0, 0]));
  disk.push(...diskLifeSamples(attrs.disk, 32));
  const each = (set: Float32Array, part: number, step = 1, input: [number, number, number] = [0, 0, 0]): HoleSample[] => {
    const out: HoleSample[] = [];
    for (let i = 0; i < set.length / PART_STRIDE; i += step) out.push(...atAmbients(part, dotOf(set, i, PART_STRIDE), input));
    return out;
  };
  const strands: HoleSample[] = [];
  for (const strand1 of HOLE_STRAND1)
    for (const heat of HOLE_HEATS)
      for (const [set, which] of [
        [attrs.strand0, 0],
        [attrs.strand1, 1],
      ] as const)
        strands.push(...each(set, HolePart.strand, 5, [0, strandWindow(which, strand1).head, heat]));
  const lensPoint = (p: Vec3) => {
    const a = new Float32Array(PART_STRIDE);
    a.set(p);
    return a;
  };
  return [
    {
      name: 'hole: holeLens',
      samples: LENS_POINTS.flatMap((p) => [0, 1].flatMap((image) => atAmbients(HolePart.lens, lensPoint(p), [image, 0, 0]))),
    },
    { name: 'hole: diskDot', samples: disk },
    { name: 'hole: ringDot', samples: each(attrs.ring, HolePart.ring) },
    { name: 'hole: jetDot', samples: each(attrs.jets, HolePart.jet, 4) },
    {
      name: 'hole: knotDot',
      samples: HOLE_FRONTS.flatMap((f) => each(attrs.knots, HolePart.knot, 1, [0, f[0], f[1]])),
    },
    { name: 'hole: infallDot', samples: each(attrs.infall, HolePart.infall) },
    { name: 'hole: strandDot', samples: strands },
    {
      name: 'hole: strandJoin',
      samples: [0, 1].flatMap((which) => atAmbients(HolePart.join, lensPoint([which, 0, 0]), [0, 0, 0])),
    },
  ];
}

/** The view as the shader's uniforms and attribute carry it: float32. */
function view32(cam: HoleCamera, t: number): HoleView {
  const v = holeParityView(cam, t);
  const f = Math.fround;
  return {
    t: f(t),
    cam: v.cam.map(f) as Vec3,
    viewRot: v.viewRot.map(f),
    hv: v.hv.map(f) as Vec3,
    gain: f(v.gain),
  };
}

/**
 * A sample's TS reference from `cam`: every HoleOut field. A lens sample's point is about the camera's
 * hole centre (hv + the point), and its ok is the lens's.
 */
export function holeReference(s: HoleSample, cam: HoleCamera): HoleOut {
  const v = view32(cam, s.t);
  const image = s.input[0] as 0 | 1;
  let d: HoleDot = {
    view: [0, 0, 0],
    rgb: [0, 0, 0],
    alpha: 0,
    sizeCss: 0,
    ok: 0,
  };
  let ember = 0;
  if (s.part === HolePart.lens) {
    const l = holeLens(lensInput(s, cam), v.hv, image);
    d = { ...d, view: l.pos, ok: l.ok };
  } else if (s.part === HolePart.disk) d = diskDot(s.a, 0, v, image);
  else if (s.part === HolePart.ring) d = ringDot(s.a, 0, v);
  else if (s.part === HolePart.jet) d = jetDot(s.a, 0, v);
  else if (s.part === HolePart.knot) {
    const k = knotDot(s.a, 0, v, {
      ember: Math.fround(s.input[1]),
      clean: Math.fround(s.input[2]),
    });
    d = k;
    ember = k.ember;
  } else if (s.part === HolePart.infall) d = infallDot(s.a, 0, v);
  else if (s.part === HolePart.strand)
    d = strandDot(s.a, 0, v, {
      head: Math.fround(s.input[1]),
      heat: Math.fround(s.input[2]),
    });
  else if (s.part === HolePart.join) d = { ...d, view: strandJoin(s.a[0] as 0 | 1, v.t) };
  return {
    view: d.view,
    alpha: d.alpha,
    rgb: d.rgb,
    sizeCss: d.sizeCss,
    ok: d.ok,
    ember,
    px: holeDotPx(d.sizeCss, -d.view[2], 2),
  };
}

/** A lens sample's view-space point, float32 as its attribute: the camera's hole centre plus the sample's offset. */
export function lensInput(s: HoleSample, cam: HoleCamera): Vec3 {
  const hv = holeParityView(cam, 0).hv;
  return [0, 1, 2].map((c) => Math.fround(hv[c] + s.a[c])) as Vec3;
}
