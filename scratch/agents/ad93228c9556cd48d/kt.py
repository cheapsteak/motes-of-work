PATH = "src/timeline/keyframes.test.ts"
s = open(PATH).read()
R = [
    (
        """    expect(drive(0.43125)).toBe(0);
    expect(drive(0.5125)).toBe(2);
    for (let i = 0; i <= 20; i++) expect(drive(0.5125 + ((0.875 - 0.5125) * i) / 20)).toBe(2);""",
        """    expect(drive(0.3203125)).toBe(0);
    expect(drive(0.421875)).toBe(2);
    for (let i = 0; i <= 20; i++) expect(drive(0.421875 + ((0.84375 - 0.421875) * i) / 20)).toBe(2);""",
    ),
    (
        """    // Spec §5.8: the saddle visibly cocks with the front wheel. From reveal 0.3 the steering stays
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
      const s = sampler.sample(at('reveal', 0.52 + i / 100));""",
        """    // Spec §5.8: the saddle visibly cocks with the front wheel. From reveal 0.375 the steering stays
    // within 10% of full lock, but for rv-3's swing (0.3625 to 0.5); from rv-5 (0.625) to the end the
    // reveal is a still life.
    for (let i = 0; i <= 100; i++) {
      const l = 0.375 + (0.625 * i) / 100;
      if (l > 0.3625 && l < 0.5) continue;
      const s = sampler.sample(at('reveal', l));
      expect(Math.abs(steerFraction(s)), `local ${l}`).toBeGreaterThanOrEqual(0.9);
    }
    const hold = sampler.sample(at('reveal', 0.625)).mech.drive;
    for (let i = 0; i <= 50; i++) {
      const s = sampler.sample(at('reveal', 0.625 + (0.375 * i) / 50));""",
    ),
    (
        """      const l = 0.43125 + ((0.5125 - 0.43125) * i) / 400;""",
        """      const l = 0.3203125 + ((0.421875 - 0.3203125) * i) / 400;""",
    ),
    ("""at('vibe-build', 0.471875)).mech.drive""", """at('vibe-build', 0.37109375)).mech.drive"""),
    (
        """steerFraction(s(0.625 + (0.075 * i) / 400)));""",
        """steerFraction(s(0.5390625 + (0.09375 * i) / 400)));""",
    ),
    ("""expect(steerFraction(s(0.64375))).toBeCloseTo(1, 9);""", """expect(steerFraction(s(0.5625))).toBeCloseTo(1, 9);"""),
    ("""expect(steerFraction(s(0.68125))).toBeCloseTo(-1, 9);""", """expect(steerFraction(s(0.609375))).toBeCloseTo(-1, 9);"""),
    ("""for (const l of [0.625, 0.65, 0.68, 0.7]) {""", """for (const l of [0.5390625, 0.57, 0.6, 0.6328125]) {"""),
    (
        """at('reveal', 0.26 + (0.15 * i) / 200))));""",
        """at('reveal', 0.325 + (0.1875 * i) / 200))));""",
    ),
    (
        """      [at('vibe-build', 0.43125), at('vibe-build', 0.5125)],
      [at('vibe-build', 0.625), at('vibe-build', 0.7)],
      [at('reveal', 0.29), at('reveal', 0.4)],""",
        """      [at('vibe-build', 0.3203125), at('vibe-build', 0.421875)],
      [at('vibe-build', 0.5390625), at('vibe-build', 0.6328125)],
      [at('reveal', 0.3625), at('reveal', 0.5)],""",
    ),
    (
        """    // reveal shots (rv-5 to rv-7) show the whole twin under it, nothing cropped.""",
        """    // reveal shots (rv-5 and rv-7, from local 0.675) show the whole twin under it, nothing cropped.""",
    ),
    (
        """    for (let i = 56; i <= 100; i += 4) {
      const s = sampler.sample(at('reveal', i / 100));
      applyCamera(camera, s, anchors, { compose: true });""",
        """    for (let i = 0; i <= 13; i++) {
      const l = 0.675 + 0.025 * i;
      const s = sampler.sample(at('reveal', l));
      applyCamera(camera, s, anchors, { compose: true });""",
    ),
    (
        """    for (let i = 30; i <= 100; i += 5) {
      applyCamera(camera, sampler.sample(at('reveal', i / 100)), anchors, { compose: true });""",
        """    for (let i = 0; i <= 15; i++) {
      const l = 0.375 + (0.625 * i) / 15;
      applyCamera(camera, sampler.sample(at('reveal', l)), anchors, { compose: true });""",
    ),
    (
        """    // From rv-5 on (the camera is back on the wide reveal shot by local 0.56). Bearing in bike terms:
    // 0 from the front, 90 from the drive side (src/timeline/shots.ts).
    const anchors = mechanismAnchors(mechanisms.bike);
    for (let i = 56; i <= 100; i += 2) {
      const s = sampler.sample(at('reveal', i / 100));""",
        """    // From rv-5 on (the camera is back on the wide reveal shot by local 0.675). Bearing in bike terms:
    // 0 from the front, 90 from the drive side (src/timeline/shots.ts).
    const anchors = mechanismAnchors(mechanisms.bike);
    for (let i = 0; i <= 26; i++) {
      const l = 0.675 + 0.0125 * i;
      const s = sampler.sample(at('reveal', l));""",
    ),
]
for a, b in R:
    assert s.count(a) == 1, a[:90]
    s = s.replace(a, b)
open(PATH, "w").write(s)
print("ok")
