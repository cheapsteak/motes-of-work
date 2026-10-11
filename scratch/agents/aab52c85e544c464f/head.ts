// The comparison page's side panel: what the author has set. Pure definitions first (sliders,
// presets, the slider → SceneState map, play arithmetic), then the DOM that edits them. Nothing here
// touches the DOM at import time, so the pure half is unit-tested in Node (controls.test.ts).
import type { Vec3 } from '../math/vec';
import type { MechanismId } from '../mechanisms';
import type { MechanismMeta } from '../mechanisms/meta';
import { defaultSceneState, FAULT_KEYS, setPath, type Faults, type SceneState } from '../timeline/sceneState';

export type FaultPath = `mech.faults.${keyof Faults}`;
/** Every slider is one SceneState leaf. */
export type SliderPath =
  | 'mech.assembly'
  | 'mech.variant'
  | 'mech.ghost'
  | 'mech.drive'
  | 'provenance.vibed'
  | 'provenance.misallocated'
  | FaultPath;
export type SliderValues = Record<SliderPath, number>;
export type SliderGroup = 'Machine' | 'Provenance' | 'Faults';

/** The visible one-line hint under each group's heading. */
export const GROUP_HINTS: Record<SliderGroup, string> = {
  Machine: 'How built it is, which variant, its ghost and its clock.',
  Provenance: 'Who shaped the motes; both at 0 is specced.',
  Faults: 'Malfunctions of this machine, read against the ghost.',
};

export interface SliderDef {
  path: SliderPath;
  label: string;
  /** Tooltip: what the dial does. */
  hint: string;
  group: SliderGroup;
  min: number;
  max: number;
  step: number;
}

/** Drive runs 0..DRIVE_MAX machine cycles; play wraps back to 0 at the end. */
export const DRIVE_MAX = 10;

const FAULT_HINTS: Record<keyof Faults, string> = {
  misalign: 'Parts wobble off-axis',
  slip: 'The driven part lags its driver in jerks',
  bind: 'Motion slows at certain angles',
  jitter: 'Fine high-frequency shake',
  ratio: 'The output runs at the wrong speed',
  stall: 'Periodic stop, then catch-up',
  drift: 'Settled motes detach and wander from their parts',
};

const unit = (path: SliderPath, label: string, hint: string, group: SliderGroup): SliderDef => ({
  path,
  label,
  hint,
  group,
  min: 0,
  max: 1,
  step: 0.01,
});

export const SLIDERS: readonly SliderDef[] = [
  unit('mech.assembly', 'Assembly', '0 is a nebula of loose motes, 1 the assembled machine', 'Machine'),
  unit('mech.variant', 'Wrong twin', 'Blend from the correct machine (0) to its wrong twin (1)', 'Machine'),
  unit('mech.ghost', 'Ghost', 'Opacity of the dotted ghost of the intended machine', 'Machine'),
  {
    path: 'mech.drive',
    label: 'Drive',
    hint: "The machine's own clock, in cycles",
    group: 'Machine',
    min: 0,
    max: DRIVE_MAX,
    step: 0.001,
  },
  unit('provenance.vibed', 'Vibed', 'Share of motes built without a spec: cool throughout', 'Provenance'),
  unit(
    'provenance.misallocated',
    'Misallocated',
    'Share of motes with detail in the wrong place: warm on the case, sparse core',
    'Provenance',
  ),
  ...FAULT_KEYS.map((k) => unit(`mech.faults.${k}`, k[0].toUpperCase() + k.slice(1), FAULT_HINTS[k], 'Faults')),
];

export interface Preset {
  name: string;
  /** One sentence for the author: what this state shows. */
  blurb: string;
  values: SliderValues;
}

const allFaults = (x: number) =>
  Object.fromEntries(FAULT_KEYS.map((k) => [`mech.faults.${k}`, x])) as Record<FaultPath, number>;

/** A preset spells out every slider: the specced machine, then the preset's own values. */
function preset(name: string, blurb: string, own: Partial<SliderValues>): Preset {
  const specced: SliderValues = {
    'mech.assembly': 1,
    'mech.variant': 0,
    'mech.ghost': 0,
    'mech.drive': 0.15,
    'provenance.vibed': 0,
    'provenance.misallocated': 0,
    ...allFaults(0),
  };
  return { name, blurb, values: { ...specced, ...own } };
}

// Ghost is never 1 in a preset: a full ghost washes the pane and hides the provenance colouring
// (visual review, change 4). Jitter in Faults is capped at 0.25, or it smears every machine (change 15).
export const PRESETS: readonly Preset[] = [
  preset('Specced', 'The right machine built from a spec: warm core, cool body, no faults.', {}),
  // The vibe build has no ghost (spec §5.2).
  preset('Vibed (wrong twin)', 'Built fast from a vague prompt: a polished, working, wrong machine, cool throughout.', {
    'mech.variant': 1,
    'provenance.vibed': 1,
  }),
  preset('Quiet failure', 'Built roughly right, but the polish went to the case and the core is thin.', {
    'provenance.misallocated': 1,
    'mech.ghost': 0.4,
  }),
  // The exploded look of the per-mechanism shots: core settled, offsets a quarter out.
  preset('Exploded', 'Mid-assembly: parts hang just off their places, against the ghost of the finished machine.', {
    'mech.assembly': 0.75,
    'mech.ghost': 0.6,
  }),
  preset('Faults 0.6', 'Every fault at 0.6 (jitter 0.25): the machine malfunctions against the ghost of its intent.', {
    ...allFaults(0.6),
    'mech.faults.jitter': 0.25,
    'mech.ghost': 0.6,
  }),
];

/** The line under the presets: the name, an em dash, the description, and the ghost it sets. */
export function presetText(p: Preset): string {
  const ghost = p.values['mech.ghost'];
  return `${p.name} — ${p.blurb[0].toLowerCase()}${p.blurb.slice(1)} ${ghost === 0 ? 'No ghost.' : `Ghost ${ghost}.`}`;
}

/** How the panes are laid out: one machine, one machine as correct | wrong twin, or every machine. */
export type ViewMode = 'single' | 'twin' | 'grid';
export const VIEW_MODES: readonly { mode: ViewMode; label: string; hint: string }[] = [
  { mode: 'single', label: 'Single', hint: 'One mechanism at the state the sliders set' },
  {
    mode: 'twin',
    label: 'Twin pair',
    hint: 'One mechanism twice: left correct and specced (variant 0, vibed 0), right the vibed wrong twin (variant 1, vibed 1, no ghost)',
  },
  { mode: 'grid', label: 'Side by side', hint: 'Every mechanism at the same state, 2×2' },
];

/**
 * Twin pair: the sliders as set, as the correct specced machine (left) and as the vibed wrong twin
 * with no ghost (right). Everything else (assembly, drive, faults, misallocation) applies to both.
 */
export function twinPair(values: SliderValues): [SliderValues, SliderValues] {
  return [
    { ...values, 'mech.variant': 0, 'provenance.vibed': 0 },
    { ...values, 'mech.variant': 1, 'provenance.vibed': 1, 'mech.ghost': 0 },
  ];
}

export interface RelativeCamera {
  /** Machine-relative, as in SceneState.camera. */
  pos: Vec3;
  target: Vec3;
  fov: number;
  /** 0 frames the whole machine, 1 its core (SceneState.camera.coreFocus). Default 0. */
  coreFocus?: number;
}

export interface CameraPreset extends RelativeCamera {
  name: string;
  coreFocus: number;
}

/**
 * Framings for the camera row, machine-relative so each frames any mechanism: the three-quarter
 * view of the per-mechanism shots, then the story's cold open and spec close-up and two plain views
 * (visual review section 4 item 2, and change 7). Orbit and Reset view work about the chosen one.
 */
export const CAMERAS: readonly CameraPreset[] = [
  { name: 'Three-quarter', pos: [1.6, 1.1, 2.4], target: [0, 0, 0], fov: 40, coreFocus: 0 },
  { name: 'Cold open', pos: [1.35, 0.3, 2.7], target: [0.05, -0.05, 0], fov: 40, coreFocus: 0 },
  { name: 'Spec (core)', pos: [-0.9, 0.35, 3.4], target: [-0.9, -0.1, 0], fov: 35, coreFocus: 1 },
  { name: 'Head-on', pos: [0, 0, 3.1], target: [0, 0, 0], fov: 40, coreFocus: 0 },
  { name: 'Side, low', pos: [0.1, 0.12, 2.9], target: [0, -0.15, 0], fov: 40, coreFocus: 0 },
];

/** The scene state the sliders describe, seen from a machine-relative camera. */
export function stateFromSliders(values: SliderValues, camera: RelativeCamera): SceneState {
  const s = defaultSceneState();
  for (const def of SLIDERS) setPath(s, def.path, values[def.path]);
  s.camera = {
    pos: [...camera.pos],
    target: [...camera.target],
    fov: camera.fov,
    focus: 0,
    coreFocus: camera.coreFocus ?? 0,
  };
  return s;
}

/** The drive nudge buttons' step, and the drive slider's arrow-key step (cycles). */
export const DRIVE_NUDGE = 0.02;
export const DRIVE_KEY_STEP = 0.01;

/**
 * Drive moved by `delta`, clamped to [0, DRIVE_MAX] and rounded to 1e-9 so a step of 0.02 is
 * exactly 0.02 on screen (0.15 + 0.02 is 0.16999999999999998 in floating point).
 */
export function nudgeDrive(drive: number, delta: number): number {
  const from = Number.isFinite(drive) ? drive : 0;
  const to = Math.min(DRIVE_MAX, Math.max(0, from + delta));
  return Math.round(to * 1e9) / 1e9;
}

/** Drive while playing: `rate` cycles per second for `seconds` from `start`, wrapped into [0, DRIVE_MAX). */
export function playDrive(start: number, rate: number, seconds: number): number {
  const wrap = (x: number): number => {
    const r = x % DRIVE_MAX;
    return r < 0 ? r + DRIVE_MAX : r;
  };
  const from = Number.isFinite(start) ? start : 0;
  const d = from + rate * seconds;
  return wrap(Number.isFinite(d) ? d : from);
}

// ---------------------------------------------------------------------------------------------
