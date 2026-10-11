  // The spec section, the drawing first (storyboard §2.4; docs/specs/2026-10-05-blueprint-and-
  // build.md §4.2, §5 test 4): the agent draws the bike in ink on a sheet of paper, in the wrong
  // shape; you ring the seat, the agent strikes out the wrong lines and draws new ones, you tick it;
  // the lines lift off the page, the page goes, the gold core lands on the lines, then the blue body
  // round it, and the finished bike rides. The motes are the correct, specced machine throughout;
  // only the drawing is ever the twin.
  const SPEC_SAMPLES = 10_000;
  const specAt = (i: number) => sampler.sample(at('spec', i / SPEC_SAMPLES));
  const specStates = Array.from({ length: SPEC_SAMPLES + 1 }, (_, i) => ({ l: i / SPEC_SAMPLES, s: specAt(i) }));

  it('keeps the motes the correct, specced machine through the spec, the cloud loose until sp-7, and the dotted ghost off', () => {
    for (const { l, s } of specStates) {
      expect([s.provenance.vibed, s.mech.variant, s.mech.ghost, s.mech.ghostVariant], `local ${l}`).toEqual([0, 0, 0, 0]);
      if (l <= 0.72) expect(s.mech.assembly, `local ${l}`).toBe(0);
    }
  });

  it('draws the page and the ink only in the spec section', () => {
    for (let i = 0; i <= 2000; i++) {
      const p = i / 2000;
      if (p >= at('spec', 0)) break;
      const s = sampler.sample(p);
      expect([s.sheet.opacity, s.ink.opacity, s.stage.motes], `progress ${p}`).toEqual([0, 0, 1]);
    }
  });

  it('draws the ink in by the pen as sp-2 is up, and holds it drawn', () => {
    let prev = 0;
    for (const { l, s } of specStates) {
      expect(s.ink.drawn, `local ${l}`).toBeGreaterThanOrEqual(prev);
      prev = s.ink.drawn;
      if (l <= 0.05) expect(s.ink.drawn, `local ${l}`).toBe(0);
      if (l >= 0.16) expect(s.ink.drawn, `local ${l}`).toBe(1);
      if (l > 0.05 && l < 0.16) expect(s.ink.opacity, `local ${l}`).toBe(1);
    }
  });

  it('redraws during sp-4 only: the ring drawn as the line says it, the redraw after it, the ring gone by its end', () => {
    for (const { l, s } of specStates) {
      if (l <= 0.32) expect(s.ink.redraw, `local ${l}`).toBe(0);
      if (l >= 0.41) expect(s.ink.redraw, `local ${l}`).toBe(1);
      if (l <= 0.28) expect(s.ink.ring, `local ${l}`).toBe(0);
      if (l >= 0.42) expect(s.ink.ring, `local ${l}`).toBe(2);
      if (l < 0.46) expect(s.ink.tick, `local ${l}`).toBe(0);
      if (l >= 0.49) expect(s.ink.tick, `local ${l}`).toBe(1);
    }
    const ringUp = specStates.filter(({ s }) => s.ink.ring === 1).map(({ l }) => l);
    expect(Math.min(...ringUp)).toBeGreaterThanOrEqual(0.27);
    expect(Math.max(...ringUp)).toBeLessThanOrEqual(0.43);
  });

  it('presses the drawing flat on an opaque page until the lift, and lets it up only as the page goes', () => {
    for (const { l, s } of specStates) {
      if (l <= 0.61) expect(s.ink.flat, `local ${l}`).toBe(1);
      if (l >= 0.69) expect(s.ink.flat, `local ${l}`).toBe(0);
      if (l >= 0.08 && l <= 0.6) expect(s.sheet.opacity, `local ${l}`).toBe(1);
      if (l >= 0.69) expect(s.sheet.opacity, `local ${l}`).toBe(0);
      // Nothing lifts through an opaque page.
      if (s.ink.flat < 1) expect(s.sheet.opacity, `local ${l}`).toBeLessThan(0.999);
      // The cloud is dust behind the page while it is up.
      if (s.sheet.opacity === 1) expect(s.stage.motes, `local ${l}`).toBeCloseTo(0.1, 12);
    }
  });

  it('brings the cloud back before any mote lands, everywhere in the essay', () => {
    for (let i = 0; i <= 20_000; i++) {
      const s = sampler.sample(i / 20_000);
      if (s.mech.assembly > 0) expect(s.stage.motes, `progress ${i / 20_000}`).toBeGreaterThanOrEqual(0.9);
      if (s.sheet.opacity === 0 && i / 20_000 < at('spec', 0)) expect(s.stage.motes).toBe(1);
    }
    for (const { l, s } of specStates) if (l >= 0.72) expect(s.stage.motes, `local ${l}`).toBe(1);
  });

  it('leaves the lines faint beneath the finished bike', () => {
    const s = (l: number) => sampler.sample(at('spec', l));
    for (const l of [0.05, 0.5, 0.7, 0.9]) expect(s(l).ink.opacity, `local ${l}`).toBe(1);
    expect(s(0.97).ink.opacity).toBe(0.25);
    expect(s(1).ink.opacity).toBe(0.25);
    expect(s(1).ink.flat).toBe(0);
  });

  // sp-7: the gold lands first, and only the gold. The core lands by spec@0.84 (a little past its
  // settle window, 0.44, so no per-mote ease is still finishing) and holds while no body mote has
  // begun to land, until sp-8 starts the body at 0.85.
  // The bicycle staggers its body after the core (bike/index.ts), so its body has not begun; the
  // other machines' default windows overlap, so for them only the core is checked.
  it.each(Object.entries(mechanisms))('lands the whole %s core during sp-7 (and, for the bicycle, nothing of its body)', (id, mech) => {
    const attrs = buildMoteAttrs(mech, mech.samplePoints(6000, 4));
    const frame = (l: number) => {
      const s = sampler.sample(at('spec', l));
      const xf = partTransforms(mech, s);
      return attrs.map((a) => ({ role: a.role, m: mote(a, s, xf) }));
    };
    for (const l of [0.84, 0.845, 0.85]) {
      const motes = frame(l);
      const core = motes.filter((x) => x.role === ROLE_INDEX.core);
      expect(core.length).toBeGreaterThan(0);
      for (const { m } of core) expect(m.settled, `core at spec@${l}`).toBe(1);
      if (id !== 'bike') continue;
      for (const { m } of motes.filter((x) => x.role === ROLE_INDEX.body)) expect(m.settled, `body at spec@${l}`).toBe(0);
    }
    expect(sampler.sample(at('spec', 0.84)).mech.assembly).toBe(0.46);
  });

  it.each(Object.entries(mechanisms))('builds the whole %s onto its drawing by spec@0.95 and keeps it there to the end', (_id, mech) => {
    for (const l of [0.95, 0.97, 1]) {
      const s = sampler.sample(at('spec', l));
      expect(s.mech.assembly, `spec@${l}`).toBe(1);
      const xf = partTransforms(mech, s);
      // Where the lines stand: the intended machine, as the ink is posed (src/scene/ink/inkPose.ts).
      const lines = inkPoses(mech, s).correct;
      mech.parts.forEach((part, i) => {
        expect(transformDistance(xf[i], lines[i]), `${part.id} at spec@${l}`).toBeLessThan(1e-6);
      });
    }
  });

  it('draws the finished bicycle on its lines at the very end, to a tenth of a pixel, at desktop and phone sizes', () => {
    // Every settled mote stands on its part's posed surface, and the ink's outline points, lifted
    // (ink.flat 0), stand on the same posed parts: the two coincide part for part.
    const mech = mechanisms.bike;
    const anchors = mechanismAnchors(mech);
    const s = sampler.sample(1);
    const xf = partTransforms(mech, s);
    const lines = inkPoses(mech, s).correct;
    const attrs = buildMoteAttrs(mech, mech.samplePoints(6000, 4)).filter((a) => a.role !== ROLE_INDEX.drift);
    for (const [w, h] of [
      [1440, 900],
      [390, 844],
    ]) {
      const camera = new PerspectiveCamera(40, w / h, 0.1, 100);
      applyCamera(camera, s, anchors, { compose: true });
      const px = (p: Vector3) => [(p.x * w) / 2, (p.y * h) / 2];
      let worst = 0;
      for (const a of attrs) {
        const m = mote(a, s, xf);
        expect(m.settled).toBe(1);
        const drawn = px(new Vector3(...m.pos).project(camera));
        const onLines = px(new Vector3(...applyToPoint(lines[a.part], a.local)).project(camera));
        worst = Math.max(worst, Math.hypot(drawn[0] - onLines[0], drawn[1] - onLines[1]));
      }
      expect(worst, `${w}x${h}`).toBeLessThan(0.1);
    }
  });

  it('holds the drive still until the bike is nearly built, then rides it out to the end', () => {
    const drive = (l: number) => sampler.sample(at('spec', l)).mech.drive;
    for (const l of [0, 0.3, 0.6, 0.8, 0.84, 0.9]) expect(drive(l), `local ${l}`).toBe(0);
    let prev = 0;
    for (let i = 91; i <= 100; i++) {
      const d = drive(i / 100);
      expect(d, `local ${i / 100}`).toBeGreaterThan(prev);
      prev = d;
    }
    expect(drive(1)).toBe(1.4);
  });

