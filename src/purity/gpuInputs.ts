// What a frame hands the GPU, read off a three.js scene without a renderer: the purity twin's eyes
// (src/purity/twin.ts). The shaders are pure functions of their inputs (the `?lib=` parity
// cases tie each GLSL library to its TS twin), so two frames whose inputs are equal byte for byte
// draw the same pixels, given the same renderer. The inputs are every visible draw's uniforms,
// attributes, index, textures, render state and transform, in the scene's order, and the camera.
//
// Buffers and textures reach the GPU only when three.js uploads them: when a draw that uses one is
// rendered and its `version` has moved since the last upload (`needsUpdate`). `Uploads` keeps that
// copy, so a change made without `needsUpdate`, or made while the draw was hidden and never uploaded,
// shows here as it would on screen: stale.
import {
  type BufferAttribute,
  type BufferGeometry,
  type Camera,
  type InterleavedBufferAttribute,
  type Material,
  type Mesh,
  type Object3D,
  type ShaderMaterial,
  type Texture,
} from 'three';

/** A plain value: numbers compared with Object.is, bytes compared byte for byte. */
export type Plain = number | string | boolean | null | Uint8Array | Plain[] | { [key: string]: Plain };

type Uploadable = { version: number } & ({ array: ArrayLike<number> & ArrayBufferView } | Texture);

function bytesOf(view: ArrayBufferView): Uint8Array {
  return new Uint8Array(view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength));
}

/** The GPU's copy of each buffer and texture, as three.js would have uploaded it. */
export class Uploads {
  private readonly copies = new WeakMap<object, { version: number; bytes: Uint8Array }>();

  /** Uploads what a render of `scene` would: the buffers and textures of its visible draws whose version moved. */
  render(scene: Object3D): void {
    scene.traverseVisible((o) => {
      const draw = drawOf(o);
      if (!draw) return;
      for (const a of attributesOf(draw.geometry)) this.upload(sourceOf(a));
      for (const t of texturesOf(draw.material)) this.upload(t);
    });
  }

  /** What the GPU holds for `source`: its last upload, or null before any. */
  held(source: Uploadable): Uint8Array | null {
    return this.copies.get(source)?.bytes ?? null;
  }

  private upload(source: Uploadable): void {
    const seen = this.copies.get(source);
    // three.js (WebGLAttributes.update, WebGLTextures.setTexture2D) uploads when the version moved;
    // a texture at version 0 has never been flagged and is not uploaded at all.
    if (seen && seen.version === source.version) return;
    if ('isTexture' in source && source.version === 0) return;
    this.copies.set(source, { version: source.version, bytes: bytesOf(viewOf(source)) });
  }
}

interface Draw {
  object: Object3D;
  geometry: BufferGeometry;
  material: Material;
}

function drawOf(o: Object3D): Draw | null {
  const m = o as Mesh;
  if (!(m.isMesh || (o as { isPoints?: boolean }).isPoints || (o as { isLine?: boolean }).isLine)) return null;
  if (Array.isArray(m.material)) throw new Error(`gpuInputs: ${o.name || o.type} has several materials; not supported`);
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
    if (!ArrayBuffer.isView(data)) throw new Error(`gpuInputs: texture ${source.name || source.uuid} holds no data array; not supported`);
    return data;
  }
  return source.array;
}

function texturesOf(material: Material): Texture[] {
  const out: Texture[] = [];
  const uniforms = (material as ShaderMaterial).uniforms ?? {};
  const visit = (v: unknown): void => {
    if (v && typeof v === 'object' && (v as Texture).isTexture) out.push(v as Texture);
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
  if (ArrayBuffer.isView(v)) return bytesOf(v);
  const o = v as Record<string, unknown>;
  if ((o as unknown as Texture).isTexture) return plainTexture(o as unknown as Texture, uploads);
  // Vectors, colours and matrices: their components.
  if ('elements' in o) return Array.from(o.elements as ArrayLike<number>);
  if ('isColor' in o) return [o.r, o.g, o.b] as number[];
  if ('isVector2' in o) return [o.x, o.y] as number[];
  if ('isVector3' in o) return [o.x, o.y, o.z] as number[];
  if ('isVector4' in o || 'isQuaternion' in o) return [o.x, o.y, o.z, o.w] as number[];
  throw new Error(`gpuInputs: uniform ${at} has a value of an unknown kind`);
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

/** The paths at which `a` and `b` differ (numbers by Object.is, bytes byte for byte), at most `max`. */
export function differences(a: Plain, b: Plain, max = 8, at = ''): string[] {
  const out: string[] = [];
  const walk = (x: Plain, y: Plain, path: string): void => {
    if (out.length >= max) return;
    if (x instanceof Uint8Array || y instanceof Uint8Array) {
      if (!(x instanceof Uint8Array && y instanceof Uint8Array)) out.push(`${path}: ${describe(x)} vs ${describe(y)}`);
      else if (x.length !== y.length) out.push(`${path}: ${x.length} bytes vs ${y.length}`);
      else {
        const k = firstDifference(x, y);
        if (k >= 0) out.push(`${path}: bytes differ from byte ${k}`);
      }
      return;
    }
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

function firstDifference(x: Uint8Array, y: Uint8Array): number {
  for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return i;
  return -1;
}

function describe(v: Plain): string {
  if (v instanceof Uint8Array) return `${v.length} bytes`;
  if (typeof v === 'string') return v.length > 40 ? `"${v.slice(0, 40)}…"` : `"${v}"`;
  if (Array.isArray(v)) return `[${v.length} items]`;
  return String(v);
}
