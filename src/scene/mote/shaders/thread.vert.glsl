precision highp float;
precision highp int;

// #include mote.glsl + instance.glsl (spliced in by shaderSource.ts)

in vec2 aCorner; // x: 0 at twin 0, 1 at twin 1; y: side, -1 or +1

uniform float uStage; // stage.motes, as the motes take it

out float vBrightness;

const float THREAD_HALF_WIDTH_PX = 0.75; // CSS px

void main() {
  MoteAttrs a = instanceAttrs();
  MoteOut o = mote(a, 0);
  if (o.visible < 0.5 || moteForm(int(round(o.type)), a.seed) != FORM_TWIN) {
    gl_Position = MOTE_HIDDEN;
    return;
  }

  vec4 view = toView(o.pos + shimmer(o, a.seed));
  vec3 off = twinOffset(a.seed);
  vec4 c0 = projectionMatrix * vec4(view.xyz + off, 1.0);
  vec4 c1 = projectionMatrix * vec4(view.xyz - off, 1.0);

  // Widen across the screen-space direction between the twins.
  vec2 d = (c1.xy / c1.w - c0.xy / c0.w) * uViewport;
  vec2 dir = length(d) > 1e-6 ? normalize(d) : vec2(1.0, 0.0);
  vec2 normal = vec2(-dir.y, dir.x);

  vec4 clip = aCorner.x < 0.5 ? c0 : c1;
  clip.xy += normal * aCorner.y * (2.0 * THREAD_HALF_WIDTH_PX * uPixelRatio / uViewport) * clip.w;
  gl_Position = clip;
  vBrightness = o.brightness * moteLight(o, view).x * uStage;
}
