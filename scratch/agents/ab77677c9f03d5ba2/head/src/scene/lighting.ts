// Lighting and depth cues for settled motes: the single home of every lighting constant. The values
// reach the shaders as uniforms only (lightingUniforms), and the GLSL declarations are generated
// from the same table (glslLightingUniforms, spliced into instance.glsl), so nothing is duplicated.
// The shading itself is moteLight() in shaders/instance.glsl.
import type { IUniform } from 'three';
import type { RoleAnchor } from '../mechanisms/anchors';
import type { Vec3 } from '../math/vec';

const KEY: Vec3 = [-0.4, 0.7, 0.6];
const KEY_LEN = Math.hypot(...KEY);

export const LIGHTING = {
  /** Unit direction toward the key light, world space: upper left, in front of the machine. */
  keyDir: [KEY[0] / KEY_LEN, KEY[1] / KEY_LEN, KEY[2] / KEY_LEN] as Vec3,
  /** Lambert key: brightness gains keyStrength * max(0, n.L). */
  keyStrength: 1.2,
  /** Ambient floor every settled mote keeps. */
  fillStrength: 0.3,
  /** Silhouette rim: rimStrength * (1 - |n.V|)^2. */
  rimStrength: 0.35,
  /** Brightness multiplier for points whose surface faces away from the camera. */
  backfaceDim: 0.35,
  /** Half-width in n.V of the soft step into backfaceDim, so walls seen edge-on do not band. */
  backfaceSoftness: 0.2,
  /** Brightness multiplier at the far side of the machine (depthFar); 1 at depthNear. */
  depthDim: 0.55,
  /** Fraction the point size shrinks by at depthFar. */
  depthShrink: 0.15,
} as const;

type LightingKey = keyof typeof LIGHTING;

/** `keyDir` → `uKeyDir`. */
const uniformName = (key: string): string => `u${key[0].toUpperCase()}${key.slice(1)}`;
const DEPTH_NEAR = 'uDepthNear';
const DEPTH_FAR = 'uDepthFar';

/**
 * View-space depth range of the machine: from the camera to the near and far side of its anchor
 * sphere (distance -+ radius). Kept positive and non-empty when the camera is inside the sphere.
 */
export function depthRange(cameraPos: Vec3, anchor: RoleAnchor): { near: number; far: number } {
  const c = anchor.center;
  const d = Math.hypot(cameraPos[0] - c[0], cameraPos[1] - c[1], cameraPos[2] - c[2]);
  const near = Math.max(1e-3, d - anchor.radius);
  return { near, far: Math.max(near + 1e-3, d + anchor.radius) };
}

/** Fresh uniform objects: every LIGHTING constant, plus the depth range (set per frame). */
export function lightingUniforms(): Record<string, IUniform> {
  const out: Record<string, IUniform> = {};
  for (const key of Object.keys(LIGHTING) as LightingKey[]) {
    const v = LIGHTING[key];
    out[uniformName(key)] = { value: Array.isArray(v) ? [...v] : v };
  }
  out[DEPTH_NEAR] = { value: 1 };
  out[DEPTH_FAR] = { value: 2 };
  return out;
}

/** Set the per-frame depth range from the camera position and the machine's anchor sphere. */
export function updateDepthUniforms(uniforms: Record<string, IUniform>, cameraPos: Vec3, anchor: RoleAnchor): void {
  const { near, far } = depthRange(cameraPos, anchor);
  uniforms[DEPTH_NEAR].value = near;
  uniforms[DEPTH_FAR].value = far;
}

/** GLSL declarations of the lighting uniforms, generated from LIGHTING. */
export function glslLightingUniforms(): string {
  const lines = (Object.keys(LIGHTING) as LightingKey[]).map(
    (key) => `uniform ${Array.isArray(LIGHTING[key]) ? 'vec3' : 'float'} ${uniformName(key)};`,
  );
  return [
    '// Lighting uniforms, generated from LIGHTING in src/scene/lighting.ts.',
    ...lines,
    `uniform float ${DEPTH_NEAR}; // view-space depth of the machine's near side, per frame`,
    `uniform float ${DEPTH_FAR}; // ... and of its far side`,
  ].join('\n');
}
