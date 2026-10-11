// Review-only screenshots against the preview on :4190. Every SceneState leaf is pinned so nothing
// leaks from the timeline at scroll 0 (the ?state= JSON is merged over the sampled state).
import { chromium } from '/home/user/motes-of-work/node_modules/@playwright/test/index.mjs';
import { mkdirSync } from 'node:fs';

const OUT = '<scratchpad>/agents/ab77677c9f03d5ba2/review-after';
mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:4173';

const ZERO = { misalign: 0, slip: 0, bind: 0, jitter: 0, ratio: 0, stall: 0, drift: 0 };
const all = (x) => Object.fromEntries(Object.keys(ZERO).map((k) => [k, x]));
const base = () => ({
  camera: { pos: [0, 0, 3.1], target: [0, 0, 0], fov: 40, focus: 0, coreFocus: 0 },
  mech: { assembly: 1, variant: 0, drive: 0.3, faults: { ...ZERO }, ghost: 0 },
  provenance: { vibed: 0, misallocated: 0 },
  motes: { human: 0, agent: 1, dialogue: 0, activity: 0 },
  workshop: { copies: 1, spread: 0 },
  tiers: { guards: 0, constitution: 0, domain: 0, playbook: 0, arc: 0, task: 0, turn: 0, turbulence: 0, promotion: 0 },
  overlay: { strip: 0, effort: 0, effortVisible: 0 },
  clock: 0,
});
const deep = (a, b) => {
  for (const k of Object.keys(b)) {
    if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k])) {
      a[k] = a[k] ?? {};
      deep(a[k], b[k]);
    } else a[k] = b[k];
  }
  return a;
};
const state = (over) => deep(base(), over);

// Story cameras (keyframes.json), machine-relative.
const COLD_OPEN = { pos: [1.102, 0.431, 3.924], target: [-0.068, 0.04, 0.023], fov: 40, focus: 0, coreFocus: 0 };
const SPEC_CLOSE = { pos: [-0.98, 0.1, 4], target: [-0.98, 0, 0], fov: 35, focus: 0, coreFocus: 1 };
const REWIND_WIDE = { pos: [-0.068, 0.04, 6.264], target: [-0.068, 0.04, 0.023], fov: 40, focus: 0, coreFocus: 0 };
const THREE_Q = { pos: [1.6, 1.1, 2.4], target: [0, 0, 0], fov: 40, focus: 0, coreFocus: 0 };
const HEAD_ON = { pos: [0, 0, 3.1], target: [0, 0, 0], fov: 40, focus: 0, coreFocus: 0 };

const twin = { mech: { assembly: 1, variant: 1, drive: 2 }, provenance: { vibed: 1 } };
const specNow = { mech: { assembly: 0.45, variant: 0, drive: 0.5, ghost: 1 } };

const SHOTS = [
  // 1. The cold open as the story frames it, per candidate (twin, vibed, no ghost).
  ...['steam', 'watch', 'strandbeest'].map((m) => [`${m}-story-coldopen-twin`, m, state({ camera: COLD_OPEN, ...twin })]),
  // 2. The spec close-up as the story frames it (coreFocus 1, assembly 0.45, ghost 1).
  ...['steam', 'watch', 'strandbeest'].map((m) => [`${m}-story-spec-close`, m, state({ camera: SPEC_CLOSE, ...specNow })]),
  // 3. Strandbeest staging: side-on and low, and a low three-quarter.
  ['strandbeest-side-low', 'strandbeest', state({ camera: { pos: [0.1, 0.12, 2.9], target: [0, -0.15, 0], fov: 38, focus: 0, coreFocus: 0 } })],
  ['strandbeest-low-threeq', 'strandbeest', state({ camera: { pos: [1.3, 0.3, 2.4], target: [0, -0.2, 0], fov: 40, focus: 0, coreFocus: 0 } })],
  ['strandbeest-side-low-twin', 'strandbeest', state({ camera: { pos: [0.1, 0.12, 2.9], target: [0, -0.15, 0], fov: 38, focus: 0, coreFocus: 0 }, ...twin })],
  // 4. Steam twin from the front-left so the detached governor arms stand against dark.
  ['steam-twin-frontleft', 'steam', state({ camera: { pos: [-1.2, 0.8, 2.6], target: [0, 0.1, 0], fov: 40, focus: 0, coreFocus: 0 }, ...twin })],
  ['steam-correct-frontleft', 'steam', state({ camera: { pos: [-1.2, 0.8, 2.6], target: [0, 0.1, 0], fov: 40, focus: 0, coreFocus: 0 }, mech: { drive: 2 } })],
  // 5. Watch head-on: plate, pallet fork; and the twin head-on.
  ['watch-headon', 'watch', state({ camera: HEAD_ON })],
  ['watch-headon-twin', 'watch', state({ camera: HEAD_ON, ...twin })],
  ['watch-core-close', 'watch', state({ camera: { pos: [0, 0.2, 3.2], target: [0, 0, 0], fov: 35, focus: 0, coreFocus: 1 } })],
  // 6. Quiet failure at ghost 0.35 vs 1 (gears, three-quarter) and steam at 0.35.
  ['gears-quiet-ghost1', 'gears', state({ camera: THREE_Q, mech: { ghost: 1 }, provenance: { misallocated: 1 } })],
  ['gears-quiet-ghost035', 'gears', state({ camera: THREE_Q, mech: { ghost: 0.35 }, provenance: { misallocated: 1 } })],
  ['steam-quiet-ghost035', 'steam', state({ camera: THREE_Q, mech: { ghost: 0.35 }, provenance: { misallocated: 1 } })],
  // 7. Single faults on steam (drift, ratio) against the ghost.
  ['steam-fault-drift', 'steam', state({ camera: THREE_Q, mech: { ghost: 1, faults: { ...ZERO, drift: 0.6 } } })],
  ['steam-fault-misalign', 'steam', state({ camera: THREE_Q, mech: { ghost: 1, faults: { ...ZERO, misalign: 0.6 } } })],
  // 8. Rewind-wide nebula with the twin half-disassembled, steam vs gears.
  ['steam-rewind-mid', 'steam', state({ camera: REWIND_WIDE, mech: { assembly: 0.5, variant: 1, drive: 1 }, provenance: { vibed: 1 } })],
  ['watch-rewind-mid', 'watch', state({ camera: REWIND_WIDE, mech: { assembly: 0.5, variant: 1, drive: 1 }, provenance: { vibed: 1 } })],
];

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const only = process.argv.slice(2);
for (const [name, mech, s] of SHOTS) {
  if (only.length && !only.some((o) => name.includes(o))) continue;
  const url = `${BASE}/?test=1&mech=${mech}&state=${encodeURIComponent(JSON.stringify(s))}`;
  await page.goto(url);
  await page.waitForFunction(() => window.__motes !== undefined && window.__motes.frames() >= 1, null, { timeout: 90_000 });
  await page.addStyleTag({ content: '#story { visibility: hidden; }' });
  await page.evaluate(async () => {
    await window.__motes.settle();
    await new Promise((r) => requestAnimationFrame(() => r()));
  });
  await page.locator('#stage').screenshot({ path: `${OUT}/${name}.png` });
  console.log('shot', name);
}
await browser.close();
if (errors.length) console.log('PAGE ERRORS:', errors.join('; '));
