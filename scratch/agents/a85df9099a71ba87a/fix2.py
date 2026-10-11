p='e2e/galaxy.spec.ts'
s=open(p).read()
s=s.replace("""import { PNG } from 'pngjs';
""","""import { PNG } from 'pngjs';
import { PerspectiveCamera, Vector3 } from 'three';
""",1)
s=s.replace("""import { galaxyBudget, generateGalaxy } from '../src/galaxy/generate';""","""import { galaxyBudget, generateGalaxy, systemOuter } from '../src/galaxy/generate';
import { mechanismAnchors } from '../src/mechanisms/anchors';
import { mechanisms } from '../src/mechanisms';
import { applyCamera } from '../src/scene/cameraRig';
import { packBodyData } from '../src/scene/node/bodyData';
import { bodyWorld } from '../src/scene/node/orbit';
import { GALAXY_SHOTS, galaxyShotKeys } from '../src/timeline/galaxyShots';
import { defaultSceneState, mergeState } from '../src/timeline/sceneState';""")
s=s.replace("""import { FULL_DETAIL_MAX, LodElement, systemPx } from '../src/scene/node/lod';""","""import { FULL_DETAIL_MAX, LOD_BANDS, LodElement, systemPx } from '../src/scene/node/lod';""")

anchor="""    test('the galaxy keeps within its budget', async ({ page }) => {"""
add="""    test('a system held under full detail draws no moon or track mote', async ({ page }) => {
      // At the system and twelve shots more systems than FULL_DETAIL_MAX are full size on screen, and
      // all but two are held just under full detail (lod.ts detailPx). Forcing the moons, tracks and
      // derps off may change pixels only inside the systems the page reports at full detail: their
      // projected outer discs, from the essay's camera at this size.
      const full = LOD_BANDS[LodElement.Moon][0];
      const g = generateGalaxy(MOTE_SEED, galaxyTier(size.width, size.height), galaxyBudget(MOTE_BUDGET_DESKTOP));
      const data = packBodyData(g);
      for (const shot of ['system', 'twelve'] as const) {
        await openShot(page, shot);
        const { sysPx } = await lod(page);
        const camera = new PerspectiveCamera(40, size.width / size.height, 0.1, 4000);
        applyCamera(camera, mergeState(defaultSceneState(), { camera: galaxyShotKeys(GALAXY_SHOTS[shot], g, 0) }), mechanismAnchors(mechanisms.bike), { compose: true });
        camera.updateMatrixWorld();
        const focal = 0.5 * size.height * camera.projectionMatrix.elements[5];
        const discs = g.systems.map((row, i) => {
          const p = new Vector3(...bodyWorld(data, row, 0));
          const d = p.distanceTo(camera.position);
          p.project(camera);
          const x = ((p.x + 1) / 2) * size.width;
          const y = ((1 - p.y) / 2) * size.height;
          const r = systemPx(systemOuter(g, row), d, focal);
          return { x, y, r, full: sysPx[i] >= full, inFrame: p.z < 1 && x > 0 && x < size.width && y > 0 && y < size.height };
        });
        // The case is real: a system on the frame is full size but held.
        expect(discs.some((c) => c.inFrame && !c.full && c.r >= full), `${shot}: a held system in frame`).toBe(true);
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
          if (!discs.some((c) => c.full && Math.hypot(x - c.x, y - c.y) <= 1.05 * c.r + 2)) outside++;
        }
        expect(changed, `${shot}: the full systems draw moons and tracks`).toBeGreaterThan(0);
        expect(outside, `${shot}: pixels of moons or tracks outside the full systems`).toBe(0);
      }
    });

"""
assert anchor in s; s=s.replace(anchor, add+anchor)
open(p,'w').write(s)
