// The background galaxy drawn (docs/specs/2026-10-07-galaxy-orbits.md §2.1, §4): the generated
// background (src/galaxy/background.ts) as six instanced quad sets over
// static buffers (the background never gets detail):
//   galaxy-haze        the core's one soft warm sprite (HAZE), drawn only while `net.haze` is up: the galaxy wides
//   galaxy-dust        1 px hard motes
//   galaxy-stars       star sprites, 2 px (HALO_PX.star) from afar, up to 4 px nearer (BG_STAR_SIZE)
//   galaxy-bright      star sprites, the brightest 15 %, 3 px (HALO_PX.bright) from afar, up to 6 px nearer
//   galaxy-far-stars   the neighbourhood's far form (re-skin §4.1, "Dissolve (late)"): the background
//   galaxy-far-bright  stars pulled onto the 30 spots (pullToHood), each a star or a bright star as it
//                      was, fading out as its spot's real star comes in (lod.ts hoodReal)
// The group's model matrix turns the galaxy's frame with the galaxy and anchors it at N0, as
// bodyWorld places the bodies (src/scene/node/orbit.ts), so the background and the neighbourhood
// move as one. The whole group is hidden while `net.show` is 0.
import {
  AddEquation,
  BufferAttribute,
  CustomBlending,
  GLSL3,
  Group,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Matrix4,
  Mesh,
  OneFactor,
  OneMinusSrcColorFactor,
  RawShaderMaterial,
  Vector2,
  Vector3,
  type IUniform,
  type PerspectiveCamera,
} from 'three';
import { HALO_PX, pullToHood, type Background } from '../../galaxy/background';
import type { Vec3 } from '../../math/vec';
import { hexToRgb, NODE_PALETTE } from '../node/birth';
import { hoodFar, hoodHold, PX, type Viewport } from '../node/lod';
import { galaxyTurn } from '../node/orbit';
import { splice } from '../mote/shaderSource';
import { withGalaxyLibrary } from '../node/shaderSource';
import type { SceneState } from '../../timeline/sceneState';
import { HAZE, STAR_TINT } from './spriteLook';
import starFrag from './shaders/star.frag.glsl?raw';
import starVert from './shaders/star.vert.glsl?raw';

export interface GalaxySystem {
  object: Group;
  /** The generator's counts: the stars and the bright stars each over its own set and its far set, the dust, the haze. */
  counts: { stars: number; bright: number; dust: number; haze: 1 };
  update(state: SceneState, camera: PerspectiveCamera, viewport: Viewport, ambient: number): void;
  /** The last frame's far form's share at each neighbourhood spot, in spot order (lod.ts hoodFar at its far star's own distance: star.vert.glsl's fade). */
  farShares(): number[];
  dispose(): void;
}

/**
 * The background stars' sprites by distance (Task 8 fix round 1, ruling C): a star is a sphere of this
 * world size (`world`), drawn at least at its far size (`px[0]`, HALO_PX: every galaxy wide, where §4
 * keeps the halos apart, is at it) and at most at `px[1]`. From afar the background is the crisp
 * points it was; at the zoom-out's middle distances the arm the camera rises over reads as stars,
 * not specks. CSS px; star.vert.glsl's clamp(uSizeWorld · pxPerUnit, uMinPx, uMaxPx) is bgStarPx.
 */
export const BG_STAR_SIZE = {
  star: { world: 0.7, px: [HALO_PX.star, 4] },
  bright: { world: 1, px: [HALO_PX.bright, 6] },
} as const;

/** A background star's sprite (CSS px) at `pxPerUnit` CSS px per world unit: star.vert.glsl's size. */
export function bgStarPx(set: keyof typeof BG_STAR_SIZE, pxPerUnit: number): number {
  const { world, px } = BG_STAR_SIZE[set];
  return Math.min(px[1], Math.max(px[0], world * pxPerUnit));
}

/** A background star reads as a star, not a speck, from this sprite size (CSS px): twice a far star's point. */
export const LEGIBLE_STAR_PX = 4;

// STAR_TINT and HAZE live in spriteLook.ts, which loads no GLSL, so the stars' look (classLook.ts)
// can read the warm tint under the e2e loader; this module is their home and re-exports them.
export { HAZE, STAR_TINT } from './spriteLook';

const STAR_TINT_MARKER = '// #include STAR tint (generated from src/scene/galaxy/galaxySystem.ts)';

/** A colour's three channels as GLSL float literals. */
export const glslRgb = (hex: string): string => hexToRgb(hex).map((v) => (Number.isInteger(v) ? v.toFixed(1) : String(v))).join(', ');

/** The star vertex shader's tint constants, generated from NODE_PALETTE and STAR_TINT. */
export function glslStarTint(): string {
  const vec = (hex: string) => `vec3(${glslRgb(hex)})`;
  return [
    '// The background stars\' tint, generated from src/scene/galaxy/galaxySystem.ts.',
    `const vec3 AGENT = ${vec(NODE_PALETTE.NODE_AGENT)}; // ${NODE_PALETTE.NODE_AGENT}`,
    `const vec3 WARM = ${vec(STAR_TINT.warm)}; // ${STAR_TINT.warm}`,
  ].join('\n');
}

/** star.vert.glsl with its libraries and its tint spliced in. */
export const STAR_VERTEX = withGalaxyLibrary(splice(starVert, STAR_TINT_MARKER, glslStarTint(), 'star vertex shader'));

/** The star frag's profiles. */
const PROFILE = { dot: 0, star: 1, haze: 2 } as const;

const QUAD = [-1, -1, 1, -1, 1, 1, -1, 1];
const QUAD_INDEX = [0, 1, 2, 0, 2, 3];

/**
 * Each set's size: its world size, and its floor and cap on screen (CSS px); its profile; how far a
 * warm point mixes toward the warm tint (the haze takes it whole, as the tuner draws it); and whether
 * it is a far set (the neighbourhood's far form: star.vert.glsl's uHoodFar).
 */
const SETS = [
  { name: 'galaxy-haze', world: 0, px: [HAZE.hazePx, HAZE.hazePx], profile: PROFILE.haze, warmMix: 1, far: 0 },
  { name: 'galaxy-dust', world: 0, px: [PX.mote[0], PX.mote[0]], profile: PROFILE.dot, warmMix: STAR_TINT.warmMix, far: 0 },
  { name: 'galaxy-stars', ...BG_STAR_SIZE.star, profile: PROFILE.star, warmMix: STAR_TINT.warmMix, far: 0 },
  { name: 'galaxy-bright', ...BG_STAR_SIZE.bright, profile: PROFILE.star, warmMix: STAR_TINT.warmMix, far: 0 },
  { name: 'galaxy-far-stars', ...BG_STAR_SIZE.star, profile: PROFILE.star, warmMix: STAR_TINT.warmMix, far: 1 },
  { name: 'galaxy-far-bright', ...BG_STAR_SIZE.bright, profile: PROFILE.star, warmMix: STAR_TINT.warmMix, far: 1 },
] as const;

/**
 * The background galaxy, from the generated `bg` in the galaxy's own frame, with the background star
 * nearest each of the neighbourhood's `spots` pulled onto it as its far form (pullToHood). `origin`
 * gives N0's place in that frame at an ambient (the world's origin, bodyGalactic of N0); without it the
 * galaxy's centre is the origin.
 */
export function createGalaxySystem(
  bg: Background,
  spots: readonly (readonly [number, number, number])[],
  origin: (ambient: number) => Vec3 = () => [0, 0, 0],
): GalaxySystem {
  const viewportPx: IUniform<Vector2> = { value: new Vector2(1, 1) };
  const pixelRatio: IUniform<number> = { value: 1 };
  const show: IUniform<number> = { value: 0 };
  // The haze's gain: net.show × net.haze.
  const hazeGain: IUniform<number> = { value: 0 };
  const freezeDress: IUniform<number> = { value: 0 };
  // The beats' hold on the neighbourhood's real form, which the far sets give way to (lod.ts hoodHold).
  const hoodHoldU: IUniform<number> = { value: 0 };
  const pull = pullToHood(bg, spots);
  const arrays: Record<(typeof SETS)[number]['name'], Float32Array> = {
    'galaxy-haze': new Float32Array([0, 0, 0, HAZE.hazeWarm === 1 ? -HAZE.hazeGain : HAZE.hazeGain]),
    'galaxy-dust': bg.dust,
    'galaxy-stars': pull.stars,
    'galaxy-bright': pull.bright,
    'galaxy-far-stars': pull.farStars,
    'galaxy-far-bright': pull.farBright,
  };
  const group = new Group();
  group.name = 'galaxy';
  group.matrixAutoUpdate = false;
  const parts = SETS.map((set) => {
    const data = arrays[set.name];
    const g = new InstancedBufferGeometry();
    g.setAttribute('aCorner', new BufferAttribute(new Float32Array(QUAD), 2));
    g.setIndex(QUAD_INDEX);
    g.setAttribute('aStar', new InstancedBufferAttribute(data, 4));
    g.instanceCount = data.length / 4;
    const material = new RawShaderMaterial({
      glslVersion: GLSL3,
      vertexShader: STAR_VERTEX,
      fragmentShader: starFrag,
      uniforms: {
        uSizeWorld: { value: set.world },
        uMinPx: { value: set.px[0] },
        uMaxPx: { value: set.px[1] },
        uGain: set.name === 'galaxy-haze' ? hazeGain : show,
        uFreezeDress: freezeDress,
        uProfile: { value: set.profile },
        uWarmMix: { value: set.warmMix },
        uHoodFar: { value: set.far },
        uHoodHold: hoodHoldU,
        uViewport: viewportPx,
        uPixelRatio: pixelRatio,
      },
      blending: CustomBlending,
      blendEquation: AddEquation,
      blendSrc: OneFactor,
      blendDst: OneMinusSrcColorFactor,
      depthWrite: false,
      transparent: true,
    });
    const mesh = new Mesh(g, material);
    mesh.name = set.name;
    mesh.frustumCulled = false; // positions are computed in the vertex shader
    group.add(mesh);
    return { mesh, g, material };
  });
  group.visible = false;
  const haze = parts[0].mesh;

  const turn = new Matrix4();
  const shift = new Matrix4();
  const eye = new Vector3();
  const at = new Vector3();
  let lastFar: number[] = spots.map(() => 1);

  return {
    object: group,
    counts: { stars: bg.stars.length / 4, bright: bg.bright.length / 4, dust: bg.dust.length / 4, haze: 1 },

    update(state, camera, viewport, ambient) {
      show.value = state.net.show;
      // The haze is a look gate, not a distance one: up only at the galaxy wides (netShots.ts HAZE_KEYS).
      hazeGain.value = state.net.show * state.net.haze;
      haze.visible = state.net.haze > 0;
      // The freeze frame dims and greys everything but the held piece, the background with it (times
      // net.focus, as the bodies' dressing: it cannot show off a focused frame).
      freezeDress.value = state.freeze.dress * state.net.focus;
      hoodHoldU.value = hoodHold(state.net.hoodHold);
      group.visible = state.net.show > 0;
      if (!group.visible) return;
      viewportPx.value.set(Math.max(1, viewport.width), Math.max(1, viewport.height));
      pixelRatio.value = Number.isFinite(viewport.pixelRatio) && viewport.pixelRatio > 0 ? viewport.pixelRatio : 1;
      const n0 = origin(ambient);
      group.matrix.copy(turn.makeRotationY(galaxyTurn(ambient))).multiply(shift.makeTranslation(-n0[0], -n0[1], -n0[2]));
      group.updateMatrixWorld(true);
      // Each far star's share, at its own place (its spot in the disc) as the shader takes it.
      camera.updateMatrixWorld();
      camera.getWorldPosition(eye);
      const focal = 0.5 * (viewport.height / pixelRatio.value) * camera.projectionMatrix.elements[5];
      lastFar = spots.map((s) => hoodFar(at.set(s[0], 0, s[2]).applyMatrix4(group.matrixWorld).distanceTo(eye), focal, hoodHoldU.value));
    },

    farShares: () => [...lastFar],

    dispose() {
      for (const p of parts) {
        p.g.dispose();
        p.material.dispose();
      }
    },
  };
}
