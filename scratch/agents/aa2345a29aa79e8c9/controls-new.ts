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
  preset('Vibed (wrong twin)', 'Built fast from a vague prompt: polished, working, wrong, cool throughout.', {
    'mech.variant': 1,
    'provenance.vibed': 1,
  }),
  preset('Quiet failure', 'Built roughly right, but the polish went to the case and the core is thin.', {
    'provenance.misallocated': 1,
    'mech.ghost': 0.4,
  }),
  // The exploded look of the per-mechanism shots: core settled, offsets a quarter out.
  preset('Exploded', 'Mid-assembly: parts hang just off their places, against the ghost of the whole.', {
    'mech.assembly': 0.75,
    'mech.ghost': 0.6,
  }),
  preset('Faults 0.6', 'Every fault at 0.6 but jitter (0.25): the machine malfunctions against its ghost.', {
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
    hint: 'One mechanism twice: left correct (variant 0, vibed 0), right the vibed wrong twin (variant 1, vibed 1, no ghost)',
  },
  { mode: 'grid', label: 'Side by side', hint: 'Every mechanism at the same state, in a grid' },
];

/** Side by side: columns and rows for `n` panes, near square, wider than tall (4 → 2×2, 5 → 3×2). */
export function gridShape(n: number): { cols: number; rows: number } {
  const cols = Math.max(1, Math.ceil(Math.sqrt(n)));
  return { cols, rows: Math.max(1, Math.ceil(n / cols)) };
}

/**
 * Twin pair: the sliders as set, as the correct, unvibed machine (left) and as the vibed wrong twin
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
 * view of the per-mechanism shots, then the story's cold open and spec close-up (the keys at the end of
 * those sections in keyframes.json, so the machine sits right of where the text panel would be) and
 * two plain views (visual review section 4 item 2, and change 7). Orbit and Reset view work about the
 * chosen one.
 */
export const CAMERAS: readonly CameraPreset[] = [
  { name: 'Three-quarter', pos: [1.6, 1.1, 2.4], target: [0, 0, 0], fov: 40, coreFocus: 0 },
  { name: 'Cold open', pos: [1.528, -0.12, 2.103], target: [-0.392, 0.025, 0.285], fov: 40, coreFocus: 0 },
  { name: 'Spec (core)', pos: [0.406, 0.049, 4.137], target: [-0.957, -0.3, 0.393], fov: 35, coreFocus: 1 },
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

/**
 * The vertical fov (degrees) a pane of `aspect` uses for a framing of `fov`: the framing's fov in a
 * landscape pane; in a portrait pane (Twin pair at most window sizes) wide enough that the
 * horizontal fov is the framing's, so the machine is not cropped at the sides.
 */
export function fitFov(fov: number, aspect: number): number {
  if (!(aspect > 0) || aspect >= 1) return fov;
  const half = (fov * Math.PI) / 360;
  return (Math.atan(Math.tan(half) / aspect) * 360) / Math.PI;
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
// DOM

export type Budget = 30_000 | 100_000;
export const BUDGETS: readonly Budget[] = [30_000, 100_000];

export interface PanelSettings {
  mechanism: MechanismId;
  sliders: SliderValues;
  playing: boolean;
  /** Play speed, cycles per second. */
  rate: number;
  view: ViewMode;
  /** Name of the chosen CAMERAS framing: where Reset view returns and what orbit starts from. */
  camera: string;
  /** Name of the preset the sliders hold, or null once a slider has been moved by hand. */
  preset: string | null;
  /** Motes per machine, one budget for every view. */
  budget: Budget;
}

export interface PanelOptions {
  ids: readonly MechanismId[];
  meta: Record<MechanismId, MechanismMeta>;
  initial: PanelSettings;
  /** Where the budget selector goes: the panel header, beside the page title. */
  header: HTMLElement;
  /** Anything the author changed (not the drive updates that play itself makes). */
  onChange(): void;
  /** Put the camera back on the chosen framing (also called when a camera button picks a new one). */
  onResetView(): void;
}

export interface Panel {
  /** The live settings; read them, never write them (the panel owns them). */
  settings(): Readonly<PanelSettings>;
  /** Show the drive that play computed, without firing onChange. */
  showDrive(drive: number): void;
}

const RATE = { min: 0.05, max: 1, step: 0.05 };

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const e = Object.assign(document.createElement(tag), props);
  e.append(...children);
  return e;
}

const fmt = (v: number): string => v.toFixed(2);
const budgetLabel = (b: Budget): string => `${b / 1000}k motes`;
/** Arrow keys on the drive slider step DRIVE_KEY_STEP (its own step, 0.001, is too fine to scrub). */
const ARROW_DIRECTION: Record<string, number> = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 };
/** Sliders the twin pair sets per pane, so they are disabled (and dimmed) there. */
const TWIN_OVERRIDES: readonly SliderPath[] = ['mech.variant', 'provenance.vibed'];

/** Build the panel into `root` and return its live settings. */
export function createPanel(root: HTMLElement, opts: PanelOptions): Panel {
  const s: PanelSettings = structuredClone(opts.initial);
  const changed = () => opts.onChange();

  // Mechanism picker: one button per registered mechanism, with the chosen one's blurb under it.
  // Side by side shows every mechanism, so the picker is disabled and marks them all as on screen.
  const blurb = el('p', { className: 'blurb' });
  const picker = el('div', { className: 'picker' });
  // Buttons show the label's first word ("Steam", "Watch") so every mechanism fits one line; the title says the rest.
  const pickButtons = opts.ids.map((id) =>
    el('button', {
      type: 'button',
      className: 'pick',
      textContent: opts.meta[id].label.split(' ')[0],
      title: `${opts.meta[id].label}: ${opts.meta[id].blurb}`,
    }),
  );
  picker.append(...pickButtons);
  pickButtons.forEach((b, i) => {
    b.dataset.mech = opts.ids[i];
    b.addEventListener('click', () => {
      s.mechanism = opts.ids[i];
      syncPicker();
      changed();
    });
  });
  function syncPicker(): void {
    const grid = s.view === 'grid';
    picker.classList.toggle('all', grid);
    pickButtons.forEach((b, i) => {
      b.setAttribute('aria-pressed', String(!grid && opts.ids[i] === s.mechanism));
      b.disabled = grid;
    });
    const label = opts.meta[s.mechanism].label;
    blurb.textContent =
      s.view === 'grid'
        ? 'All mechanisms at the same state. Drag any pane to orbit them together.'
        : s.view === 'twin'
          ? `${label}: correct (left), vibed wrong twin with no ghost (right). Other sliders apply to both.`
          : opts.meta[s.mechanism].blurb;
  }

  // View mode: radio buttons, one per mode.
  const viewRadios = VIEW_MODES.map((v) => {
    const input = el('input', { type: 'radio', name: 'view', value: v.mode, checked: v.mode === s.view });
    input.addEventListener('change', () => {
      if (!input.checked) return;
      s.view = v.mode;
      syncPicker();
      syncTwinRows();
      changed();
    });
    return el('label', { className: 'check', title: v.hint }, input, v.label);
  });

  // Sliders, by group.
  const inputs = new Map<SliderPath, { input: HTMLInputElement; out: HTMLOutputElement; row: HTMLElement }>();
  function sliderRow(def: SliderDef): HTMLElement {
    const id = `slider-${def.path.replaceAll('.', '-')}`;
    const input = el('input', {
      type: 'range',
      id,
      min: String(def.min),
      max: String(def.max),
      step: String(def.step),
    });
    input.dataset.path = def.path;
    const out = el('output');
    out.htmlFor.add(id);
    const set = (v: number): void => {
      s.sliders[def.path] = v;
      out.textContent = fmt(v);
      s.preset = null; // the state is no longer the preset's
      syncPreset();
      changed();
    };
    input.addEventListener('input', () => set(Number(input.value)));
    if (def.path === 'mech.drive') {
      input.addEventListener('keydown', (e) => {
        const dir = ARROW_DIRECTION[e.key];
        if (dir === undefined) return;
        e.preventDefault();
        const v = nudgeDrive(s.sliders[def.path], dir * DRIVE_KEY_STEP);
        input.value = String(v);
        set(v);
      });
    }
    const row = el('div', { className: 'row', title: def.hint }, el('label', { htmlFor: id }, def.label), input, out);
    inputs.set(def.path, { input, out, row });
    return row;
  }
  function showSliders(): void {
    for (const [path, { input, out }] of inputs) {
      input.value = String(s.sliders[path]);
      out.textContent = fmt(s.sliders[path]);
    }
  }
  function syncTwinRows(): void {
    for (const path of TWIN_OVERRIDES) {
      const entry = inputs.get(path);
      if (!entry) continue;
      entry.row.classList.toggle('overridden', s.view === 'twin');
      entry.input.disabled = s.view === 'twin';
    }
  }

  // Play: a toggle, drive nudges (to scrub a stall or a slip by hand), and a speed slider.
  const play = el('button', { type: 'button', className: 'play' });
  const nudges = [-DRIVE_NUDGE, DRIVE_NUDGE].map((delta) => {
    const b = el('button', {
      type: 'button',
      className: 'nudge',
      textContent: `${delta < 0 ? '−' : '+'}${Math.abs(delta)}`,
      title: `Drive ${delta < 0 ? 'back' : 'forward'} ${Math.abs(delta)} cycles`,
    });
    b.dataset.nudge = String(delta);
    b.addEventListener('click', () => {
      const drive = nudgeDrive(s.sliders['mech.drive'], delta);
      panel.showDrive(drive);
      changed(); // restarts play (if on) from the nudged drive
    });
    return b;
  });
  const rate = el('input', {
    type: 'range',
    id: 'play-rate',
    min: String(RATE.min),
    max: String(RATE.max),
    step: String(RATE.step),
    value: String(s.rate),
  });
  const rateOut = el('output');
  rateOut.htmlFor.add('play-rate');
  function syncPlay(): void {
    play.textContent = s.playing ? 'Pause' : 'Play'; // the label says what a click does
    rateOut.textContent = `${s.rate.toFixed(2)}/s`;
  }
  play.addEventListener('click', () => {
    s.playing = !s.playing;
    syncPlay();
    changed();
  });
  rate.addEventListener('input', () => {
    s.rate = Number(rate.value);
    syncPlay();
    changed();
  });
  const playRow = el(
    'div',
    { className: 'row play-row', title: 'Animate drive from the clock, in cycles per second' },
    play,
    ...nudges,
    el('label', { htmlFor: 'play-rate' }, 'Speed'),
    rate,
    rateOut,
  );

  // Presets: the last one clicked stays marked (until a slider moves), with its description below.
  const presetBlurb = el('p', { className: 'preset-blurb' });
  const presets = PRESETS.map((p) => {
    const b = el('button', { type: 'button', className: 'preset', textContent: p.name });
    b.addEventListener('click', () => {
      s.sliders = { ...p.values };
      s.preset = p.name;
      showSliders();
      syncPreset();
      changed();
    });
    return b;
  });
  function syncPreset(): void {
    presets.forEach((b, i) => b.setAttribute('aria-pressed', String(PRESETS[i].name === s.preset)));
    const chosen = PRESETS.find((p) => p.name === s.preset);
    presetBlurb.textContent = chosen ? presetText(chosen) : 'Custom state. A preset sets every slider at once.';
  }

  // One budget for every view.
  const budget = el(
    'select',
    { id: 'budget', title: 'Motes per machine, in every view' },
    ...BUDGETS.map((b) => el('option', { value: String(b), textContent: budgetLabel(b) })),
  );
  budget.addEventListener('change', () => {
    s.budget = Number(budget.value) as Budget;
    changed();
  });

  // Camera: a framing per button; orbit starts from it and Reset view returns to it.
  const cameraButtons = CAMERAS.map((c) => {
    const b = el('button', { type: 'button', className: 'camera', textContent: c.name });
    b.dataset.camera = c.name;
    b.addEventListener('click', () => {
      s.camera = c.name;
      syncCamera();
      opts.onResetView();
    });
    return b;
  });
  function syncCamera(): void {
    cameraButtons.forEach((b, i) => b.setAttribute('aria-pressed', String(CAMERAS[i].name === s.camera)));
  }
  const reset = el('button', {
    type: 'button',
    className: 'quiet',
    textContent: 'Reset view',
    title: 'Back to the chosen framing',
  });
  reset.addEventListener('click', () => opts.onResetView());

  const group = (name: SliderGroup, cls = '') =>
    el('div', { className: `sliders ${cls}` }, ...SLIDERS.filter((d) => d.group === name).map(sliderRow));
  const heading = (name: SliderGroup): HTMLElement[] => [
    el('h2', {}, name),
    el('p', { className: 'group-hint' }, GROUP_HINTS[name]),
  ];
  const machine = group('Machine');
  machine.append(playRow);

  opts.header.append(el('label', { htmlFor: 'budget', className: 'sr-only' }, 'Motes per machine'), budget);
  // ARIA as attributes: the role / ariaLabel reflections are not in every browser.
  const views = el('div', { className: 'views' }, ...viewRadios);
  views.setAttribute('role', 'radiogroup');
  views.setAttribute('aria-label', 'View');
  root.append(
    picker,
    blurb,
    views,
    el('h2', {}, 'Camera'),
    el('div', { className: 'cameras' }, ...cameraButtons, reset),
    el('h2', {}, 'Presets'),
    el('div', { className: 'presets' }, ...presets),
    presetBlurb,
    ...heading('Machine'),
    machine,
    ...heading('Provenance'),
    group('Provenance', 'two'),
    ...heading('Faults'),
    group('Faults', 'two'),
  );
  budget.value = String(s.budget);
  syncPicker();
  syncPreset();
  showSliders();
  syncTwinRows();
  syncPlay();
  syncCamera();

  const panel: Panel = {
    settings: () => s,
    showDrive(drive) {
      s.sliders['mech.drive'] = drive;
      const d = inputs.get('mech.drive');
      if (d) {
        d.input.value = String(drive);
        d.out.textContent = fmt(drive);
      }
    },
  };
  return panel;
}
