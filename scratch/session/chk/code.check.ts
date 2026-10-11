import { it } from 'vitest';
import { mechanismAnchors } from '/home/user/motes-of-work/src/mechanisms/anchors';
import { mechanisms } from '/home/user/motes-of-work/src/mechanisms';
import { sectionSpans } from '/home/user/motes-of-work/src/scroll/progress';
import { loadStory } from '/home/user/motes-of-work/src/story/loader';
import { KeyframeSampler } from '/home/user/motes-of-work/src/timeline/keyframeSampler';
import keyframes from '/home/user/motes-of-work/src/timeline/keyframes.json';
import { portraitRig } from '/home/user/motes-of-work/src/scene/cameraRig';
import { essayNetwork, NET_MOVES } from '/home/user/motes-of-work/src/timeline/netShots';
it('code clearance', () => {
  const anchors = mechanismAnchors(mechanisms.bike);
  const spans = sectionSpans(loadStory());
  const sampler = new KeyframeSampler(keyframes as any, spans);
  const g = (w: string) => { const i = w.lastIndexOf('@'); const s = spans.find((x) => x.id === w.slice(0, i))!; return s.start + Number(w.slice(i + 1)) * (s.end - s.start); };
  const net = essayNetwork();
  const { center, radius } = anchors.whole;
  const world = (v: readonly number[]) => v.map((x, k) => center[k] + x * radius);
  for (const [name, m] of Object.entries(NET_MOVES)) {
    const [a, b] = [g(m.from), g(m.to)];
    let worst = { gap: Infinity, id: '', p: 0, rig: '' };
    for (let i = 0; i <= 2000; i++) {
      const p = a + ((b - a) * i) / 2000;
      const st = sampler.sample(p);
      for (const [rig, cam] of [['land', world(st.camera.pos)], ['port', world(portraitRig(st.camera, 390 / 844).pos)]] as const) {
        for (const n of net.nodes) {
          if (n.layer !== 'code' || st.net.growth < n.born) continue;
          const gap = Math.hypot(cam[0] - n.centre[0], cam[1] - n.centre[1], cam[2] - n.centre[2]) - n.radius;
          if (gap < worst.gap) worst = { gap, id: n.id, p: i / 2000, rig };
        }
      }
    }
    console.log(name, JSON.stringify(worst));
  }
});
