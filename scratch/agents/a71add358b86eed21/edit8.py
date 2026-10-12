p = 'src/mechanisms/bike/index.test.ts'
s = open(p).read()
s = s.replace("""import { FAULT_KEYS, ZERO_FAULTS, type Faults } from '../../timeline/sceneState';""",
              """import { defaultSceneState, FAULT_KEYS, ZERO_FAULTS, type Faults } from '../../timeline/sceneState';""")
s = s.replace("""import { buildMoteAttrs } from '../../scene/mote/attributes';""",
              """import { buildMoteAttrs, settleWindow } from '../../scene/mote/attributes';
import { FLARE_GAIN, mote, SETTLE_WINDOW, SETTLED_BRIGHTNESS } from '../../scene/mote/mote';
import { partTransforms } from '../../scene/mote/partTransforms';""")
s = s.replace("""  it('carries the order to the twin: its head tube rises into the mast, and its top tube climbs from the stub to the mast join', () => {""",
"""  it('lays one seam at a time: at assembly 0.86 the motes flaring over half are frame motes on at most two consecutive tubes', () => {
    // The landing flare lines up into a travelling seam because the frame's settle values are
    // ordered along its tubes; on every other part it is a scattered sparkle.
    const state = defaultSceneState();
    state.mech.assembly = 0.86;
    state.mech.variant = 1;
    const xf = partTransforms(bike, state);
    const hot = attrs.flatMap((a, i) => {
      const out = mote(a, state, xf);
      const flare = (out.brightness - (1 - out.settled + SETTLED_BRIGHTNESS * out.settled)) / FLARE_GAIN;
      return flare > 0.5 ? [{ part: a.part, local: times(points[i].local, 1 / SCALE) }] : [];
    });
    expect(hot.length).toBeGreaterThan(50);
    for (const h of hot) expect(bike.parts[h.part].id).toBe('frame');
    const tubes = [...new Set(hot.map((h) => layPosition(h.local).tube))].sort((a, b) => a - b);
    expect(tubes.length).toBeLessThanOrEqual(2);
    expect(tubes[tubes.length - 1] - tubes[0]).toBeLessThanOrEqual(1);
    const axis = (p: Vec3, a: Vec3, b: Vec3) => {
      const ab = sub(b, a);
      const u = Math.min(1, Math.max(0, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1] + (p[2] - a[2]) * ab[2]) / (ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2 || 1)));
      return dist(p, [a[0] + ab[0] * u, a[1] + ab[1] * u, a[2] + ab[2] * u]);
    };
    for (const h of hot) {
      const near = Math.min(...tubes.flatMap((k) => FRAME_LAY[k].segments.map((sg) => axis(h.local, sg.a, sg.b))));
      expect(near).toBeLessThan(0.03);
    }
  });

  it('carries the order to the twin: its head tube rises into the mast, and its top tube climbs from the stub to the mast join', () => {""")
open(p, 'w').write(s)

p = 'src/story/brief.test.ts'
s = open(p).read()
s = s.replace("""describe("briefThresholds", () => {
  // The shipped order (src/story/01-vibe-build.md): seat and bars, wheels and chain, steering,
  // brakes, frame.
  const lines = [
    { parts: parsePartList("saddle handlebars") },
    {
      parts: parsePartList(
        "front-wheel rear-wheel cranks chain-* pedal-left pedal-right",
      ),
    },
    { parts: parsePartList("fork front-wheel") },
    { parts: parsePartList("brake-front brake-rear handlebars") },
    { parts: parsePartList("frame") },
  ];

  it("is the latest settle end over the matched parts of the bike, in list order", () => {
    expect(briefThresholds(lines, mechanisms.bike)).toEqual([
      0.44, 0.72, 0.8, 0.87, 0.95,
    ]);
  });

  it("is 1 for every line of a mechanism whose parts the lines do not name", () => {
    expect(briefThresholds(lines, mechanisms.steam)).toEqual([1, 1, 1, 1, 1]);
  });""", """describe("briefThresholds", () => {
  // The shipped order (src/story/01-vibe-build.md): seat and bars, wheels and chain, steering, and
  // the frame with its fittings.
  const lines = [
    { parts: parsePartList("saddle handlebars") },
    {
      parts: parsePartList(
        "front-wheel rear-wheel cranks chain-* pedal-left pedal-right",
      ),
    },
    { parts: parsePartList("fork front-wheel") },
    {
      parts: parsePartList(
        "frame brake-front brake-rear mudguard-front mudguard-rear",
      ),
    },
  ];

  it("is the latest settle end over the matched parts of the bike, in list order", () => {
    expect(briefThresholds(lines, mechanisms.bike)).toEqual([
      0.44, 0.6, 0.72, 0.97,
    ]);
  });

  it("is the same for the brief the story ships", () => {
    const shipped = loadStory()
      .flatMap((s) => [...s.body.matchAll(/data-parts="([^"]*)"/g)])
      .map((m) => ({ parts: parsePartList(m[1]) }));
    expect(shipped).toEqual(lines);
    expect(briefThresholds(shipped, mechanisms.bike)).toEqual([
      0.44, 0.6, 0.72, 0.97,
    ]);
  });

  it("is 1 for every line of a mechanism whose parts the lines do not name", () => {
    expect(briefThresholds(lines, mechanisms.steam)).toEqual([1, 1, 1, 1]);
  });""")
s = s.replace("""} from "./brief";
""", """} from "./brief";
import { loadStory } from "./loader";
""", 1)
open(p, 'w').write(s)
