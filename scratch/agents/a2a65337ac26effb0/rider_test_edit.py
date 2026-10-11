p = '/home/user/motes-of-work/src/mechanisms/bike/rider.test.ts'
s = open(p).read()


def rep(a, b):
    global s
    assert s.count(a) == 1, a[:70]
    s = s.replace(a, b)


rep(
    """  it('sits in an ordinary upright riding pose', () => {
    const up: Vec3 = [0, 1, 0];
    // Torso 65-80 degrees from horizontal, leaning forward.
    const torso = sub(skel.shoulder, skel.hip);
    expect(90 - angle(torso, up)).toBeGreaterThanOrEqual(65);
    expect(90 - angle(torso, up)).toBeLessThanOrEqual(80);
    expect(torso[0]).toBeGreaterThan(0);
    for (const s of SIDES) {
      // Elbows bent 15-30 degrees; hips closed to 100-120 degrees; knees bent, as a seated rider's.
      const elbow = 180 - angle(sub(skel.shoulders[s], skel.elbows[s]), sub(skel.wrists[s], skel.elbows[s]));
      expect(elbow, `elbow ${s}`).toBeGreaterThanOrEqual(15);
      expect(elbow, `elbow ${s}`).toBeLessThanOrEqual(30);
      const hip = angle(torso, sub(skel.knees[s], skel.hips[s]));
      expect(hip, `hip ${s}`).toBeGreaterThanOrEqual(100);
      expect(hip, `hip ${s}`).toBeLessThanOrEqual(120);
      const knee = 180 - angle(sub(skel.hips[s], skel.knees[s]), sub(skel.ankles[s], skel.knees[s]));
      expect(knee, `knee ${s}`).toBeGreaterThan(20);
      // Knees forward of the hips, feet below them.
      expect(skel.knees[s][0]).toBeGreaterThan(skel.hips[s][0]);
      expect(skel.ankles[s][1]).toBeLessThan(skel.knees[s][1]);
    }
  });""",
    """  it('sits upright, as a seated person does: thighs level and forward, shanks hanging', () => {
    const up: Vec3 = [0, 1, 0];
    const down: Vec3 = [0, -1, 0];
    // Torso 10-20 degrees off vertical, leaning forward.
    const torso = sub(skel.shoulder, skel.hip);
    expect(angle(torso, up)).toBeGreaterThanOrEqual(10);
    expect(angle(torso, up)).toBeLessThanOrEqual(20);
    expect(torso[0]).toBeGreaterThan(0);
    for (const s of SIDES) {
      // Elbows bent 15-30 degrees, reaching for bars that are not there.
      const elbow = 180 - angle(sub(skel.shoulders[s], skel.elbows[s]), sub(skel.wrists[s], skel.elbows[s]));
      expect(elbow, `elbow ${s}`).toBeGreaterThanOrEqual(15);
      expect(elbow, `elbow ${s}`).toBeLessThanOrEqual(30);
      // Thighs within 10 degrees of level, pointing forward (the way the bike goes).
      const thigh = sub(skel.knees[s], skel.hips[s]);
      expect(Math.abs(90 - angle(thigh, up)), `thigh ${s}`).toBeLessThanOrEqual(10);
      expect(thigh[0] / Math.hypot(...thigh), `thigh ${s}`).toBeGreaterThan(0.95);
      // Knees bent near square, so the shanks hang within 15 degrees of plumb.
      expect(angle(sub(skel.ankles[s], skel.knees[s]), down), `shank ${s}`).toBeLessThanOrEqual(15);
      const knee = 180 - angle(sub(skel.hips[s], skel.knees[s]), sub(skel.ankles[s], skel.knees[s]));
      expect(knee, `knee ${s}`).toBeGreaterThan(75);
      expect(knee, `knee ${s}`).toBeLessThan(110);
      // The hip closed to a seated angle.
      const hip = angle(torso, thigh);
      expect(hip, `hip ${s}`).toBeGreaterThanOrEqual(75);
      expect(hip, `hip ${s}`).toBeLessThanOrEqual(100);
    }
  });""",
)

rep(
    """  it('hangs its feet well ahead of the pedals, at every drive', () => {""",
    """  it('hangs clear of the ground: its lowest point at least 0.1 m above it, at every drive', () => {
    const rider = bike.rider;
    if (!rider) throw new Error('no rider');
    const pts = rider.samplePoints(4000, 5).positions;
    const groundY = bike.pose(0, ZERO_FAULTS, 1)[partIndex('ground')].position[1];
    for (const d of DRIVES) {
      const xf = bike.pose(d, ZERO_FAULTS, 1)[rider.part];
      const lowest = Math.min(...pts.map((p) => applyToPoint(xf, p)[1]));
      expect((lowest - groundY) / SCALE, `drive ${d}`).toBeGreaterThanOrEqual(0.1);
    }
  });

  it('hangs its feet well ahead of the pedals, at every drive', () => {""",
)

open(p, 'w').write(s)
print('ok')
