p='e2e/clearance.spec.ts'
s=open(p).read()
s=s.replace("import { machineOnScreen } from './machine';","""import { machineOnScreen, networkTop } from './machine';
import { NODE_FIX_WINDOW } from '../src/scene/node/birth';
import { essayNetwork, NET_CENTRE, netShotOf } from '../src/timeline/netShots';
import type { SceneState } from '../src/timeline/sceneState';""")
old="""// under the text.
"""
new="""// under the text. Two more for Act II's network (design test 14): every fix's warm motes, at the
// instant they are all half landed (the grid steps over it), and a wide shot's top layer, which must
// never leave the viewport: the visible machine leaves out what is above the screen, so a top layer
// cut off by the top edge would pass the first test.
"""
assert old in s; s=s.replace(old,new,1)
old="""for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {"""
new="""/** A wide shot: the camera on the network's framing centre (the shots that show all three layers). */
function wide(state: SceneState): boolean {
  const { target } = netShotOf(state.camera);
  return Math.hypot(target[0] - NET_CENTRE[0], target[1] - NET_CENTRE[1], target[2] - NET_CENTRE[2]) < 0.5;
}

/** A page's full-ink stretch, section-local: after its fade-in, before its fade-out (none at the essay's two ends). */
function fullInk(story: Section[], lengths: number[], si: number, pi: number): [number, number] {
  const s = story[si];
  const pg = s.pages[pi];
  const fade = FADE_SCREENS / lengths[si];
  const first = si === 0 && pi === 0;
  const last = si === story.length - 1 && pi === s.pages.length - 1;
  return [pg.in + (first ? 0 : fade), pg.out - (last ? 0 : fade)];
}

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {"""
assert old in s; s=s.replace(old,new)
old="""      let checked = 0;
      for (const [si, s] of story.entries()) {
        const text = await panelText(page, s);
        expect(text.bottom / viewport.height, `${s.id}: the panel inside the text band`).toBeLessThanOrEqual(0.42);
        const fade = FADE_SCREENS / lengths[si];
        for (const [pi, pg] of s.pages.entries()) {
          // The page's full-ink stretch: after its fade-in, before its fade-out (the essay's first
          // page has no fade-in and its last no fade-out).
          const first = si === 0 && pi === 0;
          const last = si === story.length - 1 && pi === s.pages.length - 1;
          const from = pg.in + (first ? 0 : fade);
          const to = pg.out - (last ? 0 : fade);
          const n = Math.max(2, Math.ceil((to - from) / STEP));"""
new="""      let checked = 0;
      let wideChecked = 0;
      for (const [si, s] of story.entries()) {
        const text = await panelText(page, s);
        expect(text.bottom / viewport.height, `${s.id}: the panel inside the text band`).toBeLessThanOrEqual(0.42);
        for (const [pi, pg] of s.pages.entries()) {
          const [from, to] = fullInk(story, lengths, si, pi);
          const n = Math.max(2, Math.ceil((to - from) / STEP));"""
assert old in s; s=s.replace(old,new)
old="""            expect(m.top, `${s.id} page ${pi + 1} at local ${local.toFixed(3)}: machine top vs text bottom ${bottom}`).toBeGreaterThanOrEqual(
              bottom + MARGIN,
            );
          }
        }
      }
      expect(checked, 'not vacuous').toBeGreaterThan(100);"""
new="""            expect(m.top, `${s.id} page ${pi + 1} at local ${local.toFixed(3)}: machine top vs text bottom ${bottom}`).toBeGreaterThanOrEqual(
              bottom + MARGIN,
            );
            if (wide(state)) {
              wideChecked++;
              const top = networkTop(state, viewport.width, viewport.height);
              expect(top, `${s.id} page ${pi + 1} at local ${local.toFixed(3)}: a wide shot's top, off-screen points counted`).toBeGreaterThanOrEqual(
                bottom + MARGIN,
              );
            }
          }
        }
      }
      expect(checked, 'not vacuous').toBeGreaterThan(100);
      expect(wideChecked, 'wide shots checked').toBeGreaterThan(20);"""
assert old in s; s=s.replace(old,new)
old="""    test(`Act I ends on the finished bike, whole and under the text (${size})`, async ({ page }) => {"""
new="""    test(`every fix's warm motes land clear of the text (${size})`, async ({ page }) => {
      // A fix's warm motes fall onto its stack from above and all count as landed at the same
      // instant, half way through their window (net.fix = fixAt - NODE_FIX_WINDOW / 2), when they
      // still stand above the stack: the highest they are counted. The page grid steps over it.
      const errors = await open(page);
      const story = await sections(page);
      const spans = await readSpans(page);
      const sampler = new KeyframeSampler(keyframes, spans);
      const lengths = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('section[data-section]')].map((s) => Number(s.style.getPropertyValue('--length'))),
      );
      const fixes = essayNetwork().nodes.flatMap((n) => (n.fixAt === null ? [] : [{ id: n.id, onset: n.fixAt - NODE_FIX_WINDOW / 2 }]));
      let checked = 0;
      for (const [si, s] of story.entries()) {
        const bottom = (await panelText(page, s)).bottom;
        const fixAt = (local: number) => sampler.sample(s.start + local * (s.end - s.start)).net.fix;
        for (const pi of s.pages.keys()) {
          const [from, to] = fullInk(story, lengths, si, pi);
          for (const f of fixes) {
            if (!(fixAt(from) < f.onset && fixAt(to) >= f.onset)) continue;
            // The first local at which the fix clock reaches the onset (it never decreases), to 1e-7.
            let [lo, hi] = [from, to];
            while (hi - lo > 1e-7) {
              const mid = (lo + hi) / 2;
              if (fixAt(mid) >= f.onset) hi = mid;
              else lo = mid;
            }
            for (const local of [hi, hi + 0.001]) {
              const state = sampler.sample(s.start + local * (s.end - s.start));
              const m = machineOnScreen(mechanisms.bike, state, viewport.width, viewport.height);
              checked++;
              expect(m.top, `${f.id}: its fix in ${s.id} page ${pi + 1} at local ${local.toFixed(5)}`).toBeGreaterThanOrEqual(bottom + MARGIN);
            }
          }
        }
      }
      // C1, R0, R1 and the sweep: every fix that lands under a line (C5's is wordless).
      expect(checked, 'not vacuous').toBeGreaterThan(40);
      expect(errors).toEqual([]);
    });

    test(`Act I ends on the finished bike, whole and under the text (${size})`, async ({ page }) => {"""
assert old in s; s=s.replace(old,new)
open(p,'w').write(s)
