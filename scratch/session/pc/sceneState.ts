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
   */
  camera: { pos: Vec3; target: Vec3; fov: number; focus: number; coreFocus: number };
  mech: {
    assembly: number; // 0 exploded → 1 assembled
    variant: number; // 0 correct → 1 wrong twin
    drive: number; // the machine's own clock
    faults: Faults;
    ghost: number; // ghost opacity
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
  /** `rider`: opacity of the mechanism's rider (the bicycle's reveal mannequin), 0..1. */
  overlay: { strip: number; effort: number; effortVisible: number; rider: number };
  clock: number; // τ: scroll-derived clock for Act II field effects
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
    camera: { pos: [0, 0, 3.1], target: [0, 0, 0], fov: 40, focus: 0, coreFocus: 0 },
    mech: { assembly: 1, variant: 0, drive: 0, faults: { ...ZERO_FAULTS }, ghost: 0 },
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
    overlay: { strip: 0, effort: 0, effortVisible: 0, rider: 0 },
    clock: 0,
  };
}

/** Every leaf of SceneState (a Vec3 is one leaf). A test keeps this in sync with defaultSceneState(). */
export const SCENE_STATE_PATHS: Record<string, 'number' | 'vec3'> = {
  'camera.pos': 'vec3',
  'camera.target': 'vec3',
  'camera.fov': 'number',
  'camera.focus': 'number',
  'camera.coreFocus': 'number',
  'mech.assembly': 'number',
  'mech.variant': 'number',
  'mech.drive': 'number',
  'mech.faults.misalign': 'number',
  'mech.faults.slip': 'number',
  'mech.faults.bind': 'number',
  'mech.faults.jitter': 'number',
  'mech.faults.ratio': 'number',
  'mech.faults.stall': 'number',
  'mech.faults.drift': 'number',
  'mech.ghost': 'number',
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
  'overlay.rider': 'number',
  clock: 'number',
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
