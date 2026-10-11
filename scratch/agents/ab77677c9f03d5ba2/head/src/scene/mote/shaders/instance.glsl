// Per-instance mote inputs and helpers shared by the mote, thread and ghost vertex shaders.
// Appended after mote.glsl (it uses MoteAttrs, MoteOut, hash01, the SALT_ constants, MOTE_TAU and
// uDrive from there). The per-instance attributes and instanceAttrs() are generated from layout.ts,
// the lighting uniforms from src/scene/lighting.ts.

// #include attribute declarations (generated from src/scene/mote/layout.ts by shaderSource.ts)

uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform vec2 uViewport; // drawing-buffer pixels
uniform float uShimmerOn; // 0 or 1
uniform float uShimmerTime; // seconds, wrapped to [0, 1000) on the CPU
uniform float uForceHero; // 1: every Human / Dialogue mote takes its hero form (spike pages only)

// #include lighting uniforms (generated from src/scene/lighting.ts by shaderSource.ts)

// Clip-space point outside the view volume: every vertex of a hidden quad goes here.
const vec4 MOTE_HIDDEN = vec4(2.0, 2.0, 2.0, 1.0);

// #include instanceAttrs() (generated from src/scene/mote/layout.ts by shaderSource.ts)

// Render forms. Spec §5.1 counts: only a hash-selected hero fraction of Human and Dialogue motes
// takes the large form; the rest are small sharp points in their own type colour.
const int FORM_HALO = 0; // hero Human: large soft halo plus bright core
const int FORM_POINT = 1; // Agent, and non-hero Human / Dialogue: small hard disc
const int FORM_TWIN = 2; // hero Dialogue: twin soft discs orbiting, joined by a thread
const float HERO_HUMAN = 0.01;
const float HERO_DIALOGUE = 0.03;

int moteForm(int type, float seed) {
  float h = hash01(uint(round(seed)), SALT_HERO);
  bool forced = uForceHero > 0.5;
  if (type == 0 && (forced || h < HERO_HUMAN)) return FORM_HALO;
  if (type == 2 && (forced || h < HERO_DIALOGUE)) return FORM_TWIN;
  return FORM_POINT;
}

// Idle shimmer, after mote(): settled motes only.
vec3 shimmer(MoteOut o, float seed) {
  float s = 0.01 * sin(uShimmerTime * 1.3 + MOTE_TAU * hash01(uint(round(seed)), SALT_SHIMMER));
  return uShimmerOn * o.settled * vec3(s);
}

// Dialogue twins orbit the mote in the view plane: twin 0 at +offset, twin 1 at -offset.
vec3 twinOffset(float seed) {
  float phase = uDrive * 6.0 + MOTE_TAU * hash01(uint(round(seed)), SALT_TWIN_PHASE);
  return 0.06 * vec3(cos(phase), sin(phase), 0.0);
}

vec4 toView(vec3 p) {
  return viewMatrix * modelMatrix * vec4(p, 1.0);
}

// Shading of a mote at view-space point `view` (values in src/scene/lighting.ts). Returns
// (brightness factor, size factor). Settled motes are lit: fill + Lambert key + silhouette rim,
// dimmed where the surface faces away from the camera and toward the machine's far side, which
// also shrinks them a little. In-flight motes glow unlit: the factors blend from (1, 1) by settled.
vec2 moteLight(MoteOut o, vec4 view) {
  mat3 toViewDir = mat3(viewMatrix * modelMatrix);
  vec3 n = normalize(toViewDir * o.normal);
  vec3 l = normalize(mat3(viewMatrix) * uKeyDir);
  vec3 v = normalize(-view.xyz);
  float ndv = dot(n, v);
  float rim = 1.0 - abs(ndv);
  float lit = uFillStrength + uKeyStrength * max(dot(n, l), 0.0) + uRimStrength * rim * rim;
  // Faces away from the camera: a soft step through n.V = 0, so edge-on walls do not band.
  lit *= mix(uBackfaceDim, 1.0, smoothstep(-uBackfaceSoftness, uBackfaceSoftness, ndv));
  float depth = clamp((-view.z - uDepthNear) / (uDepthFar - uDepthNear), 0.0, 1.0);
  lit *= mix(1.0, uDepthDim, depth);
  float size = 1.0 - uDepthShrink * depth;
  return mix(vec2(1.0), vec2(lit, size), o.settled);
}

// Pixels per world unit at a view-space point.
float pxPerUnit(vec4 view) {
  return 0.5 * uViewport.y * projectionMatrix[1][1] / max(-view.z, 1e-4);
}
