// What Act II's camera and lamp are about (docs/specs/2026-10-07-galaxy-orbits.md §14.5; the plan's
// ruling 9): the targets a shot can track, as one numbered list so a scroll leaf can name one
// (`net.lampAt`, a step), and the lamp's levels. The lamp lights a set by membership, never by
// distance: a mote is lit iff its membership row at the lamp's level equals the focus body's
// (bodyMote.ts lampGain), and `lampFocusRow` says which body that is for a target. The tracking
// camera reads the same targets: `trackPoint` resolves `camera.track` to the world point Act II's
// camera keys are relative to, at the frame's ambient (galaxy §8: the camera tracks a moving target).
import type { PerspectiveCamera } from 'three';
import { bodyIndex, type Galaxy } from '../galaxy/generate';
import type { MechanismAnchors } from '../mechanisms/anchors';
import { applyCamera } from '../scene/cameraRig';
import type { Vec3 } from '../math/vec';
import type { BodyData } from '../scene/node/bodyData';
import { bodyWorld, galacticToWorld, GALAXY_TURN_PERIOD } from '../scene/node/orbit';
import type { SceneState } from './sceneState';

/**
 * The lamp's levels (galaxy §14.5, ruling 9): off (everything lit); a planet's system (the planet and
 * its moons); a star's system; the neighbourhood and the core (everything the galaxy draws as a body);
 * the core only; a rule's lineage (every body whose rule it is, and the core); and the arms (every
 * star's system, the core dark: the zoom-out's middle, its pieces coming up along the arm before the
 * hub has come under the text; Task 8 fix round 1, ruling C).
 */
export enum Lamp {
  Off = 0,
  Planet = 1,
  Star = 2,
  Hood = 3,
  Core = 4,
  Lineage = 5,
  Arms = 6,
}

/** What a shot looks at: a body (by id or alias), the middle of some bodies, the core, the neighbourhood's middle, or the whole galaxy. */
export type TrackTarget = { body: string } | { centroid: readonly string[] } | { core: true } | { hood: true } | { galaxy: true };

/**
 * Every target Act II tracks, in a fixed order: `net.lampAt` and the tracking camera's leaves key an
 * index into this list. Index 0 is null: untracked (Act I). New targets go at the end, so the indices
 * already keyed keep their meaning.
 */
export const TRACK_TARGETS: readonly (TrackTarget | null)[] = [
  null,
  { galaxy: true },
  { core: true },
  { hood: true },
  { body: 'N0' },
  { body: 'P_a' },
  { body: 'C1' },
  { body: 'P1' },
  { centroid: ['P1', 'P2', 'P3'] },
  { body: 'C7' },
  { body: 'R1' },
  { body: 'C5' }, // the deleted second fix's: unused, kept so the indices after it keep their meaning
  { body: 'P5' },
  { body: 'R0' },
  { body: 'B2' },
  { body: 'star-4' },
  { centroid: ['P5', 'R0'] },
];

const key = (t: TrackTarget): string => JSON.stringify(t);
const INDEX = new Map(TRACK_TARGETS.flatMap((t, i) => (t === null ? [] : [[key(t), i] as const])));

/** A target's index in TRACK_TARGETS; throws for a target the list does not hold. */
export function trackIndex(t: TrackTarget): number {
  const i = INDEX.get(key(t));
  if (i === undefined) throw new Error(`no track target ${key(t)}`);
  return i;
}

/**
 * The body whose membership the lamp tests for target `index` (bodyMote.ts lampGain): a body
 * target's own row, a centroid's first body's (the twelve's P1: its rule is the lineage's), and −1
 * for the core, the neighbourhood, the galaxy and no target, whose levels test no body.
 */
export function lampFocusRow(index: number, g: Galaxy): number {
  const t = TRACK_TARGETS[Math.round(index)] ?? null;
  if (t === null) return -1;
  if ('body' in t) return bodyIndex(g, t.body);
  if ('centroid' in t) return bodyIndex(g, t.centroid[0]);
  return -1;
}

/**
 * Where `target` is in the world at ambient `t`: a body's place (bodyWorld; any body, by id or alias),
 * the middle of a centroid's bodies, the galactic centre for the core and the galaxy, and the
 * neighbourhood's middle.
 */
export function targetWorld(target: TrackTarget, g: Galaxy, data: BodyData, t: number): Vec3 {
  if ('core' in target || 'galaxy' in target) return galacticToWorld(data, [0, 0, 0], t);
  if ('hood' in target) return galacticToWorld(data, g.hoodCentroid, t);
  if ('body' in target) return bodyWorld(data, bodyIndex(g, target.body), t);
  const ps = target.centroid.map((id) => bodyWorld(data, bodyIndex(g, id), t));
  return [0, 1, 2].map((k) => ps.reduce((sum, p) => sum + p[k], 0) / ps.length) as Vec3;
}

/**
 * Where target `index` is in the world at ambient `t` (targetWorld), and the world's origin for no
 * target (index 0, Act I). A step leaf mid-way reads as its nearest index.
 */
export function trackTargetWorld(index: number, g: Galaxy, data: BodyData, t: number): Vec3 {
  const target = TRACK_TARGETS[Math.round(index)] ?? null;
  return target === null ? [0, 0, 0] : targetWorld(target, g, data, t);
}

/**
 * The tracking camera's origin at ambient `t` (cameraRig.ts CameraOptions.origin): `track.mix` of
 * the way from target `a` to target `b` (mix clamped to 0..1), each resolved by trackTargetWorld.
 */
export function trackPoint(track: SceneState['camera']['track'], g: Galaxy, data: BodyData, ambient: number): Vec3 {
  const m = Math.min(1, Math.max(0, Number.isNaN(track.mix) ? 0 : track.mix));
  if (m <= 0) return trackTargetWorld(track.a, g, data, ambient);
  if (m >= 1) return trackTargetWorld(track.b, g, data, ambient);
  const a = trackTargetWorld(track.a, g, data, ambient);
  const b = trackTargetWorld(track.b, g, data, ambient);
  return [0, 1, 2].map((k) => a[k] + (b[k] - a[k]) * m) as Vec3;
}

/**
 * How far the tracking camera turns about its tracked point at ambient `t` (cameraRig.ts
 * CameraOptions.turn), radians about +y: `track.turn` (clamped to 0..1) of the galaxy's own turn,
 * unwrapped (2π t / GALAXY_TURN_PERIOD, never reduced to one turn). At 1 it is the galaxy's turn
 * (galaxyTurn, which turns the bodies and the background) up to whole turns, so the galaxy holds still
 * on screen; at 0 nothing turns. Unwrapped, a share between is continuous in the ambient (Task 8 fix
 * round 2, review M2: reduced to a turn, a camera easing onto the ride snapped by k·2π at every half
 * turn); its one cut is the ambient's own hourly wrap, where at 1 it is whole turns (3600 s is three
 * periods).
 */
export function trackTurn(track: SceneState['camera']['track'], ambient: number): number {
  const k = Math.min(1, Math.max(0, Number.isNaN(track.turn) ? 0 : track.turn));
  if (k === 0) return 0;
  return k * ((2 * Math.PI * ambient) / GALAXY_TURN_PERIOD);
}

/**
 * Pose the essay's camera for a frame (main.ts, and every test that stands in for it): the keys of
 * `state` through the anchors, composed round the text, and, once the galaxy is built, moved to the
 * tracked point at `ambient` (trackPoint) and swung with the galaxy's turn as far as the keys ride it
 * (trackTurn). With no galaxy (or Act I's untracked keys) it is the camera as it always was.
 */
export function composeEssayCamera(
  camera: PerspectiveCamera,
  state: SceneState,
  anchors: MechanismAnchors,
  galaxy: { g: Galaxy; data: BodyData } | null,
  ambient: number,
): void {
  const origin = galaxy === null ? undefined : trackPoint(state.camera.track, galaxy.g, galaxy.data, ambient);
  const turn = galaxy === null ? undefined : trackTurn(state.camera.track, ambient);
  applyCamera(camera, state, anchors, { compose: true, origin, turn });
}
