p = 'src/mechanisms/bike/shapes.ts'
s = open(p).read()


def rep(a, b):
    global s
    assert s.count(a) == 1, a[:70]
    s = s.replace(a, b)


rep(
    """/**
 * The headlamp on a bracket off the front of the fork crown, looking forward, held up clear of the
 * mudguard: the same on both bikes, so the front always reads.
 */
export const HEADLAMP = {
  centre: along(along(CROWN, HEAD_FORWARD, 0.085), STEER_AXIS, 0.05),
  radius: 0.032,
  depth: 0.05,
} as const;

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
}""",
    """/**
 * The town bike's front basket (bike coordinates): an open-topped box over the front wheel, ahead of
 * the head tube and under the bars, carried on the fork, so it turns with the front wheel. The same
 * on both bikes, and the strongest "this is the front" there is: on the twin the saddle perches
 * just behind and above it.
 */
export const BASKET = { x0: 0.9, x1: 1.2, y0: 0.76, y1: 0.97, halfWidth: 0.13, wall: 0.008 } as const;

/** The headlamp on the front of the basket, looking forward: the same on both bikes. */
export const HEADLAMP = {
  centre: [BASKET.x1 + 0.04, 0.85, 0] as Vec3,
  radius: 0.045,
  depth: 0.07,
} as const;

/** The basket's walls, floor and rim, the stays that carry it, and its headlamp (bike coordinates). */
function basket(): BufferGeometry {
  const { x0, x1, y0, y1, halfWidth: w, wall } = BASKET;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const long = x1 - x0;
  const high = y1 - y0;
  const rim = (a: Vec3, b: Vec3) => tube(a, b, 0.007, 8);
  const corner = (x: number, z: number): Vec3 => [x, y1, z];
  const { centre, radius, depth } = HEADLAMP;
  return merge(
    plate(long, 2 * w, wall, 0.01).rotateX(Math.PI / 2).translate(cx, y0, 0), // floor
    ...[x0, x1].map((x) => plate(2 * w, high, wall, 0.01).rotateY(Math.PI / 2).translate(x, cy, 0)), // back, front
    ...[-w, w].map((z) => plate(long, high, wall, 0.01).translate(cx, cy, z)), // sides
    rim(corner(x0, -w), corner(x1, -w)),
    rim(corner(x0, w), corner(x1, w)),
    rim(corner(x0, -w), corner(x0, w)),
    rim(corner(x1, -w), corner(x1, w)),
    // Carried on the fork: back corners to the crown, front corners down to the axle.
    ...[-1, 1].flatMap((s) => [
      tube([x0, y0, s * (w - 0.03)], withZ(CROWN, s * FORK_Z), 0.007, 8),
      tube([x1 - 0.02, y0, s * (w - 0.03)], withZ(FRONT_AXLE, s * (FORK_Z + 0.02)), 0.006, 8),
    ]),
    tube(sub(centre, [depth / 2, 0, 0]), add(centre, [depth / 2, 0, 0]), radius, 16),
    knob(add(centre, [depth / 2, 0, 0]), radius * 0.8), // the lens
  );
}

/** Steerer, headset cups, crown, the two blades down to the front axle, and the basket with its headlamp; about the head-tube top. */
export function fork(): BufferGeometry {
  const at = (p: Vec3): Vec3 => sub(p, HEAD_TOP);
  const cup = (p: Vec3) => tube(at(add(p, scale(STEER_AXIS, -0.007))), at(add(p, scale(STEER_AXIS, 0.007))), 0.023, 16);
  return merge(
    tube(at(add(HEAD_BOTTOM, scale(STEER_AXIS, -0.03))), at(STEER_MOUNT), 0.012, 12),
    cup(HEAD_TOP),
    cup(HEAD_BOTTOM),
    tube(at(withZ(CROWN, -FORK_Z - 0.01)), at(withZ(CROWN, FORK_Z + 0.01)), 0.015, 12),
    ...[-1, 1].map((s) => tube(at(withZ(CROWN, s * FORK_Z)), at(withZ(FRONT_AXLE, s * FORK_Z)), 0.011, 12)),
    basket().translate(...scale(HEAD_TOP, -1)),
  );
}""",
)

rep(
    """/** Over the top-rear of the back wheel, from behind the seat tube, with its reflector; about the rear axle. */
export function mudguardRear(): BufferGeometry {
  const { angle, width, height, depth } = TAIL_REFLECTOR;
  const reflector = plate(width, height, depth, 0.008)
    .rotateY(Math.PI / 2) // its face square to x, looking back
    .translate(...polar(MUDGUARD.outer + depth / 2 + 0.004, angle));
  return merge(guard(35 * DEG, 200 * DEG), reflector);
}""",
    """/**
 * The rear rack over the back wheel (about the rear axle): a flat deck clear of the mudguard, legs
 * down to the dropouts and struts forward to the seat stays. The same on both bikes.
 */
export const RACK = { x0: -0.27, x1: 0.17, height: 0.4, halfWidth: 0.07 } as const;

function rack(): BufferGeometry {
  const { x0, x1, height: y, halfWidth: w } = RACK;
  const stay = (t: number, s: number): Vec3 => withZ(scale(STAY_DIR, t), s * (REAR_DROPOUT_Z - 0.045 * (t / 0.494)));
  return merge(
    plate(x1 - x0, 2 * w, 0.008, 0.01).rotateX(Math.PI / 2).translate((x0 + x1) / 2, y, 0), // deck
    ...[-1, 1].flatMap((s) => [
      tube([x0, y, s * w], [x1, y, s * w], 0.007, 8), // side rail
      tube([x0 + 0.04, y, s * w], [0, 0, s * (REAR_DROPOUT_Z + 0.012)], 0.006, 8), // leg to the dropout
      tube([x1 - 0.01, y, s * w], stay(0.3, s), 0.006, 8), // strut to the seat stay
    ]),
  );
}

/** Over the top-rear of the back wheel, from behind the seat tube, with its reflector and the rack; about the rear axle. */
export function mudguardRear(): BufferGeometry {
  const { angle, width, height, depth } = TAIL_REFLECTOR;
  const reflector = plate(width, height, depth, 0.008)
    .rotateY(Math.PI / 2) // its face square to x, looking back
    .translate(...polar(MUDGUARD.outer + depth / 2 + 0.004, angle));
  return merge(guard(35 * DEG, 200 * DEG), reflector, rack());
}""",
)

open(p, 'w').write(s)
print('ok')
