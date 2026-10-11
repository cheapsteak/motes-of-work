import { PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { HOLE_LENS } from './holeLook';
import { NO_SHADOW, shadowDisc } from './shadow';

/** A camera at `pos` looking at the origin, on a `w` × `h` CSS px screen, optionally lens-shifted as the essay's rig does. */
function cameraAt(pos: readonly [number, number, number], w: number, h: number, shift = 0): PerspectiveCamera {
  const c = new PerspectiveCamera(45, w / h, 0.1, 4000);
  c.position.set(...pos);
  c.lookAt(0, 0, 0);
  if (shift !== 0) c.setViewOffset(c.aspect, 1, 0, shift, c.aspect, 1);
  c.updateMatrixWorld();
  c.updateProjectionMatrix();
  return c;
}

describe('shadowDisc', () => {
  it('is the projected hole, B_CRIT × scale × focal / z across in device px, from the bottom left', () => {
    const c = cameraAt([0, 20, 70], 390, 844, -0.21);
    const viewport = { width: 390, height: 844, pixelRatio: 1 };
    const s = shadowDisc(c, viewport, [0, 0, 0]);
    const p = new Vector3(0, 0, 0).project(c);
    expect(s.x).toBeCloseTo(((p.x + 1) / 2) * 390, 6);
    expect(s.y).toBeCloseTo(((p.y + 1) / 2) * 844, 6);
    // Below the middle: gl_FragCoord counts up from the bottom.
    expect(s.y).toBeLessThan(844 / 2);
    const z = Math.hypot(20, 70);
    const focal = 0.5 * 844 * c.projectionMatrix.elements[5];
    expect(s.r).toBeCloseTo((HOLE_LENS.bCrit * focal) / z, 6);
    expect(shadowDisc(c, viewport, [0, 0, 0], 2).r).toBeCloseTo((2 * HOLE_LENS.bCrit * focal) / z, 6);
  });

  it('the radius doubles at DPR 2 (Review Focus 2)', () => {
    const c = cameraAt([0, 20, 70], 390, 844);
    const one = shadowDisc(c, { width: 390, height: 844, pixelRatio: 1 }, [0, 0, 0]);
    const two = shadowDisc(c, { width: 780, height: 1688, pixelRatio: 2 }, [0, 0, 0]);
    expect(two.r).toBeCloseTo(2 * one.r, 6);
    expect(two.x).toBeCloseTo(2 * one.x, 6);
    expect(two.y).toBeCloseTo(2 * one.y, 6);
  });

  it('is NO_SHADOW behind the camera', () => {
    const c = cameraAt([0, 0, 70], 390, 844);
    expect(NO_SHADOW.r).toBe(0);
    expect(shadowDisc(c, { width: 390, height: 844, pixelRatio: 1 }, [0, 0, 140])).toEqual(NO_SHADOW);
    expect(shadowDisc(c, { width: 390, height: 844, pixelRatio: 1 }, [0, 0, 70])).toEqual(NO_SHADOW);
  });
});
