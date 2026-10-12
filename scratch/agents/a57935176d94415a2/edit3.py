import os

os.chdir('.')


def rep(s, a, b):
    assert a in s, a
    return s.replace(a, b, 1)


# kinematics test: steer with an added fraction
p = 'src/mechanisms/bike/kinematics.test.ts'
s = open(p).read()
s = rep(s, """    expect((steer(3, 1) * 180) / Math.PI).toBeCloseTo(-25.8, 1);
  });
""", """    expect((steer(3, 1) * 180) / Math.PI).toBeCloseTo(-25.8, 1);
  });

  // Storyboard §2.6: an authored swing adds to the drive's own, and the sum clamps at full lock.
  it('adds an authored steer to the drive-coupled one, clamped at full lock either way', () => {
    for (const d of [...DRIVES, 2.9, 3]) {
      for (const v of [0, 0.5, 1]) {
        expect(steer(d, v, 0), `drive ${d} variant ${v}`).toBe(steer(d, v));
        const amp = STEER * (1 + (STEER_TWIN / STEER - 1) * v);
        const natural = Math.sin((Math.PI * d) / 2);
        for (const extra of [-2, -1, -0.4, 0.3, 1, 2]) {
          const want = amp * Math.min(1, Math.max(-1, natural + extra));
          expect(steer(d, v, extra), `drive ${d} variant ${v} steer ${extra}`).toBeCloseTo(want, 12);
        }
      }
    }
    // At drive 0 a steer of ±1 is full lock; past it the sum clamps.
    expect(steer(0, 1, 1)).toBeCloseTo(STEER_TWIN, 12);
    expect(steer(0, 1, -1)).toBeCloseTo(-STEER_TWIN, 12);
    expect(steer(0.5, 1, 2)).toBeCloseTo(STEER_TWIN, 12);
    expect(steer(2.9, 1, 2)).toBeCloseTo(STEER_TWIN, 12);
  });
""")
open(p, 'w').write(s)

# index test: pose takes the steer
p = 'src/mechanisms/bike/index.test.ts'
s = open(p).read()
s = rep(s, """describe("the wrong twin: saddle and handlebars on each other's posts", () => {""", """describe('authored steering (mech.steer)', () => {
  const steeredFront = ['fork', 'brake-front', 'mudguard-front'];

  it('yaws the front by the full amplitude at steer ±1 and drive 0, and in the twin the saddle with it', () => {
    for (const v of [0, 1]) {
      for (const sign of [1, -1]) {
        const xf = bike.pose(0, ZERO_FAULTS, v, sign);
        const q = fromAxisAngle(STEER_AXIS, sign * (v === 0 ? 0.14 : 0.45));
        for (const id of steeredFront) {
          expect(transformDistance(xf[P(id)], { position: world(HEAD_TOP), quaternion: q }), `${id} v${v}`).toBeLessThan(1e-9);
        }
        // The front wheel's axle swings round the axis with the fork.
        const rest = bike.pose(0, ZERO_FAULTS, v);
        const axle = sub(xf[P('front-wheel')].position, world(HEAD_TOP));
        const restAxle = sub(rest[P('front-wheel')].position, world(HEAD_TOP));
        expect(dist(axle, rotate(q, restAxle)), `axle v${v}`).toBeLessThan(1e-9);
        const seat: PartTransform = { position: xf[P('saddle')].position, quaternion: v === 1 ? q : [0, 0, 0, 1] };
        expect(transformDistance(xf[P('saddle')], seat), `saddle v${v}`).toBeLessThan(1e-9);
      }
    }
  });

  it('clamps the sum at full lock, so a swing past it holds the lock', () => {
    // drive 1 is the natural lock on one side: adding more holds it there.
    expect(bike.pose(1, ZERO_FAULTS, 1, 0.5)).toEqual(bike.pose(1, ZERO_FAULTS, 1));
    expect(bike.pose(0.5, ZERO_FAULTS, 1, 2)).toEqual(bike.pose(0.5, ZERO_FAULTS, 1, 1.5));
    expect(bike.pose(0.5, ZERO_FAULTS, 1, 2)).not.toEqual(bike.pose(0.5, ZERO_FAULTS, 1, 0.1));
  });

  it('changes nothing at steer 0, for every drive and variant', () => {
    for (const d of DRIVES) {
      for (const v of [0, 0.5, 1]) expect(bike.pose(d, ZERO_FAULTS, v, 0), `drive ${d} variant ${v}`).toEqual(bike.pose(d, ZERO_FAULTS, v));
    }
  });
});

describe("the wrong twin: saddle and handlebars on each other's posts", () => {""")
open(p, 'w').write(s)

# partTransforms test: the scene's steer reaches the pose
p = 'src/scene/mote/partTransforms.test.ts'
s = open(p).read()
s = s.rstrip('\n') + """

describe('the scene steer', () => {
  it('reaches the pose: partTransforms of an assembled machine is pose(drive, faults, variant, steer)', () => {
    for (const [id, mech] of Object.entries(mechanisms)) {
      const s = mergeState(defaultSceneState(), { mech: { assembly: 1, drive: 0.37, variant: 1, steer: -0.7 } });
      const want = mech.pose(0.37, ZERO_FAULTS, 1, -0.7);
      partTransforms(mech, s).forEach((t, i) => expect(transformDistance(t, want[i]), `${id} part ${i}`).toBeLessThan(1e-9));
    }
    const bike = mechanisms.bike;
    const steered = partTransforms(bike, mergeState(defaultSceneState(), { mech: { steer: 1 } }));
    const plain = partTransforms(bike, defaultSceneState());
    expect(steered).not.toEqual(plain);
  });
});
"""
open(p, 'w').write(s)
