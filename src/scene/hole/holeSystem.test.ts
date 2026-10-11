import { PerspectiveCamera, Vector3, type Mesh, type RawShaderMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { MOTE_BUDGET_DESKTOP, MOTE_SEED } from '../../config';
import { AMBIENT_POSE } from '../../galaxy/ambient';
import { HOLE_DOTS } from '../../galaxy/hole';
import { bodyIndex, galaxyBudget, generateGalaxy } from '../../galaxy/generate';
import { GALAXY_SHOTS, galaxyShotCamera, HOLE_CLOSE } from '../../timeline/netShots';
import { Lamp, trackIndex } from '../../timeline/netTrack';
import { defaultSceneState, type SceneState } from '../../timeline/sceneState';
import { packBodyData } from '../node/bodyData';
import { bodyPresence } from '../node/bodyMote';
import { galacticToWorld } from '../node/orbit';
import { HOLE_PARTS, holeFrame } from './holeFrame';
import { holeComp } from './holeLook';
import { createHoleSystem } from './holeSystem';

const g = generateGalaxy(MOTE_SEED, 'phone', galaxyBudget(MOTE_BUDGET_DESKTOP));
const data = packBodyData(g);
const shadow = { value: new Vector3() };
const hole = createHoleSystem(g, data, shadow);
const PHONE = { width: 390, height: 844 };
const viewport = { ...PHONE, pixelRatio: 1 };
const camera = galaxyShotCamera(HOLE_CLOSE, g, data, PHONE, AMBIENT_POSE);

/** The story's leaves with the galaxy up and built, under `lamp` on `on`. */
function lit(lamp: Lamp, on: Parameters<typeof trackIndex>[0] = { core: true }, net: Partial<SceneState['net']> = {}): SceneState {
  const s = defaultSceneState();
  s.net = { ...s.net, show: 1, growth: 1, lamp, lampAt: trackIndex(on), ...net };
  return s;
}

const meshes = () => hole.object.children as Mesh[];
const gainOf = (name: string) => ((hole.object.getObjectByName(name) as Mesh).material as RawShaderMaterial).uniforms.uGain.value as number;

describe('the hole drawn', () => {
  it('draws HOLE_DOTS’s counts, one quad a dot, each part its own mesh', () => {
    expect(hole.counts).toEqual({
      disk: HOLE_DOTS.disk,
      arch: HOLE_DOTS.arch,
      ring: HOLE_DOTS.ring,
      jets: 2 * HOLE_DOTS.jetsPerSide,
      knots: 2 * HOLE_DOTS.knotSlots * HOLE_DOTS.knotDots,
      infall: HOLE_DOTS.infallSlots * HOLE_DOTS.infallTrail,
      strand0: HOLE_DOTS.strand0,
      strand1: HOLE_DOTS.strand1,
    });
    expect(Object.values(hole.counts).reduce((n, c) => n + c, 0)).toBe(g.instances.hole);
    expect(meshes().map((m) => m.name)).toEqual(HOLE_PARTS.map((p) => p.name));
    for (const m of meshes()) expect(m.geometry.getAttribute('aCorner').count, m.name).toBe(4);
    // The arch is the disk's first HOLE_DOTS.arch dots again, through image 1.
    const disk = hole.object.getObjectByName('hole-disk') as Mesh;
    const arch = hole.object.getObjectByName('hole-arch') as Mesh;
    expect(arch.geometry.getAttribute('aHoleA')).toBe(disk.geometry.getAttribute('aHoleA'));
  });

  it('is lit where the core is: 1 under lamps Off, Hood, Core and Lineage, 0 under Arms, Planet and Star', () => {
    const cases: [Lamp, Parameters<typeof trackIndex>[0], number][] = [
      [Lamp.Off, { core: true }, 1],
      [Lamp.Hood, { hood: true }, 1],
      [Lamp.Core, { core: true }, 1],
      [Lamp.Lineage, { body: 'R0' }, 1],
      [Lamp.Arms, { core: true }, 0],
      [Lamp.Planet, { body: 'C1' }, 0],
      [Lamp.Star, { body: 'P_a' }, 0],
    ];
    for (const [lamp, on, want] of cases) {
      const s = lit(lamp, on);
      hole.update(s, camera, viewport, AMBIENT_POSE);
      const f = holeFrame(s, g, data, camera, PHONE, AMBIENT_POSE);
      expect(f.diskPx, 'the close shot is past the small hole').toBeGreaterThan(80);
      expect(f.gain, `lamp ${lamp}`).toBe(want);
      expect(hole.object.visible, `lamp ${lamp}`).toBe(want > 0);
      // Each part at the hole's gain; its compensation applies after the per-dot clamp (holeComp).
      if (want > 0) for (const p of HOLE_PARTS) expect(gainOf(p.name), p.name).toBe(want);
      if (want > 0)
        for (const p of HOLE_PARTS)
          expect(((hole.object.getObjectByName(p.name) as Mesh).material as RawShaderMaterial).uniforms.uComp.value.x).toBe(holeComp(p.key).gain);
    }
  });

  it('is up with R0’s build: 0 before it, and hidden at net.show 0', () => {
    const r0 = bodyIndex(g, 'R0');
    let growth = 0;
    while (bodyPresence(r0, growth, data) > 0) growth -= 0.01;
    hole.update(lit(Lamp.Core, { core: true }, { growth }), camera, viewport, AMBIENT_POSE);
    expect(hole.object.visible).toBe(false);
    expect(shadow.value.z).toBe(0);
    hole.update(lit(Lamp.Core, { core: true }, { show: 0 }), camera, viewport, AMBIENT_POSE);
    expect(hole.object.visible).toBe(false);
    expect(shadow.value.z).toBe(0);
    hole.update(lit(Lamp.Core), camera, viewport, AMBIENT_POSE);
    expect(hole.object.visible).toBe(true);
    expect(shadow.value.z).toBeGreaterThan(10);
  });

  it('dims at the galaxy wide (the small hole), and its parts skip whole when it is off screen', () => {
    const wide = galaxyShotCamera(GALAXY_SHOTS.galaxyWide, g, data, PHONE, AMBIENT_POSE);
    const f = holeFrame(lit(Lamp.Off), g, data, wide, PHONE, AMBIENT_POSE);
    expect(f.diskPx).toBeLessThan(24);
    expect(f.gain).toBeCloseTo(0.35, 9);
    // A camera 300 off the hole, looking 60° away from it: the hole is in front, far off the screen's side.
    const centre = new Vector3(...galacticToWorld(data, [0, 0, 0], AMBIENT_POSE));
    const away = new PerspectiveCamera(40, PHONE.width / PHONE.height, 0.1, 4000);
    away.position.copy(centre).add(new Vector3(0, 0, 300));
    away.lookAt(centre.clone().add(new Vector3(300 * Math.sin(Math.PI / 3), 0, 300 - 300 * Math.cos(Math.PI / 3))));
    away.updateMatrixWorld();
    hole.update(lit(Lamp.Off), away, viewport, AMBIENT_POSE);
    expect(holeFrame(lit(Lamp.Off), g, data, away, PHONE, AMBIENT_POSE).skip).toBe(true);
    expect(hole.object.visible).toBe(false);
  });

  it('writes the shared shadow uniform, and says which side the disk approaches on', () => {
    hole.update(lit(Lamp.Core), camera, viewport, AMBIENT_POSE);
    const f = holeFrame(lit(Lamp.Core), g, data, camera, PHONE, AMBIENT_POSE);
    expect(shadow.value.x).toBeCloseTo(f.x, 6);
    expect(shadow.value.y).toBeCloseTo(PHONE.height - f.y, 6);
    for (const m of meshes()) expect((m.material as RawShaderMaterial).uniforms.uShadow, m.name).toBe(shadow);
    expect([-1, 1]).toContain(hole.approach());
    expect(hole.approach()).toBe(f.approach);
  });
});
