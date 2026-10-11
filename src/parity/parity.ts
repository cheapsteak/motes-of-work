// GLSL ↔ TS parity through the production attribute path. Each mote is one instance of a
// gl.POINTS draw over the real InstancedBufferAttributes (layout.ts); the vertex shader carries the
// production library (withMoteLibrary: instanceAttrs() → mote()), places the instance on its own
// texel of a float target via gl_InstanceID, and hands the MoteOut fields to the fragment shader in
// a flat varying, one RGBA pass per parityPasses() group. The readback is compared with the TS
// reference mote() field by field (PARITY_FIELDS). The hash check is a points draw too, so the mote
// library only ever runs in a vertex shader (shaders.ts). Results land in `window.__parity` for e2e.
// `?lib=orbit` compares the galaxy's bodyWorld() (src/scene/node/orbit.ts) over the bodies texture,
// at sampled bodies and ambient times.
// `?lib=derp` compares the derps' derp() (src/scene/node/derp.ts) at sampled bodies' seeds, phases
// and sizes over ambient time, up to a time shift of a few float32 units of the ambient at a cut.
// `?lib=shell` compares the shells' shellWarpK() and spin (src/scene/node/shell.ts) over a planet's
// lattice, three hash sets and events, the seconds of a scatter, and two shapes in a row.
// `?lib=lod` compares the level of detail's lodGain() and glowPx() (src/scene/node/lod.ts), and the
// neighbourhood's dissolve (hoodGlowPx, hoodReal, hoodFar: the far sets' fade, hoodSkip), over a grid
// of every element's band and of a glow sprite's radius, distance, focal length and cap.
// `?lib=body` compares the galaxy's motes in motion, bodyMote() (src/scene/node/bodyMote.ts), over the
// shell and person motes' own attributes and the three textures: C1, its moons and P1 at the close
// shot's states, R0 at its fix, and 64 hashed motes, at the pose and at 101 s, every field, up to a
// time shift of a few float32 units of the ambient at a derp's cut.
// `?lib=star` compares a star's look (src/scene/node/star.ts): starDot() over every dot index of four
// seeds, starSpike() over every row and dot at five glow sizes and both spike counts, starBreath() at
// four ambients and starTint() over the temperatures.
// `?lib=freeze` compares the freeze frame's dressing (src/scene/node/freeze.ts): the copies, the limb,
// every mote of both bursts at four states of the fix and both of the twos' length sets, and the breath.
import {
  BufferAttribute,
  DataTexture,
  FloatType,
  GLSL3,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  NearestFilter,
  NoBlending,
  type Object3D,
  OrthographicCamera,
  Vector4,
  Points,
  RawShaderMaterial,
  RGBAFormat,
  Scene,
  WebGLRenderer,
  WebGLRenderTarget,
  type IUniform,
} from 'three';
import { hash01, pcg } from '../math/hash';
import { SALT } from '../math/salts';
import { ACTIVE_MECHANISM, MOTE_BUDGET_DESKTOP, MOTE_SEED } from '../config';
import { galaxyBudget, generateGalaxy, type Body, type Galaxy } from '../galaxy/generate';
import { mechanisms } from '../mechanisms';
import type { Mechanism } from '../mechanisms/types';
import { buildMoteAttrs, type MoteAttrs } from '../scene/mote/attributes';
import { instancedAttributes } from '../scene/mote/layout';
import { groupCounts, mote, reflowBodies, reflowKeep, type ReflowHome } from '../scene/mote/mote';
import { partGroups } from '../mechanisms/bike/partGroups';
import { packPartTexture, partTransforms } from '../scene/mote/partTransforms';
import { withMoteLibrary } from '../scene/mote/shaderSource';
import { BAND_MARGIN_PX, EQ_A, NODE_DERP_DUR, NODE_DERP_PERIOD, SCATTER_AMP, SCATTER_MOON_CAP, TEXT_BAND } from '../scene/node/birth';
import { derp, derpEvent, DerpKind, type Derp } from '../scene/node/derp';
import { BODY_KIND, BODY_TEXELS, packBodyData } from '../scene/node/bodyData';
import { buildTrackAttrs, packShellData, SHELL_TEXELS } from '../scene/node/bodyAttrs';
import { bodyMote, trackLampGain, type BodyMoteAttrs } from '../scene/node/bodyMote';
import { feedGain, streamBandMask, streamDot, streamGain } from '../scene/node/stream';
import { AMBIENT_POSE } from '../galaxy/ambient';
import { bodyWorld } from '../scene/node/orbit';
import { withDerpLibrary, withFreezeLibrary, withGalaxyLibrary, withLodLibrary, withOrbitLibrary, withShellLibrary, withStarLibrary } from '../scene/node/shaderSource';
import { starBreath, starDot, starSpike, starTint } from '../scene/node/star';
import { STAR_DOTS } from '../scene/node/classLook';
import type { StarLook } from '../galaxy/body';
import { freezeBreath, freezeCopy, freezeLimb, freezeTick, freezeTickShow, freezeTickWarm, type FreezeCopyIndex } from '../scene/node/freeze';
import { FREEZE_LIMB_LIGHT, FREEZE_TICK_MOON, FREEZE_TICK_PLANET } from '../scene/node/birth';
import {
  glowPx,
  hoodFar,
  hoodGlowPx,
  hoodReal,
  hoodSkip,
  LOD_BANDS,
  LOD_COUNT as LOD_BANDS_COUNT,
  lodGain,
  lodSkip,
  moonPointPx,
  moonSphereGain,
  motePx,
  offScreenReachPx,
  offScreenSkip,
  type LodElement,
} from '../scene/node/lod';
import { latticeLL, moteHashes, shapeAt, shapeUniforms, shellK, shellSeed, shellWarp, spinAxis, spinShell, type ShellEvent } from '../scene/node/shell';
import { latticeCount } from '../galaxy/body';
import { defaultSceneState, mergeState, type SceneState } from '../timeline/sceneState';
import {
  BODY_PARITY_FIELDS,
  DERP_PARITY_FIELDS,
  fieldValues,
  FREEZE_PARITY_FIELDS,
  LOD_PARITY_FIELDS,
  ORBIT_PARITY_FIELDS,
  parityPasses,
  SHELL_PARITY_FIELDS,
  STAR_PARITY_FIELDS,
  STREAM_PARITY_FIELDS,
  type FreezeOut,
  type LodOut,
  type OrbitOut,
  type ShellOut,
  type StarOut,
  type StreamOut,
} from './fields';
import { allBodyMoteAttrs, BODY_AMBIENTS, BODY_CASES, sysPxAll } from './bodyCases';
import {
  BODY_VERTEX,
  STREAM_DOT_VERTEX,
  TRACK_LAMP_VERTEX,
  DERP_VERTEX,
  FREEZE_VERTEX,
  HASH_VERTEX,
  LOD_VERTEX,
  MOTE_VERTEX,
  ORBIT_VERTEX,
  PARITY_FRAGMENT,
  PARITY_SIZE,
  SHELL_VERTEX,
  STAR_VERTEX,
} from './shaders';

interface ParityCase {
  name: string;
  maxError: number;
  /** How many samples the case compares (the derp cases). */
  samples?: number;
  /** Of those, how many matched the TS only a time shift away, at a cut (the derp cases). */
  shifted?: number;
}

declare global {
  interface Window {
    __parity?: { cases: ParityCase[]; error?: string };
  }
}

const SIZE = PARITY_SIZE;
const COUNT = SIZE * SIZE;
const PASSES = parityPasses();

// Golden values computed independently (BigInt) in the hash unit tests.
const PCG_GOLDENS: [number, number][] = [
  [0, 129708002],
  [1, 2831084092],
  [12345, 4099845390],
];

function floatTexture(data: Float32Array, width: number, height: number): DataTexture {
  const tex = new DataTexture(data, width, height, RGBAFormat, FloatType);
  tex.minFilter = NearestFilter;
  tex.magFilter = NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

function partTexture(rows: Float32Array[]): DataTexture {
  const width = rows[0].length / 4;
  const data = new Float32Array(rows.length * rows[0].length);
  rows.forEach((r, i) => data.set(r, i * r.length));
  return floatTexture(data, width, rows.length);
}

function material(vertexShader: string, fragmentShader: string, uniforms: Record<string, IUniform>): RawShaderMaterial {
  return new RawShaderMaterial({
    glslVersion: GLSL3,
    vertexShader,
    fragmentShader,
    uniforms,
    blending: NoBlending,
    depthTest: false,
    depthWrite: false,
  });
}

/** A points geometry of `count` instances over the one non-instanced vertex a points draw needs. */
function pointsGeometry(count: number): InstancedBufferGeometry {
  const geometry = new InstancedBufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(3), 3));
  geometry.instanceCount = count;
  return geometry;
}

/** Render one object into the SIZE×SIZE float target and read it back. */
type Draw = (object: Object3D) => Float32Array;

type Lib = 'mote' | 'orbit' | 'derp' | 'shell' | 'lod' | 'body' | 'freeze' | 'star';
const LIBS: readonly Lib[] = ['mote', 'orbit', 'derp', 'shell', 'lod', 'body', 'freeze', 'star'];

function run(lib: Lib): ParityCase[] {
  const canvas = document.getElementById('gl') as HTMLCanvasElement;
  const renderer = new WebGLRenderer({ canvas });
  let shaderError: string | null = null;
  renderer.debug.onShaderError = (gl, _program, vs, fs) => {
    shaderError = `${gl.getShaderInfoLog(vs) ?? ''}\n${gl.getShaderInfoLog(fs) ?? ''}`.trim();
  };

  const target = new WebGLRenderTarget(SIZE, SIZE, {
    type: FloatType,
    format: RGBAFormat,
    minFilter: NearestFilter,
    magFilter: NearestFilter,
    depthBuffer: false,
  });
  const camera = new OrthographicCamera();
  const scene = new Scene();

  const draw: Draw = (object) => {
    scene.add(object);
    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    scene.remove(object);
    if (shaderError !== null) throw new Error(`shader compile failed: ${shaderError}`);
    const out = new Float32Array(COUNT * 4);
    renderer.readRenderTargetPixels(target, 0, 0, SIZE, SIZE, out);
    return out;
  };

  const cases: ParityCase[] = [];

  // --- Hash: hash01 to float32 rounding, pcg bit-exact against goldens. Mechanism-independent; the
  // active mechanism's point seeds are a realistic spread of inputs, under every registered salt. ---
  const salts: number[] = Object.values(SALT);
  const hashPairs: [number, number][] = mechanisms[ACTIVE_MECHANISM]
    .samplePoints(COUNT, 7)
    .map((p, i) => [p.seed, salts[i % salts.length]]);
  // Edge seeds and salts, including the largest seed that survives a float attribute.
  hashPairs.splice(
    0,
    8,
    [0, 0],
    [0, 12],
    [1, 1],
    [0xffffff, 1],
    [0xffffff, 12],
    [0xabcdef, 255],
    [12345, 7],
    [0x800000, 3],
  );
  const hashIn = new Float32Array(COUNT * 4);
  hashPairs.forEach(([seed, salt], i) =>
    hashIn.set([seed, salt, i < PCG_GOLDENS.length ? PCG_GOLDENS[i][0] : 0, 0], i * 4),
  );
  const hashGeometry = pointsGeometry(COUNT);
  hashGeometry.setAttribute('aHashIn', new InstancedBufferAttribute(hashIn, 4));
  const hashMat = material(HASH_VERTEX, PARITY_FRAGMENT, {});
  const hashPoints = new Points(hashGeometry, hashMat);
  hashPoints.frustumCulled = false; // positions come from gl_InstanceID
  const hashOut = draw(hashPoints);
  hashGeometry.dispose();
  hashMat.dispose();
  let hashErr = 0;
  hashPairs.forEach(([seed, salt], i) => {
    hashErr = Math.max(hashErr, Math.abs(hashOut[i * 4] - hash01(seed, salt)));
  });
  cases.push({ name: 'hash01', maxError: hashErr });
  let pcgErr = 0;
  PCG_GOLDENS.forEach(([input, golden], i) => {
    if (pcg(input) !== golden) throw new Error(`TS pcg(${input}) disagrees with its golden`);
    const got = hashOut[i * 4 + 1] * 65536 + hashOut[i * 4 + 2];
    pcgErr = Math.max(pcgErr, Math.abs(got - golden));
  });
  cases.push({ name: 'pcg goldens', maxError: pcgErr });

  if (lib === 'orbit') {
    // --- bodyWorld(): every OrbitOut field compared with the TS reference, over the essay's galaxy. ---
    for (const c of orbitCases(draw)) cases.push(c);
  } else if (lib === 'derp') {
    // --- derp(): every Derp field compared with the TS reference, over sampled bodies and times. ---
    for (const c of derpCases(draw)) cases.push(c);
  } else if (lib === 'shell') {
    // --- shellWarpK() and the spin: every ShellOut field compared with the TS reference. ---
    for (const c of shellCases(draw)) cases.push(c);
  } else if (lib === 'lod') {
    // --- lodGain() and glowPx(): every LodOut field compared with the TS reference, over a grid. ---
    for (const c of lodCases(draw)) cases.push(c);
  } else if (lib === 'body') {
    // --- bodyMote(): every BodyMoteOut field compared with the TS reference, over sampled motes and states. ---
    for (const c of bodyCases(draw)) cases.push(c);
  } else if (lib === 'star') {
    // --- starDot(), starSpike(), starBreath(), starTint(): every StarOut field compared with the TS reference. ---
    for (const c of starCases(draw)) cases.push(c);
  } else if (lib === 'freeze') {
    // --- The freeze frame's dressing: every FreezeOut field compared with the TS reference, over a grid. ---
    cases.push(freezeCase(draw));
  } else {
    // --- mote(): every MoteOut field compared with the TS reference, for every registered mechanism. ---
    for (const [id, mech] of Object.entries(mechanisms) as [string, Mechanism][]) {
      for (const c of moteCases(id, mech, draw)) cases.push(c);
    }
  }

  target.dispose();
  renderer.dispose();
  return cases;
}

let essay: Galaxy | null = null;
/** The essay's galaxy, built once: where the mote cases' reflow carries the motes. */
function essayGalaxy(): Galaxy {
  essay ??= generateGalaxy(MOTE_SEED, 'desktop', galaxyBudget(MOTE_BUDGET_DESKTOP));
  return essay;
}

const allFaults = (x: number) => ({ misalign: x, slip: x, bind: x, jitter: x, ratio: x, stall: x, drift: x });

interface MoteCase {
  name: string;
  state: unknown;
  copy?: number;
  /** Every mote's twin normal is the negated normal, so the variant blend passes through zero. */
  oppositeNormals?: boolean;
}

const MOTE_CASES: MoteCase[] = [
  { name: 'assembly 0', state: { mech: { assembly: 0 } } },
  { name: 'assembly 0.5', state: { mech: { assembly: 0.5 } } },
  { name: 'assembly 1', state: { mech: { assembly: 1 } } },
  { name: 'variant 0.5', state: { mech: { variant: 0.5 } } },
  // Review focus 2: at variant 0.5 the blended normal is exactly zero for every mote, and both sides
  // must fall back to the correct normal (no NaN). Posed mid-drive so the part rotation is not identity.
  { name: 'opposite normals at variant 0.5', state: { mech: { variant: 0.5, drive: 0.29 } }, oppositeNormals: true },
  { name: 'drift 1 at drive 0.37', state: { mech: { drive: 0.37, faults: { drift: 1 } } } },
  { name: 'vibed 0.5 + misallocated 0.3', state: { provenance: { vibed: 0.5, misallocated: 0.3 } } },
  // Every mote in one scenario, so each visibility bit is read for every mote (specced is the default).
  { name: 'vibed 1', state: { provenance: { vibed: 1 } } },
  { name: 'misallocated 1', state: { provenance: { misallocated: 1 } } },
  { name: 'all faults 0.6 at drive 0.71', state: { mech: { drive: 0.71, faults: allFaults(0.6) } } },
  {
    name: 'copy row 1',
    state: { mech: { assembly: 0.7, drive: 0.2, faults: { misalign: 0.4, drift: 0.5 } } },
    copy: 1,
  },
  // Act II's reflow onto the bike's planet and its moons (every case above is at reflow 0): half way,
  // riding, as it puffs out (the basket's motes still behind the rest); half way with the drift and a
  // flight still landing; and all the way. The bodies are the essay galaxy's at the pose (reflowBodies).
  { name: 'reflow 0.5 at drive 1.6', state: { mech: { reflow: 0.5, drive: 1.6 } } },
  { name: 'reflow 0.5 mid-flight, drifting', state: { mech: { reflow: 0.5, assembly: 0.6, drive: 0.5, faults: { drift: 0.7 } } } },
  { name: 'reflow 1 at drive 1.9', state: { mech: { reflow: 1, drive: 1.9 } } },
];

/**
 * The first eight motes take the eight visibility combinations, so with the single-scenario cases
 * every visibility bit is unpacked as both 0 and 1, whatever the mechanism samples.
 */
function withEveryVisibility(attrs: MoteAttrs[]): MoteAttrs[] {
  return attrs.map((a, i) => (i < 8 ? { ...a, visible: [(i & 1) !== 0, (i & 2) !== 0, (i & 4) !== 0] } : a));
}

/** The same motes with each twin normal pointing opposite its normal. */
function withOppositeNormals(attrs: MoteAttrs[]): MoteAttrs[] {
  return attrs.map((a) => ({ ...a, normalTwin: [-a.normal[0], -a.normal[1], -a.normal[2]] }));
}

/** Every mote case for one mechanism, named `<id>: <case>`. */
function moteCases(id: string, mech: Mechanism, draw: Draw): ParityCase[] {
  const cases: ParityCase[] = [];
  const g = essayGalaxy();
  const attrs = withEveryVisibility(buildMoteAttrs(mech, mech.samplePoints(COUNT, 7)));
  const bodies = reflowBodies(g, packBodyData(g), AMBIENT_POSE);
  const groups = partGroups(mech);
  const home: ReflowHome = { bodies, groups, keep: reflowKeep(bodies, groupCounts(groups, attrs.filter((a) => a.visible[0]))) };
  if (attrs.length > COUNT) throw new Error(`${id}: ${attrs.length} motes exceed the ${COUNT}-texel target`);
  const opposite = withOppositeNormals(attrs);

  // The production instanced attributes, plus the one non-instanced vertex a points draw needs.
  const geometryOf = (set: MoteAttrs[]): InstancedBufferGeometry => {
    const g = pointsGeometry(set.length);
    for (const [name, attr] of Object.entries(instancedAttributes(set))) g.setAttribute(name, attr);
    return g;
  };
  const geometry = geometryOf(attrs);
  const oppositeGeometry = geometryOf(opposite);

  const uniforms: Record<string, IUniform> = {
    uParts: { value: null },
    uCopy: { value: 0 },
    uPass: { value: 0 },
    uAssembly: { value: 0 },
    uVariant: { value: 0 },
    uDrive: { value: 0 },
    uDrift: { value: 0 },
    uVibed: { value: 0 },
    uMisallocated: { value: 0 },
    uReflow: { value: 0 },
    uBodies: { value: home.bodies.map((b) => new Vector4(...b)) },
    uReflowKeep: { value: [...home.keep] },
  };
  const moteMat = material(withMoteLibrary(MOTE_VERTEX), PARITY_FRAGMENT, uniforms);
  const points = new Points(geometry, moteMat);
  const oppositePoints = new Points(oppositeGeometry, moteMat);
  points.frustumCulled = false; // positions come from gl_InstanceID
  oppositePoints.frustumCulled = false;
  // A different pose in row 0 so reading the wrong copy row shows up as an error.
  const decoy = packPartTexture(
    partTransforms(mech, mergeState(defaultSceneState(), { mech: { assembly: 0, drive: 0.5 } })),
  );

  for (const c of MOTE_CASES) {
    const s: SceneState = mergeState(defaultSceneState(), c.state);
    const set = c.oppositeNormals ? opposite : attrs;
    const xf = partTransforms(mech, s);
    const packed = packPartTexture(xf, home.groups);
    const copy = c.copy ?? 0;
    const rows = copy === 0 ? [packed] : [decoy, packed];
    const partTex = partTexture(rows);
    // Assign values in place: three keeps references to these uniform objects.
    uniforms.uParts.value = partTex;
    uniforms.uCopy.value = copy;
    uniforms.uAssembly.value = s.mech.assembly;
    uniforms.uVariant.value = s.mech.variant;
    uniforms.uDrive.value = s.mech.drive;
    uniforms.uDrift.value = s.mech.faults.drift;
    uniforms.uVibed.value = s.provenance.vibed;
    uniforms.uMisallocated.value = s.provenance.misallocated;
    uniforms.uReflow.value = s.mech.reflow;
    const outs = PASSES.map((_, pass) => {
      uniforms.uPass.value = pass;
      return draw(c.oppositeNormals ? oppositePoints : points);
    });
    partTex.dispose();

    let err = 0;
    set.forEach((a, i) => {
      const want = mote(a, s, xf, home);
      PASSES.forEach((pass, j) => {
        for (const { field, offset } of pass) {
          fieldValues(want, field.name).forEach((v, k) => {
            const d = outs[j][i * 4 + offset + k] - v;
            err = Math.max(err, Number.isNaN(d) ? Infinity : Math.abs(d));
          });
        }
      });
    });
    cases.push({ name: `${id}: ${c.name}`, maxError: err });
  }
  moteMat.dispose();
  geometry.dispose();
  oppositeGeometry.dispose();
  return cases;
}

/**
 * The ambient times the orbit cases sample (s): the start, revision 2's pose, two more, an hour less
 * a tenth, and a day, where an angle not reduced to one turn would show (the galaxy's turn is 72
 * turns in by then, swinging points a hundred units from N0).
 */
const ORBIT_TIMES = [0, 37.3, 101, 953, 3599.9, 86_400];
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
  if (rows.length > COUNT) throw new Error(`orbit parity: ${rows.length} rows exceed the ${COUNT}-texel target`);
  const bodiesTex = floatTexture(data.bodies, BODY_TEXELS, data.bodyCount);
  const uniforms: Record<string, IUniform> = {
    uBodyTex: { value: bodiesTex },
    uN0Row: { value: data.n0Row },
    uPass: { value: 0 },
  };
  const mat = material(withOrbitLibrary(ORBIT_VERTEX), PARITY_FRAGMENT, uniforms);
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
  return cases;
}

/** The derp grid: every DERP_GRID_STEP s over [0, DERP_GRID_END) s, at v = 1. */
const DERP_GRID_STEP = 0.0137;
const DERP_GRID_END = 20;
/**
 * And each kind's first DERP_EVENTS_PER_KIND events at every s of DERP_EVENT_S, at each v of
 * DERP_EVENT_V, so every kind is sampled across its profile (the skip's ease, snap and ring, the
 * stall's hold and catch-up, the burst's tremble third) whatever the grid happens to catch. An
 * event is looked for in the first DERP_EVENT_SLOTS slots, and the page fails if one is missing.
 */
const DERP_EVENTS_PER_KIND = 2;
const DERP_EVENT_S = [0.1, 0.3, 0.5, 0.65, 0.85];
const DERP_EVENT_V = [1, 0.37, 0];
const DERP_EVENT_SLOTS = 2000;

interface DerpSample {
  seed: number;
  phase: number;
  t: number;
  kind: Body['kind'];
  r: number;
  R: number;
  omega: number;
  v: number;
}

/**
 * The bodies the derp cases sample, by case name: C1 (a planet), its first moon, P1 (its star) and
 * R0 (the source, in the core), all on R0's seed with their own phases, and a healthy planet, whose
 * seed is NODE_NEVER.
 */
function derpBodies(g: Galaxy): [string, Body][] {
  const byId = (id: string) => g.bodies[g.ids[id]];
  const moon = g.bodies.find((b) => b.kind === 'moon' && b.host === g.ids.C1);
  const healthy = g.bodies.find((b) => b.kind === 'planet' && !b.cracked);
  if (moon === undefined || healthy === undefined) throw new Error('derp parity: no C1 moon or no healthy planet');
  return [
    ['C1 (planet)', byId('C1')],
    [`${moon.id} (moon)`, moon],
    ['P1 (star)', byId('P1')],
    ['R0 (core)', byId('R0')],
    ['a healthy planet', healthy],
  ];
}

/** A body's derp samples: the grid, then (if it derps) each kind's first events across their profile, as float32 attributes carry them. */
function derpSamples(b: Body): DerpSample[] {
  const f = Math.fround;
  const base = {
    seed: b.derpSeed,
    phase: f(b.derpPhase),
    kind: b.kind,
    r: f(b.orbit?.a ?? 0),
    R: f(b.R),
    omega: f(b.orbit ? (2 * Math.PI) / b.orbit.period : 0),
  };
  const out: DerpSample[] = [];
  for (let i = 0; i * DERP_GRID_STEP < DERP_GRID_END; i++) out.push({ ...base, t: f(i * DERP_GRID_STEP), v: 1 });
  if (!b.cracked) return out;
  for (let kind = 0; kind <= DerpKind.Wobble; kind++) {
    let found = 0;
    for (let k = 0; found < DERP_EVENTS_PER_KIND && k < DERP_EVENT_SLOTS; k++) {
      const ev = derpEvent(base.seed, base.phase, (k - base.phase) * NODE_DERP_PERIOD + NODE_DERP_PERIOD / 2);
      if (ev.kind !== kind || ev.t0 < 0) continue;
      found++;
      for (const s of DERP_EVENT_S) for (const v of DERP_EVENT_V) out.push({ ...base, t: f(ev.t0 + s * NODE_DERP_DUR), v: f(v) });
    }
    if (found < DERP_EVENTS_PER_KIND)
      throw new Error(`derp parity: ${b.id} has ${found} ${DerpKind[kind]} events in ${DERP_EVENT_SLOTS} slots`);
  }
  return out;
}

/** One float32 unit of `t` (its last place), at least the smallest normal's. */
function ulp32(t: number): number {
  return t > 0 ? 2 ** (Math.floor(Math.log2(t)) - 23) : 2 ** -126;
}

/**
 * The derp cases, one per sampled body. Every term but the tremble and the eased kinds is a hard cut
 * in time (the schedule's edges, the burst's slots and holds, the jitter's ticks, the quantised
 * clock), and float32 rounds the ambient and the event's own time by a few units of their last
 * place, so at a sample that close to a cut the GLSL can stand on the cut's other side. A sample is
 * therefore compared with the TS at `t` and at `t ± 16 ulp(t)`, and scores the closest; the case
 * counts those that needed the shift (`shifted`), which the e2e test bounds. A mirror that differs
 * anywhere else is off by far more than 16 ulp of the ambient can explain.
 */
function derpCases(draw: Draw): ParityCase[] {
  const g = generateGalaxy(MOTE_SEED, 'desktop', galaxyBudget(MOTE_BUDGET_DESKTOP));
  const bodies = derpBodies(g);
  const mat = material(withDerpLibrary(DERP_VERTEX), PARITY_FRAGMENT, { uPass: { value: 0 } });
  const passes = parityPasses(DERP_PARITY_FIELDS);
  const ts = (x: DerpSample, t: number): Derp => derp(x.seed, x.phase, t, x.kind, x.r, x.R, x.omega, x.v);
  const errorAgainst = (want: Derp, outs: Float32Array[], i: number): number => {
    let err = 0;
    passes.forEach((pass, j) => {
      for (const { field, offset } of pass) {
        fieldValues(want, field.name).forEach((v, q) => {
          const d = outs[j][i * 4 + offset + q] - v;
          err = Math.max(err, Number.isNaN(d) ? Infinity : Math.abs(d));
        });
      }
    });
    return err;
  };
  const cases = bodies.map(([name, b]) => {
    const samples = derpSamples(b);
    let maxError = 0;
    let shifted = 0;
    for (let from = 0; from < samples.length; from += COUNT) {
      const chunk = samples.slice(from, from + COUNT);
      const geometry = pointsGeometry(chunk.length);
      geometry.setAttribute(
        'aDerpA',
        new InstancedBufferAttribute(new Float32Array(chunk.flatMap((x) => [x.seed, x.phase, x.t, BODY_KIND[x.kind]])), 4),
      );
      geometry.setAttribute('aDerpB', new InstancedBufferAttribute(new Float32Array(chunk.flatMap((x) => [x.r, x.R, x.omega, x.v])), 4));
      const points = new Points(geometry, mat);
      points.frustumCulled = false; // positions come from gl_InstanceID
      const outs = passes.map((_, pass) => {
        (mat.uniforms.uPass as IUniform).value = pass;
        return draw(points);
      });
      geometry.dispose();
      chunk.forEach((x, i) => {
        const at = errorAgainst(ts(x, x.t), outs, i);
        const e = 16 * ulp32(x.t);
        const near = Math.min(at, errorAgainst(ts(x, x.t - e), outs, i), errorAgainst(ts(x, x.t + e), outs, i));
        if (near < at && at >= 1e-4) shifted++;
        maxError = Math.max(maxError, near);
      });
    }
    return { name: `derp: ${name}`, maxError, samples: samples.length, shifted };
  });
  mat.dispose();
  return cases;
}

/**
 * The seconds into a scatter the shell cases sample (morph §3.4): none, the sweep, the hold, the
 * return's cuts, the ring, the aftershock, calm. 0, 0.2, 0.4, 0.6 and 0.9 are multiples of 1/30, the
 * jitter's tick, and safe: at 0.2, 0.4 and 0.6 the float32 sec × 30 rounds to the same tick on both
 * sides, and at 0 and 0.9 no mote is out, so no jitter is read. A new value should stay off them.
 */
const SHELL_SECS = [-1, 0, 0.03, 0.08, 0.15, 0.2, 0.26, 0.31, 0.4, 0.6, 0.9];
/** The shell's lattice the cases sample: a planet's. */
const SHELL_LATTICE: [number, number] = [14, 36];
/** Two shapes in a row: each set is drawn at shape index n and at n + 1. */
const SHELL_SHAPE_N = [4, 5];

/**
 * The three hash sets, one per cracked body (C1, its first moon with a moon's cap, and P1): the
 * body's own seed (shellSeed of its id) for its motes' hashes, its shapes and its spin axis, an event
 * (its sweep and its aftershock), an ambient time, and the gains and the cap.
 */
const SHELL_SETS: {
  id: string;
  sweep: [number, number, number];
  aftershock: boolean;
  t: number;
  A: number;
  gain: number;
  cap: number;
}[] = [
  { id: 'C1', sweep: [0.6, 0.48, 0.64], aftershock: true, t: 37.3, A: EQ_A, gain: 1, cap: SCATTER_AMP[0] + SCATTER_AMP[1] },
  { id: 'C1-m1', sweep: [-0.3, 0.9, 0.1], aftershock: false, t: 311.07, A: EQ_A, gain: 0.7, cap: SCATTER_MOON_CAP },
  { id: 'P1', sweep: [0.1, -0.2, -0.97], aftershock: true, t: 1061.5, A: 0.5 * EQ_A, gain: 0.35, cap: 1 },
];

/**
 * The shell cases, one per (hash set, shape): every mote of a planet's lattice at every second of
 * SHELL_SECS, as float32 attributes and uniforms carry them, compared field by field with the TS
 * reference read at the same float32 values.
 */
function shellCases(draw: Draw): ParityCase[] {
  const f = Math.fround;
  const f3 = (v: readonly number[]): [number, number, number] => [f(v[0]), f(v[1]), f(v[2])];
  const f4 = (v: readonly number[]): [number, number, number, number] => [f(v[0]), f(v[1]), f(v[2]), f(v[3])];
  const uniforms: Record<string, IUniform> = {
    uT: { value: 0 },
    uSweep: { value: [0, 1, 0] },
    uAftershock: { value: 0 },
    uShapeA: { value: [0, 0, 0, 0] },
    uShapeB: { value: [0, 0, 0, 0] },
    uNextA: { value: [0, 0, 0, 0] },
    uNextB: { value: [0, 0, 0, 0] },
    uA: { value: 0 },
    uGain: { value: 0 },
    uCap: { value: 0 },
    uSpinSeed: { value: 0 },
    uPass: { value: 0 },
  };
  const mat = material(withShellLibrary(SHELL_VERTEX), PARITY_FRAGMENT, uniforms);
  const passes = parityPasses(SHELL_PARITY_FIELDS);
  const [rows, cols] = SHELL_LATTICE;
  const lls = Array.from({ length: latticeCount(rows, cols) }, (_, i) => latticeLL(i, rows, cols));
  const cases: ParityCase[] = [];
  SHELL_SETS.forEach((set) => {
    const seed = shellSeed(set.id);
    const hashes = lls.map((_, i) => moteHashes(seed, i));
    const len = Math.hypot(...set.sweep);
    const sweep = f3(set.sweep.map((c) => c / len));
    for (const n of SHELL_SHAPE_N) {
      const [shapeA, shapeB] = shapeUniforms(shapeAt(seed, n)).map(f4);
      const [nextA, nextB] = shapeUniforms(shapeAt(seed, n + 1)).map(f4);
      // The TS reference reads the shapes as the uniforms carry them.
      const asShape = (a: number[], b: number[]) => ({ p: a[0], q: a[1], p2: b[0], q2: b[1], phi: [a[2], a[3], b[2], b[3]] as [number, number, number, number] });
      const t = f(set.t);
      uniforms.uT.value = t;
      uniforms.uSweep.value = sweep;
      uniforms.uAftershock.value = set.aftershock ? 1 : 0;
      uniforms.uShapeA.value = shapeA;
      uniforms.uShapeB.value = shapeB;
      uniforms.uNextA.value = nextA;
      uniforms.uNextB.value = nextB;
      uniforms.uA.value = f(set.A);
      uniforms.uGain.value = f(set.gain);
      uniforms.uCap.value = f(set.cap);
      uniforms.uSpinSeed.value = seed;
      const axis = spinAxis(seed);
      const samples = SHELL_SECS.flatMap((sec) => lls.map((ll, i) => ({ ll: { lat: f(ll.lat), lon: f(ll.lon) }, h: hashes[i], sec: f(sec) })));
      let maxError = 0;
      for (let from = 0; from < samples.length; from += COUNT) {
        const chunk = samples.slice(from, from + COUNT);
        const geometry = pointsGeometry(chunk.length);
        geometry.setAttribute('aLL', new InstancedBufferAttribute(new Float32Array(chunk.flatMap((x) => [x.ll.lat, x.ll.lon])), 2));
        geometry.setAttribute('aHA', new InstancedBufferAttribute(new Float32Array(chunk.flatMap((x) => x.h.slice(0, 4))), 4));
        geometry.setAttribute('aHB', new InstancedBufferAttribute(new Float32Array(chunk.flatMap((x) => x.h.slice(4, 8))), 4));
        geometry.setAttribute('aSec', new InstancedBufferAttribute(new Float32Array(chunk.map((x) => x.sec)), 1));
        const points = new Points(geometry, mat);
        points.frustumCulled = false; // positions come from gl_InstanceID
        const outs = passes.map((_, pass) => {
          uniforms.uPass.value = pass;
          return draw(points);
        });
        geometry.dispose();
        chunk.forEach((x, i) => {
          const ev: ShellEvent = { sec: x.sec, sweep, n, aftershock: set.aftershock, shape: asShape(shapeA, shapeB), next: asShape(nextA, nextB) };
          const warp = shellWarp(x.ll, x.h, t, ev, f(set.A), f(set.gain), f(set.cap));
          const want: ShellOut = { warp, k: shellK(x.ll, x.h, ev), spun: spinShell(warp, axis, t) };
          passes.forEach((pass, j) => {
            for (const { field, offset } of pass) {
              fieldValues(want, field.name).forEach((v, q) => {
                const d = outs[j][i * 4 + offset + q] - v;
                maxError = Math.max(maxError, Number.isNaN(d) ? Infinity : Math.abs(d));
              });
            }
          });
        });
      }
      cases.push({ name: `shell: ${set.id}, shape ${n}`, maxError, samples: samples.length });
    }
  });
  mat.dispose();
  return cases;
}

/** The lod grid: each element's gain every LOD_GAIN_STEP px over [0, LOD_GAIN_TO] (its band and both sides of it). */
const LOD_GAIN_STEP = 0.25;
const LOD_GAIN_TO = 140;
/** And glowPx over these radii, focal lengths and caps, at distances from 0.05 to 4000, LOD_GLOW_DISTANCES of them, log-spaced. */
const LOD_GLOW_R = [0.9, 1.4];
const LOD_GLOW_FOCAL = [400, 835.3, 1236.7];
const LOD_GLOW_CAP = [18, 24, 7.3, 2.5];
const LOD_GLOW_DISTANCES = 96;
/** And motePx over these world diameters (the hero planet's grain, a thinned planet's, a coarse moon's) at scales from 0.5 to 1000 CSS px per unit, LOD_MOTE_SCALES of them, log-spaced. */
const LOD_MOTE_DIAMETERS = [0.00785, 0.021, 0.039];
const LOD_MOTE_SCALES = 64;

/**
 * And the early-out: lodSkip over every body kind, every role (NodeRole: builder, person, moon, track,
 * glow), lattice index 0 (a point) and 1, every LOD_SKIP_STEP px over [0, LOD_SKIP_TO] and each override;
 * offScreenReachPx over centres in view space (on axis and off it, in front and not wholly in front),
 * reaches and focal lengths; offScreenSkip over a grid of centres across a phone's screen and past each
 * edge, at four reaches.
 */
const LOD_SKIP_KINDS = [0, 1, 2, 3];
const LOD_SKIP_ROLES = [0, 1, 2, 3, 4];
const LOD_SKIP_STEP = 0.5;
const LOD_SKIP_TO = 200;
const LOD_SKIP_FORCE = [-1, 0, 0.5, 1];
const LOD_REACH_Z = [0.4, 3, 20, 60, 200, 600];
const LOD_REACH_RHO = [0.05, 0.5, 2];
const LOD_REACH_FOCAL = [420, 835.3];
const LOD_REACH_OFF = [-0.5, 0, 1 / 3];
const LOD_OFF_SCREEN = { w: 390, h: 844 };
const LOD_OFF_STEP = 40;
const LOD_OFF_REACH = [0.5, 12, 60, 250];
/**
 * And the neighbourhood's dissolve: hoodGlowPx, hoodReal, hoodFar and hoodSkip over LOD_HOOD_DISTANCES
 * distances from 20 to 2000 (log-spaced: across the 11 → 16 px band at each focal length), the three
 * focal lengths, holds (none, part, whole) and every body kind.
 */
const LOD_HOOD_DISTANCES = 64;
const LOD_HOOD_FOCAL = [400, 835.3, 1236.7];
const LOD_HOOD_HOLD = [0, 0.3, 1];
const LOD_HOOD_KINDS = [0, 1, 2, 3];

type LodInput = {
  gainIn: [number, number];
  glowIn: [number, number, number, number];
  moteIn: [number, number];
  skipIn?: [number, number, number, number];
  viewIn?: [number, number, number, number];
  focalIn?: [number, number, number, number];
  offIn?: [number, number, number, number];
  hoodIn?: [number, number, number, number];
};

/** Draw `inputs` (each two attributes' values) through the lod parity shader in batches of COUNT, and compare every LodOut field. */
function lodBatches(draw: Draw, inputs: LodInput[], name: string): ParityCase {
  const uniforms: Record<string, IUniform> = { uPass: { value: 0 } };
  const mat = material(withLodLibrary(LOD_VERTEX), PARITY_FRAGMENT, uniforms);
  const passes = parityPasses(LOD_PARITY_FIELDS);
  let err = 0;
  for (let from = 0; from < inputs.length; from += COUNT) {
    const batch = inputs.slice(from, from + COUNT);
    const geometry = pointsGeometry(batch.length);
    geometry.setAttribute('aGainIn', new InstancedBufferAttribute(new Float32Array(batch.flatMap((b) => b.gainIn)), 2));
    geometry.setAttribute('aGlowIn', new InstancedBufferAttribute(new Float32Array(batch.flatMap((b) => b.glowIn)), 4));
    geometry.setAttribute('aMoteIn', new InstancedBufferAttribute(new Float32Array(batch.flatMap((b) => b.moteIn)), 2));
    geometry.setAttribute('aSkipIn', new InstancedBufferAttribute(new Float32Array(batch.flatMap((b) => b.skipIn ?? [0, 4, 1, -1])), 4));
    geometry.setAttribute('aViewIn', new InstancedBufferAttribute(new Float32Array(batch.flatMap((b) => b.viewIn ?? [0, 0, -10, 1])), 4));
    geometry.setAttribute('aFocalIn', new InstancedBufferAttribute(new Float32Array(batch.flatMap((b) => b.focalIn ?? [800, 800, 0.01, 844])), 4));
    geometry.setAttribute('aOffIn', new InstancedBufferAttribute(new Float32Array(batch.flatMap((b) => b.offIn ?? [10, 10, 1, 390])), 4));
    geometry.setAttribute('aHoodIn', new InstancedBufferAttribute(new Float32Array(batch.flatMap((b) => b.hoodIn ?? [640, 835.3, 0, 1])), 4));
    const points = new Points(geometry, mat);
    points.frustumCulled = false; // positions come from gl_InstanceID
    const outs = passes.map((_, pass) => {
      uniforms.uPass.value = pass;
      return draw(points);
    });
    geometry.dispose();
    // The TS reference takes the inputs as the attributes carry them: float32.
    batch.forEach((b, i) => {
      const [el, s] = b.gainIn.map(Math.fround);
      const [R, d, focal, cap] = b.glowIn.map(Math.fround);
      const [dia, scale] = b.moteIn.map(Math.fround);
      const [kind, role, index, force] = (b.skipIn ?? [0, 4, 1, -1]).map(Math.fround);
      const [vx, vy, vz, rho] = (b.viewIn ?? [0, 0, -10, 1]).map(Math.fround);
      const [fx, fy, dotWorld, h] = (b.focalIn ?? [800, 800, 0.01, 844]).map(Math.fround);
      const [cx, cy, reach, w] = (b.offIn ?? [10, 10, 1, 390]).map(Math.fround);
      const [hd, hfocal, hold, hkind] = (b.hoodIn ?? [640, 835.3, 0, 1]).map(Math.fround);
      const hglow = hoodGlowPx(hd, hfocal);
      const want: LodOut = {
        gain: lodGain(el as LodElement, s),
        glow: glowPx(R, d, focal, cap),
        moonSphere: moonSphereGain(s),
        moonPoint: moonPointPx(s),
        mote: motePx(dia, scale),
        skip: lodSkip(kind, role, index, s, force) ? 1 : 0,
        reach: offScreenReachPx([vx, vy, vz], rho, fx, fy, dotWorld),
        offScreen: offScreenSkip([cx, cy], reach, w, h) ? 1 : 0,
        hoodGlow: hglow,
        hoodReal: hoodReal(hglow, hold),
        hoodFar: hoodFar(hd, hfocal, hold),
        hoodSkip: hoodSkip(hkind, hoodReal(hglow, hold)) ? 1 : 0,
      };
      passes.forEach((pass, j) => {
        for (const { field, offset } of pass) {
          fieldValues(want, field.name).forEach((v, q) => {
            const diff = outs[j][i * 4 + offset + q] - v;
            err = Math.max(err, Number.isNaN(diff) ? Infinity : Math.abs(diff));
          });
        }
      });
    });
  }
  mat.dispose();
  return { name, maxError: err, samples: inputs.length };
}

/** The star grid's seeds (mote seeds: 24-bit), its glow sizes (CSS px, either side of the spikes' coming in), and its ambients. */
const STAR_SEEDS = [1, 0x5a5a5a, 0xabcdef, 0xfffff0];
const STAR_GLOW_PX = [4, 6, 9, 12, 18];
/** And the glow's unclamped size: far off, between spikeNear's ends, and close up. */
const STAR_NEAR_PX = [40, 70, 90];
const STAR_AMBIENTS = [0, AMBIENT_POSE, 101, 3599.9];
/** A look of each spike count, and two for the breath: brightnesses either side of six spikes' threshold. */
const STAR_LOOKS: StarLook[] = [
  { brightness: 0.62, spikes: 4, temperature: 0.3, period: 4.3, phase: 0.17 },
  { brightness: 0.93, spikes: 6, temperature: 0.8, period: 8.6, phase: 0.71 },
];

type StarInput = { star: [number, number, number, number]; look: StarLook; clock: [number, number, number] };

function starCases(draw: Draw): ParityCase[] {
  const dots: StarInput[] = [];
  for (const seed of STAR_SEEDS)
    for (let i = 0; i < STAR_DOTS.core + STAR_DOTS.halo; i++) dots.push({ star: [i, seed, 0, 0], look: STAR_LOOKS[0], clock: [12, 0, 90] });
  const spikes: StarInput[] = [];
  for (const look of STAR_LOOKS)
    for (const glow of STAR_GLOW_PX)
      for (const near of STAR_NEAR_PX)
        for (let row = 0; row < STAR_DOTS.spikeRows; row++)
          for (let j = 0; j < STAR_DOTS.spikeDots; j++) spikes.push({ star: [0, 1, row, j], look, clock: [glow, 0, near] });
  const breaths: StarInput[] = [];
  for (const look of STAR_LOOKS) for (const t of STAR_AMBIENTS) breaths.push({ star: [0, 1, 0, 0], look, clock: [12, t, 90] });
  const tints: StarInput[] = Array.from({ length: 11 }, (_, k) => ({ star: [0, 1, 0, 0], look: { ...STAR_LOOKS[0], temperature: k / 10 }, clock: [12, 0, 90] }));
  return [
    starBatches(draw, dots, 'star: starDot'),
    starBatches(draw, spikes, 'star: starSpike'),
    starBatches(draw, breaths, 'star: starBreath'),
    starBatches(draw, tints, 'star: starTint'),
  ];
}

/** Draw `inputs` through the star parity shader in batches of COUNT, and compare every StarOut field. */
function starBatches(draw: Draw, inputs: StarInput[], name: string): ParityCase {
  const uniforms: Record<string, IUniform> = { uPass: { value: 0 } };
  const mat = material(withStarLibrary(STAR_VERTEX), PARITY_FRAGMENT, uniforms);
  const passes = parityPasses(STAR_PARITY_FIELDS);
  const f = Math.fround;
  let err = 0;
  for (let from = 0; from < inputs.length; from += COUNT) {
    const batch = inputs.slice(from, from + COUNT);
    const geometry = pointsGeometry(batch.length);
    geometry.setAttribute('aStarIn', new InstancedBufferAttribute(new Float32Array(batch.flatMap((b) => b.star)), 4));
    geometry.setAttribute('aLookIn', new InstancedBufferAttribute(new Float32Array(batch.flatMap((b) => [b.look.brightness, b.look.spikes, b.look.period, b.look.phase])), 4));
    geometry.setAttribute('aClockIn', new InstancedBufferAttribute(new Float32Array(batch.flatMap((b) => [b.clock[0], b.clock[1], b.look.temperature, b.clock[2]])), 4));
    const points = new Points(geometry, mat);
    points.frustumCulled = false; // positions come from gl_InstanceID
    const outs = passes.map((_, pass) => {
      uniforms.uPass.value = pass;
      return draw(points);
    });
    geometry.dispose();
    // The TS reference takes the inputs as the attributes carry them: float32.
    batch.forEach((b, i) => {
      const look: StarLook = { ...b.look, brightness: f(b.look.brightness), period: f(b.look.period), phase: f(b.look.phase), temperature: f(b.look.temperature) };
      const glow = f(b.clock[0]);
      const t = f(b.clock[1]);
      const d = starDot(b.star[0], b.star[1]);
      const s = starSpike(look, b.star[2], b.star[3], glow, f(b.clock[2]));
      const want: StarOut = { offset: d.offset, gain: d.gain, spike: [...s.offPx, s.gain], breath: starBreath(look, t), tint: starTint(look.temperature) };
      passes.forEach((pass, j) => {
        for (const { field, offset } of pass) {
          fieldValues(want, field.name).forEach((v, q) => {
            const diff = outs[j][i * 4 + offset + q] - v;
            err = Math.max(err, Number.isNaN(diff) ? Infinity : Math.abs(diff));
          });
        }
      });
    });
  }
  mat.dispose();
  return { name, maxError: err, samples: inputs.length };
}

function lodCases(draw: Draw): ParityCase[] {
  const gains: LodInput[] = [];
  for (const el of Object.keys(LOD_BANDS).map(Number)) {
    for (let s = 0; s <= LOD_GAIN_TO; s += LOD_GAIN_STEP) gains.push({ gainIn: [el, s], glowIn: [1, 1, 1, 1], moteIn: [0, 0] });
  }
  const glows: LodInput[] = [];
  for (const R of LOD_GLOW_R)
    for (const focal of LOD_GLOW_FOCAL)
      for (const cap of LOD_GLOW_CAP)
        for (let k = 0; k < LOD_GLOW_DISTANCES; k++) {
          const d = 0.05 * Math.pow(4000 / 0.05, k / (LOD_GLOW_DISTANCES - 1));
          glows.push({ gainIn: [0, 0], glowIn: [R, d, focal, cap], moteIn: [0, 0] });
        }
  const motes: LodInput[] = [];
  for (const dia of LOD_MOTE_DIAMETERS)
    for (let k = 0; k < LOD_MOTE_SCALES; k++) motes.push({ gainIn: [0, 0], glowIn: [1, 1, 1, 1], moteIn: [dia, 0.5 * Math.pow(2000, k / (LOD_MOTE_SCALES - 1))] });
  const skips: LodInput[] = [];
  for (const kind of LOD_SKIP_KINDS)
    for (const role of LOD_SKIP_ROLES)
      for (const index of [0, 1])
        for (const force of LOD_SKIP_FORCE)
          for (let s = 0; s <= LOD_SKIP_TO; s += LOD_SKIP_STEP) skips.push({ gainIn: [0, s], glowIn: [1, 1, 1, 1], moteIn: [0, 0], skipIn: [kind, role, index, force] });
  const reaches: LodInput[] = [];
  for (const Z of LOD_REACH_Z)
    for (const rho of LOD_REACH_RHO)
      for (const focal of LOD_REACH_FOCAL)
        for (const ox of LOD_REACH_OFF)
          for (const oy of LOD_REACH_OFF)
            reaches.push({ gainIn: [0, 0], glowIn: [1, 1, 1, 1], moteIn: [0, 0], viewIn: [ox * Z, oy * Z, -Z, rho], focalIn: [focal, 0.9 * focal, 0.02, LOD_OFF_SCREEN.h] });
  const offs: LodInput[] = [];
  const { w, h } = LOD_OFF_SCREEN;
  for (const reach of LOD_OFF_REACH)
    for (let x = -300; x <= w + 300; x += LOD_OFF_STEP)
      for (let y = -300; y <= h + 300; y += LOD_OFF_STEP) offs.push({ gainIn: [0, 0], glowIn: [1, 1, 1, 1], moteIn: [0, 0], focalIn: [800, 800, 0.01, h], offIn: [x, y, reach, w] });
  const hoods: LodInput[] = [];
  for (const focal of LOD_HOOD_FOCAL)
    for (const hold of LOD_HOOD_HOLD)
      for (const kind of LOD_HOOD_KINDS)
        for (let k = 0; k < LOD_HOOD_DISTANCES; k++)
          hoods.push({ gainIn: [0, 0], glowIn: [1, 1, 1, 1], moteIn: [0, 0], hoodIn: [20 * Math.pow(100, k / (LOD_HOOD_DISTANCES - 1)), focal, hold, kind] });
  return [
    lodBatches(draw, gains, 'lod: lodGain'),
    lodBatches(draw, glows, 'lod: glowPx'),
    lodBatches(draw, motes, 'lod: motePx'),
    lodBatches(draw, skips, 'lod: lodSkip'),
    lodBatches(draw, reaches, 'lod: offScreenReachPx'),
    lodBatches(draw, offs, 'lod: offScreenSkip'),
    lodBatches(draw, hoods, 'lod: hoodReal'),
  ];
}

function bodyCases(draw: Draw): ParityCase[] {
  const g = generateGalaxy(MOTE_SEED, 'desktop', galaxyBudget(MOTE_BUDGET_DESKTOP));
  const data = packBodyData(g);
  const all = allBodyMoteAttrs(g);
  const shellData = new Float32Array(g.bodies.length * SHELL_TEXELS * 4);
  const shellTex = floatTexture(shellData, SHELL_TEXELS, g.bodies.length);
  const uniforms: Record<string, IUniform> = {
    uBodyTex: { value: floatTexture(data.bodies, BODY_TEXELS, data.bodyCount) },
    uStreamTex: { value: floatTexture(data.streams, BODY_TEXELS, data.streamCount) },
    uShellTex: { value: shellTex },
    uN0Row: { value: data.n0Row },
    uGrowth: { value: 0 },
    uFix: { value: 0 },
    uHighlight: { value: 0 },
    uShow: { value: 0 },
    uAmbient: { value: 0 },
    uFocus: { value: 0 },
    uLamp: { value: 0 },
    uLampRow: { value: -1 },
    uForcedScatter: { value: -1 },
    uDress: { value: 0 },
    uFlash: { value: 0 },
    uFlashOn: { value: 1 },
    uCopy: { value: 0 },
    uHeld: { value: [-1, -1] },
    uSysPx: { value: sysPxAll(0) },
    uLodForce: { value: new Float32Array(LOD_BANDS_COUNT).fill(-1) },
    uPass: { value: 0 },
  };
  const mat = material(withGalaxyLibrary(BODY_VERTEX), PARITY_FRAGMENT, uniforms);
  const passes = parityPasses(BODY_PARITY_FIELDS);
  const f = Math.fround;
  const cases: ParityCase[] = [];
  for (const c of BODY_CASES) {
    const motes = c.motes(g, all);
    if (motes.length === 0) throw new Error(`body case ${c.name} has no motes`);
    for (const ambient of c.ambients ?? BODY_AMBIENTS) {
      const t = f(ambient);
      const clocks = c.clocks(g);
      const fz = clocks.freeze;
      const k = {
        ...clocks,
        growth: f(clocks.growth),
        fix: f(clocks.fix),
        highlight: f(clocks.highlight),
        focus: f(clocks.focus),
        sysPx: clocks.sysPx,
        freeze: fz === undefined ? undefined : { ...fz, dress: f(fz.dress), flash: f(fz.flash) },
      };
      shellData.set(packShellData(g, t));
      shellTex.needsUpdate = true;
      const shells = Float32Array.from(shellData);
      uniforms.uGrowth.value = k.growth;
      uniforms.uFix.value = k.fix;
      uniforms.uHighlight.value = k.highlight;
      uniforms.uShow.value = k.show;
      uniforms.uAmbient.value = t;
      uniforms.uFocus.value = k.focus;
      uniforms.uLamp.value = k.lamp;
      uniforms.uLampRow.value = k.lampRow;
      uniforms.uForcedScatter.value = k.forcedScatter ?? -1;
      uniforms.uDress.value = f(k.freeze?.dress ?? 0);
      uniforms.uFlash.value = f(k.freeze?.flash ?? 0);
      uniforms.uCopy.value = k.freeze?.copy ?? 0;
      uniforms.uHeld.value = [k.freeze?.moon ?? -1, k.freeze?.planet ?? -1];
      uniforms.uSysPx.value = k.sysPx;
      const ts = (time: number) => (a: BodyMoteAttrs) => bodyMote(a, { ...k, ambient: time }, { ...data, shells });
      let maxError = 0;
      let shifted = 0;
      for (let from = 0; from < motes.length; from += COUNT) {
        const chunk = motes.slice(from, from + COUNT);
        const geometry = pointsGeometry(chunk.length);
        geometry.setAttribute('aLL', new InstancedBufferAttribute(new Float32Array(chunk.flatMap((a) => [a.ll.lat, a.ll.lon])), 2));
        geometry.setAttribute('aMote', new InstancedBufferAttribute(new Float32Array(chunk.flatMap((a) => [a.row, a.role, a.sys, a.index])), 4));
        geometry.setAttribute('aFlight', new InstancedBufferAttribute(new Float32Array(chunk.flatMap((a) => [a.birth, a.seed, a.host, 0])), 4));
        const points = new Points(geometry, mat);
        points.frustumCulled = false; // positions come from gl_InstanceID
        const outs = passes.map((_, pass) => {
          uniforms.uPass.value = pass;
          return draw(points);
        });
        geometry.dispose();
        const errorAgainst = (want: ReturnType<typeof bodyMote>, i: number): number => {
          let err = 0;
          passes.forEach((pass, j) => {
            for (const { field, offset } of pass) {
              fieldValues(want, field.name).forEach((v, q) => {
                const d = outs[j][i * 4 + offset + q] - v;
                err = Math.max(err, Number.isNaN(d) ? Infinity : Math.abs(d));
              });
            }
          });
          return err;
        };
        chunk.forEach((a, i) => {
          const at = errorAgainst(ts(t)(a), i);
          const e = 16 * ulp32(t);
          const near = Math.min(at, errorAgainst(ts(t - e)(a), i), errorAgainst(ts(t + e)(a), i));
          if (near < at && at >= 1e-4) shifted++;
          maxError = Math.max(maxError, near);
        });
      }
      cases.push({ name: `body: ${c.name} at ${ambient === AMBIENT_POSE ? 'the pose' : `${ambient} s`}`, maxError, samples: motes.length, shifted });
    }
  }
  mat.dispose();
  shellTex.dispose();
  uniforms.uForcedScatter.value = -1;
  uniforms.uDress.value = 0;
  uniforms.uCopy.value = 0;
  uniforms.uHeld.value = [-1, -1];
  for (const c of streamCases(draw, uniforms)) cases.push(c);
  cases.push(trackLampCase(draw, uniforms));
  (uniforms.uBodyTex.value as DataTexture).dispose();
  (uniforms.uStreamTex.value as DataTexture).dispose();
  return cases;
}

/**
 * The lamp levels the track lamp case runs under, each on its body (bodyCases' lamps): off, the planet
 * and the star lamp on C1, the neighbourhood, the core, the lineage on P1 and the arms.
 */
const TRACK_LAMPS: readonly [lamp: number, on: string | null][] = [
  [0, null],
  [1, 'C1'],
  [2, 'C1'],
  [3, null],
  [4, null],
  [5, 'P1'],
  [6, null],
];
/** The lamp's focus the track lamp case runs at: none, half way (the push-in's and the pull-outs' frames) and full. */
const TRACK_FOCI = [0, 0.5, 1] as const;

/**
 * The track lamp case of `?lib=body` (Task 10 review I1): trackLampGain() of every track row (every
 * planet's orbit and every moon track), under each of TRACK_LAMPS at each of TRACK_FOCI, GLSL against
 * the TS twin. Under the planet lamp the lit planet's own orbit is the one row it changes.
 */
function trackLampCase(draw: Draw, uniforms: Record<string, IUniform>): ParityCase {
  const g = generateGalaxy(MOTE_SEED, 'desktop', galaxyBudget(MOTE_BUDGET_DESKTOP));
  const data = packBodyData(g);
  const tracks = buildTrackAttrs(g);
  const rows = [...new Set(Array.from({ length: tracks.count }, (_, k) => tracks.track[k * 4]))];
  const mat = material(withGalaxyLibrary(TRACK_LAMP_VERTEX), PARITY_FRAGMENT, uniforms);
  let maxError = 0;
  let samples = 0;
  for (const [lamp, on] of TRACK_LAMPS) {
    for (const focus of TRACK_FOCI) {
      const lampRow = on === null ? -1 : g.ids[on];
      uniforms.uLamp.value = lamp;
      uniforms.uLampRow.value = lampRow;
      uniforms.uFocus.value = focus;
      for (let from = 0; from < rows.length; from += COUNT) {
        const chunk = rows.slice(from, from + COUNT);
        const geometry = pointsGeometry(chunk.length);
        geometry.setAttribute('aRowIn', new InstancedBufferAttribute(new Float32Array(chunk), 1));
        const points = new Points(geometry, mat);
        points.frustumCulled = false; // positions come from gl_InstanceID
        const out = draw(points);
        geometry.dispose();
        chunk.forEach((row, i) => {
          const d = out[i * 4] - trackLampGain(row, { lamp, lampRow, focus }, data);
          maxError = Math.max(maxError, Number.isNaN(d) ? Infinity : Math.abs(d));
          samples++;
        });
      }
    }
  }
  mat.dispose();
  return { name: 'body: track lamp gain', maxError, samples };
}

/** The stream dots sampled: every stream and the feed, dots 0, 3, 7 and 39, at four (streams, lamp) pairs. */
const STREAM_DOT_I = [0, 3, 7, 39];
const STREAM_GAINS: [number, number][] = [
  [1, 1],
  [0.4, 1],
  [1, 0.3],
  [0, 1],
];
/** The feed's far end in the stream case: where the ring would be. */
const STREAM_FEED_END: [number, number, number] = [13.5, 0.2, -21.25];
/**
 * The band mask's rows in the stream case: CSS px from the band's masked edge (TEXT_BAND of the height
 * plus BAND_MARGIN_PX), on a phone's height and a desktop's, from above it to past its soft rise.
 */
const STREAM_BAND_OFFSETS = [-6, -1, -0.25, 0, 0.5, 1, 1.75, 2, 2.5, 3.25, 4, 4.5, 9];
const STREAM_BAND_HEIGHTS = [844, 900];

/** The stream case of `?lib=body`: streamDot(), streamGain(), feedGain() and streamBandMask() over every stream, at the pose and at 101 s (the gains' first input read as net.streams and as net.feed; each dot's mask at a row about the band's edge). */
function streamCases(draw: Draw, uniforms: Record<string, IUniform>): ParityCase[] {
  const g = generateGalaxy(MOTE_SEED, 'desktop', galaxyBudget(MOTE_BUDGET_DESKTOP));
  const data = packBodyData(g);
  const u: Record<string, IUniform> = { ...uniforms, uRing: { value: STREAM_FEED_END }, uPass: { value: 0 } };
  const mat = material(withGalaxyLibrary(STREAM_DOT_VERTEX), PARITY_FRAGMENT, u);
  const passes = parityPasses(STREAM_PARITY_FIELDS);
  const samples = Array.from({ length: data.streamCount }, (_, row) =>
    STREAM_DOT_I.map((i, j) => {
      const k = row * STREAM_DOT_I.length + j;
      const height = STREAM_BAND_HEIGHTS[k % 2];
      const yTop = TEXT_BAND * height + BAND_MARGIN_PX + STREAM_BAND_OFFSETS[k % STREAM_BAND_OFFSETS.length];
      return { row, i, streams: STREAM_GAINS[(row + j) % 4][0], lamp: STREAM_GAINS[(row + j) % 4][1], yTop, height };
    }),
  ).flat();
  const cases: ParityCase[] = [];
  for (const ambient of BODY_AMBIENTS) {
    const t = Math.fround(ambient);
    u.uAmbient = { value: t };
    let maxError = 0;
    for (let from = 0; from < samples.length; from += COUNT) {
      const chunk = samples.slice(from, from + COUNT);
      const geometry = pointsGeometry(chunk.length);
      geometry.setAttribute('aDotIn', new InstancedBufferAttribute(new Float32Array(chunk.flatMap((x) => [x.row, x.i, x.streams, x.lamp])), 4));
      geometry.setAttribute('aBandIn', new InstancedBufferAttribute(new Float32Array(chunk.flatMap((x) => [x.yTop, x.height])), 2));
      const points = new Points(geometry, mat);
      points.frustumCulled = false; // positions come from gl_InstanceID
      const outs = passes.map((_, pass) => {
        u.uPass.value = pass;
        return draw(points);
      });
      geometry.dispose();
      chunk.forEach((x, i) => {
        const dot = streamDot(data, x.row, x.i, t, STREAM_FEED_END.map(Math.fround) as [number, number, number]);
        const want: StreamOut = {
          pos: dot.pos,
          u: dot.u,
          presence: dot.presence,
          gain: streamGain(dot.u, x.streams, x.lamp),
          feedGain: feedGain(x.streams, x.lamp),
          bandMask: streamBandMask(Math.fround(x.yTop), x.height),
        };
        passes.forEach((pass, j) => {
          for (const { field, offset } of pass) {
            fieldValues(want, field.name).forEach((v, q) => {
              const d = outs[j][i * 4 + offset + q] - v;
              maxError = Math.max(maxError, Number.isNaN(d) ? Infinity : Math.abs(d));
            });
          }
        });
      });
    }
    cases.push({ name: `body: stream dots at ${ambient === AMBIENT_POSE ? 'the pose' : `${ambient} s`}`, maxError, samples: samples.length });
  }
  mat.dispose();
  return cases;
}

/**
 * The freeze case's grid: every mote of both bursts (238) at each of FREEZE_TICK_CLOCKS (v, how far the
 * shell is out, the screen angle toward the moon) and both of the twos' length sets, each paired in
 * turn with a copy (every copy, three dressings, three values of v, both warm modes, the defect moon's
 * or not), a limb normal (24 screen angles at five tilts, two dressings, the base and a copy, toward
 * two lights) and a twos tick. The values of v stay off the retraction's exact cuts (a dash keeps
 * min(1, 1.6 v) of its motes, at j / (motes − 1)).
 */
const FREEZE_TICK_CLOCKS: readonly [v: number, scatterOut: number, toMoon: number][] = [
  [1, 0, 0.3],
  [0.47, 1, -2.5],
  [0.21, 0.4, 1.7],
  [0, 1, 3.1],
];
const FREEZE_COPY_DRESS = [0, 0.3, 1];
const FREEZE_COPY_V = [0, 0.26, 1];
const FREEZE_LIMB_TILT = [0.5, 0.8, 0.85, 0.95, 1];
const FREEZE_LIGHTS: readonly [number, number, number][] = [[...FREEZE_LIMB_LIGHT], [0.6, 0.48, 0.64]];

function freezeCase(draw: Draw): ParityCase {
  const f = Math.fround;
  const copies: [number, number, number, number, number][] = [];
  for (const copy of [0, 1, 2])
    for (const dress of FREEZE_COPY_DRESS)
      for (const v of FREEZE_COPY_V) for (const mode of [0, 1]) for (const moon of [0, 1]) copies.push([copy, dress, v, mode, moon]);
  const limbs: { n: [number, number, number]; light: [number, number, number] }[] = [];
  for (let k = 0; k < 24; k++)
    for (const tilt of FREEZE_LIMB_TILT)
      for (const light of FREEZE_LIGHTS) {
        const z = 1 - tilt;
        const r = Math.sqrt(1 - z * z);
        const a = (k * 15 + 2.5) * (Math.PI / 180);
        limbs.push({ n: [r * Math.cos(a), r * Math.sin(a), z], light });
      }
  const ticks: [number, number, number, number, number, number, number][] = [];
  for (const [v, out, toMoon] of FREEZE_TICK_CLOCKS)
    for (const variant of [0, 1])
      for (const [source, k] of [
        [0, FREEZE_TICK_MOON],
        [1, FREEZE_TICK_PLANET],
      ] as const)
        for (let i = 0; i < k.n; i++) for (let j = 0; j < k.motes; j++) ticks.push([source, i, j, variant, v, out, toMoon]);
  const samples = ticks.map((tick, k) => ({ tick, copy: copies[k % copies.length], limb: limbs[k % limbs.length], twos: k % 50 }));
  const uniforms: Record<string, IUniform> = { uPass: { value: 0 } };
  const mat = material(withFreezeLibrary(FREEZE_VERTEX), PARITY_FRAGMENT, uniforms);
  const passes = parityPasses(FREEZE_PARITY_FIELDS);
  let maxError = 0;
  for (let from = 0; from < samples.length; from += COUNT) {
    const batch = samples.slice(from, from + COUNT);
    const geometry = pointsGeometry(batch.length);
    // The copy's dressing is the limb's and the burst's showing too.
    geometry.setAttribute('aCopyIn', new InstancedBufferAttribute(new Float32Array(batch.flatMap((s) => s.copy.slice(0, 4))), 4));
    geometry.setAttribute('aLimbN', new InstancedBufferAttribute(new Float32Array(batch.flatMap((s) => [...s.limb.n, s.copy[4]])), 4));
    geometry.setAttribute('aLimbL', new InstancedBufferAttribute(new Float32Array(batch.flatMap((s) => s.limb.light)), 3));
    geometry.setAttribute('aTickIn', new InstancedBufferAttribute(new Float32Array(batch.flatMap((s) => s.tick.slice(0, 4))), 4));
    geometry.setAttribute('aTickClock', new InstancedBufferAttribute(new Float32Array(batch.flatMap((s) => [...s.tick.slice(4), s.twos])), 4));
    const points = new Points(geometry, mat);
    points.frustumCulled = false; // positions come from gl_InstanceID
    const outs = passes.map((_, pass) => {
      uniforms.uPass.value = pass;
      return draw(points);
    });
    geometry.dispose();
    // The TS reference takes the inputs as the attributes carry them: float32.
    batch.forEach((s, i) => {
      const [copy, dress, v, mode, moon] = s.copy.map(f);
      const [source, di, mj, variant, tv, out, toMoon] = s.tick.map(f);
      const c = freezeCopy(copy as FreezeCopyIndex, dress, v, mode === 0 ? 'A' : 'B', moon > 0.5);
      const l = freezeLimb(s.limb.n.map(f) as [number, number, number], s.limb.light.map(f) as [number, number, number], dress, copy as FreezeCopyIndex);
      const src = source === 0 ? 'moon' : 'planet';
      const t = freezeTick(src, di, mj, variant as 0 | 1, tv, out, toMoon);
      const want: FreezeOut = {
        copyOff: c.offPx,
        copyGain: c.gain,
        tint: c.tint,
        limbGain: l.gain,
        limbSize: l.size,
        tickAngle: t.angle,
        tickRadius: t.radius,
        tickLen: t.len,
        tickVisible: t.visible,
        tickShow: freezeTickShow(src, dress),
        tickWarm: freezeTickWarm(src, di) ? 1 : 0,
        breath: freezeBreath(s.twos),
      };
      passes.forEach((pass, j) => {
        for (const { field, offset } of pass) {
          fieldValues(want, field.name).forEach((value, q) => {
            const d = outs[j][i * 4 + offset + q] - value;
            maxError = Math.max(maxError, Number.isNaN(d) ? Infinity : Math.abs(d));
          });
        }
      });
    });
  }
  mat.dispose();
  return { name: 'freeze: the copies, the limb and the bursts', maxError, samples: samples.length };
}

function report(cases: ParityCase[], error?: string): void {
  const body = document.getElementById('results') as HTMLTableSectionElement;
  for (const c of cases) {
    const row = body.insertRow();
    row.insertCell().textContent = c.name;
    row.insertCell().textContent = c.maxError.toExponential(2);
    if (c.samples !== undefined) row.insertCell().textContent = `${c.samples} samples${c.shifted === undefined ? '' : `, ${c.shifted} at a cut`}`;
    if (!(c.maxError < 1e-3)) row.className = 'fail';
  }
  if (error !== undefined) {
    const row = body.insertRow();
    row.className = 'fail';
    row.insertCell().textContent = error;
  }
  window.__parity = error === undefined ? { cases } : { cases, error };
}

try {
  const lib = new URLSearchParams(window.location.search).get('lib');
  report(run(LIBS.find((l) => l === lib) ?? 'mote'));
} catch (e) {
  report([], e instanceof Error ? e.message : String(e));
}
