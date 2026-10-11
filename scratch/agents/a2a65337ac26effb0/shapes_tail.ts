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

/**
 * The main triangle, head tube, stays, bottom-bracket shell, brake bridge and the brake cables'
 * runs (bike coordinates). On the twin the seat tube stops at the stub that holds the handlebars,
 * the head tube runs on up as the mast's sleeve, and the top tube climbs from the stub to the mast.
 */
export function frame(build: Build = 'correct'): BufferGeometry {
  const twin = build === 'twin';
  const seatTop = twin ? STUB_TOP : SEAT_CLAMP;
  const headTop = twin ? along(HEAD_TOP, STEER_AXIS, MAST_SLEEVE) : HEAD_TOP;
  const [topTubeRear, topTubeFront] = topTubeEnds(build);
  const downTubeTop = add(HEAD_BOTTOM, scale(STEER_AXIS, 0.03));
  const stays = [-1, 1].flatMap((s) => [
    tube(withZ(BB, s * 0.03), withZ(REAR_AXLE, s * REAR_DROPOUT_Z), STAY),
    tube(withZ(SEAT_LUG, s * 0.02), withZ(REAR_AXLE, s * REAR_DROPOUT_Z), STAY),
    tube(withZ(REAR_AXLE, s * (REAR_DROPOUT_Z - 0.006)), withZ(REAR_AXLE, s * (REAR_DROPOUT_Z + 0.006)), 0.016),
  ]);
  const bridge = add(REAR_AXLE, scale(STAY_DIR, REAR_BRAKE_REACH + 0.02));
  return merge(
    tube(BB, seatTop, TUBE, 16),
    tube(add(seatTop, scale(SEAT_DIR, -0.03)), seatTop, TUBE + 0.004, 16), // seat clamp collar; on the twin, the stem's
    tube(HEAD_BOTTOM, headTop, 0.019, 16),
    tube(topTubeRear, topTubeFront, 0.015, 16),
    tube(BB, downTubeTop, 0.018, 16),
    tube(withZ(BB, -0.035), withZ(BB, 0.035), 0.021, 16),
    tube(withZ(bridge, -0.03), withZ(bridge, 0.03), 0.006),
    ...stays,
    cable(frontCableRun(build)),
    cable(rearCableRun(build)),
  );
}

/** Where the fork crown sits, just under the head tube. */
const CROWN: Vec3 = add(HEAD_BOTTOM, scale(STEER_AXIS, -0.02));
const FORK_Z = 0.05;

/** The headlamp on the front of the fork crown, looking forward: the same on both bikes, so the front always reads. */
export const HEADLAMP = { centre: add(along(CROWN, HEAD_FORWARD, 0.06), [0.012, 0.012, 0]), radius: 0.03, depth: 0.045 } as const;

/** Steerer, headset cups, crown, the two blades down to the front axle and the headlamp; about the head-tube top. */
export function fork(): BufferGeometry {
  const at = (p: Vec3): Vec3 => sub(p, HEAD_TOP);
  const cup = (p: Vec3) => tube(at(add(p, scale(STEER_AXIS, -0.007))), at(add(p, scale(STEER_AXIS, 0.007))), 0.023, 16);
  const { centre, radius, depth } = HEADLAMP;
  return merge(
    tube(at(add(HEAD_BOTTOM, scale(STEER_AXIS, -0.03))), at(STEER_MOUNT), 0.012, 12),
    cup(HEAD_TOP),
    cup(HEAD_BOTTOM),
    tube(at(withZ(CROWN, -FORK_Z - 0.01)), at(withZ(CROWN, FORK_Z + 0.01)), 0.015, 12),
    ...[-1, 1].map((s) => tube(at(withZ(CROWN, s * FORK_Z)), at(withZ(FRONT_AXLE, s * FORK_Z)), 0.011, 12)),
    tube(at(CROWN), at(sub(centre, [depth / 2, 0, 0])), 0.007, 8), // the lamp bracket
    tube(at(sub(centre, [depth / 2, 0, 0])), at(add(centre, [depth / 2, 0, 0])), radius, 16),
  );
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
export const TAIL_REFLECTOR = { angle: 186 * DEG, width: 0.07, height: 0.045, depth: 0.012 } as const;

/** Over the top-rear of the back wheel, from behind the seat tube, with its reflector; about the rear axle. */
export function mudguardRear(): BufferGeometry {
  const { angle, width, height, depth } = TAIL_REFLECTOR;
  const reflector = plate(width, height, depth, 0.008)
    .rotateY(Math.PI / 2) // its face square to x, looking back
    .translate(...polar(MUDGUARD.outer + depth / 2 + 0.004, angle));
  return merge(guard(35 * DEG, 200 * DEG), reflector);
}

// ---- Brake cables ----

/** Cable housing radius: thin, but thick enough to carry a line of motes. */
const CABLE = 0.004;

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
    return [stop, add(scale(stop, 0.5), scale(headBottom, 0.5)), headBottom, FRONT_CABLE_END];
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

/** The saddle's thickness, and how far its nose dips: thin and tilted, so it reads as a saddle, not a brick. */
export const SADDLE = { thick: 0.028, noseDown: 4 * DEG } as const;

/**
 * A town saddle about the seat clamp. On the correct bike it sits on a seat post with a clamp; on
 * the twin (about its mount on the steering axis, STEER_MOUNT) on a cradle welded across the top of
 * the steering column, which rises through the frame's mast sleeve and turns with the fork.
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
    // The column comes up the steering axis from the head-tube top (STEER_MOUNT is on the axis).
    const columnFoot = scale(STEER_AXIS, -(STEER_MOUNT[1] - HEAD_TOP[1]) / STEER_AXIS[1]);
    const length = Math.hypot(...sub(postTop, columnFoot));
    const rail: Vec3 = [Math.cos(noseDown), -Math.sin(noseDown), 0];
    return merge(
      tube(add(postTop, scale(STEER_AXIS, -length)), postTop, MAST_COLUMN, 12),
      tube(along(postTop, rail, -0.075), along(postTop, rail, 0.06), 0.012, 10), // the welded cradle
      body,
    );
  }
  return merge(
    tube(scale(SEAT_DIR, -0.03), postTop, 0.0135, 12),
    tube(add(postTop, [0, 0, -0.03]), add(postTop, [0, 0, 0.03]), 0.012, 10),
    body,
  );
}

/** The twin's steering column, where it shows above the mast sleeve. */
const MAST_COLUMN = 0.016;

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
