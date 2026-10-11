// The purity twin's own checks (twin.ts; the rewind tests, and that they are not vacuous, are in
// rewind.<scene>.test.ts): the grid is whole, each scene is fenced, gpuInputs reads what the GPU holds,
// and it throws on every kind and input it does not model.
import {
  BatchedMesh,
  BufferAttribute,
  BufferGeometry,
  type Camera,
  Color,
  DataArrayTexture,
  DataTexture,
  EquirectangularReflectionMapping,
  FloatType,
  Fog,
  Group,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  InstancedMesh,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PerspectiveCamera,
  Plane,
  PointLight,
  Points,
  PointsMaterial,
  RGBAFormat,
  RawShaderMaterial,
  Scene,
  ShaderMaterial,
  SkinnedMesh,
  Sprite,
  Texture,
} from 'three';
import { describe, expect, it } from 'vitest';
import { differences, digestOf, gpuInputs, Uploads } from './gpuInputs';
import { PURITY_SAMPLES } from './samples';
import { SCENES, samplesOf } from './twin';

describe('the purity twin', () => {
  it('splits the grid over its scenes, every sample in exactly one, and the browser fences each scene', () => {
    const covered = Object.keys(SCENES).flatMap((scene) => samplesOf(scene).map((s) => s.name));
    expect(covered.sort()).toEqual(PURITY_SAMPLES.map((s) => s.name).sort());
    expect(new Set(covered).size).toBe(PURITY_SAMPLES.length);
    for (const scene of Object.keys(SCENES)) {
      const fenced = samplesOf(scene).filter((s) => s.fence).length;
      expect(fenced, scene).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('gpuInputs reads what the GPU holds', () => {
  const pathsOf = (diffs: string[]): string[] => diffs.map((d) => d.slice(0, d.indexOf(': ')));

  function scene(): { root: Group; geo: InstancedBufferGeometry; attr: InstancedBufferAttribute; tex: DataTexture; mat: RawShaderMaterial; camera: PerspectiveCamera } {
    const attr = new InstancedBufferAttribute(new Float32Array([1, 2, 3, 4]), 1);
    const geo = new InstancedBufferGeometry();
    geo.setAttribute('aOne', attr);
    geo.instanceCount = 4;
    const tex = new DataTexture(new Float32Array(4), 1, 1, RGBAFormat, FloatType);
    tex.needsUpdate = true;
    const mat = new RawShaderMaterial({ uniforms: { uX: { value: 1 }, uTex: { value: tex } } });
    const root = new Group();
    root.add(new Mesh(geo, mat));
    return { root, geo, attr, tex, mat, camera: new PerspectiveCamera() };
  }

  it('an attribute or texture changed without needsUpdate reads as the GPU holds it: stale', () => {
    const s = scene();
    const uploads = new Uploads();
    uploads.render(s.root);
    const before = gpuInputs(s.root, s.camera, uploads);
    s.attr.array[0] = 9;
    (s.tex.image.data as Float32Array)[0] = 9;
    uploads.render(s.root);
    expect(differences(before, gpuInputs(s.root, s.camera, uploads))).toEqual([]);
    s.attr.needsUpdate = true;
    s.tex.needsUpdate = true;
    uploads.render(s.root);
    expect(pathsOf(differences(before, gpuInputs(s.root, s.camera, uploads)))).toEqual([
      'draws.0 Mesh.geometry.attributes.aOne.data',
      'draws.0 Mesh.material.uniforms.uTex.data',
    ]);
  });

  it('a change flagged while the draw is hidden reaches the GPU only when it is drawn again', () => {
    const s = scene();
    const uploads = new Uploads();
    uploads.render(s.root);
    const before = gpuInputs(s.root, s.camera, uploads);
    s.root.visible = false;
    s.attr.array[1] = 7;
    s.attr.needsUpdate = true;
    uploads.render(s.root);
    s.root.visible = true;
    expect(differences(before, gpuInputs(s.root, s.camera, uploads))).toEqual([]);
    uploads.render(s.root);
    expect(pathsOf(differences(before, gpuInputs(s.root, s.camera, uploads)))).toEqual(['draws.0 Mesh.geometry.attributes.aOne.data']);
  });

  it('digests bytes by their content: equal bytes the same, one changed byte or a different length not', () => {
    const one = new Float32Array([1, 2, 3, 4]);
    expect(digestOf(one)).toBe(digestOf(new Float32Array([1, 2, 3, 4])));
    expect(digestOf(one)).toMatch(/^16 bytes #[0-9a-f]{16}$/);
    for (let i = 0; i < 16; i++) {
      const bytes = new Uint8Array(one.buffer.slice(0));
      bytes[i] ^= 1;
      expect(digestOf(bytes), `byte ${i}`).not.toBe(digestOf(new Uint8Array(one.buffer)));
    }
    expect(digestOf(one.subarray(1))).not.toBe(digestOf(one));
    // An unaligned view is read byte by byte, and still by its content.
    const odd = new Uint8Array(new ArrayBuffer(9), 1, 7);
    odd.set([1, 2, 3, 4, 5, 6, 7]);
    expect(digestOf(odd)).toBe(digestOf(Uint8Array.from([1, 2, 3, 4, 5, 6, 7])));
  });

  it('reads uniforms, render state, instance counts and the camera', () => {
    const s = scene();
    const uploads = new Uploads();
    uploads.render(s.root);
    const before = gpuInputs(s.root, s.camera, uploads);
    s.mat.uniforms.uX.value = 2;
    s.mat.depthWrite = false;
    s.geo.instanceCount = 3;
    s.camera.position.x = 1;
    expect(differences(before, gpuInputs(s.root, s.camera, uploads), 20)).toEqual([
      'camera.worldInverse[12]: 0 vs -1',
      'draws.0 Mesh.geometry.instanceCount: 4 vs 3',
      'draws.0 Mesh.material.depthWrite: true vs false',
      'draws.0 Mesh.material.uniforms.uX: 1 vs 2',
    ]);
  });

  it("reads the camera's view offset itself, not only the projection it sets", () => {
    const s = scene();
    const uploads = new Uploads();
    uploads.render(s.root);
    const before = gpuInputs(s.root, s.camera, uploads);
    s.camera.setViewOffset(2, 1, 0.25, 0, 2, 1);
    const offset = gpuInputs(s.root, s.camera, uploads);
    expect(differences(before, offset, 40).some((d) => d.startsWith('camera.view'))).toBe(true);
    // An offset changed in place, its projection not updated yet: only the view reads it.
    s.camera.view!.offsetX = 0.5;
    expect(differences(offset, gpuInputs(s.root, s.camera, uploads))).toEqual(['camera.view.offsetX: 0.25 vs 0.5']);
  });
});

describe('gpuInputs throws on what it does not model, rather than read it as equal', () => {
  const tri = (): BufferGeometry => new BufferGeometry().setAttribute('position', new BufferAttribute(new Float32Array(9), 3));
  const raw = (uniforms: Record<string, { value: unknown }> = {}): RawShaderMaterial => new RawShaderMaterial({ uniforms });
  const dataTexture = (): DataTexture => new DataTexture(new Float32Array(4), 1, 1, RGBAFormat, FloatType);

  /** Reads `root` as the twin does: an upload pass, then the read, from `camera`. */
  function read(root: Object3D, camera: Camera = new PerspectiveCamera()): void {
    const uploads = new Uploads();
    uploads.render(root);
    gpuInputs(root, camera, uploads);
  }
  const holding = (...objects: Object3D[]): Scene => {
    const s = new Scene();
    s.add(...objects);
    return s;
  };

  it('reads a scene of the kinds it models without a throw', () => {
    const tex = dataTexture();
    tex.needsUpdate = true;
    const group = new Group();
    group.add(new Mesh(tri(), raw({ uTex: { value: tex } })), new Points(tri(), new ShaderMaterial()), new LineSegments(tri(), raw()));
    expect(() => read(holding(group, new Object3D()))).not.toThrow();
  });

  it.each([
    ['Sprite', () => new Sprite()],
    ['InstancedMesh', () => new InstancedMesh(tri(), raw(), 2)],
    ['SkinnedMesh', () => new SkinnedMesh(tri(), raw())],
    ['BatchedMesh', () => new BatchedMesh(1, 3, 0, raw())],
    ['a Mesh subclass', () => new (class Custom extends Mesh {})(tri(), raw())],
    ['a light', () => new PointLight()],
  ])('an object kind it does not read: %s', (_, make) => {
    expect(() => read(holding(make()))).toThrow(/the object kind/);
  });

  it('an object on another layer', () => {
    const m = new Mesh(tri(), raw());
    m.layers.set(2);
    expect(() => read(holding(m))).toThrow(/the layers mask 4/);
  });

  it('a camera that sees another layer', () => {
    const camera = new PerspectiveCamera();
    camera.layers.enable(3);
    expect(() => read(holding(new Mesh(tri(), raw())), camera)).toThrow(/the camera's layers mask/);
  });

  it.each(['onBeforeRender', 'onAfterRender'] as const)('an object with its own %s', (hook) => {
    const m = new Mesh(tri(), raw());
    m[hook] = () => {};
    expect(() => read(holding(m))).toThrow(new RegExp(`an ${hook}`));
  });

  it.each([
    ['background', (s: Scene) => (s.background = new Color(1, 0, 0))],
    ['environment', (s: Scene) => (s.environment = dataTexture())],
    ['fog', (s: Scene) => (s.fog = new Fog(0xffffff))],
    ['overrideMaterial', (s: Scene) => (s.overrideMaterial = raw())],
  ])("a scene's %s", (k, set) => {
    const s = holding(new Mesh(tri(), raw()));
    set(s);
    expect(() => read(s)).toThrow(new RegExp(`the scene's ${k}`));
  });

  it('a morph target', () => {
    const g = tri();
    g.morphAttributes.position = [new BufferAttribute(new Float32Array(9), 3)];
    expect(() => read(holding(new Mesh(g, raw())))).toThrow(/the morph attribute position/);
  });

  it('a partial upload range', () => {
    const g = tri();
    (g.getAttribute('position') as BufferAttribute).addUpdateRange(0, 3);
    expect(() => read(holding(new Mesh(g, raw())))).toThrow(/partial uploads \(updateRanges\) of position/);
  });

  it('several materials on one draw', () => {
    expect(() => read(holding(new Mesh(tri(), [raw(), raw()])))).toThrow(/several materials/);
  });

  it.each([
    ['MeshBasicMaterial', () => new MeshBasicMaterial()],
    ['PointsMaterial', () => new PointsMaterial()],
  ])('a material kind it does not read: %s', (_, make) => {
    expect(() => read(holding(new Mesh(tri(), make())))).toThrow(/the material kind/);
  });

  it.each([
    ['stencilWrite', (m: RawShaderMaterial) => (m.stencilWrite = true)],
    ['stencilRef', (m: RawShaderMaterial) => (m.stencilRef = 1)],
    ['clippingPlanes', (m: RawShaderMaterial) => (m.clippingPlanes = [new Plane()])],
    ['toneMapped', (m: RawShaderMaterial) => (m.toneMapped = false)],
    ['dithering', (m: RawShaderMaterial) => (m.dithering = true)],
    ['vertexColors', (m: RawShaderMaterial) => (m.vertexColors = true)],
    ['blendColor', (m: RawShaderMaterial) => m.blendColor.set(1, 0, 0)],
    ['blendAlpha', (m: RawShaderMaterial) => (m.blendAlpha = 0.5)],
    // A ShaderMaterial is built single-pass; two-pass is the change.
    ['forceSinglePass', (m: RawShaderMaterial) => (m.forceSinglePass = false)],
    ['lights', (m: RawShaderMaterial) => (m.lights = true)],
    ['fog', (m: RawShaderMaterial) => (m.fog = true)],
    ['clipping', (m: RawShaderMaterial) => (m.clipping = true)],
    ['onBeforeCompile', (m: RawShaderMaterial) => (m.onBeforeCompile = () => {})],
  ])('a material property it does not read, set from its default: %s', (k, set) => {
    const m = raw();
    set(m);
    expect(() => read(holding(new Mesh(tri(), m)))).toThrow(new RegExp(`its ${k} \\(set from the default\\)`));
  });

  it.each([
    ['Texture', () => new Texture()],
    ['DataArrayTexture', () => new DataArrayTexture(new Float32Array(4), 1, 1, 1)],
  ])('a texture kind it does not read: %s', (_, make) => {
    const t = make();
    t.needsUpdate = true;
    expect(() => read(holding(new Mesh(tri(), raw({ uTex: { value: t } }))))).toThrow(/the texture kind/);
  });

  it.each([
    ['anisotropy', (t: DataTexture) => (t.anisotropy = 4)],
    ['offset', (t: DataTexture) => t.offset.set(0.5, 0)],
    ['mapping', (t: DataTexture) => (t.mapping = EquirectangularReflectionMapping)],
  ])('a texture property it does not read, set from its default: %s', (k, set) => {
    const t = dataTexture();
    set(t);
    t.needsUpdate = true;
    expect(() => read(holding(new Mesh(tri(), raw({ uTex: { value: t } }))))).toThrow(new RegExp(`its ${k} \\(set from the default\\)`));
  });

  it('a texture with no data array', () => {
    const t = new DataTexture(null, 1, 1);
    t.needsUpdate = true;
    expect(() => read(holding(new Mesh(tri(), raw({ uTex: { value: t } }))))).toThrow(/a texture with no data array/);
  });

  it('a uniform value of a kind it does not read', () => {
    expect(() => read(holding(new Mesh(tri(), raw({ uOdd: { value: { a: 1 } } }))))).toThrow(/uniform uOdd: a value of this kind/);
  });
});
