import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { applyToPoint } from './math/transform';
import type { Vec3 } from './math/vec';
import { ZERO_FAULTS } from './timeline/sceneState';
import { bike, partIndex, SCALE } from './mechanisms/bike';
import { riderSkeleton } from './mechanisms/bike/rider';
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const angle = (a: Vec3, b: Vec3) => (Math.acos(dot(a, b) / Math.hypot(...a) / Math.hypot(...b)) * 180) / Math.PI;
it('m', () => {
  const k = riderSkeleton();
  const torso = sub(k.shoulder, k.hip);
  const out: Record<string, unknown> = { torsoPitch: 90 - angle(torso, [0, 1, 0]), hip: k.hip, shoulder: k.shoulder, crown: k.crown };
  for (const i of [0, 1]) {
    out['elbow' + i] = 180 - angle(sub(k.shoulders[i], k.elbows[i]), sub(k.wrists[i], k.elbows[i]));
    out['hipAng' + i] = angle(torso, sub(k.knees[i], k.hips[i]));
    out['knee' + i] = 180 - angle(sub(k.hips[i], k.knees[i]), sub(k.ankles[i], k.knees[i]));
    out['shoulderToWrist' + i] = Math.hypot(...sub(k.wrists[i], k.shoulders[i])) / 1.75;
    out['ankle' + i] = k.ankles[i];
  }
  const pedals = bike.samplePoints(20000, 2).filter((b) => /^pedal-/.test(bike.parts[b.part].id));
  const worst = [Infinity, Infinity]; const at = [0, 0];
  for (let j = 0; j <= 160; j++) {
    const d = j / 40;
    const xf = bike.pose(d, ZERO_FAULTS, 1);
    const w = pedals.map((b) => applyToPoint(xf[b.part], b.localTwin));
    for (const i of [0, 1]) for (const p of [k.heels[i], k.ankles[i], k.soles[i], k.toes[i]]) {
      const f = applyToPoint(xf[partIndex('saddle')], p.map((v) => v * SCALE) as Vec3);
      const n = Math.min(...w.map((q) => Math.hypot(...sub(q, f)))) / SCALE;
      if (n < worst[i]) { worst[i] = n; at[i] = d; }
    }
  }
  out.footWorst = worst; out.footWorstAt = at;
  writeFileSync('<scratchpad>/agents/a839cbcb474978ff7/rider.json', JSON.stringify(out, (_, v) => (typeof v === 'number' ? +v.toFixed(3) : v)));
});
