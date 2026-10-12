import os
import re

os.chdir('.')
p = 'src/timeline/keyframes.test.ts'
s = open(p).read()


def cut(s, start, end_marker):
    i = s.index(start)
    j = s.index(end_marker, i)
    return s[:i] + s[j:]


# 1. The old left-column framing test becomes the new framing intent.
i = s.index("  it('frames the whole reveal bike, ground and all, right of the text panel and inside the frame'")
j = s.index("  it.each([\n    [1440, 900],", i)
s = s[:i] + """  it.each([
    [1440, 900],
    [390, 844],
  ])('frames the whole reveal twin, ground and all, inside the frame and below the text band, at %ix%i', (w, h) => {
    // The text sits at the top (storyboard §3.4): its band ends at 42% of the height. The wide
    // reveal shots (rv-5 to rv-7) show the whole twin under it, nothing cropped.
    const bike = mechanisms.bike;
    const anchors = mechanismAnchors(bike);
    const points = bike.samplePoints(20_000, 1);
    const camera = new PerspectiveCamera(40, w / h, 0.1, 100);
    for (let i = 56; i <= 100; i += 4) {
      const s = sampler.sample(at('reveal', i / 100));
      applyCamera(camera, s, anchors, { compose: true });
      const xf = partTransforms(bike, s);
      const v = points.map((b) => new Vector3(...applyToPoint(xf[b.part], b.localTwin)).project(camera));
      const top = Math.max(...v.map((p) => p.y));
      expect(top, `local ${i / 100}: the top below the band`).toBeLessThan(1 - 2 * TEXT_BAND);
      expect(Math.min(...v.map((p) => p.y)), `local ${i / 100}: the bottom on screen`).toBeGreaterThan(-1);
      expect(Math.max(...v.map((p) => Math.abs(p.x))), `local ${i / 100}: both ends on screen`).toBeLessThan(1);
    }
  });

""" + s[j:]

# 2. The cold-open sweep is replaced by the per-shot tests (shots.test.ts).
s = cut(s, "  it('opens low and three-quarter on the bike from the drive side, sweeping as it assembles'",
        "  it('rises in the reveal to a high front three-quarter")

# 3. The reveal bounds hold on its wide shots, read in bike terms.
a = """    for (const l of LOCALS.filter((x) => x >= 0.5)) {
      const s = sampler.sample(at('reveal', l));
      expect(bearing(s), `local ${l}`).toBeGreaterThanOrEqual(30);
      expect(bearing(s), `local ${l}`).toBeLessThanOrEqual(60);
      expect(elevation(s), `local ${l}`).toBeGreaterThanOrEqual(20);
      expect(s.camera.fov, `local ${l}`).toBeLessThanOrEqual(33);
    }"""
assert a in s
s = s.replace(a, """    // From rv-5 on (the camera is back on the wide reveal shot by local 0.56). Bearing in bike terms:
    // 0 from the front, 90 from the drive side (src/timeline/shots.ts).
    const anchors = mechanismAnchors(mechanisms.bike);
    for (let i = 56; i <= 100; i += 2) {
      const s = sampler.sample(at('reveal', i / 100));
      const shot = shotOf(s.camera, anchors);
      expect(shot.bearing, `local ${i / 100}`).toBeGreaterThanOrEqual(30);
      expect(shot.bearing, `local ${i / 100}`).toBeLessThanOrEqual(60);
      expect(shot.elevation, `local ${i / 100}`).toBeGreaterThanOrEqual(20);
      expect(s.camera.fov, `local ${i / 100}`).toBeLessThanOrEqual(33);
    }""")

# 4. The spec's old end camera is no longer the story's; the old core framing test is retired.
a = """    expect(end.camera).toMatchObject({
      pos: [0.406, 0.049, 4.137],
      target: [-0.957, -0.3, 0.393],
      fov: 35,
      coreFocus: 1,
    });
"""
assert a in s
s = s.replace(a, '')
s = cut(s, "  // Camera keys are machine-relative, so the framing must hold for every registered mechanism.",
        "  // A jump in the world-space camera keeps its size")

# Helpers no longer used.
s = cut(s, "/**\n * Where the camera looks from, in degrees about the vertical", "describe('keyframes.json'")
s = s.replace("""/** NDC x of the text panel's right edge at 1280×720: 64px gutter + 498px panel = 562px ≈ 44%. */
const PANEL_EDGE_NDC = -0.12;
""", """/** The text band: the panel's bottom is never lower than this fraction of the height (storyboard §3.4). */
const TEXT_BAND = 0.42;
""")
s = s.replace("import { mergeState, SCENE_STATE_PATHS, ZERO_FAULTS, type SceneState } from './sceneState';",
              "import { SCENE_STATE_PATHS, ZERO_FAULTS, type SceneState } from './sceneState';\nimport { shotOf } from './shots';")
s = s.replace("import { BB, steer, STEER_TWIN, WHEEL } from '../mechanisms/bike/kinematics';",
              "import { steer, STEER_TWIN } from '../mechanisms/bike/kinematics';")
open(p, 'w').write(s)
