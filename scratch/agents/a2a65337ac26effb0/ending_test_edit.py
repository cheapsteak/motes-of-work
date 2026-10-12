p = 'src/timeline/keyframes.test.ts'
s = open(p).read()


def rep(a, b):
    global s
    assert s.count(a) == 1, a[:70]
    s = s.replace(a, b)


rep(
    "import { partTransforms } from '../scene/mote/partTransforms';",
    "import { buildMoteAttrs, ROLE_INDEX } from '../scene/mote/attributes';\nimport { mote } from '../scene/mote/mote';\nimport { partTransforms } from '../scene/mote/partTransforms';",
)

rep(
    """  it('shows the ghost in the spec while only the core settles', () => {
    for (const l of LOCALS) {
      const s = sampler.sample(at('spec', l));
      expect(s.provenance.vibed, `local ${l}`).toBe(0);
      expect(s.mech.variant, `local ${l}`).toBe(0);
      expect(s.mech.assembly, `local ${l}`).toBeLessThanOrEqual(0.45);
    }
    const end = sampler.sample(at('spec', 1));
    expect(end.mech.ghost).toBe(0.6); // never 1: a full ghost washes out the misallocation colouring
    expect(end.mech.assembly).toBeCloseTo(0.45, 12);""",
    """  it('shows the ghost in the spec while only the core settles', () => {
    for (const l of LOCALS) {
      const s = sampler.sample(at('spec', l));
      expect(s.provenance.vibed, `local ${l}`).toBe(0);
      expect(s.mech.variant, `local ${l}`).toBe(0);
      expect(s.mech.assembly, `local ${l}`).toBeLessThanOrEqual(SPEC_HOLD);
    }
    const end = sampler.sample(at('spec', 1));
    expect(end.mech.ghost).toBe(0.6); // never 1: a full ghost washes out the misallocation colouring
    expect(end.mech.assembly).toBe(SPEC_HOLD);""",
)

rep(
    """  // Camera keys are machine-relative, so the framing must hold for every registered mechanism.
""",
    """  // The essay ends here for now: the last stretch of the scroll must show the core landed, not
  // landing. The hold sits a little past the core's settle window (0.45), so no per-mote ease is
  // still finishing; it is reached by spec@0.8, with the drive already at rest.
  it.each(Object.entries(mechanisms))('lands the whole %s core by spec@0.8 and holds it still to the end', (_id, mech) => {
    const points = mech.samplePoints(6000, 4);
    const attrs = buildMoteAttrs(mech, points);
    const core = attrs.filter((a) => a.role === ROLE_INDEX.core);
    expect(core.length).toBeGreaterThan(0);
    const frame = (l: number) => {
      const s = sampler.sample(at('spec', l));
      const xf = partTransforms(mech, s);
      return core.map((a) => mote(a, s, xf));
    };
    const held = frame(0.8);
    for (const m of held) expect(m.settled).toBe(1);
    for (const l of [0.85, 0.9, 0.95, 1]) {
      frame(l).forEach((m, i) => {
        expect(m.settled).toBe(1);
        expect(m.pos, `local ${l}`).toEqual(held[i].pos);
      });
    }
  });

  it('holds the bicycle body unlanded at the end: none of its motes has begun to settle', () => {
    // The bike staggers its body after the core (bike/index.ts); the drifting loose bolts aside.
    const mech = mechanisms.bike;
    const attrs = buildMoteAttrs(mech, mech.samplePoints(6000, 4)).filter((a) => a.role === ROLE_INDEX.body);
    const s = sampler.sample(at('spec', 1));
    const xf = partTransforms(mech, s);
    for (const a of attrs) expect(mote(a, s, xf).settled).toBe(0);
  });

  it('reaches the hold by spec@0.8 and brings the drive to rest there, slowing into it', () => {
    expect(SPEC_HOLD).toBeGreaterThan(0.45);
    expect(SPEC_HOLD).toBeLessThanOrEqual(0.47);
    const hold = sampler.sample(at('spec', 0.8));
    expect(hold.mech.assembly).toBe(SPEC_HOLD);
    for (const l of [0.85, 0.9, 1]) expect(sampler.sample(at('spec', l)).mech.drive).toBe(hold.mech.drive);
    // Slowing: each tenth of the spec before the hold turns the drive no further than the one before it.
    const drive = (l: number) => sampler.sample(at('spec', l)).mech.drive;
    let step = Infinity;
    for (let i = 4; i <= 8; i++) {
      const d = drive(i / 10) - drive((i - 1) / 10);
      expect(d, `spec ${i / 10}`).toBeGreaterThanOrEqual(0);
      expect(d, `spec ${i / 10}`).toBeLessThanOrEqual(step);
      step = d;
    }
  });

  // Camera keys are machine-relative, so the framing must hold for every registered mechanism.
""",
)

rep(
    "const LOCALS = Array.from({ length: 21 }, (_, i) => i / 20);",
    "const LOCALS = Array.from({ length: 21 }, (_, i) => i / 20);\n/** Where the spec section holds the assembly over its last fifth: the core landed, nothing else begun. */\nconst SPEC_HOLD = 0.46;",
)

open(p, 'w').write(s)
print('ok')
