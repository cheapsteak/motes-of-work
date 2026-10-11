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
/** Sliders the twin pair sets per pane, so they are shown as not in effect there. */
const TWIN_OVERRIDES: readonly SliderPath[] = ['mech.variant', 'provenance.vibed'];

/** Build the panel into `root` and return its live settings. */
export function createPanel(root: HTMLElement, opts: PanelOptions): Panel {
  const s: PanelSettings = structuredClone(opts.initial);
  const changed = () => opts.onChange();

  // Mechanism picker: one button per registered mechanism, with the chosen one's blurb under it.
  // Side by side shows every mechanism, so the picker is disabled and marks them all as on screen.
  const blurb = el('p', { className: 'blurb' });
  const picker = el('div', { className: 'picker' });
  const pickButtons = opts.ids.map((id) =>
    el('button', { type: 'button', className: 'pick', textContent: opts.meta[id].label, title: opts.meta[id].blurb }),
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
          ? `${label}, correct and specced (left) against its vibed wrong twin with no ghost (right).`
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
    for (const path of TWIN_OVERRIDES) inputs.get(path)?.row.classList.toggle('overridden', s.view === 'twin');
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

  root.append(
    el('h2', {}, 'Mechanism'),
    picker,
    blurb,
    el(
      'div',
      { className: 'row toggles' },
      el('div', { className: 'views', role: 'radiogroup', ariaLabel: 'View' }, ...viewRadios),
      el('label', { htmlFor: 'budget', className: 'sr-only' }, 'Motes per machine'),
      budget,
    ),
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
