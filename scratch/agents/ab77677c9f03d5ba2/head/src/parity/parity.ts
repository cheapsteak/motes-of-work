// GLSL ↔ TS parity through the production attribute path. Each mote is one instance of a
// gl.POINTS draw over the real InstancedBufferAttributes (layout.ts); the vertex shader carries the
// production library (withMoteLibrary: instanceAttrs() → mote()), places the instance on its own
// texel of a float target via gl_InstanceID, and hands the MoteOut fields to the fragment shader in
// a flat varying, one RGBA pass per parityPasses() group. The readback is compared with the TS
// reference mote() field by field (PARITY_FIELDS). The hash check is a points draw too, so the mote
// library only ever runs in a vertex shader (shaders.ts). Results land in `window.__parity` for e2e.
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
import { ACTIVE_MECHANISM } from '../config';
import { mechanisms } from '../mechanisms';
import type { Mechanism } from '../mechanisms/types';
import { buildMoteAttrs, type MoteAttrs } from '../scene/mote/attributes';
import { instancedAttributes } from '../scene/mote/layout';
import { mote } from '../scene/mote/mote';
import { packPartTexture, partTransforms } from '../scene/mote/partTransforms';
import { withMoteLibrary } from '../scene/mote/shaderSource';
import { defaultSceneState, mergeState, type SceneState } from '../timeline/sceneState';
import { fieldValues, parityPasses } from './fields';
import { HASH_VERTEX, MOTE_VERTEX, PARITY_FRAGMENT, PARITY_SIZE } from './shaders';

interface ParityCase {
  name: string;
  maxError: number;
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

function run(): ParityCase[] {
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

  // --- mote(): every MoteOut field compared with the TS reference, for every registered mechanism. ---
  for (const [id, mech] of Object.entries(mechanisms) as [string, Mechanism][]) {
    for (const c of moteCases(id, mech, draw)) cases.push(c);
  }

  target.dispose();
  renderer.dispose();
  return cases;
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
  const attrs = withEveryVisibility(buildMoteAttrs(mech, mech.samplePoints(COUNT, 7)));
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
    const packed = packPartTexture(xf);
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
    const outs = PASSES.map((_, pass) => {
      uniforms.uPass.value = pass;
      return draw(c.oppositeNormals ? oppositePoints : points);
    });
    partTex.dispose();

    let err = 0;
    set.forEach((a, i) => {
      const want = mote(a, s, xf);
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

function report(cases: ParityCase[], error?: string): void {
  const body = document.getElementById('results') as HTMLTableSectionElement;
  for (const c of cases) {
    const row = body.insertRow();
    row.insertCell().textContent = c.name;
    row.insertCell().textContent = c.maxError.toExponential(2);
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
  report(run());
} catch (e) {
  report([], e instanceof Error ? e.message : String(e));
}
