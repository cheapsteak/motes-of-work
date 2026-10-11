import { isVec3, type Vec3 } from '../math/vec';

export interface Faults {
  misalign: number;
  slip: number;
  bind: number;
  jitter: number;
  ratio: number;
  stall: number;
  drift: number; // each 0..1
}

export interface SceneState {
  /**
   * `pos` and `target` are machine-relative: world = anchor.center + value × anchor.radius, where the
   * anchor is lerp(whole machine, core) by `coreFocus` (0 frames the whole machine, 1 the core).
   * `frame` composes the shot round the essay's text (src/scene/cameraRig.ts): 0 a wide shot, the
   * target low-centre; 1 a close shot, the target lower (and right of the text on a wide screen).
   * `track` is Act II's tracking camera (galaxy-orbits §8): the world point the keys are relative to,
   * `mix` of the way from target `a` to target `b` (TRACK_TARGETS indices, netTrack.ts trackPoint;
   * steps), each resolved at the frame's ambient. Index 0 is no target, the world's origin: Act I's
   * keys, untracked. `turn` is how far the camera's bearing rides the galaxy's turn about the tracked
   * point (netTrack.ts trackTurn): 0 it stands in the world, 1 it turns with the galaxy, so a group
   * of stars holds one composition at every ambient. `landscape` is the shot on a landscape screen
   * (src/scene/cameraRig.ts landscapeRig): `mix` of the way from `pos` and `frame` to its own (0, the
   * default, is the shot as keyed on every screen); a portrait screen never reads it.
   */
  camera: {
    pos: Vec3;
    target: Vec3;
    fov: number;
    focus: number;
    coreFocus: number;
    frame: number;
    track: { a: number; b: number; mix: number; turn: number };
    landscape: { pos: Vec3; frame: number; mix: number };
    /** Degrees the camera turns about its line of sight through the target (the freeze frame's tilt, freeze-frame §2.1). */
    roll: number;
  };
  mech: {
    assembly: number; // 0 exploded → 1 assembled
    variant: number; // 0 correct → 1 wrong twin
    drive: number; // the machine's own clock
    /** Steering added to the drive's own swing, as a fraction of full lock; the sum is clamped to ±1. */
    steer: number;
    faults: Faults;
    ghost: number; // ghost opacity
    ghostVariant: number; // the variant the ghost outline is drawn in, 0 correct → 1 wrong twin
    /** Act II: the motes leave the machine for its planet and that planet's moons, 0 the machine → 1 the planet (galaxy §14.3). */
    reflow: number;
  };
  provenance: { vibed: number; misallocated: number }; // both 0 = specced
  motes: { human: number; agent: number; dialogue: number; activity: number };
  workshop: { copies: number; spread: number };
  tiers: {
    guards: number;
    constitution: number;
    domain: number;
    playbook: number;
    arc: number;
    task: number;
    turn: number;
    turbulence: number;
    promotion: number;
  };
  overlay: { strip: number; effort: number; effortVisible: number };
  clock: number; // τ: scroll-derived clock for Act II field effects
  /** The sheet of paper the drawing is made on (docs/specs/2026-10-05-blueprint-and-build.md §2.10). */
  sheet: { opacity: number };
  /**
   * The ink drawing: its overall opacity; how much of it the pen has drawn (0..1, in the pen's
   * order); the redraw (0..0.3 the old lines fade, 0.2..1 the new ones draw); how flat it is pressed
   * (1 on the page, 0 every line in its place in the bike); the person's ring (0..1 draws, 1..2
   * fades) and tick (0..1 draws).
   */
  ink: { opacity: number; drawn: number; redraw: number; flat: number; ring: number; tick: number };
  /** Brightness of the mote and thread draws: 0.1 dims the cloud to dust behind the page. */
  stage: { motes: number };
  /**
   * The network of Act II (docs/specs/2026-10-06-act-2-storyboard-and-network.md §2.11): its
   * presence (0 invisible, its brightness scaling with it), and its clocks: births on `growth`, the
   * rebuilds on `fix`, each body's ember on `highlight` (0.92..1 the surge), and the reviewer's ring
   * on `review` (0..1 its visits, 1..1.2 the feed stream, 1.5..2 the ring fading out). Each 0..1 but
   * `review`, 0..2. The galaxy's (galaxy-orbits §14.5, §15.1): how far the lamp's focus has dimmed
   * all but its subject (`focus`, 0..1); the lamp's level (`lamp`, a Lamp, netTrack.ts) and the target
   * whose membership it lights (`lampAt`, a TRACK_TARGETS index), both steps; the lineage streams'
   * presence (`streams`, 0..1, 1 only on the lineage beats); and the reviewer's feed's (`feed`, 0..1, 1
   * only from re-3 through tr-2, where it is the subject, galaxy §15.1). The re-skin's
   * (docs/specs/2026-10-09-act-2-reskin.md §5): the background haze's gain (`haze`, 0..1, up only at
   * the galaxy wides; a look gate, so no stop waits for it), and how far a beat holds the
   * neighbourhood's real form whole against its dissolve (`hoodHold`, 0..1, 1 only on the beats whose
   * shots name its systems, netShots.ts HOOD_HOLD_SHOTS; lod.ts HOOD_LOD.beatsHold switches it; a look gate too).
   */
  net: { show: number; growth: number; fix: number; highlight: number; review: number; focus: number; lamp: number; lampAt: number; streams: number; feed: number; haze: number; hoodHold: number };
  /**
   * The freeze frame (docs/specs/2026-10-07-freeze-frame.md §1, §3.2), each 0..1: the cut (`hold`, read
   * as hold >= 0.5: the ambient clock is held at the freeze pin, src/scene/ambientClock.ts shown), the
   * dressing (`dress`: the copies, the limb, the dim and grey, the bursts), and the one-frame flash.
   */
  freeze: { hold: number; dress: number; flash: number };
}

export const FAULT_KEYS: readonly (keyof Faults)[] = ['misalign', 'slip', 'bind', 'jitter', 'ratio', 'stall', 'drift'];

export const ZERO_FAULTS: Faults = Object.freeze({
  misalign: 0,
  slip: 0,
  bind: 0,
  jitter: 0,
  ratio: 0,
  stall: 0,
  drift: 0,
});

export function defaultSceneState(): SceneState {
  return {
    // A head-on overview of the whole machine at about three machine radii (machine-relative).
    camera: {
      pos: [0, 0, 3.1],
      target: [0, 0, 0],
      fov: 40,
      focus: 0,
      coreFocus: 0,
      frame: 0,
      track: { a: 0, b: 0, mix: 0, turn: 0 },
      landscape: { pos: [0, 0, 3.1], frame: 0, mix: 0 },
      roll: 0,
    },
    mech: { assembly: 1, variant: 0, drive: 0, steer: 0, faults: { ...ZERO_FAULTS }, ghost: 0, ghostVariant: 0, reflow: 0 },
    provenance: { vibed: 0, misallocated: 0 },
    motes: { human: 0, agent: 1, dialogue: 0, activity: 0 },
    workshop: { copies: 1, spread: 0 },
    tiers: {
      guards: 0,
      constitution: 0,
      domain: 0,
      playbook: 0,
      arc: 0,
      task: 0,
      turn: 0,
      turbulence: 0,
      promotion: 0,
    },
    overlay: { strip: 0, effort: 0, effortVisible: 0 },
    clock: 0,
    sheet: { opacity: 0 },
    ink: { opacity: 0, drawn: 0, redraw: 0, flat: 0, ring: 0, tick: 0 },
    stage: { motes: 1 },
    net: { show: 0, growth: 0, fix: 0, highlight: 0, review: 0, focus: 0, lamp: 0, lampAt: 0, streams: 0, feed: 0, haze: 0, hoodHold: 0 },
    freeze: { hold: 0, dress: 0, flash: 0 },
  };
}

/** Every leaf of SceneState (a Vec3 is one leaf). A test keeps this in sync with defaultSceneState(). */
export const SCENE_STATE_PATHS: Record<string, 'number' | 'vec3'> = {
  'camera.pos': 'vec3',
  'camera.target': 'vec3',
  'camera.fov': 'number',
  'camera.focus': 'number',
  'camera.coreFocus': 'number',
  'camera.frame': 'number',
  'camera.track.a': 'number',
  'camera.track.b': 'number',
  'camera.track.mix': 'number',
  'camera.track.turn': 'number',
  'camera.landscape.pos': 'vec3',
  'camera.landscape.frame': 'number',
  'camera.landscape.mix': 'number',
  'camera.roll': 'number',
  'mech.assembly': 'number',
  'mech.variant': 'number',
  'mech.drive': 'number',
  'mech.steer': 'number',
  'mech.faults.misalign': 'number',
  'mech.faults.slip': 'number',
  'mech.faults.bind': 'number',
  'mech.faults.jitter': 'number',
  'mech.faults.ratio': 'number',
  'mech.faults.stall': 'number',
  'mech.faults.drift': 'number',
  'mech.ghost': 'number',
  'mech.ghostVariant': 'number',
  'mech.reflow': 'number',
  'provenance.vibed': 'number',
  'provenance.misallocated': 'number',
  'motes.human': 'number',
  'motes.agent': 'number',
  'motes.dialogue': 'number',
  'motes.activity': 'number',
  'workshop.copies': 'number',
  'workshop.spread': 'number',
  'tiers.guards': 'number',
  'tiers.constitution': 'number',
  'tiers.domain': 'number',
  'tiers.playbook': 'number',
  'tiers.arc': 'number',
  'tiers.task': 'number',
  'tiers.turn': 'number',
  'tiers.turbulence': 'number',
  'tiers.promotion': 'number',
  'overlay.strip': 'number',
  'overlay.effort': 'number',
  'overlay.effortVisible': 'number',
  clock: 'number',
  'sheet.opacity': 'number',
  'ink.opacity': 'number',
  'ink.drawn': 'number',
  'ink.redraw': 'number',
  'ink.flat': 'number',
  'ink.ring': 'number',
  'ink.tick': 'number',
  'stage.motes': 'number',
  'net.show': 'number',
  'net.growth': 'number',
  'net.fix': 'number',
  'net.highlight': 'number',
  'net.review': 'number',
  'net.focus': 'number',
  'net.lamp': 'number',
  'net.lampAt': 'number',
  'net.streams': 'number',
  'net.feed': 'number',
  'net.haze': 'number',
  'net.hoodHold': 'number',
  'freeze.hold': 'number',
  'freeze.dress': 'number',
  'freeze.flash': 'number',
};

/** Write one leaf. Throws on an unknown path or a value of the wrong shape. */
export function setPath(s: SceneState, path: string, value: number | Vec3): void {
  const kind = Object.hasOwn(SCENE_STATE_PATHS, path) ? SCENE_STATE_PATHS[path] : undefined;
  if (kind === undefined) throw new Error(`unknown scene state path "${path}"`);
  if (kind === 'number' ? typeof value !== 'number' : !isVec3(value)) {
    throw new Error(`scene state path "${path}" expects a ${kind}`);
  }
  const parts = path.split('.');
  const last = parts.pop() as string;
  let node = s as unknown as Record<string, unknown>;
  for (const p of parts) node = node[p] as Record<string, unknown>;
  node[last] = kind === 'vec3' ? [...(value as Vec3)] : value;
}

function mergeInto(base: unknown, partial: unknown): unknown {
  if (typeof base === 'number') {
    return typeof partial === 'number' && Number.isFinite(partial) ? partial : base;
  }
  if (Array.isArray(base)) {
    return isVec3(partial) ? [...partial] : [...base];
  }
  const out: Record<string, unknown> = {};
  const src = base as Record<string, unknown>;
  const p = typeof partial === 'object' && partial !== null ? (partial as Record<string, unknown>) : {};
  // Iterate base keys only: unknown keys in `partial` are ignored by construction.
  for (const key of Object.keys(src)) {
    out[key] = mergeInto(src[key], Object.hasOwn(p, key) ? p[key] : undefined);
  }
  return out;
}

/** Deep-merge a partial state (e.g. from `?state=`) onto `base`. Never mutates `base`; ignores unknown keys and malformed leaves. */
export function mergeState(base: SceneState, partial: unknown): SceneState {
  return mergeInto(base, partial) as SceneState;
}
