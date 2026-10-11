precision highp float;
precision highp int;

// Old paper, procedurally (docs/specs/2026-10-05-blueprint-and-build.md §2.6): a warm cream with
// three octaves of grain, fibres along its long side, a few darker flecks, a slight vignette and a
// darker cut edge with a 1 px border. Every value is a function of the sheet's own uv, so the page
// is the same in every frame. Premultiplied (blended One, OneMinusSrcAlpha).

in vec2 vUv;

uniform float uOpacity;
uniform vec2 uAspect; // the sheet's width and height over its width: noise cells stay square

out vec4 outColor;

const vec3 BASE = vec3(0.906, 0.851, 0.725); // #E7D9B9
const vec3 EDGE = vec3(0.788, 0.722, 0.565); // #C9B890
const vec3 BORDER = vec3(0.725, 0.655, 0.498); // #B9A77F

float hash(ivec2 c) {
  uvec2 v = uvec2(c + ivec2(4096));
  uint h = v.x * 747796405u + v.y * 2891336453u;
  h = ((h >> ((h >> 28u) + 4u)) ^ h) * 277803737u;
  h = (h >> 22u) ^ h;
  return float(h >> 8u) / 16777216.0;
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 s = f * f * (3.0 - 2.0 * f);
  ivec2 c = ivec2(i);
  float a = hash(c);
  float b = hash(c + ivec2(1, 0));
  float d = hash(c + ivec2(0, 1));
  float e = hash(c + ivec2(1, 1));
  return mix(mix(a, b, s.x), mix(d, e, s.x), s.y);
}

float fbm3(vec2 p) {
  return (valueNoise(p) + 0.5 * valueNoise(2.0 * p + 17.0) + 0.25 * valueNoise(4.0 * p + 31.0)) / 1.75;
}

void main() {
  vec2 q = vUv * uAspect;
  vec3 c = BASE;
  c *= 1.0 + 0.05 * (fbm3(q * 180.0) - 0.5);
  c *= 1.0 + 0.025 * (valueNoise(q * vec2(12.0, 80.0)) - 0.5);
  if (hash(ivec2(floor(q * 700.0))) < 0.004) c *= 0.9;
  float r = length(vUv - 0.5) / 0.7071;
  c *= 1.0 - 0.16 * smoothstep(0.55, 1.0, r);
  float e = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
  c = mix(EDGE, c, smoothstep(0.0, 0.015, e));
  vec2 px = fwidth(vUv);
  float edgePx = min(min(vUv.x, 1.0 - vUv.x) / px.x, min(vUv.y, 1.0 - vUv.y) / px.y);
  c = mix(BORDER, c, smoothstep(0.5, 1.5, edgePx));
  outColor = vec4(c * uOpacity, uOpacity);
}
