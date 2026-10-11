import {
  AdditiveBlending,
  CustomBlending,
  OneFactor,
  OneMinusSrcColorFactor,
  PerspectiveCamera,
  type DataTexture,
  type InstancedBufferAttribute,
  type Mesh,
  type RawShaderMaterial,
} from 'three';
import { describe, expect, it } from 'vitest';
import { mechanisms } from '../../mechanisms';
import { defaultSceneState, mergeState, ZERO_FAULTS } from '../../timeline/sceneState';
import { buildMoteAttrs, MoteType } from './attributes';
import { createMoteSystem } from './moteSystem';
import { INSTANCE_ATTRIBUTES } from './layout';
import { packPartTexture, partTransforms } from './partTransforms';
import { mechanismAnchors } from '../../mechanisms/anchors';
import { depthRange, LIGHTING } from '../lighting';

const mech = mechanisms.gears;
const BUDGET = 500;
const SEED = 3;
const camera = new PerspectiveCamera();
const viewport = { width: 800, height: 600 };

function meshes(sys: ReturnType<typeof createMoteSystem>): Record<string, Mesh> {
  return Object.fromEntries(sys.object.children.map((c) => [c.name, c as Mesh]));
}

function uniform(m: Mesh, name: string): unknown {
  return (m.material as RawShaderMaterial).uniforms[name].value;
}

describe('createMoteSystem', () => {
  const sys = createMoteSystem(mech, BUDGET, SEED);
  const { motes, 'mote-threads': threads, 'mote-ghost': ghost } = meshes(sys);

  it('packs the three visibility flags into aMeta1.w as bits 1, 2, 4', () => {
    const attrs = buildMoteAttrs(mech, mech.samplePoints(BUDGET, SEED));
    const meta1 = motes.geometry.getAttribute('aMeta1') as InstancedBufferAttribute;
    expect(meta1.count).toBe(attrs.length);
    const seen = new Set<number>();
    attrs.forEach((a, i) => {
      const bits = meta1.getW(i);
      seen.add(bits);
      expect([bits & 1, (bits >> 1) & 1, (bits >> 2) & 1].map(Boolean)).toEqual(a.visible);
      expect([meta1.getX(i), meta1.getY(i), meta1.getZ(i)]).toEqual(a.type);
    });
    expect(seen.size).toBeGreaterThan(1); // the sample exercises more than one combination
  });

  it('shares one set of instanced attributes across motes, threads and ghost', () => {
    for (const name of INSTANCE_ATTRIBUTES.map((spec) => spec.name)) {
      expect(threads.geometry.getAttribute(name)).toBe(motes.geometry.getAttribute(name));
      expect(ghost.geometry.getAttribute(name)).toBe(motes.geometry.getAttribute(name));
    }
    expect(motes.geometry.getAttribute('aCorner').count).toBe(8); // mote quad + dialogue twin quad
  });

  it('feeds the ghost the zero-fault, assembled, correct-variant pose', () => {
    const s = mergeState(defaultSceneState(), {
      mech: { assembly: 0.4, variant: 0.7, drive: 0.3, faults: { misalign: 0.8, drift: 1 }, ghost: 0.5 },
      provenance: { vibed: 0.6 },
    });
    sys.update(s, camera, viewport, null);

    const intended = mergeState(s, { mech: { assembly: 1, variant: 0, faults: ZERO_FAULTS } });
    const ghostParts = uniform(ghost, 'uParts') as DataTexture;
    expect(Array.from(ghostParts.image.data as Float32Array)).toEqual(
      Array.from(packPartTexture(partTransforms(mech, intended))),
    );
    expect(ghost.visible).toBe(true);
    expect(uniform(ghost, 'uGhost')).toBe(0.5);
    for (const [name, want] of [
      ['uAssembly', 1],
      ['uVariant', 0],
      ['uDrift', 0],
      ['uVibed', 0],
      ['uMisallocated', 0],
      ['uDrive', 0.3],
    ] as const) {
      expect(uniform(ghost, name), name).toBe(want);
    }

    // The live machine keeps the real state.
    const liveParts = uniform(motes, 'uParts') as DataTexture;
    expect(Array.from(liveParts.image.data as Float32Array)).toEqual(
      Array.from(packPartTexture(partTransforms(mech, s))),
    );
    expect(uniform(motes, 'uDrift')).toBe(1);
    expect(uniform(motes, 'uVibed')).toBe(0.6);
    expect(uniform(threads, 'uParts')).toBe(liveParts);
  });

  it('lights motes and threads from LIGHTING, with the depth range of the camera to the machine', () => {
    const cam = new PerspectiveCamera();
    cam.position.set(0.5, 1, 6);
    sys.update(defaultSceneState(), cam, viewport, null);
    const { near, far } = depthRange([0.5, 1, 6], mechanismAnchors(mech).whole);
    for (const m of [motes, threads]) {
      expect(uniform(m, 'uKeyDir')).toEqual(LIGHTING.keyDir);
      expect(uniform(m, 'uBackfaceDim')).toBe(LIGHTING.backfaceDim);
      expect(uniform(m, 'uDepthNear')).toBeCloseTo(near, 12);
      expect(uniform(m, 'uDepthFar')).toBeCloseTo(far, 12);
    }
    expect(far - near).toBeCloseTo(2 * mechanismAnchors(mech).whole.radius, 9);
    cam.position.set(0, 0, 12);
    sys.update(defaultSceneState(), cam, viewport, null);
    expect(uniform(motes, 'uDepthNear')).toBeCloseTo(depthRange([0, 0, 12], mechanismAnchors(mech).whole).near, 12);
  });

  it('screen-blends motes and threads (premultiplied output); the ghost stays additive', () => {
    for (const m of [motes, threads]) {
      const mat = m.material as RawShaderMaterial;
      expect(mat.blending, m.name).toBe(CustomBlending);
      expect([mat.blendSrc, mat.blendDst], m.name).toEqual([OneFactor, OneMinusSrcColorFactor]);
    }
    expect((ghost.material as RawShaderMaterial).blending).toBe(AdditiveBlending);
  });

  it('passes the renderer pixel ratio to every material, 1 when not given', () => {
    sys.update(defaultSceneState(), camera, { ...viewport, pixelRatio: 2 }, null);
    for (const m of [motes, threads, ghost]) expect(uniform(m, 'uPixelRatio'), m.name).toBe(2);
    sys.update(defaultSceneState(), camera, viewport, null);
    for (const m of [motes, threads, ghost]) expect(uniform(m, 'uPixelRatio'), m.name).toBe(1);
  });

  it('hides the ghost mesh when ghost is 0', () => {
    sys.update(defaultSceneState(), camera, viewport, null);
    expect(ghost.visible).toBe(false);
  });

  it('wraps shimmer time to [0, 1000) and turns it off for null', () => {
    sys.update(defaultSceneState(), camera, viewport, 2500.5);
    expect(uniform(motes, 'uShimmerOn')).toBe(1);
    expect(uniform(motes, 'uShimmerTime')).toBeCloseTo(500.5, 9);
    sys.update(defaultSceneState(), camera, viewport, null);
    expect(uniform(motes, 'uShimmerOn')).toBe(0);
    expect(uniform(ghost, 'uShimmerOn')).toBe(0);
  });
});

describe('createMoteSystem counts', () => {
  it('reports the instance count and, per scenario, how many instances are visible', () => {
    const sys = createMoteSystem(mech, BUDGET, SEED);
    const attrs = buildMoteAttrs(mech, mech.samplePoints(BUDGET, SEED));
    expect(sys.counts.instances).toBe(attrs.length);
    expect(sys.counts.visible).toEqual([0, 1, 2].map((k) => attrs.filter((a) => a.visible[k]).length));
    expect(sys.counts.visible[2]).toBeLessThan(sys.counts.instances); // misallocated hides some motes
  });
});

describe('createMoteSystem opts.forceType', () => {
  function metaTypes(sys: ReturnType<typeof createMoteSystem>): number[][] {
    const meta1 = meshes(sys).motes.geometry.getAttribute('aMeta1') as InstancedBufferAttribute;
    return Array.from({ length: meta1.count }, (_, i) => [meta1.getX(i), meta1.getY(i), meta1.getZ(i)]);
  }

  it('leaves the default path untouched', () => {
    const base = createMoteSystem(mech, BUDGET, SEED);
    const explicit = createMoteSystem(mech, BUDGET, SEED, {});
    const attrs = buildMoteAttrs(mech, mech.samplePoints(BUDGET, SEED));
    expect(metaTypes(base)).toEqual(attrs.map((a) => a.type));
    expect(metaTypes(explicit)).toEqual(metaTypes(base));
    for (const sys of [base, explicit]) {
      const m = meshes(sys);
      for (const name of ['motes', 'mote-threads', 'mote-ghost']) {
        expect(uniform(m[name], 'uForceHero'), name).toBe(0);
      }
    }
  });

  it('overrides every mote type in every scenario and forces the hero form', () => {
    const sys = createMoteSystem(mech, BUDGET, SEED, { forceType: MoteType.Human });
    const types = metaTypes(sys);
    expect(types.length).toBeGreaterThan(0);
    expect(types.every((t) => t.every((x) => x === MoteType.Human))).toBe(true);
    // The mixed default really did contain other types, so the override changed something.
    const base = createMoteSystem(mech, BUDGET, SEED);
    expect(metaTypes(base).some((t) => t.some((x) => x !== MoteType.Human))).toBe(true);
    for (const mesh of Object.values(meshes(sys))) expect(uniform(mesh, 'uForceHero')).toBe(1);

    // Everything else (positions, visibility, seeds) is the default sample.
    const a = meshes(sys).motes.geometry.getAttribute('aMeta0') as InstancedBufferAttribute;
    const b = meshes(base).motes.geometry.getAttribute('aMeta0') as InstancedBufferAttribute;
    expect(Array.from(a.array)).toEqual(Array.from(b.array));
  });
});
