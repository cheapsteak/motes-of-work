import { Color, Group, InstancedBufferGeometry, type Mesh, Scene, Vector2, WebGLRenderer } from 'three';
import { mountAutoAdvance, type AutoAdvance } from './autoAdvance/indicator';
import { autoAdvanceSettings, autoStops, sceneMotion } from './autoAdvance/plan';
import { ACTIVE_MECHANISM, AUTO_ADVANCE, MOTE_BUDGET_DESKTOP, MOTE_SEED } from './config';
import { mountCredits } from './credits/credits';
import { mechanismAnchors } from './mechanisms/anchors';
import { galaxyTier } from './galaxy/background';
import { bodyIndex, galaxyBudget, generateGalaxy, type Galaxy } from './galaxy/generate';
import { isMechanismId, mechanisms, type MechanismId } from './mechanisms';
import type { AmbientClock } from './scene/ambientClock';
import { createEssayCamera } from './scene/cameraRig';
import { createInkSystem, type InkSystem } from './scene/ink/inkSystem';
import { reflowBodies } from './scene/mote/mote';
import { createMoteSystem, type MoteSystem } from './scene/mote/moteSystem';
import { createGalaxySystem, type GalaxySystem } from './scene/galaxy/galaxySystem';
import { packBodyData, type BodyData } from './scene/node/bodyData';
import { createBodySystem, type BodySystem, type FreezeFrame } from './scene/node/bodySystem';
import type { LodElement } from './scene/node/lod';
import { bodyGalactic } from './scene/node/orbit';
import { createScrollDriver } from './scroll/driver';
import { scrollYForProgress, sectionSpans } from './scroll/progress';
import { applyBrief, briefThresholds, parseBrief } from './story/brief';
import { applyLooks, mountStory } from './story/dom';
import { loadStory } from './story/loader';
import { storyLooks } from './story/reveal';
import { KeyframeSampler, type KeyframeFile } from './timeline/keyframeSampler';
import keyframes from './timeline/keyframes.json';
import { composeEssayCamera } from './timeline/netTrack';
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
  /**
   * What the last frame drew: points and triangles (three.js's counts), the meshes that were
   * visible, and the instance count of each visible instanced mesh.
   */
  drawStats(): { points: number; triangles: number; visible: string[]; instances: Record<string, number> };
  /** The frame count when the galaxy was built (0: by the first frame), or null if it is not built. */
  networkBuiltAt(): number | null;
  /** Auto-advance's state and every stop's scrollY; null when it is off. */
  autoAdvance(): { state: string; stops: number[] } | null;
  /** The last frame's systems' projected sizes and levels (BodySystem.lod); null before the galaxy is built. */
  lod(): ReturnType<BodySystem['lod']> | null;
  /** The last frame's glow sprites on screen (BodySystem.glows); null before the galaxy is built. */
  glows(): ReturnType<BodySystem['glows']> | null;
  /** The last frame's drawn spikes on screen (BodySystem.spikes); null before the galaxy is built. */
  spikes(): ReturnType<BodySystem['spikes']> | null;
  /**
   * The neighbourhood's dissolve at the last frame (re-skin §4.1): per star, in spot order, its plain
   * glow (CSS px), its real form's share (BodySystem.hood), its far form's share at its far star's own
   * place (GalaxySystem.farShares) and its centre on screen (CSS px); null before the galaxy is built.
   */
  hoodLod(): { glowPx: number; real: number; far: number; x: number; y: number }[] | null;
  /** Hold a LodElement's gain at `gain` (null lets go), and redraw. */
  forceLod(el: LodElement, gain: number | null): void;
  /** Draw only the named meshes (null: all of them again), and redraw. */
  isolate(names: string[] | null): void;
  /**
   * What the last frame cost in vertices, per visible instanced mesh (re-skin §7): its instances, the
   * vertices each draws (verticesPerDot: 4 for a dot's quad), `submitted` = instances × that, and
   * `heavy` = the instances the early-out did not skip (the galaxy's: BodySystem.skipped, the shaders'
   * TS twin; every other mesh skips none) × that.
   */
  vertexStats(): Record<string, { instances: number; verticesPerDot: number; submitted: number; heavy: number }>;
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

// Act II is the galaxy (src/galaxy, src/scene/galaxy, src/scene/node/bodySystem.ts). In test mode
// ?shot=<name> frames one of its probe shots (netShots.ts GALAXY_SHOTS), tracking its target, and
// draws the galaxy alone: the bike's motes and the drawing are not drawn.
const shotName = testMode ? params.get('shot') : null;
/** `?ambient=<s>` holds the galaxy's ambient clock at s seconds (src/scene/ambientClock.ts); null when absent or not a number. */
const ambientOverride = (() => {
  const raw = params.get('ambient');
  if (raw === null) return null;
  const t = Number(raw);
  if (!Number.isFinite(t)) console.warn(`Ignoring ?ambient=${raw}: not a number`);
  return Number.isFinite(t) ? t : null;
})();

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
const spans = sectionSpans(story);
const storyRoot = document.getElementById('story') as HTMLElement;
// The build writes the story into the page (vite.config.ts), so it reads without JavaScript.
const storyDom = mountStory(storyRoot, story);
// The brief ticks and the pages fade from the scroll driver, not the frame loop, so both work
// without WebGL.
const briefLines = parseBrief(storyRoot);
const briefAt = briefThresholds(briefLines, mechanism);
// The licence notices ship inside the essay's own bundle, which carries the code they cover.
mountCredits({
  open: document.getElementById('credits-open') as HTMLElement,
  dialog: document.getElementById('credits') as HTMLDialogElement,
  body: document.getElementById('credits-body') as HTMLElement,
  close: document.getElementById('credits-close') as HTMLElement,
});
// JSON imports type vectors as number[]; the sampler validates every track at load.
const sampler = new KeyframeSampler(keyframes as unknown as KeyframeFile, spans);
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

// The far plane holds Act II's wide shots (cameraRig.ts createEssayCamera).
const camera = createEssayCamera(1);
const scene = new Scene();
let motes: MoteSystem | null = null;
let ink: InkSystem | null = null;
let galaxy: Galaxy | null = null;
let galaxyData: BodyData | null = null;
let galaxyBackground: GalaxySystem | null = null;
let bodies: BodySystem | null = null;
// The probe shots load with the ambient poses they read (src/galaxy/ambient.ts searches the freeze
// pin when it loads), so only a page that asks for a shot pays for them; it draws no frame before.
let shots: typeof import('./timeline/netShots') | null = null;
if (shotName !== null) {
  void import('./timeline/netShots').then((m) => {
    if (!m.isGalaxyShot(shotName)) console.warn(`Ignoring ?shot=${shotName}: not a galaxy probe shot`);
    shots = m;
    requestFrame();
  });
}
// The galaxy's ambient clock (src/scene/ambientClock.ts) loads with the pose it stops at, which the
// freeze pin's search sets when ambient.ts loads: after the first frame, so Act I never waits for it.
// A frame that draws the galaxy (or carries the bike onto it, or tracks it) draws nothing before it
// has loaded. The clock counts from the first frame drawn.
let clockModule: typeof import('./scene/ambientClock') | null = null;
let ambientClock: AmbientClock | null = null;
let firstFrameMs: number | null = null;
void import('./scene/ambientClock').then((m) => {
  clockModule = m;
  requestFrame();
});
/** The last frame drew the galaxy (`net.show` > 0): while it does and the ambient is live, the loop runs on. */
let galaxyShown = false;
/** Meshes hidden by the test hook's isolate(), to show again before the next frame's updates. */
let isolated: Set<string> | null = null;
const hiddenByIsolate: { visible: boolean }[] = [];
/** Builds the galaxy; null once it is built, or when there is none to build. */
let buildNetwork: (() => void) | null = null;
/** The frame count when the galaxy was built (test hook): 0 means by the first frame. */
let networkBuiltAt: number | null = null;
if (renderer) {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(new Color('#0B0D12'), 1);
  const budget = moteBudget(params.get('n'));
  motes = createMoteSystem(mechanism, budget, MOTE_SEED);
  scene.add(motes.object);
  // Act II's galaxy (the machine on stage reflows into its first planet and that planet's moons):
  // generated once per page load from the essay's seed, at the galaxy's share of the mote budget.
  // That costs a few hundred milliseconds of main thread, so it is not built before the first frame
  // but later (ensureNetwork). It goes into a slot that holds its place in the scene, so the scene's
  // order does not depend on when it was built.
  const slot = new Group();
  scene.add(slot);
  buildNetwork = () => {
    buildNetwork = null;
    // The tier is the screen's at load: a resize keeps every count.
    const g = generateGalaxy(MOTE_SEED, galaxyTier(window.innerWidth, window.innerHeight), galaxyBudget(budget));
    const data = packBodyData(g);
    galaxy = g;
    galaxyData = data;
    galaxyBackground = createGalaxySystem(
      g.background,
      g.systems.map((i) => g.bodies[i].spot!),
      (t) => bodyGalactic(data, data.n0Row, t),
    );
    bodies = createBodySystem(g);
    slot.add(galaxyBackground.object, bodies.object);
    networkBuiltAt = frameCount;
  };
  // The drawing and its sheet (the spec section), for a mechanism that has one.
  ink = createInkSystem(mechanism);
  if (ink) scene.add(ink.object);
}

let alive = renderer !== null;
let raf = 0;
let frameCount = 0;
let progress = 0;
const drawingBuffer = new Vector2();

/**
 * Builds the galaxy if it is not built yet. It is pure, and draws nothing while `net.show` is 0, so
 * no frame depends on when this runs: it runs when the browser is first idle after the first frame,
 * when the reader nears the first section that needs it (NETWORK_LEAD), and at the latest inside the
 * first frame that needs it, which then waits for it rather than drawing another.
 */
function ensureNetwork(): void {
  buildNetwork?.();
}

/** A frame at `state` needs the galaxy: it shows it, carries the bike onto it, or tracks one of its bodies. */
function needsGalaxy(state: SceneState): boolean {
  return state.net.show > 0 || state.mech.reflow > 0 || state.camera.track.a !== 0 || state.camera.track.b !== 0;
}

/**
 * Progress from which the galaxy is built ahead of need: the start of the section before the first
 * one whose end needs it. A frame that needs it earlier (a `?state=` override, say) still builds it
 * itself.
 */
const NETWORK_LEAD = (() => {
  const first = spans.findIndex((s) => needsGalaxy(sampler.sample(s.end)));
  return first < 0 ? Infinity : spans[Math.max(0, first - 1)].start;
})();

/** Without requestIdleCallback, the galaxy is built this long after the first frame. */
const IDLE_FALLBACK_MS = 1000;

function scheduleNetworkBuild(): void {
  if (buildNetwork === null) return;
  if ('requestIdleCallback' in window) window.requestIdleCallback(ensureNetwork);
  else setTimeout(ensureNetwork, IDLE_FALLBACK_MS);
}

/**
 * One frame: a pure function of progress (plus idle shimmer outside test mode) and, once Act II needs
 * the galaxy, of the ambient clock at `now`.
 */
function draw(now: number): void {
  if (!renderer || !motes) return;
  const state = sceneStateAt(progress);
  // A probe shot draws nothing until its module has loaded, nor a frame that needs the galaxy until
  // the clock has. The galaxy's group is visible exactly while `net.show` > 0 (bodySystem.ts); the
  // reflow needs its bodies' places, and a tracked camera its target's.
  const needs = shotName !== null || needsGalaxy(state);
  if (shotName !== null && shots === null) return;
  if (needs && clockModule === null) return;
  firstFrameMs ??= now;
  if (clockModule !== null && ambientClock === null) {
    ambientClock = clockModule.createAmbientClock({ override: ambientOverride, test: testMode, reduced: () => reducedMotion.matches, startMs: firstFrameMs });
  }
  const live = ambientClock?.at(now) ?? 0;
  // The freeze frame's hold (freeze-frame §1.2): while it is up every draw and the tracked camera read
  // the freeze pin in place of the clock, so the held frame is pure of wall time.
  const ambient = clockModule?.shown(live, state.freeze.hold) ?? live;
  if (needs) ensureNetwork();
  const shot = shots !== null && galaxy !== null && shotName !== null && shots.isGalaxyShot(shotName) ? shots.GALAXY_SHOTS[shotName] : null;
  if (shot && shots && galaxy) {
    state.camera = shots.galaxyShotKeys(shot, galaxy);
    // The shot's lamp, on its own target, and its haze (up only at the galaxy wides), unless `?state=` names them.
    const net = { ...state.net, lamp: shot.lamp, lampAt: shots.galaxyShotLampAt(shot), haze: shot.haze ?? 0 };
    const named = typeof override === 'object' && override !== null ? (override as { net?: unknown }).net : undefined;
    state.net = mergeState({ ...state, net }, { net: named }).net;
  }
  // Act II's keys are relative to the point the camera tracks, where it is at this frame's ambient,
  // and a shot that rides the galaxy's turn swings about it; Act I tracks nothing (track.a = track.b
  // = 0), whose origin is the world's own.
  composeEssayCamera(camera, state, anchors, galaxy !== null && galaxyData !== null ? { g: galaxy, data: galaxyData } : null, ambient);
  renderer.getDrawingBufferSize(drawingBuffer);
  const shimmerTime = shimmerOn() ? (now / 1000) % 1000 : null;
  const viewport = { width: drawingBuffer.x, height: drawingBuffer.y, pixelRatio: renderer.getPixelRatio() };
  for (const o of hiddenByIsolate.splice(0)) o.visible = true;
  motes.object.visible = shot === null;
  if (ink) ink.object.visible = shot === null;
  if (shot === null) {
    const home = state.mech.reflow > 0 && galaxy !== null && galaxyData !== null ? reflowBodies(galaxy, galaxyData, ambient) : null;
    motes.update(state, camera, viewport, shimmerTime, home);
    ink?.update(state, camera, viewport);
  }
  galaxyBackground?.update(state, camera, viewport, ambient);
  bodies?.update(state, camera, viewport, ambient, freezeFrame(live));
  galaxyShown = bodies !== null && state.net.show > 0;
  if (isolated !== null) {
    const keep = isolated;
    scene.traverse((o) => {
      if (o.name !== '' && (o as Mesh).isMesh && !keep.has(o.name) && o.visible) {
        o.visible = false;
        hiddenByIsolate.push(o);
      }
    });
  }
  renderer.render(scene, camera);
  frameCount++;
  if (frameCount === 1) scheduleNetworkBuild();
}

/**
 * What the galaxy's draws need of the freeze frame beyond the story's leaves: the held piece (C1 and
 * the moon its pin caught mid-burst, and whether the hold forces C1's scatter: every path but the
 * search's `full`), the live ambient the twos tick on (none where it is not live: test mode, reduced
 * motion, `?ambient=`), and the flash, off in test mode and under reduced motion.
 */
function freezeFrame(live: number): FreezeFrame {
  const pin = clockModule?.FREEZE_PINS.C1;
  const hero = pin && galaxy ? { planet: bodyIndex(galaxy, 'C1'), moon: bodyIndex(galaxy, pin.moon), forceScatter: pin.path !== 'full' } : null;
  return { hero, live: ambientClock?.live() === true ? live : null, flashOn: shimmerOn() };
}

function frame(now: number): void {
  raf = 0;
  if (!alive || document.hidden) return;
  draw(now);
  // Shimmer animates continuously, and so does the galaxy while its ambient is live and it is
  // shown; without either (test mode, reduced motion, ?ambient=) a frame only changes when
  // something requests it. Today live() implies shimmerOn() (both need no test mode and no reduced
  // motion), so the galaxy's clause adds no frame; it keeps the galaxy running should the shimmer stop.
  if (shimmerOn() || (galaxyShown && ambientClock?.live() === true)) requestFrame();
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
// Redraw once without the shimmer and with the galaxy at its pose (or resume the loop) when the
// preference flips: the ambient clock reads the preference on every frame.
reducedMotion.addEventListener('change', requestFrame);
resize();

const driver = createScrollDriver((p) => {
  progress = p;
  if (p >= NETWORK_LEAD) ensureNetwork();
  applyBrief(briefLines, briefAt, sceneStateAt(p).mech.assembly);
  applyLooks(storyDom, storyLooks(p, spans, story));
  requestFrame();
});

// Auto-advance: the essay moves itself from line to line until the reader scrolls (src/autoAdvance/).
const auto = autoAdvanceSettings(params, AUTO_ADVANCE, testMode);
for (const ignored of auto.ignored) console.warn(`Ignoring ?${ignored}: not a usable value`);
const autoAdvance: AutoAdvance | null = auto.settings.enabled
  ? mountAutoAdvance(
      // Each scene's stop waits for its motion, as the keyframes have it (not a ?state= override).
      autoStops(story, spans, (p) => sceneMotion(sampler.sample(p))),
      auto.settings,
      { startPaused: reducedMotion.matches },
    )
  : null;

if (testMode) {
  let events = 0;
  const bump = () => events++;
  window.addEventListener('scroll', bump, { passive: true });
  window.addEventListener('resize', bump);
  window.__motes = {
    progress: () => driver.progress(),
    frames: () => frameCount,
    networkBuiltAt: () => networkBuiltAt,
    mechanism: () => mechanismId,
    autoAdvance: () => (autoAdvance ? { state: autoAdvance.state(), stops: autoAdvance.stopYs() } : null),
    lod: () => bodies?.lod() ?? null,
    glows: () => bodies?.glows() ?? null,
    spikes: () => bodies?.spikes() ?? null,
    hoodLod: () => {
      if (!bodies || !galaxyBackground) return null;
      const far = galaxyBackground.farShares();
      return bodies.hood().map((s, k) => ({ ...s, far: far[k] }));
    },
    forceLod: (el, gain) => {
      bodies?.forceLod(el, gain);
      requestFrame();
    },
    isolate: (names) => {
      isolated = names === null ? null : new Set(names);
      requestFrame();
    },
    vertexStats: () => {
      const skipped = bodies?.skipped() ?? {};
      const out: ReturnType<MotesTestHook['vertexStats']> = {};
      scene.traverseVisible((o) => {
        const g = (o as Mesh).geometry;
        if (o.name === '' || !(g instanceof InstancedBufferGeometry)) return;
        // The vertex shader runs once per vertex an instance (an index only repeats them).
        const verticesPerDot = (g.getAttribute('aCorner') ?? g.getAttribute('position')).count;
        const instances = g.instanceCount;
        out[o.name] = { instances, verticesPerDot, submitted: instances * verticesPerDot, heavy: (instances - (skipped[o.name] ?? 0)) * verticesPerDot };
      });
      return out;
    },
    drawStats: () => {
      const visible: string[] = [];
      const instances: Record<string, number> = {};
      scene.traverseVisible((o) => {
        if (o.name === '') return;
        visible.push(o.name);
        const g = (o as Mesh).geometry;
        if (g instanceof InstancedBufferGeometry) instances[o.name] = g.instanceCount;
      });
      const render = renderer?.info.render;
      return { points: render?.points ?? 0, triangles: render?.triangles ?? 0, visible, instances };
    },
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
