import { PerspectiveCamera, Vector3 } from 'three';
import type { MechanismAnchors } from '../mechanisms/anchors';
import { lerp, lerpVec3, type Vec3 } from '../math/vec';
import type { SceneState } from '../timeline/sceneState';

/** The essay camera's near plane (main.ts), world units. */
export const CAMERA_NEAR = 0.1;
/** The essay camera's far plane: the galaxy wide sees a disc 440 across from 640 away (further on a phone). */
export const GALAXY_FAR = 4000;

/**
 * The essay's camera (main.ts): a 40 degree field until the keys set one, CAMERA_NEAR and GALAXY_FAR,
 * on a screen of `aspect`. Only the drawing's sheet writes depth, and only while fully opaque
 * (inkSystem.ts), 0.03 behind the flattened ink: the far plane changes the depth values, not their
 * order, so it moves no Act I pixel (cameraRig.test.ts fingerprints this camera over Act I).
 */
export function createEssayCamera(aspect: number): PerspectiveCamera {
  return new PerspectiveCamera(40, aspect, CAMERA_NEAR, GALAXY_FAR);
}

/** Machine-relative camera keys: position, target and vertical field of view (degrees). */
export interface Rig {
  pos: Vec3;
  target: Vec3;
  fov: number;
}

/** A point on screen as fractions of the width and the height, from the top-left corner. */
export interface ScreenPoint {
  x: number;
  y: number;
}

/**
 * Where the essay puts the authored target on screen (storyboard §2.6), by orientation, for a wide
 * shot (`camera.frame` 0) and a close one (1); `frame` blends between them. The text sits at the
 * top of every screen (a centred column on a wide screen, the full width on a phone), so the target
 * always lands below centre: a wide shot keeps the machine low-centre under the text; a close shot
 * puts its subject lower still, and on a wide screen right of the text column, so what stands above
 * the subject clears the text.
 */
export const FRAMING: Record<'landscape' | 'portrait', { wide: ScreenPoint; close: ScreenPoint }> = {
  landscape: { wide: { x: 0.5, y: 0.66 }, close: { x: 0.7, y: 0.78 } },
  portrait: { wide: { x: 0.5, y: 0.62 }, close: { x: 0.5, y: 0.76 } },
};

/** Where the target lands on a screen of `aspect` (width / height) at `frame` (clamped to 0..1). */
export function targetOnScreen(aspect: number, frame: number): ScreenPoint {
  const { wide, close } = aspect < 1 ? FRAMING.portrait : FRAMING.landscape;
  const f = Math.min(1, Math.max(0, Number.isNaN(frame) ? 0 : frame));
  return { x: lerp(wide.x, close.x, f), y: lerp(wide.y, close.y, f) };
}

const DEG = Math.PI / 180;

/**
 * The keys reframed for a screen of `aspect` (width / height). Landscape (aspect >= 1) is returned
 * unchanged. In portrait the shot widens by m = clamp(0.89 / aspect, 1, 2.4) about the authored
 * target, which it keeps (a close shot's subject stays its subject): the camera backs off along its
 * own line of sight by sqrt(m) and the field opens by sqrt(m), so the frame grows m-fold and a phone
 * sees about the width a landscape screen sees. The keyframes themselves never change.
 */
export function portraitRig(rig: Rig, aspect: number): Rig {
  const { pos, target, fov } = rig;
  if (!(aspect < 1)) return { pos: [...pos], target: [...target], fov };
  const k = Math.sqrt(Math.min(2.4, Math.max(1, 0.89 / aspect)));
  return {
    pos: [target[0] + (pos[0] - target[0]) * k, target[1] + (pos[1] - target[1]) * k, target[2] + (pos[2] - target[2]) * k],
    target: [...target],
    fov: (2 * Math.atan(Math.tan((fov * DEG) / 2) * k)) / DEG,
  };
}

/**
 * The keys on a landscape screen (aspect >= 1): `landscape.mix` of the way from `pos` and `frame` to
 * the shot's landscape ones (a shot that stands further off, at another bearing, or composes wide on
 * a short, wide screen; netShots.ts galaxyShotKeys). Portrait is returned unchanged, as is a key with
 * no landscape variant (mix 0): `portraitRig` is the portrait half of the same rule.
 */
export function landscapeRig(camera: SceneState['camera'], aspect: number): { pos: Vec3; frame: number } {
  const m = Math.min(1, Math.max(0, Number.isNaN(camera.landscape.mix) ? 0 : camera.landscape.mix));
  if (aspect < 1 || m === 0) return { pos: [...camera.pos], frame: camera.frame };
  return { pos: lerpVec3(camera.pos, camera.landscape.pos, m), frame: lerp(camera.frame, camera.landscape.frame, m) };
}

export interface CameraOptions {
  /**
   * Compose the shot round the essay's text: take a landscape screen's variant of the keys
   * (`landscapeRig`), reframe a portrait screen (`portraitRig`), and shift the lens so the target
   * lands where `targetOnScreen` says. The comparison bench fits its panes itself and leaves this off.
   */
  compose?: boolean;
  /**
   * The tracking camera's origin (netTrack.ts trackPoint): the world point Act II's keys are
   * relative to, added to the anchor-mapped position and target alike. Absent or [0, 0, 0] (Act I),
   * the camera is exactly as it was without one.
   */
  origin?: Vec3;
  /**
   * Radians about +y the anchor-mapped position and target turn about the origin before it is added
   * (netTrack.ts trackTurn): a tracking camera riding the galaxy's turn. Absent or 0, nothing turns.
   */
  turn?: number;
}

const UP = new Vector3(0, 1, 0);

/**
 * Pose the camera from scene state: position, look at the target, field of view. Leaves aspect alone.
 * `pos` and `target` are machine-relative (see SceneState.camera): they are mapped to world space
 * through the anchor lerp(whole, core) by `coreFocus`, so the same keys frame any mechanism, and then
 * moved by `origin`, the tracked point (Act II's keys are relative to it).
 * With `compose`, the shot is reframed for portrait and its lens shifted (a view offset) so the
 * target lands at `targetOnScreen(aspect, camera.frame)`; without it the camera looks straight at
 * the target, as it always has.
 */
export function applyCamera(
  camera: PerspectiveCamera,
  s: SceneState,
  anchors: MechanismAnchors,
  { compose = false, origin, turn = 0 }: CameraOptions = {},
): void {
  const { coreFocus } = s.camera;
  const wide = compose ? landscapeRig(s.camera, camera.aspect) : { pos: s.camera.pos, frame: s.camera.frame };
  const { pos, target, fov } = compose ? portraitRig({ ...s.camera, pos: wide.pos }, camera.aspect) : s.camera;
  const center = lerpVec3(anchors.whole.center, anchors.core.center, coreFocus);
  const radius = lerp(anchors.whole.radius, anchors.core.radius, coreFocus);
  // A zero component adds nothing, not even the sign of a −0: an untracked frame is bit for bit the
  // frame it was before the origin existed.
  const o = origin ?? ([0, 0, 0] as const);
  const shift = (x: number, k: number): number => (o[k] === 0 ? x : x + o[k]);
  const turned = (p: Vec3): Vec3 => (turn === 0 ? p : (new Vector3(...p).applyAxisAngle(UP, turn).toArray() as Vec3));
  const world = (v: Vec3): Vec3 => {
    const p = turned([center[0] + v[0] * radius, center[1] + v[1] * radius, center[2] + v[2] * radius]);
    return [shift(p[0], 0), shift(p[1], 1), shift(p[2], 2)];
  };
  camera.position.set(...world(pos));
  const aim = world(target);
  // The roll (the freeze frame's tilt, `camera.roll` degrees): the up vector turned about the line of
  // sight before lookAt, so the picture turns about the target, which the view offset below then puts
  // where it goes on screen. At 0 the up vector is exactly +y: the camera as it always was.
  const roll = Number.isFinite(s.camera.roll) ? s.camera.roll : 0;
  if (roll === 0) camera.up.copy(UP);
  else camera.up.copy(UP).applyAxisAngle(new Vector3(...aim).sub(camera.position).normalize(), roll * DEG);
  camera.lookAt(...aim);
  // Refresh matrixWorld now: lookAt reads the pre-lookAt world matrix, so without this it (and
  // anything reading it before a render) would lag one pose behind.
  camera.updateMatrixWorld();
  if (compose) {
    const at = targetOnScreen(camera.aspect, wide.frame);
    camera.fov = fov;
    // The target is the centre of the full frame; a window offset by (0.5 - x, 0.5 - y) of it shows
    // the target at (x, y). Proportions only: full size and window size are both aspect x 1, which
    // also keeps camera.aspect as it is. setViewOffset updates the projection.
    camera.setViewOffset(camera.aspect, 1, (0.5 - at.x) * camera.aspect, 0.5 - at.y, camera.aspect, 1);
    return;
  }
  if (camera.view?.enabled) {
    camera.fov = fov;
    camera.clearViewOffset(); // updates the projection
    return;
  }
  if (camera.fov !== fov) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }
}
