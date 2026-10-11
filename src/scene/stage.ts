// The stage: every system the page draws, in the scene's order, and one frame's update of all of them
// (design spec §6.1: a frame is a pure function of scroll progress and the ambient clock). main.ts
// owns the renderer, the clocks, the lazy modules and the test hook, and calls `draw` before each
// render; the purity twin (src/purity/twin.ts) drives the same `draw` in Node and compares
// what each path leaves for the GPU, so the page and the twin can never compose a frame differently.
import { Group, type IUniform, type PerspectiveCamera, Scene, Vector3 } from 'three';
import type { FREEZE_PINS } from '../galaxy/ambient';
import type { Tier } from '../galaxy/background';
import { bodyIndex, galaxyBudget, generateGalaxy, type Galaxy } from '../galaxy/generate';
import { mechanismAnchors } from '../mechanisms/anchors';
import type { Mechanism } from '../mechanisms/types';
import type { SectionSpan } from '../scroll/progress';
import type { GalaxyShot } from '../timeline/netShots';
import { composeEssayCamera } from '../timeline/netTrack';
import { mergeState, type SceneState } from '../timeline/sceneState';
import { createEssayCamera } from './cameraRig';
import { createGalaxySystem, type GalaxySystem } from './galaxy/galaxySystem';
import { createHoleSystem, type HoleSystem } from './hole/holeSystem';
import { createInkSystem, type InkSystem } from './ink/inkSystem';
import { reflowBodies } from './mote/mote';
import { createMoteSystem, type MoteSystem } from './mote/moteSystem';
import { packBodyData, type BodyData } from './node/bodyData';
import { createBodySystem, type BodySystem, type FreezeFrame } from './node/bodySystem';
import type { Viewport } from './node/lod';
import { bodyGalactic } from './node/orbit';

/** Act II's galaxy, once it is built. */
export interface StageGalaxy {
  g: Galaxy;
  data: BodyData;
  background: GalaxySystem;
  /** The black hole at the centre, in place of the core's bodies (re-skin Task 5). */
  hole: HoleSystem;
  bodies: BodySystem;
}

/** A probe shot (`?shot=` in test mode) and the module that frames it (netShots.ts, loaded lazily). */
export interface StageShot {
  shot: GalaxyShot;
  shots: Pick<typeof import('../timeline/netShots'), 'galaxyShotKeys' | 'galaxyShotLampAt'>;
}

/** One frame's inputs: everything `draw` reads besides the stage itself. */
export interface StageFrame {
  /** The sampled scene state at this frame's progress, with any `?state=` override merged. */
  state: SceneState;
  /** The `?state=` override (a shot's lamp and haze yield to the `net` it names). */
  override: unknown;
  /** The probe shot framed, or null for the essay's own camera. */
  shot: StageShot | null;
  /** The ambient this frame shows (the clock's, or the freeze pin's while the hold is up). */
  ambient: number;
  /** The clock's own ambient while it runs on its own, else null (test mode, reduced motion, `?ambient=`). */
  liveAmbient: number | null;
  /** The freeze pins, once the clock's module has loaded (null before). */
  pins: typeof FREEZE_PINS | null;
  /** The freeze flash is on (off in test mode and under reduced motion). */
  flashOn: boolean;
  /** Drawing-buffer px and the device pixel ratio. */
  viewport: Viewport;
  /** Idle shimmer time in seconds, or null while it is off. */
  shimmerTime: number | null;
}

export interface Stage {
  readonly scene: Scene;
  readonly camera: PerspectiveCamera;
  readonly motes: MoteSystem;
  readonly ink: InkSystem | null;
  /**
   * The black hole's shadow on screen (shadow.ts): written by the hole each frame, read by every galaxy
   * material. One per stage, so no two stages share it.
   */
  readonly shadow: IUniform<Vector3>;
  /** The galaxy, or null until `buildGalaxy`. */
  galaxy(): StageGalaxy | null;
  /**
   * Builds the galaxy if it is not built yet (true if this call built it). It is pure, and draws
   * nothing while `net.show` is 0, so no frame depends on when it runs.
   */
  buildGalaxy(tier: Tier): boolean;
  /** Brings every system to `frame`; the caller renders `scene` with `camera` after. */
  draw(frame: StageFrame): void;
}

/** A frame at `state` needs the galaxy: it shows it, carries the bike onto it, or tracks one of its bodies. */
export function needsGalaxy(state: SceneState): boolean {
  return state.net.show > 0 || state.mech.reflow > 0 || state.camera.track.a !== 0 || state.camera.track.b !== 0;
}

/**
 * Progress from which the galaxy is built ahead of need: the start of the section before the first
 * one whose end needs it (Infinity if none does).
 */
export function galaxyLead(spans: SectionSpan[], sample: (p: number) => SceneState): number {
  const first = spans.findIndex((s) => needsGalaxy(sample(s.end)));
  return first < 0 ? Infinity : spans[Math.max(0, first - 1)].start;
}

export function createStage(mechanism: Mechanism, budget: number, seed: number): Stage {
  const anchors = mechanismAnchors(mechanism);
  // The far plane holds Act II's wide shots (cameraRig.ts createEssayCamera).
  const camera = createEssayCamera(1);
  const scene = new Scene();
  const motes = createMoteSystem(mechanism, budget, seed);
  scene.add(motes.object);
  // The galaxy goes into a slot that holds its place in the scene, so the scene's order does not
  // depend on when it was built.
  const slot = new Group();
  scene.add(slot);
  // The drawing and its sheet (the spec section), for a mechanism that has one.
  const ink = createInkSystem(mechanism);
  if (ink) scene.add(ink.object);
  const shadow: IUniform<Vector3> = { value: new Vector3() };
  let galaxy: StageGalaxy | null = null;

  /**
   * What the galaxy's draws need of the freeze frame beyond the story's leaves: the held piece (C1 and
   * the moon its pin caught mid-burst, and whether the hold forces C1's scatter: every path but the
   * search's `full`), the live ambient the twos tick on, and the flash.
   */
  function freezeFrame(f: StageFrame): FreezeFrame {
    const pin = f.pins?.C1;
    const hero = pin && galaxy ? { planet: bodyIndex(galaxy.g, 'C1'), moon: bodyIndex(galaxy.g, pin.moon), forceScatter: pin.path !== 'full' } : null;
    return { hero, live: f.liveAmbient, flashOn: f.flashOn };
  }

  return {
    scene,
    camera,
    motes,
    ink,
    shadow,
    galaxy: () => galaxy,

    buildGalaxy(tier) {
      if (galaxy !== null) return false;
      // Generated once per page load from the essay's seed, at the galaxy's share of the mote budget.
      const g = generateGalaxy(seed, tier, galaxyBudget(budget));
      const data = packBodyData(g);
      // One far star per unit, on its spot: a binary's on its barycentre, so from afar a pair is one star.
      const background = createGalaxySystem(
        g.background,
        g.units.map((i) => g.bodies[i].spot!),
        (t) => bodyGalactic(data, data.n0Row, t),
        shadow,
      );
      // The black hole at the centre, in place of the core's bodies (re-skin Task 5), drawn over the
      // background and under the bodies.
      const hole = createHoleSystem(g, data, shadow);
      const bodies = createBodySystem(g, shadow);
      slot.add(background.object, hole.object, bodies.object);
      galaxy = { g, data, background, hole, bodies };
      return true;
    },

    draw(f) {
      const { state, ambient, viewport } = f;
      const shot = f.shot !== null && galaxy !== null ? f.shot : null;
      if (shot && galaxy) {
        state.camera = shot.shots.galaxyShotKeys(shot.shot, galaxy.g);
        // The shot's lamp, on its own target, and its haze (up only at the galaxy wides), unless `?state=` names them.
        const net = { ...state.net, lamp: shot.shot.lamp, lampAt: shot.shots.galaxyShotLampAt(shot.shot), haze: shot.shot.haze ?? 0 };
        const named = typeof f.override === 'object' && f.override !== null ? (f.override as { net?: unknown }).net : undefined;
        state.net = mergeState({ ...state, net }, { net: named }).net;
      }
      // Act II's keys are relative to the point the camera tracks, where it is at this frame's ambient,
      // and a shot that rides the galaxy's turn swings about it; Act I tracks nothing (track.a = track.b
      // = 0), whose origin is the world's own.
      composeEssayCamera(camera, state, anchors, galaxy, ambient);
      motes.object.visible = shot === null;
      if (ink) ink.object.visible = shot === null;
      if (shot === null) {
        const home = state.mech.reflow > 0 && galaxy !== null ? reflowBodies(galaxy.g, galaxy.data, ambient) : null;
        motes.update(state, camera, viewport, f.shimmerTime, home);
        ink?.update(state, camera, viewport);
      }
      galaxy?.background.update(state, camera, viewport, ambient);
      galaxy?.hole.update(state, camera, viewport, ambient);
      galaxy?.bodies.update(state, camera, viewport, ambient, freezeFrame(f));
    },
  };
}
