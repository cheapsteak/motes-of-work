// Mechanism comparison page: one mechanism, one mechanism as correct | wrong twin ("Twin pair"), or
// all of them in a grid ("Side by side"), at a state set by sliders, orbited with OrbitControls. Not scroll-driven, so it
// is exempt from the story's purity invariant, except that the machine itself stays a pure function
// of the slider state: drive "play" only moves the drive slider from the wall clock; nothing
// accumulates.
//
// Camera: OrbitControls drives a rig camera in machine-relative space (SceneState.camera units:
// world = anchor centre + value × anchor radius, the anchor being lerp(whole, core) by coreFocus).
// Each pane maps the rig into world space through its own mechanism's anchors with applyCamera,
// which is a world-space orbit about that anchor. One rig means every pane shares the same orbit
// angles and zoom (scaled to each machine), and a newly picked mechanism is framed at the current
// angle. The camera row picks the framing (CAMERAS) the rig starts from and Reset view returns to;
// a framing with coreFocus 1 maps the rig through the core's anchor (positions in core radii about
// the core centre). Orbit always circles the framing's target: the centre of the machine, or of
// its core for Spec (core).
import { Color, PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { mountCredits } from '../credits/credits';
import { ACTIVE_MECHANISM, MOTE_SEED } from '../config';
import type { Vec3 } from '../math/vec';
import { isMechanismId, MECHANISM_IDS, mechanisms, type MechanismId } from '../mechanisms';
import { mechanismAnchors } from '../mechanisms/anchors';
import { mechanismMeta } from '../mechanisms/meta';
import { applyCamera } from '../scene/cameraRig';
import { createMoteSystem, type MoteSystem } from '../scene/mote/moteSystem';
import { partTransforms } from '../scene/mote/partTransforms';
import type { SceneState } from '../timeline/sceneState';
import { SystemCache } from './systemCache';
import {
  BUDGETS,
  CAMERAS,
  createPanel,
  fitFov,
  gridShape,
  playDrive,
  PRESETS,
  stateFromSliders,
  twinPair,
  type CameraPreset,
  type SliderValues,
} from './controls';
import { applyLighting, createLightingDev, type LightingDev } from './lightingDev';

/** Test-mode hook (`?test=1` only). */
interface CompareTestHook {
  /** The scene state of the latest frame (camera machine-relative); in Twin pair, the left pane's. */
  state(): SceneState;
  /** The scene state of each drawn pane in the latest frame, in pane order. */
  paneStates(): SceneState[];
  /** True if that state, or the part poses it gives any mechanism on screen, holds a non-finite number. */
  nan(): boolean;
  /** Frames rendered so far. */
  frames(): number;
  /** Live mote systems, `<id>@<budget>`. */
  systems(): string[];
}

declare global {
  interface Window {
    __compare?: CompareTestHook;
  }
}

/** Side by side: every registered mechanism, in a near-square grid; spare cells stay blank. */
const GRID = gridShape(MECHANISM_IDS.length);

const params = new URLSearchParams(window.location.search);
// ?test=1: no idle shimmer and no orbit damping, so frames render only on change.
const testMode = params.get('test') === '1';
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const shimmerOn = (): boolean => !testMode && !reducedMotion.matches;

/** `?mech=<id>` opens on that mechanism; otherwise the essay's. */
const mechParam = params.get('mech');
const firstMechanism: MechanismId = mechParam !== null && isMechanismId(mechParam) ? mechParam : ACTIVE_MECHANISM;
/** `?budget=30000|100000` sets the starting budget (one for every view; 100k otherwise). */
const budgetParam = BUDGETS.find((b) => String(b) === params.get('budget'));
/** `?dev=1` adds the collapsed "Lighting (dev)" group. Never linked from the essay. */
const devMode = params.get('dev') === '1';

const view = document.getElementById('view') as HTMLElement;
const canvas = document.getElementById('stage') as HTMLCanvasElement;
const panesEl = document.getElementById('panes') as HTMLElement;
const notice = document.getElementById('notice') as HTMLElement;
const buildingEl = document.getElementById('building') as HTMLElement;

function showNotice(text: string): void {
  notice.textContent = text;
  notice.hidden = false;
}

// ---------------------------------------------------------------------------------------------
// Credits: CREDITS.md ships inside the page, so its licence notices go wherever the site goes.

mountCredits({
  open: document.getElementById('credits-open') as HTMLElement,
  dialog: document.getElementById('credits') as HTMLDialogElement,
  body: document.getElementById('credits-body') as HTMLElement,
  close: document.getElementById('credits-close') as HTMLElement,
});

// ---------------------------------------------------------------------------------------------
// Rendering

let renderer: WebGLRenderer | null = null;
try {
  renderer = new WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(new Color('#0B0D12'), 1);
} catch (e) {
  console.warn('WebGL unavailable', e);
  showNotice('This page needs WebGL, which this browser could not start.');
}

let alive = renderer !== null;
let raf = 0;

const rig = new PerspectiveCamera(CAMERAS[0].fov, 1, 0.01, 100);
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

/** Mote systems by mechanism and budget; only the current view's budget is kept alive. */
const systems = new SystemCache<MechanismId, { motes: MoteSystem; scene: Scene; dispose(): void }>((id, budget) => {
  const motes = createMoteSystem(mechanisms[id], budget, MOTE_SEED);
  const scene = new Scene();
  scene.add(motes.object);
  return {
    motes,
    scene,
    dispose() {
      scene.remove(motes.object);
      motes.dispose();
    },
  };
});

let building = false;
/**
 * Build the missing systems after the "Building" overlay has had a chance to paint (two animation
 * frames), then draw. Building 100k motes takes long enough on the CPU to want saying so.
 */
function buildThenDraw(ids: MechanismId[], budget: number): void {
  if (building) return;
  building = true;
  const names = ids.map((id) => mechanismMeta[id].label.toLowerCase()).join(', ');
  buildingEl.textContent = `Building ${names}, ${budget / 1000}k motes…`;
  buildingEl.hidden = false;
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      // A throwing build must not leave the overlay up or block every later build. It says so and
      // does not request another frame: that would retry the same failing build in a loop.
      let built = false;
      try {
        for (const id of ids) systems.get(id, budget);
        built = true;
      } catch (e) {
        console.error('Could not build the mote systems', e);
        showNotice(`Could not build ${names} at ${budget / 1000}k motes.`);
      } finally {
        buildingEl.hidden = true;
        building = false;
        if (built) requestFrame();
      }
    }),
  );
}
/** One camera per pane of the largest layout (Twin pair's two, or the grid's cells). */
const paneCameras = Array.from(
  { length: Math.max(2, GRID.cols * GRID.rows) },
  () => new PerspectiveCamera(CAMERAS[0].fov, 1, 0.05, 200),
);

// ---------------------------------------------------------------------------------------------
// Panel and play

const panel = createPanel(document.getElementById('controls') as HTMLElement, {
  ids: MECHANISM_IDS,
  meta: mechanismMeta,
  initial: {
    mechanism: firstMechanism,
    sliders: { ...PRESETS[0].values },
    playing: false,
    rate: 0.25,
    view: 'single',
    camera: CAMERAS[0].name,
    preset: PRESETS[0].name,
    budget: budgetParam ?? 100_000,
  },
  header: document.querySelector('#panel header') as HTMLElement,
  onChange,
  onResetView: resetView,
});
resetView();

const lightingDev: LightingDev | null = devMode
  ? createLightingDev(document.getElementById('controls') as HTMLElement, () => requestFrame())
  : null;

/** Where play started: the drive at that moment and the clock time. Reset on every change. */
let playFrom = { drive: 0, time: 0 };

function onChange(): void {
  playFrom = { drive: panel.settings().sliders['mech.drive'], time: performance.now() };
  layoutPanes();
  requestFrame();
}

/** One pane: its mechanism (null for a spare grid cell), its label, and the slider values it shows. */
interface Pane {
  id: MechanismId | null;
  label: string;
  /** Twin pair: the per-pane values (twinPair); otherwise the sliders as set. */
  values(sliders: SliderValues): SliderValues;
}
const asSet = (v: SliderValues): SliderValues => v;

/**
 * The panes of the current view mode: one mechanism; one mechanism as correct | wrong twin; or the
 * whole registry side by side (row-major), padded with blank cells to fill the grid.
 */
function panes(): Pane[] {
  const s = panel.settings();
  const label = mechanismMeta[s.mechanism].label;
  if (s.view === 'single') return [{ id: s.mechanism, label, values: asSet }];
  if (s.view === 'twin') {
    return [
      { id: s.mechanism, label: `${label} · correct`, values: (v) => twinPair(v)[0] },
      { id: s.mechanism, label: `${label} · wrong twin`, values: (v) => twinPair(v)[1] },
    ];
  }
  return Array.from({ length: GRID.cols * GRID.rows }, (_, i) => {
    const id = MECHANISM_IDS[i] ?? null;
    return { id, label: id === null ? '' : mechanismMeta[id].label, values: asSet };
  });
}
/** Columns and rows of the pane layout. */
function paneGrid(): { cols: number; rows: number } {
  const view = panel.settings().view;
  return view === 'grid' ? GRID : view === 'twin' ? { cols: 2, rows: 1 } : { cols: 1, rows: 1 };
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
  const { cols, rows } = paneGrid();
  panesEl.style.gridTemplate = `repeat(${rows}, 1fr) / repeat(${cols}, 1fr)`;
  panesEl.replaceChildren(
    ...list.map((p) => {
      const pane = document.createElement('div');
      pane.className = p.id === null ? 'pane empty' : 'pane';
      if (p.id !== null) {
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
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const pixelRatio = renderer.getPixelRatio();
  const shimmerTime = shimmerOn() ? (now / 1000) % 1000 : null;
  const lighting = lightingDev?.values();
  const states: SceneState[] = [];

  renderer.setScissorTest(true);
  list.forEach(({ id, values }, i) => {
    if (!renderer) return;
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = Math.round((col * width) / cols);
    const w = Math.round(((col + 1) * width) / cols) - x;
    const top = Math.round((row * height) / rows);
    const h = Math.round(((row + 1) * height) / rows) - top;
    const y = height - top - h; // WebGL viewports count from the bottom
    renderer.setViewport(x, y, w, h);
    renderer.setScissor(x, y, w, h);
    if (id === null) {
      renderer.clear();
      return;
    }
    const state = currentState(values(settings.sliders));
    states.push(state);
    const camera = paneCameras[i];
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
    applyCamera(camera, state, mechanismAnchors(mechanisms[id]));
    const fov = fitFov(state.camera.fov, camera.aspect);
    if (camera.fov !== fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    // Twin pair draws one system twice: update() sets its uniforms and render() uploads them.
    const { motes, scene } = systems.get(id, budget);
    if (lighting) applyLighting(motes.object, lighting);
    motes.update(state, camera, { width: w * pixelRatio, height: h * pixelRatio, pixelRatio }, shimmerTime);
    renderer.render(scene, camera);
  });
  renderer.setScissorTest(false);

  latest = { states, ids: list.flatMap((p) => (p.id === null ? [] : [p.id])) };
  frameCount++;
}

// ---------------------------------------------------------------------------------------------
// Loop: continuous while something animates (shimmer, play, orbit damping), else on demand.

function frame(now: number): void {
  raf = 0;
  if (!alive || document.hidden) return;
  const moving = controls.update();
  draw(now);
  if (shimmerOn() || panel.settings().playing || moving) requestFrame();
}

function requestFrame(): void {
  if (raf === 0 && alive && !document.hidden) raf = requestAnimationFrame(frame);
}

function resize(): void {
  if (!renderer || !alive) return;
  renderer.setSize(view.clientWidth, view.clientHeight, false);
  requestFrame();
}

canvas.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();
  alive = false;
  if (raf !== 0) cancelAnimationFrame(raf);
  raf = 0;
  showNotice('The WebGL context was lost. Reload the page to continue.');
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) requestFrame();
});
reducedMotion.addEventListener('change', () => requestFrame());
new ResizeObserver(resize).observe(view);
resize();

// ---------------------------------------------------------------------------------------------
// Test hook

function finite(x: unknown): boolean {
  if (typeof x === 'number') return Number.isFinite(x);
  if (Array.isArray(x)) return x.every(finite);
  if (typeof x === 'object' && x !== null) return Object.values(x).every(finite);
  return true;
}

if (testMode) {
  window.__compare = {
    state: () => structuredClone(latest?.states[0] ?? currentState()),
    paneStates: () => structuredClone(latest?.states ?? []),
    nan() {
      if (!latest) return !finite(currentState());
      const { states, ids } = latest;
      return states.some((state, i) => !finite(state) || !finite(partTransforms(mechanisms[ids[i]], state)));
    },
    frames: () => frameCount,
    systems: () => systems.keys(),
  };
}
