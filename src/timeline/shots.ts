import type { MechanismAnchors } from '../mechanisms/anchors';
import { CENTRE, SCALE } from '../mechanisms/bike';
import { STUB_TOP } from '../mechanisms/bike/kinematics';
import { lerp, lerpVec3, type Vec3 } from '../math/vec';
import { cameraChannels, cameraSpline, channelShot } from './cameraSpline';
import { EASINGS } from './easing';
import type { SceneState } from './sceneState';

// The storyboard's camera shots (docs/specs/2026-10-04-act-1-storyboard-and-text-engine.md §2) in
// bike terms: metres in the bike's own frame (x forward, y up, z the drive side). The keyframes
// carry them converted once to the rig's machine-relative keys (`shotKeys`); the tests read the
// keyframes back into bike terms (`shotOf`) and hold each beat to its shot. Bike only: the essay's
// machine. Test and tooling support; nothing at runtime imports this.

export interface Shot {
  /** What the camera looks at: a bike point (m), or the centre of the whole machine or of its core. */
  target: Vec3 | 'whole' | 'core';
  /** Degrees about the vertical: 0 seen from the front, 90 from the drive side, 180 from behind. */
  bearing: number;
  /** Degrees above level. */
  elevation: number;
  /** Camera to target, metres. */
  distance: number;
  /** Vertical field of view, degrees, before the portrait rig widens it. */
  fov: number;
  /** `camera.frame`: 0 wide, 1 close. */
  frame: number;
  /** `camera.coreFocus` (the anchor the keys are relative to). */
  coreFocus: number;
}

const wide = { frame: 0, coreFocus: 0 };
const close = { frame: 1, coreFocus: 0 };

/** Between the bottom bracket and the rear axle: the drive. */
export const DRIVE_POINT: Vec3 = [0.25, 0.32, 0];

export const SHOTS = {
  /** vb-1, vb-2: the spawn shell fills the frame as a starfield. */
  S0: { target: 'whole', bearing: 50, elevation: 10, distance: 6.0, fov: 40, ...wide },
  /** The brief comes up: the low drive-side three-quarter of the cold open, saddle and bars against the sky. */
  S1: { target: 'whole', bearing: 55, elevation: 8, distance: 4.6, fov: 40, ...wide },
  /** "Two wheels. The pedals drive the back wheel through a chain.": the drive, square-on from the drive side. */
  S2: { target: [0.5, 0.4, 0], bearing: 95, elevation: 12, distance: 3.2, fov: 38, ...close },
  /** "The front wheel turns, so you can steer.", then "A basket too, for carrying things.": the front wheel and fork, held while the basket drops onto it. */
  S3: { target: [0.95, 0.5, 0], bearing: 50, elevation: 20, distance: 3.0, fov: 36, ...close },
  /** The frame is laid (the camera leans in from S1 as it is), and vb-4's lap and rv-1 start and end here. */
  S1p: { target: 'whole', bearing: 45, elevation: 8, distance: 4.4, fov: 40, ...wide },
  /** The reveal: high and in front, the whole twin. */
  S5: { target: 'whole', bearing: 40, elevation: 30, distance: 4.8, fov: 33, ...wide },
  /** rv-7: S5 pushed in a little. */
  S5p: { target: 'whole', bearing: 45, elevation: 30, distance: 4.6, fov: 33, ...wide },
  /** rv-3: the saddle on its mast over the front wheel. */
  S6: { target: [0.9, 0.65, 0], bearing: 35, elevation: 28, distance: 2.4, fov: 33, ...close },
  /** rv-4: the bars on the stub in the foreground, the mast, saddle and cocked wheel beyond. */
  S7: { target: STUB_TOP, bearing: 150, elevation: 30, distance: 2.6, fov: 33, ...close },
  /** The rewind's pull-back to the nebula. */
  S8: { target: 'whole', bearing: 90, elevation: 0, distance: 6.5, fov: 40, ...wide },
  /**
   * sp-1, sp-2, sp-4, sp-5: the page, square on from the drive side (docs/specs/2026-10-05-blueprint-
   * and-build.md §2.12): the sheet's top just under the text band, its bottom off the screen.
   */
  S11: { target: [0.55, 0.72, 0], bearing: 90, elevation: 0, distance: 3.9, fov: 35, ...wide },
  /** sp-3: the seat on its mast over the front wheel, close on the page, the margin and notes round it. */
  S11c: { target: [0.85, 0.85, 0], bearing: 90, elevation: 0, distance: 2.2, fov: 33, ...close },
  /** sp-6: the build's high front three-quarter, the reveal's view a touch closer: the page seen as a page as the lines lift. */
  S10: { target: 'whole', bearing: 40, elevation: 25, distance: 4.2, fov: 35, ...wide },
  /** sp-7: the gold lands; any nearer than this and the bike leaves the bottom of a wide screen. */
  S9p: { target: 'whole', bearing: 40, elevation: 25, distance: 4.15, fov: 35, frame: 0, coreFocus: 0.6 },
  /** sp-8: the whole bike built and riding. */
  S10p: { target: 'whole', bearing: 45, elevation: 25, distance: 4.4, fov: 35, ...wide },
} as const satisfies Record<string, Shot>;

export type ShotName = keyof typeof SHOTS;

const DEG = Math.PI / 180;

/** Bike metres to world units. */
export const toWorld = (p: readonly number[]): Vec3 => [(p[0] - CENTRE[0]) * SCALE, (p[1] - CENTRE[1]) * SCALE, (p[2] - CENTRE[2]) * SCALE];
/** World units to bike metres. */
export const toBike = (p: readonly number[]): Vec3 => [p[0] / SCALE + CENTRE[0], p[1] / SCALE + CENTRE[1], p[2] / SCALE + CENTRE[2]];

/** The anchor the keys are relative to at `coreFocus`. */
function anchorAt(anchors: MechanismAnchors, coreFocus: number): { center: Vec3; radius: number } {
  return {
    center: lerpVec3(anchors.whole.center, anchors.core.center, coreFocus),
    radius: lerp(anchors.whole.radius, anchors.core.radius, coreFocus),
  };
}

/** A shot's target in bike metres. */
export function shotTarget(shot: Shot, anchors: MechanismAnchors): Vec3 {
  if (shot.target === 'whole') return toBike(anchors.whole.center);
  if (shot.target === 'core') return toBike(anchors.core.center);
  return [...shot.target];
}

/** The unit vector from the target toward the camera, in bike axes. */
function lookFrom(bearing: number, elevation: number): Vec3 {
  const b = bearing * DEG;
  const e = elevation * DEG;
  return [Math.cos(e) * Math.cos(b), Math.sin(e), Math.cos(e) * Math.sin(b)];
}

/** The machine-relative camera keys for a shot. */
export function shotKeys(shot: Shot, anchors: MechanismAnchors): SceneState['camera'] {
  const { center, radius } = anchorAt(anchors, shot.coreFocus);
  const target = toWorld(shotTarget(shot, anchors));
  const dir = lookFrom(shot.bearing, shot.elevation);
  const d = shot.distance * SCALE;
  const pos: Vec3 = [target[0] + dir[0] * d, target[1] + dir[1] * d, target[2] + dir[2] * d];
  const rel = (v: Vec3): Vec3 => [(v[0] - center[0]) / radius, (v[1] - center[1]) / radius, (v[2] - center[2]) / radius];
  const keys = rel(pos);
  return {
    pos: keys,
    target: rel(target),
    fov: shot.fov,
    focus: 0,
    coreFocus: shot.coreFocus,
    frame: shot.frame,
    track: { a: 0, b: 0, mix: 0, turn: 0 },
    landscape: { pos: [...keys], frame: shot.frame, mix: 0 },
    roll: 0,
  };
}

/** A sampled camera read back into bike terms. */
export function shotOf(camera: SceneState['camera'], anchors: MechanismAnchors): Omit<Shot, 'target'> & { target: Vec3 } {
  const { center, radius } = anchorAt(anchors, camera.coreFocus);
  const world = (v: Vec3): Vec3 => [center[0] + v[0] * radius, center[1] + v[1] * radius, center[2] + v[2] * radius];
  const target = toBike(world(camera.target));
  const pos = toBike(world(camera.pos));
  const [dx, dy, dz] = [pos[0] - target[0], pos[1] - target[1], pos[2] - target[2]];
  const flat = Math.hypot(dx, dz);
  return {
    target,
    bearing: Math.atan2(dz, dx) / DEG,
    elevation: Math.atan2(dy, flat) / DEG,
    distance: Math.hypot(dx, dy, dz),
    fov: camera.fov,
    frame: camera.frame,
    coreFocus: camera.coreFocus,
  };
}

// ---- The "Done" lap (docs/specs/2026-10-05-act-1-build-and-orbit.md §4) ----

/** A waypoint of the lap: a shot, at `t` of the lap (0 to 1 over its stretch of the section). */
export interface Waypoint extends Shot {
  t: number;
}

/** Where the lap runs, section-local in vibe-build: vb-4, one screen. */
export const LAP_SECTION = 'vibe-build';
export const LAP_FROM = 0.86111111;
export const LAP_TO = 1;
/** Keys sampled at every 1/LAP_KEYS of the lap, besides one at each waypoint. */
export const LAP_KEYS = 36;

/**
 * One full lap round the riding bike, from S1' back to S1', bearing always increasing: a low wide
 * pass along the drive side (W1), a crane up behind, looking down the bike's length (W2), a high
 * telephoto look from the far side, the bike as a diagram (W3), a dive over the front onto the
 * saddle on its mast (W4, framed close), out across the front (W5) and back to rest.
 */
export const LAP: readonly Waypoint[] = [
  { t: 0, ...SHOTS.S1p },
  { t: 0.18, target: 'whole', bearing: 95, elevation: 2, distance: 4.6, fov: 46, ...wide },
  { t: 0.38, target: [0.45, 0.6, 0], bearing: 160, elevation: 38, distance: 5.2, fov: 38, ...wide },
  { t: 0.55, target: [0.55, 0.5, 0], bearing: 250, elevation: 55, distance: 6.3, fov: 30, ...wide },
  { t: 0.74, target: [0.9, 0.65, 0], bearing: 335, elevation: 25, distance: 2.9, fov: 36, ...close },
  { t: 0.9, target: 'whole', bearing: 390, elevation: 14, distance: 4.2, fov: 40, ...wide },
  { t: 1, ...SHOTS.S1p, bearing: SHOTS.S1p.bearing + 360 },
];

/** Section-local progress of lap parameter `t`. */
export const lapLocal = (t: number): number => LAP_FROM + (LAP_TO - LAP_FROM) * t;

/**
 * The lap's camera at lap parameter `t`, in bike terms. The camera spline (cameraSpline.ts: a
 * centripetal Catmull-Rom, so it neither overshoots nor loops) runs through the waypoints in
 * (bearing, elevation, ln distance, fov, target), against one inOutCubic over the lap: waypoint i is reached at `t = LAP[i].t`, and the
 * camera leaves S1' and comes back to it at zero speed, continuous with the holds either side.
 */
export function lapShot(t: number, anchors: MechanismAnchors): Shot & { target: Vec3 } {
  const ease = EASINGS.inOutCubic;
  const pts = LAP.map((w) => cameraChannels(w, shotTarget(w, anchors)));
  const c = cameraSpline(pts, LAP.map((w) => ease(w.t)), ease(Math.min(1, Math.max(0, t))), lookFrom);
  return { ...channelShot(c), frame: 0, coreFocus: 0 };
}

const round = (v: number, places: number): number => Math.round(v * 10 ** places) / 10 ** places;

/**
 * The lap's camera keys, as the keyframes carry them: section-local `at`, and machine-relative
 * `pos` and `target` and `fov`, rounded as the other camera keys are, at every 1/LAP_KEYS of the lap
 * and at each inner waypoint (so every waypoint reads back exactly), all linear. Generated here,
 * pasted into keyframes.json once, and held to it by shots.test.ts. `camera.frame` is keyed by hand.
 * Reduced motion: every camera move in the essay is scrubbed by the reader's own scrolling, and the
 * lap is no different; if a still form is ever built, the lap's is to hold S1' for the whole of
 * vb-4, which is continuous on both sides by construction. Do not design a second path.
 */
export function orbitKeys(anchors: MechanismAnchors): { at: number; pos: Vec3; target: Vec3; fov: number }[] {
  const ts = [...Array.from({ length: LAP_KEYS }, (_, k) => (k + 1) / LAP_KEYS), ...LAP.slice(1, -1).map((w) => w.t)].sort((a, b) => a - b);
  return ts.map((t) => {
    const keys = shotKeys(lapShot(t, anchors), anchors);
    return {
      at: round(lapLocal(t), 8),
      pos: keys.pos.map((v) => round(v, 3)) as unknown as Vec3,
      target: keys.target.map((v) => round(v, 3)) as unknown as Vec3,
      fov: round(keys.fov, 3),
    };
  });
}
