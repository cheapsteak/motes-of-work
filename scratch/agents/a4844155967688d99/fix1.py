import sys

root = sys.argv[1]


def edit(path, pairs):
    p = f'{root}/{path}'
    s = open(p).read()
    for old, new in pairs:
        if s.count(old) != 1:
            raise SystemExit(f'{path}: expected one match for {old[:70]!r}, found {s.count(old)}')
        s = s.replace(old, new)
    open(p, 'w').write(s)


edit('src/scene/node/orbit.glsl', [
    ("""// RGBA32F, NEAREST, six texels a row, one row per body (bodyData.ts).
uniform highp sampler2D uBodies;""",
     """// RGBA32F, NEAREST, six texels a row, one row per body (bodyData.ts). Named for the texture, not
// `uBodies`: the reflow's per-part uniform array in mote.glsl, spliced in ahead of this, takes that.
uniform highp sampler2D uBodyTex;"""),
    ("return texelFetch(uBodies, ivec2(t, row), 0);", "return texelFetch(uBodyTex, ivec2(t, row), 0);"),
    ("""// The galaxy's rigid turn at ambient t, in radians.
float galaxyTurn(float t) {
  return ORBIT_TAU * t / GALAXY_TURN_PERIOD;
}""",
     """// The galaxy's rigid turn at ambient t, in radians, reduced to one turn.
float galaxyTurn(float t) {
  return ORBIT_TAU * orbitTurns(t, GALAXY_TURN_PERIOD);
}"""),
])

edit('src/scene/node/orbit.ts', [
    ("""// The angles are reduced to one turn before they are scaled to radians (orbitTurns): with a moon's
// 6 s period, 2π t / P at an hour is a thousand radians, and float32 would lose a thousandth of a
// radian of it. `mod(t, P) / P` keeps the remainder to float32's precision of `t` itself, and is the
// same angle to within whole turns, so M and ω are §12.1's formulas exactly.""",
     """// Every angle (M, ω and the galaxy's turn) is reduced to one turn before it is scaled to radians
// (orbitTurns): with a moon's 6 s period, 2π t / P at an hour is a thousand radians, and float32
// would lose a thousandth of a radian of it; the turn is small by comparison, but it swings points a
// hundred units from N0, so a day in its unreduced float32 angle is off by several thousandths of a
// unit. `mod(t, P) / P` keeps the remainder to float32's precision of `t` itself, and is the same
// angle to within whole turns, so M, ω and the turn are §12.1's and §2.1's formulas exactly."""),
    ("""/** The galaxy's rigid turn at ambient `t`, in radians: 2π t / GALAXY_TURN_PERIOD. */
export function galaxyTurn(t: number): number {
  return (TAU * t) / GALAXY_TURN_PERIOD;
}""",
     """/** The galaxy's rigid turn at ambient `t`, in radians: 2π t / GALAXY_TURN_PERIOD, reduced to one turn, in [0, 2π). */
export function galaxyTurn(t: number): number {
  return TAU * orbitTurns(t, GALAXY_TURN_PERIOD);
}"""),
    ("""/** Row `row`'s orbital elements as the texture holds them (T1, T2). */
function elementsAt(""",
     """/** Row `row`'s orbital elements as the texture holds them (T1, T2): what both mirrors read. */
export function elementsAt("""),
])

edit('src/parity/parity.ts', [
    ("    uBodies: { value: bodiesTex },", "    uBodyTex: { value: bodiesTex },"),
    ("""/** The ambient times the orbit cases sample (s): the start, revision 2's pose, two more, and an hour less a tenth. */
const ORBIT_TIMES = [0, 37.3, 101, 953, 3599.9];""",
     """/**
 * The ambient times the orbit cases sample (s): the start, revision 2's pose, two more, an hour less
 * a tenth, and a day, where an angle not reduced to one turn would show (the galaxy's turn is 72
 * turns in by then, swinging points a hundred units from N0).
 */
const ORBIT_TIMES = [0, 37.3, 101, 953, 3599.9, 86_400];"""),
    # One draw per time: six times of the sample overflow the 256-texel target in one.
    ("""  const rows = orbitSample(g);
  const set = ORBIT_TIMES.flatMap((t) => rows.map((row) => [row, t] as const));
  if (set.length > COUNT) throw new Error(`orbit parity: ${set.length} samples exceed the ${COUNT}-texel target`);
  const geometry = pointsGeometry(set.length);
  geometry.setAttribute('aRowT', new InstancedBufferAttribute(new Float32Array(set.flat()), 2));
  const bodiesTex""",
     """  const rows = orbitSample(g);
  if (rows.length > COUNT) throw new Error(`orbit parity: ${rows.length} rows exceed the ${COUNT}-texel target`);
  const bodiesTex"""),
    ("""  const mat = material(withOrbitLibrary(ORBIT_VERTEX), PARITY_FRAGMENT, uniforms);
  const points = new Points(geometry, mat);
  points.frustumCulled = false; // positions come from gl_InstanceID
  const passes = parityPasses(ORBIT_PARITY_FIELDS);
  const outs = passes.map((_, pass) => {
    uniforms.uPass.value = pass;
    return draw(points);
  });
  // The TS reference reads the texture as the GPU does (float32 already) and the time as the
  // attribute carries it: float32.
  const err = new Map<number, number>(ORBIT_TIMES.map((t) => [t, 0]));
  set.forEach(([row, t], i) => {
    const want: OrbitOut = { bodyWorld: bodyWorld(data, row, Math.fround(t)) };
    passes.forEach((pass, j) => {
      for (const { field, offset } of pass) {
        fieldValues(want, field.name).forEach((v, q) => {
          const d = outs[j][i * 4 + offset + q] - v;
          err.set(t, Math.max(err.get(t)!, Number.isNaN(d) ? Infinity : Math.abs(d)));
        });
      }
    });
  });
  mat.dispose();
  geometry.dispose();
  bodiesTex.dispose();
  return ORBIT_TIMES.map((t) => ({ name: `orbit: bodyWorld at ${t} s`, maxError: err.get(t)! }));""",
     """  const mat = material(withOrbitLibrary(ORBIT_VERTEX), PARITY_FRAGMENT, uniforms);
  const passes = parityPasses(ORBIT_PARITY_FIELDS);
  // One draw per time, every sampled row in it.
  const cases = ORBIT_TIMES.map((t) => {
    const geometry = pointsGeometry(rows.length);
    geometry.setAttribute('aRowT', new InstancedBufferAttribute(new Float32Array(rows.flatMap((row) => [row, t])), 2));
    const points = new Points(geometry, mat);
    points.frustumCulled = false; // positions come from gl_InstanceID
    const outs = passes.map((_, pass) => {
      uniforms.uPass.value = pass;
      return draw(points);
    });
    geometry.dispose();
    // The TS reference reads the texture as the GPU does (float32 already) and the time as the
    // attribute carries it: float32.
    let err = 0;
    rows.forEach((row, i) => {
      const want: OrbitOut = { bodyWorld: bodyWorld(data, row, Math.fround(t)) };
      passes.forEach((pass, j) => {
        for (const { field, offset } of pass) {
          fieldValues(want, field.name).forEach((v, q) => {
            const d = outs[j][i * 4 + offset + q] - v;
            err = Math.max(err, Number.isNaN(d) ? Infinity : Math.abs(d));
          });
        }
      });
    });
    return { name: `orbit: bodyWorld at ${t} s`, maxError: err };
  });
  mat.dispose();
  bodiesTex.dispose();
  return cases;"""),
])

edit('e2e/parity.spec.ts', [
    ("""// at each sampled ambient time, up to an hour in (the moons' 6 s periods run 600 turns by then).
const ORBIT_TIMES = [0, 37.3, 101, 953, 3599.9];""",
     """// at each sampled ambient time, up to a day in (the moons' 6 s periods run 14,400 turns by then, and
// the galaxy's turn 72, swinging points a hundred units from N0: an unreduced angle shows there).
const ORBIT_TIMES = [0, 37.3, 101, 953, 3599.9, 86_400];"""),
])

edit('docs/superpowers/plans/2026-10-08-act-2-galaxy.md', [
    ("  GLSL: `vec3 bodyWorld(int row, float t)` reading `uBodies` with `texelFetch`, and `uN0Row`.",
     "  GLSL: `vec3 bodyWorld(int row, float t)` reading `uBodyTex` with `texelFetch`, and `uN0Row`. The streams texture's sampler is `uStreamTex` (both named for the texture, never `uBodies`, which Task 8's `uBodies[8]` in mote.glsl takes; the streams texture is `BODY_TEXELS` wide)."),
])

# The tests: the turn reduced, NODE_NEVER by name, the vacuous purity line gone, elementsAt shared.
edit('src/scene/node/orbit.test.ts', [
    ("import { GALAXY_TURN_PERIOD as SPLICED_TURN_PERIOD, ORBIT_CONSTANTS } from './birth';",
     "import { GALAXY_TURN_PERIOD as SPLICED_TURN_PERIOD, NODE_NEVER, ORBIT_CONSTANTS } from './birth';"),
    ("import { bodyGalactic, bodyWorld, GALAXY_TURN_PERIOD, galaxyTurn, keplerE, orbitLocal } from './orbit';",
     "import { bodyGalactic, bodyWorld, elementsAt, GALAXY_TURN_PERIOD, galaxyTurn, keplerE, orbitLocal } from './orbit';"),
    ("      expect(orbitLocal(o, 37.3)).toEqual(orbitLocal(o, 37.3));\n", ""),
    ("    expect(galaxyTurn(1200)).toBeCloseTo(TAU, 12);",
     "    // Reduced to one turn: a day in, the galaxy has turned 72 times and is back where it set out.\n    expect(galaxyTurn(1200)).toBe(0);\n    expect(galaxyTurn(86_400 + 300)).toBeCloseTo(Math.PI / 2, 9);\n    for (const t of [0, 599.9, 1199.9, 86_400 + 1199.9]) expect(galaxyTurn(t)).toBeGreaterThanOrEqual(0), expect(galaxyTurn(t)).toBeLessThan(TAU);"),
])
