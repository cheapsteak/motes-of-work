precision highp float;
precision highp int;

// #include mote.glsl + instance.glsl (spliced in by shaderSource.ts)

in vec2 aCorner; // quad corner in [-1, 1]^2
in float aQuad; // 0 the mote, 1 its dialogue twin

uniform float uStage; // stage.motes: the cloud's brightness (0.1 is dust behind the drawing's page)

out vec2 vUv;
flat out float vType; // MoteType: picks the colour
flat out float vForm; // FORM_*: picks the shape
out float vBrightness;
flat out float vRadiusPx;

// Per form (halo, point, twin): diameter in world units, and its cap in CSS pixels.
const float SIZE_WORLD[3] = float[3](0.12, 0.025, 0.05);
const float CAP_PX[3] = float[3](56.0, 3.5, 12.0);

void main() {
  MoteAttrs a = instanceAttrs();
  MoteOut o = mote(a, 0);
  int type = clamp(int(round(o.type)), 0, 2);
  int form = moteForm(type, a.seed);
  bool twin = form == FORM_TWIN;
  if (o.visible < 0.5 || (aQuad > 0.5 && !twin)) {
    gl_Position = MOTE_HIDDEN;
    return;
  }

  vec4 view = toView(o.pos + shimmer(o, a.seed));
  if (twin) view.xyz += (aQuad < 0.5 ? 1.0 : -1.0) * twinOffset(a.seed);
  vec2 light = moteLight(o, view);
  float px = clamp(SIZE_WORLD[form] * pxPerUnit(view) * light.y, 1.0, CAP_PX[form] * uPixelRatio);

  vec4 clip = projectionMatrix * view;
  clip.xy += aCorner * (px / uViewport) * clip.w; // half-size px/2, in NDC px/viewport
  gl_Position = clip;
  vUv = aCorner;
  vType = float(type);
  vForm = float(form);
  vBrightness = o.brightness * light.x * uStage;
  vRadiusPx = 0.5 * px;
}
