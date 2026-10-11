import { PerspectiveCamera, Vector3, type Mesh, type RawShaderMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { MOTE_BUDGET_DESKTOP, MOTE_SEED } from '../../config';
import { BG, pullToHood, type Tier } from '../../galaxy/background';
import { galaxyBudget, generateGalaxy } from '../../galaxy/generate';
import { packBodyData } from '../node/bodyData';
import { bodyGalactic, galacticToWorld } from '../node/orbit';
import { defaultSceneState, mergeState } from '../../timeline/sceneState';
import { NODE_PALETTE } from '../node/birth';
import { AMBIENT_POSE } from '../../galaxy/ambient';
import { GALAXY_SHOTS, galaxyShotCamera } from '../../timeline/netShots';
import { HOOD_LOD } from '../node/lod';
import { BG_STAR_SIZE, createGalaxySystem, glslRgb, HAZE, STAR_TINT, STAR_VERTEX } from './galaxySystem';
import starVert from './shaders/star.vert.glsl?raw';

const VIEWPORT = { width: 390, height: 844, pixelRatio: 1 };

type System = ReturnType<typeof createGalaxySystem>;
/** A set's material, by its mesh's name. */
const material = (system: System, name: string): RawShaderMaterial => (system.object.getObjectByName(name) as Mesh).material as RawShaderMaterial;
/** A set's instance data (its aStar), by its mesh's name. */
const instanceData = (system: System, name: string): Float32Array => (system.object.getObjectByName(name) as Mesh).geometry.getAttribute('aStar').array as Float32Array;

describe.each(['phone', 'desktop'] as Tier[])('the background galaxy (%s)', (tier) => {
  const g = generateGalaxy(MOTE_SEED, tier, galaxyBudget(MOTE_BUDGET_DESKTOP));
  const data = packBodyData(g);
  const spots = g.units.map((i) => g.bodies[i].spot!);
  const shadow = { value: new Vector3() };
  const system = createGalaxySystem(g.background, spots, (t) => bodyGalactic(data, data.n0Row, t), shadow);
  const shown = mergeState(defaultSceneState(), { net: { show: 1 } });

  it('reads the shadow’s one shared uniform in every set, so the background never lights the shadow (re-skin §4.2)', () => {
    for (const m of system.object.children) expect(((m as Mesh).material as RawShaderMaterial).uniforms.uShadow, m.name).toBe(shadow);
  });

  it('draws the tier’s counts exactly: its stars (the bright among them apart), its dust, one haze', () => {
    expect(system.counts.stars + system.counts.bright).toBe(BG.stars[tier]);
    expect(system.counts.bright).toBe(Math.round(BG.brightShare * BG.stars[tier]));
    expect(system.counts.dust).toBe(BG.dust[tier]);
    expect(system.counts.haze).toBe(1);
    // Six sets: a star or a bright star pulled onto a neighbourhood spot (pullToHood) moves to its far
    // set, so each class's two sets hold the generator's count between them.
    const instances = Object.fromEntries(system.object.children.map((m) => [m.name, (m as unknown as { geometry: { instanceCount: number } }).geometry.instanceCount]));
    const pull = pullToHood(g.background, spots);
    expect(instances).toEqual({
      'galaxy-haze': 1,
      'galaxy-dust': system.counts.dust,
      'galaxy-stars': pull.stars.length / 4,
      'galaxy-bright': pull.bright.length / 4,
      'galaxy-far-stars': pull.farStars.length / 4,
      'galaxy-far-bright': pull.farBright.length / 4,
    });
    expect(instances['galaxy-stars'] + instances['galaxy-far-stars']).toBe(system.counts.stars);
    expect(instances['galaxy-bright'] + instances['galaxy-far-bright']).toBe(system.counts.bright);
    // One far star per unit: a binary's at its barycentre, so from afar a pair is one star.
    expect(instances['galaxy-far-stars'] + instances['galaxy-far-bright']).toBe(g.units.length);
    expect(g.units.length).toBeLessThan(g.systems.length);
  });

  it('draws the neighbourhood’s far form: the pulled rows at their spots, each at its class’s size, fading with its spot’s real star', () => {
    const pull = pullToHood(g.background, spots);
    expect(Array.from(instanceData(system, 'galaxy-far-stars'))).toEqual(Array.from(pull.farStars));
    expect(Array.from(instanceData(system, 'galaxy-far-bright'))).toEqual(Array.from(pull.farBright));
    expect(Array.from(instanceData(system, 'galaxy-stars'))).toEqual(Array.from(pull.stars));
    expect(Array.from(instanceData(system, 'galaxy-bright'))).toEqual(Array.from(pull.bright));
    for (const [name, size] of [
      ['galaxy-stars', BG_STAR_SIZE.star],
      ['galaxy-far-stars', BG_STAR_SIZE.star],
      ['galaxy-bright', BG_STAR_SIZE.bright],
      ['galaxy-far-bright', BG_STAR_SIZE.bright],
    ] as const) {
      const u = material(system, name).uniforms;
      expect([u.uSizeWorld.value, u.uMinPx.value, u.uMaxPx.value], name).toEqual([size.world, ...size.px]);
      // Only the far sets fade (star.vert.glsl's uHoodFar).
      expect(u.uHoodFar.value, name).toBe(name.includes('far') ? 1 : 0);
    }
    for (const name of ['galaxy-haze', 'galaxy-dust']) expect(material(system, name).uniforms.uHoodFar.value, name).toBe(0);
    // A beat's hold (net.hoodHold) reaches every set's shader, while HOOD_LOD.beatsHold says so.
    const camera = new PerspectiveCamera(40, 390 / 844, 0.1, 4000);
    for (const hold of [0, 0.25, 1]) {
      system.update(mergeState(defaultSceneState(), { net: { show: 1, hoodHold: hold } }), camera, VIEWPORT, 0);
      expect(material(system, 'galaxy-far-stars').uniforms.uHoodHold.value).toBe(HOOD_LOD.beatsHold ? hold : 0);
    }
    // Each far star's share at its own place: whole at the galaxy wide, gone at the hood shot and under a whole hold.
    const shares = (shot: 'galaxyWide' | 'hood', hold: number) => {
      const view = tier === 'phone' ? VIEWPORT : { width: 1440, height: 900, pixelRatio: 1 };
      const cam = galaxyShotCamera(GALAXY_SHOTS[shot], g, data, view, AMBIENT_POSE);
      system.update(mergeState(defaultSceneState(), { net: { show: 1, hoodHold: hold } }), cam, view, AMBIENT_POSE);
      return system.farShares();
    };
    expect(shares('galaxyWide', 0)).toHaveLength(g.units.length);
    if (tier === 'phone') expect(shares('galaxyWide', 0).every((f) => f === 1)).toBe(true);
    expect(shares('hood', 0).every((f) => f === 0)).toBe(true);
    expect(shares('galaxyWide', 1).every((f) => f === 0)).toBe(true);
  });

  it('turns with the galaxy and sits where bodyWorld puts the bodies', () => {
    const camera = new PerspectiveCamera(40, 390 / 844, 0.1, 4000);
    for (const t of [0, 37.3, 600]) {
      system.update(shown, camera, VIEWPORT, t);
      for (const p of [[0, 0, 0], g.hoodCentroid, [100, 2, -40]]) {
        const got = new Vector3(...p).applyMatrix4(system.object.matrixWorld);
        const want = galacticToWorld(data, p, t);
        for (let k = 0; k < 3; k++) expect(got.getComponent(k)).toBeCloseTo(want[k], 4);
      }
    }
  });

  it('draws nothing while net.show is 0, and the haze only while net.haze is up, near or far', () => {
    const camera = new PerspectiveCamera(40, 390 / 844, 0.1, 4000);
    system.update(defaultSceneState(), camera, VIEWPORT, 0);
    expect(system.object.visible).toBe(false);
    const core = galacticToWorld(data, [0, 0, 0], 0);
    const haze = system.object.getObjectByName('galaxy-haze')!;
    // The eye's distance from the core no longer gates it (the old gate was 300 units): the story leaf does.
    for (const d of [30, 1000])
      for (const [show, up] of [
        [1, 0],
        [1, 0.4],
        [0.5, 1],
      ] as const) {
        camera.position.set(core[0], core[1] + d, core[2]);
        camera.updateMatrixWorld();
        system.update(mergeState(defaultSceneState(), { net: { show, haze: up } }), camera, VIEWPORT, 0);
        expect(system.object.visible).toBe(true);
        expect(haze.visible, `at ${d}, net.haze ${up}`).toBe(up > 0);
        // Its gain is the background's (net.show) times net.haze; every other set's is net.show alone.
        expect(material(system, 'galaxy-haze').uniforms.uGain.value, `at ${d}, net.haze ${up}`).toBeCloseTo(show * up, 12);
        for (const name of ['galaxy-dust', 'galaxy-stars', 'galaxy-bright', 'galaxy-far-stars', 'galaxy-far-bright']) expect(material(system, name).uniforms.uGain.value, name).toBe(show);
      }
  });

  it('draws the haze as one warm sprite at HAZE: a negative brightness of hazeGain, mixed fully to the warm tint, hazePx across', () => {
    const haze = material(system, 'galaxy-haze');
    expect(Array.from(instanceData(system, 'galaxy-haze'))).toEqual([0, 0, 0, Math.fround(-HAZE.hazeGain)]);
    expect(haze.uniforms.uWarmMix.value).toBe(1);
    expect([haze.uniforms.uMinPx.value, haze.uniforms.uMaxPx.value]).toEqual([HAZE.hazePx, HAZE.hazePx]);
    // The star sets (the dust with them, though no dust mote is warm) mix a warm star STAR_TINT.warmMix of the way.
    for (const name of ['galaxy-dust', 'galaxy-stars', 'galaxy-bright', 'galaxy-far-stars', 'galaxy-far-bright']) expect(material(system, name).uniforms.uWarmMix.value, name).toBe(STAR_TINT.warmMix);
  });
});

describe('the background stars\u2019 tint', () => {
  it('is the look picked in the tuner: the warm tint #FFD9A0 at 0.85; the haze 64 px at 0.35, warm', () => {
    expect(STAR_TINT).toEqual({ warm: '#FFD9A0', warmMix: 0.85 });
    expect(HAZE).toEqual({ hazePx: 64, hazeGain: 0.35, hazeWarm: 1 });
  });

  it('is spliced from NODE_PALETTE and STAR_TINT, with no copy in the shader source; the mix is each set’s uniform', () => {
    expect(starVert).not.toMatch(/const vec3 (AGENT|WARM)|WARM_MIX/);
    expect(STAR_VERTEX).toContain(`const vec3 AGENT = vec3(${glslRgb(NODE_PALETTE.NODE_AGENT)});`);
    expect(STAR_VERTEX).toContain(`const vec3 WARM = vec3(${glslRgb(STAR_TINT.warm)});`);
    expect(glslRgb('#4DA3FF')).toBe(`${77 / 255}, ${163 / 255}, 1.0`);
    expect(STAR_VERTEX).not.toContain('WARM_MIX');
    expect(STAR_VERTEX).toContain('uniform float uWarmMix;');
    expect(STAR_VERTEX).toContain('mix(AGENT, WARM, uWarmMix)');
  });
});
