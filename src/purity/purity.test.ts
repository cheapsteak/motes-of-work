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
import { HOLE_PARTS, holePartCount } from '../scene/hole/holeFrame';
import type { Stage } from '../scene/stage';
import { differences, digestOf, gpuInputs, Uploads, type Plain } from './gpuInputs';
import { PURITY_SAMPLES } from './samples';
import { drawStep, freshStage, held, SCENES, SCREEN_TIER, SHARED_INPUTS, samplesOf, spans } from './twin';

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

describe('the stages the twin drives', () => {
  /** Every uniform (and its value), buffer and texture a stage's draws hold, its galaxy built. */
  function heldBy(stage: Stage): Set<object> {
    stage.buildGalaxy(SCREEN_TIER);
    const out = new Set<object>();
    stage.scene.traverse((o) => {
      const m = o as Mesh;
      if (!m.isMesh && !(o as Points).isPoints && !(o as LineSegments).isLine) return;
      for (const a of Object.values(m.geometry.attributes)) out.add(a);
      if (m.geometry.index) out.add(m.geometry.index);
      for (const material of [m.material].flat())
        for (const u of Object.values((material as ShaderMaterial).uniforms ?? {})) {
          out.add(u);
          if (u.value !== null && typeof u.value === 'object') out.add(u.value as object);
        }
    });
    return out;
  }

  // Measured: two stages and their galaxies, 1.5 s alone.
  it('gives every stage its own uniforms, buffers and textures: two share none, the hole’s shadow among them, but the StageInputs the rewind files fingerprint and frozen constants', { timeout: 60_000 }, () => {
    const a = freshStage();
    const b = freshStage();
    const [x, y] = [heldBy(a), heldBy(b)];
    // Not vacuous: the shadow every galaxy material reads is among what each holds, and so are the inputs shared.
    expect(x.has(a.shadow) && y.has(b.shadow)).toBe(true);
    const inputs = new Set<object>(Object.values(SHARED_INPUTS.motes!.instanced));
    expect([...x].filter((o) => inputs.has(o)).length).toBe(inputs.size);
    const both = [...x].filter((o) => y.has(o) && !inputs.has(o) && !Object.isFrozen(o));
    expect(both.map((o) => (o as { constructor: { name: string } }).constructor.name)).toEqual([]);
  });

  // Measured: one stage drawn once, 0.9 s alone.
  it('reads the hole’s draws as three.js uploads them: each part’s instanced quads and count, and the shadow the background, the hole and the bodies share', { timeout: 60_000 }, () => {
    const sample = PURITY_SAMPLES.find((s) => s.scene === 'hole' && s.fence)!;
    const stage = freshStage();
    const uploads = new Uploads();
    drawStep(stage, { p: sample.p(spans), ambient: held(sample) });
    uploads.render(stage.scene);
    const read = gpuInputs(stage.scene, stage.camera, uploads) as { draws: Record<string, { name: string; geometry: Plain; material: { uniforms: Record<string, Plain> } }> };
    const draws = Object.values(read.draws);
    const galaxy = stage.galaxy()!;
    // Every part is drawn at the hole close, in HOLE_PARTS's order.
    const parts = draws.filter((d) => d.name.startsWith('hole-'));
    expect(parts.map((d) => d.name)).toEqual(HOLE_PARTS.map((p) => p.name));
    for (const p of HOLE_PARTS) {
      const mesh = galaxy.hole.object.getObjectByName(p.name) as Mesh;
      const attrs = mesh.geometry.attributes;
      const instanced = (name: string) => ({ data: digestOf(attrs[name].array), itemSize: 4, normalized: false, offset: 0, meshPerAttribute: 1 });
      expect(parts.find((d) => d.name === p.name)!.geometry, p.name).toEqual({
        attributes: {
          aCorner: { data: digestOf(attrs.aCorner.array), itemSize: 2, normalized: false, offset: 0, meshPerAttribute: null },
          aHoleA: instanced('aHoleA'),
          aHoleB: instanced('aHoleB'),
          ...(attrs.aHoleC ? { aHoleC: instanced('aHoleC') } : {}),
        },
        index: digestOf(mesh.geometry.index!.array),
        drawRange: [0, Infinity],
        groups: [],
        instanceCount: holePartCount(p.key),
      });
    }
    // The shadow is up there, and every galaxy draw reads the stage's own: the hole's, the background's and the bodies'.
    const s = stage.shadow.value;
    expect(s.z).toBeGreaterThan(0);
    const namesIn = (o: Object3D): Set<string> => {
      const out = new Set<string>();
      o.traverse((c) => c !== o && out.add(c.name));
      return out;
    };
    for (const [system, names] of [
      ['hole', namesIn(galaxy.hole.object)],
      ['background', namesIn(galaxy.background.object)],
      ['bodies', namesIn(galaxy.bodies.object)],
    ] as const) {
      const shading = draws.filter((d) => names.has(d.name));
      expect(shading.length, system).toBeGreaterThan(0);
      for (const d of shading) expect(d.material.uniforms.uShadow, `${system}: ${d.name}`).toEqual([s.x, s.y, s.z]);
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

describe("the plan's schematic fence (re-skin Task 7b)", () => {
  // Measured: one stage drawn once, 1 s alone.
  it('draws H and R at the fence the browser renders, the frame laid out in the table the GPU holds', { timeout: 60_000 }, () => {
    const sample = PURITY_SAMPLES.find((s) => s.section === 'reviewer' && s.fence)!;
    const stage = freshStage();
    const uploads = new Uploads();
    drawStep(stage, { p: sample.p(spans), ambient: held(sample) });
    uploads.render(stage.scene);
    const stats = stage.galaxy()!.bodies.plan();
    expect(stats.dots).toBeGreaterThan(1000);
    // H's marks and R's: re-2's star lamp lights P5's system alone, so it is whole in R (no dark neighbour
    // takes a place in R: plan.ts planFrameOf ranks the drawn sizes). At 149 px its outline's equator
    // and its graduations are coming in (140 -> 180), and its chevrons have left (PlanLeave, 75 -> 105).
    for (const mark of ['arc', 'node', 'deviation', 'bandEdge', 'stalk', 'outlineEq', 'outlineMer', 'graduation', 'silhouette']) expect(stats.byMark[mark], mark).toBeGreaterThan(0);
    expect(stats.slots[1], 'P5’s system alone in R').toBe(-1);
    // Both meshes draw over the one table, as the frame laid it out (uploaded, not stale).
    const read = gpuInputs(stage.scene, stage.camera, uploads) as { draws: Record<string, { name: string; material: { uniforms: Record<string, { data: Plain }> } }> };
    const plans = Object.values(read.draws).filter((d) => d.name.startsWith('net-plan'));
    expect(plans.map((d) => d.name).sort()).toEqual(['net-plan', 'net-plan-screen']);
    const mesh = stage.galaxy()!.bodies.object.getObjectByName('net-plan') as Mesh;
    const table = ((mesh.material as RawShaderMaterial).uniforms.uPlanTex.value as DataTexture).image.data as Float32Array;
    for (const d of plans) expect(d.material.uniforms.uPlanTex.data, d.name).toBe(digestOf(table));
  });
});
