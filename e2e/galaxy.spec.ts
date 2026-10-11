import { expect, test, type Page } from '@playwright/test';
import { PNG } from 'pngjs';
import { Vector3 } from 'three';
import { MOTE_BUDGET_DESKTOP, MOTE_SEED } from '../src/config';
import { BG, galaxyTier } from '../src/galaxy/background';
import { bodyIndex, galaxyBudget, generateGalaxy, pieceOuter, STREAM_DOTS, SYS_MAX, systemOuter, type Galaxy } from '../src/galaxy/generate';
import { RING, ringAt, ringDrawnRadius, type RingVisit } from '../src/galaxy/review';
import { EQ_A, EQ_SECOND, NODE_STREAM_SPEED, SCATTER_AMP, SCATTER_MOON_CAP } from '../src/scene/node/birth';
import { packBodyData, type BodyData } from '../src/scene/node/bodyData';
import { bodyCentre, bodyDerp, bodyGhost, bodyLight, lampGain, trackDot, type BodyClocks } from '../src/scene/node/bodyMote';
import { streamCurve, streamDot } from '../src/scene/node/stream';
import { bodyWorld, galacticToWorld } from '../src/scene/node/orbit';
import { readFileSync } from 'node:fs';
import { KeyframeSampler, type KeyframeFile } from '../src/timeline/keyframeSampler';
import { essayCamera, GALAXY_SHOTS, galaxyShotCamera, galaxyShotKeys, STREAM_BEATS } from '../src/timeline/netShots';
import { streamPixels } from '../src/scene/node/streamOnScreen';
import { Lamp, trackIndex } from '../src/timeline/netTrack';
import { BODY_LOOK, buildTrackAttrs, systemIndexOf, unitIndexOf } from '../src/scene/node/bodyAttrs';
import { STAR_LOOK } from '../src/scene/node/classLook';
import { AMBIENT_POSE } from '../src/galaxy/ambient';
import { FULL_DETAIL_MAX, HOOD_LOD, LOD_BANDS, LodElement, MOON_POINT_PX, systemPx } from '../src/scene/node/lod';
import { canvasShot, openStage, readSpans, settle, targetScrollY } from './helpers';
import { emberComponents } from './pixels';

// The galaxy drawn by level of detail (docs/specs/2026-10-07-galaxy-orbits.md §3, §4), at §14.5's
// probe shots (`?shot=`, each tracking its target), grown (`net.show` and
// `net.growth` 1), at both test sizes, phone first. The levels a system is drawn at are the page's own
// (`__motes.lod()`), the glow sprites it drew where (`__motes.glows()`), and the pixels are the canvas
// alone. Task 5's tests were measured at ambient 0 (the test mode's ambient then) and name it.

test.setTimeout(300_000);

// Read, not imported: Playwright's loader wants an import attribute on JSON that the app build does not.
const keyframes = JSON.parse(readFileSync(new URL('../src/timeline/keyframes.json', import.meta.url), 'utf8')) as KeyframeFile;

interface Hook {
  lod(): { sysPx: number[]; levels: [number, number, number] } | null;
  glows(): { x: number; y: number; r: number }[] | null;
  hoodLod(): { glowPx: number; real: number; far: number; x: number; y: number; unit: number; sx: number; sy: number }[] | null;
  forceLod(el: number, gain: number | null): void;
  isolate(names: string[] | null): void;
  drawStats(): { visible: string[]; instances: Record<string, number> };
}

const SIZES = [
  { width: 390, height: 844, label: 'phone' },
  { width: 1440, height: 900, label: 'desktop' },
] as const;

const SHOTS = ['galaxyWide', 'hood', 'core', 'system', 'twelve', 'close'] as const;
type Shot = (typeof SHOTS)[number];

/**
 * The glow's lit edge (galaxy §4's profile, mote.frag.glsl): a pixel counts as lit past GLOW_LIT of
 * 255 on a channel. Beyond the core (35 % of the radius) only the halo 0.45 (1 − r)² is left, drawn at
 * the glow's brightness (BODY_LOOK.glowBrightness) on the blue channel (1.0), so it falls under GLOW_LIT
 * at GLOW_LIT_R of the sprite's radius; the screen's sampling may light a pixel up to GLOW_SLACK further.
 */
const GLOW_LIT = 4;
const GLOW_LIT_R = 1 - Math.sqrt(GLOW_LIT / (255 * BODY_LOOK.glowBrightness * 0.45));
const GLOW_SLACK = 0.5;

const GROWN = encodeURIComponent(JSON.stringify({ net: { show: 1, growth: 1 } }));

/** Opens a probe shot, grown, at ambient 0, and waits for the galaxy to be built; collects console errors into `errors`. */
async function openShot(page: Page, shot: Shot, errors: string[] = []): Promise<void> {
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  await openStage(page, `&mech=bike&shot=${shot}&state=${GROWN}&ambient=0`);
  await page.waitForFunction(() => (window as unknown as { __motes: Hook }).__motes.lod() !== null);
  await settle(page);
}

const lod = (page: Page) => page.evaluate(() => (window as unknown as { __motes: Hook }).__motes.lod()!);
const glows = (page: Page) => page.evaluate(() => (window as unknown as { __motes: Hook }).__motes.glows()!);
const drawStats = (page: Page) => page.evaluate(() => (window as unknown as { __motes: Hook }).__motes.drawStats());

/** Calls the test hook's `name` with `args`, then waits for the frame it asks for. */
async function call(page: Page, name: 'forceLod' | 'isolate', ...args: unknown[]): Promise<void> {
  await page.evaluate(
    ({ name, args }) => {
      const m = (window as unknown as { __motes: Record<string, (...x: unknown[]) => void> }).__motes;
      m[name](...args);
    },
    { name, args },
  );
  await settle(page);
}

/** Pixels whose colour differs from the stage background by more than `t` on some channel. */
function litMask(png: PNG, t: number): Uint8Array {
  const bg = [0x0b, 0x0d, 0x12];
  const out = new Uint8Array(png.width * png.height);
  for (let i = 0; i < out.length; i++) {
    for (let c = 0; c < 3; c++) if (Math.abs(png.data[i * 4 + c] - bg[c]) > t) out[i] = 1;
  }
  return out;
}

/** The 8-connected components of a mask: each one's bounding box and its brightest pixel's summed RGB. */
function components(png: PNG, mask: Uint8Array): { w: number; h: number; peak: number }[] {
  const seen = new Uint8Array(mask.length);
  const out: { w: number; h: number; peak: number }[] = [];
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || seen[start]) continue;
    const stack = [start];
    seen[start] = 1;
    let [x0, x1, y0, y1, peak] = [Infinity, -Infinity, Infinity, -Infinity, 0];
    while (stack.length > 0) {
      const i = stack.pop()!;
      const x = i % png.width;
      const y = Math.floor(i / png.width);
      [x0, x1, y0, y1] = [Math.min(x0, x), Math.max(x1, x), Math.min(y0, y), Math.max(y1, y)];
      peak = Math.max(peak, png.data[i * 4] + png.data[i * 4 + 1] + png.data[i * 4 + 2]);
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= png.width || ny >= png.height) continue;
          const j = ny * png.width + nx;
          if (mask[j] && !seen[j]) {
            seen[j] = 1;
            stack.push(j);
          }
        }
    }
    out.push({ w: x1 - x0 + 1, h: y1 - y0 + 1, peak });
  }
  return out;
}

for (const size of SIZES) {
  test.describe(`at ${size.width}x${size.height}`, () => {
    test.use({ viewport: { width: size.width, height: size.height } });

    // At the galaxy wide the level is unchanged (star only), but the star itself draws × 0 there: the
    // neighbourhood is its far form only (re-skin §4.1; the dissolve's own test below).
    test('three levels by projected size: galaxy wide is far form only, the neighbourhood star-and-planets, the system full', async ({ page }) => {
      const at: Partial<Record<Shot, [number, number, number]>> = {};
      // A binary's two stars count as one for the at-most-two rule (re-skin Task 1e).
      const unit = unitIndexOf(generateGalaxy(MOTE_SEED, galaxyTier(size.width, size.height), galaxyBudget(MOTE_BUDGET_DESKTOP)));
      for (const shot of SHOTS) {
        await openShot(page, shot);
        const { sysPx, levels } = await lod(page);
        expect(sysPx, shot).toHaveLength(30);
        expect(levels.reduce((a, b) => a + b, 0), shot).toBe(30);
        // At most two systems at full detail in any shot (galaxy §3.3).
        expect(new Set(sysPx.flatMap((s, i) => (s >= LOD_BANDS[LodElement.Moon][0] ? [unit[i]] : []))).size, shot).toBeLessThanOrEqual(FULL_DETAIL_MAX);
        at[shot] = levels;
      }
      if (size.label === 'phone') {
        // §3.1's levels are a phone's: the galaxy wide's systems are 9 px, the neighbourhood's 55.
        expect(at.galaxyWide).toEqual([30, 0, 0]);
        expect(at.hood![2]).toBe(0);
      } else {
        // A desktop reaches each level sooner (§3.1): its neighbourhood's systems about 100 px, held to
        // two at full detail. Its galaxy wide stands at 953 since Task 1d (GALAXY_WIDE's landscape
        // distance), where 20 of the 30 systems are star and planets and 10 under the planets' 10 px
        // (all 30 star and planets at 640 before; 22 and 8 in Task 1d). Task 1e's binary's two stars are
        // the two more under it: each is sized by its own planets, those inside its limit, so its reach is
        // smaller than the single it was.
        expect(at.galaxyWide).toEqual([10, 20, 0]);
      }
      expect(at.hood![1]).toBeGreaterThanOrEqual(6);
      expect(at.system![2]).toBeGreaterThanOrEqual(1);
      expect(at.system![2]).toBeLessThanOrEqual(2);
    });

    test('no moon or track mote is drawn where s_px < 60', async ({ page }) => {
      // The shot where every system is under 60 px at this size: the neighbourhood on a phone, the
      // galaxy wide on a desktop (whose neighbourhood reaches full detail).
      const quiet: Shot = size.label === 'phone' ? 'hood' : 'galaxyWide';
      await openShot(page, quiet);
      expect(Math.max(...(await lod(page)).sysPx)).toBeLessThan(60);
      const normal = await canvasShot(page);
      for (const el of [LodElement.Moon, LodElement.Track, LodElement.Derp]) await call(page, 'forceLod', el, 0);
      const forced = await canvasShot(page);
      expect(forced.equals(normal), 'the moons forced off change nothing').toBe(true);

      // The control: at the system shot, where a system is at full detail, forcing them off does.
      await openShot(page, 'system');
      const full = await canvasShot(page);
      for (const el of [LodElement.Moon, LodElement.Track]) await call(page, 'forceLod', el, 0);
      expect((await canvasShot(page)).equals(full)).toBe(false);
    });

    test('halos apart at the probe shots', async ({ page }) => {
      for (const shot of SHOTS) {
        await openShot(page, shot);
        const all = await glows(page);
        // At the galaxy wide the neighbourhood's stars are their far form (real 0: no glow drawn), and the
        // core's six glows went with its bodies (re-skin Task 5): none is drawn there. The hood and system
        // shots are as they were.
        if (shot === 'galaxyWide') expect(all, shot).toHaveLength(0);
        const on = all.filter((s) => s.x > -s.r && s.x < size.width + s.r && s.y > -s.r && s.y < size.height + s.r);
        for (let i = 0; i < on.length; i++)
          for (let j = i + 1; j < on.length; j++) {
            const d = Math.hypot(on[i].x - on[j].x, on[i].y - on[j].y);
            expect(d, `${shot}: glows ${i} and ${j}`).toBeGreaterThan(on[i].r + on[j].r);
          }
        // The sprites drawn are no larger than that: every pixel of the glow alone lit past GLOW_LIT is
        // inside the radius where the glow profile falls to GLOW_LIT, give or take GLOW_SLACK.
        await call(page, 'isolate', ['net-glow']);
        const png = PNG.sync.read(await canvasShot(page));
        const mask = litMask(png, GLOW_LIT);
        let stray = 0;
        let lit = 0;
        for (let i = 0; i < mask.length; i++) {
          if (!mask[i]) continue;
          lit++;
          const x = (i % png.width) + 0.5;
          const y = Math.floor(i / png.width) + 0.5;
          const over = Math.min(...on.map((s) => Math.hypot(x - s.x, y - s.y) - GLOW_LIT_R * s.r));
          if (!(over <= GLOW_SLACK)) stray++;
        }
        // Where a sprite's centre is on the canvas, the glow draws.
        if (on.some((s) => s.x >= 0 && s.x < size.width && s.y >= 0 && s.y < size.height)) expect(lit, `${shot}: the glow draws`).toBeGreaterThan(0);
        expect(stray, `${shot}: lit pixels outside every reported sprite`).toBe(0);
      }
    });

    test('a resize keeps the counts', async ({ page }) => {
      const errors: string[] = [];
      await openShot(page, 'hood', errors);
      const stats = async () => (await drawStats(page)).instances;
      const before = await stats();
      const lodBefore = await lod(page);
      await page.setViewportSize({ width: size.height, height: size.width });
      await settle(page);
      const turned = await stats();
      const lodTurned = await lod(page);
      await page.setViewportSize({ width: size.width, height: size.height });
      await settle(page);
      expect(turned).toEqual(before);
      expect(await stats()).toEqual(before);
      expect(lodTurned.sysPx).not.toEqual(lodBefore.sysPx);
      expect((await lod(page)).sysPx).toEqual(lodBefore.sysPx);
      expect(errors).toEqual([]);
    });

    test('a system held under full detail draws no moon or track mote', async ({ page }) => {
      // Where more systems than FULL_DETAIL_MAX are full size on screen, all but two are held just under
      // full detail (lod.ts detailPx). Forcing the moons, tracks and derps off may change pixels only
      // inside the systems the page reports at full detail: how far each one's outer sphere reaches on
      // screen through the essay's camera at this size. Checked at the system, twelve, close and hood
      // shots; the held case is real in at least one of them on each screen (Task 1d's wider spacing
      // left it at the close shot on a phone, at the twelve and the hood on a desktop; it was the system
      // and twelve shots before).
      const held: string[] = [];
      const full = LOD_BANDS[LodElement.Moon][0];
      const g = generateGalaxy(MOTE_SEED, galaxyTier(size.width, size.height), galaxyBudget(MOTE_BUDGET_DESKTOP));
      const data = packBodyData(g);
      for (const shot of ['system', 'twelve', 'close', 'hood'] as const) {
        await openShot(page, shot);
        const { sysPx } = await lod(page);
        const camera = galaxyShotCamera(GALAXY_SHOTS[shot], g, data, size, 0);
        const focal = 0.5 * size.height * camera.projectionMatrix.elements[5];
        const discs = g.systems.map((row, i) => {
          const p = new Vector3(...bodyWorld(data, row, 0));
          const d = p.distanceTo(camera.position);
          p.project(camera);
          const x = ((p.x + 1) / 2) * size.width;
          const y = ((1 - p.y) / 2) * size.height;
          const outer = systemOuter(g, row);
          const r = systemPx(outer, d, focal);
          // Most of the held systems' discs reach into the frame from a centre outside it.
          const reach = r / 2;
          // How far the system's outer sphere reaches on screen: its projection is wider off the axis.
          const centre = new Vector3(...bodyWorld(data, row, 0));
          let reachPx = 0;
          for (let k = 0; k < 400; k++) {
            const z = 1 - (2 * (k + 0.5)) / 400;
            const a = k * 2.399963229728653;
            const q = centre.clone().add(new Vector3(Math.sqrt(1 - z * z) * Math.cos(a), z, Math.sqrt(1 - z * z) * Math.sin(a)).multiplyScalar(outer)).project(camera);
            reachPx = Math.max(reachPx, Math.hypot(((q.x + 1) / 2) * size.width - x, ((1 - q.y) / 2) * size.height - y));
          }
          return { x, y, r, reach: reachPx, full: sysPx[i] >= full, inFrame: p.z < 1 && x > -reach && x < size.width + reach && y > -reach && y < size.height + reach };
        });
        // Where the case is real: a system reaching well into the frame is full size but held.
        if (discs.some((c) => c.inFrame && !c.full && c.r >= full)) held.push(shot);
        const normal = PNG.sync.read(await canvasShot(page));
        for (const el of [LodElement.Moon, LodElement.Track, LodElement.Derp]) await call(page, 'forceLod', el, 0);
        const forced = PNG.sync.read(await canvasShot(page));
        let changed = 0;
        let outside = 0;
        for (let i = 0; i < normal.width * normal.height; i++) {
          if ([0, 1, 2].every((c) => normal.data[i * 4 + c] === forced.data[i * 4 + c])) continue;
          changed++;
          const x = (i % normal.width) + 0.5;
          const y = Math.floor(i / normal.width) + 0.5;
          if (!discs.some((c) => c.full && Math.hypot(x - c.x, y - c.y) <= c.reach + 2)) outside++;
        }
        if (discs.some((c) => c.full && c.inFrame)) expect(changed, `${shot}: the full systems draw moons and tracks`).toBeGreaterThan(0);
        expect(outside, `${shot}: pixels of moons or tracks outside the full systems`).toBe(0);
      }
      expect(held.length, 'a held system in frame at one of the shots').toBeGreaterThan(0);
    });

    test('the galaxy keeps within its budget', async ({ page }) => {
      const errors: string[] = [];
      // The streams are drawn only while net.streams is up, the feed while net.feed and its alpha are:
      // all up, so that every set the galaxy draws is counted.
      page.on('pageerror', (e) => errors.push(e.message));
      await openStage(page, `&mech=bike&shot=galaxyWide&state=${encodeURIComponent(JSON.stringify({ net: { show: 1, growth: 1, streams: 1, feed: 1, review: 1.2 } }))}`);
      await page.waitForFunction(() => (window as unknown as { __motes: Hook }).__motes.lod() !== null);
      await settle(page);
      const tier = galaxyTier(size.width, size.height);
      const g = generateGalaxy(MOTE_SEED, tier, galaxyBudget(MOTE_BUDGET_DESKTOP));
      const { instances } = await drawStats(page);
      const net = Object.entries(instances).filter(([name]) => name.startsWith('net-'));
      const hole = Object.entries(instances).filter(([name]) => name.startsWith('hole-'));
      expect(Object.fromEntries(net)).toEqual({
        'net-shells': g.instances.shells,
        'net-persons': g.instances.persons,
        'net-tracks': g.instances.tracks,
        'net-glow': g.instances.glow,
        'net-spikes': g.instances.spikes,
        'net-bodies': g.instances.bodies,
        'net-streams': g.instances.streams - STREAM_DOTS[1],
        'net-feed': STREAM_DOTS[1],
      });
      // The black hole's parts (re-skin Task 5), every one drawn at the galaxy wide.
      expect(Object.fromEntries(hole)).toEqual({
        'hole-disk': 18_000,
        'hole-arch': 2_400,
        'hole-ring': 320,
        'hole-jets': 4_800,
        'hole-knots': 768,
        'hole-infall': 72,
        'hole-strand-r0': 750,
        'hole-strand-r1': 500,
      });
      // Every instance the galaxy draws, the ghosts, the person motes, the spikes, the stream dots and
      // the hole's dots too, is one Galaxy.instances counts (the ring is one quad, not instanced), within
      // the budget: Σ net-* + Σ hole-*, nothing reserved since the hole is drawn.
      const drawn = [...net, ...hole].reduce((n, [, k]) => n + k, 0);
      expect(g.instances.reserved).toBe(0);
      expect(drawn).toBe(g.instances.total);
      expect(g.instances.total).toBeLessThanOrEqual(galaxyBudget(MOTE_BUDGET_DESKTOP));
      // The neighbourhood's far form moves one star per unit (a binary's on its barycentre, re-skin Task
      // 1e: 29) to the far sets: the background's count is unchanged.
      expect(instances['galaxy-far-stars'] + instances['galaxy-far-bright']).toBe(g.units.length);
      expect({
        stars: instances['galaxy-stars'] + instances['galaxy-bright'] + instances['galaxy-far-stars'] + instances['galaxy-far-bright'],
        dust: instances['galaxy-dust'],
        haze: instances['galaxy-haze'],
      }).toEqual({ stars: BG.stars[tier], dust: BG.dust[tier], haze: 1 });
      expect(errors).toEqual([]);
    });
  });
}

/**
 * The background's sprites at a device pixel ratio: the renderer draws at min(ratio, 2) buffer px per
 * CSS px (main.ts) and the browser scales the canvas to `ratio` device px per CSS px. At the galaxy
 * wide a bright star is at its far size, 3 CSS px (BG_STAR_SIZE: it grows only nearer), a dust mote 1:
 * in buffer px 3·b and b (b the buffer ratio), so in the screenshot about 3·ratio and ratio, a pixel
 * either way for the sampling and the scale. A sprite sized in buffer px (the pixel ratio dropped) is
 * b times too small and fails the lower bound; one sized up by the ratio twice fails the upper.
 */
for (const ratio of [2, 3] as const) {
  for (const size of SIZES) {
    test.describe(`at ${size.width}x${size.height}, device pixel ratio ${ratio}`, () => {
      test.use({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: ratio });

      test(`caps are CSS px at DPR ${ratio}`, async ({ page }) => {
        // The galaxy wide. The background's halos may overlap there (the author's ruling; re-skin §4.1), and
        // the brightest stars are knot members, so a lit component can be several sprites run together: the
        // median of the thirty brightest components is one (measured: 5-6 px at DPR 2, 9-10 at DPR 3).
        await openShot(page, 'galaxyWide');
        await call(page, 'isolate', ['galaxy-bright']);
        let png = PNG.sync.read(await canvasShot(page));
        expect(png.width).toBe(ratio * size.width);
        const bright = components(png, litMask(png, 0)).sort((a, b) => b.peak - a.peak);
        expect(bright.length).toBeGreaterThan(30);
        const brightW = bright
          .slice(0, 30)
          .map((c) => Math.max(c.w, c.h))
          .sort((a, b) => a - b)[15];

        await call(page, 'isolate', ['galaxy-dust']);
        png = PNG.sync.read(await canvasShot(page));
        const dust = components(png, litMask(png, 0)).sort((a, b) => b.peak - a.peak);
        expect(dust.length).toBeGreaterThan(5);
        const dustW = Math.max(dust[0].w, dust[0].h);

        // The brightest star sprite: its 3 CSS px cap, 3·ratio device px, a pixel either way (plus one more for the 1.5× upscale at DPR 3).
        expect(brightW).toBeGreaterThanOrEqual(3 * ratio - 1);
        expect(brightW).toBeLessThanOrEqual(3 * ratio + (ratio === 3 ? 2 : 1));
        // A dust mote is never under its 1 CSS px floor.
        expect(dustW).toBeGreaterThanOrEqual(ratio);
      });
    });
  }
}

// Task 6: growth, light, the lamp, the streams and the defect on moving bodies (galaxy §14.4, §14.5,
// §15; morph-and-scatter §2). Every expectation that needs a place on screen takes it from the TS
// twins (bodyMote.ts, stream.ts) through the essay's composed camera at the frame's ambient.

/** The page's frame of `shot` with `net` over it, at ambient `ambient` (the probe's `?ambient=`). */
async function openT6(page: Page, shot: Shot, net: Record<string, number>, ambient = 0, errors: string[] = []): Promise<void> {
  page.on('pageerror', (e) => errors.push(e.message));
  const state = encodeURIComponent(JSON.stringify({ net: { show: 1, growth: 1, ...net } }));
  await openStage(page, `&mech=bike&shot=${shot}&state=${state}&ambient=${ambient}`);
  await page.waitForFunction(() => (window as unknown as { __motes: Hook }).__motes.lod() !== null);
  await settle(page);
}

const packed = new WeakMap<Galaxy, BodyData>();
/** A galaxy's packed body data, once. */
function dataOf(g: Galaxy): BodyData {
  let d = packed.get(g);
  if (d === undefined) {
    d = packBodyData(g);
    packed.set(g, d);
  }
  return d;
}

/** The essay's composed camera on `shot` at `ambient` at this size (main.ts's path, galaxyShotCamera), and a projection to CSS px with each point's distance. */
function twinCamera(g: Galaxy, shot: Shot, ambient: number, size: { width: number; height: number }) {
  const camera = galaxyShotCamera(GALAXY_SHOTS[shot], g, dataOf(g), size, ambient);
  const focal = 0.5 * size.height * camera.projectionMatrix.elements[5];
  const project = (p: readonly number[]) => {
    const v = new Vector3(p[0], p[1], p[2]);
    const d = v.distanceTo(camera.position);
    v.project(camera);
    return { x: ((v.x + 1) / 2) * size.width, y: ((1 - v.y) / 2) * size.height, d, front: v.z < 1 };
  };
  return { focal, project };
}

/** The twins' clocks at a frame: the story's leaves, the ambient, the lamp and the page's own system sizes. */
function twinClocks(net: Partial<BodyClocks>, ambient: number, sysPx: readonly number[]): BodyClocks {
  return { growth: 1, fix: 0, highlight: 0, show: 1, focus: 0, lamp: Lamp.Off, lampRow: -1, ...net, ambient, sysPx: Float32Array.from({ length: SYS_MAX }, (_, i) => sysPx[i] ?? 0) };
}

/** The bodies of C1's piece (the planet and its moons), each where the twin draws it (its derp on) and its burst's ghost, with its radius. */
function pieceDiscs(g: Galaxy, data: BodyData, c: BodyClocks, scale: number): { centre: number[]; R: number }[] {
  const c1 = g.bodies[bodyIndex(g, 'C1')];
  const sys = g.systems.indexOf(c1.star);
  const out: { centre: number[]; R: number }[] = [];
  for (const b of g.bodies.filter((x) => x.index === c1.index || (x.kind === 'moon' && x.host === c1.index))) {
    const d = bodyDerp(b.index, sys, c, data);
    out.push({ centre: bodyCentre(b.index, d, c.ambient, data), R: b.R * scale });
    const ghost = bodyGhost(b.index, d, c.ambient, data);
    if (ghost.gain > 0) out.push({ centre: ghost.pos, R: b.R * scale });
  }
  return out;
}

/** The lit streams' dots at a frame, from the twin, on screen: every dot the stream draws (presence > 0), each with its presence, so a comparison can keep its own dots whole and clear of every other drawn dot. */
function streamEnds(g: Galaxy, data: BodyData, ambient: number, project: ReturnType<typeof twinCamera>['project'], lit: (row: number) => boolean, size: { width: number; height: number }) {
  const all: { row: number; x: number; y: number; u: number; presence: number }[] = [];
  g.streams.forEach((st, row) => {
    if (!lit(st.from) && !lit(st.to)) return;
    for (let i = 0; i < STREAM_DOTS[1]; i++) {
      const dot = streamDot(data, row, i, ambient);
      if (!(dot.presence > 0)) continue;
      const p = project(dot.pos);
      if (p.front && p.x >= 2 && p.y >= 2 && p.x < size.width - 2 && p.y < size.height - 2) all.push({ row, x: p.x, y: p.y, u: dot.u, presence: dot.presence });
    }
  });
  return all;
}

/** The brightest channel above the stage's background within `r` px of (x, y). */
function peakNear(png: PNG, x: number, y: number, r: number): number {
  const bg = [0x0b, 0x0d, 0x12];
  let peak = 0;
  for (let yy = Math.floor(y - r); yy <= Math.ceil(y + r); yy++)
    for (let xx = Math.floor(x - r); xx <= Math.ceil(x + r); xx++) {
      if (xx < 0 || yy < 0 || xx >= png.width || yy >= png.height) continue;
      const i = (yy * png.width + xx) * 4;
      for (let c = 0; c < 3; c++) peak = Math.max(peak, png.data[i + c] - bg[c]);
    }
  return peak;
}

/** The phone's twelve: an ambient at which the twelve probe frames all twelve on a phone (it rides the galaxy's turn, so every ambient does). */
const TWELVE_AMBIENT = 135;
/** The streams' test ambient: every stream's first dot at u = 0.08, so a six-dot stream has a dot in each end's 10 %. */
const STREAMS_AMBIENT = 0.08 / NODE_STREAM_SPEED;

for (const size of SIZES) {
  test.describe(`Task 6 at ${size.width}x${size.height}`, () => {
    test.use({ viewport: { width: size.width, height: size.height } });
    const g = generateGalaxy(MOTE_SEED, galaxyTier(size.width, size.height), galaxyBudget(MOTE_BUDGET_DESKTOP));
    const data = packBodyData(g);

    test('the lamp has a hard edge', async ({ page }) => {
      // The close shot under lamp 1 on C1: its piece (the planet, its moons, their ghosts) is all that
      // its shells, bodies and glows light. Its tracks and the person's motes are left out (they reach
      // round the star and fall from above), and the background is not the lamp's.
      const errors: string[] = [];
      await openT6(page, 'close', {}, 0, errors);
      const { sysPx } = await lod(page);
      const c = twinClocks({ lamp: Lamp.Planet, lampRow: bodyIndex(g, 'C1') }, 0, sysPx);
      const { focal, project } = twinCamera(g, 'close', 0, size);
      const discs = pieceDiscs(g, data, c, 1 + EQ_A + SCATTER_AMP[0] + SCATTER_AMP[1]).map((d) => {
        const p = project(d.centre);
        return { x: p.x, y: p.y, r: (d.R * focal) / p.d + 2 };
      });
      await call(page, 'isolate', ['net-shells', 'net-bodies', 'net-glow']);
      const png = PNG.sync.read(await canvasShot(page));
      const mask = litMask(png, 4);
      let inside = 0;
      let outside = 0;
      for (let i = 0; i < mask.length; i++) {
        if (!mask[i]) continue;
        const x = (i % png.width) + 0.5;
        const y = Math.floor(i / png.width) + 0.5;
        if (discs.some((d) => Math.hypot(x - d.x, y - d.y) <= d.r)) inside++;
        else outside++;
      }
      expect(inside, 'the piece is drawn').toBeGreaterThan(1000);
      expect(outside, 'lit px outside C1’s piece').toBe(0);
      // The control: with the lamp off, the same meshes light something beyond the piece.
      await openT6(page, 'close', { lamp: Lamp.Off }, 0, errors);
      await call(page, 'isolate', ['net-shells', 'net-bodies', 'net-glow', 'net-tracks']);
      const off = PNG.sync.read(await canvasShot(page));
      const offMask = litMask(off, 4);
      let beyond = 0;
      for (let i = 0; i < offMask.length; i++) {
        if (offMask[i] && !discs.some((d) => Math.hypot((i % off.width) + 0.5 - d.x, Math.floor(i / off.width) + 0.5 - d.y) <= d.r)) beyond++;
      }
      expect(beyond, 'unlamped, the system round C1 shows').toBeGreaterThan(50);
      expect(errors).toEqual([]);
    });

    test('a healthy planet is a sphere and a cracked one breathes', async ({ page }) => {
      // The close shot, at ambient 0 and 0.5, its shells and bodies alone, inside C1's rectangle (1.4 R
      // round the twin's centre): C1 healed (the fix landed: v takes every term to 0) is a healthy
      // planet, a lattice sphere whose pixels change only where the planet moved (its two discs, and its
      // moons', masked by the twin); C1 cracked breathes and stutters off that sphere.
      const errors: string[] = [];
      const c1 = g.bodies[bodyIndex(g, 'C1')];
      const offSphere = async (fix: number) => {
        const frames: { png: PNG; discs: { x: number; y: number; r: number }[]; rect: { x0: number; y0: number; x1: number; y1: number } }[] = [];
        for (const ambient of [0, 0.5]) {
          await openT6(page, 'close', { fix, lamp: Lamp.Off }, ambient, errors);
          const { sysPx } = await lod(page);
          const { focal, project } = twinCamera(g, 'close', ambient, size);
          const home = project(bodyWorld(data, c1.index, ambient));
          const R = (c1.R * focal) / home.d;
          // A shell mote at the limb reaches out by its own radius (BODY_LOOK.dotShare of the row pitch).
          const mote = (BODY_LOOK.dotShare * Math.PI * c1.R * focal) / (c1.lattice![0] * home.d);
          const moons = pieceDiscs(g, data, twinClocks({ fix }, ambient, sysPx), 1 + EQ_A + SCATTER_MOON_CAP)
            .slice(1)
            .map((d) => {
              const p = project(d.centre);
              return { x: p.x, y: p.y, r: (d.R * focal) / p.d + 2 };
            });
          await call(page, 'isolate', ['net-shells', 'net-bodies']);
          frames.push({
            png: PNG.sync.read(await canvasShot(page)),
            discs: [{ x: home.x, y: home.y, r: R + mote / 2 + 1 }, ...moons],
            rect: { x0: home.x - 1.4 * R, y0: home.y - 1.4 * R, x1: home.x + 1.4 * R, y1: home.y + 1.4 * R },
          });
        }
        const [a, b] = frames;
        const masked = (x: number, y: number) => frames.some((f) => f.discs.some((d) => Math.hypot(x - d.x, y - d.y) <= d.r));
        let changed = 0;
        let lit = 0;
        for (let y = Math.max(0, Math.floor(a.rect.y0)); y < Math.min(a.png.height, Math.ceil(a.rect.y1)); y++)
          for (let x = Math.max(0, Math.floor(a.rect.x0)); x < Math.min(a.png.width, Math.ceil(a.rect.x1)); x++) {
            if (masked(x + 0.5, y + 0.5)) continue;
            const i = (y * a.png.width + x) * 4;
            if ([0, 1, 2].some((ch) => a.png.data[i + ch] !== b.png.data[i + ch])) changed++;
            if ([a, b].some((f) => [0, 1, 2].some((ch) => f.png.data[i + ch] > [0x0b, 0x0d, 0x12][ch] + 4))) lit++;
          }
        return { changed, lit };
      };
      const healthy = await offSphere(1);
      expect(healthy, 'healed, C1 is a sphere: nothing lit or changing off it').toEqual({ changed: 0, lit: 0 });
      const cracked = await offSphere(0);
      expect(cracked.changed, 'cracked, C1 breathes off its sphere').toBeGreaterThan(0);
      expect(errors).toEqual([]);
    });

    test('the dotted orbits turn with the galaxy: every track pixel is on a twin dot, at the pose and at 101 s', async ({ page }) => {
      // Task 5's tracks were drawn round their turned hosts without the turn (invisible at ambient 0,
      // where every earlier test drew them). At the pose and at 101 s, where the galaxy has turned,
      // every lit pixel of net-tracks lies within 2.5 px of a dot of trackDot (bodyMote.ts), the twin.
      const errors: string[] = [];
      const { track, count } = buildTrackAttrs(g);
      for (const ambient of [AMBIENT_POSE, 101]) {
        await openT6(page, 'system', { lamp: Lamp.Off }, ambient, errors);
        await call(page, 'isolate', ['net-tracks']);
        const png = PNG.sync.read(await canvasShot(page));
        const { project } = twinCamera(g, 'system', ambient, size);
        const grid = new Map<string, { x: number; y: number }[]>();
        for (let k = 0; k < count; k++) {
          const p = project(trackDot(track[k * 4], track[k * 4 + 1], ambient, data));
          if (!p.front || p.x < -4 || p.y < -4 || p.x > size.width + 4 || p.y > size.height + 4) continue;
          const key = `${Math.floor(p.x / 8)},${Math.floor(p.y / 8)}`;
          grid.set(key, [...(grid.get(key) ?? []), p]);
        }
        const near = (x: number, y: number) => {
          for (let gx = Math.floor(x / 8) - 1; gx <= Math.floor(x / 8) + 1; gx++)
            for (let gy = Math.floor(y / 8) - 1; gy <= Math.floor(y / 8) + 1; gy++)
              if ((grid.get(`${gx},${gy}`) ?? []).some((p) => Math.hypot(p.x - x, p.y - y) <= 2.5)) return true;
          return false;
        };
        const mask = litMask(png, 4);
        let lit = 0;
        let stray = 0;
        for (let i = 0; i < mask.length; i++) {
          if (!mask[i]) continue;
          lit++;
          if (!near((i % png.width) + 0.5, Math.floor(i / png.width) + 0.5)) stray++;
        }
        expect(lit, `tracks drawn at ${ambient}`).toBeGreaterThan(100);
        expect(stray, `track pixels off the twin dots at ${ambient}`).toBe(0);
      }
      expect(errors).toEqual([]);
    });

    test('under the planet lamp the lit planet’s own orbit is never drawn, and its moons’ tracks stay (Task 10 review I2)', async ({ page }) => {
      // The close probe at the pose, net-tracks alone: with the lamp off the dotted orbit round P1 is
      // drawn on the twin's own dots of C1 (the case is real); under lamp 1 on C1, at focus 0, 0.5 and
      // 1, none of it is (trackLampGain, bodyMote.glsl), and the moon tracks still are. Pixels near both
      // kinds of dot count to neither.
      const errors: string[] = [];
      const { track, count } = buildTrackAttrs(g);
      const c1 = bodyIndex(g, 'C1');
      const { project } = twinCamera(g, 'close', AMBIENT_POSE, size);
      const dots = (own: boolean) => {
        const out: { x: number; y: number }[] = [];
        for (let k = 0; k < count; k++) {
          const row = track[k * 4];
          const mine = own ? row === c1 && track[k * 4 + 3] === 0 : g.bodies[row].kind === 'moon' && g.bodies[row].host === c1;
          if (!mine) continue;
          const p = project(trackDot(row, track[k * 4 + 1], AMBIENT_POSE, data));
          if (p.front && p.x > -4 && p.y > -4 && p.x < size.width + 4 && p.y < size.height + 4) out.push(p);
        }
        return out;
      };
      const [own, moons] = [dots(true), dots(false)];
      expect(own.length, 'C1’s orbit has dots in the frame').toBeGreaterThan(3);
      const near = (list: { x: number; y: number }[], x: number, y: number, r: number) => list.some((p) => Math.hypot(p.x - x, p.y - y) <= r);
      const lit = async (lamp: Lamp, focus: number) => {
        await openT6(page, 'close', { lamp, lampAt: trackIndex({ body: 'C1' }), focus }, AMBIENT_POSE, errors);
        await call(page, 'isolate', ['net-tracks']);
        const png = PNG.sync.read(await canvasShot(page));
        const mask = litMask(png, 4);
        let orbit = 0;
        let tracks = 0;
        for (let i = 0; i < mask.length; i++) {
          if (!mask[i]) continue;
          const [x, y] = [(i % png.width) + 0.5, Math.floor(i / png.width) + 0.5];
          const [o, m] = [near(own, x, y, 2.5), near(moons, x, y, 3)];
          if (o && !m) orbit++;
          if (m && !o) tracks++;
        }
        return { orbit, tracks };
      };
      const off = await lit(Lamp.Off, 0);
      expect(off.orbit, 'lamp off: C1’s orbit round P1 is drawn').toBeGreaterThan(10);
      expect(off.tracks, 'lamp off: its moons’ tracks are drawn').toBeGreaterThan(10);
      for (const focus of [0, 0.5, 1]) {
        const on = await lit(Lamp.Planet, focus);
        expect(on.orbit, `lamp 1, focus ${focus}: none of C1’s orbit is drawn`).toBe(0);
        expect(on.tracks, `lamp 1, focus ${focus}: its moons’ tracks still are`).toBeGreaterThan(10);
      }
      expect(errors).toEqual([]);
    });

    test('streams are off by default', async ({ page }) => {
      // The system probe mid-build with net.streams and net.feed 0: neither the streams nor the feed is
      // drawn, and the frame is the frame with both hidden. Each leaf gates its own mesh (the author's
      // ruling in Task 11: the feed is re-3's subject, not ambient lineage): net.streams 1 draws the
      // streams and not the feed, net.feed 1 the feed and not the streams.
      const errors: string[] = [];
      await openT6(page, 'system', { growth: 0.2, streams: 0, feed: 0, review: 1.2 }, 0, errors);
      const { visible } = await drawStats(page);
      expect(visible).not.toContain('net-streams');
      expect(visible).not.toContain('net-feed');
      const frame = await canvasShot(page);
      await call(page, 'isolate', visible.filter((n) => n !== 'net-streams' && n !== 'net-feed'));
      expect((await canvasShot(page)).equals(frame), 'the frame without the streams and the feed').toBe(true);
      await openT6(page, 'system', { growth: 0.2, streams: 1, feed: 0, review: 1.2 }, 0, errors);
      const streams = (await drawStats(page)).visible;
      expect(streams).toContain('net-streams');
      expect(streams).not.toContain('net-feed');
      await openT6(page, 'system', { growth: 0.2, streams: 0, feed: 1, review: 1.2 }, 0, errors);
      const feed = (await drawStats(page)).visible;
      expect(feed).not.toContain('net-streams');
      expect(feed).toContain('net-feed');
      expect(errors).toEqual([]);
    });

    test('no stream pixels in the zoom-out', async ({ page }) => {
      // Galaxy §15.1: the whole zoom-out keys net.streams 0, so the streams and the feed are never
      // drawn there, as the essay itself scrolls through it. Not vacuous: from 0.55 on the galaxy is up.
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await openStage(page, '&mech=bike&n=500');
      const zoom = (await readSpans(page)).find((x) => x.id === 'zoom-out')!;
      for (const l of [0.1, 0.25, 0.4, 0.55, 0.75, 1]) {
        await openStage(page, `&mech=bike&n=500&p=${zoom.start + l * (zoom.end - zoom.start)}`);
        const { visible } = await drawStats(page);
        expect(visible, `zoom-out@${l}`).not.toContain('net-streams');
        expect(visible, `zoom-out@${l}`).not.toContain('net-feed');
        if (l >= 0.55) expect(visible, `zoom-out@${l}`).toContain('net-shells');
      }
      expect(errors).toEqual([]);
    });

    test('streams are quiet when shown', async ({ page }) => {
      // The system probe grown, net.streams 1 against 0: the streams add no pixel brighter than 96 on any
      // channel; and along each lit stream the brightest pixel at its parent's end (its first 10 %) is at
      // least 3 times the brightest at its child's end (its last 10 %), the ends placed by the twin.
      const errors: string[] = [];
      await openT6(page, 'system', { streams: 0 }, STREAMS_AMBIENT, errors);
      const without = PNG.sync.read(await canvasShot(page));
      await openT6(page, 'system', { streams: 1 }, STREAMS_AMBIENT, errors);
      const withStreams = PNG.sync.read(await canvasShot(page));
      let added = 0;
      let peak = 0;
      for (let i = 0; i < without.data.length; i += 4)
        for (let ch = 0; ch < 3; ch++) {
          const d = Math.abs(withStreams.data[i + ch] - without.data[i + ch]);
          if (d > 0) added++;
          peak = Math.max(peak, d);
        }
      expect(added, 'the streams draw').toBeGreaterThan(0);
      expect(peak, 'no stream pixel brighter than 96').toBeLessThanOrEqual(96);

      // The gradient, on the system probe (P_a's streams, lit by its lamp) and on the neighbourhood (the
      // core's streams out to the stars, all lit, their ends far apart).
      const gradient = async (shot: Shot, lit: (row: number) => boolean): Promise<number> => {
        await call(page, 'isolate', ['net-streams']);
        const dots = PNG.sync.read(await canvasShot(page));
        const { project } = twinCamera(g, shot, STREAMS_AMBIENT, size);
        const all = streamEnds(g, data, STREAMS_AMBIENT, project, lit, size);
        // Each dot lights its own pixel (stream.vert.glsl centres it there): read the 3 x 3 round the
        // twin's pixel, which absorbs a twin-to-GPU rounding at a pixel's edge.
        const px = (d: (typeof all)[number]) => [Math.floor(d.x), Math.floor(d.y)];
        const peakOf = (d: (typeof all)[number]) => peakNear(dots, px(d)[0], px(d)[1], 1);
        const alone = (d: (typeof all)[number]) =>
          all.every((o) => o.row === d.row || Math.max(Math.abs(px(o)[0] - px(d)[0]), Math.abs(px(o)[1] - px(d)[1])) > 2);
        let compared = 0;
        for (const row of new Set(all.map((d) => d.row))) {
          // A whole dot of this stream whose 3 x 3 no other drawn dot's 3 x 3 overlaps (another stream's,
          // a partly present one included).
          const mine = all.filter((d) => d.row === row && d.presence >= 1 && alone(d));
          const parent = Math.max(0, ...mine.filter((d) => d.u <= 0.1).map(peakOf));
          const child = Math.max(0, ...mine.filter((d) => d.u >= 0.9).map(peakOf));
          if (parent === 0 || child === 0) continue;
          compared++;
          expect(parent, `${shot}: stream ${g.bodies[g.streams[row].from].id} to ${g.bodies[g.streams[row].to].id}: parent end ${parent}, child end ${child}`).toBeGreaterThanOrEqual(3 * child);
        }
        return compared;
      };
      const pa = bodyIndex(g, 'P_a');
      // P_a's streams to its planets share their parent end at the star, where their first dots crowd
      // one another out of the comparison: a stream with both ends drawn alone is compared.
      expect(await gradient('system', (row) => lampGain(row, { lamp: Lamp.Star, lampRow: pa, focus: 0 }, data) > 0), 'system: streams compared').toBeGreaterThanOrEqual(1);
      await openT6(page, 'hood', { streams: 1 }, STREAMS_AMBIENT, errors);
      expect(await gradient('hood', () => true), 'neighbourhood: streams compared').toBeGreaterThanOrEqual(2);
      expect(errors).toEqual([]);
    });
  });
}

test.describe('Task 6, the twelve', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the twelve light as twelve at the twelve probe', async ({ page }) => {
    // df-5 on a phone (galaxy §14.4, test 12): growth 0.35, highlight 0.25, fix 0.1, lamp 5 on R0. The
    // three stars written from the rule are ember discs (≥ 60 px²), the nine planets built from them
    // ember points (8-60 px²); C1, fixed, is not ember. At TWELVE_AMBIENT all twelve are in the frame.
    // The planet shells are forced off, so the planets are counted as their lit points: from the
    // twelve's distance on a phone (87) the three systems are past the planet shells' band (25-50
    // px), and C10's lit shell, 0.8 ember, pales its point one step past the classifier's ember.
    const g = generateGalaxy(MOTE_SEED, galaxyTier(390, 844), galaxyBudget(MOTE_BUDGET_DESKTOP));
    const data = packBodyData(g);
    const { project } = twinCamera(g, 'twelve', TWELVE_AMBIENT, { width: 390, height: 844 });
    for (const id of ['P1', 'P2', 'P3', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10']) {
      const p = project(bodyWorld(data, bodyIndex(g, id), TWELVE_AMBIENT));
      expect(p.x > 0 && p.x < 390 && p.y > 0 && p.y < 844, `${id} in the frame`).toBe(true);
    }
    const errors: string[] = [];
    await openT6(page, 'twelve', { growth: 0.35, highlight: 0.25, fix: 0.1, lamp: Lamp.Lineage, lampAt: trackIndex({ body: 'R0' }) }, TWELVE_AMBIENT, errors);
    await call(page, 'forceLod', LodElement.PlanetShell, 0);
    const areas = emberComponents(PNG.sync.read(await canvasShot(page)), 8);
    expect(areas.filter((a) => a >= 60).length, `ember areas ${areas.join(' ')}`).toBe(3);
    expect(areas.filter((a) => a < 60).length, `ember areas ${areas.join(' ')}`).toBe(9);
    expect(errors).toEqual([]);
  });
});

// Task 10: test 12 on the essay's own df-5, as keyed (the twelve, lamp 5 on R0's lineage, growth,
// highlight and fix as the keyframes have them), at the pose test mode stops the ambient at.
for (const size of SIZES) {
  test.describe(`Task 10 at ${size.width}x${size.height}`, () => {
    test.use({ viewport: { width: size.width, height: size.height } });

    test('test 12 at the keyed df-5: three ember stars and nine ember planets, and C1 not ember', async ({ page }) => {
      // df-5's hold, from where it is full ink to where its page starts to fade (defect is 4.8
      // screens, its fade 0.1 / 4.8), at its middle: three stars written from the rule as ember discs
      // (≥ 60 px²), the nine planets built from them as ember points (8-60 px²; r > 200, r > b + 90,
      // r > g + 70); C1, mended, is no part of any. As Task 6's twelve test, the planet shells are forced
      // off, so the planets are counted as their lit points: a lit shell over its point pales the point
      // past the classifier's ember (on a desktop C9 counts 5 px² with its shell, 11 without).
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await openStage(page, '&mech=bike&n=500');
      const spans = await readSpans(page);
      const defect = spans.find((x) => x.id === 'defect');
      if (!defect) throw new Error('no defect section');
      const fade = 0.1 / 4.8;
      const local = (0.78 + fade + (1 - fade)) / 2;
      const p = defect.start + local * (defect.end - defect.start);
      await openStage(page, `&mech=bike&p=${p}`);
      await page.waitForFunction(() => (window as unknown as { __motes: Hook }).__motes.lod() !== null);
      await call(page, 'forceLod', LodElement.PlanetShell, 0);
      const png = PNG.sync.read(await canvasShot(page));
      const areas = emberComponents(png, 8);
      expect(areas.filter((a) => a >= 60).length, `ember areas ${areas.join(' ')}`).toBe(3);
      expect(areas.filter((a) => a < 60).length, `ember areas ${areas.join(' ')}`).toBe(9);
      // C1 excluded: no ember pixel within 3 px of where the twin draws it through the keyed camera (a
      // disc: at the twelve's 132 (Task 1d) the square's corner took an ember pixel 4.3 px off it).
      const g = generateGalaxy(MOTE_SEED, galaxyTier(size.width, size.height), galaxyBudget(MOTE_BUDGET_DESKTOP));
      const data = dataOf(g);
      const state = new KeyframeSampler(keyframes, spans).sample(p);
      const camera = essayCamera(state.camera, g, data, size, AMBIENT_POSE);
      const c1 = new Vector3(...bodyWorld(data, bodyIndex(g, 'C1'), AMBIENT_POSE)).project(camera);
      const [cx, cy] = [((c1.x + 1) / 2) * size.width, ((1 - c1.y) / 2) * size.height];
      expect(cx > 0 && cx < size.width && cy > 0 && cy < size.height, 'C1 is in the frame').toBe(true);
      let ember = 0;
      for (let y = Math.max(0, Math.floor(cy - 3)); y <= Math.min(png.height - 1, Math.ceil(cy + 3)); y++)
        for (let x = Math.max(0, Math.floor(cx - 3)); x <= Math.min(png.width - 1, Math.ceil(cx + 3)); x++) {
          if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) > 3) continue;
          const i = (y * png.width + x) * 4;
          const [r, gg, b] = [png.data[i], png.data[i + 1], png.data[i + 2]];
          if (r > 200 && r > b + 90 && r > gg + 70) ember++;
        }
      expect(ember, 'ember pixels on C1').toBe(0);
      expect(errors).toEqual([]);
    });
  });
}

// Task 11: the reviewer's light, in pixels. Its quad lay in the galaxy's plane facing −y, so every Act
// II camera (all above the plane) culled it while drawStats still listed `net-ring` as visible: only a
// pixel test sees it. Each frame is the essay's own, as keyed, at the middle of the beat's hold
// (reviewer is 3.2 screens, its fade 0.1 / 3.2): re-1 (the ring on the first visits) and re-3 (on the
// last, from the shot that frames it with the hub, where it is drawn at its floor, RING.minPx).
const REVIEWER_FADE = 0.1 / 3.2;
/**
 * How near 0 or 1 a feed dot's offset (fract of i / n plus the flow) must be for float32 to wrap it the
 * other way: the offset is under 17 at the ambients sampled, where float32 keeps 2e-6; this is fifty
 * times that.
 */
const FEED_WRAP = 1e-4;
for (const size of SIZES) {
  test.describe(`Task 11 at ${size.width}x${size.height}`, () => {
    test.use({ viewport: { width: size.width, height: size.height } });

    for (const [beat, local] of [
      ['re-1', (REVIEWER_FADE + 0.4) / 2],
      ['re-3', (0.62 + REVIEWER_FADE + (1 - REVIEWER_FADE)) / 2],
    ] as const) {
      test(`the reviewer’s ring is drawn at ${beat}: its own pixels, round where the twin puts it, never under RING.minPx`, async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (e) => errors.push(e.message));
        await openStage(page, '&mech=bike&n=500');
        const spans = await readSpans(page);
        const reviewer = spans.find((x) => x.id === 'reviewer');
        if (!reviewer) throw new Error('no reviewer section');
        const p = reviewer.start + local * (reviewer.end - reviewer.start);
        await openStage(page, `&mech=bike&p=${p}`);
        await page.waitForFunction(() => (window as unknown as { __motes: Hook }).__motes.lod() !== null);
        const { visible } = await drawStats(page);
        expect(visible).toContain('net-ring');
        const all = PNG.sync.read(await canvasShot(page));
        await call(page, 'isolate', visible.filter((n) => n !== 'net-ring'));
        const without = PNG.sync.read(await canvasShot(page));
        // The ring's own pixels: brighter with it than without (it adds its band).
        let [n, x0, x1, y0, y1] = [0, Infinity, -Infinity, Infinity, -Infinity];
        for (let i = 0; i < all.width * all.height; i++) {
          if (![0, 1, 2].some((c) => all.data[i * 4 + c] - without.data[i * 4 + c] > 6)) continue;
          const [x, y] = [(i % all.width) + 0.5, Math.floor(i / all.width) + 0.5];
          [x0, x1, y0, y1] = [Math.min(x0, x), Math.max(x1, x), Math.min(y0, y), Math.max(y1, y)];
          n++;
        }
        // Where the twin puts it: the ring's pose (review.ts ringAt) at the keyed review, through the keyed camera.
        const g = generateGalaxy(MOTE_SEED, galaxyTier(size.width, size.height), galaxyBudget(MOTE_BUDGET_DESKTOP));
        const data = dataOf(g);
        const state = new KeyframeSampler(keyframes, spans).sample(p);
        const visits: RingVisit[] = g.visits.map((id) => ({ row: bodyIndex(g, id), radius: pieceOuter(g, bodyIndex(g, id)) }));
        const pose = ringAt(state.net.review, visits, AMBIENT_POSE, data);
        expect(pose.presence).toBe(1);
        const camera = essayCamera(state.camera, g, data, size, AMBIENT_POSE);
        camera.updateMatrixWorld();
        const centre = new Vector3(...pose.position);
        const perUnit = (0.5 * size.height * camera.projectionMatrix.elements[5]) / centre.distanceTo(camera.getWorldPosition(new Vector3()));
        const radiusPx = ringDrawnRadius(pose.radius, perUnit) * perUnit;
        const q = centre.clone().project(camera);
        const [cx, cy] = [((q.x + 1) / 2) * size.width, ((1 - q.y) / 2) * size.height];
        const seen = { n, x: (x0 + x1) / 2, y: (y0 + y1) / 2, halfWidth: (x1 - x0) / 2 };
        expect(n, `the ring's pixels ${JSON.stringify(seen)}`).toBeGreaterThan(30);
        expect(Math.hypot(seen.x - cx, seen.y - cy), `round the twin's centre (${cx.toFixed(1)}, ${cy.toFixed(1)}): ${JSON.stringify(seen)}`).toBeLessThan(3);
        // Seen from above, its width is its outer diameter: the twin's drawn radius, never under the floor.
        expect(Math.abs(seen.halfWidth - radiusPx), `half its width vs the twin's ${radiusPx.toFixed(2)} px`).toBeLessThan(2);
        expect(seen.halfWidth).toBeGreaterThanOrEqual(RING.minPx - 1.5);
        expect(errors).toEqual([]);
      });
    }

    test('the feed is re-3’s subject: drawn alone (no lineage stream), where the twin runs it from R0 to the ring, flowing between two ambients', async ({ page }) => {
      // The middle of re-3's hold, after the pull-back to the hub and the light (reviewer 0.80) and
      // before its page fades: net.feed 1, net.streams 0 (the author's ruling, galaxy §15.1).
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await openStage(page, '&mech=bike&n=500');
      const spans = await readSpans(page);
      const reviewer = spans.find((x) => x.id === 'reviewer');
      if (!reviewer) throw new Error('no reviewer section');
      const p = reviewer.start + ((0.8 + 1 - REVIEWER_FADE) / 2) * (reviewer.end - reviewer.start);
      const state = new KeyframeSampler(keyframes, spans).sample(p);
      expect([state.net.feed, state.net.streams]).toEqual([1, 0]);
      const g = generateGalaxy(MOTE_SEED, galaxyTier(size.width, size.height), galaxyBudget(MOTE_BUDGET_DESKTOP));
      const data = dataOf(g);
      const visits: RingVisit[] = g.visits.map((id) => ({ row: bodyIndex(g, id), radius: pieceOuter(g, bodyIndex(g, id)) }));
      const lit: Set<number>[] = [];
      for (const ambient of [AMBIENT_POSE, 101]) {
        await openStage(page, `&mech=bike&p=${p}&ambient=${ambient}`);
        await page.waitForFunction(() => (window as unknown as { __motes: Hook }).__motes.lod() !== null);
        const { visible } = await drawStats(page);
        expect(visible).toContain('net-feed');
        expect(visible).not.toContain('net-streams');
        await call(page, 'isolate', ['net-feed']);
        const png = PNG.sync.read(await canvasShot(page));
        const mask = litMask(png, 8);
        // Where the twin puts the feed's dots (stream.ts streamDot, from R0 to the ring) through the keyed camera.
        const camera = essayCamera(state.camera, g, data, size, ambient);
        const ring = ringAt(state.net.review, visits, ambient, data).position;
        const curve = streamCurve(data, data.feedRow, ambient, ring);
        const toScreen = (pos: readonly number[]) => {
          const q = new Vector3(pos[0], pos[1], pos[2]).project(camera);
          return { x: ((q.x + 1) / 2) * size.width, y: ((1 - q.y) / 2) * size.height };
        };
        // A dot whose offset wraps (fract) within float32 of 0 or 1 may be drawn at the other end of the
        // feed from where the float64 twin puts it: such a dot stands at either end.
        const dots = Array.from({ length: STREAM_DOTS[1] }, (_, i) => streamDot(data, data.feedRow, i, ambient, ring))
          .filter((d) => d.presence > 0)
          .flatMap((d) => [d.pos, ...(d.u < FEED_WRAP ? [curve.b] : d.u > 1 - FEED_WRAP ? [curve.a] : [])].map(toScreen));
        const on = new Set<number>();
        let off = 0;
        for (let i = 0; i < mask.length; i++) {
          if (!mask[i]) continue;
          on.add(i);
          const [x, y] = [(i % png.width) + 0.5, Math.floor(i / png.width) + 0.5];
          if (!dots.some((d) => Math.hypot(d.x - x, d.y - y) <= 1.5)) off++;
        }
        expect(on.size, `the feed's lit pixels at ${ambient}`).toBeGreaterThanOrEqual(15);
        expect(off, `lit pixels off the twin's dots at ${ambient}`).toBe(0);
        lit.push(on);
      }
      // The dots flow on the ambient clock: most of one frame's dots are not where the other's are.
      const moved = [...lit[0]].filter((i) => !lit[1].has(i)).length;
      expect(moved, 'dots moved between the two ambients').toBeGreaterThan(lit[0].size / 2);
      expect(errors).toEqual([]);
    });

    // The author (2026-10-09): faint is fine if they animate. Under every beat that shows the lineage
    // streams, where they are up at full strength, at two ambients a quarter of a second apart (the dots
    // flow 0.0375 of their stream; the galaxy's turn is 0.075 degrees): they light pixels, every one
    // where the twin's flowing dots light theirs (streamPixels, after the band's mask), and they move.
    // The step is 1.5 dot spacings at the cap of STREAM_DOTS' 40: half a second was exactly 3 there, so
    // a capped stream's dots landed where their neighbours stood, and the wider neighbourhood (Task 1d)
    // put most of these beats' streams at the cap.
    for (const beat of STREAM_BEATS)
      test(`the streams flow on the ambient clock under ${beat}: lit where the twin's dots are, and moving`, async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (e) => errors.push(e.message));
        await openStage(page, '&mech=bike&n=500');
        const spans = await readSpans(page);
        const where = await page.evaluate((id) => {
          const el = document.querySelector<HTMLElement>(`[data-beat="${id}"]`)!;
          const section = el.closest<HTMLElement>('section[data-section]')!;
          const ats = [...section.querySelectorAll<HTMLElement>('.beat')].map((b) => Number(b.dataset.at));
          const at = Number(el.dataset.at);
          return { section: section.dataset.section!, at, next: ats.find((x) => x > at) ?? 1 };
        }, beat);
        const span = spans.find((x) => x.id === where.section)!;
        const sampler = new KeyframeSampler(keyframes, spans);
        const progress = (l: number) => span.start + l * (span.end - span.start);
        const up = Array.from({ length: 401 }, (_, k) => where.at + ((where.next - where.at) * k) / 400).filter((l) => sampler.sample(progress(l)).net.streams === 1);
        expect(up.length, `net.streams is 1 somewhere under ${beat}`).toBeGreaterThan(0);
        const p = progress(up[Math.floor(up.length / 2)]);
        const state = sampler.sample(p);
        const g = generateGalaxy(MOTE_SEED, galaxyTier(size.width, size.height), galaxyBudget(MOTE_BUDGET_DESKTOP));
        const data = dataOf(g);
        const lit: Set<number>[] = [];
        const twins: Set<string>[] = [];
        for (const ambient of [AMBIENT_POSE, AMBIENT_POSE + 0.25]) {
          await openStage(page, `&mech=bike&p=${p}&ambient=${ambient}`);
          await page.waitForFunction(() => (window as unknown as { __motes: Hook }).__motes.lod() !== null);
          await call(page, 'isolate', ['net-streams']);
          const png = PNG.sync.read(await canvasShot(page));
          const mask = litMask(png, 8);
          const twin = streamPixels({ ...state.net, feed: 0 }, g, data, essayCamera(state.camera, g, data, size, ambient), size, ambient);
          const on = new Set<number>();
          let off = 0;
          for (let i = 0; i < mask.length; i++) {
            if (!mask[i]) continue;
            on.add(i);
            const [x, y] = [(i % png.width) + 0.5, Math.floor(i / png.width) + 0.5];
            // (The twin gives each dot's pixel by its centre's x and its top's y.)
            if (!twin.some((d) => Math.hypot(d.x - x, d.y + 0.5 - y) <= 1.5)) off++;
          }
          expect(on.size, `the streams' lit pixels at ${ambient}`).toBeGreaterThanOrEqual(10);
          expect(off, `lit pixels off the twin's dots at ${ambient}`).toBe(0);
          lit.push(on);
          twins.push(new Set(twin.map((d) => `${d.x},${d.y}`)));
        }
        // They move, as the twin's dots do: more than a quarter of the lit pixels are not lit a quarter
        // of a second on. (Measured at half a second before Task 1d: 67-72 % under ly-1 and ly-5, 34-42 %
        // under up-1, tr-1, tr-2 and fx-4, whose dots stand close along their lines, so many land where
        // others were.)
        const moved = [...lit[0]].filter((i) => !lit[1].has(i)).length;
        const twinMoved = [...twins[0]].filter((k) => !twins[1].has(k)).length;
        test.info().annotations.push({ type: 'moved', description: `${moved} of ${lit[0].size} lit pixels; the twin ${twinMoved} of ${twins[0].size}` });
        expect(twinMoved, `the twin's dots moved between the two ambients`).toBeGreaterThan(twins[0].size / 4);
        expect(moved, 'dots moved between the two ambients').toBeGreaterThan(lit[0].size / 4);
        expect(errors).toEqual([]);
      });
  });
}

// Task 7: the ambient clock and the tracking camera (galaxy §8). A probe shot tracks its target at the
// frame's ambient; in test mode the ambient stands at `?ambient=` (or AMBIENT_POSE), so a frame is a
// pure function of (scroll, ambient).

/** The lit pixels' bounding-box centre within `r` px of (x, y), leaving out those inside any of `masks`. */
function litCentre(png: PNG, x: number, y: number, r: number, masks: { x: number; y: number; r: number }[]): { x: number; y: number; n: number } {
  const mask = litMask(png, 4);
  let [x0, x1, y0, y1, n] = [Infinity, -Infinity, Infinity, -Infinity, 0];
  for (let yy = Math.max(0, Math.floor(y - r)); yy < Math.min(png.height, Math.ceil(y + r)); yy++)
    for (let xx = Math.max(0, Math.floor(x - r)); xx < Math.min(png.width, Math.ceil(x + r)); xx++) {
      const [cx, cy] = [xx + 0.5, yy + 0.5];
      if (!mask[yy * png.width + xx] || Math.hypot(cx - x, cy - y) > r || masks.some((m) => Math.hypot(cx - m.x, cy - m.y) <= m.r)) continue;
      [x0, x1, y0, y1] = [Math.min(x0, cx), Math.max(x1, cx), Math.min(y0, cy), Math.max(y1, cy)];
      n++;
    }
  return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, n };
}

for (const size of SIZES) {
  test.describe(`Task 7 at ${size.width}x${size.height}`, () => {
    test.use({ viewport: { width: size.width, height: size.height } });
    const g = generateGalaxy(MOTE_SEED, galaxyTier(size.width, size.height), galaxyBudget(MOTE_BUDGET_DESKTOP));
    const data = packBodyData(g);

    test('the twelve ride the galaxy’s turn: P1, P2 and P3 glow where they stood at ambient 0', async ({ page }) => {
      // The twelve probe's camera turns with the galaxy about P1-P3's centroid, so at 311 s (a quarter
      // of the galaxy's turn on) the page draws each star's glow sprite where the twin puts it at
      // ambient 0 (netShots.test.ts shows the unridden triangle more than 50 px away there).
      const errors: string[] = [];
      await openT6(page, 'twelve', { lamp: Lamp.Off }, 311, errors);
      const drawn = await glows(page);
      const at0 = twinCamera(g, 'twelve', 0, size).project;
      for (const id of ['P1', 'P2', 'P3']) {
        const want = at0(bodyWorld(data, bodyIndex(g, id), 0));
        const near = Math.min(...drawn.map((s) => Math.hypot(s.x - want.x, s.y - want.y)));
        expect(near, `${id}: a glow within 1 px of its place at ambient 0`).toBeLessThanOrEqual(1);
      }
      expect(errors).toEqual([]);
    });

    test('the camera rides its subject', async ({ page }) => {
      // The close probe tracks C1. On the page, C1 healed (fix 1: no derp moves it), with its shells and
      // bodies alone and its moons masked, is drawn where the twin puts it at ambient 0 and at 7, on the
      // same pixel at both.
      const errors: string[] = [];
      const c1 = bodyIndex(g, 'C1');
      const seen: { twin: { x: number; y: number }; page: { x: number; y: number; n: number } }[] = [];
      for (const ambient of [0, 7]) {
        const { focal, project } = twinCamera(g, 'close', ambient, size);
        const twin = project(bodyWorld(data, c1, ambient));
        const R = (g.bodies[c1].R * focal) / twin.d;
        await openT6(page, 'close', { fix: 1, lamp: Lamp.Off }, ambient, errors);
        const { sysPx } = await lod(page);
        const moons = pieceDiscs(g, data, twinClocks({ fix: 1 }, ambient, sysPx), 1.5)
          .slice(1)
          .map((d) => {
            const p = project(d.centre);
            return { x: p.x, y: p.y, r: (d.R * focal) / p.d + 3 };
          });
        await call(page, 'isolate', ['net-shells', 'net-bodies']);
        const lit = litCentre(PNG.sync.read(await canvasShot(page)), twin.x, twin.y, R + 4, moons);
        seen.push({ twin, page: lit });
      }
      const [a, b] = seen;
      for (const s of seen) {
        expect(s.page.n, 'C1 is drawn').toBeGreaterThan(200);
        expect(Math.hypot(s.page.x - s.twin.x, s.page.y - s.twin.y), `the page draws C1 where the twin puts it: ${JSON.stringify(s)}`).toBeLessThanOrEqual(1.5);
      }
      expect(Math.hypot(a.page.x - b.page.x, a.page.y - b.page.y), `the page: C1 at 0 and at 7: ${JSON.stringify(seen)}`).toBeLessThanOrEqual(1);
      // The case is real: untracked, C1 would have moved across the frame between the two.
      const still = twinCamera(g, 'close', 0, size).project(bodyWorld(data, c1, 7));
      expect(Math.hypot(still.x - a.twin.x, still.y - a.twin.y)).toBeGreaterThan(20);
      expect(errors).toEqual([]);
    });
  });
}

test.describe('Task 7, purity', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('pure at a fixed ambient: the hood probe at ?ambient=101 is byte-equal jumped to and scrolled to', async ({ page }) => {
    // A frame is a pure function of (scroll, ambient): at a fixed ambient, the frame at an Act II
    // progress is the same whether the page opens there or scrolls there from the top.
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const query = '&mech=bike&shot=hood&ambient=101&n=1000';
    await openStage(page, query);
    const spans = await readSpans(page);
    const span = spans.find((s) => s.id === 'layers');
    if (!span) throw new Error('no layers section');
    const p = Math.round((span.start + 0.5 * (span.end - span.start)) * 1e4) / 1e4;
    // Scrolled: from the top, in steps, to the jump's scrollY.
    const target = await targetScrollY(page, p);
    for (let i = 1; i <= 6; i++) {
      await page.evaluate((y) => window.scrollTo(0, y), Math.round((i / 6) * target));
      await settle(page);
    }
    await page.waitForFunction(() => (window as unknown as { __motes: Hook }).__motes.lod() !== null);
    await settle(page);
    const scrolled = await canvasShot(page);
    // Jumped.
    await openStage(page, `${query}&p=${p}`);
    await page.waitForFunction(() => (window as unknown as { __motes: Hook }).__motes.lod() !== null);
    await settle(page);
    expect(await page.evaluate(() => window.scrollY)).toBe(target);
    const jumped = await canvasShot(page);
    expect(PNG.sync.read(jumped).data.some((v, i) => i % 4 !== 3 && v > 40), 'the galaxy draws').toBe(true);
    expect(scrolled.equals(jumped), 'scrolled and jumped frames differ').toBe(true);
    expect(errors).toEqual([]);
  });
});

// The moons (galaxy §1.3, the author's request after Task 7): a moon is a small sphere of its
// planet's material, fine motes at the planet's grain over the planet's faint fill, never a dark ball
// studded with big dots; and a moon a few px across is one point, never a ring.

/** A pixel's lift over the stage's background: its largest channel's. */
function lift(png: PNG, x: number, y: number): number {
  const i = (y * png.width + x) * 4;
  return Math.max(png.data[i] - 0x0b, png.data[i + 1] - 0x0d, png.data[i + 2] - 0x12);
}

/**
 * A disc's dark floor: the lift its darkest quarter of pixels stays under (the 25th percentile), within
 * `r` px of (x, y), leaving out those inside any of `masks`. Between a dotted sphere's motes there is
 * only the faint fill (BODY_LOOK.fill, about 9 on the blue channel), so its darkest quarter is
 * near-black like the planet's; a solid fill (the old moon's 0.28, about 70) lifts the whole disc.
 */
function darkFloor(png: PNG, x: number, y: number, r: number, masks: { x: number; y: number; r: number }[] = []): { floor: number; n: number } {
  const lifts: number[] = [];
  for (let yy = Math.floor(y - r); yy <= Math.ceil(y + r); yy++)
    for (let xx = Math.floor(x - r); xx <= Math.ceil(x + r); xx++) {
      if (xx < 0 || yy < 0 || xx >= png.width || yy >= png.height) continue;
      const [cx, cy] = [xx + 0.5, yy + 0.5];
      if (Math.hypot(cx - x, cy - y) > r || masks.some((m) => Math.hypot(cx - m.x, cy - m.y) <= m.r)) continue;
      lifts.push(lift(png, xx, yy));
    }
  lifts.sort((a, b) => a - b);
  return { floor: lifts[Math.floor(lifts.length / 4)] ?? 0, n: lifts.length };
}

/** How far a moon's dark floor may sit over its planet's: a few levels of the screen's sampling, a tenth of what a solid fill adds. */
const DARK_FLOOR_SLACK = 4;

/** How far a fixed moon's warmth as a point may fall from its warmth up close, as a share of it. */
const WARMTH_SLACK = 0.25;

test.describe('Moons at 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  const size = { width: 390, height: 844 };
  const g = generateGalaxy(MOTE_SEED, galaxyTier(size.width, size.height), galaxyBudget(MOTE_BUDGET_DESKTOP));
  const data = packBodyData(g);
  const c1 = g.bodies[bodyIndex(g, 'C1')];
  const sys = g.systems.indexOf(c1.star);
  /** Each body's system (a binary's stars and their planets share their barycentre's). */
  const sysOf = systemIndexOf(g);
  /** The furthest a shell mote sits from its body's centre, in its radius, healthy or cracked (morphTerm's bound). */
  const SHELL_REACH = 1 + EQ_A * (1 + EQ_SECOND);

  test('up close a moon is fine dots over the faint fill: no dark disc, and no mote further off its limb than a mote’s radius', async ({ page }) => {
    // The close shot at the pose on a phone, its shells and bodies alone. Each moon clear of the
    // planet, of the other moons and of the burst's ghost: its dark floor (darkFloor, inside 0.85 of
    // its disc) is no more than DARK_FLOOR_SLACK over the planet's (a solid fill lifts the whole
    // disc); and every lit pixel of the shells round it lies within its disc at the shell's reach plus
    // one planet mote's radius on screen (the planet's grain) and half a pixel of the screen's sampling.
    const errors: string[] = [];
    await openT6(page, 'close', {}, AMBIENT_POSE, errors);
    const { sysPx } = await lod(page);
    const c = twinClocks({ lamp: Lamp.Planet, lampRow: c1.index }, AMBIENT_POSE, sysPx);
    const { focal, project } = twinCamera(g, 'close', AMBIENT_POSE, size);
    const disc = (row: number, centre: readonly number[]) => {
      const p = project(centre);
      return { row, x: p.x, y: p.y, r: (g.bodies[row].R * focal) / p.d, d: p.d };
    };
    const piece = g.bodies.filter((b) => b.index === c1.index || (b.kind === 'moon' && b.host === c1.index));
    const bodies = piece.map((b) => disc(b.index, bodyCentre(b.index, bodyDerp(b.index, sys, c, data), AMBIENT_POSE, data)));
    const ghosts = piece.flatMap((b) => {
      const gh = bodyGhost(b.index, bodyDerp(b.index, sys, c, data), AMBIENT_POSE, data);
      return gh.gain > 0 ? [disc(b.index, gh.pos)] : [];
    });
    const planet = bodies[0];
    // A planet mote's diameter on screen (BODY_LOOK.dotShare of its row pitch) at the planet's distance.
    const mote = (BODY_LOOK.dotShare * Math.PI * c1.R * focal) / (c1.lattice![0] * planet.d);
    // Half a pixel of the screen's sampling: measured, a moon's motes reach 0.3-0.5 px past its shell's
    // reach, the old 3 x 6 lattice's 1.1-2.8 px.
    const reach = (b: { r: number }) => b.r * SHELL_REACH + mote / 2 + 0.5;
    const clear = bodies.slice(1).filter((m) => {
      const others = [...bodies, ...ghosts].filter((o) => o !== m);
      const onScreen = m.x - 2 * m.r > 0 && m.y - 2 * m.r > 0 && m.x + 2 * m.r < size.width && m.y + 2 * m.r < size.height;
      return onScreen && others.every((o) => Math.hypot(o.x - m.x, o.y - m.y) > reach(o) + 2 * m.r);
    });
    expect(clear.length, 'moons clear of the rest of the piece').toBeGreaterThanOrEqual(3);

    await call(page, 'isolate', ['net-shells', 'net-bodies']);
    const png = PNG.sync.read(await canvasShot(page));
    const masks = [...bodies.slice(1), ...ghosts].map((m) => ({ x: m.x, y: m.y, r: reach(m) }));
    const ref = darkFloor(png, planet.x, planet.y, 0.85 * planet.r, masks);
    expect(ref.n, 'planet pixels compared').toBeGreaterThan(1000);
    for (const m of clear) {
      const own = darkFloor(png, m.x, m.y, 0.85 * m.r);
      expect.soft(own.floor, `${g.bodies[m.row].id}: its disc's dark floor (the planet's ${ref.floor})`).toBeLessThanOrEqual(ref.floor + DARK_FLOOR_SLACK);
    }

    await call(page, 'isolate', ['net-shells']);
    const shells = PNG.sync.read(await canvasShot(page));
    for (const m of clear) {
      let lit = 0;
      let off = 0;
      for (let y = Math.floor(m.y - 2 * m.r); y <= Math.ceil(m.y + 2 * m.r); y++)
        for (let x = Math.floor(m.x - 2 * m.r); x <= Math.ceil(m.x + 2 * m.r); x++) {
          if (lift(shells, x, y) <= 4) continue;
          const dist = Math.hypot(x + 0.5 - m.x, y + 0.5 - m.y);
          if (dist > 2 * m.r) continue;
          lit++;
          if (dist > reach(m)) off++;
        }
      expect(lit, `${g.bodies[m.row].id} is drawn`).toBeGreaterThan(20);
      expect.soft(off, `${g.bodies[m.row].id}: lit px past its limb by more than a mote's radius`).toBe(0);
    }
    expect(errors).toEqual([]);
  });

  test('a moon a few px across is one point, not a ring', async ({ page }) => {
    // The system shot on P_a on a phone (unlamped), shells and bodies alone: every drawn moon 2-5
    // px across, on screen and clear of every other body, is one blob: the pixels round it lit past half
    // its brightest form one 8-connected component, and the pixel under its centre is one of them.
    const errors: string[] = [];
    await openT6(page, 'system', { lamp: Lamp.Off }, 0, errors);
    const { sysPx } = await lod(page);
    const c = twinClocks({}, 0, sysPx);
    const { focal, project } = twinCamera(g, 'system', 0, size);
    const all = g.bodies
      .filter((b) => b.kind !== 'core' && b.kind !== 'bary' && (b.kind !== 'moon' || sysPx[sysOf[b.index]] >= LOD_BANDS[LodElement.Moon][1]))
      .map((b) => {
        const p = project(bodyCentre(b.index, bodyDerp(b.index, sysOf[b.index], c, data), 0, data));
        return { b, x: p.x, y: p.y, front: p.front, across: (2 * b.R * focal) / p.d };
      });
    const small = all.filter((m) => {
      if (m.b.kind !== 'moon' || !m.front || m.across < 2 || m.across > 5) return false;
      const w = m.across / 2 + 2;
      if (m.x < w || m.y < w || m.x > size.width - w || m.y > size.height - w) return false;
      return all.every((o) => o === m || Math.hypot(o.x - m.x, o.y - m.y) > w + Math.max(o.across / 2, 1) + 1);
    });
    expect(small.length, 'small moons on screen and clear').toBeGreaterThanOrEqual(3);

    await call(page, 'isolate', ['net-shells', 'net-bodies']);
    const png = PNG.sync.read(await canvasShot(page));
    for (const m of small) {
      const w = Math.ceil(m.across / 2 + 2);
      const [x0, y0] = [Math.floor(m.x) - w, Math.floor(m.y) - w];
      const side = 2 * w + 1;
      let peak = 0;
      for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) peak = Math.max(peak, lift(png, x0 + x, y0 + y));
      expect(peak, `${m.b.id} is drawn`).toBeGreaterThan(24);
      const mask = new Uint8Array(side * side);
      for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) mask[y * side + x] = lift(png, x0 + x, y0 + y) >= peak / 2 ? 1 : 0;
      const parts = blobs(mask, side);
      const id = m.b.id;
      expect.soft(parts.length, `${id} (${m.across.toFixed(1)} px): lit components`).toBe(1);
      // The blob holds the centre: the pixel under the moon's centre is itself past half the peak (a
      // ring's middle is dark).
      expect.soft(lift(png, Math.floor(m.x), Math.floor(m.y)), `${id}: its centre pixel against its peak ${peak}`).toBeGreaterThanOrEqual(peak / 2);
    }
    expect(errors).toEqual([]);
  });

  test('a fixed moon is as amber as a point as it is up close', async ({ page }) => {
    // The fix landed everywhere (net.fix 1), unlamped, at the pose, the shells alone. Up close (the
    // close shot) C1's moons are dotted spheres; at the twelve, the moons forced in (they are below
    // their band there) and the planet shells off, every fixed moon of P1-P3 is its point, under 4 px.
    // A moon's warmth is the red over the blue it lifts above the background, summed over its pixels.
    // Each fixed moon point clear of other tints is within WARMTH_SLACK of the warmth of C1's
    // moons up close (one tint, BODY_WARM_MOON; a point tinted the planet's BODY_WARM is about half as
    // warm).
    const errors: string[] = [];
    const fixed = (row: number) => g.bodies[row].kind === 'moon' && bodyLight(row, { fix: 1, highlight: 0 }, data).fix > 0.99;
    const warmth = (png: PNG, x: number, y: number, r: number): { red: number; blue: number; n: number } => {
      let [red, blue, n] = [0, 0, 0];
      for (let yy = Math.floor(y - r); yy <= Math.ceil(y + r); yy++)
        for (let xx = Math.floor(x - r); xx <= Math.ceil(x + r); xx++) {
          if (Math.hypot(xx + 0.5 - x, yy + 0.5 - y) > r || lift(png, xx, yy) <= 4) continue;
          const i = (yy * png.width + xx) * 4;
          red += png.data[i] - 0x0b;
          blue += png.data[i + 2] - 0x12;
          n++;
        }
      return { red, blue, n };
    };
    const frame = async (shot: Shot, force: [LodElement, number][]) => {
      await openT6(page, shot, { fix: 1, lamp: Lamp.Off }, AMBIENT_POSE, errors);
      for (const [el, gain] of force) await call(page, 'forceLod', el, gain);
      await call(page, 'isolate', ['net-shells']);
      const { sysPx } = await lod(page);
      const c = twinClocks({ fix: 1 }, AMBIENT_POSE, sysPx);
      const { focal, project } = twinCamera(g, shot, AMBIENT_POSE, size);
      const at = (row: number) => {
        const b = g.bodies[row];
        const p = project(bodyCentre(row, bodyDerp(row, sysOf[b.index], c, data), AMBIENT_POSE, data));
        return { row, x: p.x, y: p.y, front: p.front, across: (2 * b.R * focal) / p.d };
      };
      return { png: PNG.sync.read(await canvasShot(page)), at };
    };
    const onScreen = (p: { x: number; y: number }, r: number) => p.x > r && p.y > r && p.x < size.width - r && p.y < size.height - r;

    // Up close: C1's moons on screen, their discs' pixels summed.
    const close = await frame('close', []);
    const ref = { red: 0, blue: 0, n: 0 };
    for (const m of g.bodies.filter((b) => b.kind === 'moon' && b.host === c1.index)) {
      const up = close.at(m.index);
      if (!onScreen(up, up.across)) continue;
      const w = warmth(close.png, up.x, up.y, 0.85 * (up.across / 2));
      [ref.red, ref.blue, ref.n] = [ref.red + w.red, ref.blue + w.blue, ref.n + w.n];
    }
    expect(ref.n, 'C1’s moons drawn up close').toBeGreaterThan(200);
    const upClose = ref.red / ref.blue;

    // As points: at the twelve, each fixed moon under 4 px, on screen, and its 2 px window clear of
    // every body of another tint (a star's shell, an unfixed moon's point): a fixed moon's point
    // bleeding in is the same amber. The planets draw nothing here, their points forced off with
    // their shells: at the twelve's 132 (Task 1d) every moon stands within 1-4.5 px of its planet's
    // point, which would tint its window, so the planets are taken out of the picture instead.
    const far = await frame('twelve', [
      [LodElement.Moon, 1],
      [LodElement.PlanetShell, 0],
      [LodElement.PlanetPoint, 0],
    ]);
    const drawn = g.bodies.filter((b) => b.kind !== 'core' && b.kind !== 'planet').map((b) => far.at(b.index));
    let compared = 0;
    for (const pt of drawn) {
      if (!fixed(pt.row) || !pt.front || pt.across >= MOON_POINT_PX[0] || !onScreen(pt, 6)) continue;
      if (drawn.some((o) => o.row !== pt.row && !fixed(o.row) && o.front && Math.hypot(o.x - pt.x, o.y - pt.y) < 3.5 + o.across / 2)) continue;
      const w = warmth(far.png, pt.x, pt.y, 2);
      const id = g.bodies[pt.row].id;
      expect(w.n, `${id} drawn as a point`).toBeGreaterThan(0);
      const asPoint = w.red / w.blue;
      expect.soft(asPoint / upClose, `${id}: its warmth as a point (${asPoint.toFixed(2)}) over a fixed moon's up close (${upClose.toFixed(2)})`).toBeGreaterThanOrEqual(1 - WARMTH_SLACK);
      expect.soft(asPoint / upClose, `${id}: its warmth as a point over a fixed moon's up close`).toBeLessThanOrEqual(1 / (1 - WARMTH_SLACK));
      compared++;
    }
    expect(compared, 'fixed moon points compared').toBeGreaterThanOrEqual(3);
    expect(errors).toEqual([]);
  });
});

/** The 8-connected components of a `side` x `side` mask, each as its pixel count. */
function blobs(mask: Uint8Array, side: number): number[] {
  const seen = new Uint8Array(mask.length);
  const out: number[] = [];
  for (let s = 0; s < mask.length; s++) {
    if (!mask[s] || seen[s]) continue;
    const stack = [s];
    seen[s] = 1;
    let n = 0;
    while (stack.length > 0) {
      const i = stack.pop()!;
      n++;
      const [x, y] = [i % side, Math.floor(i / side)];
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const [nx, ny] = [x + dx, y + dy];
          if (nx < 0 || ny < 0 || nx >= side || ny >= side) continue;
          const j = ny * side + nx;
          if (mask[j] && !seen[j]) {
            seen[j] = 1;
            stack.push(j);
          }
        }
    }
    out.push(n);
  }
  return out;
}

// The re-skin's Task 1a (docs/specs/2026-10-09-act-2-reskin.md §4.1, §5): the core's haze is a look
// gate, drawn only while `net.haze` is up (the galaxy wides), not by the eye's distance from the core,
// which lit it under ls-1 on a phone and under up-2 and re-3 on a desktop. Each frame is the essay's
// own, as keyed, at the place its still is taken (stills.spec.ts).

/** HAZE.hazePx (src/scene/galaxy/galaxySystem.ts, which loads GLSL and so cannot be imported here; galaxySystem.test.ts holds it at 64). */
const HAZE_PX = 64;

/** The essay's frame at section-local `local` of `section`, the galaxy built; returns the progress. */
async function openPlace(page: Page, section: string, local: number): Promise<number> {
  await openStage(page, '&mech=bike&n=500');
  const span = (await readSpans(page)).find((x) => x.id === section);
  if (!span) throw new Error(`no ${section} section`);
  const p = span.start + local * (span.end - span.start);
  await openStage(page, `&mech=bike&p=${p}`);
  await page.waitForFunction(() => (window as unknown as { __motes: Hook }).__motes.lod() !== null);
  await settle(page);
  return p;
}

for (const size of SIZES) {
  test.describe(`the haze at ${size.width}x${size.height}`, () => {
    test.use({ viewport: { width: size.width, height: size.height } });

    test('the haze draws only while net.haze is up: at fr-1, warm, in a 64 px disc about the core', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const p = await openPlace(page, 'far', 0.53125);
      const state = new KeyframeSampler(keyframes, await readSpans(page)).sample(p);
      expect(state.net.haze).toBe(1);
      expect((await drawStats(page)).visible).toContain('galaxy-haze');
      // The haze alone: every pixel it lights, where the twin puts the galactic centre through the keyed camera.
      await call(page, 'isolate', ['galaxy-haze']);
      const png = PNG.sync.read(await canvasShot(page));
      const g = generateGalaxy(MOTE_SEED, galaxyTier(size.width, size.height), galaxyBudget(MOTE_BUDGET_DESKTOP));
      const data = dataOf(g);
      const camera = essayCamera(state.camera, g, data, size, AMBIENT_POSE);
      camera.updateMatrixWorld();
      const q = new Vector3(...galacticToWorld(data, [0, 0, 0], AMBIENT_POSE)).project(camera);
      const [cx, cy] = [((q.x + 1) / 2) * size.width, ((1 - q.y) / 2) * size.height];
      const bg = [0x0b, 0x0d, 0x12];
      let [lit, far, outside] = [0, 0, 0];
      const added = [0, 0, 0];
      for (let i = 0; i < png.width * png.height; i++) {
        const d = [0, 1, 2].map((c) => png.data[i * 4 + c] - bg[c]);
        if (d.every((v) => v === 0)) continue;
        lit++;
        d.forEach((v, c) => (added[c] += v));
        const r = Math.hypot((i % png.width) + 0.5 - cx, Math.floor(i / png.width) + 0.5 - cy);
        far = Math.max(far, r);
        if (r > HAZE_PX / 2 + 1) outside++;
      }
      const seen = `${lit} px lit, the farthest ${far.toFixed(1)} px from the core (${cx.toFixed(1)}, ${cy.toFixed(1)}), added rgb ${added.join(' ')}`;
      // The disc: nothing lit outside its 32 px radius (a pixel's slack), and it fills most of it (the
      // profile, (1 - r)², falls under one level of 255 near its rim: measured out to 29.5 px on both
      // screens). The lit count's floor is 0.6 × the 2,744 px measured on the phone (desktop 2,748).
      expect(outside, seen).toBe(0);
      expect(far, seen).toBeGreaterThanOrEqual(0.8 * (HAZE_PX / 2));
      expect(lit, seen).toBeGreaterThanOrEqual(1646);
      // Warm (#FFD9A0, taken whole): it adds more red than green, and more green than blue.
      expect(added[0], seen).toBeGreaterThan(added[1]);
      expect(added[1], seen).toBeGreaterThan(added[2]);
      expect(errors).toEqual([]);
    });

    for (const [beat, section, local] of [
      ['ls-1', 'lesson', 0.5],
      ['up-2', 'spread', 2.124 / 2.808],
      ['re-3', 'reviewer', 0.88],
    ] as const) {
      test(`the haze is not drawn at ${beat}, where net.haze is 0`, async ({ page }) => {
        const p = await openPlace(page, section, local);
        expect(new KeyframeSampler(keyframes, await readSpans(page)).sample(p).net.haze).toBe(0);
        const { visible } = await drawStats(page);
        // Not vacuous: the background is drawn there, its haze not.
        expect(visible).toContain('galaxy-stars');
        expect(visible).not.toContain('galaxy-haze');
      });
    }
  });
}

// ---- The stars (the re-skin's Task 2, §4.3): self-lit dots, spikes, white to amber ----
// Each frame is the essay's own, as keyed, at its still's place (stills.spec.ts): ly-1 in the middle
// of its hold, df-3 on the pulled-back three before the twelve light, fr-1 the galaxy wide.

interface SpikeHook {
  spikes(): { x: number; y: number; lenPx: number; spikes: 4 | 6 }[] | null;
}

const LY_1: [string, number] = ['layers', 0.45 / 4.3];
const DF_3: [string, number] = ['defect', 0.52];
const FR_1: [string, number] = ['far', 0.53125];

/** Each star's centre on screen at a keyed frame, through the twin's camera at the pose (the stars do not orbit). */
function starsOnScreen(state: { camera: Parameters<typeof essayCamera>[0] }, size: { width: number; height: number }) {
  const g = generateGalaxy(MOTE_SEED, galaxyTier(size.width, size.height), galaxyBudget(MOTE_BUDGET_DESKTOP));
  const data = dataOf(g);
  const camera = essayCamera(state.camera, g, data, size, AMBIENT_POSE);
  camera.updateMatrixWorld();
  return g.bodies
    .filter((b) => b.kind === 'star')
    .map((b) => {
      const q = new Vector3(...bodyWorld(data, b.index, AMBIENT_POSE)).project(camera);
      return { id: b.id, x: ((q.x + 1) / 2) * size.width, y: ((1 - q.y) / 2) * size.height, front: q.z < 1 };
    });
}

test.describe('the stars at 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('a star reads as a star: at ly-1 P_a’s spike rays each light ≥ 6 px, and nothing lit straight above it past its glow', async ({ page }) => {
    const size = { width: 390, height: 844 };
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const p = await openPlace(page, ...LY_1);
    const state = new KeyframeSampler(keyframes, await readSpans(page)).sample(p);
    const pa = starsOnScreen(state, size).find((s) => s.id === 'P_a')!;
    const spikes = (await page.evaluate(() => (window as unknown as { __motes: SpikeHook }).__motes.spikes()))!;
    const spike = spikes.find((s) => Math.hypot(s.x - pa.x, s.y - pa.y) < 1.5);
    expect(spike, `P_a at (${pa.x.toFixed(1)}, ${pa.y.toFixed(1)}) among ${JSON.stringify(spikes)}`).toBeDefined();
    const glow = (await glows(page)).find((s) => Math.hypot(s.x - pa.x, s.y - pa.y) < 1.5)!;
    // The spikes and the glow alone.
    await call(page, 'isolate', ['net-spikes', 'net-glow']);
    const png = PNG.sync.read(await canvasShot(page));
    const lit = litMask(png, 2);
    const at = (x: number, y: number) => (x >= 0 && y >= 0 && x < png.width && y < png.height ? lit[y * png.width + x] : 0);
    const angles = spike!.spikes === 6 ? [0, 60, 120, 180, 240, 300] : [45, 135, 225, 315];
    const counts = angles.map((deg) => {
      const seen = new Set<number>();
      const [c, s] = [Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180)];
      for (let r = 1.2 * glow.r; r <= spike!.lenPx; r += 0.25) {
        // y up on screen, as starSpike's; the page's y runs down. A pixel either side of the ray.
        const x = Math.floor(spike!.x + r * c);
        const y = Math.floor(spike!.y - r * s);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (at(x + dx, y + dy)) seen.add((y + dy) * png.width + x + dx);
      }
      return seen.size;
    });
    const seen = `P_a: ${spike!.spikes} spikes ${spike!.lenPx.toFixed(1)} px long, glow radius ${glow.r.toFixed(1)}, lit px per ray ${counts.join(' ')}`;
    for (const n of counts) expect(n, seen).toBeGreaterThanOrEqual(6);
    // No spike is vertical: straight above the star, past its glow, nothing of it is lit.
    let above = 0;
    const cx = Math.floor(spike!.x);
    for (let y = Math.floor(spike!.y - glow.r - 2); y >= Math.floor(spike!.y - spike!.lenPx); y--) above += at(cx, y);
    expect(above, seen).toBe(0);
    expect(errors).toEqual([]);
  });

  test('only the brightest stars carry spikes: at the hood, the spiked stars are those from STAR_LOOK.spikeFrom', async ({ page }) => {
    const size = { width: 390, height: 844 };
    await openShot(page, 'hood');
    const g = generateGalaxy(MOTE_SEED, galaxyTier(size.width, size.height), galaxyBudget(MOTE_BUDGET_DESKTOP));
    const data = dataOf(g);
    const { project } = twinCamera(g, 'hood', 0, size);
    const drawn = await glows(page);
    const spikes = (await page.evaluate(() => (window as unknown as { __motes: SpikeHook }).__motes.spikes()))!;
    // The stars whose glow is drawn big enough for spikes to come in (smoothstep(6, 12) over LOD_VISIBLE).
    const stars = g.bodies
      .filter((b) => b.kind === 'star')
      .flatMap((b) => {
        const p = project(bodyWorld(data, b.index, 0));
        const glow = drawn.find((d) => Math.hypot(d.x - p.x, d.y - p.y) < 1.5);
        return glow && 2 * glow.r > 6.5 ? [{ id: b.id, x: p.x, y: p.y, bright: b.look!.brightness >= STAR_LOOK.spikeFrom }] : [];
      });
    const seen = `${stars.length} stars with a glow over 6.5 px, ${stars.filter((x) => x.bright).length} bright; ${spikes.length} spiked`;
    expect(stars.filter((x) => !x.bright).length, seen).toBeGreaterThan(5);
    expect(spikes.length, seen).toBe(stars.filter((x) => x.bright).length);
    expect(spikes.length, seen).toBeGreaterThan(0);
    for (const sp of spikes) expect(stars.find((x) => Math.hypot(x.x - sp.x, x.y - sp.y) < 1.5)?.bright, seen).toBe(true);
  });

  test('far stars are points: at fr-1 no spike is drawn', async ({ page }) => {
    await openPlace(page, ...FR_1);
    expect((await page.evaluate(() => (window as unknown as { __motes: SpikeHook }).__motes.spikes()))!).toEqual([]);
    await call(page, 'isolate', ['net-spikes']);
    const png = PNG.sync.read(await canvasShot(page));
    expect(litMask(png, 0).reduce((n, v) => n + v, 0)).toBe(0);
  });
});

/** A pixel's added colour's hue (degrees) and saturation (HSV), over the stage background. */
function hueSat(r: number, g: number, b: number): { hue: number; sat: number; max: number } {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let hue = 0;
  if (d > 0) {
    if (max === r) hue = 60 * (((g - b) / d + 6) % 6);
    else if (max === g) hue = 60 * ((b - r) / d + 2);
    else hue = 60 * ((r - g) / d + 4);
  }
  return { hue, sat: max > 0 ? d / max : 0, max };
}

for (const size of SIZES) {
  test.describe(`the stars at ${size.width}x${size.height}`, () => {
    test.use({ viewport: { width: size.width, height: size.height } });

    for (const [beat, place] of [
      ['ly-1', LY_1],
      ['df-3', DF_3],
    ] as const) {
      test(`stars are white to amber at ${beat}, before the light`, async ({ page }) => {
        const p = await openPlace(page, ...place);
        const state = new KeyframeSampler(keyframes, await readSpans(page)).sample(p);
        const stars = starsOnScreen(state, size).filter((s) => s.front);
        // A star's glow, drawn: the glows the page reports that sit on a star's centre (not the core's).
        const discs = (await glows(page)).filter((gl) => stars.some((s) => Math.hypot(s.x - gl.x, s.y - gl.y) < 1.5));
        // ly-1's lamp lights P_a alone; df-3 holds the three plans P1-P3.
        expect(discs.length, `${beat}: stars with a glow on screen`).toBeGreaterThanOrEqual(beat === 'ly-1' ? 1 : 3);
        await call(page, 'isolate', ['net-glow', 'net-spikes']);
        const png = PNG.sync.read(await canvasShot(page));
        const bg = [0x0b, 0x0d, 0x12];
        let [checked, off] = [0, 0];
        const bad: string[] = [];
        for (const d of discs)
          for (let y = Math.floor(d.y - d.r); y <= Math.ceil(d.y + d.r); y++)
            for (let x = Math.floor(d.x - d.r); x <= Math.ceil(d.x + d.r); x++) {
              if (x < 0 || y < 0 || x >= png.width || y >= png.height || Math.hypot(x + 0.5 - d.x, y + 0.5 - d.y) > d.r) continue;
              const i = (y * png.width + x) * 4;
              const added = [0, 1, 2].map((c) => png.data[i + c] - bg[c]);
              const hs = hueSat(Math.max(0, added[0]), Math.max(0, added[1]), Math.max(0, added[2]));
              // Star-dominant: bright enough that its colour is the star's, not a level of rounding.
              if (hs.max < 40) continue;
              checked++;
              if (!((hs.hue >= 20 && hs.hue <= 60) || hs.sat <= 0.15)) {
                off++;
                if (bad.length < 5) bad.push(`(${x}, ${y}) rgb ${added.join(' ')} hue ${hs.hue.toFixed(0)} sat ${hs.sat.toFixed(2)}`);
              }
            }
        expect(checked, beat).toBeGreaterThan(20);
        expect(off, `${beat}: ${checked} px checked, off: ${bad.join('; ')}`).toBe(0);
      });
    }
  });
}

// The re-skin's Task 1c (docs/specs/2026-10-09-act-2-reskin.md §4.1): the neighbourhood from afar,
// "Dissolve (late)". At the galaxy wides the 30 stars are not drawn as themselves: the background star
// pulled onto each system's spot stands there (the far sets: one per system, a binary's on its
// barycentre since Task 1e), and the real star comes in by its plain glow over HOOD_LOD.glowPx.
// __motes.hoodLod() is each star's glow, real share, far share and place on screen, and its system's
// spot on screen.

const hoodLod = (page: Page) => page.evaluate(() => (window as unknown as { __motes: Hook }).__motes.hoodLod()!);

/** How many pixels within `r` px of (x, y) are lit in `mask` (litMask). */
function litNear(png: PNG, mask: Uint8Array, x: number, y: number, r: number): number {
  let n = 0;
  for (let yy = Math.floor(y - r); yy <= Math.ceil(y + r); yy++)
    for (let xx = Math.floor(x - r); xx <= Math.ceil(x + r); xx++) {
      if (xx < 0 || yy < 0 || xx >= png.width || yy >= png.height) continue;
      if (Math.hypot(xx + 0.5 - x, yy + 0.5 - y) <= r && mask[yy * png.width + xx]) n++;
    }
  return n;
}

for (const size of SIZES) {
  test.describe(`the neighbourhood’s dissolve at ${size.width}x${size.height}`, () => {
    test.use({ viewport: { width: size.width, height: size.height } });
    // Each test here ends with a readback, which waits for the GPU: the frames it queued are its own
    // time, not the next test's. The dissolve's walk (31 scroll-and-settle steps at full budget, no
    // readback) left about 1.6 min of GPU work queued, and with tests interleaved the next test in the
    // worker (a looks.spec.ts one) waited it out past its 2 min timeout.
    test.afterEach(async ({ page }) => {
      await canvasShot(page);
    });

    test('the neighbourhood dissolves at the wides and is whole at the hood', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      // real + far is 1 for every star: a binary's two dissolve at their barycentre, where the pair's one
      // far star stands (Task 1e), so they share its hand-over.
      const sums = (spots: { real: number; far: number }[], where: string) => {
        for (const [k, s] of spots.entries()) expect(Math.abs(s.real + s.far - 1), `${where} spot ${k}: real ${s.real}, far ${s.far}`).toBeLessThan(1e-6);
      };

      // The galaxy wide: every spot's real share 0 (its glow under HOOD_LOD's 11 px), its far form whole.
      await openShot(page, 'galaxyWide', errors);
      const wide = await hoodLod(page);
      expect(wide).toHaveLength(30);
      for (const [k, s] of wide.entries()) {
        expect(s.glowPx, `spot ${k}`).toBeLessThan(HOOD_LOD.glowPx[0]);
        expect(s.real, `spot ${k}`).toBe(0);
      }
      sums(wide, 'galaxyWide');
      // The stars' own draws light nothing at the spots (the planets', moons' and tracks' held off, so
      // only the stars are left in these meshes: the core's bodies draw nothing since the re-skin's Task 5)...
      for (const el of [LodElement.PlanetPoint, LodElement.PlanetShell, LodElement.Moon, LodElement.Track]) await call(page, 'forceLod', el, 0);
      await call(page, 'isolate', ['net-glow', 'net-shells', 'net-spikes']);
      let png = PNG.sync.read(await canvasShot(page));
      let mask = litMask(png, 0);
      const onScreen = wide.filter((s) => s.x >= 0 && s.y >= 0 && s.x < size.width && s.y < size.height);
      expect(onScreen.length).toBeGreaterThanOrEqual(25);
      for (const s of onScreen) expect(litNear(png, mask, s.x, s.y, 8), `the real star at ${s.x.toFixed(1)}, ${s.y.toFixed(1)}`).toBe(0);
      // ...and the far sets light every system's spot on screen (a binary's barycentre: one star from
      // afar, between its two), and nothing away from the spots.
      const spots = [...new Map(wide.map((s) => [s.unit, s])).values()];
      expect(spots.length).toBeLessThan(wide.length);
      const spotsOnScreen = spots.filter((s) => s.sx >= 0 && s.sy >= 0 && s.sx < size.width && s.sy < size.height);
      await call(page, 'isolate', ['galaxy-far-stars', 'galaxy-far-bright']);
      png = PNG.sync.read(await canvasShot(page));
      mask = litMask(png, 0);
      for (const s of spotsOnScreen) expect(litNear(png, mask, s.sx, s.sy, 2), `the far star at ${s.sx.toFixed(1)}, ${s.sy.toFixed(1)}`).toBeGreaterThan(0);
      let stray = 0;
      for (let i = 0; i < mask.length; i++) {
        if (!mask[i]) continue;
        const [x, y] = [(i % png.width) + 0.5, Math.floor(i / png.width) + 0.5];
        if (!spots.some((s) => Math.hypot(x - s.sx, y - s.sy) <= 4)) stray++;
      }
      expect(stray, 'far-set pixels away from every spot').toBe(0);

      // fr-1, the essay's galaxy wide: the far form only.
      await openPlace(page, ...FR_1);
      const fr1 = await hoodLod(page);
      for (const [k, s] of fr1.entries()) expect(s.real, `fr-1 spot ${k}`).toBe(0);
      sums(fr1, 'fr-1');

      // The hood shot: every star whole, its far form gone.
      await openShot(page, 'hood', errors);
      const hood = await hoodLod(page);
      for (const [k, s] of hood.entries()) expect(s.real, `hood spot ${k}`).toBe(1);
      sums(hood, 'hood');
      // A binary's stars are among them, each whole at its own place, off its barycentre.
      const binary = hood.filter((s) => hood.filter((o) => o.unit === s.unit).length === 2);
      expect(binary.length).toBeGreaterThanOrEqual(2);
      for (const s of binary) expect(Math.hypot(s.x - s.sx, s.y - s.sy)).toBeGreaterThan(5);
      for (const s of hood) if (!binary.includes(s)) expect([s.x, s.y]).toEqual([s.sx, s.sy]);

      // Along the zoom-out's pull (zoom-out 0.40 to 1, every 1/50 of the section), as the camera recedes:
      // no spot's real share ever rises, and real + far is 1 at every sample.
      await openPlace(page, 'zoom-out', 0.4);
      const span = (await readSpans(page)).find((x) => x.id === 'zoom-out')!;
      let last: number[] | null = null;
      let fell = 0;
      for (let k = 20; k <= 50; k++) {
        const l = k / 50;
        await page.evaluate((y) => window.scrollTo(0, y), await targetScrollY(page, span.start + l * (span.end - span.start)));
        await settle(page);
        const at = await hoodLod(page);
        sums(at, `zoom-out@${l}`);
        if (last !== null)
          for (const [i, s] of at.entries()) {
            expect(s.real, `zoom-out@${l} spot ${i}`).toBeLessThanOrEqual(last[i] + 1e-9);
            if (s.real < last[i]) fell++;
          }
        last = at.map((s) => s.real);
      }
      // It does hand over on the way: whole near the start of the pull, the far form only by its end.
      expect(fell).toBeGreaterThan(0);
      expect(last!.every((r) => r === 0)).toBe(true);
      expect(errors).toEqual([]);
    });

    test('a binary star goes round its barycentre: at the hood probe riding the turn, 60 s apart, each star moves about its barycentre as the twin has it, and a single star sits at its spot', async ({ page }) => {
      // Re-skin Task 1e. The probe tracks the neighbourhood's middle and rides the galaxy's turn, as every
      // Act II shot does, so the galaxy stands still on screen and only an orbit moves a star off its spot.
      // (Not riding, every off-spot star swings with the turn: a pair frozen in the galaxy's frame moved
      // 19 px in 60 s on a phone, more than the real pair, since its orbit and the galaxy's counter-turn
      // nearly cancel. Riding, the frozen pair moves 0.)
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const g = generateGalaxy(MOTE_SEED, galaxyTier(size.width, size.height), galaxyBudget(MOTE_BUDGET_DESKTOP));
      const data = dataOf(g);
      const shot = { ...GALAXY_SHOTS.hood, ridesTurn: true };
      const net = { show: 1, growth: 1, lamp: shot.lamp, lampAt: trackIndex(shot.target) };
      const state = encodeURIComponent(JSON.stringify({ camera: galaxyShotKeys(shot, g), net }));
      const at = async (ambient: number) => {
        await openStage(page, `&mech=bike&state=${state}&ambient=${ambient}`);
        await page.waitForFunction(() => (window as unknown as { __motes: Hook }).__motes.lod() !== null);
        await settle(page);
        // The TS twin: each star where the page's camera at this ambient projects it.
        const camera = galaxyShotCamera(shot, g, data, size, ambient);
        const twin = g.systems.map((row) => {
          const w = bodyWorld(data, row, ambient);
          const v = new Vector3(w[0], w[1], w[2]).project(camera);
          return [((v.x + 1) / 2) * size.width, ((1 - v.y) / 2) * size.height];
        });
        return { hood: await hoodLod(page), twin };
      };
      const [a, b] = [await at(0), await at(60)];
      let binaries = 0;
      a.hood.forEach((s, k) => {
        const e = b.hood[k];
        // The page draws each star where the twin puts it, at both ambients.
        for (const [h, t] of [
          [s, a.twin[k]],
          [e, b.twin[k]],
        ] as const)
          expect(Math.hypot(h.x - t[0], h.y - t[1]), `star ${k}: page against twin`).toBeLessThan(1);
        const moved = Math.hypot(s.x - s.sx - (e.x - e.sx), s.y - s.sy - (e.y - e.sy));
        if (a.hood.filter((o) => o.unit === s.unit).length === 2) {
          binaries++;
          // About a twentieth of seed 1's pair's 1,290 s period: each star moves well over 5 px on either screen.
          expect(moved, `star ${k}: about its barycentre`).toBeGreaterThan(5);
        } else expect(moved, `star ${k}: a single star is its system's spot`).toBe(0);
      });
      expect(binaries).toBeGreaterThanOrEqual(2);
      expect(errors).toEqual([]);
    });

    test('the beats whose shots name the neighbourhood hold it whole: ly-3, up-2, tr-1, the surge, fx-3, fx-4 and ls-1 draw all 30 stars as themselves', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      // Each at the middle of its hold (the stills' places). Held by net.hoodHold whatever the band says:
      // up-2 on a desktop and fx-3 on either screen stand under 16 px of glow.
      for (const [name, section, local] of [
        ['ly-3', 'layers', 2.35 / 4.3],
        ['up-2', 'spread', 2.124 / 2.808],
        // tr-1 and tr-2's surge back out to its wide, lamped on R0's lineage (Task 1d, the controller's
        // ruling: tr-1 stood 0.18 real on a phone), and fx-4, which holds fx-3's shot.
        ['tr-1', 'trace', 0.2],
        ['tr-2 surge', 'trace', 0.82],
        ['fx-3', 'fix', 0.55],
        ['fx-4', 'fix', 0.8],
        ['ls-1', 'lesson', 0.5],
      ] as const) {
        await openPlace(page, section, local);
        const at = await hoodLod(page);
        expect(at, name).toHaveLength(30);
        for (const [k, s] of at.entries()) {
          expect(s.real, `${name} spot ${k}: real ${s.real}, glow ${s.glowPx}`).toBe(1);
          expect(s.far, `${name} spot ${k}`).toBe(0);
        }
      }
      expect(errors).toEqual([]);
    });
  });
}
