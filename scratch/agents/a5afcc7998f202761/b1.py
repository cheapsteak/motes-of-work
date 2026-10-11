p = 'src/mechanisms/bike/shapes.ts'
s = open(p).read()


def rep(a, b, count=1):
    global s
    assert s.count(a) == count, (s.count(a), a)
    s = s.replace(a, b)


rep("""/** Where the spoke reflector sits on each wheel: radius, angle (between the first two spokes) and z. */
export const REFLECTOR = { r: 0.2, angle: Math.PI / 12, z: 0.018 } as const;""",
    """/** Where the spoke reflector sits on each wheel: radius, angle (between the first two spokes) and z. */
export const REFLECTOR = { r: 0.2, angle: Math.PI / 12, z: 0.018 } as const;
/** The spoke reflector's plate: long along its radius, and across it. */
export const REFLECTOR_PLATE = { length: 0.08, width: 0.035 } as const;
/** The rim's inner edge, below its outer radius `WHEEL.rim`. */
export const RIM_INNER = WHEEL.rim - 0.016;
/** The hub flanges: radius, and z either side of the wheel's mid-plane. */
export const FLANGE = { r: 0.036, z: 0.03 } as const;""")
rep("""  const { tyre, section, rim, hub, spokes } = WHEEL;
  const rimInner = rim - 0.016;
  const tyreGeom = new TorusGeometry(tyre - section / 2, section / 2, 12, 96);
  tyreGeom.deleteAttribute('uv');
  const flangeZ = 0.03;""", """  const { tyre, section, rim, hub, spokes } = WHEEL;
  const rimInner = RIM_INNER;
  const tyreGeom = new TorusGeometry(tyre - section / 2, section / 2, 12, 96);
  tyreGeom.deleteAttribute('uv');
  const flangeZ = FLANGE.z;""")
rep("""    axle(0.036, 0.004, 16).translate(0, 0, flangeZ),
    axle(0.036, 0.004, 16).translate(0, 0, -flangeZ),""", """    axle(FLANGE.r, 0.004, 16).translate(0, 0, flangeZ),
    axle(FLANGE.r, 0.004, 16).translate(0, 0, -flangeZ),""")
rep("""    plate(0.08, 0.035, 0.008, 0.012)""", """    plate(REFLECTOR_PLATE.length, REFLECTOR_PLATE.width, 0.008, 0.012)""")

rep("""/** Chainring on a five-arm spider, the crank axle and both crank arms (right along +x); about the bottom bracket. */
export function cranks(): BufferGeometry {
  const ringInner = 0.066;
  const arms = Array.from({ length: 5 }, (_, k) =>
    bar(ringInner + 0.004, 0.008, 0.006)
      .rotateZ((k * 2 * Math.PI) / 5 + Math.PI / 5)""", """/** The chainring's inner edge, its five spider arms (angle of the first, and half-width), the crank arm's half-width and the axle's radius. */
export const CRANKSET = { ringInner: 0.066, spiderAngle: Math.PI / 5, spiderHalf: 0.008, armHalf: 0.013, axle: 0.011 } as const;

/** Chainring on a five-arm spider, the crank axle and both crank arms (right along +x); about the bottom bracket. */
export function cranks(): BufferGeometry {
  const { ringInner, spiderAngle, spiderHalf, armHalf } = CRANKSET;
  const arms = Array.from({ length: 5 }, (_, k) =>
    bar(ringInner + 0.004, spiderHalf, 0.006)
      .rotateZ((k * 2 * Math.PI) / 5 + spiderAngle)""")
rep("""    axle(0.011, 2 * CRANK_Z + 0.02, 16),
    bar(CRANK, 0.013, 0.014).translate(0, 0, CRANK_Z),
    bar(CRANK, 0.013, 0.014).rotateZ(Math.PI).translate(0, 0, -CRANK_Z),""", """    axle(CRANKSET.axle, 2 * CRANK_Z + 0.02, 16),
    bar(CRANK, armHalf, 0.014).translate(0, 0, CRANK_Z),
    bar(CRANK, armHalf, 0.014).rotateZ(Math.PI).translate(0, 0, -CRANK_Z),""")

rep("""const TUBE = 0.016;
const STAY = 0.008;
/** The seat stays and top tube meet the seat tube this far up it. */
const STAY_TOP = 0.5;
const SEAT_LUG: Vec3 = add(BB, scale(SEAT_DIR, STAY_TOP));
const REAR_DROPOUT_Z = 0.065;
/** The rear brake's bridge sits this far out from the rear axle, along the seat stays. */
const REAR_BRAKE_REACH = 0.385;
const STAY_DIR: Vec3 = scale(sub(SEAT_LUG, REAR_AXLE), 1 / Math.hypot(...sub(SEAT_LUG, REAR_AXLE)));""",
    """const TUBE = 0.016;
const STAY = 0.008;
/** The seat stays and top tube meet the seat tube this far up it. */
const STAY_TOP = 0.5;
export const SEAT_LUG: Vec3 = add(BB, scale(SEAT_DIR, STAY_TOP));
export const REAR_DROPOUT_Z = 0.065;
/** The rear brake's bridge sits this far out from the rear axle, along the seat stays. */
export const REAR_BRAKE_REACH = 0.385;
export const STAY_DIR: Vec3 = scale(sub(SEAT_LUG, REAR_AXLE), 1 / Math.hypot(...sub(SEAT_LUG, REAR_AXLE)));""")

rep("""/** One of the frame's tube solids: a round bar of `radius` from `a` to `b`, `segments` round. */
interface FrameTube {""", """/** One of the frame's tube solids: a round bar of `radius` from `a` to `b`, `segments` round. */
export interface FrameTube {""")
rep("""function frameTubes(build: Build) {""", """export function frameTubes(build: Build) {""")

rep("""const CROWN: Vec3 = add(HEAD_BOTTOM, scale(STEER_AXIS, -0.02));
const FORK_Z = 0.05;""", """export const CROWN: Vec3 = add(HEAD_BOTTOM, scale(STEER_AXIS, -0.02));
export const FORK_Z = 0.05;""")

rep("""function caliper(axleAt: Vec3, dir: Vec3, reach: number, origin: Vec3): BufferGeometry {
  const at = (p: Vec3): Vec3 => sub(p, origin);
  const top = add(axleAt, scale(dir, reach));
  const pad = add(axleAt, scale(dir, WHEEL.rim - 0.008));
  const tangent: Vec3 = [-dir[1], dir[0], 0];
  return merge(""", """/** A caliper's top (its pivot, `reach` out along `dir` from the axle), its pads on the rim, and the rim's tangent there. */
export function caliperPoints(axleAt: Vec3, dir: Vec3, reach: number): { top: Vec3; pad: Vec3; tangent: Vec3 } {
  return { top: add(axleAt, scale(dir, reach)), pad: add(axleAt, scale(dir, WHEEL.rim - 0.008)), tangent: [-dir[1], dir[0], 0] };
}

function caliper(axleAt: Vec3, dir: Vec3, reach: number, origin: Vec3): BufferGeometry {
  const at = (p: Vec3): Vec3 => sub(p, origin);
  const { top, pad, tangent } = caliperPoints(axleAt, dir, reach);
  return merge(""")

rep("""const FRONT_BRAKE_DIR: Vec3 = (() => {
  const d = sub(CROWN, FRONT_AXLE);
  return scale(d, 1 / Math.hypot(...d));
})();
const FRONT_BRAKE_REACH = Math.hypot(...sub(CROWN, FRONT_AXLE)) - 0.03;""", """export const FRONT_BRAKE_DIR: Vec3 = (() => {
  const d = sub(CROWN, FRONT_AXLE);
  return scale(d, 1 / Math.hypot(...d));
})();
export const FRONT_BRAKE_REACH = Math.hypot(...sub(CROWN, FRONT_AXLE)) - 0.03;""")

rep("""/** Mudguard radii and depth: a strip just clear of the tyre. */
export const MUDGUARD = { inner: 0.352, outer: 0.36, width: 0.05 } as const;""", """/** Mudguard radii and depth: a strip just clear of the tyre. */
export const MUDGUARD = { inner: 0.352, outer: 0.36, width: 0.05 } as const;
/** The angles (radians, CCW from +x about the axle) each mudguard runs between. */
export const GUARD_ARCS = { front: [25 * DEG, 195 * DEG], rear: [35 * DEG, 200 * DEG] } as const;""")
rep("""  return guard(25 * DEG, 195 * DEG).translate(x, y, 0);""", """  return guard(...GUARD_ARCS.front).translate(x, y, 0);""")
rep("""  return merge(weighted(merge(guard(35 * DEG, 200 * DEG), reflector), 1), rack());""", """  return merge(weighted(merge(guard(...GUARD_ARCS.rear), reflector), 1), rack());""")

rep("""function rack(): BufferGeometry {
  const { x0, x1, height: y, halfWidth: w } = RACK;
  const stay = (t: number, s: number): Vec3 => withZ(scale(STAY_DIR, t), s * (REAR_DROPOUT_Z - 0.045 * (t / 0.494)));""",
    """/** A point `t` out along the seat stay on side `s`, about the rear axle: where the rack's struts meet it. */
export const rackStay = (t: number, s: number): Vec3 => withZ(scale(STAY_DIR, t), s * (REAR_DROPOUT_Z - 0.045 * (t / 0.494)));

function rack(): BufferGeometry {
  const { x0, x1, height: y, halfWidth: w } = RACK;
  const stay = rackStay;""")

rep("""/** Cable housing radius: thin, but thick enough to carry a line of motes. */
const CABLE = 0.005;""", """/** Cable housing radius: thin, but thick enough to carry a line of motes. */
export const CABLE = 0.005;""")

rep("""/** The twin's steering column, where it shows above the mast sleeve. */
const MAST_COLUMN = 0.016;""", """/** The twin's steering column, where it shows above the mast sleeve. */
export const MAST_COLUMN = 0.016;""")

rep("""const stemTop = (build: Build): Vec3 =>
  build === 'twin' ? scale(SEAT_DIR, STEM_RISE_TWIN) : scale(STEER_AXIS, STEM_RISE);
const barCentre = (build: Build): Vec3 => add(stemTop(build), [STEM_REACH, 0, 0]);
/** Swept-back bars: out to each side, back to the grips (side +1 the drive side). */
const barPoints = (s: number, build: Build = 'correct'): [Vec3, Vec3, Vec3] => [""", """export const stemTop = (build: Build): Vec3 =>
  build === 'twin' ? scale(SEAT_DIR, STEM_RISE_TWIN) : scale(STEER_AXIS, STEM_RISE);
export const barCentre = (build: Build): Vec3 => add(stemTop(build), [STEM_REACH, 0, 0]);
/** Swept-back bars: out to each side, back to the grips (side +1 the drive side). */
export const barPoints = (s: number, build: Build = 'correct'): [Vec3, Vec3, Vec3] => [""")

rep("""export function handlebars(build: Build = 'correct'): BufferGeometry {
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
    tube(add(centre, [-0.02, 0, 0.1]), add(centre, [-0.02, 0.012, 0.1]), 0.012, 10),""",
    """/** The stem's direction on each bike: up the steering axis, or (on the twin) up the seat-tube stub. */
export const stemDir = (build: Build): Vec3 => (build === 'twin' ? SEAT_DIR : STEER_AXIS);
/** A grip's ends on side `s` (about the stem clamp). */
export function gripEnds(s: number, build: Build): [Vec3, Vec3] {
  const [, g0, g1] = barPoints(s, build);
  return [add(g0, scale(sub(g1, g0), 0.15)), add(g1, scale(sub(g1, g0), 0.05))];
}
/** A brake lever's ends on side `s` (about the stem clamp). */
export function leverEnds(s: number, build: Build): [Vec3, Vec3] {
  const [, g0, g1] = barPoints(s, build);
  return [add(g0, [0.01, -0.02, -s * 0.01]), add(add(g0, scale(sub(g1, g0), 0.75)), [0, -0.045, -s * 0.01])];
}
/** The bell's dome: centre and radius (about the stem clamp). */
export const bell = (build: Build): { centre: Vec3; radius: number } => ({ centre: add(barCentre(build), [-0.02, 0.026, 0.1]), radius: 0.022 });

export function handlebars(build: Build = 'correct'): BufferGeometry {
  const r = 0.011;
  const twin = build === 'twin';
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
      tube(...gripEnds(s, build), 0.016, 12), // grip
      knob(add(g0, [0, -0.012, 0]), 0.015), // lever clamp
      tube(...leverEnds(s, build), 0.007, 8),
    ];
  });
  return merge(
    tube(scale(stemDir(build), -0.04), rise, 0.011),
    knob(rise, 0.014),
    tube(rise, centre, 0.012),
    tube(barPoints(-1, build)[0], barPoints(1, build)[0], r), // one bar across the stem clamp
    ...sides,
    knob(bell(build).centre, bell(build).radius), // bell
    tube(add(centre, [-0.02, 0, 0.1]), add(centre, [-0.02, 0.012, 0.1]), 0.012, 10),""")
open(p, 'w').write(s)
print('ok')
