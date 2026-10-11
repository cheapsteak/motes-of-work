import os

os.chdir('/home/user/motes-of-work')
p = 'src/timeline/keyframes.test.ts'
s = open(p).read()
a = """  it('turns the twin to near full lock for the rest of the reveal, and holds still from rv-5 on', () => {
    // Spec §5.8: the saddle visibly cocks with the front wheel. From reveal 0.3 the steering stays
    // within 10% of full lock; from rv-5 (0.52) to the end the reveal is a still life.
    for (let i = 0; i <= 70; i++) {
      const s = sampler.sample(at('reveal', 0.3 + i / 100));
      expect(Math.abs(steer(s.mech.drive, s.mech.variant)) / STEER_TWIN, `local ${0.3 + i / 100}`).toBeGreaterThanOrEqual(0.9);
    }
    const hold = sampler.sample(at('reveal', 0.52)).mech.drive;
    for (let i = 0; i <= 48; i++) expect(sampler.sample(at('reveal', 0.52 + i / 100)).mech.drive).toBe(hold);
  });
"""
assert a in s
s = s.replace(a, """  it('turns the twin to near full lock for the rest of the reveal, and holds still from rv-5 on', () => {
    // Spec §5.8: the saddle visibly cocks with the front wheel. From reveal 0.3 the steering stays
    // within 10% of full lock, but for rv-3's swing (0.29 to 0.40); from rv-5 (0.52) to the end the
    // reveal is a still life.
    for (let i = 0; i <= 70; i++) {
      const l = 0.3 + i / 100;
      if (l > 0.29 && l < 0.4) continue;
      const s = sampler.sample(at('reveal', l));
      expect(Math.abs(steerFraction(s)), `local ${l}`).toBeGreaterThanOrEqual(0.9);
    }
    const hold = sampler.sample(at('reveal', 0.52)).mech.drive;
    for (let i = 0; i <= 48; i++) {
      const s = sampler.sample(at('reveal', 0.52 + i / 100));
      expect(s.mech.drive).toBe(hold);
      expect(s.mech.steer).toBe(0);
    }
  });

  // Storyboard §2.1 and §2.2: two authored swings make two lines true on cue. The drive's own swing
  // only drifts from 0.99 to 0.89 over the front-wheel line, which cannot show "the front wheel turns".
  it.each([
    ['vibe-build', 0.64, 0.72, -1, 'brief line 3: the front wheel turns, lock to lock'],
    ['reveal', 0.26, 0.41, 1, 'rv-3: the seat turns with the wheel'],
  ] as const)('swings the steering in %s from %s to %s, reaching %s (%s)', (id, from, to, lock) => {
    const fractions = Array.from({ length: 201 }, (_, i) => steerFraction(sampler.sample(at(id, from + ((to - from) * i) / 200))));
    const start = fractions[0];
    expect(Math.sign(start), 'it starts on the other lock').toBe(-lock);
    expect(Math.abs(start)).toBeGreaterThan(0.85);
    expect(lock > 0 ? Math.max(...fractions) : Math.min(...fractions)).toBeCloseTo(lock, 9);
    expect(fractions[200], 'and comes back').toBeCloseTo(start, 1);
  });

  it('adds steering nowhere else', () => {
    const swings = [
      [at('vibe-build', 0.64), at('vibe-build', 0.72)],
      [at('reveal', 0.29), at('reveal', 0.4)],
    ];
    for (let i = 0; i <= 2000; i++) {
      const p = i / 2000;
      if (swings.some(([a, b]) => p > a && p < b)) continue;
      expect(sampler.sample(p).mech.steer, `progress ${p}`).toBe(0);
    }
  });
""")
s = s.replace("""const LOCALS = Array.from({ length: 21 }, (_, i) => i / 20);""", """const LOCALS = Array.from({ length: 21 }, (_, i) => i / 20);
/** The bike's steering as a fraction of full lock, the drive's swing and the authored steer together. */
const steerFraction = (s: SceneState): number => steer(s.mech.drive, s.mech.variant, s.mech.steer) / STEER_TWIN;""")
open(p, 'w').write(s)

p = 'src/mechanisms/bike/index.test.ts'
s = open(p).read()
a = """describe('authored steering (mech.steer)', () => {"""
s = s.replace(a, """describe('assembly', () => {
  it('brings the parts that land after the core in from below or level, never down from above', () => {
    // The text sits at the top of the screen (storyboard §3.4): a part falling into place from above
    // would cross it while the brief's lines are lighting.
    for (const part of bike.parts) {
      if (part.role !== 'body') continue;
      expect(part.explodedOffset.position[1], part.id).toBeLessThanOrEqual(0.2);
    }
  });
});

""" + a)
open(p, 'w').write(s)
