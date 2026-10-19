import { PerspectiveCamera, Vector3, type Mesh, type RawShaderMaterial, type Vector2 } from 'three';
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
import { holeComp, STRANDS } from './holeLook';
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

  it('keys the story (re-skin §4.2, §5): each strand’s window, heat and gain, the knots’ fronts, the other parts’ gains', () => {
    const uniform = (name: string, u: string) => ((hole.object.getObjectByName(name) as Mesh).material as RawShaderMaterial).uniforms[u].value;
    const strandOf = (name: string) => (uniform(name, 'uStrand') as Vector2).toArray();
    for (const [holeLamp, single, heat0, strand1, cool1, knots, knotsOff] of [
      [0, 0, 0, 0, 0, 0, 0],
      [1, 0, 0, 0, 0, 0, 0],
      [0.4, 0.7, 0.3, 0.6, 0.2, 0.9, 0.1],
      [0, 1, 1, 1, 0, 1, 0],
      [0, 0, 0, 1, 1, 1, 1],
    ]) {
      const s = lit(Lamp.Core, { core: true }, { holeLamp, single, heat0, strand1, cool1, knots, knotsOff });
      hole.update(s, camera, viewport, AMBIENT_POSE);
      const f = holeFrame(s, g, data, camera, PHONE, AMBIENT_POSE);
      const where = JSON.stringify({ holeLamp, single, heat0, strand1, cool1, knots, knotsOff });
      const lift = 1 + 0.3 * holeLamp;
      // R0's strand: its whole window, heat net.heat0, × (1 + 0.3 lamp)(1 + 0.9 single).
      expect(strandOf('hole-strand-r0'), where).toEqual([STRANDS[0].lstr, heat0]);
      expect(gainOf('hole-strand-r0'), where).toBeCloseTo(f.gain * lift * (1 + 0.9 * single), 12);
      // R1's strand: its window grown by net.strand1, heat 1 − net.cool1, × (1 + 0.3 lamp)(1 − 0.72 single).
      expect(strandOf('hole-strand-r1')[0], where).toBeCloseTo(strand1 * STRANDS[1].lstr, 12);
      expect(strandOf('hole-strand-r1')[1], where).toBeCloseTo(1 - cool1, 12);
      expect(gainOf('hole-strand-r1'), where).toBeCloseTo(f.gain * lift * (1 - 0.72 * single), 12);
      // Every other part × (1 + 0.3 lamp)(1 − 0.72 single); the knots' fronts are (net.knots, net.knotsOff).
      for (const name of ['hole-disk', 'hole-arch', 'hole-ring', 'hole-jets', 'hole-knots', 'hole-infall'])
        expect(gainOf(name), `${where} ${name}`).toBeCloseTo(f.gain * lift * (1 - 0.72 * single), 12);
      expect((uniform('hole-knots', 'uFronts') as Vector2).toArray(), where).toEqual([knots, knotsOff]);
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
    expect(f.gain, 'the area rule: (diskPx / 80)²').toBeCloseTo((f.diskPx / 80) ** 2, 12);
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

  it('writes the shadow only while it is drawn: none while its group is hidden, though the hole is up, shown and in front', () => {
    // The pre-publish judge's find: desktop zo-2 and ly-4 had the shadow's mask with the hole unlit.
    const centre = new Vector3(...galacticToWorld(data, [0, 0, 0], AMBIENT_POSE));
    const away = new PerspectiveCamera(40, PHONE.width / PHONE.height, 0.1, 4000);
    away.position.copy(centre).add(new Vector3(0, 0, 300));
    away.lookAt(centre.clone().add(new Vector3(300 * Math.sin(Math.PI / 3), 0, 300 - 300 * Math.cos(Math.PI / 3))));
    away.updateMatrixWorld();
    const hidden: [string, SceneState, PerspectiveCamera][] = [
      ['unlit under Arms', lit(Lamp.Arms), camera],
      ['unlit under Planet', lit(Lamp.Planet, { body: 'C1' }), camera],
      ['unlit under Star', lit(Lamp.Star, { body: 'P_a' }), camera],
      ['off the screen', lit(Lamp.Off), away],
    ];
    for (const [name, s, cam] of hidden) {
      const f = holeFrame(s, g, data, cam, PHONE, AMBIENT_POSE);
      expect([f.present, f.front], `${name}: the hole is up, shown and in front`).toEqual([1, true]);
      // A shadow written by the frame before must not survive into this one.
      hole.update(lit(Lamp.Core), camera, viewport, AMBIENT_POSE);
      expect(shadow.value.z, name).toBeGreaterThan(10);
      hole.update(s, cam, viewport, AMBIENT_POSE);
      expect(hole.object.visible, name).toBe(false);
      expect(shadow.value.z, `${name}: the shadow's radius`).toBe(0);
    }
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
