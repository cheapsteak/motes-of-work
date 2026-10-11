import { mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { PNG } from 'pngjs';
import { PerspectiveCamera, Vector3 } from 'three';
import { mechanisms, MECHANISM_IDS, type MechanismId } from '../src/mechanisms';
import { mechanismAnchors, type RoleAnchor } from '../src/mechanisms/anchors';
import { applyCamera } from '../src/scene/cameraRig';
import { defaultSceneState, mergeState, type SceneState } from '../src/timeline/sceneState';
import { CANVAS_ONLY_CSS } from './helpers';

// Renders fixed scene states through `/?test=1&mech=<id>&state=…` for every registered mechanism,
// screenshots the stage canvas, decodes the PNG in Node and asserts by pixel sampling. Probe regions
// come from the mechanism's anchors projected through the same camera the page uses, never from
// hard-coded pixels. Screenshots land in shots/ for human review.
// `?state=` merges over the scroll-sampled state, so each partial is first expanded over the
// defaults: every leaf is pinned and nothing from the story timeline leaks into a look.

const VIEW = { width: 1280, height: 720 };
/**
 * The lit-faces probe renders at a reduced budget. A point cloud has no occlusion, so each view sums
 * both faces of a plate: in front, key-lit faces plus the far faces at backfaceDim; behind, the
 * unlit faces plus the key-lit ones at backfaceDim. For a plate that ratio is (L + f d) / (f + L d)
 * with f = fill, L = fill + key n.L, d = backfaceDim: about 1.31 with the Task 9 lighting (0.45,
 * 1.0, 0.5), and about 1.28 since the key dropped to 0.85 (flat tops blew out). At 100k motes the
 * gears core stacks deep enough that screen blending saturates pixels toward the type colour, which
 * compresses the measured ratio to 1.21; at 3k stacking is shallow and the probe reads the per-mote
 * shading (gears 1.248 at key 1.0 and 1.226 at 0.85, flat from 5k down to 2k). The threshold stays
 * 1.2.
 */
const LIT_QUERY = '&n=3000';

/**
 * The lit-faces floor: how much brighter the core region must be seen from the key-light side than
 * from behind. 1.2 for every machine but the bicycle. The bike is a thin frame of round tubes, flat
 * in z, with its big faces (mudguard bands, saddle top, pedals, bars running along z) turned edge-on
 * to both cameras, where the symmetric rim light treats front and back alike; a model of
 * moteLight() over its points gives 1.10 (1.13 with those faces removed), and it measured 1.10
 * (1.12 with the thinner saddle and the 0.85 key).
 * Its floor of 1.05 still fails broken lighting, which reads about 1.0 (equal front and back).
 */
const LIT_FLOOR: Record<MechanismId, number> = Object.fromEntries(
  MECHANISM_IDS.map((id) => [id, id === 'bike' ? 1.05 : 1.2]),
) as Record<MechanismId, number>;

/** Machine-relative: the whole machine, head on, at about 3 machine radii. */
const CAMERA = { pos: [0, 0, 3.1], target: [0, 0, 0], fov: 40, coreFocus: 0 };

test.use({ viewport: VIEW });
test.setTimeout(120_000);

interface Image {
  width: number;
  height: number;
  data: Buffer; // RGBA
}

type Rgb = [number, number, number];
type Classifier = (c: Rgb) => boolean;

const isAmber: Classifier = ([r, g, b]) => r > 200 && g >= 140 && g <= 200 && b < 120;
const isBlue: Classifier = ([r, g, b]) => b >= 80 && r < 0.6 * b && g < 0.85 * b;
const isNearWhite: Classifier = ([r, g, b]) => Math.min(r, g, b) >= 170 && Math.max(r, g, b) - Math.min(r, g, b) <= 40;

interface Shot extends Image {
  /** The page camera, rebuilt in Node from the same state and anchors. */
  camera: PerspectiveCamera;
}

async function render(page: Page, mech: MechanismId, name: string, state: unknown, query = ''): Promise<Shot> {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  const full: SceneState = mergeState(defaultSceneState(), state);
  await page.goto(`/?test=1&mech=${mech}${query}&state=${encodeURIComponent(JSON.stringify(full))}`);
  await page.waitForFunction(
    () => ((window as unknown as { __motes?: { frames(): number } }).__motes?.frames() ?? 0) >= 1,
  );
  const onStage = await page.evaluate(
    () => (window as unknown as { __motes: { mechanism(): string } }).__motes.mechanism(),
  );
  expect(onStage, name).toBe(mech);
  // Element screenshots are composited: hide the story panels and the vignette over the canvas.
  await page.addStyleTag({ content: CANVAS_ONLY_CSS });
  mkdirSync('shots', { recursive: true });
  const png = await page.locator('#stage').screenshot({ path: `shots/looks-${mech}-${name}.png` });
  expect(errors, name).toEqual([]);
  const img = PNG.sync.read(png);
  const camera = new PerspectiveCamera(full.camera.fov, img.width / img.height, 0.1, 100);
  applyCamera(camera, full, mechanismAnchors(mechanisms[mech]));
  return { ...img, camera };
}

/** Pixel position of a world point through the shot's camera. */
function project(shot: Shot, p: Vector3): [number, number] {
  const v = p.clone().project(shot.camera);
  return [((v.x + 1) / 2) * shot.width, ((1 - v.y) / 2) * shot.height];
}

/** Count pixels matching `is` inside the box [x0, x1) × [y0, y1) (pixels; clamped to the image). */
function count(img: Image, is: Classifier, box = { x0: 0, y0: 0, x1: img.width, y1: img.height }): number {
  let n = 0;
  const x0 = Math.max(0, Math.floor(box.x0));
  const y0 = Math.max(0, Math.floor(box.y0));
  const x1 = Math.min(img.width, Math.ceil(box.x1));
  const y1 = Math.min(img.height, Math.ceil(box.y1));
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const o = (y * img.width + x) * 4;
      if (is([img.data[o], img.data[o + 1], img.data[o + 2]])) n++;
    }
  }
  return n;
}

/** Summed brightness above the stage background (#0B0D12) inside `box`: r + g + b, background removed. */
function light(img: Image, box: { x0: number; y0: number; x1: number; y1: number }): number {
  let sum = 0;
  const x0 = Math.max(0, Math.floor(box.x0));
  const y0 = Math.max(0, Math.floor(box.y0));
  const x1 = Math.min(img.width, Math.ceil(box.x1));
  const y1 = Math.min(img.height, Math.ceil(box.y1));
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const o = (y * img.width + x) * 4;
      sum += Math.max(0, img.data[o] - 0x0b) + Math.max(0, img.data[o + 1] - 0x0d) + Math.max(0, img.data[o + 2] - 0x12);
    }
  }
  return sum;
}

/** Screen box around an anchor's sphere: its projected centre ± its radius, measured along the camera's up. */
function around(shot: Shot, anchor: RoleAnchor) {
  const centre = new Vector3(...anchor.center);
  const up = new Vector3(0, 1, 0).applyQuaternion(shot.camera.quaternion).multiplyScalar(anchor.radius);
  const [cx, cy] = project(shot, centre);
  const [ux, uy] = project(shot, centre.clone().add(up));
  const r = Math.hypot(ux - cx, uy - cy);
  return { x0: cx - r, y0: cy - r, x1: cx + r, y1: cy + r };
}

for (const mech of MECHANISM_IDS) {
  const anchors = mechanismAnchors(mechanisms[mech]);

  test.describe(mech, () => {
    test('specced machine: warm core, cool body', async ({ page }) => {
      const img = await render(page, mech, 'specced', { camera: CAMERA, mech: { assembly: 1 } });
      expect(count(img, isAmber, around(img, anchors.core))).toBeGreaterThan(50);
      expect(count(img, isBlue, around(img, anchors.body))).toBeGreaterThan(50);
    });

    test('vibed machine: no warm motes anywhere', async ({ page }) => {
      const img = await render(page, mech, 'vibed', {
        camera: CAMERA,
        mech: { assembly: 1 },
        provenance: { vibed: 1 },
      });
      expect(count(img, isAmber)).toBe(0);
      expect(count(img, isBlue)).toBeGreaterThan(1000); // the machine is still there, just cool
    });

    test('ghost of intent adds near-white dots', async ({ page }) => {
      const state = (ghost: number) => ({ camera: CAMERA, mech: { assembly: 1, faults: { misalign: 1 }, ghost } });
      const off = count(await render(page, mech, 'ghost-0', state(0)), isNearWhite);
      const on = count(await render(page, mech, 'ghost-1', state(1)), isNearWhite);
      test.info().annotations.push({ type: 'near-white pixels ghost 1 / ghost 0', description: `${on} / ${off}` });
      expect(on).toBeGreaterThan(off + 200);
    });

    test('lit faces: the machine seen from the key-light side is brighter than from behind', async ({ page }) => {
      // The same settled motes from in front (faces toward the key light and the camera) and from
      // behind (the same faces now turned away). Without lighting the two are mirror images of equal
      // brightness: every mote is drawn either way, additively.
      const at = (z: number) => ({ camera: { ...CAMERA, pos: [0, 0, z] }, mech: { assembly: 1 } });
      const front = await render(page, mech, 'lit-front', at(3.1), LIT_QUERY);
      const back = await render(page, mech, 'lit-back', at(-3.1), LIT_QUERY);
      const lit = light(front, around(front, anchors.core));
      const away = light(back, around(back, anchors.core));
      test.info().annotations.push({ type: 'core brightness front / back', description: `${lit} / ${away}` });
      // Measured at LIT_QUERY (see there): gears 1.248, steam 1.365, strandbeest 1.59, watch 1.57.
      // At the full 100k: gears 1.208, steam 1.275, strandbeest 1.59, watch 1.42. Before the Task 9
      // polish (additive, fill 0.3, backface dim 0.35), gears measured 1.42; 0.994 with the shading
      // neutralised (fill 1, the rest 0 or 1), so the margin is lighting, not framing.
      expect(lit).toBeGreaterThan(LIT_FLOOR[mech] * away);
    });

    test('misallocated machine with invisible motes renders without errors', async ({ page }) => {
      const img = await render(page, mech, 'misallocated', {
        camera: CAMERA,
        mech: { assembly: 1 },
        provenance: { misallocated: 1 },
      });
      const box = around(img, anchors.core);
      const x0 = Math.max(0, box.x0);
      const y0 = Math.max(0, box.y0);
      mkdirSync('shots', { recursive: true });
      // The stage canvas fills the viewport, so a page clip is a canvas crop.
      await page.screenshot({
        path: `shots/looks-${mech}-misallocated-core.png`,
        clip: { x: x0, y: y0, width: Math.min(img.width, box.x1) - x0, height: Math.min(img.height, box.y1) - y0 },
      });
      // Something still renders: the case and the half of the core that stays visible.
      expect(count(img, isBlue)).toBeGreaterThan(1000);
    });
  });
}
