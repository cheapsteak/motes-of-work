import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { PNG } from 'pngjs';
import { Vector3 } from 'three';
import { AMBIENT_POSE } from '../src/galaxy/ambient';
import { mechanismAnchors } from '../src/mechanisms/anchors';
import { mechanisms } from '../src/mechanisms';
import { createEssayCamera } from '../src/scene/cameraRig';
import { reflowBodies } from '../src/scene/mote/mote';
import { KeyframeSampler, type KeyframeFile } from '../src/timeline/keyframeSampler';
import { composeEssayCamera } from '../src/timeline/netTrack';
import { canvasShot, openStage, readSpans } from './helpers';
import { galaxyOf } from '../src/scene/node/galaxyOnScreen';

// The bike's planet and its seven moons as the reflow lands them (Task 8 fix round 1, ruling B): a
// small moon takes the motes of a whole part, so left alone it heaps them into a white blot brighter
// than the planet. The reflow keeps of each moon's motes only the planet's density (mote.ts
// reflowKeep). Measured on the essay's own frame, at its default budget, at zoom-out 0.25 (gathering)
// and 0.40 (landed, the galaxy's own shells coming up under them): no moon's mean brightness over its
// disc on screen exceeds the planet's.

test.setTimeout(240_000);

// Read, not imported: Playwright's loader wants an import attribute on JSON that the app build does not.
const keyframes = JSON.parse(readFileSync(new URL('../src/timeline/keyframes.json', import.meta.url), 'utf8')) as KeyframeFile;

const SIZES = [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
] as const;
/** The disc a body's brightness is read over: this share of its radius on screen, clear of its limb. */
const INNER = 0.8;
/**
 * A disc smaller than this radius (CSS px) on screen is too few pixels to read; it is left out: under
 * it one hero mote's large sprite (instance.glsl: 2 % of the human motes, 4 % of the dialogue's) is
 * most of the disc, so its mean reads a single sprite, not the moon. The saddle's moon is under it.
 */
const MIN_RADIUS_PX = 6;

for (const size of SIZES) {
  for (const local of [0.25, 0.4]) {
    test(`at zoom-out ${local}, ${size.width}x${size.height}: no moon of the bike’s planet is brighter than the planet`, async ({
      page,
    }) => {
      await page.setViewportSize(size);
      await openStage(page, '&mech=bike&n=500');
      const spans = await readSpans(page);
      const span = spans.find((s) => s.id === 'zoom-out')!;
      const p = span.start + local * (span.end - span.start);
      await openStage(page, `&mech=bike&p=${p}`);
      const shot = await canvasShot(
        page,
        process.env.SHOTS ? `shots/galaxy/T8-reflow-${local.toFixed(2)}-${size.width}x${size.height}.png` : undefined,
      );
      const { width, height, data } = PNG.sync.read(shot);
      expect([width, height]).toEqual([size.width, size.height]);

      const s = new KeyframeSampler(keyframes, spans).sample(p);
      const { g, data: bodyData } = galaxyOf();
      const camera = createEssayCamera(width / height);
      composeEssayCamera(camera, s, mechanismAnchors(mechanisms.bike), { g, data: bodyData }, AMBIENT_POSE);
      camera.updateMatrixWorld();
      const eye = camera.getWorldPosition(new Vector3());
      const focal = 0.5 * height * camera.projectionMatrix.elements[5];
      const discs = reflowBodies(g, bodyData, AMBIENT_POSE).map((b) => {
        const c = new Vector3(b[0], b[1], b[2]);
        const r = (b[3] * focal) / c.distanceTo(eye);
        const q = c.clone().project(camera);
        return { x: ((q.x + 1) / 2) * width, y: ((1 - q.y) / 2) * height, r };
      });
      const mean = (k: number): number | null => {
        const d = discs[k];
        if (d.r < MIN_RADIUS_PX) return null;
        // A disc another body's overlaps is not this body's alone.
        if (discs.some((o, j) => j !== k && Math.hypot(o.x - d.x, o.y - d.y) < o.r + d.r)) return null;
        let sum = 0;
        let n = 0;
        const ri = INNER * d.r;
        for (let y = Math.floor(d.y - ri); y <= Math.ceil(d.y + ri); y++) {
          for (let x = Math.floor(d.x - ri); x <= Math.ceil(d.x + ri); x++) {
            if (x < 0 || y < 0 || x >= width || y >= height || Math.hypot(x + 0.5 - d.x, y + 0.5 - d.y) > ri) continue;
            const i = (y * width + x) * 4;
            sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
            n++;
          }
        }
        return sum / n;
      };
      const planet = mean(0);
      expect(planet, 'the planet is read').not.toBeNull();
      // Not a blank frame: the planet stands well off the stage's background (#0B0D12, about 14).
      expect(planet!).toBeGreaterThan(30);
      const moons = [1, 2, 3, 4, 5, 6, 7].map((k) => ({ k, m: mean(k) })).filter((x) => x.m !== null);
      expect(moons.length, `moons read: ${JSON.stringify(discs.map((d) => d.r.toFixed(1)))}`).toBeGreaterThanOrEqual(4);
      const read = moons.map(({ k, m }) => `${k}:${m!.toFixed(1)}/r${discs[k].r.toFixed(1)}`).join(' ');
      console.log(`zoom-out ${local} ${size.width}: planet ${planet!.toFixed(1)} r ${discs[0].r.toFixed(1)}; moons ${read}`);
      for (const { k, m } of moons) expect(m!, `moon ${k} against the planet's ${planet!.toFixed(1)}`).toBeLessThanOrEqual(planet!);
    });
  }
}
