p='src/parity/fields.ts'
s=open(p).read()
old="""const GLSL_TYPE_OF_SIZE = ['', 'float', 'vec2', 'vec3', 'vec4'];"""
new="""/**
 * What the lod parity mode (`?lib=lod`) computes per sample: lod.glsl's lodGain() of an element at a
 * system's size, and glowPx() of a body's radius, distance, focal length and cap.
 */
export interface LodOut {
  gain: number;
  glow: number;
}

/** What the lod parity mode compares. The lod parity shader's LodOut struct is generated from this list (glslLodOutStruct). */
export const LOD_PARITY_FIELDS: readonly ParityField<LodOut>[] = [
  { name: 'gain', size: 1 },
  { name: 'glow', size: 1 },
];

const GLSL_TYPE_OF_SIZE = ['', 'float', 'vec2', 'vec3', 'vec4'];"""
assert old in s; s=s.replace(old,new)
s += """
/** The GLSL LodOut struct, from LOD_PARITY_FIELDS. */
export function glslLodOutStruct(): string {
  return glslOutStruct('LodOut', 'LOD_PARITY_FIELDS', LOD_PARITY_FIELDS);
}
"""
open(p,'w').write(s)

p='src/parity/shaders.ts'
s=open(p).read()
old="""import { BOX_INCLUDE_MARKER, DERP_INCLUDE_MARKER, NODE_INCLUDE_MARKER, ORBIT_INCLUDE_MARKER, SHELL_INCLUDE_MARKER } from '../scene/node/shaderSource';"""
new="""import { BOX_INCLUDE_MARKER, DERP_INCLUDE_MARKER, LOD_INCLUDE_MARKER, NODE_INCLUDE_MARKER, ORBIT_INCLUDE_MARKER, SHELL_INCLUDE_MARKER } from '../scene/node/shaderSource';"""
assert old in s; s=s.replace(old,new)
s=s.replace("""  glslOrbitOutStruct,""","""  glslLodOutStruct,
  glslOrbitOutStruct,""",1)
s=s.replace("""  ORBIT_PARITY_FIELDS,""","""  LOD_PARITY_FIELDS,
  ORBIT_PARITY_FIELDS,""",1)
s += """
/**
 * The level of detail (`?lib=lod`): lodGain() of an element at a system's size and glowPx() of a
 * body's radius, distance, focal length and cap, per instance, as the galaxy's vertex shaders call
 * them. Carries the lod include marker: build with withLodLibrary().
 */
export const LOD_VERTEX = /* glsl */ `
precision highp float;
precision highp int;

${LOD_INCLUDE_MARKER}

${glslLodOutStruct()}

in vec3 position; // the single non-instanced vertex, at the origin
in vec2 aGainIn; // LodElement, the system's size (CSS px)
in vec4 aGlowIn; // R, d, focal (CSS px), cap
uniform int uPass;
flat out vec4 vOut;

void main() {
  LodOut o;
  o.gain = lodGain(int(round(aGainIn.x)), aGainIn.y);
  o.glow = glowPx(aGlowIn.x, aGlowIn.y, aGlowIn.z, aGlowIn.w);
  ${passSelect(parityPasses(LOD_PARITY_FIELDS))}
  else vOut = vec4(0.0);
${PLACE_ON_TEXEL}
}
`;
"""
open(p,'w').write(s)
