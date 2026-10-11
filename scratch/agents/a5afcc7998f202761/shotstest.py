p = 'src/timeline/shots.test.ts'
s = open(p).read()


def rep(a, b):
    global s
    assert s.count(a) == 1, a[:80]
    s = s.replace(a, b)


rep("""  ['spec', 0.1, 0.19, 'S10', 'sp-1, sp-2: the drawing'],
  ['spec', 0.23, 0.3, 'S6g', 'sp-3: the seat on the front again'],
  ['spec', 0.34, 0.58, 'S10', 'sp-4, sp-5: the redraw'],
  ['spec', 0.64, 0.76, 'S9p', 'sp-6: the gold lands'],
  ['spec', 0.84, 1, 'S10p', 'sp-7: the finished bike rides'],""",
    """  ['spec', 0.08, 0.17, 'S11', 'sp-1, sp-2: the page, square on, as the pen draws'],
  ['spec', 0.21, 0.27, 'S11c', 'sp-3: the seat on its mast, close on the page'],
  ['spec', 0.31, 0.53, 'S11', 'sp-4, sp-5: the redraw and the tick'],
  ['spec', 0.63, 0.7, 'S10', "sp-6: the lines lift, seen from the build's three-quarter"],
  ['spec', 0.74, 0.84, 'S9p', 'sp-7: the gold lands'],
  ['spec', 0.9, 1, 'S10p', 'sp-8: the finished bike rides'],""")

rep("""  it('opens on the drive side: every cold-open shot sees the bike from in front of square-on to just behind it', () => {""",
    """  it('turns from the page to the build in one move, bearing and elevation never turning back, coreFocus held for the gold', () => {
    let prev = shotOf(sampler.sample(at('spec', 0.53)).camera, anchors);
    for (let i = 1; i <= 200; i++) {
      const got = shotOf(sampler.sample(at('spec', 0.53 + (0.1 * i) / 200)).camera, anchors);
      expect(got.bearing, `step ${i}`).toBeLessThanOrEqual(prev.bearing + 1e-9);
      expect(got.elevation, `step ${i}`).toBeGreaterThanOrEqual(prev.elevation - 1e-9);
      prev = got;
    }
    for (let i = 0; i <= 20; i++) expect(sampler.sample(at('spec', 0.74 + (0.1 * i) / 20)).camera.coreFocus).toBe(0.6);
  });

  it.each([
    [1440, 900],
    [390, 844],
  ])('frames the page under the text band at S11, at %ix%i, and inside a phone\\'s width', (w, h) => {
    // docs/specs/2026-10-05-blueprint-and-build.md §2.12: the sheet's top just under the band, its
    // bottom running off the screen (a page larger than the frame), its sides on a phone's screen.
    const sheet = mechanisms.bike.sheet;
    expect(sheet).toBeDefined();
    if (!sheet) return;
    const camera = new PerspectiveCamera(40, w / h, 0.1, 100);
    applyCamera(camera, sampler.sample(at('spec', 0.12)), anchors, { compose: true });
    const corners = [-1, 1].flatMap((sx) =>
      [-1, 1].map((sy) => new Vector3(sheet.centre[0] + (sx * sheet.width) / 2, sheet.centre[1] + (sy * sheet.height) / 2, sheet.centre[2]).project(camera)),
    );
    const top = Math.max(...corners.map((c) => c.y));
    expect(top, 'the top below the band').toBeLessThan(1 - 2 * TEXT_BAND);
    expect(top, 'the top not far below it').toBeGreaterThan(1 - 2 * 0.5);
    if (w < h) expect((Math.max(...corners.map((c) => c.x)) - Math.min(...corners.map((c) => c.x))) / 2, 'width on a phone').toBeLessThanOrEqual(0.92);
  });

  it('opens on the drive side: every cold-open shot sees the bike from in front of square-on to just behind it', () => {""")
open(p, 'w').write(s)
print('ok')
