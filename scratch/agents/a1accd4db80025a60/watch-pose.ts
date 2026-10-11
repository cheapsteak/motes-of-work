const I: Quat = [0, 0, 0, 1];
const q = (axis: Vec3, angle: number): Quat => fromAxisAngle(axis, angle);
/** Lays a part-space arbor (z) along world +x: the music box's arbors run across the bedplate. */
const ON_SIDE: Quat = q([0, 1, 0], Math.PI / 2);
/** `a` then `b`, as rotations: the product b · a. */
const mul = (b: Quat, a: Quat): Quat =>
  compose({ position: [0, 0, 0], quaternion: b }, { position: [0, 0, 0], quaternion: a }).quaternion;

/**
 * One part's pose as parameters, so the two variants blend in parameter space (as the gears, the
 * steam engine and the strandbeest do). The part turns by `angle` about its own arbor (part-space
 * z) and sits at `rest`; fault tilts act before (`inner`) and after (`outer`) that:
 * rotation = outer · rest · Rz(angle) · inner.
 *
 * Slerping the two finished rotations instead takes the shorter arc between two independently
 * spinning quaternions. That arc flips hemisphere whenever their dot product crosses zero, so mid
 * morph the parts snapped through half turns as drive moved. Here `rest` blends between two fixed
 * rotations and the tilts between small ones, so neither ever flips, and the spin blends as a
 * plain angle.
 */
interface Spin {
  position: Vec3;
  outer: Quat;
  rest: Quat;
  angle: number;
  inner: Quat;
}

const fixed = (x: number, y: number, z: number): Spin => ({ position: [x, y, z], outer: I, rest: I, angle: 0, inner: I });
const arbor = ([x, y]: Vec2, z: number, angle: number): Spin => ({
  position: [x, y, z],
  outer: I,
  rest: I,
  angle,
  inner: I,
});
const onSide = (position: Vec3, angle: number): Spin => ({
  position: [...position],
  outer: I,
  rest: ON_SIDE,
  angle,
  inner: I,
});

function realise(s: Spin): PartTransform {
  return {
    position: [...s.position],
    quaternion: mul(mul(s.outer, s.rest), mul(q([0, 0, 1], s.angle), s.inner)),
  };
}

function blend(a: Spin, b: Spin, v: number): Spin {
  const lerp = (x: number, y: number): number => x + (y - x) * v;
  return {
    position: [lerp(a.position[0], b.position[0]), lerp(a.position[1], b.position[1]), lerp(a.position[2], b.position[2])],
    outer: slerp(a.outer, b.outer, v),
    rest: slerp(a.rest, b.rest, v),
    angle: lerp(a.angle, b.angle),
    inner: slerp(a.inner, b.inner, v),
  };
}

const fract = (x: number): number => x - Math.floor(x);

/** The watch: escapement from the kinematics, the going train geared off the escape pinion. */
function watchPose(drive: number, f: Faults): Spin[] {
  const esc = escapement(drive, f);
  const escapeAngle = ALPHA + esc.escape;
  const fourth = mesh(escapeAngle, ESCAPE_PINION, PHI.escapeFourth, FOURTH.teeth);
  const third = mesh(fourth, FOURTH.pinionTeeth, PHI.fourthThird, THIRD.teeth);
  const centre = mesh(third, THIRD.pinionTeeth, PHI.thirdCentre, CENTRE.teeth);
  const barrel = mesh(centre, CENTRE.pinionTeeth, PHI.centreBarrel, BARREL.teeth);

  // Misalign: the fork backs off the wheel, lifts and rolls about its lever, so its stones miss
  // the teeth; the escape wheel, unlocked, creeps (kinematics) and wobbles on a bent arbor.
  const wobble = Math.sin((Math.PI * esc.beats) / 2);
  const back = 0.15 * f.misalign;
  const fork: Spin = {
    ...arbor(PALLET_CENTRE, Z.layerB + 0.08 * f.misalign, ALPHA + esc.pallet),
    position: [
      PALLET_CENTRE[0] + back * Math.cos(ALPHA),
      PALLET_CENTRE[1] + back * Math.sin(ALPHA),
      Z.layerB + 0.08 * f.misalign,
    ],
    inner: q([1, 0, 0], 0.6 * f.misalign * wobble),
  };
  const escapeWheel: Spin = {
    ...arbor(ESCAPE_CENTRE, Z.layerB, escapeAngle),
    outer: q([Math.cos(ALPHA), Math.sin(ALPHA), 0], 0.25 * f.misalign * wobble),
  };

  return [
    fixed(0, 0, 0),
    arbor(BARREL_CENTRE, Z.barrel, barrel),
    arbor(CENTRE_CENTRE, Z.layerA, centre),
    arbor(THIRD_CENTRE, Z.layerB, third),
    arbor(FOURTH_CENTRE, Z.layerA, fourth),
    fixed(0, 0, 0),
    escapeWheel,
    fork,
    arbor(BALANCE_CENTRE, Z.balance, ALPHA + esc.balance),
    arbor(BALANCE_CENTRE, Z.hairspring, ALPHA + esc.balance),
    fixed(0, 0, 0),
  ];
}

/**
 * The music box: the cylinder turns steadily and the governor train and fly run up from it. The
 * twin's speeds are chosen to read (a slow cylinder, a fly spinning several turns per unit of
 * drive), not taken from tooth counts, which would spin the fly too fast to see.
 */
function musicBoxPose(drive: number, f: Faults): Spin[] {
  const u = escapement(drive, f).beats; // the same clock, so ratio and stall act on the twin too
  // Slip: the governor lags the cylinder in jerks (a sawtooth of lost turn).
  const lag = 1.2 * f.slip * fract(u / 3);
  const cylinder = -TAU * (u / 32);
  const train = [TAU * (u / 16), -TAU * (u / 9), TAU * (u / 6), -TAU * (u / 4) + lag];
  const fly = (TAU * (u / 1.5) - 4 * lag) * (1 - 0.6 * f.bind);
  const wobble = q([1, 0, 0], 0.25 * f.misalign * Math.sin((Math.PI * u) / 2));
  // The fly and the worm on its arbor turn together, wobbling on a bent arbor under misalign.
  const flyTurn = (z: number): Spin => ({ ...fixed(FLY_FOOT[0], FLY_FOOT[1], z), angle: fly, outer: wobble });
  return [
    fixed(0, 0, 0),
    onSide(CYLINDER.centre, cylinder),
    onSide(TWIN_TRAIN[0].centre, train[0]),
    onSide(TWIN_TRAIN[1].centre, train[1]),
    onSide(TWIN_TRAIN[2].centre, train[2]),
    fixed(0, 0, 0),
    onSide(TWIN_TRAIN[3].centre, train[3]),
    fixed(FLY_FOOT[0], FLY_FOOT[1], FLY_FOOT[2]),
    flyTurn(FLY_FOOT[2]),
    flyTurn(WORM_Z),
    fixed(0, 0, 0),
  ];
}

function pose(drive: number, f: Faults, variant: number): PartTransform[] {
  const v = Math.min(1, Math.max(0, variant));
  let spins: Spin[];
  if (v === 0) spins = watchPose(drive, f);
  else if (v === 1) spins = musicBoxPose(drive, f);
  else {
    const twin = musicBoxPose(drive, f);
    spins = watchPose(drive, f).map((s, i) => blend(s, twin[i], v));
  }
  const out = spins.map(realise);

  if (f.jitter > 0) {
    const tick = Math.floor(drive * 40);
    out.forEach((t, i) => {
      for (let axis = 0; axis < 3; axis++) t.position[axis] += f.jitter * 0.025 * (hash01(tick, i * 3 + axis) * 2 - 1);
    });
  }
  return out;
}

