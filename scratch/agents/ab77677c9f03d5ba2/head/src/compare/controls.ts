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

export const PRESETS: readonly Preset[] = [
  preset('Specced', 'The right machine built from a spec: warm core, cool body, no faults.', {}),
  // The vibe build has no ghost (spec §5.2).
  preset('Vibed (wrong twin)', 'Built fast from a vague prompt: a polished, working, wrong machine, cool throughout.', {
    'mech.variant': 1,
    'provenance.vibed': 1,
  }),
  preset('Quiet failure', 'Built roughly right, but the polish went to the case and the core is thin.', {
    'provenance.misallocated': 1,
    'mech.ghost': 1,
  }),
  // The exploded look of the per-mechanism shots: core settled, offsets a quarter out.
  preset('Exploded', 'Mid-assembly: parts hang just off their places, against the ghost of the finished machine.', {
    'mech.assembly': 0.75,
    'mech.ghost': 1,
  }),
  preset('Faults 0.6', 'Every fault at 0.6: the machine malfunctions against the ghost of what was intended.', {
    ...allFaults(0.6),
    'mech.ghost': 1,
  }),
];

export interface RelativeCamera {
  /** Machine-relative, as in SceneState.camera. */
  pos: Vec3;
  target: Vec3;
  fov: number;
}

/** The scene state the sliders describe, seen from a machine-relative camera framing the whole machine. */
export function stateFromSliders(values: SliderValues, camera: RelativeCamera): SceneState {
  const s = defaultSceneState();
  for (const def of SLIDERS) setPath(s, def.path, values[def.path]);
  s.camera = { pos: [...camera.pos], target: [...camera.target], fov: camera.fov, focus: 0, coreFocus: 0 };
  return s;
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
  sideBySide: boolean;
  /** Name of the preset the sliders hold, or null once a slider has been moved by hand. */
  preset: string | null;
  /** Motes per machine, remembered separately for the single and side-by-side views. */
  budgets: { single: Budget; grid: Budget };
}

export interface PanelOptions {
  ids: readonly MechanismId[];
  meta: Record<MechanismId, MechanismMeta>;
  initial: PanelSettings;
  /** Anything the author changed (not the drive updates that play itself makes). */
  onChange(): void;
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

/** Build the panel into `root` and return its live settings. */
export function createPanel(root: HTMLElement, opts: PanelOptions): Panel {
  const s: PanelSettings = structuredClone(opts.initial);
  const changed = () => opts.onChange();

  // Mechanism picker: one button per registered mechanism, with the chosen one's blurb under it.
  const blurb = el('p', { className: 'blurb' });
  const pickButtons = opts.ids.map((id) =>
    el('button', { type: 'button', className: 'pick', textContent: opts.meta[id].label, title: opts.meta[id].blurb }),
  );
  pickButtons.forEach((b, i) => {
    b.dataset.mech = opts.ids[i];
    b.addEventListener('click', () => {
      s.mechanism = opts.ids[i];
      syncPicker();
      changed();
    });
  });
  const sideBySide = el('input', { type: 'checkbox', id: 'side-by-side', checked: s.sideBySide });
  sideBySide.addEventListener('change', () => {
    s.sideBySide = sideBySide.checked;
    syncPicker();
    syncBudget();
    changed();
  });
  function syncPicker(): void {
    pickButtons.forEach((b, i) => {
      b.setAttribute('aria-pressed', String(!s.sideBySide && opts.ids[i] === s.mechanism));
      b.disabled = s.sideBySide;
    });
    blurb.textContent = s.sideBySide
      ? 'All mechanisms at the same state. Drag any pane to orbit them together.'
      : opts.meta[s.mechanism].blurb;
  }

  // Sliders, by group.
  const inputs = new Map<SliderPath, { input: HTMLInputElement; out: HTMLOutputElement }>();
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
    input.addEventListener('input', () => {
      s.sliders[def.path] = Number(input.value);
      out.textContent = fmt(s.sliders[def.path]);
      s.preset = null; // the state is no longer the preset's
      syncPreset();
      changed();
    });
    inputs.set(def.path, { input, out });
    const row = el('div', { className: 'row', title: def.hint }, el('label', { htmlFor: id }, def.label), input, out);
    return row;
  }
  function showSliders(): void {
    for (const [path, { input, out }] of inputs) {
      input.value = String(s.sliders[path]);
      out.textContent = fmt(s.sliders[path]);
    }
  }

  // Play: a toggle and a speed slider under the drive slider.
  const play = el('button', { type: 'button', className: 'play' });
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
    presetBlurb.textContent = chosen
      ? `${chosen.name}: ${chosen.blurb[0].toLowerCase()}${chosen.blurb.slice(1)}`
      : 'Custom state. A preset sets every slider at once.';
  }

  // Budget (per view) and reset.
  const budget = el(
    'select',
    { id: 'budget' },
    ...BUDGETS.map((b) => el('option', { value: String(b), textContent: budgetLabel(b) })),
  );
  const view = (): 'single' | 'grid' => (s.sideBySide ? 'grid' : 'single');
  function syncBudget(): void {
    budget.value = String(s.budgets[view()]);
  }
  budget.addEventListener('change', () => {
    s.budgets[view()] = Number(budget.value) as Budget;
    changed();
  });
  const reset = el('button', { type: 'button', className: 'quiet', textContent: 'Reset view' });
  reset.addEventListener('click', () => opts.onResetView());

  const group = (name: SliderGroup, cls = '') =>
    el('div', { className: `sliders ${cls}` }, ...SLIDERS.filter((d) => d.group === name).map(sliderRow));
  const heading = (name: SliderGroup): HTMLElement[] => [
    el('h2', {}, name),
    el('p', { className: 'group-hint' }, GROUP_HINTS[name]),
  ];
  const machine = group('Machine');
  machine.append(playRow);

  root.append(
    el('h2', {}, 'Mechanism'),
    el('div', { className: 'picker' }, ...pickButtons),
    blurb,
    el(
      'div',
      { className: 'row toggles' },
      el('label', { className: 'check' }, sideBySide, 'Side by side'),
      el('label', { htmlFor: 'budget', className: 'sr-only' }, 'Motes per machine'),
      budget,
      reset,
    ),
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
  syncPicker();
  syncPreset();
  showSliders();
  syncPlay();
  syncBudget();

  return {
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
}
