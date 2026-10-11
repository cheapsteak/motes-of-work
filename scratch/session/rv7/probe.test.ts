import { it } from 'vitest';
import { PerspectiveCamera, Vector3 } from '/home/user/motes-of-work/node_modules/three/build/three.module.js';
import { networkTop, machineOnScreen } from '/home/user/motes-of-work/e2e/machine.ts';
import { mechanisms } from '/home/user/motes-of-work/src/mechanisms';
import { mechanismAnchors } from '/home/user/motes-of-work/src/mechanisms/anchors';
import { boxCorners } from '/home/user/motes-of-work/src/network/cluster';
import { nodeIndex } from '/home/user/motes-of-work/src/network/generate';
import { applyCamera } from '/home/user/motes-of-work/src/scene/cameraRig';
import { sectionSpans } from '/home/user/motes-of-work/src/scroll/progress';
import { loadStory } from '/home/user/motes-of-work/src/story/loader';
import { KeyframeSampler, type KeyframeFile } from '/home/user/motes-of-work/src/timeline/keyframeSampler';
import keyframes from '/home/user/motes-of-work/src/timeline/keyframes.json';
import { essayNetwork, NET_CENTRE, netShotOf } from '/home/user/motes-of-work/src/timeline/netShots';

const story = loadStory();
const spans = sectionSpans(story);
const sampler = new KeyframeSampler(keyframes as unknown as KeyframeFile, spans);
const at = (id: string, l: number) => { const s = spans.find((x) => x.id === id)!; return s.start + l * (s.end - s.start); };
const sizes = [[390, 844], [1440, 900]];

it('probe', () => {
  const net = essayNetwork();
  for (const [w, h] of sizes) {
    for (const [id, sec, l] of [['C1', 'far', 0.5], ['R0', 'far', 0.5], ['C1', 'defect', 0.12], ['R0', 'trace', 0.45], ['R0', 'trace', 0.68], ['R0', 'fix', 0.07], ['R1', 'fix', 0.27]] as const) {
      const n = net.nodes[nodeIndex(net, id)];
      const st = sampler.sample(at(sec, l));
      const cam = new PerspectiveCamera(40, w / h, 0.1, 400);
      applyCamera(cam, st, mechanismAnchors(mechanisms.bike), { compose: true });
      cam.updateMatrixWorld();
      const xs: number[] = []; const ys: number[] = [];
      for (const c of boxCorners(n.boxes[n.crackBox])) { const q = new Vector3(...c).project(cam); xs.push(((q.x + 1) / 2) * w); ys.push(((1 - q.y) / 2) * h); }
      console.log(`${w}x${h} ${id} ${sec}@${l} crack rect x ${Math.min(...xs).toFixed(1)}..${Math.max(...xs).toFixed(1)} y ${Math.min(...ys).toFixed(1)}..${Math.max(...ys).toFixed(1)} area ${((Math.max(...xs)-Math.min(...xs))*(Math.max(...ys)-Math.min(...ys))).toFixed(0)}`);
    }
    for (const sec of ['far', 'defect', 'fix', 'lesson']) {
      let minTop = Infinity, minAt = -1, wideMin = Infinity, nonWideMin = Infinity, nonWideAt = -1;
      for (let i = 0; i <= 200; i++) {
        const l = i / 200; const st = sampler.sample(at(sec, l));
        const t = networkTop(st, w, h);
        const tg = netShotOf(st.camera).target;
        const wide = Math.hypot(tg[0] - NET_CENTRE[0], tg[1] - NET_CENTRE[1], tg[2] - NET_CENTRE[2]) < 0.5;
        if (t < minTop) { minTop = t; minAt = l; }
        if (wide) wideMin = Math.min(wideMin, t); else if (t < nonWideMin) { nonWideMin = t; nonWideAt = l; }
      }
      console.log(`${w}x${h} ${sec}: networkTop min ${minTop.toFixed(0)} at ${minAt}; wide min ${wideMin.toFixed(0)}; non-wide min ${nonWideMin.toFixed(0)} at ${nonWideAt}`);
    }
    for (const l of [0.51, 0.55, 0.6, 0.7, 0.8, 0.9]) {
      const st = sampler.sample(at(sec2(l), l2(l)));
    }
  }
});
function sec2(_: number) { return 'fix'; }
function l2(l: number) { return l; }
