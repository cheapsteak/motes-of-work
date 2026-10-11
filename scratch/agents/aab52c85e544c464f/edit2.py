p = '/home/user/mow-compare/src/compare/compare.ts'
s = open(p).read()


def rep(old, new):
    global s
    assert old in s, old[:80]
    s = s.replace(old, new)


rep('''// Mechanism comparison page: one mechanism (or all of them, 2×2) at a state set by sliders, orbited
// with OrbitControls.''', '''// Mechanism comparison page: one mechanism, one mechanism as correct | wrong twin, or all of them
// (2×2), at a state set by sliders, orbited with OrbitControls.''')
rep('''// and zoom (scaled to each machine), and a newly picked mechanism is framed at the current angle.''',
    '''// and zoom (scaled to each machine), and a newly picked mechanism is framed at the current angle.
// The camera row picks the framing (CAMERAS) the rig starts from; its coreFocus moves the anchor the
// rig is mapped through from the whole machine to its core, so orbit then circles the core.''')
rep('''import { BUDGETS, createPanel, playDrive, PRESETS, stateFromSliders, type Budget } from './controls';''',
    '''import {
  BUDGETS,
  CAMERAS,
  createPanel,
  playDrive,
  PRESETS,
  stateFromSliders,
  twinPair,
  type CameraPreset,
  type SliderValues,
} from './controls';
import { applyLighting, createLightingDev, type LightingDev } from './lightingDev';''')
rep('''  /** The scene state of the latest frame (camera machine-relative). */
  state(): SceneState;''', '''  /** The scene state of the latest frame (camera machine-relative); in Twin pair, the left pane's. */
  state(): SceneState;
  /** The scene state of each drawn pane in the latest frame, in pane order. */
  paneStates(): SceneState[];''')
rep('''/** The three-quarter view the per-mechanism shots use: above, right and in front (machine-relative). */
const HOME: { pos: Vec3; target: Vec3 } = { pos: [1.6, 1.1, 2.4], target: [0, 0, 0] };
const FOV = 40;
const PANES_IN_GRID = 4;
''', '''const PANES_IN_GRID = 4;
''')
rep('''/** `?budget=30000|100000` sets the starting budget of both views. */
const budgetParam = BUDGETS.find((b) => String(b) === params.get('budget'));''',
    '''/** `?budget=30000|100000` sets the starting budget (one for every view; 100k otherwise). */
const budgetParam = BUDGETS.find((b) => String(b) === params.get('budget'));
/** `?dev=1` adds the collapsed "Lighting (dev)" group. Never linked from the essay. */
const devMode = params.get('dev') === '1';''')
rep('''const rig = new PerspectiveCamera(FOV, 1, 0.01, 100);
const controls = new OrbitControls(rig, canvas);
controls.enableDamping = !testMode;
controls.minDistance = 0.3;
controls.maxDistance = 12;
function resetView(): void {
  rig.position.set(...HOME.pos);
  controls.target.set(...HOME.target);
  controls.update();
  requestFrame();
}
resetView();
controls.addEventListener('change', () => requestFrame());
''', '''const rig = new PerspectiveCamera(CAMERAS[0].fov, 1, 0.01, 100);
const controls = new OrbitControls(rig, canvas);
controls.enableDamping = !testMode;
controls.minDistance = 0.3;
controls.maxDistance = 12;
controls.addEventListener('change', () => requestFrame());

/** The camera row's chosen framing. */
function framing(): CameraPreset {
  const name = panel.settings().camera;
  return CAMERAS.find((c) => c.name === name) ?? CAMERAS[0];
}
/** Put the rig on the chosen framing: orbit then circles its target. */
function resetView(): void {
  const f = framing();
  rig.position.set(...f.pos);
  controls.target.set(...f.target);
  rig.fov = f.fov;
  rig.updateProjectionMatrix();
  controls.update();
  requestFrame();
}
''')
rep('''function buildThenDraw(ids: MechanismId[], budget: Budget): void {
  if (building) return;
  building = true;
  const names = ids.map((id) => mechanismMeta[id].label.toLowerCase()).join(', ');
  buildingEl.textContent = `Building ${names}, ${budget / 1000}k motes…`;
  buildingEl.hidden = false;
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      for (const id of ids) systems.get(id, budget);
      buildingEl.hidden = true;
      building = false;
      requestFrame();
    }),
  );
}''', '''function buildThenDraw(ids: MechanismId[], budget: number): void {
  if (building) return;
  building = true;
  const names = ids.map((id) => mechanismMeta[id].label.toLowerCase()).join(', ');
  buildingEl.textContent = `Building ${names}, ${budget / 1000}k motes…`;
  buildingEl.hidden = false;
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      // A throwing build must not leave the overlay up or block every later build.
      try {
        for (const id of ids) systems.get(id, budget);
      } finally {
        buildingEl.hidden = true;
        building = false;
        requestFrame();
      }
    }),
  );
}''')
rep('''    playing: false,
    rate: 0.25,
    sideBySide: false,
    preset: PRESETS[0].name,
    budgets: { single: budgetParam ?? 100_000, grid: budgetParam ?? 30_000 },
  },
  onChange,
  onResetView: resetView,
});
''', '''    playing: false,
    rate: 0.25,
    view: 'single',
    camera: CAMERAS[0].name,
    preset: PRESETS[0].name,
    budget: budgetParam ?? 100_000,
  },
  onChange,
  onResetView: resetView,
});
resetView();

const lightingDev: LightingDev | null = devMode
  ? createLightingDev(document.getElementById('controls') as HTMLElement, () => requestFrame())
  : null;
''')
rep('''/** The mechanism in each pane: one in the single view; the registry, padded to four, side by side. */
function panes(): (MechanismId | null)[] {
  const s = panel.settings();
  if (!s.sideBySide) return [s.mechanism];
  return Array.from({ length: PANES_IN_GRID }, (_, i) => MECHANISM_IDS[i] ?? null);
}

let paneSignature = '';
/** Label overlays, one per pane (they never take pointer events, so dragging reaches the canvas). */
function layoutPanes(): void {
  const list = panes();
  const signature = `${panel.settings().sideBySide}:${list.join(',')}`;
  if (signature === paneSignature) return;
  paneSignature = signature;
  panesEl.className = panel.settings().sideBySide ? 'grid' : 'single';
  panesEl.replaceChildren(
    ...list.map((id) => {
      const pane = document.createElement('div');
      pane.className = id === null ? 'pane empty' : 'pane';
      if (id === null) {
        pane.textContent = 'Not yet built';
      } else {
        const label = document.createElement('div');
        label.className = 'label';
        label.textContent = mechanismMeta[id].label;
        pane.append(label);
      }
      return pane;
    }),
  );
}
layoutPanes();

function currentState(): SceneState {
  const pos = rig.position.toArray() as Vec3;
  const target = controls.target.toArray() as Vec3;
  return stateFromSliders(panel.settings().sliders, { pos, target, fov: FOV });
}

let latest: { state: SceneState; ids: MechanismId[] } | null = null;
let frameCount = 0;

/** One frame: every pane at the same slider state, through the shared rig. */
function draw(now: number): void {
  if (!renderer) return;
  const settings = panel.settings();
  const list = panes();
  const budget = settings.budgets[settings.sideBySide ? 'grid' : 'single'];
  // A budget or view change frees the systems of every other budget.
  systems.keepOnly(budget);
  const missing = list.filter((id): id is MechanismId => id !== null && !systems.has(id, budget));
  if (missing.length > 0) {
    buildThenDraw(missing, budget);
    return;
  }
  if (settings.playing) {
    panel.showDrive(playDrive(playFrom.drive, settings.rate, Math.max(0, now - playFrom.time) / 1000));
  }
  const state = currentState();
  const cols = settings.sideBySide ? 2 : 1;
  const rows = cols;
  const width = canvas.clientWidth;''', '''/** One pane: its mechanism (null for an empty grid slot), its label, and the slider values it shows. */
interface Pane {
  id: MechanismId | null;
  label: string;
  /** Twin pair: the per-pane values (twinPair); otherwise the sliders as set. */
  values(sliders: SliderValues): SliderValues;
}
const asSet = (v: SliderValues): SliderValues => v;

/**
 * The panes of the current view mode: one mechanism; one mechanism as correct | wrong twin; or the
 * registry, padded to four, side by side (row-major).
 */
function panes(): Pane[] {
  const s = panel.settings();
  const label = mechanismMeta[s.mechanism].label;
  if (s.view === 'single') return [{ id: s.mechanism, label, values: asSet }];
  if (s.view === 'twin') {
    return [
      { id: s.mechanism, label: `${label} · correct, specced`, values: (v) => twinPair(v)[0] },
      { id: s.mechanism, label: `${label} · wrong twin, vibed`, values: (v) => twinPair(v)[1] },
    ];
  }
  return Array.from({ length: PANES_IN_GRID }, (_, i) => {
    const id = MECHANISM_IDS[i] ?? null;
    return { id, label: id === null ? 'Not yet built' : mechanismMeta[id].label, values: asSet };
  });
}
/** Columns and rows of the pane layout. */
function paneGrid(): { cols: number; rows: number } {
  const view = panel.settings().view;
  return view === 'grid' ? { cols: 2, rows: 2 } : view === 'twin' ? { cols: 2, rows: 1 } : { cols: 1, rows: 1 };
}

let paneSignature = '';
/** Label overlays, one per pane (they never take pointer events, so dragging reaches the canvas). */
function layoutPanes(): void {
  const list = panes();
  const view = panel.settings().view;
  const signature = `${view}:${list.map((p) => p.label).join(',')}`;
  if (signature === paneSignature) return;
  paneSignature = signature;
  panesEl.className = view;
  panesEl.replaceChildren(
    ...list.map((p) => {
      const pane = document.createElement('div');
      pane.className = p.id === null ? 'pane empty' : 'pane';
      if (p.id === null) {
        pane.textContent = p.label;
      } else {
        const label = document.createElement('div');
        label.className = 'label';
        label.textContent = p.label;
        pane.append(label);
      }
      return pane;
    }),
  );
}
layoutPanes();

/** The scene state of `values` through the rig, in the chosen framing's fov and core focus. */
function currentState(values: SliderValues = panel.settings().sliders): SceneState {
  const pos = rig.position.toArray() as Vec3;
  const target = controls.target.toArray() as Vec3;
  const { fov, coreFocus } = framing();
  return stateFromSliders(values, { pos, target, fov, coreFocus });
}

let latest: { states: SceneState[]; ids: MechanismId[] } | null = null;
let frameCount = 0;

/** One frame: every pane at its slider state, through the shared rig. */
function draw(now: number): void {
  if (!renderer) return;
  const settings = panel.settings();
  const list = panes();
  const budget = settings.budget;
  // A budget change frees the systems of every other budget.
  systems.keepOnly(budget);
  const missing = [
    ...new Set(list.flatMap((p) => (p.id !== null && !systems.has(p.id, budget) ? [p.id] : []))),
  ];
  if (missing.length > 0) {
    buildThenDraw(missing, budget);
    return;
  }
  if (settings.playing) {
    panel.showDrive(playDrive(playFrom.drive, settings.rate, Math.max(0, now - playFrom.time) / 1000));
  }
  const { cols, rows } = paneGrid();
  const width = canvas.clientWidth;''')
rep('''  const shimmerTime = shimmerOn() ? (now / 1000) % 1000 : null;

  renderer.setScissorTest(true);
  list.forEach((id, i) => {''', '''  const shimmerTime = shimmerOn() ? (now / 1000) % 1000 : null;
  const lighting = lightingDev?.values();
  const states: SceneState[] = [];

  renderer.setScissorTest(true);
  list.forEach(({ id, values }, i) => {''')
rep('''    const camera = paneCameras[i];
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
    applyCamera(camera, state, mechanismAnchors(mechanisms[id]));
    const { motes, scene } = systems.get(id, budget);
    motes.update(state, camera, { width: w * pixelRatio, height: h * pixelRatio }, shimmerTime);
    renderer.render(scene, camera);
  });
  renderer.setScissorTest(false);

  latest = { state, ids: list.filter((id): id is MechanismId => id !== null) };
  frameCount++;''', '''    const state = currentState(values(settings.sliders));
    states.push(state);
    const camera = paneCameras[i];
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
    applyCamera(camera, state, mechanismAnchors(mechanisms[id]));
    // Twin pair draws one system twice: update() sets its uniforms and render() uploads them.
    const { motes, scene } = systems.get(id, budget);
    if (lighting) applyLighting(motes.object, lighting);
    motes.update(state, camera, { width: w * pixelRatio, height: h * pixelRatio }, shimmerTime);
    renderer.render(scene, camera);
  });
  renderer.setScissorTest(false);

  latest = { states, ids: list.flatMap((p) => (p.id === null ? [] : [p.id])) };
  frameCount++;''')
rep('''    state: () => structuredClone(latest?.state ?? currentState()),
    nan() {
      const state = latest?.state ?? currentState();
      const ids = latest?.ids ?? panes().filter((id): id is MechanismId => id !== null);
      return !finite(state) || ids.some((id) => !finite(partTransforms(mechanisms[id], state)));
    },''', '''    state: () => structuredClone(latest?.states[0] ?? currentState()),
    paneStates: () => structuredClone(latest?.states ?? []),
    nan() {
      if (!latest) return !finite(currentState());
      const { states, ids } = latest;
      return states.some((state, i) => !finite(state) || !finite(partTransforms(mechanisms[ids[i]], state)));
    },''')
open(p, 'w').write(s)
