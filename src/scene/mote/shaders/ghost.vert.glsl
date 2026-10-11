precision highp float;
precision highp int;

// #include mote.glsl + instance.glsl (spliced in by shaderSource.ts)
// The ghost material feeds mote() the intended machine: zero-fault part texture, assembly 1,
// drift 0, specced, and uVariant = mech.ghostVariant, so its points take the twin positions as the
// motes' do (0, the correct machine, unless the story draws the wrong one).

in vec2 aCorner; // quad corner in [-1, 1]^2

uniform float uGhost; // ghost opacity

out float vAlpha;

const float GHOST_HALF_SIZE_PX = 1.0; // 2 CSS px dot
// The stride is chosen together with the ghost's alpha (LIGHTING.ghostAlpha, which owns that value
// and its measurements); the pair was measured with the ghost drawn on top, at the story's ghost
// 0.6. A sparser stride with a lower alpha left no readable outline; every 4th instance at the
// shipped alpha gives a faint pencil outline and keeps quiet failure legible.
const int GHOST_STRIDE = 4; // every 4th instance

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
  vAlpha = uGhostAlpha * uGhost; // uGhostAlpha: LIGHTING.ghostAlpha (src/scene/lighting.ts)
}
