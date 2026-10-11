  // The spec section, the drawing first (storyboard §2.4): the agent draws the bike in white lines,
  // in the wrong shape; you point it out and the lines re-form; the gold core lands on the drawing,
  // then the blue body round it, and the finished bike rides. The motes are the correct, specced
  // machine throughout; only the drawing is ever the twin.
  it('keeps the motes the correct, specced machine through the spec, and the cloud loose until sp-6', () => {
    for (let i = 0; i <= 100; i++) {
      const s = sampler.sample(at('spec', i / 100));
      expect([s.provenance.vibed, s.mech.variant], `local ${i / 100}`).toEqual([0, 0]);
      if (i <= 60) expect(s.mech.assembly, `local ${i / 100}`).toBe(0);
    }
  });

  it('traces the drawing in as sp-2 comes up, in the wrong shape, and redraws it right during sp-4', () => {
    const s = (l: number) => sampler.sample(at('spec', l));
    for (const l of [0, 0.04, 0.08]) expect(s(l).mech.ghost, `local ${l}`).toBe(0);
    for (const l of [0.17, 0.25, 0.3, 0.4, 0.47]) expect(s(l).mech.ghost, `local ${l}`).toBe(0.6);
    // The wrong shape through sp-2 and sp-3 and the start of sp-4; the right one from 0.44.
    for (const l of [0.08, 0.12, 0.17, 0.25, 0.3, 0.35]) expect(s(l).mech.ghostVariant, `local ${l}`).toBe(1);
    for (const l of [0.44, 0.5, 0.7, 1]) expect(s(l).mech.ghostVariant, `local ${l}`).toBe(0);
    let prev = 1;
    for (let i = 0; i <= 90; i++) {
      const v = s(0.35 + i / 1000).mech.ghostVariant;
      expect(v, `local ${0.35 + i / 1000}`).toBeLessThanOrEqual(prev);
      prev = v;
    }
    // "Only lines move; no dots are spent": the motes stay a loose cloud while the drawing re-forms.
    for (const l of [0.35, 0.4, 0.44]) expect(s(l).mech.assembly, `local ${l}`).toBe(0);
  });

  it('draws the seat on the steering post in the wrong drawing, and at the back once redrawn', () => {
    const bike = mechanisms.bike;
    const saddle = bike.parts.findIndex((p) => p.id === 'saddle');
    const bars = bike.parts.findIndex((p) => p.id === 'handlebars');
    const ghostAt = (l: number) => {
      const s = sampler.sample(at('spec', l));
      return bike.pose(s.mech.drive, ZERO_FAULTS, s.mech.ghostVariant);
    };
    const twin = bike.pose(0, ZERO_FAULTS, 1);
    const correct = bike.pose(0, ZERO_FAULTS, 0);
    for (const l of [0.13, 0.25]) {
      expect(transformDistance(ghostAt(l)[saddle], twin[saddle]), `local ${l}`).toBeLessThan(1e-9);
      expect(transformDistance(ghostAt(l)[bars], twin[bars]), `local ${l}`).toBeLessThan(1e-9);
    }
    for (const l of [0.5, 0.68]) {
      expect(transformDistance(ghostAt(l)[saddle], correct[saddle]), `local ${l}`).toBeLessThan(1e-9);
      expect(transformDistance(ghostAt(l)[bars], correct[bars]), `local ${l}`).toBeLessThan(1e-9);
    }
  });

  it('brightens the drawing once as you say yes, and leaves it faint under the finished bike', () => {
    const ghost = (l: number) => sampler.sample(at('spec', l)).mech.ghost;
    expect(ghost(0.5)).toBe(0.85);
    expect(ghost(0.55)).toBe(0.7);
    for (const l of [0.6, 0.7, 0.8, 0.84]) expect(ghost(l), `local ${l}`).toBe(0.7);
    expect(ghost(0.95)).toBe(0.25);
    expect(ghost(1)).toBe(0.25);
  });

  // sp-6: the gold lands first, and only the gold. The core lands by spec@0.74 (a little past its
  // settle window, 0.45, so no per-mote ease is still finishing) and holds while no body mote has
  // begun to land, until sp-7 starts the body at 0.76.
  it.each(Object.entries(mechanisms))('lands the whole %s core during sp-6, and nothing of its body', (_id, mech) => {
    const attrs = buildMoteAttrs(mech, mech.samplePoints(6000, 4));
    const frame = (l: number) => {
      const s = sampler.sample(at('spec', l));
      const xf = partTransforms(mech, s);
      return attrs.map((a) => ({ role: a.role, m: mote(a, s, xf) }));
    };
    for (const l of [0.74, 0.75, 0.76]) {
      const motes = frame(l);
      const core = motes.filter((x) => x.role === ROLE_INDEX.core);
      expect(core.length).toBeGreaterThan(0);
      for (const { m } of core) expect(m.settled, `core at spec@${l}`).toBe(1);
      for (const { m } of motes.filter((x) => x.role === ROLE_INDEX.body)) expect(m.settled, `body at spec@${l}`).toBe(0);
    }
    expect(sampler.sample(at('spec', 0.74)).mech.assembly).toBe(0.46);
  });

  it.each(Object.entries(mechanisms))('builds the whole %s onto its drawing by spec@0.92 and keeps it there to the end', (_id, mech) => {
    for (const l of [0.92, 0.95, 1]) {
      const s = sampler.sample(at('spec', l));
      expect(s.mech.assembly, `spec@${l}`).toBe(1);
      const xf = partTransforms(mech, s);
      const ghost = mech.pose(s.mech.drive, ZERO_FAULTS, s.mech.ghostVariant);
      mech.parts.forEach((part, i) => {
        expect(transformDistance(xf[i], ghost[i]), `${part.id} at spec@${l}`).toBeLessThan(1e-6);
      });
    }
  });

  it('draws the finished bicycle on its drawing at the very end, to a tenth of a pixel, at desktop and phone sizes', () => {
    const mech = mechanisms.bike;
    const anchors = mechanismAnchors(mech);
    const s = sampler.sample(1);
    const xf = partTransforms(mech, s);
    const ghost = mech.pose(s.mech.drive, ZERO_FAULTS, s.mech.ghostVariant);
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
        const outline = px(new Vector3(...applyToPoint(ghost[a.part], a.local)).project(camera));
        worst = Math.max(worst, Math.hypot(drawn[0] - outline[0], drawn[1] - outline[1]));
      }
      expect(worst, `${w}x${h}`).toBeLessThan(0.1);
    }
  });

  it('holds the drive still until the bike is built, then rides it out to the end', () => {
    const drive = (l: number) => sampler.sample(at('spec', l)).mech.drive;
    for (const l of [0, 0.3, 0.6, 0.8, 0.84]) expect(drive(l), `local ${l}`).toBe(0);
    let prev = 0;
    for (let i = 85; i <= 100; i++) {
      const d = drive(i / 100);
      expect(d, `local ${i / 100}`).toBeGreaterThan(prev);
      prev = d;
    }
    expect(drive(1)).toBe(1.4);
  });

