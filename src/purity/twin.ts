// The rewind invariant's twin (design spec §6.1): a frame is a pure function of (scroll, ambient).
// For every sample of the grid (samples.ts), the page's own stage (src/scene/stage.ts, which main.ts
// draws with) is driven in Node by a jump, a scroll under a running clock, and a scroll past and back,
// each from a fresh page, and what each leaves for the GPU (gpuInputs.ts: every
// visible draw's uniforms, uploaded buffers and textures, render state and transform, and the camera)
// must be equal byte for byte. The shaders are pure functions of those inputs (the `?lib=` parity
// cases), so equal inputs draw equal pixels; the browser fence (e2e/purity.spec.ts) renders the
// samples marked `fence` and proves the page draws what this computes.
//
// A stage costs a second or two to build (the bike's 100k motes and the galaxy), three per sample, so
// the grid is split by scene over the rewind.*.test.ts files, which vitest runs in parallel.
import { describe, expect, it } from 'vitest';
import { ACTIVE_MECHANISM, MOTE_BUDGET_DESKTOP, MOTE_SEED } from '../config';
import { AMBIENT_POSE } from '../galaxy/ambient';
import { galaxyTier } from '../galaxy/background';
import { mechanisms } from '../mechanisms';
import { FREEZE_PINS, shown } from '../scene/ambientClock';
import { createStage, galaxyLead, needsGalaxy } from '../scene/stage';
import { sectionSpans } from '../scroll/progress';
import { loadStory } from '../story/loader';
import { KeyframeSampler, type KeyframeFile } from '../timeline/keyframeSampler';
import keyframes from '../timeline/keyframes.json';
import { differences, gpuInputs, Uploads, type Plain } from './gpuInputs';
import { PURITY_SAMPLES, type PuritySample } from './samples';

/** The browser's purity spec runs at Playwright's default screen, 1280x720 at a device pixel ratio of 1. */
export const SCREEN = { width: 1280, height: 720 };
export const spans = sectionSpans(loadStory());
export const sampler = new KeyframeSampler(keyframes as unknown as KeyframeFile, spans);
const lead = galaxyLead(spans, (p) => sampler.sample(p));

/** The grid's scenes, by section, one test file each (rewind.<scene>.test.ts). */
export const SCENES: Record<string, string[]> = {
  actOne: ['essay', 'spec', 'zoom-out'],
  layers: ['layers', 'far'],
  defect: ['defect'],
  lineage: ['reviewer', 'trace', 'fix'],
};

/** One drawn frame: its progress and the ambient clock's reading. */
export interface Step {
  p: number;
  ambient: number;
}

/**
 * When the galaxy is built: `idle`, right after the first frame (the page's requestIdleCallback);
 * `need`, only once the reader nears it (the lead) or a frame needs it.
 */
export type Build = 'idle' | 'need';

/** A fresh page that draws `path` in order, as main.ts does in test mode; what the last frame leaves for the GPU. */
export function run(path: Step[], build: Build): Plain {
  const stage = createStage(mechanisms[ACTIVE_MECHANISM], MOTE_BUDGET_DESKTOP, MOTE_SEED);
  stage.camera.aspect = SCREEN.width / SCREEN.height;
  stage.camera.updateProjectionMatrix();
  const uploads = new Uploads();
  const tier = galaxyTier(SCREEN.width, SCREEN.height);
  path.forEach((step, i) => {
    if (build === 'idle' && i === 1) stage.buildGalaxy(tier);
    if (step.p >= lead) stage.buildGalaxy(tier);
    const state = sampler.sample(step.p);
    if (needsGalaxy(state)) stage.buildGalaxy(tier);
    stage.draw({
      state,
      override: undefined,
      shot: null,
      ambient: shown(step.ambient, state.freeze.hold),
      liveAmbient: null,
      pins: FREEZE_PINS,
      flashOn: false,
      viewport: { ...SCREEN, pixelRatio: 1 },
      shimmerTime: null,
    });
    uploads.render(stage.scene);
  });
  return gpuInputs(stage.scene, stage.camera, uploads);
}

/**
 * Progress from `from` to `to` as wheel scrolling draws it: `events` wheel events, each animated over
 * a few frames (eased, so the frames bunch at each event's end), ending on `to` exactly.
 */
export function wheel(from: number, to: number, events: number): number[] {
  const out: number[] = [];
  for (let e = 0; e < events; e++) {
    for (const f of [0.35, 0.7, 0.9, 1]) out.push(from + ((to - from) * (e + f)) / events);
  }
  // The page lands on the target's own scrollY, so the last frame is at `to` exactly, not a rounding off it.
  out[out.length - 1] = to;
  return out;
}

/** The ambient a test-mode page holds: `?ambient=`, else the pose. */
export const held = (sample: PuritySample): number => sample.ambient ?? AMBIENT_POSE;

/** Where the rewind overshoots to: 0.8, or 0.95 (0.99) for a target at or past it (e2e/purity.spec.ts). */
const pastOf = (p: number): number => (p < 0.8 ? 0.8 : p < 0.94 ? 0.95 : 0.99);

/** The scene's samples. */
export const samplesOf = (scene: string): PuritySample[] => PURITY_SAMPLES.filter((s) => SCENES[scene].includes(s.section));

/**
 * The rewind tests for one scene's samples, then the checks that they are not vacuous, over the
 * jumped frames the rewind tests kept (vitest runs a file's tests in order).
 */
export function describeRewind(scene: string): void {
  describe(`the rewind invariant in ${scene}, at every sample of the grid (the purity twin)`, () => {
    const jumps = new Map<string, Plain>();
    for (const sample of samplesOf(scene)) {
      it(`${sample.name}: jumping, scrolling under a running clock, and scrolling past and back leave the GPU identical inputs`, { timeout: 120_000 }, () => {
        const p = sample.p(spans);
        const a = held(sample);
        const jump = run([{ p, ambient: a }], 'need');
        jumps.set(sample.name, jump);
        // The page opens at the top and is wheeled down (the browser's eight wheel events), with the
        // clock running as on a reader's page (another ambient every frame) until the last frame, which
        // reads the sample's. The galaxy is built when the page is first idle.
        const down = [0, ...wheel(0, p, 8)];
        const scroll = run(
          down.map((q, i) => ({ p: q, ambient: i === down.length - 1 ? a : (a + 17.3 * (i + 1)) % 3600 })),
          'idle',
        );
        // The rewind, with the clock held as the browser's `?ambient=` holds it: forward past the target,
        // then back onto it (four and four). The galaxy is built only once it is needed.
        const past = pastOf(p);
        const detour = run([0, ...wheel(0, past, 4), ...wheel(past, p, 4)].map((q) => ({ p: q, ambient: a })), 'need');
        expect(differences(jump, scroll), 'scrolled frame differs from jumped frame').toEqual([]);
        expect(differences(jump, detour), 'past-and-back frame differs from jumped frame').toEqual([]);
      });
    }

    const essay = samplesOf(scene).filter((s) => s.section === 'essay');
    if (essay.length > 0) {
      it('is not vacuous: the essay’s three points leave pairwise different inputs', () => {
        expect(essay).toHaveLength(3);
        const frames = essay.map((s) => jumps.get(s.name));
        for (let i = 0; i < frames.length; i++) {
          for (let j = i + 1; j < frames.length; j++) {
            expect(frames[i] && frames[j], `${essay[i].name} and ${essay[j].name} were drawn`).toBeTruthy();
            expect(differences(frames[i]!, frames[j]!).length, `${essay[i].name} and ${essay[j].name}`).toBeGreaterThan(0);
          }
        }
      });
    }

    // An Act II sample held at two ambients (`?ambient=`): the pose and another.
    const pairs = new Map<string, PuritySample[]>();
    for (const s of samplesOf(scene).filter((x) => x.ambient !== undefined)) {
      const key = s.name.replace(/ at ambient .*/, '');
      pairs.set(key, [...(pairs.get(key) ?? []), s]);
    }
    if (pairs.size > 0) {
      it('is not vacuous: a sample held at two ambients leaves different inputs at each, unless the freeze holds it', () => {
        for (const [name, two] of pairs) {
          expect(two, name).toHaveLength(2);
          const [a, b] = two.map((s) => jumps.get(s.name));
          expect(a && b, `${name} was drawn at both`).toBeTruthy();
          // The freeze's hold shows the pin whatever the clock (freeze-frame §1.2): those two are equal by design.
          if (sampler.sample(two[0].p(spans)).freeze.hold >= 0.5) expect(differences(a!, b!), name).toEqual([]);
          else expect(differences(a!, b!).length, name).toBeGreaterThan(0);
        }
      });
    }
  });
}
