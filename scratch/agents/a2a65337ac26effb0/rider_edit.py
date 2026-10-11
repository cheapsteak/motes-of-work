p = '/home/user/motes-of-work/src/mechanisms/bike/rider.ts'
s = open(p).read()


def rep(a, b):
    global s
    assert s.count(a) == 1, a[:70]
    s = s.replace(a, b)


rep(
    """// The reveal's mannequin: a schematic, faceless artist's mannequin, capsules round one tapered
// torso, seated on the wrong twin's saddle in an ordinary upright town-bike riding pose. It is the
// correct bike's rider moved with the saddle: its hands close on air where the correct bike's grips
// sit relative to the saddle, and its feet hang where the correct bike's pedals would be, so nothing
// it reaches for is there.
//""",
    """// The reveal's mannequin: a schematic, faceless artist's mannequin, capsules round one tapered
// torso, seated on the wrong twin's saddle, high on its mast over the front wheel. Its upper body is
// the correct bike's rider moved with the saddle: upright, its hands closed on air where the correct
// bike's grips sit relative to the saddle, so nothing it reaches for is there. Its legs are a seated
// person's with nothing to stand on: thighs level and forward, shanks hanging either side of the
// front wheel, feet in the air well ahead of the pedals.
//""",
)

rep(
    "import { pedalCentre, PEDAL, SADDLE_TOP, SEAT_CLAMP, STEER_MOUNT } from './kinematics';",
    "import { SADDLE_TOP, SEAT_CLAMP, STEER_MOUNT } from './kinematics';",
)

rep(
    """/** Torso pitch from horizontal: an upright town-bike rider, leaning a little forward. */
const TORSO_PITCH = 78;""",
    """/** Torso pitch from horizontal: an upright town-bike rider, leaning a little forward (12 degrees off vertical). */
const TORSO_PITCH = 78;""",
)

rep(
    """/** Elbows bend down and a little out, the upper arms close to the torso; knees bend forward and a little out. */
const ELBOW_POLE: Vec3 = [-0.3, -1, 0.2];
const KNEE_POLE: Vec3 = [1, 0.1, 0.12];
/**
 * Where on its pedal circle each foot is placed, in degrees above forward seen from the drive side
 * (drive side first). It does not pedal: both feet hang a little below level and forward, as a
 * coasting rider's do, which keeps them clear of the twin's pedals however far the saddle steers.
 */
const FEET_AT: [number, number] = [-20, -30];
/** The ball of the foot, over the pedal spindle, is this far from the heel; the toes dip a little. */
const BALL_AT = 0.7;
const FOOT_PITCH = -12;
/** The ankle stands over the sole this far from the heel. */
const ANKLE_AT = 0.25;""",
    """/** Elbows bend down and a little out, the upper arms close to the torso. */
const ELBOW_POLE: Vec3 = [-0.3, -1, 0.2];
/**
 * The legs, seated with nothing to stand on: thighs forward and a touch below level, splayed a little
 * so the knees pass either side of the front wheel (drive side first); shanks hanging, a little back
 * of plumb; feet relaxed, toes dropped. It never pedals: one fixed pose.
 */
const THIGH_PITCH = -6;
const THIGH_SPLAY = 4;
const SHANK_PITCH = -98;
const FOOT_PITCH = -40;
/** The ankle stands over the sole this far from the heel. */
const ANKLE_AT = 0.25;

/** A unit direction `deg` above forward in the side plane, turned `splay` degrees out toward side `s`. */
const splayed = (deg: number, splay: number, s: number): Vec3 => {
  const [x, y] = pitched(deg);
  return [x * Math.cos(splay * DEG), y, s * x * Math.sin(splay * DEG)];
};""",
)

rep(
    """  const footDir = pitched(FOOT_PITCH);
  const footUp = pitched(FOOT_PITCH + 90);
  const heels = pair((s, i) => {
    // pedalCentre(theta, side) puts the drive-side pedal at -theta above forward, the other at pi - theta.
    const a = FEET_AT[i] * DEG;
    const pedal = sub(pedalCentre(s === 1 ? -a : Math.PI - a, s), SEAT_CLAMP);
    const ball = add(pedal, [0, PEDAL.thickness / 2, 0]);
    return sub(ball, scale(footDir, BALL_AT * len('foot')));
  });
  const soles = pair((_, i) => add(heels[i], scale(footDir, ANKLE_AT * len('foot'))));
  const ankles = pair((_, i) => add(soles[i], scale(footUp, len('ankleHeight'))));
  const hips = pair((s) => add(hip, side(s, len('hipWidth') / 2)));
  const knees = pair((s, i) =>
    joint(hips[i], ankles[i], len('thigh'), len('shank'), [KNEE_POLE[0], KNEE_POLE[1], s * KNEE_POLE[2]]),
  );""",
    """  const hips = pair((s) => add(hip, side(s, len('hipWidth') / 2)));
  const knees = pair((s, i) => add(hips[i], scale(splayed(THIGH_PITCH, THIGH_SPLAY, s), len('thigh'))));
  const ankles = pair((s, i) => add(knees[i], scale(splayed(SHANK_PITCH, 0, s), len('shank'))));
  const footDir = pitched(FOOT_PITCH);
  const footUp = pitched(FOOT_PITCH + 90);
  const soles = pair((_, i) => sub(ankles[i], scale(footUp, len('ankleHeight'))));
  const heels = pair((_, i) => sub(soles[i], scale(footDir, ANKLE_AT * len('foot'))));""",
)

open(p, 'w').write(s)
print('ok')
