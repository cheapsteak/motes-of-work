import { Matrix4, PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { mechanismAnchors, type MechanismAnchors } from '../mechanisms/anchors';
import { mechanisms } from '../mechanisms';
import type { Vec3 } from '../math/vec';
import { sectionSpans } from '../scroll/progress';
import { loadStory } from '../story/loader';
import { KeyframeSampler, type KeyframeFile } from '../timeline/keyframeSampler';
import keyframes from '../timeline/keyframes.json';
import { defaultSceneState, mergeState } from '../timeline/sceneState';
import { applyCamera, CAMERA_NEAR, createEssayCamera, GALAXY_FAR, landscapeRig, type CameraOptions } from './cameraRig';

/** Anchors under which machine-relative and world coordinates coincide. */
const UNIT: MechanismAnchors = {
  whole: { center: [0, 0, 0], radius: 1 },
  core: { center: [0, 0, 0], radius: 1 },
  body: { center: [0, 0, 0], radius: 1 },
};

const ANCHORS: MechanismAnchors = {
  whole: { center: [1, 2, 0], radius: 4 },
  core: { center: [-1, 0, 0.5], radius: 2 },
  body: { center: [3, 0, 0], radius: 3 },
};

function lookPoint(camera: PerspectiveCamera, distance: number): Vector3 {
  return camera.getWorldDirection(new Vector3()).multiplyScalar(distance).add(camera.position);
}

describe('applyCamera', () => {
  it('places the camera, aims it at the target and sets the field of view', () => {
    const camera = new PerspectiveCamera(40, 16 / 9, 0.1, 100);
    const projectionBefore = camera.projectionMatrix.clone();
    const s = mergeState(defaultSceneState(), { camera: { pos: [-1.2, 0.3, 5], target: [-0.9, 0, 0], fov: 35 } });
    applyCamera(camera, s, UNIT);

    expect(camera.position.toArray()).toEqual([-1.2, 0.3, 5]);
    expect(camera.fov).toBe(35);
    expect(camera.aspect).toBeCloseTo(16 / 9, 12);
    expect(camera.projectionMatrix.equals(projectionBefore)).toBe(false);
    // The view direction points from the position at the target.
    const forward = camera.getWorldDirection(new Vector3());
    const toTarget = new Vector3(-0.9, 0, 0).sub(camera.position).normalize();
    expect(forward.distanceTo(toTarget)).toBeLessThan(1e-6);
  });

  it('refreshes matrixWorld immediately, without a render', () => {
    const camera = new PerspectiveCamera(40, 16 / 9, 0.1, 100);
    const s = mergeState(defaultSceneState(), { camera: { pos: [-1.2, 0.3, 5], target: [-0.9, 0, 0], fov: 35 } });
    applyCamera(camera, s, UNIT);

    // The translation column of matrixWorld is the world position.
    const worldPos = new Vector3().setFromMatrixPosition(camera.matrixWorld);
    expect(worldPos.distanceTo(new Vector3(-1.2, 0.3, 5))).toBeLessThan(1e-6);
    // The orientation in matrixWorld must be current too (a stale one lags one pose behind).
    const viewDir = new Vector3(0, 0, -1).transformDirection(camera.matrixWorld);
    const toTarget = new Vector3(-0.9, 0, 0).sub(camera.position).normalize();
    expect(viewDir.distanceTo(toTarget)).toBeLessThan(1e-6);
  });

  it('reads pos and target in units of the whole machine at coreFocus 0', () => {
    const camera = new PerspectiveCamera(40, 1, 0.1, 100);
    const s = mergeState(defaultSceneState(), { camera: { pos: [0.5, 0, 2], target: [0, 0, 0], coreFocus: 0 } });
    applyCamera(camera, s, ANCHORS);

    // world = whole.center + value × whole.radius
    expect(camera.position.distanceTo(new Vector3(3, 2, 8))).toBeLessThan(1e-12);
    const dist = camera.position.distanceTo(new Vector3(1, 2, 0));
    expect(lookPoint(camera, dist).distanceTo(new Vector3(1, 2, 0))).toBeLessThan(1e-6);
  });

  it('reads pos and target in units of the core at coreFocus 1', () => {
    const camera = new PerspectiveCamera(40, 1, 0.1, 100);
    const s = mergeState(defaultSceneState(), { camera: { pos: [0.5, 0, 2], target: [0, 0, 0], coreFocus: 1 } });
    applyCamera(camera, s, ANCHORS);

    expect(camera.position.distanceTo(new Vector3(0, 0, 4.5))).toBeLessThan(1e-12);
    const dist = camera.position.distanceTo(new Vector3(-1, 0, 0.5));
    expect(lookPoint(camera, dist).distanceTo(new Vector3(-1, 0, 0.5))).toBeLessThan(1e-6);
  });

  it('lerps the anchor centre and radius between whole and core', () => {
    const camera = new PerspectiveCamera(40, 1, 0.1, 100);
    const s = mergeState(defaultSceneState(), { camera: { pos: [0, 0, 1], target: [0, 0, 0], coreFocus: 0.25 } });
    applyCamera(camera, s, ANCHORS);

    // centre (0.5, 1.5, 0.125), radius 3.5
    expect(camera.position.distanceTo(new Vector3(0.5, 1.5, 3.625))).toBeLessThan(1e-12);
  });
});

// ---- The tracking camera's origin (Task 7) ----

const ACT_I = ['vibe-build', 'reveal', 'rewind', 'spec'];
const story = loadStory();
const spans = sectionSpans(story);
const sampler = new KeyframeSampler(keyframes as unknown as KeyframeFile, spans);
const bike = mechanismAnchors(mechanisms.bike);

/** Act I's golden states: every section at 21 locals, as the keyframes have them (as reflow.test.ts takes them). */
const golden = ACT_I.flatMap((id) => {
  const span = spans.find((s) => s.id === id);
  if (!span) throw new Error(`no section ${id}`);
  return Array.from({ length: 21 }, (_, i) => sampler.sample(span.start + (i / 20) * (span.end - span.start)));
});

/**
 * FNV-1a over the float64 bytes of the composed camera (position, world matrix, projection, fov) at
 * every golden state, on a phone and a desktop, through `make` (by default the camera Act I was
 * pinned with before the galaxy's far plane: far 400).
 */
function cameraFingerprint(options: CameraOptions, make = (aspect: number) => new PerspectiveCamera(40, aspect, 0.1, 400)): string {
  const values: number[] = [];
  for (const aspect of [390 / 844, 1440 / 900]) {
    const camera = make(aspect);
    for (const s of golden) {
      applyCamera(camera, s, bike, options);
      values.push(...camera.position.toArray(), ...camera.matrixWorld.elements, ...camera.projectionMatrix.elements, camera.fov);
    }
  }
  const bytes = new Uint8Array(new Float64Array(values).buffer);
  let h = 0x811c9dc5;
  for (const b of bytes) h = Math.imul(h ^ b, 0x01000193) >>> 0;
  return h.toString(16).padStart(8, '0');
}

/**
 * Act I through the essay's own camera (createEssayCamera), as pinned at Task 8 fix round 2, and
 * re-pinned with `today` below when Act II lost 1.492 screens (ly-6 and the second fix, deleted by the
 * author): the goldens are global progresses, so the essay's length moves them in the last bits. Act
 * I's states differ from the old ones by at most 6.3e-14 in any leaf; the cameras are Act I's own.
 */
const ESSAY_CAMERA_FINGERPRINT = '69cca476';

describe('applyCamera with an origin', () => {
  it('origin [0, 0, 0] is byte-identical to today for every Act I golden', () => {
    expect(golden).toHaveLength(84);
    // Computed from applyCamera as it was before the origin existed, over the same states and screens.
    const today = '0b04b852';
    expect(cameraFingerprint({ compose: true })).toBe(today);
    expect(cameraFingerprint({ compose: true, origin: [0, 0, 0] })).toBe(today);
  });

  it('fingerprints the default page’s own camera (createEssayCamera, far GALAXY_FAR) over Act I, and sees its far plane (review M5)', () => {
    // Pinned at fix round 2, from the essay's camera as main.ts makes it: what Act I's projection is.
    expect(cameraFingerprint({ compose: true }, createEssayCamera)).toBe(ESSAY_CAMERA_FINGERPRINT);
    expect(cameraFingerprint({ compose: true }, (aspect) => new PerspectiveCamera(40, aspect, CAMERA_NEAR, GALAXY_FAR * 1.01))).not.toBe(
      ESSAY_CAMERA_FINGERPRINT,
    );
  });

  it('turn 0 is byte-identical too, and the fingerprint sees a turn', () => {
    expect(cameraFingerprint({ compose: true, origin: [0, 0, 0], turn: 0 })).toBe('0b04b852');
    expect(cameraFingerprint({ compose: true, turn: 1e-9 })).not.toBe('0b04b852');
  });

  it('a turn swings the camera and its look target about the origin, about +y, as the galaxy turns', () => {
    const o: Vec3 = [3, -1, 2];
    const a = 0.7;
    const s = mergeState(defaultSceneState(), { camera: { pos: [0.5, 0.2, 2], target: [0.1, -0.1, 0], coreFocus: 0 } });
    const plain = new PerspectiveCamera(40, 16 / 9, 0.1, 100);
    const turned = new PerspectiveCamera(40, 16 / 9, 0.1, 100);
    applyCamera(plain, s, UNIT, {});
    applyCamera(turned, s, UNIT, { origin: o, turn: a });
    // The galaxy's turn as the background takes it (galaxySystem.ts: makeRotationY), then the origin.
    const swing = (v: Vector3) => v.clone().applyMatrix4(new Matrix4().makeRotationY(a)).add(new Vector3(...o));
    expect(turned.position.distanceTo(swing(plain.position))).toBeLessThan(1e-12);
    expect(lookPoint(turned, 5).distanceTo(swing(lookPoint(plain, 5)))).toBeLessThan(1e-9);
  });

  it('the fingerprint sees an origin (the identity check is not vacuous)', () => {
    expect(cameraFingerprint({ compose: true, origin: [0, 1e-9, 0] })).not.toBe(cameraFingerprint({ compose: true }));
  });

  it('an origin moves the camera and its look target by exactly the origin, and nothing else', () => {
    const o: Vec3 = [12.5, -3.25, 40.125];
    for (const compose of [false, true]) {
      for (const aspect of [390 / 844, 16 / 9]) {
        const s = mergeState(defaultSceneState(), { camera: { pos: [0.5, 0.2, 2], target: [0.1, -0.1, 0], coreFocus: 0.25, frame: 0.6 } });
        const plain = new PerspectiveCamera(40, aspect, 0.1, 100);
        const moved = new PerspectiveCamera(40, aspect, 0.1, 100);
        applyCamera(plain, s, ANCHORS, { compose });
        applyCamera(moved, s, ANCHORS, { compose, origin: o });
        const shift = new Vector3(...o);
        expect(moved.position.distanceTo(plain.position.clone().add(shift))).toBeLessThan(1e-12);
        const dist = 7.5;
        expect(lookPoint(moved, dist).distanceTo(lookPoint(plain, dist).add(shift))).toBeLessThan(1e-9);
        expect(moved.quaternion.angleTo(plain.quaternion)).toBeLessThan(1e-12);
        expect(moved.projectionMatrix.elements).toEqual(plain.projectionMatrix.elements);
      }
    }
  });
});

// ---- Ruling 4: one aspect rule (landscapeRig beside portraitRig) ----

describe('landscapeRig', () => {
  const keys = mergeState(defaultSceneState(), {
    camera: { pos: [0, 1, 3], frame: 1, landscape: { pos: [0, 2, 6], frame: 0, mix: 1 } },
  }).camera;

  it('takes the keys’ landscape variant on a landscape screen, and never on a portrait one', () => {
    expect(landscapeRig(keys, 1440 / 900)).toEqual({ pos: [0, 2, 6], frame: 0 });
    expect(landscapeRig(keys, 1)).toEqual({ pos: [0, 2, 6], frame: 0 });
    expect(landscapeRig(keys, 390 / 844)).toEqual({ pos: [0, 1, 3], frame: 1 });
  });

  it('blends by mix, and at mix 0 is the keys exactly', () => {
    expect(landscapeRig({ ...keys, landscape: { ...keys.landscape, mix: 0.5 } }, 1.6)).toEqual({ pos: [0, 1.5, 4.5], frame: 0.5 });
    expect(landscapeRig({ ...keys, landscape: { ...keys.landscape, mix: 0 } }, 1.6)).toEqual({ pos: [0, 1, 3], frame: 1 });
  });

  it('is what applyCamera composes with: a landscape screen stands where the variant says, and frames by its frame', () => {
    const at = (aspect: number) => {
      const camera = new PerspectiveCamera(40, aspect, 0.1, 400);
      applyCamera(camera, mergeState(defaultSceneState(), { camera: keys }), ANCHORS, { compose: true });
      return camera;
    };
    const wide = at(1.6);
    const plain = new PerspectiveCamera(40, 1.6, 0.1, 400);
    applyCamera(plain, mergeState(defaultSceneState(), { camera: { ...keys, pos: [0, 2, 6], frame: 0, landscape: { ...keys.landscape, mix: 0 } } }), ANCHORS, { compose: true });
    wide.matrixWorld.elements.forEach((v, i) => expect(v).toBe(plain.matrixWorld.elements[i]));
    wide.projectionMatrix.elements.forEach((v, i) => expect(v).toBe(plain.projectionMatrix.elements[i]));
  });
});

// ---- The freeze frame's roll (freeze-frame §2.1 item 6, §3.1) ----

describe('applyCamera with a roll', () => {
  const keys = { pos: [0.5, 0.4, 2] as Vec3, target: [0.1, -0.1, 0.2] as Vec3, frame: 1 };
  const posed = (roll: number, aspect: number, compose = true) => {
    const camera = new PerspectiveCamera(36, aspect, 0.1, 100);
    applyCamera(camera, mergeState(defaultSceneState(), { camera: { ...keys, roll } }), ANCHORS, { compose, origin: [3, -1, 2], turn: 0.4 });
    return camera;
  };
  /** A world point on a screen of `aspect` (fractions of the width and the height from the top left). */
  const onScreen = (camera: PerspectiveCamera, p: Vector3) => {
    const q = p.clone().project(camera);
    return { x: (q.x + 1) / 2, y: (1 - q.y) / 2 };
  };

  it('at 0 is the camera exactly as before: the fingerprint over Act I is unchanged', () => {
    expect(cameraFingerprint({ compose: true })).toBe('0b04b852');
    const a = posed(0, 390 / 844);
    expect(a.up.toArray()).toEqual([0, 1, 0]);
  });

  it('turns the picture about the target where it lands on screen, by the roll, at both aspects', () => {
    for (const aspect of [390 / 844, 1440 / 900]) {
      const [flat, rolled] = [posed(0, aspect), posed(4, aspect)];
      // A point on the line of sight (the target's) stays where the composition puts it.
      const t = lookPoint(flat, 5);
      const [t0, t1] = [onScreen(flat, t), onScreen(rolled, t)];
      expect(Math.hypot((t1.x - t0.x) * aspect, t1.y - t0.y)).toBeLessThan(1e-9);
      // The same position, the same line of sight; a point off it turns 4° about the target on screen.
      expect(rolled.position.distanceTo(flat.position)).toBeLessThan(1e-12);
      expect(rolled.getWorldDirection(new Vector3()).angleTo(flat.getWorldDirection(new Vector3()))).toBeLessThan(1e-9);
      const p = t.clone().add(new Vector3(0.3, 0.2, -0.1));
      const [p0, p1] = [onScreen(flat, p), onScreen(rolled, p)];
      const angle = (q: { x: number; y: number }) => Math.atan2(-(q.y - t0.y), (q.x - t0.x) * aspect);
      const turned = ((angle(p1) - angle(p0)) * 180) / Math.PI;
      expect(Math.abs(Math.abs(turned) - 4)).toBeLessThan(0.05);
      expect(Math.hypot((p1.x - t0.x) * aspect, p1.y - t0.y)).toBeCloseTo(Math.hypot((p0.x - t0.x) * aspect, p0.y - t0.y), 6);
    }
  });

  it('turns the picture counter-clockwise for a positive roll', () => {
    const [flat, rolled] = [posed(0, 1), posed(4, 1)];
    const t = lookPoint(flat, 5);
    // A point to the right of the target, on the screen's x axis.
    const right = new Vector3().setFromMatrixColumn(flat.matrixWorld, 0);
    const p = t.clone().add(right.multiplyScalar(0.5));
    const q = onScreen(rolled, p);
    const c = onScreen(rolled, t);
    expect(q.y).toBeLessThan(c.y); // up the screen: turned counter-clockwise
  });
});
