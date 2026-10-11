import { PerspectiveCamera, Vector3 } from 'three';
import { AMBIENT_POSE, HERO_CLOSE } from '../galaxy/ambient';
import { BG, GALAXY_WIDE } from '../galaxy/background';
import { CORE_R, GLOW_CAP, glowPx, STAR_R } from '../galaxy/body';
import { jetRho } from '../scene/hole/hole';
import { HOLE_DISK, HOLE_JET, HOLE_LOOK, HOLE_VIEW } from '../scene/hole/holeLook';
import { anchorOf, bodyIndex, systemOuter, type Body, type Galaxy } from '../galaxy/generate';
import { mechanismAnchors, type MechanismAnchors } from '../mechanisms/anchors';
import { mechanisms } from '../mechanisms';
import type { Vec3 } from '../math/vec';
import type { SectionSpan } from '../scroll/progress';
import type { BodyData } from '../scene/node/bodyData';
import { createEssayCamera, FRAMING } from '../scene/cameraRig';
import { BAND_MARGIN_PX, FREEZE_ROLL, NODE_BIRTH_WINDOW, TEXT_BAND } from '../scene/node/birth';
import { BODY_LOOK, shellMoteDiameter } from '../scene/node/bodyAttrs';
import { lampGain } from '../scene/node/bodyMote';
import { MOON_POINT_PX, motePx } from '../scene/node/lod';
import { starTopPx } from '../scene/node/star';
import { bodyWorld } from '../scene/node/orbit';
import { streamPixels, type StreamLeaves } from '../scene/node/streamOnScreen';
import { cameraChannels, cameraSpline, channelShot, lookFromBearing } from './cameraSpline';
import { EASINGS } from './easing';
import { progressOfSectionAt, type Keyframe } from './keyframeSampler';
import { composeEssayCamera, Lamp, lampFocusRow, targetWorld, trackIndex, trackTurn, type TrackTarget } from './netTrack';
import { defaultSceneState, mergeState, type SceneState } from './sceneState';
import { SHOTS, shotKeys } from './shots';

// Act II's shots (docs/specs/2026-10-07-galaxy-orbits.md §14.5, §8) as data: what the camera looks
// at, from which bearing and elevation (degrees; bearing 0 looks from +z, lookFromBearing), how far,
// through which fov, framed how (`camera.frame`), under which lamp. A shot tracks its target (galaxy
// §8): its keys are relative to the target, which `camera.track` names and the frame resolves at its
// own ambient (netTrack.ts trackPoint, the rig's `origin`), so the camera rides a moving body and the
// keys never change with the ambient. The camera's bearing is not the galaxy's position bearing
// atan2(z, x): it says where the camera stands round its target, not where the target is.
//
// Here too: the zoom-out, generated (zoomOutShot) and pasted into keyframes.json once, as Act I's lap
// is, and held to it by netShots.test.ts; every later section, its shots and the moves between them
// on the page turns and under the lines, generated and pasted the same way (LAYERS_SHOTS,
// DEFECT_SHOTS, LATE_SHOTS, ACT_TWO_MOVES); and the clearance bound every shot is held to
// (cylinderTop). Test and tooling support, and the probe shots' (main.ts, `?shot=`).

/** What a shot looks at: a body (by id or alias), the middle of some bodies, the galactic centre, or the neighbourhood's middle. */
export type TargetRef = { body: string } | { centroid: readonly string[] } | { core: true } | { hood: true };

export interface GalaxyShot {
  target: TargetRef;
  /** Degrees about +y: 0 seen from +z, 90 from +x. */
  bearing: number;
  /** Degrees above the galaxy's plane. */
  elevation: number;
  /** Camera to target, world units; or a multiple of the target star's system outer radius. */
  distance: number | { outerTimes: number };
  /** Vertical field of view, degrees, before the portrait rig widens it. */
  fov: number;
  /** `camera.frame`: 0 wide, 1 close. */
  frame: number;
  /** The lamp's level (galaxy §14.5). */
  lamp: Lamp;
  /** The lamp's focus, when it is not the target: the lineage wide looks at the core under R0's lineage. */
  lampOn?: TargetRef;
  /**
   * The shot on a landscape screen, where §14.5's distance and frame do not hold what the shot is
   * about: a wide screen is short, so it backs off further, composes wide, and may stand at another
   * bearing round its target (the twelve's triangle lies across the screen). A portrait screen
   * always takes §14.5's values (the close shot's are the freeze pin's, HERO_CLOSE). The keys carry
   * it as `camera.landscape`, which the rig takes on a landscape screen (cameraRig.ts landscapeRig).
   */
  landscape?: { distance: number; frame: number; bearing?: number };
  /** The camera's bearing rides the galaxy's turn about the target (`camera.track.turn` 1), so the shot holds one composition at every ambient. */
  ridesTurn?: boolean;
  /** `net.haze` on the shot (the `?shot=` probe's; HAZE_KEYS keys the essay's): 1 at the galaxy wides, absent (0) elsewhere. */
  haze?: number;
}

/**
 * The beats whose line is about lineage (galaxy §15.1): `net.streams` is 1 under these and 0 under
 * every other Act II beat, the zoom-out included. The lineage streams are
 * drawn only while it is above 0.
 */
export const STREAM_BEATS = ['ly-1', 'ly-5', 'up-1', 'tr-1', 'tr-2', 'fx-4'] as const;

/**
 * The beats the reviewer's feed is up under (galaxy §15.1, the author's ruling in Task 11): `net.feed`
 * is 1 under these and 0 under every other Act II beat. Under re-3 it is the subject, alone (the
 * lineage streams are down); through the trace it stays up while the camera follows the defects back
 * along the lineage and the surge runs out into it. It is drawn only while `net.feed` and its alpha
 * (review.ts feedAlpha) are above 0.
 */
export const FEED_BEATS = ['re-3', 'tr-1', 'tr-2'] as const;

const close = HERO_CLOSE.C1;

/**
 * The close shot on a landscape screen: back far enough, composed wide, that C1's whole disc stays in
 * the frame at its largest derp (a skip, a reverse or a burst carries it up to 1.29 units off its
 * place; netShots.test.ts checks every extreme), as the camera rides its undisturbed place.
 */
const CLOSE_LANDSCAPE = { distance: 6.5, frame: 0 } as const;
/**
 * The twelve's distance on a phone: a whole distance at which every body of P1-P3 keeps
 * TWELVE_MARGIN_PX clear of the frame's edges at every 1/30 s of the shown ambient (AMBIENT_WRAP;
 * netShots.test.ts). The shot rides the galaxy's turn, so the three stars' rigid triangle holds one
 * composition at every ambient (§14.5's bearing, at ambient 0) and only the planets and their moons
 * move round it. 132 since Task 1d's wider neighbourhood spread P1-P3 apart (93 before): the least
 * whole distance at which the twelve's lineage keeps under the band through df-3's hold on a phone.
 */
const TWELVE_DISTANCE = 132;
/**
 * The twelve on a landscape screen: turned 105 degrees round the centroid from the phone's bearing, so
 * the triangle, which runs down a phone, lies across a wide screen. It stands where the twelve's lit
 * set (lamp 5 on R0) keeps under the text band at every AMBIENT_GRID pose with every one of the twelve
 * TWELVE_MARGIN_PX inside the frame's edges (Task 10's shot pass: at -105 and 82, the nearest that
 * kept the bodies in the frame, the top star and C12 stood in the band), as fitted; netShots.test.ts
 * checks both. 150 since Task 1d (120 before): with the wider neighbourhood, the follow's pan from here
 * to up-1 swung C7's lit piece up to 36 px into the band on a desktop at 121; 150 is the least whole
 * distance that keeps it under (the twelve itself clears from 121).
 */
const TWELVE_LANDSCAPE = { distance: 150, frame: 0, bearing: -115 } as const;
/** CSS px every body of the twelve (its moons too, undisturbed) keeps clear of the frame's edges at every 1/30 s of the hour, on both screens. */
export const TWELVE_MARGIN_PX = 30;

/** §14.5's probe shots: the galaxy wide, the neighbourhood, the core, P_a's system, the twelve, and the close shot on C1. */
export const GALAXY_SHOTS: Record<'galaxyWide' | 'hood' | 'core' | 'system' | 'twelve' | 'close', GalaxyShot> = {
  /**
   * §14.5's wide (GALAXY_WIDE: 640 on a phone). On a landscape screen it stands at GALAXY_WIDE's
   * landscapeDistance (Task 1d): at 640 the wider neighbourhood's lit set stood 99 px into the band on
   * a desktop, and no frame cleared it with every body still in the frame.
   */
  galaxyWide: {
    target: { core: true },
    bearing: 0,
    elevation: GALAXY_WIDE.elevation,
    distance: GALAXY_WIDE.distance,
    fov: GALAXY_WIDE.fov,
    frame: 0,
    lamp: Lamp.Off,
    haze: 1,
    landscape: { distance: GALAXY_WIDE.landscapeDistance, frame: 0 },
  },
  hood: {
    target: { hood: true },
    bearing: 0,
    elevation: 82,
    distance: 120,
    fov: 40,
    frame: 0,
    lamp: Lamp.Hood,
  },
  core: {
    target: { core: true },
    bearing: 30,
    elevation: 64,
    distance: 30,
    fov: 40,
    frame: 0,
    lamp: Lamp.Core,
  },
  system: {
    target: { body: 'P_a' },
    bearing: -10,
    elevation: 72,
    distance: { outerTimes: 2.7 },
    fov: 40,
    frame: 0,
    lamp: Lamp.Star,
  },
  twelve: {
    target: { centroid: ['P1', 'P2', 'P3'] },
    bearing: -10,
    elevation: 74,
    distance: TWELVE_DISTANCE,
    fov: 40,
    frame: 0,
    lamp: Lamp.Lineage,
    landscape: TWELVE_LANDSCAPE,
    ridesTurn: true,
  },
  close: {
    target: { body: 'C1' },
    bearing: close.bearing,
    elevation: close.elevation,
    distance: close.distance,
    fov: close.fov,
    frame: close.frame,
    lamp: Lamp.Planet,
    landscape: CLOSE_LANDSCAPE,
  },
};

/** A shot's distance as §14.5 gives it (portrait), the multiple of its target star's system outer radius resolved. */
function portraitDistance(shot: GalaxyShot, g: Galaxy): number {
  if (typeof shot.distance === 'number') return shot.distance;
  if (!('body' in shot.target)) throw new Error('a shot sized by its system needs a body as its target');
  const b = g.bodies[bodyIndex(g, shot.target.body)];
  if (b.star < 0) throw new Error(`${b.id} has no system`);
  return shot.distance.outerTimes * systemOuter(g, b.star);
}

/** A shot's distance on a screen of `aspect` (width / height): its landscape one on a landscape screen, else §14.5's. */
export function galaxyShotDistance(shot: GalaxyShot, g: Galaxy, aspect: number): number {
  return shot.landscape && !(aspect < 1) ? shot.landscape.distance : portraitDistance(shot, g);
}

/** Bike-anchor-relative keys (the rig's units) of a world offset from the tracked point. */
function relKeys(anchors: MechanismAnchors): (v: readonly number[]) => Vec3 {
  const { center, radius } = anchors.whole;
  return (v) => [0, 1, 2].map((k) => (v[k] - center[k]) / radius) as Vec3;
}

/**
 * The rig's machine-relative camera keys for a shot, the same on every screen: against `anchors` (the
 * bike's by default, as the essay frames every shot), with coreFocus 0, relative to the shot's tracked
 * target: the target key maps to the tracked point itself and the position to §14.5's bearing,
 * elevation and distance from it, and `track` names the target (a = b, mix 0). A shot with a
 * landscape variant carries it as `landscape` (mix 1), which the rig takes on a landscape screen; the
 * frame adds the tracked point at its ambient as the rig's `origin`.
 */
export function galaxyShotKeys(
  shot: GalaxyShot,
  g: Galaxy,
  anchors: MechanismAnchors = mechanismAnchors(mechanisms.bike),
): SceneState['camera'] {
  const rel = relKeys(anchors);
  const at = trackIndex(shot.target);
  const offset = (bearing: number, d: number): Vec3 => lookFromBearing(bearing, shot.elevation).map((v) => v * d) as Vec3;
  const pos = rel(offset(shot.bearing, portraitDistance(shot, g)));
  const wide = shot.landscape;
  return {
    pos,
    target: rel([0, 0, 0]),
    fov: shot.fov,
    focus: 0,
    coreFocus: 0,
    frame: shot.frame,
    track: { a: at, b: at, mix: 0, turn: shot.ridesTurn ? 1 : 0 },
    landscape: wide
      ? {
          pos: rel(offset(wide.bearing ?? shot.bearing, wide.distance)),
          frame: wide.frame,
          mix: 1,
        }
      : { pos: [...pos], frame: shot.frame, mix: 0 },
    roll: 0,
  };
}

/** The TRACK_TARGETS index of the lamp's body for a shot's level (`net.lampAt`): its `lampOn`, or its target. */
export function galaxyShotLampAt(shot: GalaxyShot): number {
  return trackIndex(shot.lampOn ?? shot.target);
}

/** A probe shot's name, if `name` is one. */
export function isGalaxyShot(name: string): name is keyof typeof GALAXY_SHOTS {
  return Object.prototype.hasOwnProperty.call(GALAXY_SHOTS, name);
}

/**
 * The camera the essay draws `camera` keys through at ambient `t` on a screen of `size` (main.ts's
 * path): createEssayCamera, the keys, composeEssayCamera.
 */
export function essayCamera(
  keys: SceneState['camera'],
  g: Galaxy,
  data: BodyData,
  size: { width: number; height: number },
  t: number,
  anchors: MechanismAnchors = mechanismAnchors(mechanisms.bike),
): PerspectiveCamera {
  const camera = createEssayCamera(size.width / size.height);
  composeEssayCamera(camera, mergeState(defaultSceneState(), { camera: keys }), anchors, { g, data }, t);
  return camera;
}

/** The camera the essay draws `shot` through at ambient `t` on a screen of `size` (main.ts's path for a probe shot). */
export function galaxyShotCamera(
  shot: GalaxyShot,
  g: Galaxy,
  data: BodyData,
  size: { width: number; height: number },
  t: number,
  anchors: MechanismAnchors = mechanismAnchors(mechanisms.bike),
): PerspectiveCamera {
  return essayCamera(galaxyShotKeys(shot, g, anchors), g, data, size, t, anchors);
}

// ---- Clearance: the lit set's cylinder under the text (galaxy §8, rev 2's cylinderTop) ----

/**
 * The text band: the text panel's bottom is never lower than TEXT_BAND of the screen's height, and
 * every lit thing keeps BAND_MARGIN_PX CSS px under it. Declared in birth.ts, the one source the
 * stream shader's band mask is spliced from (Task 11 review I1).
 */
export { BAND_MARGIN_PX, TEXT_BAND };

/** A lit set's bounding cylinder: a disc in the galaxy's plane about `centre`, `halfHeight` above and below it. */
export interface LitDisc {
  centre: TrackTarget;
  radius: number;
  halfHeight: number;
}

/**
 * How far anything the galaxy draws stands above or below its system's plane, from the generated
 * galaxy (ruling 10 and Task 2's lift bound: the moons' lift is the generator's, not §12.1's 0.14): the
 * highest planet's apoapsis times the sine of its tilt, plus the highest of its radius or its moons'
 * (each moon's apoapsis times its tilt's sine, plus its radius), plus the dust's scatter (BG.dustY).
 * Rev 2's 3.55 is the same sum with the designed 2.2, 0.14 and 0.1.
 */
export function liftBound(g: Galaxy): number {
  return indexOf(g).lift;
}

/** A galaxy's planets by star and moons by planet, its lift bound and its largest shell mote, built once a galaxy (the clearance reads them thousands of times). */
interface GalaxyIndex {
  lift: number;
  /** The largest shell mote's world diameter of any body (shellMoteDiameter). */
  moteDiameter: number;
  planets: Map<number, Body[]>;
  moons: Map<number, Body[]>;
}
const indexes = new WeakMap<Galaxy, GalaxyIndex>();

function indexOf(g: Galaxy): GalaxyIndex {
  let index = indexes.get(g);
  if (index) return index;
  const planets = new Map<number, Body[]>();
  const moons = new Map<number, Body[]>();
  for (const b of g.bodies) {
    const into = b.kind === 'planet' ? planets : b.kind === 'moon' ? moons : null;
    if (into) into.set(b.host, [...(into.get(b.host) ?? []), b]);
  }
  let lift = Math.max(STAR_R, CORE_R);
  for (const list of planets.values()) {
    for (const p of list) {
      let piece = p.R;
      for (const m of moons.get(p.index) ?? []) piece = Math.max(piece, m.orbit!.r * Math.abs(Math.sin(m.orbit!.tilt)) + m.R);
      lift = Math.max(lift, p.orbit!.r * Math.abs(Math.sin(p.orbit!.tilt)) + piece);
    }
  }
  index = { lift: lift + BG.dustY, planets, moons, moteDiameter: Math.max(...g.bodies.map(shellMoteDiameter)) };
  indexes.set(g, index);
  return index;
}

/**
 * Whether body `b` has begun to come up by `growth`: its presence opens NODE_BIRTH_WINDOW before its
 * birth (bodyMote.ts bodyPresence), so the lit set holds it from there, not from `born`.
 */
function upBy(b: Body, growth: number): boolean {
  return b.born - NODE_BIRTH_WINDOW <= growth;
}

/** How far a planet's piece reaches from its centre, of what is up by `growth` (upBy): its radius, or its outermost moon's apoapsis plus that moon's radius. */
function bornPieceOuter(g: Galaxy, planet: number, growth: number): number {
  return (indexOf(g).moons.get(planet) ?? []).reduce((r, m) => (upBy(m, growth) ? Math.max(r, m.orbit!.r + m.R) : r), g.bodies[planet].R);
}

/** How far a star's system reaches from the star, of what is built by `growth`; 0 if nothing of it is. */
function bornSystemOuter(g: Galaxy, star: number, growth: number): number {
  let outer = upBy(g.bodies[star], growth) ? g.bodies[star].R : 0;
  for (const p of indexOf(g).planets.get(star) ?? [])
    if (upBy(p, growth)) outer = Math.max(outer, p.orbit!.r + bornPieceOuter(g, p.index, growth));
  return outer;
}

/**
 * The black hole's lit set (re-skin §8), about the galactic centre, once it is up with R0's build (the
 * core rows draw nothing since the re-skin's Task 5): its disk, to where it has faded out
 * (HOLE_DISK.fade's end), standing `halfHeight` above and below the plane as the core's bodies did;
 * and its jets, a thin disc of their width at the tip (jetRho(jetLength)) standing as high as their
 * tips (HOLE_JET.base + jetLength). None before R0 is built.
 */
function holeDiscs(g: Galaxy, halfHeight: number, growth: number): LitDisc[] {
  if (!upBy(g.bodies[bodyIndex(g, 'R0')], growth)) return [];
  const s = HOLE_LOOK.scale;
  return [
    { centre: { core: true }, radius: HOLE_DISK.fade[1] * s, halfHeight },
    { centre: { core: true }, radius: jetRho(HOLE_LOOK.jetLength) * s, halfHeight: (HOLE_JET.base + HOLE_LOOK.jetLength) * s },
  ];
}

/**
 * The stars `stars` (rows) with their built systems, about the neighbourhood's middle or the galactic
 * centre; null if nothing of them is built. A binary's star reaches from its barycentre's spot by its
 * apoapsis round it (anchorOf).
 */
function starsDisc(g: Galaxy, stars: readonly number[], halfHeight: number, growth: number, about: 'hood' | 'core'): LitDisc | null {
  const c = about === 'hood' ? g.hoodCentroid : [0, 0, 0];
  let radius = -1;
  for (const s of stars) {
    const outer = bornSystemOuter(g, s, growth);
    const { spot, reach } = anchorOf(g.bodies, g.bodies[s]);
    if (outer > 0) radius = Math.max(radius, Math.hypot(spot[0] - c[0], spot[2] - c[2]) + reach + outer);
  }
  return radius < 0 ? null : { centre: about === 'hood' ? { hood: true } : { core: true }, radius, halfHeight };
}

/**
 * Every disc the lamp at `lamp` about the focus body `row` (lampFocusRow; −1 none) lights, of what is
 * built by `growth` (an unbuilt body draws nothing), from the generated galaxy (ruling 10): a planet's
 * piece about the planet; a star's system about the star; the neighbourhood's systems about its
 * middle, with the core; the core; a rule's lineage, its stars' systems about the neighbourhood's
 * middle, with the core; the arms, each built system about its own star; and, with the lamp off, every
 * body's, about the galactic centre (the background is the sky, never the lit set). Every disc stands
 * liftBound(g) above and below its plane.
 */
export function litDiscs(g: Galaxy, lamp: Lamp, row: number, growth = 1): LitDisc[] {
  const halfHeight = liftBound(g);
  const focus = row >= 0 ? g.bodies[row] : null;
  const discs: (LitDisc | null)[] = [];
  switch (lamp) {
    case Lamp.Planet: {
      if (!focus || focus.planet < 0) throw new Error('litDiscs: the planet lamp needs a piece');
      const p = g.bodies[focus.planet];
      if (upBy(p, growth)) discs.push({ centre: { body: p.id }, radius: bornPieceOuter(g, p.index, growth), halfHeight });
      break;
    }
    case Lamp.Star: {
      if (!focus || focus.star < 0) throw new Error('litDiscs: the star lamp needs a system');
      const s = g.bodies[focus.star];
      const outer = bornSystemOuter(g, s.index, growth);
      if (outer > 0) discs.push({ centre: { body: s.id }, radius: outer, halfHeight });
      break;
    }
    case Lamp.Hood:
      discs.push(starsDisc(g, g.systems, halfHeight, growth, 'hood'), ...holeDiscs(g, halfHeight, growth));
      break;
    case Lamp.Core:
      discs.push(...holeDiscs(g, halfHeight, growth));
      break;
    case Lamp.Arms:
      // Each built system about its own star, a binary's star where it is on its orbit (the core dark): the arms are no one disc.
      for (const s of g.systems) {
        const outer = bornSystemOuter(g, s, growth);
        if (outer > 0) discs.push({ centre: { body: g.bodies[s].id }, radius: outer, halfHeight });
      }
      break;
    case Lamp.Lineage: {
      if (!focus) throw new Error('litDiscs: the lineage lamp needs a rule');
      const stars = g.systems.filter((s) => g.bodies[s].rule === focus.rule);
      discs.push(starsDisc(g, stars, halfHeight, growth, 'hood'), ...holeDiscs(g, halfHeight, growth));
      break;
    }
    default:
      discs.push(starsDisc(g, g.systems, halfHeight, growth, 'core'), ...holeDiscs(g, halfHeight, growth));
  }
  return discs.filter((d): d is LitDisc => d !== null);
}

/**
 * The disc the lamp at `lamp` about the focus body `row` lights with everything built (litDiscs at
 * growth 1): for the neighbourhood and the lineage, their stars' systems (the core, lit too, is
 * litDiscs' second disc).
 */
export function lampDisc(g: Galaxy, lamp: Lamp, row: number): LitDisc {
  return litDiscs(g, lamp, row, 1)[0];
}

/**
 * A frame as the keyframes hold it: the camera's keys, the lamp's level and its target (TRACK_TARGETS),
 * and the clocks that say what is drawn: `growth` (`net.growth`, what is built; the default 1 is all
 * of it) and `show` (`net.show`; nothing is drawn at 0, and the default is 1).
 */
export interface KeyedFrame {
  camera: SceneState['camera'];
  lamp: Lamp;
  lampAt: number;
  growth?: number;
  show?: number;
  /** The leaves the stream and feed dots are drawn by, when the frame shows them (a keyed state's `net`). */
  streams?: StreamLeaves;
}

/** A probe shot as a keyed frame: its keys, its lamp, on its own target, everything built. */
export function shotFrame(shot: GalaxyShot, g: Galaxy): KeyedFrame {
  return { camera: galaxyShotKeys(shot, g), lamp: shot.lamp, lampAt: galaxyShotLampAt(shot) };
}

/** Bearings round a disc's rim that cylinderTop projects. */
export const RIM_BEARINGS = 72;

/**
 * The highest screen y (CSS px from the top) of what the lit set draws, through the essay's camera
 * (essayCamera) on a screen of `size` at ambient `t`: what keeps the lit set under the text band. It
 * counts each drawn sprite's half-extent (Task 8 fix round 2, review M6), not only point centres:
 *  - the lit set's cylinder rim (litDiscs), at RIM_BEARINGS bearings on its top and its bottom
 *    circle, less half the largest sprite a body there can draw at that depth (a shell mote at the
 *    galaxy's largest grain, a lit planet's point at its largest, a moon's point);
 *  - every lit, up star's and core body's glow sprite (glowPx at its distance), less half of it;
 *  - and, for a frame that carries its stream leaves, every stream and feed dot the page lights, after
 *    the text band's mask (streamPixels; Task 11 review I1): the top of its pixel.
 * A point off the top of the screen is negative, and one behind the camera −Infinity: both fail the
 * band. Infinity when nothing is lit (the galaxy not shown, or nothing lit built).
 */
export function cylinderTop(
  shot: GalaxyShot | KeyedFrame,
  g: Galaxy,
  data: BodyData,
  size: { width: number; height: number },
  t: number = AMBIENT_POSE,
): number {
  const frame = 'camera' in shot ? shot : shotFrame(shot, g);
  if ((frame.show ?? 1) <= 0) return Infinity;
  const camera = essayCamera(frame.camera, g, data, size, t);
  camera.updateMatrixWorld();
  const eye = camera.getWorldPosition(new Vector3());
  // CSS px per world unit at distance 1 (the rig's view offset never scales it).
  const focal = 0.5 * size.height * camera.projectionMatrix.elements[5];
  const p = new Vector3();
  /** The screen y of world point `w`, and its distance from the eye; null behind the camera. */
  const screen = (x: number, y: number, z: number): { y: number; d: number } | null => {
    p.set(x, y, z);
    const d = p.distanceTo(eye);
    p.project(camera);
    return p.z > -1 && p.z < 1 ? { y: ((1 - p.y) / 2) * size.height, d } : null;
  };
  const { moteDiameter } = indexOf(g);
  const pointPx = Math.max(BODY_LOOK.litPointMax, MOON_POINT_PX[0]);
  const row = lampFocusRow(frame.lampAt, g);
  const growth = frame.growth ?? 1;
  let top = Infinity;
  for (const disc of litDiscs(g, frame.lamp, row, growth)) {
    const c = targetWorld(disc.centre, g, data, t);
    for (let k = 0; k < RIM_BEARINGS; k++) {
      const a = (2 * Math.PI * k) / RIM_BEARINGS;
      for (const y of [disc.halfHeight, -disc.halfHeight]) {
        const s = screen(c[0] + disc.radius * Math.cos(a), c[1] + y, c[2] + disc.radius * Math.sin(a));
        if (s === null) return -Infinity;
        top = Math.min(top, s.y - 0.5 * Math.max(pointPx, motePx(moteDiameter, focal / s.d)));
      }
    }
  }
  // The glow sprites: every star the lamp lights that has begun to come up (the core rows have none since
  // the re-skin's Task 5); its top is its glow's half or its highest spike tip, whichever stands higher
  // (star.ts starTopPx).
  const clocks = { lamp: frame.lamp, lampRow: row, focus: 0 };
  for (const b of g.bodies) {
    if (b.kind !== 'star' || !upBy(b, growth) || lampGain(b.index, clocks, data) <= 0) continue;
    const w = bodyWorld(data, b.index, t);
    const s = screen(w[0], w[1], w[2]);
    if (s === null) return -Infinity;
    top = Math.min(top, s.y - spriteHalfTop(b, glowPx(b.R, s.d, focal, GLOW_CAP.star), glowPx(b.R, s.d, focal, Infinity)));
  }
  if (frame.streams) for (const d of streamPixels(frame.streams, g, data, camera, size, t)) top = Math.min(top, d.y);
  return top;
}

/**
 * How far above its centre a star's or core body's sprite reaches on screen (CSS px), its glow `glow`
 * px across (`near` unclamped): the glow's half, or for a star its highest spike tip if that stands
 * higher (star.ts starTopPx, galaxyOnScreen.ts's rule too). cylinderTop's star and core term.
 */
export function spriteHalfTop(b: Pick<Body, 'look'>, glow: number, near: number): number {
  return b.look ? starTopPx(b.look, glow, near) : 0.5 * glow;
}

/** cylinderTop's margin under the band on a screen of `size`: negative when the lit set reaches into it. */
export function bandClearance(
  shot: GalaxyShot | KeyedFrame,
  g: Galaxy,
  data: BodyData,
  size: { width: number; height: number },
  t: number = AMBIENT_POSE,
): number {
  return cylinderTop(shot, g, data, size, t) - (TEXT_BAND * size.height + BAND_MARGIN_PX);
}

// ---- The zoom-out (galaxy §14.3, §14.5; the plan's ruling 12) ----

/** A camera in world terms, untracked: Act I's last shot, read back from its keys. */
export interface WorldShot {
  target: Vec3;
  bearing: number;
  elevation: number;
  distance: number;
  fov: number;
  frame: number;
}

const DEG = Math.PI / 180;

/** Sampled camera keys read back into world terms about the tracked point (the anchors' inverse). */
export function worldShotOf(camera: SceneState['camera'], anchors: MechanismAnchors = mechanismAnchors(mechanisms.bike)): WorldShot {
  const { center, radius } = anchors.whole;
  const world = (v: Vec3): Vec3 => [0, 1, 2].map((k) => center[k] + v[k] * radius) as Vec3;
  const target = world(camera.target);
  const pos = world(camera.pos);
  const [dx, dy, dz] = [pos[0] - target[0], pos[1] - target[1], pos[2] - target[2]];
  return {
    target,
    bearing: Math.atan2(dx, dz) / DEG,
    elevation: Math.atan2(dy, Math.hypot(dx, dz)) / DEG,
    distance: Math.hypot(dx, dy, dz),
    fov: camera.fov,
    frame: camera.frame,
  };
}

/**
 * Act I's last camera keys (keyframes.json, from spec@0.9 on): S10′ as Act I holds it, rounded as its
 * keys are. netShots.test.ts holds them to the file (this module is also the probe shots', which load
 * no keyframes).
 */
export const ACT_ONE_LAST = { pos: [2.653, 1.751, 2.655] as Vec3, target: [-0.001, 0.001, 0.001] as Vec3, fov: 35, frame: 0 } as const;

/**
 * Act I's last shot (S10′, the finished bike riding, shots.ts SHOTS.S10p), in world terms: where Act
 * II's camera starts, read from the keys Act I holds it at, so Act II's first key is that key exactly.
 */
export const S10P: WorldShot = worldShotOf({ ...shotKeys(SHOTS.S10p, mechanismAnchors(mechanisms.bike)), ...ACT_ONE_LAST });

/** Z0 (galaxy §14.5 with ruling 12): straight down on the bike's planet, close, as the reflow gathers it. */
export const Z0 = {
  target: { body: 'N0' },
  bearing: 0,
  elevation: 86,
  distance: 9,
  fov: 36,
  frame: 1,
  lamp: Lamp.Planet,
} as const satisfies GalaxyShot;

/** Section-local keys of a clock, linear between them (an `ease` key eases into it). */
type ClockKeys = readonly { at: number; value: number; ease?: 'inOutCubic' }[];

/** A clock's value at local `l` over its keys, as the keyframe sampler has it. */
function clockAt(keys: ClockKeys, l: number): number {
  if (l <= keys[0].at) return keys[0].value;
  for (let i = 1; i < keys.length; i++) {
    const [a, b] = [keys[i - 1], keys[i]];
    if (l <= b.at) return a.value + (b.value - a.value) * (b.ease ? EASINGS[b.ease] : EASINGS.linear)((l - a.at) / (b.at - a.at));
  }
  return keys[keys.length - 1].value;
}

/**
 * The zoom-out (zoom-out-local), as the plan's ruling 12 times it and the text band holds it:
 *  - S10′ to Z0 over [0, arrive] on the camera spline, the rise overlapping the reflow (0.04-0.40)
 *    so the bike is seen from three-quarters as it starts to come apart, and overhead only as it
 *    gathers (script draft 4, zo-1); Z0 held to `pullFrom`; then the distance
 *    log-linear from Z0's to the galaxy wide's, the target walking N0 → P_a → the neighbourhood → the
 *    core over `walk`'s spans (the second and third start a thousandth late: their step keys need the
 *    room, actTwoKeys), the field and the frame to the galaxy wide's as it goes. The walk leaves the
 *    bike's planet and its star only as the arms' pieces come up round them (to P_a by 0.60, the
 *    neighbourhood by 0.80; fix round 1, ruling C), so the middle of the pull keeps lit pieces in it.
 *  - The camera rides the galaxy's turn from Z0 on (`camera.track.turn` 1, eased on over the move to
 *    it): the walk runs the same way across the screen at every ambient, the core ahead, so the lit
 *    set's place under the text is one composition, not eight (ruling 5).
 *  - On a landscape screen the camera stands `landscape.scale` times as far off its target from Z0 on
 *    (eased on over the move): a wide screen is short (ruling 4's rule, cameraRig.ts landscapeRig).
 *    Over the pull the factor runs log-linearly from `landscape.scale` to the galaxy wide's own
 *    landscape ratio (GALAXY_WIDE's landscapeDistance / distance, Task 1d), so a landscape screen
 *    ends on the wide as `far` frames it there.
 *  - The lamp opens a level at each of `lamp`'s steps (script draft 4, zo-2: "one piece, its arm, all
 *    of it"): the planet's from the start, the arms (every system, the hub dark), the neighbourhood
 *    with the hub, then off. Each step is the first hundredth of the pull from which that level's lit
 *    set (litDiscs, what is up) stays clear of the text band at both sizes and every AMBIENT_GRID pose
 *    to the end, as fitted (netShots.test.ts checks that each clears).
 *  - The clocks the lit set reads: `growth` and `show` (the galaxy comes up). Growth is keyed against
 *    the schedule's births (Task 8 fix round 1, ruling C), never held (the growth never stops): under
 *    P_a's birth window until the arms light, so the first plans come up lit as the camera rises (P_a,
 *    then the first other star's system); slowly under the next star's window until its system clears
 *    the band; then up to 0.12, where layers takes it on. The middle of the pull is never empty.
 */
export const ZOOM_OUT = {
  arrive: 0.3,
  pullFrom: 0.4,
  walk: [
    { from: 0.4, to: 0.6, a: { body: 'N0' }, b: { body: 'P_a' } },
    { from: 0.601, to: 0.8, a: { body: 'P_a' }, b: { hood: true } },
    { from: 0.801, to: 1, a: { hood: true }, b: { core: true } },
  ],
  lamp: [
    { at: 0, lamp: Lamp.Planet },
    { at: 0.52, lamp: Lamp.Arms },
    { at: 0.88, lamp: Lamp.Hood },
    { at: 0.95, lamp: Lamp.Off },
  ],
  landscape: { scale: 1.3 },
  growth: [
    { at: 0, value: 0 },
    { at: 0.52, value: 0.018 },
    { at: 0.61, value: 0.05 },
    { at: 0.74, value: 0.053 },
    { at: 0.76, value: 0.1 },
    { at: 0.9, value: 0.118 },
    { at: 1, value: 0.12 },
  ],
  show: [
    { at: 0.3, value: 0 },
    { at: 0.5, value: 1, ease: 'inOutCubic' },
  ],
  far: GALAXY_SHOTS.galaxyWide,
} as const satisfies { growth: ClockKeys; show: ClockKeys; [k: string]: unknown };

/** The zoom-out at section-local `l`: the camera about its tracked point, what it tracks, how it rides, and the lamp. */
export interface ZoomOutFrame {
  /** World offset of the target from the tracked point (S10′'s from N0, the origin, then 0). */
  target: Vec3;
  bearing: number;
  elevation: number;
  distance: number;
  fov: number;
  frame: number;
  /** The tracked point: `mix` of the way from `a` to `b`. */
  a: TrackTarget;
  b: TrackTarget;
  mix: number;
  /** How far the camera rides the galaxy's turn (`camera.track.turn`). */
  turn: number;
  /** How far off its target the camera stands on a landscape screen, as a multiple of `distance`. */
  landscape: number;
  lamp: Lamp;
  growth: number;
  show: number;
}

const inOut = EASINGS.inOutCubic;

/**
 * The zoom-out at section-local `l` (the generated pull): S10′ to Z0 on the camera spline
 * (cameraSpline.ts, inOutCubic) over [0, arrive], the ride and the landscape distance eased on with
 * it; Z0 to `pullFrom`; then the pull: the distance log-linear to the galaxy wide's 640, the field and
 * the frame linear to its, the walk's mix eased over each span.
 */
export function zoomOutShot(l: number): ZoomOutFrame {
  const { arrive, pullFrom, walk, far, lamp, landscape } = ZOOM_OUT;
  const n0: TrackTarget = { body: 'N0' };
  const clocks = {
    lamp: [...lamp].reverse().find((s) => l >= s.at)!.lamp,
    growth: clockAt(ZOOM_OUT.growth, l),
    show: clockAt(ZOOM_OUT.show, l),
  };
  if (l <= arrive) {
    const pts = [cameraChannels(S10P, S10P.target), cameraChannels(Z0, [0, 0, 0])];
    const u = inOut(Math.min(1, Math.max(0, l / arrive)));
    const c = channelShot(cameraSpline(pts, [0, 1], u, lookFromBearing));
    return {
      ...c,
      frame: S10P.frame + (Z0.frame - S10P.frame) * u,
      a: n0,
      b: n0,
      mix: 0,
      turn: u,
      landscape: 1 + (landscape.scale - 1) * u,
      ...clocks,
    };
  }
  const held = { target: [0, 0, 0] as Vec3, bearing: Z0.bearing, turn: 1, landscape: landscape.scale, ...clocks };
  if (l <= pullFrom) return { ...held, elevation: Z0.elevation, distance: Z0.distance, fov: Z0.fov, frame: Z0.frame, a: n0, b: n0, mix: 0 };
  const u = Math.min(1, (l - pullFrom) / (1 - pullFrom));
  const span = walk.find((w) => l <= w.to) ?? walk[walk.length - 1];
  const farLandscape = (far.landscape?.distance ?? (far.distance as number)) / (far.distance as number);
  return {
    ...held,
    landscape: landscape.scale * (farLandscape / landscape.scale) ** u,
    elevation: Z0.elevation + (far.elevation - Z0.elevation) * u,
    distance: Z0.distance * ((far.distance as number) / Z0.distance) ** u,
    fov: Z0.fov + (far.fov - Z0.fov) * u,
    frame: Z0.frame + (far.frame - Z0.frame) * u,
    a: span.a,
    b: span.b,
    mix: inOut(Math.min(1, Math.max(0, (l - span.from) / (span.to - span.from)))),
  };
}

/** A zoom-out frame as the essay's camera keys (the bike's anchors, coreFocus 0), tracked, ridden and lamped as it says. */
export function zoomOutKeys(l: number, anchors: MechanismAnchors = mechanismAnchors(mechanisms.bike)): KeyedFrame {
  const z = zoomOutShot(l);
  const rel = relKeys(anchors);
  const dir = lookFromBearing(z.bearing, z.elevation);
  const at = (d: number) => rel([0, 1, 2].map((k) => z.target[k] + dir[k] * d));
  const camera: SceneState['camera'] = {
    pos: at(z.distance),
    target: rel(z.target),
    fov: z.fov,
    focus: 0,
    coreFocus: 0,
    frame: z.frame,
    track: { a: trackIndex(z.a), b: trackIndex(z.b), mix: z.mix, turn: z.turn },
    landscape: { pos: at(z.distance * z.landscape), frame: z.frame, mix: 1 },
    roll: 0,
  };
  return { camera, lamp: z.lamp, lampAt: trackIndex({ body: 'N0' }), growth: z.growth, show: z.show };
}

/** Zoom-out locals of the generated camera keys: the rise to Z0 in thirty-two steps, the hold's end, and the pull every 0.025. */
export const ZOOM_OUT_KEY_LOCALS: readonly number[] = [
  ...Array.from({ length: 33 }, (_, i) => (ZOOM_OUT.arrive * i) / 32),
  ...Array.from({ length: 25 }, (_, i) => ZOOM_OUT.pullFrom + ((1 - ZOOM_OUT.pullFrom) * i) / 24),
];

// ---- Layers and far (galaxy §14.5; the plan's Task 9) ----

/**
 * Layers' length in screens. The author deleted ly-6 ("All of it is one system.", 2026-10-09), and the
 * section lost the 0.7 screens it held at its end; every other place in it kept its scroll, so they
 * are given in screens from the section's start (`layersAt`), not as locals of a length that changed.
 */
export const LAYERS_LENGTH = 4.3;

/** The place `screens` screens into layers. */
export function layersAt(screens: number): SectionAt {
  return ['layers', screens / LAYERS_LENGTH];
}

/**
 * The `frame` that puts a shot's target at `ndcY` (the NDC height it stands at) on a screen of
 * `orientation` (cameraRig.ts targetOnScreen): the share of the way from the wide framing's height to the
 * close one's, to a thousandth, as every camera key is rounded.
 */
function frameAtNdc(ndcY: number, orientation: keyof typeof FRAMING): number {
  const { wide, close } = FRAMING[orientation];
  return Math.round((((1 - ndcY) / 2 - wide.y) / (close.y - wide.y)) * 1e3) / 1e3;
}

/**
 * The close shot on the black hole (re-skin §8): the inspector's essay framing, target the galactic
 * centre at its elevation (HOLE_VIEW, 16°), the hole at NDC y −0.42 on both screens (frame 0.643 of the
 * portrait framing, 0.417 of the landscape's: frameAtNdc; 0.71 of the screen's height down to 2e-5),
 * riding the galaxy's turn, lamp Core.
 *  - On a phone the portrait rig (cameraRig.ts portraitRig) stands the camera √m further off and opens
 *    the field by √m (m 1.926 on 390 × 844), so the keyed 54 at 33° is the inspector's own camera there:
 *    75 off through 45°, the disk's outer diameter on screen within 1 % of the inspector's (the dots,
 *    sized by 75 / depth, at its size too).
 *  - On a landscape screen it stands off 105 through the same 33°: the disk is the inspector's share of
 *    the screen's height (362 px on 900), its dots 75 / 105 of their size.
 *  - Bearing 165 (degrees round the centre from +z at ambient 0): the camera stands 72 units out and 21
 *    up on a phone, about 101 out on a desktop, on the side of the centre where no system is (the
 *    neighbourhood's stars lie between bearings −45 and 130); there C7, at about 45, lies to the side
 *    of the hole, not behind it, so its in-fall does not come down through the text band.
 * ly-2, up-1, tr-2, fx-1 and fx-2 are this shot (fx-1 to fx-2 one hold: there is one hole).
 */
export const HOLE_CLOSE: GalaxyShot = {
  target: { core: true },
  bearing: 165,
  elevation: HOLE_VIEW.elevation,
  distance: 54,
  fov: 33,
  frame: frameAtNdc(HOLE_VIEW.ndcY, 'portrait'),
  lamp: Lamp.Core,
  landscape: { distance: 105, frame: frameAtNdc(HOLE_VIEW.ndcY, 'landscape') },
  ridesTurn: true,
};

/**
 * The layers shots (galaxy §14.5, lamps as ruling 9), one a page. Each keeps
 * §14.5's target, bearing, elevation, field and lamp. §14.5's distance and frame put every one of
 * their lit sets into the text band (cylinderTop) on both screens, so each shot takes the nearest
 * change that clears it at every AMBIENT_GRID pose with what is built under its line, and keeps its
 * subject (its bodies, built ones, whole discs) inside the screen over the hour, as fitted;
 * netShots.test.ts checks that each clears and keeps its subject whole:
 *  - on a phone it composes lower (`frame`, the first hundredth that clears). Where composing that low
 *    would put a body of its subject off the bottom of the screen, it first stands the least further
 *    off (a whole hundredth of the multiple, or a whole unit): ly-1 and ly-5 at 3.31 and 3.11 times
 *    P_a's system (§14.5's 2.7). ly-2 keeps §14.5's distance and only composes lower. ly-3 and ly-4
 *    are re-keyed so their lines are true of the picture (fix round 1, each documented below).
 *  - on a landscape screen it stands further off, composed wide (the landscape rule, ruling 4: a
 *    short screen), at the nearest whole distance that clears.
 * Every shot rides the galaxy's turn, as the zoom-out before it ends, so each is one composition at
 * every ambient.
 */
export const LAYERS_SHOTS = {
  'ly-1': {
    target: { body: 'P_a' },
    bearing: 20,
    elevation: 60,
    distance: { outerTimes: 3.31 },
    fov: 38,
    frame: 0.28,
    lamp: Lamp.Star,
    landscape: { distance: 66, frame: 0 },
    ridesTurn: true,
  },
  // The hole close (re-skin §8, Task 5): §14.5's 30 at 64° on the core's bodies before.
  'ly-2': HOLE_CLOSE,
  /**
   * On the core, overhead, from the side the arm's knot of stars lies on (bearing 42: the
   * neighbourhood's middle lies 42 degrees round from +z, seen from the core), so the core is in the
   * middle of the screen and the stars arc round it below, out to both sides (fix round 1: §14.5's
   * neighbourhood target put the core at the left of a phone with the stars under it). 234, 486 on a
   * landscape screen: Task 1d's re-fit, the least whole distances at which the wider neighbourhood's
   * built stars are whole in the frame (191 and 273 before).
   */
  'ly-3': {
    target: { core: true },
    bearing: 42,
    elevation: 82,
    distance: 234,
    fov: 40,
    frame: 0,
    lamp: Lamp.Hood,
    landscape: { distance: 486, frame: 0 },
    ridesTurn: true,
  },
  /**
   * Out from N0's star ("Out at the edge, the code, written from the plans"; fix round 1, re-aimed by
   * Task 1d). It starts on P_a, N0's star, and rides out to star-4 (LY4_RIDE): of the filler systems
   * outward of P_a (a greater galactic radius), nearest first, the first with a planet of its own born
   * under the beat (planet-10). The camera then pushes in on star-4 (LY4_CLOSE) and holds while that
   * planet lands beside it. Lamp Arms over the ride: every system lit, the core dark. Bearing 38 lays
   * the ride across the screen, left to right (the wider neighbourhood put star-4 the other way round
   * P_a from where -126 looked along it), far enough that each system is a few tens of px across, its
   * planets points beside it (planet points from 10-20 px of system, shells 25-50, tracks and moons from
   * 60). As the other shots: on a phone it stands at the least whole distance at which its frame clears
   * the band over the whole ride, keeps at least three built systems of at least 16 px in view under the
   * text at its start, middle and end (four of 20 px before the wider spacing), and keeps the ride's two
   * end systems (P_a's at its start, star-4's at its end) whole in the frame over the hour (130, frame
   * 0.29); on a landscape screen it stands further off, composed wide (212).
   */
  'ly-4': {
    target: { body: 'P_a' },
    bearing: 38,
    elevation: 66,
    distance: 130,
    fov: 40,
    frame: 0.29,
    lamp: Lamp.Arms,
    landscape: { distance: 212, frame: 0 },
    ridesTurn: true,
  },
  'ly-5': {
    target: { body: 'P_a' },
    bearing: -10,
    elevation: 72,
    distance: { outerTimes: 3.11 },
    fov: 40,
    frame: 0.41,
    lamp: Lamp.Star,
    landscape: { distance: 66, frame: 0 },
    ridesTurn: true,
  },
} as const satisfies Record<string, GalaxyShot>;

/** fr-1 (galaxy §14.5): the galaxy wide on the core, lamp off, riding the turn, from bearing 0; it turns under its line (FAR_ORBIT). */
export const FAR_SHOT: GalaxyShot = { ...GALAXY_SHOTS.galaxyWide, ridesTurn: true };

/** A place in a section: its id and its local progress. */
export type SectionAt = readonly [section: string, local: number];

/**
 * fr-1's slow overhead turn: the bearing from FAR_SHOT's to FAR_SHOT's plus `bearing` over [from,
 * until], one inOutCubic sampled at `keys` evenly spaced keys (the storyboard's twelve), linear between
 * them, as Act I's lap is. It runs from where fr-1 is full ink to where its stop must already be at
 * rest (the page starts to fade at far 0.9375, the stop sits a margin before that, and the rest window
 * before the stop).
 */
export const FAR_ORBIT = { from: ['far', 0.0625] as SectionAt, until: ['far', 0.9] as SectionAt, bearing: 40, keys: 12 } as const;

/**
 * ly-4's ride out along the arm (fix round 1): from LAYERS_SHOTS['ly-4'] on P_a to the same shot on
 * star-4, one inOutCubic from where ly-4 is full ink. The lamp stays as it is: Arms tests no focus.
 * It ends at layers 3.3 (3.4 before Task 1d's fix round 1), where the push-in (LY4_CLOSE) takes over.
 */
export const LY4_RIDE = {
  to: { ...LAYERS_SHOTS['ly-4'], target: { body: 'star-4' } } as GalaxyShot,
  from: layersAt(2.9),
  until: layersAt(3.3),
} as const;

/**
 * ly-4's push-in on star-4 (Task 1d fix round 1, the controller's provisional ruling): from the ride's
 * end (130, 212 on a landscape screen) in to 66 (138), marked one motion (`push`: the same target and
 * bearing), over layers 3.3-3.4, and held to ly-5's move at 3.5. The lamp narrows to star-4's system on
 * the push's first thousandth (Arms clears to there; at 66 the arm's lit systems would stand in the band).
 * In the hold, planet-10 (born at growth 0.2063; layers' growth keyed 0.2125 at 3.4) is at least half
 * landed and at least 4 px across on both screens: the code at the edge, written, beside its star.
 * Each distance is the least whole one at which planet-10 is 4 px across at every AMBIENT_GRID pose.
 */
export const LY4_CLOSE = {
  shot: { ...LY4_RIDE.to, distance: 66, lamp: Lamp.Star, landscape: { distance: 138, frame: 0 } } as GalaxyShot,
  from: layersAt(3.3),
  until: layersAt(3.4),
} as const;

// ---- Defect and spread (galaxy §14.5; freeze-frame §1.1; the plan's Task 10, its shot pass) ----

/**
 * Degrees the galaxy has turned by AMBIENT_POSE (trackTurn): a close shot that rides the turn stands
 * this much back of §14.5's bearing, so at the pose, the freeze pin's instant, it stands where §14.5
 * (and the pin's camera, ambient.ts closeCamera) puts it.
 */
export const POSE_TURN_DEG = (trackTurn({ a: 0, b: 0, mix: 0, turn: 1 }, AMBIENT_POSE) * 180) / Math.PI;

/**
 * The defect's and spread's shots (galaxy §14.5 with Task 10's approved shot pass, which rendered each
 * against its line at the pose; where they differ from §14.5's values the shot pass rules). Every one
 * rides the galaxy's turn, as every Act II shot does, so no move swings the camera round its target by
 * however far the galaxy has turned; the close shots ride it from POSE_TURN_DEG back of their bearing.
 *  - `df-1`, N8a: where the dive lands, the close shot on C1 stood further off (4.5), the push-in's
 *    start; on a landscape screen the close shot's landscape distance scaled by the same 4.5 / 3.4
 *    (8.6, composed wide), so the planet is whole and under the text there too.
 *  - `df-2`, N8: the close shot (HERO_CLOSE.C1), held through df-2 and df-2b; at the pose it is the
 *    freeze pin's camera (netShots.test.ts checks it on the keyed frame).
 *  - `df-3` (df-3 to df-5): the built twelve, lamp 5 (R0's lineage, through P1's rule).
 *  - `up-1`: the hole close (HOLE_CLOSE, re-skin Task 5; R1 stood off at 50 before), lamp 4, the core.
 *  - `up-2`: the neighbourhood from §14.5's bearing and elevation, stood off (258, frame 0.85) so the
 *    healthy stars and the core keep under the text; 678 on a landscape screen (re-skin Task 1e's
 *    re-fit to the binary star-7 and star-14, whose stars swing about 13 units about their barycentre:
 *    the least whole distances that clear; Task 1d's 221 and 581 before, and 169 and 442 before it). Lamp 3.
 * Each clears the text band at both sizes and every AMBIENT_GRID pose with what is built under its
 * line: the lamp-1 shots and the twelve by their projected visible bodies with their sprites (the lit
 * set's cylinder counts the whole galaxy's lift, far above a close piece, and the lineage's disc spans
 * every R0 star, so it cannot pass where the pixels do); up-1 and up-2 by cylinderTop.
 * netShots.test.ts checks each.
 */
export const DEFECT_SHOTS = {
  'df-1': {
    target: { body: 'C1' },
    bearing: close.bearing - POSE_TURN_DEG,
    elevation: close.elevation,
    distance: 4.5,
    fov: close.fov,
    frame: close.frame,
    lamp: Lamp.Planet,
    landscape: { distance: 8.6, frame: 0 },
    ridesTurn: true,
  },
  'df-2': { ...GALAXY_SHOTS.close, bearing: close.bearing - POSE_TURN_DEG, ridesTurn: true },
  'df-3': GALAXY_SHOTS.twelve,
  // The hole close (re-skin §8, Task 5): R1 from 60 at 60° before.
  'up-1': HOLE_CLOSE,
  'up-2': {
    target: { hood: true },
    bearing: 0,
    elevation: 82,
    distance: 258,
    fov: 40,
    frame: 0.85,
    lamp: Lamp.Hood,
    landscape: { distance: 678, frame: 0 },
    ridesTurn: true,
  },
} as const satisfies Record<string, GalaxyShot>;

/**
 * Spread's length in screens. The author deleted the wordless second fix after up-1 (2026-10-09:
 * redundant): the stretch from up-1's page going (1.44 screens in) to up-2 coming up (2.232) is gone,
 * 0.792 screens of the section's 3.6, and up-2 comes up as up-1's page goes. Every other place kept
 * its scroll from the nearer end of the section, so they are given in screens (`spreadAt`).
 */
export const SPREAD_LENGTH = 2.808;

/** The place `screens` screens into spread. */
export function spreadAt(screens: number): SectionAt {
  return ['spread', screens / SPREAD_LENGTH];
}

/**
 * The lamp steps of the moves that touch spread, on the thousandths of its section (the moves' band
 * test samples every thousandth): the first from which the new level clears the band to the move's
 * end, the old one clearing up to there, as fitted.
 */
const SPREAD_LAMPS = { toHood: 0.518, toReview: 0.965 } as const;

// ---- Reviewer, trace, fix and lesson (galaxy §14.5; the plan's Task 11, its shot pass) ----

/**
 * The reviewer's, the trace's, the fix's and the lesson's shots (galaxy §14.5 with Task 11's approved shot pass, which rendered
 * each beat against its line at the pose on both screens; where they differ from §14.5's values the
 * shot pass rules). Every one rides the galaxy's turn.
 *  - `re-1` (re-1 and re-2): P5 from bearing -127, stood off 3.5 times its system, lamp 2 on P5: the
 *    ring visits V1-V9 on P5, and at §14.5's -170 and 2.7 the visits left the frame over the hour and
 *    the desktop's lit set stood in the band. 70 on a landscape screen, composed wide.
 *  - `re-3`: the hub and the light together, about the middle of P5 and R0, lamp 4 (the core lit, so
 *    the feed comes out of the hub): "the reviewer read the same rule" is the one dotted line from R0
 *    to the ring (the feed at FEED_CAP, alone: `net.streams` 0, `net.feed` 1). 300 on a landscape
 *    screen at bearing -51. The camera pulls back to it under re-3's line, the first leg of the climb.
 *  - `tr-1`: the lineage wide on the core, lamp 5 on R0's lineage (`lampOn`): every ember branch runs
 *    in to the core, the line's "back" as one picture. 210, so no star of the lineage is cut by a
 *    phone's edge; 340 on a landscape screen at bearing -10, so it is whole there too.
 *    tr-2's surge pulls back to it.
 *  - `tr-2`, `fx-1` and `fx-2`: the hole close (HOLE_CLOSE, re-skin Task 5), lamp 4, held from the
 *    move into fix to fx-3's: there is one hole, so no pan. (Before, tr-2 and fx-1 stood 8 units off R0
 *    and fx-2 off R1, the camera standing back to pan across the hub between them.)
 *  - `fx-3` (fx-3 and fx-4): up-2's framing at 258, lamp 3: the two rules healed in the core, P7 and
 *    Q3 forming in plain blue (at §14.5's 60 both were out of the frame and the core in the band), then
 *    the sweep, hub to rim. 678 on a landscape screen (re-skin Task 1e's re-fit to the binary, the least
 *    whole distances that clear, as up-2's; Task 1d's 237 and 622 before, and 210 and 540 before it).
 *    fx-4 holds it: no move on that turn.
 *  - `ls-1`: overhead of the core from ly-3's side, further off (270), lamp 3: the core in the middle,
 *    the stars in a ring round it, the arm's dust to the edges ("rings around a centre"). 420 on a
 *    landscape screen (Task 1d: at 400 under three-quarters of the wider neighbourhood's stars stood in
 *    view).
 * Each clears the band at both sizes and every AMBIENT_GRID pose with what is built under its line:
 * the close shots by their projected visible bodies with their sprites (the camera stands inside the
 * core's lit disc, so the lit set's cylinder cannot pass), the rest by cylinderTop.
 * netShots.test.ts checks each.
 */
export const LATE_SHOTS = {
  're-1': {
    target: { body: 'P5' },
    bearing: -127,
    elevation: 68,
    distance: { outerTimes: 3.5 },
    fov: 38,
    frame: 0.5,
    lamp: Lamp.Star,
    landscape: { distance: 70, frame: 0 },
    ridesTurn: true,
  },
  're-3': {
    target: { centroid: ['P5', 'R0'] },
    bearing: 39,
    elevation: 75,
    distance: 170,
    fov: 38,
    frame: 0.85,
    lamp: Lamp.Core,
    landscape: { distance: 300, frame: 0, bearing: -51 },
    ridesTurn: true,
  },
  'tr-1': {
    target: { core: true },
    bearing: 42,
    elevation: 82,
    distance: 210,
    fov: 40,
    frame: 0,
    lamp: Lamp.Lineage,
    lampOn: { body: 'R0' },
    landscape: { distance: 340, frame: 0, bearing: -10 },
    ridesTurn: true,
  },
  // The hole close (re-skin §8, Task 5): R0 at 8 units before (R1 for fx-2, after a pan across the hub).
  'tr-2': HOLE_CLOSE,
  'fx-1': HOLE_CLOSE,
  'fx-2': HOLE_CLOSE,
  'fx-3': {
    target: { hood: true },
    bearing: 0,
    elevation: 82,
    distance: 258,
    fov: 40,
    frame: 0.85,
    lamp: Lamp.Hood,
    landscape: { distance: 678, frame: 0 },
    ridesTurn: true,
  },
  'ls-1': {
    target: { core: true },
    bearing: 42,
    elevation: 82,
    distance: 270,
    fov: 40,
    frame: 0,
    lamp: Lamp.Hood,
    landscape: { distance: 420, frame: 0 },
    ridesTurn: true,
  },
} as const satisfies Record<string, GalaxyShot>;

/** The close shots of the late sections: held to their visible bodies, not cylinderTop (LATE_SHOTS). */
export const LATE_CLOSE: readonly (keyof typeof LATE_SHOTS)[] = ['tr-2', 'fx-1', 'fx-2'];

/** The beats whose shot is HOLE_CLOSE (re-skin §8): their lit set is held to what is drawn, the hole's twin (holeTop) among it. */
export const HOLE_CLOSE_BEATS = ['ly-2', 'up-1', 'tr-2', 'fx-1', 'fx-2'] as const;

/** What a move lands on: a layers shot, the end of ly-4's ride, its push-in on star-4, fr-1 at the start of its turn, a defect, spread or later shot, or tr-2's surge (tr-1's wide). */
export type MoveShot = keyof typeof LAYERS_SHOTS | 'ly-4 ride' | 'ly-4 close' | 'fr-1' | keyof typeof DEFECT_SHOTS | keyof typeof LATE_SHOTS | 'tr-2 surge';

/**
 * Act II's moves after the zoom-out, each over a page turn (galaxy §14.5, "moves ride the page turns")
 * unless its shot moves under its line: from where the page before starts to fade to where the
 * next is full ink, to the shot it names. The first starts a thousandth after the zoom-out's end, so
 * the tracked target steps where it does not show. `lamp` is where the lamp takes the new shot's level
 * and focus: the first thousandth of the section from which the new level clears the band to the end
 * of the move, the old one clearing it up to there, as fitted (netShots.test.ts checks the band at
 * every sample of the moves). The defect's and spread's moves come after them (NET_MOVES), then those
 * of reviewer to lesson (LATE_MOVES), the last of which lands on ls-1, which lesson holds to the end.
 */
export interface Move {
  shot: MoveShot;
  from: SectionAt;
  until: SectionAt;
  lamp: SectionAt;
  /**
   * Where no one step clears the band, the lamp passes through one narrower set on the way (`lamp` on
   * `on`), from `at`, the last thousandth to which the old level clears, to the move's `lamp`, the first
   * from which the new one does. (Fix round 1 put one on the swing from the core round to the arm into
   * ly-4 and on the way back from star-4 to P_a into ly-5; Task 1d's re-aimed ride needs neither.)
   */
  via?: { at: SectionAt; lamp: Lamp; on: TrackTarget };
  /**
   * A move made as one motion, eased over all of it, where the others pull and pan in turn
   * (moveShares): `ride`, ly-4's, which neither stands off nor closes in, and `push`, a push-in,
   * which has nothing to pan (the same target and bearings). Marked, not inferred from the poses.
   */
  motion?: 'ride' | 'push';
  /**
   * A move that ends nearer pans first over this share of its scroll (MOVE_LEAD otherwise), so it
   * swings to its new target quickly, and closes in over MOVE_LEAD as before. ly-5 swings to P_a as soon
   * as ly-4's hold ends, so a phone sees no empty sky between star-4 and P_a.
   */
  pan?: number;
}

/**
 * The defect's and spread's moves (Task 10), each generated as a target-relative move like the
 * layers moves (moveShares: a move that ends further off pulls back first and pans after, one that
 * ends nearer pans first; the push-in, marked one motion, pushes in over all of it). `lamp` is fitted as
 * ACT_TWO_MOVES says, the lamp-1 and lineage sets measured by their visible bodies (DEFECT_SHOTS):
 *  - `dive`: from fr-1 at the end of its turn to N8a over the page turn into defect (the tracked
 *    point the core → C1; d 640 → 4.5).
 *  - `pushIn`: N8a to N8, the close shot, over defect 0.04-0.20 (freeze-frame §1.1), with `net.focus`
 *    0 → 1 (FOCUS_KEYS).
 *  - `pullOut`: the close shot to the twelve over the page turn (0.4392-0.4808), from where df-2b's
 *    page starts to fade, so its stop is just before it; `net.focus` 1 → 0 before the lamp opens.
 *  - `follow`: the twelve to up-1 over the page turn into spread: the lamp narrows to C7's piece
 *    (lamp 1 on C7) and the camera pans in to the rule, the core lighting as it arrives (galaxy §14.5
 *    up-1: "the follow: C7 → the core"). No one step from the lineage to the core clears the band over
 *    the pan. C7's up-stream in to R1 is not on screen yet: it comes up after the follow, under up-1's
 *    line (growth 0.385, about 0.30 screens into spread).
 *  - `toHood`: up-1 to up-2 over the page turn, pulling back from R1 first and panning to the
 *    neighbourhood after. (The author deleted the wordless second fix that played here, a dive to C5
 *    and its mend, 2026-10-09: redundant. Spread lost its 0.792 screens; see SPREAD_LENGTH.)
 * The move from up-2 into reviewer is the first of LATE_MOVES.
 */
export const NET_MOVES = {
  dive: { shot: 'df-1', from: ['far', 0.9375], until: ['defect', 0.02083333], lamp: ['far', 0.938] },
  pushIn: { shot: 'df-2', from: ['defect', 0.04], until: ['defect', 0.2], lamp: ['defect', 0.04], motion: 'push' },
  pullOut: { shot: 'df-3', from: ['defect', 0.43916667], until: ['defect', 0.48083333], lamp: ['defect', 0.472] },
  follow: {
    shot: 'up-1',
    from: ['defect', 0.97916667],
    until: spreadAt(0.1),
    // Re-fitted by the re-skin's Task 5 (spread 0.027 before): the core is the hole now, and lit, it clears
    // from defect 0.995, early in the pan from the twelve down to the hole close.
    lamp: ['defect', 0.995],
    via: { at: ['defect', 0.983], lamp: Lamp.Planet, on: { body: 'C7' } },
  },
  toHood: { shot: 'up-2', from: spreadAt(1.34), until: spreadAt(1.54), lamp: ['spread', SPREAD_LAMPS.toHood] },
} as const satisfies Record<string, Move>;

/**
 * The moves of reviewer to lesson (Task 11), generated as the others (moveShares), each lamp
 * step fitted as ACT_TWO_MOVES says, the close shot's and the lineage's lit sets measured by their
 * visible bodies:
 *  - `toReview`: up-2 to re-1 over the page turn into reviewer (it ends nearer: it pans first).
 *  - `toHub`: re-1 to re-3 under re-3's line, from where it is full ink, as the feed comes up (the
 *    script's "a stream runs out from the hub to the light"): the camera pulls back from the reviewer's
 *    light until the hub is in the frame with it, the lamp opening on the core.
 *  - `climb`: re-3 to tr-1 over the page turn into trace, pulling back and turning to the core, the
 *    lamp taking R0's lineage, `net.streams` coming up: the script's "the camera starts to follow it
 *    inward", which re-3's direction puts under its line and the keys put on the turn after it.
 *  - `toSource`: tr-1 to tr-2 under tr-2's line, from where it is full ink: in to R0, the source.
 *  - `fanOut`: tr-2 back out to tr-1's wide (`tr-2 surge`) while R0 holds lit, before the surge
 *    (`net.highlight` 0.92 -> 1 from trace 0.68) runs out along the lineage.
 *  - `toFix`: the surge back in to R0 over the page turn into fix (it ends nearer: it pans first).
 *  - fx-1 to fx-2 is one hold on the hole (re-skin §8: there is one hole). The pan from R0 to R1 and the
 *    push-in on R1 that ran under fx-2's line (`panToR1`, `inOnR1`, FX2_PAN) went with the core's bodies.
 *  - `toNew`: R1 out to the neighbourhood under fx-3's line, from where it is full ink, as the new
 *    work forms. fx-4 holds the same shot: the page turn into it only brings the streams up.
 *  - `toLesson`: to ls-1 over the page turn into lesson. No one step from the neighbourhood's lamp
 *    to ls-1's clears the band over it (the pan lifts the neighbourhood's cylinder into the band on
 *    both screens), so the lamp passes through the core alone on the way, from fix 0.979 (0.986 before
 *    Task 1d's re-fit of fx-3) to lesson 0.029 (0.026 before re-skin Task 1e's re-fit of fx-3 to 258
 *    and 678): the hub lights first, then the rings round it.
 */
export const LATE_MOVES = {
  toReview: { shot: 're-1', from: spreadAt(2.708), until: ['reviewer', 0.03125], lamp: ['spread', SPREAD_LAMPS.toReview] },
  toHub: { shot: 're-3', from: ['reviewer', 0.65125], until: ['reviewer', 0.8], lamp: ['reviewer', 0.652] },
  // Its lamp step was 0.012: the re-skin's stars (Task 2) stood the lineage's lit set 3.4 px into the band there;
  // the lineage lamp first clears from 0.013.
  climb: { shot: 'tr-1', from: ['reviewer', 0.96875], until: ['trace', 0.02941176], lamp: ['trace', 0.013] },
  toSource: { shot: 'tr-2', from: ['trace', 0.38941176], until: ['trace', 0.48], lamp: ['trace', 0.39] },
  // Its lamp step was 0.615: the re-skin's stars (Task 2: spike tips, dot halos) stood the lineage's lit set 4.3 px
  // into the band there under the lineage lamp, which then first cleared from 0.623. From the hole close (re-skin
  // Task 5) the lineage's stars stand behind the hole, low over it, until the camera has risen: 0.642.
  fanOut: { shot: 'tr-2 surge', from: ['trace', 0.58], until: ['trace', 0.68], lamp: ['trace', 0.642] },
  toFix: { shot: 'fx-1', from: ['trace', 0.97058824], until: ['fix', 0.02173913], lamp: ['trace', 0.971] },
  // Its lamp step at 0.467, the first thousandth from which fx-3's lit set clears as the camera leaves the hole
  // close (re-skin Task 5; 0.464 before, 0.463 before re-skin Task 1e's re-fit of fx-3, 0.458 before Task 1d's).
  toNew: { shot: 'fx-3', from: ['fix', 0.42173913], until: ['fix', 0.5], lamp: ['fix', 0.467] },
  toLesson: {
    shot: 'ls-1',
    from: ['fix', 0.97826087],
    until: ['lesson', 0.0625],
    lamp: ['lesson', 0.029],
    via: { at: ['fix', 0.979], lamp: Lamp.Core, on: { core: true } },
  },
} as const satisfies Record<string, Move>;

export const ACT_TWO_MOVES: readonly Move[] = [
  { shot: 'ly-1', from: ['layers', 0.001], until: layersAt(0.1), lamp: ['layers', 0.001] },
  // ly-2's and ly-3's steps re-fitted by the re-skin's Task 5 to the hole close (layersAt(0.81) and (1.76) before).
  { shot: 'ly-2', from: layersAt(0.7), until: layersAt(0.9), lamp: ['layers', 0.193] },
  { shot: 'ly-3', from: layersAt(1.7), until: layersAt(1.9), lamp: ['layers', 0.428] },
  { shot: 'ly-4', from: layersAt(2.7), until: layersAt(2.9), lamp: layersAt(2.7) },
  { shot: 'ly-4 ride', from: LY4_RIDE.from, until: LY4_RIDE.until, lamp: LY4_RIDE.from, motion: 'ride' },
  // The lamp steps on the push's first thousandth, as the other moves' do, so the ride's end keeps Arms.
  { shot: 'ly-4 close', from: LY4_CLOSE.from, until: LY4_CLOSE.until, lamp: ['layers', LY4_CLOSE.from[1] + 0.001], motion: 'push' },
  { shot: 'ly-5', from: layersAt(3.5), until: layersAt(3.7), lamp: layersAt(3.515), pan: 0.15 },
  { shot: 'fr-1', from: layersAt(4.2), until: ['far', 0.0625], lamp: ['far', 0.027] },
  NET_MOVES.dive,
  NET_MOVES.pushIn,
  NET_MOVES.pullOut,
  NET_MOVES.follow,
  NET_MOVES.toHood,
  ...Object.values(LATE_MOVES),
];

/**
 * Keys over each move after its start, evenly in scroll, linear between them: at least MOVE_KEYS, and
 * enough that at the pull's steepest (inOutCubic's slope, INOUT_CUBIC_STEEPEST, over MOVE_LEAD of the
 * move) the camera's distance changes by no more than MOVE_KEY_RATIO from one key to the next, on
 * either screen.
 */
export const MOVE_KEYS = 16;
/** See MOVE_KEYS. */
export const MOVE_KEY_RATIO = 1.15;
/** And no more than this many degrees of bearing from one key to the next, at the pan's steepest. */
export const MOVE_KEY_DEGREES = 8;

/**
 * inOutCubic's steepest slope (12 t² at t = ½). Task 1d: moveKeyCount took it as 1.5 and so spaced
 * keys twice as far apart as MOVE_KEY_RATIO allows; the re-fitted move into ly-4 (486 → 212 on a
 * landscape screen) strayed 1.8 % off its path between keys.
 */
const INOUT_CUBIC_STEEPEST = 3;

/** How many keys a move from pose `a` to `b` takes after its start (MOVE_KEYS). */
export function moveKeyCount(a: Pick<Pose, 'distance' | 'landscape' | 'bearing'>, b: Pick<Pose, 'distance' | 'landscape' | 'bearing'>): number {
  const pull = Math.max(Math.abs(Math.log(b.distance / a.distance)), Math.abs(Math.log(b.landscape.distance / a.landscape.distance)));
  const swing = Math.max(Math.abs(b.bearing - a.bearing), Math.abs(b.landscape.bearing - a.landscape.bearing));
  return Math.max(
    MOVE_KEYS,
    Math.ceil((INOUT_CUBIC_STEEPEST * pull) / (MOVE_LEAD * Math.log(MOVE_KEY_RATIO))),
    Math.ceil((INOUT_CUBIC_STEEPEST * swing) / (MOVE_LEAD * MOVE_KEY_DEGREES)),
  );
}

/**
 * `net.streams` through layers and far (galaxy §15.1): up under ly-1 and ly-5, down under every other
 * beat. Each fade is on a page turn, with its line's page: in as the page comes up (from a thousandth
 * after the zoom-out's end, so the zoom-out keeps them at 0 to its last frame), out as it goes (ly-5's
 * over the page turn into far, the section's last fade). Linear between them.
 */
export const LAYERS_STREAMS: readonly { at: SectionAt; value: number }[] = [
  { at: ['layers', 0.001], value: 0 },
  { at: layersAt(0.1), value: 1 },
  { at: layersAt(0.7), value: 1 },
  { at: layersAt(0.8), value: 0 },
  { at: layersAt(3.6), value: 0 },
  { at: layersAt(3.7), value: 1 },
  { at: layersAt(4.2), value: 1 },
  { at: ['layers', 1], value: 0 },
];

/**
 * `net.streams` through defect and spread (galaxy §15.1): 0 through the defect, up under up-1 from
 * the follow's start (the up-stream from C7 in to R1, lit ember by its own light), held through up-1's
 * page, and out as that page fades, so up-2 has none. Linear between.
 */
export const SPREAD_STREAMS: readonly { at: SectionAt; value: number }[] = [
  { at: NET_MOVES.follow.from, value: 0 },
  { at: NET_MOVES.follow.until, value: 1 },
  { at: NET_MOVES.toHood.from, value: 1 },
  { at: spreadAt(1.44), value: 0 },
];

/**
 * `net.streams` from the reviewer to the lesson (galaxy §15.1): 0 under the reviewer, re-3 included
 * (its feed is its own leaf, FEED_KEYS); up over the climb into trace and held through tr-1 and tr-2,
 * the climb along the lineage and the surge; out over the page turn into fix; up again over the page
 * turn into fx-4 for the sweep; out over the page turn into lesson. Linear between.
 */
export const LATE_STREAMS: readonly { at: SectionAt; value: number }[] = [
  { at: LATE_MOVES.climb.from, value: 0 },
  { at: LATE_MOVES.climb.until, value: 1 },
  { at: LATE_MOVES.toFix.from, value: 1 },
  { at: LATE_MOVES.toFix.until, value: 0 },
  { at: ['fix', 0.59826087], value: 0 },
  { at: ['fix', 0.64173913], value: 1 },
  { at: LATE_MOVES.toLesson.from, value: 1 },
  { at: LATE_MOVES.toLesson.until, value: 0 },
];

/**
 * `net.feed` (galaxy §15.1, the author's ruling in Task 11): up as re-3's line comes in (from where it
 * starts to where it is full ink; its alpha, review.ts feedAlpha, comes up with `net.review` over the
 * same stretch), held through the trace, out over the page turn into fix. 0 everywhere else. Linear.
 */
export const FEED_KEYS: readonly { at: SectionAt; value: number }[] = [
  { at: ['reviewer', 0.62], value: 0 },
  { at: LATE_MOVES.toHub.from, value: 1 },
  { at: LATE_MOVES.toFix.from, value: 1 },
  { at: LATE_MOVES.toFix.until, value: 0 },
];

/** The move that lands on fr-1, the galaxy wide's turn. */
const INTO_FAR = ACT_TWO_MOVES.find((m) => m.shot === 'fr-1')!;

/**
 * `net.haze` (docs/specs/2026-10-09-act-2-reskin.md §5), the background haze's gain: a look gate, up
 * only at the galaxy wides. Up from the zoom-out's last lamp step (the lamp off at the galaxy wide),
 * linear to the zoom-out's end; down over the move into ly-1; up over the move into fr-1; down over
 * the dive into df-1. 0 everywhere else. Linear.
 */
export const HAZE_KEYS: readonly { at: SectionAt; value: number }[] = [
  { at: ['zoom-out', ZOOM_OUT.lamp[ZOOM_OUT.lamp.length - 1].at], value: 0 },
  { at: ['zoom-out', 1], value: 1 },
  { at: ACT_TWO_MOVES[0].from, value: 1 },
  { at: ACT_TWO_MOVES[0].until, value: 0 },
  { at: INTO_FAR.from, value: 0 },
  { at: INTO_FAR.until, value: 1 },
  { at: NET_MOVES.dive.from, value: 1 },
  { at: NET_MOVES.dive.until, value: 0 },
];

/**
 * The beats whose shots name the neighbourhood's systems, held real (the controller's ruling: the dissolve
 * belongs to the wides): ly-3's "spiked stars round it", ls-1's "the stars round it", up-2 and fx-3 (and
 * fx-4, which holds fx-3's shot), lamped on the neighbourhood and aimed at it, and tr-1 and tr-2's surge
 * back out to tr-1's wide, lamped on R0's lineage ("Follow the defects back"; the surge out to its
 * stars). From where they stand the dissolve (lod.ts HOOD_LOD) has those stars half or wholly in their
 * far form (tr-1 on a phone: 0.18 of the way real). `net.hoodHold` holds their real form whole there;
 * HOOD_LOD.beatsHold is the one switch. In ACT_TWO_MOVES order.
 */
export const HOOD_HOLD_SHOTS = ['ly-3', 'up-2', 'tr-1', 'tr-2 surge', 'fx-3', 'ls-1'] as const;

/**
 * `net.hoodHold` (re-skin §5): a look gate, up only on HOOD_HOLD_SHOTS. Built in ACT_TWO_MOVES order, one
 * up-span per run of consecutive held moves: 0 → 1 over the first move of the run, held at 1 through
 * every later move of it (fx-3 then ls-1 is one run, so the hold does not dip between them), and 1 → 0
 * over the move after the run's last, one inOutCubic each as the camera's own; a run that ends the lap
 * (ls-1) holds to the end. A star's real form is the larger of its band's share and the hold, so it never
 * pops: the hold rides the camera's moves, as the haze does.
 */
export const HOOD_HOLD_KEYS: readonly { at: SectionAt; value: number; ease?: 'inOutCubic' }[] = (() => {
  const keys: { at: SectionAt; value: number; ease?: 'inOutCubic' }[] = [];
  const isHeld = (m: Move | undefined): boolean => m !== undefined && (HOOD_HOLD_SHOTS as readonly string[]).includes(m.shot);
  ACT_TWO_MOVES.forEach((m, i) => {
    const [held, before] = [isHeld(m), isHeld(ACT_TWO_MOVES[i - 1])];
    if (held && !before) keys.push({ at: m.from, value: 0 }, { at: m.until, value: 1, ease: 'inOutCubic' });
    else if (!held && before) keys.push({ at: m.from, value: 1 }, { at: m.until, value: 0, ease: 'inOutCubic' });
  });
  return keys;
})();

/**
 * `net.focus` (galaxy §14.5: the lamp's focus dims all but its subject to LAMP_FLOOR), up only on the
 * close shots: 0 → 1 over the push-in (freeze-frame §1.1) and 1 → 0 over the pull-out before its lamp
 * opens on the twelve. (The second fix's own, on C5, went with it: the author deleted it.) Under any
 * other level the focus would dim the rest of a wide lit set, so it is 0 wherever the lamp is not 1.
 * Each ramp is one inOutCubic, as the camera's move is, so the focus does not start to fall (or rise)
 * at the move's first instant, while the camera has barely moved (Task 10 review).
 */
export const FOCUS_KEYS: readonly { at: SectionAt; value: number; ease?: 'inOutCubic' }[] = [
  { at: NET_MOVES.pushIn.from, value: 0 },
  { at: NET_MOVES.pushIn.until, value: 1, ease: 'inOutCubic' },
  { at: NET_MOVES.pullOut.from, value: 1 },
  { at: NET_MOVES.pullOut.lamp, value: 0, ease: 'inOutCubic' },
];

/**
 * The freeze frame's leaves on the defect's close-up (docs/specs/2026-10-07-freeze-frame.md §1.1, §3.2),
 * defect-local: the cut (`freeze.hold`, a step up at 0.2605 once df-2 is legible, down at 0.405, the
 * release), the dressing (`freeze.dress` in over 0.262-0.292 and out over 0.405-0.421, inOutCubic), the
 * one-frame flash on the cut (`freeze.flash` 1 at 0.260 to 0 at 0.264, off the step a hair before it),
 * and the roll (`camera.roll`, FREEZE_ROLL degrees, in and out with the dressing). 0 everywhere else.
 */
export const FREEZE_KEYS: Readonly<Record<'freeze.hold' | 'freeze.dress' | 'freeze.flash' | 'camera.roll', readonly { at: SectionAt; value: number; ease?: 'step' | 'inOutCubic' }[]>> = {
  'freeze.hold': [
    { at: ['defect', 0.26], value: 0 },
    { at: ['defect', 0.2605], value: 1, ease: 'step' },
    { at: ['defect', 0.4045], value: 1 },
    { at: ['defect', 0.405], value: 0, ease: 'step' },
  ],
  'freeze.dress': [
    { at: ['defect', 0.262], value: 0 },
    { at: ['defect', 0.292], value: 1, ease: 'inOutCubic' },
    { at: ['defect', 0.405], value: 1 },
    { at: ['defect', 0.421], value: 0, ease: 'inOutCubic' },
  ],
  'freeze.flash': [
    { at: ['defect', 0.2595], value: 0 },
    { at: ['defect', 0.26], value: 1, ease: 'step' },
    { at: ['defect', 0.264], value: 0 },
  ],
  'camera.roll': [
    { at: ['defect', 0.262], value: 0 },
    { at: ['defect', 0.292], value: FREEZE_ROLL, ease: 'inOutCubic' },
    { at: ['defect', 0.405], value: FREEZE_ROLL },
    { at: ['defect', 0.421], value: 0, ease: 'inOutCubic' },
  ],
};

/** The lengths (screens) of the sections the moves cross, in story order (netShots.test.ts holds them to the story). */
export const MOVE_SECTIONS: readonly (readonly [string, number])[] = [
  ['layers', LAYERS_LENGTH],
  ['far', 1.6],
  ['defect', 4.8],
  ['spread', SPREAD_LENGTH],
  ['reviewer', 3.2],
  ['trace', 3.4],
  ['fix', 4.6],
  ['lesson', 1.6],
];

/** Screens from the start of the first of MOVE_SECTIONS to a place in one of them. */
export function screensOf([section, local]: SectionAt): number {
  let before = 0;
  for (const [id, length] of MOVE_SECTIONS) {
    if (id === section) return before + local * length;
    before += length;
  }
  throw new Error(`no move section ${section}`);
}

/** The place `s` screens from the start of the first of MOVE_SECTIONS. */
export function placeOf(s: number): SectionAt {
  let before = 0;
  for (const [id, length] of MOVE_SECTIONS) {
    if (s < before + length - 1e-6) return [id, Math.round(((s - before) / length) * 1e8) / 1e8];
    before += length;
  }
  return [MOVE_SECTIONS[MOVE_SECTIONS.length - 1][0], 1];
}

/** A shot resolved to numbers: what the camera keys interpolate between, where it looks, and the lamp it lights. */
export interface Pose {
  track: number;
  bearing: number;
  elevation: number;
  distance: number;
  fov: number;
  frame: number;
  landscape: { bearing: number; distance: number; frame: number };
  lamp: Lamp;
  lampAt: number;
}

/** The camera's part of a pose. */
export type CameraPose = Omit<Pose, 'track' | 'lamp' | 'lampAt'>;

/** A shot as a pose: §14.5's distance resolved; its landscape variant, or, without one, itself. */
export function poseOf(shot: GalaxyShot, g: Galaxy): Pose {
  const distance = portraitDistance(shot, g);
  return {
    track: trackIndex(shot.target),
    bearing: shot.bearing,
    elevation: shot.elevation,
    distance,
    fov: shot.fov,
    frame: shot.frame,
    landscape: {
      bearing: shot.landscape?.bearing ?? shot.bearing,
      distance: shot.landscape?.distance ?? distance,
      frame: shot.landscape?.frame ?? shot.frame,
    },
    lamp: shot.lamp,
    lampAt: galaxyShotLampAt(shot),
  };
}

/** Where the zoom-out ends, as a pose: the galaxy wide on the core, ZOOM_OUT.landscape.scale as far off on a landscape screen, lamp off. */
export function zoomOutEnd(): Pose {
  const z = zoomOutShot(1);
  return {
    track: trackIndex(z.b),
    bearing: z.bearing,
    elevation: z.elevation,
    distance: z.distance,
    fov: z.fov,
    frame: z.frame,
    landscape: { bearing: z.bearing, distance: z.distance * z.landscape, frame: z.frame },
    lamp: z.lamp,
    lampAt: trackIndex({ body: 'N0' }),
  };
}

/** The pose a move lands on, by its shot's name: fr-1 at its turn's start. */
export function movePose(shot: MoveShot, g: Galaxy): Pose {
  if (shot === 'fr-1') return poseOf(FAR_SHOT, g);
  if (shot === 'ly-4 ride') {
    const start = poseOf(LAYERS_SHOTS['ly-4'], g);
    return { ...poseOf(LY4_RIDE.to, g), lamp: start.lamp, lampAt: start.lampAt };
  }
  if (shot === 'ly-4 close') return poseOf(LY4_CLOSE.shot, g);
  if (shot === 'tr-2 surge') return poseOf(LATE_SHOTS['tr-1'], g);
  if (shot in DEFECT_SHOTS) return poseOf(DEFECT_SHOTS[shot as keyof typeof DEFECT_SHOTS], g);
  if (shot in LATE_SHOTS) return poseOf(LATE_SHOTS[shot as keyof typeof LATE_SHOTS], g);
  return poseOf(LAYERS_SHOTS[shot as keyof typeof LAYERS_SHOTS], g);
}

/** fr-1 at `u` (0..1) of its turn: FAR_SHOT, its bearing turned by inOutCubic(u) of FAR_ORBIT.bearing. */
export function farOrbitPose(u: number, g: Galaxy): Pose {
  const p = poseOf(FAR_SHOT, g);
  const bearing = p.bearing + FAR_ORBIT.bearing * inOut(Math.min(1, Math.max(0, u)));
  return { ...p, bearing, landscape: { ...p.landscape, bearing } };
}

/**
 * How a move shares its scroll between standing off and turning to its new target (the "timing within
 * the page turn"): the camera stands back before it pans. A move that ends further off pulls back over
 * the first MOVE_LEAD of the move and pans (the tracked point and the bearing) over the last; one that
 * ends nearer pans first and closes in after. Each part is its own inOutCubic. Panning at the larger
 * distance keeps the lit set small on screen while it crosses the frame: a move that does both at once
 * carries the old lit set up into the text band before the new one is clear of it.
 */
export const MOVE_LEAD = 0.6;

/** A pose as a move reads it: the camera's part and the tracked target. */
export type MovePose = CameraPose & Pick<Pose, 'track'>;

/**
 * How far through a move's pull (`zoom`: distance, elevation, field and frame) and its pan (`pan`: the
 * tracked point and the bearing) the camera is at `x` (0..1) of the scroll of `move`, from `a` to `b`.
 * A move marked one motion (Move `motion`) runs both together.
 */
export function moveShares(move: Pick<Move, 'motion' | 'pan'>, a: MovePose, b: MovePose, x: number): { zoom: number; pan: number } {
  if (move.motion) {
    const u = inOut(Math.min(1, Math.max(0, x)));
    return { zoom: u, pan: u };
  }
  const early = inOut(Math.min(1, Math.max(0, x / (b.distance > a.distance ? MOVE_LEAD : (move.pan ?? MOVE_LEAD)))));
  const late = inOut(Math.min(1, Math.max(0, (x - (1 - MOVE_LEAD)) / MOVE_LEAD)));
  return b.distance > a.distance ? { zoom: early, pan: late } : { zoom: late, pan: early };
}

/** The part of a move's scroll (0..1) its pan runs over (moveShares). */
export function panSpan(move: Pick<Move, 'motion' | 'pan'>, a: MovePose, b: MovePose): [number, number] {
  if (move.motion) return [0, 1];
  return b.distance > a.distance ? [1 - MOVE_LEAD, 1] : [0, move.pan ?? MOVE_LEAD];
}

/** The way from pose `a` to `b`, `zoom` of the pull and `pan` of the pan (each 0..1, already eased): angles, field and frame linear, distances log-linear. */
function between(a: CameraPose, b: CameraPose, { zoom, pan }: { zoom: number; pan: number }): CameraPose {
  const lin = (x: number, y: number, u: number) => x + (y - x) * u;
  const log = (x: number, y: number) => x * (y / x) ** zoom;
  return {
    bearing: lin(a.bearing, b.bearing, pan),
    elevation: lin(a.elevation, b.elevation, zoom),
    distance: log(a.distance, b.distance),
    fov: lin(a.fov, b.fov, zoom),
    frame: lin(a.frame, b.frame, zoom),
    landscape: {
      bearing: lin(a.landscape.bearing, b.landscape.bearing, pan),
      distance: log(a.landscape.distance, b.landscape.distance),
      frame: lin(a.landscape.frame, b.landscape.frame, zoom),
    },
  };
}

/** A pose's camera keys about its tracked point, landscape variant on (the track leaves are keyed apart, actTwoKeys). */
export function poseCamera(p: CameraPose, anchors: MechanismAnchors = mechanismAnchors(mechanisms.bike)): Omit<SceneState['camera'], 'track'> {
  const rel = relKeys(anchors);
  const at = (bearing: number, d: number) => rel(lookFromBearing(bearing, p.elevation).map((v) => v * d));
  return {
    pos: at(p.bearing, p.distance),
    target: rel([0, 0, 0]),
    fov: p.fov,
    focus: 0,
    coreFocus: 0,
    frame: p.frame,
    landscape: { pos: at(p.landscape.bearing, p.landscape.distance), frame: p.landscape.frame, mix: 1 },
    roll: 0,
  };
}

/** Whether the move at `i` of ACT_TWO_MOVES is the one that leaves fr-1 (after its turn). */
const leavesFar = (i: number): boolean => i > 0 && ACT_TWO_MOVES[i - 1].shot === 'fr-1';

/** Each of ACT_TWO_MOVES with the pose it leaves (the zoom-out's end, a shot, or fr-1 at the end of its turn) and the pose it lands on. */
export function actTwoMoves(g: Galaxy): { move: Move; from: Pose; to: Pose }[] {
  let from = zoomOutEnd();
  return ACT_TWO_MOVES.map((move, i) => {
    if (leavesFar(i)) from = farOrbitPose(1, g);
    const step = { move, from, to: movePose(move.shot, g) };
    from = step.to;
    return step;
  });
}

/** What the camera and the lamp stand for at a place after the zoom-out: its pose, the tracked targets and their mix, and the lamp. */
export interface ActTwoFrame {
  pose: CameraPose;
  a: number;
  b: number;
  /** How far from `a` to `b` the tracked point is (0..1). */
  u: number;
  lamp: Lamp;
  lampAt: number;
}

/**
 * The camera and lamp from layers to the end of the moves at a place, as ACT_TWO_MOVES, FAR_ORBIT and
 * the shots say: a hold is its shot; a move runs from the pose before to the next as moveShares times
 * it, the tracked point with its pan; fr-1's turn between its two moves. The lamp takes each move's level at its
 * `lamp`. The keys sample this (actTwoKeys), and the tests hold the keyed frames to it.
 */
export function actTwoFrame(at: SectionAt, g: Galaxy): ActTwoFrame {
  const s = screensOf(at);
  const moves = actTwoMoves(g);
  let lamp = { lamp: moves[0].from.lamp, lampAt: moves[0].from.lampAt };
  const hold = (p: Pose): ActTwoFrame => ({ pose: p, a: p.track, b: p.track, u: 0, ...lamp });
  for (const [i, { move, from, to }] of moves.entries()) {
    const [a, b] = [screensOf(move.from), screensOf(move.until)];
    if (leavesFar(i)) {
      const [ta, tb] = [screensOf(FAR_ORBIT.from), screensOf(FAR_ORBIT.until)];
      if (s < a) return hold(farOrbitPose((s - ta) / (tb - ta), g));
    }
    if (s < a) return hold(from);
    if (move.via && s >= screensOf(move.via.at)) lamp = { lamp: move.via.lamp, lampAt: trackIndex(move.via.on) };
    if (s >= screensOf(move.lamp)) lamp = { lamp: to.lamp, lampAt: to.lampAt };
    if (s < b) {
      const shares = moveShares(move, from, to, (s - a) / (b - a));
      return { pose: between(from, to, shares), a: from.track, b: to.track, u: shares.pan, ...lamp };
    }
  }
  return hold(moves[moves.length - 1].to);
}

/** The places of the camera keys after the zoom-out: each move's start (the hold before it ends there), moveKeyCount places through it, and FAR_ORBIT.keys through fr-1's turn. */
export function actTwoKeyPlaces(g: Galaxy): SectionAt[] {
  const out: SectionAt[] = [];
  for (const [i, { move, from, to }] of actTwoMoves(g).entries()) {
    const n = moveKeyCount(from, to);
    if (leavesFar(i)) {
      const [ta, tb] = [screensOf(FAR_ORBIT.from), screensOf(FAR_ORBIT.until)];
      for (let i = 1; i <= FAR_ORBIT.keys; i++) out.push(i === FAR_ORBIT.keys ? FAR_ORBIT.until : placeOf(ta + ((tb - ta) * i) / FAR_ORBIT.keys));
    }
    // A move's start is the hold before it, unless it starts where the move before it ended (ly-4's ride).
    const last = out[out.length - 1];
    if (!last || last[0] !== move.from[0] || Math.abs(last[1] - move.from[1]) > 1e-9) out.push(move.from);
    const [a, b] = [screensOf(move.from), screensOf(move.until)];
    // A quick pan (Move `pan`) gets its own n keys over its share, then n over the rest.
    const cuts = move.pan && to.distance <= from.distance ? [0, move.pan, 1] : [0, 1];
    for (let c = 1; c < cuts.length; c++) {
      const [u0, u1] = [cuts[c - 1], cuts[c]];
      for (let i = 1; i <= n; i++) out.push(i === n && c === cuts.length - 1 ? move.until : placeOf(a + (b - a) * (u0 + ((u1 - u0) * i) / n)));
    }
  }
  return out;
}

/** An Act II frame after the zoom-out as keys, the essay's camera keys and lamp (like zoomOutKeys); growth and show are the keyframes' own. */
export function actTwoFrameKeys(at: SectionAt, g: Galaxy, anchors: MechanismAnchors = mechanismAnchors(mechanisms.bike)): KeyedFrame {
  const f = actTwoFrame(at, g);
  return { camera: { ...poseCamera(f.pose, anchors), track: { a: f.a, b: f.b, mix: f.u, turn: 1 } }, lamp: f.lamp, lampAt: f.lampAt };
}

const round = (v: number): number => Math.round(v * 1e3) / 1e3;

/** `<section>@<local>` as the keyframes write it (local to 1e-8). */
const at = (section: string, local: number): string => `${section}@${Math.round(local * 1e8) / 1e8}`;

/**
 * The keys Act II's camera, ride, lamp, focus and streams take from the zoom-out to the end of the
 * act, as keyframes.json carries them (camera keys rounded to 1e-3, as every camera key is): the
 * zoom-out's, then layers to the lesson (ACT_TWO_MOVES, FAR_ORBIT, LAYERS_STREAMS, SPREAD_STREAMS,
 * LATE_STREAMS, FEED_KEYS, HAZE_KEYS, HOOD_HOLD_KEYS, FOCUS_KEYS) out to ls-1, which lesson holds to the end. Every shot after the zoom-out
 * rides the galaxy's turn (`camera.track.turn` 1: the close shots too, DEFECT_SHOTS). A step leaf (`camera.track.a` and `.b`, `net.lamp`, `net.lampAt`,
 * `camera.landscape.mix`) changes only where it does not show: `a` while `mix` is 1, `b` while it is 0
 * (each move turns the mix round, so the target it leaves for is the hidden one, stepped before it),
 * the landscape variant where it is the keys themselves; the lamp's level and focus step together, at
 * a move's `lamp`; and each step a thousandth of the section after a boundary, so no leaf jumps at
 * one. And the zoom-out's own clock keys, `net.growth` and `net.show` (ZOOM_OUT_CLOCK_TRACKS: only
 * their zoom-out keys; every later section's are hand keys). Generated here, pasted into
 * keyframes.json, and held to it by netShots.test.ts.
 */
export function actTwoKeys(g: Galaxy, anchors: MechanismAnchors = mechanismAnchors(mechanisms.bike)): Record<string, Keyframe[]> {
  const out: Record<string, Keyframe[]> = {
    'camera.pos': [],
    'camera.target': [],
    'camera.fov': [],
    'camera.frame': [],
    'camera.landscape.pos': [],
    'camera.landscape.frame': [],
  };
  const camera = (where: string, c: SceneState['camera']) => {
    out['camera.pos'].push({ at: where, value: c.pos.map(round) as Vec3 });
    out['camera.target'].push({ at: where, value: c.target.map(round) as Vec3 });
    out['camera.fov'].push({ at: where, value: round(c.fov) });
    out['camera.frame'].push({ at: where, value: round(c.frame) });
    out['camera.landscape.pos'].push({ at: where, value: c.landscape.pos.map(round) as Vec3 });
    out['camera.landscape.frame'].push({ at: where, value: round(c.landscape.frame) });
  };
  for (const l of ZOOM_OUT_KEY_LOCALS) camera(at('zoom-out', l), zoomOutKeys(l, anchors).camera);
  for (const place of actTwoKeyPlaces(g)) camera(at(...place), actTwoFrameKeys(place, g, anchors).camera);
  const N0 = trackIndex({ body: 'N0' });
  const [walk1, walk2, walk3] = ZOOM_OUT.walk;
  const step = (where: string, value: number): Keyframe => ({ at: where, value, ease: 'step' });
  const key = (where: string, value: number, ease?: 'inOutCubic'): Keyframe => ({ at: where, value, ...(ease ? { ease } : {}) });
  const z = (l: number) => at('zoom-out', l);
  // The walk keyed as two targets and a mix: the second walk turns round (a the neighbourhood, b P_a,
  // mix falling), so each step leaf changes where it does not show.
  out['camera.track.a'] = [key(z(0), 0), step(z(0.001), N0), step(z((walk1.to + walk2.from) / 2), trackIndex(walk2.b))];
  out['camera.track.b'] = [
    key(z(0), 0),
    step(z(0.001), N0),
    step(z(walk1.from - 0.005), trackIndex(walk1.b)),
    step(z((walk2.to + walk3.from) / 2), trackIndex(walk3.b)),
  ];
  out['camera.track.mix'] = [
    key(z(walk1.from), 0),
    key(z(walk1.to), 1, 'inOutCubic'),
    key(z(walk2.from), 1),
    key(z(walk2.to), 0, 'inOutCubic'),
    key(z(walk3.from), 0),
    key(z(walk3.to), 1, 'inOutCubic'),
  ];
  out['camera.track.turn'] = [key(z(0), 0), key(z(ZOOM_OUT.arrive), 1, 'inOutCubic')];
  out['camera.landscape.mix'] = [key(z(0), 0), step(z(0.001), 1)];
  out['net.lamp'] = [key(z(0), Lamp.Off), ...ZOOM_OUT.lamp.map((s) => step(z(Math.max(0.001, s.at)), s.lamp))];
  out['net.lampAt'] = [key(z(0), 0), step(z(0.001), N0)];
  // The moves after the zoom-out: each turns the mix round, the hidden target stepping first (the
  // first where it starts, the zoom-out's end held a thousandth; the others a thousandth into the hold
  // before them); the lamp takes the new level and focus at the move's `lamp`.
  let shows: 'a' | 'b' = 'b';
  const slots = { a: trackIndex(walk2.b), b: trackIndex(walk3.b) };
  let lampAt = N0;
  let lamp: Lamp = ZOOM_OUT.lamp[ZOOM_OUT.lamp.length - 1].lamp;
  const moves = actTwoMoves(g);
  moves.forEach(({ move, from, to }, i) => {
    const hidden = shows === 'a' ? 'b' : 'a';
    const rest = shows === 'a' ? 0 : 1;
    // The hidden target steps a thousandth after the move before this one has finished its pan (its
    // mix is at rest from there; ly-4's ride follows its move with no hold between).
    const before = moves[i - 1];
    const prevPanEnd: SectionAt | undefined = before
      ? placeOf(screensOf(before.move.from) + (screensOf(before.move.until) - screensOf(before.move.from)) * panSpan(before.move, before.from, before.to)[1])
      : undefined;
    // The mix runs over the move's pan (moveShares), one inOutCubic.
    const [a, b] = [screensOf(move.from), screensOf(move.until)];
    const [p0, p1] = panSpan(move, from, to).map((x) => placeOf(a + (b - a) * x));
    // A move whose pan starts where the one before ends (ly-4's push-in, off the ride's end) steps its
    // hidden target there, where that target weighs nothing, and shares the mix key already standing.
    const flush = prevPanEnd !== undefined && screensOf(prevPanEnd) >= screensOf(p0);
    const stepAt: SectionAt = prevPanEnd === undefined ? move.from : flush ? p0 : [prevPanEnd[0], prevPanEnd[1] + 0.001];
    if (slots[hidden] !== to.track) {
      out[`camera.track.${hidden}`].push(step(at(...stepAt), to.track));
      slots[hidden] = to.track;
    }
    out['camera.track.mix'].push(...(flush ? [] : [key(at(...p0), rest)]), key(at(...p1), 1 - rest, 'inOutCubic'));
    shows = hidden;
    const lampSteps = [...(move.via ? [{ at: move.via.at, lamp: move.via.lamp, lampAt: trackIndex(move.via.on) }] : []), { at: move.lamp, lamp: to.lamp, lampAt: to.lampAt }];
    for (const k of lampSteps) {
      if (k.lamp !== lamp) out['net.lamp'].push(step(at(...k.at), k.lamp));
      lamp = k.lamp;
      if (k.lampAt !== lampAt) out['net.lampAt'].push(step(at(...k.at), k.lampAt));
      lampAt = k.lampAt;
    }
  });
  out['net.streams'] = [key(z(0), 0), ...[...LAYERS_STREAMS, ...SPREAD_STREAMS, ...LATE_STREAMS].map((k) => key(at(...k.at), k.value))];
  out['net.feed'] = [key(z(0), 0), ...FEED_KEYS.map((k) => key(at(...k.at), k.value))];
  out['net.haze'] = [key(z(0), 0), ...HAZE_KEYS.map((k) => key(at(...k.at), k.value))];
  out['net.hoodHold'] = [key(z(0), 0), ...HOOD_HOLD_KEYS.map((k) => key(at(...k.at), k.value, k.ease))];
  out['net.focus'] = FOCUS_KEYS.map((k) => key(at(...k.at), k.value, k.ease));
  // The freeze frame's leaves on the defect's close-up.
  for (const [path, keys] of Object.entries(FREEZE_KEYS)) out[path] = keys.map((k) => (k.ease === 'step' ? step(at(...k.at), k.value) : key(at(...k.at), k.value, k.ease)));
  // The zoom-out's clocks, from ZOOM_OUT: the one source zoomOutShot also reads.
  const clock = (keys: ClockKeys) => keys.map((c) => key(z(c.at), c.value, c.ease));
  out['net.growth'] = clock(ZOOM_OUT.growth);
  out['net.show'] = clock(ZOOM_OUT.show);
  return out;
}

/** The tracks actTwoKeys gives only the zoom-out's keys of: the clocks every later section keys by hand. */
export const ZOOM_OUT_CLOCK_TRACKS: readonly string[] = ['net.growth', 'net.show'];

/** Where a keyframe's `at` falls in global progress. */
export function keyProgress(k: Keyframe, spans: readonly SectionSpan[]): number {
  return typeof k.at === 'number' ? k.at : progressOfSectionAt(k.at, spans);
}
