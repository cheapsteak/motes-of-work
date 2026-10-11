// Review-only screenshots against the preview on :4190. Every SceneState leaf is pinned so nothing
// leaks from the timeline at scroll 0 (the ?state= JSON is merged over the sampled state).
import { chromium } from '/home/user/motes-of-work/node_modules/@playwright/test/index.mjs';
import { mkdirSync } from 'node:fs';

const OUT = '<scratchpad>/agents/ab77677c9f03d5ba2/ghost';
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

const TAG = process.env.TAG ?? 'x';
const SHOTS = [
  [`ghost-${TAG}-steam-spec`, 'steam', state({ camera: SPEC_CLOSE, mech: { assembly: 0.45, variant: 0, drive: 0.5, ghost: 0.6 } })],
  [`ghost-${TAG}-steam-spec-g1`, 'steam', state({ camera: SPEC_CLOSE, mech: { assembly: 0.45, variant: 0, drive: 0.5, ghost: 1 } })],
  [`ghost-${TAG}-steam-spec-noghost`, 'steam', state({ camera: SPEC_CLOSE, mech: { assembly: 0.45, variant: 0, drive: 0.5, ghost: 0 } })],
  [`ghost-${TAG}-gears-quiet04`, 'gears', state({ camera: THREE_Q, mech: { ghost: 0.4 }, provenance: { misallocated: 1 } })],
  [`ghost-${TAG}-steam-faults`, 'steam', state({ camera: THREE_Q, mech: { ghost: 0.6, faults: { ...ZERO, misalign: 0.6 } } })],
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
