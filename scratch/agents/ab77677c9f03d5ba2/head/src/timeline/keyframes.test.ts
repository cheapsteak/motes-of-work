import { PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { applyToPoint } from '../math/transform';
import { mechanismAnchors } from '../mechanisms/anchors';
import { mechanisms } from '../mechanisms';
import { applyCamera } from '../scene/cameraRig';
import { partTransforms } from '../scene/mote/partTransforms';
import { sectionSpans } from '../scroll/progress';
import { loadStory } from '../story/loader';
import { KeyframeSampler, type KeyframeFile } from './keyframeSampler';
import keyframes from './keyframes.json';
import { mergeState, SCENE_STATE_PATHS, ZERO_FAULTS, type SceneState } from './sceneState';

// The shipped keyframes against the shipped story: they compile, they never jump at a section
// boundary, and the beats the thesis depends on hold across the whole of each section.

const spans = sectionSpans(loadStory());
const sampler = new KeyframeSampler(keyframes as unknown as KeyframeFile, spans); // validated at load

function at(id: string, local: number): number {
  const span = spans.find((s) => s.id === id);
  if (!span) throw new Error(`no section ${id}`);
  return span.start + local * (span.end - span.start);
}

function leaf(s: SceneState, path: string): number | number[] {
  return path.split('.').reduce<unknown>((node, k) => (node as Record<string, unknown>)[k], s) as number | number[];
}

const LOCALS = Array.from({ length: 21 }, (_, i) => i / 20);

describe('keyframes.json', () => {
  it('covers the first story sections', () => {
    expect(spans.map((s) => s.id).slice(0, 3)).toEqual(['vibe-build', 'rewind', 'spec']);
  });

  it('is continuous across every section boundary', () => {
    const eps = 1e-7;
    for (const { end } of spans.slice(0, -1)) {
      const before = sampler.sample(end - eps);
      const after = sampler.sample(end + eps);
      for (const path of Object.keys(SCENE_STATE_PATHS)) {
        const a = [leaf(before, path)].flat();
        const b = [leaf(after, path)].flat();
        a.forEach((v, i) => expect(Math.abs(v - b[i]), `${path} at ${end}`).toBeLessThan(1e-4));
      }
    }
  });

  it('keeps the vibe build fully vibed, the wrong twin, with no ghost', () => {
    for (const l of LOCALS) {
      const s = sampler.sample(at('vibe-build', l));
      expect([s.provenance.vibed, s.mech.variant, s.mech.ghost], `local ${l}`).toEqual([1, 1, 0]);
    }
    expect(sampler.sample(at('vibe-build', 0)).mech.assembly).toBe(0);
    expect(sampler.sample(at('vibe-build', 0.7)).mech.assembly).toBe(1);
  });

  it('ends the rewind as a specced nebula that has never shown a ghost', () => {
    for (const l of LOCALS) expect(sampler.sample(at('rewind', l)).mech.ghost, `local ${l}`).toBe(0);
    const end = sampler.sample(at('rewind', 1));
    expect([end.mech.assembly, end.mech.variant, end.provenance.vibed, end.mech.drive]).toEqual([0, 0, 0, 0]);
  });

  it('shows the ghost in the spec while only the core settles', () => {
    for (const l of LOCALS) {
      const s = sampler.sample(at('spec', l));
      expect(s.provenance.vibed, `local ${l}`).toBe(0);
      expect(s.mech.variant, `local ${l}`).toBe(0);
      expect(s.mech.assembly, `local ${l}`).toBeLessThanOrEqual(0.45);
    }
    const end = sampler.sample(at('spec', 1));
    expect(end.mech.ghost).toBe(1);
    expect(end.mech.assembly).toBeCloseTo(0.45, 12);
    expect(end.camera).toMatchObject({ pos: [-0.98, 0.1, 4], target: [-0.98, 0, 0], fov: 35, coreFocus: 1 });
  });

  // Camera keys are machine-relative, so the framing must hold for every registered mechanism.
  // NDC x of the text panel's right edge at 1280×720: 64px gutter + 498px panel = 562px ≈ 44%.
  const PANEL_EDGE_NDC = -0.12;

  it.each(Object.entries(mechanisms))(
    'frames the whole assembled %s core right of the text panel once the spec camera settles',
    (_id, mech) => {
      const anchors = mechanismAnchors(mech);
      const points = mech.samplePoints(20_000, 1).filter((b) => mech.parts[b.part].role === 'core');
      expect(points.length).toBeGreaterThan(0);
      const camera = new PerspectiveCamera(40, 1280 / 720, 0.1, 100);
      for (const l of [0.35, 0.5, 0.7, 0.9, 1]) {
        const s = sampler.sample(at('spec', l));
        applyCamera(camera, s, anchors);
        // The assembled pose the ghost shows and the core is building toward: no faults, correct variant.
        const xf = partTransforms(mech, mergeState(s, { mech: { assembly: 1, variant: 0, faults: ZERO_FAULTS } }));
        let minX = Infinity;
        let maxX = -Infinity;
        let maxY = 0;
        for (const b of points) {
          const v = new Vector3(...applyToPoint(xf[b.part], b.local)).project(camera);
          minX = Math.min(minX, v.x);
          maxX = Math.max(maxX, v.x);
          maxY = Math.max(maxY, Math.abs(v.y));
        }
        expect(minX, `local ${l}`).toBeGreaterThan(PANEL_EDGE_NDC);
        expect(maxX, `local ${l}`).toBeLessThan(1);
        expect(maxY, `local ${l}`).toBeLessThan(1);
        // A close framing: the core's anchor sphere spans most of the free width right of the panel.
        const centre = new Vector3(...anchors.core.center);
        const right = new Vector3(1, 0, 0).applyQuaternion(camera.quaternion).multiplyScalar(anchors.core.radius);
        const diameter = centre.clone().add(right).project(camera).x - centre.clone().sub(right).project(camera).x;
        expect(diameter / (1 - PANEL_EDGE_NDC), `local ${l}`).toBeGreaterThan(0.75);
      }
    },
  );

  // A jump in the world-space camera keeps its size as sampling gets finer; a continuous path's
  // largest step halves. Covers the coreFocus hand-over in the spec, where pos and anchor both move.
  it.each(Object.entries(mechanisms))('moves the %s camera continuously through the whole story', (_id, mech) => {
    const anchors = mechanismAnchors(mech);
    const camera = new PerspectiveCamera(40, 1280 / 720, 0.1, 100);
    const maxStep = (n: number): number => {
      let worst = 0;
      let prev: Vector3[] | null = null;
      for (let i = 0; i <= n; i++) {
        applyCamera(camera, sampler.sample(i / n), anchors);
        const look = camera.getWorldDirection(new Vector3()).add(camera.position);
        const cur = [camera.position.clone(), look];
        if (prev) worst = Math.max(worst, ...cur.map((v, k) => v.distanceTo((prev as Vector3[])[k])));
        prev = cur;
      }
      return worst;
    };
    const coarse = maxStep(2000);
    expect(coarse).toBeGreaterThan(0);
    expect(maxStep(4000)).toBeLessThan(0.6 * coarse);
  });
});
