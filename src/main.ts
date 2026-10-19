import { Color, InstancedBufferGeometry, type Mesh, Vector2, WebGLRenderer } from 'three';
import { mountAutoAdvance, type AutoAdvance } from './autoAdvance/indicator';
import { autoAdvanceSettings, autoStops, sceneMotion } from './autoAdvance/plan';
import { ACTIVE_MECHANISM, AUTO_ADVANCE, MOTE_BUDGET_DESKTOP, MOTE_SEED } from './config';
import { mountCredits } from './credits/credits';
import { galaxyTier } from './galaxy/background';
import { isMechanismId, mechanisms, type MechanismId } from './mechanisms';
import type { AmbientClock } from './scene/ambientClock';
import type { BodySystem } from './scene/node/bodySystem';
import type { LodElement } from './scene/node/lod';
import { createStage, galaxyLead, needsGalaxy, type Stage } from './scene/stage';
import { createScrollDriver } from './scroll/driver';
import { scrollYForProgress, sectionSpans } from './scroll/progress';
import { applyBrief, briefThresholds, parseBrief } from './story/brief';
import { applyLooks, mountStory } from './story/dom';
import { loadStory } from './story/loader';
import { storyLooks } from './story/reveal';
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
   * The neighbourhood's dissolve at the last frame (re-skin §4.1): per star, in row order, its plain
   * glow (CSS px), its real form's share (BodySystem.hood), its unit's far form's share at its far
   * star's own place (GalaxySystem.farShares: one far star per unit, a binary's at its barycentre),
   * its centre on screen (CSS px), and its unit's index and spot on screen (sx, sy: a binary's
   * barycentre); null before the galaxy is built.
   */
  hoodLod(): { glowPx: number; real: number; far: number; x: number; y: number; unit: number; sx: number; sy: number }[] | null;
  /** Hold a LodElement's gain at `gain` (null lets go), and redraw. */
  forceLod(el: LodElement, gain: number | null): void;
  /** Draw a planet's and a moon's shell motes whole (0), only its near hemisphere's (1) or only its far one's past the soft band (-1) (BodySystem.faceOnly), and redraw. */
  faceOnly(side: -1 | 0 | 1): void;
  /** Draw only the named meshes (null: all of them again), and redraw. */
  isolate(names: string[] | null): void;
  /**
   * What the last frame cost in vertices, per visible instanced mesh (re-skin §7): its instances, the
   * vertices each draws (verticesPerDot: 4 for a dot's quad), `submitted` = instances × that, and
   * `heavy` = the instances the early-out did not skip (the galaxy's: BodySystem.skipped, the shaders'
   * TS twin; every other mesh skips none) × that.
   */
  vertexStats(): Record<string, { instances: number; verticesPerDot: number; submitted: number; heavy: number }>;
  /**
   * The black hole at the last frame (re-skin §4.2), CSS px from the top left: its shadow's centre and
   * radius (shadow.ts, the disc every galaxy fragment discards inside), and the side of the screen its
   * disk approaches on (−1 left, 1 right); null before the galaxy is built or while it has no shadow.
   */
  hole(): { x: number; y: number; r: number; approach: -1 | 1 } | null;
  /** The defect's dropout at the last frame (BodySystem.dropout: its lines, box and the piece's disc, CSS px); null where none is drawn. */
  dropout(): ReturnType<BodySystem['dropout']> | null;
  /** Draw no dropout (true) or let it run (false), and redraw: a frame with and without its lines. */
  muteDropout(mute: boolean): void;
  /**
   * The plans' schematics at the last frame (re-skin §4.7, Task 7b; BodySystem.plan, by the TS twin
   * plan.ts): the lit plan dots (alpha at least LOD_VISIBLE), Σ alpha × size², the systems in R (in
   * g.systems, −1 none), the lit dots by mark and how many are ember. Null before the galaxy is built.
   */
  plan(): ReturnType<BodySystem['plan']> | null;
  /**
   * Hold the galaxy's ambient clock at `t` seconds (as `?ambient=t` does, without a reload), or (null)
   * let it go back to its own, and redraw: the defect's e2e steps a strip of frames on one page.
   */
  holdAmbient(t: number | null): void;
  /**
   * Draw the frame at ambient `t` now (as holdAmbient(t) and a redraw, in this task), and sum the
   * luminance over `background` (rgb, 0-255) of what it drew in the focused defective piece's box
   * (BodySystem.dropout's), read back from the drawing buffer before it is composited: the defect's
   * flash guard on the drawn frames, a few hundred of them, without a screenshot each. Null where no
   * focused defective piece is drawn.
   */
  defectLuminance(t: number, background: readonly [number, number, number]): number | null;
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

// Every system the page draws and one frame's update of them (src/scene/stage.ts); null without WebGL.
let stage: Stage | null = null;
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
/** The test hook's hold on the ambient clock (MotesTestHook.holdAmbient): null, the clock's own. */
let heldAmbient: number | null = null;
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
/** The frame count when the galaxy was built (test hook): 0 means by the first frame. */
let networkBuiltAt: number | null = null;
if (renderer) {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(new Color('#0B0D12'), 1);
  stage = createStage(mechanism, moteBudget(params.get('n')), MOTE_SEED);
}
/** The galaxy's bodies, once built (the test hook's reads). */
const bodiesOf = (): BodySystem | null => stage?.galaxy()?.bodies ?? null;

let alive = renderer !== null;
let raf = 0;
let frameCount = 0;
let progress = 0;
const drawingBuffer = new Vector2();

/**
 * Builds Act II's galaxy (the machine on stage reflows into its first planet and that planet's moons)
 * if it is not built yet. That costs a few hundred milliseconds of main thread, so it is not built
 * before the first frame. It is pure, and draws nothing while `net.show` is 0, so no frame depends on
 * when this runs: it runs when the browser is first idle after the first frame, when the reader nears
 * the first section that needs it (NETWORK_LEAD), and at the latest inside the first frame that needs
 * it, which then waits for it rather than drawing another.
 */
function ensureNetwork(): void {
  // The tier is the screen's at load: a resize keeps every count.
  if (stage?.buildGalaxy(galaxyTier(window.innerWidth, window.innerHeight))) {
    networkBuiltAt = frameCount;
    warmPrograms();
  }
}

/**
 * Compiles every material in the scene, hidden ones included, ahead of the frame that first draws it.
 * three.js otherwise compiles a material inside the first render that shows it, and the galaxy's
 * programs are large (eight of 40-134 KB of GLSL): on a phone the zoom-out froze for seconds while
 * they compiled. With KHR_parallel_shader_compile this compiles off the main thread; without it the
 * driver still starts early, so the first frame that needs a program no longer waits for all of it.
 * It draws nothing, so no frame depends on when it runs.
 */
function warmPrograms(): void {
  if (!renderer || !stage) return;
  void renderer.compileAsync(stage.scene, stage.camera).catch((e: unknown) => console.warn('Shader warm-up failed', e));
}

/**
 * Progress from which the galaxy is built ahead of need (stage.ts galaxyLead). A frame that needs it
 * earlier (a `?state=` override, say) still builds it itself.
 */
const NETWORK_LEAD = galaxyLead(spans, (p) => sampler.sample(p));

/** Without requestIdleCallback, the galaxy is built this long after the first frame. */
const IDLE_FALLBACK_MS = 1000;

function scheduleNetworkBuild(): void {
  if (!stage || stage.galaxy() !== null) return;
  if ('requestIdleCallback' in window) window.requestIdleCallback(ensureNetwork);
  else setTimeout(ensureNetwork, IDLE_FALLBACK_MS);
}

/**
 * One frame: a pure function of progress (plus idle shimmer outside test mode) and, once Act II needs
 * the galaxy, of the ambient clock at `now`.
 */
function draw(now: number): void {
  if (!renderer || !stage) return;
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
  const live = heldAmbient ?? ambientClock?.at(now) ?? 0;
  // The freeze frame's hold (freeze-frame §1.2): while it is up every draw and the tracked camera read
  // the freeze pin in place of the clock, so the held frame is pure of wall time.
  const ambient = clockModule?.shown(live, state.freeze.hold) ?? live;
  if (needs) ensureNetwork();
  const shot = shots !== null && shotName !== null && shots.isGalaxyShot(shotName) ? { shot: shots.GALAXY_SHOTS[shotName], shots } : null;
  renderer.getDrawingBufferSize(drawingBuffer);
  const shimmerTime = shimmerOn() ? (now / 1000) % 1000 : null;
  const viewport = { width: drawingBuffer.x, height: drawingBuffer.y, pixelRatio: renderer.getPixelRatio() };
  for (const o of hiddenByIsolate.splice(0)) o.visible = true;
  stage.draw({
    state,
    override,
    shot,
    ambient,
    // The live ambient the freeze's twos tick on: none where it is not live (test mode, reduced motion, `?ambient=`).
    liveAmbient: heldAmbient === null && ambientClock?.live() === true ? live : null,
    pins: clockModule?.FREEZE_PINS ?? null,
    flashOn: shimmerOn(),
    viewport,
    shimmerTime,
  });
  galaxyShown = stage.galaxy() !== null && state.net.show > 0;
  const { scene, camera } = stage;
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
  if (frameCount === 1) {
    // Act I's late materials (the ghost, the spec sheet) compile now, the galaxy's once it is built.
    warmPrograms();
    scheduleNetworkBuild();
  }
}

function frame(now: number): void {
  raf = 0;
  if (!alive || document.hidden) return;
  draw(now);
  // Shimmer animates continuously, and so does the galaxy while its ambient is live and it is
  // shown; without either (test mode, reduced motion, ?ambient=) a frame only changes when
  // something requests it. Today live() implies shimmerOn() (both need no test mode and no reduced
  // motion), so the galaxy's clause adds no frame; it keeps the galaxy running should the shimmer stop.
  if (shimmerOn() || (galaxyShown && heldAmbient === null && ambientClock?.live() === true)) requestFrame();
}

function requestFrame(): void {
  if (raf === 0 && alive && !document.hidden) raf = requestAnimationFrame(frame);
}

function stopLoop(): void {
  if (raf !== 0) cancelAnimationFrame(raf);
  raf = 0;
}

function resize(): void {
  if (!renderer || !stage || !alive) return;
  const { camera } = stage;
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
    lod: () => bodiesOf()?.lod() ?? null,
    glows: () => bodiesOf()?.glows() ?? null,
    spikes: () => bodiesOf()?.spikes() ?? null,
    hoodLod: () => {
      const built = stage?.galaxy();
      if (!built) return null;
      const far = built.background.farShares();
      return built.bodies.hood().map((s) => ({ ...s, far: far[s.unit] }));
    },
    forceLod: (el, gain) => {
      bodiesOf()?.forceLod(el, gain);
      requestFrame();
    },
    faceOnly: (side) => {
      bodiesOf()?.faceOnly(side);
      requestFrame();
    },
    hole: () => {
      const hole = stage?.galaxy()?.hole;
      if (!stage || !hole || !renderer) return null;
      const s = stage.shadow.value;
      if (s.z <= 0) return null;
      const ratio = renderer.getPixelRatio();
      return { x: s.x / ratio, y: (drawingBuffer.y - s.y) / ratio, r: s.z / ratio, approach: hole.approach() };
    },
    dropout: () => bodiesOf()?.dropout() ?? null,
    plan: () => bodiesOf()?.plan() ?? null,
    defectLuminance: (t, background) => {
      heldAmbient = t;
      bump();
      draw(performance.now());
      const d = bodiesOf()?.dropout() ?? null;
      if (!renderer || d === null) return null;
      const gl = renderer.getContext();
      const ratio = renderer.getPixelRatio();
      const [x0, y0] = [Math.max(0, Math.floor(d.box[0] * ratio)), Math.max(0, Math.floor(d.box[1] * ratio))];
      const [x1, y1] = [Math.min(drawingBuffer.x, Math.ceil(d.box[2] * ratio)), Math.min(drawingBuffer.y, Math.ceil(d.box[3] * ratio))];
      if (!(x1 > x0 && y1 > y0)) return 0;
      const px = new Uint8Array((x1 - x0) * (y1 - y0) * 4);
      // The drawing buffer's rows run up from the bottom.
      gl.readPixels(x0, drawingBuffer.y - y1, x1 - x0, y1 - y0, gl.RGBA, gl.UNSIGNED_BYTE, px);
      let sum = 0;
      for (let i = 0; i < px.length; i += 4) sum += 0.2126 * (px[i] - background[0]) + 0.7152 * (px[i + 1] - background[1]) + 0.0722 * (px[i + 2] - background[2]);
      return sum;
    },
    holdAmbient: (t) => {
      heldAmbient = t;
      bump();
      requestFrame();
    },
    muteDropout: (mute) => {
      bodiesOf()?.muteDropout(mute);
      bump();
      requestFrame();
    },
    isolate: (names) => {
      isolated = names === null ? null : new Set(names);
      requestFrame();
    },
    vertexStats: () => {
      const skipped = bodiesOf()?.skipped() ?? {};
      const out: ReturnType<MotesTestHook['vertexStats']> = {};
      stage?.scene.traverseVisible((o) => {
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
      stage?.scene.traverseVisible((o) => {
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
