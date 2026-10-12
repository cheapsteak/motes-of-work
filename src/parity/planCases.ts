// The ?lib=plan parity cases (parity.ts planParity): the plan's schematic (re-skin §4.7, Task 7b) through
// the galaxy shots' cameras, each a frame as bodySystem.ts lays it (planOnScreen.ts planFrameAt), every
// dot of both pools compared. Kept apart from the parity page, which runs in a browser, so a unit test
// can read them (planCases.test.ts).
import { AMBIENT_POSE } from '../galaxy/ambient';
import type { Galaxy } from '../galaxy/generate';
import type { BodyData } from '../scene/node/bodyData';
import { LOD_COUNT, LodElement } from '../scene/node/lod';
import type { PlanFrame } from '../scene/node/plan';
import { planFrameAt, type PlanClocks } from '../scene/node/planOnScreen';
import { GALAXY_SHOTS, galaxyShotCamera, galaxyShotLampAt } from '../timeline/netShots';
import { Lamp, lampFocusRow } from '../timeline/netTrack';
import { PerspectiveCamera, Vector3 } from 'three';
import { bodyWorld } from '../scene/node/orbit';
import { planPairs } from '../scene/node/planAttrs';

/** The ambients each plan case is drawn at: the start, the pose and the loop's end. */
export const PLAN_AMBIENTS = [0, AMBIENT_POSE, 3599.9] as const;
/** The screens each plan case is drawn on (CSS px; the pixel ratio 1): a phone's and a desktop's. */
export const PLAN_SIZES = [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
] as const;

/** A plan case: the shot whose camera frames it (or the pair's close camera), the clocks over the shot's lamp, and the level-of-detail overrides (none unless given). */
export interface PlanCase {
  name: string;
  shot: 'hood' | 'system' | 'twelve' | 'close' | 'pair';
  clocks?: Partial<Omit<PlanClocks, 'ambient'>>;
  force?: () => Float32Array;
}

/** The ?lib=plan cases, each at every one of PLAN_AMBIENTS on each of PLAN_SIZES. */
export const PLAN_CASES: PlanCase[] = [
  // H: every system's ring, arcs, nodes and chevrons.
  { name: 'the neighbourhood', shot: 'hood' },
  // R on a healthy system: P_a's bands, outlines, stalks, graduations, centre and dimension.
  { name: 'P_a, healthy', shot: 'system' },
  // The twelve lit, their departures ember; then mended, phosphor again.
  { name: 'the twelve, lit', shot: 'twelve', clocks: { highlight: 1 } },
  { name: 'the twelve, mended', shot: 'twelve', clocks: { highlight: 1, fix: 1 } },
  // The defect close: P1's system in R, C1 off its band under the planet lamp at full focus.
  { name: 'the defect close', shot: 'close', clocks: { focus: 1 } },
  // Every plan window forced open (PlanLeave shut, so the arcs' chevrons stay): every mark of every
  // system on screen, R's in the two systems that hold it.
  { name: 'the neighbourhood, every window open', shot: 'hood', force: everyWindowOpen },
  // The binary pair close (pairCloseCamera), every window open: its barycentre's cross and circle, each
  // star's ellipse round it and its stable limit.
  { name: 'the pair close, every window open', shot: 'pair', force: everyWindowOpen },
];

/**
 * A camera over the essay galaxy's binary pair (the one planPairs finds) at `t` on a screen of `size`:
 * 80 units over its barycentre and 30 out, aimed 18 units beyond it so the pair stands in the screen's
 * lower half, under the text band, whose mask (streamBandMask) would take the marks above it.
 */
export function pairCloseCamera(g: Galaxy, data: BodyData, t: number, size: { width: number; height: number }): PerspectiveCamera {
  const bary = new Vector3(...bodyWorld(data, planPairs(g)[0].bary, t));
  const camera = new PerspectiveCamera(40, size.width / size.height, 0.1, 5000);
  camera.position.copy(bary).add(new Vector3(0, 80, 30));
  camera.lookAt(bary.clone().add(new Vector3(0, 0, -18)));
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  return camera;
}

/** The level-of-detail overrides with every plan window open and PlanLeave shut (the bodies' own left free). */
export function everyWindowOpen(): Float32Array {
  const force = new Float32Array(LOD_COUNT).fill(-1);
  for (let el = LodElement.PlanRingOuter; el <= LodElement.PlanNum; el++) force[el] = 1;
  force[LodElement.PlanLeave] = 0;
  return force;
}

/**
 * Case `c`'s frame at `ambient` on `size`: the shot's camera, its lamp, every body built and shown, the
 * case's clocks; the ambient, the clocks and the camera's matrices as float32 uniforms carry them.
 */
export function planCaseFrame(g: Galaxy, data: BodyData, c: PlanCase, ambient: number, size: { width: number; height: number }): PlanFrame {
  const f32 = Math.fround;
  const t = f32(ambient);
  const shot = c.shot === 'pair' ? null : GALAXY_SHOTS[c.shot];
  const camera = shot === null ? pairCloseCamera(g, data, t, size) : galaxyShotCamera(shot, g, data, size, t);
  const clocks: PlanClocks = {
    growth: 1,
    fix: 0,
    highlight: 0,
    show: 1,
    focus: 0,
    lamp: shot === null ? Lamp.Hood : shot.lamp,
    lampRow: shot === null ? -1 : lampFocusRow(galaxyShotLampAt(shot), g),
    ...c.clocks,
    ambient: t,
  };
  for (const k of ['growth', 'fix', 'highlight', 'show', 'focus'] as const) clocks[k] = f32(clocks[k]);
  const f = planFrameAt(g, data, camera, size, clocks, c.force?.());
  return { ...f, view: { ...f.view, view: Array.from(f.view.view, f32), projection: Array.from(f.view.projection, f32) } };
}
