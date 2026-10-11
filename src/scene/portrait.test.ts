import { PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { mechanismAnchors } from '../mechanisms/anchors';
import { mechanisms } from '../mechanisms';
import type { Vec3 } from '../math/vec';
import { defaultSceneState, mergeState, type SceneState } from '../timeline/sceneState';
import { applyCamera, FRAMING, portraitRig, targetOnScreen } from './cameraRig';

// The essay's composition (storyboard §2.6, §4 test 9): `applyCamera(..., { compose: true })`
// reframes a portrait screen about the authored target, which it keeps, and shifts the lens so the
// target lands where `camera.frame` says for the screen's orientation. Checked by projecting the
// target through the composed camera.

const PHONE = 390 / 844;
const DESKTOP = 1440 / 900;
const anchors = mechanismAnchors(mechanisms.bike);

/** A machine-relative shot aimed off the machine's axis, as the close shots are. */
const shot = (frame: number, coreFocus = 0): SceneState =>
  mergeState(defaultSceneState(), {
    camera: { pos: [1.3, 0.6, 1.8], target: [0.45, -0.3, 0.1], fov: 36, coreFocus, frame },
  });

/** The target's world position for `s`. */
function targetWorld(s: SceneState): Vector3 {
  const k = s.camera.coreFocus;
  const c = anchors.whole.center.map((v, i) => v + (anchors.core.center[i] - v) * k);
  const r = anchors.whole.radius + (anchors.core.radius - anchors.whole.radius) * k;
  return new Vector3(...s.camera.target.map((v, i) => c[i] + v * r));
}

/** Where the target lands on a composed camera of `aspect`, as fractions from the top-left. */
function landing(s: SceneState, aspect: number): { x: number; y: number } {
  const camera = new PerspectiveCamera(40, aspect, 0.1, 100);
  applyCamera(camera, s, anchors, { compose: true });
  const q = targetWorld(s).project(camera);
  return { x: (q.x + 1) / 2, y: (1 - q.y) / 2 };
}

describe('portraitRig', () => {
  const rig = { pos: [1.5, 0.2, 2.1] as Vec3, target: [-0.4, 0.03, 0.3] as Vec3, fov: 40 };

  it('is the identity at aspect 1 and wider', () => {
    for (const aspect of [1, 4 / 3, 16 / 9, 3]) expect(portraitRig(rig, aspect)).toEqual(rig);
  });

  it('keeps the authored target, backs off by sqrt(m) and widens the field by sqrt(m), m = clamp(0.89 / aspect, 1, 2.4)', () => {
    const k = Math.sqrt(0.89 / PHONE);
    const r = portraitRig(rig, PHONE);
    expect(r.target).toEqual(rig.target);
    const want = rig.pos.map((p, i) => rig.target[i] + (p - rig.target[i]) * k);
    r.pos.forEach((c, i) => expect(c).toBeCloseTo(want[i], 12));
    expect(Math.tan((r.fov * Math.PI) / 360)).toBeCloseTo(Math.tan((40 * Math.PI) / 360) * k, 12);
  });

  it('never narrows the shot, and widens it at most by 2.4', () => {
    const tanHalf = (f: number) => Math.tan((f * Math.PI) / 360);
    expect(tanHalf(portraitRig(rig, 0.95).fov) / tanHalf(40)).toBeCloseTo(1, 12); // 0.89 / 0.95 < 1
    expect(tanHalf(portraitRig(rig, 0.2).fov) / tanHalf(40)).toBeCloseTo(Math.sqrt(2.4), 12);
  });
});

describe('camera.frame', () => {
  it('is the storyboard table: wide low-centre, close lower (and right of the text on a wide screen)', () => {
    expect(FRAMING).toEqual({
      landscape: { wide: { x: 0.5, y: 0.66 }, close: { x: 0.7, y: 0.78 } },
      portrait: { wide: { x: 0.5, y: 0.62 }, close: { x: 0.5, y: 0.76 } },
    });
    expect(targetOnScreen(DESKTOP, 0.5)).toEqual({ x: 0.6, y: 0.72 });
    expect(targetOnScreen(PHONE, 0.5).y).toBeCloseTo(0.69, 12);
    expect(targetOnScreen(PHONE, 2)).toEqual(FRAMING.portrait.close);
    expect(targetOnScreen(PHONE, -1)).toEqual(FRAMING.portrait.wide);
  });

  it.each([
    ['desktop', DESKTOP, FRAMING.landscape],
    ['phone', PHONE, FRAMING.portrait],
  ] as const)('lands the target where the table says on a %s, at frame 0, 1 and between, at any coreFocus', (_n, aspect, table) => {
    for (const coreFocus of [0, 0.6]) {
      for (const [frame, want] of [
        [0, table.wide],
        [1, table.close],
        [0.25, { x: table.wide.x + (table.close.x - table.wide.x) / 4, y: table.wide.y + (table.close.y - table.wide.y) / 4 }],
      ] as const) {
        const got = landing(shot(frame, coreFocus), aspect);
        expect(got.x, `frame ${frame} x`).toBeCloseTo(want.x, 9);
        expect(got.y, `frame ${frame} y`).toBeCloseTo(want.y, 9);
      }
    }
  });

  it('only shifts the lens: the composed camera stands where the rig puts it, looking at the target', () => {
    for (const aspect of [DESKTOP, PHONE]) {
      for (const frame of [0, 1]) {
        const s = shot(frame);
        const camera = new PerspectiveCamera(40, aspect, 0.1, 100);
        applyCamera(camera, s, anchors, { compose: true });
        const r = portraitRig(s.camera, aspect);
        const world = (v: Vec3) => new Vector3(...v.map((x, i) => anchors.whole.center[i] + x * anchors.whole.radius));
        expect(camera.position.distanceTo(world(r.pos))).toBeLessThan(1e-9);
        const look = camera.getWorldDirection(new Vector3());
        const want = world(r.target).sub(world(r.pos)).normalize();
        expect(look.distanceTo(want)).toBeLessThan(1e-9);
        expect(camera.fov).toBeCloseTo(r.fov, 12);
      }
    }
  });
});

describe('applyCamera without composing', () => {
  it('is the plain camera: no view offset, the target dead centre, whatever camera.frame says', () => {
    for (const aspect of [DESKTOP, PHONE]) {
      for (const frame of [0, 1]) {
        const s = shot(frame);
        const camera = new PerspectiveCamera(40, aspect, 0.1, 100);
        applyCamera(camera, s, anchors);
        expect(camera.view).toBeNull();
        expect(camera.fov).toBe(36);
        const q = targetWorld(s).project(camera);
        expect(Math.hypot(q.x, q.y)).toBeLessThan(1e-9);
      }
    }
  });

  it('clears a composed view offset when called plain again', () => {
    const s = shot(1);
    const camera = new PerspectiveCamera(40, DESKTOP, 0.1, 100);
    applyCamera(camera, s, anchors, { compose: true });
    expect(camera.view?.enabled).toBe(true);
    applyCamera(camera, s, anchors);
    const plain = new PerspectiveCamera(40, DESKTOP, 0.1, 100);
    applyCamera(plain, s, anchors);
    expect(camera.view === null || !camera.view.enabled).toBe(true);
    expect(camera.projectionMatrix.equals(plain.projectionMatrix)).toBe(true);
    expect(camera.matrixWorld.equals(plain.matrixWorld)).toBe(true);
  });
});
