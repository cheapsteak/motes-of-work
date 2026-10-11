// The purity twin's own checks (twin.ts; the rewind tests, and that they are not vacuous, are in
// rewind.<scene>.test.ts): the grid is whole, each scene is fenced, and gpuInputs reads what the GPU holds.
import { DataTexture, FloatType, Group, InstancedBufferAttribute, InstancedBufferGeometry, Mesh, PerspectiveCamera, RGBAFormat, RawShaderMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { differences, gpuInputs, Uploads } from './gpuInputs';
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
    // float32 1 and 9 first differ in their third byte (little-endian).
    expect(differences(before, gpuInputs(s.root, s.camera, uploads))).toEqual([
      'draws.0 Mesh.geometry.attributes.aOne.data: bytes differ from byte 2',
      'draws.0 Mesh.material.uniforms.uTex.data: bytes differ from byte 2',
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
    // float32 2 and 7 first differ in the second value's third byte.
    expect(differences(before, gpuInputs(s.root, s.camera, uploads))).toEqual(['draws.0 Mesh.geometry.attributes.aOne.data: bytes differ from byte 6']);
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
});
