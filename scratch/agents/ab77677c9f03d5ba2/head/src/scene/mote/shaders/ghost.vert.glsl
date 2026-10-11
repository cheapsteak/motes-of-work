precision highp float;
precision highp int;

// #include mote.glsl + instance.glsl (spliced in by shaderSource.ts)
// The ghost material feeds mote() the intended machine: zero-fault part texture, assembly 1,
// variant 0, drift 0, specced.

in vec2 aCorner; // quad corner in [-1, 1]^2

uniform float uGhost; // ghost opacity

out float vAlpha;

const float GHOST_HALF_SIZE_PX = 1.0; // 2px dot

void main() {
  if (gl_InstanceID % 4 != 0) {
    gl_Position = MOTE_HIDDEN;
    return;
  }
  MoteOut o = mote(instanceAttrs(), 0);
  if (o.visible < 0.5) {
    gl_Position = MOTE_HIDDEN;
    return;
  }
  vec4 clip = projectionMatrix * toView(o.pos);
  clip.xy += aCorner * (2.0 * GHOST_HALF_SIZE_PX / uViewport) * clip.w;
  gl_Position = clip;
  vAlpha = 0.35 * uGhost;
}
