// Mechanism comparison page: one mechanism (or all of them, 2×2) at a state set by sliders, orbited
// with OrbitControls. Not scroll-driven, so it is exempt from the story's purity invariant, except
// that the machine itself stays a pure function of the slider state: drive "play" only moves the
// drive slider from the wall clock; nothing accumulates.
//
// Camera: OrbitControls drives a rig camera in machine-relative space (SceneState.camera units:
// world = whole anchor centre + value × whole anchor radius). Each pane maps the rig into world space
// through its own mechanism's anchors with applyCamera, which is a world-space orbit about that
// machine's whole anchor. One rig means every pane in the 2×2 view shares the same orbit angles
// and zoom (scaled to each machine), and a newly picked mechanism is framed at the current angle.
import { marked } from 'marked';
import { Color, PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import credits from '../../CREDITS.md?raw';
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
import { BUDGETS, createPanel, playDrive, PRESETS, stateFromSliders, type Budget } from './controls';

/** Test-mode hook (`?test=1` only). */
interface CompareTestHook {
  /** The scene state of the latest frame (camera machine-relative). */
  state(): SceneState;
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

/** The three-quarter view the per-mechanism shots use: above, right and in front (machine-relative). */
const HOME: { pos: Vec3; target: Vec3 } = { pos: [1.6, 1.1, 2.4], target: [0, 0, 0] };
const FOV = 40;
const PANES_IN_GRID = 4;

const params = new URLSearchParams(window.location.search);
// ?test=1: no idle shimmer and no orbit damping, so frames render only on change.
const testMode = params.get('test') === '1';
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const shimmerOn = (): boolean => !testMode && !reducedMotion.matches;

/** `?mech=<id>` opens on that mechanism; otherwise the essay's. */
const mechParam = params.get('mech');
const firstMechanism: MechanismId = mechParam !== null && isMechanismId(mechParam) ? mechParam : ACTIVE_MECHANISM;
/** `?budget=30000|100000` sets the starting budget of both views. */
const budgetParam = BUDGETS.find((b) => String(b) === params.get('budget'));

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

const creditsDialog = document.getElementById('credits') as HTMLDialogElement;
(document.getElementById('credits-body') as HTMLElement).innerHTML = marked.parse(credits, { async: false });
(document.getElementById('credits-open') as HTMLElement).addEventListener('click', () => creditsDialog.showModal());
(document.getElementById('credits-close') as HTMLElement).addEventListener('click', () => creditsDialog.close());

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

const rig = new PerspectiveCamera(FOV, 1, 0.01, 100);
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
function buildThenDraw(ids: MechanismId[], budget: Budget): void {
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
}
const paneCameras = Array.from({ length: PANES_IN_GRID }, () => new PerspectiveCamera(FOV, 1, 0.05, 200));

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
    sideBySide: false,
    preset: PRESETS[0].name,
    budgets: { single: budgetParam ?? 100_000, grid: budgetParam ?? 30_000 },
  },
  onChange,
  onResetView: resetView,
});

/** Where play started: the drive at that moment and the clock time. Reset on every change. */
let playFrom = { drive: 0, time: 0 };

function onChange(): void {
  playFrom = { drive: panel.settings().sliders['mech.drive'], time: performance.now() };
  layoutPanes();
  requestFrame();
}

/** The mechanism in each pane: one in the single view; the registry, padded to four, side by side. */
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
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const pixelRatio = renderer.getPixelRatio();
  const shimmerTime = shimmerOn() ? (now / 1000) % 1000 : null;

  renderer.setScissorTest(true);
  list.forEach((id, i) => {
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
    const camera = paneCameras[i];
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
    applyCamera(camera, state, mechanismAnchors(mechanisms[id]));
    const { motes, scene } = systems.get(id, budget);
    motes.update(state, camera, { width: w * pixelRatio, height: h * pixelRatio }, shimmerTime);
    renderer.render(scene, camera);
  });
  renderer.setScissorTest(false);

  latest = { state, ids: list.filter((id): id is MechanismId => id !== null) };
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
    state: () => structuredClone(latest?.state ?? currentState()),
    nan() {
      const state = latest?.state ?? currentState();
      const ids = latest?.ids ?? panes().filter((id): id is MechanismId => id !== null);
      return !finite(state) || ids.some((id) => !finite(partTransforms(mechanisms[id], state)));
    },
    frames: () => frameCount,
    systems: () => systems.keys(),
  };
}
