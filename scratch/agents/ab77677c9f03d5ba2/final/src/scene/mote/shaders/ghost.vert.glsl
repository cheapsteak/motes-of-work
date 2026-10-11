precision highp float;
precision highp int;

// #include mote.glsl + instance.glsl (spliced in by shaderSource.ts)
// The ghost material feeds mote() the intended machine: zero-fault part texture, assembly 1,
// variant 0, drift 0, specced.

in vec2 aCorner; // quad corner in [-1, 1]^2

uniform float uGhost; // ghost opacity

out float vAlpha;

const float GHOST_HALF_SIZE_PX = 1.0; // 2 CSS px dot
// Task 9 visual review asked for alpha 0.18 at stride 6; measured on the steam spec close-up at the
// story's ghost 0.6, that left ~15% of the old ghost's light and no readable outline. 0.4 at
// stride 4 gives ~50% there, and the comparison presets (0.4 / 0.6) still keep quiet failure legible.
const int GHOST_STRIDE = 4; // every 4th instance
const float GHOST_ALPHA = 0.4; // at uGhost = 1

void main() {
  if (gl_InstanceID % GHOST_STRIDE != 0) {
    gl_Position = MOTE_HIDDEN;
    return;
  }
  MoteOut o = mote(instanceAttrs(), 0);
  if (o.visible < 0.5) {
    gl_Position = MOTE_HIDDEN;
    return;
  }
  vec4 clip = projectionMatrix * toView(o.pos);
  clip.xy += aCorner * (2.0 * GHOST_HALF_SIZE_PX * uPixelRatio / uViewport) * clip.w;
  gl_Position = clip;
  vAlpha = GHOST_ALPHA * uGhost;
}
