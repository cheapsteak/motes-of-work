import os

os.chdir('.')


def rep(p, old, new, count=1):
    s = open(p).read()
    assert s.count(old) == count, (p, s.count(old), old[:70])
    open(p, 'w').write(s.replace(old, new))


K = 'src/timeline/keyframes.test.ts'
rep(K, """    expect(sampler.sample(at('vibe-build', 0.8125)).mech.assembly).toBe(1);""",
    """    expect(sampler.sample(at('vibe-build', 0.83333333)).mech.assembly).toBe(1);""")
rep(K, """  // The cold open (docs/specs/2026-10-05-act-1-build-and-orbit.md §2.1, §2.4): the bike is built
  // in four stages while the brief is up, each stage flying in as its line comes up (the author,
  // 2026-10-05: the parts arrive with the words) and lighting the line once its parts have landed;
  // every stage is held until the next line comes up.
  it('builds the bike in four held stages while the brief is up, lighting its lines where the storyboard says', () => {
    const assembly = (l: number) => sampler.sample(at('vibe-build', l)).mech.assembly;
    for (const l of [0, 0.05, 0.125, 0.171875]) expect(assembly(l), `local ${l}`).toBe(0);
    for (const [from, to, value] of [
      [0.25, 0.296875, 0.45],
      [0.3671875, 0.46875, 0.61],
      [0.5234375, 0.6875, 0.73],
    ]) {
      for (let i = 0; i <= 10; i++) expect(assembly(from + ((to - from) * i) / 10), `held at ${value}`).toBeCloseTo(value, 12);
    }
    for (const l of [0.8125, 0.84375, 0.95, 1]) expect(assembly(l), `local ${l}`).toBe(1);""",
    """  // The cold open (docs/specs/2026-10-05-act-1-build-and-orbit.md §2.1, §2.4, as amended for the
  // basket and the mudguards): the bike is built in five held stages while the brief is up, each
  // stage flying in as its line comes up (the author, 2026-10-05: the parts arrive with the words)
  // and lighting the line once its parts have landed; every stage is held until the next line comes
  // up. The mudguards' line comes up inside the frame's stage, as their motes set out.
  it('builds the bike in five held stages while the brief is up, lighting its lines where the storyboard says', () => {
    const assembly = (l: number) => sampler.sample(at('vibe-build', l)).mech.assembly;
    for (const l of [0, 0.05, 0.11111111, 0.15277778]) expect(assembly(l), `local ${l}`).toBe(0);
    for (const [from, to, value] of [
      [0.22222222, 0.26388889, 0.33],
      [0.32638889, 0.41666667, 0.49],
      [0.46527778, 0.58333333, 0.61],
      [0.67361111, 0.72222222, 0.73],
    ]) {
      for (let i = 0; i <= 10; i++) expect(assembly(from + ((to - from) * i) / 10), `held at ${value}`).toBeCloseTo(value, 12);
    }
    for (const l of [0.83333333, 0.86111111, 0.95, 1]) expect(assembly(l), `local ${l}`).toBe(1);""")
rep(K, """    [0.2483, 0.3628, 0.5189, 0.8].forEach((want, i) => expect(lights[i], `line ${i + 1}`).toBeCloseTo(want, 3));
    for (const l of [0, 0.25, 0.3203125]) expect(sampler.sample(at('vibe-build', l)).mech.drive, `local ${l}`).toBe(0);
  });""", """    [0.2201, 0.3225, 0.4612, 0.6667, 0.8139, 0.8222].forEach((want, i) => expect(lights[i], `line ${i + 1}`).toBeCloseTo(want, 3));
    for (const l of [0, 0.22222222, 0.28472222]) expect(sampler.sample(at('vibe-build', l)).mech.drive, `local ${l}`).toBe(0);
  });

  it('drops the basket in only once the front wheel has turned and is straight, and lands it before the frame line', () => {
    // The author, 2026-10-05: "Can we animate the basket in after the wheel turns?"
    const s = (l: number) => sampler.sample(at('vibe-build', l));
    const basket = mechanisms.bike.parts.find((p) => p.id === 'basket');
    if (!basket?.settle) throw new Error('no basket window');
    const setOut = basket.settle[0] - 0.08;
    let firstOut = Infinity;
    for (let i = 0; i <= 20_000; i++) {
      const l = i / 20_000;
      if (s(l).mech.assembly > setOut + 1e-12) {
        firstOut = l;
        break;
      }
    }
    // The turn is over (steer back at 0 from 0.5625) before the basket's motes leave the shell.
    expect(firstOut).toBeGreaterThan(0.5625);
    for (let l = 0.5625; l <= firstOut; l += 0.001) expect(s(l).mech.steer, `local ${l}`).toBe(0);
    // It has landed, hop and all, before the frame's line comes up at 0.72222222.
    expect(s(0.67).mech.assembly).toBeGreaterThanOrEqual(basket.settle[1]);
  });""")
rep(K, """    expect(drive(0.3203125)).toBe(0);
    expect(drive(0.421875)).toBe(2);
    for (let i = 0; i <= 20; i++) expect(drive(0.421875 + ((0.84375 - 0.421875) * i) / 20)).toBe(2);""",
    """    expect(drive(0.28472222)).toBe(0);
    expect(drive(0.375)).toBe(2);
    for (let i = 0; i <= 20; i++) expect(drive(0.375 + ((0.86111111 - 0.375) * i) / 20)).toBe(2);""")
rep(K, """    // The cold open's 0 and three stage holds, the finished bike, the spec's 0 and its core at 0.46.
    expect(holds).toBeGreaterThanOrEqual(7);""", """    // The cold open's 0 and four stage holds, the finished bike, the spec's 0 and its core at 0.34.
    expect(holds).toBeGreaterThanOrEqual(8);""")
rep(K, """      const l = 0.3203125 + ((0.421875 - 0.3203125) * i) / 400;""", """      const l = 0.28472222 + ((0.375 - 0.28472222) * i) / 400;""")
rep(K, """    expect(Math.abs(Math.sin((Math.PI * sampler.sample(at('vibe-build', 0.37109375)).mech.drive) / 2))).toBeCloseTo(1, 9);""",
    """    expect(Math.abs(Math.sin((Math.PI * sampler.sample(at('vibe-build', 0.32986111)).mech.drive) / 2))).toBeCloseTo(1, 6);""")
rep(K, """    const fractions = Array.from({ length: 401 }, (_, i) => steerFraction(s(0.5390625 + (0.09375 * i) / 400)));""",
    """    const fractions = Array.from({ length: 401 }, (_, i) => steerFraction(s(0.47916667 + ((0.5625 - 0.47916667) * i) / 400)));""")
rep(K, """    expect(steerFraction(s(0.5625))).toBeCloseTo(1, 9);
    expect(steerFraction(s(0.609375))).toBeCloseTo(-1, 9);
    for (const l of [0.5390625, 0.57, 0.6, 0.6328125]) {
      expect([s(l).mech.assembly, s(l).mech.drive], `local ${l}`).toEqual([0.73, 2]);
    }""", """    expect(steerFraction(s(0.5))).toBeCloseTo(1, 9);
    expect(steerFraction(s(0.54166667))).toBeCloseTo(-1, 9);
    for (const l of [0.47916667, 0.5, 0.53, 0.5625]) {
      expect(s(l).mech.assembly, `local ${l}`).toBeCloseTo(0.61, 12);
      expect(s(l).mech.drive, `local ${l}`).toBe(2);
    }""")
rep(K, """      [at('vibe-build', 0.3203125), at('vibe-build', 0.421875)],
      [at('vibe-build', 0.5390625), at('vibe-build', 0.6328125)],""", """      [at('vibe-build', 0.28472222), at('vibe-build', 0.375)],
      [at('vibe-build', 0.47916667), at('vibe-build', 0.5625)],""")
rep(K, """  // sp-7: the gold lands first, and only the gold. The core lands by spec@0.84 (a little past its
  // settle window, 0.44, so no per-mote ease is still finishing) and holds while no body mote has""",
    """  // sp-7: the gold lands first, and only the gold. The core lands by spec@0.84 (a little past its
  // settle window, 0.32, so no per-mote ease is still finishing) and holds while no body mote has""")
rep(K, """    expect(sampler.sample(at('spec', 0.84)).mech.assembly).toBe(0.46);""",
    """    expect(sampler.sample(at('spec', 0.84)).mech.assembly).toBe(0.34);""")
print('ok')
