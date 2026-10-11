// What a frame hands the GPU, read off a three.js scene without a renderer: the purity twin's eyes
// (src/purity/twin.ts). The shaders are pure functions of their inputs (the `?lib=` parity
// cases tie each GLSL library to its TS twin), so two frames whose inputs are equal byte for byte
// draw the same pixels, given the same renderer. The inputs are every visible draw's uniforms,
// attributes, index, textures, render state and transform, in the scene's order, and the camera.
//
// Buffers and textures reach the GPU only when three.js uploads them: when a draw that uses one is
// rendered and its `version` has moved since the last upload (`needsUpdate`). `Uploads` keeps a digest
// of what was uploaded then (two 32-bit FNV-1a hashes of the bytes, with the byte count), so a change
// made without `needsUpdate`, or made while the draw was hidden and never uploaded, shows here as it
// would on screen: stale. A digest, not a copy: a stage's buffers run to megabytes, and the twin
// builds about a hundred stages.
//
// What it reads is an allow-list, and anything outside it throws `Unmodelled`; it never reads as equal.
// - Object kinds: the exact classes in DRAW_KINDS and CONTAINER_KINDS. So an InstancedMesh, a SkinnedMesh,
//   a BatchedMesh or a Sprite throws.
// - Every object: the default layer, and three's own no-op render callbacks.
// - The scene: no background, environment, fog or override material.
// - Geometry: no morph attributes and no partial-upload ranges.
// - Materials: RawShaderMaterial or ShaderMaterial, each of whose properties is either read here or still
//   at its default. Stencil, clipping planes, tone mapping, dithering, vertex colours, blend colour,
//   lights and fog all throw once they are set.
// - Textures: DataTextures, held to the same rule.
import {
  type BufferAttribute,
  type BufferGeometry,
  type Camera,
  DataTexture,
  Group,
  type InterleavedBufferAttribute,
  Line,
  LineLoop,
  LineSegments,
  type Material,
  Mesh,
  Object3D,
  Points,
  RawShaderMaterial,
  Scene,
  ShaderMaterial,
  type Texture,
} from 'three';

/** What the reader met and does not model: it throws this rather than read the frame as equal. */
export class Unmodelled extends Error {
  constructor(what: string, feature: string) {
    super(`gpuInputs: ${what}: ${feature} is not modelled`);
  }
}

type Named = { name?: string; uuid?: string };
const nameOf = (o: Named & object): string => `${o.constructor.name} "${o.name || o.uuid}"`;

type Kind = abstract new (...args: never[]) => unknown;
/** Object classes that draw, and classes that only hold others: an object of any other class throws. */
const DRAW_KINDS: Kind[] = [Mesh, Points, Line, LineSegments, LineLoop];
const CONTAINER_KINDS: Kind[] = [Scene, Group, Object3D];
/** The material and texture classes read here: any other class throws. */
const MATERIAL_KINDS: Kind[] = [RawShaderMaterial, ShaderMaterial];
const TEXTURE_KINDS: Kind[] = [DataTexture];
/** The layer every object is on by default, the only one read here. */
const DEFAULT_LAYERS = new Object3D().layers.mask;

const isA = (x: object, kinds: Kind[]): boolean => kinds.includes(x.constructor as Kind);

function same(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
  if ('equals' in a && typeof a.equals === 'function') return (a as { equals(o: unknown): boolean }).equals(b);
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Throws unless each own enumerable property of `x` passes one of these:
 * - it is read here (`read`);
 * - it is bookkeeping that never reaches the GPU (`ignored`, or a `_private` field behind a getter that
 *   is itself read);
 * - it equals its value on a freshly built instance of the same class.
 */
function assertDefaults(x: Named & object, read: ReadonlySet<string>, ignored: ReadonlySet<string>): void {
  const fresh = new (x.constructor as new () => Record<string, unknown>)();
  for (const [k, v] of Object.entries(x)) {
    if (read.has(k) || ignored.has(k) || k.startsWith('_')) continue;
    if (!same(v, fresh[k])) throw new Unmodelled(nameOf(x), `its ${k} (set from the default)`);
  }
}

/** Throws on an object the reader does not model; true if the object draws. */
function checkObject(o: Object3D): boolean {
  const draws = isA(o, DRAW_KINDS);
  if (!draws && !isA(o, CONTAINER_KINDS)) throw new Unmodelled(nameOf(o), `the object kind ${o.constructor.name}`);
  if (o.layers.mask !== DEFAULT_LAYERS) throw new Unmodelled(nameOf(o), `the layers mask ${o.layers.mask}`);
  if (o.onBeforeRender !== Object3D.prototype.onBeforeRender) throw new Unmodelled(nameOf(o), 'an onBeforeRender');
  if (o.onAfterRender !== Object3D.prototype.onAfterRender) throw new Unmodelled(nameOf(o), 'an onAfterRender');
  const scene = o as Scene;
  if (scene.isScene) {
    for (const k of ['background', 'environment', 'fog', 'overrideMaterial'] as const) {
      if (scene[k] !== null) throw new Unmodelled(nameOf(o), `the scene's ${k}`);
    }
  }
  return draws;
}

/** Material properties read here (filled from RENDER_STATE below), and bookkeeping. */
const MATERIAL_READ = new Set<string>(['uniforms', 'defines']);
const MATERIAL_IGNORED = new Set(['uuid', 'name', 'userData', 'version', 'uniformsNeedUpdate']);
/** Texture properties read here (plainTexture and the upload), and bookkeeping. */
const TEXTURE_READ = new Set([
  'image',
  'source',
  'format',
  'type',
  'internalFormat',
  'minFilter',
  'magFilter',
  'wrapS',
  'wrapT',
  'flipY',
  'unpackAlignment',
  'generateMipmaps',
  'premultiplyAlpha',
  'colorSpace',
]);
const TEXTURE_IGNORED = new Set(['uuid', 'name', 'userData', 'version', 'pmremVersion']);

function checkMaterial(m: Material): void {
  if (!isA(m, MATERIAL_KINDS)) throw new Unmodelled(nameOf(m), `the material kind ${m.constructor.name}`);
  assertDefaults(m, MATERIAL_READ, MATERIAL_IGNORED);
}

function checkTexture(t: Texture): void {
  if (!isA(t, TEXTURE_KINDS)) throw new Unmodelled(nameOf(t), `the texture kind ${t.constructor.name}`);
  assertDefaults(t, TEXTURE_READ, TEXTURE_IGNORED);
}

function checkGeometry(o: Object3D, g: BufferGeometry): void {
  for (const [k, list] of Object.entries(g.morphAttributes)) {
    if (list.length > 0) throw new Unmodelled(nameOf(o), `the morph attribute ${k}`);
  }
  for (const [k, a] of Object.entries(g.attributes)) {
    const ranges = (a as BufferAttribute).updateRanges;
    if (ranges && ranges.length > 0) throw new Unmodelled(nameOf(o), `partial uploads (updateRanges) of ${k}`);
  }
}

/** A plain value: numbers compared with Object.is; bytes as their digest (`digestOf`). */
export type Plain = number | string | boolean | null | Plain[] | { [key: string]: Plain };

type Uploadable = { version: number } & ({ array: ArrayLike<number> & ArrayBufferView } | Texture);

/** The byte count and a 64-bit digest of a view's bytes: two FNV-1a hashes, words at a time where aligned. */
export function digestOf(view: ArrayBufferView): string {
  let a = 0x811c9dc5;
  let b = 0x01000193;
  const mix = (w: number): void => {
    a = Math.imul(a ^ w, 0x01000193) >>> 0;
    b = Math.imul(b ^ w, 0x5bd1e995) >>> 0;
    b = (b ^ (b >>> 15)) >>> 0;
  };
  if (view.byteOffset % 4 === 0 && view.byteLength % 4 === 0) {
    const words = new Uint32Array(view.buffer, view.byteOffset, view.byteLength / 4);
    for (let i = 0; i < words.length; i++) mix(words[i]);
  } else {
    const bytes = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
    for (let i = 0; i < bytes.length; i++) mix(bytes[i]);
  }
  return `${view.byteLength} bytes #${a.toString(16).padStart(8, '0')}${b.toString(16).padStart(8, '0')}`;
}

/** The GPU's copy of each buffer and texture, as three.js would have uploaded it. */
export class Uploads {
  private readonly copies = new WeakMap<object, { version: number; digest: string }>();

  /** Uploads what a render of `scene` would: the buffers and textures of its visible draws whose version moved. */
  render(scene: Object3D): void {
    scene.traverseVisible((o) => {
      const draw = drawOf(o);
      if (!draw) return;
      for (const a of attributesOf(draw.geometry)) this.upload(sourceOf(a));
      for (const t of texturesOf(draw.material)) this.upload(t);
    });
  }

  /** The digest of what the GPU holds for `source`: its last upload, or null before any. */
  held(source: Uploadable): string | null {
    return this.copies.get(source)?.digest ?? null;
  }

  private upload(source: Uploadable): void {
    const seen = this.copies.get(source);
    // three.js (WebGLAttributes.update, WebGLTextures.setTexture2D) uploads when the version moved;
    // a texture at version 0 has never been flagged and is not uploaded at all.
    if (seen && seen.version === source.version) return;
    if ('isTexture' in source && source.version === 0) return;
    this.copies.set(source, { version: source.version, digest: digestOf(viewOf(source)) });
  }
}

interface Draw {
  object: Object3D;
  geometry: BufferGeometry;
  material: Material;
}

function drawOf(o: Object3D): Draw | null {
  if (!checkObject(o)) return null;
  const m = o as Mesh;
  if (Array.isArray(m.material)) throw new Unmodelled(nameOf(o), 'several materials');
  checkMaterial(m.material);
  checkGeometry(o, m.geometry);
  return { object: o, geometry: m.geometry, material: m.material };
}

function attributesOf(geometry: BufferGeometry): (BufferAttribute | InterleavedBufferAttribute)[] {
  const out = Object.values(geometry.attributes) as (BufferAttribute | InterleavedBufferAttribute)[];
  if (geometry.index) out.push(geometry.index);
  return out;
}

function sourceOf(a: BufferAttribute | InterleavedBufferAttribute): Uploadable {
  return (a as InterleavedBufferAttribute).isInterleavedBufferAttribute ? (a as InterleavedBufferAttribute).data : (a as BufferAttribute);
}

function viewOf(source: Uploadable): ArrayBufferView {
  if ('isTexture' in source) {
    const data = (source.image as { data?: unknown } | null)?.data;
    if (!ArrayBuffer.isView(data)) throw new Unmodelled(nameOf(source), 'a texture with no data array');
    return data;
  }
  return source.array;
}

function texturesOf(material: Material): Texture[] {
  const out: Texture[] = [];
  const uniforms = (material as ShaderMaterial).uniforms ?? {};
  const visit = (v: unknown): void => {
    if (v && typeof v === 'object' && (v as Texture).isTexture) {
      checkTexture(v as Texture);
      out.push(v as Texture);
    }
    else if (Array.isArray(v)) v.forEach(visit);
  };
  for (const u of Object.values(uniforms)) visit(u.value);
  return out;
}

/** A uniform's value as the renderer sends it. */
function plainValue(v: unknown, uploads: Uploads, at: string): Plain {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') return v;
  if (Array.isArray(v)) return v.map((x, i) => plainValue(x, uploads, `${at}[${i}]`));
  if (ArrayBuffer.isView(v)) return digestOf(v);
  const o = v as Record<string, unknown>;
  if ((o as unknown as Texture).isTexture) return plainTexture(o as unknown as Texture, uploads);
  // Vectors, colours and matrices: their components.
  if ('elements' in o) return Array.from(o.elements as ArrayLike<number>);
  if ('isColor' in o) return [o.r, o.g, o.b] as number[];
  if ('isVector2' in o) return [o.x, o.y] as number[];
  if ('isVector3' in o) return [o.x, o.y, o.z] as number[];
  if ('isVector4' in o || 'isQuaternion' in o) return [o.x, o.y, o.z, o.w] as number[];
  throw new Unmodelled(`uniform ${at}`, 'a value of this kind');
}

function plainTexture(t: Texture, uploads: Uploads): Plain {
  const image = t.image as { width?: number; height?: number; depth?: number } | null;
  return {
    data: uploads.held(t),
    width: image?.width ?? null,
    height: image?.height ?? null,
    depth: image?.depth ?? null,
    format: t.format,
    type: t.type,
    internalFormat: t.internalFormat,
    minFilter: t.minFilter,
    magFilter: t.magFilter,
    wrap: [t.wrapS, t.wrapT],
    flipY: t.flipY,
    unpackAlignment: t.unpackAlignment,
    generateMipmaps: t.generateMipmaps,
    premultiplyAlpha: t.premultiplyAlpha,
    colorSpace: t.colorSpace,
  };
}

const RENDER_STATE = [
  'type',
  'visible',
  'transparent',
  'opacity',
  'blending',
  'blendSrc',
  'blendDst',
  'blendEquation',
  'blendSrcAlpha',
  'blendDstAlpha',
  'blendEquationAlpha',
  'premultipliedAlpha',
  'depthTest',
  'depthWrite',
  'depthFunc',
  'side',
  'colorWrite',
  'alphaTest',
  'alphaToCoverage',
  'polygonOffset',
  'polygonOffsetFactor',
  'polygonOffsetUnits',
  'wireframe',
  'glslVersion',
  'vertexShader',
  'fragmentShader',
] as const;
for (const k of RENDER_STATE) MATERIAL_READ.add(k);

function plainMaterial(material: Material, uploads: Uploads): Plain {
  const m = material as ShaderMaterial & Record<string, unknown>;
  const out: { [key: string]: Plain } = {};
  for (const k of RENDER_STATE) out[k] = plainValue(m[k] ?? null, uploads, k);
  out.defines = JSON.parse(JSON.stringify(m.defines ?? {})) as Plain;
  const uniforms: { [key: string]: Plain } = {};
  for (const [name, u] of Object.entries(m.uniforms ?? {}).sort(([a], [b]) => (a < b ? -1 : 1))) uniforms[name] = plainValue(u.value, uploads, name);
  out.uniforms = uniforms;
  return out;
}

function plainGeometry(g: BufferGeometry, uploads: Uploads): Plain {
  const attributes: { [key: string]: Plain } = {};
  for (const [name, a] of Object.entries(g.attributes).sort(([x], [y]) => (x < y ? -1 : 1))) {
    const attr = a as BufferAttribute & { meshPerAttribute?: number; offset?: number };
    attributes[name] = {
      data: uploads.held(sourceOf(attr)),
      itemSize: attr.itemSize,
      normalized: attr.normalized,
      offset: attr.offset ?? 0,
      meshPerAttribute: attr.meshPerAttribute ?? null,
    };
  }
  const instanceCount = (g as { instanceCount?: number }).instanceCount;
  return {
    attributes,
    index: g.index ? uploads.held(g.index) : null,
    drawRange: [g.drawRange.start, g.drawRange.count],
    groups: g.groups.map((x) => [x.start, x.count, x.materialIndex ?? 0]),
    instanceCount: instanceCount === undefined || !Number.isFinite(instanceCount) ? null : instanceCount,
  };
}

/**
 * Everything the GPU receives for a render of `scene` from `camera`, after `uploads.render(scene)`:
 * per visible draw (in scene order, by name) its transform, render order, geometry and material.
 */
export function gpuInputs(scene: Object3D, camera: Camera, uploads: Uploads): Plain {
  if (camera.layers.mask !== DEFAULT_LAYERS) throw new Unmodelled(nameOf(camera), `the camera's layers mask ${camera.layers.mask}`);
  scene.updateMatrixWorld();
  camera.updateMatrixWorld();
  // Keyed by place and name, so a draw missing from one frame reads as such.
  const draws: { [key: string]: Plain } = {};
  scene.traverseVisible((o) => {
    const draw = drawOf(o);
    if (!draw) return;
    draws[`${Object.keys(draws).length} ${o.name || o.type}`] = {
      name: o.name,
      renderOrder: o.renderOrder,
      frustumCulled: o.frustumCulled,
      matrixWorld: Array.from(o.matrixWorld.elements),
      geometry: plainGeometry(draw.geometry, uploads),
      material: plainMaterial(draw.material, uploads),
    };
  });
  const view = (camera as { view?: unknown }).view;
  return {
    camera: {
      projection: Array.from(camera.projectionMatrix.elements),
      worldInverse: Array.from(camera.matrixWorldInverse.elements),
      view: view ? (JSON.parse(JSON.stringify(view)) as Plain) : null,
    },
    draws,
  };
}

/** The paths at which `a` and `b` differ (numbers by Object.is, bytes by their digests), at most `max`. */
export function differences(a: Plain, b: Plain, max = 8, at = ''): string[] {
  const out: string[] = [];
  const walk = (x: Plain, y: Plain, path: string): void => {
    if (out.length >= max) return;
    if (Array.isArray(x) || Array.isArray(y)) {
      if (!(Array.isArray(x) && Array.isArray(y)) || x.length !== y.length) {
        out.push(`${path}: ${describe(x)} vs ${describe(y)}`);
        return;
      }
      x.forEach((v, i) => walk(v, y[i], `${path}[${i}]`));
      return;
    }
    if (x !== null && y !== null && typeof x === 'object' && typeof y === 'object') {
      const keys = [...new Set([...Object.keys(x), ...Object.keys(y)])];
      for (const k of keys) walk(x[k] ?? null, y[k] ?? null, path === '' ? k : `${path}.${k}`);
      return;
    }
    if (!Object.is(x, y)) out.push(`${path}: ${describe(x)} vs ${describe(y)}`);
  };
  walk(a, b, at);
  return out;
}

function describe(v: Plain): string {
  if (typeof v === 'string') return v.length > 48 ? `"${v.slice(0, 48)}…"` : `"${v}"`;
  if (Array.isArray(v)) return `[${v.length} items]`;
  return String(v);
}
