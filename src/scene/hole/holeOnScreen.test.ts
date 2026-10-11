import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { AMBIENT_POSE } from '../../galaxy/ambient';
import { HOLE_DOTS } from '../../galaxy/hole';
import type { Vec3 } from '../../math/vec';
import { essayCamera, GALAXY_SHOTS, galaxyShotKeys, galaxyShotLampAt, HOLE_CLOSE } from '../../timeline/netShots';
import { Lamp } from '../../timeline/netTrack';
import { defaultSceneState, type SceneState } from '../../timeline/sceneState';
import { galaxyOf } from '../node/galaxyOnScreen';
import { LOD_VISIBLE } from '../node/lod';
import { diskDot, holeDotPx, holeLens, infallDot, jetDot, knotDot, ringDot, strandDot, strandWindow, type HoleDot } from './hole';
import { buildHoleAttrs, DISK_STRIDE, PART_STRIDE } from './holeAttrs';
import { holeAlpha, holeFrame, type HoleMockPart } from './holeFrame';
import { HOLE_DOT, HOLE_JET, HOLE_LOOK, holeComp } from './holeLook';
import { holeDots, holeTop, holeTopBound } from './holeOnScreen';

const { g, data } = galaxyOf();
const A = buildHoleAttrs(g.seed);

/** HOLE_CLOSE as the essay keys it, its lamp on its target, everything built. */
function closeState(lamp = HOLE_CLOSE.lamp): SceneState {
  const s = defaultSceneState();
  s.camera = galaxyShotKeys(HOLE_CLOSE, g);
  s.net = { ...s.net, show: 1, growth: 1, lamp, lampAt: galaxyShotLampAt(HOLE_CLOSE) };
  return s;
}

/** The highest screen y of a drawn dot's top (y − px / 2) over every dot of every part through the twins: the brute force. */
function bruteTop(s: SceneState, t: number, size: { width: number; height: number }): number {
  const camera = essayCamera(s.camera, g, data, size, t);
  const f = holeFrame(s, g, data, camera, size, t);
  const v = f.view;
  let top = Infinity;
  const take = (d: HoleDot, key: HoleMockPart) => {
    if (!(holeAlpha(d.alpha, key) > 0) || !(-d.view[2] > camera.near)) return;
    const q = new Vector3(...d.view).applyMatrix4(camera.projectionMatrix);
    const x = ((q.x + 1) / 2) * size.width;
    if (x < 0 || x > size.width) return;
    const y = ((1 - q.y) / 2) * size.height;
    top = Math.min(top, y - holeDotPx(d.sizeCss * holeComp(key).size, -d.view[2], 1) / 2);
  };
  for (let i = 0; i < HOLE_DOTS.disk; i++) take(diskDot(A.disk, i, v, 0), 'disk');
  for (let i = 0; i < HOLE_DOTS.arch; i++) take(diskDot(A.disk, i, v, 1), 'arch');
  for (let i = 0; i < A.ring.length / PART_STRIDE; i++) take(ringDot(A.ring, i, v), 'ring');
  for (let i = 0; i < A.jets.length / PART_STRIDE; i++) take(jetDot(A.jets, i, v), 'jets');
  for (let i = 0; i < A.knots.length / PART_STRIDE; i++) take(knotDot(A.knots, i, v, { ember: 0, clean: 0 }), 'knot');
  for (let i = 0; i < A.infall.length / PART_STRIDE; i++) take(infallDot(A.infall, i, v), 'infall');
  for (let i = 0; i < A.strand0.length / PART_STRIDE; i++) take(strandDot(A.strand0, i, v, { head: strandWindow(0, 0).head, heat: 0 }), 'strand0');
  for (let i = 0; i < A.strand1.length / PART_STRIDE; i++) take(strandDot(A.strand1, i, v, { head: strandWindow(1, 0).head, heat: 0 }), 'strand1');
  expect(A.disk.length / DISK_STRIDE).toBe(HOLE_DOTS.disk);
  return top;
}

/** The screen y of the upper jet's tip as drawn: the last s with fade ≥ LOD_VISIBLE that the lens draws (its view edge cuts it), on the jet's axis. */
function jetTipY(s: SceneState, t: number, size: { width: number; height: number }): number {
  const camera = essayCamera(s.camera, g, data, size, t);
  const v = holeFrame(s, g, data, camera, size, t).view;
  const L = HOLE_LOOK.jetLength;
  const fade = (x: number) => {
    const ss = (a: number, b: number, u: number) => {
      const k = Math.min(1, Math.max(0, (u - a) / (b - a)));
      return k * k * (3 - 2 * k);
    };
    return ss(0, HOLE_JET.fadeIn, x) * (1 - ss(HOLE_JET.fadeOut * L, L, x));
  };
  for (let x = L; x > 0; x -= 0.005) {
    if (fade(x) < LOD_VISIBLE) continue;
    const p: Vec3 = [0, HOLE_JET.base + x, 0];
    const m = v.viewRot;
    const pv = [0, 1, 2].map((r) => v.hv[r] + m[r] * p[0] + m[3 + r] * p[1] + m[6 + r] * p[2]) as Vec3;
    const l = holeLens(pv, v.hv, 0);
    if (l.ok < HOLE_DOT.hidden) continue;
    const q = new Vector3(...l.pos).applyMatrix4(camera.projectionMatrix);
    return ((1 - q.y) / 2) * size.height;
  }
  throw new Error('no jet drawn');
}

describe('holeTop (the hole’s clearance twin)', () => {
  for (const size of [
    { width: 390, height: 844 },
    { width: 1440, height: 900 },
  ])
    for (const t of [AMBIENT_POSE, 101])
      it(`at HOLE_CLOSE on ${size.width}×${size.height} at ${t} s: as high as the upper jet’s drawn tip, and within 1 px of every dot’s top`, () => {
        const s = closeState();
        const camera = essayCamera(s.camera, g, data, size, t);
        const top = holeTop(s, t, camera, size.width, size.height)!;
        expect(top).not.toBeNull();
        expect(top).toBeLessThanOrEqual(jetTipY(s, t, size));
        const brute = bruteTop(s, t, size);
        expect(Math.abs(top - brute), `holeTop ${top}, brute force ${brute}`).toBeLessThanOrEqual(1);
        // The bound the sweeps skip the dots by is never lower than the top.
        expect(holeTopBound(s, t, camera, size.width, size.height)!).toBeLessThanOrEqual(top);
        // Every dot of the ring, the jets, the knots and the strands, and a tenth of the disk and the arch.
        expect(holeDots(s, t, camera, size.width, size.height).length).toBeGreaterThan(HOLE_DOTS.ring);
      });

  it('is null under lamp Arms: the hole is dark', () => {
    const s = closeState(Lamp.Arms);
    const camera = essayCamera(s.camera, g, data, { width: 390, height: 844 }, AMBIENT_POSE);
    expect(holeDots(s, AMBIENT_POSE, camera, 390, 844)).toEqual([]);
    expect(holeTop(s, AMBIENT_POSE, camera, 390, 844)).toBeNull();
    expect(holeTopBound(s, AMBIENT_POSE, camera, 390, 844)).toBeNull();
  });

  it('holeTopBound is never lower than holeTop, at the galaxy wide and the overhead shots, over the hour', () => {
    let checked = 0;
    for (const shot of [GALAXY_SHOTS.galaxyWide, GALAXY_SHOTS.hood, GALAXY_SHOTS.core])
      for (const size of [
        { width: 390, height: 844 },
        { width: 1440, height: 900 },
      ])
        for (const t of [0, AMBIENT_POSE, 487, 1061, 3599.9]) {
          const s = defaultSceneState();
          s.camera = galaxyShotKeys(shot, g);
          s.net = { ...s.net, show: 1, growth: 1, lamp: Lamp.Off, lampAt: galaxyShotLampAt(shot) };
          const camera = essayCamera(s.camera, g, data, size, t);
          const top = holeTop(s, t, camera, size.width, size.height);
          if (top === null) continue;
          checked++;
          expect(holeTopBound(s, t, camera, size.width, size.height)!, `${size.width} ${t}`).toBeLessThanOrEqual(top);
        }
    expect(checked).toBeGreaterThan(20);
  });
});
