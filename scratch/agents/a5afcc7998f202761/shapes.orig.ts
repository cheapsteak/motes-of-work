// Part geometry for the town bicycle, in metres and in part space (index.ts scales it). Each part is
// built about the point `pose` places it at: wheels about their axles, the cranks about the bottom
// bracket, steered parts about the head-tube top, the saddle about the seat clamp (on the twin, its
// mount on the steering axis), the handlebars about the stem clamp (on the twin, the seat-tube
// stub's top), pedals about their own centres. The frame, the ground and the loose bolts are built
// in bike coordinates. Every part is a union of closed solids, except the ground: a single-sided
// strip facing up.
import { Quaternion, Shape, ShapeGeometry, TorusGeometry, Vector2, Vector3, type BufferGeometry } from 'three';
import type { Vec2, Vec3 } from '../../math/vec';
import { extrudeProfile } from '../../shapes/extrude';
import { involuteGear } from '../../shapes/involute';
import { axle, ball, bar, circle, plate } from '../../shapes/primitives';
import { merge, weighted } from '../partGeometry';
import {
  BB,
  CHAIN_MODULE,
  CHAIN_Z,
  CHAINRING_TEETH,
  CRANK,
  CRANK_Z,
  FRONT_AXLE,
  HEAD_ANGLE,
  HEAD_BOTTOM,
  HEAD_TOP,
  MAST_JOIN,
  MAST_MOUNT,
  MAST_SLEEVE,
  PEDAL,
  PEDAL_Z,
  REAR_AXLE,
  SADDLE_TOP,
  SEAT_CLAMP,
  SEAT_DIR,
  SPROCKET_TEETH,
  STEER_AXIS,
  STEER_MOUNT,
  STUB_TOP,
  WHEEL,
} from './kinematics';

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const withZ = (p: Vec3, z: number): Vec3 => [p[0], p[1], z];
const polar = (r: number, a: number): Vec3 => [r * Math.cos(a), r * Math.sin(a), 0];
const DEG = Math.PI / 180;

/** A capped round bar of `radius` from `a` to `b`. */
export function tube(a: Vec3, b: Vec3, radius: number, segments = 12): BufferGeometry {
  const d = sub(b, a);
  const length = Math.hypot(...d);
  const g = axle(radius, length, segments); // along z, centred
  const q = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), new Vector3(...d).normalize());
  return g.applyQuaternion(q).translate(...scale(add(a, b), 0.5));
}

/** A ball of `radius` at `p`. */
const knob = (p: Vec3, radius: number): BufferGeometry => ball(radius).translate(...p);

// ---- Wheels and drive ----

export const chainringOutline = (): Vec2[] => involuteGear({ teeth: CHAINRING_TEETH, module: CHAIN_MODULE });
export const sprocketOutline = (): Vec2[] => involuteGear({ teeth: SPROCKET_TEETH, module: CHAIN_MODULE });

/** Where the spoke reflector sits on each wheel: radius, angle (between the first two spokes) and z. */
export const REFLECTOR = { r: 0.2, angle: Math.PI / 12, z: 0.018 } as const;

/**
 * Tyre, rim, hub with flanges, 12 spokes laced alternately to each flange, and a spoke reflector on
 * the drive side; about the axle. The reflector breaks the spokes' symmetry, so a wheel turned off
 * its ghost reads in a still frame however far it has turned.
 */
function wheel(hubLength: number): BufferGeometry {
  const { tyre, section, rim, hub, spokes } = WHEEL;
  const rimInner = rim - 0.016;
  const tyreGeom = new TorusGeometry(tyre - section / 2, section / 2, 12, 96);
  tyreGeom.deleteAttribute('uv');
  const flangeZ = 0.03;
  const parts = [
    tyreGeom,
    extrudeProfile(circle(0, 0, rim, 96), [circle(0, 0, rimInner, 96)], 0.02),
    axle(hub, hubLength, 16),
    axle(0.036, 0.004, 16).translate(0, 0, flangeZ),
    axle(0.036, 0.004, 16).translate(0, 0, -flangeZ),
  ];
  for (let k = 0; k < spokes; k++) {
    const a = (k * 2 * Math.PI) / spokes;
    const z = k % 2 === 0 ? flangeZ : -flangeZ;
    parts.push(tube(withZ(polar(0.032, a), z), polar(rimInner + 0.002, a), 0.003, 6));
  }
  parts.push(
    plate(0.08, 0.035, 0.008, 0.012)
      .rotateZ(REFLECTOR.angle)
      .translate(...withZ(polar(REFLECTOR.r, REFLECTOR.angle), REFLECTOR.z)),
  );
  return merge(...parts);
}

export function frontWheel(): BufferGeometry {
  return wheel(0.1);
}

/** The rear wheel carries its 16-tooth sprocket on the chain line. */
export function rearWheel(): BufferGeometry {
  return merge(wheel(0.13), extrudeProfile(sprocketOutline(), [circle(0, 0, 0.02)], 0.004).translate(0, 0, CHAIN_Z));
}

/** Chainring on a five-arm spider, the crank axle and both crank arms (right along +x); about the bottom bracket. */
export function cranks(): BufferGeometry {
  const ringInner = 0.066;
  const arms = Array.from({ length: 5 }, (_, k) =>
    bar(ringInner + 0.004, 0.008, 0.006)
      .rotateZ((k * 2 * Math.PI) / 5 + Math.PI / 5)
      .translate(0, 0, CHAIN_Z + 0.004),
  );
  return merge(
    extrudeProfile(chainringOutline(), [circle(0, 0, ringInner, 64)], 0.004).translate(0, 0, CHAIN_Z),
    ...arms,
    axle(0.011, 2 * CRANK_Z + 0.02, 16),
    bar(CRANK, 0.013, 0.014).translate(0, 0, CRANK_Z),
    bar(CRANK, 0.013, 0.014).rotateZ(Math.PI).translate(0, 0, -CRANK_Z),
  );
}

/** Pin to pin, for one chain segment: a little short of the segment pitch, so the links read apart. */
export const LINK_LENGTH = 0.04;

/** One chain segment: a rounded link along x, centred on the origin. */
export function chainLink(): BufferGeometry {
  return bar(LINK_LENGTH, 0.0045, 0.008).translate(-LINK_LENGTH / 2, 0, 0);
}

/** A pedal platform about its centre, with its spindle running inboard to the crank (side +1 is the drive side). */
export function pedal(side: 1 | -1): BufferGeometry {
  const reach = PEDAL_Z - CRANK_Z;
  return merge(
    plate(PEDAL.length, PEDAL.thickness, PEDAL.width, 0.006),
    tube([0, 0, -side * PEDAL.width * 0.4], [0, 0, -side * (reach + 0.004)], 0.006, 10),
  );
}

// ---- Frame and fork ----

/**
 * Which bicycle a shape is for. The frame, the saddle and the handlebars have a second shape on the
 * wrong twin, built by the same calls with other dimensions, so each solid's points map one to one
 * (a tube keeps its points at the same place along and round it). Every other part has one shape.
 */
export type Build = 'correct' | 'twin';

const TUBE = 0.016;
const STAY = 0.008;
/** The seat stays and top tube meet the seat tube this far up it. */
const STAY_TOP = 0.5;
const SEAT_LUG: Vec3 = add(BB, scale(SEAT_DIR, STAY_TOP));
const REAR_DROPOUT_Z = 0.065;
/** The rear brake's bridge sits this far out from the rear axle, along the seat stays. */
const REAR_BRAKE_REACH = 0.385;
const STAY_DIR: Vec3 = scale(sub(SEAT_LUG, REAR_AXLE), 1 / Math.hypot(...sub(SEAT_LUG, REAR_AXLE)));
/** Square to the steering axis, pointing forward. */
const HEAD_FORWARD: Vec3 = [Math.sin(HEAD_ANGLE), Math.cos(HEAD_ANGLE), 0];
const along = (p: Vec3, dir: Vec3, t: number): Vec3 => add(p, scale(dir, t));

/** Where the top tube meets the head tube; on the twin, the mast, high above the headset. */
export function topTubeEnds(build: Build): [Vec3, Vec3] {
  return [SEAT_LUG, along(HEAD_TOP, STEER_AXIS, build === 'twin' ? MAST_JOIN : -0.03)];
}

/** One of the frame's tube solids: a round bar of `radius` from `a` to `b`, `segments` round. */
interface FrameTube {
  a: Vec3;
  b: Vec3;
  radius: number;
  segments: number;
}

/**
 * The frame's solids by name (bike coordinates), for `frame()` to build and `FRAME_LAY` to order.
 * On the twin the seat tube stops at the stub that holds the handlebars, the head tube runs on up as
 * the mast's sleeve, and the top tube climbs from the stub to the mast.
 */
function frameTubes(build: Build) {
  const twin = build === 'twin';
  const seatTop = twin ? STUB_TOP : SEAT_CLAMP;
  const headTop = twin ? along(HEAD_TOP, STEER_AXIS, MAST_SLEEVE) : HEAD_TOP;
  const [topTubeRear, topTubeFront] = topTubeEnds(build);
  const bridge = add(REAR_AXLE, scale(STAY_DIR, REAR_BRAKE_REACH + 0.02));
  const bar = (a: Vec3, b: Vec3, radius: number, segments = 12): FrameTube => ({ a, b, radius, segments });
  return {
    seatTube: bar(BB, seatTop, TUBE, 16),
    collar: bar(add(seatTop, scale(SEAT_DIR, -0.03)), seatTop, TUBE + 0.004, 16), // seat clamp collar; on the twin, the stem's
    headTube: bar(HEAD_BOTTOM, headTop, 0.019, 16),
    topTube: bar(topTubeRear, topTubeFront, 0.015, 16),
    downTube: bar(BB, add(HEAD_BOTTOM, scale(STEER_AXIS, 0.03)), 0.018, 16),
    shell: bar(withZ(BB, -0.035), withZ(BB, 0.035), 0.021, 16),
    bridge: bar(withZ(bridge, -0.03), withZ(bridge, 0.03), 0.006),
    /** Non-drive side, then drive side. */
    sides: [-1, 1].map((s) => ({
      chainstay: bar(withZ(BB, s * 0.03), withZ(REAR_AXLE, s * REAR_DROPOUT_Z), STAY),
      seatStay: bar(withZ(SEAT_LUG, s * 0.02), withZ(REAR_AXLE, s * REAR_DROPOUT_Z), STAY),
      dropout: bar(withZ(REAR_AXLE, s * (REAR_DROPOUT_Z - 0.006)), withZ(REAR_AXLE, s * (REAR_DROPOUT_Z + 0.006)), 0.016),
    })),
    frontCable: frontCableRun(build),
    rearCable: rearCableRun(build),
  };
}

/**
 * The main triangle, head tube, stays, bottom-bracket shell, brake bridge and the brake cables'
 * runs (bike coordinates). On the twin the seat tube stops at the stub that holds the handlebars,
 * the head tube runs on up as the mast's sleeve, and the top tube climbs from the stub to the mast.
 */
export function frame(build: Build = 'correct'): BufferGeometry {
  const f = frameTubes(build);
  const solid = (t: FrameTube) => tube(t.a, t.b, t.radius, t.segments);
  return merge(
    ...[f.seatTube, f.collar, f.headTube, f.topTube, f.downTube, f.shell, f.bridge].map(solid),
    ...f.sides.flatMap((s) => [s.chainstay, s.seatStay, s.dropout].map(solid)),
    cable(f.frontCable),
    cable(f.rearCable),
  );
}

/** Where the fork crown sits, just under the head tube. */
const CROWN: Vec3 = add(HEAD_BOTTOM, scale(STEER_AXIS, -0.02));
const FORK_Z = 0.05;

/**
 * The town bike's front basket (bike coordinates): an open-topped box over the front wheel, ahead of
 * the head tube and under the bars, carried on the fork, so it turns with the front wheel. The same
 * on both bikes, and the strongest "this is the front" there is: on the twin the saddle perches
 * just behind and above it.
 */
export const BASKET = { x0: 0.9, x1: 1.2, y0: 0.76, y1: 0.97, halfWidth: 0.13, wall: 0.008 } as const;

/**
 * The basket's broad panels draw this fraction of the fork's density: enough motes to read as a box,
 * few enough not to take the fork's share from the rest of the bike.
 */
const BASKET_WEIGHT = 0.22;

/**
 * The headlamp hung under the front of the basket, looking forward, clear of the mudguard and set off
 * against the dark below the basket so it reads on its own: the same on both bikes.
 */
export const HEADLAMP = {
  centre: [BASKET.x1 + 0.05, BASKET.y0 - 0.045, 0] as Vec3,
  radius: 0.05,
  depth: 0.09,
} as const;

/** The basket's walls, floor and rim, the stays that carry it, and its headlamp (bike coordinates). */
function basket(): BufferGeometry {
  const { x0, x1, y0, y1, halfWidth: w, wall } = BASKET;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const long = x1 - x0;
  const high = y1 - y0;
  const rim = (a: Vec3, b: Vec3) => tube(a, b, 0.01, 8);
  const corner = (x: number, z: number): Vec3 => [x, y1, z];
  const { centre, radius, depth } = HEADLAMP;
  return merge(
    // Each panel stops a little short of the next, so no two share a face.
    plate(long - 0.004, 2 * w - 0.004, wall, 0.01).rotateX(Math.PI / 2).translate(cx, y0, 0), // floor
    ...[x0, x1].map((x) => plate(2 * w - 0.004, high, wall, 0.01).rotateY(Math.PI / 2).translate(x, cy, 0)), // back, front
    ...[-w, w].map((z) => plate(long, high, wall, 0.01).translate(cx, cy, z)), // sides
    // The long rims run a rim's radius past the corners, so their end caps never meet the short rims'.
    rim(corner(x0 - 0.01, -w), corner(x1 + 0.01, -w)),
    rim(corner(x0 - 0.01, w), corner(x1 + 0.01, w)),
    rim(corner(x0, -w), corner(x0, w)),
    rim(corner(x1, -w), corner(x1, w)),
    // Carried on the fork: back corners to the crown, front corners down to the axle.
    ...[-1, 1].flatMap((s) => [
      tube([x0, y0, s * (w - 0.03)], withZ(CROWN, s * FORK_Z), 0.007, 8),
      tube([x1 - 0.02, y0, s * (w - 0.03)], withZ(FRONT_AXLE, s * (FORK_Z + 0.02)), 0.006, 8),
    ]),
    tube([x1 - 0.02, y0, 0], add(centre, [-depth / 4, radius * 0.6, 0]), 0.008, 8), // the lamp bracket
    tube(sub(centre, [depth / 2, 0, 0]), add(centre, [depth / 2, 0, 0]), radius, 16),
    knob(add(centre, [depth / 2, 0, 0]), radius * 0.8), // the lens
  );
}

/** Steerer, headset cups, crown, the two blades down to the front axle, and the basket with its headlamp; about the head-tube top. */
export function fork(): BufferGeometry {
  const at = (p: Vec3): Vec3 => sub(p, HEAD_TOP);
  const cup = (p: Vec3) => tube(at(add(p, scale(STEER_AXIS, -0.007))), at(add(p, scale(STEER_AXIS, 0.007))), 0.023, 16);
  const steerer = merge(
    tube(at(add(HEAD_BOTTOM, scale(STEER_AXIS, -0.03))), at(STEER_MOUNT), 0.012, 12),
    cup(HEAD_TOP),
    cup(HEAD_BOTTOM),
    tube(at(withZ(CROWN, -FORK_Z - 0.01)), at(withZ(CROWN, FORK_Z + 0.01)), 0.015, 12),
    ...[-1, 1].map((s) => tube(at(withZ(CROWN, s * FORK_Z)), at(withZ(FRONT_AXLE, s * FORK_Z)), 0.011, 12)),
  );
  return merge(weighted(steerer, 1), weighted(basket().translate(...scale(HEAD_TOP, -1)), BASKET_WEIGHT));
}

// ---- Brakes and mudguards ----

/**
 * A rim-brake caliper about `origin`, reaching from `reach` out along `dir` (from the axle at
 * `axle`) down both sides of the tyre to pads on the rim.
 */
function caliper(axleAt: Vec3, dir: Vec3, reach: number, origin: Vec3): BufferGeometry {
  const at = (p: Vec3): Vec3 => sub(p, origin);
  const top = add(axleAt, scale(dir, reach));
  const pad = add(axleAt, scale(dir, WHEEL.rim - 0.008));
  const tangent: Vec3 = [-dir[1], dir[0], 0];
  return merge(
    tube(at(withZ(top, -0.036)), at(withZ(top, 0.036)), 0.006, 10),
    knob(at(withZ(top, 0.04)), 0.011),
    ...[-1, 1].flatMap((s) => [
      tube(at(withZ(top, s * 0.036)), at(withZ(pad, s * 0.03)), 0.005, 8),
      tube(
        at(withZ(add(pad, scale(tangent, -0.02)), s * 0.022)),
        at(withZ(add(pad, scale(tangent, 0.02)), s * 0.022)),
        0.006,
        8,
      ),
    ]),
  );
}

const FRONT_BRAKE_DIR: Vec3 = (() => {
  const d = sub(CROWN, FRONT_AXLE);
  return scale(d, 1 / Math.hypot(...d));
})();
const FRONT_BRAKE_REACH = Math.hypot(...sub(CROWN, FRONT_AXLE)) - 0.03;

/** Front caliper, hung from the fork crown; about the head-tube top (it steers). */
export function brakeFront(): BufferGeometry {
  return caliper(FRONT_AXLE, FRONT_BRAKE_DIR, FRONT_BRAKE_REACH, HEAD_TOP);
}

/** Rear caliper on the seat-stay bridge; about the rear axle. */
export function brakeRear(): BufferGeometry {
  return caliper(REAR_AXLE, STAY_DIR, REAR_BRAKE_REACH, REAR_AXLE);
}

/** Mudguard radii and depth: a strip just clear of the tyre. */
export const MUDGUARD = { inner: 0.352, outer: 0.36, width: 0.05 } as const;

/** An annular sector from angle a0 to a1 (radians, CCW from +x) about the origin. */
function guard(a0: number, a1: number): BufferGeometry {
  const n = 48;
  const arc = (r: number, from: number, to: number): Vec2[] =>
    Array.from({ length: n + 1 }, (_, i) => {
      const a = from + ((to - from) * i) / n;
      return [r * Math.cos(a), r * Math.sin(a)];
    });
  return extrudeProfile([...arc(MUDGUARD.outer, a0, a1), ...arc(MUDGUARD.inner, a1, a0)], [], MUDGUARD.width);
}

/** Over the top-rear of the front wheel, clear of the crown; about the head-tube top (it steers). */
export function mudguardFront(): BufferGeometry {
  const [x, y] = sub(FRONT_AXLE, HEAD_TOP);
  return guard(25 * DEG, 195 * DEG).translate(x, y, 0);
}

/** The reflector on the tail of the rear mudguard, facing back: the same on both bikes, so the back always reads. */
export const TAIL_REFLECTOR = { angle: 186 * DEG, width: 0.08, height: 0.05, depth: 0.012 } as const;

/**
 * The rear rack over the back wheel (about the rear axle): a flat deck clear of the mudguard, legs
 * down to the dropouts and struts forward to the seat stays. The same on both bikes.
 */
export const RACK = { x0: -0.27, x1: 0.17, height: 0.4, halfWidth: 0.07 } as const;

function rack(): BufferGeometry {
  const { x0, x1, height: y, halfWidth: w } = RACK;
  const stay = (t: number, s: number): Vec3 => withZ(scale(STAY_DIR, t), s * (REAR_DROPOUT_Z - 0.045 * (t / 0.494)));
  // The deck is a broad plate: sampled at RACK_DECK_WEIGHT of the mudguard's density, like the basket.
  const deck = plate(x1 - x0, 2 * w, 0.008, 0.01).rotateX(Math.PI / 2).translate((x0 + x1) / 2, y, 0);
  const frame = merge(
    ...[-1, 1].flatMap((s) => [
      tube([x0, y, s * w], [x1, y, s * w], 0.006, 8), // side rail
      tube([x0 + 0.04, y, s * w], [0, 0, s * (REAR_DROPOUT_Z + 0.012)], 0.005, 8), // leg to the dropout
      tube([x1 - 0.01, y, s * w], stay(0.3, s), 0.005, 8), // strut to the seat stay
    ]),
  );
  return merge(weighted(deck, RACK_DECK_WEIGHT), weighted(frame, 1));
}

const RACK_DECK_WEIGHT = 0.15;

/** Over the top-rear of the back wheel, from behind the seat tube, with its reflector and the rack; about the rear axle. */
export function mudguardRear(): BufferGeometry {
  const { angle, width, height, depth } = TAIL_REFLECTOR;
  const reflector = plate(width, height, depth, 0.008)
    .rotateY(Math.PI / 2) // its face square to x, looking back
    .translate(...polar(MUDGUARD.outer + depth / 2 + 0.004, angle));
  return merge(weighted(merge(guard(35 * DEG, 200 * DEG), reflector), 1), rack());
}

// ---- Brake cables ----

/** Cable housing radius: thin, but thick enough to carry a line of motes. */
const CABLE = 0.005;

/** A cable through `points` (bike coordinates): one capped tube per leg. */
function cable(points: Vec3[]): BufferGeometry {
  return merge(...points.slice(1).map((p, i) => tube(points[i], p, CABLE, 6)));
}

/** `n` points on a curve from `a` to `b` that bows out by about `bulge` at its middle. */
function bow(a: Vec3, b: Vec3, bulge: Vec3, n = 4): Vec3[] {
  const c = add(scale(add(a, b), 0.5), scale(bulge, 2));
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    return add(add(scale(a, (1 - t) * (1 - t)), scale(c, 2 * t * (1 - t))), scale(b, t * t));
  });
}

/** The front cable runs on the left (non-drive) side of the tubes, the rear on the right. */
const FRONT_SIDE = -0.024;
const REAR_SIDE = 0.024;
/** Where each cable goes into its caliper: the front one's centre (on the steering axis, so it barely moves as the fork turns), the rear one's pivot bolt. */
const FRONT_CABLE_END: Vec3 = add(FRONT_AXLE, scale(FRONT_BRAKE_DIR, FRONT_BRAKE_REACH + 0.012));
const REAR_CABLE_END: Vec3 = withZ(add(REAR_AXLE, scale(STAY_DIR, REAR_BRAKE_REACH + 0.012)), 0.04);
/** On the correct bike the housings from the levers end at stops on the front of the head-tube top. */
const cableStop = (z: number): Vec3 => withZ(along(HEAD_TOP, HEAD_FORWARD, 0.032), z);

/** On the twin, where each housing from the low bars meets the frame: the front one on the top tube, the rear one on the stub. */
function twinCableStops(): { front: Vec3; rear: Vec3 } {
  const [rear, front] = topTubeEnds('twin');
  const dir = scale(sub(front, rear), 1 / Math.hypot(...sub(front, rear)));
  return {
    front: withZ(along(rear, dir, 0.1), FRONT_SIDE),
    rear: withZ(along(STUB_TOP, SEAT_DIR, -0.06), REAR_SIDE),
  };
}

/**
 * The front brake cable's run on the frame: correct, from its stop down the front of the head tube
 * to the caliper; on the twin, from the top tube by the stub, up the climbing top tube to the mast,
 * and down the head tube to the caliper.
 */
export function frontCableRun(build: Build): Vec3[] {
  const headBottom = withZ(along(HEAD_BOTTOM, HEAD_FORWARD, 0.03), FRONT_SIDE);
  if (build === 'correct') {
    const stop = cableStop(FRONT_SIDE);
    // Bowed a little forward at the middle: two legs on one line would share their end caps exactly.
    return [stop, along(add(scale(stop, 0.5), scale(headBottom, 0.5)), HEAD_FORWARD, 0.006), headBottom, FRONT_CABLE_END];
  }
  const [, mast] = topTubeEnds('twin');
  return [twinCableStops().front, withZ(along(mast, STEER_AXIS, -0.025), FRONT_SIDE), headBottom, FRONT_CABLE_END];
}

/**
 * The rear brake cable's run on the frame: correct, from its stop along the top tube and down the
 * seat stay to the caliper; on the twin, a short loop from the stub down to the caliper.
 */
export function rearCableRun(build: Build): Vec3[] {
  if (build === 'correct') {
    const [rear, front] = topTubeEnds('correct');
    return [cableStop(REAR_SIDE), withZ(front, REAR_SIDE), withZ(rear, REAR_SIDE), REAR_CABLE_END];
  }
  return bow(twinCableStops().rear, REAR_CABLE_END, [-0.035, 0, 0.01]);
}

// ---- The rider's contact points ----

/** The twin's steering column, where it shows above the mast sleeve. */
const MAST_COLUMN = 0.016;

/** The saddle's thickness, and how far its nose dips: thin and tilted, so it reads as a saddle, not a brick. */
export const SADDLE = { thick: 0.028, noseDown: 4 * DEG } as const;

/**
 * A town saddle about the seat clamp. On the correct bike it sits on a seat post with a clamp; on
 * the twin (about its mount on the steering axis, MAST_MOUNT) on a cradle fixed across the top of
 * the steering column, which rises through (and telescopes in) the mast sleeve and turns with the fork.
 */
export function saddle(build: Build = 'correct'): BufferGeometry {
  const top = sub(SADDLE_TOP, SEAT_CLAMP);
  const { thick, noseDown } = SADDLE;
  const postTop = add(top, scale(SEAT_DIR, -thick - 0.01));
  // Top view: broad at the back, narrowing to a nose forward of the seat-tube line.
  const outline: Vec2[] = Array.from({ length: 40 }, (_, i) => {
    const t = (i / 40) * Math.PI * 2;
    return [0.135 * Math.cos(t) + 0.02, 0.15 * (0.55 - 0.45 * Math.cos(t)) * Math.sin(t)];
  });
  // Tilted about the saddle-top point, so the top still passes through it.
  const body = extrudeProfile(outline, [], thick)
    .rotateX(Math.PI / 2)
    .translate(0, -thick / 2, 0)
    .rotateZ(-noseDown)
    .translate(top[0], top[1], 0);
  if (build === 'twin') {
    // The column comes up the steering axis from the head-tube top (MAST_MOUNT is on the axis).
    const columnFoot = scale(STEER_AXIS, -(MAST_MOUNT[1] - HEAD_TOP[1]) / STEER_AXIS[1]);
    const length = Math.hypot(...sub(postTop, columnFoot));
    const rail: Vec3 = [Math.cos(noseDown), -Math.sin(noseDown), 0];
    return merge(
      tube(add(postTop, scale(STEER_AXIS, -length)), postTop, MAST_COLUMN, 12),
      tube(along(postTop, rail, -0.075), along(postTop, rail, 0.06), 0.012, 10), // the cradle
      body,
    );
  }
  return merge(
    tube(scale(SEAT_DIR, -0.03), postTop, 0.0135, 12),
    tube(add(postTop, [0, 0, -0.03]), add(postTop, [0, 0, 0.03]), 0.012, 10),
    body,
  );
}

/** Stem clamp to bar centre: up the steerer line (on the twin, a short stem up the stub), then forward. */
const STEM_RISE = 0.1;
const STEM_RISE_TWIN = 0.035;
const STEM_REACH = 0.07;
const stemTop = (build: Build): Vec3 =>
  build === 'twin' ? scale(SEAT_DIR, STEM_RISE_TWIN) : scale(STEER_AXIS, STEM_RISE);
const barCentre = (build: Build): Vec3 => add(stemTop(build), [STEM_REACH, 0, 0]);
/** Swept-back bars: out to each side, back to the grips (side +1 the drive side). */
const barPoints = (s: number, build: Build = 'correct'): [Vec3, Vec3, Vec3] => [
  add(barCentre(build), [0, 0, s * 0.16]),
  add(barCentre(build), [-0.13, 0.03, s * 0.26]),
  add(barCentre(build), [-0.23, 0.04, s * 0.28]),
];

/** The centre of each grip on the correct bike, relative to the stem clamp: right (drive side) then left. */
export const GRIPS: [Vec3, Vec3] = [1, -1].map((s) => {
  const [, g0, g1] = barPoints(s);
  return scale(add(g0, g1), 0.5);
}) as [Vec3, Vec3];

/**
 * Each lever's cable housing (bike coordinates, the bars at `mount`): from the lever forward in a
 * loop to where the cable meets the frame. Correct, to the stops on the head-tube top; on the twin,
 * from the low bars on the stub, back to the top tube (front brake) and down the stub (rear).
 */
export function cableHousing(s: 1 | -1, build: Build, mount: Vec3): Vec3[] {
  const [, g0] = barPoints(s, build);
  const lever = add(mount, add(g0, [0.012, -0.022, -s * 0.01]));
  const front = s === -1; // the left lever works the front brake
  if (build === 'correct') return bow(lever, cableStop(front ? FRONT_SIDE : REAR_SIDE), [0.07, 0.02, s * 0.02]);
  const stops = twinCableStops();
  return bow(lever, front ? stops.front : stops.rear, [0.02, -0.04, s * 0.03]);
}

/**
 * Stem, swept-back town bars with grips and brake levers, the levers' cable housings, and the
 * bell; about the stem clamp. On the twin the stem is a short one, clamped in the seat-tube stub.
 */
export function handlebars(build: Build = 'correct'): BufferGeometry {
  const r = 0.011;
  const twin = build === 'twin';
  const stemDir = twin ? SEAT_DIR : STEER_AXIS;
  const rise = stemTop(build);
  const centre = barCentre(build);
  const mount = twin ? STUB_TOP : STEER_MOUNT;
  const sides = [1, -1].flatMap((s) => {
    const [b1, g0, g1] = barPoints(s, build);
    return [
      knob(b1, r),
      tube(b1, g0, r),
      knob(g0, r),
      tube(g0, g1, r),
      tube(add(g0, scale(sub(g1, g0), 0.15)), add(g1, scale(sub(g1, g0), 0.05)), 0.016, 12), // grip
      knob(add(g0, [0, -0.012, 0]), 0.015), // lever clamp
      tube(add(g0, [0.01, -0.02, -s * 0.01]), add(add(g0, scale(sub(g1, g0), 0.75)), [0, -0.045, -s * 0.01]), 0.007, 8),
    ];
  });
  return merge(
    tube(scale(stemDir, -0.04), rise, 0.011),
    knob(rise, 0.014),
    tube(rise, centre, 0.012),
    tube(barPoints(-1, build)[0], barPoints(1, build)[0], r), // one bar across the stem clamp
    ...sides,
    knob(add(centre, [-0.02, 0.026, 0.1]), 0.022), // bell
    tube(add(centre, [-0.02, 0, 0.1]), add(centre, [-0.02, 0.012, 0.1]), 0.012, 10),
    ...([1, -1] as const).map((s) => cable(cableHousing(s, build, mount).map((p) => sub(p, mount)))),
  );
}

// ---- Staging ----

/** The ground under both wheels (bike coordinates), single-sided and facing up. */
export const GROUND = {
  x0: REAR_AXLE[0] - WHEEL.tyre - 0.06,
  x1: FRONT_AXLE[0] + WHEEL.tyre + 0.06,
  halfWidth: 0.14,
} as const;

export function ground(): BufferGeometry {
  // Drawn in the xy plane with y = -z, then turned face up: (x, y, 0) -> (x, 0, -y).
  const { x0, x1, halfWidth: w } = GROUND;
  const strip = new Shape([new Vector2(x0, -w), new Vector2(x1, -w), new Vector2(x1, w), new Vector2(x0, w)]);
  const g = new ShapeGeometry(strip).rotateX(-Math.PI / 2);
  g.deleteAttribute('uv');
  return g;
}

/** Axle nuts, a brake-bridge bolt and the mudguard-tail bolt: small fittings round the back wheel. */
export function looseBolts(): BufferGeometry {
  const nut = (p: Vec3, axis: 'z' | 'y') => {
    const g = axle(0.012, 0.012, 6);
    if (axis === 'y') g.rotateX(Math.PI / 2);
    return g.translate(...p);
  };
  const tail = add(REAR_AXLE, polar(MUDGUARD.outer + 0.012, 195 * DEG));
  const bridge = add(REAR_AXLE, scale(STAY_DIR, REAR_BRAKE_REACH + 0.02));
  return merge(
    nut(withZ(REAR_AXLE, REAR_DROPOUT_Z + 0.014), 'z'),
    nut(withZ(REAR_AXLE, -REAR_DROPOUT_Z - 0.014), 'z'),
    nut(withZ(bridge, 0.045), 'z'),
    nut(tail, 'y'),
    knob(add(withZ(REAR_AXLE, 0.06), [0.05, 0.05, 0]), 0.01),
  );
}

// ---- The frame's lay order ----

/** One straight run of a laid tube (bike coordinates, correct build). */
export interface LaySegment {
  /** The root end (the joint already laid) and the far end. */
  a: Vec3;
  b: Vec3;
  /** The solid's radius: a mote belongs to the run whose surface it lies on (or nearest). */
  radius: number;
  /** Where this run lies along its tube's laying, root 0 to far end 1; a knot has `t0 = t1`. */
  along: readonly [t0: number, t1: number];
}

/** A tube of the frame (or a fitting of it laid as one), in the order a frame builder lays it. */
export interface LayTube {
  name: string;
  /** The frame's settle sub-window it is laid in. */
  slot: readonly [from: number, to: number];
  segments: LaySegment[];
}

/**
 * The frame laid in a frame builder's order (docs/specs/2026-10-05-act-1-build-and-orbit.md §3.6):
 * the bottom-bracket shell, then out from it the down tube, the head tube, the seat tube and the top
 * tube to close the main triangle, the stays back to the axle, the brake bridge, and the cables
 * last. Each tube's slot partitions the frame's settle window [0.81, 0.95], widths by tube length;
 * built from the same solids as `frame()`, so it cannot drift from the geometry. The twin needs no
 * order of its own: its points map one to one, so its mast rises with the head tube and its climbing
 * top tube follows the correct one.
 */
export const FRAME_LAY: readonly LayTube[] = (() => {
  const f = frameTubes('correct');
  const run = (t: FrameTube, t0 = 0, t1 = 1): LaySegment => ({ a: t.a, b: t.b, radius: t.radius, along: [t0, t1] });
  const knot = (t: FrameTube, at = 0): LaySegment => run(t, at, at);
  const seatLength = Math.hypot(...sub(f.seatTube.b, f.seatTube.a));
  /** A cable's legs, laid from its stop to its caliper across [t0, t1] of the cables' laying. */
  const cableRuns = (points: Vec3[], t0: number, t1: number): LaySegment[] => {
    const legs = points.slice(1).map((p, i) => Math.hypot(...sub(p, points[i])));
    const total = legs.reduce((s, l) => s + l, 0);
    let done = 0;
    return legs.map((l, i) => {
      const from = t0 + ((t1 - t0) * done) / total;
      done += l;
      return { a: points[i], b: points[i + 1], radius: CABLE, along: [from, t0 + ((t1 - t0) * done) / total] as const };
    });
  };
  return [
    { name: 'bottom-bracket shell', slot: [0.81, 0.818], segments: [knot(f.shell)] },
    { name: 'down tube', slot: [0.818, 0.838], segments: [run(f.downTube)] },
    { name: 'head tube', slot: [0.838, 0.854], segments: [run(f.headTube)] },
    {
      name: 'seat tube',
      slot: [0.854, 0.872],
      // The clamp collar is the top of the seat tube's laying.
      segments: [run(f.seatTube), run(f.collar, 1 - 0.03 / seatLength, 1)],
    },
    { name: 'top tube', slot: [0.872, 0.892], segments: [run(f.topTube)] },
    {
      name: 'chainstays',
      slot: [0.892, 0.91],
      segments: f.sides.flatMap((s) => [run(s.chainstay), knot(s.dropout, 1)]),
    },
    { name: 'seat stays', slot: [0.91, 0.928], segments: f.sides.map((s) => run(s.seatStay)) },
    { name: 'brake bridge', slot: [0.928, 0.934], segments: [knot(f.bridge)] },
    {
      name: 'cables',
      slot: [0.934, 0.95],
      segments: [...cableRuns(f.frontCable, 0, 0.5), ...cableRuns(f.rearCable, 0.5, 1)],
    },
  ];
})();

/** The point of segment a-b nearest `p`: its distance, and how far along (0 at a, 1 at b). */
function nearestOnSegment(p: Vec3, a: Vec3, b: Vec3): { distance: number; u: number } {
  const ab = sub(b, a);
  const len2 = ab[0] * ab[0] + ab[1] * ab[1] + ab[2] * ab[2];
  const ap = sub(p, a);
  const u = len2 === 0 ? 0 : Math.min(1, Math.max(0, (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / len2));
  return { distance: Math.hypot(...sub(p, add(a, scale(ab, u)))), u };
}

/**
 * Which tube of `FRAME_LAY` a frame point belongs to, and how far along that tube's laying it lies
 * (0 at the root, 1 at the far end; a knot's fixed value). The tube is the one whose surface is
 * nearest (distance to the run's axis less its radius), so a point on a tube's skin is never taken
 * by a thinner neighbour whose axis passes close by, such as a cable along the top tube.
 */
export function layPosition(p: Vec3): { tube: number; t: number } {
  let best = Infinity;
  let tube = 0;
  let t = 0;
  FRAME_LAY.forEach((lay, i) => {
    for (const s of lay.segments) {
      const { distance, u } = nearestOnSegment(p, s.a, s.b);
      if (distance - s.radius < best) {
        best = distance - s.radius;
        tube = i;
        t = s.along[0] + (s.along[1] - s.along[0]) * u;
      }
    }
  });
  return { tube, t };
}

/**
 * The frame's settle field: a mote lands in its tube's slot, 80 % by how far along the tube it is
 * and 20 % by its own hash `h`, so each tube is laid from its root to its far end behind a soft
 * front, not a ruler. `p` is the mote's correct position in bike coordinates.
 */
export function frameLaySettle(p: Vec3, h: number): number {
  const { tube, t } = layPosition(p);
  const [from, to] = FRAME_LAY[tube].slot;
  return from + (to - from) * Math.min(1, Math.max(0, 0.8 * t + 0.2 * h));
}
