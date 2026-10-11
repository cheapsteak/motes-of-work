// The ambient clock's fixed poses (docs/specs/2026-10-07-freeze-frame.md §1.2; morph-and-scatter §3.3,
// §3.4; galaxy-orbits §8): the instant the freeze frame holds (`FREEZE_PINS`), which is also the pose
// tests and reduced motion stop the galaxy at (`AMBIENT_POSE`), and the poses the clearance tests
// sample across the galaxy's turn (`AMBIENT_GRID`). The pin is searched once, at module load, from
// the essay's galaxy: the derps are hashed, so no constant can be written down that is known to show
// a moon mid-burst beside a planet mid-scatter; the search finds the first that does, and falls back
// to forcing what it cannot find, naming the path it took.
import { PerspectiveCamera, Vector3 } from 'three';
import { MOTE_BUDGET_DESKTOP, MOTE_SEED } from '../config';
import type { MechanismAnchors } from '../mechanisms/anchors';
import type { Vec3 } from '../math/vec';
import { applyCamera, CAMERA_NEAR, GALAXY_FAR } from '../scene/cameraRig';
import { FREEZE_MOON_S, FREEZE_PIN_OFFSET_S, FREEZE_PIN_SEARCH_S, NODE_DERP_DUR, NODE_DERP_PERIOD } from '../scene/node/birth';
import { packBodyData, type BodyData } from '../scene/node/bodyData';
import { derp, derpEvent, DerpKind, type Derp } from '../scene/node/derp';
import { bodyWorld } from '../scene/node/orbit';
import { lookFromBearing } from '../timeline/cameraSpline';
import { defaultSceneState, mergeState } from '../timeline/sceneState';
import { galaxyBudget, generateGalaxy, type Body, type Galaxy } from './generate';

/** The clearance poses across the galaxy's 1,200 s turn (galaxy §8), after the pin. */
export const AMBIENT_GRID_TIMES = [0, 149, 311, 487, 659, 853, 1061] as const;

/** The close shot on a code hero (bearing, elevation in degrees, distance, fov, frame; the camera rides the planet). */
export const HERO_CLOSE = { C1: { bearing: -35, elevation: 32, distance: 3.4, fov: 36, frame: 1 } } as const;

/**
 * How the pin was found: every clause met (`full`); C1's scatter not in frame, so the renderer forces
 * one at FREEZE_SCATTER_S (`forced-scatter`); no ghost either (`forced-ghost`); or nothing, every
 * part forced (`forced`).
 */
export type PinPath = 'full' | 'forced-scatter' | 'forced-ghost' | 'forced';

/** A freeze pin: the ambient instant held, how it was found, and the moon caught mid-burst. */
export interface Pin {
  t: number;
  path: PinPath;
  moon: string;
}

/** The screen the pin must frame (phone first), and where on it: the central 60 % of the width, under 0.42 of the height. */
export const PIN_SCREEN = { width: 390, height: 844 } as const;
const PIN_CENTRAL = 0.6;
const PIN_BELOW = 0.42;
/** The moon's home faces the camera: cos of its angle from the camera's direction, about the planet. */
const PIN_FACING = 0.35;
/** C1's shell at this many seconds into a scatter: the sweep done, the first not yet home. */
const PIN_SCATTER_SEC = [0.1, 0.2] as const;
/** The moon's jump takes it at least this share of its track's radius off its ellipse (freeze-frame §3.3). */
const PIN_JUMP = 0.2;

/** Anchors under which the rig's keys are world coordinates. */
const WORLD: MechanismAnchors = {
  whole: { center: [0, 0, 0], radius: 1 },
  core: { center: [0, 0, 0], radius: 1 },
  body: { center: [0, 0, 0], radius: 1 },
};

/** A body's derp at ambient t, from its own seed, phase and sizes, unfixed. */
function derpOf(b: Body, t: number): Derp {
  return derp(b.derpSeed, b.derpPhase, t, b.kind, b.orbit?.a ?? 0, b.R, b.orbit ? (2 * Math.PI) / b.orbit.period : 0, 1);
}

/**
 * Where a moon is drawn at ambient `t` with its derp on, near enough for the pin's framing clause: its
 * place about its planet on its own (possibly quantised) clock, turned along by `dNu` and pushed off
 * the track by `dR` in the galaxy's plane, lifted by `lift`, and offset by the wobble and jitter.
 */
export function pinnedMoon(g: Galaxy, data: BodyData, row: number, t: number): Vec3 {
  const b = g.bodies[row];
  const d = derpOf(b, t);
  const host = bodyWorld(data, b.host, t);
  const own = t + d.orbitT;
  const at = bodyWorld(data, row, own);
  const about = bodyWorld(data, b.host, own);
  const [x, y, z] = [at[0] - about[0], at[1] - about[1], at[2] - about[2]];
  const c = Math.cos(d.dNu);
  const s = Math.sin(d.dNu);
  const [rx, rz] = [x * c - z * s, x * s + z * c];
  const flat = Math.hypot(rx, rz);
  const push = flat > 0 ? 1 + d.dR / flat : 1;
  return [host[0] + rx * push + d.wobble[0], host[1] + y + d.lift + d.wobble[1], host[2] + rz * push + d.wobble[2]];
}

/** Where a world point lands on the pin's screen (CSS px from the top left) through the composed close shot on the hero at `t`. */
export function onScreen(camera: PerspectiveCamera, p: Vec3): { x: number; y: number } {
  const q = new Vector3(...p).project(camera);
  return { x: ((q.x + 1) / 2) * PIN_SCREEN.width, y: ((1 - q.y) / 2) * PIN_SCREEN.height };
}

/**
 * The close shot on the hero at ambient `t`, composed for the pin's screen as the essay composes it,
 * through the essay's own near and far planes. The essay's tracked close shot must be this camera
 * (netShots.test.ts fences it): the pin is searched through it.
 */
export function closeCamera(data: BodyData, heroRow: number, t: number): PerspectiveCamera {
  const shot = HERO_CLOSE.C1;
  const target = bodyWorld(data, heroRow, t);
  const dir = lookFromBearing(shot.bearing, shot.elevation);
  const pos: Vec3 = [target[0] + dir[0] * shot.distance, target[1] + dir[1] * shot.distance, target[2] + dir[2] * shot.distance];
  const camera = new PerspectiveCamera(shot.fov, PIN_SCREEN.width / PIN_SCREEN.height, CAMERA_NEAR, GALAXY_FAR);
  const s = mergeState(defaultSceneState(), { camera: { pos, target, fov: shot.fov, frame: shot.frame, coreFocus: 0 } });
  applyCamera(camera, s, WORLD, { compose: true });
  return camera;
}

/** What one candidate slot of one moon meets. */
interface Candidate {
  t: number;
  moon: string;
  burst: boolean;
  jump: boolean;
  ghost: boolean;
  /** (b) and (c): its home faces the camera and it is in the picture. */
  framed: boolean;
  scatter: boolean;
}

function candidate(g: Galaxy, data: BodyData, hero: Body, m: Body, t: number, ev: { kind: DerpKind }): Candidate {
  const d = derpOf(m, t);
  const centre = bodyWorld(data, hero.index, t);
  const home = bodyWorld(data, m.index, t);
  const rel: Vec3 = [home[0] - centre[0], home[1] - centre[1], home[2] - centre[2]];
  const camDir = lookFromBearing(HERO_CLOSE.C1.bearing, HERO_CLOSE.C1.elevation);
  const facing = (rel[0] * camDir[0] + rel[1] * camDir[1] + rel[2] * camDir[2]) / Math.hypot(...rel) > PIN_FACING;
  let framed = false;
  if (facing) {
    const camera = closeCamera(data, hero.index, t);
    const side = (1 - PIN_CENTRAL) / 2;
    framed = [pinnedMoon(g, data, m.index, t), home].every((p) => {
      const at = onScreen(camera, p);
      return at.x > side * PIN_SCREEN.width && at.x < (1 - side) * PIN_SCREEN.width && at.y > PIN_BELOW * PIN_SCREEN.height && at.y < PIN_SCREEN.height;
    });
  }
  const sec = derpOf(hero, t).scatterS;
  return {
    t,
    moon: m.id,
    burst: ev.kind === DerpKind.Burst,
    jump: d.dR !== 0 && Math.abs(d.dR) >= PIN_JUMP * (m.orbit?.a ?? 0),
    ghost: d.ghost === 1,
    framed,
    scatter: sec >= PIN_SCATTER_SEC[0] && sec <= PIN_SCATTER_SEC[1],
  };
}

/**
 * The freeze pin for a code hero (freeze-frame §1.2, morph-and-scatter §3.3): walking the slots
 * k = 0 .. FREEZE_PIN_SEARCH_S / NODE_DERP_PERIOD of the hero's moons (each slot in the moons'
 * generated order), the first instant, at FREEZE_MOON_S of the moon's event (and FREEZE_PIN_OFFSET_S on,
 * half a tick of the burst's jitter, so the held pose is off a jitter cut in float32 and float64 alike), where (a) the moon is in
 * a burst with its jump on, at least 0.2 r off its ellipse, and its ghost on, (b) its home faces the
 * close shot's camera, (c) it and its home project inside the central 60 % of a phone and under
 * 0.42 of its height, and (d) the hero's shell is 0.10–0.20 s into a scatter. Failing that, the first without (d) (`forced-scatter`), then
 * without the ghost (`forced-ghost`), then the first framed slot or the first slot at all (`forced`).
 */
export function searchPin(g: Galaxy, hero: 'C1'): Pin {
  const h = g.bodies[g.ids[hero]];
  const moons = g.bodies.filter((b) => b.kind === 'moon' && b.host === h.index);
  const data = packBodyData(g);
  const slots = Math.floor(FREEZE_PIN_SEARCH_S / NODE_DERP_PERIOD);
  let scatterless: Candidate | null = null;
  let ghostless: Candidate | null = null;
  let framedOnly: Candidate | null = null;
  let first: Candidate | null = null;
  for (let k = 0; k <= slots; k++) {
    for (const m of moons) {
      const ev = derpEvent(m.derpSeed, m.derpPhase, (k - m.derpPhase) * NODE_DERP_PERIOD + NODE_DERP_PERIOD / 2);
      const t = ev.t0 + FREEZE_MOON_S * NODE_DERP_DUR + FREEZE_PIN_OFFSET_S;
      if (t < 0 || t > FREEZE_PIN_SEARCH_S) continue;
      const c = candidate(g, data, h, m, t, ev);
      first ??= c;
      if (!c.framed) continue;
      framedOnly ??= c;
      if (!(c.burst && c.jump)) continue;
      ghostless ??= c;
      if (!c.ghost) continue;
      scatterless ??= c;
      if (c.scatter) return { t: c.t, path: 'full', moon: c.moon };
    }
  }
  const pin = (c: Candidate, path: PinPath): Pin => ({ t: c.t, path, moon: c.moon });
  if (scatterless) return pin(scatterless, 'forced-scatter');
  if (ghostless) return pin(ghostless, 'forced-ghost');
  if (framedOnly ?? first) return pin((framedOnly ?? first)!, 'forced');
  throw new Error(`searchPin: ${hero} has no moon slot in ${FREEZE_PIN_SEARCH_S} s`);
}

/** The essay galaxy's pins, searched at module load. */
export const FREEZE_PINS: { readonly C1: Pin } = Object.freeze({
  C1: Object.freeze(searchPin(generateGalaxy(MOTE_SEED, 'desktop', galaxyBudget(MOTE_BUDGET_DESKTOP)), 'C1')),
});

/** The pose tests and reduced motion stop the ambient clock at: the freeze's pin. */
export const AMBIENT_POSE: number = FREEZE_PINS.C1.t;

/** The poses the clearance tests sample: the pin, then across the galaxy's turn. */
export const AMBIENT_GRID: readonly number[] = Object.freeze([AMBIENT_POSE, ...AMBIENT_GRID_TIMES]);
