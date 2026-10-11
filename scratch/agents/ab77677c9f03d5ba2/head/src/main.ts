import { Color, PerspectiveCamera, Scene, Vector2, WebGLRenderer } from 'three';
import { ACTIVE_MECHANISM, MOTE_BUDGET_DESKTOP, MOTE_SEED } from './config';
import { mechanismAnchors } from './mechanisms/anchors';
import { isMechanismId, mechanisms, type MechanismId } from './mechanisms';
import { applyCamera } from './scene/cameraRig';
import { createMoteSystem, type MoteSystem } from './scene/mote/moteSystem';
import { createScrollDriver } from './scroll/driver';
import { scrollYForProgress, sectionSpans } from './scroll/progress';
import { renderStory } from './story/dom';
import { loadStory } from './story/loader';
import { KeyframeSampler, type KeyframeFile } from './timeline/keyframeSampler';
import keyframes from './timeline/keyframes.json';
import { mergeState, type SceneState } from './timeline/sceneState';
import './style.css';

/** Test-mode hook (`?test=1` only). */
interface MotesTestHook {
  progress(): number;
  /** Frames rendered so far. */
  frames(): number;
  /** Resolves after two animation frames in a row with no scroll or resize event. */
  settle(): Promise<void>;
  /** Id of the mechanism on stage (`?mech=` in test mode, else ACTIVE_MECHANISM). */
  mechanism(): MechanismId;
}

declare global {
  interface Window {
    __motes?: MotesTestHook;
  }
}

const params = new URLSearchParams(window.location.search);
// ?test=1: no idle shimmer, so every frame is a pure function of progress; render only on change.
const testMode = params.get('test') === '1';

// Spec 6.1: idle shimmer is off under prefers-reduced-motion (and re-evaluated if the setting changes).
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
/** True while the idle shimmer should animate. */
const shimmerOn = (): boolean => !testMode && !reducedMotion.matches;

/** `?n=` lowers the mote budget (cheap frames for tests); it never raises it past the desktop budget. */
function moteBudget(raw: string | null): number {
  const n = Math.floor(Number(raw));
  return raw !== null && Number.isFinite(n) && n > 0 ? Math.min(n, MOTE_BUDGET_DESKTOP) : MOTE_BUDGET_DESKTOP;
}

/** `?mech=<id>` picks the mechanism in test mode only; an unknown id falls back to ACTIVE_MECHANISM. */
function chooseMechanism(raw: string | null): MechanismId {
  if (!testMode || raw === null) return ACTIVE_MECHANISM;
  if (isMechanismId(raw)) return raw;
  console.warn(`Ignoring ?mech=${raw}: not a registered mechanism; using ${ACTIVE_MECHANISM}`);
  return ACTIVE_MECHANISM;
}

/** `?state=` is URI-encoded JSON merged over the sampled state. Malformed JSON is ignored. */
function stateOverride(raw: string | null): unknown {
  if (raw === null) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    console.warn('Ignoring ?state=: not valid JSON');
    return undefined;
  }
}

const mechanismId = chooseMechanism(params.get('mech'));
const mechanism = mechanisms[mechanismId];
const anchors = mechanismAnchors(mechanism);

const story = loadStory();
renderStory(document.getElementById('story') as HTMLElement, story);
// JSON imports type vectors as number[]; the sampler validates every track at load.
const sampler = new KeyframeSampler(keyframes as unknown as KeyframeFile, sectionSpans(story));
const override = stateOverride(params.get('state'));

function sceneStateAt(progress: number): SceneState {
  const sampled = sampler.sample(progress);
  return override === undefined ? sampled : mergeState(sampled, override);
}

// ?p= only positions the scroll; progress is then read back from scrollY like any other scroll.
const pRaw = params.get('p');
if (pRaw !== null) {
  history.scrollRestoration = 'manual';
  const p = Number(pRaw);
  const root = document.documentElement;
  window.scrollTo(0, scrollYForProgress(Number.isFinite(p) ? p : 0, root.scrollHeight, window.innerHeight));
}

function showWithoutWebGl(): void {
  document.body.classList.add('no-webgl');
}

const canvas = document.getElementById('stage') as HTMLCanvasElement;
let renderer: WebGLRenderer | null = null;
try {
  renderer = new WebGLRenderer({ canvas, antialias: true });
} catch (e) {
  console.warn('WebGL unavailable; showing the story without the canvas', e);
  showWithoutWebGl();
}

const camera = new PerspectiveCamera(40, 1, 0.1, 100);
const scene = new Scene();
let motes: MoteSystem | null = null;
if (renderer) {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(new Color('#0B0D12'), 1);
  motes = createMoteSystem(mechanism, moteBudget(params.get('n')), MOTE_SEED);
  scene.add(motes.object);
}

let alive = renderer !== null;
let raf = 0;
let frameCount = 0;
let progress = 0;
const drawingBuffer = new Vector2();

/** One frame: a pure function of progress (plus idle shimmer outside test mode). */
function draw(now: number): void {
  if (!renderer || !motes) return;
  const state = sceneStateAt(progress);
  applyCamera(camera, state, anchors);
  renderer.getDrawingBufferSize(drawingBuffer);
  const shimmerTime = shimmerOn() ? (now / 1000) % 1000 : null;
  motes.update(state, camera, { width: drawingBuffer.x, height: drawingBuffer.y }, shimmerTime);
  renderer.render(scene, camera);
  frameCount++;
}

function frame(now: number): void {
  raf = 0;
  if (!alive || document.hidden) return;
  draw(now);
  // Shimmer animates continuously; without it (test mode, reduced motion) a frame only changes
  // when something requests it.
  if (shimmerOn()) requestFrame();
}

function requestFrame(): void {
  if (raf === 0 && alive && !document.hidden) raf = requestAnimationFrame(frame);
}

function stopLoop(): void {
  if (raf !== 0) cancelAnimationFrame(raf);
  raf = 0;
}

function resize(): void {
  if (!renderer || !alive) return;
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  requestFrame();
}

canvas.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();
  alive = false;
  stopLoop();
  showWithoutWebGl();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopLoop();
  else requestFrame();
});

window.addEventListener('resize', resize);
// Redraw once without the shimmer (or resume the loop) when the preference flips.
reducedMotion.addEventListener('change', requestFrame);
resize();

const driver = createScrollDriver((p) => {
  progress = p;
  requestFrame();
});

if (testMode) {
  let events = 0;
  const bump = () => events++;
  window.addEventListener('scroll', bump, { passive: true });
  window.addEventListener('resize', bump);
  window.__motes = {
    progress: () => driver.progress(),
    frames: () => frameCount,
    mechanism: () => mechanismId,
    settle: () =>
      new Promise<void>((resolve) => {
        let seen = events;
        let quiet = 0;
        const tick = () => {
          if (events !== seen) {
            seen = events;
            quiet = 0;
          } else {
            quiet++;
          }
          if (quiet >= 2) resolve();
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
  };
}
