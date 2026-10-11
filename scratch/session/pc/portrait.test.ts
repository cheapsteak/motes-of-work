import { PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { mechanismAnchors } from '../mechanisms/anchors';
import { mechanisms } from '../mechanisms';
import { applyToPoint } from '../math/transform';
import type { Vec3 } from '../math/vec';
import { sectionSpans } from '../scroll/progress';
import { loadStory } from '../story/loader';
import { KeyframeSampler, type KeyframeFile } from '../timeline/keyframeSampler';
import keyframes from '../timeline/keyframes.json';
import type { SceneState } from '../timeline/sceneState';
import { partTransforms } from './mote/partTransforms';
import { applyCamera, PORTRAIT_CORE_LENS_SHIFT, PORTRAIT_LENS_SHIFT, portraitRig } from './cameraRig';

// Portrait framing (aspect < 1): applyCamera widens the shot about the machine's vertical axis and
// shifts the lens so the machine sits in the upper part of the screen, over the text. Checked by
// projecting the posed story frames at a phone's 390 x 844.

const PHONE = 390 / 844;
const bike = mechanisms.bike;
const anchors = mechanismAnchors(bike);
const spans = sectionSpans(loadStory());
const sampler = new KeyframeSampler(keyframes as unknown as KeyframeFile, spans);
const span = (id: string) => {
  const s = spans.find((x) => x.id === id);
  if (!s) throw new Error(`no section ${id}`);
  return s;
};
const at = (id: string, local: number) => span(id).start + local * (span(id).end - span(id).start);

const points = bike.samplePoints(6000, 5);
const riderLocal = bike.rider?.samplePoints(1500, 5).positions ?? [];

/** World positions of the machine at `s` (and its rider, when it is shown), as the motes draw them. */
function posed(s: SceneState, role?: 'core'): Vec3[] {
  const xf = partTransforms(bike, s);
  const v = s.mech.variant;
  const out = points
    .filter((b) => role === undefined || bike.parts[b.part].role === role)
    .map((b) =>
      applyToPoint(xf[b.part], [
        b.local[0] + (b.localTwin[0] - b.local[0]) * v,
        b.local[1] + (b.localTwin[1] - b.local[1]) * v,
        b.local[2] + (b.localTwin[2] - b.local[2]) * v,
      ]),
    );
  if (role === undefined && bike.rider && s.overlay.rider > 0) {
    out.push(...riderLocal.map((p) => applyToPoint(xf[bike.rider!.part], p)));
  }
  return out;
}

function ndc(camera: PerspectiveCamera, ps: Vec3[]): { x: number; y: number }[] {
  camera.updateMatrixWorld();
  return ps.map((p) => {
    const q = new Vector3(...p).project(camera);
    return { x: q.x, y: q.y };
  });
}

function phoneCamera(s: SceneState): PerspectiveCamera {
  const camera = new PerspectiveCamera(40, PHONE, 0.1, 100);
  applyCamera(camera, s, anchors, { reframePortrait: true });
  return camera;
}

describe('portraitRig', () => {
  const rig = { pos: [1.5, 0.2, 2.1] as Vec3, target: [-0.4, 0.03, 0.3] as Vec3, fov: 40 };

  it('is the identity at aspect 1 and wider', () => {
    for (const aspect of [1, 4 / 3, 16 / 9, 3]) expect(portraitRig(rig, aspect)).toEqual({ ...rig, shift: 0 });
  });

  it('centres the machine, backs off by sqrt(m) and widens the field by sqrt(m), m = clamp(0.89 / aspect, 1, 2.4)', () => {
    const m = 0.89 / PHONE;
    const k = Math.sqrt(m);
    const r = portraitRig(rig, PHONE);
    expect(r.target).toEqual([0, 0.03, 0]);
    const want = [0 + (1.5 + 0.4) * k, 0.03 + (0.2 - 0.03) * k, 0 + (2.1 - 0.3) * k];
    r.pos.forEach((c, i) => expect(c).toBeCloseTo(want[i], 12));
    expect(Math.tan((r.fov * Math.PI) / 360)).toBeCloseTo(Math.tan((40 * Math.PI) / 360) * k, 12);
    expect(r.shift).toBe(PORTRAIT_LENS_SHIFT);
    expect(PORTRAIT_LENS_SHIFT).toBe(0.15);
  });

  it('lifts the shot further as the camera focuses on the core: 0.15 of the height, blended to 0.22', () => {
    expect(PORTRAIT_CORE_LENS_SHIFT).toBe(0.22);
    expect(portraitRig(rig, PHONE, 0).shift).toBe(PORTRAIT_LENS_SHIFT);
    expect(portraitRig(rig, PHONE, 0.5).shift).toBeCloseTo(0.185, 12);
    expect(portraitRig(rig, PHONE, 1).shift).toBeCloseTo(PORTRAIT_CORE_LENS_SHIFT, 12);
    expect(portraitRig(rig, PHONE, 2).shift).toBeCloseTo(PORTRAIT_CORE_LENS_SHIFT, 12);
    // Only the shift moves: the pose and the field are the same at any focus.
    const { shift: _a, ...wide } = portraitRig(rig, PHONE, 0);
    const { shift: _b, ...close } = portraitRig(rig, PHONE, 1);
    expect(close).toEqual(wide);
    expect(portraitRig(rig, 16 / 9, 1).shift).toBe(0);
  });

  it('never narrows the shot, and widens it at most by 2.4', () => {
    const tanHalf = (f: number) => Math.tan((f * Math.PI) / 360);
    expect(tanHalf(portraitRig(rig, 0.95).fov) / tanHalf(40)).toBeCloseTo(1, 12); // 0.89 / 0.95 < 1
    expect(tanHalf(portraitRig(rig, 0.2).fov) / tanHalf(40)).toBeCloseTo(Math.sqrt(2.4), 12);
  });
});

describe('applyCamera in portrait', () => {
  it('leaves a landscape camera exactly as it was without the reframe', () => {
    for (const p of [0.05, 0.31, 0.41, 0.62, 0.9]) {
      const s = sampler.sample(p);
      const plain = new PerspectiveCamera(40, 16 / 9, 0.1, 100);
      const framed = new PerspectiveCamera(40, 16 / 9, 0.1, 100);
      applyCamera(plain, s, anchors);
      applyCamera(framed, s, anchors, { reframePortrait: true });
      expect(framed.view).toBeNull();
      expect(framed.projectionMatrix.equals(plain.projectionMatrix), `projection at ${p}`).toBe(true);
      expect(framed.matrixWorld.equals(plain.matrixWorld), `pose at ${p}`).toBe(true);
    }
  });

  it('shifts the lens up in portrait and clears the shift on return to landscape', () => {
    const s = sampler.sample(0.2);
    const camera = phoneCamera(s);
    expect(camera.view?.enabled).toBe(true);
    expect(camera.aspect).toBeCloseTo(PHONE, 12);
    // The machine's axis (the target) lands above the screen centre: y_ndc = 2 * 0.15 = 0.3.
    const target = new Vector3(...anchors.whole.center).add(new Vector3(0, s.camera.target[1] * anchors.whole.radius, 0));
    expect(target.project(camera).y).toBeCloseTo(0.3, 6);

    camera.aspect = 16 / 9;
    camera.updateProjectionMatrix();
    applyCamera(camera, s, anchors, { reframePortrait: true });
    const plain = new PerspectiveCamera(40, 16 / 9, 0.1, 100);
    applyCamera(plain, s, anchors);
    expect(camera.view === null || !camera.view.enabled).toBe(true);
    expect(camera.fov).toBe(plain.fov);
    expect(camera.projectionMatrix.equals(plain.projectionMatrix)).toBe(true);
  });

  const machineFrames: [string, number][] = [
    ['vibe-build@1', at('vibe-build', 1)],
    ...[0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1].map((l): [string, number] => [`reveal@${l}`, at('reveal', l)]),
  ];

  it.each(machineFrames)('keeps the whole machine (and its rider) in the upper frame at %s', (_name, p) => {
    const s = sampler.sample(p);
    const xy = ndc(phoneCamera(s), posed(s));
    const xs = xy.map((q) => Math.abs(q.x));
    const ys = xy.map((q) => q.y);
    expect(Math.max(...xs), '|x_ndc|').toBeLessThan(0.92);
    expect(Math.min(...ys), 'lowest y_ndc').toBeGreaterThan(-0.15);
    expect(Math.max(...ys), 'highest y_ndc').toBeLessThan(1);
  });

  // At the spec section the camera frames the core (coreFocus 1). Its parts close over their own
  // settle window, so the core is shot assembled, not part-exploded as it once was: its motes
  // (saddle, bars and pedals) span about 50-57% of the phone's width. Coming closer to reach the
  // old 60% puts the top of the ghost off screen (e2e/portrait.spec.ts), so the floor is 48%.
  // Clearance from the text is measured on the page: e2e/portrait.spec.ts.
  it.each([0.35, 0.5, 0.75, 1])('frames the core across at least 48%% of the width, whole, at spec@%s', (local) => {
    const s = sampler.sample(at('spec', local));
    const xy = ndc(phoneCamera(s), posed(s, 'core'));
    const xs = xy.map((q) => q.x);
    expect((Math.max(...xs) - Math.min(...xs)) / 2, 'core motes').toBeGreaterThanOrEqual(0.48);
    expect(Math.max(...xs.map(Math.abs)), 'core motes stay on screen').toBeLessThan(1);
    expect(Math.max(...xy.map((q) => q.y)), 'the top of the core stays on screen').toBeLessThan(1);
  });

  it('checks story frames that carry the wrong twin, and the rider mid-reveal', () => {
    // Guard against a vacuous pass: these are the frames the reader sees.
    expect(sampler.sample(at('vibe-build', 1)).mech.variant).toBe(1);
    const s = sampler.sample(at('reveal', 0.5));
    expect(s.overlay.rider).toBe(1);
    expect(posed(s).length).toBe(points.length + riderLocal.length);
  });
});
