// Spike 1 (spec §10): phone fill rate from large additive halos. Every mote is Human and renders
// as the large halo, at the worst camera framing. Decides the DPR cap and the per-tier halo pixel cap.
//
// Spike pages animate mech.drive from wall-clock time. That is fine here: they are measurement
// harnesses, not the story, and the purity invariant (spec §6.1) applies to the story page only.
import { MoteType } from '../scene/mote/attributes';
import { defaultSceneState, mergeState } from '../timeline/sceneState';
import { fillParams } from './params';
import { runRenderSpike } from './renderSpike';

const { n, dpr } = fillParams(window.location.search);

// Worst framing: halos at their largest on screen. Machine-relative (units of the whole machine's
// anchor); for the gears this is world pos (-0.9, 0, 2.2) looking at the origin.
const CAMERA_POS: [number, number, number] = [-0.419, 0.04, 0.881];
const base = mergeState(defaultSceneState(), {
  camera: { pos: CAMERA_POS, target: [-0.068, 0.04, 0.023], coreFocus: 0 },
});

runRenderSpike({
  spike: 'fill',
  n,
  dpr,
  forceType: MoteType.Human,
  stateAt: (seconds) => mergeState(base, { mech: { drive: seconds } }),
  params: { cameraPos: CAMERA_POS, allHuman: true },
});
