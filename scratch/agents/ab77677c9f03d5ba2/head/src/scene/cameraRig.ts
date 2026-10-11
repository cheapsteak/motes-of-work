import type { PerspectiveCamera } from 'three';
import type { MechanismAnchors } from '../mechanisms/anchors';
import { lerp, lerpVec3, type Vec3 } from '../math/vec';
import type { SceneState } from '../timeline/sceneState';

/**
 * Pose the camera from scene state: position, look at the target, field of view. Leaves aspect alone.
 * `pos` and `target` are machine-relative (see SceneState.camera): they are mapped to world space
 * through the anchor lerp(whole, core) by `coreFocus`, so the same keys frame any mechanism.
 */
export function applyCamera(camera: PerspectiveCamera, s: SceneState, anchors: MechanismAnchors): void {
  const { pos, target, fov, coreFocus } = s.camera;
  const center = lerpVec3(anchors.whole.center, anchors.core.center, coreFocus);
  const radius = lerp(anchors.whole.radius, anchors.core.radius, coreFocus);
  const world = (v: Vec3): Vec3 => [center[0] + v[0] * radius, center[1] + v[1] * radius, center[2] + v[2] * radius];
  camera.position.set(...world(pos));
  camera.lookAt(...world(target));
  // Refresh matrixWorld now: lookAt reads the pre-lookAt world matrix, so without this it (and
  // anything reading it before a render) would lag one pose behind.
  camera.updateMatrixWorld();
  if (camera.fov !== fov) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }
}
