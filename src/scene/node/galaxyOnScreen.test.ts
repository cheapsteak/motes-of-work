import { PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { FREEZE_PINS } from '../../galaxy/ambient';
import { defaultSceneState } from '../../timeline/sceneState';
import { FREEZE_BREATH_PX, FREEZE_COPY_PX, FREEZE_MOON_COPY_PX } from './birth';
import { copyRisePx, galaxyOf, galaxyPointTop } from './galaxyOnScreen';

const { g } = galaxyOf();

/** A state with the freeze frame's dressing at `dress`, the focus at `focus` and the camera rolled `roll` degrees. */
function dressed(dress: number, focus: number, roll: number) {
  const s = defaultSceneState();
  s.freeze = { ...s.freeze, dress, hold: 1 };
  s.net = { ...s.net, focus, show: 1, growth: 1 };
  s.camera = { ...s.camera, roll };
  return s;
}

describe('the freeze copies in the twin (Task 12 review: the copies counted in the clearance twins)', () => {
  const sin4 = Math.sin((4 * Math.PI) / 180);
  const moon = g.ids[FREEZE_PINS.C1.moon];
  const otherMoon = g.bodies.find((b) => b.kind === 'moon' && b.host === g.ids.C1 && b.index !== moon)!.index;

  it('raise the held piece by its copy offset times the roll, the moon caught mid-burst twice as far, and nothing else', () => {
    const s = dressed(1, 1, 4);
    expect(copyRisePx(s, g.ids.C1)).toBeCloseTo((FREEZE_COPY_PX + FREEZE_BREATH_PX / 2) * sin4, 12);
    expect(copyRisePx(s, otherMoon)).toBeCloseTo((FREEZE_COPY_PX + FREEZE_BREATH_PX / 2) * sin4, 12);
    expect(copyRisePx(s, moon)).toBeCloseTo((FREEZE_MOON_COPY_PX + FREEZE_BREATH_PX / 2) * sin4, 12);
    expect(copyRisePx(s, g.ids.R0)).toBe(0);
    // Every freeze term is times net.focus, and there is no copy without the dressing or the roll.
    expect(copyRisePx(dressed(1, 0, 4), g.ids.C1)).toBe(0);
    expect(copyRisePx(dressed(0, 1, 4), g.ids.C1)).toBe(0);
    expect(copyRisePx(dressed(1, 1, 0), g.ids.C1)).toBe(0);
    expect(copyRisePx(dressed(0.5, 1, 4), g.ids.C1)).toBeCloseTo((FREEZE_COPY_PX / 2 + FREEZE_BREATH_PX / 2) * sin4, 12);
  });

  it('are counted in a point’s top: the held piece’s point stands its copies’ rise above where the same point would stand off it', () => {
    const camera = new PerspectiveCamera(36, 390 / 844, 0.1, 1000);
    camera.position.set(0, 0, 10);
    camera.updateMatrixWorld();
    const eye = camera.getWorldPosition(new Vector3());
    const focal = 0.5 * 844 * camera.projectionMatrix.elements[5];
    const s = dressed(1, 1, 4);
    const p = { pos: [0, -1, 0] as [number, number, number], diameter: 0.05 };
    const on = galaxyPointTop({ ...p, row: moon }, s, camera, eye, focal, 390, 844)!;
    const off = galaxyPointTop({ ...p, row: g.ids.R0 }, s, camera, eye, focal, 390, 844)!;
    expect(off.top).toBeLessThan(off.y);
    expect(off.top - on.top).toBeCloseTo(copyRisePx(s, moon), 12);
    expect(off.top - on.top).toBeGreaterThan(0.4);
  });
});
