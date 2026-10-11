import { Color, PerspectiveCamera, Scene, Vector2, WebGLRenderer } from 'three';
import { ACTIVE_MECHANISM, MOTE_SEED } from '../config';
import { mechanisms } from '../mechanisms';
import { mechanismAnchors } from '../mechanisms/anchors';
import { applyCamera } from '../scene/cameraRig';
import type { MoteType } from '../scene/mote/attributes';
import { createMoteSystem } from '../scene/mote/moteSystem';
import type { SceneState } from '../timeline/sceneState';
import { createGpuTimer, type TimerGl } from './gpuTimer';
import { createHud, type Hud } from './hud';
import { mountResultsPanel, rendererString } from './results';

// Shared harness for the two render spikes (fill, vertex): a full-window canvas, the mote system
// rendered every frame, the HUD, and the results panel. Spike pages are measurement harnesses, not
// the story; the purity invariant applies to the story page only.

export interface RenderSpikeConfig {
  spike: 'fill' | 'vertex';
  /** Requested mote budget. */
  n: number;
  /** Pixel ratio, applied as given (may exceed 2 for testing). */
  dpr: number;
  /** Override every mote's type and force its hero form (fill spike). */
  forceType?: MoteType;
  /** Scene state at `seconds` of wall-clock time since the page started. */
  stateAt(seconds: number): SceneState;
  /** Extra parameters echoed into the results JSON. */
  params?: Record<string, unknown>;
  /** Extra verdict fields for the results JSON and HUD, from the current GPU average (ms) or null. */
  verdict?(gpuAvgMs: number | null): { lines: string[]; fields: Record<string, unknown> };
  /** Scissor the render to a 1 CSS px square (about dpr² buffer pixels), so GPU time is mostly vertex work. */
  isolateVertex?: boolean;
}

/** How often the info lines and the results JSON are refreshed. */
const INFO_INTERVAL_MS = 250;

export function runRenderSpike(cfg: RenderSpikeConfig): void {
  const canvas = document.createElement('canvas');
  canvas.id = 'stage';
  document.body.append(canvas);

  const hud: Hud = createHud();
  const renderer = new WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(cfg.dpr);
  renderer.setClearColor(new Color('#0B0D12'), 1);
  if (cfg.isolateVertex) {
    renderer.setScissorTest(true);
    renderer.setScissor(0, 0, 1, 1);
  }
  const gl = renderer.getContext() as WebGL2RenderingContext;
  const timer = createGpuTimer(gl as unknown as TimerGl);
  if (!timer) hud.setGpuMs(null);

  const camera = new PerspectiveCamera(40, 1, 0.1, 100);
  const scene = new Scene();
  const mech = mechanisms[ACTIVE_MECHANISM];
  const anchors = mechanismAnchors(mech);
  const motes = createMoteSystem(mech, cfg.n, MOTE_SEED, { forceType: cfg.forceType });
  scene.add(motes.object);

  const overlay = document.getElementById('hud') as HTMLElement;
  const drawingBuffer = new Vector2();
  const renderer_ = rendererString(gl);

  const panel = mountResultsPanel(overlay, () => {
    const summary = hud.summary();
    const v = cfg.verdict?.(summary.gpu.avgMs);
    return {
      spike: cfg.spike,
      ua: navigator.userAgent,
      renderer: renderer_,
      devicePixelRatio: window.devicePixelRatio,
      params: { mechanism: ACTIVE_MECHANISM, n: cfg.n, dpr: cfg.dpr, ...cfg.params },
      instances: motes.counts.instances,
      visibleInstances: {
        specced: motes.counts.visible[0],
        vibed: motes.counts.visible[1],
        misallocated: motes.counts.visible[2],
      },
      viewport: {
        cssWidth: window.innerWidth,
        cssHeight: window.innerHeight,
        bufferWidth: drawingBuffer.x,
        bufferHeight: drawingBuffer.y,
      },
      cpu: summary.cpu,
      interval: summary.interval,
      gpu: summary.gpu,
      ...v?.fields,
      collectedAt: new Date().toISOString(),
    };
  });

  function resize(): void {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.getDrawingBufferSize(drawingBuffer);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  let start = 0;
  let last = 0;
  let lastInfo = 0;

  function frame(now: number): void {
    requestAnimationFrame(frame);
    if (document.hidden) {
      last = 0; // the next visible delta would span the whole hidden period
      return;
    }
    if (start === 0) start = now;
    if (last !== 0) hud.interval(now - last);
    last = now;

    const cpuStart = performance.now();
    const state = cfg.stateAt((now - start) / 1000);
    applyCamera(camera, state, anchors);
    const viewport = { width: drawingBuffer.x, height: drawingBuffer.y, pixelRatio: renderer.getPixelRatio() };
    motes.update(state, camera, viewport, null);
    timer?.begin();
    renderer.render(scene, camera);
    timer?.end();
    hud.frame(performance.now() - cpuStart);
    if (timer) for (const ms of timer.collect()) hud.setGpuMs(ms);

    if (now - lastInfo >= INFO_INTERVAL_MS) {
      lastInfo = now;
      const gpuAvg = hud.summary().gpu.avgMs;
      const v = cfg.verdict?.(gpuAvg);
      hud.setInfo([
        `${cfg.spike}: n ${cfg.n} (${motes.counts.instances} instances), dpr ${cfg.dpr}, buffer ${drawingBuffer.x}×${drawingBuffer.y}`,
        `renderer: ${renderer_}`,
        ...(v?.lines ?? []),
      ]);
      panel.refresh();
    }
  }
  requestAnimationFrame(frame);
}
