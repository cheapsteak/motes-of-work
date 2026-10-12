import os

os.chdir('.')


def rep(p, old, new, count=1):
    s = open(p).read()
    assert s.count(old) == count, (p, s.count(old), old[:70])
    open(p, 'w').write(s.replace(old, new))


T = 'src/mechanisms/bike/index.test.ts'
rep(T, """import { bike, blurb, CENTRE, CHAIN_SEGMENTS, GEARING, label, partDensities, partIndex, SCALE } from './index';""",
    """import { basketArrival, bike, blurb, CENTRE, CHAIN_SEGMENTS, GEARING, label, partDensities, partIndex, SCALE } from './index';""")
rep(T, """import { partTransforms } from '../../scene/mote/partTransforms';""",
    """import { partAssembly, partTransforms } from '../../scene/mote/partTransforms';""")
rep(T, """      'front-wheel': ['body', [0.54, 0.6]],
      'rear-wheel': ['body', [0.54, 0.6]],
      cranks: ['body', [0.54, 0.6]],
      ...Object.fromEntries(CHAIN_IDS.map((id) => [id, ['body', [0.54, 0.6]]])),
      fork: ['body', [0.69, 0.72]],
      frame: ['body', [0.81, 0.95]],
      'brake-front': ['body', [0.94, 0.97]],
      'brake-rear': ['body', [0.94, 0.97]],
      'mudguard-front': ['body', [0.94, 0.97]],
      'mudguard-rear': ['body', [0.94, 0.97]],
      ground: ['body', [0.94, 0.97]],
      'loose-bolts': ['drift', [0.54, 0.59]],""", """      'front-wheel': ['body', [0.42, 0.48]],
      'rear-wheel': ['body', [0.42, 0.48]],
      cranks: ['body', [0.42, 0.48]],
      ...Object.fromEntries(CHAIN_IDS.map((id) => [id, ['body', [0.42, 0.48]]])),
      fork: ['body', [0.57, 0.6]],
      basket: ['body', [0.69, 0.72]],
      frame: ['body', [0.81, 0.95]],
      'brake-front': ['body', [0.94, 0.97]],
      'brake-rear': ['body', [0.94, 0.97]],
      'mudguard-front': ['body', [0.95, 0.97]],
      'mudguard-rear': ['body', [0.95, 0.97]],
      ground: ['body', [0.94, 0.97]],
      'loose-bolts': ['drift', [0.57, 0.59]],""")
rep(T, """    // docs/specs/2026-10-05-act-1-build-and-orbit.md §2.2: each stage's span runs from its first
    // mote setting out (from - SETTLE_WINDOW) to its last landing (to). Core, drive, fork and frame
    // are end to end; the fittings set out while the frame is being laid and land last, once it is
    // done. The loose bolts land with the drive.""", """    // docs/specs/2026-10-05-act-1-build-and-orbit.md §2.2: each stage's span runs from its first
    // mote setting out (from - SETTLE_WINDOW) to its last landing (to). Core, drive, fork, basket and
    // frame are end to end; the fittings set out while the frame is being laid and land last, once it
    // is done, the mudguards strictly after it (they have a line of their own). The loose bolts land
    // with the fork.""")
rep(T, """    const fork = span(['fork']);
    const frame = span(['frame']);
    const fittings = span(['brake-front', 'brake-rear', 'mudguard-front', 'mudguard-rear', 'ground']);
    const bolts = span(['loose-bolts']);
    const stages = [core, drive, fork, frame];""", """    const fork = span(['fork']);
    const basket = span(['basket']);
    const frame = span(['frame']);
    const fittings = span(['brake-front', 'brake-rear', 'mudguard-front', 'mudguard-rear', 'ground']);
    const mudguards = span(['mudguard-front', 'mudguard-rear']);
    const bolts = span(['loose-bolts']);
    const stages = [core, drive, fork, basket, frame];""")
rep(T, """    expect(fittings[1]).toBeGreaterThan(frame[1]);
    expect(bolts[0]).toBeGreaterThanOrEqual(drive[0]);
    expect(bolts[1]).toBeLessThanOrEqual(drive[1]);""", """    expect(fittings[1]).toBeGreaterThan(frame[1]);
    expect(mudguards[1] - SETTLE_WINDOW, 'the mudguards land after the frame is done').toBeGreaterThanOrEqual(frame[1]);
    expect(bolts[0]).toBeGreaterThanOrEqual(fork[0]);
    expect(bolts[1]).toBeLessThanOrEqual(fork[1]);""")
rep(T, """describe('assembly', () => {
  it('brings the parts that land after the core in from below or level, never down from above', () => {
    // The text sits at the top of the screen (storyboard §3.4): a part falling into place from above
    // would cross it while the brief's lines are lighting.
    for (const part of bike.parts) {
      if (part.role !== 'body') continue;
      expect(part.explodedOffset.position[1], part.id).toBeLessThanOrEqual(0.2);
    }
  });
});""", """describe('assembly', () => {
  it('brings the parts that land after the core in from below or level, never down from above, but the basket', () => {
    // The text sits at the top of the screen (storyboard §3.4): a part falling into place from above
    // would cross it while the brief's lines are lighting. The basket is the one exception: it drops
    // onto the fork from not far above, on the close front shot, under the text
    // (e2e/clearance.spec.ts is the arbiter).
    for (const part of bike.parts) {
      if (part.role !== 'body') continue;
      if (part.id === 'basket') {
        expect(part.explodedOffset.position[1]).toBeGreaterThan(0);
        expect(part.explodedOffset.position[1] / SCALE, 'drops from under 0.4 m').toBeLessThan(0.4);
        continue;
      }
      expect(part.explodedOffset.position[1], part.id).toBeLessThanOrEqual(0.2);
    }
  });

  it('drops the basket onto the fork: it hangs above while its motes gather, falls, hops once and settles', () => {
    const basket = bike.parts[P('basket')];
    const [from, to] = basket.settle ?? [0, 0];
    const lo = from - SETTLE_WINDOW;
    const a = (x: number) => partAssembly(basket, lo + (to - lo) * x);
    // Held up, fully exploded, until most of its motes have reached it.
    for (const x of [0, 0.3, 0.6, 0.8]) expect(a(x), `x ${x}`).toBe(0);
    // Every mote has landed on it before it falls: none lands later than its window lets it.
    expect(basketArrival(0.8)).toBe(0);
    // Falls faster and faster: the second half of the fall covers three times the first.
    expect(a(0.85)).toBeCloseTo(0.25, 9);
    expect(a(0.9)).toBe(1);
    // Hops: back up a little, then down for good.
    const hop = Math.min(...Array.from({ length: 101 }, (_, i) => a(0.9 + (0.1 * i) / 100)));
    expect(hop).toBeLessThan(0.95);
    expect(hop).toBeGreaterThan(0.8);
    expect(a(1)).toBe(1);
    // Straight down onto its seat on the fork, turned as the fork is.
    const s = defaultSceneState();
    s.mech.assembly = to;
    const xf = partTransforms(bike, s);
    expect(transformDistance(xf[P('basket')], xf[P('fork')])).toBeLessThan(1e-9);
  });
});""")
rep(T, """  const steeredFront = ['fork', 'brake-front', 'mudguard-front'];""",
    """  const steeredFront = ['fork', 'basket', 'brake-front', 'mudguard-front'];""")
rep(T, """    const steered = new Set(['fork', 'front-wheel', 'brake-front', 'mudguard-front']);""",
    """    const steered = new Set(['fork', 'basket', 'front-wheel', 'brake-front', 'mudguard-front']);""")
rep(T, """    const deliberate: Record<string, number> = { 'brake-front': 1.3, 'brake-rear': 1.3, 'loose-bolts': 1.3 };""",
    """    // The basket's broad panels are sampled thinner (shapes.ts BASKET_DENSITY).
    const deliberate: Record<string, number> = { 'brake-front': 1.3, 'brake-rear': 1.3, 'loose-bolts': 1.3, basket: 0.22 };""")
rep(T, """      for (const id of ['fork', 'brake-front', 'mudguard-front']) {""", """      for (const id of ['fork', 'basket', 'brake-front', 'mudguard-front']) {""")
print('ok')
