// Spike 2 (spec §10): vertex cost with every fault and the drift field active, 100k motes. Decides
// whether the optional position pass (spec §6.4) is needed: GPU frame time above ~4 ms says yes.
// `?isolate=1` scissors the render to a 1 CSS px square (about dpr² buffer pixels), so the GPU time
// is mostly vertex work.
//
// Spike pages animate mech.drive from wall-clock time. That is fine here: they are measurement
// harnesses, not the story, and the purity invariant (spec §6.1) applies to the story page only.
import { defaultSceneState, mergeState } from '../timeline/sceneState';
import { vertexParams } from './params';
import { runRenderSpike } from './renderSpike';

const VERTEX_BUDGET_MS = 4;

const { n, dpr, isolate } = vertexParams(window.location.search, window.devicePixelRatio);

// Worst case for mote(): mid-assembly (Bezier in flight), wrong-variant blend, all three scenarios
// mixed, every fault and the drift field at 1.
const base = mergeState(defaultSceneState(), {
  // Machine-relative (units of the whole machine's anchor); for the gears this is the world framing
  // the spike was measured with: pos (0, 0, 8) looking at the origin.
  camera: { pos: [-0.068, 0.04, 3.144], target: [-0.068, 0.04, 0.023], coreFocus: 0 },
  mech: {
    assembly: 0.5,
    variant: 0.5,
    faults: { misalign: 1, slip: 1, bind: 1, jitter: 1, ratio: 1, stall: 1, drift: 1 },
  },
  provenance: { vibed: 0.3, misallocated: 0.3 },
});

runRenderSpike({
  spike: 'vertex',
  n,
  dpr,
  isolateVertex: isolate,
  stateAt: (seconds) => mergeState(base, { mech: { drive: seconds } }),
  params: { isolate, allFaults: 1, drift: 1 },
  verdict(gpuAvgMs) {
    if (gpuAvgMs === null) {
      return {
        lines: ['GPU time over 4 ms: unknown (GPU timer unavailable)'],
        fields: { frameOverBudget: null, vertexOverBudget: null, vertexBudgetMs: VERTEX_BUDGET_MS },
      };
    }
    const over = gpuAvgMs > VERTEX_BUDGET_MS;
    // Whole-frame time includes fragment work, so only the isolated run can attribute it to vertices.
    const line = isolate
      ? `vertex time over ${VERTEX_BUDGET_MS} ms: ${over ? 'YES, consider the position pass' : 'no'}`
      : `whole-frame GPU time over ${VERTEX_BUDGET_MS} ms: ${over ? 'YES' : 'no'}${over ? '; rerun with ?isolate=1 to attribute it to vertex work' : ''}`;
    return {
      lines: [line],
      fields: { frameOverBudget: over, vertexOverBudget: isolate ? over : null, vertexBudgetMs: VERTEX_BUDGET_MS },
    };
  },
});
