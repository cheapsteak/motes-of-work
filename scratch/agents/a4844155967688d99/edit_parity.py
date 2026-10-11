import sys

root = sys.argv[1]


def edit(path, pairs):
    p = f'{root}/{path}'
    s = open(p).read()
    for old, new in pairs:
        if s.count(old) != 1:
            raise SystemExit(f'{path}: expected one match for {old[:60]!r}, found {s.count(old)}')
        s = s.replace(old, new)
    open(p, 'w').write(s)


edit('src/parity/fields.ts', [
    ("import type { NodeOut } from '../scene/node/node';\n",
     "import type { NodeOut } from '../scene/node/node';\nimport type { Vec3 } from '../math/vec';\n"),
    ("const GLSL_TYPE_OF_SIZE",
     """/** What the orbit parity mode (`?lib=orbit`) computes per (body row, ambient): orbit.glsl's bodyWorld(). */
export interface OrbitOut {
  bodyWorld: Vec3;
}

/**
 * What the orbit parity mode compares: bodyWorld's xyz. The orbit parity shader's OrbitOut struct is
 * generated from this list (glslOrbitOutStruct).
 */
export const ORBIT_PARITY_FIELDS: readonly ParityField<OrbitOut>[] = [{ name: 'bodyWorld', size: 3 }];

const GLSL_TYPE_OF_SIZE"""),
    ("/** A field placed in a pass",
     """/** The GLSL OrbitOut struct, from ORBIT_PARITY_FIELDS. */
export function glslOrbitOutStruct(): string {
  return glslOutStruct('OrbitOut', 'ORBIT_PARITY_FIELDS', ORBIT_PARITY_FIELDS);
}

/** A field placed in a pass"""),
])

edit('src/parity/shaders.ts', [
    ("""import { BOX_INCLUDE_MARKER, NODE_INCLUDE_MARKER } from '../scene/node/shaderSource';
import { BOX_PARITY_FIELDS, glslPassOutput, NODE_PARITY_FIELDS, parityPasses, type PlacedField } from './fields';""",
     """import { BOX_INCLUDE_MARKER, NODE_INCLUDE_MARKER, ORBIT_INCLUDE_MARKER } from '../scene/node/shaderSource';
import {
  BOX_PARITY_FIELDS,
  glslOrbitOutStruct,
  glslPassOutput,
  NODE_PARITY_FIELDS,
  ORBIT_PARITY_FIELDS,
  parityPasses,
  type PlacedField,
} from './fields';"""),
    ("""/**
 * Hash check, per instance.""",
     """/**
 * The orbit library (`?lib=orbit`): bodyWorld() at a body row and an ambient time per instance, over
 * the bodies texture, as the galaxy's vertex shaders will call it. Carries the orbit include marker:
 * build with withOrbitLibrary().
 */
export const ORBIT_VERTEX = /* glsl */ `
precision highp float;
precision highp int;

${ORBIT_INCLUDE_MARKER}

${glslOrbitOutStruct()}

in vec3 position; // the single non-instanced vertex, at the origin
in vec2 aRowT; // the body's row, the ambient time
uniform int uPass;
flat out vec4 vOut;

void main() {
  OrbitOut o;
  o.bodyWorld = bodyWorld(int(round(aRowT.x)), aRowT.y);
  ${passSelect(parityPasses(ORBIT_PARITY_FIELDS))}
  else vOut = vec4(0.0);
${PLACE_ON_TEXEL}
}
`;

/**
 * Hash check, per instance."""),
])

edit('src/parity/parity.ts', [
    ("""// `?lib=box` compares the cubes' bodies' box() (src/scene/node/box.ts) likewise, crack and all.
""",
     """// `?lib=box` compares the cubes' bodies' box() (src/scene/node/box.ts) likewise, crack and all.
// `?lib=orbit` compares the galaxy's bodyWorld() (src/scene/node/orbit.ts) over the bodies texture,
// at sampled bodies and ambient times.
"""),
    ("import { ACTIVE_MECHANISM, MOTE_SEED } from '../config';",
     "import { ACTIVE_MECHANISM, MOTE_BUDGET_DESKTOP, MOTE_SEED } from '../config';\nimport { galaxyBudget, generateGalaxy, type Galaxy } from '../galaxy/generate';"),
    ("import { packNodeData, TEXELS } from '../scene/node/nodeData';",
     "import { packNodeData, TEXELS } from '../scene/node/nodeData';\nimport { BODY_TEXELS, packBodyData } from '../scene/node/bodyData';\nimport { bodyWorld } from '../scene/node/orbit';"),
    ("import { withBoxLibrary, withNodeLibrary } from '../scene/node/shaderSource';",
     "import { withBoxLibrary, withNodeLibrary, withOrbitLibrary } from '../scene/node/shaderSource';"),
    ("import { BOX_PARITY_FIELDS, fieldValues, NODE_PARITY_FIELDS, parityPasses } from './fields';",
     "import { BOX_PARITY_FIELDS, fieldValues, NODE_PARITY_FIELDS, ORBIT_PARITY_FIELDS, parityPasses, type OrbitOut } from './fields';"),
    ("import { BOX_VERTEX, HASH_VERTEX, MOTE_VERTEX, NODE_VERTEX, PARITY_FRAGMENT, PARITY_SIZE } from './shaders';",
     "import { BOX_VERTEX, HASH_VERTEX, MOTE_VERTEX, NODE_VERTEX, ORBIT_VERTEX, PARITY_FRAGMENT, PARITY_SIZE } from './shaders';"),
    ("type Lib = 'mote' | 'node' | 'box';", "type Lib = 'mote' | 'node' | 'box' | 'orbit';\nconst LIBS: readonly Lib[] = ['mote', 'node', 'box', 'orbit'];"),
    ("""  } else if (lib === 'box') {
    // --- box(): every BoxOut field compared with the TS reference, over the essay's network. ---
    for (const c of boxCases(draw)) cases.push(c);
  } else {""",
     """  } else if (lib === 'box') {
    // --- box(): every BoxOut field compared with the TS reference, over the essay's network. ---
    for (const c of boxCases(draw)) cases.push(c);
  } else if (lib === 'orbit') {
    // --- bodyWorld(): every OrbitOut field compared with the TS reference, over the essay's galaxy. ---
    for (const c of orbitCases(draw)) cases.push(c);
  } else {"""),
    ("""function report(cases: ParityCase[], error?: string): void {""",
     """/** The ambient times the orbit cases sample (s): the start, revision 2's pose, two more, and an hour less a tenth. */
const ORBIT_TIMES = [0, 37.3, 101, 953, 3599.9];
/** Rows drawn by hash on top of the named ones. */
const ORBIT_HASHED_ROWS = 32;

/**
 * The orbit sample: N0 (the origin), C1 and its six moons, P1 (C1's star), R0 and R1 in the core,
 * and ORBIT_HASHED_ROWS rows by hash over every body, at every one of ORBIT_TIMES.
 */
function orbitSample(g: Galaxy): number[] {
  const named = ['N0', 'C1', 'P1', 'R0', 'R1'].map((id) => g.ids[id]);
  const c1Moons = g.bodies.filter((b) => b.kind === 'moon' && b.host === g.ids.C1).map((b) => b.index);
  if (c1Moons.length !== 6) throw new Error(`orbit parity: C1 has ${c1Moons.length} moons, not 6`);
  const hashed = Array.from({ length: ORBIT_HASHED_ROWS }, (_, i) => pcg(i + 1) % g.bodies.length);
  return [named[0], named[1], ...c1Moons, ...named.slice(2), ...hashed];
}

function orbitCases(draw: Draw): ParityCase[] {
  const g = generateGalaxy(MOTE_SEED, 'desktop', galaxyBudget(MOTE_BUDGET_DESKTOP));
  const data = packBodyData(g);
  const rows = orbitSample(g);
  const set = ORBIT_TIMES.flatMap((t) => rows.map((row) => [row, t] as const));
  if (set.length > COUNT) throw new Error(`orbit parity: ${set.length} samples exceed the ${COUNT}-texel target`);
  const geometry = pointsGeometry(set.length);
  geometry.setAttribute('aRowT', new InstancedBufferAttribute(new Float32Array(set.flat()), 2));
  const bodiesTex = floatTexture(data.bodies, BODY_TEXELS, data.bodyCount);
  const uniforms: Record<string, IUniform> = {
    uBodies: { value: bodiesTex },
    uN0Row: { value: data.n0Row },
    uPass: { value: 0 },
  };
  const mat = material(withOrbitLibrary(ORBIT_VERTEX), PARITY_FRAGMENT, uniforms);
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
  return ORBIT_TIMES.map((t) => ({ name: `orbit: bodyWorld at ${t} s`, maxError: err.get(t)! }));
}

function report(cases: ParityCase[], error?: string): void {"""),
    ("""  report(run(lib === 'node' || lib === 'box' ? lib : 'mote'));""",
     """  report(run(LIBS.find((l) => l === lib) ?? 'mote'));"""),
])
