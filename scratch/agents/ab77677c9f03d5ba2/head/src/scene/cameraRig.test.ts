import { PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import type { MechanismAnchors } from '../mechanisms/anchors';
import { defaultSceneState, mergeState } from '../timeline/sceneState';
import { applyCamera } from './cameraRig';

/** Anchors under which machine-relative and world coordinates coincide. */
const UNIT: MechanismAnchors = {
  whole: { center: [0, 0, 0], radius: 1 },
  core: { center: [0, 0, 0], radius: 1 },
  body: { center: [0, 0, 0], radius: 1 },
};

const ANCHORS: MechanismAnchors = {
  whole: { center: [1, 2, 0], radius: 4 },
  core: { center: [-1, 0, 0.5], radius: 2 },
  body: { center: [3, 0, 0], radius: 3 },
};

function lookPoint(camera: PerspectiveCamera, distance: number): Vector3 {
  return camera.getWorldDirection(new Vector3()).multiplyScalar(distance).add(camera.position);
}

describe('applyCamera', () => {
  it('places the camera, aims it at the target and sets the field of view', () => {
    const camera = new PerspectiveCamera(40, 16 / 9, 0.1, 100);
    const projectionBefore = camera.projectionMatrix.clone();
    const s = mergeState(defaultSceneState(), { camera: { pos: [-1.2, 0.3, 5], target: [-0.9, 0, 0], fov: 35 } });
    applyCamera(camera, s, UNIT);

    expect(camera.position.toArray()).toEqual([-1.2, 0.3, 5]);
    expect(camera.fov).toBe(35);
    expect(camera.aspect).toBeCloseTo(16 / 9, 12);
    expect(camera.projectionMatrix.equals(projectionBefore)).toBe(false);
    // The view direction points from the position at the target.
    const forward = camera.getWorldDirection(new Vector3());
    const toTarget = new Vector3(-0.9, 0, 0).sub(camera.position).normalize();
    expect(forward.distanceTo(toTarget)).toBeLessThan(1e-6);
  });

  it('refreshes matrixWorld immediately, without a render', () => {
    const camera = new PerspectiveCamera(40, 16 / 9, 0.1, 100);
    const s = mergeState(defaultSceneState(), { camera: { pos: [-1.2, 0.3, 5], target: [-0.9, 0, 0], fov: 35 } });
    applyCamera(camera, s, UNIT);

    // The translation column of matrixWorld is the world position.
    const worldPos = new Vector3().setFromMatrixPosition(camera.matrixWorld);
    expect(worldPos.distanceTo(new Vector3(-1.2, 0.3, 5))).toBeLessThan(1e-6);
    // The orientation in matrixWorld must be current too (a stale one lags one pose behind).
    const viewDir = new Vector3(0, 0, -1).transformDirection(camera.matrixWorld);
    const toTarget = new Vector3(-0.9, 0, 0).sub(camera.position).normalize();
    expect(viewDir.distanceTo(toTarget)).toBeLessThan(1e-6);
  });

  it('reads pos and target in units of the whole machine at coreFocus 0', () => {
    const camera = new PerspectiveCamera(40, 1, 0.1, 100);
    const s = mergeState(defaultSceneState(), { camera: { pos: [0.5, 0, 2], target: [0, 0, 0], coreFocus: 0 } });
    applyCamera(camera, s, ANCHORS);

    // world = whole.center + value × whole.radius
    expect(camera.position.distanceTo(new Vector3(3, 2, 8))).toBeLessThan(1e-12);
    const dist = camera.position.distanceTo(new Vector3(1, 2, 0));
    expect(lookPoint(camera, dist).distanceTo(new Vector3(1, 2, 0))).toBeLessThan(1e-6);
  });

  it('reads pos and target in units of the core at coreFocus 1', () => {
    const camera = new PerspectiveCamera(40, 1, 0.1, 100);
    const s = mergeState(defaultSceneState(), { camera: { pos: [0.5, 0, 2], target: [0, 0, 0], coreFocus: 1 } });
    applyCamera(camera, s, ANCHORS);

    expect(camera.position.distanceTo(new Vector3(0, 0, 4.5))).toBeLessThan(1e-12);
    const dist = camera.position.distanceTo(new Vector3(-1, 0, 0.5));
    expect(lookPoint(camera, dist).distanceTo(new Vector3(-1, 0, 0.5))).toBeLessThan(1e-6);
  });

  it('lerps the anchor centre and radius between whole and core', () => {
    const camera = new PerspectiveCamera(40, 1, 0.1, 100);
    const s = mergeState(defaultSceneState(), { camera: { pos: [0, 0, 1], target: [0, 0, 0], coreFocus: 0.25 } });
    applyCamera(camera, s, ANCHORS);

    // centre (0.5, 1.5, 0.125), radius 3.5
    expect(camera.position.distanceTo(new Vector3(0.5, 1.5, 3.625))).toBeLessThan(1e-12);
  });
});
