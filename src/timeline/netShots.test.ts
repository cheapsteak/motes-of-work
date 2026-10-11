import { PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { MOTE_BUDGET_DESKTOP, MOTE_SEED } from '../config';
import { AMBIENT_GRID, AMBIENT_POSE, closeCamera, FREEZE_PINS, HERO_CLOSE, onScreen, PIN_SCREEN, pinnedMoon } from '../galaxy/ambient';
import { galaxyTier } from '../galaxy/background';
import {
  bodyIndex,
  galaxyBudget,
  generateGalaxy,
  pieceOuter,
  SYS_MAX,
  systemOuter,
  type Body,
  type Galaxy,
} from '../galaxy/generate';
import { mechanismAnchors } from '../mechanisms/anchors';
import { mechanisms } from '../mechanisms';
import { AMBIENT_WRAP } from '../scene/ambientClock';
import { packBodyData, type BodyData } from '../scene/node/bodyData';
import { bodyCentre, bodyDerp, bodyLight, lampGain, type BodyClocks } from '../scene/node/bodyMote';
import { bodyWorld } from '../scene/node/orbit';
import { GLOW_CAP, glowPx } from '../galaxy/body';
import { BODY_LOOK } from '../scene/node/bodyAttrs';
import { starSpike, starSpikeShare, starTopPx } from '../scene/node/star';
import { FREEZE_TICK_PX, NODE_BIRTH_WINDOW, NODE_FIX_WINDOW } from '../scene/node/birth';
import { lookFromBearing } from './cameraSpline';
import { BG } from '../galaxy/background';
import { targetOnScreen } from '../scene/cameraRig';
import { sectionSpans } from '../scroll/progress';
import { loadStory } from '../story/loader';
import { fadeWidth, pageOut } from '../story/reveal';
import { KeyframeSampler, type KeyframeFile } from './keyframeSampler';
import keyframes from './keyframes.json';
import {
  ACT_ONE_LAST,
  actTwoKeys,
  BAND_MARGIN_PX,
  bandClearance,
  cylinderTop,
  spriteHalfTop,
  essayCamera,
  GALAXY_SHOTS,
  galaxyShotCamera,
  galaxyShotDistance,
  galaxyShotKeys,
  keyProgress,
  lampDisc,
  liftBound,
  litDiscs,
  RIM_BEARINGS,
  shotFrame,
  ACT_TWO_MOVES,
  actTwoFrame,
  actTwoMoves,
  DEFECT_SHOTS,
  FEED_KEYS,
  FOCUS_KEYS,
  FX2_PAN,
  galaxyShotLampAt,
  HAZE_KEYS,
  HOOD_HOLD_KEYS,
  HOOD_HOLD_SHOTS,
  LATE_CLOSE,
  LATE_MOVES,
  LATE_SHOTS,
  LATE_STREAMS,
  NET_MOVES,
  placeOf,
  POSE_TURN_DEG,
  screensOf,
  SPREAD_STREAMS,
  FAR_ORBIT,
  FAR_SHOT,
  LAYERS_SHOTS,
  LY4_CLOSE,
  LY4_RIDE,
  moveShares,
  LAYERS_STREAMS,
  layersAt,
  spreadAt,
  MOVE_SECTIONS,
  poseCamera,
  poseOf,
  type SectionAt,
  S10P,
  TEXT_BAND,
  TWELVE_MARGIN_PX,
  Z0,
  ZOOM_OUT,
  ZOOM_OUT_CLOCK_TRACKS,
  ZOOM_OUT_KEY_LOCALS,
  zoomOutKeys,
  zoomOutShot,
  type GalaxyShot,
  type KeyedFrame,
} from './netShots';
import { Lamp, lampFocusRow, targetWorld, TRACK_TARGETS, trackIndex, trackPoint, trackTargetWorld } from './netTrack';
import { defaultSceneState, type SceneState } from './sceneState';
import { freezeTicks, galaxyPointTop, held, visibleGalaxy, visibleTracks } from '../scene/node/galaxyOnScreen';
import { streamPixels } from '../scene/node/streamOnScreen';

const g = generateGalaxy(MOTE_SEED, 'desktop', galaxyBudget(MOTE_BUDGET_DESKTOP));
const data = packBodyData(g);
const bike = mechanismAnchors(mechanisms.bike);
const PHONE = { width: 390, height: 844 } as const;
const DESKTOP = { width: 1440, height: 900 } as const;

/**
 * visibleGalaxy at `s` and `t`, once for both screens: it does not depend on the screen, and it is most
 * of a margin's cost (the sweeps below take every state at both sizes).
 */
const galaxyMemo = new WeakMap<SceneState, Map<number, ReturnType<typeof visibleGalaxy>>>();
function galaxyAt(s: SceneState, t: number): ReturnType<typeof visibleGalaxy> {
  let byT = galaxyMemo.get(s);
  if (!byT) galaxyMemo.set(s, (byT = new Map()));
  let points = byT.get(t);
  if (!points) byT.set(t, (points = visibleGalaxy(s, t)));
  return points;
}

/**
 * The visible galaxy's margin under the text band (CSS px; negative inside it) at state `s`, through
 * the essay's camera at ambient `t`: its lit, built bodies' landed motes and glow sprites
 * (visibleGalaxy, galaxyOnScreen.ts, the TS twin of what the page draws), each its sprite's half
 * higher (spritePx) and, on the held piece, its freeze copies' rise higher (galaxyPointTop), as
 * machineOnScreen counts them (one off a side covers nothing; one above the screen is in the band). Task 10's clearance ruling: the lamp-1 close shots and the lineage lamp are held to
 * this, because cylinderTop counts the whole galaxy's lift above a close piece and the lineage's disc
 * spans every R0 star, and cannot pass where the pixels do. The drawn dotted orbits and moon tracks
 * count too (visibleTracks, each dot its sprite's half higher; Task 10 review I2: C1's and C5's own
 * orbits stood in the band on a landscape screen while no twin had them). So do the stream and feed
 * dots the page lights, after the text band's mask (streamPixels; Task 11 review I1: core-lamp-lit
 * stream dots stood in the band on a desktop while no twin had them), each the top of its pixel.
 */
function visibleClearance(s: SceneState, size: { width: number; height: number }, t: number): number {
  // The freeze's hold shows the pin, whatever the clock (main.ts).
  t = held(s, t, g).ambient;
  const camera = essayCamera(s.camera, g, data, size, t);
  camera.updateMatrixWorld();
  const eye = camera.getWorldPosition(new Vector3());
  const focal = 0.5 * size.height * camera.projectionMatrix.elements[5];
  let top = Infinity;
  for (const p of [...galaxyAt(s, t), ...visibleTracks(s, t, camera, size.width, size.height)]) {
    const at = galaxyPointTop(p, s, camera, eye, focal, size.width, size.height);
    if (at) top = Math.min(top, at.top);
  }
  for (const d of streamPixels(s.net, g, data, camera, size, t)) top = Math.min(top, d.y);
  // The freeze frame's bursts are drawn motes too (Task 12): each dot's top.
  if (s.freeze.dress * s.net.focus > 0)
    for (const tick of freezeTicks(s, t, camera, size.width, size.height).ticks) if (tick.x >= 0 && tick.x <= size.width) top = Math.min(top, tick.y - FREEZE_TICK_PX / 2);
  return top - (TEXT_BAND * size.height + BAND_MARGIN_PX);
}

/** The lamps whose lit set is held to visibleClearance (Task 10's ruling); every other to cylinderTop. */
const VISIBLE_LAMPS: readonly Lamp[] = [Lamp.Planet, Lamp.Lineage];

/** A state's margin under the band: visibleClearance under the planet and lineage lamps, cylinderTop's under every other. */
function stateClearance(s: SceneState, size: { width: number; height: number }, t: number): number {
  const lamp = Math.round(s.net.lamp) as Lamp;
  if (VISIBLE_LAMPS.includes(lamp)) return visibleClearance(s, size, t);
  return bandClearance({ camera: s.camera, lamp, lampAt: Math.round(s.net.lampAt), growth: s.net.growth, show: s.net.show, streams: s.net }, g, data, size, t);
}

describe('GALAXY_SHOTS', () => {
  it('are §14.5’s probe shots, and the close shot is HERO_CLOSE.C1', () => {
    const tuple = (k: keyof typeof GALAXY_SHOTS) => {
      const s = GALAXY_SHOTS[k];
      return [s.bearing, s.elevation, s.distance, s.fov, s.frame, s.target];
    };
    expect(tuple('galaxyWide')).toEqual([0, 86, 640, 40, 0, { core: true }]);
    expect(tuple('hood')).toEqual([0, 82, 120, 40, 0, { hood: true }]);
    expect(tuple('core')).toEqual([30, 64, 30, 40, 0, { core: true }]);
    expect(tuple('system')).toEqual([-10, 72, { outerTimes: 2.7 }, 40, 0, { body: 'P_a' }]);
    // The twelve's distance is not §14.5's 58, which framed P1-P3 at no AMBIENT_GRID pose (below);
    // 132 since Task 1d's wider neighbourhood (93 before it).
    expect(tuple('twelve')).toEqual([-10, 74, 132, 40, 0, { centroid: ['P1', 'P2', 'P3'] }]);
    const c = HERO_CLOSE.C1;
    expect(tuple('close')).toEqual([c.bearing, c.elevation, c.distance, c.fov, c.frame, { body: 'C1' }]);
    // A landscape screen's own distance and frame: for the galaxy wide, GALAXY_WIDE's landscape distance
    // (Task 1d: at 640 the wider neighbourhood stood in the band on a desktop); for the twelve, whose
    // triangle runs down a short screen (Task 10's shot pass: at -115, so its lineage keeps under the
    // band; 150 since Task 1d, 120 before it); and for the close shot, whose phone values are the pin's.
    expect(Object.fromEntries(Object.entries(GALAXY_SHOTS).flatMap(([k, s]) => (s.landscape ? [[k, s.landscape]] : [])))).toEqual({
      galaxyWide: { distance: 953, frame: 0 },
      twelve: { distance: 150, frame: 0, bearing: -115 },
      close: { distance: 6.5, frame: 0 },
    });
    // §14.5's lamps: 0, 3, core, 2, the three systems and the core, 1.
    expect(Object.values(GALAXY_SHOTS).map((s) => s.lamp)).toEqual([Lamp.Off, Lamp.Hood, Lamp.Core, Lamp.Star, Lamp.Lineage, Lamp.Planet]);
    expect([Lamp.Off, Lamp.Planet, Lamp.Star, Lamp.Hood, Lamp.Core, Lamp.Lineage]).toEqual([0, 1, 2, 3, 4, 5]);
  });
});

describe('galaxyShotKeys', () => {
  it('sizes a system shot by its star’s system', () => {
    for (const aspect of [PHONE.width / PHONE.height, DESKTOP.width / DESKTOP.height]) {
      expect(galaxyShotDistance(GALAXY_SHOTS.system, g, aspect)).toBeCloseTo(2.7 * systemOuter(g, bodyIndex(g, 'P_a')), 12);
    }
  });

  it('is the same keys on every screen, carrying a landscape variant only for a shot that has one', () => {
    const close = galaxyShotKeys(GALAXY_SHOTS.close, g);
    expect(close.frame).toBe(HERO_CLOSE.C1.frame);
    expect(close.landscape.mix).toBe(1);
    expect(close.landscape.frame).toBe(0);
    expect(galaxyShotKeys(GALAXY_SHOTS.twelve, g).landscape.mix).toBe(1);
    // The galaxy wide carries one since Task 1d: GALAXY_WIDE's landscape distance.
    expect(galaxyShotKeys(GALAXY_SHOTS.galaxyWide, g).landscape.mix).toBe(1);
    for (const shot of [GALAXY_SHOTS.hood, GALAXY_SHOTS.core, GALAXY_SHOTS.system]) {
      const keys = galaxyShotKeys(shot, g);
      expect(keys.landscape).toEqual({ pos: keys.pos, frame: keys.frame, mix: 0 });
    }
  });

  it('tracks the shot’s target: the keys are relative to it, and the frame’s origin puts the camera at the shot’s bearing, elevation and distance from where the target is at that ambient', () => {
    for (const shot of Object.values(GALAXY_SHOTS)) {
      const keys = galaxyShotKeys(shot, g);
      const at = trackIndex(shot.target);
      expect(keys.track).toEqual({ a: at, b: at, mix: 0, turn: shot === GALAXY_SHOTS.twelve ? 1 : 0 });
      expect([keys.fov, keys.frame, keys.coreFocus]).toEqual([shot.fov, shot.frame, 0]);
      for (const t of [0, 123.4, AMBIENT_POSE]) {
        const origin = trackPoint(keys.track, g, data, t);
        const want = trackTargetWorld(at, g, data, t);
        expect(origin).toEqual(want);
        const world = (v: readonly number[]) => v.map((x, k) => bike.whole.center[k] + x * bike.whole.radius + origin[k]);
        const target = world(keys.target);
        const pos = world(keys.pos);
        const d = galaxyShotDistance(shot, g, PHONE.width / PHONE.height);
        const dir = lookFromBearing(shot.bearing, shot.elevation);
        // And the landscape screen's: its own bearing and distance where the shot has them (the twelve's
        // -115 at 120, the close shot's 6.5), the phone's where it has none.
        const wide = world(keys.landscape.pos);
        const wideDir = lookFromBearing(shot.landscape?.bearing ?? shot.bearing, shot.elevation);
        const wideD = shot.landscape?.distance ?? d;
        for (let k = 0; k < 3; k++) {
          expect(target[k]).toBeCloseTo(want[k], 9);
          expect(pos[k]).toBeCloseTo(want[k] + dir[k] * d, 9);
          expect(wide[k], `${JSON.stringify(shot.target)} landscape`).toBeCloseTo(want[k] + wideDir[k] * wideD, 9);
        }
      }
    }
  });
});

// Ruling 4: a shot that stands elsewhere on a wide screen (the close shot's 6.5, wide; the twelve's
// 120 at bearing -115) says so in its keys (`camera.landscape`), and one rule in the rig takes it on a
// landscape screen (landscapeRig), as portraitRig widens a portrait one. No per-shot code in main.ts.
describe('one aspect rule for every screen (ruling 4)', () => {
  /** The camera's distance from its tracked target, and where the target lands on screen (shares of the width and height). */
  function framing(camera: PerspectiveCamera, target: readonly number[], size: { width: number; height: number }) {
    camera.updateMatrixWorld();
    const p = new Vector3(...target).project(camera);
    return { d: camera.position.distanceTo(new Vector3(...target)), x: (p.x + 1) / 2, y: (1 - p.y) / 2 };
  }

  for (const name of ['close', 'twelve'] as const) {
    it(`frames the ${name} by §14.5 on a phone and by its landscape variant on a desktop, from the same keys`, () => {
      const shot = GALAXY_SHOTS[name];
      const t = AMBIENT_POSE;
      const target = trackTargetWorld(trackIndex(shot.target), g, data, t);
      const phone = framing(galaxyShotCamera(shot, g, data, PHONE, t), target, PHONE);
      const desk = framing(galaxyShotCamera(shot, g, data, DESKTOP, t), target, DESKTOP);
      // The phone: §14.5's distance, widened by the portrait rig's own factor.
      const k = Math.sqrt(Math.min(2.4, Math.max(1, 0.89 / (PHONE.width / PHONE.height))));
      expect(phone.d).toBeCloseTo((shot.distance as number) * k, 6);
      expect([phone.x, phone.y].map((v) => +v.toFixed(6))).toEqual(
        [targetOnScreen(PHONE.width / PHONE.height, shot.frame)].flatMap((s) => [s.x, s.y]),
      );
      // The desktop: the landscape distance and frame.
      expect(desk.d).toBeCloseTo(shot.landscape!.distance, 6);
      const at = targetOnScreen(DESKTOP.width / DESKTOP.height, shot.landscape!.frame);
      expect(desk.x).toBeCloseTo(at.x, 6);
      expect(desk.y).toBeCloseTo(at.y, 6);
    });
  }

  it('reads the landscape bearing too: the twelve turned -115 on a desktop', () => {
    const shot = GALAXY_SHOTS.twelve;
    const camera = galaxyShotCamera(shot, g, data, DESKTOP, 0);
    const target = trackTargetWorld(trackIndex(shot.target), g, data, 0);
    const off = camera.position.clone().sub(new Vector3(...target));
    expect(Math.atan2(off.x, off.z) / (Math.PI / 180)).toBeCloseTo(shot.landscape!.bearing!, 6);
  });

  it('is what the keyframes carry: a keyframe file holding a shot’s keys draws that shot on both screens', () => {
    for (const shot of [GALAXY_SHOTS.close, GALAXY_SHOTS.twelve]) {
      const keys = galaxyShotKeys(shot, g);
      const tracks: KeyframeFile['tracks'] = {
        'camera.pos': [{ at: 0, value: keys.pos }],
        'camera.target': [{ at: 0, value: keys.target }],
        'camera.fov': [{ at: 0, value: keys.fov }],
        'camera.frame': [{ at: 0, value: keys.frame }],
        'camera.track.a': [{ at: 0, value: keys.track.a }],
        'camera.track.b': [{ at: 0, value: keys.track.b }],
        'camera.track.turn': [{ at: 0, value: keys.track.turn }],
        'camera.landscape.pos': [{ at: 0, value: keys.landscape.pos }],
        'camera.landscape.frame': [{ at: 0, value: keys.landscape.frame }],
        'camera.landscape.mix': [{ at: 0, value: keys.landscape.mix }],
      };
      const sampled = new KeyframeSampler({ tracks }, sectionSpans(loadStory())).sample(0.5);
      for (const size of [PHONE, DESKTOP]) {
        const keyed = essayCamera(sampled.camera, g, data, size, 311);
        const direct = galaxyShotCamera(shot, g, data, size, 311);
        keyed.matrixWorld.elements.forEach((v, i) => expect(v).toBeCloseTo(direct.matrixWorld.elements[i], 9));
        keyed.projectionMatrix.elements.forEach((v, i) => expect(v).toBeCloseTo(direct.projectionMatrix.elements[i], 9));
      }
    }
  });

  it('leaves a key without a variant as it is on a landscape screen', () => {
    const keys = galaxyShotKeys(GALAXY_SHOTS.hood, g);
    const camera = essayCamera(keys, g, data, DESKTOP, 0);
    const target = trackTargetWorld(trackIndex(GALAXY_SHOTS.hood.target), g, data, 0);
    expect(framing(camera, target, DESKTOP).d).toBeCloseTo(GALAXY_SHOTS.hood.distance as number, 6);
  });
});
describe('the essay’s tracked close shot is the freeze pin’s camera', () => {
  // The pin (ambient.ts searchPin) is searched through closeCamera on the phone. The essay draws the
  // close shot through createEssayCamera and composeEssayCamera, main.ts's own path (galaxyShotCamera):
  // at the pose, on the phone, it must be that camera, or the moon the pin chose is not where it was chosen.
  const phone = generateGalaxy(MOTE_SEED, galaxyTier(PIN_SCREEN.width, PIN_SCREEN.height), galaxyBudget(MOTE_BUDGET_DESKTOP));
  const phoneData = packBodyData(phone);

  const essayClose = (t: number): PerspectiveCamera => galaxyShotCamera(GALAXY_SHOTS.close, phone, phoneData, PIN_SCREEN, t);

  it('at AMBIENT_POSE on the phone: the same projection and world matrices, to 1e-6', () => {
    const pin = closeCamera(phoneData, bodyIndex(phone, 'C1'), AMBIENT_POSE);
    const essay = essayClose(AMBIENT_POSE);
    pin.projectionMatrix.elements.forEach((v, i) => expect(essay.projectionMatrix.elements[i], `projection ${i}`).toBeCloseTo(v, 6));
    pin.matrixWorld.elements.forEach((v, i) => expect(essay.matrixWorld.elements[i], `world ${i}`).toBeCloseTo(v, 6));
    expect(Math.abs(essay.fov - pin.fov)).toBeLessThan(1e-9);
  });

  it('so the pinned moon and its home land where searchPin put them: inside the central 60 % of the phone, under 0.42 of its height', () => {
    const pin = closeCamera(phoneData, bodyIndex(phone, 'C1'), AMBIENT_POSE);
    const essay = essayClose(AMBIENT_POSE);
    const moon = bodyIndex(phone, FREEZE_PINS.C1.moon);
    for (const p of [pinnedMoon(phone, phoneData, moon, AMBIENT_POSE), bodyWorld(phoneData, moon, AMBIENT_POSE)]) {
      const want = onScreen(pin, p);
      const got = onScreen(essay, p);
      expect(Math.hypot(got.x - want.x, got.y - want.y)).toBeLessThan(1e-6);
      expect(got.x).toBeGreaterThan(0.2 * PIN_SCREEN.width);
      expect(got.x).toBeLessThan(0.8 * PIN_SCREEN.width);
      expect(got.y).toBeGreaterThan(0.42 * PIN_SCREEN.height);
      expect(got.y).toBeLessThan(PIN_SCREEN.height);
    }
  });

  it('the phone’s bodies are the desktop’s, which the pin was searched in', () => {
    for (const id of ['C1', FREEZE_PINS.C1.moon]) {
      for (const t of [0, AMBIENT_POSE]) {
        expect(bodyWorld(phoneData, bodyIndex(phone, id), t)).toEqual(bodyWorld(data, bodyIndex(g, id), t));
      }
      expect(bodyIndex(phone, id)).toBe(bodyIndex(g, id));
    }
  });
});

/** The essay's camera on `shot` at ambient `t` on a screen: main.ts's own path (galaxyShotCamera). */
const shotCamera = (shot: GalaxyShot, gx: Galaxy, dx: BodyData, size: { width: number; height: number }, t: number): PerspectiveCamera =>
  galaxyShotCamera(shot, gx, dx, size, t);

/** The disc of a body of radius `R` at `p` on a screen through `camera`: its centre and radius in CSS px. */
function disc(camera: PerspectiveCamera, size: { width: number; height: number }, p: readonly number[], R: number) {
  const v = new Vector3(p[0], p[1], p[2]);
  const d = v.distanceTo(camera.position);
  v.project(camera);
  const focal = 0.5 * size.height * camera.projectionMatrix.elements[5];
  return { x: ((v.x + 1) / 2) * size.width, y: ((1 - v.y) / 2) * size.height, r: (R * focal) / d };
}

/** A disc whole in the frame, `margin` CSS px clear of every edge. */
const inFrame = (c: { x: number; y: number; r: number }, size: { width: number; height: number }, margin = 0) =>
  c.x - c.r >= margin && c.x + c.r <= size.width - margin && c.y - c.r >= margin && c.y + c.r <= size.height - margin;

describe('the close shot keeps a derped C1 in the frame', () => {
  it('on a desktop, C1’s whole disc is in the frame at every derp the ambient shows (every 1/30 s of the wrap), the camera riding its undisturbed place', () => {
    const gx = generateGalaxy(MOTE_SEED, galaxyTier(DESKTOP.width, DESKTOP.height), galaxyBudget(MOTE_BUDGET_DESKTOP));
    const dx = packBodyData(gx);
    const row = bodyIndex(gx, 'C1');
    const c1 = gx.bodies[row];
    const sys = gx.systems.indexOf(c1.star);
    // Every derp at full gain: the close shot draws C1's system at full detail.
    const sysPx = Float32Array.from({ length: SYS_MAX }, () => 1e4);
    // The camera's pose relative to C1 never changes (it rides C1): one camera, about C1 at the origin.
    const camera = shotCamera(GALAXY_SHOTS.close, gx, dx, DESKTOP, 0);
    const home = bodyWorld(dx, row, 0);
    let far = 0;
    let out = 0;
    for (let i = 0; i < AMBIENT_WRAP * 30; i++) {
      const t = i / 30;
      const c: BodyClocks = { growth: 1, fix: 0, highlight: 0, show: 1, focus: 0, lamp: Lamp.Off, lampRow: -1, ambient: t, sysPx };
      const at = bodyCentre(row, bodyDerp(row, sys, c, dx), t, dx);
      const q = bodyWorld(dx, row, t);
      const off = [at[0] - q[0], at[1] - q[1], at[2] - q[2]];
      far = Math.max(far, Math.hypot(...off));
      if (!inFrame(disc(camera, DESKTOP, [home[0] + off[0], home[1] + off[1], home[2] + off[2]], c1.R), DESKTOP)) out++;
    }
    // The case is real: the derps carry C1 more than four of its radii off its place.
    expect(far).toBeGreaterThan(4 * c1.R);
    expect(out, 'frames with C1 partly out of the desktop frame').toBe(0);
  });
});

describe('the twelve shot frames P1-P3 at every ambient', () => {
  /** Every body of P1-P3 at every 1/30 s of the shown ambient, from the galaxy for `size` (computed once a size). */
  const sweeps = new Map<string, { gx: Galaxy; dx: BodyData; ts: number[]; at: { id: string; R: number; p: number[] }[][] }>();
  function sweep(size: { width: number; height: number }) {
    const key = `${size.width}x${size.height}`;
    let s = sweeps.get(key);
    if (s === undefined) {
      const gx = generateGalaxy(MOTE_SEED, galaxyTier(size.width, size.height), galaxyBudget(MOTE_BUDGET_DESKTOP));
      const dx = packBodyData(gx);
      const stars = ['P1', 'P2', 'P3'].map((id) => bodyIndex(gx, id));
      const bodies = gx.bodies.filter((b) => stars.includes(b.star));
      expect(bodies.length).toBeGreaterThanOrEqual(12);
      const ts = Array.from({ length: AMBIENT_WRAP * 30 }, (_, i) => i / 30);
      s = { gx, dx, ts, at: ts.map((t) => bodies.map((b) => ({ id: b.id, R: b.R, p: bodyWorld(dx, b.index, t) }))) };
      sweeps.set(key, s);
    }
    return s;
  }

  /** The first `limit` bodies of P1-P3 out of the frame, or within TWELVE_MARGIN_PX of its edge, over the hour, through main.ts's camera on `shot`. */
  function crowded(shot: GalaxyShot, size: { width: number; height: number }, limit = 20): string[] {
    const { gx, dx, ts, at } = sweep(size);
    const out: string[] = [];
    for (let i = 0; i < ts.length && out.length < limit; i++) {
      const camera = shotCamera(shot, gx, dx, size, ts[i]);
      for (const b of at[i]) if (!inFrame(disc(camera, size, b.p, b.R), size, TWELVE_MARGIN_PX)) out.push(`${b.id} at ${ts[i].toFixed(2)}`);
    }
    return out;
  }

  for (const size of [PHONE, DESKTOP]) {
    it(`at ${size.width}x${size.height}, every body of the three systems is in the frame, ${TWELVE_MARGIN_PX} px clear of its edges, at every 1/30 s of the hour`, () => {
      expect(crowded(GALAXY_SHOTS.twelve, size)).toEqual([]);
    }, 120_000);
  }

  for (const size of [PHONE, DESKTOP]) {
    it(`at ${size.width}x${size.height}, rides the galaxy’s turn: P1, P2 and P3 hold their places on screen at every AMBIENT_GRID pose`, () => {
      // The stars stand still in the galaxy's frame and the camera turns with it about their centroid,
      // so the composition is the same at every ambient. Without the ride the triangle turns on screen.
      const gx = generateGalaxy(MOTE_SEED, galaxyTier(size.width, size.height), galaxyBudget(MOTE_BUDGET_DESKTOP));
      const dx = packBodyData(gx);
      const stars = ['P1', 'P2', 'P3'].map((id) => bodyIndex(gx, id));
      const at = (shot: GalaxyShot, t: number) => stars.map((r) => disc(shotCamera(shot, gx, dx, size, t), size, bodyWorld(dx, r, t), 0));
      const first = at(GALAXY_SHOTS.twelve, 0);
      for (const t of AMBIENT_GRID)
        at(GALAXY_SHOTS.twelve, t).forEach((p, i) =>
          expect(Math.hypot(p.x - first[i].x, p.y - first[i].y), `${i} at ${t}`).toBeLessThan(1e-3),
        );
      const fixed = { ...GALAXY_SHOTS.twelve, ridesTurn: false };
      const still = at(fixed, 0);
      const moved = Math.max(...at(fixed, 311).map((p, i) => Math.hypot(p.x - still[i].x, p.y - still[i].y)));
      expect(moved, 'the case is real: unridden, the triangle turns').toBeGreaterThan(50);
    });
  }

  it('on a desktop, its lineage under the band where the old landscape (82 at -105) put it in (Task 10’s shot pass)', () => {
    const lit = (shot: GalaxyShot) => ({ ...sampler.sample(local('defect', 0.9)), camera: galaxyShotKeys(shot, g) });
    const old: GalaxyShot = { ...GALAXY_SHOTS.twelve, landscape: { distance: 82, frame: 0, bearing: -105 } };
    expect(Math.min(...AMBIENT_GRID.map((t) => visibleClearance(lit(old), DESKTOP, t)))).toBeLessThan(0);
    expect(Math.min(...AMBIENT_GRID.map((t) => visibleClearance(lit(GALAXY_SHOTS.twelve), DESKTOP, t)))).toBeGreaterThanOrEqual(0);
  }, 120_000);
});

// ---- The zoom-out and the text band (the plan's test 8, re-pinned on the galaxy) ----

const spans = sectionSpans(loadStory());
const file = keyframes as unknown as KeyframeFile;
const sampler = new KeyframeSampler(file, spans);
const local = (section: string, l: number): number => {
  const span = spans.find((x) => x.id === section)!;
  return span.start + l * (span.end - span.start);
};
/** The frame the essay draws at section-local `l`, as the keyframes have it. */
const keyed = (section: string, l: number): KeyedFrame => {
  const s = sampler.sample(local(section, l));
  return { camera: s.camera, lamp: Math.round(s.net.lamp), lampAt: Math.round(s.net.lampAt), growth: s.net.growth, show: s.net.show };
};
const SIZES = [PHONE, DESKTOP] as const;
/** The least margin under the band over both screens and every AMBIENT_GRID pose. */
const margin = (f: KeyedFrame | GalaxyShot): number =>
  Math.min(...SIZES.flatMap((size) => AMBIENT_GRID.map((t) => bandClearance(f, g, data, size, t))));
/** A move section's length in screens. */
const sectionLength = (id: string): number => MOVE_SECTIONS.find(([x]) => x === id)![1];
/** stateClearance's least over both screens and every AMBIENT_GRID pose. */
const stateMargin = (s: SceneState): number => Math.min(...SIZES.flatMap((size) => AMBIENT_GRID.map((t) => stateClearance(s, size, t))));
const ACT_I = ['vibe-build', 'reveal', 'rewind', 'spec'];

describe('the zoom-out, generated and pasted', () => {
  it('regenerates to the keyframes within 1e-3: every Act II camera, ride, lamp and streams key, and the zoom-out’s growth and show', () => {
    const gen = actTwoKeys(g);
    expect(Object.keys(gen)).toEqual(expect.arrayContaining([...ZOOM_OUT_CLOCK_TRACKS]));
    for (const [path, keys] of Object.entries(gen)) {
      const section = (k: { at: number | string }) => (typeof k.at === 'string' ? k.at.split('@')[0] : '');
      // The zoom-out's clocks: its own keys only (every later section keys them by hand).
      const have = file.tracks[path].filter((k) =>
        ZOOM_OUT_CLOCK_TRACKS.includes(path) ? section(k) === 'zoom-out' : !ACT_I.includes(section(k)),
      );
      expect(
        have.map((k) => [k.at, k.ease ?? 'linear']),
        path,
      ).toEqual(keys.map((k) => [k.at, k.ease ?? 'linear']));
      // Camera keys are rounded to 1e-3 as every camera key is; the clocks are pasted exactly.
      const tolerance = ZOOM_OUT_CLOCK_TRACKS.includes(path) ? 0 : 1e-3;
      have.forEach((k, i) =>
        [k.value]
          .flat()
          .forEach((v, j) => expect(Math.abs(v - [keys[i].value].flat()[j]), `${path} ${k.at}`).toBeLessThanOrEqual(tolerance)),
      );
    }
    // Act II keys no camera key of its own past the move into ls-1, over the page turn into lesson:
    // the lesson holds it to the end.
    const last = Math.max(...file.tracks['camera.pos'].map((k) => keyProgress(k, spans)));
    const into = ACT_TWO_MOVES[ACT_TWO_MOVES.length - 1];
    expect(into.shot).toBe('ls-1');
    expect(last).toBeCloseTo(local(...into.until), 9);
  });

  it('every zoom-out sample is the shot as keyed: the target, the ride, the lamp, the streams, and the camera on its keys', () => {
    const at = trackIndex({ body: 'N0' });
    for (let i = 0; i <= 400; i++) {
      const l = i / 400;
      const s = sampler.sample(local('zoom-out', l));
      const want = zoomOutKeys(l);
      const where = `zoom-out@${l}`;
      // The lamp and its focus step on a thousandth in (actTwoKeys), where nothing is shown yet.
      if (l >= 0.001) expect([Math.round(s.net.lamp), Math.round(s.net.lampAt)], where).toEqual([want.lamp, at]);
      expect(s.net.streams, where).toBe(0);
      expect(s.camera.track.turn, where).toBeCloseTo(want.camera.track.turn, 9);
      expect(s.camera.landscape.mix, where).toBe(l >= 0.001 ? 1 : 0);
      for (const t of [0, AMBIENT_POSE, 659]) {
        const p = trackPoint(s.camera.track, g, data, t);
        const q = trackPoint(want.camera.track, g, data, t);
        expect(Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]), `${where} at ${t}`).toBeLessThan(1e-6);
      }
      // The camera, on its keys (linear between them): within 1.5 % of its distance of the generated pull.
      for (const size of SIZES) {
        const a = essayCamera(s.camera, g, data, size, AMBIENT_POSE).position;
        const b = essayCamera(want.camera, g, data, size, AMBIENT_POSE).position;
        const target = trackPoint(want.camera.track, g, data, AMBIENT_POSE);
        expect(a.distanceTo(b), `${where} ${size.width}`).toBeLessThanOrEqual(0.015 * b.distanceTo(new Vector3(...target)) + 1e-3);
      }
    }
    // ...and on a key, the generated shot itself.
    for (const l of ZOOM_OUT_KEY_LOCALS) {
      const s = sampler.sample(local('zoom-out', l));
      const want = zoomOutKeys(l).camera;
      for (const [x, y] of [
        [s.camera.pos, want.pos],
        [s.camera.target, want.target],
        [s.camera.landscape.pos, want.landscape.pos],
      ])
        x.forEach((v, k) => expect(Math.abs(v - y[k]), `zoom-out@${l}`).toBeLessThanOrEqual(6e-4));
      expect(Math.abs(s.camera.fov - want.fov)).toBeLessThanOrEqual(6e-4);
      expect(Math.abs(s.camera.frame - want.frame)).toBeLessThanOrEqual(6e-4);
    }
  });

  it('is ruling 12’s pull: S10′ to Z0 by 0.30 (fix round 1: the rise overlaps the reflow), Z0 held to 0.40, then log-linear to 640 with the target walking N0, P_a, the neighbourhood, the core', () => {
    expect(Z0).toMatchObject({ target: { body: 'N0' }, bearing: 0, elevation: 86, distance: 9, fov: 36, frame: 1 });
    expect([ZOOM_OUT.arrive, ZOOM_OUT.pullFrom]).toEqual([0.3, 0.4]);
    const z = zoomOutShot;
    expect(z(0).distance).toBeCloseTo(S10P.distance, 9);
    for (const l of [0.3, 0.35, 0.4])
      [z(l).bearing, z(l).elevation, z(l).distance, z(l).fov, z(l).frame].forEach((v, k) => expect(v).toBeCloseTo([0, 86, 9, 36, 1][k], 9));
    for (const l of [0.4, 0.55, 0.7, 0.85, 1])
      expect(Math.log(z(l).distance)).toBeCloseTo(Math.log(9) + ((l - 0.4) / 0.6) * Math.log(640 / 9), 9);
    expect(z(1)).toMatchObject({ bearing: 0, elevation: 86, fov: 40, frame: 0 });
    const walk = (l: number) => (z(l).mix < 0.5 ? z(l).a : z(l).b);
    // The walk keeps the bike's planet and its star in the frame until the arms' pieces are up round
    // them (fix round 1, ruling C): P_a by 0.60, the neighbourhood by 0.80, the core at the end.
    expect([0.3, 0.42, 0.7, 0.82, 1].map(walk)).toEqual([{ body: 'N0' }, { body: 'N0' }, { body: 'P_a' }, { hood: true }, { core: true }]);
    expect(z(0.6)).toMatchObject({ b: { body: 'P_a' }, mix: 1 });
    expect(z(0.8)).toMatchObject({ b: { hood: true }, mix: 1 });
    // Riding the galaxy's turn from Z0 on, and further off on a landscape screen: the scale to the pull,
    // then log-linear over the pull to the galaxy wide's own landscape ratio (Task 1d), so a landscape
    // screen ends on the wide as GALAXY_SHOTS.galaxyWide frames it there.
    for (const l of [0.3, 0.35, 0.4]) expect([z(l).turn, z(l).landscape]).toEqual([1, ZOOM_OUT.landscape.scale]);
    const ratio = GALAXY_SHOTS.galaxyWide.landscape!.distance / (GALAXY_SHOTS.galaxyWide.distance as number);
    for (const l of [0.55, 0.7, 0.85, 1]) {
      expect(z(l).turn).toBe(1);
      expect(Math.log(z(l).landscape)).toBeCloseTo(Math.log(ZOOM_OUT.landscape.scale) + ((l - 0.4) / 0.6) * Math.log(ratio / ZOOM_OUT.landscape.scale), 9);
    }
    expect(z(1).distance * z(1).landscape).toBeCloseTo(GALAXY_SHOTS.galaxyWide.landscape!.distance, 9);
    expect([z(0).turn, z(0).landscape]).toEqual([0, 1]);
  });

  it('starts Act II on Act I’s last shot, exactly: ACT_ONE_LAST is the keys Act I ends on', () => {
    const end = sampler.sample(spans.find((x) => x.id === 'spec')!.end);
    expect(ACT_ONE_LAST).toEqual({ pos: end.camera.pos, target: end.camera.target, fov: end.camera.fov, frame: end.camera.frame });
    for (const path of ['camera.pos', 'camera.target', 'camera.fov', 'camera.frame']) {
      const last = file.tracks[path].filter((k) => typeof k.at === 'string' && ACT_I.includes(k.at.split('@')[0])).at(-1)!;
      expect(last.value, path).toEqual(ACT_ONE_LAST[path.split('.')[1] as keyof typeof ACT_ONE_LAST]);
    }
    const first = file.tracks['camera.pos'].find((k) => k.at === 'zoom-out@0')!;
    expect(first.value).toEqual(end.camera.pos);
    expect(file.tracks['camera.target'].find((k) => k.at === 'zoom-out@0')!.value).toEqual(end.camera.target);
  });
});

describe('the text band (test 8): cylinderTop at least 8 px under it, at both sizes and every AMBIENT_GRID pose', () => {
  it('takes the moons’ lift from the generated galaxy (ruling 1): no body of it stands outside liftBound, over the turn', () => {
    const lift = liftBound(g);
    expect(lift).toBeGreaterThan(BG.dustY + 0.14);
    for (let t = 0; t < 1200; t += 37.3) {
      for (const b of g.bodies) {
        if (b.kind !== 'planet' && b.kind !== 'moon') continue;
        const star = g.bodies[b.star];
        const y = bodyWorld(data, b.index, t)[1] - bodyWorld(data, star.index, t)[1];
        expect(Math.abs(y) + b.R + BG.dustY, `${b.id} at ${t}`).toBeLessThanOrEqual(lift + 1e-9);
      }
    }
    expect(lampDisc(g, Lamp.Planet, bodyIndex(g, 'N0')).halfHeight).toBe(lift);
    // The test's own sum: each planet's apoapsis lift, plus the higher of its radius and its moons'
    // lifts with their radii, plus the dust; and the moons' term is not idle on the essay galaxy.
    const lifted = (o: { r: number; tilt: number }) => o.r * Math.abs(Math.sin(o.tilt));
    const sum = (of: Galaxy) =>
      Math.max(
        ...of.bodies
          .filter((p) => p.kind === 'planet')
          .map(
            (p) =>
              lifted(p.orbit!) +
              Math.max(p.R, ...of.bodies.filter((m) => m.host === p.index && m.kind === 'moon').map((m) => lifted(m.orbit!) + m.R)),
          ),
      ) + BG.dustY;
    expect(lift).toBeCloseTo(sum(g), 12);
    // The generator's moons lift past §12.1's 0.14 (so the constant would be wrong) ...
    expect(Math.max(...g.bodies.filter((m) => m.kind === 'moon').map((m) => lifted(m.orbit!)))).toBeGreaterThan(0.14);
    // ... though on the essay galaxy no moon sets the maximum, so a galaxy whose moon does checks the term.
    // (The most lifted planet with a moon: since Task 1e the most lifted of all has none.)
    const top = g.bodies
      .filter((p) => p.kind === 'planet' && g.bodies.some((m) => m.kind === 'moon' && m.host === p.index))
      .reduce((a, b) => (lifted(b.orbit!) > lifted(a.orbit!) ? b : a));
    const moon = g.bodies.find((m) => m.kind === 'moon' && m.host === top.index)!;
    const raised: Galaxy = {
      ...g,
      bodies: g.bodies.map((b) => (b === moon ? { ...b, orbit: { ...b.orbit!, r: 2, tilt: Math.PI / 2 } } : b)),
    };
    expect(liftBound(raised)).toBeCloseTo(sum(raised), 12);
    expect(liftBound(raised)).toBeGreaterThan(lift + 0.5);
  });

  it('at every zoom-out sample, as keyed', () => {
    let worst = Infinity;
    for (let i = 0; i <= 200; i++) worst = Math.min(worst, margin(keyed('zoom-out', i / 200)));
    expect(worst).toBeGreaterThanOrEqual(0);
  }, 120_000);

  it('each of the zoom-out’s lamp steps clears the band from its step to the end', () => {
    for (const step of ZOOM_OUT.lamp.slice(1)) {
      const opened = (l: number): KeyedFrame => ({ ...keyed('zoom-out', l), lamp: step.lamp });
      const from = (start: number) =>
        Math.min(...Array.from({ length: Math.round((1 - start) / 0.005) + 1 }, (_, i) => margin(opened(start + i * 0.005))));
      expect(from(step.at), `${Lamp[step.lamp]} at ${step.at}`).toBeGreaterThanOrEqual(0);
    }
    expect(ZOOM_OUT.lamp.map((s) => s.lamp)).toEqual([Lamp.Planet, Lamp.Arms, Lamp.Hood, Lamp.Off]);
  }, 300_000);

  it('the galaxy wide clears it from §14.5’s 640, the lit set its bodies (the background is the sky)', () => {
    expect(margin(GALAXY_SHOTS.galaxyWide)).toBeGreaterThanOrEqual(0);
  });

  it('is not vacuous: nothing lit is Infinity, and a lit set off the top fails', () => {
    expect(cylinderTop({ ...keyed('zoom-out', 0.1), show: 0 }, g, data, PHONE)).toBe(Infinity);
    expect(bandClearance({ ...keyed('zoom-out', 0.45), lamp: Lamp.Hood }, g, data, PHONE)).toBeLessThan(0);
  });

  it('counts each drawn sprite’s half-extent (review M6): every lit star’s and core body’s glow, a star’s spike tips, and the rim’s motes and points', () => {
    // The glows: never higher than cylinderTop, at the zoom-out's lamp steps and its end and at the
    // later sections' wides. (Measured: the cylinder's lift, liftBound above and below each disc, always
    // stands higher than a glow's half, at most GLOW_CAP.core / 2, so this half never binds today;
    // it is held so that it cannot be dropped once a lit set's disc is flatter than its glow.)
    const frames = [...ZOOM_OUT.lamp.slice(1).map((s) => keyed('zoom-out', s.at)), keyed('zoom-out', 1), keyed('layers', 0.5), keyed('far', 0.5), keyed('spread', 0.82), keyed('reviewer', 0.5), keyed('fix', 0.81), keyed('lesson', 0.5)];
    // How many lit stars' spike tips stand above their glows: the spikes' term is not vacuous.
    let tipsBind = 0;
    for (const frame of frames) {
      for (const size of SIZES) {
        const camera = essayCamera(frame.camera, g, data, size, AMBIENT_POSE);
        camera.updateMatrixWorld();
        const eye = camera.getWorldPosition(new Vector3());
        const focal = 0.5 * size.height * camera.projectionMatrix.elements[5];
        const top = cylinderTop(frame, g, data, size);
        const lit = (b: Body) => (b.kind === 'star' || b.kind === 'core') && b.born - NODE_BIRTH_WINDOW <= (frame.growth ?? 1);
        for (const b of g.bodies.filter(lit)) {
          if (lampGain(b.index, { lamp: frame.lamp, lampRow: lampFocusRow(frame.lampAt, g), focus: 0 }, data) <= 0) continue;
          const w = new Vector3(...bodyWorld(data, b.index, AMBIENT_POSE));
          const d = w.distanceTo(eye);
          const q = w.project(camera);
          const glow = glowPx(b.R, d, focal, b.kind === 'core' ? GLOW_CAP.core : GLOW_CAP.star);
          // A star's top: its glow's half, or its highest drawn spike row's tip if that stands higher.
          const near = glowPx(b.R, d, focal, Infinity);
          let half = 0.5 * glow;
          if (b.look) {
            let tip = 0;
            if (glow > 6 && starSpikeShare(b.look, near) > 0)
              for (let row = 0; row < b.look.spikes; row++) tip = Math.max(tip, Math.abs(starSpike(b.look, row, 15, glow, near).offPx[1]));
            half = Math.max(half, tip);
            if (tip > 0.5 * glow) tipsBind++;
            // The e2e twin (galaxyOnScreen.ts) puts the same star's top within half a pixel.
            const twin = galaxyPointTop({ pos: bodyWorld(data, b.index, AMBIENT_POSE), glow: { R: b.R, cap: GLOW_CAP.star, look: b.look } }, defaultSceneState(), camera, eye, focal, size.width, size.height);
            if (twin) expect(Math.abs(twin.top - (((1 - q.y) / 2) * size.height - half)), `${b.id} twin`).toBeLessThan(0.5);
            expect(half).toBe(starTopPx(b.look, glow, near));
            // cylinderTop's own star term is this top.
            expect(spriteHalfTop(b, glow, near)).toBeCloseTo(half, 12);
          }
          expect(top, `${b.id} ${size.width}`).toBeLessThanOrEqual(((1 - q.y) / 2) * size.height - half + 1e-9);
        }
      }
    }
    expect(tipsBind).toBeGreaterThan(0);
    // The rim's sprites: a lit set seen from afar still stands a lit planet's largest point higher than its rim.
    const far = keyed('zoom-out', 1);
    expect(cylinderTop(far, g, data, PHONE)).toBeLessThan(rimTop(far, g, PHONE) - BODY_LOOK.litPointMax / 2 + 1e-9);
  });
});

/** cylinderTop's rim alone (no sprite): the highest screen y of the lit set's cylinder rims. */
function rimTop(f: KeyedFrame, gx: Galaxy, size: { width: number; height: number }): number {
  const camera = essayCamera(f.camera, gx, data, size, AMBIENT_POSE);
  camera.updateMatrixWorld();
  let top = Infinity;
  for (const disc of litDiscs(gx, f.lamp, lampFocusRow(f.lampAt, gx), f.growth ?? 1)) {
    const c = targetWorld(disc.centre, gx, data, AMBIENT_POSE);
    for (let k = 0; k < RIM_BEARINGS; k++) {
      const a = (2 * Math.PI * k) / RIM_BEARINGS;
      for (const y of [disc.halfHeight, -disc.halfHeight]) {
        const q = new Vector3(c[0] + disc.radius * Math.cos(a), c[1] + y, c[2] + disc.radius * Math.sin(a)).project(camera);
        top = Math.min(top, ((1 - q.y) / 2) * size.height);
      }
    }
  }
  return top;
}

describe('B1 and B2 are born in frame', () => {
  it('as growth reaches each one’s birth and its build’s end (under layers), it is on screen under the text at both sizes and every pose', () => {
    for (const id of ['B1', 'B2']) {
      const b = g.bodies[bodyIndex(g, id)];
      for (const growth of [b.born, b.born + b.dur]) {
        // The first layers-local at which the growth clock reaches it.
        let [lo, hi] = [0, 1];
        while (hi - lo > 1e-7) {
          const mid = (lo + hi) / 2;
          if (sampler.sample(local('layers', mid)).net.growth >= growth) hi = mid;
          else lo = mid;
        }
        const f = keyed('layers', hi);
        for (const size of SIZES) {
          for (const t of AMBIENT_GRID) {
            const camera = essayCamera(f.camera, g, data, size, t);
            const p = new Vector3(...bodyWorld(data, b.index, t)).project(camera);
            const [x, y] = [(p.x + 1) / 2, (1 - p.y) / 2];
            expect(x, `${id} at growth ${growth}, ${size.width}, ${t}`).toBeGreaterThan(0);
            expect(x).toBeLessThan(1);
            expect(y * size.height).toBeGreaterThan(TEXT_BAND * size.height + BAND_MARGIN_PX);
            expect(y).toBeLessThan(1);
          }
        }
      }
    }
  });
});

// ---- Layers and far (galaxy §14.5; the plan's Task 9: test 8 re-pinned on the new shots) ----

const story = loadStory();
/** A section-local place as global progress. */
const placeProgress = (at: SectionAt): number => local(at[0], at[1]);
/** The frame the essay draws at a place, as the keyframes have it. */
const keyedAt = (at: SectionAt): KeyedFrame => keyed(at[0], at[1]);
/**
 * Where a lamp step is fitted (the fitting helper the lamp steps were placed by, kept so a refit is
 * cheap): the first thousandth of its section from `from` from which `level` clears the band (margin,
 * cylinderTop's measure) at every thousandth to `until`; null if it does not clear at `until` itself.
 */
function firstClearing(from: SectionAt, until: SectionAt, level: Pick<KeyedFrame, 'lamp' | 'lampAt'>): SectionAt | null {
  const places: SectionAt[] = [];
  for (let at: SectionAt = from; screensOf(at) < screensOf(until) - 1e-9; at = placeOf(screensOf(at) + 0.001 * sectionLength(at[0]))) places.push(at);
  places.push(until);
  let i = places.length;
  while (i > 0 && margin({ ...keyedAt(places[i - 1]), lamp: level.lamp, lampAt: level.lampAt }) >= 0) i--;
  return i < places.length ? places[i] : null;
}
const placesBetween = (a: SectionAt, b: SectionAt, n: number): SectionAt[] => {
  const [pa, pb] = [placeProgress(a), placeProgress(b)];
  return Array.from({ length: n + 1 }, (_, i) => {
    const p = pa + ((pb - pa) * i) / n;
    const span = spans.find((x) => p >= x.start - 1e-12 && p <= x.end + 1e-12)!;
    return [span.id, (p - span.start) / (span.end - span.start)] as const;
  });
};
/**
 * Every hold after the zoom-out: from the move that lands on a shot to the move that leaves it, and
 * the last, ls-1, which lesson holds to the essay's end.
 */
const HOLDS = ACT_TWO_MOVES.map((move, i) => ({ shot: move.shot, from: move.until, until: ACT_TWO_MOVES[i + 1]?.from ?? (['lesson', 1] as SectionAt) }));
/** The shot a hold holds. */
const heldShot = (name: (typeof HOLDS)[number]['shot']): GalaxyShot =>
  name === 'tr-2 surge'
      ? LATE_SHOTS['tr-1']
      : name === 'fx-2 pan'
        ? FX2_PAN
      : name in LATE_SHOTS
        ? LATE_SHOTS[name as keyof typeof LATE_SHOTS]
        : name === 'ly-4 ride'
      ? LY4_RIDE.to
      : name === 'ly-4 close'
        ? LY4_CLOSE.shot
      : name === 'fr-1'
        ? FAR_SHOT
        : name in DEFECT_SHOTS
          ? DEFECT_SHOTS[name as keyof typeof DEFECT_SHOTS]
          : LAYERS_SHOTS[name as keyof typeof LAYERS_SHOTS];
/** §14.5's beats each layers and far shot holds under. */
const BEATS_OF: Record<string, string[]> = { 'ly-1': ['ly-1'], 'ly-2': ['ly-2'], 'ly-3': ['ly-3'], 'ly-4': ['ly-4'], 'ly-5': ['ly-5'], 'fr-1': ['fr-1'] };
const up = (growth: number) => (b: Body) => b.born - NODE_BIRTH_WINDOW <= growth;
/** What a layers shot is about, of what is built by `growth`: the bodies that must stay whole in the frame. */
function subjectOf(name: Exclude<keyof typeof LAYERS_SHOTS, 'ly-4'>, growth: number): Body[] {
  const pa = bodyIndex(g, 'P_a');
  const all = g.bodies.filter(up(growth));
  if (name === 'ly-1' || name === 'ly-5') return all.filter((b) => b.index === pa || b.star === pa);
  if (name === 'ly-2') return all.filter((b) => b.kind === 'core');
  return all.filter((b) => b.kind === 'core' || b.kind === 'star');
}
/** The growth at the end of a shot's hold: the most it holds built. */
const holdGrowth = (name: string): number => keyedAt(HOLDS.find((h) => h.shot === name)!.until).growth!;
/** The least CSS px a body of `subject` keeps inside the screen's edges, its whole disc, every 4 s of the hour (stops early once one is out). */
function wholeInFrame(shot: GalaxyShot, size: { width: number; height: number }, subject: Body[]): number {
  let worst = Infinity;
  for (let t = 0; t < AMBIENT_WRAP && worst >= 0; t += 4) {
    const camera = galaxyShotCamera(shot, g, data, size, t);
    for (const b of subject) {
      const c = disc(camera, size, bodyWorld(data, b.index, t), b.R);
      worst = Math.min(worst, c.x - c.r, size.width - c.x - c.r, c.y - c.r, size.height - c.y - c.r);
    }
  }
  return worst;
}
/** The least band margin of a shot over every AMBIENT_GRID pose on one screen, with what is built by `growth`. */
const shotMargin = (shot: GalaxyShot, size: { width: number; height: number }, growth: number): number => {
  const frame = { ...shotFrame(shot, g), growth };
  return Math.min(...AMBIENT_GRID.map((t) => bandClearance(frame, g, data, size, t)));
};

describe('the layers and far shots (galaxy §14.5, Task 9)', () => {
  it('keep §14.5’s target, bearing, elevation, field and lamp, save ly-3 and ly-4 (fix round 1)', () => {
    const tuple = (s: GalaxyShot) => [s.target, s.bearing, s.elevation, s.fov, s.lamp];
    expect(Object.fromEntries(Object.entries(LAYERS_SHOTS).map(([k, s]) => [k, tuple(s)]))).toEqual({
      'ly-1': [{ body: 'P_a' }, 20, 60, 38, Lamp.Star],
      'ly-2': [{ core: true }, 30, 64, 40, Lamp.Core],
      // Re-framed (fix round 1): on the core, overhead, from the side the stars lie on.
      'ly-3': [{ core: true }, 42, 82, 40, Lamp.Hood],
      // Re-keyed (fix round 1): the ride out along N0's arm, from P_a, every system lit, the core dark.
      // Re-aimed (Task 1d): the ride to star-4 lies the other way round P_a now, so bearing 38 (was -126).
      'ly-4': [{ body: 'P_a' }, 38, 66, 40, Lamp.Arms],
      'ly-5': [{ body: 'P_a' }, -10, 72, 40, Lamp.Star],
    });
    expect(LY4_RIDE.to).toEqual({ ...LAYERS_SHOTS['ly-4'], target: { body: 'star-4' } });
    expect(tuple(FAR_SHOT)).toEqual([{ core: true }, 0, 86, 40, Lamp.Off]);
    expect([FAR_SHOT.distance, FAR_SHOT.frame, FAR_ORBIT.bearing, FAR_ORBIT.keys]).toEqual([640, 0, 40, 12]);
    for (const s of [...Object.values(LAYERS_SHOTS), FAR_SHOT]) expect(s.ridesTurn).toBe(true);
  });

  it('change §14.5’s distance and frame only as the band makes them (every one of §14.5’s own fails it on both screens)', () => {
    // §14.5: ly-1 and ly-5 at 2.7 times P_a's system, ly-2 30, ly-3 120, ly-4 9; frame 0.
    const brief: Record<keyof typeof LAYERS_SHOTS, number | { outerTimes: number }> = {
      'ly-1': { outerTimes: 2.7 },
      'ly-2': 30,
      'ly-3': 120,
      'ly-4': 9,
      'ly-5': { outerTimes: 2.7 },
    };
    for (const [name, shot] of Object.entries(LAYERS_SHOTS).filter(([k]) => k !== 'ly-3' && k !== 'ly-4') as [keyof typeof LAYERS_SHOTS, GalaxyShot][]) {
      const asBrief: GalaxyShot = { ...shot, distance: brief[name], frame: 0, landscape: undefined };
      for (const size of SIZES) expect(shotMargin(asBrief, size, holdGrowth(name)), `${name} at §14.5's values, ${size.width}`).toBeLessThan(0);
    }
    expect(Object.fromEntries(Object.entries(LAYERS_SHOTS).map(([k, s]) => [k, [s.distance, s.frame, s.landscape]]))).toEqual({
      'ly-1': [{ outerTimes: 3.31 }, 0.28, { distance: 66, frame: 0 }],
      'ly-2': [30, 0.39, { distance: 62, frame: 0 }],
      // Task 1d re-fitted ly-3 (191 / 273 before) and ly-4 (108 at -126 before) to the wider neighbourhood.
      'ly-3': [234, 0, { distance: 486, frame: 0 }],
      'ly-4': [130, 0.29, { distance: 212, frame: 0 }],
      'ly-5': [{ outerTimes: 3.11 }, 0.41, { distance: 66, frame: 0 }],
    });
  });

  for (const name of Object.keys(LAYERS_SHOTS).filter((k) => k !== 'ly-4') as Exclude<keyof typeof LAYERS_SHOTS, 'ly-4'>[]) {
    it(`${name}: clears the band at both sizes and keeps its subject whole in the frame over the hour`, () => {
      const shot: GalaxyShot = LAYERS_SHOTS[name];
      const growth = holdGrowth(name);
      const subject = subjectOf(name, growth);
      expect(subject.length, 'the subject is built').toBeGreaterThan(0);
      // The phone: it clears and keeps its subject whole...
      expect(shotMargin(shot, PHONE, growth)).toBeGreaterThanOrEqual(0);
      expect(wholeInFrame(shot, PHONE, subject)).toBeGreaterThanOrEqual(0);
      // The landscape screen: it clears, its subject whole too.
      expect(shotMargin(shot, DESKTOP, growth)).toBeGreaterThanOrEqual(0);
      expect(wholeInFrame(shot, DESKTOP, subject)).toBeGreaterThanOrEqual(0);
    }, 300_000);
  }
});

describe('ly-4 rides out along N0’s arm (fix round 1)', () => {
  const A = trackIndex({ body: 'P_a' });
  const B = trackIndex({ body: 'star-4' });
  const [ra, rb] = [placeProgress(LY4_RIDE.from), placeProgress(LY4_RIDE.until)];
  /** The ride at `x` (0..1) of its scroll on `shot` (target P_a), as the keys carry it: the tracked point eased from P_a to star-4, Arms, the growth keyed there. */
  const rideAt = (shot: GalaxyShot, x: number): KeyedFrame => {
    const growth = sampler.sample(ra + (rb - ra) * x).net.growth;
    const u = moveShares({ motion: 'ride' }, poseOf(shot, g), poseOf(shot, g), x).pan;
    return { camera: { ...galaxyShotKeys(shot, g), track: { a: A, b: B, mix: u, turn: 1 } }, lamp: Lamp.Arms, lampAt: A, growth };
  };
  const rideMargin = (shot: GalaxyShot, size: { width: number; height: number }) =>
    Math.min(...Array.from({ length: 41 }, (_, i) => i / 40).flatMap((x) => AMBIENT_GRID.map((t) => bandClearance(rideAt(shot, x), g, data, size, t))));
  /** The built systems by `growth`. */
  const builtBy = (growth: number) => g.systems.map((i) => g.bodies[i]).filter((b) => b.born <= growth);

  it('rides to the nearest system out from P_a with code born under the beat (Task 1d)', () => {
    // "Out at the edge, the code, written from the plans": the beat's truth is code being born in view
    // (the hold after the push-in shows it landed beside its star: the test after this one).
    // Of the filler systems (no plan's) built by ly-4's end that lie outward of P_a (a greater galactic
    // radius), nearest P_a first, star-4 is the first with a planet born during the ride; the nearer
    // three have none (the wider neighbourhood moved star-4 round P_a, so the ride now runs the other
    // way, bearing 38). The window is the ride's own (fix round 1): with planet-10 brought forward,
    // star-5's planet-11 begins landing at 3.45, in the hold on star-4, before ly-4's page leaves.
    const [g0, end] = [keyedAt(LY4_RIDE.from).growth!, keyedAt(LY4_RIDE.until).growth!];
    const pa = g.bodies[bodyIndex(g, 'P_a')];
    const radius = (b: Body) => Math.hypot(b.spot![0], b.spot![2]);
    const fromPa = (b: Body) => Math.hypot(b.spot![0] - pa.spot![0], b.spot![2] - pa.spot![2]);
    const births = (b: Body) => g.bodies.filter((p) => p.kind === 'planet' && p.host === b.index && p.born > g0 && p.born <= end);
    const out = builtBy(end)
      .filter((b) => b.id.startsWith('star-') && radius(b) > radius(pa))
      .sort((a, b) => fromPa(a) - fromPa(b));
    const target = out.find((b) => births(b).length > 0)!;
    expect(target.id).toBe('star-4');
    expect(out.slice(0, out.indexOf(target)).map((b) => b.id)).toEqual(['star-1', 'star-5', 'star-2']);
    // Each planet born then is in the frame and under the band on the ride's end shot too, at both sizes
    // and every AMBIENT_GRID pose (a few px there; the push-in brings it to 4).
    for (const p of births(target))
      for (const size of SIZES)
        for (const t of AMBIENT_GRID) {
          const c = disc(galaxyShotCamera(LY4_RIDE.to, g, data, size, t), size, bodyWorld(data, p.index, t), p.R);
          expect(inFrame(c, size), `${p.id} at ${size.width}, ${t}`).toBe(true);
          expect(c.y - c.r, `${p.id} under the band at ${size.width}, ${t}`).toBeGreaterThan(TEXT_BAND * size.height + BAND_MARGIN_PX);
        }
  });

  it('lands planet-10 beside star-4 while the camera holds on it: at least half landed, at least 4 px across, in the frame and under the band, at both sizes and every AMBIENT_GRID pose (fix round 1)', () => {
    // The hold after the push-in, to ly-5's move: layers' growth is keyed so planet-10 (born 0.2063, DUR
    // 0.012) is half landed as the push-in ends (0.2125 at layers 3.4), and the push-in stands close
    // enough (66, 138 on a landscape screen) that it is 4 px across beside its star.
    const p10 = g.bodies[bodyIndex(g, 'planet-10')];
    expect(g.bodies[p10.host].id).toBe('star-4');
    const ly5 = ACT_TWO_MOVES.find((m) => m.shot === 'ly-5')!;
    let checked = 0;
    for (const at of placesBetween(LY4_CLOSE.until, ly5.from, 10)) {
      const s = sampler.sample(placeProgress(at));
      const where = at.join('@');
      expect((s.net.growth - p10.born) / p10.dur, `${where}: planet-10 landed`).toBeGreaterThanOrEqual(0.5);
      expect([Math.round(s.net.lamp), Math.round(s.net.lampAt)], `${where}: the lamp on star-4's system`).toEqual([Lamp.Star, trackIndex({ body: 'star-4' })]);
      for (const size of SIZES)
        for (const t of AMBIENT_GRID) {
          const camera = essayCamera(s.camera, g, data, size, t);
          camera.updateMatrixWorld();
          const c = disc(camera, size, bodyWorld(data, p10.index, t), p10.R);
          expect(2 * c.r, `${where}: planet-10 across at ${size.width}, ${t}`).toBeGreaterThanOrEqual(4);
          expect(inFrame(c, size), `${where}: planet-10 in the frame at ${size.width}, ${t}`).toBe(true);
          expect(c.y - c.r, `${where}: planet-10 under the band at ${size.width}, ${t}`).toBeGreaterThan(TEXT_BAND * size.height + BAND_MARGIN_PX);
          checked++;
        }
    }
    expect(checked).toBe(11 * SIZES.length * AMBIENT_GRID.length);
  });

  it('shows at least three systems of at least 16 px at the keyed ride’s middle, under Arms, at both sizes (fix round 1)', () => {
    const mid = placesBetween(LY4_RIDE.from, LY4_RIDE.until, 2)[1];
    const s = sampler.sample(placeProgress(mid));
    expect(Math.round(s.net.lamp)).toBe(Lamp.Arms);
    for (const size of SIZES) {
      const camera = essayCamera(s.camera, g, data, size, AMBIENT_POSE);
      camera.updateMatrixWorld();
      const inView = builtBy(s.net.growth).filter((b) => {
        const c = disc(camera, size, bodyWorld(data, b.index, AMBIENT_POSE), systemOuter(g, b.index));
        return c.x >= 0 && c.x <= size.width && c.y >= TEXT_BAND * size.height && c.y <= size.height && c.r >= 16;
      });
      expect(inView.length, `systems in view at ${size.width}`).toBeGreaterThanOrEqual(3);
    }
  });

  it('is keyed as the ride: from P_a at ly-4’s full ink to star-4 before its stop, Arms throughout', () => {
    // It ends at 3.3, where the push-in on star-4 takes over (fix round 1; 3.4 before).
    expect([LY4_RIDE.from, LY4_RIDE.until]).toEqual([layersAt(2.9), layersAt(3.3)]);
    for (const x of [0, 0.25, 0.5, 0.75, 1]) {
      const at: SectionAt = layersAt(2.9 + 0.4 * x);
      const k = keyedAt(at);
      const want = rideAt(LAYERS_SHOTS['ly-4'], x);
      for (const t of [0, AMBIENT_POSE]) {
        const p = trackPoint(k.camera.track, g, data, t);
        const q = trackPoint(want.camera.track, g, data, t);
        expect(Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]), at.join('@')).toBeLessThan(1e-4);
      }
      expect(k.lamp).toBe(Lamp.Arms);
    }
  });

  it('clears the band over the whole ride at both sizes', () => {
    const shot: GalaxyShot = LAYERS_SHOTS['ly-4'];
    expect(rideMargin(shot, PHONE)).toBeGreaterThanOrEqual(0);
    expect(rideMargin(shot, DESKTOP)).toBeGreaterThanOrEqual(0);
  }, 300_000);

  it('shows many systems on a phone, their planets points, and pans outward left to right', () => {
    const shot: GalaxyShot = LAYERS_SHOTS['ly-4'];
    for (const x of [0, 0.5, 1]) {
      const f = rideAt(shot, x);
      const camera = essayCamera(f.camera, g, data, PHONE, AMBIENT_POSE);
      const inView = builtBy(f.growth!).filter((b) => {
        const c = disc(camera, PHONE, bodyWorld(data, b.index, AMBIENT_POSE), 0);
        return c.x >= 0 && c.x <= PHONE.width && c.y >= TEXT_BAND * PHONE.height && c.y <= PHONE.height;
      });
      // At least three, each at least 16 px of system radius (Task 1d: four of at least 20 px before it;
      // a composition proxy the author's wider spacing relaxed).
      expect(inView.length, `systems in view at ${x}`).toBeGreaterThanOrEqual(3);
      for (const b of inView) {
        const r = disc(camera, PHONE, bodyWorld(data, b.index, AMBIENT_POSE), systemOuter(g, b.index)).r;
        expect(r, `${b.id} at ${x}`).toBeGreaterThanOrEqual(16);
      }
    }
    const start = essayCamera(rideAt(shot, 0).camera, g, data, PHONE, AMBIENT_POSE);
    const at = (id: string) => disc(start, PHONE, bodyWorld(data, bodyIndex(g, id), AMBIENT_POSE), 0).x;
    expect(at('star-4')).toBeGreaterThan(at('P_a') + 150);
  });

  it('keeps the ride’s two end systems whole in the frame over the hour on a phone: P_a’s at its start, star-4’s at its end', () => {
    // Each star with its planets and moons built by then, every 4 s of the hour (wholeInFrame).
    const system = (id: string, growth: number) => {
      const star = bodyIndex(g, id);
      return g.bodies.filter(up(growth)).filter((b) => b.star === star);
    };
    const [start, end] = [rideAt(LAYERS_SHOTS['ly-4'], 0).growth!, rideAt(LAYERS_SHOTS['ly-4'], 1).growth!];
    expect(system('P_a', start).length).toBeGreaterThan(1);
    expect(system('star-4', end).length).toBeGreaterThan(1);
    expect(wholeInFrame(LAYERS_SHOTS['ly-4'], PHONE, system('P_a', start)), 'P_a at the start').toBeGreaterThanOrEqual(0);
    expect(wholeInFrame(LY4_RIDE.to, PHONE, system('star-4', end)), 'star-4 at the end').toBeGreaterThanOrEqual(0);
  });
});

describe('layers and far, as keyed (test 8 for the new shots; galaxy §14.5, §15.1)', () => {
  it('times every move on a page turn: from where the page before starts to fade to where the next is full ink', () => {
    // The lengths the moves are placed by are the story's.
    for (const [id, length] of MOVE_SECTIONS) expect(story.find((x) => x.id === id)!.length, id).toBe(length);
    // Each page that a layers or far shot lands on: its section and where it comes up.
    const pagesOf = (id: string) => story.find((x) => x.id === id)!.pages.map((p) => ({ id, at: p.beats[0].at }));
    const pages = [...pagesOf('layers'), ...pagesOf('far'), pagesOf('defect')[0]];
    const turns = pages.map((p, i) => {
      const fade = fadeWidth(story.find((x) => x.id === p.id)!.length);
      const prev = pages[i - 1];
      return { from: i === 0 ? null : prev.id === p.id ? [p.id, p.at - fade] : [prev.id, 1 - fadeWidth(story.find((x) => x.id === prev.id)!.length)], until: [p.id, p.at + fade] };
    });
    // Five layers pages, far's one, defect's first: seven turns, seven moves, to the dive into defect
    // (the defect's and spread's moves are timed below, Task 10).
    // ly-4's ride is a move under its line, not on a turn (fix round 1): the rest ride the turns.
    // So is its push-in on star-4 (Task 1d fix round 1).
    const onTurns = ACT_TWO_MOVES.slice(0, ACT_TWO_MOVES.indexOf(NET_MOVES.dive) + 1).filter((m) => m.shot !== 'ly-4 ride' && m.shot !== 'ly-4 close');
    expect(turns).toHaveLength(onTurns.length);
    onTurns.forEach((move, i) => {
      expect(move.until[0]).toBe(turns[i].until[0]);
      expect(move.until[1], move.shot).toBeCloseTo(turns[i].until[1] as number, 7);
      if (i === 0) expect(move.from).toEqual(['layers', 0.001]);
      else {
        expect(move.from[0]).toBe(turns[i].from![0]);
        expect(move.from[1], move.shot).toBeCloseTo(turns[i].from![1] as number, 7);
      }
    });
    // fr-1's turn runs from its full ink to before its stop (test 6 holds the stop at rest).
    expect(FAR_ORBIT.from).toEqual(['far', fadeWidth(1.6)]);
    expect(FAR_ORBIT.until[1]).toBeLessThan(1 - fadeWidth(1.6));
  });

  it('holds each shot at every sample of its hold: its keys, its tracked target, its lamp, ridden', () => {
    let checked = 0;
    for (const hold of HOLDS) {
      // To the move that leaves it, not at it: a lamp may step on the move's first thousandth.
      for (const at of placesBetween(hold.from, hold.until, 40).slice(0, -1)) {
        const k = keyedAt(at);
        const want = actTwoFrame(at, g);
        const where = `${hold.shot} at ${at.join('@')}`;
        if (hold.shot !== 'fr-1') {
          const shot = heldShot(hold.shot);
          const keys = poseCamera(poseOf(shot, g));
          for (const [x, y] of [
            [k.camera.pos, keys.pos],
            [k.camera.target, keys.target],
            [k.camera.landscape.pos, keys.landscape.pos],
          ])
            x.forEach((v, i) => expect(Math.abs(v - y[i]), where).toBeLessThanOrEqual(6e-4));
          // To 1e-6: a hold starts at its move's end, which layers and spread give in screens (layersAt,
          // spreadAt), while the keys are written at their places to 1e-8 of their section.
          [k.camera.fov, k.camera.frame, k.camera.landscape.frame].forEach((v, i) =>
            expect(v, where).toBeCloseTo([shot.fov, shot.frame, shot.landscape?.frame ?? shot.frame][i], 6),
          );
          // The ride keeps ly-4's lamp and focus (Arms tests none).
          expect([k.lamp, k.lampAt], where).toEqual([shot.lamp, hold.shot === 'ly-4 ride' ? trackIndex(LAYERS_SHOTS['ly-4'].target) : galaxyShotLampAt(shot)]);
        } else {
          expect([k.lamp, k.lampAt], where).toEqual([Lamp.Off, trackIndex({ core: true })]);
        }
        expect(k.camera.track.turn, where).toBe(1);
        expect(k.camera.landscape.mix, where).toBe(1);
        for (const t of [0, AMBIENT_POSE]) {
          const p = trackPoint(k.camera.track, g, data, t);
          const q = trackPoint({ a: want.a, b: want.b, mix: want.u, turn: 1 }, g, data, t);
          expect(Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]), where).toBeLessThan(1e-9);
        }
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(200);
  });

  it('turns fr-1 overhead from bearing 0 to 40 under its line, on the core, at the galaxy wide', () => {
    const bearingAt = (at: SectionAt) => actTwoFrame(at, g).pose.bearing;
    expect(bearingAt(FAR_ORBIT.from)).toBeCloseTo(0, 9);
    expect(bearingAt(FAR_ORBIT.until)).toBeCloseTo(40, 9);
    expect(bearingAt(['far', 0.5])).toBeGreaterThan(5);
    expect(bearingAt(['far', 0.5])).toBeLessThan(35);
    for (const at of placesBetween(FAR_ORBIT.from, FAR_ORBIT.until, 60)) {
      const k = keyedAt(at);
      const want = actTwoFrame(at, g);
      const keys = poseCamera(want.pose);
      // Linear between its twelve keys: the chord of the turn sags a thousandth of the distance at most.
      k.camera.pos.forEach((v, i) => expect(Math.abs(v - keys.pos[i]), at.join('@')).toBeLessThanOrEqual((1e-3 * 640) / bike.whole.radius));
      expect([want.pose.distance, want.pose.elevation]).toEqual([640, 86]);
      const p = trackPoint(k.camera.track, g, data, AMBIENT_POSE);
      const core = trackTargetWorld(trackIndex({ core: true }), g, data, AMBIENT_POSE);
      expect(Math.hypot(p[0] - core[0], p[1] - core[1], p[2] - core[2]), at.join('@')).toBeLessThan(1e-9);
    }
  });

  it('keys every move on the path it is generated from: the tracked point to 1e-4, the camera within 1.5 % of its distance', () => {
    for (const move of ACT_TWO_MOVES) {
      for (const at of placesBetween(move.from, move.until, 80)) {
        const k = keyedAt(at);
        const want = actTwoFrame(at, g);
        const track = { a: want.a, b: want.b, mix: want.u, turn: 1 };
        const where = `${move.shot} at ${at.join('@')}`;
        for (const t of [0, AMBIENT_POSE]) {
          const p = trackPoint(k.camera.track, g, data, t);
          const q = trackPoint(track, g, data, t);
          // To the keys' places, written to 1e-8 of their section: on a move a few tenths of a screen
          // long the mix runs at up to about 12 a screen, so a place off by 1e-8 of a 4.8-screen section
          // moves the tracked point by about 2e-5 of the 40 units between the core and the neighbourhood.
          expect(Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]), where).toBeLessThan(1e-4);
        }
        for (const size of SIZES) {
          const a = essayCamera(k.camera, g, data, size, AMBIENT_POSE).position;
          const b = essayCamera({ ...poseCamera(want.pose), track }, g, data, size, AMBIENT_POSE).position;
          const target = trackPoint(track, g, data, AMBIENT_POSE);
          expect(a.distanceTo(b), `${where} ${size.width}`).toBeLessThanOrEqual(0.015 * b.distanceTo(new Vector3(...target)) + 1e-3);
        }
        // The lamp, but not on the instant it steps, where the two sides' rounding of the place differ.
        const steps = [move.lamp, ...(move.via ? [move.via.at] : [])];
        if (steps.every((st) => Math.abs(placeProgress(at) - placeProgress(st)) > 1e-9)) expect([k.lamp, k.lampAt], where).toEqual([want.lamp, want.lampAt]);
      }
    }
  });

  it('keeps the lit set under the band at every sample of layers and far, holds and moves, at both sizes and every AMBIENT_GRID pose', () => {
    // To the dive into defect, whose close lamp is held to its visible bodies (below, Task 10).
    let worst = Infinity;
    let checked = 0;
    for (const at of placesBetween(['layers', 0], NET_MOVES.dive.from, 2000)) {
      worst = Math.min(worst, margin(keyedAt(at)));
      checked++;
    }
    expect(checked).toBe(2001);
    expect(worst).toBeGreaterThanOrEqual(0);
  }, 300_000);

  it('keeps it under the band from each lamp step of layers and far (and each via) to its move’s end, at every ten-thousandth for a hundredth after the step and every thousandth after that', () => {
    // The steps clear by fractions of a px (0.25-0.64 when fitted), and the sweep above samples every
    // 0.0034 screens, not on them: this samples each step itself and densely after it.
    const moves = ACT_TWO_MOVES.slice(0, ACT_TWO_MOVES.indexOf(NET_MOVES.dive));
    let checked = 0;
    for (const move of moves)
      for (const step of [move.lamp, ...(move.via ? [move.via.at] : [])]) {
        const end = screensOf(move.until);
        const len = sectionLength(step[0]);
        let worst = { margin: Infinity, at: '' };
        for (let s = screensOf(step), k = 0; s <= end + 1e-9; s += (k++ < 100 ? 0.0001 : 0.001) * len) {
          const at = placeOf(s);
          const m = margin(keyedAt(at));
          if (m < worst.margin) worst = { margin: m, at: at.join('@') };
          checked++;
        }
        // And the step stands at or after the first thousandth from which its level clears to where the
        // next level takes over (firstClearing, the fitting helper): a failure names where a refit puts it.
        const level = step === move.lamp ? keyedAt(move.until) : { lamp: move.via!.lamp, lampAt: trackIndex(move.via!.on) };
        const until = step === move.lamp ? move.until : move.lamp;
        const first = firstClearing(move.from, until, level);
        const where = `${move.shot}: from ${step.join('@')}, ${worst.margin.toFixed(2)} px at ${worst.at}; its level first clears to ${until.join('@')} from ${first?.join('@') ?? 'nowhere'}`;
        expect(worst.margin, where).toBeGreaterThanOrEqual(0);
        // (Within a thousandth: the steps were fitted on their section's thousandths, before the cut of
        // ly-6 moved layers' places off them.)
        expect(first !== null && screensOf(step) > screensOf(first) - 0.001 * sectionLength(first[0]), where).toBe(true);
      }
    // 954 measured since Task 1d took ly-4's and ly-5's vias away (each step's own samples went with
    // them; over 1000 before).
    expect(checked).toBeGreaterThan(900);
  });

  it('passes through a narrower set (a star’s system, a piece) only where no one step clears', () => {
    const vias = ACT_TWO_MOVES.filter((m) => m.via);
    // ly-4's and ly-5's went with Task 1d's re-aimed ride: one step clears each now.
    expect(vias.map((m) => m.shot)).toEqual(['up-1', 'ls-1']);
    for (const move of vias) {
      const via = move.via!;
      const old = keyedAt([via.at[0], via.at[1] - 0.0005]);
      const next = keyedAt(move.until);
      // Every thousandth of its section from the move's start to its end, across a section boundary
      // too (the follow's), and its end.
      const places: SectionAt[] = [];
      for (let at: SectionAt = move.from; screensOf(at) < screensOf(move.until) - 1e-9; at = placeOf(screensOf(at) + 0.001 * sectionLength(at[0]))) places.push(at);
      places.push(move.until);
      const fails = (at: SectionAt, lamp: { lamp: Lamp; lampAt: number }): boolean => {
        const x = sampler.sample(placeProgress(at));
        return stateMargin({ ...x, net: { ...x.net, lamp: lamp.lamp, lampAt: lamp.lampAt } }) < 0;
      };
      // No one step clears: a step at any of these places up to the lamp has the old level fail at or
      // before it, or the new one fail at or after it (each lit set by its own measure, stateClearance).
      // So the old level's first failure and the new one's last bracket every place a step could take.
      const steps = places.filter((at) => screensOf(at) <= screensOf(move.lamp) + 1e-9).length;
      let firstOld = 0;
      while (firstOld < steps && !fails(places[firstOld], old)) firstOld++;
      let lastNew = firstOld > 0 ? places.length - 1 : -1;
      while (lastNew >= 0 && !fails(places[lastNew], next)) lastNew--;
      for (let i = 0; i < steps; i++) expect(i >= firstOld || i <= lastNew, `${move.shot}: one step at ${places[i].join('@')} would clear`).toBe(true);
      expect(steps, move.shot).toBeGreaterThan(5);
    }
  }, 120_000);

  it('runs the streams with ly-1 and ly-5 and fades them on the page turns (galaxy §15.1)', () => {
    const at = (l: number) => sampler.sample(local('layers', l)).net.streams;
    // To 1e-6: the keys are written at their places to 1e-8 of the section, the places given in screens (layersAt).
    for (const k of LAYERS_STREAMS) expect(at(k.at[1]), k.at.join('@')).toBeCloseTo(k.value, 6);
    // Up only while ly-1's page or ly-5's is on screen, and fading only in a page's fade: ly-1's in,
    // its page's out into ly-2, ly-5's in, and its page's out over the turn into far.
    const fade = fadeWidth(4.3);
    const [two, five] = ['ly-2', 'ly-5'].map((id) => story.find((x) => x.id === 'layers')!.pages.flatMap((p) => p.beats).find((b) => b.id === id)!.at);
    for (const l of Array.from({ length: 1001 }, (_, i) => i / 1000)) {
      const v = at(l);
      if (v > 0 && v < 1) expect([l < fade, l > two - fade && l < two, l > five && l < five + fade, l > 1 - fade].some(Boolean), `layers@${l}`).toBe(true);
    }
  });
});


// ---- Defect and spread (galaxy §14.5 with Task 10's shot pass; freeze-frame §1.1; test 8 re-pinned) ----

/** The defect's and spread's holds, each from the move that lands on its shot to the move that leaves it. */
const DEFECT_HOLDS = HOLDS.filter((h) => h.shot in DEFECT_SHOTS);
/** A section's fade (story/reveal fadeWidth), by its id. */
const fadeOf = (id: string): number => fadeWidth(story.find((x) => x.id === id)!.length);

describe('the moves made as one motion (Move `motion`)', () => {
  it('are marked, not inferred, and each mark is true of its poses: a ride keeps its distances, a push-in its target and bearings; every other move both pulls and pans', () => {
    const marked: [string, string][] = [];
    for (const { move, from, to } of actTwoMoves(g)) {
      const sameDistance = from.distance === to.distance && from.landscape.distance === to.landscape.distance;
      const nothingToPan = from.track === to.track && from.bearing === to.bearing && from.landscape.bearing === to.landscape.bearing;
      if (move.motion === 'ride') expect(sameDistance, move.shot).toBe(true);
      else if (move.motion === 'push') expect(nothingToPan, move.shot).toBe(true);
      else expect(sameDistance || nothingToPan, `${move.shot} is one motion, unmarked`).toBe(false);
      if (move.motion) marked.push([move.shot, move.motion]);
    }
    expect(marked).toEqual([
      ['ly-4 ride', 'ride'],
      ['ly-4 close', 'push'],
      ['df-2', 'push'],
      ['fx-2', 'push'],
    ]);
  });
});

describe('the defect and spread shots (galaxy §14.5, Task 10’s shot pass)', () => {
  it('are the approved shots, every one riding the turn; the close shots stand POSE_TURN_DEG back of their bearing', () => {
    // The galaxy's turn by the pose: 360° × 9.5 s / 1,200 s.
    expect(POSE_TURN_DEG).toBeCloseTo((360 * AMBIENT_POSE) / 1200, 12);
    const c = HERO_CLOSE.C1;
    const tuple = (s: GalaxyShot) => [s.target, s.bearing, s.elevation, s.distance, s.fov, s.frame, s.lamp, s.landscape, s.ridesTurn];
    expect(Object.fromEntries(Object.entries(DEFECT_SHOTS).map(([k, s]) => [k, tuple(s)]))).toEqual({
      'df-1': [{ body: 'C1' }, c.bearing - POSE_TURN_DEG, c.elevation, 4.5, c.fov, c.frame, Lamp.Planet, { distance: 8.6, frame: 0 }, true],
      'df-2': [{ body: 'C1' }, c.bearing - POSE_TURN_DEG, c.elevation, c.distance, c.fov, c.frame, Lamp.Planet, { distance: 6.5, frame: 0 }, true],
      'df-3': [{ centroid: ['P1', 'P2', 'P3'] }, -10, 74, 132, 40, 0, Lamp.Lineage, { distance: 150, frame: 0, bearing: -115 }, true],
      'up-1': [{ body: 'R1' }, 60, 60, 50, 38, 0.8, Lamp.Core, { distance: 130, frame: 0 }, true],
      // Task 1d re-fitted up-2 to the wider neighbourhood (169 / 442 before).
      'up-2': [{ hood: true }, 0, 82, 258, 40, 0.85, Lamp.Hood, { distance: 678, frame: 0 }, true],
    });
    // The twelve's lamp is R0's lineage (through P1, its rule's).
    expect(g.bodies[lampFocusRow(trackIndex(DEFECT_SHOTS['df-3'].target), g)].rule).toBe(bodyIndex(g, 'R0'));
  });

  it('the keyed close shot is the freeze pin’s camera at the pose, on the phone, through df-2 and df-2b', () => {
    const phone = generateGalaxy(MOTE_SEED, galaxyTier(PIN_SCREEN.width, PIN_SCREEN.height), galaxyBudget(MOTE_BUDGET_DESKTOP));
    const phoneData = packBodyData(phone);
    const pin = closeCamera(phoneData, bodyIndex(phone, 'C1'), AMBIENT_POSE);
    const moon = bodyIndex(phone, FREEZE_PINS.C1.moon);
    // The generated shot is the pin's camera exactly...
    const shot = essayCamera(galaxyShotKeys(DEFECT_SHOTS['df-2'], phone), phone, phoneData, PIN_SCREEN, AMBIENT_POSE);
    pin.projectionMatrix.elements.forEach((v, i) => expect(shot.projectionMatrix.elements[i], `projection ${i}`).toBeCloseTo(v, 9));
    pin.matrixWorld.elements.forEach((v, i) => expect(shot.matrixWorld.elements[i], `world ${i}`).toBeCloseTo(v, 9));
    // ...and the keyed frames, their keys rounded to 1e-3 of the rig's units as every camera key is,
    // draw the pinned moon and its home within a tenth of a CSS px of where searchPin put them.
    // The freeze frame's roll (Task 12) turns the held picture about the target, where it lands on screen:
    // the pin's camera, rolled. So each point lands where the pin's camera puts it, turned by the keyed
    // roll about the target's place, and with the roll taken off the camera is the pin's exactly.
    let checked = 0;
    let rolled = 0;
    const target = bodyWorld(phoneData, bodyIndex(phone, 'C1'), AMBIENT_POSE);
    for (const l of [NET_MOVES.pushIn.until[1], 0.2605, 0.3, 0.36, 0.405, 0.43]) {
      const keys = sampler.sample(local('defect', l)).camera;
      const essay = essayCamera(keys, phone, phoneData, PIN_SCREEN, AMBIENT_POSE);
      const flat = essayCamera({ ...keys, roll: 0 }, phone, phoneData, PIN_SCREEN, AMBIENT_POSE);
      pin.projectionMatrix.elements.forEach((v, i) => expect(essay.projectionMatrix.elements[i], `defect@${l} projection ${i}`).toBeCloseTo(v, 6));
      // With the roll taken off it is the pin's camera, as the keys (rounded to 1e-3) can be: every point within a quarter px.
      for (const p of [target, pinnedMoon(phone, phoneData, moon, AMBIENT_POSE), bodyWorld(phoneData, moon, AMBIENT_POSE)]) {
        const [want, got] = [onScreen(pin, p), onScreen(flat, p)];
        expect(Math.hypot(got.x - want.x, got.y - want.y), `defect@${l} unrolled`).toBeLessThan(0.25);
      }
      const c = onScreen(pin, target);
      expect(Math.hypot(onScreen(essay, target).x - c.x, onScreen(essay, target).y - c.y), `defect@${l} target`).toBeLessThan(0.25);
      const a = (keys.roll * Math.PI) / 180;
      if (keys.roll !== 0) rolled++;
      for (const p of [pinnedMoon(phone, phoneData, moon, AMBIENT_POSE), bodyWorld(phoneData, moon, AMBIENT_POSE)]) {
        const w = onScreen(pin, p);
        // Counter-clockwise on screen (y down): x' = c + dx cos a + dy sin a, y' = c − dx sin a + dy cos a.
        const [dx, dy] = [w.x - c.x, w.y - c.y];
        const want = { x: c.x + dx * Math.cos(a) + dy * Math.sin(a), y: c.y - dx * Math.sin(a) + dy * Math.cos(a) };
        const got = onScreen(essay, p);
        expect(Math.hypot(got.x - want.x, got.y - want.y), `defect@${l}`).toBeLessThan(0.1);
      }
      checked++;
    }
    expect(checked).toBe(6);
    // Three of the samples are rolled (0.3, 0.36 and the release at 0.405), and HERO_CLOSE is unchanged.
    expect(rolled).toBe(3);
    expect(HERO_CLOSE.C1).toEqual({ bearing: -35, elevation: 32, distance: 3.4, fov: 36, frame: 1 });
    // The case is real: away from the pose the riding camera is not the pin's (the galaxy has turned).
    const away = essayCamera(sampler.sample(local('defect', 0.3)).camera, phone, phoneData, PIN_SCREEN, 311);
    const pinAway = closeCamera(phoneData, bodyIndex(phone, 'C1'), 311);
    expect(Math.max(...away.matrixWorld.elements.map((v, i) => Math.abs(v - pinAway.matrixWorld.elements[i])))).toBeGreaterThan(0.1);
  });

  for (const hold of DEFECT_HOLDS) {
    it(`${hold.shot}: clears the band at both sizes and every AMBIENT_GRID pose at every sample of its hold, with what it holds built`, () => {
      const lamp = heldShot(hold.shot).lamp;
      for (const at of placesBetween(hold.from, hold.until, 8)) {
        const x = sampler.sample(placeProgress(at));
        expect(stateMargin(x), `${hold.shot} at ${at.join('@')}`).toBeGreaterThanOrEqual(0);
        // cylinderTop where it passes: under the core's and the neighbourhood's lamps.
        if (!VISIBLE_LAMPS.includes(lamp)) expect(margin(keyedAt(at)), `${hold.shot} at ${at.join('@')}, cylinderTop`).toBeGreaterThanOrEqual(0);
      }
    }, 300_000);
  }

  it('cylinderTop cannot pass the lamp-1 close shots or the lineage’s wide disc (the clearance ruling), though their visible bodies clear', () => {
    for (const hold of DEFECT_HOLDS.filter((h) => VISIBLE_LAMPS.includes(heldShot(h.shot).lamp))) {
      const mid = placesBetween(hold.from, hold.until, 2)[1];
      expect(margin(keyedAt(mid)), `${hold.shot}: cylinderTop`).toBeLessThan(-100);
      expect(stateMargin(sampler.sample(placeProgress(mid))), `${hold.shot}: visible`).toBeGreaterThanOrEqual(0);
    }
  }, 300_000);
});

describe('defect and spread, as keyed (test 8; freeze-frame §1.1; galaxy §15.1)', () => {
  it('times the moves: the dive, the pull-out, the follow, the move to up-2 and the move into reviewer on page turns, the push-in as freeze-frame §1.1', () => {
    const [df, sp] = [fadeOf('defect'), fadeOf('spread')];
    const pages = (id: string) => story.find((x) => x.id === id)!.pages;
    const near = (a: SectionAt, b: SectionAt) => {
      expect(a[0]).toBe(b[0]);
      expect(a[1]).toBeCloseTo(b[1], 7);
    };
    // The dive: from where fr-1's page starts to fade to where df-1 is full ink.
    near(NET_MOVES.dive.from, ['far', 1 - fadeOf('far')]);
    near(NET_MOVES.dive.until, ['defect', df]);
    // The push-in, freeze-frame §1.1's 0.04-0.20.
    expect([NET_MOVES.pushIn.from, NET_MOVES.pushIn.until]).toEqual([
      ['defect', 0.04],
      ['defect', 0.2],
    ]);
    // The pull-out: from where page 7 starts to fade (0.4392) to where page 8 is full ink (0.4808).
    const p8 = pages('defect')[1].beats[0].at;
    near(NET_MOVES.pullOut.from, ['defect', p8 - df]);
    near(NET_MOVES.pullOut.until, ['defect', p8 + df]);
    expect(NET_MOVES.pullOut.from[1]).toBeCloseTo(0.4392, 4);
    // The follow: from where page 8 starts to fade to where up-1 is full ink.
    near(NET_MOVES.follow.from, ['defect', 1 - df]);
    near(NET_MOVES.follow.until, ['spread', sp]);
    // The move to up-2: from where up-1's page starts to fade to where up-2 is full ink. (Retired: the
    // second dive and pull-out round C5's mend, which played between them; the author deleted the
    // wordless second fix, 2026-10-09.)
    const up2 = pages('spread')[1].beats[0].at;
    expect(pageOut(pages('spread'), 0)).toBe(up2);
    near(NET_MOVES.toHood.from, ['spread', up2 - sp]);
    near(NET_MOVES.toHood.until, ['spread', up2 + sp]);
    // The move into reviewer is the first of the later sections' (LATE_MOVES, timed below).
    const at = ACT_TWO_MOVES.indexOf(NET_MOVES.dive);
    expect(ACT_TWO_MOVES.slice(at, at + 6)).toEqual([
      NET_MOVES.dive,
      NET_MOVES.pushIn,
      NET_MOVES.pullOut,
      NET_MOVES.follow,
      NET_MOVES.toHood,
      LATE_MOVES.toReview,
    ]);
  });

  it('pushes in on C1 as one motion (no pan): the tracked point C1 throughout, the distance easing 4.5 → 3.4', () => {
    const c1 = trackIndex({ body: 'C1' });
    for (const at of placesBetween(NET_MOVES.pushIn.from, NET_MOVES.pushIn.until, 16)) {
      const f = actTwoFrame(at, g);
      expect([f.a, f.b], at.join('@')).toEqual([c1, c1]);
      const p = trackPoint(keyedAt(at).camera.track, g, data, AMBIENT_POSE);
      const q = trackTargetWorld(c1, g, data, AMBIENT_POSE);
      expect(Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]), at.join('@')).toBeLessThan(1e-9);
    }
    const d = (l: number) => actTwoFrame(['defect', l], g).pose.distance;
    expect(d(0.04)).toBeCloseTo(4.5, 9);
    expect(d(0.12)).toBeCloseTo(4.5 * (3.4 / 4.5) ** 0.5, 9);
    expect(d(0.2)).toBeCloseTo(3.4, 9);
  });

  it('keeps the lit set under the band at every thousandth of every defect and spread move (its lamp steps among them) and every hundredth of their holds, at both sizes and every AMBIENT_GRID pose (lamps 1 and 5 by their visible bodies)', () => {
    const moves = Object.values(NET_MOVES);
    /** Every `step` of its section from `a` to `b` (each on the thousandths the lamp steps are fitted to), and both ends. */
    const grid = (a: SectionAt, b: SectionAt, step: number): SectionAt[] => {
      const out: SectionAt[] = [a];
      for (const [id] of MOVE_SECTIONS) {
        for (let k = 1; k * step < 1 - 1e-9; k++) {
          const at: SectionAt = [id, Math.round(k * step * 1e6) / 1e6];
          if (screensOf(at) > screensOf(a) + 1e-9 && screensOf(at) < screensOf(b) - 1e-9) out.push(at);
        }
      }
      return [...out, b];
    };
    const places = [
      ...moves.flatMap((m) => grid(m.from, m.until, 0.001)),
      ...moves.slice(1).flatMap((m, i) => grid(moves[i].until, m.from, 0.01)),
    ];
    let worst = { margin: Infinity, at: '' };
    for (const at of places) {
      const m = stateMargin(sampler.sample(placeProgress(at)));
      if (m < worst.margin) worst = { margin: m, at: at.join('@') };
    }
    // Not vacuous: every lamp step, and the follow's via, is on the grid.
    const has = (x: SectionAt) => places.some((q) => q[0] === x[0] && Math.abs(q[1] - x[1]) < 1e-9);
    for (const m of moves) expect(has(m.lamp), `the lamp step of the move to ${m.shot} sampled`).toBe(true);
    expect(has(NET_MOVES.follow.via.at)).toBe(true);
    // (543 places since the second fix's dive and pull-out went, 2026-10-09.)
    expect(places.length).toBeGreaterThan(500);
    expect(worst.margin, worst.at).toBeGreaterThanOrEqual(0);
  }, 900_000);

  it('dims all but the subject only under the planet lamp: net.focus up over the push-in, down before the pull-out opens its lamp', () => {
    const tracks = (keyframes as unknown as KeyframeFile).tracks;
    expect(tracks['net.focus'].map((k) => [k.at, k.value, k.ease])).toEqual(FOCUS_KEYS.map((k) => [`${k.at[0]}@${k.at[1]}`, k.value, k.ease]));
    for (const at of placesBetween(NET_MOVES.dive.from, LATE_MOVES.toReview.until, 2000)) {
      const x = sampler.sample(placeProgress(at));
      if (x.net.focus > 0) expect(Math.round(x.net.lamp), at.join('@')).toBe(Lamp.Planet);
    }
    for (const l of [0.2, 0.2605, 0.3, 0.36, 0.4, 0.439]) expect(sampler.sample(local('defect', l)).net.focus, `defect@${l}`).toBe(1);
    // (Retired: spread 0.46-0.56 at 1, the second fix's close on C5, which the author deleted.)
    expect(sampler.sample(local('defect', 0.12)).net.focus).toBeCloseTo(0.5, 9);
    // Eased as the camera is (inOutCubic): a quarter of the way in, 4 (1/4)^3; a quarter of the way down, 1 less that.
    expect(sampler.sample(local('defect', 0.08)).net.focus).toBeCloseTo(0.0625, 9);
    const down = NET_MOVES.pullOut.from[1] + (NET_MOVES.pullOut.lamp[1] - NET_MOVES.pullOut.from[1]) / 4;
    expect(sampler.sample(local('defect', down)).net.focus).toBeCloseTo(0.9375, 6);
    // And everywhere else in Act II it is 0, spread's middle included.
    for (const [id, l] of [['far', 0.5], ['defect', 0.03], ['defect', 0.6], ['spread', 0.2], ['spread', 0.5], ['spread', 0.8], ['reviewer', 0.5]] as const)
      expect(sampler.sample(local(id, l)).net.focus, `${id}@${l}`).toBe(0);
  });

  it('runs the streams with up-1 only: up over the follow, held under the line, out as its page fades (galaxy §15.1)', () => {
    const sp = fadeOf('spread');
    // Out as up-1's page goes, where up-2 comes up.
    const out = story.find((x) => x.id === 'spread')!.pages[1].beats[0].at;
    expect(SPREAD_STREAMS.map((k) => [k.at, k.value])).toEqual([
      [NET_MOVES.follow.from, 0],
      [NET_MOVES.follow.until, 1],
      [NET_MOVES.toHood.from, 1],
      [spreadAt(1.44), 0],
    ]);
    expect(spreadAt(1.44)[1]).toBeCloseTo(out, 7);
    // To 1e-6: spread's places are given in screens (spreadAt), its keys written to 1e-8 of the section.
    for (const k of SPREAD_STREAMS) expect(sampler.sample(placeProgress(k.at)).net.streams, k.at.join('@')).toBeCloseTo(k.value, 6);
    for (const l of Array.from({ length: 1001 }, (_, i) => i / 1000)) {
      const v = sampler.sample(local('defect', l)).net.streams;
      if (l < NET_MOVES.follow.from[1]) expect(v, `defect@${l}`).toBe(0);
      const w = sampler.sample(local('spread', l)).net.streams;
      if (w > 0 && w < 1) expect(l < sp || (l > out - sp && l < out), `spread@${l}`).toBe(true);
      if (l >= out) expect(w, `spread@${l}`).toBe(0);
    }
  });
});

// ---- Reviewer, trace, fix and lesson (galaxy §14.5 with Task 11's shot pass; test 8 re-pinned) ----

/** The later sections' holds, each from the move that lands on its shot to the move that leaves it. */
const LATE_HOLDS = HOLDS.filter((h) => h.shot in LATE_SHOTS || h.shot === 'tr-2 surge');
/**
 * The close stretches (Task 11's clearance ruling): from the start of each move onto a close shot to the
 * end of the move that leaves it. Their lit sets are held to their visible bodies, as the lamp-1 shots
 * are: the camera stands inside the core's lit disc, so cylinderTop cannot pass there.
 */
const CLOSE_SPANS: [number, number][] = ACT_TWO_MOVES.flatMap((m, i) =>
  (LATE_CLOSE as readonly string[]).includes(m.shot) && ACT_TWO_MOVES[i + 1] ? [[screensOf(m.from), screensOf(ACT_TWO_MOVES[i + 1].until)] as [number, number]] : [],
);
const inClose = (at: SectionAt): boolean => CLOSE_SPANS.some(([a, b]) => screensOf(at) >= a - 1e-9 && screensOf(at) <= b + 1e-9);
/**
 * A later place's margin under the band, both screens and every AMBIENT_GRID pose: by the visible bodies
 * under the planet and lineage lamps and through the close stretches, by cylinderTop everywhere else.
 */
function lateMargin(at: SectionAt): number {
  const x = sampler.sample(placeProgress(at));
  const lamp = Math.round(x.net.lamp) as Lamp;
  if (VISIBLE_LAMPS.includes(lamp) || (inClose(at) && lamp === Lamp.Core)) return stateMarginVisible(x);
  return margin(keyedAt(at));
}
/** visibleClearance's least over both screens and every AMBIENT_GRID pose, whatever the lamp. */
const stateMarginVisible = (x: SceneState): number => Math.min(...SIZES.flatMap((size) => AMBIENT_GRID.map((t) => visibleClearance(x, size, t))));

describe('the reviewer, trace, fix and lesson shots (galaxy §14.5, Task 11’s shot pass)', () => {
  it('are the approved shots, every one riding the turn; tr-1 lights R0’s lineage on the core', () => {
    const tuple = (s: GalaxyShot) => [s.target, s.bearing, s.elevation, s.distance, s.fov, s.frame, s.lamp, s.lampOn, s.landscape, s.ridesTurn];
    expect(Object.fromEntries(Object.entries(LATE_SHOTS).map(([k, s]) => [k, tuple(s)]))).toEqual({
      're-1': [{ body: 'P5' }, -127, 68, { outerTimes: 3.5 }, 38, 0.5, Lamp.Star, undefined, { distance: 70, frame: 0 }, true],
      're-3': [{ centroid: ['P5', 'R0'] }, 39, 75, 170, 38, 0.85, Lamp.Core, undefined, { distance: 300, frame: 0, bearing: -51 }, true],
      'tr-1': [{ core: true }, 42, 82, 210, 40, 0, Lamp.Lineage, { body: 'R0' }, { distance: 340, frame: 0, bearing: -10 }, true],
      'tr-2': [{ body: 'R0' }, -15, 35, 8, 36, 1, Lamp.Core, undefined, { distance: 15, frame: 1, bearing: 0 }, true],
      // tr-2's close again (framed 1, not 0.75: at 0.75 the core dips into the band on a phone as the camera closes in).
      'fx-1': [{ body: 'R0' }, -15, 35, 8, 36, 1, Lamp.Core, undefined, { distance: 15, frame: 1, bearing: 0 }, true],
      'fx-2': [{ body: 'R1' }, -60, 35, 8, 36, 0.75, Lamp.Core, undefined, { distance: 15, frame: 1 }, true],
      // Task 1d re-fitted fx-3 (210 / 540 before) and ls-1's landscape (400 before) to the wider neighbourhood.
      'fx-3': [{ hood: true }, 0, 82, 258, 40, 0.85, Lamp.Hood, undefined, { distance: 678, frame: 0 }, true],
      'ls-1': [{ core: true }, 42, 82, 270, 40, 0, Lamp.Hood, undefined, { distance: 420, frame: 0 }, true],
    });
    expect(LATE_CLOSE).toEqual(['tr-2', 'fx-1', 'fx-2']);
    // The pan from R0 to R1 runs stood off: fx-2's shot at 30 (40 landscape).
    expect(FX2_PAN).toEqual({ ...LATE_SHOTS['fx-2'], distance: 30, landscape: { distance: 40, frame: 1 } });
    expect(g.bodies[lampFocusRow(galaxyShotLampAt(LATE_SHOTS['tr-1']), g)].id).toBe('R0');
    // re-3's target, appended so every index already keyed keeps its meaning.
    expect(TRACK_TARGETS.at(-1)).toEqual({ centroid: ['P5', 'R0'] });
  });

  it('frames the ring’s visits on P5 under re-1 and re-2: each in the frame, under the band, as the ring holds on it, at both sizes and every AMBIENT_GRID pose', () => {
    const shot = LATE_SHOTS['re-1'];
    let checked = 0;
    for (const id of g.visits) {
      const b = g.bodies[bodyIndex(g, id)];
      expect(g.bodies[b.star].id, `${id} is P5's`).toBe('P5');
      for (const size of SIZES)
        for (const t of AMBIENT_GRID) {
          const c = disc(galaxyShotCamera(shot, g, data, size, t), size, bodyWorld(data, b.index, t), pieceOuter(g, b.index));
          expect(inFrame(c, size), `${id} at ${size.width}, ${t}`).toBe(true);
          expect(c.y - c.r, `${id} under the band at ${size.width}, ${t}`).toBeGreaterThan(TEXT_BAND * size.height + BAND_MARGIN_PX);
          checked++;
        }
    }
    expect(checked).toBe(9 * 2 * AMBIENT_GRID.length);
  });

  for (const hold of LATE_HOLDS) {
    it(`${hold.shot}: clears the band at both sizes and every AMBIENT_GRID pose at every sample of its hold, with what it holds built`, () => {
      const close = (LATE_CLOSE as readonly string[]).includes(hold.shot);
      for (const at of placesBetween(hold.from, hold.until, 8)) {
        expect(lateMargin(at), `${hold.shot} at ${at.join('@')}`).toBeGreaterThanOrEqual(0);
        // cylinderTop wherever it passes: every hold but the close ones.
        if (!close) expect(margin(keyedAt(at)), `${hold.shot} at ${at.join('@')}, cylinderTop`).toBeGreaterThanOrEqual(0);
      }
    }, 300_000);
  }

  it('cylinderTop cannot pass the close shots (the clearance ruling), though their visible bodies clear', () => {
    for (const hold of LATE_HOLDS.filter((h) => (LATE_CLOSE as readonly string[]).includes(h.shot))) {
      const mid = placesBetween(hold.from, hold.until, 2)[1];
      expect(margin(keyedAt(mid)), `${hold.shot}: cylinderTop`).toBeLessThan(-100);
      expect(stateMarginVisible(sampler.sample(placeProgress(mid))), `${hold.shot}: visible`).toBeGreaterThanOrEqual(0);
    }
  }, 300_000);
});

describe('reviewer, trace, fix and lesson, as keyed (test 8; galaxy §15.1)', () => {
  const [rv, tr] = [fadeOf('reviewer'), fadeOf('trace')];
  const beat = (section: string, id: string) => story.find((x) => x.id === section)!.pages.flatMap((p) => p.beats).find((b) => b.id === id)!.at;
  const near = (a: SectionAt, b: SectionAt) => {
    expect(a[0]).toBe(b[0]);
    expect(a[1]).toBeCloseTo(b[1], 7);
  };

  it('times the moves: on the page turns, and under re-3’s and tr-2’s lines from where each is full ink', () => {
    // Into reviewer: from where up-2's page starts to fade to where re-1 is full ink.
    near(LATE_MOVES.toReview.from, ['spread', 1 - fadeOf('spread')]);
    near(LATE_MOVES.toReview.until, ['reviewer', rv]);
    // The pull-back to the hub and the light, from where re-3 is full ink, at rest well before its page fades.
    near(LATE_MOVES.toHub.from, ['reviewer', beat('reviewer', 're-3') + rv]);
    expect(LATE_MOVES.toHub.until[1]).toBeLessThan(1 - rv - 0.1);
    // The climb, over the page turn into trace.
    near(LATE_MOVES.climb.from, ['reviewer', 1 - rv]);
    near(LATE_MOVES.climb.until, ['trace', tr]);
    // In to R0 from where tr-2 is full ink; out to the wide while R0 holds lit, before the surge runs.
    near(LATE_MOVES.toSource.from, ['trace', beat('trace', 'tr-2') + tr]);
    expect(LATE_MOVES.toSource.until[1]).toBeLessThan(LATE_MOVES.fanOut.from[1]);
    const hi = (at: SectionAt) => sampler.sample(placeProgress(at)).net.highlight;
    const r0 = bodyIndex(g, 'R0');
    // R0 lights as the camera lands on it, and holds lit, whole, until the camera pulls back.
    const lit = (at: SectionAt) => bodyLight(r0, sampler.sample(placeProgress(at)).net, data).hi;
    expect(lit(LATE_MOVES.toSource.until), 'R0 lighting as the camera lands').toBeGreaterThan(0);
    for (const at of placesBetween(['trace', 0.5], LATE_MOVES.fanOut.from, 8)) expect(lit(at), `R0 lit at ${at.join('@')}`).toBeCloseTo(1, 6);
    expect(hi(LATE_MOVES.fanOut.until), 'the surge has not set out').toBeLessThanOrEqual(hi(LATE_MOVES.fanOut.from) + 1e-9);
    expect(hi(['trace', 0.92])).toBe(1);
    // Back in to R0 over the page turn into fix.
    const fx = fadeOf('fix');
    near(LATE_MOVES.toFix.from, ['trace', 1 - tr]);
    near(LATE_MOVES.toFix.until, ['fix', fx]);
    // Across to R1 from where fx-2 is full ink (stood off, then in along fx-2's bearing as one motion),
    // landed before R1's warm motes set out.
    const fixAt = (at: SectionAt) => sampler.sample(placeProgress(at)).net.fix;
    near(LATE_MOVES.panToR1.from, ['fix', beat('fix', 'fx-2') + fx]);
    expect(LATE_MOVES.inOnR1.from[1]).toBeGreaterThan(LATE_MOVES.panToR1.until[1]);
    expect(ACT_TWO_MOVES[ACT_TWO_MOVES.indexOf(LATE_MOVES.panToR1) + 1]).toBe(LATE_MOVES.inOnR1);
    const push = moveShares(LATE_MOVES.inOnR1, poseOf(FX2_PAN, g), poseOf(LATE_SHOTS['fx-2'], g), 0.3);
    expect(push.zoom, 'the push-in on R1 is one motion').toBe(push.pan);
    expect(fixAt(LATE_MOVES.inOnR1.until)).toBeLessThan(g.bodies[bodyIndex(g, 'R1')].fixAt! - NODE_FIX_WINDOW);
    // Out to the neighbourhood from where fx-3 is full ink, at rest before its page fades; fx-4 holds it.
    near(LATE_MOVES.toNew.from, ['fix', beat('fix', 'fx-3') + fx]);
    expect(LATE_MOVES.toNew.until[1]).toBeLessThan(beat('fix', 'fx-4') - fx - 0.05);
    expect(ACT_TWO_MOVES[ACT_TWO_MOVES.indexOf(LATE_MOVES.toNew) + 1]).toBe(LATE_MOVES.toLesson);
    // Into lesson over its page turn.
    near(LATE_MOVES.toLesson.from, ['fix', 1 - fx]);
    near(LATE_MOVES.toLesson.until, ['lesson', fadeOf('lesson')]);
  });

  it('frames what fx-3 and ls-1 are about: the new work from the healed rules (P7, Q3), and the core with the stars round it, under the band at both sizes and every AMBIENT_GRID pose', () => {
    const onScreenUnder = (shot: GalaxyShot, id: string, size: { width: number; height: number }, t: number) => {
      const c = disc(galaxyShotCamera(shot, g, data, size, t), size, bodyWorld(data, bodyIndex(g, id), t), 0);
      return c.x > 0 && c.x < size.width && c.y > TEXT_BAND * size.height + BAND_MARGIN_PX && c.y < size.height;
    };
    const stars = g.bodies.filter((b) => b.kind === 'star').map((b) => b.id);
    const core = g.bodies.filter((b) => b.kind === 'core').map((b) => b.id);
    for (const size of SIZES)
      for (const t of AMBIENT_GRID) {
        for (const id of ['P7', 'Q3', 'R0', 'R1']) expect(onScreenUnder(LATE_SHOTS['fx-3'], id, size, t), `fx-3: ${id} at ${size.width}, ${t}`).toBe(true);
        for (const id of core) expect(onScreenUnder(LATE_SHOTS['ls-1'], id, size, t), `ls-1: ${id} at ${size.width}, ${t}`).toBe(true);
        const seen = stars.filter((id) => onScreenUnder(LATE_SHOTS['ls-1'], id, size, t)).length;
        expect(seen, `ls-1: stars in view at ${size.width}, ${t}`).toBeGreaterThanOrEqual(0.75 * stars.length);
      }
    // P7 and Q3 are the new work built straight from the healed rules (CLEAN_WORK_FROM): born under fx-3.
    for (const id of ['P7', 'Q3']) {
      const b = g.bodies[bodyIndex(g, id)];
      expect(b.cracked, id).toBe(false);
      expect(b.parents.some((p) => ['R0', 'R1'].includes(g.bodies[p].id)), id).toBe(true);
    }
  });

  it('keeps the lit set under the band at every thousandth of every later move (its lamp steps among them) and every hundredth of their holds, at both sizes and every AMBIENT_GRID pose', () => {
    const moves = ACT_TWO_MOVES.slice(ACT_TWO_MOVES.indexOf(LATE_MOVES.toReview));
    const grid = (a: SectionAt, b: SectionAt, step: number): SectionAt[] => {
      const out: SectionAt[] = [a];
      for (const [id] of MOVE_SECTIONS) {
        for (let k = 1; k * step < 1 - 1e-9; k++) {
          const at: SectionAt = [id, Math.round(k * step * 1e6) / 1e6];
          if (screensOf(at) > screensOf(a) + 1e-9 && screensOf(at) < screensOf(b) - 1e-9) out.push(at);
        }
      }
      return [...out, b];
    };
    const places = [
      ...moves.flatMap((m) => grid(m.from, m.until, 0.001)),
      ...moves.slice(1).flatMap((m, i) => grid(moves[i].until, m.from, 0.01)),
      ...grid(moves[moves.length - 1].until, ['lesson', 1], 0.01),
    ];
    let worst = { margin: Infinity, at: '' };
    for (const at of places) {
      const m = lateMargin(at);
      if (m < worst.margin) worst = { margin: m, at: at.join('@') };
    }
    const has = (x: SectionAt) => places.some((q) => q[0] === x[0] && Math.abs(q[1] - x[1]) < 1e-9);
    for (const m of moves) expect(has(m.lamp), `the lamp step of the move to ${m.shot} sampled`).toBe(true);
    expect(places.length).toBeGreaterThan(500);
    expect(worst.margin, worst.at).toBeGreaterThanOrEqual(0);
  }, 1_800_000);

  it('runs the lineage streams under tr-1, tr-2 and fx-4 and the feed from re-3 through the trace, each fading only on its turns (galaxy §15.1)', () => {
    const leaf = (k: 'streams' | 'feed', at: SectionAt) => sampler.sample(placeProgress(at)).net[k];
    for (const k of LATE_STREAMS) expect(leaf('streams', k.at), k.at.join('@')).toBeCloseTo(k.value, 9);
    for (const k of FEED_KEYS) expect(leaf('feed', k.at), k.at.join('@')).toBeCloseTo(k.value, 9);
    // Up under re-3 from its line's fade-in, and never under re-1 or re-2.
    expect(FEED_KEYS[0].at).toEqual(['reviewer', beat('reviewer', 're-3')]);
    // Fractional only on a page turn (the moves' between sections, and fix's own into fx-4) or (the
    // feed) over re-3's fade-in.
    const fx4 = beat('fix', 'fx-4');
    const turns: [SectionAt, SectionAt][] = [
      ...Object.values(LATE_MOVES)
        .filter((m) => m.from[0] !== m.until[0])
        .map((m): [SectionAt, SectionAt] => [m.from, m.until]),
      [
        ['fix', fx4 - fadeOf('fix')],
        ['fix', fx4 + fadeOf('fix')],
      ],
    ];
    expect(leaf('streams', ['fix', (fx4 + fadeOf('fix') + 1) / 2]), 'up under fx-4: the sweep').toBe(1);
    const fading = (at: SectionAt, extra: [SectionAt, SectionAt][] = []) =>
      [...turns, ...extra].some(([a, b]) => screensOf(at) > screensOf(a) - 1e-9 && screensOf(at) < screensOf(b) + 1e-9);
    for (const id of ['reviewer', 'trace', 'fix', 'lesson'])
      for (let i = 0; i <= 1000; i++) {
        const at: SectionAt = [id, i / 1000];
        const [st, fd] = [leaf('streams', at), leaf('feed', at)];
        if (st > 0 && st < 1) expect(fading(at), `streams at ${at.join('@')}`).toBe(true);
        if (fd > 0 && fd < 1) expect(fading(at, [[FEED_KEYS[0].at, FEED_KEYS[1].at]]), `feed at ${at.join('@')}`).toBe(true);
        if (screensOf(at) <= screensOf(LATE_MOVES.climb.from)) expect(st, `streams at ${at.join('@')}`).toBe(0);
      }
  });

  it('keeps net.focus at 0 through the later sections: no planet lamp there', () => {
    for (const id of ['reviewer', 'trace', 'fix', 'lesson'])
      for (let i = 0; i <= 200; i++) expect(sampler.sample(local(id, i / 200)).net.focus, `${id}@${i / 200}`).toBe(0);
  });
});

// ---- The streams and the feed under the text band (Task 11 review I1, the ruling) ----

describe('the streams and the feed never light the text band (Task 11 review I1)', () => {
  /** The keyed state at a place, and the tops of the stream and feed dots it lights, masked or not, on a screen, at an ambient. */
  const dotsAt = (at: SectionAt, size: { width: number; height: number }, t: number, masked: boolean) => {
    const x = sampler.sample(placeProgress(at));
    const camera = essayCamera(x.camera, g, data, size, t);
    camera.updateMatrixWorld();
    return streamPixels(x.net, g, data, camera, size, t, masked).map((d) => d.y);
  };
  const edge = (size: { height: number }) => TEXT_BAND * size.height + BAND_MARGIN_PX;
  /** Where the review found the desktop's dots in the band: tr-2's two moves (trace 0.449-0.4535 and 0.609-0.614), the climb, the move into fix. */
  const BREACHES: SectionAt[] = [
    ...placesBetween(['trace', 0.448], ['trace', 0.455], 14),
    ...placesBetween(['trace', 0.608], ['trace', 0.615], 14),
    ...placesBetween(['reviewer', 0.969], ['trace', 0.012], 10),
    ...placesBetween(['fix', 0.006], ['fix', 0.01], 4),
  ];
  /** ly-1's and ly-5's holds (the review's T9 desktop frames), the breaches, every twentieth of tr-2's two moves and the feed alone under re-3. */
  const PLACES: SectionAt[] = [
    layersAt(0.4),
    layersAt(3.95),
    ...BREACHES,
    ...placesBetween(LATE_MOVES.toSource.from, LATE_MOVES.toSource.until, 20),
    ...placesBetween(LATE_MOVES.fanOut.from, LATE_MOVES.fanOut.until, 20),
    ['reviewer', 0.88],
  ];

  it('would: unmasked, the dots stand in the band on a desktop at ly-1, at ly-5 and under tr-2’s moves (the review’s probe)', () => {
    const into = (places: SectionAt[]) => places.some((at) => AMBIENT_GRID.some((t) => dotsAt(at, DESKTOP, t, false).some((y) => y < edge(DESKTOP))));
    expect(into([layersAt(0.4)]), 'ly-1').toBe(true);
    expect(into([layersAt(3.95)]), 'ly-5').toBe(true);
    expect(into(BREACHES.slice(0, 15)), 'tr-2, the move in').toBe(true);
    expect(into(BREACHES.slice(15, 30)), 'tr-2, the move out').toBe(true);
  }, 300_000);

  it('does not: masked, every dot they light keeps the band’s margin, at both sizes and every AMBIENT_GRID pose, and they still draw under it', () => {
    let drawn = 0;
    for (const at of PLACES)
      for (const size of SIZES)
        for (const t of AMBIENT_GRID) {
          const ys = dotsAt(at, size, t, true);
          drawn += ys.length;
          for (const y of ys) expect(y, `${at.join('@')} ${size.width} at ${t}`).toBeGreaterThan(edge(size));
        }
    expect(drawn, 'the streams and the feed still draw under the band').toBeGreaterThan(1000);
  }, 300_000);

  it('is counted by both clearance twins: each takes the top of the dots it lights, and at some sample the dots are its highest', () => {
    // Each twin with the dots is the lesser of itself without them and the dots' own top; somewhere
    // in PLACES on each screen the dots are what is highest, so a twin that left them out would read more.
    const highest = { visible: 0, cylinder: 0 };
    for (const at of PLACES)
      for (const size of SIZES)
        for (const t of [AMBIENT_GRID[0]]) {
          const x = sampler.sample(placeProgress(at));
          const ys = dotsAt(at, size, t, true);
          const dots = ys.length > 0 ? Math.min(...ys) - edge(size) : Infinity;
          const without = { ...x, net: { ...x.net, streams: 0, feed: 0 } };
          const visible = [visibleClearance(x, size, t), visibleClearance(without, size, t)];
          expect(visible[0], `visible at ${at.join('@')} ${size.width}`).toBeCloseTo(Math.min(visible[1], dots), 9);
          if (dots < visible[1]) highest.visible++;
          const frame = { camera: x.camera, lamp: Math.round(x.net.lamp), lampAt: Math.round(x.net.lampAt), growth: x.net.growth, show: x.net.show };
          const cylinder = [bandClearance({ ...frame, streams: x.net }, g, data, size, t), bandClearance(frame, g, data, size, t)];
          expect(cylinder[0], `cylinderTop at ${at.join('@')} ${size.width}`).toBeCloseTo(Math.min(cylinder[1], dots), 9);
          if (dots < cylinder[1]) highest.cylinder++;
        }
    expect(highest.visible, 'the dots are the visible twin’s highest somewhere').toBeGreaterThan(0);
    expect(highest.cylinder, 'the dots are cylinderTop’s highest somewhere').toBeGreaterThan(0);
  }, 600_000);
});

// ---- The haze (re-skin §5): a look gate, up only at the galaxy wides ----

describe('net.haze', () => {
  it('the haze is up only at the galaxy wides', () => {
    const intoLy1 = ACT_TWO_MOVES[0];
    const intoFar = ACT_TWO_MOVES.find((m) => m.shot === 'fr-1')!;
    const dive = NET_MOVES.dive;
    expect([intoLy1.shot, dive.shot]).toEqual(['ly-1', 'df-1']);
    // It comes up with the zoom-out's last lamp step (the lamp off, at the galaxy wide).
    const lastStep = ZOOM_OUT.lamp[ZOOM_OUT.lamp.length - 1];
    expect(lastStep.lamp).toBe(Lamp.Off);
    expect(HAZE_KEYS[0]).toEqual({ at: ['zoom-out', lastStep.at], value: 0 });
    const P = (at: SectionAt) => placeProgress(at);
    const eps = 1e-9;
    let [up, down, ramp] = [0, 0, 0];
    for (const id of ['zoom-out', ...MOVE_SECTIONS.map(([x]) => x)])
      for (let i = 0; i <= 200; i++) {
        const at: SectionAt = [id, i / 200];
        const p = P(at);
        const v = sampler.sample(p).net.haze;
        const within = (a: SectionAt, b: SectionAt) => p >= P(a) - eps && p <= P(b) + eps;
        const where = at.join('@');
        if (within(['zoom-out', 1], intoLy1.from) || within(intoFar.until, dive.from)) {
          expect(v, where).toBeCloseTo(1, 9);
          up++;
        } else if (p <= P(['zoom-out', lastStep.at]) + eps || within(intoLy1.until, intoFar.from) || p >= P(dive.until) - eps) {
          expect(v, where).toBe(0);
          down++;
        } else {
          expect(v, where).toBeGreaterThanOrEqual(0);
          expect(v, where).toBeLessThanOrEqual(1);
          ramp++;
        }
      }
    // Every case is sampled: up at the zoom-out's end and through fr-1, down elsewhere, ramping on the four turns.
    expect(up).toBeGreaterThan(100);
    expect(down).toBeGreaterThan(1500);
    expect(ramp).toBeGreaterThan(0);
    // And Act I never has it.
    for (const id of ACT_I) for (let i = 0; i <= 200; i++) expect(sampler.sample(local(id, i / 200)).net.haze, `${id}@${i / 200}`).toBe(0);
  });

  it('holds the neighbourhood’s real form only on the beats whose shots name its systems: ly-3, up-2, tr-1 and its surge, fx-3 (and fx-4) and ls-1', () => {
    // The ruling: the dissolve belongs to the wides; every beat whose shot names neighbourhood systems holds
    // them real. net.hoodHold is 1 on each held shot's hold, 0 elsewhere, easing over the move into a run of
    // held shots and the move after it (the last run, fx-3 and ls-1, holds to the end).
    expect(HOOD_HOLD_SHOTS).toEqual(['ly-3', 'up-2', 'tr-1', 'tr-2 surge', 'fx-3', 'ls-1']);
    const moves = HOOD_HOLD_SHOTS.map((shot) => ACT_TWO_MOVES.findIndex((m) => m.shot === shot));
    // Each lamped on the neighbourhood, or on R0's lineage of its systems (tr-1 and the surge).
    for (const i of moves) expect([Lamp.Hood, Lamp.Lineage], ACT_TWO_MOVES[i].shot).toContain(actTwoMoves(g)[i].to.lamp);
    const P = (at: SectionAt) => placeProgress(at);
    const eps = 1e-9;
    // The runs of held shots that are consecutive moves.
    const runs: number[][] = [];
    for (const i of [...moves].sort((a, b) => a - b)) {
      if (runs.length && runs[runs.length - 1].at(-1) === i - 1) runs[runs.length - 1].push(i);
      else runs.push([i]);
    }
    expect(runs.map((r) => r.map((i) => ACT_TWO_MOVES[i].shot))).toEqual([['ly-3'], ['up-2'], ['tr-1'], ['tr-2 surge'], ['fx-3', 'ls-1']]);
    expect(moves.at(-1)).toBe(ACT_TWO_MOVES.length - 1);
    // Each run's rise (0 to 1 over its first move), plateau (1 through its last move and the hold after it)
    // and fall (1 to 0 over the move after it; none for the run that ends the lap).
    const spans = runs.map((r) => {
      const [first, after] = [ACT_TWO_MOVES[r[0]], ACT_TWO_MOVES[r[r.length - 1] + 1]];
      return { rise: [P(first.from), P(first.until)], plateau: [P(first.until), after ? P(after.from) : Infinity], fall: after ? [P(after.from), P(after.until)] : null };
    });
    let [up, down, ramp] = [0, 0, 0];
    for (const id of ['zoom-out', ...MOVE_SECTIONS.map(([x]) => x)])
      for (let i = 0; i <= 200; i++) {
        const at: SectionAt = [id, i / 200];
        const p = P(at);
        const v = sampler.sample(p).net.hoodHold;
        const where = at.join('@');
        const inside = (r: number[] | null) => r !== null && p > r[0] + eps && p < r[1] - eps;
        if (spans.some((x) => p >= x.plateau[0] - eps && p <= x.plateau[1] + eps)) {
          expect(v, where).toBeCloseTo(1, 9);
          up++;
        } else if (spans.some((x) => inside(x.rise) || inside(x.fall))) {
          expect(v, where).toBeGreaterThanOrEqual(0);
          expect(v, where).toBeLessThanOrEqual(1);
          ramp++;
        } else {
          expect(v, where).toBe(0);
          down++;
        }
      }
    expect(up).toBeGreaterThan(100);
    expect(down).toBeGreaterThan(1000);
    expect(ramp).toBeGreaterThan(0);
    for (const id of ACT_I) for (let i = 0; i <= 200; i++) expect(sampler.sample(local(id, i / 200)).net.hoodHold, `${id}@${i / 200}`).toBe(0);
    // The leaf is held to HOOD_HOLD_KEYS, as actTwoKeys pastes it.
    expect(HOOD_HOLD_KEYS[0]).toEqual({ at: ACT_TWO_MOVES[moves[0]].from, value: 0 });
  });

  it('keys the hold strictly increasing in scroll, and never dips inside a run of consecutive held moves', () => {
    // The sampler rejects equal or falling keys (keyframeSampler: `at` must be strictly increasing), and a
    // dip would drop the stars to their far form between two held shots: fx-3 into ls-1 is the case.
    const ps = HOOD_HOLD_KEYS.map((k) => placeProgress(k.at));
    ps.forEach((p, i) => {
      if (i > 0) expect(p, `key ${i}: ${HOOD_HOLD_KEYS[i].at.join('@')}`).toBeGreaterThan(ps[i - 1]);
    });
    const [fx3, ls1] = ['fx-3', 'ls-1'].map((shot) => ACT_TWO_MOVES.find((m) => m.shot === shot)!);
    expect(ACT_TWO_MOVES[ACT_TWO_MOVES.indexOf(fx3) + 1]).toBe(ls1);
    // From fx-3's arrival to the end of the lap the hold is 1 at every sample: the hold after fx-3, ls-1's
    // whole move, and the lesson that holds it to the end.
    const [from, to] = [placeProgress(fx3.until), 1];
    for (let k = 0; k <= 2000; k++) expect(sampler.sample(from + ((to - from) * k) / 2000).net.hoodHold, `fx-3 to the end, ${k}/2000`).toBeCloseTo(1, 9);
    for (let k = 0; k <= 100; k++) {
      const [a, b] = [placeProgress(ls1.from), placeProgress(ls1.until)];
      expect(sampler.sample(a + ((b - a) * k) / 100).net.hoodHold, `ls-1's move, ${k}%`).toBeCloseTo(1, 9);
    }
  });

  it('is up on the galaxy wide probe shots alone (the `?shot=` probe reads it)', () => {
    expect([GALAXY_SHOTS.galaxyWide.haze, FAR_SHOT.haze]).toEqual([1, 1]);
    for (const [name, shot] of Object.entries(GALAXY_SHOTS)) if (name !== 'galaxyWide') expect(shot.haze ?? 0, name).toBe(0);
  });
});
