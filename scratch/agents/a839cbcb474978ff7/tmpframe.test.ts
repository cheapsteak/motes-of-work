import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { PerspectiveCamera, Vector3 } from 'three';
import { applyToPoint } from './math/transform';
import { mechanismAnchors } from './mechanisms/anchors';
import { mechanisms } from './mechanisms';
import { applyCamera } from './scene/cameraRig';
import { partTransforms } from './scene/mote/partTransforms';
import { defaultSceneState, mergeState } from './timeline/sceneState';
import type { Vec3 } from './math/vec';
it('frame', () => {
  const bike = mechanisms.bike;
  const anchors = mechanismAnchors(bike);
  const points = bike.samplePoints(8000, 1);
  const camera = new PerspectiveCamera(40, 1280 / 720, 0.1, 100);
  const lines: string[] = [];
  const cands: [Vec3, Vec3, number][] = JSON.parse(process.env.CANDS ?? '[]');
  const XC = Number(process.env.XC ?? 0.42);
  const YC = Number(process.env.YC ?? 0);
  const bounds = (pos: Vec3, target: Vec3, fov: number) => {
    const s = mergeState(defaultSceneState(), { camera: { pos, target, fov }, mech: { variant: 1, drive: 3.08 } });
    applyCamera(camera, s, anchors);
    const xf = partTransforms(bike, s);
    const r = bike.rider!;
    const fig = r.samplePoints(2000, 1).positions.map((p) => applyToPoint(xf[r.part], p));
    const ndc = [...points.map((b) => applyToPoint(xf[b.part], b.localTwin)), ...fig].map((p) => new Vector3(...p).project(camera));
    const xs = ndc.map((v) => v.x), ys = ndc.map((v) => v.y);
    return { x: [Math.min(...xs), Math.max(...xs)], y: [Math.min(...ys), Math.max(...ys)] };
  };
  for (let [pos, target, fov] of cands) {
    for (let it = 0; it < 4; it++) {
      const b = bounds(pos, target, fov);
      const dx = XC - (b.x[0] + b.x[1]) / 2, dy = YC - (b.y[0] + b.y[1]) / 2;
      const right = new Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      const up = new Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
      const D = Math.hypot(...pos.map((v, k) => v - target[k]));
      const t = Math.tan((fov * Math.PI) / 360);
      const o = right.multiplyScalar(-dx * D * t * (1280 / 720)).add(up.multiplyScalar(-dy * D * t));
      pos = pos.map((v, k) => v + o.getComponent(k)) as Vec3;
      target = target.map((v, k) => v + o.getComponent(k)) as Vec3;
    }
    const b = bounds(pos, target, fov);
    const r = (v: number[]) => v.map((x) => +x.toFixed(3));
    lines.push(JSON.stringify({ pos: r(pos), target: r(target), fov, x: r(b.x), y: r(b.y) }));
  }
  writeFileSync('<scratchpad>/agents/a839cbcb474978ff7/frame.txt', lines.join('\n'));
});
