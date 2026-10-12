import os

os.chdir('.')


def rep(s, a, b):
    assert a in s, a
    return s.replace(a, b, 1)


p = 'src/mechanisms/bike/kinematics.ts'
s = open(p).read()
s = rep(s, """/**
 * Steering angle (rad, about STEER_AXIS): a swing either side as the bike rides. The amplitude is
 * blended by `variant` as a parameter, so the morph between the two bikes stays continuous.
 */
export function steer(drive: number, variant = 0): number {
  return STEER * (1 + (STEER_TWIN / STEER - 1) * variant) * Math.sin((Math.PI * drive) / 2);
}""", """/**
 * Steering angle (rad, about STEER_AXIS): a swing either side as the bike rides. The amplitude is
 * blended by `variant` as a parameter, so the morph between the two bikes stays continuous.
 * `extra` (the scene's `mech.steer`) is added to the drive's own swing as a fraction of full lock
 * and the sum is clamped at full lock, so an authored swing can reach either lock whatever the
 * drive is doing; at 0 the angle is exactly the drive's.
 */
export function steer(drive: number, variant = 0, extra = 0): number {
  const swing = Math.sin((Math.PI * drive) / 2);
  const fraction = extra === 0 ? swing : Math.min(1, Math.max(-1, swing + extra));
  return STEER * (1 + (STEER_TWIN / STEER - 1) * variant) * fraction;
}""")
open(p, 'w').write(s)

p = 'src/mechanisms/bike/index.ts'
s = open(p).read()
s = rep(s, """function pose(drive: number, f: Faults, variant: number): PartTransform[] {
  const theta = crankAngle(drive, f);
  const psi = wheelAngle(drive, f);
  const a = steer(drive, variant);""", """function pose(drive: number, f: Faults, variant: number, steering = 0): PartTransform[] {
  const theta = crankAngle(drive, f);
  const psi = wheelAngle(drive, f);
  const a = steer(drive, variant, steering);""")
open(p, 'w').write(s)

p = 'src/mechanisms/types.ts'
s = open(p).read()
s = rep(s, """  // Pure. Ghost pose is pose(drive, ZERO_FAULTS, 0).
  pose(drive: number, faults: Faults, variant: number): PartTransform[];""", """  // Pure. Ghost pose is pose(drive, ZERO_FAULTS, ghostVariant). `steer` (the scene's mech.steer,
  // default 0) is steering added to the drive's own, as a fraction of full lock; a machine that
  // does not steer ignores it.
  pose(drive: number, faults: Faults, variant: number, steer?: number): PartTransform[];""")
open(p, 'w').write(s)

p = 'src/scene/mote/partTransforms.ts'
s = open(p).read()
s = rep(s, "const pose = mech.pose(s.mech.drive, s.mech.faults, s.mech.variant);",
        "const pose = mech.pose(s.mech.drive, s.mech.faults, s.mech.variant, s.mech.steer);")
open(p, 'w').write(s)

p = 'docs/adding-a-mechanism.md'
s = open(p).read()
s = rep(s, "  pose(drive: number, faults: Faults, variant: number): PartTransform[];",
        "  pose(drive: number, faults: Faults, variant: number, steer?: number): PartTransform[];")
s = rep(s, "  part. The ghost is `pose(drive, ZERO_FAULTS, 0)`.",
        "  part. The ghost is `pose(drive, ZERO_FAULTS, ghostVariant)`. `steer` is the scene's `mech.steer`, steering\n  added to the drive's own as a fraction of full lock; a machine that does not steer ignores it.")
open(p, 'w').write(s)
