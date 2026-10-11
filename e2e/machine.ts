import { Vector3, type PerspectiveCamera } from 'three';
import { mechanismAnchors } from '../src/mechanisms/anchors';
import type { Mechanism } from '../src/mechanisms/types';
import type { Vec3 } from '../src/math/vec';
import { AMBIENT_POSE } from '../src/galaxy/ambient';
import { shown } from '../src/scene/ambientClock';
import { createEssayCamera } from '../src/scene/cameraRig';
import { inkInstances, partXRanks, type InkInstances } from '../src/scene/ink/inkLayout';
import { inkPoses, inkUniforms, segmentEnds, segmentLook } from '../src/scene/ink/inkPose';
import { buildMoteAttrs } from '../src/scene/mote/attributes';
import { groupCounts, mote, reflowBodies, reflowKeep } from '../src/scene/mote/mote';
import { partGroups } from '../src/mechanisms/bike/partGroups';
import { partTransforms } from '../src/scene/mote/partTransforms';
import { streamPixels } from '../src/scene/node/streamOnScreen';
import { bodyMote } from '../src/scene/node/bodyMote';
import { FREEZE_TICK_PX } from '../src/scene/node/birth';
import { mechanisms } from '../src/mechanisms';
import { composeEssayCamera } from '../src/timeline/netTrack';
import { ZERO_FAULTS, type SceneState } from '../src/timeline/sceneState';
import { freezeTicks, galaxyOf, galaxyPointTop, held, visibleGalaxy, visibleTracks } from '../src/scene/node/galaxyOnScreen';

// Test-only: where the machine the reader can make out is drawn on screen, computed with the
// renderer's own reference algorithm (src/scene/mote/mote.ts, the TypeScript twin of mote.glsl).
// "Visible machine": the ghost when it shows (assembled, in mech.ghostVariant, zero faults),
// motes that have mostly settled onto their part, the ink drawing's visible strokes (posed and
// pressed flat exactly as ink.vert.glsl does, src/scene/ink/inkPose.ts) and the sheet's corners
// while it shows. Motes still in flight from their spawn shell are the loose cloud, not the
// machine, and are left out. The reflowed bike is its planet and moons, and mote() already follows
// them, wherever the galaxy has them at the frame's ambient.
//
// Act II's galaxy is visibleGalaxy() (src/scene/node/galaxyOnScreen.ts, the twin of what the page
// draws, which the unit clearance sweeps read too), not part of visibleMachine() (which is the bike's
// motes, its ghost and its drawing): machineOnScreen() takes both for the bike, through the essay's
// composed and tracked camera at the frame's ambient. machineOnScreen() counts a galaxy point above the top of
// the screen as above the text (a lit body on its way in through the band), and none off a side.

const BUDGET = 8000;
const SEED = 1;

const attrsCache = new WeakMap<Mechanism, ReturnType<typeof buildMoteAttrs>>();
function attrsOf(mech: Mechanism): ReturnType<typeof buildMoteAttrs> {
  let attrs = attrsCache.get(mech);
  if (!attrs) {
    attrs = buildMoteAttrs(mech, mech.samplePoints(BUDGET, SEED));
    attrsCache.set(mech, attrs);
  }
  return attrs;
}

const inkCache = new WeakMap<Mechanism, InkInstances>();
/** The mechanism's ink segments, as the renderer builds them; null without a drawing. */
export function inkOf(mech: Mechanism): InkInstances | null {
  if (!mech.ink) return null;
  let inst = inkCache.get(mech);
  if (!inst) {
    const strokes = mech.ink();
    inst = inkInstances(strokes, partXRanks(strokes, mech.pose(0, ZERO_FAULTS, 0)));
    inkCache.set(mech, inst);
  }
  return inst;
}

/** World positions of the ink drawn at `s`: each visible segment's start, and its end as far as the pen has got. */
export function visibleInk(mech: Mechanism, s: SceneState): Vec3[] {
  const inst = inkOf(mech);
  if (!inst || s.ink.opacity <= 0) return [];
  const u = inkUniforms(s);
  const poses = inkPoses(mech, s);
  const out: Vec3[] = [];
  for (let k = 0; k < inst.count; k++) {
    const { vis, alpha } = segmentLook(inst, k, u);
    if (alpha < 0.01) continue;
    const [a, b] = segmentEnds(inst, k, poses, s.ink.flat);
    out.push(a, [a[0] + (b[0] - a[0]) * vis, a[1] + (b[1] - a[1]) * vis, a[2] + (b[2] - a[2]) * vis]);
  }
  return out;
}

/** Points round the sheet's edge (world) while it shows: its corners and along each side, so a side running off the screen still counts. */
export function sheetCorners(mech: Mechanism, s: SceneState): Vec3[] {
  const sheet = mech.sheet;
  if (!sheet || s.sheet.opacity <= 0) return [];
  const { centre: c, width: w, height: h } = sheet;
  const at = (x: number, y: number): Vec3 => [c[0] + (x * w) / 2, c[1] + (y * h) / 2, c[2]];
  const out: Vec3[] = [];
  for (let i = 0; i <= 32; i++) {
    const t = -1 + i / 16;
    out.push(at(t, -1), at(t, 1), at(-1, t), at(1, t));
  }
  return out;
}

/** World positions of the visible machine at state `s`, the reflow carrying it where the galaxy has its bodies at `ambient`. */
export function visibleMachine(mech: Mechanism, s: SceneState, ambient = AMBIENT_POSE): Vec3[] {
  const attrs = attrsOf(mech);
  const out: Vec3[] = [];
  const xf = partTransforms(mech, s);
  const { g, data } = galaxyOf();
  const groups = partGroups(mech);
  const bodies = reflowBodies(g, data, ambient);
  const home =
    s.mech.reflow > 0
      ? {
          bodies,
          groups,
          keep: reflowKeep(
            bodies,
            groupCounts(
              groups,
              attrs.filter((a) => a.visible[0]),
            ),
          ),
        }
      : undefined;
  // The mote draw is dimmed by `stage.motes` (moteSystem.ts uStage): at 0, Act II once the galaxy has
  // taken the bike over, it draws nothing, wherever the reflow has its motes.
  if (s.stage.motes > 0) {
    for (const a of attrs) {
      const o = mote(a, s, xf, home);
      if (o.visible && o.settled >= 0.5) out.push(o.pos);
    }
  }
  if (s.mech.ghost > 0) {
    // The ghost never reflows: its draw keeps uReflow at 0 (moteSystem.ts).
    const intended: SceneState = {
      ...s,
      mech: { ...s.mech, assembly: 1, variant: s.mech.ghostVariant, steer: 0, faults: { ...ZERO_FAULTS }, reflow: 0 },
    };
    const gxf = partTransforms(mech, intended);
    for (const a of attrs) {
      const o = mote(a, intended, gxf);
      if (o.visible) out.push(o.pos);
    }
  }
  out.push(...visibleInk(mech, s), ...sheetCorners(mech, s));
  return out;
}

/**
 * Screen extent, in CSS px from the top-left, of the visible machine at `s` on a `width` x `height`
 * page at ambient `ambient`, through the essay's camera (main.ts's own: createEssayCamera and
 * composeEssayCamera, tracking its target at that ambient). Only the points in front of the camera and
 * inside the screen's width count: a close shot may run off a side, and what is off a side covers
 * nothing. For the bike (the essay's machine) the galaxy of Act II counts too (visibleGalaxy), its
 * dotted orbits and moon tracks (visibleTracks) and its stream and feed dots (streamPixels, after the
 * text band's mask) among it.
 * `count` is how many points counted, `total` how many there are.
 */
export function machineOnScreen(
  mech: Mechanism,
  s: SceneState,
  width: number,
  height: number,
  ambient = AMBIENT_POSE,
): { top: number; bottom: number; left: number; right: number; count: number; total: number } {
  const camera = createEssayCamera(width / height);
  const { g, data } = galaxyOf();
  // The freeze's hold: the camera, the bodies and the tracks all read the pin (main.ts).
  ambient = held(s, ambient, g).ambient;
  composeEssayCamera(camera, s, mechanismAnchors(mech), { g, data }, ambient);
  camera.updateMatrixWorld();
  const xs: number[] = [];
  const ys: number[] = [];
  const eye = camera.getWorldPosition(new Vector3());
  const focal = 0.5 * height * camera.projectionMatrix.elements[5];
  const machine = visibleMachine(mech, s, ambient);
  for (const p of machine) {
    const q = new Vector3(...p).project(camera);
    if (Math.abs(q.x) > 1 || q.z > 1) continue;
    xs.push(((q.x + 1) / 2) * width);
    ys.push(((1 - q.y) / 2) * height);
  }
  // A galaxy point stands half its sprite higher than its centre (review M6), and its freeze copies'
  // rise higher on the held piece (galaxyPointTop); one above the screen counts as above the text.
  const galaxy = mech.id === 'bike' ? visibleGalaxy(s, ambient) : [];
  // The drawn orbits and moon tracks (Task 10 review I2), as the unit clearance twin counts them.
  const tracks = mech.id === 'bike' ? visibleTracks(s, ambient, camera, width, height) : [];
  for (const p of [...galaxy, ...tracks]) {
    const at = galaxyPointTop(p, s, camera, eye, focal, width, height);
    if (!at) continue;
    xs.push(at.x);
    ys.push(at.top);
  }
  // The freeze frame's bursts are drawn motes too, in the view plane round their sources: each mote's
  // top is half its dot higher (FREEZE_TICK_PX). Only while the dressing shows them.
  const ticks = mech.id === 'bike' && s.freeze.dress * s.net.focus > 0 ? freezeTicks(s, ambient, camera, width, height).ticks : [];
  for (const t of ticks) {
    if (t.x < 0 || t.x > width) continue;
    xs.push(t.x);
    ys.push(t.y - FREEZE_TICK_PX / 2);
  }
  // The stream and feed dots the page lights, after the text band's mask (Task 11 review I1): each the
  // top of its pixel. The mask keeps every one of them out of the band and its margin.
  const streams = mech.id === 'bike' ? streamPixels(s.net, g, data, camera, { width, height }, ambient) : [];
  for (const d of streams) {
    xs.push(d.x);
    ys.push(d.y);
  }
  return {
    top: Math.min(...ys),
    bottom: Math.max(...ys),
    left: Math.min(...xs),
    right: Math.max(...xs),
    count: xs.length,
    total: machine.length + galaxy.length + tracks.length + ticks.length + streams.length,
  };
}

/**
 * The essay's camera at `s` on a `width` x `height` page at ambient `ambient` (main.ts's own: the ambient
 * shown, the pin while held), and that ambient: what the freeze frame's tests project the twins through.
 */
export function essayCameraAt(s: SceneState, width: number, height: number, ambient = AMBIENT_POSE): { camera: PerspectiveCamera; ambient: number } {
  const camera = createEssayCamera(width / height);
  const { g, data } = galaxyOf();
  const t = held(s, ambient, g).ambient;
  composeEssayCamera(camera, s, mechanismAnchors(mechanisms.bike), { g, data }, t);
  camera.updateMatrixWorld();
  return { camera, ambient: t };
}
