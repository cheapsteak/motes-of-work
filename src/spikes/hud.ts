import { RollingStats } from './stats';

// Heads-up display for the spike pages: rolling 60-frame average and p95 of CPU time (JS work per
// frame), of the frame interval (the rAF delta) and, when the browser offers
// EXT_disjoint_timer_query_webgl2, of GPU frame time.

const WINDOW = 60;

export interface TimingSummary {
  avgMs: number | null;
  p95Ms: number | null;
  frames: number;
}

export interface HudSummary {
  cpu: TimingSummary;
  interval: TimingSummary;
  gpu: TimingSummary & { available: boolean };
}

export interface Hud {
  /** One frame's CPU time in ms: the JS work of updating the scene and issuing the draw calls. */
  frame(cpuMs: number): void;
  /** One frame interval in ms: the rAF delta, which is what the viewer feels as frame rate. */
  interval(ms: number): void;
  /** One GPU frame time in ms, or null once to say the GPU timer is unavailable. */
  setGpuMs(ms: number | null): void;
  /** Free-form lines under the numbers (parameters, verdicts). */
  setInfo(lines: string[]): void;
  summary(): HudSummary;
}

const fmt = (x: number | null): string => (x === null ? '–' : x.toFixed(2));

function summarize(s: RollingStats): TimingSummary {
  return { avgMs: s.average(), p95Ms: s.p95(), frames: s.count };
}

export function createHud(): Hud {
  const root = document.createElement('div');
  root.className = 'overlay';
  root.id = 'hud';
  root.innerHTML = `
    <div>CPU <b data-hud="cpu-avg">–</b> ms average, p95 <b data-hud="cpu-p95">–</b> ms</div>
    <div>Frame interval <b data-hud="interval-avg">–</b> ms average, p95 <b data-hud="interval-p95">–</b> ms</div>
    <div data-hud="gpu">GPU timer: measuring</div>
    <pre data-hud="info"></pre>`;
  document.body.append(root);
  const q = (name: string) => root.querySelector<HTMLElement>(`[data-hud="${name}"]`) as HTMLElement;
  const cpuAvg = q('cpu-avg');
  const cpuP95 = q('cpu-p95');
  const intervalAvg = q('interval-avg');
  const intervalP95 = q('interval-p95');
  const gpuLine = q('gpu');
  const infoEl = q('info');

  const cpu = new RollingStats(WINDOW);
  const interval = new RollingStats(WINDOW);
  const gpu = new RollingStats(WINDOW);
  let gpuAvailable = true;

  function showGpu(): void {
    if (!gpuAvailable) {
      gpuLine.textContent = 'GPU timer unavailable';
    } else if (gpu.count === 0) {
      gpuLine.textContent = 'GPU timer: measuring';
    } else {
      gpuLine.textContent = `GPU frame ${fmt(gpu.average())} ms average, p95 ${fmt(gpu.p95())} ms`;
    }
  }
  showGpu();

  return {
    frame(cpuMs) {
      cpu.push(cpuMs);
      cpuAvg.textContent = fmt(cpu.average());
      cpuP95.textContent = fmt(cpu.p95());
    },
    interval(ms) {
      interval.push(ms);
      intervalAvg.textContent = fmt(interval.average());
      intervalP95.textContent = fmt(interval.p95());
    },
    setGpuMs(ms) {
      if (ms === null) gpuAvailable = false;
      else gpu.push(ms);
      showGpu();
    },
    setInfo(lines) {
      infoEl.textContent = lines.join('\n');
    },
    summary: () => ({
      cpu: summarize(cpu),
      interval: summarize(interval),
      gpu: { available: gpuAvailable, ...summarize(gpu) },
    }),
  };
}
