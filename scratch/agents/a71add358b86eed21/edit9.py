p = '/home/user/motes-of-work/src/timeline/keyframes.test.ts'
s = open(p).read()
start = s.index("    expect(sampler.sample(at('vibe-build', 0)).mech.assembly).toBe(0);\n    expect(sampler.sample(at('vibe-build', 0.85)).mech.assembly).toBe(1);")
end = s.index("  it.each([\n    [1440, 900],\n    [390, 844],\n  ])('frames the whole reveal twin")
new = """    expect(sampler.sample(at('vibe-build', 0)).mech.assembly).toBe(0);
    expect(sampler.sample(at('vibe-build', 0.85625)).mech.assembly).toBe(1);
  });

  // The cold open (docs/specs/2026-10-05-act-1-build-and-orbit.md §2.1, §2.4): the bike is built
  // in four stages while the brief is up, each line lighting once its parts have landed, and every
  // stage is held while the next line is read.
  it('builds the bike in four held stages while the brief is up, lighting its lines where the storyboard says', () => {
    const assembly = (l: number) => sampler.sample(at('vibe-build', l)).mech.assembly;
    for (const l of [0, 0.1, 0.2, 0.28125]) expect(assembly(l), `local ${l}`).toBe(0);
    for (const [from, to, value] of [
      [0.34375, 0.4125, 0.45],
      [0.46875, 0.56875, 0.61],
      [0.6125, 0.75625, 0.73],
    ]) {
      for (let i = 0; i <= 10; i++) expect(assembly(from + ((to - from) * i) / 10), `held at ${value}`).toBeCloseTo(value, 12);
    }
    for (const l of [0.85625, 0.875, 0.95, 1]) expect(assembly(l), `local ${l}`).toBe(1);
    const lines = [...loadStory()[0].body.matchAll(/data-parts="([^"]*)"/g)].map((m) => ({
      parts: parsePartList(m[1]),
    }));
    const thresholds = briefThresholds(lines, mechanisms.bike);
    const lights = thresholds.map((t) => {
      for (let i = 0; i <= 100_000; i++) if (assembly(i / 100_000) >= t) return i / 100_000;
      return Infinity;
    });
    [0.3424, 0.4652, 0.6089, 0.8463].forEach((want, i) => expect(lights[i], `line ${i + 1}`).toBeCloseTo(want, 3));
    for (const l of [0, 0.3, 0.43125]) expect(sampler.sample(at('vibe-build', l)).mech.drive, `local ${l}`).toBe(0);
  });

  it('turns the cranks twice with the chain, then holds the drive at an even number of turns until vb-4 rides', () => {
    const drive = (l: number) => sampler.sample(at('vibe-build', l)).mech.drive;
    expect(drive(0.43125)).toBe(0);
    expect(drive(0.5125)).toBe(2);
    for (let i = 0; i <= 20; i++) expect(drive(0.5125 + ((0.875 - 0.5125) * i) / 20)).toBe(2);
    expect(drive(1)).toBeCloseTo(2.4, 12);
  });

  // No mote may flare while the picture is at rest (§3.7, test 5): every assembly hold in the essay
  // sits at least FLARE_WIDTH from every settle value of the bike.
  it('never flares a mote of the bike while assembly is held', () => {
    const settles = buildMoteAttrs(mechanisms.bike, mechanisms.bike.samplePoints(30_000, 9)).map((a) => a.settle);
    const STEP = 0.0005;
    let holds = 0;
    let p = 0;
    while (p < 1) {
      const value = sampler.sample(p).mech.assembly;
      let q = p;
      while (q + STEP <= 1 && sampler.sample(q + STEP).mech.assembly === value) q += STEP;
      if (q > p) {
        holds++;
        const near = Math.min(...settles.map((s) => Math.abs(s - value)));
        expect(near, `assembly held at ${value} from progress ${p.toFixed(4)} to ${q.toFixed(4)}`).toBeGreaterThanOrEqual(FLARE_WIDTH);
      }
      p = q + STEP;
    }
    // The cold open's 0 and three stage holds, the finished bike, the spec's 0 and its core at 0.46.
    expect(holds).toBeGreaterThanOrEqual(7);
  });

  it('holds the bike assembled through the reveal while the drive never falls back', () => {
    const start = sampler.sample(at('reveal', 0));
    expect(start.mech.drive).toBeCloseTo(2.4, 9);
    let drive = start.mech.drive;
    for (const l of LOCALS) {
      const s = sampler.sample(at('reveal', l));
      expect(s.mech.assembly, `local ${l}`).toBe(1);
      expect(s.mech.drive, `local ${l}`).toBeGreaterThanOrEqual(drive);
      drive = s.mech.drive;
    }
    expect(drive).toBeCloseTo(3, 9);
  });

  it('turns the twin to near full lock for the rest of the reveal, and holds still from rv-5 on', () => {
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

  // The steer track (§2.3): the front wheel stays straight while the chain is shown, and turns on
  // its own segment, before the frame, with nothing else moving.
  it('keeps the front wheel straight while the drive turns twice: the authored steer cancels its swing', () => {
    let worst = 0;
    for (let i = 0; i <= 400; i++) {
      const l = 0.43125 + ((0.5125 - 0.43125) * i) / 400;
      worst = Math.max(worst, Math.abs(steerFraction(sampler.sample(at('vibe-build', l)))));
    }
    expect(worst).toBeLessThanOrEqual(0.02);
    // Not vacuous: the drive's own swing reaches full lock over the same stretch.
    expect(Math.abs(Math.sin((Math.PI * sampler.sample(at('vibe-build', 0.471875)).mech.drive) / 2))).toBeCloseTo(1, 9);
  });

  it('turns the front wheel straight, to one lock, across to the other and back, with nothing else moving', () => {
    const s = (l: number) => sampler.sample(at('vibe-build', l));
    const fractions = Array.from({ length: 401 }, (_, i) => steerFraction(s(0.625 + (0.075 * i) / 400)));
    expect(fractions[0]).toBeCloseTo(0, 9);
    expect(fractions[400]).toBeCloseTo(0, 9);
    expect(Math.max(...fractions)).toBeCloseTo(1, 9);
    expect(Math.min(...fractions)).toBeCloseTo(-1, 9);
    expect(steerFraction(s(0.64375))).toBeCloseTo(1, 9);
    expect(steerFraction(s(0.68125))).toBeCloseTo(-1, 9);
    for (const l of [0.625, 0.65, 0.68, 0.7]) {
      expect([s(l).mech.assembly, s(l).mech.drive], `local ${l}`).toEqual([0.73, 2]);
    }
  });

  it('swings the seat with the wheel in rv-3, reaching the other lock and coming back', () => {
    // Storyboard §2.2: the drive's own swing has the wheel near one lock; the authored swing carries
    // it to the other and back while the line is up.
    const fractions = Array.from({ length: 201 }, (_, i) => steerFraction(sampler.sample(at('reveal', 0.26 + (0.15 * i) / 200))));
    const start = fractions[0];
    expect(Math.sign(start), 'it starts on the other lock').toBe(-1);
    expect(Math.abs(start)).toBeGreaterThan(0.85);
    expect(Math.max(...fractions)).toBeCloseTo(1, 9);
    expect(Math.abs(fractions[200] - start), 'and comes back').toBeLessThan(0.15);
  });

  it('adds steering nowhere else', () => {
    const swings = [
      [at('vibe-build', 0.43125), at('vibe-build', 0.5125)],
      [at('vibe-build', 0.625), at('vibe-build', 0.7)],
      [at('reveal', 0.29), at('reveal', 0.4)],
    ];
    for (let i = 0; i <= 2000; i++) {
      const p = i / 2000;
      if (swings.some(([a, b]) => p > a && p < b)) continue;
      expect(sampler.sample(p).mech.steer, `progress ${p}`).toBe(0);
    }
  });

"""
s = s[:start] + new + s[end:]
s = s.replace("import { mote } from '../scene/mote/mote';", "import { FLARE_WIDTH, mote } from '../scene/mote/mote';")
open(p, 'w').write(s)
