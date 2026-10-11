// Shader sources of the parity page, kept free of WebGL so unit tests can check them (layout.test.ts:
// the attribute budget, and that mote.glsl is only ever in a vertex shader). Both checks are points
// draws: each instance lands on its own texel of a SIZE×SIZE float target via gl_InstanceID, and
// its result reaches the fragment shader as a flat varying, written out unchanged.
import { moteLibraryGlsl, VERTEX_INCLUDE_MARKER } from '../scene/mote/shaderSource';
import { glslPassOutput, parityPasses } from './fields';

/** Width and height of the readback target: one texel per instance. */
export const PARITY_SIZE = 16;

const PASSES = parityPasses();

// `if (uPass == 0) vOut = vec4(o.pos, o.settled); else if (uPass == 1) ...`: one branch per pass.
const PASS_SELECT = PASSES.map(
  (pass, i) => `${i === 0 ? '' : 'else '}if (uPass == ${i}) vOut = ${glslPassOutput(pass, 'o')};`,
).join('\n  ');

/** Puts instance gl_InstanceID on its own texel, as a 1px point. */
const PLACE_ON_TEXEL = /* glsl */ `
  vec2 cell = vec2(float(gl_InstanceID % ${PARITY_SIZE}), float(gl_InstanceID / ${PARITY_SIZE}));
  gl_Position = vec4((cell + 0.5) / ${PARITY_SIZE}.0 * 2.0 - 1.0 + position.xy, 0.0, 1.0);
  gl_PointSize = 1.0;`;

/**
 * The production attribute path: instanceAttrs() unpacks the instanced attributes and mote() runs as
 * in the mote/thread/ghost vertex shaders. Carries the include marker: build with withMoteLibrary().
 */
export const MOTE_VERTEX = /* glsl */ `
precision highp float;
precision highp int;

${VERTEX_INCLUDE_MARKER}

in vec3 position; // the single non-instanced vertex, at the origin
uniform int uCopy;
uniform int uPass;
flat out vec4 vOut;

void main() {
  MoteOut o = mote(instanceAttrs(), uCopy);
  ${PASS_SELECT}
  else vOut = vec4(0.0);
${PLACE_ON_TEXEL}
}
`;

/**
 * Hash check, per instance. Input aHashIn: (seed, salt, pcg input, 0). Output: (hash01(seed, salt),
 * pcg hi16, pcg lo16, 0). Complete as it stands (the mote library is included directly).
 */
export const HASH_VERTEX = /* glsl */ `
precision highp float;
precision highp int;
precision highp sampler2D;

${moteLibraryGlsl()}

in vec3 position; // the single non-instanced vertex, at the origin
in vec4 aHashIn;
flat out vec4 vOut;

void main() {
  uint p = pcg(uint(round(aHashIn.z)));
  vOut = vec4(hash01(uint(round(aHashIn.x)), uint(round(aHashIn.y))), float(p >> 16u), float(p & 0xffffu), 0.0);
${PLACE_ON_TEXEL}
}
`;

/** Both checks: write the vertex stage's result unchanged. */
export const PARITY_FRAGMENT = /* glsl */ `
precision highp float;
flat in vec4 vOut;
out vec4 outColor;
void main() {
  outColor = vOut;
}
`;
